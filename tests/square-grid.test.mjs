import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSquareOperationalWorld,
  squareGridDistance,
  squareNeighborDistance,
  squareNeighborIndices,
  squareTileCoordinates,
  squareTileIndex,
} from "../src/square-grid.js";
import { generateTerrain } from "../src/terrain-generation.js";
import { generateNations } from "../src/nation-generation.js";

test("square tile indices, coordinates, neighbors, and wrapped distances use one shared contract", () => {
  const grid = { width: 8, height: 5, wrapX: true };
  const index = squareTileIndex(7, 2, grid);
  assert.deepEqual(squareTileCoordinates(index, grid), { x: 7, y: 2 });
  const cardinal = squareNeighborIndices(index, grid, { diagonal: false });
  const all = squareNeighborIndices(index, grid);
  assert.equal(cardinal.length, 4);
  assert.equal(all.length, 8);
  assert.ok(cardinal.includes(squareTileIndex(0, 2, grid)));
  assert.equal(squareGridDistance(squareTileIndex(7, 2, grid), squareTileIndex(0, 3, grid), grid), 1);
  assert.equal(squareGridDistance(squareTileIndex(7, 2, grid), squareTileIndex(0, 3, grid), grid, { diagonal: false }), 2);
  assert.equal(squareNeighborDistance(squareTileIndex(7, 2, grid), squareTileIndex(0, 3, grid), grid), Math.SQRT2);
});

test("terrain, rivers, nations, capitals, borders, movement, yields, and resources share the same square tiles", () => {
  const world = generateTerrain({ width: 36, height: 24, plateCount: 7, erosionIterations: 3, seed: "single-square-contract" });
  const politics = generateNations(world, { count: 6 });
  const operational = buildSquareOperationalWorld(world, politics);
  assert.equal(operational.gridType, "square");
  assert.equal(operational.tiles.length, world.width * world.height);
  for (const tile of operational.tiles) {
    assert.equal(tile.index, squareTileIndex(tile.x, tile.y, operational));
    assert.ok(tile.orthogonalNeighbors.length >= 3 && tile.orthogonalNeighbors.length <= 4);
    assert.ok(tile.allNeighbors.length >= 5 && tile.allNeighbors.length <= 8);
    assert.equal(typeof tile.movementCost, "number");
    assert.equal(typeof tile.yields.food, "number");
    assert.equal(typeof tile.resourcePotential.freshwater, "number");
    if (["ocean", "coast", "lake"].includes(tile.terrain)) assert.equal(tile.passable, false);
    if (tile.flowTo >= 0) assert.ok(Number.isInteger(tile.flowTo));
    if (tile.capitalNationId) assert.equal(tile.capitalNationId, tile.nationId);
    assert.ok(tile.borderSides.every((side) => ["north", "east", "south", "west"].includes(side)));
  }
  assert.deepEqual(politics.tiles, operational.tiles);
});
