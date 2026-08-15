import test from "node:test";
import assert from "node:assert/strict";
import {
  executeSabotage,
  getSabotageTargets,
  prepareSabotage,
  startSabotage,
} from "../src/sabotage-system.js";
import { advanceGeneratedWorldRegions, getGeneratedRegionalDomainView } from "../src/generated-world-system.js";
import { auditHistoricalEffectBindings } from "../src/history-model.js";
import { createCareerInitialState } from "../src/simulation.js";

function fixture(seed = "sabotage-contract") {
  return createCareerInitialState({ seed, width: 48, height: 32, plateCount: 8, nationCount: 4 });
}

test("sabotage exposes stable real road, fort/castle, and facility targets", () => {
  const state = fixture();
  const targets = getSabotageTargets(state);
  assert.ok(targets.some((target) => target.kind === "road"));
  assert.ok(targets.some((target) => ["fort", "castle"].includes(target.kind)));
  assert.ok(targets.some((target) => target.kind === "facility"));
  assert.deepEqual(targets, getSabotageTargets(state));
  const view = getGeneratedRegionalDomainView(state);
  for (const target of targets) {
    if (target.kind === "road") assert.ok(view.nationMap.roads.some((road) => road.id === target.backingId));
    else assert.ok(view.nationMap.objects.some((object) => object.id === target.backingId));
  }
});

test("sabotage synthesizes domain assets for legacy saves with null regional domains", () => {
  const state = fixture("sabotage-null-domains");
  state.generatedWorld.regionalDomains = null;
  const targets = getSabotageTargets(state);
  assert.ok(targets.length > 0);
  assert.ok(targets.every((target) => target.regionId && target.nationId));
  assert.equal(state.generatedWorld.regionalDomains, null);
});

test("sabotage is ordered start, prepare, execute and migrates active state immutably", () => {
  const state = fixture("sabotage-order");
  const target = getSabotageTargets(state)[0];
  assert.throws(() => prepareSabotage(state, { decision: "accept" }), /開始/);
  assert.throws(() => executeSabotage(state, { outcome: "success_hidden" }), /準備/);
  const before = structuredClone(state);
  const started = startSabotage(state, target);
  assert.deepEqual(state, before);
  assert.equal(started.player.crime.activeSabotage.stage, "started");
  const migrated = structuredClone(started);
  delete migrated.player.crime.sabotageRecords;
  const prepared = prepareSabotage(migrated);
  assert.equal(prepared.player.crime.activeSabotage.stage, "prepared");
  assert.deepEqual(prepared.player.crime.sabotageRecords, []);
  assert.throws(() => startSabotage(started, target), /進行中/);
});

test("prepared accomplices accept, refuse, or report and reporting exposes the plot", () => {
  const state = fixture("sabotage-accomplice");
  state.player.villageLife.party.push({ id: "ally", name: "同行者", active: true, alive: true });
  const target = getSabotageTargets(state)[0];
  const started = startSabotage(state, target, { accompliceId: "ally" });
  const accepted = prepareSabotage(started, { decision: "accept" });
  assert.equal(accepted.player.crime.accompliceDecisions[0].decision, "accept");
  assert.equal(accepted.player.crime.activeSabotage.accomplices[0].id, "ally");
  const refused = prepareSabotage(started, { decision: "refuse" });
  assert.equal(refused.player.crime.activeSabotage.accomplices.length, 0);
  const reported = prepareSabotage(started, { decision: "report" });
  assert.equal(reported.player.crime.activeSabotage.plotExposed, true);
  assert.equal(reported.player.villageLife.party[0].active, false);
  assert.equal(reported.player.crime.accompliceDecisions[0].consequence, "reported");
});

test("successful sabotage persists damage, detected heat, serious history, and monthly recovery", () => {
  let state = fixture("sabotage-damage");
  const target = getSabotageTargets(state).find((entry) => entry.kind === "road");
  state = prepareSabotage(startSabotage(state, target));
  const before = structuredClone(state);
  const resolved = executeSabotage(state, { outcome: "success_exposed" });
  assert.deepEqual(state, before);
  assert.equal(resolved.result.outcome, "success_exposed");
  assert.equal(resolved.state.player.crime.heatByJurisdiction[target.jurisdictionId], 45);
  assert.ok(resolved.state.generatedWorld.regionalDomains.assetStates[target.id].condition < 100);
  const effectiveRoad = getGeneratedRegionalDomainView(resolved.state).nationMap.roads.find((road) => road.id === target.backingId);
  assert.equal(effectiveRoad.condition, resolved.state.generatedWorld.regionalDomains.assetStates[target.id].condition);
  const event = resolved.state.history.events.find((entry) => entry.type === "criminal_sabotage");
  assert.equal(event.summary.includes(target.name), true);
  assert.equal(event.severity, "serious");
  assert.equal(auditHistoricalEffectBindings(resolved.state).valid, true);
  const damaged = resolved.state.generatedWorld.regionalDomains.assetStates[target.id].condition;
  const recovered = advanceGeneratedWorldRegions({ ...resolved.state, month: resolved.state.month + 1 });
  assert.ok(recovered.generatedWorld.regionalDomains.assetStates[target.id].condition > damaged);
});

test("domestic sovereign sabotage becomes abuse pressure without ordinary heat", () => {
  let state = fixture("sabotage-sovereign");
  const target = getSabotageTargets(state)[0];
  state.player.sovereign = true;
  state.generatedWorld.playerNationId = target.nationId;
  state = prepareSabotage(startSabotage(state, target));
  const resolved = executeSabotage(state, { outcome: "success_exposed" });
  assert.equal(resolved.state.player.crime.heatByJurisdiction[target.jurisdictionId] ?? 0, 0);
  assert.equal(resolved.state.player.crime.abuses[0].kind, "abuse_of_power");
  assert.ok(resolved.state.player.crime.abusePressureByJurisdiction[target.jurisdictionId] > 0);
  assert.ok(resolved.state.generatedWorld.regionalDomains.assetStates[target.id].condition < 100);
});

test("sabotage domestic classification ignores spoofed options and follows live ownership", () => {
  let foreign = fixture("sabotage-domestic-spoof-foreign");
  const foreignTarget = getSabotageTargets(foreign).find((entry) => entry.nationId !== foreign.generatedWorld.playerNationId);
  foreign.player.sovereign = true;
  foreign = prepareSabotage(startSabotage(foreign, foreignTarget));
  const prosecuted = executeSabotage(foreign, { outcome: "success_exposed", domestic: true });
  assert.equal(prosecuted.state.player.crime.heatByJurisdiction[foreignTarget.jurisdictionId], 45);
  assert.equal(prosecuted.state.player.crime.abuses.length, 0);

  let domestic = fixture("sabotage-domestic-spoof-home");
  const domesticTarget = getSabotageTargets(domestic).find((entry) => entry.nationId === domestic.generatedWorld.playerNationId);
  domestic.player.sovereign = true;
  domestic = prepareSabotage(startSabotage(domestic, domesticTarget));
  const abused = executeSabotage(domestic, { outcome: "success_exposed", domestic: false });
  assert.equal(abused.state.player.crime.heatByJurisdiction[domesticTarget.jurisdictionId] ?? 0, 0);
  assert.equal(abused.state.player.crime.abuses[0].kind, "abuse_of_power");
});
