/** Expand UESP rawEffect / patron favor raw into official in-game display sentences. */
import { nameSlug, aliasPatron } from './normalize.js';

export function donateSentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  const what = x <= 1 ? '1 card' : `${x} cards`;
  return `Donate — Discard up to ${what} from your hand then draw that many cards.`;
}

export function tossSentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  return `Toss — Look at the next ${x} cards in your play deck. Choose up to ${x} of those cards to move to your cooldown pile.`;
}

export function refreshSentence(n = 1, agent = false) {
  const x = n == null || n === '' ? 1 : Number(n);
  const what = agent
    ? (x <= 1 ? '1 Agent card' : `${x} Agent cards`)
    : (x <= 1 ? '1 card of any type' : `${x} cards of any type`);
  return `Refresh — Return up to ${what} from your cooldown pile to the top of your draw pile.`;
}

export function knockoutSentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  if (x <= 1) return "Knock Out — Place 1 of your opponent's active agents into their cooldown pile.";
  return `Knock Out — Place ${x} of your opponent's active agents into their cooldown pile.`;
}

export function knockoutAllSentence() {
  return 'Knock Out All — Place all active Agents into their respective cooldown piles.';
}

export function destroySentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  const what = x <= 1 ? '1 of your cards' : `${x} of your cards`;
  return `Destroy up to ${what} that are in play or in your hand from the game.`;
}

export function replaceSentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  return x <= 1
    ? 'Replace up to 1 card from the Tavern.'
    : `Replace up to ${x} cards from the Tavern.`;
}

export function acquireSentence(n) {
  const x = n == null || n === '' ? 1 : Number(n);
  return `Acquire a card from the Tavern that costs up to ${x} Coin.`;
}

export function confineSentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  const what = x <= 1 ? '1 card' : `${x} cards`;
  return `Confine — Place ${what} from your opponent's cooldown pile under this card until this card is removed from play.`;
}

export function discardSentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  return x <= 1 ? 'Discard a card.' : `Discard ${x} cards.`;
}

export function healSentence(n = 1) {
  const x = n == null || n === '' ? 1 : Number(n);
  return `Heal this Agent for ${x} Health.`;
}

export function patronCallSentence() {
  return 'Call on 1 additional Patron this turn.';
}

export function tauntSentence() {
  return "Taunt — This agent must be attacked first. Prevents opponent's end of turn power to prestige conversion.";
}

export function reprieveSentence(n) {
  const x = n == null || n === '' ? 1 : Number(n);
  return `Reprieve — Look at the top ${x} cards of your opponent's draw pile. Select 1 to place in their cooldown pile.`;
}

export function createSentence(name, opponent = false) {
  const card = String(name || 'a card').replace(/\.$/, '').trim();
  const dest = opponent ? "your opponent's cooldown pile" : 'your cooldown pile';
  if (/^a card$/i.test(card)) return `Create 1 card and place it in ${dest}.`;
  return `Create 1 ${card} card and place it in ${dest}.`;
}

export function losePrestigeSentence(n = 1) {
  const x = Math.abs(n == null || n === '' ? 1 : Number(n));
  return x <= 1 ? 'Opponent loses 1 Prestige.' : `Opponent loses ${x} Prestige.`;
}

function opponentCreate(name) {
  return /bewilderment/i.test(String(name || ''));
}

/** Expand a single bracket token or plain fragment into a sentence (no trailing join). */
export function expandToken(tok) {
  let t = String(tok || '').trim();
  if (!t) return '';
  t = t.replace(/^\d+px\s+/i, '').trim();
  if (!t) return '';

  let m;
  // Catalog / leftover stubs that look like short labels, not full in-game lines
  if (/^This card has no play effect/i.test(t)) return t.endsWith('.') ? t : t + '.';
  if (/^This card has no effect\.?$/i.test(t)) return 'This card has no play effect.';
  if (/^Curse cards must be played/i.test(t)) return t.endsWith('.') ? t : t + '.';
  if ((m = t.match(/^Donate\s+(\d+)\.?$/i))) return donateSentence(Number(m[1]));
  if (/^Donate\.?$/i.test(t)) return donateSentence(1);
  if ((m = t.match(/^Toss\s+(\d+)\.?$/i))) return tossSentence(Number(m[1]));
  if ((m = t.match(/^(?:Hand |Draw )?Refresh(?:\s+(\d+))?(?:\s*\|\s*agent)?\.?$/i))) {
    return refreshSentence(m[1] ? Number(m[1]) : 1, /agent/i.test(t));
  }
  if (/^Knock Out All\.?$/i.test(t)) return knockoutAllSentence();
  if (/^Knock Out an enemy Agent\.?$/i.test(t)) return knockoutSentence(1);
  if ((m = t.match(/^Knock Out(?:\s+(\d+))?\.?$/i))) return knockoutSentence(m[1] ? Number(m[1]) : 1);
  if ((m = t.match(/^Acquire(?:\s+(\d+))?\.?$/i)) && !/Tavern/i.test(t)) {
    return acquireSentence(m[1] ? Number(m[1]) : 1);
  }
  if ((m = t.match(/^Replace(?:\s+(\d+))?\.?$/i)) && !/Tavern/i.test(t)) {
    return replaceSentence(m[1] ? Number(m[1]) : 1);
  }
  if ((m = t.match(/^Destroy(?:\s+(\d+))?\.?$/i)) && !/in play|cooldown|hand/i.test(t)) {
    return destroySentence(m[1] ? Number(m[1]) : 1);
  }
  if ((m = t.match(/^Confine(?:\s+(\d+))?\.?$/i)) && !/cooldown pile under/i.test(t)) {
    return confineSentence(m[1] ? Number(m[1]) : 1);
  }
  if (/^Taunt\.?$/i.test(t) || /^This Agent has Taunt\.?$/i.test(t)) return tauntSentence();
  if ((m = t.match(/^Reprieve\s+(\d+)\.?$/i))) return reprieveSentence(Number(m[1]));
  if (/^Patron\.?$/i.test(t) || /^Gain an extra Patron call\.?$/i.test(t)) return patronCallSentence();

  // Already a full in-game sentence
  if (/^(Gain |Draw |Donate |Toss |Acquire |Refresh |Knock Out |Taunt|Replace |Destroy |Confine |Opponent |Setback |When |Choose |Create |Heal |Discard |This |Place |Pay |Call |Look |While |Cannot |If |Curse |Reprieve |Passive |Sacrifice )/i.test(t) && !t.startsWith('[')) {
    return t.endsWith('.') ? t : t + '.';
  }

  const whileCombo = t.match(/^\[While ([^\]]+)\]\s*(\[[^\]]+\])$/i);
  if (whileCombo) {
    const when = whileToWhen(whileCombo[1]);
    const effect = expandToken(whileCombo[2]);
    return `${when}: ${effect.replace(/\.$/, '')}.`;
  }
  const whileOnly = t.match(/^\[While ([^\]]+)\]$/i);
  if (whileOnly) return whileToWhen(whileOnly[1]);

  const br = t.match(/^\[([^\]]+)\]$/);
  if (!br) {
    return t.endsWith('.') ? t : t + '.';
  }
  const inner = br[1].trim();

  if ((m = inner.match(/^Coin(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Gain 1 Coin.' : `Gain ${n} Coin.`;
  }
  if ((m = inner.match(/^Power(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Gain 1 Power.' : `Gain ${n} Power.`;
  }
  if ((m = inner.match(/^Prestige(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Gain 1 Prestige.' : `Gain ${n} Prestige.`;
  }
  if ((m = inner.match(/^Draw(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Draw 1 card.' : `Draw ${n} cards.`;
  }
  if ((m = inner.match(/^Donate(?:\s+(\d+))?$/i))) return donateSentence(m[1] ? Number(m[1]) : 1);
  if ((m = inner.match(/^Toss(?:\s+(\d+))?$/i))) return tossSentence(m[1] ? Number(m[1]) : 1);
  if ((m = inner.match(/^Acquire(?:\s+(\d+))?$/i))) return acquireSentence(m[1] ? Number(m[1]) : 1);
  if ((m = inner.match(/^Refresh(?:\s+(\d+))?(?:\|(agent))?$/i))) {
    return refreshSentence(m[1] ? Number(m[1]) : 1, !!m[2]);
  }
  if (/^Knock Out All$/i.test(inner)) return knockoutAllSentence();
  if ((m = inner.match(/^Knock Out(?:\s+(\d+))?$/i))) return knockoutSentence(m[1] ? Number(m[1]) : 1);
  if (/^Taunt$/i.test(inner)) return tauntSentence();
  if ((m = inner.match(/^Replace(?:\s+(\d+))?$/i))) return replaceSentence(m[1] ? Number(m[1]) : 1);
  if ((m = inner.match(/^Destroy(?:\s+(\d+))?$/i))) return destroySentence(m[1] ? Number(m[1]) : 1);
  if ((m = inner.match(/^Confine(?:\s+(\d+))?$/i))) return confineSentence(m[1] ? Number(m[1]) : 1);
  if ((m = inner.match(/^Lose Prestige(?:\s+(\d+))?$/i))) return losePrestigeSentence(m[1] ? Number(m[1]) : 1);
  if (/^Setback Power$/i.test(inner)) return 'Setback — Opponent gains 1 Power.';
  if (/^Setback Draw$/i.test(inner)) return 'Setback — Opponent draws 1 card.';
  if ((m = inner.match(/^Setback Coin(?:\|(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return `Setback — Opponent gains ${n} Coin.`;
  }
  if (/^Patron$/i.test(inner)) return patronCallSentence();
  if ((m = inner.match(/^Create\s+(.+)$/i))) {
    const name = m[1].trim();
    return createSentence(name, opponentCreate(name));
  }
  if ((m = inner.match(/^Discard(?:\s+(\d+))?$/i))) return discardSentence(m[1] ? Number(m[1]) : 1);
  if ((m = inner.match(/^Heal(?:\s+(\d+))?$/i))) return healSentence(m[1] ? Number(m[1]) : 1);
  if (/^Choose$/i.test(inner)) return 'Choose 1 of the following:';

  return inner.endsWith('.') ? inner : inner + '.';
}

function whileToWhen(body) {
  const b = body.trim();
  if (/^you discard any card$/i.test(b)) return 'When you discard a card';
  if (/^an agent is placed in your cooldown$/i.test(b)) return 'When an Agent is placed in your cooldown pile';
  if (/^any card is placed in your cooldown$/i.test(b)) return 'When any card is placed in your cooldown pile';
  if (/^any card, including this one, is placed in your cooldown$/i.test(b)) {
    return 'When any card is placed in your cooldown pile';
  }
  if (/^an agent, excluding this one, is placed in your cooldown$/i.test(b)) {
    return 'When an Agent other than this one is placed in your cooldown pile';
  }
  if (/^an agent other than this one is Knocked Out$/i.test(b)) {
    return 'When an Agent other than this one is Knocked Out';
  }
  if (/^an agent, including this one, is activated or played$/i.test(b)) {
    return 'When an Agent is activated or played';
  }
  return 'When ' + b.replace(/^an agent/i, 'an Agent').replace(/cooldown$/i, 'cooldown pile');
}

/**
 * Split rawEffect on | and Combo N markers into playText / combo2Text / …
 */
export function expandRawEffect(raw) {
  const out = { playText: null, combo2Text: null, combo3Text: null, combo4Text: null };
  if (!raw || !String(raw).trim()) return out;

  let text = String(raw).replace(/\r\n/g, '\n').trim();
  text = normalizeChooseBlocks(text);
  text = text.replace(/(?:\|\s*)?(?:\n|\r|\s)+(?=Combo\s*[234]\b)/gi, ' | ');

  const protectedBars = [];
  text = text.replace(/\[[^\]]*\]/g, (m) => {
    const safe = m.replace(/\|/g, '\uE000');
    protectedBars.push(safe);
    return `@@BR${protectedBars.length - 1}@@`;
  });
  let parts = text.split('|').map(s => s.trim()).filter(Boolean);
  parts = parts.map((s) => s.replace(/@@BR(\d+)@@/g, (_, i) => protectedBars[Number(i)].replace(/\uE000/g, '|')));

  let bucket = 'play';
  const buckets = { play: [], combo2: [], combo3: [], combo4: [] };

  for (let i = 0; i < parts.length; i++) {
    let p = parts[i].replace(/^\d+px\s+/i, '').trim();
    if (!p) continue;

    const comboHead = p.match(/^Combo\s*([234])\s*(.*)$/i);
    if (comboHead) {
      bucket = 'combo' + comboHead[1];
      const rest = comboHead[2].trim();
      if (rest) buckets[bucket].push(expandFragment(rest));
      continue;
    }

    if (/^\[Choose\]$/i.test(p) || /^Choose(?: 1 of the following| one)\.?$/i.test(p)) {
      const opts = [];
      while (i + 1 < parts.length && !/^Combo\s*[234]/i.test(parts[i + 1].trim())) {
        i += 1;
        const opt = expandFragment(parts[i].replace(/^\d+px\s+/i, '').trim());
        if (opt) opts.push(stripDot(opt));
      }
      buckets[bucket].push(formatChoose(opts));
      continue;
    }

    if (/^\[While [^\]]+\]$/i.test(p) && i + 1 < parts.length && /^\[[^\]]+\]$/.test(parts[i + 1].trim())) {
      buckets[bucket].push(expandToken(p + ' ' + parts[i + 1].trim()));
      i += 1;
      continue;
    }

    buckets[bucket].push(expandFragment(p));
  }

  const join = (arr) => {
    const cleaned = arr.map(s => String(s || '').trim()).filter(Boolean);
    if (!cleaned.length) return null;
    const uniq = [];
    for (const s of cleaned) {
      const line = s.endsWith('.') || s.endsWith(':') ? s : s + '.';
      if (uniq[uniq.length - 1] !== line) uniq.push(line);
    }
    return uniq.join(' ');
  };

  out.playText = join(buckets.play);
  out.combo2Text = join(buckets.combo2);
  out.combo3Text = join(buckets.combo3);
  out.combo4Text = join(buckets.combo4);
  return out;
}

function formatChoose(opts) {
  const clean = (opts || []).map(stripDot).filter(Boolean);
  if (!clean.length) return 'Choose 1 of the following:';
  if (clean.length === 1) return `Choose 1 of the following: ${clean[0]}.`;
  return `Choose 1 of the following: ${clean.join('. Or ')}.`;
}

function expandFragment(frag) {
  const f = String(frag || '').trim();
  if (!f) return '';
  if (/^\[Choose\]/i.test(f)) return expandChooseInline(f);
  const tokens = (f.match(/\[[^\]]+\]|[^\[]+/g) || []).map(x => x.trim()).filter(Boolean);
  if (tokens.length > 1) {
    if (/^\[While /i.test(tokens[0]) && /^\[[^\]]+\]$/.test(tokens[1])) {
      const rest = tokens.slice(2).map(expandToken).filter(Boolean);
      return [expandToken(tokens[0] + ' ' + tokens[1]), ...rest].filter(Boolean).join(' ');
    }
    return tokens.map(x => expandToken(x)).filter(Boolean).join(' ');
  }
  return expandToken(f);
}

function normalizeChooseBlocks(text) {
  return text.replace(
    /\[Choose\]\s*\n\s*:\s*([^\n]+)\s*\n\s*:\s*([^\n]+)/gi,
    (_, a, b) => formatChoose([expandFragment(a.trim()), expandFragment(b.trim())])
  );
}

function expandChooseInline(f) {
  const bits = [...f.matchAll(/\[[^\]]+\]/g)].map(m => m[0]);
  if (bits.length >= 3 && /^\[Choose\]$/i.test(bits[0])) {
    return formatChoose(bits.slice(1).map(expandToken));
  }
  if (bits.length === 1) return 'Choose 1 of the following:';
  return formatChoose(bits.slice(1).map(expandToken));
}

function stripDot(s) {
  return String(s || '').replace(/\.$/, '').trim();
}

function looseSlug(name) {
  return nameSlug(name).replace(/sleight/g, 'slight');
}

function asCardList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.cards)) return data.cards;
  return null;
}

function asPatronList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.patrons)) return data.patrons;
  return null;
}

export function overlayOfficialCardText(cards, uespCards) {
  const list = asCardList(uespCards);
  if (!Array.isArray(cards) || !list) return cards;
  const byId = new Map();
  const bySlug = new Map();
  const byLoose = new Map();
  for (const u of list) {
    if (u.id) byId.set(u.id, u);
    const slug = nameSlug(u.name);
    if (slug) bySlug.set(slug, u);
    const loose = looseSlug(u.name);
    if (loose) byLoose.set(loose, u);
    const tail = String(u.id || '').split('__').pop();
    if (tail) bySlug.set(tail.replace(/_/g, '-'), u);
  }

  for (const card of cards) {
    let u = byId.get(card.id)
      || bySlug.get(card.id)
      || bySlug.get(nameSlug(card.name))
      || byLoose.get(looseSlug(card.name))
      || bySlug.get(card.slug);
    if (!u || !u.rawEffect) continue;
    const expanded = expandRawEffect(u.rawEffect);
    if (expanded.playText) card.playText = expanded.playText;
    if (expanded.combo2Text) card.combo2Text = expanded.combo2Text;
    else if (u.rawEffect && !/Combo\s*2/i.test(u.rawEffect)) card.combo2Text = null;
    if (expanded.combo3Text) card.combo3Text = expanded.combo3Text;
    else if (u.rawEffect && !/Combo\s*3/i.test(u.rawEffect)) card.combo3Text = null;
    if (expanded.combo4Text) card.combo4Text = expanded.combo4Text;
    else if (u.rawEffect && !/Combo\s*4/i.test(u.rawEffect)) card.combo4Text = null;
  }
  return cards;
}

/** Official-style patron ability description from UESP favorLevels.raw */
export function expandPatronDesc(raw, { patronId } = {}) {
  if (!raw || /^none$/i.test(String(raw).trim())) return null;
  let s = String(raw).trim();

  s = s.replace(/;?\s*this patron favors you\.?/gi, '. This Patron now FAVORS you');
  s = s.replace(/;?\s*patron favors you\.?/gi, '. This Patron now FAVORS you');
  s = s.replace(/;?\s*this patron becomes unaligned\.?/gi, '. This Patron is now NEUTRAL');
  s = s.replace(/;?\s*patron becomes unaligned\.?/gi, '. This Patron is now NEUTRAL');
  s = s.replace(/;?\s*this Patron becomes Neutral\.?/gi, '. This Patron is now NEUTRAL');
  s = s.replace(/\bthis patron favors you\b/gi, 'This Patron now FAVORS you');
  s = s.replace(/\bthis patron becomes unaligned\b/gi, 'This Patron is now NEUTRAL');

  s = s.replace(/\bReprieve\s+(\d+)\b/gi, (_, n) => stripDot(reprieveSentence(Number(n))));

  s = s.replace(/\bwith an agent in cooldown\b/gi, 'with an Agent in your cooldown pile');
  s = s.replace(/\bwith an Agent in cooldown\b/gi, 'with an Agent in your cooldown pile');
  s = s.replace(
    /refresh up to 1 agent/gi,
    stripDot(refreshSentence(1, true))
  );

  s = s.replace(
    /create (\d+ )?Writ of Coin(?: card)?(?: and place it in your cooldown pile)?/gi,
    'Create 1 Writ of Coin card and place it in your cooldown pile'
  );
  s = s.replace(
    /create Bewilderment in(?: the)? opponent(?:'s)? cooldown(?: pile)?/gi,
    stripDot(createSentence('Bewilderment', true))
  );
  s = s.replace(
    /create Summerset Sacking\.?/gi,
    stripDot(createSentence('Summerset Sacking'))
  );
  s = s.replace(/\bknock it out\b/gi, stripDot(knockoutSentence(1)).replace(/^Knock Out — /i, 'Knock Out — '));
  s = s.replace(/\bunusable; no benefit\.?/gi, 'Cannot be used.');
  s = s.replace(/\bgain (\d+) Coin\b/gi, 'Gain $1 Coin');
  s = s.replace(/\bgain (\d+) Power\b/gi, 'Gain $1 Power');
  s = s.replace(/\bgain (\d+) Prestige\b/gi, 'Gain $1 Prestige');
  s = s.replace(/\bdraw 1\b/gi, 'Draw 1 card');
  s = s.replace(/replace up to (\d+) Tavern cards/gi, (_, n) => stripDot(replaceSentence(Number(n))));

  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+\./g, '.');
  s = s.replace(/\.\s*\./g, '.');
  if (s && !s.endsWith('.') && !s.endsWith('?')) s += '.';
  s = s.replace(/(^|[.]\s*)([a-z])/g, (_, a, b) => a + b.toUpperCase());
  return s;
}

export function overlayOfficialPatronText(patrons, uespPatrons) {
  const list = asPatronList(uespPatrons);
  if (!Array.isArray(patrons) || !list) return patrons;
  const byId = new Map();
  for (const u of list) {
    const id = aliasPatron(u.id || u.deckId);
    byId.set(id, u);
    if (u.id) byId.set(u.id, u);
  }

  const levelMap = { unaligned: 'neutral', player1: 'favored', player2: 'unfavored' };

  for (const pat of patrons) {
    const u = byId.get(pat.id);
    if (!u) continue;
    const levels = u.favorLevels || {};
    if (!pat.abilities) pat.abilities = {};

    const alwaysN = !!(pat.alwaysNeutral || pat.abilities.alwaysNeutral || pat.id === 'mora' || pat.id === 'treasury');

    for (const [uespKey, abKey] of Object.entries(levelMap)) {
      const lvl = levels[uespKey];
      if (!lvl || typeof lvl !== 'object') continue;
      const raw = lvl.raw;
      if (raw == null || /^none$/i.test(String(raw).trim())) {
        if (alwaysN && abKey !== 'neutral') continue;
        continue;
      }
      if (alwaysN && abKey !== 'neutral') continue;

      const desc = expandPatronDesc(raw, { patronId: pat.id });
      if (!desc) continue;
      if (!pat.abilities[abKey]) pat.abilities[abKey] = { desc };
      else pat.abilities[abKey].desc = desc;
    }
  }
  return patrons;
}
