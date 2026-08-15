import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_REMOTE_INDIVIDUAL_REGIONS_PER_MONTH,
  buildSimulationFidelityPlan,
} from "../src/simulation-fidelity.js";
import { advanceBarbarianWorld, createBarbarianWorldState } from "../src/barbarian-system.js";
import { advanceCareerMonth, createCareerInitialState } from "../src/simulation.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";

function syntheticWorld() {
  const regions = Array.from({ length: 12 }, (_, index) => ({
    id: `r${index}`,
    neighborIds: [`r${index - 1}`, `r${index + 1}`].filter((id) => /^r(?:[0-9]|1[01])$/.test(id)),
    population: index === 0 ? 12000 : index === 11 ? 8000 : 0,
    movementCost: index % 3 === 0 ? 3 : 1,
    frontier: index > 6,
  }));
  const runtime = {
    terrain: { seed: "fidelity-contract" },
    nations: { regions },
    regionById: new Map(regions.map((region) => [region.id, region])),
  };
  return {
    runtime,
    generatedState: {
      regionalDomains: {
        regionStates: Object.fromEntries(regions.map((region) => [region.id, { nationId: "npc", lordId: null }])),
      },
    },
    expeditionRegion: regions[0],
  };
}

test("player-related regions stay full fidelity while remote individual work is bounded and deterministic", () => {
  const state = { year: 317, month: 7, player: { id: "player", generatedRegionalOffices: [] } };
  const first = buildSimulationFidelityPlan(state, syntheticWorld());
  const second = buildSimulationFidelityPlan(state, syntheticWorld());

  assert.deepEqual(first, second);
  assert.deepEqual(first.fullRegionIds, ["r0", "r1"]);
  assert.ok(first.policyOnlyRegionIds.includes("r2"), "an uninhabited region far from both populated ends is policy-only");
  assert.ok(first.activeIndividualRegionIds.filter((id) => !first.fullRegionIds.includes(id)).length <= MAX_REMOTE_INDIVIDUAL_REGIONS_PER_MONTH);
  assert.ok(Object.values(first.schedule).filter((entry) => entry.tier === "sampled")
    .every((entry) => entry.intervalMonths >= 2 && entry.intervalMonths <= 6));
});

test("remote barbarian sites do not age or cause local events in a deferred month", () => {
  const state = createCareerInitialState({ seed: "deferred-barbarian-contract", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const { runtime } = getGeneratedWorldView(state);
  const baseline = createBarbarianWorldState(runtime, state.generatedWorld.barbarians, state);
  const site = baseline.sites[0];
  const advanced = advanceBarbarianWorld(runtime, {
    ...baseline,
    lastAdvancedPeriod: null,
    sites: [site],
    events: [],
  }, { year: 317, month: 5 }, {
    simulationFidelity: { activeIndividualRegionIds: [] },
  });

  assert.equal(advanced.sites[0].ageMonths, site.ageMonths);
  assert.equal(advanced.events.length, 0);
  assert.equal(advanced.lastAdvancedPeriod, "317-5");
});

test("the monthly generated-world pulse persists an inspectable fidelity plan", () => {
  const state = createCareerInitialState({ seed: "persisted-fidelity-contract", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const advanced = advanceCareerMonth(state);
  assert.equal(advanced.generatedWorld.simulationFidelity.period, `${advanced.year}-${advanced.month}`);
  assert.ok(advanced.generatedWorld.simulationFidelity.fullRegionIds.includes(advanced.generatedWorld.expeditionRegionId));
});
