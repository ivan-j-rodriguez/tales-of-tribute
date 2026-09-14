import Constants from 'expo-constants';

/** Live GitHub Pages table (same SPA as `docs/`). */
export const GITHUB_PAGES_TABLE =
  'https://ivan-j-rodriguez.github.io/tales-of-tribute/';

function withNativeFlag(url) {
  const u = new URL(url);
  if (!u.searchParams.get('native')) u.searchParams.set('native', '1');
  return u.toString();
}

/**
 * Where the WebView loads the table.
 *
 * 1. `EXPO_PUBLIC_TABLE_URL` — LAN copy of `web/` (computer + same Wi-Fi)
 * 2. `expo.extra.tableUrl` in app.json
 * 3. GitHub Pages (default — works in Expo Go / Snack with no Mac)
 *
 * Card art is ~80MB, so this wrapper does not embed `web/assets`.
 */
export function tableUrl() {
  const extra =
    Constants.expoConfig?.extra?.tableUrl ||
    Constants.manifest?.extra?.tableUrl;
  const env = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_TABLE_URL : '';
  return withNativeFlag(env || extra || GITHUB_PAGES_TABLE);
}
