import test from "node:test";
import assert from "node:assert/strict";
import { requestPortraitMode } from "../src/orientation-control.js";

function supportedBrowser({ rejectFullscreen = false, rejectLock = false, fullscreenElement = null } = {}) {
  const calls = [];
  const documentRef = {
    fullscreenElement,
    documentElement: {
      requestFullscreen: async () => {
        calls.push("fullscreen");
        if (rejectFullscreen) throw new Error("rejected");
      },
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

test("the app enters fullscreen before locking portrait", async () => {
  const browser = supportedBrowser();
  assert.deepEqual(await requestPortraitMode(browser), { ok: true });
  assert.deepEqual(browser.calls, ["fullscreen", "lock:portrait"]);
});

test("unsupported fullscreen returns a normalized failure without locking", async () => {
  const browser = supportedBrowser();
  delete browser.documentRef.documentElement.requestFullscreen;
  assert.deepEqual(await requestPortraitMode(browser), { ok: false, reason: "fullscreen-unsupported" });
  assert.deepEqual(browser.calls, []);
});

test("unsupported orientation returns a normalized failure without entering fullscreen", async () => {
  const browser = supportedBrowser();
  delete browser.screenRef.orientation.lock;
  assert.deepEqual(await requestPortraitMode(browser), { ok: false, reason: "orientation-unsupported" });
  assert.deepEqual(browser.calls, []);
});

test("a rejected fullscreen request does not attempt orientation locking", async () => {
  const browser = supportedBrowser({ rejectFullscreen: true });
  assert.deepEqual(await requestPortraitMode(browser), { ok: false, reason: "fullscreen-failed" });
  assert.deepEqual(browser.calls, ["fullscreen"]);
});

test("a rejected orientation lock exits fullscreen entered by this action", async () => {
  const browser = supportedBrowser({ rejectLock: true });
  assert.deepEqual(await requestPortraitMode(browser), { ok: false, reason: "orientation-failed" });
  assert.deepEqual(browser.calls, ["fullscreen", "lock:portrait", "exit-fullscreen"]);
});

test("a rejected orientation lock preserves fullscreen that was already active", async () => {
  const browser = supportedBrowser({ rejectLock: true, fullscreenElement: {} });
  assert.deepEqual(await requestPortraitMode(browser), { ok: false, reason: "orientation-failed" });
  assert.deepEqual(browser.calls, ["lock:portrait"]);
});
