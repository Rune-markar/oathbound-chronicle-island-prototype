import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { V3_SCENES, getV3Scene, getV3FieldPoints, getV3KnownRoute, getV3AdventureFeedback } from "../src/v3-adventure-presentation.js";

function field(overrides = {}) {
  return { tiles: Array.from({ length: 35 }, (_, i) => {
    const dx = i % 7 - 3, dy = Math.floor(i / 7) - 2;
    return { x: (dx + 64) % 64, y: 20 + dy, dx, dy, player: dx === 0 && dy === 0,
      visible: true, generated: true, passable: true, type: "grass", name: "草原", ...overrides[`${dx},${dy}`] };
  }) };
}

test("周辺案内は未踏・未生成の人物と宝を知らせず、同じ集落を重複掲載しない", () => {
  const view = field({ "1,0": { entity: { type: "item", name: "銀貨", gold: 2 } },
    "2,0": { visible: false, entity: { type: "enemy", name: "未踏の敵" } },
    "3,0": { generated: false, entity: { type: "npc", name: "未生成の人物" } },
    "0,1": { type: "settlement-village", name: "村", settlement: { id: "village" } },
    "1,1": { type: "settlement-village", name: "村", settlement: { id: "village" } },
  });
  const before = structuredClone(view);
  const points = getV3FieldPoints(view, {});
  assert.deepEqual(points.map((entry) => entry.name).sort(), ["村", "銀貨"]);
  assert.equal(points.find((entry) => entry.name === "銀貨").reward, "銀貨 +2");
  assert.deepEqual(view, before);
});

test("案内は東西の折り返しでも隣接する一歩だけを返す", () => {
  assert.deepEqual(getV3KnownRoute(field(), "62,20"), { direction: "west", steps: 2 });
  assert.equal(getV3KnownRoute(field(), "0,20"), null);
});

test("見える障害物を回り、知らない道や世界外を近道に使わない", () => {
  assert.deepEqual(getV3KnownRoute(field({ "1,0": { passable: false } }), "2,20"), { direction: "north", steps: 4 });
  const wall = Object.fromEntries([-2, -1, 0, 1, 2].map((dy) => [`1,${dy}`, { visible: false }]));
  assert.equal(getV3KnownRoute(field(wall), "2,20"), null);
  assert.equal(getV3KnownRoute(field({ "2,0": { generated: false } }), "2,20"), null);
});

test("採集の案内は途中の敵・会話相手・危機を迂回し、選んだ相手への接近だけ許す", () => {
  for (const type of ["enemy", "npc", "crisis"]) {
    const view = field({ "1,0": { entity: { type } } });
    assert.deepEqual(getV3KnownRoute(view, "2,20"), { direction: "north", steps: 4 });
    assert.deepEqual(getV3KnownRoute(view, "1,20"), { direction: "east", steps: 1 });
  }
});

test("目的地の見回り印は発見済みの未完了地点だけに出る", () => {
  const state = { campaign: { survey: { x: 2, y: 20, name: "見回り地点", complete: false } } };
  assert.equal(getV3FieldPoints(field(), state)[0].kind, "quest");
  assert.equal(getV3FieldPoints(field({ "2,0": { visible: false } }), state).length, 0);
  state.campaign.survey.complete = true;
  assert.equal(getV3FieldPoints(field(), state).length, 0);
});

test("成果演出は実増減だけを表示し、再描画や単なる移動で報酬を捏造しない", () => {
  const before = { hp: 34, xp: 0, gold: 12, level: 1, items: 0, defeated: 0, talked: 0, stage: "wanderer", steps: 0, discovered: 81 };
  assert.equal(getV3AdventureFeedback(null, before), null);
  assert.equal(getV3AdventureFeedback(before, { ...before }), null);
  assert.equal(getV3AdventureFeedback(before, { ...before, steps: 1, discovered: 88 }), null);
  const found = getV3AdventureFeedback(before, { ...before, items: 1, gold: 14 });
  assert.deepEqual(found.changes, [{ key: "gold", delta: 2 }]);
  const injury = getV3AdventureFeedback(before, { ...before, hp: 28, gold: 7 });
  assert.equal(injury.kind, "damage");
  assert.deepEqual(injury.changes, [{ key: "gold", delta: -5 }, { key: "hp", delta: -6 }]);
  const victory = getV3AdventureFeedback(before, { ...before, defeated: 1, xp: 21, level: 2, gold: 16 });
  assert.equal(victory.kind, "level");
  assert.deepEqual(victory.changes, [{ key: "gold", delta: 4 }, { key: "xp", delta: 21 }]);
});

test("風景は実地形に対応し、参照する全画像を同梱する", async () => {
  assert.equal(getV3Scene({ type: "forest" }), "forest");
  assert.equal(getV3Scene({ type: "settlement-city" }), "village");
  assert.equal(getV3Scene({ type: "mine" }), "cave");
  assert.equal(getV3Scene({ type: "spring" }), "water");
  await Promise.all(Object.values(V3_SCENES).map((path) => access(new URL(`../${path}`, import.meta.url))));
});

test("命中表示は同じ敵の実HP差から作り、退避や再描画で被害を加算しない", () => {
  const before = { hp: 34, xp: 0, gold: 12, level: 1, items: 0, defeated: 0, talked: 0, stage: "wanderer", enemy: true, enemyKey: "1,20", enemyHp: 10 };
  assert.equal(getV3AdventureFeedback(before, { ...before, hp: 31, enemyHp: 4 }).enemyDamage, 6);
  assert.equal(getV3AdventureFeedback(before, { ...before, hp: 31, enemy: false }).enemyDamage, 0);
  assert.equal(getV3AdventureFeedback(before, { ...before, enemy: false, defeated: 1, xp: 4 }).enemyDamage, 10);
});
