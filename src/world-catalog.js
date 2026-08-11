import { getRaceTraitReference } from "./race-list.js";

export const WORLD_SETTING_SOURCES = Object.freeze({
  races: {
    title: "異種族一覧",
    url: "https://app.notion.com/p/8ae4b9a633184fdd852e2b074d4fa9fb",
    asOf: "2020-07-16",
  },
  nations: {
    title: "国家",
    url: "https://app.notion.com/p/48566b1e0c7645f7a2b84df8ce645d8d",
    asOf: "2020-07-16",
  },
  taxonomy: {
    title: "World Create / 種族",
    url: "https://app.notion.com/p/533e7dda5b654f2a93644692c1ec50de",
    asOf: "2022-09-04",
  },
});

// 国家・種族とは別に扱う、通常の軍事力や生態分類の尺度が通用しない単独個体。
// リヴァイアサンはユーザー指定で追加されたゲーム内設定であり、Notion原案由来ではない。
export const EXTREME_CREATURES = Object.freeze({
  leviathan: Object.freeze({
    id: "leviathan",
    name: "リヴァイアサン",
    image: "./assets/generated/enemy-leviathan.png",
    epithet: "黒潮回廊を渡る海の境界災害",
    classification: "超規格外生物",
    sourceKind: "追加世界設定",
    certainty: "存在確定・全容未詳",
    currentState: "外洋を低速遊弋中",
    habitat: "冥海と南竜海を結ぶ深海航路「黒潮回廊」",
    estimatedLength: "全長1,600〜2,400 m",
    observedPart: "浮上した背部だけで約410 m",
    description: "大陸外洋の海底熱脈と魔力脈を追って回遊する単独個体。船や都市を獲物として狙う習性は確認されていないが、進路を変えないまま艦隊・港湾・沿岸地形を破壊し得るため、各国は生物ではなく移動する自然境界として扱う。",
    ecology: "数十年単位で深海を巡り、海底火山帯の熱・鉱物・高密度魔力を摂取する。浮上は摂餌後の放熱と推定されるが、全身を目視して生還した記録はない。",
    signs: Object.freeze([
      "三日前から方位磁針と魔力計が同じ方向へ偏る",
      "無風でも長周期のうねりが発生し、海面が青白く発光する",
      "魚群と大型海獣が一斉に沿岸へ逃げ、直後に低い海鳴りが続く",
    ]),
    strategicEffects: Object.freeze([
      "危険域では艦隊決戦・封鎖・上陸作戦が成立しない",
      "回遊予測が外れると外洋交易路は一季節単位で迂回を強いられる",
      "沿岸国は討伐軍ではなく観測所・避難港・共同警報網へ予算を割く",
    ]),
    doctrine: "交戦・捕獲・誘導を禁ずる。観測して退避し、進路上の港と艦隊を空にすることだけが現実的な対処とされる。",
    enemyCodex: Object.freeze({
      category: "敵性存在 / 移動災害",
      dangerRank: "EX（大陸級海上災害）",
      battleStatus: "非戦闘対象",
      hostility: "捕食・領土的敵意は未確認。ただし接触と進路干渉は致命的",
      affiliation: "なし（単独個体）",
      intelligence: "不明。回遊と摂餌以外の意思疎通行動は未確認",
      encounterRule: "個人探索・ダンジョン・通常戦術戦闘には出現しない。世界規模の回遊災害としてのみ発生",
      rewards: "なし。遺物・素材を含め、接近・採取・回収を禁止",
      knownCapabilities: Object.freeze([
        "深海の熱脈・鉱物脈・高密度魔力脈を追跡して数十年周期で回遊する",
        "浮上前から方位磁針・魔力計を偏向させ、長周期波と海面発光を引き起こす",
        "攻撃行動を取らずとも、進路上の艦隊・港湾・沿岸地形を規模だけで破壊する",
      ]),
      unknowns: Object.freeze([
        "全身形状・正確な全長・寿命",
        "知性、繁殖個体の有無、同種の総数",
        "負傷可能性と弱点。調査目的の交戦そのものが禁止されている",
      ]),
      supplementalNotes: Object.freeze([
        "浮上した背部約410mのみ観測済みで、全身を目視して生還した記録はない",
        "船や都市を獲物として狙った確証はなく、敵性判定は意図ではなく被害規模に基づく",
        "沿岸各国の標準対応は討伐軍編成ではなく、観測所・避難港・共同警報網の整備",
      ]),
    }),
    location: Object.freeze({ x: 680, y: 660, label: "黒潮回廊・現在推定域" }),
  }),
});

export function getExtremeCreature(creatureId) {
  return EXTREME_CREATURES[creatureId] ?? null;
}

export function getEnemyCodexEntries() {
  return Object.values(EXTREME_CREATURES).filter((creature) => creature.enemyCodex);
}

export const NOTION_OTHER_RACE_IDS = Object.freeze([
  "acrane",
  "elf",
  "goblin",
  "orc",
  "undead",
  "giant",
  "fairy",
  "lamia",
  "homunculus",
  "machine_life",
  "beastfolk",
  "phantom_beast",
  "angel",
  "demon",
  "ogre",
]);

const PEOPLE_CATALOG = Object.freeze({
  acrane: {
    id: "acrane", name: "アクラネ", sigil: "蛛", family: "分類未詳", sourceKind: "異種族一覧",
    note: "名称のみ記載。生態・文化・国家帰属は未設定。",
  },
  elf: {
    id: "elf", name: "エルフ", sigil: "葉", family: "ヒューマン族 / エルフ系", sourceKind: "異種族一覧",
    note: "ヴィニア連合王国を束ねる種族として国家設定にも登場する。",
  },
  goblin: {
    id: "goblin", name: "ゴブリン", sigil: "牙", family: "分類未詳", sourceKind: "異種族一覧",
    note: "名称のみ記載。森林三族同盟を構成する三族の内訳はNotionに未記載。",
  },
  orc: {
    id: "orc", name: "オーク", sigil: "斧", family: "分類未詳", sourceKind: "異種族一覧",
    note: "名称のみ記載。森林三族同盟を構成する三族の内訳はNotionに未記載。",
  },
  undead: {
    id: "undead", name: "アンデッド", sigil: "骸", family: "不死族", sourceKind: "異種族一覧",
    note: "デッドランド冥府を構成する死族として国家設定にも登場する。",
  },
  giant: {
    id: "giant", name: "巨人", sigil: "巌", family: "分類未詳", sourceKind: "異種族一覧",
    note: "名称のみ記載。国家帰属は未設定。",
  },
  fairy: {
    id: "fairy", name: "妖精", sigil: "翅", family: "ヒューマン族 / 妖精系", sourceKind: "異種族一覧",
    note: "World Create側では妖精系が置かれているが、国家帰属は未設定。",
  },
  lamia: {
    id: "lamia", name: "ラミア", sigil: "蛇", family: "分類未詳", sourceKind: "異種族一覧",
    note: "名称のみ記載。生態・文化・国家帰属は未設定。",
  },
  homunculus: {
    id: "homunculus", name: "ホムルンクルス", sigil: "器", family: "分類未詳", sourceKind: "異種族一覧",
    note: "Notionの表記をそのまま採用。国家帰属は未設定。",
  },
  machine_life: {
    id: "machine_life", name: "機械生命体", sigil: "機", family: "物質族との関連未確定", sourceKind: "異種族一覧",
    note: "名称のみ記載。物質族との対応、国家帰属はいずれも未確定。",
  },
  beastfolk: {
    id: "beastfolk", name: "獣人", sigil: "爪", family: "ヒューマン族 / 獣人系", sourceKind: "異種族一覧",
    note: "World Create側では獣人系が置かれているが、国家帰属は未設定。",
  },
  phantom_beast: {
    id: "phantom_beast", name: "幻獣", sigil: "幻", family: "分類未詳", sourceKind: "異種族一覧",
    note: "名称のみ記載。竜系との対応や国家帰属は未確定。",
  },
  angel: {
    id: "angel", name: "天使", sigil: "翼", family: "神聖族 / 天使系", sourceKind: "異種族一覧",
    note: "World Create側の天使系にはヴァルキリーが記載されている。ヘヴンズゲート神国との対応は関連扱い。",
  },
  demon: {
    id: "demon", name: "悪魔", sigil: "魔", family: "邪悪族との関連未確定", sourceKind: "異種族一覧",
    note: "名称のみ記載。邪悪族・妖魔系との対応、国家帰属はいずれも未確定。",
  },
  ogre: {
    id: "ogre", name: "オーガ", sigil: "鬼", family: "分類未詳", sourceKind: "異種族一覧",
    note: "名称のみ記載。森林三族同盟を構成する三族の内訳はNotionに未記載。",
  },
  human: {
    id: "human", name: "人間", sigil: "人", family: "ヒューマン族", sourceKind: "国家設定の基準種",
    note: "異種族15種の外にある基準種。二つの国家で居住が明記されている。",
    auxiliary: true,
  },
  dragon: {
    id: "dragon", name: "竜族", sigil: "竜", family: "邪悪族 / 竜系", sourceKind: "World Create補助分類",
    note: "World Create側では『竜大公が治める竜族』と記載。アバンヘルンは竜王の保護下にある。",
    auxiliary: true,
  },
});

// 旧来の世界設定名には、実種族だけでなく「アンデッド」「獣人」のような
// 集合名も含まれる。実種族は race、大分類は category と明示して、いずれも
// 必ず正本の特性レコードまで取得した状態で公開する。
const PEOPLE_TRAIT_REFERENCES = Object.freeze({
  acrane: { raceId: "arachne" },
  elf: { raceId: "elf" },
  goblin: { raceId: "goblin" },
  orc: { raceId: "orc" },
  undead: { categoryId: "undead" },
  giant: { raceId: "giant" },
  fairy: { raceId: "fairy" },
  lamia: { raceId: "lamia" },
  homunculus: { raceId: "homunculus" },
  machine_life: { raceId: "machine_life" },
  beastfolk: { categoryId: "beastfolk" },
  phantom_beast: { raceId: "phantom_beast" },
  angel: { raceId: "angel" },
  demon: { raceId: "demon" },
  ogre: { raceId: "ogre" },
  human: { raceId: "human" },
  dragon: { raceId: "dragon" },
});

export const PEOPLES = Object.freeze(Object.fromEntries(
  Object.entries(PEOPLE_CATALOG).map(([peopleId, people]) => {
    const reference = getRaceTraitReference(PEOPLE_TRAIT_REFERENCES[peopleId]);
    return [peopleId, Object.freeze({
      ...people,
      traitReference: Object.freeze({ kind: reference.kind, id: reference.id }),
      traits: reference.profile,
    })];
  }),
));

// Notion由来の種族設定と、ゲーム内で用いる代表像の演出設定を分離する。
// 年齢・役職・表情は種族そのものの固定属性ではなく、今回登場する一代表のもの。
export const PEOPLE_REPRESENTATIVES = Object.freeze({
  acrane: { image: "./assets/generated/race-acrane.webp", role: "星糸の観測使", apparentAge: "28歳", expression: "全ての眼に宿る鋭い猜疑" },
  elf: { image: "./assets/generated/race-elf.webp", role: "森王庭の上席使節", apparentAge: "25歳", expression: "目を閉じて身を反らす大笑い" },
  goblin: { image: "./assets/generated/race-goblin.webp", role: "交易評議会の策士", apparentAge: "21歳", expression: "嘘を見抜こうとする猜疑" },
  orc: { image: "./assets/generated/race-orc.webp", role: "氏族盟約の交渉人", apparentAge: "27歳", expression: "反論を叩きつける憤怒と驚愕" },
  undead: { image: "./assets/generated/race-undead.webp", role: "冥府の弔冠大使", apparentAge: "28歳", expression: "顎を上げて見下ろす冷たい軽蔑" },
  giant: { image: "./assets/generated/race-giant.webp", role: "高峰氏族の盟約者", apparentAge: "27歳", expression: "民を守ろうとする防衛的な怒り" },
  fairy: { image: "./assets/generated/race-fairy.webp", role: "花暦宮の伝令使", apparentAge: "18歳", expression: "両目を見開いた驚愕" },
  lamia: { image: "./assets/generated/race-lamia.webp", role: "河宮の条約使", apparentAge: "22歳", expression: "獲物を見定める捕食者の満足" },
  homunculus: { image: "./assets/generated/race-homunculus.webp", role: "錬成院の通訳官", apparentAge: "20歳", expression: "答えを組み立てきれない分析的混乱" },
  machine_life: { image: "./assets/generated/race-machine-life.webp", role: "古機構の調停個体", apparentAge: "25歳", expression: "涙を理解し始めた静かな共感" },
  beastfolk: { image: "./assets/generated/race-beastfolk.webp", role: "群れ評議会の遊説使", apparentAge: "19歳", expression: "秘密を誘う悪戯なウインク" },
  phantom_beast: { image: "./assets/generated/race-phantom-beast.webp", role: "幻境の記憶守", apparentAge: "19歳", expression: "視線を伏せた声なき悲嘆" },
  angel: { image: "./assets/generated/race-angel.webp", role: "天門の親善使節", apparentAge: "26歳", expression: "手を差し伸べる切迫した慈愛" },
  demon: { image: "./assets/generated/race-demon.webp", role: "黒曜廷の全権使", apparentAge: "24歳", expression: "隠そうともしない露骨な嫌悪" },
  ogre: { image: "./assets/generated/race-ogre.webp", role: "鬼州の祝勝使", apparentAge: "20歳", expression: "拳を掲げる勝利の雄叫び" },
  human: { image: "./assets/generated/race-human.webp", role: "王国の若手外交官", apparentAge: "23歳", expression: "焦燥を押し込めた決意" },
  dragon: { image: "./assets/generated/race-dragon.webp", role: "竜王座の密命代理", apparentAge: "29歳", expression: "秘密を噛みしめる片側の含み笑い" },
});

export const DIPLOMATIC_DELEGATES = Object.freeze({
  valka: { peopleId: "human", name: "リュドミラ・ヴァルケン", office: "灰冠峠会談全権使", certainty: "公国全権", note: "鉄門城の関税評議会を代表し、通行権と共同監視条項の交渉権を委ねられている。" },
  vinia: { peopleId: "elf", certainty: "構成種族", note: "国家設定で明記されたエルフの代表。" },
  forest_alliance: { peopleId: "beastfolk", certainty: "関連種族", note: "三族の内訳は未確定。関連種族の代表として表示。" },
  lustrond: { peopleId: "human", certainty: "構成種族", note: "国家設定で明記された人間の代表。" },
  izmenia: { peopleId: "human", certainty: "構成種族", note: "国家設定で明記された人間の代表。" },
  heavens_gate: { peopleId: "angel", certainty: "関連種族", note: "神族国家との関連種族として天使の代表を表示。" },
  deadland: { peopleId: "undead", certainty: "構成種族", note: "国家設定で明記された死族の代表。" },
  avanheln: { peopleId: "dragon", certainty: "関連種族", note: "竜王の保護下にある連盟として竜族代表を表示。" },
});

export function getDiplomaticDelegate(countryId) {
  const delegate = DIPLOMATIC_DELEGATES[countryId];
  if (!delegate) return null;
  return {
    ...delegate,
    people: PEOPLES[delegate.peopleId],
    representative: PEOPLE_REPRESENTATIVES[delegate.peopleId],
  };
}

export const SETTING_NATIONS = Object.freeze({
  forest_alliance: {
    id: "forest_alliance", name: "森林三族同盟", sigil: "森", polity: "部族同盟", knowledge: "partial",
    peopleLabel: "亜人部族（三族の内訳は未記載）", confirmedPeopleIds: [], relatedPeopleIds: ["goblin", "orc", "ogre", "beastfolk"],
    description: "亜人部族による緩やかな連合体。三族の具体的な内訳はNotionでは確定していない。",
    suzerainId: null, protectorateIds: [], color: "#52765c",
  },
  vinia: {
    id: "vinia", name: "ヴィニア連合王国", sigil: "葉", polity: "連合王国", knowledge: "defined",
    peopleLabel: "エルフ並びに同血族", confirmedPeopleIds: ["elf"], relatedPeopleIds: ["fairy"],
    description: "エルフ並びに同血族が束ねる亜人国家。",
    suzerainId: null, protectorateIds: [], color: "#4e7e68",
  },
  deadland: {
    id: "deadland", name: "デッドランド冥府", sigil: "冥", polity: "冥府国家", knowledge: "defined",
    peopleLabel: "死族 / アンデッド", confirmedPeopleIds: ["undead"], relatedPeopleIds: [],
    description: "エルダーリッチが束ねる死族国家。",
    suzerainId: null, protectorateIds: [], color: "#514b62",
  },
  heavens_gate: {
    id: "heavens_gate", name: "ヘヴンズゲート神国", sigil: "天", polity: "神国", knowledge: "defined",
    peopleLabel: "神族", confirmedPeopleIds: [], relatedPeopleIds: ["angel"],
    description: "神族が座す国家。複数の国を保護領としている。",
    suzerainId: null, protectorateIds: ["lustrond", "great_empire"], color: "#a78e4e",
  },
  lustrond: {
    id: "lustrond", name: "ラーストロンド聖国", sigil: "聖", polity: "宗教国 / 保護領", knowledge: "defined",
    peopleLabel: "人間", confirmedPeopleIds: ["human"], relatedPeopleIds: [],
    description: "人間が住む宗教国。ヘヴンズゲート神国の保護領。",
    suzerainId: "heavens_gate", protectorateIds: [], color: "#9a7552",
  },
  great_empire: {
    id: "great_empire", name: "グレート帝国", sigil: "帝", polity: "帝国 / 保護領", knowledge: "partial",
    peopleLabel: "住民構成は未記載", confirmedPeopleIds: [], relatedPeopleIds: [],
    description: "皇帝が住む国。ヘヴンズゲート神国の保護領。住民構成はNotionで明記されていない。",
    suzerainId: "heavens_gate", protectorateIds: [], color: "#8a6556",
  },
  avanheln: {
    id: "avanheln", name: "アバンヘルン連盟", sigil: "竜", polity: "山岳連盟 / 竜王保護領", knowledge: "defined",
    peopleLabel: "構成種族は未記載。竜王が保護", confirmedPeopleIds: [], relatedPeopleIds: ["dragon"],
    description: "アバンヘルン山脈に座す竜王が保護領とする連盟体。",
    suzerainId: null, protectorateIds: [], color: "#7c5944",
  },
  izmenia: {
    id: "izmenia", name: "イズメニア皇国", sigil: "環", polity: "皇国", knowledge: "partial",
    peopleLabel: "人間", confirmedPeopleIds: ["human"], relatedPeopleIds: [],
    description: "人間が住み、独自の生態系を持つ国。生態系の内訳はNotionでは未詳。",
    suzerainId: null, protectorateIds: [], color: "#506f74",
  },
  tzurisbern: {
    id: "tzurisbern", name: "ツーリスベルン公国", sigil: "？", polity: "公国", knowledge: "unknown",
    peopleLabel: "不明", confirmedPeopleIds: [], relatedPeopleIds: [],
    description: "Notionでは国名のみがあり、種族・政治・地理はいずれも不明。",
    suzerainId: null, protectorateIds: [], color: "#736d62",
  },
  lancilvar: {
    id: "lancilvar", name: "ランシルヴァール", sigil: "？", polity: "国家形態不明", knowledge: "unknown",
    peopleLabel: "不明", confirmedPeopleIds: [], relatedPeopleIds: [],
    description: "Notionでは国名のみがあり、種族・政治・地理はいずれも不明。",
    suzerainId: null, protectorateIds: [], color: "#686b67",
  },
});

export function getPeopleForNation(nationId) {
  const nation = SETTING_NATIONS[nationId];
  if (!nation) return { confirmed: [], related: [] };
  return {
    confirmed: nation.confirmedPeopleIds.map((id) => PEOPLES[id]).filter(Boolean),
    related: nation.relatedPeopleIds.map((id) => PEOPLES[id]).filter(Boolean),
  };
}

export function getNationsForPeople(peopleId) {
  return Object.values(SETTING_NATIONS)
    .filter((nation) => nation.confirmedPeopleIds.includes(peopleId) || nation.relatedPeopleIds.includes(peopleId))
    .map((nation) => ({
      ...nation,
      association: nation.confirmedPeopleIds.includes(peopleId) ? "confirmed" : "related",
    }));
}

export function getNationRelations(nationId) {
  const nation = SETTING_NATIONS[nationId];
  if (!nation) return { suzerain: null, protectorates: [] };
  return {
    suzerain: nation.suzerainId ? SETTING_NATIONS[nation.suzerainId] : null,
    protectorates: nation.protectorateIds.map((id) => SETTING_NATIONS[id]).filter(Boolean),
  };
}

export function getWorldCatalogSummary() {
  const nations = Object.values(SETTING_NATIONS);
  return {
    otherRaces: NOTION_OTHER_RACE_IDS.length,
    auxiliaryPeoples: Object.values(PEOPLES).filter((people) => people.auxiliary).length,
    nations: nations.length,
    unknownNations: nations.filter((nation) => nation.knowledge === "unknown").length,
    protectorates: nations.filter((nation) => nation.suzerainId).length,
    extremeCreatures: Object.keys(EXTREME_CREATURES).length,
  };
}
