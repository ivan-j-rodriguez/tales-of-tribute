# Board PR #28 review shots (build 52)

ToTs follow-up: stronger landscape zoom-out + left inset. Puppeteer 390×844 + 844×390. Portrait packing locked to build 51. All layout-fb overlap hits: false.

Landscape (human-readable, not just bbox>0): DRAW/DECK/DRAW sit in a **clear felt gutter** (container left **36px**, art minX **33.42**). Tavern hexes keep aspect (cardH **87.2px**) with air to both HUDs (opp **35.4px**, you **17.4px**). You-hand hex bottom tips sit above the felt edge (maxBottom **375.36**, vh 390). DECK still left of the tavern at band mid (dy **0**). Right COOLDOWNs stay right.

Portrait: unchanged vs build 51 — tavern/hand mid dx **0**, pendant Δx **0.02**, patron col X **328**, Treasury **24.63×24.63**, DRAW left **6**, hudTop **168.8**.

| Check | After (build 52, ToTs fix) |
|---|---|
| Landscape felt | after-landscape-844x390.png |
| Landscape left piles + gutter | after-landscape-left-piles.png |
| Landscape tavern hex tips | after-landscape-tavern-hexes.png |
| Landscape hand hex tips | after-landscape-hand-hexes.png |
| Portrait felt (locked) | after-portrait-390x844.png |

Gates: left pile minX ≥18; hand tips ≤378; tavern air vs HUD; DECK band-centered; portrait metrics match build 51; overlap hits from #15/#18/#19/#23/#24 stay false. Club files from main 51.
