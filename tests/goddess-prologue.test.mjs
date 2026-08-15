import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  GODDESS_ARRIVAL_LINES,
  GODDESS_GENERATION_LINES,
  GODDESS_MISSION,
  GODDESS_DEPARTURE_LINE,
  GODDESS_MERCY_LINES,
  WORLD_ENDING_DESIGN,
  createGoddessMercyCompanion,
  createGoddessPrologueState,
  registerGoddessPersistentTap,
} from "../src/goddess-prologue.js";

test("女神の導入は指定された使命を一方向の自動会話として保持する", () => {
  assert.equal(GODDESS_MISSION, "迷える子羊、お前に使命を与える。生れ落ちた世界を統べ、強大な敵を打ち滅ぼせ。");
  assert.ok(GODDESS_ARRIVAL_LINES.includes(GODDESS_MISSION));
  assert.ok(GODDESS_GENERATION_LINES.length >= 3);
  assert.doesNotMatch(GODDESS_ARRIVAL_LINES.join("\n"), /謀略で王国を乗っ取る|国盗り/);
  assert.match(GODDESS_GENERATION_LINES.join("\n"), /謀略で王国を乗っ取る.*国盗り.*敵を滅ぼし/);
  assert.match(GODDESS_GENERATION_LINES.join("\n"), /村へ行け.*依頼を果たし.*功績を積め/);
  assert.match(GODDESS_GENERATION_LINES.join("\n"), /士官の口を得ろ/);
  assert.doesNotMatch([...GODDESS_ARRIVAL_LINES, ...GODDESS_GENERATION_LINES].join("\n"), /多元主義|世界連邦|和解|女神の軍勢/);
  assert.match(GODDESS_DEPARTURE_LINE, /世界を統べろ.*真の敵を.*滅ぼせ/);
  assert.doesNotMatch([...GODDESS_ARRIVAL_LINES, ...GODDESS_GENERATION_LINES, GODDESS_DEPARTURE_LINE].join("\n"), /です|ます|なさい/);
  assert.deepEqual(createGoddessPrologueState(), {
    active: false,
    phase: "idle",
    line: "",
    lineNumber: 0,
    lineTotal: 0,
    generationReady: false,
    recentTaps: [],
    mercyGranted: false,
  });
});

test("女神への短時間の連打は一度だけ慈悲分岐を発火し、本筋へ戻す", () => {
  let prologue = { ...createGoddessPrologueState(), active: true, phase: "arrival" };
  let triggered = false;
  for (let index = 0; index < 6; index += 1) {
    const result = registerGoddessPersistentTap(prologue, 1000 + index * 200);
    prologue = result.state;
    triggered ||= result.triggered;
  }
  assert.equal(triggered, true);
  assert.equal(prologue.mercyGranted, true);
  assert.match(GODDESS_MERCY_LINES[0], /何か特典を付けろだと.*不遜な.*身の程を知れ/);
  assert.match(GODDESS_MERCY_LINES[1], /我からの慈悲/);
  assert.match(GODDESS_MERCY_LINES.at(-1), /使命も行き先も変わらぬ.*名と姿、魂の適性を選べ/);
  assert.equal(registerGoddessPersistentTap(prologue, 2400).triggered, false);
});

test("慈悲で与えられる少女はシードごとに決まり、通常より非力な同行者になる", () => {
  const first = createGoddessMercyCompanion("world-a");
  const again = createGoddessMercyCompanion("world-a");
  const other = createGoddessMercyCompanion("world-b");
  assert.deepEqual(first, again);
  assert.notEqual(first.id, other.id);
  assert.equal(first.active, true);
  assert.equal(first.goddessMercyCompanion, true);
  assert.match(first.status, /女神から与えられた奴隷/);
  assert.ok(Object.values(first.abilities).every((score) => score >= 4 && score <= 9));
  assert.equal(first.portraitImage, "./assets/generated/goddess-mercy-companion.png");
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
  assert.doesNotMatch(index, /goddessMercyReveal|goddess-mercy-companion/);
  assert.match(index, /class="[^"]*goddess-dialogue[^"]*"/);
  assert.match(index, /id="characterCreationRace"/);
  assert.match(index, /CANONICAL ENDING MEMO/);
});

test("世界生成中も女神界を閉じず、画面上部の進捗バーへ実進捗を渡す", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(app, /view\.characterCreationOpen = Boolean\(flow\.deferLaunch\)/);
  assert.match(app, /--generation-progress/);
  assert.match(app, /goddessPortrait\.decode/);
  assert.match(app, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/);
  assert.match(styles, /launch-screen:has\(\.goddess-prologue:not\(\[hidden\]\)\) \.launch-generation/);
  assert.match(styles, /width: var\(--generation-progress, 0%\) !important/);
  assert.match(styles, /top:\s*14px/);
  assert.match(styles, /grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);
});

test("転生時は女神の連続移動と世界へ降り立つ三段階演出を保つ", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(index, /id="worldArrivalOverlay"/);
  assert.match(app, /classList\.toggle\("is-generating"/);
  assert.match(app, /async function playWorldArrival/);
  assert.match(app, /await playWorldArrival\(token\)/);
  assert.match(styles, /goddess-seamless-drift/);
  assert.match(styles, /\.world-arrival-overlay\s*\{/);
});

test("女神の会話窓は物語全体の共通テキストウィンドウ契約になる", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(index, /goddess-dialogue story-text-window/);
  assert.ok((app.match(/conversation-message story-text-window/g) ?? []).length >= 2);
  assert.match(styles, /\.story-text-window\s*\{/);
  assert.match(styles, /\.goddess-return\s*\{[^}]*font:[^;]*13px/s);
  assert.match(styles, /\.story-text-window p\s*\{[^}]*font-size:\s*19px/s);
});

test("スマートフォンでは魂確定ボタンをスクロール領域の外へ常設する", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.goddess-prologue\.is-selecting \.goddess-character-setup > footer\s*\{[^}]*position:\s*fixed/s);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, \.82fr\) minmax\(0, 1\.18fr\)/);
  assert.match(styles, /bottom:\s*calc\(10px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(styles, /\.goddess-prologue\.is-selecting \.goddess-dialogue\.story-text-window\s*\{[^}]*bottom:\s*calc\(82px/s);
});

test("女神界では右側の女神画像だけが連打対象となり、奴隷少女は表示しない", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(index, /class="goddess-portrait"[^>]*>\s*<img[^>]*data-goddess-persistent-tap/);
  assert.doesNotMatch(index, /class="goddess-portrait"[^>]*data-goddess-persistent-tap/);
  assert.doesNotMatch(index, /goddess-mercy-reveal|goddessMercyReveal/);
  assert.match(styles, /\.goddess-prologue\.is-selecting \.goddess-portrait\s*\{[^}]*right:\s*0[^}]*width:\s*52vw/s);
  assert.doesNotMatch(styles, /\.goddess-portrait\s*\{[^}]*inset:\s*0/s);
  assert.match(styles, /\.goddess-portrait\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(styles, /\.goddess-portrait img\s*\{[^}]*pointer-events:\s*auto/s);
});
