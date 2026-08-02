const statistic = (nationId, data) => Object.freeze({ nationId, ...data });

export const STATISTICS_BASIS = Object.freeze({
  label: "開幕時シナリオ推計",
  note: "世界台帳の確定設定とは別の、ゲーム開始時点における統計局推計。未調査項目は推測で補完しない。",
});

export const RESOURCE_CATEGORIES = Object.freeze([
  { id: "food", label: "食料基盤", mark: "穀" },
  { id: "timber", label: "森林資源", mark: "林" },
  { id: "ore", label: "鉱物資源", mark: "鉱" },
  { id: "arcana", label: "魔力資源", mark: "魔" },
  { id: "maritime", label: "水運資源", mark: "水" },
]);

export const WORLD_STATISTICS = Object.freeze({
  forest_alliance: statistic("forest_alliance", {
    status: "estimated", surveyQuality: 62, population: 1840000, area: 184000, urbanization: 18,
    races: [{ label: "亜人部族（内訳未詳）", share: 100 }],
    languages: [{ label: "樹海共通語", share: 48 }, { label: "氏族諸語", share: 39 }, { label: "通商共通語", share: 13 }],
    religions: [{ label: "森霊信仰", share: 61 }, { label: "祖霊祭祀", share: 31 }, { label: "その他", share: 8 }],
    resources: { food: 54, timber: 95, ore: 38, arcana: 73, maritime: 22 },
    note: "人口は季節移動する氏族を含む。三族の種族内訳は原案未詳のため分割していない。",
  }),
  vinia: statistic("vinia", {
    status: "estimated", surveyQuality: 78, population: 2620000, area: 142000, urbanization: 34,
    races: [{ label: "エルフ", share: 74, peopleId: "elf" }, { label: "同血族", share: 26 }],
    languages: [{ label: "古エルフ語", share: 63 }, { label: "森林共通語", share: 27 }, { label: "通商共通語", share: 10 }],
    religions: [{ label: "世界樹祭祀", share: 69 }, { label: "祖霊祭祀", share: 22 }, { label: "その他", share: 9 }],
    resources: { food: 63, timber: 92, ore: 44, arcana: 86, maritime: 38 },
    note: "同血族の細分類は統計上も集約。森林資源と魔力資源が交易余力を支える。",
  }),
  deadland: statistic("deadland", {
    status: "estimated", surveyQuality: 55, population: 910000, area: 128000, urbanization: 41,
    races: [{ label: "アンデッド", share: 100, peopleId: "undead" }],
    languages: [{ label: "冥府語", share: 71 }, { label: "古王朝語", share: 20 }, { label: "通商共通語", share: 9 }],
    religions: [{ label: "記憶継承儀礼", share: 58 }, { label: "静寂信仰", share: 34 }, { label: "その他", share: 8 }],
    resources: { food: 18, timber: 32, ore: 64, arcana: 91, maritime: 24 },
    note: "人口は自律的に活動する死族の推計。食料基盤は生者向け供給能力として評価する。",
  }),
  heavens_gate: statistic("heavens_gate", {
    status: "estimated", surveyQuality: 67, population: 420000, area: 57000, urbanization: 68,
    races: [{ label: "神族", share: 82 }, { label: "被護民・巡礼者", share: 18 }],
    languages: [{ label: "天上語", share: 76 }, { label: "聖典語", share: 17 }, { label: "通商共通語", share: 7 }],
    religions: [{ label: "天門正教", share: 93 }, { label: "保護領諸派", share: 7 }],
    resources: { food: 42, timber: 28, ore: 58, arcana: 96, maritime: 20 },
    note: "常住人口のみを集計し、保護領人口は含めない。魔力資源への集中が顕著。",
  }),
  lustrond: statistic("lustrond", {
    status: "estimated", surveyQuality: 83, population: 2180000, area: 96000, urbanization: 37,
    races: [{ label: "人間", share: 100, peopleId: "human" }],
    languages: [{ label: "ルスト語", share: 72 }, { label: "聖典語", share: 20 }, { label: "通商共通語", share: 8 }],
    religions: [{ label: "天門正教", share: 89 }, { label: "地方聖人崇敬", share: 9 }, { label: "その他", share: 2 }],
    resources: { food: 78, timber: 42, ore: 36, arcana: 45, maritime: 47 },
    note: "巡礼街道沿いの人口把握が進んでいる。穀倉地帯が保護領経済の中核。",
  }),
  great_empire: statistic("great_empire", {
    status: "estimated", surveyQuality: 49, population: 6840000, area: 312000, urbanization: 44,
    races: null,
    languages: [{ label: "帝国共通語", share: 78 }, { label: "属州諸語", share: 17 }, { label: "聖典語", share: 5 }],
    religions: [{ label: "皇祖祭祀", share: 52 }, { label: "天門正教", share: 31 }, { label: "属州諸信仰", share: 17 }],
    resources: { food: 82, timber: 55, ore: 79, arcana: 61, maritime: 52 },
    note: "住民の種族構成は原案未記載。総人口と資源は保護領台帳からの粗い逆算値。",
  }),
  avanheln: statistic("avanheln", {
    status: "estimated", surveyQuality: 46, population: 1260000, area: 201000, urbanization: 21,
    races: null,
    languages: [{ label: "山岳共通語", share: 55 }, { label: "谷地諸語", share: 33 }, { label: "竜語", share: 12 }],
    religions: [{ label: "竜王盟約", share: 64 }, { label: "峰霊信仰", share: 29 }, { label: "その他", share: 7 }],
    resources: { food: 34, timber: 61, ore: 96, arcana: 82, maritime: 12 },
    note: "竜王の保護下にある住民の種族内訳は未詳。鉱物と魔力資源は高いが輸送制約が大きい。",
  }),
  izmenia: statistic("izmenia", {
    status: "estimated", surveyQuality: 74, population: 3470000, area: 176000, urbanization: 39,
    races: [{ label: "人間", share: 100, peopleId: "human" }],
    languages: [{ label: "イズメニア語", share: 86 }, { label: "沿岸諸語", share: 9 }, { label: "通商共通語", share: 5 }],
    religions: [{ label: "環流信仰", share: 57 }, { label: "生態守護祭祀", share: 35 }, { label: "その他", share: 8 }],
    resources: { food: 71, timber: 68, ore: 52, arcana: 76, maritime: 83 },
    note: "独自生態系を森林・魔力資源へ分けて評価。沿岸交易を含む水運力が高い。",
  }),
  tzurisbern: statistic("tzurisbern", {
    status: "unavailable", surveyQuality: 0, population: null, area: null, urbanization: null,
    races: null, languages: null, religions: null, resources: null,
    note: "国名以外の原案設定がないため、統計調査も未着手。",
  }),
  lancilvar: statistic("lancilvar", {
    status: "unavailable", surveyQuality: 0, population: null, area: null, urbanization: null,
    races: null, languages: null, religions: null, resources: null,
    note: "国名以外の原案設定がないため、統計調査も未着手。",
  }),
});

export function getNationStatistics(nationId) {
  return WORLD_STATISTICS[nationId] ?? null;
}

export function getResourcePower(profileOrNationId) {
  const profile = typeof profileOrNationId === "string" ? getNationStatistics(profileOrNationId) : profileOrNationId;
  if (!profile?.resources) return null;
  const scores = RESOURCE_CATEGORIES.map(({ id }) => profile.resources[id]);
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function getResourceGrade(score) {
  if (score === null || score === undefined) return "未調査";
  if (score >= 75) return "卓越";
  if (score >= 60) return "優勢";
  if (score >= 45) return "標準";
  return "限定的";
}

export function getResourceRanking() {
  return Object.values(WORLD_STATISTICS).slice().sort((left, right) => {
    const leftScore = getResourcePower(left);
    const rightScore = getResourcePower(right);
    if (leftScore === null) return rightScore === null ? 0 : 1;
    if (rightScore === null) return -1;
    return rightScore - leftScore;
  });
}

export function getWorldStatisticsSummary() {
  const profiles = Object.values(WORLD_STATISTICS);
  const surveyed = profiles.filter((profile) => profile.status === "estimated");
  const ranking = getResourceRanking();
  return {
    surveyedNations: surveyed.length,
    unavailableNations: profiles.length - surveyed.length,
    populationTotal: surveyed.reduce((sum, profile) => sum + profile.population, 0),
    resourceLeaderId: ranking.find((profile) => getResourcePower(profile) !== null)?.nationId ?? null,
  };
}
