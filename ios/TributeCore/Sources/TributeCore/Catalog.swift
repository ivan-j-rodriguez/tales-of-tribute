import Foundation

public struct Catalog: Sendable {
    public var cards: [CardDef]
    public var patrons: [PatronDef]
    public var decks: [DeckDef]
    public var cardsById: [String: CardDef]
    public var patronsById: [String: PatronDef]

    public init(cards: [CardDef], patrons: [PatronDef], decks: [DeckDef]) {
        self.cards = cards
        self.patrons = patrons
        self.decks = decks
        self.cardsById = Dictionary(uniqueKeysWithValues: cards.map { ($0.id, $0) })
        self.patronsById = Dictionary(uniqueKeysWithValues: patrons.map { ($0.id, $0) })
    }

    public var playablePatrons: [PatronDef] {
        patrons.filter { $0.id != "treasury" }
    }

    public func card(_ id: String) -> CardDef? {
        if let c = cardsById[id] { return c }
        let slug = id.lowercased()
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "’", with: "")
            .replacingOccurrences(of: " ", with: "-")
        return cardsById[slug]
    }

    public static func load(from directory: URL) throws -> Catalog {
        struct CardsFile: Decodable { var cards: [CardDef] }
        struct PatronsFile: Decodable { var patrons: [PatronDef] }
        struct DecksFile: Decodable { var decks: [DeckDef] }

        func decode<T: Decodable>(_ name: String, _ type: T.Type) throws -> T {
            let url = directory.appendingPathComponent("\(name).json")
            guard FileManager.default.fileExists(atPath: url.path) else {
                throw CatalogError.missingFile(name)
            }
            let data = try Data(contentsOf: url)
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw CatalogError.decode("\(name): \(error)")
            }
        }

        let cards = try decode("cards", CardsFile.self).cards
        let patrons = try decode("patrons", PatronsFile.self).patrons
        let decks = try decode("decks", DecksFile.self).decks
        return Catalog(cards: cards, patrons: patrons, decks: decks)
    }

    /// iOS app bundle: JSON at bundle root (or Resources/).
    public static func loadFromBundle(_ bundle: Bundle = .main) -> Catalog {
        func url(_ name: String) -> URL? {
            bundle.url(forResource: name, withExtension: "json")
                ?? bundle.url(forResource: name, withExtension: "json", subdirectory: "Resources")
        }
        struct CardsFile: Decodable { var cards: [CardDef] }
        struct PatronsFile: Decodable { var patrons: [PatronDef] }
        struct DecksFile: Decodable { var decks: [DeckDef] }
        func decode<T: Decodable>(_ name: String, _ type: T.Type) -> T? {
            guard let u = url(name), let data = try? Data(contentsOf: u) else { return nil }
            return try? JSONDecoder().decode(T.self, from: data)
        }
        if let cards = decode("cards", CardsFile.self)?.cards,
           let patrons = decode("patrons", PatronsFile.self)?.patrons,
           let decks = decode("decks", DecksFile.self)?.decks {
            return Catalog(cards: cards, patrons: patrons, decks: decks)
        }
        if let bundled = Bundle.module.url(forResource: "cards", withExtension: "json", subdirectory: "Fixtures") {
            return (try? load(from: bundled.deletingLastPathComponent())) ?? Catalog(cards: [], patrons: [], decks: [])
        }
        return Catalog(cards: [], patrons: [], decks: [])
    }

    /// Walk up from a source file looking for repo `data/`.
    public static func loadFromRepoData(startingAt file: String = #filePath) -> Catalog? {
        var dir = URL(fileURLWithPath: file).deletingLastPathComponent()
        for _ in 0..<8 {
            let candidate = dir.appendingPathComponent("data")
            if FileManager.default.fileExists(atPath: candidate.appendingPathComponent("cards.json").path) {
                return try? load(from: candidate)
            }
            dir.deleteLastPathComponent()
        }
        return nil
    }
}
