/** Rotating shop, rarity, weekly + seasonal challenges. Unofficial fan themes. */
import { upgradesForPatron } from './upgrades.js';

/** ESO item-quality names (white / green / blue / purple / gold). */
export const RARITY_ORDER = ['common', 'fine', 'superior', 'epic', 'legendary'];
export const RARITY_LABEL = {
  common: 'Common',
  fine: 'Fine',
  superior: 'Superior',
  epic: 'Epic',
  legendary: 'Legendary',
};
export const RARITY_WEIGHT = {
  common: 10,
  fine: 6,
  superior: 3.2,
  epic: 1.4,
  legendary: 0.45,
};

/** Gold cost by kind × rarity. Fragments + cosmetics are the long coin sink. */
export const RARITY_PRICES = {
  fragment: { common: 280, fine: 480, superior: 780, epic: 1280, legendary: 2100 },
  upgrade: { common: 220, fine: 380, superior: 620, epic: 980, legendary: 1600 },
  clue: { common: 320, fine: 520, superior: 840, epic: 1300, legendary: 2000 },
  skin: { common: 720, fine: 1100, superior: 1680, epic: 2600, legendary: 3800 },
  back: { common: 560, fine: 880, superior: 1360, epic: 2100, legendary: 3000 },
};

/** Locked-patron fragment rarity. Mora sits at the top of the grind. */
export const DECK_RARITY = {
  hunding: 'common',
  redeagle: 'common',
  orgnum: 'fine',
  rajhin: 'fine',
  druid: 'superior',
  almalexia: 'superior',
  alessia: 'epic',
  mora: 'legendary',
};

export const SKIN_RARITY = {
  'high-isle': 'common',
  auridon: 'common',
  warden: 'common',
  nightblade: 'fine',
  grahtwood: 'fine',
  dragonknight: 'fine',
  clockwork: 'superior',
  orsinium: 'superior',
  vvardenfell: 'superior',
  arcanist: 'epic',
  daedra: 'epic',
  summerset: 'epic',
  undaunted: 'epic',
  'high-seas': 'epic',
  apocrypha: 'legendary',
  vestige: 'legendary',
  witches: 'legendary',
};

export const BACK_RARITY = {
  default: 'common',
  warden: 'common',
  nightblade: 'fine',
  dragonknight: 'fine',
  clockwork: 'superior',
  auridon: 'superior',
  daedra: 'epic',
  arcanist: 'epic',
  undaunted: 'epic',
  'high-seas': 'epic',
  apocrypha: 'legendary',
  vestige: 'legendary',
  witches: 'legendary',
};

export const SHOP_PERIOD_DAYS = 1;
export const SHOP_SKIN_SLOTS = 4;
export const SHOP_BACK_SLOTS = 4;
export const SHOP_FRAG_SLOTS = 1;
export const SHOP_FEATURED_SLOTS = 10;
export const SHOP_LATER_SLOTS = 0;
export const CLUES_TO_UPGRADE = 3;
export const BUNDLE_DISCOUNT = 0.88;
export const BUNDLE_CHANCE = 0.12;
export const CRATES_PER_MONTH = 2;

/** Starters first, then harder locked decks. Used by Collection → Card Clues. */
export const DECK_IMPORTANCE = [
  'pelin', 'crows', 'hlaalu', 'celarus',
  'hunding', 'redeagle', 'orgnum', 'rajhin',
  'druid', 'almalexia', 'alessia', 'mora',
  'treasury',
];

export const DECK_COLORS = {
  pelin: '#8b4513',
  crows: '#2f2f2f',
  hlaalu: '#c9a227',
  celarus: '#5b7c99',
  hunding: '#b87333',
  redeagle: '#8b1a1a',
  orgnum: '#1a6a6a',
  rajhin: '#7a4a8a',
  druid: '#3a7a3a',
  almalexia: '#b8860b',
  alessia: '#b8860b',
  mora: '#556b2f',
  treasury: '#c9a227',
};

export const FALLBACK_PATRONS = {
  mora: { id: 'mora', name: 'Hermaeus Mora', short: 'Mora', color: '#556b2f' },
  treasury: { id: 'treasury', name: 'The Treasury', short: 'Treasury', color: '#c9a227' },
};

const PATRON_CANON = {
  hermaeus_mora: 'mora', hermaeusmora: 'mora', mora: 'mora',
  saint_pelin: 'pelin', pelin: 'pelin',
  duke_of_crows: 'crows', crows: 'crows', blackfeather: 'crows',
  house_hlaalu: 'hlaalu', hlaalu: 'hlaalu',
  celarus: 'celarus', psijic: 'celarus',
  hunding: 'hunding',
  red_eagle: 'redeagle', redeagle: 'redeagle',
  orgnum: 'orgnum',
  rajhin: 'rajhin',
  druid_king: 'druid', druid: 'druid',
  almalexia: 'almalexia',
  saint_alessia: 'alessia', alessia: 'alessia',
  treasury: 'treasury', neutral: 'treasury',
};

export function canonPatron(id) {
  if (!id) return 'treasury';
  const k = String(id).toLowerCase().replace(/-/g, '_');
  return PATRON_CANON[k] || k;
}

const PATRON_NAMES = {
  pelin: 'Saint Pelin',
  crows: 'Duke of Crows',
  hlaalu: 'Grandmaster Delmene Hlaalu',
  celarus: 'Psijic Loremaster Celarus',
  hunding: 'Ansei Frandar Hunding',
  redeagle: 'Red Eagle',
  orgnum: 'Sorcerer-King Orgnum',
  rajhin: 'Rajhin',
  druid: 'The Druid King',
  almalexia: 'Almalexia',
  alessia: 'Saint Alessia',
  mora: 'Hermaeus Mora',
  treasury: 'Treasury',
};

/** Player-facing Patron name. Never a raw id. */
export function patronDisplayName(id) {
  if (!id) return 'a Patron';
  const key = canonPatron(id);
  return PATRON_NAMES[key] || PATRON_NAMES[id] || String(id);
}

export function sortCardsInDeck(cards = []) {
  return [...cards].sort((a, b) => {
    const as = a.starter ? 0 : 1;
    const bs = b.starter ? 0 : 1;
    if (as !== bs) return as - bs;
    if (!!a.contract !== !!b.contract) return a.contract ? 1 : -1;
    if (!!a.upgraded !== !!b.upgraded) return a.upgraded ? 1 : -1;
    return (a.cost || 0) - (b.cost || 0) || String(a.name).localeCompare(String(b.name));
  });
}

/** One scroll of All cards: groups in DECK_IMPORTANCE order. Mora + Treasury always listed. */
export function groupCardsByDeck(cards = []) {
  const buckets = Object.fromEntries(DECK_IMPORTANCE.map((id) => [id, []]));
  const other = [];
  for (const c of cards || []) {
    const id = canonPatron(c.patron);
    if (buckets[id]) buckets[id].push(c);
    else other.push(c);
  }
  return DECK_IMPORTANCE.map((id) => ({
    id,
    cards: sortCardsInDeck(buckets[id] || []),
  })).concat(other.length ? [{ id: 'other', cards: sortCardsInDeck(other) }] : []);
}

export const DECK_CAPTIONS = {
  pelin: 'The knight-errant banner — an initiate’s first table.',
  crows: 'Black feathers and stolen coin. Easy to love, hard to trust.',
  hlaalu: 'House ledgers and a smile that costs extra.',
  celarus: 'Psijic patience. The long thought before the play.',
  hunding: 'Sword-singers of the desert — common fragments, honest steel.',
  redeagle: 'Reach-witch red. A harder road than it looks.',
  orgnum: 'Maormer sails. Fine fragments, salt on the coins.',
  rajhin: 'The Purring Liar. What you bought was never yours.',
  druid: 'Systres green. Superior ink, slow to gather.',
  almalexia: 'Tribunal gold. Mercy has a price.',
  alessia: 'The Slave-Queen’s fire. Epic fragments only.',
  mora: 'Apocrypha. Legendary. You will not have him in a week.',
  treasury: 'Writs, gold, and the quiet tax of the tavern.',
};

export const MATCH_GOLD = {
  casualWin: 5,
  casualLoss: 1,
  rankedWin: 8,
  rankedLoss: 2,
};

export const CHECKIN_GOLD = 10;
export const CHECKIN_STREAK7_GOLD = 14;
export const PURSE_BUY_COST = 99999;

export const CRATE_VARIANTS = [
  { id: 'iron', name: 'Iron Crown Crate', rarity: 'common' },
  { id: 'orichalcum', name: 'Orichalcum Crown Crate', rarity: 'fine' },
  { id: 'ebony', name: 'Ebony Crown Crate', rarity: 'superior' },
  { id: 'voidsteel', name: 'Voidsteel Crown Crate', rarity: 'epic' },
];

/** Canonical crate row by id. Display name is not a loot-table key. */
export function resolveCrateVariant(variant) {
  if (!variant) return null;
  const id = typeof variant === 'string' ? variant : variant.id;
  if (!id) return null;
  const row = CRATE_VARIANTS.find((v) => v.id === id);
  return row ? { ...row } : null;
}

/**
 * Fan calendar of recurring ESO event *themes* (not an official schedule).
 * Mid-Sep 2026 → Undaunted Celebration. High Seas of Tamriel is Sep 30–Oct 14 2026.
 * Windows are month-day inclusive, America/New_York.
 */
export const SEASONS = [
  {
    id: 'new-life',
    name: 'New Life Festival',
    start: '12-20',
    end: '01-07',
    wrapYear: true,
    blurb: 'New Life — toasts, gifts, and a long table.',
    reward: { gold: 90, back: 'default', clues: 4 },
  },
  {
    id: 'jesters',
    name: "Jester's Festival",
    start: '03-20',
    end: '04-04',
    blurb: 'Jester’s Festival — pranks at the Club table.',
    reward: { gold: 80, clues: 5 },
  },
  {
    id: 'anniversary',
    name: 'Anniversary Jubilee',
    start: '04-05',
    end: '04-20',
    blurb: 'Anniversary Jubilee — a toast at the Club table.',
    reward: { gold: 100, purse: 'Superior' },
  },
  {
    id: 'zenithar',
    name: 'Zeal of Zenithar',
    start: '06-20',
    end: '07-08',
    blurb: 'Zeal of Zenithar — honest work, honest coin.',
    reward: { gold: 80, fragment: 'auto' },
  },
  {
    id: 'whitestrake',
    name: "Whitestrake's Mayhem",
    start: '07-20',
    end: '08-08',
    blurb: 'Whitestrake’s Mayhem — a loud table.',
    reward: { gold: 70, purse: 'Epic' },
  },
  {
    id: 'undaunted',
    name: 'Undaunted Celebration',
    start: '09-10',
    end: '09-29',
    blurb: 'Undaunted Celebration — dungeon grit at the Club.',
    reward: { skin: 'undaunted', gold: 80, clues: 3 },
  },
  {
    id: 'high-seas',
    name: 'High Seas of Tamriel',
    start: '09-30',
    end: '10-14',
    blurb: 'High Seas of Tamriel — salt, sailcloth, and Abecean gold.',
    reward: { skin: 'high-seas', back: 'high-seas', gold: 90 },
  },
  {
    id: 'witches',
    name: "Witches Festival",
    start: '10-20',
    end: '11-07',
    blurb: 'Witches Festival — crow-feather black and pumpkin-fire.',
    reward: { skin: 'witches', back: 'witches', gold: 100 },
  },
];

export const STARTER_CLUE_DECKS = ['pelin', 'crows', 'hlaalu', 'celarus', 'treasury'];

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nyParts(d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return { y: Number(get('year')), m: Number(get('month')), day: Number(get('day')) };
  } catch {
    return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() };
  }
}

export function nyDateStr(d = new Date()) {
  const { y, m, day } = nyParts(d);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** NY calendar day number (UTC midnight of that Y-M-D). */
export function nyDayNum(d = new Date()) {
  const { y, m, day } = nyParts(d);
  return Math.floor(Date.UTC(y, m - 1, day) / 86400000);
}

export function shopPeriodKey(d = new Date()) {
  return Math.floor(nyDayNum(d) / SHOP_PERIOD_DAYS);
}

export function weeklyKey(d = new Date()) {
  const { y, m, day } = nyParts(d);
  const utc = new Date(Date.UTC(y, m - 1, day));
  const dow = utc.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  utc.setUTCDate(utc.getUTCDate() + mondayOffset);
  return utc.toISOString().slice(0, 10);
}

export function msUntilNextNyMidnight(from = Date.now()) {
  const nowNy = nyDateStr(new Date(from));
  for (let h = 1; h <= 36; h++) {
    const t = from + h * 3600_000;
    if (nyDateStr(new Date(t)) !== nowNy) {
      let lo = from + (h - 1) * 3600_000;
      let hi = from + h * 3600_000;
      while (hi - lo > 1000) {
        const mid = Math.floor((lo + hi) / 2);
        if (nyDateStr(new Date(mid)) === nowNy) lo = mid;
        else hi = mid;
      }
      return Math.max(0, hi - from);
    }
  }
  return 12 * 3600_000;
}

export function msUntilShopRefresh(from = Date.now()) {
  const keyNow = shopPeriodKey(new Date(from));
  for (let h = 1; h <= 80; h++) {
    const t = from + h * 3600_000;
    if (shopPeriodKey(new Date(t)) !== keyNow) {
      let lo = from + (h - 1) * 3600_000;
      let hi = from + h * 3600_000;
      while (hi - lo > 1000) {
        const mid = Math.floor((lo + hi) / 2);
        if (shopPeriodKey(new Date(mid)) === keyNow) lo = mid;
        else hi = mid;
      }
      return Math.max(0, hi - from);
    }
  }
  return SHOP_PERIOD_DAYS * 24 * 3600_000;
}

export function msUntilWeeklyReset(from = Date.now()) {
  const keyNow = weeklyKey(new Date(from));
  for (let h = 1; h <= 200; h++) {
    const t = from + h * 3600_000;
    if (weeklyKey(new Date(t)) !== keyNow) {
      let lo = from + (h - 1) * 3600_000;
      let hi = from + h * 3600_000;
      while (hi - lo > 1000) {
        const mid = Math.floor((lo + hi) / 2);
        if (weeklyKey(new Date(mid)) === keyNow) lo = mid;
        else hi = mid;
      }
      return Math.max(0, hi - from);
    }
  }
  return 7 * 24 * 3600_000;
}

function md(d = new Date()) {
  const { m, day } = nyParts(d);
  return `${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inWindow(mdStr, start, end, wrapYear) {
  if (wrapYear) return mdStr >= start || mdStr <= end;
  return mdStr >= start && mdStr <= end;
}

export function currentSeason(d = new Date()) {
  const stamp = md(d);
  return SEASONS.find((s) => inWindow(stamp, s.start, s.end, s.wrapYear)) || null;
}

export function nextSeason(d = new Date()) {
  const stamp = md(d);
  const { y } = nyParts(d);
  const upcoming = [];
  for (const s of SEASONS) {
    if (s === currentSeason(d)) continue;
    let year = y;
    if (s.wrapYear) {
      if (stamp > s.end && stamp < s.start) year = y;
      else if (stamp > s.end) year = y;
    } else if (stamp > s.end) {
      year = y + 1;
    }
    const [sm, sd] = s.start.split('-').map(Number);
    const startUtc = Date.UTC(s.wrapYear && stamp > s.end && stamp < s.start ? y : year, sm - 1, sd);
    upcoming.push({ season: s, startUtc });
  }
  upcoming.sort((a, b) => a.startUtc - b.startUtc);
  return upcoming[0]?.season || SEASONS[0];
}

export function rarityOf(kind, id, cards = []) {
  if (kind === 'fragment') return DECK_RARITY[id] || 'fine';
  if (kind === 'skin') return SKIN_RARITY[id] || 'fine';
  if (kind === 'back') return BACK_RARITY[id] || 'fine';
  if (kind === 'upgrade' || kind === 'clue') {
    const card = cards.find((c) => c.id === id);
    return DECK_RARITY[card?.patron] || (STARTER_CLUE_DECKS.includes(card?.patron) ? 'common' : 'fine');
  }
  return 'fine';
}

export function priceOf(kind, id, cards = []) {
  const r = rarityOf(kind, id, cards);
  return RARITY_PRICES[kind]?.[r] ?? 200;
}

export function formatRarity(r) {
  return RARITY_LABEL[r] || RARITY_LABEL.fine;
}

function weightedPick(items, rng, weightFn) {
  const weights = items.map((it) => Math.max(0.01, weightFn(it)));
  const sum = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * sum;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickN(items, n, rng, weightFn) {
  const pool = [...items];
  const out = [];
  while (out.length < n && pool.length) {
    const it = weightedPick(pool, rng, weightFn);
    out.push(it);
    const idx = pool.indexOf(it);
    if (idx >= 0) pool.splice(idx, 1);
  }
  return out;
}

export function offerId(kind, target) {
  return `${kind}:${target}`;
}

function makeOffer(kind, target, cards) {
  const rarity = rarityOf(kind, target, cards);
  return {
    id: offerId(kind, target),
    kind,
    target,
    rarity,
    price: priceOf(kind, target, cards),
    stock: 1,
  };
}

/**
 * Daily sparse stock: ~4 skins, ~4 backs, 1 fragment (the fragment is the prize),
 * and rarely one expensive clue. Most of the catalog stays off the table.
 */
export function buildShopSlate({
  periodKey,
  skins = [],
  backs = [],
  lockedDecks = [],
  unlockedDecks = [],
  ownedUpgrades = [],
  ownedSkins = [],
  ownedBacks = [],
  ownedClues = {},
  cards = [],
  seasonId = null,
}) {
  const rng = mulberry32(hashStr(`tot-shop:${periodKey}`));
  const catalog = [];

  for (const deck of lockedDecks) {
    catalog.push(makeOffer('fragment', deck, cards));
  }
  for (const s of skins) {
    if (s.price <= 0) continue;
    if (s.seasonal && s.seasonal !== seasonId) continue;
    catalog.push(makeOffer('skin', s.id, cards));
  }
  for (const b of backs) {
    if (b.price <= 0) continue;
    if (b.seasonal && b.seasonal !== seasonId) continue;
    catalog.push(makeOffer('back', b.id, cards));
  }
  // Ownership does not change the day's stock. A purchase marks that offer sold out.
  const cluePool = (cards || []).filter((c) => c && c.id && !c.token && !c.curse);
  for (const c of cluePool) {
    catalog.push(makeOffer('clue', c.id, cards));
  }

  const w = (o) => RARITY_WEIGHT[o.rarity] || 1;
  const featured = [];
  const used = new Set();

  const take = (pred, n) => {
    const pool = catalog.filter((o) => pred(o) && !used.has(o.id));
    for (const o of pickN(pool, n, rng, w)) {
      featured.push(o);
      used.add(o.id);
    }
  };

  take((o) => o.kind === 'skin', SHOP_SKIN_SLOTS);
  take((o) => o.kind === 'back', SHOP_BACK_SLOTS);
  take((o) => o.kind === 'fragment', SHOP_FRAG_SLOTS);
  if (rng() < 0.32) take((o) => o.kind === 'clue', 1);

  const later = [];
  let bundle = null;
  if (rng() < BUNDLE_CHANCE) {
    const parts = pickN(
      featured.filter((o) => o.kind === 'skin' || o.kind === 'back' || o.kind === 'fragment'),
      2,
      rng,
      w,
    );
    if (parts.length === 2) {
      const raw = parts.reduce((s, o) => s + o.price, 0);
      bundle = {
        id: `bundle:${periodKey}:${parts.map((o) => o.target).join('+')}`,
        kind: 'bundle',
        parts,
        rarity: parts.some((o) => o.rarity === 'legendary' || o.rarity === 'epic') ? 'epic' : 'superior',
        price: Math.max(900, Math.round(raw * BUNDLE_DISCOUNT)),
        stock: 1,
      };
    }
  }

  return {
    periodKey,
    featured,
    later,
    bundle,
    catalogSize: catalog.length,
  };
}

export function shopContextFromProfile(profile, cards, skins, backs, lockedDecks) {
  const season = currentSeason();
  return {
    skins,
    backs,
    lockedDecks: lockedDecks.filter((d) => !profile.unlockedDecks.includes(d)),
    unlockedDecks: profile.unlockedDecks,
    ownedUpgrades: profile.ownedUpgrades,
    ownedSkins: profile.unlockedSkins,
    ownedBacks: profile.unlockedBacks,
    ownedClues: profile.cardClues || {},
    cards,
    seasonId: season?.id || null,
  };
}

export function tomorrowShopSlate(ctx) {
  return buildShopSlate({ ...ctx, periodKey: shopPeriodKey() + 1 });
}

export function nyAddDays(nyStr, n) {
  const [y, m, d] = String(nyStr).split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + n));
  return utc.toISOString().slice(0, 10);
}

export function loginMonthGrid(loginDays = {}, d = new Date()) {
  const { y, m } = nyParts(d);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const mondayPad = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = nyDateStr(d);
  const firstOk = Object.keys(loginDays)
    .filter((k) => loginDays[k] === 'ok' || loginDays[k] === true)
    .sort()[0] || today;
  const cells = [];
  for (let i = 0; i < mondayPad; i++) cells.push({ date: null, state: 'pad' });
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let state = 'future';
    if (date > today) state = 'future';
    else if (loginDays[date] === 'ok' || loginDays[date] === true) state = 'ok';
    else if (date < today && date >= firstOk) state = 'miss';
    else if (date < today) state = 'empty';
    else state = loginDays[date] ? 'ok' : 'today';
    const crate = crateDaysForMonth(y, m).includes(day);
    cells.push({ date, day, state, crate });
  }
  return { year: y, month: m, today, cells };
}

/**
 * One calendar cell. Claimed days carry a visible stamp, not an empty box.
 * `justStamped` matches the date that was just claimed so the hit animation can run.
 */
export function loginCellHtml(cell, { justStamped = null, claimable = false } = {}) {
  if (!cell || cell.state === 'pad') return '<div class="cal-day pad"></div>';
  const stamped = cell.state === 'ok';
  const classes = ['cal-day', cell.state];
  if (cell.crate) classes.push('crate');
  if (stamped) classes.push('stamped');
  if (stamped && justStamped && cell.date === justStamped) classes.push('just-stamped');
  if (claimable && cell.state === 'today') classes.push('claimable');
  const inner = stamped
    ? '<span class="day-stamp" aria-label="Stamped">STAMP</span>'
    : (cell.state === 'miss' ? '✕' : String(cell.day ?? ''));
  const date = cell.date || '';
  return `<div class="${classes.join(' ')}" title="${date}" data-date="${date}">${inner}</div>`;
}

export function crateDaysForMonth(y, m) {
  const rng = mulberry32(hashStr(`tot-crate:${y}-${String(m).padStart(2, '0')}`));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pool = [];
  for (let d = 5; d <= Math.max(6, daysInMonth - 2); d++) pool.push(d);
  if (pool.length < 2) return [7, 21];
  const a = pool[Math.floor(rng() * pool.length)];
  let b = pool[Math.floor(rng() * pool.length)];
  let guard = 0;
  while (b === a && guard++ < 20) b = pool[Math.floor(rng() * pool.length)];
  return [a, b].sort((x, z) => x - z);
}

export function crateVariantForDay(dateStr) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const days = crateDaysForMonth(y, mo);
  const idx = days.indexOf(d);
  if (idx < 0) return null;
  const rng = mulberry32(hashStr(`tot-crate-var:${dateStr}`));
  if (idx === 0) return CRATE_VARIANTS[rng() < 0.65 ? 0 : 1];
  return CRATE_VARIANTS[rng() < 0.7 ? 2 : 3];
}

export function isCrateDay(dateStr) {
  return !!crateVariantForDay(dateStr);
}

export function fillMissedLogins(loginDays, today) {
  const bag = { ...(loginDays || {}) };
  const keys = Object.keys(bag).filter((k) => bag[k] === 'ok' || bag[k] === true).sort();
  if (!keys.length) {
    bag[today] = 'ok';
    return bag;
  }
  let cursor = keys[0];
  while (cursor < today) {
    if (!bag[cursor]) bag[cursor] = 'miss';
    cursor = nyAddDays(cursor, 1);
  }
  bag[today] = 'ok';
  return bag;
}

export function baseCardsForDeck(cards, deckId) {
  return (cards || []).filter((c) =>
    c.patron === deckId && !c.token && !c.curse && (c.baseQty || 0) > 0
  );
}

export function deckCardSet(cards, deckId) {
  const want = canonPatron(deckId);
  return (cards || []).filter((c) =>
    canonPatron(c.patron) === want && !c.token && !c.curse
  ).sort((a, b) => {
    const as = a.starter ? 0 : 1;
    const bs = b.starter ? 0 : 1;
    if (as !== bs) return as - bs;
    if (!!a.upgraded !== !!b.upgraded) return a.upgraded ? 1 : -1;
    return (a.cost || 0) - (b.cost || 0) || String(a.name).localeCompare(String(b.name));
  });
}

export function clueCountOf(profile, cardId) {
  const v = profile.cardClues?.[cardId];
  if (typeof v === 'number') return v;
  if (v) return 1;
  return 0;
}

export function roadGrandPrize(roadId) {
  const rng = mulberry32(hashStr(`tot-road-prize:${roadId}`));
  const table = [
    { gold: 140, fragment: 'auto', purse: 'Epic', label: 'Epic purse + a fragment' },
    { gold: 110, clues: 6, purse: 'Superior', label: 'Superior purse + six clues' },
    { gold: 180, fragment: 'auto', label: 'A heavy purse of fragments' },
    { gold: 90, clues: 4, purse: 'Epic', label: 'Epic purse + lost pages' },
  ];
  return table[Math.floor(rng() * table.length)];
}

export function shopPurchasedSet(profile, periodKey) {
  const bag = profile.shopPurchases || {};
  return new Set(bag[String(periodKey)] || []);
}

export function markShopPurchase(profile, periodKey, offerIdStr) {
  if (!profile.shopPurchases || typeof profile.shopPurchases !== 'object') profile.shopPurchases = {};
  const key = String(periodKey);
  const list = Array.isArray(profile.shopPurchases[key]) ? profile.shopPurchases[key] : [];
  if (!list.includes(offerIdStr)) list.push(offerIdStr);
  profile.shopPurchases[key] = list;
  // keep only the current + previous period
  for (const k of Object.keys(profile.shopPurchases)) {
    if (Math.abs(Number(k) - periodKey) > 2) delete profile.shopPurchases[k];
  }
}

export function isOfferSoldOut(profile, periodKey, offerIdStr) {
  return shopPurchasedSet(profile, periodKey).has(offerIdStr);
}

const WEEKLY_POOL = [
  { type: 'win_matches', title: 'Club Victories', desc: 'Win {n} matches this week.', target: 5, reward: { gold: 45 } },
  { type: 'play_matches', title: 'Table Time', desc: 'Finish {n} matches (win or lose).', target: 8, reward: { gold: 30, clues: 2 } },
  { type: 'win_patron', title: 'Favored Champion', desc: 'Win a match with {patron} as one of your patrons.', target: 1, reward: { gold: 40, fragment: 'auto' } },
  { type: 'win_patron', title: 'Second Banner', desc: 'Win 2 matches with {patron} in your pair.', target: 2, reward: { gold: 55 } },
  { type: 'tavern_buy', title: 'Tavern Regular', desc: 'Buy {n} cards from the tavern.', target: 12, reward: { gold: 35, clues: 3 } },
  { type: 'patron_calls', title: 'Call the Hall', desc: 'Call patrons {n} times.', target: 18, reward: { gold: 40 } },
  { type: 'open_purses', title: 'Cutpurse Week', desc: 'Open {n} cutpurses.', target: 3, reward: { gold: 25, purse: 'Fine' } },
  { type: 'win_ranked', title: 'Ranked Blade', desc: 'Win {n} ranked matches.', target: 3, reward: { gold: 60, purse: 'Superior' } },
  { type: 'win_streak', title: 'Hot Streak', desc: 'Reach a {n}-win streak.', target: 3, reward: { gold: 50 } },
  { type: 'win_gauntlet', title: 'Province Claim', desc: 'Win a Challenge the Provinces stop.', target: 1, reward: { gold: 40, fragment: 'auto' } },
  { type: 'hard_wins', title: 'No Soft Hands', desc: 'Win {n} matches in ranked or at AI 7+.', target: 3, reward: { gold: 55 } },
];

const SEASONAL_GOALS = {
  undaunted: [
    { type: 'win_matches', title: "Pledge of the Blade", desc: 'Win 8 matches during the Undaunted theme.', target: 8, reward: { gold: 50 } },
    { type: 'patron_calls', title: 'Call the Banner', desc: 'Call patrons 40 times.', target: 40, reward: { gold: 40, clues: 3 } },
    { type: 'open_purses', title: "Delver's Purse", desc: 'Open 6 cutpurses.', target: 6, reward: { gold: 35, purse: 'Superior' } },
    { type: 'win_patrons_unique', title: 'Four Corners', desc: 'Win with 4 different patrons in your pair.', target: 4, reward: { gold: 60, fragment: 'auto' } },
    { type: 'hard_wins', title: 'Hard Mode', desc: 'Win 3 matches in ranked or at AI 7+.', target: 3, reward: { gold: 70 } },
  ],
  'high-seas': [
    { type: 'win_matches', title: 'Raise the Riotous Redress', desc: 'Win 8 matches on the High Seas theme.', target: 8, reward: { gold: 50 } },
    { type: 'tavern_buy', title: 'Abecean Bounty', desc: 'Buy 16 tavern cards.', target: 16, reward: { gold: 40, clues: 3 } },
    { type: 'win_patron', title: "Orgnum's Tide", desc: 'Win 3 matches with Orgnum if you have him — or any sea-side pair.', target: 3, reward: { gold: 55 }, preferPatron: 'orgnum' },
    { type: 'win_gauntlet', title: 'Chart the Coast', desc: 'Win 2 province stops.', target: 2, reward: { gold: 50, fragment: 'auto' } },
    { type: 'patron_calls', title: 'All Hands', desc: 'Call patrons 36 times.', target: 36, reward: { gold: 40 } },
  ],
  witches: [
    { type: 'win_matches', title: 'Crow-Wife Table', desc: 'Win 8 matches during Witches Festival.', target: 8, reward: { gold: 50 } },
    { type: 'win_patron', title: 'Red Eagle Night', desc: 'Win 3 matches with Red Eagle (or any locked witch-road patron).', target: 3, reward: { gold: 55 }, preferPatron: 'redeagle' },
    { type: 'open_purses', title: 'Plunder the Pumpkin', desc: 'Open 5 cutpurses.', target: 5, reward: { gold: 35, purse: 'Epic' } },
    { type: 'patron_calls', title: 'Circle of Crows', desc: 'Call patrons 30 times.', target: 30, reward: { gold: 40, clues: 4 } },
  ],
  jesters: [
    { type: 'win_matches', title: 'Royal Revelry', desc: 'Win 6 matches during Jester’s Festival.', target: 6, reward: { gold: 45 } },
    { type: 'tavern_buy', title: "The King's Spoils", desc: 'Buy 14 tavern cards.', target: 14, reward: { gold: 35, clues: 3 } },
    { type: 'win_streak', title: 'Prankster’s Carnival', desc: 'Reach a 4-win streak.', target: 4, reward: { gold: 60 } },
  ],
  'new-life': [
    { type: 'win_matches', title: 'New Life Toast', desc: 'Win 8 matches.', target: 8, reward: { gold: 50 } },
    { type: 'play_matches', title: 'Long Table', desc: 'Finish 10 matches.', target: 10, reward: { gold: 40, clues: 3 } },
    { type: 'open_purses', title: 'Gift Purse', desc: 'Open 4 cutpurses.', target: 4, reward: { gold: 30, purse: 'Fine' } },
  ],
  anniversary: [
    { type: 'win_matches', title: 'Jubilee Hands', desc: 'Win 8 matches.', target: 8, reward: { gold: 55 } },
    { type: 'win_patrons_unique', title: 'Every Banner', desc: 'Win with 5 different patrons.', target: 5, reward: { gold: 70, fragment: 'auto' } },
    { type: 'hard_wins', title: 'Seasoned Roister', desc: 'Win 4 ranked or AI 7+ matches.', target: 4, reward: { gold: 65 } },
  ],
  zenithar: [
    { type: 'tavern_buy', title: 'Honest Trade', desc: 'Buy 20 tavern cards.', target: 20, reward: { gold: 50 } },
    { type: 'win_matches', title: "Zenithar's Due", desc: 'Win 6 matches.', target: 6, reward: { gold: 40, fragment: 'auto' } },
    { type: 'play_matches', title: 'Work Week', desc: 'Finish 10 matches.', target: 10, reward: { gold: 35 } },
  ],
  whitestrake: [
    { type: 'win_matches', title: 'Pelinal’s March', desc: 'Win 10 matches.', target: 10, reward: { gold: 60 } },
    { type: 'win_patron', title: 'Saint’s Banner', desc: 'Win 3 matches with Saint Pelin.', target: 3, reward: { gold: 50 }, preferPatron: 'pelin' },
    { type: 'hard_wins', title: 'Mayhem', desc: 'Win 4 ranked or AI 7+ matches.', target: 4, reward: { gold: 70 } },
  ],
};

function fillDesc(tmpl, { n, patronName }) {
  return tmpl.replace('{n}', n).replace('{patron}', patronName || 'a patron');
}

function pickWeeklyPatron(rng, unlocked) {
  const pool = unlocked?.length ? unlocked : ['pelin', 'crows', 'hlaalu', 'celarus'];
  return pool[Math.floor(rng() * pool.length)];
}

export function buildWeeklyGoals(weekKey, profile = {}) {
  const rng = mulberry32(hashStr(`tot-week:${weekKey}`));
  const unlocked = profile.unlockedDecks || ['pelin', 'crows', 'hlaalu', 'celarus'];
  const pool = [...WEEKLY_POOL];
  const picked = [];
  while (picked.length < 4 && pool.length) {
    const i = Math.floor(rng() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked.map((def, idx) => {
    const patron = def.type === 'win_patron' ? pickWeeklyPatron(rng, unlocked) : null;
    return {
      id: `w-${weekKey}-${idx}-${def.type}`,
      type: def.type,
      title: def.title,
      desc: fillDesc(def.desc, { n: def.target, patronName: patron ? patronDisplayName(patron) : null }),
      target: def.target,
      progress: 0,
      claimed: false,
      reward: { ...def.reward },
      patron,
      seen: [],
    };
  });
}

export function buildSeasonalGoals(season, profile = {}) {
  const defs = SEASONAL_GOALS[season.id] || SEASONAL_GOALS.undaunted;
  const unlocked = profile.unlockedDecks || [];
  return defs.map((def, idx) => {
    let patron = def.preferPatron || null;
    if (def.type === 'win_patron') {
      if (patron && unlocked.includes(patron)) { /* keep */ }
      else if (patron && !unlocked.includes(patron)) {
        patron = unlocked[0] || patron;
      }
    }
    return {
      id: `s-${season.id}-${idx}-${def.type}`,
      type: def.type,
      title: def.title,
      desc: fillDesc(def.desc, { n: def.target, patronName: patron ? patronDisplayName(patron) : null }),
      target: def.target,
      progress: 0,
      claimed: false,
      reward: { ...def.reward },
      patron,
      seen: [],
    };
  });
}

export function bumpGoal(goal, ev) {
  if (!goal || goal.claimed) return;
  const before = goal.progress || 0;
  switch (goal.type) {
    case 'win_matches':
      if (ev.kind === 'win') goal.progress = before + 1;
      break;
    case 'play_matches':
      if (ev.kind === 'win' || ev.kind === 'loss') goal.progress = before + 1;
      break;
    case 'win_ranked':
      if (ev.kind === 'win' && ev.ranked) goal.progress = before + 1;
      break;
    case 'win_gauntlet':
      if (ev.kind === 'win' && ev.gauntlet) goal.progress = before + 1;
      break;
    case 'win_patron':
      if (ev.kind === 'win' && goal.patron && (ev.patrons || []).includes(goal.patron)) {
        goal.progress = before + 1;
      }
      break;
    case 'win_patrons_unique':
      if (ev.kind === 'win') {
        goal.seen = Array.isArray(goal.seen) ? goal.seen : [];
        for (const p of ev.patrons || []) {
          if (p && !goal.seen.includes(p)) goal.seen.push(p);
        }
        goal.progress = goal.seen.length;
      }
      break;
    case 'tavern_buy':
      if (ev.kind === 'buy') goal.progress = before + (ev.n || 1);
      break;
    case 'patron_calls':
      if (ev.kind === 'call') goal.progress = before + (ev.n || 1);
      break;
    case 'open_purses':
      if (ev.kind === 'purse') goal.progress = before + 1;
      break;
    case 'win_streak':
      if (ev.kind === 'win') goal.progress = Math.max(before, ev.winStreak || 0);
      break;
    case 'hard_wins':
      if (ev.kind === 'win' && (ev.ranked || (ev.aiDifficulty || 0) >= 7)) {
        goal.progress = before + 1;
      }
      break;
    default:
      break;
  }
  if (goal.progress > goal.target) goal.progress = goal.target;
}

export function applyChallengeEvent(profile, ev) {
  const weekly = profile.challenges?.weekly?.goals || [];
  const seasonal = profile.challenges?.seasonal?.goals || [];
  for (const g of weekly) bumpGoal(g, ev);
  for (const g of seasonal) bumpGoal(g, ev);
}

export function clueableCards(cards = []) {
  return cards.filter((c) => c && c.id && !c.token);
}

export function seedStarterClues(cards = []) {
  const o = {};
  for (const c of cards) {
    if (!c?.id) continue;
    if (STARTER_CLUE_DECKS.includes(c.patron) || c.id === 'gold' || c.id === 'writ-of-coin' || c.id === 'bewilderment') {
      o[c.id] = 1;
    }
  }
  return o;
}

export function countClues(profile, cards = []) {
  const clueable = clueableCards(cards);
  const have = clueable.filter((c) => profile.cardClues?.[c.id]).length;
  return { have, total: clueable.length };
}

export function grantCluePack(profile, cards = [], n = 2) {
  const unknown = clueableCards(cards).filter((c) => !profile.cardClues?.[c.id]);
  const granted = [];
  const rng = Math.random;
  const pool = [...unknown];
  while (granted.length < n && pool.length) {
    const i = Math.floor(rng() * pool.length);
    const c = pool.splice(i, 1)[0];
    profile.cardClues = profile.cardClues || {};
    profile.cardClues[c.id] = Math.max(clueCountOf({ cardClues: profile.cardClues }, c.id), 1);
    granted.push(c.id);
  }
  return granted;
}
