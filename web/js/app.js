import { GameEngine } from './engine.js';
import { TributeAI } from './ai.js';
import { normalizeCatalog, nameSlug } from './normalize.js';
import {
  loadProfile, saveProfile, doDailyCheckIn, ensureDailyChallengeReset,
  recordMatchResult, openPurse, buySack, claimAchievement, claimDailyChallenge,
  isDeckUnlocked, fragmentProgress, ACHIEVEMENTS, STARTER_DECKS, LOCKED_DECKS,
  ALL_DECKS, FRAGMENTS_TO_UNLOCK, SACK_BUY_COST, purseCount,
  TABLE_SKINS, CARD_BACKS, STORE_FRAGMENT_COST, STORE_UPGRADE_COST,
  buyFragment, buyUpgrade, buySkin, buyBack, equipSkin, equipBack, RANK_TIERS,
  GAUNTLET_STOPS, ensureGauntletDay, recordGauntletResult, setAiDifficulty,
  msUntilNextNyMidnight, nyDateStr,
} from './profile.js';
import { UPGRADE_TO_BASE, upgradesForPatron } from './upgrades.js';
import { hostRoom, joinRoom } from './netplay.js';
import { setMusicEnabled, preferMusicFromStorage, warmMuted, playSfx } from './music.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let DATA = { cards: [], patrons: [], decks: [] };
let cardsById = {};
let patronsById = {};
let engine = null;
let ai = null;
let profile = null;
let pickYou = [];
let pickOpp = [];
let pickPhase = 'you';
let matchMode = 'ai'; // ai | ranked | hotseat | remote-host | remote-guest
let isRandomMatch = false;
let isRankedMatch = false;
let hourglassOn = false;
let hgRemaining = 90;
let hgTimer = null;
let net = null;
let lastRes = { you: {}, opp: {} };
let animating = false;
let tourStep = 0;
let tourActive = false;
let settingsReturnScreen = '#splash';
let liftActive = false;
let liftClone = null;
let liftFromRect = null;
let pendingPatron = null;
let gauntletStopIndex = null;
let isGauntletMatch = false;

const TURN_SECONDS = 90;
const TAP_MAX_MS = 350;
const HOLD_MS = 500;
const AGENT_SLOTS = 4;
const TOUR_KEY = 'tot_tour_v2';

/** Guided first-match walkthrough — plain language, one spotlight at a time. */
const TOUR_STEPS = [
  { sel: '#hand-zone', text: 'This is your hand. Tap a card to play it. Press and hold to lift the card and read it — release to put it back.' },
  { sel: '#tavern-zone', text: 'Coin buys from the tavern — the five cards in the middle. Tap one you can afford; it flies to your cooldown pile.' },
  { sel: '#you-res', text: 'Power fights enemy agents. Leftover Power becomes Prestige at end of turn — unless a Taunt agent is still standing in their way.' },
  { sel: '#pile-you-draw', text: 'Your draw pile is cards you have not seen yet. Bought cards wait in cooldown until the deck reshuffles — then they join your draw again.' },
  { sel: '#you-agents', text: 'Agents sit in these slots and stay until knocked out. Empty gold outlines show open Agent slots. Taunt agents must be hit first.' },
  { sel: '#tavern-zone', text: 'Contract cards are one-and-done — they exile after use (or when a contract agent is defeated). They do not come back through cooldown.' },
  { sel: '#patron-rail', text: 'Patron coins live on the right (plus Treasury). You get one patron call per turn — flip favor toward yourself.' },
  { sel: '#turn-ind', text: 'You win at 40 prestige if they cannot pass you on their last chance, at 80 outright, or by favoring all 4 patrons.' },
];

async function loadData() {
  const [c, p, d] = await Promise.all([
    fetch('data/cards.json').then(r => r.json()),
    fetch('data/patrons.json').then(r => r.json()),
    fetch('data/decks.json').then(r => r.json()),
  ]);
  const norm = normalizeCatalog(c, p, d);
  DATA.cards = norm.cards;
  DATA.patrons = norm.patrons;
  DATA.decks = norm.decks;
  cardsById = Object.fromEntries(DATA.cards.map(x => [x.id, x]));
  patronsById = Object.fromEntries(DATA.patrons.map(x => [x.id, x]));
}

function show(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $(id).classList.add('active');
}

function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

function artFor(card) {
  const slug = card.slug || nameSlug(card.name) || card.id;
  return `assets/cards/${slug}.png`;
}
function patronArt(id) {
  return `assets/patrons/${id}.png`;
}

function applyTableSkin() {
  const match = $('#match');
  if (!match || !profile) return;
  match.className = 'screen' + (match.classList.contains('active') ? ' active' : '');
  match.classList.add('skin-' + (profile.tableSkin || 'high-isle'));
  document.documentElement.style.setProperty('--back-hue',
    profile.cardBack === 'apocrypha' ? '#0a1810'
    : profile.cardBack === 'daedra' ? '#1a0808'
    : profile.cardBack === 'clockwork' ? '#1a1810'
    : profile.cardBack === 'vestige' ? '#101828'
    : '#1a1008');
  document.documentElement.style.setProperty('--back-accent',
    profile.cardBack === 'apocrypha' ? '#3a9050'
    : profile.cardBack === 'daedra' ? '#c44'
    : profile.cardBack === 'vestige' ? '#60a0ff'
    : '#d4af37');
}

function refreshSplashPurse() {
  const el = $('#splash-purse');
  if (!el || !profile) return;
  const r = profile.ranked || {};
  el.innerHTML = `
    <span>🪙 ${profile.gold}g</span>
    <span>👜 ${purseCount(profile)}</span>
    <span>🏅 ${r.tier || 'Unranked'}</span>
    <span>Wins ${profile.stats.wins}</span>
  `;
}

function syncHourglassUI() {
  const a = $('#chk-hourglass-splash');
  const b = $('#chk-hourglass-pick');
  if (a) a.checked = hourglassOn;
  if (b) b.checked = hourglassOn;
  const hg = $('#hourglass');
  if (hg) hg.dataset.on = hourglassOn ? '1' : '0';
  const btn = $('#btn-hg-toggle');
  if (btn) btn.textContent = hourglassOn ? '⌛ On' : '⌛';
}

function setHourglass(on) {
  hourglassOn = !!on;
  syncHourglassUI();
  if (!hourglassOn) stopHourglass();
  else if (engine && canControl() && !engine.state.winner) startHourglass();
}

function onSplashEnter() {
  profile = loadProfile();
  ensureDailyChallengeReset(profile);
  const daily = doDailyCheckIn(profile);
  if (daily) {
    profile = daily.profile;
    toast(daily.toast);
  }
  refreshSplashPurse();
  applyTableSkin();
  syncHourglassUI();
  show('#splash');
}

function botRevealAllowed() {
  // Coach mode: vs AI casual only — never ranked or friend play
  return matchMode === 'ai' && !!(profile && profile.showBotCards);
}

function typeLabel(d) {
  const bits = [];
  if (d.contract) bits.push('Contract');
  if (d.type === 'agent') bits.push('Agent');
  else if (d.type === 'action') bits.push('Action');
  else if (d.type) bits.push(d.type);
  return bits.join(' · ') || 'Card';
}

/**
 * Phone-first gestures:
 * - Short tap (<350ms, little movement) = PLAY/BUY via onTap. Never opens inspect.
 * - Press-and-hold (>=500ms): lift a floating clone from exact rect; pointerup animates back.
 * Hold never also plays.
 */
function bindCardGesture(el, { onTap, onHoldRead }) {
  let timer = null;
  let held = false;
  let sx = 0, sy = 0, t0 = 0;
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    held = false;
    sx = e.clientX; sy = e.clientY; t0 = performance.now();
    try { el.setPointerCapture(e.pointerId); } catch {}
    clear();
    timer = setTimeout(() => {
      held = true;
      timer = null;
      if (onHoldRead) onHoldRead(el);
    }, HOLD_MS);
  });
  el.addEventListener('pointermove', (e) => {
    if (!timer && !held) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 16) {
      clear();
      if (held) { /* keep lift until up */ }
    }
  });
  el.addEventListener('pointerup', (e) => {
    const wasHeld = held;
    const dt = performance.now() - t0;
    const moved = Math.hypot(e.clientX - sx, e.clientY - sy);
    clear();
    held = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}
    if (wasHeld || liftActive) {
      e.preventDefault();
      e.stopPropagation();
      endLift();
      return;
    }
    if (dt < TAP_MAX_MS && moved < 16 && onTap) onTap(e);
  });
  el.addEventListener('pointercancel', () => {
    clear();
    if (held || liftActive) endLift();
    held = false;
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

function startLift(fromEl, def) {
  endLift(true);
  if (!fromEl || !def) return;
  const rect = fromEl.getBoundingClientRect();
  if (!rect.width) return;
  liftActive = true;
  liftFromRect = rect;
  fromEl.classList.add('lift-source');
  fromEl.style.opacity = '0.25';
  const layer = $('#lift-layer') || document.body;
  const clone = document.createElement('div');
  clone.className = 'lift-clone';
  clone.style.left = rect.left + 'px';
  clone.style.top = rect.top + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  const bits = [];
  if (def.cost != null) bits.push('cost ' + def.cost);
  if (def.hp != null) bits.push('HP ' + def.hp);
  if (def.taunt) bits.push('Taunt');
  clone.innerHTML = `
    <img src="${artFor(def)}" alt="" draggable="false" />
    <div class="lift-meta"><strong>${def.name || ''}</strong>${typeLabel(def)}${bits.length ? ' · ' + bits.join(' · ') : ''}<br>${def.playText || ''}</div>
  `;
  layer.appendChild(clone);
  liftClone = clone;
  // Scale toward player (bottom of screen)
  requestAnimationFrame(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetW = Math.min(vw * 0.72, 220);
    const targetH = targetW * (rect.height / rect.width);
    const tx = (vw - targetW) / 2;
    const ty = Math.max(40, vh * 0.28 - targetH / 2);
    clone.animate([
      { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', transform: 'scale(1)' },
      { left: tx + 'px', top: ty + 'px', width: targetW + 'px', height: targetH + 'px', transform: 'scale(1.02)' },
    ], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  });
}

function endLift(instant = false) {
  const src = document.querySelector('.lift-source');
  const clone = liftClone;
  const rect = liftFromRect;
  liftActive = false;
  liftClone = null;
  liftFromRect = null;
  if (src) {
    src.classList.remove('lift-source');
    src.style.opacity = '';
  }
  if (!clone) return;
  if (instant || !rect) {
    clone.remove();
    return;
  }
  const cur = clone.getBoundingClientRect();
  const anim = clone.animate([
    { left: cur.left + 'px', top: cur.top + 'px', width: cur.width + 'px', height: cur.height + 'px' },
    { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' },
  ], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
  anim.onfinish = () => clone.remove();
  setTimeout(() => { if (clone.parentNode) clone.remove(); }, 320);
}

function renderCard(inst, opts = {}) {
  const d = cardsById[inst.id] || inst;
  const el = document.createElement('div');
  el.className = 'card' + (opts.extraClass ? ' ' + opts.extraClass : '');
  if (opts.affordable) el.classList.add('affordable');
  if (opts.playable) el.classList.add('playable');
  if (opts.deal) el.classList.add('deal-anim');
  el.dataset.uid = inst.uid || '';
  el.dataset.id = inst.id;
  const hp = inst.hp != null ? inst.hp : d.hp;
  el.innerHTML = `
    <img class="art" src="${artFor(d)}" alt="${d.name}" draggable="false" onerror="this.style.background='#2a1810'" />
    ${d.cost != null ? `<div class="cost-badge">${d.cost}</div>` : ''}
    ${hp != null ? `<div class="hp-badge">${hp}${d.taunt || inst.taunt ? ' T' : ''}</div>` : ''}
    ${(d.taunt || inst.taunt) ? `<div class="taunt-badge">TAUNT</div>` : ''}
    <div class="meta">
      <div class="cname">${d.name}</div>
      <div class="ctype">${typeLabel(d)}</div>
      <div class="ceffect">${d.playText || ''}</div>
    </div>
  `;
  if (d.contract) el.classList.add('contract-card');
  const holdRead = () => {
    if (opts.onHoldRead) opts.onHoldRead(inst, el);
    else startLift(el, d);
  };
  const tap = (ev) => {
    ev && ev.stopPropagation();
    if (opts.onTap) opts.onTap(inst, el);
    else if (opts.onClick) opts.onClick(inst, el);
  };
  bindCardGesture(el, { onTap: tap, onHoldRead: holdRead });
  return el;
}

function showInspect(d, fromEl) {
  // Legacy name — hold-to-read lift only (no dismiss-at-top overlay)
  if (fromEl) startLift(fromEl, d);
  else if (d) showCardModal(d);
}

function closeInspect() { endLift(); }

function unlockedPool() {
  return ALL_DECKS.filter(id => isDeckUnlocked(profile, id));
}

function shufflePick(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/* ——— Deck pick (tap toggle select/deselect) ——— */
function renderDeckPick() {
  const grid = $('#patron-grid');
  grid.innerHTML = '';
  const playable = DATA.patrons.filter(p => p.id !== 'treasury');
  // Stable order: starters first, then rest including Mora
  const order = [...STARTER_DECKS, ...LOCKED_DECKS];
  playable.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  for (const p of playable) {
    const unlocked = isDeckUnlocked(profile, p.id);
    const el = document.createElement('div');
    el.className = 'patron-card' + (unlocked ? '' : ' locked');
    if (pickYou.includes(p.id)) el.classList.add('selected');
    if (pickOpp.includes(p.id)) el.classList.add('selected-rival');
    const ab = p.abilities?.neutral || p.abilities?.favored || {};
    const frag = fragmentProgress(profile, p.id);
    const displayName = unlocked ? p.short : '???';
    el.innerHTML = `
      <img src="${patronArt(p.id)}" alt="${displayName}" style="${unlocked ? '' : 'filter:grayscale(0.85) brightness(0.65)'}" />
      <div class="name">${displayName}</div>
      <div class="desc">${unlocked ? (ab.desc || '') : 'Locked patron'}</div>
      ${!unlocked ? `<div class="frag">${frag}/${FRAGMENTS_TO_UNLOCK} fragments</div>` : ''}
    `;
    el.addEventListener('click', () => {
      // Always confirm via panel (Continue / Cancel) — no silent select/call
      openPatronConfirm(p.id, 'pick');
    });
    grid.appendChild(el);
  }
  updatePickStatus();
}

function onPatronTapConfirmed(p) { return onPatronTap(p); }
function onPatronTap(p) {
  const unlocked = isDeckUnlocked(profile, p.id);
  // Deselect if already yours
  if (pickYou.includes(p.id)) {
    pickYou = pickYou.filter(id => id !== p.id);
    pickPhase = pickYou.length < 2 ? 'you' : 'opp';
    updatePickStatus();
    renderDeckPick();
    return;
  }
  // Deselect if already rival's
  if (pickOpp.includes(p.id)) {
    pickOpp = pickOpp.filter(id => id !== p.id);
    pickPhase = pickYou.length < 2 ? 'you' : 'opp';
    updatePickStatus();
    renderDeckPick();
    return;
  }
  if (!unlocked) {
    toast(`${p.short} locked — ${fragmentProgress(profile, p.id)}/${FRAGMENTS_TO_UNLOCK} fragments`);
    return;
  }
  if (pickYou.length < 2) {
    pickYou.push(p.id);
    if (pickYou.length === 2) pickPhase = 'opp';
  } else if (pickOpp.length < 2) {
    pickOpp.push(p.id);
    pickPhase = 'opp';
  } else {
    toast('Both pairs filled — tap a selected patron to deselect.');
    return;
  }
  updatePickStatus();
  renderDeckPick();
}

function updatePickStatus() {
  $('#pick-status').textContent = `You ${pickYou.length}/2  ·  Rival ${pickOpp.length}/2`;
  $('#pick-you-count').textContent = `${pickYou.length} / 2`;
  $('#pick-opp-count').textContent = `${pickOpp.length} / 2`;
  const fillSlots = (elId, ids) => {
    const el = $(elId);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const s = document.createElement('div');
      s.className = 'pm-slot' + (ids[i] ? '' : ' empty');
      if (ids[i]) s.innerHTML = `<img src="${patronArt(ids[i])}" alt="" />`;
      el.appendChild(s);
    }
  };
  fillSlots('#pick-you-slots', pickYou);
  fillSlots('#pick-opp-slots', pickOpp);
  $('#btn-start').disabled = !(pickYou.length === 2 && pickOpp.length === 2);
  const hint = $('#deckpick-hint');
  if (hint) {
    if (pickYou.length < 2) hint.innerHTML = 'Tap to select, tap again to <strong>deselect</strong>. Choose <strong>two</strong> patrons for you.';
    else if (pickOpp.length < 2) hint.innerHTML = 'Now pick rival\'s pair — or tap <strong>AI takes the rest</strong>.';
    else hint.innerHTML = 'Ready. Begin Match, or deselect to change.';
  }
}

function aiPickOpponents(exclude) {
  const unlocked = unlockedPool().filter(id => !exclude.includes(id));
  const all = ALL_DECKS.filter(id => !exclude.includes(id));
  const pool = unlocked.length >= 2 ? unlocked : all;
  return shufflePick(pool, 2);
}

function startRandomMatch() {
  const pool = unlockedPool();
  if (pool.length < 2) { toast('Need at least 2 unlocked decks.'); return; }
  pickYou = shufflePick(pool, 2);
  const restAll = ALL_DECKS.filter(id => !pickYou.includes(id));
  pickOpp = shufflePick(restAll.length >= 2 ? restAll : pool.filter(id => !pickYou.includes(id)), 2);
  isRandomMatch = true;
  if ($('#chk-random-match')) $('#chk-random-match').checked = true;
  startMatch();
}

/* ——— Match helpers ——— */
function localSeat() {
  if (matchMode === 'hotseat') return engine.state.active;
  if (matchMode === 'remote-guest') return 1;
  return 0;
}

function canControl() {
  if (!engine?.state || engine.state.winner != null) return false;
  if (matchMode === 'ai' || matchMode === 'ranked') return engine.state.active === 0;
  if (matchMode === 'hotseat') return true;
  if (matchMode === 'remote-host') return engine.state.active === 0;
  if (matchMode === 'remote-guest') return engine.state.active === 1;
  return false;
}

function resHTML(pl, label, key) {
  const prev = lastRes[key] || {};
  const tick = (field, val) => {
    const changed = prev[field] != null && prev[field] !== val;
    return `<span class="num${changed ? ' tick' : ''}" data-f="${field}">${val}</span>`;
  };
  lastRes[key] = { coin: pl.coin, power: pl.power, prestige: pl.prestige };
  return `
    <span style="opacity:.7;margin-right:.25rem;font-size:.75rem">${label}</span>
    <span class="res" title="Coin"><span class="icon-disc coin">₵</span> ${tick('coin', pl.coin)}</span>
    <span class="res" title="Prestige"><span class="icon-disc prestige">♛</span> ${tick('prestige', pl.prestige)}</span>
    <span class="res" title="Power"><span class="icon-disc power">✊</span> ${tick('power', pl.power)}</span>
  `;
}

function flyCard(fromEl, toEl, cardInst, onDone) {
  if (!fromEl || !toEl) { onDone && onDone(); return; }
  const d = cardsById[cardInst?.id] || cardInst;
  const fr = fromEl.getBoundingClientRect();
  const tr = toEl.getBoundingClientRect();
  if (!fr.width || !tr.width) { onDone && onDone(); return; }
  const flyer = document.createElement('div');
  flyer.className = 'fly-card';
  flyer.style.width = fr.width + 'px';
  flyer.style.height = fr.height + 'px';
  flyer.style.left = fr.left + 'px';
  flyer.style.top = fr.top + 'px';
  if (d) {
    flyer.innerHTML = `<img src="${artFor(d)}" style="width:100%;height:100%;object-fit:cover;object-position:top" alt="" />`;
  } else {
    flyer.style.background = 'linear-gradient(160deg,#3a2818,#1a1008)';
  }
  document.body.appendChild(flyer);
  const dx = tr.left + tr.width / 2 - (fr.left + fr.width / 2);
  const dy = tr.top + tr.height / 2 - (fr.top + fr.height / 2);
  const anim = flyer.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(1.05)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(${Math.max(0.35, tr.width / fr.width)})`, opacity: 0.85 },
  ], { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
  anim.onfinish = () => { flyer.remove(); onDone && onDone(); };
  setTimeout(() => { if (flyer.parentNode) { flyer.remove(); onDone && onDone(); } }, 750);
}

function pileEl(which) {
  const map = {
    'you-cooldown': '#pile-you-cd',
    'you-draw': '#pile-you-draw',
    'you-played': '#pile-you-played',
    'opp-cooldown': '#pile-opp-cd',
    'opp-draw': '#pile-opp-draw',
    'opp-hand': '#pile-opp-hand',
    'tavern-discard': '#pile-tavern-discard',
    'hand': '#hand-zone',
    'tavern': '#tavern-zone',
    'played': '#you-played',
  };
  return $(map[which] || which);
}

function renderAgentRow(row, agents, { attackable = false, onAttack = null } = {}) {
  if (!row) return;
  row.innerHTML = '';
  const slots = Math.max(AGENT_SLOTS, agents.length);
  for (let i = 0; i < slots; i++) {
    const slot = document.createElement('div');
    slot.className = 'agent-slot' + (agents[i] ? ' filled' : ' empty');
    const a = agents[i];
    if (a) {
      slot.appendChild(renderCard(a, {
        extraClass: 'agent-board' + (a.taunt ? ' has-taunt' : ''),
        onTap: (_inst, el) => {
          if (attackable && onAttack) onAttack(a);
          else startLift(el, cardsById[a.id]);
        },
        onHoldRead: (_inst, el) => startLift(el, cardsById[a.id]),
      }));
    } else {
      slot.innerHTML = '<span class="slot-label">Agent</span>';
    }
    row.appendChild(slot);
  }
}

function renderMatch() {
  if (!engine?.state) return;
  const s = engine.state;
  const seat = localSeat();
  const you = s.players[seat];
  const opp = s.players[1 - seat];
  const youLabel = matchMode === 'hotseat' ? `P${seat + 1}` : 'You';
  const oppLabel = matchMode === 'hotseat' ? `P${2 - seat}` : 'Rival';
  $('#you-res').innerHTML = resHTML(you, youLabel, 'you');
  $('#opp-res').innerHTML = resHTML(opp, oppLabel, 'opp');

  const yourTurn = canControl();
  const turn = $('#turn-ind');
  turn.textContent = s.winner != null
    ? (s.winner === seat ? 'Victory' : 'Defeat')
    : (yourTurn ? (matchMode === 'hotseat' ? `Player ${seat + 1}` : 'Your turn') : (matchMode === 'ranked' || matchMode === 'ai' ? 'Rival thinking…' : 'Waiting…'));
  turn.classList.toggle('your-turn', yourTurn);

  // Pile counts
  $('#cnt-opp-hand').textContent = opp.hand.length;
  $('#cnt-opp-draw').textContent = opp.draw.length;
  $('#cnt-opp-cd').textContent = opp.cooldown.length;
  $('#cnt-you-draw').textContent = you.draw.length;
  $('#cnt-you-played').textContent = you.played.length;
  $('#cnt-you-cd').textContent = you.cooldown.length;
  $('#cnt-tavern-discard').textContent = s.tavernDiscard.length;

  // Patron rail: opp patrons TOP, treasury MIDDLE, your patrons BOTTOM
  const rail = $('#rail-patrons');
  rail.innerHTML = '';
  const youPats = you.patrons || [];
  const oppPats = opp.patrons || [];
  const makeCoin = (pid) => {
    const pat = patronsById[pid];
    if (!pat) return null;
    const f = s.favor[pid] || 0;
    const favYou = (seat === 0 && f === 1) || (seat === 1 && f === -1);
    const favOpp = (seat === 0 && f === -1) || (seat === 1 && f === 1);
    const el = document.createElement('div');
    el.className = 'patron-coin ' + (pid === 'treasury' ? 'treasury ' : '') +
      (favYou ? 'fav-you' : favOpp ? 'fav-opp' : 'neutral');
    if (yourTurn && engine.canCallPatron(pid)) el.classList.add('callable');
    el.innerHTML = `
      <div class="coin-ring"><img src="${patronArt(pid)}" alt="${pat.short}" /></div>
      <div class="plabel">${pat.short}</div>
    `;
    el.title = (pat.abilities?.neutral?.desc) || pat.name;
    el.addEventListener('click', () => {
      if (!canControl()) return;
      openPatronConfirm(pid, 'call');
    });
    return el;
  };
  const gOpp = document.createElement('div'); gOpp.className = 'rail-group rail-opp';
  for (const pid of oppPats) { const c = makeCoin(pid); if (c) gOpp.appendChild(c); }
  const gMid = document.createElement('div'); gMid.className = 'rail-group rail-mid';
  { const c = makeCoin('treasury'); if (c) gMid.appendChild(c); }
  const gYou = document.createElement('div'); gYou.className = 'rail-group rail-you';
  for (const pid of youPats) { const c = makeCoin(pid); if (c) gYou.appendChild(c); }
  rail.appendChild(gOpp); rail.appendChild(gMid); rail.appendChild(gYou);

  // Tavern — tap to buy if affordable; hold to inspect (never buys on hold)
  const tz = $('#tavern-zone');
  tz.innerHTML = '';
  s.tavern.forEach((c, i) => {
    const aff = yourTurn && engine.canBuy(i);
    tz.appendChild(renderCard(c, {
      affordable: aff,
      onTap: (inst, el) => {
        if (!canControl()) return;
        if (engine.canBuy(i)) {
          const dest = pileEl('you-cooldown');
          playSfx('buy');
          flyCard(el, dest, c, () => {});
          engine.buy(i);
          syncAction({ op: 'buy', i });
          afterPlayerAction();
        } else {
          toast(`Need ${cardsById[c.id]?.cost ?? '?'} coin`);
        }
      },
      onHoldRead: (_inst, el) => startLift(el, cardsById[c.id]),
    }));
  });

  // Agent rows — always show dashed/gold Agent slot outlines
  renderAgentRow($('#opp-agents'), opp.agents, {
    attackable: yourTurn,
    onAttack: (a) => {
      if (!canControl()) return;
      if (engine.knockoutWithPower(a.uid)) {
        syncAction({ op: 'knockout', uid: a.uid });
        afterPlayerAction();
      } else {
        toast('Need enough Power — and Taunt must be hit first');
      }
    },
  });
  renderAgentRow($('#you-agents'), you.agents, { attackable: false });

  // Played this turn
  const yp = $('#you-played');
  yp.innerHTML = '';
  you.played.forEach(c => {
    const def = cardsById[c.id];
    if (def?.type === 'agent') return; // agents live in agents row
    yp.appendChild(renderCard(c, {
      extraClass: 'played-card',
      onTap: (_i, el) => startLift(el, cardsById[c.id]),
      onHoldRead: (_i, el) => startLift(el, cardsById[c.id]),
    }));
  });

  // Hand — tap plays, hold lifts to read (hold never also plays)
  const hz = $('#hand-zone');
  hz.innerHTML = '';
  you.hand.forEach(c => {
    const def = cardsById[c.id];
    hz.appendChild(renderCard(c, {
      playable: yourTurn,
      deal: true,
      onTap: (inst, el) => {
        if (!canControl()) return;
        const isAgent = def?.type === 'agent';
        const isContract = !!def?.contract;
        const dest = isAgent
          ? ($('#you-agents') || pileEl('played'))
          : (pileEl('played') || pileEl('you-played'));
        if (isContract) { playSfx('contract'); flashVfx(el, 'contract'); }
        else if (isAgent) { playSfx('agent'); flashVfx(el, 'agent'); }
        else playSfx('play');
        flyCard(el, dest, c, () => {});
        engine.playCard(c.uid);
        syncAction({ op: 'play', uid: c.uid });
        afterPlayerAction();
      },
      onHoldRead: (_i, el) => startLift(el, def),
    }));
  });
  layoutFan(hz, false);

  // Rival fanned backs (top)
  const ohz = $('#opp-hand-zone');
  if (ohz) {
    ohz.innerHTML = '';
    const reveal = botRevealAllowed() || matchMode === 'hotseat';
    opp.hand.forEach((c) => {
      if (reveal) {
        const def = cardsById[c.id];
        ohz.appendChild(renderCard(c, {
          extraClass: 'rival-card',
          onTap: (_i, e) => startLift(e, def),
          onHoldRead: (_i, e) => startLift(e, def),
        }));
      } else {
        const el = document.createElement('div');
        el.className = 'card card-back-only';
        el.innerHTML = `<div class="art card-back-face" style="height:100%"></div>`;
        ohz.appendChild(el);
      }
    });
    layoutFan(ohz, true);
  }

  const dock = $('#log-dock');
  if (dock) dock.innerHTML = engine.log.slice(-12).map(l => l.msg).join('<br>');
}

function layoutFan(container, rival = false) {
  if (!container) return;
  const cards = [...container.children];
  const n = cards.length;
  if (!n) return;
  const spread = Math.min(52, 10 + n * 6);
  const start = -spread / 2;
  const step = n === 1 ? 0 : spread / (n - 1);
  const overlap = rival ? 18 : 22;
  cards.forEach((card, i) => {
    const rot = start + step * i;
    const x = (i - (n - 1) / 2) * overlap;
    const y = Math.abs(rot) * (rival ? 0.35 : 0.45);
    card.style.zIndex = String(i + 1);
    card.style.transform = `translate(calc(-50% + ${x}px), ${rival ? y : -y}px) rotate(${rot}deg)`;
  });
}

function flashVfx(fromEl, kind) {
  if (!fromEl) return;
  const r = fromEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'vfx-flash ' + kind;
  el.style.left = r.left + 'px';
  el.style.top = r.top + 'px';
  el.style.width = r.width + 'px';
  el.style.height = r.height + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

function openPatronConfirm(pid, mode = 'call') {
  const pat = patronsById[pid];
  if (!pat) return;
  const unlocked = pid === 'treasury' || isDeckUnlocked(profile, pid);
  const overlay = $('#patron-confirm-overlay');
  if (!overlay) return;
  pendingPatron = { pid, mode };
  const art = $('#pc-art');
  const name = $('#pc-name');
  const abil = $('#pc-ability');
  if (art) {
    art.src = patronArt(pid);
    art.style.filter = unlocked ? '' : 'grayscale(0.85) brightness(0.65)';
  }
  if (name) name.textContent = unlocked ? (pat.short || pat.name) : '???';
  const f = engine?.state?.favor?.[pid] || 0;
  const key = f === 1 ? 'favored' : f === -1 ? 'unfavored' : 'neutral';
  const desc = unlocked
    ? (pat.abilities?.[key]?.desc || pat.abilities?.neutral?.desc || pat.name || '')
    : 'This patron has not yet revealed their true name.';
  if (abil) abil.textContent = desc;
  overlay.classList.add('show');
}

function closePatronConfirm() {
  pendingPatron = null;
  $('#patron-confirm-overlay')?.classList.remove('show');
}

function confirmPatronContinue() {
  if (!pendingPatron) { closePatronConfirm(); return; }
  const { pid, mode } = pendingPatron;
  closePatronConfirm();
  if (mode === 'pick') {
    const pat = patronsById[pid];
    if (pat) onPatronTapConfirmed(pat);
    return;
  }
  if (!engine || !canControl()) return;
  if (engine.canCallPatron(pid)) {
    playSfx('patron');
    engine.callPatron(pid);
    syncAction({ op: 'patron', pid });
    afterPlayerAction();
  } else {
    toast('Cannot call that patron now');
  }
}

function afterPlayerAction() {
  renderMatch();
  if (engine.state.winner != null) { stopHourglass(); return; }
  if ((matchMode === 'ai' || matchMode === 'ranked') && engine.state.active === 1) {
    stopHourglass();
    maybeAI();
  } else if (canControl()) {
    // keep timer running
  }
}

function showCardModal(d) {
  if (!d) return;
  const m = $('#card-modal');
  $('#card-modal-body').innerHTML = `
    <img src="${artFor(d)}" alt="${d.name}" />
    <h3>${d.name}</h3>
    <p>${d.patron} · ${d.type}${d.contract ? ' · contract' : ''} · cost ${d.cost}${d.hp != null ? ' · HP ' + d.hp : ''}${d.taunt ? ' · Taunt' : ''}</p>
    <p><em>${d.playText || '—'}</em></p>
    ${d.combo2Text ? `<p>Combo 2: ${d.combo2Text}</p>` : ''}
    ${d.combo3Text ? `<p>Combo 3: ${d.combo3Text}</p>` : ''}
    ${d.combo4Text ? `<p>Combo 4: ${d.combo4Text}</p>` : ''}
    <button id="btn-modal-close">Close</button>
  `;
  m.classList.add('show');
  $('#btn-modal-close').onclick = () => m.classList.remove('show');
  m.onclick = (e) => { if (e.target === m) m.classList.remove('show'); };
}

function openPileModal(pileKey) {
  if (!engine?.state) return;
  const s = engine.state;
  const seat = localSeat();
  const you = s.players[seat];
  const opp = s.players[1 - seat];
  let cards = [];
  let title = 'Pile';
  if (pileKey === 'you-draw') { cards = you.draw; title = 'Your draw pile'; }
  else if (pileKey === 'you-cooldown') { cards = you.cooldown; title = 'Your cooldown'; }
  else if (pileKey === 'you-played') { cards = you.played; title = 'Played this turn'; }
  else if (pileKey === 'opp-draw') { cards = opp.draw; title = 'Rival draw'; }
  else if (pileKey === 'opp-cooldown') { cards = opp.cooldown; title = 'Rival cooldown'; }
  else if (pileKey === 'opp-hand') { cards = opp.hand; title = 'Rival hand'; }
  else if (pileKey === 'tavern-discard') { cards = s.tavernDiscard; title = 'Tavern discard'; }

  const grid = $('#pile-modal-grid');
  grid.innerHTML = '';
  // Rival hand/draw: card BACKS unless hotseat or vs-AI coach "Show bot cards".
  // Rival cooldown stays peekable (real table lets you look at piles).
  const secretPile = pileKey === 'opp-hand' || pileKey === 'opp-draw';
  const revealSecrets = matchMode === 'hotseat' || botRevealAllowed();
  const hideFaces = secretPile && !revealSecrets;
  if (hideFaces) {
    title += ' (backs only)';
  } else if (secretPile && botRevealAllowed()) {
    title += ' (coach reveal)';
  }

  if (!cards.length) {
    grid.innerHTML = '<p style="color:var(--ink-dim);text-align:center">Empty</p>';
  } else {
    for (const c of cards) {
      if (hideFaces) {
        const el = document.createElement('div');
        el.className = 'card card-back-only';
        el.innerHTML = `<div class="art card-back-face" style="height:100%"></div>`;
        grid.appendChild(el);
      } else {
        grid.appendChild(renderCard(c, {
          onTap: (_i, el) => startLift(el, cardsById[c.id]),
          onHoldRead: (_i, el) => startLift(el, cardsById[c.id]),
        }));
      }
    }
  }
  $('#pile-modal-title').textContent = title;
  $('#pile-overlay').classList.add('show');
}

/* ——— Hourglass ——— */
function stopHourglass() {
  if (hgTimer) { clearInterval(hgTimer); hgTimer = null; }
  const top = $('#hg-sand-top');
  const bot = $('#hg-sand-bot');
  if (!hourglassOn) {
    $('#hg-time').textContent = '—';
    $('#hourglass')?.classList.remove('urgent');
  }
}

function startHourglass() {
  stopHourglass();
  if (!hourglassOn) {
    $('#hg-time').textContent = '—';
    $('#hourglass').dataset.on = '0';
    return;
  }
  $('#hourglass').dataset.on = '1';
  hgRemaining = TURN_SECONDS;
  const tick = () => {
    const pct = hgRemaining / TURN_SECONDS;
    const topH = Math.max(0, 22 * pct);
    const botH = Math.max(0, 22 * (1 - pct));
    const top = $('#hg-sand-top');
    const bot = $('#hg-sand-bot');
    if (top) { top.setAttribute('height', String(topH)); top.setAttribute('y', String(6 + (22 - topH))); }
    if (bot) { bot.setAttribute('height', String(botH)); bot.setAttribute('y', String(58 - botH)); }
    $('#hg-time').textContent = String(Math.ceil(hgRemaining));
    $('#hourglass').classList.toggle('urgent', hgRemaining <= 10);
    if (hgRemaining <= 0) {
      stopHourglass();
      autoEndTurn();
      return;
    }
    hgRemaining -= 0.25;
  };
  tick();
  hgTimer = setInterval(tick, 250);
}

async function autoEndTurn() {
  if (!engine || !canControl() || engine.state.winner) return;
  toast('Hourglass empty — turn ends.');
  await doEndTurn();
}

/* ——— Match lifecycle ——— */
function syncAction(msg) {
  if (net?.ok) net.send({ type: 'action', ...msg });
}

function applyRemoteAction(msg) {
  if (!engine) return;
  if (msg.op === 'play') engine.playCard(msg.uid);
  else if (msg.op === 'buy') engine.buy(msg.i);
  else if (msg.op === 'patron') engine.callPatron(msg.pid);
  else if (msg.op === 'knockout') engine.knockoutWithPower(msg.uid);
  else if (msg.op === 'end') engine.endTurn();
  renderMatch();
}

function startMatch(opts = {}) {
  engine = new GameEngine(cardsById, patronsById);
  const diff = opts.difficulty != null ? opts.difficulty
    : (isGauntletMatch && gauntletStopIndex != null ? GAUNTLET_STOPS[gauntletStopIndex].difficulty
    : (profile?.aiDifficulty || 5));
  ai = (matchMode === 'ai' || matchMode === 'ranked' || isGauntletMatch)
    ? new TributeAI(engine, isRankedMatch ? Math.max(diff, 7) : diff)
    : null;
  engine.on((ev, data) => {
    if (ev === 'combo') { flashCombo(data.n); playSfx('combo'); }
    if (ev === 'win') { stopHourglass(); playSfx('win'); showWin(data); }
    if (ev === 'buy') playSfx('coin');
    if (ev === 'patron') playSfx('patron');
    if (ev === 'agentEnter') { playSfx('agent'); }
    if (ev === 'prestige') playSfx('coin');
    if (ev === 'aiAction') handleAiActionAnim(data);
    if (ev === 'state' && !liftActive && engine?.state?.active === 1 &&
        (matchMode === 'ai' || matchMode === 'ranked' || isGauntletMatch)) {
      // Refresh board between AI moves so flies remain readable
      renderMatch();
    }
  });
  const owned = profile?.ownedUpgrades || [];
  engine.newMatch({
    playerPatrons: pickYou,
    aiPatrons: pickOpp,
    playerFirst: opts.playerFirst !== false,
    ownedUpgrades: owned,
  });
  applyTableSkin();
  lastRes = { you: {}, opp: {} };
  show('#match');
  renderMatch();
  if (!localStorage.getItem(TOUR_KEY) && matchMode === 'ai') {
    setTimeout(() => startTour(), 350);
  }
  if (hourglassOn && canControl()) startHourglass();
  else syncHourglassUI();
  if ((matchMode === 'ai' || matchMode === 'ranked') && engine.state.active === 1) maybeAI();
}

function flashCombo(n) {
  const el = document.createElement('div');
  el.className = 'combo-flash';
  el.textContent = `COMBO ${n}`;
  $('#match').appendChild(el);
  setTimeout(() => el.remove(), 850);
}

function showWin(data) {
  stopHourglass();
  const seat = localSeat();
  let rewardLine = '';
  let purseNote = '';

  if (matchMode !== 'remote-guest' || true) {
    if (matchMode === 'hotseat') {
      const r = recordMatchResult(profile, { won: engine.state.winner === 0, isRandom: isRandomMatch, ranked: false });
      rewardLine = `+${r.gold}g`;
      if (r.purse) purseNote = ` · ${r.purse.rarity} cutpurse`;
    } else if (matchMode === 'remote-host' || matchMode === 'remote-guest') {
      const won = (matchMode === 'remote-host' && engine.state.winner === 0) ||
                  (matchMode === 'remote-guest' && engine.state.winner === 1);
      const r = recordMatchResult(profile, { won, isRandom: false, ranked: false });
      rewardLine = `+${r.gold}g`;
      if (r.purse) purseNote = ` · ${r.purse.rarity} cutpurse`;
    } else if (isGauntletMatch && gauntletStopIndex != null) {
      const awardWin = engine.state.winner === 0;
      const g = recordGauntletResult(profile, { stopIndex: gauntletStopIndex, won: awardWin });
      if (awardWin) {
        rewardLine = `Province secured · +${g.gold || 0}g`;
        purseNote = g.complete ? ' · Road complete!' : ' · next stop unlocked';
      } else {
        rewardLine = "Today's road ends here";
        const ms = g.retryInMs || msUntilNextNyMidnight();
        purseNote = ` · retry in ${fmtCountdown(ms)}`;
      }
      // still record a casual match for stats
      recordMatchResult(profile, { won: awardWin, isRandom: false, ranked: false });
    } else {
      const awardWin = engine.state.winner === 0;
      const r = recordMatchResult(profile, { won: awardWin, isRandom: isRandomMatch, ranked: isRankedMatch });
      rewardLine = `+${r.gold}g`;
      if (r.purse) purseNote = ` · ${r.purse.rarity} cutpurse`;
      if (isRankedMatch && r.ranked) {
        rewardLine += ` · ${r.ranked.tier} (${r.ranked.points} pts)`;
      }
    }
    saveProfile(profile);
  }

  const title = matchMode === 'hotseat'
    ? `Player ${engine.state.winner + 1} wins`
    : (engine.state.winner === (matchMode === 'remote-guest' ? 1 : 0) ? 'Victory' : 'Defeat');

  $('#win-banner').innerHTML = `
    ${title}<br>
    <span style="font-size:.45em;color:#c4b39a">${reasonText(data.reason)}</span><br>
    <span style="font-size:.4em;color:#d4af37">${rewardLine}${purseNote}</span><br>
    <button class="primary" id="btn-again">Continue</button>
    ${purseCount(profile) > 0 ? '<button id="btn-win-purse">Open Cutpurse</button>' : ''}`;
  $('#win-overlay').classList.add('show');
  setTimeout(() => {
    $('#btn-again')?.addEventListener('click', () => {
      $('#win-overlay').classList.remove('show');
      const wasGauntlet = isGauntletMatch;
      isRandomMatch = false;
      isRankedMatch = false;
      isGauntletMatch = false;
      gauntletStopIndex = null;
      if (net) { try { net.destroy(); } catch {} net = null; }
      if (wasGauntlet) openGauntlet();
      else onSplashEnter();
    });
    $('#btn-win-purse')?.addEventListener('click', () => {
      $('#win-overlay').classList.remove('show');
      doOpenPurse(false);
    });
  }, 50);
}

function reasonText(r) {
  if (r === '80') return 'Eighty prestige — the table is yours.';
  if (r === '40-hold') return 'Forty held. The rival could not surpass you.';
  if (r === 'patrons') return 'All four patrons favored your cause.';
  if (r === 'concede') return 'Left the table.';
  return 'The match is decided.';
}

async function maybeAI() {
  if (!engine || !ai || engine.state.winner != null) return;
  if (engine.state.active === 1) {
    await ai.takeTurn(ai.actionDelay());
    renderMatch();
    if (engine.state.active === 1 && engine.state.winner == null) {
      await maybeAI();
    } else if (engine.state.active === 0 && hourglassOn && !engine.state.winner) {
      startHourglass();
    }
  }
}

/** Visualize AI plays/buys flying from rival fan / tavern. */
function handleAiActionAnim(action) {
  if (!action) return;
  try {
    if (action.type === 'play') {
      const from = $('#opp-hand-zone')?.querySelector('.card') || $('#pile-opp-hand');
      const def = cardsById[action.cardId];
      const isAgent = def?.type === 'agent';
      const isContract = !!def?.contract;
      const dest = isAgent ? $('#opp-agents') : pileEl('opp-cooldown');
      if (isContract) { playSfx('contract'); flashVfx(from, 'contract'); }
      else if (isAgent) { playSfx('agent'); flashVfx(from, 'agent'); }
      else playSfx('play');
      flyCard(from, dest || $('#opp-agents'), { id: action.cardId }, () => {});
    } else if (action.type === 'buy') {
      const tz = $('#tavern-zone');
      const from = tz?.children[action.index] || tz;
      playSfx('buy');
      flyCard(from, pileEl('opp-cooldown'), { id: action.cardId }, () => {});
    } else if (action.type === 'patron') {
      playSfx('patron');
    }
  } catch {}
}

async function doEndTurn() {
  if (!engine || !canControl() || engine.state.winner) return;
  // Fly played cards to cooldown
  const playedEls = $$('#you-played .card');
  const dest = pileEl('you-cooldown');
  for (const el of playedEls) {
    const id = el.dataset.id;
    flyCard(el, dest, { id }, () => {});
  }
  stopHourglass();
  engine.endTurn();
  syncAction({ op: 'end' });
  renderMatch();
  if (matchMode === 'hotseat' && engine.state.winner == null) {
    $('#hand-device-overlay').classList.add('show');
  }
  if (matchMode === 'ai' || matchMode === 'ranked') {
    await maybeAI();
    renderMatch();
  }
}

function startTour(force = false) {
  if (!force && localStorage.getItem(TOUR_KEY)) return;
  tourStep = 0;
  tourActive = true;
  const root = $('#tour-root');
  if (root) root.hidden = false;
  showTourStep();
}

function endTour() {
  tourActive = false;
  const root = $('#tour-root');
  if (root) root.hidden = true;
  $('#tour-hole')?.classList.remove('show');
  localStorage.setItem(TOUR_KEY, '1');
}

function showTourStep() {
  const root = $('#tour-root');
  const panel = $('#tour-panel');
  const hole = $('#tour-hole');
  if (!root || !panel) return;
  if (tourStep >= TOUR_STEPS.length) {
    endTour();
    return;
  }
  const step = TOUR_STEPS[tourStep];
  $('#tour-text').textContent = step.text;
  $('#tour-step').textContent = `${tourStep + 1} / ${TOUR_STEPS.length}`;
  root.hidden = false;

  // Spotlight target
  const target = step.sel ? document.querySelector(step.sel) : null;
  if (target && hole) {
    const r = target.getBoundingClientRect();
    const pad = 8;
    hole.style.left = Math.max(4, r.left - pad) + 'px';
    hole.style.top = Math.max(4, r.top - pad) + 'px';
    hole.style.width = Math.min(window.innerWidth - 8, r.width + pad * 2) + 'px';
    hole.style.height = Math.min(window.innerHeight - 8, r.height + pad * 2) + 'px';
    hole.classList.add('show');
    // Place panel opposite the spotlight when possible
    const spaceBelow = window.innerHeight - (r.bottom + 12);
    if (spaceBelow > 160) {
      panel.style.top = (r.bottom + 12) + 'px';
      panel.style.bottom = 'auto';
    } else {
      panel.style.bottom = Math.max(12, window.innerHeight - r.top + 12) + 'px';
      panel.style.top = 'auto';
    }
    panel.style.left = '50%';
    panel.style.transform = 'translateX(-50%)';
  } else if (hole) {
    hole.classList.remove('show');
    panel.style.top = 'auto';
    panel.style.bottom = '24px';
    panel.style.left = '50%';
    panel.style.transform = 'translateX(-50%)';
  }
}

function nextTourStep() {
  tourStep += 1;
  showTourStep();
}

/* ——— Settings ——— */
function openSettings(from = '#splash') {
  settingsReturnScreen = from;
  profile = loadProfile();
  renderSettings();
  show('#settings');
}

function renderSettings() {
  profile = loadProfile();
  const music = $('#chk-settings-music');
  const hg = $('#chk-settings-hourglass');
  const bot = $('#chk-settings-botcards');
  if (music) music.checked = preferMusicFromStorage();
  if (hg) hg.checked = !!profile.hourglassDefault;
  if (bot) bot.checked = !!profile.showBotCards;
  mountDiffSlider('#diff-slider-settings', '#diff-val-settings');
  paintDiffAll();
  // Show-bot only meaningful for AI; still listed with note
  const row = $('#row-show-bot');
  if (row) row.classList.toggle('dim', false);

  const skins = $('#settings-skins');
  if (skins) {
    skins.innerHTML = '';
    for (const s of TABLE_SKINS) {
      const owned = profile.unlockedSkins.includes(s.id);
      const eq = profile.tableSkin === s.id;
      const el = document.createElement('div');
      el.className = 'store-item' + (owned ? ' owned' : ' locked') + (eq ? ' equipped' : '');
      el.innerHTML = `
        <div class="skin-swatch ${s.id}"></div>
        <h4>${s.name}</h4>
        <p>${s.desc}</p>
        <div class="price">${owned ? (eq ? 'Equipped' : 'Owned') : `🔒 ${s.price}g`}</div>
        <button type="button">${owned ? (eq ? 'Equipped' : 'Equip') : 'Buy & equip'}</button>
      `;
      el.querySelector('button').onclick = () => {
        const res = owned ? equipSkin(profile, s.id) : buySkin(profile, s.id);
        if (res.error) toast(res.error);
        else { toast(owned ? `Equipped ${s.name}` : `Bought ${s.name}`); applyTableSkin(); renderSettings(); refreshSplashPurse(); }
      };
      skins.appendChild(el);
    }
  }

  const backs = $('#settings-backs');
  if (backs) {
    backs.innerHTML = '';
    for (const b of CARD_BACKS) {
      const owned = profile.unlockedBacks.includes(b.id);
      const eq = profile.cardBack === b.id;
      const el = document.createElement('div');
      el.className = 'store-item' + (owned ? ' owned' : ' locked') + (eq ? ' equipped' : '');
      el.innerHTML = `
        <div class="back-swatch back-${b.id}"></div>
        <h4>${b.name}</h4>
        <p>${b.desc}</p>
        <div class="price">${owned ? (eq ? 'Equipped' : 'Owned') : `🔒 ${b.price}g`}</div>
        <button type="button">${owned ? (eq ? 'Equipped' : 'Equip') : 'Buy & equip'}</button>
      `;
      el.querySelector('button').onclick = () => {
        const res = owned ? equipBack(profile, b.id) : buyBack(profile, b.id);
        if (res.error) toast(res.error);
        else { toast(owned ? `Equipped ${b.name}` : `Bought ${b.name}`); applyTableSkin(); renderSettings(); refreshSplashPurse(); }
      };
      backs.appendChild(el);
    }
  }
}

function leaveSettings() {
  const dest = settingsReturnScreen || '#splash';
  if (dest === '#match' && engine?.state) {
    applyTableSkin();
    show('#match');
    renderMatch();
  } else if (dest === '#club') {
    renderClub();
    show('#club');
  } else {
    onSplashEnter();
  }
}

/* ——— Club / Store / Collection ——— */
function renderClub() {
  profile = loadProfile();
  ensureDailyChallengeReset(profile);
  const r = profile.ranked || {};
  $('#club-stats').innerHTML = `
    <div class="club-stat"><div class="label">Purse gold</div><div class="val">${profile.gold}</div></div>
    <div class="club-stat"><div class="label">Cutpurses</div><div class="val">${purseCount(profile)}</div></div>
    <div class="club-stat"><div class="label">Check-in</div><div class="val">${profile.checkInStreak || 0}d</div></div>
    <div class="club-stat"><div class="label">Win streak</div><div class="val">${profile.winStreak || 0}</div></div>
    <div class="club-stat"><div class="label">Record</div><div class="val">${profile.stats.wins}–${profile.stats.losses}</div></div>
    <div class="club-stat"><div class="label">Decks</div><div class="val">${profile.unlockedDecks.length}/12</div></div>
  `;
  $('#club-ranked').innerHTML = `
    <div class="ach-row">
      <div class="ach-info">
        <strong>${r.tier || 'Unranked'}</strong>
        <span>${r.points || 0} pts · placement left ${r.placementLeft ?? 5} · ranked streak ${r.winStreak || 0}</span>
      </div>
      <button id="btn-club-ranked">Queue Ranked</button>
    </div>
  `;
  $('#btn-club-ranked')?.addEventListener('click', beginRanked);

  const dw = profile.challenges.dailyWin;
  $('#club-daily').innerHTML = `
    <div class="ach-row ${dw.progress >= dw.target && !dw.claimed ? 'claimable' : ''}">
      <div class="ach-info">
        <strong>Win ${dw.target} matches today</strong>
        <span>${dw.progress}/${dw.target}${dw.claimed ? ' · claimed' : ''}</span>
      </div>
      <button id="btn-claim-daily" ${dw.progress >= dw.target && !dw.claimed ? '' : 'disabled'}>Claim purse</button>
    </div>
  `;
  $('#btn-claim-daily')?.addEventListener('click', () => {
    const res = claimDailyChallenge(profile);
    if (res) { toast('Daily claimed — +1 Fine cutpurse'); renderClub(); }
  });

  const list = $('#club-achievements');
  list.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const unlocked = !!profile.achievements[a.id];
    const claimed = !!profile.achievements[`claimed_${a.id}`];
    const row = document.createElement('div');
    row.className = 'ach-row' + (unlocked ? '' : ' locked') + (unlocked && !claimed ? ' claimable' : '');
    const rewardBits = [];
    if (a.reward.gold) rewardBits.push(`${a.reward.gold}g`);
    if (a.reward.purses || a.reward.sacks) rewardBits.push(`${a.reward.purses || a.reward.sacks} purse`);
    row.innerHTML = `
      <div class="ach-info">
        <strong>${a.name}</strong>
        <span>${a.desc} · ${rewardBits.join(', ')}${claimed ? ' · claimed' : unlocked ? '' : ' · locked'}</span>
      </div>
      <button data-ach="${a.id}" ${unlocked && !claimed ? '' : 'disabled'}>${claimed ? 'Claimed' : 'Claim'}</button>
    `;
    row.querySelector('button')?.addEventListener('click', () => {
      const res = claimAchievement(profile, a.id);
      if (res) { toast(`Claimed ${a.name}`); renderClub(); }
    });
    list.appendChild(row);
  }
}

function renderStore() {
  profile = loadProfile();
  $('#store-gold').textContent = `${profile.gold}g`;
  const skins = $('#store-skins');
  skins.innerHTML = '';
  for (const s of TABLE_SKINS) {
    const owned = profile.unlockedSkins.includes(s.id);
    const eq = profile.tableSkin === s.id;
    const el = document.createElement('div');
    el.className = 'store-item' + (owned ? ' owned' : '') + (eq ? ' equipped' : '');
    el.innerHTML = `
      <div class="skin-swatch ${s.id}"></div>
      <h4>${s.name}</h4>
      <p>${s.desc}</p>
      <div class="price">${owned ? (eq ? 'Equipped' : 'Owned') : s.price + 'g'}</div>
      <button data-skin="${s.id}">${owned ? (eq ? 'Equipped' : 'Equip') : 'Buy'}</button>
    `;
    el.querySelector('button').onclick = () => {
      const res = owned ? equipSkin(profile, s.id) : buySkin(profile, s.id);
      if (res.error) toast(res.error);
      else { toast(owned ? `Equipped ${s.name}` : `Bought ${s.name}`); applyTableSkin(); renderStore(); refreshSplashPurse(); }
    };
    skins.appendChild(el);
  }

  const backs = $('#store-backs');
  backs.innerHTML = '';
  for (const b of CARD_BACKS) {
    const owned = profile.unlockedBacks.includes(b.id);
    const eq = profile.cardBack === b.id;
    const el = document.createElement('div');
    el.className = 'store-item' + (owned ? ' owned' : '') + (eq ? ' equipped' : '');
    el.innerHTML = `
      <h4>${b.name}</h4>
      <p>${b.desc}</p>
      <div class="price">${owned ? (eq ? 'Equipped' : 'Owned') : b.price + 'g'}</div>
      <button data-back="${b.id}">${owned ? (eq ? 'Equipped' : 'Equip') : 'Buy'}</button>
    `;
    el.querySelector('button').onclick = () => {
      const res = owned ? equipBack(profile, b.id) : buyBack(profile, b.id);
      if (res.error) toast(res.error);
      else { toast(owned ? `Equipped ${b.name}` : `Bought ${b.name}`); applyTableSkin(); renderStore(); }
    };
    backs.appendChild(el);
  }

  const frags = $('#store-frags');
  frags.innerHTML = '';
  for (const id of LOCKED_DECKS) {
    const unlocked = isDeckUnlocked(profile, id);
    const frag = fragmentProgress(profile, id);
    const p = patronsById[id];
    const el = document.createElement('div');
    el.className = 'store-item' + (unlocked ? ' owned' : '');
    el.innerHTML = `
      <img src="${patronArt(id)}" alt="" style="width:56px;height:56px;border-radius:50%;border:2px solid var(--gold-dim)" />
      <h4>${p?.short || id}</h4>
      <p>${unlocked ? 'Unlocked' : `${frag}/${FRAGMENTS_TO_UNLOCK} fragments`}</p>
      <div class="price">${unlocked ? '—' : STORE_FRAGMENT_COST + 'g'}</div>
      <button ${unlocked ? 'disabled' : ''}>Buy fragment</button>
    `;
    el.querySelector('button').onclick = () => {
      const res = buyFragment(profile, id);
      if (res.error) toast(res.error);
      else toast(res.unlocked ? `Unlocked ${p.short}!` : `Fragment ${frag + 1}/${FRAGMENTS_TO_UNLOCK}`);
      renderStore(); refreshSplashPurse();
    };
    frags.appendChild(el);
  }

  const ups = $('#store-upgrades');
  ups.innerHTML = '';
  const candidates = [];
  for (const deck of profile.unlockedDecks) {
    for (const uid of upgradesForPatron(DATA.cards, deck)) {
      if (!profile.ownedUpgrades.includes(uid)) candidates.push(uid);
    }
  }
  if (!candidates.length) {
    ups.innerHTML = '<p class="hint">All available upgrades owned — unlock more decks.</p>';
  } else {
    for (const uid of candidates.slice(0, 24)) {
      const c = cardsById[uid];
      if (!c) continue;
      const el = document.createElement('div');
      el.className = 'store-item';
      el.innerHTML = `
        <img src="${artFor(c)}" alt="" style="width:64px;height:90px;object-fit:cover;border-radius:4px;border:1px solid var(--gold-dim)" />
        <h4>${c.name}</h4>
        <p>${c.patron}</p>
        <div class="price">${STORE_UPGRADE_COST}g</div>
        <button>Buy</button>
      `;
      el.querySelector('button').onclick = () => {
        const res = buyUpgrade(profile, uid, DATA.cards);
        if (res.error) toast(res.error);
        else { toast(`Upgrade owned: ${c.name}`); renderStore(); refreshSplashPurse(); }
      };
      ups.appendChild(el);
    }
  }
}

function renderCollection() {
  const grid = $('#collection-grid');
  grid.innerHTML = '';
  $('#collection-detail').classList.add('hidden');
  for (const id of ALL_DECKS) {
    const p = patronsById[id];
    if (!p) continue;
    const unlocked = isDeckUnlocked(profile, id);
    const el = document.createElement('div');
    el.className = 'patron-card' + (unlocked ? '' : ' locked');
    const frag = fragmentProgress(profile, id);
    const ups = upgradesForPatron(DATA.cards, id);
    const owned = ups.filter(u => profile.ownedUpgrades.includes(u)).length;
    el.innerHTML = `
      <img src="${patronArt(id)}" alt="${p.short}" />
      <div class="name">${p.short}</div>
      <div class="desc">${unlocked ? `Upgrades ${owned}/${ups.length}` : `Fragments ${frag}/${FRAGMENTS_TO_UNLOCK}`}</div>
    `;
    el.addEventListener('click', () => showCollectionDeck(id));
    grid.appendChild(el);
  }
}

function showCollectionDeck(deckId) {
  const p = patronsById[deckId];
  const detail = $('#collection-detail');
  detail.classList.remove('hidden');
  const unlocked = isDeckUnlocked(profile, deckId);
  const cards = DATA.cards.filter(c => c.patron === deckId && !c.token && !c.curse);
  let html = `<h3>${p.name}</h3><p>${unlocked ? 'Unlocked' : `Locked — ${fragmentProgress(profile, deckId)}/${FRAGMENTS_TO_UNLOCK} fragments`}</p><div class="collection-cards">`;
  for (const c of cards) {
    const isUp = (c.baseQty || 0) === 0 && (c.upgradedQty || 0) > 0;
    const owned = !isUp || profile.ownedUpgrades.includes(c.id);
    const cls = isUp ? (owned ? 'upgrade-owned' : 'upgrade-locked') : '';
    html += `<div class="coll-card ${cls}">
      <img src="${artFor(c)}" alt="${c.name}" />
      <div class="tag">${c.name}${isUp ? (owned ? ' ▲ owned' : ' ▲ locked') : ''}</div>
    </div>`;
  }
  html += '</div>';
  detail.innerHTML = html;
}

function doOpenPurse(buy) {
  profile = loadProfile();
  let result = openPurse(profile, DATA.cards, { buy: !!buy && profile.purses.length <= 0 });
  if (result.error) {
    if (profile.purses.length <= 0 && profile.gold >= SACK_BUY_COST) {
      result = openPurse(profile, DATA.cards, { buy: true });
      if (result.error) { toast(result.error); return; }
    } else { toast(result.error); return; }
  }
  showPurseReward(result.reward, result.rarity);
}

function showPurseReward(reward, rarity) {
  const overlay = $('#sack-overlay');
  const anim = $('#sack-anim');
  const box = $('#sack-reward');
  $('#sack-rarity').textContent = rarity || reward.rarity || 'Common';
  anim.classList.remove('sack-anim');
  void anim.offsetWidth;
  anim.classList.add('sack-anim');
  let img = '';
  if (reward.id && cardsById[reward.id]) img = `<img src="${artFor(cardsById[reward.id])}" alt="" />`;
  else if (reward.upgrade && cardsById[reward.upgrade]) img = `<img src="${artFor(cardsById[reward.upgrade])}" alt="" />`;
  else if (reward.deck && patronsById[reward.deck]) img = `<img src="${patronArt(reward.deck)}" alt="" style="width:80px;border-radius:50%" />`;
  else if (reward.type === 'skin') img = `<div class="skin-swatch ${reward.id}" style="width:120px;margin:0.5rem auto"></div>`;
  box.innerHTML = `${img}<div>${reward.label}</div>${reward.note ? `<div style="font-size:.8em;opacity:.7">${reward.note}</div>` : ''}`;
  overlay.classList.add('show');
}

function renderEncy() {
  const sel = $('#ency-patron');
  if (!sel.options.length) {
    sel.innerHTML = `<option value="">All patrons</option>` +
      DATA.patrons.map(p => `<option value="${p.id}">${p.short}</option>`).join('');
  }
  const q = ($('#ency-search').value || '').toLowerCase();
  const pid = sel.value;
  const grid = $('#ency-grid');
  grid.innerHTML = '';
  const list = DATA.cards.filter(c => {
    if (pid && c.patron !== pid) return false;
    if (q && !c.name.toLowerCase().includes(q) && !(c.playText || '').toLowerCase().includes(q)) return false;
    return true;
  });
  for (const c of list) {
    const deckLocked = c.patron !== 'treasury' && !isDeckUnlocked(profile, c.patron);
    const el = document.createElement('div');
    el.className = 'ency-card' + (deckLocked ? ' deck-locked' : '');
    el.innerHTML = `<img src="${artFor(c)}" alt="${c.name}" /><div class="info"><strong>${c.name}</strong>${c.cost} · ${c.type}${c.upgraded ? ' · ▲' : ''}</div>`;
    el.addEventListener('click', () => showCardModal(c));
    grid.appendChild(el);
  }
}

/* ——— Modes ——— */
function beginDeckPick(mode) {
  matchMode = mode;
  pickYou = []; pickOpp = []; pickPhase = 'you';
  isRandomMatch = false;
  isRankedMatch = mode === 'ranked';
  isGauntletMatch = false;
  gauntletStopIndex = null;
  if (mode === 'ranked') setHourglass(true);
  if ($('#chk-random-match')) $('#chk-random-match').checked = false;
  renderDeckPick();
  mountDiffSlider('#diff-slider-pick', '#diff-val-pick');
  paintDiffAll();
  const wrap = $('#diff-pick-wrap');
  if (wrap) wrap.style.display = (mode === 'ai' || mode === 'ranked') ? '' : 'none';
  show('#deckpick');
}

function beginRanked() {
  beginDeckPick('ranked');
  toast('Ranked — 90s hourglass on. Stronger pace. Win streak raises cutpurse rarity.');
}

function beginHotseatPick() {
  matchMode = 'hotseat';
  pickYou = []; pickOpp = []; pickPhase = 'you';
  isRandomMatch = false;
  isRankedMatch = false;
  renderDeckPick();
  show('#deckpick');
  toast('Pass & Play: both players use host unlocks.');
}

async function beginHostRoom() {
  const status = $('#friend-status');
  status.textContent = 'Starting PeerJS room…';
  net = await hostRoom();
  if (!net.ok) {
    status.textContent = `Remote unavailable: ${net.error}. Use Pass & Play.`;
    toast(net.error);
    return;
  }
  status.innerHTML = `Room code: <strong style="letter-spacing:.2em">${net.code}</strong> — waiting for guest…`;
  matchMode = 'remote-host';
  isRankedMatch = false;
  net.onMessage((msg) => {
    if (msg.type === 'peer-ready' || msg.type === 'hello') {
      status.textContent = `Guest joined room ${net.code}. Pick decks, then Begin.`;
    }
    if (msg.type === 'action') applyRemoteAction(msg);
    if (msg.type === 'request-state' && engine) {
      net.send({ type: 'state-seed', pickYou, pickOpp, ownedUpgrades: profile.ownedUpgrades });
    }
  });
  pickYou = []; pickOpp = []; pickPhase = 'you';
  renderDeckPick();
  show('#deckpick');
}

async function beginJoinRoom() {
  const code = ($('#join-code').value || '').trim().toUpperCase();
  if (code.length < 4) { toast('Enter a 4-letter room code'); return; }
  const status = $('#friend-status');
  status.textContent = `Joining ${code}…`;
  net = await joinRoom(code);
  if (!net.ok) {
    status.textContent = `Join failed: ${net.error}`;
    toast(net.error);
    return;
  }
  matchMode = 'remote-guest';
  status.textContent = `Connected to ${code}. Waiting for host to start…`;
  net.send({ type: 'hello' });
  net.onMessage((msg) => {
    if (msg.type === 'match-start') {
      pickYou = msg.pickYou;
      pickOpp = msg.pickOpp;
      profile = loadProfile();
      engine = new GameEngine(cardsById, patronsById);
      engine.on((ev, data) => {
        if (ev === 'combo') flashCombo(data.n);
        if (ev === 'win') showWin(data);
      });
      engine.newMatch({
        playerPatrons: pickYou,
        aiPatrons: pickOpp,
        playerFirst: true,
        ownedUpgrades: msg.ownedUpgrades || [],
      });
      applyTableSkin();
      show('#match');
      renderMatch();
    }
    if (msg.type === 'action') applyRemoteAction(msg);
  });
}

async function updateMusicBtn() {
  const btn = $('#btn-music');
  if (!btn) return;
  const on = preferMusicFromStorage();
  btn.textContent = on ? '♪ Music: On' : '♪ Music: Off';
  btn.classList.toggle('on', on);
}


function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function mountDiffSlider(rootId, valId) {
  const root = $(rootId);
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  root.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const d = document.createElement('div');
    d.className = 'diff-dot';
    d.dataset.n = String(i);
    root.appendChild(d);
  }
  const paint = (n) => {
    root.querySelectorAll('.diff-dot').forEach((dot) => {
      dot.classList.toggle('on', Number(dot.dataset.n) <= n);
    });
    root.setAttribute('aria-valuenow', String(n));
    const lab = $(valId);
    if (lab) lab.textContent = String(n);
  };
  const fromX = (clientX) => {
    const r = root.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return Math.max(1, Math.min(10, Math.round(pct * 9) + 1));
  };
  const apply = (n) => {
    profile = loadProfile();
    setAiDifficulty(profile, n);
    profile = loadProfile();
    paint(profile.aiDifficulty || n);
    // sync other sliders
    paintDiffAll();
  };
  let dragging = false;
  root.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { root.setPointerCapture(e.pointerId); } catch {}
    apply(fromX(e.clientX));
  });
  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    apply(fromX(e.clientX));
  });
  root.addEventListener('pointerup', () => { dragging = false; });
  root.addEventListener('pointercancel', () => { dragging = false; });
  paint(profile?.aiDifficulty || 5);
}

function paintDiffAll() {
  const n = profile?.aiDifficulty || 5;
  for (const id of ['#diff-slider-settings', '#diff-slider-pick']) {
    const root = $(id);
    if (!root) continue;
    root.querySelectorAll('.diff-dot').forEach((dot) => {
      dot.classList.toggle('on', Number(dot.dataset.n) <= n);
    });
    root.setAttribute('aria-valuenow', String(n));
  }
  const a = $('#diff-val-settings'); if (a) a.textContent = String(n);
  const b = $('#diff-val-pick'); if (b) b.textContent = String(n);
}

function openGauntlet() {
  profile = loadProfile();
  ensureGauntletDay(profile);
  renderGauntlet();
  show('#gauntlet');
}

const GAUNTLET_POS = [
  { x: 24, y: 30 }, { x: 30, y: 36 }, { x: 36, y: 28 }, { x: 32, y: 46 }, { x: 26, y: 56 },
  { x: 44, y: 60 }, { x: 50, y: 70 }, { x: 64, y: 56 }, { x: 58, y: 30 }, { x: 80, y: 38 },
];

function renderGauntlet() {
  profile = loadProfile();
  const g = ensureGauntletDay(profile);
  const markers = $('#gauntlet-markers');
  if (!markers) return;
  markers.innerHTML = '';
  GAUNTLET_STOPS.forEach((stop, i) => {
    const pos = GAUNTLET_POS[i] || { x: 10 + i * 8, y: 50 };
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'g-marker';
    el.style.left = pos.x + '%';
    el.style.top = pos.y + '%';
    el.textContent = String(stop.difficulty);
    el.title = `${stop.name} · diff ${stop.difficulty}`;
    if (g.failed && g.failedStop === i) el.classList.add('failed');
    else if (i < g.cleared) el.classList.add('cleared');
    else if (i === g.cleared && !g.failed) el.classList.add('current');
    else el.classList.add('locked');
    el.addEventListener('click', () => {
      if (i === g.cleared && !g.failed) startGauntletStop(i);
      else if (g.failed) toast("Today's run is over — returns at midnight EST");
      else if (i < g.cleared) toast(`${stop.name} already cleared today`);
      else toast('Clear earlier stops first');
    });
    markers.appendChild(el);
  });
  const st = $('#gauntlet-status');
  const btn = $('#btn-gauntlet-play');
  if (g.failed) {
    const ms = msUntilNextNyMidnight();
    if (st) st.textContent = `Run failed at stop ${(g.failedStop ?? 0) + 1}. Next road opens in ${fmtCountdown(ms)} (America/New_York midnight).`;
    if (btn) btn.disabled = true;
  } else if (g.cleared >= GAUNTLET_STOPS.length) {
    if (st) st.textContent = 'All ten provinces bowed today. Return tomorrow for a fresh road.';
    if (btn) btn.disabled = true;
  } else {
    const next = GAUNTLET_STOPS[g.cleared];
    if (st) st.textContent = `Next: ${next.name} (${next.region}) — difficulty ${next.difficulty}. Patrons locked to the scripted pair.`;
    if (btn) {
      btn.disabled = false;
      btn.textContent = `Play ${next.name}`;
    }
  }
}

function startGauntletStop(index) {
  const stop = GAUNTLET_STOPS[index];
  if (!stop) return;
  profile = loadProfile();
  const g = ensureGauntletDay(profile);
  if (g.failed || index !== g.cleared) return;
  isGauntletMatch = true;
  isRankedMatch = false;
  isRandomMatch = false;
  gauntletStopIndex = index;
  matchMode = 'ai';
  pickYou = [...stop.you];
  pickOpp = [...stop.opp];
  setHourglass(false);
  // Temporarily boost difficulty for this match via opts
  startMatch({ difficulty: stop.difficulty });
}

/* ——— Wire ——— */
function bind() {
  $('#btn-play').onclick = () => {
    setHourglass($('#chk-hourglass-splash')?.checked || !!profile?.hourglassDefault);
    beginDeckPick('ai');
  };
  $('#btn-gauntlet')?.addEventListener('click', () => openGauntlet());
  $('#btn-gauntlet-back')?.addEventListener('click', () => onSplashEnter());
  $('#btn-gauntlet-play')?.addEventListener('click', () => {
    profile = loadProfile();
    const g = ensureGauntletDay(profile);
    if (!g.failed && g.cleared < GAUNTLET_STOPS.length) startGauntletStop(g.cleared);
  });
  $('#btn-ranked').onclick = beginRanked;
  $('#btn-friend').onclick = () => { $('#friend-status').textContent = ''; show('#friend-lobby'); };
  $('#btn-club').onclick = () => { renderClub(); show('#club'); };
  $('#btn-ency').onclick = () => { renderEncy(); show('#encyclopedia'); };
  $('#btn-settings').onclick = () => openSettings('#splash');
  $('#btn-settings-back').onclick = () => leaveSettings();
  $('#btn-match-settings')?.addEventListener('click', () => openSettings('#match'));
  $('#btn-ency-back').onclick = () => onSplashEnter();
  $('#btn-back-splash').onclick = () => onSplashEnter();
  $('#btn-club-back').onclick = () => onSplashEnter();
  $('#btn-friend-back').onclick = () => onSplashEnter();
  $('#btn-collection').onclick = () => { renderCollection(); show('#collection'); };
  $('#btn-collection-back').onclick = () => { renderClub(); show('#club'); };
  $('#btn-store').onclick = () => { renderStore(); show('#store'); };
  $('#btn-store-back').onclick = () => { renderClub(); show('#club'); };
  $('#ency-patron').onchange = renderEncy;
  $('#ency-search').oninput = renderEncy;

  $('#chk-hourglass-splash')?.addEventListener('change', (e) => setHourglass(e.target.checked));
  $('#chk-hourglass-pick')?.addEventListener('change', (e) => setHourglass(e.target.checked));

  $('#btn-music').onclick = async () => {
    warmMuted();
    const next = !preferMusicFromStorage();
    await setMusicEnabled(next);
    updateMusicBtn();
  };

  $('#btn-hotseat').onclick = beginHotseatPick;
  $('#btn-host-room').onclick = beginHostRoom;
  $('#btn-join-room').onclick = beginJoinRoom;

  $('#btn-open-sack').onclick = () => doOpenPurse(false);
  $('#btn-buy-sack').onclick = () => {
    profile = loadProfile();
    if (profile.purses.length > 0) { doOpenPurse(false); return; }
    const r = buySack(profile);
    if (r.error) { toast(r.error); return; }
    toast('Purse purchased');
    doOpenPurse(false);
  };
  $('#btn-sack-close').onclick = () => {
    $('#sack-overlay').classList.remove('show');
    if ($('#club').classList.contains('active')) renderClub();
    refreshSplashPurse();
  };

  $('#btn-ai-rest').onclick = () => {
    while (pickYou.length < 2) {
      const pool = unlockedPool().filter(id => !pickYou.includes(id) && !pickOpp.includes(id));
      if (!pool.length) break;
      pickYou.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    pickPhase = 'opp';
    const opp = aiPickOpponents([...pickYou, ...pickOpp]);
    for (const id of opp) {
      if (pickOpp.length >= 2) break;
      if (!pickOpp.includes(id)) pickOpp.push(id);
    }
    renderDeckPick();
    updatePickStatus();
  };

  $('#btn-random-match').onclick = () => {
    matchMode = isRankedMatch ? 'ranked' : 'ai';
    startRandomMatch();
  };

  $('#btn-start').onclick = () => {
    if ($('#chk-random-match')?.checked) isRandomMatch = true;
    if ($('#chk-hourglass-pick')?.checked) setHourglass(true);
    if (matchMode === 'remote-host' && net?.ok) {
      net.send({
        type: 'match-start',
        pickYou,
        pickOpp,
        ownedUpgrades: profile.ownedUpgrades || [],
      });
    }
    startMatch();
  };

  $('#btn-end').onclick = () => doEndTurn();
  $('#btn-hg-toggle').onclick = () => setHourglass(!hourglassOn);
  $('#btn-hand-done').onclick = () => {
    $('#hand-device-overlay').classList.remove('show');
    renderMatch();
    if (hourglassOn) startHourglass();
  };

  $('#btn-concede').onclick = () => {
    if (!engine) return;
    if (matchMode === 'ai' || matchMode === 'ranked') engine.state.winner = 1;
    else if (matchMode === 'hotseat') engine.state.winner = 1 - engine.state.active;
    else if (matchMode === 'remote-host') engine.state.winner = 1;
    else if (matchMode === 'remote-guest') engine.state.winner = 0;
    showWin({ reason: 'concede' });
  };

  $('#tour-next')?.addEventListener('click', () => nextTourStep());
  $('#tour-skip')?.addEventListener('click', () => endTour());

  $('#btn-pile-close').onclick = () => $('#pile-overlay').classList.remove('show');
  $('#pile-overlay').onclick = (e) => { if (e.target.id === 'pile-overlay') e.target.classList.remove('show'); };

  $('#pc-continue')?.addEventListener('click', () => confirmPatronContinue());
  $('#pc-cancel')?.addEventListener('click', () => closePatronConfirm());
  $('#patron-confirm-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'patron-confirm-overlay') closePatronConfirm();
  });

  // Settings toggles
  $('#chk-settings-music')?.addEventListener('change', async (e) => {
    warmMuted();
    await setMusicEnabled(!!e.target.checked);
    updateMusicBtn();
  });
  $('#chk-settings-hourglass')?.addEventListener('change', (e) => {
    profile = loadProfile();
    profile.hourglassDefault = !!e.target.checked;
    saveProfile(profile);
    setHourglass(profile.hourglassDefault);
    const splash = $('#chk-hourglass-splash');
    if (splash) splash.checked = profile.hourglassDefault;
  });
  $('#chk-settings-botcards')?.addEventListener('change', (e) => {
    profile = loadProfile();
    profile.showBotCards = !!e.target.checked;
    saveProfile(profile);
    toast(profile.showBotCards ? 'Bot cards visible in vs AI (coach)' : 'Bot cards hidden');
  });
  $('#btn-replay-tour')?.addEventListener('click', () => {
    localStorage.removeItem(TOUR_KEY);
    const returnTo = settingsReturnScreen;
    leaveSettings();
    if (returnTo === '#match' && engine?.state) {
      setTimeout(() => startTour(true), 200);
    } else {
      toast('Tour will play on your next vs AI match.');
    }
  });

  $$('.pile-btn').forEach(btn => {
    btn.addEventListener('click', () => openPileModal(btn.dataset.pile));
  });
}

loadData().then(() => {
  profile = loadProfile();
  hourglassOn = !!profile.hourglassDefault;
  bind();
  mountDiffSlider('#diff-slider-settings', '#diff-val-settings');
  mountDiffSlider('#diff-slider-pick', '#diff-val-pick');
  paintDiffAll();
  warmMuted();
  updateMusicBtn();
  if (preferMusicFromStorage()) setMusicEnabled(true);
  onSplashEnter();
}).catch(err => {
  console.error(err);
  const sub = $('#splash .subtitle');
  if (sub) sub.textContent = 'Failed to load card data: ' + err;
});
