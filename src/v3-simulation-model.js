import { fnv1aUtf16, unitFromHash } from "./determinism.js";
import { chooseStateReasonAction, GEOPOLITICAL_ACTION_EFFECTS, STATE_REASON_PRINCIPLE, weakestStateCondition, stateReasonConditions } from "./state-reason-system.js";

export const V3_SIMULATION_MODEL_VERSION = 1;
export const V3_MODEL_PARAMETERS = Object.freeze([
  { id: "mode", name: "国家判断", default: "weighted", choices: { weighted: "生存条件つき確率選択", strict: "最弱環の厳密最大化" }, effect: "weightedは許容範囲の候補を抽選。strictは最弱値・低コスト・文化適合の順で一つを選ぶ。", source: "src/v3-simulation-model.js" },
  { id: "trial", name: "試行番号", default: 0, min: 0, max: 1000000, step: 1, effect: "世界シード・年月・国家IDとともに抽選値を決める。同じ入力は再現可能。地形や過去の判断は変更しない。", source: "src/v3-simulation-model.js" },
  { id: "temperature", name: "選択の揺らぎ", default: 6, min: 0.5, max: 30, step: 0.5, effect: "softmaxの温度。大きいほど候補の確率が均等に近づく。危機・実行条件の制限は解除しない。", source: "src/v3-simulation-model.js" },
  { id: "maxRegret", name: "最弱値の許容差", default: 2, min: 0, max: 8, step: 1, effect: "最良候補の予測最弱値から何点低い候補まで許可するか。現在の最弱値35未満では常に0。", source: "src/v3-simulation-model.js" },
  { id: "survivalWeight", name: "生存改善の重み", default: 3, min: 0, max: 8, step: 0.1, effect: "行動と同月の自然増減による最弱値の改善量に乗算する。許容範囲の中で改善の大きい行動を優先。", source: "src/v3-simulation-model.js" },
  { id: "cultureWeight", name: "人口文化の重み", default: 1, min: 0, max: 3, step: 0.1, effect: "居住人口・制度・指導者から導く6特性と行動タグの適合点×0.42に乗算。種族名だけで行動を固定しない。", source: "src/race-decision-system.js" },
  { id: "geopoliticsWeight", name: "地政学の重み", default: 1, min: 0, max: 3, step: 0.1, effect: "候補の脅威評価と関係評価（歴史的記憶を含む）に乗算。国境・国力比・同盟・停戦の実行条件は別途維持。", source: "src/geopolitical-world.js" },
  { id: "economyWeight", name: "経済・利害の重み", default: 1, min: 0, max: 3, step: 0.1, effect: "候補の利益−危険、および現在の不足度で重み付けした食料・財政の行動効果に乗算。市場需給自体は変更しない。", source: "src/v3-simulation-model.js" },
  { id: "environmentWeight", name: "環境対応の重み", default: 1, min: 0, max: 3, step: 0.1, effect: "自国地方の危機圧と直近月の穀物未充足率に、食料・結束を改善する行動効果を掛けた点へ乗算。翌月以降の情報は参照しない。", source: "src/v3-simulation-model.js" },
  { id: "costWeight", name: "支出の重み", default: 0.15, min: 0, max: 3, step: 0.05, effect: "五つの生存条件を下げる直接費用の合計を減点。高いほど同じ改善量でも費用の小さい行動を好む。", source: "src/state-reason-system.js" },
]);
export const V3_MODEL_RULE = "実行可能な候補から生存条件を守れる範囲を選び、地政学・経済・環境・人口文化に応じて抽選する";

export function normalizeV3SimulationModel(source = {}) {
  return Object.fromEntries([["version", V3_SIMULATION_MODEL_VERSION], ...V3_MODEL_PARAMETERS.map((parameter) => {
    if (parameter.choices) return [parameter.id, Object.hasOwn(parameter.choices, source?.[parameter.id]) ? source[parameter.id] : parameter.default];
    const raw = source?.[parameter.id];
    const value = typeof raw === "number" && Number.isFinite(raw) ? raw : parameter.default;
    const bounded = Math.max(parameter.min, Math.min(parameter.max, value));
    return [parameter.id, Number((parameter.min + Math.round((bounded - parameter.min) / parameter.step) * parameter.step).toFixed(6))];
  })]);
}

// Avalanche the hash before sampling: adjacent trial numbers must not cluster.
export function v3DecisionRoll(seed, trial, period, actorId) {
  let hash = fnv1aUtf16(JSON.stringify(["v3-choice-v1", seed, trial, period, actorId]));
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return unitFromHash((hash ^ (hash >>> 16)) >>> 0, false);
}

export function selectV3NationalDecision(condition, scoredOptions, passiveEffects = {}, config = {}, input = {}) {
  const model = normalizeV3SimulationModel(config);
  const strict = chooseStateReasonAction(condition, scoredOptions, passiveEffects);
  if (!strict.selected) return { selected: null, ranked: [], selection: null };
  const currentValue = weakestStateCondition(stateReasonConditions(condition)).value;
  const bestValue = strict.selected.stateReason.value;
  const regret = currentValue < 35 ? 0 : model.maxRegret;
  const pressure = Math.max(0, Math.min(1, Number(input.crisisPressure) || 0));
  const unmet = Math.max(0, Math.min(1, Number(input.grainUnmetShare) || 0));
  const ranked = strict.ranked.map((option) => {
    const effects = GEOPOLITICAL_ACTION_EFFECTS[option.id]?.nation ?? {};
    const factors = {
      strategicBase: (Number(option.baseUtility) || 0) * 0.12,
      survival: (option.stateReason.value - currentValue) * model.survivalWeight,
      culture: (Number(option.personalityFit) || 0) * 0.42 * model.cultureWeight,
      geopolitics: ((Number(option.situation?.threat) || 0) + (Number(option.situation?.relation) || 0)) * model.geopoliticsWeight,
      economy: ((Number(option.situation?.benefit) || 0) - (Number(option.situation?.danger) || 0)
        + (effects.reserves ?? 0) * (1 - (condition.reserves ?? 50) / 100)
        + (effects.foodSecurity ?? 0) * (1 - (condition.foodSecurity ?? 50) / 100)) * model.economyWeight,
      environment: (pressure + unmet) * ((effects.foodSecurity ?? 0) * 1.5 + (effects.cohesion ?? 0) * 0.5) * model.environmentWeight,
      cost: -option.stateReason.cost * model.costWeight,
    };
    for (const key of Object.keys(factors)) if (Object.is(factors[key], -0)) factors[key] = 0;
    const allowed = model.mode === "strict" ? option.id === strict.selected.id : option.stateReason.value >= bestValue - regret;
    return { ...option, factors, evaluation: Object.values(factors).reduce((sum, value) => sum + value, 0), probability: 0,
      excludedReason: allowed ? null : model.mode === "strict" ? "厳密最大化では選択されない" : "予測最弱値が許容範囲外" };
  });
  const allowed = ranked.filter((option) => !option.excludedReason).sort((left, right) => left.id.localeCompare(right.id));
  const maximum = Math.max(...allowed.map((option) => option.evaluation));
  const weights = allowed.map((option) => Math.exp((option.evaluation - maximum) / model.temperature));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  allowed.forEach((option, index) => { option.probability = weights[index] / total; });
  const roll = model.mode === "strict" ? null : v3DecisionRoll(input.seed, model.trial, input.period, input.actorId);
  let cumulative = 0;
  const selected = allowed.find((option) => { cumulative += option.probability; return (roll ?? 0) < cumulative; }) ?? allowed.at(-1);
  const selection = { ...model, rule: model.mode === "strict" ? STATE_REASON_PRINCIPLE.rule : V3_MODEL_RULE,
    roll, currentValue, bestValue, regret, crisisPressure: pressure, grainUnmetShare: unmet, chosenId: selected.id };
  return { selected, ranked, selection };
}

// Information available before the decision, assigned to the current owner.
export function v3NationDecisionContext(runtime, simulation) {
  const result = {};
  for (const region of runtime.nations.regions) {
    const owner = simulation.generatedWorld.regionalDomains?.regionStates?.[region.id]?.nationId ?? region.nationId;
    result[owner] ??= { crisisPressure: 0, grainUnmetShare: 0, regionCount: 0 };
    const crises = (simulation.externalCrises?.activeCrises ?? []).filter((crisis) => crisis.regionId === region.id);
    result[owner].crisisPressure += Math.min(1, crises.reduce((sum, crisis) => sum + (Number(crisis.pressure) || 0) / 100, 0));
    result[owner].regionCount += 1;
  }
  const marketTotals = {};
  for (const market of Object.values(simulation.marketEconomy?.settlements ?? {})) {
    const owner = simulation.generatedWorld.regionalDomains?.regionStates?.[market.regionId]?.nationId ?? market.nationId;
    const grain = market.goods?.grain;
    if (!grain) continue;
    marketTotals[owner] ??= { demand: 0, unmet: 0 };
    const demand = Math.max(0, Number(grain.lastConsumption) || 0);
    marketTotals[owner].demand += demand;
    marketTotals[owner].unmet += Math.max(0, Math.min(demand, Number(grain.lastUnmetConsumption) || 0));
  }
  for (const [nationId, entry] of Object.entries(result)) {
    entry.crisisPressure /= Math.max(1, entry.regionCount);
    entry.grainUnmetShare = marketTotals[nationId]
      ? marketTotals[nationId].unmet / Math.max(1, marketTotals[nationId].demand)
      : Number(simulation.marketEconomy?.nationFeedback?.[nationId]?.grainUnmetShare) || 0;
  }
  return result;
}
