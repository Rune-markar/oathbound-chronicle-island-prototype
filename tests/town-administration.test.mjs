import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  EVENT_DEFINITIONS,
  adoptDoctrine,
  commitMonth,
  createInitialState,
  getTownAdministration,
  normalizeWarState,
  queueOrder,
  resolveEventChoice,
} from "../src/simulation.js";

function settle(state) {
  let next = commitMonth(state.council.pending ? adoptDoctrine(state, "balanced") : state);
  if (next.phase === "event") next = resolveEventChoice(next, EVENT_DEFINITIONS[next.pendingEvent.eventId].choices[0].id);
  return next;
}

test("v8 saves migrate immediately to six persistent town administrations", () => {
  const legacy = createInitialState();
  legacy.version = 8;
  delete legacy.towns;
  const migrated = normalizeWarState(legacy);
  assert.equal(migrated.version, 9);
  assert.deepEqual(Object.keys(migrated.towns).sort(), ["aonagi", "haimugi", "kanezaka", "mugiwano", "shionari", "tsukishiro"]);
  Object.values(migrated.towns).forEach((town) => {
    assert.ok(Number.isFinite(town.population));
    assert.ok(Number.isFinite(town.registryCoverage));
    assert.ok(Number.isFinite(town.petitionBacklog));
  });
});

test("town administration derives capacity, needs, and a monthly forecast", () => {
  const state = createInitialState();
  const town = getTownAdministration(state, "mugiwano");
  assert.equal(town.cityId, "selene");
  assert.equal(town.name, "麦輪村");
  assert.ok(Number.isFinite(town.forecast.administrativeCapacity));
  assert.ok(Number.isFinite(town.forecast.populationDelta));
  assert.ok(town.forecast.needs.length >= 6);
  assert.ok(town.forecast.primaryNeed.value <= town.forecast.needs.at(-1).value);
});

test("a local command stores its town target and improves only that town", () => {
  let state = adoptDoctrine(createInitialState(), "balanced");
  const selectedBefore = state.towns.mugiwano.commerce;
  const siblingBefore = state.towns.tsukishiro.commerce;
  state = queueOrder(state, {
    kind: "command",
    commandId: "city.commerce",
    officerId: "edras",
    cityId: "selene",
    townId: "mugiwano",
  });
  assert.equal(state.pendingOrders[0].townId, "mugiwano");
  state = settle(state);
  assert.ok(state.towns.mugiwano.commerce > selectedBefore);
  assert.equal(state.towns.tsukishiro.commerce, siblingBefore);
  assert.equal(state.monthlyReports[0].actions.find((action) => action.commandId === "city.commerce").townId, "mugiwano");
  assert.equal(state.towns.mugiwano.history[0].commandId, "city.commerce");
});

test("strategic commands remain city or national orders without a town target", () => {
  let state = adoptDoctrine(createInitialState(), "balanced");
  state = queueOrder(state, {
    kind: "command",
    commandId: "admin.harbor_standard",
    officerId: "edras",
    cityId: "orta",
  });
  assert.equal(state.pendingOrders[0].townId, null);
});

test("the UI routes map and council town actions into town administration", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /data-panel="town"/);
  assert.equal((html.match(/class="village-hit"/g) ?? []).length, 6);
  assert.match(app, /data-open-town-command/);
  assert.match(app, /command\.spendingCategory === categoryId && !isTownCommand\(command\)/);
  assert.match(app, /view\.selectedType === "village"[\s\S]+view\.panel = "town"/);
});
