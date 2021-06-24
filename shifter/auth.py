from flask import Blueprint, render_template, request

bp = Blueprint("auth", "shifter")


@bp.route("/auth/login", methods=("GET", "POST"))
def login():
    if request.method == "POST":
        pass

    return render_template("auth/login.html")


@bp.route("/auth/signup", methods=("GET", "POST"))
def signup():
    if request.method == "POST":
        pass

    return render_template("auth/signup.html")