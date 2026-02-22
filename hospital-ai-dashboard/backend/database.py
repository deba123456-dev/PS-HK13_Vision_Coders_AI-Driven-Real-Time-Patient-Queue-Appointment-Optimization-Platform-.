import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'hospital.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dept TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            color TEXT DEFAULT '#0EA5E9'
        );

        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            age INTEGER,
            dept TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'waiting',
            wait_mins INTEGER DEFAULT 0,
            doctor_id INTEGER,
            complaint TEXT,
            predicted_duration INTEGER DEFAULT 20,
            ai_score REAL DEFAULT 0.5,
            email TEXT UNIQUE,
            password_hash TEXT,
            FOREIGN KEY (doctor_id) REFERENCES doctors(id)
        );

        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL,
            patient_id TEXT,
            patient_name TEXT,
            slot_time TEXT NOT NULL,
            duration_mins INTEGER DEFAULT 20,
            status TEXT DEFAULT 'scheduled',
            notes TEXT,
            FOREIGN KEY (doctor_id) REFERENCES doctors(id),
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            ref_id TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bed_applications (
            id TEXT PRIMARY KEY,
            applicant_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            contact TEXT NOT NULL,
            address TEXT NOT NULL,
            department TEXT NOT NULL,
            bed_type TEXT NOT NULL,
            reason TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'pending',
            payment_amount REAL DEFAULT 0.0,
            user_id TEXT,
            password_plain TEXT,
            password_hash TEXT,
            applied_at TEXT NOT NULL,
            notes TEXT DEFAULT ''
        );
    ''')
    conn.commit()
    conn.close()
