# Status

**2026-09-13 (iOS-first authenticity):** The SwiftUI client is the priority deliverable. It follows the user’s ESO reference board (vertical wooden pendants, point toward the felt, hourglass to the right of that column, fanned hand) even when that disagrees with the web preview’s patron-coin cluster. The web SPA remains playable; its rail was **not** rewritten in this pass.

**Unofficial fan project.** Not affiliated with Bethesda / ZeniMax / ESO. Not for sale.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens).
- **13 patrons** (Treasury + 12) — Hermaeus Mora included.
- Art lives in `web/assets/` and is bundled into iOS via `ios/TalesOfTribute/TalesOfTribute/Resources/assets` → `web/assets`.

## iOS client (priority)

Playable end-to-end vs AI on iOS 17+ (landscape locked).

| Feature | Notes |
|---|---|
| Board | Dark teal felt, wood rim, candle bloom. Opponent top / you bottom. Tavern 5 center. Draw bottom-left, cooldown bottom-right. Played-effects strip left. Coin / Prestige / Power hexes. |
| Patrons | Far-right **vertical plaques**: silver medallion + wooden banner with **triangular point LEFT**. Blue/red favor triangles on the point. Treasury (chest) stays Neutral — no pointer. |
| Hourglass | Right of the pendant column. Lime/yellow glow + “End Turn” when it is your turn. |
| Hand | Bottom, overlapping arc, larger than board cards. Tap = play; hold = inspect. |
| Patron tap | Detail overlay (Treasury-style) + Activate / Close. |
| AI | Difficulty 1–10 (ported heuristic from `web/js/ai.js`). |
| Unlocks | Starter four (Pelin, Crows, Hlaalu, Celarus). Others greyed with fragment / progress hints. |
| Daily | Parchment Tamriel map; pins on real zones; **NY-date seeded path** (High Isle first, rest shuffled). Difficulty 1–10 per stop. Win gold + purse; streak raises rarity. **Fail locks the remaining NY day** (resets at America/New_York midnight). |
| Shop | Gold buys table themes + card backs; equipped skin tints the felt. |
| Collection | Encyclopedia lite of the JSON catalog. |
| Menu | Fan-made · Unofficial disclaimer. |

### Engine corrections vs the web port

`ios/TributeCore` starts from `web/js/engine.js` and applies official loop fixes (`data/rules.md`):

1. Both players start with **6 Gold + all four match-patron starters** (10-card decks).
2. Second player gets **+1 Coin** on their first turn.
3. Draw **up to 5** at start of turn (leftovers stay). The web still draws +5 each turn.
4. **Contracts play immediately** when bought.
5. **Bewilderment** must be played before any non-curse card.
6. Patron sweep is checked after a call and at end of turn.
7. Last chance: opponent must **strictly exceed** the 40-holder (equal → 40-holder wins).

Web layout/engine were left as-is so this ship would not regress the browser table.

## Web (still ships)

Modes, music, ranked, hotseat, PeerJS, club cosmetics — unchanged. Right rail remains the coin cluster documented in the previous status note.

## Tests

- Linux: `node scripts/test_ios_engine.mjs` (catalog, seeded path, rarity, web AI vs AI).
- Mac: `cd ios/TributeCore && swift test` (setup, treasury, taunt, 40/80, curse, AI finish, gauntlet lock, shop).

This Cloud VM has **no Xcode / Simulator / Swift**. The Xcode project is intended to build on a Mac.

## How to run

**Web:** `cd web && python3 -m http.server 8080`

**iOS:** Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj` in Xcode 15+, run on iOS 17+.

**Layout preview (browser, no Simulator):** `cd ios/preview && python3 -m http.server 8090` then open `/board.html` and `/map.html`.
