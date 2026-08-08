import test from "node:test";
import assert from "node:assert/strict";

import {
  EVENT_DEFINITIONS,
  WORLD,
  adoptDoctrine,
  commitMonth,
  createInitialState,
  getHistoricalOverview,
  normalizeWarState,
  resolveEventChoice,
} from "../src/monthly-simulation.js";
import {
  advanceHistoricalSimulation,
  compileHistoricalEras,
  registerEventPressure,
  traceHistoricalCauses,
} from "../src/history-model.js";

test("historical state links every seeded privilege to a causal origin and a current institutional legacy", () => {
  const state = createInitialState();
  assert.equal(state.version, 8);
  assert.equal(state.history.schemaVersion, 1);
  assert.ok(state.history.events.length >= 4);
  assert.ok(state.history.events.every((event) => event.causedBy.length >= 1 && event.effects.length >= 1));
  state.administration.privileges.forEach((privilege) => {
    assert.ok(state.history.events.some((event) => event.id === privilege.originEventId), privilege.originEventId);
    assert.ok(state.history.institutionalLegacies.some((legacy) => legacy.originEventId === privilege.originEventId && legacy.domain === privilege.domain));
    const legacy = state.history.institutionalLegacies.find((candidate) => candidate.originEventId === privilege.originEventId && candidate.domain === privilege.domain);
    assert.ok(state.history.graph.edges.some((edge) => edge.from === privilege.id && edge.to === legacy.id && edge.relation === "inherited_from"));
  });
  assert.ok(Object.values(state.history.pressures).flatMap(Object.values).every((pressure) => Number.isFinite(pressure.value)));
  assert.ok(Object.values(state.history.pressures).flatMap(Object.values).some((pressure) => pressure.value > 0));
});

test("a v7 save receives an immediate pressure snapshot instead of displaying zero until the next month", () => {
  const legacy = createInitialState();
  delete legacy.history;
  legacy.version = 7;
  const migrated = normalizeWarState(legacy);
  const pressures = Object.values(migrated.history.pressures).flatMap(Object.values);
  assert.equal(migrated.version, 8);
  assert.ok(pressures.some((pressure) => pressure.value > 0));
  assert.ok(pressures.every((pressure) => pressure.updatedAt === `${migrated.year}-${String(migrated.month).padStart(2, "0")}`));
});

test("low event risk is ineligible until a material pressure or an explicit city issue exists", () => {
  const state = createInitialState();
  const quiet = registerEventPressure(WORLD, state, "peasant_revolt", "selene", 12);
  assert.equal(quiet.eligible, false);
  state.cities.selene.issues.push({ id: "peasant_revolt", cityId: "selene", title: "抗税運動", severity: 30 });
  const issueBacked = registerEventPressure(WORLD, state, "peasant_revolt", "selene", 12);
  assert.equal(issueBacked.eligible, true);
});

test("accumulated social conditions manifest as an event with a traceable cause graph", () => {
  const state = createInitialState();
  const city = state.cities.orta;
  city.policies.landTax = "high";
  city.policies.commerceTax = "high";
  city.resources.food = 100;
  city.resources.support = 6;
  city.resources.security = 8;
  Object.values(city.factions).forEach((faction) => {
    faction.support = 5;
    faction.radicalism = 96;
  });
  state.legitimacy = 8;
  state.administration.grievances.push({
    id: "test-grievance", regionId: "orta", strength: 96, decayRate: 0,
    narrative: "過去の徴税権回収への抵抗", createdYear: state.year, generation: 1,
  });
  const created = advanceHistoricalSimulation(WORLD, state);
  const manifestation = created.find((event) => event.type === "pressure_manifestation" && event.locations.includes("orta"));
  assert.ok(manifestation);
  assert.ok(manifestation.causedBy.length >= 1);
  assert.ok(manifestation.effects.length >= 1);
  const trace = traceHistoricalCauses(state, manifestation.id);
  assert.ok(trace.some((edge) => edge.relation === "caused_by"));
  assert.ok(state.history.pressures.orta.rebellion.stageIndex >= 2);
});

test("resolving a gameplay crisis writes the decision, pressure, effects, and competing accounts to history", () => {
  let state = createInitialState();
  state = adoptDoctrine(state, "balanced");
  for (let month = 0; month < 3 && state.phase !== "event"; month += 1) {
    if (state.council.pending) state = adoptDoctrine(state, "balanced");
    state = commitMonth(state);
  }
  assert.equal(state.phase, "event");
  const pending = state.pendingEvent;
  const choice = EVENT_DEFINITIONS[pending.eventId].choices[0];
  state = resolveEventChoice(state, choice.id);
  const reportEvent = state.monthlyReports[0].events[0];
  assert.ok(reportEvent.historyEventId);
  const historical = state.history.events.find((event) => event.id === reportEvent.historyEventId);
  assert.equal(historical.type, "resolved_crisis");
  assert.ok(historical.causedBy.some((id) => id.startsWith("pressure-")));
  assert.ok(historical.effects.length >= 1);
  assert.match(historical.accounts.worldTruth, /蓄積圧力/);
  assert.match(historical.accounts.historicalRecord, new RegExp(choice.name));
});

test("the lore compiler groups event-sourced records into eras without inventing events", () => {
  const state = createInitialState();
  const events = getHistoricalOverview(state, "nereia").events;
  const eras = compileHistoricalEras(state, "nereia");
  assert.ok(eras.length >= 1);
  assert.equal(eras.reduce((sum, era) => sum + era.events.length, 0), events.length);
  assert.ok(eras.some((era) => era.events.some((event) => event.id === "prehistory-nereia-173")));
});
