/**
 * Difficulty-scaled AI for Tales of Tribute.
 * 1 = beginner (passes, worst buys, misses Taunts and patron timing).
 * 2–3 = soft learners, still well below the mid curve.
 * 4 = noisy greedy. 5 = solid heuristic. 10 = look-ahead
 * (combo, 40-clock, denial, taunt, treasury).
 *
 * Levels 1–3 use the table below and never reach the 4–10 heuristic.
 * `blind` is a misclick, often End Turn. `sloppy` plays the turn but
 * picks the weak card, the weak buy, and a random patron.
 * The rest is a thinned, noisy reading of the same scores.
 */
const BEGINNER = {
  1: { blind: 0.56, sloppy: 0.32, giveUp: 0.50, tauntNotice: 0.12, buyWorst: 1, dropPatron: 0.78, buyFlip: 1, playBand: 24 },
  2: { blind: 0.24, sloppy: 0.34, giveUp: 0.30, tauntNotice: 0.48, buyWorst: 0.62, dropPatron: 0.38, buyFlip: 0.48, playBand: 12 },
  3: { blind: 0.12, sloppy: 0.22, giveUp: 0.18, tauntNotice: 0.74, buyWorst: 0.42, dropPatron: 0.18, buyFlip: 0.28, playBand: 8 },
};

export class TributeAI {
  constructor(engine, difficulty = 5, rng = null) {
    this.engine = engine;
    this._rng = typeof rng === 'function' ? rng : Math.random;
    this.setDifficulty(difficulty);
  }

  _r() {
    return this._rng();
  }

  setDifficulty(d) {
    this.difficulty = Math.max(1, Math.min(10, Math.round(d || 5)));
  }

  /** Visible pause between AI moves (ms). Higher difficulty = slightly slower/readability. */
  actionDelay() {
    const d = this.difficulty;
    if (d <= 2) return 420;
    if (d <= 4) return 480;
    if (d <= 6) return 560;
    if (d <= 8) return 640;
    return 720;
  }

  async takeTurn(delay) {
    const eng = this.engine;
    const base = delay != null ? delay : this.actionDelay();
    let guard = 0;
    let failed = 0;
    while (!eng.state.winner && eng.me().isAI && guard++ < 40) {
      const action = this.chooseAction();
      if (!action || action.type === 'end') {
        await sleep(base * 0.7);
        eng.endTurn();
        break;
      }
      eng.emit('aiAction', action);
      await sleep(Math.min(280, base * 0.45));
      const ok = this.execute(action);
      if (ok === false) {
        // A rejected click (usually a beginner aiming at an illegal card)
        // must not spin the turn. Three misses and they pass.
        if (++failed >= 3) {
          await sleep(base * 0.7);
          eng.endTurn();
          break;
        }
        continue;
      }
      failed = 0;
      eng.emit('state', eng.state);
      await sleep(base * 0.55);
    }
  }

  execute(a) {
    const eng = this.engine;
    if (a.type === 'play') return eng.playCard(a.uid);
    if (a.type === 'buy') return eng.buy(a.index);
    if (a.type === 'patron') return eng.callPatron(a.id);
    if (a.type === 'ko') return eng.knockoutWithPower(a.uid);
    return false;
  }

  chooseAction() {
    const eng = this.engine;
    const acts = eng.legalActions();
    const p = eng.me();
    const o = eng.opp();
    const d = this.difficulty;

    // Levels 1–3 never use the heuristic below. A new player should
    // usually beat 1; 2 and 3 still blunder, then 4 picks up the old curve.
    if (d <= 3) return this._chooseBeginner(acts, p, o);

    const scored = acts.map(a => ({ a, s: this.score(a, p, o) }));
    // Difficulty 4 keeps the old mild noise. 5–10 are deterministic.
    if (d < 5) {
      for (const x of scored) x.s += (Math.random() - 0.5) * (12 - d * 2);
    }
    scored.sort((x, y) => y.s - x.s);

    const plays = scored.filter(x => x.a.type === 'play');
    const playThresh = d >= 8 ? 12 : d >= 5 ? 15 : 18;
    if (plays.length && plays[0].s >= playThresh) return plays[0].a;

    const koThresh = d >= 7 ? 28 : 35;
    const ko = scored.find(x => x.a.type === 'ko' && x.s >= koThresh);
    if (ko) return ko.a;

    const patThresh = d >= 8 ? 18 : d >= 5 ? 24 : 30;
    const pat = scored.find(x => x.a.type === 'patron' && x.s >= patThresh);
    if (pat) return pat.a;

    const buyThresh = d >= 8 ? 8 : d >= 5 ? 12 : 16;
    const buy = scored.find(x => x.a.type === 'buy' && x.s >= buyThresh);
    if (buy) return buy.a;

    if (plays.length) return plays[0].a;
    const next = scored.find(x => x.a.type !== 'end');
    if (next && next.s > (d >= 5 ? 5 : 10)) return next.a;
    return { type: 'end' };
  }

  /**
   * Beginner policy for difficulties 1–3.
   * Curses are still played — the rules require it — and everything else
   * is a mistake on purpose: passing with cards in hand, buying the worst
   * tavern card, walking past a Taunt (so Power never becomes Prestige),
   * and calling a random patron or none at all.
   */
  _chooseBeginner(acts, p, o) {
    const legal = this._executable(acts);
    if (!legal.some(a => a.type !== 'end')) return { type: 'end' };

    const curses = legal.filter(a => a.type === 'play' && this.engine.card(a.cardId)?.curse);
    if (curses.length) return curses[Math.floor(this._r() * curses.length)];

    const curve = BEGINNER[this.difficulty];
    const roll = this._r();
    if (roll < curve.blind) return this._blind(legal, p, o, curve);
    if (roll < curve.blind + curve.sloppy) return this._sloppy(legal, p, o, curve);
    return this._reading(legal, p, o, curve);
  }

  _executable(acts) {
    const eng = this.engine;
    return acts.filter(a => {
      if (a.type === 'play') return eng.canPlay(a.uid);
      if (a.type === 'buy') return eng.canBuy(a.index);
      if (a.type === 'patron') return eng.canCallPatron(a.id);
      if (a.type === 'ko') return eng.opp().agents.some(x => x.uid === a.uid) && eng.me().power >= a.hp;
      return a.type === 'end';
    });
  }

  _blind(legal, p, o, curve) {
    const moving = legal.filter(a => a.type !== 'end');
    if (!moving.length) return { type: 'end' };
    // Pass while cards, buys, or a Taunt are still sitting there.
    if (this._r() < curve.giveUp) return { type: 'end' };

    let pool = moving;
    if (o.agents.some(a => a.taunt) && this._r() >= curve.tauntNotice) {
      pool = pool.filter(a => a.type !== 'ko');
    }
    if (!pool.length) return { type: 'end' };

    const d = this.difficulty;
    const weighted = pool.map(a => {
      let w = 1;
      if (a.type === 'play') w = 3;
      else if (a.type === 'buy') w = d === 1 ? 5 : d === 2 ? 3 : 2;
      else if (a.type === 'patron') w = d === 1 ? 2 : 1.2;
      else if (a.type === 'ko') w = 0.35;
      return { a, w };
    });
    return this._pickWeighted(weighted);
  }

  _sloppy(legal, p, o, curve) {
    const plays = legal.filter(a => a.type === 'play');
    const buys = legal.filter(a => a.type === 'buy');
    const pats = legal.filter(a => a.type === 'patron');

    if (plays.length) {
      // A suit already started is the combo. They play a different one.
      const fresh = plays.filter(a => {
        const def = this.engine.card(a.cardId);
        return def && !(p.suitsPlayed[def.patron] > 0);
      });
      const pool = fresh.length && fresh.length < plays.length ? fresh : plays;
      return this._worstPlay(pool, p, o);
    }

    let kos = legal.filter(a => a.type === 'ko');
    // One roll: miss the knockout entirely, Taunt or not.
    if (kos.length && this._r() >= curve.tauntNotice) kos = [];
    if (kos.length && o.agents.some(a => a.taunt)) {
      return kos[Math.floor(this._r() * kos.length)];
    }
    if (buys.length) {
      if (this._r() < curve.buyWorst) return this._worstBuy(buys, p, o);
      return this._bestBuy(buys, p, o);
    }
    if (kos.length) return kos[Math.floor(this._r() * kos.length)];
    if (pats.length && this._r() >= curve.dropPatron) {
      return pats[Math.floor(this._r() * pats.length)];
    }
    return { type: 'end' };
  }

  _reading(legal, p, o, curve) {
    // Same action order as difficulties 4–10 (play, knockout, patron, buy),
    // but knockouts and patrons are dropped on purpose and buys are often
    // ranked backwards. End Turn is what is left, not a score that beats a buy.
    const d = this.difficulty;
    let pool = legal.slice();
    if (this._r() >= curve.tauntNotice) pool = pool.filter(a => a.type !== 'ko');
    if (this._r() < curve.dropPatron) pool = pool.filter(a => a.type !== 'patron');

    const flipBuy = this._r() < curve.buyFlip;
    const noise = d === 3 ? 8 : d === 2 ? 14 : 20;
    const scored = pool.map(a => {
      let s = this.score(a, p, o);
      if (a.type === 'buy') {
        const def = this.engine.card(a.cardId);
        const quality = def ? this.buyScore(def, p, o) : 0;
        s = (flipBuy ? 40 - quality : quality) + (this._r() - 0.5) * noise;
      } else if (a.type === 'play' || a.type === 'patron') {
        s += (this._r() - 0.5) * (a.type === 'play' ? curve.playBand : noise);
      }
      return { a, s };
    });

    const bandW = d === 1 ? 14 : d === 2 ? 9 : 4;
    const pick = (type, thresh) => {
      const rows = scored.filter(x => x.a.type === type && x.s >= thresh);
      rows.sort((a, b) => b.s - a.s);
      if (!rows.length) return null;
      const near = rows.filter(x => x.s >= rows[0].s - bandW);
      return near[Math.floor(this._r() * near.length)].a;
    };

    const play = pick('play', d === 3 ? 14 : 8);
    if (play) return play;
    const ko = pick('ko', d === 3 ? 26 : 16);
    if (ko) return ko;
    const pat = pick('patron', d === 3 ? 18 : 8);
    if (pat) return pat;
    const buy = pick('buy', d === 3 ? 8 : 4);
    if (buy) return buy;
    return { type: 'end' };
  }

  _worstPlay(plays, p, o) {
    const ranked = plays.map(a => ({
      a,
      s: this.playScore(this.engine.card(a.cardId), p, o),
    })).sort((x, y) => x.s - y.s);
    const band = ranked.filter(x => x.s <= ranked[0].s + 2);
    return band[Math.floor(this._r() * band.length)].a;
  }

  _worstBuy(buys, p, o) {
    const ranked = buys.map(a => {
      const def = this.engine.card(a.cardId);
      return { a, s: def ? this.buyScore(def, p, o) : 0 };
    }).sort((x, y) => x.s - y.s);
    const band = ranked.filter(x => x.s <= ranked[0].s + 3);
    return band[Math.floor(this._r() * band.length)].a;
  }

  _bestBuy(buys, p, o) {
    const ranked = buys.map(a => {
      const def = this.engine.card(a.cardId);
      return { a, s: def ? this.buyScore(def, p, o) : 0 };
    }).sort((x, y) => y.s - x.s);
    return ranked[0].a;
  }

  _pickWeighted(items) {
    const total = items.reduce((n, x) => n + x.w, 0);
    if (!(total > 0)) return { type: 'end' };
    let r = this._r() * total;
    for (const x of items) {
      r -= x.w;
      if (r <= 0) return x.a;
    }
    return items[items.length - 1].a;
  }

  score(a, p, o) {
    const eng = this.engine;
    const d = this.difficulty;
    let s = 0;
    if (a.type === 'play') {
      const def = eng.card(a.cardId);
      if (!def) return -99;
      s = 20 + this.playScore(def, p, o);
      if ((p.suitsPlayed[def.patron] || 0) >= 1) s += 8 + (d >= 7 ? 4 : 0);
      if (def.curse) s = 120;
      // Look-ahead: combo chain value
      if (d >= 7) {
        const suit = def.patron;
        const already = p.suitsPlayed[suit] || 0;
        if (already >= 1 && def.combo2Text) s += 10;
        if (already >= 2 && def.combo3Text) s += 12;
        if (already >= 3 && def.combo4Text) s += 14;
      }
    } else if (a.type === 'buy') {
      const def = eng.card(a.cardId);
      if (!def) return -99;
      s = this.buyScore(def, p, o) - a.cost * 0.25;
      if (eng.state.turn <= 4 && def.cost <= 3) s += 5;
      // Tavern denial: deny strong cards opponent wants
      if (d >= 8) {
        if (o.patrons.includes(def.patron)) s += 6;
        if (def.taunt && o.agents.length === 0) s += 4;
        if (def.cost >= 6 && o.coin + 2 >= def.cost) s += 5;
      }
    } else if (a.type === 'patron') {
      s = this.patronScore(a.id, p, o);
    } else if (a.type === 'ko') {
      s = 28 + a.hp * 2;
      const agent = o.agents.find(x => x.uid === a.uid);
      if (agent?.taunt) s += 28 + (d >= 6 ? 10 : 0);
      if (p.prestige + p.power >= 38) s += 12;
      // Clear taunt so power converts
      if (d >= 6 && agent?.taunt && p.power >= a.hp) s += 18;
    } else if (a.type === 'end') {
      s = 2;
      if (!p.hand.length) s = 40;
      // 40-clock: bank prestige when racing
      if (d >= 7 && p.power > 0 && !o.agents.some(x => x.taunt) && p.prestige + p.power >= 40) {
        s += 50;
      }
    }
    if (p.prestige + p.power >= 80 && a.type === 'end') s += 120;
    if (o.prestige >= 40 && p.prestige <= o.prestige && a.type === 'play') s += 12 + (d >= 7 ? 8 : 0);
    // Treasury timing
    if (a.type === 'patron' && a.id === 'treasury' && d >= 8) {
      if (eng.state.turn <= 5) s += 8;
      if (p.coin >= 4 && p.played.length >= 2) s += 6;
    }
    return s;
  }

  playScore(def, p, o) {
    let s = 0;
    const text = `${def.playText || ''} ${def.combo2Text || ''}`;
    if (/Coin/.test(text)) s += 4;
    if (/Power/.test(text)) s += 5;
    if (/Prestige/.test(text)) s += 8;
    if (/Draw/.test(text)) s += 5;
    if (/Knock Out/.test(text) && o.agents.length) s += 10;
    if (def.type === 'agent') s += 6 + (this.difficulty >= 7 ? 4 : 0);
    if (def.contract) s += 2;
    if (def.id === 'gold' || def.id === 'writ-of-coin') s += 3;
    if (def.taunt) s += this.difficulty >= 6 ? 8 : 3;
    return s;
  }

  buyScore(def, p, o) {
    let s = 8 + def.cost;
    if (def.type === 'agent') s += 6;
    if (def.taunt) s += 4 + (this.difficulty >= 7 ? 5 : 0);
    if (def.combo2Text) s += 5;
    if (p.patrons.includes(def.patron)) s += 6;
    if (p.prestige >= 35 && def.cost >= 6 && def.type !== 'agent') s -= 5;
    if (this.difficulty >= 9 && /Prestige|Knock Out|Acquire/.test(def.playText || '')) s += 6;
    return s;
  }

  patronScore(id, p, o) {
    const eng = this.engine;
    let s = 15;
    const map = {
      treasury: eng.state.turn <= 6 ? 36 : 20,
      crows: p.coin >= 4 ? 40 + p.coin : 10,
      redeagle: 28,
      hunding: eng._favorFor('hunding') !== 1 ? 30 : 0,
      celarus: o.agents.length ? 32 : 12,
      rajhin: 22, orgnum: 25, pelin: 22, druid: 26,
      almalexia: 24, mora: 18, alessia: 27,
      hlaalu: p.played.some(c => (eng.card(c.id)?.cost || 0) >= 4) ? 36 : 16,
    };
    s = map[id] ?? 15;
    const favCount = eng.state.matchPatrons.filter(pid => eng._favorFor(pid) === 1).length;
    if (favCount >= 2 && eng._favorFor(id) !== 1) s += 18;
    if (favCount === 3 && eng._favorFor(id) !== 1) s += 55;
    if (this.difficulty >= 8 && favCount >= 2) s += 8;
    return s;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
