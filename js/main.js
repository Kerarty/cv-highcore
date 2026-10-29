// Сборка: язык, переключение экранов (интро → бой → инспектор),
// отложенное создание боя после загрузки шрифта.

import { getLoc, LOC } from './loc.js';
import { REQUIREMENTS } from './data.js';
import { createBattle, PLAYER_COLOR } from './game.js';
import { createTankPreview } from './preview.js';
import { initBattleUI, applyBattleLoc, startRematch } from './ui.js';
import { initInspector, applyInspectorLoc } from './inspector.js';

let lang = localStorage.getItem('cv-lang') || 'ru';
let battle = null;
let battleUiInited = false;

const screens = {
  intro: document.getElementById('screen-intro'),
  battle: document.getElementById('screen-battle'),
  inspector: document.getElementById('screen-inspector'),
};

const btn = {
  fight: document.getElementById('btn-fight'),
  skip: document.getElementById('btn-skip'),
  back: document.getElementById('btn-back'),
  lang: document.getElementById('btn-lang'),
  cv: document.getElementById('btn-cv'),
  toBattle: document.getElementById('btn-to-battle'),
  rematch2: document.getElementById('btn-rematch2'),
};

// ---------- локализация статических экранов ----------

function applyStaticLoc() {
  const loc = getLoc(lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-loc]').forEach((elm) => {
    const key = elm.dataset.loc;
    if (loc[key] === undefined) return;
    if (key === 'intro_title') {
      const [line1, line2] = loc[key].split('\n');
      elm.innerHTML = `${line1}<br><span class="grad">${line2 || ''}</span>`;
    } else {
      elm.textContent = loc[key];
    }
  });
  btn.cv.textContent = loc.topbar_cv;
  btn.skip.textContent = loc.topbar_skip;
  btn.back.textContent = loc.topbar_back;
  btn.lang.textContent = lang === 'ru' ? 'EN' : 'RU';

  const chipsEl = document.getElementById('intro-chips');
  chipsEl.innerHTML = '';
  for (const req of REQUIREMENTS) {
    const chip = document.createElement('span');
    chip.className = 'intro-chip';
    chip.style.borderColor = req.color;
    chip.style.color = req.color;
    chip.textContent = `${req.icon} ${loc['req_' + req.id]}`;
    chipsEl.appendChild(chip);
  }

  const badgesEl = document.getElementById('intro-badges');
  badgesEl.innerHTML = '';
  for (const key of ['intro_badge1', 'intro_badge2', 'intro_badge3']) {
    const badge = document.createElement('span');
    badge.className = 'intro-badge';
    badge.textContent = loc[key];
    badgesEl.appendChild(badge);
  }
}

// ---------- экраны ----------

function showScreen(name) {
  for (const [k, s] of Object.entries(screens)) s.classList.toggle('hidden', k !== name);
  btn.skip.classList.toggle('hidden', name === 'inspector');
  btn.back.classList.toggle('hidden', name !== 'inspector');
  // над Unity-тёмным инспектором топбар тоже тёмный, над ареной — светлый
  document.getElementById('topbar').classList.toggle('dark', name === 'inspector');
}

function showInspector() {
  showScreen('inspector');
}

async function ensureBattle() {
  if (battle) return battle;
  await Promise.all([
    document.fonts.load('900 24px Nunito'),
    document.fonts.load('700 14px Nunito'),
    document.fonts.load('400 20px Nunito'),
  ]);
  battle = await createBattle(document.getElementById('battle-stage'), () => LOC[lang]);
  return battle;
}

function ensureBattleUi() {
  if (battleUiInited) return;
  initBattleUI(battle, lang, {
    onInspector: showInspector,
    onRematch: () => {},
  });
  battleUiInited = true;
}

async function startFight() {
  showScreen('battle');
  await ensureBattle();
  ensureBattleUi();
}

async function rematchFromLab() {
  await ensureBattle();
  ensureBattleUi();
  showScreen('battle');
  startRematch();
}

// ---------- события ----------

function showBattleAfterVictory() {
  showScreen('battle');
  // после победы возвращаем игрока на экран победы, а не на пустую арену
  if (battle && battle.won) {
    document.getElementById('victory').classList.remove('hidden');
  }
}

btn.fight.addEventListener('click', startFight);
btn.skip.addEventListener('click', showInspector);
btn.toBattle.addEventListener('click', () => {
  if (battle) showBattleAfterVictory();
  else startFight();
});
btn.back.addEventListener('click', () => {
  if (battle) showBattleAfterVictory();
  else startFight();
});

btn.lang.addEventListener('click', () => {
  lang = lang === 'ru' ? 'en' : 'ru';
  localStorage.setItem('cv-lang', lang);
  applyStaticLoc();
  applyBattleLoc(lang);
  applyInspectorLoc(lang);
});

// ---------- старт ----------

applyStaticLoc();
initInspector(lang, { onRematch: rematchFromLab });
showScreen('intro');
createTankPreview(document.getElementById('tank-preview'), PLAYER_COLOR);
