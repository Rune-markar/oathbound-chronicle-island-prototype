import test from "node:test";
import assert from "node:assert/strict";
import {
  createCareerInitialState,
  executeTheft,
  getSettlementTheftOpportunities,
  getTheftOpportunities,
  previewTheft,
} from "../src/simulation.js";
import {
  discoverTavernUnderworldContacts,
  fenceTavernStolenItem,
  getTavernUnderworldView,
} from "../src/adventure-system.js";

const settlement = { id: "village:orta", name: "オルタ村", settlementLevel: "village" };
const context = { settlement, jurisdictionId: "orta", jurisdictionName: "オルタ地方" };

function fixture(seed = "theft-flow") {
  const state = createCareerInitialState({ seed });
  state.player.locationId = "orta";
  state.player.metrics.wealth = 10;
  return state;
}

test("settlement theft opportunities expose stable concrete targets and qualitative previews", () => {
  const state = fixture();
  const first = getTheftOpportunities(state, context);
  const second = getSettlementTheftOpportunities(state, settlement, context);
  assert.deepEqual(second, first);
  assert.deepEqual(first.map((entry) => entry.target.id), ["merchant:village:orta", "warehouse:village:orta"]);
  for (const entry of first) {
    assert.ok(entry.riskLabel);
    assert.ok(entry.expectedReward.normalValue > 0);
    assert.ok(Array.isArray(entry.preparationRequirements));
    assert.ok(entry.maximumPenalty);
    assert.doesNotMatch(JSON.stringify(entry), /percent|percentage|%|probability/i);
  }
  assert.equal(previewTheft(state, first[0]).targetId, "merchant:village:orta");
});

test("theft resolution is deterministic and leaves its input untouched", () => {
  const state = fixture("deterministic-theft");
  const original = structuredClone(state);
  const opportunity = getTheftOpportunities(state, context)[0];
  const first = executeTheft(state, opportunity, { seed: "same-seed" });
  const second = executeTheft(state, opportunity, { seed: "same-seed" });
  assert.deepEqual(first, second);
  assert.deepEqual(state, original);
});

test("hidden and exposed theft create provenance-bearing stolen items with exact heat", () => {
  const state = fixture();
  const opportunity = getTheftOpportunities(state, context)[0];
  const hidden = executeTheft(state, opportunity, { outcome: "success_hidden" });
  assert.equal(hidden.result.outcome, "success_hidden");
  assert.equal(hidden.state.player.crime.heatByJurisdiction.orta ?? 0, 0);
  assert.equal(hidden.state.player.crime.stolenItems.length, 1);
  assert.deepEqual(hidden.state.player.crime.stolenItems[0].provenance, {
    crimeType: "theft",
    settlementId: settlement.id,
    targetId: opportunity.target.id,
    jurisdictionId: "orta",
    incidentId: hidden.result.incidentId,
  });

  const exposed = executeTheft(state, opportunity, { outcome: "success_exposed" });
  assert.equal(exposed.state.player.crime.heatByJurisdiction.orta, 15);
  assert.equal(exposed.state.player.crime.stolenItems.length, 1);
});

test("failed and captured theft give no stolen reward and record the common incident", () => {
  const state = fixture();
  const opportunity = getTheftOpportunities(state, context)[1];
  const failed = executeTheft(state, opportunity, { outcome: "failed_escaped" });
  assert.equal(failed.state.player.crime.stolenItems.length, 0);
  assert.equal(failed.state.player.crime.incidents.at(-1).outcome, "failed_escaped");
  const captured = executeTheft(state, opportunity, { outcome: "captured" });
  assert.equal(captured.state.player.crime.stolenItems.length, 0);
  assert.equal(captured.state.player.crime.incidents.at(-1).outcome, "captured");
  assert.equal(captured.state.player.crime.heatByJurisdiction.orta, 15);
});

test("tavern routes use shared contact discovery and fencing state", () => {
  let state = fixture();
  const opportunity = getTheftOpportunities(state, context)[0];
  state = executeTheft(state, opportunity, { outcome: "success_hidden" }).state;
  const beforeWealth = state.player.metrics.wealth;
  state = discoverTavernUnderworldContacts(state, context);
  const view = getTavernUnderworldView(state, context);
  assert.equal(view.contacts.length, 3);
  assert.equal(view.stolenItems.length, 1);
  assert.equal(state.player.metrics.wealth, beforeWealth - 1);
  const item = state.player.crime.stolenItems[0];
  state = fenceTavernStolenItem(state, item.id, context);
  assert.equal(state.player.crime.stolenItems.length, 0);
  assert.equal(state.player.metrics.wealth, beforeWealth - 1 + item.normalValue * 0.4);
});
