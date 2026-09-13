import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: GameSession

    var body: some View {
        Group {
            switch session.screen {
            case .splash: SplashMenuView()
            case .pick: PatronSelectView()
            case .match:
                if session.engine != nil {
                    MatchBoardView()
                } else {
                    SplashMenuView()
                }
            case .encyclopedia: EncyclopediaView()
            case .shop: ShopView()
            case .gauntlet: TamrielMapView()
            case .collection: EncyclopediaView()
            }
        }
        .preferredColorScheme(.dark)
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
    }
}
