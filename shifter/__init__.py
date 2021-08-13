from flask import Flask
import os

def create_app(test_config=None):
    app = Flask("shifter", instance_relative_config=True)
    if test_config is None:
        config_class = os.getenv("CONFIG_CLASS", "config.Config")
        app.config.from_object(config_class)
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
        from . import oauth  # Need to init classes with app context 
    app.register_blueprint(oauth.bp)

    from . import api
    app.register_blueprint(api.bp)
    
    return app