import SwiftUI
import TributeCore

struct PatronInspectOverlay: View {
    let engine: TributeEngine
    let patronId: String
    var theme: TableTheme
    var canActivate: Bool
    var onActivate: () -> Void
    var onClose: () -> Void

    var body: some View {
        let info = engine.abilityText(for: patronId, viewer: 0)
        let pat = engine.catalog.patronsById[patronId]
        ZStack(alignment: .topLeading) {
            Color.black.opacity(0.35).ignoresSafeArea().onTapGesture(perform: onClose)
            VStack(alignment: .leading, spacing: 8) {
                Text("\(info.state)  TRIBUTE PATRON")
                    .font(.system(size: 10, weight: .semibold, design: .serif))
                    .foregroundStyle(theme.ink.opacity(0.7))
                    .tracking(1.2)
                Text(info.title.uppercased())
                    .font(.custom("Georgia", size: 22).weight(.bold))
                    .foregroundStyle(theme.ink)
                if let img = BundleArt.patron(patronId) {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFit()
                        .frame(height: 72)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                Text(info.body)
                    .font(.custom("Georgia", size: 14))
                    .foregroundStyle(theme.ink.opacity(0.92))
                    .fixedSize(horizontal: false, vertical: true)
                if patronId == "treasury" {
                    Text("Always Neutral — no favor pointer.")
                        .font(.caption).opacity(0.7)
                }
                HStack {
                    if canActivate {
                        Button("Activate", action: onActivate).buttonStyle(GoldButtonStyle())
                    }
                    Button("Close", action: onClose).buttonStyle(GoldButtonStyle(dim: true))
                }
            }
            .padding(16)
            .frame(width: 340, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(red: 0.10, green: 0.09, blue: 0.07).opacity(0.94))
            )
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(theme.gold.opacity(0.4), lineWidth: 1))
            .padding(.leading, 48)
            .padding(.top, 36)
        }
        .accessibilityLabel("\(pat?.name ?? patronId) details")
    }
}

struct CardInspectOverlay: View {
    let def: CardDef?
    var inst: CardInst?
    var theme: TableTheme
    var onClose: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.45).ignoresSafeArea().onTapGesture(perform: onClose)
            HStack(spacing: 20) {
                TributeCardView(def: def, inst: inst, theme: theme, width: 160)
                VStack(alignment: .leading, spacing: 6) {
                    Text((def?.type ?? "action").uppercased() + (def?.contract == true ? "  CONTRACT" : ""))
                        .font(.system(size: 10, weight: .semibold, design: .serif))
                        .opacity(0.65)
                    Text(def?.name ?? "")
                        .font(.custom("Georgia", size: 24).weight(.bold))
                        .foregroundStyle(theme.gold)
                    Text("Gold cost \(def?.cost ?? 0)")
                        .font(.custom("Georgia", size: 13))
                    effectRow("Play", def?.playText)
                    effectRow("Combo 2", def?.combo2Text)
                    effectRow("Combo 3", def?.combo3Text)
                    effectRow("Combo 4", def?.combo4Text)
                    Button("Close", action: onClose).buttonStyle(GoldButtonStyle(dim: true))
                }
                .frame(width: 280, alignment: .leading)
            }
            .padding(20)
            .background(Color.black.opacity(0.82))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(theme.gold.opacity(0.5)))
        }
    }

    @ViewBuilder
    func effectRow(_ title: String, _ text: String?) -> some View {
        if let text, !text.isEmpty {
            HStack(alignment: .top, spacing: 8) {
                Text(title.uppercased())
                    .font(.system(size: 9, weight: .bold, design: .serif))
                    .foregroundStyle(theme.glow)
                    .frame(width: 64, alignment: .leading)
                Text(text).font(.custom("Georgia", size: 13))
            }
        }
    }
}
