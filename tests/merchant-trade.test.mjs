import test from "node:test";
import assert from "node:assert/strict";
import {
  MERCHANT_COMMODITIES,
  buyCommodity,
  getMerchantCargoLoad,
  getSettlementMarket,
  hearMarketRumors,
  normalizeMerchantTradeState,
  sellCommodity,
} from "../src/merchant-trade.js";

const grainTown = Object.freeze({
  id: "grain-town",
  name: "豊穣町",
  regionId: "grain-region",
  regionName: "豊穣地方",
  settlementLevel: "town",
  population: 5200,
  terrain: "grassland",
  yields: { food: 3.8, production: 0.8, commerce: 1.1 },
  resourcePotential: { agriculture: 1, grazing: 0.7, timber: 0.1, mineral: 0.1, freshwater: 0.8 },
});

const ironTown = Object.freeze({
  id: "iron-town",
  name: "鉄峰町",
  regionId: "iron-region",
  regionName: "鉄峰地方",
  settlementLevel: "town",
  population: 4800,
  terrain: "mountains",
  yields: { food: 0.4, production: 3.2, commerce: 0.8 },
  resourcePotential: { agriculture: 0.1, grazing: 0.2, timber: 0.3, mineral: 1, freshwater: 0.3 },
});

function fixture(seed = "merchant-trade-test") {
  const state = {
    version: 10,
    year: 317,
    month: 4,
    generatedWorld: { seed },
    player: { id: "player", locationId: "", metrics: { wealth: 100 } },
  };
  return normalizeMerchantTradeState(state);
}

test("merchant trade normalizes an additive save-compatible state and six commodities", () => {
  const state = fixture();
  assert.equal(Object.keys(MERCHANT_COMMODITIES).length, 6);
  assert.equal(state.player.merchantTrade.cargoCapacity, 12);
  assert.deepEqual(state.player.merchantTrade.cargo, []);
  assert.equal(state.version, 10);
});

test("the same world, month, and settlement produce the same deterministic market", () => {
  const state = fixture("deterministic-market");
  assert.deepEqual(getSettlementMarket(state, grainTown), getSettlementMarket(state, grainTown));
});

test("regional production makes grain cheaper in farmland and iron cheaper in mountains", () => {
  const state = fixture("regional-market");
  const grainMarket = getSettlementMarket(state, grainTown);
  const ironMarket = getSettlementMarket(state, ironTown);
  assert.ok(grainMarket.goods.grain.buyPrice < ironMarket.goods.grain.buyPrice);
  assert.ok(grainMarket.goods.grain.stock > ironMarket.goods.grain.stock);
  assert.ok(ironMarket.goods.iron.buyPrice < grainMarket.goods.iron.buyPrice);
  assert.ok(ironMarket.goods.iron.stock > grainMarket.goods.iron.stock);
});

test("buying is immutable and enforces wealth, stock, cargo capacity, and current settlement", () => {
  const state = fixture("trade-constraints");
  state.player.locationId = grainTown.id;
  const market = getSettlementMarket(state, grainTown);
  const bought = buyCommodity(state, grainTown, "grain", 2);
  assert.equal(state.player.merchantTrade.cargo.length, 0);
  assert.equal(getMerchantCargoLoad(bought), 2);
  assert.equal(bought.player.metrics.wealth, Number((100 - market.goods.grain.buyPrice * 2).toFixed(1)));
  assert.throws(() => buyCommodity(state, grainTown, "grain", market.goods.grain.stock + 1), /在庫/);
  assert.throws(() => buyCommodity(state, grainTown, "grain", 13), /積載/);
  const poor = structuredClone(state);
  poor.player.metrics.wealth = 0;
  assert.throws(() => buyCommodity(poor, grainTown, "grain", 1), /財産/);
  const away = structuredClone(state);
  away.player.locationId = ironTown.id;
  assert.throws(() => buyCommodity(away, grainTown, "grain", 1), /現在地/);
});

test("selling cargo records revenue and realized profit without same-market arbitrage", () => {
  let state = fixture("trade-profit");
  state.player.locationId = grainTown.id;
  state = buyCommodity(state, grainTown, "grain", 3);
  const sameMarket = sellCommodity(state, grainTown, "grain", 1);
  assert.ok(sameMarket.player.metrics.wealth < 100);
  assert.ok(sameMarket.player.merchantTrade.stats.realizedProfit < 0);

  state = sameMarket;
  state.player.locationId = ironTown.id;
  const sold = sellCommodity(state, ironTown, "grain", 2);
  assert.equal(getMerchantCargoLoad(sold), 0);
  assert.equal(sold.player.merchantTrade.stats.unitsSold, 3);
  assert.ok(Number.isFinite(sold.player.merchantTrade.stats.realizedProfit));
  assert.throws(() => sellCommodity(sold, ironTown, "grain", 1), /積荷/);
});

test("market rumors reveal ranges rather than exact remote prices and become less certain with age", () => {
  let state = fixture("market-rumors");
  state.player.locationId = grainTown.id;
  state.player.merchantTrade.knownSettlements = [grainTown, ironTown];
  state = hearMarketRumors(state, grainTown, { candidates: [ironTown] });
  const report = state.player.merchantTrade.marketReports.find((entry) => entry.settlementId === ironTown.id && entry.commodityId === "grain");
  const exact = getSettlementMarket(state, ironTown).goods.grain.buyPrice;
  assert.ok(report.low < report.high);
  assert.ok(report.low <= exact && report.high >= exact);
  assert.notEqual(report.low, exact);
  assert.notEqual(report.high, exact);
  assert.equal(report.confidence, "rumor");
  assert.throws(() => hearMarketRumors(state, grainTown, { candidates: [ironTown] }), /今月/);

  const older = structuredClone(state);
  older.month += 2;
  const aged = getSettlementMarket(older, ironTown, { reportOnly: true }).reports.grain;
  assert.ok(aged.high - aged.low > report.high - report.low);
});
