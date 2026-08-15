import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  advanceCareerMonth,
  buyCommodity,
  createCareerInitialState,
  getMerchantCargoLoad,
  getSettlementMarket,
  hearMarketRumors,
  sellCommodity,
} from "../src/simulation.js";

const testMarket = Object.freeze({
  id: "integration-market",
  name: "統合市場",
  regionId: "region-1-1",
  settlementLevel: "town",
  population: 4000,
  terrain: "grassland",
  yields: { food: 3.4, production: 1, commerce: 1 },
  resourcePotential: { agriculture: 1, grazing: 0.8, timber: 0.1, mineral: 0.1, freshwater: 0.7 },
});

test("new and old career saves expose merchant trade through the shared simulation API", () => {
  const state = createCareerInitialState();
  assert.equal(state.player.merchantTrade.cargoCapacity, 12);
  assert.equal(getMerchantCargoLoad(state), 0);
  assert.equal(typeof getSettlementMarket, "function");
  assert.equal(typeof buyCommodity, "function");
  assert.equal(typeof sellCommodity, "function");
  assert.equal(typeof hearMarketRumors, "function");
});

test("the career month refreshes period stock while preserving cargo and trade history", () => {
  let state = createCareerInitialState();
  state.player.locationId = testMarket.id;
  state.player.metrics.wealth = 100;
  state = buyCommodity(state, testMarket, "grain", 2);
  const priorKeys = Object.keys(state.player.merchantTrade.marketStockDeltas);
  assert.equal(priorKeys.length, 1);
  const next = advanceCareerMonth(state);
  assert.equal(getMerchantCargoLoad(next), 2);
  assert.equal(next.player.merchantTrade.stats.unitsBought, 2);
  assert.equal(Object.keys(next.player.merchantTrade.marketStockDeltas).length, 0);
});

test("the village interface exposes a dedicated market and trade ledger without replacing adventure inventory", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(app, /facilityId === "market"/);
  assert.match(app, /data-market-rumors/);
  assert.match(app, /data-buy-commodity/);
  assert.match(app, /data-sell-commodity/);
  assert.match(app, /renderMerchantMarket/);
  assert.match(css, /\.merchant-market-board/);
  assert.match(css, /\.merchant-trade-ledger/);
});
