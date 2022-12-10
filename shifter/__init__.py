from flask import Flask
import os

def create_app(test_config=None):
    app = Flask("shifter", instance_relative_config=True)
    if test_config is None:
        # If in Heroku prod server, get all config values from
        # env variables
        if app.env == "production":
            print("I'm in prod!!")
            app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
            app.config["DB_URI"] = os.getenv("DB_URI")
            print("Here is the db uri " + app.config["DB_URI"])
        else:
            print("I am not in prod???")
            app.config.from_pyfile("config.cfg")
    else:
        app.config.from_mapping(test_config)

    from . import home
    app.register_blueprint(home.bp)

    from . import auth
    app.register_blueprint(auth.bp)

    from . import calendar
    app.register_blueprint(calendar.bp)

    from . import db
    with app.app_context():
        db.init_app()
        from . import oauth_calendar_classes

    from . import oauth
    app.register_blueprint(oauth.bp)
    

    from . import api
    app.register_blueprint(api.bp)

    @app.route("/home-test")
    def home_test():
        return app.config["SECRET_KEY"]

    return app
