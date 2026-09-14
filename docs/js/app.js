import { GameEngine } from './engine.js';
import { TributeAI } from './ai.js';
import { normalizeCatalog, nameSlug } from './normalize.js';
import {
  loadProfile, saveProfile, canClaimDailyLogin, claimDailyLogin, ensureDailyChallengeReset,
  recordMatchResult, claimMatchReward, openCrownCrate, claimAchievement, claimDailyChallenge,
  isDeckUnlocked, fragmentProgress, ACHIEVEMENTS, STARTER_DECKS, LOCKED_DECKS,
  ALL_DECKS, FRAGMENTS_TO_UNLOCK, purseCount,
  TABLE_SKINS, CARD_BACKS, CARD_BACK_PALETTE,
  buyShopOffer, equipSkin, equipBack, RANK_TIERS,
  GAUNTLET_STOPS, ensureGauntletDay, recordGauntletResult, setAiDifficulty,
  gauntletCooldownMs, todaysFeatured, roadCrossing, WATER_ZONES,
  msUntilNextNyMidnight, nyDateStr,
  ensureClubMeta, currentShop, claimWeeklyGoal, claimSeasonalGoal, claimSeasonComplete,
  discoverCards, noteClubEvent, deckReadyToUnlock, roadGrandPrizePreview,
} from './profile.js';
import { UPGRADE_TO_BASE, upgradesForPatron } from './upgrades.js';
import {
  formatRarity, rarityOf, priceOf, CLUES_TO_UPGRADE, DECK_IMPORTANCE, DECK_CAPTIONS,
  DECK_COLORS, FALLBACK_PATRONS, canonPatron, groupCardsByDeck,
  currentSeason, nextSeason, msUntilShopRefresh, msUntilWeeklyReset,
  loginMonthGrid, clueCountOf, countClues, deckCardSet, weeklyKey,
  isOfferSoldOut, crateVariantForDay, CRATES_PER_MONTH, resolveCrateVariant,
} from './economy.js';
import { hostRoom, joinRoom } from './netplay.js';
import { setMusicEnabled, preferMusicFromStorage, warmMuted, playSfx, setMusicCue, setSfxStyle, getSfxStyle, setSfxEnabled, preferSfxFromStorage, isSfxOn } from './music.js';
import { applyOfficialPatronText, applyOfficialCardText, cardPlayLines, cardComboLines } from './texts.js';
import { overlayOfficialCardText, overlayOfficialPatronText } from './officialText.js';

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
let matchMode = 'ai'; // ai | hotseat | remote-host | remote-guest
let rankedPeerPicks = [];
let storeReturnScreen = '#splash';
let pendingWinLeave = null;
let pendingCrate = null;
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
let targetSession = null;
let gauntletStopIndex = null;
let isGauntletMatch = false;

const TURN_SECONDS = 90;
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

function polishCardCopy(card) {
  const next = { ...card };
  const play = cardPlayLines(next);
  if (play.length) next.playText = play.join(' ');
  for (const n of [2, 3, 4]) {
    const lines = cardComboLines(next, n);
    if (lines.length) next[`combo${n}Text`] = lines.join(' ');
  }
  return next;
}

function matchIsLive() {
  return !!(engine?.state && $('#match')?.classList.contains('active'));
}

async function loadData() {
  const [c, p, d] = await Promise.all([
    fetch('data/cards.json').then(r => r.json()),
    fetch('data/patrons.json').then(r => r.json()),
    fetch('data/decks.json').then(r => r.json()),
  ]);
  const norm = normalizeCatalog(c, p, d);
  applyOfficialCardText(norm.cards);
  applyOfficialPatronText(norm.patrons);
  try {
    const [cu, pu] = await Promise.all([
      fetch('data/cards.uesp.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('data/patrons.uesp.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (cu) overlayOfficialCardText(norm.cards, cu);
    if (pu) overlayOfficialPatronText(norm.patrons, pu);
  } catch { /* optional local UESP dump */ }
  DATA.cards = norm.cards.map((c) => polishCardCopy({ ...c, patron: canonPatron(c.patron) }));
  DATA.patrons = (norm.patrons || []).map((p) => ({ ...p, id: canonPatron(p.id) }));
  DATA.decks = (norm.decks || []).map((d) => ({ ...d, id: canonPatron(d.id) }));
  patronsById = Object.fromEntries(DATA.patrons.map(x => [x.id, x]));
  for (const id of DECK_IMPORTANCE) {
    if (!patronsById[id]) {
      const fb = FALLBACK_PATRONS[id] || { id, name: id, short: id, color: DECK_COLORS[id] || '#c9a227' };
      DATA.patrons.push(fb);
      patronsById[id] = fb;
    }
  }
  cardsById = Object.fromEntries(DATA.cards.map(x => [x.id, x]));
}

function show(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $(id).classList.add('active');
  requestAnimationFrame(() => syncBoardLayout());
}

function isPortrait() {
  const vv = window.visualViewport;
  const w = vv?.width || window.innerWidth;
  const h = vv?.height || window.innerHeight;
  return h > w;
}

function isNativeShell() {
  try {
    const q = new URLSearchParams(location.search);
    return q.get('native') === '1' || q.has('native');
  } catch {
    return false;
  }
}

function applyNativeShell() {
  const on = isNativeShell();
  document.documentElement.classList.toggle('is-native', on);
  document.body.classList.toggle('is-native', on);
  return on;
}

function syncBoardLayout() {
  const match = $('#match');
  const matchOn = !!match?.classList.contains('active');
  const portrait = isPortrait();
  const native = applyNativeShell();
  document.body.classList.toggle('is-portrait', matchOn && portrait);
  document.body.classList.toggle('is-landscape', matchOn && !portrait);
  document.body.classList.remove('need-landscape');
  const tip = $('#landscape-tip');
  if (tip) tip.hidden = native || !(matchOn && portrait);
  const board = match?.querySelector('.board');
  if (!board || !matchOn) return;
  board.style.width = '100%';
  board.style.height = '100%';
  board.style.maxWidth = 'none';
  board.style.transform = 'none';
}

let lastToast = '';
function toast(msg) {
  lastToast = String(msg || '');
  const el = $('#toast');
  if (!el) return;
  el.textContent = lastToast;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

function artFor(card) {
  const slug = card.slug || nameSlug(card.name) || card.id;
  return `assets/cards/${slug}.png`;
}
function patronArt(id) {
  const pid = canonPatron(id);
  return `assets/patrons/${pid}.png`;
}

function patronRecord(id) {
  const pid = canonPatron(id);
  return patronsById[pid] || FALLBACK_PATRONS[pid] || {
    id: pid,
    name: pid === 'mora' ? 'Hermaeus Mora' : pid,
    short: pid === 'mora' ? 'Mora' : pid,
    color: DECK_COLORS[pid] || '#c9a227',
  };
}

function patronNeverTips(pat, pid) {
  return !!(pat?.alwaysNeutral || pat?.abilities?.alwaysNeutral || pid === 'treasury' || pid === 'mora');
}

/** Ornate pewter gothic medallion. Tip = favor. Treasury + Mora stay circular. */
function medallionMarkup(pid, pat, short, favorWord) {
  const uid = `med-${pid}`;
  const field = pat?.color || '#6b1218';
  const art = patronArt(pid);
  const title = `${favorWord} — ${pat?.name || short}`;
  const neverTurn = patronNeverTips(pat, pid);
  const pew = `
    <linearGradient id="${uid}-pew" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f2e8"/>
      <stop offset="18%" stop-color="#d8d2c6"/>
      <stop offset="40%" stop-color="#9a9488"/>
      <stop offset="62%" stop-color="#ece6da"/>
      <stop offset="82%" stop-color="#6e685c"/>
      <stop offset="100%" stop-color="#3a362e"/>
    </linearGradient>
    <radialGradient id="${uid}-hi" cx="32%" cy="28%">
      <stop offset="0%" stop-color="#fffaf0" stop-opacity=".7"/>
      <stop offset="100%" stop-color="#fffaf0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${uid}-fld" cx="38%" cy="30%">
      <stop offset="0%" stop-color="#9a2434"/>
      <stop offset="100%" stop-color="${field}"/>
    </radialGradient>`;
  if (neverTurn) {
    return `
      <div class="token-dial medallion tipless" title="${title}">
        <svg class="medallion-svg" viewBox="0 0 100 100" aria-hidden="true">
          <defs>${pew}</defs>
          <circle cx="50" cy="50" r="47.5" fill="url(#${uid}-pew)" stroke="#2a261e" stroke-width="1.5"/>
          <circle cx="50" cy="50" r="41" fill="none" stroke="#1c1812" stroke-width="2.1"/>
          <circle cx="50" cy="50" r="39.2" fill="none" stroke="#efe8da" stroke-width="1.15" opacity=".8"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#6a6458" stroke-width="2.6" stroke-dasharray="3.5 2.2"/>
          <circle cx="50" cy="50" r="34.5" fill="url(#${uid}-fld)"/>
          <circle cx="50" cy="50" r="47.5" fill="url(#${uid}-hi)" pointer-events="none"/>
        </svg>
        <span class="coin-ring medallion-face"><img src="${art}" alt="${short}" draggable="false" /></span>
      </div>
      <span class="plabel">${short}</span>`;
  }
  return `
    <div class="token-dial medallion" title="${title}">
      <svg class="medallion-svg" viewBox="0 0 100 128" aria-hidden="true">
        <defs>${pew}</defs>
        <path class="token-point medallion-body" fill="url(#${uid}-pew)" stroke="#2a261e" stroke-width="1.5"
          d="M50 2 C59 18, 78 34, 88 54 A 45 45 0 1 1 12 54 C22 34, 41 18, 50 2 Z"/>
        <circle cx="50" cy="78" r="41.5" fill="none" stroke="#1c1812" stroke-width="2.2"/>
        <circle cx="50" cy="78" r="39.6" fill="none" stroke="#efe8da" stroke-width="1.2" opacity=".82"/>
        <circle cx="50" cy="78" r="40.4" fill="none" stroke="#6a6458" stroke-width="2.7" stroke-dasharray="3.6 2.3"/>
        <circle cx="50" cy="78" r="34.5" fill="url(#${uid}-fld)"/>
        <circle cx="50" cy="78" r="41.5" fill="url(#${uid}-hi)" pointer-events="none"/>
      </svg>
      <span class="coin-ring medallion-face"><img src="${art}" alt="${short}" draggable="false" /></span>
    </div>
    <span class="plabel">${short}</span>`;
}

function applyTableSkin() {
  if (!profile) return;
  const id = profile.tableSkin || 'high-isle';
  [...document.body.classList].filter(c => c.startsWith('skin-')).forEach(c => document.body.classList.remove(c));
  document.body.classList.add('skin-' + id);
  const match = $('#match');
  if (match) {
    match.className = 'screen' + (match.classList.contains('active') ? ' active' : '');
    match.classList.add('skin-' + id);
  }
  const pal = CARD_BACK_PALETTE[profile.cardBack] || CARD_BACK_PALETTE.default;
  document.documentElement.style.setProperty('--back-hue', pal[0]);
  document.documentElement.style.setProperty('--back-accent', pal[1]);
}

function goldCoinHtml(extra = '') {
  return `<span class="gold-coin" title="Gold" ${extra}></span>`;
}

function refreshSplashPurse() {
  const el = $('#splash-purse');
  if (!el || !profile) return;
  const r = profile.ranked || {};
  el.innerHTML = `
    <span>${goldCoinHtml()} ${profile.gold}g</span>
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
}

function setHourglass(on) {
  hourglassOn = !!on;
  syncHourglassUI();
  if (!hourglassOn) stopHourglass();
  else if (engine && canControl() && !engine.state.winner) startHourglass();
}

function onSplashEnter() {
  profile = loadProfile();
  ensureClubMeta(profile, DATA.cards || []);
  ensureDailyChallengeReset(profile);
  refreshSplashPurse();
  const stamp = document.getElementById('build-stamp');
  if (stamp) stamp.textContent = 'build 38';
  applyTableSkin();
  syncHourglassUI();
  setMusicCue('tavern');
  show('#splash');
  if (canClaimDailyLogin(profile)) openLoginGreet();
  else if (profile.pendingCrate) openCrateCeremony(profile.pendingCrate);
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

function dossierKind(d) {
  if (d.contract && d.type === 'agent') return 'Contract Agent';
  if (d.contract) return 'Contract Action';
  if (d.type === 'agent') return 'Agent';
  return 'Action';
}

function effectBullets(src) {
  const parts = Array.isArray(src)
    ? src.map((s) => String(s || '').trim()).filter(Boolean)
    : String(src || '').split(/[;\n]|(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '<li>—</li>';
  return parts.map((s) => {
    let cls = '';
    if (/setback/i.test(s)) cls = 'setback';
    else if (/power/i.test(s)) cls = 'power';
    else if (/prestige/i.test(s)) cls = 'prestige';
    else if (/coin/i.test(s)) cls = 'coin';
    const line = s.endsWith('.') ? s : s + '.';
    return `<li class="${cls}">${line}</li>`;
  }).join('');
}

function dossierHTML(d) {
  const pat = patronsById[d.patron];
  const patronName = pat?.name || d.patron || '';
  const icon = d.patron ? patronArt(d.patron) : '';
  const playLines = cardPlayLines(d);
  const combos = [2, 3, 4].map((n) => {
    const lines = cardComboLines(d, n);
    return lines.length ? [`COMBO ${n}`, lines] : null;
  }).filter(Boolean);
  return `
    <div class="eso-tip">
      <div class="eso-tip-head">
        <div class="eso-tip-left">
          <div class="eso-tip-kicker">Tribute Card</div>
          <div class="eso-tip-type">${dossierKind(d)}</div>
        </div>
        <div class="eso-tip-patron">
          ${icon ? `<img src="${icon}" alt="" />` : ''}
          <span>${patronName}</span>
        </div>
      </div>
      <h2 class="eso-tip-name">${(d.name || '').toUpperCase()}</h2>
      ${d.cost != null ? `<div class="eso-tip-cost">COIN COST <b>${d.cost}</b></div>` : ''}
      <div class="eso-tip-block dossier-block">
        <div class="eso-tip-h dossier-h">PLAY EFFECT</div>
        <ul>${effectBullets(playLines)}</ul>
      </div>
      ${combos.map(([h, lines]) => `<div class="eso-tip-block dossier-block"><div class="eso-tip-h dossier-h">${h}</div><ul>${effectBullets(lines)}</ul></div>`).join('')}
      ${d.hp != null ? `<div class="eso-tip-block dossier-block"><div class="eso-tip-h dossier-h">HEALTH</div><ul><li>${d.hp}${d.taunt ? ' · Taunt' : ''}</li></ul></div>` : ''}
      ${d.hp == null && d.taunt ? `<div class="eso-tip-block dossier-block"><div class="eso-tip-h dossier-h">TAUNT</div><ul><li>This Agent has Taunt.</li></ul></div>` : ''}
    </div>`;
}

/**
 * Phone-first gestures:
 * - Any press that is NOT a hold = play / buy / claim (onTap).
 * - Hold (>=520ms, little movement): lift-to-read; release returns the card.
 * There is no dead zone between tap and hold.
 */
function bindCardGesture(el, { onTap, onHoldRead }) {
  // Pointer-only: a short tap plays/buys. Hold (>=500ms) inspects and never also plays.
  // Do not bind touchstart+pointerdown together — iOS leaks the first timer and inspects after a tap.
  let held = false;
  let cancelledTap = false;
  let timer = null;
  let t0 = 0;
  let sx = 0;
  let sy = 0;
  let pid = null;
  const clearHold = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pid != null) return;
    pid = e.pointerId;
    held = false;
    cancelledTap = false;
    t0 = Date.now();
    sx = e.clientX;
    sy = e.clientY;
    try { el.setPointerCapture(e.pointerId); } catch {}
    clearHold();
    timer = setTimeout(() => {
      held = true;
      if (onHoldRead) onHoldRead();
    }, HOLD_MS);
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 14) clearHold();
  });
  const finish = (e) => {
    if (pid == null || e.pointerId !== pid) return;
    const wasHeld = held;
    clearHold();
    pid = null;
    const elapsed = t0 ? Date.now() - t0 : 0;
    t0 = 0;
    if (wasHeld) {
      endLift();
      held = false;
      cancelledTap = false;
      return;
    }
    if (liftActive) endLift(true);
    held = false;
    if (elapsed < HOLD_MS && onTap) onTap(e);
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', (e) => {
    if (pid == null || e.pointerId !== pid) return;
    const wasHeld = held;
    clearHold();
    pid = null;
    t0 = 0;
    if (wasHeld) {
      endLift();
      cancelledTap = false;
    } else {
      cancelledTap = true;
    }
    held = false;
  });
  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cancelledTap && onTap) {
      cancelledTap = false;
      onTap(e);
    }
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

function inspectMetrics(kind) {
  const vv = window.visualViewport;
  const vw = Math.floor(Math.min(window.innerWidth, vv?.width || window.innerWidth));
  const vh = Math.floor(Math.min(window.innerHeight, vv?.height || window.innerHeight));
  const pad = 14;
  const gap = 12;
  const land = vw > vh;
  const isCoin = kind === 'coin';
  const aspect = isCoin ? 1 : 1.54;

  if (land) {
    const tipMin = isCoin ? 200 : 196;
    const tipMax = 360;
    let hexW = Math.min(vw * 0.32, isCoin ? 140 : 220, (vh - pad * 2) / aspect);
    let hexH = hexW * aspect;
    if (hexH > vh - pad * 2) {
      hexH = vh - pad * 2;
      hexW = hexH / aspect;
    }
    let tipW = Math.min(tipMax, vw - pad * 2 - hexW - gap);
    if (tipW < tipMin && hexW > 96) {
      hexW = Math.max(96, vw - pad * 2 - gap - tipMin);
      hexH = hexW * aspect;
      if (hexH > vh - pad * 2) {
        hexH = vh - pad * 2;
        hexW = hexH / aspect;
      }
      tipW = Math.min(tipMax, vw - pad * 2 - hexW - gap);
    }
    const clusterW = hexW + gap + tipW;
    const tx = Math.max(pad, (vw - clusterW) / 2);
    const ty = Math.max(pad, Math.min((vh - hexH) / 2, vh - pad - hexH));
    return {
      tx, ty, hexW, hexH,
      textL: tx + hexW + gap,
      textT: Math.max(pad, ty),
      textW: Math.max(140, tipW),
      textMaxH: vh - pad * 2,
    };
  }

  const tipMinH = isCoin ? 168 : 132;
  let hexW = Math.min(vw - pad * 2, isCoin ? 150 : 248);
  let hexH = hexW * aspect;
  const maxHexH = vh - pad * 2 - tipMinH - gap;
  if (hexH > maxHexH) {
    hexH = Math.max(110, maxHexH);
    hexW = hexH / aspect;
  }
  const tx = Math.max(pad, (vw - hexW) / 2);
  const ty = pad;
  return {
    tx, ty, hexW, hexH,
    textL: pad,
    textT: ty + hexH + gap,
    textW: vw - pad * 2,
    textMaxH: Math.max(88, vh - (ty + hexH + gap) - pad),
  };
}

function applyInspectBox(hex, text, m) {
  const vv = window.visualViewport;
  const vw = Math.floor(Math.min(window.innerWidth, vv?.width || window.innerWidth));
  const vh = Math.floor(Math.min(window.innerHeight, vv?.height || window.innerHeight));
  const pad = 8;
  const aspect = m.hexW ? (m.hexH / m.hexW) : 1.54;
  let tx = m.tx, ty = m.ty, hexW = m.hexW, hexH = m.hexH;
  if (hexH > vh - pad * 2) {
    hexH = Math.max(80, vh - pad * 2);
    hexW = hexH / aspect;
  }
  if (hexW > vw - pad * 2) {
    hexW = Math.max(72, vw - pad * 2);
    hexH = hexW * aspect;
  }
  if (ty + hexH > vh - pad) ty = Math.max(pad, vh - pad - hexH);
  if (tx + hexW > vw - pad) tx = Math.max(pad, vw - pad - hexW);
  if (ty < pad) ty = pad;
  if (tx < pad) tx = pad;
  if (hex) {
    hex.style.cssText = [
      'position:fixed',
      `left:${tx}px`,
      `top:${ty}px`,
      `width:${hexW}px`,
      `height:${hexH}px`,
      'max-width:none',
      'max-height:none',
      'transform:none',
      'margin:0',
      'inset:auto',
    ].join(';');
  }
  if (text) {
    const land = vw > vh;
    let textL = land ? tx + hexW + 12 : pad;
    let textT = land ? Math.max(pad, ty) : ty + hexH + 10;
    let textW = land ? Math.max(140, vw - textL - pad) : vw - pad * 2;
    let textMaxH = land ? vh - pad * 2 : Math.max(80, vh - textT - pad);
    if (textL + 80 > vw) {
      textL = pad;
      textT = ty + hexH + 8;
      textW = vw - pad * 2;
      textMaxH = Math.max(80, vh - textT - pad);
    }
    text.style.left = textL + 'px';
    text.style.top = textT + 'px';
    text.style.width = textW + 'px';
    text.style.maxWidth = textW + 'px';
    text.style.maxHeight = textMaxH + 'px';
  }
}

function placeInspectStage(wrap, rect, kind) {
  const hex = wrap.querySelector('.lift-hex-fly');
  const text = wrap.querySelector('.lift-text-fly');
  const m = inspectMetrics(kind);
  wrap._to = { left: m.tx, top: m.ty, width: m.hexW, height: m.hexH };
  wrap._kind = kind;
  applyInspectBox(hex, text, m);
  requestAnimationFrame(() => {
    applyInspectBox(hex, text, m);
    if (hex) {
      const r = hex.getBoundingClientRect();
      const roomB = window.innerHeight - 6;
      const roomR = window.innerWidth - 6;
      if (r.bottom > roomB) hex.style.top = Math.max(6, roomB - r.height) + 'px';
      if (r.right > roomR) hex.style.left = Math.max(6, roomR - r.width) + 'px';
      if (r.top < 6) hex.style.top = '6px';
      if (r.left < 6) hex.style.left = '6px';
    }
  });
  if (text) {
    requestAnimationFrame(() => {
      wrap.classList.add('show-veil');
      text.classList.add('show');
    });
  }
}

function startLift(fromEl, def) {
  endLift(true);
  if (!fromEl || !def) return;
  const raw = fromEl.getBoundingClientRect();
  const rect = raw.width > 8
    ? raw
    : { left: 16, top: 16, width: 72, height: 110 };
  liftActive = true;
  liftFromRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  fromEl.classList.add('lift-source');
  fromEl.style.opacity = '0.08';
  $('#toast')?.classList.remove('show');

  const layer = $('#lift-layer') || document.body;
  const wrap = document.createElement('div');
  wrap.className = 'lift-clone lift-fly lift-inspect';
  wrap.innerHTML = `
    <div class="lift-veil"></div>
    <div class="lift-hex-fly">
      <img src="${artFor(def)}" alt="" draggable="false" />
    </div>
    <div class="lift-text-fly">${dossierHTML(def)}</div>
  `;
  layer.appendChild(wrap);
  liftClone = wrap;
  placeInspectStage(wrap, rect, 'card');
}

function endLift(instant = false) {
  const src = document.querySelector('.lift-source');
  const wrap = liftClone;
  const from = liftFromRect;
  const to = wrap && wrap._to;
  liftActive = false;
  liftClone = null;
  liftFromRect = null;
  if (src) {
    src.classList.remove('lift-source');
    src.style.opacity = '';
  }
  if (!wrap) return;
  if (instant || !from) { wrap.remove(); return; }
  const hex = wrap.querySelector('.lift-hex-fly') || wrap;
  const text = wrap.querySelector('.lift-text-fly');
  if (text) text.classList.remove('show');
  wrap.classList.remove('show-veil');
  const start = to || hex.getBoundingClientRect();
  const anim = hex.animate([
    { left: start.left + 'px', top: start.top + 'px', width: start.width + 'px', height: start.height + 'px' },
    { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' },
  ], { duration: 300, easing: 'cubic-bezier(.25,.75,.2,1)', fill: 'forwards' });
  anim.onfinish = () => wrap.remove();
  setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, 360);
}

function favorKeyForSeat(pid) {
  const f = engine?.state?.favor?.[pid] || 0;
  const seat = localSeat();
  const favYou = (seat === 0 && f === 1) || (seat === 1 && f === -1);
  const favOpp = (seat === 0 && f === -1) || (seat === 1 && f === 1);
  return favYou ? 'favored' : favOpp ? 'unfavored' : 'neutral';
}

function patronCostLine(ab) {
  if (!ab) return 'Cannot be used.';
  if (ab.passive && !(ab.cost && (ab.cost.coin || ab.cost.power || ab.cost.discard))) {
    return 'Passive — cannot be activated.';
  }
  const c = ab.cost || {};
  const bits = [];
  if (c.coin) bits.push(`Pay ${c.coin} Coin`);
  if (c.power) bits.push(`Pay ${c.power} Power`);
  if (c.discard) bits.push(`Discard ${c.discard}`);
  return bits.join(', ') || 'No cost';
}

function patronTurnLine(pid, key, pat) {
  if (pat.alwaysNeutral || pat.abilities?.alwaysNeutral || pid === 'mora' || pid === 'treasury') {
    return 'This Patron does not take a side.';
  }
  if (key === 'favored') return 'This Patron still FAVORS you.';
  if (key === 'neutral') return 'This Patron now FAVORS you.';
  if (pat.abilities?.flipUnfavoredToFavored) return 'This Patron now FAVORS you.';
  return 'This Patron is now NEUTRAL.';
}

function patronDossierHTML(pid) {
  const pat = patronsById[pid];
  if (!pat) return '';
  const unlocked = pid === 'treasury' || isDeckUnlocked(profile, pid);
  const current = favorKeyForSeat(pid);
  const alwaysN = !!(pat.alwaysNeutral || pat.abilities?.alwaysNeutral || pid === 'mora' || pid === 'treasury');
  const rows = alwaysN ? [['neutral', 'NEUTRAL']] : [
    ['favored', 'FAVORED'],
    ['neutral', 'NEUTRAL'],
    ['unfavored', 'UNFAVORED'],
  ];
  const blocks = rows.map(([key, label]) => {
    const ab = pat.abilities?.[key];
    const on = key === current;
    let desc = unlocked ? (ab?.desc || (ab ? 'Cannot be used.' : 'Cannot be used.')) : '???';
    const turn = unlocked ? patronTurnLine(pid, key, pat) : '';
    const hasPay = /^(Pay |If |Passive |Cannot |Sacrifice |Discard )/i.test(desc);
    const cost = unlocked && !hasPay ? patronCostLine(ab) : '';
    return `
      <div class="eso-tip-block dossier-block${on ? ' current-favor' : ''}">
        <div class="eso-tip-h dossier-h">${label}${on ? ' · current' : ''}</div>
        <ul>
          ${cost ? `<li class="coin">${cost}</li>` : ''}
          <li>${desc}</li>
          ${turn && !/FAVORS you|now NEUTRAL|does not take a side/i.test(desc) ? `<li class="turn-note">${turn}</li>` : ''}
        </ul>
      </div>`;
  }).join('');
  return `
    <div class="eso-tip patron-dossier">
      <div class="eso-tip-head">
        <div class="eso-tip-left">
          <div class="eso-tip-kicker">Tribute Patron</div>
          <div class="eso-tip-type">${current.toUpperCase()}</div>
        </div>
        <div class="eso-tip-patron">
          <img src="${patronArt(pid)}" alt="" />
          <span>${unlocked ? (pat.short || '') : '???'}</span>
        </div>
      </div>
      <h2 class="eso-tip-name">${unlocked ? (pat.name || '').toUpperCase() : '???'}</h2>
      ${blocks}
    </div>`;
}

function startPatronLift(fromEl, pid) {
  endLift(true);
  if (!fromEl || !pid) return;
  const rect = fromEl.getBoundingClientRect();
  if (!rect.width) return;
  liftActive = true;
  liftFromRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  fromEl.classList.add('lift-source');
  fromEl.style.opacity = '0.12';
  const layer = $('#lift-layer') || document.body;
  const wrap = document.createElement('div');
  wrap.className = 'lift-clone lift-fly lift-inspect inspect-coin';
  wrap.innerHTML = `
    <div class="lift-veil"></div>
    <div class="lift-hex-fly lift-coin-fly">
      <img src="${patronArt(pid)}" alt="" draggable="false" />
    </div>
    <div class="lift-text-fly">${patronDossierHTML(pid)}</div>
  `;
  layer.appendChild(wrap);
  liftClone = wrap;
  placeInspectStage(wrap, rect, 'coin');
}

function renderCard(inst, opts = {}) {
  const d = cardsById[inst.id] || inst;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'card' + (opts.extraClass ? ' ' + opts.extraClass : '');
  if (opts.affordable) el.classList.add('affordable');
  if (opts.playable) el.classList.add('playable');
  if (opts.comboN >= 2) el.classList.add('combo-glow', `combo-${Math.min(4, opts.comboN)}`);
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
    if (isRankedMatch && net?.ok) net.send({ type: 'ranked-picks', patrons: [...pickYou] });
    updatePickStatus();
    renderDeckPick();
    return;
  }
  // Deselect if already rival's — not in ranked PvP (rival picks their own)
  if (!isRankedMatch && pickOpp.includes(p.id)) {
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
    if (isRankedMatch && net?.ok) net.send({ type: 'ranked-picks', patrons: [...pickYou] });
  } else if (!isRankedMatch && pickOpp.length < 2) {
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
  if (isRankedMatch) pickOpp = [...(rankedPeerPicks || [])];
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
  if (isRankedMatch && matchMode === 'remote-guest') $('#btn-start').disabled = true;
  const hint = $('#deckpick-hint');
  if (hint) {
    if (isRankedMatch) {
      if (pickYou.length < 2) hint.innerHTML = 'Ranked — choose <strong>your</strong> two patrons. No AI.';
      else if (pickOpp.length < 2) hint.innerHTML = 'Waiting for your rival’s pair.';
      else hint.innerHTML = matchMode === 'remote-guest' ? 'Host will begin the match.' : 'Both ready. Begin Ranked.';
    } else if (pickYou.length < 2) hint.innerHTML = 'Tap to select, tap again to <strong>deselect</strong>. Choose <strong>two</strong> patrons for you.';
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
  if (matchMode === 'ai') return engine.state.active === 0;
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
  lastRes[key] = { coin: pl.coin, power: pl.power, prestige: pl.prestige, patron: pl.patronCallsLeft };
  return `
    <span class="eso-tok tok-coin" title="Coin">${tick('coin', pl.coin)}</span>
    <span class="eso-tok tok-prestige" title="Prestige">${tick('prestige', pl.prestige)}</span>
    <span class="eso-tok tok-power" title="Power">${tick('power', pl.power)}</span>
  `;
}

function paintPatronCalls(you, opp) {
  const paint = (id, n) => {
    const el = $(id);
    if (!el) return;
    el.innerHTML = `<span class="oct" aria-hidden="true"></span><span class="num">${n}</span>`;
    el.dataset.n = String(n);
    el.classList.toggle('empty', n <= 0);
  };
  paint('#you-patron-calls', you?.patronCallsLeft ?? 0);
  paint('#opp-patron-calls', opp?.patronCallsLeft ?? 0);
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
          if (targetSession) { pickTarget(a.uid); return; }
          if (attackable && onAttack) onAttack(a);
          else startLift(el, cardsById[a.id]);
        },
        onHoldRead: (_inst, el) => startLift(el, cardsById[a.id]),
      }));
    } else {
      slot.innerHTML = '<span class="slot-label" aria-hidden="true"></span>';
    }
    row.appendChild(slot);
  }
}

function renderEventsRail(you, s) {
  const list = $('#events-list');
  const comboEl = $('#events-combo');
  if (!list) return;
  list.innerHTML = '';
  const played = (you?.played || []).filter(c => {
    const d = cardsById[c.id];
    return d && d.type !== 'agent';
  });
  const suits = you?.suitsPlayed || {};
  const topCombo = Math.max(0, ...Object.values(suits));
  if (comboEl) comboEl.textContent = topCombo >= 2 ? `Combo ${topCombo}` : '';
  const turnLog = (engine.log || []).filter(l => l.t === s.turn && l.a === s.active).slice(-8);
  const items = played.length ? played.map((c, i) => {
    const d = cardsById[c.id];
    return { def: d, pip: d?.playText || '', combo: topCombo >= 2 && i === played.length - 1 };
  }) : turnLog.map(l => ({ def: null, pip: l.msg, combo: /combo/i.test(l.msg) }));
  for (const it of items) {
    const el = document.createElement('div');
    el.className = 'event-hex' + (it.combo ? ' combo' : '');
    if (it.def) {
      el.innerHTML = `<img src="${artFor(it.def)}" alt="" /><span class="ev-pip">${it.pip}</span>`;
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); startLift(el, it.def); });
      el.addEventListener('pointerup', (e) => { e.stopPropagation(); endLift(); });
    } else {
      el.innerHTML = `<span class="ev-pip">${it.pip}</span>`;
    }
    list.appendChild(el);
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
  paintPatronCalls(you, opp);

  const yourTurn = canControl();
  const turn = $('#turn-ind');
  turn.textContent = s.winner != null
    ? (s.winner === seat ? 'Victory' : 'Defeat')
    : (yourTurn ? (matchMode === 'hotseat' ? `Player ${seat + 1}` : 'Your turn') : (matchMode === 'ai' && !isRankedMatch ? 'Rival thinking…' : 'Waiting…'));
  turn.classList.toggle('your-turn', yourTurn);
  const endBtn = $('#btn-end');
  if (endBtn) {
    const busy = !!targetSession;
    endBtn.classList.toggle('can-end', yourTurn && s.winner == null && !busy);
    endBtn.disabled = !yourTurn || s.winner != null || busy;
  }

  // Pile counts
  $('#cnt-opp-hand').textContent = opp.hand.length;
  $('#cnt-opp-draw').textContent = opp.draw.length;
  $('#cnt-opp-cd').textContent = opp.cooldown.length;
  $('#cnt-you-draw').textContent = you.draw.length;
  $('#cnt-you-played').textContent = you.played.length;
  $('#cnt-you-cd').textContent = you.cooldown.length;
  const tdraw = $('#cnt-tavern-draw');
  if (tdraw) tdraw.textContent = (s.tavernPile || []).length;
  renderEventsRail(you, s);

  // Patron rail: opp patrons TOP, treasury MIDDLE, your patrons BOTTOM
  const rail = $('#rail-patrons');
  const prevFavor = {};
  rail.querySelectorAll('.patron-coin').forEach((el) => { prevFavor[el.dataset.pid] = el.dataset.favor; });
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
    const favor = favYou ? 'fav-you' : favOpp ? 'fav-opp' : 'neutral';
    const favorWord = favYou ? 'Favored' : favOpp ? 'Unfavored' : 'Neutral';
    const neverTurn = patronNeverTips(pat, pid);
    el.className = 'patron-coin ' + (pid === 'treasury' ? 'treasury ' : '') + (pid === 'mora' ? 'mora ' : '') + favor + (neverTurn ? ' tipless' : '');
    el.dataset.pid = pid;
    el.dataset.favor = favorWord.toLowerCase();
    el.dataset.side = pid === 'treasury' ? 'mid' : (youPats.includes(pid) ? 'you' : 'opp');
    el.style.setProperty('--patron-field', pat.color || '#6b1218');
    if (yourTurn && engine.canCallPatron(pid)) el.classList.add('callable');
    if (prevFavor[pid] && prevFavor[pid] !== favorWord.toLowerCase()) el.classList.add('just-flipped');
    const short = (pat.short || pat.name || pid).replace(/^The\s+/i, '');
    el.innerHTML = medallionMarkup(pid, pat, short, favorWord);
    bindCardGesture(el, {
      onTap: () => openPatronConfirm(pid, 'call'),
      onHoldRead: () => startPatronLift(el, pid),
    });
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') startPatronLift(el, pid);
    });
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') endLift();
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
        if (targetSession) { pickTarget(inst.uid); return; }
        if (!canControl()) return;
        if (engine.canBuy(i)) {
          const dest = pileEl('you-cooldown');
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
    onAttack: () => {
      if (!canControl() || targetSession) return;
      const legal = engine.legalTargets({ kind: 'powerAttack' });
      if (!legal.length) {
        toast('Need enough Power — and Taunt must be hit first');
        return;
      }
      beginTargetSession({
        steps: [{ kind: 'powerAttack', n: 1 }],
        onDone: (picks) => {
          const uid = Array.isArray(picks.powerAttack) ? picks.powerAttack[0] : picks.powerAttack;
          if (uid && engine.knockoutWithPower(uid)) {
            syncAction({ op: 'knockout', uid });
            afterPlayerAction();
          } else {
            toast('Need enough Power — and Taunt must be hit first');
            renderMatch();
          }
        },
      });
    },
  });
  renderAgentRow($('#you-agents'), you.agents, { attackable: false });

  // Played this turn
  const yp = $('#you-played');
  yp.innerHTML = '';
  const suitTally = {};
  you.played.forEach(c => {
    const def = cardsById[c.id];
    const suit = def?.patron;
    if (suit) suitTally[suit] = (suitTally[suit] || 0) + 1;
    if (def?.type === 'agent') return; // agents live in agents row
    yp.appendChild(renderCard(c, {
      extraClass: 'played-card',
      comboN: suitTally[suit] || 0,
      onTap: (_i, el) => {
        if (targetSession) { pickTarget(c.uid); return; }
        startLift(el, cardsById[c.id]);
      },
      onHoldRead: (_i, el) => startLift(el, cardsById[c.id]),
    }));
  });

  // Hand — tap plays, hold lifts to read (hold never also plays)
  const hz = $('#hand-zone');
  hz.innerHTML = '';
  you.hand.forEach(c => {
    const def = cardsById[c.id];
    hz.appendChild(renderCard(c, {
      playable: yourTurn && engine.canPlay(c.uid),
      extraClass: 'hand-card',
      onTap: (inst, el) => {
        if (targetSession) { pickTarget(inst.uid); return; }
        tryPlayCard(inst, el);
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
  if (s.winner != null) setMusicCue('tavern');
  else if ((opp.prestige >= 32) || (s.turn > 4 && you.prestige + 8 < opp.prestige)) setMusicCue('danger');
  else if (isRankedMatch || isGauntletMatch) setMusicCue('boss');
  else if (s.turn >= 3) setMusicCue('fight');
  else setMusicCue('tavern');
  if (targetSession) {
    const step = targetSession.steps[targetSession.idx];
    if (step && step.kind !== 'choose') {
      for (const t of engine.legalTargets(step)) {
        document.querySelector(`#match .card[data-uid="${t.uid}"]`)?.classList.add('legal-target');
      }
    }
  }
  syncBoardLayout();
}

function layoutFan(container, rival = false) {
  if (!container) return;
  const cards = [...container.children];
  const n = cards.length;
  cards.forEach((card, i) => {
    card.style.left = '';
    card.style.top = '';
    card.style.bottom = '';
    card.style.zIndex = String(i + 1);
  });
  if (!n) return;
  const phone = document.body.classList.contains('is-landscape') || document.body.classList.contains('is-portrait');
  const spread = rival
    ? Math.min(phone ? 16 : 36, 6 + n * (phone ? 2.2 : 4))
    : Math.min(phone ? 18 : 28, 5 + n * (phone ? 2.4 : 3));
  const start = -spread / 2;
  const step = n === 1 ? 0 : spread / (n - 1);
  cards.forEach((card, i) => {
    const rot = start + step * i;
    const y = Math.abs(rot) * (rival ? 0.28 : 0.4);
    const fan = `rotate(${rot.toFixed(2)}deg) translateY(${rival ? y : -y}px)`;
    card.style.setProperty('--fan-tf', fan);
    card.style.transform = fan;
    card.style.zIndex = String(i + 1);
  });
}

function flashFx(card, kind) {
  if (!card?.uid) return;
  const el = document.querySelector(`#match .card[data-uid="${card.uid}"]`);
  if (!el) return;
  el.classList.add(kind);
  setTimeout(() => el.classList.remove(kind), 700);
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

function patronThreeStateHTML(pid) {
  const pat = patronsById[pid];
  if (!pat) return '';
  const current = favorKeyForSeat(pid);
  const alwaysN = !!(pat.alwaysNeutral || pat.abilities?.alwaysNeutral || pid === 'mora' || pid === 'treasury');
  const rows = alwaysN ? [['neutral', 'NEUTRAL']] : [
    ['favored', 'FAVORED'],
    ['neutral', 'NEUTRAL'],
    ['unfavored', 'UNFAVORED'],
  ];
  return rows.map(([key, label]) => {
    const ab = pat.abilities?.[key];
    const on = key === current;
    const desc = ab?.desc || (ab ? '—' : 'Cannot be used.');
    return `<section class="pc-state${on ? ' current-favor' : ''}" data-state="${key}">
      <h4>${label}${on ? ' · current' : ''}</h4>
      <p>${desc}</p>
    </section>`;
  }).join('');
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
  const states = $('#pc-states');
  if (art) {
    art.src = patronArt(pid);
    art.style.filter = unlocked ? '' : 'grayscale(0.85) brightness(0.65)';
  }
  if (name) name.textContent = unlocked ? (pat.short || pat.name) : '???';
  if (states) {
    states.innerHTML = unlocked
      ? patronThreeStateHTML(pid)
      : '<p class="pc-locked">This patron has not yet revealed their true name.</p>';
  }
  const go = $('#pc-continue');
  if (go) {
    const ok = mode === 'pick' || (engine && canControl() && engine.canCallPatron(pid));
    go.disabled = !ok;
  }
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
  if (!engine.canCallPatron(pid)) { toast('Cannot call that patron now'); return; }
  const steps = engine.targetingStepsForPatron(pid);
  if (!steps.length) {
    finishPatronCall(pid, {});
    return;
  }
  beginTargetSession({
    steps,
    onDone: (picks) => finishPatronCall(pid, picks),
  });
}

function finishPatronCall(pid, picks) {
  if (!engine?.canCallPatron(pid)) { toast('Cannot call that patron now'); return; }
  playSfx('patron');
  engine.callPatron(pid, picks);
  syncAction({ op: 'patron', pid, picks });
  afterPlayerAction();
}

const TARGET_UP_TO = new Set(['destroy', 'confine', 'toss', 'donate', 'discard', 'replace', 'refreshHand', 'refreshDraw']);

function targetTitle(step) {
  const n = step.n || 1;
  const plural = n === 1 ? '' : 'S';
  const up = TARGET_UP_TO.has(step.kind) ? 'UP TO ' : '';
  switch (step.kind) {
    case 'sacrifice': return `SACRIFICE ${up}${n} CARD${plural}`;
    case 'destroy': return `DESTROY UP TO ${n} CARD${plural}`;
    case 'knockout': return `KNOCK OUT ${n} AGENT${plural}`;
    case 'powerAttack': return `KNOCK OUT ${n} AGENT${plural}`;
    case 'discard': return `DISCARD UP TO ${n} CARD${plural}`;
    case 'donate': return `DONATE UP TO ${n} CARD${plural}`;
    case 'toss': return `TOSS — MOVE UP TO ${n} CARD${plural}`;
    case 'replace': return `REPLACE UP TO ${n} TAVERN CARD${plural}`;
    case 'acquire': return `ACQUIRE A TAVERN CARD`;
    case 'refreshHand': return `REFRESH UP TO ${n} CARD${plural} TO HAND`;
    case 'refreshDraw': return `REFRESH UP TO ${n} CARD${plural} TO DRAW`;
    case 'confine': return `CONFINE UP TO ${n} CARD${plural}`;
    case 'heal': return `HEAL ${n} AGENT${plural}`;
    case 'choose': return 'CHOOSE ONE';
    case 'lookConfine': return `REPRIEVE — CHOOSE ${n} CARD${plural}`;
    case 'moraShare': return 'BARGAIN — CHOOSE A TAVERN ACTION';
    default: return 'CHOOSE A TARGET';
  }
}

function optionCardLabel(opt) {
  const bits = (opt || []).map((e) => {
    if (e.op === 'coin') return `Gain ${e.n} Coin`;
    if (e.op === 'power') return `Gain ${e.n} Power`;
    if (e.op === 'prestige') return `Gain ${e.n} Prestige`;
    if (e.op === 'draw') return `Draw ${e.n}`;
    if (e.op === 'acquire') return `Acquire up to ${e.n} cost`;
    if (e.op === 'draw_refresh') return `Refresh ${e.n} to draw`;
    if (e.op === 'hand_refresh') return `Refresh ${e.n} to hand`;
    if (e.op === 'knockout') return `Knock Out ${e.n}`;
    if (e.op === 'knockout_all') return 'Knock Out all Agents';
    return String(e.op || '').replace(/_/g, ' ');
  }).filter(Boolean);
  return bits.join('\n') || 'Option';
}

function beginTargetSession({ steps, onDone }) {
  endLift(true);
  targetSession = { steps, idx: 0, picks: {}, chosen: [], onDone, peeking: false, boardPick: false };
  document.body.classList.add('targeting');
  paintTargetStep();
}

function clearTargetUI() {
  document.body.classList.remove('targeting', 'targeting-peek', 'targeting-board');
  $$('.legal-target').forEach(el => el.classList.remove('legal-target', 'target-picked'));
  const ban = $('#target-banner');
  if (ban) ban.hidden = true;
  const sheet = $('#target-sheet');
  if (sheet) sheet.hidden = false;
  const ret = $('#target-return');
  if (ret) ret.hidden = true;
  const tray = $('#target-tray');
  if (tray) tray.innerHTML = '';
  const ch = $('#target-choices');
  if (ch) ch.innerHTML = '';
}

function cancelTargetSession() {
  clearTargetUI();
  targetSession = null;
  toast('Canceled');
  renderMatch();
}

function setTargetPeek(on) {
  if (!targetSession) return;
  targetSession.peeking = !!on;
  document.body.classList.toggle('targeting-peek', !!on);
  const sheet = $('#target-sheet');
  const ret = $('#target-return');
  if (sheet) sheet.hidden = !!on;
  if (ret) ret.hidden = !on;
}

function confirmTargetStep() {
  if (!targetSession || !engine) return;
  const step = targetSession.steps[targetSession.idx];
  if (!step) return;
  const need = step.n || 1;
  const have = targetSession.picked?.length || 0;
  if (step.kind === 'choose') {
    if (targetSession.picks.choose == null) { toast('Choose one option'); return; }
    const uid = targetSession.sourceUid;
    if (uid) {
      const more = engine.targetingStepsForPlay(uid, targetSession.picks.choose);
      targetSession.steps = more;
      targetSession.idx = 0;
    } else {
      targetSession.idx += 1;
    }
    paintTargetStep();
    return;
  }
  if (!have && !TARGET_UP_TO.has(step.kind) && step.kind !== 'acquire') {
    toast('Pick a card first');
    return;
  }
  if (!TARGET_UP_TO.has(step.kind) && have < need && step.kind !== 'acquire') {
    toast(`Pick ${need}`);
    return;
  }
  const delay = step.kind === 'sacrifice' || step.kind === 'destroy' ? 420
    : step.kind === 'knockout' || step.kind === 'powerAttack' ? 380
    : step.kind === 'confine' || step.kind === 'lookConfine' ? 400
    : 60;
  const sess = targetSession;
  if (have) {
    for (const uid of targetSession.picked) {
      const el = document.querySelector(`.legal-target[data-uid="${uid}"]`);
      if (!el) continue;
      if (step.kind === 'sacrifice' || step.kind === 'destroy') el.classList.add('fx-sacrifice');
      if (step.kind === 'knockout' || step.kind === 'powerAttack') el.classList.add('fx-slash');
      if (step.kind === 'confine' || step.kind === 'lookConfine') el.classList.add('fx-confine');
    }
  }
  setTimeout(() => {
    if (targetSession !== sess) return;
    targetSession.idx += 1;
    paintTargetStep();
  }, delay);
}

function paintTargetStep() {
  if (!targetSession || !engine) return;
  const step = targetSession.steps[targetSession.idx];
  if (!step) {
    const picks = targetSession.picks;
    const done = targetSession.onDone;
    clearTargetUI();
    targetSession = null;
    done && done(picks);
    return;
  }
  const ban = $('#target-banner');
  const prompt = $('#target-prompt');
  const choices = $('#target-choices');
  const tray = $('#target-tray');
  const confirm = $('#target-confirm');
  setTargetPeek(false);
  $$('.legal-target').forEach(el => el.classList.remove('legal-target', 'target-picked'));
  if (choices) choices.innerHTML = '';
  if (tray) tray.innerHTML = '';
  targetSession.boardPick = false;
  document.body.classList.remove('targeting-board');

  if (step.kind === 'acquire') {
    if (ban) ban.hidden = true;
    document.body.classList.add('targeting-board');
    const legal = engine.legalTargets(step);
    targetSession.legal = legal;
    targetSession.need = 1;
    targetSession.picked = [];
    for (const t of legal) {
      document.querySelector(`#match .card[data-uid="${t.uid}"]`)?.classList.add('legal-target');
    }
    if (!legal.length) {
      targetSession.idx += 1;
      paintTargetStep();
    }
    return;
  }

  if (ban) ban.hidden = false;
  if (prompt) prompt.textContent = targetTitle(step);
  if (confirm) confirm.hidden = false;

  if (step.kind === 'choose') {
    (step.options || []).forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'target-opt target-opt-card';
      btn.dataset.choice = String(i);
      btn.innerHTML = `<span>${optionCardLabel(opt).replace(/\n/g, '<br>')}</span>`;
      btn.onclick = () => {
        targetSession.picks.choose = i;
        $$('#target-choices .target-opt').forEach(el => el.classList.toggle('target-picked', el === btn));
      };
      choices.appendChild(btn);
    });
    return;
  }

  const legal = engine.legalTargets(step);
  targetSession.legal = legal;
  targetSession.need = step.n || 1;
  targetSession.picked = [];
  for (const t of legal) {
    if (!tray) break;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'card legal-target tray-card';
    el.dataset.uid = t.uid;
    const d = cardsById[t.id];
    el.innerHTML = d
      ? `<img class="art" src="${artFor(d)}" alt="${d.name}" /><div class="meta"><div class="cname">${d.name}</div></div>`
      : t.name;
    el.onclick = () => pickTarget(t.uid);
    tray.appendChild(el);
  }
  if (!legal.length) {
    targetSession.idx += 1;
    paintTargetStep();
  }
}

function pickTarget(uid) {
  if (!targetSession) return;
  const step = targetSession.steps[targetSession.idx];
  if (!step || !targetSession.legal?.some(t => t.uid === uid)) return;
  const key = step.kind === 'refreshHand' ? 'refreshHand'
    : step.kind === 'refreshDraw' ? 'refreshDraw'
    : step.kind;
  if (targetSession.boardPick || step.kind === 'acquire') {
    targetSession.picks[key] = [uid];
    targetSession.picked = [uid];
    confirmTargetStep();
    return;
  }
  if (targetSession.picked.includes(uid)) {
    targetSession.picked = targetSession.picked.filter(x => x !== uid);
    const bag = targetSession.picks[key];
    if (Array.isArray(bag)) targetSession.picks[key] = bag.filter(x => x !== uid);
    document.querySelector(`.legal-target[data-uid="${uid}"]`)?.classList.remove('target-picked');
    return;
  }
  if (targetSession.picked.length >= (step.n || 1)) return;
  targetSession.picked.push(uid);
  if (!targetSession.picks[key]) targetSession.picks[key] = [];
  if (Array.isArray(targetSession.picks[key])) targetSession.picks[key].push(uid);
  else targetSession.picks[key] = uid;
  document.querySelector(`.legal-target[data-uid="${uid}"]`)?.classList.add('target-picked');
}

function tryPlayCard(inst, el) {
  if (!canControl() || targetSession) return;
  const def = cardsById[inst.id];
  const steps = engine.targetingStepsForPlay(inst.uid);
  const go = (picks) => {
    const isAgent = def?.type === 'agent';
    const dest = isAgent ? ($('#you-agents') || pileEl('you-cooldown')) : pileEl('you-cooldown');
    const ok = engine.playCard(inst.uid, picks?.choose || 0, picks);
    if (!ok) { toast('Cannot play that now'); return; }
    flyCard(el, dest, inst, () => {});
    syncAction({ op: 'play', uid: inst.uid, choice: picks?.choose || 0, picks });
    afterPlayerAction();
  };
  if (!steps.length) { go({}); return; }
  targetSession = null;
  beginTargetSession({
    steps,
    onDone: (picks) => go(picks),
  });
  if (targetSession) targetSession.sourceUid = inst.uid;
}

function afterPlayerAction() {
  renderMatch();
  if (engine.state.winner != null) { stopHourglass(); return; }
  if (matchMode === 'ai' && !isRankedMatch && engine.state.active === 1) {
    stopHourglass();
    maybeAI();
  } else if (canControl()) {
    // keep timer running
  }
}

function showCardModal(d) {
  if (!d) return;
  const m = $('#card-modal');
  $('#card-modal-body').innerHTML = `<div class="lift-dossier modal-dossier"><div class="dossier-hex"><img src="${artFor(d)}" alt="" /></div>${dossierHTML(d)}</div><button id="btn-modal-close">Close</button>`;
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
  if (pileKey === 'you-draw' || pileKey === 'opp-draw') {
    toast('The draw pile is sealed.');
    return;
  }
  else if (pileKey === 'you-cooldown') { cards = you.cooldown; title = 'Your cooldown'; }
  else if (pileKey === 'you-played') { cards = you.played; title = 'Played this turn'; }
  else if (pileKey === 'opp-cooldown') { cards = opp.cooldown; title = 'Rival cooldown'; }
  else if (pileKey === 'opp-hand') { cards = opp.hand; title = 'Rival hand'; }
  else if (pileKey === 'tavern-discard') { cards = s.tavernDiscard; title = 'Tavern discard'; }
  else if (pileKey === 'tavern-draw') { cards = s.tavernPile || []; title = 'Tavern deck'; }

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
  if (msg.op === 'play') engine.playCard(msg.uid, msg.choice || 0, msg.picks);
  else if (msg.op === 'buy') engine.buy(msg.i);
  else if (msg.op === 'patron') engine.callPatron(msg.pid, msg.picks);
  else if (msg.op === 'knockout') engine.knockoutWithPower(msg.uid);
  else if (msg.op === 'end') engine.endTurn();
  renderMatch();
}

function startMatch(opts = {}) {
  engine = new GameEngine(cardsById, patronsById);
  const diff = opts.difficulty != null ? opts.difficulty
    : (isGauntletMatch && gauntletStopIndex != null ? GAUNTLET_STOPS[gauntletStopIndex].difficulty
    : (profile?.aiDifficulty || 5));
  ai = (matchMode === 'ai' || isGauntletMatch) && !isRankedMatch
    ? new TributeAI(engine, diff)
    : null;
  engine.on((ev, data) => {
    if (ev === 'combo') { flashCombo(data.n); playSfx('combo'); }
    if (ev === 'win') { stopHourglass(); playSfx('win'); showWin(data); }
    if (ev === 'play') {
      const def = data.def;
      if (def?.contract) { playSfx('contract'); }
      else if (def?.type === 'agent') { playSfx('agent'); }
      else playSfx('play');
      if (def?.id === 'gold' || def?.id === 'writ-of-coin') playSfx('coinA');
    }
    if (ev === 'buy') {
      playSfx('buy');
      const id = data?.def?.id || data?.card?.id;
      if (id) discoverCards(profile, [id], DATA.cards);
      if (engine?.state?.active === localSeat()) noteClubEvent(profile, { kind: 'buy' });
    }
    if (ev === 'writ') playSfx('coinB');
    if (ev === 'patron') {
      playSfx('patron');
      if (engine?.state?.active === localSeat()) noteClubEvent(profile, { kind: 'call' });
    }
    if (ev === 'play' && data?.def?.id) {
      discoverCards(profile, [data.def.id], DATA.cards);
    }
    if (ev === 'knockout') {
      playSfx('knockout');
      flashFx(data?.agent, 'fx-slash');
      const from = document.querySelector(`#match .card[data-uid="${data?.agent?.uid}"]`)
        || document.querySelector(`.tray-card[data-uid="${data?.agent?.uid}"]`);
      const dest = data?.ownerIsActive ? pileEl('you-cooldown') : pileEl('opp-cooldown');
      if (from && dest) flyCard(from, dest, data.agent, () => {});
    }
    if (ev === 'sacrifice') flashFx(data?.card, 'fx-sacrifice');
    if (ev === 'confine') flashFx(data?.agent, 'fx-confine');
    if (ev === 'writ') {
      const dest = pileEl('you-cooldown');
      const from = document.querySelector('.patron-coin.treasury');
      if (dest) dest.classList.add('just-writ');
      if (from && dest) {
        flyCard(from, dest, { id: data?.cardId || 'writ-of-coin' }, () => dest?.classList.remove('just-writ'));
      } else {
        setTimeout(() => dest?.classList.remove('just-writ'), 700);
      }
    }
    if (ev === 'shuffle') {
      playSfx('shuffle');
      animateShuffle(data.player);
    }
    if (ev === 'agentEnter') { playSfx('agent'); }
    if (ev === 'aiAction') handleAiActionAnim(data);
    if (ev === 'state' && !liftActive && engine?.state?.active === 1 &&
        ((matchMode === 'ai' && !isRankedMatch) || isGauntletMatch)) {
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
  // Tour is opt-in from Settings — never cover the table on first play.

  if (hourglassOn && canControl()) startHourglass();
  else syncHourglassUI();
  if (matchMode === 'ai' && !isRankedMatch && engine.state.active === 1) maybeAI();
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
      const r = recordMatchResult(profile, {
        won: engine.state.winner === 0, isRandom: isRandomMatch, ranked: false,
        patrons: [...pickYou], rivalPatrons: [...pickOpp],
      });
      rewardLine = `+${r.gold}g`;
      if (r.purse) purseNote = ` · ${r.purse.rarity} cutpurse`;
    } else if (matchMode === 'remote-host' || matchMode === 'remote-guest') {
      const won = (matchMode === 'remote-host' && engine.state.winner === 0) ||
                  (matchMode === 'remote-guest' && engine.state.winner === 1);
      const r = recordMatchResult(profile, {
        won, isRandom: false, ranked: false,
        patrons: [...pickYou], rivalPatrons: [...pickOpp],
      });
      rewardLine = `+${r.gold}g`;
      if (r.purse) purseNote = ` · ${r.purse.rarity} cutpurse`;
    } else if (isGauntletMatch && gauntletStopIndex != null) {
      const awardWin = engine.state.winner === 0;
      const g = recordGauntletResult(profile, { stopIndex: gauntletStopIndex, won: awardWin });
      if (awardWin) {
        rewardLine = `Province secured · +${g.gold || 0}g`;
        purseNote = g.complete ? ' · Road complete — grand prize!' : ' · next stop open';
      } else {
        rewardLine = "The road locks until NY midnight";
        const ms = g.retryInMs || msUntilNextNyMidnight();
        purseNote = ` · retry in ${fmtCountdown(ms)}`;
      }
      recordMatchResult(profile, {
        won: awardWin, isRandom: false, ranked: false, skipGold: true, gauntlet: true,
        patrons: [...pickYou], rivalPatrons: [...pickOpp], aiDifficulty: profile.aiDifficulty,
      });
    } else {
      const awardWin = engine.state.winner === 0;
      const r = recordMatchResult(profile, {
        won: awardWin, isRandom: isRandomMatch, ranked: isRankedMatch,
        patrons: [...pickYou], rivalPatrons: [...pickOpp], aiDifficulty: profile.aiDifficulty,
      });
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

  pendingWinLeave = {
    rematch: false,
    wasGauntlet: isGauntletMatch,
  };
  $('#win-banner').innerHTML = `
    ${title}<br>
    <span style="font-size:.45em;color:#c4b39a">${reasonText(data.reason)}</span><br>
    <button class="primary" id="btn-again">Continue</button>
    ${canRematch() ? '<button id="btn-rematch">Rematch</button>' : ''}`;
  $('#win-overlay').classList.add('show');
  setTimeout(() => {
    $('#btn-again')?.addEventListener('click', () => finishWinOverlay(false));
    $('#btn-rematch')?.addEventListener('click', () => finishWinOverlay(true));
  }, 50);
}

function finishWinOverlay(rematch) {
  $('#win-overlay').classList.remove('show');
  const wasGauntlet = isGauntletMatch;
  openMatchPurseCeremony(() => {
    isRandomMatch = false;
    isRankedMatch = false;
    isGauntletMatch = false;
    gauntletStopIndex = null;
    rankedPeerPicks = [];
    document.body.classList.remove('ranked-pvp-pick');
    if (rematch) {
      beginRematch();
      return;
    }
    if (net) { try { net.destroy(); } catch {} net = null; }
    if (wasGauntlet) openGauntlet();
    else onSplashEnter();
  });
}

function openMatchPurseCeremony(after) {
  profile = loadProfile();
  const claimed = claimMatchReward(profile, DATA.cards);
  profile = loadProfile();
  const overlay = $('#sack-overlay');
  const anim = $('#sack-anim');
  const box = $('#sack-reward');
  const rarityEl = $('#sack-rarity');
  anim.classList.remove('sack-anim', 'purse-open', 'purse-empty');
  void anim.offsetWidth;
  if (claimed.empty || !claimed.won) {
    anim.classList.add('purse-empty');
    if (rarityEl) rarityEl.textContent = 'Empty purse';
    if (box) box.innerHTML = claimed.gold
      ? `<div>${goldCoinHtml()} A meager ${claimed.gold}g</div>`
      : `<div>The purse is empty.</div>`;
    playSfx('purse');
  } else {
    anim.classList.add('purse-open', 'sack-anim');
    if (rarityEl) rarityEl.textContent = claimed.rarity || 'Cutpurse';
    const bits = (claimed.rewards || []).map((r) => r.label).join(' · ') || `${claimed.gold}g`;
    let img = goldCoinHtml();
    const frag = (claimed.rewards || []).find((r) => r.deck);
    const cardRew = (claimed.rewards || []).find((r) => r.id && cardsById[r.id]);
    if (cardRew) img = `<img src="${artFor(cardsById[cardRew.id])}" alt="" />`;
    else if (frag && patronsById[frag.deck]) img = `<img src="${patronArt(frag.deck)}" alt="" style="width:80px;border-radius:50%" />`;
    if (box) box.innerHTML = `${img}<div>${bits}</div>`;
    playSfx('celebrate');
    playSfx('purse');
  }
  overlay.classList.add('show');
  const close = $('#btn-sack-close');
  const done = () => {
    overlay.classList.remove('show');
    close?.removeEventListener('click', done);
    refreshSplashPurse();
    if (after) after();
  };
  close?.addEventListener('click', done);
}

function canRematch() {
  return (matchMode === 'ai' || matchMode === 'hotseat') && !isGauntletMatch && !net;
}

function beginRematch() {
  if (!pickYou.length || !pickOpp.length) { onSplashEnter(); return; }
  startMatch({});
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
      if (isContract) flashVfx(from, 'contract');
      else if (isAgent) flashVfx(from, 'agent');
      flyCard(from, dest || $('#opp-agents'), { id: action.cardId }, () => {});
    } else if (action.type === 'buy') {
      const tz = $('#tavern-zone');
      const from = tz?.children[action.index] || tz;
      flyCard(from, pileEl('opp-cooldown'), { id: action.cardId }, () => {});
    }
  } catch {}
}

function animateShuffle(player) {
  if (!engine?.state || !player) return;
  const you = engine.state.players[localSeat()];
  const draw = player === you ? $('#pile-you-draw') : $('#pile-opp-draw');
  const cd = player === you ? $('#pile-you-cd') : $('#pile-opp-cd');
  [draw, cd].forEach((el) => el?.classList.add('shuffling'));
  setTimeout(() => [draw, cd].forEach((el) => el?.classList.remove('shuffling')), 700);
}

function syncSfxToggles() {
  const on = isSfxOn();
  const chk = $('#chk-settings-sfx');
  if (chk) chk.checked = on;
  const btn = $('#btn-match-sfx');
  if (btn) {
    btn.textContent = on ? 'SFX' : 'SFX off';
    btn.classList.toggle('muted', !on);
  }
}

function streamPowerToPrestige(n) {
  return new Promise((resolve) => {
    const from = document.querySelector('#you-res .tok-power');
    const to = document.querySelector('#you-res .tok-prestige');
    if (!from || !to || n <= 0) { resolve(); return; }
    const fr = from.getBoundingClientRect();
    const tr = to.getBoundingClientRect();
    const count = Math.min(14, Math.max(4, n));
    const dx = (tr.left + tr.width / 2) - (fr.left + fr.width / 2);
    const dy = (tr.top + tr.height / 2) - (fr.top + fr.height / 2);
    for (let i = 0; i < count; i++) {
      const bit = document.createElement('div');
      bit.className = 'vfx-prestige-bit';
      bit.style.left = `${fr.left + fr.width / 2}px`;
      bit.style.top = `${fr.top + fr.height / 2}px`;
      document.body.appendChild(bit);
      bit.animate([
        { transform: 'translate(-50%, -50%) scale(0.55)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.05)`, opacity: 0.15 },
      ], { duration: 480 + i * 28, easing: 'cubic-bezier(.2,.7,.2,1)', delay: i * 32, fill: 'forwards' });
      setTimeout(() => bit.remove(), 720 + i * 32);
    }
    to.classList.add('tick');
    setTimeout(resolve, Math.min(720, 360 + count * 28));
  });
}

async function doEndTurn() {
  if (!engine || !canControl() || engine.state.winner) return;
  playSfx('end');
  $('#btn-end')?.classList.add('just-ended');
  setTimeout(() => $('#btn-end')?.classList.remove('just-ended'), 600);
  const seat = localSeat();
  const you = engine.state.players[seat];
  const opp = engine.state.players[1 - seat];
  const bank = you?.power || 0;
  const blocked = !!(opp?.agents || []).some(a => a.taunt);
  if (bank > 0 && !blocked) await streamPowerToPrestige(bank);
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
  if (matchMode === 'ai' && !isRankedMatch) {
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
  const sfx = $('#sel-sfx');
  if (sfx) sfx.value = getSfxStyle();
  syncSfxToggles();
  mountDiffSlider('#diff-slider-settings', '#diff-val-settings');
  paintDiffAll();
  const live = settingsReturnScreen === '#match' && !!engine?.state;
  hg?.closest('.settings-row')?.classList.toggle('prematch-only-hidden', live);
  $('#diff-slider-settings')?.closest('.diff-block')?.classList.toggle('prematch-only-hidden', live);
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
function rewardBits(reward = {}) {
  const bits = [];
  if (reward.gold) bits.push(`${reward.gold}g`);
  if (reward.purses || reward.sacks) bits.push(`${reward.purses || reward.sacks} purse`);
  if (reward.purse) bits.push(`${reward.purse} purse`);
  if (reward.fragment) bits.push('fragment');
  if (reward.clues) bits.push(`${reward.clues} clues`);
  if (reward.skin) bits.push('table design');
  if (reward.back) bits.push('card back');
  return bits.join(', ');
}

function renderGoalRow(g, onClaim) {
  const ready = (g.progress || 0) >= g.target && !g.claimed;
  const row = document.createElement('div');
  row.className = 'ach-row' + (ready ? ' claimable' : '');
  row.innerHTML = `
    <div class="ach-info">
      <strong>${g.title}</strong>
      <span>${g.desc} · ${g.progress || 0}/${g.target}${g.claimed ? ' · claimed' : ''} · ${rewardBits(g.reward)}</span>
    </div>
    <button ${ready ? '' : 'disabled'}>${g.claimed ? 'Claimed' : 'Claim'}</button>
  `;
  row.querySelector('button')?.addEventListener('click', onClaim);
  return row;
}

function renderClub() {
  profile = loadProfile();
  ensureClubMeta(profile, DATA.cards);
  const r = profile.ranked || {};
  const clues = countClues(profile, DATA.cards);
  $('#club-stats').innerHTML = `
    <div class="club-stat"><div class="label">Gold</div><div class="val">${goldCoinHtml()} ${profile.gold}</div></div>
    <div class="club-stat"><div class="label">Check-in</div><div class="val">${profile.checkInStreak || 0}d</div></div>
    <div class="club-stat"><div class="label">Win streak</div><div class="val">${profile.winStreak || 0}</div></div>
    <div class="club-stat"><div class="label">Record</div><div class="val">${profile.stats.wins}–${profile.stats.losses}</div></div>
    <div class="club-stat"><div class="label">Decks</div><div class="val">${profile.unlockedDecks.length}/12</div></div>
    <div class="club-stat"><div class="label">Clues</div><div class="val">${clues.have}/${clues.total}</div></div>
  `;

  const cal = $('#club-calendar');
  if (cal) {
    const grid = loginMonthGrid(profile.loginDays);
    const dow = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    cal.innerHTML = dow.map((d) => `<div class="cal-dow">${d}</div>`).join('') +
      grid.cells.map((c) => {
        if (c.state === 'pad') return `<div class="cal-day pad"></div>`;
        const mark = c.state === 'miss' ? '✕' : (c.state === 'ok' ? '✓' : c.day);
        return `<div class="cal-day ${c.state}${c.crate ? ' crate' : ''}" title="${c.date}">${mark}</div>`;
      }).join('');
  }

  const g = ensureGauntletDay(profile);
  const featured = todaysFeatured(profile);
  const prize = roadGrandPrizePreview(profile);
  const roadEl = $('#club-road');
  if (roadEl) {
    const done = (g.cursor || 0) >= (g.order?.length || 0);
    const lock = g.lockedDate === nyDateStr();
    roadEl.innerHTML = `
      <h4>Challenge the Provinces</h4>
      <p>${done ? 'Road cleared — grand prize claimed.' : `Next: ${featured.name} (${(g.cursor || 0) + 1}/${g.order?.length || 0}).`}
      ${lock ? ' Lost today — locked until NY midnight.' : ' Win advances. A loss locks the road for the day.'}
      Grand prize: ${prize.label}. Unofficial fan road.</p>
      <button type="button" id="btn-club-road">Open the map</button>
    `;
    $('#btn-club-road')?.addEventListener('click', () => openGauntlet());
  }

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

  const tourney = $('#club-tournament');
  if (tourney) {
    tourney.innerHTML = `
      <h4>Fan tables</h4>
      <p>Unofficial Club brackets when a host posts one — pass-and-play or a friend’s room. No netcode invented here, no IAP, not a Bethesda event.</p>
      <button type="button" id="btn-club-friend">Play a Friend</button>
    `;
    $('#btn-club-friend')?.addEventListener('click', () => {
      $('#friend-status').textContent = '';
      show('#friend-lobby');
    });
  }

  const weekHint = $('#club-weekly-hint');
  if (weekHint) {
    weekHint.textContent = `Resets Monday 00:00 America/New_York · week of ${weeklyKey()} · ${fmtCountdown(msUntilWeeklyReset())} left`;
  }
  const weeklyBox = $('#club-weekly');
  if (weeklyBox) {
    weeklyBox.innerHTML = '';
    for (const goal of profile.challenges.weekly.goals || []) {
      weeklyBox.appendChild(renderGoalRow(goal, () => {
        const res = claimWeeklyGoal(profile, goal.id, DATA.cards);
        if (res) { toast(`Weekly claimed — ${rewardBits(res)}`); renderClub(); refreshSplashPurse(); }
      }));
    }
  }

  const seasonBox = $('#club-seasonal');
  if (seasonBox) {
    const season = currentSeason();
    const next = nextSeason();
    const st = profile.challenges.seasonal;
    if (!season) {
      seasonBox.innerHTML = `<div class="season-banner"><h4>Between festivals</h4><p>Next fan theme: ${next?.name || '—'}. Unofficial — not affiliated with Bethesda / ESO.</p></div>`;
    } else {
      seasonBox.innerHTML = `
        <div class="season-banner">
          <h4>${season.name}</h4>
          <p>${season.blurb} Season reward: ${rewardBits(season.reward)}.</p>
        </div>
        <div id="season-goals" class="ach-list"></div>
        <button type="button" class="season-complete" id="btn-season-complete" ${st.seasonClaimed ? 'disabled' : ''}>${st.seasonClaimed ? 'Season claimed' : 'Claim season reward'}</button>
      `;
      const sg = $('#season-goals');
      for (const goal of st.goals || []) {
        sg.appendChild(renderGoalRow(goal, () => {
          const res = claimSeasonalGoal(profile, goal.id, DATA.cards);
          if (res) { toast(`Season goal — ${rewardBits(res)}`); renderClub(); refreshSplashPurse(); }
        }));
      }
      $('#btn-season-complete')?.addEventListener('click', () => {
        const res = claimSeasonComplete(profile, DATA.cards);
        if (res) { toast(`Season complete — ${rewardBits(res)}`); applyTableSkin(); renderClub(); refreshSplashPurse(); }
        else toast('Finish every seasonal goal first.');
      });
    }
  }

  const dw = profile.challenges.dailyWin;
  $('#club-daily').innerHTML = `
    <div class="ach-row ${dw.progress >= dw.target && !dw.claimed ? 'claimable' : ''}">
      <div class="ach-info">
        <strong>Win ${dw.target} matches today</strong>
        <span>${dw.progress}/${dw.target}${dw.claimed ? ' · claimed' : ''} · 12g</span>
      </div>
      <button id="btn-claim-daily" ${dw.progress >= dw.target && !dw.claimed ? '' : 'disabled'}>Claim 12g</button>
    </div>
  `;
  $('#btn-claim-daily')?.addEventListener('click', () => {
    const res = claimDailyChallenge(profile);
    if (res) { toast('Daily claimed — +12g'); renderClub(); refreshSplashPurse(); }
  });

  const list = $('#club-achievements');
  list.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const unlocked = !!profile.achievements[a.id];
    const claimed = !!profile.achievements[`claimed_${a.id}`];
    const row = document.createElement('div');
    row.className = 'ach-row' + (unlocked ? '' : ' locked') + (unlocked && !claimed ? ' claimable' : '');
    row.innerHTML = `
      <div class="ach-info">
        <strong>${a.name}</strong>
        <span>${a.desc} · ${rewardBits(a.reward)}${claimed ? ' · claimed' : unlocked ? '' : ' · locked'}</span>
      </div>
      <button data-ach="${a.id}" ${unlocked && !claimed ? '' : 'disabled'}>${claimed ? 'Claimed' : 'Claim'}</button>
    `;
    row.querySelector('button')?.addEventListener('click', () => {
      const res = claimAchievement(profile, a.id, DATA.cards);
      if (res) { toast(`Claimed ${a.name}`); renderClub(); refreshSplashPurse(); }
    });
    list.appendChild(row);
  }
}

function offerVisual(offer) {
  if (offer.kind === 'fragment') {
    const p = patronsById[offer.target];
    return `<img src="${patronArt(offer.target)}" alt="" style="width:56px;height:56px;border-radius:50%;border:2px solid var(--gold-dim)" />
      <h4>${p?.short || offer.target} fragment</h4>
      <p>${fragmentProgress(profile, offer.target)}/${FRAGMENTS_TO_UNLOCK} · ${formatRarity(offer.rarity)}</p>`;
  }
  if (offer.kind === 'upgrade') {
    const c = cardsById[offer.target];
    return `<img src="${c ? artFor(c) : ''}" alt="" style="width:64px;height:90px;object-fit:cover;border-radius:4px;border:1px solid var(--gold-dim)" />
      <h4>${c?.name || offer.target}</h4>
      <p>Upgrade · ${formatRarity(offer.rarity)}</p>`;
  }
  if (offer.kind === 'skin') {
    const s = TABLE_SKINS.find((x) => x.id === offer.target);
    return `<div class="skin-swatch ${offer.target}"></div><h4>${s?.name || offer.target}</h4><p>Table · ${formatRarity(offer.rarity)}</p>`;
  }
  if (offer.kind === 'back') {
    const b = CARD_BACKS.find((x) => x.id === offer.target);
    return `<div class="back-swatch back-${offer.target}"></div><h4>${b?.name || offer.target}</h4><p>Back · ${formatRarity(offer.rarity)}</p>`;
  }
  if (offer.kind === 'clue') {
    const c = cardsById[offer.target];
    return `<img src="${c ? artFor(c) : ''}" alt="" style="width:64px;height:90px;object-fit:cover;border-radius:4px;border:1px solid var(--gold-dim)" />
      <h4>${c?.name || 'Card clue'}</h4>
      <p>Clue · ${formatRarity(offer.rarity)}</p>`;
  }
  return `<h4>${offer.id}</h4>`;
}

function renderOfferCard(offer, { later = false, preview = false } = {}) {
  const sold = !later && !preview && isOfferSoldOut(profile, shopPeriodKeySafe(), offer.id);
  const el = document.createElement('div');
  el.className = 'store-item' + (sold ? ' soldout' : '') + (later || preview ? ' later' : '');
  const price = preview || later ? 'Returns later' : (sold ? 'Sold out' : `${offer.price}g`);
  el.innerHTML = `
    <div class="rarity-pip rarity-${offer.rarity}">${formatRarity(offer.rarity)}</div>
    ${offerVisual(offer)}
    <div class="price">${price}</div>
    ${later || preview ? '' : `<button ${sold ? 'disabled' : ''}>${sold ? 'Sold out' : 'Buy'}</button>`}
  `;
  if (!later && !preview && !sold) {
    el.querySelector('button').onclick = () => {
      const res = buyShopOffer(profile, offer, DATA.cards);
      if (res.error) toast(res.error);
      else {
        toast(res.unlocked ? 'Patron unlocked — if every card clue is in.' : `Bought · ${offer.price}g`);
        applyTableSkin(); renderStore(); refreshSplashPurse();
      }
    };
  }
  return el;
}

function shopPeriodKeySafe() {
  const slate = currentShop(profile, DATA.cards);
  return slate.periodKey;
}

function renderStore() {
  profile = loadProfile();
  ensureClubMeta(profile, DATA.cards);
  $('#store-gold').textContent = `${profile.gold}g`;
  const slate = currentShop(profile, DATA.cards);
  const timer = $('#store-timer');
  if (timer) timer.textContent = `Slate refreshes in ${fmtCountdown(msUntilShopRefresh())} (daily NY midnight).`;

  const bundleBox = $('#store-bundle');
  if (bundleBox) {
    const b = slate.bundle;
    if (!b) bundleBox.innerHTML = '<p class="hint">No bundle this slate.</p>';
    else {
      const sold = isOfferSoldOut(profile, slate.periodKey, b.id);
      const names = (b.parts || []).map((p) => p.target).join(' + ');
      bundleBox.innerHTML = `
        <div class="bundle-card">
          <div class="rarity-pip rarity-${b.rarity}">${formatRarity(b.rarity)} bundle</div>
          <h4>Roister’s parcel</h4>
          <p>${names} — still stingy; 10% off the pair. Fragments remain the long sink.</p>
          <div class="price">${sold ? 'Sold out' : b.price + 'g'}</div>
          <button id="btn-buy-bundle" ${sold ? 'disabled' : ''}>${sold ? 'Sold out' : 'Buy bundle'}</button>
        </div>`;
      $('#btn-buy-bundle')?.addEventListener('click', () => {
        const res = buyShopOffer(profile, b, DATA.cards);
        if (res.error) toast(res.error);
        else { toast(`Bundle taken · ${b.price}g`); renderStore(); refreshSplashPurse(); }
      });
    }
  }

  const feat = $('#store-featured');
  if (feat) {
    feat.innerHTML = '';
    for (const o of slate.featured) feat.appendChild(renderOfferCard(o));
  }
  const tom = $('#store-tomorrow');
  if (tom) {
    tom.innerHTML = '';
    for (const o of (slate.tomorrow?.featured || []).slice(0, 5)) {
      tom.appendChild(renderOfferCard(o, { preview: true }));
    }
  }
  const later = $('#store-later');
  if (later) {
    later.innerHTML = '';
    for (const o of slate.later) later.appendChild(renderOfferCard(o, { later: true }));
  }
}

let collectionTab = 'patrons';

function setCollectionTab(tab) {
  collectionTab = tab;
  $$('.coll-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const patrons = $('#collection-patrons');
  const clues = $('#collection-clues');
  const ups = $('#collection-cosmetics');
  if (patrons) patrons.hidden = tab !== 'patrons';
  if (clues) clues.hidden = tab !== 'clues';
  if (ups) ups.hidden = tab !== 'upgrades';
}

function renderCollection() {
  profile = loadProfile();
  ensureClubMeta(profile, DATA.cards);
  setCollectionTab(collectionTab);
  const hint = $('#collection-hint');
  const clues = countClues(profile, DATA.cards);
  if (hint) {
    hint.textContent = collectionTab === 'patrons'
      ? 'Locked decks need patron fragments AND one clue for every base card in that deck.'
      : collectionTab === 'clues'
        ? `${clues.have}/${clues.total} cards found. ${CLUES_TO_UPGRADE} clues on a card unlocks its upgrade. Grouped by deck — starters first.`
        : 'Table designs, card backs, and owned card upgrades. Buy them on the rotating slate.';
  }

  const grid = $('#collection-grid');
  if (grid) {
    grid.innerHTML = '';
    $('#collection-detail')?.classList.add('hidden');
    for (const id of ALL_DECKS) {
      const p = patronRecord(id);
      if (!p) continue;
      const unlocked = isDeckUnlocked(profile, id);
      const el = document.createElement('div');
      el.className = 'patron-card' + (unlocked ? '' : ' locked');
      el.dataset.deck = id;
      const frag = fragmentProgress(profile, id);
      const ups = upgradesForPatron(DATA.cards, id);
      const owned = ups.filter((u) => profile.ownedUpgrades.includes(u)).length;
      const ready = !unlocked && deckReadyToUnlock(profile, id, DATA.cards);
      const title = id === 'mora' ? 'Hermaeus Mora' : (p.short || p.name || id);
      el.innerHTML = `
        <img src="${patronArt(id)}" alt="${unlocked ? title : 'Locked patron'}" />
        <div class="name">${unlocked ? title : '???'}</div>
        <div class="desc">${unlocked ? `Upgrades ${owned}/${ups.length}` : `Fragments ${frag}/${FRAGMENTS_TO_UNLOCK}${ready ? ' · ready' : ' · need cards'}`} · ${formatRarity(rarityOf('fragment', id))}</div>
      `;
      el.addEventListener('click', () => showCollectionDeck(id));
      grid.appendChild(el);
    }
  }

  renderClueEncyclopedia();
  renderCollectionUpgrades();
}

function renderClueEncyclopedia() {
  const host = $('#collection-clues');
  if (!host) return;
  host.innerHTML = '';
  for (const deckId of DECK_IMPORTANCE) {
    const p = patronRecord(deckId);
    const cards = deckCardSet(DATA.cards, deckId);
    if (!cards.length && deckId !== 'mora' && deckId !== 'treasury') continue;
    const wrap = document.createElement('div');
    wrap.className = `clue-deck deck-${deckId}`;
    wrap.style.setProperty('--ency-color', p.color || DECK_COLORS[deckId] || '#c9a227');
    wrap.appendChild(encyPatronHead(deckId));
    const found = cards.filter((c) => clueCountOf(profile, c.id) >= 1).length;
    const count = document.createElement('p');
    count.className = 'hint clue-deck-count';
    count.textContent = `${found}/${cards.length} clues`;
    wrap.appendChild(count);
    const box = document.createElement('div');
    box.className = 'collection-cards';
    for (const c of cards) {
      const n = clueCountOf(profile, c.id);
      const known = n >= 1;
      const el = document.createElement('div');
      el.className = 'clue-card' + (known ? '' : ' unknown');
      el.innerHTML = known
        ? `<img src="${artFor(c)}" alt="${c.name}" /><div class="tag">${c.name} · ${n}/${CLUES_TO_UPGRADE}${c.starter ? ' · starter' : ''}${c.upgraded ? ' · ▲' : ''}</div>`
        : `<div class="clue-unknown">?</div><div class="tag">Unknown · ${n}/${CLUES_TO_UPGRADE}</div>`;
      if (known) el.addEventListener('click', () => showCardModal(c));
      box.appendChild(el);
    }
    wrap.appendChild(box);
    host.appendChild(wrap);
  }
}

function renderCollectionUpgrades() {
  const frags = $('#coll-frags');
  const skins = $('#coll-skins');
  const backs = $('#coll-backs');
  const ups = $('#coll-upgrades');
  if (frags) {
    frags.innerHTML = '';
    for (const id of LOCKED_DECKS) {
      const p = patronRecord(id);
      const n = fragmentProgress(profile, id);
      const el = document.createElement('div');
      el.className = 'store-item' + (isDeckUnlocked(profile, id) ? ' owned' : '');
      el.innerHTML = `
        <div class="rarity-pip rarity-${rarityOf('fragment', id)}">${formatRarity(rarityOf('fragment', id))}</div>
        <img src="${patronArt(id)}" alt="" style="width:56px;height:56px;border-radius:50%;border:2px solid var(--gold-dim)" />
        <h4>${id === 'mora' ? 'Hermaeus Mora' : p.short}</h4>
        <p>Fragments ${n}/${FRAGMENTS_TO_UNLOCK}${isDeckUnlocked(profile, id) ? ' · unlocked' : ''}</p>
      `;
      frags.appendChild(el);
    }
  }
  if (skins) {
    skins.innerHTML = '';
    for (const s of TABLE_SKINS) {
      const owned = profile.unlockedSkins.includes(s.id);
      const eq = profile.tableSkin === s.id;
      const el = document.createElement('div');
      el.className = 'store-item' + (owned ? ' owned' : ' later') + (eq ? ' equipped' : '');
      el.innerHTML = `
        <div class="rarity-pip rarity-${s.rarity || 'fine'}">${formatRarity(s.rarity || 'fine')}</div>
        <div class="skin-swatch ${s.id}"></div>
        <h4>${s.name}</h4>
        <p>${s.tag || ''} · ${owned ? (eq ? 'Equipped' : 'Owned') : 'Not owned'}</p>
        ${owned ? `<button>${eq ? 'Equipped' : 'Equip'}</button>` : ''}
      `;
      el.querySelector('button')?.addEventListener('click', () => {
        equipSkin(profile, s.id); applyTableSkin(); renderCollection();
      });
      skins.appendChild(el);
    }
  }
  if (backs) {
    backs.innerHTML = '';
    for (const b of CARD_BACKS) {
      const owned = profile.unlockedBacks.includes(b.id);
      const eq = profile.cardBack === b.id;
      const el = document.createElement('div');
      el.className = 'store-item' + (owned ? ' owned' : ' later') + (eq ? ' equipped' : '');
      el.innerHTML = `
        <div class="rarity-pip rarity-${b.rarity || 'fine'}">${formatRarity(b.rarity || 'fine')}</div>
        <h4>${b.name}</h4>
        <p>${owned ? (eq ? 'Equipped' : 'Owned') : 'Not owned'}</p>
        ${owned ? `<button>${eq ? 'Equipped' : 'Equip'}</button>` : ''}
      `;
      el.querySelector('button')?.addEventListener('click', () => {
        equipBack(profile, b.id); applyTableSkin(); renderCollection();
      });
      backs.appendChild(el);
    }
  }
  if (ups) {
    ups.innerHTML = '';
    const owned = (profile.ownedUpgrades || []).map((id) => cardsById[id]).filter(Boolean);
    if (!owned.length) ups.innerHTML = '<p class="hint">No card upgrades yet — find clues at the table or buy them when the slate turns.</p>';
    for (const c of owned) {
      ups.innerHTML += `<div class="coll-card upgrade-owned"><img src="${artFor(c)}" alt="${c.name}" /><div class="tag">${c.name}</div></div>`;
    }
  }
}

function showCollectionDeck(deckId) {
  const p = patronRecord(deckId);
  const detail = $('#collection-detail');
  detail.classList.remove('hidden');
  const unlocked = isDeckUnlocked(profile, deckId);
  const cards = deckCardSet(DATA.cards, deckId);
  const ready = deckReadyToUnlock(profile, deckId, DATA.cards);
  let html = `<h3>${p.name}</h3><p>${unlocked ? 'Unlocked' : `Locked — ${fragmentProgress(profile, deckId)}/${FRAGMENTS_TO_UNLOCK} fragments${ready ? ' and every base card found' : ' plus one clue per base card'}`}</p><div class="collection-cards">`;
  for (const c of cards) {
    const isUp = (c.baseQty || 0) === 0 && (c.upgradedQty || 0) > 0;
    const owned = !isUp || profile.ownedUpgrades.includes(c.id);
    const n = clueCountOf(profile, c.id);
    const cls = isUp ? (owned ? 'upgrade-owned' : 'upgrade-locked') : '';
    html += `<div class="coll-card ${cls}">
      <img src="${artFor(c)}" alt="${c.name}" />
      <div class="tag">${c.name}${isUp ? (owned ? ' ▲ owned' : ' ▲ locked') : ''} · clues ${n}/${CLUES_TO_UPGRADE}</div>
    </div>`;
  }
  html += '</div>';
  detail.innerHTML = html;
}

function openLoginGreet() {
  const overlay = $('#login-overlay');
  if (!overlay) return;
  profile = loadProfile();
  const cal = $('#login-cal');
  const grid = loginMonthGrid(profile.loginDays);
  const dow = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  if (cal) {
    cal.innerHTML = dow.map((d) => `<div class="cal-dow">${d}</div>`).join('') +
      grid.cells.map((c) => {
        if (c.state === 'pad') return `<div class="cal-day pad"></div>`;
        const mark = c.state === 'miss' ? '✕' : (c.state === 'ok' ? '✓' : c.day);
        const claim = c.state === 'today' ? ' claimable' : '';
        return `<div class="cal-day ${c.state}${c.crate ? ' crate' : ''}${claim}" data-date="${c.date || ''}">${mark}</div>`;
      }).join('');
  }
  const crate = crateVariantForDay(grid.today);
  const hint = $('#login-prize-hint');
  if (hint) {
    hint.textContent = crate && (profile.cratesOpened || 0) < CRATES_PER_MONTH
      ? `Today holds a ${crate.name}. Two Crown Crates a month.`
      : 'Stamp today for a modest Club purse of gold.';
  }
  overlay.classList.add('show');
}

function claimLoginStamp() {
  profile = loadProfile();
  const res = claimDailyLogin(profile, DATA.cards);
  if (res.error) { toast(res.error); $('#login-overlay')?.classList.remove('show'); return; }
  profile = res.profile;
  toast(res.toast);
  $('#login-overlay')?.classList.remove('show');
  refreshSplashPurse();
  if (res.crate) openCrateCeremony(res.crate);
}

function openCrateCeremony(variant) {
  const overlay = $('#crate-overlay');
  if (!overlay) return;
  const crate = resolveCrateVariant(variant);
  if (!crate) return;
  pendingCrate = crate;
  const stage = $('#crate-stage');
  stage?.classList.remove('crate-open');
  stage?.classList.remove('crate-iron', 'crate-orichalcum', 'crate-ebony', 'crate-voidsteel');
  stage?.classList.add(`crate-${crate.id}`);
  $('#crate-rarity').textContent = crate.name;
  $('#crate-reward').innerHTML = '';
  $('#btn-crate-open').hidden = false;
  $('#btn-crate-close').hidden = true;
  overlay.classList.add('show');
}

function doOpenCrate() {
  profile = loadProfile();
  const variant = pendingCrate || resolveCrateVariant(profile.pendingCrate);
  if (!variant) { toast('No Crown Crate waiting.'); return; }
  const res = openCrownCrate(profile, DATA.cards, variant);
  if (res.error) { toast(res.error); return; }
  pendingCrate = null;
  playSfx('crate');
  $('#crate-stage')?.classList.add('crate-open');
  $('#crate-reward').innerHTML = `${goldCoinHtml()}<div>${res.reward?.label || 'Crate opened'}</div>`;
  $('#btn-crate-open').hidden = true;
  $('#btn-crate-close').hidden = false;
  refreshSplashPurse();
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

function encyPatronHead(deckId) {
  const p = patronRecord(deckId);
  const unlocked = deckId === 'treasury' || isDeckUnlocked(profile, deckId);
  const title = deckId === 'mora' ? 'Hermaeus Mora' : (p.name || p.short || deckId);
  const cap = DECK_CAPTIONS[deckId] || '';
  const el = document.createElement('div');
  el.className = `ency-patron-head deck-${deckId}` + (unlocked ? '' : ' locked');
  el.dataset.deck = deckId;
  el.style.setProperty('--ency-color', p.color || DECK_COLORS[deckId] || '#c9a227');
  el.innerHTML = `
    <img class="ency-patron-token" src="${patronArt(deckId)}" alt="${unlocked ? title : 'Locked patron'}" />
    <div class="ency-patron-meta">
      <strong class="ency-div-name">${unlocked ? title : '???'}</strong>
      <span class="ency-div-cap">${unlocked ? cap : 'Locked'}</span>
    </div>
  `;
  return el;
}

function renderEncy() {
  const sel = $('#ency-patron');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = `<option value="">All patrons</option>` +
      DECK_IMPORTANCE.map((id) => {
        const p = patronRecord(id);
        const label = id === 'mora' ? 'Hermaeus Mora' : (p.name || p.short || id);
        return `<option value="${id}">${label}</option>`;
      }).join('');
    if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
  }
  const q = ($('#ency-search').value || '').toLowerCase();
  const rawPid = sel?.value || '';
  const pid = rawPid ? canonPatron(rawPid) : '';
  const filtered = DATA.cards.filter((c) => {
    const deck = canonPatron(c.patron);
    if (rawPid && deck !== pid) return false;
    if (q) {
      const p = patronRecord(deck);
      const hay = [c.name, c.playText, p.name, p.short, deck].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const grid = $('#ency-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const chrome = $('#encyclopedia header');
  const ency = $('#encyclopedia');
  if (ency && chrome) ency.style.setProperty('--ency-chrome', `${Math.round(chrome.getBoundingClientRect().height)}px`);
  const viewingAll = !rawPid;
  const groups = groupCardsByDeck(filtered);
  for (const g of groups) {
    if (!g.cards.length && !(viewingAll && g.id !== 'other')) continue;
    const section = document.createElement('section');
    section.className = `ency-deck deck-${g.id}`;
    section.dataset.deck = g.id;
    section.appendChild(encyPatronHead(g.id));
    const box = document.createElement('div');
    box.className = 'ency-deck-cards';
    for (const c of g.cards) {
      const deckLocked = canonPatron(c.patron) !== 'treasury' && !isDeckUnlocked(profile, c.patron);
      const el = document.createElement('div');
      el.className = 'ency-card' + (deckLocked ? ' deck-locked' : '');
      el.innerHTML = deckLocked
        ? `<div class="clue-unknown">?</div><div class="info"><strong>???</strong></div>`
        : `<img src="${artFor(c)}" alt="${c.name}" /><div class="info"><strong>${c.name}</strong>${c.cost} · ${c.type}${c.upgraded ? ' · ▲' : ''}</div>`;
      if (!deckLocked) el.addEventListener('click', () => showCardModal(c));
      box.appendChild(el);
    }
    section.appendChild(box);
    grid.appendChild(section);
  }
}

/* ——— Modes ——— */
function beginDeckPick(mode) {
  matchMode = mode;
  pickYou = []; pickOpp = []; pickPhase = 'you';
  isRandomMatch = false;
  isRankedMatch = mode === 'ranked' || isRankedMatch;
  isGauntletMatch = false;
  gauntletStopIndex = null;
  if (isRankedMatch) setHourglass(true);
  if ($('#chk-random-match')) $('#chk-random-match').checked = false;
  renderDeckPick();
  mountDiffSlider('#diff-slider-pick', '#diff-val-pick');
  paintDiffAll();
  const wrap = $('#diff-pick-wrap');
  const rankedPvp = isRankedMatch || mode === 'remote-host' || mode === 'remote-guest';
  if (wrap) wrap.style.display = mode === 'ai' && !isRankedMatch ? '' : 'none';
  document.body.classList.toggle('ranked-pvp-pick', !!isRankedMatch);
  show('#deckpick');
}

function renderRankedLobby() {
  profile = loadProfile();
  const r = profile.ranked || {};
  const crest = $('#ranked-crest');
  if (crest) crest.textContent = `${r.tier || 'Unranked'} · ${r.points || 0} pts`;
  const st = $('#ranked-status');
  if (st) {
    st.innerHTML = `<strong>${r.tier || 'Unranked'}</strong><p>${r.points || 0} points · placement left ${r.placementLeft ?? 5} · streak ${r.winStreak || 0}. Ranked is never vs AI.</p>`;
  }
}

function beginRanked() {
  isRankedMatch = true;
  setHourglass(true);
  rankedPeerPicks = [];
  renderRankedLobby();
  show('#ranked');
}

async function beginRankedHost() {
  const status = $('#ranked-lobby-status');
  if (status) status.textContent = 'Opening a ranked room…';
  net = await hostRoom();
  if (!net.ok) {
    if (status) status.textContent = `Remote unavailable: ${net.error}. Ranked does not fall back to AI.`;
    toast(net.error);
    return;
  }
  isRankedMatch = true;
  matchMode = 'remote-host';
  if (status) status.innerHTML = `Room <strong>${net.code}</strong> — waiting for a Roister.`;
  net.onMessage((msg) => {
    if (msg.type === 'peer-ready' || msg.type === 'hello') {
      if (status) status.textContent = `Guest joined ${net.code}. Choose your two patrons.`;
      beginRankedDeckPick();
    }
    if (msg.type === 'ranked-picks') {
      rankedPeerPicks = msg.patrons || [];
      updatePickStatus();
    }
    if (msg.type === 'action') applyRemoteAction(msg);
  });
}

async function beginRankedJoin() {
  const code = ($('#ranked-join-code').value || '').trim().toUpperCase();
  if (code.length < 4) { toast('Enter a 4-letter room code'); return; }
  const status = $('#ranked-lobby-status');
  if (status) status.textContent = `Joining ${code}…`;
  net = await joinRoom(code);
  if (!net.ok) {
    if (status) status.textContent = `Join failed: ${net.error}. Ranked does not fall back to AI.`;
    toast(net.error);
    return;
  }
  isRankedMatch = true;
  matchMode = 'remote-guest';
  net.send({ type: 'hello' });
  net.onMessage((msg) => {
    if (msg.type === 'ranked-picks') {
      rankedPeerPicks = msg.patrons || [];
      updatePickStatus();
    }
    if (msg.type === 'match-start') {
      pickYou = msg.pickYou;
      pickOpp = msg.pickOpp;
      startMatch();
    }
    if (msg.type === 'action') applyRemoteAction(msg);
  });
  beginRankedDeckPick();
}

function beginRankedDeckPick() {
  pickYou = [];
  pickOpp = [];
  rankedPeerPicks = rankedPeerPicks || [];
  beginDeckPick(matchMode === 'remote-guest' ? 'remote-guest' : 'remote-host');
  isRankedMatch = true;
  document.body.classList.add('ranked-pvp-pick');
  const hint = $('#deckpick-hint');
  if (hint) hint.innerHTML = 'Ranked — choose <strong>your</strong> two patrons. Your rival chooses theirs. No AI.';
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
    if (matchIsLive() && rootId === '#diff-slider-settings') return;
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

function renderGauntlet() {
  profile = loadProfile();
  const g = ensureGauntletDay(profile);
  const featured = todaysFeatured(profile);
  const cd = gauntletCooldownMs(g);
  const roadDone = (g.cursor || 0) >= (g.order?.length || 0);
  const markers = $('#gauntlet-markers');
  if (!markers) return;
  markers.innerHTML = '';
  const prev = g.lastId ? GAUNTLET_STOPS.find(s => s.id === g.lastId) : null;
  const from = prev || GAUNTLET_STOPS.find(s => s.id === 'highisle');
  GAUNTLET_STOPS.forEach((stop) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'g-marker';
    el.style.left = stop.x + '%';
    el.style.top = stop.y + '%';
    const showName = stop.id === featured.id || stop.id === g.lastId || stop.id === 'highisle';
    el.innerHTML = `<span class="g-pin"></span>${showName ? `<span class="g-name">${stop.name}</span>` : ''}`;
    el.title = stop.name;
    if (stop.id === 'highisle') el.classList.add('start');
    if ((g.clearedIds || []).includes(stop.id) || g.lastId === stop.id) el.classList.add('cleared');
    if (featured.id === stop.id && !roadDone) el.classList.add('current');
    el.addEventListener('click', () => {
      if (roadDone) { toast('Road cleared — a new path after NY midnight.'); return; }
      if (featured.id !== stop.id) { toast(`The road is at ${featured.name}`); return; }
      startGauntletStop(stop);
    });
    markers.appendChild(el);
  });
  const boat = roadCrossing(from?.id || 'highisle', featured.id);
  const traveler = $('#road-traveler');
  if (traveler) {
    traveler.hidden = false;
    traveler.textContent = boat ? '⛵' : '🐎';
    traveler.classList.toggle('boat', boat);
    const startAt = from || featured;
    traveler.style.left = startAt.x + '%';
    traveler.style.top = startAt.y + '%';
    requestAnimationFrame(() => {
      traveler.style.left = featured.x + '%';
      traveler.style.top = featured.y + '%';
    });
  }
  const st = $('#gauntlet-status');
  const btn = $('#btn-gauntlet-play');
  const via = boat ? 'by boat' : 'on horseback';
  const prize = roadGrandPrizePreview(profile);
  if (roadDone) {
    if (st) st.textContent = `Road cleared. Grand prize: ${prize.label}. A new road after NY midnight.`;
    if (btn) { btn.disabled = true; btn.textContent = 'Road complete'; }
  } else if (cd > 0) {
    if (st) st.textContent = `Lost — locked until NY midnight (${fmtCountdown(cd)}). The road waits at ${featured.name}.`;
    if (btn) { btn.disabled = true; btn.textContent = 'Locked today'; }
  } else {
    if (st) st.textContent = `Stop ${(g.cursor || 0) + 1}/${g.order?.length || 0}: ${featured.name} ${via} — vs ${featured.rival}. Win advances. Lose locks the day. Prize: ${prize.label}.`;
    if (btn) { btn.disabled = false; btn.textContent = `Ride to ${featured.name}`; }
  }
}

function startGauntletStop(stop) {
  if (typeof stop === 'number') stop = GAUNTLET_STOPS[stop];
  if (!stop) return;
  profile = loadProfile();
  const g = ensureGauntletDay(profile);
  const featured = todaysFeatured(profile);
  if ((g.cursor || 0) >= (g.order?.length || 0)) { toast('Road already cleared.'); return; }
  if (stop.id !== featured.id) { toast(`The road is at ${featured.name}`); return; }
  const cd = gauntletCooldownMs(g);
  if (cd > 0) { toast(`Locked until NY midnight (${fmtCountdown(cd)})`); return; }
  isGauntletMatch = true;
  isRankedMatch = false;
  isRandomMatch = false;
  gauntletStopIndex = GAUNTLET_STOPS.findIndex(s => s.id === stop.id);
  matchMode = 'ai';
  pickYou = [...stop.you];
  pickOpp = [...stop.opp];
  setHourglass(false);
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
    startGauntletStop(todaysFeatured(profile));
  });
  $('#btn-ranked').onclick = beginRanked;
  $('#btn-ranked-back')?.addEventListener('click', () => onSplashEnter());
  $('#btn-ranked-host')?.addEventListener('click', () => beginRankedHost());
  $('#btn-ranked-join')?.addEventListener('click', () => beginRankedJoin());
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
  $('#btn-collection')?.addEventListener('click', () => { storeReturnScreen = '#club'; renderCollection(); show('#collection'); });
  $('#btn-splash-collection')?.addEventListener('click', () => { storeReturnScreen = '#splash'; renderCollection(); show('#collection'); });
  $('#btn-collection-back')?.addEventListener('click', () => {
    if (storeReturnScreen === '#club') { renderClub(); show('#club'); }
    else onSplashEnter();
  });
  $$('.coll-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      setCollectionTab(btn.dataset.tab);
      renderCollection();
    });
  });
  const openStore = (from) => { storeReturnScreen = from; renderStore(); show('#store'); };
  $('#btn-store')?.addEventListener('click', () => openStore('#club'));
  $('#btn-splash-store')?.addEventListener('click', () => openStore('#splash'));
  $('#btn-store-back')?.addEventListener('click', () => {
    if (storeReturnScreen === '#club') { renderClub(); show('#club'); }
    else onSplashEnter();
  });
  $('#ency-patron').onchange = renderEncy;
  $('#ency-search').oninput = renderEncy;
  $('#btn-login-claim')?.addEventListener('click', () => claimLoginStamp());
  $('#btn-login-later')?.addEventListener('click', () => $('#login-overlay')?.classList.remove('show'));
  $('#btn-crate-open')?.addEventListener('click', () => doOpenCrate());
  $('#btn-crate-close')?.addEventListener('click', () => $('#crate-overlay')?.classList.remove('show'));

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

  $('#btn-sack-close')?.addEventListener('click', () => {
    $('#sack-overlay')?.classList.remove('show');
    refreshSplashPurse();
  });

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
    if (isRankedMatch) { toast('Ranked is player vs player — no random AI match.'); return; }
    matchMode = 'ai';
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
  $('#btn-match-sfx')?.addEventListener('click', () => {
    setSfxEnabled(!isSfxOn());
    syncSfxToggles();
    if (isSfxOn()) playSfx('tap');
  });
  const refitInspect = () => {
    if (!liftClone) return;
    const kind = liftClone._kind || (liftClone.classList.contains('inspect-coin') ? 'coin' : 'card');
    const hex = liftClone.querySelector('.lift-hex-fly');
    const text = liftClone.querySelector('.lift-text-fly');
    const m = inspectMetrics(kind);
    liftClone._to = { left: m.tx, top: m.ty, width: m.hexW, height: m.hexH };
    hex?.getAnimations?.().forEach((a) => a.cancel());
    applyInspectBox(hex, text, m);
  };
  window.addEventListener('resize', () => { syncBoardLayout(); refitInspect(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { syncBoardLayout(); refitInspect(); }, 160));
  window.visualViewport?.addEventListener('resize', () => { syncBoardLayout(); refitInspect(); });
  $('#btn-hand-done').onclick = () => {
    $('#hand-device-overlay').classList.remove('show');
    renderMatch();
    if (hourglassOn) startHourglass();
  };

  $('#btn-concede').onclick = () => {
    if (!engine) return;
    if (matchMode === 'ai' && !isRankedMatch) engine.state.winner = 1;
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
  $('#target-cancel')?.addEventListener('click', () => cancelTargetSession());
  $('#target-confirm')?.addEventListener('click', () => confirmTargetStep());
  $('#target-show-board')?.addEventListener('click', () => setTargetPeek(true));
  $('#target-return')?.addEventListener('click', () => setTargetPeek(false));
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
  $('#chk-settings-sfx')?.addEventListener('change', (e) => {
    setSfxEnabled(!!e.target.checked);
    syncSfxToggles();
    if (e.target.checked) playSfx('tap');
  });
  $('#sel-sfx')?.addEventListener('change', (e) => {
    setSfxStyle(e.target.value);
    playSfx('swipe');
  });
  $('#chk-settings-hourglass')?.addEventListener('change', (e) => {
    profile = loadProfile();
    profile.hourglassDefault = !!e.target.checked;
    saveProfile(profile);
    if (!matchIsLive()) setHourglass(profile.hourglassDefault);
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

function layoutMetrics() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
  };
  const match = box('#match');
  const board = box('#match .board');
  const felt = box('#match .felt-table');
  const tavern = box('#tavern-zone') || box('#match .felt-tavern');
  const band = box('#match .felt-tavern');
  const rail = box('#patron-rail');
  const youTok = box('#you-patron-calls');
  const oppTok = box('#opp-patron-calls');
  const hg = box('#btn-end');
  const cards = [...document.querySelectorAll('#tavern-zone .card')].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right };
  });
  const cardH = cards[0]?.h || 0;
  let overlap = 0;
  for (let i = 1; i < cards.length; i++) {
    overlap = Math.max(overlap, cards[i - 1].right - cards[i].x);
  }
  const oppHand = box('#match .felt-opp-hand');
  const youHand = box('#match .felt-you-hand');
  const feltW = felt?.w || board?.w || vw;
  const feltH = felt?.h || board?.h || vh;
  const tavernW = band?.w || tavern?.w || 0;
  const leftGutter = felt && tavern ? tavern.x - felt.x : 0;
  const rightGutter = felt && tavern ? felt.right - tavern.right : 0;
  const topBand = felt && oppHand ? Math.max(0, oppHand.y - felt.y) : 0;
  const botBand = felt && youHand ? Math.max(0, felt.bottom - youHand.bottom) : 0;
  const tokensStacked = !!(youTok && oppTok && hg
    && Math.abs(youTok.y - oppTok.y) < 36
    && Math.abs(youTok.x - oppTok.x) < 28
    && youTok.y > hg.y);
  const hiddenCards = cards.filter((c) => {
    const covered = rail ? Math.max(0, c.right - rail.x) : 0;
    return c.w > 0 && covered / c.w > 0.45;
  }).length;
  return {
    vw, vh,
    matchW: match?.w || 0,
    boardW: board?.w || 0,
    feltW,
    tavernW,
    tavernPct: feltW ? +(tavernW / feltW * 100).toFixed(1) : 0,
    viewportTavernPct: vw ? +(tavernW / vw * 100).toFixed(1) : 0,
    leftGutter: +leftGutter.toFixed(1),
    rightGutter: +rightGutter.toFixed(1),
    leftGutterPct: feltW ? +(leftGutter / feltW * 100).toFixed(1) : 0,
    rightGutterPct: feltW ? +(rightGutter / feltW * 100).toFixed(1) : 0,
    feltH,
    topBand: +topBand.toFixed(1),
    botBand: +botBand.toFixed(1),
    topBandPct: feltH ? +(topBand / feltH * 100).toFixed(1) : 0,
    botBandPct: feltH ? +(botBand / feltH * 100).toFixed(1) : 0,
    tavernDiscard: !!document.querySelector('#pile-tavern-discard'),
    medallions: document.querySelectorAll('#rail-patrons .medallion').length,
    pointedTips: document.querySelectorAll('#rail-patrons .token-point').length,
    cardCount: cards.length,
    cardH: +cardH.toFixed(1),
    cardOverlap: +overlap.toFixed(1),
    hiddenCards,
    cards: cards.map((c) => ({ x: +c.x.toFixed(0), w: +c.w.toFixed(0), h: +c.h.toFixed(0) })),
    railW: rail?.w || 0,
    tokensStacked,
    youTok, oppTok, hg,
  };
}

function installTestHook() {
  window.__totTest = {
    lastToast: () => lastToast,
    startQuick() {
      try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
      pickYou = ['pelin', 'hlaalu'];
      pickOpp = ['crows', 'celarus'];
      matchMode = 'ai';
      isRandomMatch = false;
      isRankedMatch = false;
      isGauntletMatch = false;
      startMatch({ playerFirst: true, difficulty: 1 });
    },
    snapshot() {
      const p = engine?.state?.players[0];
      const coins = [...document.querySelectorAll('#rail-patrons .patron-coin')].map(el => ({
        id: el.dataset.pid,
        side: el.dataset.side,
        favor: el.dataset.favor,
        tip: !!el.querySelector('.wood-tip, .token-point'),
        pip: !!el.querySelector('.favor-pip'),
        wood: !!el.querySelector('.wood-pendant, .wood-bar, .wood-name'),
        ring: !!el.querySelector('.coin-ring'),
        medallion: !!el.querySelector('.medallion'),
        tipless: el.classList.contains('tipless'),
        rot: getComputedStyle(el.querySelector('.token-dial') || el).transform,
      }));
      const cluster = $('#rail-patrons')?.getBoundingClientRect();
      const rail = $('#patron-rail')?.getBoundingClientRect();
      const felt = document.querySelector('#match .felt-table')?.getBoundingClientRect();
      const events = document.querySelector('#match .events-rail')?.getBoundingClientRect();
      const hg = document.querySelector('#btn-end')?.getBoundingClientRect();
      const gold = cardsById.gold;
      const harvest = cardsById['harvest-season'];
      return {
        hand: p?.hand?.length ?? 0,
        coin: p?.coin ?? 0,
        golds: p?.hand?.filter(c => c.id === 'gold').length ?? 0,
        played: p?.played?.length ?? 0,
        active: engine?.state?.active ?? null,
        phase: engine?.state?.phase ?? null,
        toast: lastToast,
        liftActive,
        liftLayer: !!document.querySelector('.lift-fly'),
        patronConfirm: !!$('#patron-confirm-overlay')?.classList.contains('show'),
        patronStates: [...document.querySelectorAll('#pc-states .pc-state')].map(el => el.dataset.state),
        patrons: coins,
        clusterH: cluster?.height || 0,
        railH: rail?.height || 0,
        glow: document.querySelectorAll('#match .card.playable, #match .card.affordable').length,
        piles: [...document.querySelectorAll('#match .hex-pile:not(.sr-pile)')].map(el => ({
          id: el.id,
          count: el.querySelector('.pile-count')?.textContent,
          vis: el.getBoundingClientRect().width > 20,
        })),
        pileBack: !!document.querySelector('#pile-you-draw .pile-stack'),
        pileEmpty: false,
        comboHexes: document.querySelectorAll('#events-list .event-hex').length,
        endGlow: !!document.querySelector('#btn-end.can-end'),
        scale: document.querySelector('#match .board')?.style.transform || '',
        goldTip: gold ? cardPlayLines(gold).join(' ') : '',
        harvestTip: harvest ? cardPlayLines(harvest).join(' ') : '',
        tavernCenter: !!(felt && document.querySelector('#tavern-zone') && (() => {
          const t = document.querySelector('#tavern-zone').getBoundingClientRect();
          return t.top > felt.top + felt.height * 0.18 && t.bottom < felt.bottom - felt.height * 0.18;
        })()),
        eventsOverlay: !!(felt && events && events.width < (felt.width || 1) * 0.2),
        hourglassY: hg ? Math.round(hg.top) : 0,
        hourglassMid: !!(felt && hg && hg.top < felt.top + felt.height * 0.72),
        midMatchHgToggle: !!document.querySelector('#btn-hg-toggle'),
        treasuryHasTip: coins.some(c => c.id === 'treasury' && c.tip),
        moraHasTip: coins.some(c => c.id === 'mora' && c.tip),
        tavernDiscard: !!document.querySelector('#pile-tavern-discard'),
        resPatronTok: !!document.querySelector('#you-res .tok-patron'),
        railPatronTok: !!document.querySelector('#you-patron-calls'),
        targeting: !!targetSession,
        targetPrompt: $('#target-prompt')?.textContent || '',
        targetBanner: !!$('#target-banner') && !$('#target-banner').hidden,
        legalGlow: document.querySelectorAll('#match .card.legal-target, .tray-card.legal-target').length,
        youCallsOnRail: !!document.querySelector('#patron-rail #you-patron-calls'),
        triadCount: document.querySelectorAll('#you-res .eso-tok').length,
        woodPendants: document.querySelectorAll('.wood-pendant, .wood-bar').length,
        coinRings: document.querySelectorAll('#rail-patrons .patron-coin .coin-ring').length,
        agentEmptyH: Math.max(0, ...[...document.querySelectorAll('#match .agent-slot.empty')].map(el => Math.round(el.getBoundingClientRect().height))),
        agentsRowH: Math.round(document.querySelector('#you-agents')?.getBoundingClientRect().height || 0),
        actionsOverlapPile: (() => {
          const acts = document.querySelector('#match .felt-hud-you')?.getBoundingClientRect();
          const piles = ['#pile-you-draw', '#pile-you-cd'].map(s => document.querySelector(s)?.getBoundingClientRect());
          if (!acts || acts.width < 4) return false;
          return piles.some((p) => p && !(acts.right < p.left || acts.left > p.right || acts.bottom < p.top || acts.top > p.bottom));
        })(),
        nativeShell: document.body.classList.contains('is-native'),
        layout: layoutMetrics(),
      };
    },
    layout: layoutMetrics,
    inspectById(id) {
      const d = cardsById[id];
      const el = document.querySelector('#hand-zone .card, #tavern-zone .card');
      if (!d || !el) return false;
      startLift(el, d);
      return liftActive;
    },
    inspectFit() {
      const hex = document.querySelector('.lift-hex-fly');
      const text = document.querySelector('.lift-text-fly');
      const tip = document.querySelector('.lift-text-fly .eso-tip-name');
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const slack = 2;
      const on = (r) => !!(r && r.width > 12 && r.height > 12
        && r.left >= -slack && r.top >= -slack
        && r.right <= vw + slack && r.bottom <= vh + slack);
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      return {
        vw: window.innerWidth,
        vh: window.innerHeight,
        vvw: window.visualViewport?.width || null,
        vvh: window.visualViewport?.height || null,
        metrics: liftClone?._kind ? inspectMetrics(liftClone._kind) : null,
        hex: box(hex),
        text: box(text),
        name: box(tip),
        hexOn: on(hex?.getBoundingClientRect()),
        textOn: on(text?.getBoundingClientRect()),
        nameOn: on(tip?.getBoundingClientRect()),
        tipText: text?.innerText || '',
      };
    },
    startTreasuryTarget() {
      const p = engine?.state?.players[0];
      if (!p) return { ok: false };
      p.coin = 4;
      p.patronCallsLeft = 1;
      if (!p.played.length) {
        const c = p.hand.find(x => x.id === 'gold') || p.hand[0];
        if (c) {
          p.hand = p.hand.filter(x => x.uid !== c.uid);
          p.played.push(c);
        }
      }
      renderMatch();
      const steps = engine.targetingStepsForPatron('treasury');
      beginTargetSession({
        steps,
        onDone: (picks) => finishPatronCall('treasury', picks),
      });
      return {
        ok: !!targetSession,
        steps: steps.map(s => s.kind),
        legal: engine.legalTargets(steps[0] || {}).length,
      };
    },
    clickTavernDeck() {
      document.querySelector('[data-pile="tavern-draw"]')?.click();
      return lastToast;
    },
    dossierFor(id) {
      const d = cardsById[id];
      return d ? dossierHTML(d) : '';
    },
    patronStates(pid) {
      return patronThreeStateHTML(pid);
    },
    clickDraw() {
      document.querySelector('[data-pile="you-draw"]')?.click();
      return lastToast;
    },
    playFirstGold() {
      const c = engine?.state?.players[0]?.hand.find(x => x.id === 'gold');
      if (!c) return false;
      engine.playCard(c.uid);
      renderMatch();
      return true;
    },
    tapCard(sel) {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch', clientX: 8, clientY: 8 }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'touch', clientX: 8, clientY: 8 }));
      return true;
    },
    zones() {
      const ids = ['#tavern-zone', '#you-agents', '#hand-zone', '#pile-you-draw', '#pile-you-cd', '#pile-tavern-draw', '#btn-end'];
      return Object.fromEntries(ids.map((id) => {
        const r = document.querySelector(id)?.getBoundingClientRect();
        return [id, r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null];
      }));
    },
    liftOpen: () => liftActive,
    rotateGate: () => false,
    portraitTip: () => !$('#landscape-tip')?.hidden,
    boardFill() {
      const b = document.querySelector('#match .board')?.getBoundingClientRect();
      const m = document.querySelector('#match')?.getBoundingClientRect();
      return { bw: Math.round(b?.width || 0), bh: Math.round(b?.height || 0), mw: Math.round(m?.width || 0), mh: Math.round(m?.height || 0) };
    },
  };
}

loadData().then(() => {
  applyNativeShell();
  profile = loadProfile();
  hourglassOn = !!profile.hourglassDefault;
  bind();
  mountDiffSlider('#diff-slider-settings', '#diff-val-settings');
  mountDiffSlider('#diff-slider-pick', '#diff-val-pick');
  paintDiffAll();
  warmMuted();
  setSfxStyle(getSfxStyle());
  setSfxEnabled(preferSfxFromStorage());
  updateMusicBtn();
  syncSfxToggles();
  if (preferMusicFromStorage()) setMusicEnabled(true);
  onSplashEnter();
  installTestHook();
}).catch(err => {
  console.error(err);
  const sub = $('#splash .subtitle');
  if (sub) sub.textContent = 'Failed to load card data: ' + err;
});
