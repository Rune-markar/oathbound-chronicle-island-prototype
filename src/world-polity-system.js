export const WORLD_POLITY_MODEL_VERSION = 1;

export const WORLD_POLITY_MODEL_REFERENCES = Object.freeze([
  Object.freeze({
    id: "fantasy-glossary-polities-cities",
    title: "ファンタジー初心者用語解説 46. 国家体制と都市",
    url: "https://ncode.syosetu.com/n5709da/46/",
    usage: "国家形態、政治制度、首都呼称、都市機能を別軸で扱う分類の参考",
  }),
]);

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function definePoliticalSystem(id, name, authority, representation, administration) {
  return Object.freeze({ id, name, authority, representation, administration });
}

export const POLITICAL_SYSTEMS = Object.freeze({
  absolute_monarchy: definePoliticalSystem("absolute_monarchy", "絶対君主制", "世襲君主", "君主の勅令", "直轄官僚制"),
  feudal_monarchy: definePoliticalSystem("feudal_monarchy", "封建君主制", "世襲君主", "諸侯評議", "領主分権"),
  elective_monarchy: definePoliticalSystem("elective_monarchy", "選挙君主制", "選出君主", "王庭評議", "諸領連合"),
  representative_republic: definePoliticalSystem("representative_republic", "代議共和制", "選出執政", "市民・地域代表議会", "文官行政"),
  oligarchic_republic: definePoliticalSystem("oligarchic_republic", "寡頭共和制", "有力者評議会", "工房・商会代表", "評議会行政"),
  federal_council: definePoliticalSystem("federal_council", "連邦評議制", "連邦議長", "構成地域評議会", "州・都市自治"),
  clan_confederation: definePoliticalSystem("clan_confederation", "氏族連合制", "大族長", "氏族長会議", "氏族自治"),
  clerical_theocracy: definePoliticalSystem("clerical_theocracy", "神権制", "宗教指導者", "聖職者会議", "神殿行政"),
  autocratic_chiefdom: definePoliticalSystem("autocratic_chiefdom", "首長独裁制", "大首長", "側近会議", "軍事・氏族行政"),
  military_junta: definePoliticalSystem("military_junta", "軍政", "最高司令官", "将官会議", "軍管区行政"),
  magocratic_council: definePoliticalSystem("magocratic_council", "魔導寡頭制", "首席魔導師", "魔導評議会", "学院・塔行政"),
});

function definePolityForm({
  id,
  name,
  nationSuffix,
  capitalTitle,
  rulerTitle,
  seatLabel,
  politicalSystemId,
  officeTitles,
  modifiers,
}) {
  return Object.freeze({
    id,
    name,
    nationSuffix,
    capitalTitle,
    rulerTitle,
    seatLabel,
    politicalSystemId,
    officeTitles: Object.freeze({ ...officeTitles }),
    modifiers: Object.freeze({ ...modifiers }),
  });
}

export const POLITY_FORMS = Object.freeze({
  kingdom: definePolityForm({
    id: "kingdom", name: "王国", nationSuffix: "王国", capitalTitle: "王都", rulerTitle: "国王", seatLabel: "王城",
    politicalSystemId: "feudal_monarchy",
    officeTitles: { capital: "王都総督", interior: "地方伯", frontier: "辺境伯" },
    modifiers: { stateCapacity: 2, commerce: 0, cohesion: 3, mobilization: 2, localAutonomy: 2 },
  }),
  empire: definePolityForm({
    id: "empire", name: "帝国", nationSuffix: "帝国", capitalTitle: "帝都", rulerTitle: "皇帝", seatLabel: "帝城",
    politicalSystemId: "absolute_monarchy",
    officeTitles: { capital: "帝都総督", interior: "州総督", frontier: "辺境総督" },
    modifiers: { stateCapacity: 7, commerce: 1, cohesion: 1, mobilization: 6, localAutonomy: -5 },
  }),
  principality: definePolityForm({
    id: "principality", name: "公国", nationSuffix: "公国", capitalTitle: "公都", rulerTitle: "公王", seatLabel: "公城",
    politicalSystemId: "feudal_monarchy",
    officeTitles: { capital: "公都代官", interior: "地方領主", frontier: "辺境伯" },
    modifiers: { stateCapacity: 1, commerce: 0, cohesion: 2, mobilization: 3, localAutonomy: 3 },
  }),
  republic: definePolityForm({
    id: "republic", name: "共和国", nationSuffix: "共和国", capitalTitle: "首都", rulerTitle: "執政官", seatLabel: "中央政庁",
    politicalSystemId: "representative_republic",
    officeTitles: { capital: "首都長官", interior: "地方執政官", frontier: "国境監督官" },
    modifiers: { stateCapacity: 4, commerce: 6, cohesion: 1, mobilization: -1, localAutonomy: 4 },
  }),
  city_league: definePolityForm({
    id: "city_league", name: "都市国家連合", nationSuffix: "都市同盟", capitalTitle: "盟主都", rulerTitle: "盟主", seatLabel: "同盟議事堂",
    politicalSystemId: "oligarchic_republic",
    officeTitles: { capital: "盟主都市長", interior: "市参事", frontier: "関門監督官" },
    modifiers: { stateCapacity: 2, commerce: 9, cohesion: -1, mobilization: -2, localAutonomy: 8 },
  }),
  city_state: definePolityForm({
    id: "city_state", name: "都市国家", nationSuffix: "自由市", capitalTitle: "中央市", rulerTitle: "市長", seatLabel: "市政庁",
    politicalSystemId: "oligarchic_republic",
    officeTitles: { capital: "市長", interior: "市参事", frontier: "関門警備長" },
    modifiers: { stateCapacity: 1, commerce: 8, cohesion: 1, mobilization: -3, localAutonomy: 6 },
  }),
  federation: definePolityForm({
    id: "federation", name: "連邦", nationSuffix: "連邦", capitalTitle: "連邦首都", rulerTitle: "連邦議長", seatLabel: "連邦議事堂",
    politicalSystemId: "federal_council",
    officeTitles: { capital: "連邦首都長官", interior: "州総督", frontier: "辺境州総督" },
    modifiers: { stateCapacity: 3, commerce: 4, cohesion: 3, mobilization: 0, localAutonomy: 7 },
  }),
  chiefdom: definePolityForm({
    id: "chiefdom", name: "首長国連合", nationSuffix: "首長国", capitalTitle: "主都", rulerTitle: "大族長", seatLabel: "大族長砦",
    politicalSystemId: "clan_confederation",
    officeTitles: { capital: "盟主代官", interior: "族長", frontier: "辺境族長" },
    modifiers: { stateCapacity: -3, commerce: -1, cohesion: 6, mobilization: 4, localAutonomy: 9 },
  }),
  nomadic_state: definePolityForm({
    id: "nomadic_state", name: "遊牧国家", nationSuffix: "遊牧国", capitalTitle: "大営", rulerTitle: "大汗", seatLabel: "大帳",
    politicalSystemId: "clan_confederation",
    officeTitles: { capital: "大営代官", interior: "汗", frontier: "辺境族長" },
    modifiers: { stateCapacity: -4, commerce: 1, cohesion: 6, mobilization: 7, localAutonomy: 10 },
  }),
  tribal_confederation: definePolityForm({
    id: "tribal_confederation", name: "部族連合", nationSuffix: "部族連合", capitalTitle: "盟主地", rulerTitle: "大族長", seatLabel: "長老会議場",
    politicalSystemId: "clan_confederation",
    officeTitles: { capital: "盟主代官", interior: "族長", frontier: "戦士長" },
    modifiers: { stateCapacity: -4, commerce: -2, cohesion: 7, mobilization: 5, localAutonomy: 10 },
  }),
  military_regime: definePolityForm({
    id: "military_regime", name: "軍事政権", nationSuffix: "軍政国", capitalTitle: "統帥都", rulerTitle: "大元帥", seatLabel: "統帥府",
    politicalSystemId: "military_junta",
    officeTitles: { capital: "首都軍政官", interior: "軍政官", frontier: "城塞司令官" },
    modifiers: { stateCapacity: 3, commerce: -3, cohesion: 0, mobilization: 9, localAutonomy: -7 },
  }),
  magocracy: definePolityForm({
    id: "magocracy", name: "魔導国家", nationSuffix: "魔導国", capitalTitle: "塔都", rulerTitle: "魔導王", seatLabel: "中央魔導塔",
    politicalSystemId: "magocratic_council",
    officeTitles: { capital: "首席塔主", interior: "塔主", frontier: "魔術審問官" },
    modifiers: { stateCapacity: 4, commerce: 1, cohesion: 1, mobilization: 3, localAutonomy: -2 },
  }),
  maritime_state: definePolityForm({
    id: "maritime_state", name: "海洋国家", nationSuffix: "海洋国", capitalTitle: "海都", rulerTitle: "海王", seatLabel: "海王府",
    politicalSystemId: "oligarchic_republic",
    officeTitles: { capital: "海都総督", interior: "港湾長", frontier: "提督" },
    modifiers: { stateCapacity: 2, commerce: 9, cohesion: 0, mobilization: 1, localAutonomy: 5 },
  }),
  theocracy: definePolityForm({
    id: "theocracy", name: "神国", nationSuffix: "神国", capitalTitle: "神都", rulerTitle: "大神官", seatLabel: "大神殿",
    politicalSystemId: "clerical_theocracy",
    officeTitles: { capital: "神都司教", interior: "地方司教", frontier: "守境司祭" },
    modifiers: { stateCapacity: 2, commerce: -1, cohesion: 7, mobilization: 1, localAutonomy: -1 },
  }),
  demon_kingdom: definePolityForm({
    id: "demon_kingdom", name: "魔王国", nationSuffix: "魔王国", capitalTitle: "魔都", rulerTitle: "魔王", seatLabel: "魔王城",
    politicalSystemId: "absolute_monarchy",
    officeTitles: { capital: "魔都総監", interior: "領域将", frontier: "境界将" },
    modifiers: { stateCapacity: 4, commerce: -2, cohesion: 4, mobilization: 7, localAutonomy: -6 },
  }),
});

export const SOVEREIGNTY_STATUSES = Object.freeze({
  sovereign: Object.freeze({ id: "sovereign", name: "独立主権国" }),
  suzerain: Object.freeze({ id: "suzerain", name: "宗主国" }),
  vassal: Object.freeze({ id: "vassal", name: "属国" }),
  protectorate: Object.freeze({ id: "protectorate", name: "保護国" }),
  colony: Object.freeze({ id: "colony", name: "植民地" }),
});

const CULTURAL_POLITY_RULES = Object.freeze({
  beastfolk: Object.freeze({ formId: "chiefdom", governmentName: "森林氏族同盟", nationSuffix: "氏族同盟", seatLabel: "盟主砦" }),
  dwarf: Object.freeze({ formId: "federation", governmentName: "坑道都市連邦", nationSuffix: "坑道国", seatLabel: "中央議事坑" }),
  elf: Object.freeze({ formId: "kingdom", governmentName: "森王庭連合", nationSuffix: "森王国", politicalSystemId: "elective_monarchy" }),
  lizardman: Object.freeze({ formId: "federation", governmentName: "水郷氏族連合", nationSuffix: "河国", seatLabel: "水府" }),
  goblin: Object.freeze({ formId: "republic", governmentName: "工房集落評議会", nationSuffix: "工房国", politicalSystemId: "oligarchic_republic", seatLabel: "中央評議所" }),
  giant: Object.freeze({ formId: "chiefdom", governmentName: "高峰氏族領", nationSuffix: "峰国", politicalSystemId: "autocratic_chiefdom", seatLabel: "大族長砦" }),
  demon: Object.freeze({ formId: "demon_kingdom", governmentName: "魔王直轄国", nationSuffix: "魔王国" }),
});

function humanPolityRule(stats, nationLevel) {
  if (nationLevel >= 6) return { formId: "empire", governmentName: "大陸帝政" };
  if (stats.mountainShare >= 0.34) return { formId: "federation", governmentName: "山岳連邦" };
  if (stats.coastalShare >= 0.32 && stats.commercePerTile >= 0.62) return nationLevel <= 2
    ? { formId: "city_state", governmentName: "海洋都市国家" }
    : { formId: "city_league", governmentName: "海洋都市同盟" };
  if (stats.meanFertility >= 59 && stats.flatShare >= 0.48) return { formId: "kingdom", governmentName: "農耕王政" };
  if (stats.productionPerTile >= 2.05) return { formId: "principality", governmentName: "諸侯公国" };
  if (stats.meanFreshwater >= 0.48) return { formId: "republic", governmentName: "河川共和政" };
  return { formId: "kingdom", governmentName: "地域王政" };
}

function polityProfile(rule = {}) {
  const form = POLITY_FORMS[rule.formId] ?? POLITY_FORMS.kingdom;
  const politicalSystem = POLITICAL_SYSTEMS[rule.politicalSystemId ?? form.politicalSystemId];
  const sovereignty = SOVEREIGNTY_STATUSES.sovereign;
  return {
    modelVersion: WORLD_POLITY_MODEL_VERSION,
    formId: form.id,
    formName: form.name,
    governmentName: rule.governmentName ?? form.name,
    politicalSystemId: politicalSystem.id,
    politicalSystemName: politicalSystem.name,
    authority: politicalSystem.authority,
    representation: politicalSystem.representation,
    administration: politicalSystem.administration,
    rulerTitle: rule.rulerTitle ?? form.rulerTitle,
    capitalTitle: rule.capitalTitle ?? form.capitalTitle,
    seatLabel: rule.seatLabel ?? form.seatLabel,
    nationSuffix: rule.nationSuffix ?? form.nationSuffix,
    officeTitles: { ...form.officeTitles, ...(rule.officeTitles ?? {}) },
    sovereignty: { ...sovereignty },
    modifiers: { ...form.modifiers, ...(rule.modifiers ?? {}) },
    sourceReferenceIds: WORLD_POLITY_MODEL_REFERENCES.map((reference) => reference.id),
  };
}

export function derivePolityForForm(formId, overrides = {}) {
  const form = POLITY_FORMS[formId] ?? POLITY_FORMS.kingdom;
  return polityProfile({ formId: form.id, governmentName: overrides.governmentName ?? form.name, ...overrides });
}

export function deriveNationPolity({ peopleId = "human", stats = {}, nationLevel = 1 } = {}) {
  const numericStats = {
    mountainShare: Number(stats.mountainShare) || 0,
    coastalShare: Number(stats.coastalShare) || 0,
    commercePerTile: Number(stats.commercePerTile) || 0,
    meanFertility: Number(stats.meanFertility) || 0,
    flatShare: Number(stats.flatShare) || 0,
    productionPerTile: Number(stats.productionPerTile) || 0,
    meanFreshwater: Number(stats.meanFreshwater) || 0,
  };
  return polityProfile(CULTURAL_POLITY_RULES[peopleId] ?? humanPolityRule(numericStats, nationLevel));
}

export function regionalOfficeTitle(polity, { capital = false, frontier = false } = {}) {
  if (capital) return polity?.officeTitles?.capital ?? "首都長官";
  if (frontier) return polity?.officeTitles?.frontier ?? "国境監督官";
  return polity?.officeTitles?.interior ?? "地方長官";
}

export function formatSettlementName(baseName, level, options = {}) {
  const name = String(baseName ?? "").trim();
  if (!name) return "名称未定";
  if (options.capitalCity && options.capitalTitle) {
    return name.startsWith(options.capitalTitle) ? name : `${options.capitalTitle}${name}`;
  }
  if (level === "city") return name;
  if (level === "town") return `${name}の町`;
  return `${name}村`;
}

function defineSettlementFunction(id, name, services, gameplay = {}) {
  return Object.freeze({
    id,
    name,
    services: Object.freeze([...services]),
    gameplay: Object.freeze({ merchantBias: 0, adventurerBias: 0, merchantPriceModifier: 0, ...gameplay }),
  });
}

export const SETTLEMENT_FUNCTIONS = Object.freeze({
  capital: defineSettlementFunction("capital", "首都", ["government", "registry", "market"], { merchantBias: 0.08 }),
  regional_seat: defineSettlementFunction("regional_seat", "領都・地方政庁", ["government", "court", "market"], { merchantBias: 0.05 }),
  commercial_city: defineSettlementFunction("commercial_city", "商業都市", ["market", "warehouse", "finance"], { merchantBias: 0.18, merchantPriceModifier: -1 }),
  trade_hub: defineSettlementFunction("trade_hub", "交易都市", ["market", "warehouse", "caravan"], { merchantBias: 0.14, merchantPriceModifier: -1 }),
  port_city: defineSettlementFunction("port_city", "港湾都市", ["market", "shipping", "shipyard"], { merchantBias: 0.18, merchantPriceModifier: -1 }),
  fishing_harbor: defineSettlementFunction("fishing_harbor", "漁港", ["fishery", "market", "shipping"], { merchantBias: 0.08 }),
  oasis_city: defineSettlementFunction("oasis_city", "オアシス都市", ["water", "market", "caravan"], { merchantBias: 0.12 }),
  post_station: defineSettlementFunction("post_station", "宿場", ["inn", "stable", "courier"], { merchantBias: 0.09 }),
  mining_settlement: defineSettlementFunction("mining_settlement", "鉱山町", ["mine", "forge", "market"], { merchantBias: 0.05, adventurerBias: 0.03 }),
  craft_settlement: defineSettlementFunction("craft_settlement", "工芸の町", ["workshop", "market"], { merchantBias: 0.08 }),
  agricultural_settlement: defineSettlementFunction("agricultural_settlement", "農村", ["farm", "granary"], {}),
  autonomous_city: defineSettlementFunction("autonomous_city", "自治都市", ["council", "market"], { merchantBias: 0.08 }),
  free_city: defineSettlementFunction("free_city", "自由都市", ["council", "market", "warehouse"], { merchantBias: 0.14, merchantPriceModifier: -1 }),
  fortress_city: defineSettlementFunction("fortress_city", "城塞都市", ["garrison", "armory"], { adventurerBias: 0.16, merchantPriceModifier: 1 }),
  border_town: defineSettlementFunction("border_town", "国境の町", ["customs", "garrison", "market"], { merchantBias: 0.06, adventurerBias: 0.11, merchantPriceModifier: 1 }),
  pass_town: defineSettlementFunction("pass_town", "峠の町", ["inn", "stable", "garrison"], { adventurerBias: 0.08 }),
  industrial_city: defineSettlementFunction("industrial_city", "工業都市", ["factory", "warehouse", "market"], { merchantBias: 0.1, merchantPriceModifier: -1 }),
  academy_city: defineSettlementFunction("academy_city", "学術都市", ["academy", "archive", "market"], { adventurerBias: 0.04 }),
  religious_city: defineSettlementFunction("religious_city", "宗教都市", ["temple", "pilgrim_inn", "market"], { merchantBias: 0.05 }),
  planned_city: defineSettlementFunction("planned_city", "計画都市", ["registry", "market", "warehouse"], { merchantBias: 0.06 }),
  hidden_settlement: defineSettlementFunction("hidden_settlement", "隠れ里", ["shelter", "forage"], { merchantBias: -0.08, adventurerBias: 0.08 }),
  dungeon_city: defineSettlementFunction("dungeon_city", "迷宮都市", ["guild", "market", "armory"], { merchantBias: 0.1, adventurerBias: 0.2, merchantPriceModifier: 1 }),
});

function settlementFunctionMatch(functionId, score, reason) {
  const definition = SETTLEMENT_FUNCTIONS[functionId];
  return definition ? { id: definition.id, name: definition.name, score, reason } : null;
}

export function deriveSettlementFunctions({ object, tile, region, nation, roads = [] } = {}) {
  if (!object?.settlementLevel) return null;
  const matches = [];
  const add = (id, score, reason) => {
    const match = settlementFunctionMatch(id, score, reason);
    if (match && !matches.some((entry) => entry.id === id)) matches.push(match);
  };
  const roadConnected = roads.some((road) => (
    road.fromObjectId === object.id || road.toObjectId === object.id || road.tileIndices?.includes(object.tileIndex)
  ));
  const mountainRoad = roadConnected && ["hills", "mountains"].includes(tile?.relief);
  const commerce = Number(tile?.yields?.commerce) || 0;
  const production = Number(tile?.yields?.production) || 0;
  const food = Number(tile?.yields?.food) || 0;
  const mineral = Number(tile?.resourcePotential?.mineral) || 0;
  const timber = Number(tile?.resourcePotential?.timber) || 0;

  if (object.capitalCity) add("capital", 300, `${nation?.polity?.capitalTitle ?? "首都"}として国家元首と中央機関が置かれる`);
  if (object.type === "bay_city" || object.type === "port") add("port_city", 245, "海運路と港湾施設を持つ");
  if (object.type === "fishing_port") add("fishing_harbor", 240, "沿岸漁業と小規模海運を担う");
  if (object.regionSeat && !object.capitalCity) add("regional_seat", 220, `${region?.officeTitle ?? "地方官"}の政庁が置かれる`);
  if (tile?.terrain === "desert" && Number(tile?.freshwater) >= 0.25) add("oasis_city", 215, "乾燥地の水源と隊商路を支える");
  if (object.frontierSettlement) add("border_town", 205, "他国境界上の検問と守備を担う");
  if ((Number(tile?.defense) || 0) >= 1.7 || (object.frontierSettlement && object.settlementLevel === "city")) add("fortress_city", 195, "防衛に適した地勢と守備機能を持つ");
  if (object.dungeonLinked) add("dungeon_city", 192, "迷宮探索者と補給市場を支える");
  if (nation?.polity?.formId === "theocracy") add("religious_city", 190, "神殿行政と巡礼者の受け入れを担う");
  if (mineral >= 0.58 && production >= 1.8) add("mining_settlement", 185, "鉱物資源と生産力が高い");
  if (commerce >= 0.75 && object.settlementLevel === "city") add("commercial_city", 180, "商業生産と市場集積が大きい");
  if (production >= 2.6 && object.settlementLevel === "city") add("industrial_city", 178, "大規模な生産施設と物流需要を持つ");
  if (roadConnected && commerce >= 0.55) add("trade_hub", 170, "街道と市場を通じて地域間交易を結ぶ");
  if (["republic", "city_league", "city_state", "federation", "maritime_state"].includes(nation?.polity?.formId) && commerce >= 0.65) {
    add(["city_league", "city_state"].includes(nation.polity.formId) ? "free_city" : "autonomous_city", 165, "評議制国家の都市自治と商業基盤を持つ");
  }
  if (mountainRoad) add("pass_town", 160, "山地を越える街道の宿泊・守備拠点となる");
  if (object.regionSeat && commerce >= 0.8 && ["representative_republic", "federal_council", "oligarchic_republic"].includes(nation?.polity?.politicalSystemId)) {
    add("academy_city", 158, "文官、記録、専門教育が集まる行政拠点となる");
  }
  if (roadConnected) add("post_station", 150, "街道上で旅人、早馬、荷駄を支える");
  if (object.placement === "urban-center" && object.settlementLevel === "city" && !object.capitalCity) add("planned_city", 145, "地方政庁を核に区画された都市となる");
  if (production >= 2.15 || timber >= 0.7) add("craft_settlement", 140, "工房用資源と生産力を持つ");
  if (!roadConnected && object.settlementLevel === "village" && ["forest", "rainforest"].includes(tile?.feature)) add("hidden_settlement", 135, "森林の奥で街道から離れて暮らす");
  if (food >= 1.15 || matches.length === 0) add("agricultural_settlement", 20, "周辺農地と食料生産を基盤とする");

  const functions = matches
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, 3);
  const definitions = functions.map((entry) => SETTLEMENT_FUNCTIONS[entry.id]);
  const services = [...new Set(definitions.flatMap((entry) => entry.services))];
  const merchantBias = clamp(definitions.reduce((sum, entry) => sum + entry.gameplay.merchantBias, 0), -0.12, 0.28);
  const adventurerBias = clamp(definitions.reduce((sum, entry) => sum + entry.gameplay.adventurerBias, 0), -0.12, 0.24);
  const merchantPriceModifier = clamp(Math.round(definitions.reduce((sum, entry) => sum + entry.gameplay.merchantPriceModifier, 0)), -2, 2);
  return {
    functionIds: functions.map((entry) => entry.id),
    functions,
    primaryFunction: functions[0],
    services,
    gameplay: { merchantBias, adventurerBias, merchantPriceModifier },
  };
}
