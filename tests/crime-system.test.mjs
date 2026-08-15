import test from "node:test";
import assert from "node:assert/strict";
import {
  CRIME_HEAT_GAINS,
  CRIME_OUTCOMES,
  CRIME_SCHEMA_VERSION,
  advanceCareerMonth,
  advanceCrimeMonth,
  createCareerInitialState,
  discoverUnderworldContacts,
  fenceStolenItem,
  getCrimeStatusView,
  normalizeCareerState,
  normalizeCrimeState,
  previewCrimeRisk,
  recordCrimeIncident,
  resolveAccompliceDecision,
  resolveCrimeSentence,
} from "../src/simulation.js";

function baseState(overrides = {}) {
  return {
    year: 317,
    month: 4,
    turn: 0,
    player: {
      id: "player",
      locationId: "orta",
      stage: "individual",
      sovereign: false,
      affiliation: { nationId: null },
      metrics: {
        wealth: 10,
        renown: 12,
        liegeTrust: 30,
        legitimacy: 60,
        popularSupport: 50,
        householdSupport: 40,
      },
      regionalReputation: { schemaVersion: 1, achievements: [{ id: "heroic", renown: 8 }] },
      ...overrides,
    },
  };
}

function incident(overrides = {}) {
  return {
    type: "theft",
    severity: "minor",
    perpetrator: { id: "player", name: "試験者" },
    accomplices: [{ id: "ally", name: "協力者" }],
    victim: { id: "merchant", name: "商人" },
    target: { id: "cargo", name: "荷箱" },
    jurisdiction: { id: "orta", name: "オルタ" },
    reward: { wealth: 3, text: "銀貨と宝飾" },
    outcome: "success_hidden",
    detected: false,
    historyText: "商人の荷箱から宝飾を盗んだ。",
    ...overrides,
  };
}

test("legacy career saves gain an empty versioned crime state without losing player data", () => {
  const state = baseState({ name: "旧い英雄", customField: { preserved: true } });
  const original = structuredClone(state);
  const normalized = normalizeCrimeState(state);
  assert.equal(normalized, state);
  assert.equal(state.player.name, original.player.name);
  assert.deepEqual(state.player.customField, original.player.customField);
  assert.equal(state.player.crime.schemaVersion, CRIME_SCHEMA_VERSION);
  assert.deepEqual(state.player.crime.incidents, []);
  assert.deepEqual(state.player.crime.heatByJurisdiction, {});
});

test("all crime heat gains and heat-label boundaries are exact", () => {
  assert.deepEqual(CRIME_HEAT_GAINS, {
    theft: 15,
    smuggling: 20,
    extortion: 25,
    robbery: 35,
    sabotage: 45,
    assassination: 70,
  });
  for (const [heat, label] of [[0, "平常"], [19, "平常"], [20, "警戒"], [39, "警戒"], [40, "指名手配"], [69, "指名手配"], [70, "厳戒"], [100, "厳戒"]]) {
    const state = baseState();
    normalizeCrimeState(state);
    state.player.crime.heatByJurisdiction.orta = heat;
    assert.equal(getCrimeStatusView(state, { jurisdictionId: "orta" }).heatLabel, label);
  }
  assert.equal(previewCrimeRisk({ type: "robbery", currentHeat: 10 }).projectedHeat, 45);
});

test("all four outcomes record exactly and only detected incidents add heat", () => {
  assert.deepEqual(CRIME_OUTCOMES, ["success_hidden", "success_exposed", "failed_escaped", "captured"]);
  let state = baseState();
  for (const outcome of CRIME_OUTCOMES) {
    state = recordCrimeIncident(state, incident({ outcome, detected: outcome !== "success_hidden" }));
  }
  assert.deepEqual(state.player.crime.incidents.map((entry) => entry.outcome), CRIME_OUTCOMES);
  assert.equal(state.player.crime.heatByJurisdiction.orta, 45);
  assert.equal(state.player.crime.incidents[0].historyText, "商人の荷箱から宝飾を盗んだ。");
  assert.notEqual(state.player.crime.incidents[0].perpetrator, incident().perpetrator);
});

test("recording crime is immutable and never decreases or rewrites positive reputation", () => {
  const state = baseState();
  const reputation = structuredClone(state.player.regionalReputation);
  const next = recordCrimeIncident(state, incident({ detected: true, outcome: "success_exposed" }));
  assert.notEqual(next, state);
  assert.deepEqual(next.player.regionalReputation, reputation);
  assert.deepEqual(state.player.regionalReputation, reputation);
  assert.equal(next.player.metrics.renown, 12);
});

test("minor heat decays after two quiet outside months and serious/capital floors remain", () => {
  let minor = recordCrimeIncident(baseState({ locationId: "nereia" }), incident({ detected: true }));
  minor = advanceCrimeMonth(minor);
  assert.equal(getCrimeStatusView(minor, { jurisdictionId: "orta" }).heat, 15);
  minor = advanceCrimeMonth(minor);
  assert.equal(getCrimeStatusView(minor, { jurisdictionId: "orta" }).heat, 10);
  minor = advanceCrimeMonth(minor);
  assert.equal(getCrimeStatusView(minor, { jurisdictionId: "orta" }).heat, 5);

  let serious = recordCrimeIncident(baseState({ locationId: "nereia" }), incident({ type: "sabotage", severity: "serious", detected: true }));
  for (let count = 0; count < 5; count += 1) serious = advanceCrimeMonth(serious);
  assert.equal(getCrimeStatusView(serious, { jurisdictionId: "orta" }).heat, 40);

  let capital = recordCrimeIncident(baseState({ locationId: "nereia" }), incident({ type: "assassination", severity: "capital", detected: true }));
  for (let count = 0; count < 5; count += 1) capital = advanceCrimeMonth(capital);
  assert.equal(getCrimeStatusView(capital, { jurisdictionId: "orta" }).heat, 70);
});

test("wealth 1 discovers local fence, smuggler, and broker while insufficient wealth rejects immutably", () => {
  const state = baseState({ metrics: { wealth: 1 } });
  const next = discoverUnderworldContacts(state, { jurisdictionId: "orta", jurisdictionName: "オルタ" });
  assert.equal(next.player.metrics.wealth, 0);
  assert.deepEqual(next.player.crime.contacts.map((contact) => contact.role), ["fence", "smuggler", "broker"]);
  assert.ok(next.player.crime.contacts.every((contact) => contact.jurisdictionId === "orta"));
  assert.equal(state.player.metrics.wealth, 1);

  const poor = baseState({ metrics: { wealth: 0 } });
  const snapshot = structuredClone(poor);
  assert.throws(() => discoverUnderworldContacts(poor, { jurisdictionId: "orta" }), /資金が足りません/);
  assert.deepEqual(poor, snapshot);
});

test("fencing requires a discovered local fence, removes the stolen item, and pays exactly 40 percent", () => {
  const state = baseState({ metrics: { wealth: 2 } });
  normalizeCrimeState(state);
  state.player.crime.stolenItems.push({ id: "ruby", name: "紅玉", normalValue: 15, jurisdictionId: "orta" });
  assert.throws(() => fenceStolenItem(state, { itemId: "ruby", jurisdictionId: "orta" }), /故買屋/);
  const connected = discoverUnderworldContacts(state, { jurisdictionId: "orta" });
  const fenced = fenceStolenItem(connected, { itemId: "ruby", jurisdictionId: "orta" });
  assert.equal(fenced.player.metrics.wealth, 7);
  assert.deepEqual(fenced.player.crime.stolenItems, []);
  assert.equal(fenced.player.crime.fencedTransactions[0].proceeds, 6);
  assert.equal(connected.player.crime.stolenItems.length, 1);
});

test("safehouses unlock at local contact trust 20 and not below", () => {
  const state = discoverUnderworldContacts(baseState(), { jurisdictionId: "orta" });
  state.player.crime.contacts[0].trust = 19;
  assert.equal(getCrimeStatusView(state, { jurisdictionId: "orta" }).safehouseAvailable, false);
  state.player.crime.contacts[0].trust = 20;
  assert.equal(getCrimeStatusView(state, { jurisdictionId: "orta" }).safehouseAvailable, true);
  assert.equal(getCrimeStatusView(state, { jurisdictionId: "nereia" }).safehouseAvailable, false);
});

test("accomplice accept, refuse, and report decisions persist consequences immutably", () => {
  const consequences = { accept: "joined", refuse: "withdrew", report: "reported" };
  for (const decision of Object.keys(consequences)) {
    const state = baseState();
    const next = resolveAccompliceDecision(state, { accompliceId: "ally", accompliceName: "協力者", decision, jurisdictionId: "orta" });
    assert.equal(next.player.crime.accompliceDecisions[0].decision, decision);
    assert.equal(next.player.crime.accompliceDecisions[0].consequence, consequences[decision]);
    assert.equal(state.player.crime, undefined);
  }
});

test("minor and serious sentences confiscate gain, apply consequences, and advance deterministic time", () => {
  let minor = baseState({ metrics: { wealth: 20, liegeTrust: 30 } });
  normalizeCrimeState(minor);
  minor.player.crime.illegalGain = 4;
  minor = resolveCrimeSentence(minor, { severity: "minor", fine: 3, jurisdictionId: "orta" });
  assert.equal(minor.player.metrics.wealth, 13);
  assert.equal(minor.player.crime.illegalGain, 0);
  assert.deepEqual([minor.year, minor.month, minor.turn], [317, 5, 1]);

  let serious = baseState({ stage: "commander", metrics: { wealth: 30, liegeTrust: 30 } });
  normalizeCrimeState(serious);
  serious.player.crime.illegalGain = 5;
  const first = resolveCrimeSentence(serious, { severity: "serious", fine: 4, jurisdictionId: "orta" });
  const second = resolveCrimeSentence(serious, { severity: "serious", fine: 4, jurisdictionId: "orta" });
  assert.equal(first.player.crime.sentences[0].months, second.player.crime.sentences[0].months);
  assert.ok(first.player.crime.sentences[0].months >= 3 && first.player.crime.sentences[0].months <= 12);
  assert.equal(first.turn, first.player.crime.sentences[0].months);
  assert.equal(first.player.stage, "retainer");
  assert.equal(first.player.metrics.liegeTrust, 20);
  assert.equal(first.player.metrics.wealth, 21);
});

test("assassination capture ends the run with a capital sentence", () => {
  const state = resolveCrimeSentence(baseState(), { severity: "capital", crimeType: "assassination", jurisdictionId: "orta" });
  assert.equal(state.player.crime.runEnded, true);
  assert.equal(state.player.crime.ending, "capital_sentence");
  assert.equal(state.player.crime.sentences[0].sentence, "capital");
});

test("detected domestic sovereign crime becomes abuse of power while foreign handling remains criminal", () => {
  const sovereign = baseState({
    sovereign: true,
    stage: "independent_ruler",
    affiliation: { nationId: "selena" },
    metrics: { wealth: 20, legitimacy: 60, popularSupport: 50, householdSupport: 40, liegeTrust: 0 },
  });
  const domestic = resolveCrimeSentence(sovereign, { severity: "serious", jurisdictionId: "selena", domestic: true });
  assert.equal(domestic.player.stage, "independent_ruler");
  assert.equal(domestic.player.crime.sentences.length, 0);
  assert.equal(domestic.player.crime.abuses.length, 1);
  assert.ok(domestic.player.metrics.legitimacy < 60);
  assert.ok(domestic.player.metrics.popularSupport < 50);
  assert.ok(domestic.player.metrics.householdSupport < 40);
  assert.deepEqual([domestic.year, domestic.month, domestic.turn], [317, 4, 0]);

  const foreign = resolveCrimeSentence(sovereign, { severity: "serious", jurisdictionId: "valka", domestic: false });
  assert.equal(foreign.player.crime.sentences.length, 1);
  assert.ok(foreign.turn >= 3);
});

test("career creation, career normalization, and monthly advancement preserve and update crime state", () => {
  const created = createCareerInitialState({ seed: "crime-foundation" });
  assert.equal(created.player.crime.schemaVersion, CRIME_SCHEMA_VERSION);
  const legacy = structuredClone(created);
  delete legacy.player.crime;
  normalizeCareerState(legacy);
  assert.equal(legacy.player.crime.schemaVersion, CRIME_SCHEMA_VERSION);

  let wanted = recordCrimeIncident(created, incident({ detected: true }));
  wanted.player.locationId = "nereia";
  const advancedOnce = advanceCareerMonth(wanted);
  const advancedTwice = advanceCareerMonth(advancedOnce);
  assert.equal(advancedOnce.player.crime.heatByJurisdiction.orta, 15);
  assert.equal(advancedTwice.player.crime.heatByJurisdiction.orta, 10);
});
