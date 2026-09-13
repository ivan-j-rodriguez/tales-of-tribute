import SwiftUI
import TributeCore

struct MatchBoardView: View {
    @EnvironmentObject var session: GameSession
    var eng: TributeEngine { session.engine! }
    var theme: TableTheme { TableTheme(skin: session.profile.tableSkin, back: session.profile.cardBack) }

    var yourTurn: Bool { eng.state.active == 0 && eng.state.winner == nil }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                FeltTable(theme: theme)
                VStack(spacing: 4) {
                    opponentRow
                    tokenRow(for: 1).scaleEffect(0.9)
                    tavernRow
                    tokenRow(for: 0)
                    playerAgentsAndResources
                    FannedHandView(
                        cards: eng.state.players[0].hand,
                        catalog: session.catalog,
                        theme: theme,
                        enabled: yourTurn,
                        onTap: { c in
                            if eng.playCard(c.uid) { session.afterHumanAction() }
                        },
                        onHold: { session.inspectingCard = $0 }
                    )
                    .frame(height: min(168, geo.size.height * 0.26))
                    .padding(.horizontal, 80)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)

                HStack {
                    playedEffectsStrip
                    Spacer()
                    HStack(alignment: .center, spacing: 10) {
                        PatronRailView(
                            engine: eng,
                            theme: theme,
                            canAct: yourTurn,
                            onTap: { pid in
                                session.pendingPatron = pid
                                session.inspectingPatron = pid
                            },
                            onHold: { session.inspectingPatron = $0 }
                        )
                        HourglassView(glowing: yourTurn, theme: theme) {
                            eng.endTurn()
                            session.afterHumanAction()
                        }
                    }
                    .padding(.trailing, 10)
                }
                .padding(.top, geo.size.height * 0.08)

                if let w = eng.state.winner {
                    resultOverlay(w)
                }
                if let card = session.inspectingCard {
                    CardInspectOverlay(def: session.catalog.card(card.cardId), inst: card, theme: theme) {
                        session.inspectingCard = nil
                    }
                }
                if let pid = session.inspectingPatron {
                    PatronInspectOverlay(
                        engine: eng,
                        patronId: pid,
                        theme: theme,
                        canActivate: yourTurn && session.pendingPatron == pid && eng.canCall(pid),
                        onActivate: {
                            if eng.callPatron(pid) {
                                session.inspectingPatron = nil
                                session.pendingPatron = nil
                                session.afterHumanAction()
                            }
                        },
                        onClose: {
                            session.inspectingPatron = nil
                            session.pendingPatron = nil
                        }
                    )
                }
            }
        }
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
    }

    var opponentRow: some View {
        HStack(alignment: .center, spacing: 10) {
            PileToken(title: "Draw", count: eng.state.players[1].draw.count, theme: theme)
            opponentFan
            agentRow(eng.state.players[1].agents, enemy: true)
            PileToken(title: "Cooldown", count: eng.state.players[1].cooldown.count, theme: theme)
            Spacer(minLength: 170)
        }
        .frame(height: 78)
        .padding(.leading, 8)
    }

    var opponentFan: some View {
        HStack(spacing: -18) {
            ForEach(0..<min(eng.state.players[1].hand.count, 8), id: \.self) { i in
                TributeCardView(def: nil, theme: theme, width: 34, showBack: true)
                    .rotationEffect(.degrees(Double(i) * 3 - 8))
            }
        }
        .frame(width: 120, height: 60)
    }

    var tavernRow: some View {
        HStack(alignment: .center, spacing: 8) {
            PileToken(title: "Tavern", count: eng.state.tavernPile.count, theme: theme)
            ForEach(Array(eng.state.tavern.enumerated()), id: \.element.uid) { i, c in
                let d = session.catalog.card(c.cardId)
                TributeCardView(
                    def: d, inst: c, theme: theme, width: 72,
                    affordable: yourTurn && eng.canBuy(i),
                    legalGlow: yourTurn && eng.canBuy(i)
                )
                .onTapGesture {
                    if yourTurn, eng.buy(i) { session.afterHumanAction() }
                }
                .onLongPressGesture { session.inspectingCard = c }
            }
            PileToken(title: "Discard", count: eng.state.tavernDiscard.count, theme: theme, facedown: false)
            Spacer(minLength: 170)
        }
        .frame(height: 128)
    }

    var playerAgentsAndResources: some View {
        HStack(spacing: 12) {
            PileToken(title: "Draw", count: eng.state.players[0].draw.count, theme: theme)
            agentRow(eng.state.players[0].agents, enemy: false)
            PileToken(title: "Cooldown", count: eng.state.players[0].cooldown.count, theme: theme)
            Spacer(minLength: 170)
        }
        .frame(height: 86)
    }

    func tokenRow(for seat: Int) -> some View {
        let p = eng.state.players[seat]
        return HStack(spacing: 10) {
            ResourceHex(label: "Coin", value: p.coin, color: Color(red: 0.92, green: 0.78, blue: 0.28), shape: .circle)
            ResourceHex(label: "Prestige", value: p.prestige, color: Color(red: 0.22, green: 0.52, blue: 0.92), shape: .hex)
            ResourceHex(label: "Power", value: p.power, color: Color(red: 0.82, green: 0.20, blue: 0.20), shape: .diamond)
            ResourceHex(label: "Patron", value: p.patronCallsLeft, color: Color(red: 0.78, green: 0.75, blue: 0.68), shape: .circle)
        }
    }

    var playedEffectsStrip: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(statusLine)
                .font(.system(size: 11, weight: .semibold, design: .serif))
                .foregroundStyle(theme.gold)
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 4) {
                    ForEach(eng.state.players[0].played) { c in
                        TributeCardView(def: session.catalog.card(c.cardId), inst: c, theme: theme, width: 44)
                            .onLongPressGesture { session.inspectingCard = c }
                    }
                }
            }
        }
        .frame(width: 58)
        .padding(.leading, 6)
    }

    func agentRow(_ agents: [CardInst], enemy: Bool) -> some View {
        HStack(spacing: 6) {
            ForEach(agents) { a in
                TributeCardView(def: session.catalog.card(a.cardId), inst: a, theme: theme, width: 52)
                    .onTapGesture {
                        if enemy, yourTurn, eng.knockoutWithPower(a.uid) {
                            session.afterHumanAction()
                        }
                    }
                    .onLongPressGesture { session.inspectingCard = a }
            }
        }
        .frame(minWidth: 80, minHeight: 70)
    }

    var statusLine: String {
        if let w = eng.state.winner { return w == 0 ? "Victory" : "Defeat" }
        if session.aiThinking { return "Rival…" }
        if yourTurn { return "Your turn" }
        return "Rival…"
    }

    func resultOverlay(_ w: Int) -> some View {
        VStack(spacing: 12) {
            Text(w == 0 ? "Victory" : "Defeat")
                .font(.custom("Georgia", size: 34).weight(.bold))
                .foregroundStyle(theme.gold)
            if let r = eng.state.winReason {
                Text(reasonCopy(r)).font(.custom("Georgia", size: 14)).opacity(0.8)
            }
            if let t = session.lastReward {
                Text(t).font(.caption)
            }
            HStack {
                Button("Table") { session.leaveMatch() }.buttonStyle(GoldButtonStyle())
                if case .gauntlet = session.matchKind {
                    Button("Road") { session.engine = nil; session.screen = .gauntlet }.buttonStyle(GoldButtonStyle(dim: true))
                }
            }
        }
        .padding(24)
        .background(.black.opacity(0.78))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(theme.gold, lineWidth: 1))
    }

    func reasonCopy(_ r: String) -> String {
        switch r {
        case "80": return "80 Prestige — instant win."
        case "40-hold": return "They could not pass your 40 Prestige."
        case "patrons": return "All four patrons favored you."
        default: return r
        }
    }
}
