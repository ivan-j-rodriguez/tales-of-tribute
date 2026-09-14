# Board PR #26 review shots (build 51)

Ivan follow-up on build 50 / PR #25. Puppeteer 390×844 + 844×390. All layout-fb overlap hits: false.

Portrait: tavern mid dx **0px**, hand mid dx **0px**, pendant face Δx **0px**, patron col X **328** (build 50 was ~338), middle-patron gap **30.5px**, DECK left of tavern and band-centered (dy **−0.01px**), pile card-back **true**, playable + End Turn gold glow **true**, yellow orbs gone.

Landscape: tavern mid dx **−0.01px**, hand mid dx **−0.01px**, pendant Δx **0.01px**, DECK beside tavern (dy **0px**). End Turn stays on the right rail.

| Check | Before (build 50 / #25) | After (build 51) |
|---|---|---|
| Portrait felt | before-portrait-390x844.png | after-portrait-390x844.png |
| Patron column + gaps | before-portrait-pendants.png | after-portrait-pendants.png |
| DECK beside tavern | before-portrait-draw-left.png | after-portrait-deck-beside-tavern.png |
| Card-back pile | — | after-portrait-deck-back.png |
| Gold glow kept | — | after-portrait-gold-glow.png |
| Portrait tavern on midline | before-portrait-tavern-center.png | after-portrait-tavern-center.png |
| Portrait hand on midline | before-portrait-hand-center.png | after-portrait-hand-center.png |
| Landscape felt | before-landscape-844x390.png | after-landscape-844x390.png |
| Landscape DECK beside tavern | — | after-landscape-deck-beside-tavern.png |
| Treasury ring seated | — | after-portrait-treasury.png |
| Hold-inspect | — | after-portrait-inspect.png |

Gates: tavern mid dx ≤4px; hand mid dx ≤4px; pendant face Δx ≤4px; patron column left of build-50; middle patron circle clear (≥8px); DECK left of tavern and vertically centered on the band; opp DRAW top-left; pile stacks use `card-back.svg`; playable / End Turn gold glow on; yellow felt orbs gone; DRAW/CD labels under stacks; left strip hudTop < 260; End Turn bottom-left (portrait); overlap hits from #15/#18/#19/#23/#24 stay false. Club files from main 50.
