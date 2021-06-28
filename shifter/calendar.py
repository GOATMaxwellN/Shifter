from flask import Blueprint, render_template

bp = Blueprint("calendarview", "shifter", url_prefix="/calendarview")


@bp.route("/index", methods=("GET", "POST"))
def index():

    return render_template("calendarview/index.html")