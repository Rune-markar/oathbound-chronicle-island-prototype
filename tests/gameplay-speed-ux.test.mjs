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
  assert.match(app, /activeQuest\.acceptedVillageId/);
  assert.match(app, /villageId\?\.startsWith\("village:"\)/);
  assert.match(app, /currentLocationId === villageId/);
  assert.match(styles, /\.campaign-bar-actions kbd/);
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
