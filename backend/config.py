import os
from datetime import timedelta
from dotenv import load_dotenv

# This must be at the top to load the .env file
load_dotenv()

class Config:
    """Base configuration settings."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "a_very_secret_key_12345")
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # MongoDB Configuration - Reads from .env
    MONGO_URI = os.environ.get("MONGO_URI")
    # Flask-PyMongo uses MONGO_URI by default, but we can store the name separately
    MONGO_DBNAME = os.environ.get("MONGO_DBNAME", "factfusion_db")

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False