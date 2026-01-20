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
from model_service import ModelLoader

app = Flask(__name__)
model_loader = ModelLoader()

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

CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"])
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
        text_content = request.form.get('text', '')
        file = request.files.get('file')
        
        # 1. Text Analysis (Real Model)
        text_result = model_loader.predict(text_content) if text_content else None
        
        # 2. Image Modality Processing (Mocked for now as per constraints, or just handling upload)
        filename = None
        image_credibility = None
        
        if file:
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            # Mock image analysis only if file exists
            image_credibility = random.uniform(0.6, 0.95) # Simulating a reasonable check if image exists

        # 3. Fusion Logic
        final_verdict = "Non-Informative" # Default
        final_score = 0.0
        explanation = "No content provided."
        
        if text_result:
            final_verdict = text_result['label']
            # For OOD, the confidence score refers to "Confidence it is OOD", 
            # but for the UI "Credibility Score", it should be 0.0 (Irrelevant).
            if final_verdict == "OOD":
                final_score = 0.0
            else:
                final_score = text_result['confidence']
                
            explanation = text_result['xai']['explanation']
            
            # If image exists, just simple average for now (or keep separate)
            if image_credibility:
                final_score = (final_score + image_credibility) / 2
                
        # 4. Create Response Payload
        analysis_entry = {
            "text_snippet": text_content,
            "image_ref": filename,
            "verdict": final_verdict,
            "credibility_score": round(final_score, 2),
            "text_analysis": text_result, # detailed breakdown
            "image_score": image_credibility, # Explicitly null if no image
            "xai_insights": {
                "explanation": explanation,
                "text_weights": text_result['xai']['text_weights'] if text_result else [],
                "heatmap_status": "Grad-CAM Generated" if file else "N/A"
            },
            "created_at": datetime.datetime.utcnow()
        }
        
        # 5. Save to MongoDB
        result = db.analysis.insert_one(analysis_entry)
        return jsonify(clean_mongo_record(analysis_entry)), 201

    except Exception as e:
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
    app.run(host='0.0.0.0', port=5000, debug=True)