from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import hashlib
import secrets
import os
from datetime import datetime, date, timedelta
import json

# Load .env file if present (optional — you can also set env vars directly)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed — set environment variables manually

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
CORS(app, supports_credentials=True)

DB_CONFIG = {
    'host':     os.environ.get('DB_HOST', 'localhost'),
    'user':     os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'okane_tracker'),
    'autocommit': False
}

# ── DB helpers ────────────────────────────────────────────────────

def get_db():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"DB Error: {e}")
        return None

def hash_password(password):
    salt = "okane_salt_2024"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def init_db():
    try:
        cfg = {k: v for k, v in DB_CONFIG.items() if k != 'database'}
        cfg['autocommit'] = True
        conn = mysql.connector.connect(**cfg)
        cur = conn.cursor()
        cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cur.execute(f"USE {DB_CONFIG['database']}")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(64) NOT NULL,
                display_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS monthly_budgets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                month VARCHAR(7) NOT NULL,
                total_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
                UNIQUE KEY uniq_user_month (user_id, month),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS entries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                month VARCHAR(7) NOT NULL,
                entry_type ENUM('expense','income') NOT NULL DEFAULT 'expense',
                category VARCHAR(50) NOT NULL,
                description VARCHAR(255),
                amount DECIMAL(12,2) NOT NULL,
                entry_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_month (user_id, month),
                INDEX idx_user_date (user_id, entry_date)
            )
        """)
        cur.close()
        conn.close()
        print("✅ Database ready!")
    except Error as e:
        print(f"❌ Init DB Error: {e}")

# ── Auth routes ───────────────────────────────────────────────────

@app.route('/')
def index():
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('app.html', username=session.get('display_name', session.get('username')))

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''
    display  = (data.get('display_name') or username).strip()

    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO users (username, password_hash, display_name) VALUES (%s, %s, %s)",
                    (username, hash_password(password), display))
        conn.commit()
        user_id = cur.lastrowid
        session['user_id']     = user_id
        session['username']    = username
        session['display_name']= display
        cur.close()
        return jsonify({'success': True, 'display_name': display})
    except Error as e:
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'Username already taken'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, username, display_name FROM users WHERE username=%s AND password_hash=%s",
                    (username, hash_password(password)))
        user = cur.fetchone()
        cur.close()
        if not user:
            return jsonify({'error': 'Wrong username or password'}), 401
        session['user_id']     = user['id']
        session['username']    = user['username']
        session['display_name']= user['display_name'] or user['username']
        return jsonify({'success': True, 'display_name': session['display_name']})
    finally:
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

def require_login():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    return None

# ── Budget ────────────────────────────────────────────────────────

@app.route('/api/budget', methods=['GET'])
def get_budget():
    err = require_login()
    if err: return err
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT total_budget FROM monthly_budgets WHERE user_id=%s AND month=%s",
                    (session['user_id'], month))
        row = cur.fetchone()
        return jsonify({'month': month, 'total_budget': float(row['total_budget']) if row else 0})
    finally:
        conn.close()

@app.route('/api/budget', methods=['POST'])
def set_budget():
    err = require_login()
    if err: return err
    data   = request.json or {}
    month  = data.get('month', datetime.now().strftime('%Y-%m'))
    amount = float(data.get('amount', 0))
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO monthly_budgets (user_id, month, total_budget)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE total_budget = %s
        """, (session['user_id'], month, amount, amount))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()

# ── Entries ───────────────────────────────────────────────────────

@app.route('/api/entries', methods=['GET'])
def get_entries():
    err = require_login()
    if err: return err
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, entry_type AS type, category, description, amount, entry_date AS expense_date
            FROM entries WHERE user_id=%s AND month=%s
            ORDER BY entry_date DESC, created_at DESC
        """, (session['user_id'], month))
        rows = cur.fetchall()
        for r in rows:
            r['amount'] = float(r['amount'])
            if isinstance(r['expense_date'], date):
                r['expense_date'] = r['expense_date'].isoformat()
        return jsonify(rows)
    finally:
        conn.close()

@app.route('/api/entries', methods=['POST'])
def add_entry():
    err = require_login()
    if err: return err
    data   = request.json or {}
    month  = data.get('month', datetime.now().strftime('%Y-%m'))
    etype  = data.get('type', 'expense')
    cat    = data.get('category', 'other')
    desc   = data.get('description', '')
    amount = float(data.get('amount', 0))
    edate  = data.get('date', datetime.now().strftime('%Y-%m-%d'))

    if amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400

    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO entries (user_id, month, entry_type, category, description, amount, entry_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (session['user_id'], month, etype, cat, desc, amount, edate))
        conn.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})
    finally:
        conn.close()

@app.route('/api/entries/<int:entry_id>', methods=['PUT'])
def update_entry(entry_id):
    err = require_login()
    if err: return err
    data   = request.json or {}
    desc   = data.get('description', '')
    amount = float(data.get('amount', 0))
    if amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE entries SET description=%s, amount=%s
            WHERE id=%s AND user_id=%s
        """, (desc, amount, entry_id, session['user_id']))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()

@app.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    err = require_login()
    if err: return err
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM entries WHERE id=%s AND user_id=%s", (entry_id, session['user_id']))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()

# ── Summary ───────────────────────────────────────────────────────

@app.route('/api/summary', methods=['GET'])
def get_summary():
    err = require_login()
    if err: return err
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT total_budget FROM monthly_budgets WHERE user_id=%s AND month=%s",
                    (session['user_id'], month))
        b = cur.fetchone()
        budget = float(b['total_budget']) if b else 0

        cur.execute("""
            SELECT entry_type, category, SUM(amount) as total
            FROM entries WHERE user_id=%s AND month=%s
            GROUP BY entry_type, category
        """, (session['user_id'], month))
        rows = cur.fetchall()

        spent  = sum(float(r['total']) for r in rows if r['entry_type'] == 'expense')
        income = sum(float(r['total']) for r in rows if r['entry_type'] == 'income')
        by_cat = [{'category': r['category'], 'type': r['entry_type'], 'total': float(r['total'])} for r in rows]

        return jsonify({'budget': budget, 'spent': spent, 'income': income, 'remaining': budget - spent, 'by_category': by_cat})
    finally:
        conn.close()

@app.route('/api/year', methods=['GET'])
def get_year():
    err = require_login()
    if err: return err
    year = request.args.get('year', str(datetime.now().year))
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    try:
        cur = conn.cursor(dictionary=True)
        result = {}
        for m in range(1, 13):
            month = f"{year}-{m:02d}"
            cur.execute("SELECT total_budget FROM monthly_budgets WHERE user_id=%s AND month=%s",
                        (session['user_id'], month))
            b = cur.fetchone()
            cur.execute("""
                SELECT entry_type, SUM(amount) as total FROM entries
                WHERE user_id=%s AND month=%s GROUP BY entry_type
            """, (session['user_id'], month))
            rows = cur.fetchall()
            spent  = sum(float(r['total']) for r in rows if r['entry_type'] == 'expense')
            income = sum(float(r['total']) for r in rows if r['entry_type'] == 'income')
            result[month] = {'budget': float(b['total_budget']) if b else 0, 'spent': spent, 'income': income}
        return jsonify(result)
    finally:
        conn.close()

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
