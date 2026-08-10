import test from "node:test";
import assert from "node:assert/strict";
import {
  createEncirclementCaptureDemo,
  createSampleBattle,
  executeBattleTurn,
  getBattleCommander,
} from "../src/tactical-battle.js";
import { createBattleResult, evaluateCompleteEncirclement } from "../src/battle-results.js";

test("ordinary victory opens a result without capturing a commander who retained a retreat route", () => {
  let battle = createSampleBattle();
  for (let turn = 0; turn < 60 && !battle.winner; turn += 1) battle = executeBattleTurn(battle);
  const result = createBattleResult(battle);
  assert.equal(result.winner, "player");
  assert.equal(result.resultType, "field_victory");
  assert.equal(result.capture.eligible, false);
  assert.ok(result.player.casualties > 0);
  assert.ok(result.enemy.routed + result.enemy.escaped + result.enemy.destroyed > 0);
});

test("complete encirclement with no escape corridor captures the defeated commander", () => {
  const battle = createEncirclementCaptureDemo();
  const encirclement = evaluateCompleteEncirclement(battle);
  const result = createBattleResult(battle);
  assert.equal(encirclement.complete, true);
  assert.equal(encirclement.commanderHasCorridor, false);
  assert.equal(result.resultType, "encirclement_annihilation");
  assert.equal(result.capture.eligible, true);
  assert.equal(result.capture.commanderId, "cmd-valka");
  assert.equal(result.capture.commanderName, getBattleCommander(battle, "cmd-valka").name);
});

test("even a single escaped unit prevents complete encirclement and commander capture", () => {
  const battle = createEncirclementCaptureDemo();
  battle.units.find((unit) => unit.side === "enemy" && unit.state === "DESTROYED").state = "ESCAPED";
  const result = createBattleResult(battle);
  assert.equal(result.encirclement.complete, false);
  assert.equal(result.capture.eligible, false);
  assert.match(result.encirclement.reasons.join(" / "), /戦場離脱 1部隊/);
});
