from flask_pymongo import PyMongo
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os

mongo = PyMongo()

def initialize_db(app):
    mongo_uri = app.config.get("MONGO_URI") or os.environ.get("MONGO_URI")
    
    if not mongo_uri:
        raise ValueError("❌ MONGO_URI is not set!")
    
    # Add connection settings directly to URI if not present
    if "connectTimeoutMS" not in mongo_uri:
        app.config["MONGO_URI"] = mongo_uri
    
    app.config["MONGO_URI"] = mongo_uri
    
    # Initialize with timeout settings
    mongo.init_app(app, 
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000,
        maxPoolSize=10,
        retryWrites=True,
        w="majority"
    )
    
    # Test connection on startup
    try:
        client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
        )
        client.admin.command('ping')
        print("✅ MongoDB connected successfully!")
        client.close()
    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise e
    
    return mongo.db