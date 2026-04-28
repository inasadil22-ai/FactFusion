from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import datetime 
import random
from bson.objectid import ObjectId
from flask_bcrypt import Bcrypt

# Project Imports
from config import DevelopmentConfig, ProductionConfig
from database import initialize_db, mongo
from multimodal_service import MultimodalService

app = Flask(__name__)
multimodal_service = MultimodalService()

# Load Configuration
env = os.environ.get('FLASK_ENV', 'development')
if env == 'production':
    app.config.from_object(ProductionConfig)
else:
    app.config.from_object(DevelopmentConfig)

# Ensure Uploads folder exists for images
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

CORS(app, resources={r"/api/*": {"origins": "*"}})
db = initialize_db(app)
bcrypt = Bcrypt(app)

# Helper for MongoDB JSON conversion
def clean_mongo_record(record):
    if record and '_id' in record:
        record['id'] = str(record.pop('_id'))
    return record

# --- CORE ANALYSIS & XAI ROUTE ---
@app.route('/api/v1/analyze', methods=['POST'])
def analyze_content():
    try:
        text_content = request.form.get('text', '').strip()  # Strip whitespace so empty string = no text
        file = request.files.get('file')
        
        filename = None
        file_path = None
        
        if file:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

        # Use the multimodal service (pass None for caption if no text provided)
        result_data = multimodal_service.analyze(image_path=file_path, caption=text_content if text_content else None)
        
        if "error" in result_data:
            return jsonify(result_data), 500

        # Create Response Payload following the 3-stage structure strictly
        final_response = {
            "stage_1_image_analysis": result_data["stage_1_image_analysis"],
            "stage_2_text_analysis": result_data["stage_2_text_analysis"],
            "stage_3_multimodal_fusion": result_data["stage_3_multimodal_fusion"]
        }
        
        # Merge with backward-compatible fields for DB and legacy frontend components
        analysis_entry = {
            **final_response,
            "text_snippet": text_content,
            "image_ref": filename,
            "verdict": result_data["verdict"],
            "credibility_score": round(result_data["credibility_score"], 2),
            "image_score": round(result_data.get("image_score", 0), 2) if result_data.get("image_score") is not None else None,
            "xai_insights": result_data["xai_insights"],
            "created_at": datetime.datetime.utcnow()
        }
        
        # Save to MongoDB
        result = db.analysis.insert_one(analysis_entry)
        return jsonify(clean_mongo_record(analysis_entry)), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Analysis Error: {e}")
        return jsonify({'error': str(e)}), 500

# --- AUTHENTICATION ROUTES ---
@app.route('/api/signup', methods=['POST'])
def signup_user():
    try:
        data = request.get_json()
        email = data.get('email')
        incoming_password = data.get('password_hash') 
        
        if not email or not incoming_password:
            return jsonify({'error': 'Missing credentials'}), 400
        
        if db.users.find_one({'email': email}):
            return jsonify({'error': 'User already exists'}), 409
        
        hashed = bcrypt.generate_password_hash(incoming_password).decode('utf-8')
        new_user = {
            'email': email,
            'password_hash': hashed,
            'role': data.get('role', 'standard'),
            'created_at': datetime.datetime.utcnow()
        }
        result = db.users.insert_one(new_user)
        return jsonify({'message': 'User created', 'id': str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json()
        email = data.get('email')
        password_to_check = data.get('password')

        user = db.users.find_one({'email': email})
        
        if user and bcrypt.check_password_hash(user['password_hash'], password_to_check):
            return jsonify({
                'user': {
                    'id': str(user['_id']),
                    'email': user['email'],
                    'role': user.get('role', 'standard')
                },
                'message': 'Login successful'
            }), 200
            
        return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- HISTORY ROUTES ---
@app.route('/api/v1/analysis-history', methods=['GET'])
def list_analysis_history():
    try:
        records = list(db.analysis.find().sort("created_at", -1))
        data = [clean_mongo_record(r) for r in records]
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/analysis-history/<id>', methods=['DELETE'])
def delete_analysis_record(id):
    try:
        result = db.analysis.delete_one({'_id': ObjectId(id)})
        if result.deleted_count > 0:
            return jsonify({'message': 'Deleted'}), 200
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Invalid ID format'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)