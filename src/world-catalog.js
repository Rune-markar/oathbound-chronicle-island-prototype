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

export const PEOPLES = Object.freeze({
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

// Notion由来の種族設定と、ゲーム内で用いる代表像の演出設定を分離する。
// 年齢・役職・表情は種族そのものの固定属性ではなく、今回登場する一代表のもの。
export const PEOPLE_REPRESENTATIVES = Object.freeze({
  acrane: { image: "./assets/generated/race-acrane.webp", role: "星糸の観測使", apparentAge: "40代", expression: "距離を測る冷静な眼差し" },
  elf: { image: "./assets/generated/race-elf.webp", role: "森王庭の上席使節", apparentAge: "40代", expression: "穏やかな自信" },
  goblin: { image: "./assets/generated/race-goblin.webp", role: "交易評議会の古参", apparentAge: "50代", expression: "老獪で親しげな微笑み" },
  orc: { image: "./assets/generated/race-orc.webp", role: "氏族盟約の交渉人", apparentAge: "30代", expression: "挑戦的な片眉と半笑い" },
  undead: { image: "./assets/generated/race-undead.webp", role: "冥府の弔冠大使", apparentAge: "70代相当", expression: "長い歳月を湛えた哀感" },
  giant: { image: "./assets/generated/race-giant.webp", role: "高峰氏族の盟約者", apparentAge: "40代", expression: "包容力のある快活さ" },
  fairy: { image: "./assets/generated/race-fairy.webp", role: "花暦宮の伝令使", apparentAge: "20代", expression: "好奇心に満ちた笑顔" },
  lamia: { image: "./assets/generated/race-lamia.webp", role: "河宮の条約使", apparentAge: "30代", expression: "相手を量る含み笑い" },
  homunculus: { image: "./assets/generated/race-homunculus.webp", role: "錬成院の通訳官", apparentAge: "20代", expression: "分析中の率直な驚き" },
  machine_life: { image: "./assets/generated/race-machine-life.webp", role: "古機構の調停個体", apparentAge: "50代", expression: "人を見抜く温かな微笑み" },
  beastfolk: { image: "./assets/generated/race-beastfolk.webp", role: "群れ評議会の遊説使", apparentAge: "30代", expression: "快活で大胆な笑み" },
  phantom_beast: { image: "./assets/generated/race-phantom-beast.webp", role: "幻境の記憶守", apparentAge: "60代", expression: "遠い記憶を惜しむ眼差し" },
  angel: { image: "./assets/generated/race-angel.webp", role: "天門の親善使節", apparentAge: "40代", expression: "慈愛に満ちた歓迎" },
  demon: { image: "./assets/generated/race-demon.webp", role: "黒曜廷の全権使", apparentAge: "20代", expression: "不敵で愉快そうな笑み" },
  ogre: { image: "./assets/generated/race-ogre.webp", role: "鬼州の年長評議員", apparentAge: "50代", expression: "豪胆で人懐こい大笑い" },
  human: { image: "./assets/generated/race-human.webp", role: "王国の若手外交官", apparentAge: "20代", expression: "端正で揺るがない平静" },
  dragon: { image: "./assets/generated/race-dragon.webp", role: "竜王座の古参代理", apparentAge: "60代", expression: "峻厳さの奥の愉悦" },
});

export const DIPLOMATIC_DELEGATES = Object.freeze({
  valka: { peopleId: "human", certainty: "暫定代表", note: "ヴァルカの構成種族は原案未詳。外交窓口として人間代表を表示。" },
  vinia: { peopleId: "elf", certainty: "構成種族", note: "国家設定で明記されたエルフの代表。" },
  forest_alliance: { peopleId: "beastfolk", certainty: "関連種族", note: "三族の内訳は未確定。関連種族の代表として表示。" },
  lustrond: { peopleId: "human", certainty: "構成種族", note: "国家設定で明記された人間の代表。" },
  izmenia: { peopleId: "human", certainty: "構成種族", note: "国家設定で明記された人間の代表。" },
  heavens_gate: { peopleId: "angel", certainty: "関連種族", note: "神族国家との関連種族として天使の代表を表示。" },
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
  };
}
