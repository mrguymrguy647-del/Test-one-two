'use strict';
// ============================================================
//  Physics, mobs, dropped items and particles
// ============================================================

// ---------- axis-aligned box physics shared by everything that moves ----------
function boxHits(x, y, z, hw, h) {
  const x0 = Math.floor(x - hw), x1 = Math.floor(x + hw), y0 = Math.floor(y), y1 = Math.floor(y + h),
    z0 = Math.floor(z - hw), z1 = Math.floor(z + hw);
  for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++)
    if (solidAt(bx, by, bz)) return true;
  return false;
}
function moveAxis(e, axis, d) {
  if (d === 0) return false;
  const steps = Math.ceil(Math.abs(d) / 0.4), s = d / steps;
  for (let i = 0; i < steps; i++) {
    e[axis] += s;
    if (!boxHits(e.x, e.y, e.z, e.hw, e.h)) continue;
    if (axis === 'y') {
      if (s < 0) { e.y = Math.floor(e.y) + 1; e.onGround = true; }
      else e.y = Math.floor(e.y + e.h) - e.h - 0.001;
      e.vy = 0;
    } else {
      e[axis] = s > 0 ? Math.floor(e[axis] + e.hw) - e.hw - 0.001 : Math.floor(e[axis] - e.hw) + 1 + e.hw + 0.001;
      e['v' + axis] = 0;
    }
    return true;
  }
  return false;
}
function moveEntity(e, dt) {
  e.onGround = false;
  const hx = moveAxis(e, 'x', e.vx * dt), hz = moveAxis(e, 'z', e.vz * dt);
  moveAxis(e, 'y', e.vy * dt);
  return hx || hz;
}
const cellOf = e => [Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)];
function waterAt(x, y, z) { return get(Math.floor(x), Math.floor(y), Math.floor(z)) === WATER; }
function lightAt(x, y, z, sun, gamma) {
  const cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z);
  return brightness(skyAt(cx, cy, cz), blkAt(cx, cy, cz), sun, gamma);
}

// ---------- particles ----------
const particles = [];
function spawnParticles(tile, x, y, z, n, opts = {}) {
  const col = tile % ATLAS_COLS, row = tile >> 4;
  for (let i = 0; i < n && particles.length < 500; i++) {
    const px = Math.floor(Math.random() * 12), py = Math.floor(Math.random() * 12);
    particles.push({
      x: x + (opts.spread === undefined ? Math.random() : 0.5 + (Math.random() - 0.5) * opts.spread),
      y: y + (opts.spread === undefined ? Math.random() : 0.5 + (Math.random() - 0.5) * opts.spread),
      z: z + (opts.spread === undefined ? Math.random() : 0.5 + (Math.random() - 0.5) * opts.spread),
      vx: (Math.random() - 0.5) * (opts.speed || 3), vy: Math.random() * (opts.up || 3) + 0.5, vz: (Math.random() - 0.5) * (opts.speed || 3),
      life: 0.5 + Math.random() * 0.6, size: (opts.size || 0.07) * (0.7 + Math.random() * 0.6),
      u: (col * 16 + px + 0.1) / (ATLAS_COLS * 16), v: (row * 16 + py + 0.1) / (ATLAS_ROWS * 16),
      du: 3.8 / (ATLAS_COLS * 16), dv: 3.8 / (ATLAS_ROWS * 16),
      grav: opts.grav === undefined ? 16 : opts.grav, bright: opts.bright || 1,
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy -= p.grav * dt;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
    if (solidAt(Math.floor(nx), Math.floor(ny), Math.floor(nz))) { p.vx *= 0.3; p.vz *= 0.3; p.vy = 0; }
    else { p.x = nx; p.y = ny; p.z = nz; }
  }
}

// ---------- dropped items ----------
const drops = [];
function spawnDrop(id, count, x, y, z, dur, throwDir) {
  const d = { id, count, dur, x, y, z, vx: (Math.random() - 0.5) * 2, vy: 3 + Math.random(), vz: (Math.random() - 0.5) * 2,
    hw: 0.125, h: 0.25, age: 0, pickup: 0.6, onGround: false, bright: 1 };
  if (throwDir) { d.vx = throwDir[0] * 6; d.vy = 3 + throwDir[1] * 4; d.vz = throwDir[2] * 6; d.pickup = 1.5; }
  drops.push(d);
  return d;
}

// ---------- mobs ----------
const mobs = [];
const MOB_INFO = {
  pig: { hw: 0.45, h: 0.9, health: 10, speed: 1.3, sound: 'pig', hurt: 'pigHurt' },
  zombie: { hw: 0.3, h: 1.95, health: 20, speed: 1.0, sound: 'zombie', hurt: 'zombieHurt' },
  villager: { hw: 0.3, h: 1.95, health: 20, speed: 0.8, sound: 'villager', hurt: 'villagerHurt' },
};
function spawnMob(type, x, y, z) {
  const inf = MOB_INFO[type];
  const m = { type, x, y, z, vx: 0, vy: 0, vz: 0, yaw: Math.random() * Math.PI * 2, hw: inf.hw, h: inf.h, health: inf.health,
    hurtT: 0, deathT: 0, walk: 0, speedAnim: 0, ai: { t: 0, dx: 0, dz: 0, flee: 0 }, attackCd: 0, attackT: 0,
    soundT: 3 + Math.random() * 10, burning: false, burnT: 0, bright: 1, onGround: false, headPitch: 0 };
  mobs.push(m);
  return m;
}
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = Infinity;
  const lo = [x0, y0, z0], hi = [x1, y1, z1];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo[a] || o[a] > hi[a]) return -1; continue; }
    let t1 = (lo[a] - o[a]) / d[a], t2 = (hi[a] - o[a]) / d[a];
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin;
}
function rayMob(o, d, maxD) {
  let best = null, bt = maxD;
  for (const m of mobs) {
    if (m.deathT) continue;
    const t = rayBox(o, d, m.x - m.hw, m.y, m.z - m.hw, m.x + m.hw, m.y + m.h, m.z + m.hw);
    if (t >= 0 && t < bt) { bt = t; best = m; }
  }
  return best ? { mob: best, t: bt } : null;
}

// G: { P, survival, sky, gamma, hurtPlayer(dmg, from), soundAt(name, x, y, z), dropLoot(m) }
function updateMobs(dt, G) {
  const P = G.P;
  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i], inf = MOB_INFO[m.type];
    m.bright = lightAt(m.x, m.y + m.h * 0.7, m.z, G.sky.sun, G.gamma);
    if (m.deathT) {
      m.deathT += dt;
      if (m.deathT > 0.7) {
        spawnParticles(T.snow, m.x - 0.5, m.y + 0.3, m.z - 0.5, 18, { spread: 1, up: 2, grav: -1, size: 0.1, bright: m.bright });
        G.soundAt('poof', m.x, m.y, m.z);
        G.dropLoot(m);
        mobs.splice(i, 1);
      }
      continue;
    }
    const dx = P.x - m.x, dz = P.z - m.z, dist = Math.hypot(dx, dz) || 0.001, dy = P.y - m.y;
    if ((dist > 80 && m.type !== 'villager') || m.y < -10) { mobs.splice(i, 1); continue; }
    const inWater = waterAt(m.x, m.y + 0.4, m.z);
    let tx = 0, tz = 0, speed = 0;
    if (m.type === 'zombie' && G.survival && !P.dead && dist < 22 && Math.abs(dy) < 8) {
      tx = dx / dist; tz = dz / dist; speed = 2.5;
      m.headPitch = clamp(-Math.atan2(dy + 0.2, dist) * 0.6, -0.6, 0.6);
      if (dist < 1.25 && Math.abs(dy) < 1.7 && m.attackCd <= 0) {
        m.attackCd = 1; m.attackT = 1;
        G.hurtPlayer(3, m);
      }
    } else if (m.ai.flee > 0) {
      m.ai.flee -= dt; tx = -dx / dist; tz = -dz / dist; speed = 3.6;
    } else {
      m.headPitch = 0;
      m.ai.t -= dt;
      if (m.ai.t <= 0) {
        m.ai.t = 2 + Math.random() * 5;
        if (Math.random() < 0.4) { m.ai.dx = m.ai.dz = 0; }
        else { const a = Math.random() * Math.PI * 2; m.ai.dx = Math.sin(a); m.ai.dz = Math.cos(a); }
      }
      tx = m.ai.dx; tz = m.ai.dz; speed = tx || tz ? inf.speed : 0;
      // don't wander off cliffs or into lakes
      if (speed) {
        const ax = Math.floor(m.x + tx * 0.9), az = Math.floor(m.z + tz * 0.9), fy = Math.floor(m.y);
        if ((!solidAt(ax, fy - 1, az) && !solidAt(ax, fy - 2, az) && !solidAt(ax, fy, az)) || get(ax, fy - 1, az) === WATER) {
          m.ai.dx = -m.ai.dx; m.ai.dz = -m.ai.dz; tx = tz = 0; speed = 0;
        }
      }
    }
    const acc = Math.min(1, dt * (m.onGround ? 10 : 2));
    m.vx += (tx * speed - m.vx) * acc; m.vz += (tz * speed - m.vz) * acc;
    if (inWater) { m.vy = Math.min(m.vy + 22 * dt, 2.2); }
    else m.vy = Math.max(m.vy - 26 * dt, -40);
    const blocked = moveEntity(m, dt);
    if (blocked && (m.onGround || inWater) && speed > 0) m.vy = inWater ? 4 : 8.2;
    if (speed > 0.1) {
      const target = Math.atan2(-tx, -tz);
      let dd = target - m.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      m.yaw += dd * Math.min(1, dt * 8);
    }
    const hs = Math.hypot(m.vx, m.vz);
    m.walk += hs * dt * 5; m.speedAnim = hs / 2.2;
    m.hurtT = Math.max(0, m.hurtT - dt); m.attackCd -= dt; m.attackT = Math.max(0, m.attackT - dt * 3);

    // zombies burn in sunlight
    m.burning = false;
    if (m.type === 'zombie' && G.sky.day > 0.75 && !inWater && skyAt(Math.floor(m.x), Math.floor(m.y + 1.6), Math.floor(m.z)) >= 14) {
      m.burning = true; m.burnT += dt;
      if (Math.random() < dt * 12) spawnParticles(T.torch, m.x - 0.5, m.y + Math.random() * 1.8, m.z - 0.5, 1, { spread: 0.6, up: 1.5, grav: -2, size: 0.06, bright: 1.2 });
      if (m.burnT > 1) { m.burnT = 0; hurtMob(m, 1, null, G); }
    }
    m.soundT -= dt;
    if (m.soundT <= 0) { m.soundT = 5 + Math.random() * 10; G.soundAt(inf.sound, m.x, m.y + 1, m.z); }
  }
}
function hurtMob(m, dmg, from, G) {
  if (m.deathT) return;
  m.health -= dmg; m.hurtT = 0.4;
  if (from) {
    const kx = m.x - from.x, kz = m.z - from.z, kd = Math.hypot(kx, kz) || 1;
    m.vx = kx / kd * 7; m.vz = kz / kd * 7; m.vy = 5.5;
  }
  if (m.type === 'pig' || m.type === 'villager') m.ai.flee = 5;
  G.soundAt(MOB_INFO[m.type].hurt, m.x, m.y + 1, m.z);
  if (m.health <= 0) m.deathT = 0.001;
}
