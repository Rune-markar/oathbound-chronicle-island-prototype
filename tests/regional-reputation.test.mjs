import test from "node:test";
import assert from "node:assert/strict";
import {
  createCareerInitialState,
  getRegionalReputationReport,
  getReputationSpreadRadius,
  recordRegionalAchievement,
} from "../src/simulation.js";

const REGIONS = Object.freeze([
  Object.freeze({ id: "west", neighborIds: ["central"] }),
  Object.freeze({ id: "central", neighborIds: ["west", "east"] }),
  Object.freeze({ id: "east", neighborIds: ["central"] }),
  Object.freeze({ id: "island", neighborIds: [] }),
]);

test("a town achievement is known locally but remains unknown in another region", () => {
  const state = createCareerInitialState();
  recordRegionalAchievement(state, {
    id: "oak-village",
    name: "樫の村",
    regionId: "west",
  }, {
    label: "街道の救援",
    merit: 10,
    renown: 2,
  });

  const local = getRegionalReputationReport(state, { regionId: "west", villageId: "oak-village", regions: REGIONS });
  const neighbor = getRegionalReputationReport(state, { regionId: "central", regions: REGIONS });
  const distant = getRegionalReputationReport(state, { regionId: "island", regions: REGIONS });

  assert.ok(local.value > 0);
  assert.equal(neighbor.value, 0);
  assert.equal(distant.value, 0);
  assert.equal(local.sources[0].spreadRadius, 0);
});

test("more merit in the same town expands propagation and attenuates with distance", () => {
  const state = createCareerInitialState();
  for (let index = 0; index < 6; index += 1) {
    recordRegionalAchievement(state, {
      id: "oak-village",
      name: "樫の村",
      regionId: "west",
    }, {
      label: `地域功績${index + 1}`,
      merit: 10,
      renown: 2,
    });
  }

  const local = getRegionalReputationReport(state, { regionId: "west", villageId: "oak-village", regions: REGIONS });
  const neighbor = getRegionalReputationReport(state, { regionId: "central", regions: REGIONS });
  const secondNeighbor = getRegionalReputationReport(state, { regionId: "east", regions: REGIONS });

  assert.equal(getReputationSpreadRadius(60), 2);
  assert.ok(local.value > neighbor.value);
  assert.ok(neighbor.value > secondNeighbor.value);
  assert.ok(secondNeighbor.value > 0);
  assert.equal(secondNeighbor.sources[0].distance, 2);
});
