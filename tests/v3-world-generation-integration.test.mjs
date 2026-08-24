import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeneratedWorld,
  createGeneratedWorldState,
} from "../src/generated-world-system.js";
import {
  WORLD_GENERATION_ALGORITHM,
  buildWorldGenerationAsync,
  clearWorldGenerationRuntimeCache,
} from "../src/world-generation.js";
import {
  createV3WorldContext,
  getV3DetailedTile,
} from "../src/v3-field-system.js";

const OPTIONS = Object.freeze({
  seed: "v2-world-generation-v3-contract",
  width: 48,
  height: 32,
  plateCount: 9,
  nationCount: 7,
});

test("V2由来の世界構築パイプラインをV2とV3が同じ実行結果として共有する", async () => {
  clearWorldGenerationRuntimeCache();
  const progress = [];
  const v3Runtime = await buildWorldGenerationAsync(OPTIONS, (update) => progress.push(update));
  const v2Runtime = buildGeneratedWorld(createGeneratedWorldState(OPTIONS));

  assert.equal(v3Runtime, v2Runtime);
  assert.deepEqual(v3Runtime.worldGeneration, {
    ...WORLD_GENERATION_ALGORITHM,
    config: { ...OPTIONS, wrapX: true },
  });
  assert.deepEqual(progress.map((update) => update.stage), ["seed", "terrain", "terrain", "nations", "nations", "complete"]);
  assert.equal(v3Runtime.terrain.tiles.length, OPTIONS.width * OPTIONS.height);
  assert.equal(v3Runtime.nations.tileNationIds.length, v3Runtime.terrain.tiles.length);
  assert.ok(v3Runtime.nations.nations.length === OPTIONS.nationCount);
  assert.ok(v3Runtime.nations.regions.length > OPTIONS.nationCount);
  assert.ok(v3Runtime.nations.roads.length > 0);
  assert.ok(v3Runtime.nations.objects.some((object) => object.settlementLevel));
});

test("共有概算世界の地形・国家・地方・街道・集落をV3詳細世界へそのまま投影する", async () => {
  clearWorldGenerationRuntimeCache();
  const runtime = await buildWorldGenerationAsync(OPTIONS);
  const context = createV3WorldContext(runtime, OPTIONS.seed);
  const sampleIndices = [
    runtime.tiles.find((tile) => !tile.passable)?.index,
    runtime.tiles.find((tile) => tile.passable && tile.riverId)?.index,
    runtime.tiles.find((tile) => tile.passable && tile.geographyTags?.length)?.index,
    runtime.tiles.find((tile) => tile.passable && tile.nationId && tile.regionId)?.index,
  ].filter((index, position, values) => Number.isInteger(index) && values.indexOf(index) === position);

  for (const index of sampleIndices) {
    const macro = runtime.tiles[index];
    const detail = getV3DetailedTile(
      context,
      macro.x * context.detailScale,
      macro.y * context.detailScale,
    );
    assert.equal(detail.macroTile, macro);
    assert.equal(detail.nation?.id ?? null, macro.nationId ?? null);
    assert.equal(detail.region?.id ?? null, macro.regionId ?? null);
  }

  const settlement = context.settlements[0];
  assert.ok(settlement);
  const settlementTile = getV3DetailedTile(context, settlement.detailX, settlement.detailY);
  assert.equal(settlementTile.settlement?.id, settlement.id);
  assert.equal(settlementTile.name, settlement.name);
  assert.equal(context.roadTileIndices.size, new Set(runtime.nations.roads.flatMap((road) => road.tileIndices ?? [])).size);
  assert.equal(context.runtime.worldGeneration.sourceGeneration, "v2");
});
