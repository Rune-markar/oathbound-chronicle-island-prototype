import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const countryIds = ["forest_alliance", "vinia", "heavens_gate", "lustrond", "izmenia", "valka", "selena"];

test("every mapped nation is visibly composed of multiple territory tiles", () => {
  for (const countryId of countryIds) {
    const block = markup.match(new RegExp(`<g class="country-group [^"]+" data-country="${countryId}"[\\s\\S]*?<\\/g>`))?.[0];
    assert.ok(block, `${countryId} must have a country group`);
    const declaredCount = Number(block.match(/data-tile-count="(\d+)"/)?.[1]);
    const actualCount = block.match(/class="province map-tile/g)?.length ?? 0;
    assert.ok(actualCount >= 3, `${countryId} must contain at least three tiles`);
    assert.equal(actualCount, declaredCount, `${countryId} tile count must match its visible paths`);
    assert.equal(block.match(/data-tile-name="[^"]+"/g)?.length, actualCount);
    assert.equal(block.match(/data-terrain-label="[^"]+"/g)?.length, actualCount);
    assert.match(block, /class="nation-outline"/);
  }
});

test("terrain mode covers the map's major landform categories", () => {
  assert.match(markup, /data-map-mode="terrain"/);
  assert.match(markup, /class="terrain-legend"/);
  for (const terrain of ["forest", "plains", "hills", "mountains", "highlands", "wetland", "coast", "badlands"]) {
    assert.match(markup, new RegExp(`data-terrain="${terrain}"`));
  }
});

test("territory tiles use curved boundaries instead of triangular straight-line fans", () => {
  const paths = [...markup.matchAll(/class="province map-tile[^"]*"[^>]*d="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths.length, 39);
  assert.ok(paths.every((path) => /[QC]/.test(path)), "every territory tile must include a curved boundary");
});

test("clicking a tile is wired to a compact terrain dossier", () => {
  assert.match(markup, /id="tileDetailWindow"[^>]*role="dialog"/);
  assert.match(markup, /data-close-tile/);
  assert.match(appSource, /const TERRAIN_TILE_PROFILES/);
  assert.match(appSource, /function renderTileDetail\(\)/);
  assert.match(appSource, /view\.tileWindowOpen = true/);
  assert.match(appSource, /profile\.movement/);
  assert.match(appSource, /profile\.resources/);
});
