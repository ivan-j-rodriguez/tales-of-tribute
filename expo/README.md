# Tales of Tribute — Expo Go (fan)

**Unofficial fan client.** Not affiliated with Bethesda Softworks, ZeniMax Online Studios, or The Elder Scrolls Online. Not for sale. No in-app purchases.

This folder is a thin **Expo SDK** wrapper. It does **not** rewrite the rules engine. `react-native-webview` loads the existing `web/` SPA full-screen (no Safari / Grok URL bar).

The Xcode app at `ios/TalesOfTribute` is unchanged and still needs a Mac.

Card art is ~80MB, so Expo Go does **not** embed `web/assets`. The WebView opens the live GitHub Pages table with `?native=1` (hides the “Landscape plays better” banner). Injected JS hides that tip even before Pages picks up the flag.

## Open on iPhone now (no Mac, no Xcode)

1. Install **[Expo Go](https://apps.apple.com/app/expo-go/id982107779)** from the App Store.
2. Open the public Snack (no Expo login):

   **https://snack.expo.dev/7AYkuR0_NYXNHQWGuUj9E**

   Camera / Expo Go can also scan `assets/expo-go-qr.png`, or open:

   `exp://u.expo.dev/933fd9c0-1666-11e7-afca-d980795c5824?runtime-version=exposdk%3A54.0.0&channel-name=production&snack=7AYkuR0_NYXNHQWGuUj9E`

3. Tap **Open with Expo Go**.
4. Rotate freely — portrait and landscape are both enabled. Status bar is hidden; the felt still respects the notch.

The Snack uses Expo SDK **54** (Snack’s hosted max). This folder is SDK **57**. If Expo Go rejects the Snack, run `npx expo start --tunnel` below.

If the Snack page asks you to create an Expo account, skip it: **Scan QR** is enough.

## If the Snack will not open

On **any computer** (Windows, Linux, Chromebook, a friend’s laptop — not only a Mac):

```bash
git clone https://github.com/ivan-j-rodriguez/tales-of-tribute.git
cd tales-of-tribute/expo
npm install
npx expo start --tunnel
```

Scan the QR with the iPhone Camera app or Expo Go. `--tunnel` is required when the phone is not on the same LAN as the computer.

To point the WebView at a **local** copy of `web/` instead of GitHub Pages (same Wi-Fi):

```bash
chmod +x scripts/start-local-web.sh
./scripts/start-local-web.sh
```

That serves `web/` on port 8080 and sets `EXPO_PUBLIC_TABLE_URL`.

## Project

| File | Role |
|---|---|
| `App.js` | Full-bleed WebView, hidden status bar, safe-area CSS injection |
| `src/tableUrl.js` | GitHub Pages + `?native=1`, or `EXPO_PUBLIC_TABLE_URL` |
| `app.json` | Name **Tales of Tribute (fan)**, portrait + landscape, iPhone + iPad |
| `scripts/publish-snack.mjs` | Re-publish an anonymous Snack (`npm run publish-snack`) |

`orientation` is `default` (both directions). `ios.supportsTablet` is true.

## GitHub Pages

`https://ivan-j-rodriguez.github.io/tales-of-tribute/` stays the browser table. `?native=1` only changes in-page tips; it does not break the public site.
