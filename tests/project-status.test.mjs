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
  const index = await readFile(new URL("group-battle.html", projectRoot), "utf8");
  assert.match(index, /href="\.\/project-status\.html"/);
  const statusPage = await readFile(new URL("project-status.html", projectRoot), "utf8");
  assert.match(statusPage, /src="\.\/src\/project-status\.js"/);
});

test("天地創造の複合地理と未実装の資源開発を分けて追跡する", () => {
  const geography = STATUS_ENTRIES.find((item) => item.id === "generated-world-geography");
  assert.equal(geography?.category, "implemented");
  ["自然", "文明", "幻想", "天体", "田畑", "運河", "移動時間", "危険度"].forEach((term) => {
    assert.match(`${geography.title} ${geography.summary} ${geography.evidence}`, new RegExp(term));
  });
  assert.ok(geography.sources.some((item) => item.href === "./src/terrain-geography.js" && /applyTerrainGeography/.test(item.ref)));
  assert.ok(geography.sources.some((item) => item.href === "./src/v3-field-system.js" && /getV3DetailedTile/.test(item.ref)));
  assert.ok(geography.sources.some((item) => item.href === "./tests/terrain-geography.test.mjs"));

  const resources = STATUS_ENTRIES.find((item) => item.id === "geological-resources");
  assert.equal(resources?.category, "planned");
  assert.match(`${resources.title} ${resources.summary}`, /地熱.*石油.*石炭.*埋蔵量.*採掘権/s);
});

test("V3の単独犯罪と六作戦の組織運営を現行導線として追跡する", async () => {
  assert.equal(STATUS_LEDGER_META.lastAuditedAt, "2026-09-08");
  assert.equal(STATUS_LEDGER_META.projectGeneration, "ver3");
  const crime = STATUS_ENTRIES.find((item) => item.id === "criminal-play-flow");
  assert.ok(crime, "criminal-play-flow ledger entry is required");
  assert.equal(crime.category, "implemented");
  ["V3", "実在集落", "街道", "窃盗", "恐喝", "強盗", "V3専用セーブ"].forEach((action) => {
    assert.match(`${crime.summary} ${crime.evidence}`, new RegExp(action));
  });
  assert.ok(crime.sources.some((item) => item.href === "./src/v3-criminal-organization-system.js" && /resolveV3PersonalCrime/.test(item.ref)));
  assert.ok(crime.sources.some((item) => item.href === "./src/v3-app.js" && /renderUnderworld/.test(item.ref)));
  assert.ok(crime.sources.some((item) => item.href === "./tests/v3-criminal-organization-system.test.mjs"));
  const organization = STATUS_ENTRIES.find((item) => item.id === "criminal-organization");
  assert.equal(organization?.category, "implemented");
  ["V3", "単独犯", "人材", "一味", "犯罪組織", "恐喝", "強盗", "密輸", "破壊工作", "誘拐", "暗殺", "30日"].forEach((term) => {
    assert.match(`${organization.summary} ${organization.evidence}`, new RegExp(term));
  });
  assert.ok(organization.sources.some((item) => item.href === "./src/v3-criminal-organization-system.js" && /issueV3CriminalOperation/.test(item.ref)));
  assert.ok(organization.sources.some((item) => item.href === "./src/v3-app.js" && /renderUnderworld/.test(item.ref)));
  assert.ok(organization.sources.some((item) => item.href === "./tests/v3-criminal-organization-system.test.mjs"));

  const projectRoot = new URL("../", import.meta.url);
  const [readme, manual, changelog] = await Promise.all([
    readFile(new URL("README.md", projectRoot), "utf8"),
    readFile(new URL("MANUAL.md", projectRoot), "utf8"),
    readFile(new URL("CHANGELOG.md", projectRoot), "utf8"),
  ]);
  assert.match(readme, /唯一の開発正本/);
  assert.match(readme, /V3では現在の詳細マス.*実在集落.*街道/s);
  ["窃盗", "恐喝", "強盗", "密輸", "破壊工作", "暗殺"].forEach((action) => assert.match(readme, new RegExp(action)));
  assert.match(manual, /V3：単独犯から犯罪組織へ/);
  assert.match(manual, /詳細フィールド.*実際に到達.*対象.*管轄.*危険度.*見込報酬/s);
  assert.match(manual, /一味.*同時1件.*犯罪組織.*同時3件.*30日/s);
  assert.match(manual, /身代金.*交渉材料.*解放.*身請け.*見捨て/s);
  assert.match(changelog, /Generation V3.*唯一の開発正本/s);
  assert.match(changelog, /V3詳細フィールド.*単独犯罪.*V3専用セーブ/s);
});

test("V3外部危機を地方圧力・世界影響・周辺シンボルまで現行導線として追跡する", () => {
  const entry = STATUS_ENTRIES.find((item) => item.id === "v3-external-crisis-simulation");
  assert.equal(entry?.category, "implemented");
  assert.match(entry?.summary ?? "", /洪水.*山火事.*飢饉.*魔族襲撃/);
  assert.match(entry?.evidence ?? "", /国家五条件.*集落人口.*地方施設.*市場/);
  assert.ok(entry?.sources.some((item) => item.href === "./src/v3-external-crisis-system.js"));
  assert.ok(entry?.sources.some((item) => item.href === "./src/v3-field-system.js"));
  assert.ok(entry?.sources.some((item) => item.href === "./tests/v3-external-crisis-system.test.mjs"));
});

test("V3市場経済を生産・消費・在庫・物流・取引反映まで追跡する", () => {
  const market = STATUS_ENTRIES.find((item) => item.id === "v3-market-economy");
  assert.equal(market?.category, "implemented");
  assert.match(`${market?.summary} ${market?.evidence}`, /月産.*消費.*在庫.*街道.*NPC物流.*プレイヤー.*商会/s);
  assert.ok(market?.sources.some((item) => item.href === "./src/v3-market-economy.js"));
  assert.ok(market?.sources.some((item) => item.href === "./tests/v3-market-economy.test.mjs"));
});

test("世界終局の二経路を生成世界へ接続済みとして追跡する", () => {
  const ending = STATUS_ENTRIES.find((item) => item.id === "world-ending-design");
  assert.equal(ending?.category, "implemented");
  assert.match(`${ending.summary} ${ending.evidence}`, /善行点.*国家改革.*歴史政策.*所領政治.*一か月一件.*経路固定/s);
  assert.ok(ending.sources.some((item) => item.href === "./src/world-endgame-system.js"));
  assert.ok(ending.sources.some((item) => item.href === "./tests/world-endgame-system.test.mjs"));
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

test("V3動的世界は事前史・年代再生・月次進行を通常導線の実装として追跡する", () => {
  const dynamicWorld = STATUS_ENTRIES.find((item) => item.id === "v3-dynamic-world-history");
  assert.equal(dynamicWorld?.category, "implemented");
  assert.match(`${dynamicWorld.summary} ${dynamicWorld.evidence}`, /50年.*戦争.*独立.*年代.*1か月.*12か月/s);
  assert.ok(dynamicWorld.sources.some((item) => item.href === "./src/v3-world-simulation.js" && /buildV3WorldPrehistory/.test(item.ref)));
  assert.ok(dynamicWorld.sources.some((item) => item.href === "./src/v3-app.js" && /advanceWorld/.test(item.ref)));
  assert.ok(dynamicWorld.sources.some((item) => item.href === "./tests/v3-world-simulation.test.mjs"));
  assert.ok(dynamicWorld.sources.some((item) => item.href === "./docs/gameplay-reviews/2026-08-24-v3-dynamic-world.md"));
});

test("V3ワールドエフェクトは種族・戦闘・出現・市場への作用を通常導線として追跡する", () => {
  const effects = STATUS_ENTRIES.find((item) => item.id === "v3-world-effects");
  assert.equal(effects?.category, "implemented");
  for (const term of ["長雨", "暴風雨", "降雪", "吹雪", "砂嵐", "熱波", "濃霧", "降灰", "移動時間", "遭遇危険", "満月", "新月", "霊体", "個人戦", "集団戦", "価格", "在庫", "月境界", "保存"]) {
    assert.match(`${effects.summary} ${effects.evidence}`, new RegExp(term));
  }
  assert.ok(effects.sources.some((item) => item.href === "./src/race-world-effect-system.js" && /evaluateRaceWorldEffects/.test(item.ref)));
  assert.ok(effects.sources.some((item) => item.href === "./src/v3-world-effects.js" && /getV3WartimeMarketEffect/.test(item.ref)));
  assert.ok(effects.sources.some((item) => item.href === "./src/v3-group-combat.js"));
  assert.ok(effects.sources.some((item) => item.href === "./src/v3-system-kernel.js" && /world\.effect\.changed/.test(item.ref)));
  assert.ok(effects.sources.some((item) => item.href === "./tests/race-world-effect-system.test.mjs"));
  assert.ok(effects.sources.some((item) => item.href === "./tests/v3-world-effects.test.mjs"));
  assert.ok(effects.sources.some((item) => item.href === "./docs/gameplay-reviews/2026-08-24-race-reactive-world-effects.md"));
});

test("種族変容と確率的国家判断をV3通常導線の実装として追跡する", async () => {
  const item = STATUS_ENTRIES.find((entry) => entry.id === "race-transformative-probabilistic-decisions");
  assert.equal(item?.category, "implemented");
  for (const term of ["6軸", "強硬", "服従", "協調", "自立", "地方", "階級", "信仰", "戦争損失", "迫害", "固定人物", "統治者", "softmax", "14", "V6", "200年"]) {
    assert.match(`${item.summary} ${item.evidence}`, new RegExp(term));
  }
  assert.ok(item.sources.some((source) => source.href === "./src/race-decision-system.js" && /advanceRaceDecisionWorld/.test(source.ref)));
  assert.ok(item.sources.some((source) => source.href === "./src/v3-app.js" && /renderDecisionProfile/.test(source.ref)));
  assert.ok(item.sources.some((source) => source.href === "./src/v3-field-system.js" && /enrichV3NpcEntity/.test(source.ref)));
  assert.ok(item.sources.some((source) => source.href === "./tests/v3-world-simulation.test.mjs"));
  const projectRoot = new URL("../", import.meta.url);
  const [readme, manual, backlog, changelog] = await Promise.all([
    readFile(new URL("README.md", projectRoot), "utf8"),
    readFile(new URL("MANUAL.md", projectRoot), "utf8"),
    readFile(new URL("UNIMPLEMENTED_FEATURES.md", projectRoot), "utf8"),
    readFile(new URL("CHANGELOG.md", projectRoot), "utf8"),
  ]);
  assert.match(readme, /戦争損失.*迫害.*支配.*平和.*繁栄.*交流/s);
  assert.match(manual, /代表気質.*強硬.*服従.*協調.*自立.*地方.*階級.*信仰.*長期均衡.*直近判断の確率/s);
  assert.match(backlog, /種族変容・確率意思決定.*V3実装済み/s);
  assert.match(changelog, /softmax確率選択/);
});
