import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("現在目標は説明だけでなく次の実行地点への直行操作になる", () => {
  assert.match(app, /function careerNextActionModel\(\)/);
  assert.match(app, /function focusCampaignNextAction\(\)/);
  assert.match(app, /data-campaign-next/);
  assert.match(app, /function guildQuestSettlementId\(quest\)/);
  assert.match(app, /function guildQuestNextAction\(quest\)/);
  assert.match(app, /route: "quest-party"[\s\S]*?tavernSection: "adventurers"/);
  assert.match(app, /route: "quest-local"/);
  assert.match(app, /action\.route === "quest-party"[\s\S]*?action\.tavernSection/);
  assert.match(app, /action\.route === "quest-local"[\s\S]*?openCampaignLocalAction/);
  assert.match(app, /villageId\?\.startsWith\("village:"\)/);
  assert.match(app, /currentLocationId === villageId/);
  assert.match(styles, /\.campaign-bar-actions kbd/);
});

test("成立した世界終局は現在目標から三段階の次判断へ直行できる", () => {
  const action = app.match(/function worldEndgameCareerAction\(endgame = null\)[\s\S]*?\n}\n\nfunction careerNextActionModel/)?.[0] ?? "";
  const focus = app.match(/function focusCampaignNextAction\(\)[\s\S]*?\n}\n\nfunction renderCampaignBar/)?.[0] ?? "";
  assert.match(action, /status\.route \?\? status\.routes\.find/);
  assert.match(action, /月を進め、次の終局判断「\$\{route\.nextStep\.name\}」に備える/);
  assert.match(action, /終局判断「\$\{route\.nextStep\.name\}」/);
  assert.match(action, /route: "advance-month"/);
  assert.match(action, /route: "world-endgame"/);
  assert.match(focus, /action\.route === "advance-month"[\s\S]*?endMonth\(\)/);
  assert.match(focus, /action\.route === "world-endgame"[\s\S]*?data-world-endgame-action/);
  assert.match(app, /class="world-endgame-command"/);
  assert.match(styles, /\.world-endgame-command/);
});

test("主要画面と現在目標はマウス移動なしでも開ける", () => {
  for (const [shortcut, title] of [["1", "世界"], ["2", "人物"], ["3", "統治"], ["4", "国制"], ["5", "評定"], ["6", "その他"]]) {
    assert.match(index, new RegExp(`title="${title}（${shortcut}）"`));
  }
  assert.match(app, /event\.key\.toLowerCase\(\) === "n"/);
  assert.match(app, /\/\^\[1-6\]\$\/\.test\(event\.key\)/);
  assert.match(app, /shortcut\.click\(\)/);
});

test("通常会話は内容を保ったまま確認クリックを省略できる", () => {
  assert.match(app, /data-village-dialogue-skip/);
  assert.match(app, /この内容で受注/);
  assert.match(app, /この内容で決定/);
  assert.match(app, /completeVillageConversation\(\)/);
  assert.match(styles, /\.conversation-actions \.is-quick/);
});
