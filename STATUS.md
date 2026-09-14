# Status

**2026-09-14 (build 32):** Full-bleed felt rescue. Patron rail, piles, and played-effects are overlays — they no longer steal tavern width. Portrait + landscape tavern band ≥ 72% of the viewport.

**2026-09-14 (build 31):** Patron tokens are circular silver/gold tribute coins again (no brown arrow nameplates). Felt packed so tavern + hand grow; empty agent seats stay thin hex outlines. `?native=1` hides the landscape banner for Expo Go.

**2026-09-14 (Phase A, build 30):** Board authenticity, official copy, patron-uses placement, and targeted abilities. Rebased on main (table pack + inspect).

## Phase A — shipped (this build)

- [x] Widen the playing field; events/combo strip **floats** (no permanent left column).
- [x] Hourglass slides **up** beside the patron rail (not jammed bottom-right).
- [x] Patron **tokens** are circular silver/gold medallions (portrait + ornate bezel). Small name labels sit under the coin.
- [x] Favor **point** on the bezel rotates (Neutral left, you down, rival up). Mora + Treasury never turn and have no point.
- [x] Treasury has **no favor tip/pointer** and never rotates.
- [x] Draw + cooldown piles larger and in their own columns.
- [x] Portrait + landscape both playable (no rotate-gate).
- [x] Patron hover / inspect / pick modal show **Favored + Neutral + Unfavored**.
- [x] Card inspect: no full-screen black vignette; official play / combo / type / cost / HP text.
- [x] Timer + AI difficulty only before a match (splash / lobby / settings-from-menu). Mid-match hourglass toggle removed.
- [x] Patron-uses bust coin sits on the **hourglass / right rail**, not in the Coin / Prestige / Power triad.
- [x] Targeted abilities: full-screen pick modal (title, center row, gold select, Confirm, Show Board, Cancel). Treasury sacrifice (hand or played) → Writ of Coin. Acquire stays on the tavern (no modal). Same picks for Destroy, Knock Out, Replace, Toss, Donate/Discard, Refresh, Confine, Heal, Choose A/B. AI still auto-picks. After confirm: dissolve / KO slash + fly to cooldown / buy arc. End turn streams Power → Prestige.
- [x] Patron-uses is a smaller gold octagon on the hourglass rail that greys when spent — not a 4th equal resource pip.

## Phase B — next PR (not in this ship)

- [ ] Cutpurse only on win; harder gold; rarity-weighted fragments / clues / rare cards
- [ ] Endgame deck gates (fragments + one of each card)
- [ ] Rotating daily store, bundles, tomorrow preview, ≥5× cosmetics
- [ ] Provinces: win advances, lose locks until NY midnight, path-clear grand prize
- [ ] Daily login calendar with red X on misses
- [ ] More Club achievements
- [ ] Rematch + fan-safe tournament bracket
- [ ] Encyclopedia grouped by deck (caption → pendant → cards)

**Unofficial fan project.** Not affiliated with Bethesda / ZeniMax / ESO. Not for sale.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens).
- **13 patrons** (Treasury + 12) — Hermaeus Mora included.
- Art lives in `web/assets/` and is bundled into iOS via `ios/TalesOfTribute/TalesOfTribute/Resources/assets` → `web/assets`.

## Web (GitHub Pages — play this)

`docs/` is a copy of `web/`. Cache-bust `?v=32`.

| Fix | Notes |
|---|---|
| Field | Felt is 100% of `#match`. Patrons / piles / effects overlay it. Tavern band ≥ 72% viewport. |
| Hourglass | Mid-high on the right, with silver/bronze patron-call busts. |
| Tokens | Circular coins. Point left / down / up for favor. Mora + Treasury stay still. |
| Copy | `texts.js` official sentences + UESP patron lines. Harvest Season = “Draw 1 card.” |
| Targeting | `GameEngine.targetingStepsForPlay/Patron` + in-match banner. |

## iOS (kept aligned)

SwiftUI tokens still use the four official shapes/colors. This Phase A pass is web-first (Pages). Engine targeting helpers live in `web/js/engine.js`; iOS `TributeCore` still auto-picks until a follow-up.

### Engine (iOS vs web)

`ios/TributeCore` still applies official loop fixes (`data/rules.md`):

1. Both players start with **6 Gold + all four match-patron starters** (10-card decks).
2. Second player gets **+1 Coin** on their first turn.
3. Draw **up to 5** at start of turn (leftovers stay). The web still draws +5 each turn.
4. **Contracts play immediately** when bought.
5. **Bewilderment** must be played before any non-curse card.
6. Patron sweep is checked after a call and at end of turn.
7. Last chance: opponent must **strictly exceed** the 40-holder (equal → 40-holder wins).

## Tests

- Linux: `node scripts/test_ios_engine.mjs` and `node scripts/test_phase_a.mjs`.
- Gestures (Chrome): `cd web/test && node play-gestures.mjs`.
- Mac: `cd ios/TributeCore && swift test`.

## How to run

**Web:** `cd web && python3 -m http.server 8080`

**iOS:** Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj` in Xcode 15+, run on iOS 17+.
