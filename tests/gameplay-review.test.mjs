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
import { getGeneratedWorldView } from "../src/generated-world-system.js";

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const manualSource = await readFile(new URL("../MANUAL.md", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../styles.css", import.meta.url), "utf8");

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
    "individual", "retainer", "commander", "castellan", "lord", "multi_lord", "governor", "duke", "regent", "independent_ruler",
  ]);
  assert.match(appSource, /PLAYABLE_CAREER_STAGE_ROUTE/);
  assert.match(manualSource, /通常UIで通過できる立身段階/);
});

test("a sovereign can reach the world-endgame board from the normal career shell", () => {
  assert.match(appSource, /state\.player\.sovereign \? \["centralization"\] : \[\]/);
  assert.match(appSource, /governanceCommand\.dataset\.governanceCommand === "centralization"/);
  assert.match(appSource, /data-world-endgame-action/);
  assert.match(styleSource, /centralization-panel-body \{ min-width: 0;[\s\S]*?overflow-x: hidden/);
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

test("a second fief is a selected distinct live region rather than the legacy placeholder", () => {
  let state = createCareerInitialState({ seed: "second-generated-fief" });
  const firstRegionId = state.generatedWorld.expeditionRegionId;
  state.player.stage = "lord";
  state.player.title = "男爵・城主";
  state.player.affiliation = { nationId: state.generatedWorld.playerNationId, liegeId: "review-liege", liegeName: "検証主君" };
  state.player.metrics.liegeTrust = 70;
  state.player.metrics.civilMerit = 20;
  state.player.holdings = [{ id: "fief-orta", territoryId: "orta", generatedRegionId: firstRegionId }];
  const runtime = getGeneratedWorldView(state).runtime;
  const firstRegion = runtime.regionById.get(firstRegionId);
  const selected = [...runtime.regionById.values()].find((region) => region.nationId === firstRegion.nationId && region.id !== firstRegionId);
  assert.ok(selected, "generated liege realm needs a distinct fief candidate");
  state = performCareerAction(state, "request_second_fief", { generatedRegionId: selected.id });
  assert.equal(state.player.holdings.find((holding) => holding.territoryId === "nereia")?.generatedRegionId, selected.id);
  assert.notEqual(selected.id, firstRegionId);
  assert.match(appSource, /data-second-fief-region/);
  assert.doesNotMatch(appSource, /加増された場合、東境州/);
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

test("legacy generated quests resolve their virtual village to a real settlement in the same region", () => {
  const origin = { id: "generated-town", name: "生成町", regionId: "region-a" };
  const otherRegion = { id: "other-town", name: "他地方町", regionId: "region-b" };
  let state = createCareerInitialState();
  state = performVillageAction(state, { id: "village:region-a", name: "旧辺境村" }, "accept_request");
  state = performVillageAction(state, origin, "recruit_companion");
  state = performVillageAction(state, origin, "complete_request");
  assert.equal(getVillageActionAvailability(state, "report_request", origin).allowed, true);
  assert.equal(getVillageActionAvailability(state, "report_request", otherRegion).allowed, false);
});

test("a capital sentence opens a persistent terminal surface and locks gameplay", () => {
  assert.match(appSource, /state\.player\?\.crime\?\.runEnded/);
  assert.match(appSource, /CRIMINAL CHRONICLE COMPLETE/);
  assert.match(appSource, /strategy-shell[\s\S]{0,80}setAttribute\("inert"/);
  assert.match(appSource, /data-crime-ending-new/);
});

test("the terminal new-character action is routed through click and modal dismissal is registered once", () => {
  const clickHandler = appSource.match(/document\.addEventListener\("click", async \(event\) => \{[\s\S]*?document\.addEventListener\("keydown"/)?.[0] ?? "";
  const keydownHandler = appSource.match(/document\.addEventListener\("keydown", \(event\) => \{[\s\S]*?document\.querySelector\("#closeAssignment"\)/)?.[0] ?? "";

  assert.match(clickHandler, /event\.target\.closest\("\[data-crime-ending-new\]"\)[\s\S]*?view\.launchOpen = true;[\s\S]*?openCharacterCreation\(\)/);
  assert.doesNotMatch(keydownHandler, /data-crime-ending-new/);
  assert.equal((appSource.match(/elements\.guideModal\.addEventListener\("click"/g) ?? []).length, 1);
});

test("month-end warnings reuse the cached planning preview", () => {
  const endMonthFlow = appSource.match(/function endMonth\(\)[\s\S]*?function formatValue/)?.[0] ?? "";
  const cityPlanFlow = appSource.match(/function renderCityPlan\(ledger\)[\s\S]*?function renderOutliner/)?.[0] ?? "";

  assert.match(endMonthFlow, /getTurnWarnings\(state, getPlanningPreview\(\)\)/);
  assert.match(cityPlanFlow, /const preview = getPlanningPreview\(\);\s*const warnings = getTurnWarnings\(state, preview\);/);
});
