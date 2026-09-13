import Foundation
import Combine
import TributeCore

enum AppScreen: Equatable {
    case splash, pick, match, encyclopedia, shop, gauntlet, collection
}

enum MatchKind: Equatable {
    case ai
    case gauntlet(GauntletStop)
}

final class UserDefaultsProfileStore: ProfilePersisting {
    static let key = "tot_ios_profile_v1"
    func load() -> ClubProfile {
        guard let data = UserDefaults.standard.data(forKey: Self.key),
              let p = try? JSONDecoder().decode(ClubProfile.self, from: data) else {
            return ClubProfile()
        }
        return p
    }
    func save(_ profile: ClubProfile) {
        if let data = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }
}

@MainActor
final class GameSession: ObservableObject {
    @Published var screen: AppScreen = .splash
    @Published var catalog: Catalog
    @Published var profile: ClubProfile
    @Published var engine: TributeEngine?
    @Published var tick = 0
    @Published var matchKind: MatchKind = .ai
    @Published var toast: String?
    @Published var inspectingCard: CardInst?
    @Published var inspectingPatron: String?
    @Published var pendingPatron: String?
    @Published var aiThinking = false
    @Published var lastReward: String?

    let store: ProfilePersisting
    private var aiWork: Task<Void, Never>?
    private var settled = false

    init(store: ProfilePersisting = UserDefaultsProfileStore()) {
        self.store = store
        var cat = Catalog.loadFromBundle()
        if cat.cards.isEmpty, let repo = Catalog.loadFromRepoData() {
            cat = repo
        }
        catalog = cat
        var p = store.load()
        ClubLogic.ensureGauntletDay(&p)
        profile = p
    }

    func persist() {
        store.save(profile)
    }

    func bump() {
        tick &+= 1
        objectWillChange.send()
    }

    func startAIMatch(you: [String], opp: [String]) {
        matchKind = .ai
        begin(you: you, opp: opp, difficulty: profile.aiDifficulty)
    }

    func startGauntlet(_ stop: GauntletStop) {
        matchKind = .gauntlet(stop)
        begin(you: stop.you, opp: stop.opp, difficulty: stop.difficulty)
    }

    private func begin(you: [String], opp: [String], difficulty: Int) {
        let eng = TributeEngine(catalog: catalog)
        eng.ownedUpgrades = profile.ownedUpgrades
        eng.onChange = { [weak self] in
            Task { @MainActor in self?.bump() }
        }
        eng.newMatch(playerPatrons: you, aiPatrons: opp, ownedUpgrades: profile.ownedUpgrades)
        settled = false
        engine = eng
        inspectingCard = nil
        inspectingPatron = nil
        pendingPatron = nil
        screen = .match
        bump()
        if eng.state.active == 1 { runAI(difficulty: difficulty) }
    }

    func afterHumanAction() {
        bump()
        guard let eng = engine, eng.state.winner == nil, eng.state.active == 1 else {
            if engine?.state.winner != nil { settleMatch() }
            return
        }
        let diff: Int
        if case .gauntlet(let s) = matchKind { diff = s.difficulty } else { diff = profile.aiDifficulty }
        runAI(difficulty: diff)
    }

    private func runAI(difficulty: Int) {
        aiWork?.cancel()
        aiThinking = true
        let delay = TributeAI(difficulty: difficulty).actionDelayMs()
        aiWork = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(delay) * 1_000_000)
            guard let self, let eng = self.engine, !Task.isCancelled else { return }
            TributeAI(difficulty: difficulty).takeTurn(engine: eng)
            self.aiThinking = false
            self.bump()
            if eng.state.winner != nil { self.settleMatch() }
        }
    }

    func settleMatch() {
        guard !settled, let eng = engine, let w = eng.state.winner else { return }
        settled = true
        let won = w == 0
        switch matchKind {
        case .ai:
            ClubLogic.recordMatch(&profile, won: won)
        case .gauntlet(let stop):
            ClubLogic.recordMatch(&profile, won: won, isGauntlet: true, stop: stop)
        }
        if won {
            if case .gauntlet(let stop) = matchKind {
                lastReward = "+\(stop.rewardGold) gold · purse"
            } else {
                lastReward = "+8 gold"
            }
        } else {
            lastReward = nil
        }
        persist()
        bump()
    }

    func leaveMatch() {
        aiWork?.cancel()
        engine = nil
        screen = .splash
    }

    func setDifficulty(_ n: Int) {
        profile.aiDifficulty = min(10, max(1, n))
        persist()
    }
}
