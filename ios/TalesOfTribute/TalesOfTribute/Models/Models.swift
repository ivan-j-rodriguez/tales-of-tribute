import Foundation

struct Effect: Codable, Hashable {
    var op: String
    var n: Int?
    var text: String?
    var resource: String?
    var trigger: String?
    var card: String?
    var options: [[Effect]]?
    var coinPerKnock: Int?
}

struct CardDef: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var patron: String
    var type: String
    var contract: Bool
    var cost: Int
    var hp: Int?
    var taunt: Bool
    var playText: String
    var combo2Text: String?
    var combo3Text: String?
    var combo4Text: String?
    var play: [Effect]
    var combo2: [Effect]
    var combo3: [Effect]
    var combo4: [Effect]
    var baseQty: Int
    var upgradedQty: Int
    var upgraded: Bool
    var starter: Bool
    var token: Bool
    var curse: Bool?
    var art: String?
}

struct PatronAbility: Codable, Hashable {
    var cost: [String: Int]?
    var effect: String?
    var desc: String?
    var n: Int?
    var card: String?
    var passive: String?
    var chimeraCombo: Int?
}

struct PatronAbilities: Codable, Hashable {
    var favored: PatronAbility?
    var neutral: PatronAbility?
    var unfavored: PatronAbility?
    var lockFavored: Bool?
    var alwaysNeutral: Bool?
    var flipUnfavoredToFavored: Bool?
}

struct PatronDef: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var short: String
    var color: String
    var starter: String?
    var alwaysNeutral: Bool?
    var abilities: PatronAbilities
    var image: String?
}

struct DeckDef: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var short: String
    var starter: String?
    var cards: [String]
    var color: String
}

struct Catalog {
    var cards: [CardDef]
    var patrons: [PatronDef]
    var decks: [DeckDef]
    var cardsById: [String: CardDef]
    var patronsById: [String: PatronDef]

    static func load() -> Catalog {
        func decode<T: Decodable>(_ name: String, _ type: T.Type) -> T {
            let url = Bundle.main.url(forResource: name, withExtension: "json")
                ?? URL(fileURLWithPath: "Resources/\(name).json")
            let data = (try? Data(contentsOf: url)) ?? Data("{}".utf8)
            return (try? JSONDecoder().decode(T.self, from: data))!
        }
        struct CardsFile: Decodable { var cards: [CardDef] }
        struct PatronsFile: Decodable { var patrons: [PatronDef] }
        struct DecksFile: Decodable { var decks: [DeckDef] }
        let cards = decode("cards", CardsFile.self).cards
        let patrons = decode("patrons", PatronsFile.self).patrons
        let decks = decode("decks", DecksFile.self).decks
        return Catalog(
            cards: cards, patrons: patrons, decks: decks,
            cardsById: Dictionary(uniqueKeysWithValues: cards.map { ($0.id, $0) }),
            patronsById: Dictionary(uniqueKeysWithValues: patrons.map { ($0.id, $0) })
        )
    }
}

struct CardInst: Identifiable, Hashable {
    var id: String { uid }
    var uid: String
    var cardId: String
    var hp: Int?
    var maxHp: Int?
    var taunt: Bool
    var confined: [CardInst] = []
}

struct PlayerState {
    var isAI: Bool
    var patrons: [String]
    var coin = 0, power = 0, prestige = 0
    var hand: [CardInst] = []
    var draw: [CardInst] = []
    var cooldown: [CardInst] = []
    var played: [CardInst] = []
    var agents: [CardInst] = []
    var exile: [CardInst] = []
    var patronCallsLeft = 1
    var setbackCoin = 0, setbackPower = 0, setbackDraw = 0
    var suitsPlayed: [String: Int] = [:]
}
