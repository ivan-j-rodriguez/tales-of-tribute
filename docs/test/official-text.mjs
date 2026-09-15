import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  formatEffects, inspectLines, cardPlayLines, cardComboLines,
  applyOfficialCardText, applyOfficialPatronText, effectSentence,
} from '../js/texts.js';
import {
  expandRawEffect, expandToken, overlayOfficialCardText, overlayOfficialPatronText,
  donateSentence, tossSentence, knockoutSentence, acquireSentence, destroySentence,
} from '../js/officialText.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cards = JSON.parse(readFileSync(path.join(root, 'data/cards.json'), 'utf8'));
const patrons = JSON.parse(readFileSync(path.join(root, 'data/patrons.json'), 'utf8'));
const uespCards = JSON.parse(readFileSync(path.join(root, 'data/cards.uesp.json'), 'utf8'));
const uespPatrons = JSON.parse(readFileSync(path.join(root, 'data/patrons.uesp.json'), 'utf8'));

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
assert('knock out', effectSentence({ op: 'knockout', n: 1 }) === knockoutSentence(1));
assert('acquire', effectSentence({ op: 'acquire', n: 6 }) === acquireSentence(6));
assert('refresh', /Refresh — Return up to 1 card of any type/.test(effectSentence({ op: 'hand_refresh', n: 1 })));
assert('donate full', effectSentence({ op: 'donate', n: 1 }) === donateSentence(1));
assert('toss full', effectSentence({ op: 'toss', n: 4 }) === tossSentence(4));
assert('destroy full', effectSentence({ op: 'destroy', n: 1 }) === destroySentence(1));
assert('no donate stub', !/^Donate 1\.?$/.test(donateSentence(1)));
assert('token donate', /Discard up to 1 card from your hand then draw/.test(expandToken('[Donate]')));
assert('token toss', /Look at the next 4 cards in your play deck/.test(expandToken('[Toss 4]')));
assert('token knockout', /Place 1 of your opponent's active agents/.test(expandToken('[Knock Out]')));
assert('token acquire', expandToken('[Acquire 6]') === 'Acquire 1 card from the Tavern with a cost up to 6.');
assert('choose following', /Choose 1 of the following/.test(expandRawEffect('[Choose]\n: [Coin]\n: [Power]').playText || ''));

const plate = expandRawEffect('[Coin] | Combo 3 | [Donate]');
assert('plate play', plate.playText === 'Gain 1 Coin.', plate.playText);
assert('plate combo3 donate', /Discard up to 1 card from your hand then draw/.test(plate.combo3Text || ''), plate.combo3Text);

const list = cards.cards || cards;
const byId = Object.fromEntries(list.map((c) => [c.id, c]));
applyOfficialCardText(list);
overlayOfficialCardText(list, uespCards);

const toll = byId['toll-of-flesh'];
const play = cardPlayLines(toll);
const combo = cardComboLines(toll, 2);
assert('toll play', play.join(' ') === 'Gain 2 Coin.', play);
assert('toll combo', combo.join(' ') === 'Draw 1 card.', combo);
assert('no token coin stub', !play.some((l) => /^2 Coin\.?$/i.test(l)), play);
assert('gold catalog', /Gain 1 Coin/.test(byId.gold.playText), byId.gold.playText);

const plateCard = byId['collection-plate'];
const platePlay = cardPlayLines(plateCard).join(' ');
const plateC3 = cardComboLines(plateCard, 3).join(' ');
assert('collection plate play', /Gain 1 Coin/.test(platePlay), platePlay);
assert('collection plate donate combo', /Donate — Discard up to 1 card/.test(plateC3), plateC3);
assert('no donate 1 stub', !/Donate 1\.?/.test(plateC3), plateC3);

const ambush = byId.ambush || byId['ambush'];
if (ambush) {
  const ambushPlay = cardPlayLines(ambush).join(' ');
  assert('ambush knockout sentence', /Knock Out — Place 2 of your opponent's active agents/.test(ambushPlay), ambushPlay);
}

const harvest = byId['harvest-season'];
assert('harvest draw', /Draw 1 card/.test(cardPlayLines(harvest).join(' ')), cardPlayLines(harvest));

const pats = patrons.patrons || patrons;
applyOfficialPatronText(pats);
overlayOfficialPatronText(pats, uespPatrons);
const pelin = pats.find((p) => p.id === 'pelin');
const crows = pats.find((p) => p.id === 'crows');
const alma = pats.find((p) => p.id === 'almalexia');
assert('pelin refresh sentence', /Refresh — Return up to 1 Agent/.test(pelin?.abilities?.favored?.desc || ''), pelin?.abilities?.favored?.desc);
assert('crows favored unused', /Cannot be used/.test(crows?.abilities?.favored?.desc || ''), crows?.abilities?.favored?.desc);
assert('almalexia reprieve', /Reprieve — Look at the top 5 cards/.test(alma?.abilities?.favored?.desc || ''), alma?.abilities?.favored?.desc);

const wrapped = overlayOfficialCardText(
  [{ id: 'gold', name: 'Gold', playText: '1 Coin' }],
  { cards: [{ id: 'x', name: 'Gold', rawEffect: '[Coin]' }] }
);
assert('overlay unwraps {cards}', wrapped[0].playText === 'Gain 1 Coin.', wrapped[0].playText);

if (fails.length) {
  console.error(`\n${fails.length} failed:\n${fails.join('\n')}`);
  process.exit(1);
}
console.log('\nOfficial text unit tests passed.');
