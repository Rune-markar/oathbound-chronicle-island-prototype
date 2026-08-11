import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createBattlePreparation, finalizeBattlePreparation } from "../src/battle-preparation.js";
import { resolveCharacterScene } from "../src/character-template.js";
import { WORLD, createCareerInitialState } from "../src/simulation.js";
import {
  BERTHA_BATTLE_COMMANDER_ID,
  createSeniorGeneralBattle,
  createSeniorGeneralBattleRoster,
} from "../src/tactical-battle.js";
import {
  AURELIA_ZAFIR_ID,
  BERTHA_ARNFELD_ID,
  UNIQUE_CHARACTERS,
} from "../src/unique-characters.js";

test("ベルタは汎用将校と分離したセレナ王国の固有上級将官である", () => {
  const bertha = UNIQUE_CHARACTERS[BERTHA_ARNFELD_ID];
  assert.equal(bertha.name, "ベルタ・アルンフェルト");
  assert.equal(bertha.metadata.characterKind, "unique");
  assert.equal(bertha.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(bertha.countryId, "selene");
  assert.equal(bertha.biography.nationality, "セレナ王国");
  assert.match(bertha.gameplay.role, /上級将官.*北方軍集団司令/);
  assert.equal(bertha.gameplay.commander, true);
  assert.equal(bertha.gameplay.recruitable, false);
  assert.equal(bertha.military.deployable, true);
  assert.equal(bertha.military.tacticalBattleId, "dev-senior-general-battle");
  assert.equal(WORLD.characters[BERTHA_ARNFELD_ID], bertha);
  assert.equal(Object.hasOwn(createCareerInitialState({ seed: "senior-general-officer-boundary" }).officers, BERTHA_ARNFELD_ID), false);
  assert.equal(resolveCharacterScene(bertha, "battle.command.issue").id, "bertha-battle-command-issue");
});

test("ベルタはアウレリアと作風を共有しながら顔・肌・表情・体格を分ける", () => {
  const bertha = UNIQUE_CHARACTERS[BERTHA_ARNFELD_ID];
  const aurelia = UNIQUE_CHARACTERS[AURELIA_ZAFIR_ID];
  assert.notEqual(bertha.visuals.faceShape, aurelia.visuals.faceShape);
  assert.notEqual(bertha.visuals.facialFeatures, aurelia.visuals.facialFeatures);
  assert.notEqual(bertha.visuals.skinTone, aurelia.visuals.skinTone);
  assert.notEqual(bertha.visuals.signatureExpression, aurelia.visuals.signatureExpression);
  assert.notEqual(bertha.visuals.build, aurelia.visuals.build);
  assert.match(bertha.visuals.faceShape, /五角形/);
  assert.match(bertha.visuals.facialFeatures, /下がり目/);
  assert.match(bertha.visuals.skinTone, /そばかす/);
  assert.match(bertha.visuals.signatureExpression, /口を少し開いて.*命令/);

  const assetUrl = new URL(`../${bertha.portraitImage}`, import.meta.url);
  assert.ok(existsSync(assetUrl));
  const png = readFileSync(assetUrl);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png[25], 6, "上級将官立ち絵は透明アルファを持つRGBA PNGである必要があります");
});

test("北方軍迎撃戦ではベルタが上級将官として五部隊を直接指揮する", () => {
  const battle = createSeniorGeneralBattle();
  const bertha = UNIQUE_CHARACTERS[BERTHA_ARNFELD_ID];
  const commander = battle.commanders.find((entry) => entry.id === BERTHA_BATTLE_COMMANDER_ID);
  const playerUnits = battle.units.filter((unit) => unit.side === "player");
  assert.equal(battle.id, "dev-senior-general-battle");
  assert.match(battle.name, /北方軍迎撃戦/);
  assert.equal(commander.name, bertha.name);
  assert.equal(commander.iconUrl, bertha.portraitImage);
  assert.equal(commander.side, "player");
  assert.equal(commander.leadership, bertha.stats.leadership);
  assert.equal(playerUnits.length, 5);
  assert.ok(playerUnits.every((unit) => unit.commanderId === BERTHA_BATTLE_COMMANDER_ID));
  assert.ok(playerUnits.some((unit) => unit.unitClassId === "heavy_infantry"));
  assert.ok(playerUnits.some((unit) => unit.unitClassId === "cavalry" && unit.order === "hold"));
  assert.equal(battle.formations.player, "guarded");
  assert.match(battle.log[0].message, /自ら北方軍集団を率いて出陣/);
});

test("専用戦闘前編成はベルタを唯一の参陣者とし、敵将を壊さず防御陣を引き継ぐ", () => {
  const roster = createSeniorGeneralBattleRoster();
  const preparation = createBattlePreparation({
    battle: createSeniorGeneralBattle(),
    roster,
    defaultParticipantIds: [BERTHA_ARNFELD_ID],
  });
  assert.deepEqual(preparation.selectedCharacterIds, [BERTHA_ARNFELD_ID]);
  assert.equal(preparation.formationId, "guarded");
  const finalized = finalizeBattlePreparation(preparation);
  assert.ok(finalized.commanders.some((commander) => commander.id === BERTHA_BATTLE_COMMANDER_ID));
  assert.ok(finalized.commanders.some((commander) => commander.id === "cmd-valka"));
  assert.ok(finalized.units.filter((unit) => unit.side === "player")
    .every((unit) => unit.commanderId === BERTHA_BATTLE_COMMANDER_ID));
});

test("開発メニューと生成ルールから上級将官戦とベルタの顔設計へ到達できる", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../CHARACTER_ART_GENERATION_RULES.md", import.meta.url), "utf8");
  assert.match(index, /data-developer-action="senior-general-battle"/);
  assert.match(index, /上級将官戦/);
  assert.match(app, /createSeniorGeneralBattle\(\)/);
  assert.match(app, /createSeniorGeneralBattleRoster\(\)/);
  assert.match(app, /type: "senior-general"/);
  assert.match(rules, /現行ベルタの設計票/);
  assert.match(rules, /金髪ボブ.*使わず/);
});
