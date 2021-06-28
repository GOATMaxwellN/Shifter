from flask import (
    Blueprint, render_template, request, redirect, url_for)
from hashlib import scrypt
from shifter.db import get_db
import re
import os


bp = Blueprint("auth", "shifter", url_prefix="/auth")

# Makes sure that passwords have at least a number and uppercase letter
PASSWORD_VALIDATION_PATTERN = re.compile(r"^(?=.*\d)(?=.*[A-Z])")


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
                redirect(url_for("calendarview.index"))
            else:
                error = "Incorrect password"

    return render_template("auth/login.html", error=error)


@bp.route("/signup", methods=("GET", "POST"))
def signup():
    if request.method == "POST":
        username = request["username"]
        password = request["password"]

        db = get_db()
        # Check if username exists already
        user = None
        for doc in db.users.find({"username": username}):
            user = doc

        # If username is not taken, validate the password.
        if user is None:
            # If password is valid, add user to database, 
            # and redirect to login page
            if validate_password(password):
                salt = os.urandom(16)
                pass_hash = generate_password_hash(password, salt)
                db.users.insert_one({
                    "username": username,
                    "password_hash": pass_hash,
                    "salt": salt,
                    "connected_calendars": {
                        "Google": False,
                        "Outlook": False,
                    },
                })
                redirect(url_for("auth.login"))
            else:
                error = "Password must contain at least 6 characters, " \
                        "1 uppercase letter and a number"
        else:
            error = "Username already taken. Pick another one."

    return render_template("auth/signup.html", error=error)


def generate_password_hash(password, salt):
    return scrypt(password, salt, n=16384, r=8, p=1)


def validate_password(password):
    if (5 <= len(password) <= 16
       and PASSWORD_VALIDATION_PATTERN.match(password) is not None):
       return True
    return False
