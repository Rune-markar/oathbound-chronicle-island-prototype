import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createV3FieldState, createV3WorldContext, V3_DETAIL_SCALE } from "../src/v3-field-system.js";
import {
  advanceV3CompanyMonth,
  buyV3Commodity,
  contributeV3CompanyCapital,
  foundV3MerchantCompany,
  getV3CurrentMarket,
  getV3MerchantView,
  normalizeV3MerchantState,
  observeV3Market,
  openV3CompanyBranch,
  recruitV3CompanyStaff,
  resolveV3CharterApplication,
  secureV3CompanyRoute,
  sellV3Commodity,
  startV3CharterApplication,
} from "../src/v3-merchant-system.js";
import { createRaceDecisionWorldState } from "../src/race-decision-system.js";

function fixtureRuntime() {
  const width = 10;
  const height = 6;
  const nations = [
    { id: "nation-republic", name: "自由共和国", government: "共和国", color: "#668855", peopleId: "human" },
    { id: "nation-noble", name: "白冠王国", government: "封建貴族制", color: "#886655", peopleId: "elf" },
  ];
  const regions = [
    { id: "region-republic", nationId: nations[0].id, name: "自由平原" },
    { id: "region-noble", nationId: nations[1].id, name: "白冠山地" },
  ];
  const settlements = [
    {
      id: "market-grain", name: "麦穂村", settlementLevel: "village", importance: 1, population: 500,
      nationId: nations[0].id, nationName: nations[0].name, regionId: regions[0].id,
      tileIndex: 22, x: 2, y: 2, terrain: "grassland",
      resourcePotential: { agriculture: 1, timber: 0.2, freshwater: 0.4, mineral: 0.1, grazing: 0.6 },
      yields: { food: 5, commerce: 1 },
    },
    {
      id: "market-iron", name: "鉄門市", settlementLevel: "city", importance: 3, population: 9000,
      nationId: nations[1].id, nationName: nations[1].name, regionId: regions[1].id,
      tileIndex: 27, x: 7, y: 2, terrain: "mountain",
      resourcePotential: { agriculture: 0.05, timber: 0.1, freshwater: 0.1, mineral: 1, grazing: 0.1 },
      yields: { food: 0.2, commerce: 7 },
    },
  ];
  const tiles = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const nation = x < 5 ? nations[0] : nations[1];
    const region = x < 5 ? regions[0] : regions[1];
    return {
      id: `tile-${index}`, index, x, y: Math.floor(index / width), terrain: "grassland", relief: "flat",
      feature: null, passable: true, nationId: nation.id, regionId: region.id, riverId: null,
    };
  });
  return {
    terrain: { width, height, seed: "v3-merchant-fixture", config: { width, height, wrapX: true } },
    tiles,
    nations: { nations, regions, objects: settlements, roads: [{ id: "trade-road", tileIndices: [22, 23, 24, 25, 26, 27] }] },
    nationById: new Map(nations.map((entry) => [entry.id, entry])),
    regionById: new Map(regions.map((entry) => [entry.id, entry])),
  };
}

function setup() {
  const context = createV3WorldContext(fixtureRuntime());
  context.raceDynamics = createRaceDecisionWorldState(context.runtime, null, { year: 317, month: 4 });
  const state = createV3FieldState(context, { playerName: "試験商人" });
  state.player.gold = 100;
  normalizeV3MerchantState(state);
  return { context, state };
}

function placeAt(state, settlement) {
  state.player.x = settlement.x * V3_DETAIL_SCALE + 3;
  state.player.y = settlement.y * V3_DETAIL_SCALE + 4;
  state.pendingEncounter = null;
  return state;
}

function qualifyForCompany(state, settlements) {
  state.merchant.trade.knownSettlements = structuredClone(settlements);
  state.merchant.trade.stats.unitsSold = 3;
  state.merchant.trade.stats.realizedProfit = 3;
  state.player.gold = 80;
  return state;
}

test("V3の徒歩位置にある市場だけで個人交易し、利益と市場履歴を同じセーブへ残す", () => {
  const { context } = setup();
  let { state } = setup();
  const [source, destination] = context.settlements;
  placeAt(state, source);
  assert.equal(getV3CurrentMarket(context, state).id, source.id);
  state = observeV3Market(context, state);
  const sourceView = getV3MerchantView(context, state);
  const comparison = structuredClone(state);
  placeAt(comparison, destination);
  const destinationView = getV3MerchantView(context, comparison);
  const commodity = sourceView.commodities
    .map((entry) => ({ id: entry.id, margin: destinationView.market.goods[entry.id].sellPrice - sourceView.market.goods[entry.id].buyPrice }))
    .sort((left, right) => right.margin - left.margin)[0];
  assert.ok(commodity.margin > 0);
  state = buyV3Commodity(context, state, commodity.id, 3);
  placeAt(state, destination);
  state = observeV3Market(context, state);
  state = sellV3Commodity(context, state, commodity.id, 3);
  assert.equal(state.merchant.trade.knownSettlements.length, 2);
  assert.equal(state.merchant.trade.stats.unitsSold, 3);
  assert.ok(state.merchant.trade.stats.realizedProfit > 0);
  assert.equal(state.merchant.trade.cargo.length, 0);

  state.player.x = 1;
  state.player.y = 1;
  assert.equal(getV3CurrentMarket(context, state), null);
  assert.throws(() => observeV3Market(context, state), /市場まで歩いて/);
});

test("個人実績から商会を設立し、共和国の届出、人員、販路、出店、月次決算を進める", () => {
  const { context, state: initial } = setup();
  let state = qualifyForCompany(initial, context.settlements);
  placeAt(state, context.settlements[0]);
  state = foundV3MerchantCompany(context, state, { name: "海路商会", strategyId: "retail" });
  assert.equal(state.merchant.company.status, "company");
  assert.equal(state.player.gold, 68);
  state = contributeV3CompanyCapital(state, 30);
  state = startV3CharterApplication(context, state, "nation-republic", "standard_notice");
  assert.equal(state.merchant.company.charters[0].procedureId, "republic");
  assert.equal(state.merchant.company.charterApplications.length, 0);

  let view = getV3MerchantView(context, state);
  const factor = view.candidates.find((entry) => entry.roleId === "factor");
  const caravanMaster = view.candidates.find((entry) => entry.roleId === "caravan_master");
  assert.equal(factor.raceId, "human");
  assert.match(factor.temperamentName, /型$/);
  assert.equal(Object.keys(factor.decisionTraits).length, 6);
  state = recruitV3CompanyStaff(context, state, factor.id);
  state = recruitV3CompanyStaff(context, state, caravanMaster.id);
  assert.equal(state.merchant.company.staff[0].temperamentId, factor.temperamentId);
  view = getV3MerchantView(context, state);
  assert.throws(() => secureV3CompanyRoute(context, state, {
    sourceId: context.settlements[0].id, destinationId: context.settlements[1].id,
    commodityId: "grain", approachId: "steady", leaderId: view.routeLeaders[0].id,
  }), /白冠王国の営業資格/);

  state = openV3CompanyBranch(context, state, { formatId: "stall", launchId: "lean", managerId: view.branchManagers[0].id });
  state = advanceV3CompanyMonth(context, state).state;
  assert.equal(state.merchant.company.branches[0].status, "open");
  assert.equal(state.merchant.company.monthlyLedger.length, 1);
  assert.ok(Number.isFinite(state.merchant.company.monthlyLedger[0].profit));
});

test("貴族社会は領主承認を要し、信用不足の却下後も再申請して国境販路を開ける", () => {
  const { context, state: initial } = setup();
  let state = qualifyForCompany(initial, context.settlements);
  placeAt(state, context.settlements[0]);
  state = foundV3MerchantCompany(context, state, { name: "国境商会", strategyId: "caravan" });
  state = contributeV3CompanyCapital(state, 30);
  state = startV3CharterApplication(context, state, "nation-republic", "standard_notice");
  state = startV3CharterApplication(context, state, "nation-noble", "direct_audience");
  let application = state.merchant.company.charterApplications[0];
  state = resolveV3CharterApplication(context, state, application.id, "independent_patent");
  assert.equal(state.merchant.company.charters.some((entry) => entry.nationId === "nation-noble"), false);
  assert.equal(state.merchant.company.charterHistory[0].outcome, "denied");

  state = startV3CharterApplication(context, state, "nation-noble", "court_broker");
  application = state.merchant.company.charterApplications[0];
  state = resolveV3CharterApplication(context, state, application.id, "noble_share");
  const nobleCharter = state.merchant.company.charters.find((entry) => entry.nationId === "nation-noble");
  assert.equal(nobleCharter.authority, "領主宮廷");
  assert.equal(nobleCharter.monthlyDue, 1);

  let view = getV3MerchantView(context, state);
  const caravanMaster = view.candidates.find((entry) => entry.roleId === "caravan_master");
  state = recruitV3CompanyStaff(context, state, caravanMaster.id);
  view = getV3MerchantView(context, state);
  state = secureV3CompanyRoute(context, state, {
    sourceId: context.settlements[0].id, destinationId: context.settlements[1].id,
    commodityId: "grain", approachId: "steady", leaderId: view.routeLeaders[0].id,
  });
  assert.deepEqual(state.merchant.company.routes[0].jurisdictionIds.sort(), ["nation-noble", "nation-republic"]);
});

test("市場の支配が新興国へ変わると既存販路と支店は新しい営業資格まで休止し取得後に再開する", () => {
  const { context, state: initial } = setup();
  let state = qualifyForCompany(initial, context.settlements);
  placeAt(state, context.settlements[0]);
  state = foundV3MerchantCompany(context, state, { name: "国境商会", strategyId: "caravan" });
  state = contributeV3CompanyCapital(state, 50);
  state = startV3CharterApplication(context, state, "nation-republic", "standard_notice");
  state = startV3CharterApplication(context, state, "nation-noble", "direct_audience");
  state = resolveV3CharterApplication(context, state, state.merchant.company.charterApplications[0].id, "noble_share");
  for (const roleId of ["caravan_master", "factor"]) {
    const candidate = getV3MerchantView(context, state).candidates.find((entry) => entry.roleId === roleId);
    state = recruitV3CompanyStaff(context, state, candidate.id);
  }
  let view = getV3MerchantView(context, state);
  state = secureV3CompanyRoute(context, state, {
    sourceId: context.settlements[0].id, destinationId: context.settlements[1].id,
    commodityId: "grain", approachId: "steady", leaderId: view.routeLeaders[0].id,
  });
  state = openV3CompanyBranch(context, state, { formatId: "stall", launchId: "lean", managerId: view.branchManagers[0].id });
  const successor = { id: "nation-new", name: "新生共和国", government: "共和国", peopleId: "dwarf" };
  context.worldSimulation = { generatedWorld: { regionalDomains: {
    regionStates: { "region-republic": { nationId: successor.id } },
    independentPolities: { [successor.id]: successor },
  } } };
  view = getV3MerchantView(context, state);
  assert.equal(view.marketSettlement.nationId, successor.id);
  assert.equal(view.knownMarkets[0].nationId, successor.id);
  assert.equal(view.marketOptions[0].licensed, false);
  assert.equal(view.jurisdictions.find((entry) => entry.id === successor.id).procedure.id, "republic");
  assert.equal(context.settlements[0].nationId, "nation-republic", "生成時の地図データを変更しない");
  assert.throws(() => openV3CompanyBranch(context, state, {
    formatId: "stall", launchId: "lean", managerId: view.branchManagers[0]?.id,
  }), /新生共和国の営業資格/);
  state = advanceV3CompanyMonth(context, state).state;
  assert.equal(state.merchant.company.routes[0].status, "paused");
  assert.equal(state.merchant.company.branches[0].status, "suspended");
  assert.match(state.merchant.company.routes[0].pauseReason, /新生共和国/);
  assert.equal(state.merchant.company.monthlyLedger[0].routeResults.length, 0);
  assert.equal(state.merchant.company.monthlyLedger[0].branchResults.length, 0);
  assert.equal(state.merchant.company.branches[0].preparationProgress, 0);
  state = startV3CharterApplication(context, state, successor.id, "standard_notice");
  assert.equal(state.merchant.company.routes[0].status, "active");
  assert.equal(state.merchant.company.branches[0].status, "preparing");
  assert.deepEqual(state.merchant.company.routes[0].jurisdictionIds.sort(), ["nation-new", "nation-noble"]);
  state = advanceV3CompanyMonth(context, state).state;
  assert.equal(state.merchant.company.branches[0].status, "open");
});

test("統治者を失った市場へ生成時の国家資格を流用しない", () => {
  const { context, state: initial } = setup();
  let state = qualifyForCompany(initial, context.settlements);
  placeAt(state, context.settlements[0]);
  state = foundV3MerchantCompany(context, state, { name: "旧王国商会", strategyId: "retail" });
  state = startV3CharterApplication(context, state, "nation-republic", "standard_notice");
  context.worldSimulation = { generatedWorld: { regionalDomains: {
    regionStates: { "region-republic": { nationId: null } }, independentPolities: {},
  } } };
  const view = getV3MerchantView(context, state);
  assert.equal(view.marketSettlement.nationId, null);
  assert.equal(view.marketSettlement.nationName, "無所属");
  assert.equal(view.marketOptions[0].licensed, false);
});

test("旧V3フィールドセーブへ交易・商会領域を加算し、V3画面の操作契約を保持する", async () => {
  const { context, state } = setup();
  delete state.merchant;
  normalizeV3MerchantState(state);
  assert.equal(state.merchant.version, 2);
  assert.equal(state.merchant.company.status, "solo");
  assert.deepEqual(state.merchant.trade.cargo, []);

  const [index, app, styles] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/v3-app.js", import.meta.url), "utf8"),
    readFile(new URL("../v3.css", import.meta.url), "utf8"),
  ]);
  assert.match(index, /data-v3-action="commerce"/);
  assert.match(index, /id="v3CommerceModal"/);
  assert.match(app, /startV3CharterApplication/);
  assert.match(app, /data-v3-route-secure/);
  assert.match(app, /focusCommercePrimaryAction/);
  assert.match(styles, /\.v3-commerce-card/);
  assert.match(styles, /#v3CommerceContent/);

  state.merchant.company.status = "company";
  state.merchant.company.routes = [{ id: "stale-route", status: "active", approachId: "removed", leaderId: "missing", sourceId: "missing", destinationId: "missing", delayMonths: 0 }];
  state.merchant.company.branches = [{ id: "stale-branch", status: "preparing", formatId: "removed", launchId: "removed", managerId: "missing", preparationProgress: 0, preparationMonths: 1 }];
  const result = advanceV3CompanyMonth(context, state);
  const advanced = result.state;
  assert.deepEqual(result.advancedSystemIds, ["merchant-company"]);
  assert.equal(advanced.merchant.company.routes[0].status, "paused");
  assert.equal(advanced.merchant.company.branches[0].status, "suspended");
});
