from flask import Blueprint, render_template, request

bp = Blueprint("auth", "shifter")


@bp.route("/auth/login", methods=("GET", "POST"))
def login():
    if request.method == "POST":
        pass

    return render_template("/auth/login.html")