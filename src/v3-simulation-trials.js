import { buildGeneratedWorld, createGeneratedWorldState } from "./generated-world-system.js";
import { advanceV3WorldSimulation, normalizeV3WorldSimulation } from "./v3-world-simulation.js";
import { normalizeV3SimulationModel } from "./v3-simulation-model.js";
import { fnv1aUtf16 } from "./determinism.js";

const round = (value) => Math.round(value * 100) / 100;
const integer = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Math.round(Number(value) || minimum)));
const warIds = (world) => [...(world?.worldWars?.activeWars ?? []), ...(world?.worldWars?.history ?? [])].map((war) => war.id);

export function summarizeV3Trial(simulation, counters = {}) {
  const conditions = Object.values(simulation.generatedWorld.geopolitics?.nationStates ?? {});
  const feedback = Object.values(simulation.marketEconomy?.nationFeedback ?? {});
  const mean = (list, selector) => round(list.reduce((sum, item) => sum + selector(item), 0) / Math.max(1, list.length));
  const outcome = { nations: simulation.generatedWorld.geopolitics?.nationStates, relations: simulation.generatedWorld.geopolitics?.relations,
    regions: simulation.generatedWorld.regionalDomains?.regionStates,
    markets: simulation.marketEconomy.settlements, crises: simulation.externalCrises.activeCrises, choices: counters.choices ?? [] };
  return { trial: simulation.model.trial, period: simulation.year + "-" + simulation.month,
    food: mean(conditions, (nation) => nation.foodSecurity), treasury: mean(conditions, (nation) => nation.reserves),
    weakest: conditions.length ? Math.min(...conditions.map((nation) => nation.stateReason.value)) : null,
    grainUnmetPercent: mean(feedback, (entry) => entry.grainUnmetShare * 100),
    warsStarted: counters.warsStarted ?? null, crisesStarted: counters.crisesStarted ?? null,
    actionCounts: counters.actionCounts ?? {}, fingerprint: fnv1aUtf16(JSON.stringify(outcome)).toString(16).padStart(8, "0") };
}

// Uses the same world-month function as the normal V3 action kernel. Player
// choices stay fixed; no browser storage or live objects are written here.
export async function runV3SimulationTrials(request, onProgress = () => {}) {
  const { simulation } = request;
  if (!simulation?.generatedWorld?.seed) throw new Error("先にV3の世界を開始してください。");
  const config = createGeneratedWorldState(simulation.generatedWorld);
  const runtime = buildGeneratedWorld(config);
  const model = normalizeV3SimulationModel(request.model ?? simulation.model);
  const trials = integer(request.trials, 1, 32);
  const months = integer(request.months, 1, 120);
  if (model.trial + trials - 1 > 1000000) throw new Error("試行番号の上限1000000を超えます。開始番号か試行数を下げてください。");
  const results = [];
  for (let index = 0; index < trials; index += 1) {
    let current = normalizeV3WorldSimulation(runtime, config, structuredClone(simulation));
    current.model = { ...model, trial: model.trial + index };
    const seenWars = new Set(warIds(current.generatedWorld));
    const seenCrises = new Set((current.externalCrises.activeCrises ?? []).map((crisis) => crisis.id));
    const counters = { warsStarted: 0, crisesStarted: 0, actionCounts: {}, choices: [] };
    for (let month = 0; month < months; month += 1) {
      current = advanceV3WorldSimulation(runtime, current, 1);
      const period = current.year + "-" + current.month;
      for (const event of current.generatedWorld.geopolitics.events.filter((event) => event.period === period)) {
        counters.actionCounts[event.pullId] = (counters.actionCounts[event.pullId] ?? 0) + 1;
        counters.choices.push([period, event.nationId, event.targetNationId, event.pullId]);
      }
      for (const id of warIds(current.generatedWorld)) if (!seenWars.has(id)) { seenWars.add(id); counters.warsStarted += 1; }
      for (const crisis of current.externalCrises.activeCrises) if (!seenCrises.has(crisis.id)) { seenCrises.add(crisis.id); counters.crisesStarted += 1; }
      await onProgress({ completed: index * months + month + 1, total: trials * months, trial: current.model.trial, month: month + 1 });
    }
    results.push(summarizeV3Trial(current, counters));
  }
  return { version: 1, seed: config.seed, startPeriod: simulation.year + "-" + simulation.month, model, trials, months,
    scope: "世界の月次比較。人物の移動・売買・統治操作は追加しない。", results };
}
