/** Roister's Club profile — gold, unlocks, purses, ranked, cosmetics. */
import { UPGRADE_TO_BASE, upgradesForPatron } from './upgrades.js';

export const PROFILE_KEY = 'tot_profile_v1';
export const STARTER_DECKS = ['pelin', 'crows', 'hlaalu', 'celarus'];
export const LOCKED_DECKS = ['hunding', 'redeagle', 'orgnum', 'rajhin', 'druid', 'almalexia', 'mora', 'alessia'];
export const ALL_DECKS = [...STARTER_DECKS, ...LOCKED_DECKS];
export const FRAGMENTS_TO_UNLOCK = 5;
export const SACK_BUY_COST = 40;

export const RANK_TIERS = ['Unranked', 'Orichalcum', 'Ebony', 'Quicksilver', 'Voidsteel', 'Rubedite'];
export const RANK_THRESHOLDS = [0, 0, 100, 250, 450, 700]; // points to enter tier index

export const TABLE_SKINS = [
  { id: 'high-isle', name: 'High Isle Oak', price: 0, desc: 'Warm tavern oak — free with membership.' },
  { id: 'clockwork', name: 'Clockwork', price: 120, desc: 'Brass gears and factotum inlay.' },
  { id: 'daedra', name: 'Coldharbour', price: 150, desc: 'Red-black runes of Oblivion.' },
  { id: 'apocrypha', name: 'Apocrypha', price: 180, desc: 'Green-black ink and tentacles.' },
  { id: 'orsinium', name: 'Orsinium Anvil', price: 140, desc: 'Iron table, clan banners.' },
  { id: 'vestige', name: 'Vestige Hall', price: 200, desc: 'Sky-shard blue and worn leather.' },
];

export const CARD_BACKS = [
  { id: 'default', name: 'Roister Back', price: 0, desc: 'Classic Tales of Tribute back.' },
  { id: 'clockwork', name: 'Brass Circuit', price: 80, desc: 'Clockwork City motif.' },
  { id: 'daedra', name: 'Sigil Back', price: 90, desc: 'Daedric script.' },
  { id: 'apocrypha', name: 'Green Eye', price: 100, desc: 'Hermaeus Mora’s gaze.' },
  { id: 'vestige', name: 'Aetherial', price: 110, desc: 'Sky-shard glow.' },
];

export const STORE_FRAGMENT_COST = 35;
export const STORE_UPGRADE_COST = 55;

export const PURSE_RARITIES = ['Common', 'Fine', 'Superior', 'Epic', 'Legendary'];

export const ACHIEVEMENTS = [
  { id: 'first-win', name: 'First Victory', desc: 'Win your first match.', reward: { gold: 20 } },
  { id: 'win-3-random-in-a-row', name: 'Lucky Streak', desc: 'Win 3 random matches in a row.', reward: { gold: 30, purses: 1 } },
  { id: 'win-10', name: 'Seasoned Roister', desc: 'Win 10 matches.', reward: { gold: 50 } },
  { id: 'check-in-7', name: 'Club Regular', desc: 'Reach a 7-day check-in streak.', reward: { purses: 1, gold: 25 } },
  { id: 'unlock-second-deck', name: 'New Patron', desc: 'Unlock a deck beyond the Initiate four.', reward: { gold: 25 } },
  { id: 'open-10-sacks', name: 'Heavy Hauler', desc: 'Open 10 cutpurses.', reward: { gold: 40 } },
  { id: 'upgrade-a-starter-card', name: 'Polished Steel', desc: 'Own an upgrade from a starter deck.', reward: { gold: 15 } },
  { id: 'ranked-orichalcum', name: 'Orichalcum Blade', desc: 'Reach Orichalcum ranked tier.', reward: { gold: 40 } },
  { id: 'unlock-mora', name: 'Seeker of Secrets', desc: 'Unlock Hermaeus Mora.', reward: { gold: 60 } },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function emptyFragments() {
  const o = {};
  for (const id of LOCKED_DECKS) o[id] = 0;
  return o;
}

export function defaultProfile() {
  return {
    gold: 80,
    unlockedDecks: [...STARTER_DECKS],
    ownedUpgrades: [],
    deckFragments: emptyFragments(),
    tableSkin: 'high-isle',
    cardBack: 'default',
    unlockedSkins: ['high-isle'],
    unlockedBacks: ['default'],
    ranked: { tier: 'Unranked', points: 0, placementLeft: 5, winStreak: 0 },
    purses: [{ rarity: 'Common' }], // queued cutpurses
    lastCheckIn: null,
    checkInStreak: 0,
    winStreak: 0,
    randomWinStreak: 0,
    stats: { wins: 0, losses: 0, matches: 0, sacksOpened: 0 },
    achievements: {},
    challenges: {
      dailyWin: { progress: 0, target: 2, claimed: false, resetDate: todayStr() },
      streak3: { progress: 0, target: 3, claimed: false },
    },
    // legacy alias
    sacks: 0,
  };
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
    p.ranked = { tier: 'Unranked', points: 0, placementLeft: 5, winStreak: 0, ...(p.ranked || {}) };
    p.purses = Array.isArray(p.purses) ? p.purses : [];
    // migrate legacy sacks → purses
    if (typeof p.sacks === 'number' && p.sacks > 0 && p.purses.length === 0) {
      for (let i = 0; i < p.sacks; i++) p.purses.push({ rarity: 'Common' });
      p.sacks = 0;
    }
    p.stats = { wins: 0, losses: 0, matches: 0, sacksOpened: 0, ...(p.stats || {}) };
    p.achievements = p.achievements || {};
    p.challenges = {
      dailyWin: { progress: 0, target: 2, claimed: false, resetDate: todayStr(), ...(p.challenges?.dailyWin || {}) },
      streak3: { progress: 0, target: 3, claimed: false, ...(p.challenges?.streak3 || {}) },
    };
    if (typeof p.gold !== 'number') p.gold = 80;
    if (!p.unlockedSkins.includes('high-isle')) p.unlockedSkins.push('high-isle');
    if (!p.unlockedBacks.includes('default')) p.unlockedBacks.push('default');
    return p;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function isDeckUnlocked(profile, deckId) {
  if (deckId === 'treasury') return true;
  return profile.unlockedDecks.includes(deckId);
}

export function fragmentProgress(profile, deckId) {
  return profile.deckFragments[deckId] || 0;
}

export function purseCount(profile) {
  return (profile.purses || []).length;
}

/** Daily sign-in. */
export function doDailyCheckIn(profile) {
  const today = todayStr();
  if (profile.lastCheckIn === today) return null;
  const yest = yesterdayStr();
  if (profile.lastCheckIn === yest) profile.checkInStreak = (profile.checkInStreak || 0) + 1;
  else profile.checkInStreak = 1;
  profile.lastCheckIn = today;
  profile.gold += 15;
  profile.purses.push({ rarity: 'Common' });
  let extra = '';
  if (profile.checkInStreak >= 7) {
    profile.purses.push({ rarity: 'Fine' });
    profile.gold += 25;
    extra = ' Streak bonus!';
  }
  const dw = profile.challenges.dailyWin;
  if (dw.resetDate !== today) {
    dw.progress = 0;
    dw.claimed = false;
    dw.resetDate = today;
  }
  maybeUnlockAchievement(profile, 'check-in-7', profile.checkInStreak >= 7);
  saveProfile(profile);
  return {
    profile,
    toast: "Roister's daily — the club remembered you." + extra,
    granted: { gold: profile.checkInStreak >= 7 ? 40 : 15, purses: profile.checkInStreak >= 7 ? 2 : 1 },
  };
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

export function claimAchievement(profile, id) {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def || !profile.achievements[id]) return null;
  const key = `claimed_${id}`;
  if (profile.achievements[key]) return null;
  profile.achievements[key] = true;
  if (def.reward.gold) profile.gold += def.reward.gold;
  if (def.reward.purses) {
    for (let i = 0; i < def.reward.purses; i++) profile.purses.push({ rarity: 'Fine' });
  }
  if (def.reward.sacks) {
    for (let i = 0; i < def.reward.sacks; i++) profile.purses.push({ rarity: 'Fine' });
  }
  saveProfile(profile);
  return def.reward;
}

export function claimDailyChallenge(profile) {
  const dw = profile.challenges.dailyWin;
  if (dw.claimed || dw.progress < dw.target) return null;
  dw.claimed = true;
  profile.purses.push({ rarity: 'Fine' });
  saveProfile(profile);
  return { purses: 1 };
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
export function recordMatchResult(profile, { won, isRandom = false, ranked = false }) {
  profile.stats.matches += 1;
  let purse = null;
  if (won) {
    profile.stats.wins += 1;
    profile.winStreak = (profile.winStreak || 0) + 1;
    profile.gold += ranked ? 14 : 8;
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
      profile.purses.push(purse);
    } else if (Math.random() < 0.35 || profile.winStreak >= 2) {
      purse = { rarity: rarityFromStreak(profile.winStreak, false) };
      profile.purses.push(purse);
    }

    saveProfile(profile);
    return {
      gold: ranked ? 14 : 8,
      purse,
      winStreak: profile.winStreak,
      ranked: profile.ranked,
    };
  }

  profile.stats.losses += 1;
  profile.winStreak = 0;
  if (isRandom) profile.randomWinStreak = 0;
  profile.challenges.streak3.progress = profile.randomWinStreak || 0;
  profile.gold += ranked ? 5 : 3;
  if (ranked) {
    const r = profile.ranked;
    r.winStreak = 0;
    if (r.placementLeft > 0) r.placementLeft -= 1;
    else r.points = Math.max(0, r.points - 8);
    syncTierFromPoints(r);
  }
  saveProfile(profile);
  return { gold: ranked ? 5 : 3, purse: null, winStreak: 0, ranked: profile.ranked };
}

export function addUpgrade(profile, upgradeId) {
  if (!profile.ownedUpgrades.includes(upgradeId)) {
    profile.ownedUpgrades.push(upgradeId);
    maybeUnlockAchievement(profile, 'upgrade-a-starter-card', true);
  }
  saveProfile(profile);
}

export function addFragment(profile, deckId) {
  if (profile.unlockedDecks.includes(deckId)) return { unlocked: false };
  const cur = (profile.deckFragments[deckId] || 0) + 1;
  profile.deckFragments[deckId] = Math.min(FRAGMENTS_TO_UNLOCK, cur);
  let unlocked = false;
  if (profile.deckFragments[deckId] >= FRAGMENTS_TO_UNLOCK) {
    profile.unlockedDecks.push(deckId);
    unlocked = true;
    const extras = profile.unlockedDecks.filter(d => !STARTER_DECKS.includes(d));
    maybeUnlockAchievement(profile, 'unlock-second-deck', extras.length >= 1);
    if (deckId === 'mora') maybeUnlockAchievement(profile, 'unlock-mora', true);
  }
  saveProfile(profile);
  return { unlocked, fragments: profile.deckFragments[deckId] };
}

function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}
function pick(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function rarityRollBias(rarity) {
  // higher rarity → better loot tables
  const map = { Common: 0, Fine: 1, Superior: 2, Epic: 3, Legendary: 4 };
  return map[rarity] || 0;
}

/**
 * Open next queued cutpurse / buy one.
 */
export function openPurse(profile, cards, opts = {}) {
  let rarity = 'Common';
  if (profile.purses.length > 0) {
    const p = profile.purses.shift();
    rarity = p.rarity || 'Common';
  } else if (opts.buy && profile.gold >= SACK_BUY_COST) {
    profile.gold -= SACK_BUY_COST;
    rarity = 'Fine';
  } else {
    return { error: 'No purses and not enough gold.' };
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
    return { type: 'gold', amount: g, label: `${g} purse gold`, rarity };
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
      const r = addFragment(profile, deck);
      reward = {
        type: 'fragment',
        deck,
        fragments: r.fragments,
        unlocked: r.unlocked,
        rarity,
        label: r.unlocked
          ? `Deck unlocked: ${deck}!`
          : `Fragment: ${deck} (${r.fragments}/${FRAGMENTS_TO_UNLOCK})`,
      };
    } else reward = goldFallback();
  } else {
    profile.gold += 80 + bias * 40;
    reward = { type: 'jackpot', gold: 80 + bias * 40, label: `Jackpot! ${80 + bias * 40} gold`, rarity };
  }

  saveProfile(profile);
  return { reward, profile, rarity };
}

/** @deprecated alias */
export function openSack(profile, cards, opts = {}) {
  return openPurse(profile, cards, opts);
}

export function buySack(profile) {
  if (profile.gold < SACK_BUY_COST) return { error: 'Need 40 gold.' };
  profile.gold -= SACK_BUY_COST;
  profile.purses.push({ rarity: 'Fine' });
  saveProfile(profile);
  return { ok: true };
}

export function buyFragment(profile, deckId) {
  if (profile.unlockedDecks.includes(deckId)) return { error: 'Already unlocked.' };
  if (!LOCKED_DECKS.includes(deckId)) return { error: 'Invalid deck.' };
  if (profile.gold < STORE_FRAGMENT_COST) return { error: `Need ${STORE_FRAGMENT_COST} gold.` };
  profile.gold -= STORE_FRAGMENT_COST;
  const r = addFragment(profile, deckId);
  return { ok: true, ...r };
}

export function buyUpgrade(profile, upgradeId, cards) {
  if (profile.ownedUpgrades.includes(upgradeId)) return { error: 'Already owned.' };
  const base = UPGRADE_TO_BASE[upgradeId];
  if (!base) return { error: 'Unknown upgrade.' };
  const card = cards.find(c => c.id === upgradeId);
  const patron = card?.patron;
  if (patron && !isDeckUnlocked(profile, patron)) return { error: 'Unlock the deck first.' };
  if (profile.gold < STORE_UPGRADE_COST) return { error: `Need ${STORE_UPGRADE_COST} gold.` };
  profile.gold -= STORE_UPGRADE_COST;
  addUpgrade(profile, upgradeId);
  return { ok: true };
}

export function buySkin(profile, skinId) {
  const skin = TABLE_SKINS.find(s => s.id === skinId);
  if (!skin) return { error: 'Unknown skin.' };
  if (profile.unlockedSkins.includes(skinId)) {
    profile.tableSkin = skinId;
    saveProfile(profile);
    return { ok: true, equipped: true };
  }
  if (profile.gold < skin.price) return { error: `Need ${skin.price} gold.` };
  profile.gold -= skin.price;
  profile.unlockedSkins.push(skinId);
  profile.tableSkin = skinId;
  saveProfile(profile);
  return { ok: true };
}

export function buyBack(profile, backId) {
  const back = CARD_BACKS.find(b => b.id === backId);
  if (!back) return { error: 'Unknown back.' };
  if (profile.unlockedBacks.includes(backId)) {
    profile.cardBack = backId;
    saveProfile(profile);
    return { ok: true, equipped: true };
  }
  if (profile.gold < back.price) return { error: `Need ${back.price} gold.` };
  profile.gold -= back.price;
  profile.unlockedBacks.push(backId);
  profile.cardBack = backId;
  saveProfile(profile);
  return { ok: true };
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
