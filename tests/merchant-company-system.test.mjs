import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMPANY_BRANCH_FORMATS,
  COMPANY_ROUTE_APPROACHES,
  advanceCareerMonth,
  contributeCompanyCapital,
  createCareerInitialState,
  foundMerchantCompany,
  getMerchantCompanyView,
  openCompanyBranch,
  recruitCompanyStaff,
  resolveCompanyIncident,
  secureCompanyTradeRoute,
} from "../src/simulation.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";

function settlements(state, count = 3) {
  return getGeneratedWorldView(state).runtime.nations.objects
    .filter((entry) => entry.settlementLevel)
    .slice(0, count);
}

function qualify(state, places) {
  state.player.metrics.wealth = 80;
  state.player.merchantTrade.knownSettlements = structuredClone(places);
  state.player.merchantTrade.stats.unitsSold = 8;
  state.player.merchantTrade.stats.realizedProfit = 12;
  return state;
}

function moveTo(state, settlement) {
  state.generatedWorld.expeditionRegionId = settlement.regionId;
  state.generatedWorld.expeditionTileId = settlement.tileId ?? `tile-${settlement.x}-${settlement.y}`;
  state.player.locationId = settlement.id;
  return state;
}

test("old saves gain a solo merchant-company track and visible founding requirements", () => {
  const state = createCareerInitialState({ seed: "company-migration" });
  delete state.player.merchantCompany;
  const view = getMerchantCompanyView(state);
  assert.equal(view.status, "solo");
  assert.equal(view.schemaVersion, 1);
  assert.equal(view.founding.ready, false);
  assert.deepEqual(view.staff, []);
  assert.deepEqual(view.routes, []);
  assert.deepEqual(view.branches, []);
});

test("a qualified solo trader chooses a company strategy and hires role-specific staff", () => {
  let state = createCareerInitialState({ seed: "company-founding" });
  const places = settlements(state);
  qualify(state, places);
  const before = state.player.metrics.wealth;
  state = foundMerchantCompany(state, { name: "灰冠商会", strategyId: "caravan" });
  assert.equal(state.player.merchantCompany.status, "company");
  assert.equal(state.player.merchantCompany.name, "灰冠商会");
  assert.equal(state.player.merchantCompany.strategyId, "caravan");
  assert.ok(state.player.metrics.wealth < before);
  const view = getMerchantCompanyView(state);
  assert.ok(view.candidates.some((entry) => entry.roleId === "caravan_master"));
  const leader = view.candidates.find((entry) => entry.roleId === "caravan_master");
  state = recruitCompanyStaff(state, leader.id);
  assert.equal(state.player.merchantCompany.staff[0].roleId, "caravan_master");
  assert.ok(state.player.merchantCompany.treasury < view.treasury);
  assert.throws(() => recruitCompanyStaff(state, leader.id), /すでに雇用/);
});

test("staffing, route choice, and local branch planning form one playable company loop", () => {
  let state = createCareerInitialState({ seed: "company-loop" });
  const [source, destination] = settlements(state, 2);
  qualify(state, [source, destination]);
  moveTo(state, destination);
  state = foundMerchantCompany(state, { name: "双灯商会", strategyId: "network" });
  state = contributeCompanyCapital(state, 30);
  let view = getMerchantCompanyView(state);
  const routeLeader = view.candidates.find((entry) => entry.roleId === "caravan_master");
  state = recruitCompanyStaff(state, routeLeader.id);
  view = getMerchantCompanyView(state);
  state = secureCompanyTradeRoute(state, {
    sourceId: source.id,
    destinationId: destination.id,
    commodityId: "grain",
    approachId: "steady",
    leaderId: view.staff.find((entry) => entry.roleId === "caravan_master").id,
  });
  assert.equal(state.player.merchantCompany.routes.length, 1);
  assert.equal(state.player.merchantCompany.routes[0].approachId, "steady");
  view = getMerchantCompanyView(state);
  const manager = view.candidates.find((entry) => entry.roleId === "factor");
  state = recruitCompanyStaff(state, manager.id);
  view = getMerchantCompanyView(state);
  state = openCompanyBranch(state, destination, {
    formatId: "standard",
    launchId: "local_partnership",
    managerId: view.staff.find((entry) => entry.roleId === "factor").id,
  });
  assert.equal(state.player.merchantCompany.branches[0].status, "preparing");
  assert.equal(state.player.merchantCompany.branches[0].formatId, "standard");
  state = advanceCareerMonth(state);
  assert.equal(state.player.merchantCompany.branches[0].status, "preparing");
  state = advanceCareerMonth(state);
  assert.equal(state.player.merchantCompany.branches[0].status, "open");
  assert.ok(state.player.merchantCompany.monthlyLedger.length >= 1);
  assert.ok(state.player.merchantCompany.routes[0].ledger.length >= 1 || state.player.merchantCompany.pendingIncidents.length >= 1);
});

test("route incidents create a recoverable choice instead of silently deleting the business", () => {
  let state = createCareerInitialState({ seed: "company-risk" });
  const [source, destination] = settlements(state, 2);
  qualify(state, [source, destination]);
  state = foundMerchantCompany(state, { name: "疾風商会", strategyId: "caravan" });
  state = contributeCompanyCapital(state, 40);
  let view = getMerchantCompanyView(state);
  const leader = view.candidates.find((entry) => entry.roleId === "caravan_master");
  state = recruitCompanyStaff(state, leader.id);
  view = getMerchantCompanyView(state);
  state = secureCompanyTradeRoute(state, {
    sourceId: source.id,
    destinationId: destination.id,
    commodityId: "iron",
    approachId: "rush",
    leaderId: view.staff[0].id,
  });
  for (let index = 0; index < 24 && !state.player.merchantCompany.pendingIncidents.length; index += 1) {
    state = advanceCareerMonth(state);
    if (state.player.merchantCompany.treasury < 8) {
      state.player.metrics.wealth += 20;
      state = contributeCompanyCapital(state, 20);
    }
  }
  assert.equal(state.player.merchantCompany.pendingIncidents.length, 1);
  const incident = state.player.merchantCompany.pendingIncidents[0];
  const treasuryBefore = state.player.merchantCompany.treasury;
  state = resolveCompanyIncident(state, incident.id, "escort");
  assert.equal(state.player.merchantCompany.pendingIncidents.length, 0);
  assert.equal(state.player.merchantCompany.routes[0].status, "active");
  assert.ok(state.player.merchantCompany.routes[0].security > 0);
  assert.ok(state.player.merchantCompany.treasury < treasuryBefore);
});

test("the company choices expose distinct risk, cost, and branch tradeoffs", () => {
  assert.ok(COMPANY_ROUTE_APPROACHES.rush.risk > COMPANY_ROUTE_APPROACHES.steady.risk);
  assert.ok(COMPANY_ROUTE_APPROACHES.escorted.cost > COMPANY_ROUTE_APPROACHES.steady.cost);
  assert.ok(COMPANY_BRANCH_FORMATS.premium.cost > COMPANY_BRANCH_FORMATS.stall.cost);
  assert.ok(COMPANY_BRANCH_FORMATS.premium.revenue > COMPANY_BRANCH_FORMATS.stall.revenue);
});

test("the normal character UI exposes founding, staffing, routes, branches, incidents, and mobile controls", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(app, /renderMerchantCompanyBoard/);
  assert.match(app, /data-company-found/);
  assert.match(app, /data-company-hire/);
  assert.match(app, /data-company-route-secure/);
  assert.match(app, /data-company-branch-open/);
  assert.match(app, /data-company-incident/);
  assert.match(css, /\.merchant-company-board/);
  assert.match(css, /merchant-company-form select[\s\S]*?min-height:44px/);
});

test("all three company strategies survive a six-month common-seed operation with distinct returns", () => {
  const base = createCareerInitialState({ seed: "company-balance-common", width: 32, height: 20, plateCount: 7, nationCount: 7 });
  const places = settlements(base, 2);
  const results = {};
  for (const strategyId of ["caravan", "retail", "network"]) {
    let state = structuredClone(base);
    qualify(state, places);
    state.player.metrics.wealth = 150;
    moveTo(state, places[1]);
    state = foundMerchantCompany(state, { name: strategyId, strategyId });
    state = contributeCompanyCapital(state, 60);
    let view = getMerchantCompanyView(state);
    state = recruitCompanyStaff(state, view.candidates.find((entry) => entry.roleId === "caravan_master").id);
    view = getMerchantCompanyView(state);
    state = secureCompanyTradeRoute(state, { sourceId: places[0].id, destinationId: places[1].id, commodityId: "grain", approachId: "steady", leaderId: view.staff[0].id });
    view = getMerchantCompanyView(state);
    state = recruitCompanyStaff(state, view.candidates.find((entry) => entry.roleId === "factor").id);
    view = getMerchantCompanyView(state);
    state = openCompanyBranch(state, places[1], { formatId: "standard", launchId: "local_partnership", managerId: view.staff.find((entry) => entry.roleId === "factor").id });
    for (let month = 0; month < 6; month += 1) {
      state = advanceCareerMonth(state);
      const incident = state.player.merchantCompany.pendingIncidents[0];
      if (incident) state = resolveCompanyIncident(state, incident.id, "detour");
    }
    results[strategyId] = state.player.merchantCompany;
  }
  for (const company of Object.values(results)) {
    assert.equal(company.branches[0].status, "open");
    assert.ok(company.stats.routeRuns >= 4);
    assert.ok(Number.isFinite(company.treasury));
    assert.ok(company.stats.totalProfit > 0);
  }
  assert.equal(new Set(Object.values(results).map((company) => company.stats.totalProfit)).size, 3);
});
