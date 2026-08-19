const GENERATED_NATION_PEOPLE_IDS = Object.freeze([
  "human", "beastfolk", "dwarf", "elf", "lizardman", "goblin", "giant",
]);

const VALID_UNIT_CLASSES = new Set([
  "infantry", "spearman", "heavy_infantry", "cavalry", "light_cavalry", "archer", "mage", "engineer",
]);

function freezeModifiers(modifiers = {}) {
  return Object.freeze({ ...modifiers });
}

function defineTemplate(definition) {
  if (!VALID_UNIT_CLASSES.has(definition.unitClassId)) throw new Error(`国家部隊の兵科が不正です: ${definition.unitClassId}`);
  return Object.freeze({
    weight: 1,
    order: "attack",
    experience: 38,
    ...definition,
    modifiers: freezeModifiers(definition.modifiers),
    terrainModifiers: Object.freeze(Object.fromEntries(
      Object.entries(definition.terrainModifiers ?? {}).map(([terrainId, modifiers]) => [terrainId, freezeModifiers(modifiers)]),
    )),
    tags: Object.freeze([...(definition.tags ?? [])]),
    magicSkillIds: definition.magicSkillIds ? Object.freeze([...definition.magicSkillIds]) : null,
  });
}

function defineProfile(definition) {
  const templates = definition.templates.map(defineTemplate);
  if (templates.length < 3) throw new Error(`${definition.name}には3種以上の国家部隊が必要です`);
  if (new Set(templates.map((template) => template.id)).size !== templates.length) throw new Error(`${definition.name}の部隊IDが重複しています`);
  return Object.freeze({
    ...definition,
    strengths: Object.freeze([...definition.strengths]),
    risks: Object.freeze([...definition.risks]),
    templates: Object.freeze(templates),
  });
}

export const NATIONAL_UNIT_PROFILES = Object.freeze({
  human: defineProfile({
    id: "human", peopleId: "human", name: "人間諸侯軍", doctrineName: "諸兵科連携",
    doctrineSummary: "盾槍の戦列で敵を拘束し、弓と騎兵を状況に応じて差し替える制度軍。",
    formationId: "line", forceSizeMultiplier: 1,
    strengths: ["兵科の穴が少ない", "指揮下で安定", "平地の正面戦"],
    risks: ["極端な地形では専門軍に劣る", "補給線を失うと特色を出しにくい"],
    templates: [
      { id: "charter-infantry", unitClassId: "infantry", name: "勅許戦列歩兵", traitName: "隊列交代", traitDescription: "標準化した盾列を交代させ、長い正面戦を安定させる。", strength: "攻防と結束が安定", risk: "突出した突破力はない", modifiers: { attack: 1.03, defense: 1.04, cohesion: 1.04 }, weight: 1.15, order: "advance", experience: 42 },
      { id: "banner-spears", unitClassId: "spearman", name: "旗本盾槍隊", traitName: "旗列迎撃", traitDescription: "軍旗を基準に密集し、騎兵と大型兵の突入を受け止める。", strength: "正面迎撃", risk: "移動戦に弱い", modifiers: { brace: 1.08, defense: 1.03 }, weight: 1, order: "defend", experience: 40 },
      { id: "household-cavalry", unitClassId: "cavalry", name: "諸侯近衛騎兵", traitName: "予備投入", traitDescription: "戦列が敵を拘束してから側面へ投入される決戦予備。", strength: "平地の側面突撃", risk: "悪路と長期戦", modifiers: { charge: 1.08, defense: 0.97, supplyConsumption: 1.06 }, weight: 0.7, order: "attack", experience: 46 },
      { id: "siege-artisans", unitClassId: "engineer", name: "築城職人隊", traitName: "規格築城", traitDescription: "各都市の職人規格を揃え、防柵と橋を短時間で施工する。", strength: "汎用工兵", risk: "直接戦闘", modifiers: { engineering: 1.08 }, weight: 0.75, order: "defend", experience: 38 },
    ],
  }),
  beastfolk: defineProfile({
    id: "beastfolk", peopleId: "beastfolk", name: "森林氏族戦団", doctrineName: "群れ狩り包囲",
    doctrineSummary: "森の感覚と小集団連携で敵を追跡し、射撃と軽騎で包囲を狭める。",
    formationId: "wedge", forceSizeMultiplier: 0.84,
    strengths: ["森林機動", "追跡と側面攻撃", "低い補給負担"],
    risks: ["重装正面戦", "城砦への攻撃"],
    templates: [
      { id: "pack-riders", unitClassId: "light_cavalry", name: "群れ走り騎兵", traitName: "獲物追い", traitDescription: "森縁から退路へ回り、崩れた敵を逃さず追う。", strength: "機動・追撃", risk: "槍壁と正面戦", modifiers: { movement: 1.06, pursuit: 1.12, defense: 0.94, supplyConsumption: 0.9 }, terrainModifiers: { forest: { movement: 1.1, attack: 1.05 } }, weight: 0.8, order: "pursue", experience: 44 },
      { id: "canopy-hunters", unitClassId: "archer", name: "樹冠狩人隊", traitName: "葉陰射撃", traitDescription: "視界の切れ目を共有し、森林内でも射線を作る。", strength: "森林射撃", risk: "接近されると脆い", modifiers: { rangedAccuracy: 1.05, defense: 0.96, supplyConsumption: 0.92 }, terrainModifiers: { forest: { rangedAccuracy: 1.12, defense: 1.06 } }, weight: 1, order: "attack", experience: 43 },
      { id: "claw-shields", unitClassId: "infantry", name: "牙盾氏族兵", traitName: "群れ交代", traitDescription: "負傷者を即座に後列へ送り、氏族単位で戦線をつなぐ。", strength: "結束と森林防御", risk: "平地火力", modifiers: { cohesion: 1.06, supplyConsumption: 0.94 }, terrainModifiers: { forest: { defense: 1.08, movement: 1.06 } }, weight: 1.1, order: "advance", experience: 39 },
      { id: "trail-spears", unitClassId: "spearman", name: "獣道長槍隊", traitName: "狭路封鎖", traitDescription: "獣道の狭い出口に槍列を置き、大型兵を止める。", strength: "森の迎撃", risk: "開けた側面", modifiers: { brace: 1.06 }, terrainModifiers: { forest: { defense: 1.08 } }, weight: 0.9, order: "defend", experience: 38 },
    ],
  }),
  dwarf: defineProfile({
    id: "dwarf", peopleId: "dwarf", name: "坑道都市軍", doctrineName: "盾壁と工兵路",
    doctrineSummary: "重い盾壁を工兵が支え、丘陵と坑道口を一歩ずつ確保する持久軍。",
    formationId: "guarded", forceSizeMultiplier: 0.92,
    strengths: ["高い防御", "丘陵・山岳", "工兵と低疲労"],
    risks: ["追撃能力", "広い平地での機動"],
    templates: [
      { id: "vault-guard", unitClassId: "heavy_infantry", name: "坑門重装衛隊", traitName: "坑門盾壁", traitDescription: "大型盾を連結し、後退せず坑道口を塞ぐ。", strength: "最高水準の正面防御", risk: "極端に遅い", modifiers: { defense: 1.06, durabilityPerSoldier: 1.08, movement: 0.92, fatigueCost: 0.92 }, terrainModifiers: { hill: { defense: 1.08 }, mountain: { defense: 1.1 } }, weight: 1.15, order: "advance", experience: 48 },
      { id: "deep-pikes", unitClassId: "spearman", name: "深層長槍隊", traitName: "段差迎撃", traitDescription: "坑道の段差へ槍床を固定し、突撃と大型兵を止める。", strength: "大型・騎兵迎撃", risk: "配置転換", modifiers: { brace: 1.12, movement: 0.94 }, terrainModifiers: { hill: { defense: 1.06 } }, weight: 1, order: "defend", experience: 44 },
      { id: "sapper-guild", unitClassId: "engineer", name: "測坑工兵組合", traitName: "岩盤測量", traitDescription: "地盤を読み、防柵・塹壕・架橋を崩れない位置へ置く。", strength: "工兵効果と持久", risk: "遠隔火力", modifiers: { engineering: 1.16, defense: 1.04, fatigueCost: 0.9 }, weight: 0.85, order: "defend", experience: 46 },
      { id: "crank-bows", unitClassId: "archer", name: "巻上弩兵隊", traitName: "据置射撃", traitDescription: "重い巻上弩を防御陣地へ据え、接近する重装兵を狙う。", strength: "陣地射撃", risk: "移動射撃", modifiers: { rangedAttack: 1.06, movement: 0.9 }, terrainModifiers: { hill: { range: 1.06 } }, weight: 0.85, order: "attack", experience: 42 },
    ],
  }),
  elf: defineProfile({
    id: "elf", peopleId: "elf", name: "森王庭軍", doctrineName: "射界支配",
    doctrineSummary: "長弓と魔術で接敵前に戦場を整え、森の射線を保ったまま後退と再射撃を行う。",
    formationId: "line", forceSizeMultiplier: 0.84,
    strengths: ["長距離射撃", "森林機動", "魔術支援"],
    risks: ["低い耐久", "近接の消耗戦"],
    templates: [
      { id: "court-longbows", unitClassId: "archer", name: "王庭長弓隊", traitName: "連続射界", traitDescription: "互いの射線を重ね、近づく前から敵の士気を削る。", strength: "射程と命中", risk: "白兵戦", modifiers: { rangedAttack: 1.06, range: 1.05, defense: 0.94 }, terrainModifiers: { forest: { rangedAccuracy: 1.08, movement: 1.06 } }, weight: 1.1, order: "attack", experience: 47 },
      { id: "grove-mages", unitClassId: "mage", name: "樹環魔導隊", traitName: "樹環共鳴", traitDescription: "森の魔力を循環させ、妨害と治癒を連鎖させる。", strength: "魔術出力", risk: "集中攻撃", modifiers: { magicPower: 1.08, hp: 0.96, supplyConsumption: 1.06 }, terrainModifiers: { forest: { magicPower: 1.08, defense: 1.05 } }, magicSkillIds: ["wind", "ice", "heal", "earth"], weight: 0.8, order: "attack", experience: 49 },
      { id: "thorn-spears", unitClassId: "spearman", name: "茨衛槍兵隊", traitName: "射手護衛", traitDescription: "射手の前だけを短く守り、敵が止まった瞬間に戦列を戻す。", strength: "後衛防護", risk: "単独攻勢", modifiers: { brace: 1.08, attack: 0.96, cohesion: 1.04 }, terrainModifiers: { forest: { defense: 1.06 } }, weight: 1, order: "defend", experience: 42 },
      { id: "silver-riders", unitClassId: "light_cavalry", name: "銀葉軽騎隊", traitName: "射界誘導", traitDescription: "敵の側面を脅かして長弓の射界へ追い込む。", strength: "誘導と追撃", risk: "重騎兵との正面戦", modifiers: { movement: 1.05, pursuit: 1.06, defense: 0.93 }, terrainModifiers: { forest: { movement: 1.08 } }, weight: 0.7, order: "pursue", experience: 45 },
    ],
  }),
  lizardman: defineProfile({
    id: "lizardman", peopleId: "lizardman", name: "水郷氏族軍", doctrineName: "水路伏撃",
    doctrineSummary: "河川と湿地を通路として使い、槍列と遊撃兵が渡河中の敵を分断する。",
    formationId: "guarded", forceSizeMultiplier: 1,
    strengths: ["河川を直接通行", "湿地防御", "渡河点迎撃"],
    risks: ["乾いた平地の追撃", "長距離射撃"],
    templates: [
      { id: "reed-spears", unitClassId: "spearman", name: "葦原長槍隊", traitName: "水際槍床", traitDescription: "水面下へ槍床を隠し、渡河した敵を正面で止める。", strength: "河川・湿地の迎撃", risk: "平地の側面機動", modifiers: { brace: 1.1, defense: 1.03 }, terrainModifiers: { swamp: { defense: 1.1, attack: 1.05 }, river: { defense: 1.08 } }, weight: 1.1, order: "defend", experience: 43 },
      { id: "marsh-runners", unitClassId: "light_cavalry", name: "沼走り遊撃隊", traitName: "水路迂回", traitDescription: "浅い水路を横切り、通常軍が使えない経路から背面へ出る。", strength: "湿地機動と追撃", risk: "乾燥平地の騎兵戦", modifiers: { pursuit: 1.08, defense: 0.95 }, terrainModifiers: { swamp: { movement: 1.16, attack: 1.06 }, river: { movement: 1.1 } }, weight: 0.75, order: "pursue", experience: 41 },
      { id: "tide-callers", unitClassId: "mage", name: "潮呼び呪術隊", traitName: "湿地転用", traitDescription: "氷・治癒・土壁で水際の通路そのものを作り替える。", strength: "地形制御", risk: "直接攻撃力", modifiers: { magicPower: 1.05, defense: 1.02 }, terrainModifiers: { swamp: { magicPower: 1.08 }, river: { magicPower: 1.06 } }, magicSkillIds: ["arcane_bolt", "ice", "heal", "earth"], weight: 0.75, order: "attack", experience: 44 },
      { id: "scale-shields", unitClassId: "infantry", name: "鱗盾氏族兵", traitName: "半水陣", traitDescription: "腰まで水へ入り、陸上の敵より安定した盾列を組む。", strength: "水辺の戦線維持", risk: "丘陵攻撃", modifiers: { durabilityPerSoldier: 1.05 }, terrainModifiers: { swamp: { defense: 1.08 }, river: { defense: 1.08 } }, weight: 1, order: "advance", experience: 39 },
    ],
  }),
  goblin: defineProfile({
    id: "goblin", peopleId: "goblin", name: "工房集落軍", doctrineName: "仕掛け散兵戦",
    doctrineSummary: "軽い射撃隊が敵を誘導し、工兵の防柵・塹壕・破壊工作へ踏み込ませる。",
    formationId: "guarded", forceSizeMultiplier: 1.08,
    strengths: ["工兵行動", "多数の射撃手", "軽い補給"],
    risks: ["低い耐久", "重装兵の突破"],
    templates: [
      { id: "trapwrights", unitClassId: "engineer", name: "罠師工兵隊", traitName: "連結防柵", traitDescription: "部品化した防柵を運び、射手の前へ短時間で組み上げる。", strength: "高速築城", risk: "白兵戦", modifiers: { engineering: 1.18, defense: 0.94, supplyConsumption: 0.88 }, weight: 0.9, order: "defend", experience: 42 },
      { id: "scrap-bows", unitClassId: "archer", name: "屑鉄弩兵隊", traitName: "部品交換射撃", traitDescription: "精度の低い弩を大量の交換部品で休まず射ち続ける。", strength: "射撃量と補給効率", risk: "命中と耐久", modifiers: { rangedAttack: 1.05, rangedAccuracy: 0.98, defense: 0.92, supplyConsumption: 0.9 }, weight: 1.2, order: "attack", experience: 35 },
      { id: "workshop-mob", unitClassId: "infantry", name: "工房自警兵", traitName: "数で塞ぐ", traitDescription: "小柄な兵が工具と盾を持ち、壊れた箇所へ次々に入る。", strength: "兵数と移動", risk: "一人当たりの耐久", modifiers: { movement: 1.04, durabilityPerSoldier: 0.92, supplyConsumption: 0.9 }, weight: 1.35, order: "advance", experience: 32 },
      { id: "cart-raiders", unitClassId: "light_cavalry", name: "荷車襲撃隊", traitName: "補給荒らし", traitDescription: "小型騎獣と軽荷車で補給路の外側を荒らす。", strength: "機動と追撃", risk: "正面防御", modifiers: { movement: 1.06, pursuit: 1.08, defense: 0.9, supplyConsumption: 0.9 }, weight: 0.8, order: "pursue", experience: 37 },
    ],
  }),
  giant: defineProfile({
    id: "giant", peopleId: "giant", name: "高峰氏族軍", doctrineName: "少数巨兵突破",
    doctrineSummary: "ごく少数の巨兵が岩塊と破城具を運び、一撃で戦列と障害物を崩す。",
    formationId: "wedge", forceSizeMultiplier: 0.52,
    strengths: ["一撃の攻撃力", "高いHP", "大型兵による突破"],
    risks: ["部隊数と兵数が少ない", "補給消費", "槍兵の大型迎撃"],
    templates: [
      { id: "boulder-guard", unitClassId: "heavy_infantry", name: "大岩鎧巨兵", traitName: "岩塊装甲", traitDescription: "岩板を鎧として担ぎ、射撃を受けながら正面を割る。", strength: "突破と耐久", risk: "槍壁・雷撃・低速", modifiers: { attack: 0.82, defense: 0.94, movement: 0.88, durabilityPerSoldier: 0.9, supplyConsumption: 1.5 }, weight: 1.15, order: "advance", experience: 46 },
      { id: "cliff-breakers", unitClassId: "engineer", name: "崖割り工兵", traitName: "巨材施工", traitDescription: "通常軍では動かせない巨材を一人で運び、橋と障害物を作る。", strength: "工兵と攻城", risk: "小回りと射撃", modifiers: { attack: 0.68, engineering: 1.22, movement: 0.9, durabilityPerSoldier: 0.8, supplyConsumption: 1.45 }, weight: 0.85, order: "defend", experience: 43 },
      { id: "peak-hurlers", unitClassId: "infantry", name: "峰投石巨兵", traitName: "岩塊投擲", traitDescription: "近距離へ岩塊を投げて隊列を乱し、そのまま白兵へ入る。", strength: "正面攻撃", risk: "包囲と継戦", modifiers: { attack: 0.84, defense: 0.88, durabilityPerSoldier: 0.88, supplyConsumption: 1.45 }, weight: 1, order: "attack", experience: 41 },
      { id: "valley-pikes", unitClassId: "spearman", name: "谷塞ぎ巨槍兵", traitName: "谷幅封鎖", traitDescription: "巨槍を谷の両壁へ渡し、騎兵と大型兵の進路を塞ぐ。", strength: "大型迎撃", risk: "配置転換", modifiers: { attack: 0.7, brace: 1.14, movement: 0.86, durabilityPerSoldier: 0.8, supplyConsumption: 1.42 }, weight: 0.9, order: "defend", experience: 42 },
    ],
  }),
});

export { GENERATED_NATION_PEOPLE_IDS };

export function getNationalUnitProfile(peopleId) {
  return NATIONAL_UNIT_PROFILES[peopleId] ?? null;
}

export function getNationalUnitTemplate(peopleId, templateId) {
  return getNationalUnitProfile(peopleId)?.templates.find((template) => template.id === templateId) ?? null;
}

function stableUnitOffset(seed, index, length) {
  let hash = 2166136261;
  for (const character of `${seed}:${index}`) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return length ? (hash >>> 0) % length : 0;
}

export function createNationalArmyUnitSpecs({ nation, side = "player", commanderId, strength, scale = "commander", positions = [], seed = "national-army" } = {}) {
  if (!nation?.id || !nation?.name || !nation?.peopleId) throw new Error("国家部隊の生成には国家ID・名称・文化が必要です");
  if (!commanderId) throw new Error("国家部隊の生成には指揮官IDが必要です");
  if (!["player", "enemy"].includes(side)) throw new Error("国家部隊の陣営が不正です");
  const profile = getNationalUnitProfile(nation.peopleId);
  if (!profile) throw new Error(`国家「${nation.name}」の軍制が未定義です: ${nation.peopleId}`);
  const count = scale === "full" ? profile.templates.length : scale === "commander" ? 3 : 2;
  if (positions.length < count) throw new Error(`${profile.name}を配置するマスが不足しています`);
  // Full armies keep a recognizable doctrinal core. Small retainer patrols vary
  // which two detachments are available without changing the national roster.
  const rotation = scale === "retainer" ? stableUnitOffset(seed, nation.id, profile.templates.length) : 0;
  const templates = Array.from({ length: count }, (_, index) => profile.templates[(index + rotation) % profile.templates.length]);
  const totalWeight = templates.reduce((sum, template) => sum + template.weight, 0);
  const totalSoldiers = Math.max(count, Math.round(Math.max(1, Number(strength) || 1) * profile.forceSizeMultiplier));
  let assigned = 0;
  return templates.map((template, index) => {
    const remainingUnits = count - index;
    const remainingSoldiers = totalSoldiers - assigned;
    const soldiers = index === count - 1
      ? Math.max(1, remainingSoldiers)
      : Math.max(1, Math.min(remainingSoldiers - (remainingUnits - 1), Math.round(totalSoldiers * template.weight / totalWeight)));
    assigned += soldiers;
    return {
      id: `${side}-${nation.id}-${template.id}`,
      name: `${nation.shortName ?? nation.name}${template.name}`,
      side,
      raceId: nation.peopleId,
      unitClassId: template.unitClassId,
      commanderId,
      soldierCount: soldiers,
      maxSoldierCount: soldiers,
      position: { ...positions[index] },
      order: template.order,
      experience: template.experience,
      abilityIds: template.abilityIds ? [...template.abilityIds] : null,
      availableMagicSkillIds: template.magicSkillIds ? [...template.magicSkillIds] : null,
      tags: ["NATIONAL_ARMY", `NATION:${nation.id}`, `NATIONAL_PROFILE:${profile.id}`, ...template.tags],
      nationId: nation.id,
      nationName: nation.name,
      nationalProfileId: profile.id,
      nationalDoctrineName: profile.doctrineName,
      nationalDoctrineSummary: profile.doctrineSummary,
      nationalTraitId: template.id,
      nationalTraitName: template.traitName,
      nationalTraitDescription: template.traitDescription,
      nationalStrength: template.strength,
      nationalRisk: template.risk,
      nationalModifiers: { ...template.modifiers },
      nationalTerrainModifiers: Object.fromEntries(Object.entries(template.terrainModifiers).map(([terrainId, modifiers]) => [terrainId, { ...modifiers }])),
    };
  });
}

export function getNationalArmySummary(nation) {
  const profile = getNationalUnitProfile(nation?.peopleId);
  if (!profile || !nation) return null;
  return {
    nationId: nation.id,
    nationName: nation.name,
    peopleId: nation.peopleId,
    peopleName: nation.peopleName,
    profileId: profile.id,
    profileName: profile.name,
    doctrineName: profile.doctrineName,
    doctrineSummary: profile.doctrineSummary,
    formationId: profile.formationId,
    strengths: [...profile.strengths],
    risks: [...profile.risks],
    unitClasses: [...new Set(profile.templates.map((template) => template.unitClassId))],
    units: profile.templates.map((template) => ({
      id: template.id,
      name: template.name,
      unitClassId: template.unitClassId,
      traitName: template.traitName,
      traitDescription: template.traitDescription,
      strength: template.strength,
      risk: template.risk,
    })),
  };
}
