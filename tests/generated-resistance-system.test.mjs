import test from "node:test";
import assert from "node:assert/strict";
import { createCareerInitialState } from "../src/simulation.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";
import {
  advanceGeneratedResistance,
  createGeneratedResistanceState,
  registerGeneratedOccupation,
  respondToGeneratedResistance,
  setGeneratedOccupationPolicy,
} from "../src/generated-resistance-system.js";

function fixture(seed = "resistance") {
  const state = createCareerInitialState({ seed, width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const runtime = getGeneratedWorldView(state).runtime;
  const region = runtime.nations.regions.find((entry) => entry.nationId !== state.generatedWorld.playerNationId);
  const formerNationId = state.generatedWorld.regionalDomains.regionStates[region.id].nationId;
  const occupierNationId = state.generatedWorld.playerNationId;
  state.generatedWorld.regionalDomains.regionStates[region.id].nationId = occupierNationId;
  let resistance = registerGeneratedOccupation(null, region.id, occupierNationId, formerNationId, { fullAnnexation: true, warId: "test-war" }, state);
  return { state, runtime, region, formerNationId, occupierNationId, resistance };
}

test("annexed generated regions keep compact resistance, compliance, cells, garrison, and policy state", () => {
  const source = fixture();
  const occupation = source.resistance.occupations[0];
  assert.equal(occupation.regionId, source.region.id);
  assert.ok(occupation.resistance >= 60);
  assert.equal(JSON.stringify(source.resistance).includes("tiles"), false);
  const changed = setGeneratedOccupationPolicy(source.resistance, occupation.id, "local_autonomy");
  assert.equal(changed.occupations[0].policyId, "local_autonomy");
  assert.equal(createGeneratedResistanceState(changed).schemaVersion, 1);
});

test("high resistance creates a player decision, damages the region, and accepts a response", () => {
  const source = fixture("resistance-incident");
  source.resistance.occupations[0].resistance = 96;
  source.resistance.occupations[0].garrison = 5;
  const advanced = advanceGeneratedResistance(source.runtime, source.resistance, source.state.generatedWorld.regionalDomains, source.state.generatedWorld.geopolitics, { year: 317, month: 5 }, { protectedNationIds: [source.occupierNationId] });
  const occupation = advanced.resistance.occupations[0];
  assert.ok(occupation.pendingResponse);
  assert.equal(advanced.pendingStrategicDecisions[0].type, "generated_resistance_response");
  const responded = respondToGeneratedResistance(source.runtime, advanced.resistance, advanced.regionalDomains, occupation.id, "negotiate", { year: 317, month: 5 });
  assert.equal(responded.resistance.occupations[0].pendingResponse, null);
  assert.ok(responded.resistance.occupations[0].resistance < occupation.resistance);
});

test("AI occupiers select a policy and can integrate a pacified region", () => {
  const source = fixture("resistance-ai");
  const occupation = source.resistance.occupations[0];
  occupation.resistance = 0;
  occupation.compliance = 90;
  const advanced = advanceGeneratedResistance(source.runtime, source.resistance, source.state.generatedWorld.regionalDomains, source.state.generatedWorld.geopolitics, { year: 317, month: 5 });
  assert.equal(advanced.resistance.occupations[0].status, "integrated");
  assert.ok(advanced.resistance.events.some((entry) => entry.id.endsWith(":integrated")));
});
