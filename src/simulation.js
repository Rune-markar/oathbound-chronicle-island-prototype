import {
  chooseOpponentAction,
  evaluatePeaceDecision,
  evaluateWarDecision,
} from "./war-ai.js";

export const WORLD = {
  nation: {
    id: "selena",
    name: "セレナ島侯国",
    shortName: "セレナ",
    ruler: "レナ・アルシエ侯",
    government: "島嶼封建侯国",
    capital: "selene",
    color: "#2d706f",
  },
  countries: {
    selena: { id: "selena", name: "セレナ島侯国", capital: "王都セレネ", color: "#2d706f" },
    valka: { id: "valka", name: "ヴァルカ海岸公領", capital: "岬城ヴァルカ", color: "#9b5548" },
    lantern: { id: "lantern", name: "灯台諸島会議", capital: "双灯港", color: "#b18a47" },
  },
  provinces: {
    selene: {
      id: "selene", owner: "selena", name: "王都セレネ", kind: "王都圏", population: 18400,
      tax: 7.2, supply: 76, unrest: 8, cityX: 390, cityY: 210, villages: ["mugiwano", "tsukishiro"],
      note: "島政院と古い船主組合が同じ港則を巡って対立している。",
    },
    nereia: {
      id: "nereia", owner: "selena", name: "港都ネレイア", kind: "商港圏", population: 13700,
      tax: 6.4, supply: 68, unrest: 17, cityX: 515, cityY: 378, villages: ["shionari", "aonagi"],
      note: "ヴァルカの通航税に最も強く影響される商港。",
    },
    orta: {
      id: "orta", owner: "selena", name: "鐘楼市オルタ", kind: "北部圏", population: 9300,
      tax: 4.1, supply: 57, unrest: 12, cityX: 325, cityY: 438, villages: ["haimugi", "kanezaka"],
      note: "兵站倉と街道鐘を持つが、中央の帳簿と単位が一致しない。",
    },
    valka_keep: {
      id: "valka_keep", owner: "valka", name: "岬城ヴァルカ", kind: "公領首府", population: 11900,
      tax: 5.8, supply: 64, unrest: 11, cityX: 758, cityY: 282, villages: [],
      note: "白礁海峡の徴税所と艦隊泊地を支える岬城。",
    },
    twinlight: {
      id: "twinlight", owner: "lantern", name: "双灯港", kind: "中立港", population: 4200,
      tax: 3.2, supply: 71, unrest: 4, cityX: 716, cityY: 530, villages: [],
      note: "中立の灯台守と商人が集う。紛争が長引けば仲介に動く。",
    },
  },
  villages: {
    mugiwano: { id: "mugiwano", province: "selene", name: "麦輪村", kind: "農村", population: 1350, x: 338, y: 176, issue: "港則変更で荷札が二重になっている。" },
    tsukishiro: { id: "tsukishiro", province: "selene", name: "月代村", kind: "漁村", population: 920, x: 456, y: 182, issue: "沿岸警備の召集日が漁期と重なっている。" },
    shionari: { id: "shionari", province: "nereia", name: "潮鳴村", kind: "漁村", population: 1100, x: 584, y: 334, issue: "拿捕を恐れ、小舟が沖へ出なくなった。" },
    aonagi: { id: "aonagi", province: "nereia", name: "青凪村", kind: "造船村", population: 1480, x: 574, y: 432, issue: "海軍と商会が同じ乾船渠を予約している。" },
    haimugi: { id: "haimugi", province: "orta", name: "灰麦村", kind: "農村", population: 1620, x: 274, y: 397, issue: "軍用馬車の重量規格が王都と異なる。" },
    kanezaka: { id: "kanezaka", province: "orta", name: "鐘坂村", kind: "鉱村", population: 860, x: 364, y: 492, issue: "街道警備の負担が一部の家に偏っている。" },
  },
  seaZones: {
    white_reef: { id: "white_reef", name: "白礁海峡", value: 86, note: "外洋と内海を結ぶ唯一の安全な水路。" },
    south_road: { id: "south_road", name: "南方商路", value: 54, note: "双灯港へ続く季節風の航路。" },
  },
  characters: {
    ilva: { id: "ilva", name: "イルヴァ・ロウ", role: "無所属の測量士", skill: "偵察 72", status: "free" },
    dario: { id: "dario", name: "ダリオ・フェン", role: "放浪軍の隊長", skill: "軍事 68", status: "free" },
    mirel: { id: "mirel", name: "ミレル・サーン", role: "ヴァルカ系商人", skill: "外交 74", status: "foreign" },
  },
};

export const WAR_OBJECTIVES = {
  navigation: {
    id: "navigation", name: "自由通航の保障", scope: "limited", politicalValue: 68,
    description: "拿捕の停止と白礁海峡の無税通航を条約化する。領土は要求しない。",
    escalationRisk: 20, targetScore: 32,
  },
  strait_base: {
    id: "strait_base", name: "海峡泊地の共同管理", scope: "limited", politicalValue: 79,
    description: "ヴァルカの徴税泊地を共同管理とし、単独封鎖を不可能にする。",
    escalationRisk: 42, targetScore: 46,
  },
  submission: {
    id: "submission", name: "ヴァルカ政権の屈服", scope: "total", politicalValue: 88,
    description: "公領の外交権を奪う。通航問題を越えた全面的な体制変更となる。",
    escalationRisk: 78, targetScore: 68,
  },
};

export const COMMANDS = {
  "admin.harbor_standard": {
    id: "admin.harbor_standard", group: "realm", name: "港湾単位を統一", duration: 7,
    cost: { admin: 12, treasury: 8 },
    description: "三都市の重量・荷札・入港時刻を一枚の港則に揃える。",
  },
  "navy.soundings": {
    id: "navy.soundings", group: "military", name: "白礁海峡を測量", duration: 5,
    cost: { military: 9, treasury: 5 },
    description: "浅瀬・潮流・敵哨戒を確認し、海軍報告の精度を上げる。",
  },
  "diplomacy.talks": {
    id: "diplomacy.talks", group: "diplomacy", name: "通航会談を提案", duration: 6,
    cost: { diplomacy: 10 },
    description: "拿捕停止と通航税の引下げを、期限付きの会談で打診する。",
  },
  "diplomacy.trade": {
    id: "diplomacy.trade", group: "diplomacy", name: "貿易協定を打診", duration: 9,
    cost: { diplomacy: 14, treasury: 6 },
    description: "Notionの「協定打診」に基づき、相互の港使用を制度化する。",
  },
  "diplomacy.aid": {
    id: "diplomacy.aid", group: "diplomacy", name: "経済支援", duration: 4,
    cost: { treasury: 16 },
    description: "ヴァルカ商会へ復旧資金を供与し、交渉派の影響を高める。",
  },
  "diplomacy.justify": {
    id: "diplomacy.justify", group: "diplomacy", name: "開戦事由を公示", duration: 8,
    cost: { diplomacy: 12, legitimacy: 4 },
    description: "拿捕記録と条約違反を公開し、国内外に限定戦争の理由を示す。",
  },
  "military.mobilize": {
    id: "military.mobilize", group: "military", name: "海峡守備隊を動員", duration: 5,
    cost: { military: 14, treasury: 9, manpower: 180 },
    description: "民兵を長期徴発せず、港湾騎士と水兵を海峡防衛へ集める。",
  },
  "court.serve": {
    id: "court.serve", group: "people", name: "仕官", duration: 3,
    cost: { treasury: 4 },
    description: "今いる地域の君主に仕える。測量士イルヴァを島政院へ迎える。",
  },
  "court.invite": {
    id: "court.invite", group: "people", name: "勧誘", duration: 5,
    cost: { diplomacy: 8, treasury: 7 },
    description: "武将を誘い、放浪軍を結成する。ダリオの一隊へ接触する。",
  },
  "court.recruit": {
    id: "court.recruit", group: "people", name: "登用", duration: 6,
    cost: { diplomacy: 12, treasury: 10 },
    description: "自勢力に加わるよう説得する。商人ミレルを外交顧問に登用する。",
  },
};

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function logEntry(state, scope, title, text, tone = "neutral") {
  state.log.unshift({ id: `${state.absoluteDay}-${state.log.length}-${title}`, date: formatDate(state), scope, title, text, tone });
  state.log = state.log.slice(0, 40);
}

export function createInitialState() {
  return {
    version: 3,
    year: 317,
    month: 4,
    day: 12,
    absoluteDay: 0,
    treasury: 92,
    income: 6.8,
    admin: 52,
    diplomacy: 48,
    military: 51,
    stability: 1,
    legitimacy: 68,
    manpower: 2860,
    sailors: 840,
    army: 2120,
    fleet: 7,
    training: 61,
    organization: 66,
    navalReadiness: 58,
    supply: 62,
    intelligence: 46,
    warSupport: 47,
    warExhaustion: 0,
    relation: -31,
    justification: 58,
    commandQueue: [],
    completedCommands: [],
    issues: {
      strait: { id: "strait", title: "白礁海峡の通航税", severity: 72, status: "active", detail: "ヴァルカが税率を倍増し、商船一隻を拿捕した。" },
      harbor: { id: "harbor", title: "三都市の港則不一致", severity: 57, status: "active", detail: "重量・荷札・時刻の違いで軍需船が平均二日遅れる。" },
      reports: { id: "reports", title: "敵艦隊報告の食い違い", severity: 64, status: "active", detail: "漁師は九隻、海軍省は六隻と報告している。" },
    },
    regions: Object.fromEntries(Object.values(WORLD.provinces).map((province) => [province.id, {
      unrest: province.unrest,
      supply: province.supply,
    }])),
    characters: {
      ilva: "free",
      dario: "free",
      mirel: "foreign",
    },
    agreements: { trade: false, navigation: false, aid: false },
    opponent: {
      army: 1960,
      fleet: 8,
      training: 58,
      organization: 64,
      navalReadiness: 67,
      cohesion: 59,
      hostility: 56,
    },
    war: null,
    log: [
      {
        id: "opening",
        date: "誓暦317年 青月12日",
        scope: "外交",
        title: "ネレイア商船が拿捕された",
        text: "白礁海峡の通航税を拒んだ商船がヴァルカへ連行された。島政院は具体的な対応を求められている。",
        tone: "danger",
      },
    ],
  };
}

export function formatDate(state) {
  const months = ["雪月", "芽月", "風月", "青月", "陽月", "潮月", "炎月", "実月", "霧月", "金月", "夜月", "星月"];
  return `誓暦${state.year}年 ${months[state.month - 1]}${state.day}日`;
}

function spend(state, cost) {
  Object.entries(cost).forEach(([key, value]) => {
    state[key] -= value;
  });
}

export function getCommandAvailability(state, commandId) {
  const command = COMMANDS[commandId];
  if (!command) return { allowed: false, reason: "不明なコマンド" };
  if (state.commandQueue.some((item) => item.commandId === commandId)) return { allowed: false, reason: "実行中" };
  if (state.completedCommands.includes(commandId)) return { allowed: false, reason: "完了済み" };
  if (commandId === "diplomacy.trade" && state.relation < -10) return { allowed: false, reason: "関係 -10 が必要" };
  if (commandId === "court.serve" && state.characters.ilva !== "free") return { allowed: false, reason: "対象不在" };
  if (commandId === "court.invite" && state.characters.dario !== "free") return { allowed: false, reason: "対象不在" };
  if (commandId === "court.recruit" && state.characters.mirel === "recruited") return { allowed: false, reason: "登用済み" };
  for (const [key, value] of Object.entries(command.cost)) {
    if (state[key] < value) return { allowed: false, reason: `${resourceName(key)}が不足` };
  }
  return { allowed: true, reason: `${command.duration}日で完了` };
}

function resourceName(key) {
  return ({ treasury: "国庫", admin: "統治力", diplomacy: "外交力", military: "軍事力", legitimacy: "正統性", manpower: "人的資源" })[key] ?? key;
}

export function issueCommand(state, commandId) {
  const availability = getCommandAvailability(state, commandId);
  if (!availability.allowed) throw new Error(availability.reason);
  const next = clone(state);
  const command = COMMANDS[commandId];
  spend(next, command.cost);
  next.commandQueue.push({ commandId, remaining: command.duration, total: command.duration });
  logEntry(next, "命令", command.name, `${command.description} 完了まで${command.duration}日。`, "info");
  return next;
}

function completeCommand(state, commandId) {
  if (!state.completedCommands.includes(commandId)) state.completedCommands.push(commandId);
  const command = COMMANDS[commandId];
  switch (commandId) {
    case "admin.harbor_standard":
      state.issues.harbor.severity = 12;
      state.issues.harbor.status = "resolved";
      state.supply = clamp(state.supply + 15, 0, 100);
      state.income += 0.8;
      break;
    case "navy.soundings":
      state.issues.reports.severity = 18;
      state.issues.reports.status = "resolved";
      state.intelligence = clamp(state.intelligence + 24, 0, 100);
      state.navalReadiness = clamp(state.navalReadiness + 8, 0, 100);
      break;
    case "diplomacy.talks":
      state.relation = clamp(state.relation + 16, -100, 100);
      state.issues.strait.severity = clamp(state.issues.strait.severity - 12, 0, 100);
      break;
    case "diplomacy.trade":
      state.agreements.trade = true;
      state.relation = clamp(state.relation + 22, -100, 100);
      state.income += 1.4;
      state.issues.strait.severity = clamp(state.issues.strait.severity - 20, 0, 100);
      break;
    case "diplomacy.aid":
      state.agreements.aid = true;
      state.relation = clamp(state.relation + 13, -100, 100);
      state.issues.strait.severity = clamp(state.issues.strait.severity - 8, 0, 100);
      break;
    case "diplomacy.justify":
      state.justification = clamp(state.justification + 28, 0, 100);
      state.warSupport = clamp(state.warSupport + 9, 0, 100);
      break;
    case "military.mobilize":
      state.army += 260;
      state.organization = clamp(state.organization + 9, 0, 100);
      state.supply = clamp(state.supply + 6, 0, 100);
      break;
    case "court.serve":
      state.characters.ilva = "serving";
      state.intelligence = clamp(state.intelligence + 9, 0, 100);
      state.admin += 4;
      break;
    case "court.invite":
      state.characters.dario = "retinue";
      state.army += 140;
      state.training = clamp(state.training + 6, 0, 100);
      break;
    case "court.recruit":
      state.characters.mirel = "recruited";
      state.diplomacy += 8;
      state.relation = clamp(state.relation + 10, -100, 100);
      break;
    default:
      break;
  }
  logEntry(state, "完了", command.name, completionText(commandId), "success");
}

function completionText(commandId) {
  return ({
    "admin.harbor_standard": "三都市の船荷が同じ単位で記録され、軍需船の遅延が解消した。",
    "navy.soundings": "敵艦隊は七隻、うち稼働可能は五隻と判明した。",
    "diplomacy.talks": "会談は成立したが、ヴァルカは通航税の撤廃を拒んだ。",
    "diplomacy.trade": "港使用と関税上限を定める協定が成立した。",
    "diplomacy.aid": "ヴァルカ商会の交渉派が発言力を得た。",
    "diplomacy.justify": "拿捕記録が周辺港へ共有され、限定的な実力行使への理解が広がった。",
    "military.mobilize": "海峡守備隊がネレイアへ集結した。",
    "court.serve": "イルヴァが島政院付き測量士として仕官した。",
    "court.invite": "ダリオの放浪軍がセレナ旗の下へ集まった。",
    "court.recruit": "ミレルが外交顧問として登用された。",
  })[commandId] ?? "命令が完了した。";
}

function nextCalendarDay(state) {
  state.day += 1;
  state.absoluteDay += 1;
  if (state.day > 30) {
    state.day = 1;
    state.month += 1;
    state.treasury += state.income;
    state.admin = clamp(state.admin + 3, 0, 100);
    state.diplomacy = clamp(state.diplomacy + 3, 0, 100);
    state.military = clamp(state.military + 3, 0, 100);
    logEntry(state, "国政", "月次収支", `港税と地代により ${state.income.toFixed(1)}王冠貨を得た。`, "success");
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
  }
}

function resolveWarWeek(state) {
  const war = state.war;
  const objective = WAR_OBJECTIVES[war.objectiveId];
  const opponentAction = chooseOpponentAction({
    own: { supply: state.supply, exhaustion: state.warExhaustion },
    enemy: state.opponent,
    warScore: war.score,
    objective,
  });
  const planEffects = {
    blockade: { sea: 7, supply: -1.4, exhaustion: 1.8, name: "商路封鎖" },
    strait: { sea: 4, supply: -0.7, exhaustion: 1.1, name: "海峡確保" },
    landing: { sea: 10, supply: -3.0, exhaustion: 3.4, name: "限定上陸" },
  };
  const effect = planEffects[war.plan];
  const ownPower = state.army * state.organization * 0.00015 + state.fleet * state.navalReadiness * 0.018;
  const enemyPower = state.opponent.army * state.opponent.organization * 0.00015 + state.opponent.fleet * state.opponent.navalReadiness * 0.018;
  const intelligenceEdge = (state.intelligence - 50) * 0.025;
  const supplyEdge = (state.supply - 50) * 0.035;
  const phase = [-1.5, 0.5, 1.2, -0.4][war.weeks % 4];
  let delta = clamp((ownPower - enemyPower) * 0.38 + effect.sea + intelligenceEdge + supplyEdge + phase, -9, 12);
  if (opponentAction.id === "raid_supply") state.supply -= 2.5;
  if (opponentAction.id === "counterstroke") delta -= 3;
  if (opponentAction.id === "entrench" && war.plan === "landing") delta -= 4;
  if (opponentAction.id === "seek_terms") delta += 1.5;

  war.score = clamp(war.score + delta, -100, 100);
  war.weeks += 1;
  war.lastEnemyAction = opponentAction;
  war.objectiveProgress = clamp(war.objectiveProgress + Math.max(0, delta * 1.4), 0, 100);
  state.supply = clamp(state.supply + effect.supply, 5, 100);
  state.warExhaustion = clamp(state.warExhaustion + effect.exhaustion, 0, 100);
  state.organization = clamp(state.organization - Math.max(0.8, effect.exhaustion * 0.7), 8, 100);
  state.opponent.organization = clamp(state.opponent.organization - Math.max(0.7, delta * 0.18), 10, 100);
  const ownLoss = Math.round(18 + effect.exhaustion * 6 + Math.max(0, -delta) * 3);
  const enemyLoss = Math.round(15 + Math.max(0, delta) * 4);
  state.army = Math.max(300, state.army - ownLoss);
  state.opponent.army = Math.max(300, state.opponent.army - enemyLoss);
  war.losses += ownLoss;
  war.enemyLosses += enemyLoss;
  logEntry(
    state,
    "戦争",
    `${effect.name} — ${opponentAction.label}`,
    `戦況 ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}。相手は「${opponentAction.reason}」と判断した。`,
    delta >= 0 ? "success" : "danger",
  );

  war.peace = evaluatePeaceDecision({
    warScore: war.score,
    objectiveProgress: war.objectiveProgress,
    objective,
    own: { exhaustion: state.warExhaustion, organization: state.organization, supply: state.supply },
  });
}

export function advanceDays(state, count = 1) {
  const next = clone(state);
  for (let i = 0; i < count; i += 1) {
    nextCalendarDay(next);
    next.commandQueue.forEach((item) => { item.remaining -= 1; });
    const completed = next.commandQueue.filter((item) => item.remaining <= 0);
    next.commandQueue = next.commandQueue.filter((item) => item.remaining > 0);
    completed.forEach((item) => completeCommand(next, item.commandId));
    if (next.war && next.absoluteDay % 7 === 0) resolveWarWeek(next);
    if (!next.war && next.absoluteDay > 0 && next.absoluteDay % 15 === 0 && next.issues.strait.status === "active") {
      next.issues.strait.severity = clamp(next.issues.strait.severity + 2, 0, 100);
      next.relation = clamp(next.relation - 1, -100, 100);
    }
  }
  return next;
}

export function getWarCouncilReport(state, objectiveId = "navigation") {
  const objective = WAR_OBJECTIVES[objectiveId];
  return evaluateWarDecision({
    objective: {
      name: objective.name,
      scope: objective.scope,
      politicalValue: objective.politicalValue,
      description: objective.description,
    },
    politics: {
      justification: state.justification,
      support: state.warSupport,
      escalationRisk: objective.escalationRisk,
    },
    own: {
      army: state.army,
      fleet: state.fleet,
      training: state.training,
      organization: state.organization,
      navalReadiness: state.navalReadiness,
      exhaustion: state.warExhaustion,
    },
    enemy: {
      ...state.opponent,
      capital: WORLD.countries.valka.capital,
    },
    geography: {
      straitName: WORLD.seaZones.white_reef.name,
      straitValue: WORLD.seaZones.white_reef.value,
      seaControl: Math.round(state.navalReadiness * 0.55 + state.fleet * 4.5),
      straitAccess: state.completedCommands.includes("navy.soundings") ? 74 : 55,
    },
    logistics: {
      supply: state.supply,
      distance: 18,
    },
    intelligence: state.intelligence,
  });
}

export function declareWar(state, objectiveId) {
  if (state.war) throw new Error("すでに戦争中です");
  const objective = WAR_OBJECTIVES[objectiveId];
  if (!objective) throw new Error("戦争目的が不明です");
  const next = clone(state);
  const report = getWarCouncilReport(next, objectiveId);
  const legitimacyShortfall = Math.max(0, 50 - next.justification);
  const supportShortfall = Math.max(0, 40 - next.warSupport);
  if (legitimacyShortfall > 0 || supportShortfall > 0) {
    next.stability = Math.max(-3, next.stability - 1);
    next.legitimacy = clamp(next.legitimacy - Math.ceil((legitimacyShortfall + supportShortfall) / 4), 0, 100);
    next.regions.nereia.unrest = clamp(next.regions.nereia.unrest + 18, 0, 100);
    logEntry(next, "国内", "開戦反対の港湾罷業", "開戦理由が十分に共有されず、ネレイアの荷役組合が罷業に入った。", "danger");
  }
  next.war = {
    enemyId: "valka",
    objectiveId,
    score: 0,
    objectiveProgress: 0,
    plan: "strait",
    weeks: 0,
    losses: 0,
    enemyLosses: 0,
    started: formatDate(next),
    lastEnemyAction: { id: "screen", label: "海峡を警戒する", reason: "通航税徴収所を守る。" },
    peace: null,
  };
  next.relation = -100;
  next.justification = clamp(next.justification - 45, 0, 100);
  next.warSupport = clamp(next.warSupport + 8, 0, 100);
  logEntry(next, "戦争", `${WORLD.countries.valka.name}へ宣戦`, `${objective.name}を政治目的として開戦。軍議評価は「${report.posture}」だった。`, "danger");
  return next;
}

export function setWarPlan(state, planId) {
  if (!state.war) throw new Error("戦争中ではありません");
  if (!["blockade", "strait", "landing"].includes(planId)) throw new Error("不明な作戦です");
  const next = clone(state);
  next.war.plan = planId;
  return next;
}

export function negotiatePeace(state) {
  if (!state.war) throw new Error("戦争中ではありません");
  const next = clone(state);
  const war = next.war;
  const objective = WAR_OBJECTIVES[war.objectiveId];
  const peace = war.peace ?? evaluatePeaceDecision({
    warScore: war.score,
    objectiveProgress: war.objectiveProgress,
    objective,
    own: { exhaustion: next.warExhaustion, organization: next.organization, supply: next.supply },
  });
  let result = "白紙講和";
  if (war.score >= objective.targetScore || peace.accept) {
    result = objective.name;
    if (objective.id === "navigation") next.agreements.navigation = true;
    if (objective.id === "strait_base") {
      next.agreements.navigation = true;
      next.navalReadiness = clamp(next.navalReadiness + 10, 0, 100);
    }
    if (objective.id === "submission") next.income += 2.2;
    next.issues.strait.status = "resolved";
    next.issues.strait.severity = 8;
    next.legitimacy = clamp(next.legitimacy + 7, 0, 100);
  } else if (war.score < -25) {
    result = "通航税の追認";
    next.issues.strait.severity = 88;
    next.legitimacy = clamp(next.legitimacy - 10, 0, 100);
    next.treasury = Math.max(0, next.treasury - 12);
  }
  next.relation = -42;
  next.warSupport = clamp(next.warSupport - 15, 0, 100);
  next.warExhaustion = clamp(next.warExhaustion - 8, 0, 100);
  logEntry(next, "講和", result, `${war.weeks}週の戦役を終えた。自軍損失 ${war.losses}、敵軍推定損失 ${war.enemyLosses}。`, result === "通航税の追認" ? "danger" : "success");
  next.war = null;
  return next;
}

export function deriveMetrics(state) {
  const activeIssues = Object.values(state.issues).filter((issue) => issue.status !== "resolved");
  const nationalReadiness = Math.round(
    state.organization * 0.28
      + state.supply * 0.25
      + state.navalReadiness * 0.22
      + state.intelligence * 0.15
      + state.legitimacy * 0.1,
  );
  return {
    activeIssues: activeIssues.length,
    nationalReadiness,
    seaControl: Math.round(clamp(state.navalReadiness * 0.55 + state.fleet * 4.5, 0, 100)),
    commandLoad: state.commandQueue.length,
  };
}
