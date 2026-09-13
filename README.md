# Tales of Tribute — Fan Table

**Unofficial fan project.** Not affiliated with Bethesda Softworks, ZeniMax Online Studios, or The Elder Scrolls Online. Not for sale. No assets are redistributed for commercial use.

A playable two-player Tales of Tribute table: **web preview** (play today in a browser) and a **SwiftUI iOS 17+ skeleton** that shares the same JSON rules data.

## Play the web preview

```bash
cd web
python3 -m http.server 8080
```

Open http://localhost:8080

- **Sit at the Table** → pick two patrons (or “AI takes the rest”) → play vs a heuristic AI.
- **Encyclopedia** → every card with UESP art, filter by patron.
- Works at iPhone portrait (390×844), landscape (844×390), and desktop.

Do **not** open `index.html` as a `file://` URL — fetch of `data/*.json` needs a local server.

## Open the iOS project

On a Mac with Xcode 15+:

1. Open `ios/TalesOfTribute/TalesOfTribute.xcodeproj`
2. Run on an iPhone simulator (iOS 17+).
3. Shared card/patron JSON is in `TalesOfTribute/Resources/`. See `ios/TalesOfTribute/README.md`.

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
data/     JSON + rules
web/      static SPA (index.html, css/, js/, assets/, data/)
ios/      SwiftUI project
scripts/  data + art generators
```
