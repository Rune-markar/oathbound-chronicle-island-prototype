import {
  CRIME_HEAT_GAINS,
  CRIME_OUTCOMES,
  CRIME_RISK_LABELS,
  normalizeCrimeState,
  recordCrimeIncident,
} from "./crime-system.js";

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const CRIMINAL_ORGANIZATION_SCHEMA_VERSION = 1;

export const CRIMINAL_ORGANIZATION_STAGES = Object.freeze({
  solo: Object.freeze({ id: "solo", name: "単独犯", description: "自分で危険を負い、裏社会で実績と人脈を作る段階" }),
  crew: Object.freeze({ id: "crew", name: "一味", description: "少人数へ役割を割り振り、月単位の作戦を指示する段階" }),
  network: Object.freeze({ id: "network", name: "犯罪組織", description: "複数の作戦と人員を同時に管理する組織段階" }),
});

export const CRIMINAL_OPERATION_APPROACHES = Object.freeze({
  cautious: Object.freeze({ id: "cautious", name: "慎重", description: "時間をかけ、露見と構成員の損耗を抑える", durationDelta: 1, rewardMultiplier: 0.8, skillBonus: 2, exposureBonus: -2 }),
  balanced: Object.freeze({ id: "balanced", name: "均衡", description: "準備、収益、危険の釣り合いを取る", durationDelta: 0, rewardMultiplier: 1, skillBonus: 0, exposureBonus: 0 }),
  bold: Object.freeze({ id: "bold", name: "大胆", description: "短期の成果を狙うが、露見と損耗が増える", durationDelta: 0, rewardMultiplier: 1.25, skillBonus: -1, exposureBonus: 2 }),
});

export const CRIMINAL_OPERATION_DEFINITIONS = Object.freeze({
  extortion: Object.freeze({
    id: "extortion", name: "恐喝の指示", primarySkills: ["influence"], minimumInfluence: 0, minimumCrew: 1,
    durationMonths: 1, treasuryCost: 0, rewardWealth: 4, influenceGain: 2, difficulty: 1, severity: "serious",
    targetNames: ["市場組合の会計係", "港の倉庫主", "街道宿の支配人"],
    preparation: "対象への圧力と組織の存在感を比較する", maximumPenalty: "構成員の拘束、組織への捜査、重罪手配",
  }),
  robbery: Object.freeze({
    id: "robbery", name: "強盗の指示", primarySkills: ["force", "recon"], minimumInfluence: 0, minimumCrew: 2,
    durationMonths: 1, treasuryCost: 1, rewardWealth: 7, influenceGain: 3, difficulty: 2, severity: "serious",
    targetNames: ["徴税銀の輸送隊", "宝飾商の護送隊", "傭兵団の支払馬車"],
    preparation: "戦力、警戒、離脱の余裕を比較する", maximumPenalty: "構成員の負傷・拘束、重罪手配",
  }),
  smuggling: Object.freeze({
    id: "smuggling", name: "密輸の指示", primarySkills: ["logistics", "discretion"], minimumInfluence: 3, minimumCrew: 2,
    durationMonths: 2, treasuryCost: 1, rewardWealth: 6, influenceGain: 3, difficulty: 2, severity: "serious",
    targetNames: ["禁制品の越境輸送", "未申告貨物の受け渡し", "封印貨物の地方間運搬"],
    preparation: "期限、連絡網、検問の厳しさを比較する", maximumPenalty: "積荷没収、構成員の拘束、密輸罪の手配",
  }),
  sabotage: Object.freeze({
    id: "sabotage", name: "破壊工作の指示", primarySkills: ["discretion", "recon"], minimumInfluence: 6, minimumCrew: 2,
    durationMonths: 2, treasuryCost: 2, rewardWealth: 3, influenceGain: 5, difficulty: 3, severity: "serious",
    targetNames: ["敵対勢力の補給拠点", "地方守備隊の集積所", "監視網の中継地点"],
    preparation: "対象の警戒と構成員の潜入適性を比較する", maximumPenalty: "構成員の拘束、組織への報復、重罪手配",
  }),
  kidnapping: Object.freeze({
    id: "kidnapping", name: "誘拐の指示", primarySkills: ["force", "discretion"], minimumInfluence: 8, minimumCrew: 2,
    durationMonths: 2, treasuryCost: 2, rewardWealth: 8, influenceGain: 4, difficulty: 3, severity: "serious",
    targetNames: ["有力商家の後継者", "敵対派閥の交渉役", "地方役人の近親者"],
    preparation: "標的の価値、警戒、組織の保持能力を比較する", maximumPenalty: "構成員の拘束、厳重手配、組織への大規模捜査",
  }),
  assassination: Object.freeze({
    id: "assassination", name: "暗殺の指示", primarySkills: ["discretion", "recon"], minimumInfluence: 14, minimumCrew: 2,
    durationMonths: 3, treasuryCost: 3, rewardWealth: 5, influenceGain: 8, difficulty: 4, severity: "capital",
    targetNames: ["敵対組織の密告人", "反組織派の地方実力者", "取引を破棄した有力仲介人"],
    preparation: "標的の重要度、警戒、担当者の忠誠を比較する", maximumPenalty: "構成員の拘束、死刑相当の手配、組織壊滅の危険",
  }),
});

const RECRUIT_PROFILES = Object.freeze([
  Object.freeze({ roleId: "scout", role: "斥候", specialties: ["偵察", "警戒把握"], skills: { recon: 4, force: 1, logistics: 2, discretion: 3, influence: 1 } }),
  Object.freeze({ roleId: "enforcer", role: "実働役", specialties: ["実力行使", "護衛対処"], skills: { recon: 1, force: 4, logistics: 2, discretion: 1, influence: 2 } }),
  Object.freeze({ roleId: "infiltrator", role: "潜入役", specialties: ["潜入", "秘密保持"], skills: { recon: 3, force: 1, logistics: 2, discretion: 4, influence: 1 } }),
  Object.freeze({ roleId: "courier", role: "運び屋", specialties: ["越境輸送", "期限管理"], skills: { recon: 2, force: 1, logistics: 4, discretion: 3, influence: 1 } }),
  Object.freeze({ roleId: "fixer", role: "交渉役", specialties: ["裏交渉", "人脈"], skills: { recon: 1, force: 1, logistics: 2, discretion: 2, influence: 4 } }),
  Object.freeze({ roleId: "veteran", role: "古参用心棒", specialties: ["統率", "危機対応"], skills: { recon: 2, force: 3, logistics: 2, discretion: 2, influence: 3 } }),
]);

const RECRUIT_NAMES = Object.freeze(["ネラ", "ヴァイス", "トーマ", "イリヤ", "マレク", "ソーニャ", "ルッツ", "エステル"]);

function emptyOrganizationState() {
  return {
    schemaVersion: CRIMINAL_ORGANIZATION_SCHEMA_VERSION,
    stage: "solo",
    id: null,
    name: null,
    jurisdictionId: null,
    foundedTurn: null,
    influence: 0,
    treasury: 0,
    members: [],
    recruitmentRecords: [],
    activeOrders: [],
    completedOrders: [],
    captives: [],
    pendingDecisions: [],
    decisionRecords: [],
    financeRecords: [],
  };
}

function requireCrimeState(state) {
  if (!state?.player?.crime) throw new TypeError("犯罪組織状態にはプレイヤーの犯罪状態が必要です");
}

function normalizedOrganization(prior = {}) {
  const baseline = emptyOrganizationState();
  const stage = prior.stage in CRIMINAL_ORGANIZATION_STAGES ? prior.stage : "solo";
  return {
    ...baseline,
    ...prior,
    schemaVersion: CRIMINAL_ORGANIZATION_SCHEMA_VERSION,
    stage,
    influence: Math.max(0, Number.isFinite(prior.influence) ? prior.influence : 0),
    treasury: Math.max(0, Number.isFinite(prior.treasury) ? prior.treasury : 0),
    members: clone(prior.members ?? []),
    recruitmentRecords: clone(prior.recruitmentRecords ?? []),
    activeOrders: clone(prior.activeOrders ?? []),
    completedOrders: clone(prior.completedOrders ?? []),
    captives: clone(prior.captives ?? []),
    pendingDecisions: clone(prior.pendingDecisions ?? []),
    decisionRecords: clone(prior.decisionRecords ?? []),
    financeRecords: clone(prior.financeRecords ?? []),
  };
}

export function normalizeCriminalOrganizationStateOnDraft(state) {
  requireCrimeState(state);
  state.player.crime.organization = normalizedOrganization(state.player.crime.organization);
  return state;
}

export function normalizeCriminalOrganizationState(state) {
  if (!state?.player) throw new TypeError("犯罪組織状態にはプレイヤーが必要です");
  const next = state.player.crime ? clone(state) : normalizeCrimeState(state);
  return normalizeCriminalOrganizationStateOnDraft(next);
}

function organizationSnapshot(state) {
  return normalizedOrganization(state.player?.crime?.organization ?? {});
}

function currentJurisdictionId(state, context = {}) {
  return context.jurisdictionId ?? context.regionId ?? state.generatedWorld?.expeditionRegionId ?? state.player?.locationId ?? null;
}

function hasLocalBroker(state, jurisdictionId) {
  return (state.player?.crime?.contacts ?? []).some((entry) => entry.role === "broker" && entry.jurisdictionId === jurisdictionId);
}

function hasSoloExperience(state) {
  return (state.player?.crime?.incidents ?? []).length > 0;
}

function candidatePool(state, context = {}) {
  const jurisdictionId = currentJurisdictionId(state, context);
  if (!jurisdictionId || !hasSoloExperience(state) || !hasLocalBroker(state, jurisdictionId)) return [];
  const seed = state.generatedWorld?.seed ?? state.worldSeed ?? "underworld";
  const offset = hashString(`${seed}:${jurisdictionId}:recruits`) % RECRUIT_PROFILES.length;
  const nameOffset = hashString(`${seed}:${jurisdictionId}:recruit-names`) % RECRUIT_NAMES.length;
  return RECRUIT_PROFILES.map((_, index) => RECRUIT_PROFILES[(index + offset) % RECRUIT_PROFILES.length]).map((profile, index) => {
    const name = RECRUIT_NAMES[(nameOffset + index) % RECRUIT_NAMES.length];
    const fee = 1 + (hashString(`${seed}:${jurisdictionId}:${profile.roleId}:fee`) % 2);
    return {
      id: `criminal-recruit:${jurisdictionId}:${profile.roleId}`,
      name,
      roleId: profile.roleId,
      role: profile.role,
      specialties: [...profile.specialties],
      skills: { ...profile.skills },
      fee,
      loyalty: 52 + (hashString(`${seed}:${jurisdictionId}:${profile.roleId}:loyalty`) % 17),
      jurisdictionId,
      jurisdictionName: context.jurisdictionName ?? jurisdictionId,
    };
  });
}

export function getCriminalRecruitCandidates(state, context = {}) {
  const organization = organizationSnapshot(state);
  const recruited = new Set(organization.members.map((entry) => entry.candidateId ?? entry.id));
  return candidatePool(state, context).filter((entry) => !recruited.has(entry.id)).map(clone);
}

function ensurePlayerWealth(next) {
  next.player.metrics ??= {};
  next.player.metrics.wealth = Math.max(0, Number(next.player.metrics.wealth) || 0);
}

function ensureFormed(organization) {
  if (organization.stage === "solo" || !organization.id) throw new Error("先に犯罪組織を結成してください");
}

export function recruitCriminalMember(state, input = {}) {
  const next = normalizeCriminalOrganizationState(state);
  const organization = next.player.crime.organization;
  const jurisdictionId = input.jurisdictionId ?? currentJurisdictionId(next, input);
  const candidate = candidatePool(next, { ...input, jurisdictionId }).find((entry) => entry.id === input.candidateId);
  if (!candidate) throw new Error("この場所で雇える人材ではありません");
  if (organization.members.some((entry) => (entry.candidateId ?? entry.id) === candidate.id)) throw new Error("その人材は加入済みです");
  if (organization.members.filter((entry) => entry.status !== "left").length >= 8) throw new Error("現在の組織規模ではこれ以上雇えません");
  ensurePlayerWealth(next);
  if (next.player.metrics.wealth < candidate.fee) throw new RangeError(`人材を雇う財産${candidate.fee}が必要です`);
  next.player.metrics.wealth -= candidate.fee;
  const member = {
    id: `criminal-member:${organization.members.length + 1}:${candidate.roleId}`,
    candidateId: candidate.id,
    name: candidate.name,
    roleId: candidate.roleId,
    role: candidate.role,
    specialties: [...candidate.specialties],
    skills: { ...candidate.skills },
    loyalty: candidate.loyalty,
    status: "available",
    assignedOrderId: null,
    joinedTurn: next.turn ?? 0,
    jurisdictionId,
  };
  organization.members.push(member);
  organization.recruitmentRecords.unshift({ memberId: member.id, candidateId: candidate.id, fee: candidate.fee, jurisdictionId, turn: next.turn ?? 0 });
  updateOrganizationStage(organization);
  return next;
}

export function formCriminalOrganization(state, input = {}) {
  const next = normalizeCriminalOrganizationState(state);
  const organization = next.player.crime.organization;
  if (organization.stage !== "solo") throw new Error("犯罪組織はすでに結成済みです");
  const activeMembers = organization.members.filter((entry) => entry.status !== "left");
  if (activeMembers.length < 2) throw new Error("組織の結成には構成員2名が必要です");
  const jurisdictionId = input.jurisdictionId ?? currentJurisdictionId(next, input);
  if (!hasLocalBroker(next, jurisdictionId)) throw new Error("現地の仲介人との接触が必要です");
  ensurePlayerWealth(next);
  if (next.player.metrics.wealth < 2) throw new RangeError("組織の結成資金として財産2が必要です");
  const name = String(input.name ?? "灰影団").trim().slice(0, 24);
  if (!name) throw new TypeError("組織名が必要です");
  next.player.metrics.wealth -= 2;
  organization.stage = "crew";
  organization.id = `criminal-organization:${next.generatedWorld?.seed ?? next.worldSeed ?? "world"}:${next.turn ?? 0}`;
  organization.name = name;
  organization.jurisdictionId = jurisdictionId;
  organization.foundedTurn = next.turn ?? 0;
  organization.treasury += 2;
  next.player.history ??= [];
  next.player.history.unshift({
    id: `player-history-${organization.id}`,
    type: "criminal_organization_founded",
    turn: next.turn ?? 0,
    year: next.year ?? null,
    month: next.month ?? null,
    title: `${name}を結成`,
    detail: `${activeMembers.map((entry) => entry.name).join("、")}と役割を分け、単独犯から一味の指揮者になった。`,
  });
  return next;
}

function operationTarget(state, definition, jurisdictionId) {
  const seed = state.generatedWorld?.seed ?? state.worldSeed ?? "operation";
  const index = hashString(`${seed}:${jurisdictionId}:${definition.id}:target`) % definition.targetNames.length;
  const name = definition.targetNames[index];
  return {
    id: `organization-target:${definition.id}:${jurisdictionId}:${index}`,
    name,
    jurisdictionId,
    kind: `${definition.id}_target`,
  };
}

function memberFit(member, definition) {
  return definition.primarySkills.reduce((total, skill) => total + (Number(member.skills?.[skill]) || 0), 0)
    + Math.floor((Number(member.loyalty) || 0) / 25);
}

function riskForOperation(state, organization, definition) {
  const available = organization.members.filter((entry) => entry.status === "available");
  const bestFit = available.reduce((best, member) => Math.max(best, memberFit(member, definition)), 0);
  const jurisdictionId = currentJurisdictionId(state);
  const heat = Number(state.player?.crime?.heatByJurisdiction?.[jurisdictionId]) || 0;
  const score = definition.difficulty + Math.floor(heat / 30) - Math.floor(bestFit / 5) - Math.floor(organization.influence / 12);
  return CRIME_RISK_LABELS[clamp(score + 1, 0, CRIME_RISK_LABELS.length - 1)];
}

function activeOrderLimit(organization) {
  if (organization.stage === "network") return 3;
  if (organization.stage === "crew") return 1;
  return 0;
}

function operationOptions(state, context = {}, organization = organizationSnapshot(state)) {
  const jurisdictionId = currentJurisdictionId(state, context);
  if (!jurisdictionId) return [];
  return Object.values(CRIMINAL_OPERATION_DEFINITIONS).map((definition) => {
    const target = operationTarget(state, definition, jurisdictionId);
    const influenceReady = organization.influence >= definition.minimumInfluence;
    const commandCapacityReady = organization.activeOrders.length < activeOrderLimit(organization);
    const unlocked = organization.stage !== "solo" && influenceReady && commandCapacityReady;
    return {
      id: `criminal-operation:${definition.id}:${jurisdictionId}:${target.id.split(":").at(-1)}`,
      type: definition.id,
      name: definition.name,
      target,
      jurisdictionId,
      jurisdictionName: context.jurisdictionName ?? jurisdictionId,
      unlocked,
      lockedReason: organization.stage === "solo"
        ? "犯罪組織の結成が必要です"
        : !influenceReady ? `組織影響力${definition.minimumInfluence}が必要です`
          : !commandCapacityReady ? organization.stage === "crew" ? "一味で同時に指示できる作戦は1件です" : "犯罪組織で同時に指示できる作戦は3件です"
            : null,
      minimumInfluence: definition.minimumInfluence,
      minimumCrew: definition.minimumCrew,
      durationMonths: definition.durationMonths,
      treasuryCost: definition.treasuryCost,
      expectedReward: { wealth: definition.rewardWealth, text: `組織金庫+${definition.rewardWealth}` },
      riskLabel: riskForOperation(state, organization, definition),
      preferredRoles: [...definition.primarySkills],
      preparationRequirements: [definition.preparation, `担当${definition.minimumCrew}名以上`],
      maximumPenalty: definition.maximumPenalty,
    };
  });
}

export function getCriminalOrganizationView(state, context = {}) {
  const organization = organizationSnapshot(state);
  const jurisdictionId = currentJurisdictionId(state, context);
  const activeMembers = organization.members.filter((entry) => entry.status !== "left");
  const availableMembers = activeMembers.filter((entry) => entry.status === "available");
  const candidates = getCriminalRecruitCandidates(state, { ...context, jurisdictionId });
  const brokerKnown = Boolean(jurisdictionId && hasLocalBroker(state, jurisdictionId));
  const soloExperience = hasSoloExperience(state);
  const canForm = organization.stage === "solo" && activeMembers.length >= 2 && brokerKnown && (Number(state.player?.metrics?.wealth) || 0) >= 2;
  return {
    schemaVersion: CRIMINAL_ORGANIZATION_SCHEMA_VERSION,
    stage: organization.stage,
    stageName: CRIMINAL_ORGANIZATION_STAGES[organization.stage].name,
    stageDescription: CRIMINAL_ORGANIZATION_STAGES[organization.stage].description,
    formed: organization.stage !== "solo",
    id: organization.id,
    name: organization.name,
    influence: organization.influence,
    treasury: organization.treasury,
    jurisdictionId,
    brokerKnown,
    soloExperience,
    candidates,
    members: clone(activeMembers),
    availableMembers: clone(availableMembers),
    activeOrders: clone(organization.activeOrders),
    activeOrderCount: organization.activeOrders.length,
    activeOrderLimit: activeOrderLimit(organization),
    completedOrders: clone(organization.completedOrders),
    captives: clone(organization.captives),
    pendingDecisions: clone(organization.pendingDecisions),
    operations: operationOptions(state, { ...context, jurisdictionId }, organization),
    canForm,
    formationReason: canForm
      ? "構成員2名と結成資金が揃っています"
      : !soloExperience ? "まず単独で非合法行動を1件経験してください"
        : !brokerKnown ? "現地の裏社会で仲介人を見つけてください"
          : activeMembers.length < 2 ? `構成員をあと${2 - activeMembers.length}名雇ってください`
            : "結成資金として財産2が必要です",
    nextStageReason: organization.stage === "crew"
      ? `犯罪組織化：構成員4名・完了作戦3件・影響力15（現在 ${activeMembers.length}名・${organization.completedOrders.length}件・${organization.influence}）`
      : organization.stage === "network" ? "複数作戦を運営できる犯罪組織です" : "構成員を集めて一味を結成します",
  };
}

function memberById(organization, memberId) {
  return organization.members.find((entry) => entry.id === memberId && entry.status !== "left") ?? null;
}

function updateOrganizationStage(organization) {
  const activeMembers = organization.members.filter((entry) => entry.status !== "left");
  if (organization.stage === "crew" && activeMembers.length >= 4 && organization.completedOrders.length >= 3 && organization.influence >= 15) {
    organization.stage = "network";
  }
}

export function issueCriminalOperationOrder(state, input = {}) {
  const next = normalizeCriminalOrganizationState(state);
  const organization = next.player.crime.organization;
  ensureFormed(organization);
  const jurisdictionId = input.jurisdictionId ?? currentJurisdictionId(next, input);
  const option = operationOptions(next, { ...input, jurisdictionId }, organization).find((entry) => entry.id === input.optionId);
  if (!option) throw new Error("指示できる作戦が見つかりません");
  if (!option.unlocked) throw new Error(option.lockedReason);
  const leader = memberById(organization, input.leaderId);
  const support = input.supportId ? memberById(organization, input.supportId) : null;
  if (!leader) throw new Error("作戦責任者を選んでください");
  if (support && support.id === leader.id) throw new Error("責任者と支援役には別々の人員を選んでください");
  const assigned = [leader, ...(support ? [support] : [])];
  if (assigned.some((entry) => entry.status !== "available")) throw new Error("作戦中または拘束中の構成員は選べません");
  if (assigned.length < option.minimumCrew) throw new Error(`この作戦には担当${option.minimumCrew}名以上が必要です`);
  if (organization.treasury < option.treasuryCost) throw new RangeError(`作戦資金として組織金庫${option.treasuryCost}が必要です`);
  const approach = CRIMINAL_OPERATION_APPROACHES[input.approach] ?? CRIMINAL_OPERATION_APPROACHES.balanced;
  const definition = CRIMINAL_OPERATION_DEFINITIONS[option.type];
  organization.treasury -= option.treasuryCost;
  const orderId = `criminal-order:${next.turn ?? 0}:${organization.activeOrders.length + organization.completedOrders.length + 1}:${option.type}`;
  const durationMonths = Math.max(1, option.durationMonths + approach.durationDelta);
  const order = {
    id: orderId,
    organizationId: organization.id,
    organizationName: organization.name,
    type: option.type,
    name: definition.name,
    target: clone(option.target),
    jurisdictionId,
    jurisdictionName: option.jurisdictionName,
    approach: approach.id,
    approachName: approach.name,
    assignedMemberIds: assigned.map((entry) => entry.id),
    assignedMembers: assigned.map((entry) => ({ id: entry.id, name: entry.name, role: entry.role, loyalty: entry.loyalty, skills: clone(entry.skills) })),
    durationMonths,
    remainingMonths: durationMonths,
    treasuryCost: option.treasuryCost,
    expectedReward: Math.max(1, Math.round(option.expectedReward.wealth * approach.rewardMultiplier)),
    riskLabel: option.riskLabel,
    status: "active",
    startedTurn: next.turn ?? 0,
    readyResult: null,
  };
  assigned.forEach((entry) => {
    entry.status = "assigned";
    entry.assignedOrderId = orderId;
  });
  organization.activeOrders.push(order);
  return next;
}

function deterministicOrderResult(state, order) {
  const definition = CRIMINAL_OPERATION_DEFINITIONS[order.type];
  const approach = CRIMINAL_OPERATION_APPROACHES[order.approach] ?? CRIMINAL_OPERATION_APPROACHES.balanced;
  const fit = order.assignedMembers.reduce((total, member) => total + memberFit(member, definition), 0);
  const roll = hashString(`${state.generatedWorld?.seed ?? state.worldSeed ?? "organization"}:${order.id}:${state.turn ?? 0}:result`) % 12;
  const successLine = Math.max(2, 6 + fit + approach.skillBonus - definition.difficulty * 2);
  const success = roll < successLine;
  const exposureRoll = hashString(`${order.id}:${state.turn ?? 0}:exposure`) % 10;
  const exposed = exposureRoll + approach.exposureBonus + definition.difficulty >= 7;
  if (success) return { outcome: exposed ? "success_exposed" : "success_hidden", detected: exposed };
  const captured = (hashString(`${order.id}:capture`) % 10) + definition.difficulty + approach.exposureBonus >= 10;
  return { outcome: captured ? "captured" : "failed_escaped", detected: true };
}

export function advanceCriminalOrganizationMonthOnDraft(state) {
  normalizeCriminalOrganizationStateOnDraft(state);
  const organization = state.player.crime.organization;
  organization.members.forEach((member) => {
    if (member.status === "recovering") {
      member.unavailableMonths = Math.max(0, (Number(member.unavailableMonths) || 1) - 1);
      if (member.unavailableMonths === 0) member.status = "available";
    }
  });
  organization.activeOrders.forEach((order) => {
    if (order.status !== "active") return;
    order.remainingMonths = Math.max(0, (Number(order.remainingMonths) || 0) - 1);
    if (order.remainingMonths === 0) {
      order.status = "report_ready";
      order.readyTurn = state.turn ?? 0;
      order.readyResult = deterministicOrderResult(state, order);
    }
  });
  return state;
}

export function advanceCriminalOrganizationMonth(state) {
  if (!state?.player) throw new TypeError("犯罪組織の月次更新にはプレイヤーが必要です");
  return advanceCriminalOrganizationMonthOnDraft(clone(state));
}

function releaseAssignedMembers(organization, order, outcome) {
  const capturedId = outcome === "captured" ? order.assignedMemberIds[0] : null;
  for (const memberId of order.assignedMemberIds) {
    const member = memberById(organization, memberId);
    if (!member) continue;
    member.assignedOrderId = null;
    if (memberId === capturedId) {
      member.status = "captured";
      member.loyalty = clamp(member.loyalty - 5, 0, 100);
    } else if (outcome === "failed_escaped") {
      member.status = "recovering";
      member.unavailableMonths = 1;
      member.loyalty = clamp(member.loyalty - 2, 0, 100);
    } else {
      member.status = "available";
      if (outcome.startsWith("success_")) member.loyalty = clamp(member.loyalty + 1, 0, 100);
    }
  }
  return capturedId;
}

function decisionId(organization, kind) {
  return `criminal-decision:${kind}:${organization.pendingDecisions.length + organization.decisionRecords.length + 1}`;
}

export function resolveCriminalOperationReport(state, input = {}) {
  const normalized = normalizeCriminalOrganizationState(state);
  const beforeOrganization = normalized.player.crime.organization;
  const order = beforeOrganization.activeOrders.find((entry) => entry.id === input.orderId);
  if (!order || order.status !== "report_ready") throw new Error("確認できる作戦報告がありません");
  const result = input.outcome
    ? { outcome: input.outcome, detected: input.detected ?? input.outcome !== "success_hidden" }
    : order.readyResult;
  if (!result || !CRIME_OUTCOMES.includes(result.outcome)) throw new RangeError("作戦結果が不正です");
  const successful = result.outcome === "success_hidden" || result.outcome === "success_exposed";
  const definition = CRIMINAL_OPERATION_DEFINITIONS[order.type];
  let next = recordCrimeIncident(normalized, {
    id: `organization-incident:${order.id}`,
    type: order.type,
    severity: definition.severity,
    organizationId: order.organizationId,
    operationId: order.id,
    delegated: true,
    perpetrator: { id: order.organizationId, name: order.organizationName },
    accomplices: clone(order.assignedMembers),
    victim: successful && order.type === "kidnapping" ? clone(order.target) : null,
    target: clone(order.target),
    jurisdiction: { id: order.jurisdictionId, name: order.jurisdictionName },
    reward: successful ? { wealth: order.expectedReward, text: `組織金庫+${order.expectedReward}` } : null,
    outcome: result.outcome,
    detected: Boolean(result.detected),
    historyText: `${order.organizationName}が${order.target.name}への${definition.name.replace("の指示", "")}を構成員へ命じ、${successful ? "作戦を完遂した" : "作戦に失敗した"}。`,
  });
  const organization = next.player.crime.organization;
  const liveOrder = organization.activeOrders.find((entry) => entry.id === order.id);
  const capturedMemberId = releaseAssignedMembers(organization, liveOrder, result.outcome);
  organization.activeOrders = organization.activeOrders.filter((entry) => entry.id !== order.id);
  const completed = {
    ...clone(liveOrder),
    status: "completed",
    outcome: result.outcome,
    detected: Boolean(result.detected),
    completedTurn: next.turn ?? 0,
  };
  delete completed.readyResult;
  organization.completedOrders.unshift(completed);
  if (successful) {
    organization.influence += definition.influenceGain;
    if (order.type === "kidnapping") {
      const captive = { id: `captive:${order.id}`, target: clone(order.target), jurisdictionId: order.jurisdictionId, incidentId: `organization-incident:${order.id}`, status: "held", acquiredTurn: next.turn ?? 0 };
      organization.captives.push(captive);
      organization.pendingDecisions.push({
        id: decisionId(organization, "captive"),
        kind: "captive_disposition",
        captiveId: captive.id,
        incidentId: captive.incidentId,
        jurisdictionId: order.jurisdictionId,
        targetName: order.target.name,
        reward: order.expectedReward,
        options: [
          { id: "ransom", name: "身代金を要求", description: "金庫を増やすが、事件が露見し手配が強まる" },
          { id: "leverage", name: "交渉材料にする", description: "収益を抑え、組織影響力を大きく得る" },
          { id: "release", name: "解放する", description: "収益を捨て、構成員の忠誠を守る" },
        ],
      });
    } else {
      organization.treasury += order.expectedReward;
      next.player.crime.illegalGain += order.expectedReward;
    }
  } else {
    organization.influence = Math.max(0, organization.influence - 1);
  }
  if (capturedMemberId) {
    const captured = memberById(organization, capturedMemberId);
    organization.pendingDecisions.push({
      id: decisionId(organization, "capture"),
      kind: "member_capture",
      memberId: capturedMemberId,
      memberName: captured?.name ?? capturedMemberId,
      jurisdictionId: order.jurisdictionId,
      recoveryCost: 3,
      options: [
        { id: "recover", name: "身請けする", description: "組織金庫3を使い構成員を戻す" },
        { id: "abandon", name: "見捨てる", description: "費用は不要だが、本人と仲間の忠誠を失う" },
      ],
    });
  }
  updateOrganizationStage(organization);
  return next;
}

function exposeKidnappingIncident(next, decision, heatGain) {
  const incident = next.player.crime.incidents.find((entry) => entry.id === decision.incidentId);
  if (incident && !incident.detected) {
    incident.detected = true;
    incident.outcome = "success_exposed";
  }
  next.player.crime.heatByJurisdiction[decision.jurisdictionId] = clamp(
    (Number(next.player.crime.heatByJurisdiction[decision.jurisdictionId]) || 0) + heatGain,
    0,
    100,
  );
}

export function resolveCriminalOrganizationDecision(state, input = {}) {
  const next = normalizeCriminalOrganizationState(state);
  const organization = next.player.crime.organization;
  const decision = organization.pendingDecisions.find((entry) => entry.id === input.decisionId);
  if (!decision) throw new Error("未処理の組織判断がありません");
  if (!decision.options.some((entry) => entry.id === input.choice)) throw new RangeError("選べない組織判断です");
  if (decision.kind === "captive_disposition") {
    const captive = organization.captives.find((entry) => entry.id === decision.captiveId);
    if (!captive) throw new Error("処遇対象が見つかりません");
    if (input.choice === "ransom") {
      organization.treasury += decision.reward;
      organization.influence += 2;
      next.player.crime.illegalGain += decision.reward;
      exposeKidnappingIncident(next, decision, Math.ceil(CRIME_HEAT_GAINS.kidnapping / 2));
    } else if (input.choice === "leverage") {
      const partialReward = Math.max(1, Math.floor(decision.reward / 2));
      organization.treasury += partialReward;
      organization.influence += 5;
      next.player.crime.illegalGain += partialReward;
      exposeKidnappingIncident(next, decision, 10);
    } else {
      organization.influence += 1;
      organization.members.filter((entry) => entry.status !== "left").forEach((entry) => { entry.loyalty = clamp(entry.loyalty + 3, 0, 100); });
    }
    captive.status = input.choice === "release" ? "released" : input.choice === "ransom" ? "ransomed" : "leveraged";
    captive.resolvedTurn = next.turn ?? 0;
    organization.captives = organization.captives.filter((entry) => entry.id !== captive.id);
  } else if (decision.kind === "member_capture") {
    const member = organization.members.find((entry) => entry.id === decision.memberId);
    if (!member) throw new Error("拘束された構成員が見つかりません");
    if (input.choice === "recover") {
      if (organization.treasury < decision.recoveryCost) throw new RangeError(`身請けには組織金庫${decision.recoveryCost}が必要です`);
      organization.treasury -= decision.recoveryCost;
      member.status = "available";
      member.loyalty = clamp(member.loyalty - 2, 0, 100);
    } else {
      member.status = "left";
      member.assignedOrderId = null;
      organization.members.filter((entry) => entry.id !== member.id && entry.status !== "left").forEach((entry) => { entry.loyalty = clamp(entry.loyalty - 8, 0, 100); });
    }
  }
  organization.pendingDecisions = organization.pendingDecisions.filter((entry) => entry.id !== decision.id);
  organization.decisionRecords.unshift({ decisionId: decision.id, kind: decision.kind, choice: input.choice, turn: next.turn ?? 0 });
  updateOrganizationStage(organization);
  return next;
}

function normalizeAmount(value) {
  const amount = Math.trunc(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) throw new RangeError("資金額は1以上で指定してください");
  return amount;
}

export function fundCriminalOrganization(state, input = {}) {
  const next = normalizeCriminalOrganizationState(state);
  const organization = next.player.crime.organization;
  ensureFormed(organization);
  const amount = normalizeAmount(input.amount);
  ensurePlayerWealth(next);
  if (next.player.metrics.wealth < amount) throw new RangeError("組織へ入れる財産が足りません");
  next.player.metrics.wealth -= amount;
  organization.treasury += amount;
  organization.financeRecords.unshift({ type: "fund", amount, turn: next.turn ?? 0 });
  return next;
}

export function withdrawCriminalOrganizationFunds(state, input = {}) {
  const next = normalizeCriminalOrganizationState(state);
  const organization = next.player.crime.organization;
  ensureFormed(organization);
  const amount = normalizeAmount(input.amount);
  if (organization.treasury < amount) throw new RangeError("組織金庫が足りません");
  ensurePlayerWealth(next);
  organization.treasury -= amount;
  next.player.metrics.wealth += amount;
  organization.members.filter((entry) => entry.status !== "left").forEach((entry) => { entry.loyalty = clamp(entry.loyalty - 2, 0, 100); });
  organization.financeRecords.unshift({ type: "withdraw", amount, turn: next.turn ?? 0 });
  return next;
}

export function distributeCriminalOrganizationProfits(state) {
  const next = normalizeCriminalOrganizationState(state);
  const organization = next.player.crime.organization;
  ensureFormed(organization);
  const members = organization.members.filter((entry) => entry.status !== "left");
  const cost = Math.max(1, members.length);
  if (organization.treasury < cost) throw new RangeError(`利益分配には組織金庫${cost}が必要です`);
  organization.treasury -= cost;
  members.forEach((entry) => { entry.loyalty = clamp(entry.loyalty + 5, 0, 100); });
  organization.influence += 1;
  organization.financeRecords.unshift({ type: "distribute", amount: cost, turn: next.turn ?? 0 });
  updateOrganizationStage(organization);
  return next;
}
