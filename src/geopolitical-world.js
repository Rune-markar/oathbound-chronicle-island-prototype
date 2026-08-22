export const GEOPOLITICAL_SCHEMA_VERSION = 1;

export const GEOPOLITICAL_MODEL_REFERENCES = Object.freeze([
  {
    id: "balance-of-threat",
    title: "Balance of threat",
    url: "https://doi.org/10.1017/S0020818300032823",
    use: "国力・近接性・攻勢能力・敵対意図から脅威を評価する",
  },
  {
    id: "trade-gravity",
    title: "Gravity with Gravitas",
    url: "https://doi.org/10.3386/w8079",
    use: "経済規模、距離、国境コストから交易誘因を評価する",
  },
  {
    id: "direct-contiguity",
    title: "Correlates of War Direct Contiguity",
    url: "https://correlatesofwar.org/data-sets/direct-contiguity/",
    use: "陸上・河川国境を国家間接触の基礎単位にする",
  },
  {
    id: "geographic-spread",
    title: "The Geographic Spread of Militarized Disputes",
    url: "https://doi.org/10.1177/0022343306066627",
    use: "領土・資源を拡張誘因、険阻地形を軍事拡大の障壁として扱う",
  },
]);

export const GEOPOLITICAL_PULL_SET = Object.freeze({
  consolidate: { name: "国内統合", posture: "内政集中", tone: "calm" },
  secure_food: { name: "食料安全保障", posture: "資源確保", tone: "calm" },
  open_trade: { name: "交易路開拓", posture: "通商協調", tone: "positive" },
  diplomatic_overture: { name: "緊張緩和交渉", posture: "外交接近", tone: "positive" },
  seek_alignment: { name: "対脅威連携", posture: "均衡外交", tone: "watch" },
  accept_alignment: { name: "同盟受諾", posture: "同盟形成", tone: "positive" },
  fortify_frontier: { name: "国境防備", posture: "守勢警戒", tone: "watch" },
  mobilize: { name: "限定動員", posture: "軍事警戒", tone: "danger" },
  deescalate: { name: "相互後退", posture: "危機管理", tone: "positive" },
  coerce_neighbor: { name: "近隣国威圧", posture: "強圧外交", tone: "danger" },
  limited_war: { name: "限定国境戦争", posture: "交戦", tone: "danger" },
  sustain_war: { name: "戦線維持", posture: "交戦", tone: "danger" },
  seek_ceasefire: { name: "停戦模索", posture: "停戦交渉", tone: "watch" },
  accept_ceasefire: { name: "停戦受諾", posture: "停戦合意", tone: "positive" },
});

const MAX_EVENTS = 96;

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function rounded(value) {
  return Math.round(clamp(value));
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(...parts) {
  return hashText(parts.join(":")) / 4294967295;
}

function periodFor(dateState) {
  const year = Number.isInteger(dateState?.year) ? dateState.year : 317;
  const month = Number.isInteger(dateState?.month) ? dateState.month : 4;
  return `${year}-${month}`;
}

function pairKey(leftId, rightId) {
  return [leftId, rightId].sort().join(":");
}

function pairNationIds(key) {
  return key.split(":");
}

function cloneRecord(record = {}) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, {
    ...value,
    ...(value?.alignmentOffer ? { alignmentOffer: { ...value.alignmentOffer } } : {}),
    ...(value?.ceasefireOffer ? { ceasefireOffer: { ...value.ceasefireOffer } } : {}),
  }]));
}

export function preserveGeopoliticalState(source) {
  if (!source || typeof source !== "object" || Number(source.schemaVersion) !== GEOPOLITICAL_SCHEMA_VERSION) return null;
  return {
    schemaVersion: GEOPOLITICAL_SCHEMA_VERSION,
    establishedPeriod: typeof source.establishedPeriod === "string" ? source.establishedPeriod : null,
    lastAdvancedPeriod: typeof source.lastAdvancedPeriod === "string" ? source.lastAdvancedPeriod : null,
    nationStates: cloneRecord(source.nationStates),
    relations: cloneRecord(source.relations),
    events: Array.isArray(source.events)
      ? source.events.slice(-MAX_EVENTS).map((event) => ({ ...event, drivers: [...(event.drivers ?? [])] }))
      : [],
  };
}

function logarithmicScore(value, minimumExponent, maximumExponent) {
  const exponent = Math.log10(Math.max(1, Number(value) || 1));
  return clamp((exponent - minimumExponent) / Math.max(0.01, maximumExponent - minimumExponent) * 100);
}

function wrappedCapitalDistance(runtime, left, right) {
  let dx = Math.abs(left.capital.x - right.capital.x);
  if (runtime.terrain.config.wrapX) dx = Math.min(dx, runtime.terrain.width - dx);
  const dy = Math.abs(left.capital.y - right.capital.y);
  return Math.hypot(dx, dy);
}

function frontierFor(runtime, key) {
  const segments = runtime.nations.borderSegments.filter((segment) => pairKey(...segment.nations) === key);
  const sharedBorder = Number(runtime.nations.sharedBorderLengths[key] ?? segments.length ?? 0);
  const naturalStrength = segments.length
    ? segments.reduce((sum, segment) => sum + Number(segment.naturalStrength ?? 0), 0) / segments.length
    : 0;
  return {
    sharedBorder,
    naturalStrength,
    permeability: sharedBorder ? rounded(92 - naturalStrength * 68) : 8,
  };
}

export function deriveGeopoliticalProfiles(runtime) {
  const nations = runtime.nations.nations;
  return Object.fromEntries(nations.map((nation) => {
    const populationScale = logarithmicScore(nation.populationPotential, 4, 7.2);
    const productionScale = logarithmicScore(nation.yields.production, 1, 3.8);
    const commerceScale = logarithmicScore(nation.yields.commerce, 0, 2.8);
    const territoryScale = logarithmicScore(nation.tileCount, 1, 3.6);
    const productionIntensity = clamp(nation.yields.production / Math.max(1, nation.tileCount) / 2.5 * 100);
    const commerceIntensity = clamp(nation.yields.commerce / Math.max(1, nation.tileCount) / 0.25 * 100);
    const foodSupportRatio = nation.yields.food * 2600 / Math.max(1, nation.populationPotential);
    const foodBase = clamp(50 + (foodSupportRatio - 1) * 140, 15, 90);
    const capability = clamp(10 + populationScale * 0.38 + productionScale * 0.28
      + commerceScale * 0.18 + territoryScale * 0.16);
    const borderSegments = runtime.nations.borderSegments.filter((segment) => segment.nations.includes(nation.id));
    const naturalStrength = borderSegments.length
      ? borderSegments.reduce((sum, segment) => sum + Number(segment.naturalStrength ?? 0), 0) / borderSegments.length
      : 1;
    const neighborIds = [...new Set(borderSegments.flatMap((segment) => segment.nations).filter((id) => id !== nation.id))].sort();
    const terrainDefense = rounded(16 + nation.mountainShare * 34 + naturalStrength * 42 + (neighborIds.length ? 0 : 18));
    const stateCapacity = rounded(22 + commerceIntensity * 0.38 + productionIntensity * 0.24
      + Math.min(18, nation.capital.suitability / 18) - Math.max(0, nation.regionCount - 5) * 1.5);
    return [nation.id, {
      nationId: nation.id,
      capability: rounded(capability),
      foodBase: rounded(foodBase),
      foodSupportRatio: Number(foodSupportRatio.toFixed(3)),
      commerceBase: rounded(commerceIntensity),
      economicScale: rounded(commerceScale),
      productionBase: rounded(productionIntensity),
      stateCapacity,
      terrainDefense,
      maritimeAccess: rounded(nation.coastalShare * 100),
      neighborIds,
      borderCount: borderSegments.length,
    }];
  }));
}

function derivePairStructures(runtime, profiles) {
  const nations = runtime.nations.nations;
  const diagonal = Math.hypot(runtime.terrain.width / 2, runtime.terrain.height);
  const pairs = {};
  for (let leftIndex = 0; leftIndex < nations.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nations.length; rightIndex += 1) {
      const left = nations[leftIndex];
      const right = nations[rightIndex];
      const key = pairKey(left.id, right.id);
      const frontier = frontierFor(runtime, key);
      const distanceRatio = clamp(wrappedCapitalDistance(runtime, left, right) / Math.max(1, diagonal), 0, 1);
      const economicMass = Math.sqrt(profiles[left.id].economicScale * profiles[right.id].economicScale) / 100;
      const distanceAccess = 1 / (0.42 + distanceRatio * 1.85);
      const borderAccess = frontier.sharedBorder ? 1.18 : 0.62 + Math.min(left.coastalShare, right.coastalShare) * 0.5;
      pairs[key] = {
        key,
        nationIds: [left.id, right.id],
        distanceRatio: Number(distanceRatio.toFixed(3)),
        sharedBorder: frontier.sharedBorder,
        naturalStrength: Number(frontier.naturalStrength.toFixed(3)),
        permeability: frontier.permeability,
        tradePotential: rounded(10 + economicMass * distanceAccess * borderAccess * 54),
      };
    }
  }
  return pairs;
}

function initialNationState(seed, nation, profile) {
  return {
    cohesion: rounded(48 + profile.stateCapacity * 0.22 + (hashUnit(seed, nation.id, "cohesion") - 0.5) * 12),
    reserves: rounded(38 + profile.commerceBase * 0.28 + (hashUnit(seed, nation.id, "reserves") - 0.5) * 10),
    foodSecurity: rounded(profile.foodBase + (hashUnit(seed, nation.id, "food") - 0.5) * 8),
    readiness: rounded(28 + profile.productionBase * 0.24 + profile.terrainDefense * 0.08),
    offensiveIntent: rounded(10 + profile.capability * 0.1 + hashUnit(seed, nation.id, "intent") * 10),
    posture: "情勢観察",
    lastPullId: null,
    lastTargetNationId: null,
  };
}

function initialRelation(seed, pair) {
  const contiguityPressure = pair.sharedBorder ? 10 + pair.permeability * 0.08 : 0;
  const randomMemory = (hashUnit(seed, pair.key, "memory") - 0.5) * 16;
  return {
    relation: rounded(42 + pair.tradePotential * 0.18 - contiguityPressure + randomMemory) - 50,
    tension: rounded(6 + contiguityPressure + (100 - pair.tradePotential) * 0.04 + Math.max(0, randomMemory)),
    trade: rounded(pair.tradePotential * 0.38),
    allied: false,
    atWar: false,
    crisisMonths: 0,
    warMonths: 0,
    truceMonths: 0,
    alignmentOffer: null,
    ceasefireOffer: null,
  };
}

function normalizeOffer(offer, nationIds) {
  if (!offer || typeof offer !== "object") return null;
  if (!nationIds.includes(offer.from) || !nationIds.includes(offer.to) || offer.from === offer.to) return null;
  const monthsRemaining = Math.max(1, Math.min(3, Math.round(Number(offer.monthsRemaining) || 0)));
  return { from: offer.from, to: offer.to, monthsRemaining };
}

export function createGeopoliticalWorldState(runtime, source = null, dateState = null) {
  const profiles = deriveGeopoliticalProfiles(runtime);
  const pairs = derivePairStructures(runtime, profiles);
  const preserved = preserveGeopoliticalState(source);
  const period = periodFor(dateState);
  const nationStates = {};
  for (const nation of runtime.nations.nations) {
    const fallback = initialNationState(runtime.terrain.seed, nation, profiles[nation.id]);
    const stored = preserved?.nationStates?.[nation.id];
    nationStates[nation.id] = stored ? {
      cohesion: rounded(stored.cohesion),
      reserves: rounded(stored.reserves),
      foodSecurity: rounded(stored.foodSecurity),
      readiness: rounded(stored.readiness),
      offensiveIntent: rounded(stored.offensiveIntent),
      posture: typeof stored.posture === "string" ? stored.posture : fallback.posture,
      lastPullId: GEOPOLITICAL_PULL_SET[stored.lastPullId] ? stored.lastPullId : null,
      lastTargetNationId: runtime.nationById.has(stored.lastTargetNationId) ? stored.lastTargetNationId : null,
    } : fallback;
  }
  const relations = {};
  for (const pair of Object.values(pairs)) {
    const fallback = initialRelation(runtime.terrain.seed, pair);
    const stored = preserved?.relations?.[pair.key];
    relations[pair.key] = stored ? {
      relation: Math.round(clamp(stored.relation, -100, 100)),
      tension: rounded(stored.tension),
      trade: rounded(stored.trade),
      allied: Boolean(stored.allied),
      atWar: Boolean(stored.atWar),
      crisisMonths: Math.max(0, Math.round(Number(stored.crisisMonths) || 0)),
      warMonths: Math.max(0, Math.round(Number(stored.warMonths) || 0)),
      truceMonths: Math.max(0, Math.round(Number(stored.truceMonths) || 0)),
      alignmentOffer: normalizeOffer(stored.alignmentOffer, pair.nationIds),
      ceasefireOffer: normalizeOffer(stored.ceasefireOffer, pair.nationIds),
    } : fallback;
  }
  return {
    schemaVersion: GEOPOLITICAL_SCHEMA_VERSION,
    establishedPeriod: preserved?.establishedPeriod ?? period,
    lastAdvancedPeriod: preserved?.lastAdvancedPeriod ?? period,
    nationStates,
    relations,
    events: (preserved?.events ?? []).filter((event) => runtime.nationById.has(event.nationId)).slice(-MAX_EVENTS),
  };
}

function relationFor(geopolitics, leftId, rightId) {
  return geopolitics.relations[pairKey(leftId, rightId)];
}

function threatScore(observerId, targetId, profiles, pairs, geopolitics) {
  const observer = profiles[observerId];
  const target = profiles[targetId];
  const condition = geopolitics.nationStates[targetId];
  const relation = relationFor(geopolitics, observerId, targetId);
  const pair = pairs[pairKey(observerId, targetId)];
  const proximity = pair.sharedBorder ? 1 : 0.2 + (1 - pair.distanceRatio) * 0.5;
  const relativePower = clamp(target.capability / Math.max(1, observer.capability), 0, 2) * 20;
  const aggressiveSignals = condition.readiness * 0.18 + condition.offensiveIntent * 0.22
    + relation.tension * 0.34 + Math.max(0, -relation.relation) * 0.18;
  const borderOpportunity = pair.sharedBorder ? pair.permeability * 0.12 : 0;
  const relationshipModifier = relation.atWar ? 1.2 : relation.allied ? 0.48 : 1;
  return rounded((target.capability * 0.28 + relativePower + aggressiveSignals + borderOpportunity) * proximity * relationshipModifier);
}

function strategicContext(nationId, profiles, pairs, geopolitics) {
  const otherIds = Object.keys(profiles).filter((id) => id !== nationId);
  const threats = otherIds.map((targetId) => ({
    nationId: targetId,
    score: threatScore(nationId, targetId, profiles, pairs, geopolitics),
    relation: relationFor(geopolitics, nationId, targetId),
    pair: pairs[pairKey(nationId, targetId)],
  })).sort((left, right) => right.score - left.score || left.nationId.localeCompare(right.nationId));
  const tradePartners = otherIds.map((targetId) => ({
    nationId: targetId,
    pair: pairs[pairKey(nationId, targetId)],
    relation: relationFor(geopolitics, nationId, targetId),
  })).filter((entry) => !entry.relation.atWar)
    .sort((left, right) => right.pair.tradePotential - left.pair.tradePotential || left.nationId.localeCompare(right.nationId));
  const borderThreats = threats.filter((entry) => entry.pair.sharedBorder);
  const weakestNeighbor = borderThreats.slice().sort((left, right) => (
    profiles[left.nationId].capability - profiles[right.nationId].capability || left.nationId.localeCompare(right.nationId)
  ))[0] ?? null;
  return {
    topThreat: threats[0] ?? null,
    topBorderThreat: borderThreats[0] ?? null,
    bestTradePartner: tradePartners[0] ?? null,
    weakestNeighbor,
    warOpponent: threats.find((entry) => entry.relation.atWar) ?? null,
  };
}

function allianceCountFor(geopolitics, nationId) {
  return Object.entries(geopolitics.relations).filter(([key, relation]) => (
    relation.allied && pairNationIds(key).includes(nationId)
  )).length;
}

function incomingOffers(geopolitics, nationId, field) {
  return Object.entries(geopolitics.relations).map(([key, relation]) => ({
    key,
    relation,
    offer: relation[field],
  })).filter((entry) => entry.offer?.to === nationId);
}

function driver(label, value) {
  return { label, value: rounded(value) };
}

function candidate(pullId, score, targetNationId, drivers, eligible = true) {
  return eligible ? { pullId, score, targetNationId: targetNationId ?? null, drivers } : null;
}

function chooseNationalPull(seed, period, nationId, profiles, pairs, snapshot) {
  const profile = profiles[nationId];
  const condition = snapshot.nationStates[nationId];
  const context = strategicContext(nationId, profiles, pairs, snapshot);
  const threat = context.topThreat?.score ?? 0;
  const borderThreat = context.topBorderThreat?.score ?? 0;
  const targetRelation = context.topThreat?.relation;
  if (context.warOpponent) {
    const exhaustion = 100 - (condition.readiness + condition.cohesion + condition.foodSecurity) / 3;
    const incomingCeasefire = incomingOffers(snapshot, nationId, "ceasefireOffer")
      .filter((entry) => entry.relation.atWar)
      .sort((left, right) => right.relation.warMonths - left.relation.warMonths || left.key.localeCompare(right.key))[0] ?? null;
    if (incomingCeasefire && (exhaustion >= 28 || incomingCeasefire.relation.warMonths >= 10)) {
      return candidate("accept_ceasefire", 170 + exhaustion, incomingCeasefire.offer.from,
        [driver("戦争疲弊", exhaustion), driver("戦争期間", incomingCeasefire.relation.warMonths * 8)]);
    }
    const seekPeace = context.warOpponent.relation.warMonths >= 6 && exhaustion >= 38;
    return seekPeace
      ? candidate("seek_ceasefire", 140 + exhaustion, context.warOpponent.nationId, [driver("戦争疲弊", exhaustion)])
      : candidate("sustain_war", 130 + condition.readiness * 0.2, context.warOpponent.nationId, [driver("軍事脅威", 100)]);
  }

  const allianceCount = allianceCountFor(snapshot, nationId);
  const incomingAlignment = incomingOffers(snapshot, nationId, "alignmentOffer").map((entry) => {
    const proposerId = entry.offer.from;
    const sharedThreat = context.topThreat && context.topThreat.nationId !== proposerId
      ? threatScore(proposerId, context.topThreat.nationId, profiles, pairs, snapshot)
      : 0;
    return { ...entry, proposerId, sharedThreat, proposerAllianceCount: allianceCountFor(snapshot, proposerId) };
  }).filter((entry) => !entry.relation.atWar && !entry.relation.allied && entry.relation.relation >= 20
    && entry.relation.tension < 45 && entry.sharedThreat >= 35 && entry.proposerAllianceCount < 2)
    .sort((left, right) => right.relation.relation - left.relation.relation || left.key.localeCompare(right.key))[0] ?? null;
  const alignmentPartner = Object.keys(profiles).filter((id) => id !== nationId && id !== context.topThreat?.nationId)
    .map((id) => ({
      id,
      relation: relationFor(snapshot, nationId, id),
      trade: pairs[pairKey(nationId, id)].tradePotential,
      sharedThreat: context.topThreat
        ? threatScore(id, context.topThreat.nationId, profiles, pairs, snapshot)
        : 0,
    }))
    .filter((entry) => !entry.relation.atWar && !entry.relation.allied && entry.relation.relation >= 0
      && entry.relation.tension < 45 && entry.sharedThreat >= 40 && allianceCountFor(snapshot, entry.id) < 2)
    .sort((left, right) => (right.relation.relation + right.trade * 0.25) - (left.relation.relation + left.trade * 0.25))[0] ?? null;
  const coercionTarget = context.weakestNeighbor;
  const coercionRatio = coercionTarget ? profile.capability / Math.max(1, profiles[coercionTarget.nationId].capability) : 0;
  const pressure = Math.max(0, 55 - condition.foodSecurity) + Math.max(0, 48 - condition.reserves);
  const crisis = context.topBorderThreat?.relation;
  const jitter = (pullId) => (hashUnit(seed, period, nationId, pullId) - 0.5) * 8;
  const candidates = [
    candidate("consolidate", 39 + (58 - condition.cohesion) * 0.9 + (70 - profile.stateCapacity) * 0.22 + jitter("consolidate"), null,
      [driver("国内結束の不足", 100 - condition.cohesion), driver("統治能力", profile.stateCapacity)]),
    candidate("secure_food", 32 + (58 - condition.foodSecurity) * 1.15 + jitter("secure_food"), null,
      [driver("食料不安", 100 - condition.foodSecurity), driver("基礎食料力", profile.foodBase)]),
    candidate("open_trade", 38 + (context.bestTradePartner?.pair.tradePotential ?? 0) * 0.32
      + Math.max(0, 55 - condition.reserves) * 0.35 - (context.bestTradePartner?.relation.trade ?? 0) * 0.35
      - threat * 0.08 + jitter("open_trade"), context.bestTradePartner?.nationId,
      [driver("交易誘因", context.bestTradePartner?.pair.tradePotential ?? 0), driver("交易余地", 100 - (context.bestTradePartner?.relation.trade ?? 0))], Boolean(context.bestTradePartner)),
    candidate("diplomatic_overture", 31 + threat * 0.35 + (targetRelation?.tension ?? 0) * 0.3
      + Math.max(0, -(targetRelation?.relation ?? 0)) * 0.18 + jitter("diplomatic_overture"), context.topThreat?.nationId,
      [driver("軍事脅威", threat), driver("二国間緊張", targetRelation?.tension ?? 0)], Boolean(context.topThreat && targetRelation?.tension >= 24)),
    candidate("seek_alignment", 31 + threat * 0.46 + (100 - profile.capability) * 0.12 + jitter("seek_alignment"), alignmentPartner?.id,
      [driver("軍事脅威", threat), driver("相対的脆弱性", 100 - profile.capability)], Boolean(threat >= 45 && allianceCount < 2 && alignmentPartner)),
    candidate("accept_alignment", 118 + (incomingAlignment?.relation.relation ?? 0) * 0.25
      + (incomingAlignment?.sharedThreat ?? 0) * 0.2 + jitter("accept_alignment"), incomingAlignment?.proposerId,
      [driver("共通脅威", incomingAlignment?.sharedThreat ?? 0), driver("二国間関係", 50 + (incomingAlignment?.relation.relation ?? -50) / 2)],
      Boolean(allianceCount < 2 && incomingAlignment)),
    candidate("fortify_frontier", 29 + borderThreat * 0.58 + (100 - profile.terrainDefense) * 0.16
      - condition.readiness * 0.35 + jitter("fortify_frontier"), context.topBorderThreat?.nationId,
      [driver("国境脅威", borderThreat), driver("国境防御の弱さ", 100 - profile.terrainDefense)], Boolean(context.topBorderThreat)),
    candidate("mobilize", 26 + borderThreat * 0.55 + (crisis?.tension ?? 0) * 0.4
      - condition.readiness * 0.18 + jitter("mobilize"), context.topBorderThreat?.nationId,
      [driver("国境脅威", borderThreat), driver("二国間緊張", crisis?.tension ?? 0)], Boolean(borderThreat >= 48 && crisis?.tension >= 38)),
    candidate("deescalate", 36 + (crisis?.tension ?? 0) * 0.52 + (100 - condition.cohesion) * 0.12
      + jitter("deescalate"), context.topBorderThreat?.nationId,
      [driver("危機水準", crisis?.tension ?? 0), driver("国内負担", 100 - condition.cohesion)], Boolean(crisis?.tension >= 48 && condition.offensiveIntent < 58)),
    candidate("coerce_neighbor", 19 + Math.max(0, coercionRatio - 1) * 32 + pressure * 0.5
      + condition.offensiveIntent * 0.25 + (coercionTarget?.pair.permeability ?? 0) * 0.1
      + (coercionTarget?.relation.tension ?? 0) * 0.12 + jitter("coerce_neighbor"), coercionTarget?.nationId,
      [driver("国力優位", Math.min(100, coercionRatio * 50)), driver("資源圧力", pressure * 2), driver("国境透過性", coercionTarget?.pair.permeability ?? 0)],
      Boolean(coercionTarget && coercionRatio >= 1.08 && pressure >= 10 && !coercionTarget.relation.allied && coercionTarget.relation.truceMonths === 0)),
    candidate("limited_war", 125 + (crisis?.tension ?? 0), context.topBorderThreat?.nationId,
      [driver("危機水準", crisis?.tension ?? 0), driver("攻勢意図", condition.offensiveIntent), driver("動員水準", condition.readiness)],
      Boolean(context.topBorderThreat && !crisis?.allied && crisis?.tension >= 84 && crisis?.relation <= -45 && crisis?.crisisMonths >= 3
        && crisis?.truceMonths === 0 && condition.readiness >= 62 && condition.offensiveIntent >= 45)),
  ].filter(Boolean);
  return candidates.sort((left, right) => right.score - left.score || left.pullId.localeCompare(right.pullId))[0];
}

function eventCopy(period, nation, target, decision) {
  const pull = GEOPOLITICAL_PULL_SET[decision.pullId];
  const targetName = target?.name ?? "相手国";
  const targetText = target ? `${target.name}を対象に` : "国内で";
  const summaries = {
    consolidate: `${nation.name}は統治網と地方間調整の立て直しを優先した。`,
    secure_food: `${nation.name}は備蓄放出と穀倉・流通の整備を進めた。`,
    open_trade: `${nation.name}は${targetName}との交易路と通行条件の整備に着手した。`,
    diplomatic_overture: `${nation.name}は${targetName}へ使節を送り、緊張緩和を提案した。`,
    seek_alignment: decision.outcome === "alliance_formed"
      ? `${nation.name}と${targetName}は相互提案に基づく同盟を締結した。`
      : `${nation.name}は${targetName}へ安全保障協議を提案した。`,
    accept_alignment: decision.outcome === "alliance_formed"
      ? `${nation.name}は${targetName}の提案を受諾し、両国は同盟を締結した。`
      : `${nation.name}は${targetName}の提案へ賛意を示したが、同盟枠の調整が残った。`,
    fortify_frontier: `${nation.name}は${targetName}方面の通路・渡河点・峠の守備を強化した。`,
    mobilize: `${nation.name}は${targetName}方面で限定動員を実施した。`,
    deescalate: `${nation.name}は${targetName}との国境部隊を後退させ、危機管理を優先した。`,
    coerce_neighbor: `${nation.name}は${targetName}へ通商・国境上の譲歩を要求した。`,
    limited_war: `${nation.name}は${targetName}との国境で限定的な軍事行動を開始した。`,
    sustain_war: `${nation.name}は${targetName}との戦線維持に兵站を集中した。`,
    seek_ceasefire: decision.outcome === "ceasefire_formed"
      ? `${nation.name}と${targetName}は相互提案に基づく停戦へ入った。`
      : `${nation.name}は${targetName}へ停戦条件を提示した。`,
    accept_ceasefire: decision.outcome === "ceasefire_formed"
      ? `${nation.name}は${targetName}の停戦案を受諾し、両軍は停戦へ入った。`
      : `${nation.name}は${targetName}の停戦案へ回答したが、戦闘停止には至らなかった。`,
  };
  return {
    id: `geopolitics-${period}-${nation.id}-${decision.pullId}`,
    period,
    nationId: nation.id,
    targetNationId: target?.id ?? null,
    pullId: decision.pullId,
    outcome: decision.outcome ?? null,
    title: `${nation.name}・${pull.name}`,
    summary: summaries[decision.pullId] ?? `${nation.name}は${targetText}${pull.name}を進めた。`,
    drivers: decision.drivers.sort((left, right) => right.value - left.value).slice(0, 3),
    score: Math.round(decision.score),
    tone: pull.tone,
  };
}

function addDelta(bucket, id, changes) {
  bucket[id] ??= {};
  for (const [key, value] of Object.entries(changes)) bucket[id][key] = (bucket[id][key] ?? 0) + value;
}

function relationActionFor(bucket, key) {
  bucket[key] ??= {
    warStarters: [],
    alignmentSeekers: [],
    alignmentAcceptors: [],
    ceasefireSeekers: [],
    ceasefireAcceptors: [],
  };
  return bucket[key];
}

function applyDecisionEffects(decision, nationId, nationDeltas, relationDeltas, relationActions) {
  const relationKey = decision.targetNationId ? pairKey(nationId, decision.targetNationId) : null;
  const effects = {
    consolidate: { nation: { cohesion: 5, reserves: -1, offensiveIntent: -2 } },
    secure_food: { nation: { foodSecurity: 6, reserves: -2, cohesion: 1 } },
    open_trade: { nation: { reserves: 3 }, relation: { relation: 4, tension: -2, trade: 6 } },
    diplomatic_overture: { nation: { reserves: -1, offensiveIntent: -2 }, relation: { relation: 7, tension: -7 } },
    seek_alignment: { nation: { reserves: -2 }, relation: { relation: 2, tension: -1 } },
    accept_alignment: { nation: { reserves: -1 }, relation: { relation: 3, tension: -2 } },
    fortify_frontier: { nation: { readiness: 6, reserves: -2 }, relation: { tension: 2 } },
    mobilize: { nation: { readiness: 9, reserves: -4, offensiveIntent: 5 }, relation: { relation: -4, tension: 9 } },
    deescalate: { nation: { readiness: -4, offensiveIntent: -5 }, relation: { relation: 4, tension: -10 } },
    coerce_neighbor: { nation: { offensiveIntent: 6, readiness: 2 }, relation: { relation: -8, tension: 13 } },
    limited_war: { nation: { reserves: -5, readiness: -2, cohesion: -1 }, relation: { relation: -12, tension: 20 } },
    sustain_war: { nation: { reserves: -5, readiness: -3, foodSecurity: -2, cohesion: -2 }, relation: { relation: -4, tension: 4 } },
    seek_ceasefire: { nation: { readiness: -2, offensiveIntent: -4 }, relation: { relation: 2, tension: -4 } },
    accept_ceasefire: { nation: { readiness: -4, offensiveIntent: -8 }, relation: { relation: 5, tension: -18 } },
  }[decision.pullId];
  addDelta(nationDeltas, nationId, effects.nation ?? {});
  if (relationKey) addDelta(relationDeltas, relationKey, effects.relation ?? {});
  if (!relationKey) return;
  const actions = relationActionFor(relationActions, relationKey);
  if (decision.pullId === "limited_war") actions.warStarters.push(nationId);
  if (decision.pullId === "seek_alignment") actions.alignmentSeekers.push(nationId);
  if (decision.pullId === "accept_alignment") actions.alignmentAcceptors.push(nationId);
  if (decision.pullId === "seek_ceasefire") actions.ceasefireSeekers.push(nationId);
  if (decision.pullId === "accept_ceasefire") actions.ceasefireAcceptors.push(nationId);
}

function offerWasAccepted(currentOffer, acceptors) {
  return Boolean(currentOffer && acceptors.includes(currentOffer.to));
}

function reciprocalOffer(currentOffer, seekers) {
  return Boolean(currentOffer && seekers.includes(currentOffer.to));
}

function mutualAction(nationIds, actors) {
  return nationIds.every((nationId) => actors.includes(nationId));
}

function nextOffer(currentOffer, seekers, acceptors, nationIds, clear) {
  if (clear || acceptors.length) return null;
  if (seekers.length) {
    const from = [...seekers].sort()[0];
    const to = nationIds.find((nationId) => nationId !== from);
    return { from, to, monthsRemaining: 3 };
  }
  if (currentOffer?.monthsRemaining > 1) return { ...currentOffer, monthsRemaining: currentOffer.monthsRemaining - 1 };
  return null;
}

const PLAYER_APPROVAL_PULL_IDS = new Set(["limited_war", "seek_ceasefire", "accept_ceasefire"]);

function deferProtectedDecision(nation, decision, protectedNationIds, period) {
  if (!protectedNationIds.has(nation.id) || !PLAYER_APPROVAL_PULL_IDS.has(decision.pullId)) {
    return { decision, pendingDecision: null };
  }
  const requestedPullId = decision.pullId;
  const fallbackPullId = requestedPullId === "limited_war" ? "fortify_frontier" : "sustain_war";
  return {
    decision: {
      ...decision,
      pullId: fallbackPullId,
      score: decision.score,
      drivers: [...decision.drivers, driver("プレイヤー承認待ち", 100)],
    },
    pendingDecision: {
      id: `strategic-approval-${period}-${nation.id}-${requestedPullId}`,
      period,
      nationId: nation.id,
      targetNationId: decision.targetNationId,
      pullId: requestedPullId,
      title: `${nation.name}・${GEOPOLITICAL_PULL_SET[requestedPullId].name}`,
      summary: "不可逆な開戦・停戦判断のため、守備と戦線維持だけを続けてプレイヤーの帰還を待っています。",
    },
  };
}

export function advanceGeopoliticalWorld(runtime, source, dateState, options = {}) {
  const snapshot = createGeopoliticalWorldState(runtime, source, dateState);
  const period = periodFor(dateState);
  if (snapshot.lastAdvancedPeriod === period) return snapshot;
  const profiles = deriveGeopoliticalProfiles(runtime);
  const pairs = derivePairStructures(runtime, profiles);
  const protectedNationIds = new Set(options.protectedNationIds ?? []);
  const decisions = runtime.nations.nations.map((nation) => {
    const selected = chooseNationalPull(runtime.terrain.seed, period, nation.id, profiles, pairs, snapshot);
    return { nation, ...deferProtectedDecision(nation, selected, protectedNationIds, period) };
  });
  const nationDeltas = {};
  const relationDeltas = {};
  const relationActions = {};
  for (const { nation, decision } of decisions) applyDecisionEffects(decision, nation.id, nationDeltas, relationDeltas, relationActions);

  const allianceCounts = Object.fromEntries(runtime.nations.nations.map((nation) => [nation.id, 0]));
  for (const [key, relation] of Object.entries(snapshot.relations)) {
    if (!relation.allied) continue;
    pairNationIds(key).forEach((nationId) => { allianceCounts[nationId] += 1; });
  }
  const allianceCandidates = Object.entries(snapshot.relations).map(([key, relation]) => {
    const nationIds = pairNationIds(key);
    const actions = relationActions[key] ?? relationActionFor({}, key);
    const agreed = mutualAction(nationIds, actions.alignmentSeekers)
      || reciprocalOffer(relation.alignmentOffer, actions.alignmentSeekers)
      || offerWasAccepted(relation.alignmentOffer, actions.alignmentAcceptors);
    return { key, nationIds, agreed, score: relation.relation + (relationDeltas[key]?.relation ?? 0) };
  }).filter((entry) => entry.agreed && !snapshot.relations[entry.key].allied && !snapshot.relations[entry.key].atWar)
    .sort((left, right) => right.score - left.score || left.key.localeCompare(right.key));
  const approvedAllianceKeys = new Set();
  for (const candidate of allianceCandidates) {
    if (candidate.nationIds.some((nationId) => allianceCounts[nationId] >= 2)) continue;
    approvedAllianceKeys.add(candidate.key);
    candidate.nationIds.forEach((nationId) => { allianceCounts[nationId] += 1; });
  }

  const nationStates = Object.fromEntries(runtime.nations.nations.map((nation) => {
    const current = snapshot.nationStates[nation.id];
    const delta = nationDeltas[nation.id] ?? {};
    const profile = profiles[nation.id];
    const readinessDrift = current.readiness > 48 ? -1 : 0;
    const foodDrift = current.foodSecurity < profile.foodBase ? 1 : current.foodSecurity > profile.foodBase + 8 ? -1 : 0;
    const decision = decisions.find((entry) => entry.nation.id === nation.id).decision;
    return [nation.id, {
      cohesion: rounded(current.cohesion + (delta.cohesion ?? 0)),
      reserves: rounded(current.reserves + 1 + (delta.reserves ?? 0)),
      foodSecurity: rounded(current.foodSecurity + foodDrift + (delta.foodSecurity ?? 0)),
      readiness: rounded(current.readiness + readinessDrift + (delta.readiness ?? 0)),
      offensiveIntent: rounded(current.offensiveIntent - (current.offensiveIntent > 35 ? 1 : 0) + (delta.offensiveIntent ?? 0)),
      posture: GEOPOLITICAL_PULL_SET[decision.pullId].posture,
      lastPullId: decision.pullId,
      lastTargetNationId: decision.targetNationId,
    }];
  }));

  const relations = Object.fromEntries(Object.entries(snapshot.relations).map(([key, current]) => {
    const delta = relationDeltas[key] ?? {};
    const actions = relationActions[key] ?? relationActionFor({}, key);
    const nationIds = pairNationIds(key);
    const warStarted = actions.warStarters.length > 0;
    const ceasefireAgreed = current.atWar && !warStarted && (
      mutualAction(nationIds, actions.ceasefireSeekers)
      || reciprocalOffer(current.ceasefireOffer, actions.ceasefireSeekers)
      || offerWasAccepted(current.ceasefireOffer, actions.ceasefireAcceptors)
    );
    const atWar = warStarted ? true : ceasefireAgreed ? false : current.atWar;
    const relation = Math.round(clamp(current.relation + (delta.relation ?? 0) + (current.trade >= 45 && !atWar ? 1 : 0), -100, 100));
    const tension = rounded(atWar ? Math.max(88, current.tension + (delta.tension ?? 0)) : current.tension - 1 + (delta.tension ?? 0));
    const allianceBroken = current.allied && (relation < 0 || tension >= 70);
    const allied = !atWar && !allianceBroken && (current.allied || approvedAllianceKeys.has(key));
    return [key, {
      relation,
      tension,
      trade: rounded(current.trade + (delta.trade ?? 0)),
      allied: atWar ? false : allied,
      atWar,
      crisisMonths: atWar ? current.crisisMonths : tension >= 55 ? current.crisisMonths + 1 : 0,
      warMonths: atWar ? (warStarted ? 1 : current.warMonths + 1) : 0,
      truceMonths: ceasefireAgreed ? 12 : Math.max(0, current.truceMonths - 1),
      alignmentOffer: nextOffer(current.alignmentOffer, actions.alignmentSeekers, actions.alignmentAcceptors,
        nationIds, atWar || allied || allianceBroken),
      ceasefireOffer: nextOffer(current.ceasefireOffer, actions.ceasefireSeekers, actions.ceasefireAcceptors,
        nationIds, !atWar || ceasefireAgreed),
    }];
  }));
  for (const { nation, decision } of decisions) {
    if (!decision.targetNationId) continue;
    const key = pairKey(nation.id, decision.targetNationId);
    const actions = relationActions[key] ?? relationActionFor({}, key);
    if (["seek_alignment", "accept_alignment"].includes(decision.pullId)) {
      decision.outcome = approvedAllianceKeys.has(key) ? "alliance_formed"
        : decision.pullId === "accept_alignment" ? "alliance_capacity" : "proposal_sent";
    }
    if (["seek_ceasefire", "accept_ceasefire"].includes(decision.pullId)) {
      const ended = snapshot.relations[key].atWar && !relations[key].atWar;
      decision.outcome = ended ? "ceasefire_formed"
        : decision.pullId === "accept_ceasefire" ? "ceasefire_pending" : "proposal_sent";
    }
    if (actions.warStarters.includes(nation.id)) decision.outcome = "war_started";
  }
  const events = decisions.map(({ nation, decision }) => eventCopy(period, nation, runtime.nationById.get(decision.targetNationId), decision));
  const pendingStrategicDecisions = decisions.map((entry) => entry.pendingDecision).filter(Boolean);
  return {
    schemaVersion: GEOPOLITICAL_SCHEMA_VERSION,
    establishedPeriod: snapshot.establishedPeriod,
    lastAdvancedPeriod: period,
    nationStates,
    relations,
    events: [...snapshot.events, ...events].slice(-MAX_EVENTS),
    pendingStrategicDecisions,
  };
}

export function applyApprovedGeopoliticalDecision(runtime, source, dateState, sourceDecision) {
  const pullId = sourceDecision?.pullId;
  if (!PLAYER_APPROVAL_PULL_IDS.has(pullId)) throw new RangeError("承認できる国家戦略判断ではありません。");
  const nation = runtime.nationById.get(sourceDecision?.nationId);
  const target = runtime.nationById.get(sourceDecision?.targetNationId);
  if (!nation || !target || nation.id === target.id) throw new Error("承認対象の国家関係が見つかりません。");

  const snapshot = createGeopoliticalWorldState(runtime, source, dateState);
  const key = pairKey(nation.id, target.id);
  const currentRelation = snapshot.relations[key];
  if (!currentRelation) throw new Error("承認対象の国家関係が見つかりません。");
  if (pullId === "limited_war" && currentRelation.atWar) throw new Error("対象国とはすでに交戦中です。");
  if (pullId === "limited_war" && currentRelation.truceMonths > 0) throw new Error("休戦期間中は限定戦争を開始できません。");
  if (["seek_ceasefire", "accept_ceasefire"].includes(pullId) && !currentRelation.atWar) throw new Error("対象国との戦争が継続していません。");
  if (pullId === "accept_ceasefire" && (
    currentRelation.ceasefireOffer?.from !== target.id
    || currentRelation.ceasefireOffer?.to !== nation.id
  )) throw new Error("対象国からの有効な停戦案がありません。");

  const decision = {
    nationId: nation.id,
    targetNationId: target.id,
    pullId,
    score: Number.isFinite(Number(sourceDecision.score)) ? Number(sourceDecision.score) : 100,
    drivers: [...(sourceDecision.drivers ?? []), driver("主権者承認", 100)],
  };
  const nationDeltas = {};
  const relationDeltas = {};
  const relationActions = {};
  applyDecisionEffects(decision, nation.id, nationDeltas, relationDeltas, relationActions);
  const nationDelta = nationDeltas[nation.id] ?? {};
  const relationDelta = relationDeltas[key] ?? {};
  const currentNation = snapshot.nationStates[nation.id];
  const nextNation = {
    ...currentNation,
    cohesion: rounded(currentNation.cohesion + (nationDelta.cohesion ?? 0)),
    reserves: rounded(currentNation.reserves + (nationDelta.reserves ?? 0)),
    foodSecurity: rounded(currentNation.foodSecurity + (nationDelta.foodSecurity ?? 0)),
    readiness: rounded(currentNation.readiness + (nationDelta.readiness ?? 0)),
    offensiveIntent: rounded(currentNation.offensiveIntent + (nationDelta.offensiveIntent ?? 0)),
    posture: GEOPOLITICAL_PULL_SET[pullId].posture,
    lastPullId: pullId,
    lastTargetNationId: target.id,
  };
  const nextRelation = {
    ...currentRelation,
    relation: Math.round(clamp(currentRelation.relation + (relationDelta.relation ?? 0), -100, 100)),
    tension: rounded(currentRelation.tension + (relationDelta.tension ?? 0)),
    trade: rounded(currentRelation.trade + (relationDelta.trade ?? 0)),
  };
  if (pullId === "limited_war") {
    nextRelation.atWar = true;
    nextRelation.allied = false;
    nextRelation.tension = Math.max(88, nextRelation.tension);
    nextRelation.warMonths = 1;
    nextRelation.truceMonths = 0;
    nextRelation.alignmentOffer = null;
    nextRelation.ceasefireOffer = null;
    decision.outcome = "war_started";
  } else if (pullId === "seek_ceasefire") {
    nextRelation.ceasefireOffer = { from: nation.id, to: target.id, monthsRemaining: 3 };
    decision.outcome = "proposal_sent";
  } else {
    nextRelation.atWar = false;
    nextRelation.warMonths = 0;
    nextRelation.crisisMonths = 0;
    nextRelation.truceMonths = Math.max(12, currentRelation.truceMonths ?? 0);
    nextRelation.ceasefireOffer = null;
    decision.outcome = "ceasefire_formed";
  }

  const approvalEvent = eventCopy(periodFor(dateState), nation, target, decision);
  return {
    ...snapshot,
    nationStates: { ...snapshot.nationStates, [nation.id]: nextNation },
    relations: { ...snapshot.relations, [key]: nextRelation },
    events: [...snapshot.events.filter((event) => event.id !== approvalEvent.id), approvalEvent].slice(-MAX_EVENTS),
  };
}

function relationStatus(relation) {
  if (relation.atWar) return "戦争";
  if (relation.allied && relation.tension >= 70) return "同盟危機";
  if (relation.allied && relation.tension >= 45) return "緊張同盟";
  if (relation.allied) return "同盟";
  if (relation.tension >= 70) return "危機";
  if (relation.tension >= 45) return "緊張";
  if (relation.relation >= 35) return "協調";
  return "平穏";
}

export function getGeopoliticalWorldView(runtime, source, dateState) {
  const geopolitics = createGeopoliticalWorldState(runtime, source, dateState);
  const profiles = deriveGeopoliticalProfiles(runtime);
  const pairs = derivePairStructures(runtime, profiles);
  const nations = runtime.nations.nations.map((nation) => {
    const context = strategicContext(nation.id, profiles, pairs, geopolitics);
    return {
      nation,
      profile: profiles[nation.id],
      condition: geopolitics.nationStates[nation.id],
      topThreat: context.topThreat ? {
        nation: runtime.nationById.get(context.topThreat.nationId),
        score: context.topThreat.score,
      } : null,
    };
  });
  const relations = Object.entries(geopolitics.relations).map(([key, relation]) => {
    const [leftId, rightId] = pairNationIds(key);
    return {
      key,
      nationIds: [leftId, rightId],
      nations: [runtime.nationById.get(leftId), runtime.nationById.get(rightId)],
      structure: pairs[key],
      ...relation,
      status: relationStatus(relation),
    };
  });
  return { geopolitics, profiles, nations, relations, events: [...geopolitics.events].reverse() };
}
