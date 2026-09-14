# Tales of Tribute — Fan Table

**Unofficial fan project.** Not affiliated with Bethesda Softworks, ZeniMax Online Studios, or The Elder Scrolls Online. Not for sale. No assets are redistributed for commercial use.

A playable two-player Tales of Tribute table:

- **iOS 17+ (priority)** — SwiftUI landscape client that matches the live ESO board (wooden pendants, hourglass, fanned hand).
- **Web preview** — static SPA (AI, daily gauntlet, shop, ranked, hotseat).

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

## Expo Go (iPhone, no Mac / no Xcode)

The SwiftUI app above still needs Xcode 15+. **Expo Go** wraps the same `web/` table in a full-screen WebView — no Safari URL bar, no “LANDSCAPE PLAYS BETTER” banner.

**Unofficial, not for sale, no IAP.**

### On the iPhone right now

1. Install **[Expo Go](https://apps.apple.com/app/expo-go/id982107779)**.
2. Open this public Snack (no Expo account required):

   **https://snack.expo.dev/7AYkuR0_NYXNHQWGuUj9E**

   Or scan `expo/assets/expo-go-qr.png`, or paste this into Expo Go:

   `exp://u.expo.dev/933fd9c0-1666-11e7-afca-d980795c5824?runtime-version=exposdk%3A54.0.0&channel-name=production&snack=7AYkuR0_NYXNHQWGuUj9E`

3. Tap **Open with Expo Go**.
4. Play. Portrait and landscape both work. The felt is edge-to-edge; the notch is padded. `?native=1` hides the landscape banner.

The Snack is SDK **54** (Snack’s current ceiling). The `expo/` folder in this repo is SDK **57** to match a current Expo Go install. If Expo Go refuses the Snack as too old, use the computer steps below — those start the SDK 57 project.

Saved Snack metadata: `expo/snack.json`. To mint a new anonymous Snack: `cd expo && npm install snack-sdk && npm run publish-snack`.

### If you have any computer (not only a Mac)

```bash
git clone https://github.com/ivan-j-rodriguez/tales-of-tribute.git
cd tales-of-tribute/expo
npm install
npx expo start --tunnel
```

Scan the QR with Expo Go. `--tunnel` works when the phone is not on the same Wi-Fi.

To load a **local** `web/` folder instead of GitHub Pages (same LAN):

```bash
cd tales-of-tribute/expo
./scripts/start-local-web.sh
```

Details: `expo/README.md`.

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
docs/              GitHub Pages copy of web/
expo/              Expo Go WebView shell (this table, full-screen)
ios/TributeCore    Swift rules package + XCTest
ios/TalesOfTribute SwiftUI app (Xcode 15+)
ios/preview        HTML board/map check (no Simulator)
scripts/           data + art generators + Linux engine spec
```
