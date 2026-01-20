from flask_pymongo import PyMongo

mongo = PyMongo()

def initialize_db(app):
    # This automatically picks up MONGO_URI from app.config
    mongo.init_app(app)
    return mongo.db