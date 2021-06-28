from pymongo import MongoClient
import certifi


def init_db(app):
    global db
    with app.app_context():
        client = MongoClient(
            app.config["MONGO_DB_SETTINGS"]["CONNECTION_STRING"],
            tlsCAFile=certifi.where(),
        )
    db = client.ShifterDB


def get_db():
    return db


def close_db(e=None):
    db.client.close()


def init_app(app):
    init_db(app)
    app.teardown_appcontext(close_db)
