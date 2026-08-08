import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, WORLD } from "../src/simulation.js";
import { deriveCityMetrics, deriveOfficerScore } from "../src/realm-model.js";

test("village population mix causally changes city production", () => {
  const state = createInitialState();
  const world = structuredClone(WORLD);
  const baseline = deriveCityMetrics(world, state, "selene");
  state.towns.mugiwano.population += 4000;
  const ruralGrowth = deriveCityMetrics(world, state, "selene");
  assert.ok(ruralGrowth.supplyYield > baseline.supplyYield);
});

test("merit is experience, not a decorative counter", () => {
  const novice = createInitialState();
  novice.officers.edras.merit = 0;
  const veteran = structuredClone(novice);
  veteran.officers.edras.merit = 900;
  assert.ok(
    deriveOfficerScore(WORLD, veteran, "edras", "commerce", "selene")
      > deriveOfficerScore(WORLD, novice, "edras", "commerce", "selene"),
  );
});
