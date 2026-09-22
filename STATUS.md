# Status

**2026-09-22 (build 58):** Board/felt finish-line on main 57. Landscape top-seat hand and agents are full cards. Hold opens the dossier on tavern, hand, agents, and targeting trays and never also plays or picks. Landscape patron inspect keeps every favor row on screen. Hotseat `localSeat` stays the build 56 null-safe seat. Portrait packing from 51 stays. `?v=58`.

**2026-09-22 (build 57):** Friend remote rooms use an explicit PeerJS cloud broker (`0.peerjs.com:443`, secure) plus public STUN (Google and Twilio) and the PeerJS TURN relays. Guest join waits 30s and says when the code has no host versus when the attempt timed out. A taken room id is retried once with a new code. Hotseat `localSeat` null-safe fix from 56 stays. Board CSS untouched (`board-pass`, `phone-eso`, `table-pack` not edited). `?v=57`.

**2026-09-22 (build 56):** Hotseat Pass & Play patron pick no longer throws when `localSeat` reads `engine.state` before `newMatch`. Hotseat seat falls back to 0 until the match exists. Friend remote host still waits on the lobby until a guest joins. Board CSS untouched (`board-pass`, `phone-eso`, `table-pack` not edited). `?v=56`.

**2026-09-22 (build 55):** Club-only finish. Daily shop stock is one period at a time (rarities and Coin prices, one fragment, sold-out buys, tomorrow is the next period — the Store is never called a slate). Buying or equipping a table skin or card back sets the live match felt and deck backs (Settings selects, Store, Collection, season and crate grants). Collection upgrade subcategories filter. Tutorial steps stay on screen, skip after the first step, and replay from Settings. A claimed login day shows a wax STAMP in the calendar, including right after you claim it. Purse currency in Club copy is Coin. Host Remote Room stays on the Friend lobby with a copyable room code until a guest joins, then opens patron pick. Board/felt layout untouched (`board-pass`, `phone-eso`, `table-pack` not edited). `?v=55`.

**2026-09-15 (build 54):** Club/inspect copy, rebased on board **53**. Long-press card and patron dossiers use exact in-game UESP template sentences (Donate / Toss / Knock Out / Refresh / Destroy / Acquire / Confine / Reprieve — not “2 Coin”, “Donate 1”, or “Acquire 5” stubs). `web/data/cards.uesp.json` ships so overlay runs. Inspect sheet is leaner (no Tribute Card/Patron kicker; title wraps; body splits full sentences). Board/felt landscape packing from 53 untouched (`board-pass`, `phone-eso`, `table-pack` not edited). `?v=54`.

**2026-09-15 (build 53):** Board/felt **landscape only** finish-line. SFX / settings / Leave move off the upper-left (under opp DRAW) into a **horizontal** cluster between you-DRAW and the centered hand, toward the bottom. You-hand hexes zoom in from the build 52 30px pass — still fully on-canvas with felt air under the tips (gold glow intact). Hold-inspect dossier chrome/layout cleaned; card/patron copy prints the full `applyOfficialCardText` / `applyOfficialPatronText` strings (no stub fragments). Portrait packing from build 51 is locked (strip / piles / hand unchanged). Left gutters, DECK beside tavern, Treasury 1:1 circle, card backs, hold-inspect in target trays, and layout-fb overlap gates stay. Club hub / store / collection / economy / music / auth / voice / club-chrome untouched. `?v=53`.

**2026-09-15 (build 52):** Board/felt **landscape only**. Stronger zoom-out so 844×390 review shots read unclipped: left DRAW / DECK / DRAW share a clear felt gutter (not flush, including the top DRAW stack+label); tavern hex top/bottom tips sit inside the band; you-hand hex bottom tips sit well above the felt edge (~33px air, glow intact). DECK still left of the tavern at band mid. Right COOLDOWNs stay right. Portrait packing from build 51 is locked. Card backs, Treasury 1:1 circle, gold glow, hold-inspect, and layout-fb overlap gates stay. Club hub / store / collection / economy / music / auth / voice / club-chrome untouched. `?v=52`.

**2026-09-14 (build 51):** Board/felt only — Ivan follow-up on 50. Patron column shifts a bit left; vertical gaps so the middle pendant reads as a full circle (centers stay colinear; pewter seated; Treasury/Mora tipless **1:1 circle**, not a horizontal oval). Tavern DECK sits to the left of the tavern cards at the tavern band’s vertical center — opp DRAW stays top-left, you DRAW bottom-left, COOLDOWNs right corners. Deck / draw / cooldown piles show `assets/ui/card-back.svg` again. Stray top-of-felt gold orbs stay gone; playable-card / End Turn / hand / combo gold glow is kept. Layout-fb overlap gates from board #15/#18/#19/#23/#24 stay green. Club hub / store / collection / economy / music / auth / voice / club-chrome untouched. `?v=51`.

**2026-09-14 (build 50):** Board/felt only — Ivan portrait mark-up. SFX / settings / Leave strip lifts further toward the top-left. Tavern DECK pile moves to the top-left under opp DRAW. End Turn / hourglass sits in the bottom-left corner above you-DRAW (portrait). Five patron pendant circle-centers share one vertical X. Middle tavern card top-center = vw/2 (hand-center from #24 kept). Four corner piles show DRAW / COOLDOWN graphics with the word aligned under each stack. Stray `#match .board::before/::after` gold orbs removed (playable-card glow kept). Layout-fb overlap gates from board #15/#18/#19/#23/#24 stay green. Club hub / store / collection / economy / music / auth / voice / club-chrome untouched. `?v=50`.

**2026-09-14 (build 49):** Board/felt only. Opening 5-card hand is centered on the true vertical midline — middle-card top centerX ≈ vw/2 (portrait + landscape). SFX / settings / Leave strip shifts up from the build 48 56% seat; End Turn stays under that strip (portrait). DRAW left / COOLDOWN right unchanged. Treasury pewter ring stays seated on the stretched right rail. Layout-fb overlap gates from board #15/#18/#19/#23 stay green. Club hub / store / collection / economy / music / auth / voice / club-chrome untouched. `?v=49`.

**2026-09-14 (build 48):** Board/felt portrait pack rebased onto Club 47 (PR #22 store overflow). DRAW piles flush left; COOLDOWN piles flush right. SFX / settings / Leave become a mid-left vertical strip; End Turn / hourglass moves to bottom-left under that strip (portrait). Right rail rebalances patron-use octagons; patrons stay on the right. Landscape is a dual layout: piles to the edges, compact left chrome, End Turn stays on the right rail. Layout-fb overlap gates from board #15/#18/#19 stay green. Club hub / store / collection / economy from main 47. `?v=48`.

**2026-09-14 (build 47):** Club Store horizontal overflow. Featured hero `::after` glow leaked past `.bundle-card` because `#store .bundle-card` was `overflow: visible`; `#store.scrollWidth` was ~54px wider than the viewport on a 390px phone. Cards clip the glow again; store grids wrap. Board CSS untouched. `?v=47`.

**2026-09-14 (build 46):** Club voice Mic gate follow-up. Match Mic is hidden unless Friend/Ranked remote (`canUseVoice`) and voice is wanted or live. Hotseat / AI / tutorial / gauntlet / random AI clear leftover Friend `wanted`. Dead unused `voicePref()` removed. Board CSS untouched. `?v=46`.

**2026-09-14 (build 45):** Target-modal hold-inspect rebased onto Club 44. Tavern replace/remove, sacrifice, destroy, KO, confine, toss, donate, refresh, and Treasury trays use the same in-match dossier. Hold (~1s) reads; short tap picks; Confirm still required except board acquire auto-confirm. Dossier sits above the target sheet and never confirms on hold-release. Light felt polish: restore landscape `.felt-tavern` selector; keep portrait empty seats thin. Club product files from main 44. `?v=45`.

**2026-09-14 (build 44):** Club/product pass. Shop is an item store (Daily stock / today’s shop — never “slate”). Lean Club/splash/store/collection copy. Unofficial / fan-made / not Bethesda / not for sale only on Sign in and Settings → About. Email sign-up/in (device vault now; Firebase Auth + Firestore when `web/js/firebase-config.js` is filled). Google / Apple / Phone buttons exist and stay gated until those providers are configured — they do not pretend to work. Guest local play unchanged. Optional 1:1 voice on Friend/Ranked remote rooms via PeerJS media (WebRTC), off by default, mic only on enable. Tutorial match with a skippable guided walkthrough; replay from Settings. Board/felt/patron/targeting CSS untouched. `?v=44`.

**Remaining infra (honest):** Drop a real Firebase web config into `web/js/firebase-config.js` (see `firebase-config.example.js` + `firebase/firestore.rules.example`), enable Email, then Google / Phone / Apple in the console, and add the GitHub Pages host to Auth authorized domains. Apple also needs an Apple Service ID. Voice for Friend/Ranked uses the existing PeerJS room; a TURN server would help symmetric NATs. No extra voice backend is faked.

**2026-09-14 (build 43):** Board/felt seating + pack rebased onto Club 42 (PR #17). Pewter bezels centered on the portrait coin (~10% gothic peak; Treasury + Mora tipless). Portrait packs toward the tavern. Gold patron-use octagons sit on the hourglass / End Turn rail. Landscape tavern cards stay large and centered with chrome in the gutters. Club hub spacing / store intro / `club-chrome.css` from main 42. `?v=43`.

**2026-09-14 (build 42):** Club hub section heads no longer sit on card titles or weekly meta (PROVINCES ROAD / FAN TOURNAMENT / WEEKLY CHALLENGES). Club Store intro is one inviting line; Unofficial / No IAP lives on the store footer and Settings. No felt / board-pass / table-pack / phone-eso match edits. `?v=42`.

**2026-09-14 (build 41):** Board/felt spacing pass rebased onto Club 40 (PR #16). Chrome uses the full felt width. Tavern cards clear DRAW/DECK. Portrait turn banner, resource HUD, End Turn, played-effects, and Leave no longer overlap. Hold-inspect is a dark dossier modal. Patron tokens unchanged (round pewter + ~10% gothic peak). Club High Isle chrome / store / collection / CC0 beds stay from main. `?v=41`.

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

`docs/` is a copy of `web/`. Cache-bust `?v=58`. Board finish-line is build 58 (portrait lock from 51). Friend rooms use explicit PeerJS cloud + STUN (build 57). Hotseat patron pick is null-safe (build 56). Club shop, cosmetics, tutorial, and daily stamp are build 55. Long-press inspect stays on the build 54 UESP sentences.

| Fix | Notes |
|---|---|
| Field | Felt is 100% of `#match`. Patrons / piles / effects overlay it. Tavern band ≥ 72% viewport. |
| Hourglass | Portrait: bottom-left corner above you-DRAW. Landscape: still on the right rail with patron-use octagons. |
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

- Linux: `node scripts/test_ios_engine.mjs`, `node scripts/test_phase_a.mjs`, and `node scripts/test_club_product.mjs`.
- Gestures (Chrome): `cd web/test && node play-gestures.mjs`.
- Mac: `cd ios/TributeCore && swift test`.

## How to run

**Web:** `cd web && python3 -m http.server 8080`

**iOS:** Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj` in Xcode 15+, run on iOS 17+.
