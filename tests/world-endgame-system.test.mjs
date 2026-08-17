import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceCareerMonth,
  createCareerInitialState,
  getWorldEndgameStatus,
  performWorldEndgameAction,
  startNationalReformPackage,
} from "../src/simulation.js";

function makeSovereign(state, governmentFormId = "empire") {
  state.player.stage = "independent_ruler";
  state.player.sovereign = true;
  state.player.governmentFormId = governmentFormId;
  state.player.title = governmentFormId === "federation" ? "連邦議長" : "皇帝";
  state.player.metrics.legitimacy = 80;
  state.legitimacy = 80;
  Object.values(state.cities).forEach((city) => { city.resources.money = 100; city.resources.support = 75; });
  Object.values(state.foreignStates).forEach((country) => { country.relation = 25; });
  return state;
}

function makeCentralAuthorityComplete(state) {
  state.administration.authorities.forEach((authority) => {
    const central = authority.holderEntityId === "central_court";
    authority.legalShare = central ? 99.5 : 0.5;
    authority.practicalShare = central ? 99.5 : 0.5;
  });
  Object.keys(state.administration.capabilityInvestment).forEach((key) => { state.administration.capabilityInvestment[key] = 100; });
  state.administration.grievances = [];
  Object.values(state.administration.powerEntities).forEach((entity) => { entity.bureaucraticAutonomy = 0; });
  Object.values(state.cities).forEach((city) => {
    city.administration.integration = 100;
    city.administration.registerCoverage = 100;
    city.internal.administrativeEfficiency = 100;
    city.internal.corruption = 0;
    city.resources.support = 100;
    city.resources.security = 100;
    city.military.training = 100;
    city.facilities.office.level = 8;
    city.facilities.road.level = 8;
    city.facilities.road.condition = 100;
  });
  state.intelNetwork = 100;
  state.issues.standards.status = "resolved";
  state.centralizationCampaign.ending = { id: "service_bureaucratic_state", name: "奉仕官僚国家" };
}

function controlGeneratedWorld(state) {
  Object.values(state.generatedWorld.regionalDomains.regionStates).forEach((region) => { region.nationId = state.generatedWorld.playerNationId; });
}

function establishGeneratedConsent(state) {
  const playerNationId = state.generatedWorld.playerNationId;
  Object.entries(state.generatedWorld.geopolitics.relations).forEach(([key, relation]) => {
    if (!key.split(":").includes(playerNationId)) return;
    relation.relation = 25;
    relation.atWar = false;
  });
}

test("legacy career saves receive an empty versioned world-endgame ledger", () => {
  const state = createCareerInitialState({ seed: "endgame-legacy" });
  assert.equal(state.worldEndgame.schemaVersion, 1);
  assert.deepEqual(state.worldEndgame.completedStepIds, []);
  assert.equal(state.worldEndgame.ending, null);
});

test("career month advancement actually progresses national reform and centralization systems", () => {
  let state = makeSovereign(createCareerInitialState({ seed: "endgame-career-month" }));
  state = startNationalReformPackage(state, {
    systemId: "population_land_knowledge",
    regionIds: ["selene"],
    methodId: "absorb",
    budgetId: "standard",
    officerId: "edras",
    concessionId: "local_offices",
  });
  const before = state.centralizationCampaign.reforms[0].cells[0].progress;
  const leviathanMonth = state.leviathan.cycleMonth;
  state = advanceCareerMonth(state);
  assert.ok(state.centralizationCampaign.reforms[0].cells[0].progress > before);
  assert.equal(state.leviathan.cycleMonth, (leviathanMonth + 1) % 360);
});

test("the rational ending requires lived consolidation history and completes in three irreversible monthly decisions", () => {
  let state = makeSovereign(createCareerInitialState({ seed: "endgame-rational" }));
  makeCentralAuthorityComplete(state);
  controlGeneratedWorld(state);
  state.centralizationCampaign.reforms.push({ id: "iron-reform", status: "completed", methodId: "eliminate", concessionId: "none", transferResults: [], cells: [], systemId: "fiscal_unification" });
  state.centralizationCampaign.historyPolicies.push({ id: "hidden-charter", policyId: "suppress_records" });
  let status = getWorldEndgameStatus(state);
  const route = status.routes.find((entry) => entry.id === "rational_empire");
  assert.equal(route.eligible, true);
  assert.ok(status.ledger.consolidated.some((entry) => entry.name === "旧権力の排除"));
  state = performWorldEndgameAction(state, "found_world_empire");
  assert.throws(() => performWorldEndgameAction(state, "defeat_leviathan"), /一か月に一件/);
  state.turn += 1;
  state = performWorldEndgameAction(state, "defeat_leviathan");
  state.turn += 1;
  state = performWorldEndgameAction(state, "accept_goddess");
  assert.equal(state.worldEndgame.leviathanResolution, "defeated");
  assert.equal(state.worldEndgame.goddessResolution, "accepted");
  assert.equal(state.worldEndgame.ending.routeId, "rational_empire");
  assert.ok(state.history.events.some((entry) => entry.type === "world_endgame"));
});

test("the plural ending reads concrete agreements across four systems instead of a generic goodness score", () => {
  let state = makeSovereign(createCareerInitialState({ seed: "endgame-plural" }), "federation");
  establishGeneratedConsent(state);
  state.centralizationCampaign.reforms.push({ id: "covenanted-reform", status: "completed", methodId: "conciliate", concessionId: "local_offices", transferResults: [], cells: [], systemId: "population_land_knowledge" });
  state.centralizationCampaign.historyPolicies.push(
    { id: "recognized-charter", policyId: "recognize_privileges" },
    { id: "shared-record", policyId: "local_tradition_compromise" },
  );
  state.player.estatePolitics.projects["shared-road"] = { id: "shared-road", projectName: "街道網", politicalDecisionId: "compromise", status: "completed" };
  state.leviathan.policyId = "international_cooperation";
  let status = getWorldEndgameStatus(state);
  const route = status.routes.find((entry) => entry.id === "plural_federation");
  assert.equal(route.eligible, true);
  assert.equal(status.ledger.preservedSources, 4);
  assert.ok(status.ledger.preserved.some((entry) => entry.source === "所領政治"));
  assert.ok(status.ledger.preserved.some((entry) => entry.source === "リヴァイアサン政策"));
  state = performWorldEndgameAction(state, "ratify_world_federation");
  state.turn += 1;
  state = performWorldEndgameAction(state, "reconcile_leviathan");
  state.turn += 1;
  state = performWorldEndgameAction(state, "refuse_goddess");
  assert.equal(state.worldEndgame.leviathanResolution, "reconciled");
  assert.equal(state.worldEndgame.goddessResolution, "refused");
  assert.equal(state.worldEndgame.ending.routeId, "plural_federation");
  assert.equal(Object.hasOwn(status.ledger, "goodness"), false);
});

test("committing one sovereignty route permanently closes the other", () => {
  let state = makeSovereign(createCareerInitialState({ seed: "endgame-route-lock" }), "federation");
  establishGeneratedConsent(state);
  state.centralizationCampaign.reforms.push({ id: "covenanted-reform", status: "completed", methodId: "conciliate", concessionId: "local_offices", transferResults: [], cells: [], systemId: "population_land_knowledge" });
  state.centralizationCampaign.historyPolicies.push({ id: "recognized-charter", policyId: "recognize_privileges" }, { id: "shared-record", policyId: "local_tradition_compromise" });
  state.player.estatePolitics.projects["shared-road"] = { id: "shared-road", politicalDecisionId: "compromise", status: "completed" };
  state.leviathan.policyId = "local_councils";
  state = performWorldEndgameAction(state, "ratify_world_federation");
  const status = getWorldEndgameStatus(state);
  assert.equal(status.routes.find((entry) => entry.id === "rational_empire").lockedByOtherRoute, true);
  assert.throws(() => performWorldEndgameAction({ ...state, turn: state.turn + 1 }, "found_world_empire"), /別の世界主権原理/);
});
