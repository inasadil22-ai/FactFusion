import os
import datetime
import hashlib
import secrets
import smtplib
from email.mime.text import MIMEText
from functools import wraps
import jwt
from bson.objectid import ObjectId
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from werkzeug.utils import secure_filename


from config import DevelopmentConfig, ProductionConfig
from database import initialize_db, mongo

app = Flask(__name__)

# Load Configuration FIRST
env = os.environ.get('FLASK_ENV', 'development')
if env == 'production':
    app.config.from_object(ProductionConfig)
else:
    app.config.from_object(DevelopmentConfig)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            r"https://fact-fusion-.*\.vercel\.app",  # Matches ANY Vercel deployment/production URL
            "http://localhost:5173"                  # Keeps local development working smoothly
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

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

# Ensure Uploads folder exists — use absolute path so gunicorn cwd doesn't matter
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize Database
db = None
try:
    db = initialize_db(app)
    print("✅ Database initialized successfully!")
    # Compound index for fast per-user history queries
    db.analysis.create_index(
        [("user_id", 1), ("created_at", -1)],
        name="user_history_idx",
        background=True
    )
    print("✅ MongoDB index ensured.")
except Exception as e:
    print(f"❌ Database Initialization Error: {e}")

# Initialize Bcrypt
bcrypt = Bcrypt(app)

# --- AUTH / SESSION SETUP ------------------------------------------------
# Secret used to sign login session tokens. Set JWT_SECRET_KEY in your
# environment (HF Space secrets / .env) for production. If it's missing we
# fall back to a secret generated fresh each time the server starts — this
# keeps the app from crashing on boot, but it means every existing login
# is invalidated (users just get logged out) whenever the server restarts.
# Set the real env var to avoid that.
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    JWT_SECRET_KEY = secrets.token_hex(32)
    print("⚠️ JWT_SECRET_KEY is not set — using a temporary secret generated "
          "for this process. Set JWT_SECRET_KEY in your environment so logins "
          "survive a server restart.")

JWT_EXPIRY_DAYS = 7
RESET_TOKEN_EXPIRY_MINUTES = 60
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')


def generate_token(user):
    """Creates a signed, expiring session token for a logged-in user."""
    payload = {
        'sub': str(user['_id']),
        'email': user['email'],
        'role': user.get('role', 'standard'),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRY_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')


def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_bearer_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[len('Bearer '):].strip()
    return None


def require_auth(f):
    """Route decorator: rejects the request with 401 unless a valid,
    non-expired login token is present. On success, request.current_user
    is set to {sub, email, role} for the route to use."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({'error': 'Login required.'}), 401
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Your session has expired. Please log in again.'}), 401
        request.current_user = payload
        return f(*args, **kwargs)
    return wrapper


def get_optional_user():
    """Best-effort read of the caller's identity from a Bearer token.
    Returns None for guests instead of rejecting the request — used on
    routes (like /api/v1/analyze) that work for logged-out users too, but
    should trust a real token over anything the client claims in the body."""
    token = get_bearer_token()
    if not token:
        return None
    return decode_token(token)


def send_email(to_email, subject, body):
    """Sends a plain-text email via SMTP if SMTP_HOST/SMTP_USER/
    SMTP_PASSWORD are set in the environment. If they're not configured yet
    (e.g. local dev, or before you've wired up a mail provider), the email
    is logged to the server console instead of sent, so the password-reset
    flow can still be tested end-to-end — check your server logs for the
    reset link. Set the SMTP_* env vars for this to actually deliver mail."""
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)

    if not (smtp_host and smtp_user and smtp_password):
        print(f"[✉️ DEV MODE — SMTP not configured] Would email {to_email}:")
        print(f"    Subject: {subject}")
        print(f"    {body}")
        return

    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = smtp_from
        msg['To'] = to_email
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_user, smtp_password)
            smtp.sendmail(smtp_from, [to_email], msg.as_string())
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")


try:
    import torch
    import download_models
    download_models.download_weights()
    from multimodal_service import MultimodalService
    multimodal_service = MultimodalService()
    print("✅ ML models loaded successfully!")
except Exception as e:
    import traceback
    print("\n" + "="*60)
    print("❌ ML LOAD FAILED — FULL TRACEBACK:")
    traceback.print_exc()
    print(f"❌ Error type : {type(e).__name__}")
    print(f"❌ Error detail: {e}")
    print("="*60 + "\n")
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
                    "reasoning": "ML packages failed to load. Check server logs for the full traceback."
                },
                "verdict": "ML DISABLED",
                "credibility_score": 0.5,
                "image_score": 0.0,
                "xai_insights": {
                    "explanation": "ML stack failed to initialize. Check HF Space logs.",
                    "audit_path": "Lite Mode",
                    "text_weights": [],
                    "text_attributions": [],
                    "visual_heatmap": None,
                    "heatmap_status": "UNAVAILABLE"
                }
            }
    multimodal_service = MockMultimodalService()
    print("[⚠] Running in LITE (mock) mode — ML features disabled.")

# Helper for MongoDB JSON conversion
def clean_mongo_record(record):
    if record and '_id' in record:
        record['id'] = str(record.pop('_id'))
    return record

# --- HEALTH CHECK ROUTE ---
@app.route('/', methods=['GET'])
def health_check():
    ml_status = 'mock' if isinstance(multimodal_service, type) and multimodal_service.__name__ == 'MockMultimodalService' else 'loaded'
    # Simple check: if it has the class name MockMultimodalService it's in lite mode
    is_mock = multimodal_service.__class__.__name__ == 'MockMultimodalService'
    return jsonify({
        'status': 'running',
        'database': 'connected' if db is not None else 'disconnected',
        'ml_models': 'disabled (lite mode)' if is_mock else 'loaded',
        'message': 'FactFusion API is live!'
    }), 200

@app.route('/api/health', methods=['GET'])
def api_health():
    is_mock = multimodal_service.__class__.__name__ == 'MockMultimodalService'
    return jsonify({
        'status': 'running',
        'database': 'connected' if db is not None else 'disconnected',
        'ml_models': 'disabled (lite mode)' if is_mock else 'loaded',
        'mongo_uri_set': bool(os.environ.get('MONGO_URI'))
    }), 200

# --- CORE ANALYSIS & XAI ROUTE ---
@app.route('/api/v1/analyze', methods=['POST'])
def analyze_content():
    try:
        text_content = request.form.get('text', '').strip()
        file = request.files.get('file')

        # Trust a logged-in user's real identity (from their token) over
        # anything a request could claim in the form body — otherwise anyone
        # could attribute an analysis to someone else's account by just
        # sending a different user_id. Guests (no token) still work exactly
        # as before, saved with no user_id.
        current_user = get_optional_user()
        user_id = current_user['sub'] if current_user else None

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
            "fusion_score": round(result_data.get("fusion_score", 0), 2) if result_data.get("fusion_score") is not None else None,
            "xai_insights": result_data["xai_insights"],
            "created_at": datetime.datetime.utcnow(),
            "user_id": user_id
        }

        if db is None:
            return jsonify({'error': 'Database not connected. Cannot save analysis results. Check MONGO_URI in HF Space Secrets.'}), 500

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
        email = (data.get('email') or '').strip().lower()
        incoming_password = data.get('password')

        if not email or not incoming_password:
            return jsonify({'error': 'Missing credentials'}), 400

        if db.users.find_one({'email': email}):
            return jsonify({'error': 'User already exists'}), 409

        hashed = bcrypt.generate_password_hash(incoming_password).decode('utf-8')
        new_user = {
            'email': email,
            'password_hash': hashed,
            # Role is always 'standard' here — never trust a client-supplied
            # role, or anyone could POST {"role": "admin"} to /api/signup and
            # grant themselves access to every user's data.
            'role': 'standard',
            'created_at': datetime.datetime.utcnow()
        }
        result = db.users.insert_one(new_user)
        new_user['_id'] = result.inserted_id
        token = generate_token(new_user)
        return jsonify({
            'user': {
                'id': str(result.inserted_id),
                'email': email,
                'role': new_user['role']
            },
            'token': token,
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
        email = (data.get('email') or '').strip().lower()
        password_to_check = data.get('password')

        user = db.users.find_one({'email': email})

        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        stored_hash = user['password_hash']
        authenticated = False

        # --- New flow: client now sends the plain password ---
        if bcrypt.check_password_hash(stored_hash, password_to_check):
            authenticated = True
        else:
            # --- Legacy fallback: older accounts were created when the client
            # pre-hashed the password with SHA256 before bcrypt ever saw it.
            # If the plain password matches under that old scheme, accept it
            # and silently upgrade the stored hash to the new (correct) format
            # so future logins go through the fast path above.
            legacy_sha256 = hashlib.sha256(password_to_check.encode('utf-8')).hexdigest()
            if bcrypt.check_password_hash(stored_hash, legacy_sha256):
                authenticated = True
                new_hash = bcrypt.generate_password_hash(password_to_check).decode('utf-8')
                db.users.update_one(
                    {'_id': user['_id']},
                    {'$set': {'password_hash': new_hash}}
                )

        if authenticated:
            token = generate_token(user)
            return jsonify({
                'user': {
                    'id': str(user['_id']),
                    'email': user['email'],
                    'role': user.get('role', 'standard')
                },
                'token': token,
                'message': 'Login successful'
            }), 200

        return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- PASSWORD RESET ROUTES ---
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    if db is None:
        return jsonify({'error': 'Database not connected. Check MONGO_URI.'}), 500
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()

        if not email:
            return jsonify({'error': 'Please enter your email.'}), 400

        user = db.users.find_one({'email': email})
        if user:
            raw_token = secrets.token_urlsafe(32)
            # Store only a hash of the token, never the raw value — same
            # principle as password_hash. Anyone reading the DB can't reuse it.
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
            expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)

            db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'reset_token_hash': token_hash, 'reset_token_expires': expires}}
            )

            reset_link = f"{FRONTEND_URL}/reset-password?token={raw_token}"
            send_email(
                to_email=email,
                subject="Reset your FactFusion password",
                body=(
                    "We received a request to reset your FactFusion password.\n\n"
                    f"Reset it here (this link expires in {RESET_TOKEN_EXPIRY_MINUTES} minutes):\n"
                    f"{reset_link}\n\n"
                    "If you didn't request this, you can safely ignore this email."
                )
            )

        # Always return the same response whether or not that email is
        # registered — otherwise this endpoint could be used to check which
        # emails have accounts.
        return jsonify({'message': 'If an account exists for that email, a reset link has been sent.'}), 200
    except Exception as e:
        return jsonify({'error': 'Something went wrong. Please try again.'}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    if db is None:
        return jsonify({'error': 'Database not connected. Check MONGO_URI.'}), 500
    try:
        data = request.get_json() or {}
        raw_token = data.get('token')
        new_password = data.get('password')

        if not raw_token:
            return jsonify({'error': 'This reset link is invalid or has expired. Please request a new one.'}), 400
        if not new_password or len(new_password) < 6:
            return jsonify({'error': 'Access key must be at least 6 characters.'}), 400

        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        user = db.users.find_one({
            'reset_token_hash': token_hash,
            'reset_token_expires': {'$gt': datetime.datetime.utcnow()}
        })

        if not user:
            return jsonify({'error': 'This reset link is invalid or has expired. Please request a new one.'}), 400

        new_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        db.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {'password_hash': new_hash},
                '$unset': {'reset_token_hash': '', 'reset_token_expires': ''}
            }
        )

        return jsonify({'message': 'Password updated. You can now log in.'}), 200
    except Exception as e:
        return jsonify({'error': 'Something went wrong. Please try again.'}), 500

# --- HISTORY ROUTES ---
@app.route('/api/v1/analysis-history', methods=['GET'])
@require_auth
def list_analysis_history():
    if db is None:
        return jsonify({'error': 'Database not connected'}), 500
    try:
        limit = min(int(request.args.get('limit', 20)), 50)  # default 20, hard cap 50

        is_admin = request.current_user.get('role') == 'admin'
        requested_user_id = request.args.get('user_id')

        if is_admin:
            # Admins may optionally filter to one user's history; omitting
            # user_id returns everyone's — intentional, admin-only.
            query = {"user_id": requested_user_id} if requested_user_id else {}
        else:
            # Everyone else can only ever see their own history, no matter
            # what (if anything) they pass as user_id — previously this was
            # trusted from the query string, which meant a plain GET with no
            # user_id at all returned every user's records.
            query = {"user_id": request.current_user['sub']}

        # Exclude heavy heatmap matrix — only needed on XAI page for a single record
        projection = {'xai_insights.visual_heatmap': 0}

        records = list(db.analysis.find(query, projection).sort("created_at", -1).limit(limit))
        data = [clean_mongo_record(r) for r in records]
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/analysis-history/<id>', methods=['DELETE'])
@require_auth
def delete_analysis_record(id):
    if db is None:
        return jsonify({'error': 'Database not connected'}), 500
    try:
        record = db.analysis.find_one({'_id': ObjectId(id)})
        if not record:
            return jsonify({'error': 'Not found'}), 404

        is_admin = request.current_user.get('role') == 'admin'
        if not is_admin and record.get('user_id') != request.current_user['sub']:
            return jsonify({'error': "You don't have permission to delete this record."}), 403

        result = db.analysis.delete_one({'_id': ObjectId(id)})
        if result.deleted_count > 0:
            return jsonify({'message': 'Deleted'}), 200
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Invalid ID format'}), 400

@app.route('/api/v1/analysis-history/record/<id>', methods=['GET'])
@require_auth
def get_single_analysis(id):
    """
    Fetch a single analysis record WITH heatmap included.
    Used by XAIInsights page to load full data for history records.
    History list route excludes heatmap for performance — this route includes it.
    """
    if db is None:
        return jsonify({'error': 'Database not connected'}), 500
    try:
        record = db.analysis.find_one({'_id': ObjectId(id)})
        if not record:
            return jsonify({'error': 'Record not found'}), 404

        is_admin = request.current_user.get('role') == 'admin'
        if not is_admin and record.get('user_id') != request.current_user['sub']:
            return jsonify({'error': "You don't have permission to view this record."}), 403

        return jsonify(clean_mongo_record(record)), 200
    except Exception as e:
        return jsonify({'error': 'Invalid ID format'}), 400

# --- SERVE UPLOADED IMAGES ---
@app.route('/uploads/<filename>')
def serve_upload(filename):
    target_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(target_path):
        return jsonify({'error': 'Requested snapshot file not found'}), 404
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 7860))
    print(f"[*] Starting Flask on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)