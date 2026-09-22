# Board PR review shots (stamp build 57)

Rebased onto latest main (Club Hotseat build 56 is merge `28409e4`; Friend PeerJS is also on that tip). This board PR’s player-facing stamp is **build 57**, not 56. It covers the felt finish-line only. Portrait lock is unchanged (patron column 328, DRAW left 6, HUD top 168.8, Treasury face 24.63). Landscape top-seat hand cards are 52px tall and agents 44px, fully inside the felt. A short tap acts. A one-second hold opens the dossier and does not play, buy, call, or pick. Closing the dossier leaves the felt clickable. Crows landscape inspect shows Favored, Neutral, and Unfavored inside the sheet; the confirm actions stay on screen.

| Check | File |
|---|---|
| Build 57 portrait felt | b57-portrait-felt.png |
| Build 57 landscape top seat | b57-landscape-top.png |
| Build 57 hand hold | b57-hand-hold.png |
| Build 57 tavern hold | b57-tavern-hold.png |
| Build 57 patron call | b57-patron-call.png |
| Build 57 patron hold | b57-patron-hold.png |
| Build 57 Crows landscape | b57-landscape-crows.png |
| Build 57 targeting hold | b57-tray-hold.png |
| Build 57 rotate back to portrait | b57-rotate-portrait.png |
| Landscape top seat (hand + agents) | b56-landscape-top-seat.png |
| Landscape Crows inspect | b56-landscape-crows-inspect.png |
| Landscape Crows confirm | b56-landscape-crows-confirm.png |
| Portrait targeting hold | b56-portrait-target-inspect.png |
| Rotate back to portrait | b56-rotate-to-portrait.png |
| Portrait felt | after-portrait-390x844.png |
| Landscape felt | after-landscape-844x390.png |

# Earlier build 55 frames

Puppeteer 390×844 and 844×390, mid-match, after the deal flyers settle. Portrait lock numbers match build 51. Layout-fb overlap hits on the empty board are all false. A second pass plays three Golds and checks that played-effect hexes no longer cover the tavern DECK.

## Portrait lock (390×844, empty board)

| Check | Value |
|---|---|
| Tavern / hand mid dx | 0 / 0 |
| Patron column X | 328 |
| DRAW left | 6 |
| HUD top | 168.8 |
| Treasury face | 24.63×24.63 circle |
| Hand tips | top 739.69, bottom 840 |
| Tavern cards on canvas | yes |
| Landscape banner / tavern discard | absent |

## Landscape (844×390)

| Check | Value |
|---|---|
| Tavern / hand mid dx | 0 / 0 |
| Tavern card height | 66.7 |
| Hand tips | top 314.08, bottom 377.91 (air under the tips) |
| DRAW left / left pile min X | 48 / 48 |
| HUD | horizontal between you-DRAW and the hand, top 350.3 |
| DECK vs tavern mid | dy 0 |
| Treasury | 46×46 circle, tipless |
| Rival hand / filled agents | on canvas, not clipped by the row |

## Frames

| Check | File |
|---|---|
| Portrait felt | after-portrait-390x844.png |
| Landscape felt | after-landscape-844x390.png |
| Portrait hand / tavern / agent hold | review-portrait-hand-inspect.png, review-portrait-tavern-inspect.png, review-portrait-agent-inspect.png |
| Portrait targeting hold (Treasury sacrifice) | review-portrait-target-inspect.png |
| Landscape hand / tavern / agent / target hold | review-landscape-hand-inspect.png, review-landscape-tavern-inspect.png, review-landscape-agent-inspect.png, review-landscape-target-inspect.png |
| Filled agents | review-portrait-agents.png, review-landscape-agents.png |
| Played effects clear of DECK | review-portrait-played-effects.png, review-landscape-played-effects.png |
| Rotate portrait → landscape → portrait | review-rotate-to-landscape.png, review-rotate-to-portrait.png |
| Treasury inspect | review-portrait-treasury-inspect.png |
| Pelin favor rows | review-portrait-pelin-favor.png |

Hold is ~1s. Targeting dossier uses `.lift-over-target` at z-index 13001 and stays on the canvas. Opening deal launches flyer clones (8 in flight at ~320ms) while seated cards stay hidden, so layout is not baked from a mid-flight translate.
