import test from "node:test";
import assert from "node:assert/strict";
import { createActionResult } from "../src/action-result.js";
import { appendDomainEvents, getDomainEvents } from "../src/domain-events.js";
import {
  GAME_MINUTES_PER_MONTH,
  advanceGameClock,
  createGameClock,
  formatGamePeriod,
  gameClockAtPeriod,
  getGameCalendar,
  normalizeStateGameClock,
} from "../src/game-clock.js";
import { normalizeGameOperation, operationIsDue } from "../src/game-operation.js";
import { createSaveRegistry, readRegisteredSave, writeRegisteredSave } from "../src/save-registry.js";
import { advanceRegisteredMonth, createSystemRegistry, getRegisteredOperations } from "../src/system-registry.js";

test("the shared V3 clock starts in 317-04 and reports every crossed month", () => {
  const clock = createGameClock({ elapsedMinutes: 8 * 60 });
  assert.equal(formatGamePeriod(clock), "317年4月");
  const advanced = advanceGameClock(clock, GAME_MINUTES_PER_MONTH * 2);
  assert.equal(formatGamePeriod(advanced.clock), "317年6月");
  assert.deepEqual(advanced.crossedMonths.map(({ year, month }) => [year, month]), [[317, 5], [317, 6]]);
  assert.equal(getGameCalendar(advanced.clock).hour, 8);
  assert.deepEqual(
    (({ year, month, day, hour, minute }) => ({ year, month, day, hour, minute }))(getGameCalendar(gameClockAtPeriod(clock, "318-2"))),
    { year: 318, month: 2, day: 1, hour: 0, minute: 0 },
  );
});

test("legacy clockMinutes migrates into one canonical clock without losing its projection", () => {
  const normalized = normalizeStateGameClock({ clockMinutes: 1234, player: {} });
  assert.equal(normalized.clock.elapsedMinutes, 1234);
  assert.equal(normalized.clockMinutes, 1234);
});

test("domain events are versioned deduplicated and bounded through one log", () => {
  const state = normalizeStateGameClock({ clockMinutes: 480 });
  const event = { id: "crime:1", type: "crime.resolved", source: "criminal", summary: "事件が決着した", actorIds: ["player"] };
  const next = appendDomainEvents(appendDomainEvents(state, event), event);
  assert.equal(getDomainEvents(next).length, 1);
  assert.equal(getDomainEvents(next)[0].period, "317-4");
});

test("registered systems share normalization monthly advancement and operation projections", () => {
  const registry = createSystemRegistry([{ id: "example", version: 2, onMonth: (_context, state) => createActionResult({ ...state, ticks: (state.ticks ?? 0) + 1 }, { events: [{ type: "example.tick", source: "example" }] }), getOperations: () => [{ id: "op", systemId: "example", status: "active", dueAtMinutes: 600 }] }]);
  const result = advanceRegisteredMonth(registry, {}, {}, {});
  assert.equal(result.state.ticks, 1);
  assert.equal(result.events[0].type, "example.tick");
  const operation = getRegisteredOperations(registry, {}, result.state)[0];
  assert.equal(normalizeGameOperation(operation).systemId, "example");
  assert.equal(operationIsDue(operation, 600), true);
});

test("system dependencies are ordered and invalid dependency graphs are rejected", () => {
  const registry = createSystemRegistry([
    { id: "feature", version: 1, dependsOn: ["clock"] },
    { id: "clock", version: 1 },
  ]);
  assert.deepEqual(registry.modules.map((module) => module.id), ["clock", "feature"]);
  assert.throws(() => createSystemRegistry([{ id: "feature", version: 1, dependsOn: ["missing"] }]), /依存先/);
  assert.throws(() => createSystemRegistry([
    { id: "one", version: 1, dependsOn: ["two"] },
    { id: "two", version: 1, dependsOn: ["one"] },
  ]), /循環/);
});

test("save registry migrates legacy envelopes and records every system version", () => {
  const storage = new Map();
  const adapter = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const registry = createSaveRegistry({ version: 4, modules: [{ id: "clock", version: 1, legacyVersion: 1 }, { id: "events", version: 1, legacyVersion: 1 }], migrate: (raw) => [3, 4].includes(raw.version) ? raw : null });
  adapter.setItem("save", JSON.stringify({ version: 3, field: { player: {} } }));
  const restored = readRegisteredSave(adapter, "save", registry);
  assert.equal(restored.version, 4);
  assert.deepEqual(restored.systemVersions, { clock: 1, events: 1 });
  const saved = writeRegisteredSave(adapter, "save", registry, restored);
  assert.equal(saved.version, 4);
});

test("save registry runs every declared module migration before stamping the new version", () => {
  const registry = createSaveRegistry({
    version: 4,
    modules: [{
      id: "merchant",
      version: 3,
      legacyVersion: 1,
      migrations: {
        1: (raw) => ({ ...raw, merchant: { ...raw.merchant, firstMigration: true } }),
        2: (raw) => ({ ...raw, merchant: { ...raw.merchant, secondMigration: true } }),
      },
    }],
  });
  const migrated = registry.migrate({ version: 4, systemVersions: { merchant: 1 }, merchant: { legacyShape: true } });
  assert.deepEqual(migrated.merchant, { legacyShape: true, firstMigration: true, secondMigration: true });
  assert.equal(migrated.systemVersions.merchant, 3);
});

test("save registry refuses to relabel old or future module data without a valid path", () => {
  const missingMigration = createSaveRegistry({
    version: 4,
    modules: [{ id: "merchant", version: 2, legacyVersion: 1 }],
  });
  assert.throws(
    () => missingMigration.migrate({ version: 4, systemVersions: { merchant: 1 }, merchant: { legacyShape: true } }),
    /移行がありません/,
  );
  const current = createSaveRegistry({ version: 4, modules: [{ id: "merchant", version: 2, legacyVersion: 2 }] });
  assert.throws(() => current.migrate({ version: 4, systemVersions: { merchant: 3 } }), /未来版/);
});
