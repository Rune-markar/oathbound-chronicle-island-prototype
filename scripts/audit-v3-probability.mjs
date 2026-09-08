import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import { createV3WorldSimulation, advanceV3WorldSimulation, buildV3WorldPrehistory } from "../src/v3-world-simulation.js";
import { normalizeV3SimulationModel } from "../src/v3-simulation-model.js";
import { summarizeV3Trial } from "../src/v3-simulation-trials.js";
import { analyzeRaceDecisionBalance } from "../src/race-decision-system.js";

const models = [
  ["standard", {}], ["alternate-trial", { trial: 1 }], ["strict", { mode: "strict" }],
  ["broad-choice", { temperature: 18, maxRegret: 5 }],
  ["supply-priority", { economyWeight: 3, environmentWeight: 3 }],
  ["culture-and-threat", { cultureWeight: 3, geopoliticsWeight: 3 }],
];
const results = [];
function validate(simulation) {
  for (const state of Object.values(simulation.generatedWorld.geopolitics.nationStates)) {
    for (const field of ["foodSecurity", "cohesion", "reserves", "readiness", "sovereignty"]) {
      assert.ok(Number.isFinite(state[field]) && state[field] >= 0 && state[field] <= 100, field);
    }
  }
  for (const market of Object.values(simulation.marketEconomy.settlements)) for (const good of Object.values(market.goods)) {
    assert.ok(Number.isFinite(good.inventory) && good.inventory >= 0, "market inventory");
    assert.ok(Number.isFinite(good.buyPrice) && good.buyPrice > 0 && Number.isFinite(good.sellPrice) && good.sellPrice > 0, "market price");
  }
  for (const race of Object.values(simulation.generatedWorld.raceDynamics.races)) assert.ok(race.population >= 0, "population");
  const balance = analyzeRaceDecisionBalance(simulation.generatedWorld.raceDynamics);
  assert.ok(balance.maximumProjectionError < 0.02, "population projection");
}
for (let world = 0; world < 3; world += 1) {
  const options = { seed: "v3-probability-audit-" + world, width: 48, height: 32, plateCount: 8, nationCount: 4 + world };
  const runtime = buildGeneratedWorld(createGeneratedWorldState(options));
  const initial = createV3WorldSimulation(runtime, options);
  for (const [name, config] of models) {
    let simulation = { ...initial, model: normalizeV3SimulationModel(config) };
    const actions = {};
    const wars = new Set();
    const crises = new Set();
    for (let month = 0; month < 60; month += 1) {
      simulation = advanceV3WorldSimulation(runtime, simulation, 1);
      validate(simulation);
      for (const war of [...simulation.generatedWorld.worldWars.activeWars, ...simulation.generatedWorld.worldWars.history]) wars.add(war.id);
      for (const crisis of simulation.externalCrises.activeCrises) crises.add(crisis.id);
      for (const event of simulation.generatedWorld.geopolitics.events.filter((event) => event.period === simulation.year + "-" + simulation.month)) {
        assert.ok(event.selection && event.alternatives.some((entry) => entry.id === event.pullId && entry.probability === event.probability));
        actions[event.pullId] = (actions[event.pullId] ?? 0) + 1;
      }
    }
    const summary = { seed: options.seed, scenario: name, months: 60, ...summarizeV3Trial(simulation, { actionCounts: actions, warsStarted: wars.size, crisesStarted: crises.size }) };
    results.push(summary);
    console.log(JSON.stringify(summary));
  }
  const history = await buildV3WorldPrehistory(runtime, options, { months: 600 });
  validate(history);
  const summary = { seed: options.seed, scenario: "50-year-prehistory", months: 600, ...summarizeV3Trial(history),
    completedWars: history.generatedWorld.worldWars.history.length,
    crisisTypes: [...new Set([...history.externalCrises.activeCrises, ...history.externalCrises.history].map((entry) => entry.type))] };
  results.push(summary);
  console.log(JSON.stringify(summary));
}
const report = { date: "2026-09-08", command: "node scripts/audit-v3-probability.mjs", modelVersion: 1,
  totalWorldMonths: results.reduce((sum, entry) => sum + entry.months, 0),
  checks: ["finite national conditions in 0..100", "nonnegative market inventories and positive prices", "nonnegative population and projection error below 0.02", "logged choices equal actual candidate probabilities"], results };
await writeFile(new URL("../docs/reports/2026-09-08-v3-probability-audit.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
