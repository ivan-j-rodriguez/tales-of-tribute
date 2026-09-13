# Tales of Tribute — iOS (SwiftUI)

Unofficial fan client. iOS 17+.

## Open in Xcode

1. Copy or clone this folder to a Mac.
2. Open `TalesOfTribute.xcodeproj` in Xcode 15+.
3. Select an iPhone simulator (or device) and press Run.
4. Card JSON lives in `TalesOfTribute/Resources/` (same schema as `/workspace/tots/data/`).
5. Optional: copy `web/assets/cards` and `web/assets/patrons` into the app bundle if you want real art on device. The web preview already has them.

Portrait and landscape layouts are both supported (`MatchView` uses `GeometryReader`).

The rules engine in `Engine/GameEngine.swift` mirrors `web/js/engine.js` as closely as practical and reads the same JSON.
