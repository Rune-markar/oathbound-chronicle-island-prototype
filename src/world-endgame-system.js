import { deriveCentralizationResult } from "./administration-model.js";
import { recordHistoricalEvent } from "./history-model.js";

const clone = (value) => structuredClone(value);
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

export const WORLD_ENDGAME_SCHEMA_VERSION = 1;

export const WORLD_ENDGAME_ROUTES = Object.freeze({
  rational_empire: Object.freeze({
    id: "rational_empire",
    name: "超合理世界帝国",
    principle: "完全な合理性へ主権を集中し、世界規模の危機対応を一つの意思へ委ねる。",
    endingName: "女神の世界帝国",
    endingDescription: "リヴァイアサンを統治圏から退け、腐敗しない女神へ世界主権を委ねた。人類は救われたが、統治機構は人間の判断を必要としなくなった。",
    steps: Object.freeze([
      Object.freeze({ id: "found_world_empire", name: "世界帝国を布告", consequence: "全国庫から金30を動員し、各国の指揮・法・兵站を帝国機構へ統合する。" }),
      Object.freeze({ id: "defeat_leviathan", name: "リヴァイアサン討伐", consequence: "全国庫から金18と現有兵の12%を投入し、自然状態を帝国の管理境界外へ押し戻す。" }),
      Object.freeze({ id: "accept_goddess", name: "女神へ主権を委ねる", consequence: "合理的統治の究極として女神を受容し、人間による最終拒否権を手放す。" }),
    ]),
  }),
  plural_federation: Object.freeze({
    id: "plural_federation",
    name: "多元主義世界連邦",
    principle: "自治・慣習・代表権を消さず、遅い合意形成を世界主権の根拠にする。",
    endingName: "人間の世界連邦",
    endingDescription: "リヴァイアサンと生存圏を分かち、女神の正しい命令を退けた。不完全で遅い制度は、世界を決める権利を住民の手に残した。",
    steps: Object.freeze([
      Object.freeze({ id: "ratify_world_federation", name: "世界連邦憲章を批准", consequence: "全国庫から金20を使い、自治・慣習法・代表権を例外ではなく連邦制度として固定する。" }),
      Object.freeze({ id: "reconcile_leviathan", name: "リヴァイアサンと生存圏を分かつ", consequence: "全国庫から金12を使い、沿岸評議会と諸国観測網による回遊路盟約を成立させる。" }),
      Object.freeze({ id: "refuse_goddess", name: "女神の主権要求を拒む", consequence: "正しさより被統治者の合意を優先し、諸国軍と地域組織で女神軍の接収を退ける。" }),
    ]),
  }),
});

function baseline() {
  return {
    schemaVersion: WORLD_ENDGAME_SCHEMA_VERSION,
    routeId: null,
    completedStepIds: [],
    history: [],
    leviathanResolution: null,
    goddessResolution: null,
    ending: null,
    completedTurn: null,
    lastActionTurn: null,
  };
}

export function normalizeWorldEndgameState(state) {
  const source = state.worldEndgame ?? {};
  const base = baseline();
  state.worldEndgame = {
    ...base,
    ...source,
    schemaVersion: WORLD_ENDGAME_SCHEMA_VERSION,
    routeId: WORLD_ENDGAME_ROUTES[source.routeId] ? source.routeId : null,
    completedStepIds: [...new Set((source.completedStepIds ?? []).filter((id) => typeof id === "string"))].slice(0, 6),
    history: (source.history ?? []).filter((entry) => entry && typeof entry.id === "string").slice(0, 24).map((entry) => ({ ...entry })),
    ending: source.ending && WORLD_ENDGAME_ROUTES[source.ending.routeId] ? { ...source.ending } : null,
  };
  return state;
}

function namedRecord(id, name, source, detail) { return { id, name, source, detail }; }

export function deriveSovereigntyLedger(state) {
  normalizeWorldEndgameState(state);
  const preserved = [];
  const consolidated = [];
  const breaches = [];
  const reforms = state.centralizationCampaign?.reforms ?? [];
  reforms.filter((entry) => entry.status === "completed").forEach((entry) => {
    if (entry.methodId === "conciliate") preserved.push(namedRecord(`reform:${entry.id}`, "合意による権限移転", "国家改革", "旧勢力を制度外へ消さず、補償と共同統治を残した。"));
    if (["local_offices", "temporary_exemption"].includes(entry.concessionId)) preserved.push(namedRecord(`concession:${entry.id}`, entry.concessionId === "local_offices" ? "地方官職の保障" : "期限付き制度例外", "国家改革", "改革の効率を下げて地域固有の権利を残した。"));
    if (entry.methodId === "eliminate") consolidated.push(namedRecord(`reform:${entry.id}`, "旧権力の排除", "国家改革", "権限移転を速めるため地方主体を制度から除いた。"));
    if (entry.concessionId === "none") consolidated.push(namedRecord(`concession:${entry.id}`, "全国一律の無譲歩改革", "国家改革", "例外を認めず統一期限を適用した。"));
  });
  (state.centralizationCampaign?.historyPolicies ?? []).forEach((entry) => {
    if (["recognize_privileges", "local_tradition_compromise"].includes(entry.policyId)) preserved.push(namedRecord(`history:${entry.id}`, entry.policyId === "recognize_privileges" ? "旧特権の承認" : "地方伝承との妥協", "歴史政策", "過去の約束と地方側の記憶を現在制度へ残した。"));
    if (entry.policyId === "suppress_records") {
      consolidated.push(namedRecord(`history:${entry.id}`, "不都合な記録の封印", "歴史政策", "法的障害を除き改革を加速した。"));
      breaches.push(namedRecord(`breach:${entry.id}`, "特許状と記録の隠蔽", "歴史政策", "統治される側が参照できる約束を失わせた。"));
    }
  });
  Object.values(state.player?.estatePolitics?.projects ?? {}).forEach((entry) => {
    if (["compromise", "residents", "notables", "merchants"].includes(entry.politicalDecisionId)) preserved.push(namedRecord(`estate:${entry.id}`, entry.politicalDecisionId === "compromise" ? "所領四派の妥協" : `所領評議の${entry.politicalDecisionId}案`, "所領政治", `${entry.projectName ?? "所領事業"}で反対主体の発言権を手続として通した。`));
    if (entry.politicalDecisionId === "force") {
      consolidated.push(namedRecord(`estate:${entry.id}`, "所領事業の強行", "所領政治", "工期を一月へ短縮した。"));
      breaches.push(namedRecord(`breach:${entry.id}`, "領地評議の反対を排除", "所領政治", "反発と事故を承知で決裁を強行した。"));
    }
  });
  const leviathanPolicyId = state.leviathan?.policyId;
  if (["local_councils", "international_cooperation"].includes(leviathanPolicyId)) preserved.push(namedRecord(`leviathan:${leviathanPolicyId}`, leviathanPolicyId === "local_councils" ? "沿岸評議会との共同統治" : "沿岸諸国との観測協力", "リヴァイアサン政策", "自然への対応権限を中央だけで独占しなかった。"));
  if (["royal_emergency", "national_warning"].includes(leviathanPolicyId)) consolidated.push(namedRecord(`leviathan:${leviathanPolicyId}`, leviathanPolicyId === "royal_emergency" ? "恒久非常権限" : "全国警報規格", "リヴァイアサン政策", "広域危機対応を中央命令へ統一した。"));
  (state.generatedWorld?.resistance?.occupations ?? []).filter((entry) => entry.occupierNationId === state.generatedWorld?.playerNationId).forEach((entry) => {
    if (["reconciliation", "local_autonomy"].includes(entry.policyId)) preserved.push(namedRecord(`occupation:${entry.id}`, entry.policyId === "local_autonomy" ? "併合地の地方自治" : "併合地の和解と恩赦", "併合統治", "敗者を固有法または代表手続とともに再統合した。"));
    if (entry.policyId === "security") consolidated.push(namedRecord(`occupation:${entry.id}`, "併合地の治安掃討", "併合統治", "検問・情報網・駐屯軍で抵抗を抑えた。"));
  });
  const regionStates = Object.values(state.generatedWorld?.regionalDomains?.regionStates ?? {});
  const playerNationId = state.generatedWorld?.playerNationId;
  const controlledRegions = regionStates.filter((entry) => entry.nationId === playerNationId).length;
  const territorialReach = Math.round(controlledRegions / Math.max(1, regionStates.length) * 100);
  const generatedRelations = Object.entries(state.generatedWorld?.geopolitics?.relations ?? {}).filter(([key]) => key.split(":").includes(playerNationId));
  const consentingStates = generatedRelations.length
    ? generatedRelations.filter(([, relation]) => !relation.atWar && (relation.relation ?? -100) >= -10).length + 1
    : Object.values(state.foreignStates ?? {}).filter((entry) => (entry.relation ?? 0) >= 10).length + 1;
  return {
    preserved,
    consolidated,
    breaches,
    preservedSources: new Set(preserved.map((entry) => entry.source)).size,
    consolidatedSources: new Set(consolidated.map((entry) => entry.source)).size,
    territorialReach,
    controlledRegions,
    totalRegions: regionStates.length,
    consentingStates,
    averageSupport: Math.round(mean(Object.values(state.cities ?? {}).map((city) => city.resources?.support ?? 0))),
  };
}

function routeRequirements(world, state, routeId, ledger) {
  const sovereign = Boolean(state.player?.sovereign || state.player?.stage === "independent_ruler");
  if (routeId === "rational_empire") {
    const centralization = deriveCentralizationResult(world, state);
    return [
      { id: "sovereign", label: "独立君主として国家主権を持つ", met: sovereign },
      { id: "centralization", label: "完全集権化後の12か月危機を克服", met: Boolean(state.centralizationCampaign?.ending) },
      { id: "consolidation_history", label: "3件以上の合理化制度を実際に積み上げる", met: ledger.consolidated.length >= 3 },
      { id: "effective_state", label: "実効中央集権80以上・行政負荷115以下", met: centralization.resultIndex >= 80 && centralization.capacity.utilization <= 115 },
      { id: "world_hegemony", label: "生成世界の地方60%以上を実際に支配する", met: ledger.territorialReach >= 60 },
    ];
  }
  return [
    { id: "sovereign", label: "独立君主として国家主権を持つ", met: sovereign },
    { id: "plural_history", label: "4分野以上で自治・約束・代表手続を制度へ残す", met: ledger.preservedSources >= 4 },
    { id: "commitments", label: "保存された制度履歴6件以上・重大な約束違反2件以下", met: ledger.preserved.length >= 6 && ledger.breaches.length <= 2 },
    { id: "consent", label: "自国を含む6か国以上が合意形成へ参加可能", met: ledger.consentingStates >= 6 },
    { id: "legitimacy", label: "正統性60以上・平均地域支持55以上", met: (state.legitimacy ?? 0) >= 60 && ledger.averageSupport >= 55 },
  ];
}

export function deriveWorldEndgameStatus(world, state) {
  normalizeWorldEndgameState(state);
  const ledger = deriveSovereigntyLedger(state);
  const routes = Object.values(WORLD_ENDGAME_ROUTES).map((route) => {
    const requirements = routeRequirements(world, state, route.id, ledger);
    const lockedByOtherRoute = Boolean(state.worldEndgame.routeId && state.worldEndgame.routeId !== route.id);
    const nextStep = route.steps.find((step) => !state.worldEndgame.completedStepIds.includes(step.id)) ?? null;
    return {
      ...route,
      requirements,
      eligible: !lockedByOtherRoute && requirements.every((entry) => entry.met),
      lockedByOtherRoute,
      nextStep,
      completedSteps: route.steps.filter((step) => state.worldEndgame.completedStepIds.includes(step.id)).length,
    };
  });
  return { ledger, routes, route: routes.find((entry) => entry.id === state.worldEndgame.routeId) ?? null, ending: state.worldEndgame.ending };
}

function spendTreasury(state, amount) {
  let remaining = amount;
  for (const city of Object.values(state.cities ?? {}).sort((left, right) => (right.resources?.money ?? 0) - (left.resources?.money ?? 0))) {
    const paid = Math.min(remaining, Math.max(0, city.resources.money));
    city.resources.money = Number((city.resources.money - paid).toFixed(1));
    remaining = Number((remaining - paid).toFixed(1));
  }
  if (remaining > 0) throw new Error(`全国庫が金${amount}に足りません`);
}

function totalTreasury(state) { return Object.values(state.cities ?? {}).reduce((sum, city) => sum + (city.resources?.money ?? 0), 0); }

function reduceTroops(state, ratio) {
  Object.values(state.cities ?? {}).forEach((city) => {
    if (!city.military) return;
    city.military.troops = Math.max(0, Math.round(city.military.troops * (1 - ratio)));
  });
}

function endgameRecord(state, route, step) {
  const record = { id: `world-endgame:${route.id}:${step.id}:${state.turn}`, routeId: route.id, stepId: step.id, title: step.name, detail: step.consequence, year: state.year, month: state.month, turn: state.turn };
  state.worldEndgame.history.unshift(record);
  state.worldEndgame.history = state.worldEndgame.history.slice(0, 24);
  state.player?.history?.unshift({ ...record, type: "world_endgame", summary: step.consequence });
  return record;
}

export function performWorldEndgameAction(world, state, actionId) {
  const next = clone(state);
  normalizeWorldEndgameState(next);
  if (next.worldEndgame.ending) throw new Error("物語終局はすでに年代記へ確定しています");
  if (next.worldEndgame.lastActionTurn === next.turn) throw new Error("世界終局の不可逆判断は一か月に一件だけ実行できます");
  const status = deriveWorldEndgameStatus(world, next);
  const route = status.routes.find((entry) => entry.steps.some((step) => step.id === actionId));
  const step = route?.steps.find((entry) => entry.id === actionId);
  if (!route || !step) throw new Error("不明な世界終局判断です");
  if (next.worldEndgame.routeId && next.worldEndgame.routeId !== route.id) throw new Error("すでに別の世界主権原理を制度へ固定しています");
  if (!next.worldEndgame.routeId && !route.eligible) {
    const unmet = route.requirements.filter((entry) => !entry.met).map((entry) => entry.label);
    throw new Error(`この終局経路はまだ成立しません：${unmet.join("、")}`);
  }
  if (route.nextStep?.id !== actionId) throw new Error(`先に「${route.nextStep?.name ?? "前段階"}」を完了してください`);
  const costs = { found_world_empire: 30, defeat_leviathan: 18, ratify_world_federation: 20, reconcile_leviathan: 12 };
  const cost = costs[actionId] ?? 0;
  if (totalTreasury(next) < cost) throw new Error(`この判断には全国庫の金${cost}が必要です`);
  spendTreasury(next, cost);
  next.worldEndgame.routeId ??= route.id;
  next.worldEndgame.completedStepIds.push(actionId);
  next.worldEndgame.lastActionTurn = next.turn;
  if (actionId === "defeat_leviathan") { reduceTroops(next, 0.12); next.worldEndgame.leviathanResolution = "defeated"; }
  if (actionId === "reconcile_leviathan") next.worldEndgame.leviathanResolution = "reconciled";
  if (actionId === "accept_goddess") next.worldEndgame.goddessResolution = "accepted";
  if (actionId === "refuse_goddess") { reduceTroops(next, 0.08); next.worldEndgame.goddessResolution = "refused"; }
  const record = endgameRecord(next, route, step);
  recordHistoricalEvent(world, next, {
    id: record.id,
    type: "world_endgame",
    title: step.name,
    summary: step.consequence,
    locations: Object.keys(next.cities ?? {}),
    causedBy: [`sovereignty-route-${route.id}`],
    effects: [`world-endgame-step-${step.id}`],
    bindings: [{ type: "state", path: "worldEndgame.completedStepIds" }],
  });
  if (["accept_goddess", "refuse_goddess"].includes(actionId)) {
    next.worldEndgame.ending = { routeId: route.id, id: route.id, name: route.endingName, description: route.endingDescription, principle: route.principle };
    next.worldEndgame.completedTurn = next.turn;
  }
  return next;
}
