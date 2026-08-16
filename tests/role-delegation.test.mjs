import test from "node:test";
import assert from "node:assert/strict";

import {
  acceptServiceInvitation,
  advanceCareerMonth,
  advanceLifeToRealmMonth,
  createCareerInitialState,
  getDelegationCandidates,
  getRoleDelegation,
  normalizeWarState,
  performCareerAction,
  performVillageAction,
  reassignDelegatedRole,
  startFiefProject,
} from "../src/simulation.js";

function reachCommander() {
  let state = createCareerInitialState();
  const village = { id: "test-village", name: "試験村" };
  state = performVillageAction(state, village, "accept_request");
  state = performVillageAction(state, village, "recruit_companion");
  state = performVillageAction(state, village, "complete_request");
  state = performVillageAction(state, village, "report_request");
  state = performVillageAction(state, village, "receive_reward");
  state = performVillageAction(state, village, "accept_request");
  state = performVillageAction(state, village, "complete_request");
  state = acceptServiceInvitation(state, "service-chance_rescue");
  return performCareerAction(state, "fulfill_order");
}

function reachLord(options = {}) {
  let state = performCareerAction(reachCommander(), "command_campaign", {
    successorId: options.successorId ?? "dario",
    mandateId: options.mandateId ?? "defensive",
    authorityId: options.authorityId ?? "standard",
  });
  state = startFiefProject(state, { projectId: "patrol", territoryId: "orta", officerId: "player" });
  state = advanceLifeToRealmMonth(state);
  return performCareerAction(state, "earn_lordship");
}

test("昇進時に旧役割を仲間と担当組織へ引き継ぐ", () => {
  const commander = reachCommander();
  assert.deepEqual(getDelegationCandidates(commander, "commander").map((officer) => officer.id), ["dario", "edras", "mara", "gaius", "sera"]);

  const lord = reachLord();
  const overview = getRoleDelegation(lord);
  const assignment = overview.assignments[0];

  assert.equal(lord.player.stage, "lord");
  assert.equal(assignment.roleId, "commander");
  assert.equal(assignment.holderId, "dario");
  assert.equal(assignment.mandateId, "defensive");
  assert.equal(assignment.organization.id, "border_company");
  assert.equal(assignment.organization.commanderId, "dario");
  assert.equal(overview.promotionHistory[0].fromRoleId, "commander");
});

test("担当者は個性と現地状況から自律行動し、成長と簡潔な報告を残す", () => {
  const base = reachLord({ mandateId: "initiative" });
  const localPowerBefore = base.administration.powerEntities["orta:military"].politicalAuthority;

  const darioState = advanceCareerMonth(base);
  const darioReport = darioState.player.lastDelegationReports[0];
  const darioAssignment = getRoleDelegation(darioState).assignments[0];

  const seraState = advanceCareerMonth(reassignDelegatedRole(base, "delegation-unit-border_company", "sera"));
  const seraReport = seraState.player.lastDelegationReports[0];

  assert.equal(darioReport.requiresDecision, false);
  assert.equal(darioReport.actionId, "organization");
  assert.equal(seraReport.actionId, "intelligence");
  assert.notEqual(darioReport.outcome, seraReport.outcome);
  assert.equal(darioAssignment.experience, 2);
  assert.ok(darioAssignment.localInfluence > 0);
  assert.ok(darioState.officers.dario.merit > base.officers.dario.merit);
  assert.ok(darioState.administration.powerEntities["orta:military"].politicalAuthority > localPowerBefore);
});

test("重大事項は権限外として上申され、通常処理や成長を行わない", () => {
  const state = reachLord();
  state.foreignStates.valka.hostility = 90;
  const next = advanceCareerMonth(state);
  const report = next.player.lastDelegationReports[0];
  const assignment = getRoleDelegation(next).assignments[0];

  assert.equal(report.actionId, "escalation");
  assert.equal(report.reason, "war_authority");
  assert.equal(report.requiresDecision, true);
  assert.equal(assignment.experience, 0);
  assert.equal(next.war, null);
});

test("さらに昇進しても下位組織と旧領は消えず、保存復元後も継続する", () => {
  let state = performCareerAction(reachLord(), "consolidate_power");
  assert.equal(getDelegationCandidates(state, "lord").some((officer) => officer.id === "dario"), false);
  state = performCareerAction(state, "request_second_fief", {
    successorId: "gaius",
    mandateId: "local_welfare",
    authorityId: "broad",
  });

  assert.equal(state.player.stage, "multi_lord");
  assert.equal(state.roleDelegation.organizations.border_company.commanderId, "dario");
  assert.equal(state.cities.orta.governorId, "gaius");
  assert.deepEqual(Object.values(state.roleDelegation.assignments).map((assignment) => assignment.roleId).sort(), ["commander", "lord"]);

  const restored = normalizeWarState(JSON.parse(JSON.stringify(state)));
  const overview = getRoleDelegation(restored);
  assert.equal(overview.assignments.length, 2);
  assert.equal(overview.assignments.find((assignment) => assignment.roleId === "commander").organization.commanderId, "dario");
  assert.equal(overview.assignments.find((assignment) => assignment.roleId === "lord").holderId, "gaius");
});

test("独立時は地方領主の実務も委任し、選んだ国家形態の最高位称号を得る", () => {
  let state = performCareerAction(reachLord(), "consolidate_power");
  state = performCareerAction(state, "request_second_fief", { successorId: "gaius" });
  state = performCareerAction(state, "consolidate_power");
  state = performCareerAction(state, "declare_independence", {
    successorId: "edras",
    mandateId: "balanced",
    authorityId: "standard",
    governmentFormId: "theocracy",
  });

  const overview = getRoleDelegation(state);
  assert.equal(state.player.stage, "independent_ruler");
  assert.equal(state.player.title, "教皇");
  assert.equal(state.player.governmentFormId, "theocracy");
  assert.deepEqual(overview.assignments.map((assignment) => assignment.roleId).sort(), ["commander", "lord", "multi_lord"]);
  assert.equal(overview.assignments.find((assignment) => assignment.roleId === "multi_lord").holderId, "edras");
  assert.equal(state.cities.nereia.governorId, "edras");
});
