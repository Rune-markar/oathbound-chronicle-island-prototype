import test from "node:test";
import assert from "node:assert/strict";
import { AUTO_PRESETS, autoBlocker, autoOutcomeStop, autoWorldStop, createAutoState, decideAutoAction, executeAutoAction, findAutoPath, normalizeAutoConfig, recordAutoAction, restoreAutoState, startAutoState } from "../src/v3-auto-mode.js";
import { createV3FieldState, createV3WorldContext, moveV3Player, normalizeV3FieldState, useV3Item } from "../src/v3-field-system.js";
import { normalizeV3MerchantState, observeV3Market, buyV3Commodity, getV3MerchantView } from "../src/v3-merchant-system.js";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import { commitV3Action, normalizeV3IntegratedState } from "../src/v3-system-kernel.js";
import { createV3WorldSimulation } from "../src/v3-world-simulation.js";
import { writeV3Save, readV3Save, V3_SAVE_VERSION } from "../src/v3-save-system.js";

function fixture(config = {}) {
  const nation = { id: "n1", name: "試験国", government: "共和国", peopleId: "human" };
  const region = { id: "r1", nationId: "n1", name: "試験地方" };
  const settlements = [2, 5].map((x, index) => ({ id: `market-${index}`, name: `市場${index}`, nationId: "n1", regionId: "r1", x, y: 2, tileIndex: 16 + x, population: 600, importance: 1, settlementLevel: "village", resourcePotential: { agriculture: 1 }, yields: { food: 5 } }));
  const tiles = Array.from({ length: 48 }, (_, index) => ({ id: `tile-${index}`, index, x: index % 8, y: Math.floor(index / 8), terrain: "grassland", relief: "flat", passable: true, nationId: "n1", regionId: "r1" }));
  const runtime = { terrain: { width: 8, height: 6, seed: "auto-fixture", config: { width: 8, height: 6, wrapX: true } }, tiles, nations: { nations: [nation], regions: [region], objects: settlements, roads: [] }, nationById: new Map([["n1", nation]]), regionById: new Map([["r1", region]]) };
  const context = createV3WorldContext(runtime);
  let state = normalizeV3MerchantState(createV3FieldState(context));
  state.player.gold = 100;
  state = { ...state, autoMode: startAutoState(state, config) };
  return { context, state };
}
function atMarket(context, state, index) {
  const settlement = context.settlements[index];
  return { ...state, pendingEncounter: null, player: { ...state.player, x: settlement.detailX, y: settlement.detailY } };
}
function tradeFixture(config = {}) {
  const setup = fixture({ mode: "trade", source: "market-0", market: "market-1", buyPrice: 999, sellPrice: 0.1, budget: 100, reserveGold: 0, quantity: 2, ...config });
  let state = observeV3Market(setup.context, atMarket(setup.context, setup.state, 0));
  state = observeV3Market(setup.context, atMarket(setup.context, state, 1));
  return { context: setup.context, state: atMarket(setup.context, state, 0) };
}
function apply(context, state, decision) {
  const after = executeAutoAction(context, state, null, decision).state;
  return { ...after, autoMode: recordAutoAction(state.autoMode, state, after, decision) };
}

test("presets and untrusted settings retain bounded options", () => {
  assert.equal(normalizeAutoConfig({ ...AUTO_PRESETS.cautious }).enemy, "stop");
  const c = normalizeAutoConfig({ speed: 999, maxSteps: Infinity, quantity: -1, months: 99999, stopHp: NaN, mode: "anything", autoHeal: "yes" });
  assert.equal(c.speed, 1); assert.equal(c.quantity, 1); assert.equal(c.maxSteps, 100); assert.equal(c.months, 120); assert.equal(c.stopHp, 40); assert.equal(c.mode, "explore"); assert.equal(c.autoHeal, false);
});

test("automatic movement uses the same one-tile movement and clock as manual play", () => {
  const { context, state } = fixture();
  const decision = decideAutoAction(context, state, null);
  assert.equal(decision.kind, "move");
  const result = executeAutoAction(context, state, null, decision).state;
  const manual = moveV3Player(context, state, decision.direction);
  assert.deepEqual(result.player, manual.player); assert.equal(result.steps, manual.steps); assert.equal(result.clock.elapsedMinutes, manual.clock.elapsedMinutes);
});

test("travel wraps east-west and avoids impassable terrain", () => {
  const { context } = fixture();
  assert.deepEqual(findAutoPath(context, { x: 0, y: 10 }, { x: 63, y: 10 }, "short"), ["west"]);
  context.runtime.tiles[10].passable = false;
  context.runtime.tiles[10].terrain = "water";
  const path = findAutoPath(context, { x: 15, y: 12 }, { x: 24, y: 12 }, "short");
  assert.ok(path?.length > 9);
  let x = 15; let y = 12;
  for (const d of path) { x = (x + ({ east: 1, west: -1 }[d] ?? 0) + 64) % 64; y += ({ north: -1, south: 1 }[d] ?? 0); assert.ok(!(x >= 16 && x <= 23 && y >= 8 && y <= 15)); }
  assert.deepEqual([x, y], [24, 12]);
  assert.equal(findAutoPath(context, { x: 0, y: 0 }, { x: 10, y: 20 }, "roads", 1), null);
});

test("arrival and invalid destinations stop instead of moving arbitrarily", () => {
  const { context, state } = fixture({ mode: "travel", destination: "market-0" });
  assert.equal(decideAutoAction(context, atMarket(context, state, 0), null).completed, true);
  state.autoMode.config.destination = "removed";
  assert.match(decideAutoAction(context, state, null).reason, /目的地/);
});

test("healing consumes real inventory before the HP stop and cannot invent supplies", () => {
  const { context, state } = fixture();
  state.player.hp = 1;
  state.player.inventory = [{ id: "herb", name: "薬草", heal: 18 }];
  const decision = decideAutoAction(context, state, null);
  assert.equal(decision.kind, "item");
  const result = executeAutoAction(context, state, null, decision).state;
  assert.deepEqual(result.player, useV3Item(state, 0).player);
  state.player.inventory = [];
  assert.match(decideAutoAction(context, state, null).reason, /HP/);
});

test("encounter options stop, converse, retreat with a cap, or reject stronger enemies", () => {
  const { context, state } = fixture();
  state.pendingEncounter = { type: "npc", name: "旅人" };
  assert.equal(decideAutoAction(context, state, null).action, "talk");
  state.autoMode.config.npc = "stop";
  assert.equal(decideAutoAction(context, state, null).kind, "stop");
  state.pendingEncounter = { type: "enemy", name: "敵", level: 1, fleeAttempts: 0 };
  assert.equal(decideAutoAction(context, state, null).kind, "stop");
  state.autoMode.config.enemy = "flee";
  assert.equal(decideAutoAction(context, state, null).action, "flee");
  state.pendingEncounter.fleeAttempts = 2;
  assert.match(decideAutoAction(context, state, null).reason, /2回/);
  state.autoMode.config.enemy = "fight";
  assert.equal(decideAutoAction(context, state, null).action, "fight");
  state.pendingEncounter.level = 99;
  assert.match(decideAutoAction(context, state, null).reason, /高レベル/);
});

test("military handoffs and organization and company decisions are mandatory stops", () => {
  const { state } = fixture();
  state.pendingEncounter = { type: "group-battle" };
  assert.match(autoBlocker(state, state.autoMode), /集団戦/);
  state.pendingEncounter = null;
  state.merchant.company.pendingIncidents = [{}];
  assert.match(autoBlocker(state, state.autoMode), /事故/);
  state.merchant.company.pendingIncidents = [];
  state.criminal = { crime: { organization: { pendingDecisions: [{}] } } };
  assert.match(autoBlocker(state, state.autoMode), /事後判断/);
});

test("steps, game time, and repeated exploration have finite bounds", () => {
  const { context, state } = fixture({ maxSteps: 1, maxHours: 1 });
  state.autoMode.steps = 1;
  assert.equal(decideAutoAction(context, state, null).completed, true);
  state.autoMode.steps = 0;
  state.autoMode.startMinutes = state.clock.elapsedMinutes - 59;
  assert.throws(() => executeAutoAction(context, state, null, { kind: "move", direction: "east" }), /上限/);
  state.autoMode.startMinutes = state.clock.elapsedMinutes;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) for (let i = 0; i < 4; i++) state.autoMode.visited.push(`${state.player.x + dx},${state.player.y + dy}`);
  assert.match(decideAutoAction(context, state, null).reason, /往復/);
});

test("trade only uses recorded markets and current onsite prices", () => {
  const { context, state } = tradeFixture();
  const decision = decideAutoAction(context, state, null);
  assert.equal(decision.kind, "buy");
  const automated = executeAutoAction(context, state, null, decision).state;
  const manual = buyV3Commodity(context, state, "grain", 1);
  assert.deepEqual(automated.player, manual.player);
  assert.deepEqual(automated.merchant.trade, manual.merchant.trade);
  state.merchant.trade.knownSettlements = [];
  assert.match(decideAutoAction(context, state, null).reason, /相場/);
});

test("trade caps purchase price, reserve and total budget before each purchase", () => {
  const { context, state } = tradeFixture();
  const price = getV3MerchantView(context, state).market.goods.grain.buyPrice;
  state.autoMode.config.buyPrice = price - 0.1;
  assert.match(decideAutoAction(context, state, null).reason, /仕入価格/);
  state.autoMode.config.buyPrice = price;
  state.autoMode.config.reserveGold = state.player.gold;
  assert.match(decideAutoAction(context, state, null).reason, /残す銀貨/);
  state.autoMode.config.reserveGold = 0;
  state.autoMode.config.budget = price;
  const after = apply(context, state, decideAutoAction(context, state, null));
  assert.equal(after.autoMode.bought, 1);
  assert.match(decideAutoAction(context, after, null).reason, /予算/);
});

test("trade sells only this run's bought quantity, honors minimum price and returns home", () => {
  let { context, state } = tradeFixture();
  for (let i = 0; i < 2; i++) state = apply(context, state, decideAutoAction(context, state, null));
  state = apply(context, state, decideAutoAction(context, state, null));
  assert.equal(state.autoMode.phase, "sell");
  state = atMarket(context, state, 1);
  state.autoMode.config.sellPrice = 9999;
  assert.match(decideAutoAction(context, state, null).reason, /売却価格/);
  state.autoMode.config.sellPrice = 0.1;
  for (let i = 0; i < 2; i++) state = apply(context, state, decideAutoAction(context, state, null));
  state = apply(context, state, decideAutoAction(context, state, null));
  assert.equal(state.autoMode.phase, "return");
  assert.equal(state.merchant.trade.cargo.length, 0);
  state = atMarket(context, state, 0);
  assert.equal(decideAutoAction(context, state, null).completed, true);
});

test("world interruption is triggered by new wars and crises, not already active ones", () => {
  const before = { generatedWorld: { worldWars: { activeWars: [{ id: "old" }] } }, externalCrises: { activeCrises: [] } };
  const after = structuredClone(before);
  assert.equal(autoWorldStop(before, after, { stopWar: true, stopCrisis: true }), null);
  after.externalCrises.activeCrises.push({ id: "new" });
  assert.match(autoWorldStop(before, after, { stopCrisis: true }), /危機/);
  after.generatedWorld.worldWars.activeWars.push({ id: "new-war" });
  assert.match(autoWorldStop(before, after, { stopWar: true }), /戦争/);
  assert.equal(autoWorldStop(before, after, { stopWar: false, stopCrisis: false }), null);
});

test("monthly observation uses the integrated kernel, stops at its limit, and saves paused on restore", () => {
  const options = createGeneratedWorldState({ seed: "auto-integrated", width: 24, height: 16, plateCount: 4, nationCount: 3 });
  const runtime = buildGeneratedWorld(options); const context = createV3WorldContext(runtime, options.seed);
  let world = createV3WorldSimulation(runtime, options);
  let state = normalizeV3IntegratedState(context, createV3FieldState(context));
  state.autoMode = startAutoState(state, { mode: "observe", months: 2 });
  for (let i = 0; i < 2; i++) {
    const decision = decideAutoAction(context, state, world);
    assert.equal(decision.kind, "month");
    const result = commitV3Action(runtime, context, state, world, executeAutoAction(context, state, world, decision), { source: "auto-mode" });
    assert.equal(result.crossedMonths.length, 1);
    result.state.autoMode = recordAutoAction(state.autoMode, state, result.state, decision);
    state = result.state; world = result.worldSimulation;
  }
  assert.equal(world.month, 6); assert.equal(state.autoMode.months, 2);
  assert.equal(decideAutoAction(context, state, world).completed, true);
  const data = new Map(); const storage = { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) };
  writeV3Save(storage, "save", { version: V3_SAVE_VERSION, world: options, field: state, worldSimulation: world });
  const saved = readV3Save(storage, "save");
  const restoredField = normalizeV3FieldState(context, saved.field);
  const restored = restoreAutoState(restoredField.autoMode);
  assert.equal(restored.status, "paused"); assert.equal(restored.months, 2); assert.deepEqual(restored.config, state.autoMode.config);
  assert.equal(restoreAutoState(undefined).status, "idle");
  assert.equal(createAutoState().status, "idle");
});


test("retreat and defeat stop before automatic re-entry while victory may continue", () => {
  const { state } = fixture();
  state.pendingEncounter = { type: "enemy", name: "敵" };
  const after = { ...state, pendingEncounter: null };
  assert.match(autoOutcomeStop(state, after, { kind: "encounter", action: "flee" }), /退避/);
  assert.match(autoOutcomeStop(state, after, { kind: "encounter", action: "fight" }), /敗北/);
  assert.equal(autoOutcomeStop(state, { ...after, player: { ...after.player, xp: 20 } }, { kind: "encounter", action: "fight" }), null);
});

test("automatic purchases update world inventory and stop at the changed onsite price", () => {
  const options = createGeneratedWorldState({ seed: "auto-real-market", width: 40, height: 24, plateCount: 5, nationCount: 3 });
  const runtime = buildGeneratedWorld(options); const context = createV3WorldContext(runtime, options.seed);
  let world = createV3WorldSimulation(runtime, options);
  context.worldSimulation = world;
  let state = normalizeV3IntegratedState(context, createV3FieldState(context));
  state.player.gold = 100;
  const [source, market] = context.settlements;
  assert.ok(source && market);
  state = observeV3Market(context, atMarket(context, state, 0), world);
  state = observeV3Market(context, atMarket(context, state, 1), world);
  state = atMarket(context, state, 0);
  const beforeMarket = getV3MerchantView(context, state, world).market.goods.grain;
  state.autoMode = startAutoState(state, { mode: "trade", source: source.id, market: market.id, buyPrice: beforeMarket.buyPrice, quantity: 12, budget: 100, reserveGold: 0 });
  const beforeInventory = world.marketEconomy.settlements[source.id].goods.grain.inventory;
  let bought = 0;
  for (let i = 0; i < 12; i++) {
    const decision = decideAutoAction(context, state, world);
    if (decision.kind === "stop") { assert.match(decision.reason, /仕入価格|在庫/); break; }
    assert.equal(decision.kind, "buy");
    const result = commitV3Action(runtime, context, state, world, executeAutoAction(context, state, world, decision));
    result.state.autoMode = recordAutoAction(state.autoMode, state, result.state, decision);
    state = result.state; world = result.worldSimulation; context.worldSimulation = world; bought++;
    assert.equal(world.marketEconomy.settlements[source.id].goods.grain.inventory, beforeInventory - bought);
  }
  assert.ok(bought > 0 && bought < 12);
  assert.ok(getV3MerchantView(context, state, world).market.goods.grain.buyPrice > beforeMarket.buyPrice);
});
