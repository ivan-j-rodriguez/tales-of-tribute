import Foundation

/// How often levels 1–3 leave the heuristic. Mirrors `BEGINNER` in `web/js/ai.js`.
private struct BeginnerCurve: Sendable {
    let blind: Double
    let sloppy: Double
    let giveUp: Double
    let tauntNotice: Double
    let buyWorst: Double
    let dropPatron: Double
    let buyFlip: Double
    let playBand: Double
}

private let beginnerCurve: [Int: BeginnerCurve] = [
    1: BeginnerCurve(blind: 0.56, sloppy: 0.32, giveUp: 0.50, tauntNotice: 0.12, buyWorst: 1, dropPatron: 0.78, buyFlip: 1, playBand: 24),
    2: BeginnerCurve(blind: 0.24, sloppy: 0.34, giveUp: 0.30, tauntNotice: 0.48, buyWorst: 0.62, dropPatron: 0.38, buyFlip: 0.48, playBand: 12),
    3: BeginnerCurve(blind: 0.12, sloppy: 0.22, giveUp: 0.18, tauntNotice: 0.74, buyWorst: 0.42, dropPatron: 0.18, buyFlip: 0.28, playBand: 8),
]

/// Difficulty-scaled AI (1–10), ported from `web/js/ai.js`.
/// 1 passes and buys badly. 2–3 are soft. 4–10 keep the heuristic.
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
        var failed = 0
        while engine.state.winner == nil && engine.me().isAI && guardCount < 40 {
            guardCount += 1
            let action = chooseAction(engine: engine)
            if action == nil || isEnd(action) {
                engine.endTurn()
                break
            }
            if !execute(action!, engine: engine) {
                failed += 1
                if failed >= 3 {
                    engine.endTurn()
                    break
                }
                continue
            }
            failed = 0
        }
    }

    public func chooseAction(engine: TributeEngine) -> EngineAction? {
        let acts = engine.legalActions()
        guard !acts.isEmpty else { return .end }
        let p = engine.me()
        let o = engine.opp()
        let d = difficulty

        if d <= 3, let curve = beginnerCurve[d] {
            return chooseBeginner(acts, engine: engine, p: p, o: o, curve: curve)
        }

        var scored = acts.map { (a: $0, s: score($0, engine: engine, p: p, o: o)) }
        // Difficulty 4 keeps the old mild noise. 5–10 are unchanged.
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

    @discardableResult
    public func execute(_ a: EngineAction, engine: TributeEngine) -> Bool {
        switch a {
        case .play(let uid, _, let choice): return engine.playCard(uid, choice: choice)
        case .buy(let index, _, _): return engine.buy(index)
        case .patron(let id): return engine.callPatron(id)
        case .knockout(let uid, _): return engine.knockoutWithPower(uid)
        case .end:
            engine.endTurn()
            return true
        }
    }

    private func chooseBeginner(
        _ acts: [EngineAction], engine: TributeEngine, p: PlayerState, o: PlayerState, curve: BeginnerCurve
    ) -> EngineAction {
        let legal = executable(acts, engine: engine)
        if !legal.contains(where: { !isEnd($0) }) { return .end }
        let curses = legal.filter { action in
            guard case .play(_, let cardId, _) = action else { return false }
            return engine.def(cardId)?.isCurse == true
        }
        if !curses.isEmpty { return curses[Int.random(in: 0..<curses.count)] }
        let roll = Double.random(in: 0..<1)
        if roll < curve.blind { return blind(legal, o: o, curve: curve) }
        if roll < curve.blind + curve.sloppy { return sloppy(legal, engine: engine, p: p, o: o, curve: curve) }
        return reading(legal, engine: engine, p: p, o: o, curve: curve)
    }

    private func executable(_ acts: [EngineAction], engine: TributeEngine) -> [EngineAction] {
        acts.filter { action in
            switch action {
            case .play(let uid, _, _): return engine.canPlay(uid)
            case .buy(let index, _, _): return engine.canBuy(index)
            case .patron(let id): return engine.canCall(id)
            case .knockout(let uid, let hp):
                return engine.opp().agents.contains { $0.uid == uid } && engine.me().power >= hp
            case .end: return true
            }
        }
    }

    private func blind(
        _ legal: [EngineAction], o: PlayerState, curve: BeginnerCurve
    ) -> EngineAction {
        let moving = legal.filter { !isEnd($0) }
        if moving.isEmpty { return .end }
        if Double.random(in: 0..<1) < curve.giveUp { return .end }
        var pool = moving
        if o.agents.contains(where: { $0.taunt }) && Double.random(in: 0..<1) >= curve.tauntNotice {
            pool = pool.filter { if case .knockout = $0 { return false }; return true }
        }
        if pool.isEmpty { return .end }
        let d = difficulty
        let weighted: [(EngineAction, Double)] = pool.map { action in
            let w: Double
            switch action {
            case .play: w = 3
            case .buy: w = d == 1 ? 5 : d == 2 ? 3 : 2
            case .patron: w = d == 1 ? 2 : 1.2
            case .knockout: w = 0.35
            case .end: w = 1
            }
            return (action, w)
        }
        return pickWeighted(weighted)
    }

    private func sloppy(
        _ legal: [EngineAction], engine: TributeEngine, p: PlayerState, o: PlayerState, curve: BeginnerCurve
    ) -> EngineAction {
        let plays = legal.filter { if case .play = $0 { return true }; return false }
        let buys = legal.filter { if case .buy = $0 { return true }; return false }
        let pats = legal.filter { if case .patron = $0 { return true }; return false }
        if !plays.isEmpty {
            let fresh = plays.filter { action in
                guard case .play(_, let cardId, _) = action, let def = engine.def(cardId) else { return false }
                return (p.suitsPlayed[def.patron] ?? 0) == 0
            }
            let pool = !fresh.isEmpty && fresh.count < plays.count ? fresh : plays
            return worstPlay(pool, engine: engine, p: p, o: o)
        }
        var kos = legal.filter { if case .knockout = $0 { return true }; return false }
        if !kos.isEmpty && Double.random(in: 0..<1) >= curve.tauntNotice { kos = [] }
        if !kos.isEmpty && o.agents.contains(where: { $0.taunt }) {
            return kos[Int.random(in: 0..<kos.count)]
        }
        if !buys.isEmpty {
            if Double.random(in: 0..<1) < curve.buyWorst {
                return worstBuy(buys, engine: engine, p: p)
            }
            return bestBuy(buys, engine: engine, p: p)
        }
        if !kos.isEmpty { return kos[Int.random(in: 0..<kos.count)] }
        if !pats.isEmpty && Double.random(in: 0..<1) >= curve.dropPatron {
            return pats[Int.random(in: 0..<pats.count)]
        }
        return .end
    }

    private func reading(
        _ legal: [EngineAction], engine: TributeEngine, p: PlayerState, o: PlayerState, curve: BeginnerCurve
    ) -> EngineAction {
        let d = difficulty
        var pool = legal
        if Double.random(in: 0..<1) >= curve.tauntNotice {
            pool = pool.filter { if case .knockout = $0 { return false }; return true }
        }
        if Double.random(in: 0..<1) < curve.dropPatron {
            pool = pool.filter { if case .patron = $0 { return false }; return true }
        }
        let flipBuy = Double.random(in: 0..<1) < curve.buyFlip
        let noise = d == 3 ? 8.0 : d == 2 ? 14.0 : 20.0
        let scored: [(EngineAction, Double)] = pool.map { action in
            var s = Double(score(action, engine: engine, p: p, o: o))
            switch action {
            case .buy(_, let cardId, _):
                let quality = engine.def(cardId).map { Double(buyScore($0, p: p)) } ?? 0
                s = (flipBuy ? 40 - quality : quality) + (Double.random(in: 0..<1) - 0.5) * noise
            case .play:
                s += (Double.random(in: 0..<1) - 0.5) * curve.playBand
            case .patron:
                s += (Double.random(in: 0..<1) - 0.5) * noise
            default:
                break
            }
            return (action, s)
        }
        let bandW = d == 1 ? 14.0 : d == 2 ? 9.0 : 4.0
        func pick(_ kind: String, thresh: Double) -> EngineAction? {
            let rows = scored.filter { matches($0.0, kind) && $0.1 >= thresh }.sorted { $0.1 > $1.1 }
            guard let best = rows.first else { return nil }
            let near = rows.filter { $0.1 >= best.1 - bandW }
            return near[Int.random(in: 0..<near.count)].0
        }
        if let play = pick("play", thresh: d == 3 ? 14 : 8) { return play }
        if let ko = pick("ko", thresh: d == 3 ? 26 : 16) { return ko }
        if let pat = pick("patron", thresh: d == 3 ? 18 : 8) { return pat }
        if let buy = pick("buy", thresh: d == 3 ? 8 : 4) { return buy }
        return .end
    }

    private func matches(_ action: EngineAction, _ kind: String) -> Bool {
        switch (kind, action) {
        case ("play", .play), ("buy", .buy), ("patron", .patron), ("ko", .knockout): return true
        default: return false
        }
    }

    private func worstPlay(
        _ plays: [EngineAction], engine: TributeEngine, p: PlayerState, o: PlayerState
    ) -> EngineAction {
        let ranked: [(EngineAction, Int)] = plays.map { action in
            guard case .play(_, let cardId, _) = action, let def = engine.def(cardId) else { return (action, 0) }
            return (action, playScore(def, p: p, o: o))
        }.sorted { $0.1 < $1.1 }
        guard let floor = ranked.first?.1 else { return .end }
        let band = ranked.filter { $0.1 <= floor + 2 }
        return band[Int.random(in: 0..<band.count)].0
    }

    private func worstBuy(_ buys: [EngineAction], engine: TributeEngine, p: PlayerState) -> EngineAction {
        let ranked: [(EngineAction, Int)] = buys.map { action in
            guard case .buy(_, let cardId, _) = action, let def = engine.def(cardId) else { return (action, 0) }
            return (action, buyScore(def, p: p))
        }.sorted { $0.1 < $1.1 }
        guard let floor = ranked.first?.1 else { return .end }
        let band = ranked.filter { $0.1 <= floor + 3 }
        return band[Int.random(in: 0..<band.count)].0
    }

    private func bestBuy(_ buys: [EngineAction], engine: TributeEngine, p: PlayerState) -> EngineAction {
        let ranked: [(EngineAction, Int)] = buys.map { action in
            guard case .buy(_, let cardId, _) = action, let def = engine.def(cardId) else { return (action, 0) }
            return (action, buyScore(def, p: p))
        }.sorted { $0.1 > $1.1 }
        return ranked.first?.0 ?? .end
    }

    private func pickWeighted(_ items: [(EngineAction, Double)]) -> EngineAction {
        let total = items.reduce(0.0) { $0 + $1.1 }
        if total <= 0 { return .end }
        var r = Double.random(in: 0..<1) * total
        for item in items {
            r -= item.1
            if r <= 0 { return item.0 }
        }
        return items[items.count - 1].0
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
