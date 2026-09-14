/**
 * Optional 1:1 voice for Friend / Ranked remote matches.
 * Uses PeerJS media calls (WebRTC) on the same room already used for table sync.
 * Off by default. Mic permission is requested only when the player turns voice on.
 */
import { loadPeerJS } from './netplay.js';

const PREF_KEY = 'tot_voice_pref_v1';

export function voicePref() {
  try { return localStorage.getItem(PREF_KEY) === '1'; } catch { return false; }
}
export function setVoicePref(on) {
  try { localStorage.setItem(PREF_KEY, on ? '1' : '0'); } catch {}
}

export function createVoice() {
  return {
    wanted: false,
    live: false,
    muted: false,
    pending: false,
    waitingPeer: false,
    error: null,
    localStream: null,
    remoteStream: null,
    call: null,
    audioEl: null,
  };
}

function ensureAudioEl(state) {
  if (typeof document === 'undefined') return null;
  let el = state.audioEl || document.getElementById('voice-remote');
  if (!el) {
    el = document.createElement('audio');
    el.id = 'voice-remote';
    el.autoplay = true;
    el.playsInline = true;
    el.hidden = true;
    document.body.appendChild(el);
  }
  state.audioEl = el;
  return el;
}

function attachRemote(state, stream) {
  state.remoteStream = stream;
  state.live = true;
  state.waitingPeer = false;
  const el = ensureAudioEl(state);
  if (el) {
    el.srcObject = stream;
    el.muted = false;
    el.play?.().catch(() => {});
  }
}

function setLocalMute(state, muted) {
  state.muted = !!muted;
  const tracks = state.localStream?.getAudioTracks?.() || [];
  for (const t of tracks) t.enabled = !state.muted;
}

export function voiceStatusLine(state) {
  if (state.error) return state.error;
  if (!state.wanted) return 'Voice off.';
  if (state.pending) return 'Asking for the microphone…';
  if (state.waitingPeer) return 'Mic on. Waiting for the other player to enable voice.';
  if (state.live) return state.muted ? 'Voice live — you are muted.' : 'Voice live.';
  return 'Voice ready.';
}

export async function enableVoice(state, net, { onChange } = {}) {
  const notify = () => { try { onChange?.(state); } catch {} };
  if (state.localStream && state.wanted) {
    wirePeer(state, net, notify);
    net.send?.({ type: 'voice-ready', peerId: net.peer?.id || '' });
    maybeCall(state, net);
    notify();
    return { ok: true };
  }
  if (!net?.ok || !net.peer) {
    state.error = 'Voice needs a remote Friend or Ranked room.';
    state.wanted = false;
    notify();
    return { error: state.error };
  }
  const ok = await loadPeerJS();
  if (!ok) {
    state.error = 'PeerJS failed to load — voice cannot start.';
    state.wanted = false;
    notify();
    return { error: state.error };
  }
  if (!navigator?.mediaDevices?.getUserMedia) {
    state.error = 'This browser cannot open a microphone.';
    state.wanted = false;
    notify();
    return { error: state.error };
  }
  state.wanted = true;
  state.pending = true;
  state.error = null;
  notify();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    state.localStream = stream;
    state.pending = false;
    setLocalMute(state, state.muted);
    wirePeer(state, net, notify);
    net.send?.({ type: 'voice-ready', peerId: net.peer?.id || '' });
    maybeCall(state, net);
    if (!state.live) state.waitingPeer = true;
    notify();
    return { ok: true };
  } catch (err) {
    state.pending = false;
    state.wanted = false;
    state.error = permissionError(err);
    notify();
    return { error: state.error };
  }
}

export function disableVoice(state, net) {
  state.wanted = false;
  state.live = false;
  state.pending = false;
  state.waitingPeer = false;
  state.error = null;
  try { state.call?.close?.(); } catch {}
  state.call = null;
  const tracks = state.localStream?.getAudioTracks?.() || [];
  for (const t of tracks) {
    try { t.stop(); } catch {}
  }
  state.localStream = null;
  state.remoteStream = null;
  if (state.audioEl) state.audioEl.srcObject = null;
  try { net?.send?.({ type: 'voice-off' }); } catch {}
}

export function setMuted(state, muted) {
  setLocalMute(state, muted);
}

export function handleVoiceMessage(state, net, msg, { onChange } = {}) {
  if (!msg || !state.wanted) {
    if (msg?.type === 'voice-off' && state.live) {
      state.live = false;
      state.waitingPeer = !!state.wanted;
      state.remoteStream = null;
      if (state.audioEl) state.audioEl.srcObject = null;
      try { onChange?.(state); } catch {}
    }
    return;
  }
  if (msg.type === 'voice-ready') {
    if (msg.peerId) net.remotePeerId = msg.peerId;
    maybeCall(state, net);
    try { onChange?.(state); } catch {}
  }
}

function wirePeer(state, net, notify) {
  const peer = net.peer;
  if (!peer || peer._totVoiceWired) return;
  peer._totVoiceWired = true;
  peer.on('call', (call) => {
    if (!state.wanted || !state.localStream) {
      try { call.close(); } catch {}
      return;
    }
    state.call = call;
    call.answer(state.localStream);
    call.on('stream', (remote) => {
      attachRemote(state, remote);
      notify();
    });
    call.on('close', () => {
      state.live = false;
      state.waitingPeer = !!state.wanted;
      notify();
    });
  });
}

function maybeCall(state, net) {
  if (!state.wanted || !state.localStream || state.call) return;
  const remoteId = net.remotePeerId || net.conn?.peer;
  if (!remoteId) return;
  // Host places the call to avoid glare; guest waits to answer.
  const iAmHost = net.role === 'host' || (!!net.code && net.peer?.id === `tot-room-${net.code}`);
  if (!iAmHost && net.role !== 'guest') {
    // If role unknown, the peer with the room-prefixed id calls.
    if (!String(net.peer?.id || '').startsWith('tot-room-')) return;
  }
  if (net.role === 'guest') return;
  try {
    const call = net.peer.call(remoteId, state.localStream);
    state.call = call;
    call.on('stream', (remote) => {
      attachRemote(state, remote);
    });
  } catch {}
}

function permissionError(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Microphone permission denied. Enable it in the browser, then try again.';
  }
  if (name === 'NotFoundError') return 'No microphone found.';
  return String(err?.message || err || 'Could not open the microphone.');
}

export function canUseVoice(matchMode) {
  return matchMode === 'remote-host' || matchMode === 'remote-guest';
}
