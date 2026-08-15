import { CRIME_OUTCOMES, normalizeCrimeState, recordCrimeIncident } from "./crime-system.js";

const RISK_LABELS = Object.freeze(["低", "中", "高", "極高"]);

function contextOf(context = {}) {
  const settlement = context.settlement ?? context.village ?? context.place ?? context;
  if (!settlement?.id) throw new TypeError("恐喝機会には集落IDが必要です");
  const jurisdictionId = context.jurisdictionId ?? context.jurisdiction?.id ?? settlement.regionId ?? settlement.id;
  return {
    settlementId: settlement.id,
    settlementName: settlement.name ?? settlement.id,
    jurisdictionId,
    jurisdictionName: context.jurisdictionName ?? context.jurisdiction?.name ?? jurisdictionId,
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function resolveOutcome(state, opportunity, options, pressure = 0) {
  if (options.outcome !== undefined) {
    if (!CRIME_OUTCOMES.includes(options.outcome)) throw new RangeError(`未知の犯罪結果です: ${options.outcome}`);
    return options.outcome;
  }
  const roll = hashString(`${options.seed ?? state.worldSeed ?? "crime"}:${opportunity.id}:${state.turn ?? 0}:${pressure}`) % 100;
  const reportThreshold = Math.min(78, 52 + pressure * 8);
  if (roll < Math.max(18, 48 - pressure * 6)) return "success_hidden";
  if (roll < reportThreshold) return "success_exposed";
  if (roll < 91) return "failed_escaped";
  return "captured";
}

function ensureNpcRelation(next, target, consequence, pressure) {
  next.adventure ??= {};
  next.adventure.npcRelations ??= {};
  const current = next.adventure.npcRelations[target.id] ?? {};
  next.adventure.npcRelations[target.id] = {
    ...current,
    affinity: Math.max(-40, (Number(current.affinity) || 0) - (consequence === "reported_extortion" ? 18 : 10)),
    extortionPressure: pressure,
    lastResult: {
      actionId: "extortion",
      consequence,
      targetId: target.id,
      turn: next.turn ?? 0,
    },
  };
}

function buildOpportunity(location, target, mode, amount, baseRiskLevel) {
  return {
    id: `extortion:${location.settlementId}:${target.kind}:${mode}`,
    type: "extortion",
    mode,
    settlementId: location.settlementId,
    settlementName: location.settlementName,
    jurisdictionId: location.jurisdictionId,
    jurisdictionName: location.jurisdictionName,
    target: { id: `${target.kind}:${location.settlementId}`, name: `${location.settlementName}の${target.name}` },
    expectedReward: { wealth: amount, text: mode === "recurring" ? `毎月 財産+${amount}` : `財産+${amount}` },
    baseRiskLevel,
    riskLabel: RISK_LABELS[baseRiskLevel],
    preparationRequirements: mode === "recurring" ? ["相手の商売と支払日を調べる"] : ["人目の少ない場所を選ぶ"],
    maximumPenalty: "拘束、恐喝罪の処罰、相手からの報復",
  };
}

export function getExtortionOpportunities(_state, context = {}) {
  const location = contextOf(context);
  const targets = [
    { kind: "merchant", name: "商人", amount: 3, risk: 1 },
    { kind: "official", name: "役人", amount: 4, risk: 2 },
  ];
  return targets.flatMap((target) => [
    buildOpportunity(location, target, "one_off", target.amount, target.risk),
    buildOpportunity(location, target, "recurring", Math.max(2, target.amount - 1), Math.min(3, target.risk + 1)),
  ]).map((entry) => structuredClone(entry));
}

export function previewExtortion(state, opportunity, options = {}) {
  if (!opportunity?.id || opportunity.type !== "extortion") throw new TypeError("恐喝機会が必要です");
  const arrangement = options.arrangementId
    ? state.player?.crime?.extortionArrangements?.find((entry) => entry.id === options.arrangementId)
    : null;
  const pressure = arrangement?.pressure ?? 0;
  const heat = Number(state.player?.crime?.heatByJurisdiction?.[opportunity.jurisdictionId]) || 0;
  const riskLevel = Math.min(3, opportunity.baseRiskLevel + Math.floor(pressure / 2) + (heat >= 40 ? 1 : 0));
  return {
    opportunityId: opportunity.id,
    targetId: opportunity.target.id,
    mode: opportunity.mode,
    pressure,
    riskLevel,
    riskLabel: RISK_LABELS[riskLevel],
    retaliationRiskLabel: RISK_LABELS[Math.min(3, Math.floor(pressure / 2) + opportunity.baseRiskLevel)],
    expectedReward: structuredClone(opportunity.expectedReward),
    preparationRequirements: [...opportunity.preparationRequirements],
    maximumPenalty: opportunity.maximumPenalty,
  };
}

export function executeExtortion(state, opportunity, options = {}) {
  const normalized = normalizeCrimeState(state);
  const outcome = resolveOutcome(normalized, opportunity, options);
  const successful = outcome === "success_hidden" || outcome === "success_exposed";
  const detected = outcome === "success_exposed" || outcome === "captured";
  const incidentId = `extortion:${normalized.turn ?? 0}:${normalized.player.crime.incidents.length + 1}:${opportunity.target.id}`;
  let next = recordCrimeIncident(normalized, {
    id: incidentId,
    type: "extortion",
    severity: "serious",
    perpetrator: { id: normalized.player.id ?? "player", name: normalized.player.name ?? "主人公" },
    accomplices: options.accomplices ?? [],
    victim: structuredClone(opportunity.target),
    target: structuredClone(opportunity.target),
    jurisdiction: { id: opportunity.jurisdictionId, name: opportunity.jurisdictionName },
    reward: successful ? structuredClone(opportunity.expectedReward) : null,
    outcome,
    detected,
    historyText: successful ? `${opportunity.target.name}へ支払いを強要した。` : `${opportunity.target.name}への恐喝に失敗した。`,
  });
  next.player.metrics ??= {};
  next.player.metrics.wealth = Number(next.player.metrics.wealth) || 0;
  let arrangement = null;
  if (successful && opportunity.mode === "one_off") {
    next.player.metrics.wealth += opportunity.expectedReward.wealth;
    next.player.crime.illegalGain += opportunity.expectedReward.wealth;
  } else if (successful && opportunity.mode === "recurring") {
    arrangement = {
      id: `protection:${opportunity.settlementId}:${opportunity.target.id}`,
      opportunityId: opportunity.id,
      targetId: opportunity.target.id,
      targetName: opportunity.target.name,
      settlementId: opportunity.settlementId,
      jurisdictionId: opportunity.jurisdictionId,
      jurisdictionName: opportunity.jurisdictionName,
      amount: opportunity.expectedReward.wealth,
      pressure: 1,
      intervalTurns: 1,
      nextDueTurn: (next.turn ?? 0) + 1,
      active: true,
      createdIncidentId: incidentId,
    };
    next.player.crime.extortionArrangements = next.player.crime.extortionArrangements.filter((entry) => entry.id !== arrangement.id);
    next.player.crime.extortionArrangements.push(arrangement);
  }
  ensureNpcRelation(next, opportunity.target, detected ? "reported_extortion" : successful ? "coerced" : "resisted", arrangement?.pressure ?? 1);
  return { state: next, result: { incidentId, outcome, detected, arrangement: structuredClone(arrangement), captured: outcome === "captured" } };
}

export function collectExtortionPayment(state, input = {}) {
  const normalized = normalizeCrimeState(state);
  const arrangement = normalized.player.crime.extortionArrangements.find((entry) => entry.id === input.arrangementId && entry.active !== false);
  if (!arrangement) throw new Error("有効なみかじめ料の取り決めがありません");
  if ((normalized.turn ?? 0) < arrangement.nextDueTurn) throw new Error("まだ支払日ではありません");
  const opportunity = {
    id: arrangement.opportunityId,
    type: "extortion",
    mode: "recurring",
    target: { id: arrangement.targetId, name: arrangement.targetName },
    settlementId: arrangement.settlementId,
    jurisdictionId: arrangement.jurisdictionId,
    jurisdictionName: arrangement.jurisdictionName,
    expectedReward: { wealth: arrangement.amount, text: `財産+${arrangement.amount}` },
  };
  const outcome = resolveOutcome(normalized, opportunity, input, arrangement.pressure);
  const successful = outcome === "success_hidden" || outcome === "success_exposed";
  const detected = outcome === "success_exposed" || outcome === "captured";
  const incidentId = `extortion:${normalized.turn ?? 0}:${normalized.player.crime.incidents.length + 1}:${arrangement.targetId}`;
  const next = recordCrimeIncident(normalized, {
    id: incidentId,
    type: "extortion",
    severity: "serious",
    perpetrator: { id: normalized.player.id ?? "player", name: normalized.player.name ?? "主人公" },
    accomplices: input.accomplices ?? [],
    victim: structuredClone(opportunity.target),
    target: structuredClone(opportunity.target),
    jurisdiction: { id: arrangement.jurisdictionId, name: arrangement.jurisdictionName },
    reward: successful ? structuredClone(opportunity.expectedReward) : null,
    outcome,
    detected,
    historyText: successful ? `${arrangement.targetName}からみかじめ料を徴収した。` : `${arrangement.targetName}からのみかじめ料徴収に失敗した。`,
  });
  const nextArrangement = next.player.crime.extortionArrangements.find((entry) => entry.id === arrangement.id);
  if (successful) {
    next.player.metrics ??= {};
    next.player.metrics.wealth = (Number(next.player.metrics.wealth) || 0) + arrangement.amount;
    next.player.crime.illegalGain += arrangement.amount;
    nextArrangement.pressure += 1;
    nextArrangement.nextDueTurn = Math.max(next.turn ?? 0, nextArrangement.nextDueTurn) + nextArrangement.intervalTurns;
    nextArrangement.lastCollectedTurn = next.turn ?? 0;
  }
  if (outcome === "captured") nextArrangement.active = false;
  ensureNpcRelation(next, opportunity.target, detected ? "reported_extortion" : successful ? "coerced" : "resisted", nextArrangement.pressure);
  return { state: next, result: { incidentId, outcome, detected, amount: successful ? arrangement.amount : 0, captured: outcome === "captured" } };
}
