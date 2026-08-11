import test from "node:test";
import assert from "node:assert/strict";
import { generateTerrain } from "../src/terrain-generation.js";
import {
  GENERATED_OBJECT_MIN_DISTANCE,
  NATION_LEVEL_VILLAGE_BASELINES,
  NATION_VILLAGE_LIMIT_MINIMUM_SHARE,
  ROADSIDE_SETTLEMENT_MAX_OFFSET,
  generateNations,
  initialVillageLimitForNationLevel,
  nationLevelForTerritory,
  STRATEGIC_CROSSING_FORT_PROBABILITY,
  validateNationWorld,
} from "../src/nation-generation.js";
import { renderTerrainSvg } from "../src/terrain-renderer.js";

const TERRAIN_OPTIONS = { width: 48, height: 32, plateCount: 9, erosionIterations: 4, seed: "nation-polities" };

function cardinalNeighbors(index, world) {
  const tile = world.tiles[index];
  return [[1, 0], [0, 1], [-1, 0], [0, -1]].flatMap(([dx, dy]) => {
    let x = tile.x + dx;
    const y = tile.y + dy;
    if (y < 0 || y >= world.height) return [];
    if (world.config.wrapX) x = (x + world.width) % world.width;
    else if (x < 0 || x >= world.width) return [];
    return [y * world.width + x];
  });
}

test("nation generation is deterministic and claims every land tile", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const first = generateNations(world, { count: 7 });
  const second = generateNations(world, { count: 7 });
  assert.deepEqual(first, second);
  assert.equal(first.nations.length, 7);
  assert.equal(first.summary.claimedLandTiles, world.summary.landTiles);
  assert.equal(first.tiles.length, world.tiles.length);
  assert.ok(first.tiles.every((tile, index) => tile.index === index && tile.id === `tile-${tile.x}-${tile.y}`));
  assert.ok(first.tiles.filter((tile) => tile.nationId).every((tile) => tile.nationName));
  assert.ok(first.tiles.filter((tile) => tile.passable).every((tile) => tile.regionId && tile.regionName));
  assert.equal(new Set(first.nations.map((nation) => nation.name)).size, first.nations.length);
  assert.equal(validateNationWorld(world, first).valid, true);
});

test("regions are connected terrain-pixel groups and nations are sets of one or more regions", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  assert.equal(politics.summary.regionCount, politics.regions.length);
  assert.ok(politics.regions.length >= politics.nations.length);
  for (const nation of politics.nations) {
    assert.ok(nation.tileCount < 2 || nation.regionIds.length >= 2);
    assert.equal(nation.regionCount, nation.regionIds.length);
    assert.ok(nation.regionIds.includes(nation.capitalRegionId));
    assert.ok(nation.regionIds.every((regionId) => politics.regions.find((region) => region.id === regionId)?.nationId === nation.id));
  }
  for (const region of politics.regions) {
    const marker = politics.tiles[region.markerIndex];
    assert.ok(region.tileIndices.includes(region.markerIndex), `${region.name} marker must stay inside the region`);
    assert.equal(marker.regionId, region.id);
    assert.equal(marker.passable, true);
    assert.ok(region.markerLandDepth >= region.anchorLandDepth, `${region.name} marker must be at least as far inland as its generation anchor`);
    const target = new Set(region.tileIndices);
    const visited = new Set([region.tileIndices[0]]);
    const queue = [region.tileIndices[0]];
    while (queue.length) {
      for (const neighbor of cardinalNeighbors(queue.shift(), world)) {
        if (visited.has(neighbor) || !target.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    assert.equal(visited.size, region.tileIndices.length, `${region.name} must be a connected tile group`);
  }
});

test("each capital anchors a connected homeland grown through land movement costs", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  for (const nation of politics.nations) {
    const capitalLandmass = world.tiles[nation.capitalIndex].landmassId;
    const homeland = world.tiles.filter((tile) => politics.tileNationIds[tile.index] === nation.id && tile.landmassId === capitalLandmass);
    const target = new Set(homeland.map((tile) => tile.index));
    const visited = new Set([nation.capitalIndex]);
    const queue = [nation.capitalIndex];
    while (queue.length) {
      for (const neighbor of cardinalNeighbors(queue.shift(), world)) {
        if (visited.has(neighbor) || !target.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    assert.equal(visited.size, homeland.length, `${nation.name} homeland was fragmented`);
    assert.ok(nation.capital.habitatMatch >= 0.9, `${nation.peopleName} capital did not match its background habitat`);
  }
});

test("human, beastfolk, and dwarf capitals follow their background habitats", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  const byPeople = Object.fromEntries(politics.nations.map((nation) => [nation.peopleId, nation]));
  const humanCapital = world.tiles[byPeople.human.capitalIndex];
  const beastfolkCapital = world.tiles[byPeople.beastfolk.capitalIndex];
  const dwarfCapital = world.tiles[byPeople.dwarf.capitalIndex];
  assert.equal(humanCapital.relief, "flat");
  assert.ok(["plains", "grassland"].includes(humanCapital.terrain));
  assert.ok(!["forest", "rainforest", "marsh"].includes(humanCapital.feature));
  assert.ok(["forest", "rainforest"].includes(beastfolkCapital.feature));
  assert.equal(dwarfCapital.relief, "mountains");
  assert.equal(byPeople.human.settlementStyle, "平地都市");
  assert.equal(byPeople.beastfolk.settlementStyle, "森林氏族集落");
  assert.equal(byPeople.dwarf.settlementStyle, "山岳洞窟都市");
});

test("generated states expose geographic government, economy, population, and shared borders", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  assert.ok(politics.borderSegments.length > 0);
  assert.ok(Object.keys(politics.sharedBorderLengths).length > 0);
  assert.equal(politics.summary.naturalBorderSegmentCount + politics.summary.artificialBorderSegmentCount, politics.summary.borderSegmentCount);
  assert.ok(politics.borderSegments.every((segment) => segment.frontierType && typeof segment.natural === "boolean"));
  for (const nation of politics.nations) {
    assert.ok(nation.government.length > 0);
    assert.ok(nation.economy.length > 0);
    assert.ok(nation.populationPotential > 0);
    assert.ok(nation.tileCount > 0);
    assert.ok(nation.meanFertility >= 0 && nation.meanFertility <= 100);
  }
});

test("natural-frontier policy reduces artificial straight-line borders", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const unconstrained = generateNations(world, { count: 7, naturalFrontierWeight: 0 });
  const preferred = generateNations(world, { count: 7 });
  assert.equal(preferred.config.naturalFrontierPolicy, "adaptive-preferred");
  assert.ok([6, 30, 50].includes(preferred.config.naturalFrontierWeight));
  assert.deepEqual(preferred.config.naturalFrontierCandidateWeights, [6, 30, 50]);
  assert.ok(preferred.summary.naturalBorderShare > preferred.summary.artificialBorderShare);
  assert.ok(preferred.summary.artificialBorderShare < unconstrained.summary.artificialBorderShare);
});

test("every nation receives a spaced fortified urban core while small roadless regions may remain empty", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  assert.deepEqual(Object.keys(politics.summary.objectCounts).sort(), ["bay_city", "castle", "city", "fishing_port", "fort", "port", "town", "village"]);
  assert.equal(politics.summary.objectCount, politics.objects.length);
  assert.equal(new Set(politics.objects.map((object) => object.id)).size, politics.objects.length);
  for (const nation of politics.nations) {
    const objects = politics.objects.filter((object) => object.nationId === nation.id);
    const castle = objects.find((object) => object.type === "castle");
    const forts = objects.filter((object) => object.type === "fort");
    assert.equal(castle.tileIndex, nation.capitalIndex);
    assert.ok(objects.some((object) => object.settlementLevel === "city"), `${nation.name} must have a city-level urban core`);
    assert.ok(forts.filter((fort) => fort.id.startsWith(`${nation.id}-fort-`)).every((fort) => politics.tiles[fort.tileIndex].borderSides.length > 0), `${nation.name} national forts must guard a frontier`);
    assert.ok(forts.filter((fort) => fort.strategicGuard).every((fort) => fort.guardedRoadIds.length && fort.pairedFortIds.length), `${nation.name} strategic forts must guard a road crossing in pairs`);
    assert.ok(objects.every((object) => politics.tileNationIds[object.tileIndex] === nation.id));
  }
  assert.ok(politics.regions.some((region) => region.uninhabited), "a constrained world should retain at least one empty region instead of forcing overlapping icons");
  for (let left = 0; left < politics.objects.length; left += 1) {
    for (let right = left + 1; right < politics.objects.length; right += 1) {
      const a = politics.objects[left];
      const b = politics.objects[right];
      let dx = Math.abs(a.x - b.x);
      if (world.config.wrapX) dx = Math.min(dx, world.width - dx);
      assert.ok(Math.hypot(dx, a.y - b.y) >= GENERATED_OBJECT_MIN_DISTANCE, `${a.id} and ${b.id} must not overlap`);
    }
  }
});

test("nation level generates a seeded initial village maximum from its baseline", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  for (const nation of politics.nations) {
    const expectedLevel = nationLevelForTerritory(nation.tileCount, politics.summary.meanNationSize);
    const baseline = NATION_LEVEL_VILLAGE_BASELINES[expectedLevel];
    const minimum = Math.ceil(baseline * NATION_VILLAGE_LIMIT_MINIMUM_SHARE);
    const villages = politics.objects.filter((object) => object.nationId === nation.id && object.settlementLevel === "village");
    assert.equal(nation.nationLevel, expectedLevel);
    assert.equal(nation.villageLimitBase, baseline);
    assert.ok(nation.initialVillageLimit >= minimum && nation.initialVillageLimit <= baseline);
    assert.equal(nation.initialVillageCount, villages.length);
    assert.ok(villages.length <= nation.initialVillageLimit, `${nation.name} must stay below its generated initial village maximum`);
  }
  assert.equal(politics.summary.initialVillageCount, politics.nations.reduce((sum, nation) => sum + nation.initialVillageCount, 0));
  assert.equal(politics.summary.initialVillageLimit, politics.nations.reduce((sum, nation) => sum + nation.initialVillageLimit, 0));
  assert.equal(initialVillageLimitForNationLevel(5, "repeatable-limit", 2), initialVillageLimitForNationLevel(5, "repeatable-limit", 2));
  assert.ok(new Set(["limit-a", "limit-b", "limit-c", "limit-d"].map((seed) => initialVillageLimitForNationLevel(5, seed, 2))).size > 1);
});

test("coastal nations develop fishing ports into ports and bay-mouth cities linked by navigable sea routes", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  assert.ok(politics.summary.seaRouteCount > 0);
  assert.ok(politics.summary.internationalSeaRouteCount > 0);
  assert.equal(politics.summary.portCount, politics.objects.filter((object) => object.maritime).length);
  const coastalNations = politics.nations.filter((nation) => politics.objects.some((object) => object.nationId === nation.id && object.maritime));
  assert.ok(coastalNations.length > 0);
  for (const nation of coastalNations) {
    const ports = politics.objects.filter((object) => object.nationId === nation.id && object.maritime)
      .sort((left, right) => left.maritimeTier - right.maritimeTier);
    assert.ok(ports.length >= 1);
    assert.deepEqual(ports.map((port) => port.type), ["fishing_port", "port", "bay_city"].slice(0, ports.length));
    assert.deepEqual(ports.map((port) => port.settlementLevel), ["village", "town", "city"].slice(0, ports.length));
    assert.ok(ports.slice(1).every((port, index) => ports[index].harborScore <= port.harborScore));
    assert.ok(ports.every((port) => cardinalNeighbors(port.tileIndex, world).some((index) => ["ocean", "coast"].includes(world.tiles[index].terrain))));
    assert.ok(ports.every((port) => port.seaRouteIds.length > 0));
  }
  for (const route of politics.seaRoutes) {
    assert.ok(politics.objects.find((object) => object.id === route.fromObjectId)?.maritime);
    assert.ok(politics.objects.find((object) => object.id === route.toObjectId)?.maritime);
    assert.ok(route.pathTileIndices.slice(1, -1).every((index) => ["ocean", "coast"].includes(world.tiles[index].terrain)));
    assert.ok(route.pathTileIndices.slice(1).every((index, offset) => cardinalNeighbors(route.pathTileIndices[offset], world).includes(index)));
    assert.ok(route.movementCost >= 1 && route.movementCost <= 8);
    assert.ok(route.travelMinutes >= 6 * 60);
  }
});

test("roads follow land routes through mountains and rivers, with high-probability paired crossing forts", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  const mountainRoads = politics.roads.filter((road) => road.crossingKinds.includes("mountain"));
  const riverRoads = politics.roads.filter((road) => road.crossingKinds.includes("river"));
  const crossings = politics.roads.flatMap((road) => road.strategicCrossings);
  const guarded = crossings.filter((crossing) => crossing.guardFortIds.length === 2);
  assert.equal(politics.config.strategicCrossingFortProbability, STRATEGIC_CROSSING_FORT_PROBABILITY);
  assert.ok(mountainRoads.length > 0, "the generated road network must include mountain passages");
  assert.ok(riverRoads.length > 0, "the generated road network must include river crossings");
  assert.ok(guarded.length / crossings.length >= 0.45, "crossings should receive fort pairs only where hard icon clearance permits both sides");
  for (const road of politics.roads) {
    assert.equal(road.tileIndices[0], road.fromTileIndex);
    assert.equal(road.tileIndices.at(-1), road.toTileIndex);
    assert.ok(road.tileIndices.every((index) => !["ocean", "coast", "lake"].includes(world.tiles[index].terrain)));
    assert.ok(road.tileIndices.slice(1).every((index, offset) => cardinalNeighbors(road.tileIndices[offset], world).includes(index)));
    if (road.crossingKinds.includes("mountain")) assert.ok(road.tileIndices.some((index) => world.tiles[index].relief === "mountains"));
    if (road.crossingKinds.includes("river")) assert.ok(road.tileIndices.some((index) => world.tiles[index].riverId));
  }
  for (const crossing of guarded) {
    assert.equal(new Set(crossing.guardFortIds).size, 2);
    const forts = crossing.guardFortIds.map((id) => politics.objects.find((object) => object.id === id));
    assert.ok(forts.every((fort) => fort?.type === "fort" && fort.strategicGuard));
    assert.ok(forts.every((fort) => fort.guardedCrossingIds.includes(crossing.id)));
    assert.ok(forts[0].pairedFortIds.includes(forts[1].id));
    assert.ok(forts[1].pairedFortIds.includes(forts[0].id));
  }
});

test("settlements radiate from urban centers in roadside waves and leave off-road blank land", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  const roadside = politics.objects.filter((object) => object.placement === "roadside-expansion");
  assert.ok(roadside.length > 0);
  assert.ok(roadside.every((object) => object.roadsideDistance <= ROADSIDE_SETTLEMENT_MAX_OFFSET));
  assert.ok(roadside.every((object) => object.expansionWave >= 1 && object.urbanDistance > 0 && object.urbanCenterObjectId));
  const roadTiles = new Set(politics.roads.flatMap((road) => road.tileIndices));
  const occupied = new Set(politics.objects.map((object) => object.tileIndex));
  const blankOffRoadTiles = world.tiles.filter((tile) => !occupied.has(tile.index) && !roadTiles.has(tile.index) && politics.tileRegionIds[tile.index]);
  assert.ok(blankOffRoadTiles.length > politics.objects.length, "off-road terrain should remain visibly empty instead of receiving uniform settlement scatter");
});

test("terrain renderer draws colored nations, regional routes, and world-object markers without letter tiles", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  const svg = renderTerrainSvg(world, { cellSize: 12, nationMap: politics, textureUrl: "./terrain-natural-texture.png" });
  const expectedRoutes = politics.roads.length;
  assert.match(svg, /id="nationOverlay"/);
  assert.match(svg, /id="nationBorders"/);
  assert.match(svg, /id="regionBorders"/);
  assert.match(svg, /id="regionalTravelNetwork"/);
  assert.match(svg, /id="maritimeTravelNetwork"/);
  assert.match(svg, /id="regionalRoutes"/);
  assert.match(svg, /id="regionalRouteNodes"/);
  assert.equal(svg.match(/class="region-route-edge /g)?.length, expectedRoutes);
  assert.equal(svg.match(/class="region-route-node(?: |")/g)?.length, politics.regions.length);
  assert.equal(svg.match(/data-region-id="region-/g)?.length, politics.regions.length);
  assert.match(svg, /class="region-route-line"/);
  assert.match(svg, /class="region-route-node is-capital-region"/);
  assert.match(svg, /id="nationCapitals"/);
  assert.match(svg, /id="nationCities"/);
  assert.match(svg, /id="nationTowns"/);
  assert.match(svg, /id="nationVillages"/);
  assert.match(svg, /id="nationFishingPorts"/);
  assert.match(svg, /id="nationPorts"/);
  assert.match(svg, /id="nationBayCities"/);
  assert.match(svg, /id="nationForts"/);
  for (const type of ["castle", "city", "town", "village", "fishing_port", "port", "bay_city", "fort"]) assert.match(svg, new RegExp(`data-object-type="${type}"`));
  const markerScales = [...svg.matchAll(/class="world-object [^"]*"[^>]*scale\(([\d.]+)\)/g)].map((match) => Number(match[1]));
  assert.ok(markerScales.length > 0 && Math.max(...markerScales) <= 1.4, "regional icons must stay below the visual crowding limit");
  const visibleObjectId = politics.objects.find((object) => object.type === "castle").id;
  const generalizedSvg = renderTerrainSvg(world, { cellSize: 12, nationMap: politics, visibleObjectIds: new Set([visibleObjectId]) });
  assert.equal(generalizedSvg.match(/data-object-id=/g)?.length, 1, "cartographic generalization must hide non-selected settlement markers");
  assert.equal(svg.match(/class="sea-route-edge /g)?.length, politics.seaRoutes.length);
  assert.match(svg, /class="region-route-edge [^"]*has-mountain/);
  assert.match(svg, /class="region-route-edge [^"]*has-river/);
  assert.match(svg, /data-crossing-kinds="[^"]*(mountain|river)/);
  assert.match(svg, /class="nation-border/);
  assert.match(svg, /is-natural-border/);
  assert.match(svg, /is-artificial-border/);
  assert.match(svg, /data-wrap="longitude"/);
  assert.doesNotMatch(svg, /<text\b/);
});

test("nation generator rejects invalid inputs and counts", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  assert.throws(() => generateNations(null), /square-grid terrain/);
  assert.throws(() => generateNations(world, { count: 1 }), /between 2 and 16/);
  assert.throws(() => generateNations(world, { count: 17 }), /between 2 and 16/);
});
