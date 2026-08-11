import test from "node:test";
import assert from "node:assert/strict";
import { ABILITY_KEYS, rollAbilityScores } from "../src/character-abilities.js";
import { getTavernCandidates, normalizeAdventureState } from "../src/adventure-system.js";
import { WORLD, createCareerInitialState } from "../src/simulation.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";

test("D&D-style 4d6 rolls are deterministic per seed and remain in the 3-18 range", () => {
  const first = rollAbilityScores({ seed: "ability-seed", roleId: "warrior" });
  const second = rollAbilityScores({ seed: "ability-seed", roleId: "warrior" });
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first).sort(), [...ABILITY_KEYS].sort());
  assert.ok(Object.values(first).every((score) => score >= 3 && score <= 18));
  assert.ok(first.strength >= first.intelligence);
  assert.ok(first.constitution >= first.charisma);
  const scholar = rollAbilityScores({ seed: "ability-seed", roleId: "scholar" });
  assert.ok(scholar.intelligence >= scholar.strength);
  assert.ok(scholar.wisdom >= scholar.charisma);
});

test("the player, all world characters, and generated tavern characters carry six abilities", () => {
  const state = normalizeAdventureState(createCareerInitialState({ seed: "all-character-abilities" }));
  const world = getGeneratedWorldView(state);
  const context = { runtime: world.runtime, region: world.expeditionRegion, nation: world.playerNation };
  const characters = [state.player, ...Object.values(WORLD.characters), ...getTavernCandidates(state, context)];
  characters.forEach((character) => {
    assert.ok(character.abilities, `${character.name} needs abilities`);
    ABILITY_KEYS.forEach((abilityId) => assert.ok(Number.isInteger(character.abilities[abilityId]), `${character.name}.${abilityId}`));
  });
});
