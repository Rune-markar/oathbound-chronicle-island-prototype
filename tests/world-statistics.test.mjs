import test from "node:test";
import assert from "node:assert/strict";
import { PEOPLES, SETTING_NATIONS } from "../src/world-catalog.js";
import {
  RESOURCE_CATEGORIES,
  WORLD_STATISTICS,
  getResourcePower,
  getResourceRanking,
  getWorldStatisticsSummary,
} from "../src/world-statistics.js";

test("全10国家に統計レコードを用意し、未詳国を推測で補完しない", () => {
  assert.deepEqual(Object.keys(WORLD_STATISTICS).sort(), Object.keys(SETTING_NATIONS).sort());
  for (const id of ["tzurisbern", "lancilvar"]) {
    assert.equal(WORLD_STATISTICS[id].status, "unavailable");
    assert.equal(WORLD_STATISTICS[id].population, null);
    assert.equal(WORLD_STATISTICS[id].resources, null);
  }
});

test("種族・言語・宗教の既知構成比はそれぞれ100になる", () => {
  for (const profile of Object.values(WORLD_STATISTICS)) {
    for (const field of ["races", "languages", "religions"]) {
      if (!profile[field]) continue;
      assert.equal(profile[field].reduce((sum, item) => sum + item.share, 0), 100, `${profile.nationId}.${field}`);
    }
    for (const race of profile.races ?? []) {
      if (race.peopleId) assert.ok(PEOPLES[race.peopleId], `${profile.nationId}.${race.peopleId}`);
    }
  }
});

test("資源力は5分野の平均から算出し、未調査国を順位の末尾へ置く", () => {
  for (const profile of Object.values(WORLD_STATISTICS)) {
    if (!profile.resources) continue;
    assert.deepEqual(Object.keys(profile.resources), RESOURCE_CATEGORIES.map(({ id }) => id));
    assert.ok(Object.values(profile.resources).every((score) => score >= 0 && score <= 100));
  }
  assert.equal(getResourcePower("izmenia"), 70);
  assert.equal(getResourcePower("tzurisbern"), null);
  assert.deepEqual(getResourceRanking().slice(-2).map(({ nationId }) => nationId), ["tzurisbern", "lancilvar"]);
});

test("大陸統計サマリーは調査済み人口と資源首位を集約する", () => {
  assert.deepEqual(getWorldStatisticsSummary(), {
    surveyedNations: 8,
    unavailableNations: 2,
    populationTotal: 19540000,
    resourceLeaderId: "izmenia",
  });
});
