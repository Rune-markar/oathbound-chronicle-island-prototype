import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveCrimeEvent, resolveCrimeRecovery } from "../src/crime-system.js";

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const stylesSource = await readFile(new URL("../styles.css", import.meta.url), "utf8");

function stateWithCrime(overrides = {}) {
  return {
    turn: 8,
    year: 101,
    month: 4,
    generatedWorld: { expeditionRegionId: "west", selectedRegionId: "west" },
    player: {
      id: "player",
      name: "旅人",
      stage: "individual",
      locationId: "west",
      sovereign: false,
      affiliation: { nationId: null },
      metrics: { wealth: 20 },
      crime: {
        schemaVersion: 1,
        incidents: [{ id: "crime-1", type: "theft", severity: "minor", jurisdiction: { id: "west", name: "西境" }, resolved: false }],
        heatByJurisdiction: { west: 25 },
        quietMonthsOutside: {},
        contacts: [],
        stolenItems: [],
        fencedTransactions: [],
        extortionArrangements: [],
        robberyResults: [],
        activeRobbery: null,
        smugglingRecords: [],
        activeSmuggling: null,
        sabotageRecords: [],
        activeSabotage: null,
        assassinationRecords: [],
        activeAssassination: null,
        accompliceDecisions: [],
        sentences: [],
        abuses: [],
        abusePressureByJurisdiction: {},
        illegalGain: 0,
        monthsElapsed: 0,
        runEnded: false,
        ending: null,
        ...overrides,
      },
    },
  };
}

test("contextual UI imports public crime transitions and exposes all six entry points", () => {
  for (const name of [
    "getSettlementTheftOpportunities", "previewTheft", "executeTheft",
    "getSettlementExtortionOpportunities", "previewExtortion", "executeExtortion",
    "getRobberyOpportunities", "previewRobbery", "startRobbery", "resolveRobberyThreat",
    "resolveRobberyBattle",
    "getSmugglingOffers", "acceptSmugglingOffer", "inspectSmugglingCheckpoint", "deliverSmugglingCargo",
    "getSabotageTargets", "startSabotage", "prepareSabotage", "executeSabotage",
    "getAssassinationTargets", "startAssassination", "prepareAssassination", "executeAssassination",
    "getCrimeStatusView", "discoverUnderworldContacts", "fenceStolenItem", "resolveCrimeRecovery",
  ]) assert.match(appSource, new RegExp(`\\b${name}\\b`), name);

  for (const action of ["theft", "extortion", "robbery", "smuggling", "sabotage", "assassination"])
    assert.match(appSource, new RegExp(`(?:data-crime-action=["']${action}["']|crimePreviewCard\\(["']${action}["'])`), action);
});

test("crime previews name target and jurisdiction and show qualitative fields without percentages", () => {
  for (const label of ["対象", "管轄", "危険", "準備", "見込報酬", "最大刑罰"])
    assert.match(appSource, new RegExp(label));
  assert.doesNotMatch(appSource, /crime[^\n]{0,100}(?:%|確率)/i);
  assert.match(appSource, /data-crime-preview/);
  assert.match(appSource, /aria-expanded=/);
  assert.match(appSource, /aria-live=["']polite["']/);
  assert.match(appSource, /data-crime-accomplice/);
});

test("career crime board is closed by default and provides exact recovery controls", () => {
  assert.match(appSource, /<details class="crime-status-board"(?![^>]*\sopen)/);
  assert.match(appSource, /犯罪歴・手配・裏社会/);
  for (const action of ["surrender", "safehouse", "escape", "pardon", "asylum"])
    assert.match(appSource, new RegExp(`data-crime-recovery=["']${action}["']`), action);
  for (const label of ["盗品", "連絡先", "隠れ家", "密輸", "恐喝", "工作", "刑罰", "権力濫用"])
    assert.match(appSource, new RegExp(label));
});

test("crime controls have responsive styling and stable disabled-state treatment", () => {
  assert.match(stylesSource, /\.crime-context-section/);
  assert.match(stylesSource, /\.crime-status-board/);
  assert.match(stylesSource, /\[data-crime-action\][^}]*disabled|\[data-crime-action\]:disabled/s);
  assert.match(stylesSource, /@media[^}]*max-width/s);
});

test("safehouse recovery requires local trust 20 and remains immutable", () => {
  const original = stateWithCrime();
  const snapshot = structuredClone(original);
  assert.throws(() => resolveCrimeRecovery(original, { action: "safehouse", jurisdictionId: "west" }), /信頼20/);
  assert.deepEqual(original, snapshot);

  const eligible = stateWithCrime({ contacts: [{ id: "fence-west", jurisdictionId: "west", name: "古物商", trust: 20 }] });
  const next = resolveCrimeRecovery(eligible, { action: "safehouse", jurisdictionId: "west" });
  assert.notEqual(next, eligible);
  assert.equal(next.player.crime.recoveries[0].action, "safehouse");
  assert.deepEqual(eligible.player.crime.recoveries, undefined);
});

test("surrender, escape, pardon, and asylum are real immutable transitions", () => {
  const surrender = resolveCrimeRecovery(stateWithCrime(), { action: "surrender", jurisdictionId: "west", incidentId: "crime-1", severity: "minor" });
  assert.equal(surrender.player.crime.sentences[0].incidentId, "crime-1");

  const escaped = resolveCrimeRecovery(stateWithCrime(), { action: "escape", jurisdictionId: "west", destinationJurisdictionId: "east" });
  assert.equal(escaped.player.locationId, "east");
  assert.equal(escaped.generatedWorld.expeditionRegionId, "east");
  assert.equal(escaped.player.crime.recoveries[0].action, "escape");

  const sovereign = stateWithCrime();
  sovereign.player.sovereign = true;
  sovereign.player.governedJurisdictionIds = ["west"];
  const pardoned = resolveCrimeRecovery(sovereign, { action: "pardon", jurisdictionId: "west", governedJurisdictionIds: ["west"] });
  assert.equal(pardoned.player.crime.heatByJurisdiction.west, 0);
  assert.equal(pardoned.player.crime.incidents[0].resolved, true);
  assert.throws(() => resolveCrimeRecovery(sovereign, { action: "pardon", jurisdictionId: "east", governedJurisdictionIds: ["west"] }), /管轄/);
  assert.throws(() => resolveCrimeRecovery(stateWithCrime(), { action: "pardon", jurisdictionId: "west", governedJurisdictionIds: ["west"] }), /主権/);

  const asylum = resolveCrimeRecovery(stateWithCrime(), { action: "asylum", jurisdictionId: "west", destinationJurisdictionId: "north" });
  assert.equal(asylum.player.locationId, "north");
  assert.equal(asylum.generatedWorld.selectedRegionId, "north");
  assert.equal(asylum.player.crime.recoveries[0].status, "exile");
});

test("seeded crime events expose every outcome and accomplice decision without hidden defaults", () => {
  const outcomes = new Set();
  const decisions = new Set();
  for (let seed = 0; seed < 800; seed += 1) {
    const event = resolveCrimeEvent({ seed: `campaign-${seed}`, turn: 12, targetId: "target-1", preparation: 2, accompliceId: "ally" });
    outcomes.add(event.outcome);
    decisions.add(event.accompliceDecision);
  }
  assert.deepEqual([...outcomes].sort(), ["captured", "failed_escaped", "success_exposed", "success_hidden"]);
  assert.deepEqual([...decisions].sort(), ["accept", "refuse", "report"]);
  assert.match(appSource, /executeSabotage\(state,\s*\{\s*outcome:\s*currentCrimeEvent\(active\)\.outcome/);
  assert.match(appSource, /executeAssassination\(state,\s*\{\s*outcome:\s*currentCrimeEvent\(active\)\.outcome/);
  assert.match(appSource, /decision:\s*event\.accompliceDecision/);
});

test("resisted robbery opens the existing tactical lifecycle and resolves only on real result exit", () => {
  assert.match(appSource, /type:\s*["']robbery["']/);
  assert.match(appSource, /resolveRobberyBattle\(state,\s*battleResult/);
  assert.doesNotMatch(appSource, /autoResolveBattle\(threatened\.result\.battle\)/);
});

test("active smuggling, extortion variants, accomplices, and backed sabotage routes are rendered", () => {
  assert.match(appSource, /renderActiveSmuggling/);
  assert.match(appSource, /nextAction\s*=\s*atDestination\s*\?\s*["']deliver["']\s*:\s*route\s*\?\s*["']checkpoint["']/);
  assert.match(appSource, /data-smuggling-next=/);
  assert.match(appSource, /mode\s*===\s*["']recurring["']/);
  assert.match(appSource, /collectExtortionPayment/);
  assert.match(appSource, /data-extortion-collect/);
  assert.match(appSource, /data-sabotage-accomplice/);
  assert.match(appSource, /renderTravelSabotage/);
  assert.match(appSource, /renderSettlementSabotage/);
});

test("crime controls avoid false disclosure state and enforce local support prerequisites", () => {
  assert.doesNotMatch(appSource, /data-crime-action=[^>]*aria-expanded/);
  assert.match(appSource, /hasLocalFence/);
  assert.match(appSource, /allUnderworldRolesKnown/);
  assert.match(appSource, /metrics\.wealth\s*<\s*1|metrics\?\.wealth\s*<\s*1/);
});
