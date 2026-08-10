import test from "node:test";
import assert from "node:assert/strict";
import { generateTerrain } from "../src/terrain-generation.js";
import { generateNations, validateNationWorld } from "../src/nation-generation.js";
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
  assert.equal(new Set(first.nations.map((nation) => nation.name)).size, first.nations.length);
  assert.equal(validateNationWorld(world, first).valid, true);
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
    assert.notEqual(world.tiles[nation.capitalIndex].relief, "mountains");
    assert.notEqual(world.tiles[nation.capitalIndex].feature, "marsh");
  }
});

test("generated states expose geographic government, economy, population, and shared borders", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  assert.ok(politics.borderSegments.length > 0);
  assert.ok(Object.keys(politics.sharedBorderLengths).length > 0);
  for (const nation of politics.nations) {
    assert.ok(nation.government.length > 0);
    assert.ok(nation.economy.length > 0);
    assert.ok(nation.populationPotential > 0);
    assert.ok(nation.tileCount > 0);
    assert.ok(nation.meanFertility >= 0 && nation.meanFertility <= 100);
  }
});

test("terrain renderer draws colored nations, natural borders, and capital markers without letter tiles", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  const politics = generateNations(world, { count: 7 });
  const svg = renderTerrainSvg(world, { cellSize: 12, nationMap: politics, textureUrl: "./terrain-natural-texture.png" });
  assert.match(svg, /id="nationOverlay"/);
  assert.match(svg, /id="nationBorders"/);
  assert.match(svg, /id="nationCapitals"/);
  assert.match(svg, /class="nation-border/);
  assert.match(svg, /data-wrap="longitude"/);
  assert.doesNotMatch(svg, /<text\b/);
});

test("nation generator rejects invalid inputs and counts", () => {
  const world = generateTerrain(TERRAIN_OPTIONS);
  assert.throws(() => generateNations(null), /square-grid terrain/);
  assert.throws(() => generateNations(world, { count: 1 }), /between 2 and 16/);
  assert.throws(() => generateNations(world, { count: 17 }), /between 2 and 16/);
});
