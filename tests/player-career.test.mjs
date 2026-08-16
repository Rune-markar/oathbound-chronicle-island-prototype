import test from "node:test";
import assert from "node:assert/strict";
import {
  CAREER_STAGE_ROUTE,
  advanceCareerMonth,
  advanceLifeToRealmMonth,
  GOVERNMENT_TITLE_SYSTEMS,
  PERSONAL_CHRONICLE_RECENT_LIMIT,
  PERSONAL_CHRONICLE_TICKER_LIMIT,
  acceptServiceInvitation,
  authorizePlayerAction,
  createCareerInitialState,
  deriveJurisdiction,
  executeGovernanceCommand,
  getGovernanceView,
  getGovernmentTitleSystem,
  getPersonalChronicleView,
  getTitleForCareerStage,
  grantDelegatedAuthority,
  imposeProhibition,
  performCareerAction,
  performVillageAction,
  startFiefProject,
  queueOrder,
  submitPetition,
} from "../src/simulation.js";

test("personal chronicle keeps ten recent entries and folds older records by year", () => {
  const history = Array.from({ length: 16 }, (_, index) => ({
    year: index < 12 ? 317 : 316,
    month: 12 - (index % 12),
    title: `記録${index + 1}`,
    detail: `詳細${index + 1}`,
  }));
  const chronicle = getPersonalChronicleView(history, { year: 317, month: 1 });
  assert.equal(PERSONAL_CHRONICLE_TICKER_LIMIT, 4);
  assert.equal(PERSONAL_CHRONICLE_RECENT_LIMIT, 10);
  assert.equal(chronicle.recent.length, 10);
  assert.deepEqual(chronicle.recent.map((entry) => entry.title), history.slice(0, 10).map((entry) => entry.title));
  assert.deepEqual(chronicle.archives.map((archive) => [archive.year, archive.entries.length]), [[317, 2], [316, 4]]);
  assert.equal(chronicle.total, 16);
});

test("the career route and government title systems use the canonical player titles", () => {
  assert.deepEqual(CAREER_STAGE_ROUTE.map((stage) => stage.name), [
    "平民・浪人・傭兵",
    "従士・下級兵",
    "騎士・部隊長",
    "城将・代官",
    "男爵・城主",
    "伯爵・地方領主",
    "侯爵・辺境領主",
    "公爵・地方大勢力",
    "宰相・大元帥・摂政",
    "国王・皇帝",
  ]);
  assert.deepEqual(Object.fromEntries(Object.values(GOVERNMENT_TITLE_SYSTEMS).map((system) => [system.name, {
    highest: system.highest,
    offices: system.offices,
  }])), {
    帝国: { highest: ["皇帝"], offices: ["属王", "大公", "総督", "軍団長"] },
    共和国: { highest: ["執政官"], offices: ["元老院議員", "護民官", "財務官"] },
    都市国家: { highest: ["僭主", "市長"], offices: ["市参事", "ギルド長", "警備隊長"] },
    神権国家: { highest: ["教皇", "大神官"], offices: ["枢機卿", "司教", "神殿長", "聖騎士"] },
    遊牧国家: { highest: ["大汗"], offices: ["汗", "族長", "千人長", "百人長"] },
    部族連合: { highest: ["大族長"], offices: ["族長", "長老", "戦士長", "祈祷師"] },
    軍事政権: { highest: ["大元帥"], offices: ["将軍", "軍政官", "城塞司令官"] },
    魔導国家: { highest: ["魔導王", "首席魔導師"], offices: ["塔主", "学院長", "魔術審問官"] },
    海洋国家: { highest: ["海王", "総督"], offices: ["提督", "港湾長", "船団長", "商会頭"] },
    連邦: { highest: ["連邦議長"], offices: ["構成国君主", "州総督", "評議員"] },
  });
  assert.equal(getGovernmentTitleSystem("republic").highest[0], "執政官");
  assert.equal(getTitleForCareerStage("independent_ruler", "theocracy"), "教皇");
});

function reachCommander() {
  let state = createCareerInitialState();
  const village = { id: "test-village", name: "試験村" };
  state = performVillageAction(state, village, "accept_request");
  state = performVillageAction(state, village, "recruit_companion");
  state = performVillageAction(state, village, "complete_request");
  state = performVillageAction(state, village, "report_request");
  state = performVillageAction(state, village, "receive_reward");
  state = performVillageAction(state, village, "accept_request");
  state = performVillageAction(state, village, "complete_request");
  state = acceptServiceInvitation(state, "service-chance_rescue");
  state = performCareerAction(state, "fulfill_order");
  return state;
}

function reachLord() {
  let state = performCareerAction(reachCommander(), "command_campaign");
  state = startFiefProject(state, { projectId: "patrol", territoryId: "orta", officerId: "player" });
  state = advanceLifeToRealmMonth(state);
  return performCareerAction(state, "earn_lordship");
}

test("a new game starts as an individual without a nation, fief, or governance screen", () => {
  const state = createCareerInitialState();
  const governance = getGovernanceView(state);
  assert.equal(state.version, 10);
  assert.equal(state.player.stage, "individual");
  assert.equal(state.player.title, "浪人");
  assert.equal(state.player.affiliation.nationId, null);
  assert.deepEqual(state.player.holdings, []);
  assert.deepEqual(governance.executable, []);
  assert.deepEqual(governance.jurisdiction.territoryIds, []);
  assert.throws(() => performCareerAction(state, "take_contract"), /現在の地位/);
});

test("the playable vertical slice reaches service, command, castellanship, and a frontier fief", () => {
  const commander = reachCommander();
  assert.equal(commander.player.stage, "commander");
  assert.equal(commander.player.title, "部隊長");
  assert.equal(authorizePlayerAction(commander, { authority: "local_logistics", scope: "territory", targetTerritoryId: "orta" }).allowed, true);
  assert.equal(authorizePlayerAction(commander, { authority: "local_logistics", scope: "territory", targetTerritoryId: "nereia" }).allowed, false);

  const castellan = performCareerAction(commander, "command_campaign");
  assert.equal(castellan.player.stage, "castellan");
  assert.equal(castellan.player.title, "城将");
  assert.deepEqual(deriveJurisdiction(castellan).territoryIds, ["orta"]);
  assert.ok(castellan.player.householdRetainers.includes("dario"));
  assert.throws(() => performCareerAction(castellan, "earn_lordship"), /所領事業/);

  const lord = reachLord();
  assert.equal(lord.player.stage, "lord");
  assert.equal(lord.player.title, "城主");
  assert.equal(lord.player.holdings[0].tenure, "feudal");
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
  assert.equal(state.player.title, "伯爵");
  state = performCareerAction(state, "declare_independence", { governmentFormId: "republic" });
  const governance = getGovernanceView(state);
  assert.equal(state.player.stage, "independent_ruler");
  assert.equal(state.player.governmentFormId, "republic");
  assert.equal(state.player.title, "執政官");
  assert.equal(governance.jurisdiction.sovereign, true);
  assert.deepEqual(new Set(governance.jurisdiction.territoryIds), new Set(["orta", "nereia"]));
  assert.ok(governance.executable.some((item) => item.id === "declare_war" && item.scope === "nation"));
  assert.deepEqual(governance.petitions, []);
});
