import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
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
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

async function open(query) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${port}/${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
  await page.evaluate(() => window.__totTest.startQuick());
  await page.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 250));
  const info = await page.evaluate(() => ({
    native: window.__totTest.isNative(),
    tip: window.__totTest.portraitTip(),
    tipDisplay: getComputedStyle(document.getElementById('landscape-tip')).display,
    bodyNative: document.body.classList.contains('is-native'),
    fill: window.__totTest.boardFill(),
  }));
  return { page, info };
}

const fails = [];
function assert(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else {
    console.error('FAIL', name, extra || '');
    fails.push(name);
  }
}

const browserPort = await open('?test=1');
assert('browser portrait shows tip', browserPort.info.tip === true && browserPort.info.native === false, browserPort.info);
assert('browser tip is visible', browserPort.info.tipDisplay !== 'none', browserPort.info);
await browserPort.page.screenshot({ path: '/tmp/native-shell-browser-portrait.png' });
await browserPort.page.close();

const nativePort = await open('?test=1&native=1');
assert('native flag is on', nativePort.info.native === true && nativePort.info.bodyNative === true, nativePort.info);
assert('native hides tip', nativePort.info.tip === false, nativePort.info);
assert('native tip display none', nativePort.info.tipDisplay === 'none', nativePort.info);
assert('native board still fills', (nativePort.info.fill?.bh || 0) > 400, nativePort.info.fill);
await nativePort.page.screenshot({ path: '/tmp/native-shell-expo-portrait.png' });
await nativePort.page.close();

const nativeLand = await browser.newPage();
await nativeLand.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await nativeLand.goto(`http://127.0.0.1:${port}/?test=1&native=1`, { waitUntil: 'domcontentloaded' });
await nativeLand.waitForFunction(() => window.__totTest, { timeout: 20000 });
await nativeLand.evaluate(() => window.__totTest.startQuick());
await nativeLand.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
const land = await nativeLand.evaluate(() => ({
  native: window.__totTest.isNative(),
  tip: window.__totTest.portraitTip(),
  fill: window.__totTest.boardFill(),
}));
assert('native landscape no tip', land.native === true && land.tip === false, land);
assert('native landscape full-bleed', (land.fill.bw || 0) >= (land.fill.mw || 999) * 0.96, land.fill);
await nativeLand.screenshot({ path: '/tmp/native-shell-expo-landscape.png' });
await nativeLand.close();

await browser.close();
server.close();
if (fails.length) {
  console.error('\n' + fails.length + ' failed:\n' + fails.join('\n'));
  process.exit(1);
}
console.log('\nNative-shell checks passed.');
