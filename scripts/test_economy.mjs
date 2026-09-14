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
  SHOP_SKIN_SLOTS, SHOP_BACK_SLOTS, SHOP_FRAG_SLOTS, groupCardsByDeck, canonPatron,
  crateDaysForMonth, crateVariantForDay, CRATE_VARIANTS, CRATES_PER_MONTH,
  resolveCrateVariant,
} from '../web/js/economy.js';
import {
  defaultProfile, addFragment, addCardClue, tryUnlockDeck, deckReadyToUnlock,
  recordMatchResult, FRAGMENTS_TO_UNLOCK, LOCKED_DECKS, buyFragment,
  recordGauntletResult, ensureGauntletDay, GAUNTLET_STOPS,
  openCrownCrate,
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
assert(slateA.featured.filter((o) => o.kind === 'fragment').length <= SHOP_FRAG_SLOTS, 'at most one fragment on the slate');
assert(slateA.featured.filter((o) => o.kind === 'skin').length <= SHOP_SKIN_SLOTS, 'at most four table skins');
assert(slateA.featured.filter((o) => o.kind === 'back').length <= SHOP_BACK_SLOTS, 'at most four card backs');
assert(slateA.featured.some((o) => o.kind === 'fragment'), 'slate lists fragments');
assert(slateA.featured.find((o) => o.kind === 'fragment')?.price >= 280, 'fragment is a prize, not pocket gold');
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
assert(!grid.cells.some((c) => c.date && c.date < '2026-09-14' && c.state === 'miss'),
  'days before first check-in are not red X');
const mid = loginMonthGrid({ '2026-09-10': 'ok', '2026-09-12': 'ok', '2026-09-14': 'ok' }, sep14);
assert(mid.cells.find((c) => c.date === '2026-09-11')?.state === 'miss', 'skipped day after start is red X');
assert(mid.cells.find((c) => c.date === '2026-09-01')?.state === 'empty', 'pre-start days stay empty');

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
assert(DECK_IMPORTANCE.includes('treasury'), 'Treasury/Neutral is its own group');
assert(canonPatron('hermaeus_mora') === 'mora', 'hermaeus_mora joins as mora');
const groups = groupCardsByDeck(cards);
assert(groups.some((g) => g.id === 'mora' && g.cards.length >= 12), `Mora group present (${groups.find((g) => g.id === 'mora')?.cards.length})`);
assert(groups.some((g) => g.id === 'pelin' && g.cards.length), 'Pelin group present');
assert(groups.some((g) => g.id === 'treasury' && g.cards.length), 'Treasury group present');
const moraIdx = groups.findIndex((g) => g.id === 'mora');
const pelinIdx = groups.findIndex((g) => g.id === 'pelin');
assert(pelinIdx < moraIdx, 'Pelin header comes before Mora in All-cards scroll');
const moraCards = groups.find((g) => g.id === 'mora').cards;
assert(moraCards[0]?.starter || moraCards[0]?.id === 'unsealed-glyphic', 'Mora starters first in group');
const days = crateDaysForMonth(2026, 9);
assert(days.length === 2 && days[0] !== days[1], `two crate days in Sept (${days})`);
const firstCrate = crateVariantForDay(`2026-09-${String(days[0]).padStart(2, '0')}`);
const secondCrate = crateVariantForDay(`2026-09-${String(days[1]).padStart(2, '0')}`);
assert(['iron', 'orichalcum'].includes(firstCrate?.id), `first crate day is iron/orichalcum (${firstCrate?.id})`);
assert(['ebony', 'voidsteel'].includes(secondCrate?.id), `second crate day is ebony/voidsteel (${secondCrate?.id})`);
assert(resolveCrateVariant({ id: 'ebony', rarity: 'fine' })?.rarity === 'superior',
  'crate id wins over a mismatched rarity field');
assert(CRATES_PER_MONTH === 2, 'max two crown crates a month');

const origRandom = Math.random;
Math.random = () => 0;
try {
  const iron = openCrownCrate(defaultProfile(), cards, { id: 'iron', name: 'shown as orichalcum', rarity: 'fine' });
  const orichalcum = openCrownCrate(defaultProfile(), cards, CRATE_VARIANTS[1]);
  const ebony = openCrownCrate(defaultProfile(), cards, { id: 'ebony' });
  const voidsteel = openCrownCrate(defaultProfile(), cards, 'voidsteel');
  assert(iron.crate.id === 'iron' && iron.rarity === 'common', `iron crate loot is common (${iron.rarity})`);
  assert(orichalcum.crate.id === 'orichalcum' && orichalcum.rarity === 'fine', 'orichalcum crate loot is fine');
  assert(ebony.crate.id === 'ebony' && ebony.rarity === 'superior', 'ebony crate loot is superior');
  assert(voidsteel.crate.id === 'voidsteel' && voidsteel.rarity === 'epic', 'voidsteel crate loot is epic');
  assert(iron.reward.type === 'gold' && ebony.reward.type === 'gold', 'deterministic gold path for loot-bias check');
  assert(iron.reward.amount < orichalcum.reward.amount, `orichalcum gold > iron (${iron.reward.amount} vs ${orichalcum.reward.amount})`);
  assert(orichalcum.reward.amount < ebony.reward.amount, `ebony gold > orichalcum (${orichalcum.reward.amount} vs ${ebony.reward.amount})`);
  assert(ebony.reward.amount < voidsteel.reward.amount, `voidsteel gold > ebony (${ebony.reward.amount} vs ${voidsteel.reward.amount})`);
} finally {
  Math.random = origRandom;
}

const capP = defaultProfile();
capP.pendingCrate = { id: 'ebony' };
const fromPending = openCrownCrate(capP, cards, null);
assert(fromPending.crate?.id === 'ebony', `open uses the pending offered crate (${fromPending.crate?.id || fromPending.error})`);
assert(!capP.pendingCrate, 'pending crate is consumed on open');
openCrownCrate(capP, cards, CRATE_VARIANTS[0]);
const third = openCrownCrate(capP, cards, CRATE_VARIANTS[3]);
assert(!!third.error, `third crate in a month blocked (${third.error})`);
assert(capP.cratesOpened === 2, `opened count stays at two (${capP.cratesOpened})`);

const rollP = defaultProfile();
rollP.cratesMonth = '2026-08';
rollP.cratesOpened = 2;
rollP.pendingCrate = { id: 'voidsteel' };
const expired = openCrownCrate(rollP, cards, null);
assert(!!expired.error, `last month’s unopened crate expires (${expired.error})`);
const freshMonth = openCrownCrate(rollP, cards, { id: 'iron' });
assert(freshMonth.crate?.id === 'iron' && rollP.cratesOpened === 1, 'new month allows a fresh crate');

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall economy checks passed');
