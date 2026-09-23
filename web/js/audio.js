'use strict';
// ============================================================
//  Sound: synthesized effects and a generative piano soundtrack
// ============================================================

const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, musicDry, reverb, noiseBuf;
  const vol = { music: 0.6, sfx: 0.8 };
  let mood = 'menu';

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.connect(comp);
    musicDry = ctx.createGain(); musicDry.gain.value = 0.8; musicDry.connect(musicBus);
    reverb = ctx.createConvolver(); reverb.buffer = impulse(3.5, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.55; reverb.connect(wet); wet.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
    setInterval(musicTick, 120);
  }
  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  function applyVolume() {
    if (!ctx) return;
    sfxBus.gain.value = vol.sfx;
    musicBus.gain.value = vol.music * 0.55;
  }
  function setVolume(kind, v) { vol[kind] = v; applyVolume(); }

  // ---------------- building blocks ----------------
  function out(pan) {
    if (!pan || !ctx.createStereoPanner) return sfxBus;
    const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(sfxBus); return p;
  }
  function noise({ t = 0, dur = 0.1, type = 'bandpass', freq = 1000, q = 1, gain = 0.4, attack = 0.003, sweep = 0, pan = 0 }) {
    const now = ctx.currentTime + t;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, now); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f); f.connect(g); g.connect(out(pan));
    src.start(now, Math.random() * 1.5); src.stop(now + dur + 0.05);
  }
  function tone({ t = 0, type = 'sine', f0 = 440, f1 = 0, dur = 0.2, gain = 0.3, attack = 0.005, pan = 0, lp = 0, vib = 0 }) {
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, now);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, now + dur);
    if (vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib; lg.gain.value = f0 * 0.04;
      l.connect(lg); lg.connect(o.frequency); l.start(now); l.stop(now + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    let node = o;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(out(pan));
    o.start(now); o.stop(now + dur + 0.05);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  // material voice: [filter type, centre freq, Q, length]
  const MAT = {
    grass: ['bandpass', 2600, 0.7, 0.14], gravel: ['bandpass', 1100, 0.9, 0.16], stone: ['bandpass', 1700, 1.6, 0.09],
    wood: ['bandpass', 650, 2.2, 0.1], sand: ['highpass', 2600, 0.6, 0.18], snow: ['bandpass', 4200, 0.5, 0.16],
    glass: ['highpass', 3500, 1, 0.12], water: ['lowpass', 1400, 0.7, 0.3],
  };
  function crunch(m, gain, n, spread, pan) {
    const [type, f, q, len] = MAT[m] || MAT.stone;
    for (let i = 0; i < n; i++) noise({ t: i * spread * rnd(0.6, 1.4), dur: len * rnd(0.7, 1.2), type, freq: f * rnd(0.8, 1.25), q, gain: gain * rnd(0.6, 1), pan });
    if (m === 'wood') tone({ type: 'triangle', f0: rnd(180, 230), f1: 120, dur: 0.09, gain: gain * 0.7, pan });
    if (m === 'stone') tone({ type: 'triangle', f0: rnd(140, 180), f1: 90, dur: 0.06, gain: gain * 0.5, pan });
  }

  const S = {
    step(m) { crunch(m, 0.16, 1, 0, 0); },
    dig(m) { crunch(m, 0.22, 2, 0.02, 0); },
    brk(m) {
      if (m === 'glass') {
        noise({ dur: 0.35, type: 'highpass', freq: 3000, gain: 0.35 });
        for (let i = 0; i < 6; i++) tone({ t: i * 0.03 + Math.random() * 0.05, f0: rnd(2200, 4800), dur: rnd(0.08, 0.2), gain: 0.07 });
        return;
      }
      crunch(m, 0.42, 4, 0.025, 0);
    },
    place(m) { crunch(m, 0.34, 2, 0.015, 0); },
    land(m) { crunch(m, 0.3, 2, 0.02, 0); },
    jump() {},
    pop() { tone({ type: 'sine', f0: rnd(560, 700), f1: rnd(1300, 1600), dur: 0.09, gain: 0.2 }); },
    click() { tone({ type: 'square', f0: 1400, dur: 0.035, gain: 0.05, lp: 3000 }); },
    craft() { tone({ type: 'triangle', f0: 660, dur: 0.18, gain: 0.16 }); tone({ t: 0.08, type: 'triangle', f0: 990, dur: 0.25, gain: 0.14 }); crunch('wood', 0.2, 2, 0.03, 0); },
    hurt() {
      tone({ type: 'sawtooth', f0: 330, f1: 150, dur: 0.18, gain: 0.25, lp: 1200 });
      noise({ dur: 0.12, freq: 800, q: 0.8, gain: 0.25 });
    },
    death() { tone({ type: 'sawtooth', f0: 300, f1: 70, dur: 0.9, gain: 0.25, lp: 900 }); },
    eat() { for (let i = 0; i < 3; i++) noise({ t: i * 0.13, dur: 0.1, freq: 1800, q: 1.2, gain: 0.25 }); },
    burp() { tone({ t: 0.45, type: 'sawtooth', f0: 110, f1: 80, dur: 0.3, gain: 0.18, lp: 500, vib: 30 }); },
    splash() { noise({ dur: 0.5, type: 'lowpass', freq: 3000, sweep: 300, gain: 0.35 }); },
    swim() { noise({ dur: 0.25, type: 'lowpass', freq: 1500, sweep: 400, gain: 0.12 }); },
    swing() { noise({ dur: 0.15, freq: 900, q: 2, sweep: 2500, gain: 0.1 }); },
    hit() { noise({ dur: 0.08, freq: 500, q: 1, gain: 0.35 }); tone({ type: 'triangle', f0: 120, f1: 60, dur: 0.1, gain: 0.3 }); },
    zombie(pan, v) { tone({ type: 'sawtooth', f0: rnd(85, 110), f1: rnd(60, 80), dur: rnd(0.8, 1.3), gain: 0.22 * v, lp: 700, vib: rnd(5, 9), attack: 0.2, pan }); },
    zombieHurt(pan, v) { tone({ type: 'sawtooth', f0: 170, f1: 90, dur: 0.3, gain: 0.25 * v, lp: 900, pan }); },
    pig(pan, v) {
      for (let i = 0; i < 2; i++) tone({ t: i * 0.16, type: 'sawtooth', f0: rnd(260, 320), f1: rnd(170, 210), dur: 0.12, gain: 0.14 * v, lp: 1400, pan });
    },
    pigHurt(pan, v) { tone({ type: 'sawtooth', f0: 520, f1: 300, dur: 0.22, gain: 0.2 * v, lp: 2000, pan }); },
    poof(pan, v) { noise({ dur: 0.35, freq: 900, q: 0.6, sweep: 300, gain: 0.2 * v, pan }); },
    fire(pan, v) { noise({ dur: 0.3, type: 'lowpass', freq: 900, gain: 0.12 * v, pan }); },
  };
  function play(name, ...args) {
    if (!ctx || !vol.sfx || ctx.state !== 'running') return;
    try { S[name](...args); } catch (e) {}
  }

  // ---------------- music ----------------
  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
  const PROGS = {
    major: [[0, 4, 5, 3], [3, 0, 4, 5], [5, 3, 0, 4], [0, 2, 3, 3], [3, 4, 2, 5], [0, 3, 5, 4]],
    minor: [[0, 5, 2, 6], [0, 3, 5, 4], [5, 6, 0, 0], [0, 6, 5, 6], [3, 0, 5, 4]],
  };
  let piece = null, gapUntil = 0;
  const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

  function piano(t, midi, v, len) {
    const f = midiHz(midi), end = t + len;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, end);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(7000, f * 6), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), end);
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.28;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g);
    g.connect(musicDry); g.connect(reverb);
    o1.start(t); o2.start(t); o1.stop(end + 0.05); o2.stop(end + 0.05);
  }
  function pad(t, midis, v, len) {
    for (const m of midis) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midiHz(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + len * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(reverb); g.connect(musicDry);
      o.start(t); o.stop(t + len + 0.05);
    }
  }
  function newPiece(start) {
    const dark = mood === 'night' || mood === 'cave';
    const scale = dark ? MINOR : MAJOR;
    const progs = PROGS[dark ? 'minor' : 'major'];
    const prog = progs[Math.floor(Math.random() * progs.length)];
    const root = 48 + [0, 2, 3, 5, 7, 8, 9][Math.floor(Math.random() * 7)] - (dark ? 3 : 0);
    const bpm = rnd(58, 76) * (mood === 'cave' ? 0.85 : 1);
    const motif = [];
    let deg = Math.floor(rnd(2, 6));
    for (let i = 0; i < 8; i++) { motif.push(Math.random() < 0.3 ? null : deg); deg = clamp(deg + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)], 0, 9); }
    piece = { scale, prog, root, beat: 60 / bpm, bar: 0, bars: 16 + 4 * Math.floor(Math.random() * 3),
      next: start, density: rnd(0.35, 0.75), barsPerChord: Math.random() < 0.5 ? 1 : 2, motif, pad: mood === 'cave' || Math.random() < 0.35 };
  }
  const note = (p, degree, octave) => {
    const d = ((degree % 7) + 7) % 7, o = Math.floor(degree / 7);
    return p.root + p.scale[d] + 12 * (o + octave);
  };
  function scheduleBar(p) {
    const t0 = p.next, b = p.beat;
    const ci = Math.floor(p.bar / p.barsPerChord) % p.prog.length, ch = p.prog[ci];
    const last = p.bar === p.bars - 1;
    const tones = [ch, ch + 2, ch + 4, ch + 6];
    // bass
    piano(t0, note(p, ch, -1), 0.3, b * 4);
    if (!last && Math.random() < 0.5) piano(t0 + b * 2, note(p, ch + 4, -1), 0.18, b * 2.5);
    if (p.pad && p.bar % p.barsPerChord === 0) pad(t0, [note(p, ch, 0), note(p, ch + 2, 0), note(p, ch + 4, 0)], 0.035, b * 4 * p.barsPerChord);
    if (last) { piano(t0, note(p, ch, 0), 0.2, b * 6); piano(t0 + 0.02, note(p, ch + 2, 0), 0.16, b * 6); piano(t0 + 0.04, note(p, ch + 4, 0), 0.14, b * 6); return; }
    // arpeggio on eighth notes
    for (let e = 0; e < 8; e++) {
      if (Math.random() > p.density) continue;
      const tn = tones[Math.floor(Math.random() * (Math.random() < 0.7 ? 3 : 4))];
      piano(t0 + e * b / 2 + rnd(0, 0.02), note(p, tn, 0), 0.12 + Math.random() * 0.06, b * 3);
    }
    // melody: the piece's motif, played in the middle section with small variations
    if (p.bar >= 4 && p.bar < p.bars - 2 && (p.bar % 4 < 2)) {
      for (let i = 0; i < 4; i++) {
        let m = p.motif[(p.bar % 2) * 4 + i];
        if (m === null || Math.random() < 0.15) continue;
        if (Math.random() < 0.2) m += Math.random() < 0.5 ? 1 : -1;
        piano(t0 + i * b + rnd(0, 0.02), note(p, m, 1), 0.16, b * 2.5);
      }
    }
  }
  function musicTick() {
    if (!ctx || ctx.state !== 'running' || vol.music <= 0) return;
    const now = ctx.currentTime;
    if (!piece) {
      if (now < gapUntil) return;
      newPiece(now + 0.2);
    }
    while (piece && piece.next < now + 1.2) {
      scheduleBar(piece);
      piece.next += piece.beat * 4; piece.bar++;
      if (piece.bar >= piece.bars) { gapUntil = piece.next + 6 + rnd(15, 40); piece = null; }
    }
  }
  function setMood(m) {
    if (m === mood) return;
    const was = mood; mood = m;
    // leaving the menu starts a fresh piece that suits the new mood
    if (was === 'menu' && ctx) { piece = null; gapUntil = ctx.currentTime + 2; }
  }
  return { init, play, setVolume, setMood, suspend() { if (ctx) ctx.suspend(); }, get running() { return !!ctx && ctx.state === 'running'; } };
})();
