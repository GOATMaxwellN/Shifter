from flask import Flask


def create_app(test_config=None):
    app = Flask("shifter", instance_relative_config=True)
    if test_config is None:
        app.config.from_pyfile("config.cfg")
    else:
        app.config.from_mapping(test_config)

    from . import home
    app.register_blueprint(home.bp)

    from . import auth
    app.register_blueprint(auth.bp)

    from . import db
    db.init_app(app)

    return app