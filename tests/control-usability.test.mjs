import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("集落施設は実行可能な行動を先に出し、条件未達を折りたたむ", () => {
  const groups = app.match(/function renderVillageActionGroups\(village, facility\)[\s\S]*?\n}\n\nfunction focusVillageActionWindow/)?.[0] ?? "";
  assert.match(groups, /availability\.allowed/);
  assert.match(groups, /village-secondary-actions/);
  assert.match(groups, /village-blocked-actions/);
  assert.match(groups, /条件を満たすと使える行動/);
  assert.match(app, /villageFacilityChoiceCount\(village, facility\)[\s\S]*?getVillageActionAvailability\(state, item\.id, village\)\.allowed/);
  assert.match(styles, /\.village-blocked-actions/);
});

test("酒場とギルドは依頼・仲間の目的を一般行動より先に表示する", () => {
  const workspace = app.match(/function renderVillageWorkspace\(\)[\s\S]*?\n}\n\nfunction shortcutCharacters/)?.[0] ?? "";
  assert.match(workspace, /const facilityContent = villageFacilityAdventureContent/);
  assert.match(workspace, /\["tavern", "guild"\]\.includes\(selected\.id\)[\s\S]*?`\$\{facilityContent}\$\{actionGroups}`/);
  assert.match(workspace, /AFTER ARRIVAL \/ NEXT ACTION/);
  assert.match(workspace, /目的を選ぶ/);
  assert.match(styles, /\.village-action-window \.tavern-section-tabs[\s\S]*?position: sticky/);
});

test("施設を開くと主要操作へフォーカスしEscapeで段階的に戻れる", () => {
  const focus = app.match(/function focusVillageActionWindow\(\)[\s\S]*?\n}\n\nfunction focusVillageFacilityButton/)?.[0] ?? "";
  assert.ok(focus.indexOf("data-submit-adventure-contract") < focus.indexOf("data-accept-adventure-contract"));
  assert.ok(focus.indexOf("data-accept-adventure-contract") < focus.indexOf("data-tavern-section"));
  assert.match(focus, /\.map\(\(selector\) => windowElement\?\.querySelector\(selector\)\)\.find\(Boolean\)/);
  assert.match(focus, /windowElement\?\.scrollIntoView\(\{ block: "start", inline: "nearest" \}\)/);
  assert.match(app, /focusVillageFacilityButton\(facilityId\)/);
  assert.match(app, /event\.key === "Escape" && view\.panel === "village" && view\.villageFacilityOpen/);
  assert.match(app, /event\.key === "Escape" && view\.panel === "village"[\s\S]*?view\.panel = "world"/);
  assert.match(app, /event\.key === "Escape" && view\.panel === "location"/);
});

test("会話開始時は閉じるボタンより即時操作を優先する", () => {
  const focus = app.match(/function focusVillageConversation\(\)[\s\S]*?\n}\n\nfunction closeVillageConversation/)?.[0] ?? "";
  assert.ok(focus.indexOf("data-village-dialogue-skip") < focus.indexOf("data-village-dialogue-next"));
  assert.ok(focus.indexOf("data-village-dialogue-next") < focus.indexOf("data-village-dialogue-cancel"));
  assert.match(focus, /\.map\(\(selector\) => conversation\?\.querySelector\(selector\)\)\.find\(Boolean\)/);
  assert.match(focus, /focus\(\{ preventScroll: true \}\)/);
});

test("縦画面の村内HUDは一段に圧縮し、操作領域を広く確保する", () => {
  assert.match(styles, /body\.is-village-focus \.village-central-status\.is-top-status[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(styles, /body\.is-village-focus \.village-central-visual\.has-top-status \.village-action-window[\s\S]*?top: 88px/);
  assert.match(styles, /\.village-action-window \.guild-contract-board button[\s\S]*?min-height: 42px/);
});
