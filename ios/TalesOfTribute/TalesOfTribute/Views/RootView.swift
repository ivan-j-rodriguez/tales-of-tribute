import SwiftUI

struct RootView: View {
    @EnvironmentObject var store: GameStore
    var body: some View {
        ZStack {
            Color(red: 0.10, green: 0.06, blue: 0.04).ignoresSafeArea()
            switch store.screen {
            case .splash: SplashView()
            case .pick: DeckPickView()
            case .match: MatchView()
            case .encyclopedia: EncyclopediaView()
            }
        }
        .foregroundStyle(Color(red: 0.95, green: 0.90, blue: 0.82))
    }
}

struct SplashView: View {
    @EnvironmentObject var store: GameStore
    var body: some View {
        VStack(spacing: 18) {
            Text("Tales of Tribute")
                .font(.custom("Georgia", size: 34).weight(.bold))
                .foregroundStyle(Color(red: 0.83, green: 0.69, blue: 0.22))
                .multilineTextAlignment(.center)
            Text("A fan table for the Roister’s Club. Unofficial — not affiliated with Bethesda or ZeniMax.")
                .font(.custom("Georgia", size: 15))
                .multilineTextAlignment(.center)
                .opacity(0.75)
                .padding(.horizontal)
            Button("Sit at the Table") { store.screen = .pick }
                .buttonStyle(GoldButton())
            Button("Encyclopedia") { store.screen = .encyclopedia }
                .buttonStyle(GoldButton(dim: true))
        }
        .padding()
    }
}

struct GoldButton: ButtonStyle {
    var dim = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.custom("Georgia", size: 16).weight(.semibold))
            .padding(.horizontal, 20).padding(.vertical, 10)
            .background(
                LinearGradient(colors: dim
                    ? [Color(red:0.3,green:0.2,blue:0.12), Color(red:0.16,green:0.1,blue:0.06)]
                    : [Color(red:0.55,green:0.42,blue:0.12), Color(red:0.35,green:0.25,blue:0.06)],
                               startPoint: .top, endPoint: .bottom)
            )
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(red: 0.83, green: 0.69, blue: 0.22), lineWidth: 1))
            .foregroundStyle(Color(red: 0.94, green: 0.90, blue: 0.72))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

struct DeckPickView: View {
    @EnvironmentObject var store: GameStore
    @State private var you: [String] = []
    @State private var opp: [String] = []
    var playable: [PatronDef] { store.catalog.patrons.filter { $0.id != "treasury" } }

    var body: some View {
        VStack {
            Text("Choose Your Patrons").font(.custom("Georgia", size: 24).weight(.bold))
                .foregroundStyle(Color(red: 0.83, green: 0.69, blue: 0.22))
            Text("Two for you, two for the house. You: \(you.count)/2  Rival: \(opp.count)/2")
                .font(.footnote).opacity(0.7)
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 10) {
                    ForEach(playable) { p in
                        VStack {
                            Text(p.short).font(.custom("Georgia", size: 14).weight(.semibold))
                            Text(p.abilities.neutral?.desc ?? "").font(.caption2).lineLimit(4).opacity(0.7)
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, minHeight: 90)
                        .background(Color.black.opacity(0.4))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(you.contains(p.id) ? Color.green : (opp.contains(p.id) ? Color.red : Color.yellow.opacity(0.4)), lineWidth: 2))
                        .onTapGesture {
                            if you.contains(p.id) || opp.contains(p.id) { return }
                            if you.count < 2 { you.append(p.id) } else if opp.count < 2 { opp.append(p.id) }
                        }
                    }
                }.padding()
            }
            HStack {
                Button("AI takes the rest") {
                    var rest = playable.map(\.id).filter { !you.contains($0) && !opp.contains($0) }
                    while you.count < 2, let i = rest.indices.randomElement() { you.append(rest.remove(at: i)) }
                    while opp.count < 2, let i = rest.indices.randomElement() { opp.append(rest.remove(at: i)) }
                }.buttonStyle(GoldButton(dim: true))
                Button("Begin Match") { store.startMatch(you: you, opp: opp) }
                    .buttonStyle(GoldButton())
                    .disabled(you.count != 2 || opp.count != 2)
                Button("Back") { store.screen = .splash }.buttonStyle(GoldButton(dim: true))
            }
        }
        .padding()
    }
}

struct MatchView: View {
    @EnvironmentObject var store: GameStore
    var eng: TributeEngine { store.engine! }
    @State private var tip = 0

    var body: some View {
        GeometryReader { geo in
            let landscape = geo.size.width > geo.size.height
            VStack(spacing: 6) {
                HStack {
                    res(eng.players[1], "Rival")
                    Spacer()
                    Text(eng.winner == nil ? (eng.active == 0 ? "Your turn" : "Rival…") : (eng.winner == 0 ? "Victory" : "Defeat"))
                        .font(.custom("Georgia", size: 14))
                    Spacer()
                    res(eng.players[0], "You")
                }.padding(.horizontal, 8)

                HStack {
                    ForEach(eng.matchPatrons + ["treasury"], id: \.self) { pid in
                        let f = eng.favor[pid] ?? 0
                        VStack {
                            Circle().fill(f == 1 ? Color.green : f == -1 ? Color.red : Color.yellow.opacity(0.5)).frame(width: 36, height: 36)
                            Text(store.catalog.patronsById[pid]?.short ?? pid).font(.caption2)
                        }
                        .onTapGesture { if eng.active == 0 { eng.callPatron(pid); maybeAI() } }
                    }
                }

                zone("Tavern", eng.tavern) { i, c in
                    if eng.active == 0 { eng.buy(i); maybeAI() }
                }
                zone("Rival agents", eng.players[1].agents) { _, c in
                    if eng.active == 0 { eng.knockoutWithPower(c.uid); maybeAI() }
                }
                zone("Your agents", eng.players[0].agents) { _, _ in }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(eng.players[0].hand) { c in
                            cardView(c, wide: landscape)
                                .onTapGesture { if eng.active == 0 { eng.playCard(c.uid); maybeAI() } }
                        }
                    }.padding(.horizontal)
                }

                HStack {
                    Button("End Turn") { eng.endTurn(); maybeAI() }.buttonStyle(GoldButton())
                    Button("Leave") { store.screen = .splash }.buttonStyle(GoldButton(dim: true))
                }

                if tip < 3 {
                    Text(["Play cards: Coin buys, Power becomes Prestige unless a Taunt stands.",
                          "Tap a tavern card you can afford. It goes to cooldown.",
                          "Call one Patron. Favor all four to win. 40 prestige gives them a last chance."][tip])
                        .font(.caption).padding(8).background(.black.opacity(0.7)).cornerRadius(8)
                        .onTapGesture { tip += 1 }
                }
            }
        }
        .padding(.vertical, 6)
    }

    func res(_ p: PlayerState, _ label: String) -> some View {
        HStack(spacing: 8) {
            Text(label).opacity(0.6)
            Text("●\(p.coin)").foregroundStyle(.yellow)
            Text("◆\(p.power)").foregroundStyle(.cyan)
            Text("★\(p.prestige)").foregroundStyle(.orange)
        }.font(.caption.monospacedDigit())
    }

    func zone(_ title: String, _ cards: [CardInst], tap: @escaping (Int, CardInst) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased()).font(.caption2).opacity(0.5)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(Array(cards.enumerated()), id: \.element.id) { i, c in
                        cardView(c, wide: false).onTapGesture { tap(i, c) }
                    }
                }
            }.frame(height: 88)
        }.padding(.horizontal, 8)
    }

    func cardView(_ inst: CardInst, wide: Bool) -> some View {
        let d = store.catalog.cardsById[inst.cardId]
        return VStack(alignment: .leading, spacing: 2) {
            Text(d?.name ?? inst.cardId).font(.caption2.weight(.semibold)).lineLimit(2)
            Text(d?.playText ?? "").font(.system(size: 9)).opacity(0.7).lineLimit(3)
            HStack {
                Text("\(d?.cost ?? 0)").font(.caption2)
                if let hp = inst.hp { Text("HP \(hp)").font(.caption2) }
                if inst.taunt { Text("T").font(.caption2).foregroundStyle(.orange) }
            }
        }
        .padding(6)
        .frame(width: wide ? 110 : 86, height: wide ? 96 : 80)
        .background(Color(red: 0.16, green: 0.10, blue: 0.06))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(red: 0.83, green: 0.69, blue: 0.22).opacity(0.5)))
    }

    func maybeAI() {
        guard let eng = store.engine, eng.active == 1, eng.winner == nil else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            TributeAI(engine: eng).takeTurn()
            if eng.active == 1 && eng.winner == nil { maybeAI() }
        }
    }
}

struct EncyclopediaView: View {
    @EnvironmentObject var store: GameStore
    @State private var filter = ""
    @State private var patron = ""
    var body: some View {
        VStack {
            HStack {
                Text("Encyclopedia").font(.custom("Georgia", size: 22).weight(.bold))
                    .foregroundStyle(Color(red: 0.83, green: 0.69, blue: 0.22))
                Spacer()
                Button("Back") { store.screen = .splash }.buttonStyle(GoldButton(dim: true))
            }.padding(.horizontal)
            Picker("Patron", selection: $patron) {
                Text("All").tag("")
                ForEach(store.catalog.patrons) { p in Text(p.short).tag(p.id) }
            }.pickerStyle(.menu)
            TextField("Search", text: $filter).textFieldStyle(.roundedBorder).padding(.horizontal)
            List(store.catalog.cards.filter {
                (patron.isEmpty || $0.patron == patron) &&
                (filter.isEmpty || $0.name.localizedCaseInsensitiveContains(filter))
            }) { c in
                VStack(alignment: .leading) {
                    Text(c.name).font(.headline)
                    Text("\(c.patron) · \(c.type) · \(c.cost)  \(c.playText)").font(.caption).opacity(0.7)
                }
            }
        }
    }
}
