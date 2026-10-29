// Бой на PixiJS 8: арена, босс-танк HC-VACANCY с 6 щитами-требованиями,
// танк игрока со способностями, гоминг-снаряды, криты, партиклы.
// Тексты берутся из getLoc() на момент создания; applyLoc обновляет подписи на лету.

import { Application, Container, Graphics, Text } from './vendor/pixi.min.mjs';
import { REQUIREMENTS, ABILITIES, BOSS } from './data.js';

export const PLAYER_COLOR = 0xff8a3d;
const BOSS_COLOR = 0xff4d5e;
const BOSS_SCALE = 2.0;
const OUTLINE = 0x2c3350;

function shade(hex, f = 0.62) {
  const c = typeof hex === 'number' ? hex : parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
}

// мультяшный танк в духе Tanks A Lot: клиновидный нос, катки в ленте,
// купол с кольцом, гофра ствола, флажок — и сердитая морда у босса
export function makeTank(color, scale = 1, opts = {}) {
  const c = new Container();
  const dark = shade(color, 0.62);
  const darker = shade(color, 0.45);

  const shadow = new Graphics();
  shadow.ellipse(0, 32, 42, 10).fill({ color: 0x1e3a12, alpha: 0.28 });
  c.addChild(shadow);

  // гусеницы: скруглённая лента с поперечными сегментами и катками
  const mkTread = (x) => {
    const t = new Graphics();
    t.roundRect(x, -27, 15, 54, 7.5).fill({ color: 0x3b4252 }).stroke({ width: 3, color: OUTLINE });
    for (let wy = -23; wy <= 23; wy += 7.5) {
      t.moveTo(x + 1.5, wy).lineTo(x + 13.5, wy).stroke({ width: 1.5, color: 0x222836, alpha: 0.8 });
    }
    for (let wy = -14; wy <= 14; wy += 14) {
      t.circle(x + 7.5, wy, 3.4).fill({ color: 0xa8b2c1 }).stroke({ width: 1.5, color: 0x222836 });
    }
    return t;
  };
  c.addChild(mkTread(-39), mkTread(24));

  // корпус: тракторный нос-клин (спереди уже), задняя часть шире
  const body = new Graphics();
  body.moveTo(-30, -14);
  body.quadraticCurveTo(-30, -22, -22, -22);
  body.lineTo(10, -22);
  body.quadraticCurveTo(30, -20, 30, -8);
  body.lineTo(30, 8);
  body.quadraticCurveTo(30, 20, 10, 22);
  body.lineTo(-22, 22);
  body.quadraticCurveTo(-30, 22, -30, 14);
  body.closePath();
  body.fill({ color }).stroke({ width: 4, color: dark });
  body.roundRect(-20, -13, 24, 8, 4).fill({ color: 0xffffff, alpha: 0.32 });
  body.roundRect(-20, 5, 16, 6, 3).fill({ color: 0xffffff, alpha: 0.18 });
  c.addChild(body);

  // флажок на антенне — как у новичка в Tanks A Lot
  const flag = new Graphics();
  flag.moveTo(-14, -20).lineTo(-26, -34).stroke({ width: 2.5, color: OUTLINE });
  flag.moveTo(-26, -34).lineTo(-14, -31).lineTo(-26, -26).closePath()
    .fill({ color: 0xffd23f }).stroke({ width: 2, color: OUTLINE });
  c.addChild(flag);

  const turret = new Container();
  const barrel = new Graphics();
  barrel.roundRect(12, -6, 30, 12, 6).fill({ color: dark }).stroke({ width: 3, color: OUTLINE });
  // гофра-кольца на стволе
  barrel.roundRect(19, -7.5, 5, 15, 2.5).fill({ color: darker }).stroke({ width: 2, color: OUTLINE });
  barrel.roundRect(28, -7.5, 5, 15, 2.5).fill({ color: darker }).stroke({ width: 2, color: OUTLINE });
  barrel.roundRect(40, -8, 8, 16, 4).fill({ color: 0x3b4252 }).stroke({ width: 3, color: OUTLINE });
  turret.addChild(barrel);
  const dome = new Graphics();
  dome.circle(0, 0, 16).fill({ color }).stroke({ width: 4, color: dark });
  dome.circle(0, 0, 9.5).stroke({ width: 2.5, color: darker, alpha: 0.85 });
  dome.circle(-6, -7, 5).fill({ color: 0xffffff, alpha: 0.35 });
  turret.addChild(dome);
  if (opts.eyes) {
    const face = new Graphics();
    face.circle(-5, 4, 4).fill({ color: 0xffffff }).stroke({ width: 2, color: OUTLINE });
    face.circle(6, 4, 4).fill({ color: 0xffffff }).stroke({ width: 2, color: OUTLINE });
    face.circle(-4, 5, 1.8).fill({ color: 0x1d2333 });
    face.circle(7, 5, 1.8).fill({ color: 0x1d2333 });
    face.moveTo(-11, -4).lineTo(-2, -1).moveTo(12, -4).lineTo(3, -1).stroke({ width: 2.5, color: OUTLINE });
    turret.addChild(face);
  }
  c.addChild(turret);
  c.scale.set(scale);
  c.turret = turret;
  return c;
}

function txt(str, size, color, weight = '900', outlined = false) {
  return new Text({
    text: str,
    style: {
      fontFamily: 'Nunito, sans-serif',
      fontSize: size,
      fill: color,
      fontWeight: weight,
      ...(outlined ? { stroke: { color: 0x0d1026, width: Math.max(3, size / 5) } } : {}),
    },
  });
}

export async function createBattle(stageEl, getLoc) {
  const battle = {
    onChipDead: null,   // (reqId, remainingCount)
    onConfidence: null, // (value 0..100)
    onVictory: null,
    onRage: null,
    onCoffee: null,
    paused: false,
    won: false,
  };

  const app = new Application();
  await app.init({
    resizeTo: stageEl,
    antialias: true,
    background: 0x7ec850,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  stageEl.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  // ---------- крошечный твин-менеджер ----------
  const tweens = [];
  function tween(dur, fn, onDone = null) {
    tweens.push({ t: 0, dur, fn, onDone });
  }
  function stepTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.fn(p);
      if (p >= 1) {
        tweens.splice(i, 1);
        if (tw.onDone) tw.onDone();
      }
    }
  }

  // ---------- пол: трава-шахматка, забор, декорации — как в Tanks A Lot ----------
  const floor = new Graphics();
  world.addChild(floor);

  function drawFloor() {
    const w = app.screen.width;
    const h = app.screen.height;
    floor.clear();

    const step = 48;
    let row = 0;
    for (let y = 0; y < h; y += step, row++) {
      let col = 0;
      for (let x = 0; x < w; x += step, col++) {
        floor.rect(x, y, step, step).fill({ color: (row + col) % 2 ? 0x74bf49 : 0x7ec850 });
      }
    }

    const crate = (x, y) => {
      floor.rect(x, y, 46, 46).fill({ color: 0xc98f4e }).stroke({ width: 4, color: 0x7a5230 });
      floor.moveTo(x + 5, y + 5).lineTo(x + 41, y + 41)
        .moveTo(x + 41, y + 5).lineTo(x + 5, y + 41)
        .stroke({ width: 4, color: 0x7a5230 });
    };
    const bush = (x, y) => {
      floor.circle(x - 14, y, 16).circle(x + 14, y, 16).circle(x, y - 10, 18)
        .fill({ color: 0x4e9a3d }).stroke({ width: 4, color: 0x2f6b26 });
      floor.circle(x - 6, y - 10, 5).fill({ color: 0x6fbf56, alpha: 0.85 });
    };
    const barrel = (x, y) => {
      floor.circle(x, y, 17).fill({ color: 0xd95f43 }).stroke({ width: 4, color: 0x8c2f1c });
      floor.circle(x, y, 9).stroke({ width: 3, color: 0x8c2f1c });
    };
    crate(w * 0.06, h - 160);
    crate(w * 0.44, 96);
    bush(w * 0.5, h - 140);
    barrel(120, 150);

    // забор: рельсы и столбики по периметру
    floor.rect(0, 4, w, 9).fill({ color: 0x8d6e63 }).stroke({ width: 3, color: 0x5d4037 });
    floor.rect(0, h - 13, w, 9).fill({ color: 0x8d6e63 }).stroke({ width: 3, color: 0x5d4037 });
    floor.rect(4, 0, 9, h).fill({ color: 0x8d6e63 }).stroke({ width: 3, color: 0x5d4037 });
    floor.rect(w - 13, 0, 9, h).fill({ color: 0x8d6e63 }).stroke({ width: 3, color: 0x5d4037 });
    const post = (x, y) => {
      floor.roundRect(x - 7, y - 8, 14, 16, 3).fill({ color: 0xa97c50 }).stroke({ width: 3, color: 0x5d4037 });
    };
    for (let x = 0; x <= w; x += 96) { post(x, 8); post(x, h - 8); }
    for (let y = 96; y < h; y += 96) { post(8, y); post(w - 8, y); }
  }

  // ---------- игрок ----------
  const player = makeTank(PLAYER_COLOR, 1);
  world.addChild(player);
  const playerPos = { x: 200, y: 400 };
  const playerTarget = { x: 200, y: 400 };

  // ---------- босс ----------
  const boss = makeTank(BOSS_COLOR, BOSS_SCALE, { eyes: true });
  world.addChild(boss);
  const bossPos = { x: 0, y: 0 };
  const bossLabel = txt(BOSS.name, 16, '#ffffff', '900', true);
  bossLabel.anchor.set(0.5);
  world.addChild(bossLabel);

  // ---------- щиты-требования ----------
  const chipW = 218;
  const chips = []; // {req, root, hpFill, hp, max, alive}

  for (const req of REQUIREMENTS) {
    const root = new Container();
    const loc = getLoc();

    const bg = new Graphics();
    bg.roundRect(0, 0, chipW, 46, 12).fill({ color: 0xfffbe8, alpha: 0.97 }).stroke({ width: 3.5, color: req.color });
    root.addChild(bg);

    const badge = new Graphics();
    badge.circle(24, 23, 15).fill({ color: 0xffffff }).stroke({ width: 3, color: req.color });
    root.addChild(badge);

    const icon = txt(req.icon, 19, '#ffffff', '400');
    icon.anchor.set(0.5);
    icon.position.set(24, 23);
    root.addChild(icon);

    const label = txt(loc['req_short_' + req.id], 14.5, '#23305e');
    label.position.set(46, 5);
    root.addChild(label);

    const hpBg = new Graphics();
    hpBg.roundRect(46, 29, chipW - 60, 9, 4.5).fill({ color: 0xe3dcc4 }).stroke({ width: 2, color: 0x23305e });
    root.addChild(hpBg);

    const hpFill = new Graphics();
    root.addChild(hpFill);

    world.addChild(root);
    chips.push({ req, root, label, hpFill, hp: req.hp, max: req.hp, alive: true, scale: 1 });
  }

  function redrawChipHp(ch) {
    ch.hpFill.clear();
    const frac = Math.max(0, ch.hp / ch.max);
    if (frac > 0) {
      const color = frac > 0.5 ? 0x57d98f : frac > 0.25 ? 0xffd23f : 0xff4d5e;
      ch.hpFill.roundRect(46, 29, (chipW - 60) * frac, 9, 4.5).fill({ color });
    }
  }

  function chipCenter(ch) {
    return { x: ch.root.x + chipW / 2, y: ch.root.y + 23 };
  }

  function aliveChips() {
    return chips.filter((c) => c.alive);
  }

  // ---------- снаряды / партиклы / попапы ----------
  const projectiles = [];
  const bossShots = [];
  const particles = [];
  const popups = [];

  function spawnParticles(x, y, color, count = 12, speed = 190) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const r = 2 + Math.random() * 3.5;
      g.circle(0, 0, r).fill({ color });
      g.position.set(x, y);
      world.addChild(g);
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      particles.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.55 + Math.random() * 0.3, t: 0 });
    }
  }

  function spawnPopup(x, y, str, color, big = false) {
    const t = txt(str, big ? 21 : 15, color, '900', true);
    t.anchor.set(0.5);
    t.position.set(x, y);
    world.addChild(t);
    popups.push({ t, life: 0.85, t0: 0 });
  }

  // ---------- состояние боя ----------
  let confidence = 100;
  let fireTimer = 2.2;
  let rage = false;
  let shakeT = 0;
  let started = false;
  let startClock = 0;
  let elapsed = 0;
  const cds = {};
  for (const ab of ABILITIES) cds[ab.id] = 0;
  const stats = { crits: 0, dmg: 0, taken: 0 };
  let bossHpMult = 1;

  // указатель
  const pointer = { x: 200, y: 400, active: false };
  stageEl.addEventListener('pointermove', (e) => {
    const rect = app.canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });
  stageEl.addEventListener('pointerdown', (e) => {
    const rect = app.canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });

  // ---------- раскладка ----------
  let lastW = 0;
  let lastH = 0;
  let chipScale = 1;

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    drawFloor();

    chipScale = w < 720 ? 0.78 : 1;
    const step = 52 * chipScale + 2;
    let cy = 14;
    for (const ch of chips) {
      ch.root.scale.set(chipScale);
      ch.root.x = w - chipW * chipScale - 14;
      ch.root.y = cy;
      cy += step;
    }

    bossPos.x = w - 105;
    bossPos.y = Math.max(cy + 70, h * 0.62);
    bossLabel.position.set(bossPos.x, bossPos.y - 62);

    playerPos.x = Math.min(playerPos.x, w - 380);
    playerPos.y = Math.min(Math.max(playerPos.y, 70), h - 80);
  }

  // ---------- урон по чипу ----------
  function damageChip(ch, dmg, crit, splash = false) {
    if (!ch.alive) return;
    ch.hp -= dmg;
    redrawChipHp(ch);
    stats.dmg += dmg;
    const c = chipCenter(ch);
    spawnParticles(c.x, c.y, parseInt(ch.req.color.slice(1), 16), crit ? 16 : 9, crit ? 230 : 160);
    const loc = getLoc();
    if (crit) {
      spawnPopup(c.x, c.y - 34, `${loc.crit_popup}  +${dmg}`, '#ffd23f', true);
      stats.crits++;
      shakeT = 0.22;
    } else {
      spawnPopup(c.x, c.y - 30, `+${dmg}${splash ? ' ' + loc.splash_popup : ''}`, '#eef1ff');
    }
    if (ch.hp > 0) {
      // отдача щита от попадания
      tween(0.14, (p) => {
        const k = 1 + Math.sin(p * Math.PI) * 0.05;
        ch.root.scale.set(chipScale * k);
      });
      if (crit) spawnParticles(c.x, c.y + 18, 0xbdbdbd, 4, 70);
    } else {
      ch.alive = false;
      const left = aliveChips().length;
      tween(0.45, (p) => {
        ch.root.alpha = 1 - p;
        ch.root.scale.set(chipScale * (1 + p * 0.25));
      }, () => { ch.root.visible = false; });
      spawnParticles(c.x, c.y, parseInt(ch.req.color.slice(1), 16), 26, 280);
      spawnParticles(c.x, c.y - 8, 0xbdbdbd, 12, 110);
      if (battle.onChipDead) battle.onChipDead(ch.req.id, left);
      if (left === 3 && !rage) {
        rage = true;
        if (battle.onRage) battle.onRage();
      }
      if (left === 0) winSequence();
    }
  }

  function winSequence() {
    battle.won = true;
    tween(1.0, (p) => {
      boss.rotation = p * Math.PI * 2;
      boss.alpha = 1 - p;
      boss.scale.set(BOSS_SCALE * (1 + p * 0.4));
      bossLabel.alpha = 1 - p;
    }, () => {
      boss.visible = false;
      spawnParticles(bossPos.x, bossPos.y, 0xff4d5e, 46, 340);
      spawnParticles(bossPos.x, bossPos.y, 0xffd23f, 30, 260);
      if (battle.onVictory) battle.onVictory();
    });
  }

  // ---------- способности ----------
  function fireProjectile(from, ability) {
    const alive = aliveChips();
    if (alive.length === 0) return;
    let target = alive.find((c) => c.req.id === ability.target);
    let crit = Boolean(target);
    if (!target) target = alive[Math.floor(Math.random() * alive.length)];

    const g = new Container();
    const glow = new Graphics();
    glow.circle(0, 0, 11).fill({ color: ability.color, alpha: 0.22 });
    const core = new Graphics();
    core.circle(0, 0, 6).fill({ color: 0x2e3446 }).stroke({ width: 2.5, color: 0xffffff });
    core.circle(-2, -2, 1.8).fill({ color: 0xffffff, alpha: 0.9 });
    g.addChild(glow, core);
    g.position.set(from.x, from.y);
    world.addChild(g);
    projectiles.push({ g, ability, target, crit, speed: 640, travel: 0 });
  }

  function useAbility(id) {
    if (battle.paused || battle.won || cds[id] > 0) return;
    const ab = ABILITIES.find((a) => a.id === id);
    if (!ab) return;
    if (!started) {
      started = true;
      startClock = elapsed;
    }
    cds[id] = ab.cd;
    const barrelLen = 40;
    const tip = {
      x: playerPos.x + Math.cos(player.turret.rotation) * barrelLen,
      y: playerPos.y + Math.sin(player.turret.rotation) * barrelLen,
    };
    spawnParticles(tip.x, tip.y, parseInt(ab.color.slice(1), 16), 5, 90);
    fireProjectile(tip, ab);
  }
  battle.useAbility = useAbility;

  battle.getCdFraction = (id) => {
    const ab = ABILITIES.find((a) => a.id === id);
    if (!ab || ab.cd <= 0) return 0;
    return Math.max(0, Math.min(1, cds[id] / ab.cd));
  };

  battle.getStats = () => ({
    time: started ? elapsed - startClock : 0,
    crits: stats.crits,
    dmg: stats.dmg,
    taken: stats.taken,
  });

  battle.setPaused = (v) => { battle.paused = v; };

  battle.reset = (hpMult = 1) => {
    bossHpMult = hpMult;
    battle.won = false;
    battle.paused = false;
    confidence = 100;
    rage = false;
    fireTimer = 2.2;
    started = false;
    elapsed = 0;
    startClock = 0;
    stats.crits = 0;
    stats.dmg = 0;
    stats.taken = 0;
    for (const ab of ABILITIES) cds[ab.id] = 0;
    projectiles.forEach((p) => p.g.destroy());
    projectiles.length = 0;
    bossShots.forEach((p) => p.g.destroy());
    bossShots.length = 0;
    popups.forEach((p) => p.t.destroy());
    popups.length = 0;
    boss.visible = true;
    boss.alpha = 1;
    boss.rotation = 0;
    boss.scale.set(BOSS_SCALE);
    bossLabel.alpha = 1;
    for (const ch of chips) {
      ch.hp = ch.max * bossHpMult;
      ch.alive = true;
      ch.root.visible = true;
      ch.root.alpha = 1;
      ch.root.scale.set(chipScale);
      redrawChipHp(ch);
    }
    if (battle.onConfidence) battle.onConfidence(confidence);
  };

  // ---------- локализация ----------
  battle.applyLoc = () => {
    const loc = getLoc();
    for (const ch of chips) ch.label.text = loc['req_' + ch.req.id];
  };

  // ---------- апдейт ----------
  let lastDt = 0;
  let lastTick = performance.now();
  app.ticker.add((ticker) => {
    const dt = Math.min(0.12, ticker.deltaMS / 1000);
    lastDt = dt;
    lastTick = performance.now();
    const w = app.screen.width;
    const h = app.screen.height;

    layout();
    stepTweens(dt);

    if (!battle.paused && !battle.won) {
      elapsed += dt;

      // игрок к указателю
      if (pointer.active) {
        playerTarget.x = Math.min(Math.max(pointer.x, 50), w - 380);
        playerTarget.y = Math.min(Math.max(pointer.y, 70), h - 80);
      }
      const lerp = 1 - Math.pow(0.0016, dt);
      playerPos.x += (playerTarget.x - playerPos.x) * lerp;
      playerPos.y += (playerTarget.y - playerPos.y) * lerp;
      player.position.set(playerPos.x, playerPos.y);

      // башня игрока — на босса
      player.turret.rotation = Math.atan2(bossPos.y - playerPos.y, bossPos.x - playerPos.x);

      // босс дышит и целится
      boss.position.set(bossPos.x, bossPos.y + Math.sin(elapsed * 2) * 4);
      boss.turret.rotation = Math.PI + Math.sin(elapsed * 0.8) * 0.06;
      bossLabel.y = bossPos.y - 62 + Math.sin(elapsed * 2) * 4;

      // кулдауны
      for (const ab of ABILITIES) if (cds[ab.id] > 0) cds[ab.id] = Math.max(0, cds[ab.id] - dt);

      // снаряды игрока: лимит — пройденная дистанция, а не время,
      // чтобы снаряд долетал при любом FPS
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p.target.alive) {
          const alive = aliveChips();
          if (alive.length === 0) { p.g.destroy(); projectiles.splice(i, 1); continue; }
          p.target = alive[Math.floor(Math.random() * alive.length)];
          p.crit = false;
        }
        const c = chipCenter(p.target);
        const dx = c.x - p.g.x;
        const dy = c.y - p.g.y;
        const d = Math.hypot(dx, dy);
        if (d < 16 * chipScale + 8) {
          const dmg = p.ability.id === 'abtest' ? p.ability.dmg : (p.crit ? p.ability.dmg * 3 : p.ability.dmg);
          damageChip(p.target, Math.round(dmg), p.crit);
          if (p.ability.splash) {
            for (const other of aliveChips()) {
              if (other !== p.target) damageChip(other, Math.round(p.ability.dmg * p.ability.splash), false, true);
            }
          }
          p.g.destroy();
          projectiles.splice(i, 1);
          continue;
        }
        const v = p.speed * dt;
        p.g.x += (dx / d) * v;
        p.g.y += (dy / d) * v;
        p.travel += v;
        if (p.travel > 3000) {
          p.g.destroy();
          projectiles.splice(i, 1);
        }
      }

      // огонь босса
      fireTimer -= dt;
      if (fireTimer <= 0) {
        fireTimer = (rage ? BOSS.fireIntervalRage : BOSS.fireInterval) + (Math.random() - 0.5) * 0.8;
        const muzzle = {
          x: bossPos.x - 70,
          y: bossPos.y + Math.sin(elapsed * 2) * 4,
        };
        const dx = playerPos.x - muzzle.x;
        const dy = playerPos.y - muzzle.y;
        const d = Math.hypot(dx, dy) || 1;
        const g = new Container();
        const glow = new Graphics();
        glow.circle(0, 0, 13).fill({ color: BOSS_COLOR, alpha: 0.2 });
        const core = new Graphics();
        core.circle(0, 0, 8.5).fill({ color: 0xd94353 }).stroke({ width: 2.5, color: 0xffffff });
        core.circle(-2.5, -2.5, 2.2).fill({ color: 0xffffff, alpha: 0.9 });
        const q = txt('?', 13, '#fff', '900', true);
        q.anchor.set(0.5);
        g.addChild(glow, core, q);
        g.position.set(muzzle.x, muzzle.y);
        world.addChild(g);
        bossShots.push({
          g,
          vx: (dx / d) * BOSS.projectileSpeed,
          vy: (dy / d) * BOSS.projectileSpeed,
          travel: 0,
        });
        spawnParticles(muzzle.x, muzzle.y, BOSS_COLOR, 4, 80);
      }

      // снаряды босса
      for (let i = bossShots.length - 1; i >= 0; i--) {
        const s = bossShots[i];
        const step = BOSS.projectileSpeed * dt;
        s.g.x += s.vx * dt;
        s.g.y += s.vy * dt;
        s.travel += step;
        const hitDist = Math.hypot(s.g.x - playerPos.x, s.g.y - playerPos.y);
        if (hitDist < 28) {
          confidence = Math.max(0, confidence - BOSS.dmg);
          stats.taken += BOSS.dmg;
          shakeT = 0.3;
          spawnParticles(s.g.x, s.g.y, BOSS_COLOR, 12, 200);
          s.g.destroy();
          bossShots.splice(i, 1);
          if (confidence <= 0) {
            confidence = 60;
            if (battle.onCoffee) battle.onCoffee();
          }
          if (battle.onConfidence) battle.onConfidence(confidence);
          continue;
        }
        if (s.travel > 2200 || s.g.x < -30 || s.g.x > w + 30 || s.g.y < -30 || s.g.y > h + 30) {
          s.g.destroy();
          bossShots.splice(i, 1);
        }
      }
    }

    // партиклы и попапы живут даже на паузе (завершают анимации)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.g.alpha = Math.max(0, 1 - p.t / p.life);
      if (p.t >= p.life) {
        p.g.destroy();
        particles.splice(i, 1);
      }
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.t0 += dt;
      p.t.y -= 42 * dt;
      p.t.alpha = Math.max(0, 1 - p.t0 / p.life);
      if (p.t0 >= p.life) {
        p.t.destroy();
        popups.splice(i, 1);
      }
    }

    // тряска
    if (shakeT > 0) {
      shakeT -= dt;
      const k = Math.max(0, shakeT) / 0.3;
      world.position.set((Math.random() - 0.5) * 12 * k, (Math.random() - 0.5) * 12 * k);
    } else {
      world.position.set(0, 0);
    }
  });

  battle.reset(1);
  battle.onConfidence && battle.onConfidence(confidence);

  // watchdog: если вкладка не даёт rAF (фон, виртуализация) — крутим тикер таймером;
  // когда rAF жив, ручные тики не срабатывают
  setInterval(() => {
    if (performance.now() - lastTick > 150) app.ticker.update(performance.now());
  }, 50);

  // отладочная ручка (видна только в консоли)
  window.__cvDebug = {
    get elapsed() { return elapsed; },
    get dt() { return lastDt; },
    get projectiles() { return projectiles.length; },
    get paused() { return battle.paused; },
    get won() { return battle.won; },
  };

  return battle;
}
