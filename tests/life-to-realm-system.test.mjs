import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  acceptLivelihoodContract,
  advanceCareerMonth,
  advanceRealmCampaign,
  answerCompanionRequest,
  chooseLifePath,
  claimLifePathMilestone,
  completeLivelihoodContract,
  createCareerInitialState,
  designateHeir,
  executeSuccession,
  getCareerAdvancementView,
  getLifeToRealmView,
  grantHouseholdReward,
  normalizeLifeToRealmState,
  payCompanionWages,
  performCareerAction,
  performLifeAction,
  startFiefProject,
  startRealmCampaign,
} from "../src/monthly-simulation.js";
import { moveGeneratedExpeditionToRegion } from "../src/generated-world-system.js";

const seedState = createCareerInitialState({ seed: "life-to-realm-complete" });

function freshState() {
  const state = structuredClone(seedState);
  state.player.metrics.wealth = 40;
  state.player.villageLife.supplies.food = 20;
  state.player.villageLife.party = [
    { id: "ally", name: "アーラ", role: "斥候", active: true, alive: true, hp: 48, maxHp: 48 },
    { id: "heir", name: "ベレン", role: "行政官", active: true, alive: true, hp: 46, maxHp: 46 },
  ];
  state.adventure ??= { party: [], completedDungeonIds: [] };
  state.adventure.party = structuredClone(state.player.villageLife.party);
  return normalizeLifeToRealmState(state);
}

function lordState() {
  const state = freshState();
  state.player.stage = "lord";
  state.player.title = "城主";
  state.player.holdings = [{ id: "fief-orta", territoryId: "orta", generatedRegionId: state.generatedWorld.expeditionRegionId }];
  state.player.householdRetainers = ["dario"];
  state.officers.dario.allegiance = "retinue";
  state.officers.dario.loyalty = 55;
  state.officers.dario.merit = 120;
  return normalizeLifeToRealmState(state);
}

function rulerState() {
  const state = lordState();
  state.player.stage = "independent_ruler";
  state.player.title = "国王";
  state.player.sovereign = true;
  state.player.governmentFormId = "empire";
  state.player.affiliation = { nationId: "player_realm", liegeId: null, liegeName: null };
  state.generatedWorld.playerNationId = "player_realm";
  return normalizeLifeToRealmState(state);
}

test("legacy saves gain one connected life-to-realm state without losing existing play data", () => {
  const state = freshState();
  delete state.player.lifeToRealm;
  const normalized = normalizeLifeToRealmState(state);
  assert.equal(normalized.player.lifeToRealm.schemaVersion, 1);
  assert.equal(normalized.player.lifeToRealm.body.hunger, 18);
  assert.equal(normalized.player.lifeToRealm.companions.ally.name, "アーラ");
  assert.equal(normalized.player.metrics.wealth, 40);
  assert.equal(normalized.player.villageLife.party.length, 2);
});

test("daily choices use the generated-world clock and trade money food fatigue and debt", () => {
  const state = freshState();
  const beforeClock = state.generatedWorld.expeditionClockMinutes;
  const worked = performLifeAction(state, "local_work");
  assert.equal(worked.generatedWorld.expeditionClockMinutes, beforeClock + 240);
  assert.equal(worked.player.metrics.wealth, 42);
  assert.ok(worked.player.lifeToRealm.body.hunger > state.player.lifeToRealm.body.hunger);
  assert.ok(worked.player.villageLife.fatigue > state.player.villageLife.fatigue);
  assert.equal(state.player.metrics.wealth, 40, "actions are immutable");

  const ate = performLifeAction(worked, "eat_ration");
  assert.equal(ate.player.villageLife.supplies.food, worked.player.villageLife.supplies.food - 1);
  assert.ok(ate.player.lifeToRealm.body.hunger < worked.player.lifeToRealm.body.hunger);

  const poor = freshState();
  poor.player.metrics.wealth = 0;
  const rested = performLifeAction(poor, "rest_inn");
  assert.equal(rested.player.lifeToRealm.home.debt, 1);
  assert.ok(rested.player.villageLife.fatigue < poor.player.villageLife.fatigue + 1);
});

test("the livelihood board offers competing deadlines and travel-bound work", () => {
  const state = freshState();
  const board = getLifeToRealmView(state).livelihood;
  assert.equal(board.offers.length, 3);
  assert.ok(new Set(board.offers.map((offer) => offer.kind)).size >= 2);
  assert.ok(board.offers.every((offer) => offer.deadlineMinutes > state.generatedWorld.expeditionClockMinutes));
  const courier = board.offers.find((offer) => offer.targetRegionId !== board.currentRegionId);
  assert.ok(courier, "one offer requires a real regional journey");

  const accepted = acceptLivelihoodContract(state, courier.id);
  assert.throws(() => completeLivelihoodContract(accepted), /目的地/);
  const arrived = moveGeneratedExpeditionToRegion(accepted, courier.targetRegionId, { mode: "route", encounterRoll: 1 });
  const completed = completeLivelihoodContract(arrived);
  assert.equal(completed.player.lifeToRealm.livelihood.activeContract, null);
  assert.equal(completed.player.lifeToRealm.livelihood.history[0].outcome, "completed");
  assert.equal(completed.player.metrics.wealth, arrived.player.metrics.wealth + courier.reward.wealth);
});

test("missed livelihood deadlines are recorded instead of silently disappearing", () => {
  let state = freshState();
  const offer = getLifeToRealmView(state).livelihood.offers.find((entry) => entry.kind === "local_labor");
  state = acceptLivelihoodContract(state, offer.id);
  state.generatedWorld.expeditionClockMinutes = offer.deadlineMinutes + 1;
  const expired = completeLivelihoodContract(state);
  assert.equal(expired.player.lifeToRealm.livelihood.history[0].outcome, "expired");
  assert.equal(expired.player.lifeToRealm.livelihood.activeContract, null);
});

test("companions have wages requests refusal and a recoverable departure path", () => {
  let state = freshState();
  state = advanceCareerMonth(state);
  assert.equal(state.player.lifeToRealm.companions.ally.wageArrears, 1);
  assert.ok(state.player.lifeToRealm.companions.ally.request);
  const refused = answerCompanionRequest(state, "ally", "refuse");
  assert.ok(refused.player.lifeToRealm.companions.ally.loyalty < state.player.lifeToRealm.companions.ally.loyalty);
  const paid = payCompanionWages(refused, "ally");
  assert.equal(paid.player.lifeToRealm.companions.ally.wageArrears, 0);
  assert.equal(paid.player.metrics.wealth, refused.player.metrics.wealth - 1);

  let abandoned = freshState();
  abandoned.player.metrics.wealth = 0;
  abandoned = advanceCareerMonth(advanceCareerMonth(advanceCareerMonth(abandoned)));
  assert.equal(abandoned.player.villageLife.party.find((entry) => entry.id === "ally").active, false);
  assert.equal(abandoned.player.lifeToRealm.companions.ally.status, "departed");
});

test("fief projects reserve a real budget use an officer and complete only after months", () => {
  const state = lordState();
  state.cities.orta.facilities.road.condition = 40;
  const beforeMoney = state.cities.orta.resources.money;
  const started = startFiefProject(state, { projectId: "road_network", territoryId: "orta", officerId: "dario" });
  assert.equal(started.player.lifeToRealm.fief.projects[0].remainingMonths, 2);
  assert.equal(started.cities.orta.resources.money, beforeMoney - 4);
  assert.equal(started.cities.orta.facilities.road.condition, state.cities.orta.facilities.road.condition);
  assert.doesNotMatch(started.player.history[0].detail, /\borta\b/);
  assert.match(started.player.history[0].detail, /地方の金庫/);
  const oneMonth = advanceCareerMonth(started);
  assert.equal(oneMonth.player.lifeToRealm.fief.projects[0].remainingMonths, 1);
  const completed = advanceCareerMonth(oneMonth);
  assert.equal(completed.player.lifeToRealm.fief.projects.length, 0);
  assert.ok(completed.cities.orta.facilities.road.condition > state.cities.orta.facilities.road.condition);
  assert.ok(completed.officers.dario.merit > state.officers.dario.merit);
});

test("household merit creates an explicit reward choice with loyalty tradeoffs", () => {
  const state = lordState();
  const council = getLifeToRealmView(state).household;
  assert.ok(council.members.find((member) => member.id === "dario").demand);
  const rewarded = grantHouseholdReward(state, "dario", "coin");
  assert.equal(rewarded.player.metrics.wealth, state.player.metrics.wealth - 2);
  assert.ok(rewarded.officers.dario.loyalty > state.officers.dario.loyalty);
  assert.ok(rewarded.player.lifeToRealm.household.rewards.length > 0);
});

test("a realm campaign persists two columns supply phases and regional consequences", () => {
  const state = rulerState();
  const option = getLifeToRealmView(state).campaign.options[0];
  assert.ok(option);
  let campaign = startRealmCampaign(state, { targetRegionId: option.targetRegionId, objectiveId: "secure_border", commanderIds: ["player", "dario"] });
  assert.equal(campaign.player.lifeToRealm.campaign.active.armies.length, 2);
  assert.equal(campaign.player.lifeToRealm.campaign.active.phase, "mustering");
  campaign = advanceRealmCampaign(campaign);
  assert.equal(campaign.player.lifeToRealm.campaign.active.phase, "marching");
  campaign = advanceRealmCampaign(campaign);
  assert.equal(campaign.player.lifeToRealm.campaign.active.phase, "engaged");
  campaign = advanceRealmCampaign(campaign);
  assert.equal(campaign.player.lifeToRealm.campaign.active, null);
  assert.ok(campaign.player.lifeToRealm.campaign.history[0].outcome);
  assert.ok(campaign.player.lifeToRealm.campaign.history[0].armies.every((army) => army.supply < army.initialSupply));
});

test("all ten displayed career stages are earned through fief household and campaign play", () => {
  let state = lordState();
  state.player.stage = "castellan";
  state.player.title = "城将";
  state.player.holdings[0].tenure = "stewardship";
  state.player.metrics.liegeTrust = 80;
  state.player.metrics.legitimacy = 30;
  state.player.metrics.householdSupport = 36;
  state.player.metrics.popularSupport = 34;

  assert.equal(getCareerAdvancementView(state).actionId, "earn_lordship");
  assert.equal(getCareerAdvancementView(state).ready, false);
  state = startFiefProject(state, { projectId: "patrol", territoryId: "orta", officerId: "dario" });
  state = advanceCareerMonth(state);
  state = performCareerAction(state, "earn_lordship");
  assert.equal(state.player.stage, "lord");

  state = performCareerAction(state, "consolidate_power");
  state = performCareerAction(state, "request_second_fief");
  assert.equal(state.player.stage, "multi_lord");
  state = startFiefProject(state, { projectId: "relief", territoryId: "nereia", officerId: "dario" });
  state = advanceCareerMonth(state);
  state = grantHouseholdReward(state, "dario", "praise");
  assert.equal(getCareerAdvancementView(state).ready, true);
  state = performCareerAction(state, "accept_governorship");
  assert.equal(state.player.stage, "governor");

  const target = getLifeToRealmView(state).campaign.options[0];
  state = startRealmCampaign(state, { targetRegionId: target.targetRegionId, objectiveId: "secure_border", commanderIds: ["player", "dario"] });
  state = advanceRealmCampaign(advanceRealmCampaign(advanceRealmCampaign(state)));
  assert.equal(state.player.lifeToRealm.campaign.history[0].outcome, "victory");
  state = performCareerAction(state, "form_ducal_faction");
  assert.equal(state.player.stage, "duke");

  state = grantHouseholdReward(state, "dario", "office");
  state = performCareerAction(state, "consolidate_power");
  state = performCareerAction(state, "accept_regency");
  assert.equal(state.player.stage, "regent");
  assert.equal(getCareerAdvancementView(state).ready, true);
  state = performCareerAction(state, "assume_crown", { governmentFormId: "federation" });
  assert.equal(state.player.stage, "independent_ruler");
  assert.equal(state.player.title, "連邦議長");
  assert.equal(state.player.sovereign, true);
});

test("parallel life paths use real existing achievements and award a persistent epithet", () => {
  let state = freshState();
  state.player.progress.contracts = 4;
  state.player.villageLife.guildMerit = 35;
  state = chooseLifePath(state, "adventurer");
  const path = getLifeToRealmView(state).lifePath;
  assert.equal(path.active.id, "adventurer");
  assert.equal(path.active.complete, true);
  state = claimLifePathMilestone(state);
  assert.ok(state.player.lifeToRealm.lifePath.epithets.includes("辺境の請負人"));
  assert.ok(state.player.metrics.wealth > 40);
});

test("a sovereign can designate a real companion and continue the same world as the next generation", () => {
  let state = rulerState();
  state = designateHeir(state, "heir");
  const previousName = state.player.name;
  const next = executeSuccession(state, "chronicle");
  assert.equal(next.player.name, "ベレン");
  assert.equal(next.player.lifeToRealm.legacy.generation, 2);
  assert.equal(next.player.lifeToRealm.legacy.dynasties[0].name, previousName);
  assert.equal(next.player.stage, "independent_ruler");
  assert.ok(next.player.history.some((entry) => /継承/.test(entry.title)));
  assert.equal(next.generatedWorld.seed, state.generatedWorld.seed);
});

test("normal UI exposes every loop through bound controls and no placeholder-only claims", () => {
  const source = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /function renderLifeToRealmBoard/);
  for (const attribute of [
    "data-life-action", "data-livelihood-accept", "data-livelihood-complete", "data-companion-wages",
    "data-companion-request", "data-fief-project", "data-household-reward", "data-realm-campaign-start",
    "data-realm-campaign-advance", "data-life-path", "data-life-path-claim", "data-designate-heir", "data-execute-succession",
  ]) assert.match(source, new RegExp(attribute));
  assert.match(source, /getLifeToRealmView\(state\)/);
  assert.match(source, /castellan: "城下事業を完成/);
  assert.match(source, /duke: "大戦役と論功/);
});
