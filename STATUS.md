# Status

Playable fan table. Web preview is the priority client.

## Counts

- **164 cards** in `data/cards.json` (12 patron decks + Treasury + tokens: Writ of Coin, Bewilderment, Chimera, Sacking, Wisp totems, Alessia-created agents).
- **13 patrons** (Treasury + 12).
- **164/164** cards have matching slug art in `web/assets/cards/<id>.png`.
- **13/13** patron portraits in `web/assets/patrons/`.
- Extra UESP variants (crops, deck-prefixed names) also sit in the cards folder (~296 pngs total); the UI uses the slug names.

## What you can play

Full vs-AI match: pick 2 patrons, AI gets 2, shared tavern of 5, Treasury always present. Draw 5, play/buy/call patron/knock out agents, end turn. Combo 2/3/4. 40 last-chance / 80 instant / favor-all-four win. Taunt blocks prestige conversion. Contract actions exile; contract agents exile on defeat.

Headless AI-vs-AI matches complete (prestige races, last-chance, 80-cap).

## AI

Heuristic, not random:

- Plays curses first; prefers combo suits, agents, knockout, prestige.
- Buys higher-cost / on-suit / agent cards; cheap economy early.
- Calls Treasury early; Crows when rich in coin; flips Hunding; hunts 4-patron wins.
- Knocks taunts before converting power; plays around the 40 prestige clock.

## Implemented keywords

Coin, Power, Prestige, Draw, Discard, Donate, Toss, Destroy, Replace, Acquire, Patron extra, Knock Out / Knock Out All, Heal, Sacking, Hand Refresh, Draw Refresh, Setback (coin/power/draw next turn), Confine, Create (Writ, Bewilderment, Sacking, Wisp totems, Chimera, Alessia agents), Druid King while-in-play passives (coin/power/prestige on cooldown / agent play), Morihaus coin-per-knock, Hunding / Alessia choose (AI picks best; player uses first option).

## Incomplete / simplified

- **Player targeting UI** is auto-resolved for Toss / Destroy / Donate / Confine / Acquire / Replace / Alessia-Hunding choices (AI-style heuristics). You are not prompted to pick *which* card to toss or confine.
- **Alessia agent HP** is not printed on the Spicy table for several cards; default **2 HP** (1 would also be reasonable).
- **Philanthropy “1 Power/Discard”** is stored as a while-in-play passive; it is not a standing global if the card is not an agent.
- **Druid King “1 Coin/Cooldown”** passives apply while those agents are on the board (as intended). Instant cards with `/Cooldown` grant on play only if they are agents.
- **Almalexia patron “look at top N”** is simplified: move the most valuable of the revealed cards to opponent cooldown.
- **Mora patron share** auto-picks the strongest tavern action.
- **iOS** is a working SwiftUI skeleton with a mirrored engine; card *art* on device needs the web assets copied into the app bundle. Web is the complete art experience.
- No multiplayer, no ranked, no collection unlocks, no sound.

## How to run

`cd /workspace/tots/web && python3 -m http.server 8080`
