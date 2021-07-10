from shifter.auth import get_logged_in_user_id
from flask import Blueprint, request, jsonify, session
from .oauth import GoogleAuth
from .db import get_db


bp = Blueprint("api", "shifter", url_prefix="/api")


@bp.route("/google-list-events", methods=["GET"])
def google_list_events():
    start, end = request.args["timeMin"], request.args["timeMax"]
    timezone = request.args["timeZone"]
    events = GoogleAuth.list_events(
        start, end, timezone
    )

    resp = jsonify(events)
    resp.access_control_allow_origin = "*"
    return resp


@bp.route("/get-shifts", methods=["GET"])
def get_shifts():
    if "shifts" in session:
        print(session)
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
