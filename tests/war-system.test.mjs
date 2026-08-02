import test from "node:test";
import assert from "node:assert/strict";
import {
  WAR_OBJECTIVES,
  adoptDoctrine,
  commitMonth,
  createInitialState,
  declareWar,
  getMilitarySummary,
  getPeaceOptions,
  negotiatePeace,
  releaseOccupation,
  setOccupationGarrison,
  setOccupationPolicy,
  setWarPlan,
  startDefensiveWar,
} from "../src/simulation.js";

function ready(state = createInitialState()) {
  return state.council.pending ? adoptDoctrine(state, "balanced") : state;
}

function settleMonth(state) {
  const next = commitMonth(state);
  return next.phase === "event" ? next : next;
}

function overwhelmingWar() {
  let state = declareWar(ready(), "submission");
  state.war.months = 3;
  state.war.score = WAR_OBJECTIVES.submission.targetScore;
  state.war.objectiveProgress = 82;
  state.war.devastation = 24;
  state.war.displaced = 620;
  state.war.civilianLosses = 19;
  state.foreignStates.valka.infrastructure = 68;
  return state;
}

test("offensive operations turn battle into persistent destruction and displacement", () => {
  let state = setWarPlan(declareWar(ready(), "submission"), "siege");
  const beforeInfrastructure = state.foreignStates.valka.infrastructure;
  state = settleMonth(state);
  const report = state.phase === "event" ? state.pendingMonthReport : state.monthlyReports[0];
  assert.ok(state.foreignStates.valka.infrastructure < beforeInfrastructure);
  assert.ok(state.war.devastation > 0);
  assert.ok(state.war.displaced > 0);
  assert.ok(report.war.damage > 0);
  assert.equal(report.war.planId, "siege");
});

test("defensive war exposes fortification and scorched-delay tradeoffs", () => {
  let state = startDefensiveWar(ready());
  assert.equal(state.war.side, "defender");
  assert.throws(() => setWarPlan(state, "siege"), /選べない/);
  state = setWarPlan(state, "scorched_defense");
  const roadBefore = state.cities.orta.facilities.road.condition;
  const legitimacyBefore = state.legitimacy;
  state = settleMonth(state);
  assert.ok(state.war.homeDamage > 0);
  assert.ok(state.cities.orta.facilities.road.condition < roadBefore);
  assert.ok(state.legitimacy < legitimacyBefore);
});

test("peace offers ceasefire, objective settlement, and occupation under distinct conditions", () => {
  const state = overwhelmingWar();
  const options = getPeaceOptions(state);
  assert.ok(options.find((option) => option.id === "ceasefire").allowed);
  assert.ok(options.find((option) => option.id === "objective").allowed);
  assert.ok(options.find((option) => option.id === "occupation").allowed);
  const ended = negotiatePeace(state, "occupation");
  assert.equal(ended.war, null);
  assert.equal(ended.warHistory[0].settlementId, "occupation");
  assert.equal(ended.occupations[0].policy, "military");
  assert.equal(ended.occupations[0].infrastructure, 68);
});

test("occupation policies trade legitimacy and resistance against assimilation", () => {
  const occupied = negotiatePeace(overwhelmingWar(), "occupation");
  let autonomy = setOccupationPolicy(occupied, occupied.occupations[0].id, "autonomy");
  let assimilation = setOccupationPolicy(occupied, occupied.occupations[0].id, "assimilation");
  const legitimacy = occupied.legitimacy;
  autonomy = settleMonth(autonomy);
  assimilation = settleMonth(assimilation);
  assert.ok(assimilation.occupations[0].assimilation > autonomy.occupations[0].assimilation);
  assert.ok(assimilation.occupations[0].resistance > autonomy.occupations[0].resistance);
  assert.ok(assimilation.occupations[0].displaced > autonomy.occupations[0].displaced);
  assert.ok(assimilation.legitimacy < legitimacy);
});

test("occupation garrisons reduce the field army and can be withdrawn", () => {
  let state = negotiatePeace(overwhelmingWar(), "occupation");
  const occupationId = state.occupations[0].id;
  const initialFieldArmy = getMilitarySummary(state).army;
  state = setOccupationGarrison(state, occupationId, state.occupations[0].garrison + 100);
  assert.equal(getMilitarySummary(state).army, initialFieldArmy - 100);
  state = releaseOccupation(state, occupationId);
  assert.equal(state.occupations[0].status, "released");
  assert.equal(state.occupations[0].garrison, 0);
});

test("extreme hostility can open a playable homeland-defense war during month resolution", () => {
  const state = ready();
  state.turn = 2;
  state.foreignStates.valka.relation = -72;
  state.foreignStates.valka.hostility = 82;
  const next = settleMonth(state);
  const report = next.phase === "event" ? next.pendingMonthReport : next.monthlyReports[0];
  assert.equal(next.war.side, "defender");
  assert.equal(next.war.objectiveId, "homeland_defense");
  assert.equal(report.aggression.countryId, "valka");
});
