# Status

**2026-09-13 (tap + patron cluster):** Tap plays/buys (including iOS click-only). Hold (≥520ms) lifts to read and never also plays. Draw piles stay sealed. Patron coins sit in a tight right-side cluster — rival pair on their side, Treasury middle, your pair on your side — with Favored / Neutral / Unfavored on the coin. Patron tap = Continue/Cancel call; hold = full favor text. Music beds: Celtic Impulse / Heroic Age / Five Armies / Dark Fog (Kevin MacLeod CC BY 3.0). Settings SFX: card table vs dramatic.

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

- **Music beds (Kevin MacLeod, CC BY 3.0):** Celtic Impulse (tavern), Heroic Age (fight), Five Armies (boss/ranked), Dark Fog (danger). Toggle required.
- **Unused fallbacks kept:** Dowland CC0, Tourdion public domain. Never ESO OST.
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
