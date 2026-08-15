import { CRIME_OUTCOMES, normalizeCrimeState, recordCrimeIncident } from "./crime-system.js";

const RISK_LABELS = Object.freeze(["低", "中", "高", "極高"]);

function contextOf(context = {}) {
  const settlement = context.settlement ?? context.village ?? context.place ?? context;
  const settlementId = settlement?.id;
  if (!settlementId) throw new TypeError("窃盗機会には集落IDが必要です");
  const jurisdictionId = context.jurisdictionId ?? context.jurisdiction?.id ?? context.region?.id ?? settlement.regionId ?? settlementId;
  return {
    settlementId,
    settlementName: settlement.name ?? context.settlementName ?? settlementId,
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

function selectedOutcome(state, opportunity, options) {
  if (options.outcome !== undefined) {
    if (!CRIME_OUTCOMES.includes(options.outcome)) throw new RangeError(`未知の犯罪結果です: ${options.outcome}`);
    return options.outcome;
  }
  const roll = hashString(`${options.seed ?? state.generatedWorld?.seed ?? state.worldSeed ?? "crime"}:${opportunity.id}:${state.turn ?? 0}`) % 100;
  if (roll < 45) return "success_hidden";
  if (roll < 70) return "success_exposed";
  if (roll < 90) return "failed_escaped";
  return "captured";
}

function riskLevelFor(state, opportunity) {
  const heat = Number(state.player?.crime?.heatByJurisdiction?.[opportunity.jurisdictionId]) || 0;
  return Math.min(3, opportunity.baseRiskLevel + (heat >= 40 ? 2 : heat >= 20 ? 1 : 0));
}

export function getTheftOpportunities(_state, context = {}) {
  const location = contextOf(context);
  return [
    {
      id: `theft:${location.settlementId}:merchant-stock`,
      type: "theft",
      settlementId: location.settlementId,
      settlementName: location.settlementName,
      jurisdictionId: location.jurisdictionId,
      jurisdictionName: location.jurisdictionName,
      target: { id: `merchant:${location.settlementId}`, name: `${location.settlementName}の商人` },
      stolenItem: { id: `stolen:${location.settlementId}:merchant-goods`, name: "商人の小箱", normalValue: 5 },
      baseRiskLevel: 1,
      riskLabel: RISK_LABELS[1],
      expectedReward: { normalValue: 5, text: "換金可能な小箱" },
      preparationRequirements: ["商店が混み合う刻を待つ"],
      maximumPenalty: "拘束と窃盗罪の処罰",
    },
    {
      id: `theft:${location.settlementId}:warehouse-crate`,
      type: "theft",
      settlementId: location.settlementId,
      settlementName: location.settlementName,
      jurisdictionId: location.jurisdictionId,
      jurisdictionName: location.jurisdictionName,
      target: { id: `warehouse:${location.settlementId}`, name: `${location.settlementName}の倉庫` },
      stolenItem: { id: `stolen:${location.settlementId}:warehouse-crate`, name: "封印された荷箱", normalValue: 9 },
      baseRiskLevel: 2,
      riskLabel: RISK_LABELS[2],
      expectedReward: { normalValue: 9, text: "倉庫の荷箱" },
      preparationRequirements: ["倉庫番の巡回を確かめる", "荷を運ぶ手段を用意する"],
      maximumPenalty: "拘束、盗品没収、窃盗罪の処罰",
    },
  ].map((entry) => structuredClone(entry));
}

export function previewTheft(state, opportunity) {
  if (!opportunity?.id || opportunity.type !== "theft") throw new TypeError("窃盗機会が必要です");
  const riskLevel = riskLevelFor(state, opportunity);
  return {
    opportunityId: opportunity.id,
    targetId: opportunity.target.id,
    targetName: opportunity.target.name,
    riskLevel,
    riskLabel: RISK_LABELS[riskLevel],
    expectedReward: structuredClone(opportunity.expectedReward),
    preparationRequirements: [...opportunity.preparationRequirements],
    maximumPenalty: opportunity.maximumPenalty,
  };
}

export function executeTheft(state, opportunity, options = {}) {
  const normalized = normalizeCrimeState(state);
  const outcome = selectedOutcome(normalized, opportunity, options);
  const successful = outcome === "success_hidden" || outcome === "success_exposed";
  const detected = outcome === "success_exposed" || outcome === "captured";
  const incidentId = `theft:${normalized.turn ?? 0}:${normalized.player.crime.incidents.length + 1}:${opportunity.target.id}`;
  let next = recordCrimeIncident(normalized, {
    id: incidentId,
    type: "theft",
    severity: "minor",
    perpetrator: { id: normalized.player.id ?? "player", name: normalized.player.name ?? "主人公" },
    accomplices: options.accomplices ?? [],
    victim: structuredClone(opportunity.target),
    target: structuredClone(opportunity.stolenItem),
    jurisdiction: { id: opportunity.jurisdictionId, name: opportunity.jurisdictionName },
    reward: successful ? structuredClone(opportunity.expectedReward) : null,
    outcome,
    detected,
    historyText: successful
      ? `${opportunity.target.name}から${opportunity.stolenItem.name}を盗んだ。`
      : `${opportunity.target.name}を狙った窃盗に失敗した。`,
  });
  if (successful) {
    next.player.crime.stolenItems.push({
      ...structuredClone(opportunity.stolenItem),
      id: `${opportunity.stolenItem.id}:${incidentId}`,
      acquiredTurn: next.turn ?? 0,
      provenance: {
        crimeType: "theft",
        settlementId: opportunity.settlementId,
        targetId: opportunity.target.id,
        jurisdictionId: opportunity.jurisdictionId,
        incidentId,
      },
    });
  }
  return {
    state: next,
    result: {
      opportunityId: opportunity.id,
      incidentId,
      outcome,
      detected,
      reward: successful ? structuredClone(opportunity.expectedReward) : null,
      captured: outcome === "captured",
    },
  };
}
