# Tales of Tribute — Fan Table

**Unofficial fan project.** Not affiliated with Bethesda Softworks, ZeniMax Online Studios, or The Elder Scrolls Online. Not for sale. No assets are redistributed for commercial use.

A playable two-player Tales of Tribute table:

- **iOS 17+ (priority)** — SwiftUI landscape client that matches the live ESO board (wooden pendants, hourglass, fanned hand).
- **Web preview** — static SPA (AI, daily gauntlet, shop, ranked, hotseat, Club accounts).

## iOS (Xcode 15+, Mac)

1. Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj`
2. Run on an iPhone / iPad simulator (iOS 17+). Orientation is **landscape only**.
3. Local package `ios/TributeCore` holds the rules engine, AI 1–10, club profile, and daily road.
4. Details and stubs: `ios/TalesOfTribute/README.md`

This repo’s Linux CI / Cloud Agent environment **cannot** run the Simulator. Engine checks that *can* run here:

```bash
node scripts/test_ios_engine.mjs
```

On a Mac: `cd ios/TributeCore && swift test`

## Web preview

```bash
cd web
python3 -m http.server 8080
```

Open http://localhost:8080 — do **not** open `index.html` as `file://`.

## Data

| File | What |
|---|---|
| `data/cards.json` | Every official card from the Spicy Economics table + Writ of Coin, Bewilderment, The Chimera |
| `data/patrons.json` | 12 patrons + Treasury, abilities by favor state |
| `data/decks.json` | Starter + card ids per patron |
| `data/rules.md` | Implemented rules summary |
| `data/sources.md` | Source links |

Matches use **upgraded quantities**. Base versions remain in `cards.json` (`upgraded` / `baseQty` / `upgradedQty`).

## Art

Card and patron portraits are from **UESP** (`ON-tribute-*` files) via the MediaWiki `allimages` API and `images.uesp.net`. Downloaded into `web/assets/cards/` and `web/assets/patrons/`.

## Rules sources

- Card list + effects + patron blurbs: https://spicyeconomics.com/tribute/
- Lore / file names: https://en.uesp.net/

## Layout

```
data/              JSON + rules
web/               static SPA
ios/TributeCore    Swift rules package + XCTest
ios/TalesOfTribute SwiftUI app
ios/preview        HTML board/map check (no Simulator)
scripts/           data + art generators + Linux engine spec
```
