import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSampleBattle, getBattleUnit } from "../src/tactical-battle.js";
import { buildTacticalEffects } from "../src/tactical-effects.js";

test("battle snapshot differences produce movement, attack, casualty, and rout effects", () => {
  const before = createSampleBattle();
  const after = structuredClone(before);
  after.turn = 1;
  const archer = getBattleUnit(after, "p-archer");
  const target = getBattleUnit(after, "e-infantry-1");
  archer.position = { x: 5, y: 6 };
  target.soldierCount -= 19;
  target.state = "ROUTED";
  after.log.push({
    turn: 1,
    phase: "ranged",
    message: `${archer.name}の射撃 → ${target.name}：19名損耗、士気0。`,
  });

  const effects = buildTacticalEffects(before, after);
  assert.equal(effects.turn, 1);
  assert.deepEqual(effects.movements.find((effect) => effect.actorId === archer.id)?.to, { x: 5, y: 6 });
  assert.deepEqual(effects.impacts.find((effect) => effect.targetId === target.id), {
    targetId: target.id,
    sourceId: archer.id,
    kind: "ranged",
    phase: "ranged",
    casualties: 19,
    severity: 19 / 150,
    from: { x: 5, y: 6 },
    to: target.position,
  });
  assert.deepEqual(effects.statuses.find((effect) => effect.actorId === target.id), {
    actorId: target.id,
    position: target.position,
    label: "潰走",
    tone: "warning",
  });
});

test("damage without an actor still creates a local elemental impact", () => {
  const before = createSampleBattle();
  const after = structuredClone(before);
  after.turn = 1;
  const target = getBattleUnit(after, "p-infantry-1");
  target.soldierCount -= 4;
  after.log.push({ turn: 1, phase: "fatigue_status", message: `延焼 → ${target.name}：4名損耗、士気62。` });

  const impact = buildTacticalEffects(before, after).impacts.find((effect) => effect.targetId === target.id);
  assert.equal(impact.kind, "fire");
  assert.equal(impact.sourceId, null);
  assert.deepEqual(impact.from, target.position);
  assert.deepEqual(impact.to, target.position);
});

test("the tactical UI styles each effect family and honors reduced motion", () => {
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(appSource, /buildTacticalEffects\(previousBattle, nextBattle\)/);
  assert.match(appSource, /playTacticalBattleEffects\(effects, nextBattle/);
  for (const selector of ["tactical-vfx-move", "tactical-vfx-attack", "tactical-vfx-impact", "tactical-vfx-status"]) {
    assert.match(styleSource, new RegExp(`\\.${selector}`));
  }
  assert.match(styleSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.tactical-vfx-impact/);
});
