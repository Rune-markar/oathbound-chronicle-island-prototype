import test from "node:test";
import assert from "node:assert/strict";
import {
  WAR_REGION_MAPS,
  advanceWarTheater,
  createWarTheater,
  getWarRegion,
} from "../src/war-map.js";
import {
  adoptDoctrine,
  commitMonth,
  createInitialState,
  declareWar,
  normalizeWarState,
  startDefensiveWar,
} from "../src/simulation.js";

function ready(state = createInitialState()) {
  return state.council.pending ? adoptDoctrine(state, "balanced") : state;
}

test("war theater generates three connected regional boards with 35 square tiles each", () => {
  const theater = createWarTheater({ ownArmy: 2100, enemyArmy: 1900, year: 317, month: 4 });
  assert.deepEqual(theater.regionOrder, ["orta_frontier", "ash_pass", "valka_border"]);
  assert.equal(theater.regions.length, 3);
  assert.equal(Object.keys(WAR_REGION_MAPS).length, 3);
  for (const region of theater.regions) {
    assert.equal(region.tiles.length, 35);
    assert.equal(new Set(region.tiles.map((tile) => tile.id)).size, 35);
    assert.ok(region.tiles.some((tile) => tile.landmark));
    assert.ok(region.tiles.some((tile) => tile.road));
  }
  assert.equal(theater.units.filter((unit) => unit.side === "friendly").reduce((sum, unit) => sum + unit.strength, 0), 2100);
  assert.equal(theater.units.filter((unit) => unit.side === "enemy").reduce((sum, unit) => sum + unit.strength, 0), 1900);
});

test("declaration creates a deployment state on the Ash Crown Pass board", () => {
  const state = declareWar(ready(), "transit");
  assert.equal(state.war.theater.phase, "deployment");
  assert.equal(state.war.theater.round, 0);
  assert.equal(state.war.theater.activeRegionId, "ash_pass");
  assert.equal(state.war.theater.initiative, "friendly");
  assert.equal(getWarRegion(state.war.theater).status, "frontline");
});

test("an invasion creates an enemy-initiative defense board in Orta", () => {
  const state = startDefensiveWar(ready());
  assert.equal(state.war.theater.activeRegionId, "orta_frontier");
  assert.equal(state.war.theater.initiative, "enemy");
  assert.equal(state.war.theater.phase, "deployment");
});

test("monthly combat advances the board round and applies losses to counters", () => {
  let state = declareWar(ready(), "transit");
  const openingStrength = state.war.theater.units
    .filter((unit) => unit.side === "friendly")
    .reduce((sum, unit) => sum + unit.strength, 0);
  state = commitMonth(state);
  assert.equal(state.war.theater.round, 1);
  assert.equal(state.war.theater.phase, "operations");
  assert.ok(state.war.theater.lastResolution);
  assert.ok(state.war.theater.units.filter((unit) => unit.side === "friendly").reduce((sum, unit) => sum + unit.strength, 0) < openingStrength);
});

test("a breakthrough moves a total-war front into the Valka regional board", () => {
  const theater = createWarTheater({ objectiveId: "submission", ownArmy: 2400, enemyArmy: 1900 });
  const advanced = advanceWarTheater(theater, {
    delta: 11,
    score: 42,
    objectiveProgress: 64,
    ownLoss: 20,
    enemyLoss: 85,
    objectiveId: "submission",
  });
  assert.equal(advanced.activeRegionId, "valka_border");
  assert.equal(getWarRegion(advanced, "ash_pass").status, "friendly_rear");
  assert.equal(getWarRegion(advanced, "valka_border").status, "frontline");
});

test("old war saves receive the regional board state during normalization", () => {
  const state = declareWar(ready(), "transit");
  delete state.war.theater;
  const normalized = normalizeWarState(state);
  assert.equal(normalized.war.theater.regions.length, 3);
  assert.equal(normalized.war.theater.phase, "deployment");
});
