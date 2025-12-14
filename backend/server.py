from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json
import random
import os
import csv
import datetime

app = Flask(__name__)
CORS(app)  # Allow React to talk to Flask

# --- CONFIGURATION ---
# Use absolute paths to avoid "File not found" errors
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DB_FILE = os.path.join(BASE_DIR, 'assignments.json')
TEAMS_FILE = os.path.join(BASE_DIR, 'teams.csv')
CHALLENGES_FILE = os.path.join(BASE_DIR, 'challenges.csv')
SETTINGS_FILE = os.path.join(BASE_DIR, 'settings.json')
UPLOADS_METADATA_FILE = os.path.join(BASE_DIR, 'uploads.json')

# Upload Constraints
ALLOWED_EXTENSIONS = {'zip', 'tar.gz', 'pdf', 'py', 'ipynb', 'docx'}
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB Max Size

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Admin Credentials
ADMIN_USER = {
    "username": "Admin-challange-platform", 
    "password": "C@ntr0l!Ng_Ch@ll#", 
    "role": "admin", 
    "name": "Admin Name"
}

# --- HELPER FUNCTIONS ---

def allowed_file(filename):
    if filename.endswith('.tar.gz'):
        return True
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_json(file_path):
    if not os.path.exists(file_path):
        return [] if file_path != SETTINGS_FILE else {"isLocked": False}
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except:
        return [] if file_path != SETTINGS_FILE else {"isLocked": False}

def save_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f)

# --- CSV LOADERS ---

def get_teams():
    teams_list = []
    if os.path.exists(TEAMS_FILE):
        try:
            with open(TEAMS_FILE, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                reader.fieldnames = [name.strip().lower() for name in reader.fieldnames]
                for row in reader:
                    raw_members = row.get('members', '')
                    members_array = [m.strip() for m in raw_members.split(',') if m.strip()]
                    teams_list.append({
                        "id": int(row.get('id', 0)),
                        "name": row.get('name', 'Unknown Team'),
                        "members": members_array,
                        "username": row.get('username', ''),
                        "password": row.get('password', ''),
                        "role": "team"
                    })
            print(f"✅ Loaded {len(teams_list)} teams")
        except Exception as e:
            print(f"❌ Error reading teams.csv: {e}")
    else:
        print(f"⚠️ teams.csv not found at {TEAMS_FILE}")
    return teams_list

def get_challenges():
    challenges_list = []
    if os.path.exists(CHALLENGES_FILE):
        try:
            with open(CHALLENGES_FILE, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                reader.fieldnames = [name.strip().lower() for name in reader.fieldnames]
                for row in reader:
                    challenges_list.append({
                        "id": int(row.get('id', 0)),
                        "title": row.get('title', 'Unknown Challenge'),
                        "intro": row.get('intro', ''),
                        "req": row.get('req', ''),
                        "output": row.get('output', '')
                    })
            print(f"✅ Loaded {len(challenges_list)} challenges")
        except Exception as e:
            print(f"❌ Error reading challenges.csv: {e}")
    else:
        print(f"⚠️ challenges.csv not found at {CHALLENGES_FILE}")
    return challenges_list

TEAMS = get_teams()
CHALLENGES = get_challenges()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if username == ADMIN_USER['username'] and password == ADMIN_USER['password']:
        return jsonify(ADMIN_USER)

    global TEAMS
    TEAMS = get_teams()
    user = next((t for t in TEAMS if t['username'] == username and t['password'] == password), None)
    if user:
        return jsonify(user)
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/teams', methods=['GET'])
def get_public_teams():
    global TEAMS
    TEAMS = get_teams()
    public_data = [
        {"id": t['id'], "name": t['name'], "members": t['members'], "role": t['role']}
        for t in TEAMS if t['role'] != 'admin'
    ]
    return jsonify(public_data)


@app.route('/api/draw', methods=['POST'])
def perform_draw():
    global CHALLENGES, TEAMS
    CHALLENGES = get_challenges()
    TEAMS = get_teams()

    if not CHALLENGES:
        return jsonify({"error": "No challenges loaded"}), 500

    shuffled_challenges = CHALLENGES.copy()
    random.shuffle(shuffled_challenges)
    assignments = []
    
    for i, team in enumerate(TEAMS):
        challenge = shuffled_challenges[i % len(shuffled_challenges)]
        assignments.append({
            "teamUsername": team['username'],
            "teamName": team['name'],
            "members": team['members'],
            "assignedChallenge": challenge
        })

    save_json(DB_FILE, assignments)
    return jsonify({"message": "Draw complete", "results": assignments})

@app.route('/api/reset', methods=['POST'])
def reset_draw():
    save_json(DB_FILE, [])
    return jsonify({"message": "Draw has been reset", "results": []})

@app.route('/api/results', methods=['GET'])
def get_results():
    return jsonify(load_json(DB_FILE))

@app.route('/api/my-challenge/<username>', methods=['GET'])
def get_my_challenge(username):
    assignments = load_json(DB_FILE)
    my_assignment = next((a for a in assignments if a['teamUsername'] == username), None)
    return jsonify(my_assignment['assignedChallenge']) if my_assignment else jsonify(None)


@app.route('/api/lock-status', methods=['GET'])
def get_lock_status():
    return jsonify(load_json(SETTINGS_FILE))

@app.route('/api/toggle-lock', methods=['POST'])
def toggle_lock():
    data = request.json
    should_lock = data.get('lock', False)
    settings = load_json(SETTINGS_FILE)
    if isinstance(settings, list): settings = {}
    settings['isLocked'] = should_lock
    save_json(SETTINGS_FILE, settings)
    status = "LOCKED" if should_lock else "UNLOCKED"
    return jsonify({"message": f"Event is now {status}", "isLocked": should_lock})

# --- FILE UPLOAD & DOWNLOAD ROUTES ---

@app.route('/api/upload', methods=['POST'])
def upload_file():
    username = request.form.get('username')
    if not username or 'file' not in request.files:
        return jsonify({"error": "Missing user or file"}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    original_safe = secure_filename(file.filename)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    new_filename = f"{username}_{timestamp}_{original_safe}"
    save_path = os.path.join(UPLOAD_FOLDER, new_filename)
    
    file.save(save_path)

    file_size_mb = round(os.path.getsize(save_path) / (1024 * 1024), 2)
    metadata = {
        "filename": new_filename,
        "original_name": file.filename,
        "team_username": username,
        "upload_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "size_mb": f"{file_size_mb} MB"
    }

    all_uploads = load_json(UPLOADS_METADATA_FILE)
    if not isinstance(all_uploads, list): all_uploads = []
    all_uploads.append(metadata)
    save_json(UPLOADS_METADATA_FILE, all_uploads)

    return jsonify({"message": "Upload successful", "file": metadata})

@app.route('/api/my-uploads/<username>', methods=['GET'])
def get_my_uploads(username):
    all_uploads = load_json(UPLOADS_METADATA_FILE)
    if not isinstance(all_uploads, list): all_uploads = []
    team_uploads = [f for f in all_uploads if f['team_username'] == username]
    return jsonify(team_uploads)

@app.route('/api/all-uploads', methods=['GET'])
def get_all_uploads():
    """Returns metadata for ALL uploaded files (Admin only)"""
    return jsonify(load_json(UPLOADS_METADATA_FILE))

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Securely serve the file from the uploads folder"""
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
            
        return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
    except Exception as e:
        print(f"Download Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("--- Coding for Climate Backend ---")
    print(f"Server running on http://127.0.0.1:5000")
    print(f"Uploads saving to: {UPLOAD_FOLDER}")
    app.run(debug=True, port=5000)