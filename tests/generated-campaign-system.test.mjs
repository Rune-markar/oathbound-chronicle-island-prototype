import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceGeneratedCampaign,
  advanceGeneratedCampaignMonth,
  decideGeneratedSiege,
  getGeneratedCampaignView,
  interveneGeneratedWorldWar,
  normalizeGeneratedCampaignState,
  requestAlliedContingent,
  respondGeneratedWorldWar,
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

test("a generated campaign uses the shared core for three to five fronts, supplies, and a real siege decision", () => {
  let { state, target, ally } = sovereignState("campaign-siege");
  state = requestAlliedContingent(state, ally.id);
  const wealthBefore = state.player.metrics.wealth;
  state = startGeneratedCampaign(state, { targetRegionId: target.id, objectiveId: "limited_annexation", commanderIds: ["player", "dario"], allyNationIds: [ally.id] });
  const active = state.player.generatedCampaign.active;
  assert.equal(active.targetRegionId, target.id);
  assert.ok(active.fronts.length >= 3 && active.fronts.length <= 5);
  assert.equal(active.engineId, "generated-war-core-v1");
  assert.ok(active.fronts.every((front) => front.routeRegionIds.length >= 2));
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

test("a sovereign can reinforce or mediate a known AI war through the shared war ledger", () => {
  const { state } = sovereignState("campaign-intervention");
  const world = getGeneratedWorldView(state);
  const participants = world.runtime.nations.nations.filter((nation) => nation.id !== state.generatedWorld.playerNationId).slice(0, 2);
  const target = world.runtime.nations.regions.find((region) => region.nationId === participants[1].id);
  const war = { id: "world-war:intervention", attackerNationId: participants[0].id, defenderNationId: participants[1].id, relationKey: [participants[0].id, participants[1].id].sort().join(":"), phase: "campaigning", targetRegionId: target.id, attacker: { strength: 500, initialStrength: 500, supply: 50, morale: 50 }, defender: { strength: 500, initialStrength: 500, supply: 50, morale: 50 }, fronts: [{ id: "main", originRegionId: target.neighborIds[0] ?? target.id, targetRegionId: target.id }], log: [] };
  const event = { id: "known-intervention-war", worldWarId: war.id, type: "generated_world_war", nationId: war.attackerNationId, targetNationId: war.defenderNationId, regionId: target.id, period: "317-4", title: "既知の戦争", summary: "戦争中" };
  state.generatedWorld.worldWars = { schemaVersion: 2, activeWars: [war], history: [], events: [event] };
  state.generatedWorld.intelligence.entries.push({ eventId: event.id, learnedPeriod: "317-4", type: "rumor", label: "噂" });
  const before = state.player.metrics.wealth;
  const next = interveneGeneratedWorldWar(state, war.id, "support_defender");
  assert.equal(next.player.metrics.wealth, before - 12);
  assert.equal(next.generatedWorld.worldWars.activeWars[0].interveners[0].side, "defender");
  assert.ok(next.generatedWorld.worldWars.activeWars[0].defender.strength > 500);
});

test("a protected sovereign war leaves awaiting-player state only after an explicit response", () => {
  const { state, target } = sovereignState("campaign-war-response");
  const playerId = state.generatedWorld.playerNationId;
  state.generatedWorld.worldWars = { schemaVersion: 2, activeWars: [{ id: "world-war:player-response", attackerNationId: target.nationId, defenderNationId: playerId, relationKey: [target.nationId, playerId].sort().join(":"), phase: "awaiting_player", requiresPlayerDecision: true, targetRegionId: state.generatedWorld.expeditionRegionId, attacker: { strength: 500 }, defender: { strength: 500 }, fronts: [{ id: "main", originRegionId: target.id, targetRegionId: state.generatedWorld.expeditionRegionId }], log: [] }], history: [], events: [] };
  state.generatedWorld.pendingStrategicDecisions.push({ id: "decision", worldWarId: "world-war:player-response" });
  const next = respondGeneratedWorldWar(state, "world-war:player-response", "mobilize");
  assert.equal(next.generatedWorld.worldWars.activeWars[0].phase, "mobilizing");
  assert.equal(next.generatedWorld.worldWars.activeWars[0].requiresPlayerDecision, false);
  assert.equal(next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.worldWarId === "world-war:player-response"), false);
});
