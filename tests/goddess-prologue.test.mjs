import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  GODDESS_ARRIVAL_LINES,
  GODDESS_GENERATION_LINES,
  GODDESS_MISSION,
  WORLD_ENDING_DESIGN,
  createGoddessPrologueState,
} from "../src/goddess-prologue.js";

test("女神の導入は指定された使命を一方向の自動会話として保持する", () => {
  assert.equal(GODDESS_MISSION, "迷える子羊よ、あなたに使命を授けます。生れ落ちた世界を統べなさい。そして強大な敵を打ち滅ぼすのです。");
  assert.ok(GODDESS_ARRIVAL_LINES.includes(GODDESS_MISSION));
  assert.ok(GODDESS_GENERATION_LINES.length >= 3);
  assert.deepEqual(createGoddessPrologueState(), {
    active: false,
    phase: "idle",
    line: "",
    lineNumber: 0,
    lineTotal: 0,
    generationReady: false,
  });
});

test("開発者設定は相反する二つの世界終局を正本として保持する", () => {
  assert.equal(WORLD_ENDING_DESIGN.length, 2);
  assert.match(WORLD_ENDING_DESIGN[0].condition, /世界帝国.*リヴァイアサンを打ち滅ぼす/);
  assert.match(WORLD_ENDING_DESIGN[1].condition, /世界連邦.*リヴァイアサンと和解.*女神の軍勢を退ける/);
  assert.notEqual(WORLD_ENDING_DESIGN[0].id, WORLD_ENDING_DESIGN[1].id);
});

test("開始画面は女神立ち絵、下部テキストウィンドウ、魂設定、開発者メモを備える", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(index, /class="goddess-prologue"/);
  assert.match(index, /assets\/generated\/goddess-ilysia\.png/);
  assert.match(index, /class="goddess-dialogue"/);
  assert.match(index, /id="characterCreationRace"/);
  assert.match(index, /CANONICAL ENDING MEMO/);
});
