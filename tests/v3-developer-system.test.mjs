import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createV3VariableSnapshot, describeV3Variable, variableEntries, searchV3Variables, V3_VARIABLE_DOMAINS } from "../src/v3-variable-catalog.js";
import { V3_INSTITUTIONS } from "../src/v3-civic-policy.js";
import { V3_DIPLOMACY_RULES } from "../src/v3-campaign-diplomacy.js";
import { V3_MODEL_PARAMETERS, normalizeV3SimulationModel, v3NationDecisionContext } from "../src/v3-simulation-model.js";
import { runV3SimulationTrials } from "../src/v3-simulation-trials.js";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import { createV3WorldSimulation } from "../src/v3-world-simulation.js";
import { createV3WorldContext, createV3FieldState } from "../src/v3-field-system.js";
import { normalizeV3IntegratedState } from "../src/v3-system-kernel.js";
import { readV3Save, writeV3Save, V3_SAVE_VERSION } from "../src/v3-save-system.js";

function fixture() {
  const options = { seed: "developer-trial-fixture", width: 32, height: 24, plateCount: 6, nationCount: 3 };
  const runtime = buildGeneratedWorld(createGeneratedWorldState(options));
  const worldSimulation = createV3WorldSimulation(runtime, options);
  const context = createV3WorldContext(runtime, options.seed);
  const state = normalizeV3IntegratedState(context, createV3FieldState(context));
  return { runtime, worldOptions: options, worldSimulation, state };
}

test("変数一覧は全階層をページ送りでき、原本を変えず、説明とコード参照を持つ", () => {
  const data = fixture();
  const before = JSON.stringify(data.worldSimulation);
  const snapshot = createV3VariableSnapshot(data);
  assert.ok(variableEntries(snapshot).some((entry) => entry.path[0] === "field"));
  assert.equal(searchV3Variables(snapshot, "field.player.hp").entries[0].value, data.state.player.hp);
  const all = searchV3Variables(snapshot, "", 0, Number.MAX_SAFE_INTEGER);
  assert.ok(all.total > 1000);
  const first = searchV3Variables(snapshot, "", 0, 50);
  const second = searchV3Variables(snapshot, "", 50, 50);
  assert.deepEqual([...first.entries, ...second.entries], all.entries.slice(0, 100));
  assert.equal(second.total, all.total);
  assert.ok(all.entries.every((entry) => describeV3Variable(entry.path).classified), "new roots must declare their meaning");
  for (const entry of V3_VARIABLE_DOMAINS) assert.ok(existsSync(entry.source), entry.source);
  for (const parameter of V3_MODEL_PARAMETERS) {
    const description = describeV3Variable(["model", parameter.id]);
    assert.equal(description.effect, parameter.effect);
    assert.equal(snapshot.model[parameter.id], parameter.default);
  }
  assert.equal(snapshot.rules.civicPolicies, V3_INSTITUTIONS);
  assert.equal(snapshot.rules.diplomacy, V3_DIPLOMACY_RULES);
  assert.equal(describeV3Variable("worldSimulation.civicState.regions.r1.funded").source, "src/v3-civic-policy.js");
  assert.equal(describeV3Variable("unknown.mystery").classified, false);
  assert.equal(JSON.stringify(data.worldSimulation), before);
});

test("比較試行は開始状態を変更せず、同じ入力で再現し、異なる試行で分岐する", async () => {
  const { worldSimulation: simulation } = fixture();
  const before = JSON.stringify(simulation);
  const request = { simulation, trials: 3, months: 6 };
  const progress = [];
  const first = await runV3SimulationTrials(request, (entry) => progress.push(entry));
  const replay = await runV3SimulationTrials(JSON.parse(JSON.stringify(request)));
  assert.deepEqual(replay, first);
  assert.equal(JSON.stringify(simulation), before);
  assert.equal(progress.at(-1).completed, 18);
  assert.equal(progress.at(-1).total, 18);
  assert.ok(new Set(first.results.map((row) => row.fingerprint)).size > 1);
  const strict = await runV3SimulationTrials({ ...request, model: normalizeV3SimulationModel({ mode: "strict" }) });
  assert.equal(new Set(strict.results.map((row) => row.fingerprint)).size, 1);
  await assert.rejects(runV3SimulationTrials({ ...request, model: { trial: 1000000 } }), /上限/);
});

test("現支配国へ危機と直近市場不足を割り当て、旧所有国の不足を流用しない", () => {
  const context = v3NationDecisionContext({ nations: { regions: [{ id: "r", nationId: "old" }] } }, {
    generatedWorld: { regionalDomains: { regionStates: { r: { nationId: "new" } } } },
    externalCrises: { activeCrises: [{ regionId: "r", nationId: "old", pressure: 70 }] },
    marketEconomy: { nationFeedback: { old: { grainUnmetShare: 0.9 }, new: { grainUnmetShare: 0 } },
      settlements: { town: { regionId: "r", nationId: "old", goods: { grain: { lastConsumption: 20, lastUnmetConsumption: 5 } } } } },
  });
  assert.equal(context.new.grainUnmetShare, 0.25);
  assert.equal(context.new.crisisPressure, 0.7);
  assert.equal(context.old, undefined);
});

test("判断設定はV6保存に保持され、不明な版の上書きを拒否し従来V6も読める", () => {
  const fixtureData = fixture();
  let stored = null;
  const storage = { setItem: (_key, value) => { stored = value; }, getItem: () => stored };
  const value = { version: V3_SAVE_VERSION, world: fixtureData.worldOptions, field: fixtureData.state,
    worldSimulation: { ...fixtureData.worldSimulation, model: normalizeV3SimulationModel({ trial: 21, temperature: 8 }) } };
  writeV3Save(storage, "save", value);
  assert.equal(readV3Save(storage, "save").worldSimulation.model.trial, 21);
  const previous = stored;
  assert.throws(() => writeV3Save(storage, "save", { ...value, worldSimulation: { ...value.worldSimulation, model: { version: 999 } } }));
  assert.equal(stored, previous);
  const old = structuredClone(value);
  delete old.worldSimulation.model;
  writeV3Save(storage, "save", old);
  assert.ok(readV3Save(storage, "save"));
});
