const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clone = (value) => structuredClone(value);

export const CAREER_SCHEMA_VERSION = 1;

export const CAREER_STAGES = Object.freeze({
  individual: Object.freeze({ id: "individual", order: 0, name: "浪人・冒険者", governance: false, description: "所属も領地も持たない一個人。依頼、移動、交流で身を立てる。" }),
  retainer: Object.freeze({ id: "retainer", order: 1, name: "仕官者", governance: false, description: "主君の命令を受け、功績と信用を積む臣下。" }),
  commander: Object.freeze({ id: "commander", order: 2, name: "指揮官", governance: false, description: "委任された部隊、軍需、軍事予算だけを扱う。" }),
  lord: Object.freeze({ id: "lord", order: 3, name: "辺境領主", governance: true, description: "与えられた自領の内政、軍備、人事を統治する。" }),
  multi_lord: Object.freeze({ id: "multi_lord", order: 4, name: "有力諸侯", governance: true, description: "複数所領と直属家臣を統治する。国家政策は建議する。" }),
  governor: Object.freeze({ id: "governor", order: 5, name: "地方長官", governance: true, description: "委任された地方全域を統治する。中央政策は建議する。" }),
  regent: Object.freeze({ id: "regent", order: 6, name: "摂政・宰相", governance: true, description: "委任範囲で国家政策を代行するが、正統性と反発を負う。" }),
  independent_ruler: Object.freeze({ id: "independent_ruler", order: 7, name: "独立君主", governance: true, description: "自国全体の政策、外交、軍事を決定する。" }),
  centralized_ruler: Object.freeze({ id: "centralized_ruler", order: 8, name: "中央集権君主", governance: true, description: "地方の介在を減らし、全国へ直接命令する。" }),
});

export const LOCAL_AUTHORITIES = Object.freeze([
  "local_tax", "local_economy", "local_construction", "local_security", "local_law",
  "local_conscription", "local_military_organization", "local_appointments", "local_budget",
  "local_logistics", "local_migration", "local_negotiation", "local_crisis", "central_obligations",
]);

export const NATIONAL_AUTHORITIES = Object.freeze([
  "national_tax", "national_law", "declare_war", "make_peace", "national_alliance",
  "national_budget", "national_conscription", "national_army", "currency", "customs",
  "state_religion", "national_registry", "confiscate_fiefs", "standing_army", "succession",
  "centralization", "command_lords",
]);

const command = (id, name, group, authority, scope, description, extra = {}) => Object.freeze({
  id, name, group, authority, scope, description, ...extra,
});

export const GOVERNANCE_COMMANDS = Object.freeze({
  local_tax_policy: command("local_tax_policy", "自領の徴税方針", "財政", "local_tax", "territory", "収入と民心を見比べ、自領だけの徴税強度を定める。"),
  agriculture_support: command("agriculture_support", "農業振興", "産業", "local_economy", "territory", "灌漑、開墾、備蓄を支援する。", { cost: 2 }),
  commerce_support: command("commerce_support", "商業・工業振興", "産業", "local_economy", "territory", "市場、工房、交易路へ投資する。", { cost: 2 }),
  local_construction: command("local_construction", "集落・道路・城塞建設", "建設", "local_construction", "territory", "自領の生活基盤と防衛施設を整える。", { cost: 3 }),
  public_order: command("public_order", "治安維持", "法・治安", "local_security", "territory", "巡察と自警組織で治安を回復する。", { cost: 1 }),
  local_ordinance: command("local_ordinance", "領内法令", "法・治安", "local_law", "territory", "上位法に反しない範囲で領内法令を定める。"),
  local_conscription: command("local_conscription", "徴兵", "軍備", "local_conscription", "territory", "自領の徴募可能人口から兵を集める。", { cost: 2 }),
  organize_local_force: command("organize_local_force", "部隊編成", "軍備", "local_military_organization", "territory", "自領兵の編成と訓練方針を変更する。", { cost: 1 }),
  appoint_retainer: command("appoint_retainer", "家臣の任命", "人事", "local_appointments", "territory", "直属家臣へ領内役職を与える。"),
  allocate_local_budget: command("allocate_local_budget", "予算配分", "財政", "local_budget", "territory", "自領金庫の用途を配分する。"),
  manage_logistics: command("manage_logistics", "備蓄・兵站管理", "軍備", "local_logistics", "territory", "穀倉と輸送隊を整備する。", { cost: 2 }),
  migration_policy: command("migration_policy", "移民・難民・異種族集落対応", "民政", "local_migration", "territory", "受入、定住、自治条件を自領内で調整する。", { cost: 1 }),
  negotiate_local_powers: command("negotiate_local_powers", "宗教勢力・地方豪族との交渉", "民政", "local_negotiation", "territory", "地域の権利と義務を交渉する。", { cost: 1 }),
  crisis_response: command("crisis_response", "災害・飢饉・魔物への対処", "危機", "local_crisis", "territory", "備蓄と人員を緊急投入する。", { cost: 3 }),
  answer_central_demand: command("answer_central_demand", "中央の納税・軍役・要請へ対応", "主従", "central_obligations", "territory", "主君の要求へ納付、交渉、猶予申請で応える。", { cost: 2 }),

  national_tax: command("national_tax", "国家全体の税率変更", "国家財政", "national_tax", "nation", "全国の税制を変更する。", { petitionTopic: "全国的な徴税改革を提案する" }),
  national_law: command("national_law", "全国法の制定・廃止", "国家制度", "national_law", "nation", "全国へ適用する法を制定する。", { petitionTopic: "全国法の改正を提案する" }),
  declare_war: command("declare_war", "宣戦布告", "外交・軍事", "declare_war", "nation", "国家として他国へ宣戦する。", { petitionTopic: "他国との開戦を進言する" }),
  make_peace: command("make_peace", "講和", "外交・軍事", "make_peace", "nation", "国家間戦争を条約で終結する。", { petitionTopic: "講和条件を進言する" }),
  national_alliance: command("national_alliance", "国家間同盟", "外交・軍事", "national_alliance", "nation", "国家を拘束する同盟を締結する。", { petitionTopic: "同盟締結を進言する" }),
  national_budget: command("national_budget", "国家予算の配分", "国家財政", "national_budget", "nation", "全国の歳出を配分する。", { petitionTopic: "国家予算の重点を提案する" }),
  national_conscription: command("national_conscription", "全国的な徴兵", "国家軍制", "national_conscription", "nation", "全国へ徴兵を命じる。", { petitionTopic: "全国動員を提案する" }),
  national_army: command("national_army", "国軍全体の編成", "国家軍制", "national_army", "nation", "複数軍団を国家作戦へ編成する。", { petitionTopic: "国軍再編を提案する" }),
  currency_customs: command("currency_customs", "通貨・関税の変更", "国家制度", "currency", "nation", "通貨制度または全国関税を変更する。", { petitionTopic: "通貨・関税改革を提案する" }),
  state_religion: command("state_religion", "国家宗教の変更", "国家制度", "state_religion", "nation", "国家と宗教勢力の関係を再定義する。", { petitionTopic: "宗教勢力への対応を進言する" }),
  national_registry: command("national_registry", "全国の検地・戸籍整備", "国家制度", "national_registry", "nation", "全国規模で土地と人口を把握する。", { petitionTopic: "全国的な検地・戸籍整備を提案する" }),
  confiscate_fiefs: command("confiscate_fiefs", "諸侯領の没収", "諸侯統制", "confiscate_fiefs", "nation", "諸侯の所領を王権へ回収する。", { petitionTopic: "特定諸侯の処罰を要求する" }),
  standing_army: command("standing_army", "国家常備軍の創設", "国家軍制", "standing_army", "nation", "王権直属の常備軍を創設する。", { petitionTopic: "常備軍創設を提案する" }),
  succession: command("succession", "王位継承者の決定", "王権", "succession", "nation", "国家の継承者を確定する。"),
  centralization: command("centralization", "全国的な中央集権政策", "諸侯統制", "centralization", "nation", "地方権限を全国規模で再編する。", { petitionTopic: "中央集権政策を提案する" }),
  command_lords: command("command_lords", "他領主への直接命令", "諸侯統制", "command_lords", "nation", "諸侯へ王命を直接下す。"),
});

export const CAREER_ACTIONS = Object.freeze({
  take_contract: Object.freeze({ id: "take_contract", name: "街道護衛の依頼を受ける", stages: ["individual"] }),
  fulfill_order: Object.freeze({ id: "fulfill_order", name: "主君の討伐命令を果たす", stages: ["retainer"] }),
  command_campaign: Object.freeze({ id: "command_campaign", name: "辺境救援軍を指揮する", stages: ["commander"] }),
  consolidate_power: Object.freeze({ id: "consolidate_power", name: "領内基盤を固める", stages: ["lord", "multi_lord", "governor"] }),
  request_second_fief: Object.freeze({ id: "request_second_fief", name: "第二の所領を願い出る", stages: ["lord"] }),
  declare_independence: Object.freeze({ id: "declare_independence", name: "辺境に新国家を建てる", stages: ["lord", "multi_lord", "governor"] }),
});

function defaultPlayer(options = {}) {
  return {
    schemaVersion: CAREER_SCHEMA_VERSION,
    id: "player",
    name: options.name ?? "アレク",
    raceId: options.raceId ?? "human",
    origin: options.origin ?? "没落貴族",
    specialty: options.specialty ?? "武勇と交渉",
    stage: "individual",
    title: "無位",
    locationId: "orta",
    affiliation: { nationId: null, liegeId: null, liegeName: null },
    sovereign: false,
    holdings: [],
    offices: [],
    authorityGrants: [],
    prohibitions: [],
    householdRetainers: [],
    metrics: {
      martialMerit: 0, civilMerit: 0, renown: 4, liegeTrust: 0, householdSupport: 12,
      popularSupport: 8, fear: 0, legitimacy: 0, ambition: 24, wealth: 8,
    },
    progress: { contracts: 0, orders: 0, campaigns: 0, governanceActions: 0 },
    invitations: [],
    petitions: [],
    history: [{ turn: 0, title: "一個人として旅立つ", detail: "領地も私兵も持たず、辺境の街道へ立った。" }],
  };
}

function careerLog(player, state, title, detail) {
  player.history.unshift({ turn: state.turn ?? 0, year: state.year, month: state.month, title, detail });
  player.history = player.history.slice(0, 60);
}

export function initializeCareerState(baseState, options = {}) {
  const next = clone(baseState);
  next.version = 10;
  next.player = defaultPlayer(options);
  next.council.pending = false;
  next.pendingOrders = [];
  next.commandQueue = [];
  next.pendingEvent = null;
  next.phase = "planning";
  next.log = [{
    id: "career-opening", date: `${next.year}年 ${next.month}月`, scope: "旅立ち",
    title: "名もなき個人として街道へ立つ",
    text: "依頼を果たし、武勲、名声、財産、人脈を得て、自らの立場を選ぶ。", tone: "info",
  }];
  return next;
}

export function normalizeCareerState(state) {
  if (!state?.player) return state;
  const baseline = defaultPlayer();
  state.version = Math.max(10, state.version ?? 0);
  state.player = {
    ...baseline,
    ...state.player,
    affiliation: { ...baseline.affiliation, ...(state.player.affiliation ?? {}) },
    metrics: { ...baseline.metrics, ...(state.player.metrics ?? {}) },
    progress: { ...baseline.progress, ...(state.player.progress ?? {}) },
    holdings: [...(state.player.holdings ?? [])],
    offices: [...(state.player.offices ?? [])],
    authorityGrants: [...(state.player.authorityGrants ?? [])],
    prohibitions: [...(state.player.prohibitions ?? [])],
    householdRetainers: [...(state.player.householdRetainers ?? [])],
    invitations: [...(state.player.invitations ?? [])],
    petitions: [...(state.player.petitions ?? [])],
    history: [...(state.player.history ?? baseline.history)],
  };
  return state;
}

export function getCareerStage(state) {
  return CAREER_STAGES[state.player?.stage] ?? null;
}

function stageAtLeast(state, stageId) {
  const current = getCareerStage(state)?.order ?? -1;
  return current >= (CAREER_STAGES[stageId]?.order ?? Number.POSITIVE_INFINITY);
}

function activeGrant(state, grant) {
  return grant.revoked !== true && (grant.expiresTurn == null || grant.expiresTurn >= (state.turn ?? 0));
}

export function deriveJurisdiction(state) {
  if (!state.player) {
    return { legacySystemAuthority: true, territoryIds: Object.keys(state.cities ?? {}), authorities: [...LOCAL_AUTHORITIES, ...NATIONAL_AUTHORITIES], sovereign: true, grants: [], prohibitions: [] };
  }
  normalizeCareerState(state);
  const player = state.player;
  const grants = player.authorityGrants.filter((grant) => activeGrant(state, grant));
  const territories = new Set(player.holdings.map((holding) => holding.territoryId));
  grants.forEach((grant) => (grant.territoryIds ?? []).forEach((id) => territories.add(id)));
  const authorities = new Set();
  if (stageAtLeast(state, "lord")) LOCAL_AUTHORITIES.forEach((id) => authorities.add(id));
  grants.forEach((grant) => (grant.authorities ?? []).forEach((id) => authorities.add(id)));
  if (player.sovereign || stageAtLeast(state, "independent_ruler")) NATIONAL_AUTHORITIES.forEach((id) => authorities.add(id));
  if (player.stage === "centralized_ruler") authorities.add("direct_national_execution");
  return {
    legacySystemAuthority: false,
    territoryIds: [...territories],
    authorities: [...authorities],
    sovereign: Boolean(player.sovereign || stageAtLeast(state, "independent_ruler")),
    grants,
    offices: [...player.offices],
    prohibitions: player.prohibitions.filter((item) => item.revoked !== true && (item.expiresTurn == null || item.expiresTurn >= (state.turn ?? 0))),
  };
}

export function authorizePlayerAction(state, request) {
  const jurisdiction = deriveJurisdiction(state);
  if (jurisdiction.legacySystemAuthority) return { allowed: true, visible: true, petitionable: false, mode: "system", jurisdiction };
  const commandDefinition = request.commandId ? GOVERNANCE_COMMANDS[request.commandId] : null;
  const authority = request.authority ?? commandDefinition?.authority;
  const scope = request.scope ?? commandDefinition?.scope ?? "territory";
  const targetTerritoryId = request.targetTerritoryId ?? null;
  const player = state.player;
  const prohibition = jurisdiction.prohibitions.find((item) =>
    item.commandId === request.commandId || item.authority === authority || item.scope === scope,
  );
  if (prohibition) {
    return { allowed: false, visible: false, petitionable: false, mode: "forbidden", reason: prohibition.reason ?? "主君または中央政府が禁止しています", jurisdiction };
  }
  if (!authority || !jurisdiction.authorities.includes(authority)) {
    const petitionable = scope === "nation" && stageAtLeast(state, "lord") && Boolean(player.affiliation.liegeId) && Boolean(commandDefinition?.petitionTopic);
    return {
      allowed: false, visible: false, petitionable, mode: petitionable ? "petition" : "hidden",
      reason: petitionable ? "国家主権がないため、主君への建議としてのみ関与できます" : "必要な地位、官職、または委任権限がありません",
      jurisdiction,
    };
  }
  if (scope === "territory") {
    if (!targetTerritoryId) return { allowed: false, visible: true, petitionable: false, mode: "execute", reason: "対象地域を指定してください", jurisdiction };
    if (!jurisdiction.territoryIds.includes(targetTerritoryId)) {
      return { allowed: false, visible: false, petitionable: false, mode: "outside-jurisdiction", reason: "対象地域はプレイヤーの管轄外です", jurisdiction };
    }
  }
  if (scope === "nation" && !jurisdiction.sovereign) {
    return { allowed: false, visible: false, petitionable: Boolean(commandDefinition?.petitionTopic), mode: "petition", reason: "君主権が必要です", jurisdiction };
  }
  return { allowed: true, visible: true, petitionable: false, mode: "execute", jurisdiction };
}

export function assertPlayerAuthority(state, request) {
  const result = authorizePlayerAction(state, request);
  if (result.allowed) return result;
  const error = new Error(result.reason ?? "この命令を実行する権限がありません");
  error.code = "NOT_AUTHORIZED";
  error.authorization = result;
  throw error;
}

export function getGovernanceView(state) {
  const jurisdiction = deriveJurisdiction(state);
  const executable = [];
  const petitions = [];
  Object.values(GOVERNANCE_COMMANDS).forEach((item) => {
    if (item.scope === "territory") {
      jurisdiction.territoryIds.forEach((targetTerritoryId) => {
        const access = authorizePlayerAction(state, { commandId: item.id, targetTerritoryId });
        if (access.allowed && access.visible) executable.push({ ...item, targetTerritoryId, access });
      });
      return;
    }
    const access = authorizePlayerAction(state, { commandId: item.id });
    if (access.allowed && access.visible) executable.push({ ...item, targetTerritoryId: null, access });
    else if (access.petitionable) petitions.push({ ...item, access });
  });
  return { stage: getCareerStage(state), jurisdiction, executable, petitions };
}

function mutateTerritory(state, commandId, territoryId) {
  const city = state.cities?.[territoryId];
  if (!city) throw new Error("対象地域の統治台帳がありません");
  const resources = city.resources;
  const military = city.military;
  const internal = city.internal;
  switch (commandId) {
    case "local_tax_policy":
      resources.money = Math.round((resources.money + 2) * 10) / 10;
      resources.support = clamp(resources.support - 1, 0, 100);
      break;
    case "agriculture_support":
      resources.money = Math.max(0, resources.money - 2); resources.production = clamp(resources.production + 2, 0, 100); resources.food += 220;
      break;
    case "commerce_support":
      resources.money = Math.max(0, resources.money - 2); resources.commerce = clamp(resources.commerce + 2, 0, 100);
      break;
    case "local_construction":
      resources.money = Math.max(0, resources.money - 3); resources.defense = clamp(resources.defense + 2, 0, 100); city.facilities.road.condition = clamp(city.facilities.road.condition + 5, 0, 100);
      break;
    case "public_order":
      resources.money = Math.max(0, resources.money - 1); resources.security = clamp(resources.security + 3, 0, 100);
      break;
    case "local_ordinance": resources.support = clamp(resources.support + 1, 0, 100); break;
    case "local_conscription": {
      const recruits = Math.min(120, military.draftPopulation);
      resources.money = Math.max(0, resources.money - 2); military.draftPopulation -= recruits; military.troops += recruits; resources.support = clamp(resources.support - 1, 0, 100);
      break;
    }
    case "organize_local_force": resources.money = Math.max(0, resources.money - 1); military.training = clamp(military.training + 3, 0, 100); break;
    case "appoint_retainer": break;
    case "allocate_local_budget": internal.administrativeEfficiency = clamp(internal.administrativeEfficiency + 1, 0, 100); break;
    case "manage_logistics": resources.money = Math.max(0, resources.money - 2); resources.food += 160; break;
    case "migration_policy": resources.money = Math.max(0, resources.money - 1); resources.population += 90; resources.support = clamp(resources.support + 1, 0, 100); break;
    case "negotiate_local_powers": resources.money = Math.max(0, resources.money - 1); resources.support = clamp(resources.support + 2, 0, 100); break;
    case "crisis_response": resources.money = Math.max(0, resources.money - 3); resources.security = clamp(resources.security + 2, 0, 100); resources.support = clamp(resources.support + 3, 0, 100); break;
    case "answer_central_demand": resources.money = Math.max(0, resources.money - 2); break;
    default: break;
  }
}

export function executeGovernanceCommand(state, commandId, targetTerritoryId = null, targetTerritoryName = null) {
  const definition = GOVERNANCE_COMMANDS[commandId];
  if (!definition) throw new Error("不明な統治命令です");
  assertPlayerAuthority(state, { commandId, targetTerritoryId });
  const next = clone(state);
  normalizeCareerState(next);
  if (definition.scope === "territory") mutateTerritory(next, commandId, targetTerritoryId);
  next.player.progress.governanceActions += 1;
  next.player.metrics.civilMerit += definition.scope === "nation" ? 5 : 3;
  next.player.metrics.popularSupport = clamp(next.player.metrics.popularSupport + (commandId === "local_tax_policy" ? -1 : 1), 0, 100);
  if (commandId === "appoint_retainer" && !next.player.householdRetainers.includes("dario")) next.player.householdRetainers.push("dario");
  if (commandId === "answer_central_demand") next.player.metrics.liegeTrust = clamp(next.player.metrics.liegeTrust + 5, 0, 100);
  const targetLabel = definition.scope === "nation" ? "自国" : targetTerritoryName?.trim() || "自領";
  careerLog(next.player, next, definition.name, `${targetLabel}を対象に命令を実行した。`);
  return next;
}

export function submitPetition(state, commandId) {
  const definition = GOVERNANCE_COMMANDS[commandId];
  const access = authorizePlayerAction(state, { commandId });
  if (!definition || !access.petitionable) {
    const error = new Error(access.reason ?? "この政策は建議できません");
    error.code = "NOT_AUTHORIZED";
    throw error;
  }
  const next = clone(state);
  normalizeCareerState(next);
  const metrics = next.player.metrics;
  const officeWeight = next.player.offices.length * 6;
  const meritWeight = Math.min(22, (metrics.martialMerit + metrics.civilMerit) / 8);
  const factionSupport = Math.min(14, metrics.householdSupport / 5);
  const necessity = ["declare_war", "standing_army", "national_registry"].includes(commandId) ? 8 : 12;
  const rulerDisposition = next.player.affiliation.liegeId === "serena_crown" ? 7 : 2;
  const score = Math.round(metrics.liegeTrust * 0.45 + officeWeight + meritWeight + factionSupport + necessity + rulerDisposition - metrics.ambition * 0.08);
  const accepted = score >= 55;
  const record = {
    id: `petition-${next.turn}-${next.player.petitions.length + 1}`, commandId, topic: definition.petitionTopic,
    status: accepted ? "accepted" : "rejected", score, turn: next.turn,
    decisionBy: next.player.affiliation.liegeId, executor: accepted ? "central_government" : null,
  };
  next.player.petitions.unshift(record);
  next.player.metrics.civilMerit += accepted ? 7 : 2;
  next.player.metrics.liegeTrust = clamp(next.player.metrics.liegeTrust + (accepted ? 3 : -1), 0, 100);
  careerLog(next.player, next, accepted ? "建議が採用された" : "建議は退けられた", `${definition.petitionTopic}。政策の実施主体は${accepted ? "主君と中央政府" : "変更なし"}。`);
  return next;
}

export function acceptServiceInvitation(state, nationId) {
  if (state.player?.stage !== "individual") throw new Error("現在は仕官先を選べません");
  const invitation = state.player.invitations.find((item) => item.nationId === nationId);
  if (!invitation) throw new Error("その勢力から仕官の誘いはありません");
  const next = clone(state);
  const lieges = {
    serena: ["serena_crown", "セレナ王"], valka: ["valka_duke", "ヴァルカ公"], forest_alliance: ["forest_council", "森の連合評議会"],
  };
  const [liegeId, liegeName] = lieges[nationId] ?? [`${nationId}_ruler`, nationId];
  next.player.stage = "retainer";
  next.player.title = "従士";
  next.player.affiliation = { nationId, liegeId, liegeName };
  next.player.metrics.liegeTrust = invitation.trust;
  next.player.invitations = [];
  careerLog(next.player, next, `${liegeName}へ仕官`, "俸禄と保護を受ける代わりに、軍役と命令への服従を誓った。");
  return next;
}

export function performCareerAction(state, actionId) {
  const action = CAREER_ACTIONS[actionId];
  if (!state.player || !action?.stages.includes(state.player.stage)) throw new Error("現在の地位ではその行動を選べません");
  const next = clone(state);
  const player = next.player;
  const metrics = player.metrics;
  if (actionId === "take_contract") {
    player.progress.contracts += 1; metrics.martialMerit += 22; metrics.renown += 8; metrics.wealth += 4;
    player.invitations = [
      { nationId: "serena", name: "セレナ王国", trust: 32, offer: "東境軍の従士" },
      { nationId: "valka", name: "ヴァルカ公国", trust: 25, offer: "峠守備隊の客将" },
      { nationId: "forest_alliance", name: "森の連合国", trust: 28, offer: "街道護衛団の契約士官" },
    ];
    careerLog(player, next, "護衛依頼を完遂", "隊商を救い、三勢力から仕官の誘いを受けた。");
  } else if (actionId === "fulfill_order") {
    player.progress.orders += 1; metrics.martialMerit += 28; metrics.renown += 10; metrics.liegeTrust = clamp(metrics.liegeTrust + 18, 0, 100);
    player.stage = "commander"; player.title = "国境隊長";
    player.authorityGrants.push({ id: "commander-logistics", issuerId: player.affiliation.liegeId, territoryIds: ["orta"], authorities: ["local_logistics", "local_military_organization", "local_budget"], expiresTurn: null, reason: "国境隊の軍需委任" });
    careerLog(player, next, "国境隊長へ昇進", "武勲と主君の信頼により、小部隊と軍需予算を委ねられた。");
  } else if (actionId === "command_campaign") {
    player.progress.campaigns += 1; metrics.martialMerit += 45; metrics.renown += 18; metrics.liegeTrust = clamp(metrics.liegeTrust + 20, 0, 100); metrics.legitimacy += 18;
    player.stage = "lord"; player.title = "東境州辺境伯";
    player.holdings.push({ id: "fief-orta", territoryId: "orta", grantedBy: player.affiliation.liegeId, tenure: "feudal", rights: [...LOCAL_AUTHORITIES] });
    player.authorityGrants = player.authorityGrants.filter((grant) => grant.id !== "commander-logistics");
    player.householdRetainers = ["dario"];
    if (next.officers?.dario) {
      next.officers.dario.allegiance = "retinue";
      next.officers.dario.rank = "家臣団長";
      next.officers.dario.rankLevel = Math.max(2, next.officers.dario.rankLevel ?? 0);
    }
    metrics.householdSupport = 42; metrics.popularSupport = 38;
    careerLog(player, next, "東境州へ封じられる", "救援戦の功績により、危険な辺境領と直属家臣を与えられた。統治画面が自領限定で解放された。");
  } else if (actionId === "consolidate_power") {
    metrics.civilMerit += 12; metrics.householdSupport = clamp(metrics.householdSupport + 9, 0, 100); metrics.popularSupport = clamp(metrics.popularSupport + 8, 0, 100); metrics.legitimacy = clamp(metrics.legitimacy + 6, 0, 100); metrics.ambition = clamp(metrics.ambition + 4, 0, 100);
    careerLog(player, next, "領内基盤を強化", "家臣、領民、地方豪族との関係を固めた。中央は自立性の上昇を警戒している。");
  } else if (actionId === "request_second_fief") {
    if (metrics.liegeTrust < 62 || metrics.civilMerit < 10) throw new Error("第二の所領には、より高い主君の信頼と政績が必要です");
    if (!player.holdings.some((holding) => holding.territoryId === "nereia")) player.holdings.push({ id: "fief-nereia", territoryId: "nereia", grantedBy: player.affiliation.liegeId, tenure: "feudal", rights: [...LOCAL_AUTHORITIES] });
    player.stage = "multi_lord"; player.title = "東南二州侯"; metrics.ambition = clamp(metrics.ambition + 12, 0, 100);
    careerLog(player, next, "第二の所領を拝領", "政績と信頼によりネレイアを加増された。統治画面の管轄が二領へ拡張された。");
  } else if (actionId === "declare_independence") {
    if (metrics.householdSupport < 55 || metrics.popularSupport < 50 || metrics.legitimacy < 30) throw new Error("独立には家臣支持55、領民支持50、正統性30が必要です");
    const formerLiege = player.affiliation.liegeName;
    player.stage = "independent_ruler"; player.title = "辺境王"; player.sovereign = true;
    player.affiliation = { nationId: "player_realm", liegeId: null, liegeName: null };
    metrics.liegeTrust = 0; metrics.legitimacy = clamp(metrics.legitimacy + 12, 0, 100); metrics.ambition = clamp(metrics.ambition + 20, 0, 100);
    careerLog(player, next, "辺境国家の独立を宣言", `${formerLiege ?? "旧主君"}との主従を解き、従来の統治画面の管轄を新国家全体へ拡張した。`);
  }
  return next;
}

export function grantDelegatedAuthority(state, grant) {
  if (!state.player) throw new Error("プレイヤーが存在しません");
  const next = clone(state);
  next.player.authorityGrants.push({
    id: grant.id ?? `grant-${next.turn}-${next.player.authorityGrants.length + 1}`,
    issuerId: grant.issuerId ?? next.player.affiliation.liegeId,
    territoryIds: [...(grant.territoryIds ?? [])], authorities: [...(grant.authorities ?? [])],
    officeId: grant.officeId ?? null, expiresTurn: grant.expiresTurn ?? null, reason: grant.reason ?? "主君からの委任",
  });
  if (grant.officeId && !next.player.offices.includes(grant.officeId)) next.player.offices.push(grant.officeId);
  return next;
}

export function imposeProhibition(state, prohibition) {
  if (!state.player) throw new Error("プレイヤーが存在しません");
  const next = clone(state);
  next.player.prohibitions.push({
    id: prohibition.id ?? `prohibition-${next.turn}-${next.player.prohibitions.length + 1}`,
    issuerId: prohibition.issuerId ?? next.player.affiliation.liegeId,
    commandId: prohibition.commandId ?? null, authority: prohibition.authority ?? null, scope: prohibition.scope ?? null,
    expiresTurn: prohibition.expiresTurn ?? null, reason: prohibition.reason ?? "中央政府の禁止令",
  });
  return next;
}

export function advanceCareerMonth(state) {
  if (!state.player) throw new Error("キャリア状態ではありません");
  const next = clone(state);
  next.turn += 1;
  next.month += 1;
  if (next.month > 12) { next.month = 1; next.year += 1; }
  next.player.authorityGrants = next.player.authorityGrants.filter((grant) => grant.expiresTurn == null || grant.expiresTurn >= next.turn);
  next.player.prohibitions = next.player.prohibitions.filter((item) => item.expiresTurn == null || item.expiresTurn >= next.turn);
  careerLog(next.player, next, "月が進む", "主君、諸侯、地域社会もそれぞれの利害に従って動いている。");
  return next;
}
