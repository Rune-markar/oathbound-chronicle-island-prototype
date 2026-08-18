import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("tactical combat keeps the four-step command loop and ally roster visible", () => {
  assert.match(html, /id="tacticalCommandGuide"/);
  assert.match(html, /id="tacticalExecutePreview"/);
  for (const label of ["味方を選ぶ", "命令・魔法を選ぶ", "盤面で対象を選ぶ", "命令を実行"]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /data-battle-select-unit/);
  assert.match(styles, /\.tactical-command-roster button\.has-plan/);
});

test("the selected spell controls target highlighting and renders a pre-cast preview", () => {
  assert.match(app, /getMagicTargetTiles\(battle, selectedUnit\.id, pendingMagic\.id\)/);
  assert.match(app, /getMagicSkillPreview\(battle, unit\.id, unit\.plannedAction\.actionId/);
  assert.match(app, /発動前プレビュー/);
  assert.match(styles, /\.tactical-tile\.is-magic-target/);
  assert.match(styles, /\.tactical-action-preview\.is-magic/);
});

