from flask import Blueprint, request, jsonify, session, redirect, url_for
from .auth import get_logged_in_user_id
from .oauth import GoogleAuth
from .db import get_db
import json


bp = Blueprint("api", "shifter", url_prefix="/api")


@bp.route("/get-shifts", methods=["GET"])
def get_shifts():
    if "shifts" in session:
        return jsonify(session["shifts"])
    else:
        db = get_db()
        user = db.users.find({"_id": get_logged_in_user_id()})[0]
        # Add shifts to the session
        session["shifts"] = list(user["shifts"].keys())

        return jsonify(session["shifts"])
        

@bp.route("/create-shift", methods=("POST",))
def create_shift():
    shift_name = request.form["name"]
    if "all-day" in request.form:
        shift_times = "all_day"
    else:
        shift_times = {
            "start_time": request.form["start-time"],
            "end_time": request.form["end-time"]
        }

    db = get_db()
    db.users.update_one(
        {"_id": get_logged_in_user_id()},
        {"$set": 
            {
                f"shifts.{shift_name}": shift_times
            }
        }
    )

    # Update the shifts held in session
    session["shifts"].append(shift_name)
    session.modified = True

    return {"shift_name": shift_name}, 200


@bp.route("/delete-shift", methods=("DELETE",))
def delete_shift():
    shift_name = request.args["shift_name"]

    # Deletes the shift from user db
    db = get_db()
    db.users.update_one(
        {"_id": get_logged_in_user_id()},
        {"$unset":
            {
                f"shifts.{shift_name}": ""
            }
        }
    )
    # Deletes the shift from sessions
    del session["shifts"][session["shifts"].index(shift_name)]
    session.modified = True

    return "Success", 200


@bp.route("/get-calendars", methods=("GET",))
def get_calendars():
    user = get_db().users.find({"_id": get_logged_in_user_id()})[0]
    cals = []
    for vendor in user["connected_calendars"]:
        for cal in user["connected_calendars"][vendor]:
            cals.append(f"{cal['name']}-{vendor}")

    return jsonify(cals)


@bp.route("/delete-calendar", methods=("POST",))
def delete_calendar():
    name, vendor = request.form["calendarInfo"].split('-')

    db = get_db()
    db.users.update_one(
        {"_id": get_logged_in_user_id()},
        {
            "$pull": {
                f"connected_calendars.{vendor}": {"name": name}
            }
        }
    )

    # If user deleted the calendar they're currently viewing, 
    # remove the calendar from the 'calendar_last_used' field
    # in the session and have them reload the calendarview page,
    # which will handle which calendar to show, if show one at all.
    if name == session["current_calendar"]["name"]:
        del session["calendar_last_used"]
        return {
            "action": "redirect",
            "url": url_for("calendarview.index")
        }, 200

    return {
        "action": "nothing"
    }, 200


@bp.route("change-calendar-account", methods=("POST",))
def change_calendar_account():
    cal_name, vendor = request.form["calendar"].split("-")
    calendar = json.dumps({"name": cal_name, "vendor": vendor})

    return {"url": url_for("calendarview.index", calendar=calendar)}, 200


# === Google endpoints ===
@bp.route("/google-list-events", methods=["GET"])
def google_list_events():
    start, end = request.args["timeMin"], request.args["timeMax"]
    timezone = request.args["timeZone"]
    calendar_id = request.args["calendarId"]
    resp = GoogleAuth.list_events(
        start, end, timezone, calendar_id
    )
    return resp


@bp.route("/google-list-calendars", methods=["GET"])
def google_list_calendars():
    cals = GoogleAuth.list_calendars()
    return jsonify(cals)


@bp.route("/google-add-shift", methods=["POST"])
def google_add_shift():
    date_shifts = request.form["dateShifts"]
    calendar_id = request.form["calendarId"]
    resp = GoogleAuth.add_events(date_shifts, calendar_id)
    return resp
