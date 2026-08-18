import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBattleFormation,
  applyEngineerAction,
  castMagicSkill,
  createBattleMap,
  createBattleState,
  createCombatUnit,
  createCommander,
  createFortificationSiegeDemo,
  createSampleBattle,
  executeBattleTurn,
  getBattleCommander,
  getBattleSummary,
  getBattleTile,
  getBattleUnit,
  getBattleFortification,
  getAttackableBattleTiles,
  getChargePreview,
  getEffectiveStats,
  getLogisticsState,
  getMagicSkillPreview,
  getMagicTargetTiles,
  getReachableBattleTiles,
  getReachableCommanderTiles,
  getSupplyRoute,
  issueUnitOrder,
  isBattleTilePassable,
  planCommanderMove,
  planUnitAbility,
  planUnitMove,
  setUnitFacing,
  setBattleTerrain,
  setBattleTileFeature,
  updateFortificationState,
} from "../src/tactical-battle.js";

function duel({ attackerPosition = { x: 2, y: 3 }, defenderPosition = { x: 5, y: 3 }, defenderClass = "spearman" } = {}) {
  const map = createBattleMap({ width: 10, height: 8 });
  const commanders = [
    createCommander({ id: "p-cmd", name: "王国指揮官", side: "player", position: { x: 1, y: 3 }, commandRange: 12 }),
    createCommander({ id: "e-cmd", name: "公国指揮官", side: "enemy", position: { x: 8, y: 3 }, commandRange: 12 }),
  ];
  const units = [
    createCombatUnit({ id: "cavalry", name: "試験騎兵", side: "player", unitClassId: "cavalry", commanderId: "p-cmd", position: attackerPosition }),
    createCombatUnit({ id: "defender", name: "試験守備隊", side: "enemy", unitClassId: defenderClass, commanderId: "e-cmd", position: defenderPosition, facing: "west" }),
  ];
  return createBattleState({ map, commanders, units, seed: 17 });
}

test("developer battle provides the exact 5 versus 5 sample roster on a compact 20 by 14 grid", () => {
  const battle = createSampleBattle();
  const playerClasses = battle.units.filter((unit) => unit.side === "player").map((unit) => unit.unitClassId).sort();
  const enemyClasses = battle.units.filter((unit) => unit.side === "enemy").map((unit) => unit.unitClassId).sort();
  assert.equal(battle.map.width, 20);
  assert.equal(battle.map.height, 14);
  assert.equal(battle.map.tiles.length, 280);
  assert.deepEqual(playerClasses, ["archer", "cavalry", "infantry", "mage", "spearman"]);
  assert.deepEqual(enemyClasses, ["archer", "infantry", "infantry", "infantry", "light_cavalry"]);
  assert.equal(battle.commanders.length, 2);
  assert.equal(battle.fortifications.length, 2);
  assert.equal(getBattleFortification(battle, "castle-selene").typeId, "castle");
  assert.equal(getBattleFortification(battle, "fort-valka").typeId, "fort");
  const iconUrls = [...battle.units, ...battle.commanders].map((actor) => actor.iconUrl);
  assert.equal(iconUrls.filter(Boolean).length, 12);
  assert.equal(new Set(iconUrls).size, 12);
  assert.ok(iconUrls.every((iconUrl) => /\.(png|webp)$/.test(iconUrl)));
  assert.deepEqual(getBattleUnit(battle, "p-mage").availableMagicSkillIds, ["fire", "ice", "heal", "earth"]);
  assert.equal(isBattleTilePassable(battle, { x: 10, y: 2 }), false);
  assert.equal(isBattleTilePassable(battle, { x: 10, y: 3 }), true);
  assert.equal(isBattleTilePassable(battle, { x: 10, y: 6 }), true);
});

test("castles and forts grant distinct support buffs inside their aura", () => {
  const castleBattle = createSampleBattle();
  castleBattle.supplyNodes = [];
  const infantry = getBattleUnit(castleBattle, "p-infantry-1");
  infantry.position = { x: 2, y: 8 };
  const castleDefense = getEffectiveStats(castleBattle, infantry).defense;
  const castleLogistics = getLogisticsState(castleBattle, infantry);
  assert.equal(castleLogistics.connected, true);
  assert.equal(castleLogistics.fortification?.id, "castle-selene");
  assert.equal(castleLogistics.replenishment, 4);

  const outsideCastle = structuredClone(castleBattle);
  getBattleUnit(outsideCastle, "p-infantry-1").position = { x: 5, y: 12 };
  assert.equal(getLogisticsState(outsideCastle, "p-infantry-1").connected, false);
  assert.ok(castleDefense > getEffectiveStats(outsideCastle, "p-infantry-1").defense * 1.15);

  const fortBattle = createSampleBattle();
  const archer = getBattleUnit(fortBattle, "e-archer");
  archer.position = { x: 18, y: 5 };
  const fortifiedAccuracy = getEffectiveStats(fortBattle, archer).rangedAccuracy;
  archer.position = { x: 14, y: 5 };
  assert.ok(fortifiedAccuracy > getEffectiveStats(fortBattle, archer).rangedAccuracy * 1.08);
});

test("a completely encircled castle loses base durability each turn while a fort does not", () => {
  const siege = createFortificationSiegeDemo();
  const before = getBattleFortification(siege, "castle-valka").baseDurability;
  const next = executeBattleTurn(siege);
  const castle = getBattleFortification(next, "castle-valka");
  assert.equal(castle.encircled, true);
  assert.equal(castle.encircledTurns, 1);
  assert.equal(castle.baseDurability, before - 12);
  assert.equal(castle.durability, castle.baseDurability);
  assert.ok(next.log.some((entry) => /完全包囲により基礎耐久力が12低下/.test(entry.message)));

  const corridorOpen = createFortificationSiegeDemo();
  corridorOpen.units.filter((unit) => unit.side === "player").forEach((unit) => {
    unit.state = "DESTROYED";
    unit.soldierCount = 0;
  });
  updateFortificationState(corridorOpen);
  assert.equal(getBattleFortification(corridorOpen, "castle-valka").encircled, false);
  assert.equal(getBattleFortification(corridorOpen, "castle-valka").baseDurability, before);

  const fortOnly = createFortificationSiegeDemo();
  const fort = getBattleFortification(fortOnly, "fort-selene");
  const fortBefore = fort.baseDurability;
  fort.position = { x: 15, y: 6 };
  updateFortificationState(fortOnly);
  assert.equal(fort.encircled, false);
  assert.equal(fort.baseDurability, fortBefore);
});

test("formation deployment repositions the army before battle and changes formation modifiers", () => {
  const battle = createSampleBattle();
  const lineAttack = getEffectiveStats(battle, "p-infantry-1").attack;
  const wedge = applyBattleFormation(battle, "player", "wedge");
  assert.equal(wedge.formations.player, "wedge");
  assert.notDeepEqual(getBattleUnit(wedge, "p-infantry-1").position, getBattleUnit(battle, "p-infantry-1").position);
  assert.ok(getEffectiveStats(wedge, "p-infantry-1").attack > lineAttack);
  assert.throws(() => applyBattleFormation(executeBattleTurn(wedge), "player", "guarded"), /戦闘開始前/);
});

test("impassable river tiles require a ford or bridge and crossing applies a temporary debuff", () => {
  const map = createBattleMap({ width: 10, height: 8 });
  for (let y = 0; y < map.height; y += 1) setBattleTerrain(map, { x: 4, y }, "river");
  setBattleTileFeature(map, { x: 4, y: 3 }, "ford");
  const commanders = [
    createCommander({ id: "p-cmd", name: "渡河指揮官", side: "player", position: { x: 1, y: 3 }, commandRange: 12 }),
    createCommander({ id: "e-cmd", name: "対岸指揮官", side: "enemy", position: { x: 8, y: 6 }, commandRange: 12 }),
  ];
  const units = [
    createCombatUnit({ id: "crossing", name: "渡河歩兵", side: "player", unitClassId: "infantry", commanderId: "p-cmd", position: { x: 3, y: 3 }, order: "advance" }),
    createCombatUnit({ id: "enemy", name: "対岸歩兵", side: "enemy", unitClassId: "infantry", commanderId: "e-cmd", position: { x: 8, y: 5 }, order: "hold" }),
  ];
  let battle = createBattleState({ map, commanders, units, seed: 12 });
  assert.throws(() => planUnitMove(battle, "crossing", { x: 4, y: 2 }), /通行できません/);
  battle = planUnitMove(battle, "crossing", { x: 5, y: 3 });
  battle = executeBattleTurn(battle);
  const unit = getBattleUnit(battle, "crossing");
  assert.deepEqual(unit.position, { x: 5, y: 3 });
  assert.ok(unit.statusEffects.some((status) => status.id === "river_crossing"));
  assert.ok(unit.cohesion < 70);
  assert.ok(battle.log.some((entry) => /浅瀬を渡河/.test(entry.message)));
});

test("low supplies reduce effective strength and expose disconnected logistics", () => {
  const battle = createSampleBattle();
  const unit = getBattleUnit(battle, "p-cavalry");
  const suppliedAttack = getEffectiveStats(battle, unit).attack;
  unit.supply = 8;
  unit.position = { x: 14, y: 12 };
  const logistics = getLogisticsState(battle, unit);
  assert.equal(logistics.id, "critical");
  assert.equal(logistics.connected, false);
  assert.ok(getEffectiveStats(battle, unit).attack < suppliedAttack * 0.7);
});

test("supply routes follow passable ground and commanders relay distant deliveries", () => {
  const battle = createSampleBattle();
  const route = getSupplyRoute(battle, "p-cavalry");
  assert.equal(route.connected, true);
  assert.equal(route.sourceType, "depot");
  assert.equal(route.source.id, "supply-player");
  assert.equal(route.relayConnected, true);
  assert.deepEqual(route.route[0], route.source.position);
  assert.deepEqual(route.route.at(-1), getBattleUnit(battle, "p-cavalry").position);
  assert.ok(route.route.every((position) => isBattleTilePassable(battle, position)));
});

test("enemy control of a depot cuts the supply route", () => {
  const map = createBattleMap({ width: 8, height: 6 });
  const commanders = [
    createCommander({ id: "p-logistics-cmd", name: "補給指揮官", side: "player", position: { x: 0, y: 0 }, commandRange: 8 }),
    createCommander({ id: "e-raid-cmd", name: "襲撃指揮官", side: "enemy", position: { x: 7, y: 5 }, commandRange: 8 }),
  ];
  const units = [
    createCombatUnit({ id: "p-logistics-unit", name: "補給待ち部隊", side: "player", commanderId: "p-logistics-cmd", position: { x: 4, y: 2 } }),
    createCombatUnit({ id: "e-raider", name: "補給所襲撃隊", side: "enemy", commanderId: "e-raid-cmd", position: { x: 1, y: 2 } }),
  ];
  const battle = createBattleState({
    map,
    commanders,
    units,
    supplyNodes: [{ id: "p-depot", name: "前線補給所", side: "player", position: { x: 0, y: 2 }, range: 7, replenish: 8, throughput: 20, maxStockpile: 50, stockpile: 50 }],
  });
  const route = getSupplyRoute(battle, "p-logistics-unit");
  assert.equal(route.connected, false);
  assert.match(route.reason, /敵支配圏/);
});

test("turn logistics consumes finite stockpiles and depleted depots stop replenishing", () => {
  const battle = createSampleBattle();
  const before = battle.supplyNodes.find((node) => node.id === "supply-player").stockpile;
  const next = executeBattleTurn(battle);
  const after = next.supplyNodes.find((node) => node.id === "supply-player").stockpile;
  assert.ok(after < before);
  assert.ok(next.log.some((entry) => /補給物資.*を輸送/.test(entry.message)));

  const depleted = createSampleBattle();
  depleted.supplyNodes.forEach((node) => { node.stockpile = 0; });
  const castle = getBattleFortification(depleted, "castle-selene");
  castle.supplyStockpile = 0;
  const route = getSupplyRoute(depleted, "p-infantry-1");
  assert.equal(route.connected, false);
  assert.match(route.reason, /枯渇/);
});

test("race, equipment, terrain, formation state, and commander range compose effective stats", () => {
  const battle = createSampleBattle();
  const elfArcher = getBattleUnit(battle, "p-archer");
  const baseline = createCombatUnit({
    id: "baseline", name: "人族弓兵", side: "player", raceId: "human", unitClassId: "archer",
    equipmentIds: [], commanderId: "cmd-selene", soldierCount: elfArcher.soldierCount,
    maxSoldierCount: elfArcher.maxSoldierCount, position: { x: 4, y: 8 },
  });
  battle.units.push(baseline);
  const elfStats = getEffectiveStats(battle, elfArcher);
  const humanStats = getEffectiveStats(battle, baseline);
  assert.ok(elfStats.rangedAccuracy > humanStats.rangedAccuracy);
  assert.ok(elfStats.rangedAttack > humanStats.rangedAttack);
  assert.match(elfStats.breakdown.commander, /指揮範囲内/);
  assert.equal(elfStats.breakdown.race, "エルフ");
});

test("units outside command range keep their last order and reject direct orders", () => {
  const battle = duel();
  battle.commanders[0].commandRange = 0;
  assert.throws(() => issueUnitOrder(battle, "cavalry", "pursue"), /指揮範囲外/);
  const unit = getBattleUnit(battle, "cavalry");
  assert.equal(unit.order, "hold");
});

test("a frontal cavalry charge into braced spears is worse than a flank charge", () => {
  const front = duel({ attackerPosition: { x: 2, y: 3 }, defenderPosition: { x: 5, y: 3 } });
  const frontPreview = getChargePreview(front, "cavalry", "defender", 4);
  const flank = duel({ attackerPosition: { x: 5, y: 1 }, defenderPosition: { x: 5, y: 3 } });
  const flankPreview = getChargePreview(flank, "cavalry", "defender", 4);
  assert.equal(frontPreview.direction, "front");
  assert.equal(frontPreview.braced, true);
  assert.ok(frontPreview.braceCounterMultiplier > 1);
  assert.equal(flankPreview.direction, "flank");
  assert.equal(flankPreview.braced, false);
  assert.ok(flankPreview.attackMultiplier > frontPreview.attackMultiplier * 2);
  assert.ok(flankPreview.moraleMultiplier > frontPreview.moraleMultiplier);
});

test("turn execution runs movement and all phase systems without UI calculations", () => {
  let battle = createSampleBattle();
  battle = planUnitMove(battle, "p-infantry-1", { x: 7, y: 4 });
  battle = executeBattleTurn(battle);
  assert.equal(battle.turn, 1);
  assert.equal(battle.phase, "command");
  assert.deepEqual(getBattleUnit(battle, "p-infantry-1").position, { x: 7, y: 4 });
  assert.ok(battle.log.some((entry) => entry.phase === "command"));
  const summary = getBattleSummary(battle);
  assert.equal(summary.player.units, 5);
  assert.equal(summary.enemy.units, 5);
});

test("manual movement exposes only destinations reachable this turn", () => {
  const battle = createSampleBattle();
  const reachable = getReachableBattleTiles(battle, "p-infantry-1");
  const keys = new Set(reachable.map(({ position }) => `${position.x},${position.y}`));
  assert.ok(keys.has("7,4"));
  assert.ok(!keys.has("12,4"));
  assert.ok(reachable.every(({ cost }) => cost > 0 && cost <= getEffectiveStats(battle, "p-infantry-1").movement));
  assert.throws(() => planUnitMove(battle, "p-infantry-1", { x: 12, y: 4 }), /移動可能範囲外/);
});

test("manual attack range follows melee, ranged, and line-of-sight rules", () => {
  const meleeBattle = duel();
  const meleeTiles = getAttackableBattleTiles(meleeBattle, "cavalry");
  assert.equal(meleeTiles.length, 4);
  assert.ok(meleeTiles.every(({ distance: separation, range }) => separation === 1 && range === 1));

  const map = createBattleMap({ width: 10, height: 8 });
  const rangedBattle = createBattleState({
    map,
    commanders: [
      createCommander({ id: "p-ranged-cmd", name: "王国射撃指揮官", side: "player", position: { x: 1, y: 3 }, commandRange: 12 }),
      createCommander({ id: "e-ranged-cmd", name: "公国守備指揮官", side: "enemy", position: { x: 8, y: 3 }, commandRange: 12 }),
    ],
    units: [
      createCombatUnit({ id: "archer", name: "試験弓兵", side: "player", unitClassId: "archer", commanderId: "p-ranged-cmd", position: { x: 2, y: 3 } }),
      createCombatUnit({ id: "ranged-target", name: "試験目標", side: "enemy", unitClassId: "infantry", commanderId: "e-ranged-cmd", position: { x: 5, y: 3 } }),
    ],
  });
  const clearRange = new Set(getAttackableBattleTiles(rangedBattle, "archer").map(({ position }) => `${position.x},${position.y}`));
  assert.ok(clearRange.has("5,3"));
  setBattleTerrain(rangedBattle, { x: 3, y: 3 }, "mountain");
  const blockedRange = new Set(getAttackableBattleTiles(rangedBattle, "archer").map(({ position }) => `${position.x},${position.y}`));
  assert.ok(!blockedRange.has("5,3"));
});

test("commander movement range matches the same destinations accepted by manual planning", () => {
  const battle = createSampleBattle();
  const reachable = getReachableCommanderTiles(battle, "cmd-selene");
  assert.ok(reachable.length > 0);
  const destination = reachable[0].position;
  const planned = planCommanderMove(battle, "cmd-selene", destination);
  assert.deepEqual(getBattleCommander(planned, "cmd-selene").plannedPosition, destination);
});

test("progress preserves player instructions and gives unassigned allies trait-based actions", () => {
  let battle = createSampleBattle();
  const autonomousBefore = { ...getBattleUnit(battle, "p-mage").position };
  battle = planUnitMove(battle, "p-infantry-1", { x: 7, y: 4 });
  battle = issueUnitOrder(battle, "p-spearman", "defend");
  battle = setUnitFacing(battle, "p-spearman", "north");
  battle = executeBattleTurn(battle);
  assert.deepEqual(getBattleUnit(battle, "p-infantry-1").position, { x: 7, y: 4 });
  assert.notDeepEqual(getBattleUnit(battle, "p-mage").position, autonomousBefore);
  assert.equal(getBattleUnit(battle, "p-spearman").facing, "north");
  assert.ok(battle.log.some((entry) => entry.phase === "command" && entry.message.includes("兵種・特性")));
});

test("the sample battle reaches a result instead of oscillating forever", () => {
  let battle = createSampleBattle();
  const recentLayouts = [];
  for (let turn = 0; turn < 60 && !battle.winner; turn += 1) {
    battle = executeBattleTurn(battle);
    recentLayouts.push(battle.units
      .filter((unit) => !["DESTROYED", "ESCAPED"].includes(unit.state))
      .map((unit) => `${unit.id}:${unit.position.x},${unit.position.y}`)
      .sort()
      .join("|"));
    if (recentLayouts.length > 6) recentLayouts.shift();
  }
  assert.ok(battle.winner, `60ターン以内に終戦しませんでした: ${recentLayouts.join(" -> ")}`);
  assert.ok(battle.log.some((entry) => entry.phase === "melee"));
  assert.ok(battle.log.some((entry) => entry.phase === "pursuit"));
});

test("magic effects and engineer terrain operations are driven by definitions", () => {
  const map = createBattleMap({ width: 10, height: 8 });
  setBattleTerrain(map, { x: 3, y: 4 }, "river");
  const commanders = [
    createCommander({ id: "p-cmd", name: "魔工指揮官", side: "player", position: { x: 1, y: 3 }, commandRange: 12 }),
    createCommander({ id: "e-cmd", name: "標的指揮官", side: "enemy", position: { x: 8, y: 3 }, commandRange: 12 }),
  ];
  const units = [
    createCombatUnit({ id: "mage", name: "試験魔術兵", side: "player", unitClassId: "mage", commanderId: "p-cmd", position: { x: 2, y: 2 } }),
    createCombatUnit({ id: "engineer", name: "試験工兵", side: "player", unitClassId: "engineer", commanderId: "p-cmd", position: { x: 2, y: 4 } }),
    createCombatUnit({ id: "heavy", name: "重装標的", side: "enemy", unitClassId: "heavy_infantry", commanderId: "e-cmd", position: { x: 6, y: 2 } }),
  ];
  let battle = createBattleState({ map, commanders, units, seed: 99 });
  const before = getBattleUnit(battle, "heavy").soldierCount;
  battle = castMagicSkill(battle, "mage", "lightning", { x: 6, y: 2 });
  assert.ok(getBattleUnit(battle, "heavy").soldierCount < before);
  battle = applyEngineerAction(battle, "engineer", "bridge", { x: 3, y: 4 });
  assert.ok(getBattleTile(battle, { x: 3, y: 4 }).status.some((status) => status.id === "bridge"));
  battle = applyEngineerAction(battle, "engineer", "destroy_bridge", { x: 3, y: 4 });
  assert.ok(!getBattleTile(battle, { x: 3, y: 4 }).status.some((status) => status.id === "bridge"));
});

test("magic planning rejects misleading targets and previews exact affected units", () => {
  const map = createBattleMap({ width: 10, height: 8 });
  const commanders = [
    createCommander({ id: "p-cmd", name: "魔術指揮官", side: "player", position: { x: 1, y: 3 }, commandRange: 12 }),
    createCommander({ id: "e-cmd", name: "敵指揮官", side: "enemy", position: { x: 8, y: 3 }, commandRange: 12 }),
  ];
  const units = [
    createCombatUnit({ id: "mage", name: "試験魔術兵", side: "player", unitClassId: "mage", commanderId: "p-cmd", position: { x: 2, y: 2 }, availableMagicSkillIds: ["lightning", "heal", "fire"] }),
    createCombatUnit({ id: "ally", name: "負傷した味方", side: "player", unitClassId: "infantry", commanderId: "p-cmd", position: { x: 3, y: 2 }, soldierCount: 70, maxSoldierCount: 100 }),
    createCombatUnit({ id: "heavy", name: "重装標的", side: "enemy", unitClassId: "heavy_infantry", commanderId: "e-cmd", position: { x: 6, y: 2 } }),
  ];
  const battle = createBattleState({ map, commanders, units, seed: 99 });

  assert.throws(() => planUnitAbility(battle, "mage", "lightning", { x: 3, y: 2 }), /範囲内に敵がいません/);
  assert.throws(() => planUnitAbility(battle, "mage", "heal", { x: 9, y: 7 }), /射程外/);
  assert.ok(getMagicTargetTiles(battle, "mage", "lightning").some((tile) => tile.position.x === 6 && tile.position.y === 2));
  assert.ok(!getMagicTargetTiles(battle, "mage", "lightning").some((tile) => tile.position.x === 3 && tile.position.y === 2));

  const preview = getMagicSkillPreview(battle, "mage", "lightning", { x: 6, y: 2 });
  assert.equal(preview.name, "雷撃");
  assert.equal(preview.effects.length, 1);
  assert.equal(preview.effects[0].name, "重装標的");
  assert.ok(preview.effects[0].casualties > 0);
  assert.equal(getBattleUnit(battle, "heavy").soldierCount, 120, "preview must not mutate the battle");

  const fireTiles = getMagicTargetTiles(battle, "mage", "fire");
  assert.ok(fireTiles.some((tile) => tile.position.x === 4 && tile.position.y === 4), "terrain magic may target an empty tile");
});

test("light cavalry pursuit turns a rout into disproportionate casualties", () => {
  const battle = duel({ attackerPosition: { x: 3, y: 3 }, defenderPosition: { x: 5, y: 3 }, defenderClass: "infantry" });
  const cavalry = getBattleUnit(battle, "cavalry");
  cavalry.unitClassId = "light_cavalry";
  cavalry.abilities = ["charge", "pursuit", "scout"];
  cavalry.tags = ["CAVALRY", "LIGHT"];
  cavalry.order = "pursue";
  const defender = getBattleUnit(battle, "defender");
  defender.morale = 0;
  defender.state = "ROUTED";
  const before = defender.soldierCount;
  const next = executeBattleTurn(battle);
  const after = getBattleUnit(next, "defender").soldierCount;
  assert.ok(before - after >= 20);
  assert.ok(next.log.some((entry) => entry.phase === "pursuit"));
});
