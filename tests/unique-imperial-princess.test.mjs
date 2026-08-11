import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createBattlePreparation, finalizeBattlePreparation } from "../src/battle-preparation.js";
import { createInitialState, getEnemyCommander, WORLD } from "../src/simulation.js";
import {
  AURELIA_BATTLE_COMMANDER_ID,
  createImperialPrincessBattle,
} from "../src/tactical-battle.js";
import {
  AURELIA_ZAFIR_ID,
  MARIELLE_CROIX_ID,
  UNIQUE_CHARACTERS,
} from "../src/unique-characters.js";

test("アウレリアはグレート帝国の皇女将官として固有人物と敵将の双方へ登録される", () => {
  const aurelia = UNIQUE_CHARACTERS[AURELIA_ZAFIR_ID];
  const state = createInitialState();
  assert.equal(aurelia.name, "アウレリア・ザフィール");
  assert.equal(aurelia.metadata.characterKind, "unique");
  assert.equal(aurelia.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(aurelia.countryId, "great_empire");
  assert.equal(aurelia.biography.nationality, "グレート帝国");
  assert.match(aurelia.gameplay.role, /皇女.*総司令/);
  assert.equal(aurelia.gameplay.commander, true);
  assert.equal(aurelia.gameplay.recruitable, false);
  assert.equal(aurelia.military.deployable, true);
  assert.equal(aurelia.military.tacticalBattleId, "dev-imperial-princess-battle");
  assert.equal(WORLD.characters[AURELIA_ZAFIR_ID], aurelia);
  assert.equal(state.officers[AURELIA_ZAFIR_ID].allegiance, "foreign");
  assert.match(state.officers[AURELIA_ZAFIR_ID].rank, /皇女.*上将/);

  const enemyCommander = getEnemyCommander(state, "great_empire");
  assert.equal(enemyCommander.id, AURELIA_ZAFIR_ID);
  assert.equal(enemyCommander.gameplay.commander, true);
  assert.equal(enemyCommander.country.id, "great_empire");
});

test("アウレリアの顔設計は作品のアニメ調を保ちながら既存受付員と顔軸を分ける", () => {
  const aurelia = UNIQUE_CHARACTERS[AURELIA_ZAFIR_ID];
  const marielle = UNIQUE_CHARACTERS[MARIELLE_CROIX_ID];
  assert.notEqual(aurelia.visuals.faceShape, marielle.visuals.faceShape);
  assert.notEqual(aurelia.visuals.facialFeatures, marielle.visuals.facialFeatures);
  assert.notEqual(aurelia.visuals.skinTone, marielle.visuals.skinTone);
  assert.notEqual(aurelia.visuals.signatureExpression, marielle.visuals.signatureExpression);
  assert.match(aurelia.visuals.faceShape, /縦長.*逆三角/);
  assert.match(aurelia.visuals.facialFeatures, /離れ気味.*吊り目/);
  assert.match(aurelia.visuals.facialFeatures, /角眉/);
  assert.match(aurelia.visuals.signatureExpression, /観察表情/);

  const assetUrl = new URL(`../${aurelia.portraitImage}`, import.meta.url);
  assert.ok(existsSync(assetUrl));
  const png = readFileSync(assetUrl);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png[25], 6, "皇女立ち絵は透明アルファを持つRGBA PNGである必要があります");
});

test("皇女親征戦ではアウレリアが実体のある敵指揮官として全帝国部隊を率いる", () => {
  const battle = createImperialPrincessBattle();
  const aurelia = UNIQUE_CHARACTERS[AURELIA_ZAFIR_ID];
  const commander = battle.commanders.find((entry) => entry.id === AURELIA_BATTLE_COMMANDER_ID);
  const enemyUnits = battle.units.filter((unit) => unit.side === "enemy");
  assert.equal(battle.id, "dev-imperial-princess-battle");
  assert.match(battle.name, /皇女親征/);
  assert.equal(commander.name, aurelia.name);
  assert.equal(commander.iconUrl, aurelia.portraitImage);
  assert.equal(commander.side, "enemy");
  assert.equal(commander.leadership, aurelia.stats.leadership);
  assert.ok(commander.commandRange >= 11);
  assert.equal(enemyUnits.length, 5);
  assert.ok(enemyUnits.every((unit) => unit.commanderId === AURELIA_BATTLE_COMMANDER_ID));
  assert.ok(enemyUnits.some((unit) => unit.unitClassId === "engineer"));
  assert.ok(enemyUnits.some((unit) => unit.unitClassId === "light_cavalry"));
  assert.match(battle.log[0].message, /自ら軍団を指揮/);
});

test("戦闘前編成で自軍指揮官を差し替えても皇女と帝国軍の指揮系統は保持される", () => {
  const battle = createImperialPrincessBattle();
  const roster = [{
    id: "gaius",
    name: "ガイウス・オルタ",
    portrait: "ガ",
    portraitImage: "assets/generated/officer-gaius.webp",
    role: "北部太守",
    rank: "太守",
    traits: ["drill", "mobilize"],
    stats: { leadership: 76, war: 70, intelligence: 52, charisma: 62 },
    stamina: 88,
    assignment: null,
    available: true,
  }];
  const preparation = createBattlePreparation({ battle, roster, defaultParticipantIds: ["gaius"] });
  const finalized = finalizeBattlePreparation(preparation);
  assert.ok(finalized.commanders.some((commander) => commander.id === "cmd-character-gaius"));
  assert.ok(finalized.commanders.some((commander) => commander.id === AURELIA_BATTLE_COMMANDER_ID));
  assert.ok(finalized.units.filter((unit) => unit.side === "enemy")
    .every((unit) => unit.commanderId === AURELIA_BATTLE_COMMANDER_ID));
});

test("開発メニューと生成ルールから皇女親征戦と顔設計票へ到達できる", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../CHARACTER_ART_GENERATION_RULES.md", import.meta.url), "utf8");
  assert.match(index, /data-developer-action="imperial-princess-battle"/);
  assert.match(index, /皇女将官戦/);
  assert.match(app, /createImperialPrincessBattle\(\)/);
  assert.match(app, /type: "imperial-princess"/);
  assert.match(app, /グレート帝国親征軍/);
  assert.match(rules, /現行アウレリアの設計票/);
  assert.match(rules, /銀色の短いボブ.*使わず/);
});
