import test from "node:test";
import assert from "node:assert/strict";
import {
  acquireProperty,
  advancePropertyEnterpriseMonth,
  closePlayerShop,
  getPropertyEnterpriseView,
  normalizePropertyEnterpriseState,
  openPlayerShop,
  priceShopCommodity,
  stockPlayerShop,
  transferCargoToWarehouse,
  withdrawWarehouseCargo,
} from "../src/property-enterprise-system.js";
import { buyCommodity, createCareerInitialState, getMerchantCargoLoadDetails, getSettlementMarket } from "../src/simulation.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";

function localSettlement(state) {
  const world = getGeneratedWorldView(state);
  return world.runtime.nations.objects.find((entry) => entry.regionId === world.expeditionRegion.id && entry.settlementLevel);
}

function atSettlement(state, settlement) {
  state.generatedWorld.expeditionRegionId = settlement.regionId;
  state.generatedWorld.expeditionTileId = settlement.tileId ?? `tile-${settlement.x}-${settlement.y}`;
  state.player.locationId = settlement.id;
  return state;
}

test("legacy saves gain property enterprise state without marriage or genealogy systems", () => {
  const state = createCareerInitialState({ seed: "property-migration" });
  delete state.player.propertyEnterprise;
  normalizePropertyEnterpriseState(state);
  assert.equal(state.player.propertyEnterprise.schemaVersion, 1);
  assert.deepEqual(state.player.propertyEnterprise.properties, []);
  assert.equal("marriages" in state.player.propertyEnterprise, false);
  assert.equal("familyTree" in state.player.propertyEnterprise, false);
  assert.equal("inheritanceDisputes" in state.player.propertyEnterprise, false);
});

test("a real settlement property provides bounded storage and remains location bound", () => {
  let state = createCareerInitialState({ seed: "property-home" });
  const settlement = localSettlement(state);
  atSettlement(state, settlement);
  state.player.metrics.wealth = 50;
  const before = structuredClone(state);
  state = acquireProperty(state, settlement, "townhouse");
  assert.equal(before.player.propertyEnterprise?.properties?.length ?? 0, 0);
  assert.equal(state.player.propertyEnterprise.properties[0].settlementId, settlement.id);
  assert.equal(state.player.propertyEnterprise.properties[0].regionId, settlement.regionId);
  assert.ok(state.player.propertyEnterprise.properties[0].storageCapacity > 12);
  assert.ok(state.player.metrics.wealth < before.player.metrics.wealth);
  assert.equal(state.player.lifeToRealm.home.kind, "townhouse");
  assert.match(state.player.history[0].detail, /保管容量36/);
});

test("generated settlement tiles are authoritative even when legacy locationId names a fixed province", () => {
  let state = createCareerInitialState({ seed: "property-generated-location" });
  const settlement = localSettlement(state);
  atSettlement(state, settlement);
  state.player.locationId = "orta";
  assert.equal(settlement.tileId, undefined, "runtime settlements exercise the coordinate tile fallback");
  state.player.metrics.wealth = 50;
  state = acquireProperty(state, settlement, "warehouse_lease");
  assert.equal(state.player.propertyEnterprise.properties[0].settlementId, settlement.id);
});

test("trade cargo uses commodity weight and a warehouse transfers only at its settlement", () => {
  let state = createCareerInitialState({ seed: "weighted-cargo" });
  const settlement = localSettlement(state);
  atSettlement(state, settlement);
  state.player.metrics.wealth = 100;
  state = acquireProperty(state, settlement, "warehouse_lease");
  const market = getSettlementMarket(state, settlement);
  const ironQuantity = Math.min(3, market.goods.iron.stock);
  state = buyCommodity(state, settlement, "iron", ironQuantity);
  assert.ok(getMerchantCargoLoadDetails(state).weight > getMerchantCargoLoadDetails(state).units);
  state = transferCargoToWarehouse(state, settlement.id, "iron", 1);
  assert.equal(state.player.propertyEnterprise.warehouseStock[settlement.id].iron.quantity, 1);
  assert.equal(state.player.merchantTrade.cargo.find((entry) => entry.commodityId === "iron").quantity, ironQuantity - 1);
  const wrong = structuredClone(state);
  wrong.generatedWorld.expeditionRegionId = getGeneratedWorldView(state).expeditionRegion.neighborIds[0];
  assert.throws(() => withdrawWarehouseCargo(wrong, settlement.id, "iron", 1), /倉庫のある集落/);
});

test("a personal shop stocks real goods, sells against the local market, and can close after arrears", () => {
  let state = createCareerInitialState({ seed: "personal-shop" });
  const settlement = localSettlement(state);
  atSettlement(state, settlement);
  state.player.metrics.wealth = 100;
  state = acquireProperty(state, settlement, "shop_house");
  state = buyCommodity(state, settlement, "grain", 4);
  state = transferCargoToWarehouse(state, settlement.id, "grain", 4);
  state = openPlayerShop(state, settlement.id, "街道の灯商店");
  state = stockPlayerShop(state, settlement.id, "grain", 3);
  state = priceShopCommodity(state, settlement.id, "grain", 1.05);
  const away = structuredClone(state);
  away.generatedWorld.expeditionRegionId = getGeneratedWorldView(state).expeditionRegion.neighborIds[0];
  assert.throws(() => priceShopCommodity(away, settlement.id, "grain", 1.2), /倉庫のある集落/);
  const beforeWealth = state.player.metrics.wealth;
  state = advancePropertyEnterpriseMonth(state);
  const shop = state.player.propertyEnterprise.shops[settlement.id];
  assert.ok(shop.ledger.length >= 1);
  assert.ok((shop.inventory.grain?.quantity ?? 0) < 3);
  assert.ok(state.player.metrics.wealth !== beforeWealth);
  state.player.metrics.wealth = 0;
  state.generatedWorld.expeditionRegionId = getGeneratedWorldView(state).expeditionRegion.neighborIds[0];
  state = advancePropertyEnterpriseMonth(state);
  state = advancePropertyEnterpriseMonth(state);
  state = advancePropertyEnterpriseMonth(state);
  assert.equal(state.player.propertyEnterprise.shops[settlement.id].status, "closed");
  const view = getPropertyEnterpriseView(state);
  assert.ok(view.properties.some((entry) => entry.settlementId === settlement.id));
  assert.ok(view.monthlyLedger.length >= 1);
  atSettlement(state, settlement);
  assert.throws(() => closePlayerShop(state, settlement.id), /営業中の店/);
});
