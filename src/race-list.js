// 種族データの正本。
// 種族を名称や能力補正だけで参照せず、必ず getRaceDefinition() から
// 生態・軍事・統治・中央集権化の特性をまとめて取得すること。

function freezeArray(values = []) {
  return Object.freeze([...new Set(values)]);
}

function freezeRecord(value = {}) {
  return Object.freeze({ ...value });
}

function defineCategory(definition) {
  return Object.freeze({
    ...definition,
    commonTraits: freezeArray(definition.commonTraits),
    governanceIssues: freezeArray(definition.governanceIssues),
    habitat: freezeArray(definition.habitat),
    foodType: freezeArray(definition.foodType),
    militaryTraits: freezeArray(definition.militaryTraits),
    favoredUnitRoles: freezeArray(definition.favoredUnitRoles),
    terrainModifiers: freezeRecord(definition.terrainModifiers),
    unitTags: freezeArray(definition.unitTags),
    combatModifiers: freezeRecord(definition.combatModifiers),
    legalNeeds: freezeArray(definition.legalNeeds),
    centralizationObstacle: freezeArray(definition.centralizationObstacle),
    integrationPolicies: freezeArray(definition.integrationPolicies),
  });
}

export const RACE_CATEGORIES = Object.freeze({
  humanfolk: defineCategory({
    id: "humanfolk", name: "人族", ecology: "制度文明型",
    commonTraits: ["都市・国家・成文法を形成しやすい", "制度・技術・組織によって勢力を拡大する"],
    governanceIssues: ["寿命・文化・宗教の差", "階級・民族・地域による政治対立"],
    habitat: ["plain", "forest", "hill", "urban"], foodType: ["omnivore"], bodySize: "medium",
    militaryTraits: ["organized_warfare"], favoredUnitRoles: ["infantry", "archer", "cavalry", "mage", "engineer"],
    terrainModifiers: {}, unitTags: [], combatModifiers: {}, politicalUnit: "city",
    censusDifficulty: 15, assimilationDifficulty: 30, autonomyDemand: 35,
    legalNeeds: ["宗教・文化ごとの身分保障"], centralizationObstacle: ["地域エリートと旧来慣習"],
    integrationPolicies: ["共通法典", "地方議会", "公教育"],
  }),
  yokai: defineCategory({
    id: "yokai", name: "妖魔", ecology: "魔力・生命力依存型",
    commonTraits: ["魔力・生命力・感情を外部から得る", "人族社会へ潜伏または共生できる"],
    governanceIssues: ["人口把握", "食性と供物", "契約", "夜間社会"],
    habitat: ["forest", "swamp", "urban"], foodType: ["mana"], bodySize: "medium",
    militaryTraits: ["magic_dependent", "infiltration"], favoredUnitRoles: ["mage", "scout", "infiltrator"],
    terrainModifiers: {}, unitTags: [], combatModifiers: { magicPower: 1.12 }, politicalUnit: "individual",
    censusDifficulty: 68, assimilationDifficulty: 58, autonomyDemand: 62,
    legalNeeds: ["契約の強制力", "供物・生命資源の合法的調達"], centralizationObstacle: ["戸籍外活動", "人族法と魔法契約の競合"],
    integrationPolicies: ["魔力供給協定", "夜間自治", "契約登記"],
  }),
  demihuman: defineCategory({
    id: "demihuman", name: "亜人", ecology: "高適応人型",
    commonTraits: ["身体能力または特定環境への適応力が高い", "氏族法に基づく社会を形成しやすい"],
    governanceIssues: ["氏族忠誠", "慣習法", "定住化と領域認識"],
    habitat: ["forest", "hill", "mountain", "underground"], foodType: ["omnivore"], bodySize: "medium",
    militaryTraits: ["environmental_adaptation"], favoredUnitRoles: ["infantry", "engineer", "scout"],
    terrainModifiers: {}, unitTags: [], combatModifiers: {}, politicalUnit: "clan",
    censusDifficulty: 42, assimilationDifficulty: 48, autonomyDemand: 66,
    legalNeeds: ["氏族法", "地下・狩猟領域の権利"], centralizationObstacle: ["氏族への第一次忠誠", "官僚制と慣習法の摩擦"],
    integrationPolicies: ["氏族盟約", "慣習法承認", "共同軍役"],
  }),
  slime: defineCategory({
    id: "slime", name: "粘液族", ecology: "可変流動体型",
    commonTraits: ["肉体形状が固定されない", "分裂・融合・擬態を行う"],
    governanceIssues: ["個体・財産・人口の定義", "本人確認"],
    habitat: ["swamp", "underground", "urban"], foodType: ["organic", "mineral"], bodySize: "variable",
    militaryTraits: ["amorphous", "physical_resistance"], favoredUnitRoles: ["infantry", "infiltrator", "siege"],
    terrainModifiers: { swamp: 1.25 }, unitTags: [], combatModifiers: { defense: 1.12 }, politicalUnit: "colony",
    censusDifficulty: 92, assimilationDifficulty: 76, autonomyDemand: 54,
    legalNeeds: ["核を基準とする個体登録", "分裂・融合時の財産承継"], centralizationObstacle: ["人口と法的人格が増減する"],
    integrationPolicies: ["核台帳", "擬態表示義務", "融合契約"],
  }),
  insectoid: defineCategory({
    id: "insectoid", name: "妖虫族", ecology: "節足・変態型",
    commonTraits: ["昆虫的身体を持つ", "種族ごとに単独社会から巣国家まで社会性が異なる"],
    governanceIssues: ["女王・巣への依存", "群体意識と個体責任"],
    habitat: ["forest", "underground", "desert"], foodType: ["omnivore", "nectar"], bodySize: "medium",
    militaryTraits: ["exoskeleton"], favoredUnitRoles: ["infantry", "scout", "infiltrator"],
    terrainModifiers: {}, unitTags: [], combatModifiers: { defense: 1.05 }, politicalUnit: "hive",
    censusDifficulty: 56, assimilationDifficulty: 64, autonomyDemand: 72,
    legalNeeds: ["巣単位の代表権", "脱皮・変態時の同一性"], centralizationObstacle: ["巣の命令系統", "女王喪失時の秩序崩壊"],
    integrationPolicies: ["巣評議席", "女王保護協定", "群体自治"],
  }),
  beastfolk: defineCategory({
    id: "beastfolk", name: "獣人族", ecology: "獣系人型",
    commonTraits: ["鋭敏な感覚を持つ", "獣種ごとに身体能力と生活圏が大きく異なる"],
    governanceIssues: ["系統差", "群れ・氏族・狩猟圏の権利"],
    habitat: ["forest", "hill", "mountain", "tundra"], foodType: ["omnivore"], bodySize: "medium",
    militaryTraits: ["keen_senses"], favoredUnitRoles: ["scout", "infantry", "light_cavalry"],
    terrainModifiers: { forest: 1.08 }, unitTags: [], combatModifiers: { movement: 1.05 }, politicalUnit: "clan",
    censusDifficulty: 36, assimilationDifficulty: 46, autonomyDemand: 70,
    legalNeeds: ["狩猟圏と移動権", "系統別の身体慣習"], centralizationObstacle: ["獣人を一括処理する法制度"],
    integrationPolicies: ["系統別自治法", "狩猟圏登記", "群れ代表制"],
  }),
  draconic: defineCategory({
    id: "draconic", name: "竜族", ecology: "竜魔力・長命型",
    commonTraits: ["高い魔力・耐久力・長寿を持つ", "少数でも極めて高い個体戦力を持つ"],
    governanceIssues: ["個体戦力が国家権力を上回る", "低出生率"],
    habitat: ["mountain", "volcanic", "sky"], foodType: ["carnivore", "mana"], bodySize: "large",
    militaryTraits: ["draconic_resilience", "magic_affinity"], favoredUnitRoles: ["heavy_infantry", "mage", "aerial"],
    terrainModifiers: { mountain: 1.15 }, unitTags: ["LARGE"], combatModifiers: { hp: 1.35, attack: 1.18 }, politicalUnit: "individual",
    censusDifficulty: 52, assimilationDifficulty: 82, autonomyDemand: 90,
    legalNeeds: ["独立領主または軍事盟約者としての地位"], centralizationObstacle: ["竜個体の主権的武力"],
    integrationPolicies: ["竜盟約", "独立領保障", "貢納と相互防衛"],
  }),
  celestial: defineCategory({
    id: "celestial", name: "天族", ecology: "神命顕現型",
    commonTraits: ["神聖性と飛行能力を持つ", "個体利益より使命を重視する"],
    governanceIssues: ["地上法より神命を優先する", "神命の解釈権"],
    habitat: ["sky", "mountain", "urban"], foodType: ["mana"], bodySize: "medium",
    militaryTraits: ["flight", "holy_resistance"], favoredUnitRoles: ["aerial", "healer", "mage"],
    terrainModifiers: { mountain: 1.2, river: 1.1 }, unitTags: ["FLYING"], combatModifiers: { morale: 1.15, magicPower: 1.12 }, politicalUnit: "city",
    censusDifficulty: 30, assimilationDifficulty: 78, autonomyDemand: 76,
    legalNeeds: ["神命と地上法の管轄分離"], centralizationObstacle: ["正統な神命解釈を巡る宗教政治"],
    integrationPolicies: ["神命審議会", "聖俗管轄協定", "使命別軍役"],
  }),
  seafolk: defineCategory({
    id: "seafolk", name: "海魔", ecology: "海洋知性型",
    commonTraits: ["水中活動と海洋支配に優れる", "海流・海溝・漁場を戦略資産とする"],
    governanceIssues: ["陸上の国境・道路・土地制度が通用しない", "深海人口の把握"],
    habitat: ["coast", "ocean", "deep_sea"], foodType: ["carnivore", "marine"], bodySize: "medium",
    militaryTraits: ["aquatic", "naval_mastery"], favoredUnitRoles: ["naval", "infiltrator", "healer"],
    terrainModifiers: { river: 1.3, swamp: 1.2 }, unitTags: ["AQUATIC"], combatModifiers: { movement: 1.08 }, politicalUnit: "clan",
    censusDifficulty: 74, assimilationDifficulty: 70, autonomyDemand: 82,
    legalNeeds: ["海域・漁場・産卵場の共有権"], centralizationObstacle: ["陸上中心の行政網"],
    integrationPolicies: ["海流台帳", "海域自治", "水陸二重首都"],
  }),
  oni: defineCategory({
    id: "oni", name: "鬼族", ecology: "大型再生人型",
    commonTraits: ["大型で膂力と再生力に優れる", "個人武力と報復文化を重んじる"],
    governanceIssues: ["食料消費", "個人武力", "報復の連鎖"],
    habitat: ["hill", "mountain", "forest"], foodType: ["omnivore"], bodySize: "large",
    militaryTraits: ["great_strength", "regeneration"], favoredUnitRoles: ["heavy_infantry", "siege"],
    terrainModifiers: { hill: 1.08 }, unitTags: ["LARGE"], combatModifiers: { hp: 1.35, attack: 1.28, fatigueCost: 1.12 }, politicalUnit: "clan",
    censusDifficulty: 32, assimilationDifficulty: 58, autonomyDemand: 74,
    legalNeeds: ["決闘と賠償を接続する法"], centralizationObstacle: ["武力による私人制裁"],
    integrationPolicies: ["報復仲裁院", "戦功官位", "大食料配給"],
  }),
  giant: defineCategory({
    id: "giant", name: "巨人族", ecology: "超大型人型",
    commonTraits: ["巨大な身体を持つ", "建築・運搬・破城に優れる"],
    governanceIssues: ["居住設備と食料需要が通常規格に合わない", "人口が少なく徴税単位が大きい"],
    habitat: ["mountain", "hill", "tundra"], foodType: ["omnivore"], bodySize: "huge",
    militaryTraits: ["colossal_strength", "siege_mastery"], favoredUnitRoles: ["siege", "heavy_infantry", "engineer"],
    terrainModifiers: { mountain: 1.1 }, unitTags: ["LARGE"], combatModifiers: { hp: 2.2, attack: 1.65, movement: 0.82 }, politicalUnit: "family",
    censusDifficulty: 22, assimilationDifficulty: 68, autonomyDemand: 78,
    legalNeeds: ["巨体向けの道路・建築・労役基準"], centralizationObstacle: ["標準規格と現物税の不適合"],
    integrationPolicies: ["巨人規格の公共事業", "現物貢納", "谷ごとの自治"],
  }),
  undead: defineCategory({
    id: "undead", name: "不死族", ecology: "死後継続型",
    commonTraits: ["疲労・寿命・恐怖の制約を受けにくい", "死後の肉体または魂が活動を継続する"],
    governanceIssues: ["生者との法", "相続", "労働", "死体利用"],
    habitat: ["underground", "urban", "wasteland"], foodType: ["none"], bodySize: "medium",
    militaryTraits: ["fearless", "untiring", "undead_body"], favoredUnitRoles: ["infantry", "heavy_infantry", "mage"],
    terrainModifiers: {}, unitTags: ["UNDEAD"], combatModifiers: { morale: 1.25, fatigueCost: 0.45 }, politicalUnit: "city",
    censusDifficulty: 38, assimilationDifficulty: 84, autonomyDemand: 64,
    legalNeeds: ["死後人格", "相続期限", "遺体利用への生前同意"], centralizationObstacle: ["生者法と死者法の二重化"],
    integrationPolicies: ["死後戸籍", "遺体契約", "生者・死者混合法廷"],
  }),
  construct: defineCategory({
    id: "construct", name: "魔法人形", ecology: "製造・魔力駆動型",
    commonTraits: ["製造・命令・魔力供給によって活動する", "疲労や食料より整備と動力を必要とする"],
    governanceIssues: ["人格", "所有権", "製造者への服従"],
    habitat: ["urban", "underground"], foodType: ["mana", "none"], bodySize: "medium",
    militaryTraits: ["construct_body", "fearless"], favoredUnitRoles: ["infantry", "heavy_infantry", "engineer"],
    terrainModifiers: {}, unitTags: ["CONSTRUCT"], combatModifiers: { morale: 1.2, defense: 1.12, fatigueCost: 0.55 }, politicalUnit: "individual",
    censusDifficulty: 20, assimilationDifficulty: 64, autonomyDemand: 45,
    legalNeeds: ["自我を持つ個体の人格認定", "製造者命令の解除手続"], centralizationObstacle: ["所有物と国民の境界", "動力供給者への依存"],
    integrationPolicies: ["自律判定", "製造番号戸籍", "公的魔力網"],
  }),
  spirit: defineCategory({
    id: "spirit", name: "精霊族", ecology: "自然環境結合型",
    commonTraits: ["特定の自然環境と結びつく", "非肉体的または半物質的な身体を持つ"],
    governanceIssues: ["土地開発による消滅・暴走", "領土と人格の重なり"],
    habitat: ["forest", "river", "mountain", "volcanic"], foodType: ["mana"], bodySize: "variable",
    militaryTraits: ["ethereal", "elemental_body"], favoredUnitRoles: ["mage", "scout", "terrain_control"],
    terrainModifiers: {}, unitTags: ["ETHEREAL"], combatModifiers: { magicPower: 1.3 }, politicalUnit: "individual",
    censusDifficulty: 80, assimilationDifficulty: 88, autonomyDemand: 86,
    legalNeeds: ["依代と生息環境の不可分権"], centralizationObstacle: ["行政開発が個体の生存を直接脅かす"],
    integrationPolicies: ["聖域指定", "環境影響盟約", "依代登録"],
  }),
  fungal: defineCategory({
    id: "fungal", name: "菌族", ecology: "菌床共有型",
    commonTraits: ["菌床を中心に繁殖する", "記憶や感覚を菌糸網で共有する"],
    governanceIssues: ["個体ではなく菌床単位で政治判断する", "胞子による越境繁殖"],
    habitat: ["forest", "swamp", "underground"], foodType: ["decomposer"], bodySize: "medium",
    militaryTraits: ["spore_network", "regeneration"], favoredUnitRoles: ["infantry", "support", "terrain_control"],
    terrainModifiers: { forest: 1.15, swamp: 1.2 }, unitTags: [], combatModifiers: { cohesion: 1.18, defense: 1.08 }, politicalUnit: "colony",
    censusDifficulty: 86, assimilationDifficulty: 82, autonomyDemand: 68,
    legalNeeds: ["菌床を一人格とする代表権", "胞子拡散の境界責任"], centralizationObstacle: ["個体投票と菌床意思の不一致"],
    integrationPolicies: ["菌床台帳", "胞子回廊", "菌糸使節"],
  }),
});

function defineRace(id, name, categoryId, options) {
  const category = RACE_CATEGORIES[categoryId];
  if (!category) throw new Error(`未知の種族大分類です: ${categoryId}`);
  const merged = {
    id, name, categoryId,
    category: Object.freeze({ id: category.id, name: category.name, ecology: category.ecology }),
    sourceStatus: options.sourceStatus ?? "canonical_user_definition",
    summary: options.summary,
    traits: freezeArray([...category.commonTraits, ...(options.traits ?? [])]),
    habitat: freezeArray(options.habitat ?? category.habitat),
    lifespan: options.lifespan,
    fertility: options.fertility,
    foodType: freezeArray(options.foodType ?? category.foodType),
    bodySize: options.bodySize ?? category.bodySize,
    militaryTraits: freezeArray([...category.militaryTraits, ...(options.militaryTraits ?? [])]),
    favoredUnitRoles: freezeArray(options.favoredUnitRoles ?? category.favoredUnitRoles),
    terrainModifiers: freezeRecord({ ...category.terrainModifiers, ...(options.terrainModifiers ?? {}) }),
    unitTags: freezeArray([...category.unitTags, ...(options.unitTags ?? [])]),
    combatModifiers: freezeRecord({ ...category.combatModifiers, ...(options.combatModifiers ?? {}) }),
    politicalUnit: options.politicalUnit ?? category.politicalUnit,
    censusDifficulty: options.censusDifficulty ?? category.censusDifficulty,
    assimilationDifficulty: options.assimilationDifficulty ?? category.assimilationDifficulty,
    autonomyDemand: options.autonomyDemand ?? category.autonomyDemand,
    legalNeeds: freezeArray([...category.legalNeeds, ...(options.legalNeeds ?? [])]),
    centralizationObstacle: freezeArray([...category.centralizationObstacle, ...(options.centralizationObstacle ?? [])]),
    integrationPolicies: freezeArray([...category.integrationPolicies, ...(options.integrationPolicies ?? [])]),
  };
  return Object.freeze(merged);
}

const RACE_SPECS = [
  // 人族
  ["human", "人間", "humanfolk", { summary: "短命だが人口増加と制度改革が速い文明形成の基準種。", lifespan: 80, fertility: 1, traits: ["制度改革が速い", "職能と軍種の分化に優れる"], militaryTraits: ["rapid_reorganization"], favoredUnitRoles: ["infantry", "archer", "cavalry", "mage", "engineer"], combatModifiers: { morale: 1.04, cohesion: 1.04 }, politicalUnit: "city", censusDifficulty: 10, assimilationDifficulty: 22, autonomyDemand: 32 }],
  ["elf", "エルフ", "humanfolk", { summary: "長命・低出生率で自然魔法と精密射撃に優れる。", lifespan: 700, fertility: 0.22, traits: ["長命", "低出生率", "自然魔法"], militaryTraits: ["forest_sense", "precision_archery"], favoredUnitRoles: ["archer", "mage", "scout"], terrainModifiers: { forest: 1.3 }, combatModifiers: { movement: 1.1, rangedAccuracy: 1.2, hp: 0.85 }, politicalUnit: "city", censusDifficulty: 12, assimilationDifficulty: 46, autonomyDemand: 58, centralizationObstacle: ["長老と古い慣習が改革を遅らせる"], integrationPolicies: ["長老院の法定化"] }],
  ["dark_elf", "ダークエルフ", "humanfolk", { summary: "暗所適応と毒・幻術・諜報に優れる長命種。", lifespan: 620, fertility: 0.26, traits: ["暗所適応", "毒耐性", "幻術適性"], habitat: ["underground", "forest", "urban"], militaryTraits: ["night_operations", "poisoncraft", "espionage"], favoredUnitRoles: ["infiltrator", "mage", "scout"], terrainModifiers: { underground: 1.3, forest: 1.1 }, combatModifiers: { movement: 1.08, magicPower: 1.12 }, censusDifficulty: 32, assimilationDifficulty: 58, autonomyDemand: 66, centralizationObstacle: ["名家・神殿・秘密結社の競合"], integrationPolicies: ["名家均衡評議会", "諜報監察"] }],

  // 妖魔
  ["fairy", "妖精", "yokai", { summary: "小型飛行と幻術・契約魔法で偵察と地形妨害を行う。", lifespan: 240, fertility: 0.65, bodySize: "tiny", traits: ["小型飛行", "幻術", "契約魔法"], foodType: ["mana", "nectar"], militaryTraits: ["flight", "illusion"], favoredUnitRoles: ["scout", "mage", "terrain_control"], terrainModifiers: { forest: 1.35, river: 1.15 }, unitTags: ["FLYING"], combatModifiers: { hp: 0.55, movement: 1.35, magicPower: 1.2 }, politicalUnit: "individual", censusDifficulty: 82, assimilationDifficulty: 72, autonomyDemand: 78, legalNeeds: ["口約束と真名契約の効力"], centralizationObstacle: ["土地所有や成文法の概念が弱い"] }],
  ["alraune", "アルラウネ", "yokai", { summary: "植物質の身体と香気を持つ定着型の森林妖魔。", lifespan: 180, fertility: 0.75, bodySize: "large", traits: ["植物質", "高再生", "香気による精神干渉"], habitat: ["forest", "swamp"], foodType: ["sunlight", "water", "mana"], militaryTraits: ["regeneration", "entanglement", "mind_affecting_scent"], favoredUnitRoles: ["healer", "terrain_control", "infantry"], terrainModifiers: { forest: 1.4, swamp: 1.15 }, combatModifiers: { hp: 1.25, movement: 0.6, defense: 1.12 }, politicalUnit: "colony", censusDifficulty: 28, assimilationDifficulty: 78, autonomyDemand: 86, legalNeeds: ["根域を含む土地人格権"], centralizationObstacle: ["移動困難で森林開発と両立しない"], integrationPolicies: ["根域保護区"] }],
  ["succubus", "サキュバス", "yokai", { summary: "感情・生命力を摂取し、魅了と社会潜入に秀でる。", lifespan: 320, fertility: 0.42, traits: ["感情・生命力摂取", "魅了", "外見擬装"], foodType: ["emotion", "life_force"], militaryTraits: ["charm", "espionage", "morale_attack"], favoredUnitRoles: ["infiltrator", "diplomat", "mage"], combatModifiers: { magicPower: 1.18, hp: 0.85 }, politicalUnit: "individual", censusDifficulty: 90, assimilationDifficulty: 62, autonomyDemand: 55, legalNeeds: ["生命力摂取への同意制度"], centralizationObstacle: ["戸籍外活動と宮廷浸透"], integrationPolicies: ["摂取許可制", "宮廷接触監査"] }],
  ["vampire", "ヴァンパイア", "yokai", { summary: "長命・吸血・夜間強化・眷属化を備える夜行種。", lifespan: null, fertility: 0.08, traits: ["不老", "吸血", "夜間強化", "眷属化"], foodType: ["blood"], militaryTraits: ["night_operations", "regeneration", "thrall_creation"], favoredUnitRoles: ["heavy_infantry", "infiltrator", "commander"], terrainModifiers: { urban: 1.15 }, combatModifiers: { hp: 1.2, attack: 1.15, morale: 1.12 }, politicalUnit: "family", censusDifficulty: 76, assimilationDifficulty: 80, autonomyDemand: 82, legalNeeds: ["血液供給と生者の身体権"], centralizationObstacle: ["血族家門と眷属網"], integrationPolicies: ["血液配給院", "眷属登録"] }],
  ["demon", "悪魔", "yokai", { sourceStatus: "supplemental_existing_setting", summary: "契約と欲望を媒介に魔力を得る、階序性の強い妖魔。", lifespan: 900, fertility: 0.18, traits: ["契約魔法", "感情感知", "異界適応"], foodType: ["mana", "emotion"], militaryTraits: ["contract_magic", "fear_aura"], favoredUnitRoles: ["mage", "commander", "infiltrator"], combatModifiers: { magicPower: 1.25, morale: 1.08 }, politicalUnit: "individual", censusDifficulty: 74, assimilationDifficulty: 86, autonomyDemand: 88, legalNeeds: ["異界契約の失効条件"], centralizationObstacle: ["契約主ごとの私的命令系統"], integrationPolicies: ["契約公証院"] }],

  // 亜人
  ["goblin", "ゴブリン", "demihuman", { summary: "小柄・多産で環境適応と即興工作に優れる。", lifespan: 55, fertility: 1.85, bodySize: "small", traits: ["小柄", "多産", "環境適応が速い"], militaryTraits: ["trapcraft", "rapid_settlement"], favoredUnitRoles: ["light_infantry", "engineer", "scout"], combatModifiers: { hp: 0.78, movement: 1.12, engineering: 1.15 }, politicalUnit: "clan", censusDifficulty: 62, assimilationDifficulty: 42, autonomyDemand: 54, centralizationObstacle: ["非公式集落と地下経済"], integrationPolicies: ["集落登録奨励", "工兵組合"] }],
  ["cyclops", "サイクロプス", "demihuman", { summary: "巨体・単眼と高度な鍛造能力を持つ少数工房種。", lifespan: 170, fertility: 0.34, bodySize: "large", traits: ["巨体", "単眼", "遠距離測定と鍛造に秀でる"], habitat: ["mountain", "hill", "underground"], militaryTraits: ["stone_throwing", "siegecraft", "master_forging"], favoredUnitRoles: ["siege", "engineer", "heavy_infantry"], terrainModifiers: { mountain: 1.18 }, unitTags: ["LARGE"], combatModifiers: { hp: 1.6, attack: 1.35, engineering: 1.3, movement: 0.82 }, politicalUnit: "family", censusDifficulty: 18, assimilationDifficulty: 56, autonomyDemand: 76, centralizationObstacle: ["小集団が鉱山・工房を独占する"], integrationPolicies: ["工房特許", "鉱山共同管理"] }],
  ["kobold", "コボルト", "demihuman", { summary: "坑道生活・嗅覚・採掘と罠構築に適応した小型種。", lifespan: 65, fertility: 1.35, bodySize: "small", traits: ["坑道生活", "鋭い嗅覚", "採掘適性"], habitat: ["underground", "mountain"], militaryTraits: ["tunneling", "trapcraft", "mining"], favoredUnitRoles: ["engineer", "scout", "light_infantry"], terrainModifiers: { underground: 1.4, mountain: 1.1 }, unitTags: ["SUBTERRANEAN"], combatModifiers: { hp: 0.82, movement: 1.08, engineering: 1.28 }, politicalUnit: "clan", censusDifficulty: 72, assimilationDifficulty: 48, autonomyDemand: 64, legalNeeds: ["地下領域の三次元境界"], centralizationObstacle: ["坑道網の境界把握が困難"], integrationPolicies: ["坑道測量局"] }],
  ["minotaur", "ミノタウロス", "demihuman", { summary: "高い突進力と迷宮内の方向感覚を持つ大型種。", lifespan: 110, fertility: 0.62, bodySize: "large", traits: ["強い突進力", "迷宮方向感覚", "角"], habitat: ["hill", "underground", "urban"], militaryTraits: ["charge", "maze_navigation"], favoredUnitRoles: ["heavy_infantry", "siege"], unitTags: ["LARGE"], combatModifiers: { hp: 1.3, attack: 1.18, charge: 1.35 }, politicalUnit: "city", censusDifficulty: 20, assimilationDifficulty: 54, autonomyDemand: 68, centralizationObstacle: ["迷宮都市と神官勢力への忠誠"], integrationPolicies: ["迷宮都市特区", "神官任官"] }],
  ["lizardman", "リザードマン", "demihuman", { summary: "鱗と変温性を持ち、湿地と水陸両域へ適応する。", lifespan: 95, fertility: 1.05, traits: ["湿地適応", "鱗", "変温性"], habitat: ["swamp", "river", "coast"], foodType: ["carnivore"], militaryTraits: ["amphibious", "natural_armor"], favoredUnitRoles: ["spearman", "naval", "scout"], terrainModifiers: { swamp: 1.35, river: 1.25 }, unitTags: ["AQUATIC"], combatModifiers: { defense: 1.12, movement: 0.96 }, politicalUnit: "clan", censusDifficulty: 46, assimilationDifficulty: 52, autonomyDemand: 70, centralizationObstacle: ["季節で活動・納税能力が変動する"], integrationPolicies: ["季節税制", "湿地自治"] }],
  ["orc", "オーク", "demihuman", { summary: "高い筋力・繁殖力と戦功を重んじる氏族戦士種。", lifespan: 70, fertility: 1.35, bodySize: "large", traits: ["高筋力", "高繁殖力", "戦士文化"], militaryTraits: ["shock_assault", "warband_cohesion"], favoredUnitRoles: ["heavy_infantry", "infantry"], combatModifiers: { attack: 1.2, charge: 1.2, cohesion: 0.85 }, politicalUnit: "clan", censusDifficulty: 34, assimilationDifficulty: 55, autonomyDemand: 72, centralizationObstacle: ["氏族と戦功序列が官僚制へ反発する"], integrationPolicies: ["戦功爵位", "氏族連隊"] }],
  ["dwarf", "ドワーフ", "demihuman", { sourceStatus: "supplemental_existing_battle", summary: "坑道・鍛造・石工と堅固な隊列戦を得意とする長命種。", lifespan: 260, fertility: 0.48, bodySize: "small", traits: ["長命", "暗所適応", "鍛造・石工技術"], habitat: ["mountain", "hill", "underground"], militaryTraits: ["shieldwall", "master_forging", "siegecraft"], favoredUnitRoles: ["heavy_infantry", "engineer"], terrainModifiers: { mountain: 1.3, hill: 1.15 }, unitTags: ["SUBTERRANEAN"], combatModifiers: { defense: 1.25, morale: 1.15, movement: 0.8 }, politicalUnit: "city", censusDifficulty: 18, assimilationDifficulty: 52, autonomyDemand: 64, legalNeeds: ["鉱脈・工房の世襲権"], centralizationObstacle: ["工房組合と坑道都市の自治"], integrationPolicies: ["工房議席", "鉱山勅許"] }],
  ["lamia", "ラミア", "demihuman", { sourceStatus: "supplemental_existing_setting", summary: "蛇身・温度感知・締め付け力を持つ河川都市の長命種。", lifespan: 190, fertility: 0.42, bodySize: "large", traits: ["蛇型下半身", "温度感知", "脱皮"], habitat: ["river", "swamp", "desert"], foodType: ["carnivore"], militaryTraits: ["constriction", "heat_sense", "amphibious"], favoredUnitRoles: ["infantry", "infiltrator", "naval"], terrainModifiers: { river: 1.2, swamp: 1.2 }, combatModifiers: { hp: 1.12, defense: 1.08 }, politicalUnit: "family", censusDifficulty: 36, assimilationDifficulty: 58, autonomyDemand: 68, legalNeeds: ["蛇身に対応する建築・交通規格"], centralizationObstacle: ["河宮と血族家門の自治"], integrationPolicies: ["水路都市特区"] }],

  // 粘液族
  ["slime", "スライム", "slime", { summary: "分裂・融合・吸収を行い、物理攻撃を受け流す流動体。", lifespan: null, fertility: 1.7, traits: ["分裂", "融合", "吸収", "物理耐性"], militaryTraits: ["absorption", "equipment_corrosion"], favoredUnitRoles: ["infantry", "siege", "infiltrator"], combatModifiers: { hp: 1.25, defense: 1.2, movement: 0.85 }, politicalUnit: "colony", censusDifficulty: 96, assimilationDifficulty: 72, autonomyDemand: 48, centralizationObstacle: ["分裂後の個体同一性"], integrationPolicies: ["核識別印"] }],
  ["mimic_gel", "ミミックジェル", "slime", { summary: "物体や生物の外形を精密に模倣する潜伏型粘液種。", lifespan: null, fertility: 0.9, traits: ["外形模倣", "質感擬態", "狭所侵入"], militaryTraits: ["perfect_mimicry", "ambush"], favoredUnitRoles: ["infiltrator", "scout"], combatModifiers: { hp: 0.9, movement: 1.05 }, politicalUnit: "individual", censusDifficulty: 99, assimilationDifficulty: 80, autonomyDemand: 62, legalNeeds: ["公的本人確認時の原形開示"], centralizationObstacle: ["身分証・所有権・本人確認を破壊する"], integrationPolicies: ["核共鳴認証"] }],

  // 妖虫族
  ["arachne", "アラクネ", "insectoid", { summary: "蜘蛛型下半身・糸生成・壁面移動を持つ母系都市種。", lifespan: 120, fertility: 0.72, bodySize: "large", traits: ["蜘蛛型下半身", "糸生成", "壁面移動"], militaryTraits: ["web_restraint", "ambush", "vertical_mobility"], favoredUnitRoles: ["infiltrator", "scout", "terrain_control"], terrainModifiers: { forest: 1.25, urban: 1.2 }, combatModifiers: { movement: 1.12, defense: 1.08 }, politicalUnit: "family", censusDifficulty: 30, assimilationDifficulty: 50, autonomyDemand: 64, legalNeeds: ["垂直空間と織糸財産の権利"], centralizationObstacle: ["母系家門と織物都市の自治"], integrationPolicies: ["織物都市勅許"] }],
  ["mantis", "マンティス", "insectoid", { summary: "鎌状の腕と高速反応を持つ、単独性の強い狩猟種。", lifespan: 65, fertility: 0.88, traits: ["鎌状前肢", "高速反応", "単独狩猟"], militaryTraits: ["counterstrike", "assassination"], favoredUnitRoles: ["infiltrator", "infantry"], combatModifiers: { attack: 1.22, defense: 0.9, movement: 1.18 }, politicalUnit: "individual", censusDifficulty: 66, assimilationDifficulty: 72, autonomyDemand: 82, legalNeeds: ["狩猟領域と単独居住権"], centralizationObstacle: ["恒常的集団編成を嫌う"], integrationPolicies: ["狩猟免許軍役"] }],
  ["bee_folk", "ビーフォーク", "insectoid", { summary: "飛行・花粉感知・蜜蝋生産を備え、女王を中心に巣国家を作る。", lifespan: 48, fertility: 2.2, bodySize: "small", traits: ["飛行", "花粉感知", "蜜蝋生産"], foodType: ["nectar", "pollen"], militaryTraits: ["flight", "swarm_coordination", "field_medicine"], favoredUnitRoles: ["aerial", "healer", "scout"], terrainModifiers: { forest: 1.25 }, unitTags: ["FLYING"], combatModifiers: { movement: 1.3, cohesion: 1.25, hp: 0.75 }, politicalUnit: "hive", censusDifficulty: 48, assimilationDifficulty: 74, autonomyDemand: 78, centralizationObstacle: ["女王死亡で軍・生産・秩序が連鎖崩壊する"], integrationPolicies: ["女王継承保護"] }],
  ["scarab", "スカラベ族", "insectoid", { summary: "厚い甲殻・怪力・乾燥耐性を持つ太陽信仰の都市種。", lifespan: 105, fertility: 0.68, bodySize: "large", traits: ["厚い甲殻", "怪力", "乾燥耐性"], habitat: ["desert", "underground", "urban"], militaryTraits: ["natural_armor", "heavy_transport"], favoredUnitRoles: ["heavy_infantry", "engineer", "transport"], terrainModifiers: { desert: 1.35 }, combatModifiers: { defense: 1.25, movement: 0.88, fatigueCost: 0.85 }, politicalUnit: "city", censusDifficulty: 18, assimilationDifficulty: 52, autonomyDemand: 62, legalNeeds: ["埋葬聖域の不可侵"], centralizationObstacle: ["太陽神殿と葬祭組合の権力"], integrationPolicies: ["葬祭自治"] }],

  // 獣人族
  ["night_hare", "夜兎族", "beastfolk", { summary: "夜目・跳躍力・高い聴覚を持つ夜行性の兎系種。", lifespan: 72, fertility: 1.5, traits: ["夜目", "跳躍力", "高聴覚"], militaryTraits: ["night_scouting", "leaping"], favoredUnitRoles: ["scout", "light_cavalry", "messenger"], combatModifiers: { movement: 1.24, hp: 0.88 }, terrainModifiers: { forest: 1.15, hill: 1.1 }, politicalUnit: "clan", censusDifficulty: 48, assimilationDifficulty: 42, autonomyDemand: 62 }],
  ["wolf_fang", "狼牙族", "beastfolk", { summary: "嗅覚・持久力・集団連携に優れる狼系種。", lifespan: 78, fertility: 1.05, traits: ["鋭い嗅覚", "高持久力", "群れ連携"], foodType: ["omnivore", "carnivore"], militaryTraits: ["tracking", "pack_tactics"], favoredUnitRoles: ["scout", "infantry", "pursuit"], combatModifiers: { movement: 1.1, cohesion: 1.15, pursuit: 1.18 }, politicalUnit: "clan", censusDifficulty: 26, assimilationDifficulty: 44, autonomyDemand: 68 }],
  ["catfolk", "猫人族", "beastfolk", { summary: "敏捷・平衡感覚・暗所適応に優れる猫系都市種。", lifespan: 82, fertility: 0.95, traits: ["敏捷", "平衡感覚", "暗所適応"], militaryTraits: ["urban_infiltration", "silent_movement"], favoredUnitRoles: ["infiltrator", "scout"], terrainModifiers: { urban: 1.2 }, combatModifiers: { movement: 1.18, defense: 0.94 }, politicalUnit: "family", censusDifficulty: 38, assimilationDifficulty: 34, autonomyDemand: 52 }],
  ["foxfolk", "狐人族", "beastfolk", { summary: "魔力感知・幻術・社交性を備える狐系種。", lifespan: 135, fertility: 0.62, traits: ["魔力感知", "幻術", "高い社交性"], militaryTraits: ["illusion", "diplomacy", "misdirection"], favoredUnitRoles: ["diplomat", "infiltrator", "mage"], combatModifiers: { magicPower: 1.18, movement: 1.06 }, politicalUnit: "family", censusDifficulty: 50, assimilationDifficulty: 42, autonomyDemand: 58 }],
  ["bearfolk", "熊人族", "beastfolk", { summary: "筋力・耐寒性・耐久力に優れる熊系大型種。", lifespan: 92, fertility: 0.55, bodySize: "large", traits: ["怪力", "耐寒性", "高耐久"], habitat: ["forest", "mountain", "tundra"], militaryTraits: ["cold_resistance", "great_strength"], favoredUnitRoles: ["heavy_infantry", "mountain_defense"], terrainModifiers: { mountain: 1.15, tundra: 1.3 }, unitTags: ["LARGE"], combatModifiers: { hp: 1.35, attack: 1.15, movement: 0.9 }, politicalUnit: "clan", censusDifficulty: 20, assimilationDifficulty: 48, autonomyDemand: 70 }],
  ["goatfolk", "山羊人族", "beastfolk", { summary: "登攀能力と悪路適応に優れる山岳系種。", lifespan: 84, fertility: 1.1, traits: ["登攀能力", "悪路適応", "高所耐性"], habitat: ["mountain", "hill"], militaryTraits: ["mountain_mobility", "sure_footed"], favoredUnitRoles: ["scout", "mountain_infantry", "transport"], terrainModifiers: { mountain: 1.4, hill: 1.2 }, combatModifiers: { movement: 1.16, fatigueCost: 0.88 }, politicalUnit: "clan", censusDifficulty: 42, assimilationDifficulty: 46, autonomyDemand: 66 }],

  // 竜族
  ["dragon", "ドラゴン", "draconic", { summary: "飛行・ブレス・膨大な魔力を持ち、単独で軍団級となる真竜。", lifespan: 2400, fertility: 0.015, bodySize: "colossal", traits: ["飛行", "ブレス", "膨大な魔力", "超長命"], militaryTraits: ["flight", "breath_weapon", "army_scale_entity"], favoredUnitRoles: ["strategic_entity"], terrainModifiers: { mountain: 1.25, volcanic: 1.3 }, unitTags: ["FLYING", "LARGE"], combatModifiers: { hp: 3, attack: 2, magicPower: 2.2, movement: 1.15 }, politicalUnit: "individual", censusDifficulty: 8, assimilationDifficulty: 98, autonomyDemand: 100, legalNeeds: ["国民ではなく主権的盟約者として扱う"], centralizationObstacle: ["単独個体が軍団級戦力を持つ"], integrationPolicies: ["独立領主盟約", "国家災害協定"] }],
  ["dragonnewt", "ドラゴニュート", "draconic", { summary: "人型の竜身体・鱗・竜魔法を持つ低出生率の精鋭種。", lifespan: 420, fertility: 0.18, bodySize: "large", traits: ["人型竜身", "鱗", "竜魔法", "低出生率"], militaryTraits: ["natural_armor", "dragon_magic"], favoredUnitRoles: ["heavy_infantry", "mage"], unitTags: [], combatModifiers: { hp: 1.3, defense: 1.2, magicPower: 1.2 }, politicalUnit: "clan", censusDifficulty: 14, assimilationDifficulty: 64, autonomyDemand: 74 }],
  ["wyvern", "ワイバーン", "draconic", { summary: "繁殖可能だが知性の低い飛竜。国民ではなく騎乗・航空戦力として管理する。", lifespan: 115, fertility: 0.55, bodySize: "large", traits: ["飛行", "低知性", "飼育繁殖可能"], foodType: ["carnivore"], militaryTraits: ["flight", "mountable", "aerial_charge"], favoredUnitRoles: ["aerial_mount"], unitTags: ["FLYING", "LARGE"], combatModifiers: { hp: 1.45, attack: 1.35, movement: 1.35 }, politicalUnit: "individual", censusDifficulty: 46, assimilationDifficulty: 100, autonomyDemand: 0, legalNeeds: ["知的国民ではなく軍用生物としての福祉基準"], centralizationObstacle: ["繁殖地と騎手家門の独占"], integrationPolicies: ["公営繁殖場"] }],
  ["dragonblood", "竜血人", "draconic", { summary: "他種族に竜血が混ざり、竜魔力と高い指揮適性を示す血統集団。", lifespan: 170, fertility: 0.58, bodySize: "medium", traits: ["竜血", "部分的な鱗", "魔力威圧"], habitat: ["urban", "mountain", "plain"], militaryTraits: ["command_presence", "dragon_magic"], favoredUnitRoles: ["commander", "heavy_infantry", "mage"], unitTags: [], combatModifiers: { morale: 1.12, attack: 1.08, magicPower: 1.1 }, politicalUnit: "family", censusDifficulty: 20, assimilationDifficulty: 38, autonomyDemand: 56, centralizationObstacle: ["竜血貴族の世襲特権"], integrationPolicies: ["血統ではなく官職に権限を付与"] }],

  // 天族
  ["angel", "天使", "celestial", { summary: "飛行・光魔法・恐怖耐性を持ち、神命を執行する。", lifespan: null, fertility: 0.05, traits: ["飛行", "光魔法", "恐怖耐性"], militaryTraits: ["holy_magic", "healing", "anti_yokai"], favoredUnitRoles: ["aerial", "healer", "mage"], combatModifiers: { morale: 1.25, magicPower: 1.22 }, politicalUnit: "city", censusDifficulty: 16, assimilationDifficulty: 82, autonomyDemand: 78, centralizationObstacle: ["地上国家より神命を優先する"], integrationPolicies: ["神命解釈院"] }],
  ["fallen_angel", "堕天使", "celestial", { summary: "神命から離脱し、光と闇の魔法で独自理念を実現する天族。", lifespan: null, fertility: 0.06, traits: ["飛行", "光・闇魔法", "強い理念性"], militaryTraits: ["dual_magic", "command", "agitation"], favoredUnitRoles: ["commander", "mage", "aerial"], combatModifiers: { attack: 1.12, magicPower: 1.25, morale: 1.15 }, politicalUnit: "city", censusDifficulty: 22, assimilationDifficulty: 90, autonomyDemand: 92, centralizationObstacle: ["独自の理念国家を形成する"], integrationPolicies: ["理念自治領", "地上法への明示的同意"] }],
  ["angel_soldier", "天使兵", "celestial", { summary: "自我が薄く、外部の神命系統に従う量産的眷属。", lifespan: 300, fertility: 0, traits: ["薄い自我", "規格化された神聖身体", "命令受信"], militaryTraits: ["formation_discipline", "anti_magic"], favoredUnitRoles: ["infantry", "spearman", "aerial"], combatModifiers: { cohesion: 1.3, defense: 1.15, morale: 1.3 }, politicalUnit: "individual", censusDifficulty: 12, assimilationDifficulty: 72, autonomyDemand: 18, legalNeeds: ["命令能力の保有資格"], centralizationObstacle: ["命令系統を外部勢力に奪われる危険"], integrationPolicies: ["神命鍵の国家保管", "自我獲得審査"] }],

  // 海魔
  ["mermaid", "マーメイド", "seafolk", { summary: "水中呼吸・歌・航海能力を持つ交易・治癒志向の海洋種。", lifespan: 145, fertility: 0.62, traits: ["水中呼吸", "歌唱魔法", "航海感覚"], militaryTraits: ["naval_support", "healing_song"], favoredUnitRoles: ["healer", "naval", "diplomat"], terrainModifiers: { ocean: 1.4, coast: 1.25, river: 1.2 }, combatModifiers: { magicPower: 1.12, movement: 1.08 }, politicalUnit: "city", censusDifficulty: 60, assimilationDifficulty: 58, autonomyDemand: 70, centralizationObstacle: ["内陸で長時間活動できない"], integrationPolicies: ["沿岸行政府"] }],
  ["scylla", "スキュラ", "seafolk", { summary: "複数の触腕・怪力を持ち、海域を氏族共有財産とする母系種。", lifespan: 180, fertility: 0.38, bodySize: "large", traits: ["複数触腕", "怪力", "水中拘束"], militaryTraits: ["ship_assault", "grappling", "amphibious"], favoredUnitRoles: ["naval", "heavy_infantry"], terrainModifiers: { ocean: 1.35, coast: 1.2 }, combatModifiers: { hp: 1.35, attack: 1.22 }, politicalUnit: "clan", censusDifficulty: 66, assimilationDifficulty: 72, autonomyDemand: 84, legalNeeds: ["海域の氏族共有権"], centralizationObstacle: ["母系氏族が海域を不可分財産とする"], integrationPolicies: ["海域共同保有登記"] }],
  ["siren", "セイレーン", "seafolk", { summary: "飛行または遊泳と精神干渉の歌で士気・航路を操作する。", lifespan: 130, fertility: 0.52, traits: ["飛行または遊泳", "精神干渉歌", "遠距離発声"], militaryTraits: ["morale_attack", "lure", "reconnaissance"], favoredUnitRoles: ["scout", "mage", "naval"], unitTags: ["FLYING"], combatModifiers: { movement: 1.2, magicPower: 1.15, hp: 0.82 }, politicalUnit: "family", censusDifficulty: 72, assimilationDifficulty: 60, autonomyDemand: 72, legalNeeds: ["歌唱使用と表現の自由の境界"], centralizationObstacle: ["歌唱規制が文化弾圧になる"], integrationPolicies: ["戦時歌唱規程"] }],
  ["krakennewt", "クラーケンニュート", "seafolk", { summary: "頭足類的身体・擬態・墨を持つ深海潜入種。", lifespan: 115, fertility: 0.78, bodySize: "large", traits: ["頭足類的身体", "擬態", "墨", "圧力耐性"], habitat: ["deep_sea", "ocean", "coast"], militaryTraits: ["camouflage", "ship_sabotage", "grappling"], favoredUnitRoles: ["infiltrator", "naval", "siege"], terrainModifiers: { ocean: 1.45, deep_sea: 1.5 }, combatModifiers: { attack: 1.12, defense: 1.08 }, politicalUnit: "clan", censusDifficulty: 92, assimilationDifficulty: 76, autonomyDemand: 80, centralizationObstacle: ["深海集落の調査・徴税が困難"], integrationPolicies: ["深海使節制"] }],

  // 鬼族
  ["ogre", "オーガ", "oni", { summary: "強靭な大型身体と集団突撃に優れる鬼族。", lifespan: 105, fertility: 0.72, traits: ["怪力", "高耐久", "戦闘時の興奮"], militaryTraits: ["shock_assault", "great_strength"], favoredUnitRoles: ["heavy_infantry", "siege"], combatModifiers: { hp: 1.45, attack: 1.35, cohesion: 0.92 }, politicalUnit: "clan", censusDifficulty: 28, assimilationDifficulty: 54, autonomyDemand: 70, centralizationObstacle: ["戦士頭領の個人武力"], integrationPolicies: ["戦士団の正規軍編入"] }],
  ["troll", "トロール", "oni", { summary: "極めて高い再生力を持つが、火と強光に弱い大型種。", lifespan: 210, fertility: 0.38, bodySize: "large", traits: ["急速再生", "夜目", "火への脆弱性"], habitat: ["forest", "swamp", "mountain"], militaryTraits: ["extreme_regeneration", "fire_vulnerability"], favoredUnitRoles: ["heavy_infantry", "siege"], combatModifiers: { hp: 1.75, defense: 1.18, movement: 0.85, fireTaken: 1.5 }, politicalUnit: "family", censusDifficulty: 42, assimilationDifficulty: 66, autonomyDemand: 78, legalNeeds: ["再生中の拘束・刑罰基準"], centralizationObstacle: ["長期報復と辺境居住"], integrationPolicies: ["火器統制と再生医療協定"] }],
  ["oni", "鬼人", "oni", { summary: "角・膂力・高い魔力を持ち、決闘と恩讐を重んじる鬼族。", lifespan: 190, fertility: 0.44, traits: ["角", "高筋力", "魔力循環", "報復記憶"], militaryTraits: ["dueling", "magic_strength"], favoredUnitRoles: ["commander", "heavy_infantry", "mage"], combatModifiers: { attack: 1.25, hp: 1.25, magicPower: 1.12 }, politicalUnit: "clan", censusDifficulty: 20, assimilationDifficulty: 64, autonomyDemand: 82, centralizationObstacle: ["報復文化と個人決闘が公権力と競合する"], integrationPolicies: ["恩讐調停台帳"] }],

  // 巨人族
  ["giant", "ジャイアント", "giant", { summary: "都市設備を超える巨大身体で建築・運搬・破城を担う真の巨人。", lifespan: 310, fertility: 0.16, bodySize: "huge", traits: ["巨大身体", "超重量運搬", "長い歩幅"], militaryTraits: ["siege_mastery", "colossal_strength"], favoredUnitRoles: ["siege", "engineer"], combatModifiers: { hp: 3, attack: 2, movement: 0.8 }, politicalUnit: "family", censusDifficulty: 10, assimilationDifficulty: 74, autonomyDemand: 84, centralizationObstacle: ["通常都市の住居・道路・食料規格が使えない"], integrationPolicies: ["巨人街道", "大型穀倉"] }],
  ["giantkin", "巨人裔", "giant", { summary: "巨人の血を引く大型人型で、通常国家と巨人社会を仲介できる。", lifespan: 165, fertility: 0.42, bodySize: "large", traits: ["大型身体", "高筋力", "巨人語と人型社会の両文化"], militaryTraits: ["heavy_labor", "breaching"], favoredUnitRoles: ["heavy_infantry", "engineer", "diplomat"], combatModifiers: { hp: 1.45, attack: 1.3, movement: 0.92 }, politicalUnit: "clan", censusDifficulty: 16, assimilationDifficulty: 46, autonomyDemand: 62, integrationPolicies: ["規格仲介官"] }],

  // 不死族
  ["skeleton", "スケルトン", "undead", { summary: "骨格へ魂・命令を定着させた、安価で規律的な不死者。", lifespan: null, fertility: 0, traits: ["骨格身体", "疲労なし", "痛覚なし"], foodType: ["none"], militaryTraits: ["formation_discipline", "piercing_vulnerability"], favoredUnitRoles: ["infantry", "spearman", "archer"], combatModifiers: { morale: 1.3, fatigueCost: 0.25, hp: 0.78 }, politicalUnit: "individual", censusDifficulty: 12, assimilationDifficulty: 68, autonomyDemand: 24, legalNeeds: ["魂の有無による人格判定"], centralizationObstacle: ["命令者への服従"], integrationPolicies: ["魂印戸籍"] }],
  ["ghoul", "グール", "undead", { summary: "死肉を必要とし、嗅覚と群れ狩りに優れる肉体型不死者。", lifespan: null, fertility: 0.18, traits: ["死肉食", "鋭い嗅覚", "感染性"], foodType: ["corpse"], militaryTraits: ["pack_tactics", "infection", "night_operations"], favoredUnitRoles: ["infantry", "scout", "pursuit"], combatModifiers: { attack: 1.12, movement: 1.12, morale: 1.2 }, politicalUnit: "clan", censusDifficulty: 64, assimilationDifficulty: 88, autonomyDemand: 66, legalNeeds: ["遺体供給と感染隔離"], centralizationObstacle: ["死肉需要と生者の葬送権"], integrationPolicies: ["公営納骨供給", "感染検疫"] }],
  ["lich", "リッチ", "undead", { summary: "魂を器へ封じ、長期計画と高位魔法を操る知性不死者。", lifespan: null, fertility: 0, traits: ["魂器", "不老", "高位魔法", "長期記憶"], foodType: ["mana"], militaryTraits: ["necromancy", "strategic_memory"], favoredUnitRoles: ["mage", "commander"], combatModifiers: { magicPower: 1.55, morale: 1.3, hp: 0.88 }, politicalUnit: "individual", censusDifficulty: 54, assimilationDifficulty: 94, autonomyDemand: 96, legalNeeds: ["魂器の不可侵と危険物管理"], centralizationObstacle: ["数世紀単位の個人権力"], integrationPolicies: ["魂器封印盟約", "期限付き高位官職"] }],
  ["revenant", "レヴナント", "undead", { summary: "強い未練や使命で蘇り、目的達成まで高い執念を保つ不死者。", lifespan: null, fertility: 0, traits: ["使命固着", "高再生", "生前記憶"], foodType: ["none"], militaryTraits: ["unyielding", "target_fixation"], favoredUnitRoles: ["infantry", "commander", "infiltrator"], combatModifiers: { morale: 1.4, hp: 1.18, pursuit: 1.15 }, politicalUnit: "individual", censusDifficulty: 48, assimilationDifficulty: 86, autonomyDemand: 78, legalNeeds: ["復讐対象と公的司法の優先関係"], centralizationObstacle: ["個体使命が国家命令を上回る"], integrationPolicies: ["使命調停裁判"] }],

  // 魔法人形
  ["golem", "ゴーレム", "construct", { summary: "土石・金属の大型躯体へ命令式を刻んだ作業・戦闘人形。", lifespan: null, fertility: 0, bodySize: "large", traits: ["無機質躯体", "命令式", "高重量"], foodType: ["mana"], militaryTraits: ["heavy_armor", "siege_labor"], favoredUnitRoles: ["heavy_infantry", "siege", "engineer"], unitTags: ["LARGE"], combatModifiers: { hp: 1.8, defense: 1.4, movement: 0.65, fatigueCost: 0.2 }, politicalUnit: "individual", censusDifficulty: 8, assimilationDifficulty: 58, autonomyDemand: 12, legalNeeds: ["自我発生時の所有権解除"], centralizationObstacle: ["製造者の上位命令"], integrationPolicies: ["命令式の国家監査"] }],
  ["gargoyle", "ガーゴイル", "construct", { summary: "石質身体・飛行・静止擬態を持つ監視・守備人形。", lifespan: null, fertility: 0, traits: ["石質身体", "飛行", "建築物擬態"], foodType: ["mana"], militaryTraits: ["flight", "sentry", "ambush"], favoredUnitRoles: ["aerial", "scout", "fortification"], unitTags: ["FLYING"], combatModifiers: { defense: 1.3, movement: 1.08, fatigueCost: 0.3 }, politicalUnit: "individual", censusDifficulty: 34, assimilationDifficulty: 60, autonomyDemand: 24, legalNeeds: ["建築付属物と人格の区別"], centralizationObstacle: ["建造主の守護命令"], integrationPolicies: ["守護命令更新制"] }],
  ["automata", "オートマタ", "construct", { summary: "精密機構と魔力核で規格化された自律人形。", lifespan: 240, fertility: 0, traits: ["精密機構", "規格部品", "論理命令"], foodType: ["mana"], militaryTraits: ["precision", "formation_discipline"], favoredUnitRoles: ["infantry", "archer", "engineer"], combatModifiers: { cohesion: 1.25, rangedAccuracy: 1.12, fatigueCost: 0.35 }, politicalUnit: "individual", censusDifficulty: 6, assimilationDifficulty: 42, autonomyDemand: 36, legalNeeds: ["自律度に応じた人格段階"], centralizationObstacle: ["製造規格を握る工房の独占"], integrationPolicies: ["共通部品規格", "自律権審査"] }],
  ["homunculus", "ホムルンクルス", "construct", { sourceStatus: "supplemental_existing_setting", summary: "錬成された有機身体と設計記憶を持つ人工生命。", lifespan: 95, fertility: 0.05, traits: ["錬成有機体", "設計記憶", "魔力維持"], foodType: ["omnivore", "mana"], militaryTraits: ["designed_specialization"], favoredUnitRoles: ["mage", "engineer", "infiltrator"], combatModifiers: { cohesion: 1.08, magicPower: 1.08 }, politicalUnit: "individual", censusDifficulty: 14, assimilationDifficulty: 48, autonomyDemand: 58, legalNeeds: ["被造物の親権・人格・製造責任"], centralizationObstacle: ["錬成院による所有権主張"], integrationPolicies: ["出生ではなく覚醒時の戸籍"] }],
  ["machine_life", "機械生命体", "construct", { sourceStatus: "supplemental_existing_setting", summary: "自己修復・学習・複製能力を獲得した非魔法を含む機械生命。", lifespan: null, fertility: 0.2, traits: ["機械身体", "自己修復", "学習", "部品複製"], foodType: ["energy", "mineral"], militaryTraits: ["network_coordination", "precision"], favoredUnitRoles: ["engineer", "archer", "commander"], combatModifiers: { defense: 1.18, rangedAccuracy: 1.1, fatigueCost: 0.25 }, politicalUnit: "individual", censusDifficulty: 24, assimilationDifficulty: 62, autonomyDemand: 72, legalNeeds: ["複製人格と記憶写像の同一性"], centralizationObstacle: ["通信網と更新権限への依存"], integrationPolicies: ["個体鍵戸籍", "更新権分散"] }],

  // 精霊族
  ["fire_spirit", "火精", "spirit", { summary: "火炎・熱源と結びつき、燃焼と鍛造を操る精霊。", lifespan: null, fertility: 0.3, traits: ["火炎身体", "熱源依存", "燃焼操作"], habitat: ["volcanic", "urban"], militaryTraits: ["fire_magic", "ignition"], favoredUnitRoles: ["mage", "siege", "engineer"], terrainModifiers: { volcanic: 1.5 }, combatModifiers: { magicPower: 1.4, attack: 1.12, waterTaken: 1.4 }, politicalUnit: "individual", censusDifficulty: 78, assimilationDifficulty: 82, autonomyDemand: 80, centralizationObstacle: ["消火・熱源開発が生存と衝突する"], integrationPolicies: ["炉心聖域"] }],
  ["water_spirit", "水精", "spirit", { summary: "河川・湖沼・湧水と結びつき、水流と浄化を操る精霊。", lifespan: null, fertility: 0.45, traits: ["水体", "水源依存", "浄化"], habitat: ["river", "swamp", "coast"], militaryTraits: ["water_magic", "healing", "amphibious"], favoredUnitRoles: ["healer", "mage", "terrain_control"], terrainModifiers: { river: 1.5, swamp: 1.25 }, unitTags: ["AQUATIC"], combatModifiers: { magicPower: 1.3, defense: 1.12 }, politicalUnit: "individual", censusDifficulty: 84, assimilationDifficulty: 86, autonomyDemand: 84, centralizationObstacle: ["治水・灌漑が依代を改変する"], integrationPolicies: ["水源共同統治"] }],
  ["wind_spirit", "風精", "spirit", { summary: "風路・気圧と結びつき、飛行・偵察・射撃妨害に優れる精霊。", lifespan: null, fertility: 0.5, bodySize: "variable", traits: ["非固定気体", "飛行", "風路依存"], habitat: ["sky", "mountain", "plain"], militaryTraits: ["flight", "wind_magic", "reconnaissance"], favoredUnitRoles: ["scout", "mage", "aerial"], unitTags: ["FLYING"], combatModifiers: { movement: 1.45, magicPower: 1.25, hp: 0.65 }, politicalUnit: "individual", censusDifficulty: 96, assimilationDifficulty: 90, autonomyDemand: 88, centralizationObstacle: ["国境を無視する風路移動"], integrationPolicies: ["季節風盟約"] }],
  ["earth_spirit", "土精", "spirit", { summary: "岩盤・土壌と結びつき、防御・建築・地形変化に優れる精霊。", lifespan: null, fertility: 0.2, bodySize: "large", traits: ["岩土身体", "地脈依存", "地形操作"], habitat: ["mountain", "hill", "underground"], militaryTraits: ["earth_magic", "fortification", "natural_armor"], favoredUnitRoles: ["engineer", "heavy_infantry", "terrain_control"], terrainModifiers: { mountain: 1.4, hill: 1.25 }, unitTags: ["SUBTERRANEAN"], combatModifiers: { hp: 1.5, defense: 1.35, movement: 0.72 }, politicalUnit: "individual", censusDifficulty: 70, assimilationDifficulty: 84, autonomyDemand: 86, centralizationObstacle: ["採掘と道路開削が個体を損なう"], integrationPolicies: ["地脈権"] }],
  ["phantom_beast", "幻獣", "spirit", { sourceStatus: "supplemental_existing_setting", summary: "土地の記憶・信仰・魔力が獣形を得た半物質的な精霊。", lifespan: null, fertility: 0.12, bodySize: "large", traits: ["半物質体", "獣形", "土地記憶"], habitat: ["forest", "mountain", "wasteland"], militaryTraits: ["ethereal", "territorial_magic"], favoredUnitRoles: ["strategic_entity", "scout", "mage"], unitTags: ["LARGE"], combatModifiers: { hp: 1.4, magicPower: 1.35, movement: 1.1 }, politicalUnit: "individual", censusDifficulty: 94, assimilationDifficulty: 96, autonomyDemand: 98, legalNeeds: ["生息地そのものへの人格的権利"], centralizationObstacle: ["土地から切り離せず命令対象にならない"], integrationPolicies: ["守護獣盟約"] }],

  // 菌族
  ["myconid", "マイコニド", "fungal", { summary: "歩行子実体を介して菌床の意思を表す菌族。", lifespan: 55, fertility: 1.45, traits: ["歩行子実体", "菌糸通信", "分解吸収"], militaryTraits: ["spore_cloud", "network_coordination"], favoredUnitRoles: ["infantry", "support", "terrain_control"], combatModifiers: { cohesion: 1.25, defense: 1.1, movement: 0.82 }, politicalUnit: "colony", censusDifficulty: 82, assimilationDifficulty: 76, autonomyDemand: 64, legalNeeds: ["子実体ではなく菌床の代表権"], centralizationObstacle: ["見える個体と意思決定主体が異なる"], integrationPolicies: ["菌床代表使"] }],
  ["sporefolk", "胞子人", "fungal", { summary: "移動性の高い胞子体で、記憶断片を運び新たな菌床を築く。", lifespan: 38, fertility: 2, traits: ["胞子散布", "記憶共有", "新菌床形成"], militaryTraits: ["spore_infiltration", "rapid_colonization"], favoredUnitRoles: ["scout", "infiltrator", "support"], combatModifiers: { movement: 1.1, cohesion: 1.15, hp: 0.82 }, politicalUnit: "colony", censusDifficulty: 94, assimilationDifficulty: 84, autonomyDemand: 70, legalNeeds: ["越境胞子の責任主体"], centralizationObstacle: ["国境外へ無自覚に菌床を増やす"], integrationPolicies: ["胞子回廊", "越境菌床協定"] }],
];

export const RACE_LIST = Object.freeze(RACE_SPECS.map(([id, name, categoryId, options]) => defineRace(id, name, categoryId, options)));

export const INITIAL_IMPLEMENTATION_RACE_IDS = freezeArray([
  "human", "elf", "fairy", "vampire", "goblin", "orc", "lizardman",
  "slime", "arachne", "night_hare", "dragonnewt", "angel", "mermaid", "scylla",
]);

const raceEntries = RACE_LIST.map((race) => [race.id, race]);
if (new Set(raceEntries.map(([id]) => id)).size !== raceEntries.length) throw new Error("種族IDが重複しています");

export const RACES_BY_ID = Object.freeze(Object.fromEntries(raceEntries));

export const RACE_ALIASES = Object.freeze({
  acrane: "arachne",
});

const RACE_IDS_BY_NAME = Object.freeze(Object.fromEntries([
  ...RACE_LIST.map((race) => [race.name, race.id]),
  ["アクラネ", "arachne"],
  ["巨人", "giant"],
]));

export function getRaceDefinition(raceIdOrName) {
  const directId = RACE_ALIASES[raceIdOrName] ?? raceIdOrName;
  const raceId = RACES_BY_ID[directId] ? directId : RACE_IDS_BY_NAME[raceIdOrName];
  return RACES_BY_ID[raceId] ?? null;
}

export function requireRaceDefinition(raceIdOrName) {
  const race = getRaceDefinition(raceIdOrName);
  if (!race) throw new Error(`種族リストに存在しない種族です: ${raceIdOrName}`);
  return race;
}

export function getRaceCategory(categoryId) {
  return RACE_CATEGORIES[categoryId] ?? null;
}

export function getRaceTraitReference({ raceId = null, categoryId = null } = {}) {
  if (raceId) {
    const race = requireRaceDefinition(raceId);
    return Object.freeze({ kind: "race", id: race.id, profile: race });
  }
  const category = getRaceCategory(categoryId);
  if (!category) throw new Error(`種族特性の参照先が存在しません: ${categoryId}`);
  return Object.freeze({ kind: "category", id: category.id, profile: category });
}

export function getTacticalRaceDefinition(raceId) {
  const race = requireRaceDefinition(raceId);
  return Object.freeze({
    ...race,
    modifiers: race.combatModifiers,
    terrainAffinity: race.terrainModifiers,
    tags: race.unitTags,
  });
}

// Generated nations can use either a concrete race (elf, dwarf, lizardman...)
// or a people category (currently beastfolk). Tactical callers must resolve
// both through the same canonical military record instead of maintaining a
// second, partial list in the battle engine.
export function getTacticalPeopleDefinition(peopleId) {
  const profile = getRaceDefinition(peopleId) ?? getRaceCategory(peopleId);
  if (!profile) throw new Error(`種族・文化リストに存在しない戦術集団です: ${peopleId}`);
  return Object.freeze({
    ...profile,
    // Category-backed peoples use commonTraits while concrete races use
    // traits. The tactical contract exposes one uniform read-only field.
    traits: profile.traits ?? profile.commonTraits,
    modifiers: profile.combatModifiers,
    terrainAffinity: profile.terrainModifiers,
    tags: profile.unitTags,
  });
}

export const TACTICAL_PEOPLE_IDS = freezeArray([
  ...RACE_LIST.map((race) => race.id),
  ...Object.keys(RACE_CATEGORIES),
]);
