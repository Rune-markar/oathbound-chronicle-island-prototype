import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import { createGeopoliticalWorldState } from "../src/geopolitical-world.js";
import { stateReasonConditions } from "../src/state-reason-system.js";
import { advanceV3MarketEconomyMonth, getV3TradeAccess } from "../src/v3-market-economy.js";
import { advanceV3WorldSimulation, buildV3WorldPrehistory, createV3WorldSimulation, normalizeV3WorldSimulation } from "../src/v3-world-simulation.js";
import { applyV3MarketNationFeedback, getV3NationMarketFeedback } from "../src/v3-world-feedback.js";

function fixture(seed = "feedback-relief") {
  const options = { seed, width: 48, height: 32, plateCount: 8, nationCount: 4 };
  const runtime = structuredClone(buildGeneratedWorld(createGeneratedWorldState(options)));
  return { options, runtime, simulation: createV3WorldSimulation(runtime, options) };
}

test("飢えた市場への街道補給は当月未充足を先に解消し、消費と在庫を含む穀物総量を保存する", () => {
  const { runtime, options } = fixture();
  for (const tile of runtime.tiles) {
    tile.resourcePotential = { ...tile.resourcePotential, agriculture: 0 };
    tile.yields = { ...tile.yields, food: 0 };
  }
  const simulation = createV3WorldSimulation(runtime, options);
  const source = Object.values(simulation.marketEconomy.settlements)[0];
  for (const settlement of Object.values(simulation.marketEconomy.settlements)) {
    settlement.goods.grain.inventory = settlement.id === source.id ? settlement.goods.grain.capacity : 0;
  }
  const date = { year: 317, month: 5 };
  const next = advanceV3MarketEconomyMonth(runtime, simulation.marketEconomy, date, simulation.generatedWorld, simulation.externalCrises);
  const isolatedRuntime = { ...runtime, nations: { ...runtime.nations, roads: [] } };
  const isolated = advanceV3MarketEconomyMonth(isolatedRuntime, simulation.marketEconomy, date, simulation.generatedWorld, simulation.externalCrises);
  const relief = next.shipments.filter((shipment) => shipment.commodityId === "grain" && shipment.consumedOnArrival > 0);
  assert.ok(relief.length > 0);
  assert.ok(relief.some((shipment) => next.settlements[shipment.destinationSettlementId].goods.grain.lastUnmetConsumption
    < isolated.settlements[shipment.destinationSettlementId].goods.grain.lastUnmetConsumption));
  const aggregate = (economy, field) => Object.values(economy.settlements).reduce((total, settlement) => total + settlement.goods.grain[field], 0);
  const consumed = aggregate(next, "lastConsumption") - aggregate(next, "lastUnmetConsumption");
  assert.ok(Math.abs(aggregate(simulation.marketEconomy, "inventory") + aggregate(next, "lastProduction")
    - consumed - aggregate(next, "inventory")) < 0.000001);
  assert.ok(Math.abs(aggregate(next, "lastImports") - aggregate(next, "lastExports")) < 0.000001);
});

test("通商関係・変化する開放性・戦時封鎖が国境物流を変え、種族名自体には取引罰を置かない", () => {
  const profiles = { a: { raceId: "human", traits: { openness: 40 } }, b: { raceId: "elf", traits: { openness: 60 } } };
  const relations = { relations: { "a:b": { trade: 60, relation: 50 } } };
  const peaceful = getV3TradeAccess(relations, profiles, "a", "b");
  const closed = getV3TradeAccess({ relations: { "a:b": { trade: 0, relation: -50 } } }, profiles, "a", "b");
  const distrust = getV3TradeAccess(relations, { a: { traits: { openness: -40 } }, b: { traits: { openness: -60 } } }, "a", "b");
  const war = getV3TradeAccess(relations, profiles, "a", "b", [{ attackerNationId: "b", defenderNationId: "a" }]);
  assert.ok(peaceful.multiplier > closed.multiplier);
  assert.ok(peaceful.multiplier > distrust.multiplier);
  assert.equal(war.multiplier, peaceful.multiplier * 0.2);
  assert.equal(getV3TradeAccess(relations, { a: { ...profiles.a, raceId: "orc" }, b: profiles.b }, "a", "b").multiplier, peaceful.multiplier);
  assert.equal(getV3TradeAccess(relations, profiles, "a", "a").multiplier, 1);
});

test("食料不足は国家理性へ反映され、実補給は次の判断条件を改善し、月次効果を二重適用しない", () => {
  const { runtime, simulation } = fixture();
  const date = { year: 317, month: 5 };
  const generatedWorld = { ...simulation.generatedWorld, geopolitics: createGeopoliticalWorldState(runtime) };
  const nationId = runtime.nations.nations[0].id;
  const condition = generatedWorld.geopolitics.nationStates[nationId];
  const scarce = structuredClone(simulation.marketEconomy);
  scarce.lastAdvancedPeriod = "317-5";
  for (const settlement of Object.values(scarce.settlements).filter((market) => market.nationId === nationId)) {
    settlement.goods.grain.inventory = 0;
    settlement.goods.grain.lastUnmetConsumption = settlement.goods.grain.lastConsumption;
  }
  const supplied = structuredClone(scarce);
  for (const settlement of Object.values(supplied.settlements).filter((market) => market.nationId === nationId)) {
    settlement.goods.grain.inventory = settlement.goods.grain.capacity;
    settlement.goods.grain.lastUnmetConsumption = 0;
  }
  const shortageFeedback = getV3NationMarketFeedback(scarce, nationId, condition, date);
  const reliefFeedback = getV3NationMarketFeedback(supplied, nationId, condition, date);
  assert.ok(shortageFeedback.effects.foodSecurity < reliefFeedback.effects.foodSecurity);
  assert.ok(shortageFeedback.effects.cohesion < reliefFeedback.effects.cohesion);
  const result = applyV3MarketNationFeedback(generatedWorld, scarce, date);
  const nextCondition = result.generatedWorld.geopolitics.nationStates[nationId];
  assert.equal(nextCondition.foodSecurity, condition.foodSecurity + shortageFeedback.effects.foodSecurity);
  assert.deepEqual(nextCondition.stateReason.conditions, stateReasonConditions(nextCondition));
  assert.equal(nextCondition.stateReason.initialImperativeId, condition.stateReason.initialImperativeId);
  assert.deepEqual(applyV3MarketNationFeedback(result.generatedWorld, result.marketEconomy, date), result);
});

test("食料確保政策は抽象スコアと同時に実市場の穀物生産を増やす", () => {
  const { runtime, simulation } = fixture();
  const geopolitical = createGeopoliticalWorldState(runtime);
  const nationId = runtime.nations.nations[0].id;
  const ordinary = { ...simulation.generatedWorld, geopolitics: geopolitical };
  const policy = structuredClone(ordinary);
  policy.geopolitics.nationStates[nationId].lastPullId = "secure_food";
  const wartime = { ...ordinary, worldWars: { activeWars: [{
    id: "feedback-war", attackerNationId: nationId, defenderNationId: runtime.nations.nations[1].id,
  }] } };
  const date = { year: 317, month: 5 };
  const before = advanceV3MarketEconomyMonth(runtime, simulation.marketEconomy, date, ordinary);
  const after = advanceV3MarketEconomyMonth(runtime, simulation.marketEconomy, date, policy);
  const disrupted = advanceV3MarketEconomyMonth(runtime, simulation.marketEconomy, date, wartime);
  for (const market of Object.values(after.settlements).filter((settlement) => settlement.nationId === nationId)) {
    assert.ok(market.goods.grain.lastProduction > before.settlements[market.id].goods.grain.lastProduction);
    assert.equal(market.goods.iron.lastProduction, before.settlements[market.id].goods.iron.lastProduction);
    assert.equal(market.goods.grain.capacity, before.settlements[market.id].goods.grain.capacity);
    assert.ok(disrupted.settlements[market.id].goods.grain.lastProduction < before.settlements[market.id].goods.grain.lastProduction);
    assert.equal(disrupted.settlements[market.id].goods.grain.capacity, before.settlements[market.id].goods.grain.capacity);
  }
});

test("複数シードの24か月一括進行と保存復元を挟んだ月次進行が市場・国家・文化で一致する", () => {
  for (const seed of ["feedback-equivalence-a", "feedback-equivalence-b", "feedback-equivalence-c"]) {
    const { runtime, simulation, options } = fixture(seed);
    const bulk = advanceV3WorldSimulation(runtime, simulation, 24);
    let sequential = simulation;
    for (let month = 0; month < 24; month += 1) {
      sequential = advanceV3WorldSimulation(runtime, sequential, 1);
      if (month % 6 === 5) sequential = normalizeV3WorldSimulation(runtime, options, JSON.parse(JSON.stringify(sequential)));
    }
    assert.deepEqual(bulk.marketEconomy, sequential.marketEconomy, seed);
    const normalizedBulk = normalizeV3WorldSimulation(runtime, options, JSON.parse(JSON.stringify(bulk)));
    assert.deepEqual(normalizedBulk.generatedWorld.geopolitics, sequential.generatedWorld.geopolitics, seed);
    assert.deepEqual(bulk.generatedWorld.raceDynamics, sequential.generatedWorld.raceDynamics, seed);
  }
});

test("異なる50年史は市場欠損で全国家を崩壊させず、国家条件と戦争・平和の多様性を保つ", async (t) => {
  const warCounts = [];
  const outcomes = [];
  for (const seed of ["v3-probability-audit-0", "conflict-history-600-a", "feedback-history-600-b"]) {
    const { runtime, options } = fixture(seed);
    const simulation = await buildV3WorldPrehistory(runtime, options, { months: 600 });
    const conditions = Object.values(simulation.generatedWorld.geopolitics.nationStates);
    assert.ok(conditions.every((condition) => Object.values(stateReasonConditions(condition)).every((value) => Number.isFinite(value) && value >= 0 && value <= 100)));
    assert.ok(conditions.some((condition) => Math.min(...Object.values(stateReasonConditions(condition))) >= 35), seed);
    assert.ok(conditions.every((condition) => Math.min(...Object.values(stateReasonConditions(condition))) < 90), seed);
    assert.ok(Object.values(simulation.marketEconomy.nationFeedback).some((feedback) => feedback.grainUnmetShare < 0.25), seed);
    assert.ok(Object.values(simulation.marketEconomy.settlements).every((market) => Object.values(market.goods).every((good) => (
      good.inventory >= 0 && good.inventory <= good.capacity && good.lastUnmetConsumption >= 0 && good.lastUnmetConsumption <= good.lastConsumption
    ))));
    outcomes.push(JSON.stringify(conditions.map((condition) => stateReasonConditions(condition))));
    warCounts.push(simulation.generatedWorld.worldWars.history.length);
    t.diagnostic(JSON.stringify({ seed, months: 600, completedWars: simulation.generatedWorld.worldWars.history.length,
      recoveredCrises: simulation.externalCrises.history.length,
      conditions: conditions.map((condition) => stateReasonConditions(condition)),
      grain: Object.values(simulation.marketEconomy.nationFeedback).map((feedback) => ({
        coverageMonths: feedback.grainCoverageMonths, unmetShare: feedback.grainUnmetShare,
      })),
    }));
  }
  assert.equal(new Set(outcomes).size, 3);
  assert.ok(warCounts.some((count) => count > 0), JSON.stringify(warCounts));
  assert.ok(warCounts.some((count) => count === 0), JSON.stringify(warCounts));
});
