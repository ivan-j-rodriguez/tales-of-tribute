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

/**
 * Skip Tour is on every step once the tour has started, including step 0
 * of a first run and of a replayed tutorial match. A hidden Skip on the
 * opener was an exit the player could not reach if the tip sat offscreen.
 */
export function canSkipTourStep(index) {
  const i = Number(index);
  return Number.isInteger(i) && i >= 0;
}

const TOUR_MARGIN = 12;
const TOUR_GAP = 12;

/**
 * Place the tip so Next and Skip stay inside the viewport.
 * A target with room below or above keeps the tip beside it.
 * A target that is too tall for that (the patron rail in portrait)
 * falls back to a bottom-center dock and still returns a hole on the target.
 *
 * The old placement set `bottom` to `viewport - target.top + 12` whenever
 * the space under the target was under 150px. For a full-height rail that
 * value is about one screen tall, which parks the tip above the viewport.
 */
export function layoutTourStep({ target, viewport, panel }) {
  const margin = TOUR_MARGIN;
  const gap = TOUR_GAP;
  const vw = Math.max(0, Number(viewport?.width) || 0);
  const vh = Math.max(0, Number(viewport?.height) || 0);
  const ox = Number(viewport?.offsetLeft) || 0;
  const oy = Number(viewport?.offsetTop) || 0;
  const safeBottom = Math.max(0, Number(viewport?.safeBottom) || 0);
  const viewRight = ox + vw;
  const viewBottom = oy + vh - safeBottom;
  const clamp = (n, a, b) => Math.max(a, Math.min(n, b));

  const maxPanelW = Math.max(120, vw - margin * 2);
  const maxPanelH = Math.max(88, (viewBottom - oy) - margin * 2);
  const pw = clamp(Number(panel?.width) || Math.min(320, maxPanelW), 120, maxPanelW);
  const ph = clamp(Number(panel?.height) || 160, 72, maxPanelH);

  const r = target && target.width > 8 && target.height > 8 ? target : null;
  const tLeft = r ? r.left : 0;
  const tTop = r ? r.top : 0;
  const tRight = r ? r.left + r.width : 0;
  const tBottom = r ? r.top + r.height : 0;
  const visible = !!(r
    && tBottom > oy + 4
    && tRight > ox + 4
    && tTop < viewBottom - 4
    && tLeft < viewRight - 4);

  let dock = 'safe';
  let top = viewBottom - margin - ph;
  if (visible) {
    const spaceBelow = viewBottom - (tBottom + gap);
    const spaceAbove = tTop - oy - gap;
    if (spaceBelow >= ph + margin) {
      dock = 'below';
      top = tBottom + gap;
    } else if (spaceAbove >= ph + margin) {
      dock = 'above';
      top = tTop - gap - ph;
    }
  }
  top = clamp(top, oy + margin, Math.max(oy + margin, viewBottom - margin - ph));
  let left = ox + (vw - pw) / 2;
  left = clamp(left, ox + margin, Math.max(ox + margin, viewRight - margin - pw));

  let hole = null;
  if (visible) {
    const pad = 8;
    const hl = clamp(tLeft - pad, ox + 4, viewRight - 40);
    const ht = clamp(tTop - pad, oy + 4, viewBottom - 40);
    const hr = clamp(tRight + pad, hl + 36, viewRight - 4);
    const hb = clamp(tBottom + pad, ht + 36, viewBottom - 4);
    hole = { left: hl, top: ht, width: hr - hl, height: hb - ht };
  }

  return {
    dock,
    hole,
    panel: { left, top, width: pw, maxHeight: maxPanelH },
  };
}

export function tourStep(index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= TOUR_STEPS.length) return null;
  return TOUR_STEPS[i];
}
