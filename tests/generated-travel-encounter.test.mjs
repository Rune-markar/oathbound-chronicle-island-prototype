import test from "node:test";
import assert from "node:assert/strict";
import { getGeneratedExpeditionReachableRegions, moveGeneratedExpeditionToRegion } from "../src/generated-world-system.js";
import { createCareerInitialState } from "../src/simulation.js";
import { createDungeonTacticalBattle, startGeneratedTravelEncounter } from "../src/adventure-system.js";

test("a forced direct-route encounter becomes a strong shared tactical monster battle", () => {
  const state = createCareerInitialState({ seed: "direct-travel-encounter", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const destination = getGeneratedExpeditionReachableRegions(state)[0];
  const moved = moveGeneratedExpeditionToRegion(state, destination.regionId, { mode: "direct", encounterRoll: 0, strengthRoll: 0 });
  const encountered = startGeneratedTravelEncounter(moved);
  assert.equal(encountered.adventure.activeRun.mode, "travel");
  assert.equal(encountered.adventure.activeRun.enemyUnitLimit, 3);
  assert.equal(encountered.adventure.activeRun.combat.enemyMaxHp, 68);
  const battle = createDungeonTacticalBattle(encountered);
  assert.equal(battle.combatScale, "personal-units");
  assert.ok(battle.units.some((unit) => unit.side === "enemy" && unit.maxHp >= 68));
});

test("a rare route-following encounter uses the weak-monster profile", () => {
  const state = createCareerInitialState({ seed: "road-travel-encounter", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const destination = getGeneratedExpeditionReachableRegions(state)[0];
  const moved = moveGeneratedExpeditionToRegion(state, destination.regionId, { mode: "route", encounterRoll: 0, strengthRoll: 0 });
  const encountered = startGeneratedTravelEncounter(moved);
  assert.equal(encountered.adventure.activeRun.enemyUnitLimit, 1);
  assert.equal(encountered.adventure.activeRun.combat.enemyMaxHp, 24);
});
