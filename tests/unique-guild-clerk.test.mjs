import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolveCharacterScene } from "../src/character-template.js";
import { WORLD, createCareerInitialState } from "../src/simulation.js";
import { COLETTE_LINDE_ID, MARIELLE_CROIX_ID, UNIQUE_CHARACTERS } from "../src/unique-characters.js";
import { GUILD_PROCESSED_GOODS, getVillageActionAvailability, performVillageAction } from "../src/village-life.js";

test("コレットは汎用人物や同行者と分離したギルド常駐の固有補給事務員である", () => {
  const clerk = UNIQUE_CHARACTERS[COLETTE_LINDE_ID];
  assert.equal(clerk.name, "コレット・リンデ");
  assert.equal(clerk.metadata.characterKind, "unique");
  assert.equal(clerk.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(clerk.gameplay.role, "冒険者ギルド補給事務員");
  assert.equal(clerk.gameplay.recruitable, false);
  assert.equal(clerk.gameplay.commander, false);
  assert.equal(clerk.adventure, undefined);
  assert.equal(clerk.guildService.facilityId, "guild");
  assert.deepEqual(clerk.guildService.duties, ["ポーション販売", "ロット・使用期限照合", "加工品在庫管理"]);
  assert.equal(clerk.guildService.resident, true);
  assert.equal(WORLD.characters[COLETTE_LINDE_ID], clerk);
  assert.equal(Object.hasOwn(createCareerInitialState({ seed: "guild-clerk-officer-boundary" }).officers, COLETTE_LINDE_ID), false);
  assert.equal(resolveCharacterScene(clerk, "guild.shop.purchase").id, "colette-guild-shop-purchase");

  const assetUrl = new URL(`../${clerk.portraitImage}`, import.meta.url);
  assert.ok(existsSync(assetUrl));
  const png = readFileSync(assetUrl);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png[25], 6, "立ち絵はRGBA PNGである必要があります");
});

test("コレットの顔設計はマリエルと作風を共有しながら顔軸を分ける", () => {
  const clerk = UNIQUE_CHARACTERS[COLETTE_LINDE_ID];
  const receptionist = UNIQUE_CHARACTERS[MARIELLE_CROIX_ID];
  assert.notEqual(clerk.visuals.faceShape, receptionist.visuals.faceShape);
  assert.notEqual(clerk.visuals.facialFeatures, receptionist.visuals.facialFeatures);
  assert.notEqual(clerk.visuals.skinTone, receptionist.visuals.skinTone);
  assert.notEqual(clerk.visuals.signatureExpression, receptionist.visuals.signatureExpression);
  assert.match(clerk.visuals.faceShape, /丸顔/);
  assert.match(clerk.visuals.facialFeatures, /垂れ気味アーモンド眼/);
  assert.match(clerk.visuals.signatureExpression, /検品/);
});

test("町のギルドでは三種の二次加工品を購入でき、村では販売されない", () => {
  const town = { id: "colette-test-town", name: "香草町", settlementLevel: "town" };
  const village = { id: "colette-test-village", name: "薬草村", settlementLevel: "village" };
  let state = createCareerInitialState({ seed: "guild-clerk-shop" });
  state.player.metrics.wealth = 20;

  assert.deepEqual(GUILD_PROCESSED_GOODS.map((good) => good.name), ["治癒ポーション", "解毒ポーション", "魔力補給薬"]);
  for (const good of GUILD_PROCESSED_GOODS) {
    assert.equal(getVillageActionAvailability(state, good.actionId, village).allowed, false);
    const access = getVillageActionAvailability(state, good.actionId, town);
    assert.equal(access.allowed, true);
    const beforeWealth = state.player.metrics.wealth;
    state = performVillageAction(state, town, good.actionId);
    assert.equal(state.player.metrics.wealth, beforeWealth - access.cost);
    assert.equal(state.player.villageLife.inventory.find((item) => item.id === good.itemId)?.quantity, 1);
    assert.match(state.player.villageLife.lastAction.message, /コレット/);
    assert.match(state.player.villageLife.lastAction.message, /封蝋印・ロット番号・使用期限/);
  }
});

test("ギルド画面はコレット専用の加工品販売台と会話キャストを使う", () => {
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../CHARACTER_ART_GENERATION_RULES.md", import.meta.url), "utf8");
  assert.match(appSource, /guild-processed-goods-desk/);
  assert.match(appSource, /UNIQUE_CHARACTERS\[COLETTE_LINDE_ID\]/);
  assert.match(appSource, /guild_shop/);
  assert.match(appSource, /PROCESSED GOODS/);
  assert.match(appSource, /data-village-action=/);
  assert.match(rules, /現行コレットの設計票/);
  assert.match(rules, /顔型、目の形・間隔、眉、鼻、通常表情を変える/);
});
