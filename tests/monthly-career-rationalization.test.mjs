import test from "node:test";
import assert from "node:assert/strict";

import * as simulation from "../src/simulation.js";
import { advanceCareerMonth as advancePlayerCareerMonth, advanceCareerMonthOnDraft as advancePlayerCareerMonthOnDraft } from "../src/player-career.js";
import { advanceCrimeMonth, advanceCrimeMonthOnDraft } from "../src/crime-system.js";
import { advanceMilitaryCareerMissionMonth, advanceMilitaryCareerMissionMonthOnDraft } from "../src/military-career-system.js";
import { advanceLifeToRealmMonth, advanceLifeToRealmMonthOnDraft } from "../src/life-to-realm-system.js";
import { advancePropertyEnterpriseMonth, advancePropertyEnterpriseMonthOnDraft } from "../src/property-enterprise-system.js";
import { advanceCompanionQuests, advanceCompanionQuestsOnDraft } from "../src/companion-quest-system.js";
import { advanceEstatePoliticsMonth, advanceEstatePoliticsMonthOnDraft } from "../src/estate-politics-system.js";
import { advanceGeneratedCampaignMonth, advanceGeneratedCampaignMonthOnDraft } from "../src/generated-campaign-system.js";

const stages = [
  ["player", advancePlayerCareerMonth, advancePlayerCareerMonthOnDraft],
  ["crime", advanceCrimeMonth, advanceCrimeMonthOnDraft],
  ["military", advanceMilitaryCareerMissionMonth, advanceMilitaryCareerMissionMonthOnDraft],
  ["life", advanceLifeToRealmMonth, advanceLifeToRealmMonthOnDraft],
  ["property", advancePropertyEnterpriseMonth, advancePropertyEnterpriseMonthOnDraft],
  ["companion", advanceCompanionQuests, advanceCompanionQuestsOnDraft],
  ["estate", advanceEstatePoliticsMonth, advanceEstatePoliticsMonthOnDraft],
  ["generated campaign", advanceGeneratedCampaignMonth, advanceGeneratedCampaignMonthOnDraft],
];

test("month stages keep immutable public wrappers and equivalent same-root draft operations", () => {
  const base = simulation.createCareerInitialState({ seed: "monthly-draft-contract", width: 32, height: 20, plateCount: 7, nationCount: 7 });

  for (const [name, publicAdvance, draftAdvance] of stages) {
    const input = structuredClone(base);
    const before = structuredClone(input);
    const expected = publicAdvance(input);
    const draft = structuredClone(input);
    const actual = draftAdvance(draft);

    assert.strictEqual(actual, draft, `${name} draft operation must return the same root`);
    assert.deepEqual(actual, expected, `${name} draft operation must match the public wrapper`);
    assert.deepEqual(input, before, `${name} public wrapper must not mutate its input`);
    assert.notStrictEqual(expected, input, `${name} public wrapper must return an isolated root`);
  }
});

test("the facade keeps draft operations internal and clones the full career state once per month", () => {
  for (const exportName of [
    "advanceCareerMonthOnDraft",
    "advanceCrimeMonthOnDraft",
    "advanceMilitaryCareerMissionMonthOnDraft",
    "advanceLifeToRealmMonthOnDraft",
    "advancePropertyEnterpriseMonthOnDraft",
    "advanceCompanionQuestsOnDraft",
    "advanceEstatePoliticsMonthOnDraft",
    "advanceGeneratedCampaignMonthOnDraft",
  ]) assert.equal(exportName in simulation, false, `${exportName} must stay outside the public facade`);

  const state = simulation.createCareerInitialState({ seed: "single-month-clone-contract", width: 32, height: 20, plateCount: 7, nationCount: 7 });
  const before = structuredClone(state);
  const nativeClone = globalThis.structuredClone;
  let fullStateClones = 0;
  globalThis.structuredClone = (value) => {
    if (value?.player && value?.generatedWorld && value?.cities) fullStateClones += 1;
    return nativeClone(value);
  };

  let advanced;
  try {
    advanced = simulation.advanceCareerMonth(state);
  } finally {
    globalThis.structuredClone = nativeClone;
  }

  assert.equal(fullStateClones, 1);
  assert.deepEqual(state, before);
  assert.notStrictEqual(advanced, state);
  assert.deepEqual([advanced.year, advanced.month, advanced.turn], [317, 5, 1]);
});

test("invalid career state still fails before any clone", () => {
  const nativeClone = globalThis.structuredClone;
  let cloneCount = 0;
  globalThis.structuredClone = (value) => {
    cloneCount += 1;
    return nativeClone(value);
  };
  try {
    assert.throws(() => simulation.advanceCareerMonth({}), /キャリア状態ではありません/);
  } finally {
    globalThis.structuredClone = nativeClone;
  }
  assert.equal(cloneCount, 0);
});
