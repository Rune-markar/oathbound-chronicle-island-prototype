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
  player: { id: "pc", name: "旅人", metrics: { wealth: 4 }, crime: {} },
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
    player: { casualties: 1, members: [{ id: "pc", remainingHp: 63, state: "STABLE" }] },
    enemy: { casualties: 2, members: [{ id: "guard", remainingHp: 0, state: "DESTROYED" }] },
  };
  const resolved = resolveRobberyBattle(resisted.state, result, { detected: true });
  assert.deepEqual(resisted.state, before);
  assert.equal(resolved.state.player.metrics.wealth, 4 + opportunity.loot.wealth);
  assert.equal(resolved.state.player.crime.heatByJurisdiction["region-b"], 35);
  assert.deepEqual(resolved.state.player.crime.robberyResults[0].casualties, { player: 1, target: 2 });
  assert.equal(resolved.state.player.crime.activeRobbery, null);

  const lost = resolveRobberyBattle(resisted.state, { ...result, winner: "enemy" }, { detected: false });
  assert.equal(lost.state.player.metrics.wealth, 4);
  assert.equal(lost.result.outcome, "failed_escaped");
});
