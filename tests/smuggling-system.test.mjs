import test from "node:test";
import assert from "node:assert/strict";
import {
  getSmugglingOffers,
  acceptSmugglingOffer,
  inspectSmugglingCheckpoint,
  deliverSmugglingCargo,
} from "../src/smuggling-system.js";

const baseState = () => ({
  turn: 3,
  player: {
    id: "pc",
    metrics: { wealth: 2 },
    crime: { contacts: [{ id: "smug-a", role: "smuggler", jurisdictionId: "region-a", trust: 4 }] },
  },
  generatedWorld: { seed: "cargo-seed" },
});
const route = {
  origin: { id: "region-a", name: "灰野", nationId: "nation-a" },
  destination: { id: "region-b", name: "白峰", nationId: "nation-b" },
  travel: { travelMinutes: 360 },
};

test("a discovered local smuggler supplies stable concrete offers and acceptance stores mission cargo", () => {
  const state = baseState();
  const offers = getSmugglingOffers(state, route);
  assert.deepEqual(offers, getSmugglingOffers(state, route));
  assert.equal(offers[0].originJurisdiction.id, "region-a");
  assert.equal(offers[0].destinationJurisdiction.id, "region-b");
  assert.ok(offers[0].cargo.id && offers[0].reward.wealth && offers[0].deadlineTurn);
  const accepted = acceptSmugglingOffer(state, offers[0]);
  assert.equal(state.player.crime.activeSmuggling, undefined);
  assert.equal(accepted.player.crime.activeSmuggling.offerId, offers[0].id);
  assert.equal(accepted.player.inventory, undefined);
});

test("checkpoint is skipped inside one jurisdiction and deterministic across a border", () => {
  const offer = getSmugglingOffers(baseState(), route)[0];
  const accepted = acceptSmugglingOffer(baseState(), offer);
  const same = inspectSmugglingCheckpoint(accepted, {
    from: { id: "region-a", nationId: "nation-a" }, to: { id: "region-c", nationId: "nation-a" },
  });
  assert.equal(same.result.inspected, false);
  assert.equal(same.result.reason, "same_jurisdiction");
  const clear1 = inspectSmugglingCheckpoint(accepted, route, { outcome: "clear" });
  const clear2 = inspectSmugglingCheckpoint(accepted, route, { outcome: "clear" });
  assert.deepEqual(clear1, clear2);
  assert.equal(clear1.result.inspected, true);
  assert.equal(clear1.state.player.crime.activeSmuggling.status, "active");
});

test("seizure, escape and capture persist distinct cargo outcomes and exact heat", () => {
  const offer = getSmugglingOffers(baseState(), route)[0];
  const accepted = acceptSmugglingOffer(baseState(), offer);
  const escaped = inspectSmugglingCheckpoint(accepted, route, { outcome: "escape" });
  assert.equal(escaped.state.player.crime.activeSmuggling.status, "active");
  assert.equal(escaped.state.player.crime.heatByJurisdiction["region-b"], 20);
  assert.equal(escaped.result.outcome, "failed_escaped");

  const seized = inspectSmugglingCheckpoint(accepted, route, { outcome: "seizure" });
  assert.equal(seized.state.player.crime.activeSmuggling, null);
  assert.equal(seized.state.player.crime.smugglingRecords[0].cargoStatus, "seized");
  assert.equal(seized.state.player.crime.heatByJurisdiction["region-b"], 20);

  const captured = inspectSmugglingCheckpoint(accepted, route, { outcome: "capture" });
  assert.equal(captured.result.outcome, "captured");
  assert.equal(captured.state.player.crime.activeSmuggling, null);
  assert.equal(captured.state.player.metrics.wealth, 2);
});

test("delivery requires active cargo at its exact destination and raises wealth and contact trust", () => {
  const state = baseState();
  const offer = getSmugglingOffers(state, route)[0];
  const accepted = acceptSmugglingOffer(state, offer);
  const snapshot = structuredClone(accepted);
  assert.throws(() => deliverSmugglingCargo(accepted, { jurisdictionId: "region-x" }), /目的地/);
  assert.deepEqual(accepted, snapshot);
  const delivered = deliverSmugglingCargo(accepted, { jurisdictionId: "region-b" });
  assert.equal(delivered.state.player.metrics.wealth, 2 + offer.reward.wealth);
  assert.equal(delivered.state.player.crime.contacts[0].trust, 6);
  assert.equal(delivered.state.player.crime.activeSmuggling, null);
  assert.equal(delivered.state.player.crime.smugglingRecords[0].cargoStatus, "delivered");
  assert.equal(delivered.state.player.crime.incidents[0].outcome, "success_hidden");
  assert.equal(delivered.state.player.crime.incidents[0].detected, false);
  assert.throws(() => deliverSmugglingCargo(delivered.state, { jurisdictionId: "region-b" }), /積荷/);
});
