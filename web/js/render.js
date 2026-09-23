'use strict';
// ============================================================
//  WebGL renderer: world chunks, sky, clouds, entities, hand
// ============================================================

const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, a = {};
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
  return { p, u, a };
}

let blockProg, entProg, flatProg, atlasTex;
const FOG_GLSL = `vFog = clamp((distance(wp, uCam) - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);`;

function initRenderer() {
  blockProg = program(`
attribute vec3 aPos; attribute vec2 aUv; attribute vec3 aL;
uniform mat4 uMvp; uniform vec3 uCam; uniform vec2 uFog; uniform float uSun; uniform float uGamma;
varying vec2 vUv; varying vec3 vCol; varying float vFog;
void main(){
  gl_Position = uMvp * vec4(aPos, 1.0);
  vUv = aUv;
  float s = aL.x * uSun, b = aL.y;
  float br = pow(0.82, 15.0 - max(s, b));
  br = max(pow(br, 1.0 - 0.5 * uGamma), 0.02);
  vec3 tint = b > s ? mix(vec3(1.0), vec3(1.0, 0.85, 0.64), clamp((b - s) / 8.0, 0.0, 1.0))
                    : mix(vec3(0.62, 0.7, 1.0), vec3(1.0), clamp(uSun * 1.4 - 0.3, 0.0, 1.0));
  vCol = tint * br * aL.z;
  vec3 wp = aPos; ${FOG_GLSL}
}`, `
precision mediump float;
uniform sampler2D uTex; uniform vec3 uFogCol; uniform float uAlpha;
varying vec2 vUv; varying vec3 vCol; varying float vFog;
void main(){
  vec4 c = texture2D(uTex, vUv);
  if (c.a < 0.5) discard;
  gl_FragColor = vec4(mix(c.rgb * vCol, uFogCol, vFog), uAlpha);
}`);

  entProg = program(`
attribute vec3 aPos; attribute vec2 aUv; attribute float aShade;
uniform mat4 uMvp; uniform mat4 uModel; uniform vec3 uCam; uniform vec2 uFog; uniform vec2 uUvOff;
varying vec2 vUv; varying float vShade; varying float vFog;
void main(){
  gl_Position = uMvp * vec4(aPos, 1.0);
  vUv = aUv + uUvOff; vShade = aShade;
  vec3 wp = (uModel * vec4(aPos, 1.0)).xyz; ${FOG_GLSL}
}`, `
precision mediump float;
uniform sampler2D uTex; uniform vec3 uFogCol; uniform float uBright; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUv; varying float vShade; varying float vFog;
void main(){
  vec4 c = texture2D(uTex, vUv);
  if (c.a < 0.1) discard;
  vec3 col = mix(c.rgb * vShade * uBright, uTint.rgb, uTint.a);
  gl_FragColor = vec4(mix(col, uFogCol, vFog), c.a * uAlpha);
}`);

  flatProg = program(`
attribute vec3 aPos; uniform mat4 uMvp; uniform vec3 uOff; uniform float uPs; uniform vec3 uCam; uniform vec2 uFade;
varying float vA;
void main(){
  vec3 p = aPos + uOff;
  gl_Position = uMvp * vec4(p, 1.0);
  gl_PointSize = uPs;
  vA = 1.0 - smoothstep(uFade.x, uFade.y, distance(p.xz, uCam.xz));
}`, `
precision mediump float;
uniform vec4 uColor; varying float vA;
void main(){ gl_FragColor = vec4(uColor.rgb, uColor.a * vA); }`);

  atlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ATLAS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  buildStaticMeshes();
}

// brightness of a light level, matching the block shader
function brightness(sky, blk, sun, gamma) {
  const br = Math.pow(0.82, 15 - Math.max(sky * sun, blk));
  return Math.max(Math.pow(br, 1 - 0.5 * gamma), 0.02);
}

// ---------------- chunks ----------------
const chunks = [];
function initChunks() {
  for (let cz = 0; cz < NCZ; cz++) for (let cx = 0; cx < NCX; cx++)
    chunks.push({ cx, cz, op: gl.createBuffer(), wa: gl.createBuffer(), opN: 0, waN: 0, dirty: true });
}
function uploadChunk(ch) {
  const m = buildChunkMesh(ch.cx, ch.cz);
  gl.bindBuffer(gl.ARRAY_BUFFER, ch.op); gl.bufferData(gl.ARRAY_BUFFER, m.op, gl.STATIC_DRAW); ch.opN = m.op.length / 8;
  gl.bindBuffer(gl.ARRAY_BUFFER, ch.wa); gl.bufferData(gl.ARRAY_BUFFER, m.wa, gl.STATIC_DRAW); ch.waN = m.wa.length / 8;
  ch.dirty = false;
}
function markDirtyBox(x0, z0, x1, z1) {
  for (const c of chunks) {
    if (c.cx * CS <= x1 && c.cx * CS + CS - 1 >= x0 && c.cz * CS <= z1 && c.cz * CS + CS - 1 >= z0) c.dirty = true;
  }
}

// ---------------- entity meshes (x y z u v shade) ----------------
function makeMesh(arr) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
  return { buf, n: arr.length / 6 };
}
// box of size w,h,d centred on (ox,oy,oz); tiles given per face in FACES order (+x -x +y -y +z -z)
function boxGeom(w, h, d, tiles, ox = 0, oy = 0, oz = 0, out = []) {
  FACES.forEach((f, fi) => {
    const t = tiles[fi];
    for (const k of ORDER_A) {
      const p = f.c[k];
      out.push((p[0] - 0.5) * w + ox, (p[1] - 0.5) * h + oy, (p[2] - 0.5) * d + oz,
        t < 0 ? f.uv[k][0] / ATLAS_COLS : tileU(t, f.uv[k][0]), t < 0 ? f.uv[k][1] / ATLAS_ROWS : tileV(t, f.uv[k][1]), f.shade);
    }
  });
  return out;
}
const six = t => [t, t, t, t, t, t];
const MESH = {};
const MODELS = {};
function buildStaticMeshes() {
  MESH.unitCube = makeMesh(boxGeom(1, 1, 1, six(-1), 0.5, 0.5, 0.5)); // uv = tile 0; shifted with uUvOff
  // pig
  const P = T.pigSkin;
  MODELS.pig = [
    { mesh: makeMesh(boxGeom(0.625, 0.5, 1.0, six(P))), pivot: [0, 0.625, 0.05] },
    { mesh: makeMesh(boxGeom(0.5, 0.5, 0.5, [P, P, P, P, P, T.pigFace], 0, 0, -0.2)), pivot: [0, 0.78, -0.52], anim: 'head' },
    { mesh: makeMesh(boxGeom(0.25, 0.375, 0.25, six(P), 0, -0.1875, 0)), pivot: [-0.18, 0.375, -0.3], anim: 'legA' },
    { mesh: makeMesh(boxGeom(0.25, 0.375, 0.25, six(P), 0, -0.1875, 0)), pivot: [0.18, 0.375, -0.3], anim: 'legB' },
    { mesh: makeMesh(boxGeom(0.25, 0.375, 0.25, six(P), 0, -0.1875, 0)), pivot: [-0.18, 0.375, 0.38], anim: 'legB' },
    { mesh: makeMesh(boxGeom(0.25, 0.375, 0.25, six(P), 0, -0.1875, 0)), pivot: [0.18, 0.375, 0.38], anim: 'legA' },
  ];
  const leg = makeMesh(boxGeom(0.25, 0.75, 0.25, six(T.zPants), 0, -0.375, 0));
  const arm = makeMesh(boxGeom(0.25, 0.75, 0.25, six(T.zSkin), 0, -0.3, 0));
  MODELS.zombie = [
    { mesh: leg, pivot: [-0.125, 0.75, 0], anim: 'legA' },
    { mesh: leg, pivot: [0.125, 0.75, 0], anim: 'legB' },
    { mesh: makeMesh(boxGeom(0.5, 0.75, 0.25, six(T.zShirt))), pivot: [0, 1.125, 0] },
    { mesh: makeMesh(boxGeom(0.5, 0.5, 0.5, [T.zHeadSide, T.zHeadSide, T.zHair, T.zHeadSide, T.zHeadSide, T.zFace], 0, 0.25, 0)), pivot: [0, 1.5, 0], anim: 'head' },
    { mesh: arm, pivot: [-0.375, 1.375, 0], anim: 'armA' },
    { mesh: arm, pivot: [0.375, 1.375, 0], anim: 'armB' },
  ];
  const V = T.vHeadSide;
  MODELS.villager = [
    { mesh: makeMesh(boxGeom(0.25, 0.75, 0.25, six(T.vPants), 0, -0.375, 0)), pivot: [-0.125, 0.75, 0], anim: 'legA' },
    { mesh: makeMesh(boxGeom(0.25, 0.75, 0.25, six(T.vPants), 0, -0.375, 0)), pivot: [0.125, 0.75, 0], anim: 'legB' },
    { mesh: makeMesh(boxGeom(0.52, 0.85, 0.32, six(T.vRobe))), pivot: [0, 1.1, 0] },
    { mesh: makeMesh(boxGeom(0.6, 0.24, 0.26, six(T.vArms), 0, 0, -0.26)), pivot: [0, 1.28, 0] },   // folded arms
    { mesh: makeMesh([...boxGeom(0.5, 0.56, 0.5, [V, V, T.vHair, V, V, T.vFace], 0, 0.28, 0),
                      ...boxGeom(0.13, 0.24, 0.12, six(T.vNose), 0, 0.12, -0.3)]), pivot: [0, 1.5, 0], anim: 'head' },
  ];
  MESH.arm = makeMesh(boxGeom(0.24, 0.24, 0.75, six(T.arm), 0, 0, 0));

  // selection outline
  const e = -0.004, E = 1.004, c = [], corners = [];
  for (let i = 0; i < 8; i++) corners.push([i & 1 ? E : e, i & 2 ? E : e, i & 4 ? E : e]);
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) c.push(...corners[i], ...corners[i | bit]);
  MESH.lines = flatMesh(c);

  // sky: sun, moon, stars (sky space, rotated by time of day)
  const quad = (x, s) => [x, -s, -s, x, s, -s, x, s, s, x, -s, -s, x, s, s, x, -s, s];
  MESH.sun = flatMesh(quad(100, 9)); MESH.sunGlow = flatMesh(quad(100, 17)); MESH.moon = flatMesh(quad(-100, 8));
  const rs = mulberry32(7), st = [];
  for (let i = 0; i < 500; i++) {
    const u = rs() * 2 - 1, th = rs() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    st.push(r * Math.cos(th) * 100, u * 100, r * Math.sin(th) * 100);
  }
  MESH.stars = flatMesh(st);

  // clouds: blocky flat sheet, 512 x 512 blocks, tiled while drifting
  const cl = [];
  for (let z = 0; z < 64; z++) for (let x = 0; x < 64; x++) {
    const n = fbm(x / 5, z / 5, 1234, 2) + hash2(x, z, 77) * 0.12;
    if (n < 0.6) continue;
    const x0 = x * 8, z0 = z * 8 - 176, x1 = x0 + 8, z1 = z0 + 8;
    cl.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z0, x1, 0, z1, x0, 0, z1);
  }
  MESH.clouds = flatMesh(cl);
  MESH.particles = { buf: gl.createBuffer(), n: 0 };
}
function flatMesh(arr) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
  return { buf, n: arr.length / 3 };
}
const itemMeshCache = {};
function itemMesh(id) {
  if (itemMeshCache[id]) return itemMeshCache[id];
  const it = ITEMS[id];
  let m;
  if (it.block && !it.flat) {
    const tiles = FACES.map(f => texFor(id, f.slot));
    m = { mesh: makeMesh(boxGeom(1, 1, 1, tiles)), cube: true };
  } else {
    // flat sprite: front and back faces
    const t = it.tile, a = [];
    const P = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], UV = [[0, 1], [1, 1], [1, 0], [0, 0]];
    for (const [ord, z, sh] of [[[0, 1, 2, 0, 2, 3], 0.01, 1], [[0, 2, 1, 0, 3, 2], -0.01, 0.8]])
      for (const k of ord) a.push(P[k][0], P[k][1], z, tileU(t, UV[k][0]), tileV(t, UV[k][1]), sh);
    m = { mesh: makeMesh(a), cube: false };
  }
  return itemMeshCache[id] = m;
}

// ---------------- drawing helpers ----------------
function useEnt(mvpBase, fog, fogCol, eye) {
  gl.useProgram(entProg.p);
  gl.uniform3fv(entProg.u.uCam, eye); gl.uniform2fv(entProg.u.uFog, fog); gl.uniform3fv(entProg.u.uFogCol, fogCol);
  gl.uniform1i(entProg.u.uTex, 0); gl.uniform2f(entProg.u.uUvOff, 0, 0); gl.uniform4f(entProg.u.uTint, 0, 0, 0, 0);
  gl.uniform1f(entProg.u.uAlpha, 1);
}
function drawEnt(mesh, vp, model, bright) {
  gl.uniformMatrix4fv(entProg.u.uMvp, false, M4.mul(vp, model));
  gl.uniformMatrix4fv(entProg.u.uModel, false, model);
  gl.uniform1f(entProg.u.uBright, bright);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
  gl.vertexAttribPointer(entProg.a.aPos, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(entProg.a.aUv, 2, gl.FLOAT, false, 24, 12);
  gl.vertexAttribPointer(entProg.a.aShade, 1, gl.FLOAT, false, 24, 20);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
}
function attribs(prog, on) {
  for (const k in prog.a) on ? gl.enableVertexAttribArray(prog.a[k]) : gl.disableVertexAttribArray(prog.a[k]);
}
function drawFlat(mesh, mvp, off, color, mode = gl.TRIANGLES, ps = 1, fade = [1e4, 2e4], cam = [0, 0, 0]) {
  gl.uniformMatrix4fv(flatProg.u.uMvp, false, mvp);
  gl.uniform3fv(flatProg.u.uOff, off); gl.uniform4fv(flatProg.u.uColor, color);
  gl.uniform1f(flatProg.u.uPs, ps); gl.uniform2fv(flatProg.u.uFade, fade); gl.uniform3fv(flatProg.u.uCam, cam);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
  gl.vertexAttribPointer(flatProg.a.aPos, 3, gl.FLOAT, false, 0, 0);
  gl.drawArrays(mode, 0, mesh.n);
}

// ---------------- the frame ----------------
const partBuf = new FBuf(4096);
function renderFrame(R) {
  const { eye, yaw, pitch, fov, sky, underwater, gamma } = R;
  gl.viewport(0, 0, canvas.width, canvas.height);
  const fogCol = underwater ? [0.08, 0.2, 0.5].map(v => v * (0.3 + 0.7 * sky.sun)) : sky.fog;
  const fog = underwater ? [0, 12] : [R.viewDist * 0.55, R.viewDist];
  gl.clearColor(fogCol[0], fogCol[1], fogCol[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex);

  const aspect = canvas.width / canvas.height;
  const proj = M4.persp(fov * Math.PI / 180, aspect, 0.05, 400);
  const view = M4.view(yaw, pitch, eye);
  const vp = M4.mul(proj, view);

  // ---- sky
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(flatProg.p); attribs(flatProg, true);
  if (!underwater) {
    const skyMvp = M4.chain(proj, M4.view(yaw, pitch, [0, 0, 0]), M4.rotZ(sky.angle));
    const night = 1 - sky.day;
    if (night > 0.02) drawFlat(MESH.stars, skyMvp, [0, 0, 0], [1, 1, 1, night * 0.9], gl.POINTS, Math.max(1.5, R.dpr * 1.6));
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawFlat(MESH.sunGlow, skyMvp, [0, 0, 0], [1, 0.8, 0.4, 0.12]);
    drawFlat(MESH.sun, skyMvp, [0, 0, 0], [1, 0.97, 0.8, 1]);
    drawFlat(MESH.moon, skyMvp, [0, 0, 0], [0.85, 0.88, 1, 0.9]);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  attribs(flatProg, false);
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.CULL_FACE);

  // ---- world, opaque
  const bp = blockProg;
  gl.useProgram(bp.p); attribs(bp, true);
  gl.uniformMatrix4fv(bp.u.uMvp, false, vp);
  gl.uniform3fv(bp.u.uCam, eye); gl.uniform2fv(bp.u.uFog, fog); gl.uniform3fv(bp.u.uFogCol, fogCol);
  gl.uniform1f(bp.u.uSun, sky.sun); gl.uniform1f(bp.u.uGamma, gamma); gl.uniform1f(bp.u.uAlpha, 1);
  gl.uniform1i(bp.u.uTex, 0);
  const planes = frustumPlanes(vp);
  const visible = chunks.filter(c => {
    const x0 = c.cx * CS, z0 = c.cz * CS;
    const dx = Math.max(x0 - eye[0], 0, eye[0] - x0 - CS), dz = Math.max(z0 - eye[2], 0, eye[2] - z0 - CS);
    if (Math.hypot(dx, dz) > fog[1] + 4) return false;
    return boxInFrustum(planes, x0, 0, z0, x0 + CS, WY, z0 + CS);
  });
  const drawChunk = (buf, n) => {
    if (!n) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(bp.a.aPos, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(bp.a.aUv, 2, gl.FLOAT, false, 32, 12);
    gl.vertexAttribPointer(bp.a.aL, 3, gl.FLOAT, false, 32, 20);
    gl.drawArrays(gl.TRIANGLES, 0, n);
  };
  for (const c of visible) drawChunk(c.op, c.opN);
  attribs(bp, false);

  // ---- entities: mobs and dropped items
  useEnt(vp, fog, fogCol, eye); attribs(entProg, true);
  gl.enable(gl.CULL_FACE);
  for (const m of R.mobs) {
    const model = MODELS[m.type];
    const base = M4.chain(M4.trans(m.x, m.y, m.z), M4.rotY(m.yaw), M4.rotZ(m.deathT ? Math.min(1, m.deathT * 3) * Math.PI / 2 : 0));
    const red = m.hurtT > 0 || m.deathT;
    const tint = red ? 0.45 : m.burning ? 0.18 + 0.1 * Math.sin(m.walk * 3 + m.burnT * 20) : 0;
    gl.uniform4f(entProg.u.uTint, 1, red ? 0.1 : 0.45, 0.05, tint);
    const swing = Math.sin(m.walk) * 0.7 * Math.min(1, m.speedAnim * 2);
    for (const part of model) {
      let rot = 0;
      if (part.anim === 'legA') rot = swing; else if (part.anim === 'legB') rot = -swing;
      else if (part.anim === 'armA') rot = Math.PI / 2 + swing * 0.2 + (m.attackT > 0 ? -0.6 * m.attackT : 0);
      else if (part.anim === 'armB') rot = Math.PI / 2 - swing * 0.2 + (m.attackT > 0 ? -0.6 * m.attackT : 0);
      else if (part.anim === 'head') rot = m.headPitch || 0;
      const mm = M4.chain(base, M4.trans(part.pivot[0], part.pivot[1], part.pivot[2]), M4.rotX(rot));
      drawEnt(part.mesh, vp, mm, m.bright);
    }
  }
  gl.uniform4f(entProg.u.uTint, 0, 0, 0, 0);
  for (const d of R.drops) {
    const im = itemMesh(d.id), bob = Math.sin(d.age * 2.5) * 0.08 + 0.18;
    let model;
    if (im.cube) model = M4.chain(M4.trans(d.x, d.y + bob, d.z), M4.rotY(d.age * 1.6), M4.scale(0.26));
    else model = M4.chain(M4.trans(d.x, d.y + bob + 0.05, d.z), M4.rotY(d.age * 1.6), M4.scale(0.4));
    if (!im.cube) gl.disable(gl.CULL_FACE);
    drawEnt(im.mesh, vp, model, d.bright);
    if (!im.cube) gl.enable(gl.CULL_FACE);
  }

  // ---- block cracks while mining
  if (R.target && R.crack >= 0) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -2);
    const t = T.crack + R.crack;
    gl.uniform2f(entProg.u.uUvOff, (t % ATLAS_COLS) / ATLAS_COLS, (t >> 4) / ATLAS_ROWS);
    drawEnt(MESH.unitCube, vp, M4.trans(R.target.x, R.target.y, R.target.z), 1);
    gl.uniform2f(entProg.u.uUvOff, 0, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.disable(gl.BLEND);
  }

  // ---- particles (camera-facing quads)
  if (R.particles.length) {
    const r0 = [view[0], view[4], view[8]], r1 = [view[1], view[5], view[9]];
    partBuf.n = 0; partBuf.reserve(R.particles.length * 36);
    const a = partBuf.a;
    for (const p of R.particles) {
      const s = p.size, u0 = p.u, v0 = p.v, du = p.du, dv = p.dv;
      const cs = [[-1, -1, u0, v0 + dv], [1, -1, u0 + du, v0 + dv], [1, 1, u0 + du, v0], [-1, 1, u0, v0]];
      for (const k of ORDER_A) {
        const c = cs[k], n = partBuf.n;
        a[n] = p.x + (r0[0] * c[0] + r1[0] * c[1]) * s; a[n + 1] = p.y + (r0[1] * c[0] + r1[1] * c[1]) * s; a[n + 2] = p.z + (r0[2] * c[0] + r1[2] * c[1]) * s;
        a[n + 3] = c[2]; a[n + 4] = c[3]; a[n + 5] = p.bright;
        partBuf.n += 6;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, MESH.particles.buf);
    gl.bufferData(gl.ARRAY_BUFFER, partBuf.view(), gl.DYNAMIC_DRAW);
    MESH.particles.n = partBuf.n / 6;
    gl.disable(gl.CULL_FACE);
    drawEnt(MESH.particles, vp, M4.ident(), 1);
  }
  attribs(entProg, false);

  // ---- selection outline
  gl.useProgram(flatProg.p); attribs(flatProg, true);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  if (R.target) drawFlat(MESH.lines, vp, [R.target.x, R.target.y, R.target.z], [0.04, 0.04, 0.04, 0.7], gl.LINES);
  attribs(flatProg, false);

  // ---- water (translucent)
  gl.useProgram(bp.p); attribs(bp, true);
  gl.depthMask(false); gl.disable(gl.CULL_FACE);
  gl.uniform1f(bp.u.uAlpha, 0.74);
  for (const c of visible) drawChunk(c.wa, c.waN);
  attribs(bp, false);

  // ---- clouds
  if (!underwater) {
    gl.useProgram(flatProg.p); attribs(flatProg, true);
    const drift = (R.cloudDrift % 512 + 512) % 512;
    const b = 0.35 + 0.65 * sky.day, cc = [b * 1.0, b * 1.0, b * 1.02, 0.78];
    for (const ox of [drift - 688, drift - 176]) drawFlat(MESH.clouds, vp, [ox, 84, 0], cc, gl.TRIANGLES, 1, [140, 230], eye);
    attribs(flatProg, false);
  }
  gl.depthMask(true); gl.disable(gl.BLEND);

  // ---- first-person hand
  if (R.hand) {
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const hp = M4.persp(70 * Math.PI / 180, aspect, 0.01, 10);
    useEnt(hp, [1e3, 2e3], fogCol, [0, 0, 0]); attribs(entProg, true);
    gl.enable(gl.CULL_FACE);
    const h = R.hand, sw = h.swing, sp = Math.sin(sw * Math.PI), sq = Math.sin(Math.sqrt(sw) * Math.PI);
    const bx = Math.sin(h.bob) * 0.03, by = -Math.abs(Math.cos(h.bob)) * 0.03;
    let model;
    if (h.id && itemMesh(h.id).cube) {
      model = M4.chain(M4.trans(0.62 - sq * 0.25 + bx, -0.55 + by + sq * 0.12 - h.lower, -0.95 - sp * 0.2),
        M4.rotY(0.75 - sq * 0.3), M4.rotX(-sp * 0.9), M4.scale(0.42), M4.trans(0, 0, 0));
    } else if (h.id) {
      model = M4.chain(M4.trans(0.62 - sq * 0.3 + bx, -0.42 + by + sq * 0.1 - h.lower, -0.9 - sp * 0.15),
        M4.rotY(-1.1), M4.rotZ(0.35 - sp * 0.3), M4.rotX(-sp * 0.8), M4.scale(0.72));
      gl.disable(gl.CULL_FACE);
    } else {
      model = M4.chain(M4.trans(0.58 - sq * 0.25 + bx, -0.52 + by + sq * 0.15 - h.lower, -0.72 - sp * 0.2),
        M4.rotY(0.18 - sq * 0.25), M4.rotX(0.35 - sp * 0.9));
    }
    drawEnt(h.id ? itemMesh(h.id).mesh : MESH.arm, hp, model, h.bright);
    attribs(entProg, false);
  }
}
