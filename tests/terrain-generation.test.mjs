import test from "node:test";
import assert from "node:assert/strict";
import {
  generateTerrain,
  selectStartLocations,
  TERRAIN_GENERATION_DEFAULTS,
  TERRAIN_TEMPLATES,
  traceRiver,
  validateTerrainWorld,
} from "../src/terrain-generation.js";
import { renderTerrainSvg } from "../src/terrain-renderer.js";

const TEST_SIZE = { width: 48, height: 32, plateCount: 9, erosionIterations: 4 };

test("production terrain defaults use the high-resolution world grid", () => {
  assert.equal(TERRAIN_GENERATION_DEFAULTS.width, 160);
  assert.equal(TERRAIN_GENERATION_DEFAULTS.height, 100);
  assert.equal(TERRAIN_GENERATION_DEFAULTS.plateCount, 22);
  assert.equal(TERRAIN_GENERATION_DEFAULTS.templateCount, 14);
});

function average(items, property) {
  return items.reduce((sum, item) => sum + item[property], 0) / Math.max(1, items.length);
}

function wrappedSquareDistance(left, right, world) {
  const a = world.tiles[left];
  const b = world.tiles[right];
  let dx = b.x - a.x;
  if (Math.abs(dx) > world.width / 2) dx -= Math.sign(dx) * world.width;
  const dy = b.y - a.y;
  return Math.max(Math.abs(dx), Math.abs(dy));
}

test("terrain generation is deterministic by seed and changes with a different seed", () => {
  const first = generateTerrain({ ...TEST_SIZE, seed: "deterministic-world" });
  const second = generateTerrain({ ...TEST_SIZE, seed: "deterministic-world" });
  const different = generateTerrain({ ...TEST_SIZE, seed: "different-world" });
  assert.deepEqual(first.summary, second.summary);
  assert.deepEqual(first.tiles, second.tiles);
  assert.notDeepEqual(first.tiles.map((tile) => tile.elevation), different.tiles.map((tile) => tile.elevation));
  assert.equal(first.gridType, "square");
  assert.ok(first.tiles.every((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y)));
});

test("terrain is assembled from reusable coherent template pieces", () => {
  const world = generateTerrain({ ...TEST_SIZE, seed: "template-pieces" });
  assert.equal(world.terrainTemplates.length, world.config.templateCount);
  assert.deepEqual(
    new Set(world.terrainTemplates.map((piece) => piece.templateId)),
    new Set(TERRAIN_TEMPLATES.map((template) => template.id)),
  );
  assert.ok(world.tiles.every((tile) => tile.terrainTemplateId && tile.terrainTemplateName && tile.terrainTemplatePieceId));
  assert.deepEqual(
    Object.keys(world.summary.templateCounts).sort(),
    TERRAIN_TEMPLATES.map((template) => template.id).sort(),
  );
  let samePieceEdges = 0;
  let comparedEdges = 0;
  for (const tile of world.tiles) {
    for (const neighbor of [tile.x + 1 < world.width ? tile.index + 1 : null, tile.y + 1 < world.height ? tile.index + world.width : null]) {
      if (neighbor === null) continue;
      comparedEdges += 1;
      if (world.tiles[neighbor].terrainTemplatePieceId === tile.terrainTemplatePieceId) samePieceEdges += 1;
    }
  }
  assert.ok(samePieceEdges / comparedEdges >= 0.82, "template pieces should form readable contiguous regions");
});

test("plate uplift creates mountain chains without overwhelming the playable land", () => {
  const world = generateTerrain({ ...TEST_SIZE, seed: "civilization" });
  const mountainCount = world.summary.reliefCounts.mountains ?? 0;
  const mountainRatio = mountainCount / world.summary.landTiles;
  const validation = validateTerrainWorld(world);
  assert.ok(Math.abs(world.summary.landRatio - world.config.landRatio) < 0.015);
  assert.ok(mountainRatio >= 0.1 && mountainRatio <= 0.28, `mountain ratio was ${mountainRatio}`);
  assert.ok(validation.isolatedMountainCount <= 3);
  assert.equal(validation.valid, true, validation.issues.join("\n"));
});

test("rivers follow a finite downhill drainage path to an outlet", () => {
  const world = generateTerrain({ ...TEST_SIZE, seed: "river-network" });
  assert.ok(world.riverSegments.length >= 8);
  for (const segment of world.riverSegments) {
    assert.ok(world.tiles[segment.to].hydrologyElevation < world.tiles[segment.from].hydrologyElevation);
  }
  for (const river of world.rivers) {
    for (const source of river.sourceIndices) {
      const path = traceRiver(world, source);
      assert.equal(new Set(path).size, path.length, `river from ${source} contained a cycle`);
      assert.ok(path.length <= world.tiles.length);
      const end = world.tiles[path.at(-1)];
      assert.ok(end.flowTo < 0 || ["ocean", "coast"].includes(end.terrain));
    }
  }
});

test("flat river land gains alluvial fertility while unsuitable wet or steep land remains constrained", () => {
  const world = generateTerrain({ ...TEST_SIZE, seed: "civilization" });
  const riverLowlands = world.tiles.filter((tile) => tile.relief === "flat" && tile.freshwater >= 0.6 && tile.terrain !== "lake");
  const dryLowlands = world.tiles.filter((tile) => tile.relief === "flat" && tile.freshwater < 0.05 && !["ocean", "coast", "lake"].includes(tile.terrain));
  assert.ok(riverLowlands.length >= 5);
  assert.ok(dryLowlands.length >= 5);
  assert.ok(average(riverLowlands, "fertility") >= average(dryLowlands, "fertility") + 8);
  for (const tile of world.tiles.filter((candidate) => candidate.feature === "floodplain")) {
    assert.equal(tile.relief, "flat");
    assert.ok(tile.freshwater >= 0.6);
    assert.ok(tile.floodRisk > 0);
  }
});

test("rainfall changes climate, drainage, and vegetation rather than only recoloring tiles", () => {
  const dry = generateTerrain({ ...TEST_SIZE, seed: "climate-control", rainfall: 0.58 });
  const wet = generateTerrain({ ...TEST_SIZE, seed: "climate-control", rainfall: 1.42 });
  assert.ok(wet.summary.meanPrecipitationMm > dry.summary.meanPrecipitationMm + 350);
  assert.ok(wet.summary.riverTileCount > dry.summary.riverTileCount);
  assert.ok((wet.summary.featureCounts.forest ?? 0) > (dry.summary.featureCounts.forest ?? 0));
  assert.ok(wet.summary.meanFertility > dry.summary.meanFertility);
});

test("Civilization-style start selection evaluates workable surroundings and spacing", () => {
  const world = generateTerrain({ ...TEST_SIZE, seed: "balanced-starts" });
  const minDistance = 6;
  const starts = selectStartLocations(world, 4, { minDistance });
  assert.equal(starts.length, 4);
  assert.ok(starts.every((start) => start.score >= 70));
  for (let left = 0; left < starts.length; left += 1) {
    for (let right = left + 1; right < starts.length; right += 1) {
      assert.ok(wrappedSquareDistance(starts[left].index, starts[right].index, world) >= minDistance);
    }
  }
});

test("terrain renders as a natural image over a square play grid without letter tiles", () => {
  const world = generateTerrain({ ...TEST_SIZE, seed: "rendered-square-world" });
  const svg = renderTerrainSvg(world, { cellSize: 12, textureUrl: "./terrain-natural-texture.png" });
  assert.match(svg, /data-grid="square"/);
  assert.match(svg, /data-wrap="longitude"/);
  assert.match(svg, /data-terrain-resolution="48x32"/);
  assert.match(svg, /preserveAspectRatio="none"/);
  assert.match(svg, /data-raster-resolution="576x384"/);
  assert.match(svg, /data-map-style="illustrated-strategy"/);
  assert.match(svg, /<image href="\.\/terrain-natural-texture\.png"/);
  assert.match(svg, /filter id="organicTerrain"/);
  assert.match(svg, /id="terrainDetails"/);
  assert.match(svg, /id="coastlines"/);
  assert.match(svg, /class="terrain-detail is-(mountain|hill|forest|marsh)"/);
  assert.match(svg, /stitchTiles="stitch"/);
  assert.doesNotMatch(svg, /<text\b/);
  assert.match(svg, /<path d="M/);
});

test("invalid physical controls are rejected", () => {
  assert.throws(() => generateTerrain({ width: 8 }), /at least 12 x 8/);
  assert.throws(() => generateTerrain({ landRatio: 0.95 }), /landRatio/);
  assert.throws(() => generateTerrain({ rainfall: 3 }), /rainfall/);
});
