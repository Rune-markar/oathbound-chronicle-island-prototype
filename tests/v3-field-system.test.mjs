import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  V3_CHUNK_SIZE,
  V3_DETAIL_SCALE,
  advanceV3BackgroundGeneration,
  createV3FieldState,
  createV3WorldContext,
  getV3CombatPresentation,
  getV3DetailedTile,
  getV3FieldView,
  getV3TileEntity,
  moveV3Player,
  normalizeV3FieldState,
  resolveV3Encounter,
} from "../src/v3-field-system.js";

function fixtureRuntime() {
  const width = 8;
  const height = 8;
  const nation = { id: "nation-1", name: "試験王国", color: "#668855" };
  const region = { id: "region-1", nationId: nation.id, name: "試験地方" };
  const tiles = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const water = x === 0;
    return {
      id: `tile-${x}-${y}`,
      index,
      x,
      y,
      terrain: water ? "water" : y === 1 ? "desert" : "grassland",
      relief: x === 7 ? "mountains" : "flat",
      feature: y === 6 ? "forest" : null,
      passable: !water,
      nationId: water ? null : nation.id,
      regionId: water ? null : region.id,
      riverId: y === 5 ? "river-1" : null,
    };
  });
  const settlement = { id: "village-1", name: "試験村", settlementLevel: "village", importance: 1, population: 600, nationId: nation.id, regionId: region.id, tileIndex: 27, x: 3, y: 3 };
  return {
    terrain: { width, height, seed: "v3-fixture", config: { width, height, wrapX: true } },
    tiles,
    nations: { nations: [nation], regions: [region], objects: [settlement], roads: [{ id: "road-1", tileIndices: [19, 27, 35] }] },
    nationById: new Map([[nation.id, nation]]),
    regionById: new Map([[region.id, region]]),
  };
}

test("概算世界の1マスを8×8の詳細地形へ投影する", () => {
  const context = createV3WorldContext(fixtureRuntime());
  assert.equal(context.width, 8 * V3_DETAIL_SCALE);
  assert.equal(getV3DetailedTile(context, 1, 1).passable, false);
  const desertDetail = getV3DetailedTile(context, 12, 12);
  assert.equal(desertDetail.macroTile.terrain, "desert");
  assert.equal(desertDetail.passable, true);
  const settlement = getV3DetailedTile(context, 3 * V3_DETAIL_SCALE + 4, 3 * V3_DETAIL_SCALE + 4);
  assert.equal(settlement.name, "試験村");
  assert.equal(settlement.symbol, "村");
});

test("開始時は周辺チャンクだけを生成し、待機生成は1区画ずつ進む", () => {
  const context = createV3WorldContext(fixtureRuntime());
  const state = createV3FieldState(context, { playerName: "旅人" });
  const totalChunks = Math.ceil(context.width / V3_CHUNK_SIZE) * Math.ceil(context.height / V3_CHUNK_SIZE);
  assert.ok(state.generatedChunks.length > 0);
  assert.ok(state.generatedChunks.length < totalChunks);
  const advanced = advanceV3BackgroundGeneration(context, state);
  assert.equal(advanced.generatedChunks.length, state.generatedChunks.length + 1);
  const view = getV3FieldView(context, advanced);
  assert.equal(view.columns, 13);
  assert.equal(view.rows, 11);
  assert.ok(view.tiles.some((tile) => tile.player));
});

test("プレイヤーは通行可能な隣の1マスへだけ進み、発見範囲と時刻を更新する", () => {
  const context = createV3WorldContext(fixtureRuntime());
  const state = createV3FieldState(context);
  const directions = ["north", "east", "south", "west"];
  const moved = directions.map((direction) => moveV3Player(context, state, direction)).find((candidate) => candidate.steps === 1);
  assert.ok(moved);
  assert.equal(moved.clockMinutes, state.clockMinutes + 10);
  assert.notDeepEqual([moved.player.x, moved.player.y], [state.player.x, state.player.y]);
  assert.ok(moved.discoveredTiles.length >= state.discoveredTiles.length);
});

test("個人戦は現在のフィールド、集団戦は従来の専用戦闘画面を使う", () => {
  const personal = getV3CombatPresentation("personal-units");
  assert.equal(personal.surface, "field-inline");
  assert.equal(personal.usesPreparation, false);
  assert.equal(personal.usesLogistics, false);
  assert.equal(personal.usesDedicatedResult, false);

  const group = getV3CombatPresentation("group-units");
  assert.equal(group.surface, "dedicated-tactical");
  assert.equal(group.usesPreparation, true);
  assert.equal(group.usesLogistics, true);
  assert.equal(group.usesDedicatedResult, true);
});

test("村の周辺には村人・冒険者・商人、野外には敵とアイテムが決定論的に現れる", () => {
  const runtime = fixtureRuntime();
  const context = createV3WorldContext(runtime, "encounter-fixture");
  const emptyState = { defeatedTiles: [], collectedTiles: [], interactedTiles: [] };
  const entities = [];
  for (let y = 0; y < context.height; y += 1) {
    for (let x = 0; x < context.width; x += 1) {
      const entity = getV3TileEntity(context, x, y, emptyState);
      if (entity) entities.push(entity);
    }
  }
  assert.ok(entities.some((entity) => entity.type === "enemy"));
  assert.ok(entities.some((entity) => entity.type === "item"));
  assert.ok(entities.some((entity) => entity.type === "npc" && ["villager", "adventurer"].includes(entity.role)));
  assert.ok(entities.some((entity) => entity.type === "npc" && entity.role === "merchant"));
  const fieldState = createV3FieldState(context);
  const startingEnemies = [];
  for (let dy = -40; dy <= 40; dy += 1) {
    for (let dx = -40; dx <= 40; dx += 1) {
      const entity = getV3TileEntity(context, fieldState.player.x + dx, fieldState.player.y + dy, fieldState);
      if (entity?.type === "enemy") startingEnemies.push(entity);
    }
  }
  assert.ok(startingEnemies.length > 0);
  assert.ok(startingEnemies.every((entity) => entity.level === 1));
});

test("敵を発見すると敵の手前で止まり、探索中と同じ詳細マップが個人戦になる", () => {
  const context = createV3WorldContext(fixtureRuntime(), "encounter-fixture");
  const base = createV3FieldState(context);
  const directions = [
    { name: "north", dx: 0, dy: -1 },
    { name: "east", dx: 1, dy: 0 },
    { name: "south", dx: 0, dy: 1 },
    { name: "west", dx: -1, dy: 0 },
  ];
  let result = null;
  for (let y = 1; y < context.height - 1 && !result; y += 1) {
    for (let x = 0; x < context.width && !result; x += 1) {
      if (getV3TileEntity(context, x, y, base)?.type !== "enemy") continue;
      for (const direction of directions) {
        const sourceX = ((x - direction.dx) % context.width + context.width) % context.width;
        const sourceY = y - direction.dy;
        if (!getV3DetailedTile(context, sourceX, sourceY).passable) continue;
        const state = { ...base, player: { ...base.player, x: sourceX, y: sourceY }, pendingEncounter: null };
        const moved = moveV3Player(context, state, direction.name);
        if (moved.pendingEncounter?.type !== "enemy") continue;
        result = { state, moved, enemyX: x, enemyY: y };
        break;
      }
    }
  }
  assert.ok(result);
  assert.deepEqual(
    [result.moved.player.x, result.moved.player.y],
    [result.state.player.x, result.state.player.y],
    "敵のいるマスへ重ならず、発見した位置で止まる",
  );
  assert.equal(result.moved.pendingEncounter.combatScale, "personal-units");
  assert.deepEqual(
    [result.moved.pendingEncounter.worldX, result.moved.pendingEncounter.worldY],
    [result.enemyX, result.enemyY],
  );
  assert.match(result.moved.messageLog[0], /発見した。足元の地形で個人戦/);
  assert.doesNotMatch(result.moved.messageLog[1] ?? "", /進んだ/);
  const field = getV3FieldView(context, result.moved);
  assert.ok(field.tiles.some((tile) => tile.player));
  assert.ok(field.tiles.some((tile) => tile.x === result.enemyX && tile.y === result.enemyY && tile.entity?.type === "enemy"));
});

test("敵との遭遇は戦闘解決でき、V3セーブは同じ世界へ正規化できる", () => {
  const context = createV3WorldContext(fixtureRuntime());
  let state = createV3FieldState(context);
  state = { ...state, pendingEncounter: { type: "enemy", id: "slime", name: "試験スライム", symbol: "粘", level: 1, hp: 1, maxHp: 1, power: 1, xp: 5, gold: 2, combatScale: "personal-units", worldX: 1, worldY: 1, tileKey: "1,1" } };
  const won = resolveV3Encounter(context, state, "fight");
  assert.equal(won.pendingEncounter, null);
  assert.equal(won.player.xp, 5);
  assert.ok(won.defeatedTiles.includes("1,1"));
  const restored = normalizeV3FieldState(context, JSON.parse(JSON.stringify(won)));
  assert.equal(restored.player.xp, 5);
  assert.equal(restored.version, 3);
});

test("個人戦の退避は失敗時の被害を保ちつつ、再試行ごとに再判定される", () => {
  const context = createV3WorldContext(fixtureRuntime(), "flee-retry-0");
  let state = createV3FieldState(context);
  state = {
    ...state,
    pendingEncounter: {
      type: "enemy", id: "wolf", name: "試験狼", symbol: "狼", level: 1,
      hp: 20, maxHp: 20, power: 3, xp: 7, gold: 3, combatScale: "personal-units",
      fleeAttempts: 0, worldX: state.player.x + 1, worldY: state.player.y, tileKey: "retry",
    },
  };
  let attempts = 0;
  while (state.pendingEncounter && attempts < 12) {
    const previousHp = state.player.hp;
    state = resolveV3Encounter(context, state, "flee");
    attempts += 1;
    if (state.pendingEncounter) {
      assert.equal(state.pendingEncounter.fleeAttempts, attempts);
      assert.ok(state.player.hp < previousHp || state.player.hp === 1);
    }
  }
  assert.equal(state.pendingEncounter, null);
  assert.ok(attempts > 1 && attempts < 12);
});

test("既定入口はV3フィールドで、個人戦はフィールド内、旧版の集団戦画面は保持する", async () => {
  const [index, legacy, app, styles] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../legacy-v2.html", import.meta.url), "utf8"),
    readFile(new URL("../src/v3-app.js", import.meta.url), "utf8"),
    readFile(new URL("../v3.css", import.meta.url), "utf8"),
  ]);
  assert.match(index, /GENERATION V3/);
  assert.match(index, /id="v3Field"/);
  assert.match(index, /id="v3WorldCanvas"/);
  assert.match(index, /id="v3PersonalBattleStatus"/);
  assert.match(index, /id="v3PersonalBattleCommands"/);
  assert.match(app, /encounter\?\.type === "enemy"/);
  assert.match(app, /encounterModal\.hidden = !encounter \|\| Boolean\(personalEnemy\)/);
  assert.match(styles, /\.v3-game\.is-personal-battle \.v3-field-shell/);
  assert.match(index, /legacy-v2\.html/);
  assert.match(legacy, /src\/app\.js/);
  assert.match(legacy, /id="battlePreparationScreen"/);
  assert.match(legacy, /id="tacticalBattleScreen"/);
  assert.match(legacy, /id="tacticalResultScreen"/);
});
