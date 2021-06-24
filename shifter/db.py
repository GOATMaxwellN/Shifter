from pymongo import MongoClient


from flask import g, current_app
from flask.cli import with_appcontext
import click

def get_db():
    if "db" not in g:
        client = MongoClient(current_app["MONGO_DB_SETTINGS"]["CONNECTION_STRING"])
        g.db = client

    return g.db


def close_db():
    db = g.pop("db", None)
    if db is not None:
        db.close()


@click.add_command("init-db")
def init_db():
    db = get_db()
    with db.start_session as session:
        with session.start_transaction():
            # drop existing collections
            db.ShifterDB.drop_collection("users")
            db.ShifterDB.drop_collection("shifts")
            # recreate them - technically no, but still yes
            db.ShifterDB.users
            db.ShifterDB.shifts


def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_cli_command(init_db)
