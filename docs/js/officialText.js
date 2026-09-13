/** Expand UESP rawEffect / patron favor raw into official in-game display sentences. */
import { nameSlug, aliasPatron } from './normalize.js';

function numWord(n, singular, plural) {
  const x = n == null || n === '' ? 1 : Number(n);
  if (!Number.isFinite(x) || x <= 1) return singular.replace('1', '1');
  return (plural || singular).replace(/\bN\b/g, String(x)).replace(/\b1\b/g, String(x));
}

/** Expand a single bracket token or plain fragment into a sentence (no trailing join). */
export function expandToken(tok) {
  let t = String(tok || '').trim();
  if (!t) return '';
  // Strip junk like "16px " leftovers
  t = t.replace(/^\d+px\s+/i, '').trim();
  if (!t) return '';

  // Already a prose sentence
  if (/^This card has no play effect/i.test(t)) return t.endsWith('.') ? t : t + '.';
  if (/^Curse cards must be played/i.test(t)) return t.endsWith('.') ? t : t + '.';
  if (/^Gain |^Draw |^Donate |^Toss |^Acquire |^Refresh |^Knock Out |^Taunt|^Replace |^Destroy |^Confine |^Opponent |^Setback |^When |^Choose |^Create |^Heal |^Discard /i.test(t) && !t.startsWith('[')) {
    return t.endsWith('.') ? t : t + '.';
  }

  // [While …] [Effect] — may arrive as one token or two; handle combined form
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
    // Plain text fragment
    return t.endsWith('.') ? t : t + '.';
  }
  const inner = br[1].trim();

  let m;
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
  if ((m = inner.match(/^Donate(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Donate 1.' : `Donate ${n}.`;
  }
  if ((m = inner.match(/^Toss(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return `Toss ${n}.`;
  }
  if ((m = inner.match(/^Acquire(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return `Acquire a card from the Tavern that costs up to ${n} Coin.`;
  }
  if ((m = inner.match(/^Refresh(?:\s+(\d+))?(?:\|(agent))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    const agent = !!m[2];
    const what = agent
      ? (n === 1 ? '1 Agent card' : `${n} Agent cards`)
      : (n === 1 ? '1 card' : `${n} cards`);
    return `Refresh — Return up to ${what} from your cooldown pile to the top of your draw pile.`;
  }
  if (/^Knock Out All$/i.test(inner)) return 'Knock Out all enemy Agents.';
  if ((m = inner.match(/^Knock Out(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Knock Out an enemy Agent.' : `Knock Out up to ${n} enemy Agents.`;
  }
  if (/^Taunt$/i.test(inner)) return 'Taunt.';
  if ((m = inner.match(/^Replace(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Replace a card in the Tavern.' : `Replace up to ${n} cards in the Tavern.`;
  }
  if ((m = inner.match(/^Destroy(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Destroy a card in your cooldown pile.' : `Destroy up to ${n} cards in your cooldown pile.`;
  }
  if ((m = inner.match(/^Confine(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Confine an enemy Agent.' : `Confine up to ${n} enemy Agents.`;
  }
  if ((m = inner.match(/^Lose Prestige(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Opponent loses 1 Prestige.' : `Opponent loses ${n} Prestige.`;
  }
  if (/^Setback Power$/i.test(inner)) return 'Setback — Opponent gains Power.';
  if (/^Setback Draw$/i.test(inner)) return 'Setback — Opponent draws 1 card.';
  if ((m = inner.match(/^Setback Coin(?:\|(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : null;
    return n ? `Setback — Opponent gains ${n} Coin.` : 'Setback — Opponent gains Coin.';
  }
  if (/^Patron$/i.test(inner)) return 'Gain an extra Patron call.';
  if ((m = inner.match(/^Create\s+(.+)$/i))) return `Create ${m[1].trim()}.`;
  if ((m = inner.match(/^Discard(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return n === 1 ? 'Discard a card.' : `Discard ${n} cards.`;
  }
  if ((m = inner.match(/^Heal(?:\s+(\d+))?$/i))) {
    const n = m[1] ? Number(m[1]) : 1;
    return `Heal ${n}.`;
  }
  if (/^Choose$/i.test(inner)) return 'Choose';

  // Unknown bracket — strip brackets, keep readable
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
  // Generic: "While X" → "When X"
  return 'When ' + b.replace(/^an agent/i, 'an Agent').replace(/cooldown$/i, 'cooldown pile');
}

/**
 * Split rawEffect on | and Combo N markers into playText / combo2Text / …
 */
export function expandRawEffect(raw) {
  const out = { playText: null, combo2Text: null, combo3Text: null, combo4Text: null };
  if (!raw || !String(raw).trim()) return out;

  // Normalize newlines around Choose ": A" / ": B" forms
  let text = String(raw).replace(/\r\n/g, '\n').trim();

  // Handle [Choose] with following ": …" lines (possibly across newlines)
  // Convert to a single play sentence before | Combo splitting when it's the lead effect.
  text = normalizeChooseBlocks(text);
  // Ensure Combo N starts a fresh | section even when separated only by newlines
  text = text.replace(/(?:\|\s*)?(?:\n|\r|\s)+(?=Combo\s*[234]\b)/gi, ' | ');

  // Protect | inside brackets (e.g. [Refresh 4|agent], [Setback Coin|3]) before split
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

    // [Choose] | optA | optB  (until Combo or end)
    if (/^\[Choose\]$/i.test(p) || /^Choose one\.?$/i.test(p)) {
      const opts = [];
      while (i + 1 < parts.length && !/^Combo\s*[234]/i.test(parts[i + 1].trim())) {
        i += 1;
        const opt = expandFragment(parts[i].replace(/^\d+px\s+/i, '').trim());
        if (opt) opts.push(stripDot(opt));
      }
      if (opts.length >= 2) buckets[bucket].push(`Choose one: ${opts[0]} or ${opts[1]}.`);
      else if (opts.length === 1) buckets[bucket].push(`Choose one: ${opts[0]}.`);
      else buckets[bucket].push('Choose one.');
      continue;
    }

    // While + following effect may have been split: [While …] | [Power]
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
    // Dedupe consecutive identical
    const uniq = [];
    for (const s of cleaned) {
      const line = s.endsWith('.') ? s : s + '.';
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

function expandFragment(frag) {
  const f = String(frag || '').trim();
  if (!f) return '';
  // Multiple bracket tokens in one fragment: [Coin] [Taunt] or [Choose] [Coin 2] [Power]
  if (/^\[Choose\]/i.test(f)) {
    return expandChooseInline(f);
  }
  // Sequence of [Token] pieces
  const tokens = (f.match(/\[[^\]]+\]|[^\[]+/g) || []).map(x => x.trim()).filter(Boolean);
  if (tokens.length > 1) {
    // While opener + effect
    if (/^\[While /i.test(tokens[0]) && /^\[[^\]]+\]$/.test(tokens[1])) {
      const rest = tokens.slice(2).map(expandToken).filter(Boolean);
      return [expandToken(tokens[0] + ' ' + tokens[1]), ...rest].filter(Boolean).join(' ');
    }
    return tokens.map(x => expandToken(x)).filter(Boolean).join(' ');
  }
  return expandToken(f);
}

function normalizeChooseBlocks(text) {
  // [Choose]\n: A\n: B  or [Choose]\n: A\n: B\n\nCombo 2 | ...
  return text.replace(
    /\[Choose\]\s*\n\s*:\s*([^\n]+)\s*\n\s*:\s*([^\n]+)/gi,
    (_, a, b) => {
      const A = expandFragment(a.trim());
      const B = expandFragment(b.trim());
      return `Choose one: ${stripDot(A)} or ${stripDot(B)}.`;
    }
  );
}

function expandChooseInline(f) {
  // [Choose] | [Coin 2] | [Power]  — caller may have already split on |;
  // here f is "[Choose] [Coin 2] [Power]" style
  const bits = [...f.matchAll(/\[[^\]]+\]/g)].map(m => m[0]);
  if (bits.length >= 3 && /^\[Choose\]$/i.test(bits[0])) {
    const opts = bits.slice(1).map(expandToken).map(stripDot);
    if (opts.length === 2) return `Choose one: ${opts[0]} or ${opts[1]}.`;
    return `Choose one: ${opts.join(' or ')}.`;
  }
  if (bits.length === 1) return 'Choose one.';
  // Fallback: treat remaining as options
  const opts = bits.slice(1).map(expandToken).map(stripDot);
  return opts.length ? `Choose one: ${opts.join(' or ')}.` : 'Choose one.';
}

function stripDot(s) {
  return String(s || '').replace(/\.$/, '').trim();
}

function looseSlug(name) {
  return nameSlug(name).replace(/sleight/g, 'slight');
}

export function overlayOfficialCardText(cards, uespCards) {
  if (!Array.isArray(cards) || !Array.isArray(uespCards)) return cards;
  const byId = new Map();
  const bySlug = new Map();
  const byLoose = new Map();
  for (const u of uespCards) {
    if (u.id) byId.set(u.id, u);
    const slug = nameSlug(u.name);
    if (slug) bySlug.set(slug, u);
    const loose = looseSlug(u.name);
    if (loose) byLoose.set(loose, u);
    // also index local id tail: deck__cat__name → name with _
    const tail = String(u.id || '').split('__').pop();
    if (tail) bySlug.set(tail.replace(/_/g, '-'), u);
  }

  for (const card of cards) {
    let u = byId.get(card.id)
      || bySlug.get(card.id)
      || bySlug.get(nameSlug(card.name))
      || byLoose.get(looseSlug(card.name));
    if (!u || !u.rawEffect) continue;
    const expanded = expandRawEffect(u.rawEffect);
    if (expanded.playText) card.playText = expanded.playText;
    if (expanded.combo2Text) card.combo2Text = expanded.combo2Text;
    if (expanded.combo3Text) card.combo3Text = expanded.combo3Text;
    if (expanded.combo4Text) card.combo4Text = expanded.combo4Text;
    // Clear combo text that UESP says is empty when summary had leftover
    if (!expanded.combo2Text && u.rawEffect && !/Combo\s*2/i.test(u.rawEffect)) {
      /* keep existing if any — only overlay when UESP provided */
    }
  }
  return cards;
}

/** Official-style patron ability description from UESP favorLevels.raw */
export function expandPatronDesc(raw, { patronId } = {}) {
  if (!raw || /^none$/i.test(String(raw).trim())) return null;
  let s = String(raw).trim();

  // Favor / neutral phrasing (cost line is separate)
  s = s.replace(/;?\s*this patron favors you\.?$/i, '');
  s = s.replace(/;?\s*patron favors you\.?$/i, '');
  s = s.replace(/;?\s*this patron becomes unaligned\.?$/i, '');
  s = s.replace(/;?\s*patron becomes unaligned\.?$/i, '');
  s = s.replace(/\bthis patron favors you\b/gi, 'This Patron now FAVORS you');
  s = s.replace(/\bthis patron becomes unaligned\b/gi, 'This Patron is now NEUTRAL');

  // Pelin Refresh wording
  if (patronId === 'pelin' || /refresh up to 1 agent/i.test(s)) {
    s = s.replace(
      /refresh up to 1 agent\.?/i,
      'Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile.'
    );
  }

  // Light polish for common abbreviations
  s = s.replace(/\bgain (\d+) Coin\b/gi, 'Gain $1 Coin');
  s = s.replace(/\bgain (\d+) Power\b/gi, 'Gain $1 Power');
  s = s.replace(/\bgain (\d+) Prestige\b/gi, 'Gain $1 Prestige');
  s = s.replace(/\bdraw 1\b/gi, 'Draw 1 card');
  s = s.replace(/\bknock it out\b/gi, 'Knock Out that Agent');
  s = s.replace(/\bunusable; no benefit\.?/i, 'Cannot be used.');

  // Capitalize start of effect after cost strip happens later
  s = s.replace(/\s+/g, ' ').trim();
  if (s && !s.endsWith('.') && !s.endsWith('?')) s += '.';
  // Capitalize first letter of each clause after ": "
  s = s.replace(/(^|[.]\s*)([a-z])/g, (_, a, b) => a + b.toUpperCase());
  return s;
}

export function overlayOfficialPatronText(patrons, uespPatrons) {
  if (!Array.isArray(patrons) || !Array.isArray(uespPatrons)) return patrons;
  const byId = new Map();
  for (const u of uespPatrons) {
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
