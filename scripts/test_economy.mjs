/**
 * Club economy: rotating shop, rarity, clues, seasons, login calendar (no browser).
 */
import { readFileSync } from 'fs';

const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
import {
  shopPeriodKey, buildShopSlate, currentSeason, weeklyKey, buildWeeklyGoals,
  buildSeasonalGoals, applyChallengeEvent, bumpGoal, RARITY_PRICES, DECK_RARITY,
  CLUES_TO_UPGRADE, MATCH_GOLD, loginMonthGrid, fillMissedLogins, tomorrowShopSlate,
  roadGrandPrize, clueCountOf, DECK_IMPORTANCE, SHOP_FEATURED_SLOTS,
} from '../web/js/economy.js';
import {
  defaultProfile, addFragment, addCardClue, tryUnlockDeck, deckReadyToUnlock,
  recordMatchResult, FRAGMENTS_TO_UNLOCK, LOCKED_DECKS, buyFragment,
  recordGauntletResult, ensureGauntletDay, GAUNTLET_STOPS,
} from '../web/js/profile.js';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')).cards;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok ', msg);
}

const sep14 = new Date('2026-09-14T16:00:00Z'); // afternoon UTC → still Sep 14 NY
assert(shopPeriodKey(sep14) === shopPeriodKey(new Date(sep14.getTime() + 3600_000)), 'shop period stable within a day');
assert(weeklyKey(sep14) === '2026-09-14', `weekly key monday ${weeklyKey(sep14)}`);

const season = currentSeason(sep14);
assert(season?.id === 'undaunted', `mid-Sep 2026 season is Undaunted (${season?.id})`);
const seas30 = currentSeason(new Date('2026-10-02T16:00:00Z'));
assert(seas30?.id === 'high-seas', `early Oct 2026 is High Seas (${seas30?.id})`);

const p0 = defaultProfile();
const slateA = buildShopSlate({
  periodKey: 1000,
  skins: [{ id: 'auridon', price: 280, rarity: 'common' }, { id: 'apocrypha', price: 1400, rarity: 'legendary' }],
  backs: [{ id: 'warden', price: 220, rarity: 'common' }, { id: 'vestige', price: 1100, rarity: 'legendary' }],
  lockedDecks: LOCKED_DECKS,
  unlockedDecks: p0.unlockedDecks,
  ownedUpgrades: [],
  ownedSkins: ['high-isle'],
  ownedBacks: ['default'],
  cards,
  seasonId: 'undaunted',
});
assert(slateA.featured.length <= SHOP_FEATURED_SLOTS, `featured slate small (${slateA.featured.length})`);
assert(slateA.catalogSize > slateA.featured.length, 'most catalog stays off the slate');
assert(slateA.featured.some((o) => o.kind === 'fragment'), 'slate lists fragments');
const slateB = buildShopSlate({ ...slateA, periodKey: 1000, skins: [{ id: 'auridon', price: 280 }], backs: [{ id: 'warden', price: 220 }], lockedDecks: LOCKED_DECKS, unlockedDecks: p0.unlockedDecks, ownedUpgrades: [], ownedSkins: ['high-isle'], ownedBacks: ['default'], cards, seasonId: 'undaunted' });
assert(slateA.featured.map((o) => o.id).join() === buildShopSlate({
  periodKey: 1000,
  skins: [{ id: 'auridon', price: 280, rarity: 'common' }, { id: 'apocrypha', price: 1400, rarity: 'legendary' }],
  backs: [{ id: 'warden', price: 220, rarity: 'common' }, { id: 'vestige', price: 1100, rarity: 'legendary' }],
  lockedDecks: LOCKED_DECKS,
  unlockedDecks: p0.unlockedDecks,
  ownedUpgrades: [],
  ownedSkins: ['high-isle'],
  ownedBacks: ['default'],
  cards,
  seasonId: 'undaunted',
}).featured.map((o) => o.id).join(), 'same period → same slate');

const tom = tomorrowShopSlate({
  skins: [{ id: 'auridon', price: 280, rarity: 'common' }],
  backs: [{ id: 'warden', price: 220, rarity: 'common' }],
  lockedDecks: LOCKED_DECKS,
  unlockedDecks: p0.unlockedDecks,
  ownedUpgrades: [],
  ownedSkins: ['high-isle'],
  ownedBacks: ['default'],
  cards,
  seasonId: 'undaunted',
});
assert(tom.periodKey === shopPeriodKey() + 1, 'tomorrow preview is next period');

assert(RARITY_PRICES.fragment.legendary > RARITY_PRICES.fragment.common * 4, 'legendary fragments much more expensive');
assert(DECK_RARITY.mora === 'legendary', 'Mora is legendary');
assert(MATCH_GOLD.casualWin === 5 && MATCH_GOLD.rankedWin === 8, 'match gold is modest');

const p = defaultProfile();
p.gold = 40;
const denied = buyFragment(p, 'hunding', cards);
assert(!!denied.error, `off-slate / poor buy blocked: ${denied.error}`);

const frag = defaultProfile();
for (let i = 0; i < FRAGMENTS_TO_UNLOCK; i++) addFragment(frag, 'hunding', cards);
assert(!frag.unlockedDecks.includes('hunding'), '5 fragments alone do not unlock — need card clues');
assert(!deckReadyToUnlock(frag, 'hunding', cards), 'deck gate wants one of each base card');

const hundingBases = cards.filter((c) => c.patron === 'hunding' && !c.token && !c.curse && (c.baseQty || 0) > 0);
for (const c of hundingBases) {
  addCardClue(frag, c.id, cards);
}
assert(deckReadyToUnlock(frag, 'hunding', cards), 'fragments + one of each base card unlocks');
assert(frag.unlockedDecks.includes('hunding'), 'last clue + fragments auto-unlocks Hunding');

const clueP = defaultProfile();
const base = cards.find((c) => c.id === 'hireling');
assert(!!base, 'hireling exists');
let last = null;
for (let i = 0; i < CLUES_TO_UPGRADE; i++) last = addCardClue(clueP, 'hireling', cards);
assert(last.upgradeId === 'oathman' || clueP.ownedUpgrades.includes('oathman'), `3 clues on hireling → oathman (${last.upgradeId})`);

const goals = buildWeeklyGoals('2026-09-14', p0);
assert(goals.length === 4, `4 weekly goals (${goals.length})`);
const g0 = { ...goals[0], type: 'win_matches', target: 2, progress: 0 };
bumpGoal(g0, { kind: 'win' });
bumpGoal(g0, { kind: 'win' });
assert(g0.progress === 2, 'weekly win progress');

const sgoals = buildSeasonalGoals(season, p0);
assert(sgoals.length >= 3, 'seasonal track has several goals');

const cal = fillMissedLogins({ '2026-09-10': 'ok' }, '2026-09-14');
assert(cal['2026-09-11'] === 'miss' && cal['2026-09-14'] === 'ok', 'missed days mark miss, today ok');
const grid = loginMonthGrid({ '2026-09-14': 'ok' }, sep14);
assert(grid.cells.some((c) => c.state === 'today' || c.state === 'ok'), 'month grid has today');

const mp = defaultProfile();
const win = recordMatchResult(mp, { won: true, ranked: false, patrons: ['pelin', 'hlaalu'], rivalPatrons: ['crows', 'celarus'] });
assert(win.gold === 5, `casual win pays 5 (${win.gold})`);
const loss = recordMatchResult(mp, { won: false, ranked: false, patrons: ['pelin'], rivalPatrons: ['crows', 'celarus'] });
assert(loss.gold === 1 && !loss.purse, 'loss pays 1g and no cutpurse');
const ranked = recordMatchResult(defaultProfile(), { won: true, ranked: true, patrons: ['pelin'], rivalPatrons: ['mora'] });
assert(ranked.gold === 8 && ranked.purse, 'ranked win pays 8g + purse');

const prize = roadGrandPrize('2026-09-14');
assert(prize && prize.label, `grand prize rotates (${prize.label})`);

assert(DECK_IMPORTANCE[0] === 'pelin' && DECK_IMPORTANCE.includes('mora'), 'deck order starters first, Mora late');

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall economy checks passed');
