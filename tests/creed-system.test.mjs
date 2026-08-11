import test from "node:test";
import assert from "node:assert/strict";
import {
  CREED_AXIS_IDS,
  aggregateCreedGroup,
  applyCreedImpact,
  createCreedGroup,
  createCreedProfile,
  createReligiousInterpretation,
  deriveCreedFactionPressure,
  describeCreedAxis,
  evaluateCreed,
  evaluateCreedRelationship,
  generateCreedIdentity,
  recordCreedPolicyDebate,
  evaluateReligiousSchism,
} from "../src/creed-system.js";

function values(axes, importance = 0.8) {
  return Object.fromEntries(Object.entries(axes).map(([id, value]) => [id, { value, importance }]));
}

test("creed profiles expose seven extensible bounded axes with separate importance", () => {
  const profile = createCreedProfile({
    axes: {
      raceView: { value: 140, importance: 75 },
      orthodoxy: -140,
      futureAxis: { value: 42, importance: 0.25 },
    },
  });
  assert.equal(CREED_AXIS_IDS.length, 7);
  assert.equal(profile.axes.raceView.value, 100);
  assert.equal(profile.axes.raceView.importance, 0.75);
  assert.equal(profile.axes.orthodoxy.value, -100);
  assert.equal(profile.axes.futureAxis.value, 42);
  assert.equal(profile.axes.futureAxis.importance, 0.25);
  assert.equal(describeCreedAxis("raceView", 85).text, "強い種族選民主義");
});

test("a creed name is only formed from sufficiently explicit continuous values", () => {
  const unformed = createCreedProfile({ axes: values({ raceView: 55, orthodoxy: 30 }) });
  assert.equal(unformed.identity.formed, false);
  assert.equal(unformed.identity.name, "特筆すべき信条なし");

  const covenant = createCreedProfile({ axes: values({ raceView: 85, orthodoxy: 75, clericalAuthority: 65, theocracy: 55 }) });
  assert.equal(covenant.identity.formed, true);
  assert.equal(covenant.identity.name, "血統聖約主義");
  assert.ok(covenant.identity.doctrines.length >= 2 && covenant.identity.doctrines.length <= 5);
  assert.ok(covenant.identity.tendencies.some((text) => /同族/.test(text)));

  const worldNamed = generateCreedIdentity(covenant, { worldTerm: "白樹", axisId: "raceView", suffix: "教義" });
  assert.match(worldNamed.name, /^白樹/);
  assert.match(worldNamed.name, /教義$/);
});

test("creed evaluation is an additive modifier using direction, importance, and relevance", () => {
  const committed = createCreedProfile({ axes: { raceView: { value: 80, importance: 1 } } });
  const indifferent = createCreedProfile({ axes: { raceView: { value: 80, importance: 0.05 } } });
  const action = { creedEffects: [{ id: "raceView", direction: -0.8, relevance: 0.9 }] };
  const opposition = evaluateCreed(committed, action);
  const weakOpposition = evaluateCreed(indifferent, action);
  assert.ok(opposition.score < -10);
  assert.ok(Math.abs(weakOpposition.score) < Math.abs(opposition.score) / 10);
  assert.equal(opposition.contributions[0].direction, -0.8);
});

test("historical impact accumulates gradually and strong convictions resist reversal", () => {
  const neutral = createCreedProfile({ axes: { raceView: { value: 0, importance: 0.8 } }, flexibility: 0.8 });
  const convinced = createCreedProfile({ axes: { raceView: { value: 90, importance: 0.8 } }, flexibility: 0.8 });
  const neutralChange = applyCreedImpact(neutral, [{ id: "raceView", delta: -10 }], { involvement: 1, important: true, year: 120, cause: "救命" });
  const convincedChange = applyCreedImpact(convinced, [{ id: "raceView", delta: -10 }], { involvement: 1, important: true, year: 120, cause: "救命" });
  assert.ok(Math.abs(neutralChange.changes[0].delta) > Math.abs(convincedChange.changes[0].delta));
  assert.ok(convinced.axes.raceView.value > 80);
  assert.equal(convinced.history[0].cause, "救命");
  assert.equal(convinced.history[0].changes[0].id, "raceView");
});

test("relationship effects disappear when both people consider the issue unimportant", () => {
  const left = createCreedProfile({ axes: { raceView: { value: -90, importance: 0.02 } } });
  const right = createCreedProfile({ axes: { raceView: { value: 90, importance: 0.02 } } });
  const lowConcern = evaluateCreedRelationship(left, right, { salience: { raceView: 1 }, defaultSalience: 0 });
  left.axes.raceView.importance = 1;
  right.axes.raceView.importance = 1;
  const highConcern = evaluateCreedRelationship(left, right, { salience: { raceView: 1 }, defaultSalience: 0 });
  assert.ok(Math.abs(lowConcern.score) < 0.1);
  assert.ok(highConcern.score < lowConcern.score);
});

test("group creed separates society, rulers, and institutions instead of using one mean", () => {
  const citizens = createCreedProfile({ axes: values({ raceView: -80, clericalAuthority: -55 }) });
  const monarch = createCreedProfile({ axes: values({ raceView: 70, clericalAuthority: 85 }) });
  const group = aggregateCreedGroup({
    social: [
      { profile: citizens, population: 1_000_000, culturalInertia: 80 },
      { profile: monarch, population: 1, politicalPower: 100 },
    ],
    ruling: [
      { profile: citizens, population: 1_000_000 },
      { profile: monarch, population: 1, politicalPower: 100, legalAuthority: 80 },
    ],
    institutional: [
      { profile: monarch, legalAuthority: 100, religiousAuthority: 100, educationInfluence: 80 },
    ],
  });
  assert.ok(group.social.axes.raceView.value < 0);
  assert.ok(group.ruling.axes.raceView.value > 0);
  assert.ok(group.institutional.axes.clericalAuthority.value > 80);
  assert.ok(group.tension.score > 0);
});

test("policy support becomes opposition and implementation friction, not a flat buff", () => {
  const group = createCreedGroup({
    social: { axes: values({ raceView: 85 }) },
    ruling: { axes: values({ raceView: 70 }) },
    institutional: { axes: values({ raceView: 65 }) },
  });
  const effects = [{ id: "raceView", direction: -1, relevance: 1 }];
  const record = recordCreedPolicyDebate(group, { policyId: "equal_office", optionId: "enact", creedEffects: effects, year: 132 });
  assert.ok(record.score < 0);
  assert.match(record.implementation, /拒否|遅延/);
  assert.equal(group.policyDebates[0].policyId, "equal_office");
});

test("factions and religious schisms emerge from sustained interpretation gaps, not fixed sect tags", () => {
  const institution = createCreedGroup({
    social: { axes: values({ orthodoxy: 65, clericalAuthority: 75 }) },
    ruling: { axes: values({ orthodoxy: 70, clericalAuthority: 80 }) },
    institutional: { axes: values({ orthodoxy: 85, clericalAuthority: 90 }) },
  });
  const localInterpretation = createCreedProfile({ axes: values({ orthodoxy: -65, clericalAuthority: -80 }) });
  const pressure = deriveCreedFactionPressure(institution, [
    { id: "local-priests", creed: localInterpretation, politicalPower: 60 },
  ], { politicalConflict: 0.9, durationMonths: 72 });
  assert.equal(pressure.shouldFormFaction, true);
  assert.equal(pressure.candidates[0].id, "local-priests");

  const religion = { id: "star-covenant", gods: ["星海神"], sacredSites: ["北塔"] };
  const central = createReligiousInterpretation(religion.id, institution.institutional, { id: "central" });
  const local = createReligiousInterpretation(religion.id, localInterpretation, { id: "local" });
  const schism = evaluateReligiousSchism(religion, [central, local], {
    durationMonths: 180, politicalConflict: 1, organizationalIndependence: 1, schismThreshold: 35,
  });
  assert.equal(schism.religionId, religion.id);
  assert.equal(schism.shouldSplit, true);
  assert.ok(schism.primaryFaultLine.axisId === "clericalAuthority" || schism.primaryFaultLine.axisId === "orthodoxy");
});
