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
import {
  defaultProfile, loadProfile, saveProfile, buyFragment, currentShop,
  buyShopOffer, equipSkin, equipBack, liveCosmetic, claimDailyLogin,
  patronIdentityOpen,
  TABLE_SKINS,
} from '../web/js/profile.js';
import { loginMonthGrid, loginCellHtml, priceOf, rarityOf, shopPeriodKey, SHOP_FEATURED_SLOTS, SHOP_FRAG_SLOTS, buildWeeklyGoals, patronDisplayName } from '../web/js/economy.js';
import { TOUR_STEPS, canSkipTourStep, tourStep, layoutTourStep } from '../web/js/tutorial.js';
import {
  signUpEmail, signInEmail, continueAsGuest, signOut, isSignedIn, currentSession,
  mergeProfiles, providerStatus, accountHint, permissionCopy,
} from '../web/js/auth.js';
import {
  createVoice, voiceStatusLine, canUseVoice, setMuted,
  voiceMicVisible, disableVoice, disableVoiceIfDisallowed,
} from '../web/js/voice.js';
import { PEER_CLOUD, JOIN_TIMEOUT_MS, MSG_NO_HOST, MSG_JOIN_TIMEOUT, guestJoinMessage } from '../web/js/netplay.js';

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
assert(!/Crown Crate/i.test(html), 'index has no Crown Crate product name');
assert(!/Daily slate/i.test(html), 'index has no Daily slate');
assert(/Daily stock/.test(html), 'index has Daily stock');
assert(/build 65/.test(html), 'splash stamp is build 65');
assert(/\?v=65/.test(html), 'cache bust is 65');
const splash = html.split('id="splash"')[1]?.split('id="ranked"')[0] || '';
assert(!/Unofficial/i.test(splash), 'splash body has no unofficial line');
assert(/id="account-disclaimer"/.test(html) && /id="about-disclaimer"/.test(html), 'disclaimers live on login and About');
const storeBlock = html.split('id="store"')[1]?.split('id="collection"')[0] || '';
assert(!/slate/i.test(storeBlock), 'store markup has no slate');
assert(!/Unofficial/i.test(storeBlock), 'store markup has no unofficial');

const app = readFileSync(new URL('../web/js/app.js', import.meta.url), 'utf8');
const localSeatSrc = app.slice(app.indexOf('function localSeat()'), app.indexOf('function canControl()'));
assert(/if \(matchMode === 'hotseat'\) return engine\?\.state\?\.active \?\? 0;/.test(localSeatSrc), 'hotseat localSeat uses optional chaining and ?? 0');
assert(!/return engine\.state/.test(localSeatSrc), 'hotseat localSeat does not read engine.state bare');
const localSeat = new Function('engine', 'matchMode', `${localSeatSrc}\nreturn localSeat();`);
assert(localSeat(null, 'hotseat') === 0, 'hotseat localSeat is 0 before the engine exists');
assert(localSeat({ state: null }, 'hotseat') === 0, 'hotseat localSeat is 0 when state is null');
assert(localSeat({ state: { active: 1 } }, 'hotseat') === 1, 'hotseat localSeat follows the active seat once the match exists');
assert(localSeat(null, 'remote-guest') === 1, 'remote guest seat stays 1');
assert(localSeat(null, 'remote-host') === 0, 'remote host seat stays 0');
assert(localSeat(null, 'ai') === 0, 'ai seat stays 0');
const hotseatFn = app.slice(app.indexOf('function beginHotseatPick'), app.indexOf('function copyRoomCode'));
assert(/matchMode = 'hotseat'/.test(hotseatFn) && /renderDeckPick\(\)/.test(hotseatFn) && /show\('#deckpick'\)/.test(hotseatFn), 'hotseat still opens patron pick before a match');
assert(!/new GameEngine|newMatch/.test(hotseatFn), 'hotseat patron pick still starts before newMatch');
const docsApp = readFileSync(new URL('../docs/js/app.js', import.meta.url), 'utf8');
const docsSeat = docsApp.slice(docsApp.indexOf('function localSeat()'), docsApp.indexOf('function canControl()'));
assert(docsSeat === localSeatSrc, 'docs localSeat matches web');
const docsHtml = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
assert(/build 65/.test(docsHtml) && /\?v=65/.test(docsHtml), 'docs index stamp and cache bust are 65');
const chrome = readFileSync(new URL('../web/css/club-chrome.css', import.meta.url), 'utf8');
const docsChrome = readFileSync(new URL('../docs/css/club-chrome.css', import.meta.url), 'utf8');
assert(chrome === docsChrome, 'docs club-chrome matches web');
assert(!/Crown Crate/.test(app), 'app copy has no Crown Crate product name');
assert(/function fitGauntletNames\(/.test(app), 'stop chips slide inside the map frame');
assert(/--name-x/.test(chrome), 'stop chip offset is a CSS variable on the name');
assert(/#gauntlet button:not\(\.g-marker\)/.test(chrome), 'gauntlet gold buttons skip map markers');
assert(/#gauntlet button\.g-marker \.g-name[\s\S]*color:\s*#24160c/.test(chrome), 'stop pills set dark ink on the name');
assert(!/#gauntlet button,/.test(chrome), 'generic gauntlet button rule does not include markers');

const netplaySrc = readFileSync(new URL('../web/js/netplay.js', import.meta.url), 'utf8');
const docsNetplay = readFileSync(new URL('../docs/js/netplay.js', import.meta.url), 'utf8');
assert(netplaySrc === docsNetplay, 'docs netplay matches web');
assert(/iceServers/.test(netplaySrc), 'netplay.js sets iceServers');
assert(/stun:stun\.l\.google\.com:19302/.test(netplaySrc), 'netplay.js includes Google STUN');
assert(/stun:global\.stun\.twilio\.com:3478/.test(netplaySrc), 'netplay.js includes backup STUN');
assert(/host:\s*'0\.peerjs\.com'/.test(netplaySrc), 'netplay.js sets the PeerJS cloud host');
assert(/port:\s*443/.test(netplaySrc) && /path:\s*'\/'/.test(netplaySrc) && /secure:\s*true/.test(netplaySrc), 'netplay.js sets PeerJS cloud port, path, and secure');
assert(/serialization:\s*'json'/.test(netplaySrc), 'guest connect uses json serialization');
assert(/unavailable-id/.test(netplaySrc) && /attempt < 2/.test(netplaySrc), 'host retries once when the room id is taken');
assert(PEER_CLOUD.host === '0.peerjs.com' && PEER_CLOUD.port === 443 && PEER_CLOUD.path === '/' && PEER_CLOUD.secure === true, 'PEER_CLOUD is the public PeerJS broker');
assert(PEER_CLOUD.config.iceServers.some((s) => s.urls === 'stun:stun.l.google.com:19302'), 'PEER_CLOUD iceServers includes Google STUN');
assert(PEER_CLOUD.config.iceServers.some((s) => s.urls === 'stun:global.stun.twilio.com:3478'), 'PEER_CLOUD iceServers includes Twilio STUN');
assert(JOIN_TIMEOUT_MS === 30000, 'guest join timeout is 30s');
assert(guestJoinMessage({ type: 'peer-unavailable' }) === MSG_NO_HOST, 'peer-unavailable names a missing host');
assert(guestJoinMessage({ type: 'could-not-connect' }) === MSG_NO_HOST, 'could-not-connect names a missing host');
assert(guestJoinMessage({ message: 'Could not connect to peer tot-room-ABCD' }) === MSG_NO_HOST, 'could-not-connect text names a missing host');
assert(guestJoinMessage({ type: 'timeout' }) === MSG_JOIN_TIMEOUT, 'timeout tells the guest to check Wi-Fi or use Pass & Play');
assert(guestJoinMessage({ type: 'peer-unavailable' }) !== guestJoinMessage({ type: 'timeout' }), 'missing host and timeout are different errors');
assert(TOUR_STEPS.length === 8, `tutorial has 8 steps (${TOUR_STEPS.length})`);
assert(TOUR_STEPS.every((s) => s.id && s.sel && s.text && tourStep(TOUR_STEPS.indexOf(s))?.id === s.id), 'every tutorial step is addressable');
assert(/Your hand\. Tap a card/.test(TOUR_STEPS[0].text), 'tutorial explains the hand');
assert(/Coin buys from the Tavern/.test(TOUR_STEPS.map((s) => s.text).join(' ')), 'tutorial explains Coin and the Tavern');
assert(/Power knocks out Agents/.test(TOUR_STEPS[1].text) && /Prestige/.test(TOUR_STEPS[1].text), 'tutorial explains Power and Prestige');
assert(/The Tavern is five cards/.test(TOUR_STEPS[2].text), 'tutorial explains the Tavern buy');
assert(/Combos fire/.test(TOUR_STEPS[3].text), 'tutorial explains combos');
assert(/Agents stay in these slots/.test(TOUR_STEPS[4].text), 'tutorial explains agents');
assert(/Patrons live here/.test(TOUR_STEPS[5].text), 'tutorial explains Patrons');
assert(/End Turn when you are done/.test(TOUR_STEPS[6].text), 'tutorial explains end turn');
assert(/40 Prestige/.test(TOUR_STEPS[7].text) && /80 Prestige/.test(TOUR_STEPS[7].text), 'tutorial explains Prestige wins');
assert(canSkipTourStep(0) && canSkipTourStep(1) && canSkipTourStep(7), 'tutorial skip is on every step, including the first');
assert(!canSkipTourStep(-1) && !canSkipTourStep(1.5), 'tutorial skip ignores a bad index');
assert(!/slate/i.test(TOUR_STEPS.map((s) => s.text).join(' ')), 'tutorial never says slate');
assert(/canSkipTourStep\(tourStep\)/.test(app), 'match tour asks canSkipTourStep');
assert(/layoutTourStep\(/.test(app), 'match tour clamps the tip with layoutTourStep');
assert(/Skip Tour/.test(html), 'tour offers Skip Tour');
assert(/if \(tourActive\) endTour\(\{ resume: false \}\)/.test(app), 'leave and win clear the tour');
assert(/e\.key !== 'Escape'[\s\S]{0,280}if \(!tourActive\) return;\s*e\.preventDefault\(\);\s*endTour\(\)/.test(app), 'Escape ends an active tour');
assert(/clearInspectOverlays\(/.test(app), 'tour clears a leftover inspect overlay');
const patronsStuck = layoutTourStep({
  target: { left: 298, top: 0, width: 92, height: 844 },
  viewport: { width: 390, height: 844 },
  panel: { width: 320, height: 168 },
});
const oldOffscreenTop = 844 - Math.max(12, 844 - 0 + 12) - 168;
assert(oldOffscreenTop < 0, 'old patron-rail formula parked the tip above the viewport');
assert(patronsStuck.dock === 'safe', 'full-height patron rail docks the tip');
assert(patronsStuck.panel.top >= 12 && patronsStuck.panel.top + 168 <= 844 - 12, 'patrons tip stays inside the portrait viewport');
assert(patronsStuck.panel.left >= 12 && patronsStuck.panel.left + patronsStuck.panel.width <= 390 - 12, 'patrons tip stays inside the portrait width');
assert(patronsStuck.hole && patronsStuck.hole.height > 400 && patronsStuck.hole.left >= 280, 'patrons hole still spotlights the rail');
const handTip = layoutTourStep({
  target: { left: 40, top: 640, width: 300, height: 140 },
  viewport: { width: 390, height: 844 },
  panel: { width: 320, height: 150 },
});
assert(handTip.dock === 'above' && handTip.panel.top >= 12 && handTip.panel.top + 150 <= 844 - 12, 'a low hand keeps the tip on screen above it');
const tavernTip = layoutTourStep({
  target: { left: 40, top: 280, width: 300, height: 120 },
  viewport: { width: 390, height: 844 },
  panel: { width: 320, height: 150 },
});
assert(tavernTip.dock === 'below' && tavernTip.panel.top + 150 <= 844 - 12, 'a tavern with room below keeps the tip underneath');
const landTip = layoutTourStep({
  target: { left: 760, top: 0, width: 84, height: 390 },
  viewport: { width: 844, height: 390 },
  panel: { width: 340, height: 150 },
});
assert(landTip.panel.top >= 12 && landTip.panel.top + 150 <= 390 - 12, 'landscape patrons tip stays on screen');
assert(landTip.panel.left >= 12 && landTip.panel.left + landTip.panel.width <= 844 - 12, 'landscape patrons tip stays inside the width');
const freshPatron = defaultProfile();
assert(!patronIdentityOpen(freshPatron, 'druid'), 'locked Druid King stays hidden off the table');
assert(patronIdentityOpen(freshPatron, 'druid', { inMatch: true, onTable: true }), 'Druid King on the table is named');
assert(!patronIdentityOpen(freshPatron, 'druid', { inMatch: false, onTable: true }), 'a table flag outside a match does not reveal a locked deck');
assert(!patronIdentityOpen(freshPatron, 'druid', { inMatch: true, onTable: false }), 'a deck not in this match stays locked');
assert(patronIdentityOpen(freshPatron, 'pelin') && patronIdentityOpen(freshPatron, 'treasury'), 'starters and Treasury stay named');
assert(/patronRevealed\(pid\)/.test(app) && /patronIdentityOpen\(/.test(app), 'match confirm and dossier use the on-table name');
assert(/canContinue \? 'Cancel' : 'Close'/.test(app), 'a patron you cannot call offers Close');
assert(/go\.hidden = !canContinue/.test(app), 'disabled Continue is not left as the only action');
assert(/#patron-confirm-overlay'\)\?\.classList\.contains\('show'\)/.test(app), 'Escape closes the patron confirm');
assert(/id="btn-replay-tour"/.test(html) && /startTutorialMatch/.test(app), 'tutorial replays from Settings');
assert(/setCollectionSub\(/.test(app) && /data-sub="frags"/.test(html) && /data-sub="backs"/.test(html), 'collection subcategories are wired');
assert(/sel-table-skin/.test(html) && /sel-card-back/.test(html) && /equipSkin\(profile, e\.target\.value\)/.test(app), 'settings equip table and card back');
assert(/liveCosmetic\(profile\)/.test(app) && /--eso-felt/.test(app) && /--card-back/.test(app), 'applyTableSkin writes the live table and deck back');
assert(/loginCellHtml\(/.test(app) && /justStamped/.test(app), 'claim paints a stamp onto the calendar');

const hostFn = app.slice(app.indexOf('async function beginHostRoom'), app.indexOf('async function beginJoinRoom'));
const hostBeforeGuest = hostFn.split('net.onMessage')[0] || '';
const hostOnGuest = hostFn.split('net.onMessage')[1] || '';
assert(!/show\('#deckpick'\)/.test(hostBeforeGuest), 'host does not open patron pick before a guest arrives');
assert(/show\('#friend-lobby'\)/.test(hostBeforeGuest), 'host stays on the friend lobby with the room code');
assert(/Waiting for guest/.test(hostFn), 'lobby tells the host it is waiting');
assert(/peer-ready/.test(hostOnGuest) && /hello/.test(hostOnGuest), 'guest hello or peer-ready advances the host');
assert(/Guest joined — pick decks/.test(hostOnGuest), 'host says the guest joined');
assert(/show\('#deckpick'\)/.test(hostOnGuest), 'patron pick opens only after the guest joins');
assert(/id="friend-room-code"/.test(html) && /letter-spacing:\s*0\.42em/.test(readFileSync(new URL('../web/css/club-chrome.css', import.meta.url), 'utf8')), 'room code is large and letterspaced');
assert(/id="deckpick-room"/.test(html), 'patron pick keeps a room-code banner');
const joinFn = app.slice(app.indexOf('async function beginJoinRoom'), app.indexOf('async function updateMusicBtn'));
assert(!/show\('#deckpick'\)/.test(joinFn) && /match-start/.test(joinFn) && /show\('#match'\)/.test(joinFn), 'guest waits on the lobby until match-start');
assert(/type: 'match-start'/.test(app) && /pickYou/.test(app) && /pickOpp/.test(app), 'host Begin sends match-start with both patron pairs');

const beforeMidnight = new Date('2026-09-15T03:59:00Z');
const afterMidnight = new Date('2026-09-15T04:01:00Z');
assert(shopPeriodKey(beforeMidnight) !== shopPeriodKey(afterMidnight), 'shop period rolls at New York midnight');
assert(shopPeriodKey(beforeMidnight) === shopPeriodKey(new Date('2026-09-14T16:00:00Z')), 'shop period stays put through the New York day');

const periodA = currentShop(defaultProfile(), cards, 2000);
const periodB = currentShop(defaultProfile(), cards, 2001);
assert(periodA.periodKey === 2000 && periodB.periodKey === 2001, 'shop period key is the day you ask for');
assert(periodA.featured.map((o) => o.id).join() !== periodB.featured.map((o) => o.id).join(), 'adjacent shop periods stock different offers');
assert(periodA.tomorrow.periodKey === 2001, 'tomorrow preview is the next period');
assert(periodA.tomorrow.featured.map((o) => o.id).join() === periodB.featured.map((o) => o.id).join(), 'tomorrow preview matches the next period’s stock');
assert(periodA.featured.length > 0 && periodA.featured.length <= SHOP_FEATURED_SLOTS, `daily stock stays sparse (${periodA.featured.length})`);
assert(periodA.catalogSize > periodA.featured.length, 'the shop does not list the whole catalog at once');
assert(periodA.featured.filter((o) => o.kind === 'fragment').length === SHOP_FRAG_SLOTS, 'exactly one fragment is in the daily stock');
assert(periodA.featured.every((o) => o.price === priceOf(o.kind, o.target, cards) && o.rarity === rarityOf(o.kind, o.target, cards)), 'every offer shows its rarity price');
let sameAll = true;
for (let k = 2100; k < 2112; k++) {
  const shop = currentShop(defaultProfile(), cards, k);
  if (shop.featured.length >= shop.catalogSize) sameAll = false;
  if (shop.featured.filter((o) => o.kind === 'fragment').length !== 1) sameAll = false;
}
assert(sameAll, 'twelve periods stay sparse and keep a single fragment');

let nightbladePeriod = null;
for (let k = 1; k < 500 && !nightbladePeriod; k++) {
  const shop = currentShop(defaultProfile(), cards, k);
  const hit = shop.featured.find((o) => o.kind === 'skin' && o.target === 'nightblade');
  if (hit) nightbladePeriod = { k, hit };
}
assert(!!nightbladePeriod, 'Nightblade table appears in some shop period');
const buyer = defaultProfile();
buyer.gold = nightbladePeriod.hit.price;
const bought = buyShopOffer(buyer, nightbladePeriod.hit, cards, { periodKey: nightbladePeriod.k });
assert(bought.ok && buyer.tableSkin === 'nightblade', `buying a table skin equips it (${bought.error || buyer.tableSkin})`);
const worn = liveCosmetic(buyer);
const plain = liveCosmetic(defaultProfile());
assert(worn.skinClass === 'skin-nightblade' && worn.felt !== plain.felt, `equipped table changes the live felt (${worn.felt} vs ${plain.felt})`);
const offPeriod = buyShopOffer(defaultProfile(), nightbladePeriod.hit, cards, { periodKey: nightbladePeriod.k + 3 });
assert(!!offPeriod.error && !/slate/i.test(offPeriod.error), `off-period buy is refused in shop language (${offPeriod.error})`);
const sold = buyShopOffer(buyer, nightbladePeriod.hit, cards, { periodKey: nightbladePeriod.k });
assert(!!sold.error, `second buy is sold out (${sold.error})`);

const backBuyer = defaultProfile();
backBuyer.unlockedBacks = [...backBuyer.unlockedBacks, 'apocrypha'];
equipBack(backBuyer, 'apocrypha');
const backed = liveCosmetic(backBuyer);
assert(backed.backId === 'apocrypha' && backed.cardBack !== plain.cardBack, 'equipping a card back changes the deck back url');
assert(backed.backHue === '#0a1810' && backed.backAccent === '#3a9050', 'apocrypha back uses its palette');
assert(/card-back/i.test(backed.cardBack) && backed.cardBack.includes('3a9050'), 'live back is a card-back in the apocrypha colors');
const ownedSkin = defaultProfile();
ownedSkin.unlockedSkins = [...ownedSkin.unlockedSkins, 'auridon'];
equipSkin(ownedSkin, 'auridon');
assert(liveCosmetic(ownedSkin).skinId === 'auridon' && liveCosmetic(ownedSkin).felt === '#1a2c28', 'settings-style equip sets the Auridon table');
assert(TABLE_SKINS.some((s) => s.id === 'auridon'), 'Auridon is a real table skin');

const weekGoals = buildWeeklyGoals('2026-09-14', defaultProfile());
assert(weekGoals.every((g) => !/\b(pelin|hunding|redeagle|orgnum)\b/.test(g.desc)), `weekly goals use Patron names (${weekGoals.map((g) => g.desc).join(' | ')})`);
assert(patronDisplayName('mora') === 'Hermaeus Mora', 'Mora displays as Hermaeus Mora');

const stampP = defaultProfile();
const stamped = claimDailyLogin(stampP, cards);
assert(!stamped.error && stampP.loginDays, `daily login claims (${stamped.error || 'ok'})`);
const stampGrid = loginMonthGrid(stampP.loginDays);
const todayCell = stampGrid.cells.find((c) => c.date === stampGrid.today);
assert(todayCell?.state === 'ok', `claimed day is marked ok (${todayCell?.state})`);
const stampHtml = loginCellHtml(todayCell, { justStamped: stampGrid.today });
assert(/day-stamp/.test(stampHtml) && /STAMP/.test(stampHtml) && /just-stamped/.test(stampHtml), 'claimed day renders a visible stamp');
const futureCell = stampGrid.cells.find((c) => c.state === 'future');
if (futureCell) assert(!/day-stamp/.test(loginCellHtml(futureCell)), 'unclaimed days are not stamped');
const missCell = { date: '2026-09-01', day: 1, state: 'miss' };
assert(!/day-stamp/.test(loginCellHtml(missCell)) && /✕/.test(loginCellHtml(missCell)), 'missed days keep the red X');

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
