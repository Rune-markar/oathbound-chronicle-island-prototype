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
