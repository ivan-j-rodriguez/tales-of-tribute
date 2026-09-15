/**
 * Official in-game Tales of Tribute tooltip sentences.
 * Sources: ESO card tooltips (ESO-Hub / in-client PLAY EFFECT wording)
 * and UESP patron raw ability lines.
 */

import {
  donateSentence, tossSentence, refreshSentence, knockoutSentence, knockoutAllSentence,
  destroySentence, replaceSentence, acquireSentence, confineSentence, discardSentence,
  healSentence, patronCallSentence, tauntSentence, createSentence, losePrestigeSentence,
  expandToken,
} from './officialText.js';

const RES = { coin: 'Coin', power: 'Power', prestige: 'Prestige' };

function nOf(n, word) {
  const v = n == null ? 1 : n;
  return `${v} ${word}`;
}

export function effectSentence(e) {
  if (!e || !e.op) return '';
  const n = e.n == null ? 1 : e.n;
  switch (e.op) {
    case 'coin': return `Gain ${nOf(n, 'Coin')}.`;
    case 'power': return `Gain ${nOf(n, 'Power')}.`;
    case 'prestige': return `Gain ${nOf(n, 'Prestige')}.`;
    case 'draw': return n === 1 ? 'Draw 1 card.' : `Draw ${n} cards.`;
    case 'donate': return donateSentence(n);
    case 'toss': return tossSentence(n);
    case 'discard': return discardSentence(n);
    case 'destroy': return destroySentence(n);
    case 'replace': return replaceSentence(n);
    case 'acquire': return acquireSentence(n);
    case 'knockout': return knockoutSentence(n);
    case 'knockout_all': return knockoutAllSentence();
    case 'confine': return confineSentence(n);
    case 'patron_extra': return patronCallSentence();
    case 'hand_refresh': return refreshSentence(n, false);
    case 'draw_refresh': return n === 1
      ? 'Look at the next 1 card of your draw. You may move it to your cooldown.'
      : `Look at the next ${n} cards of your draw. Choose up to ${n} of those cards to move to your cooldown.`;
    case 'draw_refresh_agents': return `Look at the next ${n} cards of your draw. You may move Agents among them to your cooldown.`;
    case 'heal': return healSentence(n);
    case 'create': return createSentence(e.card || 'a card', /bewilderment/i.test(e.card || ''));
    case 'sacking': return createSentence('Summerset Sacking');
    case 'opp_prestige': return losePrestigeSentence(n);
    case 'setback_coin': return `Setback — Opponent gains ${nOf(n, 'Coin')}.`;
    case 'setback_power': return `Setback — Opponent gains ${nOf(n, 'Power')}.`;
    case 'setback_draw': return n === 1
      ? 'Setback — Opponent draws 1 card.'
      : `Setback — Opponent draws ${n} cards.`;
    case 'coin_per_knock': return `Gain ${nOf(n, 'Coin')} for each Agent you knock out this turn.`;
    case 'passive': {
      const res = RES[e.resource] || e.resource || 'Coin';
      const gain = `Gain ${nOf(e.n, res)}.`;
      if (e.trigger === 'agent_play') return `While this Agent is in play: when an Agent is played, ${gain}`;
      if (e.trigger === 'agent_cooldown') return `While this Agent is in play: when an Agent is placed in your cooldown, ${gain}`;
      if (e.trigger === 'discard') return `While this Agent is in play: when you discard a card, ${gain}`;
      return `While this Agent is in play: when a card is placed in your cooldown, ${gain}`;
    }
    case 'choose': {
      const opts = (e.options || []).map((opt) => {
        const inner = (Array.isArray(opt) ? opt : [opt]).map(effectSentence).filter(Boolean);
        return inner.join(' ') || '—';
      });
      if (!opts.length) return 'Choose 1 of the following:';
      return `Choose 1 of the following: ${opts.map((o) => o.replace(/\.$/, '')).join('. Or ')}.`;
    }
    default:
      return '';
  }
}

function ensureDot(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function capRes(word) {
  const w = String(word || '').toLowerCase();
  if (w === 'coin') return 'Coin';
  if (w === 'power') return 'Power';
  if (w === 'prestige') return 'Prestige';
  return word;
}

/** True when the string is already in-game prose, not a token stub like "2 Coin". */
export function isOfficialProse(t) {
  const s = String(t || '').trim();
  if (!s) return false;
  if (/^\d+\s+(Coin|Power|Prestige)\b/i.test(s)) return false;
  if (/^Draw\s+\d+$/i.test(s)) return false;
  if (/^(Donate|Toss|Refresh|Knock Out|Acquire|Replace|Destroy|Confine|Patron)\s*\d*\.?$/i.test(s)) return false;
  if (/^Knock Out an enemy Agent\.?$/i.test(s)) return false;
  if (/^This Agent has Taunt\.?$/i.test(s)) return false;
  if (/^Taunt\.?$/i.test(s)) return false;
  if (/^Choose one\.?$/i.test(s)) return false;
  return /^(Gain |Draw |Donate |Toss |Acquire |Refresh |Knock Out |Taunt|Replace |Destroy |Confine |Opponent |Setback |When |Choose |Create |Heal |Discard |This |Place |Pay |Call |Look |While |Cannot |If |Curse |Reprieve |Passive |Sacrifice )/i.test(s);
}

function polishFallback(fb) {
  const s = String(fb || '').trim();
  if (!s) return [];
  if (isOfficialProse(s)) {
    return s.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean).map(ensureDot);
  }
  const andParts = s.split(/\s+AND\s+/i);
  if (andParts.length > 1) {
    const lines = andParts.flatMap(polishFallback).filter(Boolean);
    if (lines.length) return lines;
  }
  let m;
  if ((m = s.match(/^(\d+)\s+(Coin|Power|Prestige)$/i))) {
    return [`Gain ${m[1]} ${capRes(m[2])}.`];
  }
  if ((m = s.match(/^Draw\s+(\d+)$/i))) {
    const n = Number(m[1]);
    return [n === 1 ? 'Draw 1 card.' : `Draw ${n} cards.`];
  }
  if ((m = s.match(/^Donate\s+(\d+)$/i))) return [donateSentence(Number(m[1]))];
  if ((m = s.match(/^Toss\s+(\d+)$/i))) return [tossSentence(Number(m[1]))];
  if ((m = s.match(/^Acquire\s+(\d+)$/i))) return [acquireSentence(Number(m[1]))];
  if ((m = s.match(/^(?:Hand |Draw )?Refresh\s+(\d+)$/i))) {
    return [refreshSentence(Number(m[1]), /agent/i.test(s))];
  }
  if (/^Knock Out All$/i.test(s)) return [knockoutAllSentence()];
  if ((m = s.match(/^Knock Out\s+(\d+)$/i))) return [knockoutSentence(Number(m[1]))];
  if (/^Taunt$/i.test(s) || /^This Agent has Taunt\.?$/i.test(s)) return [tauntSentence()];
  if ((m = s.match(/^Replace\s+(\d+)$/i))) return [replaceSentence(Number(m[1]))];
  if ((m = s.match(/^Destroy\s+(\d+)$/i))) return [destroySentence(Number(m[1]))];
  if ((m = s.match(/^Confine\s+(\d+)$/i))) return [confineSentence(Number(m[1]))];
  if (/^Patron$/i.test(s)) return [patronCallSentence()];
  const expanded = expandToken(s);
  if (expanded && expanded !== (s.endsWith('.') ? s : s + '.')) return [expanded];
  return s.split(/[;\n]|(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean).map(ensureDot);
}

export function formatEffects(effects, fallbackText) {
  const lines = (effects || []).map(effectSentence).filter(Boolean);
  if (lines.length) return lines;
  return polishFallback(fallbackText);
}

/** Prefer UESP/in-client sentences on the card; otherwise expand engine ops. */
export function inspectLines(effects, text) {
  const t = String(text || '').trim();
  if (isOfficialProse(t)) return polishFallback(t);
  return formatEffects(effects, text);
}

export function cardPlayLines(d) {
  const lines = inspectLines(d.play, d.playText);
  if (d.taunt && !lines.some((l) => /taunt/i.test(l))) lines.push(tauntSentence());
  if (d.curse && !lines.length) lines.push('This card has no play effect.');
  return lines;
}

export function cardComboLines(d, n) {
  const key = `combo${n}`;
  const textKey = `combo${n}Text`;
  return inspectLines(d[key], d[textKey]);
}

/** Rewrite catalog play/combo stubs into official tooltip sentences. */
export function applyOfficialCardText(cards) {
  if (!Array.isArray(cards)) return cards;
  for (const c of cards) {
    const play = inspectLines(c.play, c.playText);
    if (play.length) c.playText = play.join(' ');
    for (const n of [2, 3, 4]) {
      const lines = inspectLines(c[`combo${n}`], c[`combo${n}Text`]);
      c[`combo${n}Text`] = lines.length ? lines.join(' ') : null;
    }
  }
  return cards;
}

/** Apply UESP / in-game patron ability lines onto the live catalog. */
export const OFFICIAL_PATRON_TEXT = {
  treasury: {
    favored: null,
    neutral: 'Pay 2 Coin, Sacrifice 1 card from your hand or your played cards: Create 1 Writ of Coin card and place it in your cooldown pile.',
    unfavored: null,
  },
  pelin: {
    favored: 'Pay 2 Power with an Agent in your cooldown pile: Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile.',
    neutral: 'Pay 2 Power with an Agent in your cooldown pile: Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power with an Agent in your cooldown pile: Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile. This Patron is now NEUTRAL.',
  },
  hlaalu: {
    favored: 'Sacrifice one owned in-play card costing at least 1 Coin: Gain Prestige equal to its cost minus 1.',
    neutral: 'Sacrifice one owned in-play card costing at least 1 Coin: Gain Prestige equal to its cost minus 1. This Patron now FAVORS you.',
    unfavored: 'Sacrifice one owned in-play card costing at least 1 Coin: Gain Prestige equal to its cost minus 1. This Patron is now NEUTRAL.',
  },
  crows: {
    favored: 'Cannot be used.',
    neutral: 'Pay all Coin: Gain Power equal to Coin paid minus 1. This Patron now FAVORS you.',
    unfavored: 'Pay all Coin: Gain Power equal to Coin paid minus 1. This Patron is now NEUTRAL.',
  },
  celarus: {
    favored: 'If opponent has an active Agent, pay 4 Coin: Knock Out — Place 1 of your opponent\'s active agents into their cooldown pile.',
    neutral: 'If opponent has an active Agent, pay 4 Coin: Knock Out — Place 1 of your opponent\'s active agents into their cooldown pile. This Patron now FAVORS you.',
    unfavored: 'If opponent has an active Agent, pay 4 Coin: Knock Out — Place 1 of your opponent\'s active agents into their cooldown pile. This Patron is now NEUTRAL.',
  },
  hunding: {
    favored: 'If you hold this favor until the start of your turn, Gain 1 Coin.',
    neutral: 'Pay 2 Power: Gain 1 Coin. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power: Gain 1 Coin. This Patron is now NEUTRAL.',
  },
  redeagle: {
    favored: 'Pay 2 Power: Draw 1 card.',
    neutral: 'Pay 2 Power: Draw 1 card. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power: Draw 1 card. This Patron is now NEUTRAL.',
  },
  orgnum: {
    favored: 'Pay 3 Coin: Gain 1 Power per 4 owned cards. Create 1 Summerset Sacking card and place it in your cooldown pile.',
    neutral: 'Pay 2 Coin: Gain 1 Power per 6 owned cards. This Patron now FAVORS you.',
    unfavored: 'Pay 1 Coin: Gain 2 Power. This Patron is now NEUTRAL.',
  },
  rajhin: {
    favored: 'Pay 3 Coin: Create 1 Bewilderment card and place it in your opponent\'s cooldown pile.',
    neutral: 'Pay 3 Coin: Create 1 Bewilderment card and place it in your opponent\'s cooldown pile. This Patron now FAVORS you.',
    unfavored: 'Pay 3 Coin: Create 1 Bewilderment card and place it in your opponent\'s cooldown pile. This Patron is now NEUTRAL.',
  },
  druid: {
    favored: 'Passive Combo 4: add The Chimera to your cooldown. Also pay 2 Power to Replace up to 2 cards from the Tavern.',
    neutral: 'Passive Combo 5: add The Chimera to your cooldown. Also pay 2 Power to Replace up to 2 cards from the Tavern. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power: Replace up to 2 cards from the Tavern. This Patron is now NEUTRAL.',
  },
  almalexia: {
    favored: 'Pay 1 Coin and discard a card: Reprieve — Look at the top 5 cards of your opponent\'s draw pile. Select 1 to place in their cooldown pile.',
    neutral: 'Discard a card: Reprieve — Look at the top 4 cards of your opponent\'s draw pile. Select 1 to place in their cooldown pile. This Patron now FAVORS you.',
    unfavored: 'Pay 1 Coin: Reprieve — Look at the top 3 cards of your opponent\'s draw pile. Select 1 to place in their cooldown pile. This Patron is now NEUTRAL.',
  },
  mora: {
    favored: 'Pay 3 Power: Bargain.',
    neutral: 'Pay 3 Power: Bargain. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power: Bargain. This Patron is now NEUTRAL.',
  },
  alessia: {
    favored: 'Pay 4 Coin: Create 1 Chainbreaker Sergeant card and place it in your cooldown pile.',
    neutral: 'Pay 4 Coin: Create 1 Soldier of the Empire card and place it in your cooldown pile. This Patron now FAVORS you.',
    unfavored: 'Pay 3 Coin: Gain 2 Power. This Patron is now NEUTRAL.',
  },
};

function polishPatronLine(s) {
  if (!s) return s;
  let t = String(s).trim();
  t = t.replace(/\bunusable; no benefit\.?/i, 'Cannot be used.');
  t = t.replace(/\bdraw 1\b/gi, 'Draw 1 card');
  t = t.replace(/\bReprieve\s+(\d+)\b/gi, (_, n) => `Reprieve — Look at the top ${n} cards of your opponent's draw pile. Select 1 to place in their cooldown pile`);
  t = t.replace(/\bknock it out\b/gi, 'Knock Out — Place 1 of your opponent\'s active agents into their cooldown pile');
  t = t.replace(
    /\brefresh up to 1 agent\.?/i,
    'Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile.'
  );
  t = t.replace(/\s+/g, ' ').trim();
  if (t && !/[.!?]$/.test(t)) t += '.';
  t = t.replace(/(^|[.]\s*)([a-z])/g, (_, a, b) => a + b.toUpperCase());
  return t;
}

export function applyOfficialPatronText(patrons) {
  for (const p of patrons) {
    const pack = OFFICIAL_PATRON_TEXT[p.id];
    if (!p.abilities) p.abilities = {};
    for (const key of ['favored', 'neutral', 'unfavored']) {
      if (pack?.[key]) {
        if (!p.abilities[key] || typeof p.abilities[key] !== 'object') {
          p.abilities[key] = { desc: pack[key] };
        } else {
          p.abilities[key].desc = pack[key];
        }
      } else if (p.abilities[key]?.desc) {
        p.abilities[key].desc = polishPatronLine(p.abilities[key].desc);
      }
      if (p.abilities[key]?.desc) p.abilities[key].desc = polishPatronLine(p.abilities[key].desc);
    }
  }
  return patrons;
}

export function resourceClass(line) {
  if (/setback/i.test(line)) return 'setback';
  if (/power/i.test(line)) return 'power';
  if (/prestige/i.test(line)) return 'prestige';
  if (/coin/i.test(line)) return 'coin';
  return '';
}
