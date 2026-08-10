import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_IMPLEMENTATION_RACE_IDS,
  RACE_CATEGORIES,
  RACE_LIST,
  getRaceDefinition,
  getRaceTraitReference,
  requireRaceDefinition,
} from "../src/race-list.js";
import { RACES } from "../src/tactical-data.js";
import { PEOPLES } from "../src/world-catalog.js";

const REQUIRED_RACE_FIELDS = [
  "id", "name", "categoryId", "category", "summary", "traits", "habitat", "lifespan",
  "fertility", "foodType", "bodySize", "militaryTraits", "favoredUnitRoles",
  "terrainModifiers", "unitTags", "combatModifiers", "politicalUnit", "censusDifficulty",
  "assimilationDifficulty", "autonomyDemand", "legalNeeds", "centralizationObstacle",
  "integrationPolicies",
];

test("15大分類と添付案・既存実装を統合した60実種族を正本へ保存する", () => {
  assert.equal(Object.keys(RACE_CATEGORIES).length, 15);
  assert.equal(RACE_LIST.length, 60);
  assert.equal(new Set(RACE_LIST.map((race) => race.id)).size, RACE_LIST.length);

  const expectedNames = [
    "人間", "エルフ", "ダークエルフ", "妖精", "アルラウネ", "サキュバス", "ヴァンパイア",
    "ゴブリン", "サイクロプス", "コボルト", "ミノタウロス", "リザードマン", "オーク",
    "スライム", "ミミックジェル", "アラクネ", "マンティス", "ビーフォーク", "スカラベ族",
    "夜兎族", "狼牙族", "猫人族", "狐人族", "熊人族", "山羊人族",
    "ドラゴン", "ドラゴニュート", "ワイバーン", "竜血人", "天使", "堕天使", "天使兵",
    "マーメイド", "スキュラ", "セイレーン", "クラーケンニュート", "オーガ", "トロール", "鬼人",
    "ジャイアント", "巨人裔", "スケルトン", "グール", "リッチ", "レヴナント",
    "ゴーレム", "ガーゴイル", "オートマタ", "火精", "水精", "風精", "土精", "マイコニド", "胞子人",
  ];
  expectedNames.forEach((name) => assert.ok(getRaceDefinition(name), `${name}が種族リストにない`));
});

test("全実種族が生態・軍事・統治・中央集権化の完全な特性を返す", () => {
  RACE_LIST.forEach((race) => {
    REQUIRED_RACE_FIELDS.forEach((field) => assert.ok(Object.hasOwn(race, field), `${race.id}.${field}`));
    assert.ok(race.summary.length > 0, race.id);
    assert.ok(race.traits.length >= 3, `${race.id}.traits`);
    assert.ok(race.habitat.length > 0, `${race.id}.habitat`);
    assert.ok(race.foodType.length > 0, `${race.id}.foodType`);
    assert.ok(race.militaryTraits.length > 0, `${race.id}.militaryTraits`);
    assert.ok(race.favoredUnitRoles.length > 0, `${race.id}.favoredUnitRoles`);
    assert.ok(race.legalNeeds.length > 0, `${race.id}.legalNeeds`);
    assert.ok(race.centralizationObstacle.length > 0, `${race.id}.centralizationObstacle`);
    assert.ok(race.integrationPolicies.length > 0, `${race.id}.integrationPolicies`);
    [race.censusDifficulty, race.assimilationDifficulty, race.autonomyDemand].forEach((value) => {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 100, `${race.id}の統治難度`);
    });
    assert.ok(race.lifespan === null || (Number.isFinite(race.lifespan) && race.lifespan > 0), `${race.id}.lifespan`);
    assert.ok(Number.isFinite(race.fertility) && race.fertility >= 0, `${race.id}.fertility`);
  });
});

test("第一段階14種を実種族IDとして固定する", () => {
  assert.equal(INITIAL_IMPLEMENTATION_RACE_IDS.length, 14);
  INITIAL_IMPLEMENTATION_RACE_IDS.forEach((raceId) => assert.equal(requireRaceDefinition(raceId).id, raceId));
});

test("旧表記アクラネはアラクネへ正規化し、集合名は大分類特性を参照する", () => {
  assert.equal(getRaceDefinition("acrane").id, "arachne");
  assert.equal(getRaceDefinition("アクラネ").name, "アラクネ");
  assert.equal(getRaceTraitReference({ categoryId: "undead" }).profile.name, "不死族");
  assert.throws(() => requireRaceDefinition("undead"), /種族リストに存在しない/);
});

test("世界カタログの全参照が実種族または大分類の特性まで接続される", () => {
  Object.values(PEOPLES).forEach((people) => {
    assert.ok(["race", "category"].includes(people.traitReference.kind), people.id);
    assert.ok(people.traitReference.id, people.id);
    assert.ok(people.traits, people.id);
    assert.ok(people.traits.militaryTraits.length > 0, people.id);
    assert.ok(people.traits.centralizationObstacle.length > 0, people.id);
  });
  assert.deepEqual(PEOPLES.acrane.traitReference, { kind: "race", id: "arachne" });
  assert.deepEqual(PEOPLES.undead.traitReference, { kind: "category", id: "undead" });
  assert.deepEqual(PEOPLES.beastfolk.traitReference, { kind: "category", id: "beastfolk" });
});

test("戦闘補正は完全な種族特性レコードから派生する", () => {
  Object.values(RACES).forEach((race) => {
    assert.equal(race, RACES[race.id]);
    assert.ok(race.traits.length > 0, race.id);
    assert.ok(race.militaryTraits.length > 0, race.id);
    assert.ok(race.centralizationObstacle.length > 0, race.id);
    assert.equal(race.modifiers, race.combatModifiers);
    assert.equal(race.terrainAffinity, race.terrainModifiers);
    assert.equal(race.tags, race.unitTags);
  });
  assert.equal(RACES.human.name, "人間");
  assert.equal(RACES.elf.modifiers.rangedAccuracy, 1.2);
  assert.equal(RACES.giant.modifiers.hp, 3);
});
