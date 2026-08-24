import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import {
  createV3FieldState,
  createV3WorldContext,
  getV3DetailedTile,
  moveV3Player,
} from "../src/v3-field-system.js";
import {
  V3_WORLD_EFFECT_DEFINITIONS,
  V3_WORLD_EFFECT_FRONT_LIMIT,
  V3_WORLD_EFFECTS_VERSION,
  applyV3WorldEffectToTile,
  createV3WorldEffects,
  getV3CelestialEffects,
  getV3RaceWorldEffectAt,
  getV3WartimeMarketEffect,
  getV3WorldEffectAt,
  getV3WorldEffectsView,
  normalizeV3WorldEffectsState,
} from "../src/v3-world-effects.js";

const OPTIONS = Object.freeze({ seed: "v3-world-effects-fixture", width: 40, height: 24, plateCount: 6, nationCount: 3 });

function fixture() {
  const options = createGeneratedWorldState(OPTIONS);
  const runtime = buildGeneratedWorld(options);
  const context = createV3WorldContext(runtime, options.seed);
  return { runtime, context, options };
}

function manualFront(state, type = "storm") {
  const definition = V3_WORLD_EFFECT_DEFINITIONS[type];
  return {
    version: V3_WORLD_EFFECTS_VERSION,
    seed: state.seed,
    period: "317-4",
    year: 317,
    month: 4,
    fronts: [{
      id: `manual:${type}`,
      type,
      name: definition.name,
      symbol: definition.symbol,
      color: definition.color,
      x: Math.floor(state.player.x / 8),
      y: Math.floor(state.player.y / 8),
      radius: 5,
      intensity: 3,
      direction: 120,
      regionId: null,
      regionName: null,
      terrain: "grassland",
      summary: definition.description,
      sourceType: type,
    }],
  };
}

test("世界現象は同じシード・年月・地理から同じ前線を作り、月が変わると更新される", () => {
  const { context } = fixture();
  const aprilLeft = createV3WorldEffects(context, { year: 317, month: 4 });
  const aprilRight = createV3WorldEffects(context, { year: 317, month: 4 });
  const may = createV3WorldEffects(context, { year: 317, month: 5 });
  assert.deepEqual(aprilLeft, aprilRight);
  assert.equal(aprilLeft.version, V3_WORLD_EFFECTS_VERSION);
  assert.ok(aprilLeft.fronts.length >= 1);
  assert.ok(aprilLeft.fronts.length <= V3_WORLD_EFFECT_FRONT_LIMIT);
  assert.ok(aprilLeft.fronts.every((front) => V3_WORLD_EFFECT_DEFINITIONS[front.type] && front.radius >= 1));
  assert.notDeepEqual(aprilLeft.fronts.map((front) => front.id), may.fronts.map((front) => front.id));
});

test("前線の範囲・強度は詳細マスへ投影され、移動時間と遭遇危険度を同じ効果から補正する", () => {
  const { context } = fixture();
  const base = createV3FieldState(context, { playerName: "気象観測者" });
  const state = { ...base, worldEffects: manualFront(base, "storm") };
  const current = getV3DetailedTile(context, state.player.x, state.player.y);
  const effect = getV3WorldEffectAt(context, state, current.x, current.y);
  const projected = applyV3WorldEffectToTile(context, state, current);
  assert.equal(effect.type, "storm");
  assert.ok(projected.travelMinutes > current.travelMinutes);
  assert.ok(projected.dangerBias > current.dangerBias);
  assert.match(projected.effectNote, /暴風雨/);

  const directions = [
    { name: "north", dx: 0, dy: -1 },
    { name: "east", dx: 1, dy: 0 },
    { name: "south", dx: 0, dy: 1 },
    { name: "west", dx: -1, dy: 0 },
  ];
  const choice = directions
    .map((direction) => ({ direction, tile: getV3DetailedTile(context, state.player.x + direction.dx, state.player.y + direction.dy) }))
    .find(({ tile }) => tile.passable);
  assert.ok(choice);
  const destinationKey = `${choice.tile.x},${choice.tile.y}`;
  const safeState = { ...state, interactedTiles: [...state.interactedTiles, destinationKey] };
  const expected = applyV3WorldEffectToTile(context, safeState, choice.tile);
  const moved = moveV3Player(context, safeState, choice.direction.name);
  assert.equal(moved.clockMinutes - safeState.clockMinutes, expected.travelMinutes);
  assert.match(moved.messageLog[0], /暴風雨の影響/);
});

test("旧V3状態は現在月の世界現象を加算し、世界地図用ビューは現地補正を説明する", () => {
  const { context } = fixture();
  const field = createV3FieldState(context);
  const normalized = normalizeV3WorldEffectsState(context, { ...field, worldEffects: null });
  const view = getV3WorldEffectsView(context, normalized);
  assert.equal(normalized.worldEffects.period, "317-4");
  assert.ok(Array.isArray(view.fronts));
  if (view.local) {
    assert.ok(view.local.travelMultiplier >= 1);
    assert.ok(view.local.dangerDelta >= 0);
  }
});

test("主月の30日周期は夜の新月と満月をシステム効果として返す", () => {
  const { context } = fixture();
  const base = createV3FieldState(context);
  const newMoonMinutes = 21 * 60;
  const newMoon = getV3CelestialEffects(context, { ...base, clock: { ...base.clock, elapsedMinutes: newMoonMinutes }, clockMinutes: newMoonMinutes });
  assert.equal(newMoon.phaseId, "new_moon");
  assert.equal(newMoon.active[0].id, "new_moon");
  assert.equal(newMoon.primaryMoon, context.runtime.terrain.astronomy.moons[0]);

  const fullMoonMinutes = 14 * 24 * 60 + 21 * 60;
  const fullMoonState = { ...base, clock: { ...base.clock, elapsedMinutes: fullMoonMinutes }, clockMinutes: fullMoonMinutes };
  const fullMoon = getV3CelestialEffects(context, fullMoonState);
  assert.equal(fullMoon.phaseId, "full_moon");
  assert.equal(fullMoon.active[0].id, "full_moon");
  assert.ok(getV3RaceWorldEffectAt(context, fullMoonState, "demon").modifiers.magicPower > 1);
});

test("同じ長雨でも種族生態により実移動時間と危険度が変わる", () => {
  const { context } = fixture();
  const base = createV3FieldState(context);
  const effects = manualFront(base, "rain");
  const humanState = { ...base, player: { ...base.player, raceId: "human" }, worldEffects: effects };
  const elfState = { ...base, player: { ...base.player, raceId: "elf" }, worldEffects: effects };
  const tile = getV3DetailedTile(context, base.player.x, base.player.y);
  const human = applyV3WorldEffectToTile(context, humanState, tile);
  const elf = applyV3WorldEffectToTile(context, elfState, tile);
  assert.ok(elf.travelMinutes <= human.travelMinutes);
  assert.ok(elf.dangerBias < human.dangerBias);
  assert.match(elf.effectNote, /森雨同調/);
});

test("戦争中の国家は地域と交戦数から商品別の高騰・在庫圧力を返す", () => {
  const marketEffect = getV3WartimeMarketEffect({
    nationId: "nation-a",
    nationName: "試験国",
    regionId: "region-front",
    activeWars: [{ id: "war-1", attackerNationId: "nation-a", defenderNationId: "nation-b", targetRegionId: "region-front" }],
  });
  assert.equal(marketEffect.effectId, "wartime_scarcity");
  assert.ok(marketEffect.commodityPriceMultipliers.iron > marketEffect.commodityPriceMultipliers.wool);
  assert.ok(marketEffect.commodityStockMultipliers.grain < 1);
  assert.match(marketEffect.summary, /戦争中/);
});

test("V3通常画面は現象レイヤー、現地演出、影響説明、低モーション契約を持つ", async () => {
  const [index, app, styles] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/v3-app.js", import.meta.url), "utf8"),
    readFile(new URL("../v3.css", import.meta.url), "utf8"),
  ]);
  assert.match(index, /data-v3-map-layer="effects"/);
  assert.match(index, /id="v3WorldEffectVisual"/);
  assert.match(index, /id="v3WeatherLabel"/);
  assert.match(index, /id="v3PlayerRace"/);
  assert.match(index, /id="v3RaceEffectLabel"/);
  assert.match(index, /id="v3WorldEffects"/);
  assert.match(app, /drawWorldEffectFronts/);
  assert.match(app, /renderLocalWorldEffect/);
  assert.match(app, /raceResponse/);
  assert.match(app, /getV3WartimeMarketEffect/);
  assert.match(app, /最大\+\$\{front\.travelPenaltyPercent\}%/);
  assert.match(app, /function closeWorldMap\(\)/);
  for (const motion of ["rain", "storm", "snow", "blizzard", "sandstorm", "heatwave", "fog", "ashfall"]) {
    assert.match(styles, new RegExp(`\\.v3-world-effect-visual\\.is-${motion}`));
  }
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
