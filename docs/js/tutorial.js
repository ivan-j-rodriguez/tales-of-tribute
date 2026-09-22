/** Guided match steps. Plain language, one spotlight at a time. */

export const TOUR_STEPS = [
  {
    id: 'hand',
    sel: '#hand-zone',
    text: 'Your hand. Tap a card to play it. Hold a card to read it.',
  },
  {
    id: 'resources',
    sel: '#you-res',
    text: 'Coin buys from the Tavern. Power knocks out Agents. Leftover Power becomes Prestige when you end the turn.',
  },
  {
    id: 'tavern',
    sel: '#tavern-zone',
    text: 'The Tavern is five cards in the middle. Spend Coin to buy one. It waits in your cooldown until your deck reshuffles.',
  },
  {
    id: 'combos',
    sel: '#events-rail',
    text: 'Combos fire when you play extra cards from the same Patron in one turn. Played effects show on the left.',
  },
  {
    id: 'agents',
    sel: '#you-agents',
    text: 'Agents stay in these slots until they are knocked out. Empty outlines are open seats. Taunt Agents must be hit first.',
  },
  {
    id: 'patrons',
    sel: '#patron-rail',
    text: 'Patrons live here, plus the Treasury. You may call one Patron per turn. Calling flips favor toward you.',
  },
  {
    id: 'end',
    sel: '#btn-end',
    text: 'Press End Turn when you are done. Power converts to Prestige unless a Taunt Agent is still in the way.',
  },
  {
    id: 'win',
    sel: '#turn-ind',
    text: 'You win at 40 Prestige if your rival cannot pass you, at 80 Prestige outright, or by favoring all four Patrons.',
  },
];

/** Skip is available after the first step, and whenever the tutorial is replayed. */
export function canSkipTourStep(index) {
  return Number(index) > 0;
}

export function tourStep(index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= TOUR_STEPS.length) return null;
  return TOUR_STEPS[i];
}
