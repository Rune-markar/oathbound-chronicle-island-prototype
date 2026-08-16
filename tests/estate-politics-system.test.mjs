import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  advanceEstatePoliticsMonth,
  getEstatePoliticsView,
  normalizeEstatePoliticsState,
  resolveEstateProjectDebate,
  startEstateProjectDebate,
} from "../src/estate-politics-system.js";
import { advanceLifeToRealmMonth, createCareerInitialState } from "../src/simulation.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";

function lordState(seed = "estate-politics") {
  const state = createCareerInitialState({ seed });
  const regionId = state.generatedWorld.expeditionRegionId;
  state.player.stage = "lord";
  state.player.title = "男爵・城主";
  state.player.holdings = [{ id: "fief-orta", territoryId: "orta", generatedRegionId: regionId, tenure: "feudal", rights: [] }];
  state.player.householdRetainers = ["dario"];
  state.player.metrics.wealth = 30;
  state.cities.orta.resources.money = 30;
  normalizeEstatePoliticsState(state);
  return state;
}

test("a fief debate exposes residents nobles merchants and retainers with conflicting burdens", () => {
  const state = lordState();
  const view = getEstatePoliticsView(state, "orta", "road_network");
  assert.deepEqual(view.factions.map((entry) => entry.id), ["residents", "notables", "merchants", "retainers"]);
  assert.ok(view.options.some((entry) => entry.id === "compromise"));
  assert.ok(view.options.some((entry) => entry.id === "force"));
  assert.ok(new Set(view.factions.map((entry) => entry.preferredOptionId)).size >= 3);
});

test("wrong jurisdiction is rejected and the debate is immutable until a policy is chosen", () => {
  const state = lordState("estate-jurisdiction");
  const other = structuredClone(state);
  other.player.holdings[0].territoryId = "nereia";
  assert.throws(() => startEstateProjectDebate(other, { territoryId: "orta", projectId: "patrol", officerId: "dario" }), /所領/);
  const started = startEstateProjectDebate(state, { territoryId: "orta", projectId: "patrol", officerId: "dario" });
  assert.equal(state.player.estatePolitics.activeDebate, null);
  assert.equal(started.player.estatePolitics.activeDebate.projectId, "patrol");
  assert.equal(started.player.lifeToRealm.fief.projects.length, 0);
});

test("compromise starts a delayed project and applies generated-region politics on completion", () => {
  let state = lordState("estate-compromise");
  const regionId = state.player.holdings[0].generatedRegionId;
  const settlementId = getGeneratedWorldView(state).runtime.regionById.get(regionId).settlementIds[0];
  const beforePopulation = state.generatedWorld.regionalDomains.settlementStates[settlementId].population;
  state = startEstateProjectDebate(state, { territoryId: "orta", projectId: "relief", officerId: "dario" });
  state = resolveEstateProjectDebate(state, "compromise");
  assert.equal(state.player.estatePolitics.activeDebate, null);
  assert.equal(state.player.lifeToRealm.fief.projects[0].politicalDecisionId, "compromise");
  assert.ok(state.player.estatePolitics.regions[regionId].factionSupport.residents > 50);
  state = advanceLifeToRealmMonth(state);
  state = advanceEstatePoliticsMonth(state);
  assert.ok(state.generatedWorld.regionalDomains.settlementStates[settlementId].population > beforePopulation);
  assert.ok(state.player.estatePolitics.regions[regionId].security >= 50);
  assert.equal(state.player.estatePolitics.history[0].outcome, "completed");
  assert.ok(state.generatedWorld.regionalDomains.events.some((entry) => entry.type === "estate_politics" && entry.regionId === regionId));
  assert.match(state.player.history[0].detail, /成果/);
});

test("forcing a project is faster but creates opposition accidents and rebellion pressure", () => {
  let state = lordState("estate-force");
  const regionId = state.player.holdings[0].generatedRegionId;
  state = startEstateProjectDebate(state, { territoryId: "orta", projectId: "levy", officerId: "dario" });
  state = resolveEstateProjectDebate(state, "force");
  const region = state.player.estatePolitics.regions[regionId];
  assert.ok(region.rebellionPressure > 0);
  assert.ok(region.factionSupport.residents < 50);
  assert.equal(state.player.lifeToRealm.fief.projects[0].remainingMonths, 1);
  assert.ok(state.generatedWorld.regionalDomains.events.some((entry) => entry.type === "estate_politics" && entry.tone === "danger"));
  state = advanceEstatePoliticsMonth(state);
  assert.ok(state.player.estatePolitics.history.some((entry) => ["accident", "opposition"].includes(entry.outcome)));
});

test("castellans with a stewardship holding can see and resolve the estate debate required for lordship", () => {
  const appSource = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const renderer = appSource.match(/function renderEstatePoliticsBoard\(\)[\s\S]*?function renderGeneratedCampaignBoard/)?.[0] ?? "";
  assert.match(renderer, /if \(!state\.player\.holdings\?\.length\) return ""/);
  assert.doesNotMatch(renderer, /getCareerStage\(state\)\?\.governance/);
  assert.match(renderer, /data-estate-decision/);
});
