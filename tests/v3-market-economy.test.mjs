import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import { createV3FieldState, createV3WorldContext, getV3PurposefulActorPlans, normalizeV3FieldState, V3_DETAIL_SCALE } from "../src/v3-field-system.js";
import { advanceV3CompanyMonthOnTick, buyV3Commodity, sellV3Commodity, getV3MerchantView, normalizeV3MerchantState } from "../src/v3-merchant-system.js";
import { advanceV3MarketEconomyMonth, applyV3MarketInventoryFlows } from "../src/v3-market-economy.js";
import { createActionResult } from "../src/action-result.js";
import { GAME_MINUTES_PER_MONTH } from "../src/game-clock.js";
import { commitV3Action } from "../src/v3-system-kernel.js";
import { advanceV3WorldSimulation, createV3WorldSimulation, normalizeV3WorldSimulation } from "../src/v3-world-simulation.js";

const OPTIONS = Object.freeze({ seed: "v3-market-economy-fixture", width: 48, height: 32, plateCount: 8, nationCount: 3 });

function setup() {
  const generated = createGeneratedWorldState(OPTIONS);
  const runtime = buildGeneratedWorld(generated);
  const simulation = createV3WorldSimulation(runtime, OPTIONS);
  return { runtime, simulation };
}

test("市場取引後の小数銀貨を保存復元で失わず、不正な残高は制限する", () => {
  const { runtime, simulation } = setup();
  const context = createV3WorldContext(runtime, { worldSimulation: simulation });
  const state = createV3FieldState(context);
  for (const [gold, expected] of [[2.1, 2.1], [0, 0], [-1, 0], [1000000, 999999], ["invalid", 0]]) {
    state.player.gold = gold;
    assert.equal(normalizeV3FieldState(context, JSON.parse(JSON.stringify(state))).player.gold, expected);
  }
});

test("月産・消費・在庫繰越・街道物流から同一シードの市場が決定論的に進む", () => {
  const { runtime, simulation } = setup();
  const left = advanceV3WorldSimulation(runtime, simulation, 2);
  const right = advanceV3WorldSimulation(runtime, simulation, 2);
  assert.deepEqual(left.marketEconomy, right.marketEconomy);
  assert.equal(left.marketEconomy.lastAdvancedPeriod, "317-6");
  assert.ok(left.marketEconomy.shipments.length > 0);
  assert.ok(left.marketEconomy.history.at(-1).shipmentCount > 0);
  const shipment = left.marketEconomy.shipments[0];
  const origin = left.marketEconomy.settlements[shipment.originSettlementId].goods[shipment.commodityId];
  const destination = left.marketEconomy.settlements[shipment.destinationSettlementId].goods[shipment.commodityId];
  assert.ok(origin.lastExports >= shipment.quantity);
  assert.ok(destination.lastImports >= shipment.quantity);
  assert.ok(Object.values(left.marketEconomy.settlements).every((market) => Object.values(market.goods).every((good) => (
    good.inventory >= 0 && good.inventory <= good.capacity && good.lastProduction > 0 && good.lastConsumption > 0
  ))));
});

test("プレイヤーの買付は世界在庫を減らし、その場の不足価格へ反映される", () => {
  const { runtime, simulation } = setup();
  const settlementId = Object.keys(simulation.marketEconomy.settlements)[0];
  const before = simulation.marketEconomy.settlements[settlementId].goods.grain;
  const next = applyV3MarketInventoryFlows(runtime, simulation, [{ settlementId, commodityId: "grain", quantity: -1 }]);
  const after = next.marketEconomy.settlements[settlementId].goods.grain;
  assert.equal(after.inventory, before.inventory - 1);
  assert.ok(after.buyPrice >= before.buyPrice);
  assert.equal(after.playerFlow, -1);
});

test("V3実取引の確定はフィールド台帳と世界市場の双方へ一度だけ反映される", () => {
  const { runtime, simulation } = setup();
  const context = createV3WorldContext(runtime);
  context.worldSimulation = simulation;
  let state = createV3FieldState(context, { playerName: "市場試験者" });
  normalizeV3MerchantState(state);
  state.player.gold = 100;
  const settlement = context.settlements[0];
  state.player.x = settlement.x * V3_DETAIL_SCALE + 4;
  state.player.y = settlement.y * V3_DETAIL_SCALE + 4;
  const before = getV3MerchantView(context, state, simulation).market.goods.grain;
  const action = buyV3Commodity(context, state, "grain", 1, simulation);
  const committed = commitV3Action(runtime, context, state, simulation, action, { source: "merchant-trade" });
  const after = getV3MerchantView(context, committed.state, committed.worldSimulation).market.goods.grain;
  assert.equal(after.stock, before.stock - 1);
  assert.ok(after.buyPrice >= before.buyPrice);
  assert.equal(committed.state.merchant.trade.cargo[0].quantity, 1);
});

test("市場状態はJSON往復と旧世界バージョンから復元でき、実物流が詳細マスの商人へ投影される", () => {
  const { runtime, simulation } = setup();
  const advanced = advanceV3WorldSimulation(runtime, simulation, 2);
  const restored = normalizeV3WorldSimulation(runtime, OPTIONS, JSON.parse(JSON.stringify(advanced)));
  assert.deepEqual(restored.marketEconomy, advanced.marketEconomy);
  const migrated = normalizeV3WorldSimulation(runtime, OPTIONS, { ...simulation, version: 3, marketEconomy: undefined });
  assert.equal(migrated.marketEconomy.version, 1);

  const context = createV3WorldContext(runtime);
  context.worldSimulation = advanced;
  const state = createV3FieldState(context, { playerName: "観測者" });
  const shipmentIds = new Set(advanced.marketEconomy.shipments.map((entry) => entry.roadId));
  const merchants = getV3PurposefulActorPlans(context, state).filter((entry) => (
    entry.role === "merchant" && entry.purpose.kind === "market-inventory-shipment"
  ));
  assert.ok(merchants.length > 0);
  assert.ok(merchants.every((entry) => shipmentIds.has(entry.route.roadId) && entry.purpose.quantity > 0));
});

test("同じ月の市場を再実行しても生産・消費・物流を二重計上しない", () => {
  const { runtime, simulation } = setup();
  const advanced = advanceV3WorldSimulation(runtime, simulation, 2);
  assert.deepEqual(advanceV3MarketEconomyMonth(runtime, advanced.marketEconomy, advanced, advanced.generatedWorld, advanced.externalCrises), advanced.marketEconomy);
});

test("一括買付で相場を押し上げて即時売却しても同一市場で利益を作れない", () => {
  const { runtime, simulation } = setup();
  const context = createV3WorldContext(runtime);
  let state = createV3FieldState(context);
  normalizeV3MerchantState(state);
  state.player.gold = 100;
  const settlement = context.settlements[0];
  state.player.x = settlement.detailX;
  state.player.y = settlement.detailY;
  const buy = buyV3Commodity(context, state, "grain", 12, simulation);
  const bought = commitV3Action(runtime, context, state, simulation, buy);
  const sell = sellV3Commodity(context, bought.state, "grain", 12, bought.worldSimulation);
  const sold = commitV3Action(runtime, context, bought.state, bought.worldSimulation, sell);
  assert.ok(sold.state.player.gold < state.player.gold);
  assert.equal(sold.worldSimulation.marketEconomy.settlements[settlement.id].goods.grain.inventory, simulation.marketEconomy.settlements[settlement.id].goods.grain.inventory);
  const unchanged = commitV3Action(runtime, context, sold.state, sold.worldSimulation, sold.state);
  assert.deepEqual(unchanged.worldSimulation.marketEconomy, sold.worldSimulation.marketEconomy);
});

function companyFixture() {
  const { runtime, simulation } = setup();
  const context = createV3WorldContext(runtime);
  context.worldSimulation = simulation;
  const state = createV3FieldState(context);
  normalizeV3MerchantState(state);
  state.merchant.trade.knownSettlements = context.settlements.slice(0, 3);
  const [source, ...destinations] = state.merchant.trade.knownSettlements;
  Object.assign(state.merchant.company, {
    status: "company", strategyId: "caravan", treasury: 1000,
    staff: destinations.map((_, index) => ({ id: `leader-${index}`, roleId: "guard_captain", skill: 5, wage: 1 })),
    routes: destinations.map((destination, index) => ({
      id: `stock-route-${index}`, sourceId: source.id, destinationId: destination.id,
      sourceName: source.name, destinationName: destination.name, commodityId: "grain",
      approachId: "escorted", leaderId: `leader-${index}`, status: "active", security: 100,
      successfulRuns: 0, ledger: [],
    })),
  });
  return { runtime, simulation, context, state, source, destinations };
}

test("複数商会販路は同じ実在庫を予約し、逆ざやは損失として決算する", () => {
  const { simulation, context, state, source, destinations } = companyFixture();
  simulation.marketEconomy.settlements[source.id].goods.grain.inventory = 3;
  simulation.marketEconomy.settlements[source.id].goods.grain.buyPrice = 9;
  for (const destination of destinations) {
    Object.assign(simulation.marketEconomy.settlements[destination.id].goods.grain, { inventory: 0, sellPrice: 1 });
  }
  const next = advanceV3CompanyMonthOnTick(context, state);
  const results = next.merchant.company.monthlyLedger[0].routeResults;
  assert.equal(results.reduce((sum, result) => sum + result.units, 0), 3);
  assert.ok(results.some((result) => result.units > 0 && result.profit < 0));
  const deltas = Object.values(next.merchant.trade.marketStockDeltas);
  assert.equal(deltas.reduce((sum, quantity) => sum + quantity, 0), 0);
  assert.equal(simulation.marketEconomy.settlements[source.id].goods.grain.inventory, 3);
});

test("商会を含む12か月一括進行は一か月ずつの進行と同じ市場・決算になる", () => {
  const { runtime, simulation, context, state } = companyFixture();
  const together = commitV3Action(runtime, context, state, simulation, createActionResult(state, { elapsedMinutes: GAME_MINUTES_PER_MONTH * 12 }));
  let sequential = { state, worldSimulation: simulation };
  for (let index = 0; index < 12; index += 1) {
    sequential = commitV3Action(runtime, context, sequential.state, sequential.worldSimulation,
      createActionResult(sequential.state, { elapsedMinutes: GAME_MINUTES_PER_MONTH }));
  }
  assert.deepEqual(together.worldSimulation.marketEconomy, sequential.worldSimulation.marketEconomy);
  assert.deepEqual(together.state.merchant.company, sequential.state.merchant.company);
});
