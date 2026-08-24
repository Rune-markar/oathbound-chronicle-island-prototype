import test from "node:test";
import assert from "node:assert/strict";

import {
  CRIMINAL_OPERATION_DEFINITIONS,
  CRIMINAL_ORGANIZATION_SCHEMA_VERSION,
  advanceCareerMonth,
  advanceCriminalOrganizationMonth,
  createCareerInitialState,
  distributeCriminalOrganizationProfits,
  formCriminalOrganization,
  fundCriminalOrganization,
  getCriminalOrganizationView,
  getCriminalRecruitCandidates,
  issueCriminalOperationOrder,
  normalizeCriminalOrganizationState,
  recruitCriminalMember,
  resolveCriminalOperationReport,
  resolveCriminalOrganizationDecision,
  withdrawCriminalOrganizationFunds,
} from "../src/simulation.js";

function preparedState(seed = "criminal-organization-test") {
  const state = createCareerInitialState({ seed: "criminal-organization-test", width: 32, height: 20, plateCount: 7, nationCount: 7 });
  state.generatedWorld.seed = seed;
  const jurisdictionId = state.generatedWorld.expeditionRegionId;
  state.player.locationId = jurisdictionId;
  state.player.metrics.wealth = 20;
  state.player.crime.incidents.push({
    id: "solo-proof",
    type: "theft",
    severity: "minor",
    outcome: "success_hidden",
    detected: false,
    resolved: false,
    jurisdiction: { id: jurisdictionId, name: "試験地方" },
    historyText: "単独で盗みを成功させた。",
  });
  state.player.crime.contacts.push({
    id: `${jurisdictionId}-broker`,
    role: "broker",
    jurisdictionId,
    jurisdictionName: "試験地方",
    trust: 10,
  });
  return { state, jurisdictionId };
}

function formedState(seed = "formed-criminal-organization") {
  const { state: initial, jurisdictionId } = preparedState(seed);
  const candidates = getCriminalRecruitCandidates(initial, { jurisdictionId, jurisdictionName: "試験地方" });
  let state = recruitCriminalMember(initial, { candidateId: candidates[0].id, jurisdictionId });
  state = recruitCriminalMember(state, { candidateId: candidates[1].id, jurisdictionId });
  state = formCriminalOrganization(state, { jurisdictionId, name: "灰影団" });
  return { state, jurisdictionId };
}

test("legacy saves gain a versioned solo organization without losing existing crime data", () => {
  const { state } = preparedState();
  const before = structuredClone(state);
  delete state.player.crime.organization;
  const normalized = normalizeCriminalOrganizationState(state);

  assert.notEqual(normalized, state);
  assert.equal(normalized.player.crime.organization.schemaVersion, CRIMINAL_ORGANIZATION_SCHEMA_VERSION);
  assert.equal(normalized.player.crime.organization.stage, "solo");
  assert.deepEqual(normalized.player.crime.organization.members, []);
  assert.deepEqual(normalized.player.crime.incidents, before.player.crime.incidents);
  assert.equal(state.player.crime.organization, undefined);
});

test("recruitment requires solo experience and a local broker and stays deterministic", () => {
  const { state, jurisdictionId } = preparedState("recruit-candidates");
  const context = { jurisdictionId, jurisdictionName: "試験地方" };
  const first = getCriminalRecruitCandidates(state, context);
  const second = getCriminalRecruitCandidates(structuredClone(state), context);
  assert.deepEqual(first, second);
  assert.ok(first.length >= 3);
  assert.ok(first.every((candidate) => candidate.fee >= 1 && candidate.specialties.length >= 2));
  assert.equal(new Set(first.map((candidate) => candidate.name)).size, first.length);

  const noExperience = structuredClone(state);
  noExperience.player.crime.incidents = [];
  assert.deepEqual(getCriminalRecruitCandidates(noExperience, context), []);
  const noBroker = structuredClone(state);
  noBroker.player.crime.contacts = [];
  assert.deepEqual(getCriminalRecruitCandidates(noBroker, context), []);
});

test("two recruited specialists can form an organization while duplicate or unaffordable hires fail immutably", () => {
  const { state: initial, jurisdictionId } = preparedState("recruit-and-form");
  const initialOrganization = structuredClone(initial.player.crime.organization);
  const candidates = getCriminalRecruitCandidates(initial, { jurisdictionId });
  let state = recruitCriminalMember(initial, { candidateId: candidates[0].id, jurisdictionId });
  assert.equal(state.player.crime.organization.members.length, 1);
  assert.deepEqual(initial.player.crime.organization, initialOrganization);
  assert.throws(() => recruitCriminalMember(state, { candidateId: candidates[0].id, jurisdictionId }), /加入済み/);

  state = recruitCriminalMember(state, { candidateId: candidates[1].id, jurisdictionId });
  const formed = formCriminalOrganization(state, { jurisdictionId, name: "灰影団" });
  assert.equal(formed.player.crime.organization.stage, "crew");
  assert.equal(formed.player.crime.organization.name, "灰影団");
  assert.equal(formed.player.crime.organization.treasury, 2);
  assert.equal(state.player.crime.organization.stage, "solo");

  const poor = structuredClone(initial);
  poor.player.metrics.wealth = 0;
  const snapshot = structuredClone(poor);
  assert.throws(() => recruitCriminalMember(poor, { candidateId: candidates[0].id, jurisdictionId }), /財産/);
  assert.deepEqual(poor, snapshot);
});

test("a proven crew becomes a criminal organization as soon as its fourth active member joins", () => {
  const { state: formed, jurisdictionId } = formedState("organization-promotion");
  formed.player.metrics.wealth = 20;
  formed.player.crime.organization.completedOrders = [
    { id: "completed-1" },
    { id: "completed-2" },
    { id: "completed-3" },
  ];
  formed.player.crime.organization.influence = 15;
  const candidates = getCriminalRecruitCandidates(formed, { jurisdictionId });
  let state = recruitCriminalMember(formed, { candidateId: candidates[0].id, jurisdictionId });
  assert.equal(state.player.crime.organization.stage, "crew");
  state = recruitCriminalMember(state, { candidateId: candidates[1].id, jurisdictionId });
  assert.equal(state.player.crime.organization.stage, "network");
  assert.equal(getCriminalOrganizationView(state, { jurisdictionId }).stageName, "犯罪組織");
});

test("operation orders reserve distinct personnel and expose role fit, time, cost, reward, and qualitative risk", () => {
  const { state, jurisdictionId } = formedState("operation-order");
  const view = getCriminalOrganizationView(state, { jurisdictionId, jurisdictionName: "試験地方" });
  const extortion = view.operations.find((entry) => entry.type === "extortion");
  assert.equal(extortion.unlocked, true);
  assert.match(extortion.riskLabel, /有利|互角|危険|極めて危険/);
  assert.ok(extortion.durationMonths >= 1);
  assert.ok(extortion.expectedReward.wealth >= 1);
  assert.deepEqual(Object.keys(CRIMINAL_OPERATION_DEFINITIONS).sort(), ["assassination", "extortion", "kidnapping", "robbery", "sabotage", "smuggling"]);

  const [leader, support] = view.availableMembers;
  const ordered = issueCriminalOperationOrder(state, {
    optionId: extortion.id,
    jurisdictionId,
    leaderId: leader.id,
    supportId: support.id,
    approach: "balanced",
  });
  assert.equal(ordered.player.crime.organization.activeOrders.length, 1);
  assert.equal(ordered.player.crime.organization.members.filter((entry) => entry.status === "assigned").length, 2);
  assert.throws(() => issueCriminalOperationOrder(state, {
    optionId: extortion.id,
    jurisdictionId,
    leaderId: leader.id,
    supportId: leader.id,
  }), /別々/);
  const orderedOperations = getCriminalOrganizationView(ordered, { jurisdictionId }).operations;
  assert.ok(orderedOperations.every((entry) => !entry.unlocked));
  assert.match(orderedOperations.find((entry) => entry.type === "extortion").lockedReason, /同時に指示/);
});

test("criminal organization stage can coordinate separate concurrent teams while a crew cannot", () => {
  const { state: formed, jurisdictionId } = formedState("concurrent-organization-orders");
  formed.player.metrics.wealth = 20;
  formed.player.crime.organization.influence = 20;
  formed.player.crime.organization.treasury = 10;
  formed.player.crime.organization.completedOrders = [{ id: "completed-1" }, { id: "completed-2" }, { id: "completed-3" }];
  const candidates = getCriminalRecruitCandidates(formed, { jurisdictionId });
  let state = recruitCriminalMember(formed, { candidateId: candidates[0].id, jurisdictionId });
  state = recruitCriminalMember(state, { candidateId: candidates[1].id, jurisdictionId });
  assert.equal(state.player.crime.organization.stage, "network");

  let view = getCriminalOrganizationView(state, { jurisdictionId });
  const robbery = view.operations.find((entry) => entry.type === "robbery");
  const smuggling = view.operations.find((entry) => entry.type === "smuggling");
  state = issueCriminalOperationOrder(state, {
    optionId: robbery.id,
    jurisdictionId,
    leaderId: view.availableMembers[0].id,
    supportId: view.availableMembers[1].id,
  });
  view = getCriminalOrganizationView(state, { jurisdictionId });
  state = issueCriminalOperationOrder(state, {
    optionId: smuggling.id,
    jurisdictionId,
    leaderId: view.availableMembers[0].id,
    supportId: view.availableMembers[1].id,
  });

  assert.equal(state.player.crime.organization.activeOrders.length, 2);
  assert.equal(new Set(state.player.crime.organization.activeOrders.flatMap((entry) => entry.assignedMemberIds)).size, 4);
  assert.ok(state.player.crime.organization.members.every((entry) => entry.status === "assigned"));
  const networkView = getCriminalOrganizationView(state, { jurisdictionId });
  assert.equal(networkView.activeOrderCount, 2);
  assert.equal(networkView.activeOrderLimit, 3);
});

test("monthly advancement makes an order report-ready and confirmation records a delegated incident", () => {
  const { state: formed, jurisdictionId } = formedState("operation-report");
  const view = getCriminalOrganizationView(formed, { jurisdictionId });
  const option = view.operations.find((entry) => entry.type === "extortion");
  const [leader, support] = view.availableMembers;
  let state = issueCriminalOperationOrder(formed, {
    optionId: option.id,
    jurisdictionId,
    leaderId: leader.id,
    supportId: support.id,
    approach: "bold",
  });
  for (let month = 0; month < option.durationMonths; month += 1) state = advanceCriminalOrganizationMonth(state);
  assert.equal(state.player.crime.organization.activeOrders[0].status, "report_ready");

  const reported = resolveCriminalOperationReport(state, {
    orderId: state.player.crime.organization.activeOrders[0].id,
    outcome: "success_exposed",
  });
  assert.equal(reported.player.crime.organization.activeOrders.length, 0);
  assert.equal(reported.player.crime.organization.completedOrders[0].outcome, "success_exposed");
  assert.equal(reported.player.crime.incidents.at(-1).organizationId, reported.player.crime.organization.id);
  assert.equal(reported.player.crime.incidents.at(-1).perpetrator.id, reported.player.crime.organization.id);
  assert.ok(reported.player.crime.organization.treasury > 0);
  assert.ok(reported.player.crime.organization.members.every((entry) => entry.status === "available"));
});

test("kidnapping creates a disposition choice with distinct ransom, leverage, and release consequences", () => {
  const { state: formed, jurisdictionId } = formedState("kidnapping-choice");
  formed.player.crime.organization.influence = 12;
  const view = getCriminalOrganizationView(formed, { jurisdictionId });
  const option = view.operations.find((entry) => entry.type === "kidnapping");
  assert.equal(option.unlocked, true);
  const [leader, support] = view.availableMembers;
  let state = issueCriminalOperationOrder(formed, { optionId: option.id, jurisdictionId, leaderId: leader.id, supportId: support.id, approach: "cautious" });
  while (state.player.crime.organization.activeOrders[0].status !== "report_ready") state = advanceCriminalOrganizationMonth(state);
  state = resolveCriminalOperationReport(state, { orderId: state.player.crime.organization.activeOrders[0].id, outcome: "success_hidden" });
  const decision = state.player.crime.organization.pendingDecisions[0];
  assert.equal(decision.kind, "captive_disposition");
  assert.deepEqual(decision.options.map((entry) => entry.id), ["ransom", "leverage", "release"]);
  assert.equal(state.player.crime.organization.captives.length, 1);

  const ransom = resolveCriminalOrganizationDecision(state, { decisionId: decision.id, choice: "ransom" });
  assert.equal(ransom.player.crime.organization.pendingDecisions.length, 0);
  assert.equal(ransom.player.crime.organization.captives.length, 0);
  assert.ok(ransom.player.crime.organization.treasury > state.player.crime.organization.treasury);
  assert.ok(ransom.player.crime.heatByJurisdiction[jurisdictionId] > (state.player.crime.heatByJurisdiction[jurisdictionId] ?? 0));

  const leverage = resolveCriminalOrganizationDecision(state, { decisionId: decision.id, choice: "leverage" });
  assert.ok(leverage.player.crime.organization.influence > state.player.crime.organization.influence);
  const release = resolveCriminalOrganizationDecision(state, { decisionId: decision.id, choice: "release" });
  assert.ok(release.player.crime.organization.members.every((entry, index) => entry.loyalty >= state.player.crime.organization.members[index].loyalty));
});

test("delegated capture affects assigned personnel and offers recovery or abandonment without ending the player run", () => {
  const { state: formed, jurisdictionId } = formedState("member-capture");
  formed.player.crime.organization.influence = 20;
  formed.player.crime.organization.treasury = 10;
  const view = getCriminalOrganizationView(formed, { jurisdictionId });
  const assassination = view.operations.find((entry) => entry.type === "assassination");
  const [leader, support] = view.availableMembers;
  let state = issueCriminalOperationOrder(formed, { optionId: assassination.id, jurisdictionId, leaderId: leader.id, supportId: support.id });
  while (state.player.crime.organization.activeOrders[0].status !== "report_ready") state = advanceCriminalOrganizationMonth(state);
  state = resolveCriminalOperationReport(state, { orderId: state.player.crime.organization.activeOrders[0].id, outcome: "captured" });
  assert.equal(state.player.crime.runEnded, false);
  assert.ok(state.player.crime.organization.members.some((entry) => entry.status === "captured"));
  const decision = state.player.crime.organization.pendingDecisions.find((entry) => entry.kind === "member_capture");
  assert.deepEqual(decision.options.map((entry) => entry.id), ["recover", "abandon"]);

  const recovered = resolveCriminalOrganizationDecision(state, { decisionId: decision.id, choice: "recover" });
  assert.equal(recovered.player.crime.organization.members.find((entry) => entry.id === decision.memberId).status, "available");
  assert.ok(recovered.player.crime.organization.treasury < state.player.crime.organization.treasury);
  const abandoned = resolveCriminalOrganizationDecision(state, { decisionId: decision.id, choice: "abandon" });
  assert.equal(abandoned.player.crime.organization.members.find((entry) => entry.id === decision.memberId).status, "left");
});

test("treasury funding, withdrawal, and profit sharing create different loyalty tradeoffs", () => {
  const { state } = formedState("treasury-choices");
  const funded = fundCriminalOrganization(state, { amount: 2 });
  assert.equal(funded.player.metrics.wealth, state.player.metrics.wealth - 2);
  assert.equal(funded.player.crime.organization.treasury, state.player.crime.organization.treasury + 2);

  const withdrawn = withdrawCriminalOrganizationFunds(funded, { amount: 1 });
  assert.equal(withdrawn.player.metrics.wealth, funded.player.metrics.wealth + 1);
  assert.ok(withdrawn.player.crime.organization.members.every((entry, index) => entry.loyalty <= funded.player.crime.organization.members[index].loyalty));

  const shared = distributeCriminalOrganizationProfits(funded);
  assert.ok(shared.player.crime.organization.members.every((entry, index) => entry.loyalty > funded.player.crime.organization.members[index].loyalty));
  assert.ok(shared.player.crime.organization.treasury < funded.player.crime.organization.treasury);
});

test("career month integration advances organization orders and save normalization preserves them", () => {
  const { state: formed, jurisdictionId } = formedState("career-month-integration");
  const view = getCriminalOrganizationView(formed, { jurisdictionId });
  const option = view.operations.find((entry) => entry.type === "extortion");
  const [leader, support] = view.availableMembers;
  const ordered = issueCriminalOperationOrder(formed, { optionId: option.id, jurisdictionId, leaderId: leader.id, supportId: support.id });
  const advanced = advanceCareerMonth(ordered);
  assert.equal(advanced.player.crime.organization.activeOrders[0].remainingMonths, Math.max(0, option.durationMonths - 1));

  const restored = normalizeCriminalOrganizationState(JSON.parse(JSON.stringify(advanced)));
  assert.deepEqual(restored.player.crime.organization.activeOrders, advanced.player.crime.organization.activeOrders);
  assert.deepEqual(ordered.player.crime.organization.activeOrders[0].remainingMonths, option.durationMonths);
});
