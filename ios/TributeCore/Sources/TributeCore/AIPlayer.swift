import Foundation

/// Difficulty-scaled AI (1–10), ported from `web/js/ai.js`.
public struct TributeAI: Sendable {
    public var difficulty: Int

    public init(difficulty: Int = 5) {
        self.difficulty = min(10, max(1, difficulty))
    }

    public func actionDelayMs() -> Int {
        switch difficulty {
        case ...2: return 420
        case ...4: return 480
        case ...6: return 560
        case ...8: return 640
        default: return 720
        }
    }

    public func takeTurn(engine: TributeEngine) {
        var guardCount = 0
        while engine.state.winner == nil && engine.me().isAI && guardCount < 40 {
            guardCount += 1
            let action = chooseAction(engine: engine)
            if action == nil || isEnd(action) {
                engine.endTurn()
                break
            }
            execute(action!, engine: engine)
        }
    }

    public func chooseAction(engine: TributeEngine) -> EngineAction? {
        let acts = engine.legalActions()
        guard !acts.isEmpty else { return .end }
        let p = engine.me()
        let o = engine.opp()
        let d = difficulty

        if d <= 2 {
            let nonEnd = acts.filter { !isEnd($0) }
            if nonEnd.isEmpty { return .end }
            if Double.random(in: 0...1) < 0.35 { return nonEnd.randomElement() }
        }

        var scored = acts.map { (a: $0, s: score($0, engine: engine, p: p, o: o)) }
        if d < 5 {
            for i in scored.indices {
                scored[i].s += Int((Double.random(in: -0.5...0.5) * Double(12 - d * 2)).rounded())
            }
        }
        scored.sort { $0.s > $1.s }

        let plays = scored.filter { if case .play = $0.a { return true }; return false }
        let playThresh = d >= 8 ? 12 : d >= 5 ? 15 : 18
        if let best = plays.first, best.s >= playThresh { return best.a }

        let koThresh = d >= 7 ? 28 : 35
        if let ko = scored.first(where: { if case .knockout = $0.a { return $0.s >= koThresh }; return false }) {
            return ko.a
        }
        let patThresh = d >= 8 ? 18 : d >= 5 ? 24 : 30
        if let pat = scored.first(where: { if case .patron = $0.a { return $0.s >= patThresh }; return false }) {
            return pat.a
        }
        let buyThresh = d >= 8 ? 8 : d >= 5 ? 12 : 16
        if let buy = scored.first(where: { if case .buy = $0.a { return $0.s >= buyThresh }; return false }) {
            return buy.a
        }
        if let best = plays.first { return best.a }
        if let next = scored.first(where: { !isEnd($0.a) }), next.s > (d >= 5 ? 5 : 10) {
            return next.a
        }
        return .end
    }

    public func execute(_ a: EngineAction, engine: TributeEngine) {
        switch a {
        case .play(let uid, _, let choice): engine.playCard(uid, choice: choice)
        case .buy(let index, _, _): engine.buy(index)
        case .patron(let id): engine.callPatron(id)
        case .knockout(let uid, _): engine.knockoutWithPower(uid)
        case .end: engine.endTurn()
        }
    }

    private func isEnd(_ a: EngineAction?) -> Bool {
        if case .end = a { return true }
        return false
    }

    private func score(_ a: EngineAction, engine: TributeEngine, p: PlayerState, o: PlayerState) -> Int {
        let d = difficulty
        var s = 0
        switch a {
        case .play(_, let cardId, _):
            guard let def = engine.def(cardId) else { return -99 }
            s = 20 + playScore(def, p: p, o: o)
            if (p.suitsPlayed[def.patron] ?? 0) >= 1 { s += 8 + (d >= 7 ? 4 : 0) }
            if def.isCurse { s = 120 }
            if d >= 7 {
                let already = p.suitsPlayed[def.patron] ?? 0
                if already >= 1 && def.combo2Text != nil { s += 10 }
                if already >= 2 && def.combo3Text != nil { s += 12 }
                if already >= 3 && def.combo4Text != nil { s += 14 }
            }
        case .buy(_, let cardId, let cost):
            guard let def = engine.def(cardId) else { return -99 }
            s = buyScore(def, p: p) - Int(Double(cost) * 0.25)
            if engine.state.turn <= 4 && def.cost <= 3 { s += 5 }
            if d >= 8 {
                if o.patrons.contains(def.patron) { s += 6 }
                if def.taunt && o.agents.isEmpty { s += 4 }
                if def.cost >= 6 && o.coin + 2 >= def.cost { s += 5 }
            }
        case .patron(let id):
            s = patronScore(id, engine: engine, p: p, o: o)
        case .knockout(let uid, let hp):
            s = 28 + hp * 2
            if let agent = o.agents.first(where: { $0.uid == uid }), agent.taunt {
                s += 28 + (d >= 6 ? 10 : 0)
                if d >= 6 && p.power >= hp { s += 18 }
            }
            if p.prestige + p.power >= 38 { s += 12 }
        case .end:
            s = p.hand.isEmpty ? 40 : 2
            if d >= 7 && p.power > 0 && !o.agents.contains(where: { $0.taunt }) && p.prestige + p.power >= 40 {
                s += 50
            }
        }
        if p.prestige + p.power >= 80, case .end = a { s += 120 }
        if o.prestige >= 40 && p.prestige <= o.prestige, case .play = a { s += 12 + (d >= 7 ? 8 : 0) }
        if case .patron(let id) = a, id == "treasury", d >= 8 {
            if engine.state.turn <= 5 { s += 8 }
            if p.coin >= 4 && p.played.count >= 2 { s += 6 }
        }
        return s
    }

    private func playScore(_ def: CardDef, p: PlayerState, o: PlayerState) -> Int {
        var s = 0
        let text = "\(def.playText) \(def.combo2Text ?? "")"
        if text.contains("Coin") { s += 4 }
        if text.contains("Power") { s += 5 }
        if text.contains("Prestige") { s += 8 }
        if text.contains("Draw") { s += 5 }
        if text.contains("Knock Out") && !o.agents.isEmpty { s += 10 }
        if def.type == "agent" { s += 6 + (difficulty >= 7 ? 4 : 0) }
        if def.contract { s += 2 }
        if def.id == "gold" || def.id == "writ-of-coin" { s += 3 }
        if def.taunt { s += difficulty >= 6 ? 8 : 3 }
        _ = p
        return s
    }

    private func buyScore(_ def: CardDef, p: PlayerState) -> Int {
        var s = 8 + def.cost
        if def.type == "agent" { s += 6 }
        if def.taunt { s += 4 + (difficulty >= 7 ? 5 : 0) }
        if def.combo2Text != nil { s += 5 }
        if p.patrons.contains(def.patron) { s += 6 }
        if p.prestige >= 35 && def.cost >= 6 && def.type != "agent" { s -= 5 }
        if difficulty >= 9, (def.playText.contains("Prestige") || def.playText.contains("Knock Out") || def.playText.contains("Acquire")) {
            s += 6
        }
        return s
    }

    private func patronScore(_ id: String, engine: TributeEngine, p: PlayerState, o: PlayerState) -> Int {
        var map: [String: Int] = [
            "treasury": engine.state.turn <= 6 ? 36 : 20,
            "crows": p.coin >= 4 ? 40 + p.coin : 10,
            "redeagle": 28,
            "hunding": engine.favorFor("hunding") != 1 ? 30 : 0,
            "celarus": o.agents.isEmpty ? 12 : 32,
            "rajhin": 22, "orgnum": 25, "pelin": 22, "druid": 26,
            "almalexia": 24, "mora": 18, "alessia": 27,
            "hlaalu": p.played.contains(where: { (engine.def($0.cardId)?.cost ?? 0) >= 4 }) ? 36 : 16,
        ]
        var s = map[id] ?? 15
        let favCount = engine.state.matchPatrons.filter { engine.favorFor($0) == 1 }.count
        if favCount >= 2 && engine.favorFor(id) != 1 { s += 18 }
        if favCount == 3 && engine.favorFor(id) != 1 { s += 55 }
        if difficulty >= 8 && favCount >= 2 { s += 8 }
        return s
    }
}
