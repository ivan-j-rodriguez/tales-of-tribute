/**
 * Tales of Tribute audio — real renaissance loop + quiet synthesized SFX.
 * Default loop: Dowland CC0 (OpenGameArt / Of Far Different Nature).
 * Alt: Tourdion (Wikimedia Commons PD).
 * Never falls back to oscillator bed as the music default.
 */

const LOOP_SRC = 'assets/audio/dowland-complaints.mp3';
const ALT_SRC = 'assets/audio/tourdion.mp3';

let ctx = null;
let master = null;
let sfxGain = null;
let musicEl = null;
let playing = false;
let musicOn = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.22;
  sfxGain.connect(master);
  return ctx;
}

function ensureMusicEl() {
  if (musicEl) return musicEl;
  musicEl = new Audio(LOOP_SRC);
  musicEl.loop = true;
  musicEl.preload = 'auto';
  musicEl.volume = 0.28;
  musicEl.addEventListener('error', () => {
    // Prefer Tourdion if Dowland fails to decode/load
    if (musicEl.src && !musicEl.src.includes('tourdion')) {
      musicEl.src = ALT_SRC;
      musicEl.load();
      if (musicOn) musicEl.play().catch(() => {});
    }
  });
  return musicEl;
}

export function isMusicOn() {
  return musicOn && playing;
}

export async function setMusicEnabled(on) {
  ensureCtx();
  ensureMusicEl();
  musicOn = !!on;
  try { localStorage.setItem('tot_music', on ? '1' : '0'); } catch {}
  if (on) {
    if (ctx?.state === 'suspended') await ctx.resume();
    playing = true;
    try {
      await musicEl.play();
    } catch {
      // autoplay blocked until gesture — keep flag for next toggle
    }
  } else if (musicEl) {
    musicEl.pause();
    playing = false;
  }
  return on;
}

export function preferMusicFromStorage() {
  try { return localStorage.getItem('tot_music') === '1'; } catch { return false; }
}

/** Warm decode path; stay silent until unmute. */
export function warmMuted() {
  ensureCtx();
  ensureMusicEl();
  musicEl.volume = 0.28;
  // do not auto-play
}

function beep({ freq = 440, dur = 0.08, type = 'triangle', vol = 0.35, slide = 0, noiseFreq = 0, noiseQ = 1 }) {
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

/** Quiet distinct SFX for engine/UI events. */
export function playSfx(kind) {
  ensureCtx();
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  switch (kind) {
    case 'play':
      beep({ freq: 320, dur: 0.09, type: 'triangle', vol: 0.28, slide: 80 });
      break;
    case 'buy':
      beep({ freq: 520, dur: 0.07, type: 'sine', vol: 0.25 });
      beep({ freq: 780, dur: 0.1, type: 'sine', vol: 0.18, slide: 40 });
      break;
    case 'contract':
      beep({ freq: 220, dur: 0.14, type: 'sawtooth', vol: 0.16, filterFreq: 900, filterQ: 4 });
      noiseBurst({ dur: 0.08, vol: 0.12, freq: 1400, Q: 2 });
      beep({ freq: 660, dur: 0.18, type: 'triangle', vol: 0.14, slide: 220 });
      break;
    case 'agent':
      noiseBurst({ dur: 0.05, vol: 0.22, freq: 180, Q: 0.5 });
      beep({ freq: 90, dur: 0.16, type: 'sine', vol: 0.32, slide: -30 });
      beep({ freq: 880, dur: 0.12, type: 'sine', vol: 0.12, slide: 120 });
      break;
    case 'patron':
      beep({ freq: 392, dur: 0.12, type: 'triangle', vol: 0.22 });
      beep({ freq: 523, dur: 0.16, type: 'triangle', vol: 0.18, slide: 60 });
      break;
    case 'coin':
      beep({ freq: 980, dur: 0.05, type: 'sine', vol: 0.18 });
      beep({ freq: 1310, dur: 0.07, type: 'sine', vol: 0.12 });
      break;
    case 'combo':
      beep({ freq: 440, dur: 0.08, type: 'triangle', vol: 0.2 });
      beep({ freq: 554, dur: 0.1, type: 'triangle', vol: 0.18 });
      beep({ freq: 659, dur: 0.14, type: 'triangle', vol: 0.16 });
      break;
    case 'win':
      beep({ freq: 392, dur: 0.12, type: 'triangle', vol: 0.22 });
      beep({ freq: 523, dur: 0.14, type: 'triangle', vol: 0.2 });
      beep({ freq: 659, dur: 0.18, type: 'triangle', vol: 0.18 });
      beep({ freq: 784, dur: 0.28, type: 'sine', vol: 0.16 });
      break;
    case 'tap':
      beep({ freq: 600, dur: 0.04, type: 'sine', vol: 0.1 });
      break;
    default:
      break;
  }
}
