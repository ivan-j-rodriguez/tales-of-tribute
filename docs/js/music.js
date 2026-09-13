/** Procedural Gonfalon-tavern bed — Web Audio, no copyrighted OST. */

let ctx = null;
let master = null;
let playing = false;
let nodes = [];
let crackleTimer = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function softOsc(type, freq, gainVal, detune = 0) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  g.gain.value = gainVal;
  o.connect(g);
  g.connect(master);
  o.start();
  nodes.push(o, g);
  return { o, g };
}

function startDrone() {
  // Low warm strings / cello-ish drone (triangle + sine)
  softOsc('sine', 55, 0.04); // A1
  softOsc('triangle', 82.41, 0.028, 3); // E2
  softOsc('sine', 110, 0.018, -4); // A2
  // Soft fifth pad
  softOsc('sine', 164.81, 0.012, 2);
}

function schedulePluck(time) {
  if (!ctx || !playing) return;
  const freqs = [220, 246.94, 293.66, 329.63, 369.99, 440]; // A minor-ish lute tones
  const f = freqs[Math.floor(Math.random() * freqs.length)];
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f2 = ctx.createBiquadFilter();
  o.type = 'triangle';
  o.frequency.value = f;
  f2.type = 'lowpass';
  f2.frequency.value = 1200;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.045, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 1.4 + Math.random());
  o.connect(f2);
  f2.connect(g);
  g.connect(master);
  o.start(time);
  o.stop(time + 2.2);
}

function pluckLoop() {
  if (!playing || !ctx) return;
  const now = ctx.currentTime;
  // Sparse lute-like plucks
  schedulePluck(now + 0.05);
  if (Math.random() < 0.55) schedulePluck(now + 0.55 + Math.random() * 0.4);
  if (Math.random() < 0.35) schedulePluck(now + 1.3 + Math.random() * 0.5);
  setTimeout(pluckLoop, 2200 + Math.random() * 1800);
}

function crackleOnce() {
  if (!playing || !ctx) return;
  const len = 0.04 + Math.random() * 0.08;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2) * 0.35;
  }
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800 + Math.random() * 2000;
  f.Q.value = 0.8;
  src.buffer = buf;
  g.gain.value = 0.08 + Math.random() * 0.06;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

function crackleLoop() {
  if (!playing) return;
  crackleOnce();
  crackleTimer = setTimeout(crackleLoop, 120 + Math.random() * 400);
}

export function isMusicOn() {
  return playing && master && master.gain.value > 0.01;
}

export async function setMusicEnabled(on) {
  ensure();
  if (!ctx) return false;
  if (on) {
    if (ctx.state === 'suspended') await ctx.resume();
    if (!playing) {
      playing = true;
      startDrone();
      pluckLoop();
      crackleLoop();
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.8);
  } else {
    if (master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    }
    // keep graph warm but silent — browsers like resume
  }
  try { localStorage.setItem('tot_music', on ? '1' : '0'); } catch {}
  return on;
}

export function preferMusicFromStorage() {
  try { return localStorage.getItem('tot_music') === '1'; } catch { return false; }
}

/** Auto-start muted (gain 0) so first unmute is instant. */
export function warmMuted() {
  ensure();
  if (!ctx || playing) return;
  playing = true;
  startDrone();
  pluckLoop();
  crackleLoop();
  master.gain.value = 0;
}
