import Foundation

/// Swift port of `web/js/engine.js` with official ToT loop corrections documented in STATUS.md:
/// - Both players start with 6 Gold + the four match-patron starters (10-card decks).
/// - Second player gets +1 Coin on their first turn.
/// - Draw **up to** 5 at the start of each turn (leftovers stay).
/// - Contract cards play immediately when bought.
/// - Bewilderment (curse) must be played before any non-curse card.
/// - Patron sweep is checked at end of turn (also after a successful call).
/// - Last chance: opponent must **strictly exceed** the 40-holder.
public final class TributeEngine: @unchecked Sendable {
    public let catalog: Catalog
    public private(set) var state = MatchState()
    public var ownedUpgrades: [String] = []
    public var onChange: (() -> Void)?

    private var lastKnocked = 0
    private var rng: SeededGenerator

    public init(catalog: Catalog, seed: UInt64? = nil) {
        self.catalog = catalog
        self.rng = SeededGenerator(seed: seed ?? UInt64.random(in: 1...UInt64.max))
    }

    public func def(_ id: String) -> CardDef? { catalog.card(id) }

    public func newMatch(playerPatrons: [String], aiPatrons: [String], playerFirst: Bool = true, ownedUpgrades: [String] = []) {
        self.ownedUpgrades = ownedUpgrades
        var s = MatchState()
        s.matchPatrons = playerPatrons + aiPatrons
        s.playerFirst = playerFirst
        s.tavernPile = buildTavern(s.matchPatrons)
        s.tavernPile.shuffle(using: &rng)

        // Official: both players get starters from all four match patrons.
        s.players = [
            makePlayer(isAI: false, patrons: playerPatrons, allPatrons: s.matchPatrons),
            makePlayer(isAI: true, patrons: aiPatrons, allPatrons: s.matchPatrons),
        ]
        s.favor = [:]
        for pid in s.matchPatrons { s.favor[pid] = 0 }
        s.favor["treasury"] = 0
        s.tavern = []
        for _ in 0..<5 {
            if let c = popPile(&s) { s.tavern.append(c) }
        }
        s.active = playerFirst ? 0 : 1
        s.turn = 1
        draw(&s.players[0], 5)
        draw(&s.players[1], 5)
        startTurn(&s)
        state = s
        notify()
    }

    private func makePlayer(isAI: Bool, patrons: [String], allPatrons: [String]) -> PlayerState {
        var deck: [CardInst] = []
        for _ in 0..<6 { deck.append(inst("gold")) }
        for pid in allPatrons {
            if let starter = catalog.patronsById[pid]?.starter {
                deck.append(inst(starter))
            }
        }
        deck.shuffle(using: &rng)
        return PlayerState(isAI: isAI, patrons: patrons, draw: deck)
    }

    public func inst(_ id: String) -> CardInst {
        let d = def(id)
        return CardInst(cardId: id, hp: d?.hp, maxHp: d?.hp, taunt: d?.taunt ?? false)
    }

    private func buildTavern(_ patrons: [String]) -> [CardInst] {
        var pile: [CardInst] = []
        for c in catalog.cards {
            let inMatch = patrons.contains(c.patron) || c.patron == "treasury"
            guard inMatch else { continue }
            let qty = Upgrades.tavernQty(card: c, ownedUpgradeIds: ownedUpgrades)
            for _ in 0..<qty { pile.append(inst(c.id)) }
        }
        return pile
    }

    private func popPile(_ s: inout MatchState) -> CardInst? {
        if s.tavernPile.isEmpty {
            s.tavernPile = s.tavernDiscard
            s.tavernDiscard.removeAll()
            s.tavernPile.shuffle(using: &rng)
        }
        return s.tavernPile.popLast()
    }

    public func me() -> PlayerState { state.players[state.active] }
    public func opp() -> PlayerState { state.players[1 - state.active] }

    private func draw(_ p: inout PlayerState, _ n: Int) {
        for _ in 0..<n {
            if p.draw.isEmpty {
                if p.cooldown.isEmpty { break }
                p.draw = p.cooldown
                p.cooldown.removeAll()
                p.draw.shuffle(using: &rng)
            }
            if let c = p.draw.popLast() { p.hand.append(c) }
        }
    }

    /// Draw until the hand has `cap` cards (official start-of-turn).
    private func drawUpTo(_ p: inout PlayerState, _ cap: Int) {
        let need = max(0, cap - p.hand.count)
        if need > 0 { draw(&p, need) }
    }

    private func toCooldown(_ p: inout PlayerState, _ c: CardInst) {
        p.cooldown.append(c)
        triggerPassives(&p, trigger: "cooldown", card: c)
        if def(c.cardId)?.type == "agent" {
            triggerPassives(&p, trigger: "agent_cooldown", card: c)
        }
    }

    private func triggerPassives(_ owner: inout PlayerState, trigger: String, card: CardInst) {
        for pi in state.players.indices {
            for ag in state.players[pi].agents {
                guard let d = def(ag.cardId) else { continue }
                for e in d.play where e.op == "passive" && e.trigger == trigger {
                    if trigger == "agent_play" || pi == state.active {
                        grant(&state.players[pi], e.resource, e.n ?? 0)
                    }
                }
            }
        }
        _ = owner
        _ = card
    }

    private func grant(_ p: inout PlayerState, _ resource: String?, _ n: Int) {
        switch resource {
        case "coin": p.coin += n
        case "power": p.power += n
        case "prestige": p.prestige += n
        default: break
        }
    }

    private func startTurn(_ s: inout MatchState) {
        var p = s.players[s.active]
        p.coin = 0
        p.power = 0
        p.patronCallsLeft = 1
        p.suitsPlayed = [:]
        p.played = []
        if favorFor(s, "hunding") == 1 { p.coin += 1 }
        // Second player opening Coin (official).
        if s.active == 1 && !p.openingBonusGranted {
            p.coin += 1
            p.openingBonusGranted = true
        }
        p.coin += p.setbackCoin
        p.power += p.setbackPower
        if p.setbackDraw > 0 { draw(&p, p.setbackDraw) }
        p.setbackCoin = 0
        p.setbackPower = 0
        p.setbackDraw = 0
        drawUpTo(&p, 5)
        s.players[s.active] = p
    }

    /// 1 favors active, -1 favors opponent, 0 neutral
    public func favorFor(_ pid: String) -> Int { favorFor(state, pid) }

    private func favorFor(_ s: MatchState, _ pid: String) -> Int {
        let f = s.favor[pid] ?? 0
        if f == 0 { return 0 }
        let mine = s.active == 0 ? 1 : -1
        return f == mine ? 1 : -1
    }

    public func canPlay(_ uid: String) -> Bool {
        guard state.winner == nil else { return false }
        let p = state.players[state.active]
        guard p.hand.contains(where: { $0.uid == uid }) else { return false }
        let curses = p.hand.filter { def($0.cardId)?.isCurse == true }
        if !curses.isEmpty && !curses.contains(where: { $0.uid == uid }) { return false }
        return true
    }

    @discardableResult
    public func playCard(_ uid: String, choice: Int = 0) -> Bool {
        guard canPlay(uid) else { return false }
        guard let idx = state.players[state.active].hand.firstIndex(where: { $0.uid == uid }) else { return false }
        var card = state.players[state.active].hand.remove(at: idx)
        guard let d = def(card.cardId) else { return false }
        state.players[state.active].played.append(card)
        let n = (state.players[state.active].suitsPlayed[d.patron] ?? 0) + 1
        state.players[state.active].suitsPlayed[d.patron] = n
        resolve(d.play, card: &card, choice: choice)
        if n >= 2 { resolve(d.combo2, card: &card, choice: choice) }
        if n >= 3 { resolve(d.combo3, card: &card, choice: choice) }
        if n >= 4 { resolve(d.combo4, card: &card, choice: choice) }
        if d.patron == "druid" { checkChimera(n) }
        if d.type == "agent" {
            if let i = state.players[state.active].played.firstIndex(where: { $0.uid == card.uid }) {
                state.players[state.active].played.remove(at: i)
            }
            card.hp = d.hp ?? 2
            card.maxHp = d.hp ?? 2
            card.taunt = d.taunt
            state.players[state.active].agents.append(card)
            triggerPassives(&state.players[state.active], trigger: "agent_play", card: card)
        }
        if d.contract && d.type == "action" {
            if let i = state.players[state.active].played.firstIndex(where: { $0.uid == card.uid }) {
                state.players[state.active].played.remove(at: i)
            }
            state.players[state.active].exile.append(card)
        }
        state.log.append("Play \(d.name)")
        notify()
        return true
    }

    private func checkChimera(_ combo: Int) {
        guard state.matchPatrons.contains("druid") else { return }
        let need = favorFor("druid") == 1 ? 4 : favorFor("druid") == 0 ? 5 : 99
        guard combo >= need else { return }
        let p = state.players[state.active]
        let piles = p.agents + p.hand + p.draw + p.cooldown + p.played
        if piles.contains(where: { $0.cardId == "the-chimera" }) { return }
        var ch = inst("the-chimera")
        ch.hp = 5
        ch.maxHp = 5
        ch.taunt = true
        state.players[state.active].agents.append(ch)
        state.log.append("The Chimera awakens!")
    }

    private func resolve(_ effects: [Effect], card: inout CardInst, choice: Int) {
        lastKnocked = 0
        for e in effects { resolveOne(e, card: &card, choice: choice) }
    }

    private func resolveOne(_ e: Effect, card: inout CardInst, choice: Int) {
        switch e.op {
        case "coin": state.players[state.active].coin += e.n ?? 0
        case "power": state.players[state.active].power += e.n ?? 0
        case "prestige": state.players[state.active].prestige += e.n ?? 0
        case "opp_prestige":
            state.players[1 - state.active].prestige = max(0, state.players[1 - state.active].prestige + (e.n ?? 0))
        case "draw": draw(&state.players[state.active], e.n ?? 1)
        case "discard": autoDiscard(e.n ?? 1)
        case "donate": donate(e.n ?? 1)
        case "toss": toss(e.n ?? 1)
        case "destroy": destroyPlayed(e.n ?? 1)
        case "replace": replaceTavern(e.n ?? 1)
        case "acquire": acquire(e.n ?? 0)
        case "patron_extra": state.players[state.active].patronCallsLeft += e.n ?? 1
        case "knockout": knockout(e.n ?? 1, coinPer: e.coinPerKnock ?? 0)
        case "coin_per_knock": state.players[state.active].coin += lastKnocked * (e.n ?? 1)
        case "knockout_all": knockoutAll()
        case "heal":
            if let i = state.players[state.active].agents.firstIndex(where: { $0.uid == card.uid }) {
                let mx = state.players[state.active].agents[i].maxHp ?? 2
                state.players[state.active].agents[i].hp = min(mx, (state.players[state.active].agents[i].hp ?? 0) + (e.n ?? 0))
            } else if !state.players[state.active].agents.isEmpty {
                let mx = state.players[state.active].agents[0].maxHp ?? 2
                state.players[state.active].agents[0].hp = min(mx, (state.players[state.active].agents[0].hp ?? 0) + (e.n ?? 0))
            }
        case "sacking": createToken("summerset-sacking", e.n ?? 1)
        case "hand_refresh": handRefresh(e.n ?? 1)
        case "draw_refresh", "draw_refresh_agents":
            drawRefresh(e.n ?? 1, agentsOnly: e.op == "draw_refresh_agents")
        case "setback_draw": state.players[1 - state.active].setbackDraw += e.n ?? 1
        case "setback_coin": state.players[1 - state.active].setbackCoin += e.n ?? 1
        case "setback_power": state.players[1 - state.active].setbackPower += e.n ?? 1
        case "confine": confine(card, e.n ?? 1)
        case "create":
            if let name = e.card { createToken(slug(name), e.n ?? 1) }
        case "choose":
            if let opts = e.options, !opts.isEmpty {
                var pick = min(choice, opts.count - 1)
                if state.players[state.active].isAI { pick = bestChoice(opts) }
                resolve(opts[pick], card: &card, choice: 0)
            }
        default: break
        }
    }

    private func slug(_ name: String) -> String {
        name.lowercased()
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "’", with: "")
            .replacingOccurrences(of: " ", with: "-")
    }

    private func bestChoice(_ opts: [[Effect]]) -> Int {
        var best = 0, score = -1
        for (i, opt) in opts.enumerated() {
            var s = 0
            for e in opt {
                if e.op == "power" { s += (e.n ?? 0) * 3 }
                if e.op == "coin" { s += (e.n ?? 0) * 2 }
                if e.op == "prestige" { s += (e.n ?? 0) * 4 }
                if e.op == "draw_refresh" || e.op == "acquire" { s += 5 }
                if e.op == "knockout_all" { s += 8 }
            }
            if s > score { score = s; best = i }
        }
        return best
    }

    private func cardValue(_ c: CardInst) -> Int {
        guard let d = def(c.cardId) else { return 0 }
        if d.isCurse { return -10 }
        if d.id == "gold" { return 0 }
        return d.cost + (d.type == "agent" ? 2 : 0)
    }

    private func autoDiscard(_ n: Int) {
        for _ in 0..<n {
            guard !state.players[state.active].hand.isEmpty else { break }
            state.players[state.active].hand.sort { cardValue($0) < cardValue($1) }
            let c = state.players[state.active].hand.removeFirst()
            toCooldown(&state.players[state.active], c)
        }
    }

    private func donate(_ n: Int) {
        for _ in 0..<n {
            guard !state.players[state.active].hand.isEmpty else { break }
            state.players[state.active].hand.sort { cardValue($0) < cardValue($1) }
            let c = state.players[state.active].hand.removeFirst()
            toCooldown(&state.players[state.active], c)
            draw(&state.players[state.active], 1)
        }
    }

    private func toss(_ n: Int) {
        var seen: [CardInst] = []
        for _ in 0..<n {
            if let c = state.players[state.active].draw.popLast() { seen.append(c) }
        }
        guard !seen.isEmpty else { return }
        seen.sort { cardValue($0) < cardValue($1) }
        let keep = max(1, Int(ceil(Double(seen.count) / 2.0)))
        for c in seen.prefix(seen.count - keep) { toCooldown(&state.players[state.active], c) }
        for c in seen.suffix(keep) { state.players[state.active].draw.append(c) }
    }

    private func destroyPlayed(_ n: Int) {
        for _ in 0..<n {
            guard !state.players[state.active].played.isEmpty else { break }
            state.players[state.active].played.sort { cardValue($0) < cardValue($1) }
            let c = state.players[state.active].played.removeFirst()
            state.players[state.active].exile.append(c)
        }
    }

    private func replaceTavern(_ n: Int) {
        for _ in 0..<n where !state.tavern.isEmpty {
            var idx = 0
            if state.players[state.active].isAI {
                var worst = 999
                for (i, c) in state.tavern.enumerated() {
                    let d = def(c.cardId)
                    let score = (d?.cost ?? 0) <= state.players[state.active].coin ? -((d?.cost ?? 0) + 5) : (d?.cost ?? 0)
                    if score < worst { worst = score; idx = i }
                }
            } else {
                idx = Int.random(in: 0..<state.tavern.count, using: &rng)
            }
            state.tavernDiscard.append(state.tavern.remove(at: idx))
            refillTavern()
        }
    }

    private func refillTavern() {
        if let c = popPile(&state), state.tavern.count < 5 {
            state.tavern.append(c)
        }
    }

    private func acquire(_ maxCost: Int) {
        let affordable = state.tavern.enumerated().compactMap { i, c -> (Int, CardInst, CardDef)? in
            guard let d = def(c.cardId), d.cost <= maxCost else { return nil }
            return (i, c, d)
        }
        guard let pick = affordable.max(by: { $0.2.cost < $1.2.cost }) else { return }
        state.tavern.remove(at: pick.0)
        toCooldown(&state.players[state.active], pick.1)
        refillTavern()
    }

    private func createToken(_ id: String, _ n: Int) {
        for _ in 0..<n where catalog.cardsById[id] != nil {
            toCooldown(&state.players[state.active], inst(id))
        }
    }

    private func handRefresh(_ n: Int) {
        for _ in 0..<n {
            guard !state.players[state.active].cooldown.isEmpty else { break }
            state.players[state.active].cooldown.sort { cardValue($0) > cardValue($1) }
            state.players[state.active].hand.append(state.players[state.active].cooldown.removeFirst())
        }
    }

    private func drawRefresh(_ n: Int, agentsOnly: Bool) {
        for _ in 0..<n {
            guard let i = state.players[state.active].cooldown.firstIndex(where: {
                !agentsOnly || def($0.cardId)?.type == "agent"
            }) else { break }
            let c = state.players[state.active].cooldown.remove(at: i)
            state.players[state.active].draw.append(c)
        }
    }

    private func confine(_ agentCard: CardInst, _ n: Int) {
        let opp = 1 - state.active
        guard let ai = state.players[state.active].agents.firstIndex(where: { $0.uid == agentCard.uid }) else { return }
        for _ in 0..<n {
            guard !state.players[opp].cooldown.isEmpty else { break }
            state.players[opp].cooldown.sort { cardValue($0) > cardValue($1) }
            let c = state.players[opp].cooldown.removeFirst()
            state.players[state.active].agents[ai].confined.append(c)
        }
    }

    private func knockout(_ n: Int, coinPer: Int) {
        for _ in 0..<n {
            guard let target = pickKnockTarget(1 - state.active) else { break }
            defeat(1 - state.active, target)
            lastKnocked += 1
            if coinPer > 0 { state.players[state.active].coin += coinPer }
        }
    }

    private func knockoutAll() {
        for pi in 0..<2 {
            for a in state.players[pi].agents { defeat(pi, a) }
        }
    }

    private func pickKnockTarget(_ owner: Int) -> CardInst? {
        let taunts = state.players[owner].agents.filter { $0.taunt }
        let pool = taunts.isEmpty ? state.players[owner].agents : taunts
        return pool.min(by: { ($0.hp ?? 0) < ($1.hp ?? 0) })
    }

    private func defeat(_ owner: Int, _ agent: CardInst) {
        guard let i = state.players[owner].agents.firstIndex(where: { $0.uid == agent.uid }) else { return }
        let a = state.players[owner].agents.remove(at: i)
        for c in a.confined { toCooldown(&state.players[owner], c) }
        if def(a.cardId)?.contract == true {
            state.players[owner].exile.append(a)
        } else {
            toCooldown(&state.players[owner], a)
        }
        state.log.append("Knock out \(def(a.cardId)?.name ?? a.cardId)")
    }

    @discardableResult
    public func knockoutWithPower(_ uid: String) -> Bool {
        guard let agent = state.players[1 - state.active].agents.first(where: { $0.uid == uid }) else { return false }
        let taunts = state.players[1 - state.active].agents.filter { $0.taunt }
        if !taunts.isEmpty && !agent.taunt { return false }
        let need = agent.hp ?? 1
        guard state.players[state.active].power >= need else { return false }
        state.players[state.active].power -= need
        defeat(1 - state.active, agent)
        notify()
        return true
    }

    public func canBuy(_ i: Int) -> Bool {
        guard state.winner == nil, state.tavern.indices.contains(i), let d = def(state.tavern[i].cardId) else { return false }
        return state.players[state.active].coin >= d.cost
    }

    @discardableResult
    public func buy(_ i: Int) -> Bool {
        guard canBuy(i) else { return false }
        let c = state.tavern.remove(at: i)
        guard let d = def(c.cardId) else { return false }
        state.players[state.active].coin -= d.cost
        if d.contract {
            // Official: contracts play immediately when bought.
            state.players[state.active].hand.append(c)
            playCard(c.uid)
        } else {
            toCooldown(&state.players[state.active], c)
            state.log.append("Buy \(d.name) (\(d.cost))")
            refillTavern()
            notify()
        }
        if d.contract { refillTavern(); notify() }
        return true
    }

    public func canCall(_ pid: String) -> Bool {
        guard state.winner == nil, state.players[state.active].patronCallsLeft > 0 else { return false }
        if pid == "treasury" {
            return state.players[state.active].coin >= 2 && !state.players[state.active].played.isEmpty
        }
        guard state.matchPatrons.contains(pid), let pat = catalog.patronsById[pid] else { return false }
        let fav = favorFor(pid)
        if fav == 1 && pat.abilities.lockFavored == true { return false }
        let ab = ability(pat, fav)
        guard let ab, ab.passive == nil, ab.effect != nil else { return false }
        let cost = ab.cost ?? [:]
        if (cost["coin"] ?? 0) > state.players[state.active].coin { return false }
        if (cost["power"] ?? 0) > state.players[state.active].power { return false }
        if (cost["discard"] ?? 0) > state.players[state.active].hand.count { return false }
        return true
    }

    private func ability(_ pat: PatronDef, _ fav: Int) -> PatronAbility? {
        if fav == 1 { return pat.abilities.favored }
        if fav == -1 { return pat.abilities.unfavored }
        return pat.abilities.neutral
    }

    public func favorForViewer(_ pid: String, viewer: Int) -> Int {
        let f = state.favor[pid] ?? 0
        if f == 0 { return 0 }
        let mine = viewer == 0 ? 1 : -1
        return f == mine ? 1 : -1
    }

    public func abilityText(for pid: String, viewer: Int = 0) -> (title: String, body: String, state: String) {
        let pat = catalog.patronsById[pid]
        let name = pat?.name ?? pid
        if pid == "treasury" {
            return (name, pat?.abilities.neutral?.desc ?? "Pay 2 Coin, sacrifice a played card, create Writ of Coin in cooldown.", "NEUTRAL")
        }
        let fav = favorForViewer(pid, viewer: viewer)
        let label = fav == 1 ? "FAVORED" : fav == -1 ? "UNFAVORED" : "NEUTRAL"
        let ab = pat.map { ability($0, fav) } ?? nil
        return (name, ab?.desc ?? "", label)
    }

    @discardableResult
    public func callPatron(_ pid: String) -> Bool {
        guard canCall(pid) else { return false }
        state.players[state.active].patronCallsLeft -= 1
        if pid == "treasury" {
            state.players[state.active].coin -= 2
            if !state.players[state.active].played.isEmpty {
                state.players[state.active].played.sort { cardValue($0) < cardValue($1) }
                let sac = state.players[state.active].played.removeFirst()
                state.players[state.active].exile.append(sac)
            }
            createToken("writ-of-coin", 1)
            state.log.append("Treasury: Writ of Coin")
            notify()
            return true
        }
        let pat = catalog.patronsById[pid]!
        let favBefore = favorFor(pid)
        let ab = ability(pat, favBefore)
        let cost = ab?.cost ?? [:]
        state.players[state.active].coin -= cost["coin"] ?? 0
        state.players[state.active].power -= cost["power"] ?? 0
        if let d = cost["discard"], d > 0 { autoDiscard(d) }
        applyPatron(pid, ab)
        let neverTurns = pat.neverTurns
        if !neverTurns {
            if (pid == "hunding" || pat.abilities.flipUnfavoredToFavored == true) && favBefore == -1 {
                state.favor[pid] = state.active == 0 ? 1 : -1
            } else if favBefore == 0 {
                state.favor[pid] = state.active == 0 ? 1 : -1
            } else if favBefore == -1 {
                state.favor[pid] = 0
            }
        }
        state.log.append("Patron: \(pat.short)")
        checkPatronSweep()
        notify()
        return true
    }

    private func checkPatronSweep() {
        if state.matchPatrons.allSatisfy({ favorFor($0) == 1 }) {
            state.winner = state.active
            state.winReason = "patrons"
            state.log.append("Patron victory!")
        }
    }

    private func applyPatron(_ pid: String, _ ab: PatronAbility?) {
        guard let effect = ab?.effect else { return }
        switch effect {
        case "agent_to_draw":
            if let i = state.players[state.active].cooldown.firstIndex(where: { def($0.cardId)?.type == "agent" }) {
                let c = state.players[state.active].cooldown.remove(at: i)
                state.players[state.active].draw.append(c)
            }
        case "sacrifice_prestige":
            if !state.players[state.active].played.isEmpty {
                state.players[state.active].played.sort { (def($0.cardId)?.cost ?? 0) < (def($1.cardId)?.cost ?? 0) }
                let c = state.players[state.active].played.removeLast()
                state.players[state.active].prestige += max(0, (def(c.cardId)?.cost ?? 0) - 1)
                state.players[state.active].exile.append(c)
            }
        case "coin_to_power":
            let c = state.players[state.active].coin
            state.players[state.active].power += max(0, c - 1)
            state.players[state.active].coin = 0
        case "knockout_agent": knockout(1, coinPer: 0)
        case "gain_coin", "gain_coin_favor": state.players[state.active].coin += ab?.n ?? 1
        case "draw": draw(&state.players[state.active], ab?.n ?? 1)
        case "orgnum_favored":
            state.players[state.active].power += state.players[state.active].ownedCount / 4
            createToken("summerset-sacking", 1)
        case "orgnum_neutral":
            state.players[state.active].power += state.players[state.active].ownedCount / 6
        case "power": state.players[state.active].power += ab?.n ?? 0
        case "bewilderment":
            toCooldown(&state.players[1 - state.active], inst("bewilderment"))
        case "tavern_remove": replaceTavern(ab?.n ?? 2)
        case "look_confine":
            let n = ab?.n ?? 3
            var seen: [CardInst] = []
            for _ in 0..<n {
                if let c = state.players[1 - state.active].draw.popLast() { seen.append(c) }
            }
            if !seen.isEmpty {
                seen.sort { cardValue($0) > cardValue($1) }
                let move = seen.removeFirst()
                toCooldown(&state.players[1 - state.active], move)
                state.players[1 - state.active].draw.append(contentsOf: seen)
            }
        case "mora_share":
            if let i = state.tavern.firstIndex(where: { def($0.cardId)?.type == "action" }) {
                let id = state.tavern[i].cardId
                state.tavern.remove(at: i)
                toCooldown(&state.players[state.active], inst(id))
                toCooldown(&state.players[1 - state.active], inst(id))
                refillTavern()
            }
        case "create_agent":
            if let name = ab?.card { createToken(slug(name), 1) }
        default: break
        }
        _ = pid
    }

    public func endTurn() {
        guard state.winner == nil else { return }
        let oppTaunt = state.players[1 - state.active].agents.contains { $0.taunt }
        if state.players[state.active].power > 0 && !oppTaunt {
            state.players[state.active].prestige += state.players[state.active].power
            state.log.append("+\(state.players[state.active].power) Prestige from Power")
        }
        state.players[state.active].power = 0
        state.players[state.active].coin = 0
        while !state.players[state.active].played.isEmpty {
            let c = state.players[state.active].played.removeLast()
            if def(c.cardId)?.type == "agent" { continue }
            if def(c.cardId)?.contract == true && def(c.cardId)?.type == "action" {
                state.players[state.active].exile.append(c)
            } else {
                toCooldown(&state.players[state.active], c)
            }
        }
        checkPatronSweep()
        if state.winner != nil { notify(); return }

        if state.players[state.active].prestige >= 80 {
            state.winner = state.active
            state.winReason = "80"
            notify()
            return
        }
        if state.awaitingLastChance, state.lastChance == 1 - state.active {
            if state.players[state.active].prestige <= state.players[1 - state.active].prestige {
                state.winner = 1 - state.active
                state.winReason = "40-hold"
                notify()
                return
            }
            state.awaitingLastChance = false
            state.lastChance = nil
        }
        if state.players[state.active].prestige >= 40 && !state.awaitingLastChance {
            state.awaitingLastChance = true
            state.lastChance = state.active
            state.log.append("\(state.players[state.active].prestige) Prestige — opponent's last chance!")
        }
        state.active = 1 - state.active
        state.turn += 1
        startTurn(&state)
        notify()
    }

    public func legalActions() -> [EngineAction] {
        var acts: [EngineAction] = []
        guard state.winner == nil else { return acts }
        let p = state.players[state.active]
        for c in p.hand where canPlay(c.uid) {
            acts.append(.play(uid: c.uid, cardId: c.cardId, choice: 0))
        }
        for i in state.tavern.indices where canBuy(i) {
            acts.append(.buy(index: i, cardId: state.tavern[i].cardId, cost: def(state.tavern[i].cardId)?.cost ?? 0))
        }
        for pid in state.matchPatrons + ["treasury"] where canCall(pid) {
            acts.append(.patron(id: pid))
        }
        for a in state.players[1 - state.active].agents {
            let taunts = state.players[1 - state.active].agents.filter { $0.taunt }
            if !taunts.isEmpty && !a.taunt { continue }
            if p.power >= (a.hp ?? 1) { acts.append(.knockout(uid: a.uid, hp: a.hp ?? 1)) }
        }
        acts.append(.end)
        return acts
    }

    private func notify() { onChange?() }
}

/// Deterministic RNG so tests and daily seeds are stable.
public struct SeededGenerator: RandomNumberGenerator, Sendable {
    private var state: UInt64

    public init(seed: UInt64) {
        self.state = seed == 0 ? 0x9E3779B97F4A7C15 : seed
    }

    public mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}
