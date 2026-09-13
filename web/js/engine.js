/**
 * Tales of Tribute — rules engine (fan implementation)
 */
export class GameEngine {
  constructor(cardsById, patronsById) {
    this.cardsById = cardsById;
    this.patronsById = patronsById;
    this.state = null;
    this.log = [];
    this.pending = null; // {type, choices, resolve meta}
    this.listeners = [];
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev, data) { for (const fn of this.listeners) fn(ev, data); }

  card(id) {
    if (!id) return null;
    if (this.cardsById[id]) return this.cardsById[id];
    const slug = String(id).toLowerCase().replace(/['']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return this.cardsById[slug] || null;
  }

  newMatch({ playerPatrons, aiPatrons, playerFirst = true }) {
    const matchPatrons = [...playerPatrons, ...aiPatrons];
    const tavernPile = this._buildTavern(matchPatrons);
    this._shuffle(tavernPile);

    const makePlayer = (patrons, isAI) => {
      const starters = patrons.map(p => this.patronsById[p].starter).filter(Boolean);
      const deck = [];
      for (let i = 0; i < 6; i++) deck.push(this._inst('gold'));
      for (const s of starters) deck.push(this._inst(s));
      this._shuffle(deck);
      return {
        isAI,
        patrons,
        coin: 0, power: 0, prestige: 0,
        hand: [],
        draw: deck,
        cooldown: [],
        played: [],
        agents: [],
        exile: [],
        patronCallsLeft: 1,
        setback: { coin: 0, power: 0, draw: 0 },
        suitsPlayed: {},
        createdThisTurn: [],
      };
    };

    const p0 = makePlayer(playerPatrons, false);
    const p1 = makePlayer(aiPatrons, true);

    const favor = {};
    for (const pid of matchPatrons) favor[pid] = 0; // -1 = favors p1, 0 = neutral, 1 = favors p0
    favor.treasury = 0;

    const tavern = [];
    for (let i = 0; i < 5; i++) {
      if (tavernPile.length) tavern.push(tavernPile.pop());
    }

    this.state = {
      players: [p0, p1],
      active: playerFirst ? 0 : 1,
      matchPatrons,
      favor,
      tavern,
      tavernPile,
      tavernDiscard: [],
      turn: 1,
      phase: 'main',
      winner: null,
      lastChance: null, // player index who triggered 40+
      awaitingLastChance: false,
      tutorialStep: 0,
      animQueue: [],
    };

    this._draw(p0, 5);
    this._draw(p1, 5);
    this._startTurn();
    this.emit('new', this.state);
    return this.state;
  }

  _inst(cardId) {
    const def = this.card(cardId);
    return {
      uid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
      id: cardId,
      hp: def?.hp ?? null,
      maxHp: def?.hp ?? null,
      taunt: !!def?.taunt,
      confined: [],
      passive: null,
    };
  }

  _buildTavern(matchPatrons) {
    const pile = [];
    const addDeck = (patronId) => {
      for (const c of Object.values(this.cardsById)) {
        if (c.patron !== patronId) continue;
        if (c.token || c.curse) continue;
        if (c.starter) continue;
        if (c.id === 'the-chimera' || c.id === 'gold' || c.id === 'writ-of-coin' || c.id === 'bewilderment') continue;
        const qty = c.upgradedQty > 0 ? c.upgradedQty : c.baseQty;
        // Prefer upgraded versions: skip base-only replacements when upgraded exists
        // Cards with baseQty=0 are upgrades; cards with both use upgradedQty
        if (qty <= 0) continue;
        // If this is a "base" version that was replaced (upgradedQty=0 and baseQty>0 but an upgrade exists),
        // spicy table already lists them separately with qtys — use upgradedQty for matches.
        for (let i = 0; i < qty; i++) pile.push(this._inst(c.id));
      }
    };
    for (const p of matchPatrons) addDeck(p);
    addDeck('treasury');
    return pile;
  }

  _shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  me() { return this.state.players[this.state.active]; }
  opp() { return this.state.players[1 - this.state.active]; }

  _draw(player, n) {
    for (let i = 0; i < n; i++) {
      if (!player.draw.length) {
        if (!player.cooldown.length) break;
        player.draw = player.cooldown.splice(0);
        this._shuffle(player.draw);
      }
      if (player.draw.length) {
        const c = player.draw.pop();
        player.hand.push(c);
        this.emit('draw', { player, card: c });
      }
    }
  }

  _toCooldown(player, card) {
    player.cooldown.push(card);
    this._triggerPassives(player, 'cooldown', card);
    if (this.card(card.id)?.type === 'agent') {
      this._triggerPassives(player, 'agent_cooldown', card);
    }
  }

  _triggerPassives(owner, trigger, card) {
    // Check all agents in play for both players (some trigger on any agent play)
    for (const pl of this.state.players) {
      for (const ag of pl.agents) {
        const def = this.card(ag.id);
        if (!def) continue;
        const effects = [...(def.play || [])];
        for (const e of effects) {
          if (e.op === 'passive' && e.trigger === trigger) {
            // Coin/Agent triggers for the agent owner when ANY agent is played
            if (trigger === 'agent_play') {
              this._grant(pl, e.resource, e.n);
            } else if (pl === owner) {
              this._grant(pl, e.resource, e.n);
            }
          }
        }
      }
    }
  }

  _grant(player, resource, n) {
    if (resource === 'coin') player.coin += n;
    else if (resource === 'power') player.power += n;
    else if (resource === 'prestige') player.prestige += n;
  }

  _startTurn() {
    const p = this.me();
    p.coin = 0; p.power = 0;
    p.patronCallsLeft = 1;
    p.suitsPlayed = {};
    p.played = [];
    // Hunding favored start coin
    for (const pid of this.state.matchPatrons) {
      if (pid === 'hunding' && this._favorFor(pid) === 1) {
        p.coin += 1;
        this._log('Hunding favor: +1 Coin');
      }
    }
    // Mora setbacks
    if (p.setback.coin) { p.coin += p.setback.coin; this._log(`Setback: +${p.setback.coin} Coin`); }
    if (p.setback.power) { p.power += p.setback.power; this._log(`Setback: +${p.setback.power} Power`); }
    if (p.setback.draw) { this._draw(p, p.setback.draw); this._log(`Setback: Draw ${p.setback.draw}`); }
    p.setback = { coin: 0, power: 0, draw: 0 };
    this.state.phase = 'main';
    this.emit('turnStart', { player: this.state.active });
  }

  _favorFor(patronId) {
    // returns 1 if favors active player, -1 if favors opponent, 0 neutral
    const f = this.state.favor[patronId] || 0;
    if (f === 0) return 0;
    return f === (this.state.active === 0 ? 1 : -1) ? 1 : -1;
  }

  _log(msg) {
    this.log.push({ t: this.state.turn, a: this.state.active, msg });
    this.emit('log', msg);
  }

  // ——— Player actions ———

  canPlay(uid) {
    const p = this.me();
    return p.hand.some(c => c.uid === uid) && !this.state.winner && this.state.phase === 'main';
  }

  playCard(uid, choiceIndex = 0) {
    if (!this.canPlay(uid)) return false;
    const p = this.me();
    const idx = p.hand.findIndex(c => c.uid === uid);
    if (idx < 0) return false;
    const card = p.hand.splice(idx, 1)[0];
    const def = this.card(card.id);
    p.played.push(card);

    const suit = def.patron;
    p.suitsPlayed[suit] = (p.suitsPlayed[suit] || 0) + 1;
    const comboCount = p.suitsPlayed[suit];

    this._log(`Play ${def.name}`);
    this.emit('play', { card, def, comboCount });

    // On-play effects
    this._resolveEffects(def.play || [], { card, def, choiceIndex });

    // Combo
    if (comboCount >= 2 && def.combo2?.length) {
      this._log(`Combo 2: ${def.name}`);
      this.emit('combo', { n: 2, card });
      this._resolveEffects(def.combo2, { card, def, choiceIndex });
    }
    if (comboCount >= 3 && def.combo3?.length) {
      this._log(`Combo 3: ${def.name}`);
      this.emit('combo', { n: 3, card });
      this._resolveEffects(def.combo3, { card, def, choiceIndex });
    }
    if (comboCount >= 4 && def.combo4?.length) {
      this._log(`Combo 4: ${def.name}`);
      this.emit('combo', { n: 4, card });
      this._resolveEffects(def.combo4, { card, def, choiceIndex });
    }

    // Druid Chimera check
    this._checkChimera(comboCount, suit);

    // Agent enters board
    if (def.type === 'agent') {
      const agent = { ...card, hp: def.hp || 2, maxHp: def.hp || 2, taunt: !!def.taunt, confined: [] };
      p.agents.push(agent);
      this._triggerPassives(p, 'agent_play', agent);
      this.emit('agentEnter', { agent });
    }

    // Contract action → exile (remove from played)
    if (def.contract && def.type === 'action') {
      const pi = p.played.findIndex(c => c.uid === card.uid);
      if (pi >= 0) p.played.splice(pi, 1);
      p.exile.push(card);
    }

    this.emit('state', this.state);
    return true;
  }

  _checkChimera(comboCount, suit) {
    if (suit !== 'druid') return;
    if (!this.state.matchPatrons.includes('druid')) return;
    const fav = this._favorFor('druid');
    const need = fav === 1 ? 4 : fav === 0 ? 5 : 99;
    if (comboCount >= need) {
      const p = this.me();
      // Only once per match roughly — if chimera not already owned/in play
      const has = [...p.agents, ...p.hand, ...p.draw, ...p.cooldown, ...p.played]
        .some(c => c.id === 'the-chimera');
      if (!has) {
        const ch = this._inst('the-chimera');
        p.agents.push({ ...ch, hp: 5, maxHp: 5, taunt: true, confined: [] });
        this._log('The Chimera awakens!');
        this.emit('chimera', {});
      }
    }
  }

  _resolveEffects(effects, ctx) {
    this._lastKnocked = 0;
    for (const e of effects) {
      this._resolveOne(e, ctx);
    }
  }

  _resolveOne(e, ctx) {
    const p = this.me();
    const o = this.opp();
    if (!e || !e.op) return;
    switch (e.op) {
      case 'coin': p.coin += e.n; break;
      case 'power': p.power += e.n; break;
      case 'prestige': p.prestige += e.n; this.emit('prestige', { n: e.n }); break;
      case 'opp_prestige': o.prestige = Math.max(0, o.prestige + e.n); break;
      case 'draw': this._draw(p, e.n); break;
      case 'discard': this._autoDiscard(p, e.n); break;
      case 'donate': this._donate(p, e.n); break;
      case 'toss': this._toss(p, e.n); break;
      case 'destroy': this._destroy(p, e.n); break;
      case 'replace': this._replaceTavern(e.n); break;
      case 'acquire': this._acquire(p, e.n); break;
      case 'patron_extra': p.patronCallsLeft += e.n; break;
      case 'knockout': this._knockout(e.n, e.coinPerKnock || 0); break;
      case 'coin_per_knock': this.me().coin += (this._lastKnocked || 0) * (e.n || 1); break;
      case 'knockout_all': this._knockoutAll(); break;
      case 'heal': this._heal(ctx.card, e.n); break;
      case 'sacking': this._createToken(p, 'summerset-sacking', e.n); break;
      case 'hand_refresh': this._handRefresh(p, e.n); break;
      case 'draw_refresh': this._drawRefresh(p, e.n, false); break;
      case 'draw_refresh_agents': this._drawRefresh(p, e.n, true); break;
      case 'setback_draw': o.setback.draw += e.n; break;
      case 'setback_coin': o.setback.coin += e.n; break;
      case 'setback_power': o.setback.power += e.n; break;
      case 'confine': this._confine(ctx.card, e.n); break;
      case 'create': this._createToken(p, this._slug(e.card), e.n || 1); break;
      case 'choose': {
        // Pick best option for AI, first for player unless choiceIndex set
        const opts = e.options || [];
        let pick = ctx.choiceIndex || 0;
        if (p.isAI) pick = this._bestChoice(opts);
        const chosen = opts[Math.min(pick, opts.length - 1)] || [];
        this._resolveEffects(chosen, ctx);
        break;
      }
      case 'passive':
        // Passives apply while agent in play — handled on triggers; on-play also grant immediate if coin/power static mixed
        break;
      case 'raw':
        this._log(`(partial) ${e.text}`);
        break;
      default:
        break;
    }
  }

  _slug(name) {
    return name.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  _bestChoice(opts) {
    // Prefer power when racing, else coin, else refresh
    let best = 0, score = -1;
    opts.forEach((opt, i) => {
      let s = 0;
      for (const e of opt) {
        if (e.op === 'power') s += e.n * 3;
        if (e.op === 'coin') s += e.n * 2;
        if (e.op === 'prestige') s += e.n * 4;
        if (e.op === 'draw_refresh' || e.op === 'acquire') s += 5;
        if (e.op === 'knockout_all') s += 8;
      }
      if (s > score) { score = s; best = i; }
    });
    return best;
  }

  _autoDiscard(p, n) {
    for (let i = 0; i < n; i++) {
      if (!p.hand.length) break;
      // discard weakest (bewilderment/gold first)
      p.hand.sort((a, b) => this._cardValue(a) - this._cardValue(b));
      const c = p.hand.shift();
      this._toCooldown(p, c);
      this._triggerPassives(p, 'discard', c);
    }
  }

  _cardValue(c) {
    const d = this.card(c.id);
    if (d?.curse) return -10;
    if (d?.id === 'gold') return 0;
    return (d?.cost || 0) + (d?.type === 'agent' ? 2 : 0);
  }

  _donate(p, n) {
    for (let i = 0; i < n; i++) {
      if (!p.hand.length) break;
      p.hand.sort((a, b) => this._cardValue(a) - this._cardValue(b));
      const c = p.hand.shift();
      this._toCooldown(p, c);
      this._triggerPassives(p, 'discard', c);
      this._draw(p, 1);
    }
  }

  _toss(p, n) {
    const seen = [];
    for (let i = 0; i < n && p.draw.length; i++) seen.push(p.draw.pop());
    if (!seen.length) return;
    // Move low-value to cooldown, keep high on top
    seen.sort((a, b) => this._cardValue(a) - this._cardValue(b));
    const keep = Math.ceil(seen.length / 2);
    const toCD = seen.slice(0, seen.length - keep);
    const toTop = seen.slice(seen.length - keep);
    for (const c of toCD) this._toCooldown(p, c);
    for (const c of toTop.reverse()) p.draw.push(c);
  }

  _destroy(p, n) {
    for (let i = 0; i < n; i++) {
      if (!p.played.length) break;
      // destroy weakest played non-agent preferably
      p.played.sort((a, b) => this._cardValue(a) - this._cardValue(b));
      const c = p.played.shift();
      p.exile.push(c);
      this._log(`Destroy ${this.card(c.id)?.name}`);
    }
  }

  _replaceTavern(n) {
    for (let i = 0; i < n; i++) {
      if (!this.state.tavern.length) break;
      // Replace cheapest / least valuable for active? Replace random for fairness; AI picks worst for them
      let idx = 0;
      if (this.me().isAI) {
        // remove card AI doesn't want (high cost it can't afford or weak)
        idx = 0;
        let worst = 999;
        this.state.tavern.forEach((c, i) => {
          const d = this.card(c.id);
          const score = d.cost <= this.me().coin ? -(d.cost + 5) : d.cost;
          if (score < worst) { worst = score; idx = i; }
        });
      } else {
        idx = Math.floor(Math.random() * this.state.tavern.length);
      }
      const removed = this.state.tavern.splice(idx, 1)[0];
      this.state.tavernDiscard.push(removed);
      this._refillTavernSlot();
    }
  }

  _refillTavernSlot() {
    if (!this.state.tavernPile.length && this.state.tavernDiscard.length) {
      this.state.tavernPile = this.state.tavernDiscard.splice(0);
      this._shuffle(this.state.tavernPile);
    }
    if (this.state.tavernPile.length && this.state.tavern.length < 5) {
      this.state.tavern.push(this.state.tavernPile.pop());
    }
  }

  _acquire(p, maxCost) {
    const affordable = this.state.tavern
      .map((c, i) => ({ c, i, d: this.card(c.id) }))
      .filter(x => x.d.cost <= maxCost);
    if (!affordable.length) return;
    affordable.sort((a, b) => b.d.cost - a.d.cost || this._buyScore(b.d) - this._buyScore(a.d));
    const pick = affordable[0];
    this.state.tavern.splice(pick.i, 1);
    this._toCooldown(p, pick.c);
    this._log(`Acquire ${pick.d.name}`);
    this._refillTavernSlot();
  }

  _buyScore(d) {
    return d.cost + (d.type === 'agent' ? 3 : 0) + (d.combo2Text ? 2 : 0);
  }

  _knockout(n, coinPer = 0) {
    const o = this.opp();
    for (let i = 0; i < n; i++) {
      const target = this._pickKnockTarget(o);
      if (!target) break;
      this._defeatAgent(o, target);
      this._lastKnocked = (this._lastKnocked || 0) + 1;
      if (coinPer) this.me().coin += coinPer;
    }
  }

  _knockoutAll() {
    // Alessia: knocks ALL agents including own
    for (const pl of this.state.players) {
      const agents = [...pl.agents];
      for (const a of agents) {
        this._defeatAgent(pl, a);
        // Morihaus coin-per handled via knockout with coinPer
      }
    }
  }

  _pickKnockTarget(owner) {
    if (!owner.agents.length) return null;
    const taunts = owner.agents.filter(a => a.taunt);
    const pool = taunts.length ? taunts : owner.agents;
    // lowest hp first
    pool.sort((a, b) => a.hp - b.hp);
    return pool[0];
  }

  _defeatAgent(owner, agent) {
    const idx = owner.agents.findIndex(a => a.uid === agent.uid);
    if (idx < 0) return;
    owner.agents.splice(idx, 1);
    // Release confined
    for (const c of agent.confined || []) this._toCooldown(owner, c);
    const def = this.card(agent.id);
    if (def?.contract) {
      owner.exile.push(agent);
    } else {
      this._toCooldown(owner, agent);
    }
    this._log(`Knock out ${def?.name}`);
    this.emit('knockout', { agent });
  }

  dealDamageToAgent(agentUid, amount) {
    const o = this.opp();
    const agent = o.agents.find(a => a.uid === agentUid);
    if (!agent) return false;
    // Must hit taunt first
    const taunts = o.agents.filter(a => a.taunt);
    if (taunts.length && !agent.taunt) return false;
    if (this.me().power < amount) return false;
    this.me().power -= amount;
    agent.hp -= amount;
    if (agent.hp <= 0) this._defeatAgent(o, agent);
    this.emit('state', this.state);
    return true;
  }

  // Spend all needed power to KO an agent
  knockoutWithPower(agentUid) {
    const o = this.opp();
    const agent = o.agents.find(a => a.uid === agentUid);
    if (!agent) return false;
    const taunts = o.agents.filter(a => a.taunt);
    if (taunts.length && !agent.taunt) return false;
    const need = agent.hp;
    if (this.me().power < need) return false;
    this.me().power -= need;
    this._defeatAgent(o, agent);
    this.emit('state', this.state);
    return true;
  }

  _heal(card, n) {
    const p = this.me();
    const agent = p.agents.find(a => a.uid === card.uid) || p.agents[0];
    if (agent) agent.hp = Math.min(agent.maxHp, agent.hp + n);
  }

  _createToken(p, cardId, n) {
    for (let i = 0; i < n; i++) {
      if (!this.cardsById[cardId]) continue;
      const c = this._inst(cardId);
      this._toCooldown(p, c);
      this._log(`Create ${this.card(cardId).name}`);
    }
  }

  _handRefresh(p, n) {
    for (let i = 0; i < n; i++) {
      if (!p.cooldown.length) break;
      p.cooldown.sort((a, b) => this._cardValue(b) - this._cardValue(a));
      const c = p.cooldown.shift();
      p.hand.push(c);
    }
  }

  _drawRefresh(p, n, agentsOnly) {
    for (let i = 0; i < n; i++) {
      let pool = p.cooldown;
      if (agentsOnly) pool = p.cooldown.filter(c => this.card(c.id)?.type === 'agent');
      if (!pool.length) break;
      pool.sort((a, b) => this._cardValue(b) - this._cardValue(a));
      const c = pool[0];
      const idx = p.cooldown.findIndex(x => x.uid === c.uid);
      p.cooldown.splice(idx, 1);
      p.draw.push(c); // top of draw
    }
  }

  _confine(agentCard, n) {
    const o = this.opp();
    const agent = this.me().agents.find(a => a.uid === agentCard.uid);
    for (let i = 0; i < n; i++) {
      if (!o.cooldown.length) break;
      o.cooldown.sort((a, b) => this._cardValue(b) - this._cardValue(a));
      const c = o.cooldown.shift();
      if (agent) agent.confined.push(c);
      else this._toCooldown(o, c); // fallback
    }
  }

  canBuy(tavernIndex) {
    const p = this.me();
    const c = this.state.tavern[tavernIndex];
    if (!c || this.state.winner) return false;
    const d = this.card(c.id);
    return p.coin >= d.cost;
  }

  buy(tavernIndex) {
    if (!this.canBuy(tavernIndex)) return false;
    const p = this.me();
    const c = this.state.tavern.splice(tavernIndex, 1)[0];
    const d = this.card(c.id);
    p.coin -= d.cost;
    this._toCooldown(p, c);
    this._log(`Buy ${d.name} (${d.cost})`);
    this.emit('buy', { card: c, def: d });
    this._refillTavernSlot();
    this.emit('state', this.state);
    return true;
  }

  canCallPatron(patronId) {
    const p = this.me();
    if (p.patronCallsLeft <= 0 || this.state.winner) return false;
    if (patronId === 'treasury') {
      return p.coin >= 2 && p.played.length > 0;
    }
    if (!this.state.matchPatrons.includes(patronId)) return false;
    const pat = this.patronsById[patronId];
    const fav = this._favorFor(patronId); // 1 favored for me, -1 for opp, 0 neutral
    const abs = pat.abilities;
    if (fav === 1 && abs.lockFavored) return false;
    const key = fav === 1 ? 'favored' : fav === -1 ? 'unfavored' : 'neutral';
    const ab = abs[key];
    if (!ab || ab.passive) return false;
    const cost = ab.cost || {};
    if ((cost.coin || 0) > p.coin) return false;
    if ((cost.power || 0) > p.power) return false;
    if ((cost.discard || 0) > p.hand.length) return false;
    return true;
  }

  callPatron(patronId) {
    if (!this.canCallPatron(patronId)) return false;
    const p = this.me();
    p.patronCallsLeft -= 1;

    if (patronId === 'treasury') {
      p.coin -= 2;
      // sacrifice weakest played
      p.played.sort((a, b) => this._cardValue(a) - this._cardValue(b));
      const sac = p.played.shift();
      if (sac) p.exile.push(sac);
      this._createToken(p, 'writ-of-coin', 1);
      this._log('Treasury: Writ of Coin');
      this.emit('patron', { id: 'treasury' });
      this.emit('state', this.state);
      return true;
    }

    const pat = this.patronsById[patronId];
    const favBefore = this._favorFor(patronId);
    const key = favBefore === 1 ? 'favored' : favBefore === -1 ? 'unfavored' : 'neutral';
    const ab = pat.abilities[key];
    const cost = ab.cost || {};
    p.coin -= cost.coin || 0;
    p.power -= cost.power || 0;
    if (cost.discard) this._autoDiscard(p, cost.discard);

    this._applyPatronEffect(patronId, ab);

    // Flip favor
    if (patronId === 'hunding' && favBefore === -1 && pat.abilities.flipUnfavoredToFavored) {
      // unfavored → favored for caller
      this.state.favor.hunding = this.state.active === 0 ? 1 : -1;
    } else if (favBefore === 0) {
      this.state.favor[patronId] = this.state.active === 0 ? 1 : -1;
    } else if (favBefore === -1) {
      this.state.favor[patronId] = 0;
    }
    // if already favored, ability was used (rare) — no flip further

    this._log(`Patron: ${pat.short}`);
    this.emit('patron', { id: patronId });

    // All 4 favored?
    if (this._allPatronsFavored()) {
      this.state.winner = this.state.active;
      this._log('Patron victory!');
      this.emit('win', { reason: 'patrons' });
    }
    this.emit('state', this.state);
    return true;
  }

  _allPatronsFavored() {
    return this.state.matchPatrons.every(pid => this._favorFor(pid) === 1);
  }

  _applyPatronEffect(patronId, ab) {
    const p = this.me();
    const o = this.opp();
    switch (ab.effect) {
      case 'sacrifice_for_writ': break;
      case 'agent_to_draw': {
        const agents = p.cooldown.filter(c => this.card(c.id)?.type === 'agent');
        if (agents.length) {
          agents.sort((a, b) => this._cardValue(b) - this._cardValue(a));
          const c = agents[0];
          p.cooldown.splice(p.cooldown.findIndex(x => x.uid === c.uid), 1);
          p.draw.push(c);
        }
        break;
      }
      case 'sacrifice_prestige': {
        if (p.played.length) {
          p.played.sort((a, b) => (this.card(b.id)?.cost || 0) - (this.card(a.id)?.cost || 0));
          const c = p.played.shift();
          const cost = this.card(c.id)?.cost || 0;
          p.prestige += Math.max(0, cost - 1);
          p.exile.push(c);
        }
        break;
      }
      case 'coin_to_power': {
        const coins = p.coin;
        p.power += Math.max(0, coins - 1);
        p.coin = 0;
        break;
      }
      case 'knockout_agent': this._knockout(1); break;
      case 'gain_coin': p.coin += ab.n || 1; break;
      case 'gain_coin_favor': p.coin += ab.n || 1; break;
      case 'draw': this._draw(p, ab.n || 1); break;
      case 'orgnum_favored': {
        const owned = p.hand.length + p.draw.length + p.cooldown.length + p.played.length + p.agents.length;
        p.power += Math.floor(owned / 4);
        this._createToken(p, 'summerset-sacking', 1);
        break;
      }
      case 'orgnum_neutral': {
        const owned = p.hand.length + p.draw.length + p.cooldown.length + p.played.length + p.agents.length;
        p.power += Math.floor(owned / 6);
        break;
      }
      case 'power': p.power += ab.n || 0; break;
      case 'bewilderment': {
        const b = this._inst('bewilderment');
        this._toCooldown(o, b);
        break;
      }
      case 'tavern_remove': this._replaceTavern(ab.n || 2); break;
      case 'look_confine': {
        // Simplified: move top valuable from opp draw to cooldown
        const n = ab.n || 3;
        const seen = [];
        for (let i = 0; i < n && o.draw.length; i++) seen.push(o.draw.pop());
        if (seen.length) {
          seen.sort((a, b) => this._cardValue(b) - this._cardValue(a));
          const move = seen.shift();
          this._toCooldown(o, move);
          for (const c of seen) o.draw.push(c);
        }
        break;
      }
      case 'mora_share': {
        const actions = this.state.tavern
          .map((c, i) => ({ c, i, d: this.card(c.id) }))
          .filter(x => x.d.type === 'action');
        if (actions.length) {
          actions.sort((a, b) => this._buyScore(b.d) - this._buyScore(a.d));
          const pick = actions[0];
          this.state.tavern.splice(pick.i, 1);
          this._toCooldown(p, this._inst(pick.c.id));
          this._toCooldown(o, this._inst(pick.c.id));
          this._refillTavernSlot();
        }
        break;
      }
      case 'create_agent': {
        this._createToken(p, this._slug(ab.card), 1);
        break;
      }
      default:
        break;
    }
  }

  endTurn() {
    if (this.state.winner) return;
    const p = this.me();
    const o = this.opp();

    // Power → Prestige unless opposing taunt
    const oppTaunt = o.agents.some(a => a.taunt);
    if (p.power > 0 && !oppTaunt) {
      p.prestige += p.power;
      this.emit('prestige', { n: p.power });
      this._log(`+${p.power} Prestige from Power`);
    }
    p.power = 0;
    p.coin = 0;

    // Move played to cooldown (non-exiled)
    while (p.played.length) {
      const c = p.played.pop();
      const def = this.card(c.id);
      if (def?.contract && def.type === 'action') {
        p.exile.push(c);
      } else if (def?.type === 'agent') {
        // agents stay on board — shouldn't be in played; if somehow there, skip
      } else {
        this._toCooldown(p, c);
      }
    }
    // Remove agents from played tracking — agents already on board
    p.played = p.played.filter(c => this.card(c.id)?.type !== 'agent');

    // Actually: when we play an agent we still left it in played[]. Remove agent copies from played
    p.played = p.played.filter(c => {
      if (this.card(c.id)?.type === 'agent') return false;
      return true;
    });
    for (const c of [...p.played]) {
      const i = p.played.indexOf(c);
      p.played.splice(i, 1);
      this._toCooldown(p, c);
    }

    // Win checks
    if (p.prestige >= 80) {
      this.state.winner = this.state.active;
      this.emit('win', { reason: '80' });
      this.emit('state', this.state);
      return;
    }

    if (this.state.awaitingLastChance && this.state.lastChance === 1 - this.state.active) {
      // We are the opponent taking last chance
      if (p.prestige <= o.prestige) {
        this.state.winner = 1 - this.state.active;
        this.emit('win', { reason: '40-hold' });
        this.emit('state', this.state);
        return;
      }
      // Surpassed — continue, clear flag
      this.state.awaitingLastChance = false;
      this.state.lastChance = null;
    }

    if (p.prestige >= 40 && !this.state.awaitingLastChance) {
      this.state.awaitingLastChance = true;
      this.state.lastChance = this.state.active;
      this._log(`${p.prestige} Prestige — opponent's last chance!`);
    }

    // Next turn
    this.state.active = 1 - this.state.active;
    this.state.turn += 1;
    this._draw(this.me(), 5);
    this._startTurn();
    this.emit('turnEnd', {});
    this.emit('state', this.state);
  }

  // Legal actions snapshot for AI / UI
  legalActions() {
    const acts = [];
    const p = this.me();
    if (this.state.winner) return acts;
    for (const c of p.hand) acts.push({ type: 'play', uid: c.uid, cardId: c.id });
    this.state.tavern.forEach((c, i) => {
      if (this.canBuy(i)) acts.push({ type: 'buy', index: i, cardId: c.id, cost: this.card(c.id).cost });
    });
    for (const pid of [...this.state.matchPatrons, 'treasury']) {
      if (this.canCallPatron(pid)) acts.push({ type: 'patron', id: pid });
    }
    for (const a of this.opp().agents) {
      const taunts = this.opp().agents.filter(x => x.taunt);
      if (taunts.length && !a.taunt) continue;
      if (p.power >= a.hp) acts.push({ type: 'ko', uid: a.uid, hp: a.hp });
    }
    acts.push({ type: 'end' });
    return acts;
  }
}
