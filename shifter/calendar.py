from flask import Blueprint, render_template
from shifter.auth import get_logged_in_user_id, login_required
from shifter.db import get_db


bp = Blueprint("calendarview", "shifter", url_prefix="/calendarview")


@bp.route("/index", methods=("GET", "POST"))
@login_required
def index():
    db = get_db()
    user = db.users.find({"_id": get_logged_in_user_id()})[0]
    # Find a calendar that the user has connected.
    # If the user has connected no calendars, the page
    # will show links to connect to a calendar
    calendar = None
    for cal in user["connected_calendars"]:
        if user["connected_calendars"][cal]:
            calendar = cal
            break

    return render_template(
        "calendarview/index.html",
        username=user["username"],
        calendar=calendar,
    )