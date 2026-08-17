import test from "node:test";
import assert from "node:assert/strict";
import {
  MASTERY_CATALOG,
  getMasteryView,
  normalizeMasteryState,
  recordMasteryEvent,
  toggleMasteryLoadout,
} from "../src/skill-mastery-system.js";
import { createCareerInitialState } from "../src/simulation.js";
import { createBattleMap, createBattleState, createCombatUnit, createCommander, planUnitAbility } from "../src/tactical-battle.js";

function masteryState(seed = "mastery-test") {
  return normalizeMasteryState(createCareerInitialState({ seed }));
}

test("the mastery catalog contains many playable spells and practiced talents", () => {
  const entries = Object.values(MASTERY_CATALOG);
  assert.equal(entries.length, 25);
  assert.equal(entries.filter((entry) => entry.kind === "magic").length, 12);
  assert.equal(entries.filter((entry) => entry.kind === "talent").length, 13);
  const state = masteryState();
  assert.deepEqual(state.player.mastery.equippedMagicIds, ["kindled_spark"]);
  assert.deepEqual(state.player.mastery.equippedTalentIds, ["roadwise"]);
});

test("compound gameplay conditions unlock a spell only after every required experience", () => {
  const state = masteryState("compound-mastery");
  recordMasteryEvent(state, "magic_casts", 3);
  assert.equal(getMasteryView(state).find((entry) => entry.id === "pyre_circuit").unlocked, false);
  const gained = recordMasteryEvent(state, "cave_explorations", 1);
  assert.ok(gained.includes("pyre_circuit"));
  assert.equal(getMasteryView(state).find((entry) => entry.id === "pyre_circuit").unlocked, true);
});

test("alternative acquisition routes support lawful survival play as well as stealth play", () => {
  const state = masteryState("alternate-mastery");
  recordMasteryEvent(state, "retreats", 2);
  recordMasteryEvent(state, "journeys", 8);
  assert.equal(getMasteryView(state).find((entry) => entry.id === "shade_mantle").unlocked, true);
  assert.equal(state.player.mastery.counters.stealth_successes ?? 0, 0);
});

test("loadout limits force meaningful preparation choices", () => {
  const state = masteryState("loadout-mastery");
  ["magic_casts", "cave_explorations", "damage_taken", "spring_explorations", "journeys", "retreats", "dungeon_clears", "recruits"].forEach((key) => {
    recordMasteryEvent(state, key, 20);
  });
  state.player.abilities.intelligence = 18;
  normalizeMasteryState(state);
  const unlockedSpells = state.player.mastery.unlockedIds.filter((id) => MASTERY_CATALOG[id]?.kind === "magic").slice(0, 5);
  let next = state;
  for (const id of unlockedSpells.slice(1, 4)) next = toggleMasteryLoadout(next, id);
  assert.equal(next.player.mastery.equippedMagicIds.length, 4);
  assert.throws(() => toggleMasteryLoadout(next, unlockedSpells[4]), /装備枠は4つ/);
});

test("tactical units can plan only the magic equipped for that battle", () => {
  const commander = createCommander({ id: "cmd", name: "術師長", side: "player", position: { x: 1, y: 2 }, commandRange: 10 });
  const enemyCommander = createCommander({ id: "enemy-cmd", name: "敵将", side: "enemy", position: { x: 5, y: 2 } });
  const mage = createCombatUnit({ id: "mage", name: "主人公", side: "player", unitClassId: "infantry", commanderId: commander.id, position: { x: 2, y: 2 }, abilityIds: ["magic"], availableMagicSkillIds: ["arcane_bolt"] });
  const enemy = createCombatUnit({ id: "enemy", name: "敵", side: "enemy", commanderId: enemyCommander.id, position: { x: 4, y: 2 } });
  const battle = createBattleState({ id: "mastery-battle", name: "習得試験", map: createBattleMap({ width: 7, height: 6 }), units: [mage, enemy], commanders: [commander, enemyCommander], supplyNodes: [] });
  assert.doesNotThrow(() => planUnitAbility(battle, mage.id, "arcane_bolt", enemy.position));
  assert.throws(() => planUnitAbility(battle, mage.id, "lightning", enemy.position), /装備していません/);
});
