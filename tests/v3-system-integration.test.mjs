import test from "node:test";
import assert from "node:assert/strict";
import { createActionResult } from "../src/action-result.js";
import { getDomainEvents } from "../src/domain-events.js";
import { GAME_MINUTES_PER_MONTH, getGameCalendar, setStateGameClock } from "../src/game-clock.js";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import { createV3FieldState, createV3WorldContext } from "../src/v3-field-system.js";
import { applyV3BattleResultToWorldSimulation, bindV3BattleToStrategicWar } from "../src/v3-battle-strategy.js";
import { readV3Save, writeV3Save } from "../src/v3-save-system.js";
import { commitV3Action, normalizeV3IntegratedState } from "../src/v3-system-kernel.js";
import { createV3WorldSimulation } from "../src/v3-world-simulation.js";

function integratedFixture() {
  const options = createGeneratedWorldState({ seed: "v3-integrated-kernel", width: 24, height: 16, plateCount: 4, nationCount: 3 });
  const runtime = buildGeneratedWorld(options);
  const context = createV3WorldContext(runtime, options.seed);
  const simulation = createV3WorldSimulation(runtime, options);
  const state = normalizeV3IntegratedState(context, createV3FieldState(context, { playerName: "統合試験者" }));
  return { runtime, context, simulation, state, options };
}

test("one crossed clock boundary advances world merchant crime and domain events together", () => {
  const { runtime, context, simulation, state } = integratedFixture();
  const before = setStateGameClock(state, { ...state.clock, elapsedMinutes: GAME_MINUTES_PER_MONTH - 1 });
  const result = commitV3Action(runtime, context, before, simulation, createActionResult(before, { elapsedMinutes: 2 }), { source: "integration-test" });
  assert.deepEqual([result.worldSimulation.year, result.worldSimulation.month], [317, 5]);
  assert.deepEqual([getGameCalendar(result.state.clock).year, getGameCalendar(result.state.clock).month], [317, 5]);
  assert.equal(result.crossedMonths.length, 1);
  assert.ok(getDomainEvents(result.state).some((entry) => entry.type === "criminal.month.advanced"));
  assert.ok(getDomainEvents(result.state).some((entry) => entry.type === "clock.advanced"));
  assert.equal(result.state.clockMinutes, result.state.clock.elapsedMinutes);
});

test("V3 save registry upgrades version three and aligns its canonical clock to the newer world month", () => {
  const storage = new Map();
  const adapter = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const legacy = {
    version: 3,
    world: { seed: "legacy-clock" },
    field: { version: 3, seed: "legacy-clock", player: { name: "旧冒険者" }, clockMinutes: 610 },
    worldSimulation: { version: 1, year: 318, month: 2 },
  };
  adapter.setItem("v3", JSON.stringify(legacy));
  const migrated = readV3Save(adapter, "v3");
  assert.equal(migrated.version, 4);
  assert.deepEqual([getGameCalendar(migrated.field.clock).year, getGameCalendar(migrated.field.clock).month], [318, 2]);
  assert.equal(migrated.field.clock.elapsedMinutes % GAME_MINUTES_PER_MONTH, 610);
  const saved = writeV3Save(adapter, "v3", migrated);
  assert.equal(saved.systemVersions["system-kernel"], 1);
  assert.equal(saved.systemVersions["merchant-company"], 2);
});

test("a tactical BattleResult updates its bound strategic force and front exactly once", () => {
  const war = {
    id: "war:one",
    attackerNationId: "nation-a",
    defenderNationId: "nation-b",
    targetRegionId: "region-b",
    phase: "campaigning",
    attacker: { initialStrength: 500, strength: 480, supply: 70, morale: 60, casualties: 20 },
    defender: { initialStrength: 500, strength: 470, supply: 65, morale: 58, casualties: 30 },
    fronts: [{ id: "main", originRegionId: "region-a", targetRegionId: "region-b", progress: 40, attackerLosses: 20, defenderLosses: 30 }],
    log: [],
  };
  const simulation = {
    version: 1,
    year: 317,
    month: 4,
    generatedWorld: { worldWars: { activeWars: [war], events: [] }, tacticalOutcomes: [], geopolitics: { nationStates: {} } },
  };
  const binding = bindV3BattleToStrategicWar(simulation, "nation-a", "region-a");
  assert.deepEqual({ warId: binding.warId, frontId: binding.frontId, playerSide: binding.playerSide }, { warId: "war:one", frontId: "main", playerSide: "attacker" });
  const mission = { id: "mission:one", title: "主攻正面迎撃", strategic: binding, playerNation: { id: "nation-a", name: "甲国" }, enemyNation: { id: "nation-b", name: "乙国" } };
  const battleResult = { battleId: "battle:one", winner: "player", resultType: "field_victory", player: { casualties: 7 }, enemy: { casualties: 19 } };
  const first = applyV3BattleResultToWorldSimulation(null, simulation, mission, battleResult);
  const projectedWar = first.worldSimulation.generatedWorld.worldWars.activeWars[0];
  assert.equal(projectedWar.attacker.strength, 473);
  assert.equal(projectedWar.defender.strength, 451);
  assert.equal(projectedWar.fronts[0].progress, 52);
  assert.equal(first.worldSimulation.generatedWorld.tacticalOutcomes.length, 1);
  const second = applyV3BattleResultToWorldSimulation(null, first.worldSimulation, mission, battleResult);
  assert.equal(second.applied, false);
  assert.deepEqual(second.worldSimulation, first.worldSimulation);

  const defeat = applyV3BattleResultToWorldSimulation(null, simulation, mission, {
    ...battleResult,
    battleId: "battle:two",
    winner: "enemy",
  });
  const defeatedWar = defeat.worldSimulation.generatedWorld.worldWars.activeWars[0];
  assert.equal(defeatedWar.fronts[0].progress, 30);
  assert.equal(defeatedWar.attacker.morale, 54);
  assert.equal(defeatedWar.defender.morale, 64);
});
