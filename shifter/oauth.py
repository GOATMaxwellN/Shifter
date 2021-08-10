from flask import (
    Blueprint, current_app, redirect, request,
    session, url_for, jsonify)
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
    def get_access_token():
        cur_cal_name = session["current_calendar"]["name"]

        user = get_db().users.find({"_id": get_logged_in_user_id()})[0]
        token = user["access_tokens"]["Google"][cur_cal_name]
        return token

    @staticmethod
    def get_refresh_token():
        cur_cal_name = session["current_calendar"]["name"]

        user = get_db().users.find({"_id": get_logged_in_user_id()})[0]
        return user["refresh_tokens"]["Google"][cur_cal_name]

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

        # Update the access token in the database and return
        access_token = r.json()["access_token"]
        current_calendar = session["current_calendar"]["name"]
        # session["credentials"]["google"]["access_token"] = access_token
        print("updating access_token entry with", access_token)
        get_db().users.update_one(
            {"_id": get_logged_in_user_id()},
            {
                "$set": {
                    f"access_tokens.Google.{current_calendar}": access_token
                }
            }
        )
        return access_token

    @staticmethod
    # @access_token_required
    def list_events(start, end, timezone, calendar_id):
        def make_request():
            # Have to manually % encode calendar_id
            endpoint = f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id)}/events"
            params=[
                ("timeMin", start), ("timeMax", end), ("timeZone", timezone),
                ("fields", "items(summary, start, end)")]
            access_token = GoogleAuth.get_access_token()
            r = requests.get(
                endpoint, params=params,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return r

        r = make_request()

        if r.status_code != 200:
            r = GoogleAuth.handle_api_errors(r, make_request)
            if r is None:
                return {"message": "Couldn't process request for some reason"}, 500

        return jsonify(r.json()["items"])

    @staticmethod
    # @access_token_required
    def list_calendars():
        def make_request():
            endpoint = "https://www.googleapis.com/calendar/v3/users/me/calendarList"
            params = [("fields", "items(accessRole, id, summary, primary)")]
            access_token = GoogleAuth.get_access_token()
            r = requests.get(
                endpoint, params=params,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return r

        r = make_request()
        
        if r.status_code != 200:
            r = GoogleAuth.handle_api_errors(r, make_request)
            if r is None:
                return {"message": "Couldn't process request for some reason"}, 500

        cals = r.json()["items"]
        # Maps name of the calendar to its id, which the client can
        # work with directly and not need to parse anything
        r_cals = {}
        for cal in cals:
            # If user does not have write access to calendar
            # do not include in response
            if cal["accessRole"] not in ("writer", "owner"):
                continue
            r_cals[cal["summary"]] = cal["id"]
            if cal.get("primary", False):
                r_cals["primary"] = cal["summary"]
        return r_cals

    @staticmethod
    # @access_token_required
    def add_events(date_shifts, calendar_id):

        def make_request(event_resource):
            endpoint = f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id)}/events"
            access_token = GoogleAuth.get_access_token()
            r = requests.post(
                    endpoint, headers={"Authorization": f"Bearer {access_token}"},
                    json=event_resource
                )
            return r

        def create_event_resource(date, shift, duration=None):
                # If duration is None, this will be an all day event
                if duration is None:
                    return {
                        "summary": shift,
                        "start": {
                            "date": date
                        },
                        "end": {
                            "date": date
                        }
                    }

                return {
                    "summary": shift,
                    "start": {
                        "dateTime": date + "T" + duration["start_time"]
                    },
                    "end": {
                        "dateTime": date + "T" + duration["end_time"]
                    }
                }

        user = get_db().users.find({"_id": get_logged_in_user_id()})[0]
        index = 0
        for ds in json.loads(date_shifts):
            date, shift = ds.split("_")

            if user["shifts"][shift] == "all_day":
                event_resource = create_event_resource(date, shift)
                r = make_request(event_resource)
            else:
                duration = user["shifts"][shift]
                event_resource = create_event_resource(date, shift, duration)
                r = make_request(event_resource)

            if r.status_code != 200:
                r = GoogleAuth.handle_api_errors(
                    r, lambda: make_request(event_resource)
                )
                # If even one event fails to be added, stop and
                # just tell user that this and every event after
                # this one couldn't be added 
                if r is None:
                    break

            index += 1
        else:
            return {"success": "complete"}, 200

        # An event couldn't be added
        if index == 0:
            return {"success": "fail"}, 500
        else:
            return {
                "success": "partial",
                "failedShifts": date_shifts[index:]
            }, 200

    @staticmethod
    def handle_api_errors(request, make_request):
        while (code := request.status_code) != 200:
            print("Had to handle this error:", request.json())
            # Invalid credentials
            if code == 401:
                print("401 error handling")
                GoogleAuth.get_new_access_token()
            # Rate limit exceeded
            elif code == 403 or code == 429:
                pass
            # Backend error
            elif code == 500:
                pass

            request = make_request()
        
        return request


@bp.route("/connect-to-google", methods=["GET"])
def connect_to_google():
    # Temporary session entry to store what the user wants to name 
    # the calendar they're about to connect
    session["calendar_name"] = request.args["calendarName"]
    return redirect(GoogleAuth.get_auth_url())


@bp.route("/google-callback", methods=("GET", "POST"))
def google_callback():
    denied = None
    calendar_name = None
    if "code" in request.args:
        # Get tokens with auth code and add access_token and refresh
        # token to the database
        tokens = GoogleAuth.fetch_tokens(request.args["code"])
        
        # Get what the user wanted to call the calendar
        calendar_name = session["calendar_name"]
        del session["calendar_name"]

        # User now has connected their google calendar
        # and add user's refresh token to the db
        db = get_db()
        db.users.update_one(
            {"_id": get_logged_in_user_id()},
            {
                "$push": {
                    "connected_calendars.Google": calendar_name
                },
                "set": {
                    f"access_tokens.Google.{calendar_name}": tokens["access_token"],
                    f"refresh_tokens.Google.{calendar_name}": tokens["refresh_token"]
                }
            }
        )
    else:
        denied = True
        del session["calendar_name"]

    # Give calendar details (name and vendor)
    calendar = json.loads({"name": calendar_name, "vendor": "Google"})

    return redirect(url_for(
        "calendarview.index", 
        calendar=calendar, 
        denied=denied))


# TODO implement outlook
