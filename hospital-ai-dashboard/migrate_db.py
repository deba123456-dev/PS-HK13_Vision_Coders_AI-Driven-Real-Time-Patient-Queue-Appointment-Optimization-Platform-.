import sqlite3

conn = sqlite3.connect('hospital.db')
conn.execute('''
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
    priority TEXT DEFAULT "medium",
    status TEXT DEFAULT "pending",
    payment_status TEXT DEFAULT "pending",
    payment_amount REAL DEFAULT 0.0,
    user_id TEXT,
    password_plain TEXT,
    password_hash TEXT,
    applied_at TEXT NOT NULL,
    notes TEXT DEFAULT ""
)
''')
conn.commit()
conn.close()
print("Done: bed_applications table created.")
