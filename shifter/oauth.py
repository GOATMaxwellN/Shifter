from flask import (
    Blueprint, current_app, redirect, render_template, request,
    session, url_for, jsonify)
import json
from shifter.auth import get_logged_in_user
import requests


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
        token_url = (
            cls.TOKEN_URI +
            "?client_id={}&client_secret={}&code={}"
            "grant_type=authorization_code&redirect_uri={}"
        ).format(
            cls.CLIENT_ID, cls.CLIENT_SECRET, 
            code, cls.REDIRECT_URI
        )

        r = requests.post(
            token_url,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return r.json()

    @staticmethod
    def get_new_access_token():
        pass

    @staticmethod
    def list_events(cls, access_token, start, end, timezone):
        endpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        params=[("timeMin", start), ("timeMax", end), ("timeZone", timezone)]
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


@bp.route("/google-callback", methods=("GET", "POST"))
def google_callback():
    if "code" in request.args:
        # Get tokens with auth code and add access_token to session
        tokens = GoogleAuth.fetch_tokens(request.args["code"])
        session["access_token"] = tokens["access_token"]
        # User now has connected their google calendar
        # and add user's refresh token to the db
        user = get_logged_in_user()
        user.connected_calendars["Google"] = True
        user.refresh_tokens["Google"] = tokens["refresh_token"]
    else:
        return "Denied consent"
    
    return redirect(url_for("calendarview/index.html"))


@bp.route("/connect-to-google", methods=["GET"])
def connect_to_google():

    return redirect(GoogleAuth.get_auth_url())


@bp.route("/google-list-events", methods=["GET"])
def google_list_events():
    start, end = request.args["start"], request.args["end"]
    timezone = request.args["timezone"]
    events = GoogleAuth.list_events(
        session["access_token"], start, end, timezone
    )

    resp = jsonify(events)
    resp.access_control_allow_origin = "*"
    return resp

# TODO implement outlook
