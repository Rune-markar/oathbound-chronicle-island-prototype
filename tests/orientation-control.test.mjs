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
