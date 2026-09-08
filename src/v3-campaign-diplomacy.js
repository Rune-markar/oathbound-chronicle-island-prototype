import { deriveNationDecisionProfile } from "./race-decision-system.js";
import { v3DecisionRoll } from "./v3-simulation-model.js";

const clamp = (value, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, Number(value) || 0));
const value = (condition, key) => Number.isFinite(condition?.[key]) ? condition[key] : 50;
const mean = (rows) => rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;

// The developer inspector reads the same coefficients as these calculations.
export const V3_DIPLOMACY_RULES = Object.freeze({
  treaty: Object.freeze({ baseTrust: 40, retentionBuffer: 8, minRetentionTrust: 35, sovereigntyWeight: 0.18, defenseWeight: 0.08, culturePenalty: 10, opennessWeight: -0.05, distantPenalty: 4, warPenalty: 18, minTrust: 42, maxTrust: 86, baseCost: 5, strengthDivisor: 35, distantCost: 2 }),
  envoy: Object.freeze({ baseGain: 19, opennessWeight: 0.045, sovereigntyWeight: -0.045, cultureWeight: -0.25, urgentGain: 3, minGain: 10, maxGain: 25, wartimeGain: 24 }),
  aid: Object.freeze({ baseCost: 7, sovereigntyDivisor: 20, defenseCost: 3 }),
  territory: Object.freeze({ baseTrust: 40, sovereigntyWeight: 0.25, defenseWeight: 0.15, lastRegionPenalty: 12, seaPenalty: 6, urgentRelief: 8, offerRelief: 8, minTrust: 45, maxTrust: 92, landCost: 16, seaCost: 20, sovereigntyCost: 0.1, defenseCost: 0.06, lastRegionCost: 8 }),
  military: Object.freeze({ baseChance: 0.5, defenseDivisor: 170, meritWeight: 0.025, meritCap: 10, sovereigntyDivisor: 450, minChance: 0.12, maxChance: 0.88 }),
});

export const V3_DIPLOMATIC_NEEDS = Object.freeze({
  food: { label: "食料の確保", voice: "次の収穫までの食料を確保したい。共同備蓄か、買付資金を約束してほしい。", policy: "harvest-cooperative", icon: "grain" },
  defense: { label: "国境の安全", voice: "防衛の負担を一国に押しつけないこと。共同防衛か、補給費の分担を求める。", policy: "mutual-defense", icon: "shield" },
  treasury: { label: "財政の回復", voice: "加盟しても地方の収入が失われる協定は受けられない。通商か復興資金の保証がほしい。", policy: "open-trade", icon: "treasury" },
  habitat: { label: "水源と暮らしの保全", voice: "災害の負担を下流だけに負わせないこと。共同保全か復旧費の負担を求める。", policy: "watershed-pact", icon: "habitat" },
  autonomy: { label: "自治と主権の保障", voice: "自国の議会と言葉を守りたい。地方の議決権を保障することが合意の前提だ。", policy: "regional-council", icon: "charter" },
});

export function getV3DiplomaticPosition(context, state, facts, nation, simulation) {
  const entry = state.campaign.diplomacy[nation.id] ?? { trust: 0, consent: false };
  const condition = simulation?.generatedWorld.geopolitics?.nationStates?.[nation.id] ?? {};
  const relation = simulation?.generatedWorld.geopolitics?.relations?.[[state.campaign.nationId, nation.id].sort().join(":")];
  const atWar = Boolean(relation?.atWar || facts.map?.activeWars.some((war) => [war.attackerNationId, war.defenderNationId].includes(nation.id) && [war.attackerNationId, war.defenderNationId].includes(state.campaign.nationId)));
  const profile = deriveNationDecisionProfile(context.runtime, simulation?.generatedWorld.raceDynamics, nation.id, nation);
  const openness = profile?.traits?.openness ?? 0;
  const differentCulture = nation.peopleId !== (facts.nations.find((n) => n.id === state.campaign.nationId)?.peopleId ?? state.player.raceId);
  const currentOwner = (entry) => facts.regions.find((region) => region.id === entry.regionId)?.nationId ?? entry.nationId;
  const markets = Object.values(simulation?.marketEconomy?.settlements ?? {}).filter((market) => currentOwner(market) === nation.id);
  const grainCoverage = mean(markets.map((market) => market.goods.grain.coverageMonths));
  const crises = (simulation?.externalCrises?.activeCrises ?? []).filter((crisis) => currentOwner(crisis) === nation.id);
  const environmentalPressure = crises.filter((crisis) => ["flood", "wildfire"].includes(crisis.type)).reduce((sum, crisis) => sum + crisis.severity, 0);
  const neighboring = facts.ownedRegions.some((region) => (region.neighborIds ?? []).some((id) => facts.regions.find((r) => r.id === id)?.nationId === nation.id));
  const food = value(condition, "foodSecurity"), defense = value(condition, "readiness"), treasury = value(condition, "reserves"), sovereignty = value(condition, "sovereignty");
  const urgent = environmentalPressure >= 3 ? "habitat" : food < 42 || (markets.length && grainCoverage < 0.75) ? "food" : defense < 42 ? "defense" : treasury < 42 ? "treasury" : "autonomy";
  // Keep a negotiated offer stable while it is being fulfilled; do not change the
  // demand immediately because the agreed aid improved its underlying need.
  const needId = entry.offer?.kind && V3_DIPLOMATIC_NEEDS[entry.offer.kind] ? entry.offer.kind : urgent;
  const need = V3_DIPLOMATIC_NEEDS[needId];
  const treaty = V3_DIPLOMACY_RULES.treaty, envoy = V3_DIPLOMACY_RULES.envoy, aid = V3_DIPLOMACY_RULES.aid;
  const culturePenalty = differentCulture && !state.campaign.institutions.includes("cultural-rights") ? treaty.culturePenalty : 0;
  const joiningThreshold = Math.round(clamp(treaty.baseTrust + sovereignty * treaty.sovereigntyWeight + defense * treaty.defenseWeight + culturePenalty + openness * treaty.opennessWeight + (neighboring ? 0 : treaty.distantPenalty) + (atWar ? treaty.warPenalty : 0), treaty.minTrust, treaty.maxTrust));
  const threshold = entry.consent ? Math.max(treaty.minRetentionTrust, joiningThreshold - treaty.retentionBuffer) : joiningThreshold;
  const envoyGain = atWar ? envoy.wartimeGain : Math.round(clamp(envoy.baseGain + openness * envoy.opennessWeight + sovereignty * envoy.sovereigntyWeight + culturePenalty * envoy.cultureWeight + (urgent !== "autonomy" ? envoy.urgentGain : 0), envoy.minGain, envoy.maxGain));
  const offerSatisfied = Boolean(entry.offer) || Boolean(entry.consent && entry.legacyConsent);
  const policySatisfied = entry.offer?.method !== "policy" || state.campaign.institutions.includes(need.policy);
  const suspensionReasons = [
    ...(atWar ? ["交戦中。協議団で停戦を交渉する"] : []),
    ...(entry.trust < threshold ? [`維持に必要な信頼${threshold}が不足。協議団で信頼を回復する`] : []),
    ...(state.campaign.autonomy < 55 ? ["自国の自治55が必要。地方の権利を回復する"] : []),
    ...(!offerSatisfied ? ["具体的な保障・援助の提案が必要"] : []),
    ...(!policySatisfied ? ["約束した制度を採用し直す"] : []),
  ];
  const willing = suspensionReasons.length === 0;
  const cost = Math.round(treaty.baseCost + (sovereignty + defense) / treaty.strengthDivisor + (neighboring ? 0 : treaty.distantCost));
  const aidCost = Math.round(aid.baseCost + sovereignty / aid.sovereigntyDivisor + (needId === "defense" ? aid.defenseCost : 0));
  return { ...entry, id: nation.id, name: nation.name, peopleName: nation.peopleName ?? nation.peopleId, differentCulture, atWar, willing, threshold,
    joiningThreshold, suspensionReasons, envoyGain, cost, aidCost, needId, need, offerSatisfied, policySatisfied, openness, neighboring, grainCoverage, environmentalPressure,
    conditions: { foodSecurity: food, readiness: defense, reserves: treasury, sovereignty, cohesion: value(condition, "cohesion") },
    factors: [...(entry.consent ? ["成立済み合意の維持条件"] : []), `主権維持 ${Math.round(sovereignty)}`, `防衛 ${Math.round(defense)}`, `食料 ${Math.round(food)}`, `財政 ${Math.round(treasury)}`, `現在の開放性 ${Math.round(openness)}`, neighboring ? "共有国境あり" : "遠隔国", ...(culturePenalty ? ["言語・慣習の保障が未整備"] : [])],
  };
}

export function getV3TerritorialNegotiation(state, facts, region, owner) {
  const condition = owner?.conditions ?? { readiness: 50, sovereignty: 50, reserves: 50, foodSecurity: 50 };
  const rules = V3_DIPLOMACY_RULES.territory;
  const ownsLastRegion = facts.regions.filter((r) => r.nationId === region.nationId).length === 1;
  const urgent = Math.min(condition.foodSecurity, condition.reserves) < 35;
  const threshold = Math.round(clamp(rules.baseTrust + condition.sovereignty * rules.sovereigntyWeight + condition.readiness * rules.defenseWeight + (ownsLastRegion ? rules.lastRegionPenalty : 0) + (region.bySea ? rules.seaPenalty : 0) - (urgent ? rules.urgentRelief : 0) - (owner?.offerSatisfied ? rules.offerRelief : 0), rules.minTrust, rules.maxTrust));
  const cost = Math.round((region.bySea ? rules.seaCost : rules.landCost) + condition.sovereignty * rules.sovereigntyCost + condition.readiness * rules.defenseCost + (ownsLastRegion ? rules.lastRegionCost : 0));
  const reasons = [...((owner?.trust ?? 0) < threshold ? [`領有国との信頼${threshold}が必要`] : []), ...(!owner?.offerSatisfied ? ["領有国の要求に応える援助か制度保障が必要"] : []), ...(owner?.atWar ? ["交戦中は行政移管を合意できません。先に停戦を交渉してください"] : [])];
  return { threshold, cost, reasons, summary: `${owner?.name ?? "領有国"}は主権${Math.round(condition.sovereignty)}・防衛${Math.round(condition.readiness)}。${ownsLastRegion ? "最後の領地を預けるため追加の保障を求める。" : urgent ? "生活・財政の不足から共同運営を検討している。" : "行政権と住民の暮らしへの補償を求める。"}` };
}

export function getV3MilitaryPressure(state, owner) {
  const rules = V3_DIPLOMACY_RULES.military;
  const target = owner?.conditions ?? { readiness: 50, sovereignty: 50 };
  return Number(clamp(rules.baseChance + (state.campaign.readiness - target.readiness) / rules.defenseDivisor + Math.min(rules.meritCap, state.military?.merit ?? 0) * rules.meritWeight - target.sovereignty / rules.sovereigntyDivisor, rules.minChance, rules.maxChance).toFixed(2));
}

export function rollV3MilitaryPressure(simulation, state, regionId, period) {
  return v3DecisionRoll(simulation.generatedWorld.seed, simulation.model?.trial ?? 0, period, `${state.campaign.nationId}:pressure:${regionId}`);
}
