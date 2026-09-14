/**
 * Build 44 — target-modal hold-inspect close-ups + optional felt afters.
 * Portrait 390×844 / landscape 844×390.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = process.env.SHOT_DIR || '/opt/cursor/artifacts';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let file = path.join(root, url === '/' ? 'index.html' : url);
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('no'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const { server, port } = await serve();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
fs.mkdirSync(ART, { recursive: true });

async function ready(page) {
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
  await page.evaluate(() => window.__totTest.startQuick());
  await page.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 280));
}

async function holdTray(page) {
  const opened = await page.evaluate(() => window.__totTest.startTargetStep({ kind: 'replace', n: 1 }));
  if (!opened?.ok) throw new Error('replace tray did not open ' + JSON.stringify(opened));
  await page.evaluate(async () => {
    const el = document.querySelector('#target-tray .card') || document.querySelector('#target-tray .tray-card');
    if (!el) throw new Error('no tray card');
    el.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 11, pointerType: 'touch', isPrimary: true, clientX: 16, clientY: 16,
    }));
    await new Promise(r => setTimeout(r, 1250));
  });
  await new Promise(r => setTimeout(r, 380));
}

async function shot(name, { w, h }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ready(page);
  await holdTray(page);
  const dest = path.join(ART, `${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  const fit = await page.evaluate(() => {
    const snap = window.__totTest.snapshot();
    const lift = document.querySelector('.lift-fly.lift-dossier-modal');
    const banner = document.querySelector('#target-banner');
    return {
      dossierOpen: snap.dossierOpen,
      dossierName: snap.dossierName,
      picked: snap.targetPicked,
      targeting: snap.targeting,
      prompt: snap.targetPrompt,
      liftZ: lift ? getComputedStyle(lift).zIndex : null,
      overlayZ: banner ? getComputedStyle(banner).zIndex : null,
    };
  });
  console.log(name, JSON.stringify(fit));
  if (!fit.dossierOpen) {
    console.error('FAIL', name, 'dossier not open');
    process.exitCode = 1;
  }
  if ((fit.picked || []).length !== 0) {
    console.error('FAIL', name, 'hold picked a card', fit.picked);
    process.exitCode = 1;
  }
  await page.close();
}

async function feltAfter(name, { w, h }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ready(page);
  await page.screenshot({ path: path.join(ART, `${name}.png`), fullPage: false });
  await page.close();
}

await shot('target-inspect-portrait', { w: 390, h: 844 });
await shot('target-inspect-landscape', { w: 844, h: 390 });
await feltAfter('after-portrait-390x844', { w: 390, h: 844 });
await feltAfter('after-landscape-844x390', { w: 844, h: 390 });

await browser.close();
server.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('TARGET INSPECT SHOTS OK');
