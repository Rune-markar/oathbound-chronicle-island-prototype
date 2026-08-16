import { generateTerrain } from "./terrain-generation.js";
import {
  GENERATED_OBJECT_MIN_DISTANCE,
  GENERATED_WORLD_OBJECT_TYPES,
  ROADSIDE_SETTLEMENT_MAX_OFFSET,
  SETTLEMENT_EXPANSION_WAVE_TILES,
  generateNations,
} from "./nation-generation.js";
import { SQUARE_CARDINAL_DIRECTIONS, squareTileIndex, squareWrappedDeltaX } from "./square-grid.js";
import {
  advanceGeopoliticalWorld,
  createGeopoliticalWorldState,
  getGeopoliticalWorldView,
  preserveGeopoliticalState,
} from "./geopolitical-world.js";
import {
  advanceGeneratedWorldWars,
  createGeneratedWorldWarState,
  getGeneratedWorldWarView as getWorldWarView,
  preserveGeneratedWorldWarState,
} from "./generated-world-war-system.js";
import {
  advanceRegionalDomains,
  appointRegionalLord,
  createRegionalDomainState,
  declareRegionIndependence,
  getRegionalDomainView,
  preserveRegionalDomainState,
  transferRegionControl,
} from "./regional-domain-system.js";
import { getRegionalReputationReport } from "./regional-reputation.js";
import {
  advanceBarbarianWorld,
  createBarbarianWorldState,
  establishBarbarianAgreement,
  getBarbarianWorldView,
  preserveBarbarianState,
} from "./barbarian-system.js";
import {
  createWorldIntelligenceState,
  getKnownWorldTimeline,
  recordKnownWorldEvents,
} from "./world-intelligence.js";
import {
  buildSimulationFidelityPlan,
  preserveSimulationFidelityPlan,
} from "./simulation-fidelity.js";
import {
  advanceGeneratedResistance,
  createGeneratedResistanceState,
  getGeneratedResistanceView as getResistanceView,
  preserveGeneratedResistanceState,
  respondToGeneratedResistance,
  setGeneratedOccupationPolicy,
} from "./generated-resistance-system.js";

export const GENERATED_WORLD_DEFAULTS = Object.freeze({
  version: 14,
  seed: "eldoria-317",
  width: 192,
  height: 120,
  plateCount: 28,
  nationCount: 7,
  playerNationId: "nation-1",
  selectedRegionId: null,
  expeditionRegionId: null,
  expeditionTileId: null,
  expeditionMovement: 8,
  expeditionPeriod: "317-4",
  expeditionClockMinutes: 8 * 60,
  travelModePreference: null,
  discoveredRegionIds: [],
  colonies: [],
  geopolitics: null,
  worldWars: null,
  resistance: null,
  regionalDomains: null,
  barbarians: null,
  intelligence: null,
  lastTravel: null,
  characters: [],
  characterStates: {},
});

export const GENERATED_COLONY_COST = Object.freeze({
  wealth: 6,
  food: 2,
  foundingMinutes: 7 * 24 * 60,
  initialPopulation: 360,
});

export const GENERATED_COLONY_REQUIRED_REPUTATION = 25;
export const GENERATED_RECOGNITION_RADIUS = 20;

const DIRECTION_BY_NAME = new Map(SQUARE_CARDINAL_DIRECTIONS.map((direction) => [direction.name, direction]));
let runtimeCache = { key: null, value: null };
const generatedWorldViewCache = new WeakMap();
let characterWorldSequence = 0;
const GENERATED_WORLD_CLOCK_LIMIT = 999 * 24 * 60 - 1;
const generatedTravelRouteCache = new Map();

export const GENERATED_TRAVEL_MODES = Object.freeze({
  route: Object.freeze({ id: "route", name: "道順", description: "街道・集落間の道を優先。移動と補給の効率がよく、遭遇率6%。遭遇しても弱い魔物が中心。", encounterChance: 0.06 }),
  direct: Object.freeze({ id: "direct", name: "最短経路", description: "地形を横断して目的地方へ直行する。補給負荷が大きく、遭遇率38%。強い魔物に遭う場合が多い。", encounterChance: 0.38 }),
});

function normalizedTravelModePreference(value) {
  return typeof value === "string" && GENERATED_TRAVEL_MODES[value] ? value : null;
}

function generatedWorldRuntimeKey(generatedState) {
  return ["regional-hd-v9-continental-scale", generatedState.seed, generatedState.width, generatedState.height, generatedState.plateCount, generatedState.nationCount].join("|");
}

function cloneGeneratedWorldState(value) {
  return {
    ...value,
    discoveredRegionIds: [...(value.discoveredRegionIds ?? [])],
    colonies: (value.colonies ?? []).map((colony) => ({ ...colony })),
    geopolitics: preserveGeopoliticalState(value.geopolitics),
    worldWars: preserveGeneratedWorldWarState(value.worldWars),
    resistance: preserveGeneratedResistanceState(value.resistance),
    regionalDomains: preserveRegionalDomainState(value.regionalDomains),
    barbarians: preserveBarbarianState(value.barbarians),
    simulationFidelity: preserveSimulationFidelityPlan(value.simulationFidelity),
    pendingStrategicDecisions: structuredClone(value.pendingStrategicDecisions ?? []),
    intelligence: createWorldIntelligenceState(value.intelligence),
    lastTravel: value.lastTravel ? structuredClone(value.lastTravel) : null,
    characters: structuredClone(value.characters ?? []),
    characterStates: structuredClone(value.characterStates ?? {}),
  };
}

function clampInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function periodFor(state) {
  return `${Number.isInteger(state?.year) ? state.year : 317}-${Number.isInteger(state?.month) ? state.month : 4}`;
}

function clockMinutes(value) {
  return clampInteger(value, GENERATED_WORLD_DEFAULTS.expeditionClockMinutes, 0, GENERATED_WORLD_CLOCK_LIMIT);
}

function normalizedColonies(source) {
  const seenIds = new Set();
  const seenTiles = new Set();
  return (Array.isArray(source) ? source : []).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || typeof entry.tileId !== "string") return [];
    const id = typeof entry.id === "string" && entry.id ? entry.id.slice(0, 96) : `colony-${index + 1}`;
    if (seenIds.has(id) || seenTiles.has(entry.tileId)) return [];
    seenIds.add(id);
    seenTiles.add(entry.tileId);
    const baseName = String(entry.baseName ?? entry.name ?? `開拓${index + 1}`).replace(/[村町市]$/, "").slice(0, 32) || `開拓${index + 1}`;
    return [{
      id,
      tileId: entry.tileId,
      regionId: typeof entry.regionId === "string" ? entry.regionId : null,
      nationId: typeof entry.nationId === "string" ? entry.nationId : null,
      baseName,
      population: clampInteger(entry.population, GENERATED_COLONY_COST.initialPopulation, 1, 2499),
      growthRate: Math.min(0.05, Math.max(-0.05, Number(entry.growthRate) || 0.004)),
      foundedPeriod: typeof entry.foundedPeriod === "string" ? entry.foundedPeriod : null,
      founderId: typeof entry.founderId === "string" ? entry.founderId : null,
      expansionWave: clampInteger(entry.expansionWave, 1, 1, 99),
    }];
  }).slice(0, 256);
}

function advancedClockMinutes(current, elapsedMinutes) {
  return Math.min(GENERATED_WORLD_CLOCK_LIMIT, clockMinutes(current) + clampInteger(elapsedMinutes, 0, 0, 30 * 24 * 60));
}

function wrappedTileDistance(runtime, fromTile, toTile) {
  const directX = Math.abs(fromTile.x - toTile.x);
  const dx = runtime.terrain.config.wrapX ? Math.min(directX, runtime.terrain.width - directX) : directX;
  return dx + Math.abs(fromTile.y - toTile.y);
}

function localTravelMinutes(runtime, fromTile, toTile) {
  const distance = wrappedTileDistance(runtime, fromTile, toTile);
  return Math.min(8 * 60, Math.max(90, Math.ceil((45 + distance * 12) / 30) * 30));
}

function regionalTravelMinutes(cost) {
  return clampInteger(cost, 1, 1, GENERATED_WORLD_DEFAULTS.expeditionMovement) * 6 * 60;
}

function stableTravelRoll(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function generatedRoadTileSet(runtime) {
  return new Set((runtime.nations.roads ?? []).flatMap((road) => road.tileIndices ?? []));
}

function travelTileRoute(runtime, fromTile, toTile, mode) {
  const cacheKey = `${generatedWorldRuntimeKey({ seed: runtime.terrain.seed, width: runtime.terrain.width, height: runtime.terrain.height, plateCount: runtime.terrain.config.plateCount, nationCount: runtime.nations.nations.length })}|${fromTile.id}|${toTile.id}|${mode}`;
  const cached = generatedTravelRouteCache.get(cacheKey);
  if (cached) return cached.map((index) => runtime.tiles[index]);
  const allowedRegions = new Set([fromTile.regionId, toTile.regionId]);
  const roadTiles = generatedRoadTileSet(runtime);
  const destinationIndex = toTile.index;
  const open = [{ index: fromTile.index, score: 0 }];
  const queuedScores = new Map([[fromTile.index, 0]]);
  const costs = new Map([[fromTile.index, 0]]);
  const previous = new Map();
  while (open.length) {
    open.sort((left, right) => left.score - right.score || left.index - right.index);
    const current = open.shift();
    if (current.score !== queuedScores.get(current.index)) continue;
    if (current.index === destinationIndex) break;
    const tile = runtime.tiles[current.index];
    for (const neighborIndex of tile.orthogonalNeighbors ?? []) {
      const neighbor = runtime.tiles[neighborIndex];
      if (!neighbor?.passable || !allowedRegions.has(neighbor.regionId)) continue;
      const terrainCost = Math.max(1, Number(neighbor.movementCost) || 1);
      const stepCost = mode === "route"
        ? roadTiles.has(neighborIndex) ? 0.22 : 2.8 + terrainCost * 0.65
        : 0.85 + terrainCost * 0.18;
      const nextCost = (costs.get(current.index) ?? Number.POSITIVE_INFINITY) + stepCost;
      if (nextCost >= (costs.get(neighborIndex) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(neighborIndex, nextCost);
      previous.set(neighborIndex, current.index);
      const heuristic = wrappedTileDistance(runtime, neighbor, toTile) * (mode === "route" ? 0.2 : 0.8);
      const score = nextCost + heuristic;
      queuedScores.set(neighborIndex, score);
      open.push({ index: neighborIndex, score });
    }
  }
  const indices = [destinationIndex];
  let cursor = destinationIndex;
  while (cursor !== fromTile.index && previous.has(cursor)) {
    cursor = previous.get(cursor);
    indices.push(cursor);
  }
  if (indices.at(-1) !== fromTile.index) indices.push(fromTile.index);
  indices.reverse();
  generatedTravelRouteCache.set(cacheKey, indices);
  if (generatedTravelRouteCache.size > 128) generatedTravelRouteCache.delete(generatedTravelRouteCache.keys().next().value);
  return indices.map((index) => runtime.tiles[index]);
}

function generatedTravelOptions(runtime, generatedState, state, destination) {
  const fromRegion = effectiveExpeditionRegion(runtime, generatedState);
  const fromTile = effectiveExpeditionTile(runtime, generatedState, fromRegion);
  const destinationTile = playableTileForRegion(runtime, destination);
  if (!destinationTile) return [];
  const baseCost = movementCostFor(destination);
  const food = state.player?.villageLife ? Math.max(0, Number(state.player.villageLife.supplies?.food) || 0) : Number.POSITIVE_INFINITY;
  return Object.values(GENERATED_TRAVEL_MODES).map((definition) => {
    const routeTiles = travelTileRoute(runtime, fromTile, destinationTile, definition.id);
    const roadTiles = generatedRoadTileSet(runtime);
    const roadCoverage = routeTiles.length ? routeTiles.filter((tile) => roadTiles.has(tile.index)).length / routeTiles.length : 0;
    const direct = definition.id === "direct";
    const cost = Math.min(GENERATED_WORLD_DEFAULTS.expeditionMovement, baseCost + (direct ? 2 : 0));
    const supplyCost = direct ? 3 : 1;
    const travelMinutes = direct
      ? Math.ceil(regionalTravelMinutes(baseCost) * 1.55 / 30) * 30
      : Math.max(3 * 60, Math.ceil(regionalTravelMinutes(baseCost) * Math.max(0.62, 0.9 - roadCoverage * 0.22) / 30) * 30);
    return {
      ...definition,
      regionId: destination.id,
      cost,
      supplyCost,
      travelMinutes,
      pathRegionIds: [destination.id],
      pathTileIds: routeTiles.map((tile) => tile.id),
      pathTiles: routeTiles.map((tile) => ({ id: tile.id, x: tile.x, y: tile.y })),
      roadCoverage: Number(roadCoverage.toFixed(2)),
      available: cost <= generatedState.expeditionMovement && supplyCost <= food,
      unavailableReason: cost > generatedState.expeditionMovement ? `移動力が不足（必要 ${cost}）`
        : supplyCost > food ? `保存食が不足（必要 ${supplyCost}）` : null,
    };
  });
}

function tileIdFor(tile) {
  return tile ? `tile-${tile.x}-${tile.y}` : null;
}

function tileById(runtime, tileId) {
  if (typeof tileId !== "string") return null;
  const match = /^tile-(\d+)-(\d+)$/.exec(tileId);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  if (x < 0 || x >= runtime.terrain.width || y < 0 || y >= runtime.terrain.height) return null;
  return runtime.tiles[squareTileIndex(x, y, runtime.terrain.width)] ?? null;
}

function regionById(runtime, regionId) {
  return typeof regionId === "string" ? runtime.regionById.get(regionId) ?? null : null;
}

function effectivePlayerNation(runtime, generatedState) {
  const selected = runtime.nations.nations.find((nation) => nation.id === generatedState.playerNationId);
  return selected && !selected.dissolved
    ? selected
    : runtime.nations.nations.find((nation) => !nation.dissolved) ?? runtime.nations.nations[0];
}

function revisionHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function generatedTileDistance(runtime, left, right) {
  const dx = squareWrappedDeltaX(left.x, right.x, runtime.terrain.width, runtime.terrain.config.wrapX);
  return Math.abs(dx) + Math.abs(right.y - left.y);
}

function generatedVisualDistance(runtime, left, right) {
  const dx = squareWrappedDeltaX(left.x, right.x, runtime.terrain.width, runtime.terrain.config.wrapX);
  return Math.hypot(dx, right.y - left.y);
}

function colonyRoadConnection(runtime, nationMap, colony, roadIndex) {
  const region = nationMap.regions.find((entry) => entry.id === colony.regionId);
  const hubId = region?.roadHubObjectId;
  const hub = nationMap.objects.find((object) => object.id === hubId);
  if (!region || !hub) return null;
  let best = null;
  for (const road of nationMap.roads ?? []) {
    if (!road.regionIds?.includes(region.id) || (road.fromObjectId !== hubId && road.toObjectId !== hubId)) continue;
    const path = road.toObjectId === hubId ? [...road.tileIndices].reverse() : [...road.tileIndices];
    for (let index = 0; index < path.length; index += 1) {
      const roadTile = runtime.tiles[path[index]];
      if (roadTile?.regionId !== region.id) continue;
      const distance = generatedTileDistance(runtime, colony.tile, roadTile);
      if (distance > ROADSIDE_SETTLEMENT_MAX_OFFSET) continue;
      if (!best || distance < best.distance || (distance === best.distance && index > best.index)) best = { path, index, distance };
    }
  }
  if (!best) return null;
  const tileIndices = best.path.slice(0, best.index + 1);
  if (tileIndices.at(-1) !== colony.tile.index) tileIndices.push(colony.tile.index);
  return {
    id: `colony-road-${roadIndex + 1}-${colony.id}`,
    fromObjectId: hub.id,
    toObjectId: colony.id,
    fromTileIndex: hub.tileIndex,
    toTileIndex: colony.tile.index,
    regionIds: [region.id],
    nationIds: [region.nationId],
    scope: "local",
    importance: 1,
    tileIndices,
    crossingKinds: [],
    strategicCrossings: [],
    colonyRoad: true,
  };
}

function runtimeWithColonies(baseRuntime, generatedState) {
  if (!generatedState.colonies?.length) return baseRuntime;
  const colonyObjects = generatedState.colonies.flatMap((entry) => {
    const tile = tileById(baseRuntime, entry.tileId);
    const region = tile ? baseRuntime.regionById.get(tile.regionId) : null;
    if (!tile?.passable || !region || (entry.regionId && entry.regionId !== region.id)) return [];
    return [{
      id: entry.id,
      type: "village",
      typeName: GENERATED_WORLD_OBJECT_TYPES.village.name,
      settlementLevel: "village",
      baseName: entry.baseName,
      population: entry.population,
      growthRate: entry.growthRate,
      regionSeat: false,
      capitalCity: false,
      placement: "player-colony",
      colonized: true,
      foundedPeriod: entry.foundedPeriod,
      founderId: entry.founderId,
      expansionWave: entry.expansionWave,
      nationId: region.nationId,
      regionId: region.id,
      tileIndex: tile.index,
      x: tile.x,
      y: tile.y,
      name: `${entry.baseName}村`,
      importance: 1,
      tile,
    }];
  });
  if (!colonyObjects.length) return baseRuntime;
  const objects = [...baseRuntime.nations.objects, ...colonyObjects.map(({ tile: _tile, ...object }) => object)];
  const colonyIdsByRegion = colonyObjects.reduce((groups, object) => {
    if (!groups.has(object.regionId)) groups.set(object.regionId, []);
    groups.get(object.regionId).push(object.id);
    return groups;
  }, new Map());
  const regions = baseRuntime.nations.regions.map((region) => {
    const colonyIds = colonyIdsByRegion.get(region.id) ?? [];
    const population = colonyObjects.filter((object) => object.regionId === region.id).reduce((sum, object) => sum + object.population, 0);
    return colonyIds.length ? {
      ...region,
      uninhabited: false,
      settlementIds: [...region.settlementIds, ...colonyIds],
      population: region.population + population,
    } : region;
  });
  const partialNationMap = { ...baseRuntime.nations, regions, objects, roads: [...(baseRuntime.nations.roads ?? [])] };
  for (const colony of colonyObjects) {
    const road = colonyRoadConnection(baseRuntime, partialNationMap, colony, partialNationMap.roads.length - baseRuntime.nations.roads.length);
    if (road) partialNationMap.roads.push(road);
  }
  const nations = baseRuntime.nations.nations.map((nation) => {
    const localColonies = colonyObjects.filter((object) => object.nationId === nation.id);
    if (!localColonies.length) return nation;
    return {
      ...nation,
      objectIds: [...nation.objectIds, ...localColonies.map((object) => object.id)],
      objectCounts: { ...nation.objectCounts, village: (nation.objectCounts.village ?? 0) + localColonies.length },
      roadIds: [...nation.roadIds, ...partialNationMap.roads.filter((road) => road.colonyRoad && road.nationIds.includes(nation.id)).map((road) => road.id)],
      settlementPopulation: nation.settlementPopulation + localColonies.reduce((sum, object) => sum + object.population, 0),
    };
  });
  const tiles = baseRuntime.tiles.slice();
  for (const colony of colonyObjects) {
    const object = objects.find((entry) => entry.id === colony.id);
    const tile = tiles[colony.tile.index];
    tiles[colony.tile.index] = {
      ...tile,
      worldObjects: [...tile.worldObjects, { ...object }],
      worldObjectIds: [...tile.worldObjectIds, object.id],
    };
  }
  const nationsMap = {
    ...partialNationMap,
    nations,
    tiles,
    summary: {
      ...baseRuntime.nations.summary,
      objectCount: baseRuntime.nations.summary.objectCount + colonyObjects.length,
      objectCounts: { ...baseRuntime.nations.summary.objectCounts, village: (baseRuntime.nations.summary.objectCounts.village ?? 0) + colonyObjects.length },
      roadCount: partialNationMap.roads.length,
      settlementPopulation: baseRuntime.nations.summary.settlementPopulation + colonyObjects.reduce((sum, object) => sum + object.population, 0),
    },
  };
  return {
    ...baseRuntime,
    key: `${baseRuntime.key}|colonies-${revisionHash(generatedState.colonies.map((colony) => `${colony.id}:${colony.tileId}`).join("|"))}`,
    nations: nationsMap,
    tiles,
    nationById: new Map(nations.map((nation) => [nation.id, nation])),
    regionById: new Map(regions.map((region) => [region.id, region])),
  };
}

function effectiveRuntimeFor(baseRuntime, generatedState, dateState = null) {
  const colonyRuntime = runtimeWithColonies(baseRuntime, generatedState);
  const regional = getRegionalDomainView(colonyRuntime, generatedState.regionalDomains, dateState);
  return {
    ...colonyRuntime,
    key: `${colonyRuntime.key}|domains-${revisionHash(regional.visualRevision)}`,
    nations: regional.nationMap,
    nationById: regional.nationById,
    regionById: regional.regionById,
    regionalDomains: regional.domains,
    regionalView: regional,
  };
}

function effectiveExpeditionRegion(runtime, generatedState) {
  const stored = regionById(runtime, generatedState.expeditionRegionId);
  if (stored) return stored;
  const storedTile = tileById(runtime, generatedState.expeditionTileId);
  if (storedTile?.passable && storedTile.regionId) return regionById(runtime, storedTile.regionId);
  const legacyTile = tileById(runtime, generatedState.legacyExpeditionTileId);
  if (legacyTile?.passable && legacyTile.regionId) return regionById(runtime, legacyTile.regionId);
  const nation = effectivePlayerNation(runtime, generatedState);
  return startingLocationForNation(runtime, nation)?.region ?? regionById(runtime, nation.capitalRegionId);
}

function validTileForRegion(runtime, region, tileId) {
  const tile = tileById(runtime, tileId);
  return tile?.passable && tile.regionId === region.id ? tile : null;
}

function playableTileForRegion(runtime, region) {
  const candidates = [region.anchorIndex, region.markerIndex, ...region.tileIndices]
    .map((index) => runtime.tiles[index])
    .filter((tile, index, tiles) => tile && tiles.indexOf(tile) === index);
  return candidates.find((tile) => tile.passable && tile.regionId === region.id) ?? null;
}

function startingTileForRegion(runtime, region) {
  const preferredTypes = ["village", "town", "fishing_port", "port", "bay_city", "city", "fort"];
  const preferredObjects = runtime.nations.objects
    .filter((object) => object.regionId === region.id && object.type !== "castle")
    .sort((left, right) => {
      const leftRank = preferredTypes.indexOf(left.type);
      const rightRank = preferredTypes.indexOf(right.type);
      return (leftRank < 0 ? preferredTypes.length : leftRank) - (rightRank < 0 ? preferredTypes.length : rightRank)
        || left.tileIndex - right.tileIndex;
    });
  const preferredTile = preferredObjects
    .map((object) => runtime.tiles[object.tileIndex])
    .find((tile) => tile?.passable && tile.regionId === region.id);
  if (preferredTile) return preferredTile;

  const castleTileIndices = new Set(runtime.nations.objects
    .filter((object) => object.regionId === region.id && object.type === "castle")
    .map((object) => object.tileIndex));
  const candidates = [region.markerIndex, ...region.tileIndices, region.anchorIndex]
    .map((index) => runtime.tiles[index])
    .filter((tile, index, tiles) => tile && tiles.indexOf(tile) === index);
  return candidates.find((tile) => (
    tile.passable
    && tile.regionId === region.id
    && !castleTileIndices.has(tile.index)
  )) ?? null;
}

function startingLocationForNation(runtime, nation) {
  const regionIds = [nation.capitalRegionId, ...nation.regionIds.filter((regionId) => regionId !== nation.capitalRegionId)];
  for (const regionId of regionIds) {
    const region = regionById(runtime, regionId);
    const tile = region ? startingTileForRegion(runtime, region) : null;
    if (region && tile) return { region, tile };
  }
  const capitalTile = runtime.tiles[nation.capitalIndex];
  const fallbackRegions = runtime.nations.regions
    .filter((region) => !regionIds.includes(region.id))
    .map((region) => ({ region, tile: startingTileForRegion(runtime, region) }))
    .filter((entry) => entry.tile)
    .sort((left, right) => {
      const distance = (tile) => {
        const directX = Math.abs(tile.x - capitalTile.x);
        const dx = runtime.terrain.config.wrapX ? Math.min(directX, runtime.terrain.width - directX) : directX;
        return Math.hypot(dx, tile.y - capitalTile.y);
      };
      return distance(left.tile) - distance(right.tile) || left.region.id.localeCompare(right.region.id);
    });
  return fallbackRegions[0] ?? null;
}

function effectiveExpeditionTile(runtime, generatedState, expeditionRegion) {
  const stored = validTileForRegion(runtime, expeditionRegion, generatedState.expeditionTileId);
  if (stored) return stored;
  const legacy = validTileForRegion(runtime, expeditionRegion, generatedState.legacyExpeditionTileId);
  if (legacy) return legacy;
  return startingTileForRegion(runtime, expeditionRegion) ?? playableTileForRegion(runtime, expeditionRegion);
}

function effectiveSelectedRegion(runtime, generatedState, expeditionRegion) {
  const stored = regionById(runtime, generatedState.selectedRegionId);
  if (stored) return stored;
  const legacyTile = tileById(runtime, generatedState.legacySelectedTileId);
  if (legacyTile?.regionId) return regionById(runtime, legacyTile.regionId);
  return expeditionRegion;
}

function discoveredAround(region) {
  return [region.id, ...region.neighborIds];
}

function movementCostFor(region) {
  return Math.max(1, Math.ceil(region.movementCost));
}

export function createCharacterWorldSeed() {
  characterWorldSequence += 1;
  const randomValues = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(randomValues);
  else {
    randomValues[0] = Math.floor(Math.random() * 0x100000000);
    randomValues[1] = Math.floor(Math.random() * 0x100000000);
  }
  return [
    "chronicle",
    Date.now().toString(36),
    characterWorldSequence.toString(36),
    randomValues[0].toString(36),
    randomValues[1].toString(36),
  ].join("-").slice(0, 80);
}

export function createGeneratedWorldState(options = {}, dateState = null) {
  const upgradeLegacyResolution = options.version === 1
    && Number(options.width) === 72
    && Number(options.height) === 48
    && Number(options.plateCount) === 11;
  const upgradePreviousResolution = Number(options.version ?? 0) < 5
    && Number(options.width) === 120
    && Number(options.height) === 80
    && Number(options.plateCount) === 16;
  const upgradeContinentalResolution = Number(options.version ?? 0) < 14
    && Number(options.width) === 160
    && Number(options.height) === 100
    && Number(options.plateCount) === 22;
  const upgradeResolution = upgradeLegacyResolution || upgradePreviousResolution || upgradeContinentalResolution;
  return {
    ...GENERATED_WORLD_DEFAULTS,
    seed: String(options.seed ?? GENERATED_WORLD_DEFAULTS.seed).slice(0, 80) || GENERATED_WORLD_DEFAULTS.seed,
    width: clampInteger(upgradeResolution ? GENERATED_WORLD_DEFAULTS.width : options.width, GENERATED_WORLD_DEFAULTS.width, 24, 192),
    height: clampInteger(upgradeResolution ? GENERATED_WORLD_DEFAULTS.height : options.height, GENERATED_WORLD_DEFAULTS.height, 16, 120),
    plateCount: clampInteger(upgradeResolution ? GENERATED_WORLD_DEFAULTS.plateCount : options.plateCount, GENERATED_WORLD_DEFAULTS.plateCount, 3, 36),
    nationCount: clampInteger(options.nationCount, GENERATED_WORLD_DEFAULTS.nationCount, 3, 12),
    playerNationId: typeof options.playerNationId === "string" ? options.playerNationId : GENERATED_WORLD_DEFAULTS.playerNationId,
    selectedRegionId: typeof options.selectedRegionId === "string" ? options.selectedRegionId : null,
    expeditionRegionId: typeof options.expeditionRegionId === "string" ? options.expeditionRegionId : null,
    expeditionTileId: !upgradeResolution && typeof options.expeditionTileId === "string" ? options.expeditionTileId : null,
    legacySelectedTileId: !upgradeResolution && typeof options.legacySelectedTileId === "string"
      ? options.legacySelectedTileId
      : !upgradeResolution && options.version < 3 && typeof options.selectedTileId === "string" ? options.selectedTileId : undefined,
    legacyExpeditionTileId: !upgradeResolution && typeof options.legacyExpeditionTileId === "string"
      ? options.legacyExpeditionTileId
      : !upgradeResolution && options.version < 3 && typeof options.expeditionTileId === "string" ? options.expeditionTileId : undefined,
    expeditionMovement: clampInteger(options.expeditionMovement, GENERATED_WORLD_DEFAULTS.expeditionMovement, 0, 8),
    expeditionPeriod: options.expeditionPeriod ?? periodFor(dateState),
    expeditionClockMinutes: clockMinutes(options.expeditionClockMinutes),
    travelModePreference: normalizedTravelModePreference(options.travelModePreference),
    discoveredRegionIds: [...new Set((options.discoveredRegionIds ?? []).filter((id) => typeof id === "string"))].slice(0, 512),
    colonies: normalizedColonies(options.colonies),
    geopolitics: preserveGeopoliticalState(options.geopolitics),
    worldWars: preserveGeneratedWorldWarState(options.worldWars),
    resistance: preserveGeneratedResistanceState(options.resistance),
    regionalDomains: preserveRegionalDomainState(options.regionalDomains),
    barbarians: preserveBarbarianState(options.barbarians),
    simulationFidelity: preserveSimulationFidelityPlan(options.simulationFidelity),
    pendingStrategicDecisions: Array.isArray(options.pendingStrategicDecisions)
      ? structuredClone(options.pendingStrategicDecisions.slice(-24))
      : [],
    intelligence: createWorldIntelligenceState(options.intelligence),
    lastTravel: options.lastTravel && typeof options.lastTravel === "object" ? structuredClone(options.lastTravel) : null,
    characters: Array.isArray(options.characters) ? structuredClone(options.characters) : [],
    characterStates: options.characterStates && typeof options.characterStates === "object" ? structuredClone(options.characterStates) : {},
  };
}

export function normalizeGeneratedWorldState(state) {
  state.generatedWorld = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  if (state.scenarioMode === "generated" && state.player) ensureGeneratedWorldPlayerLocation(state);
  return state;
}

export function refreshGeneratedWorldForDate(state) {
  const next = { ...state, generatedWorld: createGeneratedWorldState(state.generatedWorld ?? {}, state) };
  const currentPeriod = periodFor(next);
  if (next.generatedWorld.expeditionPeriod !== currentPeriod) {
    next.generatedWorld = {
      ...next.generatedWorld,
      expeditionMovement: GENERATED_WORLD_DEFAULTS.expeditionMovement,
      expeditionPeriod: currentPeriod,
      expeditionClockMinutes: GENERATED_WORLD_DEFAULTS.expeditionClockMinutes,
    };
  }
  return next;
}

export function getGeneratedWorldTimeView(state) {
  const generatedState = createGeneratedWorldState(state?.generatedWorld ?? state ?? {}, state?.generatedWorld ? state : null);
  const elapsedMinutes = clockMinutes(generatedState.expeditionClockMinutes);
  const minuteOfDay = elapsedMinutes % (24 * 60);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const phase = hour < 5 || hour >= 20 ? "night" : hour < 7 ? "dawn" : hour < 17 ? "day" : "dusk";
  const phaseLabels = { night: "夜", dawn: "夜明け", day: "昼", dusk: "夕暮れ" };
  return {
    period: generatedState.expeditionPeriod,
    elapsedMinutes,
    day: Math.floor(elapsedMinutes / (24 * 60)) + 1,
    hour,
    minute,
    phase,
    phaseLabel: phaseLabels[phase],
    timeLabel: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

export function setGeneratedTravelModePreference(state, mode) {
  if (!GENERATED_TRAVEL_MODES[mode]) throw new RangeError("不明な移動手段です。");
  const refreshed = refreshGeneratedWorldForDate(state);
  return {
    ...refreshed,
    generatedWorld: {
      ...cloneGeneratedWorldState(refreshed.generatedWorld),
      travelModePreference: mode,
    },
  };
}

export function advanceGeneratedWorldTime(state, elapsedMinutes) {
  const refreshed = refreshGeneratedWorldForDate(state);
  return {
    ...refreshed,
    generatedWorld: {
      ...cloneGeneratedWorldState(refreshed.generatedWorld),
      expeditionClockMinutes: advancedClockMinutes(refreshed.generatedWorld.expeditionClockMinutes, elapsedMinutes),
    },
  };
}

export function buildGeneratedWorld(stateOrGeneratedWorld) {
  const source = stateOrGeneratedWorld?.generatedWorld ?? stateOrGeneratedWorld ?? {};
  const generatedState = createGeneratedWorldState(source, stateOrGeneratedWorld?.generatedWorld ? stateOrGeneratedWorld : null);
  const key = generatedWorldRuntimeKey(generatedState);
  if (runtimeCache.key === key) return runtimeCache.value;
  const terrain = generateTerrain({
    seed: generatedState.seed,
    width: generatedState.width,
    height: generatedState.height,
    plateCount: generatedState.plateCount,
    wrapX: true,
  });
  const nations = generateNations(terrain, {
    count: generatedState.nationCount,
    seed: `${generatedState.seed}:nations`,
  });
  runtimeCache = {
    key,
    value: {
      key,
      terrain,
      nations,
      tiles: nations.tiles,
      nationById: new Map(nations.nations.map((nation) => [nation.id, nation])),
      regionById: new Map(nations.regions.map((region) => [region.id, region])),
    },
  };
  return runtimeCache.value;
}

export function ensureGeneratedWorldPlayerLocation(state, preparedRuntime = null) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const expectedRuntimeKey = generatedWorldRuntimeKey(generatedState);
  const runtime = preparedRuntime?.key === expectedRuntimeKey ? preparedRuntime : buildGeneratedWorld(generatedState);
  const playerNation = effectivePlayerNation(runtime, generatedState);
  const expeditionRegion = effectiveExpeditionRegion(runtime, { ...generatedState, playerNationId: playerNation.id });
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState, expeditionRegion);
  if (!expeditionRegion || !expeditionTile) throw new Error("生成世界に陸上の開始地点を確保できませんでした。");
  const selectedRegion = effectiveSelectedRegion(runtime, generatedState, expeditionRegion);
  const discoveredRegionIds = new Set(generatedState.discoveredRegionIds.filter((id) => runtime.regionById.has(id)));
  discoveredAround(expeditionRegion).forEach((id) => discoveredRegionIds.add(id));
  state.generatedWorld = {
    ...generatedState,
    playerNationId: playerNation.id,
    expeditionRegionId: expeditionRegion.id,
    expeditionTileId: expeditionTile.id,
    selectedRegionId: selectedRegion.id,
    legacyExpeditionTileId: undefined,
    discoveredRegionIds: [...discoveredRegionIds].slice(-512),
  };
  return state;
}

function yieldGenerationFrame() {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === "function") globalThis.requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export async function buildGeneratedWorldAsync(stateOrGeneratedWorld, onProgress = () => {}) {
  const source = stateOrGeneratedWorld?.generatedWorld ?? stateOrGeneratedWorld ?? {};
  const generatedState = createGeneratedWorldState(source, stateOrGeneratedWorld?.generatedWorld ? stateOrGeneratedWorld : null);
  const key = generatedWorldRuntimeKey(generatedState);
  if (runtimeCache.key === key) {
    onProgress({ progress: 100, stage: "complete", label: "生成済みの世界を確認しました" });
    return runtimeCache.value;
  }

  onProgress({ progress: 8, stage: "seed", label: "世界シードを準備しています" });
  await yieldGenerationFrame();
  onProgress({ progress: 18, stage: "terrain", label: "地形テンプレートを配置しています" });
  await yieldGenerationFrame();
  const terrain = generateTerrain({
    seed: generatedState.seed,
    width: generatedState.width,
    height: generatedState.height,
    plateCount: generatedState.plateCount,
    wrapX: true,
  });
  onProgress({ progress: 66, stage: "terrain", label: "河川・森林・資源を確定しました" });
  await yieldGenerationFrame();
  onProgress({ progress: 72, stage: "nations", label: "種族の適地に国家を築いています" });
  await yieldGenerationFrame();
  const nations = generateNations(terrain, {
    count: generatedState.nationCount,
    seed: `${generatedState.seed}:nations`,
  });
  onProgress({ progress: 94, stage: "nations", label: "沿岸都市・海路・開始地点を確定しています" });
  await yieldGenerationFrame();
  runtimeCache = {
    key,
    value: {
      key,
      terrain,
      nations,
      tiles: nations.tiles,
      nationById: new Map(nations.nations.map((nation) => [nation.id, nation])),
      regionById: new Map(nations.regions.map((region) => [region.id, region])),
    },
  };
  onProgress({ progress: 100, stage: "complete", label: "新しい世界の生成が完了しました" });
  return runtimeCache.value;
}

export function getGeneratedWorldView(state) {
  const cacheSource = state?.generatedWorld;
  const cacheSignature = cacheSource && typeof cacheSource === "object" ? [
    state?.year,
    state?.month,
    cacheSource.selectedRegionId,
    cacheSource.expeditionRegionId,
    cacheSource.expeditionTileId,
    cacheSource.regionalDomains?.lastAdvancedPeriod,
    cacheSource.regionalDomains?.events?.length ?? 0,
    cacheSource.geopolitics?.lastAdvancedPeriod,
    cacheSource.geopolitics?.events?.length ?? 0,
    cacheSource.worldWars?.lastAdvancedPeriod,
    cacheSource.worldWars?.activeWars?.length ?? 0,
    cacheSource.worldWars?.history?.length ?? 0,
    cacheSource.worldWars?.events?.length ?? 0,
    cacheSource.resistance?.lastAdvancedPeriod,
    cacheSource.resistance?.events?.length ?? 0,
    cacheSource.intelligence?.entries?.length ?? 0,
    cacheSource.barbarians?.lastAdvancedPeriod,
    cacheSource.colonies?.length ?? 0,
  ].join("|") : null;
  const cached = cacheSource && generatedWorldViewCache.get(cacheSource);
  if (cached?.signature === cacheSignature) return cached.view;
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(state), generatedState, state);
  const playerNation = effectivePlayerNation(runtime, generatedState);
  const expeditionRegion = effectiveExpeditionRegion(runtime, generatedState);
  const selectedRegion = effectiveSelectedRegion(runtime, generatedState, expeditionRegion);
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState, expeditionRegion);
  const selectedTile = runtime.tiles[selectedRegion.anchorIndex];
  const view = { runtime, generatedState, playerNation, expeditionRegion, selectedRegion, expeditionTile, selectedTile };
  if (cacheSource && cacheSignature) generatedWorldViewCache.set(cacheSource, { signature: cacheSignature, view });
  return view;
}

export function getGeneratedRecognitionView(state, radius = GENERATED_RECOGNITION_RADIUS) {
  const world = getGeneratedWorldView(state);
  const recognitionRadius = clampInteger(radius, GENERATED_RECOGNITION_RADIUS, 1, 40);
  const recognizedTileIds = new Set(world.runtime.tiles.filter((tile) => {
    const directX = Math.abs(tile.x - world.expeditionTile.x);
    const dx = world.runtime.terrain.config.wrapX
      ? Math.min(directX, world.runtime.terrain.width - directX)
      : directX;
    const dy = Math.abs(tile.y - world.expeditionTile.y);
    return dx * dx + dy * dy <= recognitionRadius * recognitionRadius;
  }).map((tile) => tile.id));
  return {
    radius: recognitionRadius,
    centerTile: world.expeditionTile,
    recognizedTileIds,
    recognizedCount: recognizedTileIds.size,
    isRecognized: (tileOrId) => recognizedTileIds.has(typeof tileOrId === "string" ? tileOrId : tileOrId?.id),
  };
}

export function getGeneratedGeopoliticalView(state) {
  const world = getGeneratedWorldView(state);
  return getGeopoliticalWorldView(world.runtime, world.generatedState.geopolitics, state);
}

export function getGeneratedWorldWarView(state) {
  const world = getGeneratedWorldView(state);
  return getWorldWarView(world.runtime, world.generatedState.worldWars, state);
}

export function getGeneratedResistanceView(state) {
  const world = getGeneratedWorldView(state);
  return getResistanceView(world.runtime, world.generatedState.resistance);
}

export function setGeneratedResistancePolicy(state, occupationId, policyId) {
  const world = getGeneratedWorldView(state);
  const occupation = createGeneratedResistanceState(world.generatedState.resistance).occupations.find((entry) => entry.id === occupationId);
  if (!occupation || occupation.occupierNationId !== world.generatedState.playerNationId || !state.player?.sovereign) throw new Error("自国の併合地だけを統治できます。");
  return { ...state, generatedWorld: { ...cloneGeneratedWorldState(state.generatedWorld), resistance: setGeneratedOccupationPolicy(world.generatedState.resistance, occupationId, policyId) } };
}

export function resolveGeneratedResistanceResponse(state, occupationId, responseId) {
  const world = getGeneratedWorldView(state);
  const occupation = createGeneratedResistanceState(world.generatedState.resistance).occupations.find((entry) => entry.id === occupationId);
  if (!occupation || occupation.occupierNationId !== world.generatedState.playerNationId || !state.player?.sovereign) throw new Error("自国の併合地だけに対応できます。");
  const result = respondToGeneratedResistance(world.runtime, world.generatedState.resistance, world.generatedState.regionalDomains, occupationId, responseId, state);
  if ((Number(state.player.metrics?.wealth) || 0) < result.cost) throw new Error("対応に必要な財産が不足しています。");
  const next = structuredClone(state);
  next.player.metrics.wealth -= result.cost;
  next.generatedWorld.resistance = result.resistance;
  next.generatedWorld.regionalDomains = result.regionalDomains;
  next.generatedWorld.pendingStrategicDecisions = (next.generatedWorld.pendingStrategicDecisions ?? []).filter((entry) => entry.occupationId !== occupationId);
  return next;
}

export function getKnownGeneratedWorldWarView(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const view = getGeneratedWorldWarView(state);
  const knownEventIds = new Set(generatedState.intelligence.entries.map((entry) => entry.eventId));
  const knownEvents = view.events.filter((event) => knownEventIds.has(event.id));
  const knownWarIds = new Set(knownEvents.map((event) => event.worldWarId).filter(Boolean));
  view.activeWars.filter((war) => [war.attackerNationId, war.defenderNationId].includes(generatedState.playerNationId)).forEach((war) => knownWarIds.add(war.id));
  return {
    activeWars: view.activeWars.filter((war) => knownWarIds.has(war.id)),
    history: view.history.filter((war) => knownWarIds.has(war.id)),
    events: knownEvents,
  };
}

export function getGeneratedRegionalDomainView(state) {
  const world = getGeneratedWorldView(state);
  return world.runtime.regionalView;
}

export function getGeneratedBarbarianView(state) {
  const world = getGeneratedWorldView(state);
  return getBarbarianWorldView(world.runtime, world.generatedState.barbarians, state);
}

export function initializeGeneratedWorldGeopolitics(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = buildGeneratedWorld(state);
  const regionalDomains = createRegionalDomainState(runtimeWithColonies(baseRuntime, generatedState), generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  const barbarians = createBarbarianWorldState(runtime, generatedState.barbarians, state);
  if (generatedState.geopolitics) return { ...state, generatedWorld: { ...generatedState, regionalDomains, barbarians, worldWars: createGeneratedWorldWarState(runtime, generatedState.worldWars, state), resistance: createGeneratedResistanceState(generatedState.resistance) } };
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains,
      barbarians,
      geopolitics: createGeopoliticalWorldState(runtime, null, state),
      worldWars: createGeneratedWorldWarState(runtime, generatedState.worldWars, state),
      resistance: createGeneratedResistanceState(generatedState.resistance),
    },
  };
}

function previousPeriodDate(state) {
  const month = Number.isInteger(state?.month) ? state.month : 4;
  const year = Number.isInteger(state?.year) ? state.year : 317;
  return month > 1 ? { year, month: month - 1 } : { year: year - 1, month: 12 };
}

function geopoliticalEventRegionId(runtime, event) {
  if (event.regionId && runtime.regionById.has(event.regionId)) return event.regionId;
  const nation = runtime.nationById.get(event.nationId);
  const targetNationId = event.targetNationId;
  if (!nation) return null;
  if (targetNationId) {
    const borderRegion = nation.regionIds
      .map((regionId) => runtime.regionById.get(regionId))
      .find((region) => region?.neighborIds?.some((neighborId) => runtime.regionById.get(neighborId)?.nationId === targetNationId));
    if (borderRegion) return borderRegion.id;
  }
  return nation.capitalRegionId ?? nation.regionIds[0] ?? null;
}

function locateGeopoliticalEvents(runtime, geopolitics) {
  return {
    ...geopolitics,
    events: geopolitics.events.map((event) => ({
      ...event,
      regionId: geopoliticalEventRegionId(runtime, event),
    })),
  };
}

function recordNearbyWorldEvents(state, runtime, generatedState, events) {
  const expeditionRegion = effectiveExpeditionRegion(runtime, generatedState);
  const nearbyRegionIds = new Set([expeditionRegion.id, ...(expeditionRegion.neighborIds ?? [])]);
  const nearbyEvents = events.filter((event) => (
    event.period === periodFor(state) && nearbyRegionIds.has(event.regionId)
  ));
  const recorded = recordKnownWorldEvents(generatedState.intelligence, nearbyEvents, {
    type: "witnessed",
    label: `${expeditionRegion.name}周辺で居合わせた`,
    regionId: expeditionRegion.id,
    settlementId: null,
    learnedPeriod: periodFor(state),
  });
  return recorded.intelligence;
}

export function advanceGeneratedWorldGeopolitics(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = buildGeneratedWorld(state);
  const regionalDomains = createRegionalDomainState(runtimeWithColonies(baseRuntime, generatedState), generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  const baseline = generatedState.geopolitics
    ?? createGeopoliticalWorldState(runtime, null, previousPeriodDate(state));
  const advancedGeopolitics = advanceGeopoliticalWorld(runtime, baseline, state, {
    protectedNationIds: generatedState.simulationFidelity?.playerControlledNationIds ?? [],
  });
  const playerCampaign = state.player?.generatedCampaign?.active;
  const playerCampaignRelationKey = playerCampaign?.targetNationId && generatedState.playerNationId
    ? [generatedState.playerNationId, playerCampaign.targetNationId].sort().join(":")
    : null;
  const worldWarResult = advanceGeneratedWorldWars(
    runtime,
    generatedState.worldWars,
    regionalDomains,
    baseline,
    advancedGeopolitics,
    state,
    {
      protectedNationIds: generatedState.simulationFidelity?.playerControlledNationIds ?? [],
      excludedRelationKeys: playerCampaignRelationKey ? [playerCampaignRelationKey] : [],
      resistance: generatedState.resistance,
    },
  );
  const resistanceResult = advanceGeneratedResistance(
    runtime,
    worldWarResult.resistance,
    worldWarResult.regionalDomains,
    worldWarResult.geopolitics,
    state,
    { protectedNationIds: generatedState.simulationFidelity?.playerControlledNationIds ?? [] },
  );
  const pendingStrategicDecisions = [
    ...(advancedGeopolitics.pendingStrategicDecisions ?? []),
    ...worldWarResult.pendingStrategicDecisions,
    ...resistanceResult.pendingStrategicDecisions,
  ];
  const geopolitics = locateGeopoliticalEvents(runtime, resistanceResult.geopolitics);
  const currentWarEvents = worldWarResult.worldWars.events.filter((event) => event.period === periodFor(state));
  const currentGeopoliticalEvents = geopolitics.events.filter((event) => event.period === periodFor(state));
  const intelligence = recordNearbyWorldEvents(state, runtime, generatedState, [...currentGeopoliticalEvents, ...currentWarEvents]);
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains: resistanceResult.regionalDomains,
      geopolitics,
      worldWars: worldWarResult.worldWars,
      resistance: resistanceResult.resistance,
      intelligence,
      pendingStrategicDecisions: [
        ...(generatedState.pendingStrategicDecisions ?? []).filter((decision) => decision.period !== geopolitics.lastAdvancedPeriod),
        ...pendingStrategicDecisions,
      ].slice(-24),
    },
  };
}

export function discoverGeneratedWorldRumor(state, settlement = {}) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(state), generatedState, state);
  const geopolitics = locateGeopoliticalEvents(runtime, createGeopoliticalWorldState(runtime, generatedState.geopolitics, state));
  const knownIds = new Set(generatedState.intelligence.entries.map((entry) => entry.eventId));
  const localRegion = runtime.regionById.get(settlement.regionId);
  const neighboringNationIds = new Set((localRegion?.neighborIds ?? []).map((id) => runtime.regionById.get(id)?.nationId).filter(Boolean));
  const worldWars = getWorldWarView(runtime, generatedState.worldWars, state);
  const candidates = [...geopolitics.events, ...worldWars.events].reverse()
    .filter((event) => !knownIds.has(event.id))
    .map((event, order) => ({
      event,
      order,
      score: event.regionId === settlement.regionId ? 400
        : event.nationId === settlement.nationId ? 300
          : event.targetNationId === settlement.nationId ? 250
            : neighboringNationIds.has(event.nationId) || neighboringNationIds.has(event.targetNationId) ? 150 : 0,
    }))
    .sort((left, right) => right.score - left.score || left.order - right.order);
  const recorded = recordKnownWorldEvents(generatedState.intelligence, candidates.map((candidate) => candidate.event), {
    type: "rumor",
    label: `${settlement.name ?? "集落"}の住人から聞いた噂`,
    settlementId: settlement.id ?? null,
    regionId: settlement.regionId ?? null,
    learnedPeriod: periodFor(state),
  }, { limit: 1 });
  return {
    state: {
      ...state,
      generatedWorld: {
        ...generatedState,
        geopolitics,
        intelligence: recorded.intelligence,
      },
    },
    entry: recorded.added[0] ?? null,
  };
}

export function getGeneratedWorldIntelligenceView(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(state), generatedState, state);
  return getKnownWorldTimeline(generatedState.intelligence).map((entry) => ({
    ...entry,
    nationName: runtime.nationById.get(entry.nationId)?.name ?? "勢力不明",
    targetNationName: runtime.nationById.get(entry.targetNationId)?.name ?? null,
    regionName: runtime.regionById.get(entry.regionId)?.name ?? "場所不明",
  }));
}

export function advanceGeneratedWorldRegions(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = runtimeWithColonies(buildGeneratedWorld(state), generatedState);
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains: advanceRegionalDomains(runtime, generatedState.regionalDomains, state),
    },
  };
}

export function refreshGeneratedWorldSimulationFidelity(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = buildGeneratedWorld(state);
  const regionalDomains = createRegionalDomainState(runtimeWithColonies(baseRuntime, generatedState), generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  const effectiveGeneratedState = { ...generatedState, regionalDomains };
  const expeditionRegion = effectiveExpeditionRegion(runtime, effectiveGeneratedState);
  const playerNation = effectivePlayerNation(runtime, effectiveGeneratedState);
  const simulationFidelity = buildSimulationFidelityPlan(state, {
    runtime,
    generatedState: effectiveGeneratedState,
    expeditionRegion,
    playerNation,
  });
  return {
    ...state,
    generatedWorld: { ...effectiveGeneratedState, simulationFidelity },
  };
}

export function advanceGeneratedWorldBarbarians(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = buildGeneratedWorld(state);
  const colonyRuntime = runtimeWithColonies(baseRuntime, generatedState);
  const regionalDomains = createRegionalDomainState(colonyRuntime, generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  const geopolitics = createGeopoliticalWorldState(runtime, generatedState.geopolitics, state);
  const previousAdvancedPeriod = generatedState.barbarians?.lastAdvancedPeriod ?? null;
  const barbarians = advanceBarbarianWorld(runtime, generatedState.barbarians, state, {
    geopolitics,
    simulationFidelity: generatedState.simulationFidelity,
  });
  const currentEvents = previousAdvancedPeriod === barbarians.lastAdvancedPeriod
    ? []
    : barbarians.events.filter((event) => event.period === barbarians.lastAdvancedPeriod);
  for (const event of currentEvents.filter((entry) => entry.type === "monster_damage")) {
    for (const impact of event.impacts ?? []) {
      const settlement = regionalDomains.settlementStates[impact.settlementId];
      if (settlement) settlement.population = Math.max(1, settlement.population - impact.populationLoss);
    }
  }
  for (const event of currentEvents.filter((entry) => entry.type === "barbarian_tribute")) {
    const nationState = geopolitics.nationStates[event.nationId];
    if (nationState) nationState.reserves = Math.min(100, Math.max(0, nationState.reserves + event.reserveDelta));
  }
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains,
      geopolitics,
      barbarians,
    },
  };
}

export function setGeneratedBarbarianAgreement(state, siteId, agreementType, nationId = null) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = buildGeneratedWorld(state);
  const regionalDomains = createRegionalDomainState(runtimeWithColonies(baseRuntime, generatedState), generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains,
      barbarians: establishBarbarianAgreement(runtime, generatedState.barbarians, siteId, agreementType, nationId, state),
    },
  };
}

export function transferGeneratedRegionControl(state, regionId, nationId, options = {}) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = runtimeWithColonies(buildGeneratedWorld(state), generatedState);
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains: transferRegionControl(runtime, generatedState.regionalDomains, regionId, nationId, options, state),
    },
  };
}

export function declareGeneratedRegionIndependence(state, regionId, options = {}) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = runtimeWithColonies(buildGeneratedWorld(state), generatedState);
  const regionalDomains = declareRegionIndependence(runtime, generatedState.regionalDomains, regionId, options, state);
  const polityId = regionalDomains.regionStates[regionId].nationId;
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      playerNationId: options.playerControlled ? polityId : generatedState.playerNationId,
      regionalDomains,
    },
  };
}

export function appointGeneratedRegionalLord(state, regionId, appointment = {}) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = runtimeWithColonies(buildGeneratedWorld(state), generatedState);
  const next = {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains: appointRegionalLord(runtime, generatedState.regionalDomains, regionId, appointment, state),
    },
  };
  if (appointment.lordId === state.player?.id) {
    next.player = structuredClone(state.player);
    next.player.generatedRegionalOffices = [...(next.player.generatedRegionalOffices ?? []).filter((office) => office.regionId !== regionId), {
      regionId,
      officeTitle: next.generatedWorld.regionalDomains.regionStates[regionId].officeTitle,
      appointedPeriod: periodFor(state),
    }];
  }
  return next;
}

export function selectGeneratedWorldRegion(state, regionId) {
  const runtime = buildGeneratedWorld(state);
  const region = regionById(runtime, regionId);
  if (!region) throw new RangeError("存在しない地方です。");
  return {
    ...state,
    generatedWorld: {
      ...createGeneratedWorldState(state.generatedWorld ?? {}, state),
      selectedRegionId: region.id,
      legacySelectedTileId: undefined,
    },
  };
}

export function selectGeneratedWorldTile(state, tileId) {
  const runtime = buildGeneratedWorld(state);
  const tile = tileById(runtime, tileId);
  if (!tile?.regionId) throw new RangeError("地方に属さない地形区画です。");
  return selectGeneratedWorldRegion(state, tile.regionId);
}

export function setGeneratedPlayerNation(state, nationId, preparedRuntime = null) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = preparedRuntime?.key === generatedWorldRuntimeKey(generatedState) ? preparedRuntime : buildGeneratedWorld(state);
  const regionalDomains = createRegionalDomainState(runtimeWithColonies(baseRuntime, generatedState), generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  const nation = runtime.nationById.get(nationId);
  if (!nation) throw new RangeError("存在しない国家です。");
  const startingLocation = startingLocationForNation(runtime, nation);
  if (!startingLocation) throw new Error("選択した国家に城以外の陸上開始地点を確保できませんでした。");
  const { region: startingRegion, tile: startingTile } = startingLocation;
  const next = {
    ...state,
    generatedWorld: {
      ...generatedState,
      playerNationId: nation.id,
      expeditionRegionId: startingRegion.id,
      expeditionTileId: startingTile.id,
      selectedRegionId: startingRegion.id,
      legacyExpeditionTileId: undefined,
      legacySelectedTileId: undefined,
      expeditionMovement: GENERATED_WORLD_DEFAULTS.expeditionMovement,
      expeditionPeriod: periodFor(state),
      expeditionClockMinutes: GENERATED_WORLD_DEFAULTS.expeditionClockMinutes,
      discoveredRegionIds: discoveredAround(startingRegion),
      regionalDomains,
    },
  };
  return initializeGeneratedWorldGeopolitics(next);
}

export function regenerateGeneratedWorld(state, options = {}) {
  return {
    ...state,
    generatedWorld: createGeneratedWorldState({
      seed: options.seed,
      nationCount: options.nationCount,
      width: options.width ?? state.generatedWorld?.width,
      height: options.height ?? state.generatedWorld?.height,
      plateCount: options.plateCount ?? state.generatedWorld?.plateCount,
    }, state),
  };
}

export function getGeneratedExpeditionReachableRegions(state) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const runtime = buildGeneratedWorld(refreshed);
  const generatedState = createGeneratedWorldState(refreshed.generatedWorld ?? {}, refreshed);
  const start = effectiveExpeditionRegion(runtime, generatedState);
  const budget = generatedState.expeditionMovement;
  return start.neighborIds
    .map((regionId) => regionById(runtime, regionId))
    .filter(Boolean)
    .map((region) => {
      const travelOptions = generatedTravelOptions(runtime, generatedState, refreshed, region);
      const route = travelOptions.find((option) => option.id === "route");
      return route ? { ...route, regionIndex: region.index, travelOptions } : null;
    })
    .filter((entry) => entry?.available && entry.cost <= budget)
    .sort((left, right) => left.cost - right.cost || left.regionIndex - right.regionIndex);
}

export function getGeneratedExpeditionTravelOptions(state, destinationId) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const runtime = buildGeneratedWorld(refreshed);
  const generatedState = createGeneratedWorldState(refreshed.generatedWorld ?? {}, refreshed);
  const start = effectiveExpeditionRegion(runtime, generatedState);
  const destination = regionById(runtime, destinationId);
  if (!destination) throw new RangeError("存在しない地方です。");
  if (!start.neighborIds.includes(destination.id)) throw new RangeError("移動できるのは現在地に隣接する地方だけです。");
  return generatedTravelOptions(runtime, generatedState, refreshed, destination);
}

export function getGeneratedTravelCrimeContext(state, travel = state.generatedWorld?.lastTravel) {
  if (!travel?.fromRegionId || !travel?.destinationRegionId) throw new TypeError("犯罪行動に使える移動記録がありません。");
  const refreshed = refreshGeneratedWorldForDate(state);
  const generatedState = createGeneratedWorldState(refreshed.generatedWorld ?? {}, refreshed);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(refreshed), generatedState, refreshed);
  const origin = regionById(runtime, travel.fromRegionId);
  const destination = regionById(runtime, travel.destinationRegionId);
  if (!origin || !destination) throw new RangeError("移動記録の地方が生成世界に存在しません。");
  return {
    origin: { id: origin.id, name: origin.name, nationId: origin.nationId },
    destination: { id: destination.id, name: destination.name, nationId: destination.nationId },
    travel: structuredClone(travel),
    crossesJurisdiction: origin.id !== destination.id,
    crossesNationalBorder: origin.nationId !== destination.nationId,
  };
}

export function getGeneratedExpeditionReachableTiles(state) {
  return getGeneratedExpeditionReachableRegions(state);
}

function shippingDestinationsFor(runtime, generatedState) {
  const expeditionRegion = effectiveExpeditionRegion(runtime, generatedState);
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState, expeditionRegion);
  const currentPort = runtime.nations.objects.find((object) => object.maritime && object.tileIndex === expeditionTile.index) ?? null;
  if (!currentPort) return [];
  return (runtime.nations.seaRoutes ?? []).filter((route) => (
    route.fromObjectId === currentPort.id || route.toObjectId === currentPort.id
  )).map((route) => {
    const siteId = route.fromObjectId === currentPort.id ? route.toObjectId : route.fromObjectId;
    const object = runtime.nations.objects.find((entry) => entry.id === siteId);
    const region = object ? regionById(runtime, object.regionId) : null;
    const nation = object ? runtime.nationById.get(object.nationId) ?? null : null;
    return object && region ? {
      routeId: route.id,
      route,
      currentPort,
      siteId,
      name: object.name,
      type: object.type,
      object,
      region,
      nation,
      cost: route.movementCost,
      travelMinutes: route.travelMinutes,
      canMove: route.movementCost <= generatedState.expeditionMovement,
    } : null;
  }).filter(Boolean).sort((left, right) => (
    Number(right.canMove) - Number(left.canMove)
    || left.cost - right.cost
    || left.name.localeCompare(right.name, "ja")
  ));
}

export function getGeneratedShippingDestinations(state) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const generatedState = createGeneratedWorldState(refreshed.generatedWorld ?? {}, refreshed);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(refreshed), generatedState, refreshed);
  return shippingDestinationsFor(runtime, generatedState);
}

function generatedRoadDistance(runtime, regionId, tile, knownRoadTiles = null) {
  let best = Number.POSITIVE_INFINITY;
  if (knownRoadTiles) {
    for (const tileIndex of knownRoadTiles) {
      best = Math.min(best, generatedTileDistance(runtime, tile, runtime.tiles[tileIndex]));
      if (best === 0) break;
    }
    return best;
  }
  for (const road of runtime.nations.roads ?? []) {
    if (!road.regionIds?.includes(regionId)) continue;
    for (const tileIndex of road.tileIndices ?? []) {
      const roadTile = runtime.tiles[tileIndex];
      if (roadTile?.regionId !== regionId) continue;
      best = Math.min(best, generatedTileDistance(runtime, tile, roadTile));
      if (best === 0) return best;
    }
  }
  return best;
}

function colonizationSuitability(tile, terrainTile, nation) {
  const mountainAdapted = ["dwarf", "giant"].includes(nation.peopleId);
  const wetlandAdapted = nation.peopleId === "lizardman";
  if (tile.relief === "mountains" && !mountainAdapted) return null;
  if (tile.feature === "marsh" && !wetlandAdapted) return null;
  const score = tile.fertility / 8 + tile.freshwater * 20
    + tile.yields.food * 10 + tile.yields.production * 3 + tile.yields.commerce * 4
    - tile.movementCost * 2 - (terrainTile?.floodRisk ?? 0) * (wetlandAdapted ? 3 : 12);
  return score >= 8 ? Number(score.toFixed(1)) : null;
}

export function getGeneratedColonizationView(state) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const generatedState = createGeneratedWorldState(refreshed.generatedWorld ?? {}, refreshed);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(refreshed), generatedState, refreshed);
  const playerNation = effectivePlayerNation(runtime, generatedState);
  const expeditionRegion = effectiveExpeditionRegion(runtime, generatedState);
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState, expeditionRegion);
  const wealth = Number(refreshed.player?.metrics?.wealth) || 0;
  const food = Number(refreshed.player?.villageLife?.supplies?.food) || 0;
  const canAfford = wealth >= GENERATED_COLONY_COST.wealth && food >= GENERATED_COLONY_COST.food;
  const reputation = getRegionalReputationReport(refreshed, {
    regionId: expeditionRegion.id,
    regions: runtime.nations.regions,
  });
  const hasRequiredReputation = reputation.value >= GENERATED_COLONY_REQUIRED_REPUTATION;
  const owned = expeditionRegion.nationId === playerNation.id;
  const roadTiles = new Set((runtime.nations.roads ?? [])
    .filter((road) => road.regionIds?.includes(expeditionRegion.id))
    .flatMap((road) => road.tileIndices ?? [])
    .filter((index) => runtime.tiles[index]?.regionId === expeditionRegion.id));
  const urbanCenter = runtime.nations.objects.find((object) => object.id === expeditionRegion.roadHubObjectId)
    ?? runtime.nations.objects.find((object) => object.regionId === expeditionRegion.id && object.regionSeat);
  const urbanTile = urbanCenter ? runtime.tiles[urbanCenter.tileIndex] : null;
  const localSettlements = runtime.nations.objects.filter((object) => object.regionId === expeditionRegion.id && object.settlementLevel);
  const developedRadius = urbanTile ? Math.max(
    SETTLEMENT_EXPANSION_WAVE_TILES,
    ...localSettlements.map((object) => generatedTileDistance(runtime, urbanTile, runtime.tiles[object.tileIndex])),
  ) : 0;
  const maximumExpansionRadius = developedRadius + SETTLEMENT_EXPANSION_WAVE_TILES;
  const candidates = !owned || !urbanTile || !roadTiles.size ? [] : expeditionRegion.tileIndices.flatMap((tileIndex) => {
    const tile = runtime.tiles[tileIndex];
    const terrainTile = runtime.terrain.tiles[tileIndex];
    const score = colonizationSuitability(tile, terrainTile, playerNation);
    if (!tile?.passable || score === null || runtime.nations.objects.some((object) => (
      generatedVisualDistance(runtime, tile, runtime.tiles[object.tileIndex]) < GENERATED_OBJECT_MIN_DISTANCE
    ))) return [];
    const roadsideDistance = generatedRoadDistance(runtime, expeditionRegion.id, tile, roadTiles);
    const urbanDistance = generatedTileDistance(runtime, urbanTile, tile);
    if (roadsideDistance > ROADSIDE_SETTLEMENT_MAX_OFFSET || urbanDistance > maximumExpansionRadius) return [];
    const travelMinutes = tile.id === expeditionTile.id ? 0 : localTravelMinutes(runtime, expeditionTile, tile);
    const expansionWave = Math.max(1, Math.ceil(urbanDistance / SETTLEMENT_EXPANSION_WAVE_TILES));
    return [{
      id: tile.id,
      tileId: tile.id,
      tile,
      region: expeditionRegion,
      nation: playerNation,
      current: tile.id === expeditionTile.id,
      canMove: tile.id !== expeditionTile.id,
      travelMinutes,
      movementCost: 0,
      roadsideDistance,
      urbanDistance,
      expansionWave,
      suitability: score,
      defaultName: `${expeditionRegion.name.replace(/地方$/, "")}開拓${generatedState.colonies.length + 1}`,
      canFound: tile.id === expeditionTile.id && canAfford && hasRequiredReputation,
    }];
  }).sort((left, right) => (
    left.expansionWave - right.expansionWave
    || left.roadsideDistance - right.roadsideDistance
    || right.suitability - left.suitability
    || left.tile.index - right.tile.index
  )).slice(0, 12);
  const reason = !owned
    ? "植民できるのは自国が支配する地方だけです。"
    : !urbanTile ? "この地方には植民の起点となる都市・町がありません。"
      : !roadTiles.size ? "この地方には入植者を送れる街道がありません。"
        : !candidates.length ? "都市圏から段階的に延ばせる街道沿いの空き地がありません。"
          : !hasRequiredReputation ? `植民にはこの地方の名声${GENERATED_COLONY_REQUIRED_REPUTATION}が必要です（現在${reputation.value}）。依頼の達成や善行で信用を築いてください。`
            : !canAfford ? `植民には財産${GENERATED_COLONY_COST.wealth}と保存食${GENERATED_COLONY_COST.food}日分が必要です。`
              : "街道沿いの候補地へ移動すると村を建設できます。";
  return {
    runtime,
    generatedState,
    playerNation,
    expeditionRegion,
    expeditionTile,
    urbanCenter,
    developedRadius,
    maximumExpansionRadius,
    candidates,
    bestCandidate: candidates[0] ?? null,
    canAfford,
    reputation,
    requiredReputation: GENERATED_COLONY_REQUIRED_REPUTATION,
    hasRequiredReputation,
    owned,
    wealth,
    food,
    cost: GENERATED_COLONY_COST,
    reason,
  };
}

export function moveGeneratedExpeditionToColonizationSite(state, tileId) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const colonization = getGeneratedColonizationView(refreshed);
  const candidate = colonization.candidates.find((entry) => entry.tileId === tileId);
  if (!candidate) throw new RangeError(colonization.owned
    ? "この区画は街道沿いの植民候補地ではないか、既存集落との間隔が不足しています。"
    : colonization.reason);
  if (candidate.current) return refreshed;
  return {
    ...refreshed,
    generatedWorld: {
      ...cloneGeneratedWorldState(refreshed.generatedWorld),
      expeditionRegionId: candidate.region.id,
      expeditionTileId: candidate.tile.id,
      selectedRegionId: candidate.region.id,
      expeditionClockMinutes: advancedClockMinutes(refreshed.generatedWorld.expeditionClockMinutes, candidate.travelMinutes),
    },
  };
}

export function foundGeneratedVillage(state, tileId, options = {}) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const colonization = getGeneratedColonizationView(refreshed);
  const candidate = colonization.candidates.find((entry) => entry.tileId === tileId);
  if (!candidate) throw new RangeError(colonization.owned
    ? "この区画は街道沿いの植民候補地ではないか、既存集落との間隔が不足しています。"
    : colonization.reason);
  if (!candidate.current) throw new RangeError("植民候補地へ到着してから村を建設してください。");
  if (!colonization.hasRequiredReputation) throw new RangeError(colonization.reason);
  if (!colonization.canAfford) throw new RangeError(colonization.reason);
  if (!refreshed.player) throw new Error("植民を実行するプレイヤーが存在しません。");
  const sequence = colonization.generatedState.colonies.length + 1;
  const requestedName = String(options.name ?? candidate.defaultName).trim().replace(/[村町市]$/, "").slice(0, 32);
  const baseName = requestedName || candidate.defaultName;
  const colony = {
    id: `colony-${revisionHash(colonization.generatedState.seed)}-${sequence}`,
    tileId: candidate.tile.id,
    regionId: candidate.region.id,
    nationId: candidate.nation.id,
    baseName,
    population: GENERATED_COLONY_COST.initialPopulation,
    growthRate: Number((0.0035 + candidate.tile.yields.food * 0.00035 + candidate.tile.freshwater * 0.001).toFixed(5)),
    foundedPeriod: periodFor(refreshed),
    founderId: refreshed.player.id ?? null,
    expansionWave: candidate.expansionWave,
  };
  const nextGeneratedWorld = {
    ...cloneGeneratedWorldState(refreshed.generatedWorld),
    colonies: [...colonization.generatedState.colonies, colony],
    expeditionClockMinutes: advancedClockMinutes(refreshed.generatedWorld.expeditionClockMinutes, GENERATED_COLONY_COST.foundingMinutes),
  };
  const player = structuredClone(refreshed.player);
  player.metrics.wealth = Math.max(0, (player.metrics.wealth ?? 0) - GENERATED_COLONY_COST.wealth);
  player.villageLife.supplies.food = Math.max(0, (player.villageLife.supplies.food ?? 0) - GENERATED_COLONY_COST.food);
  const next = { ...refreshed, player, generatedWorld: nextGeneratedWorld };
  const colonyRuntime = runtimeWithColonies(buildGeneratedWorld(next), createGeneratedWorldState(nextGeneratedWorld, next));
  next.generatedWorld.regionalDomains = createRegionalDomainState(colonyRuntime, nextGeneratedWorld.regionalDomains, next);
  return next;
}

export function getGeneratedWorldSiteView(state, siteId) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const generatedState = createGeneratedWorldState(refreshed.generatedWorld ?? {}, refreshed);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(refreshed), generatedState, refreshed);
  const object = runtime.nations.objects.find((entry) => entry.id === siteId);
  if (!object) throw new RangeError("存在しない地図上の拠点です。");
  const tile = runtime.tiles[object.tileIndex];
  const region = regionById(runtime, object.regionId ?? tile?.regionId);
  const nation = runtime.nationById.get(object.nationId) ?? null;
  if (!tile?.passable || !region || tile.regionId !== region.id) throw new Error("この拠点には移動可能な陸上区画がありません。");
  const expeditionRegion = effectiveExpeditionRegion(runtime, generatedState);
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState, expeditionRegion);
  const sameRegion = region.id === expeditionRegion.id;
  const reachableRegion = sameRegion
    ? { regionId: region.id, cost: 0, travelMinutes: 0, pathRegionIds: [] }
    : getGeneratedExpeditionReachableRegions(refreshed).find((entry) => entry.regionId === region.id) ?? null;
  const shippingDestination = object.maritime
    ? shippingDestinationsFor(runtime, generatedState).find((entry) => entry.siteId === object.id) ?? null
    : null;
  const current = expeditionTile.id === tile.id;
  const regionalArrivalTile = sameRegion ? expeditionTile : playableTileForRegion(runtime, region);
  const approachMinutes = current || !regionalArrivalTile ? 0 : localTravelMinutes(runtime, regionalArrivalTile, tile);
  const travelMode = shippingDestination ? "sea" : "land";
  const canMove = !current && (travelMode === "sea" ? Boolean(shippingDestination.canMove) : Boolean(reachableRegion));
  return {
    id: object.id,
    type: object.type,
    name: object.name,
    object,
    tile,
    region,
    nation,
    current,
    sameRegion,
    canMove,
    travelMode,
    movementCost: travelMode === "sea" ? shippingDestination?.cost ?? null : reachableRegion?.cost ?? null,
    travelMinutes: travelMode === "sea" ? shippingDestination?.travelMinutes ?? null : reachableRegion ? reachableRegion.travelMinutes + approachMinutes : null,
    shippingRoute: shippingDestination?.route ?? null,
    currentPort: shippingDestination?.currentPort ?? null,
  };
}

export function moveGeneratedExpeditionToRegion(state, destinationId, options = {}) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const runtime = buildGeneratedWorld(refreshed);
  const generatedState = cloneGeneratedWorldState(refreshed.generatedWorld);
  const from = effectiveExpeditionRegion(runtime, generatedState);
  const legacyTile = tileById(runtime, destinationId);
  const destination = regionById(runtime, destinationId) ?? regionById(runtime, legacyTile?.regionId);
  if (!destination) throw new RangeError("存在しない地方です。");
  if (destination.id === from.id) return selectGeneratedWorldRegion(refreshed, destination.id);
  if (!from.neighborIds.includes(destination.id)) throw new RangeError("移動できるのは現在地に隣接する地方だけです。");
  const travelMode = options.mode ?? generatedState.travelModePreference ?? "route";
  if (!GENERATED_TRAVEL_MODES[travelMode]) throw new RangeError("不明な移動手段です。");
  const reachable = getGeneratedExpeditionTravelOptions(refreshed, destination.id).find((entry) => entry.id === travelMode);
  if (!reachable?.available) throw new RangeError(reachable?.unavailableReason ?? "この隣接地方へ移動するための物資が不足しています。");
  const destinationTile = playableTileForRegion(runtime, destination);
  if (!destinationTile) throw new Error("移動先に通行可能な陸上区画がありません。");
  const discovered = new Set(generatedState.discoveredRegionIds);
  [from.id, ...reachable.pathRegionIds].forEach((pathRegionId) => {
    const pathRegion = regionById(runtime, pathRegionId);
    if (pathRegion) discoveredAround(pathRegion).forEach((id) => discovered.add(id));
  });
  const encounterRoll = Number.isFinite(options.encounterRoll)
    ? options.encounterRoll
    : stableTravelRoll(`${generatedState.seed}|${generatedState.expeditionPeriod}|${generatedState.expeditionClockMinutes}|${from.id}|${destination.id}|${travelMode}`);
  const strengthRoll = Number.isFinite(options.strengthRoll)
    ? options.strengthRoll
    : stableTravelRoll(`${generatedState.seed}|${destination.id}|${travelMode}|strength`);
  const encounterTriggered = encounterRoll < reachable.encounterChance;
  const encounterStrength = travelMode === "route"
    ? strengthRoll < 0.82 ? "weak" : "standard"
    : strengthRoll < 0.65 ? "strong" : "standard";
  const next = {
    ...refreshed,
    generatedWorld: {
      ...generatedState,
      expeditionRegionId: destination.id,
      expeditionTileId: destinationTile.id,
      selectedRegionId: destination.id,
      legacyExpeditionTileId: undefined,
      legacySelectedTileId: undefined,
      expeditionMovement: generatedState.expeditionMovement - reachable.cost,
      expeditionClockMinutes: advancedClockMinutes(generatedState.expeditionClockMinutes, reachable.travelMinutes),
      travelModePreference: generatedState.travelModePreference ?? travelMode,
      discoveredRegionIds: [...discovered].slice(-512),
      lastTravel: {
        fromRegionId: from.id,
        destinationRegionId: destination.id,
        mode: travelMode,
        modeName: reachable.name,
        travelMinutes: reachable.travelMinutes,
        movementCost: reachable.cost,
        supplyCost: reachable.supplyCost,
        encounterChance: reachable.encounterChance,
        encounter: encounterTriggered ? { triggered: true, strength: encounterStrength } : null,
      },
    },
  };
  if (next.player?.villageLife) {
    next.player = structuredClone(next.player);
    next.player.villageLife.supplies.food = Math.max(0, next.player.villageLife.supplies.food - reachable.supplyCost);
    next.player.villageLife.fatigue = Math.min(100, (next.player.villageLife.fatigue ?? 0) + (travelMode === "direct" ? 18 : 6));
  }
  return next;
}

export function moveGeneratedExpeditionTo(state, destinationId) {
  return moveGeneratedExpeditionToRegion(state, destinationId);
}

export function moveGeneratedExpeditionToSite(state, siteId) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const site = getGeneratedWorldSiteView(refreshed, siteId);
  if (site.current) return selectGeneratedWorldRegion(refreshed, site.region.id);
  if (!site.canMove) {
    if (site.shippingRoute) throw new RangeError(`この海路を利用するための移動力が不足しています（必要 ${site.movementCost}）。`);
    const { expeditionRegion } = getGeneratedWorldView(refreshed);
    if (!expeditionRegion.neighborIds.includes(site.region.id)) {
      throw new RangeError("陸路は隣接地方までです。遠方の港へは港に停泊して海路を利用してください。");
    }
    throw new RangeError("この拠点へ移動するための移動力が不足しています。");
  }
  if (site.travelMode === "sea") {
    const generatedState = cloneGeneratedWorldState(refreshed.generatedWorld);
    const runtime = effectiveRuntimeFor(buildGeneratedWorld(refreshed), generatedState, refreshed);
    const from = effectiveExpeditionRegion(runtime, generatedState);
    const discovered = new Set(generatedState.discoveredRegionIds);
    [from, site.region].forEach((region) => discoveredAround(region).forEach((id) => discovered.add(id)));
    return {
      ...refreshed,
      generatedWorld: {
        ...generatedState,
        expeditionRegionId: site.region.id,
        expeditionTileId: site.tile.id,
        selectedRegionId: site.region.id,
        legacyExpeditionTileId: undefined,
        legacySelectedTileId: undefined,
        expeditionMovement: generatedState.expeditionMovement - site.movementCost,
        expeditionClockMinutes: advancedClockMinutes(generatedState.expeditionClockMinutes, site.travelMinutes),
        discoveredRegionIds: [...discovered].slice(-512),
      },
    };
  }
  if (site.sameRegion) {
    return {
      ...refreshed,
      generatedWorld: {
        ...cloneGeneratedWorldState(refreshed.generatedWorld),
        expeditionRegionId: site.region.id,
        expeditionTileId: site.tile.id,
        selectedRegionId: site.region.id,
        legacyExpeditionTileId: undefined,
        legacySelectedTileId: undefined,
        expeditionClockMinutes: advancedClockMinutes(refreshed.generatedWorld.expeditionClockMinutes, site.travelMinutes),
      },
    };
  }
  const moved = moveGeneratedExpeditionToRegion(refreshed, site.region.id);
  return {
    ...moved,
    generatedWorld: {
      ...moved.generatedWorld,
      expeditionTileId: site.tile.id,
      expeditionClockMinutes: advancedClockMinutes(refreshed.generatedWorld.expeditionClockMinutes, site.travelMinutes),
    },
  };
}

export function moveGeneratedExpedition(state, directionName) {
  const direction = DIRECTION_BY_NAME.get(directionName);
  if (!direction) throw new RangeError("移動方向は東西南北のいずれかです。");
  const refreshed = refreshGeneratedWorldForDate(state);
  const runtime = buildGeneratedWorld(refreshed);
  const generatedState = cloneGeneratedWorldState(refreshed.generatedWorld);
  const from = effectiveExpeditionRegion(runtime, generatedState);
  const fromTile = runtime.tiles[from.anchorIndex];
  const destination = from.neighborIds.map((id) => regionById(runtime, id)).map((region) => {
    const tile = runtime.tiles[region.anchorIndex];
    let dx = tile.x - fromTile.x;
    if (runtime.terrain.config.wrapX && Math.abs(dx) > runtime.terrain.width / 2) dx -= Math.sign(dx) * runtime.terrain.width;
    const dy = tile.y - fromTile.y;
    const forward = dx * direction.dx + dy * direction.dy;
    const lateral = Math.abs(dx * direction.dy - dy * direction.dx);
    return { region, score: forward * 10 - lateral };
  }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score || left.region.index - right.region.index)[0]?.region;
  if (!destination) throw new RangeError("その方角に接する地方はありません。");
  const cost = movementCostFor(destination);
  if (generatedState.expeditionMovement < cost) throw new RangeError(`移動力が不足しています（必要 ${cost}）。`);
  return moveGeneratedExpeditionToRegion(refreshed, destination.id);
}

export function generatedWorldSaveSummary(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  return {
    seed: generatedState.seed,
    size: `${generatedState.width}x${generatedState.height}`,
    nationCount: generatedState.nationCount,
    playerNationId: generatedState.playerNationId,
    expeditionRegionId: generatedState.expeditionRegionId,
    expeditionTileId: generatedState.expeditionTileId,
    discoveredRegionCount: generatedState.discoveredRegionIds.length,
    colonyCount: generatedState.colonies.length,
    barbarianSiteCount: generatedState.barbarians?.sites?.filter((site) => site.status !== "destroyed").length ?? 0,
  };
}

export function clearGeneratedWorldRuntimeCache() {
  runtimeCache = { key: null, value: null };
}
