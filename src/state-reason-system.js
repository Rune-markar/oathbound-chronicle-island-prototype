export const STATE_REASON_SCHEMA_VERSION = 1;

export const STATE_REASON_PRINCIPLE = Object.freeze({
  id: "weakest-link-v1",
  name: "最弱環ルール",
  rule: "実行後の食料・結束・財政・防衛・主権の最低値が最大になる行動を選ぶ",
  tieBreakers: Object.freeze(["lower_cost", "national_character"]),
});

export const STATE_REASON_CONDITIONS = Object.freeze([
  Object.freeze({ id: "food", name: "食料", field: "foodSecurity" }),
  Object.freeze({ id: "cohesion", name: "結束", field: "cohesion" }),
  Object.freeze({ id: "treasury", name: "財政", field: "reserves" }),
  Object.freeze({ id: "defense", name: "防衛", field: "readiness" }),
  Object.freeze({ id: "sovereignty", name: "主権", field: "sovereignty" }),
]);

export const GEOPOLITICAL_ACTION_EFFECTS = Object.freeze({
  consolidate: Object.freeze({ nation: Object.freeze({ cohesion: 5, reserves: -1, sovereignty: 1, offensiveIntent: -2 }) }),
  secure_food: Object.freeze({ nation: Object.freeze({ foodSecurity: 6, reserves: -2, cohesion: 1 }) }),
  open_trade: Object.freeze({ nation: Object.freeze({ reserves: 3 }), relation: Object.freeze({ relation: 4, tension: -2, trade: 6 }) }),
  diplomatic_overture: Object.freeze({ nation: Object.freeze({ reserves: -1, sovereignty: 1, offensiveIntent: -2 }), relation: Object.freeze({ relation: 7, tension: -7 }) }),
  seek_alignment: Object.freeze({ nation: Object.freeze({ reserves: -2, readiness: 2, sovereignty: 2 }), relation: Object.freeze({ relation: 2, tension: -1 }) }),
  accept_alignment: Object.freeze({ nation: Object.freeze({ reserves: -1, cohesion: 2, readiness: 5, sovereignty: 6 }), relation: Object.freeze({ relation: 3, tension: -2 }) }),
  fortify_frontier: Object.freeze({ nation: Object.freeze({ readiness: 6, reserves: -2, sovereignty: 2 }), relation: Object.freeze({ tension: 2 }) }),
  mobilize: Object.freeze({ nation: Object.freeze({ readiness: 9, reserves: -4, sovereignty: 4, offensiveIntent: 5 }), relation: Object.freeze({ relation: -4, tension: 9 }) }),
  deescalate: Object.freeze({ nation: Object.freeze({ readiness: -4, sovereignty: -1, offensiveIntent: -5 }), relation: Object.freeze({ relation: 4, tension: -10 }) }),
  coerce_neighbor: Object.freeze({ nation: Object.freeze({ offensiveIntent: 6, readiness: 2, sovereignty: 6 }), relation: Object.freeze({ relation: -8, tension: 13 }) }),
  limited_war: Object.freeze({ nation: Object.freeze({ sovereignty: 20 }), relation: Object.freeze({ relation: -12, tension: 20 }) }),
  sustain_war: Object.freeze({ nation: Object.freeze({ reserves: -5, readiness: -3, foodSecurity: -2, cohesion: -2, sovereignty: 1 }), relation: Object.freeze({ relation: -4, tension: 4 }) }),
  seek_ceasefire: Object.freeze({ nation: Object.freeze({ readiness: -2, sovereignty: -2, offensiveIntent: -4 }), relation: Object.freeze({ relation: 2, tension: -4 }) }),
  accept_ceasefire: Object.freeze({ nation: Object.freeze({ sovereignty: -3, offensiveIntent: -8 }), relation: Object.freeze({ relation: 5, tension: -18 }) }),
});

function bounded(value) {
  return Math.round(Math.min(100, Math.max(0, Number(value) || 0)));
}

export function stateReasonConditions(nationState) {
  return Object.fromEntries(STATE_REASON_CONDITIONS.map(({ id, field }) => [id, bounded(nationState?.[field])]));
}

export function weakestStateCondition(conditions) {
  return STATE_REASON_CONDITIONS.map(({ id, name }) => ({ id, name, value: bounded(conditions?.[id]) }))
    .sort((left, right) => left.value - right.value || left.id.localeCompare(right.id))[0];
}

export function createStateReason(nationState, source = null) {
  const conditions = stateReasonConditions(nationState);
  const weakest = weakestStateCondition(conditions);
  const initialImperativeId = STATE_REASON_CONDITIONS.some(({ id }) => id === source?.initialImperativeId)
    ? source.initialImperativeId
    : weakest.id;
  return {
    schemaVersion: STATE_REASON_SCHEMA_VERSION,
    principleId: STATE_REASON_PRINCIPLE.id,
    conditions,
    value: weakest.value,
    weakestConditionId: weakest.id,
    initialImperativeId,
    lastDecision: source?.lastDecision ? { ...source.lastDecision } : null,
  };
}

export function projectStateReason(nationState, pullId, passiveEffects = {}) {
  const effects = GEOPOLITICAL_ACTION_EFFECTS[pullId]?.nation ?? {};
  const projectedState = { ...nationState };
  for (const { field } of STATE_REASON_CONDITIONS) {
    projectedState[field] = bounded((Number(projectedState[field]) || 0) + (effects[field] ?? 0) + (passiveEffects[field] ?? 0));
  }
  const conditions = stateReasonConditions(projectedState);
  const weakest = weakestStateCondition(conditions);
  const cost = STATE_REASON_CONDITIONS.reduce((sum, { field }) => sum + Math.max(0, -(effects[field] ?? 0)), 0);
  return {
    conditions,
    value: weakest.value,
    weakestConditionId: weakest.id,
    cost,
  };
}

export function chooseStateReasonAction(nationState, scoredOptions, passiveEffects = {}) {
  if (!Array.isArray(scoredOptions) || !scoredOptions.length) throw new Error("選択可能な国家行動がありません。");
  const ranked = scoredOptions.map((option) => ({
    ...option,
    stateReason: projectStateReason(nationState, option.pullId ?? option.id, passiveEffects),
  })).sort((left, right) => (
    right.stateReason.value - left.stateReason.value
    || left.stateReason.cost - right.stateReason.cost
    || right.personalityFit - left.personalityFit
    || left.id.localeCompare(right.id)
  ));
  return { selected: ranked[0], ranked };
}
