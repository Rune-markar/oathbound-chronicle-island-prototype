import test from "node:test";
import assert from "node:assert/strict";
import {
  getRobberyOpportunities,
  previewRobbery,
  startRobbery,
  resolveRobberyThreat,
  resolveRobberyBattle,
} from "../src/robbery-system.js";
import {
  getGeneratedExpeditionReachableRegions,
  getGeneratedTravelCrimeContext,
  moveGeneratedExpeditionToRegion,
} from "../src/generated-world-system.js";
import { createCareerInitialState } from "../src/simulation.js";

const baseState = () => ({
  turn: 8,
  player: {
    id: "pc", name: "旅人", metrics: { wealth: 4 }, crime: {},
    villageLife: {
      hp: 80, maxHp: 100, injuries: [],
      party: [
        { id: "ally", name: "同行者", role: "斥候", level: 2, hp: 44, maxHp: 54, active: true, alive: true, battleState: "READY" },
        { id: "unselected", name: "非参加者", role: "前衛", level: 2, hp: 54, maxHp: 54, active: true, alive: true, battleState: "READY" },
        { id: "waiting", name: "待機者", role: "前衛", level: 2, hp: 54, maxHp: 54, active: false, alive: true, battleState: "READY" },
      ],
    },
  },
  adventure: { party: [{ id: "ally", name: "同行者", hp: 44, maxHp: 54, active: true, alive: true, battleState: "READY" }] },
  generatedWorld: { seed: "road-seed" },
});
const context = {
  origin: { id: "region-a", name: "灰野", nationId: "nation-a" },
  destination: { id: "region-b", name: "白峰", nationId: "nation-b" },
  travel: { mode: "route", pathRegionIds: ["region-b"], travelMinutes: 360 },
};

test("road context produces stable concrete caravan targets and qualitative previews", () => {
  const first = getRobberyOpportunities(baseState(), context);
  const second = getRobberyOpportunities(baseState(), context);
  assert.deepEqual(first, second);
  assert.match(first[0].id, /^robbery:region-a:region-b:/);
  assert.equal(first[0].target.kind, "caravan");
  const preview = previewRobbery(baseState(), first[0]);
  assert.ok(["低", "中", "高", "極高"].includes(preview.riskLabel));
  assert.equal(JSON.stringify(preview).includes("percent"), false);
});

test("generated-world travel records adapt into the same road crime context", () => {
  const state = createCareerInitialState({ seed: "robbery-generated-route" });
  const destination = getGeneratedExpeditionReachableRegions(state)[0];
  const moved = moveGeneratedExpeditionToRegion(state, destination.regionId, { mode: "route", encounterRoll: 1 });
  const adapted = getGeneratedTravelCrimeContext(moved);
  assert.equal(adapted.origin.id, moved.generatedWorld.lastTravel.fromRegionId);
  assert.equal(adapted.destination.id, moved.generatedWorld.lastTravel.destinationRegionId);
  assert.equal(adapted.crossesJurisdiction, true);
  assert.deepEqual(getRobberyOpportunities(moved, adapted), getRobberyOpportunities(moved, adapted));
});

test("intimidation can yield without battle or hand resistance to a tactical battle", () => {
  const state = baseState();
  const opportunity = getRobberyOpportunities(state, context)[0];
  const begun = startRobbery(state, opportunity, { accomplices: [{ id: "ally" }] });
  assert.equal(state.player.crime.activeRobbery, undefined);
  assert.equal(begun.player.crime.activeRobbery.stage, "threat");

  const yielded = resolveRobberyThreat(begun, { outcome: "yield" });
  assert.equal(yielded.result.battle, null);
  assert.equal(yielded.result.outcome, "success_hidden");
  assert.equal(yielded.state.player.metrics.wealth, 4 + opportunity.loot.wealth);

  const resisted = resolveRobberyThreat(begun, { outcome: "resist" });
  assert.equal(resisted.state.player.crime.activeRobbery.stage, "battle");
  assert.equal(resisted.result.battle.combatScale, "personal-units");
  assert.equal(resisted.result.battle.id, resisted.state.player.crime.activeRobbery.battleId);
  const playerUnits = resisted.result.battle.units.filter((unit) => unit.side === "player");
  assert.equal(playerUnits.length, 2);
  assert.ok(playerUnits.some((unit) => unit.tags.includes("PLAYER_CHARACTER") && unit.tags.includes("MEMBER_ID:pc") && unit.hp === 80));
  assert.ok(playerUnits.some((unit) => unit.tags.includes("PARTY_MEMBER") && unit.tags.includes("MEMBER_ID:ally") && unit.hp === 44));
  assert.equal(playerUnits.some((unit) => unit.tags.includes("MEMBER_ID:unselected")), false);
  assert.equal(playerUnits.some((unit) => unit.tags.includes("MEMBER_ID:waiting")), false);
});

test("battle resolution persists casualties, rewards only victory, and adds exactly 35 detected heat", () => {
  const state = baseState();
  const opportunity = getRobberyOpportunities(state, context)[0];
  const begun = startRobbery(state, opportunity);
  const resisted = resolveRobberyThreat(begun, { outcome: "resist" });
  const before = structuredClone(resisted.state);
  const result = {
    battleId: resisted.result.battle.id,
    winner: "player",
    player: { casualties: 1, members: [
      { id: "unit-pc", name: "旅人", tags: ["PERSONAL_COMBATANT", "PLAYER_CHARACTER", "MEMBER_ID:pc"], maxHp: 100, remainingHp: 63, state: "STABLE" },
      { id: "unit-ally", name: "同行者", tags: ["PERSONAL_COMBATANT", "PARTY_MEMBER", "PARTY_ID:ally", "MEMBER_ID:ally"], maxHp: 54, remainingHp: 0, state: "DESTROYED" },
    ] },
    enemy: { casualties: 2, members: [{ id: "guard", remainingHp: 0, state: "DESTROYED" }] },
  };
  const resolved = resolveRobberyBattle(resisted.state, result, { detected: true });
  assert.deepEqual(resisted.state, before);
  assert.equal(resolved.state.player.metrics.wealth, 4 + opportunity.loot.wealth);
  assert.equal(resolved.state.player.crime.heatByJurisdiction["region-b"], 35);
  assert.deepEqual(resolved.state.player.crime.robberyResults[0].casualties, { player: 1, target: 2 });
  assert.equal(resolved.state.player.crime.activeRobbery, null);
  assert.equal(resolved.state.player.villageLife.hp, 63);
  assert.match(resolved.state.player.villageLife.injuries[0], /戦闘負傷/);
  assert.deepEqual(
    { hp: resolved.state.player.villageLife.party[0].hp, alive: resolved.state.player.villageLife.party[0].alive, active: resolved.state.player.villageLife.party[0].active, battleState: resolved.state.player.villageLife.party[0].battleState },
    { hp: 0, alive: false, active: false, battleState: "DESTROYED" },
  );
  assert.deepEqual(
    { hp: resolved.state.adventure.party[0].hp, alive: resolved.state.adventure.party[0].alive, active: resolved.state.adventure.party[0].active, battleState: resolved.state.adventure.party[0].battleState },
    { hp: 0, alive: false, active: false, battleState: "DESTROYED" },
  );

  const lost = resolveRobberyBattle(resisted.state, { ...result, winner: "enemy" }, { detected: false });
  assert.equal(lost.state.player.metrics.wealth, 4);
  assert.equal(lost.result.outcome, "failed_escaped");
});
