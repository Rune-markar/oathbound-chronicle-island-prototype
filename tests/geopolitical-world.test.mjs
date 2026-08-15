import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceGeneratedWorldGeopolitics,
  getGeneratedGeopoliticalView,
  getGeneratedWorldView,
} from "../src/generated-world-system.js";
import {
  GEOPOLITICAL_MODEL_REFERENCES,
  GEOPOLITICAL_PULL_SET,
  GEOPOLITICAL_SCHEMA_VERSION,
  advanceGeopoliticalWorld,
  deriveGeopoliticalProfiles,
} from "../src/geopolitical-world.js";
import { advanceCareerMonth, createCareerInitialState } from "../src/simulation.js";

function createWorld(seed = "geopolitics-contract") {
  return createCareerInitialState({ seed, width: 48, height: 32, plateCount: 9, nationCount: 7 });
}

function advanceWorldMonth(state) {
  const nextMonth = state.month === 12 ? 1 : state.month + 1;
  const nextYear = state.month === 12 ? state.year + 1 : state.year;
  return advanceGeneratedWorldGeopolitics({ ...state, year: nextYear, month: nextMonth });
}

function relationKey(leftId, rightId) {
  return [leftId, rightId].sort().join(":");
}

test("a generated world initializes a compact autonomous geopolitical state", () => {
  const state = createWorld();
  const view = getGeneratedGeopoliticalView(state);
  const nationCount = view.nations.length;
  assert.equal(state.generatedWorld.geopolitics.schemaVersion, GEOPOLITICAL_SCHEMA_VERSION);
  assert.equal(Object.keys(state.generatedWorld.geopolitics.nationStates).length, nationCount);
  assert.equal(Object.keys(state.generatedWorld.geopolitics.relations).length, nationCount * (nationCount - 1) / 2);
  assert.equal(state.generatedWorld.geopolitics.events.length, 0);
  assert.equal(JSON.stringify(state.generatedWorld.geopolitics).includes("tiles"), false);
  assert.ok(view.nations.every((entry) => entry.profile.capability >= 0 && entry.condition.foodSecurity >= 0));
  assert.ok(GEOPOLITICAL_MODEL_REFERENCES.every((reference) => reference.url.startsWith("https://")));
});

test("every nation selects one geography-grounded pull on each new month", () => {
  const state = createWorld("monthly-national-pulls");
  const advanced = advanceCareerMonth(state);
  const view = getGeneratedGeopoliticalView(advanced);
  const currentEvents = view.events.filter((event) => event.period === `${advanced.year}-${advanced.month}`);
  assert.equal(currentEvents.length, view.nations.length);
  assert.equal(new Set(currentEvents.map((event) => event.nationId)).size, view.nations.length);
  assert.ok(currentEvents.every((event) => GEOPOLITICAL_PULL_SET[event.pullId]));
  assert.ok(currentEvents.every((event) => event.drivers.length >= 1));
  assert.ok(view.nations.every((entry) => entry.condition.lastPullId));
  assert.equal(view.relations.some((relation) => relation.atWar), false, "a generated world must not jump directly into war on its first pulse");
});

test("national decisions are deterministic for the same world and period", () => {
  const first = advanceCareerMonth(createWorld("deterministic-geopolitics"));
  const second = advanceCareerMonth(createWorld("deterministic-geopolitics"));
  assert.deepEqual(first.generatedWorld.geopolitics, second.generatedWorld.geopolitics);
  const duplicate = advanceGeneratedWorldGeopolitics(first);
  assert.deepEqual(duplicate.generatedWorld.geopolitics, first.generatedWorld.geopolitics);
});

test("a unilateral ceasefire request remains an offer until the opponent accepts", () => {
  let state = createWorld("ceasefire-consent-contract");
  const relationEntry = Object.entries(state.generatedWorld.geopolitics.relations)[0];
  const [key, relation] = relationEntry;
  const [seekerId, opponentId] = key.split(":");
  state.generatedWorld.geopolitics.relations[key] = {
    ...relation,
    relation: -60,
    tension: 92,
    atWar: true,
    warMonths: 6,
  };
  state.generatedWorld.geopolitics.nationStates[seekerId] = {
    ...state.generatedWorld.geopolitics.nationStates[seekerId],
    readiness: 10,
    cohesion: 10,
    foodSecurity: 10,
  };
  state.generatedWorld.geopolitics.nationStates[opponentId] = {
    ...state.generatedWorld.geopolitics.nationStates[opponentId],
    readiness: 90,
    cohesion: 90,
    foodSecurity: 90,
  };

  state = advanceWorldMonth(state);
  let currentEvents = state.generatedWorld.geopolitics.events.filter((event) => event.period === state.generatedWorld.geopolitics.lastAdvancedPeriod);
  assert.equal(currentEvents.find((event) => event.nationId === seekerId).pullId, "seek_ceasefire");
  assert.equal(currentEvents.find((event) => event.nationId === opponentId).pullId, "sustain_war");
  assert.equal(state.generatedWorld.geopolitics.relations[key].atWar, true);
  assert.deepEqual(state.generatedWorld.geopolitics.relations[key].ceasefireOffer, {
    from: seekerId,
    to: opponentId,
    monthsRemaining: 3,
  });

  state.generatedWorld.geopolitics.nationStates[opponentId] = {
    ...state.generatedWorld.geopolitics.nationStates[opponentId],
    readiness: 10,
    cohesion: 10,
    foodSecurity: 10,
  };
  state = advanceWorldMonth(state);
  currentEvents = state.generatedWorld.geopolitics.events.filter((event) => event.period === state.generatedWorld.geopolitics.lastAdvancedPeriod);
  assert.equal(currentEvents.find((event) => event.nationId === opponentId).pullId, "accept_ceasefire");
  assert.equal(state.generatedWorld.geopolitics.relations[key].atWar, false);
  assert.equal(state.generatedWorld.geopolitics.relations[key].truceMonths, 12);
  assert.equal(state.generatedWorld.geopolitics.relations[key].ceasefireOffer, null);
});

test("a player-controlled nation keeps defending but defers an irreversible ceasefire decision", () => {
  const state = createWorld("protected-peace-contract");
  const runtime = getGeneratedWorldView(state).runtime;
  const snapshot = structuredClone(state.generatedWorld.geopolitics);
  const [key] = Object.keys(snapshot.relations);
  const [playerNationId, opponentId] = key.split(":");
  snapshot.relations[key] = { ...snapshot.relations[key], relation: -60, tension: 92, atWar: true, warMonths: 8 };
  snapshot.nationStates[playerNationId] = {
    ...snapshot.nationStates[playerNationId], readiness: 10, cohesion: 10, foodSecurity: 10,
  };
  const advanced = advanceGeopoliticalWorld(runtime, snapshot, { year: 317, month: 5 }, {
    protectedNationIds: [playerNationId],
  });
  const playerEvent = advanced.events.find((event) => event.period === "317-5" && event.nationId === playerNationId);

  assert.equal(playerEvent.pullId, "sustain_war");
  assert.equal(advanced.relations[key].atWar, true);
  assert.equal(advanced.pendingStrategicDecisions[0].pullId, "seek_ceasefire");
  assert.equal(advanced.pendingStrategicDecisions[0].targetNationId, opponentId);
});

test("an alliance proposal needs a reciprocal decision and enforces both nations' caps", () => {
  let proposalState = createWorld("proposal-check-1");
  const before = structuredClone(proposalState.generatedWorld.geopolitics.relations);
  proposalState = advanceWorldMonth(proposalState);
  const proposalEvents = proposalState.generatedWorld.geopolitics.events.filter((event) => (
    event.period === proposalState.generatedWorld.geopolitics.lastAdvancedPeriod && event.pullId === "seek_alignment"
  ));
  const unilateral = proposalEvents.find((event) => {
    const counterpart = proposalEvents.find((candidate) => candidate.nationId === event.targetNationId && candidate.targetNationId === event.nationId);
    return !counterpart && !before[relationKey(event.nationId, event.targetNationId)].allied;
  });
  assert.ok(unilateral);
  const proposalKey = relationKey(unilateral.nationId, unilateral.targetNationId);
  assert.equal(proposalState.generatedWorld.geopolitics.relations[proposalKey].allied, false);
  assert.deepEqual(proposalState.generatedWorld.geopolitics.relations[proposalKey].alignmentOffer, {
    from: unilateral.nationId,
    to: unilateral.targetNationId,
    monthsRemaining: 3,
  });
  const sharedThreat = getGeneratedGeopoliticalView(proposalState).nations
    .filter((entry) => ![unilateral.nationId, unilateral.targetNationId].includes(entry.nation.id))
    .sort((left, right) => right.profile.capability - left.profile.capability)[0].nation.id;
  proposalState.generatedWorld.geopolitics.relations[proposalKey] = {
    ...proposalState.generatedWorld.geopolitics.relations[proposalKey],
    relation: 30,
    tension: 10,
  };
  for (const pair of [
    relationKey(unilateral.nationId, sharedThreat),
    relationKey(unilateral.targetNationId, sharedThreat),
  ]) {
    proposalState.generatedWorld.geopolitics.relations[pair] = {
      ...proposalState.generatedWorld.geopolitics.relations[pair],
      relation: -70,
      tension: 90,
    };
  }
  proposalState = advanceWorldMonth(proposalState);
  const acceptance = proposalState.generatedWorld.geopolitics.events.find((event) => (
    event.period === proposalState.generatedWorld.geopolitics.lastAdvancedPeriod
    && event.nationId === unilateral.targetNationId
  ));
  assert.equal(acceptance.pullId, "accept_alignment");
  assert.equal(proposalState.generatedWorld.geopolitics.relations[proposalKey].allied, true);
  assert.equal(proposalState.generatedWorld.geopolitics.relations[proposalKey].alignmentOffer, null);

  let cappedState = createWorld("alliance-cap-contract");
  for (let month = 0; month < 120; month += 1) {
    cappedState = advanceWorldMonth(cappedState);
    const counts = Object.fromEntries(Object.keys(cappedState.generatedWorld.geopolitics.nationStates).map((nationId) => [nationId, 0]));
    for (const [key, current] of Object.entries(cappedState.generatedWorld.geopolitics.relations)) {
      if (current.allied) key.split(":").forEach((nationId) => { counts[nationId] += 1; });
    }
    assert.ok(Object.values(counts).every((count) => count <= 2));
  }
});

test("alliance tension is visible instead of being hidden by the alliance label", () => {
  const state = createWorld("alliance-crisis-contract");
  const key = Object.keys(state.generatedWorld.geopolitics.relations)[0];
  state.generatedWorld.geopolitics.relations[key] = {
    ...state.generatedWorld.geopolitics.relations[key],
    relation: 48,
    tension: 55,
    allied: true,
  };
  const relation = getGeneratedGeopoliticalView(state).relations.find((entry) => entry.key === key);
  assert.equal(relation.status, "緊張同盟");
});

test("absolute national indicators do not turn a one-unit difference into a 100-to-30 gap", () => {
  const runtime = getGeneratedWorldView(createWorld("absolute-profile-contract")).runtime;
  const template = runtime.nations.nations[0];
  const almostEqualRuntime = {
    nations: {
      nations: [
        { ...template, id: "equal-a", yields: { ...template.yields } },
        { ...template, id: "equal-b", populationPotential: template.populationPotential + 1, yields: { ...template.yields } },
      ],
      borderSegments: [],
    },
  };
  const profiles = deriveGeopoliticalProfiles(almostEqualRuntime);
  assert.ok(Math.abs(profiles["equal-a"].capability - profiles["equal-b"].capability) <= 1);
  assert.ok(Math.abs(profiles["equal-a"].foodBase - profiles["equal-b"].foodBase) <= 1);
  assert.notDeepEqual([profiles["equal-a"].capability, profiles["equal-b"].capability], [30, 100]);
});

test("the unaffiliated player's abilities, selected nation, and expedition position never enter national decisions", () => {
  const baseline = createWorld("player-independent-world");
  const altered = structuredClone(baseline);
  const runtime = getGeneratedWorldView(altered).runtime;
  const otherNation = runtime.nations.nations.find((nation) => nation.id !== altered.generatedWorld.playerNationId);
  const otherRegion = runtime.nations.regions.find((region) => region.nationId === otherNation.id);
  altered.player = {
    ...altered.player,
    name: "世界を動かせない在野人",
    stage: "individual",
    renown: 100,
    influence: 100,
    wealth: 100,
    martial: 100,
    stewardship: 100,
    intrigue: 100,
  };
  altered.generatedWorld.playerNationId = otherNation.id;
  altered.generatedWorld.expeditionRegionId = otherRegion.id;
  altered.generatedWorld.selectedRegionId = otherRegion.id;
  altered.generatedWorld.discoveredRegionIds = [otherRegion.id];

  const baselineNext = advanceCareerMonth(baseline);
  const alteredNext = advanceCareerMonth(altered);
  assert.deepEqual(alteredNext.generatedWorld.geopolitics, baselineNext.generatedWorld.geopolitics);
});

test("pair structures expose contiguity, natural barriers, distance, and gravity-based trade potential", () => {
  const view = getGeneratedGeopoliticalView(createWorld("geographic-signals"));
  const adjacent = view.relations.filter((relation) => relation.structure.sharedBorder > 0);
  const distant = view.relations.filter((relation) => relation.structure.sharedBorder === 0);
  assert.ok(adjacent.length > 0);
  assert.ok(distant.length > 0);
  assert.ok(adjacent.every((relation) => relation.structure.permeability >= 0 && relation.structure.permeability <= 100));
  assert.ok(view.relations.every((relation) => relation.structure.tradePotential >= 0 && relation.structure.tradePotential <= 100));
  assert.ok(view.relations.every((relation) => relation.structure.distanceRatio >= 0 && relation.structure.distanceRatio <= 1));
});

test("long-running world pulses keep internal and targeted actions valid", () => {
  let state = createWorld("long-running-geopolitics");
  const observedPulls = new Set();
  for (let month = 0; month < 36; month += 1) {
    state = advanceCareerMonth(state);
    state.generatedWorld.geopolitics.events
      .filter((event) => event.period === state.generatedWorld.geopolitics.lastAdvancedPeriod)
      .forEach((event) => observedPulls.add(event.pullId));
  }
  const events = state.generatedWorld.geopolitics.events;
  const targetedPulls = new Set([
    "open_trade", "diplomatic_overture", "seek_alignment", "accept_alignment", "fortify_frontier", "mobilize",
    "deescalate", "coerce_neighbor", "limited_war", "sustain_war", "seek_ceasefire", "accept_ceasefire",
  ]);
  assert.ok([...observedPulls].some((pullId) => ["consolidate", "secure_food"].includes(pullId)));
  assert.ok(events.filter((event) => targetedPulls.has(event.pullId)).every((event) => event.targetNationId));
  assert.ok(events.every((event) => event.summary && !event.summary.includes("undefined")));
});
