import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getGeneratedExpeditionReachableRegions, moveGeneratedExpeditionToRegion } from "../src/generated-world-system.js";
import { createCareerInitialState } from "../src/simulation.js";
import { createDungeonTacticalBattle, resolveDungeonTacticalBattle, startGeneratedTravelEncounter, withdrawDungeonBattle } from "../src/adventure-system.js";

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

test("losing a travel encounter returns to the origin while keeping time, supplies, and injuries", () => {
  const state = createCareerInitialState({ seed: "lost-travel-encounter", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const originRegionId = state.generatedWorld.expeditionRegionId;
  const originTileId = state.generatedWorld.expeditionTileId;
  const destination = getGeneratedExpeditionReachableRegions(state)[0];
  const moved = moveGeneratedExpeditionToRegion(state, destination.regionId, { mode: "direct", encounterRoll: 0, strengthRoll: 0 });
  const encountered = startGeneratedTravelEncounter(moved);
  const clockAfterTravel = encountered.generatedWorld.expeditionClockMinutes;
  const movementAfterTravel = encountered.generatedWorld.expeditionMovement;
  const foodAfterTravel = encountered.player.villageLife.supplies.food;
  const run = encountered.adventure.activeRun;
  const result = {
    battleId: run.combat.tacticalBattleId,
    winner: "enemy",
    turn: 2,
    player: { initialSoldiers: 1, casualties: 1, members: [] },
    enemy: { initialSoldiers: 1, casualties: 0, members: [] },
  };

  const resolved = resolveDungeonTacticalBattle(encountered, result);
  assert.equal(resolved.generatedWorld.expeditionRegionId, originRegionId);
  assert.equal(resolved.generatedWorld.expeditionTileId, originTileId);
  assert.equal(resolved.generatedWorld.expeditionClockMinutes, clockAfterTravel);
  assert.equal(resolved.generatedWorld.expeditionMovement, movementAfterTravel);
  assert.equal(resolved.player.villageLife.supplies.food, foodAfterTravel);
  assert.equal(resolved.adventure.activeRun.phase, "failed");
  assert.ok(resolved.player.villageLife.injuries.some((entry) => entry.startsWith("戦闘負傷")));
  assert.match(resolved.adventure.activeRun.log[0].message, /出発地へ戻った/);
});

test("withdrawing before a travel encounter also returns to the origin without refunding the journey", () => {
  const state = createCareerInitialState({ seed: "withdrawn-travel-encounter", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const originRegionId = state.generatedWorld.expeditionRegionId;
  const originTileId = state.generatedWorld.expeditionTileId;
  const destination = getGeneratedExpeditionReachableRegions(state)[0];
  const moved = moveGeneratedExpeditionToRegion(state, destination.regionId, { mode: "route", encounterRoll: 0, strengthRoll: 0 });
  const encountered = startGeneratedTravelEncounter(moved);
  const withdrawn = withdrawDungeonBattle(encountered);

  assert.equal(withdrawn.generatedWorld.expeditionRegionId, originRegionId);
  assert.equal(withdrawn.generatedWorld.expeditionTileId, originTileId);
  assert.equal(withdrawn.generatedWorld.expeditionClockMinutes, encountered.generatedWorld.expeditionClockMinutes);
  assert.equal(withdrawn.player.villageLife.supplies.food, encountered.player.villageLife.supplies.food);
  assert.equal(withdrawn.player.villageLife.fatigue, encountered.player.villageLife.fatigue);
  assert.equal(withdrawn.adventure.activeRun.phase, "failed");
  assert.match(withdrawn.adventure.activeRun.log[0].message, /出発地へ戻った/);
});

test("travel encounters return to the regional map instead of claiming to be a dungeon", () => {
  const appSource = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const labels = appSource.match(/function tacticalOriginLabels\(\)[\s\S]*?function renderBattlePreparationMap/)?.[0] ?? "";
  assert.match(labels, /view\.tacticalOrigin\.runMode === "travel"/);
  assert.match(labels, /travelEncounter \? "地方地図へ戻る" : "ダンジョンへ戻る"/);
  assert.match(appSource, /runMode: run\.mode/);
});
