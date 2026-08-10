import {
  DOCTRINES,
  FACILITIES,
  FACTION_DEFINITIONS,
  POLICY_DEFINITIONS,
  deriveCityMetrics as modelCityMetrics,
  deriveGovernance,
  deriveOfficerScore,
  deriveRealmLedger as modelRealmLedger,
  deterministicOutcome,
  formatBreakdown,
  getAvailableOfficers,
  getFacilityUpgradeSpec,
  getOfficer,
  getServingOfficers,
  getTaskForecast as modelTaskForecast,
  seasonForMonth,
} from "./realm-model.js";
import {
  ADMINISTRATION_MANDATES,
  ADMINISTRATION_MODES,
  AUTHORITY_DOMAINS,
  AUTHORITY_REFORM_STAGES,
  AUTHORITY_TRANSFER_METHODS,
  applyAdministrativeOverload,
  deriveCentralizationResult as modelCentralizationResult,
  deriveAdministrationNetwork as modelAdministrationNetwork,
  deriveCityAdministration as modelCityAdministration,
  deriveRegionAuthority as modelRegionAuthority,
  getAuthorityReformOptions as modelAuthorityReformOptions,
  getCityAdministrationConfig,
  normalizeAdministrationState,
  resolveAuthorityReforms,
  resolveDelegatedAdministration,
  startAuthorityReform as modelStartAuthorityReform,
} from "./administration-model.js";
import {
  HISTORY_SCHEMA_VERSION,
  PRESSURE_DEFINITIONS,
  advanceHistoricalSimulation,
  getHistoricalOverview as modelHistoricalOverview,
  normalizeHistoryState,
  recordHistoricalEvent,
  recordResolvedWorldEvent,
  registerEventPressure,
  traceHistoricalCauses as modelTraceHistoricalCauses,
} from "./history-model.js";
import { chooseOpponentAction, evaluatePeaceDecision, evaluateWarDecision } from "./war-ai.js";
import {
  OCCUPATION_POLICIES,
  PEACE_SETTLEMENTS,
  WAR_PLANS,
  getPeaceOptions as derivePeaceOptions,
  getWarPlanOptions,
  getWarStage,
  occupationPolicyOutcome,
} from "./war-system.js";
import { advanceWarTheater, createWarTheater, normalizeWarTheater } from "./war-map.js";
import { createGeneratedWorldState, normalizeGeneratedWorldState } from "./generated-world-system.js";
import {
  CENTRALIZATION_STAGES,
  HISTORY_POLICIES,
  LEVIATHAN_POLICIES,
  NATIONAL_REFORM_BUDGETS,
  NATIONAL_REFORM_SYSTEMS,
  REFORM_CONCESSIONS,
  adoptHistoryPolicy,
  advanceCentralizationCampaign,
  advanceLeviathanCycle,
  deriveCentralizationCampaignStatus,
  deriveHistoricalRuleEffects,
  deriveLeviathanStatus,
  getCentralizationPrimaryDecisions,
  normalizeCentralizationCampaign,
  resolveNationalReforms,
  setLeviathanPolicy,
  startNationalReform,
} from "./centralization-campaign.js";
import {
  TOWN_COMMAND_IDS,
  advanceTownAdministration,
  applyTownCommand,
  getTownAdministration as modelTownAdministration,
  isTownCommand,
  normalizeTownAdministration,
} from "./town-administration.js";
import {
  AFTERMATH_DECISIONS,
  AFTERMATH_POLICIES,
  BORDER_SETTLEMENTS,
  CAMPAIGN_ACTS,
  FOREIGN_AGENDAS,
  OFFICER_DEMAND_RESPONSES,
  OFFICER_POLITICS,
  advanceCampaignState,
  advanceForeignAgendas,
  advanceOfficerPromises,
  applyAftermathDecision,
  applyAftermathPolicy,
  applyBorderSettlement,
  applyDiplomacyCommand,
  applyDoctrinePolitics,
  applyOfficerCommandPolitics,
  buildDecisionHighlights,
  getBorderNegotiationState,
  getDecisionExplanationState,
  getEffectiveCampaignAct,
  getOfficerPoliticalState,
  getPendingAftermathDecision,
  normalizeStrategicState,
  respondToOfficerDemand,
} from "./campaign-system.js";

export {
  ADMINISTRATION_MANDATES,
  ADMINISTRATION_MODES,
  AUTHORITY_DOMAINS,
  AUTHORITY_REFORM_STAGES,
  AUTHORITY_TRANSFER_METHODS,
  DOCTRINES,
  FACILITIES,
  FACTION_DEFINITIONS,
  OCCUPATION_POLICIES,
  PEACE_SETTLEMENTS,
  POLICY_DEFINITIONS,
  WAR_PLANS,
  getWarPlanOptions,
  getWarStage,
};

export { HISTORY_SCHEMA_VERSION, PRESSURE_DEFINITIONS };
export { TOWN_COMMAND_IDS, isTownCommand };
export { AFTERMATH_DECISIONS, AFTERMATH_POLICIES, BORDER_SETTLEMENTS, CAMPAIGN_ACTS, FOREIGN_AGENDAS, OFFICER_DEMAND_RESPONSES, OFFICER_POLITICS };
export {
  CENTRALIZATION_STAGES,
  HISTORY_POLICIES,
  LEVIATHAN_POLICIES,
  NATIONAL_REFORM_BUDGETS,
  NATIONAL_REFORM_SYSTEMS,
  REFORM_CONCESSIONS,
};

export const FORCED_ORDER_RULES = {
  maximumOverage: 2,
  failureChancePerPoint: 15,
  corruptionPerPoint: 0.6,
  supportPerPoint: -0.8,
  governancePenaltyPerPoint: 1,
};

export const FACTION_ACTIONS = {
  negotiate: {
    id: "negotiate", name: "交渉", money: 2, governanceCost: 1,
    detail: "支持 +6 / 過激度 -3",
    effect: { faction: { support: 6, radicalism: -3 } },
  },
  subsidize: {
    id: "subsidize", name: "援助", money: 5, governanceCost: 1,
    detail: "支持 +10 / 過激度 -2 / 腐敗 +0.5",
    effect: { faction: { support: 10, radicalism: -2 }, internal: { corruption: 0.5 } },
  },
  suppress: {
    id: "suppress", name: "弾圧", money: 3, governanceCost: 2,
    detail: "支持 -7 / 過激度 -6 / 治安 +3 / 恐怖 +5",
    effect: { faction: { support: -7, radicalism: -6 }, resources: { security: 3 }, internal: { fear: 5 } },
  },
};

export const WORLD = {
  continent: { id: "eldoria", name: "エルドリア大陸", note: "王国・公国・連合国家が河川、峠、大陸公路を介して接する大陸圏。" },
  nation: { id: "selena", name: "セレナ王国", shortName: "セレナ", ruler: "レナ・アルシエ王", government: "諸州評議王政", capital: "selene", color: "#2d706f" },
  countries: {
    selena: { id: "selena", name: "セレナ王国", capital: "王都セレネ", color: "#2d706f", government: "諸州評議王政" },
    valka: { id: "valka", name: "ヴァルカ公国", capital: "鉄門城ヴァルカ", color: "#9b5548", government: "辺境諸侯会議" },
    vinia: { id: "vinia", name: "ヴィニア", capital: "ヴィニア王都", color: "#a87847", government: "王国" },
    forest_alliance: { id: "forest_alliance", name: "森の連合国", capital: "翠冠議都", color: "#587457", government: "連合国" },
    lustrond: { id: "lustrond", name: "ルストロンド公国", capital: "白壁都", color: "#7a6a91", government: "公国" },
    izmenia: { id: "izmenia", name: "イズメニア", capital: "イズメニア王都", color: "#8e604f", government: "王国" },
    heavens_gate: { id: "heavens_gate", name: "ヘブンズゲート王国", capital: "天門京", color: "#536b89", government: "王国" },
    deadland: { id: "deadland", name: "デッドランド冥府", capital: "首府未詳", color: "#514b62", government: "冥府国家", rank: "大国" },
    great_empire: { id: "great_empire", name: "グレート帝国", capital: "帝都未詳", color: "#8a6556", government: "帝国 / 神国保護領", rank: "大国" },
    avanheln: { id: "avanheln", name: "アバンヘルン連盟", capital: "主都未詳", color: "#7c5944", government: "山岳連盟 / 竜王保護領", rank: "大国" },
  },
  provinces: {
    selene: { id: "selene", owner: "selena", name: "王都セレネ", kind: "中央州", cityX: 420, cityY: 315, villages: ["mugiwano", "tsukishiro"], note: "王国評議会と諸州の使節が、大陸公路の規格と課税を調整する中枢。" },
    nereia: { id: "nereia", owner: "selena", name: "河港ネレイア", kind: "南河州", cityX: 465, cityY: 455, villages: ["shionari", "aonagi"], note: "銀脈河の水運と南部街道を束ねる河港。国境危機では軍需集積地となる。" },
    orta: { id: "orta", owner: "selena", name: "城塞市オルタ", kind: "東境州", cityX: 565, cityY: 315, villages: ["haimugi", "kanezaka"], note: "灰冠峠へ通じる国境城塞。街道規格の不一致が増援と輜重を遅らせている。" },
    valka_keep: { id: "valka_keep", owner: "valka", name: "鉄門城ヴァルカ", kind: "公国首府", cityX: 735, cityY: 320, villages: [], note: "灰冠峠の東口と関税を支配する城塞都市。" },
    vinia_capital: { id: "vinia_capital", owner: "vinia", name: "ヴィニア王都", kind: "王都", cityX: 500, cityY: 130, villages: [], note: "北方公路を押さえ、大陸中央の均衡を注視する。" },
    green_crown: { id: "green_crown", owner: "forest_alliance", name: "翠冠議都", kind: "連合議都", cityX: 235, cityY: 155, villages: [], note: "森林諸邦の合議が開かれる北西の中心地。" },
    whitewall: { id: "whitewall", owner: "lustrond", name: "白壁都", kind: "公都", cityX: 225, cityY: 495, villages: [], note: "南西交易路の結節点。ヘブンズゲート王国の保護領。" },
    izmenia_capital: { id: "izmenia_capital", owner: "izmenia", name: "イズメニア王都", kind: "王都", cityX: 760, cityY: 500, villages: [], note: "南東から国境戦争と交易路の変化を見定める。" },
    sky_gate: { id: "sky_gate", owner: "heavens_gate", name: "天門京", kind: "王都", cityX: 820, cityY: 125, villages: [], note: "北東の大国。保護領秩序を守るため大陸戦争へ介入しうる。" },
  },
  villages: {
    mugiwano: { id: "mugiwano", province: "selene", name: "麦輪村", kind: "農村", population: 1350, x: 370, y: 275, issue: "州境を越える荷札が二重になっている。" },
    tsukishiro: { id: "tsukishiro", province: "selene", name: "月代村", kind: "宿場村", population: 920, x: 405, y: 365, issue: "伝馬役の割当が農繁期と重なっている。" },
    shionari: { id: "shionari", province: "nereia", name: "汐成村", kind: "河漁村", population: 1100, x: 420, y: 505, issue: "国境封鎖を恐れ、川船が上流へ出なくなった。" },
    aonagi: { id: "aonagi", province: "nereia", name: "青凪村", kind: "舟運村", population: 1480, x: 520, y: 485, issue: "軍と商会が同じ荷揚げ場を使用している。" },
    haimugi: { id: "haimugi", province: "orta", name: "灰麦村", kind: "農村", population: 1620, x: 610, y: 270, issue: "軍用馬車の車軸規格が王都と異なる。" },
    kanezaka: { id: "kanezaka", province: "orta", name: "鐘坂村", kind: "鉱村", population: 860, x: 620, y: 365, issue: "峠警備の負担が一部の家に偏っている。" },
  },
  strategicZones: {
    ash_pass: { id: "ash_pass", name: "灰冠峠", value: 86, note: "セレナとヴァルカを結ぶ最短の軍道・隊商路。" },
    silver_river: { id: "silver_river", name: "銀脈河", value: 68, note: "中央平原と南部諸国を結ぶ舟運の動脈。" },
    imperial_road: { id: "imperial_road", name: "大陸公路", value: 74, note: "北西から東境へ通じ、外交と軍需の速度を左右する幹線。" },
  },
  characters: {
    edras: { id: "edras", name: "エドラス・ヴェイン", portrait: "エ", portraitImage: "assets/generated/officer-edras.webp", role: "王都執政官", policy: "戸籍整備", stats: { leadership: 46, war: 31, intelligence: 70, politics: 84, charisma: 66 }, traits: ["commerce", "harbor"] },
    mara: { id: "mara", name: "マーラ・ネレイス", portrait: "マ", portraitImage: "assets/generated/officer-mara.webp", role: "河港太守", policy: "河川交易", stats: { leadership: 73, war: 61, intelligence: 69, politics: 65, charisma: 78 }, traits: ["diplomacy", "scouting"] },
    gaius: { id: "gaius", name: "ガイウス・オルタ", portrait: "ガ", portraitImage: "assets/generated/officer-gaius.webp", role: "北部太守", policy: "兵站改革", stats: { leadership: 76, war: 70, intelligence: 52, politics: 57, charisma: 62 }, traits: ["drill", "repair", "mobilize"] },
    sera: { id: "sera", name: "セラ・クレフ", portrait: "セ", portraitImage: "assets/generated/officer-sera.webp", role: "王国軍師", policy: "情報府", stats: { leadership: 48, war: 36, intelligence: 86, politics: 79, charisma: 59 }, traits: ["scouting", "justification"] },
    ilva: { id: "ilva", name: "イルヴァ・ロウ", portrait: "イ", portraitImage: "assets/generated/officer-ilva.webp", role: "無所属の測量士", policy: "峠測量", stats: { leadership: 55, war: 39, intelligence: 78, politics: 64, charisma: 51 }, traits: ["scouting", "repair"] },
    dario: { id: "dario", name: "ダリオ・フェン", portrait: "ダ", portraitImage: "assets/generated/officer-dario.webp", role: "放浪軍の隊長", policy: "機動防衛", stats: { leadership: 81, war: 77, intelligence: 54, politics: 42, charisma: 69 }, traits: ["drill", "mobilize"] },
    mirel: { id: "mirel", name: "ミレル・サーン", portrait: "ミ", portraitImage: "assets/generated/officer-mirel.webp", role: "ヴァルカ系商人", policy: "縦横術", stats: { leadership: 38, war: 29, intelligence: 73, politics: 81, charisma: 84 }, traits: ["diplomacy", "commerce", "recruitment"] },
  },
};

export const ENEMY_COMMANDERS = Object.freeze({
  valka: Object.freeze({
    id: "adelheid_kraehe",
    countryId: "valka",
    name: "アデルハイト・クレーエ",
    portrait: "ア",
    portraitImage: "assets/generated/enemy-commander-valka.webp",
    role: "灰冠峠総司令",
    doctrine: "城砦防衛と局地反撃",
    stats: Object.freeze({ leadership: 79, war: 75, intelligence: 72 }),
  }),
});

export const GREAT_POWER_FOUNDATIONS = Object.freeze({
  deadland: Object.freeze({
    type: "低密度領域国家",
    surplusCapacity: 58,
    transportIntegration: 60,
    administrativeReach: 88,
    naturalFrontier: 93,
    environment: "西南の広大な湿原・暗色ステップ・多島海は農業人口を増やしにくい一方、侵攻軍の補給を著しく消耗させる。",
    integration: "食料消費の小さい死族労働力と長命官僚が、低密度の拠点・水路・葬道を長期間維持する。",
    limit: "可航河川から外れた乾燥地では機動が落ち、領域面積に比べて即応兵力を集中しにくい。",
  }),
  great_empire: Object.freeze({
    type: "大河流域帝国",
    surplusCapacity: 93,
    transportIntegration: 94,
    administrativeReach: 88,
    naturalFrontier: 78,
    environment: "東方の巨大沖積平野は北の連峰から流れる本流と支流で結ばれ、穀倉・河港・東海岸の外港を一つの市場圏にする。",
    integration: "帝都直轄の河川中枢、地方総督領、神国保護秩序を階層化し、舟運と幹線道で徴税・軍需を集約する。",
    limit: "南部半乾燥地と長い海岸線は辺境費を増やし、宗主ヘヴンズゲートとの秩序調整を欠く拡張は維持できない。",
  }),
  avanheln: Object.freeze({
    type: "山岳回廊連盟",
    surplusCapacity: 64,
    transportIntegration: 76,
    administrativeReach: 79,
    naturalFrontier: 96,
    environment: "南部の褶曲山脈は平行する長い谷と少数の峠を持ち、各盆地を守りながら同じ回廊で相互支援できる。",
    integration: "中央集権ではなく谷ごとの盟約、峠守備、竜王の超越的保護によって、広い山地を少ない行政費で束ねる。",
    limit: "平地余剰が小さく峠が閉じると連盟内輸送が分断されるため、外征より回廊防衛に適した大国である。",
  }),
});

export function getGreatPowerFoundation(countryId) {
  const foundation = GREAT_POWER_FOUNDATIONS[countryId];
  if (!foundation) return null;
  const score = Math.round(
    foundation.surplusCapacity * 0.25
    + foundation.transportIntegration * 0.25
    + foundation.administrativeReach * 0.3
    + foundation.naturalFrontier * 0.2,
  );
  const factors = [
    { id: "surplusCapacity", label: "余剰動員", value: foundation.surplusCapacity },
    { id: "transportIntegration", label: "交通統合", value: foundation.transportIntegration },
    { id: "administrativeReach", label: "行政到達", value: foundation.administrativeReach },
    { id: "naturalFrontier", label: "自然国境", value: foundation.naturalFrontier },
  ];
  return {
    ...foundation,
    score,
    viable: score >= 70 && foundation.transportIntegration >= 55 && foundation.administrativeReach >= 65,
    factors,
    limitingFactor: [...factors].sort((a, b) => a.value - b.value)[0],
  };
}

export const CAMPAIGN_BRIEF = Object.freeze({
  role: "セレナ王",
  title: "灰冠峠の国境危機を収束させる",
  objective: "三州の暮らしと兵站を維持しながら、制度・情報・外交準備を整え、必要なら限定戦争と講和で隊商差押えを終わらせる。",
  guardrail: "金・食料・治安・民心を立て直せないほど消耗させない。世界地図と台帳は、命令を決めるための判断材料です。",
  objectives: [
    { id: "transit", label: "国境通行権を確保", detail: "隊商差押えと一方的な関税を終わらせる" },
    { id: "standards", label: "三州の道路規格を統一", detail: "公路と軍需輸送の遅延をなくす" },
    { id: "intelligence", label: "敵守備隊の情報を確定", detail: "交渉・開戦判断の不確実性を取り除く" },
  ],
  loop: [
    { id: "doctrine", label: "方針", detail: "季節の初めに優先分野を一つ決める" },
    { id: "orders", label: "支出", detail: "六つの国家支出から具体策と担当武将を選ぶ" },
    { id: "month", label: "月末", detail: "費用と予測を確認して月を確定する" },
    { id: "report", label: "報告", detail: "事件に対応し、結果から次の命令を決める" },
  ],
});

export const WAR_OBJECTIVES = {
  transit: { id: "transit", name: "国境通行権の保障", mode: "offensive", scope: "limited", politicalValue: 68, description: "隊商差押えの停止と灰冠峠の通行権を条約化する。領土は要求しない。", escalationRisk: 20, targetScore: 32 },
  pass_control: { id: "pass_control", name: "灰冠峠の共同管理", mode: "offensive", scope: "limited", politicalValue: 79, description: "ヴァルカの関所を共同管理とし、単独封鎖を不可能にする。", escalationRisk: 42, targetScore: 46 },
  submission: { id: "submission", name: "ヴァルカ政権の屈服", mode: "offensive", scope: "total", politicalValue: 88, description: "公領の外交権を奪う。通航問題を越えた全面的な体制変更となる。", escalationRisk: 78, targetScore: 68 },
  homeland_defense: { id: "homeland_defense", name: "東境州の防衛", mode: "defensive", scope: "limited", politicalValue: 92, description: "侵攻軍を国境外へ押し戻し、都市・住民・行政網を守る。", escalationRisk: 12, targetScore: 28 },
};

export const FORMATIONS = {
  column: { id: "column", name: "行軍縦隊", description: "輜重と補給線を守る。損耗を抑え、組織を維持する。", score: 1, supply: 2, loss: -4 },
  line: { id: "line", name: "横陣", description: "峠口を広く圧迫する。戦線圧力を高めるが側道警戒が薄くなる。", score: 4, supply: -1, loss: 0 },
  assault: { id: "assault", name: "突撃陣", description: "敵関所へ集中する。成果と損耗、指揮官依存がともに大きい。", score: 7, supply: -3, loss: 5 },
};

export const SPENDING_CATEGORIES = Object.freeze({
  social_security: { id: "social_security", name: "社会保障", icon: "民", color: "#d87b6a", description: "生活、食料、衛生、治安を支え、国民の暮らしと民心を安定させる。" },
  military_affairs: { id: "military_affairs", name: "軍事関連", icon: "軍", color: "#c7a83e", description: "訓練、動員、人材確保に支出し、国防と戦役遂行能力を整える。" },
  research_development: { id: "research_development", name: "研究開発", icon: "研", color: "#5d8fc0", description: "測量、制度、行政技術へ投資し、情報と国家運営の精度を高める。" },
  foreign_aid: { id: "foreign_aid", name: "対外援助", icon: "援", color: "#8f6eb5", description: "使節、援助、対外広報を通じて、他国との関係と交渉条件を整える。" },
  debt_repayment: { id: "debt_repayment", name: "国債返済", icon: "債", color: "#d28d35", description: "国債の元本を返済し、将来の財政負担と信用不安を減らす。" },
  economic_investment: { id: "economic_investment", name: "経済投資", icon: "産", color: "#4f8b70", description: "農業、商業、道路、交易へ投資し、将来の生産と税収を育てる。" },
});

export const REVENUE_CATEGORIES = Object.freeze({
  land_tax: { id: "land_tax", name: "農地税", color: "#4c9a8e" },
  commerce_tax: { id: "commerce_tax", name: "商業税", color: "#3f78a8" },
  other_income: { id: "other_income", name: "その他歳入", color: "#8a6bb3" },
});

const command = (id, group, spendingCategory, name, taskType, cost, description, extras = {}) => ({
  id, group, spendingCategory, name, taskType, cost, description, durationTurns: 1, governanceCost: 1, ...extras,
});

export const COMMANDS = {
  "welfare.relief": command("welfare.relief", "city", "social_security", "生活支援給付", "patrol", { money: 6 }, "困窮世帯へ給付を行い、民心と地域の安定を回復する。", { repeatable: true }),
  "welfare.health": command("welfare.health", "city", "social_security", "公衆衛生事業", "repair", { money: 5 }, "診療所、井戸、下水を整備し、衛生と民心を改善する。", { repeatable: true }),
  "city.patrol": command("city.patrol", "city", "social_security", "治安巡回", "patrol", { money: 3 }, "巡回と負担調整を行い、治安と徴募回復を支える。", { repeatable: true }),
  "city.drill": command("city.drill", "city", "military_affairs", "駐屯訓練", "drill", { money: 4 }, "駐屯兵を訓練し、実効戦力を高める。", { repeatable: true }),
  "military.mobilize": command("military.mobilize", "military", "military_affairs", "東部国境軍を動員", "mobilize", { money: 7, draftPopulation: 180 }, "徴募可能人口から兵を集める。", { defaultCityId: "orta", repeatable: true, governanceCost: 2 }),
  "court.invite": command("court.invite", "people", "military_affairs", "放浪隊を軍務へ勧誘", "recruitment", { money: 7 }, "ダリオを誘い、友軍の放浪隊を結成する。", { defaultCityId: "orta", targetOfficerId: "dario" }),
  "research.administration": command("research.administration", "city", "research_development", "行政技術を研究", "harbor", { money: 7 }, "戸籍、会計、文書様式を研究し、行政効率と腐敗対策を改善する。", { repeatable: true }),
  "admin.harbor_standard": command("admin.harbor_standard", "city", "research_development", "州間規格を統一", "harbor", { money: 8 }, "三州の車軸・荷札・通行時刻を一つの公路令に揃える。", { defaultCityId: "orta", durationTurns: 2, governanceCost: 2 }),
  "navy.soundings": command("navy.soundings", "military", "research_development", "灰冠峠を測量", "scouting", { money: 5 }, "側道・渡河点・敵哨戒を確認し、軍情報を改善する。", { defaultCityId: "orta", durationTurns: 2, governanceCost: 2 }),
  "court.serve": command("court.serve", "people", "research_development", "測量士を研究職へ登用", "recruitment", { money: 4 }, "測量士イルヴァへ仕官を取り次ぐ。", { defaultCityId: "selene", targetOfficerId: "ilva" }),
  "diplomacy.talks": command("diplomacy.talks", "diplomacy", "foreign_aid", "相互通行を正式要求", "diplomacy", { money: 3 }, "隊商差押えの停止と相互通行権を正式議題にする。", { defaultCityId: "selene", durationTurns: 2, governanceCost: 2 }),
  "diplomacy.concession": command("diplomacy.concession", "diplomacy", "foreign_aid", "共同関税案を提示", "diplomacy", { money: 5 }, "関税上限を相互化する譲歩で、条約の受諾見込みを高める。", { defaultCityId: "selene", governanceCost: 2, repeatable: true, requiresNegotiation: true }),
  "diplomacy.mediation": command("diplomacy.mediation", "diplomacy", "foreign_aid", "第三国の仲介を招請", "diplomacy", { money: 6 }, "友好国を仲介者に立て、拒否の外交費用を高める。", { defaultCityId: "selene", durationTurns: 2, governanceCost: 2, repeatable: true, requiresNegotiation: true }),
  "diplomacy.pressure": command("diplomacy.pressure", "diplomacy", "foreign_aid", "武装護送を公示", "justification", { money: 5 }, "隊商護送隊を編成し、武力を背景に限定妥協を迫る。", { defaultCityId: "orta", governanceCost: 2, repeatable: true, requiresNegotiation: true }),
  "diplomacy.aid": command("diplomacy.aid", "diplomacy", "foreign_aid", "国境商会を支援", "diplomacy", { money: 14 }, "ヴァルカの国境商会へ資金を供与する。", { defaultCityId: "selene", governanceCost: 2 }),
  "diplomacy.justify": command("diplomacy.justify", "diplomacy", "foreign_aid", "国境侵犯を対外公示", "justification", { money: 4 }, "差押え記録と条約違反を周辺諸国へ公開する。", { defaultCityId: "selene", governanceCost: 2 }),
  "court.recruit": command("court.recruit", "people", "foreign_aid", "外交顧問を登用", "recruitment", { money: 10 }, "ミレルを外交官として登用する。", { defaultCityId: "nereia", targetOfficerId: "mirel" }),
  "debt.principal": command("debt.principal", "fiscal", "debt_repayment", "国債元本を返済", "commerce", { money: 8 }, "王都金庫から国債元本を返済し、国家債務を8減らす。", { defaultCityId: "selene", repeatable: true, debtPayment: 8 }),
  "city.cultivate": command("city.cultivate", "city", "economic_investment", "開墾", "cultivate", { money: 4 }, "水路と共同地を整え、生産力と食料収支を改善する。", { repeatable: true }),
  "city.commerce": command("city.commerce", "city", "economic_investment", "商業振興", "commerce", { money: 5 }, "市場・倉札・信用を整え、月次収入を伸ばす。", { repeatable: true }),
  "city.repair": command("city.repair", "city", "economic_investment", "都市基盤を補修", "repair", { money: 5 }, "城壁・街道・埠頭を補修し、防備と造船力を増やす。", { repeatable: true }),
  "diplomacy.trade": command("diplomacy.trade", "diplomacy", "economic_investment", "大陸交易協定を打診", "diplomacy", { money: 6 }, "相互の市場と街道使用を制度化する。", { defaultCityId: "selene", governanceCost: 2 }),
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clone = (value) => structuredClone(value);

function factionState(support, influence, radicalism) {
  return { support, influence, radicalism, demand: null };
}

function facilities(levels) {
  return Object.fromEntries(Object.keys(FACILITIES).map((id) => [id, { level: levels[id] ?? 0, condition: 100 }]));
}

function cityState({ population, food, money, production, commerce, security, support, defense, sanitation, corruption, administration, housing, preservation, fear, draft, troops, sailors, ships, training, shipyard, governorId, facilityLevels }) {
  return {
    resources: { population, food, money, production, commerce, security, support, defense },
    internal: { sanitation, corruption, administrativeEfficiency: administration, housingCapacity: housing, foodPreservation: preservation, fear },
    military: { draftPopulation: draft, troops, sailors, ships, training, shipyard },
    facilities: facilities(facilityLevels),
    policies: { landTax: "standard", commerceTax: "standard", conscription: "militia", rationing: "normal", immigration: "neutral", securityPolicy: "fair" },
    policyChangedAt: {},
    factions: {
      farmers: factionState(59, 32, 13), merchants: factionState(55, 26, 16),
      landowners: factionState(61, 24, 12), military: factionState(62, 18, 10),
    },
    workforce: { participationRate: 0.47 }, governorId, projects: [], activeEffects: [], issues: [], administration: null,
  };
}

function startingProblems() {
  return [
    { id: "bandits", cityId: "nereia", title: "盗賊被害", severity: 42 },
    { id: "corruption", cityId: "selene", title: "官僚腐敗", severity: 38 },
  ];
}

function foreignState(relation, army, mobility, training, organization, cohesion, hostility, interventionWeight, stance) {
  return {
    relation, army, mobility, supportColumns: Math.max(6, Math.round(army / 260)), training, organization,
    cohesion, hostility, interventionWeight, stance, infrastructure: 100,
    civilianPopulation: army * 12, displaced: 0, civilianLosses: 0, warDamage: 0,
  };
}

export function normalizeWarState(state) {
  state.version = 9;
  normalizeGeneratedWorldState(state);
  state.occupations ??= [];
  state.warHistory ??= [];
  Object.values(state.foreignStates ?? {}).forEach((country) => {
    country.infrastructure = Number.isFinite(country.infrastructure) ? country.infrastructure : 100;
    country.civilianPopulation = Number.isFinite(country.civilianPopulation) ? country.civilianPopulation : Math.max(1000, (country.army ?? 0) * 12);
    country.displaced = Number.isFinite(country.displaced) ? country.displaced : 0;
    country.civilianLosses = Number.isFinite(country.civilianLosses) ? country.civilianLosses : 0;
    country.warDamage = Number.isFinite(country.warDamage) ? country.warDamage : 0;
  });
  if (state.war) {
    state.war.side ??= "attacker";
    state.war.plan ??= state.war.side === "defender" ? "defend" : "pass";
    state.war.devastation ??= 0;
    state.war.homeDamage ??= 0;
    state.war.displaced ??= 0;
    state.war.civilianLosses ??= 0;
    state.war.stage ??= getWarStage(state.war)?.id ?? "opening";
    const enemy = state.foreignStates?.[state.war.targetCountryId] ?? {};
    const ownArmy = Object.values(state.cities ?? {}).reduce((sum, city) => sum + (city.military?.troops ?? 0), 0);
    state.war.theater = normalizeWarTheater(state.war.theater, {
      targetCountryId: state.war.targetCountryId,
      objectiveId: state.war.objectiveId,
      side: state.war.side,
      ownArmy,
      enemyArmy: enemy.army ?? 0,
      ownMorale: state.forces?.frontier_guard?.morale ?? 60,
      enemyMorale: enemy.cohesion ?? 60,
      ownSupply: 60,
      enemySupply: enemy.organization ?? 58,
      year: state.year,
      month: state.month,
    });
  }
  state.occupations.forEach((occupation) => {
    occupation.status ??= "occupied";
    occupation.policy ??= "autonomy";
    occupation.months ??= 0;
    occupation.control ??= 55;
    occupation.resistance ??= 45;
    occupation.integration ??= 0;
    occupation.assimilation ??= 0;
    occupation.infrastructure ??= 55;
    occupation.displaced ??= 0;
    occupation.civilianLosses ??= 0;
    occupation.garrison ??= 360;
    occupation.requiredGarrison ??= 420;
    occupation.history ??= [];
  });
  normalizeAdministrationState(WORLD, state);
  normalizeTownAdministration(WORLD, state);
  [...(state.pendingOrders ?? []), ...(state.commandQueue ?? [])].forEach((item) => {
    if (item.kind === "command" && isTownCommand(item.commandId) && !item.townId) {
      item.townId = WORLD.provinces[item.cityId]?.villages?.[0] ?? null;
    }
  });
  normalizeStrategicState(WORLD, state);
  normalizeHistoryState(WORLD, state);
  return normalizeCentralizationCampaign(WORLD, state);
}

export function createInitialState(options = {}) {
  const state = {
    version: 9, year: 317, month: 4, turn: 0, phase: "planning", nextOrderId: 1,
    scenarioMode: options.scenarioMode === "generated" ? "generated" : "fixed",
    generatedWorld: createGeneratedWorldState({
      seed: options.seed,
      width: options.width,
      height: options.height,
      plateCount: options.plateCount,
      nationCount: options.nationCount,
      playerNationId: options.playerNationId,
    }, { year: 317, month: 4 }),
    rngSeed: 3170401, eventCooldowns: {}, eventPity: 0, pendingOrders: [], pendingEvent: null, pendingMonthReport: null,
    monthlyReports: [], annualReports: [], lastViewedReportId: null, governancePenalty: 0,
    legitimacy: 68, justification: 58, warExhaustion: 0, intelNetwork: 33,
    fiscal: { publicDebt: 24, totalDebtRepaid: 0 },
    cities: {
      selene: cityState({ population: 18400, food: 7200, money: 38, production: 55, commerce: 72, security: 69, support: 61, defense: 51, sanitation: 58, corruption: 12, administration: 72, housing: 20500, preservation: 92, fear: 12, draft: 860, troops: 880, sailors: 260, ships: 3, training: 58, shipyard: 31, governorId: "edras", facilityLevels: { farmland: 2, market: 2, road: 2, granary: 1, barracks: 1, office: 2 } }),
      nereia: cityState({ population: 13700, food: 5600, money: 32, production: 42, commerce: 78, security: 57, support: 54, defense: 46, sanitation: 51, corruption: 18, administration: 61, housing: 15200, preservation: 90, fear: 16, draft: 690, troops: 720, sailors: 420, ships: 3, training: 61, shipyard: 68, governorId: "mara", facilityLevels: { farmland: 1, market: 2, road: 2, granary: 1, barracks: 1, office: 1 } }),
      orta: cityState({ population: 9300, food: 4300, money: 22, production: 68, commerce: 49, security: 63, support: 58, defense: 64, sanitation: 55, corruption: 15, administration: 59, housing: 10800, preservation: 94, fear: 14, draft: 510, troops: 520, sailors: 160, ships: 1, training: 66, shipyard: 24, governorId: "gaius", facilityLevels: { farmland: 2, market: 1, road: 1, granary: 2, barracks: 1, office: 1 } }),
    },
    officers: {
      edras: { allegiance: "serving", loyalty: 82, merit: 240, stamina: 94, rank: "執政官", rankLevel: 4, location: "selene", assignment: null, bonds: { sera: 44 } },
      mara: { allegiance: "serving", loyalty: 76, merit: 210, stamina: 91, rank: "太守", rankLevel: 4, location: "nereia", assignment: null, bonds: { gaius: 31 } },
      gaius: { allegiance: "serving", loyalty: 79, merit: 225, stamina: 88, rank: "太守", rankLevel: 4, location: "orta", assignment: null, bonds: { mara: 31 } },
      sera: { allegiance: "serving", loyalty: 73, merit: 190, stamina: 96, rank: "軍師", rankLevel: 3, location: "selene", assignment: null, bonds: { edras: 44 } },
      ilva: { allegiance: "free", loyalty: 45, merit: 20, stamina: 90, rank: "在野", rankLevel: 0, location: "selene", assignment: null, bonds: {} },
      dario: { allegiance: "free", loyalty: 51, merit: 80, stamina: 86, rank: "放浪隊長", rankLevel: 1, location: "orta", assignment: null, bonds: {} },
      mirel: { allegiance: "foreign", loyalty: 42, merit: 65, stamina: 93, rank: "商人", rankLevel: 1, location: "nereia", assignment: null, bonds: {} },
    },
    council: { pending: true, doctrine: "balanced", seasonKey: "317-4", history: [] },
    commandQueue: [], completedCommands: [], agreements: { trade: false, transit: false, aid: false },
    issues: {
      border: { id: "border", title: "灰冠峠の関税と隊商差押え", severity: 72, status: "active", detail: "ヴァルカが関税を倍増し、セレナの隊商一隊を差し押さえた。" },
      standards: { id: "standards", title: "三州の道路規格不一致", severity: 57, status: "active", detail: "車軸・荷札・通行時刻の違いで軍需馬車が平均二日遅れる。" },
      reports: { id: "reports", title: "敵守備隊報告の食い違い", severity: 64, status: "active", detail: "隊商は二千四百、斥候隊は千九百六十と報告している。" },
    },
    forces: { frontier_guard: { id: "frontier_guard", name: "東部国境軍", baseCityId: "orta", commanderId: "gaius", deputyId: "mara", formation: "column", organization: 67, morale: 64 } },
    foreignStates: {
      valka: foreignState(-31, 1960, 67, 58, 64, 59, 56, 72, "国境対立"),
      vinia: foreignState(18, 2840, 61, 62, 66, 70, 24, 48, "均衡維持"),
      forest_alliance: foreignState(34, 1720, 74, 55, 57, 64, 18, 33, "通商協調"),
      lustrond: foreignState(9, 1280, 52, 51, 55, 61, 21, 38, "慎重中立"),
      izmenia: foreignState(-8, 2440, 64, 65, 62, 68, 34, 54, "機会待ち"),
      heavens_gate: foreignState(2, 3680, 69, 71, 74, 78, 29, 82, "大陸秩序"),
      deadland: foreignState(-12, 5280, 48, 78, 82, 91, 46, 79, "冥府不介入"),
      great_empire: foreignState(5, 6120, 58, 73, 79, 83, 31, 88, "帝国均衡"),
      avanheln: foreignState(11, 4740, 72, 81, 76, 86, 27, 74, "山岳守勢"),
    },
    war: null, occupations: [], warHistory: [],
    log: [{ id: "opening", date: "誓暦317年 青月", scope: "評定", title: "春季評定が招集された", text: "隊商差押え、道路規格の不一致、敵守備隊報告を前に、今季の方針と担当武将を決める。", tone: "danger" }],
  };
  startingProblems().forEach((issue) => state.cities[issue.cityId].issues.push(issue));
  normalizeAdministrationState(WORLD, state);
  const normalized = normalizeWarState(state);
  advanceHistoricalSimulation(WORLD, normalized);
  return normalized;
}

export function getCampaignStatus(state) {
  normalizeStrategicState(WORLD, state);
  const completion = {
    transit: state.agreements.transit || state.issues.border.status === "resolved",
    standards: state.issues.standards.status === "resolved",
    intelligence: state.issues.reports.status === "resolved",
  };
  const objectives = CAMPAIGN_BRIEF.objectives.map((objective) => ({
    ...objective,
    complete: Boolean(completion[objective.id]),
  }));
  const completedCount = objectives.filter((objective) => objective.complete).length;
  const actId = getEffectiveCampaignAct(state);
  const negotiation = getBorderNegotiationState(WORLD, state);
  const acts = [
    {
      ...CAMPAIGN_ACTS.preparation,
      complete: state.issues.standards.status === "resolved" && state.issues.reports.status === "resolved" && negotiation.talksCompleted,
      progress: [state.issues.standards.status === "resolved", state.issues.reports.status === "resolved", negotiation.talksCompleted].filter(Boolean).length,
      total: 3,
    },
    { ...CAMPAIGN_ACTS.resolution, complete: completion.transit, progress: completion.transit ? 1 : 0, total: 1 },
    {
      ...CAMPAIGN_ACTS.aftermath,
      complete: Boolean(state.campaign.ending),
      progress: state.campaign.aftermathMonths ?? 0,
      total: state.campaign.aftermathPolicy ? AFTERMATH_POLICIES[state.campaign.aftermathPolicy].months : 2,
    },
  ];
  return {
    ...CAMPAIGN_BRIEF,
    objectives,
    acts,
    act: CAMPAIGN_ACTS[actId],
    actId,
    resolution: state.campaign.resolution,
    aftermathPolicy: state.campaign.aftermathPolicy,
    ending: state.campaign.ending,
    completedCount,
    totalCount: objectives.length,
    complete: Boolean(state.campaign.ending),
  };
}

export function getTurnGuidance(state) {
  if (state.phase === "event" && state.pendingEvent) {
    return {
      step: 4, stepLabel: "報告・事件",
      title: "都市事件への対応を決める",
      description: "選択を記録するまで次の月へは進みません。各案の効果を読み、王国として引き受ける代償を選びます。",
      action: "resolve_event", actionLabel: "事件の選択肢を見る",
    };
  }

  const latestReport = state.monthlyReports?.[0];
  if (latestReport && state.lastViewedReportId !== latestReport.id) {
    return {
      step: 4, stepLabel: "月次報告",
      title: `${latestReport.season} ${latestReport.monthName}の結果を確認する`,
      description: "都市収支、実行した命令、戦況、事件結果を確認すると、次月の方針へ進みます。",
      action: "open_reports", actionLabel: "月次報告を確認する",
    };
  }

  const campaign = getCampaignStatus(state);
  if (campaign.complete) {
    return {
      step: 4, stepLabel: "キャンペーン完結",
      title: campaign.ending.name,
      description: campaign.ending.description,
      action: "open_reports", actionLabel: "達成までの報告を見る",
    };
  }

  if (state.council.pending) {
    return {
      step: 1, stepLabel: "季節方針",
      title: "今季の方針を一つ選ぶ",
      description: "方針は今季の命令成果を左右します。まず評定で優先分野を決めてください。",
      action: "open_council", actionLabel: "評定で方針を選ぶ",
    };
  }

  if (campaign.actId === "aftermath") {
    const policy = campaign.aftermathPolicy ? AFTERMATH_POLICIES[campaign.aftermathPolicy] : null;
    const pendingDecision = policy ? getPendingAftermathDecision(WORLD, state) : null;
    return policy
      ? {
        step: 3, stepLabel: "戦後処理",
        title: pendingDecision ? pendingDecision.title : `「${policy.name}」を定着させる`,
        description: pendingDecision
          ? `${pendingDecision.prompt} 裁定の結果は国境関係と国内資源へ直ちに残ります。`
          : `${campaign.acts[2].progress} / ${campaign.acts[2].total}か月。通常政務と食料を維持しながら、新しい国境秩序を定着させてください。`,
        action: pendingDecision ? "open_aftermath" : "end_month",
        actionLabel: pendingDecision ? "第三幕の課題を裁定する" : "定着を一か月進める",
      }
      : {
        step: 2, stepLabel: "戦後方針",
        title: "得た通行権をどの秩序へ変えるか決める",
        description: "和解会議、交易回廊、常備監視隊では、関係・商業・安全保障に残る結果が異なります。",
        action: "open_aftermath", actionLabel: "第三幕の方針を選ぶ",
      };
  }

  if (!state.pendingOrders.length) {
    const foodSecurity = getFoodSecurityStatus(state);
    const foodEmergency = foodSecurity.primaryCity?.severity === "danger"
      ? foodSecurity.primaryCity
      : null;
    if (foodEmergency) {
      const townId = WORLD.provinces[foodEmergency.cityId].villages
        .map((id) => getTownAdministration(state, id))
        .sort((left, right) => left.forecast.foodSecurity - right.forecast.foodSecurity)[0]?.townId;
      return {
        step: 2, stepLabel: "食料危機",
        title: `${foodEmergency.name}の食料収支を立て直す`,
        description: `次月末の備蓄は${Math.max(0, Math.round(foodEmergency.after)).toLocaleString("ja-JP")}、現在の減少幅では約${foodEmergency.afterRunway.toFixed(1)}か月分です。開戦や追加支出より先に、食料生産を確保してください。`,
        action: "open_town",
        actionLabel: `${WORLD.villages[townId]?.name ?? "管内の町"}の町政を開く`,
        commandId: "city.cultivate",
        cityId: foodEmergency.cityId,
        townId,
      };
    }
    if (state.war) {
      return {
        step: 2, stepLabel: "戦役方針",
        title: "灰冠峠戦役の作戦を確認する",
        description: "政治目的、軍需、組織力、戦争疲弊を確認します。限定目的を達成したら講和し、通行権を条約化してください。",
        action: "open_military", actionLabel: "軍事画面で戦況を見る",
      };
    }
    const recommendations = [
      { issueId: "standards", commandId: "admin.harbor_standard", cityId: "orta", reason: "道路規格の不一致を解く" },
      { issueId: "reports", commandId: "navy.soundings", cityId: "orta", reason: "敵守備隊の情報を確定する" },
      { issueId: "border", commandId: "diplomacy.talks", cityId: "selene", reason: "隊商差押えの停止を交渉する" },
    ];
    const recommended = recommendations.find(({ issueId, commandId, cityId }) => (
      state.issues[issueId].status === "active" && getCommandAvailability(state, commandId, null, cityId).allowed
    ));
    if (!recommended && state.issues.border.status === "active" && state.completedCommands.includes("diplomacy.talks")) {
      return {
        step: 2, stepLabel: "国境決着",
        title: "条約・武装妥協・限定戦争を比較する",
        description: "受諾見込み、譲歩、第三国仲介、交渉力、期限を確認し、通行権を得る手段を選んでください。",
        action: "open_diplomacy", actionLabel: "外交決着を比較する",
      };
    }
    return {
      step: 2, stepLabel: "今月の支出",
      title: recommended ? `「${COMMANDS[recommended.commandId].name}」を検討する` : "今月の支出を一つ決める",
      description: recommended
        ? `${recommended.reason}ための推奨命令です。担当武将を選ぶと今月の計画へ入ります。`
        : "六つの国家支出から目的を選び、その配下の具体策へ担当武将を割り当ててください。",
      action: recommended ? "open_command" : "open_spending",
      actionLabel: recommended ? "担当武将を選ぶ" : "国家支出を選ぶ",
      commandId: recommended?.commandId ?? null,
      cityId: recommended?.cityId ?? WORLD.nation.capital,
    };
  }

  const governance = getGovernance(state);
  return {
    step: 3, stepLabel: "月末確定",
    title: `${state.pendingOrders.length}件の命令を予約しています`,
    description: governance.available > 0
      ? `統治力はあと${governance.available}点使えます。追加しなくても進行できます。費用と翌月予測を確認して月を終えてください。`
      : "統治力を使い切りました。費用と翌月予測を確認し、この計画で月を終えてください。",
    action: "end_month", actionLabel: "この計画で月を終える",
  };
}

export function formatDate(state) {
  const months = ["雪月", "芽月", "風月", "青月", "陽月", "潮月", "炎月", "実月", "霧月", "金月", "夜月", "星月"];
  return `誓暦${state.year}年 ${months[state.month - 1]}`;
}

function logEntry(state, scope, title, text, tone = "neutral") {
  state.log.unshift({ id: `${state.turn}-${state.log.length}-${title}`, date: formatDate(state), scope, title, text, tone });
  state.log = state.log.slice(0, 80);
}

export function deriveCityMetrics(state, cityId) { return modelCityMetrics(WORLD, state, cityId); }
export function deriveRealmLedger(state) {
  return { ...modelRealmLedger(WORLD, state), publicDebt: state.fiscal?.publicDebt ?? 24 };
}
export function deriveAdministrationNetwork(state) { return modelAdministrationNetwork(WORLD, state, deriveRealmLedger(state).cities); }
export function getCityAdministration(state, cityId) { return modelCityAdministration(WORLD, state, cityId, deriveCityMetrics(state, cityId)); }
export function getRegionAuthority(state, cityId) { return modelRegionAuthority(WORLD, state, cityId); }
export function getCentralizationResult(state) { return modelCentralizationResult(WORLD, state); }
export function getCentralizationCampaignStatus(state) { return deriveCentralizationCampaignStatus(WORLD, state); }
export function getCentralizationDecisions(state) { return getCentralizationPrimaryDecisions(WORLD, state); }
export function getHistoricalRuleEffects(state, regionId = null) { return deriveHistoricalRuleEffects(WORLD, state, regionId); }
export function getLeviathanStatus(state) { return deriveLeviathanStatus(WORLD, state); }
export function startNationalReformPackage(state, input) { return startNationalReform(WORLD, state, input); }
export function chooseHistoryPolicy(state, policyId) { return adoptHistoryPolicy(WORLD, state, policyId); }
export function chooseLeviathanPolicy(state, policyId) { return setLeviathanPolicy(WORLD, state, policyId); }
export function getAuthorityReform(state, cityId, domainId) { return modelAuthorityReformOptions(WORLD, state, cityId, domainId); }
export function startAuthorityReform(state, cityId, domainId, methodId, options = {}) {
  if (state.phase !== "planning") throw new Error("事件対応中は権限改革を開始できません");
  const next = modelStartAuthorityReform(WORLD, state, cityId, domainId, methodId, options);
  const reform = next.administration.reforms.at(-1);
  const legacyCauses = next.history.institutionalLegacies
    .filter((legacy) => legacy.regionId === cityId && legacy.domain === domainId)
    .map((legacy) => legacy.id);
  recordHistoricalEvent(WORLD, next, {
    id: `history-${reform.id}-started`,
    type: "institutional_reform_started",
    title: `${WORLD.provinces[cityId].name}で${AUTHORITY_DOMAINS[domainId].name}改革を開始`,
    summary: `${AUTHORITY_TRANSFER_METHODS[methodId].name}方式${options.forced ? "（準備工程を省略）" : ""}で中央移管に着手した。`,
    actors: [WORLD.nation.id, "central_court", reform.affectedGroupId].filter(Boolean),
    locations: [cityId],
    causedBy: legacyCauses.length ? legacyCauses : [`local-authority-${cityId}-${domainId}`],
    effects: [reform.id],
  });
  return next;
}
export function getHistoricalOverview(state, regionId = null) { return modelHistoricalOverview(WORLD, state, regionId); }
export function traceHistoricalCauses(state, eventId, maximumDepth = 5) { return modelTraceHistoricalCauses(state, eventId, maximumDepth); }
export function getOfficerReport(state, officerId) { return getOfficer(WORLD, state, officerId); }
export function getGovernance(state) { return deriveGovernance(WORLD, state); }
export function getCityBreakdown(state, cityId) { return formatBreakdown(deriveCityMetrics(state, cityId)); }

export function setAdministrationMode(state, cityId, mode) {
  if (!ADMINISTRATION_MODES[mode]) throw new Error("不明な統治方式です");
  if (!state.cities[cityId]) throw new Error("対象都市が不明です");
  if (state.phase !== "planning") throw new Error("事件対応中は統治方式を変更できません");
  const next = clone(state);
  normalizeAdministrationState(WORLD, next);
  next.cities[cityId].administration.mode = mode;
  logEntry(next, "州政", `${WORLD.provinces[cityId].name}を${ADMINISTRATION_MODES[mode].name}へ変更`, ADMINISTRATION_MODES[mode].description, "info");
  return next;
}

export function setAdministrationMandate(state, cityId, mandate) {
  if (!ADMINISTRATION_MANDATES[mandate]) throw new Error("不明な委任方針です");
  if (!state.cities[cityId]) throw new Error("対象都市が不明です");
  if (state.phase !== "planning") throw new Error("事件対応中は委任方針を変更できません");
  const next = clone(state);
  normalizeAdministrationState(WORLD, next);
  next.cities[cityId].administration.mandate = mandate;
  logEntry(next, "州政", `${WORLD.provinces[cityId].name}へ${ADMINISTRATION_MANDATES[mandate].name}を委任`, ADMINISTRATION_MANDATES[mandate].description, "info");
  return next;
}

export function getTaskForecast(state, commandId, officerId, cityId = null) {
  const item = COMMANDS[commandId];
  return modelTaskForecast(WORLD, state, item, officerId, item.defaultCityId ?? cityId ?? WORLD.nation.capital);
}

export function getTownAdministration(state, townId) {
  return modelTownAdministration(WORLD, state, townId);
}

export function getCountryReport(state, countryId) {
  const country = WORLD.countries[countryId];
  if (!country) return null;
  if (countryId === WORLD.nation.id) {
    const military = getMilitarySummary(state);
    return { ...country, relation: 100, stance: "自国", army: military.army, mobility: military.mobility, organization: military.organization, power: Math.round(military.army * military.organization / 100) };
  }
  const foreign = state.foreignStates[countryId];
  if (!foreign) return { ...country, relation: 0, stance: "情報不足", army: 0, mobility: 0, organization: 0, power: 0 };
  const power = Math.round(foreign.army * (0.45 + foreign.training / 180) * (0.45 + foreign.organization / 180) + foreign.mobility * foreign.supportColumns * 0.72);
  return { ...country, ...foreign, power };
}

export function getEnemyCommander(state, countryId = state.war?.targetCountryId ?? "valka") {
  const commander = ENEMY_COMMANDERS[countryId];
  if (!commander) return null;
  return { ...commander, country: getCountryReport(state, countryId) };
}

export function getContinentalBalance(state, targetId = "valka") {
  const surrounding = Object.entries(state.foreignStates).filter(([id]) => id !== targetId);
  const interventionRisk = clamp(Math.round(surrounding.reduce((sum, [, country]) => {
    const hostility = country.hostility + Math.max(0, -country.relation) * 0.45;
    return sum + hostility * country.interventionWeight / 100;
  }, 0) / Math.max(1, surrounding.length) + (state.war ? 12 : 0)), 0, 100);
  const diplomaticDepth = clamp(Math.round(surrounding.reduce((sum, [, country]) => sum + Math.max(0, country.relation) * country.interventionWeight / 100, 0) / Math.max(1, surrounding.length)), 0, 100);
  const strongest = surrounding.map(([id]) => getCountryReport(state, id)).sort((a, b) => b.power - a.power)[0];
  return { interventionRisk, diplomaticDepth, strongest, countries: Object.keys(WORLD.countries).map((id) => getCountryReport(state, id)) };
}

export function getWarSupport(state) {
  const ledger = deriveRealmLedger(state);
  return clamp(Math.round(ledger.publicOrder * 0.2 + ledger.support * 0.2 + state.legitimacy * 0.2 + state.justification * 0.25 + state.issues.border.severity * 0.15 - state.warExhaustion * 0.35), 0, 100);
}

export function getIntelligence(state) {
  const best = getServingOfficers(WORLD, state).reduce((value, officer) => Math.max(value, officer.stats.intelligence), 0);
  return clamp(Math.round(state.intelNetwork + best * 0.15), 0, 100);
}

function mutualBond(state, leftId, rightId) {
  return ((state.officers[leftId]?.bonds?.[rightId] ?? 20) + (state.officers[rightId]?.bonds?.[leftId] ?? 20)) / 2;
}

export function getMilitarySummary(state) {
  const ledger = deriveRealmLedger(state);
  const force = state.forces.frontier_guard;
  const commander = getOfficer(WORLD, state, force.commanderId);
  const deputy = getOfficer(WORLD, state, force.deputyId);
  const bond = mutualBond(state, commander.id, deputy.id);
  const commandScore = commander.stats.leadership * 0.48 + commander.stats.war * 0.18 + deputy.stats.intelligence * 0.12 + deputy.stats.leadership * 0.08 + bond * 0.14;
  const frontierCity = deriveCityMetrics(state, "orta");
  const road = frontierCity.facilities.facilities.find((facility) => facility.id === "road");
  const mobility = clamp(Math.round((road?.operatingRate ?? 0.6) * 28 + frontierCity.training * 0.25 + commander.stats.leadership * 0.22 + force.morale * 0.15 + (100 - state.issues.standards.severity) * 0.1), 0, 100);
  const supplyCoverage = clamp(Math.round(ledger.deliverableFood / Math.max(1, ledger.mobilizableTroops * 2.1) * 100), 0, 100);
  const organization = clamp(Math.round(force.organization * 0.52 + commandScore * 0.36 + ledger.capacityCoverage * 0.06 + ledger.defense * 0.06), 0, 100);
  const occupationGarrisons = (state.occupations ?? [])
    .filter((occupation) => occupation.status === "occupied")
    .reduce((sum, occupation) => sum + occupation.garrison, 0);
  const fieldArmy = Math.max(0, ledger.mobilizableTroops - occupationGarrisons) + (state.officers.dario.allegiance === "retinue" ? 220 : 0);
  return { army: fieldArmy, occupationGarrisons, supportColumns: Math.max(6, Math.round(Math.max(1, fieldArmy) / 300)), training: ledger.training, organization, mobility, supply: supplyCoverage, commander, deputy, force, mutualBond: bond };
}

function resolveCityId(item, cityId) { return item.defaultCityId ?? cityId ?? WORLD.nation.capital; }
function resolveTownId(item, cityId, townId) {
  if (!isTownCommand(item)) return null;
  const resolved = townId ?? WORLD.provinces[cityId]?.villages?.[0] ?? null;
  return WORLD.villages[resolved]?.province === cityId ? resolved : null;
}
function reservedOfficers(state) { return new Set(state.pendingOrders.map((order) => order.officerId).filter(Boolean)); }

export function getCommandAvailability(state, commandId, officerId = null, cityId = null, townId = null) {
  const item = COMMANDS[commandId];
  if (!item) return { allowed: false, reason: "不明な命令" };
  const targetCityId = resolveCityId(item, cityId);
  const city = state.cities[targetCityId];
  if (!city) return { allowed: false, reason: "対象都市が不明" };
  const targetTownId = resolveTownId(item, targetCityId, townId);
  if (isTownCommand(item) && !targetTownId) return { allowed: false, reason: "対象の町が不明" };
  if (item.debtPayment && (state.fiscal?.publicDebt ?? 24) <= 0) return { allowed: false, reason: "返済すべき国債がありません" };
  if (item.requiresNegotiation && state.negotiation?.status !== "open") return { allowed: false, reason: "正式交渉の開始後に選べます" };
  if (item.requiresNegotiation && (state.agreements.transit || state.issues.border.status === "resolved")) return { allowed: false, reason: "国境通行権は確保済みです" };
  if (!item.repeatable && (state.completedCommands.includes(commandId) || state.commandQueue.some((task) => task.commandId === commandId) || state.pendingOrders.some((order) => order.commandId === commandId))) return { allowed: false, reason: "実行済みまたは予約中" };
  if ([...state.commandQueue, ...state.pendingOrders].some((task) => task.commandId === commandId && task.cityId === targetCityId && (!targetTownId || task.townId === targetTownId))) return { allowed: false, reason: "同じ任務を実行中または予約中" };
  const reservedMoney = state.pendingOrders.filter((order) => order.cityId === targetCityId).reduce((sum, order) => sum + (order.cost?.money ?? 0), 0);
  const reservedDraft = state.pendingOrders.filter((order) => order.cityId === targetCityId).reduce((sum, order) => sum + (order.cost?.draftPopulation ?? 0), 0);
  if (city.resources.money - reservedMoney < (item.cost.money ?? 0)) return { allowed: false, reason: "都市金が不足" };
  if (city.military.draftPopulation - reservedDraft < (item.cost.draftPopulation ?? 0)) return { allowed: false, reason: "徴募可能人口が不足" };
  if (!officerId) return { allowed: true, reason: "担当人物を選択", cityId: targetCityId, townId: targetTownId };
  const officer = getOfficer(WORLD, state, officerId);
  if (!officer || officer.allegiance !== "serving") return { allowed: false, reason: "配下人物のみ担当可能" };
  if (officer.assignment || reservedOfficers(state).has(officerId)) return { allowed: false, reason: "別の任務を担当中または予約中" };
  if (officer.stamina < 20) return { allowed: false, reason: "意欲不足" };
  return { allowed: true, reason: `${item.durationTurns}か月 · 統治力${item.governanceCost}`, cityId: targetCityId, townId: targetTownId };
}

export function getEligibleOfficers(state, commandId, cityId = null, townId = null) {
  return getAvailableOfficers(WORLD, state).filter((officer) => getCommandAvailability(state, commandId, officer.id, cityId, townId).allowed);
}

function assertGovernance(state, cost, force) {
  const governance = getGovernance(state);
  const nextUsed = governance.used + cost;
  if (nextUsed > governance.hardLimit) throw new Error("統治力は強行命令の上限も超えています");
  if (nextUsed > governance.max && !force) {
    const error = new Error("この命令には強行命令の確認が必要です");
    error.code = "FORCE_REQUIRED";
    error.forcedPoints = Math.max(0, nextUsed - governance.max);
    error.failureChance = error.forcedPoints * FORCED_ORDER_RULES.failureChancePerPoint;
    error.corruptionPenalty = error.forcedPoints * FORCED_ORDER_RULES.corruptionPerPoint;
    error.supportPenalty = error.forcedPoints * Math.abs(FORCED_ORDER_RULES.supportPerPoint);
    error.governancePenalty = Math.min(2, error.forcedPoints * FORCED_ORDER_RULES.governancePenaltyPerPoint);
    throw error;
  }
  return Math.max(0, nextUsed - governance.max);
}

function orderId(state) { return `order-${state.turn}-${state.nextOrderId++}`; }

export function queueOrder(state, specification) {
  if (state.phase !== "planning") throw new Error("事件対応中は命令を追加できません");
  const next = clone(state);
  const kind = specification.kind ?? "command";
  let order;
  if (kind === "command") {
    const item = COMMANDS[specification.commandId];
    const availability = getCommandAvailability(state, specification.commandId, specification.officerId, specification.cityId, specification.townId);
    if (!availability.allowed) throw new Error(availability.reason);
    const forcedPoints = assertGovernance(state, item.governanceCost, specification.force);
    order = { id: orderId(next), kind, commandId: item.id, cityId: availability.cityId, townId: availability.townId, officerId: specification.officerId, cost: clone(item.cost), governanceCost: item.governanceCost, durationTurns: item.durationTurns, forced: forcedPoints > 0, forcedPoints };
  } else if (kind === "facility") {
    const city = state.cities[specification.cityId];
    const upgrade = city && getFacilityUpgradeSpec(city, specification.facilityId);
    if (!upgrade) throw new Error("この施設はこれ以上強化できません");
    if (city.projects.some((project) => project.facilityId === specification.facilityId) || state.pendingOrders.some((item) => item.kind === "facility" && item.cityId === specification.cityId && item.facilityId === specification.facilityId)) throw new Error("同じ施設を建設中です");
    const reserved = state.pendingOrders.filter((item) => item.cityId === specification.cityId).reduce((sum, item) => sum + (item.cost?.money ?? 0), 0);
    if (city.resources.money - reserved < upgrade.money) throw new Error("都市金が不足しています");
    const forcedPoints = assertGovernance(state, upgrade.governanceCost, specification.force);
    order = { id: orderId(next), kind, cityId: specification.cityId, facilityId: specification.facilityId, targetLevel: upgrade.targetLevel, cost: { money: upgrade.money }, governanceCost: upgrade.governanceCost, durationTurns: upgrade.durationTurns, forced: forcedPoints > 0, forcedPoints };
  } else if (kind === "policy") {
    const city = state.cities[specification.cityId];
    const definition = POLICY_DEFINITIONS[specification.policyId];
    if (!city || !definition?.options[specification.optionId]) throw new Error("政策または選択肢が不明です");
    if (city.policies[specification.policyId] === specification.optionId) throw new Error("すでに採用中の方針です");
    if (state.pendingOrders.some((item) => item.kind === "policy" && item.cityId === specification.cityId && item.policyId === specification.policyId)) throw new Error("同じ政策変更を予約済みです");
    const forcedPoints = assertGovernance(state, 1, specification.force);
    order = { id: orderId(next), kind, cityId: specification.cityId, policyId: specification.policyId, optionId: specification.optionId, cost: {}, governanceCost: 1, durationTurns: 1, forced: forcedPoints > 0, forcedPoints };
  } else if (kind === "faction") {
    const city = state.cities[specification.cityId];
    const action = FACTION_ACTIONS[specification.action];
    if (!city?.factions[specification.factionId] || !action) throw new Error("派閥命令が不明です");
    const reserved = state.pendingOrders.filter((item) => item.cityId === specification.cityId).reduce((sum, item) => sum + (item.cost?.money ?? 0), 0);
    if (city.resources.money - reserved < action.money) throw new Error("都市金が不足しています");
    const forcedPoints = assertGovernance(state, action.governanceCost, specification.force);
    order = { id: orderId(next), kind, cityId: specification.cityId, factionId: specification.factionId, action: specification.action, cost: { money: action.money }, governanceCost: action.governanceCost, durationTurns: 1, forced: forcedPoints > 0, forcedPoints };
  } else throw new Error("命令種別が不明です");
  next.pendingOrders.push(order);
  return next;
}

export function cancelOrder(state, id) {
  if (state.phase !== "planning") throw new Error("事件対応中は取消できません");
  const next = clone(state);
  const before = next.pendingOrders.length;
  next.pendingOrders = next.pendingOrders.filter((order) => order.id !== id);
  if (next.pendingOrders.length === before) throw new Error("予約命令が見つかりません");
  return next;
}

function improvement(outcome, divisor = 18) { return Math.max(1, Math.round(outcome / divisor)); }

function completeCommand(state, task) {
  const item = COMMANDS[task.commandId];
  const city = state.cities[task.cityId];
  const outcome = deterministicOutcome(task, state.turn);
  const delta = improvement(outcome);
  applyTownCommand(WORLD, state, task, delta, outcome);
  switch (task.commandId) {
    case "city.cultivate": city.resources.production = clamp(city.resources.production + delta, 0, 100); break;
    case "city.commerce": city.resources.commerce = clamp(city.resources.commerce + delta, 0, 100); break;
    case "welfare.relief": city.resources.support = clamp(city.resources.support + Math.max(2, Math.round(delta * 1.4)), 0, 100); city.resources.security = clamp(city.resources.security + Math.max(1, Math.round(delta / 2)), 0, 100); break;
    case "welfare.health": city.internal.sanitation = clamp(city.internal.sanitation + Math.max(2, Math.round(delta * 1.5)), 0, 100); city.resources.support = clamp(city.resources.support + Math.max(1, Math.round(delta / 2)), 0, 100); break;
    case "city.patrol": city.resources.security = clamp(city.resources.security + delta, 0, 100); break;
    case "city.repair": city.resources.defense = clamp(city.resources.defense + delta, 0, 100); city.facilities.road.condition = clamp(city.facilities.road.condition + delta * 2, 0, 100); break;
    case "city.drill": city.military.training = clamp(city.military.training + delta, 0, 100); break;
    case "research.administration": city.internal.administrativeEfficiency = clamp(city.internal.administrativeEfficiency + Math.max(2, Math.round(delta * 1.4)), 0, 100); city.internal.corruption = clamp(city.internal.corruption - Math.max(1, Math.round(delta / 2)), 0, 100); break;
    case "admin.harbor_standard":
      state.issues.standards.severity = clamp(state.issues.standards.severity - outcome, 0, 100);
      if (state.issues.standards.severity <= 15) state.issues.standards.status = "resolved";
      Object.values(state.cities).forEach((value) => { value.resources.commerce = clamp(value.resources.commerce + Math.max(1, Math.round(delta / 2)), 0, 100); });
      break;
    case "navy.soundings": state.intelNetwork = clamp(state.intelNetwork + delta * 2, 0, 100); state.issues.reports.severity = clamp(state.issues.reports.severity - outcome, 0, 100); if (state.issues.reports.severity <= 15) state.issues.reports.status = "resolved"; break;
    case "diplomacy.talks": state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation + delta * 2, -100, 100); break;
    case "diplomacy.trade": state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation + delta, -100, 100); if (outcome >= 58) state.agreements.trade = true; break;
    case "diplomacy.aid": state.foreignStates.valka.relation = clamp(state.foreignStates.valka.relation + Math.round(delta * 1.5), -100, 100); if (outcome >= 55) state.agreements.aid = true; break;
    case "diplomacy.justify": state.justification = clamp(state.justification + delta * 2, 0, 100); break;
    case "debt.principal": {
      state.fiscal ??= { publicDebt: 24, totalDebtRepaid: 0 };
      const payment = Math.min(item.debtPayment, state.fiscal.publicDebt);
      state.fiscal.publicDebt = Math.max(0, state.fiscal.publicDebt - payment);
      state.fiscal.totalDebtRepaid = (state.fiscal.totalDebtRepaid ?? 0) + payment;
      state.legitimacy = clamp(state.legitimacy + 1, 0, 100);
      break;
    }
    case "military.mobilize": city.military.troops += Math.round(110 + outcome * 0.55); city.military.training = clamp(city.military.training + Math.max(1, Math.round(outcome / 30)), 0, 100); city.resources.security = clamp(city.resources.security - Math.max(2, Math.round(7 - outcome / 25)), 0, 100); break;
    case "court.serve": state.officers.ilva.allegiance = "serving"; state.officers.ilva.rank = "国境測量官"; state.officers.ilva.rankLevel = 2; break;
    case "court.invite": state.officers.dario.allegiance = "retinue"; break;
    case "court.recruit": state.officers.mirel.allegiance = "serving"; state.officers.mirel.rank = "外交顧問"; state.officers.mirel.rankLevel = 2; break;
    default: break;
  }
  if (item.group === "diplomacy") applyDiplomacyCommand(WORLD, state, task, outcome);
  if (!item.repeatable && !state.completedCommands.includes(task.commandId)) state.completedCommands.push(task.commandId);
  const officer = state.officers[task.officerId];
  officer.assignment = null; officer.location = task.cityId; officer.merit += Math.max(3, Math.round(outcome / 9)); officer.stamina = clamp(officer.stamina - 14, 0, 100);
  const reactions = applyOfficerCommandPolitics(WORLD, state, task, outcome);
  logEntry(state, "達成", item.name, `${task.townId ? `${WORLD.villages[task.townId].name}で` : ""}${WORLD.characters[task.officerId].name}が成果 ${outcome}。`, outcome >= 70 ? "success" : "neutral");
  return { outcome, delta, reactions, detail: `成果 ${outcome} / 基本改善 ${delta}${reactions.length ? ` / 人物反応 ${reactions.length}件` : ""}` };
}

function payOrder(city, order) {
  city.resources.money -= order.cost?.money ?? 0;
  city.military.draftPopulation -= order.cost?.draftPopulation ?? 0;
}

function applyFactionOrder(city, order) {
  const faction = city.factions[order.factionId];
  const effect = FACTION_ACTIONS[order.action].effect;
  Object.entries(effect.faction ?? {}).forEach(([key, value]) => { faction[key] = clamp(faction[key] + value, 0, 100); });
  Object.entries(effect.resources ?? {}).forEach(([key, value]) => { city.resources[key] = clamp(city.resources[key] + value, 0, 100); });
  Object.entries(effect.internal ?? {}).forEach(([key, value]) => { city.internal[key] = clamp(city.internal[key] + value, 0, 100); });
}

function orderTitle(order) {
  if (order.kind === "command") return COMMANDS[order.commandId].name;
  if (order.kind === "facility") return `${FACILITIES[order.facilityId].name} Lv.${order.targetLevel}`;
  if (order.kind === "policy") return `${POLICY_DEFINITIONS[order.policyId].name} → ${POLICY_DEFINITIONS[order.policyId].options[order.optionId].name}`;
  return `${FACTION_DEFINITIONS[order.factionId].name}へ${FACTION_ACTIONS[order.action].name}`;
}

function orderSpendingCategory(order) {
  if (order.kind === "command") return COMMANDS[order.commandId]?.spendingCategory ?? "economic_investment";
  if (order.kind === "facility") return "economic_investment";
  if (order.kind === "faction") return order.action === "suppress" ? "military_affairs" : "social_security";
  return "social_security";
}

function actionRecord(order) {
  return {
    id: order.id, kind: order.kind, cityId: order.cityId, townId: order.townId ?? null, title: orderTitle(order),
    status: "started", detail: "実行を開始", cost: clone(order.cost ?? {}),
    commandId: order.commandId ?? null, spendingCategory: orderSpendingCategory(order),
    governanceCost: order.governanceCost, forced: order.forced, forcedPoints: order.forcedPoints ?? 0,
  };
}

function startOrders(state) {
  const governance = getGovernance(state);
  const forced = Math.max(0, governance.used - governance.max);
  const actions = [];
  state.pendingOrders.forEach((order) => {
    const city = state.cities[order.cityId];
    const action = actionRecord(order);
    actions.push(action);
    payOrder(city, order);
    const failureChance = (order.forcedPoints ?? 0) * FORCED_ORDER_RULES.failureChancePerPoint;
    if (order.forced && nextRandom(state) < failureChance / 100) {
      action.status = "failed";
      action.failureChance = failureChance;
      action.detail = `強行失敗（失敗率 ${failureChance}%）。費用は消費された。`;
      logEntry(state, "強行", `${orderTitle(order)}が失敗`, `${WORLD.provinces[order.cityId].name}で強行命令が失敗した。費用は消費済み。`, "danger");
      return;
    }
    if (order.kind === "command") {
      const forecast = getTaskForecast(state, order.commandId, order.officerId, order.cityId);
      const task = { ...order, remainingTurns: order.durationTurns, forecast };
      state.commandQueue.push(task); state.officers[order.officerId].assignment = task.id;
      action.detail = `${order.townId ? `${WORLD.villages[order.townId].name}で` : ""}${WORLD.characters[order.officerId].name}が着手 / 完了まで${order.durationTurns}か月`;
    }
    if (order.kind === "facility") {
      city.projects.push({ ...order, remainingTurns: order.durationTurns });
      action.detail = `着工 / 完成まで${order.durationTurns}か月`;
    }
    if (order.kind === "policy") {
      const changedAt = city.policyChangedAt[order.policyId];
      city.policies[order.policyId] = order.optionId;
      city.policyChangedAt[order.policyId] = state.turn;
      const rapidChange = Number.isInteger(changedAt) && state.turn - changedAt < 3;
      if (rapidChange) { city.internal.corruption = clamp(city.internal.corruption + 1.5, 0, 100); city.resources.support = clamp(city.resources.support - 1.5, 0, 100); }
      action.status = "completed";
      action.detail = rapidChange ? "政策を変更。短期再変更により腐敗 +1.5 / 民心 -1.5" : "政策変更を適用";
    }
    if (order.kind === "faction") {
      applyFactionOrder(city, order);
      action.status = "completed";
      action.detail = FACTION_ACTIONS[order.action].detail;
    }
  });
  state.pendingOrders = [];
  state.governancePenalty = Math.min(2, forced * FORCED_ORDER_RULES.governancePenaltyPerPoint);
  if (forced > 0) {
    Object.values(state.cities).forEach((city) => {
      city.internal.corruption = clamp(city.internal.corruption + forced * FORCED_ORDER_RULES.corruptionPerPoint, 0, 100);
      city.resources.support = clamp(city.resources.support + forced * FORCED_ORDER_RULES.supportPerPoint, 0, 100);
    });
    logEntry(state, "強行", "統治力を超えて命令", `超過 ${forced}。腐敗・民心・翌月統治力に負担が残った。`, "danger");
  }
  return actions;
}

function progressWork(state, actions) {
  Object.values(state.cities).forEach((city) => {
    city.activeEffects.forEach((effect) => {
      Object.entries(effect.resources ?? {}).forEach(([key, value]) => { city.resources[key] = Math.max(key === "population" ? 1000 : 0, city.resources[key] + value); });
      Object.entries(effect.internal ?? {}).forEach(([key, value]) => { city.internal[key] = clamp(city.internal[key] + value, 0, 100); });
      effect.remainingTurns -= 1;
    });
    city.activeEffects = city.activeEffects.filter((effect) => effect.remainingTurns > 0);
    city.projects.forEach((project) => { project.remainingTurns -= 1; });
    city.projects.filter((project) => project.remainingTurns <= 0).forEach((project) => {
      city.facilities[project.facilityId].level = project.targetLevel;
      city.facilities[project.facilityId].condition = 100;
      const action = actions.find((item) => item.id === project.id);
      if (action) { action.status = "completed"; action.detail = "建設事業が完成し、今月から稼働"; }
      else actions.push({ id: `complete-${project.id}`, kind: "facility", cityId: project.cityId, title: `${FACILITIES[project.facilityId].name} Lv.${project.targetLevel}`, status: "completed", detail: "建設事業が完成し、今月から稼働", cost: {}, governanceCost: 0, forced: false });
      logEntry(state, "建設", `${FACILITIES[project.facilityId].name}レベル${project.targetLevel}`, "建設事業が完成した。", "success");
    });
    city.projects = city.projects.filter((project) => project.remainingTurns > 0);
  });
  state.commandQueue.forEach((task) => { task.remainingTurns -= 1; });
  state.commandQueue.filter((task) => task.remainingTurns <= 0).forEach((task) => {
    const result = completeCommand(state, task);
    const action = actions.find((item) => item.id === task.id);
    if (action) { action.status = "completed"; action.detail = result.detail; action.outcome = result.outcome; action.reactions = result.reactions; }
    else actions.push({ id: `complete-${task.id}`, kind: "command", commandId: task.commandId, cityId: task.cityId, title: COMMANDS[task.commandId].name, status: "completed", detail: result.detail, outcome: result.outcome, reactions: result.reactions, cost: {}, governanceCost: 0, forced: false });
  });
  state.commandQueue = state.commandQueue.filter((task) => task.remainingTurns > 0);
}

function resourceChanges(before, after) {
  return Object.fromEntries(Object.keys(before).map((key) => [key, Number((after[key] - before[key]).toFixed(1))]));
}

function cityOperatingFiscal(metrics) {
  const expenditure = Object.fromEntries(Object.keys(SPENDING_CATEGORIES).map((id) => [id, 0]));
  expenditure.social_security += metrics.officerWages;
  metrics.facilities.facilities.forEach((facility) => {
    const category = facility.id === "barracks" ? "military_affairs"
      : facility.id === "office" ? "research_development"
        : facility.id === "granary" ? "social_security"
          : "economic_investment";
    expenditure[category] += facility.upkeepTotal;
  });
  expenditure.military_affairs += metrics.troopUpkeep + metrics.fleetUpkeep;
  return {
    income: { land_tax: metrics.landTaxIncome, commerce_tax: metrics.commerceTaxIncome, other_income: 0 },
    expenditure,
  };
}

function applyCityMonth(state, cityId, opening) {
  const city = state.cities[cityId];
  const before = clone(city.resources);
  const metrics = deriveCityMetrics(state, cityId);
  city.resources.money = Math.max(-50, city.resources.money + metrics.netIncome);
  city.resources.food = Math.max(0, city.resources.food + metrics.foodBalance);
  city.resources.population = Math.max(1000, city.resources.population + metrics.populationDelta);
  city.resources.security = clamp(city.resources.security + metrics.securityDelta, 0, 100);
  city.resources.support = clamp(city.resources.support + metrics.supportDelta, 0, 100);
  city.internal.sanitation = clamp(city.internal.sanitation + metrics.sanitationDelta, 0, 100);
  city.internal.corruption = clamp(city.internal.corruption + metrics.corruptionDelta, 0, 100);
  city.internal.fear = clamp(city.internal.fear + metrics.fearDelta, 0, 100);
  city.military.draftPopulation = Math.min(Math.round(city.resources.population * 0.08), city.military.draftPopulation + metrics.draftRecovery);
  metrics.factions.forEach((forecast) => {
    const faction = city.factions[forecast.id];
    faction.support = clamp(faction.support + forecast.delta, 0, 100);
    faction.radicalism = clamp(faction.radicalism + forecast.radicalismDelta, 0, 100);
  });
  if (city.resources.money < 0) getServingOfficers(WORLD, state).filter((officer) => officer.location === cityId).forEach((officer) => { state.officers[officer.id].loyalty = clamp(state.officers[officer.id].loyalty - 1, 0, 100); });
  return {
    cityId, name: WORLD.provinces[cityId].name, before: clone(opening), after: clone(city.resources),
    changes: resourceChanges(opening, city.resources),
    breakdown: { orders: resourceChanges(opening, before), monthly: resourceChanges(before, city.resources), external: {} },
    factors: metrics.forecasts,
    fiscal: cityOperatingFiscal(metrics),
  };
}

function consumeWarFood(state, amount) {
  let remaining = amount;
  const network = deriveRealmLedger(state).administration;
  network.cities.slice().sort((left, right) => right.deliverableFood - left.deliverableFood).forEach((report) => {
    const city = state.cities[report.cityId];
    const physicalSurplus = Math.max(0, city.resources.food - report.reserveFood);
    const used = Math.min(physicalSurplus, report.deliverableFood, remaining);
    city.resources.food -= used;
    remaining -= used;
  });
  return remaining;
}

function applyTroopLosses(state, amount) {
  let remaining = amount;
  const network = deriveRealmLedger(state).administration;
  network.cities.slice().sort((left, right) => right.mobilizableTroops - left.mobilizableTroops).forEach((report) => {
    const military = state.cities[report.cityId].military;
    const loss = Math.min(Math.max(0, Math.min(report.mobilizableTroops, military.troops - 80)), remaining);
    military.troops -= loss;
    remaining -= loss;
  });
}

function applyForeignWarDamage(state, war, plan, delta) {
  const country = state.foreignStates[war.targetCountryId];
  const damage = Math.max(0, plan.targetDamage + Math.max(0, delta) * 0.08);
  const displaced = Math.max(0, Math.round(plan.displacement + damage * 9));
  const civilianLosses = Math.max(0, Math.round(plan.civilianLoss + damage * 0.35));
  country.infrastructure = clamp(country.infrastructure - damage, 0, 100);
  country.warDamage = clamp(country.warDamage + damage, 0, 100);
  country.displaced += displaced;
  country.civilianLosses += civilianLosses;
  country.civilianPopulation = Math.max(0, country.civilianPopulation - civilianLosses);
  war.devastation = clamp(war.devastation + damage, 0, 100);
  war.displaced += displaced;
  war.civilianLosses += civilianLosses;
  return { damage, displaced, civilianLosses };
}

function applyHomeWarDamage(state, war, plan, opponentAction) {
  const enemyPressure = ({ advance: 1.2, assault: 4.8, bombard: 3.2, raid_supply: 1.4, regroup: 0.3 })[opponentAction.id] ?? 0.8;
  const damage = Math.max(0, plan.homeDamage + enemyPressure);
  const city = state.cities.orta;
  const displaced = Math.max(0, Math.round(plan.displacement + damage * 16));
  const civilianLosses = Math.max(0, Math.round(plan.civilianLoss + damage * 0.55));
  city.resources.defense = clamp(city.resources.defense - damage * 0.5, 0, 100);
  city.resources.production = clamp(city.resources.production - damage * 0.18, 0, 100);
  city.resources.commerce = clamp(city.resources.commerce - damage * 0.12, 0, 100);
  city.resources.support = clamp(city.resources.support - damage * 0.16, 0, 100);
  city.resources.population = Math.max(0, city.resources.population - civilianLosses);
  city.facilities.road.condition = clamp(city.facilities.road.condition - damage * 1.5, 0, 100);
  city.facilities.barracks.condition = clamp(city.facilities.barracks.condition - damage, 0, 100);
  war.homeDamage = clamp(war.homeDamage + damage, 0, 100);
  war.displaced += displaced;
  war.civilianLosses += civilianLosses;
  return { damage, displaced, civilianLosses };
}

function resolveWarMonth(state) {
  if (!state.war) return null;
  const war = state.war;
  const objective = WAR_OBJECTIVES[war.objectiveId];
  const military = getMilitarySummary(state);
  const enemy = state.foreignStates[war.targetCountryId];
  const opponentAction = chooseOpponentAction({
    own: { supply: military.supply, exhaustion: state.warExhaustion }, enemy,
    enemyRole: war.side === "defender" ? "attacker" : "defender", warScore: war.score, objective,
  });
  const plan = WAR_PLANS[war.plan] ?? WAR_PLANS[war.side === "defender" ? "defend" : "pass"];
  const formation = FORMATIONS[military.force.formation];
  const ratio = (military.army * military.training * military.organization + military.supportColumns * military.mobility * 2100) / Math.max(1, enemy.army * enemy.training * enemy.organization + enemy.supportColumns * enemy.mobility * 2100);
  const defensiveGround = war.side === "defender" ? 4 + state.cities.orta.resources.defense / 25 : 0;
  let delta = clamp((ratio - 1) * 18 + plan.pressure + formation.score + defensiveGround + (getIntelligence(state) - 50) * 0.03 + (military.supply - 50) * 0.035, -10, 13);
  if (opponentAction.id === "raid_supply") consumeWarFood(state, 520);
  if (opponentAction.id === "counterstroke") delta -= 3;
  if (opponentAction.id === "entrench" && war.plan === "siege") delta -= 4;
  if (opponentAction.id === "assault") delta -= 4;
  if (opponentAction.id === "advance") delta -= 1.5;
  if (opponentAction.id === "bombard") delta -= 2.5;
  if (opponentAction.id === "regroup") delta += 2;
  const uncovered = consumeWarFood(state, Math.round(plan.foodCost * (1 - formation.supply * 0.04)));
  if (uncovered > 0) delta -= 4;
  war.score = clamp(war.score + delta, -100, 100); war.months += 1; war.lastEnemyAction = opponentAction;
  war.objectiveProgress = clamp(war.objectiveProgress + Math.max(0, delta * 1.35), 0, 100);
  state.warExhaustion = clamp(state.warExhaustion + plan.exhaustion + Math.max(0, uncovered / 400), 0, 100);
  war.lastOwnAction = plan.name;
  state.legitimacy = clamp(state.legitimacy + (plan.legitimacy ?? 0), 0, 100);
  const ownLoss = Math.max(8, Math.round(34 + plan.exhaustion * 12 + Math.max(0, -delta) * 5 + formation.loss + plan.ownLoss));
  const enemyLoss = Math.max(12, Math.round(30 + Math.max(0, delta) * 5 + plan.enemyLoss));
  applyTroopLosses(state, ownLoss); enemy.army = Math.max(300, enemy.army - enemyLoss);
  state.forces.frontier_guard.organization = clamp(state.forces.frontier_guard.organization - ownLoss / 180 + (war.plan === "defend" ? 0.8 : 0), 15, 100);
  enemy.organization = clamp(enemy.organization - enemyLoss / 220 + (opponentAction.id === "regroup" || opponentAction.id === "entrench" ? 1.5 : 0), 15, 100);
  war.losses += ownLoss; war.enemyLosses += enemyLoss;
  const damage = war.side === "defender"
    ? applyHomeWarDamage(state, war, plan, opponentAction)
    : applyForeignWarDamage(state, war, plan, delta);
  const latestMilitary = getMilitarySummary(state);
  war.theater = advanceWarTheater(war.theater, {
    delta,
    score: war.score,
    objectiveProgress: war.objectiveProgress,
    ownLoss,
    enemyLoss,
    ownSupply: latestMilitary.supply,
    enemySupply: enemy.organization,
    planId: plan.id,
    enemyActionId: opponentAction.id,
    side: war.side,
  });
  war.peace = evaluatePeaceDecision({ warScore: war.score, objectiveProgress: war.objectiveProgress, objective, own: { exhaustion: state.warExhaustion, organization: military.organization, supply: military.supply } });
  war.stage = getWarStage(war).id;
  logEntry(state, "戦争", `${plan.name} — ${opponentAction.label}`, `戦況 ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}。兵 ${ownLoss}、食料 ${plan.foodCost.toLocaleString("ja-JP")}、施設被害 ${damage.damage.toFixed(1)}、避難民 ${damage.displaced}。`, delta >= 0 ? "success" : "danger");
  return { delta, ownLoss, enemyLoss, foodCost: plan.foodCost, opponentAction, planId: plan.id, side: war.side, ...damage };
}

function spendOccupationMoney(state, amount) {
  const cities = Object.values(state.cities).slice().sort((left, right) => right.resources.money - left.resources.money);
  let remaining = amount;
  cities.forEach((city) => {
    const paid = Math.min(Math.max(0, city.resources.money), remaining);
    city.resources.money -= paid;
    remaining -= paid;
  });
  return remaining;
}

function resolveOccupationMonth(state, occupation) {
  if (occupation.status !== "occupied") return null;
  const policy = OCCUPATION_POLICIES[occupation.policy] ?? OCCUPATION_POLICIES.autonomy;
  const unpaid = spendOccupationMoney(state, policy.moneyCost);
  const unfed = consumeWarFood(state, policy.foodCost);
  const supplied = unpaid <= 0 && unfed <= 0;
  const outcome = occupationPolicyOutcome(occupation, policy.id, supplied);
  occupation.months += 1;
  occupation.control = clamp(occupation.control + outcome.control, 0, 100);
  occupation.resistance = clamp(occupation.resistance + outcome.resistance, 0, 100);
  occupation.integration = clamp(occupation.integration + outcome.integration, 0, 100);
  occupation.assimilation = clamp(occupation.assimilation + outcome.assimilation, 0, 100);
  occupation.infrastructure = clamp(occupation.infrastructure + outcome.infrastructure, 0, 100);
  occupation.displaced = Math.max(0, occupation.displaced + outcome.displaced);
  state.legitimacy = clamp(state.legitimacy + outcome.legitimacy, 0, 100);
  const foreign = state.foreignStates[occupation.countryId];
  foreign.relation = clamp(foreign.relation + outcome.relation, -100, 100);
  state.cities.selene.resources.money += outcome.revenue;
  let resistanceLoss = 0;
  let resistanceDamage = 0;
  if (occupation.resistance >= 70) {
    resistanceLoss = Math.round(10 + (occupation.resistance - 70) * 0.8);
    resistanceDamage = 1 + (occupation.resistance - 70) * 0.08;
    applyTroopLosses(state, resistanceLoss);
    occupation.infrastructure = clamp(occupation.infrastructure - resistanceDamage, 0, 100);
    occupation.control = clamp(occupation.control - 1.5, 0, 100);
  }
  if (occupation.integration >= 100 && occupation.resistance <= 30) {
    occupation.status = occupation.policy === "assimilation" && occupation.assimilation >= 80 ? "annexed" : "integrated";
    occupation.garrison = Math.max(120, Math.round(occupation.garrison * 0.45));
  }
  const report = {
    occupationId: occupation.id, policyId: policy.id, policyName: policy.name, supplied,
    moneyCost: policy.moneyCost, foodCost: policy.foodCost, revenue: outcome.revenue,
    controlDelta: outcome.control, resistanceDelta: outcome.resistance,
    integrationDelta: outcome.integration, assimilationDelta: outcome.assimilation,
    infrastructureDelta: outcome.infrastructure - resistanceDamage,
    displacedDelta: outcome.displaced, resistanceLoss, status: occupation.status,
  };
  occupation.lastReport = report;
  occupation.history.unshift({ year: state.year, month: state.month, ...report });
  occupation.history = occupation.history.slice(0, 24);
  logEntry(state, "占領", `${occupation.name} — ${policy.name}`, `統制 ${occupation.control.toFixed(0)}、抵抗 ${occupation.resistance.toFixed(0)}、制度統合 ${occupation.integration.toFixed(0)}。${supplied ? "駐屯と行政費を充足。" : "駐屯費または補給が不足。"}`, occupation.resistance >= 70 ? "danger" : "info");
  return report;
}

function resolveOccupations(state) {
  return (state.occupations ?? []).map((occupation) => resolveOccupationMonth(state, occupation)).filter(Boolean);
}

function maybeStartDefensiveWar(state) {
  if (state.war || state.turn < 2) return null;
  const enemy = state.foreignStates.valka;
  if (enemy.relation > -65 || enemy.hostility < 75) return null;
  state.war = createWarState(state, "valka", "homeland_defense", "defender");
  recordHistoricalEvent(WORLD, state, {
    id: `history-invasion-${state.year}-${state.month}-valka`,
    type: "foreign_invasion",
    title: "ヴァルカ軍が東境州へ侵攻",
    summary: "国境交渉の決裂と敵対度の上昇が武力侵攻として顕在化した。",
    actors: ["valka", WORLD.nation.id], locations: ["orta"],
    causedBy: ["foreign-hostility-valka", "issue-border"],
    effects: [`war-state-${state.year}-${state.month}-valka`],
  });
  logEntry(state, "侵攻", "ヴァルカ軍が東境州へ侵攻", "国境交渉が決裂し、灰冠峠から侵攻軍が前進した。東部国境軍は防衛戦闘へ移る。", "danger");
  return { countryId: "valka", objectiveId: "homeland_defense" };
}

function nextRandom(state) { state.rngSeed = (Math.imul(state.rngSeed, 1664525) + 1013904223) >>> 0; return state.rngSeed / 4294967296; }

export const EVENT_DEFINITIONS = {
  crop_failure: {
    id: "crop_failure", name: "不作", summary: "降雨と病害が重なり、収穫見込みが崩れた。",
    risk: (city, metrics) => Math.max(0, 48 - city.resources.production) + Math.max(0, 1 - metrics.foodSatisfaction) * 60 + (city.issues.some((item) => item.id === "crop_failure") ? 25 : 0),
    choices: [
      { id: "release", name: "備蓄を放出", detail: "食料 -900 / 民心 +2", effect: { resources: { food: -900, support: 2 }, factions: { farmers: { support: 2 } } } },
      { id: "import", name: "商人から購入", detail: "金銭 -10 / 食料 -200 / 商人支持 +2", effect: { resources: { money: -10, food: -200 }, factions: { merchants: { support: 2 } } } },
      { id: "ration", name: "配給を制限", detail: "食料 -350 / 民心 -4 / 2か月の節約", effect: { resources: { food: -350, support: -4 }, activeEffect: { name: "配給制限", remainingTurns: 2, resources: { food: 280, support: -0.5 } } } },
    ],
  },
  flood: {
    id: "flood", name: "洪水", summary: "河川が氾濫し、農地と街道が水没した。",
    risk: (city, metrics) => (metrics.season.id === "summer" ? 32 : 8) + (city.facilities.farmland.level + city.facilities.road.level) * 4 + (city.issues.some((item) => item.id === "flood") ? 28 : 0),
    choices: [
      { id: "relief", name: "救援費を投じる", detail: "金銭 -9 / 生産 -1 / 民心 +2", effect: { resources: { money: -9, production: -1, support: 2 } } },
      { id: "labor", name: "復旧労役を課す", detail: "金銭 -3 / 生産 -2 / 民心 -2", effect: { resources: { money: -3, production: -2, support: -2 }, internal: { corruption: 0.5 } } },
      { id: "abandon", name: "低地を放棄する", detail: "人口 -120 / 生産 -3 / 治安 -1", effect: { resources: { population: -120, production: -3, security: -1 } } },
    ],
  },
  bandits: {
    id: "bandits", name: "盗賊", summary: "街道の荷駄が襲われ、市場への搬入が止まり始めた。",
    risk: (city) => Math.max(0, 68 - city.resources.security) + (city.issues.some((item) => item.id === "bandits") ? 34 : 0),
    choices: [
      { id: "troops", name: "駐屯兵を出す", detail: "食料 -420 / 治安 +4 / 軍人支持 +1", effect: { resources: { food: -420, security: 4 }, factions: { military: { support: 1 } } } },
      { id: "hire", name: "街道警備を雇う", detail: "金銭 -7 / 治安 +3 / 商人支持 +2", effect: { resources: { money: -7, security: 3 }, factions: { merchants: { support: 2 } } } },
      { id: "amnesty", name: "帰順を認める", detail: "治安 +1 / 民心 +1 / 腐敗 +2", effect: { resources: { security: 1, support: 1 }, internal: { corruption: 2 } } },
    ],
  },
  epidemic: {
    id: "epidemic", name: "疫病", summary: "港と井戸端で同じ熱病が報告された。",
    risk: (city) => Math.max(0, 58 - city.internal.sanitation) + Math.max(0, city.resources.population / city.internal.housingCapacity - 0.9) * 45,
    choices: [
      { id: "quarantine", name: "隔離する", detail: "金銭 -5 / 人口 -70 / 商業 -2 / 衛生 +4", effect: { resources: { money: -5, population: -70, commerce: -2 }, internal: { sanitation: 4 } } },
      { id: "clinics", name: "施療所を開く", detail: "金銭 -11 / 人口 -25 / 衛生 +6 / 民心 +2", effect: { resources: { money: -11, population: -25, support: 2 }, internal: { sanitation: 6 } } },
      { id: "conceal", name: "流行を伏せる", detail: "人口 -180 / 腐敗 +2 / 商人支持 -2", effect: { resources: { population: -180 }, internal: { corruption: 2 }, factions: { merchants: { support: -2 } } } },
    ],
  },
  refugees: {
    id: "refugees", name: "難民流入", summary: "国境地帯から家族を連れた避難民が到着した。",
    risk: (city, metrics, state) => 15 + Math.max(0, -state.foreignStates.valka.relation) / 4 + (metrics.housingRate > 1 ? 8 : 0),
    choices: [
      { id: "accept", name: "受け入れる", detail: "人口 +260 / 食料 -500 / 民心 +1 / 治安 -2", effect: { resources: { population: 260, food: -500, support: 1, security: -2 } } },
      { id: "settle", name: "管理入植させる", detail: "金銭 -6 / 人口 +180 / 生産 +1", effect: { resources: { money: -6, population: 180, production: 1 } } },
      { id: "refuse", name: "国境で拒む", detail: "民心 -2 / 治安 +1 / 恐怖 +1", effect: { resources: { support: -2, security: 1 }, internal: { fear: 1 } } },
    ],
  },
  corruption: {
    id: "corruption", name: "汚職", summary: "徴税台帳と実際の納付額に大きな差が見つかった。",
    risk: (city) => city.internal.corruption * 1.4 + (city.issues.some((item) => item.id === "corruption") ? 30 : 0),
    choices: [
      { id: "audit", name: "徹底監査", detail: "金銭 -5 / 腐敗 -7 / 官僚負担", effect: { resources: { money: -5 }, internal: { corruption: -7 }, activeEffect: { name: "監査疲労", remainingTurns: 2, resources: { support: -0.4 } } } },
      { id: "dismiss", name: "責任者を罷免", detail: "腐敗 -4 / 行政効率 -3 / 民心 +1", effect: { resources: { support: 1 }, internal: { corruption: -4, administrativeEfficiency: -3 } } },
      { id: "cover", name: "内々に処理", detail: "金銭 +3 / 腐敗 +3 / 民心 -2", effect: { resources: { money: 3, support: -2 }, internal: { corruption: 3 } } },
    ],
  },
  merchant_exit: {
    id: "merchant_exit", name: "商人流出", summary: "有力商会が倉庫と船を他港へ移し始めた。",
    risk: (city) => Math.max(0, 55 - city.factions.merchants.support) * 1.5 + Math.max(0, 50 - city.resources.security),
    choices: [
      { id: "subsidy", name: "営業を支援", detail: "金銭 -8 / 商業 +1 / 商人支持 +4", effect: { resources: { money: -8, commerce: 1 }, factions: { merchants: { support: 4 } } } },
      { id: "tax_relief", name: "臨時減税", detail: "金銭 -4 / 商人支持 +3 / 地主支持 -1", effect: { resources: { money: -4 }, factions: { merchants: { support: 3 }, landowners: { support: -1 } } } },
      { id: "let_go", name: "流出を許す", detail: "商業 -4 / 人口 -90 / 腐敗 -1", effect: { resources: { commerce: -4, population: -90 }, internal: { corruption: -1 } } },
    ],
  },
  peasant_revolt: {
    id: "peasant_revolt", name: "農民一揆", summary: "農村代表が徴税停止を宣言し、鐘を鳴らした。",
    risk: (city) => city.factions.farmers.radicalism * 1.3 + Math.max(0, 40 - city.factions.farmers.support) * 1.5 + Math.max(0, 45 - city.resources.support),
    choices: [
      { id: "negotiate", name: "代表と交渉", detail: "金銭 -5 / 民心 +2 / 農民支持 +5", effect: { resources: { money: -5, support: 2 }, factions: { farmers: { support: 5, radicalism: -6 } } } },
      { id: "reform", name: "減税と救済", detail: "金銭 -10 / 民心 +4 / 農民支持 +8", effect: { resources: { money: -10, support: 4 }, factions: { farmers: { support: 8, radicalism: -8 }, landowners: { support: -3 } } } },
      { id: "suppress", name: "軍で鎮圧", detail: "人口 -110 / 治安 +5 / 民心 -6 / 恐怖 +8", effect: { resources: { population: -110, security: 5, support: -6 }, internal: { fear: 8 }, factions: { farmers: { support: -8, radicalism: -4 }, military: { support: 2 } } } },
    ],
  },
};

function eventRisk(state, definition, cityId) { const city = state.cities[cityId]; return Math.max(0, definition.risk(city, deriveCityMetrics(state, cityId), state)); }

function drawEvent(state) {
  state.eventCooldowns ??= {};
  Object.keys(state.eventCooldowns).forEach((id) => { state.eventCooldowns[id] = Math.max(0, state.eventCooldowns[id] - 1); });
  const candidates = [];
  Object.values(EVENT_DEFINITIONS).forEach((definition) => Object.keys(state.cities).forEach((cityId) => {
    const key = `${definition.id}:${cityId}`;
    const pressure = registerEventPressure(WORLD, state, definition.id, cityId, eventRisk(state, definition, cityId));
    if ((state.eventCooldowns[key] ?? 0) === 0 && pressure.eligible) candidates.push({ eventId: definition.id, cityId, weight: pressure.value });
  }));
  if (!candidates.length) return null;
  const maximum = Math.max(...candidates.map((item) => item.weight), 0);
  const pity = state.eventPity ?? 0;
  const guaranteed = pity >= 2;
  if (!guaranteed && nextRandom(state) > clamp(0.08 + maximum / 145, 0.12, 0.52)) {
    state.eventPity = pity + 1;
    return null;
  }
  const issueCandidates = candidates.filter((item) => state.cities[item.cityId].issues.some((issue) => issue.id === item.eventId));
  const pool = guaranteed && issueCandidates.length ? issueCandidates : candidates;
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = nextRandom(state) * total;
  const selected = pool.find((item) => { cursor -= item.weight; return cursor <= 0; }) ?? pool[0];
  state.eventPity = 0;
  return { id: `event-${state.turn}-${selected.eventId}-${selected.cityId}`, eventId: selected.eventId, cityId: selected.cityId };
}

function applyEffect(city, effect) {
  Object.entries(effect.resources ?? {}).forEach(([key, value]) => { city.resources[key] = key === "population" ? Math.max(1000, city.resources[key] + value) : key === "money" ? Math.max(-50, city.resources[key] + value) : clamp(city.resources[key] + value, 0, key === "food" ? Number.MAX_SAFE_INTEGER : 100); });
  Object.entries(effect.internal ?? {}).forEach(([key, value]) => { city.internal[key] = clamp(city.internal[key] + value, 0, key === "housingCapacity" ? Number.MAX_SAFE_INTEGER : 100); });
  Object.entries(effect.military ?? {}).forEach(([key, value]) => { city.military[key] = Math.max(0, city.military[key] + value); });
  Object.entries(effect.factions ?? {}).forEach(([id, changes]) => Object.entries(changes).forEach(([key, value]) => { city.factions[id][key] = clamp(city.factions[id][key] + value, 0, 100); }));
  if (effect.activeEffect) city.activeEffects.push(clone(effect.activeEffect));
}

const EVENT_SPENDING_CATEGORIES = {
  crop_failure: "social_security",
  flood: "social_security",
  bandits: "military_affairs",
  epidemic: "social_security",
  refugees: "social_security",
  corruption: "research_development",
  merchant_exit: "economic_investment",
  peasant_revolt: "social_security",
};

function sumValues(values) {
  return Object.values(values).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function roundFiscal(value) {
  return Number((Number(value) || 0).toFixed(1));
}

function createFiscalReport(report) {
  const income = Object.fromEntries(Object.keys(REVENUE_CATEGORIES).map((id) => [id, 0]));
  const expenditure = Object.fromEntries(Object.keys(SPENDING_CATEGORIES).map((id) => [id, 0]));
  report.cities.forEach((local) => {
    Object.keys(income).forEach((id) => { income[id] += local.fiscal?.income?.[id] ?? 0; });
    Object.keys(expenditure).forEach((id) => { expenditure[id] += local.fiscal?.expenditure?.[id] ?? 0; });
  });
  (report.actions ?? []).forEach((action) => {
    const cost = Math.max(0, Number(action.cost?.money) || 0);
    if (!cost) return;
    const category = SPENDING_CATEGORIES[action.spendingCategory] ? action.spendingCategory : "economic_investment";
    expenditure[category] += cost;
  });
  (report.events ?? []).forEach((event) => {
    const effect = Number(event.moneyEffect) || 0;
    if (effect > 0) income.other_income += effect;
    if (effect < 0) {
      const category = SPENDING_CATEGORIES[event.spendingCategory] ? event.spendingCategory : "social_security";
      expenditure[category] += Math.abs(effect);
    }
  });
  (report.occupations ?? []).forEach((occupation) => {
    expenditure.military_affairs += Math.max(0, occupation.moneyCost ?? 0);
    income.other_income += Math.max(0, occupation.revenue ?? 0);
  });
  const balance = roundFiscal(report.realm.money);
  const knownBalance = roundFiscal(sumValues(income) - sumValues(expenditure));
  const reconciliation = roundFiscal(balance - knownBalance);
  if (reconciliation > 0) income.other_income += reconciliation;
  if (reconciliation < 0) expenditure.social_security += Math.abs(reconciliation);
  Object.keys(income).forEach((id) => { income[id] = roundFiscal(income[id]); });
  Object.keys(expenditure).forEach((id) => { expenditure[id] = roundFiscal(expenditure[id]); });
  let incomeTotal = roundFiscal(sumValues(income));
  let expenditureTotal = roundFiscal(sumValues(expenditure));
  const roundedReconciliation = roundFiscal(balance - (incomeTotal - expenditureTotal));
  if (roundedReconciliation > 0) income.other_income = roundFiscal(income.other_income + roundedReconciliation);
  if (roundedReconciliation < 0) expenditure.social_security = roundFiscal(expenditure.social_security + Math.abs(roundedReconciliation));
  incomeTotal = roundFiscal(sumValues(income));
  expenditureTotal = roundFiscal(sumValues(expenditure));
  const openingTreasury = roundFiscal(report.cities.reduce((sum, city) => sum + (city.before.money ?? 0), 0));
  const closingTreasury = roundFiscal(report.cities.reduce((sum, city) => sum + (city.after.money ?? 0), 0));
  return {
    income: { ...income, total: incomeTotal },
    expenditure: { ...expenditure, total: expenditureTotal },
    balance,
    openingTreasury,
    closingTreasury,
  };
}

function annualReport(state, year) {
  const reports = state.monthlyReports.filter((report) => report.year === year);
  const totals = { money: 0, food: 0, population: 0, security: 0, support: 0 };
  reports.forEach((report) => report.cities.forEach((city) => Object.keys(totals).forEach((key) => { totals[key] += city.changes[key] ?? 0; })));
  const income = Object.fromEntries(Object.keys(REVENUE_CATEGORIES).map((id) => [id, roundFiscal(reports.reduce((sum, report) => sum + (report.fiscal?.income?.[id] ?? 0), 0))]));
  const expenditure = Object.fromEntries(Object.keys(SPENDING_CATEGORIES).map((id) => [id, roundFiscal(reports.reduce((sum, report) => sum + (report.fiscal?.expenditure?.[id] ?? 0), 0))]));
  const balance = roundFiscal(reports.reduce((sum, report) => sum + (report.fiscal?.balance ?? report.realm.money ?? 0), 0));
  let incomeTotal = roundFiscal(sumValues(income));
  let expenditureTotal = roundFiscal(sumValues(expenditure));
  const reconciliation = roundFiscal(balance - (incomeTotal - expenditureTotal));
  if (reconciliation > 0) income.other_income = roundFiscal(income.other_income + reconciliation);
  if (reconciliation < 0) expenditure.social_security = roundFiscal(expenditure.social_security + Math.abs(reconciliation));
  incomeTotal = roundFiscal(sumValues(income));
  expenditureTotal = roundFiscal(sumValues(expenditure));
  const fiscal = {
    income: { ...income, total: incomeTotal },
    expenditure: { ...expenditure, total: expenditureTotal },
    balance,
    openingTreasury: reports.at(-1)?.fiscal?.openingTreasury ?? null,
    closingTreasury: reports[0]?.fiscal?.closingTreasury ?? null,
  };
  const decisions = reports.flatMap((report) => report.highlights ?? []).slice(0, 8);
  const ending = reports.find((report) => report.campaign?.ending)?.campaign.ending ?? null;
  return {
    id: `annual-${year}`, year, totals, fiscal, months: reports.length,
    events: reports.reduce((sum, report) => sum + report.events.length, 0),
    decisions, ending,
  };
}

function finalizeMonth(state, report) {
  const chapterWasComplete = state.monthlyReports.some((entry) => entry.campaign?.ending);
  state.monthlyReports.unshift(report); state.monthlyReports = state.monthlyReports.slice(0, 120);
  if (state.month === 12) state.annualReports.unshift(annualReport(state, state.year));
  state.turn += 1; state.month += 1;
  if (state.month > 12) { state.month = 1; state.year += 1; }
  state.phase = "planning"; state.pendingEvent = null; state.pendingMonthReport = null;
  if (state.centralizationCampaign?.ending) {
    state.council.pending = false;
  } else if (state.campaign?.ending && !chapterWasComplete) {
    // 灰冠峠の三幕完了は国家キャンペーンの第一章完了。完了月だけ
    // 報告を優先し、以後の季節評定は通常どおり続ける。
    state.council.pending = false;
  } else if ([3, 6, 9, 12].includes(state.month)) {
    state.council.pending = true;
    state.council.seasonKey = `${state.year}-${state.month}`;
  }
  getServingOfficers(WORLD, state).forEach((officer) => { if (!state.officers[officer.id].assignment) state.officers[officer.id].stamina = clamp(state.officers[officer.id].stamina + 8, 0, 100); });
  logEntry(state, "月次", `${report.season} ${report.monthName}の月次報告`, `都市金 ${report.realm.money >= 0 ? "+" : ""}${report.realm.money.toFixed(1)}、食料 ${report.realm.food >= 0 ? "+" : ""}${Math.round(report.realm.food).toLocaleString("ja-JP")}。`, "info");
  return state;
}

function refreshReportTotals(state, report) {
  report.cities.forEach((local) => {
    local.after = clone(state.cities[local.cityId].resources);
    local.changes = resourceChanges(local.before, local.after);
    const orderChanges = local.breakdown?.orders ?? {};
    const monthlyChanges = local.breakdown?.monthly ?? {};
    local.breakdown ??= { orders: {}, monthly: {}, external: {} };
    local.breakdown.external = Object.fromEntries(Object.keys(local.before).map((key) => [
      key,
      Number(((local.changes[key] ?? 0) - (orderChanges[key] ?? 0) - (monthlyChanges[key] ?? 0)).toFixed(1)),
    ]));
  });
  const total = (key) => Number(report.cities.reduce((sum, city) => sum + (city.changes[key] ?? 0), 0).toFixed(1));
  report.realm = { money: total("money"), food: total("food"), population: total("population"), security: total("security"), support: total("support") };
  report.fiscal = createFiscalReport(report);
  return report;
}

export function commitMonth(state) {
  if (state.phase !== "planning") throw new Error("先に事件への対応を決めてください");
  if (state.council.pending) throw new Error("季節評定の方針を先に決めてください");
  const pendingAftermathDecision = getPendingAftermathDecision(WORLD, state);
  if (pendingAftermathDecision) throw new Error(`第三幕「${pendingAftermathDecision.title}」を先に裁定してください`);
  const next = normalizeWarState(clone(state));
  const opening = Object.fromEntries(Object.entries(next.cities).map(([cityId, city]) => [cityId, clone(city.resources)]));
  const actions = startOrders(next);
  progressWork(next, actions);
  advanceOfficerPromises(WORLD, next);
  actions.push(...resolveAuthorityReforms(WORLD, next));
  actions.push(...resolveNationalReforms(WORLD, next));
  actions.push(...resolveDelegatedAdministration(WORLD, next));
  actions.push(...applyAdministrativeOverload(WORLD, next));
  const cities = Object.keys(next.cities).map((cityId) => applyCityMonth(next, cityId, opening[cityId]));
  const towns = advanceTownAdministration(WORLD, next);
  const foreignDispatches = advanceForeignAgendas(WORLD, next);
  const aggression = maybeStartDefensiveWar(next);
  const war = resolveWarMonth(next);
  const occupations = resolveOccupations(next);
  advanceCampaignState(WORLD, next);
  actions.push(...advanceCentralizationCampaign(WORLD, next));
  actions.push(...advanceLeviathanCycle(WORLD, next));
  const monthName = formatDate(next).split(" ")[1];
  const report = {
    id: `month-${next.year}-${next.month}`, year: next.year, month: next.month, monthName,
    season: seasonForMonth(next.month).name, cities, towns, aggression, war, occupations, events: [], actions,
    foreignDispatches, officerReactions: clone(next.monthlyPoliticalReactions),
    campaign: { act: next.campaign.act, resolution: next.campaign.resolution, aftermathPolicy: next.campaign.aftermathPolicy, ending: clone(next.campaign.ending) },
    centralization: {
      stageId: next.centralizationCampaign.stageId,
      crisisMonths: next.centralizationCampaign.crisis?.months ?? 0,
      ending: clone(next.centralizationCampaign.ending),
    },
    leviathan: deriveLeviathanStatus(WORLD, next),
    realm: {},
  };
  next.monthlyPoliticalReactions = [];
  refreshReportTotals(next, report);
  const historyEvents = advanceHistoricalSimulation(WORLD, next, { actions, report });
  report.historyEvents = historyEvents.map((event) => ({ id: event.id, title: event.title, type: event.type, locations: event.locations }));
  report.highlights = buildDecisionHighlights(next, report);
  const event = drawEvent(next);
  if (event) { next.phase = "event"; next.pendingEvent = event; next.pendingMonthReport = report; return next; }
  return finalizeMonth(next, report);
}

export function resolveEventChoice(state, choiceId) {
  if (state.phase !== "event" || !state.pendingEvent) throw new Error("対応待ちの事件はありません");
  const next = clone(state);
  const definition = EVENT_DEFINITIONS[next.pendingEvent.eventId];
  const choice = definition?.choices.find((item) => item.id === choiceId);
  if (!choice) throw new Error("事件の選択肢が不明です");
  const city = next.cities[next.pendingEvent.cityId];
  applyEffect(city, choice.effect);
  const historyEvent = recordResolvedWorldEvent(WORLD, next, {
    pendingEventId: next.pendingEvent.id,
    eventId: definition.id,
    regionId: next.pendingEvent.cityId,
    title: definition.name,
    choiceName: choice.name,
    detail: choice.detail,
    effect: choice.effect,
  });
  const eventResult = {
    eventId: definition.id, cityId: next.pendingEvent.cityId, choiceId,
    title: definition.name, choice: choice.name, detail: choice.detail,
    historyEventId: historyEvent.id,
    moneyEffect: choice.effect.resources?.money ?? 0,
    spendingCategory: EVENT_SPENDING_CATEGORIES[definition.id] ?? "social_security",
  };
  next.pendingMonthReport.events.push(eventResult);
  next.eventCooldowns[`${definition.id}:${next.pendingEvent.cityId}`] = 6;
  city.issues = city.issues.filter((issue) => issue.id !== definition.id);
  logEntry(next, "事件", `${definition.name} — ${choice.name}`, `${WORLD.provinces[next.pendingEvent.cityId].name}で「${choice.name}」を選択した。`, "danger");
  refreshReportTotals(next, next.pendingMonthReport);
  next.pendingMonthReport.highlights = buildDecisionHighlights(next, next.pendingMonthReport);
  return finalizeMonth(next, next.pendingMonthReport);
}

export function acknowledgeMonthReport(state, reportId = state.monthlyReports?.[0]?.id) {
  if (!reportId || !state.monthlyReports?.some((report) => report.id === reportId)) throw new Error("確認する月次報告がありません");
  const next = clone(state);
  next.lastViewedReportId = reportId;
  return next;
}

export function deriveMonthPreview(state) {
  if (state.phase !== "planning" || state.council.pending) return null;
  // A third-act ruling deliberately blocks the real month end.  Forecasting
  // must not invoke that guarded path or the pending decision card cannot be
  // rendered for the player to resolve it.
  if (getPendingAftermathDecision(WORLD, state)) return null;
  const projected = commitMonth(state);
  const report = projected.phase === "event" ? projected.pendingMonthReport : projected.monthlyReports[0];
  let baselineReport = null;
  if (state.pendingOrders.length) {
    const baselineState = clone(state);
    baselineState.pendingOrders = [];
    const baseline = commitMonth(baselineState);
    baselineReport = baseline.phase === "event" ? baseline.pendingMonthReport : baseline.monthlyReports[0];
  }
  return { report, baselineReport, pendingEvent: projected.pendingEvent, phase: projected.phase };
}

export function getFoodSecurityStatus(state, preview = undefined) {
  const ledger = deriveRealmLedger(state);
  const planningPreview = preview === undefined ? deriveMonthPreview(state) : preview;
  const severityRank = { stable: 0, warning: 1, danger: 2 };
  const cities = ledger.cities.map((city) => {
    const local = planningPreview?.report?.cities?.find((item) => item.cityId === city.cityId);
    const change = local?.changes?.food ?? city.foodBalance;
    const after = local?.after?.food ?? city.food + change;
    const runway = change < 0 ? Math.max(0, city.food) / Math.abs(change) : Number.POSITIVE_INFINITY;
    const afterRunway = change < 0 ? Math.max(0, after) / Math.abs(change) : Number.POSITIVE_INFINITY;
    const severity = after <= 0 || afterRunway <= 1.5
      ? "danger"
      : runway <= 4 || afterRunway <= 3
        ? "warning"
        : "stable";
    return {
      cityId: city.cityId,
      name: city.name,
      current: city.food,
      change,
      after,
      runway,
      afterRunway,
      severity,
    };
  }).sort((left, right) => (
    severityRank[right.severity] - severityRank[left.severity]
    || left.afterRunway - right.afterRunway
  ));
  const primaryCity = cities[0] ?? null;
  const monthlyChange = cities.reduce((sum, city) => sum + city.change, 0);
  return {
    severity: primaryCity?.severity ?? "stable",
    primaryCity,
    cities,
    criticalCities: cities.filter((city) => city.severity !== "stable"),
    provisions: ledger.provisions,
    monthlyChange,
    runwayMonths: monthlyChange < 0 ? ledger.provisions / Math.abs(monthlyChange) : Number.POSITIVE_INFINITY,
  };
}

export function getBorderNegotiationStatus(state) {
  normalizeStrategicState(WORLD, state);
  return getBorderNegotiationState(WORLD, state);
}

export function resolveBorderNegotiation(state, settlementId) {
  const next = normalizeWarState(clone(state));
  const result = applyBorderSettlement(WORLD, next, settlementId);
  recordHistoricalEvent(WORLD, next, {
    id: `history-border-settlement-${next.year}-${next.month}-${settlementId}`,
    type: "diplomatic_settlement",
    title: result.name,
    summary: `ヴァルカとの交渉で「${result.name}」を成立させ、灰冠峠の相互通行権を確保した。`,
    actors: [WORLD.nation.id, "valka"], locations: ["orta", "valka_keep"],
    causedBy: ["issue-border", `negotiation-acceptance-${getBorderNegotiationStatus(next).acceptance}`],
    effects: ["agreement-transit", `campaign-resolution-${settlementId}`],
  });
  logEntry(next, "外交", result.name, "灰冠峠の通行権を外交決着で確保した。第三幕の定着方針を決める。", "success");
  return next;
}

export function chooseAftermathPolicy(state, policyId) {
  const next = normalizeWarState(clone(state));
  const policy = applyAftermathPolicy(WORLD, next, policyId);
  recordHistoricalEvent(WORLD, next, {
    id: `history-aftermath-${next.year}-${next.month}-${policyId}`,
    type: "aftermath_policy",
    title: policy.name,
    summary: policy.description,
    actors: [WORLD.nation.id], locations: ["orta"],
    causedBy: ["agreement-transit"], effects: [`aftermath-${policyId}`],
  });
  logEntry(next, "戦後", policy.name, `${policy.description} ${policy.months}か月かけて定着させる。`, "info");
  return next;
}

export function getAftermathDecisionStatus(state) {
  normalizeStrategicState(WORLD, state);
  return getPendingAftermathDecision(WORLD, state);
}

export function resolveAftermathDecisionChoice(state, choiceId) {
  const next = normalizeWarState(clone(state));
  const result = applyAftermathDecision(WORLD, next, choiceId);
  recordHistoricalEvent(WORLD, next, {
    id: `history-aftermath-decision-${next.year}-${next.month}-${result.decisionId}`,
    type: "aftermath_decision",
    title: `${result.title}：${result.choice}`,
    summary: result.impact,
    actors: [WORLD.nation.id, "valka"], locations: ["orta"],
    causedBy: [`aftermath-${next.campaign.aftermathPolicy}`], effects: [`aftermath-choice-${result.choiceId}`],
  });
  logEntry(next, "戦後", result.title, `${result.choice}。${result.impact}`, "info");
  return next;
}

export function answerOfficerDemand(state, officerId, responseId) {
  const next = normalizeWarState(clone(state));
  const result = respondToOfficerDemand(WORLD, next, officerId, responseId);
  logEntry(next, "人物", result.reaction.title, result.reaction.detail, responseId === "refuse" ? "danger" : "info");
  return next;
}

export function getOfficerPoliticalReport(state, officerId) {
  normalizeStrategicState(WORLD, state);
  return getOfficerPoliticalState(state, officerId);
}

export function getForeignDispatches(state, limit = 9) {
  normalizeStrategicState(WORLD, state);
  return state.foreignDispatches.slice(0, limit);
}

export function getDecisionExplanations(state) {
  return getDecisionExplanationState(state);
}

export function getWarDeclarationEstimate(state, objectiveId = "transit") {
  const objective = WAR_OBJECTIVES[objectiveId];
  if (!objective || objective.mode === "defensive") throw new Error("概算できない戦争目的です");
  const report = getWarCouncilReport(state, objectiveId);
  const ledger = deriveRealmLedger(state);
  const formation = FORMATIONS[state.forces.frontier_guard.formation];
  const plan = WAR_PLANS[objective.scope === "total" ? "siege" : "pass"];
  const scorePerMonth = Math.max(0, Number((report.score * 0.14).toFixed(1)));
  const progressPerMonth = scorePerMonth * 1.35;
  const peaceScoreThreshold = Number((objective.targetScore * 0.55).toFixed(1));
  const monthsByScore = scorePerMonth > 0 ? Math.ceil(peaceScoreThreshold / scorePerMonth) : Number.POSITIVE_INFINITY;
  const monthsByProgress = progressPerMonth > 0 ? Math.ceil(45 / progressPerMonth) : Number.POSITIVE_INFINITY;
  const estimatedMonths = Number.isFinite(Math.min(monthsByScore, monthsByProgress))
    ? Math.max(1, Math.min(monthsByScore, monthsByProgress))
    : null;
  const foodPerMonth = Math.round(plan.foodCost * (1 - formation.supply * 0.04));
  const troopLossPerMonth = Math.max(8, Math.round(34 + plan.exhaustion * 12 + formation.loss + plan.ownLoss));
  const damagePerMonth = Math.max(0, plan.targetDamage + scorePerMonth * 0.08);
  const displacedPerMonth = Math.max(0, Math.round(plan.displacement + damagePerMonth * 9));
  const projectedProvisions = estimatedMonths === null
    ? null
    : Math.round(ledger.provisions + (ledger.supplyBalance - foodPerMonth) * estimatedMonths);
  const foodSecurity = getFoodSecurityStatus(state, null);
  return {
    objectiveId,
    objectiveName: objective.name,
    planId: plan.id,
    planName: plan.name,
    formationId: formation.id,
    formationName: formation.name,
    scorePerMonth,
    peaceScoreThreshold,
    estimatedMonths,
    foodPerMonth,
    totalFood: estimatedMonths === null ? null : foodPerMonth * estimatedMonths,
    troopLossPerMonth,
    totalTroopLoss: estimatedMonths === null ? null : troopLossPerMonth * estimatedMonths,
    displacedPerMonth,
    totalDisplaced: estimatedMonths === null ? null : displacedPerMonth * estimatedMonths,
    projectedProvisions,
    foodRisk: foodSecurity.severity !== "stable" || (projectedProvisions !== null && projectedProvisions <= 0),
    confidence: report.confidence,
  };
}

export function getTurnWarnings(state) {
  const ledger = deriveRealmLedger(state);
  const preview = deriveMonthPreview(state);
  const foodSecurity = getFoodSecurityStatus(state, preview);
  const warnings = [];
  if (ledger.administration.overextension > 0) warnings.push(`行政網が処理限界を${ledger.administration.overextension}%超過：直轄を減らすか、役所と人材を整備してください`);
  const activeAuthorityReforms = state.administration?.reforms?.filter((reform) => reform.status === "active") ?? [];
  if (activeAuthorityReforms.length) warnings.push(`権限改革 ${activeAuthorityReforms.length}件が進行中：一時行政負荷 ${ledger.administration.temporaryLoad}`);
  ledger.administration.authority.regions.forEach((region) => {
    const authorityGap = region.domains.find((domain) => domain.legalShare - domain.practicalShare >= 22);
    if (authorityGap) warnings.push(`${WORLD.provinces[region.cityId].name}の${authorityGap.name}で法令と実務が${Math.round(authorityGap.legalShare - authorityGap.practicalShare)}点乖離`);
  });
  if (ledger.administration.unintegratedCities > 0) warnings.push(`州郡化前の都市 ${ledger.administration.unintegratedCities}：名目人口・兵・兵糧の全量は動員できません`);
  if (ledger.governance.available > 0) {
    warnings.push(ledger.availableOfficers > 0
      ? `未使用統治力 ${ledger.governance.available}（担当可能な待機人物 ${ledger.availableOfficers}名）`
      : `未使用統治力 ${ledger.governance.available}（担当可能人物なし：任務完了を待つか、施設・政策を検討）`);
  }
  ledger.cities.forEach((city) => {
    const local = preview?.report.cities.find((item) => item.cityId === city.cityId);
    if ((local?.after.money ?? city.money + city.netIncome) < 0) warnings.push(`${city.name}で財政赤字の見込み`);
    if (city.facilities.facilities.some((facility) => facility.level > 0 && facility.operatingRate < 0.7)) warnings.push(`${city.name}で施設稼働率が低下`);
    if (city.factionRisk >= 35) warnings.push(`${city.name}で派閥反乱の危険`);
  });
  foodSecurity.criticalCities.forEach((city) => {
    const runway = Number.isFinite(city.afterRunway) ? `約${city.afterRunway.toFixed(1)}か月分` : "収支は安定";
    warnings.push(`${city.severity === "danger" ? "食料危機" : "食料備蓄注意"}：${city.name}は次月末 ${Math.max(0, Math.round(city.after)).toLocaleString("ja-JP")}（${runway}）`);
  });
  if (ledger.governance.forced > 0) {
    const forcedOrders = state.pendingOrders.filter((order) => order.forced);
    const maximumChance = Math.max(...forcedOrders.map((order) => (order.forcedPoints ?? 0) * FORCED_ORDER_RULES.failureChancePerPoint), 0);
    warnings.push(`強行命令 ${forcedOrders.length}件：失敗率 最大${maximumChance}% / 全都市の腐敗 +${(ledger.governance.forced * FORCED_ORDER_RULES.corruptionPerPoint).toFixed(1)}・民心 ${(ledger.governance.forced * FORCED_ORDER_RULES.supportPerPoint).toFixed(1)} / 翌月統治力 -${Math.min(2, ledger.governance.forced)}`);
  }
  if (state.war && (state.war.peace?.culminatingRisk ?? 0) >= 70) warnings.push(`戦役が攻勢限界に接近：危険度 ${state.war.peace.culminatingRisk}%`);
  (state.occupations ?? []).filter((occupation) => occupation.status === "occupied").forEach((occupation) => {
    if (occupation.resistance >= 70) warnings.push(`${occupation.name}で武装抵抗が激化：抵抗 ${occupation.resistance.toFixed(0)}`);
    if (occupation.garrison < occupation.requiredGarrison) warnings.push(`${occupation.name}の駐屯兵が必要数を下回っています`);
  });
  if (ledger.availableOfficers > 0 && ledger.governance.available <= 0) warnings.push(`待機中の人物 ${ledger.availableOfficers}名（統治力を使い切っているため新規任務は不可）`);
  const previewMoney = preview?.report.cities.reduce((sum, city) => sum + city.after.money, 0);
  if ((previewMoney ?? ledger.treasury + ledger.netIncome) < 0) warnings.push("国家全体で給与遅配の危険");
  return warnings;
}

export function adoptDoctrine(state, doctrineId) {
  if (!DOCTRINES[doctrineId]) throw new Error("不明な評定方針です");
  if (!state.council.pending) throw new Error("今季の評定は終了しています");
  const next = clone(state); next.council.doctrine = doctrineId; next.council.pending = false;
  next.council.history.unshift({ seasonKey: next.council.seasonKey, doctrineId });
  const reactions = applyDoctrinePolitics(WORLD, next, doctrineId);
  logEntry(next, "評定", DOCTRINES[doctrineId].name, DOCTRINES[doctrineId].description, "success");
  reactions.slice(0, 2).forEach((reaction) => logEntry(next, "人物", reaction.title, reaction.detail, reaction.disposition > 0 ? "info" : "danger"));
  return next;
}

export function getCouncilProposals(state) {
  const proposals = [];
  if (state.issues.standards.status === "active") proposals.push({ officerId: "edras", commandId: "admin.harbor_standard", cityId: "orta", reason: "道路規格を統一すれば、三州の商業と国境軍補給を同時に改善できます。" });
  if (state.issues.reports.status === "active") proposals.push({ officerId: "sera", commandId: "navy.soundings", cityId: "orta", reason: "敵守備隊数の食い違いを放置したまま開戦判断はできません。" });
  if (state.foreignStates.valka.relation < -10) proposals.push({ officerId: "mara", commandId: "diplomacy.talks", cityId: "selene", reason: "河港の商人を同席させ、国境関税の限定交渉を始めるべきです。" });
  const weakest = deriveRealmLedger(state).cities.sort((a, b) => a.security - b.security)[0];
  if (proposals.length < 3) proposals.push({ officerId: weakest.governorId, commandId: "city.patrol", cityId: weakest.id, reason: `${weakest.name}の治安が税収と徴募を抑えています。` });
  return proposals.slice(0, 3).map((proposal) => ({ ...proposal, forecast: getTaskForecast(state, proposal.commandId, proposal.officerId, proposal.cityId) }));
}

export function setFormation(state, formationId) { if (!FORMATIONS[formationId]) throw new Error("不明な陣形です"); const next = clone(state); next.forces.frontier_guard.formation = formationId; return next; }

export function appointForceOfficer(state, role, officerId) {
  if (!["commanderId", "deputyId"].includes(role)) throw new Error("不明な軍団役職です");
  const officer = getOfficer(WORLD, state, officerId);
  if (!officer || officer.allegiance !== "serving") throw new Error("配下人物のみ任命できます");
  const next = clone(state); const otherRole = role === "commanderId" ? "deputyId" : "commanderId";
  if (next.forces.frontier_guard[otherRole] === officerId) throw new Error("同じ人物を重複任命できません");
  next.forces.frontier_guard[role] = officerId;
  logEntry(next, "軍団", role === "commanderId" ? "軍団長任命" : "副将任命", `${officer.name}を東部国境軍へ任命した。`, "info");
  return next;
}

export function getWarCouncilReport(state, objectiveId = "transit") {
  const objective = WAR_OBJECTIVES[objectiveId]; const military = getMilitarySummary(state);
  const balance = getContinentalBalance(state, "valka");
  const enemy = getCountryReport(state, "valka");
  return evaluateWarDecision({
    objective: { name: objective.name, scope: objective.scope, politicalValue: objective.politicalValue, description: objective.description },
    politics: { justification: state.justification, support: getWarSupport(state), escalationRisk: Math.round(clamp(objective.escalationRisk + balance.interventionRisk * 0.45 - balance.diplomaticDepth * 0.18, 0, 100)) },
    own: { army: military.army, supportColumns: military.supportColumns, training: military.training, organization: military.organization, mobility: military.mobility, exhaustion: state.warExhaustion },
    enemy: { ...enemy, capital: WORLD.countries.valka.capital },
    geography: { chokepointName: WORLD.strategicZones.ash_pass.name, chokepointValue: WORLD.strategicZones.ash_pass.value, maneuver: military.mobility, access: state.completedCommands.includes("navy.soundings") ? 76 : 51 },
    logistics: { supply: military.supply, distance: 18 }, intelligence: getIntelligence(state),
  });
}

function createWarState(state, targetCountryId, objectiveId, side = "attacker") {
  const military = getMilitarySummary(state);
  const enemy = state.foreignStates[targetCountryId];
  return {
    targetCountryId, objectiveId, side, plan: side === "defender" ? "defend" : "pass",
    score: 0, months: 0, objectiveProgress: 0, losses: 0, enemyLosses: 0,
    devastation: 0, homeDamage: 0, displaced: 0, civilianLosses: 0, stage: "opening",
    lastOwnAction: side === "defender" ? "防衛配置" : "開戦準備",
    lastEnemyAction: side === "defender"
      ? { id: "advance", label: "峠口へ前進する", reason: "侵攻路を確保し、守備側の反応を測る。" }
      : { id: "screen", label: "峠を警戒する", reason: "主力を温存し関所と国境城砦を守る。" },
    peace: null,
    theater: createWarTheater({
      targetCountryId,
      objectiveId,
      side,
      ownArmy: military.army,
      enemyArmy: enemy.army,
      ownMorale: state.forces.frontier_guard.morale,
      enemyMorale: enemy.cohesion,
      ownSupply: military.supply,
      enemySupply: enemy.organization,
      year: state.year,
      month: state.month,
    }),
  };
}

export function declareWar(state, objectiveId) {
  if (state.war) throw new Error("すでに戦争中です");
  const objective = WAR_OBJECTIVES[objectiveId]; if (!objective) throw new Error("戦争目的が不明です");
  if (objective.mode === "defensive") throw new Error("防衛目的は敵国の侵攻時に発動します");
  const next = normalizeWarState(clone(state)); const support = getWarSupport(next);
  const shortfall = Math.max(0, 50 - next.justification) + Math.max(0, 40 - support);
  if (shortfall > 0) { next.legitimacy = clamp(next.legitimacy - Math.ceil(shortfall / 4), 0, 100); next.cities.orta.resources.security = clamp(next.cities.orta.resources.security - 18, 0, 100); logEntry(next, "国内", "国境農民が徴発を拒否", "十分な正当性のない宣戦に東境州が反発した。", "danger"); }
  next.war = createWarState(next, "valka", objectiveId, "attacker");
  next.campaign.resolution = objectiveId === "submission" ? "occupation" : "limited_war";
  next.campaign.act = "resolution";
  next.negotiation.status = "war";
  recordHistoricalEvent(WORLD, next, {
    id: `history-war-declared-${next.year}-${next.month}-${objectiveId}`,
    type: "war_declared",
    title: `${objective.name}を掲げてヴァルカへ宣戦`,
    summary: `国境問題と交渉の行き詰まりを受け、限定目的「${objective.name}」の戦役を開始した。`,
    actors: [WORLD.nation.id, "valka"], locations: ["orta", "valka_keep"],
    causedBy: ["issue-border", `war-justification-${Math.round(next.justification)}`],
    effects: [`war-state-${next.year}-${next.month}-valka`],
  });
  logEntry(next, "宣戦", `${objective.name}を要求`, `政治目的「${objective.name}」のためヴァルカへ宣戦した。`, "danger");
  return next;
}

export function startDefensiveWar(state, countryId = "valka") {
  if (state.war) throw new Error("すでに戦争中です");
  if (!state.foreignStates[countryId]) throw new Error("侵攻国が不明です");
  const next = normalizeWarState(clone(state));
  next.war = createWarState(next, countryId, "homeland_defense", "defender");
  recordHistoricalEvent(WORLD, next, {
    id: `history-invasion-${next.year}-${next.month}-${countryId}`,
    type: "foreign_invasion",
    title: `${WORLD.countries[countryId].name}軍が東境州へ侵攻`,
    summary: "国境交渉の決裂と敵対度の上昇が武力侵攻として顕在化した。",
    actors: [countryId, WORLD.nation.id], locations: ["orta"],
    causedBy: [`foreign-hostility-${countryId}`, "issue-border"],
    effects: [`war-state-${next.year}-${next.month}-${countryId}`],
  });
  logEntry(next, "侵攻", `${WORLD.countries[countryId].name}軍が東境州へ侵攻`, "東部国境軍は防衛戦闘へ移り、都市と住民の退路を確保する。", "danger");
  return next;
}

export function setWarPlan(state, planId) {
  if (!state.war) throw new Error("戦争中ではありません");
  const plan = WAR_PLANS[planId];
  if (!plan || !plan.roles.includes(state.war.side ?? "attacker")) throw new Error("現在の戦争立場では選べない作戦です");
  const next = clone(state); next.war.plan = planId; return next;
}

export function getPeaceOptions(state) {
  if (!state.war) return [];
  return derivePeaceOptions({ ...state, warObjective: WAR_OBJECTIVES[state.war.objectiveId] });
}

function createOccupation(state, war, policy = "autonomy") {
  const strategicZone = war.objectiveId === "pass_control";
  const foreign = state.foreignStates[war.targetCountryId];
  const garrison = strategicZone ? 240 : 520;
  return {
    id: `occupation-${war.targetCountryId}-${state.year}-${state.month}`,
    countryId: war.targetCountryId,
    territoryId: strategicZone ? "ash_pass" : `${war.targetCountryId}_heartland`,
    name: strategicZone ? "灰冠峠共同管理区" : `${WORLD.countries[war.targetCountryId].name}占領地域`,
    status: "occupied", policy, months: 0,
    control: strategicZone ? 68 : 54,
    resistance: clamp(foreign.cohesion * 0.72 + war.devastation * 0.3 - war.score * 0.12, 18, 82),
    integration: strategicZone ? 18 : 0, assimilation: 0,
    infrastructure: foreign.infrastructure,
    population: strategicZone ? Math.round(foreign.civilianPopulation * 0.16) : foreign.civilianPopulation,
    displaced: strategicZone ? Math.round(foreign.displaced * 0.16) : foreign.displaced,
    civilianLosses: strategicZone ? Math.round(foreign.civilianLosses * 0.16) : foreign.civilianLosses,
    garrison, requiredGarrison: strategicZone ? 220 : 480, history: [], lastReport: null,
  };
}

export function negotiatePeace(state, settlementId = "auto") {
  if (!state.war) throw new Error("戦争中ではありません");
  if (state.war.months < 1) throw new Error("講和条件は1か月以上の戦況を確定してから提示できます");
  const next = normalizeWarState(clone(state)); const war = next.war; const objective = WAR_OBJECTIVES[war.objectiveId];
  const options = getPeaceOptions(next);
  const choice = settlementId === "auto"
    ? (options.find((option) => option.id === "objective" && option.allowed) ?? options.find((option) => option.id === "ceasefire"))
    : options.find((option) => option.id === settlementId);
  if (!choice || !choice.allowed) throw new Error(choice?.reason ?? "その講和条件は提示できません");
  const success = choice.id !== "ceasefire";
  let result = choice.name;
  if (war.side === "defender" && success) {
    result = "国境防衛と相互撤兵";
    next.issues.border.severity = clamp(next.issues.border.severity - 18, 0, 100);
  }
  if (success && war.objectiveId === "transit") { next.agreements.transit = true; next.issues.border.status = "resolved"; }
  if (success && war.objectiveId === "pass_control") {
    next.agreements.transit = true;
    next.issues.border.status = "resolved";
    if (!next.occupations.some((occupation) => occupation.territoryId === "ash_pass" && occupation.status === "occupied")) next.occupations.push(createOccupation(next, war, "integration"));
  }
  if (success && war.objectiveId === "submission") {
    const policy = choice.id === "occupation" ? "military" : "autonomy";
    next.occupations.push(createOccupation(next, war, policy));
    next.agreements.transit = true;
    next.issues.border.status = "resolved";
  }
  if (success && next.agreements.transit) {
    next.campaign.resolution = war.objectiveId === "transit" ? "limited_war" : war.objectiveId === "pass_control" ? "war_settlement" : "occupation";
    next.campaign.act = "aftermath";
    next.campaign.actStartedTurn = next.turn;
    next.negotiation.status = "settled";
    next.negotiation.outcome = next.campaign.resolution;
  } else if (!success) {
    next.negotiation.status = "stalled";
  }
  const target = next.foreignStates[war.targetCountryId];
  target.relation = clamp(target.relation + (choice.id === "ceasefire" ? -2 : choice.id === "occupation" ? -22 : 6), -100, 100);
  target.hostility = clamp(target.hostility + (choice.id === "occupation" ? 18 : success ? -5 : 2), 0, 100);
  next.warHistory.unshift({
    id: `war-${next.year}-${next.month}-${war.targetCountryId}`, year: next.year, month: next.month,
    targetCountryId: war.targetCountryId, objectiveId: war.objectiveId, side: war.side,
    settlementId: choice.id, result, months: war.months, score: war.score,
    losses: war.losses, enemyLosses: war.enemyLosses, devastation: war.devastation,
    homeDamage: war.homeDamage, displaced: war.displaced, civilianLosses: war.civilianLosses,
  });
  next.warHistory = next.warHistory.slice(0, 60);
  const warCauseEvent = [...next.history.events].reverse().find((event) => ["war_declared", "foreign_invasion"].includes(event.type) && event.actors.includes(war.targetCountryId));
  recordHistoricalEvent(WORLD, next, {
    id: `history-peace-${next.year}-${next.month}-${war.targetCountryId}`,
    type: "peace_settlement",
    title: `${WORLD.countries[war.targetCountryId].name}との戦役を終結`,
    summary: `${war.months}か月の戦役を「${result}」で終えた。自軍損失 ${war.losses}、避難民 ${war.displaced}。`,
    actors: [WORLD.nation.id, war.targetCountryId], locations: ["orta", "valka_keep"],
    causedBy: [warCauseEvent?.id ?? `war-state-${next.year}-${next.month}-${war.targetCountryId}`],
    effects: [`settlement-${choice.id}`, success ? `objective-${war.objectiveId}-result` : "unresolved-border-tension"],
  });
  next.war = null; next.warExhaustion = clamp(next.warExhaustion - (success ? 8 : 4), 0, 100);
  logEntry(next, "講和", result, `${war.months}か月の戦役を終了。兵の損失 ${war.losses}、敵軍推定損失 ${war.enemyLosses}、累計避難民 ${war.displaced}。`, success ? "success" : "danger");
  return next;
}

export function setOccupationPolicy(state, occupationId, policyId) {
  if (!OCCUPATION_POLICIES[policyId]) throw new Error("占領政策が不明です");
  const next = normalizeWarState(clone(state));
  const occupation = next.occupations.find((item) => item.id === occupationId);
  if (!occupation || occupation.status !== "occupied") throw new Error("統治中の占領地域がありません");
  occupation.policy = policyId;
  logEntry(next, "占領", `${occupation.name}を${OCCUPATION_POLICIES[policyId].name}へ変更`, OCCUPATION_POLICIES[policyId].description, policyId === "assimilation" || policyId === "military" ? "danger" : "info");
  return next;
}

export function setOccupationGarrison(state, occupationId, amount) {
  const next = normalizeWarState(clone(state));
  const occupation = next.occupations.find((item) => item.id === occupationId);
  if (!occupation || occupation.status !== "occupied") throw new Error("駐屯対象がありません");
  const totalAvailable = getMilitarySummary(next).army + occupation.garrison;
  const requested = Math.round(Number(amount));
  if (!Number.isFinite(requested) || requested < 100 || requested > totalAvailable) throw new Error(`駐屯兵は100〜${totalAvailable}の範囲で指定してください`);
  occupation.garrison = requested;
  logEntry(next, "占領", `${occupation.name}の駐屯兵を変更`, `駐屯兵 ${requested} / 必要 ${occupation.requiredGarrison}。`, "info");
  return next;
}

export function releaseOccupation(state, occupationId) {
  const next = normalizeWarState(clone(state));
  const occupation = next.occupations.find((item) => item.id === occupationId);
  if (!occupation || occupation.status !== "occupied") throw new Error("撤兵できる占領地域がありません");
  occupation.status = "released";
  occupation.garrison = 0;
  next.legitimacy = clamp(next.legitimacy + 2, 0, 100);
  next.foreignStates[occupation.countryId].relation = clamp(next.foreignStates[occupation.countryId].relation + 12, -100, 100);
  logEntry(next, "占領", `${occupation.name}から撤兵`, "自治政府へ権限を移し、軍事占領を終了した。", "success");
  return next;
}

export function deriveMetrics(state) {
  const ledger = deriveRealmLedger(state); const military = getMilitarySummary(state);
  return { warSupport: getWarSupport(state), intelligence: getIntelligence(state), continentalMobility: military.mobility, interventionRisk: getContinentalBalance(state).interventionRisk, activeIssues: Object.values(state.issues).filter((issue) => issue.status === "active").length, governance: ledger.governance, factionRisk: ledger.factionRisk };
}
