from pymongo import MongoClient
import certifi

from flask import g, current_app


def init_db():
    global db
    client = MongoClient(
        current_app.config["MONGO_DB_SETTINGS"]["CONNECTION_STRING"],
        tlsCAFile=certifi.where(),
    )
    db = client.ShifterDB


def get_db():
    return db


def close_db(e=None):
    db.client.close()


def init_app(app):
    init_db()
    app.teardown_appcontext(close_db)
