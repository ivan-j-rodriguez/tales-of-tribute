/**
 * Phase A copy + targeting + treasury sacrifice (no browser).
 */
import { readFileSync } from 'fs';
import { GameEngine } from '../web/js/engine.js';
import { applyOfficialPatronText, cardPlayLines } from '../web/js/texts.js';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')).cards;
const patrons = applyOfficialPatronText(
  JSON.parse(readFileSync(new URL('../data/patrons.json', import.meta.url), 'utf8')).patrons
);
const cardsById = Object.fromEntries(cards.map(c => [c.id, c]));
const patronsById = Object.fromEntries(patrons.map(p => [p.id, p]));

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok ', msg);
}

const harvest = cardsById['harvest-season'];
assert(!!harvest, 'harvest-season exists');
assert(/Draw 1 card/i.test(cardPlayLines(harvest).join(' ')), `harvest text: ${cardPlayLines(harvest)}`);

const gold = cardsById.gold;
assert(/Gain 1 Coin/i.test(cardPlayLines(gold).join(' ')), `gold text: ${cardPlayLines(gold)}`);

const hlaalu = patronsById.hlaalu;
assert(/FAVORS you/i.test(hlaalu.abilities.neutral.desc), 'hlaalu neutral has favor line');
assert(/NEUTRAL/i.test(hlaalu.abilities.unfavored.desc), 'hlaalu unfavored has neutral line');
assert(/cost minus 1/i.test(hlaalu.abilities.favored.desc), 'hlaalu favored prestige line');

const eng = new GameEngine(cardsById, patronsById);
eng.newMatch({ playerPatrons: ['pelin', 'hlaalu'], aiPatrons: ['crows', 'celarus'], playerFirst: true });
const p = eng.state.players[0];
p.isAI = false;
p.coin = 4;
// Force a played card so Treasury can be called
const goldCard = p.hand.find(c => c.id === 'gold') || p.hand[0];
if (goldCard) {
  p.hand = p.hand.filter(c => c.uid !== goldCard.uid);
  p.played.push(goldCard);
}
assert(eng.canCallPatron('treasury'), 'treasury callable with coin + owned card');
const steps = eng.targetingStepsForPatron('treasury');
assert(steps.some(s => s.kind === 'sacrifice'), `treasury asks for sacrifice: ${JSON.stringify(steps)}`);
const legal = eng.legalTargets(steps[0]);
assert(legal.length >= 1, `treasury legal targets ${legal.length}`);

const beforeWrit = p.cooldown.filter(c => c.id === 'writ-of-coin').length;
const pick = legal[0].uid;
const playedBefore = p.played.length + p.hand.length;
eng.callPatron('treasury', { sacrifice: pick });
assert(p.coin === 2, `treasury spends 2 coin (now ${p.coin})`);
assert(p.cooldown.some(c => c.id === 'writ-of-coin') || beforeWrit < p.cooldown.filter(c => c.id === 'writ-of-coin').length, 'writ created');
assert(p.played.length + p.hand.length === playedBefore - 1, 'sacrificed exactly one card');

const harvestCard = { uid: 'hs-test', id: 'harvest-season' };
p.hand.push(harvestCard);
const hsSteps = eng.targetingStepsForPlay('hs-test');
assert(hsSteps.length === 0, `harvest needs no targets (${hsSteps.length})`);

p.isAI = false;
p.coin = 4;
p.patronCallsLeft = 1;
p.played.push({ uid: 'held-gold', id: 'gold' });
const held = p.played.length + p.hand.length;
const coinBeforeSilent = p.coin;
const silent = eng.callPatron('treasury', {});
assert(silent === false, 'human empty picks does not auto-sacrifice');
assert(p.coin === coinBeforeSilent, `coin stays ${p.coin}`);
assert(p.played.length + p.hand.length === held, 'no silent sacrifice');

p.isAI = true;
p.coin = 4;
p.patronCallsLeft = 1;
const aiOk = eng.callPatron('treasury');
assert(aiOk === true, 'AI treasury may heuristic-pick');
assert(p.coin === 2, `AI treasury spends 2 (now ${p.coin})`);

const destroyCard = { uid: 'seeker-test', id: 'seeker-aspirant' };
p.isAI = false;
p.hand.push(destroyCard);
const destSteps = eng.targetingStepsForPlay('seeker-test');
assert(destSteps.some(s => s.kind === 'destroy'), `destroy card asks for a target: ${JSON.stringify(destSteps)}`);

p.power = 4;
p.agents = [];
eng.opp().agents = [{ uid: 'foe-1', id: 'knight-commander', hp: 3, maxHp: 3, taunt: false, confined: [] }];
const koLegal = eng.legalTargets({ kind: 'powerAttack' });
assert(koLegal.some(t => t.uid === 'foe-1'), `power-attack lists affordable agents: ${JSON.stringify(koLegal)}`);

console.log(failed ? `\n${failed} FAILED` : '\nPHASE A UNIT OK');
process.exit(failed ? 1 : 0);
