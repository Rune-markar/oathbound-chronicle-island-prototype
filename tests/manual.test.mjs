import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("game manual covers the monthly loop and every active foreign national logic model", async () => {
  const manual = await readFile(new URL("MANUAL.md", root), "utf8");
  assert.match(manual, /方針.*支出.*月末.*報告/s);
  ["社会保障", "軍事関連", "研究開発", "対外援助", "国債返済", "経済投資"].forEach((name) => assert.match(manual, new RegExp(name)));
  assert.match(manual, /他国家の国家論理モデル/);
  [
    "ヴァルカ公国",
    "ヴィニア",
    "森の連合国",
    "ルストロンド公国",
    "イズメニア",
    "ヘブンズゲート王国",
    "デッドランド冥府",
    "グレート帝国",
    "アバンヘルン連盟",
  ].forEach((name) => assert.match(manual, new RegExp(name)));
  assert.match(manual, /月ごとの具体的な戦争行動を自律選択するのは主敵ヴァルカ/);
});

test("in-game help and the UTF-8 full manual remain reachable", async () => {
  const [index, manualPage] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("manual.html", root), "utf8"),
  ]);
  assert.match(index, /id="guideModal"/);
  assert.match(index, /data-open-guide/);
  assert.match(index, /href="\.\/manual\.html"/);
  assert.match(index, /NATIONAL LOGIC MODELS/);
  assert.match(manualPage, /<meta charset="UTF-8"/);
  assert.match(manualPage, /new TextDecoder\("utf-8"\)/);
  assert.match(manualPage, /fetch\("\.\/MANUAL\.md"/);
});
