import test from "node:test";
import assert from "node:assert/strict";
import {
  REGIONAL_REPUTATION_GAINS,
  createCareerInitialState,
  getRegionalReputationReport,
  getReputationSpreadRadius,
  performCareerAction,
  performVillageAction,
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

test("good deeds, completed requests, and a liege's requests grant increasingly larger renown", () => {
  const villageFor = (state) => ({
    id: "oak-village",
    name: "樫の村",
    regionId: state.generatedWorld.expeditionRegionId,
  });

  const goodDeedStart = createCareerInitialState({ seed: "reputation-good-deed" });
  const goodDeed = performVillageAction(goodDeedStart, villageFor(goodDeedStart), "trigger_event");
  assert.equal(goodDeed.player.regionalReputation.achievements[0].renown, REGIONAL_REPUTATION_GAINS.goodDeed);

  let request = createCareerInitialState({ seed: "reputation-request" });
  const requestVillage = villageFor(request);
  request = performVillageAction(request, requestVillage, "accept_request");
  request = performVillageAction(request, requestVillage, "recruit_companion");
  request = performVillageAction(request, requestVillage, "complete_request");
  request = performVillageAction(request, requestVillage, "report_request");
  assert.equal(request.player.regionalReputation.achievements[0].renown, REGIONAL_REPUTATION_GAINS.completedRequest);

  let vassal = createCareerInitialState({ seed: "reputation-liege-request" });
  vassal.player.stage = "retainer";
  vassal.player.affiliation = { nationId: "nation-1", liegeId: "test-lord", liegeName: "試験領主" };
  vassal = performCareerAction(vassal, "fulfill_order");
  assert.equal(vassal.player.regionalReputation.achievements[0].renown, REGIONAL_REPUTATION_GAINS.liegeRequest);
  assert.ok(REGIONAL_REPUTATION_GAINS.goodDeed < REGIONAL_REPUTATION_GAINS.completedRequest);
  assert.ok(REGIONAL_REPUTATION_GAINS.completedRequest < REGIONAL_REPUTATION_GAINS.liegeRequest);
});
