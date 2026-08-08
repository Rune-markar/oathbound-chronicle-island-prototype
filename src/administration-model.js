const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));

export const AUTHORITY_DOMAINS = Object.freeze({
  tax_rights: { id: "tax_rights", name: "徴税権", group: "fiscal", weight: 1.25, workload: 1.35, holder: "landowners" },
  tax_collection: { id: "tax_collection", name: "徴税実務", group: "fiscal", weight: 1.2, workload: 1.8, holder: "landowners" },
  military_command: { id: "military_command", name: "軍事指揮権", group: "military", weight: 1.3, workload: 0.85, holder: "military" },
  conscription: { id: "conscription", name: "徴兵権", group: "military", weight: 1.05, workload: 1.1, holder: "military" },
  justice: { id: "justice", name: "司法権", group: "justice", weight: 1.2, workload: 2.2, holder: "landowners" },
  policing: { id: "policing", name: "警察・治安権", group: "justice", weight: 1.15, workload: 1.75, holder: "military" },
  land_administration: { id: "land_administration", name: "土地管理権", group: "information", weight: 1, workload: 1.25, holder: "landowners" },
  cadastre: { id: "cadastre", name: "地籍管理", group: "information", weight: 1.1, workload: 1.4, holder: "landowners" },
  population_registry: { id: "population_registry", name: "人口・戸籍管理", group: "information", weight: 1.2, workload: 1.55, holder: "temple" },
  education: { id: "education", name: "教育権", group: "standardization", weight: 0.9, workload: 1.45, holder: "temple" },
  religious_authority: { id: "religious_authority", name: "宗教権威", group: "legitimacy", weight: 0.7, workload: 0.65, holder: "temple" },
  currency: { id: "currency", name: "通貨発行", group: "fiscal", weight: 1.05, workload: 0.55, holder: "merchants" },
  customs: { id: "customs", name: "関税", group: "fiscal", weight: 1, workload: 0.9, holder: "merchants" },
  appointments: { id: "appointments", name: "官吏任命", group: "administration", weight: 1.2, workload: 0.9, holder: "landowners" },
  infrastructure: { id: "infrastructure", name: "インフラ管理", group: "infrastructure", weight: 1, workload: 1.65, holder: "merchants" },
  standards: { id: "standards", name: "度量衡", group: "standardization", weight: 0.95, workload: 0.75, holder: "merchants" },
  executive: { id: "executive", name: "行政権", group: "administration", weight: 1.35, workload: 2.05, holder: "landowners" },
});

export const AUTHORITY_REFORM_STAGES = Object.freeze([
  { id: "visibility", name: "可視化", description: "人口・土地・業務量と権利の根拠を調べる。" },
  { id: "standardization", name: "標準化", description: "帳簿・文書・度量衡・手続を共通化する。" },
  { id: "institution", name: "制度構築", description: "移管後の仕事を処理する中央機関と人員を用意する。" },
  { id: "transfer", name: "権力移管", description: "法的権限と実務を中央へ移す。" },
  { id: "backlash", name: "反動", description: "失権した勢力の妨害と地域社会の反発に対処する。" },
  { id: "consolidation", name: "定着", description: "新制度を通常行政として定着させる。" },
]);

export const AUTHORITY_TRANSFER_METHODS = Object.freeze({
  eliminate: {
    id: "eliminate", name: "排除", cost: 5, speed: 1.25, legalTransfer: 32, practicalTransfer: 25, backlash: 24,
    description: "既存勢力の権利を廃止する。速いが、旧勢力が担っていた実務と地域支持を失いやすい。",
  },
  conciliate: {
    id: "conciliate", name: "懐柔", cost: 11, speed: 0.86, legalTransfer: 20, practicalTransfer: 15, backlash: 8,
    description: "補償・官位・新特権と交換する。費用は高いが、行政断絶と反発を抑えやすい。",
  },
  absorb: {
    id: "absorb", name: "吸収", cost: 8, speed: 1, legalTransfer: 26, practicalTransfer: 23, backlash: 13,
    description: "旧勢力の人員を中央機構へ組み込む。実務を保ちやすい一方、中央内部の派閥リスクを残す。",
  },
});

const DOMAIN_CONTROL_MODIFIERS = Object.freeze({
  currency: 18, military_command: 9, executive: 7, appointments: 4,
  religious_authority: -42, education: -28, population_registry: -19,
  cadastre: -16, justice: -12, customs: -8, standards: -10,
});

const REGION_CONTROL_BASE = Object.freeze({
  selene: { legal: 83, practical: 74 },
  nereia: { legal: 70, practical: 55 },
  orta: { legal: 66, practical: 52 },
});

const ENTITY_LABELS = Object.freeze({
  central_court: "セレナ王廷", farmers: "村落共同体", merchants: "商人・都市評議会",
  landowners: "地方地主・旧貴族", military: "在地軍人団", temple: "神殿・宗教組織",
});

function privilegeSeed(cityId, domainId, holderType) {
  const cityNames = { selene: "王都", nereia: "ネレイア河港", orta: "東境" };
  const domain = AUTHORITY_DOMAINS[domainId];
  const originYear = cityId === "selene" ? 86 : cityId === "nereia" ? 173 : 218;
  const reason = cityId === "selene"
    ? "建国戦争で兵糧と官吏を供出した見返り"
    : cityId === "nereia"
      ? "大洪水後の救済と河港再建を担った見返り"
      : "灰冠戦役で国境守備と軍資金を引き受けた見返り";
  return {
    id: `privilege-${cityId}-${domainId}`,
    name: `${cityNames[cityId] ?? cityId}${domain.name}特権`,
    holderEntityId: `${cityId}:${holderType}`,
    regionId: cityId,
    domain: domainId,
    originYear,
    originEventId: `prehistory-${cityId}-${originYear}`,
    originalReason: reason,
    grantedRights: [`${domain.name}の地方行使`, "地方属官の選任", "中央監査への異議申立"],
    obligations: ["有事の役務提供", "定額納付または治安維持"],
    legitimacy: cityId === "orta" ? 82 : 74,
    entrenchment: cityId === "nereia" ? 88 : 79,
    publicRecognition: cityId === "selene" ? 58 : 71,
    revocable: true,
    revocationCost: cityId === "orta" ? 78 : 64,
  };
}

function createPowerEntity(cityId, type) {
  const profiles = {
    farmers: [54, 31, 12, 38, 8, 68, 66, 42, 18],
    merchants: [73, 45, 9, 64, 12, 57, 61, 46, 35],
    landowners: [67, 72, 38, 76, 18, 63, 79, 34, 29],
    military: [42, 59, 76, 70, 8, 56, 69, 51, 44],
    temple: [55, 64, 14, 82, 91, 62, 86, 23, 27],
  };
  const [economicInterest, politicalAuthority, militaryPower, prestige, religiousImportance, localSupport, historicalLegitimacy, stateDependence, centralDependence] = profiles[type];
  return {
    id: `${cityId}:${type}`, regionId: cityId, type, name: `${cityId === "selene" ? "王都" : cityId === "nereia" ? "河港" : cityId === "orta" ? "東境" : cityId} ${ENTITY_LABELS[type]}`,
    economicInterest, politicalAuthority, militaryPower, prestige, religiousImportance,
    localSupport, historicalLegitimacy, stateDependence, centralDependence,
    internalized: false, bureaucraticAutonomy: 0,
  };
}

function createAuthorityRecords(world, cityId) {
  const ownedAtStart = world.provinces[cityId]?.owner === world.nation.id;
  const base = REGION_CONTROL_BASE[cityId] ?? (ownedAtStart ? { legal: 64, practical: 50 } : { legal: 28, practical: 14 });
  return Object.values(AUTHORITY_DOMAINS).flatMap((domain) => {
    const modifier = DOMAIN_CONTROL_MODIFIERS[domain.id] ?? 0;
    const centralLegal = clamp(base.legal + modifier, 8, 98);
    const centralPractical = clamp(base.practical + modifier * 0.72, 4, centralLegal);
    const holderEntityId = `${cityId}:${domain.holder}`;
    const origin = privilegeSeed(cityId, domain.id, domain.holder);
    return [
      {
        id: `authority-${cityId}-${domain.id}-central`, regionId: cityId, domain: domain.id,
        holderEntityId: "central_court", legalShare: centralLegal, practicalShare: centralPractical,
        legitimacy: 69, historicalEntrenchment: 48, localSupport: 55, enforcementCapacity: 62,
        originEventId: "prehistory-kingdom-foundation", acquiredYear: 0,
      },
      {
        id: `authority-${cityId}-${domain.id}-${domain.holder}`, regionId: cityId, domain: domain.id,
        holderEntityId, legalShare: 100 - centralLegal, practicalShare: 100 - centralPractical,
        legitimacy: origin.legitimacy, historicalEntrenchment: origin.entrenchment,
        localSupport: origin.publicRecognition, enforcementCapacity: domain.holder === "military" ? 76 : 52,
        originEventId: origin.originEventId, acquiredYear: origin.originYear,
      },
    ];
  });
}

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

function ensureRegionAuthorityState(world, state, cityId) {
  const system = state.administration;
  Object.values(["farmers", "merchants", "landowners", "military", "temple"]).forEach((type) => {
    const id = `${cityId}:${type}`;
    system.powerEntities[id] ??= createPowerEntity(cityId, type);
  });
  const existingDomains = new Set(system.authorities.filter((item) => item.regionId === cityId).map((item) => item.domain));
  createAuthorityRecords(world, cityId).forEach((authority) => {
    if (!existingDomains.has(authority.domain)) system.authorities.push(authority);
  });
  const privilegeDomains = new Set(system.privileges.filter((item) => item.regionId === cityId).map((item) => item.domain));
  const preferredPrivilegeDomains = cityId === "selene"
    ? ["justice", "appointments"]
    : cityId === "nereia"
      ? ["customs", "population_registry"]
      : cityId === "orta"
        ? ["conscription", "policing"]
        : ["tax_collection", "justice"];
  preferredPrivilegeDomains.forEach((domainId) => {
    if (!privilegeDomains.has(domainId)) {
      const domain = AUTHORITY_DOMAINS[domainId];
      system.privileges.push(privilegeSeed(cityId, domainId, domain.holder));
    }
  });
}

export function normalizeAdministrationState(world, state) {
  state.administration ??= {};
  Object.assign(state.administration, {
    system: state.administration.system ?? "distributed_authority",
    schemaVersion: 2,
    lastUpperReport: state.administration.lastUpperReport ?? null,
  });
  state.administration.authorities ??= [];
  state.administration.privileges ??= [];
  state.administration.powerEntities ??= {};
  state.administration.reforms ??= [];
  state.administration.grievances ??= [];
  state.administration.capabilityInvestment ??= {
    information: 0, administration: 0, fiscal: 0, enforcement: 0, infrastructure: 0, standardization: 0,
  };
  Object.keys(state.cities).forEach((cityId) => {
    state.cities[cityId].administration = getCityAdministrationConfig(world, state, cityId);
    ensureRegionAuthorityState(world, state, cityId);
  });
  return state;
}

function weightedCityAverage(world, state, selector) {
  const rows = Object.keys(state.cities).map((cityId) => ({
    population: state.cities[cityId].resources.population,
    value: selector(state.cities[cityId], cityId),
  }));
  return rows.reduce((sum, row) => sum + row.value * row.population, 0)
    / Math.max(1, rows.reduce((sum, row) => sum + row.population, 0));
}

export function deriveStateCapabilities(world, state) {
  normalizeAdministrationState(world, state);
  const cityIds = Object.keys(state.cities);
  const officeLevels = cityIds.reduce((sum, cityId) => sum + (state.cities[cityId].facilities?.office?.level ?? 0), 0);
  const roadLevels = cityIds.reduce((sum, cityId) => sum + (state.cities[cityId].facilities?.road?.level ?? 0), 0);
  const servingOfficers = Object.values(state.officers ?? {}).filter((officer) => officer.allegiance === "serving").length;
  const investment = state.administration.capabilityInvestment;
  const registerCoverage = weightedCityAverage(world, state, (_city, cityId) => getCityAdministrationConfig(world, state, cityId).registerCoverage);
  const administrativeEfficiency = weightedCityAverage(world, state, (city) => city.internal?.administrativeEfficiency ?? 45);
  const security = weightedCityAverage(world, state, (city) => city.resources?.security ?? 45);
  const training = weightedCityAverage(world, state, (city) => city.military?.training ?? 45);
  const commerce = weightedCityAverage(world, state, (city) => city.resources?.commerce ?? 40);
  const roadCondition = weightedCityAverage(world, state, (city) => city.facilities?.road?.condition ?? 65);
  const integration = weightedCityAverage(world, state, (_city, cityId) => getCityAdministrationConfig(world, state, cityId).integration);
  return {
    information: round(clamp(registerCoverage * 0.52 + (state.intelNetwork ?? 25) * 0.3 + officeLevels * 2.2 + investment.information, 5, 100), 1),
    administration: round(clamp(administrativeEfficiency * 0.72 + officeLevels * 3.4 + servingOfficers * 1.25 + investment.administration, 5, 100), 1),
    fiscal: round(clamp(registerCoverage * 0.42 + administrativeEfficiency * 0.27 + commerce * 0.2 + officeLevels * 1.8 + investment.fiscal, 5, 100), 1),
    enforcement: round(clamp(security * 0.42 + training * 0.34 + servingOfficers * 1.8 + investment.enforcement, 5, 100), 1),
    infrastructure: round(clamp(roadCondition * 0.42 + integration * 0.28 + roadLevels * 5.2 + investment.infrastructure, 5, 100), 1),
    standardization: round(clamp(integration * 0.42 + administrativeEfficiency * 0.24 + officeLevels * 2.8 + (state.issues?.standards?.status === "resolved" ? 18 : 0) + investment.standardization, 5, 100), 1),
  };
}

function authorityRecordsFor(state, cityId, domainId) {
  return state.administration.authorities.filter((item) => item.regionId === cityId && item.domain === domainId);
}

function centralAuthorityFor(state, cityId, domainId) {
  return authorityRecordsFor(state, cityId, domainId).find((item) => item.holderEntityId === "central_court");
}

function largestLocalAuthority(state, cityId, domainId) {
  return authorityRecordsFor(state, cityId, domainId)
    .filter((item) => item.holderEntityId !== "central_court")
    .sort((left, right) => right.practicalShare - left.practicalShare)[0] ?? null;
}

function activeReformLoad(state) {
  return state.administration.reforms
    .filter((reform) => reform.status === "active")
    .reduce((sum, reform) => sum + (reform.temporaryLoad ?? 0), 0);
}

function calculateAdministrativeWorkload(world, state) {
  let permanent = 0;
  Object.keys(state.cities).forEach((cityId) => {
    const city = state.cities[cityId];
    const populationUnits = city.resources.population / 1000;
    const modeMultiplier = getCityAdministrationConfig(world, state, cityId).mode === "direct" ? 1.12 : 0.94;
    Object.values(AUTHORITY_DOMAINS).forEach((domain) => {
      const central = centralAuthorityFor(state, cityId, domain.id);
      const practicalShare = central?.practicalShare ?? 0;
      permanent += populationUnits * domain.workload * (0.18 + practicalShare / 100 * 0.82) * modeMultiplier;
    });
  });
  return { permanent, temporary: activeReformLoad(state), total: permanent + activeReformLoad(state) };
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

function geometricBottleneck(values, weights = null) {
  const safe = values.map((value) => clamp(value, 1, 100) / 100);
  const appliedWeights = weights ?? safe.map(() => 1);
  const weightSum = appliedWeights.reduce((sum, value) => sum + value, 0);
  const geometric = Math.exp(safe.reduce((sum, value, index) => sum + Math.log(value) * appliedWeights[index], 0) / Math.max(1, weightSum)) * 100;
  const minimum = Math.min(...safe) * 100;
  return round(Math.min(geometric, minimum * 1.7), 1);
}

function groupCapability(capabilities, group) {
  if (group === "fiscal") return capabilities.fiscal;
  if (group === "military" || group === "justice") return capabilities.enforcement;
  if (group === "information") return capabilities.information;
  if (group === "infrastructure") return capabilities.infrastructure;
  if (group === "standardization") return capabilities.standardization;
  if (group === "legitimacy") return geometricBottleneck([capabilities.information, capabilities.administration]);
  return capabilities.administration;
}

function domainInstitutionPenetration(domainId, city, administration, capabilities) {
  const office = city.facilities?.office?.level ?? 0;
  const road = city.facilities?.road?.level ?? 0;
  const specialized = {
    population_registry: administration.registerCoverage,
    cadastre: administration.registerCoverage * 0.78 + office * 6,
    land_administration: administration.registerCoverage * 0.72 + office * 7,
    infrastructure: capabilities.infrastructure * 0.72 + road * 8,
    standards: capabilities.standardization,
    education: capabilities.standardization * 0.72 + administration.integration * 0.18,
    military_command: capabilities.enforcement * 0.78 + city.military.training * 0.18,
    conscription: capabilities.enforcement * 0.68 + administration.registerCoverage * 0.25,
    tax_rights: capabilities.fiscal * 0.82 + administration.registerCoverage * 0.12,
    tax_collection: capabilities.fiscal * 0.72 + administration.registerCoverage * 0.2,
  }[domainId];
  return clamp(specialized ?? (capabilities.administration * 0.7 + office * 6 + administration.integration * 0.14), 5, 100);
}

function entityLocalSupport(state, cityId, entityId) {
  const entity = state.administration.powerEntities[entityId];
  const cityFaction = state.cities[cityId]?.factions?.[entity?.type];
  return clamp(cityFaction?.support ?? entity?.localSupport ?? 50, 0, 100);
}

export function deriveRegionAuthority(world, state, cityId, shared = {}) {
  normalizeAdministrationState(world, state);
  const city = state.cities[cityId];
  if (!city) return null;
  const capabilities = shared.capabilities ?? deriveStateCapabilities(world, state);
  const capacity = shared.capacity ?? deriveAdministrationCapacity(world, state, capabilities);
  const administration = deriveCityAdministration(world, state, cityId);
  const grievances = state.administration.grievances.filter((item) => item.regionId === cityId && item.strength > 0);
  const grievancePressure = grievances.reduce((sum, item) => sum + item.strength, 0) / Math.max(1, grievances.length || 1);
  const roadLevel = city.facilities?.road?.level ?? 0;
  const roadCondition = city.facilities?.road?.condition ?? 70;
  const distance = world.provinces[cityId]?.administrativeDistance ?? (cityId === world.nation.capital ? 0 : 1);
  const connectivity = clamp(
    capabilities.infrastructure * 0.42 + administration.integration * 0.28 + roadCondition * 0.18 + roadLevel * 5 - distance * 7,
    4, 100,
  );
  const overloadFactor = clamp(112 - Math.max(0, capacity.utilization - 82) * 0.72, 24, 100);
  const domains = Object.values(AUTHORITY_DOMAINS).map((domain) => {
    const central = centralAuthorityFor(state, cityId, domain.id);
    const local = largestLocalAuthority(state, cityId, domain.id);
    const legalAuthority = central?.legalShare ?? 0;
    const information = clamp(capabilities.information * 0.52 + administration.registerCoverage * 0.48, 2, 100);
    const administrationFactor = clamp((capabilities.administration * 0.55 + city.internal.administrativeEfficiency * 0.45) * overloadFactor / 100, 2, 100);
    const enforcement = clamp(capabilities.enforcement * 0.48 + city.resources.security * 0.34 + city.military.training * 0.18, 2, 100);
    const localOpposition = local ? Math.max(0, entityLocalSupport(state, cityId, local.holderEntityId) - (central?.localSupport ?? 50)) * 0.18 : 0;
    const compliance = clamp(city.resources.support * 0.7 + city.resources.security * 0.2 + 12 - grievancePressure * 0.22 - localOpposition, 2, 100);
    const institution = domainInstitutionPenetration(domain.id, city, administration, capabilities);
    const factors = { legalAuthority, information, administration: administrationFactor, enforcement, compliance, connectivity, institution };
    const effectiveControl = geometricBottleneck(Object.values(factors));
    const totalWorkload = city.resources.population / 1000 * domain.workload;
    const localWorkload = totalWorkload * (1 - (central?.practicalShare ?? 0) / 100);
    const replacementCapacity = totalWorkload * groupCapability(capabilities, domain.group) / 100 * overloadFactor / 100;
    const replacementCoverage = round(clamp(replacementCapacity / Math.max(0.1, localWorkload) * 100, 0, 140), 0);
    const readiness = round(geometricBottleneck([information, institution, replacementCoverage, enforcement, connectivity]), 0);
    const privileges = state.administration.privileges.filter((item) => item.regionId === cityId && item.domain === domain.id);
    return {
      ...domain,
      legalShare: round(legalAuthority, 1),
      practicalShare: round(central?.practicalShare ?? 0, 1),
      effectiveControl,
      factors: Object.fromEntries(Object.entries(factors).map(([key, value]) => [key, round(value, 1)])),
      totalWorkload: round(totalWorkload, 1), localWorkload: round(localWorkload, 1),
      replacementCapacity: round(replacementCapacity, 1), replacementCoverage, reformReadiness: readiness,
      dominantLocalHolder: local ? {
        id: local.holderEntityId,
        name: state.administration.powerEntities[local.holderEntityId]?.name ?? local.holderEntityId,
        practicalShare: round(local.practicalShare, 1),
        localSupport: entityLocalSupport(state, cityId, local.holderEntityId),
      } : null,
      privileges,
      activeReform: state.administration.reforms.find((item) => item.regionId === cityId && item.domain === domain.id && item.status === "active") ?? null,
    };
  });
  const totalWeight = domains.reduce((sum, domain) => sum + domain.weight, 0);
  const overallControl = geometricBottleneck(domains.map((domain) => domain.effectiveControl), domains.map((domain) => domain.weight));
  const legalCentralization = round(domains.reduce((sum, domain) => sum + domain.legalShare * domain.weight, 0) / Math.max(1, totalWeight), 1);
  const practicalCentralization = round(domains.reduce((sum, domain) => sum + domain.practicalShare * domain.weight, 0) / Math.max(1, totalWeight), 1);
  const informationPrecision = round(clamp(capabilities.information * 0.48 + administration.registerCoverage * 0.52, 5, 100), 0);
  const uncertainty = clamp((100 - informationPrecision) / 100 * 0.55, 0, 0.52);
  const population = city.resources.population;
  const populationEstimate = informationPrecision >= 92
    ? { min: population, max: population, exact: true }
    : {
      min: Math.max(100, Math.round(population * (1 - uncertainty * 0.62) / 100) * 100),
      max: Math.round(population * (1 + uncertainty) / 100) * 100,
      exact: false,
    };
  const localPowerScores = Object.values(state.administration.powerEntities)
    .filter((entity) => entity.regionId === cityId)
    .map((entity) => {
      const practical = domains.filter((domain) => domain.dominantLocalHolder?.id === entity.id)
        .reduce((sum, domain) => sum + domain.dominantLocalHolder.practicalShare * domain.weight, 0);
      return { ...entity, score: round(practical * (0.5 + entityLocalSupport(state, cityId, entity.id) / 200), 0) };
    }).sort((left, right) => right.score - left.score);
  const administrativeLoad = round(domains.reduce((sum, domain) => (
    sum + domain.totalWorkload * (0.18 + domain.practicalShare / 100 * 0.82)
  ), 0), 0);
  const regionalCapacityShare = capacity.capacity * population / Math.max(1, Object.values(state.cities).reduce((sum, item) => sum + item.resources.population, 0));
  return {
    cityId, overallControl, legalCentralization, practicalCentralization,
    informationPrecision, populationKnowledge: round(administration.registerCoverage, 0), populationEstimate,
    connectivity: round(connectivity, 0), administrativeLoad,
    administrativeLoadRatio: round(administrativeLoad / Math.max(1, regionalCapacityShare) * 100, 0),
    communicationDays: Math.max(1, Math.round(1 + distance * 4 + (100 - connectivity) / 9)),
    grievancePressure: round(grievancePressure, 0), grievances,
    domains, largestLocalPower: localPowerScores[0] ?? null,
    loyalty: round(clamp(city.resources.support * 0.62 + administration.integration * 0.38 - grievancePressure * 0.18, 0, 100), 0),
    institutionalUniformity: round(geometricBottleneck([
      capabilities.standardization,
      domains.find((domain) => domain.id === "standards")?.effectiveControl ?? 0,
      domains.find((domain) => domain.id === "education")?.effectiveControl ?? 0,
    ]), 0),
  };
}

export function deriveAdministrationCapacity(world, state, sharedCapabilities = null) {
  normalizeAdministrationState(world, state);
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
  const capabilities = sharedCapabilities ?? deriveStateCapabilities(world, state);
  const workload = calculateAdministrativeWorkload(world, state);
  const capacity = capabilities.administration * 8 + officeLevels * 28 + servingOfficers * 9;
  const utilization = workload.total / Math.max(1, capacity) * 100;
  const loadOverextension = clamp((workload.total - capacity) / Math.max(1, capacity) * 100, 0, 300);
  const spanOverextension = clamp((burden - span) / Math.max(1, span) * 100, 0, 300);
  const overextension = Math.max(loadOverextension, spanOverextension);
  return {
    directCities, delegatedCities, officeLevels,
    burden: round(burden, 1), span: round(span, 1),
    capacity: round(capacity, 0), load: round(workload.total, 0),
    permanentLoad: round(workload.permanent, 0), temporaryLoad: round(workload.temporary, 0),
    utilization: round(utilization, 0), overload: round(Math.max(0, workload.total - capacity), 0),
    overextension: round(overextension, 0),
    overextensionPenalty: Math.min(5, Math.ceil(overextension / 35)),
  };
}

export function deriveAdministrationNetwork(world, state, cityMetrics = []) {
  normalizeAdministrationState(world, state);
  const byId = new Map(cityMetrics.map((city) => [city.cityId, city]));
  const cities = Object.keys(state.cities).map((cityId) => deriveCityAdministration(world, state, cityId, byId.get(cityId)));
  const capabilities = deriveStateCapabilities(world, state);
  const administrativeCapacity = deriveAdministrationCapacity(world, state, capabilities);
  const regions = Object.keys(state.cities).map((cityId) => deriveRegionAuthority(world, state, cityId, { capabilities, capacity: administrativeCapacity }));
  const population = Object.values(state.cities).reduce((sum, city) => sum + city.resources.population, 0);
  const weighted = (field, weight = "registeredPopulation") => cities.reduce((sum, city) => sum + city[field] * city[weight], 0)
    / Math.max(1, cities.reduce((sum, city) => sum + city[weight], 0));
  return {
    ...administrativeCapacity,
    cities,
    capabilities,
    authority: {
      regions,
      authorities: state.administration.authorities,
      privileges: state.administration.privileges,
      grievances: state.administration.grievances,
    },
    nominalPopulation: population,
    registeredPopulation: cities.reduce((sum, city) => sum + city.registeredPopulation, 0),
    registrationRate: round(cities.reduce((sum, city) => sum + city.registeredPopulation, 0) / Math.max(1, population) * 100, 1),
    deliverableFood: cities.reduce((sum, city) => sum + city.deliverableFood, 0),
    remittableMoney: round(cities.reduce((sum, city) => sum + city.remittableMoney, 0), 1),
    mobilizableTroops: cities.reduce((sum, city) => sum + city.mobilizableTroops, 0),
    averageReach: round(weighted("reach"), 0),
    averageControl: round(weighted("control"), 0),
    unintegratedCities: cities.filter((city) => city.integration < 75).length,
    centralization: deriveCentralizationResult(world, state, regions, capabilities, administrativeCapacity),
  };
}

function weightedDomainControl(regions, domainIds) {
  const entries = regions.flatMap((region) => region.domains.filter((domain) => domainIds.includes(domain.id)).map((domain) => ({
    value: domain.effectiveControl,
    weight: domain.weight,
  })));
  return entries.length ? geometricBottleneck(entries.map((item) => item.value), entries.map((item) => item.weight)) : 0;
}

export function deriveCentralizationResult(world, state, sharedRegions = null, sharedCapabilities = null, sharedCapacity = null) {
  normalizeAdministrationState(world, state);
  const capabilities = sharedCapabilities ?? deriveStateCapabilities(world, state);
  const capacity = sharedCapacity ?? deriveAdministrationCapacity(world, state, capabilities);
  const regions = sharedRegions ?? Object.keys(state.cities).map((cityId) => deriveRegionAuthority(world, state, cityId, { capabilities, capacity }));
  const populationFor = (region) => state.cities[region.cityId].resources.population;
  const weighted = (field) => regions.reduce((sum, region) => sum + region[field] * populationFor(region), 0)
    / Math.max(1, regions.reduce((sum, region) => sum + populationFor(region), 0));
  const effectiveControl = round(weighted("overallControl"), 1);
  const legalCentralization = round(weighted("legalCentralization"), 1);
  const practicalCentralization = round(weighted("practicalCentralization"), 1);
  const taxControl = weightedDomainControl(regions, ["tax_rights", "tax_collection", "customs"]);
  const militaryControl = weightedDomainControl(regions, ["military_command", "conscription"]);
  const justiceControl = weightedDomainControl(regions, ["justice", "policing"]);
  const knowledgeControl = weightedDomainControl(regions, ["land_administration", "cadastre", "population_registry"]);
  const appointmentControl = weightedDomainControl(regions, ["appointments", "executive"]);
  const uniformity = round(weighted("institutionalUniformity"), 1);
  const localSovereignty = round(regions.reduce((maximum, region) => Math.max(maximum, 100 - region.practicalCentralization), 0), 1);
  const internalAutonomy = round(Object.values(state.administration.powerEntities)
    .filter((entity) => entity.internalized)
    .reduce((maximum, entity) => Math.max(maximum, entity.bureaucraticAutonomy ?? 0), 0), 1);
  const administrativeStability = round(clamp(125 - capacity.utilization, 0, 100), 1);
  const resultIndex = round(geometricBottleneck([
    effectiveControl, legalCentralization, practicalCentralization,
    taxControl, militaryControl, justiceControl, knowledgeControl,
    appointmentControl, uniformity, administrativeStability,
  ]) * clamp(1 - internalAutonomy / 240, 0.55, 1), 1);
  const requirements = [
    { id: "final_authority", label: "全地域で中央が最終決定権を持つ", met: regions.every((region) => region.legalCentralization >= 95) },
    { id: "tax", label: "徴税を中央が実効支配", met: taxControl >= 90 },
    { id: "military", label: "軍事指揮権を中央が独占", met: militaryControl >= 92 },
    { id: "justice", label: "司法体系を中央へ統一", met: justiceControl >= 90 },
    { id: "knowledge", label: "土地・人口を中央が把握", met: knowledgeControl >= 88 },
    { id: "appointments", label: "行政官を中央が任免可能", met: appointmentControl >= 92 },
    { id: "uniformity", label: "通貨・度量衡・制度を統一", met: uniformity >= 90 },
    { id: "sovereignty", label: "地方に独立主権がない", met: localSovereignty <= 5 },
    { id: "internal", label: "中央内部機関が独立権力化していない", met: internalAutonomy <= 15 },
    { id: "capacity", label: "行政能力が行政負荷を安定して上回る", met: capacity.utilization <= 85 },
  ];
  return {
    resultIndex, effectiveControl, legalCentralization, practicalCentralization,
    taxControl, militaryControl, justiceControl, knowledgeControl, appointmentControl,
    uniformity, localSovereignty, internalAutonomy, administrativeStability,
    capabilities, capacity, requirements,
    complete: requirements.every((item) => item.met),
  };
}

export function getAuthorityReformOptions(world, state, cityId, domainId) {
  normalizeAdministrationState(world, state);
  const domain = AUTHORITY_DOMAINS[domainId];
  if (!domain || !state.cities[cityId]) return null;
  const region = deriveRegionAuthority(world, state, cityId);
  const report = region.domains.find((item) => item.id === domainId);
  const active = state.administration.reforms.find((item) => item.regionId === cityId && item.domain === domainId && item.status === "active") ?? null;
  const privilegeResistance = report.privileges.reduce((maximum, privilege) => Math.max(maximum, privilege.entrenchment), 0);
  return {
    cityId, domain: report, active,
    methods: Object.values(AUTHORITY_TRANSFER_METHODS).map((method) => ({
      ...method,
      affordable: state.cities[cityId].resources.money - method.cost >= getCityAdministrationConfig(world, state, cityId).reserveMoney,
      estimatedLegalGain: Math.min(report.dominantLocalHolder?.practicalShare ?? 0, method.legalTransfer),
      estimatedPracticalGain: round(Math.min(report.dominantLocalHolder?.practicalShare ?? 0, method.practicalTransfer * clamp(report.reformReadiness / 100, 0.35, 1)), 0),
      backlashRisk: round(clamp(method.backlash + privilegeResistance * 0.22 + Math.max(0, 65 - report.reformReadiness) * 0.65, 0, 100), 0),
    })),
    forced: {
      available: !active,
      cost: AUTHORITY_TRANSFER_METHODS.eliminate.cost + 3,
      affordable: state.cities[cityId].resources.money - (AUTHORITY_TRANSFER_METHODS.eliminate.cost + 3) >= getCityAdministrationConfig(world, state, cityId).reserveMoney,
      backlashRisk: round(clamp(58 + privilegeResistance * 0.28 + Math.max(0, 70 - report.reformReadiness), 0, 100), 0),
      warning: `可視化・標準化・制度構築を飛ばす。代替能力 ${report.replacementCoverage}% のため、法令と実務の乖離が拡大する。`,
    },
  };
}

function pushAdministrationLog(state, title, text, tone = "info") {
  state.log ??= [];
  state.log.unshift({
    id: `administration-${state.turn}-${state.log.length}`, date: `${state.year}年 ${state.month}月`,
    scope: "中央集権改革", title, text, tone,
  });
}

function applyAuthorityTransfer(state, reform) {
  if (reform.transferApplied) return;
  const method = AUTHORITY_TRANSFER_METHODS[reform.method];
  const central = centralAuthorityFor(state, reform.regionId, reform.domain);
  const local = largestLocalAuthority(state, reform.regionId, reform.domain);
  if (!central || !local) return;
  const readinessFactor = clamp(reform.readiness / 100, reform.forced ? 0.22 : 0.35, 1);
  const legalGain = Math.min(local.legalShare, method.legalTransfer * (reform.forced ? 1.3 : 1));
  const practicalGain = Math.min(local.practicalShare, method.practicalTransfer * readinessFactor * (reform.forced ? 0.62 : 1));
  central.legalShare = round(clamp(central.legalShare + legalGain, 0, 100), 1);
  local.legalShare = round(clamp(local.legalShare - legalGain, 0, 100), 1);
  central.practicalShare = round(clamp(central.practicalShare + practicalGain, 0, 100), 1);
  local.practicalShare = round(clamp(local.practicalShare - practicalGain, 0, 100), 1);
  reform.transferApplied = true;
  reform.transferResult = { legalGain: round(legalGain, 1), practicalGain: round(practicalGain, 1), formerHolderEntityId: local.holderEntityId };
  if (reform.method === "absorb") {
    const entity = state.administration.powerEntities[local.holderEntityId];
    if (entity) {
      entity.internalized = true;
      entity.centralDependence = clamp(entity.centralDependence + 24, 0, 100);
      entity.bureaucraticAutonomy = clamp((entity.bureaucraticAutonomy ?? 0) + 8 + practicalGain * 0.35, 0, 100);
    }
  }
  pushAdministrationLog(
    state,
    `${AUTHORITY_DOMAINS[reform.domain].name}を中央へ移管`,
    `法的権限 +${round(legalGain, 0)}、実務権限 +${round(practicalGain, 0)}。${legalGain - practicalGain >= 8 ? "法令が実務に先行している。" : "代替制度が実務を引き継いだ。"}`,
    legalGain - practicalGain >= 8 ? "danger" : "success",
  );
}

function applyReformBacklash(state, reform) {
  if (reform.backlashApplied) return;
  const method = AUTHORITY_TRANSFER_METHODS[reform.method];
  const privilege = state.administration.privileges.find((item) => item.regionId === reform.regionId && item.domain === reform.domain);
  const capacityGap = Math.max(0, 70 - reform.readiness);
  const strength = round(clamp(method.backlash + (privilege?.entrenchment ?? 45) * 0.22 + capacityGap * 0.6 + (reform.forced ? 34 : 0), 4, 100), 0);
  const formerHolderId = reform.transferResult?.formerHolderEntityId ?? largestLocalAuthority(state, reform.regionId, reform.domain)?.holderEntityId;
  const holder = state.administration.powerEntities[formerHolderId];
  const grievance = {
    id: `grievance-${reform.id}`, originEventId: reform.id, regionId: reform.regionId,
    targetEntityId: "central_court", affectedGroupId: formerHolderId,
    strength, decayRate: reform.method === "conciliate" ? 0.7 : 0.28,
    narrative: `${AUTHORITY_DOMAINS[reform.domain].name}を「${AUTHORITY_TRANSFER_METHODS[reform.method].name}」で中央へ移した記憶。`,
    createdYear: state.year, generation: 1,
  };
  state.administration.grievances.push(grievance);
  const city = state.cities[reform.regionId];
  city.resources.support = round(clamp(city.resources.support - strength * 0.035, 0, 100), 1);
  city.resources.security = round(clamp(city.resources.security - strength * 0.018, 0, 100), 1);
  if (holder && city.factions?.[holder.type]) {
    city.factions[holder.type].support = round(clamp(city.factions[holder.type].support - strength * 0.08, 0, 100), 1);
    city.factions[holder.type].radicalism = round(clamp(city.factions[holder.type].radicalism + strength * 0.1, 0, 100), 1);
  }
  reform.backlashApplied = true;
  pushAdministrationLog(state, `${worldRegionLabel(reform.regionId)}で改革反動`, `${grievance.narrative} 不満強度 ${strength}。`, strength >= 45 ? "danger" : "info");
}

function worldRegionLabel(cityId) {
  return cityId === "selene" ? "王都州" : cityId === "nereia" ? "ネレイア" : cityId === "orta" ? "東境州" : cityId;
}

export function startAuthorityReform(world, state, cityId, domainId, methodId, options = {}) {
  const next = structuredClone(state);
  normalizeAdministrationState(world, next);
  const optionReport = getAuthorityReformOptions(world, next, cityId, domainId);
  const method = AUTHORITY_TRANSFER_METHODS[methodId];
  if (!optionReport || !method) throw new Error("不明な権限改革です");
  if (optionReport.active) throw new Error("この権限では改革がすでに進行中です");
  if (!optionReport.domain.dominantLocalHolder || optionReport.domain.dominantLocalHolder.practicalShare <= 0) throw new Error("移管対象となる地方権限がありません");
  const forced = Boolean(options.forced);
  const cost = method.cost + (forced ? 3 : 0);
  const config = getCityAdministrationConfig(world, next, cityId);
  if (next.cities[cityId].resources.money - cost < config.reserveMoney) throw new Error("州庫留保を割るため改革を開始できません");
  next.cities[cityId].resources.money = round(next.cities[cityId].resources.money - cost, 1);
  const reform = {
    id: `reform-${next.turn}-${cityId}-${domainId}-${next.administration.reforms.length + 1}`,
    regionId: cityId, domain: domainId, method: methodId,
    stageIndex: forced ? 4 : 0, progress: 0, status: "active", forced,
    startedYear: next.year, startedMonth: next.month, readiness: optionReport.domain.reformReadiness,
    temporaryLoad: round(optionReport.domain.totalWorkload * (forced ? 1.35 : methodId === "eliminate" ? 0.85 : 0.62), 1),
    history: [{ stage: forced ? "transfer" : "visibility", year: next.year, month: next.month }],
  };
  next.administration.reforms.push(reform);
  if (forced) applyAuthorityTransfer(next, reform);
  pushAdministrationLog(
    next,
    `${worldRegionLabel(cityId)}で${AUTHORITY_DOMAINS[domainId].name}改革を開始`,
    forced ? "準備工程を飛ばして権限を移管した。行政断絶と歴史的反動の危険が高い。" : `${method.name}方式で可視化から開始した。`,
    forced ? "danger" : "info",
  );
  return next;
}

function completeReformStage(world, state, reform) {
  const stage = AUTHORITY_REFORM_STAGES[reform.stageIndex];
  if (!stage) return null;
  const investment = state.administration.capabilityInvestment;
  const cityAdministration = state.cities[reform.regionId].administration;
  if (stage.id === "visibility") {
    investment.information = round(investment.information + 0.7, 1);
    cityAdministration.registerCoverage = round(clamp(cityAdministration.registerCoverage + 1.2, 5, 100), 1);
  }
  if (stage.id === "standardization") investment.standardization = round(investment.standardization + 0.8, 1);
  if (stage.id === "institution") investment.administration = round(investment.administration + 0.9, 1);
  if (stage.id === "transfer") applyAuthorityTransfer(state, reform);
  if (stage.id === "backlash") applyReformBacklash(state, reform);
  if (stage.id === "consolidation") {
    reform.status = "completed";
    reform.completedYear = state.year;
    reform.completedMonth = state.month;
    reform.temporaryLoad = 0;
  } else {
    reform.stageIndex += 1;
    reform.progress = 0;
    reform.history.push({ stage: AUTHORITY_REFORM_STAGES[reform.stageIndex].id, year: state.year, month: state.month });
  }
  return {
    id: `${reform.id}-${stage.id}-${state.turn}`, kind: "authority_reform", cityId: reform.regionId,
    title: `${AUTHORITY_DOMAINS[reform.domain].name}改革：${stage.name}`,
    status: reform.status === "completed" ? "completed" : "progress",
    detail: stage.description, spendingCategory: "research_development", cost: { money: 0 }, governanceCost: 0,
  };
}

export function resolveAuthorityReforms(world, state) {
  normalizeAdministrationState(world, state);
  state.administration.grievances.forEach((grievance) => {
    grievance.strength = round(clamp(grievance.strength - grievance.decayRate / 12, 0, 100), 1);
    const age = state.year - grievance.createdYear;
    grievance.generation = Math.min(3, 1 + Math.floor(age / 24));
  });
  const actions = [];
  const capabilities = deriveStateCapabilities(world, state);
  state.administration.reforms.filter((reform) => reform.status === "active").forEach((reform) => {
    const method = AUTHORITY_TRANSFER_METHODS[reform.method];
    const relevantCapability = groupCapability(capabilities, AUTHORITY_DOMAINS[reform.domain].group);
    const gain = clamp((capabilities.administration * 0.16 + relevantCapability * 0.12 + 4) * method.speed, 6, 28);
    reform.progress = round(reform.progress + gain, 1);
    if (reform.progress >= 100) {
      const action = completeReformStage(world, state, reform);
      if (action) actions.push(action);
    }
  });
  return actions;
}

export function applyAdministrativeOverload(world, state) {
  normalizeAdministrationState(world, state);
  const capacity = deriveAdministrationCapacity(world, state);
  if (capacity.overload <= 0) return [];
  const severity = clamp(capacity.overload / Math.max(1, capacity.capacity), 0, 1.5);
  Object.values(state.cities).forEach((city) => {
    city.internal.corruption = round(clamp(city.internal.corruption + 0.35 + severity * 1.15, 0, 100), 1);
    city.internal.administrativeEfficiency = round(clamp(city.internal.administrativeEfficiency - 0.2 - severity * 0.7, 0, 100), 1);
    city.resources.support = round(clamp(city.resources.support - severity * 0.55, 0, 100), 1);
    city.resources.security = round(clamp(city.resources.security - severity * 0.35, 0, 100), 1);
  });
  return [{
    id: `administrative-overload-${state.turn}`, kind: "administrative_overload", cityId: world.nation.capital,
    title: "中央行政が処理能力を超過", status: "crisis",
    detail: `行政能力 ${capacity.capacity}に対し負荷 ${capacity.load}。汚職・遅延・地方官独断が拡大した。`,
    spendingCategory: "research_development", cost: { money: 0 }, governanceCost: 0,
  }];
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
