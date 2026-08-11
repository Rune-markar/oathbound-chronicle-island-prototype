import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceBarbarianWorld,
  createBarbarianWorldState,
  establishBarbarianAgreement,
} from "../src/barbarian-system.js";
import {
  advanceGeneratedWorldBarbarians,
  getGeneratedBarbarianView,
  getGeneratedWorldView,
  setGeneratedBarbarianAgreement,
} from "../src/generated-world-system.js";
import { advanceCareerMonth, createCareerInitialState } from "../src/simulation.js";

function createTestState(seed = "barbarian-frontier-contract") {
  return createCareerInitialState({ seed, width: 48, height: 32, plateCount: 9, nationCount: 7 });
}

function isolatedState(source, site) {
  return {
    ...source,
    lastAdvancedPeriod: null,
    sites: [structuredClone(site)],
    events: [],
  };
}

test("generated worlds store deterministic compact monster nests and intelligent barbarian settlements", () => {
  const first = createTestState();
  const second = createTestState();
  const view = getGeneratedBarbarianView(first);
  assert.deepEqual(first.generatedWorld.barbarians, second.generatedWorld.barbarians);
  assert.equal(first.generatedWorld.version, 12);
  assert.equal(first.generatedWorld.barbarians.schemaVersion, 1);
  assert.ok(view.sites.length >= 2);
  assert.ok(view.sites.some((site) => site.kind === "monster_nest"));
  assert.ok(view.sites.some((site) => site.kind === "intelligent_barbarians"));
  assert.equal(JSON.stringify(first.generatedWorld.barbarians).includes("tiles"), false);
  assert.equal(JSON.stringify(first.generatedWorld.barbarians).includes("terrain"), false);
});

test("monster nests inflict real settlement population losses once per month", () => {
  const state = createTestState("barbarian-damage-contract");
  const beforePopulation = structuredClone(state.generatedWorld.regionalDomains.settlementStates);
  const advanced = advanceGeneratedWorldBarbarians(state);
  const period = advanced.generatedWorld.barbarians.lastAdvancedPeriod;
  const damage = advanced.generatedWorld.barbarians.events.find((event) => event.period === period && event.type === "monster_damage" && event.impacts.length);
  assert.ok(damage, "at least one monster nest should reach a nearby settlement");
  for (const impact of damage.impacts) {
    assert.equal(
      advanced.generatedWorld.regionalDomains.settlementStates[impact.settlementId].population,
      beforePopulation[impact.settlementId].population - impact.populationLoss,
    );
  }
  const repeated = advanceGeneratedWorldBarbarians(advanced);
  for (const impact of damage.impacts) {
    assert.equal(
      repeated.generatedWorld.regionalDomains.settlementStates[impact.settlementId].population,
      advanced.generatedWorld.regionalDomains.settlementStates[impact.settlementId].population,
      "re-entering the same period must not apply damage twice",
    );
  }
});

test("failed suppression escalates strictly from village to town and then national command", () => {
  const campaign = createTestState("barbarian-escalation-contract");
  const { runtime } = getGeneratedWorldView(campaign);
  const baseline = createBarbarianWorldState(runtime, campaign.generatedWorld.barbarians, campaign);
  const monster = baseline.sites.find((site) => site.kind === "monster_nest");
  let frontier = isolatedState(baseline, {
    ...monster,
    detected: true,
    strength: 300,
    responseLevel: "village",
    responseCooldownMonths: 0,
  });
  frontier = advanceBarbarianWorld(runtime, frontier, { year: 317, month: 5 }, { geopolitics: campaign.generatedWorld.geopolitics });
  let response = frontier.events.find((event) => event.siteId === monster.id && event.type === "barbarian_response");
  assert.equal(response.responseLevel, "village");
  assert.equal(response.outcome, "failed");
  assert.equal(frontier.sites[0].responseLevel, "town");

  frontier = advanceBarbarianWorld(runtime, frontier, { year: 317, month: 6 }, { geopolitics: campaign.generatedWorld.geopolitics });
  frontier = advanceBarbarianWorld(runtime, frontier, { year: 317, month: 7 }, { geopolitics: campaign.generatedWorld.geopolitics });
  frontier = advanceBarbarianWorld(runtime, frontier, { year: 317, month: 8 }, { geopolitics: campaign.generatedWorld.geopolitics });
  response = frontier.events.find((event) => event.period === "317-8" && event.siteId === monster.id && event.type === "barbarian_response");
  assert.equal(response.responseLevel, "town");
  assert.equal(response.outcome, "failed");
  assert.equal(frontier.sites[0].responseLevel, "nation");
});

test("undiscovered intelligent barbarians develop from village to town and city-state", () => {
  const campaign = createTestState("barbarian-development-contract");
  const { runtime } = getGeneratedWorldView(campaign);
  const baseline = createBarbarianWorldState(runtime, campaign.generatedWorld.barbarians, campaign);
  const intelligent = baseline.sites.find((site) => site.kind === "intelligent_barbarians");
  let frontier = isolatedState(baseline, {
    ...intelligent,
    detected: false,
    detectionMonthsRemaining: 120,
    settlementLevel: "village",
    stageMonths: 3,
  });
  frontier = advanceBarbarianWorld(runtime, frontier, { year: 317, month: 5 }, { geopolitics: campaign.generatedWorld.geopolitics });
  assert.equal(frontier.sites[0].settlementLevel, "town");
  assert.equal(frontier.sites[0].status, "active");
  assert.equal(frontier.events.some((event) => event.type === "barbarian_development" && event.toLevel === "town"), true);

  frontier.sites[0].stageMonths = 7;
  frontier = advanceBarbarianWorld(runtime, frontier, { year: 317, month: 6 }, { geopolitics: campaign.generatedWorld.geopolitics });
  assert.equal(frontier.sites[0].settlementLevel, "city");
  assert.equal(frontier.sites[0].status, "city_state");
  assert.ok(frontier.sites[0].cityStateId);
  assert.equal(frontier.events.some((event) => event.type === "barbarian_development" && event.toLevel === "city"), true);
});

test("tribute and non-aggression agreements exempt a barbarian city-state from suppression", () => {
  const campaign = createTestState("barbarian-agreement-contract");
  const { runtime } = getGeneratedWorldView(campaign);
  const baseline = createBarbarianWorldState(runtime, campaign.generatedWorld.barbarians, campaign);
  const intelligent = baseline.sites.find((site) => site.kind === "intelligent_barbarians");
  const cityState = isolatedState(baseline, {
    ...intelligent,
    detected: true,
    settlementLevel: "city",
    status: "city_state",
    responseLevel: "nation",
    responseCooldownMonths: 0,
    strength: 300,
  });

  let tribute = establishBarbarianAgreement(runtime, cityState, intelligent.id, "tribute", intelligent.hostNationId, { year: 317, month: 4 });
  tribute = advanceBarbarianWorld(runtime, tribute, { year: 317, month: 5 }, { geopolitics: campaign.generatedWorld.geopolitics });
  assert.equal(tribute.sites[0].status, "city_state");
  assert.equal(tribute.events.some((event) => event.period === "317-5" && event.type === "barbarian_tribute"), true);
  assert.equal(tribute.events.some((event) => event.period === "317-5" && event.type === "barbarian_response"), false);

  let truce = establishBarbarianAgreement(runtime, cityState, intelligent.id, "non_aggression", intelligent.hostNationId, { year: 317, month: 4 });
  truce = advanceBarbarianWorld(runtime, truce, { year: 317, month: 5 }, { geopolitics: campaign.generatedWorld.geopolitics });
  assert.equal(truce.sites[0].status, "city_state");
  assert.equal(truce.sites[0].agreement.type, "non_aggression");
  assert.equal(truce.sites[0].agreement.monthsRemaining, 11);
  assert.equal(truce.events.some((event) => event.period === "317-5" && event.type === "barbarian_response"), false);
});

test("monthly advancement publishes frontier damage and response events to the campaign log", () => {
  const advanced = advanceCareerMonth(createTestState("barbarian-monthly-log-contract"));
  const period = advanced.generatedWorld.barbarians.lastAdvancedPeriod;
  const events = advanced.generatedWorld.barbarians.events.filter((event) => event.period === period);
  assert.ok(events.length > 0);
  assert.ok(events.some((event) => event.type === "monster_damage"));
  assert.ok(events.every((event) => advanced.log.some((entry) => entry.scope === "辺境" && entry.title === event.title && entry.text === event.summary)));
});

test("the generated-world agreement API converts tribute into national reserves", () => {
  let state = createTestState("barbarian-tribute-reserve-contract");
  const intelligent = state.generatedWorld.barbarians.sites.find((site) => site.kind === "intelligent_barbarians");
  assert.ok(intelligent.hostNationId);
  state.generatedWorld.barbarians = {
    ...state.generatedWorld.barbarians,
    sites: state.generatedWorld.barbarians.sites.map((site) => site.id === intelligent.id ? {
      ...site,
      detected: true,
      settlementLevel: "city",
      status: "city_state",
      responseLevel: "nation",
      responseCooldownMonths: 0,
    } : site),
  };
  state.generatedWorld.geopolitics.nationStates[intelligent.hostNationId].reserves = 50;
  state = setGeneratedBarbarianAgreement(state, intelligent.id, "tribute", intelligent.hostNationId);
  const advanced = advanceGeneratedWorldBarbarians({ ...state, month: state.month + 1 });
  assert.equal(advanced.generatedWorld.geopolitics.nationStates[intelligent.hostNationId].reserves, 51);
  assert.equal(advanced.generatedWorld.barbarians.sites.find((site) => site.id === intelligent.id).status, "city_state");
});
