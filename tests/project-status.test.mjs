import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { STATUS_CATEGORIES, STATUS_ENTRIES, STATUS_LEDGER_META, summarizeStatusEntries } from "../src/project-status-data.js";

test("現状台帳は全分類、更新日、具体的な出典を持つ", () => {
  assert.match(STATUS_LEDGER_META.lastAuditedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(STATUS_LEDGER_META.auditScope.codexPrimaryTasks > 0);
  const ids = new Set();
  for (const item of STATUS_ENTRIES) {
    assert.ok(STATUS_CATEGORIES[item.category], `${item.id}: unknown category`);
    assert.match(item.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.summary.length >= 20, `${item.id}: summary is too short`);
    assert.ok(item.evidence.length >= 20, `${item.id}: evidence is too short`);
    assert.ok(item.sources.length > 0, `${item.id}: source is required`);
    assert.ok(item.sources.every((source) => source.label && source.ref), `${item.id}: every source needs label and ref`);
    assert.equal(ids.has(item.id), false, `${item.id}: duplicated id`);
    ids.add(item.id);
  }
  const summary = summarizeStatusEntries();
  for (const category of Object.keys(STATUS_CATEGORIES)) assert.ok(summary[category] > 0, `${category}: empty category`);
});

test("現状台帳のローカル出典と開始画面の導線が存在する", async () => {
  const projectRoot = new URL("../", import.meta.url);
  for (const item of STATUS_ENTRIES) {
    for (const itemSource of item.sources) {
      if (!itemSource.href?.startsWith("./")) continue;
      await access(new URL(itemSource.href.slice(2), projectRoot));
    }
  }
  const index = await readFile(new URL("index.html", projectRoot), "utf8");
  assert.match(index, /href="\.\/project-status\.html"/);
  const statusPage = await readFile(new URL("project-status.html", projectRoot), "utf8");
  assert.match(statusPage, /src="\.\/src\/project-status\.js"/);
});

test("犯罪プレーの通常導線、六行動、帰結を実装済みとして追跡する", async () => {
  assert.equal(STATUS_LEDGER_META.lastAuditedAt, "2026-08-16");
  const crime = STATUS_ENTRIES.find((item) => item.id === "criminal-play-flow");
  assert.ok(crime, "criminal-play-flow ledger entry is required");
  assert.equal(crime.category, "implemented");
  ["窃盗", "恐喝", "強盗", "密輸", "破壊工作", "暗殺"].forEach((action) => {
    assert.match(`${crime.summary} ${crime.evidence}`, new RegExp(action));
  });
  assert.ok(crime.sources.some((item) => item.href === "./src/crime-system.js" && /getCrimeStatusView/.test(item.ref)));
  assert.ok(crime.sources.some((item) => item.href === "./src/app.js" && /renderSettlementCrimeSection/.test(item.ref)));
  assert.ok(crime.sources.some((item) => item.href === "./tests/criminal-ui.test.mjs"));

  const projectRoot = new URL("../", import.meta.url);
  const [readme, manual, changelog] = await Promise.all([
    readFile(new URL("README.md", projectRoot), "utf8"),
    readFile(new URL("MANUAL.md", projectRoot), "utf8"),
    readFile(new URL("CHANGELOG.md", projectRoot), "utf8"),
  ]);
  assert.match(readme, /通常のキャリア.*非合法/s);
  ["窃盗", "恐喝", "強盗", "密輸", "破壊工作", "暗殺"].forEach((action) => assert.match(readme, new RegExp(action)));
  assert.match(manual, /犯罪プレー/);
  assert.match(manual, /対象.*管轄.*準備.*見込報酬.*最大刑罰/s);
  assert.match(manual, /同行者.*承諾.*拒否.*通報.*離脱/s);
  assert.match(manual, /盗品.*故買屋.*手配.*隠れ家.*出頭.*服役.*逃亡.*亡命.*追放.*恩赦/s);
  assert.match(manual, /主権者.*権力濫用/s);
  assert.match(manual, /暗殺.*拘束.*ゲーム終了/s);
  assert.match(changelog, /Unreleased — 2026-08-16/);
  assert.match(changelog, /犯罪.*保存.*移行.*政治.*歴史.*テスト/s);
});

test("生活から国家と10段階出世を通常導線の実装として追跡する", async () => {
  const life = STATUS_ENTRIES.find((item) => item.id === "life-to-realm-gameplay");
  const career = STATUS_ENTRIES.find((item) => item.id === "career-delegation");
  assert.equal(life?.category, "implemented");
  assert.equal(career?.category, "implemented");
  assert.match(career.title, /10段階/);
  ["日次生活", "期限付き生業", "同行者", "所領事業", "家中恩賞", "二軍団", "生涯目標", "世代継承"].forEach((term) => {
    assert.match(`${life.summary} ${life.evidence}`, new RegExp(term));
  });
  assert.ok(life.sources.some((item) => item.href === "./src/life-to-realm-system.js"));
  assert.ok(life.sources.some((item) => item.href === "./src/app.js" && /renderLifeToRealmBoard/.test(item.ref)));
  assert.ok(life.sources.some((item) => item.href === "./tests/life-to-realm-system.test.mjs"));
  assert.ok(life.sources.some((item) => item.href === "./docs/gameplay-reviews/2026-08-16-life-to-realm-playthrough.md"));

  const projectRoot = new URL("../", import.meta.url);
  const [readme, manual, changelog] = await Promise.all([
    readFile(new URL("README.md", projectRoot), "utf8"),
    readFile(new URL("MANUAL.md", projectRoot), "utf8"),
    readFile(new URL("CHANGELOG.md", projectRoot), "utf8"),
  ]);
  assert.match(readme, /10位階すべて/);
  assert.match(manual, /生活から国家へ/);
  assert.match(manual, /日雇い.*運送.*護衛/s);
  assert.match(changelog, /所領事業.*家中恩賞.*二軍団.*継承/s);
});

test("生成国家間の攻撃・防衛戦争と残る全面統合境界を追跡する", async () => {
  const autonomousWar = STATUS_ENTRIES.find((item) => item.id === "ai-generated-world-wars");
  const bridge = STATUS_ENTRIES.find((item) => item.id === "generated-war-bridge");
  assert.equal(autonomousWar?.category, "implemented");
  for (const term of ["AI対AI", "最大五正面", "補給", "攻城", "完全併合"]) {
    assert.match(`${autonomousWar.summary} ${autonomousWar.evidence}`, new RegExp(term));
  }
  assert.ok(autonomousWar.sources.some((item) => item.href === "./src/generated-world-war-system.js"));
  assert.ok(autonomousWar.sources.some((item) => item.href === "./src/app.js"));
  assert.ok(autonomousWar.sources.some((item) => item.href === "./tests/generated-world-war-system.test.mjs"));
  assert.equal(bridge?.category, "implemented");
  assert.match(`${bridge.summary} ${bridge.evidence}`, /共通正面コア.*最大5正面.*介入.*国家崩壊.*レジスタンス/s);

  const projectRoot = new URL("../", import.meta.url);
  const [manual, backlog, spec] = await Promise.all([
    readFile(new URL("MANUAL.md", projectRoot), "utf8"),
    readFile(new URL("UNIMPLEMENTED_FEATURES.md", projectRoot), "utf8"),
    readFile(new URL("docs/superpowers/specs/2026-08-16-ai-generated-world-wars.md", projectRoot), "utf8"),
  ]);
  assert.match(manual, /決戦突破.*回廊戦争.*資源圧迫戦.*限定圧力/s);
  assert.match(manual, /城砦網防衛.*機動防御.*縦深防御/s);
  assert.match(backlog, /生成国家間の自律戦争.*実装済み/s);
  assert.match(backlog, /生成戦争の全面統合と併合統治.*実装済み/s);
  assert.match(spec, /未知の戦争は通常UIへ出ず/);
});
