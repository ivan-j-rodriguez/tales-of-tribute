# Status

**2026-09-13 (web phone-landscape fix, build 26):** GitHub Pages players were zoomed into the tavern on iPhone landscape. The web table now **scale-to-fits the full board** (opponent piles/hand, tavern, player agents/hand, draw+cooldown both sides, patrons, hourglass) with iPhone safe-area padding. End Turn is the ornate hourglass (lime/gold glow on your turn). Affordable tavern and playable hand cards glow. Wooden pendants tip left with names + medallions. SFX + mute persist separately from music.

**Unofficial fan project.** Not affiliated with Bethesda / ZeniMax / ESO. Not for sale.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens).
- **13 patrons** (Treasury + 12) — Hermaeus Mora included.
- Art lives in `web/assets/` and is bundled into iOS via `ios/TalesOfTribute/TalesOfTribute/Resources/assets` → `web/assets`.

## Web (GitHub Pages — play this)

`docs/` is a copy of `web/`. Cache-bust `?v=25`.

| Fix | Notes |
|---|---|
| Landscape fit | Design canvas 1180×640, JS `fitMatchBoard()` scales into the viewport. Tested ~844×390 and common phone landscape sizes. |
| Felt | Dark teal + knotwork + candle bloom (not the flat green `#24705c`). |
| Hourglass | Right of the patron column. Glows when you can end. Replaces the flat brown End Turn bar. |
| Card glow | Cyan/gold rim on affordable tavern + legal hand cards. On-card combo 2/3/4 as suits stack. No fake combo bar. |
| Piles | Draw + cooldown visible for both players (counts, card-back art, tap to inspect). |
| Tokens | Coin gold circle, Prestige **blue hex**, Power **red diamond**, Patron-uses silver coin. Opponent above tavern, you below. |
| Patrons | Wooden pendants tip **LEFT**. Treasury stays Neutral (no favor pointer). |
| SFX | Distinct kinds: coinA (Gold/Writ play), coinB (Treasury/Writ create), play, buy, shuffle, knockout, patron, combo, end, win. Mute in Settings + in-match (`tot_sfx_on`). Music mute unchanged. |
| Shuffle | Cooldown→draw emits `shuffle` + riffle + pile animation. |

## iOS (kept aligned)

SwiftUI tokens match the four official shapes/colors. Affordable tavern and playable hand cards glow. Opponent token row sits above the tavern. Wooden pendants + hourglass were already the ESO layout.

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

- Linux: `node scripts/test_ios_engine.mjs` (catalog, seeded path, rarity, web AI vs AI).
- Mac: `cd ios/TributeCore && swift test` (setup, treasury, taunt, 40/80, curse, AI finish, gauntlet lock, shop).

This Cloud VM has **no Xcode / Simulator / Swift**. The Xcode project is intended to build on a Mac.

## How to run

**Web:** `cd web && python3 -m http.server 8080`

**iOS:** Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj` in Xcode 15+, run on iOS 17+.

**Layout preview (browser, no Simulator):** `cd ios/preview && python3 -m http.server 8090` then open `/board.html` and `/map.html`.
