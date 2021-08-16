from flask import current_app

from pymongo.mongo_client import MongoClient
import certifi


def init_db():
    global db
    client = MongoClient(
        current_app.config["DB_URI"],
        tlsCAFile=certifi.where(),
    )
    db = client.ShifterDB


def get_db():
    return db


def close_db(e=None):
    db.client.close()


def init_app():
    init_db()
    current_app.teardown_appcontext(close_db)
