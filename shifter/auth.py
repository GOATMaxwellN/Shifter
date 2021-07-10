from flask import (
    Blueprint, render_template, request, redirect, url_for, session)
from hashlib import scrypt
from shifter.db import get_db
import re
import os
from functools import wraps
from bson.objectid import ObjectId


bp = Blueprint("auth", "shifter", url_prefix="/auth")

# Makes sure that passwords have at least a number and uppercase letter
PASSWORD_VALIDATION_PATTERN = re.compile(r"^(?=.*\d)(?=.*[A-Z])")


@bp.route("/login", methods=("GET", "POST"))
def login():
    # This inits fields in the session that will store credential
    # info to access user calendars. Nothing to do with login.
    if "credentials" not in session:
        session["credentials"] = {"google": {}, "outlook": {}}

    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        error = None

        db = get_db()
        user = None        
        for doc in db.users.find({"username": username}):
            user = doc

        # If users exists, check password hashes
        if user is None:
            error = "Username doesn't exist"
        else:
            # If password is correct, add user to the session,
            # and redirect to calendar view
            pass_hash = generate_password_hash(password, user["salt"])
            if pass_hash == user["password_hash"]:
                # ObjectId is not JSON serializable, so convert to str
                session["user_id"] = str(user["_id"])
                return redirect(url_for("calendarview.index"))
            else:
                error = "Incorrect password"

        return render_template("auth/login.html", error=error)

    # request.args may include a just_registered variable, which means
    # the user has just signed up. The page will then provide a message
    # to the user that they can use their info to login now
    return render_template("auth/login.html", **request.args)


@bp.route("/signup", methods=("GET", "POST"))
def signup():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        error = None

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
                    "shifts": {},
                    "connected_calendars": {
                        "Google": False,
                        "Outlook": False,
                    },
                    "refresh_tokens": {
                        "Google": None,
                    }
                })
                return redirect(url_for("auth.login", newly_registered=True))
            else:
                error = "Password must contain at least 6 characters, " \
                        "1 uppercase letter and a number"
        else:
            error = "Username already taken. Pick another one."

        return render_template("auth/signup.html", error=error)

    return render_template("auth/signup.html")


@bp.route("/logout", methods=["GET"])
def logout():
    # Clear everything in the session
    session.clear()
    return redirect(url_for("auth.login"))


def generate_password_hash(password, salt):
    encoded_pw = password.encode("ascii")
    return scrypt(encoded_pw, salt=salt, n=16384, r=8, p=1)


def validate_password(password):
    if (5 <= len(password) <= 16
       and PASSWORD_VALIDATION_PATTERN.match(password) is not None):
       return True
    return False


def login_required(f):
    @wraps(f)
    def wrapper():
        if "user_id" not in session:
            return redirect(url_for("auth.login"))
        return f()
    return wrapper


def get_logged_in_user_id():
    # Have to convert back to ObjectId to actually match with db
    return ObjectId(oid=session["user_id"])
