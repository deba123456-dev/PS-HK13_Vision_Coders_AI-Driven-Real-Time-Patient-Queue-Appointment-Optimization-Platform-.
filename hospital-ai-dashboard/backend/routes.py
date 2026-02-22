import random
import string
from datetime import datetime
from functools import wraps
from flask import Blueprint, render_template, request, session, redirect, url_for, jsonify
from werkzeug.security import generate_password_hash
from database import get_db

main_bp = Blueprint('main', __name__)

BED_PRICES = {
    'general': 1500,
    'semi-private': 3500,
    'private': 7000,
    'icu': 15000,
}

def _gen_id(prefix, length=6):
    return prefix + ''.join(random.choices(string.digits, k=length))

def _gen_password(length=10):
    chars = string.ascii_letters + string.digits + '!@#$'
    return ''.join(random.choices(chars, k=length))

# ── Auth guards ───────────────────────────────────────────────────────────────

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if session.get('role') not in roles:
                return redirect(url_for('auth.login'))
            return f(*args, **kwargs)
        return wrapped
    return decorator

# ── HTML page routes ──────────────────────────────────────────────────────────

@main_bp.route('/')
def index():
    role = session.get('role')
    if role == 'admin':   return redirect(url_for('main.admin_dashboard'))
    if role == 'doctor':  return redirect(url_for('main.doctor_dashboard'))
    if role == 'patient': return redirect(url_for('main.patient_dashboard'))
    return redirect(url_for('auth.login'))

@main_bp.route('/admin')
@require_role('admin')
def admin_dashboard():
    return render_template('admin_dashboard.html',
        display_name=session['display_name'],
        display_dept=session['display_dept'],
        color=session['color'])

@main_bp.route('/doctor')
@require_role('doctor')
def doctor_dashboard():
    conn = get_db()
    doc = conn.execute('SELECT * FROM doctors WHERE id=?', (session['doc_id'],)).fetchone()
    conn.close()
    initials = ''.join(p[0] for p in doc['name'].split() if p[0].isupper())[:2]
    return render_template('doctor_dashboard.html',
        doctor=dict(doc), initials=initials)

@main_bp.route('/patient')
@require_role('patient')
def patient_dashboard():
    conn = get_db()
    pat = conn.execute(
        '''SELECT p.*, d.name as doctor_name, d.dept as doctor_dept, d.color as doctor_color
           FROM patients p LEFT JOIN doctors d ON p.doctor_id=d.id
           WHERE p.id=?''', (session['pat_id'],)
    ).fetchone()
    schedule = conn.execute(
        '''SELECT * FROM schedules WHERE patient_id=? ORDER BY slot_time''',
        (session['pat_id'],)
    ).fetchone()
    conn.close()
    return render_template('patient_dashboard.html',
        patient=dict(pat),
        schedule=dict(schedule) if schedule else None)

# ── Admin API ─────────────────────────────────────────────────────────────────

@main_bp.route('/api/admin/stats')
@require_role('admin')
def api_admin_stats():
    conn = get_db()
    total = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
    waiting = conn.execute("SELECT COUNT(*) FROM patients WHERE status='waiting'").fetchone()[0]
    done = conn.execute("SELECT COUNT(*) FROM patients WHERE status='done'").fetchone()[0]
    critical = conn.execute("SELECT COUNT(*) FROM patients WHERE priority='critical'").fetchone()[0]
    avg_wait = conn.execute("SELECT AVG(wait_mins) FROM patients WHERE status='waiting'").fetchone()[0] or 0
    conn.close()
    return jsonify({
        'total_patients': total,
        'waiting': waiting,
        'done': done,
        'active_alerts': critical,
        'avg_wait_mins': round(avg_wait),
        'utilization': random.randint(74, 90),
        'optimizations': random.randint(22, 40)
    })

@main_bp.route('/api/admin/patients')
@require_role('admin')
def api_admin_patients():
    conn = get_db()
    rows = conn.execute(
        '''SELECT p.*, d.name as doctor_name FROM patients p
           LEFT JOIN doctors d ON p.doctor_id=d.id
           ORDER BY CASE p.priority
             WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END'''
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@main_bp.route('/api/admin/doctors')
@require_role('admin')
def api_admin_doctors():
    conn = get_db()
    doctors = conn.execute('SELECT * FROM doctors').fetchall()
    result = []
    for d in doctors:
        pts = conn.execute('SELECT COUNT(*) FROM patients WHERE doctor_id=?', (d['id'],)).fetchone()[0]
        done = conn.execute("SELECT COUNT(*) FROM patients WHERE doctor_id=? AND status='done'", (d['id'],)).fetchone()[0]
        waiting = conn.execute("SELECT COUNT(*) FROM patients WHERE doctor_id=? AND status='waiting'", (d['id'],)).fetchone()[0]
        row = dict(d)
        row['patient_count'] = pts
        row['done_count'] = done
        row['waiting_count'] = waiting
        row['utilization'] = random.randint(55, 95)
        result.append(row)
    conn.close()
    return jsonify(result)

@main_bp.route('/api/admin/bed_applications')
@require_role('admin')
def api_admin_bed_applications():
    conn = get_db()
    rows = conn.execute(
        '''SELECT * FROM bed_applications
           ORDER BY CASE status
             WHEN 'pending' THEN 1 ELSE 2 END,
           applied_at DESC'''
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@main_bp.route('/api/admin/bed_applications/<app_id>/status', methods=['POST'])
@require_role('admin')
def api_admin_bed_app_status(app_id):
    data = request.get_json()
    new_status = data.get('status')
    if new_status not in ['approved', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400

    conn = get_db()
    app = conn.execute('SELECT * FROM bed_applications WHERE id=?', (app_id,)).fetchone()
    if not app:
        conn.close()
        return jsonify({'error': 'Application not found'}), 404

    # Update application status
    conn.execute('UPDATE bed_applications SET status=? WHERE id=?', (new_status, app_id))

    # If approved, insert into patients table
    if new_status == 'approved':
        # Check if patient already exists
        exists = conn.execute('SELECT 1 FROM patients WHERE id=?', (app['user_id'],)).fetchone()
        if not exists:
            docs = conn.execute('SELECT id FROM doctors WHERE dept=?', (app['department'],)).fetchall()
            assigned_doc = random.choice(docs)[0] if docs else None
            
            conn.execute(
                '''INSERT INTO patients
                   (id, name, age, dept, priority, status, doctor_id, complaint, password_hash)
                   VALUES (?,?,?,?,?,?,?,?,?)''',
                (app['user_id'], app['applicant_name'], app['age'], app['department'],
                 app['priority'], 'waiting', assigned_doc, app['reason'], app['password_hash'])
            )

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'status': new_status})

# ── Doctor API ────────────────────────────────────────────────────────────────

@main_bp.route('/api/doctor/patients')
@require_role('doctor')
def api_doctor_patients():
    conn = get_db()
    rows = conn.execute(
        '''SELECT * FROM patients WHERE doctor_id=?
           ORDER BY CASE priority
             WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END''',
        (session['doc_id'],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@main_bp.route('/api/doctor/schedule')
@require_role('doctor')
def api_doctor_schedule():
    conn = get_db()
    rows = conn.execute(
        '''SELECT s.*, p.priority, p.complaint, p.age, p.dept
           FROM schedules s LEFT JOIN patients p ON s.patient_id=p.id
           WHERE s.doctor_id=? ORDER BY s.slot_time''',
        (session['doc_id'],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@main_bp.route('/api/doctor/stats')
@require_role('doctor')
def api_doctor_stats():
    conn = get_db()
    doc_id = session['doc_id']
    total = conn.execute('SELECT COUNT(*) FROM patients WHERE doctor_id=?', (doc_id,)).fetchone()[0]
    waiting = conn.execute("SELECT COUNT(*) FROM patients WHERE doctor_id=? AND status='waiting'", (doc_id,)).fetchone()[0]
    done = conn.execute("SELECT COUNT(*) FROM patients WHERE doctor_id=? AND status='done'", (doc_id,)).fetchone()[0]
    critical = conn.execute("SELECT COUNT(*) FROM patients WHERE doctor_id=? AND priority='critical'", (doc_id,)).fetchone()[0]
    avg_wait_row = conn.execute("SELECT AVG(wait_mins) FROM patients WHERE doctor_id=? AND status='waiting'", (doc_id,)).fetchone()[0]
    conn.close()
    return jsonify({
        'total_patients': total,
        'waiting': waiting,
        'done': done,
        'active_alerts': critical,
        'avg_wait_mins': round(avg_wait_row or 0),
        'utilization': random.randint(60, 95),
        'optimizations': random.randint(8, 20)
    })

# ── Patient API ───────────────────────────────────────────────────────────────

@main_bp.route('/api/patient/me')
@require_role('patient')
def api_patient_me():
    conn = get_db()
    pat = conn.execute(
        '''SELECT p.id, p.name, p.age, p.dept, p.priority, p.status,
                  p.wait_mins, p.complaint, p.predicted_duration, p.ai_score,
                  d.name as doctor_name, d.dept as doctor_dept, d.color as doctor_color
           FROM patients p LEFT JOIN doctors d ON p.doctor_id=d.id
           WHERE p.id=?''', (session['pat_id'],)
    ).fetchone()
    schedule = conn.execute(
        'SELECT * FROM schedules WHERE patient_id=? ORDER BY slot_time',
        (session['pat_id'],)
    ).fetchone()
    conn.close()
    result = dict(pat)
    result['schedule'] = dict(schedule) if schedule else None
    return jsonify(result)

# ── Bed Application ───────────────────────────────────────────────────────────

@main_bp.route('/apply', methods=['GET', 'POST'])
def apply_bed():
    if request.method == 'GET':
        return render_template('apply.html')

    name       = request.form.get('name', '').strip()
    age        = request.form.get('age', '0').strip()
    gender     = request.form.get('gender', '').strip()
    contact    = request.form.get('contact', '').strip()
    address    = request.form.get('address', '').strip()
    department = request.form.get('department', '').strip()
    bed_type   = request.form.get('bed_type', 'general').strip()
    reason     = request.form.get('reason', '').strip()
    priority   = request.form.get('priority', 'medium').strip()

    if not all([name, age, gender, contact, address, department, bed_type, reason]):
        return render_template('apply.html', error='Please fill in all required fields.')

    app_id   = 'APP-' + ''.join(random.choices(string.digits, k=6))
    user_id  = 'PAT-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#', k=10))
    p_hash   = generate_password_hash(password)
    amount   = BED_PRICES.get(bed_type, 1500)
    applied  = datetime.now().strftime('%Y-%m-%d %H:%M')

    conn = get_db()
    conn.execute(
        '''INSERT INTO bed_applications
           (id, applicant_name, age, gender, contact, address, department, bed_type,
            reason, priority, status, payment_status, payment_amount,
            user_id, password_plain, password_hash, applied_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,'pending','pending',?,?,?,?,?)''',
        (app_id, name, int(age), gender, contact, address, department,
         bed_type, reason, priority, amount, user_id, password, p_hash, applied)
    )
    conn.commit()
    conn.close()

    return render_template('apply.html', success={
        'app_id':   app_id,
        'user_id':  user_id,
        'password': password,
        'name':     name,
        'bed_type': bed_type.title(),
        'dept':     department,
        'amount':   amount,
        'priority': priority,
        'applied':  applied,
    })


@main_bp.route('/application-status')
def application_status():
    app_id = request.args.get('id', '').strip().upper()
    result = None
    error  = None
    if app_id:
        conn = get_db()
        row = conn.execute(
            'SELECT * FROM bed_applications WHERE id=?', (app_id,)
        ).fetchone()
        conn.close()
        if row:
            result = dict(row)
        else:
            error = f'No application found with ID "{app_id}".'
    return render_template('apply.html', lookup=result, lookup_error=error, lookup_id=app_id)
