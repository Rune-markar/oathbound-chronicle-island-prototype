import { damageRegionalDomainAsset, transferRegionControl } from "./regional-domain-system.js";

export const GENERATED_RESISTANCE_SCHEMA_VERSION = 1;
export const GENERATED_OCCUPATION_POLICIES = Object.freeze({
  reconciliation: Object.freeze({ id: "reconciliation", name: "和解と恩赦", description: "旧官吏と住民代表を復職させ、抵抗の支持基盤を狭める。", resistance: -7, compliance: 5, garrison: -1 }),
  local_autonomy: Object.freeze({ id: "local_autonomy", name: "地方自治", description: "自治議会と固有法を認め、緩やかな統合を図る。", resistance: -5, compliance: 3, garrison: -2 }),
  reconstruction: Object.freeze({ id: "reconstruction", name: "復興優先", description: "道路・市場・食料配給を復旧し、生活から併合を定着させる。", resistance: -3, compliance: 5, garrison: 0 }),
  security: Object.freeze({ id: "security", name: "治安掃討", description: "検問・情報網・駐屯軍で細胞を抑える。短期効果は高いが反発を残す。", resistance: 2, compliance: -2, garrison: 6 }),
});

export const GENERATED_RESISTANCE_RESPONSES = Object.freeze({
  amnesty: Object.freeze({ id: "amnesty", name: "期限付き恩赦", cost: 3, description: "武装解除と引き換えに帰郷を認める。" }),
  negotiate: Object.freeze({ id: "negotiate", name: "住民代表と交渉", cost: 5, description: "要求を聞き、自治・賠償と引き換えに停戦する。" }),
  reinforce: Object.freeze({ id: "reinforce", name: "駐屯軍を増派", cost: 6, description: "拠点と輸送路を守り、蜂起の拡大を止める。" }),
  intelligence: Object.freeze({ id: "intelligence", name: "地下組織を捜査", cost: 4, description: "住民全体への強制を避け、指導細胞を特定する。" }),
  withdraw: Object.freeze({ id: "withdraw", name: "撤兵・旧国へ返還", cost: 0, description: "併合を断念して抵抗の原因を除く。" }),
});

const clone = (value) => structuredClone(value);
const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const periodFor = (dateState) => `${Number.isInteger(dateState?.year) ? dateState.year : 317}-${Number.isInteger(dateState?.month) ? dateState.month : 4}`;

function hashUnit(...parts) {
  let hash = 2166136261;
  for (const character of parts.join("|")) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967295;
}

function safeOccupation(source = {}) {
  if (typeof source.id !== "string" || typeof source.regionId !== "string" || typeof source.occupierNationId !== "string") return null;
  return {
    id: source.id,
    regionId: source.regionId,
    occupierNationId: source.occupierNationId,
    formerNationId: typeof source.formerNationId === "string" ? source.formerNationId : null,
    warId: typeof source.warId === "string" ? source.warId : null,
    status: ["active", "integrated", "returned"].includes(source.status) ? source.status : "active",
    annexedPeriod: source.annexedPeriod ?? null,
    lastAdvancedPeriod: source.lastAdvancedPeriod ?? null,
    policyId: GENERATED_OCCUPATION_POLICIES[source.policyId] ? source.policyId : "reconciliation",
    resistance: Math.round(clamp(source.resistance ?? 55)),
    compliance: Math.round(clamp(source.compliance ?? 12)),
    cells: Math.round(clamp(source.cells ?? 48)),
    garrison: Math.round(clamp(source.garrison ?? 35)),
    legitimacy: Math.round(clamp(source.legitimacy ?? 18)),
    months: Math.max(0, Math.round(Number(source.months) || 0)),
    pendingResponse: source.pendingResponse && typeof source.pendingResponse.id === "string" ? { ...source.pendingResponse } : null,
    lastReport: source.lastReport ? { ...source.lastReport } : null,
  };
}

export function preserveGeneratedResistanceState(source) {
  if (!source || typeof source !== "object" || Number(source.schemaVersion) !== GENERATED_RESISTANCE_SCHEMA_VERSION) return null;
  return {
    schemaVersion: GENERATED_RESISTANCE_SCHEMA_VERSION,
    lastAdvancedPeriod: source.lastAdvancedPeriod ?? null,
    occupations: (source.occupations ?? []).map(safeOccupation).filter(Boolean).slice(-96),
    events: (source.events ?? []).filter((event) => event && typeof event.id === "string").slice(-192).map((event) => ({ ...event })),
  };
}

export function createGeneratedResistanceState(source = null) {
  return preserveGeneratedResistanceState(source) ?? { schemaVersion: GENERATED_RESISTANCE_SCHEMA_VERSION, lastAdvancedPeriod: null, occupations: [], events: [] };
}

export function registerGeneratedOccupation(source, regionId, occupierNationId, formerNationId, options = {}, dateState = null) {
  const next = createGeneratedResistanceState(source);
  const existing = next.occupations.find((entry) => entry.regionId === regionId && entry.status === "active");
  if (existing) return next;
  const severity = options.fullAnnexation ? 18 : options.capitalFall ? 10 : 0;
  next.occupations.push(safeOccupation({
    id: `occupation:${regionId}:${periodFor(dateState)}`,
    regionId,
    occupierNationId,
    formerNationId,
    warId: options.warId,
    annexedPeriod: periodFor(dateState),
    policyId: options.policyId ?? "reconciliation",
    resistance: 48 + severity,
    compliance: Math.max(5, 18 - severity / 2),
    cells: 42 + severity,
    garrison: options.garrison ?? 35,
    legitimacy: Math.max(5, 22 - severity),
  }));
  return next;
}

function occupationEvent(runtime, occupation, period, stage, title, summary, tone = "warning") {
  return { id: `${occupation.id}:${period}:${stage}`, type: "generated_resistance", occupationId: occupation.id, regionId: occupation.regionId, nationId: occupation.occupierNationId, targetNationId: occupation.formerNationId, period, title, summary, tone };
}

function autoPolicy(occupation, condition) {
  if (occupation.resistance >= 75 && occupation.garrison < 45) return "security";
  if ((condition?.reserves ?? 50) < 35) return "local_autonomy";
  if (occupation.compliance < 30) return "reconstruction";
  return "reconciliation";
}

export function advanceGeneratedResistance(runtime, source, regionalDomains, geopolitics, dateState, options = {}) {
  const period = periodFor(dateState);
  const next = createGeneratedResistanceState(source);
  if (next.lastAdvancedPeriod === period) return { resistance: next, regionalDomains, geopolitics: clone(geopolitics), pendingStrategicDecisions: [] };
  let domains = regionalDomains;
  const politics = clone(geopolitics);
  const protectedIds = new Set(options.protectedNationIds ?? []);
  const events = [];
  const pendingStrategicDecisions = [];
  for (const occupation of next.occupations) {
    if (occupation.status !== "active") continue;
    const owner = domains.regionStates?.[occupation.regionId]?.nationId;
    if (owner !== occupation.occupierNationId) { occupation.status = "returned"; continue; }
    const playerManaged = protectedIds.has(occupation.occupierNationId);
    if (!playerManaged) occupation.policyId = autoPolicy(occupation, politics.nationStates?.[occupation.occupierNationId]);
    const policy = GENERATED_OCCUPATION_POLICIES[occupation.policyId];
    occupation.months += 1;
    const shock = Math.max(0, 18 - occupation.months * 2);
    const random = (hashUnit(runtime.terrain.seed, occupation.id, period) - 0.5) * 8;
    const resistanceDelta = policy.resistance + shock * 0.18 - occupation.garrison * 0.055 - occupation.legitimacy * 0.035 + random;
    const complianceDelta = policy.compliance + occupation.legitimacy * 0.025 - occupation.resistance * 0.018;
    occupation.resistance = Math.round(clamp(occupation.resistance + resistanceDelta));
    occupation.compliance = Math.round(clamp(occupation.compliance + complianceDelta));
    occupation.garrison = Math.round(clamp(occupation.garrison + policy.garrison - 1));
    occupation.cells = Math.round(clamp(occupation.cells + resistanceDelta * 0.55 - (policy.id === "security" ? 5 : 0)));
    occupation.legitimacy = Math.round(clamp(occupation.legitimacy + (policy.id === "reconciliation" || policy.id === "local_autonomy" ? 3 : policy.id === "security" ? -3 : 1)));
    let incident = null;
    if (occupation.resistance >= 82) incident = { id: "uprising", title: "武装蜂起", damage: 28, tone: "danger" };
    else if (occupation.resistance >= 65 && hashUnit(occupation.id, period, "incident") > 0.38) incident = { id: "sabotage", title: "補給路破壊", damage: 16, tone: "danger" };
    else if (occupation.resistance >= 48 && hashUnit(occupation.id, period, "incident") > 0.68) incident = { id: "ambush", title: "駐屯隊襲撃", damage: 8, tone: "warning" };
    if (incident) {
      const target = Object.values(domains.assetStates ?? {}).find((asset) => asset.regionId === occupation.regionId && asset.available);
      if (target) domains = damageRegionalDomainAsset(runtime, domains, target.id, incident.damage, dateState);
      occupation.garrison = Math.round(clamp(occupation.garrison - Math.ceil(incident.damage / 4)));
      const event = occupationEvent(runtime, occupation, period, incident.id, `${runtime.regionById.get(occupation.regionId)?.name ?? "併合地"}で${incident.title}`, `抵抗${occupation.resistance}、細胞${occupation.cells}。${target ? `${target.id}が損傷した。` : "駐屯軍に損害が出た。"}`, incident.tone);
      events.push(event);
      occupation.pendingResponse = { id: `${occupation.id}:${period}:response`, incidentId: incident.id, period, title: event.title };
      if (playerManaged) pendingStrategicDecisions.push({ id: occupation.pendingResponse.id, type: "generated_resistance_response", occupationId: occupation.id, regionId: occupation.regionId, period, title: event.title, summary: event.summary });
    }
    if (occupation.compliance >= 82 && occupation.resistance <= 18) {
      occupation.status = "integrated";
      occupation.pendingResponse = null;
      events.push(occupationEvent(runtime, occupation, period, "integrated", `${runtime.regionById.get(occupation.regionId)?.name ?? "併合地"}の統合が定着`, "自治制度と生活復旧が定着し、組織的抵抗は通常の地方政治へ移行した。", "positive"));
    }
    occupation.lastAdvancedPeriod = period;
    occupation.lastReport = { period, resistanceDelta: Math.round(resistanceDelta), complianceDelta: Math.round(complianceDelta), incidentId: incident?.id ?? null };
    const condition = politics.nationStates?.[occupation.occupierNationId];
    if (condition) { condition.cohesion = Math.round(clamp(condition.cohesion - Math.max(0, occupation.resistance - 55) / 30)); condition.reserves = Math.round(clamp(condition.reserves - Math.max(0, occupation.garrison - 35) / 45)); }
  }
  next.lastAdvancedPeriod = period;
  next.events = [...next.events, ...events].slice(-192);
  return { resistance: next, regionalDomains: domains, geopolitics: politics, pendingStrategicDecisions };
}

export function setGeneratedOccupationPolicy(source, occupationId, policyId) {
  if (!GENERATED_OCCUPATION_POLICIES[policyId]) throw new RangeError("不明な占領政策です。");
  const next = createGeneratedResistanceState(source);
  const occupation = next.occupations.find((entry) => entry.id === occupationId && entry.status === "active");
  if (!occupation) throw new RangeError("有効な併合地ではありません。");
  occupation.policyId = policyId;
  return next;
}

export function respondToGeneratedResistance(runtime, source, regionalDomains, occupationId, responseId, dateState = null) {
  const response = GENERATED_RESISTANCE_RESPONSES[responseId];
  if (!response) throw new RangeError("不明なレジスタンス対応です。");
  const next = createGeneratedResistanceState(source);
  const occupation = next.occupations.find((entry) => entry.id === occupationId && entry.status === "active");
  if (!occupation?.pendingResponse && responseId !== "withdraw") throw new Error("対応を要する事件がありません。");
  let domains = regionalDomains;
  if (responseId === "withdraw") {
    if (!occupation.formerNationId) throw new Error("返還先が存在しません。");
    domains = transferRegionControl(runtime, domains, occupation.regionId, occupation.formerNationId, { cause: "occupation_withdrawal", actorId: occupation.occupierNationId, status: "transferred" }, dateState);
    occupation.status = "returned";
  } else if (responseId === "amnesty") { occupation.resistance = Math.round(clamp(occupation.resistance - 13)); occupation.compliance = Math.round(clamp(occupation.compliance + 6)); occupation.legitimacy = Math.round(clamp(occupation.legitimacy + 8)); }
  else if (responseId === "negotiate") { occupation.resistance = Math.round(clamp(occupation.resistance - 18)); occupation.compliance = Math.round(clamp(occupation.compliance + 12)); occupation.legitimacy = Math.round(clamp(occupation.legitimacy + 10)); }
  else if (responseId === "reinforce") { occupation.garrison = Math.round(clamp(occupation.garrison + 22)); occupation.resistance = Math.round(clamp(occupation.resistance - 8)); occupation.legitimacy = Math.round(clamp(occupation.legitimacy - 5)); }
  else if (responseId === "intelligence") { occupation.cells = Math.round(clamp(occupation.cells - 20)); occupation.resistance = Math.round(clamp(occupation.resistance - 10)); }
  occupation.pendingResponse = null;
  return { resistance: next, regionalDomains: domains, cost: response.cost };
}

export function getGeneratedResistanceView(runtime, source) {
  const state = createGeneratedResistanceState(source);
  return {
    occupations: state.occupations.map((entry) => ({ ...entry, regionName: runtime.regionById.get(entry.regionId)?.name ?? entry.regionId, occupierName: runtime.nationById.get(entry.occupierNationId)?.name ?? entry.occupierNationId, formerNationName: runtime.nationById.get(entry.formerNationId)?.name ?? entry.formerNationId, policy: GENERATED_OCCUPATION_POLICIES[entry.policyId] })),
    events: [...state.events].reverse().map((entry) => ({ ...entry })),
    policies: Object.values(GENERATED_OCCUPATION_POLICIES),
    responses: Object.values(GENERATED_RESISTANCE_RESPONSES),
  };
}
