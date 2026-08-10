import { generateTerrain } from "./terrain-generation.js";
import { generateNations } from "./nation-generation.js";
import { SQUARE_CARDINAL_DIRECTIONS, squareTileIndex } from "./square-grid.js";
import {
  advanceGeopoliticalWorld,
  createGeopoliticalWorldState,
  getGeopoliticalWorldView,
  preserveGeopoliticalState,
} from "./geopolitical-world.js";

export const GENERATED_WORLD_DEFAULTS = Object.freeze({
  version: 7,
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
  discoveredRegionIds: [],
  geopolitics: null,
});

const DIRECTION_BY_NAME = new Map(SQUARE_CARDINAL_DIRECTIONS.map((direction) => [direction.name, direction]));
let runtimeCache = { key: null, value: null };
let characterWorldSequence = 0;

function generatedWorldRuntimeKey(generatedState) {
  return ["regional-hd-v5", generatedState.seed, generatedState.width, generatedState.height, generatedState.plateCount, generatedState.nationCount].join("|");
}

function cloneGeneratedWorldState(value) {
  return {
    ...value,
    discoveredRegionIds: [...(value.discoveredRegionIds ?? [])],
    geopolitics: preserveGeopoliticalState(value.geopolitics),
  };
}

function clampInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function periodFor(state) {
  return `${Number.isInteger(state?.year) ? state.year : 317}-${Number.isInteger(state?.month) ? state.month : 4}`;
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
  return runtime.nations.nations.find((nation) => nation.id === generatedState.playerNationId)
    ?? runtime.nations.nations[0];
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
    discoveredRegionIds: [...new Set((options.discoveredRegionIds ?? []).filter((id) => typeof id === "string"))].slice(0, 512),
    geopolitics: preserveGeopoliticalState(options.geopolitics),
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
    };
  }
  return next;
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
  onProgress({ progress: 94, stage: "nations", label: "地方・国境・開始地点を確定しています" });
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
  const runtime = buildGeneratedWorld(state);
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const playerNation = effectivePlayerNation(runtime, generatedState);
  const expeditionRegion = effectiveExpeditionRegion(runtime, generatedState);
  const selectedRegion = effectiveSelectedRegion(runtime, generatedState, expeditionRegion);
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState, expeditionRegion);
  const selectedTile = runtime.tiles[selectedRegion.anchorIndex];
  return { runtime, generatedState, playerNation, expeditionRegion, selectedRegion, expeditionTile, selectedTile };
}

export function getGeneratedGeopoliticalView(state) {
  const runtime = buildGeneratedWorld(state);
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  return getGeopoliticalWorldView(runtime, generatedState.geopolitics, state);
}

export function initializeGeneratedWorldGeopolitics(state) {
  const runtime = buildGeneratedWorld(state);
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  if (generatedState.geopolitics) return { ...state, generatedWorld: generatedState };
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
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
  const runtime = buildGeneratedWorld(state);
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const baseline = generatedState.geopolitics
    ?? createGeopoliticalWorldState(runtime, null, previousPeriodDate(state));
  return {
    ...state,
    generatedWorld: {
      ...generatedState,
      geopolitics: advanceGeopoliticalWorld(runtime, baseline, state),
    },
  };
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
  const runtime = preparedRuntime?.key === generatedWorldRuntimeKey(generatedState) ? preparedRuntime : buildGeneratedWorld(state);
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
      discoveredRegionIds: discoveredAround(capitalRegion),
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
      pathRegionIds: [region.id],
    }))
    .filter((entry) => entry.cost <= budget)
    .sort((left, right) => left.cost - right.cost || left.regionIndex - right.regionIndex);
}

export function getGeneratedExpeditionReachableTiles(state) {
  return getGeneratedExpeditionReachableRegions(state);
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
      expeditionTileId: playableTileForRegion(runtime, destination)?.id ?? null,
      selectedRegionId: destination.id,
      legacyExpeditionTileId: undefined,
      legacySelectedTileId: undefined,
      expeditionMovement: generatedState.expeditionMovement - reachable.cost,
      discoveredRegionIds: [...discovered].slice(-512),
    },
  };
}

export function moveGeneratedExpeditionTo(state, destinationId) {
  return moveGeneratedExpeditionToRegion(state, destinationId);
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
