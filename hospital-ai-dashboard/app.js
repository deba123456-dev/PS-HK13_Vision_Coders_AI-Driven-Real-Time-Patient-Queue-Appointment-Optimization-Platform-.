/* =============================================
   MEDIFLOW AI — Hospital Dashboard App.js
   ============================================= */
'use strict';

// ======== LIVE CLOCK ========
function updateClock() {
    const el = document.getElementById('liveClock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ======== NAVIGATION ========
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.panel');
const pageTitles = {
    overview: ['Live Overview', 'Real-time patient flow optimization — Updated just now'],
    queue: ['Patient Queue', 'Manage and monitor all active patients'],
    doctors: ['Doctor Workload', 'Real-time utilization and scheduling'],
    ai: ['AI Decision Engine', 'Explainable AI & Reinforcement Learning outputs'],
    simulation: ['What-If Simulator', 'Model staffing scenarios and predict outcomes'],
    flow: ['Patient Flow Graph', 'Graph-based queue and department network']
};

const PANEL_MAP = {
    overview: { nav: 'navOverview', panel: 'panelOverview' },
    queue: { nav: 'navQueue', panel: 'panelQueue' },
    doctors: { nav: 'navDoctors', panel: 'panelDoctors' },
    ai: { nav: 'navAI', panel: 'panelAI' },
    simulation: { nav: 'navSim', panel: 'panelSimulation' },
    flow: { nav: 'navFlow', panel: 'panelFlow' }
};

function switchPanel(panelId) {
    navItems.forEach(n => n.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    const map = PANEL_MAP[panelId];
    if (!map) return;
    document.getElementById(map.nav)?.classList.add('active');
    document.getElementById(map.panel)?.classList.add('active');
    const t = pageTitles[panelId] || ['Dashboard', ''];
    document.getElementById('pageTitle').textContent = t[0];
    document.getElementById('pageSubtitle').textContent = t[1];
    if (panelId === 'flow') renderFlowGraph();
    if (panelId === 'ai') setTimeout(renderXAI, 50);
    if (panelId === 'doctors') setTimeout(() => { if (!workloadChart) buildWorkloadChart(); }, 100);
}

navItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        switchPanel(item.dataset.panel);
    });
});

// Mobile sidebar
document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ======== PATIENTS DATA ========
const DEPARTMENTS = ['ER', 'CARD', 'ORT', 'GEN', 'PED'];
const DEPT_NAMES = { ER: 'Emergency', CARD: 'Cardiology', ORT: 'Orthopedics', GEN: 'General', PED: 'Pediatrics' };
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const FIRST_NAMES = ['Arjun', 'Priya', 'Ravi', 'Sunita', 'Vikram', 'Meera', 'Rohan', 'Anjali', 'Kiran', 'Deepa', 'Suresh', 'Nisha', 'Arun', 'Pooja', 'Rahul'];
const LAST_NAMES = ['Sharma', 'Patel', 'Mehta', 'Gupta', 'Reddy', 'Nair', 'Iyer', 'Singh', 'Kumar', 'Das', 'Bose', 'Rao', 'Joshi', 'Sinha', 'Verma'];
let patientIdCounter = 1001;
let patients = [];

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function rndFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function initials(name) { return name.split(' ').map(p => p[0]).join('').toUpperCase(); }
function minsAgo(min, max) { return rnd(min, max); }

function generatePatient(overrides = {}) {
    const name = `${rndFrom(FIRST_NAMES)} ${rndFrom(LAST_NAMES)}`;
    const priority = rndFrom(PRIORITIES);
    const dept = rndFrom(DEPARTMENTS);
    return {
        id: `P${patientIdCounter++}`,
        name,
        age: rnd(5, 82),
        dept,
        priority,
        waitMins: minsAgo(2, 75),
        predictedDuration: rnd(10, 45),
        aiScore: rndFloat(0.3, 0.99),
        status: rndFrom(['waiting', 'waiting', 'waiting', 'in-progress', 'done']),
        complaint: rndFrom(['Chest pain', 'Fever & cough', 'Joint pain', 'Headache', 'Abdominal pain', 'Shortness of breath', 'Back pain', 'Nausea']),
        ...overrides
    };
}

function initPatients() {
    patients = Array.from({ length: 18 }, () => generatePatient());
}
initPatients();

// ======== KPI ANIMATION ========
function animateValue(el, target, suffix = '', duration = 1200) {
    if (!el) return;
    let start = 0;
    const step = timestamp => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.innerHTML = Math.floor(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function updateKPIs() {
    const waiting = patients.filter(p => p.status === 'waiting').length;
    const done = patients.filter(p => p.status === 'done').length;
    const avgWait = Math.round(patients.reduce((a, p) => a + p.waitMins, 0) / patients.length);
    const alerts = patients.filter(p => p.priority === 'critical').length;
    animateValue(document.getElementById('kpiPatients'), patients.length);
    animateValue(document.getElementById('kpiWait'), avgWait, '<small>min</small>');
    animateValue(document.getElementById('kpiOpt'), rnd(24, 38));
    animateValue(document.getElementById('kpiUtil'), rnd(72, 88), '<small>%</small>');
    animateValue(document.getElementById('kpiAlerts'), alerts);
    animateValue(document.getElementById('kpiDone'), done);
    document.getElementById('alertCount').textContent = alerts;
}
updateKPIs();

// ======== CHARTS ========
let queueChart, deptChart, workloadChart, simChart;

function buildQueueChart() {
    const ctx = document.getElementById('queueChart').getContext('2d');
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data = labels.map((_, i) => {
        if (i < 6) return rnd(1, 5);
        if (i < 10) return rnd(10, 25);
        if (i < 14) return rnd(28, 45);
        if (i < 18) return rnd(20, 38);
        return rnd(8, 18);
    });
    queueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Queue Volume',
                data,
                borderColor: '#0EA5E9',
                backgroundColor: 'rgba(14,165,233,0.08)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.45
            }, {
                label: 'AI Optimized',
                data: data.map(v => Math.max(1, v - rnd(3, 8))),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16,185,129,0.05)',
                borderWidth: 2,
                borderDash: [6, 3],
                pointRadius: 0,
                fill: true,
                tension: 0.45
            }]
        },
        options: chartDefaults('Volume (patients)')
    });
}

function buildDeptChart() {
    const ctx = document.getElementById('deptChart').getContext('2d');
    deptChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.values(DEPT_NAMES),
            datasets: [{
                data: [rnd(12, 20), rnd(8, 15), rnd(6, 12), rnd(10, 18), rnd(4, 10)],
                backgroundColor: ['#EF4444', '#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6'],
                borderWidth: 2,
                borderColor: '#0F1E35',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#7BA3C8', font: { size: 11, family: 'Inter' }, padding: 12, boxWidth: 10, boxHeight: 10 }
                },
                tooltip: tooltipStyle()
            }
        }
    });
}

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
        titleFont: { family: 'Outfit', weight: '700', size: 13 },
        bodyFont: { family: 'Inter', size: 12 }
    };
}

buildQueueChart();
buildDeptChart();

// ======== ALERTS FEED ========
const ALERT_TEMPLATES = [
    { type: 'critical', emoji: '🚨', title: 'Patient {name} overdue by {n} mins', desc: 'Critical priority - immediate reassignment recommended', action: 'escalate' },
    { type: 'warning', emoji: '⚠️', title: 'ER queue at {n}% capacity', desc: 'AI suggests offloading 3 patients to General ward', action: 'reassign' },
    { type: 'info', emoji: '🤖', title: 'AI Optimization applied', desc: 'Slot for {name} shifted by 12 mins — reduces total wait by 18%', action: 'info' },
    { type: 'warning', emoji: '⏱', title: 'Dr. {doc} running {n} mins late', desc: 'Re-routing queue to balance workload across department', action: 'defer' },
    { type: 'success', emoji: '✅', title: 'Queue bottleneck resolved', desc: 'Cardiology throughput normalized after slot rebalancing', action: 'info' },
    { type: 'info', emoji: '📊', title: 'Predicted surge in {n} mins', desc: 'ML model forecasts +28% arrival rate — staff alerted', action: 'info' }
];
const DOCTOR_NAMES = ['Dr. Malhotra', 'Dr. Sen', 'Dr. Krishnan', 'Dr. Patel', 'Dr. Okonkwo'];
let alertsData = [];

function generateAlert() {
    const tmpl = rndFrom(ALERT_TEMPLATES);
    const patient = rndFrom(patients);
    return {
        type: tmpl.type,
        emoji: tmpl.emoji,
        title: tmpl.title.replace('{name}', patient.name).replace('{n}', rnd(5, 45)).replace('{doc}', rndFrom(DOCTOR_NAMES)),
        desc: tmpl.desc.replace('{name}', patient.name),
        time: 'Just now'
    };
}

function renderAlerts() {
    const list = document.getElementById('alertsList');
    const frag = document.createDocumentFragment();
    alertsData.slice(0, 6).forEach(a => {
        const el = document.createElement('div');
        el.className = `alert-item ${a.type}`;
        el.innerHTML = `<span class="alert-emoji">${a.emoji}</span><div class="alert-content"><div class="alert-title">${a.title}</div><div class="alert-desc">${a.desc}</div><div class="alert-time">${a.time}</div></div>`;
        frag.appendChild(el);
    });
    list.innerHTML = '';
    list.appendChild(frag);
}

function addAlert() {
    const newAlert = generateAlert();
    alertsData.unshift(newAlert);
    if (alertsData.length > 10) alertsData.pop();
    renderAlerts();
    const criticals = alertsData.filter(a => a.type === 'critical').length;
    document.getElementById('alertCount').textContent = criticals || alertsData.length;
}

// Seed initial alerts
for (let i = 0; i < 5; i++) alertsData.push(generateAlert());
renderAlerts();
setInterval(addAlert, 8000);

document.getElementById('clearAlerts').addEventListener('click', () => {
    alertsData = [];
    document.getElementById('alertsList').innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;">No active alerts</div>';
    document.getElementById('alertCount').textContent = '0';
});

// ======== PREDICTIONS ========
function renderPredictions() {
    const preds = [
        { icon: '📈', title: 'Queue surge in 45 mins', detail: 'ER expected +34% arrivals (shift change)', conf: '91%' },
        { icon: '⏱', title: 'Cardiology bottleneck', detail: 'Dr. Krishnan consults avg +8 min over schedule', conf: '87%' },
        { icon: '🛏', title: 'Bed shortage risk', detail: 'ORT ward at 94% capacity — trigger escalation', conf: '78%' },
        { icon: '🚶', title: 'No-show prediction', detail: '4 patients with >65% no-show probability', conf: '83%' }
    ];
    const list = document.getElementById('predictionsList');
    list.innerHTML = preds.map(p => `
    <div class="prediction-item">
      <span class="pred-icon">${p.icon}</span>
      <div class="pred-body">
        <div class="pred-title">${p.title}</div>
        <div class="pred-detail">${p.detail}</div>
      </div>
      <span class="pred-confidence">${p.conf}</span>
    </div>`).join('');
}
renderPredictions();

// ======== PATIENT TABLE ========
function getPriorityOrder(p) { return { critical: 0, high: 1, medium: 2, low: 3 }[p] ?? 4; }

function scoreColor(score) {
    if (score > 0.75) return '#EF4444';
    if (score > 0.5) return '#F59E0B';
    return '#10B981';
}

function renderPatientTable(filterDept = '', filterPriority = '', search = '') {
    const tbody = document.getElementById('patientTableBody');
    let filtered = [...patients];
    if (filterDept) filtered = filtered.filter(p => p.dept === filterDept);
    if (filterPriority) filtered = filtered.filter(p => p.priority === filterPriority);
    if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search));
    filtered.sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));

    tbody.innerHTML = filtered.map(p => {
        const color = scoreColor(p.aiScore);
        const pct = Math.round(p.aiScore * 100);
        return `<tr>
      <td><div class="patient-name-cell">
        <div class="patient-avatar" style="background:linear-gradient(135deg,${color},${color}88)">${initials(p.name)}</div>
        <div><div class="patient-name">${p.name}</div><div class="patient-age">Age ${p.age}</div></div>
      </div></td>
      <td style="color:var(--text-muted);font-size:12px">${p.id}</td>
      <td><span style="font-size:13px">${DEPT_NAMES[p.dept]}</span></td>
      <td><span class="priority-badge ${p.priority}">${p.priority}</span></td>
      <td>${p.waitMins} min</td>
      <td>~${p.predictedDuration} min</td>
      <td><div class="ai-score-bar">
        <div class="score-track"><div class="score-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="score-label" style="color:${color}">${pct}</span>
      </div></td>
      <td><span class="status-badge ${p.status}">${p.status === 'in-progress' ? 'In Progress' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
      <td><button class="action-btn" onclick="optimizePatient('${p.id}')">AI Optimize</button></td>
    </tr>`;
    }).join('') || `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted)">No patients match filters</td></tr>`;
}
renderPatientTable();

document.getElementById('filterDept').addEventListener('change', e => {
    renderPatientTable(e.target.value, document.getElementById('filterPriority').value, document.getElementById('searchPatient').value);
});
document.getElementById('filterPriority').addEventListener('change', e => {
    renderPatientTable(document.getElementById('filterDept').value, e.target.value, document.getElementById('searchPatient').value);
});
document.getElementById('searchPatient').addEventListener('input', e => {
    renderPatientTable(document.getElementById('filterDept').value, document.getElementById('filterPriority').value, e.target.value);
});

window.optimizePatient = function (id) {
    const p = patients.find(x => x.id === id);
    if (!p) return;
    addXAIDecision({
        type: 'reassign',
        title: `Slot optimized for ${p.name}`,
        desc: `Patient moved up by ${rnd(8, 20)} minutes — balances ${DEPT_NAMES[p.dept]} queue`,
        factors: [
            { name: 'Priority Score', pct: rnd(75, 95) },
            { name: 'Queue Position', pct: rnd(60, 85) },
            { name: 'Wait Time Delta', pct: rnd(50, 80) },
            { name: 'Doctor Availability', pct: rnd(45, 75) }
        ],
        confidence: rnd(82, 96)
    });
    switchPanel('ai');
};

// ======== ADD PATIENT MODAL ========
const modal = document.getElementById('addPatientModal');
document.getElementById('addPatientBtn').addEventListener('click', () => modal.classList.add('show'));
document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('show'));
document.getElementById('cancelModal').addEventListener('click', () => modal.classList.remove('show'));

let aiEstimateTimer = null;
function updateAIEstimate() {
    const name = document.getElementById('newPatientName').value;
    const dept = document.getElementById('newPatientDept').value;
    const priority = document.getElementById('newPatientPriority').value;
    const complaint = document.getElementById('newPatientComplaint').value;
    if (!name || !complaint) {
        document.getElementById('aiEstimateText').textContent = 'Fill in patient details to get AI-powered triage estimate.';
        return;
    }
    const waitMin = { critical: rnd(2, 5), high: rnd(5, 15), medium: rnd(15, 30), low: rnd(30, 60) }[priority];
    const duration = rnd(10, 45);
    document.getElementById('aiEstimateText').innerHTML = `Estimated wait: <strong style="color:#0EA5E9">${waitMin}–${waitMin + 5} mins</strong> · Consultation: <strong style="color:#10B981">~${duration} mins</strong> · Recommended doctor: <strong style="color:#8B5CF6">${rndFrom(DOCTOR_NAMES)}</strong>`;
}

['newPatientName', 'newPatientComplaint', 'newPatientDept', 'newPatientPriority'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        clearTimeout(aiEstimateTimer);
        aiEstimateTimer = setTimeout(updateAIEstimate, 400);
    });
});

document.getElementById('confirmAddPatient').addEventListener('click', () => {
    const name = document.getElementById('newPatientName').value.trim();
    if (!name) return;
    const newP = generatePatient({
        name,
        age: parseInt(document.getElementById('newPatientAge').value) || rnd(18, 70),
        dept: document.getElementById('newPatientDept').value,
        priority: document.getElementById('newPatientPriority').value,
        complaint: document.getElementById('newPatientComplaint').value,
        status: 'waiting',
        waitMins: 0
    });
    patients.unshift(newP);
    renderPatientTable();
    updateKPIs();
    addAlert();
    modal.classList.remove('show');
    document.getElementById('newPatientName').value = '';
    document.getElementById('newPatientComplaint').value = '';
});

// ======== DOCTORS PANEL ========
const DOCTORS = [
    { name: 'Dr. Amit Malhotra', dept: 'Emergency', patients: 7, done: 12, utilization: 88, status: 'busy', color: '#EF4444' },
    { name: 'Dr. Priya Sen', dept: 'Cardiology', patients: 5, done: 9, utilization: 72, status: 'available', color: '#0EA5E9' },
    { name: 'Dr. Rajan Krishnan', dept: 'Orthopedics', patients: 6, done: 8, utilization: 81, status: 'busy', color: '#F59E0B' },
    { name: 'Dr. Nadia Okonkwo', dept: 'General', patients: 4, done: 14, utilization: 65, status: 'available', color: '#10B981' },
    { name: 'Dr. Suresh Patel', dept: 'Pediatrics', patients: 8, done: 11, utilization: 94, status: 'busy', color: '#8B5CF6' },
    { name: 'Dr. Kavya Iyer', dept: 'Emergency', patients: 3, done: 6, utilization: 55, status: 'break', color: '#06B6D4' }
];

function renderDoctors() {
    const grid = document.getElementById('doctorsGrid');
    grid.innerHTML = DOCTORS.map(d => {
        const barColor = d.utilization > 90 ? '#EF4444' : d.utilization > 75 ? '#F59E0B' : '#10B981';
        return `<div class="doctor-card">
      <div class="doctor-header">
        <div class="doctor-avatar" style="background:${d.color}22;color:${d.color}">${initials(d.name)}</div>
        <div><div class="doctor-name">${d.name}</div><div class="doctor-dept">${d.dept}</div></div>
      </div>
      <div class="doctor-stats">
        <div class="doc-stat"><div class="doc-stat-val" style="color:${d.color}">${d.patients}</div><div class="doc-stat-lbl">In Queue</div></div>
        <div class="doc-stat"><div class="doc-stat-val" style="color:#10B981">${d.done}</div><div class="doc-stat-lbl">Completed</div></div>
        <div class="doc-stat"><div class="doc-stat-val" style="color:#F59E0B">${rnd(12, 28)}</div><div class="doc-stat-lbl">Avg min</div></div>
      </div>
      <div class="util-bar-wrap">
        <div class="util-bar-label"><span>Utilization</span><span style="color:${barColor}">${d.utilization}%</span></div>
        <div class="util-bar-track"><div class="util-bar-fill" style="width:${d.utilization}%;background:${barColor}"></div></div>
      </div>
      <span class="status-chip ${d.status}">● ${d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
    </div>`;
    }).join('');
}
renderDoctors();

function buildWorkloadChart() {
    const ctx = document.getElementById('workloadChart')?.getContext('2d');
    if (!ctx) return;
    workloadChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DOCTORS.map(d => d.name.split(' ')[1]),
            datasets: [{
                label: 'Utilization %',
                data: DOCTORS.map(d => d.utilization),
                backgroundColor: DOCTORS.map(d => d.utilization > 90 ? 'rgba(239,68,68,0.7)' : d.utilization > 75 ? 'rgba(245,158,11,0.7)' : 'rgba(16,185,129,0.7)'),
                borderColor: DOCTORS.map(d => d.utilization > 90 ? '#EF4444' : d.utilization > 75 ? '#F59E0B' : '#10B981'),
                borderWidth: 2, borderRadius: 6
            }]
        },
        options: { ...chartDefaults('%'), plugins: { legend: { display: false }, tooltip: tooltipStyle() } }
    });
}

// ======== XAI PANEL ========
let xaiDecisions = [];
let rlEpisodes = 0;
let rlTotalReward = 0;
let rlActions = 0;

function addXAIDecision(decision) {
    xaiDecisions.unshift(decision);
    if (xaiDecisions.length > 8) xaiDecisions.pop();
    rlEpisodes += rnd(10, 30);
    rlTotalReward = rndFloat(0.72, 0.95);
    rlActions++;
    renderXAI();
}

function renderXAI() {
    document.getElementById('rlEpisodes').textContent = rlEpisodes.toLocaleString();
    document.getElementById('rlReward').textContent = rlTotalReward.toFixed(2);
    document.getElementById('rlActions').textContent = rlActions;

    const list = document.getElementById('xaiDecisionsList');
    list.innerHTML = xaiDecisions.map(d => `
    <div class="xai-decision-card">
      <div class="xai-decision-header">
        <span class="xai-type-badge ${d.type}">${d.type}</span>
        <span class="xai-decision-title">${d.title}</span>
        <span class="xai-confidence">Confidence: ${d.confidence}%</span>
      </div>
      <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">${d.desc}</p>
      <div class="xai-factors">
        <div class="xai-factors-title">Decision Factors</div>
        <div class="factor-bars">
          ${d.factors.map(f => `
            <div class="factor-bar">
              <span class="factor-name">${f.name}</span>
              <div class="factor-track"><div class="factor-fill" style="width:${f.pct}%"></div></div>
              <span class="factor-pct">${f.pct}%</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`).join('');

    renderFeatureImportance();
}

function renderFeatureImportance() {
    const features = [
        { name: 'Patient Priority Score', pct: 24, color: '#EF4444' },
        { name: 'Wait Time (current)', pct: 19, color: '#F59E0B' },
        { name: 'Doctor Utilization', pct: 16, color: '#0EA5E9' },
        { name: 'Predicted Duration (ML)', pct: 14, color: '#8B5CF6' },
        { name: 'Department Queue Depth', pct: 12, color: '#10B981' },
        { name: 'Historical No-Show Rate', pct: 9, color: '#06B6D4' },
        { name: 'Time of Day', pct: 6, color: '#F472B6' }
    ];
    document.getElementById('featureImportance').innerHTML = features.map(f => `
    <div class="fi-item">
      <span class="fi-name">${f.name}</span>
      <div class="fi-track"><div class="fi-fill" style="width:${f.pct * 4}%;background:${f.color}"></div></div>
      <span class="fi-pct" style="color:${f.color}">${f.pct}%</span>
    </div>`).join('');
}

// Seed XAI decisions
const seedDecisions = [
    { type: 'escalate', title: 'Patient Arjun Sharma flagged critical', desc: 'Chest pain + wait time >40 mins. Immediate slot assigned.', factors: [{ name: 'Symptom Severity', pct: 95 }, { name: 'Wait Time Delta', pct: 88 }, { name: 'Priority Score', pct: 91 }, { name: 'Historical Patterns', pct: 72 }], confidence: 96 },
    { type: 'reassign', title: 'Cardiology queue rebalanced', desc: 'Dr. Krishnan overloaded — 3 patients rerouted to Dr. Sen', factors: [{ name: 'Doctor Utilization', pct: 92 }, { name: 'Queue Depth', pct: 78 }, { name: 'Wait Time Impact', pct: 85 }, { name: 'Patient Consent', pct: 60 }], confidence: 89 },
    { type: 'defer', title: 'Low-priority slot deferred 15 mins', desc: 'Routine checkup delayed to admit emergency walk-in', factors: [{ name: 'Emergency Priority', pct: 99 }, { name: 'Impact on Existing', pct: 42 }, { name: 'Doctor Capacity', pct: 68 }, { name: 'Time to Next Slot', pct: 55 }], confidence: 94 }
];
seedDecisions.forEach(d => addXAIDecision(d));
// Ensure XAI panel is fully rendered at startup
renderXAI();

// Auto-generate XAI decisions
setInterval(() => {
    const types = ['reassign', 'prioritize', 'escalate', 'defer'];
    const type = rndFrom(types);
    const patient = rndFrom(patients);
    const titleMap = {
        reassign: `Queue slot shifted for ${patient.name}`,
        prioritize: `${patient.name} promoted in ${DEPT_NAMES[patient.dept]} queue`,
        escalate: `${patient.name} escalated to ${rndFrom(DOCTOR_NAMES)}`,
        defer: `Appointment deferred — emergency accommodation needed`
    };
    addXAIDecision({
        type,
        title: titleMap[type],
        desc: `AI engine action based on real-time queue state and predicted outcomes.`,
        factors: [
            { name: 'Queue Priority Score', pct: rnd(55, 98) },
            { name: 'Wait Time Delta', pct: rnd(45, 90) },
            { name: 'Doctor Availability', pct: rnd(40, 85) },
            { name: 'Historical Baseline', pct: rnd(35, 75) }
        ],
        confidence: rnd(78, 97)
    });
}, 12000);

// ======== SIMULATOR ========
const simInputs = { simDoctors: 'simDoctorVal', simArrivals: 'simArrivalVal', simEmergency: 'simEmergencyVal', simNoShow: 'simNoShowVal', simDuration: 'simDurationVal' };
Object.entries(simInputs).forEach(([inputId, labelId]) => {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    input.addEventListener('input', () => { label.textContent = input.value; });
});

document.getElementById('runSimulation').addEventListener('click', runSimulation);
document.getElementById('resetSimulation').addEventListener('click', () => {
    document.getElementById('simDoctors').value = 8; document.getElementById('simDoctorVal').textContent = 8;
    document.getElementById('simArrivals').value = 15; document.getElementById('simArrivalVal').textContent = 15;
    document.getElementById('simEmergency').value = 10; document.getElementById('simEmergencyVal').textContent = 10;
    document.getElementById('simNoShow').value = 15; document.getElementById('simNoShowVal').textContent = 15;
    document.getElementById('simDuration').value = 20; document.getElementById('simDurationVal').textContent = 20;
    runSimulation();
});

function runSimulation() {
    const doctors = parseInt(document.getElementById('simDoctors').value);
    const arrivals = parseInt(document.getElementById('simArrivals').value);
    const emergency = parseInt(document.getElementById('simEmergency').value);
    const noShow = parseInt(document.getElementById('simNoShow').value);
    const duration = parseInt(document.getElementById('simDuration').value);
    const experience = document.getElementById('simExperience').value;
    const expFactor = experience === 'senior' ? 0.85 : experience === 'junior' ? 1.2 : 1.0;

    const effectiveArrivals = arrivals * (1 - noShow / 100) * (1 + emergency / 100);
    const capacity = doctors * (60 / (duration * expFactor));
    const utilization = Math.min(99, Math.round((effectiveArrivals / capacity) * 100));
    const waitTime = Math.max(2, Math.round((effectiveArrivals / Math.max(1, doctors)) * duration * expFactor * 0.3));
    const overflow = utilization > 85 ? 'High' : utilization > 65 ? 'Medium' : 'Low';
    const efficiency = Math.round(100 - (Math.abs(utilization - 75) * 0.5 + Math.abs(waitTime - 20) * 0.3));

    const baseWait = 22, baseUtil = 75;
    const waitDelta = waitTime - baseWait;
    const utilDelta = utilization - baseUtil;

    document.getElementById('simWaitResult').textContent = `${waitTime} min`;
    document.getElementById('simUtilResult').textContent = `${utilization}%`;
    document.getElementById('simOverflowResult').textContent = overflow;
    document.getElementById('simEfficiencyResult').textContent = `${Math.max(0, Math.min(100, efficiency))}%`;

    const setChange = (id, delta, unit = '', invert = false) => {
        const el = document.getElementById(id);
        const better = invert ? delta < 0 : delta > 0;
        el.textContent = (delta > 0 ? '▲ +' : '▼ ') + Math.abs(delta).toFixed(0) + unit + ' vs baseline';
        el.className = 'sim-result-change ' + (better ? 'better' : 'worse');
    };
    setChange('simWaitChange', waitDelta, ' min', true);
    setChange('simUtilChange', utilDelta, '%');
    const overflowScore = overflow === 'High' ? 2 : overflow === 'Medium' ? 1 : 0;
    document.getElementById('simOverflowChange').textContent = utilization > 85 ? '⚠ Critical' : '✓ Manageable';
    document.getElementById('simOverflowChange').className = 'sim-result-change ' + (utilization > 85 ? 'worse' : 'better');
    setChange('simEfficiencyChange', efficiency - 80, '%');

    buildSimChart(doctors, arrivals, duration, noShow, emergency);
    renderSimRecommendations(doctors, arrivals, utilization, waitTime, overflow);
    document.getElementById('simBadge').textContent = 'Simulated';
    document.getElementById('simRecommendations').style.display = 'block';
}

function buildSimChart(doctors, arrivals, duration, noShow, emergency) {
    const ctx = document.getElementById('simChart').getContext('2d');
    if (simChart) simChart.destroy();
    const hours = Array.from({ length: 12 }, (_, i) => `${(7 + i)}:00`);
    const baseQ = hours.map((_, i) => Math.max(0, Math.round(arrivals * (0.5 + Math.sin(i * 0.7) * 0.4) - doctors * 2)));
    const optQ = baseQ.map(v => Math.max(0, v - Math.floor(doctors * 0.8)));
    simChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                { label: 'Projected Queue', data: baseQ, backgroundColor: 'rgba(245,158,11,0.5)', borderColor: '#F59E0B', borderWidth: 2, borderRadius: 5 },
                { label: 'AI Optimized Queue', data: optQ, backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10B981', borderWidth: 2, borderRadius: 5 }
            ]
        },
        options: { ...chartDefaults('Queue Size'), plugins: { legend: { labels: { color: '#7BA3C8', font: { size: 11, family: 'Inter' }, boxWidth: 12 } }, tooltip: tooltipStyle() } }
    });
}

function renderSimRecommendations(doctors, arrivals, utilization, waitTime, overflow) {
    const recs = [];
    if (utilization > 85) recs.push({ icon: '🚨', text: `<strong>Add ${Math.ceil((arrivals * 0.3) / 3)} more doctors</strong> — current load exceeds safe capacity by ${utilization - 85}%` });
    if (waitTime > 30) recs.push({ icon: '⏱', text: `<strong>Reduce consultation duration</strong> by 20% or stagger arrival slots to cut wait from ${waitTime} to ~${Math.round(waitTime * 0.75)} mins` });
    if (overflow === 'High') recs.push({ icon: '🔀', text: `<strong>Enable overflow routing</strong> — redirect non-critical patients to General ward to reduce ER pressure` });
    recs.push({ icon: '🤖', text: `<strong>AI recommends:</strong> Schedule 2 extra staff from ${['10:00', '11:00', '14:00'][rnd(0, 2)]} – offset predicted surge window by ~45 mins` });
    document.getElementById('simRecsContent').innerHTML = recs.map(r => `<div class="sim-rec"><span class="sim-rec-icon">${r.icon}</span><div class="sim-rec-text">${r.text}</div></div>`).join('');
}

// ======== PATIENT FLOW GRAPH ========
// Node W/H constants
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
    { from: 'reception', to: 'triage', flow: 20 },
    { from: 'triage', to: 'er', flow: 7 },
    { from: 'triage', to: 'card', flow: 5 },
    { from: 'triage', to: 'gen', flow: 9 },
    { from: 'triage', to: 'ort', flow: 4 },
    { from: 'er', to: 'lab', flow: 5 },
    { from: 'card', to: 'lab', flow: 3 },
    { from: 'gen', to: 'lab', flow: 4 },
    { from: 'lab', to: 'ward', flow: 4 },
    { from: 'er', to: 'ward', flow: 3 },
    { from: 'ward', to: 'discharge', flow: 5 },
    { from: 'gen', to: 'discharge', flow: 6 },
    { from: 'ort', to: 'discharge', flow: 3 }
];

function renderFlowGraph() {
    const svg = document.getElementById('flowSvg');
    if (!svg) return;

    // Ensure the viewBox covers all nodes + padding
    svg.setAttribute('viewBox', '0 0 960 460');

    const nodeMap = {};
    FLOW_NODES.forEach(n => { nodeMap[n.id] = n; });

    let defs = `<defs>`;
    FLOW_NODES.forEach(n => {
        defs += `<marker id="arr-${n.id}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="${n.color}" opacity="0.7"/>
        </marker>`;
    });
    defs += `</defs>`;

    let edges = '';
    FLOW_EDGES.forEach(e => {
        const s = nodeMap[e.from], t = nodeMap[e.to];
        if (!s || !t) return;
        const strokeW = Math.max(1.5, Math.min(5, e.flow * 0.45));
        // Connect from right-center of source to left-center of target
        const x1 = s.x + NODE_W, y1 = s.y + NODE_H / 2;
        const x2 = t.x, y2 = t.y + NODE_H / 2;
        // Use a bezier curve for nicely curved edges
        const cx = (x1 + x2) / 2;
        edges += `<path d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}"
          fill="none" stroke="${s.color}" stroke-width="${strokeW}" stroke-opacity="0.5"
          stroke-dasharray="8 4" marker-end="url(#arr-${s.id})" class="flow-link">
          <animate attributeName="stroke-dashoffset" values="12;0" dur="${(1.2 + e.flow * 0.05).toFixed(1)}s" repeatCount="indefinite"/>
        </path>`;
    });

    let nodes = '';
    FLOW_NODES.forEach(n => {
        const cx = n.x + NODE_W / 2;
        nodes += `<g class="flow-node" transform="translate(${n.x},${n.y})">
          <rect width="${NODE_W}" height="${NODE_H}" rx="10" fill="${n.color}20" stroke="${n.color}" stroke-width="1.8"/>
          <text x="${NODE_W / 2}" y="14" text-anchor="middle" fill="${n.color}" font-size="10" font-family="Outfit" font-weight="700">${n.label}</text>
          <text x="${NODE_W / 2}" y="28" text-anchor="middle" fill="#B0C8E0" font-size="9" font-family="Inter">${n.count} patients</text>
        </g>`;
    });

    svg.innerHTML = defs + edges + nodes;

    // Flow stats
    const total = FLOW_NODES.reduce((a, n) => a + n.count, 0);
    document.getElementById('flowStats').innerHTML = [
        { label: 'Total in System', val: total, col: '#0EA5E9' },
        { label: 'Throughput/hr', val: rnd(18, 26), col: '#10B981' },
        { label: 'Avg Dwell Time', val: `${rnd(42, 68)} min`, col: '#F59E0B' },
        { label: 'Bottleneck Index', val: rndFloat(0.3, 0.7), col: '#EF4444' }
    ].map(s => `<div class="flow-stat-item"><span class="flow-stat-label">${s.label}</span><span class="flow-stat-val" style="color:${s.col}">${s.val}</span></div>`).join('');

    document.getElementById('bottleneckList').innerHTML = [
        { dept: 'Emergency Room', desc: 'Patient accumulation — avg wait 38 min', severity: 'high' },
        { dept: 'Lab / Imaging', desc: 'High turnaround time — results delayed 22 min', severity: 'medium' },
        { dept: 'Cardiology', desc: 'Single doctor bottleneck — utilization at 94%', severity: 'high' }
    ].map(b => `<div class="bottleneck-item">
    <div class="bottleneck-dept">${b.dept}</div>
    <div class="bottleneck-desc">${b.desc}</div>
    <span class="bottleneck-severity ${b.severity}">${b.severity} severity</span>
  </div>`).join('');
}

// ======== PARTICLE BACKGROUND ========
function createParticles() {
    const bg = document.createElement('div');
    bg.className = 'particles-bg';
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `left:${Math.random() * 100}%;animation-duration:${rnd(8, 20)}s;animation-delay:${rnd(0, 15)}s;--drift:${rnd(-60, 60)}px;`;
        bg.appendChild(p);
    }
    document.body.prepend(bg);
}
createParticles();

// ======== REAL-TIME SIMULATION ========
setInterval(() => {
    // Jitter patient wait times
    patients.forEach(p => {
        if (p.status === 'waiting') p.waitMins += 1;
    });
    // Occasionally change a patient status
    if (Math.random() < 0.3) {
        const waitingPts = patients.filter(p => p.status === 'waiting');
        if (waitingPts.length) {
            const pt = rndFrom(waitingPts);
            pt.status = 'in-progress';
        }
    }
    if (Math.random() < 0.2) {
        const inProgress = patients.filter(p => p.status === 'in-progress');
        if (inProgress.length) {
            const pt = rndFrom(inProgress);
            pt.status = 'done';
        }
    }
    // Refresh active panel data
    updateKPIs();
    const activePanel = document.querySelector('.panel.active');
    if (activePanel?.id === 'panelQueue') renderPatientTable(document.getElementById('filterDept').value, document.getElementById('filterPriority').value, document.getElementById('searchPatient').value);

    // Update queue chart live
    if (queueChart) {
        const ds = queueChart.data.datasets[0];
        ds.data.shift();
        ds.data.push(rnd(5, 40));
        queueChart.data.datasets[1].data.shift();
        queueChart.data.datasets[1].data.push(rnd(3, 35));
        queueChart.update('none');
    }
}, 5000);

// Lazy init workload chart
document.getElementById('navDoctors').addEventListener('click', () => {
    setTimeout(() => { if (!workloadChart) buildWorkloadChart(); }, 100);
});

// Initial simulation run
setTimeout(runSimulation, 500);

console.log('%cMediFlow AI Dashboard initialized ✓', 'color:#0EA5E9;font-size:14px;font-weight:bold;');
