import test from "node:test";
import assert from "node:assert/strict";
import { generateNations } from "../src/nation-generation.js";
import { generateTerrain } from "../src/terrain-generation.js";
import {
  TERRAIN_GEOGRAPHY_DEFINITIONS,
  terrainTravelProfile,
} from "../src/terrain-geography.js";

const REFERENCE_ELEMENTS = [
  "grassland", "forest", "desert", "oasis", "sea", "open_sea", "inland_sea",
  "coast", "shoal", "tidal_flat", "river", "canal", "lake", "spring", "marsh",
  "island", "coldland", "snowfield", "canyon", "mountain_range", "crater", "volcano",
  "caldera", "cave", "mine", "ruins", "farmland", "basin", "peninsula", "bay", "cape",
  "alluvial_fan", "delta", "floating_island", "sky_peak", "outer_space",
];

test("天地創造の地理カタログは自然・文明・幻想・天体の参照要素を区別する", () => {
  assert.deepEqual(
    REFERENCE_ELEMENTS.filter((id) => !TERRAIN_GEOGRAPHY_DEFINITIONS[id]),
    [],
  );
  assert.equal(TERRAIN_GEOGRAPHY_DEFINITIONS.river.kind, "hydrology");
  assert.equal(TERRAIN_GEOGRAPHY_DEFINITIONS.canal.kind, "infrastructure");
  assert.equal(TERRAIN_GEOGRAPHY_DEFINITIONS.floating_island.kind, "fantasy");
  assert.equal(TERRAIN_GEOGRAPHY_DEFINITIONS.outer_space.kind, "astronomy");
});

test("地形は因果条件から複合タグと探索地点を決定論的に生成する", () => {
  const options = { seed: "geography-b", width: 96, height: 64, plateCount: 14 };
  const first = generateTerrain(options);
  const second = generateTerrain(options);
  assert.deepEqual(first.summary.geographyCounts, second.summary.geographyCounts);
  assert.deepEqual(first.geographicSites, second.geographicSites);

  const expectedNaturalElements = REFERENCE_ELEMENTS.filter((id) => !["canal", "farmland"].includes(id));
  for (const id of expectedNaturalElements) {
    assert.ok((first.summary.geographyCounts[id] ?? 0) > 0, `${id} was not generated`);
  }
  assert.equal(new Set(first.geographicSites.map((site) => site.id)).size, first.geographicSites.length);
  assert.ok(first.geographicSites.every((site) => first.tiles[site.tileIndex].terrainSite?.id === site.id));

  const oases = first.tiles.filter((tile) => tile.geographyTags.includes("oasis"));
  assert.ok(oases.length > 0);
  assert.ok(oases.every((tile) => tile.terrain === "desert" && tile.freshwater >= 0.82));
  assert.ok(oases.some((tile) => tile.geographyTags.includes("spring") || tile.geographyTags.includes("river")));
  const deltas = first.tiles.filter((tile) => tile.geographyTags.includes("delta"));
  assert.ok(deltas.every((tile) => tile.riverId && ["ocean", "coast"].includes(first.tiles[tile.flowTo]?.terrain)));
  const volcanoes = first.tiles.filter((tile) => tile.geographyTags.includes("volcano"));
  assert.ok(volcanoes.every((tile) => ["hills", "mountains"].includes(tile.relief) && tile.geographyTags.includes("crater")));
  assert.equal(first.astronomy.geographyId, "outer_space");
  assert.ok(first.astronomy.moons.length >= 1 && first.astronomy.moons.length <= 3);
  assert.equal(first.tiles[first.astronomy.accessSiteTileIndex].terrainSite.type, "crater");

  const nations = generateNations(first, { count: 7, seed: "geography-b:nations" });
  const farmland = nations.tiles.filter((tile) => tile.landUse === "farmland");
  const canals = nations.tiles.filter((tile) => tile.infrastructure === "canal");
  assert.ok(farmland.length > 0);
  assert.ok(canals.length > 0);
  assert.ok(farmland.every((tile) => tile.geographyTags.includes("farmland") && tile.relief === "flat"));
  assert.ok(canals.every((tile) => tile.landUse === "farmland" && tile.geographyTags.includes("canal") && !tile.riverId));
  assert.equal(nations.summary.landUseCounts.farmland, farmland.length);
  assert.equal(nations.summary.infrastructureCounts.canal, canals.length);
});

test("V3用の移動プロファイルは地形上の選択差を返す", () => {
  const grass = terrainTravelProfile({ geographyTags: ["grassland"] });
  const forest = terrainTravelProfile({ geographyTags: ["grassland", "forest"] });
  const marsh = terrainTravelProfile({ geographyTags: ["grassland", "marsh"] });
  const oasis = terrainTravelProfile({ geographyTags: ["desert", "oasis"] });
  const road = terrainTravelProfile({ geographyTags: ["forest", "road"] });
  assert.ok(forest.minutes > grass.minutes);
  assert.ok(marsh.minutes > forest.minutes);
  assert.ok(oasis.minutes < terrainTravelProfile({ geographyTags: ["desert"] }).minutes);
  assert.equal(road.minutes, 7);
  assert.ok(marsh.dangerBias > grass.dangerBias);
});
