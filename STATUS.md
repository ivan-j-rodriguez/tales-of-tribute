# Status

Playable fan table rebuilt to feel like the real ESO Tales of Tribute board. Web preview is the priority client. `docs/` mirrors `web/` for GitHub Pages.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens).
- **13 patrons** (Treasury + 12) — **Hermaeus Mora included** and always visible on the pick grid.
- **164/164** cards have matching slug art in `web/assets/cards/<id>.png`.
- **13/13** patron portraits in `web/assets/patrons/` (incl. `mora.png`).

## Board authenticity (2026-09-13 rebuild)

Match layout now mirrors ESO ToT, not a generic card site:

- **Right rail (always vertical):** 4 match patron **coins** (portrait rings) + Treasury coin + hourglass. Portrait: narrow scrollable rail so patrons stay readable (Mora never clipped into a tiny row).
- **Opponent strip (top):** face-down hand count, draw, cooldown, agents + live HUD.
- **Center:** 5-card Tavern + tavern discard pile.
- **You (bottom):** agents, played-this-turn, hand, draw/played/cooldown piles + HUD + End Turn.
- **Resource HUD:** Coin (septim disc) / Prestige (crown) / Power (fist-gem) with tick animation on change.
- **Pile modals:** tap Draw / Cooldown / Played / Hand / Tavern discard to list cards.
- **Fly animations:** play → played zone; buy → your cooldown (WAAPI).
- **Hourglass:** 90s per turn for Ranked / timed casual; OFF by default for vs AI. Toggle on splash, pick, and in-match. Gold sand drains; auto end turn at 0.
- **Look:** Cinzel + Crimson Pro, stained wood textures, gold filigree frames, coin rims, candle bloom, ESO-style hint tooltip. Table skins via CSS on `#match`.

## Modes (splash)

- **Play vs AI** — casual, hourglass off by default
- **Ranked** — stronger pace, 90s timer, tiers Unranked → Orichalcum → Ebony → Quicksilver → Voidsteel → Rubedite; streak raises cutpurse rarity
- **Play a Friend** — hotseat + PeerJS remote (unchanged contract)
- **Club** — collection, store, cutpurses, achievements, daily
- **Encyclopedia** — all cards including Mora

## Patron pick UX

- Tap to select, tap again to **deselect** (no Back required)
- Clear **You 2 / Rival 2** meters with coin slots
- After your pair: pick rival’s pair **or** “AI takes the rest” / Random
- Portrait: large patron tiles in a **scrollable** 2-col grid (all 12 + readable art)
- Landscape: denser grid still showing coin art

## Progression / store (no IAP)

`localStorage tot_profile_v1`:

- gold (start **80**), unlockedDecks (pelin, crows, hlaalu, celarus), ownedUpgrades
- tableSkin, cardBack, unlockedSkins, unlockedBacks
- ranked `{ tier, points, placementLeft, winStreak }`
- purses (queued cutpurses): Common → Legendary from streak
- Loot: gold, upgrades, deck fragments (5 unlocks a deck **including Mora**), table skins, card backs
- Store spends gold only — fragments (35g), upgrades (55g), skins, backs; everything earnable

### Table skins

High Isle Oak (free), Clockwork, Coldharbour/Daedra, Apocrypha, Orsinium Anvil, Vestige Hall.

### Card backs

Default Roister + Clockwork / Daedra / Apocrypha / Vestige.

## Audio

Procedural Web Audio tavern bed (`js/music.js`): low drone, soft lute-like plucks, fireplace crackle. **Not** ESO OST. Starts muted; obvious ♪ Music toggle (respects browser autoplay).

## Engine

Existing `GameEngine` kept. `newMatch({ ownedUpgrades })` + `tavernQty` so unupgraded cards are default until owned. Mora cards enter the tavern when Mora is a match patron.

## Files touched this ship

- `web/index.html` — authentic board DOM, ranked/store/hourglass/music shells
- `web/css/style.css` — full restyle + skins + rail + responsive
- `web/js/app.js` — board render, deselect pick, fly anims, timer, ranked, store wiring
- `web/js/profile.js` — ranked, purses, skins, backs, store purchases (gold start 80)
- `web/js/music.js` — new procedural bed
- `docs/` — `cp -a web/. docs/` for Pages

## Incomplete / simplified (unchanged engine limits)

- Player targeting for Toss / Destroy / Donate / Confine / Acquire / Replace still auto-resolved
- Alessia agent HP defaults; some patron abilities simplified (see prior notes)
- Ranked opponent is still heuristic AI (no human ladder yet)
- iOS SwiftUI skeleton not updated in this pass

## How to run

`cd /workspace/tots/web && python3 -m http.server 8080`

Pages: `docs/` (do not git push from this agent — parent pushes).

## Smoke verified

- All 12 patrons on pick grid including **Mora**
- Select + deselect by tap; AI takes the rest; Begin Match
- Match rail shows 4 patrons + Treasury; Coin/Prestige/Power HUD present
- Hourglass toggle works; landscape keeps vertical rail
- Store: buy Clockwork skin with gold
