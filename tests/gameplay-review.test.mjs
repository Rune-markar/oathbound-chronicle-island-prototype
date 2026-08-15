import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PLAYABLE_CAREER_STAGE_ROUTE,
  createCareerInitialState,
  performCareerAction,
  getVillageActionAvailability,
  performVillageAction,
  normalizeCareerState,
} from "../src/simulation.js";

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const manualSource = await readFile(new URL("../MANUAL.md", import.meta.url), "utf8");

test("a blank browser cannot continue or autosave the fallback preview state", () => {
  assert.match(appSource, /let chronicleReady = Boolean\(loadedChronicle\)/);
  assert.match(appSource, /if \(!chronicleReady\) return false/);
  assert.match(appSource, /data-launch-action="continue"/);
  assert.match(appSource, /continueButton\.hidden = !chronicleReady/);
});

test("completed character generation is persisted before the launch screen closes", () => {
  const resetFlow = appSource.match(/async function resetChronicle[\s\S]*?function costLabel/)?.[0] ?? "";
  assert.match(resetFlow, /state = nextState;[\s\S]*?chronicleReady = true;[\s\S]*?persist\(\)/);
});

test("the displayed playable career route only claims milestones reachable from normal UI", () => {
  assert.deepEqual(PLAYABLE_CAREER_STAGE_ROUTE.map((stage) => stage.id), [
    "individual", "retainer", "commander", "lord", "multi_lord", "independent_ruler",
  ]);
  assert.match(appSource, /PLAYABLE_CAREER_STAGE_ROUTE/);
  assert.match(manualSource, /通常UIで通過できる立身段階/);
});

test("a generated-world fief keeps the live generated region binding", () => {
  let state = createCareerInitialState({ seed: "browser-review-generated-fief" });
  const regionId = state.generatedWorld.expeditionRegionId;
  state.player.stage = "retainer";
  state.player.title = "従士";
  state.player.affiliation = { nationId: state.generatedWorld.playerNationId, liegeId: "review-liege", liegeName: "検証主君" };
  state.player.metrics.liegeTrust = 40;
  state = performCareerAction(state, "fulfill_order");
  state = performCareerAction(state, "command_campaign");
  assert.equal(state.player.holdings[0].territoryId, "orta", "fixed administrative model remains the internal execution target");
  assert.equal(state.player.holdings[0].generatedRegionId, regionId, "the visible fief remains bound to the generated world");
});

test("a legacy generated-world frontier fief gains a display binding", () => {
  const state = createCareerInitialState({ seed: "legacy-generated-fief" });
  const regionId = state.generatedWorld.expeditionRegionId;
  state.player.holdings = [{ id: "fief-orta", territoryId: "orta" }];
  normalizeCareerState(state);
  assert.equal(state.player.holdings[0].generatedRegionId, regionId);
});

test("village conversation has keyboard close and modal focus restoration wiring", () => {
  assert.match(appSource, /villageConversationReturnFocus/);
  assert.match(appSource, /event\.key === "Escape" && view\.villageConversation/);
  assert.match(appSource, /focusVillageConversation/);
  assert.match(appSource, /event\.key === "Tab" && view\.villageConversation/);
});

test("the character detail dialog makes its duplicate workspace inert", () => {
  assert.match(appSource, /elements\.cityWorkspace\.inert = open/);
  assert.match(appSource, /elements\.cityWorkspace\.setAttribute\("aria-hidden", String\(open\)\)/);
});

test("a completed request can only be reported to its accepting settlement", () => {
  const origin = { id: "origin", name: "受注町" };
  const other = { id: "other", name: "別の町" };
  let state = createCareerInitialState();
  state = performVillageAction(state, origin, "accept_request");
  state = performVillageAction(state, origin, "recruit_companion");
  state = performVillageAction(state, origin, "complete_request");
  assert.equal(getVillageActionAvailability(state, "report_request", other).allowed, false);
  assert.match(getVillageActionAvailability(state, "report_request", other).reason, /受注した集落/);
  assert.equal(getVillageActionAvailability(state, "report_request", origin).allowed, true);
});

test("a capital sentence opens a persistent terminal surface and locks gameplay", () => {
  assert.match(appSource, /state\.player\?\.crime\?\.runEnded/);
  assert.match(appSource, /CRIMINAL CHRONICLE COMPLETE/);
  assert.match(appSource, /strategy-shell[\s\S]{0,80}setAttribute\("inert"/);
  assert.match(appSource, /data-crime-ending-new/);
});
