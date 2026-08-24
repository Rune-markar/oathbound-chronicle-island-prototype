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
  getV3LocationSummary,
  getV3TileEntity,
  moveV3Player,
  normalizeV3FieldState,
  resolveV3Encounter,
} from "../src/v3-field-system.js";
import {
  V3_GROUP_BATTLE_BRIDGE_KEY,
  advanceV3MilitaryArrival,
  applyV3GroupBattleReturn,
  cancelV3GroupBattleBridge,
  completeV3GroupBattleBridge,
  createV3GroupBattleHandoff,
  getV3MilitaryView,
  readV3GroupBattleBridge,
  startV3MilitaryMission,
  writeV3GroupBattleBridge,
} from "../src/v3-group-combat.js";
import {
  createBattlePreparation,
  finalizeBattlePreparation,
  setBattleLogisticsPlan,
} from "../src/battle-preparation.js";
import { createBattleResult } from "../src/battle-results.js";
import { executeBattleTurn } from "../src/tactical-battle.js";

function fixtureRuntime() {
  const width = 8;
  const height = 8;
  const nation = {
    id: "nation-1",
    name: "試験王国",
    color: "#668855",
    polity: { formName: "王国", politicalSystemName: "封建君主制", rulerTitle: "国王", capitalTitle: "王都" },
  };
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
  const settlement = {
    id: "village-1",
    name: "試験村",
    settlementLevel: "village",
    importance: 1,
    population: 600,
    nationId: nation.id,
    regionId: region.id,
    tileIndex: 27,
    x: 3,
    y: 3,
    primaryFunction: { id: "commercial_city", name: "商業都市" },
    functionIds: ["commercial_city"],
    functions: [{ id: "commercial_city", name: "商業都市" }],
    services: ["market"],
    gameplay: { merchantBias: 0.18, adventurerBias: 0, merchantPriceModifier: -2 },
  };
  return {
    terrain: { width, height, seed: "v3-fixture", config: { width, height, wrapX: true } },
    tiles,
    nations: { nations: [nation], regions: [region], objects: [settlement], roads: [{ id: "road-1", tileIndices: [19, 27, 35] }] },
    nationById: new Map([[nation.id, nation]]),
    regionById: new Map([[region.id, region]]),
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function detailedMacroTiles(context, macroX, macroY) {
  const tiles = [];
  for (let localY = 0; localY < V3_DETAIL_SCALE; localY += 1) {
    for (let localX = 0; localX < V3_DETAIL_SCALE; localX += 1) {
      tiles.push(getV3DetailedTile(
        context,
        macroX * V3_DETAIL_SCALE + localX,
        macroY * V3_DETAIL_SCALE + localY,
      ));
    }
  }
  return tiles;
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
  const base = createV3FieldState(context);
  const directions = [
    { name: "north", dx: 0, dy: -1 },
    { name: "east", dx: 1, dy: 0 },
    { name: "south", dx: 0, dy: 1 },
    { name: "west", dx: -1, dy: 0 },
  ];
  const blockedEntities = directions.map(({ dx, dy }) => `${(base.player.x + dx + context.width) % context.width},${base.player.y + dy}`);
  const state = { ...base, interactedTiles: blockedEntities };
  const choice = directions
    .map((direction) => ({ direction, destination: getV3DetailedTile(context, base.player.x + direction.dx, base.player.y + direction.dy) }))
    .find(({ destination }) => destination.passable);
  assert.ok(choice);
  const moved = moveV3Player(context, state, choice.direction.name);
  assert.ok(moved);
  assert.equal(moved.clockMinutes, state.clockMinutes + choice.destination.travelMinutes);
  assert.match(moved.messageLog[0], new RegExp(`${choice.destination.travelMinutes}分`));
  assert.notDeepEqual([moved.player.x, moved.player.y], [state.player.x, state.player.y]);
  assert.ok(moved.discoveredTiles.length >= state.discoveredTiles.length);
});

test("複合地理はオアシス・農地・運河・沿岸・探索地点として詳細マスへ現れる", () => {
  const runtime = fixtureRuntime();
  Object.assign(runtime.tiles[10], {
    geographyTags: ["desert", "sand_desert", "oasis", "spring"],
    primaryGeography: "oasis",
  });
  Object.assign(runtime.tiles[18], {
    geographyTags: ["grassland", "farmland", "canal"],
    landUse: "farmland",
    infrastructure: "canal",
  });
  Object.assign(runtime.tiles[22], {
    geographyTags: ["grassland", "cave"],
    terrainSite: { id: "fixture-cave", type: "cave", name: "試験洞窟", category: "site" },
  });
  Object.assign(runtime.tiles[50], {
    geographyTags: ["forest", "rainforest"],
    feature: "rainforest",
  });
  Object.assign(runtime.tiles[16], {
    terrain: "coast",
    passable: false,
    geographyTags: ["sea", "coast", "shoal", "tidal_flat"],
  });
  const context = createV3WorldContext(runtime, "geography-fixture");

  const oasisTypes = new Set(detailedMacroTiles(context, 2, 1).map((tile) => tile.type));
  assert.ok(oasisTypes.has("spring"));
  assert.ok(oasisTypes.has("oasis"));
  const cultivatedTypes = new Set(detailedMacroTiles(context, 2, 2).map((tile) => tile.type));
  assert.ok(cultivatedTypes.has("farmland"));
  assert.ok(cultivatedTypes.has("canal"));
  assert.ok(detailedMacroTiles(context, 6, 2).some((tile) => tile.type === "cave" && tile.name === "試験洞窟"));
  assert.ok(detailedMacroTiles(context, 2, 6).some((tile) => tile.type === "forest" && tile.name === "密林"));
  const coastTypes = new Set(detailedMacroTiles(context, 0, 2).map((tile) => tile.type));
  assert.ok(coastTypes.has("tidal-flat"));
  assert.ok(coastTypes.has("shoal"));
  assert.ok(coastTypes.has("water"));

  const farmland = detailedMacroTiles(context, 2, 2).find((tile) => tile.type === "farmland");
  const oasis = detailedMacroTiles(context, 2, 1).find((tile) => tile.type === "oasis");
  assert.ok(farmland.travelMinutes < getV3DetailedTile(context, 2 * V3_DETAIL_SCALE, 6 * V3_DETAIL_SCALE).travelMinutes);
  assert.ok(oasis.dangerBias < getV3DetailedTile(context, 2 * V3_DETAIL_SCALE, 6 * V3_DETAIL_SCALE).dangerBias);
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

test("集落で受けたV3軍務は1マス移動で作戦地点へ到達して集団戦になる", () => {
  const context = createV3WorldContext(fixtureRuntime(), "v3-group-mission");
  const initial = createV3FieldState(context, { playerName: "指揮者" });
  const available = getV3MilitaryView(context, initial);
  assert.equal(available.canAccept, true);
  const accepted = startV3MilitaryMission(context, initial);
  assert.equal(advanceV3MilitaryArrival(context, accepted, accepted), accepted);
  const mission = accepted.military.activeMission;
  assert.equal(mission.combatScale, "group-units");
  assert.ok(mission.target.x !== initial.player.x || mission.target.y !== initial.player.y);

  const approaches = [
    { name: "north", dx: 0, dy: -1 },
    { name: "east", dx: 1, dy: 0 },
    { name: "south", dx: 0, dy: 1 },
    { name: "west", dx: -1, dy: 0 },
  ];
  let arrival = null;
  for (const approach of approaches) {
    const sourceX = ((mission.target.x - approach.dx) % context.width + context.width) % context.width;
    const sourceY = mission.target.y - approach.dy;
    if (sourceY < 0 || sourceY >= context.height || !getV3DetailedTile(context, sourceX, sourceY).passable) continue;
    const before = { ...accepted, player: { ...accepted.player, x: sourceX, y: sourceY }, pendingEncounter: null };
    const moved = moveV3Player(context, before, approach.name);
    if (moved.player.x !== mission.target.x || moved.player.y !== mission.target.y) continue;
    arrival = advanceV3MilitaryArrival(context, before, moved);
    break;
  }
  assert.ok(arrival);
  assert.equal(arrival.pendingEncounter.type, "group-battle");
  assert.equal(arrival.pendingEncounter.combatScale, "group-units");
  assert.equal(arrival.military.activeMission.status, "battle-ready");
});

test("V3集団戦は既存の編成・兵站・20×14戦術盤・リザルトを往復する", () => {
  const context = createV3WorldContext(fixtureRuntime(), "v3-group-handoff");
  let state = startV3MilitaryMission(context, createV3FieldState(context, { playerName: "指揮者" }));
  const target = state.military.activeMission.target;
  state = {
    ...state,
    player: { ...state.player, x: target.x, y: target.y },
    military: { ...state.military, activeMission: { ...state.military.activeMission, status: "battle-ready" } },
    pendingEncounter: { type: "group-battle", combatScale: "group-units", missionId: state.military.activeMission.id },
  };
  const handoff = createV3GroupBattleHandoff(context, state);
  assert.equal(handoff.request.battle.combatScale, "group-units");
  assert.equal(handoff.request.battle.map.width, 20);
  assert.equal(handoff.request.battle.map.height, 14);
  assert.equal(handoff.request.roster.length, 3);

  let preparation = createBattlePreparation({
    battle: handoff.request.battle,
    roster: handoff.request.roster,
    defaultParticipantIds: handoff.request.defaultParticipantIds,
  });
  preparation = setBattleLogisticsPlan(preparation, "extended");
  let battle = finalizeBattlePreparation(preparation);
  assert.equal(battle.preparation.logisticsPlanId, "extended");
  assert.equal(battle.preparation.participantIds.length, 3);
  for (let turn = 0; turn < 100 && !battle.winner; turn += 1) battle = executeBattleTurn(battle);
  assert.ok(battle.winner, "既存戦術エンジンで決着する");
  const result = createBattleResult(battle);

  const storage = memoryStorage();
  writeV3GroupBattleBridge(storage, handoff.request);
  assert.equal(readV3GroupBattleBridge(storage).requestId, handoff.request.requestId);
  const completed = completeV3GroupBattleBridge(storage, handoff.request.requestId, result);
  const returned = applyV3GroupBattleReturn(handoff.state, completed);
  assert.equal(returned.military.activeMission, null);
  assert.equal(returned.military.history[0].battleId, result.battleId);
  assert.ok(returned.military.merit > 0);
  assert.equal(returned.pendingEncounter, null);
});

test("V3集団戦の戦闘前編成を中止すると作戦地点から再開できる", () => {
  const context = createV3WorldContext(fixtureRuntime(), "v3-group-cancel");
  let state = startV3MilitaryMission(context, createV3FieldState(context));
  const target = state.military.activeMission.target;
  state = {
    ...state,
    player: { ...state.player, x: target.x, y: target.y },
    military: { ...state.military, activeMission: { ...state.military.activeMission, status: "battle-ready" } },
  };
  const handoff = createV3GroupBattleHandoff(context, state);
  const storage = memoryStorage();
  writeV3GroupBattleBridge(storage, handoff.request);
  const cancelled = cancelV3GroupBattleBridge(storage, handoff.request.requestId);
  const returned = applyV3GroupBattleReturn(handoff.state, cancelled);
  assert.equal(returned.military.activeMission.status, "battle-ready");
  assert.equal(returned.pendingEncounter.type, "group-battle");
  assert.equal(storage.getItem(V3_GROUP_BATTLE_BRIDGE_KEY) !== null, true);
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
  const localMerchants = entities.filter((entity) => entity.type === "npc" && entity.role === "merchant" && entity.settlementId === "village-1");
  assert.ok(localMerchants.length > 0);
  assert.ok(localMerchants.every((merchant) => merchant.price === 3 && merchant.settlementFunctionName === "商業都市"));
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

test("現在地要約は国家体制と最寄り集落の都市機能を参照できる", () => {
  const context = createV3WorldContext(fixtureRuntime());
  const summary = getV3LocationSummary(context, {
    player: { x: 3 * V3_DETAIL_SCALE + 4, y: 3 * V3_DETAIL_SCALE + 4 },
    clockMinutes: 8 * 60,
  });
  assert.equal(summary.nation.polity.formName, "王国");
  assert.equal(summary.nearestSettlement.settlement.name, "試験村");
  assert.equal(summary.nearestSettlementFunction.name, "商業都市");
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

test("既定入口はV3フィールドで、個人戦はフィールド内、集団戦は旧版専用画面へ接続する", async () => {
  const [index, legacy, app, legacyApp, styles, legacyStyles] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../legacy-v2.html", import.meta.url), "utf8"),
    readFile(new URL("../src/v3-app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../v3.css", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(index, /GENERATION V3/);
  assert.match(index, /id="v3Field"/);
  assert.match(index, /id="v3WorldCanvas"/);
  assert.match(index, /id="v3WorldMapDossier"/);
  assert.match(index, /id="v3PersonalBattleStatus"/);
  assert.match(index, /id="v3PersonalBattleCommands"/);
  assert.match(index, /id="v3MilitaryButton"/);
  assert.match(index, /id="v3TerrainEffect"/);
  assert.match(app, /encounter\?\.type === "enemy"/);
  assert.match(app, /encounterModal\.hidden = !encounter \|\| Boolean\(personalEnemy\)/);
  assert.match(app, /createV3GroupBattleHandoff/);
  assert.match(app, /startV3MilitaryMission\(context, state, worldSimulation\)/);
  assert.match(app, /legacy-v2\.html/);
  assert.match(app, /polity\?\.politicalSystemName/);
  assert.match(styles, /\.v3-world-current-polity/);
  assert.match(styles, /\.v3-game\.is-personal-battle \.v3-field-shell/);
  assert.match(styles, /\.v3-tile\.is-oasis/);
  assert.match(styles, /\.v3-tile\.is-volcano/);
  assert.match(styles, /\.v3-world-map > footer i\.is-site/);
  assert.match(index, /legacy-v2\.html/);
  assert.match(legacy, /src\/app\.js/);
  assert.match(legacy, /id="battlePreparationScreen"/);
  assert.match(legacy, /id="tacticalBattleScreen"/);
  assert.match(legacy, /id="tacticalResultScreen"/);
  assert.match(legacyApp, /requestedV3GroupBattleBridge/);
  assert.match(legacyApp, /completeV3GroupBattleBridge/);
  assert.match(legacyApp, /V3フィールドへ戦果を戻す/);
  assert.match(legacyApp, /V3作戦勝利/);
  assert.match(legacyStyles, /\.battle-preparation-footer > button \{[^}]*min-height: 44px/);
  assert.match(legacyStyles, /\.battle-preparation-header > div:last-child button \{[^}]*min-height: 44px/);
  assert.match(legacyStyles, /\.tactical-result-actions button \{[^}]*min-height: 44px/);
});
