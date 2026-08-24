export const V3_FIELD_VERSION = 3;
export const V3_DETAIL_SCALE = 8;
export const V3_CHUNK_SIZE = 16;
export const V3_INITIAL_CHUNK_RADIUS = 1;
export const V3_LOCAL_PREGEN_RADIUS = 2;

export const V3_COMBAT_PRESENTATIONS = Object.freeze({
  personal: Object.freeze({
    scale: "personal-units",
    surface: "field-inline",
    usesPreparation: false,
    usesLogistics: false,
    usesDedicatedResult: false,
  }),
  group: Object.freeze({
    scale: "group-units",
    surface: "dedicated-tactical",
    usesPreparation: true,
    usesLogistics: true,
    usesDedicatedResult: true,
  }),
});

const DIRECTIONS = Object.freeze({
  north: Object.freeze({ dx: 0, dy: -1, label: "北" }),
  east: Object.freeze({ dx: 1, dy: 0, label: "東" }),
  south: Object.freeze({ dx: 0, dy: 1, label: "南" }),
  west: Object.freeze({ dx: -1, dy: 0, label: "西" }),
});

const TERRAIN_PRESENTATION = Object.freeze({
  grassland: Object.freeze({ type: "grass", name: "草原", symbol: "·", passable: true }),
  plains: Object.freeze({ type: "grass", name: "平原", symbol: "·", passable: true }),
  desert: Object.freeze({ type: "sand", name: "砂地", symbol: "·", passable: true }),
  tundra: Object.freeze({ type: "tundra", name: "寒原", symbol: "·", passable: true }),
  snow: Object.freeze({ type: "snow", name: "雪原", symbol: "·", passable: true }),
  coast: Object.freeze({ type: "sand", name: "海岸", symbol: "·", passable: true }),
});

const ITEM_TABLE = Object.freeze([
  Object.freeze({ id: "medicinal-herb", name: "薬草", symbol: "草", heal: 18 }),
  Object.freeze({ id: "wild-berries", name: "木の実", symbol: "実", heal: 8 }),
  Object.freeze({ id: "iron-shard", name: "鉄の欠片", symbol: "鉱", heal: 0 }),
  Object.freeze({ id: "old-coin", name: "古い銀貨", symbol: "貨", heal: 0, gold: 4 }),
]);

const ENEMY_TABLE = Object.freeze([
  Object.freeze({ id: "green-slime", name: "苔スライム", symbol: "粘", baseHp: 10, power: 3, xp: 5, gold: 2 }),
  Object.freeze({ id: "goblin-scout", name: "ゴブリン斥候", symbol: "鬼", baseHp: 16, power: 5, xp: 8, gold: 4 }),
  Object.freeze({ id: "wild-wolf", name: "灰野狼", symbol: "狼", baseHp: 13, power: 4, xp: 7, gold: 3 }),
  Object.freeze({ id: "road-bandit", name: "街道の追剥", symbol: "賊", baseHp: 20, power: 6, xp: 11, gold: 7 }),
]);

function clampInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function v3HashUnit(seed, ...values) {
  return hashText(`${seed}:${values.join(":")}`) / 4294967295;
}

export function getV3CombatPresentation(combatScale) {
  return combatScale === "personal" || combatScale === "personal-units"
    ? V3_COMBAT_PRESENTATIONS.personal
    : V3_COMBAT_PRESENTATIONS.group;
}

function wrapped(value, size) {
  return ((value % size) + size) % size;
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function chunkKey(x, y) {
  return `${x}:${y}`;
}

function unique(values) {
  return [...new Set(values)];
}

function addLog(state, message) {
  return [message, ...(state.messageLog ?? [])].slice(0, 8);
}

function settlementRadius(level) {
  return level === "city" ? 3 : level === "town" ? 2 : 1;
}

function settlementSymbol(object) {
  return object.settlementLevel === "city" ? "都" : object.settlementLevel === "town" ? "町" : "村";
}

function detailedSettlement(object) {
  return {
    ...object,
    detailX: object.x * V3_DETAIL_SCALE + Math.floor(V3_DETAIL_SCALE / 2),
    detailY: object.y * V3_DETAIL_SCALE + Math.floor(V3_DETAIL_SCALE / 2),
  };
}

export function createV3WorldContext(runtime, seed = runtime?.terrain?.seed) {
  if (!runtime?.terrain || !Array.isArray(runtime.tiles) || !runtime.nations) {
    throw new TypeError("V3の詳細世界には生成済み概算世界が必要です。");
  }
  const width = runtime.terrain.width * V3_DETAIL_SCALE;
  const height = runtime.terrain.height * V3_DETAIL_SCALE;
  const settlements = (runtime.nations.objects ?? []).filter((object) => object.settlementLevel).map(detailedSettlement);
  const settlementByMacroIndex = new Map();
  for (const settlement of settlements) {
    const current = settlementByMacroIndex.get(settlement.tileIndex);
    if (!current || (settlement.importance ?? 0) > (current.importance ?? 0)) settlementByMacroIndex.set(settlement.tileIndex, settlement);
  }
  return {
    seed: String(seed ?? "v3-world"),
    runtime,
    width,
    height,
    chunkColumns: Math.ceil(width / V3_CHUNK_SIZE),
    chunkRows: Math.ceil(height / V3_CHUNK_SIZE),
    roadTileIndices: new Set((runtime.nations.roads ?? []).flatMap((road) => road.tileIndices ?? [])),
    settlementByMacroIndex,
    settlements,
  };
}

function normalizedPosition(context, x, y) {
  return { x: wrapped(x, context.width), y };
}

function macroAt(context, x, y) {
  if (y < 0 || y >= context.height) return null;
  const normalizedX = wrapped(x, context.width);
  const macroX = Math.floor(normalizedX / V3_DETAIL_SCALE);
  const macroY = Math.floor(y / V3_DETAIL_SCALE);
  const index = macroY * context.runtime.terrain.width + macroX;
  return {
    tile: context.runtime.tiles[index],
    index,
    macroX,
    macroY,
    localX: normalizedX % V3_DETAIL_SCALE,
    localY: y % V3_DETAIL_SCALE,
    x: normalizedX,
    y,
  };
}

function wrappedDetailDistance(context, left, right) {
  const rawX = Math.abs(left.x - right.x);
  const dx = Math.min(rawX, context.width - rawX);
  return Math.hypot(dx, left.y - right.y);
}

export function nearestV3Settlement(context, x, y, maximumDistance = Number.POSITIVE_INFINITY) {
  let best = null;
  for (const settlement of context.settlements) {
    const distance = wrappedDetailDistance(context, { x: wrapped(x, context.width), y }, { x: settlement.detailX, y: settlement.detailY });
    if (distance > maximumDistance) continue;
    if (!best || distance < best.distance) best = { settlement, distance };
  }
  return best;
}

export function getV3DetailedTile(context, requestedX, requestedY) {
  const macro = macroAt(context, requestedX, requestedY);
  if (!macro?.tile) {
    return { x: wrapped(requestedX, context.width), y: requestedY, type: "void", name: "世界の果て", symbol: "", passable: false, macroTile: null };
  }
  const { tile } = macro;
  const settlement = context.settlementByMacroIndex.get(macro.index) ?? null;
  const distanceFromCenter = Math.max(Math.abs(macro.localX - 4), Math.abs(macro.localY - 4));
  const roadBand = [3, 4].includes(macro.localX) || [3, 4].includes(macro.localY);
  const base = TERRAIN_PRESENTATION[tile.terrain] ?? (tile.passable
    ? TERRAIN_PRESENTATION.grassland
    : { type: "water", name: "海", symbol: "≈", passable: false });
  let presentation = base;
  if (tile.passable && settlement && macro.localX === 4 && macro.localY === 4) {
    presentation = { type: `settlement-${settlement.settlementLevel}`, name: settlement.name, symbol: settlementSymbol(settlement), passable: true };
  } else if (tile.passable && settlement && distanceFromCenter <= settlementRadius(settlement.settlementLevel)) {
    presentation = { type: "settlement-ground", name: `${settlement.name}の通り`, symbol: "·", passable: true };
  } else if (tile.passable && context.roadTileIndices.has(macro.index) && roadBand) {
    presentation = { type: "road", name: "街道", symbol: "·", passable: true };
  } else if (tile.passable && tile.relief === "mountains" && v3HashUnit(context.seed, "mountain", macro.x, macro.y) > 0.54) {
    presentation = { type: "mountain", name: "険しい山", symbol: "▲", passable: false };
  } else if (tile.passable && (tile.feature === "forest" || (["grassland", "plains"].includes(tile.terrain) && v3HashUnit(context.seed, "tree", macro.x, macro.y) > 0.84))) {
    presentation = { type: "forest", name: "森", symbol: "♠", passable: true };
  } else if (tile.passable && tile.relief === "hills" && v3HashUnit(context.seed, "hill", macro.x, macro.y) > 0.73) {
    presentation = { type: "hill", name: "岩丘", symbol: "⌃", passable: true };
  } else if (tile.passable && tile.riverId && [3, 4].includes(macro.localX)) {
    presentation = { type: "river", name: "川辺", symbol: "≈", passable: true };
  }
  const nation = context.runtime.nationById.get(tile.nationId) ?? null;
  const region = context.runtime.regionById.get(tile.regionId) ?? null;
  return {
    x: macro.x,
    y: macro.y,
    ...presentation,
    macroIndex: macro.index,
    macroX: macro.macroX,
    macroY: macro.macroY,
    localX: macro.localX,
    localY: macro.localY,
    macroTile: tile,
    nation,
    region,
    settlement,
    onRoad: presentation.type === "road" || presentation.type === "settlement-ground",
  };
}

export function getV3TileEntity(context, x, y, state = {}) {
  const tile = getV3DetailedTile(context, x, y);
  if (!tile.passable || tile.type.startsWith("settlement-")) return null;
  const key = tileKey(tile.x, tile.y);
  if ((state.defeatedTiles ?? []).includes(key) || (state.collectedTiles ?? []).includes(key) || (state.interactedTiles ?? []).includes(key)) return null;
  const nearby = nearestV3Settlement(context, tile.x, tile.y, 7);
  const roll = v3HashUnit(context.seed, "entity", tile.x, tile.y);
  if (nearby && roll < 0.16) {
    const roleRoll = v3HashUnit(context.seed, "npc-role", tile.x, tile.y);
    const role = tile.onRoad && roleRoll < 0.3 ? "merchant" : roleRoll < 0.62 ? "villager" : "adventurer";
    const definitions = {
      merchant: { name: "旅商人", symbol: "商", message: `${nearby.settlement.name}へ品を運ぶ途中らしい。`, price: 5 },
      villager: { name: `${nearby.settlement.name}の村人`, symbol: "人", message: "近くの道と魔物の噂を教えてくれた。" },
      adventurer: { name: "巡回中の冒険者", symbol: "冒", message: `${nearby.settlement.name}周辺を警戒している。` },
    };
    return { type: "npc", role, ...definitions[role], settlementId: nearby.settlement.id };
  }
  if (tile.onRoad && roll < 0.025) return { type: "npc", role: "merchant", name: "街道商人", symbol: "商", message: "遠国へ向かう行商人だ。", price: 5 };
  const dangerBias = tile.type === "forest" || tile.type === "mountain" ? 0.035 : 0;
  if (roll < 0.095 + dangerBias) {
    const definition = ENEMY_TABLE[Math.floor(v3HashUnit(context.seed, "enemy", tile.x, tile.y) * ENEMY_TABLE.length)];
    const spawn = state.player && Number.isInteger(state.player.spawnX) && Number.isInteger(state.player.spawnY)
      ? { x: state.player.spawnX, y: state.player.spawnY }
      : { x: tile.x, y: tile.y };
    const distanceFromArrival = wrappedDetailDistance(context, { x: tile.x, y: tile.y }, spawn);
    const level = Math.min(5, 1 + Math.floor(distanceFromArrival / 160));
    return { type: "enemy", ...definition, level, hp: definition.baseHp + level * 2, maxHp: definition.baseHp + level * 2 };
  }
  if (roll < 0.16) {
    const item = ITEM_TABLE[Math.floor(v3HashUnit(context.seed, "item", tile.x, tile.y) * ITEM_TABLE.length)];
    return { type: "item", ...item };
  }
  return null;
}

export function v3ChunkPosition(context, x, y) {
  return {
    x: wrapped(Math.floor(wrapped(x, context.width) / V3_CHUNK_SIZE), context.chunkColumns),
    y: Math.min(context.chunkRows - 1, Math.max(0, Math.floor(y / V3_CHUNK_SIZE))),
  };
}

function chunkKeysAround(context, x, y, radius) {
  const origin = v3ChunkPosition(context, x, y);
  const keys = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    const chunkY = origin.y + dy;
    if (chunkY < 0 || chunkY >= context.chunkRows) continue;
    for (let dx = -radius; dx <= radius; dx += 1) keys.push(chunkKey(wrapped(origin.x + dx, context.chunkColumns), chunkY));
  }
  return keys;
}

function discoverAround(context, x, y, existing = []) {
  const discovered = new Set(existing);
  for (let dy = -2; dy <= 2; dy += 1) {
    const nextY = y + dy;
    if (nextY < 0 || nextY >= context.height) continue;
    for (let dx = -2; dx <= 2; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > 3) continue;
      discovered.add(tileKey(wrapped(x + dx, context.width), nextY));
    }
  }
  return [...discovered].slice(-6000);
}

function findSpawn(context) {
  const preferred = context.settlements.find((entry) => entry.nationId === "nation-1") ?? context.settlements[0];
  const origin = preferred ? { x: preferred.detailX, y: preferred.detailY } : { x: Math.floor(context.width / 2), y: Math.floor(context.height / 2) };
  for (let radius = 0; radius < 12; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const tile = getV3DetailedTile(context, origin.x + dx, origin.y + dy);
        if (tile.passable && !tile.type.startsWith("settlement-")) return { x: tile.x, y: tile.y, settlementId: preferred?.id ?? null };
      }
    }
  }
  return { x: wrapped(origin.x, context.width), y: Math.min(context.height - 1, Math.max(0, origin.y)), settlementId: preferred?.id ?? null };
}

export function createV3FieldState(context, options = {}) {
  const spawn = findSpawn(context);
  const playerName = String(options.playerName ?? "アレク").trim().slice(0, 24) || "アレク";
  return {
    version: V3_FIELD_VERSION,
    seed: context.seed,
    player: { name: playerName, x: spawn.x, y: spawn.y, spawnX: spawn.x, spawnY: spawn.y, hp: 34, maxHp: 34, level: 1, xp: 0, gold: 12, inventory: [] },
    steps: 0,
    clockMinutes: 8 * 60,
    generatedChunks: chunkKeysAround(context, spawn.x, spawn.y, V3_INITIAL_CHUNK_RADIUS),
    backgroundCursor: 0,
    discoveredTiles: discoverAround(context, spawn.x, spawn.y),
    collectedTiles: [],
    defeatedTiles: [],
    interactedTiles: [],
    pendingEncounter: null,
    messageLog: ["女神の光が消えた。ここからは一歩ずつ、自分の足で進む。"],
  };
}

export function normalizeV3FieldState(context, source = {}) {
  if (source.version !== V3_FIELD_VERSION || source.seed !== context.seed || !source.player) return createV3FieldState(context, source);
  const fallback = createV3FieldState(context, source);
  const x = wrapped(clampInteger(source.player.x, fallback.player.x, -context.width * 4, context.width * 4), context.width);
  const y = clampInteger(source.player.y, fallback.player.y, 0, context.height - 1);
  const current = getV3DetailedTile(context, x, y);
  const player = {
    ...fallback.player,
    ...source.player,
    name: String(source.player.name ?? fallback.player.name).slice(0, 24),
    x: current.passable ? x : fallback.player.x,
    y: current.passable ? y : fallback.player.y,
    hp: clampInteger(source.player.hp, fallback.player.hp, 0, 999),
    maxHp: clampInteger(source.player.maxHp, fallback.player.maxHp, 1, 999),
    level: clampInteger(source.player.level, 1, 1, 99),
    xp: clampInteger(source.player.xp, 0, 0, 999999),
    gold: clampInteger(source.player.gold, 0, 0, 999999),
    inventory: Array.isArray(source.player.inventory) ? source.player.inventory.filter((item) => item?.id && item?.name).slice(0, 64) : [],
  };
  const pendingEncounter = source.pendingEncounter && typeof source.pendingEncounter === "object"
    ? {
      ...source.pendingEncounter,
      ...(source.pendingEncounter.type === "enemy" ? {
        combatScale: "personal-units",
        fleeAttempts: clampInteger(source.pendingEncounter.fleeAttempts, 0, 0, 9999),
        worldX: wrapped(clampInteger(source.pendingEncounter.worldX, player.x, -context.width * 4, context.width * 4), context.width),
        worldY: clampInteger(source.pendingEncounter.worldY, player.y, 0, context.height - 1),
      } : {}),
    }
    : null;
  return {
    ...fallback,
    ...source,
    player,
    steps: clampInteger(source.steps, 0, 0, 9999999),
    clockMinutes: clampInteger(source.clockMinutes, 8 * 60, 0, 999 * 24 * 60),
    generatedChunks: unique([...(source.generatedChunks ?? []), ...chunkKeysAround(context, player.x, player.y, V3_INITIAL_CHUNK_RADIUS)]).slice(-12000),
    backgroundCursor: clampInteger(source.backgroundCursor, 0, 0, context.chunkColumns * context.chunkRows),
    discoveredTiles: Array.isArray(source.discoveredTiles) ? unique(source.discoveredTiles).slice(-6000) : fallback.discoveredTiles,
    collectedTiles: Array.isArray(source.collectedTiles) ? unique(source.collectedTiles).slice(-4000) : [],
    defeatedTiles: Array.isArray(source.defeatedTiles) ? unique(source.defeatedTiles).slice(-4000) : [],
    interactedTiles: Array.isArray(source.interactedTiles) ? unique(source.interactedTiles).slice(-4000) : [],
    pendingEncounter,
    messageLog: Array.isArray(source.messageLog) ? source.messageLog.map(String).slice(0, 8) : fallback.messageLog,
  };
}

export function isV3ChunkGenerated(context, state, x, y) {
  const chunk = v3ChunkPosition(context, x, y);
  return state.generatedChunks.includes(chunkKey(chunk.x, chunk.y));
}

export function advanceV3BackgroundGeneration(context, state) {
  const generated = new Set(state.generatedChunks);
  const localCandidate = chunkKeysAround(context, state.player.x, state.player.y, V3_LOCAL_PREGEN_RADIUS).find((key) => !generated.has(key));
  if (localCandidate) {
    generated.add(localCandidate);
    return { ...state, generatedChunks: [...generated].slice(-12000) };
  }
  const total = context.chunkColumns * context.chunkRows;
  let cursor = state.backgroundCursor % total;
  for (let attempt = 0; attempt < total; attempt += 1) {
    const key = chunkKey(cursor % context.chunkColumns, Math.floor(cursor / context.chunkColumns));
    cursor = (cursor + 1) % total;
    if (generated.has(key)) continue;
    generated.add(key);
    return { ...state, backgroundCursor: cursor, generatedChunks: [...generated].slice(-12000) };
  }
  return { ...state, backgroundCursor: cursor };
}

export function moveV3Player(context, state, directionName) {
  const direction = DIRECTIONS[directionName];
  if (!direction) throw new RangeError("不明な移動方向です。");
  if (state.pendingEncounter) return { ...state, messageLog: addLog(state, "目の前の相手に対処する必要がある。") };
  const position = normalizedPosition(context, state.player.x + direction.dx, state.player.y + direction.dy);
  const destination = getV3DetailedTile(context, position.x, position.y);
  if (!destination.passable) return { ...state, messageLog: addLog(state, `${destination.name}には進めない。`) };
  const generatedChunks = unique([...state.generatedChunks, ...chunkKeysAround(context, destination.x, destination.y, V3_INITIAL_CHUNK_RADIUS)]).slice(-12000);
  const moved = {
    ...state,
    player: { ...state.player, x: destination.x, y: destination.y },
    steps: state.steps + 1,
    clockMinutes: state.clockMinutes + 10,
    generatedChunks,
    discoveredTiles: discoverAround(context, destination.x, destination.y, state.discoveredTiles),
    messageLog: addLog(state, `${direction.label}へ進んだ。${destination.name}。`),
  };
  const entity = getV3TileEntity(context, destination.x, destination.y, moved);
  if (!entity) return moved;
  const key = tileKey(destination.x, destination.y);
  if (entity.type === "item") {
    const inventory = entity.gold ? moved.player.inventory : [...moved.player.inventory, { id: entity.id, name: entity.name, heal: entity.heal ?? 0 }];
    return {
      ...moved,
      player: { ...moved.player, inventory, gold: moved.player.gold + (entity.gold ?? 0) },
      collectedTiles: [...moved.collectedTiles, key].slice(-4000),
      messageLog: addLog(moved, `${entity.name}を拾った。`),
    };
  }
  if (entity.type === "enemy") {
    return {
      ...moved,
      player: { ...state.player },
      pendingEncounter: {
        ...entity,
        combatScale: "personal-units",
        fleeAttempts: 0,
        worldX: destination.x,
        worldY: destination.y,
        tileKey: key,
      },
      messageLog: addLog(state, `${direction.label}の${destination.name}に${entity.name}を発見した。足元の地形で個人戦に入る！`),
    };
  }
  return {
    ...moved,
    pendingEncounter: { ...entity, tileKey: key },
    messageLog: addLog(moved, `${entity.name}に出会った。`),
  };
}

function levelledPlayer(player) {
  let level = player.level;
  let maxHp = player.maxHp;
  while (player.xp >= level * 20 && level < 99) {
    level += 1;
    maxHp += 5;
  }
  return level === player.level ? player : { ...player, level, maxHp, hp: Math.min(maxHp, player.hp + 5) };
}

export function resolveV3Encounter(context, state, action) {
  const encounter = state.pendingEncounter;
  if (!encounter) return state;
  if (encounter.type === "npc") {
    if (action === "buy") {
      const price = encounter.price ?? 5;
      if (state.player.gold < price) return { ...state, messageLog: addLog(state, "銀貨が足りない。") };
      return {
        ...state,
        player: { ...state.player, gold: state.player.gold - price, inventory: [...state.player.inventory, { id: "medicinal-herb", name: "薬草", heal: 18 }] },
        messageLog: addLog(state, `薬草を銀貨${price}枚で買った。`),
      };
    }
    if (action !== "talk" && action !== "leave") return state;
    return {
      ...state,
      pendingEncounter: null,
      interactedTiles: [...state.interactedTiles, encounter.tileKey].slice(-4000),
      messageLog: addLog(state, action === "talk" ? encounter.message : `${encounter.name}と別れた。`),
    };
  }
  if (action === "flee") {
    const fleeAttempts = clampInteger(encounter.fleeAttempts, 0, 0, 9999) + 1;
    const escaped = v3HashUnit(context.seed, "flee", fleeAttempts, state.steps, state.player.x, state.player.y) > 0.28;
    if (escaped) return { ...state, pendingEncounter: null, messageLog: addLog(state, `${encounter.name}から逃げ切った。`) };
    const damage = Math.max(1, encounter.power + encounter.level - 2);
    return {
      ...state,
      player: { ...state.player, hp: Math.max(1, state.player.hp - damage) },
      pendingEncounter: { ...encounter, fleeAttempts },
      messageLog: addLog(state, `逃げ切れず、${damage}の傷を負った。`),
    };
  }
  if (action !== "fight") return state;
  const playerDamage = 6 + state.player.level * 2 + Math.floor(v3HashUnit(context.seed, "attack", state.steps, encounter.hp) * 5);
  const enemyHp = encounter.hp - playerDamage;
  if (enemyHp <= 0) {
    const player = levelledPlayer({ ...state.player, xp: state.player.xp + encounter.xp, gold: state.player.gold + encounter.gold });
    return {
      ...state,
      player,
      pendingEncounter: null,
      defeatedTiles: [...state.defeatedTiles, encounter.tileKey].slice(-4000),
      messageLog: addLog(state, `${encounter.name}を倒した。経験${encounter.xp}、銀貨${encounter.gold}枚を得た。`),
    };
  }
  const enemyDamage = Math.max(1, encounter.power + encounter.level - Math.floor(state.player.level / 2));
  if (state.player.hp - enemyDamage <= 0) {
    const player = { ...state.player, x: state.player.spawnX, y: state.player.spawnY, hp: state.player.maxHp, gold: Math.floor(state.player.gold / 2) };
    return {
      ...state,
      player,
      pendingEncounter: null,
      discoveredTiles: discoverAround(context, player.x, player.y, state.discoveredTiles),
      messageLog: addLog(state, "力尽きた。近くの集落で目を覚まし、所持金の半分を失った。"),
    };
  }
  return {
    ...state,
    player: { ...state.player, hp: state.player.hp - enemyDamage },
    pendingEncounter: { ...encounter, hp: enemyHp },
    messageLog: addLog(state, `${encounter.name}へ${playerDamage}の傷。反撃で${enemyDamage}の傷を負った。`),
  };
}

export function useV3Item(state, inventoryIndex) {
  const index = clampInteger(inventoryIndex, -1, -1, state.player.inventory.length - 1);
  const item = state.player.inventory[index];
  if (!item || !item.heal || state.player.hp >= state.player.maxHp) return state;
  const inventory = state.player.inventory.filter((_, itemIndex) => itemIndex !== index);
  const healed = Math.min(item.heal, state.player.maxHp - state.player.hp);
  return {
    ...state,
    player: { ...state.player, hp: state.player.hp + healed, inventory },
    messageLog: addLog(state, `${item.name}を使い、HPが${healed}回復した。`),
  };
}

export function getV3FieldView(context, state, radiusX = 6, radiusY = 5) {
  const discovered = new Set(state.discoveredTiles);
  const tiles = [];
  for (let dy = -radiusY; dy <= radiusY; dy += 1) {
    for (let dx = -radiusX; dx <= radiusX; dx += 1) {
      const x = wrapped(state.player.x + dx, context.width);
      const y = state.player.y + dy;
      const generated = y >= 0 && y < context.height && isV3ChunkGenerated(context, state, x, y);
      const tile = generated ? getV3DetailedTile(context, x, y) : { x, y, type: "ungenerated", name: "生成中", symbol: "", passable: false };
      const visible = discovered.has(tileKey(x, y));
      const entity = visible && generated ? getV3TileEntity(context, x, y, state) : null;
      tiles.push({ ...tile, dx, dy, generated, visible, entity, player: dx === 0 && dy === 0 });
    }
  }
  return { radiusX, radiusY, columns: radiusX * 2 + 1, rows: radiusY * 2 + 1, tiles };
}

export function getV3LocationSummary(context, state) {
  const tile = getV3DetailedTile(context, state.player.x, state.player.y);
  const nearby = nearestV3Settlement(context, tile.x, tile.y, 32);
  const minutes = state.clockMinutes % (24 * 60);
  return {
    tile,
    nationName: tile.nation?.name ?? "無主地",
    regionName: tile.region?.name ?? "未踏地方",
    nearestSettlement: nearby,
    day: Math.floor(state.clockMinutes / (24 * 60)) + 1,
    time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
  };
}

export function v3DirectionNames() {
  return Object.keys(DIRECTIONS);
}
