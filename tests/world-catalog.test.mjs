import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  DIPLOMATIC_DELEGATES,
  EXTREME_CREATURES,
  NOTION_OTHER_RACE_IDS,
  PEOPLES,
  PEOPLE_REPRESENTATIVES,
  SETTING_NATIONS,
  getDiplomaticDelegate,
  getExtremeCreature,
  getNationRelations,
  getNationsForPeople,
  getWorldCatalogSummary,
} from "../src/world-catalog.js";

test("全17種族に固有の女性代表グラフィックと多様な年齢・表情を持たせる", () => {
  const peopleIds = Object.keys(PEOPLES);
  const representatives = peopleIds.map((id) => PEOPLE_REPRESENTATIVES[id]);
  assert.ok(representatives.every(Boolean));
  assert.equal(new Set(representatives.map((item) => item.image)).size, peopleIds.length);
  assert.ok(representatives.every((item) => item.image.endsWith(".webp")));
  assert.ok(representatives.every((item) => existsSync(new URL(`../${item.image.slice(2)}`, import.meta.url))));
  assert.ok(new Set(representatives.map((item) => item.apparentAge)).size >= 6);
  assert.ok(new Set(representatives.map((item) => item.expression)).size >= 12);
});

test("外交対象国は確度を明記した種族代表へ接続する", () => {
  assert.deepEqual(Object.keys(DIPLOMATIC_DELEGATES).sort(), ["avanheln", "deadland", "forest_alliance", "heavens_gate", "izmenia", "lustrond", "valka", "vinia"]);
  assert.equal(getDiplomaticDelegate("vinia").people.id, "elf");
  assert.equal(getDiplomaticDelegate("forest_alliance").certainty, "関連種族");
  assert.equal(getDiplomaticDelegate("valka").certainty, "公国全権");
  assert.equal(getDiplomaticDelegate("valka").name, "リュドミラ・ヴァルケン");
  assert.equal(getDiplomaticDelegate("valka").office, "灰冠峠会談全権使");
  assert.equal(getDiplomaticDelegate("deadland").people.id, "undead");
  assert.equal(getDiplomaticDelegate("avanheln").people.id, "dragon");
  assert.equal(getDiplomaticDelegate("unknown"), null);
});

test("Notionの異種族15種を表記どおり収録する", () => {
  assert.deepEqual(
    NOTION_OTHER_RACE_IDS.map((id) => PEOPLES[id].name),
    ["アクラネ", "エルフ", "ゴブリン", "オーク", "アンデッド", "巨人", "妖精", "ラミア", "ホムルンクルス", "機械生命体", "獣人", "幻獣", "天使", "悪魔", "オーガ"],
  );
});

test("Notionの国家10か国と明示された種族対応を保持する", () => {
  assert.equal(Object.keys(SETTING_NATIONS).length, 10);
  assert.equal(getNationsForPeople("elf").find((nation) => nation.id === "vinia")?.association, "confirmed");
  assert.equal(getNationsForPeople("undead").find((nation) => nation.id === "deadland")?.association, "confirmed");
  assert.equal(getNationsForPeople("angel").find((nation) => nation.id === "heavens_gate")?.association, "related");
  assert.deepEqual(SETTING_NATIONS.great_empire.confirmedPeopleIds, []);
  assert.equal(getNationsForPeople("phantom_beast").length, 0);
});

test("神国の保護領関係を双方向に参照できる", () => {
  assert.deepEqual(getNationRelations("heavens_gate").protectorates.map((nation) => nation.id), ["lustrond", "great_empire"]);
  assert.equal(getNationRelations("lustrond").suzerain.id, "heavens_gate");
});

test("不明な設定を推測値で埋めない", () => {
  assert.equal(SETTING_NATIONS.tzurisbern.knowledge, "unknown");
  assert.equal(SETTING_NATIONS.lancilvar.knowledge, "unknown");
  assert.deepEqual(SETTING_NATIONS.tzurisbern.confirmedPeopleIds, []);
  assert.deepEqual(SETTING_NATIONS.lancilvar.relatedPeopleIds, []);
  assert.deepEqual(getWorldCatalogSummary(), {
    otherRaces: 15,
    auxiliaryPeoples: 2,
    nations: 10,
    unknownNations: 2,
    protectorates: 2,
    extremeCreatures: 1,
  });
});

test("リヴァイアサンを種族と分離した超規格外生物として記録する", () => {
  const leviathan = getExtremeCreature("leviathan");
  assert.equal(Object.keys(EXTREME_CREATURES).length, 1);
  assert.equal(leviathan.name, "リヴァイアサン");
  assert.equal(leviathan.classification, "超規格外生物");
  assert.match(leviathan.estimatedLength, /1,600〜2,400 m/);
  assert.equal(leviathan.signs.length, 3);
  assert.equal(leviathan.strategicEffects.length, 3);
  assert.match(leviathan.doctrine, /交戦・捕獲・誘導を禁ずる/);
  assert.equal(PEOPLES.leviathan, undefined);
  assert.equal(getExtremeCreature("unknown"), null);
});
