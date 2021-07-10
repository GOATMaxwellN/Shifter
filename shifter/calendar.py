from flask import (
    Blueprint, render_template, request, session, redirect, url_for)
from shifter.auth import get_logged_in_user_id, login_required
from shifter.db import get_db


bp = Blueprint("calendarview", "shifter", url_prefix="/calendarview")
INDEX_PAGE = "calendarview/index.html"

@bp.route("/index", methods=("GET",))
@login_required
def index():
    # Connect to user
    db = get_db()
    user = db.users.find({"_id": get_logged_in_user_id()})[0]

    username = user["username"]
    denied = None
    calendar = None

    # User was redirected here after attempting to connect a calendar.
    # 1. For one reason or the other, the attempt failed
    if "denied" in request.args:
        denied = True
    # 2. The attempt was successful
    elif "calendar" in request.args:
        calendar = request.args["calendar"]
        session["calendar_last_used"] = calendar

    # User has just logged in or navigated straight here.
    # 1. Check if session has their most recently opened calendar.
    elif "calendar_last_used" in session:
        calendar = session["calendar_last_used"]

    # 2. Go through user's db "connected_calendars" entry to see if
    # they've connected a calendar in the past
    else:
        for cal in user["connected_calendars"]:
            if user["connected_calendars"][cal]:
                calendar = cal
                session["calendar_last_used"] = calendar
                break

    return render_template(
        "calendarview/index.html",
        username=username,
        calendar=calendar,
        denied=denied
    )


@bp.route("/create-shift", methods=("GET", "POST"))
def create_shift():
    if request.method == "POST":
        name = request.form["name"]
        start_time = request.form["start-time"]
        end_time = request.form["end-time"]

        db = get_db()
        db.users.update_one(
            {"_id": get_logged_in_user_id()},
            {"$set": 
                {
                    f"shifts.{name}": 
                        {
                            "start_time": start_time,
                            "end_time": end_time
                        }
                }
            }
        )

        # Update the shifts held in session
        session["shifts"][name] = {
            "start_time": start_time,
            "end_time": end_time
        }
        session.modified = True

        return redirect(url_for("calendarview.index"))

    return render_template("calendarview/create_shift.html")
