/**
 * Tribute audio — CC0 / original beds (never Kevin MacLeod, never ESO OST).
 * Short looping playlists with a soft crossfade so one cue never nags.
 *
 * tavern: harbor inn + harp + hearth
 * fight:  Breton feast + market road
 * boss:   market then feast
 * danger: night harbor pad + inn
 */

const V = '40';
const BED = (file) => `assets/audio/${file}?v=${V}`;

const PLAYLISTS = {
  tavern: [BED('tot-bed-harbor.mp3'), BED('tot-bed-harp.mp3'), BED('tot-bed-hearth.mp3')],
  fight: [BED('tot-bed-feast.mp3'), BED('tot-bed-market.mp3')],
  boss: [BED('tot-bed-market.mp3'), BED('tot-bed-feast.mp3')],
  danger: [BED('tot-bed-night.mp3'), BED('tot-bed-harbor.mp3')],
};

const TARGET_VOL = 0.32;
const FADE_MS = 2400;
const NEXT_LEAD = 2.7;

let ctx = null;
let master = null;
let sfxGain = null;
let players = [];
let active = 0;
let playing = false;
let musicOn = false;
let sfxStyle = 'table';
let sfxOn = true;
let cueName = 'tavern';
let trackIndex = 0;
let fadeRaf = 0;
let armTimer = 0;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.28;
  sfxGain.connect(master);
  return ctx;
}

function makePlayer() {
  const el = new Audio();
  el.preload = 'auto';
  el.loop = false;
  el.volume = 0;
  el.addEventListener('ended', () => {
    if (!musicOn || !playing) return;
    advanceTrack(true);
  });
  el.addEventListener('timeupdate', onTimeUpdate);
  return el;
}

function ensurePlayers() {
  if (players.length === 2) return players;
  players = [makePlayer(), makePlayer()];
  return players;
}

function listFor(cue) {
  return PLAYLISTS[cue] || PLAYLISTS.tavern;
}

function clearFade() {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  fadeRaf = 0;
}

function fadeVolumes(fromEl, toEl, ms = FADE_MS) {
  clearFade();
  const t0 = performance.now();
  const from0 = fromEl ? fromEl.volume : 0;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    if (toEl) toEl.volume = TARGET_VOL * p;
    if (fromEl) fromEl.volume = from0 * (1 - p);
    if (p < 1) fadeRaf = requestAnimationFrame(step);
    else {
      fadeRaf = 0;
      if (fromEl && fromEl !== toEl) {
        fromEl.pause();
        fromEl.volume = 0;
      }
    }
  };
  fadeRaf = requestAnimationFrame(step);
}

function srcAt(i) {
  const list = listFor(cueName);
  return list[((i % list.length) + list.length) % list.length];
}

function onTimeUpdate(e) {
  if (!musicOn || !playing) return;
  const el = e.target;
  if (el !== players[active]) return;
  if (!el.duration || !Number.isFinite(el.duration)) return;
  if (el.duration - el.currentTime > NEXT_LEAD) return;
  if (armTimer) return;
  armTimer = 1;
  advanceTrack(false);
}

function advanceTrack(immediate) {
  const list = listFor(cueName);
  if (!list.length) return;
  trackIndex = (trackIndex + 1) % list.length;
  startTrack(srcAt(trackIndex), { fade: !immediate });
}

function startTrack(src, { fade = true } = {}) {
  ensurePlayers();
  const from = players[active];
  const to = players[1 - active];
  if (to.src && to.src.includes(src.replace(/^\.\//, '')) && !to.paused && fade) {
    armTimer = 0;
    return;
  }
  to.src = src;
  to.volume = fade ? 0 : TARGET_VOL;
  const go = () => {
    to.play().catch(() => {});
    if (fade && from && from !== to && !from.paused) fadeVolumes(from, to, FADE_MS);
    else {
      to.volume = TARGET_VOL;
      if (from && from !== to) { from.pause(); from.volume = 0; }
    }
    active = 1 - active;
    armTimer = 0;
  };
  if (to.readyState >= 2) go();
  else to.addEventListener('canplay', go, { once: true });
}

export function isMusicOn() { return musicOn && playing; }

export async function setMusicEnabled(on) {
  ensureCtx();
  ensurePlayers();
  musicOn = !!on;
  try { localStorage.setItem('tot_music', on ? '1' : '0'); } catch {}
  if (on) {
    if (ctx?.state === 'suspended') await ctx.resume();
    playing = true;
    startTrack(srcAt(trackIndex), { fade: false });
    players[active].volume = TARGET_VOL;
    try { await players[active].play(); } catch {}
  } else {
    clearFade();
    players.forEach((p) => { p.pause(); p.volume = 0; });
    playing = false;
  }
  return on;
}

export function preferMusicFromStorage() {
  try {
    const v = localStorage.getItem('tot_music');
    if (v === null) return true;
    return v === '1';
  } catch { return true; }
}

export function setSfxStyle(style) {
  sfxStyle = style === 'dramatic' ? 'dramatic' : 'table';
  try { localStorage.setItem('tot_sfx', sfxStyle); } catch {}
}
export function getSfxStyle() {
  try { return localStorage.getItem('tot_sfx') === 'dramatic' ? 'dramatic' : 'table'; } catch { return 'table'; }
}

export function setSfxEnabled(on) {
  sfxOn = !!on;
  try { localStorage.setItem('tot_sfx_on', sfxOn ? '1' : '0'); } catch {}
  if (sfxGain) sfxGain.gain.value = sfxOn ? 0.28 : 0;
  return sfxOn;
}

export function isSfxOn() { return sfxOn; }

export function preferSfxFromStorage() {
  try {
    const v = localStorage.getItem('tot_sfx_on');
    if (v === null) return true;
    return v === '1';
  } catch { return true; }
}

export function setMusicCue(cue) {
  const next = PLAYLISTS[cue] ? cue : 'tavern';
  ensurePlayers();
  if (cueName === next && players[active]?.src) return;
  cueName = next;
  trackIndex = 0;
  if (musicOn && playing) startTrack(srcAt(0), { fade: true });
  else {
    players[active].src = srcAt(0);
    players[active].volume = 0;
  }
}

export function warmMuted() {
  ensureCtx();
  ensurePlayers();
  sfxStyle = getSfxStyle();
  sfxOn = preferSfxFromStorage();
  if (sfxGain) sfxGain.gain.value = sfxOn ? 0.28 : 0;
  players.forEach((p) => { p.volume = 0; });
}

function beep({ freq = 440, dur = 0.08, type = 'triangle', vol = 0.35, slide = 0, filterFreq = 0, filterQ = 1 }) {
  if (!ensureCtx() || !sfxGain) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  f.type = filterFreq ? 'bandpass' : 'lowpass';
  f.frequency.value = filterFreq || 2400;
  f.Q.value = filterQ;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f); f.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noiseBurst({ dur = 0.06, vol = 0.2, freq = 1200, Q = 0.7 }) {
  if (!ensureCtx() || !sfxGain) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = Q;
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start();
}

/** Original one-shots (CC0). Synth below is the fallback if playback is blocked. */
const SFX_FILE = {
  play: 'sfx-play.wav',
  buy: 'sfx-buy.wav',
  shuffle: 'sfx-shuffle.wav',
  patron: 'sfx-patron.wav',
  deal: 'sfx-deal.wav',
  receive: 'sfx-receive.wav',
  agent: 'sfx-agent.wav',
  knockout: 'sfx-knock.wav',
  trap: 'sfx-knock.wav',
  combo: 'sfx-combo.wav',
  end: 'sfx-end.wav',
  coin: 'sfx-coin.wav',
  coinA: 'sfx-coin.wav',
  coinB: 'sfx-coin.wav',
};

function playSfxFile(kind) {
  const file = SFX_FILE[kind];
  if (!file) return false;
  try {
    const a = new Audio(`assets/audio/${file}?v=58`);
    a.volume = 0.78;
    const pending = a.play();
    if (pending && typeof pending.catch === 'function') {
      pending.catch(() => { synthSfx(kind); });
    }
    return true;
  } catch {
    return false;
  }
}

function synthSfx(kind) {
  ensureCtx();
  sfxStyle = getSfxStyle();
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  const table = sfxStyle === 'table';
  switch (kind) {
    case 'play':
      if (table) { noiseBurst({ dur: 0.08, vol: 0.26, freq: 720, Q: 0.55 }); beep({ freq: 140, dur: 0.07, type: 'triangle', vol: 0.16, slide: -40 }); }
      else beep({ freq: 320, dur: 0.09, type: 'triangle', vol: 0.28, slide: 80 });
      break;
    case 'buy':
      noiseBurst({ dur: 0.1, vol: 0.2, freq: 1100, Q: 0.45 });
      beep({ freq: 980, dur: 0.05, type: 'sine', vol: 0.2 });
      beep({ freq: 1310, dur: 0.07, type: 'sine', vol: 0.14 });
      beep({ freq: 660, dur: 0.1, type: 'triangle', vol: 0.1, slide: 80 });
      break;
    case 'coinA':
    case 'coin':
      beep({ freq: 1040, dur: 0.05, type: 'sine', vol: 0.2 });
      beep({ freq: 1560, dur: 0.07, type: 'triangle', vol: 0.12 });
      break;
    case 'coinB':
      beep({ freq: 660, dur: 0.06, type: 'square', vol: 0.1 });
      beep({ freq: 880, dur: 0.08, type: 'triangle', vol: 0.16 });
      beep({ freq: 1320, dur: 0.1, type: 'sine', vol: 0.12 });
      break;
    case 'shuffle':
      noiseBurst({ dur: 0.16, vol: 0.22, freq: 1600, Q: 0.7 });
      noiseBurst({ dur: 0.12, vol: 0.16, freq: 900, Q: 0.8 });
      beep({ freq: 220, dur: 0.08, type: 'triangle', vol: 0.08, slide: 40 });
      break;
    case 'deal':
      noiseBurst({ dur: 0.09, vol: 0.2, freq: 1400, Q: 0.6 });
      noiseBurst({ dur: 0.07, vol: 0.14, freq: 800, Q: 0.7 });
      beep({ freq: 180, dur: 0.06, type: 'triangle', vol: 0.1, slide: -30 });
      break;
    case 'receive':
      noiseBurst({ dur: 0.06, vol: 0.16, freq: 1100, Q: 0.65 });
      beep({ freq: 240, dur: 0.05, type: 'triangle', vol: 0.1, slide: 20 });
      break;
    case 'knockout':
    case 'trap':
      noiseBurst({ dur: 0.1, vol: 0.28, freq: 140, Q: 0.45 });
      beep({ freq: 70, dur: 0.18, type: 'square', vol: 0.2, slide: -25 });
      break;
    case 'swipe':
      noiseBurst({ dur: 0.05, vol: 0.16, freq: 1400, Q: 0.8 });
      break;
    case 'contract':
      beep({ freq: 220, dur: 0.14, type: 'sawtooth', vol: 0.16, filterFreq: 900, filterQ: 4 });
      noiseBurst({ dur: 0.08, vol: 0.12, freq: 1400, Q: 2 });
      break;
    case 'agent':
      noiseBurst({ dur: 0.05, vol: 0.22, freq: 180, Q: 0.5 });
      beep({ freq: 90, dur: 0.16, type: 'sine', vol: 0.28, slide: -30 });
      break;
    case 'patron':
      beep({ freq: 740, dur: 0.08, type: 'triangle', vol: 0.2 });
      beep({ freq: 880, dur: 0.12, type: 'triangle', vol: 0.16 });
      beep({ freq: 1110, dur: 0.16, type: 'sine', vol: 0.12 });
      break;
    case 'combo':
      beep({ freq: 520, dur: 0.07, type: 'sine', vol: 0.16 });
      beep({ freq: 660, dur: 0.08, type: 'sine', vol: 0.16 });
      beep({ freq: 880, dur: 0.1, type: 'triangle', vol: 0.15 });
      beep({ freq: 1100, dur: 0.14, type: 'triangle', vol: 0.14 });
      break;
    case 'end':
      beep({ freq: 220, dur: 0.1, type: 'triangle', vol: 0.16 });
      beep({ freq: 330, dur: 0.16, type: 'sine', vol: 0.14, slide: 40 });
      noiseBurst({ dur: 0.08, vol: 0.1, freq: 700, Q: 1.2 });
      break;
    case 'win':
      beep({ freq: 523, dur: 0.1, type: 'triangle', vol: 0.2 });
      beep({ freq: 659, dur: 0.12, type: 'triangle', vol: 0.18 });
      beep({ freq: 784, dur: 0.16, type: 'sine', vol: 0.16 });
      beep({ freq: 1046, dur: 0.28, type: 'sine', vol: 0.14 });
      break;
    case 'celebrate':
      beep({ freq: 392, dur: 0.1, type: 'triangle', vol: 0.18 });
      beep({ freq: 523, dur: 0.12, type: 'triangle', vol: 0.2 });
      beep({ freq: 659, dur: 0.14, type: 'sine', vol: 0.18 });
      beep({ freq: 784, dur: 0.16, type: 'sine', vol: 0.16 });
      beep({ freq: 1046, dur: 0.22, type: 'triangle', vol: 0.16 });
      beep({ freq: 1318, dur: 0.32, type: 'sine', vol: 0.12 });
      noiseBurst({ dur: 0.14, vol: 0.12, freq: 1800, Q: 0.6 });
      break;
    case 'purse':
      beep({ freq: 880, dur: 0.06, type: 'sine', vol: 0.18 });
      beep({ freq: 1180, dur: 0.08, type: 'triangle', vol: 0.14 });
      beep({ freq: 1560, dur: 0.1, type: 'sine', vol: 0.12 });
      noiseBurst({ dur: 0.08, vol: 0.14, freq: 900, Q: 0.7 });
      break;
    case 'crate':
      noiseBurst({ dur: 0.16, vol: 0.18, freq: 420, Q: 0.5 });
      beep({ freq: 330, dur: 0.12, type: 'triangle', vol: 0.16, slide: 80 });
      beep({ freq: 660, dur: 0.14, type: 'sine', vol: 0.14 });
      beep({ freq: 990, dur: 0.2, type: 'triangle', vol: 0.12 });
      break;
    case 'tap':
      if (table) noiseBurst({ dur: 0.03, vol: 0.1, freq: 1600, Q: 1 });
      else beep({ freq: 600, dur: 0.04, type: 'sine', vol: 0.1 });
      break;
    default:
      break;
  }
}

export function playSfx(kind) {
  if (!sfxOn) return;
  if (playSfxFile(kind)) return;
  synthSfx(kind);
}
