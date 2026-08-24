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
  getCompanyCharterProcedure,
} from "./merchant-company-system.js";
import { getV3DetailedTile } from "./v3-field-system.js";

export const V3_MERCHANT_VERSION = 1;

const clone = (value) => structuredClone(value);
const round1 = (value) => Number(Number(value).toFixed(1));
const periodIndex = (state) => Math.floor((Number(state.clockMinutes) || 0) / (30 * 24 * 60));
const periodLabel = (state) => `${317 + Math.floor(periodIndex(state) / 12)}年${periodIndex(state) % 12 + 1}月`;

const STAFF_NAMES = Object.freeze({
  factor: ["ミラ", "ボルド", "エステル", "ヨアン"],
  buyer: ["ネーヴェ", "クラウス", "リタ", "セドリック"],
  caravan_master: ["トーレン", "イザーク", "サフィラ", "ガロ"],
  guard_captain: ["ベラ", "オルソ", "ナディア", "ロラン"],
});

function hashUnit(...parts) {
  let hash = 2166136261;
  for (const character of parts.join("|")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function emptyCompany() {
  return {
    status: "solo", name: null, strategyId: null, foundedPeriod: null,
    treasury: 0, reputation: 0, arrearsMonths: 0,
    charters: [], charterApplications: [], charterHistory: [],
    staff: [], routes: [], branches: [], pendingIncidents: [], incidentHistory: [], monthlyLedger: [],
    stats: { hires: 0, routesSecured: 0, branchesOpened: 0, routeRuns: 0, totalProfit: 0 },
  };
}

function normalizeCompany(source = {}) {
  const base = emptyCompany();
  return {
    ...base, ...source,
    charters: clone(source.charters ?? []),
    charterApplications: clone(source.charterApplications ?? []),
    charterHistory: clone(source.charterHistory ?? []),
    staff: clone(source.staff ?? []),
    routes: clone(source.routes ?? []),
    branches: clone(source.branches ?? []),
    pendingIncidents: clone(source.pendingIncidents ?? []),
    incidentHistory: clone(source.incidentHistory ?? []),
    monthlyLedger: clone(source.monthlyLedger ?? []),
    stats: { ...base.stats, ...(source.stats ?? {}) },
  };
}

export function normalizeV3MerchantState(state) {
  const source = state.merchant ?? {};
  const wrapper = { player: { merchantTrade: clone(source.trade ?? createMerchantTradeState()) } };
  normalizeMerchantTradeState(wrapper);
  state.merchant = {
    version: V3_MERCHANT_VERSION,
    trade: wrapper.player.merchantTrade,
    company: normalizeCompany(source.company),
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
  if (distance > settlementRadius(tile.settlement.settlementLevel)) return null;
  return clone(tile.settlement);
}

function tradeTime(state) {
  const index = periodIndex(state);
  return { year: 317 + Math.floor(index / 12), month: index % 12 + 1 };
}

function tradeAdapter(context, state, settlement) {
  const time = tradeTime(state);
  return {
    ...time,
    generatedWorld: { seed: context.seed },
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

export function observeV3Market(context, state) {
  const next = prepared(state);
  const settlement = getV3CurrentMarket(context, next);
  if (!settlement) throw new Error("集落の市場まで歩いてください");
  const adapter = observeSettlementMarket(tradeAdapter(context, next, settlement), settlement);
  return applyTradeAdapter(next, adapter, `${settlement.name}の相場を商人手帳へ記録した。`);
}

export function buyV3Commodity(context, state, commodityId, quantity = 1) {
  const next = prepared(state);
  const settlement = getV3CurrentMarket(context, next);
  if (!settlement) throw new Error("集落の市場まで歩いてください");
  const adapter = buyCommodity(tradeAdapter(context, next, settlement), settlement, commodityId, quantity);
  return applyTradeAdapter(next, adapter, `${settlement.name}で${MERCHANT_COMMODITIES[commodityId].name}を${quantity}個仕入れた。`);
}

export function sellV3Commodity(context, state, commodityId, quantity = 1) {
  const next = prepared(state);
  const settlement = getV3CurrentMarket(context, next);
  if (!settlement) throw new Error("集落の市場まで歩いてください");
  const adapter = sellCommodity(tradeAdapter(context, next, settlement), settlement, commodityId, quantity);
  const transaction = adapter.player.merchantTrade.recentTransactions[0];
  return applyTradeAdapter(next, adapter, `${settlement.name}で${MERCHANT_COMMODITIES[commodityId].name}を売却。利益${transaction.profit >= 0 ? "+" : ""}${transaction.profit}。`);
}

function foundingProgress(state) {
  const trade = state.merchant.trade;
  const stats = trade.stats;
  const requirements = [
    { id: "markets", label: "訪れた市場", value: trade.knownSettlements.length, target: 2 },
    { id: "sales", label: "個人で売った品", value: stats.unitsSold, target: 3 },
    { id: "profit", label: "交易利益", value: round1(stats.realizedProfit), target: 2 },
    { id: "wealth", label: "個人資金", value: round1(state.player.gold), target: 24 },
  ];
  return { requirements, ready: requirements.every((entry) => entry.value >= entry.target), cost: 12 };
}

function candidatePool(context, state) {
  const company = state.merchant.company;
  const places = state.merchant.trade.knownSettlements;
  if (company.status !== "company" || !places.length) return [];
  return Object.values(COMPANY_STAFF_ROLES).map((role, index) => {
    const settlement = places[index % places.length];
    const names = STAFF_NAMES[role.id];
    const name = names[Math.floor(hashUnit(context.seed, role.id, settlement.id, company.foundedPeriod) * names.length)];
    const skill = 1 + Math.floor(hashUnit(context.seed, role.id, settlement.id, "skill") * 3);
    const discount = COMPANY_STRATEGIES[company.strategyId]?.hiringDiscount ?? 0;
    return {
      id: `candidate:${role.id}:${settlement.id}`, name, roleId: role.id, roleName: role.name,
      description: role.description, skill, wage: 1 + skill, signingBonus: Math.max(1, 2 + skill - discount),
      originSettlementId: settlement.id, originSettlementName: settlement.name,
    };
  });
}

export function foundV3MerchantCompany(context, state, options = {}) {
  const next = prepared(state);
  const company = next.merchant.company;
  const founding = foundingProgress(next);
  const strategy = COMPANY_STRATEGIES[options.strategyId];
  if (company.status === "company") throw new Error("商会はすでに設立されています");
  if (!founding.ready) throw new Error("二市場、売却三個、利益二、個人資金二四が必要です");
  if (!strategy) throw new Error("商会方針を選んでください");
  const name = String(options.name ?? `${next.player.name}商会`).trim().slice(0, 24);
  if (!name) throw new Error("商会名を決めてください");
  next.player.gold = round1(next.player.gold - founding.cost);
  Object.assign(company, { status: "company", name, strategyId: strategy.id, foundedPeriod: periodLabel(next), treasury: founding.cost, reputation: 4 });
  addMessage(next, `${name}を設立した。まず営業する国の資格を得る。`);
  return next;
}

export function contributeV3CompanyCapital(state, amount = 10) {
  const next = prepared(state);
  const value = Number(amount);
  if (next.merchant.company.status !== "company") throw new Error("商会がありません");
  if (!Number.isFinite(value) || value < 1 || next.player.gold < value) throw new Error("追加出資できる個人資金がありません");
  next.player.gold = round1(next.player.gold - value);
  next.merchant.company.treasury = round1(next.merchant.company.treasury + value);
  if (next.merchant.company.treasury >= 0) {
    next.merchant.company.arrearsMonths = 0;
    next.merchant.company.routes.forEach((route) => { if (route.status === "paused") route.status = "active"; });
    next.merchant.company.branches.forEach((branch) => { if (branch.status === "suspended") branch.status = "open"; });
  }
  addMessage(next, `個人資金${value}を商会へ追加出資した。`);
  return next;
}

function knownJurisdictions(context, state) {
  const grouped = new Map();
  for (const settlement of state.merchant.trade.knownSettlements) {
    const nation = context.runtime.nationById.get(settlement.nationId);
    const nationId = settlement.nationId ?? "unknown";
    const entry = grouped.get(nationId) ?? {
      id: nationId, name: nation?.name ?? settlement.nationName ?? "所在国",
      government: nation?.government ?? settlement.government ?? "地域政権", settlementIds: [],
    };
    entry.settlementIds.push(settlement.id);
    grouped.set(nationId, entry);
  }
  return [...grouped.values()].map((entry) => ({ ...entry, procedure: getCompanyCharterProcedure(entry) }));
}

function activeCharter(company, nationId) {
  return company.charters.find((entry) => entry.nationId === nationId && entry.status === "active") ?? null;
}

function jurisdictionForSettlement(context, state, settlementId) {
  return knownJurisdictions(context, state).find((entry) => entry.settlementIds.includes(settlementId)) ?? null;
}

export function startV3CharterApplication(context, state, nationId, filingId) {
  const next = prepared(state);
  const company = next.merchant.company;
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  if (activeCharter(company, nationId)) throw new Error("この国ではすでに営業できます");
  if (company.charterApplications.some((entry) => entry.nationId === nationId)) throw new Error("提示条件への返答が必要です");
  const jurisdiction = knownJurisdictions(context, next).find((entry) => entry.id === nationId);
  const filing = jurisdiction?.procedure.filings.find((entry) => entry.id === filingId);
  if (!jurisdiction || !filing) throw new Error("申請方法を選んでください");
  if (company.treasury < filing.cost) throw new Error("申請費用の商会資金が不足しています");
  company.treasury = round1(company.treasury - filing.cost);
  if (filing.immediate) {
    company.charters.push({
      id: `charter:${nationId}:${company.charters.length + 1}`, nationId, nationName: jurisdiction.name,
      government: jurisdiction.government, procedureId: jurisdiction.procedure.id, authority: jurisdiction.procedure.authority,
      status: "active", basis: filing.name, obligation: filing.obligation, monthlyDue: filing.monthlyDue, grantedPeriod: periodLabel(next),
    });
    company.reputation += filing.reputation;
    company.charterHistory.unshift({ nationId, filingId, outcome: "granted", period: periodLabel(next) });
    addMessage(next, `${jurisdiction.name}へ届け出て、その日から営業可能になった。`);
    return next;
  }
  company.charterApplications.push({
    id: `application:${nationId}:${company.charterHistory.length + 1}`, nationId, nationName: jurisdiction.name,
    procedureId: jurisdiction.procedure.id, authority: jurisdiction.procedure.authority,
    filingId, filingName: filing.name, decisionDiscount: filing.decisionDiscount ?? 0, startedPeriod: periodLabel(next),
  });
  addMessage(next, `${jurisdiction.name}の${jurisdiction.procedure.authority}へ営業資格を申請した。`);
  return next;
}

export function resolveV3CharterApplication(context, state, applicationId, decisionId) {
  const next = prepared(state);
  const company = next.merchant.company;
  const application = company.charterApplications.find((entry) => entry.id === applicationId);
  const jurisdiction = application ? knownJurisdictions(context, next).find((entry) => entry.id === application.nationId) : null;
  const decision = jurisdiction?.procedure.decisions.find((entry) => entry.id === decisionId);
  if (!application || !jurisdiction || !decision) throw new Error("提示条件への返答を選んでください");
  if (decision.minimumReputation && company.reputation < decision.minimumReputation) {
    company.charterApplications = company.charterApplications.filter((entry) => entry.id !== applicationId);
    company.charterHistory.unshift({ ...application, decisionId, outcome: "denied", reason: `商会信用${decision.minimumReputation}が必要`, period: periodLabel(next) });
    company.reputation = Math.max(0, company.reputation - 1);
    addMessage(next, `「${decision.name}」は信用条件に届かず却下された。再申請は可能だ。`);
    return next;
  }
  const cost = Math.max(0, decision.cost - (application.decisionDiscount ?? 0));
  if (company.treasury < cost) throw new Error("提示条件を受ける商会資金が不足しています");
  company.treasury = round1(company.treasury - cost);
  company.reputation += decision.reputation;
  const charter = {
    id: `charter:${jurisdiction.id}:${company.charters.length + 1}`, nationId: jurisdiction.id, nationName: jurisdiction.name,
    government: jurisdiction.government, procedureId: jurisdiction.procedure.id, authority: jurisdiction.procedure.authority,
    status: "active", basis: decision.name, obligation: decision.obligation, monthlyDue: decision.monthlyDue, grantedPeriod: periodLabel(next),
  };
  company.charters.push(charter);
  company.charterApplications = company.charterApplications.filter((entry) => entry.id !== applicationId);
  company.charterHistory.unshift({ ...application, decisionId, outcome: "granted", charterId: charter.id, period: periodLabel(next) });
  addMessage(next, `${jurisdiction.name}で「${decision.name}」を受け入れ、営業資格を得た。`);
  return next;
}

export function recruitV3CompanyStaff(context, state, candidateId) {
  const next = prepared(state);
  const company = next.merchant.company;
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  const candidate = candidatePool(context, next).find((entry) => entry.id === candidateId);
  if (!candidate || company.staff.some((entry) => entry.candidateId === candidateId)) throw new Error("採用できる候補がいません");
  if (company.treasury < candidate.signingBonus) throw new Error("契約金が不足しています");
  company.treasury = round1(company.treasury - candidate.signingBonus);
  company.staff.push({ ...candidate, id: `staff:${company.staff.length + 1}`, candidateId, morale: 70, assignmentType: null, assignmentId: null });
  company.stats.hires += 1;
  addMessage(next, `${candidate.name}を${candidate.roleName}として迎えた。`);
  return next;
}

function availableStaff(company, staffId, roles) {
  const staff = company.staff.find((entry) => entry.id === staffId);
  if (!staff || staff.assignmentId || !roles.includes(staff.roleId)) throw new Error("配置待ちの担当者を選んでください");
  return staff;
}

function requireSettlementCharters(context, state, settlementIds) {
  const company = state.merchant.company;
  const jurisdictions = settlementIds.map((id) => jurisdictionForSettlement(context, state, id));
  if (jurisdictions.some((entry) => !entry)) throw new Error("営業国を特定できません");
  const uniqueJurisdictions = [...new Map(jurisdictions.map((entry) => [entry.id, entry])).values()];
  const missing = uniqueJurisdictions.filter((entry) => !activeCharter(company, entry.id));
  if (missing.length) throw new Error(`${missing.map((entry) => entry.name).join("・")}の営業資格が必要です`);
  return uniqueJurisdictions.map((entry) => entry.id);
}

function marketForKnown(context, state, settlement) {
  return getSettlementMarket(tradeAdapter(context, state, settlement), settlement);
}

export function secureV3CompanyRoute(context, state, options = {}) {
  const next = prepared(state);
  const company = next.merchant.company;
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  const source = next.merchant.trade.knownSettlements.find((entry) => entry.id === options.sourceId);
  const destination = next.merchant.trade.knownSettlements.find((entry) => entry.id === options.destinationId);
  const approach = COMPANY_ROUTE_APPROACHES[options.approachId];
  if (!source || !destination || source.id === destination.id) throw new Error("異なる既知市場を二つ選んでください");
  if (!MERCHANT_COMMODITIES[options.commodityId] || !approach) throw new Error("商品と運び方を選んでください");
  const jurisdictionIds = requireSettlementCharters(context, next, [source.id, destination.id]);
  const leader = availableStaff(company, options.leaderId, ["caravan_master", "guard_captain"]);
  if (company.treasury < approach.cost) throw new Error("販路契約の資金が不足しています");
  const sourceGood = marketForKnown(context, next, source).goods[options.commodityId];
  const destinationGood = marketForKnown(context, next, destination).goods[options.commodityId];
  const id = `route:${company.routes.length + 1}`;
  company.treasury = round1(company.treasury - approach.cost);
  company.routes.push({
    id, sourceId: source.id, sourceName: source.name, destinationId: destination.id, destinationName: destination.name,
    jurisdictionIds, commodityId: options.commodityId, commodityName: MERCHANT_COMMODITIES[options.commodityId].name,
    approachId: approach.id, leaderId: leader.id, status: "active", security: leader.roleId === "guard_captain" ? 24 : leader.skill * 2,
    quotedUnitMargin: round1(destinationGood.sellPrice - sourceGood.buyPrice), successfulRuns: 0, contractedPeriod: periodLabel(next), ledger: [],
  });
  leader.assignmentType = "route";
  leader.assignmentId = id;
  company.stats.routesSecured += 1;
  company.reputation += 1;
  addMessage(next, `${source.name}から${destination.name}への${MERCHANT_COMMODITIES[options.commodityId].name}販路を確保した。`);
  return next;
}

export function openV3CompanyBranch(context, state, options = {}) {
  const next = prepared(state);
  const company = next.merchant.company;
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  const settlement = getV3CurrentMarket(context, next);
  const format = COMPANY_BRANCH_FORMATS[options.formatId];
  const launch = COMPANY_LAUNCH_PLANS[options.launchId];
  if (!settlement) throw new Error("出店する市場まで歩いてください");
  if (!format || !launch) throw new Error("規模と開店方法を選んでください");
  const jurisdictionIds = requireSettlementCharters(context, next, [settlement.id]);
  const manager = availableStaff(company, options.managerId, ["factor", "buyer"]);
  const cost = format.cost + launch.cost;
  if (company.treasury < cost) throw new Error("出店資金が不足しています");
  if (company.branches.some((entry) => entry.settlementId === settlement.id && entry.status !== "closed")) throw new Error("この市場にはすでに支店があります");
  const id = `branch:${company.branches.length + 1}`;
  company.treasury = round1(company.treasury - cost);
  company.branches.push({
    id, settlementId: settlement.id, settlementName: settlement.name, jurisdictionIds,
    formatId: format.id, launchId: launch.id, managerId: manager.id, status: "preparing",
    preparationMonths: launch.months, preparationProgress: 0, ledger: [],
  });
  manager.assignmentType = "branch";
  manager.assignmentId = id;
  company.stats.branchesOpened += 1;
  addMessage(next, `${settlement.name}で${format.name}の出店準備を始めた。`);
  return next;
}

export function resolveV3CompanyIncident(state, incidentId, decisionId) {
  const next = prepared(state);
  const company = next.merchant.company;
  const incident = company.pendingIncidents.find((entry) => entry.id === incidentId);
  const route = company.routes.find((entry) => entry.id === incident?.routeId);
  if (!incident || !route) throw new Error("判断待ちの事故がありません");
  let outcome;
  if (decisionId === "escort") {
    if (company.treasury < 4) throw new Error("護衛増強には商会資金4が必要です");
    company.treasury = round1(company.treasury - 4);
    route.security = Math.min(100, route.security + 18);
    outcome = "護衛を増強した";
  } else if (decisionId === "detour") {
    route.delayMonths = 1;
    company.reputation = Math.max(0, company.reputation - 1);
    outcome = "一か月迂回した";
  } else if (decisionId === "take_loss") {
    const loss = Math.min(6, Math.max(0, company.treasury));
    company.treasury = round1(company.treasury - loss);
    company.reputation = Math.max(0, company.reputation - 2);
    outcome = `損失${loss}を受け入れた`;
  } else throw new Error("事故対応を選んでください");
  route.status = "active";
  company.pendingIncidents = company.pendingIncidents.filter((entry) => entry.id !== incidentId);
  company.incidentHistory.unshift({ ...incident, decisionId, outcome });
  addMessage(next, `${incident.title}：${outcome}。`);
  return next;
}

function runRouteMonth(context, state, route, ledger) {
  const company = state.merchant.company;
  const approach = COMPANY_ROUTE_APPROACHES[route.approachId];
  const leader = company.staff.find((entry) => entry.id === route.leaderId);
  const source = state.merchant.trade.knownSettlements.find((entry) => entry.id === route.sourceId);
  const destination = state.merchant.trade.knownSettlements.find((entry) => entry.id === route.destinationId);
  if (!source || !destination || !leader || !approach) {
    route.status = "paused";
    return;
  }
  if (route.delayMonths > 0) { route.delayMonths -= 1; return; }
  const risk = Math.max(0.02, approach.risk + (COMPANY_STRATEGIES[company.strategyId]?.routeRisk ?? 0) - route.security / 500);
  if (hashUnit(context.seed, periodLabel(state), route.id, route.successfulRuns) < risk) {
    const incident = { id: `incident:${periodIndex(state)}:${route.id}`, routeId: route.id, title: `${route.sourceName}—${route.destinationName}で街道事故`, period: periodLabel(state) };
    route.status = "blocked";
    company.pendingIncidents.push(incident);
    ledger.incidents.push(incident.id);
    return;
  }
  const sourceGood = marketForKnown(context, state, source).goods[route.commodityId];
  const destinationGood = marketForKnown(context, state, destination).goods[route.commodityId];
  if (!sourceGood || !destinationGood) {
    route.status = "paused";
    return;
  }
  const units = approach.volume + leader.skill;
  const margin = Math.max(0.4, destinationGood.sellPrice - sourceGood.buyPrice + 0.8);
  const gross = round1((margin * units + (COMPANY_STAFF_ROLES[leader.roleId]?.routeBonus ?? 0)) * approach.margin * (COMPANY_STRATEGIES[company.strategyId]?.routeMargin ?? 1));
  route.successfulRuns += 1;
  route.quotedUnitMargin = round1(destinationGood.sellPrice - sourceGood.buyPrice);
  ledger.revenue = round1(ledger.revenue + gross);
  ledger.costs = round1(ledger.costs + approach.operatingCost);
  ledger.routeResults.push({ routeId: route.id, revenue: gross, costs: approach.operatingCost });
  company.stats.routeRuns += 1;
}

export function advanceV3CompanyMonth(context, state) {
  const next = prepared(state);
  const company = next.merchant.company;
  if (company.status !== "company") throw new Error("商会がありません");
  next.clockMinutes += 30 * 24 * 60;
  const ledger = { period: periodLabel(next), revenue: 0, costs: 0, profit: 0, wages: 0, charterDues: 0, routeResults: [], branchResults: [], incidents: [] };
  ledger.wages = round1(company.staff.reduce((sum, entry) => sum + entry.wage, 0));
  ledger.charterDues = round1(company.charters.filter((entry) => entry.status === "active").reduce((sum, entry) => sum + (Number(entry.monthlyDue) || 0), 0));
  ledger.costs = round1(ledger.wages + ledger.charterDues);
  company.branches.forEach((branch) => {
    const format = COMPANY_BRANCH_FORMATS[branch.formatId];
    const launch = COMPANY_LAUNCH_PLANS[branch.launchId];
    const manager = company.staff.find((entry) => entry.id === branch.managerId);
    if (!format || !launch || !manager) {
      branch.status = "suspended";
      return;
    }
    if (branch.status === "preparing") {
      branch.preparationProgress += 1;
      if (branch.preparationProgress >= branch.preparationMonths) {
        branch.status = "open";
        company.reputation += launch.reputation;
      }
    }
    if (branch.status !== "open") return;
    const connected = company.routes.some((route) => route.status === "active" && route.destinationId === branch.settlementId);
    const revenue = round1(format.revenue + launch.revenueBonus + (COMPANY_STRATEGIES[company.strategyId]?.branchRevenue ?? 0) + (COMPANY_STAFF_ROLES[manager.roleId]?.branchBonus ?? 0) + manager.skill * 0.5 + (connected ? 2 : 0));
    ledger.revenue = round1(ledger.revenue + revenue);
    ledger.costs = round1(ledger.costs + format.monthlyCost);
    ledger.branchResults.push({ branchId: branch.id, revenue, costs: format.monthlyCost });
  });
  company.routes.forEach((route) => { if (route.status === "active") runRouteMonth(context, next, route, ledger); });
  ledger.profit = round1(ledger.revenue - ledger.costs);
  company.treasury = round1(company.treasury + ledger.profit);
  company.stats.totalProfit = round1(company.stats.totalProfit + ledger.profit);
  company.arrearsMonths = company.treasury < 0 ? company.arrearsMonths + 1 : 0;
  if (company.arrearsMonths >= 2) {
    company.routes.forEach((route) => { if (route.status === "active") route.status = "paused"; });
    company.branches.forEach((branch) => { if (branch.status === "open") branch.status = "suspended"; });
  }
  company.monthlyLedger.unshift(ledger);
  company.monthlyLedger = company.monthlyLedger.slice(0, 24);
  addMessage(next, `${ledger.period}の商会決算。損益${ledger.profit >= 0 ? "+" : ""}${ledger.profit}。`);
  return next;
}

export function getV3MerchantView(context, state) {
  const next = prepared(state);
  const company = next.merchant.company;
  const marketSettlement = getV3CurrentMarket(context, next);
  const market = marketSettlement ? getSettlementMarket(tradeAdapter(context, next, marketSettlement), marketSettlement) : null;
  const jurisdictions = knownJurisdictions(context, next).map((entry) => {
    const charter = activeCharter(company, entry.id);
    const application = company.charterApplications.find((candidate) => candidate.nationId === entry.id) ?? null;
    const decisions = application ? entry.procedure.decisions.map((decision) => ({
      ...decision,
      effectiveCost: Math.max(0, decision.cost - (application.decisionDiscount ?? 0)),
      eligible: !decision.minimumReputation || company.reputation >= decision.minimumReputation,
    })) : [];
    return { ...entry, charter: clone(charter), application: clone(application), decisions };
  });
  const available = company.staff.filter((entry) => !entry.assignmentId);
  const marketOptions = next.merchant.trade.knownSettlements.map((entry) => {
    const jurisdiction = jurisdictions.find((candidate) => candidate.settlementIds.includes(entry.id));
    return { id: entry.id, name: entry.name, nationName: jurisdiction?.name ?? "所在国", licensed: Boolean(jurisdiction?.charter) };
  });
  return {
    marketSettlement,
    market,
    cargo: clone(next.merchant.trade.cargo),
    cargoLoad: getMerchantCargoLoadDetails(tradeAdapter(context, next, marketSettlement)),
    tradeStats: clone(next.merchant.trade.stats),
    knownMarkets: clone(next.merchant.trade.knownSettlements),
    founding: foundingProgress(next),
    company: clone(company),
    strategies: Object.values(COMPANY_STRATEGIES),
    candidates: candidatePool(context, next).filter((candidate) => !company.staff.some((entry) => entry.candidateId === candidate.id)),
    jurisdictions,
    marketOptions,
    routeLeaders: clone(available.filter((entry) => ["caravan_master", "guard_captain"].includes(entry.roleId))),
    branchManagers: clone(available.filter((entry) => ["factor", "buyer"].includes(entry.roleId))),
    routeApproaches: Object.values(COMPANY_ROUTE_APPROACHES),
    branchFormats: Object.values(COMPANY_BRANCH_FORMATS),
    launchPlans: Object.values(COMPANY_LAUNCH_PLANS),
    commodities: Object.values(MERCHANT_COMMODITIES),
  };
}
