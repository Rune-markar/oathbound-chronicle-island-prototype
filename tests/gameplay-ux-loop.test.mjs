import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("village actions expose blocked reasons in both the panel and full workspace", () => {
  assert.match(app, /function renderVillageChoiceAction\(village, item\)/);
  assert.match(app, /class="village-action-reason">条件：/);
  assert.equal((app.match(/map\(\(item\) => renderVillageChoiceAction\(village, item\)\)/g) ?? []).length, 2);
  assert.match(styles, /\.village-action-reason/);
  assert.match(styles, /\.village-choice-overlay \.village-action-reason/);
});

test("guild guidance distinguishes party-gated dungeons from solo local objectives", () => {
  const resolver = app.match(/function guildQuestNextAction\(quest\)[\s\S]*?\n}\n\nfunction careerNextActionModel/)?.[0] ?? "";
  assert.match(resolver, /objective\.type === "clear_dungeon" && !activeParty\.length/);
  assert.match(resolver, /currentRegionId !== acceptedRegionId/);
  assert.match(resolver, /route: "quest-origin"/);
  assert.match(resolver, /getGuildContracts\(state, currentAdventureContext\(\)\)[\s\S]*?liveContract\.objective/);
  assert.match(resolver, /route: "quest-party"/);
  assert.match(resolver, /tavernSection: "adventurers"/);
  assert.match(resolver, /objective\.type === "collect_item"/);
  assert.match(resolver, /progress >= required/);
  assert.match(resolver, /route: "quest-desk"/);
  assert.match(resolver, /objective\.type === "defeat_enemy"/);
  assert.match(resolver, /route: "quest-local"/);
  assert.match(app, /action\.route === "quest-origin"[\s\S]*?openCampaignSettlement\(action\.villageId\)/);
  assert.match(app, /\["quest-local", "quest-origin", "quest-desk"\]\.includes\(questAction\?\.route\)[\s\S]*?data-campaign-next/);
  assert.match(app, /周辺探索は主人公一人でも行えます/);
});

test("generated settlements show only the live contract system", () => {
  const filter = app.match(/function villageFacilityActions\(village, facility\)[\s\S]*?\n}\n\nfunction villageFacilityChoiceCount/)?.[0] ?? "";
  assert.match(filter, /village\.source === "generated" && item\.id === "accept_request"/);
  assert.match(filter, /quest\.objectiveData/);
});

test("monthly and offline reports remain visible and reopenable until acknowledged", () => {
  assert.match(app, /月次報告 · 未確認/);
  assert.match(app, /data-guide-action="open_reports"/);
  assert.match(app, /view\.cityTab === "reports"[\s\S]*?acknowledgeMonthReport/);
  assert.match(app, /留守中の年代記 · 再表示/);
  assert.match(app, /data-open-offline-report/);
  assert.doesNotMatch(app, /offlineReportOpen = false;[\s\S]{0,160}\}, 3000\)/);
});

test("all tactical result exit paths apply a personal battle result exactly once", () => {
  const exitFlow = app.match(/function exitTacticalBattle\(\)[\s\S]*?\n}\n\nfunction routePartyToRecovery/)?.[0] ?? "";
  assert.match(exitFlow, /const battleResult = view\.tacticalResult/);
  assert.match(exitFlow, /if \(battleResult\) \{[\s\S]*?resolveDungeonTacticalBattle\(state, battleResult\)/);
  assert.doesNotMatch(app, /exitTacticalBattle\(\{ applyDungeonResult/);
  assert.match(app, /run\.mode === "travel"/);
  assert.match(app, /JOURNEY COMPLETED/);
  assert.match(app, /JOURNEY INTERRUPTED/);
  assert.match(app, /!travelBattle && \["dungeon", "personal-map"\]\.includes\(view\.tacticalOrigin\?\.type\)[\s\S]*?data-result-action="recover"/);
});

test("assignment and mandatory event dialogs isolate and retain keyboard focus", () => {
  assert.match(app, /function currentBlockingModal\(\)/);
  assert.match(app, /function syncBlockingModalAccessibility\(\)/);
  assert.match(app, /element\.inert = realmUnavailable \|\| Boolean\(modal\)/);
  assert.match(app, /event\.key === "Tab" && blockingModal/);
  assert.match(app, /event\.shiftKey && document\.activeElement === first/);
  assert.match(app, /document\.activeElement === last/);
  assert.match(app, /returnFocus\?\.isConnected/);
  assert.match(app, /view\.offlineReportOpen && view\.offlineReport/);
  assert.match(app, /view\.offlineReportOpen && view\.offlineReport\) return elements\.offlineReportModal;[\s\S]*?view\.assignmentOpen[\s\S]*?state\.phase === "event"/);
  assert.match(app, /state\.phase === "event" && state\.pendingEvent && !view\.offlineReportOpen/);
  assert.match(app, /function closeOfflineReport\(\)[\s\S]*?renderEventModal\(\);[\s\S]*?renderOfflineReport\(\);/);
  assert.match(app, /if \(!changed\) return;/);
  assert.match(app, /event\.key === "Escape" && view\.offlineReportOpen/);
});

test("travel encounter withdrawal names the real destination and retained cost", () => {
  assert.match(app, /travelEncounter \? "地方移動を中断して出発地へ戻れます。移動時間・消耗は保持されます。"/);
  assert.match(app, /travelEncounter \? "地方移動を中断して出発地へ戻る"/);
  assert.match(app, /travelEncounter \? "遭遇を避け、地方移動を中断して出発地へ戻りました。"/);
});

test("NPC personality labels do not repeat the field name", () => {
  assert.match(app, /knownPersonalityLabel = candidate\.social\.personality \? `性格：\$\{knownPersonality\}`/);
  assert.doesNotMatch(app, /人柄人柄|人柄性格：/);
});

test("held companion quests can still be accepted or refused from the saved offer", () => {
  const board = app.match(/function renderCompanionQuestBoard\(\)[\s\S]*?\n}\n\nfunction renderEstatePoliticsBoard/)?.[0] ?? "";
  assert.match(board, /companion\.active\.status === "held"/);
  assert.match(board, /data-companion-quest-response="accept"[\s\S]*?>引き受ける</);
  assert.match(board, /data-companion-quest-response="refuse"[\s\S]*?>断る</);
});

test("protected geopolitical decisions expose real approval actions", () => {
  assert.match(app, /approveGeneratedStrategicDecision/);
  assert.match(app, /decision\.pullId === "limited_war"/);
  assert.match(app, /model\.objectives\.filter\(\(objective\) => objective\.id !== "full_annexation"\)/);
  assert.match(app, /data-generated-strategic-target/);
  assert.match(app, /data-generated-strategic-objective/);
  assert.match(app, /data-generated-strategic-commander/);
  assert.match(app, /限定戦を承認し、戦役を開始/);
  assert.match(app, /停戦案を相手国へ送る/);
  assert.match(app, /停戦案を受諾し、戦争を終える/);
  assert.match(app, /data-generated-strategic-approve/);
});
