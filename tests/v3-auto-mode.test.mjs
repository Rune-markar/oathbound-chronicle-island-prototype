import { autoTradePreview, autoWorldEvents, autoNextGoal } from "../src/v3-auto-experience.js";
import test from "node:test";
import assert from "node:assert/strict";
import { AUTO_PRESETS, autoBlocker, autoOutcomeStop, autoWorldStop, createAutoState, decideAutoAction, executeAutoAction, findAutoPath, normalizeAutoConfig, recordAutoAction, restoreAutoState, startAutoState, reviseAutoPlan, returnAutoCargo } from "../src/v3-auto-mode.js";
import { getV3CombatForecast, resolveV3Encounter, createV3FieldState, createV3WorldContext, moveV3Player, normalizeV3FieldState, useV3Item } from "../src/v3-field-system.js";
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
  assert.equal(decideAutoAction(context, state, null).completed, false);
  state.autoMode.config.exploreGoal = "survey";
  assert.equal(decideAutoAction(context, state, null).completed, false);
  state.autoMode.config.exploreGoal = "wander";
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

test("changing a paused trade plan preserves cargo accounting, progress and total budget", () => {
  const { context, state } = tradeFixture();
  const bought = apply(context, state, decideAutoAction(context, state, null));
  const auto = { ...bought.autoMode, status: "paused", phase: "sell", steps: 23 };
  const revised = reviseAutoPlan(auto, { ...auto.config, sellPrice: 0.5, maxSteps: 250 });
  assert.equal(revised.bought, 1); assert.equal(revised.spent, auto.spent);
  assert.equal(revised.phase, "sell"); assert.equal(revised.steps, 23);
  assert.throws(() => reviseAutoPlan(auto, { ...auto.config, commodity: "salt" }), /新しい実行/);
  assert.throws(() => reviseAutoPlan(auto, { ...auto.config, budget: 0.1 }), /すでに仕入れ/);
  const restored = restoreAutoState(revised);
  assert.equal(restored.spent, auto.spent); assert.equal(restored.config.sellPrice, 0.5);
});

test("returning cargo stops at the source without restarting purchases or selling old cargo", () => {
  const { context, state } = tradeFixture();
  const bought = apply(context, state, decideAutoAction(context, state, null));
  const returning = { ...bought, autoMode: returnAutoCargo(bought.autoMode) };
  const decision = decideAutoAction(context, returning, null);
  assert.equal(decision.completed, true);
  assert.match(decision.reason, /積荷.*持ち帰/);
  assert.equal(returning.merchant.trade.cargo[0].quantity, 1);
});

test("step limit in a trade route is an unfinished pause, not a completed journey", () => {
  const { context, state } = tradeFixture({ maxSteps: 1 });
  state.autoMode.steps = 1;
  const decision = decideAutoAction(context, state, null);
  assert.equal(decision.completed, false); assert.match(decision.reason, /未完了/);
});

test("survey returns to its actual starting tile after its outward allocation", () => {
  const { context, state } = fixture({ exploreGoal: "survey", maxSteps: 12, autoHeal: false });
  let current = state;
  for (let i = 0; i < 30; i++) {
    const decision = decideAutoAction(context, current, null);
    if (decision.kind === "stop") {
      assert.equal(decision.completed, true); assert.match(decision.reason, /帰還/);
      assert.deepEqual([current.player.x, current.player.y], [state.player.x, state.player.y]);
      assert.ok(current.steps > 0); return;
    }
    current = apply(context, current, decision);
  }
  assert.fail("survey did not finish");
});

test("market discovery pauses once and remains known after a new plan and save restore", () => {
  const { context, state } = fixture({ exploreGoal: "settlement" });
  const after = atMarket(context, state, 1);
  after.steps += 1;
  after.autoMode = recordAutoAction(state.autoMode, state, after, { kind: "move" }, context);
  assert.equal(after.autoMode.discoveries[0], "市場1");
  assert.match(autoOutcomeStop(state, after, { kind: "move" }, null, null, context), /市場.*発見/);
  const restarted = startAutoState({ ...after, autoMode: restoreAutoState(after.autoMode) }, state.autoMode.config, context);
  assert.ok(restarted.knownPlaces.includes("market-1"));
  assert.deepEqual(restarted.discoveries, []);
});

test("summary survives movement log churn and does not include later manual spending", () => {
  const { context, state } = fixture();
  const after = { ...state, player: { ...state.player, inventory: [{ name: "薬草", heal: 18 }], gold: state.player.gold + 3 }, messageLog: ["薬草を拾った。"] };
  let auto = recordAutoAction(state.autoMode, state, after, { kind: "move" }, context);
  for (let i = 0; i < 25; i++) auto = recordAutoAction(auto, after, { ...after, messageLog: ["東へ7分進んだ。街道。"] }, { kind: "move" }, context);
  assert.equal(auto.summary.items, 1); assert.equal(auto.summary.gold, 3);
  assert.ok(auto.highlights.includes("薬草を拾った。"));
  const spent = { ...after, player: { ...after.player, gold: 0 }, autoMode: auto };
  assert.equal(restoreAutoState(spent.autoMode).summary.gold, 3);
});

test("related-country stop filters distant crises and shows the affected place", () => {
  const { context, state } = fixture();
  const before = { externalCrises: { activeCrises: [] } };
  const after = { externalCrises: { activeCrises: [
    { id: "remote", nationId: "n2", regionId: "r2", regionName: "遠い地方", name: "山火事", severity: 2 },
    { id: "local", nationId: "n1", regionId: "r1", regionName: "試験地方", name: "洪水", severity: 3 },
  ] } };
  const events = autoWorldEvents(before, after, state.autoMode.config, context, state);
  assert.equal(events[0].stop, false); assert.equal(events[1].stop, true);
  assert.match(autoWorldStop(before, after, state.autoMode.config, context, state), /試験地方.*洪水/);
  assert.equal(autoWorldEvents(before, after, { ...state.autoMode.config, watchNation: "n2" }, context, state)[0].stop, true);
  assert.equal(autoWorldEvents(before, after, { ...state.autoMode.config, worldScope: "all" }, context, state)[0].stop, true);
  assert.equal(autoWorldStop(after, after, state.autoMode.config, context, state), null);
});

test("rulers traveling abroad still stop for current territory and their own country's war", () => {
  const { context, state } = fixture(); // The traveler is physically in n1/r1.
  const before = { generatedWorld: { worldWars: { activeWars: [] } }, externalCrises: { activeCrises: [] } };
  const after = {
    generatedWorld: {
      regionalDomains: { regionStates: { r1: { nationId: "n1" }, r2: { nationId: "player-realm" }, r3: { nationId: "player-realm" } }, independentPolities: { "player-realm": { name: "現在の自治国" } } },
      worldWars: { activeWars: [
        { id: "home-war", attackerNationId: "n4", defenderNationId: "player-realm", fronts: [] },
        { id: "remote-war", attackerNationId: "n5", defenderNationId: "n6", fronts: [] },
      ] },
    },
    externalCrises: { activeCrises: [
      { id: "new-territory", regionId: "r3", nationId: "former-owner", name: "洪水" },
      { id: "remote-crisis", regionId: "r7", nationId: "n7", name: "山火事" },
    ] },
  };
  for (const stage of ["sovereign", "ending"]) {
    state.campaign = { stage, nationId: "player-realm", regionId: "r2" };
    const events = autoWorldEvents(before, after, state.autoMode.config, context, state);
    assert.deepEqual(events.map((event) => event.stop), [true, false, true, false]);
    assert.match(events[0].message, /現在の自治国/);
    const recorded = recordAutoAction(state.autoMode, state, state, { kind: "month" }, context, before, after);
    assert.equal(recorded.summary.remoteEvents, 2, "unrelated countries stay aggregated as distant events");
    assert.ok(recorded.highlights.some((message) => message.includes("現在の自治国")));
  }
  const fallen = structuredClone(after);
  fallen.generatedWorld.regionalDomains.regionStates.r2.nationId = "n3";
  fallen.generatedWorld.regionalDomains.regionStates.r3.nationId = "n3";
  assert.ok(autoWorldEvents(before, fallen, state.autoMode.config, context, state).every((event) => !event.stop), "a dissolved realm does not keep its old land or country as watch targets");
});

test("an absent governor watches only an appointment still held under the current owner", () => {
  const { context, state } = fixture();
  state.campaign = { stage: "governor", nationId: "n2", regionId: "r2" };
  const before = { externalCrises: { activeCrises: [] } };
  const after = {
    generatedWorld: { regionalDomains: { regionStates: { r1: { nationId: "n1" }, r2: { nationId: "n2", lordId: "v3-player" } } } },
    externalCrises: { activeCrises: [{ id: "appointed-crisis", regionId: "r2", nationId: "n2", name: "洪水" }] },
  };
  assert.equal(autoWorldEvents(before, after, state.autoMode.config, context, state)[0].stop, true);
  after.generatedWorld.regionalDomains.regionStates.r2.lordId = "replacement-lord";
  assert.equal(autoWorldEvents(before, after, state.autoMode.config, context, state)[0].stop, false, "dismissed office is not watched");
  after.generatedWorld.regionalDomains.regionStates.r2 = { nationId: "n3", lordId: "v3-player" };
  assert.equal(autoWorldEvents(before, after, state.autoMode.config, context, state)[0].stop, false, "a former owner's appointment does not authorize watching a conquered region");
  after.generatedWorld.regionalDomains.regionStates.r2 = { nationId: "n2", lordId: "v3-player" };
  state.campaign.stage = "commissioned";
  assert.equal(autoWorldEvents(before, after, state.autoMode.config, context, state)[0].stop, false, "a local commission is not a governorship");
});

test("trade preview uses recorded sell quotes and marks old buy-only reports unknown", () => {
  const { state } = tradeFixture();
  const view = autoTradePreview(state, state.autoMode.config);
  assert.equal(typeof view.target.sellPrice, "number"); assert.equal(typeof view.profit, "number");
  const untouched = structuredClone(state);
  for (const r of state.merchant.trade.marketReports) delete r.sellPrice;
  assert.equal(autoTradePreview(state, state.autoMode.config).profit, null);
  assert.equal(autoTradePreview(untouched, { ...state.autoMode.config, market: "unknown" }).target, undefined);
});

test("combat forecast matches resolution and automation stops before a lethal retaliation", () => {
  const { context, state } = fixture({ enemy: "fight", autoHeal: false, stopHp: 30 });
  state.pendingEncounter = { id: "wolf", type: "enemy", name: "狼", hp: 100, maxHp: 100, power: 15, level: 1, xp: 4, gold: 1, tileKey: "0,0" };
  state.player.hp = 15;
  const forecast = getV3CombatForecast(context, state);
  const decision = decideAutoAction(context, state, null);
  assert.equal(decision.kind, "stop"); assert.match(decision.reason, /反撃/);
  state.player.hp = 34;
  const next = resolveV3Encounter(context, state, "fight");
  assert.equal(next.player.hp, 34 - forecast.retaliation);
  assert.equal(next.pendingEncounter.hp, 100 - forecast.attack);
  state.pendingEncounter.hp = 1;
  state.defeatedTiles = Array.from({ length: 4000 }, (_, i) => `old-${i}`);
  const victory = resolveV3Encounter(context, state, "fight");
  assert.equal(victory.defeatedTiles.length, state.defeatedTiles.length);
  assert.equal(recordAutoAction(state.autoMode, state, victory, { kind: "encounter", action: "fight" }, context).summary.battles, 1);
});

test("cargo protection, first-enemy stop and supply reserve are explicit policies", () => {
  const { context, state } = fixture({ enemy: "fight", autoHeal: false, combatPolicy: "cargo" });
  state.pendingEncounter = { id: "wolf", type: "enemy", name: "狼", hp: 20, power: 3, level: 1 };
  state.merchant.trade.cargo = [{ commodityId: "grain", quantity: 1 }];
  assert.match(decideAutoAction(context, state, null).reason, /積荷/);
  state.autoMode.config.combatPolicy = "balanced";
  state.autoMode.config.stopFirstEnemy = true;
  assert.match(decideAutoAction(context, state, null).reason, /初めて/);
  state.pendingEncounter = null;
  state.player.hp = 3; state.player.inventory = [{ id: "herb", heal: 18 }];
  Object.assign(state.autoMode.config, { autoHeal: true, combatPolicy: "supplies", reserveHealing: 1 });
  assert.equal(decideAutoAction(context, state, null).kind, "stop");
  state.player.inventory.push({ id: "herb", heal: 18 });
  assert.equal(decideAutoAction(context, state, null).kind, "item");
});

test("growth guidance advances from market discovery to incorporation and staffing", () => {
  const { state } = fixture();
  assert.match(autoNextGoal(state).text, /二市場/);
  state.merchant.trade.knownSettlements = [{ id: "a" }, { id: "b" }];
  state.merchant.trade.stats = { unitsSold: 3, realizedProfit: 2 };
  assert.match(autoNextGoal(state).text, /設立できる/);
  state.merchant.company.status = "company";
  assert.match(autoNextGoal(state).text, /営業資格/);
  state.merchant.company.charters = [{ nationId: "n1" }];
  assert.match(autoNextGoal(state).text, /責任者/);
  state.military = { activeMission: { id: "mission" } };
  assert.equal(autoNextGoal(state).action, "map");
  state.pendingEncounter = { type: "group-battle" };
  assert.equal(autoNextGoal(state).action, "field");
});

test("automatic healing does not bypass the first enemy decision", () => {
  const { context, state } = fixture({ enemy: "fight", stopFirstEnemy: true, autoHeal: true });
  state.pendingEncounter = { id: "wolf", type: "enemy", name: "狼", hp: 20, power: 3, level: 1 };
  state.player.hp = 3;
  state.player.inventory = [{ id: "herb", heal: 18 }];
  const decision = decideAutoAction(context, state, null);
  assert.equal(decision.kind, "item");
  const healed = apply(context, state, decision);
  assert.deepEqual(healed.autoMode.knownEnemies, []);
  assert.match(decideAutoAction(context, healed, null).reason, /初めて/);
});

test("arrival on the final allowed step is complete for travel and survey", () => {
  const { context, state } = fixture({ mode: "travel", destination: "market-0", maxSteps: 1 });
  state.autoMode.steps = 1;
  assert.equal(decideAutoAction(context, atMarket(context, state, 0), null).completed, true);
  Object.assign(state.autoMode.config, { mode: "explore", exploreGoal: "survey" });
  state.autoMode.explorationReturning = true;
  assert.equal(decideAutoAction(context, state, null).completed, true);
});

test("finishing the final trading return records all completed laps", () => {
  const { context, state } = tradeFixture({ laps: 2, maxSteps: 1 });
  Object.assign(state.autoMode, { phase: "return", laps: 1, steps: 1 });
  const decision = decideAutoAction(context, state, null);
  assert.equal(decision.completed, true); assert.equal(decision.patch.laps, 2);
});
