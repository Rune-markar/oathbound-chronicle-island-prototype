import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceCommanderPersuasion,
  createCommanderDispositionCase,
  DISPOSITION_STATUSES,
  finalizeCommanderDisposition,
} from "../src/commander-disposition.js";

function captureResult(commanderId = "captured") {
  return { id: "test-result", capture: { eligible: true, commanderId } };
}

function commander(captureResponse, extras = {}) {
  return {
    id: "captured", name: "捕縛将官", iconUrl: null, bravery: 70, traits: ["試験特性"],
    postBattleProfile: { captureResponse, resolve: 70, loyalty: 75, persuasionTarget: 90, ...extras },
  };
}

test("an honor-bound commander can refuse captivity and die immediately", () => {
  const disposition = createCommanderDispositionCase({ commander: commander("suicide"), battleResult: captureResult() });
  assert.equal(disposition.status, DISPOSITION_STATUSES.DECEASED);
  assert.equal(disposition.outcome, "suicide");
  assert.match(disposition.log[0].message, /自害/);
});

test("a pragmatic commander can submit immediately after capture", () => {
  const disposition = createCommanderDispositionCase({ commander: commander("submit"), battleResult: captureResult() });
  assert.equal(disposition.status, DISPOSITION_STATUSES.JOINED);
  assert.equal(disposition.outcome, "submitted");
  assert.match(disposition.log[0].message, /帰順/);
});

test("a loyal commander requires multiple months of persuasion before joining", () => {
  let disposition = createCommanderDispositionCase({
    commander: commander("persuasion", { preferredApproach: "honor", persuasionTarget: 100, recruitmentRole: "国境軍顧問" }),
    battleResult: captureResult(),
  });
  assert.equal(disposition.status, DISPOSITION_STATUSES.PERSUADING);
  disposition = advanceCommanderPersuasion(disposition, "honor");
  assert.equal(disposition.status, DISPOSITION_STATUSES.PERSUADING);
  while (disposition.status === DISPOSITION_STATUSES.PERSUADING) disposition = advanceCommanderPersuasion(disposition, "honor");
  assert.equal(disposition.status, DISPOSITION_STATUSES.JOINED);
  assert.ok(disposition.elapsedMonths >= 2);
  assert.match(disposition.log.at(-1).message, /国境軍顧問として王国へ帰順/);
});

test("internment and conditional release are independent terminal dispositions", () => {
  const active = createCommanderDispositionCase({ commander: commander("persuasion"), battleResult: captureResult() });
  assert.equal(finalizeCommanderDisposition(active, "intern").status, DISPOSITION_STATUSES.INTERNED);
  assert.equal(finalizeCommanderDisposition(active, "release").status, DISPOSITION_STATUSES.RELEASED);
  assert.throws(() => createCommanderDispositionCase({ commander: commander("persuasion"), battleResult: captureResult("other") }), /完全包囲/);
});
