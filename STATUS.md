# Status

**2026-09-14 (build 40):** Club chrome overhaul — High Isle / Crown Store palette (gold, cream parchment, deep navy-teal, metal). Splash primary actions. Store sections Featured/Bundles, Daily, Fragments, Cosmetics with hero parcels (aspirational copy; economy still grindy). Collection taps open real detail sheets. Card-info modal shows full hex + name (no clip). Kevin MacLeod beds removed; CC0 looping playlists with crossfades. No felt / board-pass edits. `?v=40`.

**2026-09-14 (build 39):** Board review on PR #12, rebased onto Club 38. Round pewter patron coin + short gothic peak (~10% of diameter). Portrait tavern-to-hand gap packed. No in-match landscape banner. Club/economy/encyclopedia stay on main. `?v=39`.

**2026-09-14 (build 38):** Crown Crate loot follows the crate on the calendar (Iron / Orichalcum / Ebony / Voidsteel), not a hardcoded Iron/Fine roll. Still max 2 crates/month. No felt/table CSS. `?v=38`.

**2026-09-14 (build 37):** Encyclopedia All-cards scroll opens each deck with the **patron portrait/token + name**, then that patron’s cards. Locked patrons stay grey/`???`. Mora and Treasury always appear. Collection Patrons + Card Clues match. No felt/table CSS. `?v=37`.

**2026-09-14 (build 35):** Full Club overhaul on the build 33 overlay board. High Isle splash + dedicated Store. Ranked is PvP-only. Daily stingy shop. Win Continue → purse. Login greet + 2 Crown Crates/month. Encyclopedia All-cards scroll uses simple patron dividers — **Hermaeus Mora and Treasury always appear**. No felt/table CSS. `?v=35`. Board-only pass on this PR: no tavern discard; pewter medallions; dual-orientation felt. Club files stay on main.

**2026-09-14 (build 34):** Club economy on top of the build 33 full-bleed overlay board. Shop / collection / challenges only — no felt or table-pack edits. `?v=34`.

**2026-09-14 (build 33):** Spec lock on the full-bleed table — pointed silver medallions (Neutral tip left / you down / opp up; Treasury + Mora never tip), cream prestige hex, overlay chrome. Do not drop [`FEATURE_INVENTORY.md`](FEATURE_INVENTORY.md).

**2026-09-14 (build 32):** Full-bleed felt rescue. Patron rail, piles, and played-effects are overlays — they no longer steal tavern width. Portrait + landscape tavern band ≥ 72% of the viewport. Layout is CSS/DOM only — do not drop anything in [`FEATURE_INVENTORY.md`](FEATURE_INVENTORY.md).

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

## Phase B — Club / meta (build 38)

- [x] High Isle splash; dedicated Store button; Settings has About/credits only (no store)
- [x] Ranked is its own PvP lobby — never vs AI, no difficulty slider
- [x] Daily sparse shop: ~4 skins, ~4 backs, 1 fragment (the fragment is the prize), rare expensive clues
- [x] No mashable Open Cutpurse / Buy Purse shop buttons
- [x] Match Continue → animated purse (win loot / loss empty). Modest gold 5/1 · 8/2
- [x] Login greet stamps the calendar; max 2 Crown Crates per month; loot follows the shown crate (Iron / Orichalcum / Ebony / Voidsteel)
- [x] Collection three tabs: Patrons/Decks (Mora included) · Card Clues · Upgrades (fragments, backs, tables)
- [x] Encyclopedia All-cards scroll: patron portrait/token + name at the start of each deck, then that patron’s cards. Locked = grey/`???`. Mora + Treasury always listed. Starters first within a group. No per-patron pages.
- [x] ToT gold coin art on Club chrome (not match tokens)
- [x] Weekly / seasonal / achievements / provinces / rematch / Friend lobby kept. No IAP.

Live **table** felt, patron rail, resource triad, hourglass, targeting: not in this PR.

**Unofficial fan project.** Not affiliated with Bethesda / ZeniMax / ESO. Not for sale.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens).
- **13 patrons** (Treasury + 12) — Hermaeus Mora included.
- Art lives in `web/assets/` and is bundled into iOS via `ios/TalesOfTribute/TalesOfTribute/Resources/assets` → `web/assets`.

## Web (GitHub Pages — play this)

`docs/` is a copy of `web/`. Cache-bust `?v=40`. Dual-orientation board from build 39 sits under Club chrome 40.

| Fix | Notes |
|---|---|
| Field | Felt is 100% of `#match`. Patrons / piles / effects overlay it. Tavern band ≥ 72% viewport. |
| Hourglass | Mid-high on the right, with silver/bronze patron-call busts. |
| Tokens | Silver medallions. Point left / down / up for favor. Mora + Treasury stay still. Prestige is a cream hex. |
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

## Locked inventory

See [`FEATURE_INVENTORY.md`](FEATURE_INVENTORY.md). Board layout work is CSS/DOM only. Do not delete targeting, inspect, SFX, patron-uses, combo rail, Club/shop/daily/encyclopedia, or iOS/Expo paths.

## Tests

- Linux: `node scripts/test_ios_engine.mjs` and `node scripts/test_phase_a.mjs`.
- Gestures (Chrome): `cd web/test && node play-gestures.mjs`.
- Mac: `cd ios/TributeCore && swift test`.

## How to run

**Web:** `cd web && python3 -m http.server 8080`

**iOS:** Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj` in Xcode 15+, run on iOS 17+.
