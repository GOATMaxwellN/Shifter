from flask import Blueprint, render_template, request

from db import get_db


bp = Blueprint("auth", "shifter", url_prefix="/auth")


@bp.route("/login", methods=("GET", "POST"))
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        # check if username already exists
        db = get_db()

    return render_template("auth/login.html")


@bp.route("/signup", methods=("GET", "POST"))
def signup():
    if request.method == "POST":
        pass

    return render_template("auth/signup.html")