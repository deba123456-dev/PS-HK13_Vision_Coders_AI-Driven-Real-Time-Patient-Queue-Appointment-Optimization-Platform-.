/* =============================================
   MEDIFLOW AI — Admin Dashboard JS
   Fetches from /api/admin/* endpoints
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
    queue: { nav: 'navQueue', panel: 'panelQueue' },
    applications: { nav: 'navApplications', panel: 'panelApplications' },
    doctors: { nav: 'navDoctors', panel: 'panelDoctors' },
    ai: { nav: 'navAI', panel: 'panelAI' },
    simulation: { nav: 'navSim', panel: 'panelSimulation' },
    flow: { nav: 'navFlow', panel: 'panelFlow' }
};
const pageTitles = {
    overview: ['Live Overview', 'Full hospital view — All departments'],
    queue: ['All Patients', 'Every patient across all departments'],
    applications: ['Bed Applications', 'Review and approve incoming patient bed requests'],
    doctors: ['Doctor Workload', 'Real-time utilisation and scheduling'],
    ai: ['AI Decision Engine', 'Explainable AI & Reinforcement Learning'],
    simulation: ['What-If Simulator', 'Model staffing scenarios and predict outcomes'],
    flow: ['Patient Flow Graph', 'Graph-based queue and department network']
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
    if (id === 'queue') loadAllPatients();
    if (id === 'applications') loadApplications();
    if (id === 'doctors') loadDoctors();
    if (id === 'flow') renderFlowGraph();
    if (id === 'ai') setTimeout(renderXAI, 50);
}

document.getElementById('menuToggle').addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open'));

// ── Helpers ───────────────────────────────────
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rndFloat(a, b, d = 2) { return parseFloat((Math.random() * (b - a) + a).toFixed(d)); }
function rndFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function initials(name) { return name.split(' ').filter(p => p[0] === p[0].toUpperCase()).slice(0, 2).map(p => p[0]).join(''); }

// ── KPIs via API ──────────────────────────────
async function loadStats() {
    try {
        const data = await fetch('/api/admin/stats').then(r => r.json());
        animateValue(document.getElementById('kpiPatients'), data.total_patients);
        animateValue(document.getElementById('kpiWait'), data.avg_wait_mins, '<small>min</small>');
        animateValue(document.getElementById('kpiOpt'), data.optimizations);
        animateValue(document.getElementById('kpiUtil'), data.utilization, '<small>%</small>');
        animateValue(document.getElementById('kpiAlerts'), data.active_alerts);
        animateValue(document.getElementById('kpiDone'), data.done);
        document.getElementById('alertCount').textContent = data.active_alerts;
    } catch (e) { console.error('Stats error', e); }
}

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

// ── All Patients Table ─────────────────────────
let allPatients = [];

async function loadAllPatients() {
    try {
        allPatients = await fetch('/api/admin/patients').then(r => r.json());
        renderPatientTable();
    } catch (e) { console.error('Patients error', e); }
}

const DEPT_NAMES = { ER: 'Emergency', CARD: 'Cardiology', ORT: 'Orthopedics', GEN: 'General', PED: 'Pediatrics' };

function scoreColor(score) {
    if (score > 0.75) return '#EF4444';
    if (score > 0.5) return '#F59E0B';
    return '#10B981';
}

function renderPatientTable() {
    const search = (document.getElementById('searchPatient')?.value || '').toLowerCase();
    const dept = document.getElementById('filterDept')?.value || '';
    const priority = document.getElementById('filterPriority')?.value || '';

    let filtered = allPatients.filter(p => {
        if (dept && p.dept !== dept) return false;
        if (priority && p.priority !== priority) return false;
        if (search && !p.name.toLowerCase().includes(search) && !p.id.includes(search)) return false;
        return true;
    });

    const tbody = document.getElementById('patientTableBody');
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No patients match filters</td></tr>`;
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
          <td style="font-size:13px">${p.doctor_name || '—'}</td>
          <td style="font-size:13px">${DEPT_NAMES[p.dept] || p.dept}</td>
          <td><span class="priority-badge ${p.priority}">${p.priority}</span></td>
          <td>${p.status === 'done' ? '—' : p.wait_mins + ' min'}</td>
          <td><div class="ai-score-bar">
            <div class="score-track"><div class="score-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="score-label" style="color:${color}">${pct}</span>
          </div></td>
          <td><span class="status-badge ${p.status}">${p.status === 'in-progress' ? 'In Progress' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
        </tr>`;
    }).join('');
}

document.getElementById('searchPatient')?.addEventListener('input', renderPatientTable);
document.getElementById('filterDept')?.addEventListener('change', renderPatientTable);
document.getElementById('filterPriority')?.addEventListener('change', renderPatientTable);

// ── Bed Applications Table ─────────────────────
let allApplications = [];

async function loadApplications() {
    try {
        allApplications = await fetch('/api/admin/bed_applications').then(r => r.json());
        renderApplicationsTable();
    } catch (e) { console.error('Applications error', e); }
}

function renderApplicationsTable() {
    const search = (document.getElementById('searchApplication')?.value || '').toLowerCase();
    const statusFilt = document.getElementById('filterAppStatus')?.value || '';

    let filtered = allApplications.filter(a => {
        if (statusFilt && a.status !== statusFilt) return false;
        if (search && !a.applicant_name.toLowerCase().includes(search) && !a.id.toLowerCase().includes(search)) return false;
        return true;
    });

    const tbody = document.getElementById('applicationsTableBody');
    if (!tbody) return;
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No applications match filters</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(a => {
        const actionHtml = a.status === 'pending' ?
            `<button class="btn-primary" style="padding:4px 10px;font-size:11px;margin-right:4px;" onclick="updateAppStatus('${a.id}', 'approved')">Accept</button>
             <button class="btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="updateAppStatus('${a.id}', 'rejected')">Reject</button>` :
            `<span class="status-badge ${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>`;

        return `<tr>
          <td><div class="patient-name-cell">
            <div class="patient-avatar" style="background:linear-gradient(135deg,#0EA5E9,#0369A1)">${initials(a.applicant_name)}</div>
            <div>
              <div class="patient-name">${a.applicant_name}</div>
              <div class="patient-age" style="font-size:11px;">ID: ${a.id}</div>
            </div>
          </div></td>
          <td style="font-size:13px">${a.contact}</td>
          <td style="font-size:13px">${DEPT_NAMES[a.department] || a.department}</td>
          <td style="font-size:13px;text-transform:capitalize;">${a.bed_type}</td>
          <td><span class="priority-badge ${a.priority}">${a.priority}</span></td>
          <td style="font-size:12px;color:var(--text-muted);">${a.applied_at}</td>
          <td><span class="status-badge ${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span></td>
          <td>${actionHtml}</td>
        </tr>`;
    }).join('');
}

window.updateAppStatus = async function (id, status) {
    if (!confirm(`Are you sure you want to mark this application as ${status}?`)) return;
    try {
        const res = await fetch(`/api/admin/bed_applications/${id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            loadApplications(); // refresh the list
        } else {
            console.error('Failed to update status');
        }
    } catch (e) {
        console.error('API Error', e);
    }
};

document.getElementById('searchApplication')?.addEventListener('input', renderApplicationsTable);
document.getElementById('filterAppStatus')?.addEventListener('change', renderApplicationsTable);


// ── Doctors Grid ──────────────────────────────
async function loadDoctors() {
    try {
        const doctors = await fetch('/api/admin/doctors').then(r => r.json());
        const grid = document.getElementById('doctorsGrid');
        grid.innerHTML = doctors.map(d => {
            const barColor = d.utilization > 90 ? '#EF4444' : d.utilization > 75 ? '#F59E0B' : '#10B981';
            const statusKey = d.utilization > 85 ? 'busy' : d.utilization > 50 ? 'available' : 'break';
            return `<div class="doctor-card" >
              <div class="doctor-header">
                <div class="doctor-avatar" style="background:${d.color}22;color:${d.color}">${initials(d.name)}</div>
                <div><div class="doctor-name">${d.name}</div><div class="doctor-dept">${d.dept}</div></div>
              </div>
              <div class="doctor-stats">
                <div class="doc-stat"><div class="doc-stat-val" style="color:${d.color}">${d.waiting_count}</div><div class="doc-stat-lbl">Waiting</div></div>
                <div class="doc-stat"><div class="doc-stat-val" style="color:#10B981">${d.done_count}</div><div class="doc-stat-lbl">Done</div></div>
                <div class="doc-stat"><div class="doc-stat-val" style="color:#F59E0B">${d.patient_count}</div><div class="doc-stat-lbl">Total</div></div>
              </div>
              <div class="util-bar-wrap">
                <div class="util-bar-label"><span>Utilization</span><span style="color:${barColor}">${d.utilization}%</span></div>
                <div class="util-bar-track"><div class="util-bar-fill" style="width:${d.utilization}%;background:${barColor}"></div></div>
              </div>
              <span class="status-chip ${statusKey}">● ${statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}</span>
            </div> `;
        }).join('');

        // Build workload chart
        if (window.workloadChart) window.workloadChart.destroy();
        const ctx = document.getElementById('workloadChart')?.getContext('2d');
        if (ctx) {
            window.workloadChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: doctors.map(d => d.name.split(' ')[1]),
                    datasets: [{
                        label: 'Utilization %',
                        data: doctors.map(d => d.utilization),
                        backgroundColor: doctors.map(d => d.utilization > 90 ? 'rgba(239,68,68,0.7)' : d.utilization > 75 ? 'rgba(245,158,11,0.7)' : 'rgba(16,185,129,0.7)'),
                        borderColor: doctors.map(d => d.utilization > 90 ? '#EF4444' : d.utilization > 75 ? '#F59E0B' : '#10B981'),
                        borderWidth: 2, borderRadius: 6
                    }]
                },
                options: { ...chartDefaults('%'), plugins: { legend: { display: false }, tooltip: tooltipStyle() } }
            });
        }
    } catch (e) { console.error('Doctors error', e); }
}

// ── Charts helpers ─────────────────────────────
function chartDefaults(yLabel) {
    return {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#7BA3C8', font: { size: 11, family: 'Inter' }, boxWidth: 12 } }, tooltip: tooltipStyle() },
        scales: {
            x: { ticks: { color: '#4A6080', font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'transparent' } },
            y: { ticks: { color: '#4A6080', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'transparent' } }
        }
    };
}
function tooltipStyle() {
    return {
        backgroundColor: '#0F1E35', borderColor: 'rgba(14,165,233,0.2)', borderWidth: 1,
        titleColor: '#E2F0FF', bodyColor: '#7BA3C8', padding: 12,
        titleFont: { family: 'Outfit', weight: '700', size: 13 }, bodyFont: { family: 'Inter', size: 12 }
    };
}

// ── Queue Chart ───────────────────────────────
function buildQueueChart() {
    const ctx = document.getElementById('queueChart')?.getContext('2d');
    if (!ctx) return;
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data = labels.map((_, i) => i < 6 ? rnd(1, 5) : i < 10 ? rnd(10, 25) : i < 14 ? rnd(28, 45) : i < 18 ? rnd(20, 38) : rnd(8, 18));
    window.queueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Queue Volume', data, borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.08)', borderWidth: 2.5, pointRadius: 0, fill: true, tension: 0.45 },
                { label: 'AI Optimized', data: data.map(v => Math.max(1, v - rnd(3, 8))), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.05)', borderWidth: 2, borderDash: [6, 3], pointRadius: 0, fill: true, tension: 0.45 }
            ]
        },
        options: chartDefaults('Volume')
    });
}

function buildDeptChart() {
    const ctx = document.getElementById('deptChart')?.getContext('2d');
    if (!ctx) return;
    window.deptChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Emergency', 'Cardiology', 'Orthopedics', 'General', 'Pediatrics'],
            datasets: [{
                data: [rnd(12, 20), rnd(8, 15), rnd(6, 12), rnd(10, 18), rnd(4, 10)],
                backgroundColor: ['#EF4444', '#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6'],
                borderWidth: 2, borderColor: '#0F1E35', hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            plugins: { legend: { position: 'bottom', labels: { color: '#7BA3C8', font: { size: 11, family: 'Inter' }, padding: 12, boxWidth: 10, boxHeight: 10 } }, tooltip: tooltipStyle() }
        }
    });
}

// ── Alerts ────────────────────────────────────
const ALERT_TEMPLATES = [
    { type: 'critical', emoji: '🚨', title: 'Patient {name} overdue by {n} mins', desc: 'Critical priority — immediate reassignment recommended' },
    { type: 'warning', emoji: '⚠️', title: 'ER queue at {n}% capacity', desc: 'AI suggests offloading 3 patients to General ward' },
    { type: 'info', emoji: '🤖', title: 'AI Optimisation applied', desc: 'Slot shifted by 12 mins — reduces total wait by 18%' },
    { type: 'success', emoji: '✅', title: 'Queue bottleneck resolved', desc: 'Cardiology throughput normalised after rebalancing' }
];
let alertsData = [];

function generateAlert() {
    const tmpl = rndFrom(ALERT_TEMPLATES);
    return {
        type: tmpl.type, emoji: tmpl.emoji,
        title: tmpl.title.replace('{name}', 'Arjun Sharma').replace('{n}', rnd(5, 45)),
        desc: tmpl.desc, time: 'Just now'
    };
}

function renderAlerts() {
    const list = document.getElementById('alertsList'); if (!list) return;
    list.innerHTML = alertsData.slice(0, 6).map(a =>
        `<div class="alert-item ${a.type}" ><span class="alert-emoji">${a.emoji}</span><div class="alert-content"><div class="alert-title">${a.title}</div><div class="alert-desc">${a.desc}</div><div class="alert-time">${a.time}</div></div></div> `
    ).join('') || '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px">No active alerts</div>';
}

for (let i = 0; i < 5; i++) alertsData.push(generateAlert());
renderAlerts();
setInterval(() => { alertsData.unshift(generateAlert()); if (alertsData.length > 10) alertsData.pop(); renderAlerts(); }, 8000);
document.getElementById('clearAlerts')?.addEventListener('click', () => { alertsData = []; renderAlerts(); });

// ── Predictions ───────────────────────────────
function renderPredictions() {
    const preds = [
        { icon: '📈', title: 'Queue surge in 45 mins', detail: 'ER expected +34% arrivals (shift change)', conf: '91%' },
        { icon: '⏱', title: 'Cardiology bottleneck', detail: 'Dr. Krishnan avg +8 min over schedule', conf: '87%' },
        { icon: '🛏', title: 'Bed shortage risk', detail: 'ORT ward at 94% capacity', conf: '78%' },
        { icon: '🚶', title: 'No-show prediction', detail: '4 patients with >65% no-show probability', conf: '83%' }
    ];
    document.getElementById('predictionsList').innerHTML = preds.map(p =>
        `<div class="prediction-item" ><span class="pred-icon">${p.icon}</span><div class="pred-body"><div class="pred-title">${p.title}</div><div class="pred-detail">${p.detail}</div></div><span class="pred-confidence">${p.conf}</span></div> `
    ).join('');
}
renderPredictions();

// ── XAI Panel ─────────────────────────────────
let xaiDecisions = [], rlEpisodes = 0, rlTotalReward = 0, rlActions = 0;

function addXAIDecision(d) {
    xaiDecisions.unshift(d); if (xaiDecisions.length > 8) xaiDecisions.pop();
    rlEpisodes += rnd(10, 30); rlTotalReward = rndFloat(0.72, 0.95); rlActions++;
}

function renderXAI() {
    document.getElementById('rlEpisodes').textContent = rlEpisodes.toLocaleString();
    document.getElementById('rlReward').textContent = rlTotalReward.toFixed(2);
    document.getElementById('rlActions').textContent = rlActions;
    document.getElementById('xaiDecisionsList').innerHTML = xaiDecisions.map(d =>
        `<div class="xai-decision-card" >
          <div class="xai-decision-header">
            <span class="xai-type-badge ${d.type}">${d.type}</span>
            <span class="xai-decision-title">${d.title}</span>
            <span class="xai-confidence">Confidence: ${d.confidence}%</span>
          </div>
          <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">${d.desc}</p>
          <div class="xai-factors"><div class="xai-factors-title">Decision Factors</div><div class="factor-bars">
            ${d.factors.map(f => `<div class="factor-bar"><span class="factor-name">${f.name}</span><div class="factor-track"><div class="factor-fill" style="width:${f.pct}%"></div></div><span class="factor-pct">${f.pct}%</span></div>`).join('')}
          </div></div>
        </div> `
    ).join('');
    renderFeatureImportance();
}

function renderFeatureImportance() {
    const features = [
        { name: 'Patient Priority Score', pct: 24, color: '#EF4444' }, { name: 'Wait Time (current)', pct: 19, color: '#F59E0B' },
        { name: 'Doctor Utilisation', pct: 16, color: '#0EA5E9' }, { name: 'Predicted Duration (ML)', pct: 14, color: '#8B5CF6' },
        { name: 'Department Queue Depth', pct: 12, color: '#10B981' }, { name: 'Historical No-Show Rate', pct: 9, color: '#06B6D4' },
        { name: 'Time of Day', pct: 6, color: '#F472B6' }
    ];
    document.getElementById('featureImportance').innerHTML = features.map(f =>
        `<div class="fi-item" ><span class="fi-name">${f.name}</span><div class="fi-track"><div class="fi-fill" style="width:${f.pct * 4}%;background:${f.color}"></div></div><span class="fi-pct" style="color:${f.color}">${f.pct}%</span></div> `).join('');
}

const seedDec = [
    { type: 'escalate', title: 'Patient Arjun Sharma flagged critical', desc: 'Chest pain + wait >40 mins.', factors: [{ name: 'Symptom Severity', pct: 95 }, { name: 'Wait Time Delta', pct: 88 }, { name: 'Priority Score', pct: 91 }, { name: 'Historical Patterns', pct: 72 }], confidence: 96 },
    { type: 'reassign', title: 'Cardiology queue rebalanced', desc: 'Dr. Krishnan overloaded — 3 rerouted.', factors: [{ name: 'Doctor Utilisation', pct: 92 }, { name: 'Queue Depth', pct: 78 }, { name: 'Wait Time Impact', pct: 85 }, { name: 'Patient Consent', pct: 60 }], confidence: 89 }
];
seedDec.forEach(d => addXAIDecision(d)); renderXAI();
setInterval(() => {
    const types = ['reassign', 'prioritize', 'escalate', 'defer'];
    addXAIDecision({
        type: rndFrom(types), title: `AI action taken — queue optimised`, desc: 'Based on real-time queue state.',
        factors: [{ name: 'Queue Priority', pct: rnd(55, 98) }, { name: 'Wait Time Delta', pct: rnd(45, 90) }, { name: 'Doctor Availability', pct: rnd(40, 85) }, { name: 'Historical Baseline', pct: rnd(35, 75) }], confidence: rnd(78, 97)
    });
    renderXAI();
}, 12000);

// ── Simulator ─────────────────────────────────
const simInputs = { simDoctors: 'simDoctorVal', simArrivals: 'simArrivalVal', simEmergency: 'simEmergencyVal', simNoShow: 'simNoShowVal', simDuration: 'simDurationVal' };
Object.entries(simInputs).forEach(([id, lbl]) => {
    const inp = document.getElementById(id), lab = document.getElementById(lbl);
    inp?.addEventListener('input', () => { if (lab) lab.textContent = inp.value; });
});

function runSimulation() {
    const d = +document.getElementById('simDoctors').value, a = +document.getElementById('simArrivals').value;
    const em = +document.getElementById('simEmergency').value, ns = +document.getElementById('simNoShow').value;
    const dur = +document.getElementById('simDuration').value;
    const exp = document.getElementById('simExperience').value;
    const ef = exp === 'senior' ? 0.85 : exp === 'junior' ? 1.2 : 1.0;
    const effA = a * (1 - ns / 100) * (1 + em / 100);
    const cap = d * (60 / (dur * ef));
    const util = Math.min(99, Math.round((effA / cap) * 100));
    const wait = Math.max(2, Math.round((effA / Math.max(1, d)) * dur * ef * 0.3));
    const overflow = util > 85 ? `High` : util > 65 ? `Medium` : `Low`;
    const eff = Math.round(100 - (Math.abs(util - 75) * 0.5 + Math.abs(wait - 20) * 0.3));
    document.getElementById('simWaitResult').textContent = `${wait} min`;
    document.getElementById('simUtilResult').textContent = `${util}% `;
    document.getElementById('simOverflowResult').textContent = overflow;
    document.getElementById('simEfficiencyResult').textContent = `${Math.max(0, Math.min(100, eff))}% `;
    const sd = (id, delta, unit = '', inv = false) => { const el = document.getElementById(id); const b = inv ? delta < 0 : delta > 0; el.textContent = `${delta > 0 ? '▲ +' : '▼ '}${Math.abs(delta).toFixed(0)}${unit} vs baseline`; el.className = `sim-result-change ${b ? 'better' : 'worse'}`; };
    sd('simWaitChange', wait - 22, ' min', true); sd('simUtilChange', util - 75, '%');
    document.getElementById('simOverflowChange').textContent = util > 85 ? `⚠ Critical` : `✓ Manageable`;
    document.getElementById('simOverflowChange').className = `sim-result-change ${util > 85 ? 'worse' : 'better'}`;
    sd('simEfficiencyChange', eff - 80, '%');
    buildSimChart(d, a, dur); document.getElementById('simBadge').textContent = `Simulated`; document.getElementById('simRecommendations').style.display = 'block';
    const recs = [];
    if (util > 85) recs.push({ icon: '🚨', text: `<strong > Add ${Math.ceil((a * 0.3) / 3)} more doctors</strong> — load exceeds capacity by ${util - 85}% ` });
    if (wait > 30) recs.push({ icon: '⏱', text: `<strong > Reduce consultation duration</strong> by 20 % — cut wait from ${wait} to ~${Math.round(wait * 0.75)} mins` });
    recs.push({ icon: '🤖', text: `<strong > AI recommends:</strong> Schedule 2 extra staff from 10:00 — offset predicted surge` });
    document.getElementById('simRecsContent').innerHTML = recs.map(r => `<div class="sim-rec" ><span class="sim-rec-icon">${r.icon}</span><div class="sim-rec-text">${r.text}</div></div> `).join('');
}

function buildSimChart(doctors, arrivals, duration) {
    const ctx = document.getElementById('simChart')?.getContext('2d'); if (!ctx) return;
    if (window.simChart) window.simChart.destroy();
    const hours = Array.from({ length: 12 }, (_, i) => `${7 + i}:00`);
    const base = hours.map((_, i) => Math.max(0, Math.round(arrivals * (0.5 + Math.sin(i * 0.7) * 0.4) - doctors * 2)));
    window.simChart = new Chart(ctx, {
        type: 'bar', data: {
            labels: hours, datasets: [
                { label: 'Projected Queue', data: base, backgroundColor: 'rgba(245,158,11,0.5)', borderColor: '#F59E0B', borderWidth: 2, borderRadius: 5 },
                { label: 'AI Optimised', data: base.map(v => Math.max(0, v - Math.floor(doctors * 0.8))), backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10B981', borderWidth: 2, borderRadius: 5 }
            ]
        }, options: { ...chartDefaults('Queue Size'), plugins: { legend: { labels: { color: '#7BA3C8', font: { size: 11, family: 'Inter' }, boxWidth: 12 } }, tooltip: tooltipStyle() } }
    });
}

document.getElementById('runSimulation')?.addEventListener('click', runSimulation);
document.getElementById('resetSimulation')?.addEventListener('click', () => {
    ['simDoctors', 'simArrivals', 'simEmergency', 'simNoShow', 'simDuration'].forEach(id => { const d = { simDoctors: 8, simArrivals: 15, simEmergency: 10, simNoShow: 15, simDuration: 20 }; document.getElementById(id).value = d[id]; });
    ['simDoctorVal', 'simArrivalVal', 'simEmergencyVal', 'simNoShowVal', 'simDurationVal'].forEach((id, i) => { const v = [8, 15, 10, 15, 20]; document.getElementById(id).textContent = v[i]; });
    runSimulation();
});

// ── Flow Graph ────────────────────────────────
const NODE_W = 96, NODE_H = 40;
const FLOW_NODES = [
    { id: 'reception', label: 'Reception', x: 20, y: 210, color: '#0EA5E9', count: 8 },
    { id: 'triage', label: 'Triage', x: 170, y: 210, color: '#06B6D4', count: 12 },
    { id: 'er', label: 'Emergency', x: 340, y: 60, color: '#EF4444', count: 7 },
    { id: 'card', label: 'Cardiology', x: 340, y: 180, color: '#8B5CF6', count: 5 },
    { id: 'gen', label: 'General', x: 340, y: 300, color: '#10B981', count: 9 },
    { id: 'ort', label: 'Orthopedics', x: 340, y: 390, color: '#F59E0B', count: 4 },
    { id: 'lab', label: 'Lab/Imaging', x: 510, y: 120, color: '#F472B6', count: 11 },
    { id: 'ward', label: 'Ward/Admit', x: 670, y: 160, color: '#FB7185', count: 3 },
    { id: 'discharge', label: 'Discharge', x: 820, y: 260, color: '#34D399', count: 14 }
];
const FLOW_EDGES = [
    { from: 'reception', to: 'triage', flow: 20 }, { from: 'triage', to: 'er', flow: 7 }, { from: 'triage', to: 'card', flow: 5 },
    { from: 'triage', to: 'gen', flow: 9 }, { from: 'triage', to: 'ort', flow: 4 }, { from: 'er', to: 'lab', flow: 5 },
    { from: 'card', to: 'lab', flow: 3 }, { from: 'gen', to: 'lab', flow: 4 }, { from: 'lab', to: 'ward', flow: 4 },
    { from: 'er', to: 'ward', flow: 3 }, { from: 'ward', to: 'discharge', flow: 5 }, { from: 'gen', to: 'discharge', flow: 6 }, { from: 'ort', to: 'discharge', flow: 3 }
];

function renderFlowGraph() {
    const svg = document.getElementById('flowSvg'); if (!svg) return;
    svg.setAttribute('viewBox', '0 0 960 460');
    const nodeMap = {}; FLOW_NODES.forEach(n => { nodeMap[n.id] = n; });
    let defs = '<defs>';
    FLOW_NODES.forEach(n => { defs += `<marker id = "arr-${n.id}" markerWidth = "8" markerHeight = "8" refX = "6" refY = "3" orient = "auto" > <path d="M0,0 L0,6 L8,3 z" fill="${n.color}" opacity="0.7" /></marker> `; });
    defs += '</defs>';
    let edges = '';
    FLOW_EDGES.forEach(e => {
        const s = nodeMap[e.from], t = nodeMap[e.to]; if (!s || !t) return;
        const sw = Math.max(1.5, Math.min(5, e.flow * 0.45));
        const x1 = s.x + NODE_W, y1 = s.y + NODE_H / 2, x2 = t.x, y2 = t.y + NODE_H / 2, cx = (x1 + x2) / 2;
        edges += `<path d = "M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}" fill = "none" stroke = "${s.color}" stroke - width="${sw}" stroke - opacity="0.5" stroke - dasharray="8 4" marker - end="url(#arr-${s.id})" class="flow-link" > <animate attributeName="stroke-dashoffset" values="12;0" dur="${(1.2 + e.flow * 0.05).toFixed(1)}s" repeatCount="indefinite" /></path> `;
    });
    let nodes = '';
    FLOW_NODES.forEach(n => {
        nodes += `<g class="flow-node" transform = "translate(${n.x},${n.y})" ><rect width="${NODE_W}" height="${NODE_H}" rx="10" fill="${n.color}20" stroke="${n.color}" stroke-width="1.8"/><text x="${NODE_W / 2}" y="14" text-anchor="middle" fill="${n.color}" font-size="10" font-family="Outfit" font-weight="700">${n.label}</text><text x="${NODE_W / 2}" y="28" text-anchor="middle" fill="#B0C8E0" font-size="9" font-family="Inter">${n.count} patients</text></g> `;
    });
    svg.innerHTML = defs + edges + nodes;
    const total = FLOW_NODES.reduce((a, n) => a + n.count, 0);
    document.getElementById('flowStats').innerHTML = [
        { label: 'Total in System', val: total, col: '#0EA5E9' }, { label: 'Throughput/hr', val: rnd(18, 26), col: '#10B981' },
        { label: 'Avg Dwell Time', val: `${rnd(42, 68)} min`, col: '#F59E0B' }, { label: 'Bottleneck Index', val: rndFloat(0.3, 0.7), col: '#EF4444' }
    ].map(s => `<div class="flow-stat-item" ><span class="flow-stat-label">${s.label}</span><span class="flow-stat-val" style="color:${s.col}">${s.val}</span></div> `).join('');
    document.getElementById('bottleneckList').innerHTML = [
        { dept: 'Emergency Room', desc: 'Avg wait 38 min — high accumulation', severity: 'high' },
        { dept: 'Lab / Imaging', desc: 'Results delayed 22 min', severity: 'medium' },
        { dept: 'Cardiology', desc: 'Single doctor bottleneck — 94% utilisation', severity: 'high' }
    ].map(b => `<div class="bottleneck-item" ><div class="bottleneck-dept">${b.dept}</div><div class="bottleneck-desc">${b.desc}</div><span class="bottleneck-severity ${b.severity}">${b.severity} severity</span></div> `).join('');
}

// ── Particles ──────────────────────────────────
(function createParticles() {
    const bg = document.createElement('div'); bg.className = `particles-bg`;
    for (let i = 0; i < 20; i++) { const p = document.createElement('div'); p.className = `particle`; p.style.cssText = `left:${Math.random() * 100}%; animation-duration:${rnd(8, 20)}s; animation-delay:${rnd(0, 15)}s; --drift:${rnd(-60, 60)}px; `; bg.appendChild(p); }
    document.body.prepend(bg);
})();

// ── Real-time refresh ─────────────────────────
setInterval(() => {
    if (window.queueChart) { const ds = window.queueChart.data.datasets[0]; ds.data.shift(); ds.data.push(rnd(5, 40)); window.queueChart.data.datasets[1].data.shift(); window.queueChart.data.datasets[1].data.push(rnd(3, 35)); window.queueChart.update('none'); }
}, 5000);

// ── Init ──────────────────────────────────────
buildQueueChart();
buildDeptChart();
loadStats();
setTimeout(runSimulation, 500);
setInterval(loadStats, 30000);

document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
console.log('%cMediFlow AI Admin Dashboard initialized ✓', 'color:#0EA5E9;font-size:14px;font-weight:bold;');
