'use strict';
// ============================================================
//  Blocks, items, recipes and the generated texture atlas
// ============================================================

const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, SAND = 4, LOG = 5, LEAVES = 6, PLANKS = 7, COBBLE = 8,
  GLASS = 9, BRICK = 10, WATER = 11, BEDROCK = 12, GRAVEL = 13, COAL_ORE = 14, IRON_ORE = 15,
  DIAMOND_ORE = 16, TABLE = 17, FURNACE = 18, TORCH = 19, ROSE = 20, DANDELION = 21, TALL_GRASS = 22, SNOW = 23;
const NBLOCKS = 24;

const STICK = 100, COAL = 101, IRON = 102, DIAMOND = 103, APPLE = 104, PORK = 105, COOKED_PORK = 106, FLESH = 107;
const PICK = 0, AXE = 1, SHOVEL = 2, SWORD = 3;
const TOOL_BASE = 110;
const toolId = (kind, tier) => TOOL_BASE + kind * 4 + tier;

// ---------- atlas tile indices (16 columns x 8 rows of 16px tiles) ----------
const ATLAS_COLS = 16, ATLAS_ROWS = 8;
const T = {};
['grassTop', 'grassSide', 'dirt', 'stone', 'sand', 'logSide', 'logTop', 'leaves', 'planks', 'cobble', 'glass', 'brick',
  'water', 'bedrock', 'gravel', 'coalOre', 'ironOre', 'diamondOre', 'tableTop', 'tableSide', 'tableFront', 'furnaceSide',
  'furnaceFront', 'furnaceTop', 'torch', 'rose', 'dandelion', 'tallGrass', 'snow', 'snowSide'].forEach((n, i) => T[n] = i);
T.crack = 32; // 10 stages
['stick', 'coal', 'iron', 'diamond', 'apple', 'pork', 'cookedPork', 'flesh'].forEach((n, i) => T[n] = 48 + i);
T.tools = 56; // 16 tiles: kind * 4 + tier
['pigSkin', 'pigFace', 'zFace', 'zHeadSide', 'zHair', 'zShirt', 'zPants', 'zSkin', 'arm'].forEach((n, i) => T[n] = 80 + i);
// the homeless villager (rows 6 and 7 of the atlas)
['vFace', 'vFaceHappy', 'vFaceSleep', 'vFaceSad', 'vHeadSide', 'vHeadBack', 'vHatTop', 'vPom', 'vNose', 'vScarf',
  'vRobeFront', 'vRobeBack', 'vRobeSide', 'vArmsFront', 'vArmsSide', 'vLegL', 'vLegR', 'vLegSide', 'vBundle', 'vStick']
  .forEach((n, i) => T[n] = 96 + i);

// ---------- blocks ----------
const BLOCKS = [];
function blk(id, name, o) {
  BLOCKS[id] = Object.assign({ id, name, tex: null, shape: 'cube', transparent: false, solid: true, hardness: 1,
    tool: null, tier: -1, drop: id, light: 0, snd: 'stone', dim: false, replaceable: false }, o);
}
const all = t => [t, t, t];
blk(AIR, 'Air', { shape: 'none', transparent: true, solid: false, hardness: 0, drop: 0, replaceable: true });
blk(GRASS, 'Grass Block', { tex: [T.grassTop, T.dirt, T.grassSide], hardness: 0.6, tool: SHOVEL, drop: DIRT, snd: 'grass' });
blk(DIRT, 'Dirt', { tex: all(T.dirt), hardness: 0.5, tool: SHOVEL, snd: 'gravel' });
blk(STONE, 'Stone', { tex: all(T.stone), hardness: 1.5, tool: PICK, tier: 0, drop: COBBLE });
blk(SAND, 'Sand', { tex: all(T.sand), hardness: 0.5, tool: SHOVEL, snd: 'sand', falls: true });
blk(LOG, 'Oak Log', { tex: [T.logTop, T.logTop, T.logSide], hardness: 2, tool: AXE, snd: 'wood' });
blk(LEAVES, 'Leaves', { tex: all(T.leaves), transparent: true, hardness: 0.2, drop: 0, snd: 'grass', dim: true });
blk(PLANKS, 'Oak Planks', { tex: all(T.planks), hardness: 2, tool: AXE, snd: 'wood' });
blk(COBBLE, 'Cobblestone', { tex: all(T.cobble), hardness: 2, tool: PICK, tier: 0 });
blk(GLASS, 'Glass', { tex: all(T.glass), transparent: true, hardness: 0.3, drop: 0, snd: 'glass' });
blk(BRICK, 'Bricks', { tex: all(T.brick), hardness: 2, tool: PICK, tier: 0 });
blk(WATER, 'Water', { tex: all(T.water), shape: 'water', transparent: true, solid: false, hardness: -1, drop: 0, snd: 'water', dim: true, replaceable: true });
blk(BEDROCK, 'Bedrock', { tex: all(T.bedrock), hardness: -1 });
blk(GRAVEL, 'Gravel', { tex: all(T.gravel), hardness: 0.6, tool: SHOVEL, snd: 'gravel', falls: true });
blk(COAL_ORE, 'Coal Ore', { tex: all(T.coalOre), hardness: 3, tool: PICK, tier: 0, drop: COAL });
blk(IRON_ORE, 'Iron Ore', { tex: all(T.ironOre), hardness: 3, tool: PICK, tier: 1 });
blk(DIAMOND_ORE, 'Diamond Ore', { tex: all(T.diamondOre), hardness: 3, tool: PICK, tier: 2, drop: DIAMOND });
blk(TABLE, 'Crafting Table', { tex: [T.tableTop, T.planks, T.tableSide, T.tableFront], hardness: 2.5, tool: AXE, snd: 'wood' });
blk(FURNACE, 'Furnace', { tex: [T.furnaceTop, T.furnaceTop, T.furnaceSide, T.furnaceFront], hardness: 3.5, tool: PICK, tier: 0, light: 0 });
blk(TORCH, 'Torch', { tex: all(T.torch), shape: 'torch', transparent: true, solid: false, hardness: 0, light: 14, snd: 'wood', needsFloor: true });
blk(ROSE, 'Rose', { tex: all(T.rose), shape: 'cross', transparent: true, solid: false, hardness: 0, snd: 'grass', needsFloor: true });
blk(DANDELION, 'Dandelion', { tex: all(T.dandelion), shape: 'cross', transparent: true, solid: false, hardness: 0, snd: 'grass', needsFloor: true });
blk(TALL_GRASS, 'Tall Grass', { tex: all(T.tallGrass), shape: 'cross', transparent: true, solid: false, hardness: 0, drop: 0, snd: 'grass', needsFloor: true, replaceable: true });
blk(SNOW, 'Snowy Grass', { tex: [T.snow, T.dirt, T.snowSide], hardness: 0.6, tool: SHOVEL, drop: DIRT, snd: 'snow' });

const OPAQUE = new Uint8Array(256), SOLID = new Uint8Array(256), OCC = new Uint8Array(256),
  EMIT = new Uint8Array(256), DIM = new Uint8Array(256), REPLACEABLE = new Uint8Array(256), SHAPE = [];
BLOCKS.forEach((b, i) => {
  OPAQUE[i] = b.shape === 'cube' && !b.transparent ? 1 : 0;
  SOLID[i] = b.solid ? 1 : 0;
  OCC[i] = b.shape === 'cube' && (OPAQUE[i] || i === LEAVES) ? 1 : 0;
  EMIT[i] = b.light;
  DIM[i] = b.dim ? 1 : 0;
  REPLACEABLE[i] = b.replaceable ? 1 : 0;
  SHAPE[i] = b.shape;
});

// ---------- items ----------
const ITEMS = {};
function item(id, name, tile, o) { ITEMS[id] = Object.assign({ id, name, tile, stack: 64 }, o); }
for (let i = 1; i < NBLOCKS; i++) {
  const b = BLOCKS[i];
  item(i, b.name, b.tex[2], { block: true, flat: b.shape === 'cross' || b.shape === 'torch' });
}
item(STICK, 'Stick', T.stick);
item(COAL, 'Coal', T.coal);
item(IRON, 'Iron Ingot', T.iron);
item(DIAMOND, 'Diamond', T.diamond);
item(APPLE, 'Apple', T.apple, { food: [4, 2.4] });
item(PORK, 'Raw Porkchop', T.pork, { food: [3, 1.8] });
item(COOKED_PORK, 'Cooked Porkchop', T.cookedPork, { food: [8, 12.8] });
item(FLESH, 'Rotten Flesh', T.flesh, { food: [4, 0.8] });
const TIER_NAMES = ['Wooden', 'Stone', 'Iron', 'Diamond'], KIND_NAMES = ['Pickaxe', 'Axe', 'Shovel', 'Sword'];
const TOOL_DUR = [59, 131, 250, 1561], TOOL_SPEED = [2, 4, 6, 8];
for (let k = 0; k < 4; k++) for (let t = 0; t < 4; t++) {
  item(toolId(k, t), `${TIER_NAMES[t]} ${KIND_NAMES[k]}`, T.tools + k * 4 + t,
    { stack: 1, tool: { kind: k, tier: t }, dur: TOOL_DUR[t], damage: k === SWORD ? 4 + t : 2 + t });
}
function itemTile(id) { return ITEMS[id].tile; }

// what a block drops when mined in survival (null = nothing)
function blockDrops(b, rnd) {
  if (b === LEAVES) return rnd() < 0.08 ? [APPLE, 1] : null;
  const d = BLOCKS[b].drop;
  return d ? [d, 1] : null;
}

// ---------- crafting ----------
const RECIPES = [
  { out: [PLANKS, 4], in: [[LOG, 1]] },
  { out: [STICK, 4], in: [[PLANKS, 2]] },
  { out: [TABLE, 1], in: [[PLANKS, 4]] },
  { out: [TORCH, 4], in: [[COAL, 1], [STICK, 1]] },
  { out: [FURNACE, 1], in: [[COBBLE, 8]], at: TABLE },
];
[PLANKS, COBBLE, IRON, DIAMOND].forEach((mat, tier) => {
  RECIPES.push({ out: [toolId(PICK, tier), 1], in: [[mat, 3], [STICK, 2]], at: TABLE });
  RECIPES.push({ out: [toolId(SWORD, tier), 1], in: [[mat, 2], [STICK, 1]], at: TABLE });
  RECIPES.push({ out: [toolId(AXE, tier), 1], in: [[mat, 3], [STICK, 2]], at: TABLE });
  RECIPES.push({ out: [toolId(SHOVEL, tier), 1], in: [[mat, 1], [STICK, 2]], at: TABLE });
});
RECIPES.push(
  { out: [IRON, 1], in: [[IRON_ORE, 1], [COAL, 1]], at: FURNACE },
  { out: [COOKED_PORK, 1], in: [[PORK, 1], [COAL, 1]], at: FURNACE },
  { out: [GLASS, 1], in: [[SAND, 1], [COAL, 1]], at: FURNACE },
  { out: [STONE, 1], in: [[COBBLE, 1], [COAL, 1]], at: FURNACE },
  { out: [BRICK, 2], in: [[GRAVEL, 2], [COAL, 1]], at: FURNACE },
);

const CREATIVE_ITEMS = [GRASS, DIRT, STONE, COBBLE, SAND, GRAVEL, LOG, PLANKS, LEAVES, GLASS, BRICK, SNOW, COAL_ORE, IRON_ORE,
  DIAMOND_ORE, TABLE, FURNACE, TORCH, ROSE, DANDELION, TALL_GRASS, WATER, BEDROCK,
  STICK, COAL, IRON, DIAMOND, APPLE, PORK, COOKED_PORK, FLESH];
for (let k = 0; k < 4; k++) for (let t = 0; t < 4; t++) CREATIVE_ITEMS.push(toolId(k, t));

// ============================================================
//  Texture atlas (all pixel art is generated here)
// ============================================================
function buildAtlas() {
  const W = ATLAS_COLS * 16, H = ATLAS_ROWS * 16;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H), d = img.data;
  const r = mulberry32(20240611);
  const cl = v => v < 0 ? 0 : v > 255 ? 255 : v | 0;
  const put = (t, x, y, c) => {
    const i = (((t >> 4) * 16 + y) * W + (t % 16) * 16 + x) * 4;
    d[i] = cl(c[0]); d[i + 1] = cl(c[1]); d[i + 2] = cl(c[2]); d[i + 3] = c[3] === undefined ? 255 : c[3];
  };
  const paint = (t, f) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = f(x, y); if (c) put(t, x, y, c); } };
  const vary = (c, amt) => { const v = (r() - 0.5) * amt; return [c[0] + v, c[1] + v, c[2] + v, c[3]]; };
  const sh = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  const GR = [98, 162, 58], DI = [134, 96, 67], ST = [128, 128, 131];
  const dirt = () => vary(r() < 0.1 ? sh(DI, 0.78) : DI, 26);
  const stone = () => vary(r() < 0.1 ? [104, 104, 108] : ST, 24);
  const edge = []; for (let x = 0; x < 16; x++) edge[x] = 3 + Math.floor(r() * 3);
  const sedge = []; for (let x = 0; x < 16; x++) sedge[x] = 3 + Math.floor(r() * 2);

  paint(T.grassTop, () => vary(r() < 0.12 ? sh(GR, 0.82) : GR, 36));
  paint(T.dirt, dirt);
  paint(T.grassSide, (x, y) => y < edge[x] ? vary(sh(GR, 0.92), 30) : dirt());
  paint(T.stone, stone);
  paint(T.sand, () => vary([221, 207, 158], 18));
  paint(T.logSide, (x, y) => vary(x % 4 === 0 || (x + y * 3) % 11 === 0 ? [82, 63, 38] : [108, 84, 52], 14));
  paint(T.logTop, (x, y) => {
    const dx = x - 7.5, dy = y - 7.5, ring = Math.floor(Math.sqrt(dx * dx + dy * dy));
    return vary(x === 0 || y === 0 || x === 15 || y === 15 ? [96, 75, 45] : ring % 2 ? [176, 142, 88] : [152, 120, 72], 10);
  });
  paint(T.leaves, () => r() < 0.2 ? [0, 0, 0, 0] : vary(r() < 0.3 ? [44, 104, 28] : [62, 136, 38], 30));
  const plank = (x, y) => {
    const row = y >> 2, seam = row % 2 ? 4 : 12;
    return vary(y % 4 === 3 || x === seam ? [120, 93, 55] : [166, 133, 80], 14);
  };
  paint(T.planks, plank);
  // cobblestone: worley cells
  const pts = []; for (let i = 0; i < 8; i++) pts.push([r() * 16, r() * 16, 0.8 + r() * 0.35]);
  const cobble = (x, y) => {
    let d1 = 99, d2 = 99, w = 0;
    for (let i = 0; i < pts.length; i++) {
      let ax = Math.abs(x + 0.5 - pts[i][0]), ay = Math.abs(y + 0.5 - pts[i][1]);
      ax = Math.min(ax, 16 - ax); ay = Math.min(ay, 16 - ay);
      const dd = Math.sqrt(ax * ax + ay * ay);
      if (dd < d1) { d2 = d1; d1 = dd; w = i; } else if (dd < d2) d2 = dd;
    }
    return d2 - d1 < 1.1 ? vary([74, 74, 76], 14) : vary(sh([132, 132, 134], pts[w][2]), 18);
  };
  paint(T.cobble, cobble);
  paint(T.glass, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [214, 236, 248];
    if ((x - y === 4 || x - y === 5 || x - y === -6) && x > 1 && x < 14 && y > 1 && y < 14) return [245, 252, 255, 190];
    return [0, 0, 0, 0];
  });
  paint(T.brick, (x, y) => {
    const row = y >> 2, mortar = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 0;
    return mortar ? vary([186, 178, 166], 10) : vary(r() < 0.2 ? [132, 60, 46] : [158, 74, 56], 20);
  });
  paint(T.water, (x, y) => vary((x + y * 2) % 7 === 0 ? [80, 130, 230] : [46, 96, 212], 16));
  paint(T.bedrock, () => vary(r() < 0.35 ? [36, 36, 38] : [84, 84, 88], 30));
  paint(T.gravel, () => { const k = r(); return vary(k < 0.3 ? [150, 140, 136] : k < 0.6 ? [110, 104, 102] : k < 0.8 ? [128, 118, 104] : [84, 80, 80], 16); });
  const ore = (t, col, hi, seed) => {
    const rr = mulberry32(seed), blobs = [];
    for (let i = 0; i < 5; i++) blobs.push([1.5 + rr() * 13, 1.5 + rr() * 13, 0.9 + rr() * 0.9]);
    paint(t, (x, y) => {
      for (const [bx, by, br] of blobs) {
        const dd = Math.hypot(x + 0.5 - bx, y + 0.5 - by);
        if (dd < br) return vary(dd < br * 0.45 ? hi : col, 16);
      }
      return stone();
    });
  };
  ore(T.coalOre, [34, 34, 36], [70, 70, 72], 11);
  ore(T.ironOre, [196, 150, 120], [230, 196, 170], 22);
  ore(T.diamondOre, [70, 220, 230], [200, 255, 255], 33);
  paint(T.tableTop, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || y === 7) ? vary([96, 70, 40], 10) : plank(x, y));
  const tableSide = front => (x, y) => {
    if (y < 3) return vary([104, 78, 46], 10);
    if (front && x >= 3 && x <= 5 && y >= 5 && y <= 12) return vary([150, 150, 150], 20); // saw
    if (front && x >= 9 && x <= 12 && y >= 5 && y <= 7) return vary([120, 120, 125], 16); // hammer head
    if (front && x === 10 && y > 7 && y <= 12) return [90, 66, 40];
    if (!front && x >= 5 && x <= 10 && y >= 6 && y <= 10 && (x === 5 || x === 10 || y === 6 || y === 10)) return [80, 58, 34];
    return plank(x, y);
  };
  paint(T.tableSide, tableSide(false));
  paint(T.tableFront, tableSide(true));
  const smoothStone = (x, y) => vary(x === 0 || y === 0 || x === 15 || y === 15 ? [96, 96, 98] : [140, 140, 142], 12);
  paint(T.furnaceTop, smoothStone);
  paint(T.furnaceSide, (x, y) => y < 2 ? vary([150, 150, 152], 10) : cobble(x, y));
  paint(T.furnaceFront, (x, y) => {
    if (x >= 4 && x <= 11 && y >= 8 && y <= 13) return y >= 12 ? vary([255, 140, 40], 40) : [24, 22, 22];
    if (x >= 4 && x <= 11 && y >= 3 && y <= 5) return [60, 60, 62];
    return y < 2 ? vary([150, 150, 152], 10) : cobble(x, y);
  });
  paint(T.torch, (x, y) => {
    if (x < 7 || x > 8 || y < 6) return [0, 0, 0, 0];
    if (y === 6) return [255, 230, 120];
    if (y === 7) return [255, 150, 40];
    return vary([110, 84, 50], 14);
  });
  const flower = (col, hi) => (x, y) => {
    if (y >= 4 && y <= 7 && x >= 6 && x <= 9 && !((x === 6 || x === 9) && (y === 4 || y === 7))) return vary(x === 7 && y === 5 ? hi : col, 20);
    if (y > 7 && (x === 7 || x === 8)) return vary([60, 140, 40], 16);
    if ((y === 11 && x === 9) || (y === 12 && x === 10) || (y === 10 && x === 6) || (y === 11 && x === 5)) return [70, 150, 45];
    return [0, 0, 0, 0];
  };
  paint(T.rose, flower([200, 30, 30], [255, 120, 110]));
  paint(T.dandelion, flower([245, 220, 40], [255, 250, 160]));
  const blades = []; for (let x = 0; x < 16; x++) blades[x] = r() < 0.7 ? 3 + Math.floor(r() * 10) : 16;
  paint(T.tallGrass, (x, y) => (y >= blades[x] && x > 0 && x < 15) ? vary(y - blades[x] < 2 ? [120, 190, 70] : [80, 150, 50], 26) : [0, 0, 0, 0]);
  paint(T.snow, () => vary([240, 244, 250], 10));
  paint(T.snowSide, (x, y) => y < sedge[x] ? vary([240, 244, 250], 10) : dirt());

  // crack stages: a random crack network revealed a little more per stage
  const crackPx = [];
  { const rr = mulberry32(99), seen = new Set();
    for (let k = 0; k < 7; k++) {
      let x = 7 + Math.floor(rr() * 3) - 1, y = 7 + Math.floor(rr() * 3) - 1;
      const dx = rr() * 2 - 1, dy = rr() * 2 - 1;
      for (let s = 0; s < 12; s++) {
        x += Math.round(dx + rr() - 0.5); y += Math.round(dy + rr() - 0.5);
        if (x < 0 || y < 0 || x > 15 || y > 15) break;
        const key = x + y * 16; if (!seen.has(key)) { seen.add(key); crackPx.push([x, y, s]); }
      }
    }
    crackPx.sort((a, b) => a[2] - b[2]);
  }
  for (let st = 0; st < 10; st++) {
    const n = Math.floor(crackPx.length * (st + 1) / 10);
    for (let i = 0; i < n; i++) put(T.crack + st, crackPx[i][0], crackPx[i][1], [20, 20, 20, 200]);
  }

  // mobs
  const PINK = [236, 156, 156], GREEN = [84, 140, 64];
  paint(T.pigSkin, () => vary(PINK, 14));
  paint(T.pigFace, (x, y) => {
    if (y === 6 && (x === 3 || x === 12)) return [250, 250, 250];
    if (y === 6 && (x === 4 || x === 11)) return [20, 20, 20];
    if (y >= 9 && y <= 12 && x >= 5 && x <= 10) return (y === 10 || y === 11) && (x === 6 || x === 9) ? [120, 60, 70] : vary([224, 120, 130], 8);
    return vary(PINK, 14);
  });
  paint(T.zFace, (x, y) => {
    if (y >= 7 && y <= 8 && (x === 3 || x === 4 || x === 11 || x === 12)) return [20, 30, 20];
    if (y === 11 && x >= 6 && x <= 9) return [40, 60, 30];
    return vary(y < 3 ? [40, 80, 30] : GREEN, 16);
  });
  paint(T.zHeadSide, (x, y) => vary(y < 3 ? [40, 80, 30] : GREEN, 16));
  paint(T.zHair, () => vary([40, 80, 30], 14));
  paint(T.zShirt, () => vary([40, 160, 164], 16));
  paint(T.zPants, () => vary([62, 62, 150], 14));
  paint(T.zSkin, () => vary(GREEN, 16));
  paint(T.arm, (x, y) => vary(y > 12 ? [60, 150, 200] : [205, 152, 116], 10));

  // ---------- the homeless villager's hand-drawn textures ----------
  // Each is a 16x16 pixel map; letters pick colours from the palette below.
  const VP = {
    s: [202, 150, 110], S: [168, 118, 82], r: [222, 128, 106], K: [58, 39, 24],
    w: [244, 244, 240], g: [70, 150, 70], p: [24, 24, 24], e: [74, 50, 34], W: [150, 210, 255],
    b: [138, 122, 106], B: [102, 90, 78], m: [96, 40, 34],
    h: [196, 58, 44], H: [150, 40, 32], t: [236, 222, 184], T: [200, 186, 150],
    a: [110, 86, 64], A: [80, 60, 44], G: [168, 164, 156],
    R: [124, 92, 62], D: [92, 66, 42], L: [146, 112, 76], O: [60, 42, 26],
    x: [210, 50, 50], y: [60, 110, 200], z: [40, 30, 20],
    c: [190, 160, 104], C: [140, 114, 70], k: [110, 88, 52],
    q: [40, 30, 20], u: [76, 108, 160], F: [66, 46, 28], P: [100, 72, 46], f: [150, 166, 176],
  };
  const pat = (t, rows, noise = 10) => paint(t, (x, y) => { const c = VP[rows[y][x]]; return c ? vary(c, noise) : [255, 0, 255]; });
  const HAT = ['hHhhHhhHhhHhhHhh', 'HhhHhhHhhHhhHhhH', 'tttttttttttttttt', 'TTTTTTTTTTTTTTTT'];
  const BEARD = ['bbsBBBBBBBBBBsbb', 'bbbBmmmmmmmmBbbb', 'bbbbbbbbbbbbbbbb', 'BbbbbbbbbbbbbbbB', 'BBbbBbbbbbBbbBBB'];
  pat(T.vFace, [...HAT, 'ssssssssssssssss', 'seeeesssssseeees', 'sswgpsssssspgwss', 'ssSwwSssssSwwSss',
    'sssSSssssssSSsss', 'srrssssssssssrrs', 'bssssssssssssssb', ...BEARD]);
  pat(T.vFaceHappy, [...HAT, 'ssssssssssssssss', 'seeeesssssseeees', 'sssKKssssssKKsss', 'ssKssKssssKssKss',
    'ssssssssssssssss', 'srrrssssssssrrrs', 'bssssssssssssssb', 'bbmBBBBBBBBBBmbb', 'bbbmwwwwwwwwmbbb',
    'bbbbmmmmmmmmbbbb', 'BbbbbbbbbbbbbbbB', 'BBbbBbbbbbBbbBBB']);
  pat(T.vFaceSleep, [...HAT, 'ssssssssssssssss', 'ssssssssssssssss', 'seeeesssssseeees', 'ssKKKssssssKKKss',
    'sssSSssssssSSsss', 'srrssssssssssrrs', 'bssssssssssssssb', 'bbsBBBBBBBBBBsbb', 'bbbbbbbmmbbbbbbb',
    'bbbbbbbbbbbbbbbb', 'BbbbbbbbbbbbbbbB', 'BBbbBbbbbbBbbBBB']);
  pat(T.vFaceSad, [...HAT, 'sssssessssesssss', 'sseeesssssseeess', 'sswgpsssssspgwss', 'ssSwwSssssSwwSss',
    'sssSSssssssSSWss', 'srrssssssssssWrs', 'bssssssssssssssb', 'bbsBBBBBBBBBBsbb', 'bbbbmmmmmmmmbbbb',
    'bbbmbbbbbbbbmbbb', 'BbbbbbbbbbbbbbbB', 'BBbbBbbbbbBbbBBB']);
  pat(T.vHeadSide, [...HAT, 'ssssssaaaaaaaaaa', 'sssssssaaaaaaaaa', 'ssssssSSsaaaaaaa', 'ssssssSKSaaaaaaa',
    'ssssssSSsaaaaaaa', 'bsssssssaaaaaaaa', 'bbssssssaaaaaaaa', 'bbbssssssaaaaaaa', 'bbbbsssssssaaaaa',
    'BbbbbbsssssssaaG', 'BbbbbbbsssssssSS', 'BBbbbbbbSSSSSSSS']);
  pat(T.vHeadBack, [...HAT, 'aaaaaaaaaaaaaaaa', 'aAaaGaaAaaaGaaAa', 'aaaAaaaaaGaaaaaa', 'aaaaaaaaaaaaaaaa',
    'aGaaaAaaaaaaGaaa', 'aaaaaaaaaaaaaaaa', 'aaaaAaaaaaaaaaAa', 'AaaaaaaaaaaaaaaA', 'sAaaaaaaaaaaaaAs',
    'ssAaaaaaaaaaaAss', 'sssSSSSSSSSSSsss', 'SSSSSSSSSSSSSSSS']);
  paint(T.vHatTop, (x, y) => { const d = Math.floor(Math.hypot(x - 7.5, y - 7.5)); return vary(d % 3 === 2 ? VP.t : (x + y) % 2 ? VP.h : VP.H, 10); });
  paint(T.vPom, () => vary(r() < 0.3 ? VP.h : r() < 0.5 ? [255, 250, 240] : VP.t, 12));
  paint(T.vNose, (x, y) => y < 6 ? vary(VP.S, 8) : (x === 5 || x === 6) && y === 8 ? [255, 170, 150] : vary([214, 84, 70], 12));
  paint(T.vScarf, (x, y) => (y === 0 || y === 15) ? vary([40, 80, 44], 8) : vary(Math.floor(x / 3) % 2 ? [228, 190, 70] : [62, 138, 72], 12));
  pat(T.vRobeFront, ['DRRRRRRDDRRRRRRD', 'RLRRRRROORRRRLRR', 'RRRRRRxOORRRRRRR', 'RgggggROORRRRRRR', 'RgqgqgROORRRRRRR',
    'RgggggyOORRRRRRR', 'RqgqggROORRRRRRR', 'RRRRRRROORRRRRRR', 'RRRRRRzOORRRRRRR', 'cCcCcCckkcCcCcCc',
    'CcCcCcCkkCcCcCcC', 'RRRffRROkRRRRRRR', 'RRRPPPPOkRRuuuuR', 'RRRPPPPOORRuquuR', 'RRRPPPPOORRuuuuR',
    'FRFFRFFOOFFRFFRF']);
  pat(T.vRobeBack, ['DRRRRRRRRRRRRRRD', 'RRRRRRRRRRRRRRRR', 'RRLRRRRRRRRRRLRR', 'RRRRRRRRRRRRRRRR', 'RRRRuuuuuuRRRRRR',
    'RRRRuququqRRRRRR', 'RRRRuuuuuuRRRRRR', 'RRRRuquququRRRRR', 'RRRRuuuuuuRRRRRR', 'cCcCcCcCcCcCcCcC',
    'CcCcCcCcCcCcCcCc', 'RRRRRRRRRRRRLRRR', 'RRRRRRRRRRgggRRR', 'RRLRRRRRRRgqgRRR', 'RRRRRRRRRRRRRRRR',
    'FRFFRFFRFFFRFFRF']);
  paint(T.vRobeSide, (x, y) => y === 9 || y === 10 ? vary((x + y) % 2 ? VP.c : VP.C, 8) : y === 15 ? vary(x % 3 ? VP.F : VP.R, 8)
    : vary(r() < 0.1 ? VP.D : r() < 0.1 ? VP.L : VP.R, 12));
  paint(T.vArmsFront, (x, y) => {
    if (x === 0 || x === 15) return y >= 4 && y <= 11 ? vary(VP.s, 8) : vary([110, 110, 116], 8);     // fingertips
    if (x <= 2 || x >= 13) return vary((x + y) % 2 ? [122, 122, 128] : [96, 96, 104], 6);          // fingerless gloves
    if (x === 3 || x === 12) return vary(VP.O, 6);                                                  // cuffs
    if (x >= 6 && x <= 9 && y >= 3 && y <= 12) return (x === 6 || x === 9 || y === 3 || y === 12) && (x + y) % 2 ? VP.q : vary([96, 140, 80], 10);
    return vary(y === 8 ? VP.D : VP.R, 12);
  });
  paint(T.vArmsSide, (x, y) => vary(x < 3 ? [110, 110, 116] : x === 3 ? VP.O : VP.R, 10));
  const LEG = (hole, toe) => (x, y) => {
    if (y === 15) return vary(VP.K, 6);                                                             // sole
    if (y >= 11) {
      if (toe && y >= 13 && x >= 10 && x <= 12) return vary(VP.s, 8);                               // toe out of the boot!
      if (y === 11 && x >= 5 && x <= 10 && x % 2) return vary(VP.c, 8);                              // laces
      return vary([74, 48, 32], 10);
    }
    if (hole && y >= 5 && y <= 7 && x >= 5 && x <= 10) return (x === 5 || x === 10) ? vary([130, 140, 160], 8) : vary(VP.s, 8);
    if (!hole && y >= 4 && y <= 8 && x >= 3 && x <= 12) return (x === 3 || x === 12 || y === 4 || y === 8) && (x + y) % 2 ? VP.q : vary([140, 96, 60], 10);
    if (y === 10) return vary(r() < 0.5 ? [70, 80, 100] : [100, 110, 130], 8);                      // frayed cuff
    return vary(r() < 0.12 ? [74, 84, 104] : [92, 102, 124], 10);
  };
  paint(T.vLegL, LEG(false, false));
  paint(T.vLegR, LEG(true, true));
  paint(T.vLegSide, (x, y) => y === 15 ? vary(VP.K, 6) : y >= 11 ? vary([74, 48, 32], 10) : vary([92, 102, 124], 10));
  paint(T.vBundle, (x, y) => {
    if (y <= 2 && x >= 6 && x <= 9) return vary([150, 30, 26], 8);                                   // knot
    if ((x % 5 === 1 && y % 5 === 1) || ((x + 2) % 5 === 1 && (y + 3) % 5 === 1)) return [250, 245, 235];
    return vary([196, 48, 40], 12);
  });
  paint(T.vStick, (x, y) => vary(x % 5 === 0 ? [100, 72, 42] : [134, 98, 58], 10));

  ctx.putImageData(img, 0, 0);
  drawItemSprites(ctx);
  return cv;
}

// Item sprites are drawn with vector shapes on a 16x16 canvas, then snapped to hard pixels.
function drawItemSprites(atlasCtx) {
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 16;
  const c = tmp.getContext('2d');
  const MAT = [[150, 112, 64], [136, 136, 136], [226, 226, 226], [90, 232, 222]];
  const rgb = (a, k = 1) => `rgb(${a[0] * k | 0},${a[1] * k | 0},${a[2] * k | 0})`;
  const HANDLE = [122, 88, 48];

  const sprite = (tile, draw) => {
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 16, 16);
    draw(c);
    const im = c.getImageData(0, 0, 16, 16), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i + 3] = d[i + 3] > 110 ? 255 : 0;
    }
    c.putImageData(im, 0, 0);
    atlasCtx.drawImage(tmp, (tile % 16) * 16, (tile >> 4) * 16);
  };
  // draw twice: darker outline pass offset, then the colour pass
  const twoPass = (col, fn) => ctx => {
    ctx.fillStyle = ctx.strokeStyle = rgb(col, 0.55); ctx.save(); ctx.translate(0.7, 0.7); fn(ctx); ctx.restore();
    ctx.fillStyle = ctx.strokeStyle = rgb(col); fn(ctx);
  };
  const diag = ctx => { ctx.translate(8, 8); ctx.rotate(Math.PI / 4); };

  sprite(T.stick, ctx => twoPass(HANDLE, x => { x.save(); diag(x); x.fillRect(-1, -7, 2, 14); x.restore(); })(ctx));
  for (let tier = 0; tier < 4; tier++) {
    const m = MAT[tier];
    const handle = x => { x.save(); diag(x); x.fillRect(-1, -4, 2, 12); x.restore(); };
    sprite(T.tools + PICK * 4 + tier, ctx => {
      twoPass(HANDLE, handle)(ctx);
      twoPass(m, x => { x.save(); diag(x); x.lineWidth = 2.4; x.beginPath(); x.moveTo(-7, -2); x.quadraticCurveTo(0, -9, 7, -2); x.stroke(); x.restore(); })(ctx);
    });
    sprite(T.tools + AXE * 4 + tier, ctx => {
      twoPass(HANDLE, handle)(ctx);
      twoPass(m, x => { x.save(); diag(x); x.beginPath(); x.moveTo(-1, -7); x.lineTo(3, -8); x.lineTo(5, -5); x.lineTo(5, -1); x.lineTo(2, -1); x.lineTo(-1, -3); x.fill(); x.restore(); })(ctx);
    });
    sprite(T.tools + SHOVEL * 4 + tier, ctx => {
      twoPass(HANDLE, handle)(ctx);
      twoPass(m, x => { x.save(); diag(x); x.beginPath(); x.moveTo(-2.5, -3); x.lineTo(-2.5, -7); x.quadraticCurveTo(0, -10, 2.5, -7); x.lineTo(2.5, -3); x.fill(); x.restore(); })(ctx);
    });
    sprite(T.tools + SWORD * 4 + tier, ctx => {
      twoPass(m, x => { x.save(); diag(x); x.beginPath(); x.moveTo(-1.5, 2); x.lineTo(-1.5, -7); x.lineTo(0, -9); x.lineTo(1.5, -7); x.lineTo(1.5, 2); x.fill(); x.restore(); })(ctx);
      twoPass(HANDLE, x => { x.save(); diag(x); x.fillRect(-4, 2, 8, 1.8); x.fillRect(-1, 3, 2, 5); x.restore(); })(ctx);
    });
  }
  sprite(T.coal, ctx => twoPass([52, 52, 56], x => { x.beginPath(); x.moveTo(3, 8); x.lineTo(6, 3); x.lineTo(11, 4); x.lineTo(13, 9); x.lineTo(9, 13); x.lineTo(4, 12); x.fill(); })(ctx));
  sprite(T.iron, ctx => twoPass([220, 220, 222], x => { x.beginPath(); x.moveTo(2, 11); x.lineTo(5, 6); x.lineTo(14, 6); x.lineTo(12, 11); x.fill(); })(ctx));
  sprite(T.diamond, ctx => twoPass([96, 236, 226], x => { x.beginPath(); x.moveTo(8, 2); x.lineTo(14, 7); x.lineTo(8, 14); x.lineTo(2, 7); x.fill(); })(ctx));
  sprite(T.apple, ctx => {
    twoPass([214, 36, 36], x => { x.beginPath(); x.arc(8, 9.5, 5, 0, Math.PI * 2); x.fill(); })(ctx);
    ctx.fillStyle = '#6b4a24'; ctx.fillRect(7.5, 2, 1.5, 3.5);
    ctx.fillStyle = '#4caf3a'; ctx.fillRect(9, 3, 3, 2);
  });
  const meat = (col) => ctx => twoPass(col, x => { x.beginPath(); x.ellipse(8, 8.5, 6, 4.5, -0.5, 0, Math.PI * 2); x.fill(); })(ctx);
  sprite(T.pork, ctx => { meat([240, 150, 150])(ctx); ctx.fillStyle = '#fbe0dc'; ctx.fillRect(5, 7, 5, 1.6); });
  sprite(T.cookedPork, ctx => { meat([176, 110, 60])(ctx); ctx.fillStyle = '#e0b070'; ctx.fillRect(5, 7, 5, 1.6); });
  sprite(T.flesh, ctx => { meat([140, 120, 70])(ctx); ctx.fillStyle = '#6a8a40'; ctx.fillRect(6, 9, 4, 1.6); });
}

// ---------- item icons for the UI (canvas elements) ----------
function itemIcon(id, size = 48) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const it = ITEMS[id], k = size / 48;
  const src = t => [(t % 16) * 16, (t >> 4) * 16];
  if (it.block && !it.flat) {
    const b = BLOCKS[id], [top, , side] = b.tex, front = b.tex[3] !== undefined ? b.tex[3] : side;
    const face = (t, m, dark) => {
      x.setTransform(m[0] * k, m[1] * k, m[2] * k, m[3] * k, m[4] * k, m[5] * k);
      const [sx, sy] = src(t);
      x.drawImage(ATLAS, sx, sy, 16, 16, 0, 0, 16, 16);
      if (dark) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(0,0,0,${dark})`; x.fillRect(0, 0, 16, 16); x.globalCompositeOperation = 'source-over'; }
    };
    face(front, [20 / 16, 10 / 16, 0, 22 / 16, 4, 14], 0.22);
    face(side, [20 / 16, -10 / 16, 0, 22 / 16, 24, 24], 0.42);
    face(top, [20 / 16, -10 / 16, 20 / 16, 10 / 16, 4, 14], 0);
  } else {
    const [sx, sy] = src(it.tile);
    x.drawImage(ATLAS, sx, sy, 16, 16, 4 * k, 4 * k, 40 * k, 40 * k);
  }
  return cv;
}
const ICON_CACHE = {};
function iconURL(id) {
  if (!ICON_CACHE[id]) ICON_CACHE[id] = itemIcon(id).toDataURL();
  return ICON_CACHE[id];
}

// ---------- HUD pixel icons (hearts, hunger, air) ----------
function patternIcon(rows, pal) {
  const cv = document.createElement('canvas'); cv.width = rows[0].length; cv.height = rows.length;
  const x = cv.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); } }));
  return cv.toDataURL();
}
const HEART = ['.KK...KK.', 'KRRK.KRRK', 'KRWRKRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....'];
const DRUM = ['......KK.', '.....KMMK', '....KBBMK', '...KBBBK.', '..KBBBBK.', '.KWKBBK..', 'KWWKKK...', 'KWK......', '.K.......'];
const BUBBLE = ['..KKKK..', '.KBBBBK.', 'KBWBBBBK', 'KBWBBBBK', 'KBBBBBBK', 'KBBBBBBK', '.KBBBBK.', '..KKKK..'];
const half = (rows, left, pal2) => rows.map(r => [...r].map((ch, i) => i > left && pal2[ch] ? pal2[ch] : ch).join(''));
const HUD_ICONS = {
  heart: patternIcon(HEART, { K: '#1a0606', R: '#e11b1b', W: '#ffb4b4' }),
  heartHalf: patternIcon(half(HEART, 4, { R: 'E', W: 'E' }), { K: '#1a0606', R: '#e11b1b', W: '#ffb4b4', E: '#3d1414' }),
  heartEmpty: patternIcon(HEART, { K: '#1a0606', R: '#3d1414', W: '#3d1414' }),
  food: patternIcon(DRUM, { K: '#2a1606', B: '#b8672e', M: '#e39a5a', W: '#efe6d6' }),
  foodHalf: patternIcon(half(DRUM, 3, { B: 'E', M: 'E', W: 'E' }), { K: '#2a1606', B: '#b8672e', M: '#e39a5a', W: '#efe6d6', E: '#3b2a1c' }),
  foodEmpty: patternIcon(DRUM, { K: '#2a1606', B: '#3b2a1c', M: '#3b2a1c', W: '#3b2a1c' }),
  bubble: patternIcon(BUBBLE, { K: '#10204a', B: '#4f8dff', W: '#ffffff' }),
};

const ATLAS = buildAtlas();
