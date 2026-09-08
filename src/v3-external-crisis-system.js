import { fnv1aCharacters, unitFromHash } from "./determinism.js";
import { settlementLevelForPopulation } from "./nation-generation.js";
import { createStateReason } from "./state-reason-system.js";

export const V3_EXTERNAL_CRISIS_VERSION = 1;
export const V3_EXTERNAL_CRISIS_EVENT_LIMIT = 240;
export const V3_EXTERNAL_CRISIS_HISTORY_LIMIT = 120;
export const V3_EXTERNAL_CRISIS_ACTIVE_LIMIT = 12;

export const V3_EXTERNAL_CRISIS_DEFINITIONS = Object.freeze({
  flood: Object.freeze({
    id: "flood", category: "disaster", name: "大規模洪水", symbol: "洪", color: "#4e92ad",
    description: "河川と低湿地の増水が耕地・街道・集落を浸食している。",
    nationEffect: Object.freeze({ foodSecurity: -1.1, cohesion: -0.35, reserves: -0.8 }),
    populationLossRate: 0.00012, assetDamage: 0.8, maximumMonths: 12,
  }),
  wildfire: Object.freeze({
    id: "wildfire", category: "disaster", name: "広域山火事", symbol: "炎", color: "#c56a3f",
    description: "乾燥した森林の火勢が居住地と輸送路へ迫っている。",
    nationEffect: Object.freeze({ foodSecurity: -0.7, cohesion: -0.45, reserves: -0.7 }),
    populationLossRate: 0.0001, assetDamage: 0.7, maximumMonths: 12,
  }),
  famine: Object.freeze({
    id: "famine", category: "shortage", name: "地方飢饉", symbol: "飢", color: "#b89a4b",
    description: "不作と輸送不足が重なり、地方の食料供給が人口を支えられない。",
    nationEffect: Object.freeze({ foodSecurity: -1.8, cohesion: -1.1, reserves: -0.55 }),
    populationLossRate: 0.00022, assetDamage: 0, maximumMonths: 24,
  }),
  demon_raid: Object.freeze({
    id: "demon_raid", category: "incursion", name: "魔族襲撃", symbol: "魔", color: "#9b65b3",
    description: "魔的地点から組織化された襲撃勢力が集落と街道を圧迫している。",
    nationEffect: Object.freeze({ foodSecurity: -0.45, cohesion: -0.9, readiness: -1.2, sovereignty: -0.55 }),
    populationLossRate: 0.00016, assetDamage: 0.9, maximumMonths: 18,
  }),
});

const TYPE_IDS = Object.freeze(Object.keys(V3_EXTERNAL_CRISIS_DEFINITIONS));
const profileCache = new WeakMap();

const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const rounded = (value, digits = 2) => Number(Number(value).toFixed(digits));
const hashUnit = (seed, ...parts) => unitFromHash(fnv1aCharacters(`${seed}:${parts.join(":")}`));
const periodFor = (dateState = {}) => `${Number.isInteger(dateState.year) ? dateState.year : 317}-${Number.isInteger(dateState.month) ? dateState.month : 4}`;

function periodValue(dateState = {}) {
  return (Number.isInteger(dateState.year) ? dateState.year : 317) * 12
    + (Number.isInteger(dateState.month) ? dateState.month : 4) - 1;
}

function ownerNationId(runtime, generatedWorld, regionId) {
  return generatedWorld?.regionalDomains?.regionStates?.[regionId]?.nationId
    ?? runtime.regionById.get(regionId)?.nationId ?? null;
}

function activeWarForRegion(generatedWorld, nationId, regionId) {
  return (generatedWorld?.worldWars?.activeWars ?? []).some((war) => (
    war.targetRegionId === regionId || war.attackerNationId === nationId || war.defenderNationId === nationId
  ));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function bestTile(tiles, score) {
  return [...tiles].sort((left, right) => score(right) - score(left) || left.index - right.index)[0] ?? null;
}

function buildRegionProfiles(runtime) {
  const cached = profileCache.get(runtime);
  if (cached) return cached;
  const settlementByRegion = new Map();
  for (const object of runtime.nations.objects ?? []) {
    if (!object.settlementLevel) continue;
    if (!settlementByRegion.has(object.regionId)) settlementByRegion.set(object.regionId, []);
    settlementByRegion.get(object.regionId).push(object);
  }
  const profiles = Object.fromEntries((runtime.nations.regions ?? []).map((region) => {
    const tiles = (region.tileIndices ?? []).map((index) => runtime.tiles[index]).filter((tile) => tile?.passable);
    const settlements = settlementByRegion.get(region.id) ?? [];
    const floodScores = tiles.map((tile) => clamp((tile.floodRisk ?? 0) * 0.72 + (tile.soilMoisture ?? 0) * 0.2
      + (tile.geographyTags?.some((tag) => ["river", "delta", "marsh", "tidal_flat"].includes(tag)) ? 0.18 : 0), 0, 1));
    const fireScores = tiles.map((tile) => {
      const forest = tile.feature === "forest" || tile.geographyTags?.some((tag) => /forest/.test(tag));
      const dryness = clamp(1 - (Number(tile.precipitationMm) || 900) / 1450, 0, 1);
      const heat = clamp(((Number(tile.temperatureC) || 15) - 14) / 22, 0, 1);
      return forest ? clamp(0.24 + dryness * 0.52 + heat * 0.24, 0, 1) : 0;
    });
    const occultTiles = tiles.filter((tile) => ["ruins", "cave", "volcano", "crater", "floating_island"].includes(tile.terrainSite?.type)
      || tile.geographyTags?.some((tag) => ["ruins", "cave", "volcano", "caldera", "floating_island"].includes(tag)));
    const dungeonCount = settlements.filter((settlement) => settlement.functionIds?.includes("dungeon_city")).length;
    const averageFood = mean(tiles.map((tile) => Number(tile.yields?.food) || 0));
    const foodCapacity = clamp(averageFood / 2.4 * 0.55 + (Number(region.meanFertility) || 0) / 100 * 0.45, 0, 1);
    const marker = runtime.tiles[region.markerIndex] ?? runtime.tiles[region.anchorIndex] ?? tiles[0] ?? null;
    const floodOrigin = bestTile(tiles, (tile) => (tile.floodRisk ?? 0) * 2 + (tile.soilMoisture ?? 0));
    const wildfireOrigin = bestTile(tiles, (tile) => {
      const forest = tile.feature === "forest" || tile.geographyTags?.some((tag) => /forest/.test(tag));
      return (forest ? 2 : 0) + clamp(1 - (Number(tile.precipitationMm) || 900) / 1450, 0, 1);
    });
    const famineOrigin = settlements.length
      ? runtime.tiles[settlements.sort((left, right) => (right.population ?? 0) - (left.population ?? 0))[0].tileIndex]
      : bestTile(tiles, (tile) => -(Number(tile.yields?.food) || 0));
    const demonOrigin = occultTiles[0] ?? marker;
    return [region.id, {
      regionId: region.id,
      regionName: region.name,
      foodCapacity: rounded(foodCapacity, 3),
      floodExposure: rounded(Math.max(...floodScores, 0) * 0.65 + mean(floodScores) * 0.35, 3),
      wildfireExposure: rounded(Math.max(...fireScores, 0) * 0.65 + mean(fireScores) * 0.35, 3),
      occultExposure: rounded(clamp(occultTiles.length / Math.max(1, Math.min(5, tiles.length)) + dungeonCount * 0.3, 0, 1), 3),
      origins: {
        flood: floodOrigin?.index ?? marker?.index ?? null,
        wildfire: wildfireOrigin?.index ?? marker?.index ?? null,
        famine: famineOrigin?.index ?? marker?.index ?? null,
        demon_raid: demonOrigin?.index ?? marker?.index ?? null,
      },
    }];
  }));
  profileCache.set(runtime, profiles);
  return profiles;
}

function seasonalCycle(seed, regionId, typeId, dateState, cycleMonths) {
  const phase = hashUnit(seed, regionId, typeId, "fixed-phase") * Math.PI * 2;
  return 0.5 + Math.sin(periodValue(dateState) / cycleMonths * Math.PI * 2 + phase) * 0.5;
}

function crisisDrivers(runtime, generatedWorld, profile, typeId, dateState, activeCrises, grainSupply = null) {
  const seed = generatedWorld?.seed ?? runtime.terrain.seed ?? "v3-world";
  const nationId = ownerNationId(runtime, generatedWorld, profile.regionId);
  const condition = generatedWorld?.geopolitics?.nationStates?.[nationId] ?? {};
  const atWar = activeWarForRegion(generatedWorld, nationId, profile.regionId) ? 1 : 0;
  const naturalCrisis = activeCrises.some((crisis) => crisis.regionId === profile.regionId && ["flood", "wildfire"].includes(crisis.type)) ? 1 : 0;
  if (typeId === "flood") {
    const wetSeason = seasonalCycle(seed, profile.regionId, typeId, dateState, 12);
    return { exposure: profile.floodExposure, wetSeason, target: clamp(profile.floodExposure * 70 + wetSeason * 28) };
  }
  if (typeId === "wildfire") {
    const drySeason = seasonalCycle(seed, profile.regionId, typeId, dateState, 12);
    return { exposure: profile.wildfireExposure, drySeason, target: clamp(profile.wildfireExposure * 70 + drySeason * 30) };
  }
  if (typeId === "famine") {
    const foodShortage = clamp((66 - (Number.isFinite(condition.foodSecurity) ? condition.foodSecurity : 55)) / 42, 0, 1);
    const weakProduction = 1 - profile.foodCapacity;
    const target = clamp(foodShortage * 68 + weakProduction * 22 + atWar * 16 + naturalCrisis * 18);
    // Completed local deliveries can relieve famine even while national
    // institutions are still weak. Sustained supply lowers pressure gradually.
    const relief = Boolean(grainSupply && grainSupply.grainCoverageMonths >= 0.75 && grainSupply.grainUnmetShare <= 0.1);
    return { foodShortage, weakProduction, war: atWar, disaster: naturalCrisis,
      ...(grainSupply ? { ...grainSupply, supplyObserved: 1, supplyRelief: relief ? 1 : 0 } : {}),
      target: relief ? Math.min(20, target) : target };
  }
  const instability = clamp(((62 - (Number.isFinite(condition.cohesion) ? condition.cohesion : 55)) + (62 - (Number.isFinite(condition.readiness) ? condition.readiness : 55))) / 80, 0, 1);
  const abyssalTide = seasonalCycle(seed, profile.regionId, typeId, dateState, 18);
  return { occultSites: profile.occultExposure, instability, war: atWar, abyssalTide, target: clamp(profile.occultExposure * 58 + instability * 28 + atWar * 12 + abyssalTide * 24) };
}

function normalizedPressure(source, fallback, drivers) {
  return {
    value: rounded(clamp(Number(source?.value ?? fallback))),
    trend: ["rising", "falling", "stable"].includes(source?.trend) ? source.trend : "stable",
    cooldownMonths: Math.max(0, Math.round(Number(source?.cooldownMonths) || 0)),
    drivers: source?.drivers && typeof source.drivers === "object" ? { ...source.drivers } : { ...drivers },
  };
}

function normalizeCrisis(runtime, generatedWorld, source) {
  const definition = V3_EXTERNAL_CRISIS_DEFINITIONS[source?.type];
  if (!definition || !runtime.regionById.has(source.regionId)) return null;
  const profile = buildRegionProfiles(runtime)[source.regionId];
  const severity = Math.round(clamp(source.severity, 1, 5));
  return {
    id: String(source.id ?? `external-crisis:${definition.id}:${source.regionId}:${source.startedPeriod ?? "unknown"}`),
    type: definition.id,
    category: definition.category,
    name: definition.name,
    symbol: definition.symbol,
    color: definition.color,
    regionId: source.regionId,
    regionName: runtime.regionById.get(source.regionId)?.name ?? source.regionName ?? "不明地方",
    nationId: ownerNationId(runtime, generatedWorld, source.regionId),
    originTileIndex: Number.isInteger(source.originTileIndex) ? source.originTileIndex : profile?.origins?.[definition.id] ?? null,
    stage: ["outbreak", "active", "emergency", "recovering"].includes(source.stage) ? source.stage : "active",
    severity,
    pressure: rounded(clamp(source.pressure)),
    startedPeriod: typeof source.startedPeriod === "string" ? source.startedPeriod : null,
    endedPeriod: typeof source.endedPeriod === "string" ? source.endedPeriod : null,
    monthsActive: Math.max(1, Math.round(Number(source.monthsActive) || 1)),
    causes: Array.isArray(source.causes) ? source.causes.map(String).slice(0, 4) : [],
    description: definition.description,
    impact: crisisImpact(definition, severity),
  };
}

function crisisImpact(definition, severity) {
  const factor = 0.55 + severity * 0.22;
  return {
    nation: Object.fromEntries(Object.entries(definition.nationEffect).map(([field, value]) => [field, rounded(value * factor)])),
    populationLossRate: rounded(definition.populationLossRate * severity, 6),
    assetDamage: rounded(definition.assetDamage * severity, 2),
  };
}

function causeLabels(typeId, drivers) {
  const labels = [];
  if (typeId === "flood") {
    if (drivers.exposure >= 0.45) labels.push("河川・低湿地の洪水危険");
    if (drivers.wetSeason >= 0.6) labels.push("季節的な増水");
  } else if (typeId === "wildfire") {
    if (drivers.exposure >= 0.4) labels.push("乾燥森林の連続");
    if (drivers.drySeason >= 0.6) labels.push("乾期の進行");
  } else if (typeId === "famine") {
    if (drivers.supplyRelief) labels.push("地方市場への穀物補給で回復中");
    if (drivers.foodShortage >= 0.3) labels.push("国家食料安全度の低下");
    if (drivers.weakProduction >= 0.45) labels.push("地方生産力の不足");
    if (drivers.war) labels.push("戦争による輸送阻害");
    if (drivers.disaster) labels.push("災害による収穫損失");
  } else {
    if (drivers.occultSites >= 0.25) labels.push("遺跡・洞窟などの魔的拠点");
    if (drivers.instability >= 0.25) labels.push("治安・防衛の弱体化");
    if (drivers.war) labels.push("戦争による警戒網の空洞化");
    if (drivers.abyssalTide >= 0.65) labels.push("魔力潮の高まり");
  }
  return labels.length ? labels.slice(0, 4) : ["複数の低強度要因の蓄積"];
}

function crisisStage(pressure, severity, monthsActive) {
  if (pressure < 40) return "recovering";
  if (severity >= 4) return "emergency";
  return monthsActive <= 1 ? "outbreak" : "active";
}

function crisisEvent(crisis, period, outcome) {
  const outcomeLabel = { started: "発生", escalated: "深刻化", recovering: "回復局面", resolved: "終息" }[outcome] ?? "変化";
  return {
    id: `external-crisis:${period}:${crisis.id}:${outcome}`,
    type: "external_crisis",
    outcome,
    period,
    regionId: crisis.regionId,
    nationId: crisis.nationId,
    crisisType: crisis.type,
    severity: crisis.severity,
    title: `${crisis.regionName}で${crisis.name}${outcomeLabel}`,
    summary: outcome === "resolved"
      ? `${crisis.monthsActive}か月続いた${crisis.name}が終息した。`
      : `${crisis.causes.join("、")}により危機度${crisis.severity}。人口・国家条件・地域施設へ影響する。`,
  };
}

export function preserveV3ExternalCrisisState(source) {
  if (!source || typeof source !== "object") return null;
  return structuredClone(source);
}

export function createV3ExternalCrisisState(runtime, source = null, dateState = {}, generatedWorld = {}) {
  const period = periodFor(dateState);
  const profiles = buildRegionProfiles(runtime);
  const validSource = Number(source?.version) === V3_EXTERNAL_CRISIS_VERSION ? source : null;
  const activeCrises = (Array.isArray(validSource?.activeCrises) ? validSource.activeCrises : [])
    .map((crisis) => normalizeCrisis(runtime, generatedWorld, crisis)).filter(Boolean).slice(0, V3_EXTERNAL_CRISIS_ACTIVE_LIMIT);
  const regionalPressures = Object.fromEntries(Object.values(profiles).map((profile) => {
    const stored = validSource?.regionalPressures?.[profile.regionId] ?? {};
    return [profile.regionId, Object.fromEntries(TYPE_IDS.map((typeId) => {
      const drivers = crisisDrivers(runtime, generatedWorld, profile, typeId, dateState, activeCrises);
      return [typeId, normalizedPressure(stored[typeId], drivers.target * 0.35, drivers)];
    }))];
  }));
  return {
    version: V3_EXTERNAL_CRISIS_VERSION,
    establishedPeriod: validSource?.establishedPeriod ?? period,
    lastAdvancedPeriod: typeof validSource?.lastAdvancedPeriod === "string" ? validSource.lastAdvancedPeriod : null,
    regionalPressures,
    activeCrises,
    history: (Array.isArray(validSource?.history) ? validSource.history : [])
      .map((crisis) => normalizeCrisis(runtime, generatedWorld, crisis)).filter(Boolean).slice(-V3_EXTERNAL_CRISIS_HISTORY_LIMIT),
    events: (Array.isArray(validSource?.events) ? validSource.events : [])
      .filter((event) => event?.type === "external_crisis" && typeof event.id === "string").map((event) => ({ ...event })).slice(-V3_EXTERNAL_CRISIS_EVENT_LIMIT),
  };
}

export function getV3RegionalGrainSupply(marketEconomy) {
  const totals = {};
  for (const market of Object.values(marketEconomy?.settlements ?? {})) {
    if (!market.regionId || !market.goods?.grain) continue;
    const grain = market.goods.grain;
    const demand = Math.max(0, Number(grain.lastConsumption) || 0);
    totals[market.regionId] ??= { demand: 0, unmet: 0, inventory: 0 };
    totals[market.regionId].demand += demand;
    totals[market.regionId].unmet += Math.min(demand, Math.max(0, Number(grain.lastUnmetConsumption) || 0));
    totals[market.regionId].inventory += Math.max(0, Number(grain.inventory) || 0);
  }
  return Object.fromEntries(Object.entries(totals).filter(([, entry]) => entry.demand > 0).map(([id, entry]) => [id, {
    grainCoverageMonths: entry.inventory / entry.demand, grainUnmetShare: entry.unmet / entry.demand,
  }]));
}

export function advanceV3ExternalCrises(runtime, source, dateState = {}, generatedWorld = {}, options = {}) {
  const next = createV3ExternalCrisisState(runtime, source, dateState, generatedWorld);
  const period = periodFor(dateState);
  if (next.lastAdvancedPeriod === period) return next;
  const profiles = buildRegionProfiles(runtime);
  const previousActive = next.activeCrises;
  const grainSupplies = getV3RegionalGrainSupply(options.marketEconomy);
  for (const profile of Object.values(profiles)) {
    for (const typeId of TYPE_IDS) {
      const current = next.regionalPressures[profile.regionId][typeId];
      const drivers = crisisDrivers(runtime, generatedWorld, profile, typeId, dateState, previousActive, grainSupplies[profile.regionId]);
      const value = clamp(current.value * 0.74 + drivers.target * 0.26);
      current.trend = value > current.value + 0.35 ? "rising" : value < current.value - 0.35 ? "falling" : "stable";
      current.value = rounded(value);
      current.cooldownMonths = Math.max(0, current.cooldownMonths - 1);
      current.drivers = Object.fromEntries(Object.entries(drivers).map(([key, driver]) => [key, rounded(driver, 3)]));
    }
  }

  const events = [];
  const resolved = [];
  const updated = [];
  for (const sourceCrisis of previousActive) {
    const pressureState = next.regionalPressures[sourceCrisis.regionId]?.[sourceCrisis.type];
    if (!pressureState) continue;
    const definition = V3_EXTERNAL_CRISIS_DEFINITIONS[sourceCrisis.type];
    const monthsActive = sourceCrisis.monthsActive + 1;
    const severity = Math.round(clamp(1 + Math.floor(Math.max(0, pressureState.value - 48) / 11), 1, 5));
    const forcedRecovery = monthsActive >= definition.maximumMonths;
    const stage = forcedRecovery ? "recovering" : crisisStage(pressureState.value, severity, monthsActive);
    const crisis = normalizeCrisis(runtime, generatedWorld, {
      ...sourceCrisis,
      nationId: ownerNationId(runtime, generatedWorld, sourceCrisis.regionId),
      pressure: pressureState.value,
      severity,
      stage,
      monthsActive,
      causes: causeLabels(sourceCrisis.type, pressureState.drivers),
      impact: crisisImpact(definition, severity),
    });
    if ((pressureState.value < 28 && monthsActive >= 2) || (sourceCrisis.stage === "recovering" && forcedRecovery)) {
      resolved.push({ ...crisis, endedPeriod: period });
      events.push(crisisEvent(crisis, period, "resolved"));
      pressureState.value = Math.min(24, pressureState.value);
      pressureState.trend = "falling";
      pressureState.cooldownMonths = 6;
      continue;
    }
    if (stage === "recovering" && sourceCrisis.stage !== "recovering") events.push(crisisEvent(crisis, period, "recovering"));
    else if (severity > sourceCrisis.severity) events.push(crisisEvent(crisis, period, "escalated"));
    updated.push(crisis);
  }

  const activeSlotsByRegion = new Map();
  updated.forEach((crisis) => activeSlotsByRegion.set(crisis.regionId, (activeSlotsByRegion.get(crisis.regionId) ?? 0) + 1));
  const activeKeys = new Set(updated.map((crisis) => `${crisis.regionId}:${crisis.type}`));
  const candidates = Object.values(profiles).flatMap((profile) => TYPE_IDS.map((typeId) => ({
    profile,
    typeId,
    pressure: next.regionalPressures[profile.regionId][typeId].value,
  }))).filter((candidate) => candidate.pressure >= 52
    && next.regionalPressures[candidate.profile.regionId][candidate.typeId].cooldownMonths === 0
    && !activeKeys.has(`${candidate.profile.regionId}:${candidate.typeId}`))
    .sort((left, right) => right.pressure - left.pressure || left.profile.regionId.localeCompare(right.profile.regionId) || left.typeId.localeCompare(right.typeId));
  for (const candidate of candidates) {
    if (updated.length >= V3_EXTERNAL_CRISIS_ACTIVE_LIMIT) break;
    if ((activeSlotsByRegion.get(candidate.profile.regionId) ?? 0) >= 2) continue;
    const definition = V3_EXTERNAL_CRISIS_DEFINITIONS[candidate.typeId];
    const pressureState = next.regionalPressures[candidate.profile.regionId][candidate.typeId];
    const severity = Math.round(clamp(1 + Math.floor(Math.max(0, candidate.pressure - 48) / 11), 1, 5));
    const crisis = normalizeCrisis(runtime, generatedWorld, {
      id: `external-crisis:${candidate.typeId}:${candidate.profile.regionId}:${period}`,
      type: candidate.typeId,
      regionId: candidate.profile.regionId,
      originTileIndex: candidate.profile.origins[candidate.typeId],
      stage: "outbreak",
      severity,
      pressure: candidate.pressure,
      startedPeriod: period,
      monthsActive: 1,
      causes: causeLabels(candidate.typeId, pressureState.drivers),
      impact: crisisImpact(definition, severity),
    });
    updated.push(crisis);
    activeSlotsByRegion.set(candidate.profile.regionId, (activeSlotsByRegion.get(candidate.profile.regionId) ?? 0) + 1);
    events.push(crisisEvent(crisis, period, "started"));
  }
  next.activeCrises = updated;
  next.history = [...next.history, ...resolved].slice(-V3_EXTERNAL_CRISIS_HISTORY_LIMIT);
  next.events = [...next.events, ...events].slice(-V3_EXTERNAL_CRISIS_EVENT_LIMIT);
  next.lastAdvancedPeriod = period;
  return next;
}

function boundedCondition(value) {
  return Math.round(clamp(value, 0, 100));
}

export function applyV3ExternalCrisisConsequences(runtime, generatedWorld, crisisState, dateState = {}) {
  if (!crisisState?.activeCrises?.length) return generatedWorld;
  const period = periodFor(dateState);
  const nationEffects = {};
  const regionalLosses = {};
  const regionalDamage = {};
  for (const crisis of crisisState.activeCrises) {
    const nationId = ownerNationId(runtime, generatedWorld, crisis.regionId);
    if (nationId) {
      if (!nationEffects[nationId]) nationEffects[nationId] = { crisisIds: [], fields: {} };
      nationEffects[nationId].crisisIds.push(crisis.id);
      for (const [field, value] of Object.entries(crisis.impact.nation)) {
        nationEffects[nationId].fields[field] = (nationEffects[nationId].fields[field] ?? 0) + value;
      }
    }
    regionalLosses[crisis.regionId] = Math.min(0.008, (regionalLosses[crisis.regionId] ?? 0) + crisis.impact.populationLossRate);
    regionalDamage[crisis.regionId] = Math.min(12, (regionalDamage[crisis.regionId] ?? 0) + crisis.impact.assetDamage);
  }
  const geopolitics = generatedWorld.geopolitics ? structuredClone(generatedWorld.geopolitics) : null;
  if (geopolitics) {
    for (const [nationId, effect] of Object.entries(nationEffects)) {
      const condition = geopolitics.nationStates?.[nationId];
      if (!condition) continue;
      const nextCondition = { ...condition };
      for (const [field, value] of Object.entries(effect.fields)) {
        const cappedImpact = Math.max(-6, Math.min(0, value));
        nextCondition[field] = boundedCondition((Number(nextCondition[field]) || 0) + cappedImpact);
      }
      nextCondition.stateReason = createStateReason(nextCondition, condition.stateReason);
      nextCondition.lastExternalCrisisImpact = {
        period,
        crisisIds: effect.crisisIds.slice(0, 8),
        fields: Object.fromEntries(Object.entries(effect.fields).map(([field, value]) => [field, rounded(Math.max(-6, value))])),
      };
      geopolitics.nationStates[nationId] = nextCondition;
    }
  }
  const regionalDomains = generatedWorld.regionalDomains ? structuredClone(generatedWorld.regionalDomains) : null;
  if (regionalDomains) {
    for (const object of runtime.nations.objects.filter((entry) => entry.settlementLevel)) {
      const lossRate = regionalLosses[object.regionId] ?? 0;
      const settlement = regionalDomains.settlementStates?.[object.id];
      if (!settlement || lossRate <= 0) continue;
      settlement.population = Math.max(1, Math.round(settlement.population * (1 - lossRate)));
      settlement.level = settlementLevelForPopulation(settlement.population);
    }
    for (const asset of Object.values(regionalDomains.assetStates ?? {})) {
      const damage = regionalDamage[asset.regionId] ?? 0;
      if (damage <= 0) continue;
      asset.condition = rounded(clamp(asset.condition - damage));
      asset.available = asset.condition > 0;
      asset.lastDamagedPeriod = period;
    }
  }
  return { ...generatedWorld, ...(geopolitics ? { geopolitics } : {}), ...(regionalDomains ? { regionalDomains } : {}) };
}

export function getV3ExternalCrisisView(runtime, crisisState, dateState = {}, generatedWorld = {}) {
  const state = createV3ExternalCrisisState(runtime, crisisState, dateState, generatedWorld);
  return {
    period: periodFor(dateState),
    active: state.activeCrises.map((crisis) => ({ ...crisis, pressureTrend: state.regionalPressures[crisis.regionId]?.[crisis.type]?.trend ?? "stable" })),
    history: state.history,
    events: state.events,
    regionalPressures: state.regionalPressures,
  };
}

export function getV3ExternalCrisisMarketEffect(crisisState, nationId, regionId = null) {
  const crises = (crisisState?.activeCrises ?? []).filter((crisis) => (
    (nationId != null && crisis.nationId === nationId) || (regionId != null && crisis.regionId === regionId)
  ));
  if (!crises.length) return null;
  const multipliers = { grain: 1, timber: 1, herbs: 1, iron: 1, wool: 1, salt: 1 };
  const stock = { grain: 1, timber: 1, herbs: 1, iron: 1, wool: 1, salt: 1 };
  let pressure = 1;
  for (const crisis of crises) {
    const localWeight = crisis.regionId === regionId ? 1 : 0.45;
    const severity = crisis.severity * localWeight;
    pressure *= 1 + severity * 0.008;
    if (["flood", "wildfire", "famine"].includes(crisis.type)) {
      multipliers.grain *= 1 + severity * (crisis.type === "famine" ? 0.055 : 0.028);
      stock.grain *= 1 - Math.min(0.55, severity * (crisis.type === "famine" ? 0.065 : 0.035));
    }
    if (crisis.type === "wildfire") {
      multipliers.timber *= 1 + severity * 0.045;
      stock.timber *= 1 - Math.min(0.45, severity * 0.05);
    }
    if (crisis.type === "demon_raid") {
      multipliers.iron *= 1 + severity * 0.035;
      multipliers.herbs *= 1 + severity * 0.028;
      stock.iron *= 1 - Math.min(0.4, severity * 0.04);
      stock.herbs *= 1 - Math.min(0.35, severity * 0.035);
    }
  }
  return {
    id: `external-crisis-market:${crises.map((crisis) => crisis.id).sort().join("+")}`,
    effectId: "external_crisis_scarcity",
    name: crises.map((crisis) => crisis.name).filter((name, index, names) => names.indexOf(name) === index).join("・"),
    symbol: "危",
    severity: rounded(Math.min(5, crises.reduce((sum, crisis) => sum + crisis.severity * (crisis.regionId === regionId ? 1 : 0.45), 0))),
    crisisIds: crises.map((crisis) => crisis.id),
    priceMultiplier: rounded(pressure, 4),
    commodityPriceMultipliers: Object.fromEntries(Object.entries(multipliers).map(([id, value]) => [id, rounded(value, 4)])),
    commodityStockMultipliers: Object.fromEntries(Object.entries(stock).map(([id, value]) => [id, rounded(Math.max(0.2, value), 4)])),
    summary: `${crises.map((crisis) => `${crisis.regionName}の${crisis.name}`).join("、")}が輸送と供給を圧迫している。`,
  };
}
