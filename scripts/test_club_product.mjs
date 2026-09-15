/**
 * Club product pass: shop language, accounts, tutorial copy, voice honesty.
 */
const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

import { readFileSync } from 'fs';
import { defaultProfile, loadProfile, saveProfile, buyFragment, currentShop } from '../web/js/profile.js';
import {
  signUpEmail, signInEmail, continueAsGuest, signOut, isSignedIn, currentSession,
  mergeProfiles, providerStatus, accountHint, permissionCopy,
} from '../web/js/auth.js';
import {
  createVoice, voiceStatusLine, canUseVoice, setMuted,
  voiceMicVisible, disableVoice, disableVoiceIfDisallowed,
} from '../web/js/voice.js';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')).cards;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok ', msg);
}

const shop = currentShop(defaultProfile(), cards, 14);
assert(!!shop.featured?.length, 'shop still rotates stock');
const buyErr = buyFragment(defaultProfile(), 'hunding', cards);
assert(/shop|today/i.test(buyErr.error || '') && !/slate/i.test(buyErr.error || ''), `buy error uses shop language (${buyErr.error})`);

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
assert(!/Daily slate/i.test(html), 'index has no Daily slate');
assert(/Daily stock/.test(html), 'index has Daily stock');
assert(/build 52/.test(html), 'splash stamp is build 52');
assert(/\?v=52/.test(html), 'cache bust is 52');
const splash = html.split('id="splash"')[1]?.split('id="ranked"')[0] || '';
assert(!/Unofficial/i.test(splash), 'splash body has no unofficial line');
assert(/id="account-disclaimer"/.test(html) && /id="about-disclaimer"/.test(html), 'disclaimers live on login and About');
const storeBlock = html.split('id="store"')[1]?.split('id="collection"')[0] || '';
assert(!/slate/i.test(storeBlock), 'store markup has no slate');
assert(!/Unofficial/i.test(storeBlock), 'store markup has no unofficial');

const app = readFileSync(new URL('../web/js/app.js', import.meta.url), 'utf8');
assert(/Your hand\. Tap a card/.test(app), 'tutorial explains the hand');
assert(/Coin buys from the tavern/.test(app), 'tutorial explains coin/prestige/power');
assert(/The tavern is five cards/.test(app), 'tutorial explains tavern buy');
assert(/Combos fire/.test(app), 'tutorial explains combos');
assert(/Agents stay in these slots/.test(app), 'tutorial explains agents');
assert(/Patrons live here/.test(app), 'tutorial explains patrons');
assert(/End Turn when you are done/.test(app), 'tutorial explains end turn');

const p = defaultProfile();
p.gold = 99;
saveProfile(p);
const up = await signUpEmail('roister@example.com', 'secret1');
assert(up.ok && isSignedIn(), `email sign-up works (${up.error || 'ok'})`);
assert(loadProfile().gold === 99, 'sign-up keeps guest progress');
await signOut();
assert(!isSignedIn(), 'sign-out returns to guest');
const inn = await signInEmail('roister@example.com', 'secret1');
assert(inn.ok && isSignedIn(), 'email sign-in works');
assert(loadProfile().gold === 99, 'signed-in profile restores gold');
const bad = await signInEmail('roister@example.com', 'nope');
assert(!!bad.error, 'wrong password is rejected');
const st = providerStatus();
assert(st.email.ready, 'email path is ready');
assert(!st.google.ready && /Firebase|cloud/i.test(st.google.reason), `Google is gated honestly (${st.google.reason})`);
assert(!st.apple.ready && /Apple/i.test(st.apple.reason), `Apple is gated honestly (${st.apple.reason})`);
assert(!st.phone.ready && /Phone/i.test(st.phone.reason), `Phone is gated honestly (${st.phone.reason})`);
assert(/Guest|device|cloud/i.test(accountHint()), `account hint is honest (${accountHint()})`);
assert(/microphone/i.test(permissionCopy().mic), 'mic permission copy explains why');

const merged = mergeProfiles({ gold: 10, updatedAt: 1 }, { gold: 50, updatedAt: 9 });
assert(merged.gold === 50, 'newer remote profile wins');

const voice = createVoice();
assert(voiceStatusLine(voice) === 'Voice off.', 'voice starts off');
assert(!canUseVoice('ai') && !canUseVoice('hotseat'), 'voice not offered vs AI or hotseat');
assert(canUseVoice('remote-host') && canUseVoice('remote-guest'), 'voice offered in Friend/Ranked remote');
setMuted(voice, true);
assert(voice.muted, 'mute flag works without a live mic');

const leftover = createVoice();
leftover.wanted = true;
leftover.live = true;
assert(!voiceMicVisible('hotseat', leftover), 'Mic hidden on Hotseat even if Friend voice was on');
assert(!voiceMicVisible('ai', leftover), 'Mic hidden vs AI even if Friend voice was on');
assert(voiceMicVisible('remote-host', leftover), 'Mic shown in Friend remote when wanted');
assert(voiceMicVisible('remote-guest', leftover), 'Mic shown in Ranked guest when wanted');
assert(!voiceMicVisible('remote-host', createVoice()), 'Mic hidden in remote when voice is off');
disableVoiceIfDisallowed(leftover, null, 'hotseat');
assert(!leftover.wanted && !leftover.live, 'entering Hotseat clears leftover Friend voice');
const keepRemote = createVoice();
keepRemote.wanted = true;
disableVoiceIfDisallowed(keepRemote, null, 'remote-host');
assert(keepRemote.wanted, 'Friend remote keeps wanted');
disableVoiceIfDisallowed(keepRemote, null, 'ai');
assert(!keepRemote.wanted && !keepRemote.live, 'entering AI clears leftover Friend voice');
disableVoice(leftover, null);
assert(!leftover.wanted && !leftover.live, 'disableVoice clears wanted/live');

assert(/voiceMicVisible\(matchMode, voice\)/.test(app), 'paintVoiceChrome gates Mic on canUseVoice');
assert(/function beginHotseatPick[\s\S]{0,80}syncVoiceToMatchMode/.test(app), 'Hotseat entry clears voice');
assert(/function beginDeckPick[\s\S]{0,80}syncVoiceToMatchMode/.test(app), 'deck-pick entry syncs voice to mode');
assert(/function startTutorialMatch[\s\S]{0,400}syncVoiceToMatchMode/.test(app), 'tutorial AI entry clears voice');
assert(/gauntletStopIndex[\s\S]{0,180}syncVoiceToMatchMode\(\);\s*pickYou = \[\.\.\.stop\.you\]/.test(app), 'gauntlet AI entry clears voice');
assert(!/voicePref\(/.test(app), 'dead voicePref is not imported');

await continueAsGuest();
assert(currentSession().guest, 'guest continue works');

if (failed) {
  console.error(`\n${failed} club product checks failed`);
  process.exit(1);
}
console.log('\nclub product checks ok');
