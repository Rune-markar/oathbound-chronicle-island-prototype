import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { ENEMY_COMMANDERS, createInitialState, getEnemyCommander } from "../src/simulation.js";

test("主敵ヴァルカに固有の女性司令官グラフィックを接続する", () => {
  const commander = getEnemyCommander(createInitialState(), "valka");
  assert.equal(Object.keys(ENEMY_COMMANDERS).length, 1);
  assert.equal(commander.name, "アデルハイト・クレーエ");
  assert.equal(commander.role, "灰冠峠総司令");
  assert.equal(commander.country.name, "ヴァルカ公国");
  assert.ok(commander.portraitImage.endsWith(".webp"));
  assert.ok(existsSync(new URL(`../${commander.portraitImage}`, import.meta.url)));
});
