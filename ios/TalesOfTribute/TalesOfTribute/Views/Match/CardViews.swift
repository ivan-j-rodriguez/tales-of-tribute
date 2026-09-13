import SwiftUI
import TributeCore

struct TributeCardView: View {
    let def: CardDef?
    var inst: CardInst?
    var theme: TableTheme
    var width: CGFloat = 78
    var showBack: Bool = false
    var dimmed: Bool = false
    var affordable: Bool = true

    var height: CGFloat { width * 1.62 }

    var body: some View {
        ZStack {
            if showBack {
                cardBack
            } else {
                face
            }
        }
        .frame(width: width, height: height)
        .opacity(dimmed ? 0.45 : 1)
        .shadow(color: .black.opacity(0.45), radius: 3, y: 2)
    }

    var face: some View {
        ZStack {
            Octagon().fill(theme.parchment)
            if let img = BundleArt.card(def?.id ?? inst?.cardId ?? "") {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
                    .clipShape(Octagon())
            } else {
                fallbackFace
            }
            Octagon().stroke(theme.gold.opacity(0.75), lineWidth: 1.2)
            if let hp = inst?.hp, def?.isAgent == true || inst?.hp != nil {
                VStack {
                    Spacer()
                    HStack {
                        Text("HP \(hp)")
                            .font(.system(size: 8, weight: .bold, design: .serif))
                            .padding(.horizontal, 4).padding(.vertical, 1)
                            .background(.black.opacity(0.65))
                            .foregroundStyle(inst?.taunt == true ? Color.orange : .white)
                        Spacer()
                    }
                    .padding(4)
                }
            }
            if !affordable {
                Octagon().fill(Color.black.opacity(0.35))
            }
        }
    }

    var fallbackFace: some View {
        VStack(spacing: 3) {
            HStack {
                Text("\(def?.cost ?? 0)")
                    .font(.system(size: 10, weight: .bold, design: .serif))
                    .padding(3)
                    .background(Circle().fill(Color(red: 0.83, green: 0.69, blue: 0.22)))
                    .foregroundStyle(.black)
                Spacer()
                Text((def?.patron ?? "").prefix(1).uppercased())
                    .font(.system(size: 8, weight: .bold, design: .serif))
            }
            .padding(.horizontal, 6).padding(.top, 6)
            Text(def?.name ?? inst?.cardId ?? "")
                .font(.system(size: 8, weight: .semibold, design: .serif))
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .foregroundStyle(Color(red: 0.18, green: 0.12, blue: 0.06))
                .padding(.horizontal, 4)
            Text(def?.playText ?? "")
                .font(.system(size: 7, design: .serif))
                .foregroundStyle(Color(red: 0.22, green: 0.16, blue: 0.08).opacity(0.8))
                .lineLimit(4)
                .padding(.horizontal, 5)
            Spacer()
        }
    }

    var cardBack: some View {
        let cols = theme.backColors
        return ZStack {
            Octagon().fill(
                LinearGradient(colors: [cols.0, cols.0.opacity(0.8)], startPoint: .top, endPoint: .bottom)
            )
            Octagon().stroke(cols.1, lineWidth: 2)
            Image(systemName: "seal.fill")
                .font(.system(size: width * 0.28))
                .foregroundStyle(cols.1.opacity(0.85))
        }
    }
}

struct FannedHandView: View {
    let cards: [CardInst]
    let catalog: Catalog
    var theme: TableTheme
    var enabled: Bool
    var onTap: (CardInst) -> Void
    var onHold: (CardInst) -> Void

    var body: some View {
        GeometryReader { geo in
            let n = max(cards.count, 1)
            let mid = (Double(n) - 1) / 2
            let cardW = min(108, max(78, geo.size.width / CGFloat(max(n, 3)) * 1.35))
            HStack(spacing: -cardW * 0.42) {
                ForEach(Array(cards.enumerated()), id: \.element.uid) { i, c in
                    let t = Double(i) - mid
                    TributeCardView(def: catalog.card(c.cardId), inst: c, theme: theme, width: cardW)
                        .rotationEffect(.degrees(t * 5.2))
                        .offset(y: CGFloat(abs(t) * 5.5))
                        .zIndex(Double(i))
                        .gesture(cardGesture(c))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
    }

    func cardGesture(_ c: CardInst) -> some Gesture {
        LongPressGesture(minimumDuration: 0.52)
            .onEnded { _ in onHold(c) }
            .exclusively(before: TapGesture().onEnded {
                if enabled { onTap(c) }
            })
    }
}

struct PileToken: View {
    var title: String
    var count: Int
    var theme: TableTheme
    var facedown: Bool = true
    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                TributeCardView(def: nil, theme: theme, width: 36, showBack: facedown)
                Text("\(count)")
                    .font(.system(size: 11, weight: .bold, design: .serif))
                    .foregroundStyle(theme.ink)
                    .shadow(radius: 2)
            }
            Text(title)
                .font(.system(size: 8, weight: .semibold, design: .serif))
                .foregroundStyle(theme.ink.opacity(0.75))
        }
        .frame(width: 52)
    }
}

struct ResourceHex: View {
    var label: String
    var value: Int
    var color: Color
    var body: some View {
        VStack(spacing: 1) {
            ZStack {
                Hexagon().fill(Color(red: 0.12, green: 0.09, blue: 0.05).opacity(0.85))
                Hexagon().stroke(color.opacity(0.8), lineWidth: 1.2)
                Text("\(value)")
                    .font(.system(size: 16, weight: .bold, design: .serif))
                    .foregroundStyle(color)
            }
            .frame(width: 44, height: 40)
            Text(label)
                .font(.system(size: 8, weight: .semibold, design: .serif))
                .foregroundStyle(Color(red: 0.90, green: 0.84, blue: 0.68).opacity(0.8))
        }
    }
}

struct Hexagon: Shape {
    func path(in rect: CGRect) -> Path {
        let cx = rect.midX, cy = rect.midY
        let r = min(rect.width, rect.height) / 2
        var p = Path()
        for i in 0..<6 {
            let a = (Double(i) * 60 - 90) * .pi / 180
            let pt = CGPoint(x: cx + r * CGFloat(cos(a)), y: cy + r * CGFloat(sin(a)))
            if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
        }
        p.closeSubpath()
        return p
    }
}
