from flask import (
    Blueprint, current_app, redirect, render_template, request,
    session, url_for, jsonify)
import json
from shifter.auth import get_logged_in_user_id
import requests
from shifter.db import get_db
from functools import wraps


bp = Blueprint("oauth", "shifter", url_prefix="/oauth")


class GoogleAuth:
    with current_app.open_instance_resource("google_auth.json", "r") as f:
        google_auth = json.load(f)["web"]
        CLIENT_ID = google_auth["client_id"]
        CLIENT_SECRET = google_auth["client_secret"]
        REDIRECT_URI = google_auth["redirect_uri"]
        SCOPE = google_auth["scope"]
        AUTH_URI = google_auth["auth_uri"]
        TOKEN_URI = google_auth["token_uri"]
        del google_auth

    @classmethod
    def get_auth_url(cls):
        url = (
            cls.AUTH_URI +
            "?client_id={}&redirect_uri={}&scope={}"
            "&response_type=code&access_type=offline&prompt=select_account"
        ).format(
            cls.CLIENT_ID, cls.REDIRECT_URI, cls.SCOPE
        )
        return url

    @classmethod
    def fetch_tokens(cls, code):
        params = [
            ("client_id", cls.CLIENT_ID),
            ("client_secret", cls.CLIENT_SECRET),
            ("code", code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", cls.REDIRECT_URI)
        ]
        r = requests.post(
            cls.TOKEN_URI, params=params,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return r.json()

    @staticmethod
    def get_refresh_token():
        db = get_db()
        user = db.users.find({"_id": get_logged_in_user_id()})[0]
        return user["refresh_tokens"]["Google"]

    @classmethod
    def get_new_access_token(cls):
        refresh_token = GoogleAuth.get_refresh_token()
        params = [
            ("client_id", cls.CLIENT_ID),
            ("client_secret", cls.CLIENT_SECRET),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token)
        ]
        r = requests.post(
            cls.TOKEN_URI, params=params, 
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if r.status_code != 200:  # TODO: handle this properly
            print("TOKEN REFRESH DIDN'T WORK", r.json())
            return

        # Update the access token in the session and return
        access_token = r.json()["access_token"]
        session["access_token"] = access_token
        return access_token

    @staticmethod
    def list_events(access_token, start, end, timezone):
        endpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        params=[("timeMin", start), ("timeMax", end), ("timeZone", timezone)]
        r = requests.get(
            endpoint, params=params,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if r.status_code == 401:  # Invalid credentials
            print("ACCESS TOKEN EXPIRED!")
            access_token = GoogleAuth.get_new_access_token()
            r = requests.get(
                endpoint, params=params,
                headers={"Authorization": f"Bearer {access_token}"}
            )

        return r.json()["items"]


@bp.route("/google-callback", methods=("GET", "POST"))
def google_callback():
    if "code" in request.args:
        # Get tokens with auth code and add access_token to session
        tokens = GoogleAuth.fetch_tokens(request.args["code"])
        session["access_token"] = tokens["access_token"]

        # User now has connected their google calendar
        # and add user's refresh token to the db
        db = get_db()
        db.users.update_one(
            {"_id": get_logged_in_user_id()},
            {"$set": 
                {
                    "connected_calendars.Google": True,
                    "refresh_tokens.Google": tokens["refresh_token"]
                }
            }
        )
    else:
        return "Denied consent"
    
    return redirect(url_for("calendarview.index"))


@bp.route("/connect-to-google", methods=["GET"])
def connect_to_google():

    return redirect(GoogleAuth.get_auth_url())


def access_token_required(f):
    wraps(f)
    def wrapper():
        if "access_token" not in session:
            GoogleAuth.get_new_access_token()
        return f()
    return wrapper


@bp.route("/google-list-events", methods=["GET"])
@access_token_required
def google_list_events():
    start, end = request.args["timeMin"], request.args["timeMax"]
    timezone = request.args["timeZone"]
    events = GoogleAuth.list_events(
        session["access_token"], start, end, timezone
    )

    resp = jsonify(events)
    resp.access_control_allow_origin = "*"
    return resp

# TODO implement outlook
