from flask import Blueprint, render_template, request, redirect, url_for, session

from werkzeug.security import check_password_hash
from database import get_db

auth_bp = Blueprint('auth', __name__)

ADMIN_EMAIL = 'admin@mediflow.com'
ADMIN_PASSWORD = 'admin123'

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'role' in session:
        return _redirect_by_role()

    error = None
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()

        # ── Admin check ──────────────────────────────────────────────
        if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            session.clear()
            session['role'] = 'admin'
            session['display_name'] = 'Administrator'
            session['display_dept'] = 'MediFlow AI System'
            session['color'] = '#0EA5E9'
            return redirect(url_for('main.admin_dashboard'))

        conn = get_db()

        # ── Doctor check ─────────────────────────────────────────────
        doctor = conn.execute(
            'SELECT * FROM doctors WHERE LOWER(email)=?', (email,)
        ).fetchone()
        if doctor and check_password_hash(doctor['password_hash'], password):
            session.clear()
            session['role'] = 'doctor'
            session['doc_id'] = doctor['id']
            session['display_name'] = doctor['name']
            session['display_dept'] = doctor['dept']
            session['color'] = doctor['color']
            conn.close()
            return redirect(url_for('main.doctor_dashboard'))

        # ── Patient / Applicant check ─────────────────────────────────────────────
        patient = conn.execute(
            'SELECT * FROM patients WHERE LOWER(email)=? OR id=UPPER(?)', (email, email)
        ).fetchone()
        if patient and check_password_hash(patient['password_hash'], password):
            session.clear()
            session['role'] = 'patient'
            session['pat_id'] = patient['id']
            session['display_name'] = patient['name']
            session['display_dept'] = patient['dept']
            session['color'] = '#10B981'
            conn.close()
            return redirect(url_for('main.patient_dashboard'))

        applicant = conn.execute(
            'SELECT * FROM bed_applications WHERE UPPER(user_id)=?', (email.upper(),)
        ).fetchone()
        if applicant and check_password_hash(applicant['password_hash'], password):
            session.clear()
            session['role'] = 'patient_applicant'
            session['app_id'] = applicant['id']
            session['display_name'] = applicant['applicant_name']
            conn.close()
            return redirect(url_for('main.application_status', id=applicant['id']))

        conn.close()
        error = 'Invalid email/ID or password. Please try again.'

    return render_template('login.html', error=error)


@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))


def _redirect_by_role():
    role = session.get('role')
    if role == 'admin':
        return redirect(url_for('main.admin_dashboard'))
    if role == 'doctor':
        return redirect(url_for('main.doctor_dashboard'))
    if role == 'patient':
        return redirect(url_for('main.patient_dashboard'))
    return redirect(url_for('auth.login'))
