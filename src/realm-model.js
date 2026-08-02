import {
  deriveAdministrationCapacity,
  deriveAdministrationNetwork,
} from "./administration-model.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));

export const TASK_WEIGHTS = {
  cultivate: { politics: 0.45, intelligence: 0.25, charisma: 0.2, leadership: 0.1 },
  commerce: { politics: 0.45, charisma: 0.35, intelligence: 0.2 },
  patrol: { charisma: 0.35, leadership: 0.25, war: 0.2, intelligence: 0.2 },
  repair: { politics: 0.4, intelligence: 0.35, leadership: 0.25 },
  drill: { leadership: 0.45, war: 0.35, charisma: 0.2 },
  harbor: { politics: 0.5, intelligence: 0.35, charisma: 0.15 },
  scouting: { intelligence: 0.5, leadership: 0.25, politics: 0.25 },
  diplomacy: { politics: 0.45, charisma: 0.4, intelligence: 0.15 },
  justification: { intelligence: 0.4, politics: 0.35, charisma: 0.25 },
  recruitment: { charisma: 0.5, politics: 0.3, intelligence: 0.2 },
  mobilize: { leadership: 0.4, charisma: 0.25, war: 0.25, politics: 0.1 },
};

export const DOCTRINES = {
  balanced: {
    id: "balanced", name: "均衡政務", description: "都市・外交・国境防衛を同じ優先度で処理する。",
    taskBonus: {}, incomeMultiplier: 1, foodMultiplier: 1, levyMultiplier: 1,
  },
  prosperity: {
    id: "prosperity", name: "富国評定", description: "商業と開墾を優先し、月次収入を伸ばす。即応動員は鈍る。",
    taskBonus: { cultivate: 8, commerce: 10 }, incomeMultiplier: 1.08, foodMultiplier: 1.04, levyMultiplier: 0.88,
  },
  sea_guard: {
    id: "sea_guard", name: "国境防衛評定", description: "測量・訓練・街道整備を優先し、峠への即応力を上げる。",
    taskBonus: { scouting: 10, drill: 8, harbor: 6, mobilize: 7 }, incomeMultiplier: 0.95, foodMultiplier: 0.98, levyMultiplier: 1.08,
  },
  concord: {
    id: "concord", name: "和議評定", description: "治安・交渉・登用を優先し、都市と隣国の支持基盤を整える。",
    taskBonus: { patrol: 10, diplomacy: 9, recruitment: 8, justification: 4 }, incomeMultiplier: 0.98, foodMultiplier: 1, levyMultiplier: 0.9,
  },
};

export const FACILITIES = {
  farmland: { id: "farmland", name: "農地", icon: "田", baseCost: 5, costGrowth: 4, durationBase: 1, upkeep: 0.55, workers: 520, effect: "食料生産倍率 +16%/Lv（稼働率100%時）", description: "食料生産を増やす。洪水・不作の影響を受ける。" },
  market: { id: "market", name: "市場", icon: "市", baseCost: 6, costGrowth: 5, durationBase: 1, upkeep: 0.7, workers: 420, effect: "税・商業収入倍率 +8%/Lv（稼働率100%時）", description: "商業税収と商人流入を増やす。治安が低いと稼働率が落ちる。" },
  road: { id: "road", name: "道路", icon: "路", baseCost: 7, costGrowth: 5, durationBase: 1, upkeep: 0.45, workers: 240, effect: "税・商業収入倍率 +4%/Lv（稼働率100%時）", description: "交易、建設、軍の移動を支える。" },
  granary: { id: "granary", name: "穀倉", icon: "倉", baseCost: 7, costGrowth: 5, durationBase: 1, upkeep: 0.5, workers: 160, effect: "食料保存率 +2.5点/Lv（最大99%）", description: "食料損耗を抑え、飢饉への余裕を作る。" },
  barracks: { id: "barracks", name: "兵舎", icon: "兵", baseCost: 8, costGrowth: 6, durationBase: 2, upkeep: 0.9, workers: 180, effect: "駐屯上限 +820/Lv・治安月次 +0.2/Lv", description: "駐屯上限、訓練、治安を高める。" },
  office: { id: "office", name: "役所", icon: "庁", baseCost: 9, costGrowth: 7, durationBase: 2, upkeep: 1.1, workers: 260, effect: "行政係数 +2.5%/Lv・腐敗月次 -0.16/Lv", description: "行政効率と統治力を高め、腐敗を抑える。" },
};

export const POLICY_DEFINITIONS = {
  landTax: {
    id: "landTax", name: "農地税", description: "農村からの税と農民・地主の支持を調整する。",
    options: {
      low: { name: "低率 6%", rate: 0.06, support: 0.8, factions: { farmers: 1.2, landowners: 0.6 } },
      standard: { name: "標準 10%", rate: 0.1, support: 0, factions: {} },
      high: { name: "高率 15%", rate: 0.15, support: -1.2, factions: { farmers: -1.8, landowners: -1.2 } },
    },
  },
  commerceTax: {
    id: "commerceTax", name: "商業税", description: "市場収入と商人の定着を調整する。",
    options: {
      low: { name: "低率 5%", rate: 0.05, support: 0.4, factions: { merchants: 1.5 } },
      standard: { name: "標準 9%", rate: 0.09, support: 0, factions: {} },
      high: { name: "高率 14%", rate: 0.14, support: -0.8, factions: { merchants: -2.2 } },
    },
  },
  conscription: {
    id: "conscription", name: "徴兵方式", description: "兵力、維持費、生産への負担を決める。",
    options: {
      militia: { name: "民兵制", levy: 0.8, upkeep: 0.75, production: -0.01, support: 0.2, factions: { military: -0.4, farmers: 0.4 } },
      levy: { name: "徴兵制", levy: 1.18, upkeep: 0.9, production: -0.04, support: -0.8, factions: { military: 0.7, farmers: -1.4 } },
      standing: { name: "常備軍制", levy: 0.65, upkeep: 1.25, production: 0, support: -0.2, factions: { military: 1.2 } },
      mercenary: { name: "傭兵制", levy: 0.35, upkeep: 1.5, production: 0, support: -0.4, factions: { military: -0.8, merchants: -0.3 } },
    },
  },
  rationing: {
    id: "rationing", name: "食料配給", description: "住民消費と民心を交換する。",
    options: {
      generous: { name: "手厚い配給", consumption: 1.08, support: 1.2, factions: { farmers: 0.5 } },
      normal: { name: "通常配給", consumption: 1, support: 0, factions: {} },
      restricted: { name: "制限配給", consumption: 0.88, support: -1.4, factions: { farmers: -1.2, military: -0.3 } },
    },
  },
  immigration: {
    id: "immigration", name: "移民政策", description: "人口流入と治安負担を調整する。",
    options: {
      closed: { name: "流入制限", migration: -0.0004, security: 0.25, support: -0.1, factions: { landowners: 0.4, merchants: -0.5 } },
      neutral: { name: "自然流入", migration: 0, security: 0, support: 0, factions: {} },
      encourage: { name: "移民奨励", migration: 0.0014, security: -0.35, support: 0.3, factions: { merchants: 0.6, landowners: -0.5 } },
    },
  },
  securityPolicy: {
    id: "securityPolicy", name: "治安方針", description: "秩序、民心、恐怖、腐敗の関係を決める。",
    options: {
      tolerant: { name: "寛容", security: 0.2, support: 0.8, fear: -0.6, corruption: 0, factions: { farmers: 0.4, merchants: 0.3 } },
      fair: { name: "公正", security: 0.65, support: 0.45, fear: -0.2, corruption: -0.3, factions: {} },
      strict: { name: "厳罰", security: 1.15, support: -0.65, fear: 1, corruption: 0.1, factions: { military: 0.6, farmers: -0.4 } },
      arbitrary: { name: "恣意的", security: 0.75, support: -1.4, fear: 1.4, corruption: 0.75, factions: { military: 0.3, merchants: -0.8, landowners: -0.5 } },
    },
  },
};

export const FACTION_DEFINITIONS = {
  farmers: { id: "farmers", name: "農民", icon: "農", demand: "食料と負担の安定" },
  merchants: { id: "merchants", name: "商人", icon: "商", demand: "安全な交易と予見可能な税" },
  landowners: { id: "landowners", name: "地主", icon: "領", demand: "土地権益と秩序の維持" },
  military: { id: "military", name: "軍人", icon: "軍", demand: "給与、兵糧、名誉" },
};

export function seasonForMonth(month) {
  if ([3, 4, 5].includes(month)) return { id: "spring", name: "春", food: 0.92 };
  if ([6, 7, 8].includes(month)) return { id: "summer", name: "夏", food: 1.04 };
  if ([9, 10, 11].includes(month)) return { id: "autumn", name: "秋", food: 1.25 };
  return { id: "winter", name: "冬", food: 0.7 };
}

export function getOfficer(world, state, officerId) {
  const base = world.characters[officerId];
  const local = state.officers[officerId];
  if (!base || !local) return null;
  return { ...base, ...local, stats: base.stats };
}

export function getServingOfficers(world, state) {
  return Object.keys(state.officers)
    .map((id) => getOfficer(world, state, id))
    .filter((officer) => officer.allegiance === "serving");
}

export function getAvailableOfficers(world, state) {
  const reserved = new Set((state.pendingOrders ?? []).map((order) => order.officerId).filter(Boolean));
  return getServingOfficers(world, state).filter((officer) => !officer.assignment && !reserved.has(officer.id) && officer.stamina >= 20);
}

export function deriveOfficerScore(world, state, officerId, taskType, cityId = null) {
  const officer = getOfficer(world, state, officerId);
  if (!officer) return 0;
  const weights = TASK_WEIGHTS[taskType] ?? TASK_WEIGHTS.commerce;
  const statScore = Object.entries(weights).reduce((sum, [stat, weight]) => sum + officer.stats[stat] * weight, 0);
  const loyaltyFactor = 0.78 + officer.loyalty / 450;
  const staminaFactor = 0.72 + officer.stamina / 360;
  const locationFactor = cityId && officer.location !== cityId ? 0.92 : 1;
  const traitBonus = officer.traits.includes(taskType) ? 12 : 0;
  const experienceBonus = Math.min(8, Math.sqrt(Math.max(0, officer.merit)) / 2.2);
  const doctrine = DOCTRINES[state.council.doctrine] ?? DOCTRINES.balanced;
  const doctrineBonus = doctrine.taskBonus[taskType] ?? 0;
  return clamp(Math.round(statScore * loyaltyFactor * staminaFactor * locationFactor + traitBonus + experienceBonus + doctrineBonus), 1, 120);
}

function villageNetwork(world, cityId, regionalPopulation) {
  const villages = world.provinces[cityId].villages.map((id) => world.villages[id]);
  const population = villages.reduce((sum, village) => sum + village.population, 0);
  const populationByKind = villages.reduce((result, village) => {
    result[village.kind] = (result[village.kind] ?? 0) + village.population;
    return result;
  }, {});
  const share = (kind) => (populationByKind[kind] ?? 0) / Math.max(1, regionalPopulation);
  return {
    villages, population,
    agricultureSupport: share("農村"), fishingSupport: share("漁村"),
    shipbuildingSupport: share("造船村"), miningSupport: share("鉱村"),
  };
}

function governorBonuses(world, state, cityId) {
  const city = state.cities[cityId];
  const governor = getOfficer(world, state, city.governorId);
  if (!governor) return { administration: 0, appeal: 0, command: 0 };
  return {
    administration: (governor.stats.politics * 0.65 + governor.stats.intelligence * 0.35) / 100,
    appeal: (governor.stats.charisma * 0.7 + governor.loyalty * 0.3) / 100,
    command: (governor.stats.leadership * 0.65 + governor.stats.war * 0.35) / 100,
  };
}

function legacyTaxPolicy(rate) {
  if (rate >= 0.14) return "high";
  if (rate <= 0.08) return "low";
  return "standard";
}

function normalizeCityState(city, state) {
  if (city.resources && city.internal && city.military && city.policies && city.facilities && city.factions) return city;
  const taxPolicy = legacyTaxPolicy(city.taxRate ?? 0.1);
  const taxSecurityPenalty = Math.max(0, ((city.taxRate ?? 0.1) - 0.1) * 100);
  const population = city.population ?? 0;
  const facility = (level = 1) => ({ level, condition: 100 });
  return {
    ...city,
    legacyFoodMultiplier: 1.2,
    resources: {
      population,
      food: city.provisions ?? 0,
      money: city.gold ?? 0,
      production: city.agriculture ?? 50,
      commerce: city.commerce ?? 50,
      security: clamp((city.security ?? 50) - taxSecurityPenalty, 0, 100),
      support: clamp((city.security ?? 50) * 0.7 + (state.legitimacy ?? 50) * 0.3 - taxSecurityPenalty, 0, 100),
      defense: city.defense ?? 50,
    },
    internal: {
      administrativeEfficiency: 55,
      corruption: 10,
      foodPreservation: 91,
      sanitation: 62,
      housingCapacity: Math.round(population * 1.08),
    },
    military: {
      draftPopulation: city.draftPopulation ?? 0,
      troops: city.troops ?? 0,
      sailors: city.sailors ?? 0,
      ships: city.ships ?? 0,
      training: city.training ?? 50,
      shipyard: city.shipyard ?? 0,
    },
    workforce: { participationRate: 0.47 },
    policies: {
      landTax: taxPolicy,
      commerceTax: taxPolicy,
      conscription: "militia",
      rationing: "normal",
      immigration: "neutral",
      securityPolicy: "fair",
    },
    facilities: {
      farmland: facility((city.agriculture ?? 0) >= 65 ? 2 : 1),
      market: facility((city.commerce ?? 0) >= 70 ? 2 : 1),
      road: facility(1),
      granary: facility(1),
      barracks: facility((city.defense ?? 0) >= 60 ? 2 : 1),
      office: facility(1),
    },
    factions: {
      farmers: { support: 58, influence: 32, radicalism: 8 },
      merchants: { support: 55, influence: 27, radicalism: 7 },
      landowners: { support: 62, influence: 21, radicalism: 6 },
      military: { support: 60, influence: 20, radicalism: 5 },
    },
  };
}

function policyOption(city, policyId) {
  const definition = POLICY_DEFINITIONS[policyId];
  return definition.options[city.policies[policyId]] ?? Object.values(definition.options)[0];
}

function facilitySummary(city) {
  const facilities = Object.values(FACILITIES).map((definition) => {
    const local = city.facilities[definition.id] ?? { level: 0, condition: 100 };
    const requiredWorkers = definition.workers * local.level;
    return { ...definition, ...local, requiredWorkers };
  });
  const availableWorkers = Math.round(city.resources.population * (city.workforce?.participationRate ?? 0.47));
  const requiredWorkers = facilities.reduce((sum, facility) => sum + facility.requiredWorkers, 0);
  const laborRate = clamp(availableWorkers / Math.max(1, requiredWorkers), 0, 1);
  const fundingRate = city.resources.money <= 0 ? 0.45 : 1;
  facilities.forEach((facility) => {
    facility.operatingRate = facility.level === 0 ? 0 : clamp(Math.min(laborRate, fundingRate, facility.condition / 100), 0, 1);
    facility.upkeepTotal = facility.upkeep * facility.level;
  });
  return { facilities, availableWorkers, requiredWorkers, unemployment: Math.max(0, availableWorkers - requiredWorkers), laborRate };
}

function facilityLevel(summary, id) {
  const facility = summary.facilities.find((item) => item.id === id);
  return (facility?.level ?? 0) * (facility?.operatingRate ?? 0);
}

function factionForecast(city, foodSatisfaction, unemploymentRate, policyEffects) {
  return Object.values(FACTION_DEFINITIONS).map((definition) => {
    const current = city.factions[definition.id];
    let delta = (city.resources.support - 50) / 90 + (foodSatisfaction - 1) * 3 - unemploymentRate * 2;
    delta += policyEffects[definition.id] ?? 0;
    if (definition.id === "merchants") delta += (city.resources.commerce - 50) / 90;
    if (definition.id === "farmers") delta += (city.resources.production - 50) / 100;
    if (definition.id === "military") delta += city.military.troops > 0 && city.resources.food > 0 ? 0.2 : -1.5;
    if (definition.id === "landowners") delta += city.resources.security > 55 ? 0.25 : -0.5;
    delta = clamp(delta, -3, 3);
    const radicalismDelta = clamp((35 - current.support) / 30 + Math.max(0, -delta) * 0.35 - city.resources.security / 220, -1.5, 2.5);
    return {
      ...definition,
      ...current,
      demand: current.demand ?? definition.demand,
      delta: round(delta, 1),
      radicalismDelta: round(radicalismDelta, 1),
    };
  });
}

function change(value, reasons) {
  return { current: value, delta: round(reasons.reduce((sum, item) => sum + item.value, 0), 1), reasons };
}

export function deriveCityMetrics(world, state, cityId) {
  const city = normalizeCityState(state.cities[cityId], state);
  const base = world.provinces[cityId];
  const resources = city.resources;
  const internal = city.internal;
  const military = city.military;
  const governor = governorBonuses(world, state, cityId);
  const village = villageNetwork(world, cityId, resources.population);
  const doctrine = DOCTRINES[state.council.doctrine] ?? DOCTRINES.balanced;
  const season = seasonForMonth(state.month);
  const facilities = facilitySummary(city);
  const farmland = facilityLevel(facilities, "farmland");
  const market = facilityLevel(facilities, "market");
  const road = facilityLevel(facilities, "road");
  const granary = facilityLevel(facilities, "granary");
  const barracks = facilityLevel(facilities, "barracks");
  const office = facilityLevel(facilities, "office");
  const landTax = policyOption(city, "landTax");
  const commerceTax = policyOption(city, "commerceTax");
  const conscription = policyOption(city, "conscription");
  const rationing = policyOption(city, "rationing");
  const immigration = policyOption(city, "immigration");
  const securityPolicy = policyOption(city, "securityPolicy");
  const policyEffects = {};
  [landTax, commerceTax, conscription, rationing, immigration, securityPolicy].forEach((option) => {
    Object.entries(option.factions ?? {}).forEach(([id, value]) => { policyEffects[id] = (policyEffects[id] ?? 0) + value; });
  });

  const securityFactor = 0.58 + resources.security / 235;
  const adminFactor = 0.62 + internal.administrativeEfficiency / 230 + office * 0.025;
  const landIncome = resources.population / 1300 * (0.65 + resources.production / 100) * landTax.rate * 8;
  const commerceIncome = resources.population / 1200 * (0.4 + resources.commerce / 100) * commerceTax.rate * 7;
  const incomeCollectionFactor = securityFactor * adminFactor
    * (1 + market * 0.08 + road * 0.04 + village.miningSupport * 0.55)
    * doctrine.incomeMultiplier * (1 - internal.corruption / 170);
  const landTaxIncome = landIncome * incomeCollectionFactor;
  const commerceTaxIncome = commerceIncome * incomeCollectionFactor;
  const grossIncome = landTaxIncome + commerceTaxIncome;
  const officerWages = getServingOfficers(world, state)
    .filter((officer) => officer.location === cityId)
    .reduce((sum, officer) => sum + 0.32 + officer.rankLevel * 0.11, 0);
  const facilityUpkeep = facilities.facilities.reduce((sum, facility) => sum + facility.upkeepTotal, 0);
  const troopUpkeep = military.troops / 520 * (conscription.upkeep ?? 1);
  const fleetUpkeep = military.ships * 0.58;
  const expenses = officerWages + facilityUpkeep + troopUpkeep + fleetUpkeep;
  const netIncome = grossIncome - expenses;

  const foodProduction = Math.round(
    resources.population * 0.24 * (0.5 + resources.production / 100)
      * season.food * securityFactor * (0.82 + governor.administration * 0.22)
      * (1 + farmland * 0.16 + village.agricultureSupport * 0.9 + village.fishingSupport * 0.35)
      * doctrine.foodMultiplier * (1 + (conscription.production ?? 0)) * (city.legacyFoodMultiplier ?? 1),
  );
  const civilianNeed = Math.round(resources.population * 0.23 * rationing.consumption);
  const militaryNeed = Math.round(military.troops * 0.76 + military.ships * 92);
  const preservation = clamp(internal.foodPreservation + granary * 2.5, 70, 99);
  const spoilage = Math.max(0, Math.round(resources.food * (100 - preservation) / 100 * 0.22));
  const foodConsumption = civilianNeed + militaryNeed + spoilage;
  const foodBalance = foodProduction - foodConsumption;
  const foodSatisfaction = clamp((resources.food + foodProduction) / Math.max(1, foodConsumption), 0, 1.3);

  const housingRate = clamp(internal.housingCapacity / Math.max(1, resources.population), 0, 1.2);
  const unemploymentRate = facilities.availableWorkers > 0 ? facilities.unemployment / facilities.availableWorkers : 0;
  const populationRate = 0.001
    + (foodSatisfaction - 1) * 0.004
    + (resources.support - 50) / 50000
    + (internal.sanitation - 50) / 70000
    + (housingRate - 1) * 0.003
    + immigration.migration;
  const populationDelta = Math.round(resources.population * clamp(populationRate, -0.012, 0.009));

  const taxSupport = (landTax.support ?? 0) + (commerceTax.support ?? 0);
  const foodSupport = clamp((foodSatisfaction - 1) * 6, -3.5, 1.8);
  const supportDelta = clamp(
    taxSupport + foodSupport + (rationing.support ?? 0) + (immigration.support ?? 0)
      + (securityPolicy.support ?? 0) + (resources.security - 50) / 85 - internal.corruption / 90,
    -5, 4,
  );
  const securityDelta = clamp(
    (securityPolicy.security ?? 0) + barracks * 0.2 + (resources.support - 50) / 110
      - unemploymentRate * 2.2 - internal.corruption / 120 - Math.max(0, 0.9 - foodSatisfaction) * 4,
    -4, 3,
  );
  const sanitationDelta = clamp((resources.food > 0 ? 0.15 : -1.2) + office * 0.05 - Math.max(0, resources.population / internal.housingCapacity - 1) * 2, -2, 1.2);
  const corruptionDelta = clamp((securityPolicy.corruption ?? 0) - office * 0.16 + (internal.administrativeEfficiency < 45 ? 0.35 : 0), -1.2, 1.5);
  const fearDelta = clamp(securityPolicy.fear ?? 0, -1.5, 1.8);
  const draftRecovery = Math.max(0, Math.round(
    resources.population * 0.0019 * resources.security / 100 * (0.72 + governor.appeal * 0.4)
      * doctrine.levyMultiplier * (conscription.levy ?? 1),
  ));
  const troopCapacity = Math.round(520 + barracks * 820 + resources.defense * 14);
  const crewRequirement = military.ships * 110;
  const crewCoverage = clamp(military.sailors / Math.max(1, crewRequirement), 0, 1.15);
  const factions = factionForecast(city, foodSatisfaction, unemploymentRate, policyEffects);
  const factionRisk = Math.round(Math.max(...factions.map((faction) => faction.radicalism * faction.influence / 100), 0));

  const forecasts = {
    money: change(resources.money, [
      { label: "税・商業収入", value: round(grossIncome, 1) },
      { label: "施設・俸給・軍維持", value: round(-expenses, 1) },
    ]),
    food: change(resources.food, [
      { label: `${season.name}の食料生産`, value: foodProduction },
      { label: "住民・軍の消費", value: -(civilianNeed + militaryNeed) },
      { label: "保存損耗", value: -spoilage },
    ]),
    population: change(resources.population, [{ label: "自然増減・移民", value: populationDelta }]),
    security: change(resources.security, [
      { label: "司法・駐屯・雇用", value: round(securityDelta + unemploymentRate * 2.2, 1) },
      { label: "失業・腐敗・食料", value: round(-unemploymentRate * 2.2 - internal.corruption / 120 - Math.max(0, 0.9 - foodSatisfaction) * 4, 1) },
    ]),
    support: change(resources.support, [
      { label: "政策・治安", value: round(taxSupport + (rationing.support ?? 0) + (immigration.support ?? 0) + (securityPolicy.support ?? 0) + (resources.security - 50) / 85, 1) },
      { label: "食料・腐敗", value: round(foodSupport - internal.corruption / 90, 1) },
    ]),
  };

  return {
    ...base, cityId, governorId: city.governorId, governor, village, season,
    resources, internal, military, facilities, factions, forecasts,
    population: resources.population, food: resources.food, money: resources.money,
    production: resources.production, agriculture: resources.production, commerce: resources.commerce,
    security: resources.security, publicOrder: resources.security, support: resources.support,
    defense: resources.defense, gold: resources.money, provisions: resources.food,
    draftPopulation: military.draftPopulation, troops: military.troops, sailors: military.sailors,
    ships: military.ships, training: military.training, shipyard: military.shipyard,
    households: Math.round(resources.population / 5), grossIncome, landTaxIncome, commerceTaxIncome, expenses, netIncome,
    officerWages, facilityUpkeep, troopUpkeep, fleetUpkeep,
    foodProduction, supplyYield: foodProduction, civilianNeed, militaryNeed, spoilage, foodBalance, supplyBalance: foodBalance,
    foodSatisfaction, housingRate, unemploymentRate, populationDelta, supportDelta, securityDelta,
    sanitationDelta, corruptionDelta, fearDelta, draftRecovery, troopCapacity,
    crewRequirement, crewCoverage, factionRisk,
  };
}

export function deriveGovernance(world, state) {
  const officers = getServingOfficers(world, state);
  const averagePolitics = officers.reduce((sum, officer) => sum + officer.stats.politics, 0) / Math.max(1, officers.length);
  const cities = Object.values(state.cities).map((city) => normalizeCityState(city, state));
  const officeLevels = cities.reduce((sum, city) => sum + (city.facilities.office?.level ?? 0), 0);
  const averageCorruption = cities.reduce((sum, city) => sum + city.internal.corruption, 0) / Math.max(1, cities.length);
  const administration = deriveAdministrationCapacity(world, state);
  const penalty = state.governancePenalty ?? 0;
  const max = Math.max(1, 4
    + Math.floor((averagePolitics - 60) / 20)
    + Math.max(0, Math.floor(Math.log2(Math.max(1, officeLevels / 3))))
    - Math.floor(averageCorruption / 25)
    - administration.overextensionPenalty
    - penalty);
  const used = (state.pendingOrders ?? []).reduce((sum, order) => sum + order.governanceCost, 0);
  return {
    max, used, available: max - used, hardLimit: max + 2, forced: Math.max(0, used - max),
    averagePolitics: round(averagePolitics, 0), averageCorruption: round(averageCorruption, 0),
    directCities: administration.directCities, delegatedCities: administration.delegatedCities,
    administrativeBurden: administration.burden, administrativeSpan: administration.span,
    overextension: administration.overextension,
  };
}

export function deriveRealmLedger(world, state) {
  const cities = Object.keys(state.cities).map((id) => deriveCityMetrics(world, state, id));
  const officers = getServingOfficers(world, state);
  const available = getAvailableOfficers(world, state);
  const sum = (field) => cities.reduce((total, city) => total + city[field], 0);
  const population = sum("population");
  const troops = sum("troops");
  const governance = deriveGovernance(world, state);
  const administration = deriveAdministrationNetwork(world, state, cities);
  const weighted = (field, weight = "population") => Math.round(cities.reduce((total, city) => total + city[field] * city[weight], 0) / Math.max(1, cities.reduce((total, city) => total + city[weight], 0)));
  return {
    cities, treasury: sum("money"), provisions: sum("food"), troops,
    draftPopulation: sum("draftPopulation"), sailors: sum("sailors"), ships: sum("ships"),
    troopCapacity: sum("troopCapacity"), crewRequirement: sum("crewRequirement"),
    capacityCoverage: clamp(Math.round(sum("troopCapacity") / Math.max(1, troops) * 100), 0, 120),
    crewCoverage: clamp(Math.round(sum("sailors") / Math.max(1, sum("crewRequirement")) * 100), 0, 115),
    netIncome: sum("netIncome"), supplyBalance: sum("foodBalance"), population,
    publicOrder: weighted("security"), support: weighted("support"),
    training: weighted("training", "troops"), defense: weighted("defense", "troops"),
    factionRisk: Math.max(...cities.map((city) => city.factionRisk)),
    officers: officers.length, availableOfficers: available.length,
    governance, administration,
    registeredPopulation: administration.registeredPopulation,
    remittableMoney: administration.remittableMoney,
    deliverableFood: administration.deliverableFood,
    mobilizableTroops: administration.mobilizableTroops,
    commandLimit: governance.max, activeCommands: (state.commandQueue ?? []).length,
  };
}

export function getFacilityUpgradeSpec(city, facilityId) {
  const definition = FACILITIES[facilityId];
  const level = city.facilities[facilityId]?.level ?? 0;
  if (!definition || level >= 3) return null;
  const targetLevel = level + 1;
  return {
    facilityId, targetLevel,
    money: definition.baseCost + definition.costGrowth * level,
    durationTurns: definition.durationBase + (targetLevel === 3 ? 1 : 0),
    governanceCost: targetLevel === 3 ? 2 : 1,
  };
}

export function getTaskForecast(world, state, command, officerId, cityId) {
  const score = deriveOfficerScore(world, state, officerId, command.taskType, cityId);
  const city = cityId ? deriveCityMetrics(world, state, cityId) : null;
  const localFactor = city ? 0.82 + city.security / 500 : 1;
  const expected = Math.max(1, Math.round(score * localFactor));
  const grade = expected >= 90 ? "卓越" : expected >= 72 ? "有望" : expected >= 55 ? "標準" : "難航";
  return { score, expected, grade, range: [Math.max(1, expected - 7), Math.min(120, expected + 7)] };
}

export function deterministicOutcome(task, turn) {
  const seed = [...`${task.commandId}:${task.officerId}:${task.cityId}:${turn}`]
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variance = (seed % 13) - 6;
  return clamp(task.forecast.expected + variance, 1, 120);
}

export function formatBreakdown(city) {
  const road = city.facilities.facilities.find((facility) => facility.id === "road");
  const logistics = `駐屯 ${city.troops.toLocaleString("ja-JP")} / 収容 ${city.troopCapacity.toLocaleString("ja-JP")} / 街道稼働 ${Math.round((road?.operatingRate ?? 0) * 100)}%`;
  return {
    income: `税・商業 ${city.grossIncome.toFixed(1)} − 施設・俸給・軍維持 ${city.expenses.toFixed(1)} ＝ 月次 ${city.netIncome >= 0 ? "+" : ""}${city.netIncome.toFixed(1)}`,
    supplies: `食料生産 ${city.foodProduction.toLocaleString("ja-JP")} − 住民 ${city.civilianNeed.toLocaleString("ja-JP")} − 軍 ${city.militaryNeed.toLocaleString("ja-JP")} − 損耗 ${city.spoilage.toLocaleString("ja-JP")}`,
    draft: `徴募可能 ${city.draftPopulation.toLocaleString("ja-JP")} / 月次回復 ${city.draftRecovery.toLocaleString("ja-JP")} / 駐屯上限 ${city.troopCapacity.toLocaleString("ja-JP")}`,
    logistics,
    navy: logistics,
    villages: `${city.village.villages.map((item) => `${item.name} ${item.kind} ${item.population.toLocaleString("ja-JP")}`).join(" / ")}。村落構成が産出へ反映される。`,
  };
}
