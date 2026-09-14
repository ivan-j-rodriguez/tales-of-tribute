/**
 * Official in-game Tales of Tribute tooltip sentences.
 * Sources: ESO card tooltips (ESO-Hub / in-client PLAY EFFECT wording)
 * and UESP patron raw ability lines.
 */

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
    case 'donate': return `Donate ${n}.`;
    case 'toss': return `Toss ${n}.`;
    case 'discard': return n === 1 ? 'Discard 1 card.' : `Discard ${n} cards.`;
    case 'destroy': return `Destroy up to ${n} cards from the Tavern.`;
    case 'replace': return `Remove up to ${n} cards from the Tavern.`;
    case 'acquire': return `Acquire a card from the Tavern costing up to ${n}.`;
    case 'knockout': return n === 1
      ? "Place 1 of your opponent's active agents into their cooldown."
      : `Place up to ${n} of your opponent's active agents into their cooldown.`;
    case 'knockout_all': return "Place all of your opponent's active agents into their cooldown.";
    case 'confine': return `Reprieve ${n}.`;
    case 'patron_extra': return 'Call on 1 additional Patron this turn.';
    case 'hand_refresh': return n === 1
      ? 'Refresh 1 card from your cooldown pile to your hand.'
      : `Refresh ${n} cards from your cooldown pile to your hand.`;
    case 'draw_refresh': return n === 1
      ? 'Look at the next 1 card of your draw. You may move it to your cooldown.'
      : `Look at the next ${n} cards of your draw. Choose up to ${n} of those cards to move to your cooldown.`;
    case 'draw_refresh_agents': return `Look at the next ${n} cards of your draw. You may move Agents among them to your cooldown.`;
    case 'heal': return `Heal an Agent for ${n}.`;
    case 'create': return e.card ? `Create ${e.card}.` : 'Create a card.';
    case 'sacking': return 'Create Summerset Sacking.';
    case 'opp_prestige': {
      const amt = Math.abs(n);
      return amt === 1
        ? 'Your opponent loses 1 Prestige.'
        : `Your opponent loses ${amt} Prestige.`;
    }
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
      if (!opts.length) return 'Choose one.';
      return `Choose one: ${opts.join(' OR ')}`;
    }
    default:
      return '';
  }
}

export function formatEffects(effects, fallbackText) {
  const lines = (effects || []).map(effectSentence).filter(Boolean);
  if (lines.length) return lines;
  const fb = String(fallbackText || '').trim();
  if (!fb) return [];
  // Never show leftover token summaries like "1 Coin" if we can help it —
  // but if there are no ops, keep the author's sentence.
  if (/^\d+\s+(Coin|Power|Prestige)$/i.test(fb)) {
    const m = fb.match(/^(\d+)\s+(Coin|Power|Prestige)$/i);
    return [`Gain ${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}.`];
  }
  return fb.split(/[;\n]|(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
}

export function cardPlayLines(d) {
  const lines = formatEffects(d.play, d.playText);
  if (d.taunt) lines.push('This Agent has Taunt.');
  if (d.curse && !lines.length) lines.push('This card has no effect.');
  return lines;
}

export function cardComboLines(d, n) {
  const key = `combo${n}`;
  const textKey = `combo${n}Text`;
  return formatEffects(d[key], d[textKey]);
}

/** Apply UESP / in-game patron ability lines onto the live catalog. */
export const OFFICIAL_PATRON_TEXT = {
  treasury: {
    favored: null,
    neutral: 'Pay 2 Coin, Sacrifice 1 card from your hand or your played cards: Create 1 Writ of Coin card and place it in your cooldown pile.',
    unfavored: null,
  },
  pelin: {
    favored: 'Pay 2 Power with an agent in cooldown: Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile.',
    neutral: 'Pay 2 Power with an agent in cooldown: Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power with an agent in cooldown: Refresh — Return up to 1 Agent card from your cooldown pile to the top of your draw pile. This Patron is now NEUTRAL.',
  },
  hlaalu: {
    favored: 'Sacrifice 1 card you own in play that cost 1 or more Coin: Gain Prestige equal to the card\'s cost minus 1.',
    neutral: 'Sacrifice 1 card you own in play that cost 1 or more Coin: Gain Prestige equal to the card\'s cost minus 1. This Patron now FAVORS you.',
    unfavored: 'Sacrifice 1 card you own in play that cost 1 or more Coin: Gain Prestige equal to the card\'s cost minus 1. This Patron is now NEUTRAL.',
  },
  crows: {
    favored: 'Cannot be used.',
    neutral: 'Pay all Coin: Gain Power equal to Coin paid minus 1. This Patron now FAVORS you.',
    unfavored: 'Pay all Coin: Gain Power equal to Coin paid minus 1. This Patron is now NEUTRAL.',
  },
  celarus: {
    favored: 'If opponent has an active agent, pay 4 Coin: Knock Out that Agent.',
    neutral: 'If opponent has an active agent, pay 4 Coin: Knock Out that Agent. This Patron now FAVORS you.',
    unfavored: 'If opponent has an active agent, pay 4 Coin: Knock Out that Agent. This Patron is now NEUTRAL.',
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
    favored: 'Pay 3 Coin: Gain 1 Power per 4 owned cards; Create Summerset Sacking.',
    neutral: 'Pay 2 Coin: Gain 1 Power per 6 owned cards. This Patron now FAVORS you.',
    unfavored: 'Pay 1 Coin: Gain 2 Power. This Patron is now NEUTRAL.',
  },
  rajhin: {
    favored: 'Pay 3 Coin: Create Bewilderment in opponent cooldown.',
    neutral: 'Pay 3 Coin: Create Bewilderment in opponent cooldown. This Patron now FAVORS you.',
    unfavored: 'Pay 3 Coin: Create Bewilderment in opponent cooldown. This Patron is now NEUTRAL.',
  },
  druid: {
    favored: 'Passive Combo 4: add The Chimera to your cooldown. Also pay 2 Power to replace up to 2 Tavern cards.',
    neutral: 'Passive Combo 5: add The Chimera to your cooldown. Also pay 2 Power to replace up to 2 Tavern cards. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power: Replace up to 2 Tavern cards. This Patron is now NEUTRAL.',
  },
  almalexia: {
    favored: 'Pay 1 Coin and discard a card: Reprieve 5.',
    neutral: 'Discard a card: Reprieve 4. This Patron now FAVORS you.',
    unfavored: 'Pay 1 Coin: Reprieve 3. This Patron is now NEUTRAL.',
  },
  mora: {
    favored: 'Pay 3 Power: Bargain.',
    neutral: 'Pay 3 Power: Bargain. This Patron now FAVORS you.',
    unfavored: 'Pay 2 Power: Bargain. This Patron is now NEUTRAL.',
  },
  alessia: {
    favored: 'Pay 4 Coin: Create Chainbreaker Sergeant in cooldown.',
    neutral: 'Pay 4 Coin: Create Soldier of the Empire in cooldown. This Patron now FAVORS you.',
    unfavored: 'Pay 3 Coin: Gain 2 Power. This Patron is now NEUTRAL.',
  },
};

export function applyOfficialPatronText(patrons) {
  for (const p of patrons) {
    const pack = OFFICIAL_PATRON_TEXT[p.id];
    if (!pack || !p.abilities) continue;
    for (const key of ['favored', 'neutral', 'unfavored']) {
      if (!p.abilities[key]) continue;
      if (pack[key]) p.abilities[key].desc = pack[key];
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
