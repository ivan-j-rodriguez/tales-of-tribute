import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  formatEffects, inspectLines, cardPlayLines, cardComboLines,
  applyOfficialCardText, applyOfficialPatronText, effectSentence,
} from '../js/texts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cards = JSON.parse(readFileSync(path.join(root, 'data/cards.json'), 'utf8'));
const patrons = JSON.parse(readFileSync(path.join(root, 'data/patrons.json'), 'utf8'));

const fails = [];
function assert(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else {
    console.error('FAIL', name, extra ?? '');
    fails.push(name);
  }
}

assert('gold sentence', formatEffects([{ op: 'coin', n: 1 }]).join(' ') === 'Gain 1 Coin.');
assert('coin stub', formatEffects([], '1 Coin').join(' ') === 'Gain 1 Coin.');
assert('draw stub', formatEffects([], 'Draw 1').join(' ') === 'Draw 1 card.');
assert('knock out', effectSentence({ op: 'knockout', n: 1 }) === 'Knock Out an enemy Agent.');
assert('acquire', /Acquire a card from the Tavern that costs up to 6 Coin/.test(effectSentence({ op: 'acquire', n: 6 })));
assert('refresh', /Refresh — Return up to 1 card/.test(effectSentence({ op: 'hand_refresh', n: 1 })));

const list = cards.cards || cards;
const byId = Object.fromEntries(list.map((c) => [c.id, c]));
applyOfficialCardText(list);

const toll = byId['toll-of-flesh'];
const play = cardPlayLines(toll);
const combo = cardComboLines(toll, 2);
assert('toll play', play.join(' ') === 'Gain 2 Coin.', play);
assert('toll combo', combo.join(' ') === 'Draw 1 card.', combo);
assert('no token coin stub', !play.some((l) => /^2 Coin\.?$/i.test(l)), play);
assert('gold catalog', /Gain 1 Coin/.test(byId.gold.playText), byId.gold.playText);

const pats = patrons.patrons || patrons;
applyOfficialPatronText(pats);
const pelin = pats.find((p) => p.id === 'pelin');
const crows = pats.find((p) => p.id === 'crows');
assert('pelin refresh sentence', /Refresh — Return up to 1 Agent/.test(pelin?.abilities?.favored?.desc || ''), pelin?.abilities?.favored?.desc);
assert('crows favored unused', /Cannot be used/.test(crows?.abilities?.favored?.desc || ''), crows?.abilities?.favored?.desc);

if (fails.length) {
  console.error(`\n${fails.length} failed:\n${fails.join('\n')}`);
  process.exit(1);
}
console.log('\nOfficial text unit tests passed.');
