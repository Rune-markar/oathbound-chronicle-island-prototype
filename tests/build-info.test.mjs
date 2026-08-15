import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { BUILD_INFO, getBuildCommitUrl } from "../src/build-info.js";

const root = new URL("../", import.meta.url);

test("開始画面の版表示はパッケージ版とGitコミットを同時に示す", async () => {
  const [packageText, index, policy, changelog] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("WORLD_SIMULATION_POLICY.md", root), "utf8"),
    readFile(new URL("CHANGELOG.md", root), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.equal(BUILD_INFO.version, packageJson.version);
  assert.match(BUILD_INFO.commit, /^[0-9a-f]{40}$/);
  assert.equal(getBuildCommitUrl(), `${BUILD_INFO.repositoryUrl}/commit/${BUILD_INFO.commit}`);
  assert.match(index, /id="launchProductVersion"/);
  assert.match(index, /id="launchCommitLink"/);
  assert.match(policy, /開始画面の最下部にはプロダクト版とGitHubコミットを常時併記/);
  assert.match(changelog, /現在のプロダクト版とGitHubコミット番号を常時併記/);
});
