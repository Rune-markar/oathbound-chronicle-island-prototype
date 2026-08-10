import test from "node:test";
import assert from "node:assert/strict";

import {
  CENTRALIZATION_STAGES,
  HISTORY_POLICIES,
  LEVIATHAN_POLICIES,
  NATIONAL_REFORM_SYSTEMS,
  WORLD,
  chooseHistoryPolicy,
  chooseLeviathanPolicy,
  createInitialState,
  getCentralizationCampaignStatus,
  getCentralizationResult,
  getHistoricalRuleEffects,
  getLeviathanStatus,
  startNationalReformPackage,
} from "../src/simulation.js";
import {
  advanceCentralizationCampaign,
  advanceLeviathanCycle,
  chooseLocalPowerResponse,
  resolveNationalReforms,
} from "../src/centralization-campaign.js";
import { auditHistoricalEffectBindings } from "../src/history-model.js";

function makeCentralAuthorityComplete(state) {
  state.administration.authorities.forEach((authority) => {
    if (authority.holderEntityId === "central_court") {
      authority.legalShare = 99.5;
      authority.practicalShare = 99.5;
    } else {
      authority.legalShare = 0.5;
      authority.practicalShare = 0.5;
    }
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
}

test("the seven national stages describe unlocks, reforms, barriers, upkeep, reactions, and recovery", () => {
  assert.deepEqual(CENTRALIZATION_STAGES.map((stage) => stage.name), [
    "盟約王国", "可視化国家", "規格統一国家", "官僚制国家", "軍事・司法統一国家", "完全集権国家", "集権後危機",
  ]);
  assert.ok(CENTRALIZATION_STAGES.every((stage) => (
    stage.unlock && stage.requiredReforms.length && stage.politicalBarrier && stage.upkeep && stage.localReaction && stage.recovery
  )));
});

test("a new game exposes the current stage and largest barrier while keeping Ash Crown as chapter one", () => {
  const state = createInitialState();
  const status = getCentralizationCampaignStatus(state);
  assert.equal(status.currentStage.id, "covenant_kingdom");
  assert.equal(status.largestBarrier.id, "ash_crown_chapter");
  assert.equal(status.chapter.title, "第一章・灰冠峠");
  assert.equal(status.chapter.complete, false);
  assert.equal(status.portfolio.systems.length, 5);
});

test("national reform packages preserve all seventeen internal domains and cannot centralize in one order", () => {
  const state = createInitialState();
  const internalDomains = new Set(Object.values(NATIONAL_REFORM_SYSTEMS).flatMap((system) => system.domains));
  assert.equal(internalDomains.size, 17);
  const before = getCentralizationResult(state);
  const next = startNationalReformPackage(state, {
    systemId: "population_land_knowledge", regionIds: ["selene", "nereia", "orta"],
    methodId: "absorb", budgetId: "standard", officerId: "edras", concessionId: "local_offices",
  });
  const reform = next.centralizationCampaign.reforms[0];
  assert.ok(reform.cells.length >= 8);
  assert.ok(reform.cells.every((cell) => cell.stageIndex === 0 && cell.progress === 0));
  assert.equal(getCentralizationResult(next).complete, false);
  assert.equal(getCentralizationResult(next).resultIndex, before.resultIndex);
});

test("legal authority alone above 95 never satisfies complete centralization", () => {
  const state = createInitialState();
  state.administration.authorities.forEach((authority) => {
    if (authority.holderEntityId === "central_court") authority.legalShare = 96;
    else authority.legalShare = 4;
  });
  const result = getCentralizationResult(state);
  assert.equal(result.requirements.find((requirement) => requirement.id === "final_authority").met, true);
  assert.equal(result.complete, false);
  assert.ok(result.practicalCentralization < 95);
});

test("administrative overload blocks complete centralization even when authority shares are unified", () => {
  const state = createInitialState();
  makeCentralAuthorityComplete(state);
  state.administration.reforms.push({ id: "overload-test", status: "active", temporaryLoad: 100000 });
  const result = getCentralizationResult(state);
  assert.equal(result.requirements.find((requirement) => requirement.id === "capacity").met, false);
  assert.equal(result.complete, false);
});

test("local powers choose distinct compromise and resistance through world state to pressure to manifestation", () => {
  const calm = createInitialState();
  const calmEntity = calm.administration.powerEntities["selene:temple"];
  calmEntity.localSupport = 18;
  calmEntity.historicalLegitimacy = 22;
  calm.administration.privileges.filter((privilege) => privilege.regionId === "selene").forEach((privilege) => { privilege.entrenchment = 18; });
  const accepted = chooseLocalPowerResponse(WORLD, calm, {
    systemId: "bureaucratic_standardization", regionId: "selene", entityId: calmEntity.id,
    methodId: "conciliate", budgetId: "limited", concessionId: "local_offices",
  });

  const hostile = createInitialState();
  const hostileEntity = hostile.administration.powerEntities["orta:military"];
  hostileEntity.localSupport = 96;
  hostileEntity.historicalLegitimacy = 96;
  hostileEntity.militaryPower = 96;
  hostileEntity.foreignContactPotential = 90;
  hostile.administration.grievances.push({ id: "old-war", regionId: "orta", strength: 100, decayRate: 0, createdYear: 200 });
  hostile.administration.privileges.filter((privilege) => privilege.regionId === "orta").forEach((privilege) => { privilege.entrenchment = 100; });
  const resisted = chooseLocalPowerResponse(WORLD, hostile, {
    systemId: "military_unification", regionId: "orta", entityId: hostileEntity.id,
    methodId: "eliminate", budgetId: "priority", concessionId: "none",
  });
  assert.notEqual(accepted.responseId, resisted.responseId);
  assert.ok(["conditional_acceptance", "compensation_demand", "reform_delay"].includes(accepted.responseId));
  assert.ok(["seek_foreign_support", "counter_reform_alliance", "uprising"].includes(resisted.responseId));
  assert.ok(resisted.worldState && resisted.pressure > accepted.pressure && resisted.manifestation);
});

test("generated terrain changes the historical privilege composition within one seed series", () => {
  const lowRelief = createInitialState({ scenarioMode: "generated", seed: "crown-series", plateCount: 4, width: 48, height: 32 });
  const highRelief = createInitialState({ scenarioMode: "generated", seed: "crown-series", plateCount: 20, width: 48, height: 32 });
  assert.equal(lowRelief.scenarioMode, "generated");
  assert.equal(highRelief.scenarioMode, "generated");
  const signature = (state) => JSON.stringify({
    privileges: state.nationFormation.privileges,
    obstacles: state.nationFormation.obstacles,
    cost: state.nationFormation.integrationCost,
  });
  assert.notEqual(signature(lowRelief), signature(highRelief));
  assert.ok(lowRelief.nationFormation.settlements.some((settlement) => settlement.kind === "河川交易都市"));
  assert.ok(lowRelief.nationFormation.pastCrises.length >= 3);
  assert.ok(lowRelief.nationFormation.compromises.length >= 3);
});

test("history policy changes present reform legality, court support, public belief, and resistance", () => {
  const state = createInitialState();
  const before = getHistoricalRuleEffects(state, "orta");
  const recognized = chooseHistoryPolicy(state, "recognize_privileges");
  const after = getHistoricalRuleEffects(recognized, "orta");
  assert.equal(after.privilegeRevocationAllowed, false);
  assert.ok(after.publicBelief > before.publicBelief);
  assert.throws(() => startNationalReformPackage(recognized, {
    systemId: "military_unification", regionIds: ["orta"], methodId: "eliminate",
    budgetId: "standard", officerId: "gaius", concessionId: "none",
  }), /正当化できません/);
  assert.equal(HISTORY_POLICIES.suppress_records.longRisk.includes("情報歪曲"), true);
});

test("rapid uncompensated reform creates persistent backlash instead of a free acceleration", () => {
  let state = createInitialState();
  state.cities.orta.resources.money = 100;
  state = chooseHistoryPolicy(state, "royal_reinterpretation");
  state = startNationalReformPackage(state, {
    systemId: "military_unification", regionIds: ["orta"], methodId: "eliminate",
    budgetId: "priority", officerId: "gaius", concessionId: "none",
  });
  for (let month = 0; month < 40; month += 1) {
    state.turn += 1;
    resolveNationalReforms(WORLD, state);
  }
  assert.ok(state.centralizationCampaign.reforms[0].transferResults.length >= 1);
  assert.ok(state.administration.grievances.some((grievance) => grievance.id.startsWith("grievance-national-reform")));
  assert.ok(state.centralizationCampaign.localResponses.some((response) => response.pressure >= 40));
});

test("conciliate, absorb, and eliminate produce different post-crisis internal power endings", () => {
  const endings = new Map();
  for (const methodId of ["conciliate", "absorb", "eliminate"]) {
    const state = createInitialState();
    makeCentralAuthorityComplete(state);
    state.centralizationCampaign.stageId = "post_centralization_crisis";
    state.centralizationCampaign.highestStageIndex = 6;
    state.centralizationCampaign.crisis = { startedTurn: 1, months: 11, issues: [], history: [] };
    state.centralizationCampaign.reforms.push({
      id: `ending-${methodId}`, systemId: "fiscal_unification", methodId,
      transferResults: Array.from({ length: 8 }, (_, index) => ({ domainId: `domain-${index}` })), status: "completed",
    });
    advanceCentralizationCampaign(WORLD, state);
    endings.set(methodId, state.centralizationCampaign.ending);
  }
  assert.equal(new Set([...endings.values()].map((ending) => ending.id)).size, 3);
  assert.equal(new Set([...endings.values()].map((ending) => ending.powerStructure)).size, 3);
});

test("complete centralization always enters a twelve-month post-centralization crisis before an ending", () => {
  const state = createInitialState();
  makeCentralAuthorityComplete(state);
  state.campaign.ending = { id: "chapter-complete", name: "第一章完了" };
  state.centralizationCampaign.stageId = "military_judicial_state";
  state.centralizationCampaign.highestStageIndex = 4;
  const result = getCentralizationResult(state);
  assert.equal(result.complete, true);
  advanceCentralizationCampaign(WORLD, state);
  assert.equal(state.centralizationCampaign.stageId, "fully_centralized_state");
  assert.equal(state.centralizationCampaign.ending, null);
  state.turn += 1;
  advanceCentralizationCampaign(WORLD, state);
  assert.equal(state.centralizationCampaign.stageId, "post_centralization_crisis");
  assert.ok(state.centralizationCampaign.crisis);
  assert.equal(state.centralizationCampaign.ending, null);
  while (state.centralizationCampaign.crisis.months < 12) {
    state.turn += 1;
    advanceCentralizationCampaign(WORLD, state);
  }
  assert.ok(state.centralizationCampaign.ending);
  assert.ok(state.turn - state.centralizationCampaign.fullCentralizationTurn >= 12);
});

test("Leviathan approach propagates into coastal administration and diplomacy without combat", () => {
  let state = createInitialState();
  state = chooseLeviathanPolicy(state, "international_cooperation");
  assert.equal(LEVIATHAN_POLICIES[state.leviathan.policyId].id, "international_cooperation");
  state.leviathan.cycleMonth = 299;
  const openingMoney = state.cities.nereia.resources.money;
  const openingRelations = Object.fromEntries(Object.entries(state.foreignStates).map(([id, country]) => [id, country.relation]));
  const actions = advanceLeviathanCycle(WORLD, state);
  const status = getLeviathanStatus(state);
  assert.equal(status.id, "passage");
  assert.equal(status.routesClosed, true);
  assert.ok(state.cities.nereia.resources.money < openingMoney);
  assert.ok(actions.some((action) => action.kind === "leviathan"));
  assert.ok(state.history.events.some((event) => event.type === "leviathan_disaster"));
  assert.ok(Object.entries(state.foreignStates).every(([id, country]) => country.relation > openingRelations[id]));
  assert.equal(Object.hasOwn(state, "leviathanBattle"), false);
});

test("historical effects are bound to live institutions, pressures, reforms, or changed state", () => {
  let state = createInitialState();
  assert.deepEqual(auditHistoricalEffectBindings(state), { valid: true, orphanEffects: [] });
  state = chooseHistoryPolicy(state, "local_tradition_compromise");
  state.cities.selene.resources.money = 100;
  state = startNationalReformPackage(state, {
    systemId: "population_land_knowledge", regionIds: ["selene"], methodId: "absorb",
    budgetId: "limited", officerId: "edras", concessionId: "local_offices",
  });
  const audit = auditHistoricalEffectBindings(state);
  assert.equal(audit.valid, true, JSON.stringify(audit.orphanEffects));
});

test("centralization decisions are capped at three per month", () => {
  let state = createInitialState();
  state = chooseHistoryPolicy(state, "local_tradition_compromise");
  state = chooseLeviathanPolicy(state, "national_warning");
  state.cities.selene.resources.money = 100;
  state = startNationalReformPackage(state, {
    systemId: "population_land_knowledge", regionIds: ["selene"], methodId: "absorb",
    budgetId: "limited", officerId: "edras", concessionId: "local_offices",
  });
  assert.throws(() => chooseLeviathanPolicy(state, "international_cooperation"), /3件まで/);
});
