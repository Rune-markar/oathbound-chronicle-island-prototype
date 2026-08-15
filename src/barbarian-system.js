import { requireRaceDefinition } from "./race-list.js";

export const BARBARIAN_SCHEMA_VERSION = 1;
export const BARBARIAN_EVENT_LIMIT = 240;
export const BARBARIAN_SITE_LIMIT = 48;

export const BARBARIAN_RESPONSE_LEVELS = Object.freeze({
  village: Object.freeze({ id: "village", name: "村落対応", next: "town" }),
  town: Object.freeze({ id: "town", name: "町・都市対応", next: "nation" }),
  nation: Object.freeze({ id: "nation", name: "国家命令", next: "nation" }),
});

export const BARBARIAN_AGREEMENTS = Object.freeze({
  tribute: Object.freeze({ id: "tribute", name: "納税・貢納", months: null, payment: 1 }),
  non_aggression: Object.freeze({ id: "non_aggression", name: "不可侵協定", months: 12, payment: 0 }),
});

export const BARBARIAN_DEVELOPMENT_MONTHS = Object.freeze({
  village: 4,
  town: 8,
});

const MONSTER_ARCHETYPES = Object.freeze([
  Object.freeze({ id: "dire_wolf", name: "魔狼", nestName: "魔狼の巣", baseStrength: 34 }),
  Object.freeze({ id: "wyvern", name: "飛竜", nestName: "飛竜の営巣地", baseStrength: 58 }),
  Object.freeze({ id: "giant_spider", name: "大蜘蛛", nestName: "大蜘蛛の巣穴", baseStrength: 42 }),
  Object.freeze({ id: "ooze_swarm", name: "魔粘体", nestName: "魔粘体の繁殖沼", baseStrength: 30 }),
]);

const INTELLIGENT_ARCHETYPES = Object.freeze([
  Object.freeze({ raceId: "demon", stem: "契角" }),
  Object.freeze({ raceId: "goblin", stem: "鉄屑" }),
  Object.freeze({ raceId: "orc", stem: "赤牙" }),
  Object.freeze({ raceId: "vampire", stem: "夜帳" }),
]);

const clone = (value) => structuredClone(value);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));

function periodFor(dateState) {
  const year = Number.isInteger(dateState?.year) ? dateState.year : 317;
  const month = Number.isInteger(dateState?.month) ? dateState.month : 4;
  return `${year}-${month}`;
}

function hashText(text) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(seed, ...values) {
  return hashText(`${seed}:${values.join(":")}`) / 4294967295;
}

function tileDistance(runtime, left, right) {
  const directX = Math.abs(left.x - right.x);
  const dx = runtime.terrain.config.wrapX ? Math.min(directX, runtime.terrain.width - directX) : directX;
  return Math.abs(dx) + Math.abs(left.y - right.y);
}

function visualDistance(runtime, left, right) {
  const directX = Math.abs(left.x - right.x);
  const dx = runtime.terrain.config.wrapX ? Math.min(directX, runtime.terrain.width - directX) : directX;
  return Math.hypot(dx, left.y - right.y);
}

function tileById(runtime, tileId) {
  return runtime.tiles.find((tile) => tile.id === tileId) ?? null;
}

function currentNationId(runtime, regionId) {
  return runtime.regionById.get(regionId)?.nationId ?? null;
}

function settlementSuffix(level) {
  return level === "city" ? "自由市" : level === "town" ? "町" : "村";
}

function siteDisplayName(site) {
  if (site.kind === "monster_nest") return site.baseName;
  return `${site.baseName}${settlementSuffix(site.settlementLevel)}`;
}

function agreementActive(site) {
  if (!site.agreement) return false;
  return site.agreement.type === "tribute" || site.agreement.monthsRemaining > 0;
}

function candidateSiteTile(runtime, siteIndex, existingSites, kind) {
  const seed = runtime.terrain.seed;
  const occupiedTiles = runtime.nations.objects.map((object) => runtime.tiles[object.tileIndex]).filter(Boolean);
  const previousTiles = existingSites.map((site) => tileById(runtime, site.tileId)).filter(Boolean);
  const regionOrder = [...runtime.nations.regions].sort((left, right) => {
    const leftScore = (left.uninhabited ? 60 : 0) + (left.frontier ? 18 : 0) + hashUnit(seed, siteIndex, left.index, kind, "region") * 30;
    const rightScore = (right.uninhabited ? 60 : 0) + (right.frontier ? 18 : 0) + hashUnit(seed, siteIndex, right.index, kind, "region") * 30;
    return rightScore - leftScore || left.index - right.index;
  });
  for (const minimumSpacing of [5, 4, 3]) {
    for (const region of regionOrder) {
      const candidates = region.tileIndices.map((index) => runtime.tiles[index]).filter((tile) => (
        tile?.passable
        && tile.relief !== "mountains"
        && !tile.worldObjectIds?.length
        && occupiedTiles.every((occupied) => visualDistance(runtime, tile, occupied) >= minimumSpacing)
        && previousTiles.every((occupied) => visualDistance(runtime, tile, occupied) >= minimumSpacing + 2)
      )).sort((left, right) => {
        const leftScore = left.defense * (kind === "monster_nest" ? 10 : 4) + left.resourcePotential.food * 5
          + hashUnit(seed, siteIndex, left.index, kind, "tile") * 20;
        const rightScore = right.defense * (kind === "monster_nest" ? 10 : 4) + right.resourcePotential.food * 5
          + hashUnit(seed, siteIndex, right.index, kind, "tile") * 20;
        return rightScore - leftScore || left.index - right.index;
      });
      if (candidates[0]) return candidates[0];
    }
  }
  return runtime.tiles.find((tile) => tile.passable && !tile.worldObjectIds?.length) ?? null;
}

function createSite(runtime, siteIndex, existingSites, period, forcedKind = null) {
  const kind = forcedKind ?? (siteIndex % 2 === 0 ? "monster_nest" : "intelligent_barbarians");
  const tile = candidateSiteTile(runtime, siteIndex, existingSites, kind);
  if (!tile?.regionId) return null;
  const seed = runtime.terrain.seed;
  if (kind === "monster_nest") {
    const archetype = MONSTER_ARCHETYPES[siteIndex % MONSTER_ARCHETYPES.length];
    const strength = Math.round(archetype.baseStrength * (0.82 + hashUnit(seed, siteIndex, "monster-strength") * 0.5));
    return {
      id: `barbarian-${siteIndex + 1}`,
      kind,
      speciesId: archetype.id,
      speciesName: archetype.name,
      peopleId: null,
      peopleName: null,
      baseName: archetype.nestName,
      name: archetype.nestName,
      tileId: tile.id,
      regionId: tile.regionId,
      hostNationId: currentNationId(runtime, tile.regionId),
      status: "active",
      settlementLevel: null,
      population: 0,
      strength,
      tradeValue: 0,
      ageMonths: 0,
      stageMonths: 0,
      detectionMonthsRemaining: 0,
      detected: true,
      responseLevel: "village",
      responseCooldownMonths: 0,
      failedResponses: 0,
      agreement: null,
      cumulativeDamage: 0,
      foundedPeriod: period,
      lastResponsePeriod: null,
      cityStateId: null,
    };
  }
  const archetype = INTELLIGENT_ARCHETYPES[siteIndex % INTELLIGENT_ARCHETYPES.length];
  const race = requireRaceDefinition(archetype.raceId);
  const baseName = `${archetype.stem}${siteIndex + 1}`;
  const population = Math.round(540 + hashUnit(seed, siteIndex, "barbarian-population") * 760);
  const strength = Math.round(36 + hashUnit(seed, siteIndex, "barbarian-strength") * 54);
  return {
    id: `barbarian-${siteIndex + 1}`,
    kind,
    speciesId: race.id,
    speciesName: race.name,
    peopleId: race.id,
    peopleName: race.name,
    baseName,
    name: `${baseName}村`,
    tileId: tile.id,
    regionId: tile.regionId,
    hostNationId: currentNationId(runtime, tile.regionId),
    status: "active",
    settlementLevel: "village",
    population,
    strength,
    tradeValue: Math.round(28 + hashUnit(seed, siteIndex, "barbarian-trade") * 64),
    ageMonths: 0,
    stageMonths: 0,
    detectionMonthsRemaining: 4 + Math.floor(hashUnit(seed, siteIndex, "barbarian-detection") * 5),
    detected: false,
    responseLevel: "village",
    responseCooldownMonths: 0,
    failedResponses: 0,
    agreement: null,
    cumulativeDamage: 0,
    foundedPeriod: period,
    lastResponsePeriod: null,
    cityStateId: null,
  };
}

function initialSites(runtime, period) {
  const count = Math.min(6, Math.max(2, Math.round(runtime.nations.regions.length / 14)));
  const sites = [];
  for (let index = 0; index < count; index += 1) {
    const site = createSite(runtime, index, sites, period);
    if (site) sites.push(site);
  }
  return sites;
}

export function preserveBarbarianState(source) {
  if (!source || typeof source !== "object") return null;
  return {
    schemaVersion: BARBARIAN_SCHEMA_VERSION,
    establishedPeriod: typeof source.establishedPeriod === "string" ? source.establishedPeriod : null,
    lastAdvancedPeriod: typeof source.lastAdvancedPeriod === "string" ? source.lastAdvancedPeriod : null,
    sites: clone(Array.isArray(source.sites) ? source.sites.slice(0, BARBARIAN_SITE_LIMIT) : []),
    events: clone(Array.isArray(source.events) ? source.events.slice(-BARBARIAN_EVENT_LIMIT) : []),
  };
}

function normalizeAgreement(source, hostNationId, period) {
  if (!source || !BARBARIAN_AGREEMENTS[source.type]) return null;
  const definition = BARBARIAN_AGREEMENTS[source.type];
  return {
    type: definition.id,
    nationId: typeof source.nationId === "string" ? source.nationId : hostNationId,
    startedPeriod: typeof source.startedPeriod === "string" ? source.startedPeriod : period,
    monthsRemaining: definition.months === null ? null : Math.round(clamp(source.monthsRemaining, 0, definition.months)),
    payment: definition.payment,
  };
}

function normalizeSite(runtime, source, index, period) {
  if (!source || typeof source !== "object") return null;
  const tile = tileById(runtime, source.tileId);
  if (!tile?.passable || !tile.regionId) return null;
  const kind = source.kind === "monster_nest" ? "monster_nest" : "intelligent_barbarians";
  const settlementLevel = kind === "monster_nest" ? null : ["village", "town", "city"].includes(source.settlementLevel) ? source.settlementLevel : "village";
  const status = source.status === "destroyed" ? "destroyed" : settlementLevel === "city" ? "city_state" : "active";
  const hostNationId = currentNationId(runtime, tile.regionId);
  const site = {
    id: typeof source.id === "string" ? source.id : `barbarian-${index + 1}`,
    kind,
    speciesId: typeof source.speciesId === "string" ? source.speciesId : kind === "monster_nest" ? "unknown_monster" : "demon",
    speciesName: typeof source.speciesName === "string" ? source.speciesName : kind === "monster_nest" ? "魔物" : "知性ある魔族",
    peopleId: kind === "monster_nest" ? null : typeof source.peopleId === "string" ? source.peopleId : source.speciesId ?? "demon",
    peopleName: kind === "monster_nest" ? null : typeof source.peopleName === "string" ? source.peopleName : source.speciesName ?? "知性ある魔族",
    baseName: String(source.baseName ?? source.name ?? (kind === "monster_nest" ? "魔物の巣" : `辺境${index + 1}`)).replace(/[村町市]$/, "").slice(0, 48),
    name: "",
    tileId: tile.id,
    regionId: tile.regionId,
    hostNationId,
    status,
    settlementLevel,
    population: kind === "monster_nest" ? 0 : Math.round(clamp(source.population, 1, 500000)),
    strength: Math.round(clamp(source.strength, 1, 300)),
    tradeValue: kind === "monster_nest" ? 0 : Math.round(clamp(source.tradeValue, 0, 100)),
    ageMonths: Math.round(clamp(source.ageMonths, 0, 1200)),
    stageMonths: Math.round(clamp(source.stageMonths, 0, 1200)),
    detectionMonthsRemaining: Math.round(clamp(source.detectionMonthsRemaining, 0, 120)),
    detected: kind === "monster_nest" || source.detected === true || Number(source.detectionMonthsRemaining) <= 0,
    responseLevel: BARBARIAN_RESPONSE_LEVELS[source.responseLevel] ? source.responseLevel : "village",
    responseCooldownMonths: Math.round(clamp(source.responseCooldownMonths, 0, 24)),
    failedResponses: Math.round(clamp(source.failedResponses, 0, 120)),
    agreement: null,
    cumulativeDamage: Math.round(clamp(source.cumulativeDamage, 0, Number.MAX_SAFE_INTEGER)),
    foundedPeriod: typeof source.foundedPeriod === "string" ? source.foundedPeriod : period,
    lastResponsePeriod: typeof source.lastResponsePeriod === "string" ? source.lastResponsePeriod : null,
    cityStateId: settlementLevel === "city" ? source.cityStateId ?? `city-state-${source.id ?? index + 1}` : null,
  };
  site.agreement = normalizeAgreement(source.agreement, hostNationId, period);
  site.name = siteDisplayName(site);
  return site;
}

export function createBarbarianWorldState(runtime, source = null, dateState = null) {
  if (!runtime?.terrain || !runtime?.nations?.regions || !runtime?.tiles) throw new TypeError("Barbarian frontier requires a generated-world runtime.");
  const period = periodFor(dateState);
  const preserved = preserveBarbarianState(source);
  const sites = preserved
    ? preserved.sites.map((site, index) => normalizeSite(runtime, site, index, period)).filter(Boolean)
    : initialSites(runtime, period);
  return {
    schemaVersion: BARBARIAN_SCHEMA_VERSION,
    establishedPeriod: preserved?.establishedPeriod ?? period,
    lastAdvancedPeriod: preserved?.lastAdvancedPeriod ?? null,
    sites,
    events: (preserved?.events ?? []).filter((event) => event && typeof event.id === "string").slice(-BARBARIAN_EVENT_LIMIT),
  };
}

function responseTarget(runtime, site, responseLevel) {
  const siteTile = tileById(runtime, site.tileId);
  if (responseLevel === "nation") {
    const nation = runtime.nationById.get(site.hostNationId);
    return nation ? { id: nation.id, name: nation.name, population: nation.populationPotential ?? 0, nation } : null;
  }
  const levels = responseLevel === "village" ? new Set(["village"]) : new Set(["town", "city"]);
  const candidates = runtime.nations.objects.filter((object) => (
    object.nationId === site.hostNationId && levels.has(object.settlementLevel)
  )).map((object) => ({ object, tile: runtime.tiles[object.tileIndex] })).filter((entry) => entry.tile)
    .sort((left, right) => tileDistance(runtime, siteTile, left.tile) - tileDistance(runtime, siteTile, right.tile) || left.object.id.localeCompare(right.object.id));
  const sameRegion = candidates.find((entry) => entry.object.regionId === site.regionId);
  const selected = sameRegion ?? candidates[0];
  return selected ? { id: selected.object.id, name: selected.object.name, population: selected.object.population ?? 0, object: selected.object } : null;
}

function responseCapability(site, responseLevel, responder, context) {
  if (!responder) return 0;
  if (responseLevel === "village") return 10 + Math.sqrt(Math.max(1, responder.population)) * 0.42;
  if (responseLevel === "town") return 24 + Math.sqrt(Math.max(1, responder.population)) * 0.48;
  const condition = context?.geopolitics?.nationStates?.[site.hostNationId] ?? {};
  return 38 + (responder.nation?.nationLevel ?? 1) * 6 + (condition.readiness ?? 50) * 0.32 + (condition.cohesion ?? 50) * 0.16;
}

function siteThreat(site) {
  const settlementPressure = site.kind === "monster_nest" ? 0 : site.settlementLevel === "city" ? 34 : site.settlementLevel === "town" ? 18 : 8;
  return site.strength + settlementPressure;
}

function monsterDamage(runtime, site, period) {
  const siteTile = tileById(runtime, site.tileId);
  const targets = runtime.nations.objects.filter((object) => object.settlementLevel && object.nationId === site.hostNationId)
    .map((object) => ({ object, tile: runtime.tiles[object.tileIndex] }))
    .filter((entry) => entry.tile && tileDistance(runtime, siteTile, entry.tile) <= 16)
    .sort((left, right) => tileDistance(runtime, siteTile, left.tile) - tileDistance(runtime, siteTile, right.tile) || left.object.id.localeCompare(right.object.id))
    .slice(0, 2);
  const impacts = targets.map(({ object }, index) => ({
    settlementId: object.id,
    settlementName: object.name,
    populationLoss: Math.max(1, Math.min(Math.round((object.population ?? 1) * 0.025), Math.round(site.strength * (0.5 - index * 0.12)))),
  }));
  const totalLoss = impacts.reduce((sum, impact) => sum + impact.populationLoss, 0);
  return {
    id: `barbarian-damage-${period}-${site.id}`,
    type: "monster_damage",
    tone: "danger",
    period,
    siteId: site.id,
    nationId: site.hostNationId,
    regionId: site.regionId,
    title: `${site.name}が周辺を襲撃`,
    summary: impacts.length
      ? `${impacts.map((impact) => `${impact.settlementName}で人口-${impact.populationLoss}`).join("、")}。魔物の巣を放置した実害です。`
      : "周辺街道と採集地が荒らされ、地域交通が阻害されました。",
    impacts,
    totalPopulationLoss: totalLoss,
  };
}

function developmentEvent(site, period, fromLevel) {
  return {
    id: `barbarian-development-${period}-${site.id}-${site.settlementLevel}`,
    type: "barbarian_development",
    tone: site.settlementLevel === "city" ? "danger" : "warning",
    period,
    siteId: site.id,
    nationId: site.hostNationId,
    regionId: site.regionId,
    fromLevel,
    toLevel: site.settlementLevel,
    title: site.settlementLevel === "city" ? `${site.name}が都市国家を建国` : `${site.name}へ発展`,
    summary: site.settlementLevel === "city"
      ? `${site.peopleName}の無管理都市が独自の統治権を宣言しました。取引がなければ国家命令の対象です。`
      : `${site.peopleName}の拠点が人口${site.population.toLocaleString("ja-JP")}へ成長しました。`,
  };
}

function advanceIntelligentDevelopment(site, period, events) {
  if (site.kind !== "intelligent_barbarians" || site.status === "destroyed" || site.settlementLevel === "city") return;
  site.stageMonths += 1;
  site.population = Math.max(1, Math.round(site.population * (agreementActive(site) ? 1.08 : 1.11)));
  site.strength = Math.min(300, site.strength + (site.settlementLevel === "town" ? 3 : 2));
  const required = BARBARIAN_DEVELOPMENT_MONTHS[site.settlementLevel];
  if (site.stageMonths < required) return;
  const fromLevel = site.settlementLevel;
  site.settlementLevel = fromLevel === "village" ? "town" : "city";
  site.stageMonths = 0;
  site.population = Math.max(site.settlementLevel === "town" ? 2500 : 10000, site.population);
  if (site.settlementLevel === "city") {
    site.status = "city_state";
    site.cityStateId = `city-state-${site.id}`;
  }
  site.name = siteDisplayName(site);
  events.push(developmentEvent(site, period, fromLevel));
}

function agreementEvent(site, period, type, automatic = false) {
  const definition = BARBARIAN_AGREEMENTS[type];
  return {
    id: `barbarian-agreement-${period}-${site.id}-${type}`,
    type: "barbarian_agreement",
    tone: "positive",
    period,
    siteId: site.id,
    nationId: site.hostNationId,
    regionId: site.regionId,
    agreementType: type,
    title: `${site.name}と${definition.name}`,
    summary: type === "tribute"
      ? `都市国家が宗主国へ毎月の税を納め、討伐対象から除外されました${automatic ? "。国家AIが交易価値を優先しました" : ""}。`
      : `双方が${definition.months}か月の不可侵を約し、討伐命令を停止しました${automatic ? "。国家AIが損害回避を優先しました" : ""}。`,
  };
}

function installAgreement(site, type, period) {
  const definition = BARBARIAN_AGREEMENTS[type];
  site.agreement = {
    type,
    nationId: site.hostNationId,
    startedPeriod: period,
    monthsRemaining: definition.months,
    payment: definition.payment,
  };
}

function maybeAutomaticAgreement(runtime, site, period, events) {
  if (site.status !== "city_state" || agreementActive(site) || site.responseLevel !== "nation") return false;
  const nation = runtime.nationById.get(site.hostNationId);
  if (!nation) return false;
  const score = site.tradeValue + (nation.nationLevel ?? 1) * 4 + hashUnit(runtime.terrain.seed, period, site.id, "agreement") * 45;
  if (score < 92) return false;
  const type = site.tradeValue >= site.strength * 0.75 ? "tribute" : "non_aggression";
  installAgreement(site, type, period);
  events.push(agreementEvent(site, period, type, true));
  return true;
}

function honorAgreement(site, period, events) {
  if (!agreementActive(site)) return false;
  const definition = BARBARIAN_AGREEMENTS[site.agreement.type];
  if (site.agreement.type === "tribute") {
    events.push({
      id: `barbarian-tribute-${period}-${site.id}`,
      type: "barbarian_tribute",
      tone: "positive",
      period,
      siteId: site.id,
      nationId: site.hostNationId,
      regionId: site.regionId,
      reserveDelta: definition.payment,
      title: `${site.name}が税を納付`,
      summary: `国家備蓄+${definition.payment}。納税を続ける限り、無管理勢力への討伐命令は停止されます。`,
    });
  } else {
    site.agreement.monthsRemaining = Math.max(0, site.agreement.monthsRemaining - 1);
    if (site.agreement.monthsRemaining === 0) {
      events.push({
        id: `barbarian-agreement-expired-${period}-${site.id}`,
        type: "barbarian_agreement_expired",
        tone: "warning",
        period,
        siteId: site.id,
        nationId: site.hostNationId,
        regionId: site.regionId,
        title: `${site.name}との不可侵協定が満了`,
        summary: "次月から再び村落・町・国家の討伐判断対象になります。",
      });
      site.agreement = null;
    }
  }
  return true;
}

function attemptResponse(runtime, site, period, context) {
  const responseLevel = site.responseLevel;
  const responder = responseTarget(runtime, site, responseLevel);
  const capability = responseCapability(site, responseLevel, responder, context);
  const roll = capability * (0.82 + hashUnit(runtime.terrain.seed, period, site.id, responseLevel, "response") * 0.36);
  const threat = siteThreat(site);
  const success = Boolean(responder) && roll >= threat;
  const definition = BARBARIAN_RESPONSE_LEVELS[responseLevel];
  site.lastResponsePeriod = period;
  if (success) {
    site.status = "destroyed";
    site.agreement = null;
  } else {
    site.failedResponses += 1;
    site.responseLevel = definition.next;
    site.responseCooldownMonths = 2;
    site.strength = Math.max(1, site.strength - Math.round(capability * 0.05));
  }
  return {
    id: `barbarian-response-${period}-${site.id}-${responseLevel}`,
    type: "barbarian_response",
    tone: success ? "positive" : "danger",
    period,
    siteId: site.id,
    nationId: site.hostNationId,
    regionId: site.regionId,
    responseLevel,
    responderId: responder?.id ?? null,
    responderName: responder?.name ?? "対応可能な拠点なし",
    capability: Math.round(capability),
    threat: Math.round(threat),
    outcome: success ? "destroyed" : "failed",
    title: success ? `${definition.name}で${site.name}を排除` : `${definition.name}が失敗` ,
    summary: success
      ? `${responder.name}が脅威を排除しました。`
      : `${responder?.name ?? "周辺勢力"}では対処できず、${BARBARIAN_RESPONSE_LEVELS[site.responseLevel].name}へ上申されました。`,
  };
}

function maybeSpawnSite(runtime, state, period, events, context = {}) {
  const activeCount = state.sites.filter((site) => site.status !== "destroyed").length;
  const maximum = Math.min(12, Math.max(3, Math.ceil(runtime.nations.regions.length / 8)));
  if (activeCount >= maximum || state.sites.length >= BARBARIAN_SITE_LIMIT) return;
  if (hashUnit(runtime.terrain.seed, period, "barbarian-spawn") >= 0.16) return;
  const site = createSite(runtime, state.sites.length, state.sites, period);
  if (!site) return;
  const activeRegionIds = context.simulationFidelity?.activeIndividualRegionIds;
  if (activeRegionIds && !activeRegionIds.includes(site.regionId)) return;
  state.sites.push(site);
  events.push({
    id: `barbarian-spawn-${period}-${site.id}`,
    type: "barbarian_spawn",
    tone: "warning",
    period,
    siteId: site.id,
    nationId: site.hostNationId,
    regionId: site.regionId,
    title: site.kind === "monster_nest" ? `${site.name}が発生` : `${site.name}が定着`,
    summary: site.kind === "monster_nest" ? "周辺集落へ実害を与える魔物の巣です。" : "知性ある勢力が国家管理外の村を築きました。",
  });
}

export function advanceBarbarianWorld(runtime, source = null, dateState = null, context = {}) {
  const next = createBarbarianWorldState(runtime, source, dateState);
  const period = periodFor(dateState);
  if (next.lastAdvancedPeriod === period) return next;
  const events = [];
  const activeRegionIds = context.simulationFidelity?.activeIndividualRegionIds
    ? new Set(context.simulationFidelity.activeIndividualRegionIds)
    : null;
  for (const site of next.sites) {
    if (site.status === "destroyed") continue;
    site.hostNationId = currentNationId(runtime, site.regionId);
    if (site.agreement && site.agreement.nationId !== site.hostNationId) site.agreement = null;
    if (activeRegionIds && !activeRegionIds.has(site.regionId)) continue;
    site.ageMonths += 1;
    if (site.kind === "monster_nest") {
      const damage = monsterDamage(runtime, site, period);
      site.cumulativeDamage += damage.totalPopulationLoss;
      site.strength = Math.min(300, site.strength + 2);
      events.push(damage);
    } else {
      advanceIntelligentDevelopment(site, period, events);
    }
    if (!site.detected) {
      site.detectionMonthsRemaining = Math.max(0, site.detectionMonthsRemaining - 1);
      if (site.detectionMonthsRemaining === 0) {
        site.detected = true;
        events.push({
          id: `barbarian-detected-${period}-${site.id}`,
          type: "barbarian_detected",
          tone: "warning",
          period,
          siteId: site.id,
          nationId: site.hostNationId,
          regionId: site.regionId,
          title: `${site.name}を周辺村落が発見`,
          summary: "まず村落自身が対処し、失敗時は町・都市、さらに国家命令へ段階的に上申します。",
        });
      }
    }
    if (maybeAutomaticAgreement(runtime, site, period, events)) continue;
    if (honorAgreement(site, period, events)) continue;
    if (!site.detected) continue;
    if (site.responseCooldownMonths > 0) {
      site.responseCooldownMonths -= 1;
      continue;
    }
    events.push(attemptResponse(runtime, site, period, context));
  }
  maybeSpawnSite(runtime, next, period, events, context);
  next.lastAdvancedPeriod = period;
  next.events = [...next.events, ...events].slice(-BARBARIAN_EVENT_LIMIT);
  return next;
}

export function establishBarbarianAgreement(runtime, source, siteId, agreementType, nationId = null, dateState = null) {
  const next = createBarbarianWorldState(runtime, source, dateState);
  const site = next.sites.find((entry) => entry.id === siteId);
  if (!site || site.status === "destroyed") throw new RangeError("取引対象の蛮族拠点が存在しません。");
  if (site.status !== "city_state") throw new Error("取引による討伐例外は、建国済みの都市国家だけが利用できます。");
  if (!BARBARIAN_AGREEMENTS[agreementType]) throw new RangeError("利用できない蛮族都市国家との取引です。");
  const effectiveNationId = nationId ?? site.hostNationId;
  if (effectiveNationId !== site.hostNationId) throw new Error("領域を管理する国家だけが取引を締結できます。");
  const period = periodFor(dateState);
  installAgreement(site, agreementType, period);
  next.events.push(agreementEvent(site, period, agreementType, false));
  next.events = next.events.slice(-BARBARIAN_EVENT_LIMIT);
  return next;
}

function responseLabel(site) {
  if (!site.detected) return `未発見（推定${site.detectionMonthsRemaining}か月）`;
  if (agreementActive(site)) return BARBARIAN_AGREEMENTS[site.agreement.type].name;
  return BARBARIAN_RESPONSE_LEVELS[site.responseLevel].name;
}

export function getBarbarianWorldView(runtime, source = null, dateState = null) {
  const barbarians = createBarbarianWorldState(runtime, source, dateState);
  const sites = barbarians.sites.filter((site) => site.status !== "destroyed").map((site) => ({
    ...site,
    tile: tileById(runtime, site.tileId),
    region: runtime.regionById.get(site.regionId) ?? null,
    nation: runtime.nationById.get(site.hostNationId) ?? null,
    agreementActive: agreementActive(site),
    agreementLabel: site.agreement ? BARBARIAN_AGREEMENTS[site.agreement.type]?.name ?? site.agreement.type : null,
    responseLabel: responseLabel(site),
    stageLabel: site.kind === "monster_nest" ? "魔物の巣" : site.status === "city_state" ? "蛮族都市国家" : site.settlementLevel === "town" ? "蛮族の町" : "蛮族の村",
    unmanaged: !agreementActive(site),
  }));
  return {
    barbarians,
    sites,
    events: [...barbarians.events].reverse(),
    summary: {
      activeCount: sites.length,
      detectedCount: sites.filter((site) => site.detected).length,
      hiddenCount: sites.filter((site) => !site.detected).length,
      monsterNestCount: sites.filter((site) => site.kind === "monster_nest").length,
      intelligentCount: sites.filter((site) => site.kind === "intelligent_barbarians").length,
      cityStateCount: sites.filter((site) => site.status === "city_state").length,
      agreementCount: sites.filter((site) => site.agreementActive).length,
      unmanagedCount: sites.filter((site) => site.unmanaged).length,
      cumulativePopulationLoss: barbarians.sites.reduce((sum, site) => sum + site.cumulativeDamage, 0),
    },
  };
}
