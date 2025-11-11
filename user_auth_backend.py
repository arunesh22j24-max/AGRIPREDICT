import sqlite3
from flask import Flask, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from datetime import timedelta

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Change this in production
CORS(app)

# SQLite DB setup (users.db)
def get_db():
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    pw_hash = generate_password_hash(password)
    try:
        with get_db() as db:
            db.execute('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
                       (username, pw_hash, email))
            db.commit()
        return jsonify({'message': 'User registered successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists'}), 409

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    with get_db() as db:
        user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session.permanent = True
            app.permanent_session_lifetime = timedelta(days=7)
            return jsonify({'message': 'Login successful'})
        else:
            return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out'})

@app.route('/me', methods=['GET'])
def me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    with get_db() as db:
        user = db.execute('SELECT id, username, email, created_at FROM users WHERE id = ?', (user_id,)).fetchone()
        if user:
            return jsonify(dict(user))
        else:
            return jsonify({'error': 'User not found'}), 404

if __name__ == '__main__':
    init_db()
    app.run(port=5002, debug=True)
