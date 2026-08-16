import { getGeneratedWorldView } from "./generated-world-system.js";
import { MERCHANT_COMMODITIES, MERCHANT_COMMODITY_WEIGHTS, getSettlementMarket } from "./merchant-trade.js";

const clone = (value) => structuredClone(value);
const round1 = (value) => Number(Number(value).toFixed(1));
const period = (state) => `${state.year ?? 317}-${state.month ?? 1}`;

export const PROPERTY_ENTERPRISE_SCHEMA_VERSION = 1;
export const PROPERTY_TYPES = Object.freeze({
  townhouse: Object.freeze({ id: "townhouse", name: "町屋", cost: 24, monthlyCost: 1, storageCapacity: 36, home: true }),
  warehouse_lease: Object.freeze({ id: "warehouse_lease", name: "貸倉庫", cost: 8, monthlyCost: 2, storageCapacity: 80, home: false }),
  shop_house: Object.freeze({ id: "shop_house", name: "店舗兼住宅", cost: 36, monthlyCost: 3, storageCapacity: 52, home: true, shop: true }),
});

function baseline() {
  return { schemaVersion: PROPERTY_ENTERPRISE_SCHEMA_VERSION, properties: [], warehouseStock: {}, shops: {}, monthlyLedger: [], carts: [{ id: "handcart", name: "荷車", weightCapacityBonus: 0 }], activeCartId: "handcart", stats: { purchased: 0, sales: 0, profit: 0 } };
}

export function normalizePropertyEnterpriseState(state) {
  if (!state?.player) return state;
  const base = baseline();
  const source = state.player.propertyEnterprise ?? {};
  state.player.propertyEnterprise = {
    ...base, ...source, schemaVersion: PROPERTY_ENTERPRISE_SCHEMA_VERSION,
    properties: [...(source.properties ?? [])], warehouseStock: clone(source.warehouseStock ?? {}), shops: clone(source.shops ?? {}),
    monthlyLedger: [...(source.monthlyLedger ?? [])], carts: [...(source.carts ?? base.carts)], stats: { ...base.stats, ...(source.stats ?? {}) },
  };
  return state;
}

function prepared(state) { const next = clone(state); normalizePropertyEnterpriseState(next); return next; }
function currentRegionId(state) { return state.generatedWorld?.expeditionRegionId ?? null; }
function currentSettlementId(state) {
  if (state.generatedWorld?.expeditionTileId) {
    const world = getGeneratedWorldView(state);
    const settlement = world.runtime.nations.objects.find((entry) => entry.settlementLevel && [entry.tileId, Number.isFinite(entry.x) && Number.isFinite(entry.y) ? `tile-${entry.x}-${entry.y}` : null, Number.isFinite(entry.tileIndex) ? `tile-${entry.tileIndex}` : null].filter(Boolean).includes(state.generatedWorld.expeditionTileId));
    if (settlement) return settlement.id;
  }
  return state.player?.locationId ?? null;
}
function settlementFromState(state, settlementId) {
  const world = getGeneratedWorldView(state);
  return world.runtime.nations.objects.find((entry) => entry.id === settlementId && entry.settlementLevel) ?? null;
}
function requireAtProperty(state, settlementId) {
  const property = state.player.propertyEnterprise.properties.find((entry) => entry.settlementId === settlementId);
  if (!property || property.regionId !== currentRegionId(state) || currentSettlementId(state) !== settlementId) throw new Error("倉庫のある集落でのみ操作できます");
  return property;
}
function warehouseWeight(stock) { return round1(Object.entries(stock ?? {}).reduce((sum, [id, entry]) => sum + (Number(entry.quantity) || 0) * (MERCHANT_COMMODITY_WEIGHTS[id] ?? 1), 0)); }
function logPersonal(state, title, detail) {
  state.player.history ??= [];
  state.player.history.unshift({ id: `property:${state.turn ?? 0}:${state.player.history.length}`, type: "enterprise", title, detail, summary: detail, year: state.year, month: state.month });
}

export function acquireProperty(state, settlement, typeId) {
  const next = prepared(state);
  const definition = PROPERTY_TYPES[typeId];
  if (!definition || !settlement?.id || settlement.regionId !== currentRegionId(next) || currentSettlementId(next) !== settlement.id) throw new Error("現在いる実在集落の物件だけ取得できます");
  if (next.player.propertyEnterprise.properties.some((entry) => entry.settlementId === settlement.id && entry.typeId === typeId)) throw new Error("同じ物件をすでに所有しています");
  if ((Number(next.player.metrics.wealth) || 0) < definition.cost) throw new Error("物件取得資金が不足しています");
  next.player.metrics.wealth = round1(next.player.metrics.wealth - definition.cost);
  const property = { id: `property:${settlement.id}:${typeId}`, typeId, name: definition.name, settlementId: settlement.id, settlementName: settlement.name, regionId: settlement.regionId, nationId: settlement.nationId, storageCapacity: definition.storageCapacity, monthlyCost: definition.monthlyCost, acquiredPeriod: period(next), status: "active" };
  next.player.propertyEnterprise.properties.push(property);
  next.player.propertyEnterprise.warehouseStock[settlement.id] ??= {};
  next.player.propertyEnterprise.stats.purchased += 1;
  if (definition.home) next.player.lifeToRealm.home = { kind: typeId, name: `${settlement.name}の${definition.name}`, monthlyRent: 0, debt: 0, missedPayments: 0, storageCapacity: definition.storageCapacity, settlementId: settlement.id, regionId: settlement.regionId };
  logPersonal(next, `${settlement.name}に${definition.name}を取得`, `財産${definition.cost}を支払い、保管容量${definition.storageCapacity}の拠点を得た。`);
  return next;
}

export function transferCargoToWarehouse(state, settlementId, commodityId, quantity) {
  const next = prepared(state); const property = requireAtProperty(next, settlementId);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("数量は1以上で指定してください");
  const cargo = next.player.merchantTrade.cargo.find((entry) => entry.commodityId === commodityId);
  if (!cargo || cargo.quantity < quantity) throw new Error("移す積荷が不足しています");
  const stock = next.player.propertyEnterprise.warehouseStock[settlementId] ??= {};
  const added = quantity * (MERCHANT_COMMODITY_WEIGHTS[commodityId] ?? 1);
  if (warehouseWeight(stock) + added > property.storageCapacity) throw new Error("倉庫容量を超えています");
  const prior = stock[commodityId];
  stock[commodityId] = { commodityId, name: cargo.name ?? MERCHANT_COMMODITIES[commodityId]?.name ?? commodityId, quantity: (prior?.quantity ?? 0) + quantity, averageCost: prior ? round1((prior.averageCost * prior.quantity + cargo.averageCost * quantity) / (prior.quantity + quantity)) : cargo.averageCost };
  cargo.quantity -= quantity;
  if (cargo.quantity <= 0) next.player.merchantTrade.cargo = next.player.merchantTrade.cargo.filter((entry) => entry !== cargo);
  return next;
}

export function withdrawWarehouseCargo(state, settlementId, commodityId, quantity) {
  const next = prepared(state); requireAtProperty(next, settlementId);
  const stock = next.player.propertyEnterprise.warehouseStock[settlementId]?.[commodityId];
  if (!Number.isInteger(quantity) || quantity < 1 || !stock || stock.quantity < quantity) throw new Error("倉庫在庫が不足しています");
  const trade = next.player.merchantTrade; const cargo = trade.cargo.find((entry) => entry.commodityId === commodityId);
  const unitLoad = trade.cargo.reduce((sum, entry) => sum + entry.quantity, 0);
  const weightLoad = trade.cargo.reduce((sum, entry) => sum + entry.quantity * (MERCHANT_COMMODITY_WEIGHTS[entry.commodityId] ?? 1), 0);
  if (unitLoad + quantity > trade.cargoCapacity || weightLoad + quantity * (MERCHANT_COMMODITY_WEIGHTS[commodityId] ?? 1) > trade.cargoWeightCapacity) throw new Error("積載量を超えています");
  if (cargo) { cargo.averageCost = round1((cargo.averageCost * cargo.quantity + stock.averageCost * quantity) / (cargo.quantity + quantity)); cargo.quantity += quantity; }
  else trade.cargo.push({ commodityId, name: stock.name, quantity, averageCost: stock.averageCost });
  stock.quantity -= quantity; if (stock.quantity <= 0) delete next.player.propertyEnterprise.warehouseStock[settlementId][commodityId];
  return next;
}

export function openPlayerShop(state, settlementId, name) {
  const next = prepared(state); requireAtProperty(next, settlementId);
  if (!next.player.propertyEnterprise.properties.some((entry) => entry.settlementId === settlementId && entry.typeId === "shop_house")) throw new Error("店舗兼住宅が必要です");
  if (next.player.propertyEnterprise.shops[settlementId]?.status === "open") throw new Error("店はすでに営業中です");
  next.player.propertyEnterprise.shops[settlementId] = { settlementId, regionId: currentRegionId(next), name: String(name || "旅商人の店").slice(0, 32), status: "open", inventory: {}, priceMultipliers: {}, ledger: [], arrearsMonths: 0, monthlyOverhead: 3 };
  return next;
}

export function stockPlayerShop(state, settlementId, commodityId, quantity) {
  const next = prepared(state); requireAtProperty(next, settlementId);
  const shop = next.player.propertyEnterprise.shops[settlementId]; const stock = next.player.propertyEnterprise.warehouseStock[settlementId]?.[commodityId];
  if (!shop || shop.status !== "open") throw new Error("営業中の店がありません");
  if (!Number.isInteger(quantity) || quantity < 1 || !stock || stock.quantity < quantity) throw new Error("倉庫在庫が不足しています");
  const inventory = shop.inventory[commodityId];
  shop.inventory[commodityId] = { commodityId, name: stock.name, quantity: (inventory?.quantity ?? 0) + quantity, averageCost: stock.averageCost };
  stock.quantity -= quantity; if (stock.quantity <= 0) delete next.player.propertyEnterprise.warehouseStock[settlementId][commodityId];
  return next;
}

export function priceShopCommodity(state, settlementId, commodityId, multiplier) {
  const next = prepared(state); requireAtProperty(next, settlementId); const shop = next.player.propertyEnterprise.shops[settlementId];
  if (!shop || shop.status !== "open" || !shop.inventory[commodityId]) throw new Error("値付けする店頭在庫がありません");
  if (Number(multiplier) < 0.7 || Number(multiplier) > 1.8) throw new Error("価格倍率は0.7から1.8です");
  shop.priceMultipliers[commodityId] = Number(multiplier); return next;
}

function closeShopOnDraft(next, settlementId) {
  const shop = next.player.propertyEnterprise.shops[settlementId];
  if (!shop || shop.status !== "open") throw new Error("営業中の店がありません");
  const stock = next.player.propertyEnterprise.warehouseStock[settlementId] ??= {};
  Object.entries(shop.inventory).forEach(([id, item]) => { stock[id] = { ...item, quantity: (stock[id]?.quantity ?? 0) + item.quantity }; });
  shop.inventory = {}; shop.status = "closed"; shop.closedPeriod = period(next); return next;
}

export function closePlayerShop(state, settlementId) {
  const next = prepared(state); requireAtProperty(next, settlementId); return closeShopOnDraft(next, settlementId);
}

function saleUnits(state, shop, commodityId, item, settlement) {
  const good = getSettlementMarket(state, settlement).goods[commodityId];
  const multiplier = shop.priceMultipliers[commodityId] ?? 1;
  const demand = Math.max(0, Math.round((good?.demand ?? 35) / 35 - (multiplier - 1) * 3));
  return Math.min(item.quantity, demand);
}

export function advancePropertyEnterpriseMonth(state) {
  let next = prepared(state); const enterprise = next.player.propertyEnterprise; const entry = { period: period(next), revenue: 0, costs: 0, profit: 0, sales: [] };
  enterprise.properties.filter((property) => property.status === "active").forEach((property) => { entry.costs += property.monthlyCost; });
  Object.values(enterprise.shops).filter((shop) => shop.status === "open").forEach((shop) => {
    const settlement = settlementFromState(next, shop.settlementId);
    Object.entries(shop.inventory).forEach(([commodityId, item]) => {
      const units = settlement ? saleUnits(next, shop, commodityId, item, settlement) : 0;
      if (!units) return;
      const good = getSettlementMarket(next, settlement).goods[commodityId]; const unitPrice = round1(good.sellPrice * (shop.priceMultipliers[commodityId] ?? 1)); const revenue = round1(units * unitPrice);
      item.quantity -= units; entry.revenue = round1(entry.revenue + revenue); entry.sales.push({ settlementId: shop.settlementId, commodityId, units, unitPrice, revenue });
      shop.ledger.unshift({ period: period(next), commodityId, units, unitPrice, revenue }); if (item.quantity <= 0) delete shop.inventory[commodityId];
    });
  });
  const net = round1(entry.revenue - entry.costs); entry.profit = net;
  if (net >= 0 || next.player.metrics.wealth >= -net) { next.player.metrics.wealth = round1(next.player.metrics.wealth + net); Object.values(enterprise.shops).forEach((shop) => { if (shop.status === "open") shop.arrearsMonths = 0; }); }
  else Object.values(enterprise.shops).forEach((shop) => { if (shop.status === "open") shop.arrearsMonths += 1; });
  Object.keys(enterprise.shops).forEach((id) => { if (enterprise.shops[id].status === "open" && enterprise.shops[id].arrearsMonths >= 3) closeShopOnDraft(next, id); });
  next.player.propertyEnterprise.monthlyLedger.unshift(entry); next.player.propertyEnterprise.monthlyLedger = next.player.propertyEnterprise.monthlyLedger.slice(0, 24);
  next.player.propertyEnterprise.stats.sales += entry.sales.reduce((sum, sale) => sum + sale.units, 0); next.player.propertyEnterprise.stats.profit = round1(next.player.propertyEnterprise.stats.profit + net);
  return next;
}

export function getPropertyEnterpriseView(state) {
  const next = prepared(state); const data = next.player.propertyEnterprise;
  return { propertyTypes: Object.values(PROPERTY_TYPES), properties: clone(data.properties), warehouseStock: clone(data.warehouseStock), shops: clone(data.shops), monthlyLedger: clone(data.monthlyLedger), currentRegionId: currentRegionId(next), currentSettlementId: currentSettlementId(next) };
}
