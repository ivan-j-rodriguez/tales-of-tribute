import Foundation

public struct Effect: Codable, Hashable, Sendable {
    public var op: String
    public var n: Int?
    public var text: String?
    public var resource: String?
    public var trigger: String?
    public var card: String?
    public var options: [[Effect]]?
    public var coinPerKnock: Int?

    public init(
        op: String,
        n: Int? = nil,
        text: String? = nil,
        resource: String? = nil,
        trigger: String? = nil,
        card: String? = nil,
        options: [[Effect]]? = nil,
        coinPerKnock: Int? = nil
    ) {
        self.op = op
        self.n = n
        self.text = text
        self.resource = resource
        self.trigger = trigger
        self.card = card
        self.options = options
        self.coinPerKnock = coinPerKnock
    }
}

public struct CardDef: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var patron: String
    public var type: String
    public var contract: Bool
    public var cost: Int
    public var hp: Int?
    public var taunt: Bool
    public var playText: String
    public var combo2Text: String?
    public var combo3Text: String?
    public var combo4Text: String?
    public var play: [Effect]
    public var combo2: [Effect]
    public var combo3: [Effect]
    public var combo4: [Effect]
    public var baseQty: Int
    public var upgradedQty: Int
    public var upgraded: Bool
    public var starter: Bool
    public var token: Bool
    public var curse: Bool?
    public var art: String?

    public var isAgent: Bool { type == "agent" }
    public var isCurse: Bool { curse == true }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        patron = try c.decode(String.self, forKey: .patron)
        type = try c.decodeIfPresent(String.self, forKey: .type) ?? "action"
        contract = try c.decodeIfPresent(Bool.self, forKey: .contract) ?? false
        cost = try c.decodeIfPresent(Int.self, forKey: .cost) ?? 0
        hp = try c.decodeIfPresent(Int.self, forKey: .hp)
        taunt = try c.decodeIfPresent(Bool.self, forKey: .taunt) ?? false
        playText = try c.decodeIfPresent(String.self, forKey: .playText) ?? ""
        combo2Text = try c.decodeIfPresent(String.self, forKey: .combo2Text)
        combo3Text = try c.decodeIfPresent(String.self, forKey: .combo3Text)
        combo4Text = try c.decodeIfPresent(String.self, forKey: .combo4Text)
        play = try c.decodeIfPresent([Effect].self, forKey: .play) ?? []
        combo2 = try c.decodeIfPresent([Effect].self, forKey: .combo2) ?? []
        combo3 = try c.decodeIfPresent([Effect].self, forKey: .combo3) ?? []
        combo4 = try c.decodeIfPresent([Effect].self, forKey: .combo4) ?? []
        baseQty = try c.decodeIfPresent(Int.self, forKey: .baseQty) ?? 0
        upgradedQty = try c.decodeIfPresent(Int.self, forKey: .upgradedQty) ?? 0
        upgraded = try c.decodeIfPresent(Bool.self, forKey: .upgraded) ?? false
        starter = try c.decodeIfPresent(Bool.self, forKey: .starter) ?? false
        token = try c.decodeIfPresent(Bool.self, forKey: .token) ?? false
        curse = try c.decodeIfPresent(Bool.self, forKey: .curse)
        art = try c.decodeIfPresent(String.self, forKey: .art)
    }
}

public struct PatronAbility: Codable, Hashable, Sendable {
    public var cost: [String: Int]?
    public var effect: String?
    public var desc: String?
    public var n: Int?
    public var card: String?
    public var passive: String?
    public var chimeraCombo: Int?
}

public struct PatronAbilities: Codable, Hashable, Sendable {
    public var favored: PatronAbility?
    public var neutral: PatronAbility?
    public var unfavored: PatronAbility?
    public var lockFavored: Bool?
    public var alwaysNeutral: Bool?
    public var flipUnfavoredToFavored: Bool?
}

public struct PatronDef: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var short: String
    public var color: String
    public var starter: String?
    public var alwaysNeutral: Bool?
    public var abilities: PatronAbilities
    public var image: String?

    public var isTreasury: Bool { id == "treasury" }
    public var neverTurns: Bool { alwaysNeutral == true || abilities.alwaysNeutral == true || id == "treasury" || id == "mora" }
}

public struct DeckDef: Codable, Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var short: String
    public var starter: String?
    public var cards: [String]
    public var color: String
}

public struct CardInst: Identifiable, Hashable, Codable, Sendable {
    public var id: String { uid }
    public var uid: String
    public var cardId: String
    public var hp: Int?
    public var maxHp: Int?
    public var taunt: Bool
    public var confined: [CardInst]

    public init(uid: String = UUID().uuidString, cardId: String, hp: Int? = nil, maxHp: Int? = nil, taunt: Bool = false, confined: [CardInst] = []) {
        self.uid = uid
        self.cardId = cardId
        self.hp = hp
        self.maxHp = maxHp
        self.taunt = taunt
        self.confined = confined
    }
}

public struct PlayerState: Hashable, Codable, Sendable {
    public var isAI: Bool
    public var patrons: [String]
    public var coin: Int
    public var power: Int
    public var prestige: Int
    public var hand: [CardInst]
    public var draw: [CardInst]
    public var cooldown: [CardInst]
    public var played: [CardInst]
    public var agents: [CardInst]
    public var exile: [CardInst]
    public var patronCallsLeft: Int
    public var setbackCoin: Int
    public var setbackPower: Int
    public var setbackDraw: Int
    public var suitsPlayed: [String: Int]
    public var openingBonusGranted: Bool

    public init(isAI: Bool, patrons: [String], draw: [CardInst] = []) {
        self.isAI = isAI
        self.patrons = patrons
        self.coin = 0
        self.power = 0
        self.prestige = 0
        self.hand = []
        self.draw = draw
        self.cooldown = []
        self.played = []
        self.agents = []
        self.exile = []
        self.patronCallsLeft = 1
        self.setbackCoin = 0
        self.setbackPower = 0
        self.setbackDraw = 0
        self.suitsPlayed = [:]
        self.openingBonusGranted = false
    }

    public var ownedCount: Int {
        hand.count + draw.count + cooldown.count + played.count + agents.count
    }
}

public struct MatchState: Hashable, Codable, Sendable {
    public var players: [PlayerState]
    public var active: Int
    public var matchPatrons: [String]
    public var favor: [String: Int]
    public var tavern: [CardInst]
    public var tavernPile: [CardInst]
    public var tavernDiscard: [CardInst]
    public var turn: Int
    public var winner: Int?
    public var winReason: String?
    public var awaitingLastChance: Bool
    public var lastChance: Int?
    public var log: [String]
    public var playerFirst: Bool

    public init() {
        players = []
        active = 0
        matchPatrons = []
        favor = [:]
        tavern = []
        tavernPile = []
        tavernDiscard = []
        turn = 1
        winner = nil
        winReason = nil
        awaitingLastChance = false
        lastChance = nil
        log = []
        playerFirst = true
    }

    public var you: PlayerState { players.indices.contains(0) ? players[0] : PlayerState(isAI: false, patrons: []) }
    public var rival: PlayerState { players.indices.contains(1) ? players[1] : PlayerState(isAI: true, patrons: []) }
}

public enum EngineAction: Hashable, Sendable {
    case play(uid: String, cardId: String, choice: Int)
    case buy(index: Int, cardId: String, cost: Int)
    case patron(id: String)
    case knockout(uid: String, hp: Int)
    case end
}

public enum CatalogError: Error {
    case missingFile(String)
    case decode(String)
}
