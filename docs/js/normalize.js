/** Accept either the spicy-table schema or the UESP-parser schema. */
export function normalizeCatalog(cardsFile, patronsFile, decksFile) {
  const rawCards = cardsFile.cards || cardsFile;
  const first = rawCards[0] || {};
  if (first.play && first.patron) {
    return {
      cards: rawCards,
      patrons: patronsFile.patrons || patronsFile,
      decks: decksFile.decks || decksFile,
    };
  }
  // UESP / other-agent schema
  const cards = rawCards.map(c => convertCard(c));
  const patrons = (patronsFile.patrons || patronsFile).map(convertPatron);
  const decks = (decksFile.decks || decksFile).map(d => ({
    id: aliasPatron(d.id || d.patronId),
    name: d.name,
    short: d.short || d.name,
    starter: (d.cardIds || []).find(id => id.includes('starter')) || d.starter,
    cards: d.cardIds || d.cards || [],
    color: d.color || '#c9a227',
  }));
  return { cards, patrons, decks };
}

const PATRON_ALIAS = {
  saint_pelin: 'pelin', pelin: 'pelin',
  hlaalu: 'hlaalu', house_hlaalu: 'hlaalu',
  duke_of_crows: 'crows', crows: 'crows', blackfeather: 'crows',
  celarus: 'celarus', psijic: 'celarus',
  hunding: 'hunding',
  red_eagle: 'redeagle', redeagle: 'redeagle',
  orgnum: 'orgnum',
  rajhin: 'rajhin',
  druid_king: 'druid', druid: 'druid',
  almalexia: 'almalexia',
  hermaeus_mora: 'mora', mora: 'mora',
  saint_alessia: 'alessia', alessia: 'alessia',
  treasury: 'treasury', neutral: 'treasury',
};

export function aliasPatron(id) {
  if (!id) return 'treasury';
  return PATRON_ALIAS[id] || PATRON_ALIAS[id.replace(/-/g, '_')] || id;
}

export function nameSlug(name) {
  return String(name || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function convertCard(c) {
  const play = [], combo2 = [], combo3 = [], combo4 = [];
  for (const e of c.effects || []) {
    const mapped = mapEffect(e);
    const t = e.timing;
    const req = e.comboRequirement;
    if (t === 'combo' || req) {
      if (req >= 4) combo4.push(...mapped);
      else if (req >= 3) combo3.push(...mapped);
      else combo2.push(...mapped);
    } else if (t !== 'passive') {
      play.push(...mapped);
    } else {
      play.push(...mapped);
    }
  }
  const type = (c.isAgent || c.type === 'agent' || c.type === 'contractAgent') ? 'agent' : 'action';
  return {
    id: c.id,
    slug: nameSlug(c.name),
    name: c.name,
    patron: aliasPatron(c.deckId || c.patron),
    type,
    contract: !!(c.isContract || (c.type || '').toLowerCase().includes('contract')),
    cost: c.cost || 0,
    hp: c.hp,
    taunt: !!c.taunt,
    playText: (c.rawEffect || '').split('|')[0] || '',
    combo2Text: null, combo3Text: null, combo4Text: null,
    play, combo2, combo3, combo4,
    baseQty: c.copies || 0,
    upgradedQty: c.copiesAfterUpgrade != null ? c.copiesAfterUpgrade : (c.category === 'upgrade' ? (c.copies || 1) : (c.copies || 0)),
    upgraded: c.category === 'upgrade' || c.category === 'starter' || c.category === 'created',
    starter: !!c.isStarter || c.category === 'starter',
    token: c.category === 'created',
    curse: !!c.isCurse || c.type === 'curseAction',
    art: `cards/${nameSlug(c.name)}.png`,
    imageFile: c.imageFile,
  };
}

function mapEffect(e) {
  if (!e || !e.op) return [];
  const n = e.amount ?? e.n ?? 1;
  switch (e.op) {
    case 'gainCoin': return [{ op: 'coin', n }];
    case 'gainPower': return [{ op: 'power', n }];
    case 'gainPrestige': return [{ op: 'prestige', n }];
    case 'draw': return [{ op: 'draw', n }];
    case 'donate': return [{ op: 'donate', n }];
    case 'toss': return [{ op: 'toss', n }];
    case 'destroyOwnCard': return [{ op: 'destroy', n }];
    case 'replaceTavern': return [{ op: 'replace', n }];
    case 'acquireFromTavern': return [{ op: 'acquire', n: e.maxCost ?? n }];
    case 'knockOut': return [{ op: 'knockout', n }];
    case 'confine': return [{ op: 'confine', n }];
    case 'extraPatronCall': return [{ op: 'patron_extra', n }];
    case 'refresh': return [{ op: 'draw_refresh', n }];
    case 'healAgent': return [{ op: 'heal', n }];
    case 'createCard': return [{ op: 'create', card: e.cardName, n: 1 }];
    case 'opponentLosePrestige': return [{ op: 'opp_prestige', n: -n }];
    case 'setback': {
      const r = (e.resource || '').toLowerCase();
      if (r === 'draw' || e.draw) return [{ op: 'setback_draw', n }];
      if (r === 'power') return [{ op: 'setback_power', n }];
      return [{ op: 'setback_coin', n }];
    }
    case 'chooseOne':
      return [{ op: 'choose', options: (e.options || []).map(opt => opt.flatMap(mapEffect)) }];
    case 'whileInPlay': {
      const inner = (e.effects || []).map(x => x.op);
      const trig = (e.trigger || '').toLowerCase();
      let trigger = 'cooldown';
      if (trig.includes('discard')) trigger = 'discard';
      else if (trig.includes('agent') && trig.includes('cooldown')) trigger = 'agent_cooldown';
      else if (trig.includes('agent')) trigger = 'agent_play';
      const res = inner.includes('gainPower') ? 'power' : inner.includes('gainPrestige') ? 'prestige' : 'coin';
      return [{ op: 'passive', trigger, resource: res, n: 1 }];
    }
    case 'noop':
    case 'taunt':
    case 'rule':
      return [];
    default:
      return [];
  }
}

function convertPatron(p) {
  const id = aliasPatron(p.id);
  const fl = p.favorLevels || {};
  const toAb = (lvl) => {
    if (!lvl) return null;
    const costs = {};
    for (const c of lvl.costs || []) costs[c.resource] = c.amount;
    return { cost: costs, effect: inferPatronEffect(id, lvl), desc: lvl.raw || '', n: lvl.effects?.[0]?.amount };
  };
  return {
    id,
    name: p.name,
    short: p.short || p.name,
    color: p.color || '#c9a227',
    starter: p.starterCardId || p.starter,
    alwaysNeutral: id === 'treasury',
    abilities: {
      favored: toAb(fl.player1 || fl.favored),
      neutral: toAb(fl.unaligned || fl.neutral),
      unfavored: toAb(fl.player2 || fl.unfavored),
      lockFavored: id === 'crows' || id === 'hunding',
      flipUnfavoredToFavored: id === 'hunding',
    },
    image: `patrons/${id}.png`,
  };
}

function inferPatronEffect(id, lvl) {
  const raw = (lvl.raw || '').toLowerCase();
  if (id === 'treasury') return 'sacrifice_for_writ';
  if (id === 'pelin') return 'agent_to_draw';
  if (id === 'hlaalu') return 'sacrifice_prestige';
  if (id === 'crows') return 'coin_to_power';
  if (id === 'celarus') return 'knockout_agent';
  if (id === 'hunding' && raw.includes('favors you')) return 'gain_coin_favor';
  if (id === 'hunding') return 'gain_coin';
  if (id === 'redeagle') return 'draw';
  if (id === 'orgnum' && raw.includes('sacking')) return 'orgnum_favored';
  if (id === 'orgnum' && raw.includes('every 6')) return 'orgnum_neutral';
  if (id === 'orgnum') return 'power';
  if (id === 'rajhin') return 'bewilderment';
  if (id === 'druid') return 'tavern_remove';
  if (id === 'almalexia') return 'look_confine';
  if (id === 'mora') return 'mora_share';
  if (id === 'alessia' && raw.includes('chainbreaker')) return 'create_agent';
  if (id === 'alessia' && raw.includes('soldier')) return 'create_agent';
  if (id === 'alessia') return 'power';
  return lvl.effects?.[0]?.op || null;
}
