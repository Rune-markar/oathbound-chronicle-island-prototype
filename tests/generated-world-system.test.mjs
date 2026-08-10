import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeneratedWorld,
  buildGeneratedWorldAsync,
  generatedWorldSaveSummary,
  getGeneratedExpeditionReachableRegions,
  getGeneratedWorldView,
  moveGeneratedExpeditionToRegion,
  refreshGeneratedWorldForDate,
  regenerateGeneratedWorld,
  selectGeneratedWorldRegion,
  setGeneratedPlayerNation,
} from "../src/generated-world-system.js";
import { createCareerInitialState, createInitialState, normalizeWarState } from "../src/simulation.js";

test("a new campaign stores a compact reproducible generated-world state", () => {
  const state = createInitialState();
  assert.equal(state.generatedWorld.version, 7);
  assert.equal(state.generatedWorld.width, 160);
  assert.equal(state.generatedWorld.height, 100);
  assert.equal(state.generatedWorld.nationCount, 7);
  const saved = JSON.stringify(state.generatedWorld);
  assert.equal(saved.includes("tiles"), false);
  assert.equal(saved.includes("terrain"), false);
  assert.deepEqual(generatedWorldSaveSummary(state), {
    seed: "eldoria-317",
    size: "160x100",
    nationCount: 7,
    playerNationId: "nation-1",
    expeditionRegionId: null,
    expeditionTileId: null,
    discoveredRegionCount: 0,
  });
});

test("every new character creates a fresh generated terrain and nation set", () => {
  const first = createCareerInitialState();
  const second = createCareerInitialState();
  assert.equal(first.scenarioMode, "generated");
  assert.equal(second.scenarioMode, "generated");
  assert.notEqual(first.generatedWorld.seed, second.generatedWorld.seed);
  assert.notEqual(buildGeneratedWorld(first).key, buildGeneratedWorld(second).key);
  assert.ok(first.generatedWorld.expeditionRegionId);
  assert.ok(second.generatedWorld.expeditionRegionId);
  assert.ok(first.generatedWorld.expeditionTileId);
  assert.ok(second.generatedWorld.expeditionTileId);
  for (const state of [first, second]) {
    const view = getGeneratedWorldView(state);
    assert.equal(view.expeditionTile.id, state.generatedWorld.expeditionTileId);
    assert.equal(view.expeditionTile.regionId, view.expeditionRegion.id);
    assert.equal(view.expeditionTile.passable, true);
    assert.ok(!["ocean", "coast", "lake"].includes(view.expeditionTile.terrain));
  }

  const replay = createCareerInitialState({ seed: first.generatedWorld.seed });
  assert.equal(replay.generatedWorld.seed, first.generatedWorld.seed);
  assert.deepEqual(
    buildGeneratedWorld(replay).terrain.tiles.map((tile) => tile.elevation),
    buildGeneratedWorld(first).terrain.tiles.map((tile) => tile.elevation),
  );
  assert.deepEqual(buildGeneratedWorld(replay).nations.tileNationIds, buildGeneratedWorld(first).nations.tileNationIds);
});

test("new-world generation reports real terrain and nation progress stages", async () => {
  const updates = [];
  const runtime = await buildGeneratedWorldAsync({
    seed: "async-progress-contract",
    width: 48,
    height: 32,
    plateCount: 9,
    nationCount: 7,
  }, (update) => updates.push(update));
  assert.equal(updates.at(0).stage, "seed");
  assert.equal(updates.at(-1).stage, "complete");
  assert.equal(updates.at(-1).progress, 100);
  assert.ok(updates.some((update) => update.stage === "terrain"));
  assert.ok(updates.some((update) => update.stage === "nations"));
  assert.ok(updates.every((update, index) => index === 0 || update.progress >= updates[index - 1].progress));
  assert.equal(runtime.terrain.terrainTemplates.length, runtime.terrain.config.templateCount);
  assert.ok(runtime.nations.nations.every((nation) => nation.peopleId && nation.settlementStyle));

  const started = createCareerInitialState({
    seed: "async-progress-contract",
    width: 48,
    height: 32,
    plateCount: 9,
    nationCount: 7,
    generatedWorldRuntime: runtime,
  });
  const startedView = getGeneratedWorldView(started);
  assert.equal(startedView.runtime, runtime);
  assert.equal(started.generatedWorld.expeditionTileId, startedView.expeditionTile.id);
  assert.equal(startedView.expeditionTile.passable, true);
  assert.equal(startedView.expeditionTile.regionId, startedView.expeditionRegion.id);
});

test("legacy campaign states acquire the generated-world contract during normalization", () => {
  const state = createInitialState();
  delete state.generatedWorld;
  const normalized = normalizeWarState(state);
  assert.equal(normalized.generatedWorld.seed, "eldoria-317");
  assert.equal(normalized.generatedWorld.expeditionPeriod, `${normalized.year}-${normalized.month}`);
});

test("legacy default-resolution worlds upgrade to the high-resolution grid without stale tile positions", () => {
  const state = createInitialState({ width: 48, height: 32, plateCount: 9 });
  state.generatedWorld = {
    ...state.generatedWorld,
    version: 1,
    width: 72,
    height: 48,
    plateCount: 11,
    expeditionTileId: "tile-17-23",
    selectedTileId: "tile-17-23",
    discoveredTileIds: ["tile-17-23"],
  };
  const normalized = normalizeWarState(state);
  assert.equal(normalized.generatedWorld.version, 7);
  assert.equal(normalized.generatedWorld.width, 160);
  assert.equal(normalized.generatedWorld.height, 100);
  assert.equal(normalized.generatedWorld.plateCount, 22);
  assert.equal(normalized.generatedWorld.expeditionRegionId, null);
  assert.equal(normalized.generatedWorld.selectedRegionId, null);
  assert.deepEqual(normalized.generatedWorld.discoveredRegionIds, []);
});

test("v2 tile positions migrate to their containing regions until the first regional move", () => {
  const state = createInitialState();
  const runtime = buildGeneratedWorld(state);
  const legacyTile = runtime.tiles[runtime.nations.nations[0].capitalIndex];
  state.generatedWorld = {
    ...state.generatedWorld,
    version: 2,
    expeditionTileId: legacyTile.id,
    selectedTileId: legacyTile.id,
    discoveredTileIds: [legacyTile.id],
  };
  const normalized = normalizeWarState(state);
  const view = getGeneratedWorldView(normalized);
  assert.equal(view.expeditionRegion.id, legacyTile.regionId);
  assert.equal(view.selectedRegion.id, legacyTile.regionId);
  assert.equal(normalized.generatedWorld.legacyExpeditionTileId, legacyTile.id);
  assert.equal(normalized.generatedWorld.legacySelectedTileId, legacyTile.id);
});

test("runtime reconstruction joins terrain, rivers, nations, and gameplay onto one square tile array", () => {
  const state = createInitialState();
  const first = buildGeneratedWorld(state);
  const second = buildGeneratedWorld(state);
  const view = getGeneratedWorldView(state);
  assert.equal(first, second);
  assert.equal(first.terrain.gridType, "square");
  assert.equal(first.tiles.length, 160 * 100);
  assert.equal(first.nations.tileNationIds.length, first.tiles.length);
  assert.equal(view.expeditionRegion.id, view.playerNation.capitalRegionId);
  assert.equal(view.selectedRegion.id, view.expeditionRegion.id);
  assert.equal(view.expeditionTile.index, view.expeditionRegion.anchorIndex);
  assert.equal(view.expeditionTile.id, view.generatedState.expeditionTileId ?? view.expeditionTile.id);
  assert.equal(view.expeditionTile.passable, true);
  assert.equal(view.expeditionTile.regionId, view.expeditionRegion.id);
  assert.ok(first.nations.regions.every((region) => first.tiles[region.markerIndex].regionId === region.id));
  assert.ok(first.nations.regions.every((region) => first.tiles[region.markerIndex].passable));
  assert.ok(first.tiles.every((tile) => tile.id === `tile-${tile.x}-${tile.y}`));
  assert.ok(first.tiles.filter((tile) => tile.passable).every((tile) => tile.regionId && tile.regionName));
  assert.ok(first.nations.nations.every((nation) => nation.regionIds.length >= 1));
  assert.ok(first.nations.regions.some((region) => first.nationById.get(region.nationId).regionCount === 1));
  assert.ok(first.tiles.every((tile) => Array.isArray(tile.worldObjects) && Array.isArray(tile.worldObjectIds)));
  assert.ok(first.nations.objects.every((object) => first.tiles[object.tileIndex].worldObjectIds.includes(object.id)));
});

test("player selection, region selection, and region expedition movement are persisted", () => {
  const initial = createInitialState();
  const initialRuntime = buildGeneratedWorld(initial);
  const movableNation = initialRuntime.nations.nations.find((nation) => (
    initialRuntime.regionById.get(nation.capitalRegionId).neighborIds.some((regionId) => initialRuntime.regionById.get(regionId).movementCost <= 8)
  ));
  assert.ok(movableNation);
  const chosen = setGeneratedPlayerNation(initial, movableNation.id);
  const chosenView = getGeneratedWorldView(chosen);
  assert.equal(chosen.generatedWorld.playerNationId, movableNation.id);
  assert.equal(chosen.generatedWorld.expeditionRegionId, chosenView.expeditionRegion.id);
  assert.equal(chosen.generatedWorld.expeditionTileId, chosenView.expeditionTile.id);
  assert.equal(chosenView.expeditionRegion.id, chosenView.playerNation.capitalRegionId);

  const destination = getGeneratedExpeditionReachableRegions(chosen)[0];
  assert.ok(destination, "capital region should have a reachable neighboring region");
  const moved = moveGeneratedExpeditionToRegion(chosen, destination.regionId);
  assert.equal(moved.generatedWorld.expeditionRegionId, destination.regionId);
  assert.equal(getGeneratedWorldView(moved).expeditionTile.regionId, destination.regionId);
  assert.equal(getGeneratedWorldView(moved).expeditionTile.passable, true);
  assert.equal(moved.generatedWorld.selectedRegionId, destination.regionId);
  assert.ok(moved.generatedWorld.expeditionMovement < 8);
  assert.ok(moved.generatedWorld.discoveredRegionIds.includes(destination.regionId));

  const otherRegion = chosenView.runtime.nations.regions.find((region) => region.id !== destination.regionId);
  const selected = selectGeneratedWorldRegion(moved, otherRegion.id);
  assert.equal(selected.generatedWorld.selectedRegionId, otherRegion.id);
  assert.equal(selected.generatedWorld.expeditionRegionId, destination.regionId);
});

test("an invalid or ocean start is repaired only after generated terrain is available", () => {
  const state = createCareerInitialState({ seed: "repair-ocean-start", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const runtime = buildGeneratedWorld(state);
  const ocean = runtime.tiles.find((tile) => ["ocean", "coast", "lake"].includes(tile.terrain));
  assert.ok(ocean);
  state.generatedWorld = {
    ...state.generatedWorld,
    expeditionRegionId: null,
    expeditionTileId: ocean.id,
    selectedRegionId: null,
    discoveredRegionIds: [],
  };
  const normalized = normalizeWarState(state);
  const view = getGeneratedWorldView(normalized);
  assert.notEqual(normalized.generatedWorld.expeditionTileId, ocean.id);
  assert.equal(normalized.generatedWorld.expeditionTileId, view.expeditionTile.id);
  assert.equal(view.expeditionTile.passable, true);
  assert.equal(view.expeditionTile.regionId, view.expeditionRegion.id);
  assert.ok(!["ocean", "coast", "lake"].includes(view.expeditionTile.terrain));
});

test("generated starts remain on playable land across different terrain seeds", () => {
  for (let index = 0; index < 20; index += 1) {
    const state = createCareerInitialState({
      seed: `land-start-contract-${index}`,
      width: 48,
      height: 32,
      plateCount: 9,
      nationCount: 7,
    });
    const view = getGeneratedWorldView(state);
    assert.equal(state.generatedWorld.expeditionTileId, view.expeditionTile.id);
    assert.equal(view.expeditionTile.passable, true);
    assert.equal(view.expeditionTile.regionId, view.expeditionRegion.id);
    assert.ok(!["ocean", "coast", "lake"].includes(view.expeditionTile.terrain));
  }
});

test("expeditions can move only to directly adjacent regions and never skip across the regional graph", () => {
  const state = setGeneratedPlayerNation(createInitialState(), "nation-1");
  const view = getGeneratedWorldView(state);
  const reachable = getGeneratedExpeditionReachableRegions(state);
  assert.ok(reachable.length > 0);
  assert.ok(reachable.every((entry) => entry.cost > 0 && entry.cost <= state.generatedWorld.expeditionMovement));
  assert.ok(reachable.every((entry) => view.expeditionRegion.neighborIds.includes(entry.regionId)));
  assert.ok(reachable.every((entry) => entry.pathRegionIds.length === 1 && entry.pathRegionIds[0] === entry.regionId));
  const affordableNeighborIds = view.expeditionRegion.neighborIds.filter((regionId) => (
    Math.ceil(view.runtime.regionById.get(regionId).movementCost) <= state.generatedWorld.expeditionMovement
  ));
  assert.deepEqual(new Set(reachable.map((entry) => entry.regionId)), new Set(affordableNeighborIds));

  const destination = reachable.at(-1);
  const moved = moveGeneratedExpeditionToRegion(state, destination.regionId);
  assert.equal(moved.generatedWorld.expeditionRegionId, destination.regionId);
  assert.equal(moved.generatedWorld.expeditionMovement, state.generatedWorld.expeditionMovement - destination.cost);
  assert.ok(destination.pathRegionIds.every((regionId) => moved.generatedWorld.discoveredRegionIds.includes(regionId)));

  const nonAdjacent = view.runtime.nations.regions.find((region) => (
    region.id !== view.expeditionRegion.id && !view.expeditionRegion.neighborIds.includes(region.id)
  ));
  assert.ok(nonAdjacent);
  assert.throws(() => moveGeneratedExpeditionToRegion(state, nonAdjacent.id), /隣接する地方だけです/);
  const exhausted = { ...state, generatedWorld: { ...state.generatedWorld, expeditionMovement: 0 } };
  assert.deepEqual(getGeneratedExpeditionReachableRegions(exhausted), []);
});

test("expedition movement refreshes after the campaign month changes", () => {
  const state = setGeneratedPlayerNation(createInitialState(), "nation-1");
  state.generatedWorld.expeditionMovement = 0;
  const nextMonth = refreshGeneratedWorldForDate({ ...state, month: state.month + 1 });
  assert.equal(nextMonth.generatedWorld.expeditionMovement, 8);
  assert.equal(nextMonth.generatedWorld.expeditionPeriod, `${state.year}-${state.month + 1}`);
});

test("regeneration changes only the compact source state and remains deterministic", () => {
  const state = createInitialState();
  const regenerated = regenerateGeneratedWorld(state, { seed: "integrated-world-review", nationCount: 9 });
  const first = buildGeneratedWorld(regenerated);
  const second = buildGeneratedWorld(regenerated);
  assert.equal(first, second);
  assert.equal(first.nations.nations.length, 9);
  assert.equal(regenerated.generatedWorld.seed, "integrated-world-review");
  assert.equal(regenerated.generatedWorld.expeditionRegionId, null);
  assert.equal(Object.hasOwn(regenerated.generatedWorld, "tiles"), false);
});
