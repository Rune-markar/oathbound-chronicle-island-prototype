import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeneratedWorld,
  generatedWorldSaveSummary,
  getGeneratedWorldView,
  moveGeneratedExpedition,
  refreshGeneratedWorldForDate,
  regenerateGeneratedWorld,
  selectGeneratedWorldTile,
  setGeneratedPlayerNation,
} from "../src/generated-world-system.js";
import { createInitialState, normalizeWarState } from "../src/simulation.js";

function directionBetween(runtime, from, to) {
  const rawDx = to.x - from.x;
  const dx = Math.abs(rawDx) > runtime.terrain.width / 2 ? -Math.sign(rawDx) : rawDx;
  const dy = to.y - from.y;
  if (dx === 1 && dy === 0) return "east";
  if (dx === -1 && dy === 0) return "west";
  if (dx === 0 && dy === 1) return "south";
  if (dx === 0 && dy === -1) return "north";
  return null;
}

test("a new campaign stores a compact reproducible generated-world state", () => {
  const state = createInitialState();
  assert.equal(state.generatedWorld.version, 1);
  assert.equal(state.generatedWorld.width, 72);
  assert.equal(state.generatedWorld.height, 48);
  assert.equal(state.generatedWorld.nationCount, 7);
  const saved = JSON.stringify(state.generatedWorld);
  assert.equal(saved.includes("tiles"), false);
  assert.equal(saved.includes("terrain"), false);
  assert.deepEqual(generatedWorldSaveSummary(state), {
    seed: "eldoria-317",
    size: "72x48",
    nationCount: 7,
    playerNationId: "nation-1",
    expeditionTileId: null,
    discoveredTileCount: 0,
  });
});

test("legacy campaign states acquire the generated-world contract during normalization", () => {
  const state = createInitialState();
  delete state.generatedWorld;
  const normalized = normalizeWarState(state);
  assert.equal(normalized.generatedWorld.seed, "eldoria-317");
  assert.equal(normalized.generatedWorld.expeditionPeriod, `${normalized.year}-${normalized.month}`);
});

test("runtime reconstruction joins terrain, rivers, nations, and gameplay onto one square tile array", () => {
  const state = createInitialState();
  const first = buildGeneratedWorld(state);
  const second = buildGeneratedWorld(state);
  const view = getGeneratedWorldView(state);
  assert.equal(first, second);
  assert.equal(first.terrain.gridType, "square");
  assert.equal(first.tiles.length, 72 * 48);
  assert.equal(first.nations.tileNationIds.length, first.tiles.length);
  assert.equal(view.expeditionTile.index, view.playerNation.capitalIndex);
  assert.equal(view.selectedTile.id, view.expeditionTile.id);
  assert.ok(first.tiles.every((tile) => tile.id === `tile-${tile.x}-${tile.y}`));
});

test("player selection, square-tile selection, and orthogonal expedition movement are persisted", () => {
  const initial = createInitialState();
  const chosen = setGeneratedPlayerNation(initial, "nation-2");
  const chosenView = getGeneratedWorldView(chosen);
  assert.equal(chosen.generatedWorld.playerNationId, "nation-2");
  assert.equal(chosen.generatedWorld.expeditionTileId, chosenView.expeditionTile.id);
  assert.equal(chosenView.expeditionTile.index, chosenView.playerNation.capitalIndex);

  const destination = chosenView.expeditionTile.orthogonalNeighbors
    .map((index) => chosenView.runtime.tiles[index])
    .find((tile) => tile.passable && Math.ceil(tile.movementCost) <= 8);
  assert.ok(destination, "capital should have a passable orthogonal exploration step");
  const direction = directionBetween(chosenView.runtime, chosenView.expeditionTile, destination);
  assert.ok(direction);
  const moved = moveGeneratedExpedition(chosen, direction);
  assert.equal(moved.generatedWorld.expeditionTileId, destination.id);
  assert.equal(moved.generatedWorld.selectedTileId, destination.id);
  assert.ok(moved.generatedWorld.expeditionMovement < 8);
  assert.ok(moved.generatedWorld.discoveredTileIds.includes(destination.id));

  const selected = selectGeneratedWorldTile(moved, "tile-0-0");
  assert.equal(selected.generatedWorld.selectedTileId, "tile-0-0");
  assert.equal(selected.generatedWorld.expeditionTileId, destination.id);
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
  assert.equal(regenerated.generatedWorld.expeditionTileId, null);
  assert.equal(Object.hasOwn(regenerated.generatedWorld, "tiles"), false);
});
