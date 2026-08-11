import { evaluateCreed, evaluateCreedRelationship } from "./creed-system.js";
import { LISETTE_VALENNE_ID, UNIQUE_CHARACTER_POLITICS } from "./unique-characters.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const CAMPAIGN_ACTS = Object.freeze({
  preparation: Object.freeze({ id: "preparation", number: 1, name: "第一幕・備える", description: "道路規格、敵情、交渉窓口を整え、選べる決着手段を増やす。" }),
  resolution: Object.freeze({ id: "resolution", number: 2, name: "第二幕・決着する", description: "相互条約、武装妥協、限定戦争のいずれかで通行権を確保する。" }),
  aftermath: Object.freeze({ id: "aftermath", number: 3, name: "第三幕・定着させる", description: "得た通行権を、外交・交易・国境防衛の新しい秩序へ定着させる。" }),
  complete: Object.freeze({ id: "complete", number: 3, name: "完結", description: "灰冠峠の危機に一つの歴史的決着を与えた。" }),
});

export const BORDER_SETTLEMENTS = Object.freeze({
  mutual_treaty: Object.freeze({
    id: "mutual_treaty", name: "相互通行条約", threshold: 60,
    description: "差押え停止、相互通行、共同監視を一体の条約にする。関係改善が大きく、軍事負担は生じない。",
  }),
  armed_compromise: Object.freeze({
    id: "armed_compromise", name: "武装護送付き妥協", threshold: 24,
    description: "護送隊の常駐と限定関税を交換する。通行は確保できるが、敵意と維持負担が残る。",
  }),
});

export const AFTERMATH_POLICIES = Object.freeze({
  reconciliation: Object.freeze({ id: "reconciliation", name: "国境和解会議", description: "双方の商人と村落代表を常設会議へ入れ、再封鎖を政治的に難しくする。", months: 2 }),
  trade_corridor: Object.freeze({ id: "trade_corridor", name: "灰冠交易回廊", description: "道路規格と相互通行を一つの経済圏として運用し、三州の商業へ還元する。", months: 2 }),
  frontier_garrison: Object.freeze({ id: "frontier_garrison", name: "国境常備監視隊", description: "再封鎖へ即応できる常備隊を置く。安全は高まるが、食料と隣国関係に負担を残す。", months: 2 }),
});

export const AFTERMATH_DECISIONS = Object.freeze({
  reconciliation: Object.freeze([
    Object.freeze({
      id: "reconciliation_seats", stage: 0, title: "常設会議の議席", prompt: "新しい国境会議で、誰に最初の発言権を与えるか。",
      choices: Object.freeze([
        Object.freeze({ id: "guild_compromise", name: "両国商会を同数にする", description: "交易実務を優先し、会議を早く動かす。", impact: "ヴァルカ関係 +4 / ネレイア商業 +1" }),
        Object.freeze({ id: "village_parity", name: "国境村へ拒否権を与える", description: "時間と費用をかけ、封鎖の被害を受ける村落を制度の中心へ置く。", impact: "正統性 +2 / 全州民心 +1 / 王都金銭 -4" }),
        Object.freeze({ id: "crown_veto", name: "王権の最終裁定を残す", description: "国内の決定力を保つ代わりに、相手国の警戒を招く。", impact: "正統性 +3 / ヴァルカ関係 -2" }),
      ]),
    }),
    Object.freeze({
      id: "reconciliation_dispute", stage: 1, title: "最初の通行紛争", prompt: "共同監視の開始直後、積荷検査をめぐる衝突が起きた。",
      choices: Object.freeze([
        Object.freeze({ id: "joint_tribunal", name: "共同法廷へ付託する", description: "決着を急がず、新制度の判例にする。", impact: "ヴァルカ関係 +4 / 敵意 -2 / 正統性 +1" }),
        Object.freeze({ id: "compensate_caravan", name: "被害隊商へ補償する", description: "国庫で緊張を買い取り、国境住民の支持を得る。", impact: "王都金銭 -6 / ヴァルカ関係 +3 / オルタ民心 +2" }),
        Object.freeze({ id: "temporary_sanction", name: "違反商会を一時停止する", description: "国内規律を示すが、相手国との応酬を覚悟する。", impact: "オルタ治安 +2 / ヴァルカ関係 -3 / 敵意 +2" }),
      ]),
    }),
  ]),
  trade_corridor: Object.freeze([
    Object.freeze({
      id: "corridor_revenue", stage: 0, title: "回廊収入の配分", prompt: "最初の通行料を、王都・港・国境のどこへ戻すか。",
      choices: Object.freeze([
        Object.freeze({ id: "equal_split", name: "三州へ均等配分する", description: "即効性は薄いが、回廊を王国全体の事業にする。", impact: "全州商業 +1 / ヴァルカ関係 +2" }),
        Object.freeze({ id: "capital_priority", name: "王都財政を優先する", description: "国庫を立て直す一方、港湾州の反発を受ける。", impact: "王都金銭 +6 / ネレイア民心 -2 / ヴァルカ関係 -1" }),
        Object.freeze({ id: "border_fund", name: "国境整備基金に積む", description: "今月の国庫を使い、回廊の安全と港の流通を先に整える。", impact: "王都金銭 -4 / オルタ治安 +2 / ネレイア商業 +1" }),
      ]),
    }),
    Object.freeze({
      id: "corridor_rules", stage: 1, title: "回廊の運用規則", prompt: "交通量の増加で、速度・自由・検査を同時には守れなくなった。",
      choices: Object.freeze([
        Object.freeze({ id: "unified_standard", name: "統一規格を強制する", description: "移行期の補給を使い、長期の流通効率を取る。", impact: "全州商業 +1 / オルタ食料 -120" }),
        Object.freeze({ id: "merchant_charter", name: "認可商会へ運用を任せる", description: "港の成長を速める代わりに、公的統制を一歩引く。", impact: "ネレイア商業 +2 / 正統性 -1" }),
        Object.freeze({ id: "inspection_posts", name: "検査所を増設する", description: "速度より密輸防止を優先する。", impact: "オルタ治安 +2 / ヴァルカ関係 -1" }),
      ]),
    }),
  ]),
  frontier_garrison: Object.freeze([
    Object.freeze({
      id: "garrison_command", stage: 0, title: "監視隊の指揮権", prompt: "新設隊を共同運用・王国直轄・現地自治のどれに置くか。",
      choices: Object.freeze([
        Object.freeze({ id: "joint_patrol", name: "両国の共同巡察にする", description: "補給負担を負い、偶発衝突を減らす。", impact: "オルタ食料 -120 / ヴァルカ関係 +3 / 敵意 -1" }),
        Object.freeze({ id: "royal_command", name: "王国直轄隊にする", description: "即応力を最大化する代わりに、相手国を刺激する。", impact: "オルタ治安 +3 / ヴァルカ関係 -3" }),
        Object.freeze({ id: "local_militia", name: "国境民兵へ委ねる", description: "現地の支持を得るが、中央の統制は弱まる。", impact: "オルタ民心 +2 / 治安 +1 / 正統性 -1" }),
      ]),
    }),
    Object.freeze({
      id: "garrison_incident", stage: 1, title: "峠での武装接触", prompt: "所属不明の一隊が検問を突破し、監視隊が判断を求めている。",
      choices: Object.freeze([
        Object.freeze({ id: "show_restraint", name: "追跡を打ち切る", description: "安全上の不安を残しても、衝突の拡大を防ぐ。", impact: "ヴァルカ関係 +3 / オルタ治安 -1" }),
        Object.freeze({ id: "warning_shot", name: "警告射撃で停止させる", description: "国境統制を示すが、敵意の再燃を招く。", impact: "オルタ治安 +2 / ヴァルカ関係 -2 / 敵意 +2" }),
        Object.freeze({ id: "border_compensation", name: "拘束後に補償して返す", description: "費用を払い、統制と外交の両方を最低限守る。", impact: "王都金銭 -5 / ヴァルカ関係 +2 / オルタ民心 +1" }),
      ]),
    }),
  ]),
});

export const OFFICER_DEMAND_RESPONSES = Object.freeze({
  accept: Object.freeze({ id: "accept", name: "受諾", impact: "忠誠 +2 / 不満 -2 / 3か月以内に支持任務が必要" }),
  negotiate: Object.freeze({ id: "negotiate", name: "条件交渉", impact: "忠誠 +1 / 不満 -1 / 所在都市の金銭 -3" }),
  refuse: Object.freeze({ id: "refuse", name: "拒否", impact: "忠誠 -3 / 不満 +3" }),
});

export const OFFICER_POLITICS = Object.freeze({
  edras: Object.freeze({ faction: "制度派", origin: "王都官僚", ambition: "三州を同じ法と帳簿で結ぶ", agenda: "制度統一と財政規律", supports: ["admin.", "research.", "debt."], opposes: ["military.mobilize"] }),
  mara: Object.freeze({ faction: "通商派", origin: "南河州商家", ambition: "銀脈河と灰冠峠を一つの市場にする", agenda: "外交・交易・地域合意", supports: ["diplomacy.", "city.commerce", "welfare."], opposes: ["diplomacy.pressure", "military.mobilize"] }),
  gaius: Object.freeze({ faction: "国境派", origin: "東境州軍門", ambition: "中央に頼らず峠を守れる軍を作る", agenda: "防衛・兵站・治安", supports: ["military.", "city.drill", "city.repair", "diplomacy.pressure"], opposes: ["diplomacy.concession"] }),
  sera: Object.freeze({ faction: "実証派", origin: "王国情報府", ambition: "推測ではなく確証で国策を決めさせる", agenda: "情報・正当化・慎重な決着", supports: ["navy.soundings", "diplomacy.mediation", "diplomacy.justify", "research."], opposes: ["military.mobilize"] }),
  ilva: Object.freeze({ faction: "技術派", origin: "峠の在野測量士", ambition: "地図と現地知を公的制度に残す", agenda: "測量・道路・現地自治", supports: ["navy.soundings", "admin.", "city.repair"], opposes: [] }),
  dario: Object.freeze({ faction: "武勲派", origin: "放浪軍", ambition: "国境戦で正規軍の席を得る", agenda: "機動防衛と軍功", supports: ["military.", "city.drill", "diplomacy.pressure"], opposes: ["diplomacy.concession"] }),
  mirel: Object.freeze({ faction: "越境商人派", origin: "ヴァルカ系商人", ambition: "国境を越える商会の発言権を得る", agenda: "相互通行・仲介・商業", supports: ["diplomacy.", "city.commerce"], opposes: ["diplomacy.pressure", "diplomacy.justify"] }),
  ...UNIQUE_CHARACTER_POLITICS,
});

export const FOREIGN_AGENDAS = Object.freeze({
  valka: Object.freeze({ name: "国境主導権", intents: ["関税圧力", "会談条件の再計算", "峠守備の増強"] }),
  vinia: Object.freeze({ name: "勢力均衡", intents: ["限定仲介", "国境監視", "均衡動員"] }),
  forest_alliance: Object.freeze({ name: "通商協調", intents: ["隊商支援", "共同市場", "中立仲介"] }),
  lustrond: Object.freeze({ name: "慎重中立", intents: ["停戦仲介", "交易観測", "国境静観"] }),
  izmenia: Object.freeze({ name: "機会獲得", intents: ["南路動員", "交易転換", "外交取引"] }),
  heavens_gate: Object.freeze({ name: "大陸秩序", intents: ["秩序勧告", "介入準備", "条約保証"] }),
  deadland: Object.freeze({ name: "冥府不介入", intents: ["国境封鎖", "情報収集", "限定交易"] }),
  great_empire: Object.freeze({ name: "帝国均衡", intents: ["大国声明", "市場圧力", "軍備査閲"] }),
  avanheln: Object.freeze({ name: "山岳守勢", intents: ["峠監視", "防衛協議", "中立保証"] }),
});

function freshCampaign(state) {
  return {
    act: "preparation", actStartedTurn: state.turn ?? 0, resolution: null,
    aftermathPolicy: null, aftermathMonths: 0, aftermathDecisions: [], ending: null, completedTurn: null, history: [],
  };
}

function freshNegotiation() {
  return {
    status: "not_started", demand: "灰冠峠の相互通行権", progress: 0, leverage: 0,
    concessions: [], bargainingMoves: [], mediator: null, mediatorSupport: 0, deadlineTurn: null, attempts: 0, outcome: null,
  };
}

function addStrategicRecord(state, record) {
  state.campaign.history.unshift({
    id: record.id ?? `decision-${state.year}-${state.month}-${state.campaign.history.length + 1}`,
    year: state.year, month: state.month, turn: state.turn, ...record,
  });
  state.campaign.history = state.campaign.history.slice(0, 80);
}

function setBond(state, leftId, rightId, delta) {
  if (!state.officers[leftId] || !state.officers[rightId] || leftId === rightId) return;
  state.officers[leftId].bonds ??= {};
  state.officers[rightId].bonds ??= {};
  const left = state.officers[leftId].bonds[rightId] ?? 20;
  const right = state.officers[rightId].bonds[leftId] ?? 20;
  state.officers[leftId].bonds[rightId] = clamp(left + delta, 0, 100);
  state.officers[rightId].bonds[leftId] = clamp(right + delta, 0, 100);
}

export function normalizeStrategicState(world, state) {
  state.campaign ??= freshCampaign(state);
  state.campaign.act ??= "preparation";
  state.campaign.actStartedTurn ??= state.turn ?? 0;
  state.campaign.resolution ??= null;
  state.campaign.aftermathPolicy ??= null;
  state.campaign.aftermathMonths ??= 0;
  state.campaign.aftermathDecisions ??= [];
  state.campaign.ending ??= null;
  state.campaign.completedTurn ??= null;
  state.campaign.history ??= [];
  state.negotiation ??= freshNegotiation();
  Object.assign(state.negotiation, {
    status: state.negotiation.status ?? "not_started",
    demand: state.negotiation.demand ?? "灰冠峠の相互通行権",
    progress: Number.isFinite(state.negotiation.progress) ? state.negotiation.progress : 0,
    leverage: Number.isFinite(state.negotiation.leverage) ? state.negotiation.leverage : 0,
    concessions: state.negotiation.concessions ?? [],
    bargainingMoves: state.negotiation.bargainingMoves ?? [],
    mediator: state.negotiation.mediator ?? null,
    mediatorSupport: Number.isFinite(state.negotiation.mediatorSupport) ? state.negotiation.mediatorSupport : 0,
    deadlineTurn: Number.isInteger(state.negotiation.deadlineTurn) ? state.negotiation.deadlineTurn : null,
    attempts: Number.isFinite(state.negotiation.attempts) ? state.negotiation.attempts : 0,
    outcome: state.negotiation.outcome ?? null,
  });
  state.politics ??= { reactions: [], promises: [] };
  state.politics.reactions ??= [];
  state.politics.promises ??= [];
  state.monthlyPoliticalReactions ??= [];
  state.foreignDispatches ??= [];
  Object.entries(state.officers ?? {}).forEach(([officerId, officer]) => {
    const profile = OFFICER_POLITICS[officerId];
    officer.politicalCapital = Number.isFinite(officer.politicalCapital) ? officer.politicalCapital : Math.max(0, Math.round((officer.rankLevel ?? 0) * 8 + (officer.merit ?? 0) / 30));
    officer.resentment = Number.isFinite(officer.resentment) ? officer.resentment : 0;
    officer.lastDemandResponseTurn = Number.isInteger(officer.lastDemandResponseTurn) ? officer.lastDemandResponseTurn : null;
    officer.faction = officer.faction ?? profile?.faction ?? "無所属";
  });
  Object.entries(state.foreignStates ?? {}).forEach(([countryId, country]) => {
    const agenda = FOREIGN_AGENDAS[countryId];
    country.agenda = country.agenda ?? agenda?.name ?? country.stance ?? "現状維持";
    country.intent = country.intent ?? agenda?.intents?.[0] ?? "情勢観測";
    country.agendaProgress = Number.isFinite(country.agendaProgress) ? country.agendaProgress : 0;
  });
  if (state.completedCommands?.includes("diplomacy.talks") && state.negotiation.status === "not_started") {
    state.negotiation.status = "open";
    state.negotiation.progress = Math.max(38, state.negotiation.progress);
    state.negotiation.deadlineTurn = (state.turn ?? 0) + 4;
  }
  if (state.agreements?.transit || state.issues?.border?.status === "resolved") {
    state.negotiation.status = "settled";
    state.negotiation.outcome ??= state.campaign.resolution ?? "legacy_settlement";
    state.campaign.resolution ??= "legacy_settlement";
    if (!state.campaign.ending) state.campaign.act = "aftermath";
  }
  return state;
}

export function getEffectiveCampaignAct(state) {
  if (state.campaign?.ending) return "complete";
  if (state.agreements?.transit || state.issues?.border?.status === "resolved") return "aftermath";
  const prepared = state.issues?.standards?.status === "resolved"
    && state.issues?.reports?.status === "resolved"
    && state.negotiation?.status !== "not_started";
  return prepared ? "resolution" : "preparation";
}

export function getBorderNegotiationState(world, state) {
  const negotiation = state.negotiation ?? freshNegotiation();
  const relation = state.foreignStates?.valka?.relation ?? -31;
  const hostility = state.foreignStates?.valka?.hostility ?? 50;
  const preparationLeverage = (state.issues?.standards?.status === "resolved" ? 12 : 0)
    + (state.issues?.reports?.status === "resolved" ? 12 : 0)
    + (state.agreements?.trade ? 7 : 0)
    + (state.agreements?.aid ? 5 : 0);
  const leverage = clamp(negotiation.leverage + preparationLeverage, 0, 100);
  const relationContribution = clamp((relation + 35) * 0.45, -15, 22);
  const concessionContribution = negotiation.concessions.length * 9;
  const deadlineRemaining = negotiation.deadlineTurn === null ? null : negotiation.deadlineTurn - state.turn;
  const deadlinePenalty = deadlineRemaining !== null && deadlineRemaining < 0 ? Math.min(18, Math.abs(deadlineRemaining) * 4) : 0;
  const acceptance = clamp(Math.round(
    negotiation.progress + leverage + relationContribution + concessionContribution
    + negotiation.mediatorSupport - Math.max(0, hostility - 50) * 0.25 - deadlinePenalty,
  ), 0, 100);
  const talksCompleted = negotiation.status !== "not_started" || Boolean(state.completedCommands?.includes("diplomacy.talks"));
  const transitSecured = Boolean(state.agreements?.transit || state.issues?.border?.status === "resolved");
  const bargainingMoves = negotiation.bargainingMoves ?? [];
  const hasBargainingMove = bargainingMoves.length > 0;
  const treatyAllowed = talksCompleted && hasBargainingMove && !transitSecured && acceptance >= BORDER_SETTLEMENTS.mutual_treaty.threshold;
  const compromiseAllowed = talksCompleted && hasBargainingMove && !transitSecured && negotiation.progress >= 35 && leverage >= BORDER_SETTLEMENTS.armed_compromise.threshold;
  const bargainingLabel = bargainingMoves.length
    ? bargainingMoves.map((move) => ({ concession: "関税譲歩", mediation: "第三国仲介", pressure: "武装圧力" }[move] ?? move)).join(" / ")
    : "未実施";
  return {
    ...negotiation, relation, openingRelation: -31, relationshipGain: relation + 31,
    leverage, preparationLeverage, acceptance, deadlineRemaining, talksCompleted, transitSecured,
    bargainingMoves, bargainingLabel, hasBargainingMove,
    meetingProgress: transitSecured ? 100 : talksCompleted ? clamp(Math.round(25 + acceptance * 0.75), 25, 95) : 0,
    status: transitSecured ? "通行権を確保" : talksCompleted ? "正式交渉中" : "国境会談は未実施",
    description: transitSecured
      ? "外交または講和で灰冠峠の通行権が条約化されています。第三幕で新秩序を定着させてください。"
      : talksCompleted
        ? `要求「${negotiation.demand}」を協議中です。受諾見込み ${acceptance}、交渉力 ${leverage}${deadlineRemaining === null ? "" : `、期限まで${Math.max(0, deadlineRemaining)}か月`}。最終案の提示には、譲歩・仲介・武装圧力のいずれか一手が必要です。`
        : "使節任務で正式要求を提示すると、譲歩、第三国仲介、武装圧力、限定戦争を比較できるようになります。",
    offers: [
      { ...BORDER_SETTLEMENTS.mutual_treaty, allowed: treatyAllowed, reason: treatyAllowed ? "最終案を提示可能" : !hasBargainingMove ? "交渉手段を一つ実行してください" : `受諾見込み ${acceptance} / 必要 ${BORDER_SETTLEMENTS.mutual_treaty.threshold}` },
      { ...BORDER_SETTLEMENTS.armed_compromise, allowed: compromiseAllowed, reason: compromiseAllowed ? "交渉力を背景に提示可能" : !hasBargainingMove ? "交渉手段を一つ実行してください" : `交渉力 ${leverage} / 必要 ${BORDER_SETTLEMENTS.armed_compromise.threshold}` },
    ],
  };
}

export function applyDiplomacyCommand(world, state, task, outcome) {
  normalizeStrategicState(world, state);
  const negotiation = state.negotiation;
  if (task.commandId === "diplomacy.talks") {
    negotiation.status = "open";
    negotiation.progress = clamp(negotiation.progress + 36 + Math.round(outcome / 7), 0, 100);
    negotiation.deadlineTurn = state.turn + 4;
    negotiation.attempts += 1;
    addStrategicRecord(state, { type: "negotiation", title: "灰冠峠の正式交渉を開始", causes: ["隊商差押え", "国境会談"], effects: ["相互条約と武装妥協を解禁"] });
  }
  if (task.commandId === "diplomacy.concession") {
    if (!negotiation.concessions.includes("共同関税上限")) negotiation.concessions.push("共同関税上限");
    if (!negotiation.bargainingMoves.includes("concession")) negotiation.bargainingMoves.push("concession");
    negotiation.progress = clamp(negotiation.progress + 12, 0, 100);
    state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation + 4, -100, 100);
  }
  if (task.commandId === "diplomacy.mediation") {
    if (!negotiation.bargainingMoves.includes("mediation")) negotiation.bargainingMoves.push("mediation");
    const candidates = Object.entries(state.foreignStates)
      .filter(([countryId]) => countryId !== "valka")
      .sort((left, right) => right[1].relation - left[1].relation);
    negotiation.mediator = candidates[0]?.[0] ?? "vinia";
    negotiation.mediatorSupport = clamp(negotiation.mediatorSupport + 14 + Math.round(outcome / 20), 0, 30);
    negotiation.progress = clamp(negotiation.progress + 8, 0, 100);
  }
  if (task.commandId === "diplomacy.pressure") {
    if (!negotiation.bargainingMoves.includes("pressure")) negotiation.bargainingMoves.push("pressure");
    negotiation.leverage = clamp(negotiation.leverage + 16 + Math.round(outcome / 18), 0, 100);
    state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation - 5, -100, 100);
    state.foreignStates.valka.hostility = clamp(state.foreignStates.valka.hostility + 6, 0, 100);
    state.justification = clamp(state.justification + 3, 0, 100);
  }
}

export function applyBorderSettlement(world, state, settlementId) {
  normalizeStrategicState(world, state);
  const status = getBorderNegotiationState(world, state);
  const offer = status.offers.find((item) => item.id === settlementId);
  if (!offer) throw new Error("不明な国境決着案です");
  if (!offer.allowed) throw new Error(offer.reason);
  state.agreements.transit = true;
  state.issues.border.status = "resolved";
  state.issues.border.severity = 0;
  state.negotiation.status = "settled";
  state.negotiation.outcome = settlementId;
  state.campaign.resolution = settlementId;
  state.campaign.act = "aftermath";
  state.campaign.actStartedTurn = state.turn;
  if (settlementId === "mutual_treaty") {
    state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation + 12, -100, 100);
    state.foreignStates.valka.hostility = clamp(state.foreignStates.valka.hostility - 10, 0, 100);
    state.agreements.trade = true;
    state.legitimacy = clamp(state.legitimacy + 3, 0, 100);
  } else {
    state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation - 4, -100, 100);
    state.foreignStates.valka.hostility = clamp(state.foreignStates.valka.hostility + 5, 0, 100);
    state.cities.orta.resources.security = clamp(state.cities.orta.resources.security + 2, 0, 100);
    state.cities.orta.resources.food = Math.max(0, state.cities.orta.resources.food - 180);
  }
  addStrategicRecord(state, {
    type: "border_settlement", title: offer.name,
    causes: [`受諾見込み ${status.acceptance}`, `交渉力 ${status.leverage}`, status.mediator ? `${world.countries[status.mediator]?.name ?? status.mediator}の仲介` : "二国間交渉"],
    effects: ["灰冠峠の通行権確保", settlementId === "mutual_treaty" ? "交易協定成立" : "武装護送負担"],
  });
  return { name: offer.name, settlementId };
}

export function applyAftermathPolicy(world, state, policyId) {
  normalizeStrategicState(world, state);
  const policy = AFTERMATH_POLICIES[policyId];
  if (!policy) throw new Error("不明な戦後方針です");
  if (!(state.agreements.transit || state.issues.border.status === "resolved")) throw new Error("国境決着前に戦後方針は選べません");
  if (state.campaign.aftermathPolicy) throw new Error("戦後方針はすでに決定済みです");
  state.campaign.aftermathPolicy = policyId;
  state.campaign.aftermathMonths = 0;
  state.campaign.act = "aftermath";
  if (policyId === "reconciliation") {
    state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation + 6, -100, 100);
    state.legitimacy = clamp(state.legitimacy + 2, 0, 100);
  }
  if (policyId === "trade_corridor") {
    Object.values(state.cities).forEach((city) => { city.resources.commerce = clamp(city.resources.commerce + 2, 0, 100); });
    state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation + 3, -100, 100);
  }
  if (policyId === "frontier_garrison") {
    state.cities.orta.resources.security = clamp(state.cities.orta.resources.security + 5, 0, 100);
    state.cities.orta.resources.food = Math.max(0, state.cities.orta.resources.food - 240);
    state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation - 3, -100, 100);
  }
  addStrategicRecord(state, { type: "aftermath_policy", title: policy.name, causes: ["国境通行権の確保"], effects: [policy.description, `${policy.months}か月の定着期間`] });
  return policy;
}

export function getPendingAftermathDecision(world, state) {
  normalizeStrategicState(world, state);
  if (state.campaign.ending || !state.campaign.aftermathPolicy) return null;
  const decisions = AFTERMATH_DECISIONS[state.campaign.aftermathPolicy] ?? [];
  const decision = decisions.find((item) => item.stage === state.campaign.aftermathMonths);
  if (!decision) return null;
  const resolved = state.campaign.aftermathDecisions.some((item) => item.decisionId === decision.id);
  return resolved ? null : { ...decision, policyId: state.campaign.aftermathPolicy };
}

export function applyAftermathDecision(world, state, choiceId) {
  normalizeStrategicState(world, state);
  const decision = getPendingAftermathDecision(world, state);
  if (!decision) throw new Error("現在決めるべき第三幕の裁定はありません");
  const choice = decision.choices.find((item) => item.id === choiceId);
  if (!choice) throw new Error("不明な第三幕の裁定案です");
  const valka = state.foreignStates.valka;
  const selene = state.cities.selene.resources;
  const nereia = state.cities.nereia.resources;
  const orta = state.cities.orta.resources;
  const adjust = (resource, key, delta, minimum = 0, maximum = 100) => {
    resource[key] = clamp((resource[key] ?? 0) + delta, minimum, maximum);
  };
  const adjustRelation = (delta) => { valka.relation = clamp(valka.relation + delta, -100, 100); };
  const adjustHostility = (delta) => { valka.hostility = clamp(valka.hostility + delta, 0, 100); };
  const adjustLegitimacy = (delta) => { state.legitimacy = clamp(state.legitimacy + delta, 0, 100); };

  if (choiceId === "guild_compromise") { adjustRelation(4); adjust(nereia, "commerce", 1); }
  if (choiceId === "village_parity") { adjustLegitimacy(2); Object.values(state.cities).forEach((city) => adjust(city.resources, "support", 1)); adjust(selene, "money", -4, 0, Number.MAX_SAFE_INTEGER); }
  if (choiceId === "crown_veto") { adjustLegitimacy(3); adjustRelation(-2); }
  if (choiceId === "joint_tribunal") { adjustRelation(4); adjustHostility(-2); adjustLegitimacy(1); }
  if (choiceId === "compensate_caravan") { adjust(selene, "money", -6, 0, Number.MAX_SAFE_INTEGER); adjustRelation(3); adjust(orta, "support", 2); }
  if (choiceId === "temporary_sanction") { adjust(orta, "security", 2); adjustRelation(-3); adjustHostility(2); }
  if (choiceId === "equal_split") { Object.values(state.cities).forEach((city) => adjust(city.resources, "commerce", 1)); adjustRelation(2); }
  if (choiceId === "capital_priority") { adjust(selene, "money", 6, 0, Number.MAX_SAFE_INTEGER); adjust(nereia, "support", -2); adjustRelation(-1); }
  if (choiceId === "border_fund") { adjust(selene, "money", -4, 0, Number.MAX_SAFE_INTEGER); adjust(orta, "security", 2); adjust(nereia, "commerce", 1); }
  if (choiceId === "unified_standard") { Object.values(state.cities).forEach((city) => adjust(city.resources, "commerce", 1)); adjust(orta, "food", -120, 0, Number.MAX_SAFE_INTEGER); }
  if (choiceId === "merchant_charter") { adjust(nereia, "commerce", 2); adjustLegitimacy(-1); }
  if (choiceId === "inspection_posts") { adjust(orta, "security", 2); adjustRelation(-1); }
  if (choiceId === "joint_patrol") { adjust(orta, "food", -120, 0, Number.MAX_SAFE_INTEGER); adjustRelation(3); adjustHostility(-1); }
  if (choiceId === "royal_command") { adjust(orta, "security", 3); adjustRelation(-3); }
  if (choiceId === "local_militia") { adjust(orta, "support", 2); adjust(orta, "security", 1); adjustLegitimacy(-1); }
  if (choiceId === "show_restraint") { adjustRelation(3); adjust(orta, "security", -1); }
  if (choiceId === "warning_shot") { adjust(orta, "security", 2); adjustRelation(-2); adjustHostility(2); }
  if (choiceId === "border_compensation") { adjust(selene, "money", -5, 0, Number.MAX_SAFE_INTEGER); adjustRelation(2); adjust(orta, "support", 1); }

  const record = {
    decisionId: decision.id, choiceId: choice.id, title: decision.title, choice: choice.name,
    impact: choice.impact, year: state.year, month: state.month, turn: state.turn,
  };
  state.campaign.aftermathDecisions.push(record);
  addStrategicRecord(state, {
    type: "aftermath_decision", title: `${decision.title}：${choice.name}`,
    causes: [AFTERMATH_POLICIES[state.campaign.aftermathPolicy].name, decision.prompt], effects: [choice.impact],
  });
  return record;
}

function commandDisposition(profile, commandId) {
  if (profile.supports.some((prefix) => commandId.startsWith(prefix))) return 1;
  if (profile.opposes.some((prefix) => commandId.startsWith(prefix))) return -1;
  return 0;
}

export function applyOfficerCommandPolitics(world, state, task, outcome) {
  normalizeStrategicState(world, state);
  const sponsor = state.officers[task.officerId];
  if (!sponsor) return [];
  sponsor.politicalCapital = clamp(sponsor.politicalCapital + Math.max(1, Math.round(outcome / 35)), 0, 100);
  const reactions = [];
  state.politics.promises.filter((promise) => promise.status === "open").forEach((promise) => {
    const profile = OFFICER_POLITICS[promise.officerId];
    const officer = state.officers[promise.officerId];
    if (!profile || !officer || commandDisposition(profile, task.commandId) <= 0) return;
    promise.status = "fulfilled";
    promise.fulfilledTurn = state.turn;
    promise.commandId = task.commandId;
    officer.loyalty = clamp(officer.loyalty + 2, 0, 100);
    officer.resentment = clamp(officer.resentment - 3, 0, 100);
    reactions.push({
      officerId: promise.officerId, sponsorId: task.officerId, commandId: task.commandId, disposition: 2,
      title: `${world.characters[promise.officerId].name}との約束を履行`,
      detail: `${profile.agenda}を支持する任務が完了し、受諾した要求を果たした。`,
    });
  });
  Object.entries(state.officers).forEach(([officerId, officer]) => {
    if (officerId === task.officerId || officer.allegiance !== "serving") return;
    const profile = OFFICER_POLITICS[officerId];
    if (!profile) return;
    const interestDisposition = commandDisposition(profile, task.commandId);
    const creedEvaluation = evaluateCreed(officer.creed, task, { scale: 18, maximum: 18 });
    const creedModifier = clamp(Math.round(creedEvaluation.score / 6), -2, 2);
    const disposition = clamp(interestDisposition + creedModifier, -3, 3);
    if (!disposition) return;
    officer.loyalty = clamp(officer.loyalty + disposition, 0, 100);
    officer.resentment = clamp(officer.resentment + (disposition < 0 ? 2 : -1), 0, 100);
    const issueSalience = Object.fromEntries((task.creedEffects ?? []).map((effect) => [effect.id, effect.relevance ?? 1]));
    const creedRelationship = evaluateCreedRelationship(officer, sponsor, { salience: issueSalience, defaultSalience: 0 });
    const relationshipModifier = clamp(Math.round(creedRelationship.score), -2, 2);
    setBond(state, officerId, task.officerId, (disposition > 0 ? 2 : -2) + relationshipModifier);
    reactions.push({
      officerId, sponsorId: task.officerId, commandId: task.commandId, disposition,
      interestDisposition, creedModifier, creedScore: creedEvaluation.score, relationshipCreedModifier: relationshipModifier,
      title: `${world.characters[officerId].name}が${disposition > 0 ? "支持" : "反発"}`,
      detail: `${profile.agenda}の利害と信条補正 ${creedModifier >= 0 ? "+" : ""}${creedModifier}から「${world.characters[task.officerId].name}の任務」へ${disposition > 0 ? "協力を表明" : "異議を留保"}。`,
    });
  });
  if (reactions.length) {
    state.monthlyPoliticalReactions.push(...reactions);
    state.politics.reactions.unshift(...reactions.map((reaction) => ({ ...reaction, year: state.year, month: state.month })));
    state.politics.reactions = state.politics.reactions.slice(0, 60);
  }
  return reactions;
}

export function respondToOfficerDemand(world, state, officerId, responseId) {
  normalizeStrategicState(world, state);
  const officer = state.officers[officerId];
  const profile = OFFICER_POLITICS[officerId];
  const response = OFFICER_DEMAND_RESPONSES[responseId];
  if (!officer || !profile) throw new Error("不明な人物要求です");
  if (officer.allegiance !== "serving") throw new Error("配下でない人物の要求には回答できません");
  if (!response) throw new Error("不明な回答です");
  const politicalState = getOfficerPoliticalState(state, officerId);
  if (!politicalState.canRespond) throw new Error(politicalState.activePromise ? "先に受諾済みの要求を履行してください" : `再交渉まであと${politicalState.responseCooldown}か月です`);
  if (responseId === "accept") {
    officer.loyalty = clamp(officer.loyalty + 2, 0, 100);
    officer.resentment = clamp(officer.resentment - 2, 0, 100);
    officer.politicalCapital = clamp(officer.politicalCapital + 1, 0, 100);
    state.politics.promises.push({
      id: `promise-${officerId}-${state.turn}`, officerId, status: "open", responseId,
      agenda: profile.agenda, createdTurn: state.turn, dueTurn: state.turn + 3,
    });
  }
  if (responseId === "negotiate") {
    officer.loyalty = clamp(officer.loyalty + 1, 0, 100);
    officer.resentment = clamp(officer.resentment - 1, 0, 100);
    const local = state.cities[officer.location]?.resources ?? state.cities.selene.resources;
    local.money = Math.max(0, local.money - 3);
  }
  if (responseId === "refuse") {
    officer.loyalty = clamp(officer.loyalty - 3, 0, 100);
    officer.resentment = clamp(officer.resentment + 3, 0, 100);
  }
  officer.lastDemandResponseTurn = state.turn;
  const reaction = {
    officerId, responseId, disposition: responseId === "refuse" ? -1 : 1,
    title: `${world.characters[officerId].name}の要求へ${response.name}`,
    detail: `${profile.agenda}をめぐる要求に回答。${response.impact}`,
    year: state.year, month: state.month,
  };
  state.politics.reactions.unshift(reaction);
  state.politics.reactions = state.politics.reactions.slice(0, 60);
  state.monthlyPoliticalReactions.push(reaction);
  addStrategicRecord(state, { type: "officer_demand", title: reaction.title, causes: [profile.ambition], effects: [response.impact] });
  return { officerId, responseId, response, reaction };
}

export function advanceOfficerPromises(world, state) {
  normalizeStrategicState(world, state);
  const expired = [];
  state.politics.promises.filter((promise) => promise.status === "open" && promise.dueTurn <= state.turn).forEach((promise) => {
    promise.status = "broken";
    promise.brokenTurn = state.turn;
    const officer = state.officers[promise.officerId];
    if (!officer) return;
    officer.loyalty = clamp(officer.loyalty - 4, 0, 100);
    officer.resentment = clamp(officer.resentment + 5, 0, 100);
    const reaction = {
      officerId: promise.officerId, disposition: -2,
      title: `${world.characters[promise.officerId].name}との約束が失効`,
      detail: `${promise.agenda}を支持する任務を期限内に実行できなかった。忠誠 -4 / 不満 +5。`,
    };
    expired.push(reaction);
    addStrategicRecord(state, { type: "broken_promise", title: reaction.title, causes: [`期限 ${promise.dueTurn}ターン`], effects: [reaction.detail] });
  });
  if (expired.length) {
    state.monthlyPoliticalReactions.push(...expired);
    state.politics.reactions.unshift(...expired.map((reaction) => ({ ...reaction, year: state.year, month: state.month })));
    state.politics.reactions = state.politics.reactions.slice(0, 60);
  }
  return expired;
}

export function applyDoctrinePolitics(world, state, doctrineId) {
  normalizeStrategicState(world, state);
  const preferences = {
    balanced: ["edras", "mara"], prosperity: ["edras", "mara", "mirel", LISETTE_VALENNE_ID],
    sea_guard: ["gaius", "sera", "dario"], concord: ["mara", "sera", "mirel", LISETTE_VALENNE_ID],
  }[doctrineId] ?? [];
  const reactions = [];
  Object.entries(state.officers).forEach(([officerId, officer]) => {
    if (officer.allegiance !== "serving") return;
    const disposition = preferences.includes(officerId) ? 1 : doctrineId === "sea_guard" && officerId === "mara" ? -1 : 0;
    if (!disposition) return;
    officer.loyalty = clamp(officer.loyalty + disposition, 0, 100);
    officer.politicalCapital = clamp(officer.politicalCapital + (disposition > 0 ? 1 : 0), 0, 100);
    reactions.push({ officerId, doctrineId, disposition, title: `${world.characters[officerId].name}が季節方針へ${disposition > 0 ? "賛同" : "懸念"}`, detail: OFFICER_POLITICS[officerId].agenda });
  });
  state.politics.reactions.unshift(...reactions.map((reaction) => ({ ...reaction, year: state.year, month: state.month })));
  state.politics.reactions = state.politics.reactions.slice(0, 60);
  return reactions;
}

function foreignIntentType(countryId, cycle) {
  const types = {
    valka: ["pressure", "bargain", "mobilize"], vinia: ["mediate", "observe", "mobilize"],
    forest_alliance: ["trade", "aid", "mediate"], lustrond: ["mediate", "trade", "observe"],
    izmenia: ["mobilize", "trade", "bargain"], heavens_gate: ["guarantee", "mobilize", "mediate"],
    deadland: ["observe", "bargain", "trade"], great_empire: ["guarantee", "pressure", "mobilize"],
    avanheln: ["observe", "guarantee", "mediate"],
  };
  return (types[countryId] ?? ["observe"])[cycle % (types[countryId]?.length ?? 1)];
}

export function advanceForeignAgendas(world, state) {
  normalizeStrategicState(world, state);
  const negotiationOpen = state.negotiation.status === "open";
  const dispatches = Object.entries(state.foreignStates).map(([countryId, country], index) => {
    const agenda = FOREIGN_AGENDAS[countryId] ?? { name: country.stance, intents: ["情勢観測"] };
    const cycle = (state.turn + index) % agenda.intents.length;
    const intent = agenda.intents[cycle];
    const type = foreignIntentType(countryId, cycle);
    country.agenda = agenda.name;
    country.intent = intent;
    country.agendaProgress = clamp(country.agendaProgress + 4 + (index % 3), 0, 100);
    let effect = "大陸情勢を観測";
    if (type === "mediate") {
      country.relation = clamp(country.relation + 1, -100, 100);
      if (negotiationOpen && countryId !== "valka") state.negotiation.mediatorSupport = clamp(state.negotiation.mediatorSupport + 2, 0, 30);
      effect = negotiationOpen ? "国境交渉の受諾見込み +2" : "対セレナ関係 +1";
    } else if (type === "trade") {
      country.relation = clamp(country.relation + 1, -100, 100);
      state.cities.nereia.resources.commerce = clamp(state.cities.nereia.resources.commerce + 0.2, 0, 100);
      effect = "ネレイア商業 +0.2";
    } else if (type === "aid") {
      const target = Object.values(state.cities).sort((left, right) => left.resources.food - right.resources.food)[0];
      target.resources.food += 45;
      country.relation = clamp(country.relation + 1, -100, 100);
      effect = "食料援助 +45";
    } else if (type === "mobilize") {
      country.army += 12 + index * 2;
      country.hostility = clamp(country.hostility + (countryId === "valka" ? 1.2 : 0.4), 0, 100);
      effect = `推定兵力 +${12 + index * 2}`;
    } else if (type === "guarantee") {
      country.interventionWeight = clamp(country.interventionWeight + 0.8, 0, 100);
      if (negotiationOpen) state.negotiation.mediatorSupport = clamp(state.negotiation.mediatorSupport + 1, 0, 30);
      effect = "第三国介入意志 +0.8";
    } else if (type === "pressure") {
      country.hostility = clamp(country.hostility + 1, 0, 100);
      effect = "敵意 +1";
    } else if (type === "bargain") {
      country.relation = clamp(country.relation + (countryId === "valka" && negotiationOpen ? 1 : 0), -100, 100);
      effect = countryId === "valka" && negotiationOpen ? "交渉継続・関係 +1" : "外交取引を探索";
    }
    return {
      id: `dispatch-${state.year}-${state.month}-${countryId}`, year: state.year, month: state.month,
      countryId, countryName: world.countries[countryId]?.name ?? countryId,
      agenda: agenda.name, intent, type, effect,
    };
  });
  state.foreignDispatches.unshift(...dispatches);
  state.foreignDispatches = state.foreignDispatches.slice(0, 72);
  return dispatches;
}

function endingFor(state) {
  if ((state.occupations ?? []).some((occupation) => occupation.status === "occupied")) return { id: "occupied_frontier", name: "占領が残す国境", description: "通行権は得たが、軍事占領と抵抗が次代の火種として残った。" };
  if (state.legitimacy < 40 || Object.values(state.cities).some((city) => city.resources.food <= 0)) return { id: "fragile_survival", name: "傷ついた生存", description: "峠は開いたが、国内の正統性か食料基盤を大きく損なった。" };
  if (state.campaign.resolution === "mutual_treaty" && state.campaign.aftermathPolicy === "reconciliation") return { id: "lasting_peace", name: "灰冠の和約", description: "相互条約と国境会議が、再封鎖より協議を選ぶ秩序を作った。" };
  if (state.campaign.resolution === "mutual_treaty" || state.campaign.aftermathPolicy === "trade_corridor") return { id: "open_corridor", name: "開かれた交易回廊", description: "制度、道路、条約が結びつき、灰冠峠は三州の成長路へ変わった。" };
  if (["limited_war", "war_settlement"].includes(state.campaign.resolution)) return { id: "limited_victory", name: "限定勝利", description: "戦争を通行権で止めた。目的は達したが、損耗と敵意が年代記に残る。" };
  return { id: "guarded_corridor", name: "武装された平和", description: "護送と監視によって通行を維持する、緊張を伴う妥協が定着した。" };
}

export function advanceCampaignState(world, state) {
  normalizeStrategicState(world, state);
  const act = getEffectiveCampaignAct(state);
  if (state.campaign.act !== act) {
    state.campaign.act = act;
    state.campaign.actStartedTurn = state.turn;
  }
  if (act === "aftermath" && state.campaign.aftermathPolicy && !state.campaign.ending) {
    state.campaign.aftermathMonths += 1;
    const policy = AFTERMATH_POLICIES[state.campaign.aftermathPolicy];
    if (state.campaign.aftermathMonths >= policy.months) {
      const resolutionName = BORDER_SETTLEMENTS[state.campaign.resolution]?.name
        ?? (["limited_war", "war_settlement"].includes(state.campaign.resolution) ? "限定戦争" : "国境決着");
      state.campaign.ending = endingFor(state);
      state.campaign.completedTurn = state.turn;
      state.campaign.act = "complete";
      addStrategicRecord(state, { type: "campaign_ending", title: state.campaign.ending.name, causes: [policy.name, resolutionName], effects: [state.campaign.ending.description] });
    }
  }
  return state.campaign;
}

export function buildDecisionHighlights(state, report) {
  const labels = { money: "国庫", food: "食料", population: "人口", security: "治安", support: "民心" };
  const weights = { money: 8, food: 0.02, population: 0.03, security: 4, support: 4 };
  const resource = Object.entries(report.realm ?? {})
    .map(([key, value]) => ({ key, value, score: Math.abs(value) * (weights[key] ?? 1) }))
    .sort((left, right) => right.score - left.score)[0];
  const highlights = [];
  if (resource) {
    const city = [...(report.cities ?? [])].sort((left, right) => Math.abs(right.changes?.[resource.key] ?? 0) - Math.abs(left.changes?.[resource.key] ?? 0))[0];
    highlights.push({
      id: `${report.id}-resource-${resource.key}`, title: `${labels[resource.key] ?? resource.key} ${resource.value >= 0 ? "増加" : "減少"}`,
      change: `${resource.value >= 0 ? "+" : ""}${Number(resource.value).toFixed(resource.key === "money" ? 1 : 0)}`,
      cause: `${city?.name ?? "王国全体"}の通常収支、確定命令、事件・戦争を合算`,
      effect: resource.value < 0 ? "同じ傾向が続く場合は次月の支出余地が縮小" : "次月の政策選択余地が拡大",
      legacy: "都市別の因果内訳から命令・月次・外部要因を追跡可能",
    });
  }
  const completed = (report.actions ?? []).filter((action) => action.status === "completed").sort((left, right) => (right.outcome ?? 0) - (left.outcome ?? 0))[0];
  if (completed) highlights.push({
    id: `${report.id}-action-${completed.id}`, title: completed.title, change: completed.outcome ? `成果 ${completed.outcome}` : "完了",
    cause: completed.detail, effect: completed.commandId?.startsWith("diplomacy.") ? "国境交渉の条件を更新" : "対象都市・制度の実値へ反映",
    legacy: completed.reactions?.length ? `人物反応 ${completed.reactions.length}件を記録` : "担当人物の功績と意欲へ反映",
  });
  const diplomacy = report.foreignDispatches?.find((dispatch) => dispatch.type === "mediate" || dispatch.type === "guarantee") ?? report.foreignDispatches?.[0];
  if (diplomacy) highlights.push({
    id: `${report.id}-foreign-${diplomacy.countryId}`, title: `${diplomacy.countryName}：${diplomacy.intent}`, change: diplomacy.effect,
    cause: `国家意図「${diplomacy.agenda}」`, effect: diplomacy.type === "mediate" ? "国境条約の受諾見込みへ波及" : "大陸均衡と介入リスクへ反映",
    legacy: "外交台帳に月次公報として保存",
  });
  const reaction = report.officerReactions?.[0];
  if (highlights.length < 3 && reaction) highlights.push({
    id: `${report.id}-politics-${reaction.officerId}`, title: reaction.title, change: reaction.disposition > 0 ? "忠誠 +1 / 関係改善" : "忠誠 -1 / 関係悪化",
    cause: reaction.detail, effect: "将来の任務成果と軍団連携へ影響", legacy: "人物政治の反応履歴に保存",
  });
  return highlights.slice(0, 3);
}

export function getOfficerPoliticalState(state, officerId) {
  const profile = OFFICER_POLITICS[officerId];
  const officer = state.officers?.[officerId];
  if (!profile || !officer) return null;
  const latestReaction = state.politics?.reactions?.find((reaction) => reaction.officerId === officerId) ?? null;
  const resentment = officer.resentment ?? 0;
  const standing = resentment >= 8 || officer.loyalty < 55 ? "対立" : resentment >= 4 || officer.loyalty < 68 ? "要注意" : "協調";
  const demand = resentment >= 4
    ? `${profile.agenda}を次の季節方針か任務で重視するよう求めている。`
    : `${profile.ambition}ため、自派の政策が採用される機会を待っている。`;
  const consequence = resentment >= 8
    ? "反発を重ねると忠誠低下により任務成果が落ちる。支持する任務は不満を軽減する。"
    : "支持・反対した命令は忠誠、不満、人物間関係を通じて次の任務成果へ残る。";
  const activePromise = state.politics?.promises?.find((promise) => promise.officerId === officerId && promise.status === "open") ?? null;
  const elapsed = officer.lastDemandResponseTurn === null || officer.lastDemandResponseTurn === undefined
    ? Number.POSITIVE_INFINITY : (state.turn ?? 0) - officer.lastDemandResponseTurn;
  const responseCooldown = activePromise ? Math.max(0, activePromise.dueTurn - (state.turn ?? 0)) : Math.max(0, 3 - elapsed);
  const canRespond = officer.allegiance === "serving" && !activePromise && responseCooldown === 0;
  return {
    ...profile, politicalCapital: officer.politicalCapital ?? 0, resentment, latestReaction, standing, demand, consequence,
    activePromise, responseCooldown, canRespond, responses: Object.values(OFFICER_DEMAND_RESPONSES),
  };
}

export function getDecisionExplanationState(state) {
  return state.monthlyReports?.[0]?.highlights ?? [];
}
