#!/usr/bin/env python3
"""Download Tales of Tribute art from UESP images API cache."""
import json, os, re, urllib.request, ssl
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path("/workspace/tots")
CARDS_DIR = ROOT / "web" / "assets" / "cards"
PATRONS_DIR = ROOT / "web" / "assets" / "patrons"
CARDS_DIR.mkdir(parents=True, exist_ok=True)
PATRONS_DIR.mkdir(parents=True, exist_ok=True)

with open(ROOT / "data" / "uesp-images.json") as f:
    uesp = json.load(f)
images = uesp["query"]["allimages"]

with open(ROOT / "data" / "cards.json") as f:
    cards = json.load(f)["cards"]

def norm(s):
    s = s.lower()
    s = s.replace("%27", "'").replace("%2c", ",")
    s = re.sub(r"[''`]", "", s)
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s

# Build lookup: normalized card name -> list of (priority, url, filename)
# Prefer ON-tribute-card-NAME, then patron-prefixed, skip crops/alternates/squares
by_name = {}
for img in images:
    name = img["name"]  # e.g. ON-tribute-card-Gold.png
    if "(crop" in name.lower() or "alternate" in name.lower() or "(square)" in name.lower() or "(cropped)" in name.lower():
        continue
    url = img["url"]
    # Extract the card/patron part
    m = re.match(r"ON-tribute-(?:card|patron|neutral|blackfeather|hlaalu|hunding|pelin|psijic|rajhin|reach|orgnum|druid|alessia|almalexia|mora)-(.+)\.png$", name, re.I)
    if not m:
        # also ON-tribute-patron-X
        continue
    card_part = m.group(1)
    # Fix known naming quirks
    card_part = card_part.replace("_", " ")
    key = norm(card_part)
    priority = 0
    if name.lower().startswith("on-tribute-card-"):
        priority = 10
    elif name.lower().startswith("on-tribute-patron-"):
        priority = 20
    elif name.lower().startswith("on-tribute-neutral-"):
        priority = 8
    else:
        priority = 5
    by_name.setdefault(key, []).append((priority, url, name))

# Manual alias map for mismatched names
ALIASES = {
    "archersvolley": ["archersvolley", "archersvolley"],
    "slightofhand": ["slightofhand", "sleightofhand"],
    "prophesy": ["prophesy", "prophecy"],
    "fortify": ["fortify", "fortifybrace"],
    "knightcommander": ["knightcommander", "knightscommander"],
    "knightsofsaintpelin": ["knightsofsaintpelin", "knightsofstpelin"],
    "theportcullis": ["theportcullis", "porticullis"],
    "shadowsslumber": ["shadowsslumber", "spellboundslumber"],
    "bloodysacrifice": ["bloodsacrifice"],
}

# Patron image mapping
PATRON_ART = {
    "treasury": ["theneutral", "neutral", "thetreasury"],
    "pelin": ["saintpelin"],
    "hlaalu": ["househlaalu"],
    "crows": ["blackfeathercourt"],
    "celarus": ["psiijic", "psijic"],
    "hunding": ["anseifrandarhunding"],
    "redeagle": ["redeagle"],
    "orgnum": ["orgnum"],
    "rajhin": ["rajhin"],
    "druid": ["druidking"],
    "almalexia": ["almalexia"],
    "mora": ["hermaeusmora"],
    "alessia": ["saintalessia"],
}

def find_url(keys):
    best = None
    for k in keys:
        k = norm(k)
        for cand_key, entries in by_name.items():
            if cand_key == k or k in cand_key or cand_key in k:
                for e in entries:
                    if best is None or e[0] > best[0]:
                        best = e
    return best

ctx = ssl.create_default_context()

def download(url, dest):
    if dest.exists() and dest.stat().st_size > 1000:
        return "skip"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TalesOfTributeFanProject/1.0 (educational)"})
        with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
            data = r.read()
        dest.write_bytes(data)
        return "ok"
    except Exception as ex:
        return f"err:{ex}"

tasks = []

# Cards
for c in cards:
    keys = [c["name"], c["id"].replace("-", "")]
    nk = norm(c["name"])
    if nk in ALIASES:
        keys.extend(ALIASES[nk])
    # also try without "the "
    keys.append(c["name"].replace("The ", ""))
    found = find_url(keys)
    dest = CARDS_DIR / f"{c['id']}.png"
    if found:
        tasks.append((found[1], dest, c["name"]))
    else:
        # search fuzzy in by_name
        for k, ents in by_name.items():
            if nk in k or k in nk:
                tasks.append((ents[0][1], dest, c["name"]))
                found = ents[0]
                break
        if not found:
            print(f"MISSING art for: {c['name']} ({c['id']})")

# Also download The Treasury as card art if needed
# Patrons
for pid, aliases in PATRON_ART.items():
    dest = PATRONS_DIR / f"{pid}.png"
    found = None
    for a in aliases:
        # look for patron images
        for img in images:
            n = img["name"].lower()
            if "patron" in n and norm(a) in norm(n.replace("on-tribute-patron-", "").replace(".png","")):
                found = img["url"]
                break
            if pid == "treasury" and "the_treasury" in n:
                found = img["url"]
                break
        if found:
            break
    if not found and pid == "treasury":
        # use neutral patron or treasury card
        for img in images:
            if "The_Treasury" in img["name"] or "patron-Neutral" in img["name"]:
                found = img["url"]
                break
    if found:
        tasks.append((found, dest, pid))
    else:
        print(f"MISSING patron: {pid}")

# Also get Writ of Coin, Bewilderment, Gold, Chimera explicitly from card- prefix
print(f"Downloading {len(tasks)} images...")

ok = skip = err = 0
with ThreadPoolExecutor(max_workers=12) as ex:
    futs = {ex.submit(download, url, dest): (url, dest, label) for url, dest, label in tasks}
    for fut in as_completed(futs):
        r = fut.result()
        if r == "ok":
            ok += 1
        elif r == "skip":
            skip += 1
        else:
            err += 1
            url, dest, label = futs[fut]
            print(f"FAIL {label}: {r}")

print(f"Done: ok={ok} skip={skip} err={err}")
print(f"Cards dir: {len(list(CARDS_DIR.glob('*.png')))} files")
print(f"Patrons dir: {len(list(PATRONS_DIR.glob('*.png')))} files")

# Report missing card arts
missing = []
for c in cards:
    if not (CARDS_DIR / f"{c['id']}.png").exists():
        missing.append(c["name"])
print(f"Still missing {len(missing)} card images: {missing[:20]}")
