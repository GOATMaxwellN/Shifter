from flask import current_app, session, jsonify
import json
from urllib.parse import quote
from .auth import get_logged_in_user_id
import requests
from .db import get_db
import os


class GoogleAuth:
    CLIENT_ID = "317001935803-kus33tcuh27qmr6b65vemimvl32f6p9r.apps.googleusercontent.com"
    AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
    TOKEN_URI = "https://oauth2.googleapis.com/token"
    SCOPE = "https://www.googleapis.com/auth/calendar%20https://www.googleapis.com/auth/userinfo.profile"

    if current_app.env == "production":
        REDIRECT_URI = "https://shifter-maxwelln.herokuapp.com/oauth/google-callback"
        CLIENT_SECRET = os.getenv("GOOGLE_SECRET")
    else:
        REDIRECT_URI = "http://127.0.0.1:5000/oauth/google-callback"
        CLIENT_SECRET = current_app.config["GOOGLE_SECRET"]

    @classmethod
    def get_auth_url(cls):
        url = (
            cls.AUTH_URI +
            "?client_id={}&redirect_uri={}&scope={}"
            "&response_type=code&access_type=offline&prompt=select_account+consent"
        ).format(
            cls.CLIENT_ID, cls.REDIRECT_URI, cls.SCOPE
        )
        return url

    @classmethod
    def fetch_tokens(cls, code):
        payload = {
            "client_id": cls.CLIENT_ID,
            "client_secret": cls.CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": cls.REDIRECT_URI
        }

        # Have to make this payload string to stop requests from encoding
        # the redirect_uri further than it already is. Causes a 'Bad Request'
        # if I don't do this.
        payload_str = "&".join("{}={}".format(k, v) for k, v in payload.items())
        r = requests.post(
            cls.TOKEN_URI, params=payload_str,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        return r.json()

    @staticmethod
    def get_account_id(access_token):
        r = requests.get(
            "https://people.googleapis.com/v1/people/me", params="personFields=metadata",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Bearer {access_token}"
            }

        )
        account_id = r.json()["resourceName"].split('/')[1]
        return account_id

    @staticmethod
    def get_access_token():
        cur_cal_name = session["current_calendar"]["name"]

        user = get_db().users.find_one({"_id": get_logged_in_user_id()})
        for cal in user["connected_calendars"]["Google"]:
            if cal["name"] == cur_cal_name:
                return cal["access_token"]

    @staticmethod
    def get_refresh_token():
        cur_cal_name = session["current_calendar"]["name"]

        user = get_db().users.find_one({"_id": get_logged_in_user_id()})
        for cal in user["connected_calendars"]["Google"]:
            if cal["name"] == cur_cal_name:
                return cal["refresh_token"]

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
        cur_cal_name = session["current_calendar"]["name"]
        get_db().users.update_one(
            {
                "_id": get_logged_in_user_id(),
                "connected_calendars.Google.name": cur_cal_name
            },
            {
                "$set": {
                    f"connected_calendars.Google.$.access_token": access_token
                }
            }
        )
        return access_token

    @staticmethod 
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
    def list_calendars():
        def make_request():
            endpoint = "https://www.googleapis.com/calendar/v3/users/me/calendarList"
            params = [("fields", "items(id, summary, primary)"), ("minAccessRole", "writer")]
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
            r_cals[cal["summary"]] = cal["id"]
            if cal.get("primary", False):
                r_cals["primary"] = cal["summary"]
        return r_cals

    @staticmethod
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

        user = get_db().users.find_one({"_id": get_logged_in_user_id()})
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
        while request.status_code != 200:
            print("Had to handle this error:", request.json())
            # Invalid credentials
            if request.status_code == 401:
                GoogleAuth.get_new_access_token()
            # Rate limit exceeded
            elif request.status_code == 403 or request.status_code == 429:
                pass
            # Backend error
            elif request.status_code == 500:
                pass

            request = make_request()
        
        return request
