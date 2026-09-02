import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

import {
  getV3EntityArt,
  getV3LandmarkArt,
  getV3PlayerArt,
  getV3TerrainArt,
  V3_ART_ASSETS,
  V3_ENTITY_ART_BY_KEY,
  V3_LANDMARK_ART_BY_TYPE,
  V3_NON_ART_TERRAIN_TYPES,
  V3_PLAYER_ART_BY_RACE,
  V3_TERRAIN_ATLAS_SPEC,
  V3_TERRAIN_ART_BY_TYPE,
} from "../src/v3-art.js";

const ROOT = new URL("../", import.meta.url);

test("V3の高精細アトラスは実ファイルとして同梱される", () => {
  for (const [name, relativePath] of Object.entries(V3_ART_ASSETS)) {
    const file = new URL(relativePath.replace(/^\.\//, ""), ROOT);
    assert.ok(existsSync(file), `${name} is missing: ${relativePath}`);
    assert.ok(statSync(file).size > 200_000, `${name} must contain production artwork`);
  }
  assert.deepEqual(V3_TERRAIN_ATLAS_SPEC, {
    columns: 4,
    rows: 4,
    tilePixels: 384,
    width: 1536,
    height: 1536,
  });
  assert.equal(V3_TERRAIN_ATLAS_SPEC.width % V3_TERRAIN_ATLAS_SPEC.columns, 0);
  assert.equal(V3_TERRAIN_ATLAS_SPEC.height % V3_TERRAIN_ATLAS_SPEC.rows, 0);
});

test("V3の全地形表示はアトラス面または意図した未踏表示へ割り当てる", () => {
  const currentTypes = [
    "grass", "sand", "tundra", "snow", "water", "beach", "shoal", "tidal-flat",
    "river", "canyon-river", "canal", "spring", "oasis", "road", "forest", "marsh",
    "farmland", "hill", "mountain", "volcano", "crater", "cave", "mine", "ruins",
    "floating-island", "sky-peak", "settlement-ground", "settlement-village", "settlement-town", "settlement-city",
  ];
  assert.deepEqual(Object.keys(V3_TERRAIN_ART_BY_TYPE).sort(), [...currentTypes].sort());
  assert.deepEqual(V3_NON_ART_TERRAIN_TYPES, ["fog", "ungenerated", "void"]);
  for (const type of currentTypes) {
    const art = getV3TerrainArt(type);
    assert.equal(art.atlas, "terrain");
    assert.match(art.position, /^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/);
  }
});

test("地点、主人公、NPC、敵、拾得物に文字記号ではない実アートが揃う", () => {
  const landmarkTypes = ["settlement-village", "settlement-town", "settlement-city", "volcano", "crater", "cave", "mine", "ruins", "floating-island", "sky-peak"];
  assert.deepEqual(Object.keys(V3_LANDMARK_ART_BY_TYPE).sort(), [...landmarkTypes].sort());
  landmarkTypes.forEach((type) => assert.equal(getV3LandmarkArt(type).atlas, "object"));

  assert.deepEqual(Object.keys(V3_PLAYER_ART_BY_RACE).sort(), ["dwarf", "elf", "human", "orc"]);
  ["human", "elf", "dwarf", "orc"].forEach((raceId) => assert.equal(getV3PlayerArt(raceId).atlas, "entity"));

  const subjects = [
    { type: "npc", role: "merchant" }, { type: "npc", role: "villager" }, { type: "npc", role: "adventurer" },
    ...["green-slime", "goblin-scout", "wild-wolf", "road-bandit", "sand-scorpion", "marsh-leech", "reef-crab", "ember-lizard", "new-moon-ghost"].map((id) => ({ type: "enemy", id })),
    ...["medicinal-herb", "wild-berries", "iron-shard", "old-coin", "desert-salt", "shore-shell"].map((id) => ({ type: "item", id })),
    { type: "group-battle" },
  ];
  assert.equal(subjects.length, Object.keys(V3_ENTITY_ART_BY_KEY).length);
  subjects.forEach((subject) => assert.ok(getV3EntityArt(subject), `missing ${subject.type}:${subject.id ?? subject.role ?? "group"}`));
});

test("V3通常画面は文字駒を描かず、地図を端末解像度で描画する", () => {
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/v3-app.js", import.meta.url), "utf8");
  const groupCombat = readFileSync(new URL("../src/v3-group-combat.js", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../v3.css", import.meta.url), "utf8");
  assert.match(index, /assets\/ui\/v3-ui-icons\.svg#icon-underworld/);
  assert.match(index, /id="v3PersonalBattleArt"/);
  assert.doesNotMatch(index, /data-v3-move="north"[^>]*>▲</);
  assert.match(app, /getV3TerrainArt\(tile\.type\)/);
  assert.match(app, /--field-rows", view\.rows/);
  assert.match(app, /getV3EntityArt\(visibleEntity\)/);
  assert.doesNotMatch(app, /tile\.symbol\}\<\/span>/);
  assert.doesNotMatch(app, /visibleEntity\.symbol\}\<\/b>/);
  assert.doesNotMatch(app, /market\.worldEffect\.symbol/);
  assert.match(groupCombat, /portraitImage: playerPortrait/);
  assert.match(groupCombat, /assets\/generated\/officer-gaius\.webp/);
  assert.match(groupCombat, /assets\/generated\/officer-edras\.webp/);
  assert.match(app, /window\.devicePixelRatio/);
  assert.match(app, /drawing\.setTransform\(pixelRatio/);
  assert.match(styles, /field-terrain-atlas-v2\.webp/);
  assert.doesNotMatch(styles, /field-terrain-atlas\.webp/);
  assert.match(styles, /grid-template-rows: repeat\(var\(--field-rows\), minmax\(0, 1fr\)\)/);
  assert.match(styles, /field-object-atlas\.webp/);
  assert.match(styles, /field-entity-atlas\.webp/);
  assert.match(styles, /launch-hero\.webp/);
  assert.match(styles, /image-rendering: auto/);
});
