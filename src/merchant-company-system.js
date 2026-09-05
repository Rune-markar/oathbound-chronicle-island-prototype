import { MERCHANT_COMMODITIES, getSettlementMarket } from "./merchant-trade.js";
import { getGeneratedWorldView } from "./generated-world-system.js";
import { fnv1aCodePoints, unitFromHash } from "./determinism.js";
import { createIndividualDecisionProfile, TEMPERAMENTS } from "./race-decision-system.js";

const clone = (value) => structuredClone(value);
const round1 = (value) => Number(Number(value).toFixed(1));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const period = (state) => `${state.year ?? 317}-${state.month ?? 1}`;

export const MERCHANT_COMPANY_SCHEMA_VERSION = 2;

const charterOption = (id, name, description, extra = {}) => Object.freeze({
  id, name, description, cost: 0, monthlyDue: 0, reputation: 0, ...extra,
});

export const COMPANY_CHARTER_PROCEDURES = Object.freeze({
  republic: Object.freeze({
    id: "republic", name: "共和国の営業届出", authority: "商業登記所",
    summary: "許可を請う必要はない。必要事項を届ければ、その日から営業できる。",
    filings: Object.freeze([
      charterOption("standard_notice", "標準届出", "商会名、代表者、営業地を届ける。帳簿保存が義務になる。", { cost: 1, immediate: true, obligation: "取引帳簿を五年保存" }),
      charterOption("public_ledger", "公開帳簿で届ける", "主要な取引先まで公開し、市民からの信用を得る。", { cost: 2, immediate: true, reputation: 1, obligation: "主要取引先を年次公開" }),
    ]),
    decisions: Object.freeze([]),
  }),
  noble: Object.freeze({
    id: "noble", name: "貴族特許状", authority: "領主宮廷",
    summary: "領主の承認がなければ大規模な販路も常設店も持てない。まず謁見を願い出る。",
    filings: Object.freeze([
      charterOption("direct_audience", "自ら謁見を願う", "紹介者を立てず、宮廷へ商会の実績を示す。", { cost: 1 }),
      charterOption("court_broker", "宮廷仲介人を立てる", "費用を払い、条件交渉の公共投資額を軽くする。", { cost: 3, decisionDiscount: 1 }),
    ]),
    decisions: Object.freeze([
      charterOption("noble_share", "領主を後援者に迎える", "毎月の上納と引き換えに、領主名義の保護を受ける。", { monthlyDue: 1, obligation: "領主へ月次上納1" }),
      charterOption("market_works", "市場整備を請け負う", "一時金を出し、経営への直接介入を避ける。", { cost: 5, reputation: 2, obligation: "市場設備を商会負担で整備" }),
      charterOption("independent_patent", "独立商会の特許を求める", "信用だけを担保に介入のない特許を求める。信用10未満なら却下される。", { cost: 1, minimumReputation: 10, obligation: "価格法と度量衡令を遵守" }),
    ]),
  }),
  council: Object.freeze({
    id: "council", name: "都市・ギルド評議登録", authority: "商業評議会",
    summary: "都市や構成団体の同意が必要。共同体への参加方法を示して評議を受ける。",
    filings: Object.freeze([
      charterOption("guild_examination", "ギルド審査を受ける", "帳簿と人員を提出し、評議の席を待つ。", { cost: 2 }),
    ]),
    decisions: Object.freeze([
      charterOption("guild_bond", "営業保証金を積む", "保証金で取引上の責任を示す。", { cost: 4, obligation: "紛争時は評議会の仲裁に従う" }),
      charterOption("local_partner", "地元商人を共同人にする", "利益の一部を地域へ戻し、早く信用を得る。", { monthlyDue: 0.5, reputation: 1, obligation: "地元共同人へ月次配当0.5" }),
      charterOption("open_books", "帳簿を公開して審査を通す", "商会信用7以上なら追加負担なしで認められる。", { minimumReputation: 7, obligation: "評議会監査へ帳簿を公開" }),
    ]),
  }),
  temple: Object.freeze({
    id: "temple", name: "神殿営業認証", authority: "大神殿会計院",
    summary: "利得が教義と共同体を害さないことを誓い、神殿の認証を受ける。",
    filings: Object.freeze([
      charterOption("temple_review", "神殿審査を願う", "扱う商品と度量衡を申告する。", { cost: 1 }),
    ]),
    decisions: Object.freeze([
      charterOption("temple_tithe", "商会十分の一税を受け入れる", "神殿の保護と引き換えに定期献納を行う。", { monthlyDue: 1, obligation: "神殿へ月次献納1" }),
      charterOption("fair_measure_oath", "公正な度量衡を誓う", "一時金で公認の秤を整え、不正利得を禁じる。", { cost: 4, reputation: 1, obligation: "神殿公認の度量衡を使用" }),
      charterOption("secular_exception", "世俗商会の例外を求める", "信用12以上なら宗教献納なしの例外を得る。", { cost: 1, minimumReputation: 12, obligation: "救荒時の優先供出に応じる" }),
    ]),
  }),
  clan: Object.freeze({
    id: "clan", name: "氏族交易盟約", authority: "族長会議",
    summary: "紙の許可より、贈答と相互扶助の約束が営業資格になる。",
    filings: Object.freeze([
      charterOption("clan_guest_gift", "族長会議へ贈答する", "客人として迎えられ、盟約条件を話し合う。", { cost: 2 }),
    ]),
    decisions: Object.freeze([
      charterOption("kinship_compact", "氏族の保護下に入る", "保護を受ける代わりに毎月の贈答を続ける。", { monthlyDue: 0.5, obligation: "氏族へ月次贈答0.5" }),
      charterOption("local_hiring", "現地雇用を約束する", "地域の人員を優先し、共同体の一員として認められる。", { cost: 2, reputation: 1, obligation: "現地人員の優先雇用" }),
    ]),
  }),
  command: Object.freeze({
    id: "command", name: "官許営業証", authority: "軍政・官僚府",
    summary: "交易が兵站と治安へ影響するため、官庁の審査と供給義務を受ける。",
    filings: Object.freeze([
      charterOption("official_review", "官許審査へ出頭する", "責任者、倉庫、販路を官庁へ申告する。", { cost: 2 }),
    ]),
    decisions: Object.freeze([
      charterOption("supply_pledge", "非常時供給を約束する", "平時負担を避け、戦時の供出義務を負う。", { obligation: "非常時は在庫を優先供出" }),
      charterOption("security_bond", "治安保証金を積む", "一時金で官庁の直接介入を抑える。", { cost: 5, obligation: "密輸・禁制品の監査を受ける" }),
      charterOption("monthly_license", "月次許可料を払う", "少ない初期費用で営業を開始する。", { monthlyDue: 1, obligation: "官許料を毎月1納付" }),
    ]),
  }),
});

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
  return unitFromHash(fnv1aCodePoints(parts.join("|")));
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
    charters: [],
    charterApplications: [],
    charterHistory: [],
    pendingIncidents: [],
    incidentHistory: [],
    monthlyLedger: [],
    stats: { hires: 0, routesSecured: 0, branchesOpened: 0, routeRuns: 0, totalProfit: 0 },
  };
}

const PLAYER_GOVERNMENT_NAMES = Object.freeze({
  empire: "帝国", republic: "共和国", city_state: "都市国家", theocracy: "神権国家",
  nomadic_state: "遊牧国家", tribal_confederation: "部族連合", military_regime: "軍事政権",
  magocracy: "魔導国家", maritime_state: "海洋国家", federation: "連邦",
});

const PLAYER_GOVERNMENT_PROCEDURES = Object.freeze({
  republic: "republic", city_state: "council", federation: "council", maritime_state: "council",
  theocracy: "temple", nomadic_state: "clan", tribal_confederation: "clan",
  military_regime: "command", magocracy: "command", empire: "noble",
});

export function getCompanyCharterProcedure(government = {}) {
  const formId = government.formId ?? government.governmentFormId;
  if (PLAYER_GOVERNMENT_PROCEDURES[formId]) return COMPANY_CHARTER_PROCEDURES[PLAYER_GOVERNMENT_PROCEDURES[formId]];
  const name = String(government.government ?? government.name ?? "");
  if (/共和/.test(name)) return COMPANY_CHARTER_PROCEDURES.republic;
  if (/神権|神国|大神官|神殿/.test(name)) return COMPANY_CHARTER_PROCEDURES.temple;
  if (/氏族|部族|遊牧|大汗|族長/.test(name)) return COMPANY_CHARTER_PROCEDURES.clan;
  if (/軍政|軍事|魔導|官僚/.test(name)) return COMPANY_CHARTER_PROCEDURES.command;
  if (/評議|連邦|連合|同盟|都市国家/.test(name)) return COMPANY_CHARTER_PROCEDURES.council;
  return COMPANY_CHARTER_PROCEDURES.noble;
}

function generatedJurisdictions(state) {
  const injected = state.merchantCompanyContext?.jurisdictions;
  if (Array.isArray(injected)) {
    return clone(injected).map((entry) => ({
      ...entry,
      settlementIds: [...new Set(entry.settlementIds ?? [])],
      settlementNames: [...new Set(entry.settlementNames ?? [])],
      procedure: getCompanyCharterProcedure(entry),
    }));
  }
  const known = knownSettlements(state);
  let runtime;
  try { runtime = getGeneratedWorldView(state).runtime; } catch { runtime = null; }
  const entries = new Map();
  known.forEach((settlement) => {
    const region = runtime?.regionById.get(settlement.regionId);
    const nationId = settlement.nationId ?? region?.nationId ?? state.generatedWorld?.playerNationId ?? "unknown";
    const nation = runtime?.nationById.get(nationId);
    const isPlayerNation = nationId === state.generatedWorld?.playerNationId;
    const formId = state.player?.sovereign && isPlayerNation ? state.player.governmentFormId : null;
    const government = formId ? PLAYER_GOVERNMENT_NAMES[formId] : nation?.government ?? settlement.government ?? "地域政権";
    const current = entries.get(nationId) ?? {
      id: nationId,
      name: nation?.name ?? settlement.nationName ?? "所在国",
      government,
      formId,
      settlementIds: [],
      settlementNames: [],
    };
    current.settlementIds.push(settlement.id);
    current.settlementNames.push(settlement.name);
    entries.set(nationId, current);
  });
  return [...entries.values()].map((entry) => ({ ...entry, procedure: getCompanyCharterProcedure(entry) }));
}

function inferLegacyCharters(state, sourceVersion) {
  const company = state.player.merchantCompany;
  if (sourceVersion >= MERCHANT_COMPANY_SCHEMA_VERSION || company.status !== "company" || company.charters.length) return;
  generatedJurisdictions(state).forEach((jurisdiction) => {
    company.charters.push({
      id: `charter:legacy:${jurisdiction.id}`,
      nationId: jurisdiction.id,
      nationName: jurisdiction.name,
      government: jurisdiction.government,
      procedureId: "legacy",
      authority: "従来営業の継承",
      status: "active",
      basis: "既存商会の営業実績を新制度下で追認",
      obligation: "従来契約を遵守",
      monthlyDue: 0,
      grantedPeriod: period(state),
    });
  });
}

export function normalizeMerchantCompanyState(state) {
  if (!state?.player) return state;
  const base = baseline();
  const source = state.player.merchantCompany ?? {};
  const sourceVersion = Number(source.schemaVersion) || 1;
  state.player.merchantCompany = {
    ...base,
    ...source,
    schemaVersion: MERCHANT_COMPANY_SCHEMA_VERSION,
    staff: clone(source.staff ?? []),
    routes: clone(source.routes ?? []),
    branches: clone(source.branches ?? []),
    charters: clone(source.charters ?? []),
    charterApplications: clone(source.charterApplications ?? []),
    charterHistory: clone(source.charterHistory ?? []),
    pendingIncidents: clone(source.pendingIncidents ?? []),
    incidentHistory: clone(source.incidentHistory ?? []),
    monthlyLedger: clone(source.monthlyLedger ?? []),
    stats: { ...base.stats, ...(source.stats ?? {}) },
  };
  inferLegacyCharters(state, sourceVersion);
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

function activeCharter(company, nationId) {
  return company.charters.find((entry) => entry.nationId === nationId && entry.status === "active") ?? null;
}

function requireJurisdiction(state, nationId) {
  const jurisdiction = generatedJurisdictions(state).find((entry) => entry.id === nationId);
  if (!jurisdiction) throw new Error("営業国を特定できません");
  return jurisdiction;
}

function grantCharter(state, jurisdiction, procedure, option, application = null) {
  const company = state.player.merchantCompany;
  const discount = application?.decisionDiscount ?? 0;
  const cost = Math.max(0, option.cost - discount);
  if (company.treasury < cost) throw new Error("営業資格を得るための商会資金が不足しています");
  company.treasury = round1(company.treasury - cost);
  company.reputation = Math.max(0, company.reputation + option.reputation);
  const charter = {
    id: `charter:${jurisdiction.id}:${company.charters.length + 1}`,
    nationId: jurisdiction.id,
    nationName: jurisdiction.name,
    government: jurisdiction.government,
    procedureId: procedure.id,
    authority: procedure.authority,
    status: "active",
    basis: option.name,
    obligation: option.obligation,
    monthlyDue: option.monthlyDue,
    grantedPeriod: period(state),
  };
  company.charters.push(charter);
  companyLog(state, `${jurisdiction.name}で営業資格を取得`, `${procedure.authority}により「${option.name}」が認められた。義務：${option.obligation}。`);
  return charter;
}

export function startCompanyCharterApplication(state, nationId, filingId) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  if (company.status !== "company") throw new Error("商会の設立が必要です");
  if (activeCharter(company, nationId)) throw new Error("この国ではすでに営業できます");
  if (company.charterApplications.some((entry) => entry.nationId === nationId && entry.status === "pending")) throw new Error("この国では審査結果を待っています");
  const jurisdiction = requireJurisdiction(next, nationId);
  const procedure = jurisdiction.procedure;
  const filing = procedure.filings.find((entry) => entry.id === filingId);
  if (!filing) throw new Error("営業資格の申請方法を選んでください");
  if (company.treasury < filing.cost) throw new Error("申請費用の商会資金が不足しています");
  company.treasury = round1(company.treasury - filing.cost);
  if (filing.immediate) {
    grantCharter(next, jurisdiction, procedure, { ...filing, cost: 0 });
    company.charterHistory.unshift({ nationId, nationName: jurisdiction.name, procedureId: procedure.id, filingId, outcome: "granted", period: period(next) });
    return next;
  }
  const application = {
    id: `charter-application:${jurisdiction.id}:${company.charterApplications.length + company.charterHistory.length + 1}`,
    nationId: jurisdiction.id,
    nationName: jurisdiction.name,
    government: jurisdiction.government,
    procedureId: procedure.id,
    authority: procedure.authority,
    filingId: filing.id,
    filingName: filing.name,
    decisionDiscount: filing.decisionDiscount ?? 0,
    status: "pending",
    startedPeriod: period(next),
  };
  company.charterApplications.push(application);
  companyLog(next, `${jurisdiction.name}へ営業資格を申請`, `${procedure.authority}へ「${filing.name}」で手続きを始めた。次に提示条件を選ぶ。`);
  return next;
}

export function resolveCompanyCharterApplication(state, applicationId, decisionId) {
  const next = prepared(state);
  const company = next.player.merchantCompany;
  const application = company.charterApplications.find((entry) => entry.id === applicationId && entry.status === "pending");
  if (!application) throw new Error("判断待ちの営業資格申請がありません");
  const jurisdiction = requireJurisdiction(next, application.nationId);
  const procedure = COMPANY_CHARTER_PROCEDURES[application.procedureId];
  const decision = procedure?.decisions.find((entry) => entry.id === decisionId);
  if (!decision) throw new Error("提示された条件への答えを選んでください");
  if (decision.minimumReputation && company.reputation < decision.minimumReputation) {
    company.charterApplications = company.charterApplications.filter((entry) => entry.id !== application.id);
    company.charterHistory.unshift({ ...application, decisionId, outcome: "denied", reason: `商会信用${decision.minimumReputation}が必要`, resolvedPeriod: period(next) });
    company.reputation = Math.max(0, company.reputation - 1);
    companyLog(next, `${jurisdiction.name}の営業申請が却下`, `「${decision.name}」を申し出たが、商会信用${decision.minimumReputation}に届かず認められなかった。実績を積めば再申請できる。`);
    return next;
  }
  const charter = grantCharter(next, jurisdiction, procedure, decision, application);
  company.charterApplications = company.charterApplications.filter((entry) => entry.id !== application.id);
  company.charterHistory.unshift({ ...application, decisionId, outcome: "granted", charterId: charter.id, resolvedPeriod: period(next) });
  return next;
}

function requireChartersForSettlements(state, settlements) {
  const company = state.player.merchantCompany;
  const known = generatedJurisdictions(state);
  const requiredIds = new Set(settlements.map((settlement) => {
    const jurisdiction = known.find((entry) => entry.settlementIds.includes(settlement.id));
    if (!jurisdiction) throw new Error(`${settlement.name}の営業国を特定できません`);
    return jurisdiction.id;
  }));
  const missing = [...requiredIds].map((id) => known.find((entry) => entry.id === id)).filter((entry) => !activeCharter(company, entry.id));
  if (missing.length) throw new Error(`${missing.map((entry) => entry.name).join("・")}の営業資格が必要です`);
  return [...requiredIds];
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

const STAFF_DECISION_ROLES = Object.freeze({
  factor: "diplomat",
  buyer: "diplomat",
  caravan_master: "local_leader",
  guard_captain: "commander",
});

function candidateDecisionProfile(state, settlement, role, candidateId, seed) {
  let runtime = null;
  let nationId = settlement.nationId ?? null;
  let raceId = nationId ? state.merchantCompanyContext?.nationPeopleById?.[nationId] ?? null : null;
  if (!nationId || !raceId) {
    try { runtime = getGeneratedWorldView(state).runtime; } catch { runtime = null; }
    nationId ??= runtime?.regionById.get(settlement.regionId)?.nationId
      ?? state.generatedWorld?.playerNationId
      ?? null;
    raceId ??= state.merchantCompanyContext?.nationPeopleById?.[nationId]
      ?? runtime?.nationById.get(nationId)?.peopleId
      ?? runtime?.nations?.nations?.find((nation) => nation.id === nationId)?.peopleId
      ?? null;
  }
  const raceState = raceId ? state.generatedWorld?.raceDynamics?.races?.[raceId] : null;
  if (!raceState) return null;
  return createIndividualDecisionProfile(raceState, seed, {
    subjectId: candidateId,
    roleId: STAFF_DECISION_ROLES[role.id] ?? "citizen",
  });
}

function candidatePool(state) {
  const company = state.player.merchantCompany;
  if (company.status !== "company") return [];
  const places = knownSettlements(state);
  const seed = state.generatedWorld?.seed ?? state.rngSeed ?? "world";
  return Object.values(COMPANY_STAFF_ROLES).map((role, index) => {
    const settlement = places[index % Math.max(1, places.length)] ?? { id: "road", name: "街道" };
    const candidateId = `candidate:${role.id}:${settlement.id}`;
    const nameIndex = Math.floor(hashUnit(seed, company.foundedPeriod, role.id, settlement.id) * ROLE_NAMES[role.id].length);
    const skill = 1 + Math.floor(hashUnit(seed, role.id, settlement.id, "skill") * 3);
    const decisionProfile = candidateDecisionProfile(state, settlement, role, candidateId, seed);
    return {
      id: candidateId,
      name: ROLE_NAMES[role.id][nameIndex],
      roleId: role.id,
      roleName: role.name,
      description: role.description,
      skill,
      wage: 1 + skill,
      signingBonus: Math.max(1, 2 + skill - (COMPANY_STRATEGIES[company.strategyId]?.hiringDiscount ?? 0)),
      originSettlementId: settlement.id,
      originSettlementName: settlement.name,
      raceId: decisionProfile?.raceId ?? null,
      temperamentId: decisionProfile?.temperamentId ?? null,
      temperamentName: TEMPERAMENTS[decisionProfile?.temperamentId]?.name ?? null,
      decisionTraits: decisionProfile?.traits ?? null,
      individualDecisionOffsets: decisionProfile?.individualOffsets ?? null,
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
  const jurisdictionIds = requireChartersForSettlements(next, [source, destination]);
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
    jurisdictionIds,
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
  if (state.merchantCompanyContext?.currentSettlementId === settlement.id) return true;
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
  const jurisdictionIds = requireChartersForSettlements(next, [settlement]);
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
    jurisdictionIds,
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
  const sourceGood = state.marketSnapshots?.[route.sourceId]?.goods?.[route.commodityId];
  const destinationGood = state.marketSnapshots?.[route.destinationId]?.goods?.[route.commodityId];
  const usesWorldMarket = Boolean(sourceGood && destinationGood);
  const availableStock = usesWorldMarket ? Math.floor(sourceGood.inventory) : Infinity;
  const destinationCapacity = usesWorldMarket ? Math.floor(Math.max(0, destinationGood.capacity - destinationGood.inventory)) : Infinity;
  const units = Math.min(approach.volume + (leader?.skill ?? 1), availableStock, destinationCapacity);
  if (usesWorldMarket && units < 1) return { units: 0, revenue: 0, costs: 0, profit: 0, reason: "在庫または荷受余力不足" };
  if (usesWorldMarket) {
    sourceGood.inventory = round1(sourceGood.inventory - units);
    destinationGood.inventory = round1(destinationGood.inventory + units);
  }
  const marketMargin = Math.max(0.4, pair.unitMargin + 0.8);
  const gross = usesWorldMarket
    ? round1(pair.unitMargin * units)
    : round1((marketMargin * units + (COMPANY_STAFF_ROLES[leader?.roleId]?.routeBonus ?? 0)) * approach.margin * strategy.routeMargin);
  const profit = round1(gross - approach.operatingCost);
  route.successfulRuns += 1;
  route.quotedUnitMargin = pair.unitMargin;
  route.ledger.unshift({ period: period(state), units, gross, costs: approach.operatingCost, profit });
  route.ledger = route.ledger.slice(0, 12);
  company.stats.routeRuns += 1;
  if (route.successfulRuns % 3 === 0) company.reputation += 1;
  return { units, revenue: gross, costs: approach.operatingCost, profit };
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
  const entry = { period: period(state), revenue: 0, costs: 0, profit: 0, wages: 0, charterDues: 0, routeResults: [], branchResults: [], incidents: [] };
  company.charters.filter((charter) => charter.status === "active").forEach((charter) => {
    entry.charterDues = round1(entry.charterDues + (Number(charter.monthlyDue) || 0));
  });
  company.staff.forEach((staff) => { entry.wages = round1(entry.wages + staff.wage); });
  entry.costs = round1(entry.wages + entry.charterDues);
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
  const jurisdictions = generatedJurisdictions(next).map((jurisdiction) => {
    const charter = activeCharter(company, jurisdiction.id);
    const application = company.charterApplications.find((entry) => entry.nationId === jurisdiction.id && entry.status === "pending") ?? null;
    const decisions = application
      ? jurisdiction.procedure.decisions.map((decision) => ({
        ...decision,
        effectiveCost: Math.max(0, decision.cost - (application.decisionDiscount ?? 0)),
        eligible: !decision.minimumReputation || company.reputation >= decision.minimumReputation,
      }))
      : [];
    return { ...jurisdiction, charter: clone(charter), application: clone(application), decisions };
  });
  const availableStaff = company.staff.filter((entry) => !entry.assignmentId);
  const marketOption = (settlement) => {
    const jurisdiction = jurisdictions.find((entry) => entry.settlementIds.includes(settlement.id));
    return { id: settlement.id, name: settlement.name, nationId: jurisdiction?.id ?? null, nationName: jurisdiction?.name ?? "所在国", licensed: Boolean(jurisdiction?.charter) };
  };
  const sourceOptions = settlements.map(marketOption);
  const destinationOptions = settlements.map(marketOption);
  const routeLeaders = availableStaff.filter((entry) => ["caravan_master", "guard_captain"].includes(entry.roleId));
  const branchManagers = availableStaff.filter((entry) => ["factor", "buyer"].includes(entry.roleId));
  return {
    ...clone(company),
    founding: foundingProgress(next),
    strategies: Object.values(COMPANY_STRATEGIES),
    candidates: candidatePool(next).filter((candidate) => !company.staff.some((staff) => staff.candidateId === candidate.id)),
    jurisdictions,
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
