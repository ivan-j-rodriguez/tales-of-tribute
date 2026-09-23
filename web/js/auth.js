/**
 * Club accounts for the static GitHub Pages app.
 *
 * Email always works:
 *   - Firebase Auth + Firestore when FIREBASE_CONFIG is set
 *   - otherwise a salted SHA-256 vault in this browser (honestly labeled device-only)
 * Guest play never requires an account.
 */
import { FIREBASE_CONFIG } from './firebase-config.js';
import { defaultProfile, loadProfile, saveProfile, setProfileSaveHook, PROFILE_KEY } from './profile.js';

export const SESSION_KEY = 'tot_session_v1';
export const ACCOUNTS_KEY = 'tot_accounts_v1';
export const ACCOUNT_PROFILES_KEY = 'tot_account_profiles_v1';
export const GUEST_SNAPSHOT_KEY = 'tot_guest_snapshot_v1';
export const ACCOUNT_SEEN_KEY = 'tot_account_seen_v1';
export const FB_CDN = 'https://www.gstatic.com/firebasejs/10.14.1';

const listeners = [];
let fbReady = null;
let cloudUnsub = null;
let syncTimer = null;

function storeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function storeSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function currentSession() {
  return storeGet(SESSION_KEY, { guest: true, uid: 'guest', provider: 'guest' });
}

export function isSignedIn() {
  const s = currentSession();
  return !!(s && !s.guest && s.uid && s.uid !== 'guest');
}

export function cloudConfigured() {
  return !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

export function accountHint() {
  if (isSignedIn()) {
    const s = currentSession();
    if (s.cloud) return `Signed in · cloud sync on (${s.email || 'Club account'})`;
    return `Signed in on this device · ${s.email || 'Club account'}. Cloud sync waits on Firebase (STATUS.md).`;
  }
  return cloudConfigured()
    ? 'Guest — progress stays on this device until you sign in.'
    : 'Guest — play here without an account. Email sign-up saves this browser until Club cloud is connected.';
}

export function onAuthChange(fn) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function emit(session) {
  for (const fn of listeners) {
    try { fn(session); } catch {}
  }
}

function writeSession(session) {
  storeSet(SESSION_KEY, session);
  emit(session);
  return session;
}

function accountProfiles() {
  return storeGet(ACCOUNT_PROFILES_KEY, {});
}

function putAccountProfile(uid, profile) {
  if (!uid || uid === 'guest') return;
  const all = accountProfiles();
  all[uid] = profile;
  storeSet(ACCOUNT_PROFILES_KEY, all);
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  (globalThis.crypto || {}).getRandomValues?.(bytes);
  if (![...bytes].some(Boolean)) {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, salt) {
  const subtle = globalThis.crypto?.subtle;
  const material = `${salt}\n${password}`;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(material));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function loadFbScript(src) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Firebase needs a browser'));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('Firebase script failed to load'));
    document.head.appendChild(s);
  });
}

export async function loadFirebase() {
  if (!cloudConfigured()) return { ok: false, reason: 'no-config' };
  if (fbReady) return fbReady;
  fbReady = (async () => {
    if (!globalThis.firebase) {
      await loadFbScript(`${FB_CDN}/firebase-app-compat.js`);
      await loadFbScript(`${FB_CDN}/firebase-auth-compat.js`);
      await loadFbScript(`${FB_CDN}/firebase-firestore-compat.js`);
    }
    const firebase = globalThis.firebase;
    if (!firebase) return { ok: false, reason: 'sdk-missing' };
    const app = firebase.apps?.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    return { ok: true, app, auth: firebase.auth(), db: firebase.firestore() };
  })().catch((err) => ({ ok: false, reason: String(err?.message || err) }));
  return fbReady;
}

async function cloudPull(uid) {
  const fb = await loadFirebase();
  if (!fb.ok) return null;
  const snap = await fb.db.collection('users').doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function cloudPush(uid, profile) {
  const fb = await loadFirebase();
  if (!fb.ok) return { ok: false, reason: fb.reason };
  const payload = { ...profile, updatedAt: profile.updatedAt || Date.now() };
  await fb.db.collection('users').doc(uid).set(payload, { merge: true });
  return { ok: true };
}

export function mergeProfiles(local, remote) {
  if (!remote) return local || defaultProfile();
  if (!local) return { ...defaultProfile(), ...remote };
  const lAt = Number(local.updatedAt) || 0;
  const rAt = Number(remote.updatedAt) || 0;
  if (rAt > lAt) return { ...defaultProfile(), ...local, ...remote, updatedAt: rAt };
  return { ...defaultProfile(), ...remote, ...local, updatedAt: Math.max(lAt, rAt) };
}

function snapshotGuestIfNeeded() {
  const s = currentSession();
  if (s.guest) {
    try { localStorage.setItem(GUEST_SNAPSHOT_KEY, localStorage.getItem(PROFILE_KEY) || ''); } catch {}
  }
}

function applyActiveProfile(profile) {
  saveProfile({ ...defaultProfile(), ...profile, updatedAt: Date.now() });
  return loadProfile();
}

async function adoptUser(session, incomingProfile) {
  snapshotGuestIfNeeded();
  const localCopy = accountProfiles()[session.uid];
  let remote = null;
  if (session.cloud) {
    try { remote = await cloudPull(session.uid); } catch {}
  }
  const seed = incomingProfile || loadProfile();
  const merged = mergeProfiles(mergeProfiles(localCopy, seed), remote);
  applyActiveProfile(merged);
  putAccountProfile(session.uid, loadProfile());
  if (session.cloud) {
    try { await cloudPush(session.uid, loadProfile()); } catch {}
  }
  return writeSession(session);
}

function queueCloudSync(profile) {
  const s = currentSession();
  if (!isSignedIn()) return;
  putAccountProfile(s.uid, profile);
  if (!s.cloud) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    cloudPush(s.uid, profile).catch(() => {});
  }, 700);
}

export function installProfileSync() {
  setProfileSaveHook((p) => queueCloudSync(p));
}

export async function signUpEmail(email, password) {
  const addr = String(email || '').trim().toLowerCase();
  if (!validEmail(addr)) return { error: 'Enter a valid email.' };
  if (!password || String(password).length < 6) return { error: 'Password must be at least 6 characters.' };

  if (cloudConfigured()) {
    const fb = await loadFirebase();
    if (!fb.ok) return { error: `Club cloud unavailable (${fb.reason}).` };
    try {
      const cred = await fb.auth.createUserWithEmailAndPassword(addr, password);
      const session = {
        guest: false, uid: cred.user.uid, email: addr, provider: 'email', cloud: true,
      };
      await adoptUser(session, loadProfile());
      return { ok: true, session: currentSession() };
    } catch (err) {
      return { error: firebaseError(err) };
    }
  }

  const accounts = storeGet(ACCOUNTS_KEY, {});
  if (accounts[addr]) return { error: 'That email already has a Club account on this device.' };
  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const uid = `local-${salt.slice(0, 12)}`;
  accounts[addr] = { uid, email: addr, salt, hash, createdAt: Date.now() };
  storeSet(ACCOUNTS_KEY, accounts);
  const session = { guest: false, uid, email: addr, provider: 'email', cloud: false };
  await adoptUser(session, loadProfile());
  return { ok: true, session: currentSession() };
}

export async function signInEmail(email, password) {
  const addr = String(email || '').trim().toLowerCase();
  if (!validEmail(addr)) return { error: 'Enter a valid email.' };
  if (!password) return { error: 'Enter your password.' };

  if (cloudConfigured()) {
    const fb = await loadFirebase();
    if (!fb.ok) return { error: `Club cloud unavailable (${fb.reason}).` };
    try {
      const cred = await fb.auth.signInWithEmailAndPassword(addr, password);
      const session = {
        guest: false, uid: cred.user.uid, email: addr, provider: 'email', cloud: true,
      };
      await adoptUser(session, accountProfiles()[cred.user.uid] || null);
      return { ok: true, session: currentSession() };
    } catch (err) {
      return { error: firebaseError(err) };
    }
  }

  const accounts = storeGet(ACCOUNTS_KEY, {});
  const row = accounts[addr];
  if (!row) return { error: 'No Club account for that email on this device.' };
  const hash = await hashPassword(password, row.salt);
  if (hash !== row.hash) return { error: 'Wrong password.' };
  const session = { guest: false, uid: row.uid, email: addr, provider: 'email', cloud: false };
  await adoptUser(session, accountProfiles()[row.uid] || null);
  return { ok: true, session: currentSession() };
}

export async function continueAsGuest() {
  const snap = localStorage.getItem(GUEST_SNAPSHOT_KEY);
  writeSession({ guest: true, uid: 'guest', provider: 'guest' });
  if (snap) {
    try {
      const parsed = JSON.parse(snap);
      applyActiveProfile(parsed);
    } catch {}
  }
  markAccountSeen();
  return { ok: true, session: currentSession() };
}

export async function signOut() {
  if (cloudConfigured()) {
    try {
      const fb = await loadFirebase();
      if (fb.ok) await fb.auth.signOut();
    } catch {}
  }
  if (cloudUnsub) { try { cloudUnsub(); } catch {} cloudUnsub = null; }
  return continueAsGuest();
}

export function markAccountSeen() {
  try { localStorage.setItem(ACCOUNT_SEEN_KEY, '1'); } catch {}
}

export function accountSeen() {
  try { return localStorage.getItem(ACCOUNT_SEEN_KEY) === '1'; } catch { return false; }
}

function firebaseError(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'That email already has a Club account.';
  if (code.includes('user-not-found') || code.includes('invalid-credential')) return 'Email or password did not match.';
  if (code.includes('wrong-password')) return 'Wrong password.';
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('operation-not-allowed')) return 'Email sign-in is not enabled in Club cloud.';
  return String(err?.message || err || 'Sign-in failed.');
}

export function permissionCopy() {
  return {
    mic: 'Microphone is off unless you turn on optional voice in a Friend or Ranked room. We ask the browser only then.',
  };
}
