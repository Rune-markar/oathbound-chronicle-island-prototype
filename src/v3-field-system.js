import { geographyDefinition, terrainTravelProfile } from "./terrain-geography.js";
import {
  advanceStateGameClock,
  createGameClock,
  getGameCalendar,
  normalizeStateGameClock,
} from "./game-clock.js";
import { fnv1aCharacters, unitFromHash } from "./determinism.js";
import { getRaceDefinition } from "./race-list.js";
import { createIndividualDecisionProfile, TEMPERAMENTS } from "./race-decision-system.js";
import {
  applyV3WorldEffectToTile,
  getV3CelestialEffects,
  getV3RaceWorldEffectAt,
} from "./v3-world-effects.js";

export const V3_FIELD_VERSION = 5;
export const V3_DETAIL_SCALE = 8;
export const V3_CHUNK_SIZE = 16;
export const V3_INITIAL_CHUNK_RADIUS = 1;
export const V3_LOCAL_PREGEN_RADIUS = 2;
export const V3_PLAYER_RACES = Object.freeze({
  human: Object.freeze({ id: "human", name: "人間", description: "制度と適応力の基準種" }),
  elf: Object.freeze({ id: "elf", name: "エルフ", description: "森雨と霧に強い自然魔法種" }),
  dwarf: Object.freeze({ id: "dwarf", name: "ドワーフ", description: "砂塵・降灰に強い地下適応種" }),
  orc: Object.freeze({ id: "orc", name: "オーク", description: "高い攻撃力を持つ戦士種" }),
});

export const V3_COMBAT_PRESENTATIONS = Object.freeze({
  personal: Object.freeze({
    scale: "personal-units",
    surface: "field-inline",
    usesPreparation: false,
    usesLogistics: false,
    usesDedicatedResult: false,
  }),
  group: Object.freeze({
    scale: "group-units",
    surface: "dedicated-tactical",
    usesPreparation: true,
    usesLogistics: true,
    usesDedicatedResult: true,
  }),
});

const DIRECTIONS = Object.freeze({
  north: Object.freeze({ dx: 0, dy: -1, label: "北" }),
  east: Object.freeze({ dx: 1, dy: 0, label: "東" }),
  south: Object.freeze({ dx: 0, dy: 1, label: "南" }),
  west: Object.freeze({ dx: -1, dy: 0, label: "西" }),
});

const TERRAIN_PRESENTATION = Object.freeze({
  grassland: Object.freeze({ type: "grass", name: "草原", symbol: "·", passable: true }),
  plains: Object.freeze({ type: "grass", name: "平原", symbol: "·", passable: true }),
  desert: Object.freeze({ type: "sand", name: "砂地", symbol: "·", passable: true }),
  tundra: Object.freeze({ type: "tundra", name: "寒原", symbol: "·", passable: true }),
  snow: Object.freeze({ type: "snow", name: "雪原", symbol: "·", passable: true }),
  coast: Object.freeze({ type: "sand", name: "海岸", symbol: "·", passable: true }),
});

const SITE_PRESENTATION = Object.freeze({
  volcano: Object.freeze({ type: "volcano", symbol: "火", passable: false, note: "火口周辺は高熱で進めない" }),
  crater: Object.freeze({ type: "crater", symbol: "◯", passable: true, note: "環状の窪地に古い落下物が残る" }),
  cave: Object.freeze({ type: "cave", symbol: "洞", passable: true, note: "地下へ続く入口がある" }),
  mine: Object.freeze({ type: "mine", symbol: "鉱", passable: true, note: "鉱脈と古い坑道が見える" }),
  ruins: Object.freeze({ type: "ruins", symbol: "跡", passable: true, note: "失われた時代の遺構が残る" }),
  floating_island: Object.freeze({ type: "floating-island", symbol: "浮", passable: true, note: "頭上に浮遊島の影が落ちている" }),
  sky_peak: Object.freeze({ type: "sky-peak", symbol: "天", passable: false, note: "雲を抜ける絶壁が行く手を塞ぐ" }),
});

const FOREST_VARIANTS = Object.freeze(["ancient_forest", "dark_forest", "rainforest", "conifer_forest", "broadleaf_forest"]);

const ITEM_TABLE = Object.freeze([
  Object.freeze({ id: "medicinal-herb", name: "薬草", symbol: "草", heal: 18, habitats: ["grassland", "plains", "forest", "marsh", "oasis"] }),
  Object.freeze({ id: "wild-berries", name: "木の実", symbol: "実", heal: 8, habitats: ["forest", "broadleaf_forest", "ancient_forest", "dark_forest"] }),
  Object.freeze({ id: "iron-shard", name: "鉄の欠片", symbol: "鉱", heal: 0, habitats: ["hills", "mountain_range", "mine", "cave", "volcano"] }),
  Object.freeze({ id: "old-coin", name: "古い銀貨", symbol: "貨", heal: 0, gold: 4, habitats: ["ruins", "road", "farmland"] }),
  Object.freeze({ id: "desert-salt", name: "砂漠塩", symbol: "塩", heal: 0, habitats: ["desert", "sand_desert", "rocky_desert"] }),
  Object.freeze({ id: "shore-shell", name: "虹貝", symbol: "貝", heal: 0, habitats: ["coast", "shoal", "tidal_flat", "bay"] }),
]);

const ENEMY_TABLE = Object.freeze([
  Object.freeze({ id: "green-slime", name: "苔スライム", symbol: "粘", raceId: "slime", baseHp: 10, power: 3, xp: 5, gold: 2, habitats: ["forest", "marsh", "river", "spring"] }),
  Object.freeze({ id: "goblin-scout", name: "ゴブリン斥候", symbol: "鬼", raceId: "goblin", baseHp: 16, power: 5, xp: 8, gold: 4, habitats: ["hills", "mountain_range", "cave", "mine", "ruins"] }),
  Object.freeze({ id: "wild-wolf", name: "灰野狼", symbol: "狼", raceId: "beastfolk", baseHp: 13, power: 4, xp: 7, gold: 3, habitats: ["grassland", "plains", "forest", "coldland", "snowfield"] }),
  Object.freeze({ id: "road-bandit", name: "街道の追剥", symbol: "賊", raceId: "human", baseHp: 20, power: 6, xp: 11, gold: 7, habitats: ["road", "farmland", "ruins", "grassland", "plains"] }),
  Object.freeze({ id: "sand-scorpion", name: "砂甲蠍", symbol: "蠍", raceId: "scarab", baseHp: 15, power: 5, xp: 9, gold: 3, habitats: ["desert", "sand_desert", "rocky_desert", "oasis"] }),
  Object.freeze({ id: "marsh-leech", name: "沼大蛭", symbol: "蛭", raceId: "slime", baseHp: 12, power: 4, xp: 7, gold: 2, habitats: ["marsh", "delta", "tidal_flat"] }),
  Object.freeze({ id: "reef-crab", name: "岩礁蟹", symbol: "蟹", raceId: "seafolk", baseHp: 18, power: 5, xp: 9, gold: 4, habitats: ["coast", "shoal", "tidal_flat", "bay"] }),
  Object.freeze({ id: "ember-lizard", name: "火鱗蜥蜴", symbol: "蜥", raceId: "lizardman", baseHp: 22, power: 7, xp: 13, gold: 6, habitats: ["volcano", "caldera", "crater"] }),
]);

export const V3_NEW_MOON_GHOST = Object.freeze({
  id: "new-moon-ghost",
  name: "新月の幽霊",
  symbol: "霊",
  raceId: "spirit",
  baseHp: 18,
  power: 6,
  xp: 12,
  gold: 0,
  manifestedBy: "new_moon",
});

function clampInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

export function v3HashUnit(seed, ...values) {
  return unitFromHash(fnv1aCharacters(`${seed}:${values.join(":")}`));
}

export function getV3CombatPresentation(combatScale) {
  return combatScale === "personal" || combatScale === "personal-units"
    ? V3_COMBAT_PRESENTATIONS.personal
    : V3_COMBAT_PRESENTATIONS.group;
}

function wrapped(value, size) {
  return ((value % size) + size) % size;
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function chunkKey(x, y) {
  return `${x}:${y}`;
}

function unique(values) {
  return [...new Set(values)];
}

function addLog(state, message) {
  return [message, ...(state.messageLog ?? [])].slice(0, 8);
}

function settlementRadius(level) {
  return level === "city" ? 3 : level === "town" ? 2 : 1;
}

function settlementSymbol(object) {
  return object.settlementLevel === "city" ? "都" : object.settlementLevel === "town" ? "町" : "村";
}

function detailedSettlement(object) {
  return {
    ...object,
    detailX: object.x * V3_DETAIL_SCALE + Math.floor(V3_DETAIL_SCALE / 2),
    detailY: object.y * V3_DETAIL_SCALE + Math.floor(V3_DETAIL_SCALE / 2),
  };
}

export function createV3WorldContext(runtime, seed = runtime?.terrain?.seed) {
  if (!runtime?.terrain || !Array.isArray(runtime.tiles) || !runtime.nations) {
    throw new TypeError("V3の詳細世界には生成済み概算世界が必要です。");
  }
  const width = runtime.terrain.width * V3_DETAIL_SCALE;
  const height = runtime.terrain.height * V3_DETAIL_SCALE;
  const settlements = (runtime.nations.objects ?? []).filter((object) => object.settlementLevel).map(detailedSettlement);
  const settlementByMacroIndex = new Map();
  for (const settlement of settlements) {
    const current = settlementByMacroIndex.get(settlement.tileIndex);
    if (!current || (settlement.importance ?? 0) > (current.importance ?? 0)) settlementByMacroIndex.set(settlement.tileIndex, settlement);
  }
  return {
    seed: String(seed ?? "v3-world"),
    runtime,
    detailScale: V3_DETAIL_SCALE,
    width,
    height,
    chunkColumns: Math.ceil(width / V3_CHUNK_SIZE),
    chunkRows: Math.ceil(height / V3_CHUNK_SIZE),
    roadTileIndices: new Set((runtime.nations.roads ?? []).flatMap((road) => road.tileIndices ?? [])),
    settlementByMacroIndex,
    settlements,
  };
}

function normalizedPosition(context, x, y) {
  return { x: wrapped(x, context.width), y };
}

function macroAt(context, x, y) {
  if (y < 0 || y >= context.height) return null;
  const normalizedX = wrapped(x, context.width);
  const macroX = Math.floor(normalizedX / V3_DETAIL_SCALE);
  const macroY = Math.floor(y / V3_DETAIL_SCALE);
  const index = macroY * context.runtime.terrain.width + macroX;
  return {
    tile: context.runtime.tiles[index],
    index,
    macroX,
    macroY,
    localX: normalizedX % V3_DETAIL_SCALE,
    localY: y % V3_DETAIL_SCALE,
    x: normalizedX,
    y,
  };
}

function wrappedDetailDistance(context, left, right) {
  const rawX = Math.abs(left.x - right.x);
  const dx = Math.min(rawX, context.width - rawX);
  return Math.hypot(dx, left.y - right.y);
}

export function nearestV3Settlement(context, x, y, maximumDistance = Number.POSITIVE_INFINITY) {
  let best = null;
  for (const settlement of context.settlements) {
    const distance = wrappedDetailDistance(context, { x: wrapped(x, context.width), y }, { x: settlement.detailX, y: settlement.detailY });
    if (distance > maximumDistance) continue;
    if (!best || distance < best.distance) best = { settlement, distance };
  }
  return best;
}

function macroNeighbor(context, macro, dx, dy) {
  const x = wrapped(macro.macroX + dx, context.runtime.terrain.width);
  const y = macro.macroY + dy;
  if (y < 0 || y >= context.runtime.terrain.height) return null;
  return context.runtime.tiles[y * context.runtime.terrain.width + x] ?? null;
}

function coastPresentation(context, macro) {
  const distances = [];
  if (macroNeighbor(context, macro, 0, -1)?.passable) distances.push(macro.localY);
  if (macroNeighbor(context, macro, 1, 0)?.passable) distances.push(V3_DETAIL_SCALE - 1 - macro.localX);
  if (macroNeighbor(context, macro, 0, 1)?.passable) distances.push(V3_DETAIL_SCALE - 1 - macro.localY);
  if (macroNeighbor(context, macro, -1, 0)?.passable) distances.push(macro.localX);
  const shoreDistance = Math.min(...distances, V3_DETAIL_SCALE);
  const tags = new Set(macro.tile.geographyTags ?? []);
  if (shoreDistance === 0) {
    if (tags.has("tidal_flat")) return { type: "tidal-flat", name: "干潟", symbol: "∵", passable: true, geographyId: "tidal_flat" };
    return { type: "beach", name: "海岸", symbol: "·", passable: true, geographyId: "coast" };
  }
  if (shoreDistance <= 1) return { type: "shoal", name: "浅瀬", symbol: "≈", passable: true, geographyId: "shoal" };
  return { type: "water", name: tags.has("bay") ? "湾" : "海", symbol: "≈", passable: false, geographyId: tags.has("bay") ? "bay" : "sea" };
}

function riverBand(context, macro) {
  if (!macro.tile.riverId) return false;
  const downstream = Number.isInteger(macro.tile.flowTo) && macro.tile.flowTo >= 0 ? context.runtime.tiles[macro.tile.flowTo] : null;
  if (!downstream) return [3, 4].includes(macro.localX);
  let dx = downstream.x - macro.tile.x;
  if (Math.abs(dx) > context.runtime.terrain.width / 2) dx -= Math.sign(dx) * context.runtime.terrain.width;
  const dy = downstream.y - macro.tile.y;
  return Math.abs(dx) > Math.abs(dy) ? [3, 4].includes(macro.localY) : [3, 4].includes(macro.localX);
}

function siteDetailPosition(context, macro, site) {
  return {
    x: 1 + Math.floor(v3HashUnit(context.seed, site.id, "site-x") * (V3_DETAIL_SCALE - 2)),
    y: 1 + Math.floor(v3HashUnit(context.seed, site.id, "site-y") * (V3_DETAIL_SCALE - 2)),
  };
}

function sitePresentation(context, macro) {
  const site = macro.tile.terrainSite;
  if (!site) return null;
  const center = siteDetailPosition(context, macro, site);
  const distance = Math.max(Math.abs(macro.localX - center.x), Math.abs(macro.localY - center.y));
  const definition = SITE_PRESENTATION[site.type];
  if (!definition) return null;
  if (site.type === "volcano" && distance <= 1) return { ...definition, name: distance === 0 ? `${site.name}の火口` : `${site.name}の火山麓`, geographyId: distance === 0 ? "crater" : "volcano" };
  if (distance !== 0) return null;
  return { ...definition, name: site.name, geographyId: site.type };
}

function geographyNameFor(tile, fallback) {
  const tags = new Set(tile.geographyTags ?? []);
  const preferred = [
    "oasis", "delta", "alluvial_fan", "canyon", "farmland", "canal", "marsh", "basin",
    "cape", "peninsula", "island", "bay", ...FOREST_VARIANTS, "mountain_range", "hills",
    "snowfield", "coldland", "sand_desert", "rocky_desert",
  ].find((id) => tags.has(id));
  return geographyDefinition(preferred)?.name ?? fallback;
}

export function getV3DetailedTile(context, requestedX, requestedY) {
  const macro = macroAt(context, requestedX, requestedY);
  if (!macro?.tile) {
    return { x: wrapped(requestedX, context.width), y: requestedY, type: "void", name: "世界の果て", symbol: "", passable: false, travelMinutes: 0, dangerBias: 0, terrainNote: "世界の外側", macroTile: null };
  }
  const { tile } = macro;
  const settlement = context.settlementByMacroIndex.get(macro.index) ?? null;
  const distanceFromCenter = Math.max(Math.abs(macro.localX - 4), Math.abs(macro.localY - 4));
  const roadBand = [3, 4].includes(macro.localX) || [3, 4].includes(macro.localY);
  const tags = new Set(tile.geographyTags ?? []);
  const terrainSitePresentation = sitePresentation(context, macro);
  const base = tile.terrain === "coast"
    ? coastPresentation(context, macro)
    : tile.terrain === "lake"
      ? { type: "water", name: "湖", symbol: "≈", passable: false, geographyId: "lake" }
      : TERRAIN_PRESENTATION[tile.terrain] ?? (tile.passable
        ? TERRAIN_PRESENTATION.grassland
        : { type: "water", name: tags.has("inland_sea") ? "内海" : "外海", symbol: "≈", passable: false, geographyId: tags.has("inland_sea") ? "inland_sea" : "open_sea" });
  let presentation = base;
  if (tile.passable && settlement && macro.localX === 4 && macro.localY === 4) {
    presentation = { type: `settlement-${settlement.settlementLevel}`, name: settlement.name, symbol: settlementSymbol(settlement), passable: true, geographyId: "road" };
  } else if (tile.passable && settlement && distanceFromCenter <= settlementRadius(settlement.settlementLevel)) {
    presentation = { type: "settlement-ground", name: `${settlement.name}の通り`, symbol: "·", passable: true, geographyId: "road" };
  } else if (tile.passable && context.roadTileIndices.has(macro.index) && roadBand) {
    presentation = { type: "road", name: "街道", symbol: "·", passable: true, geographyId: "road" };
  } else if (tile.passable && terrainSitePresentation) {
    presentation = terrainSitePresentation;
  } else if (tile.passable && tags.has("oasis") && Math.max(Math.abs(macro.localX - 4), Math.abs(macro.localY - 4)) <= 1) {
    presentation = macro.localX === 4 && macro.localY === 4
      ? { type: "spring", name: "オアシスの泉", symbol: "泉", passable: true, geographyId: "spring", note: "水と休息を得られる" }
      : { type: "oasis", name: "オアシス", symbol: "木", passable: true, geographyId: "oasis", note: "乾燥地の水場" };
  } else if (tile.passable && tile.riverId && riverBand(context, macro)) {
    const geographyId = tags.has("delta") ? "delta" : tags.has("alluvial_fan") ? "alluvial_fan" : tags.has("canyon") ? "canyon" : "river";
    presentation = { type: geographyId === "canyon" ? "canyon-river" : "river", name: geographyDefinition(geographyId)?.name ?? "川辺", symbol: "≈", passable: true, geographyId };
  } else if (tile.passable && tags.has("canal") && (v3HashUnit(context.seed, macro.index, "canal-axis") > 0.5 ? [2, 5].includes(macro.localX) : [2, 5].includes(macro.localY))) {
    presentation = { type: "canal", name: "運河", symbol: "≈", passable: true, geographyId: "canal", note: "人工水路沿いの耕地" };
  } else if (tile.passable && tags.has("marsh") && v3HashUnit(context.seed, "marsh", macro.x, macro.y) > 0.38) {
    presentation = { type: "marsh", name: "沼地", symbol: "∴", passable: true, geographyId: "marsh" };
  } else if (tile.passable && tags.has("farmland") && (macro.localX + macro.localY) % 3 !== 0) {
    presentation = { type: "farmland", name: "田畑", symbol: "田", passable: true, geographyId: "farmland" };
  } else if (tile.passable && tile.relief === "mountains" && v3HashUnit(context.seed, "mountain", macro.x, macro.y) > 0.54) {
    presentation = { type: "mountain", name: tags.has("sky_peak") ? "天空峰" : "険しい山", symbol: "▲", passable: false, geographyId: tags.has("sky_peak") ? "sky_peak" : "mountain_range" };
  } else if (tile.passable && (tags.has("forest") || (["grassland", "plains"].includes(tile.terrain) && v3HashUnit(context.seed, "tree", macro.x, macro.y) > 0.84))) {
    const forestId = FOREST_VARIANTS.find((id) => tags.has(id)) ?? "forest";
    presentation = { type: "forest", name: geographyDefinition(forestId)?.name ?? "森", symbol: "♠", passable: true, geographyId: forestId };
  } else if (tile.passable && tile.relief === "hills" && v3HashUnit(context.seed, "hill", macro.x, macro.y) > 0.73) {
    presentation = { type: "hill", name: tags.has("basin") ? "盆地の丘縁" : "岩丘", symbol: "⌃", passable: true, geographyId: "hills" };
  }
  if (presentation === base && tile.passable) presentation = { ...base, name: geographyNameFor(tile, base.name) };
  const nation = context.runtime.nationById.get(tile.nationId) ?? null;
  const region = context.runtime.regionById.get(tile.regionId) ?? null;
  const geographyTags = [...new Set([
    ...(tile.geographyTags ?? []),
    ...(presentation.geographyId ? [presentation.geographyId] : []),
  ])];
  const travel = terrainTravelProfile({ ...tile, geographyTags });
  return {
    x: macro.x,
    y: macro.y,
    ...presentation,
    macroIndex: macro.index,
    macroX: macro.macroX,
    macroY: macro.macroY,
    localX: macro.localX,
    localY: macro.localY,
    macroTile: tile,
    nation,
    region,
    settlement,
    geographyTags,
    terrainSite: tile.terrainSite ?? null,
    travelMinutes: presentation.passable ? travel.minutes : 0,
    dangerBias: travel.dangerBias,
    terrainNote: presentation.note ?? travel.note,
    onRoad: presentation.type === "road" || presentation.type === "settlement-ground",
  };
}

export function getV3TileEntity(context, x, y, state = {}) {
  const tile = applyV3WorldEffectToTile(context, state, getV3DetailedTile(context, x, y));
  if (!tile.passable || tile.type.startsWith("settlement-")) return null;
  const key = tileKey(tile.x, tile.y);
  if ((state.defeatedTiles ?? []).includes(key) || (state.collectedTiles ?? []).includes(key) || (state.interactedTiles ?? []).includes(key)) return null;
  const newMoonActive = getV3CelestialEffects(context, state).active.some((effect) => effect.id === "new_moon");
  if (newMoonActive && v3HashUnit(context.seed, "new-moon-ghost", tile.x, tile.y) < 0.12) {
    const spawn = state.player && Number.isInteger(state.player.spawnX) && Number.isInteger(state.player.spawnY)
      ? { x: state.player.spawnX, y: state.player.spawnY }
      : { x: tile.x, y: tile.y };
    const distanceFromArrival = wrappedDetailDistance(context, { x: tile.x, y: tile.y }, spawn);
    const level = Math.min(5, 1 + Math.floor(distanceFromArrival / 160));
    return {
      type: "enemy",
      ...V3_NEW_MOON_GHOST,
      level,
      hp: V3_NEW_MOON_GHOST.baseHp + level * 2,
      maxHp: V3_NEW_MOON_GHOST.baseHp + level * 2,
      manifested: true,
    };
  }
  const nearby = nearestV3Settlement(context, tile.x, tile.y, 7);
  const roll = v3HashUnit(context.seed, "entity", tile.x, tile.y);
  if (nearby && roll < 0.16) {
    const roleRoll = v3HashUnit(context.seed, "npc-role", tile.x, tile.y);
    const gameplay = nearby.settlement.gameplay ?? {};
    const merchantThreshold = Math.min(0.58, Math.max(0.08,
      0.12 + (tile.onRoad ? 0.18 : 0) + (Number(gameplay.merchantBias) || 0)));
    const villagerThreshold = Math.min(0.84, Math.max(merchantThreshold + 0.12,
      0.68 - (Number(gameplay.adventurerBias) || 0)));
    const role = roleRoll < merchantThreshold ? "merchant" : roleRoll < villagerThreshold ? "villager" : "adventurer";
    const functionName = nearby.settlement.primaryFunction?.name ?? "集落";
    const merchantPrice = Math.min(8, Math.max(3, 5 + (Number(gameplay.merchantPriceModifier) || 0)));
    const definitions = {
      merchant: { name: "旅商人", symbol: "商", message: `${nearby.settlement.name}の${functionName}へ品を運ぶ途中らしい。`, price: merchantPrice },
      villager: { name: `${nearby.settlement.name}の住民`, symbol: "人", message: `${functionName}の仕事と近くの道について教えてくれた。` },
      adventurer: { name: "巡回中の冒険者", symbol: "冒", message: `${nearby.settlement.name}の${functionName}周辺を警戒している。` },
    };
    return enrichV3NpcEntity(context, tile, {
      type: "npc",
      role,
      ...definitions[role],
      settlementId: nearby.settlement.id,
      settlementFunctionName: functionName,
    });
  }
  if (tile.onRoad && roll < 0.025) return enrichV3NpcEntity(context, tile, {
    type: "npc",
    role: "merchant",
    name: "街道商人",
    symbol: "商",
    message: "遠国へ向かう行商人だ。",
    price: 5,
  });
  const habitats = new Set([tile.type, ...(tile.geographyTags ?? [])]);
  const matchingEnemies = ENEMY_TABLE.filter((entry) => entry.habitats.some((id) => habitats.has(id)));
  const dangerBias = tile.dangerBias ?? (tile.type === "forest" || tile.type === "mountain" ? 0.035 : 0);
  if (roll < 0.095 + dangerBias) {
    const enemyPool = matchingEnemies.length ? matchingEnemies : ENEMY_TABLE;
    const definition = enemyPool[Math.floor(v3HashUnit(context.seed, "enemy", tile.x, tile.y) * enemyPool.length)];
    const spawn = state.player && Number.isInteger(state.player.spawnX) && Number.isInteger(state.player.spawnY)
      ? { x: state.player.spawnX, y: state.player.spawnY }
      : { x: tile.x, y: tile.y };
    const distanceFromArrival = wrappedDetailDistance(context, { x: tile.x, y: tile.y }, spawn);
    const level = Math.min(5, 1 + Math.floor(distanceFromArrival / 160));
    return { type: "enemy", ...definition, level, hp: definition.baseHp + level * 2, maxHp: definition.baseHp + level * 2 };
  }
  if (roll < 0.16) {
    const matchingItems = ITEM_TABLE.filter((entry) => entry.habitats.some((id) => habitats.has(id)));
    const itemPool = matchingItems.length ? matchingItems : ITEM_TABLE;
    const item = itemPool[Math.floor(v3HashUnit(context.seed, "item", tile.x, tile.y) * itemPool.length)];
    return { type: "item", ...item };
  }
  return null;
}

function enrichV3NpcEntity(context, tile, entity) {
  if (entity?.type !== "npc") return entity;
  const subjectId = String(entity.id ?? `field-npc:${tile.x},${tile.y}`);
  const raceId = String(entity.raceId ?? tile.nation?.peopleId ?? "human");
  const raceState = context.raceDynamics?.races?.[raceId];
  if (!raceState) return { ...entity, id: subjectId, raceId };
  const roleId = entity.role === "merchant" ? "diplomat" : entity.role === "adventurer" ? "local_leader" : "citizen";
  const classGroupId = entity.role === "merchant"
    ? "class:merchant"
    : entity.role === "adventurer" ? "class:warrior" : "class:commoner";
  const populationGroupIds = [tile.region?.id ? `region:${tile.region.id}` : null, classGroupId].filter(Boolean);
  const profile = createIndividualDecisionProfile(raceState, context.seed, {
    subjectId,
    roleId,
    temperamentId: entity.temperamentId,
    individualOffsets: entity.individualDecisionOffsets,
    populationGroupIds,
  });
  return {
    ...entity,
    id: subjectId,
    raceId,
    temperamentId: profile.temperamentId,
    temperamentName: TEMPERAMENTS[profile.temperamentId].name,
    decisionTraits: profile.traits,
    individualDecisionOffsets: profile.individualOffsets,
    populationGroupIds,
  };
}

export function v3ChunkPosition(context, x, y) {
  return {
    x: wrapped(Math.floor(wrapped(x, context.width) / V3_CHUNK_SIZE), context.chunkColumns),
    y: Math.min(context.chunkRows - 1, Math.max(0, Math.floor(y / V3_CHUNK_SIZE))),
  };
}

function chunkKeysAround(context, x, y, radius) {
  const origin = v3ChunkPosition(context, x, y);
  const keys = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    const chunkY = origin.y + dy;
    if (chunkY < 0 || chunkY >= context.chunkRows) continue;
    for (let dx = -radius; dx <= radius; dx += 1) keys.push(chunkKey(wrapped(origin.x + dx, context.chunkColumns), chunkY));
  }
  return keys;
}

function discoverAround(context, x, y, existing = []) {
  const discovered = new Set(existing);
  for (let dy = -2; dy <= 2; dy += 1) {
    const nextY = y + dy;
    if (nextY < 0 || nextY >= context.height) continue;
    for (let dx = -2; dx <= 2; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > 3) continue;
      discovered.add(tileKey(wrapped(x + dx, context.width), nextY));
    }
  }
  return [...discovered].slice(-6000);
}

function findSpawn(context) {
  const preferred = context.settlements.find((entry) => entry.nationId === "nation-1") ?? context.settlements[0];
  const origin = preferred ? { x: preferred.detailX, y: preferred.detailY } : { x: Math.floor(context.width / 2), y: Math.floor(context.height / 2) };
  for (let radius = 0; radius < 12; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const tile = getV3DetailedTile(context, origin.x + dx, origin.y + dy);
        if (tile.passable && !tile.type.startsWith("settlement-")) return { x: tile.x, y: tile.y, settlementId: preferred?.id ?? null };
      }
    }
  }
  return { x: wrapped(origin.x, context.width), y: Math.min(context.height - 1, Math.max(0, origin.y)), settlementId: preferred?.id ?? null };
}

export function createV3FieldState(context, options = {}) {
  const spawn = findSpawn(context);
  const playerName = String(options.playerName ?? "アレク").trim().slice(0, 24) || "アレク";
  const raceId = getRaceDefinition(options.playerRaceId ?? options.raceId)?.id ?? "human";
  return normalizeStateGameClock({
    version: V3_FIELD_VERSION,
    seed: context.seed,
    player: { name: playerName, raceId, x: spawn.x, y: spawn.y, spawnX: spawn.x, spawnY: spawn.y, hp: 34, maxHp: 34, level: 1, xp: 0, gold: 12, inventory: [] },
    steps: 0,
    clockMinutes: 8 * 60,
    generatedChunks: chunkKeysAround(context, spawn.x, spawn.y, V3_INITIAL_CHUNK_RADIUS),
    backgroundCursor: 0,
    discoveredTiles: discoverAround(context, spawn.x, spawn.y),
    collectedTiles: [],
    defeatedTiles: [],
    interactedTiles: [],
    pendingEncounter: null,
    messageLog: ["女神の光が消えた。ここからは一歩ずつ、自分の足で進む。"],
    clock: createGameClock(),
  });
}

export function normalizeV3FieldState(context, source = {}) {
  if (source.seed !== context.seed || !source.player) return createV3FieldState(context, source);
  const fallback = createV3FieldState(context, source);
  const x = wrapped(clampInteger(source.player.x, fallback.player.x, -context.width * 4, context.width * 4), context.width);
  const y = clampInteger(source.player.y, fallback.player.y, 0, context.height - 1);
  const current = getV3DetailedTile(context, x, y);
  const player = {
    ...fallback.player,
    ...source.player,
    name: String(source.player.name ?? fallback.player.name).slice(0, 24),
    raceId: getRaceDefinition(source.player.raceId)?.id ?? fallback.player.raceId,
    x: current.passable ? x : fallback.player.x,
    y: current.passable ? y : fallback.player.y,
    hp: clampInteger(source.player.hp, fallback.player.hp, 0, 999),
    maxHp: clampInteger(source.player.maxHp, fallback.player.maxHp, 1, 999),
    level: clampInteger(source.player.level, 1, 1, 99),
    xp: clampInteger(source.player.xp, 0, 0, 999999),
    gold: clampInteger(source.player.gold, 0, 0, 999999),
    inventory: Array.isArray(source.player.inventory) ? source.player.inventory.filter((item) => item?.id && item?.name).slice(0, 64) : [],
  };
  let pendingEncounter = source.pendingEncounter && typeof source.pendingEncounter === "object"
    ? {
      ...source.pendingEncounter,
      ...(source.pendingEncounter.type === "enemy" ? {
        combatScale: "personal-units",
        fleeAttempts: clampInteger(source.pendingEncounter.fleeAttempts, 0, 0, 9999),
        worldX: wrapped(clampInteger(source.pendingEncounter.worldX, player.x, -context.width * 4, context.width * 4), context.width),
        worldY: clampInteger(source.pendingEncounter.worldY, player.y, 0, context.height - 1),
      } : {}),
    }
    : null;
  if (pendingEncounter?.type === "npc" && !pendingEncounter.decisionTraits) {
    const [encounterX, encounterY] = String(pendingEncounter.tileKey ?? `${player.x},${player.y}`).split(",").map(Number);
    const tile = getV3DetailedTile(
      context,
      Number.isFinite(encounterX) ? encounterX : player.x,
      Number.isFinite(encounterY) ? encounterY : player.y,
    );
    pendingEncounter = enrichV3NpcEntity(context, tile, pendingEncounter);
  }
  return normalizeStateGameClock({
    ...fallback,
    ...source,
    player,
    steps: clampInteger(source.steps, 0, 0, 9999999),
    version: V3_FIELD_VERSION,
    clock: source.clock,
    clockMinutes: clampInteger(source.clockMinutes, 8 * 60, 0, 999 * 24 * 60),
    generatedChunks: unique([...(source.generatedChunks ?? []), ...chunkKeysAround(context, player.x, player.y, V3_INITIAL_CHUNK_RADIUS)]).slice(-12000),
    backgroundCursor: clampInteger(source.backgroundCursor, 0, 0, context.chunkColumns * context.chunkRows),
    discoveredTiles: Array.isArray(source.discoveredTiles) ? unique(source.discoveredTiles).slice(-6000) : fallback.discoveredTiles,
    collectedTiles: Array.isArray(source.collectedTiles) ? unique(source.collectedTiles).slice(-4000) : [],
    defeatedTiles: Array.isArray(source.defeatedTiles) ? unique(source.defeatedTiles).slice(-4000) : [],
    interactedTiles: Array.isArray(source.interactedTiles) ? unique(source.interactedTiles).slice(-4000) : [],
    pendingEncounter,
    messageLog: Array.isArray(source.messageLog) ? source.messageLog.map(String).slice(0, 8) : fallback.messageLog,
  });
}

export function isV3ChunkGenerated(context, state, x, y) {
  const chunk = v3ChunkPosition(context, x, y);
  return state.generatedChunks.includes(chunkKey(chunk.x, chunk.y));
}

export function advanceV3BackgroundGeneration(context, state) {
  const generated = new Set(state.generatedChunks);
  const localCandidate = chunkKeysAround(context, state.player.x, state.player.y, V3_LOCAL_PREGEN_RADIUS).find((key) => !generated.has(key));
  if (localCandidate) {
    generated.add(localCandidate);
    return { ...state, generatedChunks: [...generated].slice(-12000) };
  }
  const total = context.chunkColumns * context.chunkRows;
  let cursor = state.backgroundCursor % total;
  for (let attempt = 0; attempt < total; attempt += 1) {
    const key = chunkKey(cursor % context.chunkColumns, Math.floor(cursor / context.chunkColumns));
    cursor = (cursor + 1) % total;
    if (generated.has(key)) continue;
    generated.add(key);
    return { ...state, backgroundCursor: cursor, generatedChunks: [...generated].slice(-12000) };
  }
  return { ...state, backgroundCursor: cursor };
}

export function moveV3Player(context, state, directionName) {
  const direction = DIRECTIONS[directionName];
  if (!direction) throw new RangeError("不明な移動方向です。");
  if (state.pendingEncounter) return { ...state, messageLog: addLog(state, "目の前の相手に対処する必要がある。") };
  const position = normalizedPosition(context, state.player.x + direction.dx, state.player.y + direction.dy);
  const destination = applyV3WorldEffectToTile(context, state, getV3DetailedTile(context, position.x, position.y));
  if (!destination.passable) return { ...state, messageLog: addLog(state, `${destination.name}には進めない。`) };
  const generatedChunks = unique([...state.generatedChunks, ...chunkKeysAround(context, destination.x, destination.y, V3_INITIAL_CHUNK_RADIUS)]).slice(-12000);
  const moved = advanceStateGameClock({
    ...state,
    player: { ...state.player, x: destination.x, y: destination.y },
    steps: state.steps + 1,
    generatedChunks,
    discoveredTiles: discoverAround(context, destination.x, destination.y, state.discoveredTiles),
    messageLog: addLog(state, `${direction.label}へ${destination.travelMinutes}分進んだ。${destination.name}。${destination.worldEffect ? `${destination.worldEffect.name}の影響を受けている。${destination.worldEffect.raceResponse.responses.length ? `${destination.worldEffect.raceResponse.summary}。` : ""}` : ""}`),
  }, destination.travelMinutes).state;
  const entity = getV3TileEntity(context, destination.x, destination.y, moved);
  if (!entity) return moved;
  const key = tileKey(destination.x, destination.y);
  if (entity.type === "item") {
    const inventory = entity.gold ? moved.player.inventory : [...moved.player.inventory, { id: entity.id, name: entity.name, heal: entity.heal ?? 0 }];
    return {
      ...moved,
      player: { ...moved.player, inventory, gold: moved.player.gold + (entity.gold ?? 0) },
      collectedTiles: [...moved.collectedTiles, key].slice(-4000),
      messageLog: addLog(moved, `${entity.name}を拾った。`),
    };
  }
  if (entity.type === "enemy") {
    return {
      ...moved,
      player: { ...state.player },
      pendingEncounter: {
        ...entity,
        combatScale: "personal-units",
        fleeAttempts: 0,
        worldX: destination.x,
        worldY: destination.y,
        tileKey: key,
      },
      messageLog: addLog(state, `${direction.label}の${destination.name}に${entity.name}を発見した。足元の地形で個人戦に入る！`),
    };
  }
  return {
    ...moved,
    pendingEncounter: { ...entity, tileKey: key },
    messageLog: addLog(moved, `${entity.name}に出会った。`),
  };
}

function levelledPlayer(player) {
  let level = player.level;
  let maxHp = player.maxHp;
  while (player.xp >= level * 20 && level < 99) {
    level += 1;
    maxHp += 5;
  }
  return level === player.level ? player : { ...player, level, maxHp, hp: Math.min(maxHp, player.hp + 5) };
}

export function resolveV3Encounter(context, state, action) {
  const encounter = state.pendingEncounter;
  if (!encounter) return state;
  if (encounter.type === "npc") {
    if (action === "buy") {
      const price = encounter.price ?? 5;
      if (state.player.gold < price) return { ...state, messageLog: addLog(state, "銀貨が足りない。") };
      return {
        ...state,
        player: { ...state.player, gold: state.player.gold - price, inventory: [...state.player.inventory, { id: "medicinal-herb", name: "薬草", heal: 18 }] },
        messageLog: addLog(state, `薬草を銀貨${price}枚で買った。`),
      };
    }
    if (action !== "talk" && action !== "leave") return state;
    return {
      ...state,
      pendingEncounter: null,
      interactedTiles: [...state.interactedTiles, encounter.tileKey].slice(-4000),
      messageLog: addLog(state, action === "talk" ? encounter.message : `${encounter.name}と別れた。`),
    };
  }
  const encounterX = Number.isInteger(encounter.worldX) ? encounter.worldX : state.player.x;
  const encounterY = Number.isInteger(encounter.worldY) ? encounter.worldY : state.player.y;
  const playerWorldResponse = getV3RaceWorldEffectAt(context, state, state.player.raceId ?? "human", encounterX, encounterY);
  const enemyWorldResponse = getV3RaceWorldEffectAt(context, state, encounter.raceId ?? "human", encounterX, encounterY);
  const responseNote = [...playerWorldResponse.responses, ...enemyWorldResponse.responses]
    .map((response) => response.label)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .join("・");
  if (action === "flee") {
    const fleeAttempts = clampInteger(encounter.fleeAttempts, 0, 0, 9999) + 1;
    const escaped = v3HashUnit(context.seed, "flee", fleeAttempts, state.steps, state.player.x, state.player.y) > 0.28;
    if (escaped) return { ...state, pendingEncounter: null, messageLog: addLog(state, `${encounter.name}から逃げ切った。`) };
    const damage = Math.max(1, Math.round((encounter.power + encounter.level - 2)
      * enemyWorldResponse.modifiers.attack / playerWorldResponse.modifiers.defense));
    return {
      ...state,
      player: { ...state.player, hp: Math.max(1, state.player.hp - damage) },
      pendingEncounter: { ...encounter, fleeAttempts },
      messageLog: addLog(state, `逃げ切れず、${damage}の傷を負った。`),
    };
  }
  if (action !== "fight") return state;
  const basePlayerDamage = 6 + state.player.level * 2 + Math.floor(v3HashUnit(context.seed, "attack", state.steps, encounter.hp) * 5);
  const playerDamage = Math.max(1, Math.round(basePlayerDamage
    * playerWorldResponse.modifiers.attack / enemyWorldResponse.modifiers.defense));
  const enemyHp = encounter.hp - playerDamage;
  if (enemyHp <= 0) {
    const player = levelledPlayer({ ...state.player, xp: state.player.xp + encounter.xp, gold: state.player.gold + encounter.gold });
    return {
      ...state,
      player,
      pendingEncounter: null,
      defeatedTiles: [...state.defeatedTiles, encounter.tileKey].slice(-4000),
      messageLog: addLog(state, `${encounter.name}を倒した。経験${encounter.xp}、銀貨${encounter.gold}枚を得た。`),
    };
  }
  const enemyDamage = Math.max(1, Math.round((encounter.power + encounter.level - Math.floor(state.player.level / 2))
    * enemyWorldResponse.modifiers.attack / playerWorldResponse.modifiers.defense));
  if (state.player.hp - enemyDamage <= 0) {
    const player = { ...state.player, x: state.player.spawnX, y: state.player.spawnY, hp: state.player.maxHp, gold: Math.floor(state.player.gold / 2) };
    return {
      ...state,
      player,
      pendingEncounter: null,
      discoveredTiles: discoverAround(context, player.x, player.y, state.discoveredTiles),
      messageLog: addLog(state, "力尽きた。近くの集落で目を覚まし、所持金の半分を失った。"),
    };
  }
  return {
    ...state,
    player: { ...state.player, hp: state.player.hp - enemyDamage },
    pendingEncounter: { ...encounter, hp: enemyHp },
    messageLog: addLog(state, `${encounter.name}へ${playerDamage}の傷。反撃で${enemyDamage}の傷を負った。${responseNote ? ` ${responseNote}が作用した。` : ""}`),
  };
}

export function useV3Item(state, inventoryIndex) {
  const index = clampInteger(inventoryIndex, -1, -1, state.player.inventory.length - 1);
  const item = state.player.inventory[index];
  if (!item || !item.heal || state.player.hp >= state.player.maxHp) return state;
  const inventory = state.player.inventory.filter((_, itemIndex) => itemIndex !== index);
  const healed = Math.min(item.heal, state.player.maxHp - state.player.hp);
  return {
    ...state,
    player: { ...state.player, hp: state.player.hp + healed, inventory },
    messageLog: addLog(state, `${item.name}を使い、HPが${healed}回復した。`),
  };
}

export function getV3FieldView(context, state, radiusX = 6, radiusY = 5) {
  const discovered = new Set(state.discoveredTiles);
  const tiles = [];
  for (let dy = -radiusY; dy <= radiusY; dy += 1) {
    for (let dx = -radiusX; dx <= radiusX; dx += 1) {
      const x = wrapped(state.player.x + dx, context.width);
      const y = state.player.y + dy;
      const generated = y >= 0 && y < context.height && isV3ChunkGenerated(context, state, x, y);
      const tile = generated
        ? applyV3WorldEffectToTile(context, state, getV3DetailedTile(context, x, y))
        : { x, y, type: "ungenerated", name: "生成中", symbol: "", passable: false, worldEffect: null };
      const visible = discovered.has(tileKey(x, y));
      const entity = visible && generated ? getV3TileEntity(context, x, y, state) : null;
      tiles.push({ ...tile, dx, dy, generated, visible, entity, player: dx === 0 && dy === 0 });
    }
  }
  return { radiusX, radiusY, columns: radiusX * 2 + 1, rows: radiusY * 2 + 1, tiles };
}

export function getV3LocationSummary(context, state) {
  const tile = applyV3WorldEffectToTile(context, state, getV3DetailedTile(context, state.player.x, state.player.y));
  const nearby = nearestV3Settlement(context, tile.x, tile.y, 32);
  const calendar = getGameCalendar(normalizeStateGameClock(state).clock);
  return {
    tile,
    nation: tile.nation,
    region: tile.region,
    nationName: tile.nation?.name ?? "無主地",
    regionName: tile.region?.name ?? "未踏地方",
    nearestSettlement: nearby,
    nearestSettlementFunction: nearby?.settlement?.primaryFunction ?? null,
    year: calendar.year,
    month: calendar.month,
    day: calendar.day,
    time: `${String(calendar.hour).padStart(2, "0")}:${String(calendar.minute).padStart(2, "0")}`,
  };
}

export function v3DirectionNames() {
  return Object.keys(DIRECTIONS);
}
