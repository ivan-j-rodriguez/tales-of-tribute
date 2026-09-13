#!/usr/bin/env python3
"""Generate Tales of Tribute data files from Spicy Economics scrape."""
import json, os, re, hashlib
from pathlib import Path

ROOT = Path("/workspace/tots")
DATA = ROOT / "data"

# Patron IDs
PATRONS = {
    "treasury": {"id": "treasury", "name": "The Treasury", "short": "Treasury", "color": "#c9a227", "starter": None, "alwaysNeutral": True},
    "pelin": {"id": "pelin", "name": "Saint Pelin", "short": "Pelin", "color": "#8b4513", "starter": "Fortify"},
    "hlaalu": {"id": "hlaalu", "name": "Grandmaster Delmene Hlaalu", "short": "Hlaalu", "color": "#daa520", "starter": "Goods Shipment"},
    "crows": {"id": "crows", "name": "Duke of Crows", "short": "Crows", "color": "#2f2f2f", "starter": "Peck"},
    "celarus": {"id": "celarus", "name": "Psijic Loremaster Celarus", "short": "Celarus", "color": "#4169e1", "starter": "Mainland Inquiries"},
    "hunding": {"id": "hunding", "name": "Ansei Frandar Hunding", "short": "Hunding", "color": "#cd853f", "starter": "Way of the Sword"},
    "redeagle": {"id": "redeagle", "name": "Red Eagle, King of the Reach", "short": "Red Eagle", "color": "#8b0000", "starter": "War Song"},
    "orgnum": {"id": "orgnum", "name": "Sorcerer-King Orgnum", "short": "Orgnum", "color": "#20b2aa", "starter": "Sea Elf Raid"},
    "rajhin": {"id": "rajhin", "name": "Rajhin, the Purring Liar", "short": "Rajhin", "color": "#9932cc", "starter": "Swipe"},
    "druid": {"id": "druid", "name": "The Druid King", "short": "Druid King", "color": "#228b22", "starter": "Ritual Herbs"},
    "almalexia": {"id": "almalexia", "name": "Almalexia", "short": "Almalexia", "color": "#ff6347", "starter": "Collection Plate"},
    "mora": {"id": "mora", "name": "Hermaeus Mora", "short": "Mora", "color": "#556b2f", "starter": "Unsealed Glyphic"},
    "alessia": {"id": "alessia", "name": "Saint Alessia", "short": "Alessia", "color": "#b8860b", "starter": "Alessian Rebel"},
}

# Map spicyeconomics patron names to ids
PATRON_MAP = {
    "Almalexia": "almalexia", "Hunding": "hunding", "Crows": "crows", "Hlaalu": "hlaalu",
    "Mora": "mora", "Celarus": "celarus", "Rajhin": "rajhin", "Red Eagle": "redeagle",
    "Alessia": "alessia", "Pelin": "pelin", "Orgnum": "orgnum", "Druid King": "druid",
    "Neutral": "treasury",
}

# Raw card table from Spicy Economics (Patron, Name, Type, Cost, Play, Combo2, Combo3, Combo4, BaseQty, UpQty)
RAW = """
Almalexia|Collection Plate|Action|0|1 Coin|–|Donate 1|–|1|1
Almalexia|ALMSIVI's Charity|Action|5|1 Power AND Hand Refresh 1|1 Coin|–|–|0|1
Almalexia|Mother's Mercy|Action|5|1 Power AND Hand Refresh 1|–|–|–|2|1
Almalexia|Festival of Forbearance|Action|4|2 Coin AND Donate 1|1 Power AND Donate 1|–|–|0|2
Almalexia|Bardic Veneration|Action|4|2 Coin AND Donate 1|Donate 1|–|–|3|1
Almalexia|Hand of Almalexia|Contract Agent: 3 HP|6|1 Power|Confine 2|–|–|0|2
Almalexia|Devotional Gaoler|Contract Agent: 3 HP|6|1 Power|Confine 1|Confine 1|–|3|1
Almalexia|Mercymother Elite|Agent: 5HP+Taunt|8|1 Coin|Patron 1|–|–|0|1
Almalexia|Tribunal Sentinel|Agent: 5HP+Taunt|8|–|Patron 1|–|–|2|1
Almalexia|Mournhold Clergy|Contract Agent: 3 HP|6|2 Prestige/Discard|Donate 1 and Confine 1|–|–|2|2
Almalexia|Philanthropy|Action|3|1 Power/Discard AND 1 Coin|Donate 1|Donate 1|–|3|3
Almalexia|Temple Arbiter|Agent: 2 HP|6|2 Coin|Confine 1|Confine 1|–|2|2
Almalexia|The Lesson of Ayem|Action|5|Donate 1|Draw 1|Donate 1|–|3|3
Hunding|Way of the Sword|Action|0|Choose: 1 Coin OR 1 Power|–|–|–|1|1
Hunding|Ansei's Victory|Action|9|Choose: 6 Power OR Acquire 10|–|–|–|0|1
Hunding|Ansei Assault|Action|9|Choose: 5 Power OR Acquire 9|–|–|–|2|1
Hunding|Grand Oratory|Contract Action|3|Choose: 2 Power OR Draw Refresh 1|2 Coin|–|–|0|2
Hunding|Battle Meditation|Contract Action|3|Choose: 2 Power OR Draw Refresh 1|–|–|–|3|1
Hunding|Hel Shira Herald|Agent: 3HP|6|Draw Refresh 2|1 Power|–|–|0|2
Hunding|No Shira Poet|Agent: 3HP|6|Draw Refresh 1|1 Power|–|–|3|1
Hunding|Hira's End|Action|6|Choose: 4 Power OR Draw Refresh 3|2 Power|–|–|0|2
Hunding|March on Hattu|Action|6|Choose: 4 Power OR Draw Refresh 3|1 Power|–|–|3|1
Hunding|Conquest|Action|4|Choose: 3 Power OR Acquire 4|1 Power|–|–|3|3
Hunding|Shehai Summoning|Action|5|Choose: Draw Refresh 2 OR Acquire 5|Draw Refresh 1|–|–|3|3
Hunding|Warrior Wave|Action|4|Choose: 3 Coin OR 3 Power|–|–|–|3|3
Crows|Peck|Action|0|1 Coin|–|–|–|1|1
Crows|Blackfeather Knave|Agent: 2HP|6|2 Coin|–|Draw 1|–|0|1
Crows|Blackfeather Brigand|Agent: 2HP|6|1 Coin|–|Draw 1|–|2|1
Crows|Murder of Crows|Action|4|1 Coin|2 Coin AND 2 Power|2 Power|–|0|2
Crows|Scratch|Action|4|1 Coin|2 Coin AND 2 Power|–|–|4|2
Crows|Plunder|Action|6|Draw 1|–|Draw 1|Draw 1|0|1
Crows|Pilfer|Action|6|Draw 1|–|Draw 1|–|2|1
Crows|Toll of Silver|Action|4|2 Coin|Draw 1|1 Coin|–|0|2
Crows|Toll of Flesh|Action|4|2 Coin|Draw 1|–|–|4|2
Crows|Blackfeather Knight|Agent: 3HP|6|1 Coin|–|2 Coin AND 2 Power|–|2|2
Crows|Law of Sovereign Roost|Contract Action|4|Draw 1|–|Discard 1|–|2|2
Crows|Pool of Shadow|Action|4|2 Power|Draw 1|–|3 Coin|2|2
Crows|Squawking Oratory|Action|6|Draw 1|–|Draw 1|4 Power|2|2
Hlaalu|Goods Shipment|Action|0|1 Coin|–|–|–|1|1
Hlaalu|Ebony Mine|Contract Action|3|2 Coin|–|4 Coin|–|0|2
Hlaalu|Kwama Egg Mine|Contract Action|3|2 Coin|–|3 Coin|–|3|1
Hlaalu|Hlaalu Councilor|Agent: 2HP|10|Acquire 9|Replace 1|–|–|0|1
Hlaalu|Hlaalu Kinsman|Agent: 1HP|10|Acquire 9|Replace 1|–|–|2|1
Hlaalu|House Embassy|Action|8|7 Coin|Acquire 7|–|–|0|1
Hlaalu|House Marketplace|Action|8|6 Coin|Acquire 7|–|–|2|1
Hlaalu|Oathman|Agent: 2HP|6|2 Coin|Acquire 6|–|–|0|2
Hlaalu|Hireling|Agent: 2HP|6|2 Coin|Acquire 5|–|–|3|1
Hlaalu|Currency Exchange|Action|7|Replace 1 AND 5 Coin|Patron 1|–|–|2|2
Hlaalu|Customs Seizure|Action|4|Acquire 5|–|–|–|3|3
Hlaalu|Hostile Takeover|Action|5|1 Power|Acquire 7|–|–|2|2
Hlaalu|Luxury Exports|Action|2|3 Coin|–|–|–|3|3
Mora|Unsealed Glyphic|Action|0|1 Power|–|1 Coin|–|1|1
Mora|Chromatic Reservoir|Action|6|4 Power AND Setback Draw 1|2 Power|2 Power|4 Power|0|1
Mora|Unsettling Aura|Action|6|4 Power AND Setback Draw 1|2 Power|2 Power|3 Power|2|1
Mora|Lantern of the Endless|Action|4|2 Power AND 1 Coin AND Setback 2 Coin|2 Power|2 Power|–|0|3
Mora|Apocryphal Pact|Action|4|2 Power AND 1 Coin AND Setback 2 Coin|2 Power|1 Power|–|4|1
Mora|Seeker Aspirant|Contract Agent: 2 HP|5|Destroy 1 AND Setback 3 Coin|3 Power|–|–|0|1
Mora|Cipher of the Eye|Contract Agent: 2 HP|5|Destroy 1 AND Setback 3 Coin|2 Power|–|–|2|1
Mora|Unfathomable Secrets|Contract Action|4|5 Power AND Setback Draw 1|2 Coin|2 Coin|–|0|2
Mora|Bargain for Knowledge|Contract Action|4|5 Power AND Setback Draw 1|1 Coin|2 Coin|–|3|1
Mora|Ink and Blood|Action|2|2 Coin AND Setback 1 Power|2 Power AND 1 Coin|–|–|3|3
Mora|Threads of Fate|Contract Action|2|2 Power AND Setback 1 Coin|1 Power|1 Coin|–|3|3
Mora|Voracious Tomeshell|Action|3|Destroy 2 AND Setback Draw 1|3 Power|–|–|3|3
Celarus|Mainland Inquiries|Action|0|1 Coin|–|–|–|1|1
Celarus|Augur's Counsel|Contract Action|3|Toss 3|2 Power|–|–|0|2
Celarus|Sage Counsel|Contract Action|3|Toss 3|1 Power|–|–|3|1
Celarus|Ceporah's Insight|Action|5|2 Coin AND Toss 4|3 Power|–|–|0|1
Celarus|Psijic's Insight|Action|5|2 Coin AND Toss 4|2 Power|–|–|2|1
Celarus|Prophesy|Action|4|3 Coin AND Replace 2|–|–|–|0|2
Celarus|Prescience|Action|4|3 Coin AND Replace 1|–|–|–|3|1
Celarus|Psijic Relicmaster|Agent: 3HP|6|1 Coin AND Toss 4|–|–|–|0|1
Celarus|Psijic Apprentice|Agent: 3HP|6|Toss 4|–|–|–|2|1
Celarus|Scrying Globe|Action|2|2 Coin AND Toss 2|–|–|–|4|4
Celarus|The Dreaming Cave|Action|6|Draw 1 AND Toss 4|2 Power|–|–|3|3
Celarus|Time Mastery|Action|3|Toss 5|2 Coin|–|–|3|3
Rajhin|Swipe|Action|0|1 Coin|–|–|–|1|1
Rajhin|Grand Larceny|Action|5|4 Coin|Knock Out 1 AND -1 Prestige|–|–|0|2
Rajhin|Pounce and Profit|Action|5|4 Coin|Knock Out 1|–|–|3|1
Rajhin|Prowling Shadow|Agent: 1HP|4|2 Coin|-1 Prestige|–|–|0|2
Rajhin|Jeering Shadow|Agent: 1HP|4|1 Coin|-1 Prestige|–|–|3|1
Rajhin|Ring's Guile|Contract Action|7|Discard 1|Draw 1|Discard 1 AND Draw 1|–|0|1
Rajhin|Bag of Tricks|Contract Action|7|Discard 1|Draw 1|Discard 1|–|2|1
Rajhin|Shadow's Slumber|Action|7|Knock Out 2 AND 2 Coin|3 Coin|Discard 1|–|0|1
Rajhin|Jarring Lullaby|Action|7|Knock Out 2 AND 2 Coin|2 Coin|Discard 1|–|2|1
Rajhin|Moonlit Illusion|Contract Action|3|Destroy 1|–|-1 Prestige|–|3|3
Rajhin|Slight of Hand|Action|2|2 Coin|Replace 1|–|–|3|3
Rajhin|Stubborn Shadow|Agent: 3HP+Taunt|6|–|-2 Prestige|–|–|3|3
Rajhin|Twilight Revelry|Action|10|Discard 1|Replace 3|-3 Prestige|Draw 3|1|1
Red Eagle|War Song|Action|0|1 Power|–|–|–|1|1
Red Eagle|Blood Sacrifice|Contract Action|6|Destroy 1 AND 3 Power|Draw 1|–|–|0|1
Red Eagle|Bloody Offering|Contract Action|6|Destroy 1 AND 2 Power|Draw 1|–|–|2|1
Red Eagle|Elder Witch|Contract Agent: 3HP|6|Destroy 1|Replace 1|–|–|0|2
Red Eagle|Clan-Witch|Contract Agent: 3HP|6|Destroy 1|–|–|–|3|1
Red Eagle|Hagraven Matron|Agent: 3HP|9|Destroy 1|3 Power|–|–|0|1
Red Eagle|Hagraven|Agent: 3HP|9|Destroy 1|1 Power|–|–|2|1
Red Eagle|Imperial Plunder|Contract Action|3|Replace 2|2 Coin|–|–|0|2
Red Eagle|Imperial Spoils|Contract Action|3|Replace 2|1 Coin|–|–|3|1
Red Eagle|Bonfire|Contract Action|3|Destroy 1|–|–|–|3|3
Red Eagle|Briarheart Ritual|Contract Action|5|1 Power AND Destroy 2|–|–|–|2|2
Red Eagle|Karth Man-Hunter|Contract Agent: 2HP|5|1 Power|Destroy 1|–|–|2|2
Red Eagle|Midnight Raid|Action|4|3 Power|2 Power|–|–|3|3
Alessia|Alessian Rebel|Agent|0|–|1 Coin|–|–|1|1
Alessia|Ayleid Quartermaster|Contract Agent: 1HP|5|Draw 1 OR Knock Out All|–|2 Prestige|–|0|2
Alessia|Ayleid Defector|Contract Agent: 1HP|5|Draw 1 OR Knock Out All|–|1 Prestige|–|3|1
Alessia|Chainbreaker Captain|Agent|4|3 Coin OR 2 Power|–|1 Prestige|–|0|2
Alessia|Chainbreaker Sergeant|Agent|4|3 Coin OR 2 Power|–|–|–|3|1
Alessia|Morihaus, Sacred Bull|Agent|5|Knock Out 1 AND 1 Coin/AgentKnocked|–|3 Prestige|–|0|2
Alessia|Morihaus, the Archer|Agent|5|Knock Out 1 AND 1 Coin/AgentKnocked|–|2 Prestige|–|3|1
Alessia|Whitestrake Ascendant|Agent|7|Knock Out 2 OR Draw Refresh 4 Agents|–|4 Prestige|–|0|1
Alessia|Pelinal Whitestrake|Agent|7|Knock Out 2 OR Draw Refresh 4 Agents|–|3 Prestige|–|2|1
Alessia|Priestess of the Eight|Agent|5|Replace 1 OR Donate 2|1 Prestige|–|–|3|3
Alessia|Saint's Wrath|Action|4|Knock Out All OR Draw Refresh 3|–|–|–|3|3
Alessia|Soldier of the Empire|Agent|3|2 Coin OR 1 Power|–|–|–|3|3
Pelin|Fortify|Action|0|1 Power|–|–|–|1|1
Pelin|Knight Commander|Agent: 5HP+Taunt|9|3 Power|Heal 2|–|–|0|1
Pelin|Banneret|Agent: 5HP+Taunt|9|3 Power|–|–|–|2|1
Pelin|Knights of Saint Pelin|Agent: 4HP+Taunt|7|1 Coin AND 1 Power|1 Power|–|–|0|1
Pelin|Bangkorai Sentries|Agent: 4HP+Taunt|7|1 Coin AND 1 Power|–|–|–|2|1
Pelin|Legion's Arrival|Action|3|2 Coin|3 Power|–|–|0|2
Pelin|Reinforcements|Action|3|2 Coin|2 Power|1 Power|–|3|1
Pelin|Siege Weapon Volley|Action|4|4 Power|1 Coin|–|–|0|2
Pelin|Archer's Volley|Action|4|3 Power|1 Coin|–|–|4|2
Pelin|Rally|Action|8|5 Power|Draw 1 AND 1 Power|–|–|2|2
Pelin|Shield Bearer|Contract Agent: 5HP+Taunt|6|1 Power|–|–|–|2|2
Pelin|The Armory|Action|6|5 Power|1 Coin|–|–|2|2
Pelin|The Portcullis|Action|2|2 Power|1 Coin|–|–|3|3
Orgnum|Sea Elf Raid|Action|0|1 Coin|–|1 Power|–|1|1
Orgnum|Pyandonean War Fleet|Action|3|2 Power|–|3 Power|–|0|2
Orgnum|Serpentprow Schooner|Action|3|2 Power|–|2 Power|–|3|1
Orgnum|Sea Serpent Colossus|Action|2|1 Coin AND 1 Prestige|2 Power|–|–|0|2
Orgnum|Ghostscale Sea Serpent|Action|2|1 Coin AND 1 Prestige|1 Power|–|–|3|1
Orgnum|Serpentguard Rider|Agent: 2HP|5|2 Power|1 Power AND Replace 1|–|–|0|2
Orgnum|Storm Shark Wavecaller|Agent: 2HP|5|2 Power|Replace 1|–|–|3|1
Orgnum|Summerset Sacking|Action|2|1 Prestige|1 Prestige|1 Coin|–|0|2
Orgnum|Maormer Boarding Party|Action|2|1 Prestige|1 Prestige|–|–|3|1
Orgnum|King Orgnum's Command|Contract Action|2|Patron 1|–|–|–|2|2
Orgnum|Maormer Cutter|Contract Action|2|1 Power|1 Power|2 Power|–|2|2
Orgnum|Sea Raider's Glory|Contract Action|2|1 Prestige|–|3 Prestige|–|2|2
Orgnum|Snakeskin Freebooter|Agent: 3HP|5|1 Coin|Sacking 1|–|–|2|2
Druid King|Ritual Herbs|Action|0|1 Coin|–|–|–|1|1
Druid King|Draoife Ritecaller|Agent: 3HP|6|1 Coin/Cooldown|Wispheart 1|–|–|0|1
Druid King|Eldertide Fenwitch|Agent: 3HP|6|1 Coin/Cooldown|Wispcaller 1|–|–|2|1
Druid King|Druid King Vestments|Action|2|2 Coin AND 1 Power/Cooldown|–|–|–|0|2
Druid King|Runes of the Draoife|Action|2|2 Coin AND 1 Power/AgentCooldown|–|–|–|3|1
Druid King|Envoy of the Draoife|Agent: 3HP|5|1 Power AND 1 Coin/Agent|–|–|–|0|2
Druid King|Stonelore Rockseer|Agent: 2HP|5|1 Power AND 1 Coin/Agent|–|–|–|3|1
Druid King|Wispheart Totem|Action|3|1 Coin|2 Coin|2 Coin|3 Coin|0|2
Druid King|Wispcaller Totem|Action|3|1 Coin|2 Coin|2 Coin|–|3|1
Druid King|Deepwoods Ritual|Action|4|2 Power|Replace 1|3 Prestige|–|2|2
Druid King|Firesong Haruspex|Agent: 2HP|5|1 Prestige AND 1 Coin AND 1 Prestige/AgentCooldown|–|–|–|3|3
Druid King|Forest Wraith|Contract Agent: 3HP|4|1 Power AND 1 Power/Cooldown|–|–|–|2|2
Druid King|The Chimera|Agent: 5HP+Taunt|0|–|Replace 1|2 Power|3 Prestige|0|0
Druid King|Whispers of the Grove|Contract Action|2|Replace 1|–|2 Coin|–|2|2
Neutral|Gold|Action|0|1 Coin|–|–|–|6|6
Neutral|Ambush|Contract Action|3|Knock Out 2|–|–|–|1|1
Neutral|Barterer|Contract Action|1|Replace 1|–|–|–|4|4
Neutral|Black Sacrament|Contract Action|2|Knock Out 1|–|–|–|3|3
Neutral|Blackmail|Contract Action|3|2 Power|–|–|–|2|2
Neutral|Harvest Season|Contract Action|2|Draw 1|–|–|–|3|3
Neutral|Imprisonment|Contract Action|5|4 Power|–|–|–|3|3
Neutral|Ragpicker|Contract Action|3|Destroy 1|–|–|–|2|2
Neutral|Tithe|Contract Action|3|Patron 1|–|–|–|2|2
"""

# Extra tokens not in main table
EXTRA = [
    {"patron": "treasury", "name": "Writ of Coin", "type": "Action", "cost": 0, "play": "2 Coin",
     "combo2": None, "combo3": None, "combo4": None, "baseQty": 0, "upgradedQty": 0, "token": True},
    {"patron": "rajhin", "name": "Bewilderment", "type": "Action", "cost": 0, "play": "–",
     "combo2": None, "combo3": None, "combo4": None, "baseQty": 0, "upgradedQty": 0, "token": True, "curse": True},
]

def slug(name):
    s = name.lower()
    s = re.sub(r"[''']", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def parse_type(t):
    t = t.strip()
    is_contract = "Contract" in t
    is_agent = "Agent" in t
    hp = None
    taunt = "Taunt" in t or "+Taunt" in t
    m = re.search(r"(\d+)\s*HP", t, re.I)
    if m:
        hp = int(m.group(1))
    if is_agent and hp is None:
        # Alessia agents often lack HP in table — default 2 unless known
        hp = 2
    card_type = "agent" if is_agent else "action"
    return {
        "type": card_type,
        "contract": is_contract,
        "hp": hp,
        "taunt": taunt,
    }

def parse_effect_text(text):
    if not text or text.strip() in ("–", "-", "—", ""):
        return []
    text = text.strip()
    effects = []
    # Choice: Choose: A OR B  or  A OR B
    if text.startswith("Choose:") or " OR " in text:
        parts = text
        if parts.startswith("Choose:"):
            parts = parts[7:].strip()
        opts = [p.strip() for p in re.split(r"\s+OR\s+", parts)]
        if len(opts) >= 2:
            return [{"op": "choose", "options": [parse_effect_text(o) for o in opts]}]
    # Split AND
    chunks = re.split(r"\s+AND\s+", text)
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk or chunk in ("–", "-"):
            continue
        e = parse_atom(chunk)
        if e:
            if isinstance(e, list):
                effects.extend(e)
            else:
                effects.append(e)
    return effects

def parse_atom(chunk):
    chunk = chunk.strip()
    # N Coin
    m = re.match(r"^(\d+)\s+Coin$", chunk, re.I)
    if m: return {"op": "coin", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Power$", chunk, re.I)
    if m: return {"op": "power", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Prestige$", chunk, re.I)
    if m: return {"op": "prestige", "n": int(m.group(1))}
    m = re.match(r"^-(\d+)\s+Prestige$", chunk, re.I)
    if m: return {"op": "opp_prestige", "n": -int(m.group(1))}
    m = re.match(r"^Draw\s+(\d+)$", chunk, re.I)
    if m: return {"op": "draw", "n": int(m.group(1))}
    m = re.match(r"^Discard\s+(\d+)$", chunk, re.I)
    if m: return {"op": "discard", "n": int(m.group(1))}
    m = re.match(r"^Donate\s+(\d+)$", chunk, re.I)
    if m: return {"op": "donate", "n": int(m.group(1))}
    m = re.match(r"^Donate\s+(\d+)\s+and\s+Confine\s+(\d+)$", chunk, re.I)
    if m: return [{"op": "donate", "n": int(m.group(1))}, {"op": "confine", "n": int(m.group(2))}]
    m = re.match(r"^Confine\s+(\d+)$", chunk, re.I)
    if m: return {"op": "confine", "n": int(m.group(1))}
    m = re.match(r"^Toss\s+(\d+)$", chunk, re.I)
    if m: return {"op": "toss", "n": int(m.group(1))}
    m = re.match(r"^Destroy\s+(\d+)$", chunk, re.I)
    if m: return {"op": "destroy", "n": int(m.group(1))}
    m = re.match(r"^Replace\s+(\d+)$", chunk, re.I)
    if m: return {"op": "replace", "n": int(m.group(1))}
    m = re.match(r"^Acquire\s+(\d+)$", chunk, re.I)
    if m: return {"op": "acquire", "n": int(m.group(1))}
    m = re.match(r"^Patron\s+(\d+)$", chunk, re.I)
    if m: return {"op": "patron_extra", "n": int(m.group(1))}
    m = re.match(r"^Knock Out\s+(\d+)$", chunk, re.I)
    if m: return {"op": "knockout", "n": int(m.group(1))}
    m = re.match(r"^Knock Out All$", chunk, re.I)
    if m: return {"op": "knockout_all"}
    m = re.match(r"^Heal\s+(\d+)$", chunk, re.I)
    if m: return {"op": "heal", "n": int(m.group(1))}
    m = re.match(r"^Sacking\s+(\d+)$", chunk, re.I)
    if m: return {"op": "sacking", "n": int(m.group(1))}
    m = re.match(r"^Hand Refresh\s+(\d+)$", chunk, re.I)
    if m: return {"op": "hand_refresh", "n": int(m.group(1))}
    m = re.match(r"^Draw Refresh\s+(\d+)$", chunk, re.I)
    if m: return {"op": "draw_refresh", "n": int(m.group(1))}
    m = re.match(r"^Draw Refresh\s+(\d+)\s+Agents$", chunk, re.I)
    if m: return {"op": "draw_refresh_agents", "n": int(m.group(1))}
    m = re.match(r"^Setback Draw\s+(\d+)$", chunk, re.I)
    if m: return {"op": "setback_draw", "n": int(m.group(1))}
    m = re.match(r"^Setback\s+(\d+)\s+Coin$", chunk, re.I)
    if m: return {"op": "setback_coin", "n": int(m.group(1))}
    m = re.match(r"^Setback\s+(\d+)\s+Power$", chunk, re.I)
    if m: return {"op": "setback_power", "n": int(m.group(1))}
    m = re.match(r"^Wispheart\s+(\d+)$", chunk, re.I)
    if m: return {"op": "create", "card": "Wispheart Totem", "n": int(m.group(1))}
    m = re.match(r"^Wispcaller\s+(\d+)$", chunk, re.I)
    if m: return {"op": "create", "card": "Wispcaller Totem", "n": int(m.group(1))}
    # Passive / while-in-play style
    m = re.match(r"^(\d+)\s+Coin/Cooldown$", chunk, re.I)
    if m: return {"op": "passive", "trigger": "cooldown", "resource": "coin", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Power/Cooldown$", chunk, re.I)
    if m: return {"op": "passive", "trigger": "cooldown", "resource": "power", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Power/AgentCooldown$", chunk, re.I)
    if m: return {"op": "passive", "trigger": "agent_cooldown", "resource": "power", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Prestige/AgentCooldown$", chunk, re.I)
    if m: return {"op": "passive", "trigger": "agent_cooldown", "resource": "prestige", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Coin/Agent$", chunk, re.I)
    if m: return {"op": "passive", "trigger": "agent_play", "resource": "coin", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Power/Discard$", chunk, re.I)
    if m: return {"op": "passive", "trigger": "discard", "resource": "power", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Prestige/Discard$", chunk, re.I)
    if m: return {"op": "passive", "trigger": "discard", "resource": "prestige", "n": int(m.group(1))}
    m = re.match(r"^(\d+)\s+Coin/AgentKnocked$", chunk, re.I)
    if m: return {"op": "coin_per_knock", "n": int(m.group(1))}
    m = re.match(r"^Knock Out\s+(\d+)\s+AND\s+(\d+)\s+Coin/AgentKnocked$", chunk, re.I)
    if m: return [{"op": "knockout", "n": int(m.group(1)), "coinPerKnock": int(m.group(2))}]
    m = re.match(r"^(\d+)\s+Power AND Hand Refresh\s+(\d+)$", chunk, re.I)
    if m: return [{"op": "power", "n": int(m.group(1))}, {"op": "hand_refresh", "n": int(m.group(2))}]
    # Compound leftovers like "1 Power AND 1 Coin AND 1 Prestige/AgentCooldown"
    if " AND " in chunk:
        return parse_effect_text(chunk)
    # Fallback: store raw
    return {"op": "raw", "text": chunk}

def dash(s):
    if not s or s.strip() in ("–", "-", "—", ""):
        return None
    return s.strip()

cards = []
seen = set()
for line in RAW.strip().split("\n"):
    if not line.strip():
        continue
    parts = line.split("|")
    patron_name, name, typ, cost, play, c2, c3, c4, bq, uq = parts
    pid = PATRON_MAP[patron_name]
    info = parse_type(typ)
    cid = slug(name)
    # Handle upgraded vs base: if upgraded qty > 0 and differs from base name pair,
    # we store one entry with both qtys; "upgraded" flag marks preferred version
    # For cards that are upgrades of others, both appear as separate rows already.
    card = {
        "id": cid,
        "name": name,
        "patron": pid,
        "type": info["type"],
        "contract": info["contract"],
        "cost": int(cost),
        "hp": info["hp"],
        "taunt": info["taunt"],
        "playText": dash(play) or "",
        "combo2Text": dash(c2),
        "combo3Text": dash(c3),
        "combo4Text": dash(c4),
        "play": parse_effect_text(play),
        "combo2": parse_effect_text(c2) if dash(c2) else [],
        "combo3": parse_effect_text(c3) if dash(c3) else [],
        "combo4": parse_effect_text(c4) if dash(c4) else [],
        "baseQty": int(bq),
        "upgradedQty": int(uq),
        "upgraded": int(uq) > 0 and (int(bq) == 0 or name in (
            # cards that are upgrades (0 base) or shared qty
        )),
        "starter": int(cost) == 0 and name == PATRONS[pid].get("starter"),
        "token": False,
    }
    # Mark as upgraded version if baseQty==0 and upgradedQty>0 (replacement upgrade)
    # or if it's the upgraded form. Keep both forms; match uses upgradedQty.
    if card["baseQty"] == 0 and card["upgradedQty"] > 0:
        card["upgraded"] = True
    elif card["upgradedQty"] > 0 and card["baseQty"] > 0:
        card["upgraded"] = True  # same card exists in both; use upgraded qty in matches
    else:
        card["upgraded"] = card["upgradedQty"] > 0
    cards.append(card)
    seen.add(cid)

for e in EXTRA:
    cid = slug(e["name"])
    cards.append({
        "id": cid,
        "name": e["name"],
        "patron": e["patron"],
        "type": "action",
        "contract": False,
        "cost": e["cost"],
        "hp": None,
        "taunt": False,
        "playText": e["play"] if e["play"] != "–" else "",
        "combo2Text": None,
        "combo3Text": None,
        "combo4Text": None,
        "play": parse_effect_text(e["play"]),
        "combo2": [],
        "combo3": [],
        "combo4": [],
        "baseQty": e["baseQty"],
        "upgradedQty": e["upgradedQty"],
        "upgraded": True,
        "starter": False,
        "token": e.get("token", False),
        "curse": e.get("curse", False),
    })

# Patron abilities
patron_abilities = {
    "treasury": {
        "favored": None, "neutral": {"cost": {"coin": 2}, "effect": "sacrifice_for_writ", "desc": "Pay 2 Coin, sacrifice a played card, create Writ of Coin in cooldown."},
        "unfavored": None, "lockFavored": False, "alwaysNeutral": True,
    },
    "pelin": {
        "favored": {"cost": {"power": 2}, "effect": "agent_to_draw", "desc": "Pay 2 Power: move an Agent from cooldown to top of draw."},
        "neutral": {"cost": {"power": 2}, "effect": "agent_to_draw", "desc": "Pay 2 Power: move an Agent from cooldown to top of draw."},
        "unfavored": {"cost": {"power": 2}, "effect": "agent_to_draw", "desc": "Pay 2 Power: move an Agent from cooldown to top of draw."},
        "lockFavored": False,
    },
    "hlaalu": {
        "favored": {"cost": {}, "effect": "sacrifice_prestige", "desc": "Sacrifice a card: gain Prestige = cost − 1."},
        "neutral": {"cost": {}, "effect": "sacrifice_prestige", "desc": "Sacrifice a card: gain Prestige = cost − 1."},
        "unfavored": {"cost": {}, "effect": "sacrifice_prestige", "desc": "Sacrifice a card: gain Prestige = cost − 1."},
        "lockFavored": False,
    },
    "crows": {
        "favored": None,
        "neutral": {"cost": {}, "effect": "coin_to_power", "desc": "Sacrifice all Coin, gain Power = Coin − 1."},
        "unfavored": {"cost": {}, "effect": "coin_to_power", "desc": "Sacrifice all Coin, gain Power = Coin − 1."},
        "lockFavored": True,
    },
    "celarus": {
        "favored": {"cost": {"coin": 4}, "effect": "knockout_agent", "desc": "Pay 4 Coin: knock out an opponent agent."},
        "neutral": {"cost": {"coin": 4}, "effect": "knockout_agent", "desc": "Pay 4 Coin: knock out an opponent agent."},
        "unfavored": {"cost": {"coin": 4}, "effect": "knockout_agent", "desc": "Pay 4 Coin: knock out an opponent agent."},
        "lockFavored": False,
    },
    "hunding": {
        "favored": {"passive": "start_coin", "n": 1, "desc": "Can't be used. Gain 1 Coin at start of each turn."},
        "neutral": {"cost": {"power": 2}, "effect": "gain_coin", "n": 1, "desc": "Pay 2 Power, gain 1 Coin."},
        "unfavored": {"cost": {"power": 2}, "effect": "gain_coin_favor", "n": 1, "desc": "Pay 2 Power, gain 1 Coin, flip to Favored."},
        "lockFavored": True, "flipUnfavoredToFavored": True,
    },
    "redeagle": {
        "favored": {"cost": {"power": 2}, "effect": "draw", "n": 1, "desc": "Pay 2 Power, Draw 1."},
        "neutral": {"cost": {"power": 2}, "effect": "draw", "n": 1, "desc": "Pay 2 Power, Draw 1."},
        "unfavored": {"cost": {"power": 2}, "effect": "draw", "n": 1, "desc": "Pay 2 Power, Draw 1."},
        "lockFavored": False,
    },
    "orgnum": {
        "favored": {"cost": {"coin": 3}, "effect": "orgnum_favored", "desc": "Pay 3 Coin: +1 Power per 4 cards owned; create Summerset Sacking."},
        "neutral": {"cost": {"coin": 2}, "effect": "orgnum_neutral", "desc": "Pay 2 Coin: +1 Power per 6 cards owned."},
        "unfavored": {"cost": {"coin": 1}, "effect": "power", "n": 2, "desc": "Pay 1 Coin, gain 2 Power."},
        "lockFavored": False,
    },
    "rajhin": {
        "favored": {"cost": {"coin": 3}, "effect": "bewilderment", "desc": "Pay 3 Coin: create Bewilderment for opponent."},
        "neutral": {"cost": {"coin": 3}, "effect": "bewilderment", "desc": "Pay 3 Coin: create Bewilderment for opponent."},
        "unfavored": {"cost": {"coin": 3}, "effect": "bewilderment", "desc": "Pay 3 Coin: create Bewilderment for opponent."},
        "lockFavored": False,
    },
    "druid": {
        "favored": {"cost": {"power": 2}, "effect": "tavern_remove", "n": 2, "chimeraCombo": 4, "desc": "Pay 2 Power: remove up to 2 tavern cards. Combo 4 → Chimera."},
        "neutral": {"cost": {"power": 2}, "effect": "tavern_remove", "n": 2, "chimeraCombo": 5, "desc": "Pay 2 Power: remove up to 2 tavern cards. Combo 5 → Chimera."},
        "unfavored": {"cost": {"power": 2}, "effect": "tavern_remove", "n": 2, "desc": "Pay 2 Power: remove up to 2 tavern cards."},
        "lockFavored": False,
    },
    "almalexia": {
        "favored": {"cost": {"coin": 1, "discard": 1}, "effect": "look_confine", "n": 5, "desc": "Pay 1 Coin + discard: look at top 5 of opp draw, move 1 to cooldown."},
        "neutral": {"cost": {"discard": 1}, "effect": "look_confine", "n": 4, "desc": "Discard: look at top 4 of opp draw, move 1 to cooldown."},
        "unfavored": {"cost": {"coin": 1}, "effect": "look_confine", "n": 3, "desc": "Pay 1 Coin: look at top 3 of opp draw, move 1 to cooldown."},
        "lockFavored": False,
    },
    "mora": {
        "favored": {"cost": {"power": 3}, "effect": "mora_share", "desc": "Pay 3 Power: put a tavern Action into both cooldowns."},
        "neutral": {"cost": {"power": 3}, "effect": "mora_share", "desc": "Pay 3 Power: put a tavern Action into both cooldowns."},
        "unfavored": {"cost": {"power": 2}, "effect": "mora_share", "desc": "Pay 2 Power: put a tavern Action into both cooldowns."},
        "lockFavored": False,
    },
    "alessia": {
        "favored": {"cost": {"coin": 4}, "effect": "create_agent", "card": "Chainbreaker Sergeant", "desc": "Pay 4 Coin: create Chainbreaker Sergeant in cooldown."},
        "neutral": {"cost": {"coin": 4}, "effect": "create_agent", "card": "Soldier of the Empire", "desc": "Pay 4 Coin: create Soldier of the Empire in cooldown."},
        "unfavored": {"cost": {"coin": 3}, "effect": "power", "n": 2, "desc": "Pay 3 Coin, gain 2 Power."},
        "lockFavored": False,
    },
}

patrons_out = []
for pid, p in PATRONS.items():
    ab = patron_abilities[pid]
    p = dict(p)
    if p.get("starter"):
        p["starter"] = slug(p["starter"])
    patrons_out.append({
        **p,
        "abilities": ab,
        "image": f"patrons/{pid}.png",
    })

decks_out = []
for pid, p in PATRONS.items():
    if pid == "treasury":
        deck_cards = [c["id"] for c in cards if c["patron"] == "treasury" and not c.get("token")]
    else:
        deck_cards = [c["id"] for c in cards if c["patron"] == pid and not c.get("token") and not c.get("curse")]
    decks_out.append({
        "id": pid,
        "name": p["name"],
        "short": p["short"],
        "starter": slug(p["starter"]) if p.get("starter") else None,
        "cards": deck_cards,
        "color": p["color"],
    })

# Art filename hints
for c in cards:
    c["art"] = f"cards/{c['id']}.png"

DATA.mkdir(parents=True, exist_ok=True)
with open(DATA / "cards.json", "w") as f:
    json.dump({"cards": cards, "version": 1, "source": "spicyeconomics.com/tribute"}, f, indent=2)
with open(DATA / "patrons.json", "w") as f:
    json.dump({"patrons": patrons_out}, f, indent=2)
with open(DATA / "decks.json", "w") as f:
    json.dump({"decks": decks_out}, f, indent=2)

print(f"Wrote {len(cards)} cards, {len(patrons_out)} patrons, {len(decks_out)} decks")
# stats
agents = sum(1 for c in cards if c["type"]=="agent")
contracts = sum(1 for c in cards if c["contract"])
print(f"Agents: {agents}, Contracts: {contracts}")
