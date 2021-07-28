from flask import Blueprint, request, jsonify, session
from .auth import get_logged_in_user_id
from .oauth import GoogleAuth
from .db import get_db


bp = Blueprint("api", "shifter", url_prefix="/api")


@bp.route("/google-list-events", methods=["GET"])
def google_list_events():
    start, end = request.args["timeMin"], request.args["timeMax"]
    timezone = request.args["timeZone"]
    calendar_id = request.args["calendarId"]
    events = GoogleAuth.list_events(
        start, end, timezone, calendar_id
    )
    return jsonify(events)


@bp.route("/google-list-calendars", methods=["GET"])
def google_list_calendars():
    cals = GoogleAuth.list_calendars()
    return jsonify(cals)


@bp.route("/get-shifts", methods=["GET"])
def get_shifts():
    if "shifts" in session:
        resp = jsonify(session["shifts"])
        resp.access_control_allow_origin = "*"
        return resp
    else:
        db = get_db()
        user = db.users.find({"_id": get_logged_in_user_id()})[0]
        # Add shifts to the session
        session["shifts"] = user["shifts"]

        resp = jsonify(user["shifts"])
        resp.access_control_allow_origin = "*"
        return resp


@bp.route("/create-shift", methods=("POST",))
def create_shift():
    shift_name = request.form["name"]
    start_time = request.form["start-time"]
    end_time = request.form["end-time"]

    db = get_db()
    db.users.update_one(
        {"_id": get_logged_in_user_id()},
        {"$set": 
            {
                f"shifts.{shift_name}": 
                    {
                        "start_time": start_time,
                        "end_time": end_time
                    }
            }
        }
    )

    # Update the shifts held in session
    session["shifts"][shift_name] = {
        "start_time": start_time,
        "end_time": end_time
    }
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
    del session["shifts"][shift_name]
    session.modified = True

    return "Success", 200
