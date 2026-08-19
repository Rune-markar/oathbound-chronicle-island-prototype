import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { castMagicSkill, createSampleBattle, executeBattleTurn, getBattleUnit } from "../src/tactical-battle.js";
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

test("structured attacks preserve misses, personal HP damage, and repeated hits", () => {
  const before = createSampleBattle();
  const after = structuredClone(before);
  after.turn = 1;
  const attacker = getBattleUnit(after, "p-archer");
  const target = getBattleUnit(after, "e-infantry-1");
  target.soldierCount -= 7;
  after.combatEvents = [
    { turn: 1, sequence: 0, type: "attack", kind: "ranged", actorId: attacker.id, targetId: target.id, from: attacker.position, to: target.position, hit: false, casualties: 0, damage: 0, severity: 0 },
    { turn: 1, sequence: 1, type: "attack", kind: "ranged", actorId: attacker.id, targetId: target.id, from: attacker.position, to: target.position, hit: true, casualties: 3, damage: 7.4, severity: 0.02 },
    { turn: 1, sequence: 2, type: "attack", kind: "melee", actorId: "p-infantry-1", targetId: target.id, from: getBattleUnit(after, "p-infantry-1").position, to: target.position, hit: true, casualties: 4, damage: 9.1, severity: 0.03 },
    { turn: 1, sequence: 3, type: "attack", kind: "melee", actorId: "p-infantry-1", targetId: "e-infantry-2", from: getBattleUnit(after, "p-infantry-1").position, to: getBattleUnit(after, "e-infantry-2").position, hit: true, casualties: 0, damage: 12, severity: 0 },
  ];

  const effects = buildTacticalEffects(before, after);
  assert.equal(effects.attacks.length, 4);
  assert.equal(effects.attacks[0].hit, false);
  assert.equal(effects.impacts.filter((effect) => effect.targetId === target.id).length, 2, "repeated hits stay separate");
  assert.equal(effects.impacts.find((effect) => effect.targetId === "e-infantry-2").damage, 12, "HP-only damage remains visible");
});

test("fire, ice, heal, and earth casts retain their distinct visual outcomes", () => {
  const makeBattle = () => {
    const battle = createSampleBattle();
    getBattleUnit(battle, "e-infantry-1").position = { x: 7, y: 9 };
    return battle;
  };

  const fireBefore = makeBattle();
  const fire = buildTacticalEffects(fireBefore, castMagicSkill(fireBefore, "p-mage", "fire", { x: 7, y: 9 }));
  assert.equal(fire.spells[0].spellId, "fire");
  assert.equal(fire.spells[0].areaPositions.length, 5);
  assert.ok(fire.impacts.some((effect) => effect.kind === "fire"));

  const iceBefore = makeBattle();
  const ice = buildTacticalEffects(iceBefore, castMagicSkill(iceBefore, "p-mage", "ice", { x: 7, y: 9 }));
  assert.equal(ice.spells[0].spellId, "ice");
  assert.ok(ice.statuses.some((effect) => effect.tone === "ice" && effect.label === "氷縛"));

  const healBefore = makeBattle();
  const ally = getBattleUnit(healBefore, "p-infantry-1");
  ally.position = { x: 5, y: 9 };
  ally.soldierCount -= 20;
  const heal = buildTacticalEffects(healBefore, castMagicSkill(healBefore, "p-mage", "heal", { x: 5, y: 9 }));
  assert.equal(heal.spells[0].spellId, "heal");
  assert.equal(heal.spells[0].areaPositions.length, 5, "beneficial area magic keeps its full field");
  assert.ok(heal.statuses.some((effect) => effect.actorId === ally.id && effect.tone === "heal" && effect.label.startsWith("＋")));

  const earthBefore = makeBattle();
  const earth = buildTacticalEffects(earthBefore, castMagicSkill(earthBefore, "p-mage", "earth", { x: 6, y: 9 }));
  assert.equal(earth.spells[0].spellId, "earth");
  assert.deepEqual(earth.spells[0].areaPositions, [{ x: 6, y: 9 }]);
  assert.equal(earth.impacts.length, 0, "terrain magic is visible without inventing damage");
});

test("turn execution emits fresh structured effects instead of carrying prior events", () => {
  const first = executeBattleTurn(createSampleBattle());
  assert.ok(first.combatEvents.some((event) => event.type === "attack"));
  first.combatEvents.push({ turn: -1, sequence: 999, type: "attack", kind: "sentinel" });
  const second = executeBattleTurn(first);
  assert.ok(second.combatEvents.every((event) => event.turn === second.turn));
  assert.ok(!second.combatEvents.some((event) => event.kind === "sentinel"));
});

test("the tactical UI styles each effect family and honors reduced motion", () => {
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(appSource, /buildTacticalEffects\(previousBattle, nextBattle\)/);
  assert.match(appSource, /playTacticalBattleEffects\(effects, nextBattle/);
  for (const selector of ["tactical-vfx-move", "tactical-vfx-attack", "tactical-vfx-cast", "tactical-vfx-spell", "tactical-vfx-impact", "tactical-vfx-status", "tactical-magic-residue"]) {
    assert.match(styleSource, new RegExp(`\\.${selector}`));
  }
  for (const spell of ["fire", "ice", "heal", "earth"]) assert.match(styleSource, new RegExp(`\\.tactical-vfx-spell\\.is-${spell}`));
  assert.match(appSource, /effects\.spells\.forEach/);
  assert.match(appSource, /prefers-reduced-motion: reduce/);
  assert.match(styleSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.tactical-vfx-impact/);
});
