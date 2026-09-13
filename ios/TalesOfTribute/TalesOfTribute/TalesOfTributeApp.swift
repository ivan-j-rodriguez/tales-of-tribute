import SwiftUI

@main
struct TalesOfTributeApp: App {
    @StateObject private var store = GameStore()
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
        }
    }
}

enum AppScreen { case splash, pick, match, encyclopedia }

final class GameStore: ObservableObject {
    @Published var screen: AppScreen = .splash
    @Published var catalog: Catalog
    @Published var engine: TributeEngine?

    init() {
        catalog = Catalog.load()
    }

    func startMatch(you: [String], opp: [String]) {
        let eng = TributeEngine(catalog: catalog)
        eng.newMatch(playerPatrons: you, aiPatrons: opp)
        engine = eng
        screen = .match
    }
}
