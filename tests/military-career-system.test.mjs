import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  acceptServiceInvitation,
  advanceCareerMonth,
  createCareerInitialState,
  createMilitaryCareerBattle,
  getMilitaryCareerMissionView,
  prepareMilitaryCareerMission,
  reportMilitaryCareerMission,
  resolveMilitaryCareerBattle,
  startMilitaryCareerMission,
} from "../src/simulation.js";
import { getGeneratedExpeditionReachableRegions, moveGeneratedExpeditionToRegion } from "../src/generated-world-system.js";

function retainerState(seed = "military-career-flow") {
  let state = createCareerInitialState({ seed });
  state.player.invitations = [{ id: "service-test", nationId: "forest_alliance", trust: 32, routeId: "test", routeName: "試験紹介" }];
  state = acceptServiceInvitation(state, "service-test");
  state.player.metrics.wealth = 12;
  state.player.villageLife.supplies.food = 20;
  state.player.villageLife.party = [
    { id: "ally", name: "斥候リナ", role: "斥候", hp: 42, maxHp: 48, active: true, alive: true },
    { id: "reserve", name: "待機兵", role: "前衛", hp: 50, maxHp: 50, active: false, alive: true },
  ];
  state.adventure ??= {};
  state.adventure.party = structuredClone(state.player.villageLife.party);
  return state;
}

test("a liege mission is bound to real regions, a deadline, constraints, and an immutable state", () => {
  const state = retainerState();
  const before = structuredClone(state);
  const reachableIds = new Set(getGeneratedExpeditionReachableRegions(state).map((entry) => entry.regionId));
  const next = startMilitaryCareerMission(state);
  const mission = next.player.militaryCareer.activeMission;

  assert.deepEqual(state, before);
  assert.equal(mission.kind, "retainer_suppression");
  assert.equal(mission.stage, "accepted");
  assert.equal(mission.originRegion.id, state.generatedWorld.expeditionRegionId);
  assert.ok(reachableIds.has(mission.targetRegion.id));
  assert.equal(mission.deadlineTurn, state.turn + 2);
  assert.match(mission.politicalReason, /主君|街道|住民/);
  assert.ok(mission.constraints.some((entry) => entry.id === "casualty_limit"));
  assert.ok(mission.constraints.some((entry) => entry.id === "protect_civilians"));
});

test("preparation spends real resources, records participants, and changes the battle forecast", () => {
  const state = startMilitaryCareerMission(retainerState());
  const lean = prepareMilitaryCareerMission(state, { approachId: "rapid", logisticsId: "lean", companionIds: [] });
  const reinforced = prepareMilitaryCareerMission(state, { approachId: "scout", logisticsId: "reinforced", companionIds: ["ally"] });

  assert.equal(lean.player.metrics.wealth, state.player.metrics.wealth - 1);
  assert.equal(lean.player.villageLife.supplies.food, state.player.villageLife.supplies.food - 2);
  assert.deepEqual(lean.player.militaryCareer.activeMission.participantIds, [state.player.id]);
  assert.equal(reinforced.player.metrics.wealth, state.player.metrics.wealth - 4);
  assert.equal(reinforced.player.villageLife.supplies.food, state.player.villageLife.supplies.food - 8);
  assert.deepEqual(reinforced.player.militaryCareer.activeMission.participantIds, [state.player.id, "ally"]);
  assert.ok(getMilitaryCareerMissionView(reinforced).forecast.playerStrength > getMilitaryCareerMissionView(lean).forecast.playerStrength);
  assert.ok(getMilitaryCareerMissionView(reinforced).forecast.enemyStrength < getMilitaryCareerMissionView(lean).forecast.enemyStrength);
});

test("the player must really travel to the target before starting the saved tactical battle", () => {
  const prepared = prepareMilitaryCareerMission(startMilitaryCareerMission(retainerState()), {
    approachId: "scout", logisticsId: "standard", companionIds: ["ally"],
  });
  assert.throws(() => createMilitaryCareerBattle(prepared), /対象地域へ移動/);

  const targetId = prepared.player.militaryCareer.activeMission.targetRegion.id;
  const arrived = moveGeneratedExpeditionToRegion(prepared, targetId, { mode: "route", encounterRoll: 1 });
  const battle = createMilitaryCareerBattle(arrived);
  assert.equal(battle.id, arrived.player.militaryCareer.activeMission.battleId);
  assert.ok(battle.units.some((unit) => unit.tags.includes(`MEMBER_ID:${arrived.player.id}`)));
  assert.ok(battle.units.some((unit) => unit.tags.includes("MEMBER_ID:ally")));
  assert.equal(battle.units.some((unit) => unit.tags.includes("MEMBER_ID:reserve")), false);
});

test("actual casualties persist and promotion is awarded only after returning to report", () => {
  let state = prepareMilitaryCareerMission(startMilitaryCareerMission(retainerState()), {
    approachId: "scout", logisticsId: "standard", companionIds: ["ally"],
  });
  const mission = state.player.militaryCareer.activeMission;
  state = moveGeneratedExpeditionToRegion(state, mission.targetRegion.id, { mode: "route", encounterRoll: 1 });
  const battle = createMilitaryCareerBattle(state);
  const battleResult = {
    battleId: battle.id,
    winner: "player",
    player: { casualties: 1, hpLoss: 47, members: [
      { id: "player-unit", tags: ["PLAYER_CHARACTER", `MEMBER_ID:${state.player.id}`], maxHp: 100, remainingHp: 63, state: "STABLE" },
      { id: "ally-unit", tags: ["PARTY_MEMBER", "MEMBER_ID:ally"], maxHp: 48, remainingHp: 1, state: "ROUTED" },
    ] },
    enemy: { casualties: 7, hpLoss: 100, members: [] },
  };
  const resolved = resolveMilitaryCareerBattle(state, battleResult);

  assert.equal(resolved.player.stage, "retainer");
  assert.equal(resolved.player.villageLife.hp, 63);
  assert.equal(resolved.player.villageLife.party[0].hp, 1);
  assert.equal(resolved.player.militaryCareer.activeMission.stage, "return_required");
  assert.throws(() => reportMilitaryCareerMission(resolved), /受命地点へ帰還/);

  const returned = moveGeneratedExpeditionToRegion(resolved, mission.originRegion.id, { mode: "route", encounterRoll: 1 });
  const reported = reportMilitaryCareerMission(returned);
  assert.equal(reported.player.stage, "commander");
  assert.equal(reported.player.progress.orders, 1);
  assert.equal(reported.player.militaryCareer.activeMission, null);
  assert.equal(reported.player.militaryCareer.history[0].outcome, "victory");
  assert.ok(reported.player.militaryCareer.history[0].evaluation.score < 100);
});

test("defeat and deadline expiry continue the save with trust loss instead of granting promotion", () => {
  let state = prepareMilitaryCareerMission(startMilitaryCareerMission(retainerState("military-defeat")), {
    approachId: "rapid", logisticsId: "lean", companionIds: [],
  });
  const mission = state.player.militaryCareer.activeMission;
  state = moveGeneratedExpeditionToRegion(state, mission.targetRegion.id, { mode: "route", encounterRoll: 1 });
  const lost = resolveMilitaryCareerBattle(state, {
    battleId: mission.battleId,
    winner: "enemy",
    player: { casualties: 4, hpLoss: 80, members: [] },
    enemy: { casualties: 1, hpLoss: 10, members: [] },
  });
  const returned = moveGeneratedExpeditionToRegion(lost, mission.originRegion.id, { mode: "route", encounterRoll: 1 });
  const beforeTrust = returned.player.metrics.liegeTrust;
  const reported = reportMilitaryCareerMission(returned);
  assert.equal(reported.player.stage, "retainer");
  assert.equal(reported.player.metrics.liegeTrust, beforeTrust - 12);
  assert.equal(reported.player.militaryCareer.history[0].outcome, "defeat");

  let expired = startMilitaryCareerMission(retainerState("military-expiry"));
  expired = advanceCareerMonth(expired);
  expired = advanceCareerMonth(expired);
  expired = advanceCareerMonth(expired);
  assert.equal(expired.player.militaryCareer.activeMission.stage, "return_required");
  assert.equal(expired.player.militaryCareer.activeMission.outcome, "deadline_missed");
});

test("normal career UI replaces instant promotion buttons with the complete mission lifecycle", () => {
  const appSource = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const careerRenderer = appSource.slice(appSource.indexOf("function renderMilitaryCareerMission"), appSource.indexOf("function roleDelegationSection"));
  assert.match(careerRenderer, /data-military-mission-action="start"/);
  assert.match(careerRenderer, /data-military-approach/);
  assert.match(careerRenderer, /data-military-logistics/);
  assert.match(careerRenderer, /data-military-companion/);
  assert.match(careerRenderer, /data-military-mission-action="battle"/);
  assert.match(careerRenderer, /data-military-mission-action="report"/);
  assert.doesNotMatch(careerRenderer, /data-career-action="fulfill_order"/);
  assert.doesNotMatch(careerRenderer, /data-career-action="command_campaign"/);
  assert.match(appSource, /view\.characterDetailOpen = false;\s*view\.tacticalOrigin = \{ type: "military-career"/);
  assert.match(appSource, /view\.characterDetailOpen = Boolean\(battleResult\)/);
  assert.match(appSource, /view\.characterDetailOpen = false;\s*view\.ledgerDrawerOpen = false;\s*view\.panel = "world"/);
  assert.match(appSource, /resolveMilitaryCareerBattle\(state, battleResult\)/);
  assert.match(appSource, /view\.tacticalOrigin\?\.type === "military-career"[\s\S]*?"軍務達成"[\s\S]*?"軍務敗北"/);
});
