from flask import Blueprint, redirect, request, session, url_for
from .auth import get_logged_in_user_id
from .db import get_db
from .oauth_calendar_classes import GoogleAuth
import json


bp = Blueprint("oauth", "shifter", url_prefix="/oauth")


# === GOOGLE ENDPOINTS ===
@bp.route("/connect-to-google", methods=["GET"])
def connect_to_google():
    # Temporary session entry to store what the user wants to name 
    # the calendar they're about to connect
    session["calendar_name"] = request.args["calendar-name"]
    return redirect(GoogleAuth.get_auth_url())


@bp.route("/google-callback", methods=("GET", "POST"))
def google_callback():
    denied = None
    calendar_name = None
    if "code" in request.args:
        # Get tokens with auth code and add access_token and refresh
        # token to the database
        tokens = GoogleAuth.fetch_tokens(request.args["code"])
        account_id = GoogleAuth.get_account_id(tokens["access_token"])

        # Checks if user already has this calendar connected
        db = get_db()
        if db.users.find_one(
            {"_id": get_logged_in_user_id(), "connected_calendars.Google.id": account_id}):
            return redirect(
                url_for("calendarview.index", already_connected=True)
            )
        
        # Get what the user wanted to call the calendar
        calendar_name = session["calendar_name"]
        del session["calendar_name"]

        # User now has connected their google calendar
        # and add user's refresh token to the db
        db.users.update_one(
            {"_id": get_logged_in_user_id()},
            {
                "$push": {
                    "connected_calendars.Google": {
                        "id": account_id,
                        "name": calendar_name,
                        "access_token": tokens["access_token"],
                        "refresh_token": tokens["refresh_token"]
                    }
                }
            }
        )
    else:
        denied = True
        del session["calendar_name"]

    # Give calendar details (name and vendor)
    calendar = json.dumps({"name": calendar_name, "vendor": "Google"})

    return redirect(url_for(
        "calendarview.index", 
        calendar=calendar, 
        denied=denied))


# TODO implement outlook
