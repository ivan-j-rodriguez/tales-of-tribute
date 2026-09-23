/**
 * Beginner curve for TributeAI difficulties 1–3.
 * Levels 4–10 stay on the pre-67 heuristic and should still take the
 * obvious line in these spots.
 */
import { readFileSync } from 'fs';
import { GameEngine } from '../web/js/engine.js';
import { TributeAI } from '../web/js/ai.js';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')).cards;
const patrons = JSON.parse(readFileSync(new URL('../data/patrons.json', import.meta.url), 'utf8')).patrons;
const cardsById = Object.fromEntries(cards.map(c => [c.id, c]));
const patronsById = Object.fromEntries(patrons.map(p => [p.id, p]));

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok ', msg);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fresh(diff, seed) {
  const eng = new GameEngine(cardsById, patronsById);
  eng.newMatch({
    playerPatrons: ['pelin', 'hlaalu'],
    aiPatrons: ['crows', 'rajhin'],
    playerFirst: false,
  });
  const ai = new TributeAI(eng, diff, mulberry32(seed));
  const me = eng.me();
  me.hand = [];
  me.coin = 0;
  me.power = 0;
  me.prestige = 0;
  me.played = [];
  me.patronCallsLeft = 0;
  me.suitsPlayed = {};
  eng.opp().agents = [];
  eng.state.tavern = [];
  eng.state.winner = null;
  eng.state.phase = 'main';
  return { eng, ai, me };
}

function sample(diff, seed, n, prepare, read) {
  let hits = 0;
  for (let i = 0; i < n; i++) {
    const ctx = fresh(diff, seed + i * 17);
    prepare(ctx);
    const action = ctx.ai.chooseAction();
    if (read(action, ctx)) hits++;
  }
  return hits / n;
}

const N = 240;
const levels = [1, 2, 3, 4, 5, 8];

function handLeft(diff, seed) {
  let sum = 0;
  const games = 80;
  for (let i = 0; i < games; i++) {
    const { eng, ai, me } = fresh(diff, seed + i * 13);
    for (let k = 0; k < 5; k++) me.hand.push(eng._inst('gold'));
    let guard = 0;
    while (guard++ < 12) {
      const a = ai.chooseAction();
      if (!a || a.type === 'end') break;
      const ok = ai.execute(a);
      if (ok === false) break;
    }
    sum += me.hand.length;
  }
  return sum / games;
}

console.log('\nCards left in hand when the AI passes (5 Gold, nothing else to do)');
const left = {};
for (const d of levels) {
  left[d] = handLeft(d, 1000 + d * 100);
  console.log(`  d${d}: ${left[d].toFixed(2)}`);
}
assert(left[1] > left[2] + 0.4, `d1 leaves more cards than d2 (${left[1].toFixed(2)} > ${left[2].toFixed(2)})`);
assert(left[2] > left[3] + 0.25, `d2 leaves more cards than d3 (${left[2].toFixed(2)} > ${left[3].toFixed(2)})`);
assert(left[1] >= 1.5, `d1 leaves a chunk of the hand (${left[1].toFixed(2)})`);
assert(left[3] < left[1] - 1, `d3 plays much more of the hand than d1`);
assert(left[5] <= 0.05 && left[8] <= 0.05 && left[4] <= 0.15, `d4–d8 still play the hand out (${left[4].toFixed(2)}, ${left[5].toFixed(2)}, ${left[8].toFixed(2)})`);

function prepBuy({ eng, me }) {
  me.coin = 6;
  me.patronCallsLeft = 0;
  eng.state.tavern = [
    eng._inst('gold'),
    eng._inst('peck'),
    eng._inst('blackfeather-knight'),
  ];
}
console.log('\nRate of buying Blackfeather Knight over Gold / Peck');
const buy = {};
for (const d of levels) {
  buy[d] = sample(d, 2000 + d * 50, N, prepBuy, a => a?.type === 'buy' && a.cardId === 'blackfeather-knight');
  console.log(`  d${d}: ${(buy[d] * 100).toFixed(1)}%`);
}
assert(buy[1] < 0.28, `d1 rarely buys the best card (${(buy[1] * 100).toFixed(1)}%)`);
assert(buy[2] >= buy[1] + 0.04, `d2 buys the knight more often than d1 (${(buy[1] * 100).toFixed(0)} → ${(buy[2] * 100).toFixed(0)})`);
assert(buy[3] >= buy[2] + 0.12, `d3 buys the knight more often than d2 (${(buy[2] * 100).toFixed(0)} → ${(buy[3] * 100).toFixed(0)})`);
assert(buy[3] <= 0.72, `d3 still misses a lot of good buys (${(buy[3] * 100).toFixed(1)}%)`);
assert(buy[3] < buy[5] - 0.2, `d3 still buys worse than d5 (${(buy[3] * 100).toFixed(1)} vs ${(buy[5] * 100).toFixed(1)})`);
assert(buy[4] >= 0.9 && buy[5] >= 0.95 && buy[8] >= 0.95, `d4+ still buy the knight`);

function prepKo({ eng, me }) {
  me.power = 4;
  me.hand = [];
  const taunt = eng._inst('knights-of-saint-pelin');
  eng.opp().agents = [taunt];
}
console.log('\nRate of knocking out a Taunt they can pay for');
const ko = {};
for (const d of levels) {
  ko[d] = sample(d, 3000 + d * 50, N, prepKo, a => a?.type === 'ko');
  console.log(`  d${d}: ${(ko[d] * 100).toFixed(1)}%`);
}
assert(ko[1] <= 0.30, `d1 usually misses the free Taunt KO (${(ko[1] * 100).toFixed(1)}%)`);
assert(ko[1] + 0.08 < ko[2] && ko[2] + 0.08 < ko[3], `Taunt KO rises 1→2→3 (${(ko[1] * 100).toFixed(0)} ${(ko[2] * 100).toFixed(0)} ${(ko[3] * 100).toFixed(0)})`);
assert(ko[3] <= 0.82, `d3 still misses Taunt KOs (${(ko[3] * 100).toFixed(1)}%)`);
assert(ko[4] >= 0.95 && ko[5] >= 0.95 && ko[8] >= 0.95, `d4+ still take the Taunt KO`);

function prepPatron({ eng, me }) {
  me.coin = 5;
  me.patronCallsLeft = 1;
  me.hand = [];
  me.played = [];
  eng.state.turn = 3;
}
console.log('\nRate of calling Crows (clearly the best patron at 5 Coin)');
const pat = {};
for (const d of levels) {
  pat[d] = sample(d, 4000 + d * 50, N, prepPatron, a => a?.type === 'patron' && a.id === 'crows');
  console.log(`  d${d}: ${(pat[d] * 100).toFixed(1)}%`);
}
assert(pat[1] <= 0.35, `d1 rarely calls the right patron (${(pat[1] * 100).toFixed(1)}%)`);
assert(pat[2] >= pat[1] + 0.03, `d2 calls Crows more often than d1 (${(pat[1] * 100).toFixed(0)} → ${(pat[2] * 100).toFixed(0)})`);
assert(pat[3] >= pat[2] + 0.12, `d3 calls Crows more often than d2 (${(pat[2] * 100).toFixed(0)} → ${(pat[3] * 100).toFixed(0)})`);
assert(pat[3] <= 0.8, `d3 still mistimes patrons (${(pat[3] * 100).toFixed(1)}%)`);
assert(pat[3] < pat[5] - 0.15, `d3 patrons lag d5 (${(pat[3] * 100).toFixed(1)} vs ${(pat[5] * 100).toFixed(1)})`);
assert(pat[4] >= 0.9 && pat[5] >= 0.95 && pat[8] >= 0.95, `d4+ still call Crows`);

function humanTurn(eng) {
  const helper = new TributeAI(eng, 5);
  let guard = 0;
  while (!eng.state.winner && eng.state.active === 0 && guard++ < 40) {
    const p = eng.me();
    const o = eng.opp();
    const acts = eng.legalActions();
    const plays = acts.filter(a => a.type === 'play' && eng.canPlay(a.uid));
    if (plays.length) {
      plays.sort((a, b) => helper.playScore(eng.card(b.cardId), p, o) - helper.playScore(eng.card(a.cardId), p, o));
      if (eng.playCard(plays[0].uid) === false) { eng.endTurn(); break; }
      continue;
    }
    if (p.power > 0 && !o.agents.some(a => a.taunt) && p.prestige + p.power >= 40) {
      eng.endTurn();
      break;
    }
    const kos = acts.filter(a => a.type === 'ko');
    if (kos.length) {
      if (eng.knockoutWithPower(kos[0].uid) === false) { eng.endTurn(); break; }
      continue;
    }
    const buys = acts.filter(a => a.type === 'buy' && eng.card(a.cardId)?.cost > 0);
    if (buys.length) {
      buys.sort((a, b) => helper.buyScore(eng.card(b.cardId), p, o) - helper.buyScore(eng.card(a.cardId), p, o));
      if (eng.buy(buys[0].index) === false) { eng.endTurn(); break; }
      continue;
    }
    const pats = acts.filter(a => a.type === 'patron');
    if (pats.length) {
      pats.sort((a, b) => helper.patronScore(b.id, p, o) - helper.patronScore(a.id, p, o));
      if (helper.patronScore(pats[0].id, p, o) >= 30) {
        if (eng.callPatron(pats[0].id) !== false) continue;
      }
    }
    eng.endTurn();
    break;
  }
}

function matchWinner(diff, seed) {
  const eng = new GameEngine(cardsById, patronsById);
  eng.newMatch({
    playerPatrons: ['pelin', 'hlaalu'],
    aiPatrons: ['crows', 'rajhin'],
    playerFirst: true,
  });
  const ai = new TributeAI(eng, diff, mulberry32(seed));
  let turns = 0;
  while (!eng.state.winner && turns < 100) {
    if (eng.state.active === 1) {
      let guard = 0;
      while (!eng.state.winner && eng.state.active === 1 && guard++ < 40) {
        const a = ai.chooseAction();
        if (!a || a.type === 'end') { eng.endTurn(); break; }
        if (ai.execute(a) === false) { eng.endTurn(); break; }
      }
    } else {
      humanTurn(eng);
    }
    turns++;
  }
  return eng.state.winner;
}

console.log('\nTutorial-level human win rate (seat 0)');
const humanWins = {};
const GAMES = 48;
for (const d of [1, 2, 3, 5]) {
  let wins = 0;
  let unfinished = 0;
  for (let i = 0; i < GAMES; i++) {
    const w = matchWinner(d, 8000 + d * 1000 + i);
    if (w === 0) wins++;
    else if (w == null) unfinished++;
  }
  humanWins[d] = wins / GAMES;
  console.log(`  vs d${d}: ${(humanWins[d] * 100).toFixed(0)}% human wins (${unfinished} unfinished)`);
}
assert(humanWins[1] >= 0.75, `a learning player usually beats d1 (${(humanWins[1] * 100).toFixed(0)}%)`);
assert(humanWins[1] >= humanWins[3] + 0.08, `d3 is a step up from d1 (${(humanWins[1] * 100).toFixed(0)}% vs ${(humanWins[3] * 100).toFixed(0)}% human wins)`);
assert(humanWins[2] <= humanWins[1] + 0.02 && humanWins[2] >= humanWins[3] - 0.02, `d2 sits between d1 and d3 (${(humanWins[1] * 100).toFixed(0)} / ${(humanWins[2] * 100).toFixed(0)} / ${(humanWins[3] * 100).toFixed(0)})`);
assert(humanWins[3] > humanWins[5], `d3 is softer than d5 for the same player (${(humanWins[3] * 100).toFixed(0)}% vs ${(humanWins[5] * 100).toFixed(0)}%)`);

console.log(failed ? `\n${failed} FAILED` : '\nALL OK');
process.exit(failed ? 1 : 0);
