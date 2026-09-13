# Tales of Tribute — iOS (SwiftUI)

**Unofficial fan client.** Not affiliated with Bethesda Softworks, ZeniMax Online Studios, or The Elder Scrolls Online. Not for sale.

iOS 17+, **landscape only**. The board follows the live ESO table (vertical wooden patron pendants with the point facing the felt, hourglass to the right of that column, fanned hand) rather than the web preview’s coin-cluster rail.

## Open in Xcode

On a Mac with Xcode 15+:

1. Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj`
2. The app target depends on the local Swift package `ios/TributeCore` (rules + club + AI).
3. Pick an iPhone or iPad simulator and Run. The project locks to landscape.
4. Card / patron art is bundled from `TalesOfTribute/Resources/assets` (symlink to `web/assets`). JSON is the same schema as `/data`.

## What the app includes

| Screen | Behavior |
|---|---|
| Main menu | Fan-made disclaimer, Play vs AI, daily road, shop, collection, difficulty 1–10 |
| Patron pick | Pendant tiles; starters unlocked; others greyed with fragment / unlock hints |
| Match | Full turn loop vs scaled AI: play, tavern buy, agents, combos, patron call, prestige 40 + last chance, 80 instant, all-favor |
| Daily map | Parchment Tamriel (`tamriel-map.jpg`), pins on real zones, NY-date seeded path (High Isle first), fail locks the rest of that NY day |
| Shop | Gold → table themes + card backs; equipped skin tints the felt |
| Collection | Encyclopedia of the 164-card JSON set |

## Architecture

```
ios/TributeCore/          Swift package (no SwiftUI)
  Sources/TributeCore/    engine, AI 1–10, catalog, upgrades, club/gauntlet
  Tests/                  XCTest — run on a Mac: cd ios/TributeCore && swift test
ios/TalesOfTribute/       SwiftUI app (landscape)
ios/preview/              HTML layout check (Linux / browser) of the ESO board + map
```

`TributeEngine` is a port of `web/js/engine.js` with official-loop corrections documented in `/STATUS.md` (shared 10-card starters, second-player Coin, draw-up-to-5, contracts play on buy, curse-first, patron sweep).

## Tests on Linux (this VM has no Swift / Simulator)

```bash
node scripts/test_ios_engine.mjs
```

That checks catalog counts, date-seeded gauntlet order, streak rarity, and a web-engine AI vs AI finish. Full XCTest for the Swift engine needs a Mac:

```bash
cd ios/TributeCore && swift test
```

## Stubs / not ported

- Ranked ladder, hotseat, and PeerJS remote play stay **web-only**.
- Hourglass is End Turn (no 90s ranked clock on iOS).
- Purse loot is simplified (gold + fragment chance) versus the web’s full cosmetic table.
- Choose-one card effects auto-pick for the human the same way the AI would (best heuristic); hold a card to read the printed options.
- Music / SFX are not wired on iOS.
