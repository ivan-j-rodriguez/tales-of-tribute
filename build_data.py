#!/usr/bin/env python3
"""Build Tales of Tribute structured data pack from UESP wikitext."""
from __future__ import annotations
import json, re, os, hashlib
from pathlib import Path
from typing import Any

OUT = Path("/workspace/tots/data")
WIKI = Path("/tmp/tot_wiki/patrons")
HTML = Path("/tmp/tot_pages")

# Map wiki file -> deck metadata
DECK_META = {
    "Treasury": {
        "id": "treasury", "name": "Treasury", "patronId": "treasury",
        "color": "neutral", "patronName": "Treasury",
        "imageFile": "ON-tribute-patron-Neutral.png",
        "alwaysInMatch": True, "selectable": False,
        "source": "https://en.uesp.net/wiki/Online:Treasury",
        "chapter": "High Isle",
    },
    "Saint_Pelin": {
        "id": "saint_pelin", "name": "Saint Pelin", "patronId": "saint_pelin",
        "color": "red", "patronName": "Saint Pelin",
        "imageFile": "ON-tribute-patron-Saint Pelin.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Saint_Pelin",
        "chapter": "High Isle",
    },
    "Duke_of_Crows__Patron": {
        "id": "duke_of_crows", "name": "Duke of Crows", "patronId": "duke_of_crows",
        "color": "black", "patronName": "Duke of Crows",
        "imageFile": "ON-tribute-patron-Blackfeather Court.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Duke_of_Crows_(Patron)",
        "chapter": "High Isle",
    },
    "Grandmaster_Delmene_Hlaalu": {
        "id": "hlaalu", "name": "Grandmaster Delmene Hlaalu", "patronId": "hlaalu",
        "color": "yellow", "patronName": "Grandmaster Delmene Hlaalu",
        "imageFile": "ON-tribute-patron-House Hlaalu.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Grandmaster_Delmene_Hlaalu",
        "chapter": "High Isle",
    },
    "Psijic_Loremaster_Celarus": {
        "id": "celarus", "name": "Psijic Loremaster Celarus", "patronId": "celarus",
        "color": "blue", "patronName": "Psijic Loremaster Celarus",
        "imageFile": "ON-tribute-patron-Psijic Order.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Psijic_Loremaster_Celarus",
        "chapter": "High Isle",
    },
    "Red_Eagle": {
        "id": "red_eagle", "name": "Red Eagle, King of the Reach", "patronId": "red_eagle",
        "color": "orange", "patronName": "Red Eagle, King of the Reach",
        "imageFile": "ON-tribute-patron-Red Eagle.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Red_Eagle",
        "chapter": "High Isle",
    },
    "Sorcerer-King_Orgnum": {
        "id": "orgnum", "name": "Sorcerer-King Orgnum", "patronId": "orgnum",
        "color": "teal", "patronName": "Sorcerer-King Orgnum",
        "imageFile": "ON-tribute-patron-Orgnum.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Sorcerer-King_Orgnum",
        "chapter": "High Isle",
    },
    "Rajhin": {
        "id": "rajhin", "name": "Rajhin, the Purring Liar", "patronId": "rajhin",
        "color": "purple", "patronName": "Rajhin, the Purring Liar",
        "imageFile": "ON-tribute-patron-Rajhin.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Rajhin",
        "chapter": "High Isle",
    },
    "Ansei_Frandar_Hunding": {
        "id": "hunding", "name": "Ansei Frandar Hunding", "patronId": "hunding",
        "color": "brown", "patronName": "Ansei Frandar Hunding",
        "imageFile": "ON-tribute-patron-Ansei.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Ansei_Frandar_Hunding",
        "chapter": "High Isle",
    },
    "Druid_King": {
        "id": "druid_king", "name": "Druid King Kasorayn", "patronId": "druid_king",
        "color": "green", "patronName": "Druid King Kasorayn",
        "imageFile": "ON-tribute-patron-Druid King.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Druid_King",
        "chapter": "Firesong / Galen",
    },
    "Almalexia__Patron": {
        "id": "almalexia", "name": "Almalexia", "patronId": "almalexia",
        "color": "gold", "patronName": "Almalexia",
        "imageFile": "ON-tribute-patron-Almalexia.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Almalexia_(Patron)",
        "chapter": "Necrom",
    },
    "Hermaeus_Mora__Patron": {
        "id": "hermaeus_mora", "name": "Hermaeus Mora", "patronId": "hermaeus_mora",
        "color": "green-black", "patronName": "Hermaeus Mora",
        "imageFile": "ON-tribute-patron-Hermaeus Mora.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Hermaeus_Mora_(Patron)",
        "chapter": "Infinite Archive / Necrom era",
    },
    "Saint_Alessia": {
        "id": "saint_alessia", "name": "Saint Alessia", "patronId": "saint_alessia",
        "color": "white-gold", "patronName": "Saint Alessia",
        "imageFile": "ON-tribute-patron-Saint Alessia.png",
        "alwaysInMatch": False, "selectable": True,
        "source": "https://en.uesp.net/wiki/Online:Saint_Alessia",
        "chapter": "Gold Road",
    },
}

def slugify(name: str) -> str:
    s = name.lower().strip()
    s = s.replace("'", "").replace(",", "").replace(".", "")
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")

def build_image_index() -> dict[str, str]:
    """Map filename -> https://images.uesp.net/... from downloaded HTML."""
    idx = {}
    pat = re.compile(
        r'images\.uesp\.net/(?:thumb/)?([0-9a-f]/[0-9a-f]+)/([^/"\s]+?\.(?:png|jpg|jpeg|webp))',
        re.I,
    )
    for html_path in HTML.glob('*.html'):
        text = html_path.read_text(errors="ignore")
        for m in pat.finditer(text):
            folder, fname = m.group(1), m.group(2)
            base = re.sub(r'^\d+px-', '', fname)
            full = f"https://images.uesp.net/{folder}/{base}"
            for key in (base, fname, base.replace(" ", "_"), base.replace("_", " ")):
                idx[key] = full
    return idx

IMAGE_INDEX = build_image_index()

def resolve_image(filename: str | None) -> str | None:
    if not filename:
        return None
    # strip [[File:...|...]]
    m = re.search(r'File:([^|\]]+)', filename)
    if m:
        filename = m.group(1).strip()
    filename = filename.strip()
    for key in (filename, filename.replace(" ", "_"), filename.replace("_", " ")):
        if key in IMAGE_INDEX:
            return IMAGE_INDEX[key]
    # fallback wiki file page (not ideal but public)
    return f"https://en.uesp.net/wiki/File:{filename.replace(' ', '_')}"

def strip_wiki(s: str) -> str:
    s = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', s)
    s = re.sub(r"'{2,}", '', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\{\{Hover\|[^}|]*\|([^}]+)\}\}', r'\1', s)
    return s.strip()

def parse_tot_templates(effect_text: str) -> list[dict]:
    """Parse {{TOT X|...}} and common raw effect phrases into structured ops."""
    ops: list[dict] = []
    # Normalize line breaks
    text = effect_text.replace('<br>', '\n').replace('<br/>', '\n').replace('<br />', '\n')

    # Split by Combo N markers while keeping them
    parts = re.split(r"(?:\*\*)?Combo\s+(\d+)(?:\*\*)?", text)
    # parts[0]=onPlay, then (req, content)*
    segments = [("onPlay", parts[0])]
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            segments.append((f"combo{parts[i]}", parts[i + 1]))

    result_ops = []
    for timing, chunk in segments:
        chunk_ops = parse_effect_chunk(chunk)
        for op in chunk_ops:
            op = dict(op)
            if timing.startswith("combo"):
                op["timing"] = "combo"
                op["comboRequirement"] = int(timing.replace("combo", ""))
            else:
                op["timing"] = timing
            result_ops.append(op)
    return result_ops

def parse_effect_chunk(chunk: str) -> list[dict]:
    ops = []
    raw = chunk
    # While In Play
    while_m = re.search(r'\{\{TOT While\|([^}]+)\}\}\s*(.*)', chunk, re.S)
    if while_m:
        trigger = strip_wiki(while_m.group(1))
        rest = while_m.group(2)
        nested = parse_effect_chunk(rest)
        ops.append({
            "op": "whileInPlay",
            "trigger": trigger,
            "effects": nested,
        })
        # remove while portion for further parsing of non-while bits before it
        chunk = chunk[:while_m.start()] + "\n" + (rest if not nested else "")
        # actually better: parse before while separately
        before = raw[:while_m.start()]
        before_ops = parse_templates_only(before)
        return before_ops + ops

    ops.extend(parse_templates_only(chunk))

    # Raw text patterns not wrapped in templates
    plain = strip_wiki(re.sub(r'\{\{[^}]+\}\}', '', chunk))
    plain = re.sub(r'\[\[File:[^\]]+\]\]', '', plain)
    for line in plain.split('\n'):
        line = line.strip(' :')
        if not line:
            continue
        low = line.lower()
        if 'no play effect' in low or 'this card has no play effect' in low:
            ops.append({"op": "noop", "note": "no play effect"})
        elif 'unusable' in low or 'no benefit' in low:
            ops.append({"op": "unusable"})
        elif re.match(r'refresh[—\-]', low) or low.startswith('refresh'):
            # already often covered by TOT Refresh; keep if standalone
            if not any(o.get('op') == 'refresh' for o in ops):
                ops.append({"op": "refresh", "raw": line, "needsReview": True})
        elif 'taunt' == low or low.startswith('taunt'):
            if not any(o.get('op') == 'taunt' for o in ops):
                ops.append({"op": "taunt"})
        elif 'draw 1 card' in low:
            if not any(o.get('op') == 'draw' for o in ops):
                ops.append({"op": "draw", "amount": 1})
        elif line and not any(x in low for x in ['combo', 'favors', 'neutral', 'pay ']):
            # leftover prose — mark
            if len(line) > 3 and not line.startswith(':'):
                ops.append({"op": "raw", "text": line, "needsReview": True})
    return ops

def parse_templates_only(chunk: str) -> list[dict]:
    ops = []
    # Choose blocks: {{TOT Choose}} followed by indented options with :
    if '{{TOT Choose}}' in chunk or '{{TOT Choose|' in chunk:
        ops.append({"op": "chooseOne"})
        # options often as :: {{TOT ...}}
        opts = re.findall(r'::\s*(\{\{TOT[^}]+\}\})', chunk)
        if opts:
            choice_opts = []
            for o in opts:
                choice_opts.append(parse_templates_only(o))
            ops[-1]["options"] = choice_opts
            # remove choose and options from further parsing
            chunk = re.sub(r'\{\{TOT Choose[^}]*\}\}', '', chunk)
            chunk = re.sub(r'::\s*\{\{TOT[^}]+\}\}', '', chunk)

    for m in re.finditer(r'\{\{TOT\s+([^|}]+)(?:\|([^}]*))?\}\}', chunk):
        name = m.group(1).strip()
        args = (m.group(2) or "").split("|")
        args = [a.strip() for a in args if a is not None]
        op = template_to_op(name, args)
        if op:
            ops.append(op)
    return ops

def template_to_op(name: str, args: list[str]) -> dict | None:
    n = name.replace("_", " ").strip()
    def arg(i, default=None):
        if i < len(args) and args[i] != "":
            return args[i]
        return default

    if n == "Coin":
        amount = arg(0, "1")
        note = arg(1)
        try:
            amount_v: Any = int(amount)
        except ValueError:
            amount_v = amount
        d = {"op": "gainCoin", "amount": amount_v}
        if note:
            d["note"] = note
        return d
    if n == "Power":
        amount = arg(0, "1")
        note = arg(1)
        try:
            amount_v = int(amount) if amount and str(amount).isdigit() else (amount if amount else 1)
        except ValueError:
            amount_v = amount or 1
        d = {"op": "gainPower", "amount": amount_v}
        if note:
            d["note"] = note
            if "equal to" in note.lower() or "for every" in note.lower() or "rounded" in note.lower():
                d["needsReview"] = True
                d["amountExpr"] = note
        return d
    if n == "Prestige":
        amount = arg(0, "1")
        note = arg(1)
        try:
            amount_v = int(amount) if amount and str(amount).isdigit() else (amount if amount else 1)
        except ValueError:
            amount_v = amount or 1
        d = {"op": "gainPrestige", "amount": amount_v}
        if note:
            d["note"] = note
            if "equal to" in note.lower():
                d["needsReview"] = True
                d["amountExpr"] = note
        return d
    if n == "Draw":
        return {"op": "draw", "amount": int(arg(0, "1"))}
    if n == "Replace":
        return {"op": "replaceTavern", "amount": int(arg(0, "1"))}
    if n == "Destroy":
        return {"op": "destroyOwnCard", "amount": int(arg(0, "1")), "from": ["hand", "inPlay"]}
    if n == "Knock Out":
        a0 = arg(0, "1")
        if a0 == "All":
            return {"op": "knockOut", "amount": "all", "target": "allAgents"}
        return {"op": "knockOut", "amount": int(a0), "target": "opponentAgent"}
    if n == "Create":
        card = arg(0)
        to_opponent = bool(arg(1))
        return {"op": "createCard", "cardName": card, "destination": "opponentCooldown" if to_opponent else "cooldown"}
    if n == "Acquire":
        return {"op": "acquireFromTavern", "maxCost": int(arg(0, "0"))}
    if n == "Discard":
        return {"op": "opponentDiscard", "amount": 1, "when": "startOfTheirTurn"}
    if n == "Donate":
        return {"op": "donate", "amount": int(arg(0, "1"))}  # discard up to N then draw that many
    if n == "Heal":
        return {"op": "healAgent", "amount": int(arg(0, "1")), "target": "self"}
    if n == "Patron":
        return {"op": "extraPatronCall", "amount": 1}
    if n == "Refresh":
        amount = int(arg(0, "1"))
        card_type = arg(1)  # e.g. agent
        d = {"op": "refresh", "amount": amount, "from": "cooldown", "to": "topOfDraw"}
        if card_type:
            d["cardType"] = card_type
        return d
    if n == "Toss":
        return {"op": "toss", "lookAt": int(arg(0, "1"))}
    if n == "Taunt":
        return {"op": "taunt"}
    if n == "Bargain":
        return {"op": "bargain", "note": "Acquire a non-contract card from the Tavern; opponent gains a copy"}
    if n == "Confine":
        return {"op": "confine", "amount": int(arg(0, "1")), "from": "opponentCooldown"}
    if n == "Reprieve":
        return {"op": "reprieve", "lookAt": int(arg(0, "1")), "note": "Look at top N of opponent draw; place 1 in their cooldown"}
    if n == "Lose Prestige":
        return {"op": "opponentLosePrestige", "amount": int(arg(0, "1"))}
    if n == "Setback":
        kind = arg(0, "Coin")
        amt = int(arg(1, "1"))
        mapping = {"Coin": "gainCoin", "Power": "gainPower", "Draw": "draw"}
        return {"op": "setback", "opponentOp": mapping.get(kind, kind.lower()), "amount": amt}
    if n == "While":
        return {"op": "whileInPlay", "trigger": arg(0, ""), "needsReview": True}
    if n == "Choose":
        return {"op": "chooseOne"}
    return {"op": "unknownTemplate", "template": n, "args": args, "needsReview": True}

def parse_wikitable_rows(section: str) -> list[list[str]]:
    """Parse wiki table rows into cell lists. Handles || and multiline cells."""
    # If section already is/contains a table, use first table; else treat as table body
    tables = re.findall(r'\{\|.*?\|\}', section, re.S)
    table = tables[0] if tables else section
    body = re.sub(r'^\{\|[^\n]*\n', '', table)
    body = re.sub(r'\n\|\}\s*$', '', body)
    rows = []
    chunks = re.split(r'\n\|-\n', body)
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk or chunk.lstrip().startswith('!'):
            continue
        if not chunk.startswith('|'):
            chunk = '|' + chunk
        protected: list[str] = []
        def prot(m):
            protected.append(m.group(0))
            return f'\x00{len(protected)-1}\x00'
        tmp = chunk
        for _ in range(6):
            nxt = re.sub(r'\{\{[^{}]*\}\}', prot, tmp)
            if nxt == tmp:
                break
            tmp = nxt
        tmp = re.sub(r'\[\[[^\]]*\]\]', prot, tmp)
        tmp = tmp.replace('||', '\n|')
        cells: list[str] = []
        cur = None
        for line in tmp.split('\n'):
            if line.startswith('|'):
                if cur is not None:
                    cells.append(cur.strip())
                cur = line[1:]
            else:
                if cur is None:
                    cur = line
                else:
                    cur = cur + '\n' + line
        if cur is not None:
            cells.append(cur.strip())
        def unprot(s: str) -> str:
            return re.sub(r'\x00(\d+)\x00', lambda m: protected[int(m.group(1))], s)
        cells = [unprot(c).strip() for c in cells]
        if cells:
            rows.append(cells)
    return rows


def extract_file(cell: str) -> str | None:
    m = re.search(r'\[\[File:([^|\]]+)', cell)
    return m.group(1).strip() if m else None

def parse_copies(cell: str) -> tuple[int, int | None]:
    """Return (base_copies, copies_after_upgrade or None)."""
    cell = strip_wiki(cell)
    m = re.match(r'(\d+)\s*(?:\((\d+)\))?', cell)
    if m:
        base = int(m.group(1))
        after = int(m.group(2)) if m.group(2) else None
        return base, after
    # Hover template already stripped to (n)
    m = re.search(r'(\d+)', cell)
    return (int(m.group(1)), None) if m else (1, None)

def normalize_type(t: str) -> str:
    t = strip_wiki(t).lower()
    mapping = {
        "action": "action",
        "agent": "agent",
        "contract action": "contractAction",
        "contract agent": "contractAgent",
        "curse action": "curseAction",
        "curse": "curseAction",
    }
    return mapping.get(t, t.replace(" ", ""))

def parse_card_section(section: str, deck_id: str, category: str) -> list[dict]:
    cards = []
    rows = parse_wikitable_rows(section)
    for row in rows:
        if len(row) < 3:
            continue
        img = extract_file(row[0])
        # Some rows may start with name if image missing
        if img is None and 'File:' not in row[0] and not row[0].startswith('[['):
            # shift: maybe no image column — unlikely
            name = strip_wiki(row[0])
            idx = 0
        else:
            name = strip_wiki(row[1]) if len(row) > 1 else ''
            idx = 1
        if not name or name.lower() in ('name', 'card', 'art', 'vard'):
            continue
        ctype = strip_wiki(row[idx + 1]) if len(row) > idx + 1 else 'Action'
        rest = row[idx + 2:]

        cost = None
        hp = None
        effect_cell = ''
        copies = 1
        copies_after = None
        replaces = None
        obtained = None

        if category in ('starter', 'created'):
            # layouts:
            # [type, effect]
            # [type, health, effect]  (agents / Chimera)
            # Alessia starter: Action, 1, effect  (spurious health)
            if rest and re.match(r'^\d+$', strip_wiki(rest[0])) and len(rest) >= 2:
                hp = int(strip_wiki(rest[0]))
                effect_cell = rest[1]
                if 'agent' not in ctype.lower() and category == 'starter':
                    # likely spurious; keep as parseNote later
                    pass
            elif rest:
                effect_cell = rest[0]
            copies = 1
        else:
            # [cost, health?, effect, copies, replaces?, obtained?]
            if not rest:
                continue
            cost_s = strip_wiki(rest[0])
            try:
                cost = int(cost_s) if cost_s != '' else None
                rest = rest[1:]
            except ValueError:
                effect_cell = rest[0]
                rest = rest[1:]
                cost = None
            if cost is not None and rest:
                hp_s = strip_wiki(rest[0])
                if hp_s == '':
                    hp = None
                    rest = rest[1:]
                elif re.match(r'^\d+$', hp_s):
                    hp = int(hp_s)
                    rest = rest[1:]
            if rest:
                effect_cell = rest[0]
                rest = rest[1:]
            if rest:
                copies, copies_after = parse_copies(rest[0])
                rest = rest[1:]
            if category == 'upgrade' and rest:
                replaces = strip_wiki(rest[0])
                rest = rest[1:]
            if category == 'upgrade' and rest:
                obtained = strip_wiki(rest[0])

        effects = parse_tot_templates(effect_cell)
        taunt = any(o.get('op') == 'taunt' for o in effects) or '{{TOT Taunt}}' in effect_cell or re.search(r'\bTaunt\b', effect_cell) is not None
        combo_reqs = sorted({o['comboRequirement'] for o in effects if 'comboRequirement' in o})
        card_type = normalize_type(ctype)
        needs_review = any(o.get('needsReview') for o in effects)

        raw_effect = re.sub(r'<br\s*/?>', ' | ', effect_cell)
        raw_effect = re.sub(
            r'\{\{TOT ([^|}]+)(?:\|([^}]*))?\}\}',
            lambda m: f"[{m.group(1)}{(' ' + m.group(2)) if m.group(2) else ''}]",
            raw_effect,
        )
        raw_effect = strip_wiki(raw_effect)

        if category == 'upgrade':
            card_id = f"{deck_id}__upgrade__{slugify(name)}"
        elif category == 'created':
            card_id = f"{deck_id}__created__{slugify(name)}"
        elif category == 'starter':
            card_id = f"{deck_id}__starter__{slugify(name)}"
        else:
            card_id = f"{deck_id}__{slugify(name)}"

        card = {
            'id': card_id,
            'name': name,
            'deckId': deck_id,
            'type': card_type,
            'category': category,
            'cost': cost,
            'copies': copies,
            'copiesAfterUpgrade': copies_after,
            'hp': hp,
            'taunt': bool(taunt),
            'effects': effects,
            'rawEffect': raw_effect,
            'imageUrl': resolve_image(img) if img else None,
            'imageFile': img,
            'comboRequirement': combo_reqs if combo_reqs else None,
            'needsReview': needs_review,
        }
        if replaces:
            card['replaces'] = replaces
        if obtained:
            card['obtainedFrom'] = obtained
        if category == 'starter':
            card['isStarter'] = True
        if category == 'created':
            card['isCreated'] = True
        cards.append(card)
    return cards


def parse_patron_favor(wiki: str) -> dict:
    """Extract FAVORED / NEUTRAL / UNFAVORED blocks."""
    favor = {}
    # Get ==Patron== section
    m = re.search(r'==Patron==\n(.*?)(?:\n==|\Z)', wiki, re.S)
    if not m:
        return favor
    sec = m.group(1)
    for level, pattern in [
        ("favored", r"<span[^>]*>'''FAVORED'''</span><br>(.*?)(?=<span|'''NEUTRAL'''|\n\n|\Z)"),
        ("neutral", r"'''NEUTRAL'''<br>(.*?)(?=<span|'''UNFAVORED'''|\n\n|\Z)"),
        ("unfavored", r"<span[^>]*>'''UNFAVORED'''</span><br>(.*?)(?=\n\n|\n==|\Z)"),
    ]:
        mm = re.search(pattern, sec, re.S | re.I)
        if not mm:
            # Treasury has no favor levels — whole section is ability
            continue
        text = mm.group(1).strip()
        # Split cost/requirements from effect roughly
        favor[level] = {
            "raw": strip_wiki(text.replace("<br>", " ").replace("<br/>", " ")),
            "effects": parse_tot_templates(text),
            "costs": parse_costs(text),
        }
    if not favor and "==Patron==" in wiki:
        # Treasury-style single ability
        text = m.group(1).strip()
        favor["always"] = {
            "raw": strip_wiki(text.replace("<br>", " ")),
            "effects": parse_tot_templates(text),
            "costs": parse_costs(text),
        }
    return favor

def parse_costs(text: str) -> list[dict]:
    costs = []
    # Pay N Coin / Power
    for m in re.finditer(r'Pay\s+(\d+|all)\s+(Coin|Power)', text, re.I):
        costs.append({"resource": m.group(2).lower(), "amount": m.group(1).lower() if m.group(1).lower()=="all" else int(m.group(1))})
    for m in re.finditer(r'Sacrifice\s+(\d+)\s+card', text, re.I):
        costs.append({"op": "sacrificeCard", "amount": int(m.group(1))})
    for m in re.finditer(r'Discard\s+a\s+Card', text, re.I):
        costs.append({"op": "discardCard", "amount": 1})
    if re.search(r'Have\s+1\s+agent\s+card\s+in\s+your\s+cooldown', text, re.I):
        costs.append({"requirement": "agentInCooldown", "amount": 1})
    if re.search(r'Opponent has 1 agent', text, re.I):
        costs.append({"requirement": "opponentHasAgent", "amount": 1})
    if re.search(r'Hold this patron\'s favor until the start of your turn', text, re.I):
        costs.append({"requirement": "passiveWhileFavored"})
    if re.search(r'Unusable', text, re.I):
        costs.append({"unusable": True})
    return costs

def parse_starter_copies(wiki: str, starter_name: str) -> int:
    m = re.search(r'(\d+)\s+copies?\s+of\s+the\s+starter\s+card', wiki, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r'1 copy of the starter card', wiki, re.I)
    if m:
        return 1
    return 1

def split_sections(wiki: str) -> dict[str, str]:
    secs = {}
    deck_m = re.search(r'==Deck==\n(.*)\Z', wiki, re.S)
    body = deck_m.group(1) if deck_m else wiki
    # Ensure leading newline so first ===Section=== is matched
    if not body.startswith('\n'):
        body = '\n' + body
    parts = re.split(r'\n===\s*([^=]+?)\s*===\n', body)
    if len(parts) > 1:
        for i in range(1, len(parts), 2):
            secs[parts[i].strip().lower()] = parts[i+1]
    return secs

def process_deck(wiki_key: str, meta: dict) -> tuple[dict, list[dict], dict]:
    wiki = (WIKI / f"{wiki_key}.wiki").read_text()
    deck_id = meta["id"]
    sections = split_sections(wiki)

    all_cards = []
    # Starter
    if "starter" in sections:
        starters = parse_card_section(sections["starter"], deck_id, "starter")
        copies = parse_starter_copies(wiki, "")
        for c in starters:
            c["copies"] = copies
            c["type"] = c["type"] if c["type"] else "action"
            # mark as starter type overlay
            c["isStarter"] = True
        all_cards.extend(starters)

    if "cards" in sections:
        base = parse_card_section(sections["cards"], deck_id, "base")
        all_cards.extend(base)

    if "upgrades" in sections:
        ups = parse_card_section(sections["upgrades"], deck_id, "upgrade")
        all_cards.extend(ups)

    if "other" in sections:
        created = parse_card_section(sections["other"], deck_id, "created")
        for c in created:
            c["isCreated"] = True
            c["cost"] = c.get("cost")  # usually unbuyable
        all_cards.extend(created)

    # Also catch created cards mentioned in patron effects that might be in Cards section (Alessia)
    # Chainbreaker Sergeant / Soldier of the Empire are both base deck AND created

    favor = parse_patron_favor(wiki)

    # unique mechanics from gameplay section
    gm = re.search(r'==Gameplay==\n(.*?)(?:\n==|\Z)', wiki, re.S)
    unique = strip_wiki(gm.group(1).strip()) if gm else None

    patron = {
        "id": meta["patronId"],
        "name": meta["patronName"],
        "deckId": deck_id,
        "favorLevels": favor,
        "uniqueMechanics": unique,
        "imageUrl": resolve_image(meta["imageFile"]),
        "alwaysInMatch": meta.get("alwaysInMatch", False),
        "selectable": meta.get("selectable", True),
        "chapter": meta.get("chapter"),
        "sourceUrl": meta["source"],
        "hasFavorTrack": "always" not in favor,
    }

    deck = {
        "id": deck_id,
        "name": meta["name"],
        "patronId": meta["patronId"],
        "color": meta["color"],
        "cardIds": [c["id"] for c in all_cards],
        "chapter": meta.get("chapter"),
        "sourceUrl": meta["source"],
    }

    # Fix Alessia starter: wiki lists Health column for Action incorrectly — Alessian Rebel is Action with combo
    for c in all_cards:
        if c["name"] == "Alessian Rebel" and c.get("hp") == 1 and c["type"] == "action":
            c["hp"] = None
            # The "1" was wrongly parsed — looking at wiki: Type!!Health!!Effect with Action || 1 ||
            # Actually it might be a health-less misparse of cost; leave note
            c["needsReview"] = True
            c["parseNote"] = "UESP lists a numeric column before effect for this Action starter; treated as non-HP"

    return patron, all_cards, deck

def main():
    patrons = []
    cards = []
    decks = []

    for wiki_key, meta in DECK_META.items():
        print(f"Processing {wiki_key}...")
        patron, deck_cards, deck = process_deck(wiki_key, meta)
        patrons.append(patron)
        cards.extend(deck_cards)
        decks.append(deck)
        print(f"  -> {len(deck_cards)} cards")

    # Deduplicate by id (shouldn't happen)
    seen = set()
    unique_cards = []
    for c in cards:
        if c["id"] in seen:
            c["id"] = c["id"] + "_dup"
        seen.add(c["id"])
        unique_cards.append(c)
    cards = unique_cards

    # Post-process: mark incomplete
    incomplete = []
    for c in cards:
        if not c.get("effects") and c.get("rawEffect"):
            c["needsReview"] = True
            c["incomplete"] = True
            incomplete.append(c["id"])
        elif c.get("needsReview"):
            incomplete.append(c["id"])

    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "patrons.json", "w") as f:
        json.dump({"patrons": patrons, "count": len(patrons)}, f, indent=2)
    with open(OUT / "cards.json", "w") as f:
        json.dump({"cards": cards, "count": len(cards)}, f, indent=2)
    with open(OUT / "decks.json", "w") as f:
        json.dump({"decks": decks, "count": len(decks)}, f, indent=2)

    # Summary
    print("\n=== SUMMARY ===")
    print(f"Patrons: {len(patrons)}")
    print(f"Cards: {len(cards)}")
    for d in decks:
        n = sum(1 for c in cards if c["deckId"] == d["id"])
        copies = sum(c.get("copies") or 0 for c in cards if c["deckId"] == d["id"] and c.get("category") == "base")
        print(f"  {d['id']}: {n} unique entries, base copies sum={copies}")
    print(f"needsReview/incomplete: {len(set(incomplete))}")
    with open("/tmp/tot_incomplete.txt", "w") as f:
        f.write("\n".join(sorted(set(incomplete))))

if __name__ == "__main__":
    main()
