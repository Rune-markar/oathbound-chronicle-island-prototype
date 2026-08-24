import {
  getV3DetailedTile,
  getV3TileEntity,
  nearestV3Settlement,
  v3HashUnit,
} from "./v3-field-system.js";
import {
  createNationalArmyUnitSpecs,
  getNationalArmySummary,
  getNationalUnitProfile,
} from "./national-unit-system.js";
import {
  createBattleMap,
  createBattleState,
  createCombatUnit,
  createCommander,
  setBattleTerrain,
} from "./tactical-battle.js";
import {
  getV3NationAtTile,
  getV3WorldSimulationView,
} from "./v3-world-simulation.js";
import { bindV3BattleToStrategicWar } from "./v3-battle-strategy.js";

export const V3_GROUP_BATTLE_BRIDGE_KEY = "leviathan-covenant-v3-group-battle-bridge";
export const V3_GROUP_BATTLE_BRIDGE_VERSION = 1;

const MISSION_SCHEMA_VERSION = 1;
export const V3_MILITARY_VERSION = MISSION_SCHEMA_VERSION;
const TARGET_MINIMUM_DISTANCE = 7;
const TARGET_MAXIMUM_DISTANCE = 12;
const DIRECTIONS = Object.freeze([
  Object.freeze({ dx: 0, dy: -1 }),
  Object.freeze({ dx: 1, dy: 0 }),
  Object.freeze({ dx: 0, dy: 1 }),
  Object.freeze({ dx: -1, dy: 0 }),
]);

const clone = (value) => structuredClone(value);
const wrapped = (value, size) => ((value % size) + size) % size;
const tileKey = (x, y) => `${x},${y}`;

function addMessage(state, message) {
  return [message, ...(state.messageLog ?? [])].slice(0, 8);
}

function normalizeNation(nation, fallbackId, fallbackName) {
  const requestedPeopleId = nation?.peopleId ?? "human";
  const peopleId = getNationalUnitProfile(requestedPeopleId) ? requestedPeopleId : "human";
  const name = String(nation?.name ?? fallbackName);
  return {
    id: String(nation?.id ?? fallbackId),
    name,
    shortName: String(nation?.shortName ?? name.replace(/[国領軍]$/, "")),
    peopleId,
    peopleName: String(nation?.peopleName ?? (peopleId === "human" ? "人間" : peopleId)),
    color: nation?.color ?? null,
  };
}

function normalizeWorldNation(context, nation, fallbackId, fallbackName) {
  const base = context.runtime.nationById.get(nation?.id);
  return normalizeNation(base ? { ...base, ...nation, peopleId: nation?.peopleId ?? base.peopleId } : nation, fallbackId, fallbackName);
}

function nationAtDetailedTile(context, tile, worldSimulation = null) {
  if (!worldSimulation || !Number.isInteger(tile?.macroIndex)) return tile?.nation ?? null;
  return getV3NationAtTile(context.runtime, worldSimulation, tile.macroIndex);
}

function normalizeMission(source) {
  if (!source?.id || !source?.battleId || !source?.target || !Number.isInteger(source.target.x) || !Number.isInteger(source.target.y)) return null;
  const status = ["march", "battle-ready", "in-battle"].includes(source.status) ? source.status : "march";
  return {
    ...clone(source),
    schemaVersion: MISSION_SCHEMA_VERSION,
    combatScale: "group-units",
    status,
    attempts: Math.max(0, Math.round(Number(source.attempts) || 0)),
    requestId: status === "in-battle" && source.requestId ? String(source.requestId) : null,
  };
}

export function normalizeV3MilitaryState(state) {
  const source = state?.military ?? {};
  return {
    ...state,
    military: {
      schemaVersion: MISSION_SCHEMA_VERSION,
      merit: Math.max(0, Math.round(Number(source.merit) || 0)),
      activeMission: normalizeMission(source.activeMission),
      history: Array.isArray(source.history) ? source.history.filter((entry) => entry?.id && entry?.battleId).slice(0, 40).map(clone) : [],
    },
  };
}

function wrappedManhattan(context, left, right) {
  const rawX = Math.abs(left.x - right.x);
  return Math.min(rawX, context.width - rawX) + Math.abs(left.y - right.y);
}

function targetDirection(context, from, target) {
  let dx = target.x - from.x;
  if (Math.abs(dx) > context.width / 2) dx += dx > 0 ? -context.width : context.width;
  const dy = target.y - from.y;
  const vertical = dy < 0 ? "北" : dy > 0 ? "南" : "";
  const horizontal = dx < 0 ? "西" : dx > 0 ? "東" : "";
  return `${vertical}${horizontal}` || "現在地";
}

function enemyNationFor(context, playerNation, originRegion, missionSeed, worldSimulation = null) {
  if (worldSimulation) {
    const map = getV3WorldSimulationView(context.runtime, worldSimulation);
    const neighborIds = [...new Set(map.borderSegments.flatMap((segment) => (
      segment.nations?.includes(playerNation.id)
        ? segment.nations.filter((nationId) => nationId && nationId !== playerNation.id)
        : []
    )))].sort();
    const liveCandidates = [
      ...neighborIds.map((nationId) => map.nationById.get(nationId)).filter(Boolean),
      ...map.nations.filter((nation) => nation?.id !== playerNation.id && !neighborIds.includes(nation?.id) && !nation?.dissolved),
    ];
    if (liveCandidates.length) {
      const index = Math.min(liveCandidates.length - 1, Math.floor(v3HashUnit(context.seed, "military-enemy", missionSeed) * liveCandidates.length));
      return normalizeWorldNation(context, liveCandidates[index], "foreign-host", "外征軍");
    }
  }
  const neighborNation = (originRegion?.neighborIds ?? [])
    .map((regionId) => context.runtime.regionById.get(regionId))
    .filter((region) => region?.nationId && region.nationId !== playerNation.id)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((region) => context.runtime.nationById.get(region.nationId))
    .find(Boolean);
  if (neighborNation) return normalizeWorldNation(context, neighborNation, "border-host", "国境外軍");
  const candidates = (context.runtime.nations.nations ?? [])
    .filter((nation) => nation?.id !== playerNation.id && !nation?.dissolved)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (candidates.length) {
    const index = Math.min(candidates.length - 1, Math.floor(v3HashUnit(context.seed, "military-enemy", missionSeed) * candidates.length));
    return normalizeWorldNation(context, candidates[index], "foreign-host", "外征軍");
  }
  return normalizeNation(null, "border-raiders", "境外連合軍");
}

function findMissionTarget(context, state, nationId, worldSimulation = null) {
  const origin = { x: state.player.x, y: state.player.y };
  const queue = [{ ...origin, distance: 0 }];
  const visited = new Set([tileKey(origin.x, origin.y)]);
  const candidates = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.distance >= TARGET_MINIMUM_DISTANCE) {
      const tile = getV3DetailedTile(context, current.x, current.y);
      const entity = getV3TileEntity(context, current.x, current.y, state);
      const tileNation = nationAtDetailedTile(context, tile, worldSimulation);
      if (tile.passable && !tile.type.startsWith("settlement-") && !entity && (!nationId || tileNation?.id === nationId)) {
        candidates.push({ tile, distance: current.distance });
      }
    }
    if (current.distance >= TARGET_MAXIMUM_DISTANCE) continue;
    for (const direction of DIRECTIONS) {
      const x = wrapped(current.x + direction.dx, context.width);
      const y = current.y + direction.dy;
      if (y < 0 || y >= context.height) continue;
      const key = tileKey(x, y);
      if (visited.has(key)) continue;
      visited.add(key);
      const tile = getV3DetailedTile(context, x, y);
      if (!tile.passable) continue;
      queue.push({ x, y, distance: current.distance + 1 });
    }
  }
  const ranked = candidates.sort((left, right) => {
    const leftScore = v3HashUnit(context.seed, "military-target", left.tile.x, left.tile.y, state.military?.history?.length ?? 0);
    const rightScore = v3HashUnit(context.seed, "military-target", right.tile.x, right.tile.y, state.military?.history?.length ?? 0);
    return rightScore - leftScore || left.distance - right.distance;
  });
  if (!ranked.length) throw new Error("この集落から到達できる作戦地点を確保できませんでした。");
  return ranked[0];
}

export function getV3MilitaryView(context, requestedState) {
  const state = normalizeV3MilitaryState(requestedState);
  const mission = state.military.activeMission;
  const nearby = nearestV3Settlement(context, state.player.x, state.player.y, 7);
  if (!mission) {
    return {
      active: false,
      canAccept: Boolean(nearby && !state.pendingEncounter),
      nearbySettlement: nearby?.settlement ?? null,
      label: nearby ? `${nearby.settlement.name}で軍務を受けられる` : "集落の近くで軍務を受けられる",
      detail: nearby ? `集落まで約${Math.round(nearby.distance)}歩` : "現在、受命できる軍務はない",
    };
  }
  const distance = wrappedManhattan(context, state.player, mission.target);
  const atTarget = distance === 0;
  return {
    active: true,
    canAccept: false,
    mission,
    atTarget,
    canStart: atTarget && ["battle-ready", "in-battle"].includes(mission.status),
    distance,
    direction: targetDirection(context, state.player, mission.target),
    label: mission.title,
    detail: atTarget ? "作戦地点に到着・集団戦を開始可能" : `作戦地点まで${distance}歩・${targetDirection(context, state.player, mission.target)}`,
  };
}

export function startV3MilitaryMission(context, requestedState, worldSimulation = null) {
  const state = normalizeV3MilitaryState(requestedState);
  if (state.pendingEncounter) throw new Error("目の前の相手に対処してから軍務を受けてください。");
  if (state.military.activeMission) throw new Error("進行中の軍務があります。");
  const nearby = nearestV3Settlement(context, state.player.x, state.player.y, 7);
  if (!nearby) throw new Error("軍務は集落の近くで受けられます。");
  const currentTile = getV3DetailedTile(context, state.player.x, state.player.y);
  const originRegion = currentTile.region ?? context.runtime.regionById.get(nearby.settlement.regionId) ?? null;
  const settlementTile = context.runtime.tiles[nearby.settlement.tileIndex] ?? currentTile.macroTile;
  const currentOwner = worldSimulation
    ? getV3NationAtTile(context.runtime, worldSimulation, settlementTile.index)
    : context.runtime.nationById.get(nearby.settlement.nationId) ?? currentTile.nation;
  const playerNation = normalizeWorldNation(
    context,
    currentOwner,
    "local-defense",
    "現地守備軍",
  );
  const sequence = state.military.history.length + 1;
  const strategic = worldSimulation
    ? bindV3BattleToStrategicWar(worldSimulation, playerNation.id, originRegion?.id)
    : null;
  const targetCandidate = findMissionTarget(context, state, playerNation.id, worldSimulation);
  const targetTile = targetCandidate.tile;
  const missionId = `v3-military:${context.seed}:${sequence}:${targetTile.x},${targetTile.y}`;
  const strategicEnemy = strategic && worldSimulation
    ? getV3WorldSimulationView(context.runtime, worldSimulation).nationById.get(strategic.enemyNationId)
    : null;
  const enemyNation = strategicEnemy
    ? normalizeWorldNation(context, strategicEnemy, strategic.enemyNationId, "交戦国軍")
    : enemyNationFor(context, playerNation, originRegion, missionId, worldSimulation);
  const mission = {
    schemaVersion: MISSION_SCHEMA_VERSION,
    id: missionId,
    battleId: `v3-group-battle:${context.seed}:${sequence}:${targetTile.x},${targetTile.y}`,
    title: `${targetTile.region?.name ?? nearby.settlement.name}・侵入軍迎撃`,
    objective: `${enemyNation.name}の先遣軍を作戦地点で迎撃する。`,
    combatScale: "group-units",
    status: "march",
    acceptedAtSteps: state.steps,
    acceptedAtMinutes: state.clockMinutes,
    origin: {
      settlementId: nearby.settlement.id,
      settlementName: nearby.settlement.name,
      x: state.player.x,
      y: state.player.y,
    },
    target: {
      x: targetTile.x,
      y: targetTile.y,
      tileKey: tileKey(targetTile.x, targetTile.y),
      terrainName: targetTile.name,
      terrainType: targetTile.type,
      onRoad: targetTile.onRoad,
      regionId: targetTile.region?.id ?? null,
      regionName: targetTile.region?.name ?? "作戦地域",
    },
    playerNation,
    enemyNation,
    strategic,
    attempts: 0,
    requestId: null,
  };
  return {
    ...state,
    military: { ...state.military, activeMission: mission },
    messageLog: addMessage(state, `${nearby.settlement.name}で軍務を受けた。${mission.target.regionName}の作戦地点へ1マスずつ向かう。`),
  };
}

function groupBattleEncounter(mission) {
  return {
    type: "group-battle",
    role: "army",
    id: mission.battleId,
    missionId: mission.id,
    combatScale: "group-units",
    name: `${mission.enemyNation.name}先遣軍`,
    symbol: "軍",
    message: `${mission.enemyNation.name}の部隊を確認した。戦闘準備、参陣人物、陣形、初期配置、兵站を確定して集団戦へ入る。`,
    worldX: mission.target.x,
    worldY: mission.target.y,
    tileKey: mission.target.tileKey,
  };
}

export function readyV3GroupBattleAtCurrentPosition(context, requestedState) {
  const state = normalizeV3MilitaryState(requestedState);
  const mission = state.military.activeMission;
  if (!mission) throw new Error("作戦地点へ向かう軍務がありません。");
  if (wrappedManhattan(context, state.player, mission.target) !== 0) throw new Error("作戦地点へ到達してください。");
  const readyMission = { ...mission, status: "battle-ready", requestId: null };
  return {
    ...state,
    military: { ...state.military, activeMission: readyMission },
    pendingEncounter: groupBattleEncounter(readyMission),
    messageLog: addMessage(state, `${readyMission.enemyNation.name}の軍勢を発見した。ここからは集団戦として指揮する。`),
  };
}

export function advanceV3MilitaryArrival(context, previousState, movedState) {
  const mission = movedState?.military?.activeMission;
  if (!mission || mission.status !== "march" || movedState.steps <= (previousState.steps ?? 0)) return movedState;
  const state = normalizeV3MilitaryState(movedState);
  if (wrappedManhattan(context, state.player, mission.target) !== 0) return state;
  return readyV3GroupBattleAtCurrentPosition(context, state);
}

export function deferV3GroupBattle(requestedState) {
  const state = normalizeV3MilitaryState(requestedState);
  const mission = state.military.activeMission;
  if (!mission) return state;
  return {
    ...state,
    military: { ...state.military, activeMission: { ...mission, status: "march", requestId: null } },
    pendingEncounter: null,
    messageLog: addMessage(state, "敵軍を監視しながら、いったん作戦地点を離れられる。戻れば集団戦を再開できる。"),
  };
}

function tacticalTerrainFor(mission) {
  if (mission.target.terrainType === "forest") return "forest";
  if (mission.target.terrainType === "hill") return "hill";
  if (mission.target.terrainType === "river") return "swamp";
  if (mission.target.terrainType === "mountain") return "mountain";
  return "plain";
}

function applyMissionTerrain(map, mission) {
  const terrain = tacticalTerrainFor(mission);
  if (mission.target.onRoad) {
    for (let x = 0; x < map.width; x += 1) setBattleTerrain(map, { x, y: 7 }, "road");
  }
  if (terrain === "plain") return;
  const patches = [[8, 3], [9, 3], [10, 4], [11, 4], [8, 9], [9, 10], [10, 10], [11, 9]];
  patches.forEach(([x, y]) => setBattleTerrain(map, { x, y }, terrain));
}

function generatedArmy(nation, side, commanderId, strength, positions, mission, environment) {
  const specifications = createNationalArmyUnitSpecs({
    nation,
    side,
    commanderId,
    strength,
    scale: "commander",
    positions,
    seed: mission.id,
    environment,
    missionKind: "v3_field_campaign",
    approachId: "field-arrival",
  });
  return {
    specifications,
    units: specifications.map((specification) => createCombatUnit({
      ...specification,
      facing: side === "enemy" ? "west" : "east",
      supply: 100,
      maxSupply: 100,
      tags: [...specification.tags, "V3_GROUP_BATTLE", `V3_MISSION:${mission.id}`],
    })),
  };
}

function createV3GroupBattle(context, state, mission) {
  const map = createBattleMap({ width: 20, height: 14, terrainType: "plain" });
  applyMissionTerrain(map, mission);
  const playerCommanderId = `${mission.id}:player-command`;
  const enemyCommanderId = `${mission.id}:enemy-command`;
  const playerProfile = getNationalUnitProfile(mission.playerNation.peopleId);
  const enemyProfile = getNationalUnitProfile(mission.enemyNation.peopleId);
  const commanders = [
    createCommander({
      id: playerCommanderId,
      name: `${state.player.name}の軍議所`,
      side: "player",
      position: { x: 1, y: 7 },
      leadership: 62 + Math.min(18, state.player.level * 2),
      tactics: 60 + Math.min(16, state.player.level * 2),
      bravery: 64 + Math.min(14, state.player.level),
      traits: [playerProfile?.doctrineName ?? "現地動員"],
    }),
    createCommander({
      id: enemyCommanderId,
      name: `${mission.enemyNation.shortName}軍指揮官`,
      side: "enemy",
      position: { x: 18, y: 7 },
      leadership: 64,
      tactics: 62,
      bravery: 66,
      traits: [enemyProfile?.doctrineName ?? "侵入軍"],
    }),
  ];
  const environment = { accent: tacticalTerrainFor(mission), dominant: tacticalTerrainFor(mission) };
  const playerArmy = generatedArmy(mission.playerNation, "player", playerCommanderId, 360 + state.player.level * 12, [{ x: 4, y: 3 }, { x: 4, y: 7 }, { x: 4, y: 11 }], mission, environment);
  const enemyArmy = generatedArmy(mission.enemyNation, "enemy", enemyCommanderId, 345 + state.military.history.length * 10, [{ x: 15, y: 3 }, { x: 15, y: 7 }, { x: 15, y: 11 }], mission, environment);
  const battle = createBattleState({
    id: mission.battleId,
    name: mission.title,
    map,
    commanders,
    units: [...playerArmy.units, ...enemyArmy.units],
    formations: { player: playerProfile?.formationId ?? "line", enemy: enemyProfile?.formationId ?? "line" },
    seed: Math.floor(v3HashUnit(context.seed, "group-battle", mission.id) * 4294967295),
  });
  battle.combatScale = "group-units";
  battle.v3MissionId = mission.id;
  battle.sideLabels = { player: mission.playerNation.name, enemy: mission.enemyNation.name };
  battle.nationalArmies = {
    player: getNationalArmySummary(mission.playerNation, playerArmy.specifications),
    enemy: getNationalArmySummary(mission.enemyNation, enemyArmy.specifications),
  };
  battle.environment = { ...environment, v3Target: clone(mission.target) };
  return battle;
}

function createV3CommandRoster(state, mission) {
  const base = 58 + Math.min(24, state.player.level * 3);
  return [
    {
      id: `v3-commander:${state.player.name}`,
      name: state.player.name,
      portrait: "旅",
      role: "軍務指揮者",
      rank: "臨時指揮官",
      policy: "作戦全体を指揮する",
      traits: ["現地踏査", "一歩行軍"],
      stats: { leadership: base, war: base + 3, intelligence: base - 2, charisma: base },
      stamina: 100,
      available: true,
    },
    {
      id: `v3-officer:${mission.playerNation.id}:vanguard`,
      name: `${mission.playerNation.shortName}先陣将`,
      portrait: "将",
      role: "先陣指揮",
      rank: "軍団将校",
      policy: "敵の前進を正面で止める",
      traits: ["前衛統率"],
      stats: { leadership: 72, war: 76, intelligence: 58, charisma: 61 },
      stamina: 100,
      available: true,
    },
    {
      id: `v3-officer:${mission.playerNation.id}:quartermaster`,
      name: `${mission.playerNation.shortName}兵站官`,
      portrait: "補",
      role: "兵站・軍議",
      rank: "軍団将校",
      policy: "補給を保ち、損耗を抑える",
      traits: ["兵站管理"],
      stats: { leadership: 68, war: 55, intelligence: 78, charisma: 64 },
      stamina: 100,
      available: true,
    },
  ];
}

export function createV3GroupBattleHandoff(context, requestedState) {
  const state = normalizeV3MilitaryState(requestedState);
  const mission = state.military.activeMission;
  if (!mission) throw new Error("引き渡せる集団戦がありません。");
  if (wrappedManhattan(context, state.player, mission.target) !== 0) throw new Error("作戦地点へ到達してください。");
  if (!["battle-ready", "in-battle"].includes(mission.status)) throw new Error("集団戦を開始できる状態ではありません。");
  const attempts = mission.attempts + 1;
  const requestId = `${mission.id}:attempt-${attempts}`;
  const roster = createV3CommandRoster(state, mission);
  const request = {
    version: V3_GROUP_BATTLE_BRIDGE_VERSION,
    requestId,
    missionId: mission.id,
    battleId: mission.battleId,
    status: "pending",
    createdAt: new Date().toISOString(),
    battle: createV3GroupBattle(context, state, mission),
    roster,
    defaultParticipantIds: roster.map((entry) => entry.id),
    origin: {
      type: "v3-group-combat",
      missionId: mission.id,
      requestId,
      playerLabel: mission.playerNation.name,
      enemyLabel: mission.enemyNation.name,
      returnUrl: "./index.html",
    },
  };
  return {
    state: {
      ...state,
      military: { ...state.military, activeMission: { ...mission, status: "in-battle", attempts, requestId } },
      pendingEncounter: groupBattleEncounter(mission),
      messageLog: addMessage(state, "軍勢の指揮を引き継ぎ、戦闘前編成へ移る。"),
    },
    request,
  };
}

function parsedBridge(raw) {
  const bridge = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (bridge?.version !== V3_GROUP_BATTLE_BRIDGE_VERSION || !bridge.requestId || !bridge.missionId || !bridge.battleId) return null;
  if (!["pending", "completed", "cancelled"].includes(bridge.status)) return null;
  if (bridge.status === "pending" && (!bridge.battle?.map || !Array.isArray(bridge.roster))) return null;
  if (bridge.status === "completed" && (!bridge.result?.winner || bridge.result.battleId !== bridge.battleId)) return null;
  return bridge;
}

export function readV3GroupBattleBridge(storage) {
  try {
    return parsedBridge(storage?.getItem(V3_GROUP_BATTLE_BRIDGE_KEY));
  } catch {
    return null;
  }
}

export function writeV3GroupBattleBridge(storage, request) {
  const bridge = parsedBridge(request);
  if (!bridge || bridge.status !== "pending") throw new Error("V3集団戦の引渡しデータが不正です。");
  storage.setItem(V3_GROUP_BATTLE_BRIDGE_KEY, JSON.stringify(bridge));
  return bridge;
}

export function completeV3GroupBattleBridge(storage, requestId, result) {
  const bridge = readV3GroupBattleBridge(storage);
  if (!bridge || bridge.status !== "pending" || bridge.requestId !== requestId) throw new Error("完了対象のV3集団戦が見つかりません。");
  if (!result?.winner || result.battleId !== bridge.battleId) throw new Error("V3へ返す戦果が不正です。");
  const completed = {
    version: bridge.version,
    requestId: bridge.requestId,
    missionId: bridge.missionId,
    battleId: bridge.battleId,
    status: "completed",
    completedAt: new Date().toISOString(),
    result: clone(result),
  };
  storage.setItem(V3_GROUP_BATTLE_BRIDGE_KEY, JSON.stringify(completed));
  return completed;
}

export function cancelV3GroupBattleBridge(storage, requestId) {
  const bridge = readV3GroupBattleBridge(storage);
  if (!bridge || bridge.status !== "pending" || bridge.requestId !== requestId) throw new Error("中止対象のV3集団戦が見つかりません。");
  const cancelled = {
    version: bridge.version,
    requestId: bridge.requestId,
    missionId: bridge.missionId,
    battleId: bridge.battleId,
    status: "cancelled",
    completedAt: new Date().toISOString(),
  };
  storage.setItem(V3_GROUP_BATTLE_BRIDGE_KEY, JSON.stringify(cancelled));
  return cancelled;
}

export function clearV3GroupBattleBridge(storage) {
  storage?.removeItem(V3_GROUP_BATTLE_BRIDGE_KEY);
}

export function applyV3GroupBattleReturn(requestedState, bridge) {
  const state = normalizeV3MilitaryState(requestedState);
  const parsed = parsedBridge(bridge);
  const mission = state.military.activeMission;
  if (!parsed || !mission || mission.id !== parsed.missionId || mission.battleId !== parsed.battleId) {
    throw new Error("V3の軍務と返却された集団戦が一致しません。");
  }
  if (parsed.status !== "completed") {
    const readyMission = { ...mission, status: "battle-ready", requestId: null };
    return {
      ...state,
      military: { ...state.military, activeMission: readyMission },
      pendingEncounter: groupBattleEncounter(readyMission),
      messageLog: addMessage(state, parsed.status === "cancelled" ? "戦闘前編成を中止した。作戦地点から再開できる。" : "集団戦は未決着のため、作戦地点から再開できる。"),
    };
  }
  if (mission.requestId && mission.requestId !== parsed.requestId) throw new Error("V3集団戦の試行番号が一致しません。");
  const result = parsed.result;
  const victory = result.winner === "player";
  const draw = result.winner === "draw";
  const meritGain = victory ? 12 : draw ? 5 : 2;
  const xpGain = victory ? 20 : draw ? 8 : 4;
  const goldGain = victory ? 15 : 0;
  const record = {
    id: mission.id,
    battleId: mission.battleId,
    title: mission.title,
    winner: result.winner,
    resultType: result.resultType,
    turn: result.turn,
    friendlyCasualties: Math.max(0, Number(result.player?.casualties) || 0),
    enemyCasualties: Math.max(0, Number(result.enemy?.casualties) || 0),
    meritGain,
    target: clone(mission.target),
    playerNation: clone(mission.playerNation),
    enemyNation: clone(mission.enemyNation),
    completedAtSteps: state.steps,
    completedAtMinutes: state.clockMinutes,
  };
  const outcome = victory ? "勝利" : draw ? "引き分け" : "敗北";
  return {
    ...state,
    player: { ...state.player, xp: state.player.xp + xpGain, gold: state.player.gold + goldGain },
    military: {
      ...state.military,
      merit: state.military.merit + meritGain,
      activeMission: null,
      history: [record, ...state.military.history].slice(0, 40),
    },
    pendingEncounter: null,
    messageLog: addMessage(state, `${mission.title}は${outcome}。味方損耗${record.friendlyCasualties}、軍功${meritGain}${victory ? `、経験${xpGain}、銀貨${goldGain}` : `、経験${xpGain}`}を得た。`),
  };
}

export const v3GroupCombatInternals = Object.freeze({ findMissionTarget, tacticalTerrainFor, parsedBridge });
