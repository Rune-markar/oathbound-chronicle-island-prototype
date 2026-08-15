# Landscape Start Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual-rotation request with an in-game button that requests fullscreen landscape mode and reports unsupported browsers inside the app.

**Architecture:** Move fullscreen and orientation locking into a small dependency-injected browser boundary returning normalized results. Keep DOM state rendering in `src/app.js`, and keep the portrait gate as the only visible UI until the browser switches to landscape.

**Tech Stack:** Vanilla ES modules, Screen Orientation API, Fullscreen API, Node.js test runner, Playwright CLI.

## Global Constraints

- Do not ask the user to rotate the physical device.
- The primary action text is `横画面で開始`.
- Unsupported and rejected requests display `このブラウザでは横画面固定を利用できません` inside the gate.
- If orientation locking fails after this action entered fullscreen, exit fullscreen before returning failure.
- Do not use CSS rotation as a fallback.
- Update `README.md`, `CHANGELOG.md`, and Notion `仕様変更・更新履歴` in the same change.
- Do not push unless the user explicitly requests it.

---

### Task 1: Test and implement the orientation browser boundary

**Files:**
- Create: `src/orientation-control.js`
- Create: `tests/orientation-control.test.mjs`

**Interfaces:**
- Consumes: `{ documentRef, screenRef }` browser-like objects.
- Produces: `requestLandscapeMode({ documentRef, screenRef }): Promise<{ ok: boolean, reason?: string }>`.

- [ ] **Step 1: Write the failing behavior tests**

Create `tests/orientation-control.test.mjs` with literal expectations for success, unsupported APIs, and cleanup after lock rejection:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { requestLandscapeMode } from "../src/orientation-control.js";

function supportedBrowser({ rejectLock = false } = {}) {
  const calls = [];
  const documentRef = {
    fullscreenElement: null,
    documentElement: {
      requestFullscreen: async () => { calls.push("fullscreen"); },
    },
    exitFullscreen: async () => { calls.push("exit-fullscreen"); },
  };
  const screenRef = {
    orientation: {
      lock: async (mode) => {
        calls.push(`lock:${mode}`);
        if (rejectLock) throw new Error("rejected");
      },
    },
  };
  return { calls, documentRef, screenRef };
}

test("the app enters fullscreen before locking landscape", async () => {
  const browser = supportedBrowser();
  assert.deepEqual(await requestLandscapeMode(browser), { ok: true });
  assert.deepEqual(browser.calls, ["fullscreen", "lock:landscape"]);
});

test("unsupported fullscreen returns a normalized failure without locking", async () => {
  const browser = supportedBrowser();
  delete browser.documentRef.documentElement.requestFullscreen;
  assert.deepEqual(await requestLandscapeMode(browser), { ok: false, reason: "fullscreen-unsupported" });
  assert.deepEqual(browser.calls, []);
});

test("a rejected orientation lock exits fullscreen entered by this action", async () => {
  const browser = supportedBrowser({ rejectLock: true });
  assert.deepEqual(await requestLandscapeMode(browser), { ok: false, reason: "orientation-failed" });
  assert.deepEqual(browser.calls, ["fullscreen", "lock:landscape", "exit-fullscreen"]);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/orientation-control.test.mjs`

Expected: FAIL because `src/orientation-control.js` does not exist.

- [ ] **Step 3: Implement the minimum browser boundary**

Create `src/orientation-control.js`:

```js
export async function requestLandscapeMode({ documentRef = document, screenRef = screen } = {}) {
  const requestFullscreen = documentRef?.documentElement?.requestFullscreen;
  const lockOrientation = screenRef?.orientation?.lock;
  if (typeof requestFullscreen !== "function") return { ok: false, reason: "fullscreen-unsupported" };
  if (typeof lockOrientation !== "function") return { ok: false, reason: "orientation-unsupported" };

  const enteredFullscreen = !documentRef.fullscreenElement;
  try {
    if (enteredFullscreen) await requestFullscreen.call(documentRef.documentElement);
  } catch {
    return { ok: false, reason: "fullscreen-failed" };
  }

  try {
    await lockOrientation.call(screenRef.orientation, "landscape");
    return { ok: true };
  } catch {
    if (enteredFullscreen && typeof documentRef.exitFullscreen === "function") {
      try { await documentRef.exitFullscreen(); } catch { /* best-effort rollback */ }
    }
    return { ok: false, reason: "orientation-failed" };
  }
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/orientation-control.test.mjs`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit the browser boundary**

```bash
git add src/orientation-control.js tests/orientation-control.test.mjs
git commit -m "Add testable landscape mode controller"
```

---

### Task 2: Connect the start button and in-app failure state

**Files:**
- Modify: `index.html:14-20`
- Modify: `src/app.js:1-2,8682-8690`
- Modify: `styles.css:15410-15470`
- Modify: `tests/map-visual.test.mjs:169-175`

**Interfaces:**
- Consumes: `requestLandscapeMode()` from Task 1.
- Produces: `#requestLandscape` start action and `#landscapeGuardStatus` live status message.

- [ ] **Step 1: Change the existing gate test to the required contract**

Update the portrait-gate test to require:

```js
test("portrait screens offer an app-controlled landscape start action", () => {
  assert.match(markup, /id="landscapeGuardTitle">横画面でゲームを開始/);
  assert.match(markup, /id="requestLandscape"[^>]*>横画面で開始/);
  assert.match(markup, /id="landscapeGuardStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.doesNotMatch(markup, /端末を横向きにしてください|横向きに回転/);
  assert.match(styleSource, /@media \(orientation: portrait\)[\s\S]*?\.landscape-guard\s*\{[\s\S]*?display: grid;/);
});
```

- [ ] **Step 2: Run the gate test and verify RED**

Run: `node --test tests/map-visual.test.mjs`

Expected: FAIL because the old manual-rotation copy remains and `#landscapeGuardStatus` is absent.

- [ ] **Step 3: Update the gate markup**

Replace the gate contents in `index.html` with:

```html
<section class="landscape-guard" id="landscapeGuard" aria-labelledby="landscapeGuardTitle">
  <div class="landscape-guard-device" aria-hidden="true"><i></i></div>
  <small>LANDSCAPE PLAY KIT</small>
  <h1 id="landscapeGuardTitle">横画面でゲームを開始</h1>
  <p>ボタンを押すと、全画面表示と横向き固定を開始します。</p>
  <p class="landscape-guard-status" id="landscapeGuardStatus" role="status" aria-live="polite" hidden></p>
  <button id="requestLandscape" type="button">横画面で開始</button>
</section>
```

- [ ] **Step 4: Connect the controller and normalize UI state**

Import the boundary near the top of `src/app.js`:

```js
import { requestLandscapeMode } from "./orientation-control.js";
```

Replace the current listener with:

```js
const landscapeStartButton = document.querySelector("#requestLandscape");
const landscapeGuardStatus = document.querySelector("#landscapeGuardStatus");
landscapeStartButton?.addEventListener("click", async () => {
  landscapeStartButton.disabled = true;
  landscapeStartButton.setAttribute("aria-busy", "true");
  landscapeGuardStatus.hidden = true;
  const result = await requestLandscapeMode();
  if (!result.ok) {
    landscapeGuardStatus.textContent = "このブラウザでは横画面固定を利用できません";
    landscapeGuardStatus.hidden = false;
  }
  landscapeStartButton.disabled = false;
  landscapeStartButton.removeAttribute("aria-busy");
});
```

- [ ] **Step 5: Style the status and busy state**

Add portrait-gate rules beside the existing button rules:

```css
.landscape-guard-status {
  max-width: 420px;
  margin: 0;
  padding: 9px 12px;
  color: #ffe0a0;
  border: 1px solid rgba(213, 184, 105, .45);
  background: rgba(78, 35, 26, .5);
}
.landscape-guard-status[hidden] { display: none; }
.landscape-guard button:disabled { cursor: wait; opacity: .68; }
```

- [ ] **Step 6: Run focused UI and controller tests**

Run: `node --test tests/orientation-control.test.mjs tests/map-visual.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 7: Commit the UI integration**

```bash
git add index.html src/app.js styles.css tests/map-visual.test.mjs
git commit -m "Let the app start landscape mode"
```

---

### Task 3: Update records, verify in browser, and complete repository validation

**Files:**
- Modify: `README.md:5-9`
- Modify: `CHANGELOG.md:5-15`
- Update externally: Notion `仕様変更・更新履歴`

**Interfaces:**
- Consumes: completed landscape start behavior from Tasks 1 and 2.
- Produces: durable repository and Notion change records plus verification evidence.

- [ ] **Step 1: Update durable repository documentation**

Replace the first README screen-policy bullet with:

```markdown
- 本編は横画面専用。縦向きでは「横画面で開始」ボタンが全画面化と横向き固定を実行し、API非対応時はアプリ内に案内を表示する。
```

Add this Unreleased changelog entry:

```markdown
- 縦画面の回転依頼を「横画面で開始」ボタンへ変更。アプリが全画面化と横向き固定を順番に要求し、API非対応・拒否時は画面内へ案内を表示するとともに、固定失敗後の全画面表示を解除する
```

- [ ] **Step 2: Run source and focused checks**

Run:

```bash
node --check src/orientation-control.js
node --check src/app.js
node --test tests/orientation-control.test.mjs tests/map-visual.test.mjs
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 3: Verify the UI with Playwright CLI**

Start a hidden local server, then:

```powershell
$serverProcess = Start-Process -FilePath 'python.exe' -ArgumentList @('-m','http.server','8765','--bind','127.0.0.1') -WorkingDirectory (Get-Location).Path -PassThru -WindowStyle Hidden
playwright-cli -s=landscape-start open http://127.0.0.1:8765/index.html
playwright-cli -s=landscape-start resize 720 1280
playwright-cli -s=landscape-start snapshot
```

Verify the snapshot exposes `横画面でゲームを開始`, `横画面で開始`, and the live status region. Click the start button in a browser where orientation lock is unavailable and verify the in-app unsupported message appears. Resize to `1280 720` and verify the gate is hidden and the landscape game shell has no document overflow.

- [ ] **Step 4: Close all task-owned browser and server processes**

Run `playwright-cli -s=landscape-start close`, stop the exact server PID started in Step 3, and remove only task-owned Playwright artifacts.

- [ ] **Step 5: Run the complete repository check**

Run: `npm run check`

Expected: 0 failures. If the machine is busy and times out, retry with the same command and a longer timeout; do not report completion from a partial run.

- [ ] **Step 6: Commit records and verification-facing changes**

```bash
git add README.md CHANGELOG.md
git commit -m "Document app-controlled landscape start"
```

- [ ] **Step 7: Update Notion `仕様変更・更新履歴`**

Append a dated entry containing the change summary, reason, affected files, tests, browser verification, and all completed commit references. Link the related LEVIATHAN COVENANT page and repository artifacts when supported by the database schema.

- [ ] **Step 8: Re-run fresh verification before integration**

Run:

```bash
npm run check
git diff --check
git status --short --branch
```

Expected: full suite passes, diff check exits 0, and the worktree has no uncommitted files.
