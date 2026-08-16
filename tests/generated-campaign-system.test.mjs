import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceGeneratedCampaign,
  advanceGeneratedCampaignMonth,
  decideGeneratedSiege,
  getGeneratedCampaignView,
  normalizeGeneratedCampaignState,
  requestAlliedContingent,
  retreatGeneratedCampaign,
  settleGeneratedCampaign,
  startGeneratedCampaign,
} from "../src/generated-campaign-system.js";
import { createCareerInitialState } from "../src/simulation.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";

function sovereignState(seed = "generated-campaign") {
  const state = createCareerInitialState({ seed });
  const world = getGeneratedWorldView(state);
  state.player.stage = "independent_ruler";
  state.player.sovereign = true;
  state.player.affiliation = { nationId: state.generatedWorld.playerNationId, liegeId: null, liegeName: null };
  state.player.householdRetainers = ["dario"];
  state.player.metrics.wealth = 100;
  const origin = world.runtime.nations.regions.find((region) => (
    state.generatedWorld.regionalDomains.regionStates[region.id].nationId === state.generatedWorld.playerNationId
    && region.neighborIds.some((id) => state.generatedWorld.regionalDomains.regionStates[id].nationId !== state.generatedWorld.playerNationId)
  ));
  assert.ok(origin, "seed needs a player border region");
  state.generatedWorld.expeditionRegionId = origin.id;
  const target = origin.neighborIds.map((id) => world.runtime.regionById.get(id)).find((region) => state.generatedWorld.regionalDomains.regionStates[region.id].nationId !== state.generatedWorld.playerNationId);
  assert.ok(target, "seed needs a foreign neighboring region");
  const ally = world.runtime.nations.nations.find((nation) => ![origin.nationId, target.nationId].includes(nation.id));
  const key = [origin.nationId, ally.id].sort().join(":");
  state.generatedWorld.geopolitics.relations[key].allied = true;
  state.generatedWorld.geopolitics.relations[key].relation = 65;
  normalizeGeneratedCampaignState(state);
  return { state, origin, target, ally };
}

test("campaign opportunities are real foreign borders and allied aid is explicit", () => {
  let { state, target, ally } = sovereignState();
  const view = getGeneratedCampaignView(state);
  assert.ok(view.targets.some((entry) => entry.regionId === target.id));
  assert.ok(view.allies.some((entry) => entry.nationId === ally.id));
  state = requestAlliedContingent(state, ally.id);
  assert.equal(state.player.generatedCampaign.promisedAllies[0].nationId, ally.id);
});

test("a generated campaign stores two fronts routes supplies and a real siege decision", () => {
  let { state, target, ally } = sovereignState("campaign-siege");
  state = requestAlliedContingent(state, ally.id);
  const wealthBefore = state.player.metrics.wealth;
  state = startGeneratedCampaign(state, { targetRegionId: target.id, objectiveId: "limited_annexation", commanderIds: ["player", "dario"], allyNationIds: [ally.id] });
  const active = state.player.generatedCampaign.active;
  assert.equal(active.targetRegionId, target.id);
  assert.equal(active.fronts.length, 2);
  assert.ok(active.fronts.every((front) => front.routeRegionIds.includes(target.id)));
  assert.ok(active.armies.some((army) => army.allyNationId === ally.id));
  assert.equal(state.player.metrics.wealth, wealthBefore - 34);
  assert.equal(active.targetRegionName, target.name);
  state = advanceGeneratedCampaign(state);
  state = advanceGeneratedCampaign(state);
  assert.equal(state.player.generatedCampaign.active.phase, "siege_decision");
  assert.throws(() => advanceGeneratedCampaign(state), /攻城方針/);
  state = decideGeneratedSiege(state, "blockade");
  assert.equal(state.player.generatedCampaign.active.siegeDecisionId, "blockade");
});

test("victory requires explicit peace and limited annexation transfers the live region", () => {
  let { state, target } = sovereignState("campaign-peace");
  state = startGeneratedCampaign(state, { targetRegionId: target.id, objectiveId: "limited_annexation", commanderIds: ["player", "dario"] });
  state = advanceGeneratedCampaign(state);
  state = advanceGeneratedCampaign(state);
  state = decideGeneratedSiege(state, "assault");
  state = advanceGeneratedCampaign(state);
  while (state.player.generatedCampaign.active?.phase === "rebuilding") state = advanceGeneratedCampaign(state);
  assert.equal(state.player.generatedCampaign.active.phase, "peace_decision");
  const beforeOwner = state.generatedWorld.regionalDomains.regionStates[target.id].nationId;
  const frozen = structuredClone(state);
  assert.throws(() => settleGeneratedCampaign(state, "limited_annexation", { confirmIrreversible: false }), /確認/);
  assert.deepEqual(state, frozen);
  state = settleGeneratedCampaign(state, "limited_annexation", { confirmIrreversible: true });
  assert.notEqual(beforeOwner, state.generatedWorld.regionalDomains.regionStates[target.id].nationId);
  assert.equal(state.generatedWorld.regionalDomains.regionStates[target.id].nationId, state.generatedWorld.playerNationId);
  assert.equal(state.player.generatedCampaign.active, null);
  assert.equal(state.player.generatedCampaign.history[0].settlementId, "limited_annexation");
});

test("retreat and defeat preserve losses and create a timed rebuilding path", () => {
  let { state, target } = sovereignState("campaign-retreat");
  state = startGeneratedCampaign(state, { targetRegionId: target.id, objectiveId: "secure_route", commanderIds: ["player", "dario"] });
  state = advanceGeneratedCampaign(state);
  state = retreatGeneratedCampaign(state);
  assert.equal(state.player.generatedCampaign.active.phase, "rebuilding");
  assert.ok(state.player.generatedCampaign.active.armies.some((army) => army.casualties > 0));
  state = advanceGeneratedCampaign(state);
  assert.equal(state.player.generatedCampaign.active, null);
  assert.equal(state.player.generatedCampaign.history[0].outcome, "retreat");
  const relation = state.generatedWorld.geopolitics.relations[[state.generatedWorld.playerNationId, target.nationId].sort().join(":")];
  assert.equal(relation.atWar, false);
  assert.ok(relation.truceMonths >= 6);
  assert.match(state.player.history[0].detail, /損失/);
});

test("monthly AI queues player irreversible war choices instead of executing them", () => {
  const { state } = sovereignState("campaign-ai-approval");
  state.generatedWorld.geopolitics.nationStates[state.generatedWorld.playerNationId].offensiveIntent = 100;
  state.generatedWorld.geopolitics.nationStates[state.generatedWorld.playerNationId].readiness = 100;
  const next = advanceGeneratedCampaignMonth(state);
  assert.equal(next.player.generatedCampaign.active, null);
  assert.ok(next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.type === "generated_campaign_proposal"));
});
