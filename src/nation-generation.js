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
  village: Object.freeze({ id: "village", name: "村" }),
  fort: Object.freeze({ id: "fort", name: "砦" }),
});

const VILLAGE_NAME_STEMS = Object.freeze([
  "川辺", "森辺", "麦丘", "白樺", "石渡", "泉守",
  "高瀬", "星見", "柳原", "赤土", "霧谷", "緑野",
]);

const REGION_NAME_STEMS = Object.freeze([
  "中央", "青河", "白峰", "緑野", "霧谷", "石原", "湖畔", "森境",
  "東境", "西境", "南境", "北境", "高原", "海門", "川上", "川下",
]);

export const GENERATED_REGION_TARGET_TILES = 210;

export const NATURAL_FRONTIER_DEFAULT_WEIGHT = 30;
export const NATURAL_FRONTIER_CANDIDATE_WEIGHTS = Object.freeze([6, NATURAL_FRONTIER_DEFAULT_WEIGHT, 50]);

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

function isLand(tile) {
  return LAND_TERRAINS.has(tile.terrain);
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

function cardinalNeighbors(index, world) {
  return squareNeighborIndices(index, world, { diagonal: false });
}

function isCoastal(tile, world) {
  return cardinalNeighbors(tile.index, world).some((index) => !isLand(world.tiles[index]));
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

function takeSpacedObjectTiles(candidates, count, world, occupied, minDistance, score) {
  const ranked = candidates
    .filter((tile) => !occupied.has(tile.index))
    .map((tile) => ({ tile, score: score(tile) }))
    .sort((left, right) => right.score - left.score || left.tile.index - right.tile.index);
  const selected = [];
  const distances = [...new Set([minDistance, Math.max(1, minDistance - 1), 0])];
  for (const requiredDistance of distances) {
    for (const candidate of ranked) {
      if (selected.length >= count) break;
      if (occupied.has(candidate.tile.index)) continue;
      if (requiredDistance > 0 && [...occupied].some((index) => gridDistance(candidate.tile, world.tiles[index], world) < requiredDistance)) continue;
      selected.push(candidate.tile);
      occupied.add(candidate.tile.index);
    }
    if (selected.length >= count) break;
  }
  return selected;
}

function frontierDirection(tile, capital, world) {
  const dx = squareWrappedDeltaX(capital.x, tile.x, world.width, world.config.wrapX);
  const dy = tile.y - capital.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? "東境" : "西境";
  return dy >= 0 ? "南境" : "北境";
}

function buildWorldObjects(world, nations, ownerIndex, seed, reservedTileIndices = new Set()) {
  const occupied = new Set(reservedTileIndices);
  const objects = [];
  for (const nation of nations) {
    const capital = world.tiles[nation.capitalIndex];
    occupied.add(capital.index);
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
    });
  }

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
      Math.max(2, Math.round(Math.min(world.width, world.height) / 28)),
      (tile) => (isFrontierTile(tile, world, ownerIndex) ? 80 : 0)
        + tile.defense * 18 + tile.movementCost * 4 + tile.resourcePotential.mineral * 8
        + hashUnit(seed, nation.index, tile.index, "fort") * 4,
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
      });
    });

    const villageCount = Math.min(12, Math.max(2, Math.round(nation.tileCount / 85)));
    const viableVillages = ownedTiles.filter((tile) => (
      tile.index !== capital.index && tile.relief !== "mountains" && tile.feature !== "marsh" && tile.settlementScore > 0
    ));
    const villages = takeSpacedObjectTiles(
      viableVillages.length ? viableVillages : ownedTiles,
      villageCount,
      world,
      occupied,
      Math.max(2, Math.round(Math.min(world.width, world.height) / 32)),
      (tile) => tile.settlementScore * 2 + tile.yields.food * 8 + tile.freshwater * 12
        - tile.floodRisk * 14 - tile.movementCost * 2
        + hashUnit(seed, nation.index, tile.index, "village") * 5,
    );
    const stemOffset = Math.floor(hashUnit(seed, nation.index, "village-names") * VILLAGE_NAME_STEMS.length);
    villages.forEach((tile, index) => {
      const stem = VILLAGE_NAME_STEMS[(stemOffset + index) % VILLAGE_NAME_STEMS.length];
      objects.push({
        id: `${nation.id}-village-${index + 1}`,
        type: "village",
        typeName: GENERATED_WORLD_OBJECT_TYPES.village.name,
        nationId: nation.id,
        tileIndex: tile.index,
        x: tile.x,
        y: tile.y,
        name: `${nation.shortName}${stem}村`,
        importance: 1,
      });
    });
  }
  return objects;
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
  const targetCount = Math.max(components.length, Math.min(12, Math.max(1, Math.floor(ownedTileCount / targetTileCount))));
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
    if (!nation.regionIds?.includes(nation.capitalRegionId)) issues.push(`${nation.name} has no capital region.`);
  }
  for (const region of nationWorld.regions ?? []) {
    if (!region.tileIndices.length) issues.push(`${region.name} has no territory.`);
    if (!region.tileIndices.includes(region.markerIndex)) issues.push(`${region.name} has no marker inside its territory.`);
    if (!isLand(world.tiles[region.markerIndex])) issues.push(`${region.name} has a marker outside playable land.`);
    if (!region.tileIndices.every((index) => nationWorld.tileRegionIds[index] === region.id)) issues.push(`${region.name} has inconsistent tile membership.`);
    if (!region.tileIndices.every((index) => nationWorld.tileNationIds[index] === region.nationId)) issues.push(`${region.name} crosses a national boundary.`);
    if (region.neighborIds.some((neighborId) => !(nationWorld.regions ?? []).some((candidate) => candidate.id === neighborId))) issues.push(`${region.name} has an invalid neighbor.`);
  }
  const objectIds = new Set();
  for (const object of nationWorld.objects ?? []) {
    if (objectIds.has(object.id)) issues.push(`World object id ${object.id} is duplicated.`);
    objectIds.add(object.id);
    if (!GENERATED_WORLD_OBJECT_TYPES[object.type]) issues.push(`World object ${object.id} has an invalid type.`);
    const tile = world.tiles[object.tileIndex];
    if (!tile || !isLand(tile)) issues.push(`World object ${object.id} is not placed on land.`);
    if (tile && nationWorld.tileNationIds[object.tileIndex] !== object.nationId) issues.push(`World object ${object.id} is outside its nation.`);
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
  const regional = buildRegions(world, baseNations, ownerIndex, seed, options.regionTargetTileCount);
  const reservedMarkerTiles = new Set(regional.regions.map((region) => region.markerIndex));
  const objects = buildWorldObjects(world, baseNations, ownerIndex, seed, reservedMarkerTiles).map((object) => ({
    ...object,
    regionId: regional.tileRegionIds[object.tileIndex],
  }));
  const objectsByNation = objects.reduce((groups, object) => {
    if (!groups.has(object.nationId)) groups.set(object.nationId, []);
    groups.get(object.nationId).push(object);
    return groups;
  }, new Map());
  const nations = baseNations.map((nation) => {
    const nationObjects = objectsByNation.get(nation.id) ?? [];
    const nationRegions = regional.regions.filter((region) => region.nationId === nation.id);
    return {
      ...nation,
      regionIds: nationRegions.map((region) => region.id),
      regionCount: nationRegions.length,
      capitalRegionId: nationRegions.find((region) => region.capital)?.id ?? nationRegions[0]?.id,
      objectIds: nationObjects.map((object) => object.id),
      objectCounts: Object.fromEntries(Object.keys(GENERATED_WORLD_OBJECT_TYPES).map((type) => [type, nationObjects.filter((object) => object.type === type).length])),
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
    version: 3,
    seed,
    config: Object.freeze({ count, minCapitalDistance, naturalFrontierPolicy: "adaptive-preferred", naturalFrontierWeight, naturalFrontierCandidateWeights: Object.freeze(naturalFrontierCandidateWeights) }),
    nations,
    regions: regional.regions,
    objects,
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
