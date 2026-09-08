import { getV3CivicRegion, getV3CivicProduction, civicPolicies, civicTotal } from "./v3-civic-policy.js";
import {
  MERCHANT_COMMODITIES,
  getCommodityMarketFundamentals,
} from "./merchant-trade.js";
import { fnv1aCharacters, unitFromHash } from "./determinism.js";
import { getRegionalDomainView } from "./regional-domain-system.js";
import { getV3WartimeMarketEffect } from "./v3-world-effects.js";
import { getV3ExternalCrisisMarketEffect } from "./v3-external-crisis-system.js";
import { deriveNationDecisionProfiles } from "./race-decision-system.js";

export const V3_MARKET_ECONOMY_VERSION = 1;
export const V3_MARKET_SHIPMENT_LIMIT = 160;
export const V3_MARKET_HISTORY_LIMIT = 120;

const clone = (value) => structuredClone(value);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
const round1 = (value) => Number(Number(value).toFixed(1));
const periodFor = (date) => `${Number(date?.year) || 317}-${Number(date?.month) || 4}`;
const hashUnit = (...parts) => unitFromHash(fnv1aCharacters(parts.join("|")));

function marketWorld(runtime, date, generatedWorld) {
  const domains = getRegionalDomainView(runtime, generatedWorld?.regionalDomains, date);
  const objects = domains.nationMap.objects.map((object) => {
    const tile = runtime.tiles[object.tileIndex] ?? {};
    return {
      ...tile,
      ...object,
      terrain: tile.terrain ?? object.terrain,
      dominantTerrain: tile.terrain ?? object.dominantTerrain,
      resourcePotential: tile.resourcePotential ?? object.resourcePotential,
      yields: tile.yields ?? object.yields,
    };
  });
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const marketEndpoint = (objectId) => {
    const object = objectById.get(objectId);
    if (object?.settlementLevel) return object.id;
    return objects.find((candidate) => candidate.settlementLevel && candidate.regionSeat && candidate.regionId === object?.regionId)?.id ?? objectId;
  };
  return {
    objects: objects.filter((object) => object.settlementLevel),
    objectById,
    nationById: domains.nationById,
    roads: domains.nationMap.roads.filter((road) => road.available !== false).map((road) => ({
      ...road,
      fromObjectId: marketEndpoint(road.fromObjectId),
      toObjectId: marketEndpoint(road.toObjectId),
    })),
    activeWars: generatedWorld?.worldWars?.activeWars ?? [],
    civicRegions: Object.fromEntries(domains.nationMap.regions.map((region) => [region.id, getV3CivicRegion(date?.civicState, generatedWorld, runtime, region.id)])),
    geopolitics: generatedWorld?.geopolitics,
    raceDynamics: generatedWorld?.raceDynamics,
    runtime: { ...runtime, nations: domains.nationMap, nationById: domains.nationById, regionById: domains.regionById },
  };
}

function combineEffects(wartime, external, commodityId) {
  const effects = [wartime, external].filter(Boolean);
  if (!effects.length) return { priceMultiplier: 1, stockMultiplier: 1, worldEffect: null };
  const priceMultiplier = effects.reduce((value, effect) => value
    * (Number(effect.priceMultiplier) || 1)
    * (Number(effect.commodityPriceMultipliers?.[commodityId]) || 1), 1);
  const stockMultiplier = effects.reduce((value, effect) => value
    * (Number(effect.commodityStockMultipliers?.[commodityId]) || 1), 1);
  return {
    priceMultiplier,
    stockMultiplier,
    worldEffect: {
      effectId: effects.length > 1 ? "combined_world_scarcity" : effects[0].effectId,
      name: effects.map((effect) => effect.name).join("・"),
      summary: effects.map((effect) => effect.summary).join(" "),
      priceMultiplier: Number(priceMultiplier.toFixed(4)),
      stockMultiplier: Number(stockMultiplier.toFixed(4)),
    },
  };
}

function effectFor(world, externalCrises, settlement, commodityId) {
  const nationId = settlement.nationId ?? null;
  const wartime = getV3WartimeMarketEffect({
    activeWars: world.activeWars,
    nationId,
    nationName: world.nationById.get(nationId)?.name ?? settlement.nationName,
    regionId: settlement.regionId,
  });
  const external = getV3ExternalCrisisMarketEffect(externalCrises, nationId, settlement.regionId);
  return {
    ...combineEffects(wartime, external, commodityId),
    productionMultiplier: (commodityId === "grain" && world.geopolitics?.nationStates?.[nationId]?.lastPullId === "secure_food" ? 1.15 : 1)
      * getV3CivicProduction(world.civicRegions[settlement.regionId], commodityId),
  };
}

function monthlyRates(settlement, commodityId, effect) {
  const fundamentals = getCommodityMarketFundamentals(settlement, commodityId);
  const normalProduction = 2.4 + fundamentals.supply * 12 + fundamentals.size * 2;
  const production = round1(normalProduction * effect.stockMultiplier * (effect.productionMultiplier ?? 1));
  const consumption = round1(0.8 + fundamentals.demand * 5 + fundamentals.size * 1.5);
  // A failed harvest or a temporary policy changes output, not warehouse size.
  const targetInventory = Math.max(3, round1(consumption * 1.8 + normalProduction * 0.35));
  const capacity = Math.max(8, round1(targetInventory * 2.4));
  return { ...fundamentals, production, consumption, targetInventory, capacity };
}

function priceFor(seed, period, settlement, commodityId, rates, inventory, effect, previousPrice = null) {
  const definition = MERCHANT_COMMODITIES[commodityId];
  const jitter = (hashUnit(seed, period, settlement.id, commodityId, "market-price") - 0.5) * 0.1;
  const geographic = 1.55 - rates.supply * 0.75 + rates.demand * 0.28 + jitter;
  const scarcity = clamp(1 + ((rates.targetInventory - inventory) / rates.targetInventory) * 0.7, 0.58, 2.6);
  const calculated = Math.max(0.4, definition.basePrice * geographic * scarcity * effect.priceMultiplier);
  const buyPrice = round1(previousPrice == null ? calculated : previousPrice * 0.3 + calculated * 0.7);
  return { buyPrice, sellPrice: round1(Math.max(0.2, buyPrice * 0.78)), priceCoefficient: definition.basePrice * geographic * effect.priceMultiplier };
}

function makeGood(seed, period, settlement, commodityId, effect, previous = null, advance = false) {
  const rates = monthlyRates(settlement, commodityId, effect);
  const startingInventory = previous
    ? clamp(previous.inventory, 0, rates.capacity)
    : clamp(rates.targetInventory + (rates.production - rates.consumption) * 0.6, 0, rates.capacity);
  const inventory = advance
    ? clamp(startingInventory + rates.production - rates.consumption, 0, rates.capacity)
    : startingInventory;
  const lastUnmetConsumption = advance
    ? round1(Math.max(0, rates.consumption - startingInventory - rates.production))
    : clamp(previous?.lastUnmetConsumption, 0, Number(previous?.lastConsumption) || rates.consumption);
  const prices = previous && !advance && Number.isFinite(Number(previous.buyPrice)) && Number.isFinite(Number(previous.sellPrice))
    ? { buyPrice: round1(previous.buyPrice), sellPrice: round1(previous.sellPrice), priceCoefficient: previous.priceCoefficient }
    : priceFor(seed, period, settlement, commodityId, rates, inventory, effect, previous?.buyPrice);
  const coverageMonths = inventory / Math.max(1, rates.consumption);
  return {
    inventory: round1(inventory),
    capacity: rates.capacity,
    buyPrice: prices.buyPrice,
    sellPrice: prices.sellPrice,
    priceCoefficient: prices.priceCoefficient ?? priceFor(seed, period, settlement, commodityId, rates, inventory, effect).priceCoefficient,
    supply: Number(rates.supply.toFixed(3)),
    demand: Number(rates.demand.toFixed(3)),
    targetInventory: rates.targetInventory,
    lastProduction: advance || !Number.isFinite(Number(previous?.lastProduction)) ? rates.production : round1(previous.lastProduction),
    lastConsumption: advance || !Number.isFinite(Number(previous?.lastConsumption)) ? rates.consumption : round1(previous.lastConsumption),
    lastUnmetConsumption,
    lastImports: advance || !Number.isFinite(Number(previous?.lastImports)) ? 0 : round1(previous.lastImports),
    lastExports: advance || !Number.isFinite(Number(previous?.lastExports)) ? 0 : round1(previous.lastExports),
    playerFlow: advance || !Number.isFinite(Number(previous?.playerFlow)) ? 0 : round1(previous.playerFlow),
    coverageMonths: round1(coverageMonths),
    shortage: coverageMonths < 0.75,
    priceTrend: !advance && previous?.priceTrend
      ? previous.priceTrend
      : previous?.buyPrice == null || prices.buyPrice === previous.buyPrice
        ? "stable" : prices.buyPrice > previous.buyPrice ? "rising" : "falling",
    worldEffect: effect.worldEffect,
  };
}

function settlementState(seed, period, settlement, world, externalCrises, previous = null, advance = false) {
  const goods = Object.fromEntries(Object.keys(MERCHANT_COMMODITIES).map((commodityId) => {
    const effect = effectFor(world, externalCrises, settlement, commodityId);
    return [commodityId, makeGood(seed, period, settlement, commodityId, effect, previous?.goods?.[commodityId], advance)];
  }));
  return {
    id: settlement.id,
    name: settlement.name,
    regionId: settlement.regionId,
    nationId: settlement.nationId,
    goods,
  };
}

function recalculateGood(seed, period, settlement, commodityId, good, world, externalCrises) {
  const effect = effectFor(world, externalCrises, settlement, commodityId);
  const rates = monthlyRates(settlement, commodityId, effect);
  const prices = priceFor(seed, period, settlement, commodityId, rates, good.inventory, effect, null);
  const coverageMonths = good.inventory / Math.max(1, rates.consumption);
  Object.assign(good, {
    capacity: rates.capacity,
    buyPrice: prices.buyPrice,
    sellPrice: prices.sellPrice,
    priceCoefficient: prices.priceCoefficient,
    supply: Number(rates.supply.toFixed(3)),
    demand: Number(rates.demand.toFixed(3)),
    targetInventory: rates.targetInventory,
    coverageMonths: round1(coverageMonths),
    shortage: coverageMonths < 0.75,
    priceTrend: prices.buyPrice === good.buyPrice ? "stable" : prices.buyPrice > good.buyPrice ? "rising" : "falling",
    worldEffect: effect.worldEffect,
  });
}

function hostileBorder(activeWars, leftNationId, rightNationId) {
  if (!leftNationId || !rightNationId || leftNationId === rightNationId) return false;
  return activeWars.some((war) => (
    (war.attackerNationId === leftNationId && war.defenderNationId === rightNationId)
    || (war.attackerNationId === rightNationId && war.defenderNationId === leftNationId)
  ));
}

export function getV3TradeAccess(geopolitics, decisionProfiles, leftNationId, rightNationId, activeWars = []) {
  if (!leftNationId || !rightNationId || leftNationId === rightNationId) return { multiplier: 1, diplomatic: 1, openness: 1, hostile: false };
  const relation = geopolitics?.relations?.[[leftNationId, rightNationId].sort().join(":")];
  const hostile = hostileBorder(activeWars, leftNationId, rightNationId) || Boolean(relation?.atWar);
  const diplomatic = clamp(0.8 + (Number(relation?.trade) || 0) / 100 * 0.7
    + (Number(relation?.relation) || 0) / 100 * 0.15, 0.55, 1.65);
  const meanOpenness = ((Number(decisionProfiles?.[leftNationId]?.traits?.openness) || 0)
    + (Number(decisionProfiles?.[rightNationId]?.traits?.openness) || 0)) / 2;
  const openness = clamp(1 + meanOpenness / 100 * 0.2, 0.8, 1.2);
  return { multiplier: diplomatic * openness * (hostile ? 0.2 : 1), diplomatic, openness, hostile };
}

function moveRoadShipments(economy, world, period) {
  const shipments = [];
  const decisionProfiles = deriveNationDecisionProfiles(world.runtime, world.raceDynamics);
  for (const road of [...world.roads].sort((left, right) => left.id.localeCompare(right.id))) {
    const left = economy.settlements[road.fromObjectId];
    const right = economy.settlements[road.toObjectId];
    if (!left || !right) continue;
    const access = getV3TradeAccess(world.geopolitics, decisionProfiles, left.nationId, right.nationId, world.activeWars);
    const institutionalAccess = left.nationId === right.nationId ? 1 : 1 + Math.max(...[left, right].map((market) => {
      const civic = world.civicRegions[market.regionId];
      return civic?.funded ? civicTotal(civicPolicies(civic.institutions), "tradeAccess") + (civic.shippingCharter ? 0.15 : 0) : 0;
    }));
    access.multiplier *= institutionalAccess;
    const roadCapacity = (Number(road.importance) || 1) * (Number(road.condition) || 0) / 100 * 1.5 * access.multiplier;
    for (const commodityId of Object.keys(MERCHANT_COMMODITIES)) {
      const leftGood = left.goods[commodityId];
      const rightGood = right.goods[commodityId];
      const leftCoverage = (leftGood.inventory - leftGood.lastUnmetConsumption) / Math.max(1, leftGood.lastConsumption);
      const rightCoverage = (rightGood.inventory - rightGood.lastUnmetConsumption) / Math.max(1, rightGood.lastConsumption);
      if (Math.abs(leftCoverage - rightCoverage) < 0.55) continue;
      const [origin, destination, originGood, destinationGood] = leftCoverage > rightCoverage
        ? [left, right, leftGood, rightGood]
        : [right, left, rightGood, leftGood];
      const surplus = Math.max(0, originGood.inventory - originGood.lastConsumption * 1.15);
      const deficit = Math.max(0, destinationGood.lastConsumption * 1.4 + destinationGood.lastUnmetConsumption - destinationGood.inventory);
      const units = round1(Math.min(surplus, deficit, roadCapacity,
        destinationGood.capacity - destinationGood.inventory + destinationGood.lastUnmetConsumption));
      if (units < 0.5) continue;
      const consumedOnArrival = round1(Math.min(units, destinationGood.lastUnmetConsumption));
      originGood.inventory = round1(originGood.inventory - units);
      destinationGood.inventory = round1(Math.min(destinationGood.capacity, destinationGood.inventory + units - consumedOnArrival));
      destinationGood.lastUnmetConsumption = round1(destinationGood.lastUnmetConsumption - consumedOnArrival);
      originGood.lastExports = round1(originGood.lastExports + units);
      destinationGood.lastImports = round1(destinationGood.lastImports + units);
      shipments.push({
        id: `market-shipment:${period}:${road.id}:${commodityId}`,
        type: "market_shipment",
        period,
        roadId: road.id,
        commodityId,
        commodityName: MERCHANT_COMMODITIES[commodityId].name,
        quantity: units,
        originSettlementId: origin.id,
        originSettlementName: origin.name,
        destinationSettlementId: destination.id,
        destinationSettlementName: destination.name,
        hostileBorder: access.hostile,
        tradeAccess: { institutional: Number(institutionalAccess.toFixed(3)), diplomatic: round1(access.diplomatic), openness: round1(access.openness), multiplier: round1(access.multiplier) },
        consumedOnArrival,
        reason: destinationGood.shortage ? "不足市場への補給" : "価格差と在庫差の調整",
        summary: `${origin.name}から${destination.name}へ${MERCHANT_COMMODITIES[commodityId].name}${units}を輸送`,
      });
    }
  }
  return shipments.slice(0, V3_MARKET_SHIPMENT_LIMIT);
}

export function createV3MarketEconomy(runtime, date, generatedWorld, externalCrises = null) {
  const world = marketWorld(runtime, date, generatedWorld);
  const period = periodFor(date);
  const seed = generatedWorld?.seed ?? "world";
  return {
    version: V3_MARKET_ECONOMY_VERSION,
    establishedPeriod: period,
    lastAdvancedPeriod: null,
    lastFeedbackPeriod: null,
    nationFeedback: {},
    settlements: Object.fromEntries(world.objects.map((settlement) => [
      settlement.id,
      settlementState(seed, period, settlement, world, externalCrises),
    ])),
    shipments: [],
    history: [],
    events: [],
  };
}

export function normalizeV3MarketEconomy(runtime, source, date, generatedWorld, externalCrises = null) {
  const baseline = createV3MarketEconomy(runtime, date, generatedWorld, externalCrises);
  if (!source || Number(source.version) !== V3_MARKET_ECONOMY_VERSION) return baseline;
  const world = marketWorld(runtime, date, generatedWorld);
  const period = periodFor(date);
  const seed = generatedWorld?.seed ?? "world";
  baseline.establishedPeriod = typeof source.establishedPeriod === "string" ? source.establishedPeriod : period;
  baseline.lastAdvancedPeriod = typeof source.lastAdvancedPeriod === "string" ? source.lastAdvancedPeriod : null;
  baseline.lastFeedbackPeriod = typeof source.lastFeedbackPeriod === "string" ? source.lastFeedbackPeriod : null;
  baseline.nationFeedback = Object.fromEntries(Object.entries(source.nationFeedback ?? {})
    .filter(([nationId, feedback]) => world.nationById.has(nationId) && feedback && typeof feedback === "object")
    .map(([nationId, feedback]) => [nationId, clone(feedback)]));
  baseline.settlements = Object.fromEntries(world.objects.map((settlement) => [
    settlement.id,
    settlementState(seed, period, settlement, world, externalCrises, source.settlements?.[settlement.id]),
  ]));
  baseline.shipments = (Array.isArray(source.shipments) ? source.shipments : []).filter((entry) => entry?.id).slice(0, V3_MARKET_SHIPMENT_LIMIT);
  baseline.history = (Array.isArray(source.history) ? source.history : []).filter((entry) => entry?.period).slice(-V3_MARKET_HISTORY_LIMIT);
  baseline.events = (Array.isArray(source.events) ? source.events : []).filter((entry) => entry?.id).slice(-V3_MARKET_SHIPMENT_LIMIT);
  return baseline;
}

export function advanceV3MarketEconomyMonth(runtime, source, date, generatedWorld, externalCrises = null) {
  const current = normalizeV3MarketEconomy(runtime, source, date, generatedWorld, externalCrises);
  if (current.lastAdvancedPeriod === periodFor(date)) return current;
  const world = marketWorld(runtime, date, generatedWorld);
  const period = periodFor(date);
  const seed = generatedWorld?.seed ?? "world";
  const next = {
    ...current,
    lastAdvancedPeriod: period,
    settlements: Object.fromEntries(world.objects.map((settlement) => [
      settlement.id,
      settlementState(seed, period, settlement, world, externalCrises, current.settlements[settlement.id], true),
    ])),
  };
  next.shipments = moveRoadShipments(next, world, period);
  for (const settlement of world.objects) {
    for (const commodityId of Object.keys(MERCHANT_COMMODITIES)) {
      recalculateGood(seed, period, settlement, commodityId, next.settlements[settlement.id].goods[commodityId], world, externalCrises);
    }
  }
  const shortages = Object.values(next.settlements).reduce((sum, settlement) => (
    sum + Object.values(settlement.goods).filter((good) => good.shortage).length
  ), 0);
  next.history = [...current.history, { period, shipmentCount: next.shipments.length, shortageCount: shortages }].slice(-V3_MARKET_HISTORY_LIMIT);
  next.events = [...current.events, ...next.shipments].slice(-V3_MARKET_SHIPMENT_LIMIT);
  return next;
}

export function getV3MarketSnapshot(source, settlementId) {
  const settlement = source?.settlements?.[settlementId];
  return settlement ? clone(settlement) : null;
}

export function applyV3MarketInventoryFlows(runtime, simulation, flows = [], source = "player") {
  if (!simulation || !flows.length) return simulation;
  const next = clone(simulation);
  next.marketEconomy = normalizeV3MarketEconomy(runtime, next.marketEconomy, next, next.generatedWorld, next.externalCrises);
  const world = marketWorld(runtime, next, next.generatedWorld);
  const period = periodFor(next);
  const seed = next.generatedWorld?.seed ?? "world";
  for (const flow of flows) {
    const market = next.marketEconomy.settlements[flow.settlementId];
    const settlement = world.objectById.get(flow.settlementId);
    const good = market?.goods?.[flow.commodityId];
    if (!market || !settlement || !good || !Number.isFinite(Number(flow.quantity))) continue;
    const actual = clamp(Number(flow.quantity), -good.inventory, good.capacity - good.inventory);
    good.inventory = round1(good.inventory + actual);
    if (source === "player" || flow.source === "player") good.playerFlow = round1((Number(good.playerFlow) || 0) + actual);
    recalculateGood(seed, period, settlement, flow.commodityId, good, world, next.externalCrises);
  }
  return next;
}
