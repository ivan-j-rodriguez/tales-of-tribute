import SwiftUI
import TributeCore

struct TamrielMapView: View {
    @EnvironmentObject var session: GameSession
    var theme: TableTheme { TableTheme(skin: session.profile.tableSkin, back: session.profile.cardBack) }

    var path: [GauntletStop] {
        ClubLogic.todaysPath(session.profile)
    }

    var next: GauntletStop? { ClubLogic.nextPlayableStop(session.profile) }

    var body: some View {
        ZStack {
            Color(red: 0.78, green: 0.74, blue: 0.64).ignoresSafeArea()
            VStack(spacing: 6) {
                HStack {
                    Button("Back") { session.screen = .splash }.buttonStyle(GoldButtonStyle(dim: true))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Challenge the Provinces")
                            .font(.custom("Georgia", size: 22).weight(.bold))
                            .foregroundStyle(Color(red: 0.28, green: 0.18, blue: 0.08))
                        Text("Date-seeded road · America/New_York midnight reset · fail locks the remaining day")
                            .font(.system(size: 11, design: .serif))
                            .foregroundStyle(Color(red: 0.32, green: 0.24, blue: 0.14).opacity(0.8))
                    }
                    Spacer()
                    if session.profile.gauntlet.failed {
                        Text("Road closed until tomorrow")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.red.opacity(0.85))
                    } else if let n = next {
                        Button("Play \(n.name)  ·  d\(n.difficulty)") {
                            session.startGauntlet(n)
                        }.buttonStyle(GoldButtonStyle())
                    } else {
                        Text("All stops cleared today").font(.caption)
                    }
                }
                .padding(.horizontal)

                GeometryReader { geo in
                    ZStack {
                        if let img = BundleArt.mapJPG() {
                            Image(uiImage: img)
                                .resizable()
                                .scaledToFit()
                                .frame(width: geo.size.width, height: geo.size.height)
                        } else {
                            parchmentFallback
                        }
                        pathLines(in: geo.size)
                        ForEach(gauntletStops) { stop in
                            pin(stop, in: geo.size)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            }
        }
        .onAppear {
            ClubLogic.ensureGauntletDay(&session.profile)
            session.persist()
        }
    }

    func pin(_ stop: GauntletStop, in size: CGSize) -> some View {
        let cleared = session.profile.gauntlet.cleared.contains(stop.id)
        let isNext = next?.id == stop.id
        let failed = session.profile.gauntlet.failedStop == stop.id
        return Circle()
            .fill(failed ? Color.red : isNext ? Color(red: 0.75, green: 0.18, blue: 0.16) : cleared ? Color(red: 0.20, green: 0.45, blue: 0.28) : Color(red: 0.35, green: 0.28, blue: 0.16).opacity(0.55))
            .frame(width: isNext ? 11 : 7, height: isNext ? 11 : 7)
            .overlay(Circle().stroke(Color(red: 0.28, green: 0.18, blue: 0.08), lineWidth: 0.8))
            .position(x: size.width * stop.x / 100, y: size.height * stop.y / 100)
            .accessibilityLabel(stop.name)
            .onTapGesture {
                if isNext, !session.profile.gauntlet.failed {
                    session.startGauntlet(stop)
                }
            }
    }

    func pathLines(in size: CGSize) -> some View {
        let pts = path.prefix(12).map { CGPoint(x: size.width * $0.x / 100, y: size.height * $0.y / 100) }
        return Path { p in
            guard let first = pts.first else { return }
            p.move(to: first)
            for pt in pts.dropFirst() { p.addLine(to: pt) }
        }
        .stroke(Color(red: 0.55, green: 0.18, blue: 0.14).opacity(0.55), style: StrokeStyle(lineWidth: 1.4, dash: [5, 4]))
    }

    var parchmentFallback: some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(Color(red: 0.90, green: 0.84, blue: 0.70))
            .overlay(Text("Tamriel").font(.custom("Georgia", size: 28)).foregroundStyle(.brown.opacity(0.4)))
    }
}
