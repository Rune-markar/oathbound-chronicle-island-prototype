import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AUDIO_CUES, DEFAULT_AUDIO_SETTINGS, GameAudio, normalizeAudioSettings } from "../src/audio.js";

test("audio settings preserve valid preferences and clamp unsafe volumes", () => {
  assert.deepEqual(normalizeAudioSettings({ muted: true, bgmVolume: -2, seVolume: 4 }), {
    muted: true,
    bgmVolume: 0,
    seVolume: 1,
  });
  assert.deepEqual(normalizeAudioSettings(null), DEFAULT_AUDIO_SETTINGS);
});

test("audio controller restores saved preferences without requiring Web Audio at import time", () => {
  const storage = {
    getItem: () => JSON.stringify({ muted: true, bgmVolume: 0.18, seVolume: 0.55 }),
    setItem: () => {},
  };
  const audio = new GameAudio({ storage });
  assert.equal(audio.getState().muted, true);
  assert.equal(audio.getState().bgmVolume, 0.18);
  assert.equal(audio.getState().seVolume, 0.55);
});

test("the UI exposes a persistent BGM and SE control and the app uses distinct game cues", () => {
  const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(markup, /id="audioToggle"/);
  assert.match(markup, /id="audioStatus"/);
  for (const cue of ["month", "event", "war", "peace", "save", "error"]) {
    assert.ok(AUDIO_CUES.includes(cue));
    assert.match(appSource, new RegExp(`["']${cue}["']`));
  }
});
