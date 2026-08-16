import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const title = "LEVIATHAN COVENANT";
const proposalFiles = [
  "assets/branding/proposals/leviathan-covenant-a-abyssal-seal.png",
  "assets/branding/proposals/leviathan-covenant-b-sovereign-compact.png",
  "assets/branding/proposals/leviathan-covenant-c-covenant-ledger.png",
];

test("正式タイトルは主要な利用者向け画面と資料で統一される", async () => {
  const [index, styles, readme, manualMarkdown, manualHtml, statusHtml] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("MANUAL.md", root), "utf8"),
    readFile(new URL("manual.html", root), "utf8"),
    readFile(new URL("project-status.html", root), "utf8"),
  ]);

  for (const content of [index, readme, manualMarkdown, manualHtml, statusHtml]) {
    assert.match(content, new RegExp(title));
    assert.doesNotMatch(content, /誓界記|OATHBOUND CHRONICLE/);
  }
  assert.match(index, /<h1 id="launchTitle"><img class="launch-title-logo"[^>]+alt="LEVIATHAN COVENANT"/);
  assert.match(index, /rel="preload" as="image" href="\.\/assets\/branding\/proposals\/leviathan-covenant-b-sovereign-compact\.png"/);
  assert.match(styles, /\.launch-title-logo\s*\{[\s\S]*width: clamp\(300px, 34vw, 420px\);/);
});

test("比較用のタイトルロゴ3案を透過PNGとして保持する", async () => {
  const proposal = await readFile(new URL("docs/branding/leviathan-covenant-logo-proposals.md", root), "utf8");
  assert.match(proposal, /Abyssal Seal/);
  assert.match(proposal, /Sovereign Compact/);
  assert.match(proposal, /Covenant Ledger/);
  assert.match(proposal, /B｜Sovereign Compact（主権者の盟約）— 正式採用/);

  for (const relativePath of proposalFiles) {
    const url = new URL(relativePath, root);
    const [contents, details] = await Promise.all([readFile(url), stat(url)]);
    assert.equal(contents.subarray(1, 4).toString("ascii"), "PNG");
    assert.ok(details.size > 100_000, `${relativePath} should contain a full-resolution proposal`);
    assert.match(proposal, new RegExp(relativePath.split("/").at(-1).replaceAll(".", "\\.")));
  }
});
