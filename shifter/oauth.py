from flask import (
    Blueprint, current_app, redirect, request,
    session, url_for)
import json
from urllib.parse import quote
from .auth import get_logged_in_user_id
import requests
from .db import get_db
from functools import wraps


bp = Blueprint("oauth", "shifter", url_prefix="/oauth")


def access_token_required(f):
    wraps(f)
    def wrapper(*args):
        if "access_token" not in session["credentials"]["google"]:
            GoogleAuth.get_new_access_token()
        return f(*args)
    return wrapper


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
        session["credentials"]["google"]["access_token"] = access_token
        return access_token

    @staticmethod
    @access_token_required
    def list_events(start, end, timezone, calendar_id):
        # Have to manually % encode calendar_id using quote()
        # since requests doesn't do it automatically
        endpoint = f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id)}/events"
        params=[("timeMin", start), ("timeMax", end), ("timeZone", timezone)]
        access_token = session['credentials']['google']['access_token']
        r = requests.get(
            endpoint, params=params,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if r.status_code == 401:  # Invalid credentials
            access_token = GoogleAuth.get_new_access_token()
            r = requests.get(
                endpoint, params=params,
                headers={"Authorization": f"Bearer {access_token}"}
            )

        return r.json()["items"]

    @staticmethod
    @access_token_required
    def list_calendars():
        endpoint = "https://www.googleapis.com/calendar/v3/users/me/calendarList"
        access_token = session['credentials']['google']['access_token']
        r = requests.get(
            endpoint, headers={"Authorization": f"Bearer {access_token}"}
        )

        if r.status_code == 401:
            access_token = GoogleAuth.get_new_access_token()
            r = requests.get(
                endpoint, headers={"Authorization": f"Bearer {access_token}"}
            )
        
        cals = r.json()["items"]
        # Only going to return relevant information. 
        # Name and id of each calendar
        r_cals = {}
        for cal in cals:
            r_cals[cal["summary"]] = cal["id"]
            if cal.get("primary", False):
                r_cals["primary"] = cal["summary"]
        return r_cals


@bp.route("/connect-to-google", methods=["GET"])
def connect_to_google():
    return redirect(GoogleAuth.get_auth_url())


@bp.route("/google-callback", methods=("GET", "POST"))
def google_callback():
    denied = None
    if "code" in request.args:
        # Get tokens with auth code and add access_token to session
        tokens = GoogleAuth.fetch_tokens(request.args["code"])
        session["credentials"]["google"]["access_token"] = tokens["access_token"]

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
        denied = True
    
    return redirect(url_for(
        "calendarview.index", calendar="Google", denied=denied))


# TODO implement outlook
