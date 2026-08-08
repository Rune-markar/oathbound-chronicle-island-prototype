import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTHORITY_DOMAINS,
  WORLD,
  adoptDoctrine,
  commitMonth,
  createInitialState,
  deriveRealmLedger,
  getAuthorityReform,
  getCentralizationResult,
  getRegionAuthority,
  setAdministrationMandate,
  setAdministrationMode,
  startAuthorityReform,
} from "../src/simulation.js";
import { resolveAuthorityReforms } from "../src/administration-model.js";

function ready(state) {
  return state.council.pending ? adoptDoctrine(state, "balanced") : state;
}

function monthReport(state) {
  return state.phase === "event" ? state.pendingMonthReport : state.monthlyReports[0];
}

test("administrative network separates nominal holdings from registered and mobilizable power", () => {
  const ledger = deriveRealmLedger(createInitialState());
  assert.equal(ledger.administration.directCities, 1);
  assert.equal(ledger.administration.delegatedCities, 2);
  assert.ok(ledger.registeredPopulation < ledger.population);
  assert.ok(ledger.remittableMoney < ledger.treasury);
  assert.ok(ledger.deliverableFood < ledger.provisions);
  assert.ok(ledger.mobilizableTroops < ledger.troops);
});

test("delegated governors perform one reserve-bounded routine action each month", () => {
  const committed = commitMonth(ready(createInitialState()));
  const actions = monthReport(committed).actions.filter((action) => action.kind === "administration");
  assert.deepEqual(actions.map((action) => action.cityId).sort(), ["nereia", "orta"]);
  assert.ok(actions.every((action) => action.governanceCost === 0));
  assert.ok(committed.cities.nereia.resources.money >= committed.cities.nereia.administration.reserveMoney);
  assert.ok(committed.cities.orta.resources.money >= committed.cities.orta.administration.reserveMoney);
});

test("direct rule trades automation for court control burden", () => {
  let state = ready(createInitialState());
  const delegatedBurden = deriveRealmLedger(state).administration.burden;
  state = setAdministrationMode(state, "nereia", "direct");
  const directBurden = deriveRealmLedger(state).administration.burden;
  assert.ok(directBurden > delegatedBurden);
  const committed = commitMonth(state);
  assert.ok(!monthReport(committed).actions.some((action) => action.kind === "administration" && action.cityId === "nereia"));
});

test("new conquests begin as military administration instead of instant full national power", () => {
  const state = createInitialState();
  state.cities.valka_keep = structuredClone(state.cities.orta);
  state.cities.valka_keep.administration = null;
  const ledger = deriveRealmLedger(state);
  const conquest = ledger.administration.cities.find((city) => city.cityId === "valka_keep");
  assert.equal(conquest.stage.id, "occupied");
  assert.ok(conquest.registerCoverage < 30);
  assert.ok(conquest.mobilizableTroops < state.cities.valka_keep.military.troops * 0.25);
  assert.equal(ledger.administration.unintegratedCities, 1);
});

test("serial annexations create administrative overextension instead of linear usable power", () => {
  const state = createInitialState();
  const initial = deriveRealmLedger(state);
  ["valka_keep", "vinia_capital", "green_crown", "whitewall", "izmenia_capital", "sky_gate"].forEach((cityId) => {
    state.cities[cityId] = structuredClone(state.cities.orta);
    state.cities[cityId].administration = null;
  });
  const expanded = deriveRealmLedger(state);
  assert.equal(expanded.administration.unintegratedCities, 6);
  assert.ok(expanded.population > initial.population * 2);
  assert.ok(expanded.registeredPopulation < expanded.population * 0.65);
  assert.ok(expanded.administration.overextension > 0);
  assert.ok(expanded.governance.max < initial.governance.max);
});

test("a mandate is persistent policy, not a monthly order", () => {
  const state = setAdministrationMandate(createInitialState(), "nereia", "granary");
  assert.equal(state.cities.nereia.administration.mandate, "granary");
  assert.equal(state.pendingOrders.length, 0);
});

test("every region stores all seventeen authority domains with separate legal and practical shares", () => {
  const state = createInitialState();
  const region = getRegionAuthority(state, "nereia");
  assert.equal(Object.keys(AUTHORITY_DOMAINS).length, 17);
  assert.equal(region.domains.length, 17);
  assert.ok(region.domains.every((domain) => Number.isFinite(domain.legalShare) && Number.isFinite(domain.practicalShare)));
  assert.ok(region.domains.some((domain) => domain.legalShare !== domain.practicalShare));
  assert.ok(state.administration.authorities.every((authority) => authority.originEventId && Number.isFinite(authority.acquiredYear)));
});

test("historical privileges retain an origin, obligations, legitimacy, and entrenchment", () => {
  const state = createInitialState();
  const privileges = state.administration.privileges;
  assert.ok(privileges.length >= 6);
  assert.ok(privileges.every((privilege) => (
    privilege.originEventId
    && privilege.originalReason
    && privilege.grantedRights.length
    && privilege.obligations.length
    && privilege.legitimacy > 0
    && privilege.entrenchment > 0
  )));
});

test("effective control is bottlenecked when information and registry coverage collapse", () => {
  const baseline = createInitialState();
  const baselineTax = getRegionAuthority(baseline, "nereia").domains.find((domain) => domain.id === "tax_collection");
  const blind = structuredClone(baseline);
  blind.intelNetwork = 0;
  blind.cities.nereia.administration.registerCoverage = 5;
  blind.cities.nereia.internal.administrativeEfficiency = 8;
  const blindTax = getRegionAuthority(blind, "nereia").domains.find((domain) => domain.id === "tax_collection");
  assert.equal(blindTax.legalShare, baselineTax.legalShare);
  assert.ok(blindTax.factors.information < baselineTax.factors.information);
  assert.ok(blindTax.effectiveControl < baselineTax.effectiveControl * 0.8);
});

test("ordinary reform begins with visibility instead of directly increasing centralization", () => {
  const state = createInitialState();
  state.cities.nereia.resources.money = 100;
  const before = getRegionAuthority(state, "nereia").domains.find((domain) => domain.id === "tax_collection");
  const next = startAuthorityReform(state, "nereia", "tax_collection", "absorb");
  const after = getRegionAuthority(next, "nereia").domains.find((domain) => domain.id === "tax_collection");
  const reform = getAuthorityReform(next, "nereia", "tax_collection").active;
  assert.equal(reform.stageIndex, 0);
  assert.equal(reform.status, "active");
  assert.equal(after.legalShare, before.legalShare);
  assert.equal(after.practicalShare, before.practicalShare);
  assert.ok(next.cities.nereia.resources.money < state.cities.nereia.resources.money);
});

test("forced transfer makes law outrun implementation and later creates a persistent grievance", () => {
  const state = createInitialState();
  state.cities.orta.resources.money = 100;
  const before = getRegionAuthority(state, "orta").domains.find((domain) => domain.id === "justice");
  const next = startAuthorityReform(state, "orta", "justice", "eliminate", { forced: true });
  const after = getRegionAuthority(next, "orta").domains.find((domain) => domain.id === "justice");
  assert.ok(after.legalShare > before.legalShare);
  assert.ok(after.legalShare - after.practicalShare > before.legalShare - before.practicalShare);
  for (let month = 0; month < 8; month += 1) resolveAuthorityReforms(WORLD, next);
  assert.ok(next.administration.grievances.some((grievance) => grievance.regionId === "orta" && grievance.strength > 0));
});

test("simultaneous authority seizures can exceed the central administration's replacement capacity", () => {
  let state = createInitialState();
  Object.values(state.cities).forEach((city) => { city.resources.money = 1000; });
  ["tax_collection", "justice", "policing", "cadastre", "population_registry", "infrastructure", "executive"].forEach((domainId, index) => {
    const cityId = ["selene", "nereia", "orta"][index % 3];
    state = startAuthorityReform(state, cityId, domainId, "eliminate", { forced: true });
  });
  const ledger = deriveRealmLedger(state);
  assert.ok(ledger.administration.temporaryLoad > 0);
  assert.ok(ledger.administration.load > ledger.administration.permanentLoad);
  assert.ok(ledger.administration.utilization > 85);
  assert.equal(getCentralizationResult(state).resultIndex, ledger.administration.centralization.resultIndex);
});
