import {
  GENERATED_WORLD_OBJECT_TYPES,
  settlementLevelForPopulation,
} from "./nation-generation.js";

export const REGIONAL_DOMAIN_SCHEMA_VERSION = 1;
export const REGIONAL_DOMAIN_EVENT_LIMIT = 240;

const clone = (value) => structuredClone(value);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function periodFor(dateState) {
  const year = Number.isInteger(dateState?.year) ? dateState.year : 317;
  const month = Number.isInteger(dateState?.month) ? dateState.month : 4;
  return `${year}-${month}`;
}

function settlementName(baseName, level) {
  return `${baseName}${level === "city" ? "市" : level === "town" ? "町" : "村"}`;
}

function colorFor(text) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hue = hash >>> 0;
  const red = 82 + hue % 112;
  const green = 74 + (hue >>> 8) % 104;
  const blue = 72 + (hue >>> 16) % 112;
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function baseRegionState(region) {
  return {
    nationId: region.nationId,
    status: "integrated",
    lordId: null,
    lordName: null,
    officeTitle: region.officeTitle ?? (region.frontier ? "辺境伯" : "地方伯"),
    controlSince: null,
    cause: "world_generation",
  };
}

function baseSettlementState(object) {
  return {
    population: Math.max(1, Math.round(Number(object.population) || 1)),
    level: settlementLevelForPopulation(object.population),
    growthRate: clamp(Number(object.growthRate) || 0.003, -0.05, 0.05),
    lastTransitionPeriod: null,
  };
}

export function preserveRegionalDomainState(source) {
  if (!source || typeof source !== "object") return null;
  return {
    schemaVersion: REGIONAL_DOMAIN_SCHEMA_VERSION,
    establishedPeriod: typeof source.establishedPeriod === "string" ? source.establishedPeriod : null,
    lastAdvancedPeriod: typeof source.lastAdvancedPeriod === "string" ? source.lastAdvancedPeriod : null,
    regionStates: clone(source.regionStates ?? {}),
    settlementStates: clone(source.settlementStates ?? {}),
    independentPolities: clone(source.independentPolities ?? {}),
    events: clone(Array.isArray(source.events) ? source.events.slice(-REGIONAL_DOMAIN_EVENT_LIMIT) : []),
  };
}

export function createRegionalDomainState(runtime, source = null, dateState = null) {
  if (!runtime?.nations?.regions || !runtime?.nations?.objects) throw new TypeError("Regional domains require a generated-world runtime.");
  const period = periodFor(dateState);
  const preserved = preserveRegionalDomainState(source);
  const baseNationIds = new Set(runtime.nations.nations.map((nation) => nation.id));
  const independentPolities = Object.fromEntries(Object.entries(preserved?.independentPolities ?? {}).filter(([id, polity]) => (
    id && polity && typeof polity.name === "string"
  )).map(([id, polity]) => [id, {
    id,
    name: polity.name,
    shortName: polity.shortName ?? polity.name.replace(/独立領|自由領|共和国|王国/g, ""),
    color: /^#[0-9a-f]{6}$/i.test(polity.color ?? "") ? polity.color : colorFor(id),
    government: polity.government ?? "独立地域政権",
    peopleId: polity.peopleId ?? null,
    peopleName: polity.peopleName ?? "地域住民",
    settlementStyle: polity.settlementStyle ?? "地域自治集落",
    foundedPeriod: polity.foundedPeriod ?? period,
    founderId: polity.founderId ?? null,
  }]));
  const validNationIds = new Set([...baseNationIds, ...Object.keys(independentPolities)]);
  const regionStates = Object.fromEntries(runtime.nations.regions.map((region) => {
    const fallback = baseRegionState(region);
    const stored = preserved?.regionStates?.[region.id] ?? {};
    const nationId = validNationIds.has(stored.nationId) ? stored.nationId : fallback.nationId;
    return [region.id, {
      ...fallback,
      nationId,
      status: nationId === region.nationId ? (stored.status === "autonomous" ? "autonomous" : "integrated") : stored.status === "independent" ? "independent" : "transferred",
      lordId: typeof stored.lordId === "string" ? stored.lordId : null,
      lordName: typeof stored.lordName === "string" ? stored.lordName : null,
      officeTitle: typeof stored.officeTitle === "string" ? stored.officeTitle : fallback.officeTitle,
      controlSince: typeof stored.controlSince === "string" ? stored.controlSince : null,
      cause: typeof stored.cause === "string" ? stored.cause : fallback.cause,
    }];
  }));
  const settlementStates = Object.fromEntries(runtime.nations.objects.filter((object) => object.settlementLevel).map((object) => {
    const fallback = baseSettlementState(object);
    const stored = preserved?.settlementStates?.[object.id] ?? {};
    const population = Math.max(1, Math.round(Number(stored.population) || fallback.population));
    return [object.id, {
      population,
      level: settlementLevelForPopulation(population),
      growthRate: clamp(Number(stored.growthRate) || fallback.growthRate, -0.05, 0.05),
      lastTransitionPeriod: typeof stored.lastTransitionPeriod === "string" ? stored.lastTransitionPeriod : null,
    }];
  }));
  return {
    schemaVersion: REGIONAL_DOMAIN_SCHEMA_VERSION,
    establishedPeriod: preserved?.establishedPeriod ?? period,
    lastAdvancedPeriod: preserved?.lastAdvancedPeriod ?? null,
    regionStates,
    settlementStates,
    independentPolities,
    events: (preserved?.events ?? []).filter((event) => event && typeof event.id === "string").slice(-REGIONAL_DOMAIN_EVENT_LIMIT),
  };
}

function geometryKey(segment) {
  return `${segment.x1},${segment.y1},${segment.x2},${segment.y2}`;
}

function effectiveNationMap(runtime, domains) {
  const regionStates = domains.regionStates;
  const regions = runtime.nations.regions.map((region) => {
    const state = regionStates[region.id];
    return {
      ...region,
      originalNationId: region.nationId,
      nationId: state.nationId,
      status: state.status,
      lordId: state.lordId,
      lordName: state.lordName,
      officeTitle: state.officeTitle,
      controlSince: state.controlSince,
      population: region.settlementIds.reduce((sum, id) => sum + (domains.settlementStates[id]?.population ?? 0), 0),
    };
  });
  const regionById = new Map(regions.map((region) => [region.id, region]));
  const objects = runtime.nations.objects.map((object) => {
    const region = regionById.get(object.regionId);
    const settlement = domains.settlementStates[object.id];
    if (!settlement) return { ...object, nationId: region?.nationId ?? object.nationId };
    const preservesSpecialRole = Boolean(object.maritime) || ["castle", "fort"].includes(object.type);
    return {
      ...object,
      nationId: region?.nationId ?? object.nationId,
      type: preservesSpecialRole ? object.type : settlement.level,
      typeName: preservesSpecialRole ? object.typeName : GENERATED_WORLD_OBJECT_TYPES[settlement.level].name,
      settlementLevel: settlement.level,
      population: settlement.population,
      growthRate: settlement.growthRate,
      name: preservesSpecialRole ? object.name : settlementName(object.baseName, settlement.level),
      importance: preservesSpecialRole ? object.importance : settlement.level === "city" ? 3 : settlement.level === "town" ? 2 : 1,
    };
  });
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const roads = (runtime.nations.roads ?? []).map((road) => ({
    ...road,
    nationIds: [...new Set([objectById.get(road.fromObjectId)?.nationId, objectById.get(road.toObjectId)?.nationId].filter(Boolean))],
    scope: objectById.get(road.fromObjectId)?.nationId === objectById.get(road.toObjectId)?.nationId
      ? road.scope === "local" ? "local" : "regional"
      : "frontier",
  }));
  const seaRoutes = (runtime.nations.seaRoutes ?? []).map((route) => {
    const fromNationId = objectById.get(route.fromObjectId)?.nationId;
    const toNationId = objectById.get(route.toObjectId)?.nationId;
    return {
      ...route,
      nationIds: [...new Set([fromNationId, toNationId].filter(Boolean))],
      scope: fromNationId === toNationId ? "domestic" : "international",
    };
  });
  const tileNationIds = runtime.nations.tileRegionIds.map((regionId) => regionById.get(regionId)?.nationId ?? null);
  const originalBorderByGeometry = new Map((runtime.nations.borderSegments ?? []).map((segment) => [geometryKey(segment), segment]));
  const regionBorderSegments = (runtime.nations.regionBorderSegments ?? []).map((segment) => {
    const nationIds = segment.regions.map((id) => regionById.get(id)?.nationId ?? null);
    return { ...segment, national: nationIds[0] !== nationIds[1] };
  });
  const borderSegments = regionBorderSegments.filter((segment) => segment.national).map((segment) => {
    const nations = segment.regions.map((id) => regionById.get(id)?.nationId ?? null);
    const original = originalBorderByGeometry.get(geometryKey(segment));
    return {
      x1: segment.x1,
      y1: segment.y1,
      x2: segment.x2,
      y2: segment.y2,
      nations,
      frontierType: original?.frontierType ?? "political",
      naturalStrength: original?.naturalStrength ?? 0,
      natural: original?.natural ?? false,
      followsRiver: original?.followsRiver ?? false,
    };
  });
  const sharedBorderLengths = {};
  borderSegments.forEach((segment) => {
    const key = [...segment.nations].sort().join(":");
    sharedBorderLengths[key] = (sharedBorderLengths[key] ?? 0) + 1;
  });
  const baseNationById = new Map(runtime.nations.nations.map((nation) => [nation.id, nation]));
  const allNationIds = [...new Set([...baseNationById.keys(), ...Object.keys(domains.independentPolities)])];
  const nations = allNationIds.map((nationId) => {
    const polity = domains.independentPolities[nationId];
    const ownedRegions = regions.filter((region) => region.nationId === nationId);
    const ownedObjects = objects.filter((object) => object.nationId === nationId);
    const origin = baseNationById.get(nationId)
      ?? baseNationById.get(runtime.nations.regions.find((region) => region.id === ownedRegions[0]?.id)?.nationId)
      ?? runtime.nations.nations[0];
    const capitalRegion = ownedRegions.find((region) => region.id === origin.capitalRegionId) ?? ownedRegions[0] ?? null;
    const capitalObject = objectById.get(capitalRegion?.seatObjectId) ?? ownedObjects.find((object) => object.settlementLevel) ?? null;
    const tileCount = ownedRegions.reduce((sum, region) => sum + region.tileCount, 0);
    const unchangedBaseNation = !polity
      && ownedRegions.length === origin.regionIds.length
      && origin.regionIds.every((regionId) => ownedRegions.some((region) => region.id === regionId));
    return {
      ...origin,
      ...(polity ?? {}),
      id: nationId,
      name: polity?.name ?? origin.name,
      shortName: polity?.shortName ?? origin.shortName,
      color: polity?.color ?? origin.color,
      government: polity?.government ?? origin.government,
      peopleId: polity?.peopleId ?? origin.peopleId,
      peopleName: polity?.peopleName ?? origin.peopleName,
      settlementStyle: polity?.settlementStyle ?? origin.settlementStyle,
      capitalIndex: unchangedBaseNation ? origin.capitalIndex : capitalObject?.tileIndex ?? capitalRegion?.anchorIndex ?? origin.capitalIndex,
      capitalRegionId: capitalRegion?.id ?? null,
      regionIds: ownedRegions.map((region) => region.id),
      regionCount: ownedRegions.length,
      objectIds: ownedObjects.map((object) => object.id),
      objectCounts: Object.fromEntries(Object.keys(GENERATED_WORLD_OBJECT_TYPES).map((type) => [type, ownedObjects.filter((object) => object.type === type).length])),
      roadIds: roads.filter((road) => road.nationIds.includes(nationId)).map((road) => road.id),
      portIds: ownedObjects.filter((object) => object.maritime).map((object) => object.id),
      seaRouteIds: seaRoutes.filter((route) => route.nationIds.includes(nationId)).map((route) => route.id),
      tileCount,
      areaShare: Number((tileCount / Math.max(1, runtime.nations.summary.claimedLandTiles)).toFixed(4)),
      populationPotential: unchangedBaseNation ? origin.populationPotential : ownedRegions.reduce((sum, region) => sum + region.population, 0),
      settlementPopulation: ownedRegions.reduce((sum, region) => sum + region.population, 0),
      dissolved: ownedRegions.length === 0,
    };
  });
  const nationById = new Map(nations.map((nation) => [nation.id, nation]));
  const visualRevision = [
    ...regions.map((region) => `${region.id}:${region.nationId}`),
    ...objects.filter((object) => object.settlementLevel).map((object) => `${object.id}:${object.settlementLevel}`),
  ].join("|");
  return {
    domains,
    visualRevision,
    regionById,
    nationById,
    objectById,
    nationMap: {
      ...runtime.nations,
      nations,
      regions,
      objects,
      roads,
      seaRoutes,
      tileNationIds,
      borderSegments,
      regionBorderSegments,
      sharedBorderLengths,
      summary: {
        ...runtime.nations.summary,
        nationCount: nations.filter((nation) => !nation.dissolved).length,
        regionCount: regions.length,
        borderSegmentCount: borderSegments.length,
        naturalBorderSegmentCount: borderSegments.filter((segment) => segment.natural).length,
        artificialBorderSegmentCount: borderSegments.filter((segment) => !segment.natural).length,
        naturalBorderShare: Number((borderSegments.filter((segment) => segment.natural).length / Math.max(1, borderSegments.length)).toFixed(3)),
        artificialBorderShare: Number((borderSegments.filter((segment) => !segment.natural).length / Math.max(1, borderSegments.length)).toFixed(3)),
        frontierTypeCounts: Object.fromEntries([...borderSegments.reduce((counts, segment) => {
          counts.set(segment.frontierType, (counts.get(segment.frontierType) ?? 0) + 1);
          return counts;
        }, new Map())].sort()),
        objectCounts: Object.fromEntries(Object.keys(GENERATED_WORLD_OBJECT_TYPES).map((type) => [type, objects.filter((object) => object.type === type).length])),
        roadCount: roads.length,
        portCount: objects.filter((object) => object.maritime).length,
        seaRouteCount: seaRoutes.length,
        internationalSeaRouteCount: seaRoutes.filter((route) => route.scope === "international").length,
        settlementPopulation: objects.reduce((sum, object) => sum + (object.population ?? 0), 0),
      },
    },
  };
}

export function getRegionalDomainView(runtime, source = null, dateState = null) {
  return effectiveNationMap(runtime, createRegionalDomainState(runtime, source, dateState));
}

export function advanceRegionalDomains(runtime, source = null, dateState = null) {
  const next = createRegionalDomainState(runtime, source, dateState);
  const period = periodFor(dateState);
  if (next.lastAdvancedPeriod === period) return next;
  const roadEndpointIds = new Set((runtime.nations.roads ?? []).flatMap((road) => [road.fromObjectId, road.toObjectId]));
  for (const object of runtime.nations.objects.filter((entry) => entry.settlementLevel)) {
    const settlement = next.settlementStates[object.id];
    const previousLevel = settlement.level;
    const infrastructureBonus = roadEndpointIds.has(object.id) ? 0.0007 : 0;
    const seatBonus = object.regionSeat ? 0.0005 : 0;
    settlement.population = Math.max(1, Math.round(settlement.population * (1 + settlement.growthRate + infrastructureBonus + seatBonus)));
    settlement.level = settlementLevelForPopulation(settlement.population);
    if (settlement.level !== previousLevel) {
      settlement.lastTransitionPeriod = period;
      next.events.push({
        id: `settlement-${period}-${object.id}-${settlement.level}`,
        type: "settlement_transition",
        period,
        settlementId: object.id,
        regionId: object.regionId,
        nationId: next.regionStates[object.regionId].nationId,
        fromLevel: previousLevel,
        toLevel: settlement.level,
        population: settlement.population,
        title: `${object.baseName}が${GENERATED_WORLD_OBJECT_TYPES[settlement.level].name}へ成長`,
      });
    }
  }
  next.lastAdvancedPeriod = period;
  next.events = next.events.slice(-REGIONAL_DOMAIN_EVENT_LIMIT);
  return next;
}

export function transferRegionControl(runtime, source, regionId, nationId, options = {}, dateState = null) {
  const next = createRegionalDomainState(runtime, source, dateState);
  const region = runtime.nations.regions.find((entry) => entry.id === regionId);
  const validNationIds = new Set([...runtime.nations.nations.map((nation) => nation.id), ...Object.keys(next.independentPolities)]);
  if (!region) throw new RangeError("存在しない地域です。");
  if (!validNationIds.has(nationId)) throw new RangeError("移管先として存在しない勢力です。");
  const previousNationId = next.regionStates[regionId].nationId;
  if (previousNationId === nationId) return next;
  const period = periodFor(dateState);
  next.regionStates[regionId] = {
    ...next.regionStates[regionId],
    nationId,
    status: options.status ?? "transferred",
    controlSince: period,
    cause: options.cause ?? "regional_transfer",
  };
  next.events.push({
    id: `regional-control-${period}-${regionId}-${nationId}`,
    type: "regional_control_change",
    period,
    regionId,
    fromNationId: previousNationId,
    toNationId: nationId,
    cause: next.regionStates[regionId].cause,
    title: `${region.name}の支配勢力が交代`,
  });
  next.events = next.events.slice(-REGIONAL_DOMAIN_EVENT_LIMIT);
  return next;
}

export function declareRegionIndependence(runtime, source, regionId, options = {}, dateState = null) {
  const next = createRegionalDomainState(runtime, source, dateState);
  const region = runtime.nations.regions.find((entry) => entry.id === regionId);
  if (!region) throw new RangeError("独立させる地域が存在しません。");
  const period = periodFor(dateState);
  const polityId = options.polityId ?? `independent-${regionId}`;
  const previousNationId = next.regionStates[regionId].nationId;
  const originNation = runtime.nationById.get(region.nationId);
  next.independentPolities[polityId] = {
    id: polityId,
    name: options.name ?? `${region.name.replace(/地方$/, "")}独立領`,
    shortName: options.shortName ?? region.name.replace(/地方$/, ""),
    color: options.color ?? colorFor(polityId),
    government: options.government ?? "独立地域政権",
    peopleId: originNation?.peopleId ?? null,
    peopleName: originNation?.peopleName ?? "地域住民",
    settlementStyle: originNation?.settlementStyle ?? "地域自治集落",
    foundedPeriod: period,
    founderId: options.founderId ?? null,
  };
  next.regionStates[regionId] = {
    ...next.regionStates[regionId],
    nationId: polityId,
    status: "independent",
    controlSince: period,
    cause: options.cause ?? "declaration_of_independence",
    lordId: options.founderId ?? next.regionStates[regionId].lordId,
    lordName: options.founderName ?? next.regionStates[regionId].lordName,
    officeTitle: options.officeTitle ?? "独立領主",
  };
  next.events.push({
    id: `regional-independence-${period}-${regionId}-${polityId}`,
    type: "regional_independence",
    period,
    regionId,
    fromNationId: previousNationId,
    toNationId: polityId,
    cause: next.regionStates[regionId].cause,
    title: `${region.name}が独立勢力として成立`,
  });
  next.events = next.events.slice(-REGIONAL_DOMAIN_EVENT_LIMIT);
  return next;
}

export function appointRegionalLord(runtime, source, regionId, appointment = {}, dateState = null) {
  const next = createRegionalDomainState(runtime, source, dateState);
  const region = runtime.nations.regions.find((entry) => entry.id === regionId);
  if (!region) throw new RangeError("任官先として存在しない地域です。");
  const period = periodFor(dateState);
  next.regionStates[regionId] = {
    ...next.regionStates[regionId],
    lordId: appointment.lordId ?? null,
    lordName: appointment.lordName ?? null,
    officeTitle: appointment.officeTitle ?? region.officeTitle ?? (region.frontier ? "辺境伯" : "地方伯"),
  };
  next.events.push({
    id: `regional-appointment-${period}-${regionId}-${appointment.lordId ?? "vacant"}`,
    type: "regional_appointment",
    period,
    regionId,
    nationId: next.regionStates[regionId].nationId,
    lordId: next.regionStates[regionId].lordId,
    title: `${region.name}の${next.regionStates[regionId].officeTitle}を任命`,
  });
  next.events = next.events.slice(-REGIONAL_DOMAIN_EVENT_LIMIT);
  return next;
}
