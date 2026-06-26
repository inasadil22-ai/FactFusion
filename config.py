import os
from datetime import timedelta
from dotenv import load_dotenv

# Always try to load .env — dotenv skips missing files and never overwrites
# environment variables that are already set (e.g. from HF Secrets).
# This means local .env works in dev, and HF Secrets take priority in production.
load_dotenv()

class Config:
    """Base configuration settings."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "a_very_secret_key_12345")
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # MongoDB Configuration - Reads from .env
    MONGO_URI = os.environ.get("MONGO_URI")
    # Flask-PyMongo uses MONGO_URI by default, but we can store the name separately
    MONGO_DBNAME = os.environ.get("MONGO_DBNAME", "factfusion_db")

    # CORS Configuration - Fallback to allow all origins (*) if not specified
    CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "*")

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False