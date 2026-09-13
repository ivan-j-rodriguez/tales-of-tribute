import SwiftUI
import TributeCore

struct SplashMenuView: View {
    @EnvironmentObject var session: GameSession
    var theme: TableTheme { TableTheme(skin: session.profile.tableSkin, back: session.profile.cardBack) }

    var body: some View {
        ZStack {
            FeltTable(theme: theme)
            VStack(spacing: 14) {
                Text("Tales of Tribute")
                    .font(.custom("Georgia", size: 36).weight(.bold))
                    .foregroundStyle(theme.gold)
                Text("Fan-made · Unofficial")
                    .font(.custom("Georgia", size: 14).weight(.semibold))
                    .foregroundStyle(theme.ink.opacity(0.85))
                Text("Not affiliated with Bethesda Softworks, ZeniMax Online Studios, or The Elder Scrolls Online. Not for sale.")
                    .font(.custom("Georgia", size: 12))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(theme.ink.opacity(0.65))
                    .frame(maxWidth: 520)
                HStack(spacing: 12) {
                    Button("Play vs AI") { session.screen = .pick }.buttonStyle(GoldButtonStyle())
                    Button("Challenge the Provinces") { session.screen = .gauntlet }.buttonStyle(GoldButtonStyle())
                    Button("Shop") { session.screen = .shop }.buttonStyle(GoldButtonStyle(dim: true))
                    Button("Collection") { session.screen = .encyclopedia }.buttonStyle(GoldButtonStyle(dim: true))
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Difficulty  \(session.profile.aiDifficulty)")
                        .font(.custom("Georgia", size: 13))
                    Slider(
                        value: Binding(
                            get: { Double(session.profile.aiDifficulty) },
                            set: { session.setDifficulty(Int($0.rounded())) }
                        ),
                        in: 1...10, step: 1
                    )
                    .tint(theme.gold)
                    .frame(width: 280)
                    Text("Gold \(session.profile.gold)   ·   Wins \(session.profile.stats.wins)   ·   Purses \(session.profile.purses.count)")
                        .font(.caption).opacity(0.75)
                }
                .padding(.top, 8)
            }
            .padding()
        }
    }
}

struct PatronSelectView: View {
    @EnvironmentObject var session: GameSession
    @State private var you: [String] = []
    @State private var opp: [String] = []
    var theme: TableTheme { TableTheme(skin: session.profile.tableSkin, back: session.profile.cardBack) }

    var body: some View {
        ZStack {
            FeltTable(theme: theme)
            VStack(spacing: 10) {
                HStack {
                    Button("Back") { session.screen = .splash }.buttonStyle(GoldButtonStyle(dim: true))
                    Spacer()
                    Text("Choose Your Patrons")
                        .font(.custom("Georgia", size: 24).weight(.bold))
                        .foregroundStyle(theme.gold)
                    Spacer()
                    Text("You \(you.count)/2   Rival \(opp.count)/2")
                        .font(.caption)
                }
                .padding(.horizontal)
                Text("Tap an unlocked pendant. Locked patrons stay grey until you earn fragments.")
                    .font(.custom("Georgia", size: 12)).opacity(0.7)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 10)], spacing: 10) {
                    ForEach(session.catalog.playablePatrons) { p in
                        let locked = !session.profile.isDeckUnlocked(p.id)
                        let chosenYou = you.contains(p.id)
                        let chosenOpp = opp.contains(p.id)
                        VStack(spacing: 4) {
                            PatronPendantView(
                                patron: p,
                                favor: chosenYou ? 1 : chosenOpp ? -1 : 0,
                                canCall: chosenYou || chosenOpp,
                                theme: theme,
                                locked: locked
                            )
                            if locked {
                                Text(session.profile.unlockHint(p.id))
                                    .font(.system(size: 9))
                                    .foregroundStyle(theme.ink.opacity(0.6))
                                    .multilineTextAlignment(.center)
                                    .frame(width: 150)
                            }
                        }
                        .onTapGesture {
                            guard !locked else { return }
                            if you.contains(p.id) || opp.contains(p.id) { return }
                            if you.count < 2 { you.append(p.id) }
                            else if opp.count < 2 { opp.append(p.id) }
                        }
                    }
                }
                .padding(.horizontal)
                HStack {
                    Button("AI takes the rest") {
                        var rest = session.catalog.playablePatrons.map(\.id).filter {
                            session.profile.isDeckUnlocked($0) && !you.contains($0) && !opp.contains($0)
                        }
                        while you.count < 2, let i = rest.indices.randomElement() { you.append(rest.remove(at: i)) }
                        // Rival may use locked patrons (house decks).
                        var house = session.catalog.playablePatrons.map(\.id).filter { !you.contains($0) && !opp.contains($0) }
                        while opp.count < 2, let i = house.indices.randomElement() { opp.append(house.remove(at: i)) }
                    }.buttonStyle(GoldButtonStyle(dim: true))
                    Button("Begin Match") { session.startAIMatch(you: you, opp: opp) }
                        .buttonStyle(GoldButtonStyle())
                        .disabled(you.count != 2 || opp.count != 2)
                }
            }
            .padding(.vertical, 10)
        }
    }
}

struct ShopView: View {
    @EnvironmentObject var session: GameSession
    @State private var message: String?
    var theme: TableTheme { TableTheme(skin: session.profile.tableSkin, back: session.profile.cardBack) }

    var body: some View {
        ZStack {
            FeltTable(theme: theme)
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Button("Back") { session.screen = .splash }.buttonStyle(GoldButtonStyle(dim: true))
                    Text("Roister's Shop").font(.custom("Georgia", size: 24).weight(.bold)).foregroundStyle(theme.gold)
                    Spacer()
                    Text("Gold \(session.profile.gold)").font(.custom("Georgia", size: 16))
                    Button("Open purse") {
                        message = ClubLogic.openPurse(&session.profile, cards: session.catalog.cards)
                        session.persist()
                    }.buttonStyle(GoldButtonStyle(dim: true))
                }
                if let message { Text(message).font(.caption).opacity(0.8) }
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Table themes").font(.custom("Georgia", size: 16).weight(.semibold))
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 180))], spacing: 8) {
                            ForEach(tableSkins) { s in
                                cosmeticRow(s, equipped: session.profile.tableSkin == s.id, owned: session.profile.unlockedSkins.contains(s.id)) {
                                    if let err = ClubLogic.buySkin(&session.profile, s.id) { message = err }
                                    else { message = "Equipped \(s.name)"; session.persist() }
                                }
                            }
                        }
                        Text("Card backs").font(.custom("Georgia", size: 16).weight(.semibold))
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 180))], spacing: 8) {
                            ForEach(cardBacks) { s in
                                cosmeticRow(s, equipped: session.profile.cardBack == s.id, owned: session.profile.unlockedBacks.contains(s.id)) {
                                    if let err = ClubLogic.buyBack(&session.profile, s.id) { message = err }
                                    else { message = "Equipped \(s.name)"; session.persist() }
                                }
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }

    func cosmeticRow(_ item: CosmeticItem, equipped: Bool, owned: Bool, buy: @escaping () -> Void) -> some View {
        Button(action: buy) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name).font(.custom("Georgia", size: 14).weight(.semibold))
                Text(item.desc).font(.caption2).opacity(0.7).lineLimit(2)
                Text(owned ? (equipped ? "Equipped" : "Own — tap to equip") : "\(item.price) gold")
                    .font(.caption)
                    .foregroundStyle(theme.gold)
            }
            .padding(8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.black.opacity(0.35))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(equipped ? theme.glow : theme.gold.opacity(0.35)))
        }
        .buttonStyle(.plain)
    }
}

struct EncyclopediaView: View {
    @EnvironmentObject var session: GameSession
    @State private var filter = ""
    @State private var patron = ""
    var theme: TableTheme { TableTheme(skin: session.profile.tableSkin, back: session.profile.cardBack) }

    var body: some View {
        ZStack {
            FeltTable(theme: theme)
            VStack {
                HStack {
                    Button("Back") { session.screen = .splash }.buttonStyle(GoldButtonStyle(dim: true))
                    Text("Collection").font(.custom("Georgia", size: 22).weight(.bold)).foregroundStyle(theme.gold)
                    Spacer()
                    Picker("Patron", selection: $patron) {
                        Text("All").tag("")
                        ForEach(session.catalog.patrons) { p in Text(p.short).tag(p.id) }
                    }.pickerStyle(.menu)
                }
                TextField("Search", text: $filter)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 320)
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 110))], spacing: 8) {
                        ForEach(session.catalog.cards.filter {
                            (patron.isEmpty || $0.patron == patron) &&
                            (filter.isEmpty || $0.name.localizedCaseInsensitiveContains(filter))
                        }) { c in
                            VStack {
                                TributeCardView(def: c, theme: theme, width: 88)
                                Text(c.name).font(.caption2).lineLimit(2)
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }
}
