import test from "node:test";
import assert from "node:assert/strict";
import {
  getGeneratedWorldIntelligenceView,
  getGeneratedWorldView,
} from "../src/generated-world-system.js";
import { advanceCareerMonth, createCareerInitialState, performVillageAction } from "../src/simulation.js";

function createWorld(seed) {
  return createCareerInitialState({ seed, width: 48, height: 32, plateCount: 9, nationCount: 7 });
}

test("world affairs starts as an empty player-known timeline instead of an omniscient report", () => {
  const state = createWorld("empty-world-intelligence");
  assert.deepEqual(state.generatedWorld.intelligence.entries, []);
  assert.deepEqual(getGeneratedWorldIntelligenceView(state), []);
  assert.ok(state.generatedWorld.geopolitics.nationStates, "autonomous world state still exists behind the knowledge layer");
});

test("hearing a resident rumor adds one previously unknown world event to the shared timeline", () => {
  let state = advanceCareerMonth(createWorld("resident-rumor-intelligence"));
  state.generatedWorld.intelligence = { schemaVersion: 1, entries: [] };
  const { runtime } = getGeneratedWorldView(state);
  const settlement = runtime.nations.objects.find((object) => object.settlementLevel);
  const next = performVillageAction(state, settlement, "hear_rumor");
  const timeline = getGeneratedWorldIntelligenceView(next);
  assert.equal(state.generatedWorld.intelligence.entries.length, 0, "the source state remains unchanged");
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].source.type, "rumor");
  assert.equal(timeline[0].source.settlementId, settlement.id);
  assert.match(next.player.villageLife.lastAction.message, /世界情勢へ記録した/);
});

test("being in or beside an event region records it automatically as witnessed knowledge", () => {
  const seed = "nearby-witness-intelligence";
  const preview = advanceCareerMonth(createWorld(seed));
  const eventRegionId = preview.generatedWorld.geopolitics.events[0].regionId;
  const state = createWorld(seed);
  state.generatedWorld.expeditionRegionId = eventRegionId;
  state.generatedWorld.expeditionTileId = null;
  const advanced = advanceCareerMonth(state);
  const timeline = getGeneratedWorldIntelligenceView(advanced);
  assert.ok(timeline.some((entry) => entry.source.type === "witnessed" && entry.regionId === eventRegionId));
});
