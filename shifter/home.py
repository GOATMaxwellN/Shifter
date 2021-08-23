from flask import Blueprint, render_template

bp = Blueprint("home", "shifter")


@bp.get("/")
def home():
    return render_template("home/index.html")


@bp.get("/privacy-policy")
def privacy_policy():
    return render_template("privacypolicy/index.html")


@bp.get("/google723d18e43c0f1c6c.html")
def google_verification_file():
    return render_template("home/google723d18e43c0f1c6c.html")