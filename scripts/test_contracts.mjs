/**
 * Contracts never re-enter a player's deck through cooldown.
 * Boots the web engine, plays a known contract action, ends the turn,
 * and checks exile. Same for a contract-agent knockout and for discard.
 */
import { readFileSync } from 'fs';
import { GameEngine } from '../web/js/engine.js';

const cards = JSON.parse(readFileSync(new URL('../web/data/cards.json', import.meta.url), 'utf8')).cards;
const patrons = JSON.parse(readFileSync(new URL('../web/data/patrons.json', import.meta.url), 'utf8')).patrons;
const uesp = JSON.parse(readFileSync(new URL('../web/data/cards.uesp.json', import.meta.url), 'utf8')).cards;
const cardsById = Object.fromEntries(cards.map(c => [c.id, c]));
const patronsById = Object.fromEntries(patrons.map(p => [p.id, p]));

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok ', msg);
}

function has(arr, uid) {
  return (arr || []).some(c => c.uid === uid);
}

function zones(player) {
  return ['hand', 'draw', 'cooldown', 'played', 'agents'];
}

function notCycling(player, uid, label) {
  for (const z of zones(player)) {
    assert(!has(player[z], uid), `${label} not in ${z}`);
  }
  assert(has(player.exile, uid), `${label} is in exile`);
}

function fresh() {
  const eng = new GameEngine(cardsById, patronsById);
  eng.newMatch({
    playerPatrons: ['pelin', 'hlaalu'],
    aiPatrons: ['crows', 'rajhin'],
    playerFirst: true,
  });
  eng.state.players[0].isAI = false;
  eng.state.players[1].isAI = true;
  return eng;
}

const slug = (s) => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const byName = new Map(cards.map(c => [slug(c.name), c]));
const flagMiss = [];
for (const u of uesp) {
  const c = byName.get(slug(u.name));
  if (!c) continue;
  if (u.isContract && !c.contract) flagMiss.push(c.id);
}
assert(flagMiss.length === 0, `UESP contract cards flagged in cards.json (${flagMiss.join(', ') || 'none missing'})`);
assert(cardsById['unfathomable-secrets']?.contract === true, 'Unfathomable Secrets stays a contract action (live sources; UESP dump types it as a non-contract agent)');
assert(cards.filter(c => c.contract && c.type !== 'action' && c.type !== 'agent').length === 0, 'every contract is an action or an agent');

// Play a contract action from hand, end the turn, draw again.
{
  const eng = fresh();
  const p = eng.state.players[0];
  const card = eng._inst('harvest-season');
  p.hand.push(card);
  const handBefore = p.hand.length;
  assert(eng.playCard(card.uid) === true, 'play Harvest Season');
  assert(p.hand.length === handBefore, 'Harvest Season draw replaced the played card');
  notCycling(p, card.uid, 'played Harvest Season');
  p.draw = [];
  eng.endTurn();
  eng.endTurn();
  const owner = eng.state.players[0];
  notCycling(owner, card.uid, 'Harvest Season after it would have been drawn');
}

// A contract with a choice still plays on buy, using the chosen option.
{
  const eng = fresh();
  const steps = eng.targetingStepsForCardId('grand-oratory');
  assert(steps.some(s => s.kind === 'choose'), 'Grand Oratory buy asks for a choice');
  const card = eng._inst('grand-oratory');
  eng.state.tavern = [card];
  const p = eng.me();
  p.coin = 5;
  p.power = 0;
  assert(eng.buy(0, { choose: 0 }) === true, 'buy Grand Oratory with choice 0');
  assert(p.power === 2, `Grand Oratory choice granted 2 Power (got ${p.power})`);
  notCycling(p, card.uid, 'bought Grand Oratory');
}

// Buy a contract action: play immediately, never cooldown, still gone next turn.
{
  const eng = fresh();
  const p = eng.me();
  const card = eng._inst('blackmail');
  eng.state.tavern = [card];
  p.coin = 5;
  p.power = 0;
  p.draw = [];
  p.cooldown = [];
  assert(eng.buy(0) === true, 'buy Blackmail');
  assert(p.power === 2, `Blackmail resolved +2 Power (got ${p.power})`);
  notCycling(p, card.uid, 'bought Blackmail');
  eng.endTurn();
  eng.endTurn();
  notCycling(eng.state.players[0], card.uid, 'bought Blackmail next turn');
}

// Buy a contract agent, then knock it out from the other seat.
{
  const eng = fresh();
  const card = eng._inst('shield-bearer');
  eng.state.tavern = [card];
  const buyer = eng.me();
  buyer.coin = 8;
  buyer.power = 0;
  assert(eng.buy(0) === true, 'buy Shield Bearer');
  assert(buyer.agents.some(a => a.uid === card.uid), 'Shield Bearer sits on the agent row');
  assert(!has(buyer.cooldown, card.uid), 'Shield Bearer not in cooldown while in play');
  assert(buyer.power === 1, 'Shield Bearer play effect granted power');
  eng.endTurn();
  eng.me().power = 6;
  assert(eng.knockoutWithPower(card.uid) === true, 'knock out Shield Bearer');
  const owner = eng.state.players[0];
  notCycling(owner, card.uid, 'defeated Shield Bearer');
}

// Discard, toss, and a direct cooldown attempt all exile.
{
  const eng = fresh();
  const p = eng.me();
  const discarded = eng._inst('tithe');
  p.hand.push(discarded);
  eng._picks = { discard: [discarded.uid] };
  eng._strictPicks = true;
  eng._autoDiscard(p, 1);
  notCycling(p, discarded.uid, 'discarded Tithe');

  const tossed = eng._inst('imprisonment');
  p.draw.push(tossed);
  eng._picks = { toss: [tossed.uid] };
  eng._strictPicks = true;
  eng._toss(p, 1);
  notCycling(p, tossed.uid, 'tossed Imprisonment');

  const forced = eng._inst('ragpicker');
  eng._toCooldown(p, forced);
  notCycling(p, forced.uid, 'cooldown-guard Ragpicker');
}

// Confine release of a contract does not return it to cooldown.
{
  const eng = fresh();
  const p = eng.me();
  const trapped = eng._inst('kwama-egg-mine');
  const agent = eng._inst('the-armory');
  agent.hp = 1;
  agent.maxHp = 1;
  agent.confined = [trapped];
  p.agents.push(agent);
  eng._defeatAgent(p, agent);
  const rival = eng.state.players[1];
  notCycling(rival, trapped.uid, 'released Kwama Egg Mine');
  assert(!has(p.exile, trapped.uid) && !has(p.cooldown, trapped.uid), 'released contract did not stay with the agent owner');
  assert(!has(p.agents, agent.uid), 'host agent left the row');
}

// Contract discard: Ring's Guile opens a hand discard, skips itself, and exiles.
{
  const eng = fresh();
  const p = eng.me();
  const card = eng._inst('rings-guile');
  const gold = p.hand.find(c => c.id === 'gold');
  p.hand.push(card);
  const steps = eng.targetingStepsForPlay(card.uid);
  const disc = steps.find(s => s.kind === 'discard');
  assert(!!disc, 'Ring\'s Guile opens a discard step');
  assert(disc?.sourceUid === card.uid, 'discard step is tagged with the resolving card');
  const legal = eng.legalTargets(disc);
  assert(legal.every(t => t.uid !== card.uid), 'Ring\'s Guile cannot discard itself');
  assert(legal.some(t => t.uid === gold.uid), 'a Gold in hand is a legal discard');
  assert(eng.playCard(card.uid, 0, { discard: [gold.uid] }) === true, 'play Ring\'s Guile');
  assert(has(p.cooldown, gold.uid), 'discarded Gold reached cooldown');
  notCycling(p, card.uid, 'played Ring\'s Guile');
}

// Acquire and Bargain cannot select contracts. A normal buy still cools down.
{
  const eng = fresh();
  const p = eng.me();
  const contract = eng._inst('ebony-mine');
  const normal = eng._inst('the-armory');
  eng.state.tavern = [contract, normal];
  const acquireLegal = eng.legalTargets({ kind: 'acquire', maxCost: 9 });
  assert(acquireLegal.every(t => t.id !== 'ebony-mine'), 'Acquire list skips contracts');
  assert(acquireLegal.some(t => t.id === 'the-armory'), 'Acquire list keeps a normal card');
  const bargainLegal = eng.legalTargets({ kind: 'moraShare' });
  assert(bargainLegal.every(t => !cardsById[t.id]?.contract), 'Bargain list skips contracts');
  p.isAI = true;
  eng._acquire(p, 9);
  assert(has(p.cooldown, normal.uid), 'Acquire still cools down a normal card');
  assert(!has(p.cooldown, contract.uid) && !has(p.exile, contract.uid), 'Acquire left the contract in the tavern');
  assert(eng.state.tavern.some(c => c.uid === contract.uid), 'Ebony Mine still on the row');

  const only = eng._inst('bonfire');
  eng.state.tavern = [only];
  eng._acquire(p, 99);
  assert(eng.state.tavern.some(c => c.uid === only.uid), 'Acquire of only a contract does nothing');
  assert(!has(p.cooldown, only.uid), 'that contract was not cooled down');

  const goldBuy = fresh();
  const buyer = goldBuy.me();
  const armory = goldBuy._inst('the-armory');
  goldBuy.state.tavern = [armory];
  buyer.coin = 6;
  assert(goldBuy.buy(0) === true, 'buy a normal action');
  assert(has(buyer.cooldown, armory.uid), 'normal buy still goes to cooldown');
  assert(!has(buyer.exile, armory.uid), 'normal buy is not exiled');
  const gold = buyer.hand.find(c => c.id === 'gold');
  assert(goldBuy.playCard(gold.uid) === true, 'play Gold');
  goldBuy.endTurn();
  assert(has(goldBuy.state.players[0].cooldown, gold.uid), 'played Gold reaches cooldown at end of turn');
  assert(!has(goldBuy.state.players[0].exile, gold.uid), 'played Gold is not exiled');
}

console.log(failed ? `\n${failed} FAILED` : '\nCONTRACTS OK');
process.exit(failed ? 1 : 0);
