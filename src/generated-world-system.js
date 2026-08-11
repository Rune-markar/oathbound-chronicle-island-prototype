import { generateTerrain } from "./terrain-generation.js";
import { generateNations } from "./nation-generation.js";
import { SQUARE_CARDINAL_DIRECTIONS, squareTileIndex } from "./square-grid.js";
import {
  advanceGeopoliticalWorld,
  createGeopoliticalWorldState,
  getGeopoliticalWorldView,
  preserveGeopoliticalState,
} from "./geopolitical-world.js";
import {
  advanceRegionalDomains,
  appointRegionalLord,
  createRegionalDomainState,
  declareRegionIndependence,
  getRegionalDomainView,
  preserveRegionalDomainState,
  transferRegionControl,
} from "./regional-domain-system.js";

export const GENERATED_WORLD_DEFAULTS = Object.freeze({
  version: 10,
  seed: "eldoria-317",
  width: 160,
  height: 100,
  plateCount: 22,
  nationCount: 7,
  playerNationId: "nation-1",
  selectedRegionId: null,
  expeditionRegionId: null,
  expeditionTileId: null,
  expeditionMovement: 8,
  expeditionPeriod: "317-4",
  expeditionClockMinutes: 8 * 60,
  discoveredRegionIds: [],
  geopolitics: null,
  regionalDomains: null,
});

const DIRECTION_BY_NAME = new Map(SQUARE_CARDINAL_DIRECTIONS.map((direction) => [direction.name, direction]));
let runtimeCache = { key: null, value: null };
let characterWorldSequence = 0;
const GENERATED_WORLD_CLOCK_LIMIT = 999 * 24 * 60 - 1;

function generatedWorldRuntimeKey(generatedState) {
  return ["regional-hd-v6-maritime", generatedState.seed, generatedState.width, generatedState.height, generatedState.plateCount, generatedState.nationCount].join("|");
}

function cloneGeneratedWorldState(value) {
  return {
    ...value,
    discoveredRegionIds: [...(value.discoveredRegionIds ?? [])],
    geopolitics: preserveGeopoliticalState(value.geopolitics),
    regionalDomains: preserveRegionalDomainState(value.regionalDomains),
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

function effectiveRuntimeFor(baseRuntime, generatedState, dateState = null) {
  const regional = getRegionalDomainView(baseRuntime, generatedState.regionalDomains, dateState);
  return {
    ...baseRuntime,
    key: `${baseRuntime.key}|domains-${revisionHash(regional.visualRevision)}`,
    nations: regional.nationMap,
    nationById: regional.nationById,
    regionById: regional.regionById,
    regionalDomains: regional.domains,
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
  return regionById(runtime, nation.capitalRegionId);
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

function effectiveExpeditionTile(runtime, generatedState, expeditionRegion) {
  const stored = validTileForRegion(runtime, expeditionRegion, generatedState.expeditionTileId);
  if (stored) return stored;
  const legacy = validTileForRegion(runtime, expeditionRegion, generatedState.legacyExpeditionTileId);
  if (legacy) return legacy;
  return playableTileForRegion(runtime, expeditionRegion);
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
  const upgradeResolution = upgradeLegacyResolution || upgradePreviousResolution;
  return {
    ...GENERATED_WORLD_DEFAULTS,
    seed: String(options.seed ?? GENERATED_WORLD_DEFAULTS.seed).slice(0, 80) || GENERATED_WORLD_DEFAULTS.seed,
    width: clampInteger(upgradeResolution ? GENERATED_WORLD_DEFAULTS.width : options.width, GENERATED_WORLD_DEFAULTS.width, 24, 160),
    height: clampInteger(upgradeResolution ? GENERATED_WORLD_DEFAULTS.height : options.height, GENERATED_WORLD_DEFAULTS.height, 16, 100),
    plateCount: clampInteger(upgradeResolution ? GENERATED_WORLD_DEFAULTS.plateCount : options.plateCount, GENERATED_WORLD_DEFAULTS.plateCount, 3, 32),
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
    discoveredRegionIds: [...new Set((options.discoveredRegionIds ?? []).filter((id) => typeof id === "string"))].slice(0, 512),
    geopolitics: preserveGeopoliticalState(options.geopolitics),
    regionalDomains: preserveRegionalDomainState(options.regionalDomains),
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
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(state), generatedState, state);
  const playerNation = effectivePlayerNation(runtime, generatedState);
  const expeditionRegion = effectiveExpeditionRegion(runtime, generatedState);
  const selectedRegion = effectiveSelectedRegion(runtime, generatedState, expeditionRegion);
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState, expeditionRegion);
  const selectedTile = runtime.tiles[selectedRegion.anchorIndex];
  return { runtime, generatedState, playerNation, expeditionRegion, selectedRegion, expeditionTile, selectedTile };
}

export function getGeneratedGeopoliticalView(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = effectiveRuntimeFor(buildGeneratedWorld(state), generatedState, state);
  return getGeopoliticalWorldView(runtime, generatedState.geopolitics, state);
}

export function getGeneratedRegionalDomainView(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  return getRegionalDomainView(buildGeneratedWorld(state), generatedState.regionalDomains, state);
}

export function initializeGeneratedWorldGeopolitics(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = buildGeneratedWorld(state);
  const regionalDomains = createRegionalDomainState(baseRuntime, generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  if (generatedState.geopolitics) return { ...state, generatedWorld: { ...generatedState, regionalDomains } };
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains,
      geopolitics: createGeopoliticalWorldState(runtime, null, state),
    },
  };
}

function previousPeriodDate(state) {
  const month = Number.isInteger(state?.month) ? state.month : 4;
  const year = Number.isInteger(state?.year) ? state.year : 317;
  return month > 1 ? { year, month: month - 1 } : { year: year - 1, month: 12 };
}

export function advanceGeneratedWorldGeopolitics(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseRuntime = buildGeneratedWorld(state);
  const regionalDomains = createRegionalDomainState(baseRuntime, generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  const baseline = generatedState.geopolitics
    ?? createGeopoliticalWorldState(runtime, null, previousPeriodDate(state));
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains,
      geopolitics: advanceGeopoliticalWorld(runtime, baseline, state),
    },
  };
}

export function advanceGeneratedWorldRegions(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = buildGeneratedWorld(state);
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      regionalDomains: advanceRegionalDomains(runtime, generatedState.regionalDomains, state),
    },
  };
}

export function transferGeneratedRegionControl(state, regionId, nationId, options = {}) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const runtime = buildGeneratedWorld(state);
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
  const runtime = buildGeneratedWorld(state);
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
  const runtime = buildGeneratedWorld(state);
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
  const regionalDomains = createRegionalDomainState(baseRuntime, generatedState.regionalDomains, state);
  const runtime = effectiveRuntimeFor(baseRuntime, { ...generatedState, regionalDomains }, state);
  const nation = runtime.nationById.get(nationId);
  if (!nation) throw new RangeError("存在しない国家です。");
  const capitalRegion = regionById(runtime, nation.capitalRegionId);
  const startingTile = playableTileForRegion(runtime, capitalRegion);
  if (!startingTile) throw new Error("選択した国家に陸上の開始地点を確保できませんでした。");
  const next = {
    ...state,
    generatedWorld: {
      ...generatedState,
      playerNationId: nation.id,
      expeditionRegionId: capitalRegion.id,
      expeditionTileId: startingTile.id,
      selectedRegionId: capitalRegion.id,
      legacyExpeditionTileId: undefined,
      legacySelectedTileId: undefined,
      expeditionMovement: GENERATED_WORLD_DEFAULTS.expeditionMovement,
      expeditionPeriod: periodFor(state),
      expeditionClockMinutes: GENERATED_WORLD_DEFAULTS.expeditionClockMinutes,
      discoveredRegionIds: discoveredAround(capitalRegion),
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
    .map((region) => ({
      regionId: region.id,
      regionIndex: region.index,
      cost: movementCostFor(region),
      travelMinutes: regionalTravelMinutes(movementCostFor(region)),
      pathRegionIds: [region.id],
    }))
    .filter((entry) => entry.cost <= budget)
    .sort((left, right) => left.cost - right.cost || left.regionIndex - right.regionIndex);
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

export function moveGeneratedExpeditionToRegion(state, destinationId) {
  const refreshed = refreshGeneratedWorldForDate(state);
  const runtime = buildGeneratedWorld(refreshed);
  const generatedState = cloneGeneratedWorldState(refreshed.generatedWorld);
  const from = effectiveExpeditionRegion(runtime, generatedState);
  const legacyTile = tileById(runtime, destinationId);
  const destination = regionById(runtime, destinationId) ?? regionById(runtime, legacyTile?.regionId);
  if (!destination) throw new RangeError("存在しない地方です。");
  if (destination.id === from.id) return selectGeneratedWorldRegion(refreshed, destination.id);
  if (!from.neighborIds.includes(destination.id)) throw new RangeError("移動できるのは現在地に隣接する地方だけです。");
  const reachable = getGeneratedExpeditionReachableRegions(refreshed).find((entry) => entry.regionId === destination.id);
  if (!reachable) throw new RangeError("この隣接地方へ移動するための移動力が不足しています。");
  const destinationTile = playableTileForRegion(runtime, destination);
  if (!destinationTile) throw new Error("移動先に通行可能な陸上区画がありません。");
  const discovered = new Set(generatedState.discoveredRegionIds);
  [from.id, ...reachable.pathRegionIds].forEach((pathRegionId) => {
    const pathRegion = regionById(runtime, pathRegionId);
    if (pathRegion) discoveredAround(pathRegion).forEach((id) => discovered.add(id));
  });
  return {
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
      discoveredRegionIds: [...discovered].slice(-512),
    },
  };
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
  };
}

export function clearGeneratedWorldRuntimeCache() {
  runtimeCache = { key: null, value: null };
}
