import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STATUS_ENTRIES } from "../src/project-status-data.js";

const ROOT = new URL("../", import.meta.url);

test("four next-depth loops are tracked as playable implementations", async () => {
  const ids = ["property-enterprise", "companion-personal-quests", "estate-politics", "generated-campaigns"];
  for (const id of ids) {
    const item = STATUS_ENTRIES.find((entry) => entry.id === id);
    assert.equal(item?.category, "implemented", `${id} must be implemented`);
    assert.ok(item.sources.some((source) => source.href === "./src/app.js"), `${id} needs UI evidence`);
    assert.ok(item.sources.some((source) => source.href?.startsWith("./tests/")), `${id} needs test evidence`);
  }

  const [backlog, manual, review, spec, app] = await Promise.all([
    readFile(new URL("UNIMPLEMENTED_FEATURES.md", ROOT), "utf8"),
    readFile(new URL("MANUAL.md", ROOT), "utf8"),
    readFile(new URL("docs/gameplay-reviews/2026-08-16-next-depth-systems.md", ROOT), "utf8"),
    readFile(new URL("docs/superpowers/specs/2026-08-16-next-depth-systems.md", ROOT), "utf8"),
    readFile(new URL("src/app.js", ROOT), "utf8"),
  ]);
  for (const term of ["家・倉庫・個人商店", "同行者の個人クエスト", "所領政治", "生成世界の戦役"]) assert.match(`${manual}\n${spec}`, new RegExp(term));
  for (const excluded of ["婚姻", "家系図", "相続争い"]) assert.match(backlog, new RegExp(`${excluded}.*対象外`));
  assert.match(backlog, /生成地方.*都市経済.*全面接続/s);
  assert.match(backlog, /世界終局.*二経路/s);
  assert.match(review, /1366×768.*844×390.*コンソール.*0.*保存再開/s);
  for (const hook of ["data-shop-price", "data-shop-close", "data-companion-battle-evidence", "data-estate-decision", "data-generated-siege", "data-generated-peace"]) assert.match(app, new RegExp(hook));
});
