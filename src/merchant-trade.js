const clone = (value) => structuredClone(value);
const round1 = (value) => Number(Number(value).toFixed(1));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const periodOf = (state) => `${state.year ?? 0}-${state.month ?? 1}`;

export const MERCHANT_TRADE_SCHEMA_VERSION = 1;

const commodity = (id, name, basePrice, description, supply) => Object.freeze({
  id, name, basePrice, description, supply,
});

export const MERCHANT_COMMODITIES = Object.freeze({
  grain: commodity("grain", "穀物", 1.4, "平野と肥沃地で余り、都市と不作地で求められる。", "agriculture"),
  timber: commodity("timber", "木材", 2.2, "森林地で産出し、人口の多い集落と建設地で需要が高い。", "timber"),
  herbs: commodity("herbs", "薬草", 3.1, "水と植生の豊かな土地で採れ、人口と危険の多い土地で売れる。", "herbs"),
  iron: commodity("iron", "鉄", 5.2, "山地と鉱床で産出し、都市・砦・戦地で需要が高い。", "mineral"),
  wool: commodity("wool", "羊毛", 2.8, "丘陵と高地の牧畜地で産出し、寒冷地と都市で求められる。", "grazing"),
  salt: commodity("salt", "塩", 3.8, "沿岸で得やすく、内陸ほど保存用の需要が高い。", "salt"),
});

export const MERCHANT_COMMODITY_WEIGHTS = Object.freeze({ grain: 1, timber: 2.5, herbs: 0.5, iron: 3, wool: 1.2, salt: 1.5 });

function hashUnit(...parts) {
  let hash = 2166136261;
  for (const character of parts.join("|") ) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function emptyMerchantTradeState() {
  return {
    schemaVersion: MERCHANT_TRADE_SCHEMA_VERSION,
    cargoCapacity: 12,
    cargoWeightCapacity: 24,
    cargo: [],
    marketReports: [],
    rumorChecks: {},
    marketStockDeltas: {},
    knownSettlements: [],
    recentTransactions: [],
    stats: { unitsBought: 0, unitsSold: 0, purchaseCost: 0, salesRevenue: 0, realizedProfit: 0 },
  };
}

export function createMerchantTradeState() {
  return emptyMerchantTradeState();
}

export function normalizeMerchantTradeState(state) {
  if (!state?.player) return state;
  const baseline = emptyMerchantTradeState();
  const source = state.player.merchantTrade ?? {};
  state.player.merchantTrade = {
    ...baseline,
    ...source,
    schemaVersion: MERCHANT_TRADE_SCHEMA_VERSION,
    cargoCapacity: Math.max(1, Number(source.cargoCapacity) || baseline.cargoCapacity),
    cargoWeightCapacity: Math.max(1, Number(source.cargoWeightCapacity) || baseline.cargoWeightCapacity),
    cargo: [...(source.cargo ?? [])],
    marketReports: [...(source.marketReports ?? [])],
    rumorChecks: { ...(source.rumorChecks ?? {}) },
    marketStockDeltas: { ...(source.marketStockDeltas ?? {}) },
    knownSettlements: [...(source.knownSettlements ?? [])],
    recentTransactions: [...(source.recentTransactions ?? [])],
    stats: { ...baseline.stats, ...(source.stats ?? {}) },
  };
  return state;
}

function settlementSize(settlement) {
  const population = Number(settlement?.population) || 0;
  const level = { village: 0.15, town: 0.45, city: 0.8 }[settlement?.settlementLevel] ?? 0.25;
  return clamp(Math.max(level, Math.log10(Math.max(10, population)) / 6), 0.1, 1);
}

function supplyScore(settlement, definition) {
  const potential = settlement?.resourcePotential ?? {};
  const yields = settlement?.yields ?? {};
  const terrain = String(settlement?.terrain ?? settlement?.dominantTerrain ?? "");
  if (definition.supply === "agriculture") return clamp((Number(potential.agriculture) || 0) * 0.75 + (Number(yields.food) || 0) / 5 * 0.25, 0, 1);
  if (definition.supply === "timber") return clamp((Number(potential.timber) || 0) * 0.85 + (/forest|woodland/.test(terrain) ? 0.25 : 0), 0, 1);
  if (definition.supply === "herbs") return clamp((Number(potential.freshwater) || 0) * 0.4 + (Number(potential.timber) || 0) * 0.35 + (/wetland|forest/.test(terrain) ? 0.25 : 0), 0, 1);
  if (definition.supply === "mineral") return clamp((Number(potential.mineral) || 0) * 0.9 + (/mountain|highland/.test(terrain) ? 0.2 : 0), 0, 1);
  if (definition.supply === "grazing") return clamp((Number(potential.grazing) || 0) * 0.85 + (/hill|highland|grassland/.test(terrain) ? 0.15 : 0), 0, 1);
  return clamp(/coast|beach|salt/.test(terrain) ? 1 : (Number(yields.commerce) || 0) / 8, 0, 1);
}

function demandScore(settlement, definition) {
  const size = settlementSize(settlement);
  const terrain = String(settlement?.terrain ?? settlement?.dominantTerrain ?? "");
  if (definition.id === "grain") return clamp(size + ((Number(settlement?.yields?.food) || 0) < 1 ? 0.25 : 0), 0, 1);
  if (definition.id === "iron") return clamp(size * 0.75 + (/fort|border/.test(String(settlement?.type ?? "")) ? 0.25 : 0), 0, 1);
  if (definition.id === "salt") return clamp(size * 0.55 + (!/coast/.test(terrain) ? 0.25 : 0), 0, 1);
  return clamp(size * 0.8, 0, 1);
}

function stockDeltaKey(state, settlementId, commodityId) {
  return `${periodOf(state)}:${settlementId}:${commodityId}`;
}

function marketGood(state, settlement, definition) {
  const supply = supplyScore(settlement, definition);
  const demand = demandScore(settlement, definition);
  const jitter = (hashUnit(state.generatedWorld?.seed ?? state.rngSeed ?? "world", periodOf(state), settlement.id, definition.id) - 0.5) * 0.16;
  const multiplier = clamp(1.55 - supply * 0.75 + demand * 0.28 + jitter, 0.4, 3);
  const buyPrice = round1(Math.max(0.4, definition.basePrice * multiplier));
  const sellPrice = round1(Math.max(0.2, buyPrice * 0.78));
  const baseStock = Math.max(1, Math.round(3 + supply * 15 + settlementSize(settlement) * 4));
  const delta = Number(state.player?.merchantTrade?.marketStockDeltas?.[stockDeltaKey(state, settlement.id, definition.id)]) || 0;
  return {
    commodityId: definition.id,
    name: definition.name,
    description: definition.description,
    buyPrice,
    sellPrice,
    stock: Math.max(0, baseStock + delta),
    supply: Math.round(supply * 100),
    demand: Math.round(demand * 100),
  };
}

function ageInMonths(state, report) {
  return Math.max(0, ((Number(state.year) || 0) - (Number(report.year) || 0)) * 12 + ((Number(state.month) || 1) - (Number(report.month) || 1)));
}

function agedReport(state, report) {
  const age = ageInMonths(state, report);
  const center = (Number(report.low) + Number(report.high)) / 2;
  const originalHalf = Math.max(0.1, (Number(report.high) - Number(report.low)) / 2);
  const half = originalHalf * (1 + age * 0.55);
  return { ...report, low: round1(Math.max(0.1, center - half)), high: round1(center + half), ageMonths: age };
}

export function getSettlementMarket(state, settlement, options = {}) {
  if (!state.player?.merchantTrade) normalizeMerchantTradeState(state);
  if (!settlement?.id) throw new Error("市場を特定できません");
  if (options.reportOnly) {
    const reports = {};
    Object.keys(MERCHANT_COMMODITIES).forEach((commodityId) => {
      const report = [...state.player.merchantTrade.marketReports].reverse()
        .find((entry) => entry.settlementId === settlement.id && entry.commodityId === commodityId);
      if (report) reports[commodityId] = agedReport(state, report);
    });
    return { settlementId: settlement.id, settlementName: settlement.name, exact: false, reports };
  }
  const goods = Object.fromEntries(Object.values(MERCHANT_COMMODITIES).map((definition) => [definition.id, marketGood(state, settlement, definition)]));
  return { settlementId: settlement.id, settlementName: settlement.name, period: periodOf(state), exact: true, goods };
}

export function getMerchantCargoLoad(state) {
  if (!state.player?.merchantTrade) normalizeMerchantTradeState(state);
  return round1(state.player.merchantTrade.cargo.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0));
}

export function getMerchantCargoLoadDetails(state) {
  const units = getMerchantCargoLoad(state);
  const weight = round1(state.player.merchantTrade.cargo.reduce((sum, entry) => sum + (Number(entry.quantity) || 0) * (MERCHANT_COMMODITY_WEIGHTS[entry.commodityId] ?? 1), 0));
  return { units, weight, unitCapacity: state.player.merchantTrade.cargoCapacity, weightCapacity: state.player.merchantTrade.cargoWeightCapacity };
}

export function observeSettlementMarket(state, settlement) {
  normalizeMerchantTradeState(state);
  if (!atSettlement(state, settlement)) throw new Error("現在地の市場でだけ相場を確認できます");
  const next = clone(state);
  normalizeMerchantTradeState(next);
  const market = getSettlementMarket(next, settlement);
  rememberSettlement(next.player.merchantTrade, settlement);
  recordExactReports(next, settlement, market);
  return next;
}

function atSettlement(state, settlement) {
  if (state.player?.locationId === settlement.id) return true;
  if (!state.generatedWorld && state.player?.locationId === settlement.regionId) return true;
  const tileId = settlement.tileId ?? (Number.isInteger(settlement.tileIndex) ? `tile-${settlement.tileIndex}` : null);
  return Boolean(tileId && state.generatedWorld?.expeditionTileId === tileId);
}

function requireTrade(state, settlement, commodityId, quantity) {
  normalizeMerchantTradeState(state);
  if (!atSettlement(state, settlement)) throw new Error("現在地の市場でだけ取引できます");
  if (!MERCHANT_COMMODITIES[commodityId]) throw new Error("扱えない商品です");
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("取引数量は1以上の整数で指定してください");
}

function rememberSettlement(trade, settlement) {
  const known = trade.knownSettlements.find((entry) => entry.id === settlement.id);
  if (!known) trade.knownSettlements.push(clone(settlement));
}

function recordExactReports(state, settlement, market) {
  const trade = state.player.merchantTrade;
  Object.values(market.goods).forEach((good) => {
    trade.marketReports = trade.marketReports.filter((entry) => !(entry.settlementId === settlement.id && entry.commodityId === good.commodityId));
    trade.marketReports.push({
      settlementId: settlement.id,
      settlementName: settlement.name,
      commodityId: good.commodityId,
      year: state.year,
      month: state.month,
      low: good.buyPrice,
      high: good.buyPrice,
      confidence: "exact",
      source: "visit",
    });
  });
  trade.marketReports = trade.marketReports.slice(-180);
}

export function buyCommodity(state, settlement, commodityId, quantity) {
  requireTrade(state, settlement, commodityId, quantity);
  const next = clone(state);
  normalizeMerchantTradeState(next);
  const market = getSettlementMarket(next, settlement);
  const good = market.goods[commodityId];
  if (quantity > good.stock) throw new Error(`市場在庫は${good.stock}個です`);
  if (getMerchantCargoLoad(next) + quantity > next.player.merchantTrade.cargoCapacity) throw new Error("積載量を超えています");
  const addedWeight = quantity * (MERCHANT_COMMODITY_WEIGHTS[commodityId] ?? 1);
  if (getMerchantCargoLoadDetails(next).weight + addedWeight > next.player.merchantTrade.cargoWeightCapacity) throw new Error("積荷の重量上限を超えています");
  const cost = round1(good.buyPrice * quantity);
  if (cost > Number(next.player.metrics.wealth)) throw new Error("個人財産が不足しています");
  next.player.metrics.wealth = round1(next.player.metrics.wealth - cost);
  const trade = next.player.merchantTrade;
  const existing = trade.cargo.find((entry) => entry.commodityId === commodityId);
  if (existing) {
    existing.averageCost = round1(((existing.averageCost * existing.quantity) + cost) / (existing.quantity + quantity));
    existing.quantity += quantity;
  } else {
    trade.cargo.push({ commodityId, name: MERCHANT_COMMODITIES[commodityId].name, quantity, averageCost: good.buyPrice });
  }
  trade.marketStockDeltas[stockDeltaKey(next, settlement.id, commodityId)] = (Number(trade.marketStockDeltas[stockDeltaKey(next, settlement.id, commodityId)]) || 0) - quantity;
  trade.stats.unitsBought += quantity;
  trade.stats.purchaseCost = round1(trade.stats.purchaseCost + cost);
  trade.recentTransactions.unshift({ type: "buy", settlementId: settlement.id, settlementName: settlement.name, commodityId, quantity, unitPrice: good.buyPrice, total: cost, year: next.year, month: next.month });
  trade.recentTransactions = trade.recentTransactions.slice(0, 30);
  rememberSettlement(trade, settlement);
  recordExactReports(next, settlement, market);
  return next;
}

export function sellCommodity(state, settlement, commodityId, quantity) {
  requireTrade(state, settlement, commodityId, quantity);
  const next = clone(state);
  normalizeMerchantTradeState(next);
  const trade = next.player.merchantTrade;
  const cargo = trade.cargo.find((entry) => entry.commodityId === commodityId);
  if (!cargo || cargo.quantity < quantity) throw new Error("売却する積荷が不足しています");
  const market = getSettlementMarket(next, settlement);
  const good = market.goods[commodityId];
  const revenue = round1(good.sellPrice * quantity);
  const profit = round1((good.sellPrice - cargo.averageCost) * quantity);
  cargo.quantity -= quantity;
  if (cargo.quantity <= 0) trade.cargo = trade.cargo.filter((entry) => entry !== cargo);
  next.player.metrics.wealth = round1(Number(next.player.metrics.wealth) + revenue);
  trade.marketStockDeltas[stockDeltaKey(next, settlement.id, commodityId)] = (Number(trade.marketStockDeltas[stockDeltaKey(next, settlement.id, commodityId)]) || 0) + quantity;
  trade.stats.unitsSold += quantity;
  trade.stats.salesRevenue = round1(trade.stats.salesRevenue + revenue);
  trade.stats.realizedProfit = round1(trade.stats.realizedProfit + profit);
  trade.recentTransactions.unshift({ type: "sell", settlementId: settlement.id, settlementName: settlement.name, commodityId, quantity, unitPrice: good.sellPrice, total: revenue, profit, year: next.year, month: next.month });
  trade.recentTransactions = trade.recentTransactions.slice(0, 30);
  rememberSettlement(trade, settlement);
  recordExactReports(next, settlement, market);
  return next;
}

export function hearMarketRumors(state, settlement, options = {}) {
  normalizeMerchantTradeState(state);
  if (!atSettlement(state, settlement)) throw new Error("現在地の市場でだけ相場を聞けます");
  const next = clone(state);
  normalizeMerchantTradeState(next);
  const trade = next.player.merchantTrade;
  const checkKey = `${periodOf(next)}:${settlement.id}`;
  if (trade.rumorChecks[checkKey]) throw new Error("この市場では今月すでに相場を聞きました");
  const candidates = (options.candidates ?? trade.knownSettlements)
    .filter((entry) => entry.id !== settlement.id)
    .sort((left, right) => hashUnit(next.generatedWorld?.seed ?? "world", periodOf(next), settlement.id, left.id) - hashUnit(next.generatedWorld?.seed ?? "world", periodOf(next), settlement.id, right.id))
    .slice(0, 2);
  candidates.forEach((candidate) => {
    const market = getSettlementMarket(next, candidate);
    Object.values(market.goods).forEach((good) => {
      const spread = 0.1 + hashUnit(next.generatedWorld?.seed ?? "world", periodOf(next), settlement.id, candidate.id, good.commodityId, "rumor") * 0.08;
      trade.marketReports = trade.marketReports.filter((entry) => !(entry.settlementId === candidate.id && entry.commodityId === good.commodityId));
      trade.marketReports.push({
        settlementId: candidate.id,
        settlementName: candidate.name,
        commodityId: good.commodityId,
        year: next.year,
        month: next.month,
        low: round1(Math.max(0.1, good.buyPrice * (1 - spread))),
        high: round1(good.buyPrice * (1 + spread)),
        confidence: "rumor",
        source: settlement.id,
      });
    });
  });
  trade.rumorChecks[checkKey] = true;
  rememberSettlement(trade, settlement);
  trade.marketReports = trade.marketReports.slice(-180);
  return next;
}

export function advanceMerchantMarkets(state) {
  normalizeMerchantTradeState(state);
  const currentPeriod = periodOf(state);
  state.player.merchantTrade.marketStockDeltas = Object.fromEntries(Object.entries(state.player.merchantTrade.marketStockDeltas)
    .filter(([key]) => key.startsWith(`${currentPeriod}:`)));
  state.player.merchantTrade.rumorChecks = Object.fromEntries(Object.entries(state.player.merchantTrade.rumorChecks)
    .filter(([key]) => key.startsWith(`${currentPeriod}:`)));
  return state;
}
