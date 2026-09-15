# Board PR #28 review shots (build 52)

Ivan landscape follow-up on build 51 / PR #26. Puppeteer 390×844 + 844×390. Portrait packing locked. All layout-fb overlap hits: false.

Landscape: modest zoom-out so tavern hexes (cardH **85.8px**, y 129–215) and you-hand hexes (y 311–382, vh 390) sit fully on-canvas. Left opp DRAW / tavern DECK / you DRAW inset to **18px** (art+label minX **15.42** > 0). Right COOLDOWNs stay right (gap **128px**, maxRight 716 < 844). DECK still left of the tavern at band mid (dy **0**). Tavern/hand mid dx **−0.01px**.

Portrait: unchanged vs build 51 — tavern mid dx **0px**, hand mid dx **0px**, pendant face Δx **0.02px**, patron col X **328**, middle-patron gap **33.11px**, Treasury face **24.63×24.63**, DRAW left **6px**, hudTop **168.8**, DECK dy **−0.01px**.

| Check | After (build 52) |
|---|---|
| Portrait felt (locked) | after-portrait-390x844.png |
| Portrait tavern midline | after-portrait-tavern-center.png |
| Portrait hand midline | after-portrait-hand-center.png |
| Landscape felt | after-landscape-844x390.png |
| Landscape left piles on-canvas | after-landscape-left-piles.png |
| Landscape hand hexes full | after-landscape-hand-hexes.png |
| Landscape tavern midline | after-landscape-tavern-center.png |

Gates: landscape tavern + hand hexes fully on-canvas; left pile art+labels left > 0; right CD art+labels on-canvas; DECK left of tavern and band-centered; portrait metrics match build 51; overlap hits from #15/#18/#19/#23/#24 stay false. Club files from main 51.
