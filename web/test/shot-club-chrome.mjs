import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.env.CLUB_SHOT_DIR || '/opt/cursor/artifacts';
fs.mkdirSync(outDir, { recursive: true });

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

async function pageAt(qs, { w = 390, h = 844 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:${port}/${qs}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__totTest, { timeout: 25000 });
  await new Promise((r) => setTimeout(r, 280));
  return page;
}

async function shot(page, name) {
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, fullPage: false });
  console.log('wrote', dest);
  return dest;
}

const splash = await pageAt('?test=1');
const stamp = await splash.$eval('#build-stamp', (el) => el.textContent);
console.log('stamp', stamp);
await shot(splash, 'club_splash.png');
await splash.close();

const store = await pageAt('?test=1&shop=14');
await store.evaluate(() => window.__totTest.openStore());
await new Promise((r) => setTimeout(r, 400));
const bundle = await store.evaluate(() => ({
  has: window.__totTest.shopHasBundle(),
  title: document.querySelector('#store-bundle h4')?.textContent || '',
  copy: document.querySelector('#store-bundle p')?.textContent || '',
}));
console.log('bundle', bundle);
if (!bundle.has) throw new Error('expected a hero bundle on shop=14');
if (/stingy/i.test(bundle.copy)) throw new Error('bundle copy still lectures the economy');
await shot(store, 'club_store_hero_bundle.png');
await store.close();

const coll = await pageAt('?test=1');
await coll.evaluate(() => window.__totTest.openDeckSheet('mora'));
await new Promise((r) => setTimeout(r, 350));
const sheet = await coll.evaluate(() => ({
  open: !!document.querySelector('#club-sheet.show'),
  title: document.querySelector('#club-sheet-title')?.textContent || '',
  how: document.querySelector('#club-sheet .sheet-how')?.textContent || '',
}));
console.log('sheet', sheet);
if (!sheet.open || !/unlock/i.test(sheet.how)) throw new Error('collection sheet missing unlock copy');
await shot(coll, 'club_collection_detail_sheet.png');
await coll.close();

const modal = await pageAt('?test=1');
await modal.evaluate(() => {
  window.__totTest.openCollection();
  window.__totTest.openCardModal('the-portcullis');
});
await new Promise((r) => setTimeout(r, 400));
const clip = await modal.evaluate(() => {
  const body = document.querySelector('#card-modal .modal-body')?.getBoundingClientRect();
  const art = document.querySelector('#card-modal .club-card-art img')?.getBoundingClientRect();
  const name = document.querySelector('#card-modal .eso-tip-name')?.getBoundingClientRect();
  const text = document.querySelector('#card-modal .eso-tip-name')?.textContent || '';
  const inside = (r) => r && body && r.top >= body.top - 1 && r.bottom <= body.bottom + 1 && r.left >= body.left - 1 && r.right <= body.right + 1;
  return {
    text,
    nameH: name?.height || 0,
    artH: art?.height || 0,
    artInside: inside(art),
    nameInside: inside(name),
    nameVisible: !!(name && name.height > 8 && name.bottom <= (window.innerHeight - 4)),
  };
});
console.log('modal', clip);
if (!/PORTCULLIS/i.test(clip.text)) throw new Error('card modal missing Portcullis title');
if (!clip.artInside || !clip.nameInside || !clip.nameVisible) throw new Error('card art or title clipped');
await shot(modal, 'club_card_modal_portcullis.png');
await modal.close();

await browser.close();
server.close();
console.log('club chrome shots ok');
