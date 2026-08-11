import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("キャラクター辞典に画像・補足記録・現在状況を持つ敵キャラ辞典を表示する", async () => {
  const [markup, app, styles] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("src/app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  const card = app.match(/function enemyCodexCard\([\s\S]*?^}/m)?.[0] ?? "";
  const panel = app.match(/function renderPeoplePanel\([\s\S]*?^}/m)?.[0] ?? "";

  assert.match(card, /enemy-codex-art/);
  assert.match(card, /確認済み能力/);
  assert.match(card, /未解明事項/);
  assert.match(card, /補足記録/);
  assert.match(card, /CURRENT MIGRATION STATUS/);
  assert.match(card, /CONTINENTAL PROTOCOL/);
  assert.match(panel, /敵キャラ辞典/);
  assert.match(panel, /getEnemyCodexEntries/);
  assert.match(markup, /人物・敵性存在・関係の記録/);
  assert.match(styles, /\.enemy-codex-art/);
  assert.match(styles, /\.enemy-codex-notes/);
});
