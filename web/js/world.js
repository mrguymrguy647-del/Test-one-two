'use strict';
// ============================================================
//  World storage, terrain generation, lighting and meshing
// ============================================================

const WX = 160, WZ = 160, WY = 64, CS = 16, NCX = WX / CS, NCZ = WZ / CS, SEA = 20;
const VOL = WX * WY * WZ;
const world = new Uint8Array(VOL);
const skyL = new Uint8Array(VOL);   // sunlight 0..15
const blkL = new Uint8Array(VOL);   // torch light 0..15
const idx = (x, y, z) => (y * WZ + z) * WX + x;
const inWorld = (x, y, z) => x >= 0 && z >= 0 && x < WX && z < WZ && y >= 0 && y < WY;

function get(x, y, z) {
  if (x < 0 || z < 0 || x >= WX || z >= WZ || y >= WY) return AIR;
  if (y < 0) return BEDROCK;
  return world[idx(x, y, z)];
}
function solidAt(x, y, z) {
  if (x < 0 || z < 0 || x >= WX || z >= WZ || y < 0) return true; // invisible world border
  if (y >= WY) return false;
  return SOLID[world[idx(x, y, z)]] === 1;
}
function skyAt(x, y, z) { return inWorld(x, y, z) ? skyL[idx(x, y, z)] : (y >= WY ? 15 : 0); }
function blkAt(x, y, z) { return inWorld(x, y, z) ? blkL[idx(x, y, z)] : 0; }
function topY(x, z) { // highest non-air block in a column
  for (let y = WY - 1; y > 0; y--) { const b = world[idx(x, y, z)]; if (b !== AIR && SHAPE[b] === 'cube' || b === WATER) return y; }
  return 0;
}

// ---------------- terrain generation ----------------
// A generator so the loading screen can show progress.
function* generateWorld(seed, edits) {
  world.fill(0);
  const H = new Int16Array(WX * WZ);
  for (let z = 0; z < WZ; z++) {
    for (let x = 0; x < WX; x++) {
      const cont = fbm(x / 90, z / 90, seed, 3);
      const hills = fbm(x / 26, z / 26, seed + 50, 4);
      const mount = smoothstep(0.52, 0.72, fbm(x / 64, z / 64, seed + 200, 3));
      let h = Math.floor(17 + (cont - 0.5) * 38 + (hills - 0.5) * 11 + mount * 30 * (0.6 + hills * 0.6));
      h = clamp(h, 4, WY - 8);
      H[z * WX + x] = h;
      const beach = h <= SEA + 1, snowy = h >= 45 + Math.floor(hash2(x, z, seed + 3) * 4);
      const soil = 3 + (hash2(x, z, seed + 4) < 0.5 ? 1 : 0);
      const seabed = h < SEA - 2 ? (fbm(x / 12, z / 12, seed + 70, 2) > 0.52 ? GRAVEL : SAND) : SAND;
      for (let y = 0; y <= Math.max(h, SEA); y++) {
        let b;
        if (y === 0 || (y === 1 && hash3(x, y, z, seed) < 0.5)) b = BEDROCK;
        else if (y > h) b = WATER;
        else if (y <= h - soil) b = STONE;
        else if (beach) b = h < SEA - 2 ? seabed : SAND;
        else if (y === h) b = snowy ? SNOW : GRASS;
        else b = DIRT;
        world[idx(x, y, z)] = b;
      }
    }
    if (z % 16 === 15) yield ['Shaping terrain', 0.3 * (z + 1) / WZ];
  }

  // caves: thin "spaghetti" tunnels where two noise fields are both near 0.5, plus a few caverns
  for (let z = 0; z < WZ; z++) {
    for (let x = 0; x < WX; x++) {
      const h = H[z * WX + x], wet = h <= SEA + 2;
      const top = wet ? h - 6 : h;
      for (let y = 2; y <= top; y++) {
        const a = vnoise3(x / 18, y / 12, z / 18, seed + 300), b = vnoise3(x / 18, y / 12, z / 18, seed + 400);
        let carve = Math.abs(a - 0.5) < 0.05 && Math.abs(b - 0.5) < 0.07;
        if (!carve && y < 28) carve = vnoise3(x / 28, y / 14, z / 28, seed + 500) > 0.8;
        if (carve) world[idx(x, y, z)] = AIR;
      }
    }
    if (z % 16 === 15) yield ['Digging caves', 0.3 + 0.3 * (z + 1) / WZ];
  }

  // ore veins
  const rnd = mulberry32(seed ^ 0x5bd1e995);
  const vein = (block, count, size, y0, y1) => {
    for (let v = 0; v < count; v++) {
      let x = Math.floor(rnd() * WX), y = y0 + Math.floor(rnd() * (y1 - y0)), z = Math.floor(rnd() * WZ);
      for (let i = 0; i < size; i++) {
        if (inWorld(x, y, z) && world[idx(x, y, z)] === STONE) world[idx(x, y, z)] = block;
        const dir = Math.floor(rnd() * 6);
        if (dir === 0) x++; else if (dir === 1) x--; else if (dir === 2) y++; else if (dir === 3) y--; else if (dir === 4) z++; else z--;
      }
    }
  };
  vein(GRAVEL, 60, 14, 4, 50);
  vein(COAL_ORE, 260, 9, 4, 56);
  vein(IRON_ORE, 150, 6, 3, 38);
  vein(DIAMOND_ORE, 22, 5, 2, 15);
  yield ['Placing ores', 0.65];

  // trees, flowers and grass
  for (let z = 3; z < WZ - 3; z++) for (let x = 3; x < WX - 3; x++) {
    const h = H[z * WX + x];
    if (world[idx(x, h, z)] !== GRASS || world[idx(x, h + 1, z)] !== AIR) continue;
    const forest = fbm(x / 40, z / 40, seed + 90, 2);
    const treeChance = 0.002 + smoothstep(0.45, 0.7, forest) * 0.05;
    const hr = hash2(x, z, seed + 7);
    if (hr < treeChance && h < 44) {
      const trunk = 4 + Math.floor(hash2(x, z, seed + 8) * 3), top = h + trunk;
      if (top + 2 >= WY) continue;
      for (let dy = -2; dy <= 1; dy++) {
        const r = dy < 0 ? 2 : 1;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 1 || hash2(x + dx, z + dz, seed + dy) < 0.5)) continue;
          const i = idx(x + dx, top + dy, z + dz);
          if (world[i] === AIR || world[i] === TALL_GRASS) world[i] = LEAVES;
        }
      }
      world[idx(x, top + 2, z)] = LEAVES;
      for (let y = h + 1; y <= top; y++) world[idx(x, y, z)] = LOG;
      world[idx(x, h, z)] = DIRT;
    } else {
      const fr = hash2(x, z, seed + 11);
      if (fr < 0.1) world[idx(x, h + 1, z)] = TALL_GRASS;
      else if (fr < 0.108) world[idx(x, h + 1, z)] = ROSE;
      else if (fr < 0.118) world[idx(x, h + 1, z)] = DANDELION;
    }
  }
  yield ['Growing trees', 0.75];

  if (edits) for (const [i, b] of edits) world[i] = b;
  computeLight(0, 0, WX - 1, WZ - 1);
  yield ['Lighting', 0.85];
}

// ---------------- lighting ----------------
const LQ = new Int32Array(1 << 21), LQM = (1 << 21) - 1;
// Recalculate sky and torch light inside the column box [x0..x1] x [z0..z1] (full height).
// Cells just outside the box are used as fixed light sources.
function computeLight(x0, z0, x1, z1) {
  x0 = Math.max(0, x0); z0 = Math.max(0, z0); x1 = Math.min(WX - 1, x1); z1 = Math.min(WZ - 1, z1);
  for (let y = 0; y < WY; y++) for (let z = z0; z <= z1; z++) {
    const row = idx(x0, y, z);
    skyL.fill(0, row, row + x1 - x0 + 1);
    blkL.fill(0, row, row + x1 - x0 + 1);
  }
  // sunlight straight down each column
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    let l = 15;
    for (let y = WY - 1; y >= 0 && l > 0; y--) {
      const i = idx(x, y, z), b = world[i];
      if (OPAQUE[b]) break;
      if (DIM[b]) l--;
      skyL[i] = l;
    }
  }
  const inBox = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  for (const [L, isSky] of [[skyL, true], [blkL, false]]) {
    let head = 0, tail = 0;
    const push = i => { LQ[tail & LQM] = i; tail++; };
    for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (x < 0 || z < 0 || x >= WX || z >= WZ) continue;
      const border = !inBox(x, z);
      for (let y = 0; y < WY; y++) {
        const i = idx(x, y, z);
        if (border) { if (L[i] > 1) push(i); continue; }
        if (!isSky) { const e = EMIT[world[i]]; if (e) { L[i] = e; push(i); } }
        else if (L[i] > 1) {
          // only seed sunlit cells that border something darker
          const l = L[i];
          if ((x > 0 && L[i - 1] < l - 1 && !OPAQUE[world[i - 1]]) || (x < WX - 1 && L[i + 1] < l - 1 && !OPAQUE[world[i + 1]]) ||
              (z > 0 && L[i - WX] < l - 1 && !OPAQUE[world[i - WX]]) || (z < WZ - 1 && L[i + WX] < l - 1 && !OPAQUE[world[i + WX]]) ||
              (y > 0 && L[i - WX * WZ] < l - 1 && !OPAQUE[world[i - WX * WZ]])) push(i);
        }
      }
    }
    while (head < tail) {
      const i = LQ[head & LQM]; head++;
      const l = L[i]; if (l <= 1) continue;
      const x = i % WX, z = Math.floor(i / WX) % WZ, y = Math.floor(i / (WX * WZ));
      for (let k = 0; k < 6; k++) {
        let nx = x, ny = y, nz = z;
        if (k === 0) nx++; else if (k === 1) nx--; else if (k === 2) ny++; else if (k === 3) ny--; else if (k === 4) nz++; else nz--;
        if (ny < 0 || ny >= WY || !inBox(nx, nz)) continue;
        const n = idx(nx, ny, nz), b = world[n];
        if (OPAQUE[b]) continue;
        const nl = l - 1 - (DIM[b] && isSky ? 1 : 0);
        if (L[n] < nl) { L[n] = nl; push(n); }
      }
    }
  }
}

// ---------------- meshing ----------------
// vertex: x y z  u v  sky blk shade   (8 floats)
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.55 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.68 },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], shade: 0.68 },
];
for (const f of FACES) {
  // make every face counter-clockwise seen from outside
  const [a, b, c] = f.c;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (cr[0] * f.n[0] + cr[1] * f.n[1] + cr[2] * f.n[2] < 0) f.c.reverse();
  f.axis = f.n[0] ? 0 : f.n[1] ? 1 : 2;
  f.slot = f.n[1] > 0 ? 0 : f.n[1] < 0 ? 1 : f.axis === 2 ? 3 : 2; // top, bottom, side, front(z faces)
  f.uv = f.c.map(p => f.axis === 1 ? [p[0], p[2]] : [f.axis === 0 ? p[2] : p[0], 1 - p[1]]);
  const [a1, a2] = [0, 1, 2].filter(k => k !== f.axis);
  f.ao = f.c.map(p => {
    const d1 = [0, 0, 0], d2 = [0, 0, 0];
    d1[a1] = p[a1] ? 1 : -1; d2[a2] = p[a2] ? 1 : -1;
    return [d1, d2];
  });
}
const AOL = [0.5, 0.66, 0.82, 1.0];
const ORDER_A = [0, 1, 2, 0, 2, 3], ORDER_B = [1, 2, 3, 1, 3, 0];
const tileU = (t, u) => ((t % ATLAS_COLS) + clamp(u, 0.002, 0.998)) / ATLAS_COLS;
const tileV = (t, v) => ((t >> 4) + clamp(v, 0.002, 0.998)) / ATLAS_ROWS;
function texFor(b, slot) { const t = BLOCKS[b].tex; return slot === 3 ? (t[3] !== undefined ? t[3] : t[2]) : t[slot]; }

function faceVisible(b, nb) {
  if (nb === AIR || SHAPE[nb] === 'cross' || SHAPE[nb] === 'torch') return true;
  if (OPAQUE[nb]) return false;
  if (b === WATER) return nb !== WATER;
  if (b === GLASS) return nb !== GLASS;
  return true;
}

const meshOp = new FBuf(1 << 16), meshWa = new FBuf(1 << 14);
function vtx(buf, x, y, z, u, v, s, bl, sh) {
  const a = buf.a, n = buf.n;
  a[n] = x; a[n + 1] = y; a[n + 2] = z; a[n + 3] = u; a[n + 4] = v; a[n + 5] = s; a[n + 6] = bl; a[n + 7] = sh;
  buf.n = n + 8;
}
// Box with a sub-rectangle of a tile (used for torches)
function emitBox(buf, x, y, z, x0, y0, z0, x1, y1, z1, tile, s, bl) {
  for (const f of FACES) {
    buf.reserve(48);
    const pts = f.c.map(p => [p[0] ? x1 : x0, p[1] ? y1 : y0, p[2] ? z1 : z0]);
    const uvs = pts.map(p => f.axis === 1 ? [p[0], p[2] - 0.0625] : [f.axis === 0 ? p[2] : p[0], 1 - p[1]]);
    for (const k of ORDER_A) vtx(buf, x + pts[k][0], y + pts[k][1], z + pts[k][2], tileU(tile, uvs[k][0]), tileV(tile, uvs[k][1]), s, bl, f.shade);
  }
}
function buildChunkMesh(cx, cz) {
  const op = meshOp, wa = meshWa; op.n = 0; wa.n = 0;
  const x0 = cx * CS, z0 = cz * CS;
  const A = [0, 0, 0, 0], LS = [0, 0, 0, 0], LB = [0, 0, 0, 0];
  for (let y = 0; y < WY; y++) for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) {
    const i = idx(x, y, z), b = world[i];
    if (b === AIR) continue;
    const shape = SHAPE[b];
    if (shape === 'cross') {
      const t = BLOCKS[b].tex[0], s = skyL[i], bl = blkL[i];
      const q = 0.15, Q = 0.85;
      const quads = [[[q, 0, q], [Q, 0, Q], [Q, 1, Q], [q, 1, q]], [[Q, 0, q], [q, 0, Q], [q, 1, Q], [Q, 1, q]]];
      op.reserve(96);
      for (const quad of quads) {
        const uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
        for (const order of [[0, 1, 2, 0, 2, 3], [0, 2, 1, 0, 3, 2]]) for (const k of order)
          vtx(op, x + quad[k][0], y + quad[k][1], z + quad[k][2], tileU(t, uv[k][0]), tileV(t, uv[k][1]), s, bl, 0.9);
      }
      continue;
    }
    if (shape === 'torch') {
      emitBox(op, x, y, z, 7 / 16, 0, 7 / 16, 9 / 16, 10 / 16, 9 / 16, BLOCKS[b].tex[0], skyL[i], 15);
      continue;
    }
    const isW = b === WATER, lowTop = isW && get(x, y + 1, z) !== WATER;
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi], nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
      const nb = get(nx, ny, nz);
      if (!faceVisible(b, nb)) continue;
      const nIn = inWorld(nx, ny, nz), ni = nIn ? idx(nx, ny, nz) : -1;
      const s0 = nIn ? skyL[ni] : (ny >= WY || ny >= 0 ? 15 : 0), b0 = nIn ? blkL[ni] : 0;
      for (let k = 0; k < 4; k++) {
        if (isW) { A[k] = 3; LS[k] = s0; LB[k] = b0; continue; }
        const [d1, d2] = f.ao[k];
        const ax = nx + d1[0], ay = ny + d1[1], az = nz + d1[2];
        const bx = nx + d2[0], by = ny + d2[1], bz = nz + d2[2];
        const cx2 = ax + d2[0], cy2 = ay + d2[1], cz2 = az + d2[2];
        const ba = get(ax, ay, az), bb = get(bx, by, bz), bc = get(cx2, cy2, cz2);
        const s1 = OCC[ba], s2 = OCC[bb], cc = OCC[bc];
        A[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
        // smooth light: average the non-opaque cells around this corner
        let ss = s0, sb = b0, cnt = 1;
        if (!OPAQUE[ba]) { ss += skyAt(ax, ay, az); sb += blkAt(ax, ay, az); cnt++; }
        if (!OPAQUE[bb]) { ss += skyAt(bx, by, bz); sb += blkAt(bx, by, bz); cnt++; }
        if (!OPAQUE[bc] && !(s1 && s2)) { ss += skyAt(cx2, cy2, cz2); sb += blkAt(cx2, cy2, cz2); cnt++; }
        LS[k] = ss / cnt; LB[k] = sb / cnt;
      }
      const tile = texFor(b, f.slot), out = isW ? wa : op;
      out.reserve(48);
      const order = A[0] + A[2] >= A[1] + A[3] ? ORDER_A : ORDER_B;
      for (let j = 0; j < 6; j++) {
        const k = order[j], p = f.c[k];
        vtx(out, x + p[0], y + p[1] - (lowTop && p[1] === 1 ? 0.12 : 0), z + p[2],
          tileU(tile, f.uv[k][0]), tileV(tile, f.uv[k][1]), LS[k], LB[k], f.shade * AOL[A[k]]);
      }
    }
  }
  return { op: op.view(), wa: wa.view() };
}
