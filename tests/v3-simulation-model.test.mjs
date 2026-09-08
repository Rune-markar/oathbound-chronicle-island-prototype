import test from "node:test";
import assert from "node:assert/strict";
import { normalizeV3SimulationModel, selectV3NationalDecision, v3NationDecisionContext, V3_MODEL_PARAMETERS } from "../src/v3-simulation-model.js";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import { createV3WorldSimulation, advanceV3WorldSimulation, normalizeV3WorldSimulation } from "../src/v3-world-simulation.js";
import { chooseStateReasonAction } from "../src/state-reason-system.js";

const condition = { foodSecurity: 50, cohesion: 50, reserves: 50, readiness: 50, sovereignty: 50 };
const options = [
  { id: "consolidate", baseUtility: 40, personalityFit: 0, situation: { benefit: 0 } },
  { id: "secure_food", baseUtility: 40, personalityFit: 0, situation: { benefit: 0 } },
  { id: "open_trade", baseUtility: 40, personalityFit: 0, situation: { benefit: 0 } },
];
const input = { seed: "trial-distribution", period: "317-5", actorId: "nation-1" };
const select = (config = {}, state = condition, candidates = options, context = input) => selectV3NationalDecision(state, candidates, {}, config, context);
const chance = (result, id) => result.ranked.find((option) => option.id === id).probability;

test("実際の確率は合計1で、同一試行・候補順の変更で再抽選しない", () => {
  const result = select();
  assert.ok(Math.abs(result.ranked.reduce((sum, option) => sum + option.probability, 0) - 1) < 1e-12);
  assert.deepEqual(select(), result);
  assert.deepEqual(select({}, condition, [...options].reverse()), result);
  assert.equal(result.selection.chosenId, result.selected.id);
  assert.ok(result.selection.roll >= 0 && result.selection.roll < 1);
  assert.equal(Object.values(result.selected.factors).reduce((a, b) => a + b, 0), result.selected.evaluation);
});

test("隣接する試行番号4000回の抽選頻度が表示確率と整合する", () => {
  const expected = select();
  const counts = {};
  for (let trial = 0; trial < 4000; trial += 1) {
    const result = select({ trial });
    counts[result.selected.id] = (counts[result.selected.id] ?? 0) + 1;
  }
  for (const option of expected.ranked) assert.ok(Math.abs((counts[option.id] ?? 0) / 4000 - option.probability) < 0.035, option.id);
  assert.ok(Object.keys(counts).length >= 2);
});

test("危機時は許容差を0にし、厳密モードは従来の最弱環選択と一致する", () => {
  const crisis = { ...condition, foodSecurity: 12 };
  const result = select({ maxRegret: 8, temperature: 30 }, crisis);
  assert.equal(result.selection.regret, 0);
  assert.equal(result.selected.id, "secure_food");
  assert.equal(chance(result, "secure_food"), 1);
  assert.ok(result.ranked.filter((option) => option.id !== "secure_food").every((option) => option.probability === 0 && option.excludedReason));
  for (let trial = 0; trial < 8; trial += 1) {
    const strict = select({ mode: "strict", trial });
    assert.equal(strict.selected.id, chooseStateReasonAction(condition, options).selected.id);
    assert.equal(strict.selected.probability, 1);
    assert.equal(strict.selection.roll, null);
  }
});

test("文化・脅威・経済・危機の各重みが説明どおり選択確率へ作用する", () => {
  const candidates = options.map((option) => option.id === "secure_food" ? { ...option, personalityFit: 8, situation: { benefit: 3, threat: 4 } } : option);
  for (const parameter of ["cultureWeight", "geopoliticsWeight", "economyWeight", "environmentWeight"]) {
    const context = { ...input, crisisPressure: 0.8, grainUnmetShare: 0.4 };
    const low = select({ [parameter]: 0 }, condition, candidates, context);
    const high = select({ [parameter]: 3 }, condition, candidates, context);
    assert.ok(chance(high, "secure_food") > chance(low, "secure_food"), parameter);
  }
  assert.ok(chance(select({ costWeight: 3 }), "open_trade") > chance(select({ costWeight: 0 }), "open_trade"));
  const varied = { foodSecurity: 48, cohesion: 60, reserves: 60, readiness: 60, sovereignty: 60 };
  assert.ok(chance(select({ survivalWeight: 8, maxRegret: 8 }, varied), "secure_food") > chance(select({ survivalWeight: 0, maxRegret: 8 }, varied), "secure_food"));
  const sharp = select({ temperature: 0.5 });
  const broad = select({ temperature: 30 });
  assert.ok(Math.max(...sharp.ranked.map((option) => option.probability)) > Math.max(...broad.ranked.map((option) => option.probability)));
});

test("設定は宣言された型と範囲で正規化し、危機の集計は現支配国を見る", () => {
  const model = normalizeV3SimulationModel({ trial: Infinity, temperature: -10, cultureWeight: 999, mode: "__proto__", unknown: 3 });
  assert.equal(model.trial, 0);
  assert.equal(model.temperature, 0.5);
  assert.equal(model.cultureWeight, 3);
  assert.equal(model.mode, "weighted");
  assert.equal(model.unknown, undefined);
  assert.equal(Object.keys(model).length, V3_MODEL_PARAMETERS.length + 1);
  const context = v3NationDecisionContext({ nations: { regions: [{ id: "r1", nationId: "old" }, { id: "r2", nationId: "old" }] } }, {
    generatedWorld: { regionalDomains: { regionStates: { r1: { nationId: "new" } } } },
    externalCrises: { activeCrises: [{ regionId: "r1", nationId: "old", pressure: 80 }] },
    marketEconomy: { nationFeedback: { new: { grainUnmetShare: 0.3 } } },
  });
  assert.equal(context.new.crisisPressure, 0.8);
  assert.equal(context.old.crisisPressure, 0);
  assert.equal(context.new.grainUnmetShare, 0.3);
});

test("V3月次は設定を使い保存復帰と一括進行で同じ結果になり、試行で展開が分岐する", () => {
  const config = { seed: "v3-model-integration", width: 48, height: 32, plateCount: 8, nationCount: 4 };
  const runtime = buildGeneratedWorld(createGeneratedWorldState(config));
  const initial = createV3WorldSimulation(runtime, config);
  const original = JSON.stringify(initial);
  const bulk = advanceV3WorldSimulation(runtime, initial, 12);
  let repeated = initial;
  for (let month = 0; month < 12; month += 1) repeated = advanceV3WorldSimulation(runtime, normalizeV3WorldSimulation(runtime, config, JSON.parse(JSON.stringify(repeated))), 1);
  assert.deepEqual(bulk.generatedWorld, repeated.generatedWorld);
  assert.deepEqual(bulk.marketEconomy, repeated.marketEconomy);
  assert.equal(JSON.stringify(initial), original);
  assert.equal(bulk.model.mode, "weighted");
  const alternative = advanceV3WorldSimulation(runtime, { ...initial, model: { ...initial.model, trial: 1 } }, 12);
  assert.notDeepEqual(bulk.generatedWorld.geopolitics.nationStates, alternative.generatedWorld.geopolitics.nationStates);
  for (const event of bulk.generatedWorld.geopolitics.events) {
    assert.equal(event.selection.mode, "weighted");
    assert.equal(event.selection.chosenId, event.pullId);
    assert.ok(event.alternatives.some((option) => option.id === event.pullId && option.probability === event.probability));
    assert.ok(event.stateReason.value >= event.selection.bestValue - event.selection.regret);
  }
});
