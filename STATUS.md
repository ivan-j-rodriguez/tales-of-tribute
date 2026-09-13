# Status

**2026-09-13 (quality-critical phone rebuild):** Tap plays/buys only (<350ms). Press-and-hold (≥500ms) lifts a floating card clone from the exact screen rect, scales toward the player to read, and animates back on release — no inspect-overlay dismiss-at-top. Tavern is a single non-wrapping row. Hands are fanned (yours playable at bottom; rival backs at top). Patron rail: rival coins top, Treasury middle, yours bottom. Patron taps open Continue/Cancel confirm (pick + in-match). Locked patrons show greyed art + "???". AI difficulty 1–10 smoky-dot slider (`profile.aiDifficulty`). Daily **Challenge the Provinces** Road of Tamriel gauntlet (10 stops, NY midnight reset). Music is real Dowland CC0 MP3 (Tourdion alt) — not the old oscillator bed. Distinct contract/agent VFX+SFX. Table skins use carved wood rim + felt play surface. Agent slots labeled **Agent**. Engine confirmed: contract actions exile; agents enter agent row; contract agents exile on KO; taunt blocks prestige.

Playable fan table rebuilt to feel like the real ESO Tales of Tribute board. Web preview is the priority client. `docs/` mirrors `web/` for GitHub Pages.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens).
- **13 patrons** (Treasury + 12) — **Hermaeus Mora included** and always visible on the pick grid.
- **164/164** cards have matching slug art in `web/assets/cards/<id>.png`.
- **13/13** patron portraits in `web/assets/patrons/` (incl. `mora.png`).

## Board authenticity

- **Right rail (vertical):** opponent’s two patron coins (top) · Treasury (middle) · your two (bottom) · hourglass.
- **Opponent strip:** fanned card-backs, draw/cooldown piles, agents + HUD.
- **Center:** single-row 5-card Tavern + discard.
- **You:** agents, played, fanned hand, piles + HUD + End Turn.
- **Tap vs hold:** short tap = play/buy; hold = lift-to-read (never also plays).
- **Patron confirm:** portrait + ability + green Continue / red Cancel.
- **Hourglass:** 90s for Ranked / timed casual; OFF by default for vs AI.
- **Look:** Cinzel + Crimson Pro, carved wood rim, gold inlay, felt center (skin-tinted), candle bloom.

## Modes (splash)

- **Play vs AI** — casual; difficulty slider 1–10
- **Challenge the Provinces** — daily Road of Tamriel gauntlet (America/New_York midnight reset)
- **Ranked** — stronger pace, 90s timer, tiers Unranked → Rubedite
- **Play a Friend** — hotseat + PeerJS remote
- **Club** — collection, store, cutpurses, achievements, daily wins
- **Encyclopedia** — all cards including Mora

## Audio

- **Music loop (default):** `web/assets/audio/dowland-complaints.mp3` — John Dowland “If my complaints could passions move” (CC0 via OpenGameArt / Of Far Different Nature). Modest volume (~0.28). Toggle required.
- **Alt / fallback:** `web/assets/audio/tourdion.mp3` — Tourdion (Quand je bois du vin clairet), Wikimedia Commons public domain.
- **Credits:** `web/assets/audio/CREDITS.txt`
- **SFX:** quiet synthesized one-shots (play, buy, contract/violet, agent/gold-slam, patron, coin, combo, win) — not the old music.js oscillator bed.

## Daily gauntlet

`profile.gauntlet` tracks `{ date, cleared, failed, failedStop }` keyed to `nyDateStr()` (America/New_York). Fail locks the day’s run until next NY midnight. Wins grant gold + purse; stops are scripted patron pairs difficulty 1→10.

## Engine

`GameEngine` confirmed: agents leave played into agent row; contract actions exile; contract agents exile on KO; taunt still blocks Power→Prestige.

## Files touched this ship

- `web/js/music.js` — Dowland file loop + SFX
- `web/js/ai.js` — difficulty 1–10 scaling + visible pacing
- `web/js/profile.js` — `aiDifficulty`, gauntlet helpers
- `web/js/app.js` — lift gestures, fans, rail, confirm, gauntlet, VFX
- `web/css/style.css` — felt table, tavern row, fans, diff dots, map
- `web/index.html` — gauntlet screen, lift layer, patron confirm, fans
- `web/assets/audio/*`, `web/assets/ui/tamriel-map.svg`
- `docs/` — `cp -a web/. docs/`

## How to run

`cd /workspace/tots/web && python3 -m http.server 8080`

Pages: `docs/` (do not git push from this agent — parent pushes).
