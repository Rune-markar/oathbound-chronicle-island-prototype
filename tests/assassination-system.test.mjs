import test from "node:test";
import assert from "node:assert/strict";
import {
  executeAssassination,
  getAssassinationTargets,
  prepareAssassination,
  startAssassination,
} from "../src/assassination-system.js";
import { appointGeneratedRegionalLord, buildGeneratedWorld } from "../src/generated-world-system.js";
import { auditHistoricalEffectBindings } from "../src/history-model.js";
import { createCareerInitialState } from "../src/simulation.js";
import { LISETTE_VALENNE_ID, UNIQUE_COMPANION_ID } from "../src/unique-characters.js";

function fixture(seed = "assassination-contract") {
  let state = createCareerInitialState({ seed, width: 48, height: 32, plateCount: 8, nationCount: 4 });
  const runtime = buildGeneratedWorld(state);
  const region = runtime.nations.regions[0];
  const nationId = region.nationId;
  state.generatedWorld.characters = [
    { id: "generated:target", name: "標的人物", generated: true, targetable: true, alive: true, available: true, regionId: region.id, nationId },
    { id: "generated:untargetable", name: "対象外", generated: true, targetable: false, alive: true, regionId: region.id, nationId },
    { id: "unique:protected", name: "固有人物", characterKind: "unique", unique: true, targetable: true, alive: true, regionId: region.id, nationId },
    { id: "generated:story", name: "物語人物", generated: true, targetable: true, story: true, alive: true, regionId: region.id, nationId },
    { id: "generated:metadata-protected", name: "保護人物", generated: true, targetable: true, alive: true, regionId: region.id, nationId, metadata: { characterKind: "unique", storyProtected: true } },
  ];
  state = appointGeneratedRegionalLord(state, region.id, { lordId: "generated:lord", lordName: "地方卿" });
  return { state, region, nationId };
}

test("assassination targets only explicit generated targets and real current lords", () => {
  const { state, region } = fixture();
  const targets = getAssassinationTargets(state);
  assert.ok(targets.some((target) => target.id === "character:generated:target"));
  assert.ok(targets.some((target) => target.id === `lord:${region.id}:generated:lord` && target.kind === "regional_lord"));
  assert.equal(targets.some((target) => /untargetable|unique|story|metadata-protected/.test(target.id)), false);
  assert.deepEqual(targets, getAssassinationTargets(state));
});

test("a targetable generated office holder is emitted once with every real office binding", () => {
  let { state, region } = fixture("assassination-office-dedup");
  const runtime = buildGeneratedWorld(state);
  const secondRegion = runtime.nations.regions.find((entry) => entry.id !== region.id);
  const thirdRegion = runtime.nations.regions.find((entry) => ![region.id, secondRegion.id].includes(entry.id));
  state.generatedWorld.regionalDomains.regionStates[region.id].lordId = "generated:target";
  state.generatedWorld.regionalDomains.regionStates[region.id].lordName = "標的人物";
  state = appointGeneratedRegionalLord(state, secondRegion.id, { lordId: "generated:target", lordName: "標的人物" });
  const matching = getAssassinationTargets(state).filter((target) => target.characterId === "generated:target");
  assert.equal(matching.length, 1);
  assert.equal(matching[0].kind, "regional_lord");
  assert.deepEqual(matching[0].officeRegionIds.sort(), [region.id, secondRegion.id].sort());
  let started = startAssassination(state, matching[0]);
  started = appointGeneratedRegionalLord(started, thirdRegion.id, { lordId: "generated:target", lordName: "標的人物" });
  const resolved = executeAssassination(prepareAssassination(started), { outcome: "success_hidden" });
  assert.equal(resolved.state.generatedWorld.regionalDomains.regionStates[region.id].lordId, null);
  assert.equal(resolved.state.generatedWorld.regionalDomains.regionStates[secondRegion.id].lordId, null);
  assert.equal(resolved.state.generatedWorld.regionalDomains.regionStates[thirdRegion.id].lordId, null);
});

test("canonical unique and story character identities cannot become targets even without character records", () => {
  let { state, region } = fixture("assassination-canonical-protection");
  state = appointGeneratedRegionalLord(state, region.id, { lordId: LISETTE_VALENNE_ID, lordName: "リゼット" });
  assert.equal(getAssassinationTargets(state).some((target) => target.characterId === LISETTE_VALENNE_ID), false);
  state = appointGeneratedRegionalLord(state, region.id, { lordId: UNIQUE_COMPANION_ID, lordName: "エルネ" });
  assert.equal(getAssassinationTargets(state).some((target) => target.characterId === UNIQUE_COMPANION_ID), false);
});

test("assassination requires start and preparation and rejects invalid companions immutably", () => {
  const { state } = fixture("assassination-order");
  const target = getAssassinationTargets(state)[0];
  assert.throws(() => prepareAssassination(state), /開始/);
  assert.throws(() => executeAssassination(state, { outcome: "success_hidden" }), /準備/);
  const before = structuredClone(state);
  assert.throws(() => startAssassination(state, target, { accompliceId: "missing" }), /同行/);
  assert.deepEqual(state, before);
  const started = startAssassination(state, target);
  assert.equal(started.player.crime.activeAssassination.stage, "started");
  const prepared = prepareAssassination(started);
  assert.equal(prepared.player.crime.activeAssassination.stage, "prepared");
});

test("accomplice report persists departure and makes a hidden execution exposed", () => {
  const { state } = fixture("assassination-report");
  state.player.villageLife.party.push({ id: "ally", name: "密偵", active: true, alive: true });
  const target = getAssassinationTargets(state)[0];
  const begun = startAssassination(state, target, { accompliceId: "ally" });
  const prepared = prepareAssassination(begun, { decision: "report" });
  assert.equal(prepared.player.crime.activeAssassination.plotExposed, true);
  assert.equal(prepared.player.villageLife.party[0].active, false);
  const resolved = executeAssassination(prepared, { outcome: "success_hidden" });
  assert.equal(resolved.result.outcome, "success_exposed");
});

test("successful assassination kills the real generated target with exact capital heat and bound history", () => {
  const { state } = fixture("assassination-character");
  const target = getAssassinationTargets(state).find((entry) => entry.characterId === "generated:target");
  const prepared = prepareAssassination(startAssassination(state, target));
  const before = structuredClone(prepared);
  const resolved = executeAssassination(prepared, { outcome: "success_exposed" });
  assert.deepEqual(prepared, before);
  const person = resolved.state.generatedWorld.characters.find((entry) => entry.id === "generated:target");
  assert.equal(person.alive, false);
  assert.equal(person.available, false);
  assert.equal(resolved.state.player.crime.heatByJurisdiction[target.jurisdictionId], 70);
  assert.ok(resolved.state.history.events.some((event) => event.type === "criminal_assassination" && event.severity === "capital" && event.destroyed.includes("generated-character:generated:target")));
  assert.equal(auditHistoricalEffectBindings(resolved.state).valid, true);
});

test("killing a current lord vacates the actual office", () => {
  const { state, region } = fixture("assassination-lord");
  const target = getAssassinationTargets(state).find((entry) => entry.kind === "regional_lord");
  const resolved = executeAssassination(prepareAssassination(startAssassination(state, target)), { outcome: "success_hidden" });
  assert.equal(resolved.state.generatedWorld.regionalDomains.regionStates[region.id].lordId, null);
  assert.equal(resolved.state.generatedWorld.regionalDomains.regionStates[region.id].lordName, null);
  assert.ok(resolved.state.generatedWorld.regionalDomains.events.some((event) => event.type === "regional_office_vacated" && event.regionId === region.id));
  assert.equal(auditHistoricalEffectBindings(resolved.state).valid, true);
});

test("foreign capture ends the run while domestic sovereign capture records abuse pressure", () => {
  const foreign = fixture("assassination-capture");
  const target = getAssassinationTargets(foreign.state)[0];
  const captured = executeAssassination(prepareAssassination(startAssassination(foreign.state, target)), { outcome: "captured" });
  assert.equal(captured.state.player.crime.runEnded, true);
  assert.equal(captured.state.player.crime.ending, "capital_sentence");
  assert.equal(captured.state.player.crime.heatByJurisdiction[target.jurisdictionId], 70);

  const domestic = fixture("assassination-domestic");
  const domesticTarget = getAssassinationTargets(domestic.state)[0];
  domestic.state.player.sovereign = true;
  domestic.state.generatedWorld.playerNationId = domesticTarget.nationId;
  const abused = executeAssassination(prepareAssassination(startAssassination(domestic.state, domesticTarget)), { outcome: "captured" });
  assert.equal(abused.state.player.crime.runEnded, false);
  assert.equal(abused.state.player.crime.heatByJurisdiction[domesticTarget.jurisdictionId] ?? 0, 0);
  assert.equal(abused.state.player.crime.abuses[0].kind, "abuse_of_power");
  assert.ok(abused.state.player.crime.abusePressureByJurisdiction[domesticTarget.jurisdictionId] >= 25);
});

test("assassination domestic classification ignores spoofed options and follows live office ownership", () => {
  const foreign = fixture("assassination-domestic-spoof-foreign");
  const foreignTarget = getAssassinationTargets(foreign.state)[0];
  foreign.state.generatedWorld.playerNationId = buildGeneratedWorld(foreign.state).nations.nations.find((nation) => nation.id !== foreignTarget.nationId).id;
  foreign.state.player.sovereign = true;
  const prosecuted = executeAssassination(prepareAssassination(startAssassination(foreign.state, foreignTarget)), { outcome: "captured", domestic: true });
  assert.equal(prosecuted.state.player.crime.runEnded, true);
  assert.equal(prosecuted.state.player.crime.heatByJurisdiction[foreignTarget.jurisdictionId], 70);

  const domestic = fixture("assassination-domestic-spoof-home");
  const domesticTarget = getAssassinationTargets(domestic.state)[0];
  domestic.state.generatedWorld.playerNationId = domesticTarget.nationId;
  domestic.state.player.sovereign = true;
  const abused = executeAssassination(prepareAssassination(startAssassination(domestic.state, domesticTarget)), { outcome: "captured", domestic: false });
  assert.equal(abused.state.player.crime.runEnded, false);
  assert.equal(abused.state.player.crime.abuses[0].kind, "abuse_of_power");
});
