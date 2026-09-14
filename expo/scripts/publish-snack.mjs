#!/usr/bin/env node
/**
 * Publish an anonymous Expo Snack that Expo Go can open without a Mac.
 * Snack's hosted runtime currently tops out at SDK 54 (see snack-content).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Snack } = require('snack-sdk');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appJs = readFileSync(join(root, 'App.js'), 'utf8');
const tableUrl = readFileSync(join(root, 'src/tableUrl.js'), 'utf8');

const snack = new Snack({
  name: 'Tales of Tribute (fan)',
  description:
    'Unofficial fan table. Full-screen WebView of the GitHub Pages SPA. Not affiliated with Bethesda / ZeniMax / ESO. Not for sale.',
  sdkVersion: process.env.SNACK_SDK || '54.0.0',
  dependencies: {
    'react-native-webview': { version: '13.15.0' },
    'react-native-safe-area-context': { version: '5.6.1' },
    'expo-status-bar': { version: '*' },
    'expo-constants': { version: '*' },
  },
  files: {
    'App.js': { type: 'CODE', contents: appJs },
    'src/tableUrl.js': { type: 'CODE', contents: tableUrl },
    'app.json': {
      type: 'CODE',
      contents: JSON.stringify(
        {
          expo: {
            name: 'Tales of Tribute (fan)',
            slug: 'tales-of-tribute-fan',
            orientation: 'default',
            userInterfaceStyle: 'dark',
            ios: { supportsTablet: true },
          },
        },
        null,
        2,
      ),
    },
  },
});

await snack.getStateAsync();
const saved = await snack.saveAsync({ ignoreUser: true });
const state = snack.getState();
const record = {
  savedAt: new Date().toISOString(),
  sdkVersion: state.sdkVersion,
  id: saved.id,
  hashId: saved.hashId,
  snackId: saved.snackId,
  expUrl: saved.url,
  webUrl: saved.id ? `https://snack.expo.dev/${saved.id}` : null,
};
writeFileSync(join(root, 'snack.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
