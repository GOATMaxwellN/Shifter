from flask import Blueprint, render_template

bp = Blueprint("home", "shifter")


@bp.route("/")
def home():
    return render_template("home/index.html")