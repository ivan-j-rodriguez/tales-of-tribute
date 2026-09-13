import SwiftUI
import TributeCore

struct TableTheme {
    let skin: String
    let back: String
    var pal: TablePalette { palette(forSkin: skin) }

    var felt: Color { Color(rgb: pal.felt) }
    var wood: Color { Color(rgb: pal.wood) }
    var gold: Color { Color(rgb: pal.gold) }
    var ink: Color { Color(rgb: pal.ink) }
    var glow: Color { Color(rgb: pal.glow) }
    var parchment: Color { Color(red: 0.89, green: 0.82, blue: 0.66) }
    var feltDeep: Color { felt.opacity(0.95) }

    var backColors: (Color, Color) {
        let c = cardBackColors(back)
        return (Color(rgb: c.0), Color(rgb: c.1))
    }
}

extension Color {
    init(rgb: RGB) {
        self.init(red: rgb.r, green: rgb.g, blue: rgb.b)
    }
}

enum BundleArt {
    static func image(folder: String, name: String) -> UIImage? {
        let n = name.replacingOccurrences(of: ".png", with: "")
        if let url = Bundle.main.url(forResource: n, withExtension: "png", subdirectory: "assets/\(folder)")
            ?? Bundle.main.url(forResource: n, withExtension: "png", subdirectory: folder)
            ?? Bundle.main.url(forResource: n, withExtension: "png") {
            return UIImage(contentsOfFile: url.path)
        }
        return nil
    }

    static func card(_ id: String) -> UIImage? { image(folder: "cards", name: id) }
    static func patron(_ id: String) -> UIImage? { image(folder: "patrons", name: id) }
    static func mapJPG() -> UIImage? {
        if let url = Bundle.main.url(forResource: "tamriel-map", withExtension: "jpg", subdirectory: "assets/ui")
            ?? Bundle.main.url(forResource: "tamriel-map", withExtension: "jpg") {
            return UIImage(contentsOfFile: url.path)
        }
        return nil
    }
}

struct Octagon: Shape {
    var cut: CGFloat = 0.14
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        let ix = w * cut, iy = h * cut * 0.55
        var p = Path()
        p.move(to: CGPoint(x: ix, y: 0))
        p.addLine(to: CGPoint(x: w - ix, y: 0))
        p.addLine(to: CGPoint(x: w, y: iy))
        p.addLine(to: CGPoint(x: w, y: h - iy))
        p.addLine(to: CGPoint(x: w - ix, y: h))
        p.addLine(to: CGPoint(x: ix, y: h))
        p.addLine(to: CGPoint(x: 0, y: h - iy))
        p.addLine(to: CGPoint(x: 0, y: iy))
        p.closeSubpath()
        return p
    }
}

/// Wooden plaque: circular medallion sits on the right; pointed triangular end faces LEFT (toward the board).
struct PatronPlaqueShape: Shape {
    func path(in rect: CGRect) -> Path {
        let h = rect.height
        let tip = h * 0.5
        var p = Path()
        p.move(to: CGPoint(x: 0, y: tip))
        p.addLine(to: CGPoint(x: h * 0.38, y: 1.5))
        p.addLine(to: CGPoint(x: rect.width - h * 0.18, y: 1.5))
        p.addQuadCurve(
            to: CGPoint(x: rect.width - h * 0.18, y: h - 1.5),
            control: CGPoint(x: rect.width + 2, y: tip)
        )
        p.addLine(to: CGPoint(x: h * 0.38, y: h - 1.5))
        p.closeSubpath()
        return p
    }
}

struct WoodGrain: View {
    var color: Color
    var body: some View {
        ZStack {
            LinearGradient(colors: [color.opacity(0.95), color.opacity(0.7), color], startPoint: .top, endPoint: .bottom)
            LinearGradient(colors: [.clear, .black.opacity(0.18), .clear], startPoint: .leading, endPoint: .trailing)
        }
    }
}

struct FeltTable: View {
    var theme: TableTheme
    var body: some View {
        ZStack {
            theme.wood
            RoundedRectangle(cornerRadius: 18)
                .inset(by: 10)
                .fill(
                    RadialGradient(
                        colors: [theme.felt.opacity(0.95), theme.felt, Color.black.opacity(0.55)],
                        center: .center,
                        startRadius: 40,
                        endRadius: 520
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .inset(by: 10)
                        .stroke(theme.gold.opacity(0.45), lineWidth: 1.4)
                )
                .padding(4)
            // Candle warmth
            Circle()
                .fill(Color(red: 1, green: 0.82, blue: 0.45).opacity(0.09))
                .frame(width: 280, height: 280)
                .blur(radius: 40)
                .offset(x: -220, y: -80)
            Circle()
                .fill(Color(red: 1, green: 0.78, blue: 0.4).opacity(0.08))
                .frame(width: 220, height: 220)
                .blur(radius: 36)
                .offset(x: 260, y: 90)
        }
        .ignoresSafeArea()
    }
}

struct GoldButtonStyle: ButtonStyle {
    var dim = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.custom("Georgia", size: 15).weight(.semibold))
            .padding(.horizontal, 16).padding(.vertical, 8)
            .background(
                LinearGradient(
                    colors: dim
                        ? [Color(red: 0.28, green: 0.18, blue: 0.10), Color(red: 0.14, green: 0.08, blue: 0.05)]
                        : [Color(red: 0.55, green: 0.42, blue: 0.14), Color(red: 0.32, green: 0.22, blue: 0.06)],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(Color(red: 0.83, green: 0.69, blue: 0.22), lineWidth: 1))
            .foregroundStyle(Color(red: 0.94, green: 0.90, blue: 0.72))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}
