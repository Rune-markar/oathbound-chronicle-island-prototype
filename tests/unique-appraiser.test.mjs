import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  advanceDungeonRun,
  getRegionAdventureSites,
  getTavernCandidates,
  interactWithNpcCandidate,
  inviteTavernCandidate,
  normalizeAdventureState,
  startDungeonRun,
} from "../src/adventure-system.js";
import { createCharacterCodexSections, resolveCharacterScene } from "../src/character-template.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";
import { WORLD, createCareerInitialState } from "../src/simulation.js";
import {
  NOELA_COMPANION_ID,
  NOELA_ORBIS_ID,
  UNIQUE_CHARACTERS,
} from "../src/unique-characters.js";

function fixture(seed = "unique-appraiser-test") {
  const state = normalizeAdventureState(createCareerInitialState({ seed }));
  const world = getGeneratedWorldView(state);
  const context = { region: world.expeditionRegion, nation: world.playerNation, runtime: world.runtime };
  return { state, context, sites: getRegionAdventureSites(state, context) };
}

const impress = (state, candidateId, context) => interactWithNpcCandidate(state, candidateId, "gentle", context, { roll: 0 });

test("ノエラは既存商人と分離した完全なユニーク鑑定商として登録される", () => {
  const appraiser = UNIQUE_CHARACTERS[NOELA_ORBIS_ID];
  assert.equal(appraiser.name, "ノエラ・オルビス");
  assert.equal(appraiser.identity.age, 21);
  assert.equal(appraiser.metadata.characterKind, "unique");
  assert.equal(appraiser.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(appraiser.gameplay.role, "遺物鑑定商");
  assert.equal(appraiser.stats.intelligence, 91);
  assert.equal(appraiser.adventure.memberId, NOELA_COMPANION_ID);
  assert.equal(appraiser.adventure.passiveId, "provenance_seal");
  assert.equal(WORLD.characters[NOELA_ORBIS_ID], appraiser);
  assert.equal(Object.hasOwn(createCareerInitialState({ seed: "unique-appraiser-officer-boundary" }).officers, NOELA_ORBIS_ID), false);
  assert.ok(existsSync(new URL(`../${appraiser.portraitImage}`, import.meta.url)));

  const metadata = createCharacterCodexSections(appraiser, {})
    .find((section) => section.id === "metadata").fields;
  assert.equal(metadata.find((field) => field.path === "metadata.characterKind").value, "ユニークキャラクター");
  assert.equal(resolveCharacterScene(appraiser, "exploration.loot.appraise").id, "noela-provenance-seal");
});

test("酒場でノエラを一度だけ登用し、来歴封緘を同行能力として保持する", () => {
  const { state, context } = fixture("unique-appraiser-tavern-test");
  const candidates = getTavernCandidates(state, context);
  const appraiser = candidates.find((candidate) => candidate.uniqueCharacterId === NOELA_ORBIS_ID);
  assert.equal(candidates.filter((candidate) => !candidate.unique).length, 4);
  assert.equal(appraiser.id, NOELA_COMPANION_ID);
  assert.equal(appraiser.role, "鑑定商");
  assert.equal(appraiser.unique, true);
  assert.equal(appraiser.transparent, true);
  assert.match(appraiser.passiveDescription, /回収量を1から2/);

  const recruited = inviteTavernCandidate(impress(state, appraiser.id, context), appraiser.id, context);
  const partyMember = recruited.player.villageLife.party.find((member) => member.id === NOELA_COMPANION_ID);
  assert.equal(partyMember.uniqueCharacterId, NOELA_ORBIS_ID);
  assert.equal(partyMember.passiveId, "provenance_seal");
  assert.equal(partyMember.transparent, true);
  assert.throws(() => inviteTavernCandidate(recruited, appraiser.id, context), /すでにパーティー/);
});

test("来歴封緘は共有探索APIの戦利品回収量を実際に増やす", () => {
  const { state, context, sites } = fixture("unique-appraiser-loot-test");
  const ordinary = advanceDungeonRun(startDungeonRun(state, sites.dungeon, context.region));
  const ordinaryLoot = ordinary.adventure.activeRun.loot[0];
  assert.equal(ordinaryLoot.quantity, 1);
  assert.equal(ordinaryLoot.provenanceAppraiserId, undefined);

  const candidate = getTavernCandidates(state, context).find((entry) => entry.uniqueCharacterId === NOELA_ORBIS_ID);
  const recruited = inviteTavernCandidate(impress(state, candidate.id, context), candidate.id, context);
  const appraised = advanceDungeonRun(startDungeonRun(recruited, sites.dungeon, context.region));
  const recovered = appraised.adventure.activeRun.loot[0];
  assert.equal(recovered.quantity, 2);
  assert.equal(recovered.provenanceAppraiserId, NOELA_ORBIS_ID);
  assert.equal(appraised.adventure.activeRun.provenanceBonusLoot, 1);
  assert.equal(appraised.adventure.inventory.find((item) => item.id === recovered.id).quantity, 2);
  assert.equal(appraised.player.villageLife.inventory.find((item) => item.id === recovered.id).quantity, 2);
  assert.match(appraised.adventure.activeRun.log[0].message, /来歴封緘/);
});
