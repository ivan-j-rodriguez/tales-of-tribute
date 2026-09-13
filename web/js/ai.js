/**
 * Competent heuristic AI for Tales of Tribute
 */
export class TributeAI {
  constructor(engine) {
    this.engine = engine;
  }

  async takeTurn(delay = 350) {
    const eng = this.engine;
    let guard = 0;
    while (!eng.state.winner && eng.me().isAI && guard++ < 40) {
      const action = this.chooseAction();
      if (!action || action.type === 'end') {
        await sleep(delay);
        eng.endTurn();
        break;
      }
      await sleep(delay * 0.55);
      this.execute(action);
      eng.emit('state', eng.state);
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
    const scored = acts.map(a => ({ a, s: this.score(a, p, o) }));
    scored.sort((x, y) => y.s - x.s);

    const plays = scored.filter(x => x.a.type === 'play');
    if (plays.length && plays[0].s >= 15) return plays[0].a;
    const ko = scored.find(x => x.a.type === 'ko' && x.s >= 35);
    if (ko) return ko.a;
    const pat = scored.find(x => x.a.type === 'patron' && x.s >= 24);
    if (pat) return pat.a;
    const buy = scored.find(x => x.a.type === 'buy' && x.s >= 12);
    if (buy) return buy.a;
    if (plays.length) return plays[0].a;
    const next = scored.find(x => x.a.type !== 'end');
    if (next && next.s > 5) return next.a;
    return { type: 'end' };
  }

  score(a, p, o) {
    const eng = this.engine;
    let s = 0;
    if (a.type === 'play') {
      const d = eng.card(a.cardId);
      if (!d) return -99;
      s = 20 + this.playScore(d, p, o);
      if ((p.suitsPlayed[d.patron] || 0) >= 1) s += 8;
      if (d.curse) s = 120;
    } else if (a.type === 'buy') {
      const d = eng.card(a.cardId);
      if (!d) return -99;
      s = this.buyScore(d, p) - a.cost * 0.25;
      if (eng.state.turn <= 4 && d.cost <= 3) s += 5;
    } else if (a.type === 'patron') {
      s = this.patronScore(a.id, p, o);
    } else if (a.type === 'ko') {
      s = 28 + a.hp * 2;
      const agent = o.agents.find(x => x.uid === a.uid);
      if (agent?.taunt) s += 28;
      if (p.prestige + p.power >= 38) s += 12;
    } else if (a.type === 'end') {
      s = 2;
      if (!p.hand.length) s = 40;
    }
    if (p.prestige + p.power >= 80 && a.type === 'end') s += 120;
    if (o.prestige >= 40 && p.prestige <= o.prestige && a.type === 'play') s += 12;
    return s;
  }

  playScore(d, p, o) {
    let s = 0;
    const text = `${d.playText || ''} ${d.combo2Text || ''}`;
    if (/Coin/.test(text)) s += 4;
    if (/Power/.test(text)) s += 5;
    if (/Prestige/.test(text)) s += 8;
    if (/Draw/.test(text)) s += 5;
    if (/Knock Out/.test(text) && o.agents.length) s += 10;
    if (d.type === 'agent') s += 6;
    if (d.contract) s += 2;
    if (d.id === 'gold' || d.id === 'writ-of-coin') s += 3;
    return s;
  }

  buyScore(d, p) {
    let s = 8 + d.cost;
    if (d.type === 'agent') s += 6;
    if (d.taunt) s += 4;
    if (d.combo2Text) s += 5;
    if (p.patrons.includes(d.patron)) s += 6;
    if (p.prestige >= 35 && d.cost >= 6 && d.type !== 'agent') s -= 5;
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
    return s;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
