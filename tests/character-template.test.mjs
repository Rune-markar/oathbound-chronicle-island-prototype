import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARACTER_TEMPLATE_FIELD_COUNT,
  CHARACTER_TEMPLATE_SCHEMA_VERSION,
  CHARACTER_TEMPLATE_SECTIONS,
  HUMAN_CHARACTER_ARCHETYPES,
  createCharacterCodexSections,
  createCharacterDefinition,
  resolveCharacterScene,
} from "../src/character-template.js";
import { ENEMY_COMMANDERS, WORLD, createInitialState, getOfficerReport } from "../src/simulation.js";

test("character template exposes a stable, categorized field inventory", () => {
  assert.equal(CHARACTER_TEMPLATE_SCHEMA_VERSION, 1);
  assert.ok(CHARACTER_TEMPLATE_SECTIONS.length >= 8);
  assert.ok(CHARACTER_TEMPLATE_FIELD_COUNT >= 60);
  const paths = CHARACTER_TEMPLATE_SECTIONS.flatMap((section) => section.fields.map((field) => field.path));
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.includes("identity.name"));
  assert.ok(paths.includes("visuals.portraitImage"));
  assert.ok(paths.includes("current.assignment"));
  assert.ok(paths.includes("scenes.defeatRetreat"));
});

test("character definitions keep legacy game fields while adding the complete template", () => {
  const character = createCharacterDefinition({
    id: "test-human",
    name: "試験人物",
    raceId: "human",
    portraitImage: "assets/test.webp",
    role: "試験官",
    policy: "検証",
    archetypeId: "human_strategist",
    stats: { leadership: 61, intelligence: 82 },
    traits: ["scouting"],
  });
  assert.equal(character.id, "test-human");
  assert.equal(character.role, "試験官");
  assert.equal(character.stats.intelligence, 82);
  assert.equal(character.identity.raceId, "human");
  assert.equal(character.capabilities.stats.leadership, 61);
  assert.equal(character.capabilities.stats.war, null);
  assert.deepEqual(character.personality.traits, ["scouting"]);
  assert.equal(character.metadata.templateVersion, CHARACTER_TEMPLATE_SCHEMA_VERSION);
});

test("three human archetypes provide distinct extensible defeat reactions", () => {
  assert.deepEqual(Object.keys(HUMAN_CHARACTER_ARCHETYPES), ["human_honor", "human_strategist", "human_guardian"]);
  const lines = Object.keys(HUMAN_CHARACTER_ARCHETYPES).map((archetypeId) => {
    const character = createCharacterDefinition({ id: archetypeId, name: archetypeId, raceId: "human", archetypeId });
    return resolveCharacterScene(character, "battle.defeat.retreat").dialogue[0].text;
  });
  assert.equal(new Set(lines).size, 3);
  assert.ok(lines.every((line) => /退|撤退/.test(line)));
});

test("new event keys can be added per character without changing the template", () => {
  const character = createCharacterDefinition({
    id: "event-test",
    name: "場面試験人物",
    scenes: {
      "council.vote": [
        { id: "oppose", priority: 20, when: { choice: "centralize" }, dialogue: ["その案には反対です。"] },
        { id: "default", priority: 1, dialogue: ["判断を待ちます。"] },
      ],
    },
  });
  const selected = resolveCharacterScene(character, "council.vote", { choice: "centralize" });
  assert.equal(selected.id, "oppose");
  assert.deepEqual(selected.dialogue[0], { speaker: "self", text: "その案には反対です。" });
  assert.equal(resolveCharacterScene(character, "council.vote", { choice: "defer" }).id, "default");
});

test("codex sections list every field and distinguish current state from unset definition values", () => {
  const character = createCharacterDefinition({ id: "codex-test", name: "辞典試験", raceId: "human", role: "将官" });
  const sections = createCharacterCodexSections(character, { allegiance: "王国軍", loyalty: 77 });
  const fields = sections.flatMap((section) => section.fields);
  assert.equal(fields.length, CHARACTER_TEMPLATE_FIELD_COUNT);
  assert.equal(fields.find((field) => field.path === "current.allegiance").value, "王国軍");
  assert.equal(fields.find((field) => field.path === "current.allegiance").current, true);
  assert.equal(fields.find((field) => field.path === "visuals.height").value, "未設定");
  assert.equal(fields.find((field) => field.path === "visuals.height").configured, false);
});

test("existing officers and enemy commanders use the shared character template without breaking reports", () => {
  const state = createInitialState();
  Object.values(WORLD.characters).forEach((character) => {
    assert.equal(character.schemaVersion, CHARACTER_TEMPLATE_SCHEMA_VERSION);
    assert.equal(character.identity.raceId, "human");
  });
  const officer = getOfficerReport(state, "gaius");
  assert.equal(officer.name, "ガイウス・オルタ");
  assert.equal(officer.stats.leadership, 76);
  assert.equal(resolveCharacterScene(officer, "battle.defeat.retreat").id, "human-honor-defeat-retreat");
  assert.equal(ENEMY_COMMANDERS.valka.gameplay.commander, true);
});
