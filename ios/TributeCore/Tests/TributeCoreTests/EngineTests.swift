import XCTest
@testable import TributeCore

final class EngineTests: XCTestCase {
    var catalog: Catalog!

    override func setUp() {
        catalog = Catalog.loadFromRepoData() ?? Catalog.loadFromBundle()
        XCTAssertFalse(catalog.cards.isEmpty, "cards.json must load (repo data/ or bundle Fixtures)")
        XCTAssertGreaterThanOrEqual(catalog.patrons.count, 13)
    }

    func testMatchSetupOfficialStarters() {
        let eng = TributeEngine(catalog: catalog, seed: 42)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        let p0 = eng.state.players[0]
        let p1 = eng.state.players[1]
        XCTAssertEqual(p0.hand.count, 5)
        XCTAssertEqual(p1.hand.count, 5)
        XCTAssertEqual(eng.state.tavern.count, 5)
        // 10-card decks: 6 gold + 4 starters, 5 drawn → 5 remain
        XCTAssertEqual(p0.draw.count, 5)
        XCTAssertEqual(p1.draw.count, 5)
        let all = p0.hand + p0.draw
        let starters = all.filter { catalog.card($0.cardId)?.starter == true }.map(\.cardId).sorted()
        XCTAssertTrue(starters.contains("fortify"))
        XCTAssertTrue(starters.contains("goods-shipment"))
        XCTAssertTrue(starters.contains("peck"))
        XCTAssertTrue(starters.contains("mainland-inquiries"))
    }

    func testPlayGoldAndBuy() {
        let eng = TributeEngine(catalog: catalog, seed: 1)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        if let gold = eng.state.players[0].hand.first(where: { $0.cardId == "gold" }) {
            XCTAssertTrue(eng.playCard(gold.uid))
            XCTAssertGreaterThanOrEqual(eng.state.players[0].coin, 1)
        }
    }

    func testTreasuryWrit() {
        let eng = TributeEngine(catalog: catalog, seed: 7)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        eng.state.players[0].coin = 2
        if eng.state.players[0].played.isEmpty, let gold = eng.state.players[0].hand.first {
            eng.playCard(gold.uid)
            eng.state.players[0].coin = 2
        }
        XCTAssertTrue(eng.canCall("treasury"))
        XCTAssertTrue(eng.callPatron("treasury"))
        let hasWrit = eng.state.players[0].cooldown.contains { $0.cardId == "writ-of-coin" }
        XCTAssertTrue(hasWrit)
        XCTAssertEqual(eng.state.favor["treasury"], 0)
    }

    func testTauntBlocksPrestige() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        var taunt = eng.inst("the-chimera")
        taunt.hp = 5
        taunt.maxHp = 5
        taunt.taunt = true
        eng.state.players[1].agents.append(taunt)
        eng.state.players[0].power = 6
        let before = eng.state.players[0].prestige
        eng.endTurn()
        XCTAssertEqual(eng.state.players[0].prestige, before)
    }

    func testPowerConvertsWithoutTaunt() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        eng.state.players[0].power = 6
        let before = eng.state.players[0].prestige
        eng.endTurn()
        XCTAssertEqual(eng.state.players[0].prestige, before + 6)
    }

    func testPrestige80Instant() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        eng.state.players[0].prestige = 80
        eng.endTurn()
        XCTAssertEqual(eng.state.winner, 0)
        XCTAssertEqual(eng.state.winReason, "80")
    }

    func testLastChanceMustExceed() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        eng.state.players[0].prestige = 40
        eng.endTurn()
        XCTAssertTrue(eng.state.awaitingLastChance)
        XCTAssertNil(eng.state.winner)
        XCTAssertEqual(eng.state.active, 1)
        eng.endTurn()
        XCTAssertEqual(eng.state.winner, 0)
        XCTAssertEqual(eng.state.winReason, "40-hold")
    }

    func testPatronSweep() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        for pid in eng.state.matchPatrons { eng.state.favor[pid] = 1 }
        eng.endTurn()
        XCTAssertEqual(eng.state.winner, 0)
        XCTAssertEqual(eng.state.winReason, "patrons")
    }

    func testCurseMustPlayFirst() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        let curse = eng.inst("bewilderment")
        eng.state.players[0].hand.insert(curse, at: 0)
        if let gold = eng.state.players[0].hand.first(where: { $0.cardId == "gold" }) {
            XCTAssertFalse(eng.canPlay(gold.uid))
        }
        XCTAssertTrue(eng.canPlay(curse.uid))
    }

    func testSecondPlayerOpeningCoin() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        eng.endTurn()
        XCTAssertEqual(eng.state.active, 1)
        XCTAssertGreaterThanOrEqual(eng.state.players[1].coin, 1)
    }

    func testDrawUpToFive() {
        let eng = TributeEngine(catalog: catalog, seed: 3)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        // Leave 2 cards in hand
        while eng.state.players[0].hand.count > 2 {
            let uid = eng.state.players[0].hand[0].uid
            if eng.canPlay(uid) { eng.playCard(uid) } else { break }
        }
        let leftover = eng.state.players[0].hand.count
        eng.endTurn()
        eng.endTurn()
        XCTAssertEqual(eng.state.active, 0)
        XCTAssertEqual(eng.state.players[0].hand.count, 5)
        XCTAssertGreaterThanOrEqual(5, leftover)
    }

    func testAIvsAICompletes() {
        let eng = TributeEngine(catalog: catalog, seed: 99)
        eng.newMatch(playerPatrons: ["pelin", "hlaalu"], aiPatrons: ["crows", "celarus"])
        eng.state.players[0].isAI = true
        let ai = TributeAI(difficulty: 6)
        var turns = 0
        while eng.state.winner == nil && turns < 80 {
            ai.takeTurn(engine: eng)
            turns += 1
        }
        XCTAssertNotNil(eng.state.winner, "AI vs AI should finish within 80 turns")
    }
}

final class ClubTests: XCTestCase {
    func testGauntletPathChangesByDate() {
        var a = ClubProfile()
        var b = ClubProfile()
        let d1 = date("2026-09-13")
        let d2 = date("2026-09-14")
        ClubLogic.ensureGauntletDay(&a, now: d1)
        ClubLogic.ensureGauntletDay(&b, now: d2)
        XCTAssertEqual(a.gauntlet.order.first, "highisle")
        XCTAssertEqual(b.gauntlet.order.first, "highisle")
        XCTAssertNotEqual(a.gauntlet.order, b.gauntlet.order)
        XCTAssertEqual(a.gauntlet.order.count, gauntletStops.count)
    }

    func testFailLocksDay() {
        var p = ClubProfile()
        ClubLogic.ensureGauntletDay(&p, now: date("2026-09-13"))
        let stop = ClubLogic.nextPlayableStop(p)!
        ClubLogic.recordMatch(&p, won: false, isGauntlet: true, stop: stop)
        XCTAssertTrue(p.gauntlet.failed)
        XCTAssertNil(ClubLogic.nextPlayableStop(p))
        ClubLogic.ensureGauntletDay(&p, now: date("2026-09-14"))
        XCTAssertFalse(p.gauntlet.failed)
        XCTAssertNotNil(ClubLogic.nextPlayableStop(p))
    }

    func testShopBuyAndEquip() {
        var p = ClubProfile()
        p.gold = 200
        XCTAssertNil(ClubLogic.buySkin(&p, "auridon"))
        XCTAssertEqual(p.tableSkin, "auridon")
        XCTAssertTrue(p.unlockedSkins.contains("auridon"))
        XCTAssertNil(ClubLogic.buyBack(&p, "warden"))
        XCTAssertEqual(p.cardBack, "warden")
    }

    func testStreakRarity() {
        XCTAssertEqual(ClubLogic.rarityFromStreak(1), "Common")
        XCTAssertEqual(ClubLogic.rarityFromStreak(2), "Fine")
        XCTAssertEqual(ClubLogic.rarityFromStreak(3), "Superior")
        XCTAssertEqual(ClubLogic.rarityFromStreak(4), "Epic")
    }

    private func date(_ ymd: String) -> Date {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = TimeZone(identifier: "America/New_York")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: ymd)!
    }
}
