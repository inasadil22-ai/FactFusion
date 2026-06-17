from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import datetime
from bson.objectid import ObjectId
from flask_bcrypt import Bcrypt

# Project Imports
from config import DevelopmentConfig, ProductionConfig
from database import initialize_db, mongo

app = Flask(__name__)

# Load Configuration FIRST
env = os.environ.get('FLASK_ENV', 'development')
if env == 'production':
    app.config.from_object(ProductionConfig)
else:
    app.config.from_object(DevelopmentConfig)

# CORS - Allow ALL origins
CORS(app, resources={r"/*": {
    "origins": "*",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
    "supports_credentials": False
}})

@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response, 200

# Ensure Uploads folder exists
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize Database
db = None
try:
    db = initialize_db(app)
    print("✅ Database initialized successfully!")
except Exception as e:
    print(f"❌ Database Initialization Error: {e}")

# Initialize Bcrypt
bcrypt = Bcrypt(app)


try:
    import torch
    import download_models
    download_models.main()
    from multimodal_service import MultimodalService
    multimodal_service = MultimodalService()
    print("✅ ML models loaded successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"[-] ML LOAD FAILED — full error above: {e}")
    print(f"[-] Error type: {type(e).__name__}")
    class MockMultimodalService:
        def analyze(self, image_path=None, caption=None):
            return {
                "active_modalities": {"image": bool(image_path), "text": bool(caption)},
                "stage_1_image_analysis": {
                    "combined_image_label": "Lite Mode",
                    "semantic_label": "N/A",
                    "forensic_label": "N/A"
                },
                "stage_2_text_analysis": {"text_label": "Lite Mode"},
                "stage_3_multimodal_fusion": {
                    "multimodal_label": "ML DISABLED (LITE MODE)",
                    "reasoning": "Railway Lite Mode: Heavy ML packages are not installed."
                },
                "verdict": "ML DISABLED",
                "credibility_score": 0.5,
                "image_score": 0.0,
                "xai_insights": {
                    "explanation": "This server is running without torch/transformers to save memory.",
                    "audit_path": "Lite Mode",
                    "text_weights": [],
                    "text_attributions": [],
                    "visual_heatmap": None,
                    "heatmap_status": "UNAVAILABLE"
                }
            }
    multimodal_service = MockMultimodalService()

# Helper for MongoDB JSON conversion
def clean_mongo_record(record):
    if record and '_id' in record:
        record['id'] = str(record.pop('_id'))
    return record

# --- HEALTH CHECK ROUTE ---
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'running',
        'database': 'connected' if db is not None else 'disconnected',
        'message': 'FactFusion API is live!'
    }), 200

@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({
        'status': 'running',
        'database': 'connected' if db is not None else 'disconnected'
    }), 200

# --- CORE ANALYSIS & XAI ROUTE ---
@app.route('/api/v1/analyze', methods=['POST'])
def analyze_content():
    try:
        text_content = request.form.get('text', '').strip()
        file = request.files.get('file')
        user_id = request.form.get('user_id')

        filename = None
        file_path = None

        if file:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

        result_data = multimodal_service.analyze(
            image_path=file_path,
            caption=text_content if text_content else None
        )

        if "error" in result_data:
            return jsonify(result_data), 500

        final_response = {
            "stage_1_image_analysis": result_data["stage_1_image_analysis"],
            "stage_2_text_analysis": result_data["stage_2_text_analysis"],
            "stage_3_multimodal_fusion": result_data["stage_3_multimodal_fusion"]
        }

        analysis_entry = {
            **final_response,
            "text_snippet": text_content,
            "image_ref": filename,
            "verdict": result_data["verdict"],
            "credibility_score": round(result_data["credibility_score"], 2),
            "image_score": round(result_data.get("image_score", 0), 2) if result_data.get("image_score") is not None else None,
            "xai_insights": result_data["xai_insights"],
            "created_at": datetime.datetime.utcnow(),
            "user_id": user_id
        }

        result = db.analysis.insert_one(analysis_entry)
        return jsonify(clean_mongo_record(analysis_entry)), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# --- AUTHENTICATION ROUTES ---
@app.route('/api/signup', methods=['POST'])
def signup_user():
    if db is None:
        return jsonify({'error': 'Database not connected. Check MONGO_URI.'}), 500
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
        return jsonify({
            'user': {
                'id': str(result.inserted_id),
                'email': email,
                'role': new_user['role']
            },
            'message': 'User created'
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    if db is None:
        return jsonify({'error': 'Database not connected. Check MONGO_URI.'}), 500
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
    if db is None:
        return jsonify({'error': 'Database not connected'}), 500
    try:
        user_id = request.args.get('user_id')
        query = {}
        if user_id:
            query["user_id"] = user_id
        records = list(db.analysis.find(query).sort("created_at", -1))
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

# --- SERVE UPLOADED IMAGES ---
@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"[*] Starting Flask on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)