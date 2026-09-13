import SwiftUI
import TributeCore

struct PatronRailView: View {
    let engine: TributeEngine
    var theme: TableTheme
    var canAct: Bool
    var onTap: (String) -> Void
    var onHold: (String) -> Void

    var ids: [String] {
        // Vertical column: opponent pair, Treasury, your pair — plaques, not coin cluster.
        let you = engine.state.players[0].patrons
        let opp = engine.state.players[1].patrons
        return opp + ["treasury"] + you
    }

    var body: some View {
        VStack(spacing: 7) {
            ForEach(ids, id: \.self) { pid in
                PatronPendantView(
                    patron: engine.catalog.patronsById[pid],
                    favor: engine.favorForViewer(pid, viewer: 0),
                    canCall: canAct && engine.canCall(pid),
                    theme: theme
                )
                .onTapGesture { onTap(pid) }
                .onLongPressGesture(minimumDuration: 0.45) { onHold(pid) }
            }
        }
    }
}

struct PatronPendantView: View {
    let patron: PatronDef?
    /// 1 = favors you (blue), -1 = favors rival (red), 0 = neutral
    var favor: Int
    var canCall: Bool
    var theme: TableTheme
    var locked: Bool = false

    var body: some View {
        ZStack(alignment: .leading) {
            // Wooden banner, point LEFT toward the board
            PatronPlaqueShape()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.48, green: 0.32, blue: 0.16),
                            Color(red: 0.32, green: 0.20, blue: 0.09),
                            Color(red: 0.42, green: 0.28, blue: 0.12),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .overlay(
                    PatronPlaqueShape().stroke(Color(red: 0.72, green: 0.55, blue: 0.28).opacity(0.7), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.5), radius: 2, y: 1)

            // Favor pointer on the pointed (left) side — Treasury stays unmarked
            if patron?.id != "treasury", favor != 0 {
                Triangle()
                    .fill(favor == 1 ? Color(red: 0.25, green: 0.55, blue: 0.95) : Color(red: 0.85, green: 0.18, blue: 0.18))
                    .frame(width: 11, height: 14)
                    .offset(x: 2)
            }

            HStack(spacing: 6) {
                Spacer(minLength: 16)
                Text((patron?.short ?? patron?.name ?? "").uppercased())
                    .font(.system(size: 8, weight: .bold, design: .serif))
                    .foregroundStyle(Color(red: 0.93, green: 0.86, blue: 0.68))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                medallion
            }
            .padding(.trailing, 4)
            .padding(.leading, 10)

            if canCall {
                PatronPlaqueShape().stroke(theme.glow, lineWidth: 1.6).opacity(0.9)
            }
            if locked {
                PatronPlaqueShape().fill(Color.black.opacity(0.55))
            }
        }
        .frame(width: 148, height: 40)
    }

    var medallion: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color(red: 0.78, green: 0.76, blue: 0.70),
                            Color(red: 0.42, green: 0.40, blue: 0.36),
                        ],
                        center: .topLeading, startRadius: 2, endRadius: 22
                    )
                )
                .frame(width: 36, height: 36)
                .overlay(Circle().stroke(Color(red: 0.82, green: 0.78, blue: 0.62), lineWidth: 1.2))
            if let id = patron?.id, let img = BundleArt.patron(id) {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 30, height: 30)
                    .clipShape(Circle())
            } else if patron?.id == "treasury" {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color(red: 0.83, green: 0.69, blue: 0.22))
            } else {
                Text(String((patron?.short ?? "?").prefix(1)))
                    .font(.system(size: 13, weight: .bold, design: .serif))
                    .foregroundStyle(Color(red: 0.20, green: 0.14, blue: 0.08))
            }
        }
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 0, y: rect.midY))
        p.addLine(to: CGPoint(x: rect.width, y: 0))
        p.addLine(to: CGPoint(x: rect.width, y: rect.height))
        p.closeSubpath()
        return p
    }
}

struct HourglassView: View {
    var glowing: Bool
    var theme: TableTheme
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ZStack {
                    if glowing {
                        Capsule()
                            .fill(theme.glow.opacity(0.45))
                            .blur(radius: 10)
                            .frame(width: 54, height: 78)
                    }
                    HourglassGlyph()
                        .stroke(Color(red: 0.82, green: 0.72, blue: 0.38), lineWidth: 2.2)
                        .background(
                            HourglassGlyph().fill(Color(red: 0.18, green: 0.14, blue: 0.08).opacity(0.35))
                        )
                        .frame(width: 42, height: 68)
                        .shadow(color: glowing ? theme.glow.opacity(0.9) : .clear, radius: 8)
                    // Sand
                    VStack(spacing: 0) {
                        Capsule().fill(Color(red: 0.93, green: 0.82, blue: 0.45).opacity(0.85))
                            .frame(width: 16, height: glowing ? 10 : 14)
                            .padding(.top, 10)
                        Spacer()
                        Capsule().fill(Color(red: 0.86, green: 0.70, blue: 0.32).opacity(0.9))
                            .frame(width: 18, height: glowing ? 16 : 10)
                            .padding(.bottom, 10)
                    }
                    .frame(width: 42, height: 68)
                }
                Text("End Turn")
                    .font(.system(size: 9, weight: .semibold, design: .serif))
                    .foregroundStyle(glowing ? theme.glow : theme.ink.opacity(0.7))
            }
        }
        .buttonStyle(.plain)
        .disabled(!glowing)
        .accessibilityLabel("End Turn")
    }
}

struct HourglassGlyph: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        var p = Path()
        // Ornate frame: two bulbs
        p.move(to: CGPoint(x: 4, y: 2))
        p.addLine(to: CGPoint(x: w - 4, y: 2))
        p.addLine(to: CGPoint(x: w * 0.56, y: h * 0.5))
        p.addLine(to: CGPoint(x: w - 4, y: h - 2))
        p.addLine(to: CGPoint(x: 4, y: h - 2))
        p.addLine(to: CGPoint(x: w * 0.44, y: h * 0.5))
        p.closeSubpath()
        return p
    }
}
