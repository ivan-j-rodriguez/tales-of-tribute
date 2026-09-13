import Foundation

struct TributeAI {
    let engine: TributeEngine

    func takeTurn() {
        var guardCount = 0
        while engine.winner == nil && engine.players[engine.active].isAI && guardCount < 40 {
            guardCount += 1
            let acts = legal()
            let best = acts.max(by: { score($0) < score($1) })
            guard let a = best, a.kind != .end || score(a) > 8 else {
                engine.endTurn()
                break
            }
            if a.kind == .end { engine.endTurn(); break }
            exec(a)
        }
    }

    enum Kind { case play, buy, patron, ko, end }
    struct Act { var kind: Kind; var uid: String = ""; var index: Int = 0; var id: String = ""; var hp: Int = 0; var cardId: String = ""; var cost: Int = 0 }

    func legal() -> [Act] {
        var acts: [Act] = []
        let p = engine.players[engine.active]
        for c in p.hand { acts.append(Act(kind: .play, uid: c.uid, cardId: c.cardId)) }
        for (i, c) in engine.tavern.enumerated() where engine.canBuy(i) {
            acts.append(Act(kind: .buy, index: i, cardId: c.cardId, cost: engine.def(c.cardId)?.cost ?? 0))
        }
        for pid in engine.matchPatrons + ["treasury"] where engine.canCall(pid) {
            acts.append(Act(kind: .patron, id: pid))
        }
        for a in engine.players[1-engine.active].agents {
            let taunts = engine.players[1-engine.active].agents.filter { $0.taunt }
            if !taunts.isEmpty && !a.taunt { continue }
            if p.power >= (a.hp ?? 1) { acts.append(Act(kind: .ko, uid: a.uid, hp: a.hp ?? 1)) }
        }
        acts.append(Act(kind: .end))
        return acts
    }

    func score(_ a: Act) -> Int {
        switch a.kind {
        case .play:
            let d = engine.def(a.cardId)
            if d?.curse == true { return 120 }
            return 20 + (d?.cost ?? 0) + (d?.type == "agent" ? 6 : 0)
        case .buy: return 10 + a.cost + (engine.def(a.cardId)?.type == "agent" ? 6 : 0)
        case .patron:
            if a.id == "treasury" && engine.turn <= 6 { return 36 }
            if a.id == "crows" && engine.players[engine.active].coin >= 4 { return 40 }
            return 22
        case .ko: return 30 + a.hp * 2
        case .end: return engine.players[engine.active].hand.isEmpty ? 40 : 2
        }
    }

    func exec(_ a: Act) {
        switch a.kind {
        case .play: engine.playCard(a.uid)
        case .buy: engine.buy(a.index)
        case .patron: engine.callPatron(a.id)
        case .ko: engine.knockoutWithPower(a.uid)
        case .end: engine.endTurn()
        }
    }
}
