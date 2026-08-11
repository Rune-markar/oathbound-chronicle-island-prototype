import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptGuildContract,
  acceptPartyInvitation,
  advanceDungeonRun,
  closeDungeonRun,
  createDungeonTacticalBattle,
  explorePersonalMap,
  getDungeonTacticalRoster,
  getGuildContracts,
  getPersonalMapView,
  getRegionAdventureSites,
  getTavernCandidates,
  inviteTavernCandidate,
  movePersonalMap,
  normalizeAdventureState,
  resolveDungeonTacticalBattle,
  skipDungeonBattle,
  startDungeonRun,
} from "../src/adventure-system.js";
import { createBattlePreparation, finalizeBattlePreparation } from "../src/battle-preparation.js";
import { executeBattleTurn } from "../src/tactical-battle.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";
import { createCareerInitialState, performVillageAction } from "../src/simulation.js";

function fixture(seed = "adventure-system-test") {
  const state = normalizeAdventureState(createCareerInitialState({ seed }));
  const world = getGeneratedWorldView(state);
  const context = { region: world.expeditionRegion, nation: world.playerNation, runtime: world.runtime };
  const sites = getRegionAdventureSites(state, context);
  return { state, world, context, sites };
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
  assert.throws(() => startDungeonRun(next, sites.dungeon, context.region), /酒場/);
  const companion = getTavernCandidates(next, context).find((candidate) => candidate.incoming);
  next = acceptPartyInvitation(next, companion.id, context);
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

test("dungeon encounters use the existing preparation and tactical battle engine", () => {
  const { state, context, sites } = fixture("manual-battle-test");
  let next = advanceDungeonRun(startDungeonRun(state, sites.dungeon, context.region));
  next = advanceDungeonRun(next);
  const roster = getDungeonTacticalRoster(next);
  const tactical = createDungeonTacticalBattle(next);
  assert.equal(tactical.turn, 0);
  assert.equal(tactical.id, next.adventure.activeRun.combat.tacticalBattleId);
  assert.equal(tactical.map.width, 14);
  assert.equal(tactical.units.filter((unit) => unit.side === "player").length, 3);
  assert.equal(tactical.units.filter((unit) => unit.side === "enemy").length, 3);
  const preparation = createBattlePreparation({
    battle: tactical,
    roster,
    defaultParticipantIds: roster.slice(0, 3).map((entry) => entry.id),
  });
  const battle = finalizeBattlePreparation(preparation);
  assert.equal(battle.preparation.finalized, true);
  assert.match(battle.supplyNodes.find((node) => node.side === "player").name, /^探索隊補給地点・/);
  assert.match(battle.supplyNodes.find((node) => node.side === "enemy").name, /の魔力源$/);
  assert.equal(battle.commanders.filter((commander) => commander.side === "player").length, Math.min(3, roster.length));
  assert.equal(executeBattleTurn(battle).turn, 1, "the shared tactical engine advances the dungeon battle");
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

test("legacy dungeon encounters are normalized for the tactical battle handoff", () => {
  const { state, context, sites } = fixture("legacy-dungeon-battle-test");
  let next = advanceDungeonRun(startDungeonRun(state, sites.dungeon, context.region));
  next = advanceDungeonRun(next);
  delete next.adventure.activeRun.combat.tacticalBattleId;
  next = normalizeAdventureState(next);
  assert.equal(next.adventure.activeRun.combat.tacticalBattleId, `dungeon-battle:${next.adventure.activeRun.id}`);
  assert.equal(createDungeonTacticalBattle(next).id, next.adventure.activeRun.combat.tacticalBattleId);
});

test("tavern supports both incoming invitations and player invitations", () => {
  const { state, context } = fixture("tavern-party-test");
  const candidates = getTavernCandidates(state, context);
  const incoming = candidates.find((candidate) => candidate.incoming);
  const recruitable = candidates.find((candidate) => !candidate.incoming);
  let next = acceptPartyInvitation(state, incoming.id, context);
  next = inviteTavernCandidate(next, recruitable.id, context);
  assert.equal(next.adventure.party.length, 2);
  assert.equal(next.adventure.party[0].source, "invitation");
  assert.equal(next.adventure.party[1].source, "player-invite");
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

test("personal exploration monster encounters hand off to the shared tactical battle", () => {
  const { state, context } = fixture("personal-map-battle-test");
  let next = explorePersonalMap(state, context, { roll: 0.65 });
  assert.equal(getPersonalMapView(next, context).lastResult.type, "monster");
  assert.equal(next.adventure.activeRun.mode, "personal-map");
  assert.equal(next.adventure.activeRun.phase, "battle");
  const tactical = createDungeonTacticalBattle(next);
  assert.match(tactical.id, /^personal-battle:/);
  const resolved = resolveDungeonTacticalBattle(next, {
    battleId: tactical.id,
    winner: "player",
    turn: 3,
    player: { initialSoldiers: 134, casualties: 9 },
    enemy: { initialSoldiers: 148, casualties: 148 },
  });
  assert.equal(resolved.adventure.activeRun.phase, "complete");
  assert.equal(getPersonalMapView(resolved, context).lastResult.outcome, "victory");
  next = skipDungeonBattle(next);
  assert.equal(next.adventure.activeRun.phase, "complete", "the existing automatic battle resolution also returns to the personal map");
  assert.equal(getPersonalMapView(next, context).lastResult.outcome, "skipped");
  assert.equal(closeDungeonRun(next).adventure.activeRun, null);
});

test("legacy adventure saves gain an empty versioned personal map", () => {
  const { state } = fixture("personal-map-save-test");
  delete state.adventure.personalMap;
  state.adventure.schemaVersion = 1;
  const next = normalizeAdventureState(state);
  assert.equal(next.adventure.schemaVersion, 2);
  assert.deepEqual(next.adventure.personalMap, { regions: {} });
});
