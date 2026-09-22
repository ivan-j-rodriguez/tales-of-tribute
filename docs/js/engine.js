/**
 * Tales of Tribute — rules engine (fan implementation)
 */
import { tavernQty } from './upgrades.js';

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

  newMatch({ playerPatrons, aiPatrons, playerFirst = true, ownedUpgrades = [] }) {
    const matchPatrons = [...playerPatrons, ...aiPatrons];
    this._ownedUpgrades = ownedUpgrades || [];
    const tavernPile = this._buildTavern(matchPatrons, this._ownedUpgrades);
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
        playedThisTurn: [],
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

    for (const card of tavern) this.emit('tavernDeal', { card, opening: true });
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

  _buildTavern(matchPatrons, ownedUpgrades = []) {
    const pile = [];
    const owned = ownedUpgrades || [];
    const addDeck = (patronId) => {
      for (const c of Object.values(this.cardsById)) {
        if (c.patron !== patronId) continue;
        const qty = tavernQty(c, owned);
        if (qty <= 0) continue;
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

  _fillDraw(player) {
    if (player.draw.length || !player.cooldown.length) return false;
    player.draw = player.cooldown.splice(0);
    this._shuffle(player.draw);
    this.emit('shuffle', { player });
    return true;
  }

  _draw(player, n) {
    for (let i = 0; i < n; i++) {
      if (!player.draw.length) this._fillDraw(player);
      if (!player.draw.length) break;
      const c = player.draw.pop();
      player.hand.push(c);
      this.emit('draw', { player, card: c });
    }
  }

  /** Top of the draw, shuffling cooldown in when the draw pile runs out. Restores the cards. */
  _peekDraw(player, n) {
    const got = [];
    for (let i = 0; i < n; i++) {
      if (!player.draw.length) this._fillDraw(player);
      if (!player.draw.length) break;
      got.push(player.draw.pop());
    }
    for (let i = got.length - 1; i >= 0; i--) player.draw.push(got[i]);
    return got;
  }

  _drawUpTo(player, cap) {
    const need = Math.max(0, cap - player.hand.length);
    if (need) this._draw(player, need);
  }

  /** Contracts never enter a player's cooldown, draw, or hand cycle. */
  _isContract(card) {
    return !!this.card(card?.id)?.contract;
  }

  _exile(player, card) {
    if (!card || !player) return;
    if (player.exile.some(c => c.uid === card.uid)) return;
    player.exile.push(card);
  }

  _toCooldown(player, card) {
    if (!card || !player) return;
    // One guard for every caller: discard, toss, donate, acquire, confine
    // release, bargain copies, created cards, end-of-turn flush, and buy.
    if (this._isContract(card)) {
      this._exile(player, card);
      return;
    }
    player.cooldown.push(card);
    this._triggerPassives(player, 'cooldown', card);
    if (this.card(card.id)?.type === 'agent') {
      this._triggerPassives(player, 'agent_cooldown', card);
    }
  }

  _triggerPassives(owner, trigger, card, exceptUid = null) {
    // Agents stay in play. Action passives last while that card is in the played row.
    for (const pl of this.state.players) {
      const sources = [...pl.agents, ...pl.played];
      for (const ag of sources) {
        if (exceptUid && ag.uid === exceptUid) continue;
        const def = this.card(ag.id);
        if (!def) continue;
        for (const e of def.play || []) {
          if (e.op !== 'passive' || e.trigger !== trigger) continue;
          // "When an Agent is played" pays the passive's owner, whoever played the agent.
          if (trigger === 'agent_play') this._grant(pl, e.resource, e.n);
          else if (pl === owner) this._grant(pl, e.resource, e.n);
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
    p.playedThisTurn = [];
    // Hunding favored start coin
    for (const pid of this.state.matchPatrons) {
      if (pid === 'hunding' && this._favorFor(pid) === 1) {
        p.coin += 1;
        this._log('Hunding favor: +1 Coin');
      }
    }
    // The player who acts second gets 1 Coin on their first turn.
    if (this.state.turn === 2 && !p.openingCoin) {
      p.coin += 1;
      p.openingCoin = true;
      this._log('Second player: +1 Coin');
    }
    // Setbacks resolve before the draw-up, so a draw setback is extra only when the hand is already full.
    if (p.setback.coin) { p.coin += p.setback.coin; this._log(`Setback: +${p.setback.coin} Coin`); }
    if (p.setback.power) { p.power += p.setback.power; this._log(`Setback: +${p.setback.power} Power`); }
    if (p.setback.draw) { this._draw(p, p.setback.draw); this._log(`Setback: Draw ${p.setback.draw}`); }
    p.setback = { coin: 0, power: 0, draw: 0 };
    this._drawUpTo(p, 5);
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
    if (this.state.winner || this.state.phase !== 'main') return false;
    if (!p.hand.some(c => c.uid === uid)) return false;
    const curses = p.hand.filter(c => this.card(c.id)?.curse);
    if (curses.length && !curses.some(c => c.uid === uid)) return false;
    return true;
  }

  playCard(uid, choiceIndex = 0, picks = null) {
    if (!this.canPlay(uid)) return false;
    this._picks = this._clonePicks(picks);
    this._strictPicks = picks != null && !this.me().isAI;
    if (this._picks?.choose != null) choiceIndex = this._picks.choose;
    const p = this.me();
    const idx = p.hand.findIndex(c => c.uid === uid);
    if (idx < 0) { this._picks = null; return false; }
    const card = p.hand.splice(idx, 1)[0];
    const def = this.card(card.id);
    p.playedThisTurn = p.playedThisTurn || [];
    p.playedThisTurn.push({ uid: card.uid, id: card.id, patron: def.patron });

    const suit = def.patron;
    p.suitsPlayed[suit] = (p.suitsPlayed[suit] || 0) + 1;
    const comboCount = p.suitsPlayed[suit];

    this._log(`Play ${def.name}`);
    this.emit('play', { card, def, comboCount });

    // Agents enter the row before effects so Confine and Heal attach to this card.
    if (def.type === 'agent') {
      card.hp = def.hp || card.hp || 2;
      card.maxHp = def.hp || card.maxHp || 2;
      card.taunt = !!def.taunt;
      card.confined = card.confined || [];
      p.agents.push(card);
      this._triggerPassives(p, 'agent_play', card, card.uid);
      this.emit('agentEnter', { agent: card });
    } else {
      p.played.push(card);
    }

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

    // Contract actions: resolve then EXILE (never cooldown). Contract agents stay
    // on the row until defeat, which exiles them.
    if (def.contract && def.type === 'action') {
      const pi = p.played.findIndex(c => c.uid === card.uid);
      if (pi >= 0) p.played.splice(pi, 1);
      this._exile(p, card);
    }

    this._picks = null;
    this._strictPicks = false;
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
      case 'destroy': this._destroy(p, e.n, ctx.card?.uid); break;
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
        const opts = e.options || [];
        let pick = ctx.choiceIndex || 0;
        if (this._picks?.choose != null) pick = this._picks.choose;
        else if (p.isAI) pick = this._bestChoice(opts);
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
      const uid = this._pullPick('discard');
      if (uid) {
        const f = this._pluck(p, uid, ['hand']);
        if (!f) continue;
        this._toCooldown(p, f.card);
        this._triggerPassives(p, 'discard', f.card);
        continue;
      }
      if (!this._useAutoPick()) break;
      if (!p.hand.length) break;
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
      const uid = this._pullPick('donate');
      let c = null;
      if (uid) {
        const f = this._pluck(p, uid, ['hand']);
        c = f?.card || null;
      }
      if (!c) {
        if (!this._useAutoPick() || !p.hand.length) break;
        p.hand.sort((a, b) => this._cardValue(a) - this._cardValue(b));
        c = p.hand.shift();
      }
      if (!c) break;
      this._toCooldown(p, c);
      this._triggerPassives(p, 'discard', c);
      this._draw(p, 1);
    }
  }

  _toss(p, n) {
    const seen = [];
    for (let i = 0; i < n; i++) {
      if (!p.draw.length) this._fillDraw(p);
      if (!p.draw.length) break;
      seen.push(p.draw.pop());
    }
    if (!seen.length) return;
    const tossUids = this._pullPickList('toss');
    if (tossUids && tossUids.length) {
      const toCD = seen.filter(c => tossUids.includes(c.uid));
      const toTop = seen.filter(c => !tossUids.includes(c.uid));
      for (const c of toCD) this._toCooldown(p, c);
      for (const c of toTop.reverse()) p.draw.push(c);
      return;
    }
    if (!this._useAutoPick()) {
      for (const c of seen.reverse()) p.draw.push(c);
      return;
    }
    seen.sort((a, b) => this._cardValue(a) - this._cardValue(b));
    const keep = Math.ceil(seen.length / 2);
    const toCD = seen.slice(0, seen.length - keep);
    const toTop = seen.slice(seen.length - keep);
    for (const c of toCD) this._toCooldown(p, c);
    for (const c of toTop.reverse()) p.draw.push(c);
  }

  _destroy(p, n, exceptUid = null) {
    for (let i = 0; i < n; i++) {
      const uid = this._pullPick('destroy');
      if (uid) {
        if (uid === exceptUid) continue;
        const f = this._pluck(p, uid, ['played', 'hand']);
        if (!f) continue;
        this._exile(p, f.card);
        this._log(`Destroy ${this.card(f.card.id)?.name}`);
        this.emit('sacrifice', { card: f.card });
        continue;
      }
      if (!this._useAutoPick()) break;
      const pool = [...p.played, ...p.hand].filter(c => c.uid !== exceptUid);
      if (!pool.length) break;
      pool.sort((a, b) => this._cardValue(a) - this._cardValue(b));
      const f = this._pluck(p, pool[0].uid, ['played', 'hand']);
      if (!f) break;
      this._exile(p, f.card);
      this._log(`Destroy ${this.card(f.card.id)?.name}`);
      this.emit('sacrifice', { card: f.card });
    }
  }

  _replaceTavern(n) {
    for (let i = 0; i < n; i++) {
      if (!this.state.tavern.length) break;
      const pickUid = this._pullPick('replace');
      let idx = -1;
      if (pickUid) idx = this.state.tavern.findIndex(c => c.uid === pickUid || c.id === pickUid);
      if (idx < 0 && typeof pickUid === 'number') idx = pickUid;
      if (idx < 0) {
        if (!this._useAutoPick()) break;
        idx = 0;
        if (this.me().isAI) {
          let worst = 999;
          this.state.tavern.forEach((c, i) => {
            const d = this.card(c.id);
            const score = d.cost <= this.me().coin ? -(d.cost + 5) : d.cost;
            if (score < worst) { worst = score; idx = i; }
          });
        } else {
          idx = Math.floor(Math.random() * this.state.tavern.length);
        }
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
      this.emit('shuffle', { pile: 'tavern' });
    }
    if (this.state.tavernPile.length && this.state.tavern.length < 5) {
      const card = this.state.tavernPile.pop();
      this.state.tavern.push(card);
      this.emit('tavernDeal', { card });
    }
  }

  _acquire(p, maxCost) {
    // Acquire puts a tavern card into cooldown. Contracts are not legal targets
    // (Bargain is explicitly non-contract; a contract must never cycle).
    const affordable = this.state.tavern
      .map((c, i) => ({ c, i, d: this.card(c.id) }))
      .filter(x => x.d && x.d.cost <= maxCost && !x.d.contract);
    if (!affordable.length) return;
    const pickUid = this._pullPick('acquire');
    let pick = pickUid
      ? affordable.find(x => x.c.uid === pickUid || x.c.id === pickUid)
      : null;
    if (!pick) {
      if (!this._useAutoPick()) return;
      affordable.sort((a, b) => b.d.cost - a.d.cost || this._buyScore(b.d) - this._buyScore(a.d));
      pick = affordable[0];
    }
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
      const uid = this._pullPick('knockout');
      let target = null;
      if (uid) {
        target = o.agents.find(a => a.uid === uid);
        const taunts = o.agents.filter(a => a.taunt);
        if (target && taunts.length && !target.taunt) target = null;
      } else if (this._useAutoPick()) {
        target = this._pickKnockTarget(o);
      }
      if (!target) {
        if (uid) continue;
        break;
      }
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
    this._releaseConfined(owner, agent);
    const def = this.card(agent.id);
    if (def?.contract) {
      this._exile(owner, agent);
    } else {
      this._toCooldown(owner, agent);
    }
    this._log(`Knock out ${def?.name}`);
    this.emit('knockout', { agent, ownerIsActive: owner === this.me() });
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

  _releaseConfined(owner, agent) {
    if (!agent) return;
    // Confined cards were taken from the opponent. They return to that player.
    const rival = this.state.players.find(pl => pl !== owner) || owner;
    for (const c of agent.confined || []) this._toCooldown(rival, c);
    agent.confined = [];
  }

  _heal(card, n) {
    const p = this.me();
    const agent = card && p.agents.find(a => a.uid === card.uid);
    if (agent) agent.hp = Math.min(agent.maxHp || agent.hp, agent.hp + n);
  }

  _createToken(p, cardId, n) {
    let made = 0;
    for (let i = 0; i < n; i++) {
      if (!this.cardsById[cardId]) continue;
      const c = this._inst(cardId);
      this._toCooldown(p, c);
      this._log(`Create ${this.card(cardId).name}`);
      made += 1;
    }
    if (made && (cardId === 'writ-of-coin' || cardId === 'gold')) {
      this.emit('writ', { cardId, n: made });
    }
  }

  _handRefresh(p, n) {
    // Official Refresh returns cards to the top of the draw pile, not the hand.
    this._drawRefresh(p, n, false);
  }

  _drawRefresh(p, n, agentsOnly) {
    for (let i = 0; i < n; i++) {
      const uid = this._pullPick('refreshDraw');
      if (uid) {
        const f = this._pluck(p, uid, ['cooldown']);
        if (f) p.draw.push(f.card);
        continue;
      }
      if (!this._useAutoPick()) break;
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
      const uid = this._pullPick('confine');
      let c = null;
      if (uid) {
        const idx = o.cooldown.findIndex(x => x.uid === uid);
        if (idx >= 0) c = o.cooldown.splice(idx, 1)[0];
      }
      if (!c) {
        if (!this._useAutoPick() || !o.cooldown.length) break;
        o.cooldown.sort((a, b) => this._cardValue(b) - this._cardValue(a));
        c = o.cooldown.shift();
      }
      if (!c) break;
      if (agent) {
        agent.confined.push(c);
        this.emit('confine', { agent, card: c });
      } else this._toCooldown(o, c);
    }
  }

  canBuy(tavernIndex) {
    const p = this.me();
    const c = this.state.tavern[tavernIndex];
    if (!c || this.state.winner) return false;
    const d = this.card(c.id);
    return p.coin >= d.cost;
  }

  buy(tavernIndex, picks = null) {
    if (!this.canBuy(tavernIndex)) return false;
    const p = this.me();
    const c = this.state.tavern.splice(tavernIndex, 1)[0];
    const d = this.card(c.id);
    p.coin -= d.cost;
    if (d.contract) {
      // Official: a contract is played immediately. It never enters cooldown.
      p.hand.push(c);
      const played = this.playCard(c.uid, picks?.choose || 0, picks);
      if (!played) {
        const hi = p.hand.findIndex(x => x.uid === c.uid);
        if (hi >= 0) p.hand.splice(hi, 1);
        this.state.tavern.splice(Math.min(tavernIndex, this.state.tavern.length), 0, c);
        p.coin += d.cost;
        return false;
      }
      this._log(`Buy ${d.name} (${d.cost})`);
      this.emit('buy', { card: c, def: d });
      this._refillTavernSlot();
      this.emit('state', this.state);
      return true;
    }
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
      return p.coin >= 2 && this._sacrificePool(p, ['hand', 'played'], 0).length > 0;
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
    if (ab.effect === 'sacrifice_prestige' && !this._sacrificePool(p, ['played', 'agents'], 1).length) return false;
    return true;
  }

  callPatron(patronId, picks = null) {
    if (!this.canCallPatron(patronId)) return false;
    this._picks = this._clonePicks(picks);
    this._strictPicks = picks != null && !this.me().isAI;
    const p = this.me();
    p.patronCallsLeft -= 1;

    if (patronId === 'treasury') {
      p.coin -= 2;
      const uid = this._pullPick('sacrifice');
      let sac = uid ? this._pluck(p, uid, ['hand', 'played'])?.card : null;
      if (!sac && this._useAutoPick()) {
        const pool = this._sacrificePool(p, ['played', 'hand'], 0);
        pool.sort((a, b) => this._cardValue(a) - this._cardValue(b));
        sac = pool[0] ? this._pluck(p, pool[0].uid, ['hand', 'played'])?.card : null;
      }
      if (!sac) {
        p.coin += 2;
        p.patronCallsLeft += 1;
        this._picks = null;
        this._strictPicks = false;
        return false;
      }
      this._releaseConfined(p, sac);
      this._exile(p, sac);
      this.emit('sacrifice', { card: sac });
      this._createToken(p, 'writ-of-coin', 1);
      this._log('Treasury: Writ of Coin');
      this.emit('patron', { id: 'treasury' });
      this._picks = null;
      this._strictPicks = false;
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

    // Official dial: Neutral → you. Unfavored → Neutral.
    // Already Favored: stay (Crows/Hunding lock). Ansei jumps Unfavored → Favored.
    // Treasury and Mora never take a side.
    const neverTurns = !!(pat.alwaysNeutral || pat.abilities?.alwaysNeutral || patronId === 'mora' || patronId === 'treasury');
    if (!neverTurns) {
      if ((patronId === 'hunding' || pat.abilities?.flipUnfavoredToFavored) && favBefore === -1) {
        this.state.favor[patronId] = this.state.active === 0 ? 1 : -1;
      } else if (favBefore === 0) {
        this.state.favor[patronId] = this.state.active === 0 ? 1 : -1;
      } else if (favBefore === -1) {
        this.state.favor[patronId] = 0;
      }
    }

    this._log(`Patron: ${pat.short}`);
    this.emit('patron', { id: patronId });
    this._picks = null;
    this._strictPicks = false;

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
        const uid = this._pullPick('refreshDraw');
        if (uid) {
          const f = this._pluck(p, uid, ['cooldown']);
          if (f) p.draw.push(f.card);
          break;
        }
        if (!this._useAutoPick()) break;
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
        const uid = this._pullPick('sacrifice');
        let c = uid ? this._pluck(p, uid, ['played', 'agents'])?.card : null;
        if (!c && this._useAutoPick()) {
          const pool = this._sacrificePool(p, ['played', 'agents'], 1);
          pool.sort((a, b) => (this.card(b.id)?.cost || 0) - (this.card(a.id)?.cost || 0));
          c = pool[0] ? this._pluck(p, pool[0].uid, ['played', 'agents'])?.card : null;
        }
        if (c) {
          this._releaseConfined(p, c);
          const cost = this.card(c.id)?.cost || 0;
          p.prestige += Math.max(0, cost - 1);
          this._exile(p, c);
          this.emit('sacrifice', { card: c });
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
        const n = ab.n || 3;
        const seen = [];
        for (let i = 0; i < n; i++) {
          if (!o.draw.length) this._fillDraw(o);
          if (!o.draw.length) break;
          seen.push(o.draw.pop());
        }
        if (!seen.length) break;
        const uid = this._pullPick('lookConfine');
        let move = uid ? seen.find(c => c.uid === uid) : null;
        if (!move && this._useAutoPick()) {
          seen.sort((a, b) => this._cardValue(b) - this._cardValue(a));
          move = seen[0];
        }
        if (move) {
          this._toCooldown(o, move);
          for (const c of seen) if (c.uid !== move.uid) o.draw.push(c);
        } else {
          for (const c of seen.reverse()) o.draw.push(c);
        }
        break;
      }
      case 'mora_share': {
        // Bargain: a non-contract action. Both players gain a cooldown copy.
        const actions = this.state.tavern
          .map((c, i) => ({ c, i, d: this.card(c.id) }))
          .filter(x => x.d && x.d.type === 'action' && !x.d.contract);
        if (!actions.length) break;
        const pickUid = this._pullPick('moraShare');
        let pick = pickUid ? actions.find(x => x.c.uid === pickUid || x.c.id === pickUid) : null;
        if (!pick && this._useAutoPick()) {
          actions.sort((a, b) => this._buyScore(b.d) - this._buyScore(a.d));
          pick = actions[0];
        }
        if (!pick) break;
        this.state.tavern.splice(pick.i, 1);
        this._toCooldown(p, this._inst(pick.c.id));
        this._toCooldown(o, this._inst(pick.c.id));
        this._refillTavernSlot();
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

    // Move played to cooldown. Contract actions exile. A contract agent left in
    // played (not seated) exiles too — it must not fall through to cooldown.
    while (p.played.length) {
      const c = p.played.pop();
      const def = this.card(c.id);
      if (def?.contract && def.type === 'action') {
        this._exile(p, c);
      } else if (def?.type === 'agent') {
        const seated = p.agents.some(a => a.uid === c.uid);
        if (def.contract && !seated) this._exile(p, c);
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

    // Next turn. The only draw is _drawUpTo inside _startTurn.
    this.state.active = 1 - this.state.active;
    this.state.turn += 1;
    this._startTurn();
    this.emit('turnEnd', {});
    this.emit('state', this.state);
  }

  _useAutoPick() {
    return !this._strictPicks;
  }

  _clonePicks(picks) {
    if (!picks) return null;
    const out = { ...picks };
    for (const k of Object.keys(out)) {
      if (Array.isArray(out[k])) out[k] = [...out[k]];
    }
    return out;
  }

  _pullPick(kind) {
    if (!this._picks) return null;
    const bag = this._picks;
    if (Array.isArray(bag[kind])) return bag[kind].length ? bag[kind].shift() : null;
    if (bag[kind] != null) {
      const v = bag[kind];
      bag[kind] = null;
      return v;
    }
    return null;
  }

  _pullPickList(kind) {
    if (!this._picks || this._picks[kind] == null) return null;
    const v = this._picks[kind];
    this._picks[kind] = null;
    return Array.isArray(v) ? v : [v];
  }

  _pluck(p, uid, zones) {
    for (const z of zones) {
      const arr = z === 'hand' ? p.hand
        : z === 'played' ? p.played
        : z === 'agents' ? p.agents
        : z === 'cooldown' ? p.cooldown
        : z === 'draw' ? p.draw
        : null;
      if (!arr) continue;
      const i = arr.findIndex(c => c.uid === uid);
      if (i >= 0) return { card: arr.splice(i, 1)[0], zone: z };
    }
    return null;
  }

  _sacrificePool(p, zones, minCost = 0) {
    const out = [];
    for (const z of zones) {
      const arr = z === 'hand' ? p.hand : z === 'played' ? p.played : z === 'agents' ? p.agents : [];
      for (const c of arr) {
        if ((this.card(c.id)?.cost || 0) >= minCost) out.push(c);
      }
    }
    return out;
  }

  _effectsForDef(def, choiceIndex = null) {
    if (!def) return [];
    const p = this.me();
    const combo = (p.suitsPlayed[def.patron] || 0) + 1;
    const raw = [...(def.play || [])];
    if (combo >= 2) raw.push(...(def.combo2 || []));
    if (combo >= 3) raw.push(...(def.combo3 || []));
    if (combo >= 4) raw.push(...(def.combo4 || []));
    const out = [];
    for (const e of raw) {
      if (e.op === 'choose') {
        if (choiceIndex == null) return [{ op: 'choose', options: e.options }];
        out.push(...(e.options?.[choiceIndex] || []));
      } else out.push(e);
    }
    return out;
  }

  _effectsForPlay(uid, choiceIndex = null) {
    const card = this.me().hand.find(c => c.uid === uid);
    if (!card) return [];
    return this._effectsForDef(this.card(card.id), choiceIndex);
  }

  /** Targeting for a contract still in the tavern, before buy plays it. */
  targetingStepsForCardId(cardId, choiceIndex = null) {
    return this._stepsFromEffects(this._effectsForDef(this.card(cardId), choiceIndex));
  }

  targetingStepsForPlay(uid, choiceIndex = null) {
    return this._stepsFromEffects(this._effectsForPlay(uid, choiceIndex), { source: 'play', uid });
  }

  targetingStepsForPatron(patronId) {
    const p = this.me();
    if (patronId === 'treasury') {
      return this._stepsFromEffects([{ op: 'sacrifice', zones: ['hand', 'played'], minCost: 0 }], { source: 'patron', patronId });
    }
    const fav = this._favorFor(patronId);
    const key = fav === 1 ? 'favored' : fav === -1 ? 'unfavored' : 'neutral';
    const ab = this.patronsById[patronId]?.abilities?.[key];
    if (!ab) return [];
    const steps = [];
    if (ab.cost?.discard) steps.push({ kind: 'discard', n: ab.cost.discard, zones: ['hand'] });
    if (ab.effect === 'sacrifice_prestige') steps.push({ kind: 'sacrifice', n: 1, zones: ['played', 'agents'], minCost: 1 });
    if (ab.effect === 'knockout_agent') steps.push({ kind: 'knockout', n: 1 });
    if (ab.effect === 'agent_to_draw') steps.push({ kind: 'refreshDraw', n: 1, agentsOnly: true });
    if (ab.effect === 'tavern_remove') steps.push({ kind: 'replace', n: ab.n || 2 });
    if (ab.effect === 'look_confine') steps.push({ kind: 'lookConfine', n: 1, look: ab.n || 3 });
    if (ab.effect === 'mora_share') steps.push({ kind: 'moraShare', n: 1 });
    return steps.filter(s => s.kind === 'choose' || this.legalTargets(s).length > 0);
  }

  _stepsFromEffects(effects, meta) {
    const sourceUid = meta?.uid || null;
    const steps = [];
    for (const e of effects || []) {
      if (e.op === 'choose') steps.push({ kind: 'choose', options: e.options || [] });
      else if (e.op === 'sacrifice') steps.push({ kind: 'sacrifice', n: e.n || 1, zones: e.zones || ['hand', 'played'], minCost: e.minCost || 0 });
      else if (e.op === 'destroy') steps.push({ kind: 'destroy', n: e.n || 1, zones: ['played', 'hand'], sourceUid });
      else if (e.op === 'knockout') {
        // One agent at a time so Taunt is honored, then the rest.
        const count = e.n || 1;
        for (let i = 0; i < count; i++) steps.push({ kind: 'knockout', n: 1 });
      }
      else if (e.op === 'discard') steps.push({ kind: 'discard', n: e.n || 1, zones: ['hand'], sourceUid });
      else if (e.op === 'donate') steps.push({ kind: 'donate', n: e.n || 1, zones: ['hand'], sourceUid });
      else if (e.op === 'toss') steps.push({ kind: 'toss', n: e.n || 1 });
      else if (e.op === 'replace') steps.push({ kind: 'replace', n: e.n || 1 });
      else if (e.op === 'acquire') steps.push({ kind: 'acquire', n: 1, maxCost: e.n });
      else if (e.op === 'hand_refresh' || e.op === 'draw_refresh') steps.push({ kind: 'refreshDraw', n: e.n || 1, agentsOnly: false });
      else if (e.op === 'draw_refresh_agents') steps.push({ kind: 'refreshDraw', n: e.n || 1, agentsOnly: true });
      else if (e.op === 'confine') steps.push({ kind: 'confine', n: e.n || 1 });
      // Heal is always this agent. No target tray.
    }
    return steps.filter(s => s.kind === 'choose' || s.kind === 'toss' || this.legalTargets(s).length > 0);
  }

  legalTargets(step) {
    if (!this.state || !step) return [];
    const p = this.me();
    const o = this.opp();
    const mark = (c, zone) => ({ uid: c.uid, id: c.id, zone, name: this.card(c.id)?.name || c.id });
    switch (step.kind) {
      case 'sacrifice':
        return this._sacrificePool(p, step.zones || ['hand', 'played'], step.minCost || 0)
          .map(c => mark(c, p.hand.includes(c) ? 'hand' : p.played.includes(c) ? 'played' : 'agents'));
      case 'destroy':
        return [...p.played, ...p.hand]
          .filter(c => c.uid !== step.sourceUid)
          .map(c => mark(c, p.played.includes(c) ? 'played' : 'hand'));
      case 'knockout':
      case 'powerAttack': {
        const exclude = new Set(step.exclude || []);
        let pool = o.agents.filter(a => !exclude.has(a.uid));
        const taunts = pool.filter(a => a.taunt);
        if (taunts.length) pool = taunts;
        if (step.kind === 'powerAttack') pool = pool.filter(a => p.power >= (a.hp || 0));
        return pool.map(c => mark(c, 'opp-agents'));
      }
      case 'discard':
      case 'donate':
        return p.hand.filter(c => c.uid !== step.sourceUid).map(c => mark(c, 'hand'));
      case 'replace':
        return this.state.tavern.map(c => mark(c, 'tavern'));
      case 'acquire':
        return this.state.tavern
          .filter(c => {
            const d = this.card(c.id);
            return d && !d.contract && (d.cost || 0) <= (step.maxCost ?? 99);
          })
          .map(c => mark(c, 'tavern'));
      case 'refreshHand':
        return p.cooldown.map(c => mark(c, 'cooldown'));
      case 'refreshDraw': {
        const pool = step.agentsOnly ? p.cooldown.filter(c => this.card(c.id)?.type === 'agent') : p.cooldown;
        return pool.map(c => mark(c, 'cooldown'));
      }
      case 'confine':
        return o.cooldown.map(c => mark(c, 'opp-cooldown'));
      case 'heal':
        return [];
      case 'toss':
        return this._peekDraw(p, Math.max(1, step.n || 1)).map(c => mark(c, 'draw'));
      case 'lookConfine':
        return this._peekDraw(o, step.look || 3).map(c => mark(c, 'draw'));
      case 'moraShare':
        return this.state.tavern
          .filter(c => {
            const d = this.card(c.id);
            return d && d.type === 'action' && !d.contract;
          })
          .map(c => mark(c, 'tavern'));
      default:
        return [];
    }
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
