import Foundation

public enum Upgrades {
    public static let upgradeToBase: [String: String] = [
        "ayleid-quartermaster": "ayleid-defector",
        "chainbreaker-captain": "chainbreaker-sergeant",
        "morihaus-sacred-bull": "morihaus-the-archer",
        "whitestrake-ascendant": "pelinal-whitestrake",
        "almsivis-charity": "mothers-mercy",
        "festival-of-forbearance": "bardic-veneration",
        "hand-of-almalexia": "devotional-gaoler",
        "mercymother-elite": "tribunal-sentinel",
        "augurs-counsel": "sage-counsel",
        "ceporahs-insight": "psijics-insight",
        "prophesy": "prescience",
        "psijic-relicmaster": "psijic-apprentice",
        "blackfeather-knave": "blackfeather-brigand",
        "murder-of-crows": "scratch",
        "plunder": "pilfer",
        "toll-of-silver": "toll-of-flesh",
        "draoife-ritecaller": "eldertide-fenwitch",
        "druid-king-vestments": "runes-of-the-draoife",
        "envoy-of-the-draoife": "stonelore-rockseer",
        "wispheart-totem": "wispcaller-totem",
        "ebony-mine": "kwama-egg-mine",
        "hlaalu-councilor": "hlaalu-kinsman",
        "house-embassy": "house-marketplace",
        "oathman": "hireling",
        "anseis-victory": "ansei-assault",
        "grand-oratory": "battle-meditation",
        "hel-shira-herald": "no-shira-poet",
        "hiras-end": "march-on-hattu",
        "chromatic-reservoir": "unsettling-aura",
        "lantern-of-the-endless": "apocryphal-pact",
        "seeker-aspirant": "cipher-of-the-eye",
        "unfathomable-secrets": "bargain-for-knowledge",
        "pyandonean-war-fleet": "serpentprow-schooner",
        "sea-serpent-colossus": "ghostscale-sea-serpent",
        "serpentguard-rider": "storm-shark-wavecaller",
        "summerset-sacking": "maormer-boarding-party",
        "knight-commander": "banneret",
        "knights-of-saint-pelin": "bangkorai-sentries",
        "legions-arrival": "reinforcements",
        "siege-weapon-volley": "archers-volley",
        "grand-larceny": "pounce-and-profit",
        "prowling-shadow": "jeering-shadow",
        "rings-guile": "bag-of-tricks",
        "shadows-slumber": "jarring-lullaby",
        "blood-sacrifice": "bloody-offering",
        "elder-witch": "clan-witch",
        "hagraven-matron": "hagraven",
        "imperial-plunder": "imperial-spoils",
    ]

    public static var baseToUpgrade: [String: String] {
        Dictionary(uniqueKeysWithValues: upgradeToBase.map { ($0.value, $0.key) })
    }

    public static func tavernQty(card: CardDef, ownedUpgradeIds: [String]) -> Int {
        if card.token || card.curse == true || card.starter { return 0 }
        if ["the-chimera", "gold", "writ-of-coin", "bewilderment"].contains(card.id) { return 0 }
        let owned = Set(ownedUpgradeIds)
        let isPureUpgrade = card.baseQty == 0 && card.upgradedQty > 0
        if isPureUpgrade {
            return owned.contains(card.id) ? card.upgradedQty : 0
        }
        if let partner = baseToUpgrade[card.id] {
            return owned.contains(partner) ? card.upgradedQty : card.baseQty
        }
        if card.baseQty > 0 { return card.baseQty }
        return card.upgradedQty
    }

    public static func upgrades(forPatron patronId: String, cards: [CardDef]) -> [String] {
        cards.filter {
            $0.patron == patronId && $0.baseQty == 0 && $0.upgradedQty > 0
                && !$0.token && !$0.starter && $0.curse != true
        }.map(\.id)
    }
}
