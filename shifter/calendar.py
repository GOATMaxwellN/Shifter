from flask import Blueprint, render_template
from shifter.auth import get_logged_in_user, login_required


bp = Blueprint("calendarview", "shifter", url_prefix="/calendarview")


@bp.route("/index", methods=("GET", "POST"))
@login_required
def index():
    user = get_logged_in_user()
    
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