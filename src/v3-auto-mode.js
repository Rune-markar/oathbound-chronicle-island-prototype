import { EXPLORATION_GOALS, COMBAT_POLICIES, autoWorldEvents, restoreAutoExperience, startAutoExperience, recordAutoExperience } from "./v3-auto-experience.js";
import { getV3CombatForecast, getV3DetailedTile, getV3FieldView, moveV3Player, resolveV3Encounter, useV3Item } from "./v3-field-system.js";
import { buyV3Commodity, sellV3Commodity, getV3CurrentMarket, getV3MerchantView } from "./v3-merchant-system.js";
import { advanceV3MilitaryArrival } from "./v3-group-combat.js";
import { createActionResult } from "./action-result.js";
import { GAME_MINUTES_PER_MONTH } from "./game-clock.js";

export const AUTO_MODES = Object.freeze({ explore: "周辺を探索", travel: "目的地へ移動", trade: "交易巡回", observe: "世界を観測" });
export const AUTO_PRESETS = Object.freeze({
  cautious: { name: "慎重", enemy: "stop", npc: "stop", stopHp: 60, healHp: 80, autoHeal: true, route: "roads" },
  balanced: { name: "標準", enemy: "stop", npc: "talk", stopHp: 40, healHp: 70, autoHeal: true, route: "roads" },
  adventurous: { name: "積極的", enemy: "fight", npc: "talk", stopHp: 30, healHp: 60, autoHeal: true, route: "short" },
});
const DEFAULTS = Object.freeze({
  mode: "explore", preset: "balanced", ...AUTO_PRESETS.balanced,
  destination: "", source: "", market: "", commodity: "grain", quantity: 3,
  buyPrice: 5, sellPrice: 6, reserveGold: 5, budget: 30, laps: 1,
  maxSteps: 100, maxHours: 72, months: 3, speed: 1,
  stopWar: true, stopCrisis: true, exploreGoal: "settlement", worldScope: "relevant", watchNation: "", combatPolicy: "balanced", reserveHealing: 1, stopFirstEnemy: false,
});
const DIRECTIONS = Object.freeze([
  { id: "north", dx: 0, dy: -1 }, { id: "east", dx: 1, dy: 0 },
  { id: "south", dx: 0, dy: 1 }, { id: "west", dx: -1, dy: 0 },
]);
const wrap = (x, width) => ((x % width) + width) % width;
const key = (x, y) => `${x},${y}`;
const number = (value, fallback, min, max, integer = false) => {
  const parsed = Number(value);
  const bounded = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  return integer ? Math.floor(bounded) : Math.round(bounded * 10) / 10;
};
const choice = (value, values, fallback) => values.includes(value) ? value : fallback;

export function normalizeAutoConfig(source = {}) {
  const c = { ...DEFAULTS, ...source };
  return {
    exploreGoal: choice(c.exploreGoal, Object.keys(EXPLORATION_GOALS), "settlement"),
    worldScope: choice(c.worldScope, ["relevant", "all"], "relevant"),
    watchNation: String(c.watchNation ?? "").slice(0, 160),
    combatPolicy: choice(c.combatPolicy, Object.keys(COMBAT_POLICIES), "balanced"),
    reserveHealing: number(c.reserveHealing, 1, 0, 12, true), stopFirstEnemy: c.stopFirstEnemy === true,
    mode: choice(c.mode, Object.keys(AUTO_MODES), "explore"),
    preset: choice(c.preset, Object.keys(AUTO_PRESETS), "balanced"),
    enemy: choice(c.enemy, ["stop", "flee", "fight"], "stop"),
    npc: choice(c.npc, ["stop", "talk", "leave"], "stop"),
    route: choice(c.route, ["roads", "short"], "roads"),
    autoHeal: c.autoHeal === true, stopWar: c.stopWar !== false, stopCrisis: c.stopCrisis !== false,
    stopHp: number(c.stopHp, 40, 10, 90, true), healHp: number(c.healHp, 70, 10, 95, true),
    destination: String(c.destination ?? "").slice(0, 160), source: String(c.source ?? "").slice(0, 160), market: String(c.market ?? "").slice(0, 160),
    commodity: choice(c.commodity, ["grain", "timber", "herbs", "iron", "wool", "salt"], "grain"),
    quantity: number(c.quantity, 3, 1, 12, true), buyPrice: number(c.buyPrice, 5, 0.1, 9999), sellPrice: number(c.sellPrice, 6, 0.1, 9999),
    reserveGold: number(c.reserveGold, 5, 0, 999999), budget: number(c.budget, 30, 0.1, 999999),
    laps: number(c.laps, 1, 1, 20, true), maxSteps: number(c.maxSteps, 100, 1, 10000, true),
    maxHours: number(c.maxHours, 72, 1, 720, true), months: number(c.months, 3, 1, 120, true),
    speed: choice(Number(c.speed), [1, 2, 4], 1),
  };
}

export function createAutoState(config = {}) {
  return { ...restoreAutoExperience(), version: 1, config: normalizeAutoConfig(config), status: "idle", reason: "方針を選んで開始できます。", actions: 0, steps: 0, months: 0, laps: 0, bought: 0, sold: 0, spent: 0, phase: "buy", startGold: 0, startMinutes: 0, visited: [], log: [] };
}

export function restoreAutoState(source) {
  const auto = createAutoState(source?.config);
  if (source?.version !== 1) return auto;
  for (const field of ["actions", "steps", "months", "laps", "bought", "sold", "spent", "startGold", "startMinutes"]) auto[field] = number(source[field], 0, 0, 1e9);
  auto.phase = choice(source.phase, ["buy", "sell", "return"], "buy");
  auto.status = choice(source.status, ["idle", "paused", "completed"], "paused");
  auto.reason = source.status === "running" ? "再読込したため一時停止しました。" : String(source.reason ?? auto.reason).slice(0, 180);
  auto.visited = Array.isArray(source.visited) ? source.visited.filter((entry) => /^\d+,\d+$/.test(entry)).slice(-256) : [];
  auto.log = Array.isArray(source.log) ? source.log.map(String).map((entry) => entry.slice(0, 180)).slice(0, 20) : [];
  return { ...auto, ...restoreAutoExperience(source) };
}

export function startAutoState(state, config, context = null) {
  return { ...createAutoState(config), ...startAutoExperience(state, context), status: "running", reason: "開始します。", startGold: state.player.gold, startMinutes: state.clock.elapsedMinutes };
}

export function autoDestination(context, state, id) {
  if (id === "mission") {
    const target = state.military?.activeMission?.target;
    return target ? { x: target.x, y: target.y, name: "軍務作戦地点" } : null;
  }
  const settlement = context.settlementById.get(id);
  return settlement ? { x: settlement.detailX, y: settlement.detailY, name: settlement.name } : null;
}

export function autoDistance(context, a, b) {
  const dx = Math.abs(a.x - b.x);
  return Math.min(dx, context.width - dx) + Math.abs(a.y - b.y);
}

// Bounded A*: terrain only, never queries unseen actors or market prices.
export function findAutoPath(context, from, to, route = "roads", limit = 24000) {
  if (!to || !Number.isInteger(to.x) || !Number.isInteger(to.y) || to.y < 0 || to.y >= context.height) return null;
  const target = { x: wrap(to.x, context.width), y: to.y };
  const heap = [];
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].score <= entry.score) break;
      heap[i] = heap[parent]; i = parent;
    }
    heap[i] = entry;
  };
  const pop = () => {
    const first = heap[0]; const last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
        if (heap[child].score >= last.score) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  };
  const origin = key(from.x, from.y);
  const costs = new Map([[origin, 0]]); const parents = new Map(); const closed = new Set();
  push({ ...from, cost: 0, score: 0 });
  while (heap.length && closed.size < limit) {
    const current = pop(); const currentKey = key(current.x, current.y);
    if (closed.has(currentKey)) continue;
    if (current.x === target.x && current.y === target.y) {
      const path = []; let cursor = currentKey;
      while (cursor !== origin) { const link = parents.get(cursor); path.push(link.direction); cursor = link.parent; }
      return path.reverse();
    }
    closed.add(currentKey);
    for (const direction of DIRECTIONS) {
      const x = wrap(current.x + direction.dx, context.width); const y = current.y + direction.dy;
      if (y < 0 || y >= context.height) continue;
      const nextKey = key(x, y);
      if (closed.has(nextKey)) continue;
      const tile = getV3DetailedTile(context, x, y);
      if (!tile.passable) continue;
      const cost = current.cost + (route === "roads" && !(tile.onRoad || tile.settlement) ? 3 : 1);
      if (cost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, cost); parents.set(nextKey, { parent: currentKey, direction: direction.id });
      // Slightly weighted search keeps distant destinations responsive; no shortest-path promise.
      push({ x, y, cost, score: cost + autoDistance(context, { x, y }, target) * 1.5 });
    }
  }
  return null;
}

const stop = (reason, completed = false) => ({ kind: "stop", reason, completed });
const update = (patch, reason) => ({ kind: "update", patch, reason });

export function autoBlocker(state, auto) {
  if (state.pendingEncounter?.type === "group-battle") return "軍務作戦地点に到着しました。集団戦の準備を選んでください。";
  if (state.merchant?.company?.pendingIncidents?.length) return "商会の事故報告に判断が必要です。";
  const organization = state.criminal?.crime?.organization;
  if (organization?.pendingDecisions?.length) return "組織の事後判断を選んでください。";
  if (organization?.activeOrders?.some((order) => order.status === "report_ready")) return "組織の作戦報告を確認してください。";
  if (auto.actions >= 30000) return "実行回数の上限に達しました。";
  return null;
}

export function decideAutoAction(context, state, worldSimulation, routeCache = {}) {
  const auto = state.autoMode; const c = auto.config;
  const blocked = autoBlocker(state, auto);
  if (blocked) return stop(blocked);
  const hp = state.player.hp / state.player.maxHp * 100;
  if (c.autoHeal && hp <= Math.max(c.healHp, c.stopHp) && hp < 100) {
    const index = state.player.inventory.findIndex((item) => item.heal > 0);
    if (index >= 0 && (c.combatPolicy !== "supplies" || state.player.inventory.filter((item) => item.heal > 0).length > c.reserveHealing)) return { kind: "item", index, reason: "所持している回復品を使います。" };
  }
  if (hp <= c.stopHp) return stop(`HPが停止条件（${c.stopHp}%以下）に達しました。`);
  if (state.pendingEncounter) {
    const e = state.pendingEncounter;
    if (e.type === "npc") return c.npc === "stop" ? stop(`${e.name}に出会いました。`) : { kind: "encounter", action: c.npc, reason: c.npc === "talk" ? `${e.name}と話します。` : `${e.name}と別れます。` };
    if (e.type !== "enemy" || c.enemy === "stop") return stop(`${e.name ?? "相手"}への対応を選んでください。`);
    if (c.enemy === "flee") return (e.fleeAttempts ?? 0) >= 2 ? stop("退避に2回失敗しました。対応を選んでください。") : { kind: "encounter", action: "flee", reason: "敵から退避を試みます。" };
    if (c.combatPolicy === "cargo" && state.merchant?.trade?.cargo?.some((entry) => entry.quantity > 0)) return stop("積荷を守る方針です。退避か戦闘を選んでください。");
    if (c.stopFirstEnemy && !auto.knownEnemies?.includes(e.id ?? e.name)) return stop(`初めての敵：${e.name}。戦い方を確認してください。`);
    const forecast = getV3CombatForecast(context, state);
    if (forecast && forecast.remainingHp <= state.player.maxHp * c.stopHp / 100) return stop(`次の反撃は${forecast.retaliation}。HPが停止条件以下になるため、回復か退避を選んでください。`);
    if (e.level > state.player.level) return stop("主人公より高レベルの敵です。対応を選んでください。");
    return { kind: "encounter", action: "fight", reason: "同レベル以下の敵を攻撃します。" };
  }
  if (c.mode === "observe") {
    if (auto.months >= c.months) return stop(`${auto.months}か月の観測を終えました。`, true);
    return { kind: "month", reason: "世界・商会・組織を1か月進めます。" };
  }
  if (c.mode === "explore" && auto.explorationReturning && auto.origin && autoDistance(context, state.player, auto.origin) === 0) return stop("周辺調査を終えて出発地へ帰還しました。", true);
  if (c.mode === "travel" && autoDestination(context, state, c.destination) && autoDistance(context, state.player, autoDestination(context, state, c.destination)) === 0) return stop(`${autoDestination(context, state, c.destination).name}に到着しました。`, true);
  if (c.mode === "trade" && auto.phase === "return" && getV3CurrentMarket(context, state)?.id === c.source) {
    if (auto.returnCargo) return stop("残った積荷を仕入市場へ持ち帰りました。市場で処分を選べます。", true);
    if (auto.laps + 1 >= c.laps) return { ...stop(`${auto.laps + 1}往復を終えました。`, true), patch: { laps: auto.laps + 1 } };
  }
  if (auto.steps >= c.maxSteps) {
    const completed = c.mode === "explore" && c.exploreGoal === "wander";
    return stop(`${c.maxSteps}歩の上限に達しました。${completed ? "" : "今回の目的は未完了です。上限を変更して続けられます。"}`, completed);
  }
  if (state.clock.elapsedMinutes - auto.startMinutes >= c.maxHours * 60) return stop(`${c.maxHours}時間の上限に達しました。目的達成前の場合は上限を変更して再開できます。`);
  if (c.mode === "explore" && auto.explorationReturning && auto.origin) {
    const path = findAutoPath(context, state.player, auto.origin, c.route);
    return path?.length ? { kind: "move", direction: path[0], reason: "調査を終え、出発地へ帰っています。" } : stop("帰還経路を見つけられません。地図で進路を確認してください。");
  }
  if (c.mode === "explore" && c.exploreGoal === "survey" && auto.steps >= Math.max(1, Math.floor(c.maxSteps / 2))) return update({ explorationReturning: true }, "調査区間を終えました。帰還します。");
  if (c.mode === "explore") {
    const visible = getV3FieldView(context, state);
    const visits = new Map();
    for (const tileKey of auto.visited) visits.set(tileKey, (visits.get(tileKey) ?? 0) + 1);
    const candidates = visible.tiles.filter((tile) => tile.visible && tile.passable && Math.abs(tile.dx) + Math.abs(tile.dy) === 1)
      .map((tile) => ({ tile, score: (tile.settlement && !auto.knownPlaces?.includes(tile.settlement.id) ? -20 : 0) + (visits.get(key(tile.x, tile.y)) ?? 0) * 100 + (c.route === "roads" && !tile.onRoad && !tile.settlement ? 3 : 0) + tile.travelMinutes / 100 }))
      .sort((a, b) => a.score - b.score || a.tile.y - b.tile.y || a.tile.x - b.tile.x);
    if (!candidates.length) return stop("周囲に進めるマスがありません。");
    if ((visits.get(key(candidates[0].tile.x, candidates[0].tile.y)) ?? 0) >= 4) return stop("同じ場所の往復が続いたため停止しました。");
    const tile = candidates[0].tile;
    return { kind: "move", direction: DIRECTIONS.find((d) => d.dx === tile.dx && d.dy === tile.dy).id, reason: "まだ歩いていない周辺を優先して探索します。" };
  }
  let destinationId = c.destination;
  if (c.mode === "trade") {
    const known = new Set(state.merchant?.trade?.knownSettlements?.map((s) => s.id));
    if (!known.has(c.source) || !known.has(c.market) || c.source === c.market) return stop("相場を記録した異なる二つの市場を指定してください。");
    destinationId = auto.phase === "sell" ? c.market : c.source;
    const currentMarket = getV3CurrentMarket(context, state);
    if (currentMarket?.id === destinationId) {
      if (auto.phase === "return") {
        return update({ laps: auto.laps + 1, phase: "buy", bought: 0, sold: 0 }, "仕入市場へ戻りました。次の巡回を始めます。");
      }
      const view = getV3MerchantView(context, state, worldSimulation);
      const good = view.market.goods[c.commodity];
      if (auto.phase === "buy") {
        if (auto.bought >= c.quantity) return update({ phase: "sell" }, "仕入れを終え、販売市場へ向かいます。");
        if (good.buyPrice > c.buyPrice) return stop(`仕入価格${good.buyPrice}が上限${c.buyPrice}を超えました。`);
        if (good.stock < 1) return stop("仕入市場の在庫がありません。");
        if (state.player.gold - good.buyPrice < c.reserveGold - 0.001) return stop("残す銀貨の条件に達しました。");
        if (auto.spent + good.buyPrice > c.budget + 0.001) return stop("仕入予算の上限に達しました。");
        return { kind: "buy", commodity: c.commodity, reason: `${good.name}を1個仕入れます。` };
      }
      if (auto.sold >= auto.bought) return update({ phase: "return" }, "売却を終え、仕入市場へ戻ります。");
      if (good.sellPrice < c.sellPrice) return stop(`売却価格${good.sellPrice}が下限${c.sellPrice}を下回りました。`);
      if (!view.cargo.some((entry) => entry.commodityId === c.commodity && entry.quantity >= 1)) return stop("売却する積荷がありません。");
      return { kind: "sell", commodity: c.commodity, reason: `${good.name}を1個売却します。` };
    }
  }
  const destination = autoDestination(context, state, destinationId);
  if (!destination) return stop("目的地を指定してください。");
  if (autoDistance(context, state.player, destination) === 0) return stop(`${destination.name}に到着しました。`, true);
  const cacheKey = `${destination.x},${destination.y}:${c.route}`;
  if (routeCache.key !== cacheKey || routeCache.position !== key(state.player.x, state.player.y) || !routeCache.path?.length) {
    routeCache.key = cacheKey;
    routeCache.path = findAutoPath(context, state.player, destination, c.route);
  }
  if (!routeCache.path?.length) return stop("探索範囲内で経路を見つけられませんでした。近い目的地を指定してください。");
  const direction = routeCache.path.shift(); const delta = DIRECTIONS.find((d) => d.id === direction);
  routeCache.position = key(wrap(state.player.x + delta.dx, context.width), state.player.y + delta.dy);
  return { kind: "move", direction, reason: `${destination.name}へ移動しています。` };
}

export function autoWorldStop(before, after, config, context = null, state = null) {
  if (context) return autoWorldEvents(before, after, config, context, state).find((event) => event.stop)?.message ?? null;
  const priorWars = new Set(before?.generatedWorld?.worldWars?.activeWars?.map((war) => war.id));
  if (config.stopWar && after?.generatedWorld?.worldWars?.activeWars?.some((war) => !priorWars.has(war.id))) return "新しい戦争が始まりました。世界地図を確認してください。";
  const priorCrises = new Set(before?.externalCrises?.activeCrises?.map((crisis) => crisis.id));
  if (config.stopCrisis && after?.externalCrises?.activeCrises?.some((crisis) => !priorCrises.has(crisis.id))) return "新しい外部危機が発生しました。世界地図を確認してください。";
  return null;
}

export function autoOutcomeStop(before, after, decision, previousWorld, world, context = null) {
  const worldReason = autoWorldStop(previousWorld, world, before.autoMode.config, context, after);
  const blocker = autoBlocker(after, after.autoMode);
  if (worldReason || blocker) return worldReason ?? blocker;
  if (before.autoMode.config.mode === "explore" && before.autoMode.config.exploreGoal === "settlement"
    && after.autoMode.discoveries?.length > (before.autoMode.discoveries?.length ?? 0)) return `${after.autoMode.discoveries.at(-1)}の市場を発見しました。市場を調べるか探索を続けられます。`;
  if (decision.kind !== "encounter" || after.pendingEncounter) return null;
  if (decision.action === "flee") return "退避しました。進路を確認してから再開してください。";
  if (decision.action === "fight" && after.player.xp === before.player.xp) return "敗北したため停止しました。道具や現在地を確認してください。";
  return null;
}

export function recordAutoAction(auto, before, after, decision, context = null, previousWorld = null, world = null) {
  const moved = before.player.x !== after.player.x || before.player.y !== after.player.y;
  return {
    ...auto, ...recordAutoExperience(auto, before, after, decision, context, previousWorld, world), ...(decision.patch ?? {}), actions: auto.actions + 1,
    steps: auto.steps + Math.max(0, after.steps - before.steps),
    months: auto.months + (decision.kind === "month" ? 1 : 0),
    bought: decision.kind === "buy" ? auto.bought + 1 : decision.patch?.bought ?? auto.bought,
    sold: decision.kind === "sell" ? auto.sold + 1 : decision.patch?.sold ?? auto.sold,
    spent: Math.round((auto.spent + (decision.kind === "buy" ? before.player.gold - after.player.gold : 0)) * 10) / 10,
    visited: moved ? [...auto.visited, key(before.player.x, before.player.y)].slice(-256) : auto.visited,
    reason: decision.reason,
    log: [["update", "month"].includes(decision.kind) ? decision.reason : after.messageLog?.[0] ?? decision.reason, ...auto.log].slice(0, 20),
  };
}

export function executeAutoAction(context, state, worldSimulation, decision) {
  let next = state;
  if (decision.kind === "move") next = advanceV3MilitaryArrival(context, state, moveV3Player(context, state, decision.direction));
  else if (decision.kind === "item") next = useV3Item(state, decision.index);
  else if (decision.kind === "encounter") next = resolveV3Encounter(context, state, decision.action);
  else if (decision.kind === "buy") next = buyV3Commodity(context, state, decision.commodity, 1, worldSimulation);
  else if (decision.kind === "sell") next = sellV3Commodity(context, state, decision.commodity, 1, worldSimulation);
  else if (decision.kind === "month") return createActionResult(state, { elapsedMinutes: GAME_MINUTES_PER_MONTH });
  if (decision.kind === "move" && next.steps === state.steps) throw new Error("次のマスへ進めないため停止しました。");
  if (state.autoMode.config.mode !== "observe" && next.clock.elapsedMinutes - state.autoMode.startMinutes > state.autoMode.config.maxHours * 60) throw new Error("次の行動で実行時間の上限を超えるため停止しました。");
  return createActionResult(next);
}

export function reviseAutoPlan(auto, config) {
  const next = normalizeAutoConfig(config);
  for (const field of ["mode", "source", "market", "commodity", "exploreGoal"]) {
    if (next[field] !== auto.config[field]) throw new Error("行動・探索目的・市場・商品の変更は、新しい実行で開始してください。");
  }
  if (next.budget < auto.spent) throw new Error(`すでに仕入れに${auto.spent}使っています。総予算をそれ以上にしてください。`);
  return { ...auto, config: next, status: "paused", reason: "進捗・積荷・使用済み予算を保って条件を変更しました。" };
}

export function returnAutoCargo(auto) {
  if (auto.config.mode !== "trade") throw new Error("交易巡回中だけ積荷を持ち帰れます。");
  return { ...auto, phase: "return", returnCargo: true, status: "running", reason: "売却を中止し、残った積荷を持ち帰ります。" };
}
