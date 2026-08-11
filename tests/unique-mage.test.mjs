import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  advanceDungeonRun,
  createDungeonTacticalBattle,
  getDungeonTacticalRoster,
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
  RUNEA_COMPANION_ID,
  RUNEA_VESPER_ID,
  UNIQUE_CHARACTERS,
} from "../src/unique-characters.js";

function fixture(seed = "unique-mage-test") {
  const state = normalizeAdventureState(createCareerInitialState({ seed }));
  const world = getGeneratedWorldView(state);
  const context = { region: world.expeditionRegion, nation: world.playerNation, runtime: world.runtime };
  const sites = getRegionAdventureSites(state, context);
  return { state, context, sites };
}

const impress = (state, candidateId, context) => interactWithNpcCandidate(state, candidateId, "gentle", context, { roll: 0 });

test("ルネアは汎用術師と分離した完全なユニーク魔術師として登録される", () => {
  const mage = UNIQUE_CHARACTERS[RUNEA_VESPER_ID];
  assert.equal(mage.name, "ルネア・ヴェスパー");
  assert.equal(mage.metadata.characterKind, "unique");
  assert.equal(mage.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(mage.gameplay.role, "星環魔術師");
  assert.equal(mage.stats.intelligence, 94);
  assert.equal(mage.adventure.memberId, RUNEA_COMPANION_ID);
  assert.equal(mage.adventure.passiveId, "astral_calibration");
  assert.equal(WORLD.characters[RUNEA_VESPER_ID], mage);
  assert.equal(Object.hasOwn(createCareerInitialState({ seed: "unique-mage-officer-boundary" }).officers, RUNEA_VESPER_ID), false);
  assert.ok(existsSync(new URL(`../${mage.portraitImage}`, import.meta.url)));

  const metadata = createCharacterCodexSections(mage, {})
    .find((section) => section.id === "metadata").fields;
  assert.equal(metadata.find((field) => field.path === "metadata.characterKind").value, "ユニークキャラクター");
  assert.equal(resolveCharacterScene(mage, "battle.magic.stabilize").id, "runea-star-ring-stabilize");
});

test("酒場でルネアを一度だけ登用し、固有能力を探索隊へ保持する", () => {
  const { state, context } = fixture("unique-mage-tavern-test");
  const candidates = getTavernCandidates(state, context);
  const mage = candidates.find((candidate) => candidate.uniqueCharacterId === RUNEA_VESPER_ID);
  assert.equal(candidates.filter((candidate) => !candidate.unique).length, 4);
  assert.equal(mage.id, RUNEA_COMPANION_ID);
  assert.equal(mage.role, "術師");
  assert.equal(mage.unique, true);
  assert.equal(mage.transparent, true);
  assert.match(mage.passiveDescription, /魔力威力22%/);

  const recruited = inviteTavernCandidate(impress(state, mage.id, context), mage.id, context);
  const partyMember = recruited.player.villageLife.party.find((member) => member.id === RUNEA_COMPANION_ID);
  assert.equal(partyMember.uniqueCharacterId, RUNEA_VESPER_ID);
  assert.equal(partyMember.passiveId, "astral_calibration");
  assert.equal(partyMember.transparent, true);
  assert.throws(() => inviteTavernCandidate(recruited, mage.id, context), /すでにパーティー/);

  const rosterEntry = getDungeonTacticalRoster(recruited).find((entry) => entry.id === RUNEA_COMPANION_ID);
  assert.equal(rosterEntry.portraitImage, UNIQUE_CHARACTERS[RUNEA_VESPER_ID].portraitImage);
  assert.equal(rosterEntry.stats.intelligence, 94);
  assert.match(rosterEntry.rank, /固有人物/);
});

test("星環定礎は共有ダンジョン戦APIの術師班を実際に強化する", () => {
  const { state, context, sites } = fixture("unique-mage-tactical-test");
  let ordinary = advanceDungeonRun(startDungeonRun(state, sites.dungeon, context.region));
  ordinary = advanceDungeonRun(ordinary);
  const ordinarySupport = createDungeonTacticalBattle(ordinary).units.find((unit) => unit.id.endsWith(":support"));
  assert.equal(ordinarySupport.name, "探索隊支援班");
  assert.equal(ordinarySupport.soldierCount, 38);
  assert.equal(ordinarySupport.activeSkill, "fire");

  const mage = getTavernCandidates(state, context).find((candidate) => candidate.uniqueCharacterId === RUNEA_VESPER_ID);
  let assisted = inviteTavernCandidate(impress(state, mage.id, context), mage.id, context);
  assisted = advanceDungeonRun(startDungeonRun(assisted, sites.dungeon, context.region));
  assisted = advanceDungeonRun(assisted);
  const support = createDungeonTacticalBattle(assisted).units.find((unit) => unit.id.endsWith(":support"));
  const calibration = support.statusEffects.find((effect) => effect.id === "astral_calibration");
  assert.equal(support.name, "ルネア・ヴェスパーの星環術班");
  assert.equal(support.soldierCount, 44);
  assert.equal(support.activeSkill, "lightning");
  assert.ok(support.tags.includes("ASTRAL_CALIBRATION"));
  assert.equal(calibration.modifiers.magicPower, 1.22);
  assert.equal(calibration.sourceCharacterId, RUNEA_VESPER_ID);
});
