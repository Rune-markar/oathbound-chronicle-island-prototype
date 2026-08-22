import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGeneratedCampaignState } from "../src/generated-campaign-system.js";
import {
  approveGeneratedStrategicDecision,
  getGeneratedWorldView,
} from "../src/generated-world-system.js";
import { createCareerInitialState } from "../src/simulation.js";

const pairKey = (leftId, rightId) => [leftId, rightId].sort().join(":");

function sovereignState(seed) {
  const state = createCareerInitialState({ seed });
  const world = getGeneratedWorldView(state);
  const origin = world.runtime.nations.regions.find((region) => (
    region.neighborIds.some((id) => (
      state.generatedWorld.regionalDomains.regionStates[id].nationId
      !== state.generatedWorld.regionalDomains.regionStates[region.id].nationId
    ))
  ));
  assert.ok(origin, "seed needs a national border region");
  const playerNationId = state.generatedWorld.regionalDomains.regionStates[origin.id].nationId;
  state.generatedWorld.playerNationId = playerNationId;
  state.player.stage = "independent_ruler";
  state.player.sovereign = true;
  state.player.affiliation = { nationId: playerNationId, liegeId: null, liegeName: null };
  state.player.householdRetainers = ["dario"];
  state.player.metrics.wealth = 100;
  state.generatedWorld.expeditionRegionId = origin.id;
  const target = origin.neighborIds
    .map((id) => world.runtime.regionById.get(id))
    .find((region) => state.generatedWorld.regionalDomains.regionStates[region.id].nationId !== playerNationId);
  assert.ok(target, "seed needs a foreign neighboring region");
  normalizeGeneratedCampaignState(state);
  return { state, target, playerNationId, targetNationId: state.generatedWorld.regionalDomains.regionStates[target.id].nationId };
}

function addApproval(state, pullId, targetNationId) {
  const decision = {
    id: `strategic-approval-${state.year}-${state.month}-${state.generatedWorld.playerNationId}-${pullId}`,
    period: `${state.year}-${state.month}`,
    nationId: state.generatedWorld.playerNationId,
    targetNationId,
    pullId,
    title: `承認待ち・${pullId}`,
    summary: "主権者の承認を待つ。",
  };
  state.generatedWorld.pendingStrategicDecisions.push(decision);
  return decision;
}

test("limited-war approval starts one real generated campaign and consumes only its pending decision", () => {
  const { state, target, playerNationId, targetNationId } = sovereignState("strategic-approval-limited-war");
  const approval = addApproval(state, "limited_war", targetNationId);
  state.generatedWorld.pendingStrategicDecisions.push({ id: "unrelated", type: "external_decision" });
  const source = structuredClone(state);

  assert.throws(() => approveGeneratedStrategicDecision(state, approval.id, {
    targetRegionId: target.id,
    objectiveId: "full_annexation",
    commanderIds: ["player", "dario"],
  }), /完全併合/);
  assert.deepEqual(state, source);
  const next = approveGeneratedStrategicDecision(state, approval.id, {
    targetRegionId: target.id,
    commanderIds: ["player", "dario"],
  });

  assert.deepEqual(state, source);
  assert.equal(next.player.generatedCampaign.active.targetRegionId, target.id);
  assert.equal(next.player.generatedCampaign.active.targetNationId, targetNationId);
  assert.equal(next.player.generatedCampaign.active.objectiveId, "secure_route");
  assert.equal(next.player.metrics.wealth, 75);
  const relation = next.generatedWorld.geopolitics.relations[pairKey(playerNationId, targetNationId)];
  assert.equal(relation.atWar, true);
  assert.equal(relation.warMonths, 1);
  assert.equal(next.generatedWorld.worldWars.activeWars.some((war) => war.relationKey === pairKey(playerNationId, targetNationId)), false);
  assert.equal(next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.id === approval.id), false);
  assert.equal(next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.id === "unrelated"), true);
  assert.equal(next.generatedWorld.geopolitics.events.filter((event) => event.pullId === "limited_war" && event.nationId === playerNationId).length, 1);
  assert.throws(() => approveGeneratedStrategicDecision(next, approval.id), /承認待ち/);
});

test("limited-war approval refuses an existing same-pair world-war ledger without changing the save", () => {
  const { state, target, playerNationId, targetNationId } = sovereignState("strategic-approval-duplicate-war");
  const approval = addApproval(state, "limited_war", targetNationId);
  state.generatedWorld.worldWars.activeWars.push({
    id: "world-war:existing",
    relationKey: pairKey(playerNationId, targetNationId),
    attackerNationId: playerNationId,
    defenderNationId: targetNationId,
  });
  const source = structuredClone(state);

  assert.throws(() => approveGeneratedStrategicDecision(state, approval.id, {
    targetRegionId: target.id,
    commanderIds: ["player", "dario"],
  }), /すでに進行中/);
  assert.deepEqual(state, source);
});

test("seek-ceasefire approval creates one outgoing offer while keeping war ledgers active", () => {
  const { state, playerNationId, targetNationId } = sovereignState("strategic-approval-seek-ceasefire");
  const key = pairKey(playerNationId, targetNationId);
  state.generatedWorld.geopolitics.relations[key].atWar = true;
  state.generatedWorld.geopolitics.relations[key].warMonths = 4;
  const approval = addApproval(state, "seek_ceasefire", targetNationId);
  const source = structuredClone(state);

  const next = approveGeneratedStrategicDecision(state, approval.id);

  assert.deepEqual(state, source);
  assert.equal(next.generatedWorld.geopolitics.relations[key].atWar, true);
  assert.deepEqual(next.generatedWorld.geopolitics.relations[key].ceasefireOffer, {
    from: playerNationId,
    to: targetNationId,
    monthsRemaining: 3,
  });
  assert.equal(next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.id === approval.id), false);
  const events = next.generatedWorld.geopolitics.events.filter((event) => event.pullId === "seek_ceasefire" && event.nationId === playerNationId);
  assert.equal(events.length, 1);
  assert.equal(events[0].outcome, "proposal_sent");
});

test("accept-ceasefire approval closes both a generated campaign and a legacy duplicate world-war ledger", () => {
  let { state, target, playerNationId, targetNationId } = sovereignState("strategic-approval-accept-ceasefire");
  const limitedApproval = addApproval(state, "limited_war", targetNationId);
  state = approveGeneratedStrategicDecision(state, limitedApproval.id, {
    targetRegionId: target.id,
    commanderIds: ["player", "dario"],
  });
  const key = pairKey(playerNationId, targetNationId);
  state.generatedWorld.geopolitics.relations[key].ceasefireOffer = {
    from: targetNationId,
    to: playerNationId,
    monthsRemaining: 2,
  };
  state.generatedWorld.worldWars.activeWars.push({
    id: "world-war:legacy-duplicate",
    relationKey: key,
    attackerNationId: playerNationId,
    defenderNationId: targetNationId,
    objectiveId: "secure_corridor",
    objectiveName: "国境通商路の確保",
    phase: "campaigning",
    startedPeriod: `${state.year}-${state.month}`,
    targetRegionId: target.id,
    attacker: { initialStrength: 500, strength: 480, supply: 60, morale: 55, casualties: 20 },
    defender: { initialStrength: 480, strength: 465, supply: 58, morale: 52, casualties: 15 },
    fronts: [],
    log: [],
  });
  state.generatedWorld.pendingStrategicDecisions.push({
    id: "generated-world-war-response:legacy-duplicate",
    type: "generated_world_war_response",
    worldWarId: "world-war:legacy-duplicate",
    title: "侵攻への対応",
  });
  const approval = addApproval(state, "accept_ceasefire", targetNationId);
  const source = structuredClone(state);

  const next = approveGeneratedStrategicDecision(state, approval.id);

  assert.deepEqual(state, source);
  const relation = next.generatedWorld.geopolitics.relations[key];
  assert.equal(relation.atWar, false);
  assert.equal(relation.warMonths, 0);
  assert.equal(relation.truceMonths, 12);
  assert.equal(relation.ceasefireOffer, null);
  assert.equal(next.player.generatedCampaign.active, null);
  assert.equal(next.player.generatedCampaign.history[0].settlementId, "ceasefire");
  assert.equal(next.generatedWorld.worldWars.activeWars.some((war) => war.relationKey === key), false);
  const closedWar = next.generatedWorld.worldWars.history.find((war) => war.id === "world-war:legacy-duplicate");
  assert.equal(closedWar.settlementId, "negotiated_ceasefire");
  assert.equal(closedWar.phase, "complete");
  assert.equal(next.generatedWorld.worldWars.events.filter((event) => event.id === "world-war:legacy-duplicate:317-4:ceasefire").length, 1);
  assert.equal(next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.id === approval.id), false);
  assert.equal(next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.worldWarId === "world-war:legacy-duplicate"), false);
  assert.match(next.player.history[0].detail, /国境を変えず/);
});

test("accept-ceasefire approval requires a live incoming offer and preserves pending on failure", () => {
  const { state, playerNationId, targetNationId } = sovereignState("strategic-approval-invalid-accept");
  const key = pairKey(playerNationId, targetNationId);
  state.generatedWorld.geopolitics.relations[key].atWar = true;
  const approval = addApproval(state, "accept_ceasefire", targetNationId);
  const source = structuredClone(state);

  assert.throws(() => approveGeneratedStrategicDecision(state, approval.id), /有効な停戦案/);
  assert.deepEqual(state, source);
});
