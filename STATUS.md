# Status

**2026-09-13 (web phone fix, build 28):** Build 27 letterboxed landscape (1180×640 card with dark side bars) and blocked portrait behind a rotate-gate.

- **Landscape:** board is `100%` of the Safari viewport (`100dvw × 100dvh`, safe-area insets). Fluid CSS grid — no fixed canvas, no scale-to-fit gutters.
- **Vertical bands:** opponent hand/agents → tokens → tavern dead-center → tokens → player agents → hand. Agent dashed slots stay in their own rows.
- **Portrait:** playable again (compact full table: tavern, hand, piles, patrons, hourglass). Gentle “Landscape plays better” tip only — never a hard block.
- Piles stay as card-back stacks. Hourglass End Turn, SFX toggle, tokens, and left-pointing pendants stay.

**Unofficial fan project.** Not affiliated with Bethesda / ZeniMax / ESO. Not for sale.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens).
- **13 patrons** (Treasury + 12) — Hermaeus Mora included.
- Art lives in `web/assets/` and is bundled into iOS via `ios/TalesOfTribute/TalesOfTribute/Resources/assets` → `web/assets`.

## Web (GitHub Pages — play this)

`docs/` is a copy of `web/`. Cache-bust `?v=28`.

| Fix | Notes |
|---|---|
| Landscape fit | Full-bleed fluid grid (`width/height: 100%`). No 1180×640 letterbox. |
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
