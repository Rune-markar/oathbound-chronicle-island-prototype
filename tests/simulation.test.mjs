import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMANDS,
  WAR_OBJECTIVES,
  WORLD,
  adoptDoctrine,
  appointForceOfficer,
  commitMonth,
  createInitialState,
  declareWar,
  deriveCityMetrics,
  deriveMetrics,
  deriveRealmLedger,
  getCityBreakdown,
  getCampaignStatus,
  getCommandAvailability,
  getContinentalBalance,
  getCouncilProposals,
  getCountryReport,
  getMilitarySummary,
  getTaskForecast,
  getTurnGuidance,
  getWarCouncilReport,
  negotiatePeace,
  queueOrder,
  resolveEventChoice,
  setFormation,
  setWarPlan,
} from "../src/simulation.js";

function settleMonth(state) {
  let next = commitMonth(state);
  if (next.phase === "event") {
    const choice = next.pendingEvent && next.pendingEvent.eventId;
    const definition = choice && ({
      crop_failure: "release", flood: "relief", bandits: "troops", epidemic: "clinics",
      refugees: "settle", corruption: "audit", merchant_exit: "subsidy", peasant_revolt: "negotiate",
    })[choice];
    next = resolveEventChoice(next, definition);
  }
  return next;
}

function preparedState(doctrine = "balanced") {
  return adoptDoctrine(createInitialState(), doctrine);
}

test("world is a contiguous continental campaign with multiple states and local settlement scale", () => {
  const ownProvinces = Object.values(WORLD.provinces).filter((province) => province.owner === "selena");
  assert.equal(WORLD.continent.name, "エルドリア大陸");
  assert.equal(ownProvinces.length, 3);
  assert.equal(Object.keys(WORLD.villages).length, 6);
  assert.equal(Object.keys(WORLD.countries).length, 7);
  assert.equal(WORLD.strategicZones.ash_pass.value, 86);
  assert.equal(deriveCityMetrics(createInitialState(), "selene").village.villages.length, 2);
  assert.match(getCityBreakdown(createInitialState(), "selene").villages, /麦輪村/);
});

test("national resources are derived from cities instead of flat power currencies", () => {
  const state = createInitialState();
  for (const obsolete of ["treasury", "admin", "diplomacy", "military", "manpower", "army", "fleet", "supply"]) assert.equal(obsolete in state, false);
  const ledger = deriveRealmLedger(state);
  assert.equal(ledger.treasury, 92);
  assert.equal(ledger.provisions, 17100);
  assert.equal(ledger.troops, 2120);
  assert.equal(ledger.population, 41400);
  assert.equal(deriveMetrics(state).activeIssues, 3);
});

test("campaign guidance gives the player one explicit objective and a four-step monthly route", () => {
  let state = createInitialState();
  const opening = getCampaignStatus(state);
  assert.equal(opening.title, "灰冠峠の国境危機を収束させる");
  assert.equal(opening.totalCount, 3);
  assert.equal(opening.completedCount, 0);
  assert.equal(getTurnGuidance(state).action, "open_council");

  state = adoptDoctrine(state, "balanced");
  const orderGuidance = getTurnGuidance(state);
  assert.equal(orderGuidance.step, 2);
  assert.equal(orderGuidance.commandId, "admin.harbor_standard");

  const afterTalks = structuredClone(state);
  afterTalks.completedCommands.push("diplomacy.talks");
  afterTalks.issues.standards.status = "resolved";
  afterTalks.issues.reports.status = "resolved";
  assert.equal(getTurnGuidance(afterTalks).action, "open_military");

  state = queueOrder(state, { kind: "command", commandId: orderGuidance.commandId, officerId: "edras", cityId: orderGuidance.cityId });
  assert.equal(getTurnGuidance(state).action, "end_month");

  state.agreements.transit = true;
  state.issues.border.status = "resolved";
  state.issues.standards.status = "resolved";
  state.issues.reports.status = "resolved";
  assert.equal(getCampaignStatus(state).complete, true);
  assert.equal(getTurnGuidance(state).action, "open_reports");
});

test("commerce, security, policies, and village composition change real monthly outcomes", () => {
  const base = createInitialState();
  const baseline = deriveCityMetrics(base, "selene");
  const commercial = structuredClone(base);
  commercial.cities.selene.resources.commerce += 15;
  assert.ok(deriveCityMetrics(commercial, "selene").netIncome > baseline.netIncome);
  const disorder = structuredClone(base);
  disorder.cities.selene.resources.security -= 30;
  const disordered = deriveCityMetrics(disorder, "selene");
  assert.ok(disordered.netIncome < baseline.netIncome);
  assert.ok(disordered.draftRecovery < baseline.draftRecovery);
  const highTax = structuredClone(base);
  highTax.cities.selene.policies.landTax = "high";
  assert.ok(deriveCityMetrics(highTax, "selene").grossIncome > baseline.grossIncome);
});

test("officer ability, loyalty, stamina, merit, traits, and doctrine shape forecasts", () => {
  const base = createInitialState();
  const edras = getTaskForecast(base, "city.commerce", "edras", "selene");
  const gaius = getTaskForecast(base, "city.commerce", "gaius", "selene");
  assert.ok(edras.expected > gaius.expected);
  const depleted = structuredClone(base);
  Object.assign(depleted.officers.edras, { loyalty: 20, stamina: 20, merit: 0 });
  assert.ok(getTaskForecast(depleted, "city.commerce", "edras", "selene").expected < edras.expected);
  assert.ok(getTaskForecast(adoptDoctrine(base, "prosperity"), "city.commerce", "edras", "selene").expected > edras.expected);
});

test("seasonal council identifies road, intelligence, and border diplomacy problems", () => {
  const initial = createInitialState();
  const proposals = getCouncilProposals(initial);
  assert.equal(proposals.length, 3);
  assert.deepEqual(proposals.map((item) => item.commandId), ["admin.harbor_standard", "navy.soundings", "diplomacy.talks"]);
  assert.ok(proposals.every((proposal) => proposal.forecast.expected > 0));
  const adopted = adoptDoctrine(initial, "sea_guard");
  assert.equal(adopted.council.pending, false);
  assert.throws(() => adoptDoctrine(adopted, "balanced"), /評定は終了/);
});

test("monthly plans reserve one officer and pay the city only when committed", () => {
  let state = preparedState();
  const beforeMoney = state.cities.selene.resources.money;
  state = queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "edras", cityId: "selene" });
  assert.equal(state.cities.selene.resources.money, beforeMoney);
  assert.equal(getCommandAvailability(state, "city.patrol", "edras", "selene").allowed, false);
  state = settleMonth(state);
  assert.ok(state.cities.selene.resources.commerce > 72);
  assert.ok(state.officers.edras.merit > 240);
  assert.equal(state.officers.edras.assignment, null);
});

test("mobilization consumes East March draft pool and increases troops with a security cost", () => {
  let state = preparedState("sea_guard");
  const before = structuredClone(state.cities.orta);
  state = queueOrder(state, { kind: "command", commandId: "military.mobilize", officerId: "gaius", cityId: "orta" });
  state = settleMonth(state);
  assert.ok(state.cities.orta.military.troops > before.military.troops);
  assert.ok(state.cities.orta.resources.security < before.resources.security + 5);
  assert.ok(state.cities.orta.military.draftPopulation < before.military.draftPopulation);
});

test("monthly settlement records causal city ledgers and summons the next seasonal council", () => {
  let state = preparedState("prosperity");
  const before = deriveRealmLedger(state);
  state = settleMonth(state);
  state = settleMonth(state);
  const after = deriveRealmLedger(state);
  assert.equal(state.month, 6);
  assert.equal(state.council.pending, true);
  assert.equal(state.council.seasonKey, "317-6");
  assert.ok(state.monthlyReports.length >= 2);
  assert.notEqual(after.population, before.population);
});

test("personnel actions turn named outsiders into officers or allied retainers", () => {
  const cases = [
    ["court.serve", "mara", "selene", "ilva", "serving"],
    ["court.invite", "gaius", "orta", "dario", "retinue"],
    ["court.recruit", "edras", "nereia", "mirel", "serving"],
  ];
  for (const [commandId, officerId, cityId, targetId, allegiance] of cases) {
    let state = preparedState();
    state = queueOrder(state, { kind: "command", commandId, officerId, cityId });
    state = settleMonth(state);
    assert.equal(state.officers[targetId].allegiance, allegiance);
  }
});

test("road condition, standards, and commander-deputy bond feed land mobility and organization", () => {
  const base = createInitialState();
  const normal = getMilitarySummary(base);
  const brokenRoads = structuredClone(base);
  brokenRoads.cities.orta.facilities.road.condition = 5;
  brokenRoads.issues.standards.severity = 95;
  assert.ok(getMilitarySummary(brokenRoads).mobility < normal.mobility);
  const estranged = structuredClone(base);
  estranged.officers.mara.bonds.gaius = 0;
  estranged.officers.gaius.bonds.mara = 0;
  assert.ok(getMilitarySummary(estranged).organization < normal.organization);
  assert.throws(() => appointForceOfficer(base, "commanderId", "mara"), /重複任命/);
});

test("continental diplomacy reports every active country and drives intervention risk", () => {
  const state = createInitialState();
  assert.equal(getCountryReport(state, "heavens_gate").capital, "天門京");
  const normal = getContinentalBalance(state);
  const hostile = structuredClone(state);
  Object.values(hostile.foreignStates).forEach((country) => { country.hostility = 90; country.relation = -60; });
  assert.ok(getContinentalBalance(hostile).interventionRisk > normal.interventionRisk);
});

test("war council evaluates political objective, terrain, supply, intelligence, and third countries", () => {
  const initial = createInitialState();
  const report = getWarCouncilReport(initial, "transit");
  assert.equal(report.center.id, "chokepoint");
  assert.match(report.limit, /国境通行権の保障/);
  assert.ok(report.factors.some((factor) => factor.label === "地形・交通"));
  assert.ok(WAR_OBJECTIVES.submission.escalationRisk > WAR_OBJECTIVES.transit.escalationRisk);
  const encircled = structuredClone(initial);
  Object.values(encircled.foreignStates).forEach((country) => { country.hostility = 95; country.relation = -80; });
  assert.ok(getWarCouncilReport(encircled, "transit").score < report.score);
});

test("declaring without sufficient justification creates an East March consequence", () => {
  const initial = createInitialState();
  initial.justification = 20;
  const beforeSecurity = initial.cities.orta.resources.security;
  const state = declareWar(initial, "transit");
  assert.ok(state.legitimacy < initial.legitimacy);
  assert.equal(state.cities.orta.resources.security, beforeSecurity - 18);
  assert.ok(state.log.some((entry) => /徴発を拒否/.test(entry.title)));
});

test("war consumes actual city supplies and troops every month", () => {
  let state = preparedState();
  state = setWarPlan(declareWar(state, "transit"), "interdict");
  const before = deriveRealmLedger(state);
  state = settleMonth(state);
  const after = deriveRealmLedger(state);
  assert.equal(state.war.months, 1);
  assert.notEqual(state.war.score, 0);
  assert.ok(state.war.losses > 0);
  assert.ok(after.provisions < before.provisions);
  assert.ok(after.troops < before.troops);
});

test("formation selection trades battlefield pressure for losses and supply", () => {
  let column = setFormation(preparedState(), "column");
  column = setWarPlan(declareWar(column, "transit"), "pass");
  column = settleMonth(column);
  let assault = setFormation(preparedState(), "assault");
  assault = setWarPlan(declareWar(assault, "transit"), "pass");
  assault = settleMonth(assault);
  assert.ok(assault.war.score > column.war.score);
  assert.ok(assault.war.losses > column.war.losses);
  assert.ok(deriveRealmLedger(assault).provisions < deriveRealmLedger(column).provisions);
});

test("peace ends war and records a border settlement", () => {
  let state = declareWar(createInitialState(), "transit");
  state.war.score = 40;
  state.war.objectiveProgress = 50;
  state = negotiatePeace(state);
  assert.equal(state.war, null);
  assert.equal(state.agreements.transit, true);
  assert.equal(state.issues.border.status, "resolved");
});
