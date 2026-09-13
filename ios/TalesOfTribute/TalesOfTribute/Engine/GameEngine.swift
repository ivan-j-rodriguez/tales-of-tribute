import Foundation

/// Swift port of web/js/engine.js — same JSON, same turn flow.
final class TributeEngine: ObservableObject {
    let catalog: Catalog
    @Published var players: [PlayerState] = []
    @Published var active = 0
    @Published var matchPatrons: [String] = []
    @Published var favor: [String: Int] = [:]
    @Published var tavern: [CardInst] = []
    var tavernPile: [CardInst] = []
    var tavernDiscard: [CardInst] = []
    @Published var turn = 1
    @Published var winner: Int? = nil
    var awaitingLastChance = false
    var lastChance: Int? = nil
    var log: [String] = []

    init(catalog: Catalog) { self.catalog = catalog }

    func def(_ id: String) -> CardDef? { catalog.cardsById[id] }

    func newMatch(playerPatrons: [String], aiPatrons: [String]) {
        matchPatrons = playerPatrons + aiPatrons
        tavernPile = buildTavern(matchPatrons)
        tavernPile.shuffle()
        players = [
            makePlayer(playerPatrons, ai: false),
            makePlayer(aiPatrons, ai: true)
        ]
        favor = [:]
        for p in matchPatrons { favor[p] = 0 }
        favor["treasury"] = 0
        tavern = []
        for _ in 0..<5 { if let c = popPile() { tavern.append(c) } }
        winner = nil
        turn = 1
        active = 0
        draw(&players[0], 5)
        draw(&players[1], 5)
        startTurn()
    }

    private func makePlayer(_ patrons: [String], ai: Bool) -> PlayerState {
        var deck: [CardInst] = []
        for _ in 0..<6 { deck.append(inst("gold")) }
        for pid in patrons {
            if let s = catalog.patronsById[pid]?.starter { deck.append(inst(s)) }
        }
        deck.shuffle()
        return PlayerState(isAI: ai, patrons: patrons, draw: deck)
    }

    private func inst(_ id: String) -> CardInst {
        let d = def(id)
        return CardInst(uid: UUID().uuidString, cardId: id, hp: d?.hp, maxHp: d?.hp, taunt: d?.taunt ?? false)
    }

    private func buildTavern(_ patrons: [String]) -> [CardInst] {
        var pile: [CardInst] = []
        let skip: Set<String> = ["the-chimera", "gold", "writ-of-coin", "bewilderment"]
        for c in catalog.cards {
            let inMatch = patrons.contains(c.patron) || c.patron == "treasury"
            if !inMatch { continue }
            if c.token || c.curse == true || c.starter || skip.contains(c.id) { continue }
            let qty = c.upgradedQty > 0 ? c.upgradedQty : c.baseQty
            for _ in 0..<qty { pile.append(inst(c.id)) }
        }
        return pile
    }

    private func popPile() -> CardInst? {
        if tavernPile.isEmpty {
            tavernPile = tavernDiscard
            tavernDiscard.removeAll()
            tavernPile.shuffle()
        }
        return tavernPile.popLast()
    }

    func me() -> PlayerState { players[active] }
    func opp() -> PlayerState { players[1 - active] }

    private func draw(_ p: inout PlayerState, _ n: Int) {
        for _ in 0..<n {
            if p.draw.isEmpty {
                if p.cooldown.isEmpty { break }
                p.draw = p.cooldown
                p.cooldown.removeAll()
                p.draw.shuffle()
            }
            if let c = p.draw.popLast() { p.hand.append(c) }
        }
    }

    private func toCooldown(_ p: inout PlayerState, _ c: CardInst) {
        p.cooldown.append(c)
    }

    private func startTurn() {
        players[active].coin = 0
        players[active].power = 0
        players[active].patronCallsLeft = 1
        players[active].suitsPlayed = [:]
        players[active].played = []
        if favorFor("hunding") == 1 { players[active].coin += 1 }
        players[active].coin += players[active].setbackCoin
        players[active].power += players[active].setbackPower
        if players[active].setbackDraw > 0 { draw(&players[active], players[active].setbackDraw) }
        players[active].setbackCoin = 0
        players[active].setbackPower = 0
        players[active].setbackDraw = 0
    }

    /// 1 favors active, -1 favors opponent, 0 neutral
    func favorFor(_ pid: String) -> Int {
        let f = favor[pid] ?? 0
        if f == 0 { return 0 }
        let mine = active == 0 ? 1 : -1
        return f == mine ? 1 : -1
    }

    func playCard(_ uid: String, choice: Int = 0) {
        guard winner == nil, let idx = players[active].hand.firstIndex(where: { $0.uid == uid }) else { return }
        var card = players[active].hand.remove(at: idx)
        guard let d = def(card.cardId) else { return }
        players[active].played.append(card)
        let n = (players[active].suitsPlayed[d.patron] ?? 0) + 1
        players[active].suitsPlayed[d.patron] = n
        resolve(d.play, card: &card, choice: choice)
        if n >= 2 { resolve(d.combo2, card: &card, choice: choice) }
        if n >= 3 { resolve(d.combo3, card: &card, choice: choice) }
        if n >= 4 { resolve(d.combo4, card: &card, choice: choice) }
        if d.patron == "druid" { checkChimera(n) }
        if d.type == "agent" {
            card.hp = d.hp ?? 2
            card.maxHp = d.hp ?? 2
            card.taunt = d.taunt
            players[active].agents.append(card)
        }
        if d.contract && d.type == "action" {
            if let i = players[active].played.firstIndex(where: { $0.uid == card.uid }) {
                players[active].played.remove(at: i)
            }
            players[active].exile.append(card)
        }
        log.append("Play \(d.name)")
        objectWillChange.send()
    }

    private func checkChimera(_ combo: Int) {
        let need = favorFor("druid") == 1 ? 4 : favorFor("druid") == 0 ? 5 : 99
        guard combo >= need else { return }
        let has = players[active].agents.contains { $0.cardId == "the-chimera" }
        if !has {
            var ch = inst("the-chimera")
            ch.hp = 5; ch.maxHp = 5; ch.taunt = true
            players[active].agents.append(ch)
            log.append("The Chimera awakens!")
        }
    }

    private func resolve(_ effects: [Effect], card: inout CardInst, choice: Int) {
        for e in effects { resolveOne(e, card: &card, choice: choice) }
    }

    private func resolveOne(_ e: Effect, card: inout CardInst, choice: Int) {
        switch e.op {
        case "coin": players[active].coin += e.n ?? 0
        case "power": players[active].power += e.n ?? 0
        case "prestige": players[active].prestige += e.n ?? 0
        case "opp_prestige":
            players[1-active].prestige = max(0, players[1-active].prestige + (e.n ?? 0))
        case "draw": draw(&players[active], e.n ?? 1)
        case "discard", "donate":
            let n = e.n ?? 1
            for _ in 0..<n {
                guard !players[active].hand.isEmpty else { break }
                let c = players[active].hand.removeFirst()
                toCooldown(&players[active], c)
                if e.op == "donate" { draw(&players[active], 1) }
            }
        case "toss":
            var seen: [CardInst] = []
            for _ in 0..<(e.n ?? 1) {
                if let c = players[active].draw.popLast() { seen.append(c) }
            }
            let keep = max(1, seen.count / 2)
            for c in seen.prefix(seen.count - keep) { toCooldown(&players[active], c) }
            for c in seen.suffix(keep) { players[active].draw.append(c) }
        case "destroy":
            for _ in 0..<(e.n ?? 1) {
                guard !players[active].played.isEmpty else { break }
                let c = players[active].played.removeFirst()
                players[active].exile.append(c)
            }
        case "replace":
            for _ in 0..<(e.n ?? 1) where !tavern.isEmpty {
                tavernDiscard.append(tavern.removeFirst())
                if let c = popPile() { tavern.append(c) }
            }
        case "acquire":
            let maxC = e.n ?? 0
            if let i = tavern.enumerated().filter({ def($0.element.cardId)?.cost ?? 99 <= maxC }).max(by: { (def($0.element.cardId)?.cost ?? 0) < (def($1.element.cardId)?.cost ?? 0) })?.offset {
                let c = tavern.remove(at: i)
                toCooldown(&players[active], c)
                if let n = popPile() { tavern.append(n) }
            }
        case "patron_extra": players[active].patronCallsLeft += e.n ?? 1
        case "knockout": knockout(e.n ?? 1, coinPer: e.coinPerKnock ?? 0)
        case "knockout_all":
            for pi in 0..<2 {
                for a in players[pi].agents { defeat(pi, a) }
            }
        case "heal":
            if let i = players[active].agents.firstIndex(where: { $0.uid == card.uid }) {
                let mx = players[active].agents[i].maxHp ?? 2
                players[active].agents[i].hp = min(mx, (players[active].agents[i].hp ?? 0) + (e.n ?? 0))
            }
        case "sacking": createToken("summerset-sacking", e.n ?? 1)
        case "hand_refresh":
            for _ in 0..<(e.n ?? 1) where !players[active].cooldown.isEmpty {
                players[active].hand.append(players[active].cooldown.removeFirst())
            }
        case "draw_refresh", "draw_refresh_agents":
            let agentsOnly = e.op == "draw_refresh_agents"
            for _ in 0..<(e.n ?? 1) {
                guard let i = players[active].cooldown.firstIndex(where: { !agentsOnly || def($0.cardId)?.type == "agent" }) else { break }
                players[active].draw.append(players[active].cooldown.remove(at: i))
            }
        case "setback_draw": players[1-active].setbackDraw += e.n ?? 1
        case "setback_coin": players[1-active].setbackCoin += e.n ?? 1
        case "setback_power": players[1-active].setbackPower += e.n ?? 1
        case "create":
            if let name = e.card { createToken(slug(name), e.n ?? 1) }
        case "choose":
            if let opts = e.options, !opts.isEmpty {
                let pick = min(choice, opts.count - 1)
                resolve(opts[pick], card: &card, choice: 0)
            }
        default: break
        }
    }

    private func slug(_ name: String) -> String {
        name.lowercased()
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: " ", with: "-")
    }

    private func createToken(_ id: String, _ n: Int) {
        for _ in 0..<n { toCooldown(&players[active], inst(id)) }
    }

    private func knockout(_ n: Int, coinPer: Int) {
        for _ in 0..<n {
            let taunts = players[1-active].agents.filter { $0.taunt }
            let pool = taunts.isEmpty ? players[1-active].agents : taunts
            guard let target = pool.min(by: { ($0.hp ?? 0) < ($1.hp ?? 0) }) else { break }
            defeat(1-active, target)
            if coinPer > 0 { players[active].coin += coinPer }
        }
    }

    private func defeat(_ owner: Int, _ agent: CardInst) {
        guard let i = players[owner].agents.firstIndex(where: { $0.uid == agent.uid }) else { return }
        let a = players[owner].agents.remove(at: i)
        for c in a.confined { toCooldown(&players[owner], c) }
        if def(a.cardId)?.contract == true {
            players[owner].exile.append(a)
        } else {
            toCooldown(&players[owner], a)
        }
    }

    func knockoutWithPower(_ uid: String) {
        guard let agent = players[1-active].agents.first(where: { $0.uid == uid }) else { return }
        let taunts = players[1-active].agents.filter { $0.taunt }
        if !taunts.isEmpty && !agent.taunt { return }
        let need = agent.hp ?? 1
        guard players[active].power >= need else { return }
        players[active].power -= need
        defeat(1-active, agent)
        objectWillChange.send()
    }

    func canBuy(_ i: Int) -> Bool {
        guard winner == nil, tavern.indices.contains(i), let d = def(tavern[i].cardId) else { return false }
        return players[active].coin >= d.cost
    }

    func buy(_ i: Int) {
        guard canBuy(i) else { return }
        let c = tavern.remove(at: i)
        players[active].coin -= def(c.cardId)?.cost ?? 0
        toCooldown(&players[active], c)
        if let n = popPile() { tavern.append(n) }
        objectWillChange.send()
    }

    func canCall(_ pid: String) -> Bool {
        guard winner == nil, players[active].patronCallsLeft > 0 else { return false }
        if pid == "treasury" { return players[active].coin >= 2 && !players[active].played.isEmpty }
        guard matchPatrons.contains(pid), let pat = catalog.patronsById[pid] else { return false }
        let fav = favorFor(pid)
        if fav == 1 && pat.abilities.lockFavored == true { return false }
        let ab = fav == 1 ? pat.abilities.favored : fav == -1 ? pat.abilities.unfavored : pat.abilities.neutral
        guard let ab, ab.passive == nil, ab.effect != nil else { return false }
        let cost = ab.cost ?? [:]
        if (cost["coin"] ?? 0) > players[active].coin { return false }
        if (cost["power"] ?? 0) > players[active].power { return false }
        return true
    }

    func callPatron(_ pid: String) {
        guard canCall(pid) else { return }
        players[active].patronCallsLeft -= 1
        if pid == "treasury" {
            players[active].coin -= 2
            if !players[active].played.isEmpty {
                players[active].exile.append(players[active].played.removeFirst())
            }
            createToken("writ-of-coin", 1)
            objectWillChange.send()
            return
        }
        let pat = catalog.patronsById[pid]!
        let favBefore = favorFor(pid)
        let ab = favBefore == 1 ? pat.abilities.favored : favBefore == -1 ? pat.abilities.unfavored : pat.abilities.neutral
        let cost = ab?.cost ?? [:]
        players[active].coin -= cost["coin"] ?? 0
        players[active].power -= cost["power"] ?? 0
        applyPatron(pid, ab)
        if pid == "hunding" && favBefore == -1 && pat.abilities.flipUnfavoredToFavored == true {
            favor["hunding"] = active == 0 ? 1 : -1
        } else if favBefore == 0 {
            favor[pid] = active == 0 ? 1 : -1
        } else if favBefore == -1 {
            favor[pid] = 0
        }
        if matchPatrons.allSatisfy({ favorFor($0) == 1 }) {
            winner = active
        }
        objectWillChange.send()
    }

    private func applyPatron(_ pid: String, _ ab: PatronAbility?) {
        guard let effect = ab?.effect else { return }
        switch effect {
        case "agent_to_draw":
            if let i = players[active].cooldown.firstIndex(where: { def($0.cardId)?.type == "agent" }) {
                players[active].draw.append(players[active].cooldown.remove(at: i))
            }
        case "sacrifice_prestige":
            if !players[active].played.isEmpty {
                let c = players[active].played.removeFirst()
                players[active].prestige += max(0, (def(c.cardId)?.cost ?? 0) - 1)
                players[active].exile.append(c)
            }
        case "coin_to_power":
            let c = players[active].coin
            players[active].power += max(0, c - 1)
            players[active].coin = 0
        case "knockout_agent": knockout(1, coinPer: 0)
        case "gain_coin", "gain_coin_favor": players[active].coin += ab?.n ?? 1
        case "draw": draw(&players[active], ab?.n ?? 1)
        case "orgnum_favored":
            let owned = players[active].hand.count + players[active].draw.count + players[active].cooldown.count + players[active].played.count + players[active].agents.count
            players[active].power += owned / 4
            createToken("summerset-sacking", 1)
        case "orgnum_neutral":
            let owned = players[active].hand.count + players[active].draw.count + players[active].cooldown.count + players[active].played.count + players[active].agents.count
            players[active].power += owned / 6
        case "power": players[active].power += ab?.n ?? 0
        case "bewilderment":
            toCooldown(&players[1-active], inst("bewilderment"))
        case "tavern_remove":
            for _ in 0..<(ab?.n ?? 2) where !tavern.isEmpty {
                tavernDiscard.append(tavern.removeFirst())
                if let c = popPile() { tavern.append(c) }
            }
        case "look_confine":
            if let c = players[1-active].draw.popLast() { toCooldown(&players[1-active], c) }
        case "mora_share":
            if let i = tavern.firstIndex(where: { def($0.cardId)?.type == "action" }) {
                let id = tavern[i].cardId
                tavern.remove(at: i)
                toCooldown(&players[active], inst(id))
                toCooldown(&players[1-active], inst(id))
                if let n = popPile() { tavern.append(n) }
            }
        case "create_agent":
            if let name = ab?.card { createToken(slug(name), 1) }
        default: break
        }
    }

    func endTurn() {
        guard winner == nil else { return }
        let oppTaunt = players[1-active].agents.contains { $0.taunt }
        if players[active].power > 0 && !oppTaunt {
            players[active].prestige += players[active].power
        }
        players[active].power = 0
        players[active].coin = 0
        while !players[active].played.isEmpty {
            let c = players[active].played.removeLast()
            if def(c.cardId)?.type == "agent" { continue }
            toCooldown(&players[active], c)
        }
        if players[active].prestige >= 80 {
            winner = active
            objectWillChange.send()
            return
        }
        if awaitingLastChance, lastChance == 1 - active {
            if players[active].prestige <= players[1-active].prestige {
                winner = 1 - active
                objectWillChange.send()
                return
            }
            awaitingLastChance = false
            lastChance = nil
        }
        if players[active].prestige >= 40 && !awaitingLastChance {
            awaitingLastChance = true
            lastChance = active
        }
        active = 1 - active
        turn += 1
        draw(&players[active], 5)
        startTurn()
        objectWillChange.send()
    }
}
