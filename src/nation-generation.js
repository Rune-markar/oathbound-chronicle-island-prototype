import {
  buildSquareOperationalWorld,
  squareNeighborIndices,
  squareTileIndex,
  squareWrappedDeltaX,
} from "./square-grid.js";
import { getRaceCategory, requireRaceDefinition } from "./race-list.js";

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

export const GENERATED_WORLD_OBJECT_TYPES = Object.freeze({
  castle: Object.freeze({ id: "castle", name: "城" }),
  city: Object.freeze({ id: "city", name: "都市" }),
  town: Object.freeze({ id: "town", name: "町" }),
  village: Object.freeze({ id: "village", name: "村" }),
  fishing_port: Object.freeze({ id: "fishing_port", name: "漁港" }),
  port: Object.freeze({ id: "port", name: "港" }),
  bay_city: Object.freeze({ id: "bay_city", name: "湾口都市" }),
  fort: Object.freeze({ id: "fort", name: "砦" }),
});

export const SETTLEMENT_POPULATION_THRESHOLDS = Object.freeze({
  village: 0,
  town: 2500,
  city: 10000,
});

const VILLAGE_NAME_STEMS = Object.freeze([
  "川辺", "森辺", "麦丘", "白樺", "石渡", "泉守",
  "高瀬", "星見", "柳原", "赤土", "霧谷", "緑野",
]);

const MARITIME_NAME_STEMS = Object.freeze([
  "潮見", "白帆", "碧波", "汐守", "海門", "月浦",
  "風待", "朝凪", "青岬", "真珠", "千舟", "灯台",
]);

export const MARITIME_SETTLEMENT_HIERARCHY = Object.freeze([
  Object.freeze({ type: "fishing_port", name: "漁港", tier: 1, settlementLevel: "village", minimumPopulation: 900, maximumPopulation: 2499 }),
  Object.freeze({ type: "port", name: "港", tier: 2, settlementLevel: "town", minimumPopulation: 3600, maximumPopulation: 9999 }),
  Object.freeze({ type: "bay_city", name: "湾口都市", tier: 3, settlementLevel: "city", minimumPopulation: 14000, maximumPopulation: 36000 }),
]);

const MARITIME_OBJECT_TYPES = new Set(MARITIME_SETTLEMENT_HIERARCHY.map((entry) => entry.type));

const REGION_NAME_STEMS = Object.freeze([
  "中央", "青河", "白峰", "緑野", "霧谷", "石原", "湖畔", "森境",
  "東境", "西境", "南境", "北境", "高原", "海門", "川上", "川下",
]);

export const GENERATED_REGION_TARGET_TILES = 210;
export const GENERATED_OBJECT_MIN_DISTANCE = 3;
export const ROADSIDE_SETTLEMENT_MAX_OFFSET = 1;
export const SETTLEMENT_EXPANSION_WAVE_TILES = 5;
export const NATION_LEVEL_VILLAGE_BASELINES = Object.freeze({
  1: 3,
  2: 5,
  3: 7,
  4: 9,
  5: 12,
  6: 15,
  7: 18,
});
export const NATION_VILLAGE_LIMIT_MINIMUM_SHARE = 0.6;

export const NATURAL_FRONTIER_DEFAULT_WEIGHT = 30;
export const NATURAL_FRONTIER_CANDIDATE_WEIGHTS = Object.freeze([6, NATURAL_FRONTIER_DEFAULT_WEIGHT, 50]);
export const STRATEGIC_CROSSING_FORT_PROBABILITY = 0.86;

const LAND_TERRAINS = new Set(["grassland", "plains", "desert", "tundra", "snow"]);

function definePeopleArchetype({ id, name, source, sourceKind = "race", preferredHabitats, settlementStyle }) {
  return Object.freeze({
    id,
    name,
    sourceKind,
    backgroundHabitats: Object.freeze([...(source.habitat ?? [])]),
    preferredHabitats: Object.freeze([...preferredHabitats]),
    settlementStyle,
  });
}

export const NATION_PEOPLE_ARCHETYPES = Object.freeze([
  definePeopleArchetype({ id: "human", name: "人間", source: requireRaceDefinition("human"), preferredHabitats: ["plain"], settlementStyle: "平地都市" }),
  definePeopleArchetype({ id: "beastfolk", name: "獣人", source: getRaceCategory("beastfolk"), sourceKind: "category", preferredHabitats: ["forest"], settlementStyle: "森林氏族集落" }),
  definePeopleArchetype({ id: "dwarf", name: "ドワーフ", source: requireRaceDefinition("dwarf"), preferredHabitats: ["underground", "mountain"], settlementStyle: "山岳洞窟都市" }),
  definePeopleArchetype({ id: "elf", name: "エルフ", source: requireRaceDefinition("elf"), preferredHabitats: ["forest"], settlementStyle: "樹冠都市" }),
  definePeopleArchetype({ id: "lizardman", name: "リザードマン", source: requireRaceDefinition("lizardman"), preferredHabitats: ["swamp", "river"], settlementStyle: "水郷集落" }),
  definePeopleArchetype({ id: "goblin", name: "ゴブリン", source: requireRaceDefinition("goblin"), preferredHabitats: ["hill", "forest"], settlementStyle: "丘陵工房集落" }),
  definePeopleArchetype({ id: "giant", name: "巨人族", source: requireRaceDefinition("giant"), preferredHabitats: ["mountain", "hill"], settlementStyle: "高峰氏族砦" }),
]);

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

export function nationLevelForTerritory(tileCount, meanNationSize) {
  const relativeSize = Math.max(0, Number(tileCount) || 0) / Math.max(1, Number(meanNationSize) || 1);
  const thresholds = [0.35, 0.6, 0.85, 1.15, 1.5, 2.05];
  return thresholds.findIndex((threshold) => relativeSize <= threshold) + 1 || 7;
}

export function initialVillageLimitForNationLevel(nationLevel, seed, nationIndex = 0) {
  const level = Math.min(7, Math.max(1, Math.round(Number(nationLevel) || 1)));
  const baseline = NATION_LEVEL_VILLAGE_BASELINES[level];
  const minimum = Math.max(1, Math.ceil(baseline * NATION_VILLAGE_LIMIT_MINIMUM_SHARE));
  const span = baseline - minimum + 1;
  return minimum + Math.min(span - 1, Math.floor(hashUnit(seed, nationIndex, level, "initial-village-limit") * span));
}

function isLand(tile) {
  return LAND_TERRAINS.has(tile.terrain);
}

function isSea(tile) {
  return Boolean(tile) && ["ocean", "coast"].includes(tile.terrain);
}

function naturalFrontierBetween(from, to) {
  const candidates = [];
  const add = (type, strength) => candidates.push({ type, strength: clamp(strength) });
  const elevationBreak = Math.abs(to.elevation - from.elevation);
  const highestSlope = Math.max(from.slope ?? 0, to.slope ?? 0);
  const riverbank = Boolean(from.riverId) !== Boolean(to.riverId);
  const differentChannels = from.riverId && to.riverId && from.riverId !== to.riverId;

  if (from.relief === "mountains" || to.relief === "mountains") {
    const bothMountain = from.relief === "mountains" && to.relief === "mountains";
    add("mountain", bothMountain ? 1 : 0.82 + Math.min(0.16, elevationBreak * 1.2));
  } else if (highestSlope >= 0.16 && elevationBreak >= 0.055) {
    add("ridge", 0.68 + Math.min(0.24, highestSlope * 0.8 + elevationBreak));
  } else if (from.relief === "hills" && to.relief === "hills" && highestSlope >= 0.1) {
    add("ridge", 0.64 + Math.min(0.18, highestSlope * 0.7));
  }

  if (riverbank || differentChannels) {
    const riverOrder = Math.max(from.riverOrder ?? 1, to.riverOrder ?? 1);
    const flowConnected = from.flowTo === to.index || to.flowTo === from.index;
    add("river", Math.min(1, 0.72 + riverOrder * 0.055 - (flowConnected ? 0.08 : 0)));
  }

  const marshBoundary = from.feature === "marsh" || to.feature === "marsh";
  if (marshBoundary) add("wetland", from.feature === to.feature ? 0.7 : 0.76);

  const harshTerrains = new Set(["desert", "tundra", "snow"]);
  if (from.terrain !== to.terrain && (harshTerrains.has(from.terrain) || harshTerrains.has(to.terrain))) {
    add("climate", 0.66 + Math.min(0.18, Math.abs(from.temperatureC - to.temperatureC) / 24));
  }

  const strongest = candidates.sort((left, right) => right.strength - left.strength)[0];
  return strongest
    ? { ...strongest, natural: strongest.strength >= 0.65, followsRiver: strongest.type === "river" }
    : { type: "artificial", strength: 0, natural: false, followsRiver: false };
}

function gridDistance(left, right, world) {
  const dx = squareWrappedDeltaX(left.x, right.x, world.width, world.config.wrapX);
  return Math.abs(dx) + Math.abs(right.y - left.y);
}

function visualGridDistance(left, right, world) {
  const dx = squareWrappedDeltaX(left.x, right.x, world.width, world.config.wrapX);
  return Math.hypot(dx, right.y - left.y);
}

function cardinalNeighbors(index, world) {
  return squareNeighborIndices(index, world, { diagonal: false });
}

function isCoastal(tile, world) {
  return cardinalNeighbors(tile.index, world).some((index) => isSea(world.tiles[index]));
}

function habitatAffinity(tile, world, habitat) {
  if (habitat === "plain") {
    if (tile.relief === "flat" && ["plains", "grassland"].includes(tile.terrain) && !["forest", "rainforest", "marsh"].includes(tile.feature)) return 1;
    return tile.relief === "flat" && tile.feature !== "marsh" ? 0.62 : 0.08;
  }
  if (habitat === "forest") return ["forest", "rainforest"].includes(tile.feature) ? 1 : 0.08;
  if (habitat === "mountain") return tile.relief === "mountains" ? 1 : tile.relief === "hills" ? 0.52 : 0.04;
  if (habitat === "underground") return tile.relief === "mountains" ? 1 : tile.relief === "hills" ? 0.68 : 0.02;
  if (habitat === "hill") return tile.relief === "hills" ? 1 : tile.relief === "mountains" ? 0.54 : 0.12;
  if (habitat === "swamp") return tile.feature === "marsh" ? 1 : tile.feature === "floodplain" ? 0.72 : 0.04;
  if (habitat === "river") return tile.riverId || tile.freshwater >= 0.65 ? 1 : tile.freshwater >= 0.25 ? 0.5 : 0.06;
  if (habitat === "coast") return isCoastal(tile, world) ? 1 : 0.05;
  if (habitat === "tundra") return ["tundra", "snow"].includes(tile.terrain) ? 1 : 0.05;
  if (habitat === "desert") return tile.terrain === "desert" ? 1 : 0.05;
  if (habitat === "urban") return clamp(tile.settlementScore / 150, 0.12, 1);
  return 0.1;
}

function peopleHabitatAffinity(tile, world, archetype) {
  return Math.max(...archetype.preferredHabitats.map((habitat) => habitatAffinity(tile, world, habitat)));
}

function capitalScore(tile, world, archetype) {
  const coastalBonus = isCoastal(tile, world) ? 8 : 0;
  const riverBonus = tile.freshwater * 13 + (tile.riverId ? 7 : 0);
  const wetlandAdapted = archetype.preferredHabitats.includes("swamp");
  const mountainAdapted = archetype.preferredHabitats.some((habitat) => ["mountain", "underground"].includes(habitat));
  const hazard = tile.floodRisk * (wetlandAdapted ? 3 : 11) + (tile.feature === "marsh" ? (wetlandAdapted ? 0 : 18) : 0);
  const terrainPenalty = tile.relief === "mountains" ? (mountainAdapted ? -8 : 42) : tile.relief === "hills" ? 3 : 0;
  const habitatBonus = peopleHabitatAffinity(tile, world, archetype) * 92;
  return tile.settlementScore + tile.yields.food * 6 + tile.yields.production * 3
    + coastalBonus + riverBonus + habitatBonus - hazard - terrainPenalty;
}

function selectCapitalTiles(world, archetypes, minDistance) {
  const selected = [];
  for (const archetype of archetypes) {
    const candidates = world.tiles.filter((tile) => isLand(tile) && !selected.some((entry) => entry.tile.index === tile.index))
      .map((tile) => ({ tile, archetype, affinity: peopleHabitatAffinity(tile, world, archetype), score: capitalScore(tile, world, archetype) }));
    const preferred = candidates.filter((candidate) => candidate.affinity >= 0.9);
    const habitatPool = preferred.length ? preferred : candidates;
    const spaced = habitatPool.filter((candidate) => selected.every((entry) => gridDistance(candidate.tile, entry.tile, world) >= minDistance));
    const pool = spaced.length ? spaced : habitatPool;
    const best = pool.reduce((winner, candidate) => {
      const nearest = selected.length ? Math.min(...selected.map((entry) => gridDistance(candidate.tile, entry.tile, world))) : minDistance;
      const newLandmassBonus = selected.some((entry) => entry.tile.landmassId === candidate.tile.landmassId) ? 0 : 18;
      const combinedScore = candidate.score + nearest * 4.8 + newLandmassBonus;
      return !winner || combinedScore > winner.combinedScore
        || (combinedScore === winner.combinedScore && candidate.tile.index < winner.candidate.tile.index)
        ? { candidate, combinedScore }
        : winner;
    }, null);
    if (!best) throw new RangeError(`No viable capital tile exists for ${archetype.name}.`);
    selected.push(best.candidate);
  }
  return selected;
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

function expansionCost(world, from, to, nation, seed, naturalFrontierWeight) {
  const elevationBarrier = Math.abs(to.elevation - from.elevation) * 4.2;
  const mountainAdapted = nation.archetype.preferredHabitats.some((habitat) => ["mountain", "underground"].includes(habitat));
  const wetlandAdapted = nation.archetype.preferredHabitats.includes("swamp");
  const mountainBarrier = to.relief === "mountains" ? (mountainAdapted ? 0.35 : 3.4) : 0;
  const wetlandBarrier = to.feature === "marsh" ? (wetlandAdapted ? 0.18 : 2.2) : 0;
  const riverBarrier = from.riverId !== to.riverId && (from.riverId || to.riverId) ? 0.8 : 0;
  const naturalFrontier = naturalFrontierBetween(from, to);
  const adaptation = naturalFrontier.type === "mountain" && mountainAdapted
    ? 0.45
    : naturalFrontier.type === "wetland" && wetlandAdapted ? 0.42 : 1;
  const naturalBarrier = naturalFrontier.strength * naturalFrontierWeight * adaptation;
  const climateDistance = Math.abs(to.temperatureC - nation.climate.temperatureC) / 28
    + Math.abs(to.precipitationMm - nation.climate.precipitationMm) / 2400;
  const frontierVariation = hashUnit(seed, nation.index, to.index, "frontier") * 0.24;
  const habitatPenalty = (1 - peopleHabitatAffinity(to, world, nation.archetype)) * 1.25;
  return (to.movementCost + elevationBarrier + mountainBarrier + wetlandBarrier + riverBarrier
    + naturalBarrier + climateDistance * nation.cohesion + habitatPenalty + frontierVariation) / nation.expansionPower;
}

function territoryComponentsOnLandmass(world, ownerIndex, nationIndex, landmassId) {
  const remaining = new Set(world.tiles.filter((tile) => (
    tile.landmassId === landmassId && ownerIndex[tile.index] === nationIndex
  )).map((tile) => tile.index));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    const queue = [first];
    const component = [];
    remaining.delete(first);
    while (queue.length) {
      const index = queue.shift();
      component.push(index);
      for (const neighborIndex of cardinalNeighbors(index, world)) {
        if (!remaining.has(neighborIndex)) continue;
        remaining.delete(neighborIndex);
        queue.push(neighborIndex);
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length || left[0] - right[0]);
}

function consolidateDisconnectedTerritories(world, ownerIndex, nations) {
  const consolidated = [...ownerIndex];
  for (let pass = 0; pass < nations.length * 2; pass += 1) {
    let changed = false;
    for (const nation of nations) {
      const capital = world.tiles[nation.capitalIndex];
      const landmassIds = [...new Set(world.tiles.filter((tile) => consolidated[tile.index] === nation.index).map((tile) => tile.landmassId))].sort((left, right) => left - right);
      for (const landmassId of landmassIds) {
        const components = territoryComponentsOnLandmass(world, consolidated, nation.index, landmassId);
        if (components.length <= 1) continue;
        const retained = landmassId === capital.landmassId
          ? components.find((component) => component.includes(nation.capitalIndex)) ?? components[0]
          : components[0];
        for (const component of components) {
          if (component === retained) continue;
          const sharedEdges = new Map();
          for (const index of component) {
            for (const neighborIndex of cardinalNeighbors(index, world)) {
              const neighborOwner = consolidated[neighborIndex];
              if (neighborOwner < 0 || neighborOwner === nation.index || world.tiles[neighborIndex].landmassId !== landmassId) continue;
              sharedEdges.set(neighborOwner, (sharedEdges.get(neighborOwner) ?? 0) + 1);
            }
          }
          const recipient = [...sharedEdges.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0];
          if (!Number.isInteger(recipient)) continue;
          for (const index of component) consolidated[index] = recipient;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return consolidated;
}

function assignTerritories(world, nations, seed, naturalFrontierWeight) {
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
      const nextCost = current.cost + expansionCost(world, from, to, nation, seed, naturalFrontierWeight);
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
  return consolidateDisconnectedTerritories(world, ownerIndex, nations);
}

function isFrontierTile(tile, world, ownerIndex) {
  const owner = ownerIndex[tile.index];
  return cardinalNeighbors(tile.index, world).some((neighborIndex) => (
    isLand(world.tiles[neighborIndex]) && ownerIndex[neighborIndex] !== owner
  ));
}

function takeSpacedObjectTiles(candidates, count, world, occupied, minDistance, score, blocked = new Set()) {
  const ranked = candidates
    .filter((tile) => !occupied.has(tile.index) && !blocked.has(tile.index))
    .map((tile) => ({ tile, score: score(tile) }))
    .sort((left, right) => right.score - left.score || left.tile.index - right.tile.index);
  const selected = [];
  for (const candidate of ranked) {
    if (selected.length >= count) break;
    if (occupied.has(candidate.tile.index) || blocked.has(candidate.tile.index)) continue;
    if ([...occupied].some((index) => visualGridDistance(candidate.tile, world.tiles[index], world) < minDistance)) continue;
    selected.push(candidate.tile);
    occupied.add(candidate.tile.index);
  }
  return selected;
}

function frontierDirection(tile, capital, world) {
  const dx = squareWrappedDeltaX(capital.x, tile.x, world.width, world.config.wrapX);
  const dy = tile.y - capital.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? "東境" : "西境";
  return dy >= 0 ? "南境" : "北境";
}

export function settlementLevelForPopulation(population) {
  const value = Math.max(0, Math.round(Number(population) || 0));
  if (value >= SETTLEMENT_POPULATION_THRESHOLDS.city) return "city";
  if (value >= SETTLEMENT_POPULATION_THRESHOLDS.town) return "town";
  return "village";
}

function settlementName(baseName, level) {
  return `${baseName}${level === "city" ? "市" : level === "town" ? "町" : "村"}`;
}

function settlementPopulation(tile, seed, nation, region, localIndex, role) {
  const variation = hashUnit(seed, nation.index, region.index, tile.index, localIndex, "settlement-population");
  const natural = Math.round(
    420
    + tile.settlementScore * 31
    + tile.yields.food * 210
    + tile.freshwater * 520
    - tile.floodRisk * 240
    + variation * 760,
  );
  if (role === "capital-city") return Math.max(12000, natural + 7600);
  if (role === "regional-seat") return Math.max(2800, natural + 900);
  return Math.min(2420, Math.max(480, natural));
}

function seaAccessIndices(tile, world) {
  return cardinalNeighbors(tile.index, world).filter((index) => isSea(world.tiles[index]));
}

function maritimeSettlementScore(tile, world, seed, nationIndex) {
  const cardinalSea = seaAccessIndices(tile, world).map((index) => world.tiles[index]);
  const nearbySea = squareNeighborIndices(tile.index, world, { diagonal: true })
    .map((index) => world.tiles[index])
    .filter(isSea);
  const shelteredWater = nearbySea.filter((neighbor) => neighbor.terrain === "coast").length;
  const openWater = nearbySea.filter((neighbor) => neighbor.terrain === "ocean").length;
  return tile.settlementScore * 2.2
    + tile.yields.commerce * 19
    + tile.yields.food * 5
    + tile.freshwater * 13
    + cardinalSea.length * 18
    + shelteredWater * 5
    + Math.min(3, openWater) * 3
    - tile.floodRisk * 9
    - (tile.relief === "mountains" ? 42 : tile.relief === "hills" ? 8 : 0)
    + hashUnit(seed, nationIndex, tile.index, "maritime-settlement") * 7;
}

function buildCoastalSettlements(world, nations, regions, ownerIndex, seed, occupied, blocked = new Set()) {
  const objects = [];
  for (const nation of nations) {
    const candidates = world.tiles.filter((tile) => (
      ownerIndex[tile.index] === nation.index
      && tile.index !== nation.capitalIndex
      && isCoastal(tile, world)
      && tile.relief !== "mountains"
      && tile.feature !== "marsh"
    ));
    const count = Math.min(MARITIME_SETTLEMENT_HIERARCHY.length, candidates.filter((tile) => !occupied.has(tile.index)).length);
    if (!count) continue;
    const selected = takeSpacedObjectTiles(
      candidates,
      count,
      world,
      occupied,
      GENERATED_OBJECT_MIN_DISTANCE,
      (tile) => maritimeSettlementScore(tile, world, seed, nation.index),
      blocked,
    ).sort((left, right) => (
      maritimeSettlementScore(left, world, seed, nation.index) - maritimeSettlementScore(right, world, seed, nation.index)
      || left.index - right.index
    ));
    const nameOffset = Math.floor(hashUnit(seed, nation.index, "maritime-names") * MARITIME_NAME_STEMS.length);
    selected.forEach((tile, localIndex) => {
      const hierarchy = MARITIME_SETTLEMENT_HIERARCHY[localIndex];
      const region = regions.find((candidate) => candidate.tileIndices.includes(tile.index));
      const variation = hashUnit(seed, nation.index, tile.index, "maritime-population");
      const population = Math.min(hierarchy.maximumPopulation, Math.max(
        hierarchy.minimumPopulation,
        Math.round(hierarchy.minimumPopulation * (1 + variation * 0.58) + tile.settlementScore * (hierarchy.tier * 12)),
      ));
      const stem = MARITIME_NAME_STEMS[(nameOffset + localIndex) % MARITIME_NAME_STEMS.length];
      const baseName = `${nation.shortName}${stem}`;
      objects.push({
        id: `${nation.id}-maritime-${hierarchy.tier}`,
        type: hierarchy.type,
        typeName: hierarchy.name,
        settlementLevel: hierarchy.settlementLevel,
        baseName,
        population,
        growthRate: Number((0.003 + tile.yields.commerce * 0.0005 + tile.freshwater * 0.0008 + variation * 0.0018).toFixed(5)),
        nationId: nation.id,
        regionId: region?.id ?? null,
        tileIndex: tile.index,
        x: tile.x,
        y: tile.y,
        name: `${baseName}${hierarchy.name}`,
        importance: hierarchy.tier,
        maritime: true,
        maritimeTier: hierarchy.tier,
        harborScore: Number(maritimeSettlementScore(tile, world, seed, nation.index).toFixed(2)),
        seaAccessTileIndices: seaAccessIndices(tile, world),
        seaRouteIds: [],
      });
    });
  }
  return objects;
}

function buildWorldObjects(world, nations, regions, ownerIndex, seed, reservedTileIndices = new Set()) {
  const occupied = new Set();
  const blocked = new Set(reservedTileIndices);
  const objects = [];
  for (const nation of nations) {
    const capital = world.tiles[nation.capitalIndex];
    occupied.add(capital.index);
    blocked.delete(capital.index);
    objects.push({
      id: `${nation.id}-castle`,
      type: "castle",
      typeName: GENERATED_WORLD_OBJECT_TYPES.castle.name,
      nationId: nation.id,
      tileIndex: capital.index,
      x: capital.x,
      y: capital.y,
      name: `${nation.shortName}王城`,
      importance: 3,
      regionId: regions.find((region) => region.capital && region.nationId === nation.id)?.id ?? null,
    });
  }

  // Build one urban center for every region before placing ports, forts, or
  // villages. Later settlement waves radiate from these centers along roads.
  for (const region of regions) {
    const nation = nations.find((candidate) => candidate.id === region.nationId);
    const capital = world.tiles[nation.capitalIndex];
    const regionTiles = region.tileIndices.map((index) => world.tiles[index]);
    const viable = regionTiles.filter((tile) => (
      tile.index !== capital.index && tile.relief !== "mountains" && tile.feature !== "marsh" && tile.settlementScore > 0
    ));
    const center = world.tiles[region.anchorIndex];
    const selected = takeSpacedObjectTiles(
      viable.length ? viable : regionTiles,
      1,
      world,
      occupied,
      GENERATED_OBJECT_MIN_DISTANCE,
      (tile) => tile.settlementScore * 2.8 + tile.yields.food * 10 + tile.freshwater * 16
        - tile.floodRisk * 12 - tile.movementCost * 2
        - gridDistance(tile, center, world) * 1.2
        + hashUnit(seed, region.index, tile.index, "urban-center") * 6,
      blocked,
    )[0];
    if (!selected) {
      if (region.capital) {
        const castle = objects.find((object) => object.id === `${nation.id}-castle`);
        Object.assign(castle, {
          settlementLevel: "city",
          baseName: `${nation.shortName}王城`,
          population: 12000,
          growthRate: 0.003,
          regionSeat: true,
          capitalCity: true,
          placement: "fortified-urban-center",
          expansionWave: 0,
          urbanDistance: 0,
          roadsideDistance: 0,
        });
      }
      continue;
    }
    const role = region.capital ? "capital-city" : "regional-seat";
    const population = settlementPopulation(selected, seed, nation, region, 0, role);
    const settlementLevel = settlementLevelForPopulation(population);
    const stemOffset = Math.floor(hashUnit(seed, nation.index, region.index, "settlement-names") * VILLAGE_NAME_STEMS.length);
    const baseName = `${nation.shortName}${VILLAGE_NAME_STEMS[stemOffset]}`;
    objects.push({
      id: `${region.id}-settlement-1`,
      type: settlementLevel,
      typeName: GENERATED_WORLD_OBJECT_TYPES[settlementLevel].name,
      settlementLevel,
      baseName,
      population,
      growthRate: Number((0.0025 + selected.yields.food * 0.00035 + selected.freshwater * 0.0012 + hashUnit(seed, selected.index, "growth") * 0.0015).toFixed(5)),
      regionSeat: true,
      capitalCity: role === "capital-city",
      placement: "urban-center",
      expansionWave: 0,
      urbanDistance: 0,
      roadsideDistance: 0,
      nationId: nation.id,
      regionId: region.id,
      tileIndex: selected.index,
      x: selected.x,
      y: selected.y,
      name: settlementName(baseName, settlementLevel),
      importance: settlementLevel === "city" ? 3 : 2,
    });
  }

  objects.push(...buildCoastalSettlements(world, nations, regions, ownerIndex, seed, occupied, blocked));

  for (const nation of nations) {
    const capital = world.tiles[nation.capitalIndex];
    const ownedTiles = world.tiles.filter((tile) => ownerIndex[tile.index] === nation.index);
    const frontierTiles = ownedTiles.filter((tile) => isFrontierTile(tile, world, ownerIndex));
    const fortCandidates = frontierTiles.length
      ? frontierTiles
      : ownedTiles.filter((tile) => tile.index !== capital.index && (isCoastal(tile, world) || tile.defense > 0));
    const fortCount = Math.min(5, Math.max(1, Math.round(nation.tileCount / 260)));
    const forts = takeSpacedObjectTiles(
      fortCandidates.length ? fortCandidates : ownedTiles,
      fortCount,
      world,
      occupied,
      Math.max(GENERATED_OBJECT_MIN_DISTANCE, Math.round(Math.min(world.width, world.height) / 28)),
      (tile) => (isFrontierTile(tile, world, ownerIndex) ? 80 : 0)
        + tile.defense * 18 + tile.movementCost * 4 + tile.resourcePotential.mineral * 8
        + hashUnit(seed, nation.index, tile.index, "fort") * 4,
      blocked,
    );
    forts.forEach((tile, index) => {
      const direction = frontierDirection(tile, capital, world);
      objects.push({
        id: `${nation.id}-fort-${index + 1}`,
        type: "fort",
        typeName: GENERATED_WORLD_OBJECT_TYPES.fort.name,
        nationId: nation.id,
        tileIndex: tile.index,
        x: tile.x,
        y: tile.y,
        name: `${nation.shortName}${direction}${forts.filter((other) => frontierDirection(other, capital, world) === direction).length > 1 ? index + 1 : ""}砦`,
        importance: 2,
        regionId: regions.find((region) => region.tileIndices.includes(tile.index))?.id ?? null,
      });
    });
  }

  return objects;
}

class RoadSearchHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= item.priority) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop() {
    if (this.items.length === 1) return this.items.pop();
    const root = this.items[0];
    const tail = this.items.pop();
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;
      const child = right < this.items.length && this.items[right].priority < this.items[left].priority ? right : left;
      if (this.items[child].priority >= tail.priority) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = tail;
    return root;
  }

  get length() {
    return this.items.length;
  }
}

function roadTraversalCost(tile) {
  return 1
    + Math.max(0, (tile.movementCost ?? 1) - 1) * 0.34
    + (tile.relief === "mountains" ? 0.72 : tile.relief === "hills" ? 0.18 : 0)
    + (tile.feature === "marsh" ? 0.9 : 0)
    + (tile.riverId ? 0.24 : 0);
}

function findRoadPath(world, startIndex, endIndex, allowedTileIndices) {
  if (startIndex === endIndex) return [startIndex];
  const allowed = allowedTileIndices instanceof Set ? allowedTileIndices : new Set(allowedTileIndices);
  const costs = new Float64Array(world.tiles.length);
  costs.fill(Number.POSITIVE_INFINITY);
  const previous = new Int32Array(world.tiles.length);
  previous.fill(-1);
  const open = new RoadSearchHeap();
  costs[startIndex] = 0;
  open.push({ index: startIndex, priority: 0 });
  while (open.length) {
    const current = open.pop();
    if (current.index === endIndex) break;
    const currentTile = world.tiles[current.index];
    const expectedPriority = costs[current.index] + gridDistance(currentTile, world.tiles[endIndex], world);
    if (current.priority > expectedPriority + 1e-9) continue;
    for (const neighborIndex of cardinalNeighbors(current.index, world)) {
      if (!allowed.has(neighborIndex) && neighborIndex !== endIndex) continue;
      const neighbor = world.tiles[neighborIndex];
      if (!isLand(neighbor)) continue;
      const nextCost = costs[current.index] + roadTraversalCost(neighbor);
      if (nextCost >= costs[neighborIndex] - 1e-9) continue;
      costs[neighborIndex] = nextCost;
      previous[neighborIndex] = current.index;
      open.push({
        index: neighborIndex,
        priority: nextCost + gridDistance(neighbor, world.tiles[endIndex], world),
      });
    }
  }
  if (previous[endIndex] < 0) return [];
  const path = [endIndex];
  while (path.at(-1) !== startIndex) path.push(previous[path.at(-1)]);
  return path.reverse();
}

function featureRunsOnRoad(world, tileIndices, type) {
  const matches = (tile) => type === "mountain" ? tile.relief === "mountains" : Boolean(tile.riverId);
  const runs = [];
  for (let offset = 1; offset < tileIndices.length - 1; offset += 1) {
    if (!matches(world.tiles[tileIndices[offset]])) continue;
    const startOffset = offset;
    while (offset + 1 < tileIndices.length - 1 && matches(world.tiles[tileIndices[offset + 1]])) offset += 1;
    const endOffset = offset;
    if (startOffset > 0 && endOffset < tileIndices.length - 1) {
      runs.push({
        type,
        startOffset,
        endOffset,
        approachTileIndex: tileIndices[startOffset - 1],
        departureTileIndex: tileIndices[endOffset + 1],
      });
    }
  }
  return runs;
}

function buildRegionalRoadNetwork(world, regions, objects) {
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const regionById = new Map(regions.map((region) => [region.id, region]));
  const regionTileSets = new Map(regions.map((region) => [region.id, new Set(region.tileIndices)]));
  const hubs = new Map();
  for (const region of regions) {
    const local = objects.filter((object) => object.regionId === region.id);
    const hub = local.find((object) => object.type === "castle")
      ?? local.find((object) => object.regionSeat)
      ?? [...local].sort((left, right) => right.importance - left.importance || left.id.localeCompare(right.id))[0];
    if (hub) hubs.set(region.id, hub);
  }
  const roads = [];
  const edgeKeys = new Set();
  const addRoad = (from, to, scope, regionIds) => {
    if (!from || !to || from.id === to.id) return;
    const key = [from.id, to.id].sort().join("|");
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    const allowedTileIndices = new Set(regionIds.flatMap((regionId) => [...(regionTileSets.get(regionId) ?? [])]));
    const tileIndices = findRoadPath(world, from.tileIndex, to.tileIndex, allowedTileIndices);
    if (!tileIndices.length) return;
    const strategicCrossings = [
      ...featureRunsOnRoad(world, tileIndices, "mountain"),
      ...featureRunsOnRoad(world, tileIndices, "river"),
    ].map((crossing, index) => ({ ...crossing, id: `road-${roads.length + 1}-crossing-${index + 1}` }));
    roads.push({
      id: `road-${roads.length + 1}`,
      fromObjectId: from.id,
      toObjectId: to.id,
      fromTileIndex: from.tileIndex,
      toTileIndex: to.tileIndex,
      regionIds: [...regionIds],
      nationIds: [...new Set([from.nationId, to.nationId])],
      scope,
      importance: from.type === "castle" || to.type === "castle" || from.type === "city" || to.type === "city" ? 3 : 2,
      tileIndices,
      crossingKinds: [...new Set(strategicCrossings.map((crossing) => crossing.type))],
      strategicCrossings,
    });
  };
  for (const region of regions) {
    const hub = hubs.get(region.id);
    objects.filter((object) => object.regionId === region.id && object.id !== hub?.id)
      .forEach((object) => addRoad(hub, object, "local", [region.id]));
  }
  for (const region of regions) {
    for (const neighborId of region.neighborIds) {
      if (region.id.localeCompare(neighborId) >= 0) continue;
      const neighbor = regionById.get(neighborId);
      addRoad(hubs.get(region.id), hubs.get(neighborId), region.nationId === neighbor?.nationId ? "regional" : "frontier", [region.id, neighborId]);
    }
  }
  return {
    roads,
    hubObjectIds: Object.fromEntries([...hubs].map(([regionId, object]) => [regionId, object.id])),
    objectById,
  };
}

function settlementTargetCount(region) {
  return Math.min(6, Math.max(region.capital ? 4 : 2, Math.round(region.tileCount / 55) + 2));
}

function allocateRoadsideVillageQuotas(nations, regions, objects, trunkRoads, seed) {
  const quotas = new Map();
  for (const nation of nations) {
    let remaining = Math.max(0, nation.initialVillageLimit - objects.filter((object) => (
      object.nationId === nation.id && object.settlementLevel === "village"
    )).length);
    const candidates = regions.filter((region) => region.nationId === nation.id)
      .map((region) => {
        const localSettlementCount = objects.filter((object) => object.regionId === region.id && object.settlementLevel).length;
        const hasRoad = trunkRoads.some((road) => road.regionIds.includes(region.id));
        return {
          region,
          capacity: hasRoad ? Math.max(0, settlementTargetCount(region) - localSettlementCount) : 0,
          order: hashUnit(seed, nation.index, region.index, "village-quota-order"),
        };
      })
      .filter((entry) => entry.capacity > 0)
      .sort((left, right) => left.order - right.order || left.region.index - right.region.index);
    while (remaining > 0) {
      let allocated = false;
      for (const entry of candidates) {
        const current = quotas.get(entry.region.id) ?? 0;
        if (current >= entry.capacity || remaining <= 0) continue;
        quotas.set(entry.region.id, current + 1);
        remaining -= 1;
        allocated = true;
      }
      if (!allocated) break;
    }
  }
  return quotas;
}

function roadDistanceForTile(tile, roadTileIndices, world) {
  let distance = Number.POSITIVE_INFINITY;
  for (const index of roadTileIndices) {
    distance = Math.min(distance, gridDistance(tile, world.tiles[index], world));
    if (distance === 0) break;
  }
  return distance;
}

function buildRoadsideSettlements(world, nations, regions, objects, trunkRoads, seed, reservedTileIndices = new Set()) {
  const added = [];
  const occupied = new Set(objects.map((object) => object.tileIndex));
  const blocked = new Set(reservedTileIndices);
  const villageQuotas = allocateRoadsideVillageQuotas(nations, regions, objects, trunkRoads, seed);
  for (const region of regions) {
    const nation = nations.find((candidate) => candidate.id === region.nationId);
    const urbanCenter = objects.find((object) => object.regionId === region.id && object.regionSeat);
    if (!nation || !urbanCenter) continue;
    const urbanTile = world.tiles[urbanCenter.tileIndex];
    const localSettlements = objects.filter((object) => object.regionId === region.id && object.settlementLevel);
    const missing = Math.min(
      villageQuotas.get(region.id) ?? 0,
      Math.max(0, settlementTargetCount(region) - localSettlements.length),
    );
    if (!missing) continue;
    const roadTileIndices = [...new Set(trunkRoads
      .filter((road) => road.regionIds.includes(region.id))
      .flatMap((road) => road.tileIndices)
      .filter((index) => region.tileIndices.includes(index)))];
    if (!roadTileIndices.length) continue;
    const regionTiles = region.tileIndices.map((index) => world.tiles[index]);
    const viable = regionTiles.filter((tile) => (
      tile.relief !== "mountains"
      && tile.feature !== "marsh"
      && tile.settlementScore > 0
      && roadDistanceForTile(tile, roadTileIndices, world) <= ROADSIDE_SETTLEMENT_MAX_OFFSET
    ));
    const stemOffset = Math.floor(hashUnit(seed, nation.index, region.index, "settlement-names") * VILLAGE_NAME_STEMS.length);
    for (let localIndex = 0; localIndex < missing; localIndex += 1) {
      const desiredRadius = (localIndex + 1) * SETTLEMENT_EXPANSION_WAVE_TILES;
      const candidates = viable.filter((tile) => gridDistance(tile, urbanTile, world) <= desiredRadius + SETTLEMENT_EXPANSION_WAVE_TILES);
      const selected = takeSpacedObjectTiles(
        candidates,
        1,
        world,
        occupied,
        GENERATED_OBJECT_MIN_DISTANCE,
        (tile) => {
          const urbanDistance = gridDistance(tile, urbanTile, world);
          const roadsideDistance = roadDistanceForTile(tile, roadTileIndices, world);
          return tile.settlementScore * 2.4 + tile.yields.food * 9 + tile.freshwater * 15
            - tile.floodRisk * 12 - tile.movementCost * 2
            - roadsideDistance * 24
            - Math.abs(urbanDistance - desiredRadius) * 5
            + hashUnit(seed, region.index, tile.index, "roadside-settlement") * 6;
        },
        blocked,
      )[0];
      if (!selected) continue;
      const settlementNumber = localSettlements.filter((object) => object.id.startsWith(`${region.id}-settlement-`)).length + added.filter((object) => object.regionId === region.id).length + 1;
      const population = settlementPopulation(selected, seed, nation, region, settlementNumber - 1, "village");
      const settlementLevel = settlementLevelForPopulation(population);
      const stemIndex = stemOffset + settlementNumber - 1;
      const stem = VILLAGE_NAME_STEMS[stemIndex % VILLAGE_NAME_STEMS.length];
      const duplicateCycle = Math.floor(stemIndex / VILLAGE_NAME_STEMS.length);
      const baseName = `${nation.shortName}${stem}${duplicateCycle ? duplicateCycle + 1 : ""}`;
      const urbanDistance = gridDistance(selected, urbanTile, world);
      const roadsideDistance = roadDistanceForTile(selected, roadTileIndices, world);
      added.push({
        id: `${region.id}-settlement-${settlementNumber}`,
        type: settlementLevel,
        typeName: GENERATED_WORLD_OBJECT_TYPES[settlementLevel].name,
        settlementLevel,
        baseName,
        population,
        growthRate: Number((0.0025 + selected.yields.food * 0.00035 + selected.freshwater * 0.0012 + hashUnit(seed, selected.index, "growth") * 0.0015).toFixed(5)),
        regionSeat: false,
        capitalCity: false,
        placement: "roadside-expansion",
        expansionWave: Math.max(1, Math.ceil(urbanDistance / SETTLEMENT_EXPANSION_WAVE_TILES)),
        urbanCenterObjectId: urbanCenter.id,
        urbanDistance,
        roadsideDistance,
        nationId: nation.id,
        regionId: region.id,
        tileIndex: selected.index,
        x: selected.x,
        y: selected.y,
        name: settlementName(baseName, settlementLevel),
        importance: 1,
      });
    }
  }
  return added;
}

function buildSeaComponents(world) {
  const componentByTile = new Int32Array(world.tiles.length);
  componentByTile.fill(-1);
  let componentCount = 0;
  for (const tile of world.tiles) {
    if (!isSea(tile) || componentByTile[tile.index] >= 0) continue;
    const queue = [tile.index];
    componentByTile[tile.index] = componentCount;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const neighborIndex of cardinalNeighbors(queue[cursor], world)) {
        if (!isSea(world.tiles[neighborIndex]) || componentByTile[neighborIndex] >= 0) continue;
        componentByTile[neighborIndex] = componentCount;
        queue.push(neighborIndex);
      }
    }
    componentCount += 1;
  }
  return componentByTile;
}

function shortestSeaPath(world, fromAccess, toAccess, componentId, componentByTile) {
  const targets = new Set(toAccess.filter((index) => componentByTile[index] === componentId));
  const starts = fromAccess.filter((index) => componentByTile[index] === componentId);
  if (!starts.length || !targets.size) return null;
  const previous = new Int32Array(world.tiles.length);
  previous.fill(-2);
  const queue = new Int32Array(world.tiles.length);
  let head = 0;
  let tail = 0;
  for (const index of starts) {
    previous[index] = -1;
    queue[tail] = index;
    tail += 1;
  }
  let destination = starts.find((index) => targets.has(index)) ?? null;
  while (destination === null && head < tail) {
    const current = queue[head];
    head += 1;
    for (const neighborIndex of cardinalNeighbors(current, world)) {
      if (componentByTile[neighborIndex] !== componentId || previous[neighborIndex] !== -2) continue;
      previous[neighborIndex] = current;
      if (targets.has(neighborIndex)) {
        destination = neighborIndex;
        break;
      }
      queue[tail] = neighborIndex;
      tail += 1;
    }
  }
  if (destination === null) return null;
  const path = [];
  for (let index = destination; index >= 0; index = previous[index]) path.push(index);
  return path.reverse();
}

function buildMaritimeNetwork(world, objects) {
  const ports = objects.filter((object) => object.maritime && object.seaAccessTileIndices?.length);
  const componentByTile = buildSeaComponents(world);
  const accessByPort = new Map();
  const portsByComponent = new Map();
  for (const port of ports) {
    const components = port.seaAccessTileIndices.reduce((counts, index) => {
      const componentId = componentByTile[index];
      if (componentId >= 0) counts.set(componentId, (counts.get(componentId) ?? 0) + 1);
      return counts;
    }, new Map());
    const componentId = [...components].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0];
    if (componentId === undefined) continue;
    const access = port.seaAccessTileIndices.filter((index) => componentByTile[index] === componentId);
    accessByPort.set(port.id, { componentId, access });
    if (!portsByComponent.has(componentId)) portsByComponent.set(componentId, []);
    portsByComponent.get(componentId).push(port);
  }

  const routes = [];
  const edgeKeys = new Set();
  const addRoute = (left, right) => {
    if (!left || !right || left.id === right.id) return;
    const [from, to] = [left, right].sort((a, b) => a.id.localeCompare(b.id));
    const edgeKey = `${from.id}|${to.id}`;
    if (edgeKeys.has(edgeKey)) return;
    const fromAccess = accessByPort.get(from.id);
    const toAccess = accessByPort.get(to.id);
    if (!fromAccess || !toAccess || fromAccess.componentId !== toAccess.componentId) return;
    const seaPath = shortestSeaPath(world, fromAccess.access, toAccess.access, fromAccess.componentId, componentByTile);
    if (!seaPath) return;
    edgeKeys.add(edgeKey);
    const seaDistance = Math.max(1, seaPath.length);
    const movementCost = Math.min(8, Math.max(1, Math.ceil(seaDistance / 12)));
    const route = {
      id: `sea-route-${routes.length + 1}`,
      type: "shipping",
      name: `${from.name}―${to.name}航路`,
      fromObjectId: from.id,
      toObjectId: to.id,
      fromTileIndex: from.tileIndex,
      toTileIndex: to.tileIndex,
      pathTileIndices: [from.tileIndex, ...seaPath, to.tileIndex],
      nationIds: [...new Set([from.nationId, to.nationId])],
      regionIds: [...new Set([from.regionId, to.regionId].filter(Boolean))],
      scope: from.nationId === to.nationId ? "coastal" : "international",
      seaDistance,
      movementCost,
      travelMinutes: Math.max(6 * 60, seaDistance * 2 * 60),
    };
    routes.push(route);
    from.seaRouteIds.push(route.id);
    to.seaRouteIds.push(route.id);
  };

  for (const componentPorts of portsByComponent.values()) {
    const byNation = componentPorts.reduce((groups, port) => {
      if (!groups.has(port.nationId)) groups.set(port.nationId, []);
      groups.get(port.nationId).push(port);
      return groups;
    }, new Map());
    for (const nationPorts of byNation.values()) {
      nationPorts.sort((left, right) => left.maritimeTier - right.maritimeTier || left.id.localeCompare(right.id));
      for (let index = 1; index < nationPorts.length; index += 1) addRoute(nationPorts[index - 1], nationPorts[index]);
    }
    const ordered = [...componentPorts].sort((left, right) => right.maritimeTier - left.maritimeTier || left.id.localeCompare(right.id));
    if (ordered.length < 2) continue;
    const connected = [ordered.shift()];
    while (ordered.length) {
      const candidate = connected.flatMap((from) => ordered.map((to) => ({
        from,
        to,
        distance: gridDistance(world.tiles[from.tileIndex], world.tiles[to.tileIndex], world),
      }))).sort((left, right) => left.distance - right.distance || left.from.id.localeCompare(right.from.id) || left.to.id.localeCompare(right.to.id))[0];
      addRoute(candidate.from, candidate.to);
      connected.push(candidate.to);
      ordered.splice(ordered.indexOf(candidate.to), 1);
    }
  }
  return { routes };
}

function crossingFortSideNames(world, fromTile, toTile) {
  const dx = squareWrappedDeltaX(fromTile.x, toTile.x, world.width, world.config.wrapX);
  const dy = toTile.y - fromTile.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? ["西詰", "東詰"] : ["東詰", "西詰"];
  return dy >= 0 ? ["北詰", "南詰"] : ["南詰", "北詰"];
}

function addStrategicCrossingForts(world, regions, objects, roads, seed) {
  const occupied = new Set(objects.map((object) => object.tileIndex));
  const fortByTile = new Map(objects.filter((object) => object.type === "fort").map((fort) => [fort.tileIndex, fort]));
  const regionByTile = new Array(world.tiles.length).fill(null);
  for (const region of regions) for (const tileIndex of region.tileIndices) regionByTile[tileIndex] = region;
  const findGuardTile = (candidates, crossingType, excludedIndex = -1) => {
    const valid = (tileIndex) => {
      if (tileIndex === excludedIndex) return false;
      const tile = world.tiles[tileIndex];
      if (!isLand(tile)) return false;
      if (crossingType === "mountain" ? tile.relief === "mountains" : Boolean(tile.riverId)) return false;
      if (excludedIndex >= 0 && visualGridDistance(tile, world.tiles[excludedIndex], world) < GENERATED_OBJECT_MIN_DISTANCE) return false;
      if (!fortByTile.has(tileIndex) && [...occupied].some((index) => visualGridDistance(tile, world.tiles[index], world) < GENERATED_OBJECT_MIN_DISTANCE)) return false;
      return true;
    };
    const pathFort = candidates.find((tileIndex) => valid(tileIndex) && fortByTile.has(tileIndex));
    if (pathFort !== undefined) return pathFort;
    const pathSpace = candidates.find((tileIndex) => valid(tileIndex) && !occupied.has(tileIndex));
    if (pathSpace !== undefined) return pathSpace;
    const homeNationId = regionByTile[candidates[0]]?.nationId;
    const visited = new Set(candidates);
    let frontier = [...candidates];
    for (let radius = 0; radius < 6; radius += 1) {
      const next = [];
      for (const tileIndex of frontier) {
        for (const neighborIndex of cardinalNeighbors(tileIndex, world)) {
          if (visited.has(neighborIndex) || regionByTile[neighborIndex]?.nationId !== homeNationId) continue;
          visited.add(neighborIndex);
          next.push(neighborIndex);
        }
      }
      const nearbyFort = next.find((tileIndex) => valid(tileIndex) && fortByTile.has(tileIndex));
      if (nearbyFort !== undefined) return nearbyFort;
      const nearbySpace = next.find((tileIndex) => valid(tileIndex) && !occupied.has(tileIndex));
      if (nearbySpace !== undefined) return nearbySpace;
      frontier = next;
    }
    const relaxedFort = [...visited].find((tileIndex) => tileIndex !== excludedIndex && fortByTile.has(tileIndex));
    if (relaxedFort !== undefined) return relaxedFort;
    const relaxedSpace = [...visited].find((tileIndex) => valid(tileIndex) && !occupied.has(tileIndex));
    if (relaxedSpace !== undefined) return relaxedSpace;
    return undefined;
  };
  const added = [];
  for (const road of roads) {
    for (const crossing of road.strategicCrossings) {
      crossing.guardFortIds = [];
      if (hashUnit(seed, road.id, crossing.id, "paired-crossing-forts") >= STRATEGIC_CROSSING_FORT_PROBABILITY) continue;
      const approachCandidates = road.tileIndices.slice(0, crossing.startOffset).reverse();
      const departureCandidates = road.tileIndices.slice(crossing.endOffset + 1);
      const approachTileIndex = findGuardTile(approachCandidates, crossing.type);
      const departureTileIndex = findGuardTile(departureCandidates, crossing.type, approachTileIndex);
      if (approachTileIndex === undefined || departureTileIndex === undefined) continue;
      const tiles = [world.tiles[approachTileIndex], world.tiles[departureTileIndex]];
      const sideNames = crossingFortSideNames(world, tiles[0], tiles[1]);
      const pairId = `${road.id}-${crossing.type}-guard-${crossing.startOffset}`;
      const pair = tiles.map((tile, sideIndex) => {
        const existing = fortByTile.get(tile.index);
        if (existing) return existing;
        const region = regionByTile[tile.index];
        const fort = {
          id: `${pairId}-${sideIndex + 1}`,
          type: "fort",
          typeName: GENERATED_WORLD_OBJECT_TYPES.fort.name,
          nationId: region.nationId,
          regionId: region.id,
          tileIndex: tile.index,
          x: tile.x,
          y: tile.y,
          name: `${region.name}${crossing.type === "mountain" ? "峠" : "渡河点"}${sideNames[sideIndex]}砦`,
          importance: 2,
          guardSide: sideIndex === 0 ? "approach" : "departure",
        };
        occupied.add(fort.tileIndex);
        fortByTile.set(fort.tileIndex, fort);
        objects.push(fort);
        added.push(fort);
        return fort;
      });
      pair.forEach((fort) => {
        fort.strategicGuard = true;
        fort.guardedRoadIds = [...new Set([...(fort.guardedRoadIds ?? []), road.id])];
        fort.guardedCrossingIds = [...new Set([...(fort.guardedCrossingIds ?? []), crossing.id])];
        fort.guardedCrossingTypes = [...new Set([...(fort.guardedCrossingTypes ?? []), crossing.type])];
        fort.pairedFortIds = [...new Set([...(fort.pairedFortIds ?? []), ...pair.filter((other) => other.id !== fort.id).map((other) => other.id)])];
      });
      crossing.guardFortIds = pair.map((fort) => fort.id);
    }
  }
  return added;
}

function governmentFor(stats, archetype) {
  if (archetype.id === "dwarf") return { government: "坑道都市連邦", suffix: "坑道国" };
  if (archetype.id === "beastfolk") return { government: "森林氏族同盟", suffix: "氏族同盟" };
  if (archetype.id === "elf") return { government: "森王庭連合", suffix: "森王国" };
  if (archetype.id === "lizardman") return { government: "水郷氏族連合", suffix: "河国" };
  if (archetype.id === "goblin") return { government: "工房集落評議会", suffix: "工房国" };
  if (archetype.id === "giant") return { government: "高峰氏族領", suffix: "峰国" };
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
  const meanNationSize = world.summary.landTiles / Math.max(1, seeds.length);
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
    const government = governmentFor(stats, entry.archetype);
    const nationLevel = nationLevelForTerritory(tiles.length, meanNationSize);
    const villageLimitBase = NATION_LEVEL_VILLAGE_BASELINES[nationLevel];
    const initialVillageLimit = initialVillageLimitForNationLevel(nationLevel, seed, index);
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
      peopleId: entry.archetype.id,
      peopleName: entry.archetype.name,
      backgroundHabitats: [...entry.archetype.backgroundHabitats],
      preferredHabitats: [...entry.archetype.preferredHabitats],
      settlementStyle: entry.archetype.settlementStyle,
      nationLevel,
      villageLimitBase,
      initialVillageLimit,
      capitalIndex: entry.tile.index,
      capital: {
        x: entry.tile.x,
        y: entry.tile.y,
        suitability: Math.round(entry.score),
        habitatMatch: Number(entry.affinity.toFixed(3)),
        terrain: entry.tile.terrain,
        relief: entry.tile.relief,
        feature: entry.tile.feature,
        templateId: entry.tile.terrainTemplateId ?? null,
      },
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
        const frontier = naturalFrontierBetween(tile, east);
        segments.push({ x1: tile.x + 1, y1: tile.y, x2: tile.x + 1, y2: tile.y + 1, nations: [nations[ownerIndex[tile.index]].id, nations[ownerIndex[east.index]].id], frontierType: frontier.type, naturalStrength: Number(frontier.strength.toFixed(3)), natural: frontier.natural, followsRiver: frontier.followsRiver });
      }
    }
    if (tile.y + 1 < world.height) {
      const south = world.tiles[squareTileIndex(tile.x, tile.y + 1, world.width)];
      if (isLand(south) && ownerIndex[tile.index] !== ownerIndex[south.index]) {
        const frontier = naturalFrontierBetween(tile, south);
        segments.push({ x1: tile.x, y1: tile.y + 1, x2: tile.x + 1, y2: tile.y + 1, nations: [nations[ownerIndex[tile.index]].id, nations[ownerIndex[south.index]].id], frontierType: frontier.type, naturalStrength: Number(frontier.strength.toFixed(3)), natural: frontier.natural, followsRiver: frontier.followsRiver });
      }
    }
  }
  for (const segment of segments) {
    const key = [...segment.nations].sort().join(":");
    shared.set(key, (shared.get(key) ?? 0) + 1);
  }
  return { segments, sharedBorderLengths: Object.fromEntries([...shared].sort()) };
}

function ownedComponents(world, ownerIndex, nationIndex) {
  const remaining = new Set(world.tiles.filter((tile) => ownerIndex[tile.index] === nationIndex).map((tile) => tile.index));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    const queue = [first];
    const tileIndices = [];
    remaining.delete(first);
    while (queue.length) {
      const index = queue.shift();
      tileIndices.push(index);
      for (const neighborIndex of cardinalNeighbors(index, world)) {
        if (!remaining.has(neighborIndex)) continue;
        remaining.delete(neighborIndex);
        queue.push(neighborIndex);
      }
    }
    components.push(tileIndices.sort((left, right) => left - right));
  }
  return components.sort((left, right) => right.length - left.length || left[0] - right[0]);
}

function chooseRegionSeeds(world, nation, ownerIndex, targetTileCount) {
  const components = ownedComponents(world, ownerIndex, nation.index);
  const ownedTileCount = components.reduce((sum, component) => sum + component.length, 0);
  const minimumAdministrativeRegions = ownedTileCount >= 2 ? 2 : 1;
  const targetCount = Math.max(components.length, Math.min(12, Math.max(minimumAdministrativeRegions, Math.ceil(ownedTileCount / targetTileCount))));
  const componentByTile = new Map(components.flatMap((component, componentIndex) => component.map((index) => [index, componentIndex])));
  const seeds = components.map((component) => {
    const capitalIndex = component.includes(nation.capitalIndex) ? nation.capitalIndex : null;
    return capitalIndex ?? [...component].sort((left, right) => (
      world.tiles[right].settlementScore - world.tiles[left].settlementScore || left - right
    ))[0];
  });
  const selected = new Set(seeds);
  while (seeds.length < targetCount) {
    const candidate = components.flatMap((component) => component).filter((index) => !selected.has(index)).reduce((winner, index) => {
      const tile = world.tiles[index];
      const componentIndex = componentByTile.get(index);
      const localSeeds = seeds.filter((seedIndex) => componentByTile.get(seedIndex) === componentIndex);
      const spacing = Math.min(...localSeeds.map((seedIndex) => gridDistance(tile, world.tiles[seedIndex], world)));
      const score = spacing * 1000 + tile.settlementScore + tile.freshwater * 10;
      return !winner || score > winner.score || (score === winner.score && index < winner.index) ? { index, score } : winner;
    }, null);
    if (!candidate) break;
    seeds.push(candidate.index);
    selected.add(candidate.index);
  }
  return seeds;
}

function dominantValue(tiles, key) {
  const counts = new Map();
  for (const tile of tiles) counts.set(tile[key] ?? "none", (counts.get(tile[key] ?? "none") ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))[0]?.[0] ?? null;
}

function buildLandDepths(world) {
  const depths = new Int16Array(world.tiles.length);
  depths.fill(-1);
  const queue = [];
  for (const tile of world.tiles) {
    if (isLand(tile)) continue;
    depths[tile.index] = 0;
    queue.push(tile.index);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    for (const neighborIndex of cardinalNeighbors(index, world)) {
      if (depths[neighborIndex] >= 0) continue;
      depths[neighborIndex] = depths[index] + 1;
      queue.push(neighborIndex);
    }
  }
  return depths;
}

function buildRegions(world, nations, ownerIndex, seed, targetTileCount = GENERATED_REGION_TARGET_TILES) {
  const regionSeeds = [];
  for (const nation of nations) {
    chooseRegionSeeds(world, nation, ownerIndex, targetTileCount).forEach((tileIndex, localIndex) => {
      regionSeeds.push({
        index: regionSeeds.length,
        id: `region-${nation.index + 1}-${localIndex + 1}`,
        nationId: nation.id,
        nationIndex: nation.index,
        localIndex,
        tileIndex,
      });
    });
  }

  const regionIndexByTile = Array(world.tiles.length).fill(-1);
  const bestCost = new Float64Array(world.tiles.length);
  bestCost.fill(Number.POSITIVE_INFINITY);
  const heap = new MinHeap();
  for (const region of regionSeeds) {
    regionIndexByTile[region.tileIndex] = region.index;
    bestCost[region.tileIndex] = 0;
    heap.push({ index: region.tileIndex, regionIndex: region.index, cost: 0 });
  }
  while (heap.items.length) {
    const current = heap.pop();
    if (current.cost > bestCost[current.index] + 1e-9 || regionIndexByTile[current.index] !== current.regionIndex) continue;
    const region = regionSeeds[current.regionIndex];
    for (const neighborIndex of cardinalNeighbors(current.index, world)) {
      if (ownerIndex[neighborIndex] !== region.nationIndex) continue;
      const tile = world.tiles[neighborIndex];
      const variation = hashUnit(seed, current.regionIndex, neighborIndex, "region") * 0.22;
      const nextCost = current.cost + Math.max(1, tile.movementCost) + variation;
      const existingRegion = regionIndexByTile[neighborIndex];
      if (nextCost > bestCost[neighborIndex] + 1e-9) continue;
      if (Math.abs(nextCost - bestCost[neighborIndex]) <= 1e-9 && existingRegion >= 0 && existingRegion < current.regionIndex) continue;
      bestCost[neighborIndex] = nextCost;
      regionIndexByTile[neighborIndex] = current.regionIndex;
      heap.push({ index: neighborIndex, regionIndex: current.regionIndex, cost: nextCost });
    }
  }

  const landDepths = buildLandDepths(world);
  const regions = regionSeeds.map((seedEntry) => {
    const nation = nations[seedEntry.nationIndex];
    const tiles = world.tiles.filter((tile) => regionIndexByTile[tile.index] === seedEntry.index);
    const capital = tiles.some((tile) => tile.index === nation.capitalIndex);
    const anchor = capital ? world.tiles[nation.capitalIndex] : [...tiles].sort((left, right) => (
      right.settlementScore - left.settlementScore || left.index - right.index
    ))[0];
    const markerTiles = tiles.filter((tile) => tile.index !== nation.capitalIndex);
    const marker = [...(markerTiles.length ? markerTiles : tiles)].sort((left, right) => (
      landDepths[right.index] - landDepths[left.index]
      || right.settlementScore - left.settlementScore
      || gridDistance(left, anchor, world) - gridDistance(right, anchor, world)
      || left.index - right.index
    ))[0];
    const nationRegionCount = regionSeeds.filter((candidate) => candidate.nationId === nation.id).length;
    const stemOffset = Math.floor(hashUnit(seed, nation.index, "region-names") * REGION_NAME_STEMS.length);
    const stem = nationRegionCount === 1 ? "" : REGION_NAME_STEMS[(stemOffset + seedEntry.localIndex) % REGION_NAME_STEMS.length];
    const averageMovementCost = tiles.reduce((sum, tile) => sum + Math.max(1, tile.movementCost), 0) / Math.max(1, tiles.length);
    return {
      id: seedEntry.id,
      index: seedEntry.index,
      nationId: nation.id,
      name: `${nation.shortName}${stem}地方`,
      capital,
      anchorIndex: anchor.index,
      anchorLandDepth: landDepths[anchor.index],
      markerIndex: marker.index,
      markerLandDepth: landDepths[marker.index],
      tileIndices: tiles.map((tile) => tile.index),
      tileCount: tiles.length,
      dominantTerrain: dominantValue(tiles, "terrain"),
      dominantRelief: dominantValue(tiles, "relief"),
      meanFertility: Number((tiles.reduce((sum, tile) => sum + tile.fertility, 0) / Math.max(1, tiles.length)).toFixed(1)),
      movementCost: Math.max(1, Math.ceil(averageMovementCost)),
      neighborIds: [],
    };
  });
  const tileRegionIds = regionIndexByTile.map((regionIndex, tileIndex) => (
    isLand(world.tiles[tileIndex]) && regionIndex >= 0 ? regions[regionIndex].id : null
  ));
  const regionById = new Map(regions.map((region) => [region.id, region]));
  for (const tile of world.tiles.filter(isLand)) {
    const region = regionById.get(tileRegionIds[tile.index]);
    for (const neighborIndex of cardinalNeighbors(tile.index, world)) {
      const neighborRegionId = tileRegionIds[neighborIndex];
      if (neighborRegionId && neighborRegionId !== region.id && !region.neighborIds.includes(neighborRegionId)) region.neighborIds.push(neighborRegionId);
    }
  }
  regions.forEach((region) => region.neighborIds.sort());
  return { regions, tileRegionIds };
}

function buildRegionBorders(world, tileRegionIds, regions) {
  const segments = [];
  for (const tile of world.tiles.filter(isLand)) {
    const eastX = (tile.x + 1) % world.width;
    if (world.config.wrapX || tile.x + 1 < world.width) {
      const east = world.tiles[squareTileIndex(eastX, tile.y, world.width)];
      if (isLand(east) && tileRegionIds[tile.index] !== tileRegionIds[east.index]) {
        const regionIds = [tileRegionIds[tile.index], tileRegionIds[east.index]];
        segments.push({ x1: tile.x + 1, y1: tile.y, x2: tile.x + 1, y2: tile.y + 1, regions: regionIds, national: regions.find((region) => region.id === regionIds[0])?.nationId !== regions.find((region) => region.id === regionIds[1])?.nationId });
      }
    }
    if (tile.y + 1 < world.height) {
      const south = world.tiles[squareTileIndex(tile.x, tile.y + 1, world.width)];
      if (isLand(south) && tileRegionIds[tile.index] !== tileRegionIds[south.index]) {
        const regionIds = [tileRegionIds[tile.index], tileRegionIds[south.index]];
        segments.push({ x1: tile.x, y1: tile.y + 1, x2: tile.x + 1, y2: tile.y + 1, regions: regionIds, national: regions.find((region) => region.id === regionIds[0])?.nationId !== regions.find((region) => region.id === regionIds[1])?.nationId });
      }
    }
  }
  return segments;
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
    if (isLand(tile) && !nationWorld.tileRegionIds?.[tile.index]) issues.push(`Land tile ${tile.index} has no region.`);
    if (!isLand(tile) && nationWorld.tileRegionIds?.[tile.index]) issues.push(`Water tile ${tile.index} belongs to a region.`);
  }
  for (const nation of nationWorld.nations) {
    if (nationWorld.tileNationIds[nation.capitalIndex] !== nation.id) issues.push(`${nation.name} does not own its capital.`);
    if (nation.tileCount < 1) issues.push(`${nation.name} has no territory.`);
    if (!nation.peopleId || !nation.settlementStyle) issues.push(`${nation.name} has no people or settlement background.`);
    if (!(nation.capital.habitatMatch >= 0 && nation.capital.habitatMatch <= 1)) issues.push(`${nation.name} has an invalid capital habitat match.`);
    const castles = (nationWorld.objects ?? []).filter((object) => object.nationId === nation.id && object.type === "castle");
    if (castles.length !== 1 || castles[0]?.tileIndex !== nation.capitalIndex) issues.push(`${nation.name} has no castle on its capital tile.`);
    if (!nation.regionIds?.length) issues.push(`${nation.name} is not composed of any regions.`);
    if (nation.tileCount >= 2 && nation.regionIds?.length < 2) issues.push(`${nation.name} is not divided into multiple administrative regions.`);
    if (!nation.regionIds?.includes(nation.capitalRegionId)) issues.push(`${nation.name} has no capital region.`);
    const cities = (nationWorld.objects ?? []).filter((object) => object.nationId === nation.id && object.settlementLevel === "city");
    if (!cities.length) issues.push(`${nation.name} has no city-level settlement.`);
    const villageBaseline = NATION_LEVEL_VILLAGE_BASELINES[nation.nationLevel];
    const minimumVillageLimit = villageBaseline
      ? Math.max(1, Math.ceil(villageBaseline * NATION_VILLAGE_LIMIT_MINIMUM_SHARE))
      : Number.POSITIVE_INFINITY;
    const villages = (nationWorld.objects ?? []).filter((object) => object.nationId === nation.id && object.settlementLevel === "village");
    if (!villageBaseline || nation.villageLimitBase !== villageBaseline) issues.push(`${nation.name} has an invalid nation-level village baseline.`);
    if (nation.initialVillageLimit < minimumVillageLimit || nation.initialVillageLimit > villageBaseline) issues.push(`${nation.name} has an invalid randomized village limit.`);
    if (villages.length !== nation.initialVillageCount || villages.length > nation.initialVillageLimit) issues.push(`${nation.name} exceeds its initial village limit.`);
  }
  for (const region of nationWorld.regions ?? []) {
    if (!region.tileIndices.length) issues.push(`${region.name} has no territory.`);
    if (!region.tileIndices.includes(region.markerIndex)) issues.push(`${region.name} has no marker inside its territory.`);
    if (!isLand(world.tiles[region.markerIndex])) issues.push(`${region.name} has a marker outside playable land.`);
    if (!region.tileIndices.every((index) => nationWorld.tileRegionIds[index] === region.id)) issues.push(`${region.name} has inconsistent tile membership.`);
    if (!region.tileIndices.every((index) => nationWorld.tileNationIds[index] === region.nationId)) issues.push(`${region.name} crosses a national boundary.`);
    if (region.neighborIds.some((neighborId) => !(nationWorld.regions ?? []).some((candidate) => candidate.id === neighborId))) issues.push(`${region.name} has an invalid neighbor.`);
    if (!region.officeTitle) issues.push(`${region.name} has no regional lordship office.`);
    if (region.settlementIds?.length && !region.roadHubObjectId) issues.push(`${region.name} has settlements but no road hub.`);
  }
  const objectIds = new Set();
  for (const object of nationWorld.objects ?? []) {
    if (objectIds.has(object.id)) issues.push(`World object id ${object.id} is duplicated.`);
    objectIds.add(object.id);
    if (!GENERATED_WORLD_OBJECT_TYPES[object.type]) issues.push(`World object ${object.id} has an invalid type.`);
    const tile = world.tiles[object.tileIndex];
    if (!tile || !isLand(tile)) issues.push(`World object ${object.id} is not placed on land.`);
    if (tile && nationWorld.tileNationIds[object.tileIndex] !== object.nationId) issues.push(`World object ${object.id} is outside its nation.`);
    if (object.settlementLevel && (object.settlementLevel !== settlementLevelForPopulation(object.population) || !object.baseName)) issues.push(`Settlement ${object.id} has an invalid population level.`);
    if (object.maritime && (!MARITIME_OBJECT_TYPES.has(object.type) || !tile || !isCoastal(tile, world) || !object.seaAccessTileIndices?.length)) issues.push(`Maritime settlement ${object.id} has no valid sea access.`);
    if (object.placement === "roadside-expansion" && (!(object.roadsideDistance >= 0) || object.roadsideDistance > ROADSIDE_SETTLEMENT_MAX_OFFSET || !(object.expansionWave >= 1))) {
      issues.push(`Roadside settlement ${object.id} is outside its staged road corridor.`);
    }
  }
  const worldObjects = nationWorld.objects ?? [];
  for (let left = 0; left < worldObjects.length; left += 1) {
    for (let right = left + 1; right < worldObjects.length; right += 1) {
      const leftTile = world.tiles[worldObjects[left].tileIndex];
      const rightTile = world.tiles[worldObjects[right].tileIndex];
      if (leftTile && rightTile && visualGridDistance(leftTile, rightTile, world) < GENERATED_OBJECT_MIN_DISTANCE) {
        issues.push(`World objects ${worldObjects[left].id} and ${worldObjects[right].id} do not have enough visual spacing.`);
      }
    }
  }
  for (const road of nationWorld.roads ?? []) {
    if (!objectIds.has(road.fromObjectId) || !objectIds.has(road.toObjectId)) issues.push(`Road ${road.id} has a missing endpoint.`);
    if (!world.tiles[road.fromTileIndex] || !world.tiles[road.toTileIndex]) issues.push(`Road ${road.id} has an invalid tile endpoint.`);
    if (!road.tileIndices?.length || road.tileIndices[0] !== road.fromTileIndex || road.tileIndices.at(-1) !== road.toTileIndex) {
      issues.push(`Road ${road.id} has an invalid terrain route.`);
    } else {
      if (road.tileIndices.some((index) => !isLand(world.tiles[index]))) issues.push(`Road ${road.id} crosses non-land terrain.`);
      if (road.tileIndices.slice(1).some((index, offset) => !cardinalNeighbors(road.tileIndices[offset], world).includes(index))) {
        issues.push(`Road ${road.id} contains a disconnected route step.`);
      }
    }
    for (const crossing of road.strategicCrossings ?? []) {
      if (![0, 2].includes(crossing.guardFortIds?.length ?? 0)) issues.push(`Road crossing ${crossing.id} has an incomplete fort pair.`);
      if ((crossing.guardFortIds ?? []).some((id) => !objectIds.has(id))) issues.push(`Road crossing ${crossing.id} references a missing fort.`);
    }
  }
  for (const route of nationWorld.seaRoutes ?? []) {
    const from = (nationWorld.objects ?? []).find((object) => object.id === route.fromObjectId);
    const to = (nationWorld.objects ?? []).find((object) => object.id === route.toObjectId);
    if (!from?.maritime || !to?.maritime) issues.push(`Sea route ${route.id} has a non-port endpoint.`);
    if (!route.pathTileIndices?.length || route.pathTileIndices.slice(1, -1).some((index) => !isSea(world.tiles[index]))) issues.push(`Sea route ${route.id} leaves navigable sea tiles.`);
    if (!(route.movementCost >= 1 && route.movementCost <= 8) || route.travelMinutes < 6 * 60) issues.push(`Sea route ${route.id} has invalid travel costs.`);
  }
  for (const object of nationWorld.objects ?? []) {
    if (!object.strategicGuard) continue;
    const pairs = (object.pairedFortIds ?? []).map((id) => (nationWorld.objects ?? []).find((candidate) => candidate.id === id));
    if (!object.guardedCrossingIds?.length || !pairs.length || pairs.some((pair) => !pair || !pair.pairedFortIds?.includes(object.id))) {
      issues.push(`Strategic fort ${object.id} has no valid opposite-side pair.`);
    }
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
  const requestedFrontierWeight = Number.isFinite(options.naturalFrontierWeight)
    ? Math.max(0, Number(options.naturalFrontierWeight))
    : null;
  const naturalFrontierCandidateWeights = requestedFrontierWeight === null
    ? [...NATURAL_FRONTIER_CANDIDATE_WEIGHTS]
    : [requestedFrontierWeight];
  const minCapitalDistance = options.minCapitalDistance ?? Math.max(4, Math.floor(Math.min(world.width, world.height) / Math.sqrt(count * 2.4)));
  const archetypes = Array.from({ length: count }, (_, index) => NATION_PEOPLE_ARCHETYPES[index % NATION_PEOPLE_ARCHETYPES.length]);
  const capitalEntries = selectCapitalTiles(world, archetypes, minCapitalDistance);
  const provisional = capitalEntries.map((entry, index) => ({
    id: `nation-${index + 1}`,
    index,
    capitalIndex: entry.tile.index,
    archetype: entry.archetype,
    climate: { temperatureC: entry.tile.temperatureC, precipitationMm: entry.tile.precipitationMm },
    cohesion: 0.8 + hashUnit(seed, index, "cohesion") * 1.15,
    expansionPower: 0.9 + clamp(entry.score / 220) * 0.22 + hashUnit(seed, index, "power") * 0.12,
  }));
  const territoryCandidates = naturalFrontierCandidateWeights.map((weight) => {
    const candidateOwnerIndex = assignTerritories(world, provisional, seed, weight);
    const candidateBorders = buildBorders(world, candidateOwnerIndex, provisional).segments;
    const artificialBorderCount = candidateBorders.filter((segment) => !segment.natural).length;
    return {
      weight,
      ownerIndex: candidateOwnerIndex,
      artificialBorderCount,
      artificialBorderShare: artificialBorderCount / Math.max(1, candidateBorders.length),
    };
  });
  const selectedTerritory = territoryCandidates.sort((left, right) => (
    left.artificialBorderShare - right.artificialBorderShare
    || left.artificialBorderCount - right.artificialBorderCount
    || left.weight - right.weight
  ))[0];
  const ownerIndex = selectedTerritory.ownerIndex;
  const naturalFrontierWeight = selectedTerritory.weight;
  const baseNations = buildNationRecords(world, capitalEntries, ownerIndex, seed);
  const tileNationIds = ownerIndex.map((index, tileIndex) => isLand(world.tiles[tileIndex]) ? baseNations[index].id : null);
  const regional = buildRegions(world, baseNations, ownerIndex, seed, options.regionTargetTileCount ?? 140);
  const reservedMarkerTiles = new Set(regional.regions.map((region) => region.markerIndex));
  const objects = buildWorldObjects(world, baseNations, regional.regions, ownerIndex, seed, reservedMarkerTiles).map((object) => ({
    ...object,
    regionId: object.regionId ?? regional.tileRegionIds[object.tileIndex],
  }));
  const trunkRoadNetwork = buildRegionalRoadNetwork(world, regional.regions, objects);
  objects.push(...buildRoadsideSettlements(
    world,
    baseNations,
    regional.regions,
    objects,
    trunkRoadNetwork.roads,
    seed,
    reservedMarkerTiles,
  ));
  const roadNetwork = buildRegionalRoadNetwork(world, regional.regions, objects);
  const strategicForts = addStrategicCrossingForts(world, regional.regions, objects, roadNetwork.roads, seed);
  const maritimeNetwork = buildMaritimeNetwork(world, objects);
  const regionById = new Map(regional.regions.map((region) => [region.id, region]));
  regional.regions.forEach((region) => {
    const localSettlements = objects.filter((object) => object.regionId === region.id && object.settlementLevel);
    const neighborRegions = region.neighborIds.map((id) => regionById.get(id)).filter(Boolean);
    region.frontier = neighborRegions.some((neighbor) => neighbor.nationId !== region.nationId);
    region.status = "integrated";
    region.uninhabited = localSettlements.length === 0;
    region.officeTitle = region.capital ? "王都総督" : region.frontier ? "辺境伯" : "地方伯";
    region.seatObjectId = localSettlements.find((object) => object.regionSeat)?.id ?? localSettlements[0]?.id ?? null;
    region.roadHubObjectId = roadNetwork.hubObjectIds[region.id] ?? region.seatObjectId;
    region.settlementIds = localSettlements.map((object) => object.id);
    region.portIds = objects.filter((object) => object.regionId === region.id && object.maritime).map((object) => object.id);
    region.seaRouteIds = maritimeNetwork.routes.filter((route) => route.regionIds.includes(region.id)).map((route) => route.id);
    region.population = localSettlements.reduce((sum, object) => sum + object.population, 0);
  });
  const objectsByNation = objects.reduce((groups, object) => {
    if (!groups.has(object.nationId)) groups.set(object.nationId, []);
    groups.get(object.nationId).push(object);
    return groups;
  }, new Map());
  const nations = baseNations.map((nation) => {
    const nationObjects = objectsByNation.get(nation.id) ?? [];
    const nationRegions = regional.regions.filter((region) => region.nationId === nation.id);
    const initialVillageCount = nationObjects.filter((object) => object.settlementLevel === "village").length;
    return {
      ...nation,
      regionIds: nationRegions.map((region) => region.id),
      regionCount: nationRegions.length,
      capitalRegionId: nationRegions.find((region) => region.capital)?.id ?? nationRegions[0]?.id,
      objectIds: nationObjects.map((object) => object.id),
      objectCounts: Object.fromEntries(Object.keys(GENERATED_WORLD_OBJECT_TYPES).map((type) => [type, nationObjects.filter((object) => object.type === type).length])),
      roadIds: roadNetwork.roads.filter((road) => road.nationIds.includes(nation.id)).map((road) => road.id),
      portIds: nationObjects.filter((object) => object.maritime).map((object) => object.id),
      seaRouteIds: maritimeNetwork.routes.filter((route) => route.nationIds.includes(nation.id)).map((route) => route.id),
      initialVillageCount,
      settlementPopulation: nationObjects.reduce((sum, object) => sum + (object.population ?? 0), 0),
    };
  });
  const borders = buildBorders(world, ownerIndex, nations);
  const naturalBorderSegmentCount = borders.segments.filter((segment) => segment.natural).length;
  const artificialBorderSegmentCount = borders.segments.length - naturalBorderSegmentCount;
  const frontierTypeCounts = Object.fromEntries([...borders.segments.reduce((counts, segment) => {
    counts.set(segment.frontierType, (counts.get(segment.frontierType) ?? 0) + 1);
    return counts;
  }, new Map())].sort());
  const regionBorders = buildRegionBorders(world, regional.tileRegionIds, regional.regions);
  const nationWorld = {
    version: 8,
    seed,
    config: Object.freeze({
      count,
      minCapitalDistance,
      naturalFrontierPolicy: "adaptive-preferred",
      naturalFrontierWeight,
      naturalFrontierCandidateWeights: Object.freeze(naturalFrontierCandidateWeights),
      strategicCrossingFortProbability: STRATEGIC_CROSSING_FORT_PROBABILITY,
      objectMinimumDistance: GENERATED_OBJECT_MIN_DISTANCE,
      roadsideSettlementMaxOffset: ROADSIDE_SETTLEMENT_MAX_OFFSET,
      settlementExpansionWaveTiles: SETTLEMENT_EXPANSION_WAVE_TILES,
      nationLevelBasis: "relative-territory-size",
      nationLevelVillageBaselines: NATION_LEVEL_VILLAGE_BASELINES,
      nationVillageLimitMinimumShare: NATION_VILLAGE_LIMIT_MINIMUM_SHARE,
    }),
    nations,
    regions: regional.regions,
    objects,
    roads: roadNetwork.roads,
    seaRoutes: maritimeNetwork.routes,
    tileNationIds,
    tileRegionIds: regional.tileRegionIds,
    borderSegments: borders.segments,
    regionBorderSegments: regionBorders,
    sharedBorderLengths: borders.sharedBorderLengths,
    summary: {
      nationCount: nations.length,
      regionCount: regional.regions.length,
      claimedLandTiles: tileNationIds.filter(Boolean).length,
      borderSegmentCount: borders.segments.length,
      naturalBorderSegmentCount,
      artificialBorderSegmentCount,
      naturalBorderShare: Number((naturalBorderSegmentCount / Math.max(1, borders.segments.length)).toFixed(3)),
      artificialBorderShare: Number((artificialBorderSegmentCount / Math.max(1, borders.segments.length)).toFixed(3)),
      frontierTypeCounts,
      meanNationSize: Number((landTiles / nations.length).toFixed(1)),
      largestNationId: [...nations].sort((left, right) => right.tileCount - left.tileCount)[0].id,
      objectCount: objects.length,
      objectCounts: Object.fromEntries(Object.keys(GENERATED_WORLD_OBJECT_TYPES).map((type) => [type, objects.filter((object) => object.type === type).length])),
      roadCount: roadNetwork.roads.length,
      portCount: objects.filter((object) => object.maritime).length,
      seaRouteCount: maritimeNetwork.routes.length,
      internationalSeaRouteCount: maritimeNetwork.routes.filter((route) => route.scope === "international").length,
      strategicCrossingCount: roadNetwork.roads.reduce((sum, road) => sum + road.strategicCrossings.length, 0),
      guardedStrategicCrossingCount: roadNetwork.roads.reduce((sum, road) => sum + road.strategicCrossings.filter((crossing) => crossing.guardFortIds.length === 2).length, 0),
      strategicFortCount: objects.filter((object) => object.strategicGuard).length,
      addedStrategicFortCount: strategicForts.length,
      initialVillageCount: nations.reduce((sum, nation) => sum + nation.initialVillageCount, 0),
      initialVillageLimit: nations.reduce((sum, nation) => sum + nation.initialVillageLimit, 0),
      settlementPopulation: objects.reduce((sum, object) => sum + (object.population ?? 0), 0),
      peopleCounts: Object.fromEntries([...nations.reduce((counts, nation) => {
        counts.set(nation.peopleId, (counts.get(nation.peopleId) ?? 0) + 1);
        return counts;
      }, new Map())].sort()),
    },
  };
  nationWorld.tiles = buildSquareOperationalWorld(world, nationWorld).tiles;
  const validation = validateNationWorld(world, nationWorld);
  if (!validation.valid) throw new Error(`Generated nation world is invalid:\n${validation.issues.join("\n")}`);
  return nationWorld;
}
