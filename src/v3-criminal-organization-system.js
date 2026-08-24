import {
  advanceCrimeMonth,
  discoverUnderworldContacts,
  getCrimeStatusView,
  recordCrimeIncident,
  resolveCrimeEvent,
} from "./crime-system.js";
import {
  advanceCriminalOrganizationMonth,
  distributeCriminalOrganizationProfits,
  formCriminalOrganization,
  fundCriminalOrganization,
  getCriminalOrganizationView,
  issueCriminalOperationOrder,
  normalizeCriminalOrganizationState,
  recruitCriminalMember,
  resolveCriminalOperationReport,
  resolveCriminalOrganizationDecision,
  withdrawCriminalOrganizationFunds,
} from "./criminal-organization-system.js";
import { createActionResult } from "./action-result.js";
import { getV3DetailedTile } from "./v3-field-system.js";
import { advanceStateGameClock, getGameCalendar, normalizeStateGameClock } from "./game-clock.js";
import { fnv1aCodePoints, unitFromHash } from "./determinism.js";

export const V3_CRIMINAL_VERSION = 1;
export const V3_CRIMINAL_CYCLE_MINUTES = 30 * 24 * 60;

const clone = (value) => structuredClone(value);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const PERSONAL_CRIME_DEFINITIONS = Object.freeze({
  theft: Object.freeze({
    id: "theft",
    name: "露店の売上袋を盗む",
    shortName: "窃盗",
    scope: "settlement",
    reward: 4,
    fine: 2,
    severity: "minor",
    preparation: 2,
    targetKind: "market-purse",
    description: "人通りと番兵を見て、本人だけで銀貨を狙う。",
  }),
  extortion: Object.freeze({
    id: "extortion",
    name: "倉庫番へみかじめを迫る",
    shortName: "恐喝",
    scope: "settlement",
    reward: 6,
    fine: 4,
    severity: "serious",
    preparation: 1,
    targetKind: "warehouse-keeper",
    description: "現地の倉庫番を具体的な相手にし、強く出る。",
  }),
  robbery: Object.freeze({
    id: "robbery",
    name: "街道の集金人を襲う",
    shortName: "強盗",
    scope: "road",
    reward: 8,
    fine: 5,
    severity: "serious",
    preparation: 1,
    targetKind: "road-collector",
    description: "街道上にいる時だけ、通過中の集金人を狙う。",
  }),
});

const OUTCOME_LABELS = Object.freeze({
  success_hidden: "成功・秘匿",
  success_exposed: "成功・露見",
  failed_escaped: "失敗・逃走",
  captured: "拘束・罰金",
});

const MEMBER_STATUS_LABELS = Object.freeze({
  available: "待機",
  assigned: "作戦中",
  report_ready: "報告待ち",
  recovering: "療養中",
  captured: "拘束",
  left: "離脱",
});

function hashUnit(...parts) {
  return unitFromHash(fnv1aCodePoints(parts.join("|")));
}

function periodIndex(state) {
  return getGameCalendar(normalizeStateGameClock(state).clock).monthIndex;
}

function periodParts(state) {
  const calendar = getGameCalendar(normalizeStateGameClock(state).clock);
  return { turn: calendar.monthIndex, year: calendar.year, month: calendar.month };
}

function emptyCriminalState() {
  return {
    version: V3_CRIMINAL_VERSION,
    crime: null,
    playerHistory: [],
    worldHistory: null,
    personalActions: [],
    lastResult: null,
  };
}

function settlementRadius(level) {
  return level === "city" ? 3 : level === "town" ? 2 : 1;
}

export function getV3CriminalLocation(context, state) {
  const tile = getV3DetailedTile(context, state.player.x, state.player.y);
  const settlementDistance = tile.settlement
    ? Math.max(Math.abs(tile.localX - 4), Math.abs(tile.localY - 4))
    : Number.POSITIVE_INFINITY;
  const settlement = tile.settlement && settlementDistance <= settlementRadius(tile.settlement.settlementLevel)
    ? clone(tile.settlement)
    : null;
  const regionId = tile.region?.id ?? tile.macroTile?.regionId ?? null;
  const nationId = tile.nation?.id ?? tile.macroTile?.nationId ?? null;
  return {
    tile: { x: tile.x, y: tile.y, type: tile.type, name: tile.name, onRoad: Boolean(tile.onRoad) },
    settlement,
    regionId,
    regionName: tile.region?.name ?? regionId ?? "無所属地",
    nationId,
    nationName: tile.nation?.name ?? nationId ?? "無所属",
    canManage: Boolean(settlement && regionId),
  };
}

function adapterFor(context, state) {
  const source = { ...emptyCriminalState(), ...(state.criminal ?? {}) };
  const location = getV3CriminalLocation(context, state);
  return {
    ...periodParts(state),
    worldSeed: context.seed,
    history: source.worldHistory ? clone(source.worldHistory) : undefined,
    player: {
      id: "v3-player",
      name: state.player.name,
      locationId: location.regionId,
      metrics: { wealth: Number(state.player.gold) || 0 },
      crime: source.crime ? clone(source.crime) : undefined,
      history: clone(source.playerHistory ?? []),
    },
  };
}

function applyAdapter(state, adapter) {
  state.player.gold = Math.max(0, Number(adapter.player.metrics?.wealth) || 0);
  state.criminal.crime = clone(adapter.player.crime);
  state.criminal.playerHistory = clone(adapter.player.history ?? []);
  state.criminal.worldHistory = adapter.history ? clone(adapter.history) : null;
  return state;
}

function addMessage(state, message) {
  state.messageLog = [message, ...(state.messageLog ?? [])].slice(0, 8);
}

function prepared(context, state) {
  const next = clone(state);
  normalizeV3CriminalState(context, next);
  return next;
}

export function normalizeV3CriminalState(context, state) {
  const prior = { ...emptyCriminalState(), ...(state.criminal ?? {}) };
  state.criminal = {
    ...prior,
    version: V3_CRIMINAL_VERSION,
    playerHistory: clone(prior.playerHistory ?? []),
    worldHistory: prior.worldHistory ? clone(prior.worldHistory) : null,
    personalActions: clone(prior.personalActions ?? []).slice(-240),
    lastResult: prior.lastResult ? clone(prior.lastResult) : null,
  };
  const normalized = normalizeCriminalOrganizationState(adapterFor(context, state));
  applyAdapter(state, normalized);
  return state;
}

function actionTarget(location, definition) {
  const place = location.settlement?.name ?? location.regionName;
  return {
    id: `v3-crime-target:${definition.targetKind}:${location.regionId}:${location.tile.x},${location.tile.y}`,
    name: definition.id === "theft"
      ? `${place}市場の売上袋`
      : definition.id === "extortion"
        ? `${place}の倉庫番`
        : `${place}街道の集金人`,
    kind: definition.targetKind,
  };
}

function personalActionView(state, location, definition) {
  const calendar = getGameCalendar(normalizeStateGameClock(state).clock);
  const day = calendar.monthIndex * 30 + calendar.day;
  const target = actionTarget(location, definition);
  const alreadyTried = state.criminal.personalActions.some((entry) => entry.day === day && entry.targetId === target.id);
  const locationReady = definition.scope === "settlement" ? Boolean(location.settlement) : location.tile.onRoad;
  const heat = Number(state.criminal.crime?.heatByJurisdiction?.[location.regionId]) || 0;
  const riskLabel = heat >= 70 ? "極めて危険" : heat >= 40 ? "危険" : heat >= 20 ? "互角" : "有利";
  return {
    ...definition,
    target,
    day,
    riskLabel,
    available: Boolean(location.regionId && locationReady && !alreadyTried),
    lockedReason: !location.regionId
      ? "管轄のある土地へ移動してください"
      : !locationReady
        ? definition.scope === "road" ? "街道上で実行できます" : "集落の中心街まで歩いてください"
        : alreadyTried ? "この場所では今日はすでに動いています" : null,
  };
}

function brokerName(context, location) {
  const names = ["ミレナ", "グレイヴ", "サシャ", "オルド", "ヴェラ", "カシム"];
  return names[Math.floor(hashUnit(context.seed, location.regionId, location.settlement?.id, "broker") * names.length)];
}

export function getV3CriminalView(context, state) {
  const normalized = prepared(context, state);
  const location = getV3CriminalLocation(context, normalized);
  const domain = adapterFor(context, normalized);
  const organization = getCriminalOrganizationView(domain, {
    jurisdictionId: location.regionId,
    jurisdictionName: location.regionName,
  });
  const status = getCrimeStatusView(domain, { jurisdictionId: location.regionId });
  const localBroker = organization.brokerKnown
    ? normalized.criminal.crime.contacts.find((entry) => entry.role === "broker" && entry.jurisdictionId === location.regionId)
    : null;
  const operations = organization.operations.map((entry) => ({
    ...entry,
    unlocked: entry.unlocked && location.canManage,
    lockedReason: !location.canManage ? "集落の拠点まで歩いてください" : entry.lockedReason,
  }));
  return {
    version: V3_CRIMINAL_VERSION,
    location,
    status,
    stage: organization.stage,
    stageName: organization.stageName,
    stageDescription: organization.stageDescription,
    organization: {
      ...organization,
      candidates: location.canManage ? organization.candidates : [],
      operations,
      canForm: organization.canForm && location.canManage,
      formationReason: !location.canManage ? "集落の拠点まで歩いてください" : organization.formationReason,
      members: organization.members.map((entry) => ({ ...entry, statusName: MEMBER_STATUS_LABELS[entry.status] ?? entry.status })),
    },
    localBroker: localBroker ? { ...clone(localBroker), name: localBroker.name ?? "現地の仲介人" } : null,
    canSearchBroker: Boolean(location.canManage && organization.soloExperience && !organization.brokerKnown && normalized.player.gold >= 1),
    brokerReason: !location.canManage
      ? "集落の中心街まで歩いてください"
      : !organization.soloExperience ? "まず本人で非合法行動を一件経験してください"
        : organization.brokerKnown ? "現地の仲介人と接触済みです"
          : normalized.player.gold < 1 ? "探索費用の銀貨1が必要です" : null,
    personalActions: Object.values(PERSONAL_CRIME_DEFINITIONS).map((definition) => personalActionView(normalized, location, definition)),
    lastResult: normalized.criminal.lastResult ? clone(normalized.criminal.lastResult) : null,
    cycleLabel: `${periodParts(normalized).year}年${periodParts(normalized).month}月`,
    outcomeLabels: OUTCOME_LABELS,
  };
}

export function resolveV3PersonalCrime(context, state, actionId) {
  const next = prepared(context, state);
  const location = getV3CriminalLocation(context, next);
  const definition = PERSONAL_CRIME_DEFINITIONS[actionId];
  if (!definition) throw new Error("選べる単独犯罪ではありません");
  const option = personalActionView(next, location, definition);
  if (!option.available) throw new Error(option.lockedReason);
  const result = resolveCrimeEvent({
    seed: context.seed,
    turn: next.steps,
    targetId: option.target.id,
    preparation: definition.preparation,
  });
  let adapter = adapterFor(context, next);
  const successful = result.outcome === "success_hidden" || result.outcome === "success_exposed";
  if (successful) adapter.player.metrics.wealth += definition.reward;
  if (result.outcome === "captured") adapter.player.metrics.wealth = Math.max(0, adapter.player.metrics.wealth - definition.fine);
  adapter = recordCrimeIncident(adapter, {
    id: `v3-personal-crime:${actionId}:${option.day}:${next.criminal.personalActions.length + 1}`,
    type: definition.id,
    severity: definition.severity,
    perpetrator: { id: "v3-player", name: next.player.name },
    target: option.target,
    jurisdiction: { id: location.regionId, name: location.regionName, nationId: location.nationId },
    reward: successful ? { wealth: definition.reward, text: `銀貨+${definition.reward}` } : null,
    outcome: result.outcome,
    detected: result.outcome === "success_exposed" || result.outcome === "captured",
    historyText: `${next.player.name}が${option.target.name}を対象に${definition.shortName}を行い、${OUTCOME_LABELS[result.outcome]}となった。`,
  });
  if (successful) adapter.player.crime.illegalGain += definition.reward;
  applyAdapter(next, adapter);
  Object.assign(next, advanceStateGameClock(next, 120).state);
  const record = {
    id: `v3-personal-action:${next.criminal.personalActions.length + 1}`,
    day: option.day,
    actionId,
    actionName: definition.shortName,
    targetId: option.target.id,
    targetName: option.target.name,
    jurisdictionId: location.regionId,
    outcome: result.outcome,
    outcomeName: OUTCOME_LABELS[result.outcome],
    reward: successful ? definition.reward : 0,
    fine: result.outcome === "captured" ? definition.fine : 0,
  };
  next.criminal.personalActions.push(record);
  next.criminal.lastResult = record;
  addMessage(next, `${definition.shortName}：${record.outcomeName}。${successful ? `銀貨${definition.reward}を得た。` : result.outcome === "captured" ? `銀貨${definition.fine}を失った。` : "収益はない。"}`);
  return next;
}

export function discoverV3CriminalBroker(context, state) {
  const next = prepared(context, state);
  const location = getV3CriminalLocation(context, next);
  const view = getV3CriminalView(context, next);
  if (!view.canSearchBroker) throw new Error(view.brokerReason);
  let adapter = discoverUnderworldContacts(adapterFor(context, next), {
    jurisdictionId: location.regionId,
    jurisdictionName: location.regionName,
  });
  const broker = adapter.player.crime.contacts.find((entry) => entry.role === "broker" && entry.jurisdictionId === location.regionId);
  broker.name = brokerName(context, location);
  broker.settlementId = location.settlement.id;
  broker.settlementName = location.settlement.name;
  broker.trust = Math.max(10, Number(broker.trust) || 0);
  applyAdapter(next, adapter);
  Object.assign(next, advanceStateGameClock(next, 60).state);
  addMessage(next, `${location.settlement.name}の路地で仲介人${broker.name}と接触した。人員を手配できる。`);
  return next;
}

function requireManagementLocation(context, state) {
  const location = getV3CriminalLocation(context, state);
  if (!location.canManage) throw new Error("集落の拠点まで歩いてください");
  return location;
}

function runDomainAction(context, state, action, message) {
  const next = prepared(context, state);
  const adapter = action(adapterFor(context, next));
  applyAdapter(next, adapter);
  addMessage(next, message(next));
  return next;
}

export function recruitV3CriminalMember(context, state, candidateId) {
  const next = prepared(context, state);
  const location = requireManagementLocation(context, next);
  const view = getV3CriminalView(context, next);
  const candidate = view.organization.candidates.find((entry) => entry.id === candidateId);
  if (!candidate) throw new Error("この場所で雇える人材ではありません");
  const adapter = recruitCriminalMember(adapterFor(context, next), {
    candidateId,
    jurisdictionId: location.regionId,
    jurisdictionName: location.regionName,
  });
  applyAdapter(next, adapter);
  addMessage(next, `${candidate.name}を${candidate.role}として雇った。`);
  return next;
}

export function formV3CriminalOrganization(context, state, name) {
  const next = prepared(context, state);
  const location = requireManagementLocation(context, next);
  const adapter = formCriminalOrganization(adapterFor(context, next), {
    jurisdictionId: location.regionId,
    jurisdictionName: location.regionName,
    name,
  });
  applyAdapter(next, adapter);
  addMessage(next, `${next.criminal.crime.organization.name}を結成した。本人だけの犯罪から人員指揮へ移った。`);
  return next;
}

export function issueV3CriminalOperation(context, state, input = {}) {
  const next = prepared(context, state);
  const location = requireManagementLocation(context, next);
  const option = getV3CriminalView(context, next).organization.operations.find((entry) => entry.id === input.optionId);
  if (!option) throw new Error("指示できる作戦がありません");
  const adapter = issueCriminalOperationOrder(adapterFor(context, next), {
    ...input,
    jurisdictionId: location.regionId,
    jurisdictionName: location.regionName,
  });
  applyAdapter(next, adapter);
  addMessage(next, `${option.target.name}への${option.name}を構成員へ任せた。`);
  return next;
}

export function advanceV3CriminalCycle(context, state) {
  const next = advanceStateGameClock(prepared(context, state), V3_CRIMINAL_CYCLE_MINUTES).state;
  const advanced = advanceV3CriminalMonthOnTick(context, next, true);
  const calendar = getGameCalendar(advanced.clock);
  return createActionResult(advanced, {
    elapsedMinutes: V3_CRIMINAL_CYCLE_MINUTES,
    advancedSystemIds: ["criminal-organization"],
    events: [{
      id: `criminal-organization:month:${calendar.absoluteMonthIndex}`,
      type: "criminal.month.advanced",
      source: "criminal-organization",
      visibility: "private",
      summary: `${calendar.year}年${calendar.month}月の地下活動を進行`,
      clock: advanced.clock,
      period: `${calendar.year}-${calendar.month}`,
    }],
    message: advanced.messageLog?.[0] ?? null,
  });
}

export function advanceV3CriminalMonthOnTick(context, state, withMessage = false) {
  const next = prepared(context, state);
  let adapter = advanceCrimeMonth(adapterFor(context, next));
  adapter = advanceCriminalOrganizationMonth(adapter);
  applyAdapter(next, adapter);
  const reports = next.criminal.crime.organization.activeOrders.filter((entry) => entry.status === "report_ready").length;
  if (withMessage) addMessage(next, reports ? `一か月潜伏した。届いた作戦報告${reports}件を確認できる。` : "一か月潜伏した。進行中の作戦は続いている。");
  return next;
}

export function resolveV3CriminalReport(context, state, orderId, resultOverride = {}) {
  return runDomainAction(
    context,
    state,
    (adapter) => resolveCriminalOperationReport(adapter, { orderId, ...resultOverride }),
    (next) => {
      const report = next.criminal.crime.organization.completedOrders[0];
      return `${report.name}の報告を確認した。${OUTCOME_LABELS[report.outcome]}。`;
    },
  );
}

export function resolveV3CriminalDecision(context, state, decisionId, choice) {
  return runDomainAction(
    context,
    state,
    (adapter) => resolveCriminalOrganizationDecision(adapter, { decisionId, choice }),
    () => "組織の判断を確定し、構成員と手配状況へ反映した。",
  );
}

export function fundV3CriminalOrganization(context, state, amount = 1) {
  return runDomainAction(context, state, (adapter) => fundCriminalOrganization(adapter, { amount }), () => `個人の銀貨${amount}を組織金庫へ入れた。`);
}

export function withdrawV3CriminalOrganization(context, state, amount = 1) {
  return runDomainAction(context, state, (adapter) => withdrawCriminalOrganizationFunds(adapter, { amount }), () => `組織金庫から銀貨${amount}を引き出した。構成員の忠誠が下がった。`);
}

export function distributeV3CriminalProfits(context, state) {
  return runDomainAction(context, state, (adapter) => distributeCriminalOrganizationProfits(adapter), () => "構成員へ利益を分配し、忠誠と影響力を得た。");
}

export function getV3CriminalOutcomeLabel(outcome) {
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export function getV3CriminalMemberStatusLabel(status) {
  return MEMBER_STATUS_LABELS[status] ?? status;
}

export function getV3PersonalCrimeDefinitions() {
  return clone(PERSONAL_CRIME_DEFINITIONS);
}
