from bson.codec_options import _parse_codec_options
from flask import Blueprint, render_template, request
from hashlib import scrypt

from shifter.db import get_db


bp = Blueprint("auth", "shifter", url_prefix="/auth")


@bp.route("/login", methods=("GET", "POST"))
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"].encode(encoding="ascii")
        error = None

        db = get_db()
        user = None        
        for doc in db.users.find({"username": username}):
            user = doc

        if user is None:
            error = "Username doesn't exist"
        else:
            pass_hash = generate_password_hash(password, user["salt"])
            if pass_hash == user["password_hash"]:
                pass
            else:
                error = "Incorrect password"

    return render_template("auth/login.html", error=error)


@bp.route("/signup", methods=("GET", "POST"))
def signup():
    if request.method == "POST":
        pass

    return render_template("auth/signup.html")


def generate_password_hash(password, salt):
    return scrypt(password, salt, n=16384, r=8, p=1)
