from flask import Blueprint, render_template
from shifter.auth import get_logged_in_user, login_required


bp = Blueprint("calendarview", "shifter", url_prefix="/calendarview")


@bp.route("/index", methods=("GET", "POST"))
@login_required
def index():
    user = get_logged_in_user()
    return render_template(
        "calendarview/index.html",
        username=user["username"]
    )