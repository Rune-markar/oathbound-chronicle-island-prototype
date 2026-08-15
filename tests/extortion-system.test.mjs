import test from "node:test";
import assert from "node:assert/strict";
import {
  collectExtortionPayment,
  createCareerInitialState,
  executeExtortion,
  getExtortionOpportunities,
  getSettlementExtortionOpportunities,
  normalizeCrimeState,
  previewExtortion,
} from "../src/simulation.js";

const settlement = { id: "village:orta", name: "オルタ村", settlementLevel: "village" };
const context = { settlement, jurisdictionId: "orta", jurisdictionName: "オルタ地方" };

function fixture(seed = "extortion-flow") {
  const state = createCareerInitialState({ seed });
  state.player.locationId = "orta";
  state.player.metrics.wealth = 10;
  return state;
}

test("legacy crime saves gain an empty recurring-extortion collection", () => {
  const state = fixture();
  state.player.crime = { schemaVersion: 1, incidents: [] };
  const normalized = normalizeCrimeState(state);
  assert.deepEqual(normalized.player.crime.extortionArrangements, []);
});

test("extortion opportunities are stable concrete targets with one-off and recurring modes", () => {
  const state = fixture();
  const opportunities = getExtortionOpportunities(state, context);
  assert.deepEqual(getSettlementExtortionOpportunities(state, settlement, context), opportunities);
  assert.deepEqual([...new Set(opportunities.map((entry) => entry.target.id))], ["merchant:village:orta", "official:village:orta"]);
  assert.deepEqual([...new Set(opportunities.map((entry) => entry.mode))], ["one_off", "recurring"]);
  assert.ok(opportunities.every((entry) => entry.riskLabel && entry.maximumPenalty && entry.expectedReward.wealth > 0));
});

test("generated settlement extortion uses region jurisdiction instead of the village site id", () => {
  const state = fixture();
  const opportunities = getExtortionOpportunities(state, {
    settlement: { id: "village:generated-7", name: "生成村" },
    region: { id: "region:generated-7", name: "生成地方" },
  });
  assert.ok(opportunities.every((entry) => entry.jurisdictionId === "region:generated-7"));
});

test("one-off extortion pays real wealth and reported extortion adds heat and an NPC consequence", () => {
  const state = fixture();
  const opportunity = getExtortionOpportunities(state, context).find((entry) => entry.mode === "one_off");
  const hidden = executeExtortion(state, opportunity, { outcome: "success_hidden" });
  assert.equal(hidden.state.player.metrics.wealth, state.player.metrics.wealth + opportunity.expectedReward.wealth);
  assert.equal(hidden.state.player.crime.heatByJurisdiction.orta ?? 0, 0);

  const reported = executeExtortion(state, opportunity, { outcome: "success_exposed" });
  assert.equal(reported.state.player.crime.heatByJurisdiction.orta, 25);
  assert.ok(reported.state.adventure.npcRelations[opportunity.target.id].affinity < 0);
  assert.equal(reported.state.adventure.npcRelations[opportunity.target.id].lastResult.consequence, "reported_extortion");
});

test("recurring protection creates a due arrangement and deterministic execution", () => {
  const state = fixture("recurring-extortion");
  const opportunity = getExtortionOpportunities(state, context).find((entry) => entry.mode === "recurring");
  const original = structuredClone(state);
  const first = executeExtortion(state, opportunity, { seed: "same-seed", outcome: "success_hidden" });
  const second = executeExtortion(state, opportunity, { seed: "same-seed", outcome: "success_hidden" });
  assert.deepEqual(first, second);
  assert.deepEqual(state, original);
  const arrangement = first.state.player.crime.extortionArrangements[0];
  assert.equal(arrangement.targetId, opportunity.target.id);
  assert.equal(arrangement.amount, opportunity.expectedReward.wealth);
  assert.equal(arrangement.pressure, 1);
  assert.equal(arrangement.nextDueTurn, (state.turn ?? 0) + 1);
});

test("default extortion resolution uses generated-world seed and explicit seed overrides it", () => {
  const worldA = fixture();
  const worldB = fixture();
  worldA.worldSeed = worldB.worldSeed = "legacy-shared-seed";
  worldA.generatedWorld.seed = "world-a";
  worldB.generatedWorld.seed = "world-b";
  const opportunity = getExtortionOpportunities(worldA, context).find((entry) => entry.mode === "one_off");
  assert.equal(executeExtortion(worldA, opportunity).result.outcome, "success_hidden");
  assert.equal(executeExtortion(worldA, opportunity).result.outcome, executeExtortion(worldA, opportunity).result.outcome);
  assert.equal(executeExtortion(worldB, opportunity).result.outcome, "failed_escaped");
  assert.equal(
    executeExtortion(worldA, opportunity, { seed: "explicit" }).result.outcome,
    executeExtortion(worldB, opportunity, { seed: "explicit" }).result.outcome,
  );
});

test("due collection pays wealth and raises pressure while an early collection is rejected immutably", () => {
  let state = fixture();
  const opportunity = getExtortionOpportunities(state, context).find((entry) => entry.mode === "recurring");
  state = executeExtortion(state, opportunity, { outcome: "success_hidden" }).state;
  const arrangement = state.player.crime.extortionArrangements[0];
  const original = structuredClone(state);
  assert.throws(() => collectExtortionPayment(state, { arrangementId: arrangement.id }), /支払日/);
  assert.deepEqual(state, original);
  state.turn = arrangement.nextDueTurn;
  const wealth = state.player.metrics.wealth;
  const collected = collectExtortionPayment(state, { arrangementId: arrangement.id, outcome: "success_hidden" });
  assert.equal(collected.state.player.metrics.wealth, wealth + arrangement.amount);
  assert.equal(collected.state.player.crime.extortionArrangements[0].pressure, arrangement.pressure + 1);
  assert.ok(collected.state.player.crime.extortionArrangements[0].nextDueTurn > arrangement.nextDueTurn);
});

test("repeated pressure worsens qualitative risk and reporting adds exact heat", () => {
  let state = fixture();
  const opportunity = getExtortionOpportunities(state, context).find((entry) => entry.mode === "recurring");
  state = executeExtortion(state, opportunity, { outcome: "success_hidden" }).state;
  const arrangement = state.player.crime.extortionArrangements[0];
  const initialRisk = previewExtortion(state, opportunity, { arrangementId: arrangement.id }).riskLevel;
  state.turn = arrangement.nextDueTurn;
  state = collectExtortionPayment(state, { arrangementId: arrangement.id, outcome: "success_hidden" }).state;
  state.turn = state.player.crime.extortionArrangements[0].nextDueTurn;
  const repeatedRisk = previewExtortion(state, opportunity, { arrangementId: arrangement.id }).riskLevel;
  assert.ok(repeatedRisk > initialRisk);
  const reported = collectExtortionPayment(state, { arrangementId: arrangement.id, outcome: "success_exposed" });
  assert.equal(reported.state.player.crime.heatByJurisdiction.orta, 25);
  assert.equal(reported.state.adventure.npcRelations[opportunity.target.id].lastResult.consequence, "reported_extortion");
});
