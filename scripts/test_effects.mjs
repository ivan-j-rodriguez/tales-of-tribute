/**
 * Effect fidelity: piles, counts, taunt, confine, refresh, curses, passives, draw-up.
 */
import { readFileSync } from 'fs';
import { GameEngine } from '../web/js/engine.js';
import { effectSentence } from '../web/js/texts.js';

const cards = JSON.parse(readFileSync(new URL('../web/data/cards.json', import.meta.url), 'utf8')).cards;
const patrons = JSON.parse(readFileSync(new URL('../web/data/patrons.json', import.meta.url), 'utf8')).patrons;
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

assert(/Refresh — Return up to 2 cards of any type/.test(effectSentence({ op: 'draw_refresh', n: 2 })), 'draw refresh sentence is Refresh, not Toss');
assert(/While this card is in play/.test(effectSentence({ op: 'passive', trigger: 'discard', resource: 'power', n: 1 })), 'action passive wording');

// Draw up to 5, and the second player gains 1 Coin on their first turn.
{
  const eng = fresh();
  const p = eng.me();
  assert(p.coin === 0, 'first player starts with no bonus coin');
  assert(p.hand.length === 5, 'opening hand is 5');
  p.hand.splice(0, 2);
  eng.endTurn();
  assert(eng.state.turn === 2, 'turn advanced to 2');
  assert(eng.me().coin === 1, `second player gained 1 Coin (got ${eng.me().coin})`);
  eng.endTurn();
  assert(eng.state.players[0].hand.length === 5, `draw up to 5 (got ${eng.state.players[0].hand.length})`);
}

// Contract destroy: Ragpicker exiles a played Gold and then itself.
{
  const eng = fresh();
  const p = eng.me();
  const gold = p.hand.find(c => c.id === 'gold');
  assert(eng.playCard(gold.uid) === true, 'play Gold before Ragpicker');
  const rag = eng._inst('ragpicker');
  p.hand.push(rag);
  const steps = eng.targetingStepsForPlay(rag.uid);
  const dest = steps.find(s => s.kind === 'destroy');
  assert(!!dest, 'Ragpicker opens destroy');
  const legal = eng.legalTargets(dest);
  assert(legal.some(t => t.uid === gold.uid), 'played Gold is a destroy target');
  assert(legal.every(t => t.uid !== rag.uid), 'Ragpicker is not a destroy target');
  assert(eng.playCard(rag.uid, 0, { destroy: [gold.uid] }) === true, 'play Ragpicker');
  assert(has(p.exile, gold.uid), 'destroyed Gold is exiled');
  assert(!has(p.cooldown, gold.uid), 'destroyed Gold is not in cooldown');
  assert(has(p.exile, rag.uid), 'Ragpicker exiled after play');
  assert(!has(p.cooldown, rag.uid) && !has(p.hand, rag.uid) && !has(p.draw, rag.uid), 'Ragpicker did not cycle');
}

// Replace sends the chosen tavern card to the tavern discard.
{
  const eng = fresh();
  const p = eng.me();
  const row = eng.state.tavern[0];
  const bar = eng._inst('barterer');
  p.hand.push(bar);
  assert(eng.playCard(bar.uid, 0, { replace: [row.uid] }) === true, 'play Barterer');
  assert(!eng.state.tavern.some(c => c.uid === row.uid), 'replaced card left the tavern');
  assert(has(eng.state.tavernDiscard, row.uid), 'replaced card is in the tavern discard');
  assert(has(p.exile, bar.uid), 'Barterer exiled');
}

// Confine attaches to the agent that was just played. One card satisfies "up to 2".
{
  const eng = fresh();
  const p = eng.me();
  const o = eng.opp();
  p.suitsPlayed.almalexia = 1;
  const agent = eng._inst('hand-of-almalexia');
  const trapped = eng._inst('gold');
  p.hand.push(agent);
  o.cooldown.push(trapped);
  const steps = eng.targetingStepsForPlay(agent.uid);
  assert(steps.some(s => s.kind === 'confine'), 'Hand of Almalexia combo opens confine');
  assert(eng.playCard(agent.uid, 0, { confine: [trapped.uid] }) === true, 'play Hand of Almalexia');
  const seated = p.agents.filter(a => a.uid === agent.uid);
  assert(seated.length === 1, 'contract agent seated once');
  assert(seated[0].confined.some(c => c.uid === trapped.uid), 'gold is confined under the agent');
  assert(!has(o.cooldown, trapped.uid), 'confined gold left the opponent cooldown');
}

// Refresh, including Hand Refresh, returns cooldown cards to the top of the draw pile.
{
  const eng = fresh();
  const p = eng.me();
  const gold = p.hand.find(c => c.id === 'gold');
  p.hand = p.hand.filter(c => c.uid !== gold.uid);
  p.cooldown.push(gold);
  const charity = eng._inst('almsivis-charity');
  p.hand.push(charity);
  const steps = eng.targetingStepsForPlay(charity.uid);
  assert(steps.some(s => s.kind === 'refreshDraw'), 'Hand Refresh asks for a draw refresh');
  assert(!steps.some(s => s.kind === 'refreshHand'), 'Hand Refresh does not target the hand');
  assert(eng.playCard(charity.uid, 0, { refreshDraw: [gold.uid] }) === true, 'play ALMSIVI\'s Charity');
  assert(p.draw[p.draw.length - 1]?.uid === gold.uid, 'refreshed Gold is on top of the draw pile');
  assert(!has(p.hand, gold.uid), 'refreshed Gold did not return to hand');
}

// Bewilderment must be played before any other card.
{
  const eng = fresh();
  const p = eng.me();
  const gold = p.hand.find(c => c.id === 'gold');
  const curse = eng._inst('bewilderment');
  p.hand.push(curse);
  assert(eng.canPlay(gold.uid) === false, 'curse blocks a Gold');
  assert(eng.canPlay(curse.uid) === true, 'the curse itself can be played');
  assert(eng.playCard(curse.uid) === true, 'play Bewilderment');
  assert(eng.canPlay(gold.uid) === true, 'Gold is playable once the curse is gone');
}

// Action passives live in the played row. An agent_play passive does not pay for itself.
{
  const eng = fresh();
  const p = eng.me();
  const phil = eng._inst('philanthropy');
  p.hand.push(phil);
  assert(eng.playCard(phil.uid) === true, 'play Philanthropy');
  assert(has(p.played, phil.uid), 'Philanthropy stays in the played row');
  const gold = p.hand.find(c => c.id === 'gold');
  eng._picks = { discard: [gold.uid] };
  eng._strictPicks = true;
  eng._autoDiscard(p, 1);
  assert(p.power === 1, `discard passive granted 1 Power (got ${p.power})`);

  const envoy = eng._inst('envoy-of-the-draoife');
  const coinAtPlay = p.coin;
  p.hand.push(envoy);
  assert(eng.playCard(envoy.uid) === true, 'play Envoy');
  assert(p.coin === coinAtPlay, 'Envoy did not pay its own agent-play coin');
  const later = eng._inst('banneret');
  p.hand.push(later);
  assert(eng.playCard(later.uid) === true, 'play a later agent');
  assert(p.coin === coinAtPlay + 1, `later agent paid the Envoy (coin ${p.coin}, was ${coinAtPlay})`);
}

// Toss and Reprieve see cards after an empty draw pile shuffles cooldown in.
{
  const eng = fresh();
  const p = eng.me();
  p.draw = [];
  const a = eng._inst('gold');
  const b = eng._inst('gold');
  p.cooldown = [a, b];
  const peeked = eng._peekDraw(p, 2);
  assert(peeked.length === 2, 'peek fills from cooldown');
  assert(p.cooldown.length === 0 && p.draw.length === 2, 'peek restores the shuffled draw');

  const o = eng.opp();
  o.draw = [];
  const c = eng._inst('gold');
  const d = eng._inst('gold');
  o.cooldown = [c, d];
  eng._picks = { lookConfine: [c.uid] };
  eng._strictPicks = true;
  eng._applyPatronEffect('almalexia', { effect: 'look_confine', n: 2 });
  assert(has(o.cooldown, c.uid), 'Reprieve moved the chosen card to cooldown');
  assert(has(o.draw, d.uid), 'Reprieve put the other card back on the draw pile');
}

// Knock Out honors Taunt across sequential picks, and refuses a skip.
{
  const eng = fresh();
  const o = eng.opp();
  const taunt = eng._inst('shield-bearer');
  taunt.taunt = true;
  taunt.hp = 5;
  const soft = eng._inst('hel-shira-herald');
  soft.taunt = false;
  soft.hp = 3;
  o.agents = [soft, taunt];
  const first = eng.legalTargets({ kind: 'knockout', n: 1 });
  assert(first.length === 1 && first[0].uid === taunt.uid, 'only the Taunt is legal');
  const second = eng.legalTargets({ kind: 'knockout', n: 1, exclude: [taunt.uid] });
  assert(second.some(t => t.uid === soft.uid) && second.every(t => t.uid !== taunt.uid), 'after the Taunt, the other agent is legal');
  eng._picks = { knockout: [soft.uid] };
  eng._strictPicks = true;
  eng._knockout(1);
  assert(has(o.agents, soft.uid) && has(o.agents, taunt.uid), 'a non-Taunt pick does not resolve while Taunt remains');

  const p = eng.me();
  const ambush = eng._inst('ambush');
  p.hand.push(ambush);
  const steps = eng.targetingStepsForPlay(ambush.uid);
  assert(steps.filter(s => s.kind === 'knockout').length === 2, 'Knock Out 2 is two Taunt-aware steps');
}

// Heal affects this agent only, and does not open a tray.
{
  const eng = fresh();
  const p = eng.me();
  p.suitsPlayed.pelin = 1;
  const wounded = eng._inst('banneret');
  wounded.hp = 1;
  wounded.maxHp = 4;
  p.agents.push(wounded);
  const kc = eng._inst('knight-commander');
  p.hand.push(kc);
  const steps = eng.targetingStepsForPlay(kc.uid);
  assert(!steps.some(s => s.kind === 'heal'), 'Heal does not open a target tray');
  assert(eng.playCard(kc.uid) === true, 'play Knight Commander');
  const seated = p.agents.find(a => a.uid === kc.uid);
  assert(seated && seated.hp === 5, `Knight Commander stayed at full Health (got ${seated?.hp})`);
  assert(wounded.hp === 1, 'Heal did not touch a different agent');
  seated.hp = 2;
  eng._heal(seated, 2);
  assert(seated.hp === 4, 'Heal raises this agent');
  eng._heal(seated, 9);
  assert(seated.hp === 5, 'Heal stops at maximum Health');
}

// Sacrificing an agent releases confined cards to the opponent.
{
  const eng = fresh();
  const p = eng.me();
  const o = eng.opp();
  const agent = eng._inst('hel-shira-herald');
  agent.hp = 3;
  agent.maxHp = 3;
  const trapped = eng._inst('gold');
  agent.confined = [trapped];
  p.agents.push(agent);
  assert(eng.callPatron('hlaalu', { sacrifice: [agent.uid] }) === true, 'Hlaalu sacrifice');
  assert(has(p.exile, agent.uid), 'sacrificed agent is exiled');
  assert(has(o.cooldown, trapped.uid), 'confined card returned to the opponent cooldown');
  assert(p.prestige === (cardsById['hel-shira-herald'].cost - 1), `prestige is cost minus 1 (got ${p.prestige})`);
}

// Create tokens and Alessia's created agent enter cooldown.
{
  const eng = fresh();
  const p = eng.me();
  p.suitsPlayed.druid = 1;
  const caller = eng._inst('draoife-ritecaller');
  p.hand.push(caller);
  assert(eng.playCard(caller.uid) === true, 'play Draoife Ritecaller');
  assert(p.cooldown.some(c => c.id === 'wispheart-totem'), 'combo created a Wispheart Totem in cooldown');

  eng.state.matchPatrons.push('alessia');
  eng.state.favor.alessia = 1;
  p.coin = 4;
  p.patronCallsLeft = 1;
  assert(eng.callPatron('alessia') === true, 'call favored Alessia');
  assert(p.cooldown.some(c => c.id === 'chainbreaker-sergeant'), 'Alessia created a Chainbreaker Sergeant in cooldown');
}

// The contract cooldown guard still exiles.
{
  const eng = fresh();
  const card = eng._inst('blackmail');
  eng._toCooldown(eng.me(), card);
  assert(has(eng.me().exile, card.uid), 'cooldown guard still exiles a contract');
  assert(!has(eng.me().cooldown, card.uid), 'cooldown guard did not keep the contract');
}

console.log(failed ? `\n${failed} FAILED` : '\nEFFECTS OK');
process.exit(failed ? 1 : 0);
