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
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

async function ready(page) {
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 20000 });
  await page.evaluate(() => window.__totTest.startQuick());
  await page.waitForFunction(() => window.__totTest.snapshot().hand > 0, { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 350));
}

async function shot(page, name) {
  const dest = `/opt/cursor/artifacts/${name}.png`;
  await page.screenshot({ path: dest, fullPage: false });
  console.log('wrote', dest);
}

const land = await browser.newPage();
await land.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(land);
await shot(land, 'table_landscape_packed');
await land.evaluate(() => window.__totTest.inspectById('toll-of-flesh'));
await new Promise((r) => setTimeout(r, 420));
const landFit = await land.evaluate(() => window.__totTest.inspectFit());
console.log('landscape inspect', JSON.stringify({
  hexOn: landFit.hexOn, textOn: landFit.textOn, nameOn: landFit.nameOn,
  tip: (landFit.tipText || '').slice(0, 220),
}));
await shot(land, 'inspect_toll_landscape');
await land.close();

const portPage = await browser.newPage();
await portPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ready(portPage);
await shot(portPage, 'table_portrait_packed');
await portPage.evaluate(() => window.__totTest.inspectById('toll-of-flesh'));
await new Promise((r) => setTimeout(r, 420));
const portFit = await portPage.evaluate(() => window.__totTest.inspectFit());
console.log('portrait inspect', JSON.stringify({
  hexOn: portFit.hexOn, textOn: portFit.textOn, nameOn: portFit.nameOn,
  tip: (portFit.tipText || '').slice(0, 220),
}));
await shot(portPage, 'inspect_toll_portrait');
await portPage.close();

await browser.close();
server.close();
