import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceCompanionQuests,
  completeCompanionQuest,
  getCompanionQuestView,
  normalizeCompanionQuestState,
  respondToCompanionQuest,
} from "../src/companion-quest-system.js";
import { createCareerInitialState } from "../src/simulation.js";

function withCompanion(seed = "companion-quest") {
  const state = createCareerInitialState({ seed });
  state.player.villageLife.party = [{ id: "mira", name: "ミラ", role: "斥候", active: true, alive: true, hp: 28, maxHp: 30 }];
  state.adventure ??= {};
  state.adventure.party = structuredClone(state.player.villageLife.party);
  normalizeCompanionQuestState(state);
  return state;
}

test("companions offer travel delivery and battle quests backed by real state", () => {
  const state = withCompanion();
  const view = getCompanionQuestView(state);
  assert.equal(view.companions.length, 1);
  assert.deepEqual(view.companions[0].offers.map((entry) => entry.kind), ["journey", "delivery", "battle"]);
  assert.ok(view.companions[0].offers.every((entry) => entry.targetRegionId));
  assert.ok(view.companions[0].offers.every((entry) => entry.deadlineMinutes > state.generatedWorld.expeditionClockMinutes));
});

test("hold and refusal are explicit and refusal changes the actual relationship", () => {
  let state = withCompanion("companion-response");
  const offer = getCompanionQuestView(state).companions[0].offers[0];
  const held = respondToCompanionQuest(state, "mira", offer.id, "hold");
  assert.equal(held.player.lifeToRealm.companions.mira.personalQuest.status, "held");
  assert.equal(state.player.lifeToRealm.companions.mira.personalQuest, undefined);
  const before = held.player.lifeToRealm.companions.mira.loyalty;
  const refused = respondToCompanionQuest(held, "mira", offer.id, "refuse");
  assert.ok(refused.player.lifeToRealm.companions.mira.loyalty < before);
  assert.equal(refused.player.companionQuests.history[0].outcome, "refused");
});

test("an accepted journey requires the real destination and improves leadership aptitude", () => {
  let state = withCompanion("companion-journey");
  const offer = getCompanionQuestView(state).companions[0].offers.find((entry) => entry.kind === "journey");
  state = respondToCompanionQuest(state, "mira", offer.id, "accept");
  const frozen = structuredClone(state);
  assert.throws(() => completeCompanionQuest(state, "mira"), /目的地方/);
  assert.deepEqual(state, frozen);
  state.generatedWorld.expeditionRegionId = offer.targetRegionId;
  state = completeCompanionQuest(state, "mira");
  assert.equal(state.player.companionQuests.history[0].outcome, "completed");
  assert.ok(state.player.lifeToRealm.companions.mira.leadershipAptitude > 0);
  assert.ok(state.player.lifeToRealm.companions.mira.loyalty > frozen.player.lifeToRealm.companions.mira.loyalty);
});

test("delivery consumes real cargo and battle completion requires a recorded result", () => {
  let delivery = withCompanion("companion-delivery");
  const offer = getCompanionQuestView(delivery).companions[0].offers.find((entry) => entry.kind === "delivery");
  delivery = respondToCompanionQuest(delivery, "mira", offer.id, "accept");
  delivery.generatedWorld.expeditionRegionId = offer.targetRegionId;
  assert.throws(() => completeCompanionQuest(delivery, "mira"), /積荷/);
  delivery.player.merchantTrade.cargo.push({ commodityId: offer.commodityId, name: "依頼品", quantity: offer.quantity, averageCost: 1 });
  delivery = completeCompanionQuest(delivery, "mira");
  assert.equal(delivery.player.merchantTrade.cargo.find((entry) => entry.commodityId === offer.commodityId), undefined);

  let battle = withCompanion("companion-battle");
  battle.player.militaryCareer.history.push({ id: "old-battle-proof", outcome: "victory", completedTurn: battle.turn });
  const battleOffer = getCompanionQuestView(battle).companions[0].offers.find((entry) => entry.kind === "battle");
  battle = respondToCompanionQuest(battle, "mira", battleOffer.id, "accept");
  assert.throws(() => completeCompanionQuest(battle, "mira"), /戦闘記録/);
  assert.throws(() => completeCompanionQuest(battle, "mira", { battleId: "old-battle-proof" }), /戦闘記録/);
  battle.player.militaryCareer.history.push({ id: "battle-proof", outcome: "victory", completedTurn: battle.turn });
  assert.equal(getCompanionQuestView(battle).companions[0].eligibleBattleId, "battle-proof");
  battle = completeCompanionQuest(battle, "mira");
  assert.equal(battle.player.companionQuests.history[0].evidenceId, "battle-proof");
  assert.match(battle.player.history[0].detail, /信頼/);
});

test("expired quests preserve failure and can drive fear and departure without ending the run", () => {
  let state = withCompanion("companion-expiry");
  const offer = getCompanionQuestView(state).companions[0].offers[0];
  state = respondToCompanionQuest(state, "mira", offer.id, "accept");
  state.generatedWorld.expeditionClockMinutes = offer.deadlineMinutes + 1;
  assert.throws(() => completeCompanionQuest(state, "mira"), /期限/);
  state = advanceCompanionQuests(state);
  assert.equal(state.player.companionQuests.history[0].outcome, "expired");
  assert.ok(state.player.lifeToRealm.companions.mira.fear > 10);
  assert.equal(state.player.crime.runEnded, false);
  assert.match(state.player.history[0].detail, /忠誠/);
});
