from pymongo import MongoClient
import certifi

from flask import g, current_app


def get_db():
    if "db" not in g:
        client = MongoClient(
            current_app.config["MONGO_DB_SETTINGS"]["CONNECTION_STRING"],
            tlsCAFile=certifi.where(),
        )
        g.db = client.ShifterDB

    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_app(app):
    app.teardown_appcontext(close_db)
