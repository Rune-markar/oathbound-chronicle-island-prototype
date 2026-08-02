const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));

export const ADMINISTRATION_MODES = {
  direct: {
    id: "direct",
    name: "直轄",
    description: "朝廷が個別命令を出す。細かく介入できるが、版図が広がるほど統治負担が増える。",
    burden: 1,
  },
  delegated: {
    id: "delegated",
    name: "太守委任",
    description: "朝廷は達成基準だけを示し、太守が州庫と属官を使って日常政務を処理する。",
    burden: 0.25,
  },
};

export const ADMINISTRATION_MANDATES = {
  balanced: {
    id: "balanced", name: "均衡統治", short: "均衡",
    description: "食料・治安・腐敗の危険を先に処理し、平時は農業と商業を交互に育てる。",
  },
  granary: {
    id: "granary", name: "民生備蓄", short: "備蓄",
    description: "戸口の食料と常平倉の備えを優先する。飢饉に強いが、現金収入は伸びにくい。",
  },
  revenue: {
    id: "revenue", name: "戸籍・交易", short: "富国",
    description: "戸籍と市場を整え、把握できる戸口と税収を増やす。急拡大時は民心に注意が要る。",
  },
  order: {
    id: "order", name: "安民・粛正", short: "安民",
    description: "治安、民心、汚職監査を優先し、反乱と徴税漏れを抑える。",
  },
  frontier: {
    id: "frontier", name: "辺境兵站", short: "戍辺",
    description: "駐屯軍の練度と街道治安を優先する。兵糧と州庫への負担は大きい。",
  },
};

function defaultMandate(world, cityId) {
  if (cityId === world.nation.capital) return "balanced";
  const kind = world.provinces[cityId]?.kind ?? "";
  if (/境|塞/.test(kind)) return "frontier";
  if (/港|河/.test(kind)) return "revenue";
  return "balanced";
}

function defaultCityAdministration(world, state, cityId) {
  const ownedAtStart = world.provinces[cityId]?.owner === world.nation.id;
  return {
    mode: cityId === world.nation.capital ? "direct" : "delegated",
    mandate: defaultMandate(world, cityId),
    integration: ownedAtStart ? 100 : 12,
    registerCoverage: ownedAtStart ? (cityId === world.nation.capital ? 92 : 82) : 18,
    reserveMoney: cityId === world.nation.capital ? 14 : 10,
    reserveFoodMonths: 0.8,
    lastAction: null,
  };
}

export function getCityAdministrationConfig(world, state, cityId) {
  return {
    ...defaultCityAdministration(world, state, cityId),
    ...(state.cities[cityId]?.administration ?? {}),
  };
}

export function normalizeAdministrationState(world, state) {
  state.administration ??= { system: "prefecture", lastUpperReport: null };
  Object.keys(state.cities).forEach((cityId) => {
    state.cities[cityId].administration = getCityAdministrationConfig(world, state, cityId);
  });
  return state;
}

function governorScore(world, state, city) {
  const base = world.characters[city.governorId];
  const local = state.officers[city.governorId];
  if (!base || !local || local.allegiance !== "serving") return 28;
  return base.stats.politics * 0.62 + base.stats.intelligence * 0.26 + base.stats.charisma * 0.12;
}

function integrationStage(value) {
  if (value < 25) return { id: "occupied", name: "軍政下", description: "城と街道だけを押さえ、戸籍も徴税もほぼ旧勢力に依存する。" };
  if (value < 50) return { id: "pacified", name: "帰順途上", description: "有力者との盟約で秩序を保つが、命令は都市外へ届きにくい。" };
  if (value < 75) return { id: "registered", name: "戸籍編入", description: "戸口と田地の把握が進み、税・兵・輸送を制度として扱える。" };
  return { id: "incorporated", name: "州郡化", description: "法令と上計が定着し、平時の政務を太守へ委ねられる。" };
}

export function deriveCityAdministration(world, state, cityId, metrics = null) {
  const city = state.cities[cityId];
  if (!city) return null;
  const config = getCityAdministrationConfig(world, state, cityId);
  const officeLevel = city.facilities?.office?.level ?? 0;
  const roadLevel = city.facilities?.road?.level ?? 0;
  const corruption = city.internal?.corruption ?? 20;
  const administrativeEfficiency = city.internal?.administrativeEfficiency ?? 45;
  const distance = world.provinces[cityId]?.administrativeDistance
    ?? (cityId === world.nation.capital ? 0 : 1);
  const governor = governorScore(world, state, city);
  const reach = clamp(
    25 + governor * 0.3 + administrativeEfficiency * 0.24 + officeLevel * 4.5
      + config.registerCoverage * 0.07 - distance * 7 - corruption * 0.13
      + (config.mode === "direct" ? 5 : 0),
    8, 100,
  );
  const integration = clamp(config.integration, 0, 100);
  const coverage = clamp(
    config.registerCoverage * 0.56 + integration * 0.24 + reach * 0.2 - corruption * 0.06,
    5, 100,
  );
  const control = clamp(reach * 0.48 + integration * 0.32 + coverage * 0.2, 0, 100);
  const population = city.resources.population;
  const registeredPopulation = Math.round(population * coverage / 100);
  const civilianNeed = metrics?.civilianNeed ?? Math.round(population * 0.23);
  const foodBalance = metrics?.foodBalance ?? 0;
  const reserveFood = Math.round(civilianNeed * config.reserveFoodMonths);
  const physicalFood = Math.max(0, city.resources.food - reserveFood);
  const expectedSurplus = Math.max(0, foodBalance) * 0.35;
  const deliveryRate = clamp(
    (0.35 + roadLevel * 0.12) * reach / 100 * (0.2 + integration * 0.008)
      * (1 - corruption / 180),
    0.02, 0.92,
  );
  const deliverableFood = Math.round((physicalFood + expectedSurplus) * deliveryRate);
  const cashAboveReserve = Math.max(0, city.resources.money - config.reserveMoney);
  const remittanceRate = clamp(
    (config.mode === "direct" ? 0.42 : 0.3) * reach / 100 * (0.25 + integration * 0.0075)
      * (1 - corruption / 160),
    0.03, 0.55,
  );
  const remittableMoney = round(cashAboveReserve * remittanceRate, 1);
  const security = city.resources.security ?? 50;
  const support = city.resources.support ?? 50;
  const mandateReadiness = config.mandate === "frontier" ? 1.08 : config.mandate === "granary" ? 0.92 : 1;
  const mobilizationRate = clamp(
    reach / 100 * (0.25 + integration * 0.0075) * (0.55 + security / 230)
      * (0.7 + support / 330) * mandateReadiness,
    0.04, 0.96,
  );
  const mobilizableTroops = Math.round(city.military.troops * mobilizationRate);
  return {
    cityId,
    mode: config.mode,
    modeName: ADMINISTRATION_MODES[config.mode]?.name ?? config.mode,
    mandate: config.mandate,
    mandateName: ADMINISTRATION_MANDATES[config.mandate]?.name ?? config.mandate,
    integration: round(integration, 1),
    stage: integrationStage(integration),
    registerCoverage: round(coverage, 1),
    registeredPopulation,
    reach: round(reach, 1),
    control: round(control, 1),
    reserveMoney: config.reserveMoney,
    reserveFood,
    reserveFoodMonths: config.reserveFoodMonths,
    deliverableFood,
    remittableMoney,
    mobilizationRate: round(mobilizationRate * 100, 1),
    mobilizableTroops,
    lastAction: config.lastAction,
  };
}

export function deriveAdministrationCapacity(world, state) {
  const cityIds = Object.keys(state.cities);
  const servingOfficers = Object.values(state.officers).filter((officer) => officer.allegiance === "serving").length;
  const officeLevels = cityIds.reduce((sum, cityId) => sum + (state.cities[cityId].facilities?.office?.level ?? 0), 0);
  const reports = cityIds.map((cityId) => deriveCityAdministration(world, state, cityId));
  const directCities = reports.filter((report) => report.mode === "direct").length;
  const delegatedCities = reports.length - directCities;
  const integrationBurden = reports.reduce((sum, report) => sum + (100 - report.integration) / 55, 0);
  const burden = directCities * ADMINISTRATION_MODES.direct.burden
    + delegatedCities * ADMINISTRATION_MODES.delegated.burden + integrationBurden;
  const span = 2.5 + Math.sqrt(Math.max(0, officeLevels)) + servingOfficers * 0.16;
  const overextension = clamp((burden - span) / Math.max(1, span) * 100, 0, 300);
  return {
    directCities, delegatedCities, officeLevels,
    burden: round(burden, 1), span: round(span, 1),
    overextension: round(overextension, 0),
    overextensionPenalty: Math.min(5, Math.ceil(overextension / 35)),
  };
}

export function deriveAdministrationNetwork(world, state, cityMetrics = []) {
  const byId = new Map(cityMetrics.map((city) => [city.cityId, city]));
  const cities = Object.keys(state.cities).map((cityId) => deriveCityAdministration(world, state, cityId, byId.get(cityId)));
  const population = Object.values(state.cities).reduce((sum, city) => sum + city.resources.population, 0);
  const weighted = (field, weight = "registeredPopulation") => cities.reduce((sum, city) => sum + city[field] * city[weight], 0)
    / Math.max(1, cities.reduce((sum, city) => sum + city[weight], 0));
  return {
    ...deriveAdministrationCapacity(world, state),
    cities,
    nominalPopulation: population,
    registeredPopulation: cities.reduce((sum, city) => sum + city.registeredPopulation, 0),
    registrationRate: round(cities.reduce((sum, city) => sum + city.registeredPopulation, 0) / Math.max(1, population) * 100, 1),
    deliverableFood: cities.reduce((sum, city) => sum + city.deliverableFood, 0),
    remittableMoney: round(cities.reduce((sum, city) => sum + city.remittableMoney, 0), 1),
    mobilizableTroops: cities.reduce((sum, city) => sum + city.mobilizableTroops, 0),
    averageReach: round(weighted("reach"), 0),
    averageControl: round(weighted("control"), 0),
    unintegratedCities: cities.filter((city) => city.integration < 75).length,
  };
}

function actionScale(city, report) {
  const populationScale = clamp(Math.sqrt(city.resources.population / 10000), 0.65, 2.4);
  const quality = clamp(report.reach / 75 * (0.45 + report.integration / 180), 0.35, 1.25);
  return { populationScale, quality };
}

function canSpend(city, config, cost) {
  return city.resources.money - cost >= config.reserveMoney;
}

function delegatedSpendingCategory(id) {
  if (["grain", "patrol", "relief", "order"].includes(id)) return "social_security";
  if (id === "frontier") return "military_affairs";
  if (["audit", "registry"].includes(id)) return "research_development";
  return "economic_investment";
}

function spendAction(cityId, id, title, detail, cost, changes) {
  return {
    id, kind: "administration", cityId, title, status: "completed", detail,
    spendingCategory: delegatedSpendingCategory(id), cost: { money: cost }, governanceCost: 0, forced: false, changes,
  };
}

function chooseDelegatedAction(world, state, cityId) {
  const city = state.cities[cityId];
  const config = getCityAdministrationConfig(world, state, cityId);
  if (config.mode !== "delegated" || config.integration < 25) return null;
  const report = deriveCityAdministration(world, state, cityId);
  const { populationScale, quality } = actionScale(city, report);
  const cost = round(1.2 + populationScale, 1);
  const civilianNeed = Math.max(1, Math.round(city.resources.population * 0.23));
  const foodMonths = city.resources.food / civilianNeed;
  const apply = (id, title, detail, changes, price = cost) => {
    if (!canSpend(city, config, price)) return null;
    city.resources.money = round(city.resources.money - price, 1);
    Object.entries(changes.resources ?? {}).forEach(([key, value]) => {
      const maximum = key === "food" || key === "population" ? Number.MAX_SAFE_INTEGER : 100;
      city.resources[key] = clamp(city.resources[key] + value, key === "population" ? 1000 : 0, maximum);
    });
    Object.entries(changes.internal ?? {}).forEach(([key, value]) => { city.internal[key] = clamp(city.internal[key] + value, 0, 100); });
    Object.entries(changes.military ?? {}).forEach(([key, value]) => { city.military[key] = clamp(city.military[key] + value, 0, 100); });
    return spendAction(cityId, `delegated-${state.turn}-${cityId}-${id}`, title, detail, price, changes);
  };

  if (foodMonths < config.reserveFoodMonths * 0.72) {
    const food = Math.round(300 * populationScale * quality);
    return apply("grain", "州庫が穀物を買入", `備蓄 ${foodMonths.toFixed(1)}か月分を検知し、太守が市場から食料 ${food.toLocaleString("ja-JP")}を調達。`, { resources: { food, support: round(0.15 * quality, 1) } });
  }
  if (city.resources.security < 55) {
    const security = round(0.8 * quality, 1);
    return apply("patrol", "属官が郷里を巡察", `治安基準55を下回ったため、県吏と駐屯兵が街道を巡察。治安 +${security}。`, { resources: { security } });
  }
  if (city.internal.corruption > 22 && (city.facilities.office?.level ?? 0) > 0) {
    const corruption = round(-0.65 * quality, 1);
    return apply("audit", "太守が帳簿を照合", `上計前の帳簿監査を実施。腐敗 ${corruption}。`, { internal: { corruption }, resources: { support: -0.1 } }, round(cost * 0.75, 1));
  }
  if (city.resources.support < 48 && city.resources.food > civilianNeed * 0.55) {
    const support = round(0.65 * quality, 1);
    const food = -Math.round(90 * populationScale);
    return apply("relief", "州庫が窮民を救済", `民心基準48を下回ったため、食料 ${Math.abs(food).toLocaleString("ja-JP")}を放出。民心 +${support}。`, { resources: { food, support } }, round(cost * 0.6, 1));
  }

  const alternating = (state.turn + Object.keys(state.cities).indexOf(cityId)) % 2 === 0;
  if (config.mandate === "granary") {
    const production = round(0.22 * quality, 1);
    return apply("fields", "水利と田界を整備", `民生備蓄の委任に基づき、生産力 +${production}。`, { resources: { production } });
  }
  if (config.mandate === "revenue") {
    const commerce = round(0.24 * quality, 1);
    const register = round(0.18 * quality, 1);
    const action = apply("registry", "戸籍と市籍を更新", `戸籍・交易の委任に基づき、商業力 +${commerce}・戸籍把握 +${register}。`, { resources: { commerce } });
    if (action) city.administration.registerCoverage = clamp(city.administration.registerCoverage + register, 5, 100);
    return action;
  }
  if (config.mandate === "order") {
    const security = round(0.45 * quality, 1);
    const corruption = round(-0.2 * quality, 1);
    return apply("order", "郷里の訴えを巡回審理", `安民・粛正の委任に基づき、治安 +${security}・腐敗 ${corruption}。`, { resources: { security }, internal: { corruption } }, round(cost * 0.8, 1));
  }
  if (config.mandate === "frontier") {
    const training = round(0.28 * quality, 1);
    const food = -Math.round(45 * populationScale);
    if (city.resources.food + food < civilianNeed * 0.45) return null;
    return apply("frontier", "烽火と輸送隊を点検", `辺境兵站の委任に基づき、練度 +${training}。食料 ${Math.abs(food).toLocaleString("ja-JP")}を使用。`, { resources: { food }, military: { training } });
  }
  const field = alternating ? "production" : "commerce";
  const label = alternating ? "農地台帳" : "市場規約";
  const gain = round(0.16 * quality, 1);
  return apply("balanced", `${label}を整備`, `均衡統治の委任に基づき、${alternating ? "生産力" : "商業力"} +${gain}。`, { resources: { [field]: gain } }, round(cost * 0.85, 1));
}

function advanceIntegration(world, state, cityId) {
  const city = state.cities[cityId];
  const config = city.administration;
  if (config.integration >= 100) return;
  const report = deriveCityAdministration(world, state, cityId);
  const peace = state.war ? 0.55 : 1;
  const localConsent = clamp((city.resources.security + city.resources.support) / 140, 0.35, 1.35);
  const gain = clamp(0.35 + report.reach / 115, 0.35, 1.2) * peace * localConsent;
  config.integration = round(clamp(config.integration + gain, 0, 100), 1);
  const targetCoverage = clamp(14 + config.integration * 0.78, 14, 94);
  config.registerCoverage = round(clamp(config.registerCoverage + (targetCoverage - config.registerCoverage) * 0.025, 5, 100), 1);
}

export function resolveDelegatedAdministration(world, state) {
  normalizeAdministrationState(world, state);
  const actions = [];
  Object.keys(state.cities).forEach((cityId) => {
    advanceIntegration(world, state, cityId);
    const action = chooseDelegatedAction(world, state, cityId);
    if (action) {
      state.cities[cityId].administration.lastAction = { turn: state.turn, title: action.title, detail: action.detail };
      actions.push(action);
    }
  });
  return actions;
}
