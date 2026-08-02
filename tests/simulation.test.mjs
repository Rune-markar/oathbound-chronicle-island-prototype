import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD,
  advanceDay,
  createInitialState,
  deriveMetrics,
  enactPolicy,
  getOutcome,
  getPolicyAvailability,
  getTravelMinutes,
  performAction,
} from "../src/simulation.js";

test("initial world contains one nation, three cities, and six villages", () => {
  const state = createInitialState();
  assert.equal(Object.keys(WORLD.cities).length, 3);
  assert.equal(Object.keys(WORLD.villages).length, 6);
  assert.equal(Object.keys(state.villages).length, 6);
  assert.equal(state.target, 48);
  assert.equal(state.locationId, "selene");
});

test("field evidence unlocks the surplus-linked oath", () => {
  let state = createInitialState();
  assert.equal(getPolicyAvailability(state, "surplus").allowed, false);
  state = performAction(state, "player.travel", "mugiwano");
  state = performAction(state, "village.inspect", "mugiwano");
  state = advanceDay(state);
  state = performAction(state, "village.hear", "mugiwano");
  state = performAction(state, "player.travel", "selene");
  state = advanceDay(state);
  state = performAction(state, "city.council", "selene");
  assert.equal(state.evidence, 3);
  assert.equal(getPolicyAvailability(state, "surplus").allowed, true);
});

test("a city standard reduces record error and spends finite resources", () => {
  const initial = createInitialState();
  let state = performAction(initial, "player.travel", "orta");
  state = performAction(state, "city.ledger", "orta");
  assert.equal(state.cities.orta.ledger, true);
  assert.equal(state.treasury, 70);
  assert.equal(state.actionPoints, 0);
  assert.ok(Math.abs(state.villages.haimugi.recorded - state.villages.haimugi.stock) < Math.abs(initial.villages.haimugi.recorded - initial.villages.haimugi.stock));
});

test("daily shipment consumes village stock and never creates grain", () => {
  let state = enactPolicy(createInitialState(), "levy");
  const before = deriveMetrics(state).totalStock;
  state = advanceDay(state);
  const after = deriveMetrics(state).totalStock;
  assert.ok(after < before);
  assert.ok(state.delivered > 0);
  assert.ok(state.delivered <= before - after);
});

test("one-time local actions cannot be repeated", () => {
  let state = performAction(createInitialState(), "player.travel", "shionari");
  state = performAction(state, "village.inspect", "shionari");
  state = advanceDay(state);
  assert.throws(() => performAction(state, "village.inspect", "shionari"), /照合済み/);
});

test("local work requires physical travel and travel consumes world time", () => {
  const initial = createInitialState();
  assert.throws(() => performAction(initial, "village.inspect", "mugiwano"), /移動してから/);
  const arrived = performAction(initial, "player.travel", "mugiwano");
  assert.equal(arrived.locationId, "mugiwano");
  assert.equal(arrived.actionPoints, 1);
  assert.equal(arrived.currentMinutes, 8 * 60 + getTravelMinutes("selene", "mugiwano"));
});

test("shipments stop exactly at the national target", () => {
  let state = enactPolicy(createInitialState(), "levy");
  while (!state.ended) state = advanceDay(state);
  assert.ok(Math.abs(state.delivered - state.target) < 0.001);
});

test("reserve-protecting oaths never draw a village below its winter line", () => {
  let state = createInitialState();
  state.evidence = 3;
  state = enactPolicy(state, "surplus");
  while (!state.ended) state = advanceDay(state);
  Object.values(WORLD.villages).forEach((village) => {
    assert.ok(state.villages[village.id].stock >= village.reserve);
  });
  assert.equal(state.oathDebt, 0);
  assert.ok(Math.abs(state.delivered - state.target) < 0.001);
});

test("outcome distinguishes delivery from a trustworthy delivery", () => {
  const state = createInitialState();
  state.delivered = 48;
  Object.values(state.villages).forEach((village) => { village.trust = 70; });
  assert.equal(getOutcome(state).level, "best");
  state.oathDebt = 6;
  assert.equal(getOutcome(state).level, "mixed");
  state.delivered = 10;
  assert.equal(getOutcome(state).level, "failed");
});
