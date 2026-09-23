'use strict';
// ============================================================
//  Game: player, survival rules, inventory, input, menus, loop
// ============================================================

const $ = id => document.getElementById(id);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const SAVE_KEY = 'blockcraft-save-v2', SETTINGS_KEY = 'blockcraft-settings';
const DAY_LEN = 720, EYE = 1.62, REACH = 5, MOB_REACH = 3.6;

// ---------------- settings ----------------
const settings = { music: 60, sfx: 80, sens: 100, bright: 50, view: 90 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) {}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }

// ---------------- state ----------------
let mode = 'survival', seed = 1, edits = new Map(), time = 0.03, days = 0, spawnPt = [80, 40, 80];
let worldReady = false, session = false, curScreen = 'title', loadingPromise = null;
const P = { x: 80, y: 40, z: 80, vx: 0, vy: 0, vz: 0, hw: 0.3, h: 1.8, yaw: 0, pitch: -0.2, onGround: false, flying: false,
  health: 20, food: 20, sat: 5, exh: 0, air: 15, drownT: 0, regenT: 0, fallStart: null, invuln: 0, dead: false,
  sprint: false, stepDist: 0, bob: 0, bobAmt: 0, wasInWater: false, swimT: 0 };
let inv = new Array(36).fill(null), sel = 0;
let sky = skyState(time), target = null, fov = 72, cloudT = 0;
const hand = { swing: 0, swinging: false, lower: 0 };
const mine = { x: -1, y: -1, z: -1, progress: 0, digT: 0, cool: 0 };
const input = { jump: false, down: false, breakHeld: false };
const keys = {}, joy = { x: 0, y: 0 };
let attackCd = 0, eatCd = 0, lastJumpTap = 0;

function skyState(t) {
  const angle = t * Math.PI * 2, sh = Math.sin(angle);
  const day = smoothstep(-0.16, 0.24, sh);
  let fog = lerp3([0.035, 0.05, 0.11], [0.56, 0.76, 0.97], day);
  const glow = Math.max(0, 1 - Math.abs(sh) / 0.3);
  fog = lerp3(fog, [0.96, 0.56, 0.32], glow * 0.45);
  return { angle, day, sun: 0.4 + 0.6 * day, fog };
}

// ---------------- inventory helpers ----------------
const maxStack = id => ITEMS[id].stack;
let invDirty = true;
function invChanged() { invDirty = true; if (curScreen === 'inventory') renderInventory(); }
function addItem(id, count, dur) {
  if (maxStack(id) > 1) for (let i = 0; i < 36 && count > 0; i++) {
    const s = inv[i];
    if (s && s.id === id && s.count < maxStack(id)) { const k = Math.min(count, maxStack(id) - s.count); s.count += k; count -= k; }
  }
  for (let i = 0; i < 36 && count > 0; i++) {
    if (inv[i]) continue;
    const k = Math.min(count, maxStack(id));
    inv[i] = { id, count: k, dur: dur !== undefined ? dur : ITEMS[id].dur };
    count -= k;
  }
  invChanged();
  return count;
}
function countItem(id) { let n = 0; for (const s of inv) if (s && s.id === id) n += s.count; return n; }
function removeItem(id, n) {
  for (let i = 35; i >= 0 && n > 0; i--) {
    const s = inv[i];
    if (!s || s.id !== id) continue;
    const k = Math.min(n, s.count); s.count -= k; n -= k;
    if (!s.count) inv[i] = null;
  }
  invChanged();
}
const held = () => inv[sel];
function consumeHeld() {
  if (mode === 'creative') return;
  const s = inv[sel]; if (!s) return;
  if (--s.count <= 0) inv[sel] = null;
  invChanged();
}
function damageTool(n) {
  if (mode === 'creative') return;
  const s = inv[sel];
  if (!s || !ITEMS[s.id].tool) return;
  s.dur -= n;
  if (s.dur <= 0) { inv[sel] = null; Sound.play('brk', 'wood'); toast(`Your ${ITEMS[s.id].name} broke!`); }
  invChanged();
}

// ---------------- world editing ----------------
function setBlock(x, y, z, b) {
  if (!inWorld(x, y, z)) return;
  const i = idx(x, y, z), old = world[i];
  if (old === b) return;
  world[i] = b; edits.set(i, b);
  relight(x, z);
  const ch = chunks[(z >> 4) * NCX + (x >> 4)];
  uploadChunk(ch);
  if ((x & 15) === 0 || (x & 15) === 15 || (z & 15) === 0 || (z & 15) === 15) markDirtyBox(x - 1, z - 1, x + 1, z + 1);
  // plants and torches pop off when the block under them goes
  const above = get(x, y + 1, z);
  if (BLOCKS[above] && BLOCKS[above].needsFloor && !OPAQUE[b]) {
    if (mode === 'survival') { const d = blockDrops(above, Math.random); if (d) spawnDrop(d[0], d[1], x + 0.5, y + 1.3, z + 0.5); }
    setBlock(x, y + 1, z, AIR);
  }
  // sand and gravel fall
  if (!SOLID[b]) settle(x, y + 1, z);
  if (BLOCKS[b].falls) settle(x, y, z);
  scheduleSave();
}
function settle(x, y, z) {
  const b = get(x, y, z);
  if (!BLOCKS[b] || !BLOCKS[b].falls || y <= 0 || SOLID[get(x, y - 1, z)]) return;
  let ty = y - 1;
  while (ty > 0 && !SOLID[get(x, ty - 1, z)]) ty--;
  setBlock(x, ty, z, b);
  setBlock(x, y, z, AIR);
}
const LIGHT_R = 16;
function relight(x, z) {
  const x0 = Math.max(0, x - LIGHT_R), x1 = Math.min(WX - 1, x + LIGHT_R), z0 = Math.max(0, z - LIGHT_R), z1 = Math.min(WZ - 1, z + LIGHT_R);
  const w = x1 - x0 + 1, rows = [];
  for (let y = 0; y < WY; y++) for (let zz = z0; zz <= z1; zz++) {
    const s = idx(x0, y, zz);
    rows.push(s, skyL.slice(s, s + w), blkL.slice(s, s + w));
  }
  computeLight(x0, z0, x1, z1);
  const dirty = new Set();
  for (let r = 0; r < rows.length; r += 3) {
    const s = rows[r], os = rows[r + 1], ob = rows[r + 2];
    for (let k = 0; k < w; k++) {
      if (os[k] === skyL[s + k] && ob[k] === blkL[s + k]) continue;
      const cx = x0 + k, cz = Math.floor(s / WX) % WZ;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, nz = cz + dz;
        if (nx >= 0 && nz >= 0 && nx < WX && nz < WZ) dirty.add((nz >> 4) * NCX + (nx >> 4));
      }
    }
  }
  for (const c of dirty) chunks[c].dirty = true;
}

// ---------------- targeting ----------------
function lookDir() {
  const cp = Math.cos(P.pitch);
  return [-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp];
}
function raycastBlocks(o, d, maxD) {
  let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
  const sx = d[0] > 0 ? 1 : -1, sy = d[1] > 0 ? 1 : -1, sz = d[2] > 0 ? 1 : -1;
  const tdx = d[0] ? Math.abs(1 / d[0]) : Infinity, tdy = d[1] ? Math.abs(1 / d[1]) : Infinity, tdz = d[2] ? Math.abs(1 / d[2]) : Infinity;
  let tx = d[0] ? (d[0] > 0 ? x + 1 - o[0] : o[0] - x) * tdx : Infinity;
  let ty = d[1] ? (d[1] > 0 ? y + 1 - o[1] : o[1] - y) * tdy : Infinity;
  let tz = d[2] ? (d[2] > 0 ? z + 1 - o[2] : o[2] - z) * tdz : Infinity;
  let px = x, py = y, pz = z, t = 0;
  while (t <= maxD) {
    if (!inWorld(x, y, z)) return null;
    const b = world[idx(x, y, z)];
    if (b !== AIR && b !== WATER) return { x, y, z, px, py, pz, b, t };
    px = x; py = y; pz = z;
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; }
    else { z += sz; t = tz; tz += tdz; }
  }
  return null;
}
function eyePos() { return [P.x, P.y + EYE, P.z]; }
function computeTarget() {
  if (P.dead) { target = null; return; }
  const o = eyePos(), d = lookDir();
  const bh = raycastBlocks(o, d, REACH);
  const mh = rayMob(o, d, Math.min(MOB_REACH, bh ? bh.t : MOB_REACH));
  target = mh ? { mob: mh.mob } : bh;
  crossEl.classList.toggle('mob', !!mh);
}

// ---------------- actions ----------------
function canHarvest(b, it) {
  const B = BLOCKS[b];
  if (B.tier < 0) return true;
  const tool = it && ITEMS[it.id].tool;
  return !!tool && tool.kind === B.tool && tool.tier >= B.tier;
}
function breakTime(b, it) {
  const B = BLOCKS[b];
  if (B.hardness < 0) return Infinity;
  if (B.hardness === 0) return 0.05;
  const tool = it && ITEMS[it.id].tool;
  const right = tool && B.tool !== null && tool.kind === B.tool;
  let speed = right ? TOOL_SPEED[tool.tier] : 1;
  if (tool && tool.kind === SWORD && b === LEAVES) speed = 3;
  let t = B.hardness * (canHarvest(b, it) ? 1.5 : 5) / speed;
  if (waterAt(P.x, P.y + EYE, P.z)) t *= 5;
  if (!P.onGround && !P.flying && !waterAt(P.x, P.y + 0.4, P.z)) t *= 5;
  return t;
}
// brightest light on any side of a block (its own cell is dark when it is solid)
function blockFaceLight(x, y, z) {
  let s = 0, b = 0;
  for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    s = Math.max(s, skyAt(x + dx, y + dy, z + dz)); b = Math.max(b, blkAt(x + dx, y + dy, z + dz));
  }
  return brightness(s, b, sky.sun, settings.bright / 100);
}
function swingHand() { hand.swing = 0.0001; hand.swinging = true; }
function breakAt(h) {
  const b = h.b, it = held();
  if (BLOCKS[b].hardness < 0) return;
  const wet = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([a, c, e]) => get(h.x + a, h.y + c, h.z + e) === WATER);
  const br = blockFaceLight(h.x, h.y, h.z);
  spawnParticles(BLOCKS[b].tex[SHAPE[b] === 'cube' ? 2 : 0], h.x, h.y, h.z, 22, { bright: br });
  Sound.play('brk', BLOCKS[b].snd);
  setBlock(h.x, h.y, h.z, wet ? WATER : AIR);
  if (mode === 'survival') {
    if (canHarvest(b, it)) {
      const d = blockDrops(b, Math.random);
      if (d) spawnDrop(d[0], d[1], h.x + 0.5, h.y + 0.4, h.z + 0.5);
    }
    P.exh += 0.025;
    if (it && ITEMS[it.id].tool && BLOCKS[b].hardness > 0) damageTool(ITEMS[it.id].tool.kind === SWORD ? 2 : 1);
  }
  buzz(15);
}
function playerOverlaps(x, y, z) {
  return x + 1 > P.x - P.hw && x < P.x + P.hw && z + 1 > P.z - P.hw && z < P.z + P.hw && y + 1 > P.y && y < P.y + P.h;
}
function placeBlock(h) {
  const it = held();
  if (!it || !ITEMS[it.id].block) return false;
  const id = it.id;
  let x = h.px, y = h.py, z = h.pz;
  if (REPLACEABLE[h.b]) { x = h.x; y = h.y; z = h.z; }
  if (!inWorld(x, y, z) || y < 1) return false;
  if (!REPLACEABLE[world[idx(x, y, z)]] || world[idx(x, y, z)] === id) return false;
  if (BLOCKS[id].needsFloor && !OPAQUE[get(x, y - 1, z)]) return false;
  if (SOLID[id]) {
    if (playerOverlaps(x, y, z)) return false;
    for (const m of mobs) if (x + 1 > m.x - m.hw && x < m.x + m.hw && z + 1 > m.z - m.hw && z < m.z + m.hw && y + 1 > m.y && y < m.y + m.h) return false;
  }
  setBlock(x, y, z, id);
  Sound.play('place', BLOCKS[id].snd);
  consumeHeld();
  swingHand(); buzz(8);
  return true;
}
function eatHeld() {
  const it = held();
  if (!it || !ITEMS[it.id].food || mode !== 'survival' || P.food >= 20 || eatCd > 0) return false;
  const [h, s] = ITEMS[it.id].food;
  P.food = Math.min(20, P.food + h); P.sat = Math.min(P.food, P.sat + s);
  eatCd = 0.8;
  Sound.play('eat'); Sound.play('burp');
  const e = eyePos(), d = lookDir();
  spawnParticles(ITEMS[it.id].tile, e[0] + d[0] * 0.5 - 0.5, e[1] - 0.3 - 0.5, e[2] + d[2] * 0.5 - 0.5, 10, { spread: 0.3, up: 1.5, size: 0.05 });
  consumeHeld(); swingHand();
  if (it.id === FLESH && Math.random() < 0.8) { P.sat = 0; toast('That tasted awful...'); }
  return true;
}
function attackMob(m) {
  if (attackCd > 0) return;
  attackCd = 0.35;
  swingHand();
  const it = held();
  let dmg = it && ITEMS[it.id].damage ? ITEMS[it.id].damage : 1;
  if (!P.onGround && P.vy < -1 && !P.flying) {
    dmg *= 1.5;
    spawnParticles(T.snow, m.x - 0.5, m.y + m.h * 0.6, m.z - 0.5, 8, { spread: 0.8, size: 0.05 });
  }
  Sound.play('hit');
  hurtMob(m, dmg, P, G);
  if (it && ITEMS[it.id].tool) damageTool(ITEMS[it.id].tool.kind === SWORD ? 1 : 2);
  P.exh += 0.1;
}
// tap / right click
function useAction() {
  if (!target || P.dead) { eatHeld(); return; }
  if (target.mob && target.mob.type === 'villager') { interactVillager(target.mob); return; }
  if (target.mob) { attackMob(target.mob); return; }
  if (target.b === TABLE || target.b === FURNACE) { openInventory(); return; }
  if (eatHeld()) return;
  placeBlock(target);
}
// press of the break control (click / start of hold)
function primaryPress() {
  if (target && target.mob) { attackMob(target.mob); return; }
  input.breakHeld = true;
  if (!target) swingHand();
}
function updateMining(dt) {
  mine.cool -= dt;
  if (!input.breakHeld || !target || target.mob || P.dead) {
    mine.progress = 0; mine.x = -1;
    if (input.breakHeld && target && target.mob && attackCd <= 0) attackMob(target.mob);
    return;
  }
  const h = target;
  if (h.x !== mine.x || h.y !== mine.y || h.z !== mine.z) { mine.x = h.x; mine.y = h.y; mine.z = h.z; mine.progress = 0; mine.digT = 0; }
  if (!hand.swinging) swingHand();
  if (mode === 'creative') {
    if (mine.cool <= 0) { breakAt(h); mine.cool = 0.25; }
    return;
  }
  const bt = breakTime(h.b, held());
  if (bt === Infinity) return;
  mine.progress += dt / bt;
  mine.digT -= dt;
  if (mine.digT <= 0) { mine.digT = 0.24; Sound.play('dig', BLOCKS[h.b].snd); }
  if (mine.progress >= 1) { breakAt(h); mine.progress = 0; mine.x = -1; }
}
function throwHeld(all) {
  const s = held(); if (!s) return;
  const n = all ? s.count : 1;
  const e = eyePos(), d = lookDir();
  spawnDrop(s.id, n, e[0] + d[0] * 0.4, e[1] - 0.3, e[2] + d[2] * 0.4, s.dur, d);
  s.count -= n; if (s.count <= 0) inv[sel] = null;
  invChanged(); swingHand();
}
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

// ---------------- damage & death ----------------
const DEATH_MSG = { zombie: 'You were slain by a zombie.', fall: 'You hit the ground too hard.', drown: 'You drowned.', starve: 'You starved to death.' };
function hurtPlayer(dmg, from, cause) {
  if (mode !== 'survival' || P.dead || P.invuln > 0) return;
  P.health = Math.max(0, P.health - dmg);
  P.invuln = 0.6; P.exh += 0.1;
  Sound.play('hurt'); buzz(60);
  vignette.classList.add('on'); setTimeout(() => vignette.classList.remove('on'), 120);
  if (from) {
    const kx = P.x - from.x, kz = P.z - from.z, kd = Math.hypot(kx, kz) || 1;
    P.vx = kx / kd * 7; P.vz = kz / kd * 7; P.vy = 5;
  }
  if (P.health <= 0) die(DEATH_MSG[cause || (from ? from.type : '')] || 'You died.');
}
function die(msg) {
  P.dead = true; input.breakHeld = false;
  Sound.play('death');
  for (let i = 0; i < 36; i++) if (inv[i]) { spawnDrop(inv[i].id, inv[i].count, P.x, P.y + 1, P.z, inv[i].dur); inv[i] = null; }
  invChanged();
  $('deathMsg').textContent = msg;
  showScreen('death');
  save();
}
function respawn() {
  Object.assign(P, { x: spawnPt[0], y: spawnPt[1], z: spawnPt[2], vx: 0, vy: 0, vz: 0, health: 20, food: 20, sat: 5, exh: 0,
    air: 15, dead: false, fallStart: null, invuln: 1 });
  if (boxHits(P.x, P.y, P.z, P.hw, P.h)) findSpawn(true);
  showScreen(null);
  save();
}

// ---------------- player movement ----------------
function updatePlayer(dt) {
  const active = curScreen === null && !P.dead;
  let mx = 0, mz = 0, jump = false, down = false, sprintKey = false;
  if (active) {
    mx = joy.x + (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    mz = -joy.y + (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    jump = input.jump || !!keys.Space;
    down = input.down || !!keys.ShiftLeft || !!keys.ShiftRight;
    sprintKey = !!keys.ControlLeft || (Math.hypot(joy.x, joy.y) > 0.92 && joy.y < -0.6);
  }
  const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
  const inWater = waterAt(P.x, P.y + 0.4, P.z);
  P.sprint = sprintKey && mz > 0.4 && !inWater && (mode === 'creative' || P.food > 6);
  const speed = P.flying ? (P.sprint ? 17 : 10.5) : inWater ? 2.6 : P.sprint ? 5.9 : 4.3;
  const s = Math.sin(P.yaw), c = Math.cos(P.yaw);
  const wx = (-s * mz + c * mx) * speed, wz = (-c * mz - s * mx) * speed;
  const accel = P.onGround || P.flying ? 14 : inWater ? 6 : 3.5;
  P.vx += (wx - P.vx) * Math.min(1, dt * accel);
  P.vz += (wz - P.vz) * Math.min(1, dt * accel);

  const wasGround = P.onGround;
  if (P.flying) P.vy += (((jump ? 1 : 0) - (down ? 1 : 0)) * 9 - P.vy) * Math.min(1, dt * 10);
  else if (inWater) {
    P.vy -= 12 * dt; if (jump) P.vy = Math.min(P.vy + 40 * dt, 3.6); P.vy = Math.max(P.vy, -4);
  } else {
    P.vy -= 28 * dt;
    if (jump && wasGround) { P.vy = 8.7; if (mode === 'survival') P.exh += P.sprint ? 0.2 : 0.05; if (P.sprint) { P.vx += -s * 2; P.vz += -c * 2; } }
    P.vy = Math.max(P.vy, -50);
  }
  const ox = P.x, oz = P.z;
  const blocked = moveEntity(P, dt);
  // auto-jump up single blocks, like the phone edition
  if (blocked && wasGround && !P.flying && len > 0.2) {
    const tx = P.x + wx / speed * 0.4, tz = P.z + wz / speed * 0.4;
    if (boxHits(tx, P.y, tz, P.hw, P.h) && !boxHits(tx, P.y + 1.05, tz, P.hw, P.h) && !boxHits(P.x, P.y + 1.05, P.z, P.hw, P.h)) P.vy = 8.7;
  }
  if (P.flying && P.onGround && down) P.flying = false;
  const moved = Math.hypot(P.x - ox, P.z - oz);

  // hunger from moving
  if (mode === 'survival') P.exh += moved * (inWater ? 0.015 : P.sprint ? 0.1 : 0.01);

  // footsteps
  if (P.onGround && moved > 0) {
    P.stepDist += moved;
    if (P.stepDist > (P.sprint ? 2.2 : 1.8)) {
      P.stepDist = 0;
      const below = get(Math.floor(P.x), Math.floor(P.y - 0.2), Math.floor(P.z));
      if (below) Sound.play('step', BLOCKS[below].snd);
    }
  }
  if (inWater && moved > 0.001) { P.swimT -= dt; if (P.swimT <= 0) { P.swimT = 0.8; Sound.play('swim'); } }
  if (inWater && !P.wasInWater && P.vy < -3) Sound.play('splash');
  P.wasInWater = inWater;
  P.bob += moved * 2.2;
  P.bobAmt += ((P.onGround && moved > 0.001 ? 1 : 0) - P.bobAmt) * Math.min(1, dt * 8);

  // fall damage
  if (P.onGround) {
    if (P.fallStart !== null) {
      const dist = P.fallStart - P.y;
      if (dist > 1.2) { const below = get(Math.floor(P.x), Math.floor(P.y - 0.2), Math.floor(P.z)); if (below) Sound.play('land', BLOCKS[below].snd); }
      if (dist > 3.4) hurtPlayer(Math.floor(dist - 3), null, 'fall');
    }
    P.fallStart = null;
  } else if (inWater || P.flying) P.fallStart = null;
  else if (P.fallStart === null || P.y > P.fallStart) P.fallStart = P.y;

  if (P.y < -30) { P.y = spawnPt[1]; P.x = spawnPt[0]; P.z = spawnPt[2]; }
}

function updateSurvival(dt) {
  P.invuln -= dt;
  if (mode !== 'survival' || P.dead) return;
  while (P.exh >= 4) { P.exh -= 4; if (P.sat > 0) P.sat = Math.max(0, P.sat - 1); else P.food = Math.max(0, P.food - 1); }
  P.regenT += dt;
  if (P.food >= 18 && P.health < 20) {
    if (P.regenT >= 3) { P.regenT = 0; P.health = Math.min(20, P.health + 1); P.exh += 3; }
  } else if (P.food <= 0) {
    if (P.regenT >= 4) { P.regenT = 0; if (P.health > 1) hurtPlayer(1, null, 'starve'); }
  } else P.regenT = Math.min(P.regenT, 3);
  if (waterAt(P.x, P.y + EYE, P.z)) {
    P.air -= dt;
    if (P.air <= 0) { P.air = 0; P.drownT += dt; if (P.drownT >= 1) { P.drownT = 0; hurtPlayer(2, null, 'drown'); } }
  } else { P.air = Math.min(15, P.air + dt * 6); P.drownT = 0; }
}

// ---------------- items on the ground ----------------
function updateDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.age += dt;
    if (d.age > 300 || d.y < -10) { drops.splice(i, 1); continue; }
    const inW = waterAt(d.x, d.y + 0.1, d.z);
    d.vy = inW ? Math.min(d.vy + 12 * dt, 1) : Math.max(d.vy - 20 * dt, -30);
    const f = d.onGround ? Math.pow(0.01, dt) : Math.pow(0.5, dt);
    d.vx *= f; d.vz *= f;
    moveEntity(d, dt);
    d.bright = lightAt(d.x, d.y + 0.2, d.z, sky.sun, settings.bright / 100);
    if (P.dead || d.age < d.pickup) continue;
    const dx = P.x - d.x, dy = P.y + 0.8 - d.y, dz = P.z - d.z, dist = Math.hypot(dx, dy, dz);
    if (dist < 1.9) {
      const k = Math.min(1, dt * 10);
      d.x += dx * k; d.y += dy * k; d.z += dz * k;
      if (dist < 0.8) {
        const left = addItem(d.id, d.count, d.dur);
        if (left < d.count) Sound.play('pop');
        if (left === 0) drops.splice(i, 1); else d.count = left;
      }
    }
  }
}
function dropLoot(m) {
  if (m.type === 'villager') villagerDied(m);
  if (m.type === 'pig') spawnDrop(PORK, 1 + Math.floor(Math.random() * 3), m.x, m.y + 0.5, m.z);
  if (m.type === 'zombie') { const n = Math.floor(Math.random() * 3); if (n) spawnDrop(FLESH, n, m.x, m.y + 0.5, m.z); }
}
function soundAt(name, x, y, z) {
  const e = eyePos(), dx = x - e[0], dy = y - e[1], dz = z - e[2], d = Math.hypot(dx, dy, dz);
  if (d > 30) return;
  const pan = d > 0.5 ? (dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d : 0;
  Sound.play(name, pan * 0.8, Math.max(0.05, 1 - d / 30));
}
const G = { P, get survival() { return mode === 'survival'; }, get sky() { return sky; }, get gamma() { return settings.bright / 100; },
  hurtPlayer, soundAt, dropLoot };

// ---------------- mob spawning ----------------
let spawnT = 2;
function surfaceSpot(x, z) {
  const y = topY(x, z);
  const b = world[idx(x, y, z)];
  if (b === WATER || !SOLID[b]) return null;
  if (solidAt(x, y + 1, z) || solidAt(x, y + 2, z) || get(x, y + 1, z) === WATER) return null;
  return y + 1;
}
function spawnTick(dt) {
  spawnT -= dt; if (spawnT > 0) return;
  spawnT = 1;
  let zombies = 0, pigs = 0;
  for (const m of mobs) { if (m.type === 'zombie') zombies++; else if (m.type === 'pig') pigs++; }
  if (zombies < 8) for (let tries = 0; tries < 4; tries++) {
    const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 22;
    const x = Math.floor(P.x + Math.cos(a) * r), z = Math.floor(P.z + Math.sin(a) * r);
    if (x < 1 || z < 1 || x >= WX - 1 || z >= WZ - 1) continue;
    let y;
    if (Math.random() < 0.5) y = surfaceSpot(x, z);
    else { // caves
      const start = Math.floor(P.y + (Math.random() - 0.5) * 24);
      for (let yy = clamp(start, 2, WY - 3); yy > 1; yy--) {
        if (solidAt(x, yy - 1, z) && !solidAt(x, yy, z) && !solidAt(x, yy + 1, z) && get(x, yy, z) !== WATER) { y = yy; break; }
      }
    }
    if (!y) continue;
    const lvl = Math.max(skyAt(x, y, z) * sky.sun, blkAt(x, y, z));
    if (lvl >= 6.5) continue;
    spawnMob('zombie', x + 0.5, y, z + 0.5);
    break;
  }
  if (pigs < 10 && sky.day > 0.5 && Math.random() < 0.15) {
    const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 24;
    const x = Math.floor(P.x + Math.cos(a) * r), z = Math.floor(P.z + Math.sin(a) * r);
    if (x > 1 && z > 1 && x < WX - 1 && z < WZ - 1) {
      const y = surfaceSpot(x, z);
      if (y && get(x, y - 1, z) === GRASS) spawnMob('pig', x + 0.5, y, z + 0.5);
    }
  }
}
function spawnStartingPigs() {
  for (let i = 0, made = 0; i < 400 && made < 12; i++) {
    const x = 4 + Math.floor(Math.random() * (WX - 8)), z = 4 + Math.floor(Math.random() * (WZ - 8));
    const y = surfaceSpot(x, z);
    if (y && get(x, y - 1, z) === GRASS) { spawnMob('pig', x + 0.5, y, z + 0.5); made++; }
  }
}
function findSpawn(apply) {
  let best = null;
  for (let r = 0; r < 70 && !best; r += 2) for (let k = 0; k < 24 && !best; k++) {
    const a = k / 24 * Math.PI * 2;
    const x = Math.floor(WX / 2 + Math.cos(a) * r), z = Math.floor(WZ / 2 + Math.sin(a) * r);
    const y = surfaceSpot(x, z);
    if (y && y > SEA && (get(x, y - 1, z) === GRASS || get(x, y - 1, z) === SAND)) best = [x + 0.5, y, z + 0.5];
  }
  spawnPt = best || [WX / 2, topY(WX / 2, WZ / 2) + 1, WZ / 2];
  if (apply) Object.assign(P, { x: spawnPt[0], y: spawnPt[1], z: spawnPt[2], vx: 0, vy: 0, vz: 0 });
}

// ============================================================
//  UI
// ============================================================
const crossEl = $('cross'), vignette = $('vignette'), hotbarEl = $('hotbar');
const screens = ['title', 'newworld', 'loading', 'pausemenu', 'settings', 'death', 'inventory'];
let settingsReturn = 'title';
function showScreen(name) {
  for (const s of screens) $(s).classList.toggle('hide', s !== name);
  curScreen = name;
  document.body.classList.toggle('paused', !!name);
  if (name) { input.breakHeld = false; input.jump = input.down = false; joy.x = joy.y = 0; releaseTouches(); }
  if (name && document.pointerLockElement) { expectUnlock = true; document.exitPointerLock(); }
  if (name === 'title') Sound.setMood('menu');
}

let toastT = 0, nameT = 0;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
function showHeldName() {
  const s = held(), el = $('blockname');
  el.textContent = s ? ITEMS[s.id].name : '';
  el.classList.add('show'); clearTimeout(nameT); nameT = setTimeout(() => el.classList.remove('show'), 1200);
}
function select(i) {
  const n = (i + 9) % 9;
  if (n !== sel) hand.lower = 0.35;
  sel = n; invDirty = true; showHeldName();
}

// ---- slot element used by the hotbar and the inventory
function slotEl(s, extra) {
  const el = document.createElement('div'); el.className = 'slot' + (extra ? ' ' + extra : '');
  if (s) {
    const img = document.createElement('img'); img.src = iconURL(s.id); img.alt = ''; el.appendChild(img);
    if (s.count > 1) { const b = document.createElement('b'); b.textContent = s.count; el.appendChild(b); }
    const it = ITEMS[s.id];
    if (it.tool && s.dur < it.dur) {
      const bar = document.createElement('div'); bar.className = 'dur';
      const f = s.dur / it.dur, i = document.createElement('i');
      i.style.width = (f * 100).toFixed(0) + '%'; i.style.background = `hsl(${f * 120},90%,45%)`;
      bar.appendChild(i); el.appendChild(bar);
    }
    el.title = it.name;
  }
  return el;
}
function renderHotbar() {
  hotbarEl.textContent = '';
  for (let i = 0; i < 9; i++) {
    const el = slotEl(inv[i], i === sel ? 'sel' : '');
    const pick = e => { e.preventDefault(); e.stopPropagation(); select(i); };
    el.addEventListener('touchstart', pick, { passive: false });
    el.addEventListener('mousedown', pick);
    hotbarEl.appendChild(el);
  }
  const more = document.createElement('div'); more.className = 'slot more'; more.textContent = '•••'; more.title = 'Inventory';
  const open = e => { e.preventDefault(); e.stopPropagation(); openInventory(); };
  more.addEventListener('touchstart', open, { passive: false });
  more.addEventListener('mousedown', open);
  hotbarEl.appendChild(more);
}
// ---- hearts, hunger, air
const statIcons = { hearts: [], food: [], air: [] };
for (const k of ['hearts', 'food', 'air']) for (let i = 0; i < 10; i++) { const el = document.createElement('i'); $(k).appendChild(el); statIcons[k].push(el); }
let statKey = '';
function renderStats() {
  const survival = mode === 'survival';
  $('stats').classList.toggle('hide', !survival);
  if (!survival) return;
  const underwater = waterAt(P.x, P.y + EYE, P.z);
  const bubbles = underwater || P.air < 15 ? Math.ceil(P.air / 1.5) : -1;
  const key = `${P.health}|${P.food}|${bubbles}`;
  if (key === statKey) return;
  statKey = key;
  const setRow = (arr, v, full, halfI, empty) => arr.forEach((el, i) => {
    const r = v - i * 2;
    el.style.backgroundImage = `url(${r >= 2 ? full : r === 1 ? halfI : empty})`;
  });
  setRow(statIcons.hearts, P.health, HUD_ICONS.heart, HUD_ICONS.heartHalf, HUD_ICONS.heartEmpty);
  setRow(statIcons.food, P.food, HUD_ICONS.food, HUD_ICONS.foodHalf, HUD_ICONS.foodEmpty);
  statIcons.air.forEach((el, i) => { el.style.backgroundImage = i < bubbles ? `url(${HUD_ICONS.bubble})` : 'none'; el.style.visibility = bubbles < 0 ? 'hidden' : 'visible'; });
  $('hearts').classList.toggle('low', P.health <= 4);
}

// ---- inventory & crafting screen
let picked = -1, nearTable = false, nearFurnace = false;
function nearBlock(b) {
  const x0 = Math.floor(P.x), y0 = Math.floor(P.y), z0 = Math.floor(P.z);
  for (let y = y0 - 3; y <= y0 + 4; y++) for (let z = z0 - 4; z <= z0 + 4; z++) for (let x = x0 - 4; x <= x0 + 4; x++)
    if (get(x, y, z) === b) return true;
  return false;
}
function openInventory() {
  if (P.dead || !session) return;
  nearTable = nearBlock(TABLE); nearFurnace = nearBlock(FURNACE);
  picked = -1;
  showScreen('inventory');
  renderInventory();
  Sound.play('click');
}
function closeInventory() {
  if (curScreen !== 'inventory') return;
  showScreen(null);
  if (!IS_TOUCH) lockPointer();
}
const stationName = b => b === TABLE ? 'Crafting Table' : 'Furnace';
function recipeReady(r) {
  if (r.at === TABLE && !nearTable) return false;
  if (r.at === FURNACE && !nearFurnace) return false;
  return r.in.every(([id, n]) => countItem(id) >= n);
}
function craft(r) {
  if (!recipeReady(r)) return;
  for (const [id, n] of r.in) removeItem(id, n);
  const left = addItem(r.out[0], r.out[1]);
  if (left) spawnDrop(r.out[0], left, P.x, P.y + 1, P.z);
  Sound.play('craft');
  toast(`Crafted ${r.out[1] > 1 ? r.out[1] + ' ' : ''}${ITEMS[r.out[0]].name}`);
}
function renderInventory() {
  const creative = mode === 'creative';
  $('invTitle').textContent = creative ? 'Creative Inventory' : 'Inventory';
  const recipes = $('recipes');
  recipes.textContent = '';
  if (creative) {
    $('craftTitle').textContent = 'All items — tap to put in your selected slot';
    const pal = document.createElement('div'); pal.id = 'palette';
    for (const id of CREATIVE_ITEMS) {
      const el = slotEl({ id, count: 1 });
      el.addEventListener('click', () => {
        const slot = picked >= 0 ? picked : sel;
        inv[slot] = { id, count: maxStack(id), dur: ITEMS[id].dur };
        picked = -1; Sound.play('click'); invChanged();
      });
      pal.appendChild(el);
    }
    recipes.appendChild(pal);
  } else {
    const where = [nearTable && 'Crafting Table', nearFurnace && 'Furnace'].filter(Boolean);
    $('craftTitle').textContent = 'Crafting' + (where.length ? ' · using ' + where.join(' + ') : ' · stand near a Crafting Table or Furnace for more');
    const list = RECIPES.map(r => ({ r, ok: recipeReady(r) }));
    list.sort((a, b) => b.ok - a.ok);
    for (const { r, ok } of list) {
      const el = document.createElement('button');
      const stationMissing = (r.at === TABLE && !nearTable) || (r.at === FURNACE && !nearFurnace);
      el.className = 'recipe ' + (ok ? 'ok' : 'no') + (stationMissing ? ' station' : '');
      const img = document.createElement('img'); img.src = iconURL(r.out[0]); img.alt = '';
      const name = document.createElement('span'); name.className = 'name';
      name.textContent = (r.out[1] > 1 ? r.out[1] + ' × ' : '') + ITEMS[r.out[0]].name;
      if (r.at) { const sm = document.createElement('small'); sm.textContent = (stationMissing ? 'Needs ' : 'At ') + stationName(r.at); name.appendChild(sm); }
      const ing = document.createElement('span'); ing.className = 'ing';
      for (const [id, n] of r.in) {
        const sp = document.createElement('span'); if (countItem(id) < n) sp.className = 'miss';
        const ii = document.createElement('img'); ii.src = iconURL(id); ii.alt = ITEMS[id].name; sp.title = ITEMS[id].name;
        const b = document.createElement('b'); b.textContent = n;
        sp.append(ii, b); ing.appendChild(sp);
      }
      el.append(img, name, ing);
      el.addEventListener('click', () => craft(r));
      recipes.appendChild(el);
    }
  }
  const bag = $('bagGrid'), hot = $('bagHot');
  bag.textContent = ''; hot.textContent = '';
  for (let i = 0; i < 36; i++) {
    const el = slotEl(inv[i], (i === picked ? 'picked' : '') + (i === sel ? ' cur' : ''));
    el.addEventListener('click', () => slotTap(i));
    (i < 9 ? hot : bag).appendChild(el);
  }
  $('btnDrop').disabled = picked < 0;
  $('invHint').textContent = picked >= 0 ? `${ITEMS[inv[picked].id].name}: tap another slot to move it, or Drop to throw it away.`
    : creative ? 'Bottom row is your hotbar. Tap an item to move it.' : 'Bottom row is your hotbar. Tap an item to move it.';
}
function slotTap(i) {
  Sound.play('click');
  if (picked < 0) {
    if (inv[i]) picked = i;
    if (i < 9) sel = i;
  } else if (picked === i) picked = -1;
  else {
    const a = inv[picked], b = inv[i];
    if (b && b.id === a.id && maxStack(a.id) > 1) {
      const k = Math.min(a.count, maxStack(a.id) - b.count); b.count += k; a.count -= k;
      if (!a.count) inv[picked] = null;
    } else { inv[i] = a; inv[picked] = b; }
    picked = -1;
  }
  invChanged();
}

// ---- menus
function refreshTitle() {
  const saved = hasSave();
  $('btnPlay').textContent = saved ? 'Continue' : 'Play';
  const d = saved ? peekSave() : null;
  $('saveInfo').textContent = d ? `Your world: ${d.mode === 'creative' ? 'Creative' : 'Survival'} · day ${(d.days || 0) + 1}` : '';
}
const SPLASHES = ['Now with survival!', 'Beware the night!', 'Punch trees!', 'Mind the zombies!', 'Try diamonds!', '100% blocks!', 'Craft it yourself!', 'Pigs included!'];
$('splash').textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];

function anyGesture() { Sound.init(); }
document.addEventListener('click', anyGesture, true);
document.addEventListener('touchstart', anyGesture, { capture: true, passive: true });

$('btnPlay').addEventListener('click', () => { hasSave() ? continueGame() : openNewWorld(); });
$('btnNew').addEventListener('click', openNewWorld);
function openNewWorld() { $('overwriteWarn').classList.toggle('hide', !hasSave()); showScreen('newworld'); }
$('btnBack1').addEventListener('click', () => showScreen('title'));
$('modeSurvival').addEventListener('click', () => newGame('survival'));
$('modeCreative').addEventListener('click', () => newGame('creative'));
$('btnSettings1').addEventListener('click', () => openSettings('title'));
$('btnSettings2').addEventListener('click', () => openSettings('pausemenu'));
$('btnSettingsBack').addEventListener('click', () => showScreen(settingsReturn));
$('btnResume').addEventListener('click', resume);
$('btnQuit').addEventListener('click', () => { save(); refreshTitle(); showScreen('title'); });
$('btnRespawn').addEventListener('click', () => { respawn(); if (!IS_TOUCH) lockPointer(); });
$('btnDeathTitle').addEventListener('click', () => { respawn(); save(); refreshTitle(); showScreen('title'); });
$('invClose').addEventListener('click', closeInventory);
$('btnDrop').addEventListener('click', () => {
  if (picked < 0) return;
  const s = inv[picked], e = eyePos(), d = lookDir();
  if (mode === 'survival') spawnDrop(s.id, s.count, e[0] + d[0] * 0.5, e[1] - 0.3, e[2] + d[2] * 0.5, s.dur, d);
  inv[picked] = null; picked = -1; invChanged();
});

function pauseGame() { if (curScreen === null) { showScreen('pausemenu'); save(); } }
function resume() {
  showScreen(null);
  if (!IS_TOUCH) lockPointer();
  else goFullscreen();
}
function goFullscreen() {
  const el = document.documentElement;
  if (!IS_TOUCH || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
}

// ---- settings
const SLIDERS = { sMusic: 'music', sSfx: 'sfx', sSens: 'sens', sBright: 'bright', sView: 'view' };
function applySettings() {
  Sound.setVolume('music', settings.music / 100);
  Sound.setVolume('sfx', settings.sfx / 100);
}
for (const [id, key] of Object.entries(SLIDERS)) {
  const el = $(id), outEl = el.nextElementSibling;
  const show = () => { outEl.textContent = key === 'view' ? settings[key] : settings[key] + '%'; };
  el.value = settings[key]; show();
  el.addEventListener('input', () => { settings[key] = +el.value; show(); applySettings(); saveSettings(); });
}
function openSettings(from) { settingsReturn = from; showScreen('settings'); }
applySettings();

// ============================================================
//  Input
// ============================================================
const layer = $('touch'), stick = $('stick'), knob = $('knob');
const STICK_R = 52;
let stickTouch = null;
const looks = new Map();
function stickHome() {
  stick.style.transform = `translate(${Math.max(96, innerWidth * 0.14)}px, ${innerHeight - 118}px)`;
  knob.style.transform = '';
}
function releaseTouches() {
  for (const L of looks.values()) clearTimeout(L.timer);
  looks.clear(); stickTouch = null; stick.classList.remove('active'); stickHome();
  input.breakHeld = false;
}
layer.addEventListener('touchstart', e => {
  e.preventDefault();
  if (curScreen !== null) return;
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.42 && !stickTouch) {
      stickTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
      stick.style.transform = `translate(${t.clientX}px, ${t.clientY}px)`;
      stick.classList.add('active');
    } else {
      const L = { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t0: performance.now(), moved: false, holding: false, timer: 0 };
      L.timer = setTimeout(() => { L.holding = true; primaryPress(); }, 260);
      looks.set(t.identifier, L);
    }
  }
}, { passive: false });
layer.addEventListener('touchmove', e => {
  e.preventDefault();
  const k = 0.0065 * settings.sens / 100;
  for (const t of e.changedTouches) {
    if (stickTouch && t.identifier === stickTouch.id) {
      let dx = t.clientX - stickTouch.x, dy = t.clientY - stickTouch.y;
      const d = Math.hypot(dx, dy);
      if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      joy.x = dx / STICK_R; joy.y = dy / STICK_R;
      continue;
    }
    const L = looks.get(t.identifier);
    if (!L) continue;
    const dx = t.clientX - L.x, dy = t.clientY - L.y;
    L.x = t.clientX; L.y = t.clientY;
    if (!L.moved && Math.hypot(t.clientX - L.sx, t.clientY - L.sy) > 12) {
      L.moved = true;
      if (!L.holding) clearTimeout(L.timer);
    }
    if (L.moved) look(dx * k, dy * k);
  }
}, { passive: false });
function endTouch(e, cancel) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (stickTouch && t.identifier === stickTouch.id) {
      stickTouch = null; joy.x = joy.y = 0; stick.classList.remove('active'); stickHome();
      continue;
    }
    const L = looks.get(t.identifier);
    if (!L) continue;
    clearTimeout(L.timer);
    if (L.holding) input.breakHeld = false;
    else if (!cancel && !L.moved && curScreen === null && performance.now() - L.t0 < 300) useAction();
    looks.delete(t.identifier);
  }
}
layer.addEventListener('touchend', e => endTouch(e, false), { passive: false });
layer.addEventListener('touchcancel', e => endTouch(e, true), { passive: false });
function look(dyaw, dpitch) {
  P.yaw -= dyaw;
  P.pitch = clamp(P.pitch - dpitch, -1.55, 1.55);
}
function holdButton(el, key, onPress) {
  const on = e => { e.preventDefault(); e.stopPropagation(); input[key] = true; el.classList.add('held'); onPress && onPress(); };
  const off = e => { e.preventDefault(); input[key] = false; el.classList.remove('held'); };
  el.addEventListener('touchstart', on, { passive: false });
  el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
  el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
}
function jumpPressed() {
  const now = performance.now();
  if (mode === 'creative' && now - lastJumpTap < 300) setFlying(!P.flying);
  lastJumpTap = now;
}
holdButton($('jump'), 'jump', jumpPressed);
holdButton($('down'), 'down');
const tapButton = (el, fn) => {
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  el.addEventListener('click', fn);
};
tapButton($('fly'), () => setFlying(!P.flying));
tapButton($('pause'), pauseGame);
function setFlying(on) {
  if (mode !== 'creative') on = false;
  P.flying = on; P.vy = 0;
  $('fly').classList.toggle('on', on);
  $('down').classList.toggle('hide', !on);
}

// ---- mouse & keyboard
let expectUnlock = false;
function lockPointer() {
  if (IS_TOUCH || document.pointerLockElement === layer) return;
  try { const r = layer.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
layer.addEventListener('mousedown', e => {
  if (curScreen !== null || IS_TOUCH) return;
  if (document.pointerLockElement !== layer) { lockPointer(); return; }
  if (e.button === 0) primaryPress();
  else if (e.button === 2) useAction();
});
window.addEventListener('mouseup', e => { if (e.button === 0) input.breakHeld = false; });
document.addEventListener('mousemove', e => {
  if (curScreen === null && document.pointerLockElement === layer) {
    const k = 0.0025 * settings.sens / 100;
    look(e.movementX * k, e.movementY * k);
  }
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === layer) return;
  if (expectUnlock) { expectUnlock = false; return; }
  if (curScreen === null) pauseGame();
});
window.addEventListener('wheel', e => { if (curScreen === null) select(sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.repeat && e.code !== 'KeyQ') { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'KeyE') { if (curScreen === 'inventory') closeInventory(); else if (curScreen === null) openInventory(); return; }
  if (e.code === 'Escape' && curScreen === 'inventory') { closeInventory(); return; }
  if (curScreen !== null) return;
  if (e.code === 'Space') { e.preventDefault(); jumpPressed(); }
  if (e.code === 'KeyF') setFlying(!P.flying);
  if (e.code === 'KeyQ') throwHeld(e.ctrlKey);
  if (/^Digit[1-9]$/.test(e.code)) select(+e.code.slice(5) - 1);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.breakHeld = false; });

// ============================================================
//  Saving & loading
// ============================================================
let saveTimer = 0;
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function peekSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function save() {
  if (!session || !worldReady) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, seed, mode, edits: [...edits], time, days, spawn: spawnPt, sel, inv, villager: villagerSave(),
      p: { x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch, flying: P.flying, health: P.health, food: P.food, sat: P.sat, air: P.air, dead: P.dead } }));
  } catch (e) { toast('Could not save the world (storage full?)'); }
}
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 1500); }

const nextFrame = () => new Promise(r => setTimeout(r, 0));
async function buildWorld(s, editList, progress) {
  worldReady = false;
  seed = s; edits = new Map(editList || []);
  mobs.length = 0; drops.length = 0; particles.length = 0;
  for (const [label, p] of generateWorld(seed, edits)) { progress(label, p); await nextFrame(); }
  for (let i = 0; i < chunks.length; i++) {
    uploadChunk(chunks[i]);
    if (i % 5 === 4) { progress('Building terrain', 0.85 + 0.15 * (i + 1) / chunks.length); await nextFrame(); }
  }
  worldReady = true;
  canvas.style.visibility = 'visible';
}
function loadingUI(label, p) { $('loadText').textContent = label + '…'; $('loadBar').style.width = (p * 100).toFixed(0) + '%'; }

async function newGame(m) {
  showScreen('loading');
  session = false;
  mode = m; time = 0.03; days = 0;
  inv = new Array(36).fill(null); sel = 0;
  loadingPromise = buildWorld((Math.random() * 1e9) | 0, null, loadingUI);
  await loadingPromise;
  findSpawn(true);
  Object.assign(P, { yaw: Math.random() * 6, pitch: -0.15, health: 20, food: 20, sat: 5, exh: 0, air: 15, dead: false, fallStart: null });
  if (mode === 'creative') [GRASS, DIRT, STONE, COBBLE, PLANKS, LOG, GLASS, TORCH, BRICK].forEach((id, i) => inv[i] = { id, count: 64 });
  setFlying(false);
  spawnStartingPigs();
  villagerRespawnDay = -1;
  spawnVillager(null);
  session = true; invDirty = true;
  save();
  startPlaying();
}
async function continueGame() {
  const d = peekSave();
  if (!d) { openNewWorld(); return; }
  showScreen('loading');
  if (!worldReady || d.seed !== seed) {
    if (!(loadingPromise && seed === d.seed)) loadingPromise = buildWorld(d.seed, d.edits, loadingUI);
  }
  await loadingPromise;
  applySave(d);
  startPlaying();
}
function applySave(d) {
  mode = d.mode === 'creative' ? 'creative' : 'survival';
  time = d.time || 0.03; days = d.days || 0;
  spawnPt = d.spawn || spawnPt;
  inv = (d.inv || []).slice(0, 36); while (inv.length < 36) inv.push(null);
  inv = inv.map(s => s && ITEMS[s.id] ? s : null);
  sel = d.sel | 0;
  const p = d.p || {};
  Object.assign(P, { x: p.x ?? spawnPt[0], y: p.y ?? spawnPt[1], z: p.z ?? spawnPt[2], yaw: p.yaw || 0, pitch: p.pitch || 0,
    health: p.health ?? 20, food: p.food ?? 20, sat: p.sat ?? 5, air: p.air ?? 15, dead: false, vx: 0, vy: 0, vz: 0, fallStart: null, exh: 0 });
  setFlying(!!p.flying);
  if (p.dead || P.health <= 0) { Object.assign(P, { x: spawnPt[0], y: spawnPt[1], z: spawnPt[2], health: 20, food: 20 }); }
  if (boxHits(P.x, P.y, P.z, P.hw, P.h)) findSpawn(true);
  if (!mobs.some(m => m.type === 'pig')) spawnStartingPigs();
  for (let i = mobs.length - 1; i >= 0; i--) if (mobs[i].type === 'villager') mobs.splice(i, 1);
  villagerRespawnDay = -1;
  spawnVillager(d.villager || null);
  session = true; invDirty = true;
}
function startPlaying() {
  $('fly').classList.toggle('hide', mode !== 'creative');
  showScreen(null);
  Sound.setMood(sky.day > 0.3 ? 'day' : 'night');
  statKey = '';
  if (!IS_TOUCH) lockPointer(); else goFullscreen();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); if (curScreen === null) pauseGame(); Sound.suspend(); }
  else Sound.init();
});

// ============================================================
//  Main loop
// ============================================================
let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
  if (!stickTouch) stickHome();
}
window.addEventListener('resize', resize);

let moodT = 0, autosaveT = 0;
function update(dt) {
  const prevT = time;
  time = (time + dt / DAY_LEN) % 1;
  if (time < prevT) { days++; villagerNewDay(); }
  sky = skyState(time);
  attackCd -= dt; eatCd -= dt;
  updatePlayer(dt);
  updateSurvival(dt);
  computeTarget();
  if (curScreen === null) updateMining(dt); else { input.breakHeld = false; mine.progress = 0; }
  updateMobs(dt, G);
  updateDrops(dt);
  updateParticles(dt);
  spawnTick(dt);
  if (hand.swinging) { hand.swing += dt / 0.28; if (hand.swing >= 1) { hand.swing = 0; hand.swinging = false; } }
  hand.lower = Math.max(0, hand.lower - dt * 2);
  fov += ((P.sprint ? 80 : 72) - fov) * Math.min(1, dt * 8);
  moodT -= dt;
  if (moodT <= 0) {
    moodT = 2;
    const cave = P.y < topY(clamp(Math.floor(P.x), 0, WX - 1), clamp(Math.floor(P.z), 0, WZ - 1)) - 6 && skyAt(Math.floor(P.x), Math.floor(P.y + 1), Math.floor(P.z)) < 6;
    Sound.setMood(cave ? 'cave' : sky.day > 0.3 ? 'day' : 'night');
  }
  autosaveT += dt;
  if (autosaveT > 20) { autosaveT = 0; save(); }
}

let last = performance.now(), titleYaw = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  cloudT += dt * 1.5;
  if (!worldReady) return;
  const inGame = session && (curScreen === null || curScreen === 'inventory' || curScreen === 'death');
  if (inGame) update(dt);
  else { sky = skyState(time); updateParticles(dt); }

  // remesh a couple of changed chunks per frame, nearest first
  let dirty = chunks.filter(c => c.dirty);
  if (dirty.length) {
    dirty.sort((a, b) => Math.hypot(a.cx * 16 + 8 - P.x, a.cz * 16 + 8 - P.z) - Math.hypot(b.cx * 16 + 8 - P.x, b.cz * 16 + 8 - P.z));
    for (const c of dirty.slice(0, 2)) uploadChunk(c);
  }

  if (invDirty) { renderHotbar(); invDirty = false; }
  if (session) renderStats();

  let yaw = P.yaw, pitch = P.pitch, eye = eyePos();
  if (!session || curScreen === 'title' || curScreen === 'newworld' || (curScreen === 'settings' && settingsReturn === 'title') || curScreen === 'loading') {
    titleYaw += dt * 0.04; yaw = titleYaw; pitch = -0.08;
    eye = session ? eye : [spawnPt[0], spawnPt[1] + 6, spawnPt[2]];
  } else {
    eye[1] += Math.sin(P.bob * 2) * 0.04 * P.bobAmt;
  }
  const playingView = session && (curScreen === null || curScreen === 'inventory' || curScreen === 'pausemenu' || (curScreen === 'settings' && settingsReturn === 'pausemenu'));
  const underwater = waterAt(eye[0], eye[1], eye[2]);
  const gamma = settings.bright / 100;
  const blockTarget = playingView && target && !target.mob ? target : null;
  const it = held();
  const vp = M4.mul(M4.persp(fov * Math.PI / 180, canvas.width / canvas.height, 0.05, 400), M4.view(yaw, pitch, eye));
  updateVillagerHUD(vp, eye, session && curScreen === null);
  renderFrame({
    eye, yaw, pitch, fov, sky, underwater, gamma, viewDist: settings.view, dpr,
    mobs, drops, particles, cloudDrift: cloudT,
    target: blockTarget, crack: blockTarget && mine.progress > 0 && mine.x === blockTarget.x && mine.y === blockTarget.y && mine.z === blockTarget.z ? Math.min(9, Math.floor(mine.progress * 10)) : -1,
    hand: playingView && !P.dead ? { id: it ? it.id : 0, swing: hand.swing, bob: P.bob, lower: hand.lower + (P.bobAmt ? 0 : 0), bright: lightAt(P.x, P.y + EYE, P.z, sky.sun, gamma) } : null,
  });
}

// ---------------- boot ----------------
(function boot() {
  if (!gl) { $('saveInfo').textContent = 'Sorry — this device does not support WebGL, which the game needs.'; return; }
  canvas.style.visibility = 'hidden';
  initRenderer();
  initChunks();
  resize();
  refreshTitle();
  showScreen('title');
  requestAnimationFrame(frame);
  // load the saved world in the background so the title curScreen shows it
  const d = peekSave();
  if (d && typeof d.seed === 'number') {
    spawnPt = d.spawn || spawnPt; time = d.time || 0.03;
    const info = $('saveInfo'), base = info.textContent;
    loadingPromise = buildWorld(d.seed, d.edits, (label, p) => { info.textContent = `${base} · loading ${Math.round(p * 100)}%`; })
      .then(() => { info.textContent = base; });
  }
})();
