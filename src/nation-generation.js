import {
  buildSquareOperationalWorld,
  squareNeighborIndices,
  squareTileIndex,
  squareWrappedDeltaX,
} from "./square-grid.js";

const NATION_COLORS = Object.freeze([
  "#d45d57", "#d89b45", "#d4c25a", "#73a85b",
  "#4fa58f", "#4d91b8", "#696fc0", "#9a68b5",
  "#c25f91", "#a76b4c", "#7d9653", "#4f9aa6",
  "#8b78c8", "#be7664", "#90a9c4", "#b39558",
]);

const NAME_ROOTS = Object.freeze([
  "アルディア", "ヴェルン", "セレナ", "オルディス", "カレド", "ミレシア",
  "トルヴァ", "ネレイス", "ラグナ", "イスカ", "フェルダ", "ルーメン",
  "エルガル", "サレム", "ヴァレス", "キルナ", "ベルカ", "ノルディア",
  "アステル", "メルヴィア", "ローデン", "ティルナ", "グランツ", "エスラム",
]);

const LAND_TERRAINS = new Set(["grassland", "plains", "desert", "tundra", "snow"]);

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < String(text).length; index += 1) {
    hash ^= String(text).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(seed, ...values) {
  return hashText(`${seed}:${values.join(":")}`) / 4294967295;
}

function isLand(tile) {
  return LAND_TERRAINS.has(tile.terrain);
}

function gridDistance(left, right, world) {
  const dx = squareWrappedDeltaX(left.x, right.x, world.width, world.config.wrapX);
  return Math.abs(dx) + Math.abs(right.y - left.y);
}

function cardinalNeighbors(index, world) {
  return squareNeighborIndices(index, world, { diagonal: false });
}

function isCoastal(tile, world) {
  return cardinalNeighbors(tile.index, world).some((index) => !isLand(world.tiles[index]));
}

function capitalScore(tile, world) {
  const coastalBonus = isCoastal(tile, world) ? 8 : 0;
  const riverBonus = tile.freshwater * 13 + (tile.riverId ? 7 : 0);
  const hazard = tile.floodRisk * 11 + (tile.feature === "marsh" ? 18 : 0);
  const terrainPenalty = tile.relief === "mountains" ? 42 : tile.relief === "hills" ? 3 : 0;
  return tile.settlementScore + tile.yields.food * 6 + tile.yields.production * 3
    + coastalBonus + riverBonus - hazard - terrainPenalty;
}

function selectCapitalTiles(world, count, minDistance) {
  const candidates = world.tiles.filter((tile) => isLand(tile) && tile.relief !== "mountains" && tile.feature !== "marsh")
    .map((tile) => ({ tile, score: capitalScore(tile, world) }))
    .sort((left, right) => right.score - left.score || left.tile.index - right.tile.index);
  if (candidates.length < count) throw new RangeError(`Only ${candidates.length} viable capital tiles exist for ${count} nations.`);

  const byLandmass = new Map();
  for (const candidate of candidates) {
    if (!byLandmass.has(candidate.tile.landmassId)) byLandmass.set(candidate.tile.landmassId, []);
    byLandmass.get(candidate.tile.landmassId).push(candidate);
  }
  const landmassSizes = [...world.tiles.filter(isLand).reduce((sizes, tile) => {
    sizes.set(tile.landmassId, (sizes.get(tile.landmassId) ?? 0) + 1);
    return sizes;
  }, new Map())].sort((left, right) => right[1] - left[1]);

  const selected = [];
  for (const [landmassId] of landmassSizes.slice(0, count)) {
    const candidate = byLandmass.get(landmassId)?.[0];
    if (candidate) selected.push(candidate);
  }

  while (selected.length < count) {
    const remaining = candidates.filter((candidate) => !selected.some((entry) => entry.tile.index === candidate.tile.index));
    const eligible = remaining.filter((candidate) => selected.every((entry) => gridDistance(candidate.tile, entry.tile, world) >= minDistance));
    const pool = eligible.length ? eligible : remaining;
    const best = pool.reduce((winner, candidate) => {
      const nearest = Math.min(...selected.map((entry) => gridDistance(candidate.tile, entry.tile, world)));
      const score = candidate.score + nearest * 5.5;
      return !winner || score > winner.score || (score === winner.score && candidate.tile.index < winner.candidate.tile.index)
        ? { candidate, score }
        : winner;
    }, null);
    selected.push(best.candidate);
  }
  return selected.slice(0, count);
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(entry) {
    this.items.push(entry);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].cost <= entry.cost) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = entry;
  }

  pop() {
    if (!this.items.length) return null;
    const root = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.items.length) break;
        const child = right < this.items.length && this.items[right].cost < this.items[left].cost ? right : left;
        if (this.items[child].cost >= last.cost) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return root;
  }
}

function expansionCost(world, from, to, nation, seed) {
  const elevationBarrier = Math.abs(to.elevation - from.elevation) * 4.2;
  const mountainBarrier = to.relief === "mountains" ? 3.4 : 0;
  const wetlandBarrier = to.feature === "marsh" ? 2.2 : 0;
  const riverBarrier = from.riverId !== to.riverId && (from.riverId || to.riverId) ? 0.8 : 0;
  const climateDistance = Math.abs(to.temperatureC - nation.climate.temperatureC) / 28
    + Math.abs(to.precipitationMm - nation.climate.precipitationMm) / 2400;
  const frontierVariation = hashUnit(seed, nation.index, to.index, "frontier") * 0.7;
  return (to.movementCost + elevationBarrier + mountainBarrier + wetlandBarrier + riverBarrier
    + climateDistance * nation.cohesion + frontierVariation) / nation.expansionPower;
}

function assignTerritories(world, nations, seed) {
  const ownerIndex = Array(world.tiles.length).fill(-1);
  const bestCost = new Float64Array(world.tiles.length);
  bestCost.fill(Number.POSITIVE_INFINITY);
  const heap = new MinHeap();
  for (const nation of nations) {
    bestCost[nation.capitalIndex] = 0;
    ownerIndex[nation.capitalIndex] = nation.index;
    heap.push({ index: nation.capitalIndex, nationIndex: nation.index, cost: 0 });
  }
  while (heap.items.length) {
    const current = heap.pop();
    if (current.cost > bestCost[current.index] + 1e-9 || ownerIndex[current.index] !== current.nationIndex) continue;
    const nation = nations[current.nationIndex];
    const from = world.tiles[current.index];
    for (const neighborIndex of cardinalNeighbors(current.index, world)) {
      const to = world.tiles[neighborIndex];
      if (!isLand(to)) continue;
      const nextCost = current.cost + expansionCost(world, from, to, nation, seed);
      const existingNation = ownerIndex[neighborIndex];
      if (nextCost > bestCost[neighborIndex] + 1e-9) continue;
      if (Math.abs(nextCost - bestCost[neighborIndex]) <= 1e-9 && existingNation >= 0 && existingNation < nation.index) continue;
      bestCost[neighborIndex] = nextCost;
      ownerIndex[neighborIndex] = nation.index;
      heap.push({ index: neighborIndex, nationIndex: nation.index, cost: nextCost });
    }
  }

  const unclaimedByLandmass = world.tiles.filter((tile) => isLand(tile) && ownerIndex[tile.index] < 0)
    .reduce((groups, tile) => {
      if (!groups.has(tile.landmassId)) groups.set(tile.landmassId, []);
      groups.get(tile.landmassId).push(tile);
      return groups;
    }, new Map());
  for (const tiles of unclaimedByLandmass.values()) {
    const center = {
      x: tiles.reduce((sum, tile) => sum + tile.x, 0) / tiles.length,
      y: tiles.reduce((sum, tile) => sum + tile.y, 0) / tiles.length,
    };
    const nearest = nations.reduce((winner, nation) => {
      const capital = world.tiles[nation.capitalIndex];
      const distance = gridDistance(center, capital, world);
      return !winner || distance < winner.distance ? { nation, distance } : winner;
    }, null).nation;
    for (const tile of tiles) ownerIndex[tile.index] = nearest.index;
  }
  return ownerIndex;
}

function governmentFor(stats) {
  if (stats.mountainShare >= 0.34) return { government: "山岳連邦", suffix: "連邦" };
  if (stats.coastalShare >= 0.32 && stats.commercePerTile >= 0.62) return { government: "海洋都市同盟", suffix: "都市同盟" };
  if (stats.meanFertility >= 59 && stats.flatShare >= 0.48) return { government: "農耕王政", suffix: "王国" };
  if (stats.productionPerTile >= 2.05) return { government: "諸侯公国", suffix: "公国" };
  if (stats.meanFreshwater >= 0.48) return { government: "河川共和政", suffix: "共和国" };
  return { government: "地域王政", suffix: "王国" };
}

function primaryEconomy(stats) {
  const entries = [
    ["農耕", stats.food],
    ["鉱工業", stats.production],
    ["交易", stats.commerce * 1.8],
    ["林業", stats.timber * 2],
  ];
  return entries.sort((left, right) => right[1] - left[1])[0][0];
}

function buildNationRecords(world, seeds, ownerIndex, seed) {
  const usedNames = new Set();
  return seeds.map((entry, index) => {
    const tiles = world.tiles.filter((tile) => ownerIndex[tile.index] === index);
    const coastalTiles = tiles.filter((tile) => isCoastal(tile, world)).length;
    const food = tiles.reduce((sum, tile) => sum + tile.yields.food, 0);
    const production = tiles.reduce((sum, tile) => sum + tile.yields.production, 0);
    const commerce = tiles.reduce((sum, tile) => sum + tile.yields.commerce, 0);
    const timber = tiles.reduce((sum, tile) => sum + tile.resourcePotential.timber, 0);
    const stats = {
      tileCount: tiles.length,
      coastalShare: coastalTiles / Math.max(1, tiles.length),
      mountainShare: tiles.filter((tile) => tile.relief === "mountains").length / Math.max(1, tiles.length),
      flatShare: tiles.filter((tile) => tile.relief === "flat").length / Math.max(1, tiles.length),
      meanFertility: tiles.reduce((sum, tile) => sum + tile.fertility, 0) / Math.max(1, tiles.length),
      meanFreshwater: tiles.reduce((sum, tile) => sum + tile.freshwater, 0) / Math.max(1, tiles.length),
      food,
      production,
      commerce,
      timber,
      commercePerTile: commerce / Math.max(1, tiles.length),
      productionPerTile: production / Math.max(1, tiles.length),
    };
    const government = governmentFor(stats);
    let rootIndex = Math.floor(hashUnit(seed, index, entry.tile.index, "name") * NAME_ROOTS.length);
    while (usedNames.has(NAME_ROOTS[rootIndex])) rootIndex = (rootIndex + 1) % NAME_ROOTS.length;
    const rootName = NAME_ROOTS[rootIndex];
    usedNames.add(rootName);
    const populationPotential = Math.round(tiles.reduce((sum, tile) => sum
      + Math.max(0, tile.yields.food * 1900 + tile.fertility * 24 + tile.freshwater * 650 - tile.movementCost * 120), 0));
    return {
      id: `nation-${index + 1}`,
      index,
      name: `${rootName}${government.suffix}`,
      shortName: rootName,
      color: NATION_COLORS[index % NATION_COLORS.length],
      government: government.government,
      economy: primaryEconomy(stats),
      capitalIndex: entry.tile.index,
      capital: { x: entry.tile.x, y: entry.tile.y, suitability: Math.round(entry.score) },
      tileCount: tiles.length,
      areaShare: Number((tiles.length / Math.max(1, world.summary.landTiles)).toFixed(4)),
      populationPotential,
      meanFertility: Number(stats.meanFertility.toFixed(1)),
      meanFreshwater: Number(stats.meanFreshwater.toFixed(3)),
      coastalShare: Number(stats.coastalShare.toFixed(3)),
      mountainShare: Number(stats.mountainShare.toFixed(3)),
      yields: {
        food: Number(food.toFixed(1)),
        production: Number(production.toFixed(1)),
        commerce: Number(commerce.toFixed(1)),
      },
      landmassIds: [...new Set(tiles.map((tile) => tile.landmassId))].sort((left, right) => left - right),
    };
  });
}

function buildBorders(world, ownerIndex, nations) {
  const segments = [];
  const shared = new Map();
  for (const tile of world.tiles.filter(isLand)) {
    const eastX = (tile.x + 1) % world.width;
    if (world.config.wrapX || tile.x + 1 < world.width) {
      const east = world.tiles[squareTileIndex(eastX, tile.y, world.width)];
      if (isLand(east) && ownerIndex[tile.index] !== ownerIndex[east.index]) {
        segments.push({ x1: tile.x + 1, y1: tile.y, x2: tile.x + 1, y2: tile.y + 1, nations: [nations[ownerIndex[tile.index]].id, nations[ownerIndex[east.index]].id], followsRiver: Boolean(tile.riverId || east.riverId) });
      }
    }
    if (tile.y + 1 < world.height) {
      const south = world.tiles[squareTileIndex(tile.x, tile.y + 1, world.width)];
      if (isLand(south) && ownerIndex[tile.index] !== ownerIndex[south.index]) {
        segments.push({ x1: tile.x, y1: tile.y + 1, x2: tile.x + 1, y2: tile.y + 1, nations: [nations[ownerIndex[tile.index]].id, nations[ownerIndex[south.index]].id], followsRiver: Boolean(tile.riverId || south.riverId) });
      }
    }
  }
  for (const segment of segments) {
    const key = [...segment.nations].sort().join(":");
    shared.set(key, (shared.get(key) ?? 0) + 1);
  }
  return { segments, sharedBorderLengths: Object.fromEntries([...shared].sort()) };
}

export function validateNationWorld(world, nationWorld) {
  const issues = [];
  if (nationWorld.nations.length !== nationWorld.config.count) issues.push("Nation count does not match configuration.");
  if (!Array.isArray(nationWorld.tiles) || nationWorld.tiles.length !== world.tiles.length) issues.push("Operational square tiles do not match terrain tiles.");
  for (const tile of world.tiles) {
    const nationId = nationWorld.tileNationIds[tile.index];
    if (isLand(tile) && !nationId) issues.push(`Land tile ${tile.index} is unclaimed.`);
    if (!isLand(tile) && nationId) issues.push(`Water tile ${tile.index} is claimed by ${nationId}.`);
    const operationalTile = nationWorld.tiles?.[tile.index];
    if (operationalTile && (operationalTile.index !== tile.index || operationalTile.x !== tile.x || operationalTile.y !== tile.y)) {
      issues.push(`Operational square tile ${tile.index} is misaligned.`);
    }
  }
  for (const nation of nationWorld.nations) {
    if (nationWorld.tileNationIds[nation.capitalIndex] !== nation.id) issues.push(`${nation.name} does not own its capital.`);
    if (nation.tileCount < 1) issues.push(`${nation.name} has no territory.`);
  }
  return { valid: issues.length === 0, issues };
}

export function generateNations(world, options = {}) {
  if (!world || world.gridType !== "square" || !Array.isArray(world.tiles)) {
    throw new TypeError("Nation generation requires a generated square-grid terrain world.");
  }
  const landTiles = world.tiles.filter(isLand).length;
  const count = options.count ?? Math.min(7, Math.max(2, Math.floor(landTiles / 140)));
  if (!Number.isInteger(count) || count < 2 || count > Math.min(16, landTiles)) {
    throw new RangeError("Nation count must be an integer between 2 and 16 and cannot exceed the land tile count.");
  }
  const seed = String(options.seed ?? `${world.seed}:nations`);
  const minCapitalDistance = options.minCapitalDistance ?? Math.max(4, Math.floor(Math.min(world.width, world.height) / Math.sqrt(count * 2.4)));
  const capitalEntries = selectCapitalTiles(world, count, minCapitalDistance);
  const provisional = capitalEntries.map((entry, index) => ({
    index,
    capitalIndex: entry.tile.index,
    climate: { temperatureC: entry.tile.temperatureC, precipitationMm: entry.tile.precipitationMm },
    cohesion: 0.8 + hashUnit(seed, index, "cohesion") * 1.15,
    expansionPower: 0.9 + clamp(entry.score / 220) * 0.22 + hashUnit(seed, index, "power") * 0.12,
  }));
  const ownerIndex = assignTerritories(world, provisional, seed);
  const nations = buildNationRecords(world, capitalEntries, ownerIndex, seed);
  const tileNationIds = ownerIndex.map((index, tileIndex) => isLand(world.tiles[tileIndex]) ? nations[index].id : null);
  const borders = buildBorders(world, ownerIndex, nations);
  const nationWorld = {
    version: 1,
    seed,
    config: Object.freeze({ count, minCapitalDistance }),
    nations,
    tileNationIds,
    borderSegments: borders.segments,
    sharedBorderLengths: borders.sharedBorderLengths,
    summary: {
      nationCount: nations.length,
      claimedLandTiles: tileNationIds.filter(Boolean).length,
      borderSegmentCount: borders.segments.length,
      meanNationSize: Number((landTiles / nations.length).toFixed(1)),
      largestNationId: [...nations].sort((left, right) => right.tileCount - left.tileCount)[0].id,
    },
  };
  nationWorld.tiles = buildSquareOperationalWorld(world, nationWorld).tiles;
  const validation = validateNationWorld(world, nationWorld);
  if (!validation.valid) throw new Error(`Generated nation world is invalid:\n${validation.issues.join("\n")}`);
  return nationWorld;
}
