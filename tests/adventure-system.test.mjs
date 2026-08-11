import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptGuildContract,
  acceptPartyInvitation,
  advanceDungeonRun,
  closeDungeonRun,
  completeGuildContractObjective,
  createDungeonTacticalBattle,
  explorePersonalMap,
  getDungeonTacticalRoster,
  getDungeonBattlePreview,
  getGuildContracts,
  getPersonalMapView,
  getRegionAdventureSites,
  getTavernCandidates,
  interactWithNpcCandidate,
  inviteTavernCandidate,
  movePersonalMap,
  normalizeAdventureState,
  returnToVillageForRecovery,
  revealRegionDungeon,
  resolveDungeonTacticalBattle,
  skipDungeonBattle,
  startDungeonRun,
} from "../src/adventure-system.js";
import { createBattlePreparation, finalizeBattlePreparation } from "../src/battle-preparation.js";
import { autoResolveBattle, executeBattleTurn, getLogisticsState } from "../src/tactical-battle.js";
import { createBattleResult } from "../src/battle-results.js";
import { getGeneratedWorldTimeView, getGeneratedWorldView } from "../src/generated-world-system.js";
import { createCareerInitialState, performVillageAction } from "../src/simulation.js";

function fixture(seed = "adventure-system-test") {
  const state = normalizeAdventureState(createCareerInitialState({ seed }));
  const world = getGeneratedWorldView(state);
  const context = { region: world.expeditionRegion, nation: world.playerNation, runtime: world.runtime };
  const sites = getRegionAdventureSites(state, context);
  return { state, world, context, sites };
}

function prepareRecruitableCandidate(state, candidateId, context) {
  let next = interactWithNpcCandidate(state, candidateId, "gentle", context, { roll: 0 });
  next = interactWithNpcCandidate(next, candidateId, "small_talk", context, { roll: 0 });
  next.adventure.npcRelations[candidateId].affinity = 60;
  next.adventure.npcRelations[candidateId].recruitmentPolicyId = "friendship";
  return interactWithNpcCandidate(next, candidateId, "discuss_work", context);
}

test("each generated region exposes a village and a terrain-aware dungeon", () => {
  const { state, context, sites } = fixture();
  assert.equal(sites.village.type, "village");
  assert.equal(sites.dungeon.type, "dungeon");
  assert.ok(["cave", "forest", "spring"].includes(sites.dungeon.dungeonType));
  assert.equal(sites.village.tile.regionId, context.region.id);
  assert.equal(sites.dungeon.tile.regionId, context.region.id);
  assert.deepEqual(getRegionAdventureSites(state, context), sites, "sites must remain deterministic for a saved world");
});

test("guild contracts are accepted and completed by the matching dungeon clear", () => {
  const { state, context, sites } = fixture("guild-contract-test");
  const contract = getGuildContracts(state, context)[0];
  let next = acceptGuildContract(state, contract.id, context);
  assert.equal(next.adventure.activeContracts.length, 1);
  assert.equal(getPersonalMapView(next, context).locations.find((location) => location.id === sites.dungeon.id).discovered, true);
  assert.throws(() => startDungeonRun(next, sites.dungeon, context.region), /酒場/);
  const companion = getTavernCandidates(next, context).find((candidate) => !candidate.unique);
  next = prepareRecruitableCandidate(next, companion.id, context);
  next = inviteTavernCandidate(next, companion.id, context);
  next = startDungeonRun(next, sites.dungeon, context.region);
  next = advanceDungeonRun(next);
  next = advanceDungeonRun(next);
  next = skipDungeonBattle(next);
  next = advanceDungeonRun(next);
  assert.equal(next.adventure.activeRun.phase, "complete");
  assert.equal(next.adventure.activeContracts.length, 0);
  assert.equal(next.adventure.completedContracts[0].id, contract.id);
  assert.equal(next.player.metrics.wealth, state.player.metrics.wealth);
  next = performVillageAction(next, { id: sites.village.id, name: sites.village.name }, "report_request");
  assert.equal(next.player.villageLife.guildMerit, contract.merit);
  assert.ok(next.player.invitations.some((invitation) => invitation.routeId === "chance_rescue"));
  next = performVillageAction(next, { id: sites.village.id, name: sites.village.name }, "receive_reward");
  assert.equal(next.player.metrics.wealth, state.player.metrics.wealth + contract.reward.wealth);
});

test("guild dungeon guidance reveals the region dungeon and uses its canonical name", () => {
  const { state, context, sites } = fixture("guild-dungeon-guidance-test");
  const village = { id: sites.village.id, name: sites.village.name };
  let next = performVillageAction(state, village, "check_dungeon");
  next = revealRegionDungeon(next, context);
  const dungeonLocation = getPersonalMapView(next, context).locations.find((location) => location.id === sites.dungeon.id);
  assert.equal(dungeonLocation.discovered, true);
  assert.match(next.player.villageLife.lastAction.message, new RegExp(sites.dungeon.name));
  assert.match(next.player.villageLife.actionHistory[0].message, new RegExp(sites.dungeon.name));
});

test("subjugation guidance describes variable unit counts instead of a fixed duel", () => {
  const { state, context } = fixture("subjugation-guidance-test");
  const contract = getGuildContracts(state, context).find((entry) => entry.objective.type === "defeat_enemy");
  assert.doesNotMatch(contract.detail, /一対一/);
  assert.match(contract.detail, /各人物・各敵を1ユニット/);
  assert.match(contract.detail, /ユニット数.*変化/);
});

test("loot is acquired automatically before and after a skippable battle", () => {
  const { state, context, sites } = fixture("automatic-loot-test");
  let next = startDungeonRun(state, sites.dungeon, context.region);
  next = advanceDungeonRun(next);
  assert.equal(next.adventure.inventory.length, 1);
  assert.equal(next.adventure.activeRun.phase, "exploring");
  next = advanceDungeonRun(next);
  assert.equal(next.adventure.activeRun.phase, "battle");
  next = skipDungeonBattle(next);
  assert.equal(next.adventure.activeRun.phase, "exploring");
  assert.equal(next.adventure.activeRun.skippedBattles, 1);
  assert.equal(next.adventure.inventory.length, 2, "battle trophy is automatically collected");
  next = advanceDungeonRun(next);
  assert.equal(next.adventure.activeRun.phase, "complete");
  assert.equal(next.adventure.inventory.length, 3);
  assert.equal(closeDungeonRun(next).adventure.activeRun, null);
});

test("dungeon encounters use the shared tactical engine with one unit per participant", () => {
  const { state, context, sites } = fixture("manual-battle-test");
  let next = advanceDungeonRun(startDungeonRun(state, sites.dungeon, context.region));
  next = advanceDungeonRun(next);
  const roster = getDungeonTacticalRoster(next);
  const tactical = createDungeonTacticalBattle(next);
  assert.equal(tactical.turn, 0);
  assert.equal(tactical.id, next.adventure.activeRun.combat.tacticalBattleId);
  assert.equal(tactical.map.width, 14);
  assert.equal(tactical.combatScale, "personal-units");
  assert.equal(tactical.units.filter((unit) => unit.side === "player").length, roster.length);
  assert.ok(tactical.units.filter((unit) => unit.side === "enemy").length >= 1);
  assert.ok(tactical.units.every((unit) => unit.soldierCount === 1));
  assert.equal(executeBattleTurn(tactical).turn, 1, "the shared tactical engine advances the dungeon battle");
  next = resolveDungeonTacticalBattle(next, {
    battleId: tactical.id,
    winner: "player",
    turn: 4,
    player: { initialSoldiers: 134, casualties: 18 },
    enemy: { initialSoldiers: 148, casualties: 148 },
  });
  assert.equal(next.adventure.activeRun.phase, "exploring");
  assert.equal(next.adventure.activeRun.combat.outcome, "victory");
  assert.equal(next.adventure.inventory.length, 2, "the tactical victory trophy is automatically collected");
});

test("purchased intelligence previews both unit groups before choosing how to fight", () => {
  const { state, context, sites } = fixture("battle-preview-test");
  const candidate = getTavernCandidates(state, context).find((entry) => !entry.unique);
  let next = prepareRecruitableCandidate(state, candidate.id, context);
  next = inviteTavernCandidate(next, candidate.id, context);
  next.player.villageLife.discoveredDungeons.push(sites.dungeon.name);
  next = advanceDungeonRun(startDungeonRun(next, sites.dungeon, context.region));
  next = advanceDungeonRun(next);
  const preview = getDungeonBattlePreview(next);
  assert.equal(preview.playerUnits.length, 2);
  assert.ok(preview.enemyUnits.length >= 1);
  assert.ok(preview.playerUnits.every((unit) => unit.role && unit.maxHp > 0));
  assert.ok(preview.expectedWinRate >= 10 && preview.expectedWinRate <= 90);
  assert.equal(preview.informationKnown, true);
  assert.equal(preview.canRetreat, true);
});

test("personal battle losses persist per companion and recovery returns by known roads", () => {
  const { state, context, sites } = fixture("personal-loss-recovery-test");
  const candidate = getTavernCandidates(state, context).find((entry) => !entry.unique);
  let next = prepareRecruitableCandidate(state, candidate.id, context);
  next = inviteTavernCandidate(next, candidate.id, context);
  next = advanceDungeonRun(startDungeonRun(next, sites.dungeon, context.region));
  next = advanceDungeonRun(next);
  const tactical = createDungeonTacticalBattle(next);
  const companion = next.player.villageLife.party[0];
  next = resolveDungeonTacticalBattle(next, {
    battleId: tactical.id,
    winner: "enemy",
    turn: 5,
    autoResolved: true,
    player: {
      initialSoldiers: 2,
      casualties: 1,
      members: [
        { id: "player", name: next.player.name, tags: ["PLAYER_CHARACTER"], maxHp: 100, remainingHp: 16, state: "ESCAPED" },
        { id: "companion", name: companion.name, tags: ["PARTY_MEMBER", `PARTY_ID:${companion.id}`], maxHp: companion.maxHp, remainingHp: 0, state: "DESTROYED" },
      ],
    },
    enemy: { initialSoldiers: 2, casualties: 0, members: [] },
  });
  assert.equal(next.player.villageLife.hp, 16);
  assert.match(next.player.villageLife.injuries[0], /戦闘負傷/);
  assert.equal(next.player.villageLife.party[0].alive, false);
  assert.equal(next.player.villageLife.party[0].active, false);
  const returned = returnToVillageForRecovery(next, context);
  assert.equal(returned.adventure.activeRun, null);
  assert.equal(getPersonalMapView(returned, context).currentLocation.type, "village");
  assert.match(getPersonalMapView(returned, context).lastResult.message, /神殿・治療所/);
});

test("low HP blocks exploration and dungeon departure in shared APIs", () => {
  const { state, context, sites } = fixture("low-hp-boundary-test");
  state.player.villageLife.hp = 20;
  assert.throws(() => explorePersonalMap(state, context), /HPが35未満/);
  assert.throws(() => startDungeonRun(state, sites.dungeon, context.region), /HPが35未満/);
});

test("legacy fabricated dungeon guidance is rewritten to the canonical discovered dungeon", () => {
  const { state, sites } = fixture("guidance-history-migration-test");
  state.player.villageLife.discoveredDungeons = ["旧村近郊・石扉遺跡", sites.dungeon.name];
  state.player.villageLife.actionHistory = [{ actionId: "check_dungeon", message: "旧村近郊・石扉遺跡の位置と危険情報を確認した。" }];
  state.player.history = [{ title: "旧村・ダンジョン情報確認", detail: "旧村近郊・石扉遺跡の位置と危険情報を確認した。" }];
  const next = normalizeAdventureState(state);
  assert.deepEqual(next.player.villageLife.discoveredDungeons, [sites.dungeon.name]);
  assert.match(next.player.villageLife.actionHistory[0].message, new RegExp(sites.dungeon.name));
  assert.doesNotMatch(next.player.history[0].detail, /石扉遺跡/);
});

test("legacy dungeon encounters are normalized for the tactical battle handoff", () => {
  const { state, context, sites } = fixture("legacy-dungeon-battle-test");
  let next = advanceDungeonRun(startDungeonRun(state, sites.dungeon, context.region));
  next = advanceDungeonRun(next);
  delete next.adventure.activeRun.combat.tacticalBattleId;
  next = normalizeAdventureState(next);
  assert.equal(next.adventure.activeRun.combat.tacticalBattleId, `dungeon-battle:${next.adventure.activeRun.id}`);
  assert.equal(createDungeonTacticalBattle(next).id, next.adventure.activeRun.combat.tacticalBattleId);
});

test("the greeting choices appear once and switch to purposeful conversation actions", () => {
  const { state, context } = fixture("tavern-conversation-stages");
  const candidate = getTavernCandidates(state, context).find((entry) => !entry.unique);
  assert.deepEqual(candidate.social.availableActions.map((entry) => entry.id).sort(), ["friendly", "gentle", "imposing"]);
  assert.throws(() => inviteTavernCandidate(state, candidate.id, context), /初対面/);
  const next = interactWithNpcCandidate(state, candidate.id, "gentle", context, { firstImpressionRoll: 1 });
  const social = getTavernCandidates(next, context).find((entry) => entry.id === candidate.id).social;
  assert.equal(social.firstMeetingComplete, true);
  assert.ok(social.personality);
  assert.ok(social.availableActions.some((entry) => entry.id === "small_talk"));
  assert.ok(social.availableActions.every((entry) => !["gentle", "friendly", "imposing"].includes(entry.id)));
  assert.throws(() => interactWithNpcCandidate(next, candidate.id, "gentle", context), /挨拶はすでに/);
});

test("a poor first impression can be repaired and personalities answer the same approach differently", () => {
  const { state, context } = fixture("tavern-recovery-and-personality");
  const candidates = getTavernCandidates(state, context).filter((entry) => !entry.unique);
  const first = interactWithNpcCandidate(state, candidates[0].id, "imposing", context, { firstImpressionRoll: 1 });
  const before = first.adventure.npcRelations[candidates[0].id].affinity;
  const recovered = interactWithNpcCandidate(first, candidates[0].id, "small_talk", context, { roll: 0 });
  assert.ok(recovered.adventure.npcRelations[candidates[0].id].affinity > before);
  const other = interactWithNpcCandidate(state, candidates.find((candidate) => candidate.id !== candidates[0].id).id, "imposing", context, { firstImpressionRoll: 1 });
  assert.notEqual(first.adventure.npcRelations[candidates[0].id].lastResult.reaction, other.adventure.npcRelations[Object.keys(other.adventure.npcRelations)[0]].lastResult.reaction);
});

test("history and ability knowledge is revealed in stages instead of exposing exact scores immediately", () => {
  const { state, context } = fixture("tavern-progressive-knowledge");
  const candidate = getTavernCandidates(state, context).find((entry) => !entry.unique);
  let next = interactWithNpcCandidate(state, candidate.id, "gentle", context, { roll: 0 });
  next = interactWithNpcCandidate(next, candidate.id, "ask_skills", context, { insightRoll: 0 });
  let social = getTavernCandidates(next, context).find((entry) => entry.id === candidate.id).social;
  assert.ok(social.abilityInsights.some((entry) => /よう|らしい|慣れている/.test(entry)));
  assert.equal(social.specialtyKnown, false);
  assert.deepEqual(social.knownAbilities, {});
  next = interactWithNpcCandidate(next, candidate.id, "ask_skills", context, { insightRoll: 0 });
  social = getTavernCandidates(next, context).find((entry) => entry.id === candidate.id).social;
  assert.equal(social.specialtyKnown, true);
  next.adventure.npcRelations[candidate.id].affinity = 30;
  next = interactWithNpcCandidate(next, candidate.id, "ask_history", context);
  assert.equal(getTavernCandidates(next, context).find((entry) => entry.id === candidate.id).social.history.length, 1);
});

test("repeating the same topic has diminishing returns and eventually strains the relationship", () => {
  const { state, context } = fixture("tavern-topic-repeat");
  const candidate = getTavernCandidates(state, context).find((entry) => !entry.unique);
  let next = interactWithNpcCandidate(state, candidate.id, "gentle", context, { roll: 0 });
  next = interactWithNpcCandidate(next, candidate.id, "small_talk", context, { roll: 0 });
  const firstAffinity = next.adventure.npcRelations[candidate.id].affinity;
  next = interactWithNpcCandidate(next, candidate.id, "small_talk", context, { roll: 0 });
  const secondAffinity = next.adventure.npcRelations[candidate.id].affinity;
  next = interactWithNpcCandidate(next, candidate.id, "small_talk", context, { roll: 0 });
  assert.equal(secondAffinity - firstAffinity, 1);
  assert.ok(next.adventure.npcRelations[candidate.id].affinity < secondAffinity);
  assert.match(next.adventure.npcRelations[candidate.id].lastResult.reaction, /もう|同じ話/);
});

test("buying a drink spends existing wealth once and insufficient funds block the action", () => {
  const rich = fixture("tavern-drink-payment");
  const candidateId = getTavernCandidates(rich.state, rich.context).find((entry) => !entry.unique).id;
  rich.state.player.metrics.wealth = 2;
  let next = interactWithNpcCandidate(rich.state, candidateId, "gentle", rich.context, { roll: 0 });
  const beforeAffinity = next.adventure.npcRelations[candidateId].affinity;
  next = interactWithNpcCandidate(next, candidateId, "buy_drink", rich.context);
  assert.equal(next.player.metrics.wealth, 1);
  assert.ok(next.adventure.npcRelations[candidateId].affinity > beforeAffinity);
  const poor = fixture("tavern-drink-payment");
  poor.state.player.metrics.wealth = 0;
  const greeted = interactWithNpcCandidate(poor.state, candidateId, "gentle", poor.context, { roll: 0 });
  assert.throws(() => interactWithNpcCandidate(greeted, candidateId, "buy_drink", poor.context), /財産1/);
});

test("recruitment policies enforce friendship, contract, evaluation, and purpose conditions", () => {
  const { state, context } = fixture("policy-test");
  const prepared = new Map();
  for (const candidate of getTavernCandidates(state, context).filter((entry) => !entry.unique)) {
    let next = interactWithNpcCandidate(state, candidate.id, "gentle", context, { roll: 0 });
    next = interactWithNpcCandidate(next, candidate.id, "small_talk", context, { roll: 0 });
    next.adventure.npcRelations[candidate.id].affinity = 50;
    next = interactWithNpcCandidate(next, candidate.id, "discuss_work", context);
    const social = getTavernCandidates(next, context).find((entry) => entry.id === candidate.id).social;
    prepared.set(social.recruitment.id, { state: next, candidate, social });
  }
  assert.deepEqual([...prepared.keys()].sort(), ["evaluation", "friendship", "mercenary", "purpose"]);

  const friendship = prepared.get("friendship");
  const befriended = interactWithNpcCandidate(friendship.state, friendship.candidate.id, "invite", context);
  assert.ok(befriended.adventure.party.some((entry) => entry.id === friendship.candidate.id));
  assert.ok(befriended.player.villageLife.party.some((entry) => entry.id === friendship.candidate.id));

  const mercenary = prepared.get("mercenary");
  assert.equal(mercenary.social.availableActions.find((entry) => entry.id === "invite").cost, mercenary.social.recruitment.cost);
  mercenary.state.player.metrics.wealth = 0;
  const refused = interactWithNpcCandidate(mercenary.state, mercenary.candidate.id, "invite", context);
  assert.equal(refused.adventure.party.length, 0);
  assert.match(refused.adventure.npcRelations[mercenary.candidate.id].lastResult.reaction, new RegExp(`財産${mercenary.social.recruitment.cost}`));
  const payable = structuredClone(mercenary.state);
  payable.player.metrics.wealth = mercenary.social.recruitment.cost + 5;
  const contracted = interactWithNpcCandidate(payable, mercenary.candidate.id, "invite", context);
  assert.equal(contracted.player.metrics.wealth, 5);
  assert.throws(() => interactWithNpcCandidate(contracted, mercenary.candidate.id, "invite", context), /会話できません/);
  assert.equal(contracted.player.metrics.wealth, 5, "the contract fee is paid exactly once");

  const evaluation = prepared.get("evaluation");
  evaluation.state.player.metrics.renown = 0;
  evaluation.state.player.metrics.martialMerit = 0;
  assert.equal(interactWithNpcCandidate(evaluation.state, evaluation.candidate.id, "invite", context).adventure.party.length, 0);
  const purpose = prepared.get("purpose");
  purpose.state.player.progress.contracts = 0;
  assert.equal(interactWithNpcCandidate(purpose.state, purpose.candidate.id, "invite", context).adventure.party.length, 0);
});

test("a locally known player can receive an invitation while eating and chooses whether to accept it", () => {
  const { state, context, sites } = fixture("tavern-incoming-test");
  const dining = performVillageAction(state, { id: sites.village.id, name: sites.village.name }, "eat_meal");
  assert.equal(dining.player.villageLife.lastAction.actionId, "eat_meal");
  const socialContext = { ...context, villageId: sites.village.id, localRenown: 18 };
  const incoming = getTavernCandidates(dining, socialContext).find((candidate) => candidate.incoming);
  assert.ok(incoming);
  const declinedState = structuredClone(dining);
  assert.equal(declinedState.adventure.party.length, 0, "showing an invitation never auto-accepts it");
  const accepted = acceptPartyInvitation(dining, incoming.id, socialContext);
  assert.equal(accepted.adventure.party[0].source, "invitation");
});

test("personal map movement is limited to discovered nearby locations", () => {
  const { state, context } = fixture("personal-map-movement-test");
  const map = getPersonalMapView(state, context);
  assert.equal(map.currentLocation.type, "camp");
  assert.deepEqual(map.locations.filter((location) => location.discovered).map((location) => location.type).sort(), ["camp", "village"]);
  assert.equal(map.reachableLocations.length, 1);
  assert.equal(map.reachableLocations[0].type, "village");
  const unknown = map.locations.find((location) => !location.discovered);
  assert.throws(() => movePersonalMap(state, context, unknown.id), /発見/);
  const next = movePersonalMap(state, context, map.reachableLocations[0].id);
  const moved = getPersonalMapView(next, context);
  assert.equal(moved.currentLocation.type, "village");
  assert.equal(moved.lastResult.type, "move");
  assert.ok(moved.lastResult.travelMinutes >= 90);
  assert.equal(next.generatedWorld.expeditionTileId, moved.currentLocation.tileId);
  assert.equal(
    getGeneratedWorldTimeView(next).elapsedMinutes,
    getGeneratedWorldTimeView(state).elapsedMinutes + moved.lastResult.travelMinutes,
  );
});

test("personal exploration can discover locations, find nothing, and collect forage", () => {
  const { state, context } = fixture("personal-map-results-test");
  let next = explorePersonalMap(state, context, { roll: 0.1 });
  let map = getPersonalMapView(next, context);
  assert.equal(map.lastResult.type, "location");
  assert.equal(map.locations.filter((location) => location.discovered).length, 3);
  next = explorePersonalMap(next, context, { roll: 0.4 });
  map = getPersonalMapView(next, context);
  assert.equal(map.lastResult.type, "nothing");
  next = explorePersonalMap(next, context, { roll: 0.9 });
  map = getPersonalMapView(next, context);
  assert.equal(map.lastResult.type, "item");
  assert.ok(next.adventure.inventory.some((item) => item.id === map.lastResult.itemId && item.quantity === 1));
  assert.ok(next.player.villageLife.inventory.some((item) => item.id === map.lastResult.itemId && item.quantity === 1));
});

test("forage contracts require three concrete exploration finds and an explicit guild delivery", () => {
  const { state, context, sites } = fixture("forage-delivery-test");
  const contract = getGuildContracts(state, context).find((entry) => entry.objective.type === "collect_item");
  let next = acceptGuildContract(state, contract.id, context);
  for (let count = 0; count < 3; count += 1) next = explorePersonalMap(next, context, { roll: 0.9 });
  const active = getGuildContracts(next, context).find((entry) => entry.id === contract.id);
  assert.equal(active.objective.progress, 3);
  assert.equal(active.readyToSubmit, true);
  next = completeGuildContractObjective(next, contract.id, context);
  assert.equal(next.player.villageLife.quests.find((quest) => quest.id === contract.id).status, "completed");
  assert.equal(next.player.villageLife.inventory.some((item) => item.id === contract.objective.targetId), false);
  next = performVillageAction(next, { id: sites.village.id, name: sites.village.name }, "report_request");
  next = performVillageAction(next, { id: sites.village.id, name: sites.village.name }, "receive_reward");
  assert.notEqual(getGuildContracts(next, context)[0].id, getGuildContracts(state, context)[0].id, "report and reward rotate the board for repeatable merit");
});

test("personal exploration monster encounters hand off to the shared tactical battle", () => {
  const { state, context } = fixture("personal-map-battle-test");
  const candidate = getTavernCandidates(state, context).find((entry) => !entry.unique);
  let next = prepareRecruitableCandidate(state, candidate.id, context);
  next = inviteTavernCandidate(next, candidate.id, context);
  next = explorePersonalMap(next, context, { roll: 0.65 });
  assert.equal(getPersonalMapView(next, context).lastResult.type, "monster");
  assert.equal(next.adventure.activeRun.mode, "personal-map");
  assert.equal(next.adventure.activeRun.phase, "battle");
  const tactical = createDungeonTacticalBattle(next);
  assert.match(tactical.id, /^personal-battle:/);
  assert.equal(tactical.combatScale, "personal-units");
  assert.equal(tactical.units.filter((unit) => unit.side === "player").length, 2, "the protagonist and active companion are separate units");
  assert.ok(tactical.units.filter((unit) => unit.side === "enemy").length >= 2, "an encounter can contain multiple enemy units");
  assert.ok(tactical.units.every((unit) => unit.soldierCount === 1 && unit.tags.includes("PERSONAL_COMBATANT")));
  assert.ok(tactical.units.every((unit) => getLogisticsState(tactical, unit).connected), "individuals are not penalized by army logistics");
  const firstTurn = executeBattleTurn(tactical);
  const damagedStandingUnit = firstTurn.units.find((unit) => unit.hp < unit.maxHp && unit.hp > 0);
  if (damagedStandingUnit) assert.equal(damagedStandingUnit.soldierCount, 1, "an individual remains in combat until HP reaches zero");
  const autoResolvedBattle = autoResolveBattle(tactical);
  const battleResult = createBattleResult(autoResolvedBattle);
  assert.ok(autoResolvedBattle.winner);
  assert.ok(battleResult.player.initialHp > 0);
  assert.ok(battleResult.enemy.initialHp > 0);
  const resolved = resolveDungeonTacticalBattle(next, battleResult);
  assert.equal(resolved.adventure.activeRun.phase, battleResult.winner === "player" ? "complete" : "failed");
  assert.equal(getPersonalMapView(resolved, context).lastResult.outcome, battleResult.winner === "player" ? "victory" : resolved.adventure.activeRun.combat.outcome);
  const protagonistResult = battleResult.player.members.find((member) => member.tags.includes("PLAYER_CHARACTER"));
  assert.equal(resolved.player.villageLife.hp, protagonistResult.remainingHp);
  assert.equal(closeDungeonRun(resolved).adventure.activeRun, null);
});

test("a previously won monster trophy immediately proves a matching subjugation contract", () => {
  const { state, context } = fixture("personal-proof-test");
  let next = explorePersonalMap(state, context, { roll: 0.65 });
  const tactical = createDungeonTacticalBattle(next);
  const result = {
    battleId: tactical.id,
    winner: "player",
    turn: 4,
    player: { initialSoldiers: 1, casualties: 0, initialHp: 100, remainingHp: 72, hpLoss: 28 },
    enemy: { initialSoldiers: 1, casualties: 1, initialHp: 38, remainingHp: 0, hpLoss: 38 },
  };
  next = closeDungeonRun(resolveDungeonTacticalBattle(next, result));
  const contract = getGuildContracts(next, context).find((entry) => entry.objective.type === "defeat_enemy");
  assert.equal(contract.objective.progress, 1, "the board recognizes the trophy before acceptance");
  next = acceptGuildContract(next, contract.id, context);
  assert.equal(next.player.villageLife.quests.find((quest) => quest.id === contract.id).status, "completed");
  assert.equal(next.adventure.activeContracts.some((entry) => entry.id === contract.id), false);
  assert.equal(next.adventure.completedContracts.some((entry) => entry.id === contract.id), true);
});

test("legacy adventure saves gain an empty versioned personal map", () => {
  const { state } = fixture("personal-map-save-test");
  delete state.adventure.personalMap;
  state.adventure.npcRelations = {
    "party:legacy:0": { interactions: 2, firstApproachId: "gentle", firstImpressionBonus: true, discovered: ["personality"] },
  };
  state.adventure.schemaVersion = 1;
  const next = normalizeAdventureState(state);
  assert.equal(next.adventure.schemaVersion, 5);
  assert.deepEqual(next.adventure.personalMap, { regions: {} });
  const relation = next.adventure.npcRelations["party:legacy:0"];
  assert.equal(relation.firstMeetingComplete, true);
  assert.ok(relation.affinity > 0);
  assert.ok(["friendship", "mercenary", "evaluation", "purpose"].includes(relation.recruitmentPolicyId));
  assert.equal(normalizeAdventureState(structuredClone(next)).adventure.npcRelations["party:legacy:0"].recruitmentPolicyId, relation.recruitmentPolicyId);
});
