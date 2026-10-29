// Инспектор кандидата в стиле Unity Editor: иерархия слева, компоненты справа.
// Сигнатурный блок — баланс-лаборатория с живыми графиками (canvas 2D)
// и A/B-симулятор. Ползунок «Оборона босса» реально меняет HP босса в реванше.

import { REQUIREMENTS, LINKS, PROTOTYPE_REPOS } from './data.js';
import { getLoc } from './loc.js';

const el = {
  hierarchy: document.getElementById('hierarchy'),
  panel: document.getElementById('inspector-panel'),
  head: document.getElementById('inspector-head'),
  btnToBattle: document.getElementById('btn-to-battle'),
  btnRematch2: document.getElementById('btn-rematch2'),
};

let lang = 'ru';
let hooks = {};
let current = 'player';

const SECTIONS = [
  { id: 'player', icon: '🕹️' },
  { id: 'proto', icon: '🎮' },
  { id: 'indus', icon: '🎲' },
  { id: 'lab', icon: '📈' },
  { id: 'edu', icon: '🎓' },
  { id: 'contacts', icon: '📮' },
];

const LAB_STATE = {
  xpBase: 50,
  xpK: 1.15,
  ttkMult: 1.0,
  faucet: 45,
  sink: 8,
  abUplift: null,
};

// ---------- помощники разметки ----------

function comp(name, rowsHtml, tag = 'Script') {
  return `
    <div class="comp">
      <div class="comp-head">
        <div class="comp-check"></div>
        <div class="comp-name">${name}</div>
        <div class="comp-tag">${tag}</div>
      </div>
      <div class="comp-body">${rowsHtml}</div>
    </div>`;
}

function row(k, v) {
  return `<div class="comp-row"><div class="k">${k}</div><div class="v">${v}</div></div>`;
}

function lab(name, bodyHtml) {
  return `
    <div class="lab">
      <div class="lab-head">
        <div class="comp-check"></div>
        <div class="comp-name">${name}</div>
      </div>
      <div class="lab-body">${bodyHtml}</div>
    </div>`;
}

function sliderHtml(id, labelKey, min, max, step, value) {
  const loc = getLoc(lang);
  return `
    <div class="lab-row">
      <label for="${id}">${loc[labelKey]}</label>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
      <output id="${id}-out"></output>
    </div>`;
}

// ---------- canvas-помощник ----------

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 190;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function grid(ctx, w, h, xMin, xMax, yMin, yMax) {
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1;
  ctx.font = '10px Nunito, sans-serif';
  ctx.fillStyle = '#9c9c9c';
  for (let i = 0; i <= 4; i++) {
    const y = h - 24 - (i / 4) * (h - 40);
    ctx.beginPath();
    ctx.moveTo(34, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
  }
}

function mapX(x, xMin, xMax, w) {
  return 36 + ((x - xMin) / (xMax - xMin)) * (w - 50);
}

function mapY(y, yMin, yMax, h) {
  return (h - 24) - ((y - yMin) / (yMax - yMin)) * (h - 40);
}

// ---------- баланс-лаборатория: график XP-кривой ----------

function drawXpChart() {
  const canvas = document.getElementById('chart-xp');
  if (!canvas) return;
  const { ctx, w, h } = setupCanvas(canvas);
  grid(ctx, w, h, 1, 30, 0, 1);

  const { xpBase: base, xpK: k } = LAB_STATE;
  const costs = [];
  for (let n = 1; n <= 30; n++) costs.push(base * Math.pow(k, n - 1));
  const yMax = costs[29] * 1.08;

  // линия
  ctx.strokeStyle = '#ecb35c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  costs.forEach((c, i) => {
    const x = mapX(i + 1, 1, 30, w);
    const y = mapY(c, 0, yMax, h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // последняя точка
  const lx = mapX(30, 1, 30, w);
  const ly = mapY(costs[29], 0, yMax, h);
  ctx.fillStyle = '#ecb35c';
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9c9c9c';
  ctx.fillText('lvl 1', mapX(1, 1, 30, w) - 8, h - 8);
  ctx.fillText('lvl 30', w - 46, h - 8);

  const total = Math.round(base * (Math.pow(k, 30) - 1) / (k - 1));
  const out = document.getElementById('xp-total');
  if (out) out.textContent = total.toLocaleString('ru-RU');
}

// ---------- TTK-модель ----------

const TOTAL_HP = REQUIREMENTS.reduce((s, r) => s + r.hp, 0);

function drawTtkChart() {
  const canvas = document.getElementById('chart-ttk');
  if (!canvas) return;
  const { ctx, w, h } = setupCanvas(canvas);
  const DPS = 52;
  const multMin = 0.6;
  const multMax = 1.8;
  const ttk = (m) => (TOTAL_HP * m) / DPS;
  const yMax = ttk(multMax);

  // зелёная зона 60–120 c
  ctx.fillStyle = 'rgba(87, 217, 143, 0.14)';
  const zoneTop = mapY(120, 0, yMax, h);
  const zoneBottom = mapY(60, 0, yMax, h);
  ctx.fillRect(36, zoneTop, w - 50, zoneBottom - zoneTop);
  ctx.fillStyle = 'rgba(87, 217, 143, 0.75)';
  ctx.font = '10px Nunito, sans-serif';
  ctx.fillText('60–120 s', 42, zoneTop + 12);

  grid(ctx, w, h, multMin, multMax, 0, yMax);

  // кривая TTK
  ctx.strokeStyle = '#ecb35c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const m = multMin + ((multMax - multMin) * i) / 40;
    const x = mapX(m, multMin, multMax, w);
    const y = mapY(ttk(m), 0, yMax, h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // маркер текущего значения
  const m = LAB_STATE.ttkMult;
  const mx = mapX(m, multMin, multMax, w);
  const my = mapY(ttk(m), 0, yMax, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(mx, 14);
  ctx.lineTo(mx, h - 24);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.fill();

  const out = document.getElementById('ttk-out');
  if (out) out.textContent = `${Math.round(ttk(m))} s`;
}

// ---------- экономика faucet/sink ----------

function simulateEconomy() {
  const days = 14;
  let bal = 100;
  const series = [bal];
  for (let d = 1; d <= days; d++) {
    bal = bal * (1 - LAB_STATE.sink / 100) + LAB_STATE.faucet;
    series.push(bal);
  }
  return series;
}

function drawEconChart() {
  const canvas = document.getElementById('chart-econ');
  if (!canvas) return;
  const { ctx, w, h } = setupCanvas(canvas);
  const series = simulateEconomy();
  const yMax = Math.max(700, series[14] * 1.1);
  const xMax = 14;

  // коридор 300–600
  ctx.fillStyle = 'rgba(87, 217, 143, 0.14)';
  const cTop = mapY(600, 0, yMax, h);
  const cBottom = mapY(300, 0, yMax, h);
  ctx.fillRect(36, cTop, w - 50, cBottom - cTop);
  ctx.fillStyle = 'rgba(87, 217, 143, 0.75)';
  ctx.font = '10px Nunito, sans-serif';
  ctx.fillText('300–600', 42, cTop + 12);

  grid(ctx, w, h, 0, xMax, 0, yMax);

  ctx.strokeStyle = '#ecb35c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  series.forEach((v, d) => {
    const x = mapX(d, 0, xMax, w);
    const y = mapY(v, 0, yMax, h);
    if (d === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const lastX = mapX(14, 0, xMax, w);
  const lastY = mapY(series[14], 0, yMax, h);
  ctx.fillStyle = '#ecb35c';
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '11px Nunito, sans-serif';
  ctx.fillText(`D14: ${Math.round(series[14])}`, lastX - 58, lastY - 8);

  // вердикт
  const verdict = document.getElementById('econ-verdict');
  if (verdict) {
    const loc = getLoc(lang);
    const v = series[14];
    if (v >= 300 && v <= 600) verdict.textContent = loc.lab_econ_verdict_ok;
    else if (v < 300) verdict.textContent = loc.lab_econ_verdict_poor;
    else verdict.textContent = loc.lab_econ_verdict_infl;
  }
}

// ---------- A/B-симулятор ----------

function drawAbChart() {
  const canvas = document.getElementById('chart-ab');
  if (!canvas) return;
  const { ctx, w, h } = setupCanvas(canvas);
  const loc = getLoc(lang);

  if (LAB_STATE.abUplift === null) {
    ctx.fillStyle = '#8f8f8f';
    ctx.font = '13px Nunito, sans-serif';
    ctx.fillText(loc.ab_axis_d, 40, 30);
    return;
  }

  const days = 7;
  const aCurve = [100, 62, 41, 30, 24, 20, 18];
  const noise = () => (Math.random() - 0.5) * 2.4;
  const a = aCurve.map((v) => Math.max(6, v + noise()));
  const b = a.map((v) => Math.max(7, v * (1 + LAB_STATE.abUplift / 100)));
  b[0] = 100;
  a[0] = 100;
  const yMax = 105;

  grid(ctx, w, h, 0, days, 0, yMax);

  ctx.strokeStyle = '#9aa4d6';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  a.forEach((v, d) => {
    const x = mapX(d, 0, days, w);
    const y = mapY(v, 0, yMax, h);
    if (d === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#ecb35c';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  b.forEach((v, d) => {
    const x = mapX(d, 0, days, w);
    const y = mapY(v, 0, yMax, h);
    if (d === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // легенда
  ctx.font = '11px Nunito, sans-serif';
  ctx.fillStyle = '#9aa4d6';
  ctx.beginPath();
  ctx.arc(60, 22, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(loc.ab_a, 70, 26);
  ctx.fillStyle = '#ecb35c';
  ctx.beginPath();
  ctx.arc(210, 22, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(loc.ab_b, 220, 26);

  const verdict = document.getElementById('ab-verdict');
  if (verdict) verdict.textContent = loc.ab_verdict.replace('{u}', LAB_STATE.abUplift.toFixed(1));
}

// ---------- секции ----------

function sectionPlayer() {
  const loc = getLoc(lang);
  return `
    <div class="sec-title">Player_YaroslavKukar</div>
    <p class="sec-desc">${loc.sec_player_desc}</p>
    ${comp(loc.comp_gd, row(loc.gd_focus, loc.gd_focus_val) + row(loc.gd_think, loc.gd_think_val))}
    ${comp(loc.comp_tech, row(loc.tech_engines, loc.tech_engines_val) + row(loc.tech_note, loc.tech_note_val))}
    ${comp(loc.comp_tools, row('Assets', loc.tools_val))}
    ${comp(loc.comp_lang, row('Locale', loc.lang_val), 'Component')}
  `;
}

function sectionProto() {
  const loc = getLoc(lang);
  const rows = PROTOTYPE_REPOS.map((p) => `
    <div class="proj">
      <b>${p.repo}</b>
      <span>${loc[p.key]}</span>
      <a href="${p.href}" target="_blank" rel="noopener">${loc.link_open}</a>
    </div>`).join('');
  return `
    <div class="sec-title">Experience_Prototypes</div>
    <p class="sec-desc">${loc.sec_proto_desc}</p>
    <div class="comp">
      <div class="comp-head">
        <div class="comp-check"></div>
        <div class="comp-name">PlayableApplications (Collection)</div>
        <div class="comp-tag">Asset</div>
      </div>
      <div class="proj-list">${rows}</div>
    </div>
  `;
}

function sectionIndus() {
  const loc = getLoc(lang);
  return `
    <div class="sec-title">Experience_DesignWork</div>
    <p class="sec-desc">${loc.sec_indus_desc}</p>
    ${comp(loc.comp_vargame,
      row(loc.vg_what, loc.vg_what_val) +
      row(loc.vg_did, loc.vg_did_val) +
      row(loc.vg_playtests, loc.vg_playtests_val), 'Asset')}
    ${comp(loc.comp_gdd,
      row(loc.gdd_what, loc.gdd_what_val) +
      row(loc.gdd_did, loc.gdd_did_val), 'Asset')}
  `;
}

function sectionLab() {
  const loc = getLoc(lang);
  return `
    <div class="sec-title">BalanceLab_Sandbox</div>
    <p class="sec-desc">${loc.sec_lab_desc}</p>

    ${lab(loc.lab_xp, `
      <canvas id="chart-xp"></canvas>
      ${sliderHtml('xp-base', 'lab_xp_slider1', 10, 100, 5, LAB_STATE.xpBase)}
      ${sliderHtml('xp-k', 'lab_xp_slider2', 1.05, 1.35, 0.01, LAB_STATE.xpK)}
      <div class="lab-note">${loc.lab_xp_note}</div>
      <div class="lab-note">${loc.lab_xp_total} <output id="xp-total">—</output></div>
    `)}

    ${lab(loc.lab_ttk, `
      <canvas id="chart-ttk"></canvas>
      ${sliderHtml('ttk-mult', 'lab_ttk_slider', 0.6, 1.8, 0.05, LAB_STATE.ttkMult)}
      <div class="lab-note">${loc.lab_ttk_note}</div>
      <button id="btn-apply-boss" class="apply-btn">${loc.lab_ttk_apply}</button>
    `)}

    ${lab(loc.lab_econ, `
      <canvas id="chart-econ"></canvas>
      ${sliderHtml('econ-faucet', 'lab_econ_slider1', 20, 80, 1, LAB_STATE.faucet)}
      ${sliderHtml('econ-sink', 'lab_econ_slider2', 0, 25, 1, LAB_STATE.sink)}
      <div class="lab-note">${loc.lab_econ_note}</div>
      <div class="lab-verdict" id="econ-verdict"></div>
    `)}

    ${lab(loc.ab_head, `
      <canvas id="chart-ab"></canvas>
      <div class="lab-note">${loc.ab_desc}</div>
      <button id="btn-run-ab" class="run-btn">${loc.ab_run}</button>
      <div class="lab-verdict" id="ab-verdict"></div>
      <div class="lab-note">${loc.ab_honest}</div>
    `)}
  `;
}

function sectionEdu() {
  const loc = getLoc(lang);
  return `
    <div class="sec-title">Education_BSUIR</div>
    <p class="sec-desc">${loc.sec_edu_desc}</p>
    ${comp('UniversityComponent', 
      row('🎓', loc.edu_name) +
      row(loc.edu_degree, loc.edu_field) +
      row(loc.edu_why, loc.edu_why_val), 'Asset')}
  `;
}

function sectionContacts() {
  const loc = getLoc(lang);
  return `
    <div class="sec-title">Contacts_StayInTouch</div>
    <p class="sec-desc">${loc.sec_contacts_desc}</p>
    ${comp('ContactComponent', 
      row(loc.c_phone, '<a href="tel:+375447838489">+375 44 783 84 89</a>') +
      row(loc.c_email, '<a href="mailto:kukar.yar@gmail.com">kukar.yar@gmail.com</a>') +
      row(loc.c_github, `<a href="${LINKS.github}" target="_blank" rel="noopener">github.com/Kerarty</a>`) +
      row(loc.c_vacancy, `<a href="${LINKS.vacancy}" target="_blank" rel="noopener">${loc.c_vacancy_val} ↗</a>`) +
      row(loc.c_cv, `<a href="${LINKS.cv}" target="_blank" rel="noopener">${loc.c_cv_val}</a>`), 'Prefab')}
    <p class="insp-footer-note">CV ARENA · HTML + CSS + ES-модули + PixiJS 8 · собрано как отклик, живёт на GitHub Pages</p>
  `;
}

const RENDERERS = {
  player: sectionPlayer,
  proto: sectionProto,
  indus: sectionIndus,
  lab: sectionLab,
  edu: sectionEdu,
  contacts: sectionContacts,
};

function wireLab() {
  const xpBase = document.getElementById('xp-base');
  const xpK = document.getElementById('xp-k');
  const ttkMult = document.getElementById('ttk-mult');
  const econFaucet = document.getElementById('econ-faucet');
  const econSink = document.getElementById('econ-sink');
  const runAb = document.getElementById('btn-run-ab');
  const applyBoss = document.getElementById('btn-apply-boss');

  const refreshOutputs = () => {
    const pairs = [
      ['xp-base', LAB_STATE.xpBase],
      ['xp-k', LAB_STATE.xpK.toFixed(2)],
      ['ttk-mult', LAB_STATE.ttkMult.toFixed(2)],
      ['econ-faucet', LAB_STATE.faucet],
      ['econ-sink', LAB_STATE.sink + '%'],
    ];
    for (const [id, v] of pairs) {
      const out = document.getElementById(id + '-out');
      if (out) out.textContent = String(v);
    }
  };

  if (xpBase) {
    xpBase.addEventListener('input', () => { LAB_STATE.xpBase = +xpBase.value; refreshOutputs(); drawXpChart(); });
    xpK.addEventListener('input', () => { LAB_STATE.xpK = +xpK.value; refreshOutputs(); drawXpChart(); });
    ttkMult.addEventListener('input', () => { LAB_STATE.ttkMult = +ttkMult.value; refreshOutputs(); drawTtkChart(); });
    econFaucet.addEventListener('input', () => { LAB_STATE.faucet = +econFaucet.value; refreshOutputs(); drawEconChart(); });
    econSink.addEventListener('input', () => { LAB_STATE.sink = +econSink.value; refreshOutputs(); drawEconChart(); });
    runAb.addEventListener('click', () => {
      LAB_STATE.abUplift = 3.5 + Math.random() * 5;
      drawAbChart();
    });
    applyBoss.addEventListener('click', () => {
      window.__bossHpMult = LAB_STATE.ttkMult;
      hooks.onRematch();
    });
    refreshOutputs();
    drawXpChart();
    drawTtkChart();
    drawEconChart();
    drawAbChart();
    // перерисовать после того, как браузер уложит панель (первый рендер мог попасть в гонку с layout)
    requestAnimationFrame(() => {
      drawXpChart();
      drawTtkChart();
      drawEconChart();
      drawAbChart();
    });
  }
}

function renderSection() {
  const loc = getLoc(lang);
  el.head.textContent = loc['insp_head_' + current];
  el.panel.innerHTML = RENDERERS[current]();
  if (current === 'lab') wireLab();
}

function buildHierarchy() {
  const loc = getLoc(lang);
  el.hierarchy.innerHTML = '';
  for (const s of SECTIONS) {
    const b = document.createElement('button');
    b.className = 'h-item' + (s.id === current ? ' active' : '');
    b.dataset.section = s.id;
    b.innerHTML = `<span class="h-icon">${s.icon}</span><span>${loc['h_' + s.id]}</span><span class="h-sub">${loc['h_' + s.id + '_sub']}</span>`;
    b.addEventListener('click', () => selectSection(s.id));
    el.hierarchy.appendChild(b);
  }
}

function selectSection(id) {
  current = id;
  for (const b of el.hierarchy.querySelectorAll('.h-item')) {
    b.classList.toggle('active', b.dataset.section === id);
  }
  renderSection();
}

// ---------- публичное API ----------

export function initInspector(currentLang, callbacks) {
  lang = currentLang;
  hooks = callbacks;
  buildHierarchy();
  renderSection();
}

export function applyInspectorLoc(currentLang) {
  lang = currentLang;
  buildHierarchy();
  renderSection();
}

window.addEventListener('resize', () => {
  if (current === 'lab') {
    drawXpChart();
    drawTtkChart();
    drawEconChart();
    drawAbChart();
  }
});
