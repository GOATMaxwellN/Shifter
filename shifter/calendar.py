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

    username = user["username"]
    denied = None

    # User was redirected here after attempting to connect a calendar.
    # 1. For one reason or the other, the attempt failed
    if "denied" in request.args:
        denied = True
    # 2. The attempt was successful
    elif "calendar" in request.args:
        calendar_info = json.loads(request.args["calendar"])
        session["current_calendar"] = calendar_info
        session["calendar_last_used"] = calendar_info

    # User has just logged in or navigated straight here.
    # 1. Check if session has their most recently opened calendar.
    elif "calendar_last_used" in session:
        session["current_calendar"] = session["calendar_last_used"]

    # 2. Go through user's db "connected_calendars" entry to see if
    # they've connected a calendar in the past
    else:
        for cal in user["connected_calendars"]:
            if user["connected_calendars"][cal]:
                session["current_calendar"]["name"] = user["connected_calendars"][cal][0]
                session["current_calendar"]["vendor"] = cal
                session["calendar_last_used"] = session["current_calendar"]
                break

    return render_template(
        "calendarview/index.html",
        username=username,
        calendar_vendor=session["current_calendar"].get("vendor", None),
        denied=denied
    )