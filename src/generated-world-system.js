import { generateTerrain } from "./terrain-generation.js";
import { generateNations } from "./nation-generation.js";
import { SQUARE_CARDINAL_DIRECTIONS, squareTileIndex } from "./square-grid.js";

export const GENERATED_WORLD_DEFAULTS = Object.freeze({
  version: 1,
  seed: "eldoria-317",
  width: 72,
  height: 48,
  plateCount: 11,
  nationCount: 7,
  playerNationId: "nation-1",
  selectedTileId: null,
  expeditionTileId: null,
  expeditionMovement: 8,
  expeditionPeriod: "317-4",
  discoveredTileIds: [],
});

const DIRECTION_BY_NAME = new Map(SQUARE_CARDINAL_DIRECTIONS.map((direction) => [direction.name, direction]));
let runtimeCache = { key: null, value: null };

function cloneGeneratedWorldState(value) {
  return {
    ...value,
    discoveredTileIds: [...(value.discoveredTileIds ?? [])],
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

function effectivePlayerNation(runtime, generatedState) {
  return runtime.nations.nations.find((nation) => nation.id === generatedState.playerNationId)
    ?? runtime.nations.nations[0];
}

function effectiveExpeditionTile(runtime, generatedState) {
  const stored = tileById(runtime, generatedState.expeditionTileId);
  if (stored?.passable) return stored;
  const nation = effectivePlayerNation(runtime, generatedState);
  return runtime.tiles[nation.capitalIndex];
}

function discoveredAround(runtime, tile) {
  return [tile.index, ...tile.orthogonalNeighbors].map((index) => runtime.tiles[index].id);
}

export function createGeneratedWorldState(options = {}, dateState = null) {
  return {
    ...GENERATED_WORLD_DEFAULTS,
    seed: String(options.seed ?? GENERATED_WORLD_DEFAULTS.seed).slice(0, 80) || GENERATED_WORLD_DEFAULTS.seed,
    width: clampInteger(options.width, GENERATED_WORLD_DEFAULTS.width, 24, 120),
    height: clampInteger(options.height, GENERATED_WORLD_DEFAULTS.height, 16, 80),
    plateCount: clampInteger(options.plateCount, GENERATED_WORLD_DEFAULTS.plateCount, 3, 32),
    nationCount: clampInteger(options.nationCount, GENERATED_WORLD_DEFAULTS.nationCount, 3, 12),
    playerNationId: typeof options.playerNationId === "string" ? options.playerNationId : GENERATED_WORLD_DEFAULTS.playerNationId,
    selectedTileId: typeof options.selectedTileId === "string" ? options.selectedTileId : null,
    expeditionTileId: typeof options.expeditionTileId === "string" ? options.expeditionTileId : null,
    expeditionMovement: clampInteger(options.expeditionMovement, GENERATED_WORLD_DEFAULTS.expeditionMovement, 0, 8),
    expeditionPeriod: options.expeditionPeriod ?? periodFor(dateState),
    discoveredTileIds: [...new Set((options.discoveredTileIds ?? []).filter((id) => typeof id === "string"))].slice(0, 4096),
  };
}

export function normalizeGeneratedWorldState(state) {
  state.generatedWorld = createGeneratedWorldState(state.generatedWorld ?? {}, state);
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
  const key = [generatedState.seed, generatedState.width, generatedState.height, generatedState.plateCount, generatedState.nationCount].join("|");
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
    },
  };
  return runtimeCache.value;
}

export function getGeneratedWorldView(state) {
  const runtime = buildGeneratedWorld(state);
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  const playerNation = effectivePlayerNation(runtime, generatedState);
  const expeditionTile = effectiveExpeditionTile(runtime, generatedState);
  const selectedTile = tileById(runtime, generatedState.selectedTileId) ?? expeditionTile;
  return { runtime, generatedState, playerNation, expeditionTile, selectedTile };
}

export function selectGeneratedWorldTile(state, tileId) {
  const runtime = buildGeneratedWorld(state);
  const tile = tileById(runtime, tileId);
  if (!tile) throw new RangeError("存在しない正方形タイルです。");
  return {
    ...state,
    generatedWorld: {
      ...createGeneratedWorldState(state.generatedWorld ?? {}, state),
      selectedTileId: tile.id,
    },
  };
}

export function setGeneratedPlayerNation(state, nationId) {
  const runtime = buildGeneratedWorld(state);
  const nation = runtime.nationById.get(nationId);
  if (!nation) throw new RangeError("存在しない国家です。");
  const capital = runtime.tiles[nation.capitalIndex];
  return {
    ...state,
    generatedWorld: {
      ...createGeneratedWorldState(state.generatedWorld ?? {}, state),
      playerNationId: nation.id,
      expeditionTileId: capital.id,
      selectedTileId: capital.id,
      expeditionMovement: GENERATED_WORLD_DEFAULTS.expeditionMovement,
      expeditionPeriod: periodFor(state),
      discoveredTileIds: discoveredAround(runtime, capital),
    },
  };
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

export function moveGeneratedExpedition(state, directionName) {
  const direction = DIRECTION_BY_NAME.get(directionName);
  if (!direction) throw new RangeError("移動方向は東西南北のいずれかです。");
  const refreshed = refreshGeneratedWorldForDate(state);
  const runtime = buildGeneratedWorld(refreshed);
  const generatedState = cloneGeneratedWorldState(refreshed.generatedWorld);
  const from = effectiveExpeditionTile(runtime, generatedState);
  let x = from.x + direction.dx;
  const y = from.y + direction.dy;
  if (runtime.terrain.config.wrapX) x = (x + runtime.terrain.width) % runtime.terrain.width;
  if (x < 0 || x >= runtime.terrain.width || y < 0 || y >= runtime.terrain.height) {
    throw new RangeError("極域の外へは進めません。");
  }
  const destination = runtime.tiles[squareTileIndex(x, y, runtime.terrain.width)];
  if (!destination.passable) throw new RangeError("探索隊は外洋・湖沼タイルへ進めません。");
  const cost = Math.max(1, Math.ceil(destination.movementCost));
  if (generatedState.expeditionMovement < cost) throw new RangeError(`移動力が不足しています（必要 ${cost}）。`);
  const discovered = new Set(generatedState.discoveredTileIds);
  discoveredAround(runtime, from).forEach((id) => discovered.add(id));
  discoveredAround(runtime, destination).forEach((id) => discovered.add(id));
  return {
    ...refreshed,
    generatedWorld: {
      ...generatedState,
      expeditionTileId: destination.id,
      selectedTileId: destination.id,
      expeditionMovement: generatedState.expeditionMovement - cost,
      discoveredTileIds: [...discovered].slice(-4096),
    },
  };
}

export function generatedWorldSaveSummary(state) {
  const generatedState = createGeneratedWorldState(state.generatedWorld ?? {}, state);
  return {
    seed: generatedState.seed,
    size: `${generatedState.width}x${generatedState.height}`,
    nationCount: generatedState.nationCount,
    playerNationId: generatedState.playerNationId,
    expeditionTileId: generatedState.expeditionTileId,
    discoveredTileCount: generatedState.discoveredTileIds.length,
  };
}

export function clearGeneratedWorldRuntimeCache() {
  runtimeCache = { key: null, value: null };
}
