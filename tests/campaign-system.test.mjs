import test from "node:test";
import assert from "node:assert/strict";
import {
  AFTERMATH_POLICIES,
  COMMANDS,
  answerOfficerDemand,
  adoptDoctrine,
  chooseAftermathPolicy,
  commitMonth,
  createInitialState,
  deriveMonthPreview,
  getBorderNegotiationStatus,
  getAftermathDecisionStatus,
  getCampaignStatus,
  getDecisionExplanations,
  getForeignDispatches,
  getGovernance,
  getOfficerPoliticalReport,
  queueOrder,
  resolveBorderNegotiation,
  resolveAftermathDecisionChoice,
  resolveEventChoice,
} from "../src/simulation.js";

const EVENT_CHOICES = {
  crop_failure: "release", flood: "relief", bandits: "troops", epidemic: "clinics",
  refugees: "settle", corruption: "audit", merchant_exit: "subsidy", peasant_revolt: "negotiate",
};

function settleMonth(state) {
  let next = commitMonth(state);
  if (next.phase === "event") next = resolveEventChoice(next, EVENT_CHOICES[next.pendingEvent.eventId]);
  return next;
}

test("national initiatives consume scarce governance and take multiple months", () => {
  let state = adoptDoctrine(createInitialState(), "balanced");
  assert.equal(COMMANDS["admin.harbor_standard"].governanceCost, 2);
  assert.equal(COMMANDS["navy.soundings"].governanceCost, 2);
  assert.equal(COMMANDS["diplomacy.talks"].durationTurns, 2);
  state = queueOrder(state, { kind: "command", commandId: "admin.harbor_standard", officerId: "edras", cityId: "orta" });
  state = queueOrder(state, { kind: "command", commandId: "navy.soundings", officerId: "sera", cityId: "orta" });
  assert.equal(getGovernance(state).used, getGovernance(state).max);
  assert.throws(
    () => queueOrder(state, { kind: "command", commandId: "diplomacy.talks", officerId: "mara", cityId: "selene" }),
    (error) => error.code === "FORCE_REQUIRED",
  );
  state = settleMonth(state);
  assert.equal(state.issues.standards.status, "active");
  assert.equal(state.commandQueue.length, 2);
});

test("a fully prepared peaceful negotiation can secure transit without war", () => {
  let state = adoptDoctrine(createInitialState(), "concord");
  state = queueOrder(state, { kind: "command", commandId: "admin.harbor_standard", officerId: "edras", cityId: "orta" });
  state = queueOrder(state, { kind: "command", commandId: "navy.soundings", officerId: "sera", cityId: "orta" });
  state = settleMonth(state);
  state = queueOrder(state, { kind: "command", commandId: "diplomacy.talks", officerId: "mara", cityId: "selene" });
  state = settleMonth(state);
  assert.equal(state.council.pending, true);
  state = adoptDoctrine(state, "concord");
  state = settleMonth(state);

  const negotiation = getBorderNegotiationStatus(state);
  assert.equal(negotiation.talksCompleted, true);
  assert.ok(negotiation.acceptance >= 60);
  assert.equal(negotiation.hasBargainingMove, false);
  assert.equal(negotiation.offers.find((offer) => offer.id === "mutual_treaty").allowed, false);

  state = queueOrder(state, { kind: "command", commandId: "diplomacy.concession", officerId: "mara", cityId: "selene" });
  state = settleMonth(state);
  const finalOffer = getBorderNegotiationStatus(state);
  assert.equal(finalOffer.hasBargainingMove, true);
  assert.ok(finalOffer.bargainingMoves.includes("concession"));
  assert.equal(finalOffer.offers.find((offer) => offer.id === "mutual_treaty").allowed, true);

  state = resolveBorderNegotiation(state, "mutual_treaty");
  assert.equal(state.war, null);
  assert.equal(state.agreements.transit, true);
  assert.equal(getCampaignStatus(state).actId, "aftermath");

  state = chooseAftermathPolicy(state, "reconciliation");
  assert.equal(AFTERMATH_POLICIES[state.campaign.aftermathPolicy].months, 2);
  assert.equal(getAftermathDecisionStatus(state).id, "reconciliation_seats");
  assert.throws(() => commitMonth(state), /常設会議の議席/);
  state = resolveAftermathDecisionChoice(state, "village_parity");
  assert.equal(state.campaign.aftermathDecisions[0].choice, "国境村へ拒否権を与える");
  state = settleMonth(state);
  if (state.council.pending) state = adoptDoctrine(state, "concord");
  assert.equal(getAftermathDecisionStatus(state).id, "reconciliation_dispute");
  state = resolveAftermathDecisionChoice(state, "joint_tribunal");
  state = settleMonth(state);
  assert.equal(getCampaignStatus(state).complete, true);
  assert.equal(getCampaignStatus(state).ending.id, "lasting_peace");
  assert.equal(state.council.pending, false);
  const endingRecord = state.campaign.history.find((record) => record.type === "campaign_ending");
  assert.ok(endingRecord.causes.includes("相互通行条約"));
  assert.ok(!endingRecord.causes.includes("mutual_treaty"));
});

test("aftermath months require a consequential ruling before each advance", () => {
  let state = adoptDoctrine(createInitialState(), "balanced");
  state.agreements.transit = true;
  state.issues.border.status = "resolved";
  state.campaign.resolution = "armed_compromise";
  state = chooseAftermathPolicy(state, "frontier_garrison");
  const openingFood = state.cities.orta.resources.food;
  assert.equal(getAftermathDecisionStatus(state).id, "garrison_command");
  assert.equal(deriveMonthPreview(state), null);
  assert.throws(() => commitMonth(state), /監視隊の指揮権/);
  state = resolveAftermathDecisionChoice(state, "joint_patrol");
  assert.ok(state.cities.orta.resources.food < openingFood);
  state = settleMonth(state);
  assert.equal(getAftermathDecisionStatus(state).id, "garrison_incident");
});

test("officer demands can be accepted, fulfilled, negotiated, or refused with persistent consequences", () => {
  let state = adoptDoctrine(createInitialState(), "balanced");
  const startingLoyalty = state.officers.mara.loyalty;
  state = answerOfficerDemand(state, "mara", "accept");
  assert.equal(getOfficerPoliticalReport(state, "mara").activePromise.status, "open");
  assert.ok(state.officers.mara.loyalty > startingLoyalty);
  state = queueOrder(state, { kind: "command", commandId: "city.commerce", officerId: "mara", cityId: "selene" });
  state = settleMonth(state);
  assert.equal(state.politics.promises[0].status, "fulfilled");
  assert.match(state.politics.reactions[0].title, /約束を履行/);

  const gaiusLoyalty = state.officers.gaius.loyalty;
  state = answerOfficerDemand(state, "gaius", "refuse");
  assert.equal(state.officers.gaius.loyalty, gaiusLoyalty - 3);
  assert.equal(getOfficerPoliticalReport(state, "gaius").canRespond, false);
  assert.equal(getOfficerPoliticalReport(state, "gaius").responseCooldown, 3);
});

test("armed compromise secures the pass but leaves diplomatic and food costs", () => {
  const state = adoptDoctrine(createInitialState(), "sea_guard");
  state.issues.standards.status = "resolved";
  state.issues.reports.status = "resolved";
  state.negotiation.status = "open";
  state.negotiation.progress = 45;
  state.negotiation.leverage = 30;
  state.negotiation.bargainingMoves = ["pressure"];
  state.negotiation.deadlineTurn = state.turn + 2;
  const relation = state.foreignStates.valka.relation;
  const food = state.cities.orta.resources.food;
  const resolved = resolveBorderNegotiation(state, "armed_compromise");
  assert.equal(resolved.agreements.transit, true);
  assert.equal(resolved.campaign.resolution, "armed_compromise");
  assert.ok(resolved.foreignStates.valka.relation < relation);
  assert.ok(resolved.cities.orta.resources.food < food);
});

test("officers and all nine foreign countries act during monthly resolution", () => {
  let state = adoptDoctrine(createInitialState(), "sea_guard");
  const maraLoyalty = state.officers.mara.loyalty;
  state = queueOrder(state, { kind: "command", commandId: "military.mobilize", officerId: "gaius", cityId: "orta" });
  state = settleMonth(state);
  const report = state.monthlyReports[0];
  assert.equal(report.foreignDispatches.length, 9);
  assert.equal(getForeignDispatches(state, 20).length, 9);
  assert.ok(report.officerReactions.some((reaction) => reaction.officerId === "mara" && reaction.disposition < 0));
  assert.ok(state.officers.mara.loyalty < maraLoyalty);
  assert.equal(getDecisionExplanations(state).length, 3);
  assert.ok(getDecisionExplanations(state).every((item) => item.cause && item.effect && item.legacy));
});
