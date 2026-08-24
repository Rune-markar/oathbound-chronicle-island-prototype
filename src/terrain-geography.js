import {
  squareGridDistance,
  squareNeighborIndices,
  squareTileIndex,
} from "./square-grid.js";
import { fnv1aCharacters, unitFromHash } from "./determinism.js";

const LAND_TERRAINS = new Set(["grassland", "plains", "desert", "tundra", "snow"]);
const SEA_TERRAINS = new Set(["ocean", "coast"]);

function defineGeography(id, name, kind, description) {
  return Object.freeze({ id, name, kind, description });
}

// This catalog is deliberately broader than the base biome field. A tile may be
// desert + oasis, mountain range + cave, or coast + bay at the same time.
export const TERRAIN_GEOGRAPHY_DEFINITIONS = Object.freeze({
  grassland: defineGeography("grassland", "草原", "biome", "見通しのよい草地"),
  plains: defineGeography("plains", "平原", "biome", "起伏の少ない開けた土地"),
  forest: defineGeography("forest", "森", "vegetation", "樹木が移動と視界を遮る土地"),
  conifer_forest: defineGeography("conifer_forest", "針葉樹の森", "vegetation", "寒冷な針葉樹林"),
  broadleaf_forest: defineGeography("broadleaf_forest", "広葉樹の森", "vegetation", "下草の多い広葉樹林"),
  ancient_forest: defineGeography("ancient_forest", "古森", "vegetation", "古木が密生する深い森"),
  dark_forest: defineGeography("dark_forest", "暗い深森", "vegetation", "日差しの届きにくい森"),
  rainforest: defineGeography("rainforest", "密林", "vegetation", "高温多雨の密生林"),
  desert: defineGeography("desert", "砂漠", "biome", "乾燥し昼夜差の大きい土地"),
  sand_desert: defineGeography("sand_desert", "砂丘砂漠", "biome", "砂丘が連なる乾燥地"),
  rocky_desert: defineGeography("rocky_desert", "岩石砂漠", "biome", "礫と岩盤が露出する乾燥地"),
  oasis: defineGeography("oasis", "オアシス", "hydrology", "乾燥地に現れた水場"),
  sea: defineGeography("sea", "海", "water", "海運と漁業を支える水域"),
  open_sea: defineGeography("open_sea", "外海", "water", "風浪の強い外洋"),
  inland_sea: defineGeography("inland_sea", "内海", "water", "陸に囲まれた比較的穏やかな海"),
  coast: defineGeography("coast", "海岸", "coast", "陸と海が接する沿岸"),
  shoal: defineGeography("shoal", "浅瀬", "coast", "浅く船の航行を妨げる沿岸水域"),
  tidal_flat: defineGeography("tidal_flat", "干潟", "coast", "潮の満ち引きで露出する低平な海岸"),
  river: defineGeography("river", "河川", "hydrology", "農業と輸送を支える流水"),
  canal: defineGeography("canal", "運河", "infrastructure", "耕地と集落を結ぶ人工水路"),
  lake: defineGeography("lake", "湖", "water", "内陸にたまった水域"),
  spring: defineGeography("spring", "泉", "hydrology", "河川の源となる湧水地"),
  marsh: defineGeography("marsh", "沼地", "hydrology", "足場が悪く薬草の育つ湿地"),
  island: defineGeography("island", "島", "coast", "海に囲まれた独立陸地"),
  coldland: defineGeography("coldland", "寒冷地", "biome", "低温への備えを要する土地"),
  snowfield: defineGeography("snowfield", "雪原", "biome", "雪氷に覆われた平地"),
  canyon: defineGeography("canyon", "峡谷", "relief", "河川が刻んだ険しい谷"),
  hills: defineGeography("hills", "丘陵", "relief", "緩やかな高低差が続く土地"),
  mountain_range: defineGeography("mountain_range", "山脈", "relief", "移動と国境を隔てる連続高地"),
  crater: defineGeography("crater", "クレーター", "geology", "環状に陥没した地形"),
  volcano: defineGeography("volcano", "火山", "geology", "熱と鉱物をもたらす火山地帯"),
  caldera: defineGeography("caldera", "カルデラ", "geology", "火山活動で生じた大規模な陥没地"),
  cave: defineGeography("cave", "洞窟", "site", "地下へ続く自然洞"),
  mine: defineGeography("mine", "鉱山", "site", "鉱石を採掘できる露頭と坑道"),
  ruins: defineGeography("ruins", "遺跡", "site", "過去の文明が残した建造物"),
  farmland: defineGeography("farmland", "田畑", "land_use", "集落が開墾した耕作地"),
  basin: defineGeography("basin", "盆地", "relief", "周囲より低い内陸平地"),
  peninsula: defineGeography("peninsula", "半島", "coast", "細い陸部で本土とつながる土地"),
  bay: defineGeography("bay", "湾", "coast", "陸側へ入り込んだ海"),
  cape: defineGeography("cape", "岬", "coast", "海へ突き出した陸の先端"),
  alluvial_fan: defineGeography("alluvial_fan", "扇状地", "hydrology", "山地から出た川が土砂を広げた土地"),
  delta: defineGeography("delta", "三角州", "hydrology", "河口に土砂が堆積した低地"),
  floating_island: defineGeography("floating_island", "浮遊島", "fantasy", "空中に留まる孤島"),
  sky_peak: defineGeography("sky_peak", "天空峰", "fantasy", "雲海を抜けて孤立する高峰"),
  outer_space: defineGeography("outer_space", "宇宙空間", "astronomy", "恒星・衛星と外宇宙を持つ天体層"),
});

const PRIMARY_PRIORITY = Object.freeze([
  "floating_island", "sky_peak", "caldera", "volcano", "crater", "cave", "mine", "ruins",
  "oasis", "delta", "alluvial_fan", "canyon", "bay", "cape", "peninsula", "island", "basin",
  "tidal_flat", "shoal", "spring", "lake", "river", "marsh", "ancient_forest", "dark_forest",
  "rainforest", "conifer_forest", "broadleaf_forest", "mountain_range", "hills", "snowfield",
  "coldland", "sand_desert", "rocky_desert", "desert", "grassland", "plains", "inland_sea",
  "open_sea", "sea", "coast",
]);

function hashUnit(seed, ...values) {
  return unitFromHash(fnv1aCharacters(`${seed}:${values.join(":")}`));
}

function isLand(tile) {
  return Boolean(tile) && LAND_TERRAINS.has(tile.terrain);
}

function isSea(tile) {
  return Boolean(tile) && SEA_TERRAINS.has(tile.terrain);
}

function tileAt(tiles, config, x, y) {
  let nextX = x;
  if (config.wrapX) nextX = (nextX + config.width) % config.width;
  if (nextX < 0 || nextX >= config.width || y < 0 || y >= config.height) return null;
  return tiles[squareTileIndex(nextX, y, config.width)] ?? null;
}

function tilesAround(tiles, config, tile, radius) {
  const values = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const candidate = tileAt(tiles, config, tile.x + dx, tile.y + dy);
      if (candidate) values.push(candidate);
    }
  }
  return values;
}

function addTag(tagSets, index, id) {
  if (TERRAIN_GEOGRAPHY_DEFINITIONS[id]) tagSets[index].add(id);
}

function choosePrimary(tags) {
  return PRIMARY_PRIORITY.find((id) => tags.has(id)) ?? [...tags][0] ?? null;
}

function forestVariant(tile, seed) {
  if (tile.feature === "rainforest") return "rainforest";
  if (tile.temperatureC < 8) return "conifer_forest";
  const roll = hashUnit(seed, tile.index, "forest-variant");
  if (roll > 0.86) return "ancient_forest";
  if (roll > 0.68) return "dark_forest";
  return "broadleaf_forest";
}

function siteName(type, tile, seed) {
  const variants = {
    volcano: ["火山", "噴煙山", "火焔峰"],
    crater: ["星落ちのクレーター", "環状陥没地", "天墜孔"],
    cave: ["深層洞窟", "地底泉の洞", "竜骨洞"],
    mine: ["鉱山", "炭鉱", "魔晶鉱床"],
    ruins: ["風化都市遺跡", "古神殿跡", "巨石遺跡"],
    floating_island: ["浮遊島", "風晶の浮島", "天使の孤島"],
    sky_peak: ["天空峰", "雲上の絶壁", "竜王の高峰"],
  };
  const choices = variants[type] ?? [TERRAIN_GEOGRAPHY_DEFINITIONS[type]?.name ?? type];
  return choices[Math.floor(hashUnit(seed, tile.index, type, "name") * choices.length) % choices.length];
}

function selectSpacedTiles(candidates, count, config, score, occupied, minimumDistance = 3) {
  const selected = [];
  const ranked = candidates
    .map((tile) => ({ tile, score: score(tile) }))
    .sort((left, right) => right.score - left.score || left.tile.index - right.tile.index);
  for (const entry of ranked) {
    if (selected.length >= count) break;
    if (occupied.has(entry.tile.index)) continue;
    if ([...occupied].some((index) => squareGridDistance(entry.tile.index, index, config) < minimumDistance)) continue;
    selected.push(entry.tile);
    occupied.add(entry.tile.index);
  }
  return selected;
}

function createAstronomy(seed, accessTileIndex) {
  const stars = ["アウレア", "セレネ", "ヴェスペラ", "ルクス"];
  const moons = ["銀月", "蒼月", "紅月", "欠け月"];
  const starName = stars[Math.floor(hashUnit(seed, "star") * stars.length) % stars.length];
  const moonCount = 1 + Math.floor(hashUnit(seed, "moons") * 3);
  return Object.freeze({
    geographyId: "outer_space",
    model: "star-planet-moons",
    starName,
    moons: Object.freeze(Array.from({ length: moonCount }, (_, index) => moons[(index + Math.floor(hashUnit(seed, "moon-offset") * moons.length)) % moons.length])),
    accessSiteTileIndex: accessTileIndex,
  });
}

export function applyTerrainGeography({ config, tiles, rivers, stress, seed }) {
  const tagSets = tiles.map(() => new Set());
  const siteByIndex = new Map();
  const land = tiles.filter(isLand);
  const landmassSizes = land.reduce((sizes, tile) => {
    sizes.set(tile.landmassId, (sizes.get(tile.landmassId) ?? 0) + 1);
    return sizes;
  }, new Map());
  const islandLimit = Math.max(6, Math.round(land.length * 0.018));
  const riverSources = new Set((rivers ?? []).flatMap((river) => river.sourceIndices ?? []));
  const upstream = new Map();
  for (const tile of land) {
    if (tile.flowTo < 0) continue;
    if (!upstream.has(tile.flowTo)) upstream.set(tile.flowTo, []);
    upstream.get(tile.flowTo).push(tile.index);
  }

  for (const tile of tiles) {
    const tags = tagSets[tile.index];
    if (tile.terrain === "grassland") tags.add("grassland");
    if (tile.terrain === "plains") tags.add("plains");
    if (tile.terrain === "desert") {
      tags.add("desert");
      tags.add(hashUnit(seed, tile.index, "desert-surface") > 0.48 ? "sand_desert" : "rocky_desert");
    }
    if (["tundra", "snow"].includes(tile.terrain)) tags.add("coldland");
    if (tile.terrain === "snow") tags.add("snowfield");
    if (isSea(tile)) {
      tags.add("sea");
      const nearbyLandShare = tilesAround(tiles, config, tile, 3).filter(isLand).length / Math.max(1, tilesAround(tiles, config, tile, 3).length);
      tags.add(nearbyLandShare >= 0.44 ? "inland_sea" : "open_sea");
    }
    if (tile.terrain === "coast") {
      tags.add("coast");
      tags.add("shoal");
      const neighbors = squareNeighborIndices(tile.index, config).map((index) => tiles[index]);
      const cardinal = squareNeighborIndices(tile.index, config, { diagonal: false }).map((index) => tiles[index]);
      if (neighbors.filter(isLand).length >= 5 || cardinal.filter(isLand).length >= 3) tags.add("bay");
      if (neighbors.some((neighbor) => isLand(neighbor) && neighbor.relief === "flat") && hashUnit(seed, tile.index, "tidal-flat") > 0.52) tags.add("tidal_flat");
    }
    if (tile.terrain === "lake") tags.add("lake");
    if (!isLand(tile)) continue;

    const neighbors = squareNeighborIndices(tile.index, config).map((index) => tiles[index]);
    const cardinal = squareNeighborIndices(tile.index, config, { diagonal: false }).map((index) => tiles[index]);
    const neighboringSea = neighbors.filter(isSea).length;
    if (neighboringSea) tags.add("coast");
    if ((landmassSizes.get(tile.landmassId) ?? Number.POSITIVE_INFINITY) <= islandLimit) tags.add("island");
    else if (neighboringSea >= 5 || cardinal.filter(isSea).length >= 3) tags.add("cape");
    else if (neighboringSea >= 3) tags.add("peninsula");

    if (tile.relief === "hills") tags.add("hills");
    if (tile.relief === "mountains") tags.add("mountain_range");
    if (["forest", "rainforest"].includes(tile.feature)) {
      tags.add("forest");
      tags.add(forestVariant(tile, seed));
    }
    if (tile.feature === "marsh"
      || (tile.feature !== "floodplain" && tile.relief === "flat" && tile.soilMoisture > 0.34 && tile.floodRisk > 0.04 && tile.temperatureC > 2)) tags.add("marsh");
    if (tile.riverId) tags.add("river");
    if (riverSources.has(tile.index)) tags.add("spring");
    if (tile.terrain === "desert" && (tile.freshwater >= 0.52 || tags.has("spring"))) tags.add("oasis");

    const downstream = tile.flowTo >= 0 ? tiles[tile.flowTo] : null;
    if (tile.riverId && tile.relief === "flat" && downstream && isSea(downstream)) tags.add("delta");
    const upstreamTiles = (upstream.get(tile.index) ?? []).map((index) => tiles[index]);
    if (tile.riverId && tile.relief === "flat" && upstreamTiles.some((candidate) => ["hills", "mountains"].includes(candidate.relief))) tags.add("alluvial_fan");
    if (tile.riverId && (tile.relief !== "flat" || tile.slope >= 0.12)) tags.add("canyon");

    const local = tilesAround(tiles, config, tile, 2).filter(isLand);
    const meanElevation = local.reduce((sum, candidate) => sum + candidate.elevation, 0) / Math.max(1, local.length);
    const depressionDepth = Math.max(0, (tile.hydrologyElevation ?? tile.elevation) - tile.elevation);
    if (tile.relief === "flat" && (depressionDepth >= config.lakeDepth * 0.32 || meanElevation >= tile.elevation + 0.085)) tags.add("basin");
  }

  // Surface rivers do not cross every desert. Reserve a few low, relatively
  // moist desert cells as aquifer-fed springs so a generated desert can still
  // support the oasis/road-settlement relationship.
  const desertTiles = land.filter((tile) => tile.terrain === "desert");
  const desiredOases = desertTiles.length ? Math.max(1, Math.round(desertTiles.length / 520)) : 0;
  const existingOases = desertTiles.filter((tile) => tagSets[tile.index].has("oasis"));
  const addedOases = selectSpacedTiles(
    desertTiles.filter((tile) => !tagSets[tile.index].has("oasis")),
    Math.max(0, desiredOases - existingOases.length),
    config,
    (tile) => tile.soilMoisture * 90 + Math.log1p(tile.flowAccumulation ?? 0) * 7
      + (tile.relief === "flat" ? 12 : 0) + hashUnit(seed, tile.index, "aquifer-oasis") * 8,
    new Set(existingOases.map((tile) => tile.index)),
    6,
  );
  addedOases.forEach((tile) => {
    addTag(tagSets, tile.index, "spring");
    addTag(tagSets, tile.index, "oasis");
  });

  const occupied = new Set();
  const mountainCandidates = land.filter((tile) => ["hills", "mountains"].includes(tile.relief));
  const volcanoCount = Math.max(1, Math.round(land.length / 2500));
  const volcanoes = selectSpacedTiles(
    mountainCandidates,
    volcanoCount,
    config,
    (tile) => (stress?.convergence?.[tile.index] ?? 0) * 80 + tile.elevation * 45 + hashUnit(seed, tile.index, "volcano") * 8,
    occupied,
    Math.max(4, Math.floor(Math.min(config.width, config.height) / 18)),
  );
  volcanoes.forEach((tile, index) => {
    addTag(tagSets, tile.index, "volcano");
    addTag(tagSets, tile.index, "crater");
    if (index === 0) addTag(tagSets, tile.index, "caldera");
    siteByIndex.set(tile.index, { id: `terrain-site-volcano-${tile.x}-${tile.y}`, type: "volcano", name: siteName("volcano", tile, seed), category: "geology" });
  });

  const sitePlans = [
    {
      type: "cave",
      count: Math.max(2, Math.round(land.length / 700)),
      candidates: mountainCandidates,
      score: (tile) => tile.slope * 90 + tile.elevation * 18 + hashUnit(seed, tile.index, "cave") * 24,
      distance: 3,
    },
    {
      type: "mine",
      count: Math.max(2, Math.round(land.length / 900)),
      candidates: mountainCandidates,
      score: (tile) => (tile.resourcePotential?.mineral ?? 0) * 110 + hashUnit(seed, tile.index, "mine") * 18,
      distance: 3,
    },
    {
      type: "ruins",
      count: Math.max(2, Math.round(land.length / 1000)),
      candidates: land.filter((tile) => tile.feature !== "marsh" && tile.relief !== "mountains"),
      score: (tile) => tile.settlementScore * 0.45 + tile.freshwater * 18 + hashUnit(seed, tile.index, "ruins") * 35,
      distance: 4,
    },
  ];
  for (const plan of sitePlans) {
    const selected = selectSpacedTiles(plan.candidates, plan.count, config, plan.score, occupied, plan.distance);
    selected.forEach((tile) => {
      addTag(tagSets, tile.index, plan.type);
      siteByIndex.set(tile.index, { id: `terrain-site-${plan.type}-${tile.x}-${tile.y}`, type: plan.type, name: siteName(plan.type, tile, seed), category: "site" });
    });
  }

  const impactCandidates = land.filter((tile) => tile.relief !== "mountains" && tile.feature !== "marsh");
  const impact = selectSpacedTiles(
    impactCandidates,
    1,
    config,
    (tile) => hashUnit(seed, tile.index, "impact-crater") * 100 + (1 - tile.fertility / 100) * 8,
    occupied,
    5,
  )[0] ?? null;
  if (impact) {
    addTag(tagSets, impact.index, "crater");
    addTag(tagSets, impact.index, "outer_space");
    siteByIndex.set(impact.index, { id: `terrain-site-crater-${impact.x}-${impact.y}`, type: "crater", name: siteName("crater", impact, seed), category: "astronomy" });
  }

  const fantasyCandidates = [...mountainCandidates].sort((left, right) => right.elevation - left.elevation || left.index - right.index);
  const skyPeak = fantasyCandidates.find((tile) => !occupied.has(tile.index)) ?? null;
  if (skyPeak) {
    occupied.add(skyPeak.index);
    addTag(tagSets, skyPeak.index, "sky_peak");
    siteByIndex.set(skyPeak.index, { id: `terrain-site-sky-peak-${skyPeak.x}-${skyPeak.y}`, type: "sky_peak", name: siteName("sky_peak", skyPeak, seed), category: "fantasy" });
  }
  const floatingIsland = fantasyCandidates
    .filter((tile) => !occupied.has(tile.index))
    .sort((left, right) => hashUnit(seed, right.index, "floating-island") - hashUnit(seed, left.index, "floating-island") || left.index - right.index)[0] ?? null;
  if (floatingIsland) {
    addTag(tagSets, floatingIsland.index, "floating_island");
    siteByIndex.set(floatingIsland.index, { id: `terrain-site-floating-island-${floatingIsland.x}-${floatingIsland.y}`, type: "floating_island", name: siteName("floating_island", floatingIsland, seed), category: "fantasy" });
  }

  const enrichedTiles = tiles.map((tile) => {
    const geographyTags = [...tagSets[tile.index]].sort();
    const primaryGeography = choosePrimary(tagSets[tile.index]);
    const oasis = tagSets[tile.index].has("oasis");
    return {
      ...tile,
      ...(oasis ? {
        freshwater: Math.max(0.82, tile.freshwater),
        soilMoisture: Math.max(0.4, tile.soilMoisture),
        fertility: Math.min(100, tile.fertility + 14),
        yields: { ...tile.yields, food: Number((tile.yields.food + 0.6).toFixed(1)), commerce: Number((tile.yields.commerce + 0.4).toFixed(1)) },
        resourcePotential: { ...tile.resourcePotential, agriculture: Math.max(0.38, tile.resourcePotential.agriculture), freshwater: Math.max(0.82, tile.resourcePotential.freshwater) },
        settlementScore: tile.settlementScore + 18,
      } : {}),
      geographyTags,
      primaryGeography,
      geographyName: TERRAIN_GEOGRAPHY_DEFINITIONS[primaryGeography]?.name ?? null,
      terrainSite: siteByIndex.get(tile.index) ?? null,
    };
  });
  const sites = enrichedTiles.filter((tile) => tile.terrainSite).map((tile) => ({ ...tile.terrainSite, tileIndex: tile.index, x: tile.x, y: tile.y }));
  return {
    tiles: enrichedTiles,
    sites,
    astronomy: createAstronomy(seed, impact?.index ?? null),
  };
}

export function geographyCounts(tiles) {
  const counts = new Map();
  for (const tile of tiles) {
    for (const id of tile.geographyTags ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

export function terrainTravelProfile(tile) {
  const tags = new Set(tile?.geographyTags ?? []);
  let minutes = tags.has("snowfield") ? 18 : tags.has("coldland") ? 15 : tags.has("desert") ? 14 : tags.has("coast") ? 12 : 10;
  let dangerBias = 0;
  const notes = [];
  if (tags.has("forest")) { minutes += 4; dangerBias += 0.025; notes.push("木々で視界が狭い"); }
  if (tags.has("marsh")) { minutes += 8; dangerBias += 0.045; notes.push("湿地で足を取られる"); }
  if (tags.has("hills")) { minutes += 3; notes.push("起伏が続く"); }
  if (tags.has("canyon")) { minutes += 5; dangerBias += 0.03; notes.push("峡谷の通路が狭い"); }
  if (tags.has("volcano")) { minutes += 7; dangerBias += 0.055; notes.push("火山熱への備えが要る"); }
  if (tags.has("oasis")) { minutes = Math.max(8, minutes - 4); dangerBias -= 0.02; notes.push("水と休息を得られる"); }
  if (tags.has("farmland")) { minutes = Math.max(8, minutes - 2); dangerBias -= 0.015; notes.push("開墾され見通しがよい"); }
  if (tags.has("canal")) notes.push("水路沿いに進める");
  if (tags.has("road")) { minutes = 7; dangerBias -= 0.025; notes.unshift("街道で移動しやすい"); }
  return {
    minutes: Math.max(6, Math.round(minutes)),
    dangerBias: Math.max(-0.04, Math.min(0.16, Number(dangerBias.toFixed(3)))),
    note: notes[0] ?? "通常の地勢",
  };
}

export function geographyDefinition(id) {
  return TERRAIN_GEOGRAPHY_DEFINITIONS[id] ?? null;
}
