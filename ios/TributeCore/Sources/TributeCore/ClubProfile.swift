import Foundation

public let starterDecks = ["pelin", "crows", "hlaalu", "celarus"]
public let lockedDecks = ["hunding", "redeagle", "orgnum", "rajhin", "druid", "almalexia", "mora", "alessia"]
public let allDecks = starterDecks + lockedDecks
public let fragmentsToUnlock = 5
public let sackBuyCost = 40
public let storeFragmentCost = 35
public let storeUpgradeCost = 55

public let rankTiers = ["Unranked", "Orichalcum", "Ebony", "Quicksilver", "Voidsteel", "Rubedite"]
public let rankThresholds = [0, 0, 100, 250, 450, 700]

public struct CosmeticItem: Identifiable, Hashable, Codable, Sendable {
    public var id: String
    public var name: String
    public var tag: String
    public var price: Int
    public var desc: String
}

public let tableSkins: [CosmeticItem] = [
    .init(id: "high-isle", name: "High Isle", tag: "Zone", price: 0, desc: "Systres limestone, teal surf, and Breton gold."),
    .init(id: "auridon", name: "Auridon", tag: "Zone", price: 80, desc: "Altmer marble and the azure Abecean."),
    .init(id: "warden", name: "Warden", tag: "Class", price: 90, desc: "Frostpine grove — ice bloom over deep moss."),
    .init(id: "nightblade", name: "Nightblade", tag: "Class", price: 100, desc: "Moonlight, void-purple, and a drop of blood."),
    .init(id: "grahtwood", name: "Grahtwood", tag: "Zone", price: 110, desc: "Valenwood canopy — gold light through leaves."),
    .init(id: "dragonknight", name: "Dragonknight", tag: "Class", price: 120, desc: "Molten stone and Red Mountain fire."),
    .init(id: "clockwork", name: "Clockwork City", tag: "Zone", price: 120, desc: "Brass, copper oil, and ticking factotums."),
    .init(id: "orsinium", name: "Orsinium", tag: "Zone", price: 140, desc: "Iron halls, frost, orichalcum green."),
    .init(id: "arcanist", name: "Arcanist", tag: "Class", price: 150, desc: "Verdant ink, gold runes, the eye of Mora."),
    .init(id: "daedra", name: "Coldharbour", tag: "Zone", price: 150, desc: "Soulfire cyan over Molag Bal’s grey waste."),
    .init(id: "vvardenfell", name: "Vvardenfell", tag: "Zone", price: 160, desc: "Ashfall, kwama amber, the mountain’s glow."),
    .init(id: "apocrypha", name: "Apocrypha", tag: "Zone", price: 180, desc: "Black ink seas and watching green eyes."),
    .init(id: "summerset", name: "Summerset", tag: "Zone", price: 180, desc: "Crystal Alinor — aurora over white-gold."),
    .init(id: "vestige", name: "Vestige", tag: "Class", price: 200, desc: "Aetherial blue — a sky-shard on the table."),
]

public let cardBacks: [CosmeticItem] = [
    .init(id: "default", name: "Roister Back", tag: "Back", price: 0, desc: "Club gold on dark oak."),
    .init(id: "nightblade", name: "Shadow Dance", tag: "Back", price: 70, desc: "Void and crimson."),
    .init(id: "warden", name: "Frostpine", tag: "Back", price: 70, desc: "Ice over living wood."),
    .init(id: "dragonknight", name: "Ember Scale", tag: "Back", price: 80, desc: "Lava-cracked hide."),
    .init(id: "clockwork", name: "Brass Circuit", tag: "Back", price: 80, desc: "Sotha Sil’s geometry."),
    .init(id: "auridon", name: "Altmer Sun", tag: "Back", price: 90, desc: "Pale gold of Firsthold."),
    .init(id: "daedra", name: "Soulfire", tag: "Back", price: 90, desc: "Coldharbour cyan."),
    .init(id: "arcanist", name: "Ink & Eye", tag: "Back", price: 100, desc: "Apocryphal gold runes."),
    .init(id: "apocrypha", name: "Green Eye", tag: "Back", price: 100, desc: "Hermaeus Mora’s gaze."),
    .init(id: "vestige", name: "Aetherial", tag: "Back", price: 110, desc: "Sky-shard glow."),
]

public struct RGB: Hashable, Sendable {
    public var r: Double
    public var g: Double
    public var b: Double
    public init(_ r: Double, _ g: Double, _ b: Double) { self.r = r; self.g = g; self.b = b }
}

public struct TablePalette: Hashable, Sendable {
    public var felt: RGB
    public var wood: RGB
    public var gold: RGB
    public var ink: RGB
    public var glow: RGB
}

public func palette(forSkin id: String) -> TablePalette {
    switch id {
    case "auridon": return .init(felt: RGB(0.10, 0.22, 0.28), wood: RGB(0.42, 0.34, 0.18), gold: RGB(0.91, 0.82, 0.50), ink: RGB(0.85, 0.88, 0.80), glow: RGB(0.55, 0.75, 0.90))
    case "warden": return .init(felt: RGB(0.06, 0.18, 0.16), wood: RGB(0.28, 0.22, 0.12), gold: RGB(0.49, 0.78, 0.85), ink: RGB(0.80, 0.90, 0.88), glow: RGB(0.40, 0.80, 0.85))
    case "nightblade": return .init(felt: RGB(0.10, 0.05, 0.12), wood: RGB(0.22, 0.10, 0.16), gold: RGB(0.78, 0.27, 0.27), ink: RGB(0.90, 0.80, 0.84), glow: RGB(0.70, 0.20, 0.35))
    case "grahtwood": return .init(felt: RGB(0.10, 0.20, 0.08), wood: RGB(0.32, 0.22, 0.10), gold: RGB(0.82, 0.70, 0.28), ink: RGB(0.88, 0.90, 0.72), glow: RGB(0.55, 0.70, 0.25))
    case "dragonknight": return .init(felt: RGB(0.18, 0.07, 0.05), wood: RGB(0.28, 0.12, 0.06), gold: RGB(0.88, 0.38, 0.12), ink: RGB(0.94, 0.86, 0.72), glow: RGB(0.95, 0.45, 0.15))
    case "clockwork": return .init(felt: RGB(0.14, 0.12, 0.08), wood: RGB(0.36, 0.28, 0.12), gold: RGB(0.79, 0.64, 0.15), ink: RGB(0.90, 0.84, 0.62), glow: RGB(0.85, 0.65, 0.20))
    case "orsinium": return .init(felt: RGB(0.10, 0.14, 0.12), wood: RGB(0.22, 0.20, 0.16), gold: RGB(0.45, 0.62, 0.38), ink: RGB(0.84, 0.86, 0.78), glow: RGB(0.40, 0.70, 0.45))
    case "arcanist": return .init(felt: RGB(0.05, 0.14, 0.08), wood: RGB(0.18, 0.16, 0.08), gold: RGB(0.83, 0.69, 0.22), ink: RGB(0.80, 0.92, 0.70), glow: RGB(0.30, 0.75, 0.35))
    case "daedra": return .init(felt: RGB(0.08, 0.10, 0.14), wood: RGB(0.16, 0.14, 0.16), gold: RGB(0.30, 0.78, 0.91), ink: RGB(0.78, 0.88, 0.92), glow: RGB(0.25, 0.80, 0.90))
    case "vvardenfell": return .init(felt: RGB(0.18, 0.10, 0.06), wood: RGB(0.30, 0.16, 0.08), gold: RGB(0.86, 0.55, 0.20), ink: RGB(0.92, 0.84, 0.68), glow: RGB(0.90, 0.40, 0.12))
    case "apocrypha": return .init(felt: RGB(0.04, 0.10, 0.07), wood: RGB(0.12, 0.14, 0.10), gold: RGB(0.23, 0.56, 0.31), ink: RGB(0.70, 0.88, 0.72), glow: RGB(0.20, 0.70, 0.35))
    case "summerset": return .init(felt: RGB(0.10, 0.16, 0.22), wood: RGB(0.40, 0.34, 0.22), gold: RGB(0.90, 0.82, 0.55), ink: RGB(0.92, 0.90, 0.82), glow: RGB(0.60, 0.80, 0.95))
    case "vestige": return .init(felt: RGB(0.08, 0.12, 0.20), wood: RGB(0.16, 0.18, 0.26), gold: RGB(0.38, 0.63, 1.0), ink: RGB(0.82, 0.88, 0.98), glow: RGB(0.40, 0.65, 1.0))
    default: return .init(felt: RGB(0.07, 0.16, 0.16), wood: RGB(0.36, 0.24, 0.12), gold: RGB(0.83, 0.69, 0.22), ink: RGB(0.94, 0.90, 0.80), glow: RGB(0.85, 0.90, 0.40))
    }
}

public func cardBackColors(_ id: String) -> (RGB, RGB) {
    switch id {
    case "nightblade": return (RGB(0.07, 0.03, 0.09), RGB(0.77, 0.27, 0.27))
    case "warden": return (RGB(0.04, 0.09, 0.08), RGB(0.49, 0.78, 0.85))
    case "dragonknight": return (RGB(0.10, 0.04, 0.03), RGB(0.88, 0.38, 0.13))
    case "clockwork": return (RGB(0.10, 0.09, 0.06), RGB(0.79, 0.64, 0.15))
    case "auridon": return (RGB(0.08, 0.09, 0.06), RGB(0.91, 0.82, 0.50))
    case "daedra": return (RGB(0.05, 0.06, 0.09), RGB(0.30, 0.78, 0.91))
    case "arcanist": return (RGB(0.03, 0.08, 0.05), RGB(0.83, 0.69, 0.22))
    case "apocrypha": return (RGB(0.04, 0.09, 0.06), RGB(0.23, 0.56, 0.31))
    case "vestige": return (RGB(0.06, 0.09, 0.16), RGB(0.38, 0.63, 1.0))
    default: return (RGB(0.10, 0.06, 0.03), RGB(0.83, 0.69, 0.22))
    }
}

public struct Purse: Hashable, Codable, Sendable {
    public var rarity: String
    public init(rarity: String) { self.rarity = rarity }
}

public struct GauntletState: Hashable, Codable, Sendable {
    public var date: String?
    public var order: [String]
    public var cleared: [String]
    public var failed: Bool
    public var failedStop: String?
    public var winStreak: Int

    public init() {
        date = nil
        order = []
        cleared = []
        failed = false
        failedStop = nil
        winStreak = 0
    }
}

public struct RankedState: Hashable, Codable, Sendable {
    public var tier: String
    public var points: Int
    public var placementLeft: Int
    public var winStreak: Int
    public init() {
        tier = "Unranked"
        points = 0
        placementLeft = 5
        winStreak = 0
    }
}

public struct ClubStats: Hashable, Codable, Sendable {
    public var wins: Int
    public var losses: Int
    public var matches: Int
    public var sacksOpened: Int
    public init() { wins = 0; losses = 0; matches = 0; sacksOpened = 0 }
}

public struct ClubProfile: Hashable, Codable, Sendable {
    public var gold: Int
    public var unlockedDecks: [String]
    public var ownedUpgrades: [String]
    public var deckFragments: [String: Int]
    public var tableSkin: String
    public var cardBack: String
    public var unlockedSkins: [String]
    public var unlockedBacks: [String]
    public var aiDifficulty: Int
    public var gauntlet: GauntletState
    public var ranked: RankedState
    public var purses: [Purse]
    public var lastCheckIn: String?
    public var checkInStreak: Int
    public var winStreak: Int
    public var stats: ClubStats
    public var tutorialDone: Bool

    public init() {
        gold = 80
        unlockedDecks = starterDecks
        ownedUpgrades = []
        deckFragments = Dictionary(uniqueKeysWithValues: lockedDecks.map { ($0, 0) })
        tableSkin = "high-isle"
        cardBack = "default"
        unlockedSkins = ["high-isle"]
        unlockedBacks = ["default"]
        aiDifficulty = 5
        gauntlet = GauntletState()
        ranked = RankedState()
        purses = [Purse(rarity: "Common")]
        lastCheckIn = nil
        checkInStreak = 0
        winStreak = 0
        stats = ClubStats()
        tutorialDone = false
    }

    public func isDeckUnlocked(_ id: String) -> Bool {
        id == "treasury" || unlockedDecks.contains(id)
    }

    public func unlockHint(_ id: String) -> String {
        if isDeckUnlocked(id) { return "" }
        let have = deckFragments[id] ?? 0
        switch id {
        case "hunding": return "Win 3 matches · fragments \(have)/\(fragmentsToUnlock)"
        case "redeagle": return "Clear a daily stop of difficulty 4+ · \(have)/\(fragmentsToUnlock)"
        case "orgnum": return "Own 120 gold at once, then a fragment drop · \(have)/\(fragmentsToUnlock)"
        case "rajhin": return "Open 3 cutpurses · \(have)/\(fragmentsToUnlock)"
        case "druid": return "Win with Pelin + Celarus in the same match · \(have)/\(fragmentsToUnlock)"
        case "almalexia": return "Reach a 3-win streak · \(have)/\(fragmentsToUnlock)"
        case "mora": return "Clear an Apocrypha / Telvanni daily or Epic purse · \(have)/\(fragmentsToUnlock)"
        case "alessia": return "Win a Cyrodiil daily or 10 total wins · \(have)/\(fragmentsToUnlock)"
        default: return "Collect \(fragmentsToUnlock) fragments (\(have)/\(fragmentsToUnlock))"
        }
    }
}

public struct GauntletStop: Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var region: String
    public var difficulty: Int
    public var you: [String]
    public var opp: [String]
    public var rival: String
    public var rewardGold: Int
    public var x: Double
    public var y: Double
    public var sea: Bool
}

/// Pins sit on the parchment Tamriel map (percent of image).
public let gauntletStops: [GauntletStop] = [
    .init(id: "glenumbra", name: "Glenumbra", region: "High Rock", difficulty: 1, you: ["pelin", "hlaalu"], opp: ["crows", "celarus"], rival: "Daggerfall Knight-Errant", rewardGold: 9, x: 16, y: 32, sea: false),
    .init(id: "stormhaven", name: "Stormhaven", region: "High Rock", difficulty: 2, you: ["pelin", "celarus"], opp: ["hunding", "crows"], rival: "High King Emeric", rewardGold: 10, x: 22, y: 26, sea: false),
    .init(id: "rivenspire", name: "Rivenspire", region: "High Rock", difficulty: 2, you: ["hlaalu", "crows"], opp: ["rajhin", "pelin"], rival: "Count Verandis", rewardGold: 11, x: 18, y: 18, sea: false),
    .init(id: "wrothgar", name: "Wrothgar", region: "High Rock", difficulty: 6, you: ["hunding", "redeagle"], opp: ["hunding", "redeagle"], rival: "King Kurog", rewardGold: 27, x: 30, y: 16, sea: false),
    .init(id: "betnikh", name: "Betnikh", region: "High Rock", difficulty: 1, you: ["pelin", "hlaalu"], opp: ["crows", "pelin"], rival: "Chief Tazgol", rewardGold: 8, x: 8, y: 42, sea: true),
    .init(id: "stros", name: "Stros M'Kai", region: "Hammerfell", difficulty: 1, you: ["pelin", "hlaalu"], opp: ["crows", "celarus"], rival: "Captain Kaleen", rewardGold: 8, x: 20, y: 54, sea: true),
    .init(id: "alikr", name: "Alik'r Desert", region: "Hammerfell", difficulty: 2, you: ["hunding", "hlaalu"], opp: ["hunding", "crows"], rival: "Ash'abah Seer", rewardGold: 12, x: 20, y: 38, sea: false),
    .init(id: "bangkorai", name: "Bangkorai", region: "Hammerfell", difficulty: 3, you: ["pelin", "hunding"], opp: ["redeagle", "crows"], rival: "Seventh Legion Strategist", rewardGold: 13, x: 32, y: 30, sea: false),
    .init(id: "hewsbane", name: "Hew's Bane", region: "Hammerfell", difficulty: 6, you: ["rajhin", "hlaalu"], opp: ["rajhin", "orgnum"], rival: "Zeira of the Thieves", rewardGold: 28, x: 26, y: 50, sea: false),
    .init(id: "craglorn", name: "Craglorn", region: "Hammerfell", difficulty: 6, you: ["hunding", "celarus"], opp: ["hunding", "almalexia"], rival: "Celestial Warrior", rewardGold: 26, x: 40, y: 32, sea: false),
    .init(id: "reach", name: "The Reach", region: "Skyrim", difficulty: 8, you: ["redeagle", "druid"], opp: ["redeagle", "mora"], rival: "Ard Caddach", rewardGold: 44, x: 38, y: 22, sea: false),
    .init(id: "wskyrim", name: "Western Skyrim", region: "Skyrim", difficulty: 8, you: ["redeagle", "hunding"], opp: ["redeagle", "alessia"], rival: "Svana of Solitude", rewardGold: 42, x: 42, y: 12, sea: false),
    .init(id: "eastmarch", name: "Eastmarch", region: "Skyrim", difficulty: 5, you: ["redeagle", "pelin"], opp: ["redeagle", "crows"], rival: "Jorunn the Skald-King", rewardGold: 22, x: 58, y: 20, sea: false),
    .init(id: "rift", name: "The Rift", region: "Skyrim", difficulty: 5, you: ["redeagle", "hlaalu"], opp: ["redeagle", "hunding"], rival: "Thane Unnvald", rewardGold: 23, x: 56, y: 28, sea: false),
    .init(id: "bleakrock", name: "Bleakrock Isle", region: "Skyrim", difficulty: 1, you: ["pelin", "celarus"], opp: ["crows", "pelin"], rival: "Captain Rana", rewardGold: 8, x: 62, y: 8, sea: true),
    .init(id: "cyrodiil", name: "Cyrodiil", region: "Cyrodiil", difficulty: 6, you: ["alessia", "pelin"], opp: ["alessia", "crows"], rival: "Elder Council Envoy", rewardGold: 24, x: 52, y: 36, sea: false),
    .init(id: "imperial", name: "Imperial City", region: "Cyrodiil", difficulty: 7, you: ["alessia", "hlaalu"], opp: ["alessia", "redeagle"], rival: "Drake of Blades", rewardGold: 30, x: 52, y: 42, sea: false),
    .init(id: "goldcoast", name: "Gold Coast", region: "Cyrodiil", difficulty: 7, you: ["alessia", "hlaalu"], opp: ["alessia", "rajhin"], rival: "Speaker Terenus", rewardGold: 30, x: 36, y: 54, sea: false),
    .init(id: "westweald", name: "West Weald", region: "Cyrodiil", difficulty: 9, you: ["alessia", "celarus"], opp: ["alessia", "druid"], rival: "Tribune Alea", rewardGold: 54, x: 42, y: 48, sea: false),
    .init(id: "stonefalls", name: "Stonefalls", region: "Morrowind", difficulty: 4, you: ["almalexia", "pelin"], opp: ["almalexia", "crows"], rival: "Tanval Indoril", rewardGold: 18, x: 70, y: 38, sea: false),
    .init(id: "balfoyen", name: "Bal Foyen", region: "Morrowind", difficulty: 2, you: ["almalexia", "pelin"], opp: ["crows", "almalexia"], rival: "Darj the Hunter", rewardGold: 10, x: 80, y: 36, sea: false),
    .init(id: "deshaan", name: "Deshaan", region: "Morrowind", difficulty: 5, you: ["almalexia", "hlaalu"], opp: ["almalexia", "celarus"], rival: "Ordinator Vamen", rewardGold: 20, x: 76, y: 44, sea: false),
    .init(id: "vvardenfell", name: "Vvardenfell", region: "Morrowind", difficulty: 7, you: ["almalexia", "celarus"], opp: ["almalexia", "mora"], rival: "Vivec", rewardGold: 32, x: 74, y: 20, sea: true),
    .init(id: "telvanni", name: "Telvanni Peninsula", region: "Morrowind", difficulty: 9, you: ["mora", "almalexia"], opp: ["mora", "almalexia"], rival: "Master Nelos", rewardGold: 52, x: 88, y: 34, sea: false),
    .init(id: "clockwork", name: "Clockwork City", region: "Oblivion", difficulty: 7, you: ["celarus", "hlaalu"], opp: ["celarus", "alessia"], rival: "Sotha Sil", rewardGold: 34, x: 82, y: 24, sea: false),
    .init(id: "shadowfen", name: "Shadowfen", region: "Black Marsh", difficulty: 5, you: ["rajhin", "celarus"], opp: ["rajhin", "hunding"], rival: "Vicecanon Heita-Meen", rewardGold: 21, x: 72, y: 54, sea: false),
    .init(id: "blackwood", name: "Blackwood", region: "Black Marsh", difficulty: 9, you: ["alessia", "almalexia"], opp: ["alessia", "almalexia"], rival: "Eveli Sharp-Arrow", rewardGold: 46, x: 62, y: 60, sea: false),
    .init(id: "murkmire", name: "Murkmire", region: "Black Marsh", difficulty: 8, you: ["rajhin", "druid"], opp: ["rajhin", "druid"], rival: "Kassandra", rewardGold: 36, x: 74, y: 78, sea: false),
    .init(id: "auridon", name: "Auridon", region: "Summerset", difficulty: 3, you: ["celarus", "hlaalu"], opp: ["celarus", "crows"], rival: "Canonreeve Sinyon", rewardGold: 14, x: 22, y: 68, sea: true),
    .init(id: "grahtwood", name: "Grahtwood", region: "Valenwood", difficulty: 3, you: ["druid", "celarus"], opp: ["druid", "crows"], rival: "King Camoran Aeradan", rewardGold: 15, x: 42, y: 74, sea: false),
    .init(id: "greenshade", name: "Greenshade", region: "Valenwood", difficulty: 4, you: ["druid", "pelin"], opp: ["druid", "rajhin"], rival: "Queen Ayrenn", rewardGold: 16, x: 34, y: 72, sea: false),
    .init(id: "malabal", name: "Malabal Tor", region: "Valenwood", difficulty: 4, you: ["druid", "hlaalu"], opp: ["orgnum", "crows"], rival: "Silvenar Hound", rewardGold: 17, x: 36, y: 64, sea: false),
    .init(id: "reapers", name: "Reaper's March", region: "Elsweyr", difficulty: 4, you: ["rajhin", "hlaalu"], opp: ["rajhin", "celarus"], rival: "Mane Akkhuz-ri", rewardGold: 18, x: 44, y: 58, sea: false),
    .init(id: "nelsweyr", name: "Northern Elsweyr", region: "Elsweyr", difficulty: 8, you: ["rajhin", "almalexia"], opp: ["rajhin", "alessia"], rival: "Khamira", rewardGold: 38, x: 50, y: 62, sea: false),
    .init(id: "selsweyr", name: "Southern Elsweyr", region: "Elsweyr", difficulty: 8, you: ["rajhin", "orgnum"], opp: ["orgnum", "redeagle"], rival: "Sai Sahan", rewardGold: 40, x: 52, y: 76, sea: false),
    .init(id: "khenarthi", name: "Khenarthi's Roost", region: "Elsweyr", difficulty: 1, you: ["rajhin", "celarus"], opp: ["crows", "rajhin"], rival: "Commander Karinith", rewardGold: 8, x: 52, y: 86, sea: true),
    .init(id: "summerset", name: "Summerset", region: "Summerset", difficulty: 7, you: ["celarus", "orgnum"], opp: ["celarus", "orgnum"], rival: "Proxy Queen Alwinarwe", rewardGold: 35, x: 14, y: 80, sea: true),
    .init(id: "highisle", name: "Gonfalon Bay", region: "High Isle", difficulty: 1, you: ["pelin", "hlaalu"], opp: ["crows", "celarus"], rival: "Lord Bacaro", rewardGold: 10, x: 8, y: 60, sea: true),
    .init(id: "galen", name: "Galen", region: "Systres", difficulty: 9, you: ["druid", "orgnum"], opp: ["druid", "mora"], rival: "Druid King Kasorayn", rewardGold: 50, x: 6, y: 50, sea: true),
    .init(id: "solstice", name: "Solstice", region: "Southern Seas", difficulty: 10, you: ["orgnum", "mora"], opp: ["orgnum", "mora"], rival: "Tide-Born Admiral", rewardGold: 70, x: 74, y: 90, sea: true),
    .init(id: "apocrypha", name: "Apocrypha", region: "Oblivion", difficulty: 10, you: ["mora", "celarus"], opp: ["mora", "alessia"], rival: "Hermaeus Mora", rewardGold: 80, x: 94, y: 16, sea: false),
    .init(id: "coldharbour", name: "Coldharbour", region: "Oblivion", difficulty: 10, you: ["alessia", "mora"], opp: ["alessia", "mora"], rival: "Molag Bal's Proxy", rewardGold: 60, x: 4, y: 10, sea: false),
    .init(id: "deadlands", name: "The Deadlands", region: "Oblivion", difficulty: 10, you: ["redeagle", "mora"], opp: ["redeagle", "alessia"], rival: "Lyranth", rewardGold: 64, x: 10, y: 8, sea: false),
]

public enum ClubLogic {
    public static func nyDateStr(_ date: Date = Date()) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "America/New_York") ?? .gmt
        let c = cal.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    public static func seededShuffle<T>(_ arr: [T], seed: String) -> [T] {
        var h: UInt32 = 2166136261
        for u in seed.utf8 {
            h ^= UInt32(u)
            h = h &* 16777619
        }
        var a = arr
        if a.count < 2 { return a }
        for i in stride(from: a.count - 1, through: 1, by: -1) {
            h ^= h &<< 13
            h ^= h &>> 17
            h ^= h &<< 5
            let j = Int(h % UInt32(i + 1))
            a.swapAt(i, j)
        }
        return a
    }

    /// Date-seeded path. High Isle is always first; remaining zones shuffle by NY date.
    public static func ensureGauntletDay(_ profile: inout ClubProfile, now: Date = Date()) {
        let today = nyDateStr(now)
        if profile.gauntlet.date != today || profile.gauntlet.order.isEmpty || profile.gauntlet.order.first != "highisle" {
            let rest = gauntletStops.map(\.id).filter { $0 != "highisle" }
            profile.gauntlet.date = today
            profile.gauntlet.order = ["highisle"] + seededShuffle(rest, seed: today + ":tot-road")
            profile.gauntlet.cleared = []
            profile.gauntlet.failed = false
            profile.gauntlet.failedStop = nil
            profile.gauntlet.winStreak = 0
        }
    }

    public static func todaysPath(_ profile: ClubProfile) -> [GauntletStop] {
        profile.gauntlet.order.compactMap { id in gauntletStops.first { $0.id == id } }
    }

    public static func nextPlayableStop(_ profile: ClubProfile) -> GauntletStop? {
        if profile.gauntlet.failed { return nil }
        return todaysPath(profile).first { !profile.gauntlet.cleared.contains($0.id) }
    }

    public static func rarityFromStreak(_ streak: Int, ranked: Bool = false) -> String {
        if ranked {
            if streak >= 5 { return "Legendary" }
            if streak >= 4 { return "Epic" }
            if streak >= 3 { return "Superior" }
            if streak >= 2 { return "Fine" }
            return "Common"
        }
        if streak >= 4 { return "Epic" }
        if streak >= 3 { return "Superior" }
        if streak >= 2 { return "Fine" }
        return "Common"
    }

    public static func recordMatch(_ profile: inout ClubProfile, won: Bool, isGauntlet: Bool = false, stop: GauntletStop? = nil) {
        profile.stats.matches += 1
        if won {
            profile.stats.wins += 1
            profile.winStreak += 1
            profile.gold += isGauntlet ? (stop?.rewardGold ?? 10) : 8
            let rarity = rarityFromStreak(isGauntlet ? profile.gauntlet.winStreak + 1 : profile.winStreak)
            if isGauntlet || profile.winStreak >= 2 {
                profile.purses.append(Purse(rarity: rarity))
            }
            if isGauntlet, let stop {
                profile.gauntlet.cleared.append(stop.id)
                profile.gauntlet.winStreak += 1
                grantFragmentIfNeeded(&profile, stop: stop)
            }
            maybeGrantProgressFragments(&profile)
        } else {
            profile.stats.losses += 1
            profile.winStreak = 0
            profile.gold += isGauntlet ? 3 : 3
            if isGauntlet, let stop {
                profile.gauntlet.failed = true
                profile.gauntlet.failedStop = stop.id
                profile.gauntlet.winStreak = 0
            }
        }
    }

    private static func grantFragmentIfNeeded(_ profile: inout ClubProfile, stop: GauntletStop) {
        if stop.difficulty >= 4 { addFragment(&profile, "redeagle") }
        if ["apocrypha", "telvanni"].contains(stop.id) { addFragment(&profile, "mora") }
        if ["cyrodiil", "imperial", "goldcoast"].contains(stop.id) { addFragment(&profile, "alessia") }
    }

    private static func maybeGrantProgressFragments(_ profile: inout ClubProfile) {
        if profile.stats.wins >= 3 { addFragment(&profile, "hunding") }
        if profile.stats.sacksOpened >= 3 { addFragment(&profile, "rajhin") }
        if profile.winStreak >= 3 { addFragment(&profile, "almalexia") }
        if profile.stats.wins >= 10 { addFragment(&profile, "alessia") }
        if profile.gold >= 120 { addFragment(&profile, "orgnum") }
    }

    @discardableResult
    public static func addFragment(_ profile: inout ClubProfile, _ deckId: String) -> Bool {
        if profile.unlockedDecks.contains(deckId) { return false }
        let cur = min(fragmentsToUnlock, (profile.deckFragments[deckId] ?? 0) + 1)
        profile.deckFragments[deckId] = cur
        if cur >= fragmentsToUnlock {
            profile.unlockedDecks.append(deckId)
            return true
        }
        return false
    }

    public static func buySkin(_ profile: inout ClubProfile, _ id: String) -> String? {
        guard let skin = tableSkins.first(where: { $0.id == id }) else { return "Unknown skin." }
        if profile.unlockedSkins.contains(id) {
            profile.tableSkin = id
            return nil
        }
        if profile.gold < skin.price { return "Need \(skin.price) gold." }
        profile.gold -= skin.price
        profile.unlockedSkins.append(id)
        profile.tableSkin = id
        return nil
    }

    public static func buyBack(_ profile: inout ClubProfile, _ id: String) -> String? {
        guard let back = cardBacks.first(where: { $0.id == id }) else { return "Unknown back." }
        if profile.unlockedBacks.contains(id) {
            profile.cardBack = id
            return nil
        }
        if profile.gold < back.price { return "Need \(back.price) gold." }
        profile.gold -= back.price
        profile.unlockedBacks.append(id)
        profile.cardBack = id
        return nil
    }

    public static func openPurse(_ profile: inout ClubProfile, cards: [CardDef]) -> String {
        guard !profile.purses.isEmpty else { return "No purses." }
        let purse = profile.purses.removeFirst()
        profile.stats.sacksOpened += 1
        let bias = ["Common": 0, "Fine": 1, "Superior": 2, "Epic": 3, "Legendary": 4][purse.rarity] ?? 0
        let goldGain = 15 + bias * 12 + Int.random(in: 0...(30 + bias * 10))
        profile.gold += goldGain
        if bias >= 2 {
            if let locked = lockedDecks.first(where: { !profile.unlockedDecks.contains($0) }) {
                addFragment(&profile, locked)
            }
        }
        _ = cards
        return "\(purse.rarity) purse: +\(goldGain) gold"
    }
}

public protocol ProfilePersisting: AnyObject {
    func load() -> ClubProfile
    func save(_ profile: ClubProfile)
}

public final class MemoryProfileStore: ProfilePersisting, @unchecked Sendable {
    public var profile: ClubProfile
    public init(_ profile: ClubProfile = ClubProfile()) { self.profile = profile }
    public func load() -> ClubProfile { profile }
    public func save(_ profile: ClubProfile) { self.profile = profile }
}
