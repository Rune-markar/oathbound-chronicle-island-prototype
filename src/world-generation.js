import { generateNations } from "./nation-generation.js";
import { generateTerrain } from "./terrain-generation.js";

export const WORLD_GENERATION_ALGORITHM = Object.freeze({
  id: "regional-hd-v10-geographic-features",
  version: 2,
  sourceGeneration: "v2",
});

export const WORLD_GENERATION_DEFAULTS = Object.freeze({
  seed: "eldoria-317",
  width: 192,
  height: 120,
  plateCount: 28,
  nationCount: 7,
});

let runtimeCache = { key: null, value: null };

function clampInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

export function normalizeWorldGenerationOptions(options = {}) {
  return {
    seed: String(options.seed ?? WORLD_GENERATION_DEFAULTS.seed).slice(0, 80) || WORLD_GENERATION_DEFAULTS.seed,
    width: clampInteger(options.width, WORLD_GENERATION_DEFAULTS.width, 24, 192),
    height: clampInteger(options.height, WORLD_GENERATION_DEFAULTS.height, 16, 120),
    plateCount: clampInteger(options.plateCount, WORLD_GENERATION_DEFAULTS.plateCount, 3, 36),
    nationCount: clampInteger(options.nationCount, WORLD_GENERATION_DEFAULTS.nationCount, 3, 12),
    wrapX: true,
  };
}

export function worldGenerationRuntimeKey(options = {}) {
  const config = normalizeWorldGenerationOptions(options);
  return [
    WORLD_GENERATION_ALGORITHM.id,
    config.seed,
    config.width,
    config.height,
    config.plateCount,
    config.nationCount,
  ].join("|");
}

function generateWorldTerrain(config) {
  return generateTerrain({
    seed: config.seed,
    width: config.width,
    height: config.height,
    plateCount: config.plateCount,
    wrapX: config.wrapX,
  });
}

function generateWorldNations(config, terrain) {
  return generateNations(terrain, {
    count: config.nationCount,
    seed: `${config.seed}:nations`,
  });
}

function createRuntime(config, key, terrain, nations) {
  return {
    key,
    worldGeneration: Object.freeze({
      ...WORLD_GENERATION_ALGORITHM,
      config: Object.freeze({ ...config }),
    }),
    terrain,
    nations,
    tiles: nations.tiles,
    nationById: new Map(nations.nations.map((nation) => [nation.id, nation])),
    regionById: new Map(nations.regions.map((region) => [region.id, region])),
  };
}

export function buildWorldGeneration(options = {}) {
  const config = normalizeWorldGenerationOptions(options);
  const key = worldGenerationRuntimeKey(config);
  if (runtimeCache.key === key) return runtimeCache.value;
  const terrain = generateWorldTerrain(config);
  const nations = generateWorldNations(config, terrain);
  runtimeCache = { key, value: createRuntime(config, key, terrain, nations) };
  return runtimeCache.value;
}

function yieldGenerationFrame() {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === "function") globalThis.requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export async function buildWorldGenerationAsync(options = {}, onProgress = () => {}) {
  const config = normalizeWorldGenerationOptions(options);
  const key = worldGenerationRuntimeKey(config);
  if (runtimeCache.key === key) {
    onProgress({ progress: 100, stage: "complete", label: "生成済みの世界を確認しました" });
    return runtimeCache.value;
  }

  onProgress({ progress: 8, stage: "seed", label: "世界シードを準備しています" });
  await yieldGenerationFrame();
  onProgress({ progress: 18, stage: "terrain", label: "地形テンプレートを配置しています" });
  await yieldGenerationFrame();
  const terrain = generateWorldTerrain(config);
  onProgress({ progress: 66, stage: "terrain", label: "海岸・水系・火山・遺跡を確定しました" });
  await yieldGenerationFrame();
  onProgress({ progress: 72, stage: "nations", label: "種族の適地に国家を築いています" });
  await yieldGenerationFrame();
  const nations = generateWorldNations(config, terrain);
  onProgress({ progress: 94, stage: "nations", label: "沿岸都市・海路・開始地点を確定しています" });
  await yieldGenerationFrame();
  runtimeCache = { key, value: createRuntime(config, key, terrain, nations) };
  onProgress({ progress: 100, stage: "complete", label: "新しい世界の生成が完了しました" });
  return runtimeCache.value;
}

export function clearWorldGenerationRuntimeCache() {
  runtimeCache = { key: null, value: null };
}
