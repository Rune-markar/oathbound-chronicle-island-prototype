import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { buildTerritorySectorPaths, TERRITORY_SECTOR_COUNT } from "../src/map-tiles.js";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const oceanAsset = new URL("../assets/generated/world-map-ocean-painted.png", import.meta.url);
const landAsset = new URL("../assets/generated/world-map-land-painted.png", import.meta.url);
const countryIds = ["forest_alliance", "vinia", "heavens_gate", "lustrond", "izmenia", "valka", "selena", "deadland", "great_empire", "avanheln"];

test("every mapped nation subdivides each major region into three territory tiles", () => {
  for (const countryId of countryIds) {
    const block = markup.match(new RegExp(`<g class="country-group [^"]+" data-country="${countryId}"[\\s\\S]*?<\\/g>`))?.[0];
    assert.ok(block, `${countryId} must have a country group`);
    const declaredCount = Number(block.match(/data-tile-count="(\d+)"/)?.[1]);
    const majorRegionCount = block.match(/class="province map-tile/g)?.length ?? 0;
    assert.ok(majorRegionCount >= 3, `${countryId} must contain at least three major regions`);
    assert.equal(declaredCount, majorRegionCount * TERRITORY_SECTOR_COUNT, `${countryId} tile count must include every generated sector`);
    assert.equal(block.match(/data-tile-name="[^"]+"/g)?.length, majorRegionCount);
    assert.equal(block.match(/data-terrain-label="[^"]+"/g)?.length, majorRegionCount);
    assert.match(block, /class="nation-outline"/);
    const landmassPath = block.match(/class="country-landmass"[^>]*d="([^"]+)"/)?.[1];
    const outlinePath = block.match(/class="nation-outline"[^>]*d="([^"]+)"/)?.[1];
    assert.equal(landmassPath, outlinePath, `${countryId} coast must match its national outline exactly`);
  }
});

test("terrain mode covers the map's major landform categories", () => {
  assert.match(markup, /data-map-mode="terrain"/);
  assert.match(markup, /class="terrain-legend"/);
  for (const terrain of ["forest", "plains", "hills", "mountains", "highlands", "wetland", "coast", "badlands"]) {
    assert.match(markup, new RegExp(`data-terrain="${terrain}"`));
  }
});

test("territory records retain curved edges for the displaced geographic border layer", () => {
  const paths = [...markup.matchAll(/class="province map-tile[^"]*"[^>]*d="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths.length, 62);
  assert.ok(paths.every((path) => /[QC]/.test(path)), "every territory tile must include a curved boundary");
});

test("territory subdivision produces 186 curved, selectable small regions", () => {
  const horizontal = buildTerritorySectorPaths({ x: 10, y: 20, width: 180, height: 80 }, 0);
  const vertical = buildTerritorySectorPaths({ x: 10, y: 20, width: 70, height: 180 }, 1);
  assert.equal(horizontal.length, TERRITORY_SECTOR_COUNT);
  assert.equal(vertical.length, TERRITORY_SECTOR_COUNT);
  assert.deepEqual(horizontal.map((sector) => sector.label), ["西部", "中央", "東部"]);
  assert.deepEqual(vertical.map((sector) => sector.label), ["北部", "中央", "南部"]);
  assert.ok([...horizontal, ...vertical].every((sector) => sector.d.includes("Q")));
  const totalDeclared = [...markup.matchAll(/data-tile-count="(\d+)"/g)].reduce((total, match) => total + Number(match[1]), 0);
  assert.equal(totalDeclared, 186);
  assert.match(appSource, /subdivideTerritoryTiles\(elements\.strategyMap\)/);
});

test("the political overlay uses stylized atlas textures clipped to exact national landmasses", () => {
  for (const asset of [oceanAsset, landAsset]) {
    assert.ok(existsSync(asset));
    assert.ok(statSync(asset).size > 1_000_000);
  }
  assert.match(markup, /class="map-ocean-texture"[^>]*world-map-ocean-painted\.png/);
  assert.match(markup, /id="atlasLandTexture"[\s\S]*world-map-land-painted\.png/);
  assert.doesNotMatch(markup, /terrain-satellite|world-terrain-satellite\.png/);
  assert.equal(markup.match(/class="country-landmass"/g)?.length, countryIds.length);
  assert.match(markup, /id="borderDisplace"/);
  assert.match(styleSource, /filter: url\(#borderDisplace\)/);
  assert.match(styleSource, /\.country-landmass/);
  assert.match(styleSource, /\.map-mode-terrain \.province/);
  assert.match(styleSource, /\.strategy-map\s*\{[^}]*overflow: hidden;/s);
  assert.match(styleSource, /\.strategy-map:not\(\.scale-world\) \.great-power,/);
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

test("country scale opens on the castle-centered frontier while world scale retains three great powers", () => {
  assert.match(markup, /class="strategy-map scale-country" viewBox="20 35 960 585"/);
  assert.match(markup, /data-scale="world">世界/);
  assert.match(markup, /data-scale="country" class="is-active">国家/);
  assert.equal(markup.match(/class="country-group [^"]*great-power"/g)?.length, 3);
  for (const countryId of ["deadland", "great_empire", "avanheln"]) {
    assert.match(markup, new RegExp(`data-country="${countryId}"[^>]*data-rank="great-power"`));
  }
  assert.match(markup, /data-country="deadland"[^>]*transform="translate\(-5 194\) scale\(\.78\)"/);
  assert.match(markup, /data-country="great_empire"[^>]*transform="translate\(213 20\) scale\(\.88\)"/);
  assert.match(markup, /data-country="avanheln"[^>]*transform="translate\(120 178\) scale\(\.9 \.82\)"/);
  assert.match(appSource, /world: "0 0 1800 1050"/);
  assert.match(appSource, /country: "20 35 960 585"/);
  assert.match(appSource, /scale: "country"/);
});

test("strategic map exposes castle garrisons, armies, routes, and a live pass state", () => {
  assert.equal(markup.match(/class="map-node city castle-node/g)?.length, 4);
  for (const id of ["mapForceSelene", "mapForceNereia", "mapForceOrta", "mapForceValka", "frontierArmyStrength", "enemyArmyStrength", "passStatusText"]) {
    assert.match(markup, new RegExp(`id="${id}"`));
  }
  assert.match(markup, /class="army-layer"/);
  assert.match(markup, /class="strategic-fronts"/);
  assert.match(styleSource, /\.castle-node/);
  assert.match(styleSource, /\.army-marker/);
  assert.match(styleSource, /\.hostile-corridor/);
  assert.match(appSource, /function renderStrategicMapState\(\)/);
  assert.match(appSource, /renderStrategicMapState\(\);/);
  assert.match(appSource, /state\.war \? `交戦中/);
});

test("world scale marks Leviathan as a selectable extreme-creature hazard", () => {
  assert.match(markup, /class="leviathan-layer world-only"/);
  assert.match(markup, /data-place-type="creature" data-place-id="leviathan"/);
  assert.match(markup, /超規格外生物/);
  assert.match(markup, /class="leviathan-danger-zone"/);
  assert.match(markup, /legend-leviathan/);
  assert.match(styleSource, /\.strategy-map:not\(\.scale-world\) \.world-only/);
  assert.match(styleSource, /\.leviathan-marker\.is-selected \.leviathan-danger-zone/);
  assert.match(appSource, /view\.selectedType === "creature"/);
  assert.match(appSource, /data-show-creature-on-map/);
});
