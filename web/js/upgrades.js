/** Auto-generated upgrade pairs: upgradeId -> baseId */
export const UPGRADE_TO_BASE = {
  "ayleid-quartermaster": "ayleid-defector",
  "chainbreaker-captain": "chainbreaker-sergeant",
  "morihaus-sacred-bull": "morihaus-the-archer",
  "whitestrake-ascendant": "pelinal-whitestrake",
  "almsivis-charity": "mothers-mercy",
  "festival-of-forbearance": "bardic-veneration",
  "hand-of-almalexia": "devotional-gaoler",
  "mercymother-elite": "tribunal-sentinel",
  "augurs-counsel": "sage-counsel",
  "ceporahs-insight": "psijics-insight",
  "prophesy": "prescience",
  "psijic-relicmaster": "psijic-apprentice",
  "blackfeather-knave": "blackfeather-brigand",
  "murder-of-crows": "scratch",
  "plunder": "pilfer",
  "toll-of-silver": "toll-of-flesh",
  "draoife-ritecaller": "eldertide-fenwitch",
  "druid-king-vestments": "runes-of-the-draoife",
  "envoy-of-the-draoife": "stonelore-rockseer",
  "wispheart-totem": "wispcaller-totem",
  "ebony-mine": "kwama-egg-mine",
  "hlaalu-councilor": "hlaalu-kinsman",
  "house-embassy": "house-marketplace",
  "oathman": "hireling",
  "anseis-victory": "ansei-assault",
  "grand-oratory": "battle-meditation",
  "hel-shira-herald": "no-shira-poet",
  "hiras-end": "march-on-hattu",
  "chromatic-reservoir": "unsettling-aura",
  "lantern-of-the-endless": "apocryphal-pact",
  "seeker-aspirant": "cipher-of-the-eye",
  "unfathomable-secrets": "bargain-for-knowledge",
  "pyandonean-war-fleet": "serpentprow-schooner",
  "sea-serpent-colossus": "ghostscale-sea-serpent",
  "serpentguard-rider": "storm-shark-wavecaller",
  "summerset-sacking": "maormer-boarding-party",
  "knight-commander": "banneret",
  "knights-of-saint-pelin": "bangkorai-sentries",
  "legions-arrival": "reinforcements",
  "siege-weapon-volley": "archers-volley",
  "grand-larceny": "pounce-and-profit",
  "prowling-shadow": "jeering-shadow",
  "rings-guile": "bag-of-tricks",
  "shadows-slumber": "jarring-lullaby",
  "blood-sacrifice": "bloody-offering",
  "elder-witch": "clan-witch",
  "hagraven-matron": "hagraven",
  "imperial-plunder": "imperial-spoils"
};

export const BASE_TO_UPGRADE = Object.fromEntries(
  Object.entries(UPGRADE_TO_BASE).map(([u, b]) => [b, u])
);

/** Qty of card to put in tavern given owned upgrade ids. */
export function tavernQty(card, ownedUpgradeIds) {
  const owned = ownedUpgradeIds instanceof Set ? ownedUpgradeIds : new Set(ownedUpgradeIds || []);
  if (card.token || card.curse || card.starter) return 0;
  if (card.id === 'the-chimera' || card.id === 'gold' || card.id === 'writ-of-coin' || card.id === 'bewilderment') return 0;

  const isPureUpgrade = (card.baseQty || 0) === 0 && (card.upgradedQty || 0) > 0;
  if (isPureUpgrade) {
    return owned.has(card.id) ? (card.upgradedQty || 0) : 0;
  }

  const partner = BASE_TO_UPGRADE[card.id];
  if (partner) {
    return owned.has(partner) ? (card.upgradedQty || 0) : (card.baseQty || 0);
  }

  // No upgrade path — use base if present, else upgraded qty
  if ((card.baseQty || 0) > 0) return card.baseQty;
  return card.upgradedQty || 0;
}

/** All upgrade card ids for a patron deck. */
export function upgradesForPatron(cards, patronId) {
  return cards.filter(c =>
    c.patron === patronId &&
    (c.baseQty || 0) === 0 &&
    (c.upgradedQty || 0) > 0 &&
    !c.token && !c.starter && !c.curse
  ).map(c => c.id);
}

