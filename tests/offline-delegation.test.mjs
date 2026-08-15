import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTOSAVE_INTERVAL_MS,
  OFFLINE_MAX_MONTHS,
  OFFLINE_MONTH_MS,
  markChronicleSaved,
  resumeDelegatedChronicle,
} from "../src/offline-delegation.js";

const base = () => ({
  player: { month: 0, history: [] },
  persistence: { lastSavedAt: new Date(1_000).toISOString() },
  council: { pending: false },
});

test("autosave cadence is frequent enough for an abrupt browser exit", () => {
  assert.equal(AUTOSAVE_INTERVAL_MS, 15_000);
});

test("offline delegation advances one month per elapsed day and records a return chronicle", () => {
  const advance = (state) => ({ ...state, player: { ...state.player, month: state.player.month + 1, history: state.player.history } });
  const now = 1_000 + OFFLINE_MONTH_MS * 3 + 500;
  const resumed = resumeDelegatedChronicle(base(), advance, now);
  assert.equal(resumed.state.player.month, 3);
  assert.equal(resumed.report.monthsAdvanced, 3);
  assert.equal(resumed.state.player.history[0].title, "留守中の年代記");
  assert.equal(resumed.state.persistence.lastSavedAt, new Date(now).toISOString());
});

test("offline progress is capped and major decisions remain pending", () => {
  const source = base();
  source.council.pending = true;
  const advance = (state) => ({ ...state, player: { ...state.player, month: state.player.month + 1, history: state.player.history } });
  const resumed = resumeDelegatedChronicle(source, advance, 1_000 + OFFLINE_MONTH_MS * 99);
  assert.equal(resumed.state.player.month, OFFLINE_MAX_MONTHS);
  assert.deepEqual(resumed.report.pendingDecisions, ["季節評定"]);
});

test("irreversible generated-nation decisions are shared in the return chronicle", () => {
  const advance = (state) => ({
    ...state,
    generatedWorld: {
      pendingStrategicDecisions: [{ title: "試験国・停戦受諾" }],
    },
  });
  const resumed = resumeDelegatedChronicle(base(), advance, 1_000 + OFFLINE_MONTH_MS);
  assert.ok(resumed.report.pendingDecisions.includes("試験国・停戦受諾"));
});

test("saving stamps a clone without mutating the live state", () => {
  const source = base();
  const saved = markChronicleSaved(source, 42_000);
  assert.notEqual(saved, source);
  assert.notEqual(saved.persistence.lastSavedAt, source.persistence.lastSavedAt);
});
