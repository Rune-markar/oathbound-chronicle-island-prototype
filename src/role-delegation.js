const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));
const clone = (value) => structuredClone(value);

export const ROLE_DELEGATION_SCHEMA_VERSION = 1;

// Career stages remain owned by player-career.js.  This table only describes
// the practical responsibility that must survive when the player leaves it.
export const DELEGATABLE_ROLES = Object.freeze({
  commander: Object.freeze({
    id: "commander", name: "国境隊長", delegatedName: "国境遊撃隊長", level: 2,
    organizationType: "unit", organizationId: "border_company", territoryId: "orta", minRankLevel: 1,
    successionCandidateIds: Object.freeze(["dario"]),
    description: "国境遊撃隊の訓練、警備、斥候、軍需点検を担う。開戦や国家軍全体の編成は決められない。",
  }),
  lord: Object.freeze({
    id: "lord", name: "東境州辺境伯", delegatedName: "東境州代官", level: 3,
    organizationType: "territory", organizationId: "orta", territoryId: "orta", minRankLevel: 2,
    description: "東境州の日常統治と州庫運用を担う。国家政策、他領への命令、開戦は決められない。",
  }),
});

export const DELEGATION_MANDATES = Object.freeze({
  balanced: Object.freeze({
    id: "balanced", name: "均衡運用", description: "危機を先に処理し、平時は軍務と民政を均衡させる。",
    priorities: Object.freeze({ organization: 8, training: 7, security: 7, intelligence: 6, logistics: 5, relief: 6, economy: 5, audit: 5 }),
  }),
  defensive: Object.freeze({
    id: "defensive", name: "防衛優先", description: "即応力、訓練、街道警備、備蓄を優先する。",
    priorities: Object.freeze({ organization: 14, training: 12, security: 11, intelligence: 3, logistics: 10, relief: 4, economy: 2, audit: 6 }),
  }),
  local_welfare: Object.freeze({
    id: "local_welfare", name: "民生優先", description: "食料、民心、治安、汚職を先に処理する。",
    priorities: Object.freeze({ organization: 3, training: 2, security: 9, intelligence: 4, logistics: 5, relief: 14, economy: 8, audit: 10 }),
  }),
  initiative: Object.freeze({
    id: "initiative", name: "現地主導", description: "斥候、巡察、交易、現地補修を先回りして処理する。",
    priorities: Object.freeze({ organization: 5, training: 4, security: 10, intelligence: 14, logistics: 10, relief: 5, economy: 11, audit: 5 }),
  }),
});

export const DELEGATION_AUTHORITY_LEVELS = Object.freeze({
  narrow: Object.freeze({
    id: "narrow", name: "限定裁量", influenceGrowth: 0.08,
    description: "組織内部の通常判断だけを認め、現地支出や制度変更は上申させる。",
    scopes: Object.freeze(["routine", "training"]),
  }),
  standard: Object.freeze({
    id: "standard", name: "通常裁量", influenceGrowth: 0.22,
    description: "平時の警備、斥候、少額支出を担当者の判断に任せる。",
    scopes: Object.freeze(["routine", "training", "security", "intelligence", "local_spending"]),
  }),
  broad: Object.freeze({
    id: "broad", name: "広範裁量", influenceGrowth: 0.45,
    description: "州庫留保を含む広い実務判断を認める。成果と同時に独自基盤も育ちやすい。",
    scopes: Object.freeze(["routine", "training", "security", "intelligence", "local_spending", "emergency"]),
  }),
});

const CAREER_ORDER = Object.freeze({
  individual: 0, retainer: 1, commander: 2, lord: 3, multi_lord: 4,
  governor: 5, regent: 6, independent_ruler: 7, centralized_ruler: 8,
});

const ACTIONS = Object.freeze({
  organization: Object.freeze({ id: "organization", title: "指揮系統を再整備", scope: "routine", traits: ["mobilize", "drill"], stats: { leadership: 0.62, intelligence: 0.23, charisma: 0.15 } }),
  training: Object.freeze({ id: "training", title: "配下部隊を交代訓練", scope: "training", traits: ["drill", "mobilize"], stats: { leadership: 0.5, war: 0.35, charisma: 0.15 } }),
  security: Object.freeze({ id: "security", title: "街道と集落を巡察", scope: "security", traits: ["scouting", "mobilize"], stats: { leadership: 0.3, intelligence: 0.28, war: 0.18, charisma: 0.24 } }),
  intelligence: Object.freeze({ id: "intelligence", title: "現地報告を照合", scope: "intelligence", traits: ["scouting", "justification"], stats: { intelligence: 0.55, leadership: 0.25, politics: 0.2 } }),
  logistics: Object.freeze({ id: "logistics", title: "街道と備蓄を補修", scope: "local_spending", traits: ["repair", "harbor"], stats: { politics: 0.35, intelligence: 0.35, leadership: 0.3 } }),
  relief: Object.freeze({ id: "relief", title: "州庫から窮民を救済", scope: "emergency", traits: ["commerce", "diplomacy"], stats: { politics: 0.42, charisma: 0.38, intelligence: 0.2 } }),
  economy: Object.freeze({ id: "economy", title: "市場と生産台帳を整備", scope: "local_spending", traits: ["commerce", "harbor"], stats: { politics: 0.5, intelligence: 0.25, charisma: 0.25 } }),
  audit: Object.freeze({ id: "audit", title: "属官の帳簿を監査", scope: "local_spending", traits: ["justification", "commerce"], stats: { politics: 0.5, intelligence: 0.4, charisma: 0.1 } }),
});

function emptyDelegationState(state) {
  return {
    schemaVersion: ROLE_DELEGATION_SCHEMA_VERSION,
    initializedAtStage: state.player?.stage ?? null,
    organizations: {},
    assignments: {},
    promotionHistory: [],
    personnelHistory: [],
    reports: [],
  };
}

function ensureBorderCompany(state) {
  const system = state.roleDelegation;
  if ((CAREER_ORDER[state.player?.stage] ?? -1) < CAREER_ORDER.commander) return null;
  system.organizations.border_company ??= {
    id: "border_company", type: "unit", name: "東境国境遊撃隊", parentId: "frontier_guard", territoryId: "orta",
    strength: 140, readiness: 61, cohesion: 58, morale: 63, influence: 4, history: [],
  };
  return system.organizations.border_company;
}

function normalizeAssignment(state, assignment) {
  const role = DELEGATABLE_ROLES[assignment.roleId];
  if (!role) return null;
  assignment.organizationType = role.organizationType;
  assignment.organizationId = role.organizationId;
  assignment.territoryId = role.territoryId;
  assignment.mandateId = DELEGATION_MANDATES[assignment.mandateId] ? assignment.mandateId : "balanced";
  assignment.authorityId = DELEGATION_AUTHORITY_LEVELS[assignment.authorityId] ? assignment.authorityId : "standard";
  assignment.status ??= "active";
  assignment.startedTurn = Number.isInteger(assignment.startedTurn) ? assignment.startedTurn : state.turn ?? 0;
  assignment.source ??= "appointment";
  assignment.experience = Number.isFinite(assignment.experience) ? assignment.experience : 0;
  assignment.reputation = Number.isFinite(assignment.reputation) ? assignment.reputation : 0;
  assignment.localInfluence = Number.isFinite(assignment.localInfluence) ? assignment.localInfluence : 0;
  assignment.supportBase = Number.isFinite(assignment.supportBase) ? assignment.supportBase : 0;
  assignment.lastReport ??= null;
  return assignment;
}

function migrationSuccessor(state) {
  const occupied = new Set(Object.values(state.roleDelegation?.assignments ?? {}).map((assignment) => assignment.holderId));
  return [
    ...(state.player?.householdRetainers ?? []),
    ...Object.keys(state.officers ?? {}).filter((id) => ["retinue", "serving"].includes(state.officers[id].allegiance)),
    "dario",
  ].find((id) => !occupied.has(id)) ?? "dario";
}

function seedMigratedAssignment(state, roleId) {
  const role = DELEGATABLE_ROLES[roleId];
  const holderId = migrationSuccessor(state);
  const id = `delegation-${role.organizationType}-${role.organizationId}`;
  state.roleDelegation.assignments[id] = normalizeAssignment(state, {
    id, roleId, holderId, mandateId: roleId === "commander" ? "defensive" : "balanced",
    authorityId: "standard", status: "active", startedTurn: state.turn ?? 0, source: "save_migration",
    experience: 0, reputation: 0, localInfluence: 0, supportBase: 0, lastReport: null,
  });
  if (state.officers?.[holderId] && state.officers[holderId].allegiance === "free") state.officers[holderId].allegiance = "retinue";
}

export function initializeRoleDelegationState(state) {
  const next = clone(state);
  next.roleDelegation = emptyDelegationState(next);
  ensureBorderCompany(next);
  return next;
}

export function normalizeRoleDelegationState(state) {
  if (!state.player) return state;
  const wasMissing = !state.roleDelegation;
  state.roleDelegation ??= emptyDelegationState(state);
  const system = state.roleDelegation;
  system.schemaVersion = ROLE_DELEGATION_SCHEMA_VERSION;
  system.initializedAtStage ??= state.player.stage;
  system.organizations ??= {};
  system.assignments ??= {};
  system.promotionHistory ??= [];
  system.personnelHistory ??= [];
  system.reports ??= [];
  Object.entries(system.assignments).forEach(([id, assignment]) => {
    if (!normalizeAssignment(state, assignment)) delete system.assignments[id];
  });
  ensureBorderCompany(state);
  // Old career saves predate this system. Seed only during migration; fresh
  // careers always create their handoff through the promotion path below.
  if (wasMissing && (CAREER_ORDER[state.player.stage] ?? 0) >= CAREER_ORDER.lord) seedMigratedAssignment(state, "commander");
  if (wasMissing && (CAREER_ORDER[state.player.stage] ?? 0) >= CAREER_ORDER.multi_lord) seedMigratedAssignment(state, "lord");
  return state;
}

function officerProfile(world, state, officerId) {
  const base = world.characters?.[officerId];
  const local = state.officers?.[officerId];
  if (!base || !local) return null;
  return { ...base, ...local, stats: base.stats };
}

function eligibleSuccessor(world, state, role, officerId) {
  const officer = officerProfile(world, state, officerId);
  const isCompanion = state.player?.householdRetainers?.includes(officerId);
  const isServing = ["serving", "retinue"].includes(officer?.allegiance);
  if (!officer || (!isCompanion && !isServing)) throw new Error("仲間または配下人物を後任に選んでください");
  if (!isCompanion && (officer.rankLevel ?? 0) < role.minRankLevel) throw new Error(`${role.delegatedName}には位階${role.minRankLevel}以上の人物が必要です`);
  const conflictingAssignment = Object.values(state.roleDelegation?.assignments ?? {}).find((assignment) => (
    assignment.status === "active" && assignment.roleId !== role.id && assignment.holderId === officerId
  ));
  if (conflictingAssignment) throw new Error("その人物はすでに別の委任役割を担当しています");
  return officer;
}

export function getDelegationCandidates(world, state, roleId) {
  const role = DELEGATABLE_ROLES[roleId];
  if (!role) return [];
  const promotionCandidates = state.player?.stage === roleId ? role.successionCandidateIds ?? [] : [];
  const occupiedByOtherRole = new Set(Object.values(state.roleDelegation?.assignments ?? {})
    .filter((assignment) => assignment.status === "active" && assignment.roleId !== roleId)
    .map((assignment) => assignment.holderId));
  const ids = [...new Set([
    ...promotionCandidates,
    ...(state.player?.householdRetainers ?? []),
    ...Object.keys(state.officers ?? {}).filter((id) => ["serving", "retinue"].includes(state.officers[id].allegiance)),
  ])];
  return ids.map((id) => officerProfile(world, state, id)).filter(Boolean).filter((officer) => !occupiedByOtherRole.has(officer.id)).filter((officer) => (
    promotionCandidates.includes(officer.id) || state.player?.householdRetainers?.includes(officer.id) || (officer.rankLevel ?? 0) >= role.minRankLevel
  ));
}

export function handoffPreviousRole(world, state, input) {
  const next = clone(state);
  normalizeRoleDelegationState(next);
  const role = DELEGATABLE_ROLES[input.fromRoleId];
  if (!role) return next;
  const successor = eligibleSuccessor(world, next, role, input.successorId);
  const id = `delegation-${role.organizationType}-${role.organizationId}`;
  const prior = next.roleDelegation.assignments[id];
  const assignment = normalizeAssignment(next, {
    ...(prior ?? {}), id, roleId: role.id, holderId: successor.id,
    mandateId: input.mandateId ?? (role.id === "commander" ? "defensive" : "balanced"),
    authorityId: input.authorityId ?? "standard", status: "active", startedTurn: next.turn,
    source: "promotion_handoff", experience: prior?.experience ?? 0, reputation: prior?.reputation ?? 0,
    localInfluence: prior?.localInfluence ?? 0, supportBase: prior?.supportBase ?? 0, lastReport: null,
  });
  next.roleDelegation.assignments[id] = assignment;
  if (next.officers[successor.id].allegiance === "free") next.officers[successor.id].allegiance = "retinue";
  if (role.organizationType === "unit") {
    const organization = ensureBorderCompany(next);
    organization.commanderId = successor.id;
    organization.history.unshift({ turn: next.turn, type: "succession", holderId: successor.id });
  } else {
    const city = next.cities[role.territoryId];
    city.governorId = successor.id;
    if (city.administration) city.administration.mode = "delegated";
  }
  const record = {
    id: `promotion-handoff-${next.turn}-${role.id}`,
    turn: next.turn, year: next.year, month: next.month,
    fromRoleId: role.id, toRoleId: input.toRoleId, assignmentId: id, successorId: successor.id,
    summary: `${input.toRoleName ?? input.toRoleId}への昇進に伴い、${role.name}の実務と担当組織を${successor.name}へ引き継いだ。`,
  };
  next.roleDelegation.promotionHistory.unshift(record);
  next.roleDelegation.promotionHistory = next.roleDelegation.promotionHistory.slice(0, 30);
  return next;
}

export function reassignDelegatedRole(world, state, assignmentId, officerId) {
  const next = clone(state);
  normalizeRoleDelegationState(next);
  const assignment = next.roleDelegation.assignments[assignmentId];
  if (!assignment) throw new Error("変更する委任役割が見つかりません");
  const role = DELEGATABLE_ROLES[assignment.roleId];
  const successor = eligibleSuccessor(world, next, role, officerId);
  if (successor.id === assignment.holderId) return next;
  const predecessorId = assignment.holderId;
  assignment.holderId = successor.id;
  assignment.startedTurn = next.turn;
  assignment.status = "active";
  assignment.lastReport = null;
  if (next.officers[successor.id].allegiance === "free") next.officers[successor.id].allegiance = "retinue";
  if (role.organizationType === "unit") next.roleDelegation.organizations[role.organizationId].commanderId = successor.id;
  else next.cities[role.territoryId].governorId = successor.id;
  next.roleDelegation.personnelHistory.unshift({
    id: `delegation-personnel-${next.turn}-${assignmentId}-${officerId}`,
    turn: next.turn, year: next.year, month: next.month, assignmentId, predecessorId, successorId: successor.id,
    summary: `${role.delegatedName}を${successor.name}へ交代した。担当組織と蓄積状態は継続する。`,
  });
  next.roleDelegation.personnelHistory = next.roleDelegation.personnelHistory.slice(0, 40);
  return next;
}

export function setDelegationMandate(state, assignmentId, mandateId) {
  if (!DELEGATION_MANDATES[mandateId]) throw new Error("不明な委任方針です");
  const next = clone(state);
  normalizeRoleDelegationState(next);
  const assignment = next.roleDelegation.assignments[assignmentId];
  if (!assignment) throw new Error("変更する委任役割が見つかりません");
  assignment.mandateId = mandateId;
  if (assignment.organizationType === "territory" && next.cities[assignment.territoryId]?.administration) {
    const cityMandate = ({ balanced: "balanced", defensive: "frontier", local_welfare: "granary", initiative: "revenue" })[mandateId];
    next.cities[assignment.territoryId].administration.mandate = cityMandate;
  }
  return next;
}

export function setDelegationAuthority(state, assignmentId, authorityId) {
  if (!DELEGATION_AUTHORITY_LEVELS[authorityId]) throw new Error("不明な委任権限です");
  const next = clone(state);
  normalizeRoleDelegationState(next);
  const assignment = next.roleDelegation.assignments[assignmentId];
  if (!assignment) throw new Error("変更する委任役割が見つかりません");
  assignment.authorityId = authorityId;
  return next;
}

function deterministicVariance(key, spread = 8) {
  const seed = [...key].reduce((sum, character) => Math.imul(sum ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return seed % (spread * 2 + 1) - spread;
}

function abilityScore(officer, action) {
  return Object.entries(action.stats).reduce((sum, [stat, weight]) => sum + (officer.stats?.[stat] ?? 0) * weight, 0);
}

function personalityBonus(officer, action) {
  const traitMatches = action.traits.filter((trait) => officer.traits?.includes(trait)).length;
  const policy = officer.policy ?? "";
  let bonus = traitMatches * 9;
  if (action.id === "training" && /兵|軍|訓練/.test(policy)) bonus += 6;
  if (action.id === "logistics" && /兵站|道路|測量/.test(policy)) bonus += 7;
  if (action.id === "intelligence" && /情報|測量|実証/.test(policy)) bonus += 7;
  if (action.id === "security" && /防衛|河川|交易/.test(policy)) bonus += 4;
  if (["economy", "audit"].includes(action.id) && /戸籍|交易|制度/.test(policy)) bonus += 6;
  if (action.id === "relief" && /合意|民|交易/.test(policy)) bonus += 5;
  return bonus;
}

function assignmentContext(state, assignment) {
  const city = state.cities[assignment.territoryId];
  const organization = assignment.organizationType === "unit" ? state.roleDelegation.organizations[assignment.organizationId] : null;
  return { city, organization };
}

function urgency(state, assignment, action) {
  const { city, organization } = assignmentContext(state, assignment);
  const hostility = state.foreignStates?.valka?.hostility ?? 50;
  if (action.id === "organization") return organization ? Math.max(0, 75 - organization.readiness) * 1.1 : Math.max(0, 64 - city.internal.administrativeEfficiency) * 0.7;
  if (action.id === "training") return Math.max(0, 72 - city.military.training) * 0.9 + hostility / 20;
  if (action.id === "security") return Math.max(0, 66 - city.resources.security) + hostility / 14;
  if (action.id === "intelligence") return Math.max(0, 68 - (state.intelNetwork ?? 30)) * 0.42 + hostility / 22;
  if (action.id === "logistics") return Math.max(0, 82 - (city.facilities.road?.condition ?? 70)) * 0.8 + Math.max(0, 2_600 - city.resources.food) / 420;
  if (action.id === "relief") return Math.max(0, 52 - city.resources.support) * 1.2 + Math.max(0, 2_200 - city.resources.food) / 300;
  if (action.id === "economy") return Math.max(0, 65 - city.resources.commerce) * 0.55 + Math.max(0, 60 - city.resources.production) * 0.35;
  if (action.id === "audit") return Math.max(0, city.internal.corruption - 14) * 1.1;
  return 0;
}

function chooseAction(state, assignment, officer) {
  const mandate = DELEGATION_MANDATES[assignment.mandateId];
  const authority = DELEGATION_AUTHORITY_LEVELS[assignment.authorityId];
  const allowed = assignment.organizationType === "unit"
    ? [ACTIONS.organization, ACTIONS.training, ACTIONS.security, ACTIONS.intelligence, ACTIONS.logistics]
    : [ACTIONS.organization, ACTIONS.security, ACTIONS.logistics, ACTIONS.relief, ACTIONS.economy, ACTIONS.audit];
  return allowed.filter((action) => authority.scopes.includes(action.scope)).map((action) => ({
    action,
    score: (mandate.priorities[action.id] ?? 0) + urgency(state, assignment, action)
      + abilityScore(officer, action) * 0.12 + personalityBonus(officer, action)
      + deterministicVariance(`${state.turn}:${assignment.id}:${officer.id}:${action.id}`, 3),
  })).sort((left, right) => right.score - left.score)[0]?.action ?? null;
}

function outcomeFor(state, assignment, officer, action) {
  const loyalty = state.officers[officer.id]?.loyalty ?? 50;
  const experience = Math.min(12, Math.sqrt(Math.max(0, assignment.experience)) * 1.8);
  const overload = state.officers[officer.id]?.assignment ? 6 : 0;
  return clamp(Math.round(
    abilityScore(officer, action) * (0.72 + loyalty / 360) + experience
      + personalityBonus(officer, action) * 0.35
      + deterministicVariance(`${state.year}:${state.month}:${assignment.id}:${officer.id}:${action.id}`, 8) - overload,
  ), 20, 110);
}

function effectDelta(outcome, scale = 1) {
  return round(clamp((outcome - 48) / 26 * scale, -0.8 * scale, 2.2 * scale), 1);
}

function escalationReport(state, assignment, officer, reason, summary) {
  return {
    id: `delegation-report-${state.turn}-${assignment.id}`, assignmentId: assignment.id, roleId: assignment.roleId,
    organizationType: assignment.organizationType, organizationId: assignment.organizationId, territoryId: assignment.territoryId,
    officerId: officer?.id ?? assignment.holderId, actionId: "escalation", title: `${officer?.name ?? "担当者"}から判断要請`,
    summary, outcome: null, grade: "判断要", severity: "decision", requiresDecision: true, reason,
    mandateId: assignment.mandateId, authorityId: assignment.authorityId,
    growth: { experience: 0, reputation: 0, localInfluence: 0, supportBase: 0 },
  };
}

function applyAction(state, assignment, action, outcome) {
  const { city, organization } = assignmentContext(state, assignment);
  const grade = outcome >= 86 ? "卓越" : outcome >= 68 ? "良好" : outcome >= 52 ? "平凡" : "不調";
  if (action.id === "organization") {
    const delta = effectDelta(outcome, organization ? 1.5 : 0.8);
    if (organization) organization.readiness = round(clamp(organization.readiness + delta), 1);
    else city.internal.administrativeEfficiency = round(clamp(city.internal.administrativeEfficiency + delta), 1);
    return { grade, summary: `${organization ? "命令系統と交代勤務" : "属官の決裁順序"}を整理。${organization ? "即応" : "行政効率"} ${delta >= 0 ? "+" : ""}${delta}。`, cost: { money: 0 } };
  }
  if (action.id === "training") {
    const delta = effectDelta(outcome, 0.72); const food = 32;
    city.military.training = round(clamp(city.military.training + delta), 1); city.resources.food = Math.max(0, city.resources.food - food);
    return { grade, summary: `配下部隊を交代で訓練。練度 ${delta >= 0 ? "+" : ""}${delta}、食料 ${food}を使用。`, cost: { money: 0 } };
  }
  if (action.id === "security") {
    const delta = effectDelta(outcome, 0.66); const food = 20;
    city.resources.security = round(clamp(city.resources.security + delta), 1); city.resources.food = Math.max(0, city.resources.food - food);
    return { grade, summary: `街道と集落を巡察。治安 ${delta >= 0 ? "+" : ""}${delta}、食料 ${food}を使用。`, cost: { money: 0 } };
  }
  if (action.id === "intelligence") {
    const delta = effectDelta(outcome, 0.55); state.intelNetwork = round(clamp((state.intelNetwork ?? 0) + delta), 1);
    return { grade, summary: `斥候・隊商・関所の報告を照合。情報網 ${delta >= 0 ? "+" : ""}${delta}。`, cost: { money: 0 } };
  }
  if (action.id === "logistics") {
    const price = 1.4;
    if (city.resources.money < price + 4) return { grade: "見送り", summary: "州庫留保を割るため補修を見送った。追加支出は上位判断を要する。", cost: { money: 0 }, requiresDecision: true };
    const delta = effectDelta(outcome, 2.1); city.resources.money = round(city.resources.money - price, 1);
    city.facilities.road.condition = round(clamp(city.facilities.road.condition + delta), 1);
    return { grade, summary: `州庫の小口支出で街道を補修。道路状態 ${delta >= 0 ? "+" : ""}${delta}。`, cost: { money: price } };
  }
  if (action.id === "relief") {
    const food = 90;
    if (city.resources.food < food + 1_100) return { grade: "判断要", summary: "救済に必要な備蓄が足りず、広域からの移送を上申した。", cost: { money: 0 }, requiresDecision: true };
    const delta = effectDelta(outcome, 0.7); city.resources.food -= food; city.resources.support = round(clamp(city.resources.support + delta), 1);
    return { grade, summary: `州庫から食料 ${food}を放出。民心 ${delta >= 0 ? "+" : ""}${delta}。`, cost: { money: 0 } };
  }
  if (action.id === "economy") {
    const price = 1.2;
    if (city.resources.money < price + 4) return { grade: "見送り", summary: "州庫留保を優先し、市場整備を翌月へ送った。", cost: { money: 0 } };
    const delta = effectDelta(outcome, 0.28); city.resources.money = round(city.resources.money - price, 1); city.resources.commerce = round(clamp(city.resources.commerce + delta), 1);
    return { grade, summary: `市場規約と生産台帳を更新。商業 ${delta >= 0 ? "+" : ""}${delta}。`, cost: { money: price } };
  }
  const delta = effectDelta(outcome, 0.45); city.internal.corruption = round(clamp(city.internal.corruption - delta), 1);
  return { grade, summary: `属官の帳簿を照合。腐敗 ${delta >= 0 ? "-" : "+"}${Math.abs(delta)}。`, cost: { money: 0 } };
}

function applyGrowth(state, assignment, officer, outcome, requiresDecision) {
  if (requiresDecision || !Number.isFinite(outcome)) return { experience: 0, reputation: 0, localInfluence: 0, supportBase: 0 };
  const authority = DELEGATION_AUTHORITY_LEVELS[assignment.authorityId];
  const success = outcome >= 52;
  const growth = {
    experience: success ? 2 : 1,
    reputation: success ? (outcome >= 86 ? 1.2 : 0.6) : -0.2,
    localInfluence: authority.influenceGrowth + (success ? 0.14 : 0),
    supportBase: success ? 0.24 : -0.12,
  };
  assignment.experience = round(clamp(assignment.experience + growth.experience, 0, 999), 1);
  assignment.reputation = round(clamp(assignment.reputation + growth.reputation), 1);
  assignment.localInfluence = round(clamp(assignment.localInfluence + growth.localInfluence), 1);
  assignment.supportBase = round(clamp(assignment.supportBase + growth.supportBase), 1);
  const local = state.officers[officer.id];
  local.merit = Math.max(0, Math.round((local.merit ?? 0) + (success ? 2 : 0)));
  local.politicalCapital = round(clamp((local.politicalCapital ?? 0) + (success ? 0.35 : 0.1), 0, 999), 1);
  const localPower = state.administration?.powerEntities?.[`${assignment.territoryId}:military`];
  if (localPower) {
    localPower.politicalAuthority = round(clamp(localPower.politicalAuthority + growth.localInfluence * 0.18), 1);
    localPower.militaryPower = round(clamp(localPower.militaryPower + (success ? 0.08 : 0)), 1);
    localPower.localSupport = round(clamp(localPower.localSupport + growth.supportBase * 0.14), 1);
    localPower.bureaucraticAutonomy = round(clamp((localPower.bureaucraticAutonomy ?? 0) + authority.influenceGrowth * 0.06), 1);
  }
  if (assignment.organizationType === "unit") {
    const organization = state.roleDelegation.organizations[assignment.organizationId];
    organization.influence = round(clamp(organization.influence + growth.localInfluence * 0.2), 1);
  }
  return growth;
}

function resolveAssignment(world, state, assignment) {
  if (assignment.status !== "active") return null;
  const officer = officerProfile(world, state, assignment.holderId);
  if (!officer || (!state.player.householdRetainers.includes(officer.id) && !["serving", "retinue"].includes(officer.allegiance))) {
    assignment.status = "vacant";
    return escalationReport(state, assignment, officer, "vacant", "担当者が不在です。後任を任命するまで通常判断が滞ります。");
  }
  const { city } = assignmentContext(state, assignment);
  if (!city) return escalationReport(state, assignment, officer, "organization_missing", "担当組織との接続が失われています。組織再編が必要です。");
  const civilianNeed = Math.max(1, Math.round(city.resources.population * 0.23));
  if (city.resources.food < civilianNeed * 0.42) {
    return escalationReport(state, assignment, officer, "supply_crisis", "現地備蓄では軍務と住民配給を両立できません。広域からの兵糧移送を判断してください。");
  }
  if ((state.foreignStates?.valka?.hostility ?? 0) >= 88) {
    return escalationReport(state, assignment, officer, "war_authority", "敵軍の集結を確認しました。警備強化は実施できますが、越境作戦や開戦は権限外です。");
  }
  const action = chooseAction(state, assignment, officer);
  if (!action) return escalationReport(state, assignment, officer, "authority_limit", "現地課題はありますが、現在の委任権限では処理できません。権限拡大または直接命令が必要です。");
  const outcome = outcomeFor(state, assignment, officer, action);
  const result = applyAction(state, assignment, action, outcome);
  const growth = applyGrowth(state, assignment, officer, outcome, result.requiresDecision);
  return {
    id: `delegation-report-${state.turn}-${assignment.id}`, assignmentId: assignment.id, roleId: assignment.roleId,
    organizationType: assignment.organizationType, organizationId: assignment.organizationId, territoryId: assignment.territoryId,
    officerId: officer.id, actionId: action.id, title: `${officer.name}：${action.title}`, summary: result.summary,
    outcome, grade: result.grade,
    severity: result.requiresDecision || outcome < 45 ? "decision" : outcome >= 86 || outcome < 52 ? "notable" : "routine",
    requiresDecision: Boolean(result.requiresDecision), mandateId: assignment.mandateId, authorityId: assignment.authorityId,
    cost: result.cost, growth,
  };
}

export function resolveRoleDelegations(world, state) {
  if (!state.player) return [];
  normalizeRoleDelegationState(state);
  const reports = Object.values(state.roleDelegation.assignments).map((assignment) => {
    const report = resolveAssignment(world, state, assignment);
    if (report) assignment.lastReport = clone(report);
    return report;
  }).filter(Boolean);
  state.roleDelegation.reports.unshift(...reports.map((report) => clone(report)));
  state.roleDelegation.reports = state.roleDelegation.reports.slice(0, 48);
  state.player.lastDelegationReports = reports.map((report) => clone(report));
  return reports;
}

export function getRoleDelegationOverview(world, state) {
  if (!state.player) return null;
  normalizeRoleDelegationState(state);
  const assignments = Object.values(state.roleDelegation.assignments).map((assignment) => ({
    ...clone(assignment),
    role: DELEGATABLE_ROLES[assignment.roleId],
    holder: officerProfile(world, state, assignment.holderId),
    mandate: DELEGATION_MANDATES[assignment.mandateId],
    authority: DELEGATION_AUTHORITY_LEVELS[assignment.authorityId],
    organization: assignment.organizationType === "unit" ? clone(state.roleDelegation.organizations[assignment.organizationId]) : clone(state.cities[assignment.territoryId]),
    eligibleOfficerIds: getDelegationCandidates(world, state, assignment.roleId).map((officer) => officer.id),
  }));
  return {
    schemaVersion: state.roleDelegation.schemaVersion,
    currentStageId: state.player.stage,
    assignments,
    promotionHistory: clone(state.roleDelegation.promotionHistory),
    personnelHistory: clone(state.roleDelegation.personnelHistory),
    latestReports: clone(state.roleDelegation.reports.slice(0, 8)),
    decisionsRequired: assignments.filter((assignment) => assignment.lastReport?.requiresDecision).length,
  };
}
