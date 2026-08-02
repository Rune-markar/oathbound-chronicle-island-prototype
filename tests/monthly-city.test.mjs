import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_DEFINITIONS,
  FACILITIES,
  FACTION_DEFINITIONS,
  POLICY_DEFINITIONS,
  adoptDoctrine,
  cancelOrder,
  commitMonth,
  createInitialState,
  deriveCityMetrics,
  deriveMonthPreview,
  getGovernance,
  getTurnWarnings,
  queueOrder,
  resolveEventChoice,
} from "../src/simulation.js";

function ready(state) {
  return state.council.pending ? adoptDoctrine(state, "balanced") : state;
}

function settle(state) {
  let next = commitMonth(ready(state));
  if (next.phase === "event") {
    const event = EVENT_DEFINITIONS[next.pendingEvent.eventId];
    next = resolveEventChoice(next, event.choices[0].id);
  }
  return next;
}

function numericLeaves(value, path = "state", result = []) {
  if (typeof value === "number") result.push([path, value]);
  else if (Array.isArray(value)) value.forEach((item, index) => numericLeaves(item, `${path}[${index}]`, result));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => numericLeaves(item, `${path}.${key}`, result));
  return result;
}

test("save v7 contains the continental monthly city and war lifecycle schema", () => {
  const state = createInitialState();
  const city = state.cities.selene;
  assert.equal(state.version, 7);
  assert.deepEqual(state.occupations, []);
  assert.deepEqual(state.warHistory, []);
  assert.deepEqual(state.fiscal, { publicDebt: 24, totalDebtRepaid: 0 });
  assert.deepEqual(Object.keys(city.resources).sort(), ["commerce", "defense", "food", "money", "population", "production", "security", "support"]);
  assert.deepEqual(Object.keys(city.internal).sort(), ["administrativeEfficiency", "corruption", "fear", "foodPreservation", "housingCapacity", "sanitation"]);
  assert.deepEqual(Object.keys(city.military).sort(), ["draftPopulation", "sailors", "ships", "shipyard", "training", "troops"]);
  assert.equal(Object.keys(city.facilities).length, 6);
  assert.equal(Object.keys(city.policies).length, 6);
  assert.equal(Object.keys(city.factions).length, 4);
  assert.deepEqual(Object.keys(state).filter((key) => ["phase", "pendingOrders", "pendingEvent", "monthlyReports", "annualReports", "rngSeed"].includes(key)).sort(), ["annualReports", "monthlyReports", "pendingEvent", "pendingOrders", "phase", "rngSeed"]);
});

test("initial content has six facilities, six policies, four factions, and eight three-choice events", () => {
  assert.equal(Object.keys(FACILITIES).length, 6);
  assert.equal(Object.keys(POLICY_DEFINITIONS).length, 6);
  assert.equal(Object.keys(FACTION_DEFINITIONS).length, 4);
  assert.equal(Object.keys(EVENT_DEFINITIONS).length, 8);
  assert.ok(Object.values(EVENT_DEFINITIONS).every((event) => event.choices.length >= 3));
  const startingIssues = Object.values(createInitialState().cities).flatMap((city) => city.issues);
  assert.equal(startingIssues.length, 2);
  assert.equal(new Set(startingIssues.map((issue) => issue.id)).size, 2);
});

test("derived metrics expose current value, next-month delta, and causal reasons", () => {
  const city = deriveCityMetrics(createInitialState(), "selene");
  for (const key of ["food", "money", "population", "security", "support"]) {
    assert.equal(city.forecasts[key].current, city[key]);
    assert.ok(Number.isFinite(city.forecasts[key].delta));
    assert.ok(city.forecasts[key].reasons.length > 0);
  }
});

test("queued orders can be canceled without spending reserved resources", () => {
  let state = ready(createInitialState());
  const money = state.cities.selene.resources.money;
  state = queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "edras", cityId: "selene" });
  assert.equal(state.cities.selene.resources.money, money);
  assert.equal(getGovernance(state).used, 1);
  state = cancelOrder(state, state.pendingOrders[0].id);
  assert.equal(state.cities.selene.resources.money, money);
  assert.equal(getGovernance(state).used, 0);
});

test("governance allows exactly two forced points beyond its normal maximum", () => {
  let state = ready(createInitialState());
  state = queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "edras", cityId: "selene" });
  state = queueOrder(state, { kind: "command", commandId: "city.patrol", officerId: "mara", cityId: "nereia" });
  state = queueOrder(state, { kind: "command", commandId: "diplomacy.talks", officerId: "sera", cityId: "selene" });
  assert.throws(() => queueOrder(state, { kind: "command", commandId: "military.mobilize", officerId: "gaius", cityId: "orta" }), (error) => error.code === "FORCE_REQUIRED");
  state = queueOrder(state, { kind: "command", commandId: "military.mobilize", officerId: "gaius", cityId: "orta", force: true });
  state = queueOrder(state, { kind: "facility", cityId: "selene", facilityId: "granary", force: true });
  assert.equal(getGovernance(state).max, 4);
  assert.equal(getGovernance(state).used, 6);
  assert.throws(() => queueOrder(state, { kind: "policy", cityId: "selene", policyId: "securityPolicy", optionId: "strict", force: true }), /上限/);
});

test("forced orders disclose exact penalties and can fail deterministically after paying their cost", () => {
  let state = ready(createInitialState());
  state = queueOrder(state, { kind: "policy", cityId: "selene", policyId: "landTax", optionId: "high" });
  state = queueOrder(state, { kind: "policy", cityId: "selene", policyId: "commerceTax", optionId: "high" });
  state = queueOrder(state, { kind: "policy", cityId: "selene", policyId: "immigration", optionId: "encourage" });
  state = queueOrder(state, { kind: "policy", cityId: "selene", policyId: "securityPolicy", optionId: "strict" });
  assert.throws(
    () => queueOrder(state, { kind: "faction", cityId: "selene", factionId: "farmers", action: "negotiate" }),
    (error) => error.code === "FORCE_REQUIRED" && error.failureChance === 15 && error.governancePenalty === 1,
  );
  state = queueOrder(state, { kind: "faction", cityId: "selene", factionId: "farmers", action: "negotiate", force: true });
  state.rngSeed = 1972;
  assert.ok(getTurnWarnings(state).some((warning) => /失敗率 最大15%/.test(warning) && /翌月統治力 -1/.test(warning)));
  const committed = commitMonth(state);
  const report = committed.phase === "event" ? committed.pendingMonthReport : committed.monthlyReports[0];
  const forced = report.actions.find((action) => action.forced);
  assert.equal(forced.status, "failed");
  assert.equal(forced.cost.money, 2);
  assert.equal(committed.governancePenalty, 1);
});

test("facility construction completes after its configured turn duration", () => {
  let state = ready(createInitialState());
  const before = state.cities.selene.facilities.granary.level;
  state = queueOrder(state, { kind: "facility", cityId: "selene", facilityId: "granary" });
  state = settle(state);
  while (state.cities.selene.projects.some((project) => project.facilityId === "granary")) state = settle(state);
  assert.equal(state.cities.selene.facilities.granary.level, before + 1);
});

test("unfunded facilities stall and raise a month-end warning", () => {
  const state = ready(createInitialState());
  state.cities.selene.resources.money = -50;
  assert.ok(deriveCityMetrics(state, "selene").facilities.facilities.some((facility) => facility.level > 0 && facility.operatingRate < 0.7));
  assert.ok(getTurnWarnings(state).some((warning) => /施設稼働率/.test(warning)));
});

test("rapid policy reversal adds corruption and support penalties", () => {
  let state = ready(createInitialState());
  state = queueOrder(state, { kind: "policy", cityId: "selene", policyId: "landTax", optionId: "high" });
  state = settle(state);
  state = ready(state);
  const control = structuredClone(state);
  delete control.cities.selene.policyChangedAt.landTax;
  const rapid = settle(queueOrder(state, { kind: "policy", cityId: "selene", policyId: "landTax", optionId: "low" }));
  const normal = settle(queueOrder(control, { kind: "policy", cityId: "selene", policyId: "landTax", optionId: "low" }));
  assert.ok(rapid.cities.selene.internal.corruption > normal.cities.selene.internal.corruption);
  assert.ok(rapid.cities.selene.resources.support < normal.cities.selene.resources.support);
});

test("faction reaction worsens under hunger, insecurity, and high land tax", () => {
  const stable = createInitialState();
  const stressed = structuredClone(stable);
  stressed.cities.selene.resources.food = 0;
  stressed.cities.selene.resources.security = 20;
  stressed.cities.selene.policies.landTax = "high";
  const baseFarmers = deriveCityMetrics(stable, "selene").factions.find((faction) => faction.id === "farmers");
  const stressedFarmers = deriveCityMetrics(stressed, "selene").factions.find((faction) => faction.id === "farmers");
  assert.ok(stressedFarmers.delta < baseFarmers.delta);
  assert.ok(stressedFarmers.radicalismDelta > baseFarmers.radicalismDelta);
  assert.match(stressedFarmers.demand, /食料/);
});

test("event selection is reproducible and blocks month rollover until resolved", () => {
  let left = createInitialState();
  let right = structuredClone(left);
  for (let index = 0; index < 36; index += 1) {
    left = commitMonth(ready(left));
    right = commitMonth(ready(right));
    assert.deepEqual(left.pendingEvent, right.pendingEvent);
    if (left.phase === "event") break;
  }
  assert.equal(left.phase, "event");
  assert.throws(() => commitMonth(left), /事件/);
  const definition = EVENT_DEFINITIONS[left.pendingEvent.eventId];
  left = resolveEventChoice(left, definition.choices[0].id);
  assert.equal(left.phase, "planning");
  assert.equal(left.monthlyReports[0].events.length, 1);
});

test("monthly report net changes include order costs paid before production", () => {
  let state = ready(createInitialState());
  const opening = state.cities.selene.resources.money;
  state = queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "edras", cityId: "selene" });
  const committed = commitMonth(state);
  const report = committed.phase === "event" ? committed.pendingMonthReport : committed.monthlyReports[0];
  const local = report.cities.find((city) => city.cityId === "selene");
  assert.equal(local.breakdown.orders.money, -5);
  assert.equal(local.changes.money, Number((committed.cities.selene.resources.money - opening).toFixed(1)));
  assert.equal(report.realm.money, Number(report.cities.reduce((sum, city) => sum + city.changes.money, 0).toFixed(1)));
  assert.ok(report.actions.some((action) => action.title === "商業振興" && action.cost.money === 5));
});

test("national fiscal report splits revenue and all six expenditure categories", () => {
  let state = ready(createInitialState());
  state = queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "edras", cityId: "selene" });
  const committed = commitMonth(state);
  const report = committed.phase === "event" ? committed.pendingMonthReport : committed.monthlyReports[0];
  assert.deepEqual(Object.keys(report.fiscal.income).sort(), ["commerce_tax", "land_tax", "other_income", "total"]);
  assert.deepEqual(Object.keys(report.fiscal.expenditure).sort(), [
    "debt_repayment", "economic_investment", "foreign_aid", "military_affairs",
    "research_development", "social_security", "total",
  ]);
  assert.ok(report.fiscal.income.land_tax > 0);
  assert.ok(report.fiscal.income.commerce_tax > 0);
  assert.ok(report.fiscal.expenditure.economic_investment >= 5);
  assert.equal(report.fiscal.balance, report.realm.money);
  assert.equal(Number((report.fiscal.income.total - report.fiscal.expenditure.total).toFixed(1)), report.fiscal.balance);
  assert.equal(Number((report.fiscal.closingTreasury - report.fiscal.openingTreasury).toFixed(1)), report.fiscal.balance);
});

test("event choice costs are folded back into the same monthly report", () => {
  let pending = ready(createInitialState());
  for (let month = 0; month < 3 && pending.phase !== "event"; month += 1) pending = commitMonth(ready(pending));
  assert.equal(pending.phase, "event");
  const definition = EVENT_DEFINITIONS[pending.pendingEvent.eventId];
  const choice = definition.choices.find((item) => Number.isFinite(item.effect.resources?.money)) ?? definition.choices[0];
  const cityId = pending.pendingEvent.cityId;
  const beforeChoice = pending.pendingMonthReport.cities.find((city) => city.cityId === cityId).changes.money;
  const beforeFiscal = structuredClone(pending.pendingMonthReport.fiscal);
  const moneyEffect = choice.effect.resources?.money ?? 0;
  const resolved = resolveEventChoice(pending, choice.id);
  const local = resolved.monthlyReports[0].cities.find((city) => city.cityId === cityId);
  assert.equal(local.changes.money, Number((beforeChoice + moneyEffect).toFixed(1)));
  assert.equal(resolved.monthlyReports[0].events[0].detail, choice.detail);
  const fiscal = resolved.monthlyReports[0].fiscal;
  if (moneyEffect < 0) assert.equal(fiscal.expenditure.total, Number((beforeFiscal.expenditure.total + Math.abs(moneyEffect)).toFixed(1)));
  if (moneyEffect > 0) assert.equal(fiscal.income.total, Number((beforeFiscal.income.total + moneyEffect).toFixed(1)));
  assert.equal(fiscal.balance, resolved.monthlyReports[0].realm.money);
});

test("pending policy and facility orders change the pure month preview without mutating state", () => {
  const base = ready(createInitialState());
  const baseline = deriveMonthPreview(base).report.cities.find((city) => city.cityId === "nereia");
  let planned = queueOrder(base, { kind: "policy", cityId: "nereia", policyId: "rationing", optionId: "restricted" });
  planned = queueOrder(planned, { kind: "facility", cityId: "nereia", facilityId: "farmland" });
  const preview = deriveMonthPreview(planned).report.cities.find((city) => city.cityId === "nereia");
  assert.notEqual(preview.changes.food, baseline.changes.food);
  assert.ok(preview.changes.money < baseline.changes.money);
  assert.equal(planned.cities.nereia.policies.rationing, "normal");
  assert.equal(planned.cities.nereia.facilities.farmland.level, 1);
  assert.equal(planned.pendingOrders.length, 2);
});

test("a starting city issue produces a major event no later than the third month", () => {
  let state = ready(createInitialState());
  let elapsed = 0;
  while (state.phase !== "event" && elapsed < 3) {
    state = commitMonth(ready(state));
    elapsed += 1;
  }
  assert.equal(state.phase, "event");
  assert.ok(elapsed <= 3);
  assert.ok(state.cities[state.pendingEvent.cityId].issues.some((issue) => issue.id === state.pendingEvent.eventId));
});

test("December creates an annual report before rolling into January", () => {
  let state = createInitialState();
  state.month = 12;
  state.council.pending = false;
  state = settle(state);
  assert.equal(state.year, 318);
  assert.equal(state.month, 1);
  assert.equal(state.annualReports[0].year, 317);
  assert.equal(state.annualReports[0].fiscal.balance, state.annualReports[0].totals.money);
  assert.equal(
    Number((state.annualReports[0].fiscal.income.total - state.annualReports[0].fiscal.expenditure.total).toFixed(1)),
    state.annualReports[0].fiscal.balance,
  );
});

test("120-month standard simulation remains finite and never strands an event", () => {
  let state = createInitialState();
  for (let index = 0; index < 120; index += 1) {
    state = settle(state);
    assert.equal(state.phase, "planning");
    assert.equal(state.pendingEvent, null);
    for (const [path, value] of numericLeaves(state)) assert.ok(Number.isFinite(value), `${path} must remain finite`);
    Object.values(state.cities).forEach((city) => {
      assert.ok(city.resources.population >= 1000);
      assert.ok(city.resources.food >= 0);
      assert.ok(city.military.troops >= 0);
    });
  }
  assert.equal(state.year, 327);
  assert.equal(state.month, 4);
  assert.equal(state.monthlyReports.length, 120);
  assert.equal(state.annualReports.length, 10);
});
