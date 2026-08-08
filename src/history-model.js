const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const round = (value, digits = 1) => Number((Number(value) || 0).toFixed(digits));

export const HISTORY_SCHEMA_VERSION = 1;

export const PRESSURE_DEFINITIONS = Object.freeze({
  rebellion: Object.freeze({
    id: "rebellion",
    name: "反乱圧力",
    stages: ["平穏", "不満", "抗税", "暴動", "反乱"],
    manifestation: "地方社会が公然と中央命令へ抵抗し始めた",
  }),
  subsistence: Object.freeze({
    id: "subsistence",
    name: "生存圧力",
    stages: ["安定", "値上がり", "配給不安", "飢餓騒擾", "人口流出"],
    manifestation: "食料と衛生の悪化が日常生活を崩し始めた",
  }),
  administration: Object.freeze({
    id: "administration",
    name: "統治断裂圧力",
    stages: ["統合", "遅延", "地方独断", "命令不履行", "統治断裂"],
    manifestation: "法令と地方実務の乖離が政治問題として顕在化した",
  }),
  fiscal_military: Object.freeze({
    id: "fiscal_military",
    name: "財政・軍事圧力",
    stages: ["余力", "負担", "遅配", "動員危機", "国家破綻"],
    manifestation: "財政不足が軍事・行政の履行能力を損ない始めた",
  }),
});

export const EVENT_PRESSURE_MAP = Object.freeze({
  crop_failure: "subsistence",
  flood: "subsistence",
  bandits: "administration",
  epidemic: "subsistence",
  refugees: "subsistence",
  corruption: "administration",
  merchant_exit: "fiscal_military",
  peasant_revolt: "rebellion",
});

const STAGE_THRESHOLDS = Object.freeze([0, 30, 50, 70, 85]);

function stageIndexFor(value) {
  let index = 0;
  STAGE_THRESHOLDS.forEach((threshold, candidate) => {
    if (value >= threshold) index = candidate;
  });
  return index;
}

function dateId(state) {
  return `${state.year}-${String(state.month).padStart(2, "0")}`;
}

function regionName(world, regionId) {
  return world.provinces?.[regionId]?.name ?? regionId;
}

function makeNode(id, kind, label, data = {}) {
  return { id, kind, label, ...data };
}

function seedEvents() {
  return [
    {
      id: "prehistory-kingdom-foundation", type: "state_formation", year: 0, month: null,
      title: "セレナ王国の建国盟約", summary: "銀脈河の交易都市と灰冠峠の守備諸家が、共同王権と評議会を成立させた。",
      actors: ["central_court", "river_cities", "frontier_houses"], locations: ["selene"],
      causedBy: ["condition-silver-river-trade", "condition-ash-pass-defense"],
      enabledBy: ["institution-regional-council"], opposedBy: [],
      effects: ["institution-selena-crown", "institution-provincial-council"],
      accounts: {
        worldTruth: "交易路の共同防衛と紛争仲裁の必要から王権が成立した。",
        historicalRecord: "諸州は王冠へ軍役と一定の納付を誓った。",
        publicBelief: "初代王が三州を一つの誓いで結んだ。",
      },
    },
    {
      id: "prehistory-selene-86", type: "privilege_grant", year: 86, month: null,
      title: "建国戦争後の王都奉仕特許", summary: "兵糧と官吏を供出した王都諸家へ、司法・任官実務の一部が保障された。",
      actors: ["central_court", "selene:landowners"], locations: ["selene"],
      causedBy: ["crisis-founding-war-supply"], enabledBy: ["institution-provincial-council"], opposedBy: [],
      effects: ["privilege-selene-justice", "privilege-selene-appointments"],
      accounts: {
        worldTruth: "戦後の行政能力不足を補うため、王都諸家へ実務を委託した。",
        historicalRecord: "忠勤への恒久的な褒賞として記録された。",
        publicBelief: "王都の裁判権は建国以来の不可侵な権利である。",
      },
    },
    {
      id: "prehistory-nereia-173", type: "privilege_grant", year: 173, month: null,
      title: "銀脈河大洪水後の河港再建協定", summary: "救済と河港再建を担った商会・神殿へ、関税と戸籍実務の一部が委ねられた。",
      actors: ["central_court", "nereia:merchants", "nereia:temple"], locations: ["nereia"],
      causedBy: ["disaster-silver-river-flood"], enabledBy: ["network-river-merchants"], opposedBy: [],
      effects: ["privilege-nereia-customs", "privilege-nereia-population_registry"],
      accounts: {
        worldTruth: "中央財政だけでは復旧できず、徴収権を担保として民間資本を調達した。",
        historicalRecord: "河港を救った諸団体へ管理権を認めた協定とされる。",
        publicBelief: "銀脈河を鎮めた神殿と船主には、河の富を守る権利がある。",
      },
    },
    {
      id: "prehistory-orta-218", type: "privilege_grant", year: 218, month: null,
      title: "灰冠戦役の東境軍役協定", summary: "国境守備を担った在地軍人団へ、徴兵・警察実務の自治が認められた。",
      actors: ["central_court", "orta:military"], locations: ["orta"],
      causedBy: ["war-ash-crown-campaign"], enabledBy: ["condition-frontier-distance"], opposedBy: [],
      effects: ["privilege-orta-conscription", "privilege-orta-policing"],
      accounts: {
        worldTruth: "王国軍の到着が遅く、在地軍人団なしには峠を保持できなかった。",
        historicalRecord: "有事の軍役と引き換えに二権限を委ねた。",
        publicBelief: "東境を血で守った家々だけが、東境の兵を動かせる。",
      },
    },
  ];
}

function seedGraph(events) {
  const nodes = new Map();
  const edges = [];
  const labels = {
    "condition-silver-river-trade": "銀脈河交易圏",
    "condition-ash-pass-defense": "灰冠峠の共同防衛需要",
    "institution-regional-council": "諸州評議の慣行",
    "crisis-founding-war-supply": "建国戦争の兵糧・官吏不足",
    "disaster-silver-river-flood": "銀脈河大洪水",
    "network-river-merchants": "河港商会の資本と船運網",
    "war-ash-crown-campaign": "灰冠戦役",
    "condition-frontier-distance": "王都から東境までの距離と通信遅延",
    "institution-selena-crown": "セレナ王権",
    "institution-provincial-council": "諸州評議会",
  };
  events.forEach((event) => {
    nodes.set(event.id, makeNode(event.id, "event", event.title, { year: event.year, regionId: event.locations[0] ?? null }));
    [
      [event.causedBy, "caused_by", "condition"],
      [event.enabledBy, "enabled_by", "condition"],
      [event.opposedBy, "opposed_by", "condition"],
    ].forEach(([ids, relation, kind]) => (ids ?? []).forEach((id) => {
      if (!nodes.has(id)) nodes.set(id, makeNode(id, kind, labels[id] ?? id));
      edges.push({ from: id, to: event.id, relation });
    }));
    event.effects.forEach((id) => {
      if (!nodes.has(id)) nodes.set(id, makeNode(id, id.startsWith("privilege-") ? "privilege" : "institution", labels[id] ?? id));
      edges.push({ from: event.id, to: id, relation: "resulted_in" });
    });
  });
  return { nodes: [...nodes.values()], edges };
}

function seedHistoryState() {
  const events = seedEvents();
  const graph = seedGraph(events);
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    sequence: events.length,
    events,
    graph,
    pressures: {},
    eventPressures: {},
    institutionalLegacies: [],
    lastAdvancedAt: null,
  };
}

function legacyEffect(domain) {
  const labels = {
    justice: "地方裁判慣行が司法統一の反動を強める",
    appointments: "旧家の官吏推薦権が中央任官を制約する",
    customs: "河港商会の関税実務が中央徴収を制約する",
    population_registry: "神殿台帳なしには人口を把握できない",
    conscription: "在地軍人団を介さなければ兵を集めにくい",
    policing: "国境治安が在地軍人団の協力に依存する",
  };
  return labels[domain] ?? "歴史的権利が中央の実効支配を制約する";
}

function syncInstitutionalLegacies(state) {
  const history = state.history;
  const known = new Map(history.institutionalLegacies.map((legacy) => [legacy.id, legacy]));
  (state.administration?.privileges ?? []).forEach((privilege) => {
    const id = `legacy-${privilege.id}`;
    const existing = known.get(id);
    const next = {
      id,
      name: privilege.name,
      regionId: privilege.regionId,
      domain: privilege.domain,
      holderEntityId: privilege.holderEntityId,
      originEventId: privilege.originEventId,
      originYear: privilege.originYear,
      persistence: round((privilege.entrenchment + privilege.legitimacy) / 2),
      status: privilege.revocable === false ? "protected" : "active",
      currentEffect: legacyEffect(privilege.domain),
    };
    if (existing) Object.assign(existing, next);
    else history.institutionalLegacies.push(next);
    const graphNode = history.graph.nodes.find((node) => node.id === id);
    const nodeData = makeNode(id, "legacy", next.name, { regionId: next.regionId, originEventId: next.originEventId });
    if (graphNode) Object.assign(graphNode, nodeData);
    else history.graph.nodes.push(nodeData);
    const privilegeNode = history.graph.nodes.find((node) => node.id === privilege.id);
    const privilegeNodeData = makeNode(privilege.id, "privilege", privilege.name, { regionId: privilege.regionId, originEventId: privilege.originEventId });
    if (privilegeNode) Object.assign(privilegeNode, privilegeNodeData);
    else history.graph.nodes.push(privilegeNodeData);
    addEdge(history, privilege.originEventId, privilege.id, "resulted_in");
    addEdge(history, privilege.id, id, "inherited_from");
  });
}

export function normalizeHistoryState(world, state) {
  if (!state.history || typeof state.history !== "object") state.history = seedHistoryState();
  const seeded = seedHistoryState();
  state.history.schemaVersion = HISTORY_SCHEMA_VERSION;
  state.history.sequence = Number.isFinite(state.history.sequence) ? state.history.sequence : 0;
  state.history.events ??= [];
  state.history.graph ??= { nodes: [], edges: [] };
  state.history.graph.nodes ??= [];
  state.history.graph.edges ??= [];
  state.history.pressures ??= {};
  state.history.eventPressures ??= {};
  state.history.institutionalLegacies ??= [];
  const eventIds = new Set(state.history.events.map((event) => event.id));
  seeded.events.forEach((event) => { if (!eventIds.has(event.id)) state.history.events.push(event); });
  const nodeIds = new Set(state.history.graph.nodes.map((node) => node.id));
  seeded.graph.nodes.forEach((node) => { if (!nodeIds.has(node.id)) state.history.graph.nodes.push(node); });
  const edgeIds = new Set(state.history.graph.edges.map((edge) => `${edge.from}|${edge.to}|${edge.relation}`));
  seeded.graph.edges.forEach((edge) => {
    const id = `${edge.from}|${edge.to}|${edge.relation}`;
    if (!edgeIds.has(id)) state.history.graph.edges.push(edge);
  });
  Object.keys(state.cities ?? {}).forEach((regionId) => {
    state.history.pressures[regionId] ??= {};
    Object.keys(PRESSURE_DEFINITIONS).forEach((pressureId) => {
      state.history.pressures[regionId][pressureId] ??= {
        id: `${regionId}:${pressureId}`,
        regionId,
        pressureId,
        value: 0,
        stageIndex: 0,
        stage: PRESSURE_DEFINITIONS[pressureId].stages[0],
        trend: 0,
        drivers: [],
        updatedAt: null,
      };
    });
  });
  syncInstitutionalLegacies(state);
  const needsPressureSnapshot = state.history.lastAdvancedAt === null
    && Object.values(state.history.pressures).flatMap((region) => Object.values(region)).every((pressure) => pressure.updatedAt === null);
  if (needsPressureSnapshot) {
    Object.keys(state.cities ?? {}).forEach((regionId) => {
      const driverGroups = pressureDrivers(state, regionId);
      Object.entries(driverGroups).forEach(([pressureId, rows]) => {
        const pressure = state.history.pressures[regionId][pressureId];
        const calculated = calculatePressure(rows);
        const stageIndex = stageIndexFor(calculated.value);
        Object.assign(pressure, {
          value: calculated.value,
          stageIndex,
          stage: PRESSURE_DEFINITIONS[pressureId].stages[stageIndex],
          trend: 0,
          drivers: calculated.drivers,
          updatedAt: dateId(state),
        });
      });
    });
    state.history.lastAdvancedAt = `snapshot-${dateId(state)}`;
  }
  return state;
}

function centralShares(state, regionId) {
  const records = (state.administration?.authorities ?? []).filter((authority) => authority.regionId === regionId && authority.holderEntityId === "central_court");
  const average = (field) => records.reduce((sum, record) => sum + (record[field] ?? 0), 0) / Math.max(1, records.length);
  return { legal: average("legalShare"), practical: average("practicalShare") };
}

function pressureDrivers(state, regionId) {
  const city = state.cities[regionId];
  const shares = centralShares(state, regionId);
  const grievances = (state.administration?.grievances ?? []).filter((grievance) => grievance.regionId === regionId);
  const grievance = grievances.reduce((maximum, item) => Math.max(maximum, item.strength ?? 0), 0);
  const radicals = Object.values(city.factions ?? {}).map((faction) => faction.radicalism ?? 0);
  const radicalism = radicals.reduce((sum, value) => sum + value, 0) / Math.max(1, radicals.length);
  const factionSupport = Object.values(city.factions ?? {}).map((faction) => faction.support ?? 50);
  const eliteDiscontent = 100 - Math.min(...factionSupport);
  const taxBurden = city.policies?.landTax === "high" || city.policies?.commerceTax === "high"
    ? 78 : city.policies?.landTax === "low" && city.policies?.commerceTax === "low" ? 15 : 38;
  const foodPerCapita = city.resources.food / Math.max(1, city.resources.population);
  const foodShortage = clamp((0.24 - foodPerCapita) * 360);
  const crowding = clamp((city.resources.population / Math.max(1, city.internal.housingCapacity) - 0.92) * 160);
  const sanitationRisk = clamp(65 - city.internal.sanitation);
  const authorityGap = clamp(shares.legal - shares.practical);
  const localAutonomy = clamp(100 - shares.practical);
  const distance = regionId === "selene" ? 8 : regionId === "nereia" ? 34 : 48;
  const treasuryRisk = clamp(Math.max(0, -city.resources.money) * 4 + Math.max(0, 14 - city.resources.money) * 2);
  const debtRisk = clamp((state.fiscal?.publicDebt ?? 0) * 1.4);
  const warRisk = clamp((state.warExhaustion ?? 0) * 1.25 + (state.war ? 22 : 0));
  const administrationRisk = clamp(100 - city.internal.administrativeEfficiency);
  return {
    rebellion: [
      ["税負担", taxBurden, 0.18], ["派閥不満", eliteDiscontent, 0.2], ["急進化", radicalism, 0.2],
      ["食料不足", foodShortage, 0.15], ["歴史的不満", grievance, 0.19],
      ["正統性", 100 - (state.legitimacy ?? 50), 0.08], ["治安抑止", 100 - city.resources.security, 0.12],
    ],
    subsistence: [
      ["食料不足", foodShortage, 0.48], ["過密", crowding, 0.2], ["衛生悪化", sanitationRisk, 0.2],
      ["戦争負担", warRisk, 0.12],
    ],
    administration: [
      ["法令・実務乖離", authorityGap * 2.1, 0.25], ["地方権限", localAutonomy, 0.22],
      ["行政能力不足", administrationRisk, 0.2], ["歴史的不満", grievance, 0.18], ["通信距離", distance, 0.15],
    ],
    fiscal_military: [
      ["州庫不足", treasuryRisk, 0.26], ["公債負担", debtRisk, 0.18], ["戦費・疲弊", warRisk, 0.3],
      ["行政非効率", administrationRisk, 0.14], ["腐敗", city.internal.corruption, 0.12],
    ],
  };
}

function calculatePressure(driverRows) {
  const normalized = driverRows.map(([label, value, weight]) => ({ label, value: round(clamp(value)), weight }));
  const positive = normalized.reduce((sum, driver) => sum + driver.value * driver.weight, 0);
  const interaction = normalized
    .filter((driver) => driver.value >= 45)
    .slice(0, 3)
    .reduce((bonus, driver) => bonus + (driver.value - 45) * 0.08, 0);
  return { value: round(clamp(positive + interaction)), drivers: normalized.sort((left, right) => right.value * right.weight - left.value * left.weight) };
}

function upsertNode(history, node) {
  const existing = history.graph.nodes.find((candidate) => candidate.id === node.id);
  if (existing) Object.assign(existing, node);
  else history.graph.nodes.push(node);
}

function addEdge(history, from, to, relation) {
  if (!history.graph.edges.some((edge) => edge.from === from && edge.to === to && edge.relation === relation)) {
    history.graph.edges.push({ from, to, relation });
  }
}

export function recordHistoricalEvent(world, state, input) {
  normalizeHistoryState(world, state);
  const history = state.history;
  const id = input.id ?? `history-${dateId(state)}-${++history.sequence}`;
  const existing = history.events.find((event) => event.id === id);
  if (existing) return existing;
  const causedBy = [...new Set(input.causedBy ?? [])];
  const effects = [...new Set(input.effects ?? [])];
  const created = [...new Set(input.created ?? [])];
  const destroyed = [...new Set(input.destroyed ?? [])];
  const inheritedFrom = [...new Set(input.inheritedFrom ?? [])];
  if (!causedBy.length || effects.length + created.length + destroyed.length === 0) throw new Error("歴史イベントには最低1つの原因と結果が必要です");
  const event = {
    id,
    type: input.type ?? "state_change",
    year: input.year ?? state.year,
    month: input.month ?? state.month,
    title: input.title,
    summary: input.summary ?? "",
    actors: [...new Set(input.actors ?? [world.nation.id])],
    locations: [...new Set(input.locations ?? [])],
    causedBy,
    enabledBy: [...new Set(input.enabledBy ?? [])],
    opposedBy: [...new Set(input.opposedBy ?? [])],
    effects,
    created,
    destroyed,
    inheritedFrom,
    accounts: input.accounts ?? null,
  };
  history.events.push(event);
  upsertNode(history, makeNode(id, "event", event.title, { year: event.year, month: event.month, regionId: event.locations[0] ?? null }));
  [
    [event.causedBy, "caused_by"], [event.enabledBy, "enabled_by"], [event.opposedBy, "opposed_by"], [event.inheritedFrom, "inherited_from"],
  ].forEach(([nodeIds, relation]) => nodeIds.forEach((nodeId) => {
    if (!history.graph.nodes.some((node) => node.id === nodeId)) upsertNode(history, makeNode(nodeId, "condition", nodeId));
    addEdge(history, nodeId, id, relation);
  }));
  event.effects.forEach((nodeId) => {
    if (!history.graph.nodes.some((node) => node.id === nodeId)) upsertNode(history, makeNode(nodeId, "effect", nodeId));
    addEdge(history, id, nodeId, "resulted_in");
  });
  event.created.forEach((nodeId) => {
    if (!history.graph.nodes.some((node) => node.id === nodeId)) upsertNode(history, makeNode(nodeId, "entity", nodeId));
    addEdge(history, id, nodeId, "created");
  });
  event.destroyed.forEach((nodeId) => {
    if (!history.graph.nodes.some((node) => node.id === nodeId)) upsertNode(history, makeNode(nodeId, "entity", nodeId));
    addEdge(history, id, nodeId, "destroyed");
  });
  return event;
}

function recordPressureManifestation(world, state, pressure, previousStageIndex) {
  const definition = PRESSURE_DEFINITIONS[pressure.pressureId];
  const date = dateId(state);
  const causeIds = pressure.drivers.slice(0, 3).map((driver) => {
    const id = `fact-${date}-${pressure.regionId}-${pressure.pressureId}-${driver.label}`;
    upsertNode(state.history, makeNode(id, "fact", `${driver.label} ${Math.round(driver.value)}`, {
      value: driver.value, regionId: pressure.regionId, year: state.year, month: state.month,
    }));
    return id;
  });
  const effectId = `pressure-stage-${pressure.regionId}-${pressure.pressureId}-${pressure.stageIndex}`;
  upsertNode(state.history, makeNode(effectId, "condition", `${regionName(world, pressure.regionId)}：${pressure.stage}`, {
    value: pressure.value, regionId: pressure.regionId,
  }));
  const event = recordHistoricalEvent(world, state, {
    id: `manifestation-${date}-${pressure.regionId}-${pressure.pressureId}-${pressure.stageIndex}`,
    type: "pressure_manifestation",
    title: `${regionName(world, pressure.regionId)}で「${pressure.stage}」へ進行`,
    summary: `${definition.manifestation}。圧力 ${Math.round(pressure.value)}。`,
    actors: [world.nation.id, `${pressure.regionId}:local_society`],
    locations: [pressure.regionId],
    causedBy: causeIds,
    enabledBy: previousStageIndex > 0 ? [`pressure-stage-${pressure.regionId}-${pressure.pressureId}-${previousStageIndex}`] : [],
    effects: [effectId],
  });
  if (pressure.stageIndex >= 3 && pressure.pressureId === "rebellion") {
    const legacyId = `legacy-${event.id}`;
    if (!state.history.institutionalLegacies.some((legacy) => legacy.id === legacyId)) {
      state.history.institutionalLegacies.push({
        id: legacyId,
        name: `${regionName(world, pressure.regionId)}の抵抗記憶`,
        regionId: pressure.regionId,
        domain: "local_control",
        holderEntityId: `${pressure.regionId}:local_society`,
        originEventId: event.id,
        originYear: state.year,
        persistence: round(pressure.value),
        status: "active",
        currentEffect: "弾圧・徴税改革に対する反動を強める",
      });
    }
  }
  return event;
}

function recordActionHistory(world, state, actions) {
  return actions.flatMap((action) => {
    if (action.kind === "authority_reform" && action.status === "completed") {
      const reform = (state.administration?.reforms ?? []).find((candidate) => action.id.startsWith(candidate.id));
      const causedBy = reform ? [`history-${reform.id}-started`, ...(state.history.institutionalLegacies.filter((legacy) => legacy.regionId === reform.regionId && legacy.domain === reform.domain).map((legacy) => legacy.id))] : [action.id];
      causedBy.forEach((id) => upsertNode(state.history, makeNode(id, id.startsWith("legacy-") ? "legacy" : "policy", id)));
      return [recordHistoricalEvent(world, state, {
        id: `history-${action.id}`,
        type: "institutional_reform",
        title: action.title,
        summary: action.detail,
        actors: [world.nation.id, "central_court"],
        locations: [action.cityId],
        causedBy,
        effects: [`institutional-control-${action.cityId}-${reform?.domain ?? "unknown"}-${state.year}-${state.month}`],
      })];
    }
    if (action.kind === "administrative_overload") {
      return [recordHistoricalEvent(world, state, {
        id: `history-${action.id}`,
        type: "administrative_crisis",
        title: action.title,
        summary: action.detail,
        locations: Object.keys(state.cities),
        causedBy: ["condition-administrative-overload"],
        effects: [`condition-bureaucratic-delay-${dateId(state)}`],
      })];
    }
    return [];
  });
}

export function advanceHistoricalSimulation(world, state, context = {}) {
  normalizeHistoryState(world, state);
  const createdEvents = [];
  Object.keys(state.cities).forEach((regionId) => {
    const driverGroups = pressureDrivers(state, regionId);
    Object.entries(driverGroups).forEach(([pressureId, rows]) => {
      const current = state.history.pressures[regionId][pressureId];
      const previousValue = current.value;
      const previousStageIndex = current.stageIndex;
      const calculated = calculatePressure(rows);
      const value = round(previousValue * 0.35 + calculated.value * 0.65);
      const stageIndex = stageIndexFor(value);
      Object.assign(current, {
        value,
        trend: round(value - previousValue),
        stageIndex,
        stage: PRESSURE_DEFINITIONS[pressureId].stages[stageIndex],
        drivers: calculated.drivers,
        updatedAt: dateId(state),
      });
      if (stageIndex > previousStageIndex && stageIndex >= 2) {
        createdEvents.push(recordPressureManifestation(world, state, current, previousStageIndex));
      }
    });
  });
  createdEvents.push(...recordActionHistory(world, state, context.actions ?? []));
  state.history.lastAdvancedAt = dateId(state);
  syncInstitutionalLegacies(state);
  return createdEvents;
}

export function registerEventPressure(world, state, eventId, regionId, value) {
  normalizeHistoryState(world, state);
  const pressureId = EVENT_PRESSURE_MAP[eventId] ?? "administration";
  const key = `${eventId}:${regionId}`;
  const previous = state.history.eventPressures[key];
  const normalized = round(clamp(value));
  state.history.eventPressures[key] = {
    id: key,
    eventId,
    regionId,
    pressureId,
    value: normalized,
    trend: round(normalized - (previous?.value ?? normalized)),
    eligible: normalized >= 25 || state.cities[regionId]?.issues?.some((issue) => issue.id === eventId) === true,
    updatedAt: dateId(state),
  };
  return state.history.eventPressures[key];
}

function effectLabels(effect = {}) {
  const labels = [];
  Object.entries(effect.resources ?? {}).forEach(([key, value]) => labels.push(`resource-${key}-${value >= 0 ? "gain" : "loss"}`));
  Object.entries(effect.internal ?? {}).forEach(([key, value]) => labels.push(`internal-${key}-${value >= 0 ? "gain" : "loss"}`));
  Object.entries(effect.factions ?? {}).forEach(([factionId, values]) => Object.entries(values).forEach(([key, value]) => labels.push(`faction-${factionId}-${key}-${value >= 0 ? "gain" : "loss"}`)));
  if (effect.activeEffect) labels.push(`temporary-policy-${effect.activeEffect.name}`);
  return labels.length ? labels : ["decision-recorded"];
}

export function recordResolvedWorldEvent(world, state, input) {
  normalizeHistoryState(world, state);
  const pressure = state.history.eventPressures[`${input.eventId}:${input.regionId}`];
  const pressureNodeId = `pressure-${input.eventId}-${input.regionId}-${dateId(state)}`;
  upsertNode(state.history, makeNode(pressureNodeId, "pressure", `${input.title}圧力 ${Math.round(pressure?.value ?? 0)}`, {
    value: pressure?.value ?? 0, regionId: input.regionId,
  }));
  const legacyCauses = state.history.institutionalLegacies
    .filter((legacy) => legacy.regionId === input.regionId && legacy.status === "active")
    .slice(0, 2)
    .map((legacy) => legacy.id);
  legacyCauses.forEach((id) => {
    const legacy = state.history.institutionalLegacies.find((candidate) => candidate.id === id);
    upsertNode(state.history, makeNode(id, "legacy", legacy?.name ?? id, { regionId: input.regionId }));
  });
  return recordHistoricalEvent(world, state, {
    id: `history-${input.pendingEventId}`,
    type: "resolved_crisis",
    title: `${regionName(world, input.regionId)}：${input.title}`,
    summary: `${input.choiceName}。${input.detail ?? ""}`,
    actors: [world.nation.id, `${input.regionId}:local_society`],
    locations: [input.regionId],
    causedBy: [pressureNodeId, ...legacyCauses],
    effects: effectLabels(input.effect).map((label) => `${label}-${dateId(state)}-${input.regionId}`),
    accounts: {
      worldTruth: `${input.title}は蓄積圧力 ${Math.round(pressure?.value ?? 0)} が顕在化した事件である。`,
      historicalRecord: `王国記録は「${input.choiceName}」を公式対応として記す。`,
      publicBelief: input.publicBelief ?? `現地では対応の負担と恩恵がそれぞれ異なる記憶として残った。`,
    },
  });
}

export function traceHistoricalCauses(state, eventId, maximumDepth = 5) {
  const history = state.history;
  if (!history) return [];
  const nodes = new Map(history.graph.nodes.map((node) => [node.id, node]));
  const result = [];
  const visited = new Set();
  const walk = (targetId, depth) => {
    if (depth > maximumDepth) return;
    history.graph.edges
      .filter((edge) => edge.to === targetId && ["caused_by", "enabled_by"].includes(edge.relation))
      .forEach((edge) => {
        const key = `${edge.from}|${edge.to}|${edge.relation}`;
        if (visited.has(key)) return;
        visited.add(key);
        result.push({ depth, relation: edge.relation, from: nodes.get(edge.from) ?? { id: edge.from, label: edge.from }, to: nodes.get(edge.to) ?? { id: edge.to, label: edge.to } });
        walk(edge.from, depth + 1);
      });
  };
  walk(eventId, 0);
  return result;
}

export function compileHistoricalEras(state, regionId = null) {
  const events = (state.history?.events ?? [])
    .filter((event) => !regionId || event.locations.includes(regionId))
    .sort((left, right) => left.year - right.year || (left.month ?? 0) - (right.month ?? 0));
  const eras = [];
  events.forEach((event) => {
    const previous = eras.at(-1);
    const startsNewEra = !previous || event.year - previous.endYear > 45 || event.type === "state_formation";
    if (startsNewEra) {
      eras.push({
        id: `era-${event.id}`,
        startYear: event.year,
        endYear: event.year,
        title: event.type === "state_formation" ? "建国と盟約の時代" : event.year >= 300 ? "現在王国期" : "制度形成期",
        events: [event],
      });
    } else {
      previous.events.push(event);
      previous.endYear = event.year;
      if (event.type === "privilege_grant") previous.title = "地方特権の形成期";
      if (event.type === "institutional_reform") previous.title = "中央改革期";
      if (["pressure_manifestation", "resolved_crisis"].includes(event.type)) previous.title = "動揺と対応の時代";
    }
  });
  return eras.map((era) => ({
    ...era,
    summary: era.events.slice(0, 4).map((event) => event.title),
  }));
}

export function getHistoricalOverview(world, state, regionId = null) {
  normalizeHistoryState(world, state);
  const pressures = regionId
    ? Object.values(state.history.pressures[regionId] ?? {})
    : Object.values(state.history.pressures).flatMap((region) => Object.values(region));
  const events = state.history.events
    .filter((event) => !regionId || event.locations.includes(regionId))
    .sort((left, right) => right.year - left.year || (right.month ?? 0) - (left.month ?? 0));
  const institutionalLegacies = state.history.institutionalLegacies
    .filter((legacy) => !regionId || legacy.regionId === regionId)
    .sort((left, right) => right.persistence - left.persistence);
  return {
    pressures: pressures.sort((left, right) => right.value - left.value),
    events,
    institutionalLegacies,
    eras: compileHistoricalEras(state, regionId),
    accounts: events.filter((event) => event.accounts).slice(0, 6),
    latestTrace: events[0] ? traceHistoricalCauses(state, events[0].id) : [],
  };
}
