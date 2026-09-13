/**
 * Linux-runnable spec for the iOS TributeCore rules + club/gauntlet.
 * Mirrors ios/TributeCore (not a full engine reimplementation).
 */
import { readFileSync } from 'fs';
import { GameEngine } from '../web/js/engine.js';
import { TributeAI } from '../web/js/ai.js';
import {
  GAUNTLET_STOPS, STARTER_DECKS, LOCKED_DECKS, TABLE_SKINS, CARD_BACKS,
} from '../web/js/profile.js';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')).cards;
const patrons = JSON.parse(readFileSync(new URL('../data/patrons.json', import.meta.url), 'utf8')).patrons;
const cardsById = Object.fromEntries(cards.map(c => [c.id, c]));
const patronsById = Object.fromEntries(patrons.map(p => [p.id, p]));

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok ', msg);
}

assert(cards.length === 164, `164 cards (got ${cards.length})`);
assert(patrons.length === 13, `13 patrons (got ${patrons.length})`);
assert(STARTER_DECKS.length === 4, '4 starter decks');
assert(LOCKED_DECKS.length === 8, '8 locked decks');
assert(TABLE_SKINS.length >= 10, 'table skins');
assert(CARD_BACKS.length >= 8, 'card backs');
assert(GAUNTLET_STOPS.length >= 30, 'gauntlet pins on Tamriel');

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

function pathFor(date) {
  const rest = GAUNTLET_STOPS.map(s => s.id).filter(id => id !== 'highisle');
  return ['highisle', ...seededShuffle(rest, date + ':tot-road')];
}
const p1 = pathFor('2026-09-13');
const p2 = pathFor('2026-09-14');
assert(p1[0] === 'highisle' && p2[0] === 'highisle', 'High Isle starts the daily road');
assert(p1.join() !== p2.join(), 'date-seeded path changes by day');
assert(p1.length === GAUNTLET_STOPS.length, 'path visits every zone');

const rarity = (s) => s >= 4 ? 'Epic' : s >= 3 ? 'Superior' : s >= 2 ? 'Fine' : 'Common';
assert(rarity(1) === 'Common' && rarity(4) === 'Epic', 'streak rarity escalation');

const eng = new GameEngine(cardsById, patronsById);
eng.newMatch({ playerPatrons: ['pelin', 'hlaalu'], aiPatrons: ['crows', 'celarus'], playerFirst: true });
assert(eng.state.tavern.length === 5, 'tavern row 5');
assert(eng.state.players[0].hand.length === 5, 'opening hand 5');

eng.state.players[0].isAI = true;
eng.state.players[1].isAI = true;
const ai = new TributeAI(eng, 6);
let turns = 0;
while (!eng.state.winner && turns < 80) {
  const before = eng.state.active;
  let guard = 0;
  while (!eng.state.winner && eng.state.active === before && guard++ < 40) {
    const a = ai.chooseAction();
    if (!a || a.type === 'end') { eng.endTurn(); break; }
    ai.execute(a);
  }
  turns++;
}
assert(eng.state.winner === 0 || eng.state.winner === 1, `AI vs AI finishes (winner=${eng.state.winner}, turns=${turns})`);

console.log(failed ? `\n${failed} FAILED` : '\nALL OK');
process.exit(failed ? 1 : 0);
