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
  getCompanyCharterProcedure,
  getMerchantCompanyView,
  openCompanyBranch,
  recruitCompanyStaff,
  resolveCompanyCharterApplication,
  resolveCompanyIncident,
  secureCompanyTradeRoute,
  startCompanyCharterApplication,
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

function usePlayerGovernment(state, governmentFormId, places = state.player.merchantTrade.knownSettlements) {
  state.player.sovereign = true;
  state.player.governmentFormId = governmentFormId;
  state.player.merchantTrade.knownSettlements = places.map((place) => ({ ...structuredClone(place), nationId: state.generatedWorld.playerNationId }));
  return state;
}

function authorizeFirstJurisdiction(state, decisionId = null) {
  let view = getMerchantCompanyView(state);
  const jurisdiction = view.jurisdictions[0];
  state = startCompanyCharterApplication(state, jurisdiction.id, jurisdiction.procedure.filings[0].id);
  view = getMerchantCompanyView(state);
  const pending = view.jurisdictions[0].application;
  if (pending) {
    const decision = decisionId ?? view.jurisdictions[0].decisions.find((entry) => entry.eligible)?.id;
    state = resolveCompanyCharterApplication(state, pending.id, decision);
  }
  return state;
}

function authorizeJurisdiction(state, nationId) {
  let jurisdiction = getMerchantCompanyView(state).jurisdictions.find((entry) => entry.id === nationId);
  state = startCompanyCharterApplication(state, nationId, jurisdiction.procedure.filings[0].id);
  jurisdiction = getMerchantCompanyView(state).jurisdictions.find((entry) => entry.id === nationId);
  if (jurisdiction.application) state = resolveCompanyCharterApplication(state, jurisdiction.application.id, jurisdiction.decisions.find((entry) => entry.eligible).id);
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
  assert.equal(view.schemaVersion, 2);
  assert.equal(view.founding.ready, false);
  assert.deepEqual(view.staff, []);
  assert.deepEqual(view.routes, []);
  assert.deepEqual(view.branches, []);
});

test("version-one companies keep their existing markets through grandfathered charters", () => {
  const state = createCareerInitialState({ seed: "company-charter-legacy" });
  const places = settlements(state, 2);
  qualify(state, places);
  state.player.merchantCompany = {
    schemaVersion: 1,
    status: "company",
    name: "旧街道商会",
    strategyId: "caravan",
    treasury: 20,
  };
  const view = getMerchantCompanyView(state);
  assert.equal(view.schemaVersion, 2);
  assert.ok(view.charters.length >= 1);
  assert.ok(view.charters.every((entry) => entry.procedureId === "legacy"));
  assert.ok(view.jurisdictions.every((entry) => entry.charter?.status === "active"));
});

test("government systems map to distinct role-play procedures", () => {
  assert.equal(getCompanyCharterProcedure({ governmentFormId: "republic" }).id, "republic");
  assert.equal(getCompanyCharterProcedure({ government: "諸侯公国" }).id, "noble");
  assert.equal(getCompanyCharterProcedure({ government: "工房集落評議会" }).id, "council");
  assert.equal(getCompanyCharterProcedure({ governmentFormId: "theocracy" }).id, "temple");
  assert.equal(getCompanyCharterProcedure({ government: "森林氏族同盟" }).id, "clan");
  assert.equal(getCompanyCharterProcedure({ governmentFormId: "military_regime" }).id, "command");
});

test("a republic accepts a filing immediately while unlicensed operations remain blocked", () => {
  let state = createCareerInitialState({ seed: "company-republic-filing" });
  const places = settlements(state, 2);
  qualify(state, places);
  usePlayerGovernment(state, "republic");
  state = foundMerchantCompany(state, { name: "市民商会", strategyId: "retail" });
  state = contributeCompanyCapital(state, 20);
  moveTo(state, places[0]);
  let view = getMerchantCompanyView(state);
  const leader = view.candidates.find((entry) => entry.roleId === "caravan_master");
  state = recruitCompanyStaff(state, leader.id);
  view = getMerchantCompanyView(state);
  const manager = view.candidates.find((entry) => entry.roleId === "factor");
  state = recruitCompanyStaff(state, manager.id);
  view = getMerchantCompanyView(state);
  const routeLeader = view.staff.find((entry) => entry.roleId === "caravan_master");
  const branchManager = view.staff.find((entry) => entry.roleId === "factor");
  assert.throws(() => secureCompanyTradeRoute(state, { sourceId: places[0].id, destinationId: places[1].id, commodityId: "grain", approachId: "steady", leaderId: routeLeader.id }), /営業資格/);
  assert.throws(() => openCompanyBranch(state, places[0], { formatId: "stall", launchId: "lean", managerId: branchManager.id }), /営業資格/);
  const jurisdiction = view.jurisdictions[0];
  state = startCompanyCharterApplication(state, jurisdiction.id, "standard_notice");
  view = getMerchantCompanyView(state);
  assert.equal(view.charterApplications.length, 0);
  assert.equal(view.jurisdictions[0].charter.basis, "標準届出");
  state = secureCompanyTradeRoute(state, { sourceId: places[0].id, destinationId: places[1].id, commodityId: "grain", approachId: "steady", leaderId: routeLeader.id });
  assert.equal(state.player.merchantCompany.routes.length, 1);
});

test("an aristocratic court can deny an independent patent and later grant a patronage charter", () => {
  let state = createCareerInitialState({ seed: "company-noble-hearing" });
  const places = settlements(state, 2);
  qualify(state, places);
  usePlayerGovernment(state, "empire");
  state = foundMerchantCompany(state, { name: "白鷹商会", strategyId: "network" });
  state = contributeCompanyCapital(state, 20);
  let jurisdiction = getMerchantCompanyView(state).jurisdictions[0];
  assert.equal(jurisdiction.procedure.id, "noble");
  state = startCompanyCharterApplication(state, jurisdiction.id, "direct_audience");
  let application = getMerchantCompanyView(state).jurisdictions[0].application;
  state = resolveCompanyCharterApplication(state, application.id, "independent_patent");
  assert.equal(state.player.merchantCompany.charters.length, 0);
  assert.equal(state.player.merchantCompany.charterHistory[0].outcome, "denied");
  state = startCompanyCharterApplication(state, jurisdiction.id, "court_broker");
  application = getMerchantCompanyView(state).jurisdictions[0].application;
  state = resolveCompanyCharterApplication(state, application.id, "noble_share");
  assert.equal(state.player.merchantCompany.charters[0].monthlyDue, 1);
  const treasury = state.player.merchantCompany.treasury;
  state = advanceCareerMonth(state);
  assert.equal(state.player.merchantCompany.monthlyLedger[0].charterDues, 1);
  assert.equal(state.player.merchantCompany.treasury, treasury - 1);
});

test("a cross-border route requires separate recognition from both national systems", () => {
  let state = createCareerInitialState({ seed: "company-cross-border", width: 32, height: 20, plateCount: 7, nationCount: 7 });
  const all = settlements(state, 100);
  const source = all[0];
  const destination = all.find((place) => place.nationId !== source.nationId);
  assert.ok(destination);
  qualify(state, [source, destination]);
  state = foundMerchantCompany(state, { name: "双国商会", strategyId: "caravan" });
  state = contributeCompanyCapital(state, 40);
  let view = getMerchantCompanyView(state);
  assert.equal(view.jurisdictions.length, 2);
  state = recruitCompanyStaff(state, view.candidates.find((entry) => entry.roleId === "caravan_master").id);
  state = authorizeJurisdiction(state, source.nationId);
  view = getMerchantCompanyView(state);
  assert.throws(() => secureCompanyTradeRoute(state, { sourceId: source.id, destinationId: destination.id, commodityId: "grain", approachId: "steady", leaderId: view.staff[0].id }), /営業資格/);
  state = authorizeJurisdiction(state, destination.nationId);
  view = getMerchantCompanyView(state);
  state = secureCompanyTradeRoute(state, { sourceId: source.id, destinationId: destination.id, commodityId: "grain", approachId: "steady", leaderId: view.staff[0].id });
  assert.equal(state.player.merchantCompany.routes[0].jurisdictionIds.length, 2);
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
  assert.ok(leader.raceId);
  assert.match(leader.temperamentName, /型$/);
  assert.equal(Object.keys(leader.decisionTraits).length, 6);
  state = recruitCompanyStaff(state, leader.id);
  assert.equal(state.player.merchantCompany.staff[0].roleId, "caravan_master");
  assert.equal(state.player.merchantCompany.staff[0].temperamentId, leader.temperamentId);
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
  usePlayerGovernment(state, "republic");
  state = authorizeFirstJurisdiction(state);
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
  usePlayerGovernment(state, "republic");
  state = authorizeFirstJurisdiction(state);
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
  assert.match(app, /data-company-charter-start/);
  assert.match(app, /data-company-charter-decision/);
  assert.match(app, /data-company-hire/);
  assert.match(app, /data-company-route-secure/);
  assert.match(app, /data-company-branch-open/);
  assert.match(app, /data-company-incident/);
  assert.match(css, /\.merchant-company-board/);
  assert.match(css, /\.merchant-charter-card/);
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
    usePlayerGovernment(state, "republic");
    state = authorizeFirstJurisdiction(state);
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
