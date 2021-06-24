from pymongo import MongoClient
from flask import g, current_app


def get_db():
    if "db" not in g:
        client = MongoClient(current_app["MONGO_DB_SETTINGS"]["CONNECTION_STRING"])
        g.db = client

    return g.db


def close_db():
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_app(app):
    app.teardown_appcontext(close_db)
