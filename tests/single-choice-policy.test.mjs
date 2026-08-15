import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("consequential single choices wait for input while the informational chronicle auto-closes", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /一択でも結果を伴うため自動決定しません/);
  assert.doesNotMatch(source, /querySelector\("button:not\(:disabled\)"\)\?\.click\(\)/);
  assert.match(source, /informationalCloseTimer = setTimeout\(\(\) => \{[\s\S]*?offlineReportOpen = false;[\s\S]*?\}, 3000\)/);
});
