import test from "node:test";
import assert from "node:assert/strict";
import { applyOfficerCommandPolitics } from "../src/campaign-system.js";
import {
  CREED_AXIS_IDS,
  adoptDoctrine,
  commitMonth,
  createInitialState,
  getCityCreedReport,
  getNationCreedReport,
  getOfficerCreedReport,
  getPolicyCreedSupport,
  queueOrder,
} from "../src/simulation.js";

test("initial state gives people, factions, cities, and the nation compatible creed data", () => {
  const state = createInitialState();
  Object.values(state.officers).forEach((officer) => {
    assert.deepEqual(Object.keys(officer.creed.axes), CREED_AXIS_IDS);
    assert.ok(Array.isArray(officer.creed.dominantCreedTraits));
  });
  Object.values(state.cities).forEach((city) => {
    assert.ok(city.creed.social.axes.raceView);
    assert.ok(city.creed.ruling.axes.raceView);
    assert.ok(city.creed.institutional.axes.raceView);
    Object.values(city.factions).forEach((faction) => assert.ok(faction.creed.axes.raceView));
  });
  assert.equal(getOfficerCreedReport(state, "mirel").identity.formed, true);
  assert.equal(getOfficerCreedReport(state, "gaius").identity.formed, false);
  assert.ok(getNationCreedReport(state).tension.score >= 0);
  assert.ok(getCityCreedReport(state, "nereia").layers.social.axes.find((axis) => axis.axisId === "raceView").value < 0);
  assert.ok(getCityCreedReport(state, "orta").layers.social.axes.find((axis) => axis.axisId === "raceView").value > 0);
});

test("the same immigration policy is evaluated differently by different local histories", () => {
  const state = createInitialState();
  const port = getPolicyCreedSupport(state, "nereia", "immigration", "encourage");
  const frontier = getPolicyCreedSupport(state, "orta", "immigration", "encourage");
  assert.equal(port.tagged, true);
  assert.ok(port.score > frontier.score);
  assert.ok(frontier.opposedFactions.includes("landowners"));
  assert.ok(port.group.layers.social.score > frontier.group.layers.social.score);
});

test("policy enactment records debate and changes faction politics before social beliefs catch up", () => {
  let state = adoptDoctrine(createInitialState(), "balanced");
  const startingInstitution = state.cities.orta.creed.institutional.axes.raceView.value;
  const startingLandownerSupport = state.cities.orta.factions.landowners.support;
  state = queueOrder(state, { kind: "policy", cityId: "orta", policyId: "immigration", optionId: "encourage" });
  state = commitMonth(state);
  const report = state.pendingMonthReport ?? state.monthlyReports[0];
  const policy = report.actions.find((action) => action.kind === "policy" && action.policyId === "immigration");
  assert.ok(policy.creedPolitics);
  assert.ok(policy.creedPolitics.opposedFactions.includes("landowners"));
  assert.ok(state.cities.orta.factions.landowners.support < startingLandownerSupport);
  assert.ok(state.cities.orta.creed.institutional.axes.raceView.value < startingInstitution);
  assert.equal(state.cities.orta.creed.policyDebates[0].policyId, "immigration");
});

test("existing political AI adds creedModifier without replacing interests or loyalty", () => {
  const state = createInitialState();
  state.officers.mara.creed.axes.raceView = { value: -90, importance: 1 };
  state.officers.gaius.creed.axes.raceView = { value: 90, importance: 1 };
  const reactions = applyOfficerCommandPolitics({ characters: {
    edras: { name: "エドラス" }, mara: { name: "マーラ" }, gaius: { name: "ガイウス" }, sera: { name: "セラ" },
  } }, state, {
    officerId: "edras", commandId: "ideological_test",
    creedEffects: [{ id: "raceView", direction: -1, relevance: 1 }],
  }, 80);
  const mara = reactions.find((reaction) => reaction.officerId === "mara");
  const gaius = reactions.find((reaction) => reaction.officerId === "gaius");
  assert.ok(mara.creedModifier > 0);
  assert.ok(gaius.creedModifier < 0);
  assert.equal(mara.interestDisposition, 0);
  assert.ok(state.officers.mara.loyalty > 76);
  assert.ok(state.officers.gaius.loyalty < 79);
});
