import test from "node:test";
import assert from "node:assert/strict";

import {
  adoptDoctrine,
  commitMonth,
  createInitialState,
  deriveRealmLedger,
  setAdministrationMandate,
  setAdministrationMode,
} from "../src/simulation.js";

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
