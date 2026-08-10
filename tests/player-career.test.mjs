import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptServiceInvitation,
  authorizePlayerAction,
  createCareerInitialState,
  deriveJurisdiction,
  executeGovernanceCommand,
  getGovernanceView,
  grantDelegatedAuthority,
  imposeProhibition,
  performCareerAction,
  queueOrder,
  submitPetition,
} from "../src/simulation.js";

function reachCommander() {
  let state = createCareerInitialState();
  state = performCareerAction(state, "take_contract");
  state = acceptServiceInvitation(state, "serena");
  state = performCareerAction(state, "fulfill_order");
  return state;
}

function reachLord() {
  return performCareerAction(reachCommander(), "command_campaign");
}

test("a new game starts as an individual without a nation, fief, or governance screen", () => {
  const state = createCareerInitialState();
  const governance = getGovernanceView(state);
  assert.equal(state.version, 10);
  assert.equal(state.player.stage, "individual");
  assert.equal(state.player.affiliation.nationId, null);
  assert.deepEqual(state.player.holdings, []);
  assert.deepEqual(governance.executable, []);
  assert.deepEqual(governance.jurisdiction.territoryIds, []);
});

test("the playable vertical slice reaches service, command, and a frontier fief", () => {
  const commander = reachCommander();
  assert.equal(commander.player.stage, "commander");
  assert.equal(authorizePlayerAction(commander, { authority: "local_logistics", scope: "territory", targetTerritoryId: "orta" }).allowed, true);
  assert.equal(authorizePlayerAction(commander, { authority: "local_logistics", scope: "territory", targetTerritoryId: "nereia" }).allowed, false);

  const lord = performCareerAction(commander, "command_campaign");
  assert.equal(lord.player.stage, "lord");
  assert.deepEqual(deriveJurisdiction(lord).territoryIds, ["orta"]);
  assert.ok(lord.player.householdRetainers.includes("dario"));
});

test("a lord sees local execution and national petitions, never national direct commands", () => {
  const state = reachLord();
  const governance = getGovernanceView(state);
  assert.ok(governance.executable.some((item) => item.id === "local_tax_policy" && item.targetTerritoryId === "orta"));
  assert.ok(!governance.executable.some((item) => item.id === "declare_war"));
  assert.ok(governance.petitions.some((item) => item.id === "declare_war"));
  assert.equal(authorizePlayerAction(state, { commandId: "declare_war" }).visible, false);
  assert.throws(() => executeGovernanceCommand(state, "declare_war"), (error) => error.code === "NOT_AUTHORIZED");
});

test("territorial effects cannot escape the player's jurisdiction", () => {
  const state = reachLord();
  const beforeOrta = state.cities.orta.resources.production;
  const beforeNereia = state.cities.nereia.resources.production;
  const next = executeGovernanceCommand(state, "agriculture_support", "orta", "城塞市オルタ");
  assert.equal(next.cities.orta.resources.production, beforeOrta + 2);
  assert.equal(next.cities.nereia.resources.production, beforeNereia);
  assert.equal(next.player.history[0].detail, "城塞市オルタを対象に命令を実行した。");
  assert.doesNotMatch(next.player.history[0].detail, /\borta\b/);
  assert.throws(() => executeGovernanceCommand(state, "agriculture_support", "nereia"), (error) => error.code === "NOT_AUTHORIZED");
});

test("governance history never exposes a technical territory id without a display name", () => {
  const next = executeGovernanceCommand(reachLord(), "local_tax_policy", "orta");
  assert.equal(next.player.history[0].detail, "自領を対象に命令を実行した。");
  assert.doesNotMatch(next.player.history[0].detail, /\borta\b/);
});

test("legacy order APIs enforce the same jurisdiction and household boundary", () => {
  const state = reachLord();
  const allowed = queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "dario", cityId: "orta" });
  assert.equal(allowed.pendingOrders.at(-1).cityId, "orta");
  assert.throws(
    () => queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "dario", cityId: "nereia" }),
    (error) => error.code === "NOT_AUTHORIZED",
  );
  assert.throws(
    () => queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "gaius", cityId: "orta" }),
    /直属家臣/,
  );
});

test("an accepted petition remains a central-government action", () => {
  const state = reachLord();
  const next = submitPetition(state, "declare_war");
  const petition = next.player.petitions[0];
  assert.equal(petition.status, "accepted");
  assert.equal(petition.decisionBy, "serena_crown");
  assert.equal(petition.executor, "central_government");
  assert.equal(next.war, null);
  assert.equal(next.player.sovereign, false);
});

test("temporary grants expand authority and central prohibitions override them", () => {
  const commander = reachCommander();
  const granted = grantDelegatedAuthority(commander, {
    id: "temporary-police-command",
    territoryIds: ["nereia"],
    authorities: ["local_security"],
    expiresTurn: commander.turn + 2,
  });
  assert.equal(authorizePlayerAction(granted, { authority: "local_security", scope: "territory", targetTerritoryId: "nereia" }).allowed, true);
  const prohibited = imposeProhibition(granted, { authority: "local_security", reason: "中央監察中" });
  const result = authorizePlayerAction(prohibited, { authority: "local_security", scope: "territory", targetTerritoryId: "nereia" });
  assert.equal(result.allowed, false);
  assert.equal(result.visible, false);
  assert.match(result.reason, /中央監察/);
});

test("independence expands the same governance model instead of replacing it", () => {
  let state = reachLord();
  state = performCareerAction(state, "consolidate_power");
  state = performCareerAction(state, "request_second_fief");
  state = performCareerAction(state, "consolidate_power");
  state = performCareerAction(state, "declare_independence");
  const governance = getGovernanceView(state);
  assert.equal(state.player.stage, "independent_ruler");
  assert.equal(governance.jurisdiction.sovereign, true);
  assert.deepEqual(new Set(governance.jurisdiction.territoryIds), new Set(["orta", "nereia"]));
  assert.ok(governance.executable.some((item) => item.id === "declare_war" && item.scope === "nation"));
  assert.deepEqual(governance.petitions, []);
});
