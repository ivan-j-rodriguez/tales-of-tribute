/**
 * Simple PeerJS data-channel sync for remote friend matches.
 * Host creates a 4-letter room code; guest joins via PeerJS cloud broker.
 */
const PEER_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

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

/**
 * @returns {Promise<{ ok:boolean, code?:string, peer?:any, conn?:any, error?:string, send:(msg)=>void, onMessage:(fn)=>void, destroy:()=>void }>}
 */
export async function hostRoom() {
  const ok = await loadPeerJS();
  if (!ok) return { ok: false, error: 'PeerJS failed to load (CDN blocked). Use pass-and-play.' };

  const code = randomRoomCode();
  const peer = new window.Peer(roomToPeerId(code));
  let conn = null;
  const handlers = [];

  return new Promise((resolve) => {
    const failTimer = setTimeout(() => {
      peer.destroy();
      resolve({ ok: false, error: 'PeerJS signaling timed out. Use pass-and-play.' });
    }, 12000);

    peer.on('error', (err) => {
      clearTimeout(failTimer);
      resolve({ ok: false, error: String(err?.type || err || 'Peer error') });
    });

    peer.on('open', () => {
      clearTimeout(failTimer);
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
        destroy() { try { conn?.close(); peer.destroy(); } catch {} },
      };
      peer.on('connection', (c) => {
        conn = c;
        api.remotePeerId = c.peer;
        c.on('data', (data) => handlers.forEach(fn => fn(data)));
        c.on('open', () => handlers.forEach(fn => fn({ type: 'peer-ready', peerId: c.peer })));
      });
      resolve(api);
    });
  });
}

export async function joinRoom(code) {
  const ok = await loadPeerJS();
  if (!ok) return { ok: false, error: 'PeerJS failed to load (CDN blocked). Use pass-and-play.' };

  const peer = new window.Peer();
  const handlers = [];

  return new Promise((resolve) => {
    const failTimer = setTimeout(() => {
      peer.destroy();
      resolve({ ok: false, error: 'Could not reach host. Check the room code.' });
    }, 15000);

    peer.on('error', (err) => {
      clearTimeout(failTimer);
      resolve({ ok: false, error: String(err?.type || err || 'Peer error') });
    });

    peer.on('open', () => {
      const conn = peer.connect(roomToPeerId(code), { reliable: true });
      conn.on('error', (err) => {
        clearTimeout(failTimer);
        resolve({ ok: false, error: String(err || 'Connection failed') });
      });
      conn.on('open', () => {
        clearTimeout(failTimer);
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
          destroy() { try { conn.close(); peer.destroy(); } catch {} },
        };
        api.remotePeerId = conn.peer;
        conn.on('data', (data) => handlers.forEach(fn => fn(data)));
        resolve(api);
      });
    });
  });
}
