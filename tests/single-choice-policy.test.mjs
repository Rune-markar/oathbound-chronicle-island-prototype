import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("consequential choices and the informational chronicle remain available until explicit input", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /一択でも結果を伴うため自動決定しません/);
  assert.doesNotMatch(source, /querySelector\("button:not\(:disabled\)"\)\?\.click\(\)/);
  assert.doesNotMatch(source, /informationalCloseTimer/);
  assert.match(source, /data-close-offline-report/);
  assert.match(source, /data-open-offline-report/);
});
