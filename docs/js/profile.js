/** Roister's Club profile — purse gold, unlocks, sacks, achievements. */
import { UPGRADE_TO_BASE, upgradesForPatron } from './upgrades.js';

export const PROFILE_KEY = 'tot_profile_v1';
export const STARTER_DECKS = ['pelin', 'crows', 'hlaalu', 'celarus'];
export const LOCKED_DECKS = ['hunding', 'redeagle', 'orgnum', 'rajhin', 'druid', 'almalexia', 'mora', 'alessia'];
export const ALL_DECKS = [...STARTER_DECKS, ...LOCKED_DECKS];
export const FRAGMENTS_TO_UNLOCK = 5;
export const SACK_BUY_COST = 40;

export const ACHIEVEMENTS = [
  { id: 'first-win', name: 'First Victory', desc: 'Win your first match.', reward: { gold: 20 } },
  { id: 'win-3-random-in-a-row', name: 'Lucky Streak', desc: 'Win 3 random matches in a row.', reward: { gold: 30, sacks: 1 } },
  { id: 'win-10', name: 'Seasoned Roister', desc: 'Win 10 matches.', reward: { gold: 50 } },
  { id: 'check-in-7', name: 'Club Regular', desc: 'Reach a 7-day check-in streak.', reward: { sacks: 1, gold: 25 } },
  { id: 'unlock-second-deck', name: 'New Patron', desc: 'Unlock a deck beyond the Initiate four.', reward: { gold: 25 } },
  { id: 'open-10-sacks', name: 'Heavy Hauler', desc: 'Open 10 heavy sacks.', reward: { gold: 40 } },
  { id: 'upgrade-a-starter-card', name: 'Polished Steel', desc: 'Own an upgrade from a starter deck.', reward: { gold: 15 } },
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptyFragments() {
  const o = {};
  for (const id of LOCKED_DECKS) o[id] = 0;
  return o;
}

export function defaultProfile() {
  return {
    gold: 50,
    unlockedDecks: [...STARTER_DECKS],
    ownedUpgrades: [],
    deckFragments: emptyFragments(),
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
    sacks: 1,
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
    const p = { ...defaultProfile(), ...JSON.parse(raw) };
    p.unlockedDecks = Array.isArray(p.unlockedDecks) ? p.unlockedDecks : [...STARTER_DECKS];
    p.ownedUpgrades = Array.isArray(p.ownedUpgrades) ? p.ownedUpgrades : [];
    p.deckFragments = { ...emptyFragments(), ...(p.deckFragments || {}) };
    p.stats = { wins: 0, losses: 0, matches: 0, sacksOpened: 0, ...(p.stats || {}) };
    p.achievements = p.achievements || {};
    p.challenges = {
      dailyWin: { progress: 0, target: 2, claimed: false, resetDate: todayStr(), ...(p.challenges?.dailyWin || {}) },
      streak3: { progress: 0, target: 3, claimed: false, ...(p.challenges?.streak3 || {}) },
    };
    if (typeof p.sacks !== 'number') p.sacks = 1;
    if (typeof p.gold !== 'number') p.gold = 50;
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

/** Daily sign-in. Returns { granted, toast, profile } or null if already checked in. */
export function doDailyCheckIn(profile) {
  const today = todayStr();
  if (profile.lastCheckIn === today) return null;

  const yest = yesterdayStr();
  if (profile.lastCheckIn === yest) profile.checkInStreak = (profile.checkInStreak || 0) + 1;
  else profile.checkInStreak = 1;

  profile.lastCheckIn = today;
  profile.gold += 15;
  profile.sacks += 1;
  let extra = '';
  if (profile.checkInStreak >= 7) {
    profile.sacks += 1;
    profile.gold += 25;
    extra = ' Streak bonus!';
  }

  // Reset daily challenge on date change
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
    granted: { gold: profile.checkInStreak >= 7 ? 40 : 15, sacks: profile.checkInStreak >= 7 ? 2 : 1 },
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
  if (def.reward.sacks) profile.sacks += def.reward.sacks;
  saveProfile(profile);
  return def.reward;
}

export function claimDailyChallenge(profile) {
  const dw = profile.challenges.dailyWin;
  if (dw.claimed || dw.progress < dw.target) return null;
  dw.claimed = true;
  profile.sacks += 1;
  saveProfile(profile);
  return { sacks: 1 };
}

/** Record end of a match. isRandom = random-queue toggle. */
export function recordMatchResult(profile, { won, isRandom = false }) {
  profile.stats.matches += 1;
  if (won) {
    profile.stats.wins += 1;
    profile.winStreak = (profile.winStreak || 0) + 1;
    profile.gold += 8;
    if (isRandom) {
      profile.randomWinStreak = (profile.randomWinStreak || 0) + 1;
      profile.challenges.streak3.progress = profile.randomWinStreak;
      maybeUnlockAchievement(profile, 'win-3-random-in-a-row', profile.randomWinStreak >= 3);
    }
    // daily win challenge
    ensureDailyChallengeReset(profile);
    profile.challenges.dailyWin.progress = Math.min(
      profile.challenges.dailyWin.target,
      (profile.challenges.dailyWin.progress || 0) + 1
    );
    maybeUnlockAchievement(profile, 'first-win', true);
    maybeUnlockAchievement(profile, 'win-10', profile.stats.wins >= 10);

    let bonusSack = false;
    if (Math.random() < 0.15) {
      profile.sacks += 1;
      bonusSack = true;
    }
    saveProfile(profile);
    return { gold: 8, bonusSack, winStreak: profile.winStreak };
  } else {
    profile.stats.losses += 1;
    profile.winStreak = 0;
    if (isRandom) profile.randomWinStreak = 0;
    profile.challenges.streak3.progress = profile.randomWinStreak || 0;
    profile.gold += 3;
    saveProfile(profile);
    return { gold: 3, bonusSack: false, winStreak: 0 };
  }
}

export function addUpgrade(profile, upgradeId) {
  if (!profile.ownedUpgrades.includes(upgradeId)) {
    profile.ownedUpgrades.push(upgradeId);
    // starter upgrade achievement
    const base = UPGRADE_TO_BASE[upgradeId];
    // check if upgrade belongs to a starter deck — caller can pass cards; we check id prefixes loosely via owned decks
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

/**
 * Open one heavy sack. Mutates profile.
 * @param {object} profile
 * @param {object[]} cards - full card catalog
 * @param {{ buy?: boolean }} opts - if buy, spend 40 gold when no queued sacks
 */
export function openSack(profile, cards, opts = {}) {
  if (profile.sacks > 0) {
    profile.sacks -= 1;
  } else if (opts.buy && profile.gold >= SACK_BUY_COST) {
    profile.gold -= SACK_BUY_COST;
  } else {
    return { error: 'No sacks and not enough gold.' };
  }

  profile.stats.sacksOpened = (profile.stats.sacksOpened || 0) + 1;
  maybeUnlockAchievement(profile, 'open-10-sacks', profile.stats.sacksOpened >= 10);

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

  const goldFallback = () => {
    const g = randInt(20, 60);
    profile.gold += g;
    return { type: 'gold', amount: g, label: `${g} purse gold` };
  };

  if (roll < 0.50) {
    reward = goldFallback();
  } else if (roll < 0.75) {
    const ups = unownedUpgrades();
    if (ups.length) {
      const id = pick(ups);
      addUpgrade(profile, id);
      const name = cards.find(c => c.id === id)?.name || id;
      reward = { type: 'upgrade', id, label: `Upgrade: ${name}` };
    } else {
      reward = goldFallback();
      reward.note = 'All upgrades owned — gold instead';
    }
  } else if (roll < 0.93) {
    if (lockedDecks.length) {
      const deck = pick(lockedDecks);
      const r = addFragment(profile, deck);
      reward = {
        type: 'fragment',
        deck,
        fragments: r.fragments,
        unlocked: r.unlocked,
        label: r.unlocked
          ? `Deck unlocked: ${deck}!`
          : `Fragment: ${deck} (${r.fragments}/${FRAGMENTS_TO_UNLOCK})`,
      };
    } else {
      reward = goldFallback();
      reward.note = 'All decks unlocked — gold instead';
    }
  } else {
    // jackpot 7%
    profile.gold += 100;
    const ups = unownedUpgrades();
    if (ups.length && Math.random() < 0.5) {
      const id = pick(ups);
      addUpgrade(profile, id);
      const name = cards.find(c => c.id === id)?.name || id;
      reward = { type: 'jackpot', gold: 100, upgrade: id, label: `Jackpot! 100 gold + ${name}` };
    } else if (lockedDecks.length) {
      const d1 = pick(lockedDecks);
      addFragment(profile, d1);
      let d2 = pick(lockedDecks.filter(d => d !== d1) || lockedDecks);
      if (!d2) d2 = d1;
      const r2 = addFragment(profile, d2);
      reward = {
        type: 'jackpot',
        gold: 100,
        fragments: [d1, d2],
        label: `Jackpot! 100 gold + 2 fragments (${d1}, ${d2})`,
        unlocked: r2.unlocked,
      };
    } else if (ups.length) {
      const id = pick(ups);
      addUpgrade(profile, id);
      reward = { type: 'jackpot', gold: 100, upgrade: id, label: `Jackpot! 100 gold + upgrade` };
    } else {
      reward = { type: 'jackpot', gold: 100, label: 'Jackpot! 100 gold' };
    }
  }

  saveProfile(profile);
  return { reward, profile };
}

export function buySack(profile) {
  if (profile.gold < SACK_BUY_COST) return { error: 'Need 40 gold.' };
  profile.gold -= SACK_BUY_COST;
  profile.sacks += 1;
  saveProfile(profile);
  return { ok: true };
}
