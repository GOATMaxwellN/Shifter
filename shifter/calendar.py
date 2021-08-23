from flask import (
    Blueprint, render_template, request, session)
from shifter.auth import get_logged_in_user_id, login_required
from shifter.db import get_db
import json


bp = Blueprint("calendarview", "shifter", url_prefix="/calendarview")


@bp.route("/index", methods=("GET",))
@login_required
def index():
    session["current_calendar"] = {}

    # Connect to user
    db = get_db()
    user = db.users.find({"_id": get_logged_in_user_id()})[0]

    params = {
        "username": user["username"],
        "denied": None,
        "calendar_vendor": None,
        "already_connected": None
    }

    # User was redirected here after attempting to connect a calendar.
    # 1. The attempt was successful
    if "calendar" in request.args:
        calendar_info = json.loads(request.args["calendar"])
        session["current_calendar"] = calendar_info
        session["calendar_last_used"] = calendar_info
        params["calendar_vendor"] = calendar_info["vendor"]
    # 2. For one reason or the other, the attempt failed
    elif "denied" in request.args:
        params["denied"] = True
    # 3. User attempted to connect a calenadar they already have connected
    elif "already_connected" in request.args:
        params["already_connected"] = True

    # User has just logged in or navigated straight here.
    # 1. Check if session has their most recently opened calendar.
    elif "calendar_last_used" in session:
        session["current_calendar"] = session["calendar_last_used"]
        params["calendar_vendor"] = session["current_calendar"]["vendor"]


    # If we still don't have a calendar to show, check account ofor any 
    # calendars they've connected in the past
    if not params["calendar_vendor"]:
        for cal in user["connected_calendars"]:
            if user["connected_calendars"][cal]:
                session["current_calendar"] = {
                    "name": user["connected_calendars"][cal][0]["name"],
                    "vendor": cal
                }
                session["calendar_last_used"] = session["current_calendar"]
                params["calendar_vendor"] = session["current_calendar"]["vendor"]
                break

    return render_template("calendarview/index.html", **params)