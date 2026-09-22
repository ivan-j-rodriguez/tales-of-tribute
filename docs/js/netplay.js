/**
 * Simple PeerJS data-channel sync for remote friend matches.
 * Host creates a 4-letter room code; guest joins via the PeerJS cloud broker.
 *
 * `config` replaces PeerJS defaults, so the public PeerJS TURN relays stay
 * beside the STUN servers. Symmetric NATs can still fail without a reachable TURN.
 */
const PEER_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

export const JOIN_TIMEOUT_MS = 30000;
const HOST_OPEN_MS = 12000;

export const MSG_NO_HOST = 'No host with that code (or host left). Re-host and try a new code.';
export const MSG_JOIN_TIMEOUT = 'Timed out reaching host. Check Wi-Fi / try again / use Pass & Play.';

export const PEER_CLOUD = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      {
        urls: [
          'turn:eu-0.turn.peerjs.com:3478',
          'turn:us-0.turn.peerjs.com:3478',
        ],
        username: 'peerjs',
        credential: 'peerjsp',
      },
    ],
    sdpSemantics: 'unified-plan',
  },
};

const NO_HOST_TYPES = new Set(['peer-unavailable', 'could-not-connect']);
const LINK_TYPES = new Set([
  'negotiation-failed',
  'webrtc',
  'network',
  'socket-error',
  'socket-closed',
  'server-error',
  'disconnected',
  'ssl-unavailable',
  'browser-incompatible',
]);

let peerScriptPromise = null;

export function loadPeerJS() {
  if (window.Peer) return Promise.resolve(true);
  if (peerScriptPromise) return peerScriptPromise;
  peerScriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = PEER_CDN;
    s.onload = () => resolve(!!window.Peer);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return peerScriptPromise;
}

function roomToPeerId(code) {
  return 'tot-room-' + String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

export function randomRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c = '';
  for (let i = 0; i < 4; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
  return c;
}

function peerDebugLevel() {
  try {
    const host = String(globalThis.location?.hostname || '');
    if (/\.github\.io$/i.test(host)) return 0;
    if (!host) return 0;
    return 1;
  } catch {
    return 0;
  }
}

function peerOptions() {
  return {
    host: PEER_CLOUD.host,
    port: PEER_CLOUD.port,
    path: PEER_CLOUD.path,
    secure: PEER_CLOUD.secure,
    debug: peerDebugLevel(),
    config: {
      iceServers: PEER_CLOUD.config.iceServers.map((server) => ({ ...server, urls: server.urls })),
      sdpSemantics: PEER_CLOUD.config.sdpSemantics,
    },
  };
}

function errorType(err) {
  return String(err?.type || '').toLowerCase();
}

export function guestJoinMessage(err) {
  const type = errorType(err);
  const text = String(err?.message || (typeof err === 'string' ? err : '') || '').toLowerCase();
  if (type === 'timeout') return MSG_JOIN_TIMEOUT;
  if (NO_HOST_TYPES.has(type) || text.includes('could not connect') || text.includes('peer-unavailable')) {
    return MSG_NO_HOST;
  }
  if (LINK_TYPES.has(type)) {
    return 'Could not open a connection to the host. Check Wi-Fi / try again / use Pass & Play.';
  }
  if (type) return `Could not join (${type}). Try again or use Pass & Play.`;
  return 'Could not join. Try again or use Pass & Play.';
}

function hostFailureMessage(type) {
  if (type === 'unavailable-id') return 'That room code is already in use.';
  if (type) return `Could not host a room (${type}). Use Pass & Play.`;
  return 'Could not host a room. Use Pass & Play.';
}

function openHost(code) {
  const peer = new window.Peer(roomToPeerId(code), peerOptions());
  let conn = null;
  const handlers = [];

  return new Promise((resolve) => {
    let opened = false;
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { peer.destroy(); } catch { /* already closed */ }
      resolve({ ok: false, error: 'PeerJS signaling timed out. Use pass-and-play.' });
    }, HOST_OPEN_MS);

    peer.on('error', (err) => {
      if (opened || settled) return;
      settled = true;
      clearTimeout(timer);
      const type = errorType(err);
      try { peer.destroy(); } catch { /* already closed */ }
      resolve({ ok: false, reason: type, error: hostFailureMessage(type) });
    });

    peer.on('open', () => {
      opened = true;
      const api = {
        ok: true,
        code,
        peer,
        role: 'host',
        get conn() { return conn; },
        get remotePeerId() { return conn?.peer || api._remotePeerId || ''; },
        set remotePeerId(id) { api._remotePeerId = id; },
        send(msg) { if (conn?.open) conn.send(msg); },
        onMessage(fn) { handlers.push(fn); },
        destroy() { try { conn?.close(); peer.destroy(); } catch { /* already closed */ } },
      };
      peer.on('connection', (c) => {
        conn = c;
        api.remotePeerId = c.peer;
        c.on('data', (data) => handlers.forEach((fn) => fn(data)));
        c.on('open', () => handlers.forEach((fn) => fn({ type: 'peer-ready', peerId: c.peer })));
      });
      finish(api);
    });
  });
}

/**
 * @returns {Promise<{ ok:boolean, code?:string, peer?:any, conn?:any, error?:string, send:(msg)=>void, onMessage:(fn)=>void, destroy:()=>void }>}
 */
export async function hostRoom() {
  const ok = await loadPeerJS();
  if (!ok) return { ok: false, error: 'PeerJS failed to load (CDN blocked). Use pass-and-play.' };

  let code = randomRoomCode();
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    last = await openHost(code);
    if (last.ok) return last;
    if (last.reason !== 'unavailable-id') break;
    code = randomRoomCode();
  }
  if (last?.reason === 'unavailable-id') {
    return { ok: false, error: 'Room code collided. Try hosting again.' };
  }
  return { ok: false, error: last?.error || 'Could not host a room. Use Pass & Play.' };
}

export async function joinRoom(code) {
  const ok = await loadPeerJS();
  if (!ok) return { ok: false, error: 'PeerJS failed to load (CDN blocked). Use pass-and-play.' };

  const peer = new window.Peer(peerOptions());
  const handlers = [];

  return new Promise((resolve) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { peer.destroy(); } catch { /* already closed */ }
      resolve({ ok: false, error });
    };
    const timer = setTimeout(() => fail(MSG_JOIN_TIMEOUT), JOIN_TIMEOUT_MS);

    peer.on('error', (err) => {
      if (settled) return;
      fail(guestJoinMessage(err));
    });

    peer.on('open', () => {
      if (settled) return;
      const conn = peer.connect(roomToPeerId(code), { reliable: true, serialization: 'json' });
      if (!conn) {
        fail(MSG_NO_HOST);
        return;
      }
      conn.on('error', (err) => {
        fail(guestJoinMessage(err));
      });
      conn.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const api = {
          ok: true,
          code: String(code).toUpperCase(),
          peer,
          conn,
          role: 'guest',
          get remotePeerId() { return conn?.peer || api._remotePeerId || ''; },
          set remotePeerId(id) { api._remotePeerId = id; },
          send(msg) { if (conn.open) conn.send(msg); },
          onMessage(fn) { handlers.push(fn); },
          destroy() { try { conn.close(); peer.destroy(); } catch { /* already closed */ } },
        };
        api.remotePeerId = conn.peer;
        conn.on('data', (data) => handlers.forEach((fn) => fn(data)));
        resolve(api);
      });
    });
  });
}
