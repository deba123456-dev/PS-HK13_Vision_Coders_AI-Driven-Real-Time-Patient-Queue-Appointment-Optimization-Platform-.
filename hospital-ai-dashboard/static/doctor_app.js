+/* =============================================
   MEDIFLOW AI — Doctor Dashboard JS
   Fetches from /api/doctor/* endpoints
   ============================================= */
'use strict';

// ── Clock ─────────────────────────────────────
function updateClock() {
    const el = document.getElementById('liveClock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000); updateClock();

// ── Navigation ────────────────────────────────
const PANEL_MAP = {
    overview: { nav: 'navOverview', panel: 'panelOverview' },
    schedule: { nav: 'navSchedule', panel: 'panelSchedule' },
    queue: { nav: 'navQueue', panel: 'panelQueue' },
    ai: { nav: 'navAI', panel: 'panelAI' }
};
const pageTitles = {
    overview: ['My Overview', DOCTOR.dept + ' Department'],
    schedule: ['My Schedule', 'Today\'s appointments and slots'],
    queue: ['My Patients', 'Patients currently assigned to me'],
    ai: ['AI Decisions', 'AI-powered actions for my patients']
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); switchPanel(item.dataset.panel); });
});

function switchPanel(id) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const map = PANEL_MAP[id]; if (!map) return;
    document.getElementById(map.nav)?.classList.add('active');
    document.getElementById(map.panel)?.classList.add('active');
    const t = pageTitles[id] || ['Dashboard', ''];
    document.getElementById('pageTitle').textContent = t[0];
    document.getElementById('pageSubtitle').textContent = t[1];
    if (id === 'queue') loadMyPatients();
    if (id === 'schedule') loadMySchedule();
    if (id === 'ai') setTimeout(renderXAI, 50);
}

document.getElementById('menuToggle')?.addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open'));

// ── Helpers ───────────────────────────────────
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rndFloat(a, b, d = 2) { return parseFloat((Math.random() * (b - a) + a).toFixed(d)); }
function rndFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function initials(name) { return name.split(' ').filter(p => p[0] === p[0].toUpperCase()).slice(0, 2).map(p => p[0]).join(''); }

function animateValue(el, target, suffix = '', dur = 1200) {
    if (!el) return;
    let start = 0;
    const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.innerHTML = Math.floor(e * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function scoreColor(score) {
    if (score > 0.75) return '#EF4444';
    if (score > 0.5) return '#F59E0B';
    return '#10B981';
}

const DEPT_NAMES = { ER: 'Emergency', CARD: 'Cardiology', ORT: 'Orthopedics', GEN: 'General', PED: 'Pediatrics' };

// ── Load Stats ────────────────────────────────
async function loadStats() {
    try {
        const data = await fetch('/api/doctor/stats').then(r => r.json());
        animateValue(document.getElementById('kpiPatients'), data.total_patients);
        animateValue(document.getElementById('kpiWait'), data.avg_wait_mins, '<small>min</small>');
        animateValue(document.getElementById('kpiUtil'), data.utilization, '<small>%</small>');
        animateValue(document.getElementById('kpiAlerts'), data.active_alerts);
        animateValue(document.getElementById('kpiDone'), data.done);
        document.getElementById('alertCount').textContent = data.active_alerts;
    } catch (e) { console.error('Stats error', e); }
}

// ── Load My Patients ──────────────────────────
let myPatients = [];

async function loadMyPatients() {
    try {
        myPatients = await fetch('/api/doctor/patients').then(r => r.json());
        renderPatientTable();
    } catch (e) { console.error('Patients error', e); }
}

function renderPatientTable() {
    const search = (document.getElementById('searchPatient')?.value || '').toLowerCase();
    const priority = document.getElementById('filterPriority')?.value || '';
    let filtered = myPatients.filter(p => {
        if (priority && p.priority !== priority) return false;
        if (search && !p.name.toLowerCase().includes(search) && !p.id.includes(search)) return false;
        return true;
    });

    const tbody = document.getElementById('patientTableBody');
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No patients match</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(p => {
        const color = scoreColor(p.ai_score);
        const pct = Math.round(p.ai_score * 100);
        return `<tr>
          <td><div class="patient-name-cell">
            <div class="patient-avatar" style="background:linear-gradient(135deg,${color},${color}88)">${initials(p.name)}</div>
            <div><div class="patient-name">${p.name}</div><div class="patient-age">Age ${p.age}</div></div>
          </div></td>
          <td style="color:var(--text-muted);font-size:12px">${p.id}</td>
          <td><span class="priority-badge ${p.priority}">${p.priority}</span></td>
          <td>${p.status === 'done' ? '—' : p.wait_mins + ' min'}</td>
          <td>~${p.predicted_duration} min</td>
          <td><div class="ai-score-bar">
            <div class="score-track"><div class="score-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="score-label" style="color:${color}">${pct}</span>
          </div></td>
          <td><span class="status-badge ${p.status}">${p.status === 'in-progress' ? 'In Progress' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
        </tr>`;
    }).join('');
}

document.getElementById('searchPatient')?.addEventListener('input', renderPatientTable);
document.getElementById('filterPriority')?.addEventListener('change', renderPatientTable);

// ── Load My Schedule ──────────────────────────
async function loadMySchedule() {
    try {
        const slots = await fetch('/api/doctor/schedule').then(r => r.json());
        renderSchedule(slots);
    } catch (e) { console.error('Schedule error', e); }
}

const STATUS_ICONS = { done: '✅', 'in-progress': '🩺', scheduled: '📅' };
const PRIORITY_COLORS = { critical: '#EF4444', high: '#F59E0B', medium: '#0EA5E9', low: '#10B981' };

function renderSchedule(slots) {
    const container = document.getElementById('scheduleTimeline');
    if (!slots || !slots.length) {
        container.innerHTML = '<p style="color:var(--text-muted);padding:20px">No schedule for today.</p>';
        return;
    }
    container.innerHTML = slots.map(s => {
        const pname = s.patient_name || 'Walk-in Patient';
        const priCol = s.priority ? PRIORITY_COLORS[s.priority] || '#7BA3C8' : '#7BA3C8';
        return `<div class="slot-item ${s.status}">
          <div class="slot-time">${s.slot_time}</div>
          <span class="slot-status ${s.status}">${STATUS_ICONS[s.status] || '📅'} ${s.status === 'in-progress' ? 'In Progress' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
          <div>
            <div class="slot-patient-name" style="color:${s.priority ? priCol : 'var(--text-primary)'}">${pname}</div>
            <div class="slot-notes">${s.notes || s.complaint || '—'}</div>
          </div>
          <div class="slot-duration">${s.duration_mins} min</div>
        </div>`;
    }).join('');
}

// ── Alerts (local simulation) ──────────────────
const ALERT_TMPLS = [
    { type: 'critical', emoji: '🚨', title: 'Critical patient waiting', desc: 'Immediate attention required' },
    { type: 'info', emoji: '🤖', title: 'AI optimised your queue', desc: 'Slot adjusted — wait reduced by 12 min' },
    { type: 'warning', emoji: '⚠️', title: 'Queue building up', desc: '3 patients waiting over 30 min' }
];
let alertsData = [];

function generateAlert() {
    const t = rndFrom(ALERT_TMPLS);
    return { ...t, time: 'Just now' };
}
for (let i = 0; i < 3; i++) alertsData.push(generateAlert());

function renderAlerts() {
    const list = document.getElementById('alertsList'); if (!list) return;
    list.innerHTML = alertsData.slice(0, 6).map(a =>
        `<div class="alert-item ${a.type}"><span class="alert-emoji">${a.emoji}</span><div class="alert-content"><div class="alert-title">${a.title}</div><div class="alert-desc">${a.desc}</div><div class="alert-time">${a.time}</div></div></div>`
    ).join('') || '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px">No active alerts</div>';
}
renderAlerts();
setInterval(() => { alertsData.unshift(generateAlert()); if (alertsData.length > 8) alertsData.pop(); renderAlerts(); }, 10000);

// ── Predictions ───────────────────────────────
function renderPredictions() {
    const preds = [
        { icon: '📈', title: 'Queue growing', detail: `${DOCTOR.dept} dept +2 incoming`, conf: '88%' },
        { icon: '⏱', title: 'Next patient ETA', detail: '~10 min from now', conf: '94%' },
        { icon: '🛏', title: 'Critical case expected', detail: 'High-priority walk-in likely', conf: '72%' }
    ];
    document.getElementById('predictionsList').innerHTML = preds.map(p =>
        `<div class="prediction-item"><span class="pred-icon">${p.icon}</span><div class="pred-body"><div class="pred-title">${p.title}</div><div class="pred-detail">${p.detail}</div></div><span class="pred-confidence">${p.conf}</span></div>`
    ).join('');
}
renderPredictions();

// ── XAI Panel ─────────────────────────────────
let xaiDecisions = [], rlEpisodes = 0, rlTotalReward = 0, rlActions = 0;

function addXAIDecision(d) { xaiDecisions.unshift(d); if (xaiDecisions.length > 6) xaiDecisions.pop(); rlEpisodes += rnd(10, 30); rlTotalReward = rndFloat(0.72, 0.95); rlActions++; }

function renderXAI() {
    document.getElementById('rlEpisodes').textContent = rlEpisodes.toLocaleString();
    document.getElementById('rlReward').textContent = rlTotalReward.toFixed(2);
    document.getElementById('rlActions').textContent = rlActions;
    document.getElementById('xaiDecisionsList').innerHTML = xaiDecisions.map(d =>
        `<div class="xai-decision-card">
          <div class="xai-decision-header">
            <span class="xai-type-badge ${d.type}">${d.type}</span>
            <span class="xai-decision-title">${d.title}</span>
            <span class="xai-confidence">Confidence: ${d.confidence}%</span>
          </div>
          <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">${d.desc}</p>
          <div class="xai-factors"><div class="xai-factors-title">Decision Factors</div><div class="factor-bars">
            ${d.factors.map(f => `<div class="factor-bar"><span class="factor-name">${f.name}</span><div class="factor-track"><div class="factor-fill" style="width:${f.pct}%"></div></div><span class="factor-pct">${f.pct}%</span></div>`).join('')}
          </div></div>
        </div>`
    ).join('') || '<p style="color:var(--text-muted);padding:20px;text-align:center">No AI decisions yet</p>';
    renderFeatureImportance();
}

function renderFeatureImportance() {
    const features = [{ name: 'Patient Priority Score', pct: 24, color: '#EF4444' }, { name: 'Wait Time', pct: 19, color: '#F59E0B' }, { name: 'Doctor Utilisation', pct: 16, color: '#0EA5E9' }, { name: 'Predicted Duration', pct: 14, color: '#8B5CF6' }, { name: 'Queue Depth', pct: 12, color: '#10B981' }];
    document.getElementById('featureImportance').innerHTML = features.map(f =>
        `<div class="fi-item"><span class="fi-name">${f.name}</span><div class="fi-track"><div class="fi-fill" style="width:${f.pct * 4}%;background:${f.color}"></div></div><span class="fi-pct" style="color:${f.color}">${f.pct}%</span></div>`).join('');
}

addXAIDecision({ type: 'escalate', title: 'Critical patient prioritised', desc: 'AI detected high urgency — slot moved up.', factors: [{ name: 'Symptom Severity', pct: 95 }, { name: 'Wait Time', pct: 88 }, { name: 'Priority Score', pct: 91 }, { name: 'Historical', pct: 72 }], confidence: 96 });
renderXAI();
setInterval(() => { addXAIDecision({ type: rndFrom(['reassign', 'prioritize', 'escalate', 'defer']), title: 'Queue slot adjusted', desc: 'AI optimised based on current load.', factors: [{ name: 'Queue Priority', pct: rnd(55, 98) }, { name: 'Wait Time', pct: rnd(45, 90) }, { name: 'Doctor Load', pct: rnd(40, 85) }, { name: 'Historical', pct: rnd(35, 75) }], confidence: rnd(78, 97) }); if (document.querySelector('#panelAI.active')) renderXAI(); }, 15000);

// ── Particles ──────────────────────────────────
(function () {
    const bg = document.createElement('div'); bg.className = 'particles-bg';
    for (let i = 0; i < 15; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.cssText = `left:${Math.random() * 100}%;animation-duration:${rnd(8, 20)}s;animation-delay:${rnd(0, 15)}s;--drift:${rnd(-60, 60)}px;`; bg.appendChild(p); }
    document.body.prepend(bg);
})();

// ── Init ──────────────────────────────────────
loadStats();
loadMySchedule();     // pre-load schedule
loadMyPatients();     // pre-load patients (for alert count)
setInterval(loadStats, 30000);
console.log('%cMediFlow AI Doctor Dashboard ready ✓', 'color:#0EA5E9;font-size:14px;font-weight:bold;');
