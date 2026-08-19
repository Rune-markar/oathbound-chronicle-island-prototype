import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  GENERATED_NATION_PEOPLE_IDS,
  NATIONAL_UNIT_PROFILES,
  createCareerInitialState,
  createMilitaryCareerBattle,
  createNationalArmyUnitSpecs,
  getNationalArmySummary,
  prepareMilitaryCareerMission,
  startMilitaryCareerMission,
} from "../src/simulation.js";
import {
  autoResolveBattle,
  createBattleMap,
  createBattleState,
  createCombatUnit,
  createCommander,
  getEffectiveStats,
  setBattleTerrain,
} from "../src/tactical-battle.js";
import { RACES, UNIT_CLASSES } from "../src/tactical-data.js";
import {
  buildGeneratedWorld,
  moveGeneratedExpeditionToRegion,
  setGeneratedPlayerNation,
} from "../src/generated-world-system.js";

const expectedClasses = [
  "archer", "cavalry", "engineer", "heavy_infantry", "infantry", "light_cavalry", "mage", "spearman",
];

function nation(peopleId, suffix = "test") {
  return { id: `${peopleId}-${suffix}`, name: `${peopleId}試験国`, shortName: peopleId, peopleId, peopleName: RACES[peopleId].name };
}

function positions(side, count = 4) {
  const x = side === "player" ? 2 : 9;
  return [{ x, y: 1 }, { x, y: 3 }, { x, y: 5 }, { x, y: 7 }].slice(0, count);
}

function nationalBattle(playerPeopleId, enemyPeopleId, environment, seed) {
  const map = createBattleMap({ width: 12, height: 9, terrainType: "plain" });
  for (let x = 0; x < map.width; x += 1) setBattleTerrain(map, { x, y: 4 }, "road");
  if (environment !== "plain") {
    [[3, 1], [3, 2], [4, 1], [5, 6], [6, 6], [6, 7]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, environment));
  }
  const commanders = [
    createCommander({ id: "player-command", name: "自軍指揮官", side: "player", position: { x: 0, y: 4 }, leadership: 68, tactics: 64, commandRange: 12 }),
    createCommander({ id: "enemy-command", name: "敵軍指揮官", side: "enemy", position: { x: 11, y: 4 }, leadership: 68, tactics: 64, commandRange: 12 }),
  ];
  const playerSpecs = createNationalArmyUnitSpecs({
    nation: nation(playerPeopleId, "player"), side: "player", commanderId: commanders[0].id,
    strength: 180, scale: "commander", positions: positions("player", 3), seed,
  });
  const enemySpecs = createNationalArmyUnitSpecs({
    nation: nation(enemyPeopleId, "enemy"), side: "enemy", commanderId: commanders[1].id,
    strength: 180, scale: "commander", positions: positions("enemy", 3), seed: `${seed}:enemy`,
  });
  return createBattleState({
    map,
    commanders,
    units: [
      ...playerSpecs.map((spec) => createCombatUnit(spec)),
      ...enemySpecs.map((spec) => createCombatUnit({ ...spec, facing: "west" })),
    ],
    formations: {
      player: NATIONAL_UNIT_PROFILES[playerPeopleId].formationId,
      enemy: NATIONAL_UNIT_PROFILES[enemyPeopleId].formationId,
    },
    seed,
  });
}

test("all seven generated-nation cultures have complete, distinct rosters covering every tactical class", () => {
  assert.deepEqual(Object.keys(NATIONAL_UNIT_PROFILES), [...GENERATED_NATION_PEOPLE_IDS]);
  const usedClasses = new Set();
  const doctrines = new Set();
  for (const peopleId of GENERATED_NATION_PEOPLE_IDS) {
    const profile = NATIONAL_UNIT_PROFILES[peopleId];
    const summary = getNationalArmySummary(nation(peopleId));
    assert.ok(RACES[peopleId], `${peopleId} must be accepted by the tactical engine`);
    assert.ok(profile.templates.length >= 4);
    assert.equal(summary.profileId, peopleId);
    assert.equal(summary.units.length, profile.templates.length);
    assert.ok(summary.strengths.length >= 3);
    assert.ok(summary.risks.length >= 2);
    assert.ok(!doctrines.has(profile.doctrineName), `${profile.doctrineName} must identify one national doctrine`);
    doctrines.add(profile.doctrineName);
    profile.templates.forEach((template) => {
      assert.ok(UNIT_CLASSES[template.unitClassId]);
      assert.ok(template.traitName && template.traitDescription && template.strength && template.risk);
      usedClasses.add(template.unitClassId);
    });
  }
  assert.deepEqual([...usedClasses].sort(), expectedClasses);
});

test("national traits survive unit creation and change the stated terrain or specialist performance", () => {
  const beastSpecs = createNationalArmyUnitSpecs({
    nation: nation("beastfolk"), side: "player", commanderId: "commander", strength: 180,
    scale: "full", positions: positions("player"), seed: "forest-traits",
  });
  const archerSpec = beastSpecs.find((spec) => spec.unitClassId === "archer");
  const commander = createCommander({ id: "commander", name: "氏族長", side: "player", position: { x: 0, y: 3 }, commandRange: 12 });
  const forestMap = createBattleMap({ width: 12, height: 9, terrainType: "forest" });
  const nationalArcher = createCombatUnit({ ...archerSpec, position: { x: 2, y: 3 } });
  const plainArcher = createCombatUnit({
    ...archerSpec,
    id: "baseline-archer",
    name: "軍制外の獣人弓兵",
    position: { x: 2, y: 5 },
    nationalModifiers: {},
    nationalTerrainModifiers: {},
    nationalDoctrineName: null,
    nationalTraitName: null,
  });
  const battle = createBattleState({ map: forestMap, commanders: [commander], units: [nationalArcher, plainArcher] });
  const nationalStats = getEffectiveStats(battle, nationalArcher);
  const baselineStats = getEffectiveStats(battle, plainArcher);
  assert.ok(nationalStats.rangedAccuracy > baselineStats.rangedAccuracy * 1.1);
  assert.ok(nationalStats.defense > baselineStats.defense);
  assert.equal(nationalStats.breakdown.nationalDoctrine, "群れ狩り包囲");
  assert.equal(nationalStats.breakdown.nationalTrait, "葉陰射撃");

  const lizardMageSpec = createNationalArmyUnitSpecs({
    nation: nation("lizardman"), side: "player", commanderId: "lizard-command", strength: 180,
    scale: "commander", positions: positions("player", 3), seed: "water-magic",
  }).find((spec) => spec.unitClassId === "mage");
  const lizardMage = createCombatUnit(lizardMageSpec);
  assert.ok(lizardMage.availableMagicSkillIds.includes("arcane_bolt"));
  assert.ok(lizardMage.magicPower === null, "unspecified magic power must fall back to the class value");
  const mageCommander = createCommander({ id: "lizard-command", name: "潮呼び", position: { x: 0, y: 3 }, commandRange: 12 });
  const mageBattle = createBattleState({ map: createBattleMap({ width: 12, height: 9 }), commanders: [mageCommander], units: [lizardMage] });
  assert.ok(getEffectiveStats(mageBattle, lizardMage).magicPower > 0);
});

test("ordinary generated-world military missions use every current nation's own units instead of the fixed demo roster", () => {
  const base = createCareerInitialState({ seed: "national-unit-normal-flow", nationCount: 7 });
  const runtime = buildGeneratedWorld(base);
  assert.deepEqual(runtime.nations.nations.map((entry) => entry.peopleId), [...GENERATED_NATION_PEOPLE_IDS]);

  for (const generatedNation of runtime.nations.nations) {
    let state = setGeneratedPlayerNation(structuredClone(base), generatedNation.id, runtime);
    state.player.stage = "commander";
    state.player.affiliation = { nationId: generatedNation.id, liegeId: `${generatedNation.id}-ruler`, liegeName: `${generatedNation.name}の主君` };
    state.player.metrics.wealth = 20;
    state.player.villageLife.supplies.food = 30;
    state = startMilitaryCareerMission(state);
    state = prepareMilitaryCareerMission(state, { approachId: "rapid", logisticsId: "standard", companionIds: [] });
    const mission = state.player.militaryCareer.activeMission;
    state = moveGeneratedExpeditionToRegion(state, mission.targetRegion.id, { mode: "route", encounterRoll: 1 });
    const battle = createMilitaryCareerBattle(state);
    const nationalUnits = battle.units.filter((unit) => unit.side === "player" && unit.tags.includes("NATIONAL_ARMY"));
    assert.equal(battle.sideLabels.player, generatedNation.name);
    assert.equal(battle.nationalArmies.player.profileId, generatedNation.peopleId);
    assert.equal(nationalUnits.length, 3);
    assert.ok(nationalUnits.every((unit) => unit.nationId === generatedNation.id && unit.raceId === generatedNation.peopleId));
    assert.ok(nationalUnits.every((unit) => unit.nationalDoctrineName && unit.nationalTraitName && unit.nationalStrength && unit.nationalRisk));
    assert.ok(battle.environment?.accent);
  }
});

test("round-robin mixed-terrain simulations keep every doctrine viable without one universal winner", () => {
  const peopleIds = [...GENERATED_NATION_PEOPLE_IDS];
  const environments = ["plain", "forest", "hill", "swamp"];
  const records = Object.fromEntries(peopleIds.map((peopleId) => [peopleId, { wins: 0, losses: 0, stalls: 0, matches: 0 }]));

  for (const environment of environments) {
    for (let left = 0; left < peopleIds.length; left += 1) {
      for (let right = left + 1; right < peopleIds.length; right += 1) {
        for (const swapped of [false, true]) {
          const playerPeopleId = swapped ? peopleIds[right] : peopleIds[left];
          const enemyPeopleId = swapped ? peopleIds[left] : peopleIds[right];
          let battle = nationalBattle(playerPeopleId, enemyPeopleId, environment, `balance:${environment}:${left}:${right}:${swapped}`);
          let stalled = false;
          try {
            battle = autoResolveBattle(battle, { maxTurns: 120 });
          } catch (error) {
            assert.match(error.message, /120ターン以内/);
            stalled = true;
          }
          records[playerPeopleId].matches += 1;
          records[enemyPeopleId].matches += 1;
          if (stalled) {
            records[playerPeopleId].stalls += 1;
            records[enemyPeopleId].stalls += 1;
          } else if (battle.winner === "player") {
            records[playerPeopleId].wins += 1;
            records[enemyPeopleId].losses += 1;
          } else if (battle.winner === "enemy") {
            records[enemyPeopleId].wins += 1;
            records[playerPeopleId].losses += 1;
          }
        }
      }
    }
  }

  const totals = Object.values(records).reduce((result, entry) => ({
    matches: result.matches + entry.matches,
    stalls: result.stalls + entry.stalls,
  }), { matches: 0, stalls: 0 });
  for (const [peopleId, record] of Object.entries(records)) {
    const winRate = record.wins / record.matches;
    assert.ok(record.wins > 0, `${peopleId} must win in at least one matchup`);
    assert.ok(record.losses > 0, `${peopleId} must retain a counter or weakness`);
    assert.ok(winRate >= 0.15 && winRate <= 0.8, `${peopleId} has an outlying mixed-terrain win rate: ${winRate}`);
  }
  assert.ok(totals.stalls / totals.matches < 0.15, `too many mixed-terrain simulations stalled: ${totals.stalls}/${totals.matches}`);
});

test("normal tactical UI exposes national doctrine and traits without hiding the short-landscape battlefield", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /tactical-national-matchup/);
  assert.match(app, /自軍軍制.*敵軍軍制/s);
  assert.match(app, /tactical-national-unit-sheet/);
  assert.match(app, /nationalTraitDescription.*nationalStrength.*nationalRisk/s);
  assert.match(styles, /tactical-national-matchup/);
  assert.match(styles, /max-width: 980px.*orientation: landscape.*max-height: 430px/s);
  assert.match(styles, /tactical-map-scroll \{ padding: 8px 10px 12px; \}/);
  assert.match(styles, /tactical-battle-map \{ --battle-tile-size: 38px; \}/);
});
