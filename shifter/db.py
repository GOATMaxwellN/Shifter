from pymongo import MongoClient
import certifi

from flask import g, current_app
from flask.cli import with_appcontext
import click

def get_db():
    if "db" not in g:
        client = MongoClient(
            current_app.config["MONGO_DB_SETTINGS"]["CONNECTION_STRING"],
            tlsCAFile=certifi.where(),
        )
        g.db = client

    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


@click.command("init-db")
@with_appcontext
def init_db():
    db = get_db()
    
    # Create 'users' collection
    coll = db.ShifterDB.users
    coll.insert_one({"Name": "Maxwell"})


def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db)
