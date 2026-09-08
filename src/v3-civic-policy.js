// Shared by the campaign, actual markets and environmental simulation.
export const V3_CIVIC_VERSION = 1;
export const V3_INSTITUTIONS = Object.freeze([
  { id: "regional-council", label: "地方議会の議決権", icon: "council", domain: "government", path: "federation", autonomy: 6, support: 4, monthlySupport: 0.8, taxRate: -0.02, upkeep: 0.6, description: "住民代表に議決権を渡す。毎月の支持+0.8、税収−2%、議会費0.6。" },
  { id: "local-budget", label: "地域予算の裁量", icon: "treasury", domain: "economy", path: "federation", autonomy: 8, support: 2, taxRate: -0.08, production: 0.08, roadRepair: 1, description: "税収の8%を地方に留保。全商品の生産+8%、街道の状態を毎月1修復する。" },
  { id: "cultural-rights", label: "言語と慣習の保障", icon: "culture", domain: "culture", path: "federation", autonomy: 6, support: 4, monthlySupport: 0.4, description: "言語・慣習を保障。異文化との交渉負担を減らし、毎月の支持+0.4。" },
  { id: "mutual-defense", label: "共同防衛の協議制", icon: "shield", domain: "security", path: "federation", autonomy: 4, support: 2, readiness: 12, defenseMaintenance: 0.5, raidReduction: 6, upkeep: 1, description: "防備+12。毎月の平時防備低下を相殺し、魔族襲撃の圧力目標−6。維持費1。" },
  { id: "open-trade", label: "相互通商の保障", icon: "commerce", domain: "economy", path: "federation", autonomy: 4, support: 2, taxRate: -0.03, tradeAccess: 0.25, upkeep: 0.4, description: "関税収入を3%減らし、当地を通る国境街道の輸送能力+25%。維持費0.4。戦争による封鎖は残る。" },
  { id: "watershed-pact", label: "水源と生息地の共同管理", icon: "habitat", domain: "culture", path: "federation", autonomy: 6, support: 2, habitatRecovery: 3, floodReduction: 16, fireReduction: 12, timberProduction: -0.12, upkeep: 1, description: "水源と森林の共同保全。洪水の圧力目標−16、山火事−12、生息環境を毎月3回復。伐採量−12%、維持費1。" },
  { id: "harvest-cooperative", label: "農村の共同備蓄", icon: "grain", domain: "economy", path: "federation", autonomy: 5, support: 3, grainProduction: 0.16, taxRate: -0.04, upkeep: 0.8, description: "農村の共同設備で穀物生産+16%。税収−4%、維持費0.8。食料不足に備える。" },
  { id: "local-mediation", label: "地域間の調停院", icon: "diplomacy", domain: "government", path: "federation", autonomy: 5, support: 4, monthlySupport: 0.6, upkeep: 0.5, description: "住民と地方間の争いを調停する。毎月の支持+0.6、維持費0.5。" },
  { id: "central-tax", label: "中央会計と統一徴税", icon: "treasury", domain: "economy", path: "empire", autonomy: -8, support: -3, taxRate: 0.18, monthlySupport: -0.4, description: "税収+18%。地方の裁量を中央へ移し、毎月の支持−0.4。" },
  { id: "common-law", label: "統一法と官吏任命", icon: "charter", domain: "government", path: "empire", autonomy: -6, support: -1, taxRate: 0.04, monthlySupport: 0.2, upkeep: 0.5, description: "共通の行政手続を整える。税収+4%、毎月の支持+0.2。官吏費0.5、地方の自治は減る。" },
  { id: "national-army", label: "常備軍の統合指揮", icon: "military", domain: "security", path: "empire", autonomy: -8, support: -2, readiness: 18, defenseMaintenance: 1, raidReduction: 9, upkeep: 1.5, description: "防備+18、毎月の防備+1（通常の消耗前）。魔族襲撃の圧力目標−9、維持費1.5。" },
].map(Object.freeze));

const clamp = (value, low = 0, high = 100) => Math.min(high, Math.max(low, Number(value) || 0));
const round = (value) => Number(value.toFixed(2));
export const civicPolicies = (ids) => V3_INSTITUTIONS.filter((entry) => (ids ?? []).includes(entry.id));
export const civicTotal = (policies, field) => policies.reduce((sum, policy) => sum + (policy[field] ?? 0), 0);

export function normalizeV3CivicState(runtime, source) {
  if (source?.version != null && source.version !== V3_CIVIC_VERSION) throw new Error("この地域政策の保存形式には対応していません。");
  return { version: V3_CIVIC_VERSION, regions: Object.fromEntries(Object.entries(source?.regions ?? {})
    .filter(([id, entry]) => runtime.regionById.has(id) && entry && typeof entry.ownerNationId === "string")
    .map(([id, entry]) => [id, {
      ownerNationId: entry.ownerNationId, officeRequired: Boolean(entry.officeRequired),
      institutions: [...new Set(Array.isArray(entry.institutions) ? entry.institutions : [])].filter((id) => V3_INSTITUTIONS.some((policy) => policy.id === id)), funded: entry.funded !== false,
      habitatHealth: clamp(entry.habitatHealth ?? 50), lastAdvancedPeriod: entry.lastAdvancedPeriod ?? null,
      sanctuary: Boolean(entry.sanctuary), shippingCharter: Boolean(entry.shippingCharter),
    }])) };
}

export function getV3CivicRegion(civicState, generatedWorld, runtime, regionId) {
  const entry = civicState?.regions?.[regionId];
  const office = generatedWorld?.regionalDomains?.regionStates?.[regionId];
  const owner = office?.nationId ?? runtime?.regionById.get(regionId)?.nationId;
  if (!entry || entry.ownerNationId !== owner || (entry.officeRequired && office?.lordId !== "v3-player")) return null;
  return entry;
}

export function getV3CivicProduction(entry, commodityId) {
  if (!entry?.funded) return 1;
  const policies = civicPolicies(entry.institutions);
  return Math.max(0.5, 1 + civicTotal(policies, "production")
    + (commodityId === "grain" ? civicTotal(policies, "grainProduction") : 0)
    + (commodityId === "timber" ? civicTotal(policies, "timberProduction") - (entry.sanctuary ? 0.08 : 0) : 0));
}

export function getV3CivicPressureReduction(entry, typeId) {
  if (!entry?.funded) return 0;
  const key = { flood: "floodReduction", wildfire: "fireReduction", demon_raid: "raidReduction" }[typeId];
  return civicTotal(civicPolicies(entry.institutions), key) + (entry.sanctuary && ["flood", "wildfire"].includes(typeId) ? 5 : 0);
}

export function advanceV3CivicEnvironment(runtime, simulation, period) {
  const civicState = normalizeV3CivicState(runtime, simulation.civicState);
  for (const [regionId, entry] of Object.entries(civicState.regions)) {
    if (!getV3CivicRegion(civicState, simulation.generatedWorld, runtime, regionId) || !entry.funded || entry.lastAdvancedPeriod === period) continue;
    const policies = civicPolicies(entry.institutions);
    entry.habitatHealth = round(clamp(entry.habitatHealth + civicTotal(policies, "habitatRecovery") + (entry.sanctuary ? 2 : 0)));
    entry.lastAdvancedPeriod = period;
    const repair = civicTotal(policies, "roadRepair");
    if (!repair) continue;
    for (const road of runtime.nations.roads ?? []) {
      if (!(road.tileIndices ?? []).some((index) => runtime.tiles[index]?.regionId === regionId)) continue;
      const asset = simulation.generatedWorld.regionalDomains?.assetStates?.[`road:${road.id}`];
      if (asset) { asset.condition = round(clamp(asset.condition + repair)); asset.available = asset.condition > 0; }
    }
  }
  return civicState;
}
