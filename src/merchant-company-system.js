import { MERCHANT_COMMODITIES, getSettlementMarket } from "./merchant-trade.js";

const clone = (value) => structuredClone(value);
const round1 = (value) => Number(Number(value).toFixed(1));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const period = (state) => `${state.year ?? 317}-${state.month ?? 1}`;

export const MERCHANT_COMPANY_SCHEMA_VERSION = 1;

export const COMPANY_STRATEGIES = Object.freeze({
  caravan: Object.freeze({ id: "caravan", name: "隊商本位", description: "販路の利益と街道対応を優先する。", routeMargin: 1.2, routeRisk: -0.04, branchRevenue: 0, hiringDiscount: 0 }),
  retail: Object.freeze({ id: "retail", name: "店舗本位", description: "出店後の売上と維持効率を優先する。", routeMargin: 1, routeRisk: 0, branchRevenue: 2, hiringDiscount: 0 }),
  network: Object.freeze({ id: "network", name: "人脈本位", description: "採用と地域提携を優先する。", routeMargin: 1, routeRisk: -0.01, branchRevenue: 1, hiringDiscount: 1 }),
});

export const COMPANY_STAFF_ROLES = Object.freeze({
  factor: Object.freeze({ id: "factor", name: "番頭", description: "支店を預かり、土地との折衝を行う。", branchBonus: 1.2, routeBonus: 0 }),
  buyer: Object.freeze({ id: "buyer", name: "仕入役", description: "相場と在庫を読み、粗利を守る。", branchBonus: 0.7, routeBonus: 0.8 }),
  caravan_master: Object.freeze({ id: "caravan_master", name: "隊商頭", description: "荷と日程を束ね、販路を動かす。", branchBonus: 0, routeBonus: 1.4 }),
  guard_captain: Object.freeze({ id: "guard_captain", name: "護衛頭", description: "事故率と損失を抑え、危険な道を通す。", branchBonus: 0, routeBonus: 0.5 }),
});

export const COMPANY_ROUTE_APPROACHES = Object.freeze({
  steady: Object.freeze({ id: "steady", name: "定期便", description: "利益と安全の均衡を取る。", cost: 4, operatingCost: 1.5, margin: 1, risk: 0.12, volume: 4 }),
  rush: Object.freeze({ id: "rush", name: "早馬便", description: "高値のうちに運ぶ。利益は大きいが事故も増える。", cost: 5, operatingCost: 2, margin: 1.45, risk: 0.36, volume: 5 }),
  escorted: Object.freeze({ id: "escorted", name: "護衛隊商", description: "費用を払い、損失と中断を抑える。", cost: 7, operatingCost: 3, margin: 0.9, risk: 0.05, volume: 5 }),
});

export const COMPANY_BRANCH_FORMATS = Object.freeze({
  stall: Object.freeze({ id: "stall", name: "市棚", description: "小さく始め、需要を確かめる。", cost: 6, monthlyCost: 1, revenue: 3 }),
  standard: Object.freeze({ id: "standard", name: "街道支店", description: "倉庫と売場を備えた標準店。", cost: 11, monthlyCost: 2, revenue: 6 }),
  premium: Object.freeze({ id: "premium", name: "大商館", description: "費用をかけて信用と取扱量を伸ばす。", cost: 19, monthlyCost: 4, revenue: 10 }),
});

export const COMPANY_LAUNCH_PLANS = Object.freeze({
  lean: Object.freeze({ id: "lean", name: "居抜き開店", description: "一か月で安く開くが地域信用は増えない。", cost: 0, months: 1, reputation: 0, revenueBonus: 0 }),
  local_partnership: Object.freeze({ id: "local_partnership", name: "地元商人と提携", description: "二か月かけて信用と固定客を作る。", cost: 2, months: 2, reputation: 3, revenueBonus: 1 }),
  promotion: Object.freeze({ id: "promotion", name: "開店大売出し", description: "先に費用を払い、一か月で客を集める。", cost: 4, months: 1, reputation: 1, revenueBonus: 2 }),
});

const ROLE_NAMES = Object.freeze({
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

function baseline() {
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
    pendingIncidents: [],
    incidentHistory: [],
    monthlyLedger: [],
    stats: { hires: 0, routesSecured: 0, branchesOpened: 0, routeRuns: 0, totalProfit: 0 },
  };
}

export function normalizeMerchantCompanyState(state) {
  if (!state?.player) return state;
  const base = baseline();
  const source = state.player.merchantCompany ?? {};
  state.player.merchantCompany = {
    ...base,
    ...source,
    schemaVersion: MERCHANT_COMPANY_SCHEMA_VERSION,
    staff: clone(source.staff ?? []),
    routes: clone(source.routes ?? []),
    branches: clone(source.branches ?? []),
    pendingIncidents: clone(source.pendingIncidents ?? []),
    incidentHistory: clone(source.incidentHistory ?? []),
    monthlyLedger: clone(source.monthlyLedger ?? []),
    stats: { ...base.stats, ...(source.stats ?? {}) },
  };
  return state;
}

function prepared(state) {
  const next = clone(state);
  normalizeMerchantCompanyState(next);
  return next;
}

function preparedView(state) {
  const next = { ...state, player: { ...state.player, merchantCompany: clone(state.player?.merchantCompany ?? {}) } };
  normalizeMerchantCompanyState(next);
  return next;
}

function companyLog(state, title, detail) {
  state.player.history ??= [];
  state.player.history.unshift({ id: `company:${state.turn ?? 0}:${state.player.history.length}`, type: "merchant_company", title, detail, summary: detail, year: state.year, month: state.month });
  state.player.history = state.player.history.slice(0, 60);
}

function foundingProgress(state) {
  const trade = state.player.merchantTrade ?? {};
  const stats = trade.stats ?? {};
  const requirements = [
    { id: "markets", label: "訪れた市場", value: trade.knownSettlements?.length ?? 0, target: 2 },
    { id: "sales", label: "個人で売った品", value: stats.unitsSold ?? 0, target: 3 },
    { id: "profit", label: "交易利益", value: round1(stats.realizedProfit ?? 0), target: 2 },
    { id: "wealth", label: "設立資金", value: round1(state.player.metrics?.wealth ?? 0), target: 24 },
  ];
  return { requirements, ready: requirements.every((entry) => entry.value >= entry.target), foundingCost: 12 };
}

function knownSettlements(state) {
  return clone(state.player.merchantTrade?.knownSettlements ?? []);
}

function candidatePool(state) {
  const company = state.player.merchantCompany;
  if (company.status !== "company") return [];
  const places = knownSettlements(state);
  const seed = state.generatedWorld?.seed ?? state.rngSeed ?? "world";
  return Object.values(COMPANY_STAFF_ROLES).map((role, index) => {
    const settlement = places[index % Math.max(1, places.length)] ?? { id: "road", name: "街道" };
    const nameIndex = Math.floor(hashUnit(seed, company.foundedPeriod, role.id, settlement.id) * ROLE_NAMES[role.id].length);
    const skill = 1 + Math.floor(hashUnit(seed, role.id, settlement.id, "skill") * 3);
    return {
      id: `candidate:${role.id}:${settlement.id}`,
      name: ROLE_NAMES[role.id][nameIndex],
      roleId: role.id,
      roleName: role.name,
      description: role.description,
      skill,
      wage: 1 + skill,
      signingBonus: Math.max(1, 2 + skill - (COMPANY_STRATEGIES[company.strategyId]?.hiringDiscount ?? 0)),
      originSettlementId: settlement.id,
      originSettlementName: settlement.name,
    };
  });
}

export function foundMerchantCompany(state, options = {}) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  const founding = foundingProgress(next);
  const strategy = COMPANY_STRATEGIES[options.strategyId];
  if (company.status === "company") throw new Error("商会はすでに設立されています");
  if (!founding.ready) throw new Error("二つの市場、売却三個、交易利益二、財産二四が必要です");
  if (!strategy) throw new Error("商会方針を選んでください");
  const name = String(options.name ?? `${next.player.name}商会`).trim().slice(0, 24);
  if (!name) throw new Error("商会名を決めてください");
  next.player.metrics.wealth = round1(next.player.metrics.wealth - founding.foundingCost);
  Object.assign(company, { status: "company", name, strategyId: strategy.id, foundedPeriod: period(next), treasury: founding.foundingCost, reputation: 4 });
  companyLog(next, `${name}を設立`, `${strategy.name}を掲げ、個人財産${founding.foundingCost}を運転資金へ移した。`);
  return next;
}

export function contributeCompanyCapital(state, amount) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  const value = Number(amount);
  if (company.status !== "company") throw new Error("商会がありません");
  if (!Number.isFinite(value) || value < 1) throw new Error("追加資金は一以上で指定してください");
  if (next.player.metrics.wealth < value) throw new Error("個人財産が不足しています");
  next.player.metrics.wealth = round1(next.player.metrics.wealth - value);
  company.treasury = round1(company.treasury + value);
  if (company.treasury >= 0) {
    company.arrearsMonths = 0;
    company.routes.forEach((route) => { if (route.status === "paused" && route.pauseReason === "資金不足") { route.status = "active"; route.pauseReason = null; } });
    company.branches.forEach((branch) => { if (branch.status === "suspended") branch.status = "open"; });
  }
  companyLog(next, "商会へ追加出資", `個人財産${value}を運転資金へ移した。`);
  return next;
}

export function recruitCompanyStaff(state, candidateId) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  if (company.staff.some((entry) => entry.candidateId === candidateId)) throw new Error("その人材はすでに雇用しています");
  const candidate = candidatePool(next).find((entry) => entry.id === candidateId);
  if (!candidate) throw new Error("採用候補が見つかりません");
  if (company.treasury < candidate.signingBonus) throw new Error("契約金が不足しています");
  company.treasury = round1(company.treasury - candidate.signingBonus);
  company.staff.push({ ...candidate, id: `staff:${company.staff.length + 1}:${candidate.roleId}`, candidateId, morale: 70, assignmentType: null, assignmentId: null, hiredPeriod: period(next) });
  company.stats.hires += 1;
  companyLog(next, `${candidate.name}を${candidate.roleName}に採用`, `契約金${candidate.signingBonus}、月給${candidate.wage}で迎えた。`);
  return next;
}

function requireAvailableStaff(company, staffId, roles) {
  const staff = company.staff.find((entry) => entry.id === staffId);
  if (!staff || !roles.includes(staff.roleId)) throw new Error("担当できる人員を選んでください");
  if (staff.assignmentId) throw new Error("その人員は別の仕事を担当しています");
  return staff;
}

function marketPair(state, source, destination, commodityId) {
  const sourceGood = getSettlementMarket(state, source).goods[commodityId];
  const destinationGood = getSettlementMarket(state, destination).goods[commodityId];
  return { sourceGood, destinationGood, unitMargin: round1(destinationGood.sellPrice - sourceGood.buyPrice) };
}

export function secureCompanyTradeRoute(state, options = {}) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  const source = knownSettlements(next).find((entry) => entry.id === options.sourceId);
  const destination = knownSettlements(next).find((entry) => entry.id === options.destinationId);
  const approach = COMPANY_ROUTE_APPROACHES[options.approachId];
  if (!source || !destination || source.id === destination.id) throw new Error("異なる既知の市場を二つ選んでください");
  if (!MERCHANT_COMMODITIES[options.commodityId]) throw new Error("扱う商品を選んでください");
  if (!approach) throw new Error("運び方を選んでください");
  const leader = requireAvailableStaff(company, options.leaderId, ["caravan_master", "guard_captain"]);
  if (company.treasury < approach.cost) throw new Error("販路契約の資金が不足しています");
  if (company.routes.some((entry) => entry.sourceId === source.id && entry.destinationId === destination.id && entry.commodityId === options.commodityId && entry.status !== "closed")) throw new Error("同じ販路はすでに確保しています");
  const pair = marketPair(next, source, destination, options.commodityId);
  const id = `route:${company.routes.length + 1}:${source.id}:${destination.id}`;
  company.treasury = round1(company.treasury - approach.cost);
  company.routes.push({
    id,
    sourceId: source.id,
    sourceName: source.name,
    destinationId: destination.id,
    destinationName: destination.name,
    commodityId: options.commodityId,
    commodityName: MERCHANT_COMMODITIES[options.commodityId].name,
    approachId: approach.id,
    leaderId: leader.id,
    status: "active",
    security: leader.roleId === "guard_captain" ? 18 + leader.skill * 4 : leader.skill * 2,
    contractedPeriod: period(next),
    quotedUnitMargin: pair.unitMargin,
    successfulRuns: 0,
    ledger: [],
  });
  leader.assignmentType = "route";
  leader.assignmentId = id;
  company.stats.routesSecured += 1;
  company.reputation += 1;
  companyLog(next, `${source.name}—${destination.name}の販路を確保`, `${leader.name}を責任者に、${MERCHANT_COMMODITIES[options.commodityId].name}の${approach.name}を始めた。`);
  return next;
}

function atSettlement(state, settlement) {
  if (state.player?.locationId === settlement.id) return true;
  const tileIds = [settlement.tileId, Number.isFinite(settlement.x) && Number.isFinite(settlement.y) ? `tile-${settlement.x}-${settlement.y}` : null, Number.isFinite(settlement.tileIndex) ? `tile-${settlement.tileIndex}` : null].filter(Boolean);
  return settlement.regionId === state.generatedWorld?.expeditionRegionId && tileIds.includes(state.generatedWorld?.expeditionTileId);
}

export function openCompanyBranch(state, settlement, options = {}) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  const format = COMPANY_BRANCH_FORMATS[options.formatId];
  const launch = COMPANY_LAUNCH_PLANS[options.launchId];
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  if (!settlement?.id || !knownSettlements(next).some((entry) => entry.id === settlement.id) || !atSettlement(next, settlement)) throw new Error("訪問済みの現在地で出店準備を行ってください");
  if (!format || !launch) throw new Error("店の規模と開店方法を選んでください");
  if (company.branches.some((entry) => entry.settlementId === settlement.id && entry.status !== "closed")) throw new Error("この集落にはすでに支店があります");
  const manager = requireAvailableStaff(company, options.managerId, ["factor", "buyer"]);
  const cost = format.cost + launch.cost;
  if (company.treasury < cost) throw new Error("出店資金が不足しています");
  const id = `branch:${company.branches.length + 1}:${settlement.id}`;
  company.treasury = round1(company.treasury - cost);
  company.branches.push({
    id,
    settlementId: settlement.id,
    settlementName: settlement.name,
    regionId: settlement.regionId,
    formatId: format.id,
    launchId: launch.id,
    managerId: manager.id,
    status: "preparing",
    preparationMonths: launch.months,
    preparationProgress: 0,
    openedPeriod: null,
    ledger: [],
  });
  manager.assignmentType = "branch";
  manager.assignmentId = id;
  company.stats.branchesOpened += 1;
  companyLog(next, `${settlement.name}で${format.name}の準備を開始`, `${manager.name}を店長に、${launch.name}で開店を進める。`);
  return next;
}

function routeRisk(state, route, leader) {
  const approach = COMPANY_ROUTE_APPROACHES[route.approachId];
  const strategy = COMPANY_STRATEGIES[state.player.merchantCompany.strategyId];
  const guardBonus = leader?.roleId === "guard_captain" ? 0.05 + leader.skill * 0.012 : 0;
  return clamp(approach.risk + strategy.routeRisk - route.security / 500 - guardBonus, 0.02, 0.6);
}

function createRouteIncident(state, route) {
  const company = state.player.merchantCompany;
  const incident = {
    id: `incident:${period(state)}:${route.id}`,
    routeId: route.id,
    title: `${route.sourceName}—${route.destinationName}で街道事故`,
    detail: `${route.commodityName}の荷が足止めされた。護衛増強、迂回、損失受入れから選ぶ必要がある。`,
    period: period(state),
  };
  route.status = "blocked";
  company.pendingIncidents.push(incident);
  return incident;
}

export function resolveCompanyIncident(state, incidentId, decisionId) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  const incident = company.pendingIncidents.find((entry) => entry.id === incidentId);
  const route = company.routes.find((entry) => entry.id === incident?.routeId);
  if (!incident || !route) throw new Error("対応する街道事故がありません");
  let outcome;
  if (decisionId === "escort") {
    if (company.treasury < 4) throw new Error("護衛増強の資金が不足しています");
    company.treasury = round1(company.treasury - 4);
    route.security = clamp(route.security + 18, 0, 100);
    outcome = "護衛を増やし、今後の事故率を下げた。";
  } else if (decisionId === "detour") {
    route.delayMonths = 1;
    company.reputation = Math.max(0, company.reputation - 1);
    outcome = "迂回路へ移り、次月の便を休止した。";
  } else if (decisionId === "take_loss") {
    const loss = Math.min(6, Math.max(0, company.treasury));
    company.treasury = round1(company.treasury - loss);
    company.reputation = Math.max(0, company.reputation - 2);
    outcome = `荷の損失${loss}を受け入れ、販路の継続を優先した。`;
  } else throw new Error("事故への対応を選んでください");
  route.status = "active";
  company.pendingIncidents = company.pendingIncidents.filter((entry) => entry.id !== incidentId);
  company.incidentHistory.unshift({ ...incident, decisionId, outcome });
  company.incidentHistory = company.incidentHistory.slice(0, 20);
  companyLog(next, incident.title, outcome);
  return next;
}

function routeMonthlyResult(state, route) {
  const company = state.player.merchantCompany;
  const approach = COMPANY_ROUTE_APPROACHES[route.approachId];
  const strategy = COMPANY_STRATEGIES[company.strategyId];
  const leader = company.staff.find((entry) => entry.id === route.leaderId);
  const source = knownSettlements(state).find((entry) => entry.id === route.sourceId);
  const destination = knownSettlements(state).find((entry) => entry.id === route.destinationId);
  const pair = source && destination ? marketPair(state, source, destination, route.commodityId) : { unitMargin: 0 };
  const units = approach.volume + (leader?.skill ?? 1);
  const marketMargin = Math.max(0.4, pair.unitMargin + 0.8);
  const gross = round1((marketMargin * units + (COMPANY_STAFF_ROLES[leader?.roleId]?.routeBonus ?? 0)) * approach.margin * strategy.routeMargin);
  const profit = round1(gross - approach.operatingCost);
  route.successfulRuns += 1;
  route.quotedUnitMargin = pair.unitMargin;
  route.ledger.unshift({ period: period(state), units, gross, costs: approach.operatingCost, profit });
  route.ledger = route.ledger.slice(0, 12);
  company.stats.routeRuns += 1;
  if (route.successfulRuns % 3 === 0) company.reputation += 1;
  return { revenue: gross, costs: approach.operatingCost, profit };
}

function branchMonthlyResult(state, branch) {
  const company = state.player.merchantCompany;
  const format = COMPANY_BRANCH_FORMATS[branch.formatId];
  const launch = COMPANY_LAUNCH_PLANS[branch.launchId];
  const strategy = COMPANY_STRATEGIES[company.strategyId];
  const manager = company.staff.find((entry) => entry.id === branch.managerId);
  const connected = company.routes.some((route) => route.status === "active" && route.destinationId === branch.settlementId);
  const gross = round1(format.revenue + launch.revenueBonus + strategy.branchRevenue + (COMPANY_STAFF_ROLES[manager?.roleId]?.branchBonus ?? 0) + (manager?.skill ?? 1) * 0.5 + (connected ? 2 : 0));
  const profit = round1(gross - format.monthlyCost);
  branch.ledger.unshift({ period: period(state), gross, costs: format.monthlyCost, profit, connected });
  branch.ledger = branch.ledger.slice(0, 12);
  return { revenue: gross, costs: format.monthlyCost, profit };
}

export function advanceMerchantCompanyMonthOnDraft(state) {
  normalizeMerchantCompanyState(state);
  const company = state.player.merchantCompany;
  if (company.status !== "company") return state;
  const entry = { period: period(state), revenue: 0, costs: 0, profit: 0, wages: 0, routeResults: [], branchResults: [], incidents: [] };
  company.staff.forEach((staff) => { entry.wages = round1(entry.wages + staff.wage); });
  entry.costs = entry.wages;
  company.branches.forEach((branch) => {
    if (branch.status === "preparing") {
      branch.preparationProgress += 1;
      const launch = COMPANY_LAUNCH_PLANS[branch.launchId];
      if (branch.preparationProgress >= branch.preparationMonths) {
        branch.status = "open";
        branch.openedPeriod = period(state);
        company.reputation += launch.reputation;
        companyLog(state, `${branch.settlementName}支店が開店`, `${COMPANY_BRANCH_FORMATS[branch.formatId].name}が営業を始めた。`);
      }
    }
    if (branch.status !== "open") return;
    const result = branchMonthlyResult(state, branch);
    entry.revenue = round1(entry.revenue + result.revenue);
    entry.costs = round1(entry.costs + result.costs);
    entry.branchResults.push({ branchId: branch.id, ...result });
  });
  company.routes.forEach((route) => {
    if (route.status !== "active") return;
    if (route.delayMonths > 0) { route.delayMonths -= 1; return; }
    const leader = company.staff.find((staff) => staff.id === route.leaderId);
    const roll = hashUnit(state.generatedWorld?.seed ?? "world", period(state), route.id, route.successfulRuns, "risk");
    if (roll < routeRisk(state, route, leader)) {
      const incident = createRouteIncident(state, route);
      entry.incidents.push(incident.id);
      return;
    }
    const result = routeMonthlyResult(state, route);
    entry.revenue = round1(entry.revenue + result.revenue);
    entry.costs = round1(entry.costs + result.costs);
    entry.routeResults.push({ routeId: route.id, ...result });
  });
  entry.profit = round1(entry.revenue - entry.costs);
  company.treasury = round1(company.treasury + entry.profit);
  company.stats.totalProfit = round1(company.stats.totalProfit + entry.profit);
  if (company.treasury < 0) company.arrearsMonths += 1;
  else company.arrearsMonths = 0;
  if (company.arrearsMonths >= 2) {
    company.routes.forEach((route) => { if (route.status === "active") { route.status = "paused"; route.pauseReason = "資金不足"; } });
    company.branches.forEach((branch) => { if (branch.status === "open") branch.status = "suspended"; });
    companyLog(state, "商会業務が資金不足で停止", "追加出資を行えば販路と支店を再開できる。倒産で年代記が終わることはない。");
  }
  company.monthlyLedger.unshift(entry);
  company.monthlyLedger = company.monthlyLedger.slice(0, 24);
  return state;
}

export function advanceMerchantCompanyMonth(state) {
  return advanceMerchantCompanyMonthOnDraft(clone(state));
}

export function getMerchantCompanyView(state) {
  const next = preparedView(state);
  const company = next.player.merchantCompany;
  const settlements = knownSettlements(next);
  const availableStaff = company.staff.filter((entry) => !entry.assignmentId);
  const sourceOptions = settlements.map((settlement) => ({ id: settlement.id, name: settlement.name }));
  const destinationOptions = settlements.map((settlement) => ({ id: settlement.id, name: settlement.name }));
  const routeLeaders = availableStaff.filter((entry) => ["caravan_master", "guard_captain"].includes(entry.roleId));
  const branchManagers = availableStaff.filter((entry) => ["factor", "buyer"].includes(entry.roleId));
  return {
    ...clone(company),
    founding: foundingProgress(next),
    strategies: Object.values(COMPANY_STRATEGIES),
    candidates: candidatePool(next).filter((candidate) => !company.staff.some((staff) => staff.candidateId === candidate.id)),
    sourceOptions,
    destinationOptions,
    routeLeaders: clone(routeLeaders),
    branchManagers: clone(branchManagers),
    routeApproaches: Object.values(COMPANY_ROUTE_APPROACHES),
    branchFormats: Object.values(COMPANY_BRANCH_FORMATS),
    launchPlans: Object.values(COMPANY_LAUNCH_PLANS),
    commodities: Object.values(MERCHANT_COMMODITIES),
  };
}
