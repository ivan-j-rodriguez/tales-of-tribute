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
  { id: 'high-isle', name: 'High Isle', tag: 'Zone', price: 0, desc: 'Systres limestone, teal surf, and Breton gold.' },
  { id: 'auridon', name: 'Auridon', tag: 'Zone', price: 80, desc: 'Altmer marble and the azure Abecean.' },
  { id: 'warden', name: 'Warden', tag: 'Class', price: 90, desc: 'Frostpine grove — ice bloom over deep moss.' },
  { id: 'nightblade', name: 'Nightblade', tag: 'Class', price: 100, desc: 'Moonlight, void-purple, and a drop of blood.' },
  { id: 'grahtwood', name: 'Grahtwood', tag: 'Zone', price: 110, desc: 'Valenwood canopy — gold light through leaves.' },
  { id: 'dragonknight', name: 'Dragonknight', tag: 'Class', price: 120, desc: 'Molten stone and Red Mountain fire.' },
  { id: 'clockwork', name: 'Clockwork City', tag: 'Zone', price: 120, desc: 'Brass, copper oil, and ticking factotums.' },
  { id: 'orsinium', name: 'Orsinium', tag: 'Zone', price: 140, desc: 'Iron halls, frost, orichalcum green.' },
  { id: 'arcanist', name: 'Arcanist', tag: 'Class', price: 150, desc: 'Verdant ink, gold runes, the eye of Mora.' },
  { id: 'daedra', name: 'Coldharbour', tag: 'Zone', price: 150, desc: 'Soulfire cyan over Molag Bal’s grey waste.' },
  { id: 'vvardenfell', name: 'Vvardenfell', tag: 'Zone', price: 160, desc: 'Ashfall, kwama amber, the mountain’s glow.' },
  { id: 'apocrypha', name: 'Apocrypha', tag: 'Zone', price: 180, desc: 'Black ink seas and watching green eyes.' },
  { id: 'summerset', name: 'Summerset', tag: 'Zone', price: 180, desc: 'Crystal Alinor — aurora over white-gold.' },
  { id: 'vestige', name: 'Vestige', tag: 'Class', price: 200, desc: 'Aetherial blue — a sky-shard on the table.' },
];

export const CARD_BACKS = [
  { id: 'default', name: 'Roister Back', price: 0, desc: 'Club gold on dark oak.' },
  { id: 'nightblade', name: 'Shadow Dance', price: 70, desc: 'Void and crimson.' },
  { id: 'warden', name: 'Frostpine', price: 70, desc: 'Ice over living wood.' },
  { id: 'dragonknight', name: 'Ember Scale', price: 80, desc: 'Lava-cracked hide.' },
  { id: 'clockwork', name: 'Brass Circuit', price: 80, desc: 'Sotha Sil’s geometry.' },
  { id: 'auridon', name: 'Altmer Sun', price: 90, desc: 'Pale gold of Firsthold.' },
  { id: 'daedra', name: 'Soulfire', price: 90, desc: 'Coldharbour cyan.' },
  { id: 'arcanist', name: 'Ink & Eye', price: 100, desc: 'Apocryphal gold runes.' },
  { id: 'apocrypha', name: 'Green Eye', price: 100, desc: 'Hermaeus Mora’s gaze.' },
  { id: 'vestige', name: 'Aetherial', price: 110, desc: 'Sky-shard glow.' },
];

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
};

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
    hourglassDefault: false,
    showBotCards: false,
    aiDifficulty: 5,
    gauntlet: { date: null, cleared: 0, failed: false, failedStop: null },
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
    p.hourglassDefault = !!p.hourglassDefault;
    p.showBotCards = !!p.showBotCards;
    p.aiDifficulty = Math.max(1, Math.min(10, Math.round(p.aiDifficulty || 5)));
    p.gauntlet = { date: null, cleared: 0, failed: false, failedStop: null, ...(p.gauntlet || {}) };
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

export function ensureGauntletDay(profile) {
  const today = nyDateStr();
  if (!profile.gauntlet) profile.gauntlet = { date: null, order: [], lastPlayAt: 0, lastId: null };
  const startOk = profile.gauntlet.order?.[0] === 'highisle';
  if (profile.gauntlet.date !== today || !profile.gauntlet.order?.length || !startOk) {
    const rest = GAUNTLET_STOPS.map(s => s.id).filter(id => id !== 'highisle');
    profile.gauntlet.date = today;
    profile.gauntlet.order = ['highisle', ...seededShuffle(rest, today + ':tot-road')];
    saveProfile(profile);
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
  const last = g?.lastPlayAt || 0;
  return Math.max(0, last + 24 * 3600_000 - Date.now());
}

export function todaysFeatured(profile) {
  const g = ensureGauntletDay(profile);
  const id = g.order[0];
  return GAUNTLET_STOPS.find(s => s.id === id) || GAUNTLET_STOPS[0];
}

export function recordGauntletResult(profile, { stopIndex, won }) {
  ensureGauntletDay(profile);
  const g = profile.gauntlet;
  const stop = GAUNTLET_STOPS[stopIndex];
  if (!stop) return { error: 'bad stop' };
  g.lastPlayAt = Date.now();
  g.lastId = stop.id;
  if (won) {
    profile.gold += stop.rewardGold;
    profile.purses.push({ rarity: stop.difficulty >= 8 ? 'Epic' : stop.difficulty >= 5 ? 'Superior' : 'Fine' });
  }
  saveProfile(profile);
  return won
    ? { gold: stop.rewardGold, cleared: 1, complete: false }
    : { failed: true, failedStop: stopIndex, retryInMs: gauntletCooldownMs(g) };
}

export function setAiDifficulty(profile, n) {
  profile.aiDifficulty = Math.max(1, Math.min(10, Math.round(n)));
  saveProfile(profile);
  return profile.aiDifficulty;
}
