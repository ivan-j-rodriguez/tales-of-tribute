/** Roister's Club profile — gold, unlocks, purses, ranked, cosmetics. */
import { UPGRADE_TO_BASE, upgradesForPatron } from './upgrades.js';
import {
  MATCH_GOLD, CHECKIN_GOLD, CHECKIN_STREAK7_GOLD, PURSE_BUY_COST,
  priceOf, offerId, buildShopSlate, shopPeriodKey, weeklyKey,
  currentSeason, nextSeason, buildWeeklyGoals, buildSeasonalGoals,
  applyChallengeEvent, markShopPurchase, isOfferSoldOut,
  seedStarterClues, grantCluePack, nyDateStr as ecoNyDate,
  rarityOf, formatRarity, CLUES_TO_UPGRADE,
  shopContextFromProfile, fillMissedLogins, loginMonthGrid,
  clueCountOf, baseCardsForDeck, roadGrandPrize,
  crateVariantForDay, CRATES_PER_MONTH, resolveCrateVariant,
  patronDisplayName,
} from './economy.js';
import { BASE_TO_UPGRADE } from './upgrades.js';

export const PROFILE_KEY = 'tot_profile_v1';
export const STARTER_DECKS = ['pelin', 'crows', 'hlaalu', 'celarus'];
export const LOCKED_DECKS = ['hunding', 'redeagle', 'orgnum', 'rajhin', 'druid', 'almalexia', 'mora', 'alessia'];
export const ALL_DECKS = [...STARTER_DECKS, ...LOCKED_DECKS];
export const FRAGMENTS_TO_UNLOCK = 5;
export const SACK_BUY_COST = PURSE_BUY_COST;

export const RANK_TIERS = ['Unranked', 'Orichalcum', 'Ebony', 'Quicksilver', 'Voidsteel', 'Rubedite'];
export const RANK_THRESHOLDS = [0, 0, 100, 250, 450, 700]; // points to enter tier index

export const TABLE_SKINS = [
  { id: 'high-isle', name: 'High Isle', tag: 'Zone', price: 0, rarity: 'common', desc: 'Systres limestone, teal surf, and Breton gold.' },
  { id: 'auridon', name: 'Auridon', tag: 'Zone', price: 720, rarity: 'common', desc: 'Altmer marble and the azure Abecean.' },
  { id: 'warden', name: 'Warden', tag: 'Class', price: 720, rarity: 'common', desc: 'Frostpine grove — ice bloom over deep moss.' },
  { id: 'nightblade', name: 'Nightblade', tag: 'Class', price: 1100, rarity: 'fine', desc: 'Moonlight, void-purple, and a drop of blood.' },
  { id: 'grahtwood', name: 'Grahtwood', tag: 'Zone', price: 1100, rarity: 'fine', desc: 'Valenwood canopy — gold light through leaves.' },
  { id: 'dragonknight', name: 'Dragonknight', tag: 'Class', price: 1100, rarity: 'fine', desc: 'Molten stone and Red Mountain fire.' },
  { id: 'clockwork', name: 'Clockwork City', tag: 'Zone', price: 1680, rarity: 'superior', desc: 'Brass, copper oil, and ticking factotums.' },
  { id: 'orsinium', name: 'Orsinium', tag: 'Zone', price: 1680, rarity: 'superior', desc: 'Iron halls, frost, orichalcum green.' },
  { id: 'vvardenfell', name: 'Vvardenfell', tag: 'Zone', price: 1680, rarity: 'superior', desc: 'Ashfall, kwama amber, the mountain’s glow.' },
  { id: 'arcanist', name: 'Arcanist', tag: 'Class', price: 2600, rarity: 'epic', desc: 'Verdant ink, gold runes, the eye of Mora.' },
  { id: 'daedra', name: 'Coldharbour', tag: 'Zone', price: 2600, rarity: 'epic', desc: 'Soulfire cyan over Molag Bal’s grey waste.' },
  { id: 'summerset', name: 'Summerset', tag: 'Zone', price: 2600, rarity: 'epic', desc: 'Crystal Alinor — aurora over white-gold.' },
  { id: 'undaunted', name: 'Undaunted Enclave', tag: 'Season', price: 2600, rarity: 'epic', seasonal: 'undaunted', desc: 'Torchlight on dungeon stone — a fan nod to the Undaunted Celebration.' },
  { id: 'high-seas', name: 'Abecean Tide', tag: 'Season', price: 2600, rarity: 'epic', seasonal: 'high-seas', desc: 'Salt and sailcloth — a fan nod to High Seas of Tamriel.' },
  { id: 'apocrypha', name: 'Apocrypha', tag: 'Zone', price: 3800, rarity: 'legendary', desc: 'Black ink seas and watching green eyes.' },
  { id: 'vestige', name: 'Vestige', tag: 'Class', price: 3800, rarity: 'legendary', desc: 'Aetherial blue — a sky-shard on the table.' },
  { id: 'witches', name: "Witches' Revel", tag: 'Season', price: 3800, rarity: 'legendary', seasonal: 'witches', desc: 'Pumpkin-fire and crow-feather black — a fan nod to Witches Festival.' },
];

export const CARD_BACKS = [
  { id: 'default', name: 'Roister Back', price: 0, rarity: 'common', desc: 'Club gold on dark oak.' },
  { id: 'warden', name: 'Frostpine', price: 560, rarity: 'common', desc: 'Ice over living wood.' },
  { id: 'nightblade', name: 'Shadow Dance', price: 880, rarity: 'fine', desc: 'Void and crimson.' },
  { id: 'dragonknight', name: 'Ember Scale', price: 880, rarity: 'fine', desc: 'Lava-cracked hide.' },
  { id: 'clockwork', name: 'Brass Circuit', price: 1360, rarity: 'superior', desc: 'Sotha Sil’s geometry.' },
  { id: 'auridon', name: 'Altmer Sun', price: 1360, rarity: 'superior', desc: 'Pale gold of Firsthold.' },
  { id: 'daedra', name: 'Soulfire', price: 2100, rarity: 'epic', desc: 'Coldharbour cyan.' },
  { id: 'arcanist', name: 'Ink & Eye', price: 2100, rarity: 'epic', desc: 'Apocryphal gold runes.' },
  { id: 'undaunted', name: 'Enclave Brand', price: 2100, rarity: 'epic', seasonal: 'undaunted', desc: 'Undaunted bronze on dungeon iron.' },
  { id: 'high-seas', name: 'Tide Sigil', price: 2100, rarity: 'epic', seasonal: 'high-seas', desc: 'A wave-cut Abecean seal.' },
  { id: 'apocrypha', name: 'Green Eye', price: 3000, rarity: 'legendary', desc: 'Hermaeus Mora’s gaze.' },
  { id: 'vestige', name: 'Aetherial', price: 3000, rarity: 'legendary', desc: 'Sky-shard glow.' },
  { id: 'witches', name: 'Crow Feather', price: 3000, rarity: 'legendary', seasonal: 'witches', desc: 'Witches Festival black and ember.' },
];

/** Live felt colors. High Isle matches the board’s default teal so the starter skin does not repaint jr’s felt. */
export const SKIN_FELT = {
  'high-isle': { felt: '#0d2a28', deep: '#061614' },
  auridon: { felt: '#1a2c28', deep: '#0c1816' },
  grahtwood: { felt: '#142410', deep: '#081208' },
  vvardenfell: { felt: '#22140e', deep: '#100806' },
  summerset: { felt: '#161828', deep: '#0a0c18' },
  clockwork: { felt: '#14140c', deep: '#080806' },
  apocrypha: { felt: '#06140c', deep: '#020806' },
  daedra: { felt: '#10141c', deep: '#06080e' },
  orsinium: { felt: '#16181c', deep: '#0a0c10' },
  vestige: { felt: '#101828', deep: '#060c18' },
  nightblade: { felt: '#14081a', deep: '#06030a' },
  arcanist: { felt: '#0a1810', deep: '#03100a' },
  warden: { felt: '#0c241c', deep: '#061410' },
  dragonknight: { felt: '#1a0a08', deep: '#0a0404' },
  undaunted: { felt: '#1a1410', deep: '#0e0a08' },
  'high-seas': { felt: '#0a2430', deep: '#041018' },
  witches: { felt: '#18080c', deep: '#0a0406' },
};

export const CARD_BACK_PALETTE = {
  default: ['#1a1008', '#d4af37'],
  nightblade: ['#120818', '#c44'],
  warden: ['#0a1614', '#7ec8d8'],
  dragonknight: ['#1a0a08', '#e06020'],
  clockwork: ['#1a1810', '#c9a227'],
  auridon: ['#141810', '#e8d080'],
  daedra: ['#0c1018', '#4ec8e8'],
  arcanist: ['#08140c', '#d4af37'],
  apocrypha: ['#0a1810', '#3a9050'],
  vestige: ['#101828', '#60a0ff'],
  undaunted: ['#1a1410', '#c9a06a'],
  'high-seas': ['#061820', '#3ec8d8'],
  witches: ['#14080a', '#e07020'],
};

/** CSS url() for the equipped card back. Default keeps the shared SVG; others are a colored back that still says card-back. */
export function cardBackAssetUrl(backId = 'default') {
  if (!backId || backId === 'default') return "url('../assets/ui/card-back.svg')";
  const pal = CARD_BACK_PALETTE[backId] || CARD_BACK_PALETTE.default;
  const hue = pal[0];
  const accent = pal[1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 308" role="img" aria-label="card-back ${backId}"><rect width="200" height="308" rx="14" fill="${hue}"/><rect x="12" y="12" width="176" height="284" rx="10" fill="none" stroke="${accent}" stroke-width="7"/><circle cx="100" cy="146" r="40" fill="none" stroke="${accent}" stroke-width="4"/><text x="100" y="152" text-anchor="middle" fill="${accent}" font-size="16" font-family="Georgia">card-back</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** What the live match should show for the equipped table and deck back. */
export function liveCosmetic(profile) {
  const skinId = TABLE_SKINS.some((s) => s.id === profile?.tableSkin) ? profile.tableSkin : 'high-isle';
  const backId = CARD_BACKS.some((b) => b.id === profile?.cardBack) ? profile.cardBack : 'default';
  const felt = SKIN_FELT[skinId] || SKIN_FELT['high-isle'];
  const pal = CARD_BACK_PALETTE[backId] || CARD_BACK_PALETTE.default;
  return {
    skinId,
    backId,
    skinClass: `skin-${skinId}`,
    felt: felt.felt,
    feltDeep: felt.deep,
    backHue: pal[0],
    backAccent: pal[1],
    cardBack: cardBackAssetUrl(backId),
  };
}

function needCoin(n) {
  return { error: `Need ${n} Coin.` };
}

/** @deprecated use priceOf('fragment'|'upgrade', id) — kept so old UI strings fail closed. */
export const STORE_FRAGMENT_COST = 140;
export const STORE_UPGRADE_COST = 180;

export const PURSE_RARITIES = ['Common', 'Fine', 'Superior', 'Epic', 'Legendary'];

export const ACHIEVEMENTS = [
  { id: 'first-win', name: 'First Victory', desc: 'Win your first match.', reward: { gold: 20 } },
  { id: 'win-3-random-in-a-row', name: 'Lucky Streak', desc: 'Win 3 random matches in a row.', reward: { gold: 30, purses: 1 } },
  { id: 'win-10', name: 'Seasoned Roister', desc: 'Win 10 matches.', reward: { gold: 50 } },
  { id: 'win-25', name: 'Club Fixture', desc: 'Win 25 matches.', reward: { gold: 70 } },
  { id: 'win-50', name: 'Table Legend', desc: 'Win 50 matches.', reward: { gold: 100, purse: 'Superior' } },
  { id: 'streak-5', name: 'Five in a Row', desc: 'Reach a 5-win streak.', reward: { gold: 40, purses: 1 } },
  { id: 'streak-10', name: 'Unbroken', desc: 'Reach a 10-win streak.', reward: { gold: 80, purse: 'Epic' } },
  { id: 'rematch-revenge', name: 'Rematch Revenge', desc: 'Beat a patron pair that just beat you.', reward: { gold: 35 } },
  { id: 'check-in-7', name: 'Club Regular', desc: 'Reach a 7-day check-in streak.', reward: { purses: 1, gold: 25 } },
  { id: 'unlock-second-deck', name: 'New Patron', desc: 'Unlock a deck beyond the Initiate four.', reward: { gold: 25 } },
  { id: 'unlock-three-decks', name: 'Patron Collector', desc: 'Unlock 3 decks beyond the Initiate four.', reward: { gold: 50 } },
  { id: 'unlock-all-decks', name: 'Hall of Twelve', desc: 'Unlock every patron deck.', reward: { gold: 150, purse: 'Legendary' } },
  { id: 'open-10-sacks', name: 'Heavy Hauler', desc: 'Open 10 cutpurses.', reward: { gold: 40 } },
  { id: 'upgrade-a-starter-card', name: 'Polished Steel', desc: 'Own an upgrade from a starter deck.', reward: { gold: 15 } },
  { id: 'clues-30', name: 'Ink-Stained', desc: 'Find clues for 30 cards.', reward: { gold: 30 } },
  { id: 'clues-80', name: 'Seeker’s Shelf', desc: 'Find clues for 80 cards.', reward: { gold: 60, clues: 4 } },
  { id: 'ranked-orichalcum', name: 'Orichalcum Blade', desc: 'Reach Orichalcum ranked tier.', reward: { gold: 40 } },
  { id: 'unlock-mora', name: 'Seeker of Secrets', desc: 'Unlock Hermaeus Mora.', reward: { gold: 60 } },
  { id: 'road-clear', name: 'Road’s End', desc: 'Clear a Challenge the Provinces road.', reward: { gold: 80, purse: 'Epic' } },
];

function todayStr() {
  return ecoNyDate();
}
function yesterdayStr() {
  const today = ecoNyDate();
  for (let h = 20; h <= 40; h++) {
    const s = ecoNyDate(new Date(Date.now() - h * 3600_000));
    if (s !== today) return s;
  }
  const d = new Date(Date.now() - 24 * 3600_000);
  return ecoNyDate(d);
}
function emptyFragments() {
  const o = {};
  for (const id of LOCKED_DECKS) o[id] = 0;
  return o;
}

export function defaultProfile() {
  return {
    gold: 60,
    unlockedDecks: [...STARTER_DECKS],
    ownedUpgrades: [],
    deckFragments: emptyFragments(),
    tableSkin: 'high-isle',
    cardBack: 'default',
    unlockedSkins: ['high-isle'],
    unlockedBacks: ['default'],
    hourglassDefault: false,
    showBotCards: false,
    aiDifficulty: 5,
    gauntlet: {
      date: null, roadId: null, order: [], cursor: 0, clearedIds: [],
      lockedDate: null, lastPlayAt: 0, lastId: null, prizeClaimedRoad: null,
      failed: false, failedStop: null, cleared: 0,
    },
    ranked: { tier: 'Unranked', points: 0, placementLeft: 5, winStreak: 0 },
    purses: [],
    cratesMonth: null,
    cratesOpened: 0,
    pendingCrate: null,
    pendingMatchReward: null,
    lastCheckIn: null,
    checkInStreak: 0,
    loginDays: {},
    lastLossKey: null,
    lastMatch: null,
    winStreak: 0,
    randomWinStreak: 0,
    stats: { wins: 0, losses: 0, matches: 0, sacksOpened: 0, tavernBuys: 0, patronCalls: 0 },
    achievements: {},
    challenges: {
      dailyWin: { progress: 0, target: 2, claimed: false, resetDate: todayStr() },
      streak3: { progress: 0, target: 3, claimed: false },
      weekly: { weekKey: null, goals: [] },
      seasonal: { seasonId: null, year: null, goals: [], seasonClaimed: false },
    },
    cardClues: {},
    shopPurchases: {},
    permissions: { mic: false },
    updatedAt: 0,
    // legacy alias
    sacks: 0,
  };
}

let profileSaveHook = null;
export function setProfileSaveHook(fn) {
  profileSaveHook = typeof fn === 'function' ? fn : null;
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      const p = defaultProfile();
      saveProfile(p);
      return p;
    }
    const parsed = JSON.parse(raw);
    const p = { ...defaultProfile(), ...parsed };
    p.unlockedDecks = Array.isArray(p.unlockedDecks) ? p.unlockedDecks : [...STARTER_DECKS];
    p.ownedUpgrades = Array.isArray(p.ownedUpgrades) ? p.ownedUpgrades : [];
    p.deckFragments = { ...emptyFragments(), ...(p.deckFragments || {}) };
    p.unlockedSkins = Array.isArray(p.unlockedSkins) ? p.unlockedSkins : ['high-isle'];
    p.unlockedBacks = Array.isArray(p.unlockedBacks) ? p.unlockedBacks : ['default'];
    p.tableSkin = p.tableSkin || 'high-isle';
    p.cardBack = p.cardBack || 'default';
    p.hourglassDefault = !!p.hourglassDefault;
    p.showBotCards = !!p.showBotCards;
    p.aiDifficulty = Math.max(1, Math.min(10, Math.round(p.aiDifficulty || 5)));
    p.gauntlet = {
      date: null, roadId: null, order: [], cursor: 0, clearedIds: [],
      lockedDate: null, lastPlayAt: 0, lastId: null, prizeClaimedRoad: null,
      failed: false, failedStop: null, cleared: 0,
      ...(p.gauntlet || {}),
    };
    p.loginDays = p.loginDays && typeof p.loginDays === 'object' ? p.loginDays : {};
    p.lastLossKey = p.lastLossKey || null;
    p.lastMatch = p.lastMatch || null;
    p.ranked = { tier: 'Unranked', points: 0, placementLeft: 5, winStreak: 0, ...(p.ranked || {}) };
    p.purses = Array.isArray(p.purses) ? p.purses : [];
    // migrate legacy sacks → purses
    if (typeof p.sacks === 'number' && p.sacks > 0 && p.purses.length === 0) {
      for (let i = 0; i < p.sacks; i++) p.purses.push({ rarity: 'Common' });
      p.sacks = 0;
    }
    p.stats = { wins: 0, losses: 0, matches: 0, sacksOpened: 0, tavernBuys: 0, patronCalls: 0, ...(p.stats || {}) };
    p.achievements = p.achievements || {};
    p.challenges = {
      dailyWin: { progress: 0, target: 2, claimed: false, resetDate: todayStr(), ...(p.challenges?.dailyWin || {}) },
      streak3: { progress: 0, target: 3, claimed: false, ...(p.challenges?.streak3 || {}) },
      weekly: { weekKey: null, goals: [], ...(p.challenges?.weekly || {}) },
      seasonal: { seasonId: null, year: null, goals: [], seasonClaimed: false, ...(p.challenges?.seasonal || {}) },
    };
    p.cardClues = p.cardClues && typeof p.cardClues === 'object' ? p.cardClues : {};
    p.shopPurchases = p.shopPurchases && typeof p.shopPurchases === 'object' ? p.shopPurchases : {};
    p.cratesMonth = p.cratesMonth || null;
    p.cratesOpened = Number(p.cratesOpened) || 0;
    p.pendingCrate = resolveCrateVariant(p.pendingCrate);
    p.pendingMatchReward = p.pendingMatchReward || null;
    p.permissions = { mic: false, ...(p.permissions || {}) };
    p.updatedAt = Number(p.updatedAt) || 0;
    if (typeof p.gold !== 'number') p.gold = 60;
    if (!p.unlockedSkins.includes('high-isle')) p.unlockedSkins.push('high-isle');
    if (!p.unlockedBacks.includes('default')) p.unlockedBacks.push('default');
    return p;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p) {
  if (p && typeof p === 'object') p.updatedAt = Date.now();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  try { profileSaveHook?.(p); } catch {}
}

export function ensureWeeklyChallenges(profile) {
  const key = weeklyKey();
  if (!profile.challenges.weekly) profile.challenges.weekly = { weekKey: null, goals: [] };
  if (profile.challenges.weekly.weekKey !== key || !profile.challenges.weekly.goals?.length) {
    profile.challenges.weekly = { weekKey: key, goals: buildWeeklyGoals(key, profile) };
    saveProfile(profile);
  }
  return profile.challenges.weekly;
}

export function ensureSeasonalChallenges(profile) {
  const season = currentSeason();
  if (!profile.challenges.seasonal) {
    profile.challenges.seasonal = { seasonId: null, year: null, goals: [], seasonClaimed: false };
  }
  const year = Number(ecoNyDate().slice(0, 4));
  if (!season) return { season: null, next: nextSeason(), state: profile.challenges.seasonal };
  if (profile.challenges.seasonal.seasonId !== season.id || profile.challenges.seasonal.year !== year
      || !profile.challenges.seasonal.goals?.length) {
    profile.challenges.seasonal = {
      seasonId: season.id,
      year,
      goals: buildSeasonalGoals(season, profile),
      seasonClaimed: false,
    };
    saveProfile(profile);
  }
  return { season, next: nextSeason(), state: profile.challenges.seasonal };
}

export function ensureCardClues(profile, cards = []) {
  if (!profile.cardClues || typeof profile.cardClues !== 'object') profile.cardClues = {};
  if (!Object.keys(profile.cardClues).length && cards.length) {
    profile.cardClues = seedStarterClues(cards);
    saveProfile(profile);
  }
  return profile.cardClues;
}

export function ensureClubMeta(profile, cards = []) {
  ensureDailyChallengeReset(profile);
  ensureWeeklyChallenges(profile);
  ensureSeasonalChallenges(profile);
  ensureCardClues(profile, cards);
  return profile;
}

export function currentShop(profile, cards = [], when) {
  const ctx = shopContextFromProfile(profile, cards, TABLE_SKINS, CARD_BACKS, LOCKED_DECKS);
  const periodKey = typeof when === 'number' ? when : shopPeriodKey(when);
  const today = buildShopSlate({ ...ctx, periodKey });
  const tomorrow = buildShopSlate({ ...ctx, periodKey: periodKey + 1 });
  return { ...today, tomorrow };
}

export function deckReadyToUnlock(profile, deckId, cards = []) {
  if (profile.unlockedDecks.includes(deckId)) return true;
  if ((profile.deckFragments[deckId] || 0) < FRAGMENTS_TO_UNLOCK) return false;
  const bases = baseCardsForDeck(cards, deckId);
  if (!bases.length) return (profile.deckFragments[deckId] || 0) >= FRAGMENTS_TO_UNLOCK;
  return bases.every((c) => clueCountOf(profile, c.id) >= 1);
}

export function tryUnlockDeck(profile, deckId, cards = []) {
  if (profile.unlockedDecks.includes(deckId)) return { unlocked: false, already: true };
  if (!deckReadyToUnlock(profile, deckId, cards)) {
    return {
      unlocked: false,
      fragments: profile.deckFragments[deckId] || 0,
      needCards: true,
    };
  }
  profile.unlockedDecks.push(deckId);
  const extras = profile.unlockedDecks.filter((d) => !STARTER_DECKS.includes(d));
  maybeUnlockAchievement(profile, 'unlock-second-deck', extras.length >= 1);
  maybeUnlockAchievement(profile, 'unlock-three-decks', extras.length >= 3);
  maybeUnlockAchievement(profile, 'unlock-all-decks', extras.length >= LOCKED_DECKS.length);
  if (deckId === 'mora') maybeUnlockAchievement(profile, 'unlock-mora', true);
  saveProfile(profile);
  return { unlocked: true, fragments: profile.deckFragments[deckId] || 0 };
}

export function addCardClue(profile, cardId, cards = []) {
  if (!cardId) return { added: false };
  if (!profile.cardClues) profile.cardClues = {};
  const cur = clueCountOf(profile, cardId);
  if (cur >= CLUES_TO_UPGRADE) return { added: false, count: cur };
  profile.cardClues[cardId] = cur + 1;
  const count = profile.cardClues[cardId];
  let upgradeId = null;
  if (count >= CLUES_TO_UPGRADE) {
    upgradeId = BASE_TO_UPGRADE[cardId] || (UPGRADE_TO_BASE[cardId] ? cardId : null);
    if (upgradeId && !profile.ownedUpgrades.includes(upgradeId) && UPGRADE_TO_BASE[upgradeId]) {
      addUpgrade(profile, upgradeId);
    } else {
      upgradeId = null;
    }
  }
  const card = (cards || []).find((c) => c.id === cardId);
  let deckUnlock = null;
  if (card?.patron && LOCKED_DECKS.includes(card.patron)) {
    deckUnlock = tryUnlockDeck(profile, card.patron, cards);
  }
  const found = Object.keys(profile.cardClues).filter((id) => clueCountOf(profile, id) >= 1).length;
  maybeUnlockAchievement(profile, 'clues-30', found >= 30);
  maybeUnlockAchievement(profile, 'clues-80', found >= 80);
  saveProfile(profile);
  return { added: true, count, upgradeId, deckUnlock };
}

export function discoverCards(profile, ids = [], cards = []) {
  let n = 0;
  let upgradeId = null;
  for (const id of ids) {
    const r = addCardClue(profile, id, cards);
    if (r.added) n += 1;
    if (r.upgradeId) upgradeId = r.upgradeId;
  }
  return { n, upgradeId };
}

export function noteClubEvent(profile, ev) {
  if (!profile) return;
  ensureWeeklyChallenges(profile);
  ensureSeasonalChallenges(profile);
  if (ev.kind === 'buy') profile.stats.tavernBuys = (profile.stats.tavernBuys || 0) + (ev.n || 1);
  if (ev.kind === 'call') profile.stats.patronCalls = (profile.stats.patronCalls || 0) + (ev.n || 1);
  applyChallengeEvent(profile, ev);
  saveProfile(profile);
}

function pickAutoFragment(profile) {
  const locked = LOCKED_DECKS.filter((d) => !profile.unlockedDecks.includes(d));
  if (!locked.length) return null;
  locked.sort((a, b) => (profile.deckFragments[b] || 0) - (profile.deckFragments[a] || 0));
  const close = locked.filter((d) => (profile.deckFragments[d] || 0) > 0);
  return (close[0] || locked[0]);
}

export function grantReward(profile, reward = {}, cards = []) {
  const granted = { ...reward };
  if (reward.gold) profile.gold += reward.gold;
  if (reward.purses) {
    for (let i = 0; i < reward.purses; i++) profile.purses.push({ rarity: reward.purse || 'Fine' });
  } else if (reward.purse) {
    profile.purses.push({ rarity: reward.purse });
  }
  if (reward.fragment) {
    const deck = reward.fragment === 'auto' ? pickAutoFragment(profile) : reward.fragment;
    if (deck) {
      const r = addFragment(profile, deck, cards);
      granted.fragment = deck;
      granted.fragmentResult = r;
    }
  }
  if (reward.skin && !profile.unlockedSkins.includes(reward.skin)) {
    profile.unlockedSkins.push(reward.skin);
    profile.tableSkin = reward.skin;
  }
  if (reward.back && reward.back !== 'default' && !profile.unlockedBacks.includes(reward.back)) {
    profile.unlockedBacks.push(reward.back);
    profile.cardBack = reward.back;
  }
  if (reward.clues) {
    granted.clueIds = grantCluePack(profile, cards, reward.clues);
  }
  saveProfile(profile);
  return granted;
}

export function claimWeeklyGoal(profile, goalId, cards = []) {
  ensureWeeklyChallenges(profile);
  const g = profile.challenges.weekly.goals.find((x) => x.id === goalId);
  if (!g || g.claimed || (g.progress || 0) < g.target) return null;
  g.claimed = true;
  return grantReward(profile, g.reward, cards);
}

export function claimSeasonalGoal(profile, goalId, cards = []) {
  const { season, state } = ensureSeasonalChallenges(profile);
  if (!season) return null;
  const g = state.goals.find((x) => x.id === goalId);
  if (!g || g.claimed || (g.progress || 0) < g.target) return null;
  g.claimed = true;
  return grantReward(profile, g.reward, cards);
}

export function claimSeasonComplete(profile, cards = []) {
  const { season, state } = ensureSeasonalChallenges(profile);
  if (!season || state.seasonClaimed) return null;
  const allDone = (state.goals || []).every((g) => g.claimed || (g.progress || 0) >= g.target);
  if (!allDone) return null;
  for (const g of state.goals) g.claimed = true;
  state.seasonClaimed = true;
  return grantReward(profile, season.reward, cards);
}

export function isDeckUnlocked(profile, deckId) {
  if (deckId === 'treasury') return true;
  return profile.unlockedDecks.includes(deckId);
}

/**
 * Collection lock hides a patron's name outside a match.
 * A patron sitting on the live table is already in the game, rival deck
 * included, so the confirm and the hold-inspect dossier use the real name.
 */
export function patronIdentityOpen(profile, pid, { inMatch = false, onTable = false } = {}) {
  if (!pid) return false;
  if (pid === 'treasury') return true;
  if (inMatch && onTable) return true;
  if (!profile?.unlockedDecks) return false;
  return isDeckUnlocked(profile, pid);
}

export function fragmentProgress(profile, deckId) {
  return profile.deckFragments[deckId] || 0;
}

export function purseCount(profile) {
  return (profile.purses || []).length;
}

function monthKey(dateStr = todayStr()) {
  return String(dateStr).slice(0, 7);
}

export function syncCrateMonth(profile, today = todayStr()) {
  const mk = monthKey(today);
  if (profile.cratesMonth !== mk) {
    const prev = profile.cratesMonth;
    profile.cratesMonth = mk;
    profile.cratesOpened = 0;
    if (prev) profile.pendingCrate = null;
  }
  return profile;
}

export function canClaimDailyLogin(profile) {
  return profile.lastCheckIn !== todayStr();
}

/** Daily sign-in — only when the player stamps the calendar. */
export function claimDailyLogin(profile, cards = []) {
  const today = todayStr();
  if (profile.lastCheckIn === today) return { error: 'Already stamped today.' };
  syncCrateMonth(profile, today);
  const yest = yesterdayStr();
  if (profile.lastCheckIn === yest) profile.checkInStreak = (profile.checkInStreak || 0) + 1;
  else profile.checkInStreak = 1;
  profile.lastCheckIn = today;
  profile.loginDays = fillMissedLogins(profile.loginDays, today);
  let gold = CHECKIN_GOLD;
  let extra = '';
  if (profile.checkInStreak >= 7 && profile.checkInStreak % 7 === 0) {
    gold += CHECKIN_STREAK7_GOLD;
    extra = ' Streak bonus.';
  }
  profile.gold += gold;
  const dw = profile.challenges.dailyWin;
  if (dw.resetDate !== today) {
    dw.progress = 0;
    dw.claimed = false;
    dw.resetDate = today;
  }
  maybeUnlockAchievement(profile, 'check-in-7', profile.checkInStreak >= 7);
  let crateOffer = resolveCrateVariant(profile.pendingCrate);
  if (!crateOffer) {
    const crate = crateVariantForDay(today);
    if (crate && (profile.cratesOpened || 0) < CRATES_PER_MONTH) {
      crateOffer = resolveCrateVariant(crate);
      profile.pendingCrate = crateOffer;
    }
  }
  saveProfile(profile);
  return {
    profile,
    toast: 'The Club stamped your calendar.' + extra,
    granted: { gold, crate: crateOffer },
    crate: crateOffer,
  };
}

/** @deprecated use claimDailyLogin — auto-claim is gone. */
export function doDailyCheckIn() {
  return null;
}

export function ensureDailyChallengeReset(profile) {
  const today = todayStr();
  const dw = profile.challenges.dailyWin;
  if (dw.resetDate !== today) {
    dw.progress = 0;
    dw.claimed = false;
    dw.resetDate = today;
    saveProfile(profile);
  }
}

function maybeUnlockAchievement(profile, id, condition) {
  if (!condition || profile.achievements[id]) return false;
  profile.achievements[id] = new Date().toISOString();
  return true;
}

export function claimAchievement(profile, id, cards = []) {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def || !profile.achievements[id]) return null;
  const key = `claimed_${id}`;
  if (profile.achievements[key]) return null;
  profile.achievements[key] = true;
  return grantReward(profile, def.reward, cards);
}

export function claimDailyChallenge(profile) {
  const dw = profile.challenges.dailyWin;
  if (dw.claimed || dw.progress < dw.target) return null;
  dw.claimed = true;
  profile.gold += 12;
  saveProfile(profile);
  return { gold: 12 };
}

export function rarityFromStreak(streak, ranked = false) {
  const s = streak || 0;
  if (ranked) {
    if (s >= 5) return 'Legendary';
    if (s >= 4) return 'Epic';
    if (s >= 3) return 'Superior';
    if (s >= 2) return 'Fine';
    return 'Common';
  }
  if (s >= 4) return 'Epic';
  if (s >= 3) return 'Superior';
  if (s >= 2) return 'Fine';
  return 'Common';
}

function tierIndex(name) {
  const i = RANK_TIERS.indexOf(name);
  return i < 0 ? 0 : i;
}

function syncTierFromPoints(ranked) {
  let tier = 'Unranked';
  if (ranked.placementLeft <= 0) {
    for (let i = RANK_TIERS.length - 1; i >= 1; i--) {
      if (ranked.points >= RANK_THRESHOLDS[i]) {
        tier = RANK_TIERS[i];
        break;
      }
    }
    if (tier === 'Unranked') tier = 'Orichalcum';
  }
  ranked.tier = tier;
}

/** Record end of a match. */
export function recordMatchResult(profile, {
  won, isRandom = false, ranked = false, skipGold = false,
  patrons = [], rivalPatrons = [], gauntlet = false, aiDifficulty = 0,
} = {}) {
  profile.stats.matches += 1;
  let purse = null;
  const winGold = ranked ? MATCH_GOLD.rankedWin : MATCH_GOLD.casualWin;
  const lossGold = ranked ? MATCH_GOLD.rankedLoss : MATCH_GOLD.casualLoss;
  if (won) {
    profile.stats.wins += 1;
    profile.winStreak = (profile.winStreak || 0) + 1;
    /* gold is granted in claimMatchReward after Continue → purse */
    if (isRandom) {
      profile.randomWinStreak = (profile.randomWinStreak || 0) + 1;
      profile.challenges.streak3.progress = profile.randomWinStreak;
      maybeUnlockAchievement(profile, 'win-3-random-in-a-row', profile.randomWinStreak >= 3);
    }
    ensureDailyChallengeReset(profile);
    profile.challenges.dailyWin.progress = Math.min(
      profile.challenges.dailyWin.target,
      (profile.challenges.dailyWin.progress || 0) + 1
    );
    maybeUnlockAchievement(profile, 'first-win', true);
    maybeUnlockAchievement(profile, 'win-10', profile.stats.wins >= 10);
    maybeUnlockAchievement(profile, 'win-25', profile.stats.wins >= 25);
    maybeUnlockAchievement(profile, 'win-50', profile.stats.wins >= 50);
    maybeUnlockAchievement(profile, 'streak-5', profile.winStreak >= 5);
    maybeUnlockAchievement(profile, 'streak-10', profile.winStreak >= 10);
    const oppKey = (rivalPatrons || []).slice().sort().join('+');
    if (profile.lastLossKey && oppKey && profile.lastLossKey === oppKey) {
      maybeUnlockAchievement(profile, 'rematch-revenge', true);
    }
    profile.lastMatch = { won: true, patrons: [...(patrons || [])], rivalPatrons: [...(rivalPatrons || [])] };
    profile.lastLossKey = null;

    if (ranked) {
      const r = profile.ranked;
      r.winStreak = (r.winStreak || 0) + 1;
      if (r.placementLeft > 0) {
        r.placementLeft -= 1;
        r.points += 25;
      } else {
        r.points += 18 + Math.min(12, r.winStreak * 2);
      }
      syncTierFromPoints(r);
      maybeUnlockAchievement(profile, 'ranked-orichalcum', r.tier !== 'Unranked');
      purse = { rarity: rarityFromStreak(r.winStreak, true) };
    } else if (!gauntlet && (Math.random() < 0.20 || profile.winStreak >= 3)) {
      purse = { rarity: rarityFromStreak(profile.winStreak, false) };
    }

    noteClubEvent(profile, {
      kind: 'win',
      ranked,
      gauntlet,
      patrons,
      aiDifficulty,
      winStreak: profile.winStreak,
    });
    const pending = {
      won: true,
      empty: false,
      gold: skipGold ? 0 : winGold,
      purse,
      ranked: profile.ranked,
    };
    profile.pendingMatchReward = pending;
    saveProfile(profile);
    return {
      gold: pending.gold,
      purse,
      winStreak: profile.winStreak,
      ranked: profile.ranked,
      pending,
    };
  }

  profile.stats.losses += 1;
  profile.winStreak = 0;
  profile.lastLossKey = (rivalPatrons || []).slice().sort().join('+') || profile.lastLossKey;
  profile.lastMatch = { won: false, patrons: [...(patrons || [])], rivalPatrons: [...(rivalPatrons || [])] };
  if (isRandom) profile.randomWinStreak = 0;
  profile.challenges.streak3.progress = profile.randomWinStreak || 0;
  if (ranked) {
    const r = profile.ranked;
    r.winStreak = 0;
    if (r.placementLeft > 0) r.placementLeft -= 1;
    else r.points = Math.max(0, r.points - 8);
    syncTierFromPoints(r);
  }
  noteClubEvent(profile, { kind: 'loss', ranked, gauntlet, patrons, aiDifficulty });
  const pending = {
    won: false,
    empty: true,
    gold: skipGold ? 0 : lossGold,
    purse: null,
    ranked: profile.ranked,
  };
  profile.pendingMatchReward = pending;
  saveProfile(profile);
  return { gold: pending.gold, purse: null, winStreak: 0, ranked: profile.ranked, pending };
}

export function claimMatchReward(profile, cards = []) {
  const pending = profile.pendingMatchReward;
  if (!pending) return { empty: true, gold: 0, rewards: [] };
  profile.pendingMatchReward = null;
  if (pending.gold) profile.gold += pending.gold;
  const rewards = [];
  if (pending.gold) {
    rewards.push({ type: 'gold', amount: pending.gold, label: `${pending.gold} Coin` });
  }
  if (pending.won && pending.purse) {
    profile.purses.push(pending.purse);
    const opened = openPurse(profile, cards, { buy: false });
    if (opened.reward) rewards.push(opened.reward);
  }
  saveProfile(profile);
  return {
    empty: !!pending.empty,
    won: !!pending.won,
    gold: pending.gold || 0,
    rarity: pending.purse?.rarity || (pending.won ? 'Common' : 'Empty'),
    rewards,
    pending,
  };
}

export function addUpgrade(profile, upgradeId) {
  if (!profile.ownedUpgrades.includes(upgradeId)) {
    profile.ownedUpgrades.push(upgradeId);
    maybeUnlockAchievement(profile, 'upgrade-a-starter-card', true);
  }
  saveProfile(profile);
}

export function addFragment(profile, deckId, cards = []) {
  if (profile.unlockedDecks.includes(deckId)) return { unlocked: false, fragments: FRAGMENTS_TO_UNLOCK };
  const cur = (profile.deckFragments[deckId] || 0) + 1;
  profile.deckFragments[deckId] = Math.min(FRAGMENTS_TO_UNLOCK, cur);
  const gate = tryUnlockDeck(profile, deckId, cards);
  saveProfile(profile);
  return {
    unlocked: !!gate.unlocked,
    fragments: profile.deckFragments[deckId],
    needCards: !!gate.needCards && !gate.unlocked,
  };
}

function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}
function pick(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function rarityRollBias(rarity) {
  const key = String(rarity || '').toLowerCase();
  const map = { common: 0, fine: 1, superior: 2, epic: 3, legendary: 4 };
  return map[key] || 0;
}

/**
 * Open the next queued cutpurse from a won match.
 */
export function openPurse(profile, cards, opts = {}) {
  let rarity = 'Common';
  if (profile.purses.length > 0) {
    const p = profile.purses.shift();
    rarity = p.rarity || 'Common';
  } else {
    return { error: 'No purse waiting — win a match.' };
  }

  profile.stats.sacksOpened = (profile.stats.sacksOpened || 0) + 1;
  maybeUnlockAchievement(profile, 'open-10-sacks', profile.stats.sacksOpened >= 10);

  const bias = rarityRollBias(rarity);
  const roll = Math.random();
  let reward;

  const unownedUpgrades = () => {
    const ids = [];
    for (const deck of profile.unlockedDecks) {
      for (const uid of upgradesForPatron(cards, deck)) {
        if (!profile.ownedUpgrades.includes(uid)) ids.push(uid);
      }
    }
    return ids;
  };
  const lockedDecks = LOCKED_DECKS.filter(d => !profile.unlockedDecks.includes(d));
  const lockedSkins = TABLE_SKINS.filter(s => s.price > 0 && !profile.unlockedSkins.includes(s.id));
  const lockedBacks = CARD_BACKS.filter(b => b.price > 0 && !profile.unlockedBacks.includes(b.id));

  const goldFallback = () => {
    const base = 15 + bias * 12;
    const g = randInt(base, base + 30 + bias * 20);
    profile.gold += g;
    return { type: 'gold', amount: g, label: `${g} Coin`, rarity };
  };

  // Legendary / Epic skew toward cosmetics + fragments
  if (bias >= 3 && roll < 0.25 && lockedSkins.length) {
    const skin = pick(lockedSkins);
    profile.unlockedSkins.push(skin.id);
    reward = { type: 'skin', id: skin.id, label: `Table skin: ${skin.name}`, rarity };
  } else if (bias >= 2 && roll < 0.35 && lockedBacks.length) {
    const back = pick(lockedBacks);
    profile.unlockedBacks.push(back.id);
    reward = { type: 'back', id: back.id, label: `Card back: ${back.name}`, rarity };
  } else if (roll < 0.42 - bias * 0.05) {
    reward = goldFallback();
  } else if (roll < 0.68) {
    const ups = unownedUpgrades();
    if (ups.length) {
      const id = pick(ups);
      addUpgrade(profile, id);
      const name = cards.find(c => c.id === id)?.name || id;
      reward = { type: 'upgrade', id, label: `Upgrade: ${name}`, rarity };
    } else reward = goldFallback();
  } else if (roll < 0.90 || bias >= 2) {
    if (lockedDecks.length) {
      // slight Mora weight on Epic+
      let deck = pick(lockedDecks);
      if (bias >= 3 && lockedDecks.includes('mora') && Math.random() < 0.4) deck = 'mora';
      const r = addFragment(profile, deck, cards);
      reward = {
        type: 'fragment',
        deck,
        fragments: r.fragments,
        unlocked: r.unlocked,
        rarity,
        label: r.unlocked
          ? `Deck unlocked: ${patronDisplayName(deck)}!`
          : r.needCards
            ? `Fragment: ${patronDisplayName(deck)} (${r.fragments}/${FRAGMENTS_TO_UNLOCK}) — still need every card clue`
            : `Fragment: ${patronDisplayName(deck)} (${r.fragments}/${FRAGMENTS_TO_UNLOCK})`,
      };
    } else reward = goldFallback();
  } else {
    profile.gold += 80 + bias * 40;
    reward = { type: 'jackpot', gold: 80 + bias * 40, label: `Jackpot! ${80 + bias * 40} Coin`, rarity };
  }

  if (reward?.id) discoverCards(profile, [reward.id]);
  if (reward?.deck) { /* fragment already recorded */ }
  noteClubEvent(profile, { kind: 'purse' });
  saveProfile(profile);
  return { reward, profile, rarity };
}

/** @deprecated alias */
export function openSack(profile, cards, opts = {}) {
  return openPurse(profile, cards, opts);
}

export function buySack() {
  return { error: 'Purses are won at the table — they cannot be bought.' };
}

export function buyClue(profile, cardId, cards = [], opts = {}) {
  let gate = null;
  if (!opts.ignoreShop) {
    gate = assertShopStock(profile, cards, 'clue', cardId, opts);
    if (gate.error) return gate;
  }
  const cost = priceOf('clue', cardId, cards);
  if (profile.gold < cost) return needCoin(cost);
  profile.gold -= cost;
  const r = addCardClue(profile, cardId, cards);
  if (!opts.ignoreShop) markShopPurchase(profile, gate.slate.periodKey, gate.id);
  saveProfile(profile);
  return { ok: true, ...r, cost };
}

export function openCrownCrate(profile, cards = [], variant = null) {
  syncCrateMonth(profile);
  if ((profile.cratesOpened || 0) >= CRATES_PER_MONTH) {
    return { error: 'Two seasonal crates a month — the Club is not a crate farm.' };
  }
  const crate = resolveCrateVariant(variant) || resolveCrateVariant(profile.pendingCrate);
  if (!crate) return { error: 'No seasonal crate waiting.' };
  profile.cratesOpened = (profile.cratesOpened || 0) + 1;
  profile.pendingCrate = null;
  const bias = rarityRollBias(crate.rarity);
  const roll = Math.random();
  const lockedDecks = LOCKED_DECKS.filter((d) => !profile.unlockedDecks.includes(d));
  const lockedSkins = TABLE_SKINS.filter((s) => s.price > 0 && !profile.unlockedSkins.includes(s.id));
  const lockedBacks = CARD_BACKS.filter((b) => b.price > 0 && !profile.unlockedBacks.includes(b.id));
  let reward;
  if (roll < 0.42) {
    const g = 18 + bias * 10 + Math.floor(Math.random() * (16 + bias * 8));
    profile.gold += g;
    reward = { type: 'gold', amount: g, label: `${g} Coin`, rarity: crate.rarity };
  } else if (roll < 0.68) {
    const granted = grantCluePack(profile, cards, 1);
    const id = granted[0];
    const name = cards.find((c) => c.id === id)?.name || 'a lost page';
    reward = { type: 'clue', id, label: `Card clue: ${name}`, rarity: crate.rarity };
  } else if (roll < 0.88 && lockedDecks.length) {
    const deck = lockedDecks[Math.floor(Math.random() * lockedDecks.length)];
    const r = addFragment(profile, deck, cards);
    reward = {
      type: 'fragment',
      deck,
      fragments: r.fragments,
      unlocked: r.unlocked,
      rarity: crate.rarity,
      label: r.unlocked ? `Deck unlocked: ${patronDisplayName(deck)}` : `Fragment: ${patronDisplayName(deck)} (${r.fragments}/${FRAGMENTS_TO_UNLOCK})`,
    };
  } else if (roll < 0.96 && lockedBacks.length) {
    const back = lockedBacks[Math.floor(Math.random() * lockedBacks.length)];
    profile.unlockedBacks.push(back.id);
    profile.cardBack = back.id;
    reward = { type: 'back', id: back.id, label: `Card back: ${back.name}`, rarity: crate.rarity };
  } else if (lockedSkins.length && bias >= 2) {
    const skin = lockedSkins[Math.floor(Math.random() * lockedSkins.length)];
    profile.unlockedSkins.push(skin.id);
    profile.tableSkin = skin.id;
    reward = { type: 'skin', id: skin.id, label: `Table: ${skin.name}`, rarity: crate.rarity };
  } else {
    const g = 22 + bias * 8;
    profile.gold += g;
    reward = { type: 'gold', amount: g, label: `${g} Coin`, rarity: crate.rarity };
  }
  saveProfile(profile);
  return { reward, crate, rarity: crate.rarity };
}

function assertShopStock(profile, cards, kind, target, opts = {}) {
  const slate = currentShop(profile, cards, opts.periodKey);
  const id = offerId(kind, target);
  const onSlate = slate.featured.find((o) => o.id === id);
  if (!onSlate) return { error: 'Not in today’s shop — check back later.' };
  if (isOfferSoldOut(profile, slate.periodKey, id)) {
    return { error: 'Sold out until the shop refreshes.' };
  }
  return { slate, id };
}

export function buyFragment(profile, deckId, cards = [], opts = {}) {
  if (profile.unlockedDecks.includes(deckId)) return { error: 'Already unlocked.' };
  if (!LOCKED_DECKS.includes(deckId)) return { error: 'Invalid deck.' };
  let gate = null;
  if (!opts.ignoreShop) {
    gate = assertShopStock(profile, cards, 'fragment', deckId, opts);
    if (gate.error) return gate;
  }
  const cost = priceOf('fragment', deckId);
  if (profile.gold < cost) return needCoin(cost);
  profile.gold -= cost;
  const r = addFragment(profile, deckId, cards);
  if (!opts.ignoreShop) markShopPurchase(profile, gate.slate.periodKey, gate.id);
  saveProfile(profile);
  return { ok: true, ...r, cost };
}

export function buyUpgrade(profile, upgradeId, cards, opts = {}) {
  if (profile.ownedUpgrades.includes(upgradeId)) return { error: 'Already owned.' };
  const base = UPGRADE_TO_BASE[upgradeId];
  if (!base) return { error: 'Unknown upgrade.' };
  const card = cards.find(c => c.id === upgradeId);
  const patron = card?.patron;
  if (patron && !isDeckUnlocked(profile, patron)) return { error: 'Unlock the deck first.' };
  let gate = null;
  if (!opts.ignoreShop) {
    gate = assertShopStock(profile, cards, 'upgrade', upgradeId, opts);
    if (gate.error) return gate;
  }
  const cost = priceOf('upgrade', upgradeId, cards);
  if (profile.gold < cost) return needCoin(cost);
  profile.gold -= cost;
  addUpgrade(profile, upgradeId);
  if (!opts.ignoreShop) markShopPurchase(profile, gate.slate.periodKey, gate.id);
  saveProfile(profile);
  return { ok: true, cost };
}

export function buySkin(profile, skinId, cards = [], opts = {}) {
  const skin = TABLE_SKINS.find(s => s.id === skinId);
  if (!skin) return { error: 'Unknown skin.' };
  let gate = null;
  if (!opts.ignoreShop && skin.price > 0) {
    gate = assertShopStock(profile, cards, 'skin', skinId, opts);
    if (gate.error) return gate;
  }
  if (profile.unlockedSkins.includes(skinId)) {
    profile.tableSkin = skinId;
    saveProfile(profile);
    return { ok: true, equipped: true };
  }
  const cost = skin.price || priceOf('skin', skinId);
  if (profile.gold < cost) return needCoin(cost);
  profile.gold -= cost;
  profile.unlockedSkins.push(skinId);
  profile.tableSkin = skinId;
  if (!opts.ignoreShop && skin.price > 0) markShopPurchase(profile, gate.slate.periodKey, gate.id);
  saveProfile(profile);
  return { ok: true, cost };
}

export function buyBack(profile, backId, cards = [], opts = {}) {
  const back = CARD_BACKS.find(b => b.id === backId);
  if (!back) return { error: 'Unknown back.' };
  let gate = null;
  if (!opts.ignoreShop && back.price > 0) {
    gate = assertShopStock(profile, cards, 'back', backId, opts);
    if (gate.error) return gate;
  }
  if (profile.unlockedBacks.includes(backId)) {
    profile.cardBack = backId;
    saveProfile(profile);
    return { ok: true, equipped: true };
  }
  const cost = back.price || priceOf('back', backId);
  if (profile.gold < cost) return needCoin(cost);
  profile.gold -= cost;
  profile.unlockedBacks.push(backId);
  profile.cardBack = backId;
  if (!opts.ignoreShop && back.price > 0) markShopPurchase(profile, gate.slate.periodKey, gate.id);
  saveProfile(profile);
  return { ok: true, cost };
}

export function buyShopOffer(profile, offer, cards = [], opts = {}) {
  if (!offer?.kind) return { error: 'Unknown offer.' };
  const next = { ...opts, periodKey: opts.periodKey ?? offer.periodKey };
  if (offer.kind === 'bundle') return buyBundle(profile, offer, cards, next);
  if (!offer.target) return { error: 'Unknown offer.' };
  if (offer.kind === 'fragment') return buyFragment(profile, offer.target, cards, next);
  if (offer.kind === 'upgrade') return buyUpgrade(profile, offer.target, cards, next);
  if (offer.kind === 'clue') return buyClue(profile, offer.target, cards, next);
  if (offer.kind === 'skin') return buySkin(profile, offer.target, cards, next);
  if (offer.kind === 'back') return buyBack(profile, offer.target, cards, next);
  return { error: 'Unknown offer.' };
}

export function buyBundle(profile, offer, cards = [], opts = {}) {
  const slate = currentShop(profile, cards, opts.periodKey);
  if (!slate.bundle || slate.bundle.id !== offer.id) return { error: 'That bundle is not in today’s shop.' };
  if (isOfferSoldOut(profile, slate.periodKey, offer.id)) return { error: 'Sold out until the shop refreshes.' };
  if (profile.gold < offer.price) return needCoin(offer.price);
  profile.gold -= offer.price;
  const results = [];
  for (const part of offer.parts || []) {
    if (part.kind === 'fragment') results.push(addFragment(profile, part.target, cards));
    else if (part.kind === 'upgrade') { addUpgrade(profile, part.target); results.push({ ok: true }); }
    else if (part.kind === 'clue') results.push(addCardClue(profile, part.target, cards));
    else if (part.kind === 'skin') {
      if (!profile.unlockedSkins.includes(part.target)) profile.unlockedSkins.push(part.target);
      profile.tableSkin = part.target;
      results.push({ ok: true, equipped: true });
    } else if (part.kind === 'back') {
      if (!profile.unlockedBacks.includes(part.target)) profile.unlockedBacks.push(part.target);
      profile.cardBack = part.target;
      results.push({ ok: true, equipped: true });
    }
    markShopPurchase(profile, slate.periodKey, part.id);
  }
  markShopPurchase(profile, slate.periodKey, offer.id);
  saveProfile(profile);
  return { ok: true, results };
}

export function equipSkin(profile, skinId) {
  if (!profile.unlockedSkins.includes(skinId)) return { error: 'Not unlocked.' };
  profile.tableSkin = skinId;
  saveProfile(profile);
  return { ok: true };
}

export function equipBack(profile, backId) {
  if (!profile.unlockedBacks.includes(backId)) return { error: 'Not unlocked.' };
  profile.cardBack = backId;
  saveProfile(profile);
  return { ok: true };
}

/** Calendar day in America/New_York (EST/EDT). */
export function nyDateStr(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch {
    return todayStr();
  }
}

export function msUntilNextNyMidnight() {
  const now = Date.now();
  // Probe next 36h for date rollover in NY
  for (let h = 1; h <= 36; h++) {
    const t = new Date(now + h * 3600_000);
    if (nyDateStr(t) !== nyDateStr(new Date(now))) {
      // binary refine within that hour
      let lo = now + (h - 1) * 3600_000;
      let hi = now + h * 3600_000;
      while (hi - lo > 1000) {
        const mid = Math.floor((lo + hi) / 2);
        if (nyDateStr(new Date(mid)) === nyDateStr(new Date(now))) lo = mid;
        else hi = mid;
      }
      return Math.max(0, hi - now);
    }
  }
  return 12 * 3600_000;
}

/** Pins sit on the real ESO Tamriel parchment. Daily shuffle. 24h between fights. */
export const GAUNTLET_STOPS = [
  { id: 'glenumbra', name: 'Glenumbra', region: 'High Rock', difficulty: 1, you: ['pelin', 'hlaalu'], opp: ['crows', 'celarus'], rival: 'Daggerfall Knight-Errant', rewardGold: 9, x: 16, y: 32 },
  { id: 'stormhaven', name: 'Stormhaven', region: 'High Rock', difficulty: 2, you: ['pelin', 'celarus'], opp: ['hunding', 'crows'], rival: 'High King Emeric', rewardGold: 10, x: 22, y: 26 },
  { id: 'rivenspire', name: 'Rivenspire', region: 'High Rock', difficulty: 2, you: ['hlaalu', 'crows'], opp: ['rajhin', 'pelin'], rival: 'Count Verandis', rewardGold: 11, x: 18, y: 18 },
  { id: 'wrothgar', name: 'Wrothgar', region: 'High Rock', difficulty: 6, you: ['hunding', 'redeagle'], opp: ['hunding', 'redeagle'], rival: 'King Kurog', rewardGold: 27, x: 30, y: 16 },
  { id: 'betnikh', name: 'Betnikh', region: 'High Rock', difficulty: 1, you: ['pelin', 'hlaalu'], opp: ['crows', 'pelin'], rival: 'Chief Tazgol', rewardGold: 8, x: 8, y: 42 },
  { id: 'stros', name: "Stros M'Kai", region: 'Hammerfell', difficulty: 1, you: ['pelin', 'hlaalu'], opp: ['crows', 'celarus'], rival: 'Captain Kaleen', rewardGold: 8, x: 20, y: 54 },
  { id: 'alikr', name: "Alik'r Desert", region: 'Hammerfell', difficulty: 2, you: ['hunding', 'hlaalu'], opp: ['hunding', 'crows'], rival: "Ash'abah Seer", rewardGold: 12, x: 20, y: 38 },
  { id: 'bangkorai', name: 'Bangkorai', region: 'Hammerfell', difficulty: 3, you: ['pelin', 'hunding'], opp: ['redeagle', 'crows'], rival: 'Seventh Legion Strategist', rewardGold: 13, x: 32, y: 30 },
  { id: 'hewsbane', name: "Hew's Bane", region: 'Hammerfell', difficulty: 6, you: ['rajhin', 'hlaalu'], opp: ['rajhin', 'orgnum'], rival: 'Zeira of the Thieves', rewardGold: 28, x: 26, y: 50 },
  { id: 'craglorn', name: 'Craglorn', region: 'Hammerfell', difficulty: 6, you: ['hunding', 'celarus'], opp: ['hunding', 'almalexia'], rival: 'Celestial Warrior', rewardGold: 26, x: 40, y: 32 },
  { id: 'reach', name: 'The Reach', region: 'Skyrim', difficulty: 8, you: ['redeagle', 'druid'], opp: ['redeagle', 'mora'], rival: 'Ard Caddach', rewardGold: 44, x: 38, y: 22 },
  { id: 'wskyrim', name: 'Western Skyrim', region: 'Skyrim', difficulty: 8, you: ['redeagle', 'hunding'], opp: ['redeagle', 'alessia'], rival: 'Svana of Solitude', rewardGold: 42, x: 42, y: 12 },
  { id: 'eastmarch', name: 'Eastmarch', region: 'Skyrim', difficulty: 5, you: ['redeagle', 'pelin'], opp: ['redeagle', 'crows'], rival: 'Jorunn the Skald-King', rewardGold: 22, x: 58, y: 20 },
  { id: 'rift', name: 'The Rift', region: 'Skyrim', difficulty: 5, you: ['redeagle', 'hlaalu'], opp: ['redeagle', 'hunding'], rival: 'Thane Unnvald', rewardGold: 23, x: 56, y: 28 },
  { id: 'bleakrock', name: 'Bleakrock Isle', region: 'Skyrim', difficulty: 1, you: ['pelin', 'celarus'], opp: ['crows', 'pelin'], rival: 'Captain Rana', rewardGold: 8, x: 62, y: 8 },
  { id: 'cyrodiil', name: 'Cyrodiil', region: 'Cyrodiil', difficulty: 6, you: ['alessia', 'pelin'], opp: ['alessia', 'crows'], rival: 'Elder Council Envoy', rewardGold: 24, x: 52, y: 36 },
  { id: 'imperial', name: 'Imperial City', region: 'Cyrodiil', difficulty: 7, you: ['alessia', 'hlaalu'], opp: ['alessia', 'redeagle'], rival: 'Drake of Blades', rewardGold: 30, x: 52, y: 42 },
  { id: 'goldcoast', name: 'Gold Coast', region: 'Cyrodiil', difficulty: 7, you: ['alessia', 'hlaalu'], opp: ['alessia', 'rajhin'], rival: 'Speaker Terenus', rewardGold: 30, x: 36, y: 54 },
  { id: 'westweald', name: 'West Weald', region: 'Cyrodiil', difficulty: 9, you: ['alessia', 'celarus'], opp: ['alessia', 'druid'], rival: 'Tribune Alea', rewardGold: 54, x: 42, y: 48 },
  { id: 'stonefalls', name: 'Stonefalls', region: 'Morrowind', difficulty: 4, you: ['almalexia', 'pelin'], opp: ['almalexia', 'crows'], rival: 'Tanval Indoril', rewardGold: 18, x: 70, y: 38 },
  { id: 'balfoyen', name: 'Bal Foyen', region: 'Morrowind', difficulty: 2, you: ['almalexia', 'pelin'], opp: ['crows', 'almalexia'], rival: 'Darj the Hunter', rewardGold: 10, x: 80, y: 36 },
  { id: 'deshaan', name: 'Deshaan', region: 'Morrowind', difficulty: 5, you: ['almalexia', 'hlaalu'], opp: ['almalexia', 'celarus'], rival: 'Ordinator Vamen', rewardGold: 20, x: 76, y: 44 },
  { id: 'vvardenfell', name: 'Vvardenfell', region: 'Morrowind', difficulty: 7, you: ['almalexia', 'celarus'], opp: ['almalexia', 'mora'], rival: 'Vivec', rewardGold: 32, x: 74, y: 20 },
  { id: 'telvanni', name: 'Telvanni Peninsula', region: 'Morrowind', difficulty: 9, you: ['mora', 'almalexia'], opp: ['mora', 'almalexia'], rival: 'Master Nelos', rewardGold: 52, x: 88, y: 34 },
  { id: 'clockwork', name: 'Clockwork City', region: 'Oblivion', difficulty: 7, you: ['celarus', 'hlaalu'], opp: ['celarus', 'alessia'], rival: 'Sotha Sil', rewardGold: 34, x: 82, y: 24 },
  { id: 'shadowfen', name: 'Shadowfen', region: 'Black Marsh', difficulty: 5, you: ['rajhin', 'celarus'], opp: ['rajhin', 'hunding'], rival: 'Vicecanon Heita-Meen', rewardGold: 21, x: 72, y: 54 },
  { id: 'blackwood', name: 'Blackwood', region: 'Black Marsh', difficulty: 9, you: ['alessia', 'almalexia'], opp: ['alessia', 'almalexia'], rival: 'Eveli Sharp-Arrow', rewardGold: 46, x: 62, y: 60 },
  { id: 'murkmire', name: 'Murkmire', region: 'Black Marsh', difficulty: 8, you: ['rajhin', 'druid'], opp: ['rajhin', 'druid'], rival: 'Kassandra', rewardGold: 36, x: 74, y: 78 },
  { id: 'auridon', name: 'Auridon', region: 'Summerset', difficulty: 3, you: ['celarus', 'hlaalu'], opp: ['celarus', 'crows'], rival: 'Canonreeve Sinyon', rewardGold: 14, x: 22, y: 68 },
  { id: 'grahtwood', name: 'Grahtwood', region: 'Valenwood', difficulty: 3, you: ['druid', 'celarus'], opp: ['druid', 'crows'], rival: 'King Camoran Aeradan', rewardGold: 15, x: 42, y: 74 },
  { id: 'greenshade', name: 'Greenshade', region: 'Valenwood', difficulty: 4, you: ['druid', 'pelin'], opp: ['druid', 'rajhin'], rival: 'Queen Ayrenn', rewardGold: 16, x: 34, y: 72 },
  { id: 'malabal', name: 'Malabal Tor', region: 'Valenwood', difficulty: 4, you: ['druid', 'hlaalu'], opp: ['orgnum', 'crows'], rival: 'Silvenar Hound', rewardGold: 17, x: 36, y: 64 },
  { id: 'reapers', name: "Reaper's March", region: 'Elsweyr', difficulty: 4, you: ['rajhin', 'hlaalu'], opp: ['rajhin', 'celarus'], rival: 'Mane Akkhuz-ri', rewardGold: 18, x: 44, y: 58 },
  { id: 'nelsweyr', name: 'Northern Elsweyr', region: 'Elsweyr', difficulty: 8, you: ['rajhin', 'almalexia'], opp: ['rajhin', 'alessia'], rival: 'Khamira', rewardGold: 38, x: 50, y: 62 },
  { id: 'selsweyr', name: 'Southern Elsweyr', region: 'Elsweyr', difficulty: 8, you: ['rajhin', 'orgnum'], opp: ['orgnum', 'redeagle'], rival: 'Sai Sahan', rewardGold: 40, x: 52, y: 76 },
  { id: 'khenarthi', name: "Khenarthi's Roost", region: 'Elsweyr', difficulty: 1, you: ['rajhin', 'celarus'], opp: ['crows', 'rajhin'], rival: 'Commander Karinith', rewardGold: 8, x: 52, y: 86 },
  { id: 'summerset', name: 'Summerset', region: 'Summerset', difficulty: 7, you: ['celarus', 'orgnum'], opp: ['celarus', 'orgnum'], rival: 'Proxy Queen Alwinarwe', rewardGold: 35, x: 14, y: 80 },
  { id: 'highisle', name: 'Gonfalon Bay', region: 'High Isle', difficulty: 1, you: ['pelin', 'hlaalu'], opp: ['crows', 'celarus'], rival: 'Lord Bacaro', rewardGold: 10, x: 8, y: 60, sea: true },
  { id: 'galen', name: 'Galen', region: 'Systres', difficulty: 9, you: ['druid', 'orgnum'], opp: ['druid', 'mora'], rival: 'Druid King Kasorayn', rewardGold: 50, x: 6, y: 50 },
  { id: 'solstice', name: 'Solstice', region: 'Southern Seas', difficulty: 10, you: ['orgnum', 'mora'], opp: ['orgnum', 'mora'], rival: 'Tide-Born Admiral', rewardGold: 70, x: 74, y: 90 },
  { id: 'apocrypha', name: 'Apocrypha', region: 'Oblivion', difficulty: 10, you: ['mora', 'celarus'], opp: ['mora', 'alessia'], rival: 'Hermaeus Mora', rewardGold: 80, x: 94, y: 16 },
  { id: 'coldharbour', name: 'Coldharbour', region: 'Oblivion', difficulty: 10, you: ['alessia', 'mora'], opp: ['alessia', 'mora'], rival: "Molag Bal's Proxy", rewardGold: 60, x: 4, y: 10 },
  { id: 'deadlands', name: 'The Deadlands', region: 'Oblivion', difficulty: 10, you: ['redeagle', 'mora'], opp: ['redeagle', 'alessia'], rival: 'Lyranth', rewardGold: 64, x: 10, y: 8 },
]

function seededShuffle(arr, seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newGauntletRoad(today) {
  const rest = GAUNTLET_STOPS.map((s) => s.id).filter((id) => id !== 'highisle');
  return {
    date: today,
    roadId: today,
    order: ['highisle', ...seededShuffle(rest, today + ':tot-road')],
    cursor: 0,
    clearedIds: [],
    lockedDate: null,
    lastPlayAt: 0,
    lastId: null,
    prizeClaimedRoad: null,
    failed: false,
    failedStop: null,
    cleared: 0,
  };
}

export function ensureGauntletDay(profile) {
  const today = nyDateStr();
  if (!profile.gauntlet) profile.gauntlet = newGauntletRoad(today);
  const g = profile.gauntlet;
  const complete = Array.isArray(g.order) && g.order.length && (g.cursor || 0) >= g.order.length;
  const needNew = !g.order?.length || g.order[0] !== 'highisle'
    || (complete && g.prizeClaimedRoad === g.roadId && g.date !== today);
  if (needNew) {
    profile.gauntlet = { ...newGauntletRoad(today), prizeClaimedRoad: g.prizeClaimedRoad || null };
    saveProfile(profile);
  } else {
    g.date = g.date || today;
    if (g.lockedDate && g.lockedDate !== today) {
      g.lockedDate = null;
      g.failed = false;
    }
  }
  return profile.gauntlet;
}

export const WATER_ZONES = new Set([
  'highisle', 'galen', 'summerset', 'auridon', 'stros', 'betnikh',
  'solstice', 'khenarthi', 'bleakrock', 'vvardenfell',
]);

export function roadCrossing(fromId, toId) {
  return WATER_ZONES.has(fromId) || WATER_ZONES.has(toId);
}

export function gauntletCooldownMs(g) {
  const today = nyDateStr();
  if (g?.lockedDate === today) {
    return msUntilNextNyMidnight();
  }
  return 0;
}

export function gauntletLockedToday(profile) {
  const g = ensureGauntletDay(profile);
  return g.lockedDate === nyDateStr();
}

export function todaysFeatured(profile) {
  const g = ensureGauntletDay(profile);
  const idx = Math.min(g.cursor || 0, Math.max(0, (g.order?.length || 1) - 1));
  const id = g.order?.[idx];
  return GAUNTLET_STOPS.find((s) => s.id === id) || GAUNTLET_STOPS[0];
}

export function roadGrandPrizePreview(profile) {
  const g = ensureGauntletDay(profile);
  return roadGrandPrize(g.roadId || nyDateStr());
}

export function recordGauntletResult(profile, { stopIndex, won }) {
  ensureGauntletDay(profile);
  const g = profile.gauntlet;
  const stop = GAUNTLET_STOPS[stopIndex];
  if (!stop) return { error: 'bad stop' };
  g.lastId = stop.id;
  if (won) {
    profile.gold += stop.rewardGold;
    profile.purses.push({ rarity: stop.difficulty >= 8 ? 'Epic' : stop.difficulty >= 5 ? 'Superior' : 'Fine' });
    if (!g.clearedIds) g.clearedIds = [];
    if (!g.clearedIds.includes(stop.id)) g.clearedIds.push(stop.id);
    g.cursor = (g.cursor || 0) + 1;
    g.cleared = g.clearedIds.length;
    g.failed = false;
    g.failedStop = null;
    const complete = g.cursor >= (g.order?.length || 0);
    let prize = null;
    if (complete && g.prizeClaimedRoad !== g.roadId) {
      prize = grantReward(profile, roadGrandPrize(g.roadId), []);
      g.prizeClaimedRoad = g.roadId;
      maybeUnlockAchievement(profile, 'road-clear', true);
    }
    saveProfile(profile);
    return { gold: stop.rewardGold, cleared: g.cleared, complete, prize };
  }
  g.lockedDate = nyDateStr();
  g.failed = true;
  g.failedStop = stopIndex;
  saveProfile(profile);
  return { failed: true, failedStop: stopIndex, retryInMs: gauntletCooldownMs(g) };
}

export function setAiDifficulty(profile, n) {
  profile.aiDifficulty = Math.max(1, Math.min(10, Math.round(n)));
  saveProfile(profile);
  return profile.aiDifficulty;
}
