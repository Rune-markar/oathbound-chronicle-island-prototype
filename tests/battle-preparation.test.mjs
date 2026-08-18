import test from "node:test";
import assert from "node:assert/strict";
import {
  createBattlePreparation,
  finalizeBattlePreparation,
  getBattlePreparationSummary,
  placeBattlePreparationUnit,
  selectBattlePreparationUnit,
  setBattleLogisticsPlan,
  setBattlePlacementMode,
  setBattlePreparationFormation,
  toggleBattleParticipant,
} from "../src/battle-preparation.js";
import { createSampleBattle, getBattleUnit } from "../src/tactical-battle.js";

const roster = [
  { id: "gaius", name: "ガイウス", role: "軍団長", stats: { leadership: 76, war: 70, intelligence: 52, charisma: 62 }, traits: ["drill"] },
  { id: "mara", name: "マーラ", role: "副将", stats: { leadership: 73, war: 61, intelligence: 69, charisma: 78 }, traits: ["scouting"] },
  { id: "sera", name: "セラ", role: "軍師", stats: { leadership: 48, war: 36, intelligence: 86, charisma: 59 }, traits: ["justification"] },
  { id: "edras", name: "エドラス", role: "執政官", stats: { leadership: 46, war: 31, intelligence: 70, charisma: 66 }, traits: ["commerce"] },
];

function preparation() {
  return createBattlePreparation({
    battle: createSampleBattle(),
    roster,
    defaultParticipantIds: ["gaius", "mara", "sera"],
  });
}

test("battle preparation defaults to three participants, automatic line deployment, and standard logistics", () => {
  const draft = preparation();
  const summary = getBattlePreparationSummary(draft);
  assert.deepEqual(draft.selectedCharacterIds, ["gaius", "mara", "sera"]);
  assert.equal(draft.placementMode, "auto");
  assert.equal(draft.formationId, "line");
  assert.equal(draft.logisticsPlanId, "standard");
  assert.equal(summary.soldiers, 660);
  assert.equal(summary.units, 5);
  assert.equal(summary.characters, 3);
  assert.ok(summary.dailyDemand > summary.soldiers);
  assert.ok(summary.sustainableDays >= 10);
});

test("participant selection becomes the actual commander roster without orphaning player units", () => {
  let draft = preparation();
  draft = toggleBattleParticipant(draft, "sera");
  draft = toggleBattleParticipant(draft, "edras");
  const battle = finalizeBattlePreparation(draft);
  const playerCommanders = battle.commanders.filter((commander) => commander.side === "player");
  assert.deepEqual(playerCommanders.map((commander) => commander.id), ["cmd-character-gaius", "cmd-character-mara", "cmd-character-edras"]);
  assert.ok(battle.units.filter((unit) => unit.side === "player").every((unit) => playerCommanders.some((commander) => commander.id === unit.commanderId)));
  assert.deepEqual(battle.preparation.participantIds, ["gaius", "mara", "edras"]);
  assert.equal(battle.preparation.finalized, true);
});

test("manual deployment moves a selected unit only inside the friendly deployment zone", () => {
  let draft = setBattlePlacementMode(preparation(), "manual");
  draft = selectBattlePreparationUnit(draft, "p-infantry-1");
  draft = placeBattlePreparationUnit(draft, "p-infantry-1", { x: 7, y: 2 });
  assert.deepEqual(getBattleUnit(draft.battle, "p-infantry-1").position, { x: 7, y: 2 });
  assert.equal(draft.selectedUnitId, null);
  assert.throws(() => placeBattlePreparationUnit(draft, "p-infantry-1", { x: 12, y: 2 }), /展開区域/);
  const occupied = getBattleUnit(draft.battle, "p-mage").position;
  assert.throws(() => placeBattlePreparationUnit(draft, "p-infantry-1", occupied), /使用されています/);
});

test("formation and logistics choices alter deployment and calculated sustainment", () => {
  const baseline = preparation();
  const wedge = setBattlePreparationFormation(baseline, "wedge");
  assert.equal(wedge.battle.formations.player, "wedge");
  assert.notDeepEqual(getBattleUnit(wedge.battle, "p-infantry-1").position, getBattleUnit(baseline.battle, "p-infantry-1").position);

  const rapid = setBattleLogisticsPlan(wedge, "rapid");
  const extended = setBattleLogisticsPlan(wedge, "extended");
  assert.ok(getBattlePreparationSummary(extended).sustainableDays > getBattlePreparationSummary(rapid).sustainableDays);
  const battle = finalizeBattlePreparation(extended);
  assert.equal(battle.supplyNodes.find((node) => node.side === "player").range, 8);
  assert.equal(battle.supplyNodes.find((node) => node.side === "player").stockpile, 620);
  assert.equal(battle.supplyNodes.find((node) => node.side === "player").throughput, 48);
  assert.ok(battle.units.filter((unit) => unit.side === "player").every((unit) => unit.supply === 138 && unit.maxSupply === 138));
});

test("battle cannot start without at least one participating character", () => {
  let draft = preparation();
  for (const id of [...draft.selectedCharacterIds]) draft = toggleBattleParticipant(draft, id);
  assert.throws(() => finalizeBattlePreparation(draft), /1名以上/);
});
