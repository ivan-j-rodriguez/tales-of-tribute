import { readFileSync } from 'fs';
import { GameEngine } from '/workspace/tots/web/js/engine.js';
import { TributeAI } from '/workspace/tots/web/js/ai.js';

const cards = JSON.parse(readFileSync('/workspace/tots/web/data/cards.json','utf8')).cards;
const patrons = JSON.parse(readFileSync('/workspace/tots/web/data/patrons.json','utf8')).patrons;
const cardsById = Object.fromEntries(cards.map(c => [c.id, c]));
const patronsById = Object.fromEntries(patrons.map(p => [p.id, p]));

console.log('cards', cards.length, 'patrons', patrons.length);
console.log('sample', cards[0].id, cards[0].play);

const eng = new GameEngine(cardsById, patronsById);
eng.newMatch({ playerPatrons: ['pelin','hlaalu'], aiPatrons: ['crows','rajhin'], playerFirst: true });
const s = eng.state;
console.log('tavern', s.tavern.length, s.tavern.map(c => c.id));
console.log('p0 hand', s.players[0].hand.length, s.players[0].hand.map(c => c.id));
console.log('p1 hand', s.players[1].hand.length);
console.log('p0 draw', s.players[0].draw.length);

// Force both as AI-style autoplay
s.players[0].isAI = true;
s.players[1].isAI = true;
const ai = new TributeAI(eng);

let turns = 0;
while (!s.winner && turns < 80) {
  const before = s.active;
  let guard = 0;
  while (!s.winner && s.active === before && guard++ < 40) {
    const a = ai.chooseAction();
    if (!a || a.type === 'end') { eng.endTurn(); break; }
    ai.execute(a);
  }
  turns++;
}
console.log('turns', turns, 'winner', s.winner, 'p0', s.players[0].prestige, 'p1', s.players[1].prestige);
console.log('last logs', eng.log.slice(-8).map(l => l.msg));
console.log('OK');
