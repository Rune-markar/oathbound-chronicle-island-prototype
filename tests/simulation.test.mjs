import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMANDS,
  WAR_OBJECTIVES,
  WORLD,
  advanceDays,
  createInitialState,
  declareWar,
  deriveMetrics,
  getCommandAvailability,
  getWarCouncilReport,
  issueCommand,
  negotiatePeace,
  setWarPlan,
} from "../src/simulation.js";

test("world keeps the small island scale while adding external polities", () => {
  const islandProvinces = Object.values(WORLD.provinces).filter((province) => province.owner === "selena");
  assert.equal(islandProvinces.length, 3);
  assert.equal(Object.keys(WORLD.villages).length, 6);
  assert.equal(Object.keys(WORLD.countries).length, 3);
  assert.equal(WORLD.seaZones.white_reef.value, 86);
});

test("initial play is driven by concrete disputes rather than a food quota", () => {
  const state = createInitialState();
  assert.equal(state.issues.strait.status, "active");
  assert.equal(state.issues.harbor.status, "active");
  assert.equal(state.issues.reports.status, "active");
  assert.equal("target" in state, false);
  assert.equal(deriveMetrics(state).activeIssues, 3);
});

test("Notion personnel commands are present with time and cost", () => {
  assert.equal(COMMANDS["court.serve"].name, "仕官");
  assert.equal(COMMANDS["court.invite"].name, "勧誘");
  assert.equal(COMMANDS["court.recruit"].name, "登用");
  assert.ok(COMMANDS["court.recruit"].duration > 0);
  assert.ok(COMMANDS["court.recruit"].cost.diplomacy > 0);
});

test("commands enter a timetable and apply their effect only after completion", () => {
  let state = createInitialState();
  state = issueCommand(state, "admin.harbor_standard");
  assert.equal(state.commandQueue[0].remaining, 7);
  assert.equal(state.issues.harbor.status, "active");
  state = advanceDays(state, 6);
  assert.equal(state.issues.harbor.status, "active");
  state = advanceDays(state, 1);
  assert.equal(state.issues.harbor.status, "resolved");
  assert.equal(state.commandQueue.length, 0);
  assert.ok(state.supply > 62);
});

test("better reconnaissance narrows the military estimate", () => {
  let state = createInitialState();
  const before = getWarCouncilReport(state).confidence;
  state = issueCommand(state, "navy.soundings");
  state = advanceDays(state, 5);
  const after = getWarCouncilReport(state).confidence;
  assert.ok(after > before);
  assert.equal(state.issues.reports.status, "resolved");
});

test("war council evaluates a limited political objective and names a center of gravity", () => {
  const report = getWarCouncilReport(createInitialState(), "navigation");
  assert.equal(report.posture, "実行可能");
  assert.equal(report.center.id, "strait");
  assert.match(report.limit, /自由通航の保障/);
  assert.ok(report.factors.some((factor) => factor.label === "正当性"));
  assert.ok(report.factors.some((factor) => factor.label === "補給"));
});

test("a total war objective carries more escalation than limited navigation", () => {
  assert.ok(WAR_OBJECTIVES.submission.escalationRisk > WAR_OBJECTIVES.navigation.escalationRisk);
  const limited = getWarCouncilReport(createInitialState(), "navigation");
  const total = getWarCouncilReport(createInitialState(), "submission");
  assert.ok(total.score < limited.score);
  assert.match(total.limit, /長期化/);
});

test("declaring without legitimacy creates a domestic consequence but remains a choice", () => {
  const initial = createInitialState();
  initial.justification = 20;
  initial.warSupport = 25;
  const state = declareWar(initial, "navigation");
  assert.ok(state.war);
  assert.equal(state.stability, 0);
  assert.ok(state.legitimacy < initial.legitimacy);
  assert.ok(state.regions.nereia.unrest > initial.regions.nereia.unrest);
  assert.match(state.log[0].title, /宣戦/);
  assert.ok(state.log.some((entry) => /罷業/.test(entry.title)));
});

test("war advances weekly and responds to the selected plan", () => {
  let state = declareWar(createInitialState(), "navigation");
  state = setWarPlan(state, "blockade");
  state = advanceDays(state, 7);
  assert.equal(state.war.weeks, 1);
  assert.notEqual(state.war.score, 0);
  assert.ok(state.war.losses > 0);
  assert.ok(state.war.lastEnemyAction.reason.length > 0);
});

test("peace ends the war and records a political settlement", () => {
  let state = declareWar(createInitialState(), "navigation");
  state.war.score = 40;
  state.war.objectiveProgress = 50;
  state = negotiatePeace(state);
  assert.equal(state.war, null);
  assert.equal(state.agreements.navigation, true);
  assert.equal(state.issues.strait.status, "resolved");
  assert.equal(getCommandAvailability(state, "navy.soundings").allowed, true);
});
