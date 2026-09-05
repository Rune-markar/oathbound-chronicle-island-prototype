import {
  MERCHANT_COMMODITIES,
  buyCommodity,
  createMerchantTradeState,
  getMerchantCargoLoadDetails,
  getSettlementMarket,
  normalizeMerchantTradeState,
  observeSettlementMarket,
  sellCommodity,
} from "./merchant-trade.js";
import {
  COMPANY_BRANCH_FORMATS,
  COMPANY_LAUNCH_PLANS,
  COMPANY_ROUTE_APPROACHES,
  COMPANY_STAFF_ROLES,
  COMPANY_STRATEGIES,
  MERCHANT_COMPANY_SCHEMA_VERSION,
  advanceMerchantCompanyMonthOnDraft,
  contributeCompanyCapital,
  foundMerchantCompany,
  getCompanyCharterProcedure,
  getMerchantCompanyView,
  normalizeMerchantCompanyState,
  openCompanyBranch,
  recruitCompanyStaff,
  resolveCompanyCharterApplication,
  resolveCompanyIncident,
  secureCompanyTradeRoute,
  startCompanyCharterApplication,
} from "./merchant-company-system.js";
import { createActionResult } from "./action-result.js";
import { advanceStateGameClock, getGameCalendar, normalizeStateGameClock } from "./game-clock.js";
import { getV3DetailedTile } from "./v3-field-system.js";
import { getV3WorldSimulationView } from "./v3-world-simulation.js";
import { getV3WartimeMarketEffect } from "./v3-world-effects.js";
import { getV3ExternalCrisisMarketEffect } from "./v3-external-crisis-system.js";
import { getV3MarketSnapshot } from "./v3-market-economy.js";

export const V3_MERCHANT_VERSION = 2;

const clone = (value) => structuredClone(value);
const round1 = (value) => Number(Number(value).toFixed(1));

function emptyCompany() {
  return {
    schemaVersion: MERCHANT_COMPANY_SCHEMA_VERSION,
    status: "solo",
    name: null,
    strategyId: null,
    foundedPeriod: null,
    treasury: 0,
    reputation: 0,
    arrearsMonths: 0,
    staff: [],
    routes: [],
    branches: [],
    charters: [],
    charterApplications: [],
    charterHistory: [],
    pendingIncidents: [],
    incidentHistory: [],
    monthlyLedger: [],
    stats: { hires: 0, routesSecured: 0, branchesOpened: 0, routeRuns: 0, totalProfit: 0 },
  };
}

export function normalizeV3MerchantState(state) {
  const source = state.merchant ?? {};
  const tradeWrapper = { player: { merchantTrade: clone(source.trade ?? createMerchantTradeState()) } };
  normalizeMerchantTradeState(tradeWrapper);
  const companyWrapper = {
    year: 317,
    month: 4,
    player: {
      merchantTrade: tradeWrapper.player.merchantTrade,
      merchantCompany: { ...emptyCompany(), ...(clone(source.company ?? {})), schemaVersion: MERCHANT_COMPANY_SCHEMA_VERSION },
    },
  };
  normalizeMerchantCompanyState(companyWrapper);
  state.merchant = {
    version: V3_MERCHANT_VERSION,
    trade: companyWrapper.player.merchantTrade,
    company: companyWrapper.player.merchantCompany,
  };
  return state;
}

function prepared(state) {
  const next = clone(state);
  normalizeV3MerchantState(next);
  return next;
}

function addMessage(state, message) {
  state.messageLog = [message, ...(state.messageLog ?? [])].slice(0, 8);
}

function settlementRadius(level) {
  return level === "city" ? 3 : level === "town" ? 2 : 1;
}

export function getV3CurrentMarket(context, state) {
  const tile = getV3DetailedTile(context, state.player.x, state.player.y);
  if (!tile.settlement) return null;
  const distance = Math.max(Math.abs(tile.localX - 4), Math.abs(tile.localY - 4));
  return distance <= settlementRadius(tile.settlement.settlementLevel) ? clone(tile.settlement) : null;
}

function multiplyCommodityEffects(effects, field) {
  const commodityIds = new Set(effects.flatMap((effect) => Object.keys(effect[field] ?? {})));
  return Object.fromEntries([...commodityIds].map((commodityId) => [commodityId, Number(effects.reduce((value, effect) => (
    value * (Number(effect[field]?.[commodityId]) || 1)
  ), 1).toFixed(4))]));
}

function worldMarketEffect(context, worldSimulation, settlement) {
  if (!worldSimulation || !settlement) return null;
  const map = getV3WorldSimulationView(context.runtime, worldSimulation);
  const nationId = map.regionById.get(settlement.regionId)?.nationId ?? settlement.nationId ?? null;
  const nation = map.nationById.get(nationId);
  const wartime = getV3WartimeMarketEffect({
    activeWars: map.activeWars,
    nationId,
    nationName: nation?.name ?? settlement.nationName,
    regionId: settlement.regionId,
  });
  const external = getV3ExternalCrisisMarketEffect(worldSimulation.externalCrises, nationId, settlement.regionId);
  const effects = [wartime, external].filter(Boolean);
  if (!effects.length) return null;
  if (effects.length === 1) return effects[0];
  return {
    id: `combined-market:${effects.map((effect) => effect.id).join("+")}`,
    effectId: "combined_world_scarcity",
    name: effects.map((effect) => effect.name).join("・"),
    symbol: "危",
    severity: Number(Math.min(5, effects.reduce((sum, effect) => sum + (Number(effect.severity) || 0), 0)).toFixed(2)),
    priceMultiplier: Number(effects.reduce((value, effect) => value * (Number(effect.priceMultiplier) || 1), 1).toFixed(4)),
    commodityPriceMultipliers: multiplyCommodityEffects(effects, "commodityPriceMultipliers"),
    commodityStockMultipliers: multiplyCommodityEffects(effects, "commodityStockMultipliers"),
    summary: effects.map((effect) => effect.summary).join(" "),
  };
}

function tradeAdapter(context, state, settlement = null, worldSimulation = null) {
  const calendar = getGameCalendar(normalizeStateGameClock(state).clock);
  const marketEffect = worldMarketEffect(context, worldSimulation, settlement);
  return {
    year: calendar.year,
    month: calendar.month,
    generatedWorld: { seed: context.seed },
    marketSnapshot: settlement ? getV3MarketSnapshot(worldSimulation?.marketEconomy, settlement.id) : null,
    worldEffects: marketEffect ? { market: marketEffect } : {},
    player: {
      locationId: settlement?.id ?? null,
      metrics: { wealth: state.player.gold },
      merchantTrade: clone(state.merchant.trade),
    },
  };
}

function applyTradeAdapter(state, adapter, message) {
  state.player.gold = round1(adapter.player.metrics.wealth);
  state.merchant.trade = clone(adapter.player.merchantTrade);
  addMessage(state, message);
  return state;
}

export function observeV3Market(context, state, worldSimulation = null) {
  const next = prepared(state);
  const settlement = getV3CurrentMarket(context, next);
  if (!settlement) throw new Error("集落の市場まで歩いてください");
  return applyTradeAdapter(next, observeSettlementMarket(tradeAdapter(context, next, settlement, worldSimulation), settlement), `${settlement.name}の相場を商人手帳へ記録した。`);
}

export function buyV3Commodity(context, state, commodityId, quantity = 1, worldSimulation = null) {
  const next = prepared(state);
  const settlement = getV3CurrentMarket(context, next);
  if (!settlement) throw new Error("集落の市場まで歩いてください");
  return applyTradeAdapter(next, buyCommodity(tradeAdapter(context, next, settlement, worldSimulation), settlement, commodityId, quantity), `${settlement.name}で${MERCHANT_COMMODITIES[commodityId].name}を${quantity}個仕入れた。`);
}

export function sellV3Commodity(context, state, commodityId, quantity = 1, worldSimulation = null) {
  const next = prepared(state);
  const settlement = getV3CurrentMarket(context, next);
  if (!settlement) throw new Error("集落の市場まで歩いてください");
  const adapter = sellCommodity(tradeAdapter(context, next, settlement, worldSimulation), settlement, commodityId, quantity);
  const transaction = adapter.player.merchantTrade.recentTransactions[0];
  return applyTradeAdapter(next, adapter, `${settlement.name}で${MERCHANT_COMMODITIES[commodityId].name}を売却。利益${transaction.profit >= 0 ? "+" : ""}${transaction.profit}。`);
}

function v3Jurisdictions(context, state) {
  const entries = new Map();
  for (const settlement of state.merchant.trade.knownSettlements) {
    const nationId = settlement.nationId ?? context.runtime.regionById.get(settlement.regionId)?.nationId ?? "unknown";
    const nation = context.runtime.nationById.get(nationId);
    const current = entries.get(nationId) ?? {
      id: nationId,
      name: nation?.name ?? settlement.nationName ?? "所在国",
      government: nation?.government ?? settlement.government ?? "地域政権",
      settlementIds: [],
      settlementNames: [],
    };
    current.settlementIds.push(settlement.id);
    current.settlementNames.push(settlement.name);
    entries.set(nationId, current);
  }
  return [...entries.values()].map((entry) => ({ ...entry, procedure: getCompanyCharterProcedure(entry) }));
}

function companyAdapter(context, state) {
  const next = prepared(state);
  const calendar = getGameCalendar(normalizeStateGameClock(next).clock);
  const currentMarket = context ? getV3CurrentMarket(context, next) : null;
  return {
    year: calendar.year,
    month: calendar.month,
    turn: calendar.monthIndex,
    rngSeed: context?.seed ?? next.seed,
    generatedWorld: {
      seed: context?.seed ?? next.seed,
      raceDynamics: clone(context?.raceDynamics ?? null),
    },
    marketSnapshots: context?.worldSimulation?.marketEconomy
      ? Object.fromEntries(next.merchant.trade.knownSettlements.map((settlement) => [
        settlement.id,
        getV3MarketSnapshot(context.worldSimulation.marketEconomy, settlement.id),
      ]).filter(([, market]) => market))
      : {},
    merchantCompanyContext: {
      currentSettlementId: currentMarket?.id ?? null,
      jurisdictions: context ? v3Jurisdictions(context, next) : [],
      nationPeopleById: context ? Object.fromEntries(
        (context.runtime?.nations?.nations ?? []).map((nation) => [nation.id, nation.peopleId ?? "human"]),
      ) : {},
    },
    player: {
      name: next.player.name,
      locationId: currentMarket?.id ?? null,
      metrics: { wealth: Number(next.player.gold) || 0 },
      merchantTrade: clone(next.merchant.trade),
      merchantCompany: clone(next.merchant.company),
      history: [],
    },
  };
}

function applyCompanyAdapter(state, adapter, fallbackMessage = null) {
  const next = prepared(state);
  next.player.gold = round1(adapter.player.metrics.wealth);
  next.merchant.trade = clone(adapter.player.merchantTrade);
  next.merchant.company = clone(adapter.player.merchantCompany);
  const history = adapter.player.history?.[0];
  const message = history?.detail ?? history?.summary ?? history?.title ?? fallbackMessage;
  if (message) addMessage(next, message);
  return next;
}

function runCompanyAction(context, state, action, fallbackMessage = null) {
  return applyCompanyAdapter(state, action(companyAdapter(context, state)), fallbackMessage);
}

export function foundV3MerchantCompany(context, state, options = {}) {
  return runCompanyAction(context, state, (adapter) => foundMerchantCompany(adapter, options), "商会を設立した。まず営業する国の資格を得る。");
}

export function contributeV3CompanyCapital(state, amount = 10) {
  return runCompanyAction(null, state, (adapter) => contributeCompanyCapital(adapter, amount), `個人資金${amount}を商会へ追加出資した。`);
}

export function startV3CharterApplication(context, state, nationId, filingId) {
  return runCompanyAction(context, state, (adapter) => startCompanyCharterApplication(adapter, nationId, filingId), "営業資格の申請を開始した。");
}

export function resolveV3CharterApplication(context, state, applicationId, decisionId) {
  return runCompanyAction(context, state, (adapter) => resolveCompanyCharterApplication(adapter, applicationId, decisionId), "営業資格申請を決着させた。");
}

export function recruitV3CompanyStaff(context, state, candidateId) {
  return runCompanyAction(context, state, (adapter) => recruitCompanyStaff(adapter, candidateId), "商会人員を迎えた。");
}

export function secureV3CompanyRoute(context, state, options = {}) {
  return runCompanyAction(context, state, (adapter) => secureCompanyTradeRoute(adapter, options), "交易販路を確保した。");
}

export function openV3CompanyBranch(context, state, options = {}) {
  const settlement = getV3CurrentMarket(context, state);
  if (!settlement) throw new Error("出店する市場まで歩いてください");
  return runCompanyAction(context, state, (adapter) => openCompanyBranch(adapter, settlement, options), "支店の出店準備を始めた。");
}

export function resolveV3CompanyIncident(state, incidentId, decisionId) {
  return runCompanyAction(null, state, (adapter) => resolveCompanyIncident(adapter, incidentId, decisionId), "街道事故へ対応した。");
}

export function advanceV3CompanyMonthOnTick(context, state) {
  return runCompanyAction(context, state, (adapter) => {
    const company = adapter.player.merchantCompany;
    company.routes.forEach((route) => {
      const valid = COMPANY_ROUTE_APPROACHES[route.approachId]
        && company.staff.some((entry) => entry.id === route.leaderId)
        && adapter.player.merchantTrade.knownSettlements.some((entry) => entry.id === route.sourceId)
        && adapter.player.merchantTrade.knownSettlements.some((entry) => entry.id === route.destinationId);
      if (!valid && route.status === "active") route.status = "paused";
    });
    company.branches.forEach((branch) => {
      const valid = COMPANY_BRANCH_FORMATS[branch.formatId]
        && COMPANY_LAUNCH_PLANS[branch.launchId]
        && company.staff.some((entry) => entry.id === branch.managerId);
      if (!valid && ["preparing", "open"].includes(branch.status)) branch.status = "suspended";
    });
    const advanced = advanceMerchantCompanyMonthOnDraft(adapter);
    const period = `${advanced.year}-${advanced.month}`;
    for (const result of advanced.player.merchantCompany.monthlyLedger[0]?.routeResults ?? []) {
      const route = advanced.player.merchantCompany.routes.find((entry) => entry.id === result.routeId);
      if (!route || !(result.units > 0)) continue;
      const sourceKey = `${period}:${route.sourceId}:${route.commodityId}`;
      const destinationKey = `${period}:${route.destinationId}:${route.commodityId}`;
      advanced.player.merchantTrade.marketStockDeltas[sourceKey] = (Number(advanced.player.merchantTrade.marketStockDeltas[sourceKey]) || 0) - result.units;
      advanced.player.merchantTrade.marketStockDeltas[destinationKey] = (Number(advanced.player.merchantTrade.marketStockDeltas[destinationKey]) || 0) + result.units;
    }
    return advanced;
  });
}

export function advanceV3CompanyMonth(context, state) {
  const normalized = prepared(state);
  if (normalized.merchant.company.status !== "company") throw new Error("商会がありません");
  const timed = advanceStateGameClock(normalized, 30 * 24 * 60).state;
  const next = advanceV3CompanyMonthOnTick(context, timed);
  const calendar = getGameCalendar(next.clock);
  return createActionResult(next, {
    elapsedMinutes: 30 * 24 * 60,
    advancedSystemIds: ["merchant-company"],
    events: [{
      id: `merchant-company:month:${calendar.absoluteMonthIndex}`,
      type: "merchant.month.closed",
      source: "merchant-company",
      visibility: "private",
      summary: `${calendar.year}年${calendar.month}月の商会決算を確定`,
      clock: next.clock,
      period: `${calendar.year}-${calendar.month}`,
    }],
    message: next.messageLog?.[0] ?? null,
  });
}

export function getV3MerchantView(context, state, worldSimulation = null) {
  const next = prepared(state);
  const current = getV3CurrentMarket(context, next);
  const adapter = companyAdapter(context, next);
  const companyView = getMerchantCompanyView(adapter);
  const market = current ? getSettlementMarket(tradeAdapter(context, next, current, worldSimulation), current) : null;
  return {
    marketSettlement: current,
    market,
    cargo: clone(next.merchant.trade.cargo),
    cargoLoad: getMerchantCargoLoadDetails(tradeAdapter(context, next, current)),
    tradeStats: clone(next.merchant.trade.stats),
    knownMarkets: clone(next.merchant.trade.knownSettlements),
    founding: { ...companyView.founding, cost: companyView.founding.foundingCost },
    company: clone(adapter.player.merchantCompany),
    strategies: companyView.strategies,
    candidates: companyView.candidates,
    jurisdictions: companyView.jurisdictions,
    marketOptions: companyView.sourceOptions,
    routeLeaders: companyView.routeLeaders,
    branchManagers: companyView.branchManagers,
    routeApproaches: Object.values(COMPANY_ROUTE_APPROACHES),
    branchFormats: Object.values(COMPANY_BRANCH_FORMATS),
    launchPlans: Object.values(COMPANY_LAUNCH_PLANS),
    commodities: Object.values(MERCHANT_COMMODITIES),
    staffRoles: Object.values(COMPANY_STAFF_ROLES),
    strategyDefinitions: Object.values(COMPANY_STRATEGIES),
  };
}
