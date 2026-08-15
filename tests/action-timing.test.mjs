import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTION_ACTOR_TYPES,
  ACTION_TIMING_DEFAULTS,
  deriveActionInterval,
  isActionDue,
} from "../src/action-timing.js";
import {
  createBattleMap,
  createBattleState,
  createCombatUnit,
  createCommander,
  executeBattleTurn,
  setBattleActionTimingConfig,
} from "../src/tactical-battle.js";

test("AI uses seven as its configurable baseline and ability reduces the interval", () => {
  assert.equal(ACTION_TIMING_DEFAULTS.ai.baseInterval, 7);
  assert.equal(deriveActionInterval({ actorType: ACTION_ACTOR_TYPES.AI, abilityScore: 10 }), 7);
  assert.equal(deriveActionInterval({ actorType: ACTION_ACTOR_TYPES.AI, abilityScore: 14 }), 5);
  assert.equal(deriveActionInterval({ actorType: ACTION_ACTOR_TYPES.AI, abilityScore: 6 }), 9);
});

test("the local player uses ten while remote-player defaults remain seven times five or six", () => {
  assert.equal(deriveActionInterval({ actorType: ACTION_ACTOR_TYPES.LOCAL_PLAYER, abilityScore: 10 }), 10);
  assert.equal(deriveActionInterval({ actorType: ACTION_ACTOR_TYPES.LOCAL_PLAYER, abilityScore: 16 }), 7);
  const remoteIntervals = ["remote-a", "remote-b", "remote-c", "remote-d"].map((actorId) => (
    deriveActionInterval({ actorType: ACTION_ACTOR_TYPES.REMOTE_PLAYER, actorId, abilityScore: 10 })
  ));
  assert.ok(remoteIntervals.every((interval) => [35, 42].includes(interval)));
  assert.ok(remoteIntervals.every((interval) => interval % 7 === 0));
});

test("only actors whose next action value equals game action time can act", () => {
  const map = createBattleMap({ width: 8, height: 6 });
  const commanders = [
    createCommander({ id: "p-cmd", name: "Player", side: "player", position: { x: 1, y: 1 } }),
    createCommander({ id: "e-cmd", name: "AI", side: "enemy", position: { x: 6, y: 4 } }),
  ];
  const units = [
    createCombatUnit({ id: "player", name: "Player", side: "player", commanderId: "p-cmd", position: { x: 2, y: 3 }, order: "attack", actionActorType: "local_player", actionAbilityScore: 10 }),
    createCombatUnit({ id: "ai", name: "AI", side: "enemy", commanderId: "e-cmd", position: { x: 5, y: 3 }, facing: "west", order: "attack", actionActorType: "ai", actionAbilityScore: 10 }),
  ];
  let battle = createBattleState({ map, units, commanders, supplyNodes: [] });
  battle = executeBattleTurn(battle);
  assert.equal(battle.actionTime, 0);
  assert.equal(battle.units.find((unit) => unit.id === "player").nextActionAt, 10);
  assert.equal(battle.units.find((unit) => unit.id === "ai").nextActionAt, 7);

  battle = executeBattleTurn(battle);
  assert.equal(battle.actionTime, 7);
  assert.equal(battle.units.find((unit) => unit.id === "player").lastActionAt, 0);
  assert.equal(battle.units.find((unit) => unit.id === "ai").lastActionAt, 7);
  assert.equal(isActionDue(battle.actionTime, battle.units.find((unit) => unit.id === "player").nextActionAt), false);

  battle = executeBattleTurn(battle);
  assert.equal(battle.actionTime, 10);
  assert.equal(battle.units.find((unit) => unit.id === "player").lastActionAt, 10);
});

test("timing values can be changed later without rewriting the battle engine", () => {
  const battle = createBattleState({ units: [], commanders: [] });
  const changed = setBattleActionTimingConfig(battle, {
    localPlayer: { baseInterval: 12, minimumInterval: 5, maximumInterval: 20 },
  });
  assert.equal(changed.actionTimingConfig.localPlayer.baseInterval, 12);
  assert.equal(deriveActionInterval({ actorType: "local_player", abilityScore: 14 }, changed.actionTimingConfig), 10);
});
