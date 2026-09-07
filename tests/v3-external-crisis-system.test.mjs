import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import {
  V3_EXTERNAL_CRISIS_DEFINITIONS,
  V3_EXTERNAL_CRISIS_VERSION,
  advanceV3ExternalCrises,
  applyV3ExternalCrisisConsequences,
  createV3ExternalCrisisState,
  getV3ExternalCrisisMarketEffect,
} from "../src/v3-external-crisis-system.js";
import {
  createV3FieldState,
  createV3WorldContext,
  getV3PurposefulActorPlans,
  getV3TileEntity,
} from "../src/v3-field-system.js";
import { advanceV3WorldSimulation, createV3WorldSimulation } from "../src/v3-world-simulation.js";

const OPTIONS = Object.freeze({ seed: "external-crisis-contract", width: 48, height: 32, plateCount: 8, nationCount: 4 });

function fixture() {
  const generatedWorld = createGeneratedWorldState(OPTIONS, { year: 317, month: 4 });
  const runtime = buildGeneratedWorld(generatedWorld);
  const simulation = createV3WorldSimulation(runtime, OPTIONS, { year: 317, month: 4 });
  return { runtime, simulation };
}

function nextMonth(date) {
  return date.month === 12 ? { year: date.year + 1, month: 1 } : { year: date.year, month: date.month + 1 };
}

test("地方圧力は災害・飢饉・魔族襲撃を段階進行させ、終息と再発猶予まで保存する", () => {
  const { runtime, simulation } = fixture();
  const initial = createV3ExternalCrisisState(runtime, null, simulation, simulation.generatedWorld);
  const regionIds = runtime.nations.regions.slice(0, 4).map((region) => region.id);
  const typeIds = Object.keys(V3_EXTERNAL_CRISIS_DEFINITIONS);
  typeIds.forEach((typeId, index) => {
    Object.values(initial.regionalPressures[regionIds[index]]).forEach((pressure) => { pressure.value = 0; });
    initial.regionalPressures[regionIds[index]][typeId].value = 100;
  });
  const date = { year: 317, month: 5 };
  const left = advanceV3ExternalCrises(runtime, initial, date, simulation.generatedWorld);
  const right = advanceV3ExternalCrises(runtime, initial, date, simulation.generatedWorld);
  assert.deepEqual(left, right);
  assert.deepEqual(new Set(left.activeCrises.map((crisis) => crisis.type)), new Set(typeIds));
  assert.ok(left.activeCrises.every((crisis) => crisis.originTileIndex >= 0 && crisis.causes.length));
  assert.equal(left.events.filter((event) => event.outcome === "started").length, 4);

  let state = left;
  let cursor = date;
  for (let index = 0; index < 25; index += 1) {
    cursor = nextMonth(cursor);
    state = advanceV3ExternalCrises(runtime, state, cursor, simulation.generatedWorld);
  }
  assert.ok(state.history.length >= 4);
  assert.ok(state.events.some((event) => event.outcome === "recovering"));
  assert.ok(state.events.some((event) => event.outcome === "resolved"));
  assert.ok(Object.values(state.regionalPressures).flatMap(Object.values).some((pressure) => pressure.cooldownMonths > 0));
});

test("活動中の外部危機は国家条件・地方人口・地域施設を同じ月に損耗させる", () => {
  const { runtime, simulation } = fixture();
  const initialized = advanceV3WorldSimulation(runtime, simulation, 1);
  const region = runtime.nations.regions.find((entry) => entry.settlementIds.length);
  const nationId = initialized.generatedWorld.regionalDomains.regionStates[region.id].nationId;
  const settlementId = region.settlementIds[0];
  const asset = Object.values(initialized.generatedWorld.regionalDomains.assetStates).find((entry) => entry.regionId === region.id);
  const beforeCondition = initialized.generatedWorld.geopolitics.nationStates[nationId];
  const beforePopulation = initialized.generatedWorld.regionalDomains.settlementStates[settlementId].population;
  const beforeAsset = asset.condition;
  const crisis = {
    version: V3_EXTERNAL_CRISIS_VERSION,
    activeCrises: [{
      id: "manual-famine", type: "famine", category: "shortage", name: "地方飢饉", symbol: "飢", color: "#b89a4b",
      regionId: region.id, regionName: region.name, nationId, originTileIndex: region.markerIndex, stage: "emergency",
      severity: 5, pressure: 92, startedPeriod: "317-1", monthsActive: 4, causes: ["国家食料安全度の低下"],
      description: V3_EXTERNAL_CRISIS_DEFINITIONS.famine.description,
      impact: { nation: { foodSecurity: -3.3, cohesion: -2.2, reserves: -1.1 }, populationLossRate: 0.0011, assetDamage: 3 },
    }],
  };
  const affected = applyV3ExternalCrisisConsequences(runtime, initialized.generatedWorld, crisis, { year: 317, month: 6 });
  const afterCondition = affected.geopolitics.nationStates[nationId];
  assert.ok(afterCondition.foodSecurity < beforeCondition.foodSecurity);
  assert.ok(afterCondition.cohesion < beforeCondition.cohesion);
  assert.equal(afterCondition.stateReason.conditions.food, afterCondition.foodSecurity);
  assert.equal(afterCondition.lastExternalCrisisImpact.crisisIds[0], "manual-famine");
  assert.ok(affected.regionalDomains.settlementStates[settlementId].population < beforePopulation);
  assert.ok(Object.values(affected.regionalDomains.assetStates).find((entry) => entry.id === asset.id).condition <= beforeAsset);
});

test("概算危機は全域に敵をポップさせず、プレイヤー視界へ一つの危機シンボルとして投影される", () => {
  const { runtime, simulation } = fixture();
  const context = createV3WorldContext(runtime, OPTIONS.seed);
  const state = createV3FieldState(context, { playerName: "危機観測者" });
  const macroIndex = Math.floor(state.player.y / 8) * runtime.terrain.width + Math.floor(state.player.x / 8);
  const regionId = runtime.tiles[macroIndex].regionId;
  context.worldSimulation = {
    ...simulation,
    externalCrises: {
      version: V3_EXTERNAL_CRISIS_VERSION,
      activeCrises: [{
        id: "nearby-demon-raid", type: "demon_raid", category: "incursion", name: "魔族襲撃", symbol: "魔", color: "#9b65b3",
        regionId, regionName: runtime.regionById.get(regionId).name, nationId: runtime.regionById.get(regionId).nationId,
        originTileIndex: macroIndex, stage: "active", severity: 3, pressure: 72, startedPeriod: "317-3", monthsActive: 2,
        causes: ["遺跡・洞窟などの魔的拠点"], description: V3_EXTERNAL_CRISIS_DEFINITIONS.demon_raid.description,
        impact: { nation: {}, populationLossRate: 0, assetDamage: 0 },
      }],
    },
  };
  const plans = getV3PurposefulActorPlans(context, state);
  const symbols = plans.filter((plan) => plan.type === "crisis");
  assert.equal(symbols.length, 1);
  assert.equal(symbols[0].crisisId, "nearby-demon-raid");
  assert.ok(state.discoveredTiles.includes(`${symbols[0].x},${symbols[0].y}`), "the projected symbol must be observable instead of hidden in fog");
  assert.match(symbols[0].purpose.reason, /原因：.+市場供給/);
  const entity = getV3TileEntity(context, symbols[0].x, symbols[0].y, { ...state, interactedTiles: [`${symbols[0].x},${symbols[0].y}`] });
  assert.equal(entity.type, "crisis", "an old conversation marker must not erase a continuing regional crisis");
  context.actorPlanCache = null;
  const replanned = getV3PurposefulActorPlans(context, { ...state, player: { ...state.player, x: state.player.x + 1 } });
  const stableSymbol = replanned.find((plan) => plan.crisisId === "nearby-demon-raid");
  assert.deepEqual([stableSymbol.x, stableSymbol.y], [symbols[0].x, symbols[0].y], "ordinary movement must not make an observed crisis evade the player");
});

test("飢饉と魔族襲撃は危機度に応じて穀物・鉄・薬草の価格と在庫へ波及する", () => {
  const market = getV3ExternalCrisisMarketEffect({ activeCrises: [
    { id: "famine", type: "famine", name: "地方飢饉", regionId: "region-a", regionName: "試験地方", nationId: "nation-a", severity: 4 },
    { id: "raid", type: "demon_raid", name: "魔族襲撃", regionId: "region-a", regionName: "試験地方", nationId: "nation-a", severity: 3 },
  ] }, "nation-a", "region-a");
  assert.equal(market.effectId, "external_crisis_scarcity");
  assert.ok(market.commodityPriceMultipliers.grain > 1);
  assert.ok(market.commodityPriceMultipliers.iron > 1);
  assert.ok(market.commodityStockMultipliers.grain < 1);
  assert.ok(market.commodityStockMultipliers.herbs < 1);
  assert.equal(getV3ExternalCrisisMarketEffect({ activeCrises: [{ ...market, nationId: null, regionId: "wilds" }] }, null, null), null);
});
