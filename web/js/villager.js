'use strict';
// ============================================================
//  The homeless villager: needs, pathfinding, behaviour, HUD
// ============================================================

const V_NAME = 'Homeless Villager';
const V_MAX_HP = 20, V_MAX_FOOD = 20, V_TRUST_FOLLOW = 3;
const V_LINES = {
  hello: ['Hrmm. Hello, stranger.', 'Got anything to eat?', 'Hrmm... another cold day.'],
  beg: ['Spare some food, friend?', 'So hungry... hrmm...', 'Please, anything to eat?'],
  starving: ['I... need... food...', 'Everything is spinning...'],
  thanks: ['Hrmm! Thank you, friend.', 'Bless you!', 'Mmm, that hit the spot!'],
  full: ["I'm full, but thank you!", 'Save it for yourself, friend.'],
  follow: ['Lead the way!', 'Right behind you.'],
  stay: ["I'll wait here.", "I'll keep this spot warm."],
  night: ["It's getting dark... I need a roof.", 'Night again. Stay safe out there.'],
  noShelter: ['Brr... no roof for me tonight.', 'If only someone built me a little house...'],
  sleep: ['Zzz...'],
  flee: ['Zombie! Help!', 'Aaah! Stay back!', 'Help me, friend!'],
  hurt: ['Ow! Why would you do that?', 'Hey! I thought we were friends!'],
  foundFood: ['Ooh, food on the ground!', 'Is that... food?'],
  ate: ['Mmm!', 'Delicious!'],
  forage: ['Found some berries in the bushes.', 'A few berries... better than nothing.'],
  morning: ['Morning! Still alive, hrmm.', 'What a night...'],
  trust: ["You're a good soul. Tap me if you want me to come along."],
  distrust: ['Hrmm. I don\'t know you well enough yet.', 'Maybe feed me first, stranger?'],
};
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------------- pathfinding ----------------
// A cell is standable when the villager's feet and head fit and there is ground (or water) to stand in.
function standable(x, y, z) {
  if (x < 1 || z < 1 || x >= WX - 1 || z >= WZ - 1 || y < 1 || y >= WY - 2) return false;
  if (solidAt(x, y, z) || solidAt(x, y + 1, z)) return false;
  if (get(x, y, z) === WATER) return get(x, y + 1, z) !== WATER; // swim at the surface only
  return SOLID[get(x, y - 1, z)] === 1;
}
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// A* from (sx,sy,sz) towards (tx,ty,tz). Returns the list of cells to walk through; when the target
// can't be reached it returns the way to the closest cell it found.
function findPath(sx, sy, sz, tx, ty, tz, maxNodes = 900) {
  const key = (x, y, z) => (y * WZ + z) * WX + x;
  const h = (x, y, z) => Math.abs(x - tx) + Math.abs(z - tz) + Math.abs(y - ty) * 0.5;
  const heap = [];
  const push = n => {
    heap.push(n); let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < heap.length && heap[l].f < heap[m].f) m = l;
        if (r < heap.length && heap[r].f < heap[m].f) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  const nodes = new Map();
  const start = { x: sx, y: sy, z: sz, g: 0, f: h(sx, sy, sz), parent: null, closed: false };
  nodes.set(key(sx, sy, sz), start); push(start);
  let best = start, bestH = start.f, count = 0;
  while (heap.length && count < maxNodes) {
    const n = pop();
    if (n.closed) continue;
    n.closed = true; count++;
    const hn = h(n.x, n.y, n.z);
    if (hn < bestH) { bestH = hn; best = n; }
    if (n.x === tx && n.z === tz && Math.abs(n.y - ty) <= 1) { best = n; break; }
    for (const [dx, dz] of DIRS4) {
      const nx = n.x + dx, nz = n.z + dz;
      let ny = null;
      if (standable(nx, n.y, nz)) ny = n.y;
      else if (!solidAt(n.x, n.y + 2, n.z) && standable(nx, n.y + 1, nz)) ny = n.y + 1;   // step up
      else if (!solidAt(nx, n.y, nz) && !solidAt(nx, n.y + 1, nz)) {                    // drop down (max 3)
        for (let d = 1; d <= 3; d++) { if (standable(nx, n.y - d, nz)) { ny = n.y - d; break; } if (solidAt(nx, n.y - d, nz)) break; }
      }
      if (ny === null) continue;
      const g = n.g + 1 + (get(nx, ny, nz) === WATER ? 4 : 0) + (ny > n.y ? 0.5 : 0) + (ny < n.y ? 0.3 * (n.y - ny) : 0);
      const k = key(nx, ny, nz);
      let m = nodes.get(k);
      if (!m) { m = { x: nx, y: ny, z: nz, g: Infinity, f: 0, parent: null, closed: false }; nodes.set(k, m); }
      if (m.closed || g >= m.g) continue;
      m.g = g; m.f = g + h(nx, ny, nz); m.parent = n; push(m);
    }
  }
  const path = [];
  for (let n = best; n; n = n.parent) path.push([n.x, n.y, n.z]);
  return path.reverse();
}

// ---------------- life of the villager ----------------
let villagerRespawnDay = -1;   // day number when a new villager arrives after one dies
function theVillager() { return mobs.find(m => m.type === 'villager' && !m.deathT); }

function initVillager(v, saved) {
  v.hunger = saved && saved.hunger !== undefined ? saved.hunger : 14;
  v.trust = saved && saved.trust || 0;
  v.follow = !!(saved && saved.follow);
  v.homeX = saved && saved.homeX !== undefined ? saved.homeX : v.x;
  v.homeZ = saved && saved.homeZ !== undefined ? saved.homeZ : v.z;
  if (saved && saved.health) v.health = saved.health;
  v.brain = { state: 'wander', path: null, pi: 0, repath: 0, goal: null, goalKind: '', say: '', sayT: 0, sayCd: 0,
    think: 0, hungerT: 0, regenT: 0, starveT: 0, forageT: 25 + Math.random() * 20, shelter: null, shelterT: 0,
    stuckT: 0, lastX: v.x, lastZ: v.z, wasNight: false, greeted: false };
}
function spawnVillager(saved) {
  if (theVillager()) return;
  if (saved && saved.dead) { villagerRespawnDay = saved.respawnDay ?? days + 1; return; }
  let v = null;
  if (saved && saved.x !== undefined && !boxHits(saved.x, saved.y, saved.z, 0.3, 1.95)) v = spawnMob('villager', saved.x, saved.y, saved.z);
  else {
    const cx = saved ? spawnPt[0] : P.x, cz = saved ? spawnPt[2] : P.z;
    for (let i = 0; i < 300 && !v; i++) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 6;
      const x = Math.floor(cx + Math.cos(a) * r), z = Math.floor(cz + Math.sin(a) * r);
      if (x < 1 || z < 1 || x >= WX - 1 || z >= WZ - 1) continue;
      const y = surfaceSpot(x, z);
      if (!y || get(x, y - 1, z) === WATER) continue;
      v = spawnMob('villager', x + 0.5, y, z + 0.5);
    }
    if (!v) return;
    v.yaw = Math.atan2(-(P.x - v.x), -(P.z - v.z));
  }
  initVillager(v, saved && saved.x !== undefined ? saved : null);
  villagerRespawnDay = -1;
}
function villagerSave() {
  const v = theVillager();
  if (!v) return { dead: true, respawnDay: villagerRespawnDay };
  return { x: v.x, y: v.y, z: v.z, health: v.health, hunger: v.hunger, trust: v.trust, follow: v.follow, homeX: v.homeX, homeZ: v.homeZ };
}
function villagerDied(v) {
  villagerRespawnDay = days + 1;
  toast('The Homeless Villager has died...');
  if (v.hunger > 0) spawnDrop(APPLE, 1, v.x, v.y + 0.5, v.z);
}
function villagerNewDay() {
  if (villagerRespawnDay >= 0 && days >= villagerRespawnDay && !theVillager()) {
    spawnVillager(null);
    const v = theVillager();
    if (v) { say(v, 'Hrmm... hello? Anyone around?', true); toast('A new homeless villager has wandered in.'); }
  }
}

function say(v, text, force) {
  const b = v.brain;
  if (!force && b.sayCd > 0) return;
  b.say = text; b.sayT = 3.5; b.sayCd = 6;
  if (Math.hypot(v.x - P.x, v.z - P.z) < 24) soundAt('villager', v.x, v.y + 1.6, v.z);
}

function nearestFoodDrop(v, r) {
  let best = null, bd = r;
  for (const d of drops) {
    if (!ITEMS[d.id].food || d.age < 0.5) continue;
    const dist = Math.hypot(d.x - v.x, d.z - v.z) + Math.abs(d.y - v.y) * 0.5;
    if (dist < bd) { bd = dist; best = d; }
  }
  return best;
}
function nearestZombie(v, r) {
  let best = null, bd = r;
  for (const m of mobs) {
    if (m.type !== 'zombie' || m.deathT) continue;
    const d = Math.hypot(m.x - v.x, m.z - v.z);
    if (d < bd && Math.abs(m.y - v.y) < 5) { bd = d; best = m; }
  }
  return best;
}
// look for a nearby spot with a roof over it (under a tree, an overhang, or a house you built)
function findShelter(v) {
  const vx = Math.floor(v.x), vy = Math.floor(v.y), vz = Math.floor(v.z);
  let best = null, bd = Infinity;
  for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) {
    const x = vx + dx, z = vz + dz;
    for (let dy = -3; dy <= 3; dy++) {
      const y = vy + dy;
      if (!standable(x, y, z) || get(x, y, z) === WATER) continue;
      if (skyAt(x, y + 1, z) >= 15) continue;           // open sky above
      let roof = false;
      for (let k = y + 2; k < Math.min(WY, y + 8); k++) if (OPAQUE[get(x, k, z)] || get(x, k, z) === LEAVES) { roof = true; break; }
      if (!roof) continue;
      const d = Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 2 + (blkAt(x, y, z) > 6 ? -6 : 0); // prefer torch-lit houses
      if (d < bd) { bd = d; best = [x, y, z]; }
    }
  }
  return best;
}
function leavesNear(v) {
  const vx = Math.floor(v.x), vy = Math.floor(v.y), vz = Math.floor(v.z);
  for (let y = vy; y < vy + 7; y++) for (let z = vz - 4; z <= vz + 4; z++) for (let x = vx - 4; x <= vx + 4; x++)
    if (get(x, y, z) === LEAVES) return true;
  return false;
}

// Plan a walk to a cell; the path is followed by villagerThink.
function goTo(v, x, y, z, kind) {
  const b = v.brain;
  b.goal = [x, y, z]; b.goalKind = kind;
  b.path = findPath(Math.floor(v.x), Math.floor(v.y + 0.01), Math.floor(v.z), x, y, z);
  b.pi = 1; b.repath = 1.5;
}

const STATUS_TEXT = { wander: 'Wandering', follow: 'Following you', stay: 'Waiting for you', food: 'Going for food', beg: 'Begging for food',
  shelter: 'Looking for shelter', sleep: 'Sleeping', flee: 'Running from zombies!', idle: 'Resting' };

// Called by updateMobs every frame; returns where the villager wants to walk.
function villagerThink(v, dt, G) {
  if (!v.brain) initVillager(v, null);
  const b = v.brain;
  b.sayT -= dt; b.sayCd -= dt; b.think -= dt; b.repath -= dt; b.shelterT -= dt;
  const night = G.sky.day < 0.3;
  const pd = Math.hypot(P.x - v.x, P.z - v.z);

  // ---- needs: hunger drains, a full belly heals, an empty one hurts
  const moving = Math.hypot(v.vx, v.vz) > 0.3;
  b.hungerT += dt * (moving ? 1.5 : 1) * (b.state === 'sleep' ? 0.5 : 1);
  if (b.hungerT >= 36) { b.hungerT = 0; v.hunger = Math.max(0, v.hunger - 1); }
  b.regenT += dt;
  if (v.hunger >= 14 && v.health < V_MAX_HP && b.regenT >= 5) { b.regenT = 0; v.health = Math.min(V_MAX_HP, v.health + 1); b.hungerT += 10; }
  if (v.hunger === 0) {
    b.starveT += dt;
    if (b.starveT >= 8) { b.starveT = 0; if (v.health > 1) { v.health--; v.hurtT = 0.3; say(v, pick(V_LINES.starving)); } }
  } else b.starveT = 0;
  // foraging: on his own he can find a few berries by the trees in daytime
  b.forageT -= dt;
  if (b.forageT <= 0) {
    b.forageT = 30 + Math.random() * 25;
    if (v.hunger < 14 && !night && Math.random() < 0.45 && leavesNear(v)) { v.hunger = Math.min(V_MAX_FOOD, v.hunger + 3); say(v, pick(V_LINES.forage)); }
  }
  if (b.wasNight && !night) say(v, pick(V_LINES.morning), true);
  b.wasNight = night;
  if (!b.greeted && pd < 6) { b.greeted = true; say(v, pick(V_LINES.hello), true); }

  // ---- decide what to do (a few times a second)
  if (b.think <= 0) {
    b.think = 0.4;
    const zombie = nearestZombie(v, 10);
    const food = v.hunger < V_MAX_FOOD - 2 ? nearestFoodDrop(v, 16) : null;
    let next;
    if (zombie) next = 'flee';
    else if (food && (v.hunger < 16 || pd > 4)) next = 'food';
    else if (v.follow) next = pd > 3.5 ? 'follow' : 'idle';
    else if (v.hunger <= 8 && pd < 24 && !P.dead) next = 'beg';
    else if (night) next = b.state === 'sleep' ? 'sleep' : 'shelter';
    else next = b.state === 'stay' ? 'stay' : 'wander';
    if (!v.follow && b.state === 'stay' && next === 'wander') next = 'stay';

    if (next !== b.state) {
      b.state = next; b.path = null;
      if (next === 'flee') say(v, pick(V_LINES.flee), true);
      if (next === 'food') say(v, pick(V_LINES.foundFood));
      if (next === 'beg') say(v, pick(V_LINES.beg));
      if (next === 'shelter') say(v, pick(V_LINES.night));
    }
    if (next === 'flee') {
      // run away from the zombie, towards the player if they are close
      let ax = v.x - zombie.x, az = v.z - zombie.z;
      if (pd < 20) { ax += (P.x - v.x) * 0.6; az += (P.z - v.z) * 0.6; }
      const l = Math.hypot(ax, az) || 1;
      b.fleeDir = [ax / l, az / l];
    } else if (next === 'food') {
      if (!b.path || b.repath <= 0) goTo(v, Math.floor(food.x), Math.floor(food.y + 0.2), Math.floor(food.z), 'food');
      if (Math.hypot(food.x - v.x, food.z - v.z) < 1.2 && Math.abs(food.y - v.y) < 1.5) {
        v.hunger = Math.min(V_MAX_FOOD, v.hunger + ITEMS[food.id].food[0]);
        if (--food.count <= 0) drops.splice(drops.indexOf(food), 1);
        Sound.play('eat');
        spawnParticles(ITEMS[food.id].tile, v.x - 0.5, v.y + 1.2, v.z - 0.5, 8, { spread: 0.4, size: 0.05, bright: v.bright });
        say(v, pick(V_LINES.ate), true);
        b.happyT = 4;
        b.path = null;
      }
    } else if (next === 'follow' || next === 'beg') {
      if (!b.path || b.repath <= 0) goTo(v, Math.floor(P.x), Math.floor(P.y + 0.01), Math.floor(P.z), next);
      if (next === 'beg' && pd < 2.5) { b.path = null; if (Math.random() < 0.08) say(v, pick(V_LINES.beg)); }
    } else if (next === 'shelter') {
      if (b.shelterT <= 0) { b.shelter = findShelter(v); b.shelterT = 8; if (!b.shelter) say(v, pick(V_LINES.noShelter)); }
      if (b.shelter) {
        const [sx, sy, sz] = b.shelter;
        if (Math.hypot(sx + 0.5 - v.x, sz + 0.5 - v.z) < 0.45) { b.state = 'sleep'; b.path = null; say(v, 'Zzz...', true); }
        else if (!b.path || b.repath <= 0) goTo(v, sx, sy, sz, 'shelter');
      } else if (pd < 16 && pd > 3) {
        if (!b.path || b.repath <= 0) goTo(v, Math.floor(P.x), Math.floor(P.y + 0.01), Math.floor(P.z), 'shelter');
      } else b.path = null;
    } else if (next === 'sleep') {
      if (!night) b.state = 'wander';
      else if (b.sayT <= 0 && Math.random() < 0.3) { b.say = 'Zzz...'; b.sayT = 2.5; }
    } else if (next === 'wander') {
      if ((!b.path || b.pi >= b.path.length) && Math.random() < 0.08) {
        // stroll somewhere near home
        for (let t = 0; t < 8; t++) {
          const x = Math.floor(v.homeX + (Math.random() - 0.5) * 16), z = Math.floor(v.homeZ + (Math.random() - 0.5) * 16);
          const y = x > 0 && z > 0 && x < WX && z < WZ ? surfaceSpot(x, z) : null;
          if (y && get(x, y - 1, z) !== WATER) { goTo(v, x, y, z, 'wander'); break; }
        }
      }
    } else if (next === 'stay' || next === 'idle') {
      b.path = null;
    }
  }

  // ---- steer
  const res = { tx: 0, tz: 0, speed: 0, jump: false };
  v.sleeping = b.state === 'sleep';
  b.happyT = (b.happyT || 0) - dt;
  v.face = v.sleeping ? 'sleep' : b.happyT > 0 ? 'happy' : (v.hunger <= 6 || v.health <= 6 || b.state === 'flee') ? 'sad' : 'normal';
  if (b.state === 'flee' && b.fleeDir) { res.tx = b.fleeDir[0]; res.tz = b.fleeDir[1]; res.speed = 3.4; }
  else if (b.path && b.pi < b.path.length) {
    const [wx, wy, wz] = b.path[b.pi];
    const dx = wx + 0.5 - v.x, dz = wz + 0.5 - v.z, d = Math.hypot(dx, dz);
    if (d < 0.35) b.pi++;
    else {
      res.tx = dx / d; res.tz = dz / d;
      res.speed = b.state === 'follow' ? (pd > 8 ? 4.2 : 3) : b.state === 'food' || b.state === 'shelter' || b.state === 'beg' ? 2.2 : 1.4;
      if (wy > Math.floor(v.y + 0.01) && v.onGround) res.jump = true;
    }
    // stuck? try again
    b.stuckT += dt;
    if (b.stuckT > 1.5) {
      if (Math.hypot(v.x - b.lastX, v.z - b.lastZ) < 0.3) { b.path = null; b.repath = 0; }
      b.stuckT = 0; b.lastX = v.x; b.lastZ = v.z;
    }
  }
  // face the player when standing close by
  if (res.speed === 0 && pd < 6 && !v.sleeping) {
    const target = Math.atan2(-(P.x - v.x), -(P.z - v.z));
    let dd = target - v.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    v.yaw += dd * Math.min(1, dt * 5);
  }
  return res;
}

// zombies bite him too; he remembers who hurt him
function onVillagerHurt(v, from) {
  if (!v.brain) return;
  v.follow = false;
  if (from === P) { v.trust = Math.max(0, v.trust - 2); say(v, pick(V_LINES.hurt), true); }
  else say(v, pick(V_LINES.flee), true);
  if (v.brain.state === 'sleep') v.brain.state = 'wander';
}

// tapping him: feed him, or ask him to follow / stay
function interactVillager(v) {
  const it = held();
  swingHand();
  if (it && ITEMS[it.id].food) {
    if (v.hunger >= V_MAX_FOOD) { say(v, pick(V_LINES.full), true); return; }
    v.hunger = Math.min(V_MAX_FOOD, v.hunger + ITEMS[it.id].food[0] + 1);
    const before = v.trust;
    v.trust = Math.min(10, v.trust + (it.id === FLESH ? 0 : 1));
    consumeHeld();
    Sound.play('eat');
    spawnParticles(T.rose, v.x - 0.5, v.y + 1.9, v.z - 0.5, 12, { spread: 0.8, up: 1.5, grav: -1, size: 0.08, bright: v.bright });
    say(v, it.id === FLESH ? 'Ugh... rotten. But thanks, I guess.' : pick(V_LINES.thanks), true);
    if (it.id !== FLESH) v.brain.happyT = 5;
    if (before < V_TRUST_FOLLOW && v.trust >= V_TRUST_FOLLOW) setTimeout(() => say(v, V_LINES.trust[0], true), 3000);
    return;
  }
  if (v.trust < V_TRUST_FOLLOW) {
    say(v, v.hunger < 10 ? pick(V_LINES.beg) : pick(V_LINES.distrust), true);
    return;
  }
  v.follow = !v.follow;
  if (v.follow) { v.brain.state = 'follow'; v.brain.happyT = 2.5; say(v, pick(V_LINES.follow), true); }
  else { v.homeX = v.x; v.homeZ = v.z; v.brain.state = 'stay'; v.brain.path = null; say(v, pick(V_LINES.stay), true); }
}

// ---------------- HUD: corner card and floating name tag ----------------
const portraitCache = {};
function villagerPortrait(face) {
  const key = face || 'normal';
  if (portraitCache[key]) return portraitCache[key];
  const tile = { normal: T.vFace, happy: T.vFaceHappy, sleep: T.vFaceSleep, sad: T.vFaceSad }[key];
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const src = t => [(t % 16) * 16, (t >> 4) * 16];
  let [sx, sy] = src(tile); x.drawImage(ATLAS, sx, sy, 16, 16, 0, 0, 48, 48);
  [sx, sy] = src(T.vNose); x.drawImage(ATLAS, sx, sy, 16, 16, 20, 19, 8, 10);   // the big red nose
  return portraitCache[key] = c.toDataURL();
}
const vUI = {};
function initVillagerUI() {
  vUI.card = $('vcard'); vUI.status = $('vstatus'); vUI.trust = $('vtrust'); vUI.dist = $('vdist');
  vUI.tag = $('vtag'); vUI.sayEl = $('vsay'); vUI.face = $('vface'); vUI.faceKey = '';
  const make = (id) => { const row = $(id), arr = []; for (let i = 0; i < 10; i++) { const el = document.createElement('i'); row.appendChild(el); arr.push(el); } return arr; };
  vUI.hearts = make('vhearts'); vUI.food = make('vfood');
  vUI.tagHearts = make('vtagHearts'); vUI.tagFood = make('vtagFood');
  vUI.key = '';
}
function setBar(arr, v, full, halfI, empty) {
  arr.forEach((el, i) => { const r = v - i * 2; el.style.backgroundImage = `url(${r >= 2 ? full : r === 1 ? halfI : empty})`; });
}
function updateVillagerHUD(vp, eye, show) {
  if (!vUI.card) initVillagerUI();
  const v = theVillager();
  if (!show || !v) {
    vUI.card.classList.toggle('hide', !show || (!v && villagerRespawnDay < 0));
    vUI.tag.classList.add('hide');
    if (show && !v) { vUI.status.textContent = 'Gone... a new one may come tomorrow'; vUI.dist.textContent = ''; }
    return;
  }
  vUI.card.classList.remove('hide');
  const b = v.brain;
  if (v.face !== vUI.faceKey) { vUI.faceKey = v.face; vUI.face.src = villagerPortrait(v.face); }
  const hp = Math.max(0, Math.ceil(v.health)), food = v.hunger;
  const status = (v.hunger === 0 ? 'Starving! ' : v.hunger <= 6 ? 'Hungry · ' : '') + (STATUS_TEXT[b.state] || '');
  const key = `${hp}|${food}|${status}|${v.trust}`;
  if (key !== vUI.key) {
    vUI.key = key;
    setBar(vUI.hearts, hp, HUD_ICONS.heart, HUD_ICONS.heartHalf, HUD_ICONS.heartEmpty);
    setBar(vUI.food, food, HUD_ICONS.food, HUD_ICONS.foodHalf, HUD_ICONS.foodEmpty);
    setBar(vUI.tagHearts, hp, HUD_ICONS.heart, HUD_ICONS.heartHalf, HUD_ICONS.heartEmpty);
    setBar(vUI.tagFood, food, HUD_ICONS.food, HUD_ICONS.foodHalf, HUD_ICONS.foodEmpty);
    vUI.status.textContent = status;
    const stars = Math.round(v.trust / 2);
    vUI.trust.textContent = 'Trust ' + '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }
  const d = Math.hypot(v.x - eye[0], v.y + 1.6 - eye[1], v.z - eye[2]);
  vUI.dist.textContent = d > 8 ? `${Math.round(d)} m away` : '';

  // floating tag above his head
  const hx = v.x, hy = v.y + (v.sleeping ? 0.9 : 2.25), hz = v.z;
  const cx = vp[0] * hx + vp[4] * hy + vp[8] * hz + vp[12], cy = vp[1] * hx + vp[5] * hy + vp[9] * hz + vp[13], cw = vp[3] * hx + vp[7] * hy + vp[11] * hz + vp[15];
  let visible = cw > 0.1 && d < 20;
  if (visible) {
    const nx = cx / cw, ny = cy / cw;
    visible = Math.abs(nx) < 1.1 && Math.abs(ny) < 1.1;
    if (visible) {
      const dir = [(hx - eye[0]) / d, (hy - eye[1]) / d, (hz - eye[2]) / d];
      const hit = raycastBlocks(eye, dir, d - 0.6);
      if (hit && OPAQUE[hit.b]) visible = false;
      else {
        vUI.tag.style.transform = `translate(${(nx + 1) / 2 * innerWidth}px, ${(1 - ny) / 2 * innerHeight}px) translate(-50%, -100%) scale(${clamp(6 / d, 0.55, 1)})`;
      }
    }
  }
  vUI.tag.classList.toggle('hide', !visible);
  vUI.tag.classList.toggle('far', d > 10);
  const saying = b.sayT > 0 ? b.say : '';
  if (vUI.sayEl.textContent !== saying) vUI.sayEl.textContent = saying;
  vUI.sayEl.classList.toggle('hide', !saying);
}
