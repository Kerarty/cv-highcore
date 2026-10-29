// DOM-интерфейс боя: хотбар способностей с кулдаунами, карточки фактов,
// победа со статистикой, тосты. Работает поверх canvas.

import { ABILITIES, REQUIREMENTS, LINKS } from './data.js';
import { getLoc } from './loc.js';

let battle = null;
let lang = 'ru';
let hooks = { onInspector: () => {} };

const el = {
  hotbar: document.getElementById('hotbar'),
  confidenceFill: document.getElementById('confidence-fill'),
  reqProgress: document.getElementById('req-progress'),
  factCard: document.getElementById('fact-card'),
  factIcon: document.getElementById('fact-icon'),
  factTitle: document.getElementById('fact-title'),
  factText: document.getElementById('fact-text'),
  btnContinue: document.getElementById('btn-continue'),
  victory: document.getElementById('victory'),
  victoryStats: document.getElementById('victory-stats'),
  btnInspector: document.getElementById('btn-inspector'),
  btnRematch: document.getElementById('btn-rematch'),
  toast: document.getElementById('toast'),
};

const abilityButtons = new Map();
const deadChips = new Set();
let toastTimer = null;

// чуть светлее оттенок цвета способности для градиента кнопки
function lighten(hex, f = 1.1) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r}, ${g}, ${b})`;
}

// ---------- хотбар ----------

function buildHotbar() {
  el.hotbar.innerHTML = '';
  abilityButtons.clear();
  const loc = getLoc(lang);
  for (const ab of ABILITIES) {
    const req = REQUIREMENTS.find((r) => r.id === ab.target);
    const b = document.createElement('button');
    b.className = 'ability';
    b.style.background = `linear-gradient(180deg, ${lighten(ab.color)}, ${ab.color})`;
    b.innerHTML = `
      <span class="key">${ab.key}</span>
      <span class="ico">${req.icon}</span>
      <span class="name">${loc['ab_' + ab.id]}</span>
      <span class="target">${loc['tgt_' + ab.target]}</span>
      <div class="cd-overlay"></div>
    `;
    b.addEventListener('click', () => battle && battle.useAbility(ab.id));
    el.hotbar.appendChild(b);
    abilityButtons.set(ab.id, {
      root: b,
      overlay: b.querySelector('.cd-overlay'),
      lastFrac: -1,
    });
  }
}

function tickCooldowns() {
  if (!battle) return;
  for (const [id, ui] of abilityButtons) {
    const frac = battle.getCdFraction(id);
    if (frac !== ui.lastFrac) {
      if (ui.lastFrac > 0 && frac === 0) {
        // готовность: короткая вспышка
        ui.root.classList.add('ready');
        setTimeout(() => ui.root.classList.remove('ready'), 450);
      }
      ui.lastFrac = frac;
      ui.overlay.style.height = `${frac * 100}%`;
      ui.root.classList.toggle('cd', frac > 0);
    }
  }
  requestAnimationFrame(tickCooldowns);
}

// ---------- HUD ----------

function updateConfidence(v) {
  el.confidenceFill.style.width = `${Math.max(0, Math.min(100, v))}%`;
}

function updateProgress(n) {
  const loc = getLoc(lang);
  el.reqProgress.textContent = loc.hud_req_progress.replace('{n}', String(n));
}

// ---------- карточка факта ----------

function showFactCard(reqId) {
  const loc = getLoc(lang);
  const req = REQUIREMENTS.find((r) => r.id === reqId);
  el.factIcon.textContent = req.icon;
  el.factIcon.style.borderColor = req.color;
  el.factTitle.textContent = loc['fact_title_' + reqId];
  el.factTitle.style.color = req.color;
  el.factText.textContent = loc['fact_text_' + reqId];
  el.factCard.classList.remove('hidden');
  if (battle) battle.setPaused(true);
}

el.btnContinue.addEventListener('click', () => {
  el.factCard.classList.add('hidden');
  if (battle && !battle.won) battle.setPaused(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !el.factCard.classList.contains('hidden')) {
    el.btnContinue.click();
  }
});

// ---------- победа ----------

function showVictory() {
  const loc = getLoc(lang);
  const s = battle.getStats();
  const mm = String(Math.floor(s.time / 60)).padStart(1, '0');
  const ss = String(Math.floor(s.time % 60)).padStart(2, '0');
  el.victoryStats.innerHTML = `
    <div class="vstat"><b>${mm}:${ss}</b><span>${loc.vstat_time}</span></div>
    <div class="vstat"><b>${s.crits}</b><span>${loc.vstat_crits}</span></div>
    <div class="vstat"><b>${s.dmg}</b><span>${loc.vstat_dmg}</span></div>
    <div class="vstat"><b>${s.taken}</b><span>${loc.vstat_taken}</span></div>
  `;
  el.victory.classList.remove('hidden');
}

el.btnRematch.addEventListener('click', () => {
  el.victory.classList.add('hidden');
  startRematch();
});

el.btnInspector.addEventListener('click', () => {
  el.victory.classList.add('hidden');
  hooks.onInspector();
});

// ---------- тост ----------

function showToast(text) {
  const loc = getLoc(lang);
  el.toast.textContent = text || '';
  el.toast.classList.remove('hidden');
  el.toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.style.opacity = '0';
    setTimeout(() => el.toast.classList.add('hidden'), 320);
  }, 2600);
}

// ---------- клавиатура ----------

document.addEventListener('keydown', (e) => {
  if (!battle) return;
  if (!el.factCard.classList.contains('hidden')) return;
  if (!el.victory.classList.contains('hidden')) return;
  const ab = ABILITIES.find((a) => a.key === e.key);
  if (ab) battle.useAbility(ab.id);
});

// ---------- публичное API ----------

export function initBattleUI(b, currentLang, callbacks) {
  battle = b;
  lang = currentLang;
  hooks = callbacks || hooks;
  deadChips.clear();

  buildHotbar();
  updateConfidence(100);
  updateProgress(0);
  el.factCard.classList.add('hidden');
  el.victory.classList.add('hidden');

  battle.onChipDead = (reqId, remaining) => {
    if (!deadChips.has(reqId)) {
      deadChips.add(reqId);
      updateProgress(6 - remaining);
      showFactCard(reqId);
    }
  };
  battle.onConfidence = updateConfidence;
  battle.onVictory = () => {
    el.factCard.classList.add('hidden');
    setTimeout(showVictory, 350);
  };
  battle.onRage = () => showToast(getLoc(lang).boss_fire_rage);
  battle.onCoffee = () => showToast(getLoc(lang).toast_coffee);

  if (!tickCooldowns._running) {
    tickCooldowns._running = true;
    requestAnimationFrame(tickCooldowns);
  }
}

export function applyBattleLoc(currentLang) {
  lang = currentLang;
  buildHotbar();
  if (battle) battle.applyLoc();
  updateProgress(6 - deadChips.size);
}

export function startRematch() {
  el.victory.classList.add('hidden');
  el.factCard.classList.add('hidden');
  deadChips.clear();
  const hpMult = (window.__bossHpMult !== undefined) ? window.__bossHpMult : 1;
  battle.reset(hpMult);
  updateConfidence(100);
  updateProgress(0);
}

export { LINKS };
