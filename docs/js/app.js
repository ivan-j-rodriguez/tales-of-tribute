import { GameEngine } from './engine.js';
import { TributeAI } from './ai.js';
import { normalizeCatalog, nameSlug } from './normalize.js';

const $ = (s) => document.querySelector(s);

let DATA = { cards: [], patrons: [], decks: [] };
let cardsById = {};
let patronsById = {};
let engine = null;
let ai = null;
let pickYou = [];
let pickOpp = [];
let pickPhase = 'you'; // you | opp
let tutorialOn = true;
let tipStep = 0;

const TIPS = [
  { text: "Play cards from your hand. Coin buys from the tavern; leftover Power becomes Prestige — unless an enemy Taunt still stands." },
  { text: "The tavern shows five cards. Tap one you can afford to send it to your cooldown. You'll draw it later." },
  { text: "Call one Patron per turn. Neutral becomes yours; an enemy's favor returns to Neutral. Favor all four to win instantly." },
  { text: "End at 80 Prestige to win outright. Reach 40 and your opponent gets one last chance to surpass you." },
];

async function loadData() {
  const [c, p, d] = await Promise.all([
    fetch('data/cards.json').then(r => r.json()),
    fetch('data/patrons.json').then(r => r.json()),
    fetch('data/decks.json').then(r => r.json()),
  ]);
  const norm = normalizeCatalog(c, p, d);
  DATA.cards = norm.cards;
  DATA.patrons = norm.patrons;
  DATA.decks = norm.decks;
  cardsById = Object.fromEntries(DATA.cards.map(x => [x.id, x]));
  patronsById = Object.fromEntries(DATA.patrons.map(x => [x.id, x]));
}

function show(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $(id).classList.add('active');
}

function artFor(card) {
  const slug = card.slug || nameSlug(card.name) || card.id;
  return `assets/cards/${slug}.png`;
}
function patronArt(id) {
  return `assets/patrons/${id}.png`;
}

function renderCard(inst, opts = {}) {
  const d = cardsById[inst.id] || inst;
  const el = document.createElement('div');
  el.className = 'card' + (opts.extraClass ? ' ' + opts.extraClass : '');
  if (opts.affordable) el.classList.add('affordable');
  if (opts.playable) el.classList.add('playable');
  if (opts.deal) el.classList.add('deal-anim');
  el.dataset.uid = inst.uid || '';
  el.dataset.id = inst.id;
  const hp = inst.hp != null ? inst.hp : d.hp;
  el.innerHTML = `
    <img class="art" src="${artFor(d)}" alt="${d.name}" onerror="this.style.background='#2a1810'" />
    ${d.cost != null ? `<div class="cost-badge">${d.cost}</div>` : ''}
    ${hp != null ? `<div class="hp-badge">${hp}${d.taunt || inst.taunt ? ' T' : ''}</div>` : ''}
    ${(d.taunt || inst.taunt) ? `<div class="taunt-badge">TAUNT</div>` : ''}
    <div class="meta">
      <div class="cname">${d.name}</div>
      <div class="ceffect">${d.playText || ''}</div>
    </div>
  `;
  el.addEventListener('click', () => opts.onClick && opts.onClick(inst, el));
  return el;
}

/* ——— Deck pick ——— */
function renderDeckPick() {
  const grid = $('#patron-grid');
  grid.innerHTML = '';
  const playable = DATA.patrons.filter(p => p.id !== 'treasury');
  for (const p of playable) {
    const el = document.createElement('div');
    el.className = 'patron-card';
    if (pickYou.includes(p.id)) el.classList.add('selected');
    if (pickOpp.includes(p.id)) el.style.outline = '2px dashed #e53935';
    const ab = p.abilities?.neutral || p.abilities?.favored || {};
    el.innerHTML = `
      <img src="${patronArt(p.id)}" alt="${p.short}" />
      <div class="name">${p.short}</div>
      <div class="desc">${ab.desc || ''}</div>
    `;
    el.addEventListener('click', () => {
      if (pickYou.includes(p.id) || pickOpp.includes(p.id)) return;
      if (pickPhase === 'you') {
        if (pickYou.length >= 2) return;
        pickYou.push(p.id);
        if (pickYou.length === 2) pickPhase = 'opp';
      } else {
        if (pickOpp.length >= 2) return;
        pickOpp.push(p.id);
      }
      updatePickStatus();
      renderDeckPick();
    });
    grid.appendChild(el);
  }
  updatePickStatus();
}

function updatePickStatus() {
  const rest = DATA.patrons.filter(p => p.id !== 'treasury' && !pickYou.includes(p.id) && !pickOpp.includes(p.id));
  $('#pick-status').textContent = `You: ${pickYou.length}/2  ·  Opponent: ${pickOpp.length}/2`;
  $('#btn-start').disabled = !(pickYou.length === 2 && pickOpp.length === 2);
}

/* ——— Match render ——— */
function resHTML(pl, label) {
  return `<span style="opacity:.7;margin-right:.4rem">${label}</span>
    <span class="res"><span class="tok coin"></span> ${pl.coin}</span>
    <span class="res"><span class="tok power"></span> ${pl.power}</span>
    <span class="res"><span class="tok prestige"></span> ${pl.prestige}</span>
    <span class="res" title="hand/draw/cd"> ${pl.hand.length}/${pl.draw.length}/${pl.cooldown.length}</span>`;
}

function renderMatch() {
  if (!engine?.state) return;
  const s = engine.state;
  const you = s.players[0];
  const opp = s.players[1];
  $('#you-res').innerHTML = resHTML(you, 'You');
  $('#opp-res').innerHTML = resHTML(opp, 'Rival');
  const yourTurn = s.active === 0 && !s.winner;
  $('#turn-ind').textContent = s.winner != null
    ? (s.winner === 0 ? 'Victory' : 'Defeat')
    : (yourTurn ? 'Your turn' : 'Rival is thinking…');
  $('#turn-ind').classList.toggle('your-turn', yourTurn);

  const prow = $('#patrons-row');
  prow.innerHTML = '';
  for (const pid of [...s.matchPatrons, 'treasury']) {
    const pat = patronsById[pid];
    const f = s.favor[pid] || 0;
    const el = document.createElement('div');
    el.className = 'patron-token ' + (f === 1 ? 'fav-you' : f === -1 ? 'fav-opp' : 'neutral');
    if (yourTurn && engine.canCallPatron(pid)) el.classList.add('callable');
    el.innerHTML = `<img src="${patronArt(pid)}" alt="${pat.short}" /><div class="plabel">${pat.short}</div>`;
    el.title = (pat.abilities?.neutral?.desc) || pat.name;
    el.addEventListener('click', () => {
      if (s.active !== 0 || s.winner) return;
      if (engine.canCallPatron(pid)) {
        engine.callPatron(pid);
        renderMatch();
      }
    });
    prow.appendChild(el);
  }

  const tz = $('#tavern-zone');
  tz.innerHTML = '';
  s.tavern.forEach((c, i) => {
    const aff = yourTurn && engine.canBuy(i);
    tz.appendChild(renderCard(c, {
      affordable: aff,
      onClick: () => {
        if (s.active !== 0 || s.winner) return;
        if (engine.canBuy(i)) { engine.buy(i); renderMatch(); }
        else showCardModal(cardsById[c.id]);
      }
    }));
  });

  const oa = $('#opp-agents');
  oa.innerHTML = '';
  opp.agents.forEach(a => {
    oa.appendChild(renderCard(a, {
      extraClass: 'agent-board',
      onClick: () => {
        if (s.active !== 0 || s.winner) return;
        engine.knockoutWithPower(a.uid);
        renderMatch();
      }
    }));
  });

  const ya = $('#you-agents');
  ya.innerHTML = '';
  you.agents.forEach(a => {
    ya.appendChild(renderCard(a, { extraClass: 'agent-board', onClick: () => showCardModal(cardsById[a.id]) }));
  });

  const hz = $('#hand-zone');
  hz.innerHTML = '';
  you.hand.forEach(c => {
    hz.appendChild(renderCard(c, {
      playable: yourTurn,
      deal: true,
      onClick: () => {
        if (s.active !== 0 || s.winner) return;
        engine.playCard(c.uid);
        renderMatch();
      }
    }));
  });

  const dock = $('#log-dock');
  dock.innerHTML = engine.log.slice(-12).map(l => l.msg).join('<br>');
}

function showCardModal(d) {
  if (!d) return;
  const m = $('#card-modal');
  $('#card-modal-body').innerHTML = `
    <img src="${artFor(d)}" alt="${d.name}" />
    <h3>${d.name}</h3>
    <p>${d.patron} · ${d.type}${d.contract ? ' · contract' : ''} · cost ${d.cost}${d.hp != null ? ' · HP ' + d.hp : ''}${d.taunt ? ' · Taunt' : ''}</p>
    <p><em>${d.playText || '—'}</em></p>
    ${d.combo2Text ? `<p>Combo 2: ${d.combo2Text}</p>` : ''}
    ${d.combo3Text ? `<p>Combo 3: ${d.combo3Text}</p>` : ''}
    ${d.combo4Text ? `<p>Combo 4: ${d.combo4Text}</p>` : ''}
    <button onclick="document.getElementById('card-modal').classList.remove('show')">Close</button>
  `;
  m.classList.add('show');
  m.onclick = (e) => { if (e.target === m) m.classList.remove('show'); };
}

function startMatch() {
  engine = new GameEngine(cardsById, patronsById);
  ai = new TributeAI(engine);
  engine.on((ev, data) => {
    if (ev === 'combo') flashCombo(data.n);
    if (ev === 'win') showWin(data);
    if (ev === 'log') { /* rendered in match */ }
    if (ev === 'state' || ev === 'play' || ev === 'buy' || ev === 'patron') {
      // throttle via rAF
    }
  });
  engine.newMatch({ playerPatrons: pickYou, aiPatrons: pickOpp, playerFirst: true });
  show('#match');
  renderMatch();
  if (tutorialOn && !localStorage.getItem('tot_tips_done')) {
    tipStep = 0;
    showTip();
  }
}

function flashCombo(n) {
  const el = document.createElement('div');
  el.className = 'combo-flash';
  el.textContent = `COMBO ${n}`;
  $('#match').appendChild(el);
  setTimeout(() => el.remove(), 850);
}

function showWin(data) {
  const youWin = engine.state.winner === 0;
  $('#win-banner').innerHTML = youWin
    ? `Victory<br><span style="font-size:.45em;color:#c4b39a">${reasonText(data.reason)}</span><br><button class="primary" id="btn-again">Another match</button>`
    : `Defeat<br><span style="font-size:.45em;color:#c4b39a">${reasonText(data.reason)}</span><br><button id="btn-again">Return</button>`;
  $('#win-overlay').classList.add('show');
  setTimeout(() => {
    $('#btn-again')?.addEventListener('click', () => {
      $('#win-overlay').classList.remove('show');
      show('#deckpick');
    });
  }, 50);
}

function reasonText(r) {
  if (r === '80') return 'Eighty prestige — the table is yours.';
  if (r === '40-hold') return 'Forty held. The rival could not surpass you.';
  if (r === 'patrons') return 'All four patrons favored your cause.';
  return 'The match is decided.';
}

async function maybeAI() {
  if (!engine || engine.state.winner != null) return;
  if (engine.state.active === 1) {
    await ai.takeTurn(280);
    renderMatch();
    if (engine.state.active === 1 && engine.state.winner == null) {
      await maybeAI();
    }
  }
}

function showTip() {
  const tip = $('#tooltip');
  if (tipStep >= TIPS.length) {
    tip.classList.remove('show');
    localStorage.setItem('tot_tips_done', '1');
    return;
  }
  $('#tip-text').textContent = TIPS[tipStep].text;
  tip.style.left = '12px';
  tip.style.bottom = '120px';
  tip.style.top = 'auto';
  tip.classList.add('show');
}

/* ——— Encyclopedia ——— */
function renderEncy() {
  const sel = $('#ency-patron');
  if (!sel.options.length) {
    sel.innerHTML = `<option value="">All patrons</option>` +
      DATA.patrons.map(p => `<option value="${p.id}">${p.short}</option>`).join('');
  }
  const q = ($('#ency-search').value || '').toLowerCase();
  const pid = sel.value;
  const grid = $('#ency-grid');
  grid.innerHTML = '';
  const list = DATA.cards.filter(c => {
    if (pid && c.patron !== pid) return false;
    if (q && !c.name.toLowerCase().includes(q) && !(c.playText||'').toLowerCase().includes(q)) return false;
    return true;
  });
  for (const c of list) {
    const el = document.createElement('div');
    el.className = 'ency-card';
    el.innerHTML = `<img src="${artFor(c)}" alt="${c.name}" /><div class="info"><strong>${c.name}</strong>${c.cost} · ${c.type}${c.upgraded ? ' · ▲' : ''}</div>`;
    el.addEventListener('click', () => showCardModal(c));
    grid.appendChild(el);
  }
}

/* ——— Wire ——— */
function bind() {
  $('#btn-play').onclick = () => {
    pickYou = []; pickOpp = []; pickPhase = 'you';
    renderDeckPick();
    show('#deckpick');
  };
  $('#btn-ency').onclick = () => { renderEncy(); show('#encyclopedia'); };
  $('#btn-ency-back').onclick = () => show('#splash');
  $('#btn-back-splash').onclick = () => show('#splash');
  $('#ency-patron').onchange = renderEncy;
  $('#ency-search').oninput = renderEncy;

  $('#btn-ai-rest').onclick = () => {
    const rest = DATA.patrons
      .filter(p => p.id !== 'treasury' && !pickYou.includes(p.id) && !pickOpp.includes(p.id))
      .map(p => p.id);
    while (pickYou.length < 2 && rest.length) {
      pickYou.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    }
    pickPhase = 'opp';
    while (pickOpp.length < 2 && rest.length) {
      pickOpp.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    }
    renderDeckPick();
    updatePickStatus();
  };
  $('#btn-start').onclick = () => startMatch();

  $('#btn-end').onclick = async () => {
    if (!engine || engine.state.active !== 0 || engine.state.winner) return;
    engine.endTurn();
    renderMatch();
    await maybeAI();
    renderMatch();
  };
  $('#btn-concede').onclick = () => {
    if (engine) engine.state.winner = 1;
    showWin({ reason: 'concede' });
  };
  $('#tip-next').onclick = () => { tipStep++; showTip(); };
  $('#tip-skip').onclick = () => { tipStep = 99; showTip(); };

  // After player actions that might not end turn, keep AI idle
  // Hook engine events for AI only after our end-turn
}

loadData().then(bind).catch(err => {
  console.error(err);
  $('#splash .subtitle').textContent = 'Failed to load card data: ' + err;
});
