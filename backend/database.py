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

        # Ensure an index exists on created_at so analysis-history's
        # .sort("created_at", -1) can use the index instead of buffering
        # every matching document in memory. Without this, MongoDB hits
        # "Sort exceeded memory limit" once heatmap-laden documents add up,
        # and analysis-history silently returns nothing to the frontend.
        # create_index is a no-op if the index already exists, so this is
        # safe to run on every startup.
        try:
            db_for_index = client.get_default_database()
            db_for_index.analysis.create_index([("created_at", -1)])
            db_for_index.analysis.create_index([("user_id", 1)])
            print("✅ MongoDB indexes ensured (analysis.created_at, analysis.user_id)")
        except Exception as idx_err:
            print(f"⚠️ Could not ensure MongoDB indexes: {idx_err}")

        client.close()
    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise e
    
    return mongo.db