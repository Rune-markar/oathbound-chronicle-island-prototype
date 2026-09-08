import { createStateReason } from "./state-reason-system.js";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
const round1 = (value) => Number(value.toFixed(1));

// Observe the same completed market ledger used by player trade. Unmet demand
// is measured after road deliveries have fed households, not before relief.
export function getV3NationMarketFeedback(marketEconomy, nationId, condition = {}, date = {}) {
  const markets = Object.values(marketEconomy?.settlements ?? {}).filter((market) => market.nationId === nationId);
  if (!markets.length) return null;
  let grainInventory = 0;
  let grainDemand = 0;
  let grainUnmet = 0;
  let grainDelivered = 0;
  let goodsDemand = 0;
  let goodsUnmet = 0;
  let logisticsVolume = 0;
  for (const market of markets) {
    for (const [commodityId, good] of Object.entries(market.goods ?? {})) {
      const demand = Math.max(0, Number(good.lastConsumption) || 0);
      const unmet = clamp(good.lastUnmetConsumption, 0, demand);
      goodsDemand += demand;
      goodsUnmet += unmet;
      logisticsVolume += Math.max(0, Number(good.lastImports) || 0);
      if (commodityId === "grain") {
        grainInventory += Math.max(0, Number(good.inventory) || 0);
        grainDemand += demand;
        grainUnmet += unmet;
        grainDelivered += Math.max(0, Number(good.lastImports) || 0);
      }
    }
  }
  const grainCoverageMonths = grainInventory / Math.max(1, grainDemand);
  const grainUnmetShare = grainUnmet / Math.max(1, grainDemand);
  const goodsUnmetShare = goodsUnmet / Math.max(1, goodsDemand);
  // Provisioning shocks alter the existing geopolitical equilibrium. Ordinary
  // full warehouses do not create national wealth or cohesion every month.
  const previous = marketEconomy?.nationFeedback?.[nationId];
  const recovering = (Number(previous?.grainUnmetShare) || 0) > 0.1
    && grainUnmetShare < previous.grainUnmetShare * 0.5 && grainCoverageMonths >= 0.75;
  const foodPressure = Math.round(clamp(grainUnmetShare * 3 + Math.max(0, 0.75 - grainCoverageMonths) * 1.4, 0, 3));
  const emergencyProvisioning = grainUnmetShare === 0 && grainCoverageMonths >= 1.5 && condition.foodSecurity < 35;
  const desiredEffects = {
    foodSecurity: -foodPressure + (emergencyProvisioning ? 3 : recovering && condition.foodSecurity < 60 ? 1 : 0),
    reserves: -Math.round(goodsUnmetShare * 2),
    cohesion: -Math.round(grainUnmetShare * 3) + (recovering && condition.cohesion < 50 ? 1 : 0),
  };
  const effects = Object.fromEntries(Object.entries(desiredEffects).map(([field, delta]) => [field,
    Math.round(clamp((Number(condition[field]) || 0) + delta, 0, 100)) - (Number(condition[field]) || 0),
  ]));
  return {
    period: `${date.year}-${date.month}`,
    nationId,
    marketCount: markets.length,
    grainCoverageMonths: round1(grainCoverageMonths),
    grainDemand: round1(grainDemand),
    grainUnmet: round1(grainUnmet),
    grainUnmetShare: Number(grainUnmetShare.toFixed(3)),
    grainDelivered: round1(grainDelivered),
    goodsUnmetShare: Number(goodsUnmetShare.toFixed(3)),
    logisticsVolume: round1(logisticsVolume),
    recovering,
    emergencyProvisioning,
    effects,
    summary: `穀物備蓄${round1(grainCoverageMonths)}か月、当月未充足${Math.round(grainUnmetShare * 100)}%、街道からの穀物補給${round1(grainDelivered)}。食料・財政・結束に反映。`,
  };
}

export function applyV3MarketNationFeedback(generatedWorld, marketEconomy, date) {
  const period = `${date.year}-${date.month}`;
  if (!generatedWorld?.geopolitics || marketEconomy?.lastAdvancedPeriod !== period
    || marketEconomy.lastFeedbackPeriod === period) return { generatedWorld, marketEconomy };
  const nationStates = { ...generatedWorld.geopolitics.nationStates };
  const nationFeedback = {};
  for (const [nationId, condition] of Object.entries(nationStates)) {
    const feedback = getV3NationMarketFeedback(marketEconomy, nationId, condition, date);
    if (!feedback) continue;
    const next = { ...condition };
    for (const [field, delta] of Object.entries(feedback.effects)) next[field] += delta;
    next.stateReason = createStateReason(next, condition.stateReason);
    nationStates[nationId] = next;
    nationFeedback[nationId] = feedback;
  }
  return {
    generatedWorld: { ...generatedWorld, geopolitics: { ...generatedWorld.geopolitics, nationStates } },
    marketEconomy: { ...marketEconomy, lastFeedbackPeriod: period, nationFeedback },
  };
}
