import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("front navigation shows world before person and keeps reference pages in the back menu", async () => {
  const [markup, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("src/app.js", root), "utf8"),
  ]);
  const primaryTabs = markup.match(/<nav class="primary-tabs"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const backMenu = markup.match(/<details class="outliner left-info-drawer" id="backMenu"[\s\S]*?<\/details>/)?.[0] ?? "";
  const worldSwitch = app.match(/function worldModeSwitch\(\)[\s\S]*?^}/m)?.[0] ?? "";

  assert.ok(primaryTabs.indexOf('data-panel="world"') < primaryTabs.indexOf('data-panel="career"'));
  assert.doesNotMatch(primaryTabs, /data-panel="people"/);
  assert.match(backMenu, /設定集/);
  assert.ok(backMenu.indexOf("世界統計") < backMenu.indexOf("キャラクター辞典"));
  assert.match(backMenu, /id="backMenuSettingsCatalog"/);
  assert.match(backMenu, /id="audioToggle"/);
  assert.match(backMenu, /data-open-guide/);
  assert.doesNotMatch(worldSwitch, /data-world-mode="statistics"/);
  assert.match(app, /elements\.backMenuSettingsCatalog\.innerHTML = governmentTitleCatalog\(\)/);
});
