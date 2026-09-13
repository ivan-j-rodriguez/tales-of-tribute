# Tales of Tribute — Complete Rules (Fan Data Pack)

This document restates the rules of *Tales of Tribute* (Elder Scrolls Online) in original wording for implementers. It is not a verbatim copy of UESP or Bethesda materials. Verify edge cases against the live game when possible.

## 1. Match overview

Tales of Tribute is a two-player competitive deck-builder. Each match uses **four themed Patron decks** plus the always-present **Treasury** deck. Players buy cards from a shared **Tavern**, assemble stronger decks over time, and score **Prestige**. A match ends by Prestige thresholds or by holding the favor of all four match patrons at once.

## 2. Match setup and patron draft

1. Draft **four distinct themed patrons**. In PvP the order is **A–B–B–A**: Player A chooses first, Player B chooses the second and third, then Player A chooses the fourth. Against NPCs, the NPC normally chooses its two first and the player chooses the last two. Those four patrons are the themed patrons in play.
2. The **Treasury** is always added. It cannot be drafted away and has no favor track.
3. Combined, the match uses **five** decks: 4 player-chosen + Treasury.
4. **Starting player decks**: each player begins with:
   - **6× Gold** (Treasury starter), and
   - **1× starter card from each of all four drafted patrons**. Each starting deck therefore has **10 cards**.
5. All non-starter cards from the four chosen patron decks (using whichever upgraded/base copies collection rules call for) plus Treasury buyable cards are shuffled into the shared **Tavern draw pile**.
6. Reveal **5 cards** to form the initial **Tavern row**. When a card leaves the row, refill from the Tavern pile so the row stays at 5 (while cards remain).
7. Patrons begin **unaligned (neutral)**.
8. Players draw up to a hand of **5** at the start of each of their turns. To offset going second, Player B gains **1 bonus Coin on their first turn**.

## 3. Goals / end of game

### Prestige (40 + last chance)
- If you end your turn with **40 or more Prestige**, your opponent gets **one last turn**.
- On that turn they must **strictly exceed** your Prestige. If they fail, you win.
- If they surpass you, you get another chance on your next turn, and so on.
- **Equal Prestige** after a last-chance turn does **not** end the match; play continues.

### Prestige (80 — instant)
- Reaching **80 Prestige** wins **immediately** (no last chance).

### Patron sweep (instant)
- If at the end of your turn you have the **favor of all four** match patrons, you win immediately regardless of Prestige.

## 4. Resources

| Resource | Gained from | Spent on | End of turn |
|----------|-------------|----------|-------------|
| **Coin** | Cards, some patrons | Buying Tavern cards; some patron costs | **Lost** if unspent |
| **Power** | Cards, some patrons | Attacking agents; some patron costs | Converts to **Prestige** if allowed |
| **Prestige** | Cards, patrons, Power conversion | — (score) | Persists |

Power→Prestige conversion is **blocked** while the opponent has at least one **Taunt** agent in play.

## 5. Turn structure

1. **Start of turn**: resolve delayed effects; apply passive patron effects (e.g. Hunding favored Coin); draw up to **5** (reshuffle cooldown into draw when empty).
2. **Main**: play cards; buy Tavern cards; attack enemy agents with Power; call patrons (normally **one** call unless granted extras); activate board agents as allowed.
3. **End of turn**: lose unspent Coin; convert remaining Power to Prestige unless blocked by opposing Taunt; send played non-agent cards to cooldown (contracts may exile); agents stay in play; check wins.

**Passing**: you may end your turn at any time with no further actions.

## 6. Playing cards

- **Action**: resolve on-play and eligible combos; goes to cooldown at end of turn (unless exiled/destroyed).
- **Agent**: enters board with **HP**; remains until knocked out; may be activated on later turns per text.
- **Curse** (Bewilderment): must be played before non-curse cards; usually no benefit.
- **Combo N**: during the turn, count cards of that card's **suit/patron** played (including itself). When the count reaches N, Combo N triggers. Suits map to the four match patrons; Treasury cards generally do not feed themed combos.

## 7. Tavern row and buying

- Row size **5**; refill after buys/replaces.
- **Buy a normal card**: pay Coin = cost; it goes to **cooldown** (not played immediately).
- **Buy a Contract**: it is played **immediately** instead of entering your deck.
- **Replace**: remove up to N row cards and refill.
- **Acquire**: take a row card with cost ≤ N without paying (into cooldown).
- **Bargain**: acquire a non-contract row card; opponent also gains a copy.

## 8. Agents, attacks, Taunt

- Spend Power equal to an agent's current HP to knock it to cooldown (unless text says otherwise).
- **Taunt** agents must be attacked before non-Taunt agents and block Power→Prestige conversion while in play for the opposing player.
- **Knock Out** effects remove agents without spending Power (per targeting rules).

## 9. Discard / cooldown / exile / sacrifice

- **Cooldown**: recycle pile; shuffle into new draw when draw is empty.
- **Destroy / sacrifice**: remove your card from the game (hand or in play as allowed).
- **Exile / Tavern discard**: leave player ownership and do not recycle through that player's deck. Spent Contract Actions and defeated Contract Agents go here.
- **Refresh**: move card(s) from cooldown to top of draw.
- **Toss**: look at top N of draw; move any of them to cooldown.
- **Donate**: discard up to N from hand, draw that many.
- **Confine / Reprieve / Create**: see card ops in `cards.json`.

## 10. Contract cards

- **Contract Actions** resolve immediately when bought. At end of turn they leave play for the Tavern discard / are removed from the match; they never enter either player's deck or cooldown.
- **Contract Agents** enter the buyer's board immediately. When knocked out, they go to the Tavern discard / are removed rather than to the owner's cooldown.

## 11. Patron activation and favor

- Default: **one** patron call per turn (`extraPatronCall` adds more).
- States: unaligned, favors you, favors opponent.
- Successful call usually shifts opponent-favored → unaligned, or unaligned → favors you.
- Some patrons are unusable while they already favor you (Duke of Crows).
- Hunding while favored: passive **+1 Coin** at turn start.
- Treasury: always unaligned; pay 2 Coin + sacrifice a card → create **Writ of Coin** into cooldown.
- Full ability text/costs: `patrons.json` (`favorLevels.unaligned` / `player1` / `player2`).

## 12. Unique patron themes

| Patron | Notes |
|--------|-------|
| Treasury | Neutral contracts; Writ of Coin |
| Saint Pelin | Power + Taunt; refresh agents |
| Duke of Crows | Draw; pay all Coin for Power−1; dead while favored |
| Hlaalu | Coin/Acquire; sacrifice for Prestige = cost−1 |
| Celarus | Toss; pay Coin to KO enemy agent |
| Red Eagle | Self-destroy engines |
| Orgnum | Prestige; Power scales with owned cards; create Summerset Sacking |
| Rajhin | Discard / prestige loss; create Bewilderment for opponent |
| Hunding | Choose-one; passive Coin while favored |
| Druid King | While-in-play; Chimera via combos; Replace |
| Almalexia | Donate/Confine/Reprieve |
| Hermaeus Mora | Power + Setbacks; Bargain |
| Saint Alessia | Choose-one agents; create soldiers; KO/refresh |

## 13. Data files

- `patrons.json`, `cards.json`, `decks.json`
- Common effect ops: `gainCoin`, `gainPower`, `gainPrestige`, `draw`, `replaceTavern`, `acquireFromTavern`, `knockOut`, `destroyOwnCard`, `createCard`, `extraPatronCall`, `toss`, `refresh`, `donate`, `confine`, `reprieve`, `opponentDiscard`, `opponentLosePrestige`, `setback`, `bargain`, `healAgent`, `whileInPlay`, `chooseOne`, `taunt`, `noop`
