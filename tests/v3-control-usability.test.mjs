import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/v3-app.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const end = nextName ? `\n\nfunction ${nextName}` : "\n\n";
  return app.match(new RegExp(`function ${name}\\([^]*?${end.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`))?.[0] ?? "";
}

test("V3の主要操作フォーカスはDOM順ではなく明示した優先順で探索する", () => {
  const helper = functionSource("focusFirstAvailable", "getActionFocusSignature");
  assert.match(helper, /for \(const selector of selectors\)/);
  assert.match(helper, /root\?\.querySelectorAll\(selector\)/);

  const underworld = functionSource("focusUnderworldPrimaryAction", "openUnderworld");
  const report = underworld.indexOf("data-v3-criminal-report");
  const cycle = underworld.indexOf("data-v3-criminal-cycle");
  const order = underworld.indexOf("data-v3-criminal-order");
  const personal = underworld.indexOf("data-v3-personal-crime");
  assert.ok(report >= 0 && report < cycle && cycle < order && order < personal);
  assert.doesNotMatch(underworld, /\.join\(", "\)/);
});

test("V3の道具・裏社会・交易は開いた元へフォーカスを戻す", () => {
  const close = functionSource("closeModal", "createSeed");
  assert.match(close, /modalReturnFocus\[name\]\?\.isConnected/);
  assert.match(close, /requestAnimationFrame\(\(\) => returnTarget\?\.focus\(\)\)/);
  assert.match(app, /rememberModalFocus\("inventory", elements\.inventoryButton\)/);
  assert.match(app, /rememberModalFocus\("underworld", elements\.underworldButton\)/);
  assert.match(app, /rememberModalFocus\("commerce", elements\.commerceButton\)/);
  assert.match(app, /closeModal\("inventory"\)/);
  assert.match(app, /closeModal\("underworld"\)/);
  assert.match(app, /closeModal\("commerce"\)/);
});

test("V3の再描画後も道具と交易の操作フォーカスを維持する", () => {
  const signature = functionSource("getActionFocusSignature", "restoreActionFocus");
  const restore = functionSource("restoreActionFocus", "rememberModalFocus");
  const commerce = functionSource("rerenderCommerceWithFocus", "renderGame");
  assert.match(signature, /Object\.entries\(element\.dataset\)/);
  assert.match(restore, /Object\.entries\(signature\)\.every/);
  assert.match(commerce, /restoreActionFocus\(elements\.commerceContent, signature\)/);
  assert.match(app, /restoreActionFocus\(elements\.inventoryList, signature\)/);
});

test("V3世界地図のレイヤー・国家・現代復帰も再描画後の操作位置を維持する", () => {
  const restore = functionSource("restoreWorldMapActionFocus", "redrawWorldMapWithFocus");
  const redraw = app.match(/function redrawWorldMapWithFocus\([^]*?\n}\n\nasync function advanceWorld/)?.[0] ?? "";
  assert.match(restore, /restoreActionFocus\(elements\.worldMap, signature\)/);
  assert.match(restore, /focusAvailableElement\(elements\.worldHistory\)/);
  assert.match(redraw, /drawWorldMap\(\)/);
  assert.match(redraw, /restoreWorldMapActionFocus\(signature\)/);
  assert.match(app, /redrawWorldMapWithFocus\(mapLayerAction\)/);
  assert.match(app, /redrawWorldMapWithFocus\(nationAction\)/);
  assert.match(app, /redrawWorldMapWithFocus\(historyCurrentAction\)/);
  assert.match(app, /async function advanceWorld\(months = 1, actionElement = document\.activeElement\)/);
  assert.match(app, /restoreWorldMapActionFocus\(focusSignature\)/);
  assert.match(app, /advanceWorld\(Number\(worldAdvance\), worldAdvanceAction\)/);
});

test("V3開始時と通常遭遇時に次の操作へフォーカスする", () => {
  const prepare = functionSource("prepareWorld", "showToast");
  const move = functionSource("movePlayer", "applyEncounterAction");
  const encounter = functionSource("applyEncounterAction", "beginV3GroupBattle");
  assert.match(prepare, /elements\.field\.querySelector\("\.is-player"\)\?\.focus\(\)/);
  assert.match(move, /state\.pendingEncounter[\s\S]*elements\.encounterActions\.querySelector\("button"\)\?\.focus\(\)/);
  assert.match(move, /else requestAnimationFrame\(\(\) => elements\.field\.querySelector\("\.is-player"\)\?\.focus\(\)\)/);
  assert.match(encounter, /else if \(state\.pendingEncounter\) elements\.encounterActions\.querySelector\("button"\)\?\.focus\(\)/);
});
