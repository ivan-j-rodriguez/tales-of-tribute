/**
 * Difficulty-scaled AI for Tales of Tribute.
 * 1 = greedy/randomish, 5 = solid heuristic, 10 = look-ahead (combo, 40-clock, denial, taunt, treasury).
 */
export class TributeAI {
  constructor(engine, difficulty = 5) {
    this.engine = engine;
    this.setDifficulty(difficulty);
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
    while (!eng.state.winner && eng.me().isAI && guard++ < 40) {
      const action = this.chooseAction();
      if (!action || action.type === 'end') {
        await sleep(base * 0.7);
        eng.endTurn();
        break;
      }
      eng.emit('aiAction', action);
      await sleep(Math.min(280, base * 0.45));
      this.execute(action);
      eng.emit('state', eng.state);
      await sleep(base * 0.55);
    }
  }

  execute(a) {
    const eng = this.engine;
    if (a.type === 'play') eng.playCard(a.uid);
    else if (a.type === 'buy') eng.buy(a.index);
    else if (a.type === 'patron') eng.callPatron(a.id);
    else if (a.type === 'ko') eng.knockoutWithPower(a.uid);
  }

  chooseAction() {
    const eng = this.engine;
    const acts = eng.legalActions();
    const p = eng.me();
    const o = eng.opp();
    const d = this.difficulty;

    // Low difficulty: shuffle / randomish picks
    if (d <= 2) {
      const nonEnd = acts.filter(a => a.type !== 'end');
      if (!nonEnd.length) return { type: 'end' };
      if (Math.random() < 0.35) return nonEnd[Math.floor(Math.random() * nonEnd.length)];
      // else fall through to weak greedy
    }

    const scored = acts.map(a => ({ a, s: this.score(a, p, o) }));
    // Noise for mid-low difficulties
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
