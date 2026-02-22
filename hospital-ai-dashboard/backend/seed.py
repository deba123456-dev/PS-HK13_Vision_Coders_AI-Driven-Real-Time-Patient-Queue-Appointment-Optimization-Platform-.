import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from werkzeug.security import generate_password_hash
from database import get_db, init_db

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def seed():
    print("🌱 Initializing database...")
    init_db()
    conn = get_db()
    c = conn.cursor()

    # Clear existing data (order matters for FK)
    c.execute('DELETE FROM schedules')
    c.execute('DELETE FROM patients')
    c.execute('DELETE FROM doctors')

    # Seed doctors
    print("👨‍⚕️ Seeding doctors...")
    with open(os.path.join(DATA_DIR, 'doctors.csv'), newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            c.execute(
                'INSERT INTO doctors (id, name, dept, email, password_hash, color) VALUES (?,?,?,?,?,?)',
                (row['id'], row['name'], row['dept'], row['email'],
                 generate_password_hash(row['password']), row['color'])
            )

    # Seed patients
    print("🏥 Seeding patients...")
    with open(os.path.join(DATA_DIR, 'patients.csv'), newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            c.execute(
                '''INSERT INTO patients
                   (id,name,age,dept,priority,status,wait_mins,doctor_id,complaint,predicted_duration,ai_score,email,password_hash)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                (row['id'], row['name'], row['age'], row['dept'], row['priority'],
                 row['status'], row['wait_mins'], row['doctor_id'], row['complaint'],
                 row['predicted_duration'], row['ai_score'], row['email'],
                 generate_password_hash(row['password']))
            )

    # Seed schedules
    print("📅 Seeding schedules...")
    with open(os.path.join(DATA_DIR, 'schedules.csv'), newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row['patient_id'].strip() if row['patient_id'].strip() else None
            c.execute(
                '''INSERT INTO schedules (doctor_id,patient_id,patient_name,slot_time,duration_mins,status,notes)
                   VALUES (?,?,?,?,?,?,?)''',
                (row['doctor_id'], pid, row['patient_name'],
                 row['slot_time'], row['duration_mins'], row['status'], row['notes'])
            )

    conn.commit()
    conn.close()
    print("✅ Database seeded successfully!")
    print("\n📋 Login credentials:")
    print("  Admin:    admin@mediflow.com   / admin123")
    print("  Doctors:  malhotra@mediflow.com / doctor123  (and others)")
    print("  Patients: arjun@patient.com    / patient123  (and others)")

if __name__ == '__main__':
    seed()
