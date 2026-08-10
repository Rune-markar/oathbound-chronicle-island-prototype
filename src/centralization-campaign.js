import {
  AUTHORITY_DOMAINS,
  AUTHORITY_REFORM_STAGES,
  AUTHORITY_TRANSFER_METHODS,
  deriveAdministrationNetwork,
  deriveCentralizationResult,
  deriveRegionAuthority,
  normalizeAdministrationState,
} from "./administration-model.js";
import { buildGeneratedWorld } from "./generated-world-system.js";
import { normalizeHistoryState, recordHistoricalEvent } from "./history-model.js";

const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const round = (value, digits = 1) => Number((Number(value) || 0).toFixed(digits));
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

export const NATIONAL_REFORM_SYSTEMS = Object.freeze({
  fiscal_unification: Object.freeze({
    id: "fiscal_unification", name: "財政統一", shortName: "財政",
    domains: Object.freeze(["tax_rights", "tax_collection", "customs", "currency"]),
    benefit: "王国全域の課税根拠・徴収・関税・通貨を一つの財政へ接続する。",
    cost: "地方財源と商会の裁量を失わせ、移行期の徴収停滞を招く。",
    opposition: "地方地主、河港商会、関税請負人",
  }),
  law_security_unification: Object.freeze({
    id: "law_security_unification", name: "法・治安統一", shortName: "法治",
    domains: Object.freeze(["justice", "policing"]),
    benefit: "裁判・警察の最終権限を王国法へ統一し、州境を越えて執行する。",
    cost: "慣習法と在地治安組織の正統性を傷つけやすい。",
    opposition: "旧貴族、在地軍人団、宗教裁判権者",
  }),
  population_land_knowledge: Object.freeze({
    id: "population_land_knowledge", name: "人口・土地把握", shortName: "把握",
    domains: Object.freeze(["land_administration", "cadastre", "population_registry"]),
    benefit: "戸籍・地籍・土地行政を結び、課税と動員の対象を可視化する。",
    cost: "隠匿されてきた土地・身分・免除を暴き、初期の反発が大きい。",
    opposition: "神殿台帳官、村落共同体、免税特権層",
  }),
  military_unification: Object.freeze({
    id: "military_unification", name: "軍事統一", shortName: "軍制",
    domains: Object.freeze(["military_command", "conscription"]),
    benefit: "指揮系統と徴兵を中央へ束ね、全国規模の常備軍を成立させる。",
    cost: "在地防衛の即応性と軍役共同体の自尊を損ないやすい。",
    opposition: "国境軍人団、諸侯軍、地域民兵",
  }),
  bureaucratic_standardization: Object.freeze({
    id: "bureaucratic_standardization", name: "官僚・規格統一", shortName: "官規",
    domains: Object.freeze(["appointments", "executive", "education", "religious_authority", "infrastructure", "standards"]),
    benefit: "任官・行政・教育・宗教・道路・規格を共通官僚制へ組み込む。",
    cost: "中央の恒常費と処理負荷が増え、地方知識が形式知へ置換される。",
    opposition: "旧官職家、神殿、学校、都市評議会、職人組合",
  }),
});

export const NATIONAL_REFORM_BUDGETS = Object.freeze({
  limited: Object.freeze({ id: "limited", name: "限定予算", cost: 6, speed: 0.82, backlash: -4 }),
  standard: Object.freeze({ id: "standard", name: "標準予算", cost: 10, speed: 1, backlash: 0 }),
  priority: Object.freeze({ id: "priority", name: "重点予算", cost: 16, speed: 1.28, backlash: 8 }),
});

export const REFORM_CONCESSIONS = Object.freeze({
  none: Object.freeze({ id: "none", name: "譲歩なし", speed: 1.08, resistance: 12, description: "全国一律の期限と条件を適用する。" }),
  compensation: Object.freeze({ id: "compensation", name: "金銭補償", speed: 0.94, resistance: -15, description: "失う収入と役職へ期限付き補償を行う。" }),
  local_offices: Object.freeze({ id: "local_offices", name: "地方官職を保障", speed: 0.9, resistance: -20, description: "旧勢力の人員を新制度の地方官へ登用する。" }),
  temporary_exemption: Object.freeze({ id: "temporary_exemption", name: "期限付き例外", speed: 0.78, resistance: -24, description: "地域固有の例外を残し、後から統一する。" }),
});

export const HISTORY_POLICIES = Object.freeze({
  recognize_privileges: Object.freeze({
    id: "recognize_privileges", name: "旧特権を承認する",
    description: "既存記録の効力を認め、合意による移管だけを進める。",
    shortBenefit: "王廷支持と地域服従を得る", longRisk: "排除による撤回が難しくなる",
  }),
  royal_reinterpretation: Object.freeze({
    id: "royal_reinterpretation", name: "王室史書へ再解釈する",
    description: "特権を恒久権ではなく、非常時の代行委任として再解釈する。",
    shortBenefit: "法的正当化と特権撤回を進める", longRisk: "地方の記憶と公式記録が乖離する",
  }),
  local_tradition_compromise: Object.freeze({
    id: "local_tradition_compromise", name: "地方伝承と妥協する",
    description: "公式記録へ地方側の犠牲と功績を併記し、新制度内の地位を保証する。",
    shortBenefit: "反乱圧力と動員抵抗を抑える", longRisk: "制度上の例外と交渉費用が残る",
  }),
  suppress_records: Object.freeze({
    id: "suppress_records", name: "記録を破棄・隠蔽する",
    description: "不都合な特許状と台帳を封印し、王室命令の障害を短期的に消す。",
    shortBenefit: "撤回の法的障害を急速に下げる", longRisk: "情報歪曲と発覚時の強い歴史的不満を残す",
  }),
});

export const LEVIATHAN_POLICIES = Object.freeze({
  local_councils: Object.freeze({ id: "local_councils", name: "地方港湾評議会との共同統治", description: "現地知識を優先し、避難・閉港を港ごとに共同決定する。" }),
  royal_emergency: Object.freeze({ id: "royal_emergency", name: "非常権限による中央統制", description: "港湾・船舶を王国命令へ服させる。即応は速いが恒久化への反発を残す。" }),
  national_warning: Object.freeze({ id: "national_warning", name: "警報網を全国規格化", description: "観測所、信号、報告書式を統一し、誤報と伝達遅延を減らす。" }),
  international_cooperation: Object.freeze({ id: "international_cooperation", name: "沿岸国との国際協力", description: "観測情報と迂回航路を交換し、単独閉鎖による損失を抑える。" }),
});

export const CENTRALIZATION_STAGES = Object.freeze([
  Object.freeze({
    id: "covenant_kingdom", name: "盟約王国", number: 1,
    unlock: "建国盟約により成立済み",
    requiredReforms: ["灰冠峠三幕キャンペーン"],
    politicalBarrier: "王権は共同防衛の調停者に留まり、地方特権を直接代替できない。",
    upkeep: "諸州会議と軍役・納付の個別交渉", upkeepCost: 0,
    localReaction: "王冠を盟約の守護者として支持するが、恒久的な権限移管には抵抗する。",
    recovery: "灰冠峠の通行・規格・情報問題を解き、中央制度が共同利益を作れると示す。",
  }),
  Object.freeze({
    id: "visible_state", name: "可視化国家", number: 2,
    unlock: "灰冠峠第一章を完了し、人口・土地・権利の所在を監査できる。",
    requiredReforms: ["人口・土地把握"],
    politicalBarrier: "戸籍・地籍の隠匿と、公式史・地方伝承の食い違い。",
    upkeep: "測量、台帳照合、定期報告", upkeepCost: 0.5,
    localReaction: "条件付き受諾、隠匿、補償要求を使い分ける。",
    recovery: "地方伝承との照合、観測官の増員、期限付き免除で監査を再開する。",
  }),
  Object.freeze({
    id: "standardized_state", name: "規格統一国家", number: 3,
    unlock: "帳簿、道路、通貨、度量衡の共通規格が主要地域へ浸透する。",
    requiredReforms: ["財政統一", "官僚・規格統一"],
    politicalBarrier: "商会・職人・神殿が旧規格の費用と権威を守ろうとする。",
    upkeep: "検査官、規格庫、道路・通信維持", upkeepCost: 0.8,
    localReaction: "改革遅延、官吏買収、王廷派閥への請願。",
    recovery: "移行規格と補償期間を設け、交通の要衝から再統一する。",
  }),
  Object.freeze({
    id: "bureaucratic_state", name: "官僚制国家", number: 4,
    unlock: "中央官庁が地方実務を代替し、任官と行政命令を継続処理できる。",
    requiredReforms: ["官僚・規格統一", "人口・土地把握"],
    politicalBarrier: "旧勢力を吸収した官僚派閥と、行政負荷の急増。",
    upkeep: "常勤官吏、俸給、監察、文書輸送", upkeepCost: 1.2,
    localReaction: "官職保障を求めるか、反改革同盟を組む。",
    recovery: "直轄範囲を絞り、太守委任と監察を併用して過負荷を解消する。",
  }),
  Object.freeze({
    id: "military_judicial_state", name: "軍事・司法統一国家", number: 5,
    unlock: "中央軍令と王国法が全地域で地方命令を上書きできる。",
    requiredReforms: ["軍事統一", "法・治安統一"],
    politicalBarrier: "在地軍人団の動員拒否と慣習裁判権の正統性。",
    upkeep: "常備軍、巡回裁判、全国警察通信", upkeepCost: 1.6,
    localReaction: "動員拒否、外国支援要請、暴動・反乱へ進み得る。",
    recovery: "共同指揮・上訴制度・旧軍人の正規軍編入で実務を取り戻す。",
  }),
  Object.freeze({
    id: "fully_centralized_state", name: "完全集権国家", number: 6,
    unlock: "deriveCentralizationResult() の全要件を同時に満たす。",
    requiredReforms: ["全5改革系統", "法的・実務権限", "行政余力"],
    politicalBarrier: "中央内部の官僚・軍部が新たな独立権力へ変わる危険。",
    upkeep: "全国官庁、常備軍、裁判、警報・通信網", upkeepCost: 2.1,
    localReaction: "失権後の地位に応じ、協力・潜在抵抗・亡命を選ぶ。",
    recovery: "中央内部の監察と職務分離を行い、地方知識を制度内へ戻す。",
  }),
  Object.freeze({
    id: "post_centralization_crisis", name: "集権後危機", number: 7,
    unlock: "完全集権化達成の翌月から必ず12か月継続する。",
    requiredReforms: ["官僚派閥", "軍部", "財政", "情報", "地方知識", "継承"],
    politicalBarrier: "集権化を実現した制度そのものが王権を空洞化し得る。",
    upkeep: "統一国家の全制度と危機対策", upkeepCost: 2.5,
    localReaction: "懐柔・吸収・排除の履歴に応じて、中央内部と地方の配置が変わる。",
    recovery: "12か月を通じ、過負荷・歪曲・派閥自立を既存制度で抑える。",
  }),
]);

const LOCAL_RESPONSE_DEFINITIONS = Object.freeze({
  conditional_acceptance: ["条件付き受諾", "改革後の地方官職と上訴権が守られる限り受け入れる。", "administration"],
  compensation_demand: ["補償要求", "失う収入・役職・宗教的威信への補償を要求する。", "fiscal_military"],
  reform_delay: ["改革遅延", "追加調査と例外審査を求め、工程を遅らせる。", "administration"],
  hide_records: ["戸籍・地籍の隠匿", "台帳・境界標・身分記録を分散させ、可視化を妨げる。", "administration"],
  tax_delay: ["納税遅延", "納付を保留し、改革予算と中央財政へ圧力をかける。", "fiscal_military"],
  bribe_officials: ["官吏買収", "新任官吏へ接触し、監査と移管の実務を骨抜きにする。", "administration"],
  refuse_mobilization: ["動員拒否", "在地兵と軍役名簿を中央軍令から引き揚げる。", "fiscal_military"],
  court_petition: ["王廷派閥への請願", "歴史記録と王廷内の協力者を使い、改革差止めを求める。", "rebellion"],
  counter_reform_alliance: ["反改革同盟", "複数地方勢力が権限防衛を共同化する。", "rebellion"],
  seek_foreign_support: ["外国への支援要請", "国境・交易上の接触を使い、外圧で改革を止めようとする。", "rebellion"],
  uprising: ["暴動または反乱", "地方社会の動員力を使い、中央官庁と台帳を実力で排除する。", "rebellion"],
});

const ENTITY_POLITICAL_PROFILES = Object.freeze({
  farmers: { goal: "共同地と生存を守る", protected: ["land_administration", "cadastre"], minimum: "共同地の承認と課税上限", courtAlly: "救恤派", foreignContact: 8, means: ["hide_records", "tax_delay", "uprising"], desired: "公認村落会議" },
  merchants: { goal: "交易と都市自治を拡大する", protected: ["customs", "currency", "standards"], minimum: "移行補償と商事裁判参加", courtAlly: "通商派", foreignContact: 62, means: ["tax_delay", "bribe_officials", "seek_foreign_support"], desired: "王国認可商会" },
  landowners: { goal: "所領・裁判・任官への影響を維持する", protected: ["tax_rights", "justice", "appointments", "executive"], minimum: "家格と地方官職の保障", courtAlly: "旧家派", foreignContact: 28, means: ["court_petition", "counter_reform_alliance", "uprising"], desired: "世襲貴族院または高級官僚" },
  military: { goal: "在地軍の指揮と名誉を守る", protected: ["military_command", "conscription", "policing"], minimum: "正規軍での指揮席と地域防衛裁量", courtAlly: "国境派", foreignContact: 46, means: ["refuse_mobilization", "counter_reform_alliance", "seek_foreign_support", "uprising"], desired: "王国軍地方軍団" },
  temple: { goal: "信仰・教育・救済・記録の権威を守る", protected: ["religious_authority", "education", "population_registry"], minimum: "教義自治と記録共同管理", courtAlly: "祭儀派", foreignContact: 21, means: ["hide_records", "court_petition", "counter_reform_alliance"], desired: "公認宗務院" },
});

function dateId(state) {
  return `${state.year}-${String(state.month).padStart(2, "0")}`;
}

function fixedNationFormation() {
  return {
    source: "fixed", seed: "selena-canonical", nationId: "selena", nationName: "セレナ王国",
    administrativeDistance: { selene: 0, nereia: 2, orta: 3 },
    communicationTime: { selene: 1, nereia: 10, orta: 16 },
    settlements: [
      { id: "selene-capital", name: "王都セレナ", kind: "王都・行政中枢", basis: "銀脈河中流の街道結節" },
      { id: "nereia-river-port", name: "ネレイア河港", kind: "河川交易都市", basis: "銀脈河の船運と洪水復旧" },
      { id: "orta-pass", name: "オルタ", kind: "峠の軍事共同体", basis: "灰冠峠の遠距離防衛" },
    ],
    localPowers: ["王都旧家", "河港商会と神殿", "東境軍人団"],
    pastCrises: ["建国戦争の兵站不足", "銀脈河大洪水", "灰冠戦役"],
    compromises: ["諸州評議", "河港再建協定", "東境軍役協定"],
    privileges: [
      { basis: "王都旧家の建国奉仕", domain: "justice", autonomy: 54 },
      { basis: "河港再建資本", domain: "customs", autonomy: 72 },
      { basis: "峠の自力防衛", domain: "conscription", autonomy: 78 },
    ],
    naturalBorders: ["銀脈河", "灰冠山系"],
    integrationCost: 58,
    obstacles: ["河港特権", "峠の通信遅延", "神殿戸籍への依存"],
  };
}

function wrapDistance(left, right, width) {
  const dx = Math.min(Math.abs(left.x - right.x), width - Math.abs(left.x - right.x));
  return dx + Math.abs(left.y - right.y);
}

export function deriveGeneratedNationFormation(state) {
  const runtime = buildGeneratedWorld(state);
  const nation = runtime.nationById.get(state.generatedWorld?.playerNationId) ?? runtime.nations.nations[0];
  const capital = runtime.tiles[nation.capitalIndex];
  const tiles = runtime.tiles.filter((tile) => tile.nationId === nation.id);
  const ranked = (score) => [...tiles].sort((left, right) => score(right) - score(left));
  const riverCity = ranked((tile) => (tile.riverId ? 45 : 0) + tile.yields.commerce * 12 + tile.freshwater * 18)[0];
  const pass = ranked((tile) => (tile.relief === "mountains" ? 55 : tile.relief === "hills" ? 28 : 0) + tile.defense * 12)[0];
  const breadbasket = ranked((tile) => tile.yields.food * 22 + tile.fertility * 0.35)[0];
  const mine = ranked((tile) => tile.yields.production * 20 + (tile.relief === "mountains" ? 24 : 0))[0];
  const remote = ranked((tile) => wrapDistance(tile, capital, runtime.terrain.width) * tile.movementCost)[0];
  const multiLandmass = new Set(tiles.map((tile) => tile.landmassId)).size > 1;
  const marshShare = tiles.filter((tile) => tile.feature === "marsh").length / Math.max(1, tiles.length);
  const mountainShare = tiles.filter((tile) => tile.relief === "mountains").length / Math.max(1, tiles.length);
  const coastalShare = tiles.filter((tile) => tile.coastal).length / Math.max(1, tiles.length);
  const maxDistance = Math.max(1, ...tiles.map((tile) => wrapDistance(tile, capital, runtime.terrain.width)));
  const privilegeCandidates = [
    { basis: "河川交易都市の再建と船運", domain: "customs", autonomy: 48 + Math.round((riverCity?.yields.commerce ?? 0) * 8) },
    { basis: "峠の自力防衛", domain: "military_command", autonomy: 52 + Math.round(mountainShare * 70) },
    { basis: "遠隔地の宗教施設による行政代替", domain: "population_registry", autonomy: 45 + Math.round((remote?.movementCost ?? 1) * 8) },
    { basis: "穀倉共同体の土地慣行", domain: "land_administration", autonomy: 42 + Math.round((breadbasket?.yields.food ?? 0) * 7) },
    { basis: "鉱山勢力の貨幣・労務供出", domain: "tax_collection", autonomy: 44 + Math.round((mine?.yields.production ?? 0) * 6) },
  ];
  const privileges = privilegeCandidates
    .sort((left, right) => right.autonomy - left.autonomy)
    .slice(0, 3)
    .map((entry) => ({ ...entry, autonomy: Math.round(clamp(entry.autonomy, 35, 92)) }));
  const borderKeys = Object.entries(runtime.nations.sharedBorderLengths)
    .filter(([key]) => key.split(":").includes(nation.id))
    .sort((left, right) => right[1] - left[1]);
  const followsRiver = runtime.nations.borderSegments.filter((segment) => segment.nations.includes(nation.id) && segment.followsRiver).length;
  return {
    source: "generated", seed: runtime.terrain.seed, nationId: nation.id, nationName: nation.name,
    administrativeDistance: { selene: 0, nereia: Math.max(1, Math.round(maxDistance * 0.42)), orta: Math.max(2, Math.round(maxDistance * 0.74)) },
    communicationTime: { selene: 1, nereia: Math.max(3, Math.round(maxDistance * 1.3)), orta: Math.max(5, Math.round(maxDistance * 2.1)) },
    settlements: [
      { id: capital.id, name: `${nation.shortName}王都`, kind: "王都・行政中枢", basis: `${capital.terrain}の首都適地` },
      { id: riverCity.id, name: "河川交易都市", kind: "河川交易都市", basis: `河川・淡水・商業 ${round(riverCity.yields.commerce, 1)}` },
      { id: pass.id, name: "峠の軍事共同体", kind: "峠の軍事共同体", basis: `${pass.relief}・防御 ${pass.defense}` },
      { id: breadbasket.id, name: "王国穀倉地帯", kind: "穀倉地帯", basis: `食料産出 ${round(breadbasket.yields.food, 1)}` },
      { id: mine.id, name: "鉱山勢力圏", kind: "鉱山勢力", basis: `生産 ${round(mine.yields.production, 1)}` },
      { id: remote.id, name: "遠隔宗務区", kind: "宗教施設が行政を代替", basis: `首都距離 ${wrapDistance(remote, capital, runtime.terrain.width)}・移動 ${remote.movementCost}` },
    ],
    localPowers: ["河川商会", "峠守備団", "穀倉共同体", "鉱山請負人", "遠隔宗務院"],
    pastCrises: [
      followsRiver > 2 ? "大河洪水と交易路再建" : "街道断絶と飢饉",
      mountainShare > 0.16 ? "山地侵攻と峠の自力防衛" : "平原動員戦争",
      multiLandmass || coastalShare > 0.3 ? "海路封鎖と島嶼救援" : "遠隔地の命令不履行",
    ],
    compromises: privileges.map((privilege) => `${privilege.basis}への${AUTHORITY_DOMAINS[privilege.domain].name}委任`),
    privileges,
    naturalBorders: [
      followsRiver ? `河川境界 ${followsRiver}区間` : "河川境界なし",
      borderKeys.length ? `最大陸上国境 ${borderKeys[0][1]}区間` : "島嶼海岸",
    ],
    integrationCost: Math.round(clamp(24 + maxDistance * 2.2 + mountainShare * 44 + marshShare * 38 + (multiLandmass ? 18 : 0), 20, 100)),
    obstacles: [
      mountainShare > 0.18 ? "山岳自治と峠軍役" : "広域街道の維持費",
      marshShare > 0.06 ? "湿地共同体の地籍難" : "遠隔戸籍の遅延",
      multiLandmass ? "島嶼評議会と海上通信" : riverCity.riverId ? "河川商会の関税権" : "内陸市場の規格差",
    ],
  };
}

function enrichPowerEntities(state) {
  Object.values(state.administration.powerEntities).forEach((entity) => {
    const profile = ENTITY_POLITICAL_PROFILES[entity.type] ?? ENTITY_POLITICAL_PROFILES.landowners;
    entity.goal ??= profile.goal;
    entity.protectedAuthorities ??= [...profile.protected];
    entity.minimumCompromise ??= profile.minimum;
    entity.courtAlly ??= profile.courtAlly;
    entity.localRelations ??= {};
    entity.foreignContactPotential ??= profile.foreignContact;
    entity.resistanceMeans ??= [...profile.means];
    entity.desiredPostReformStatus ??= profile.desired;
  });
  const entities = Object.values(state.administration.powerEntities);
  entities.forEach((entity) => {
    entities.filter((candidate) => candidate.regionId === entity.regionId && candidate.id !== entity.id).forEach((candidate) => {
      entity.localRelations[candidate.id] ??= entity.type === candidate.type ? 28 : entity.type === "merchants" && candidate.type === "temple" ? 18 : 0;
    });
  });
}

function applyGeneratedPrivilegeComposition(state) {
  const campaign = state.centralizationCampaign;
  if (campaign.geographyApplied || state.nationFormation.source !== "generated") return;
  const regionIds = ["nereia", "orta", "selene"];
  state.nationFormation.privileges.forEach((source, index) => {
    const regionId = regionIds[index % regionIds.length];
    const domain = AUTHORITY_DOMAINS[source.domain];
    const holderEntityId = `${regionId}:${domain.holder}`;
    const existing = state.administration.privileges.find((privilege) => privilege.regionId === regionId && privilege.domain === source.domain);
    const origin = state.administration.privileges.find((privilege) => privilege.regionId === regionId) ?? state.administration.privileges[0];
    const privilege = existing ?? {
      id: `privilege-${regionId}-${source.domain}-generated`, regionId, domain: source.domain, holderEntityId,
      originYear: origin.originYear, originEventId: origin.originEventId,
      grantedRights: [`${domain.name}の地方行使`, "地方属官の選任"], obligations: ["危機時の役務提供"], revocable: true,
    };
    Object.assign(privilege, {
      name: `${state.nationFormation.nationName}${domain.name}特権`,
      originalReason: source.basis,
      legitimacy: Math.round(clamp(source.autonomy * 0.9, 35, 88)),
      entrenchment: source.autonomy,
      publicRecognition: Math.round(clamp(source.autonomy * 0.82, 30, 86)),
      revocationCost: Math.round(clamp(source.autonomy * 0.9, 30, 90)),
    });
    if (!existing) state.administration.privileges.push(privilege);
    const central = state.administration.authorities.find((authority) => authority.regionId === regionId && authority.domain === source.domain && authority.holderEntityId === "central_court");
    const local = state.administration.authorities.find((authority) => authority.regionId === regionId && authority.domain === source.domain && authority.holderEntityId === holderEntityId);
    if (central && local) {
      const practical = Math.min(82, Math.max(local.practicalShare, source.autonomy));
      central.practicalShare = round(100 - practical, 1);
      local.practicalShare = round(practical, 1);
      const legal = Math.min(76, Math.max(local.legalShare, source.autonomy * 0.78));
      central.legalShare = round(100 - legal, 1);
      local.legalShare = round(legal, 1);
    }
  });
  campaign.geographyApplied = true;
}

function freshCampaignState(state) {
  return {
    schemaVersion: 1,
    stageId: "covenant_kingdom",
    stageEnteredTurn: state.turn ?? 0,
    highestStageIndex: 0,
    fullCentralizationTurn: null,
    crisis: null,
    ending: null,
    reforms: [],
    localResponses: [],
    historyPolicies: [],
    decisionsThisMonth: [],
    stageHistory: [{ stageId: "covenant_kingdom", turn: state.turn ?? 0, year: state.year, month: state.month }],
    failures: [],
    geographyApplied: false,
  };
}

function normalizeLeviathanState(state) {
  state.leviathan ??= {};
  Object.assign(state.leviathan, {
    cycleLengthMonths: 360,
    cycleMonth: Number.isInteger(state.leviathan.cycleMonth) ? ((state.leviathan.cycleMonth % 360) + 360) % 360 : 252,
    policyId: state.leviathan.policyId ?? "local_councils",
    observatories: Number.isFinite(state.leviathan.observatories) ? state.leviathan.observatories : 0,
    warningNetwork: Boolean(state.leviathan.warningNetwork),
    emergencyPowersPermanent: Boolean(state.leviathan.emergencyPowersPermanent),
    lastDamageCycle: Number.isInteger(state.leviathan.lastDamageCycle) ? state.leviathan.lastDamageCycle : null,
    history: state.leviathan.history ?? [],
  });
}

export function normalizeCentralizationCampaign(world, state) {
  normalizeAdministrationState(world, state);
  normalizeHistoryState(world, state);
  state.scenarioMode = state.scenarioMode === "generated" ? "generated" : "fixed";
  state.centralizationCampaign ??= freshCampaignState(state);
  const campaign = state.centralizationCampaign;
  campaign.schemaVersion = 1;
  campaign.stageId ??= "covenant_kingdom";
  campaign.stageEnteredTurn ??= state.turn ?? 0;
  campaign.highestStageIndex = Number.isInteger(campaign.highestStageIndex) ? campaign.highestStageIndex : 0;
  campaign.fullCentralizationTurn = Number.isInteger(campaign.fullCentralizationTurn) ? campaign.fullCentralizationTurn : null;
  campaign.crisis ??= null;
  campaign.ending ??= null;
  campaign.reforms ??= [];
  campaign.localResponses ??= [];
  campaign.historyPolicies ??= [];
  campaign.decisionsThisMonth ??= [];
  campaign.stageHistory ??= [];
  campaign.failures ??= [];
  campaign.geographyApplied = Boolean(campaign.geographyApplied);
  state.nationFormation ??= state.scenarioMode === "generated" ? deriveGeneratedNationFormation(state) : fixedNationFormation();
  enrichPowerEntities(state);
  applyGeneratedPrivilegeComposition(state);
  normalizeLeviathanState(state);
  return state;
}

function geometricControl(values) {
  if (!values.length) return 0;
  const safe = values.map((value) => clamp(value, 0.1, 100) / 100);
  const geometric = Math.exp(mean(safe.map(Math.log))) * 100;
  return round(Math.min(geometric, Math.min(...values) * 1.55), 1);
}

export function deriveNationalReformPortfolio(world, state) {
  normalizeCentralizationCampaign(world, state);
  const network = deriveAdministrationNetwork(world, state);
  const regions = network.authority.regions;
  const systems = Object.values(NATIONAL_REFORM_SYSTEMS).map((system) => {
    const cells = regions.flatMap((region) => region.domains.filter((domain) => system.domains.includes(domain.id)).map((domain) => ({
      regionId: region.cityId,
      domainId: domain.id,
      legal: domain.legalShare,
      practical: domain.practicalShare,
      effective: domain.effectiveControl,
      readiness: domain.reformReadiness,
      privilege: domain.privileges[0] ?? null,
    })));
    const control = geometricControl(cells.map((cell) => Math.min(cell.legal, cell.practical, cell.effective)));
    const readiness = round(mean(cells.map((cell) => cell.readiness)), 0);
    const privilegeResistance = round(Math.max(0, ...cells.map((cell) => cell.privilege?.entrenchment ?? 0)), 0);
    const active = state.centralizationCampaign.reforms.filter((reform) => reform.systemId === system.id && reform.status === "active");
    const completedWaves = state.centralizationCampaign.reforms.filter((reform) => reform.systemId === system.id && reform.status === "completed").length;
    return {
      ...system, control, readiness, privilegeResistance, active, completedWaves, cells,
      backlash: Math.round(clamp(privilegeResistance * 0.46 + (100 - readiness) * 0.42 + (100 - control) * 0.12)),
      insufficientPreparation: readiness < 55 ? "行政・交通・情報の準備不足" : readiness < 72 ? "一部地域に準備不足" : "全国展開可能",
    };
  });
  return { systems, network };
}

function latestHistoryPolicy(state) {
  return state.centralizationCampaign.historyPolicies.at(-1) ?? null;
}

export function deriveHistoricalRuleEffects(world, state, regionId = null) {
  normalizeCentralizationCampaign(world, state);
  const regionIds = regionId ? [regionId] : Object.keys(state.cities);
  const privileges = state.administration.privileges.filter((privilege) => regionIds.includes(privilege.regionId));
  const grievances = state.administration.grievances.filter((grievance) => regionIds.includes(grievance.regionId));
  const policy = latestHistoryPolicy(state);
  let legalLegitimacy = mean(privileges.map((privilege) => privilege.legitimacy ?? 50));
  let publicBelief = mean(regionIds.map((id) => state.cities[id].resources.support));
  publicBelief += mean(privileges.map((privilege) => (privilege.publicRecognition ?? 50) - 50)) * 0.18;
  publicBelief -= mean(grievances.map((grievance) => grievance.strength ?? 0)) * 0.16;
  if (policy?.policyId === "recognize_privileges") { legalLegitimacy -= 10; publicBelief += 8; }
  if (policy?.policyId === "royal_reinterpretation") { legalLegitimacy += 12; publicBelief -= 5; }
  if (policy?.policyId === "local_tradition_compromise") { legalLegitimacy += 3; publicBelief += 11; }
  if (policy?.policyId === "suppress_records") { legalLegitimacy += 18; publicBelief -= 14; }
  legalLegitimacy = round(clamp(legalLegitimacy + (state.justification - 50) * 0.3), 0);
  publicBelief = round(clamp(publicBelief), 0);
  return {
    legalLegitimacy,
    publicBelief,
    courtSupport: round(clamp(state.legitimacy * 0.65 + legalLegitimacy * 0.35), 0),
    diplomaticClaim: round(clamp(state.justification * 0.62 + legalLegitimacy * 0.38), 0),
    privilegeRevocationAllowed: legalLegitimacy >= 58 && policy?.policyId !== "recognize_privileges",
    rebellionModifier: round((50 - publicBelief) * 0.42, 1),
    mobilizationModifier: round((publicBelief - 50) * 0.32, 1),
    religiousAttitude: publicBelief >= 62 ? "協力" : publicBelief >= 45 ? "留保" : "抵抗",
    policy,
  };
}

function useCentralDecision(state, type, detail) {
  const decisions = state.centralizationCampaign.decisionsThisMonth;
  if (decisions.length >= 3) throw new Error("今月の主要判断は3件までです。月末を進めてください");
  decisions.push({ id: `central-decision-${state.turn}-${decisions.length + 1}`, type, detail });
}

export function adoptHistoryPolicy(world, state, policyId) {
  const next = structuredClone(state);
  normalizeCentralizationCampaign(world, next);
  const policy = HISTORY_POLICIES[policyId];
  if (!policy) throw new Error("不明な歴史政策です");
  useCentralDecision(next, "history_policy", policyId);
  const record = { id: `history-policy-${next.turn}-${next.centralizationCampaign.historyPolicies.length + 1}`, policyId, year: next.year, month: next.month, turn: next.turn };
  next.centralizationCampaign.historyPolicies.push(record);
  const affected = next.administration.privileges;
  if (policyId === "recognize_privileges") {
    next.legitimacy = round(clamp(next.legitimacy + 3), 0);
    affected.forEach((privilege) => { privilege.legitimacy = round(clamp(privilege.legitimacy + 4), 0); privilege.entrenchment = round(clamp(privilege.entrenchment + 2), 0); });
    Object.values(next.cities).forEach((city) => { city.resources.support = round(clamp(city.resources.support + 1.5), 1); });
  }
  if (policyId === "royal_reinterpretation") {
    next.justification = round(clamp(next.justification + 6), 0);
    affected.forEach((privilege) => { privilege.legitimacy = round(clamp(privilege.legitimacy - 6), 0); privilege.entrenchment = round(clamp(privilege.entrenchment - 3), 0); });
    Object.values(next.cities).forEach((city) => { city.resources.support = round(clamp(city.resources.support - 0.8), 1); });
  }
  if (policyId === "local_tradition_compromise") {
    next.legitimacy = round(clamp(next.legitimacy + 2), 0);
    affected.forEach((privilege) => { privilege.entrenchment = round(clamp(privilege.entrenchment - 2), 0); privilege.publicRecognition = round(clamp(privilege.publicRecognition + 4), 0); });
    Object.values(next.cities).forEach((city) => { city.resources.support = round(clamp(city.resources.support + 2), 1); });
  }
  if (policyId === "suppress_records") {
    next.justification = round(clamp(next.justification + 8), 0);
    next.intelNetwork = round(clamp(next.intelNetwork - 5), 0);
    affected.forEach((privilege) => { privilege.legitimacy = round(clamp(privilege.legitimacy - 10), 0); privilege.entrenchment = round(clamp(privilege.entrenchment - 7), 0); });
    Object.keys(next.cities).forEach((regionId) => {
      next.administration.grievances.push({
        id: `grievance-${record.id}-${regionId}`, originEventId: record.id, regionId, targetEntityId: "central_court", affectedGroupId: `${regionId}:local_society`,
        strength: 24, decayRate: 0.15, narrative: "王室が不都合な特許状と地方記録を封印した記憶。", createdYear: next.year, generation: 1,
      });
    });
  }
  recordHistoricalEvent(world, next, {
    id: record.id, type: "history_policy", title: policy.name, summary: `${policy.description} 短期：${policy.shortBenefit}。長期：${policy.longRisk}。`,
    locations: Object.keys(next.cities), causedBy: ["condition-centralization-legitimacy"],
    effects: [`history-policy-effect-${policyId}-${dateId(next)}`],
    bindings: [{ type: "history_policy", id: record.id }, { type: "state", path: "legitimacy" }, { type: "state", path: "justification" }],
    accounts: {
      worldTruth: "現存する記録の扱いを変えることで、特権の法的意味と現在の政治条件が変化した。",
      historicalRecord: policy.description,
      publicBelief: policyId === "suppress_records" ? "消えた記録そのものが、王室への疑念を生んだ。" : "地方では公式説明と家々の記憶が照合されている。",
    },
  });
  return next;
}

function strongestLocalHolder(state, regionReport, system) {
  const holders = system.domains.flatMap((domainId) => {
    const domain = regionReport.domains.find((entry) => entry.id === domainId);
    return domain?.dominantLocalHolder ? [{ ...domain.dominantLocalHolder, domainId }] : [];
  });
  return holders.sort((left, right) => right.practicalShare - left.practicalShare)[0] ?? null;
}

export function chooseLocalPowerResponse(world, state, input) {
  normalizeCentralizationCampaign(world, state);
  const system = NATIONAL_REFORM_SYSTEMS[input.systemId];
  const region = deriveRegionAuthority(world, state, input.regionId);
  const holder = input.entityId
    ? { id: input.entityId, domainId: system.domains[0], practicalShare: 50 }
    : strongestLocalHolder(state, region, system);
  const entity = state.administration.powerEntities[holder?.id] ?? state.administration.powerEntities[`${input.regionId}:landowners`];
  const privileges = state.administration.privileges.filter((privilege) => privilege.regionId === input.regionId && system.domains.includes(privilege.domain));
  const historical = deriveHistoricalRuleEffects(world, state, input.regionId);
  const pressure = state.history.pressures[input.regionId];
  const grievance = region.grievancePressure;
  const method = AUTHORITY_TRANSFER_METHODS[input.methodId] ?? AUTHORITY_TRANSFER_METHODS.absorb;
  const concession = REFORM_CONCESSIONS[input.concessionId] ?? REFORM_CONCESSIONS.none;
  const budget = NATIONAL_REFORM_BUDGETS[input.budgetId] ?? NATIONAL_REFORM_BUDGETS.standard;
  const protectedStake = system.domains.filter((domainId) => entity.protectedAuthorities.includes(domainId)).length * 9;
  const entrenchment = Math.max(0, ...privileges.map((privilege) => privilege.entrenchment ?? 0));
  const resistance = round(clamp(
    18 + protectedStake + entrenchment * 0.28 + entity.localSupport * 0.2 + grievance * 0.22
    + historical.rebellionModifier + budget.backlash + concession.resistance
    + (method.id === "eliminate" ? 18 : method.id === "conciliate" ? -10 : 0),
  ), 0);
  let responseId = "conditional_acceptance";
  if (resistance >= 84 && entity.localSupport >= 58 && (entity.militaryPower >= 45 || entity.type === "farmers")) responseId = "uprising";
  else if (resistance >= 76 && entity.foreignContactPotential >= 40) responseId = "seek_foreign_support";
  else if (resistance >= 70) responseId = "counter_reform_alliance";
  else if (resistance >= 61 && entity.historicalLegitimacy >= 65) responseId = "court_petition";
  else if (resistance >= 55 && system.domains.some((domainId) => ["military_command", "conscription"].includes(domainId))) responseId = "refuse_mobilization";
  else if (resistance >= 51 && system.domains.some((domainId) => ["population_registry", "cadastre", "land_administration"].includes(domainId))) responseId = "hide_records";
  else if (resistance >= 48 && system.domains.some((domainId) => ["tax_rights", "tax_collection", "customs"].includes(domainId))) responseId = "tax_delay";
  else if (resistance >= 45 && ["merchants", "landowners"].includes(entity.type)) responseId = "bribe_officials";
  else if (resistance >= 39) responseId = "reform_delay";
  else if (resistance >= 28) responseId = "compensation_demand";
  const [name, manifestation, pressureId] = LOCAL_RESPONSE_DEFINITIONS[responseId];
  const worldState = {
    protectedStake, entrenchment, localSupport: entity.localSupport, grievance,
    historicalRecordLegitimacy: historical.legalLegitimacy, publicBelief: historical.publicBelief,
    foreignContact: entity.foreignContactPotential,
  };
  return {
    id: `${input.regionId}-${entity.id}-${responseId}-${state.turn}`,
    responseId, name, entityId: entity.id, entityName: entity.name, regionId: input.regionId,
    pressureId, pressure: resistance, manifestation, worldState,
    minimumCompromise: entity.minimumCompromise, courtAlly: entity.courtAlly,
    desiredPostReformStatus: entity.desiredPostReformStatus,
    delayMultiplier: responseId === "conditional_acceptance" ? 1 : clamp(1 - Math.max(0, resistance - 24) / 170, 0.48, 1),
  };
}

function manifestLocalResponse(world, state, reform, response) {
  state.centralizationCampaign.localResponses.unshift(response);
  state.centralizationCampaign.localResponses = state.centralizationCampaign.localResponses.slice(0, 120);
  const pressure = state.history.pressures[response.regionId][response.pressureId];
  pressure.value = round(clamp(Math.max(pressure.value, response.pressure * 0.76)), 0);
  pressure.trend = round(Math.max(pressure.trend, response.pressure * 0.18), 0);
  const city = state.cities[response.regionId];
  if (response.responseId === "tax_delay") city.resources.money = round(Math.max(0, city.resources.money - 2), 1);
  if (response.responseId === "bribe_officials") city.internal.corruption = round(clamp(city.internal.corruption + 2), 1);
  if (response.responseId === "refuse_mobilization") city.military.draftPool = Math.max(0, Math.round(city.military.draftPool * 0.96));
  if (["counter_reform_alliance", "seek_foreign_support", "uprising"].includes(response.responseId)) city.resources.support = round(clamp(city.resources.support - response.pressure * 0.025), 1);
  if (response.responseId === "seek_foreign_support" && state.foreignStates?.valka) state.foreignStates.valka.interventionWeight = round(clamp(state.foreignStates.valka.interventionWeight + 2), 1);
  recordHistoricalEvent(world, state, {
    id: `history-${reform.id}-${response.regionId}-${response.entityId}`, type: "local_power_response",
    title: `${response.entityName}：${response.name}`,
    summary: `${response.manifestation} 圧力 ${response.pressure}。最低妥協条件：${response.minimumCompromise}。`,
    actors: [response.entityId, "central_court"], locations: [response.regionId],
    causedBy: [`world-state-${response.regionId}-${reform.systemId}-${state.turn}`],
    effects: [`local-response-${response.responseId}-${response.regionId}-${state.turn}`],
    bindings: [{ type: "local_response", id: response.id }, { type: "pressure", regionId: response.regionId, pressureId: response.pressureId }],
  });
}

function spendNationalBudget(state, regionIds, amount) {
  const available = regionIds.reduce((sum, regionId) => sum + Math.max(0, state.cities[regionId].resources.money - 4), 0);
  if (available < amount) throw new Error(`改革予算が不足しています（必要 ${amount} / 留保後 ${round(available, 1)}）`);
  let remaining = amount;
  regionIds.forEach((regionId, index) => {
    const city = state.cities[regionId];
    const capacity = Math.max(0, city.resources.money - 4);
    const share = index === regionIds.length - 1 ? remaining : Math.min(capacity, amount / regionIds.length);
    city.resources.money = round(city.resources.money - share, 1);
    remaining = round(remaining - share, 1);
  });
  if (remaining > 0) {
    regionIds.forEach((regionId) => {
      if (remaining <= 0) return;
      const city = state.cities[regionId];
      const extra = Math.min(remaining, Math.max(0, city.resources.money - 4));
      city.resources.money = round(city.resources.money - extra, 1);
      remaining = round(remaining - extra, 1);
    });
  }
}

export function startNationalReform(world, state, input) {
  const next = structuredClone(state);
  normalizeCentralizationCampaign(world, next);
  if (next.phase !== "planning") throw new Error("事件対応中は国家級改革を開始できません");
  const system = NATIONAL_REFORM_SYSTEMS[input.systemId];
  const method = AUTHORITY_TRANSFER_METHODS[input.methodId];
  const budget = NATIONAL_REFORM_BUDGETS[input.budgetId];
  const concession = REFORM_CONCESSIONS[input.concessionId];
  const regionIds = [...new Set(input.regionIds ?? [])].filter((regionId) => next.cities[regionId]);
  const officer = next.officers[input.officerId];
  if (!system || !method || !budget || !concession) throw new Error("国家級改革の条件が不明です");
  if (!regionIds.length) throw new Error("改革対象地域を1つ以上選んでください");
  if (!officer || officer.allegiance !== "serving") throw new Error("改革を担当できる人物を選んでください");
  if (next.centralizationCampaign.reforms.some((reform) => reform.systemId === system.id && reform.status === "active")) throw new Error("この改革系統はすでに進行中です");
  const historical = deriveHistoricalRuleEffects(world, next);
  if (method.id === "eliminate" && !historical.privilegeRevocationAllowed) throw new Error("現行の歴史記録では特権排除を正当化できません。歴史政策または正当化を整えてください");
  useCentralDecision(next, "national_reform", system.id);
  spendNationalBudget(next, regionIds, budget.cost);
  const id = `national-reform-${next.turn}-${system.id}-${next.centralizationCampaign.reforms.length + 1}`;
  const reform = {
    id, systemId: system.id, methodId: method.id, budgetId: budget.id, officerId: input.officerId, concessionId: concession.id,
    regionIds, startedYear: next.year, startedMonth: next.month, startedTurn: next.turn,
    status: "active", maintenanceCost: round(regionIds.length * 0.35 + system.domains.length * 0.08, 1),
    cells: [], reactions: [], transferResults: [],
  };
  regionIds.forEach((regionId) => {
    const region = deriveRegionAuthority(world, next, regionId);
    system.domains.forEach((domainId) => {
      const domain = region.domains.find((entry) => entry.id === domainId);
      if ((domain?.practicalShare ?? 100) >= 99 && (domain?.legalShare ?? 100) >= 99) return;
      reform.cells.push({ regionId, domainId, stageIndex: 0, progress: 0, status: "active", readinessAtStart: domain?.reformReadiness ?? 40 });
    });
    const response = chooseLocalPowerResponse(world, next, { ...input, regionId });
    reform.reactions.push(response);
    manifestLocalResponse(world, next, reform, response);
  });
  if (!reform.cells.length) throw new Error("選択地域の対象権限はすでに中央へ統一されています");
  next.centralizationCampaign.reforms.push(reform);
  recordHistoricalEvent(world, next, {
    id: `history-${id}-started`, type: "national_reform", title: `${system.name}を国家級改革として開始`,
    summary: `${regionIds.length}地域・${reform.cells.length}権限を、${method.name}・${budget.name}・${concession.name}で段階移管する。`,
    actors: ["central_court", input.officerId], locations: regionIds,
    causedBy: ["condition-centralization-campaign"], effects: [`national-reform-active-${id}`],
    bindings: [{ type: "national_reform", id }],
  });
  return next;
}

function localAuthorityRecords(state, cell) {
  const records = state.administration.authorities.filter((authority) => authority.regionId === cell.regionId && authority.domain === cell.domainId);
  return {
    central: records.find((authority) => authority.holderEntityId === "central_court"),
    local: records.filter((authority) => authority.holderEntityId !== "central_court").sort((left, right) => right.practicalShare - left.practicalShare)[0],
  };
}

function transferNationalReformCell(world, state, reform, cell) {
  if (cell.transferApplied) return;
  const { central, local } = localAuthorityRecords(state, cell);
  if (!central || !local) { cell.transferApplied = true; return; }
  const method = AUTHORITY_TRANSFER_METHODS[reform.methodId];
  const budget = NATIONAL_REFORM_BUDGETS[reform.budgetId];
  const concession = REFORM_CONCESSIONS[reform.concessionId];
  const region = deriveRegionAuthority(world, state, cell.regionId);
  const domain = region.domains.find((entry) => entry.id === cell.domainId);
  const historical = deriveHistoricalRuleEffects(world, state, cell.regionId);
  const readiness = clamp(domain?.reformReadiness ?? cell.readinessAtStart, 20, 100) / 100;
  const methodLegal = { eliminate: 25, absorb: 20, conciliate: 16 }[method.id];
  const methodPractical = { eliminate: 15, absorb: 20, conciliate: 14 }[method.id];
  const legalGain = Math.min(local.legalShare, methodLegal * budget.speed * clamp(historical.legalLegitimacy / 70, 0.65, 1.25));
  const practicalGain = Math.min(local.practicalShare, methodPractical * budget.speed * readiness * concession.speed);
  central.legalShare = round(clamp(central.legalShare + legalGain), 1);
  local.legalShare = round(clamp(local.legalShare - legalGain), 1);
  central.practicalShare = round(clamp(central.practicalShare + practicalGain), 1);
  local.practicalShare = round(clamp(local.practicalShare - practicalGain), 1);
  const entity = state.administration.powerEntities[local.holderEntityId];
  if (entity && method.id === "absorb") {
    entity.internalized = true;
    entity.centralDependence = round(clamp(entity.centralDependence + 18), 1);
    entity.bureaucraticAutonomy = round(clamp((entity.bureaucraticAutonomy ?? 0) + 5 + practicalGain * 0.22), 1);
  }
  if (entity && method.id === "conciliate") entity.centralDependence = round(clamp(entity.centralDependence + 11), 1);
  if (entity && method.id === "eliminate") entity.localSupport = round(clamp(entity.localSupport - 8), 1);
  cell.transferApplied = true;
  cell.transferResult = { legalGain: round(legalGain, 1), practicalGain: round(practicalGain, 1), formerHolderEntityId: local.holderEntityId };
  reform.transferResults.push({ regionId: cell.regionId, domainId: cell.domainId, ...cell.transferResult });
}

function applyNationalBacklash(state, reform, cell) {
  if (cell.backlashApplied) return;
  const response = reform.reactions.find((entry) => entry.regionId === cell.regionId);
  const method = AUTHORITY_TRANSFER_METHODS[reform.methodId];
  const concession = REFORM_CONCESSIONS[reform.concessionId];
  const strength = round(clamp((response?.pressure ?? 35) * 0.58 + method.backlash * 0.72 + concession.resistance * 0.45), 0);
  const grievanceId = `grievance-${reform.id}-${cell.regionId}-${cell.domainId}`;
  if (!state.administration.grievances.some((grievance) => grievance.id === grievanceId)) {
    state.administration.grievances.push({
      id: grievanceId, originEventId: reform.id, regionId: cell.regionId, targetEntityId: "central_court",
      affectedGroupId: cell.transferResult?.formerHolderEntityId ?? response?.entityId,
      strength, decayRate: reform.concessionId === "local_offices" ? 0.72 : reform.methodId === "conciliate" ? 0.6 : 0.22,
      narrative: `${NATIONAL_REFORM_SYSTEMS[reform.systemId].name}を${method.name}で進めた記憶。`, createdYear: state.year, generation: 1,
    });
  }
  const city = state.cities[cell.regionId];
  city.resources.support = round(clamp(city.resources.support - strength * 0.018), 1);
  cell.backlashApplied = true;
}

export function resolveNationalReforms(world, state) {
  normalizeCentralizationCampaign(world, state);
  const actions = [];
  const portfolio = deriveNationalReformPortfolio(world, state);
  state.centralizationCampaign.reforms.filter((reform) => reform.status === "active").forEach((reform) => {
    const system = NATIONAL_REFORM_SYSTEMS[reform.systemId];
    const method = AUTHORITY_TRANSFER_METHODS[reform.methodId];
    const budget = NATIONAL_REFORM_BUDGETS[reform.budgetId];
    const concession = REFORM_CONCESSIONS[reform.concessionId];
    const officer = state.officers[reform.officerId];
    const officerFactor = clamp(0.72 + (officer?.rankLevel ?? 1) * 0.06 + (officer?.loyalty ?? 50) / 500 + (officer?.stamina ?? 50) / 700, 0.7, 1.28);
    const maintenanceCities = reform.regionIds.map((regionId) => state.cities[regionId]);
    const maintenanceAvailable = maintenanceCities.reduce((sum, city) => sum + Math.max(0, city.resources.money - 2), 0);
    const maintenanceFactor = maintenanceAvailable >= reform.maintenanceCost ? 1 : 0.62;
    if (maintenanceAvailable >= reform.maintenanceCost) {
      let remaining = reform.maintenanceCost;
      maintenanceCities.forEach((city) => {
        const spending = Math.min(remaining, Math.max(0, city.resources.money - 2), reform.maintenanceCost / maintenanceCities.length);
        city.resources.money = round(city.resources.money - spending, 1);
        remaining = round(remaining - spending, 1);
      });
    }
    reform.cells.filter((cell) => cell.status === "active").forEach((cell) => {
      const region = deriveRegionAuthority(world, state, cell.regionId);
      const domain = region.domains.find((entry) => entry.id === cell.domainId);
      const response = reform.reactions.find((entry) => entry.regionId === cell.regionId);
      const transport = clamp(1.18 - region.communicationDays / 90, 0.55, 1.1);
      const readiness = clamp((domain?.reformReadiness ?? 45) / 72, 0.52, 1.35);
      const gain = clamp(18 * method.speed * budget.speed * concession.speed * officerFactor * maintenanceFactor * transport * readiness * (response?.delayMultiplier ?? 1), 7, 46);
      cell.progress = round(cell.progress + gain, 1);
      if (cell.progress < 100) return;
      const stage = AUTHORITY_REFORM_STAGES[cell.stageIndex];
      if (stage.id === "visibility") {
        state.administration.capabilityInvestment.information = round(state.administration.capabilityInvestment.information + 0.25, 2);
        state.cities[cell.regionId].administration.registerCoverage = round(clamp(state.cities[cell.regionId].administration.registerCoverage + 0.5), 1);
      }
      if (stage.id === "standardization") state.administration.capabilityInvestment.standardization = round(state.administration.capabilityInvestment.standardization + 0.22, 2);
      if (stage.id === "institution") state.administration.capabilityInvestment.administration = round(state.administration.capabilityInvestment.administration + 0.24, 2);
      if (stage.id === "transfer") transferNationalReformCell(world, state, reform, cell);
      if (stage.id === "backlash") applyNationalBacklash(state, reform, cell);
      cell.progress = round(cell.progress - 100, 1);
      if (stage.id === "consolidation") {
        cell.status = "completed";
        cell.progress = 100;
      } else {
        cell.stageIndex += 1;
      }
      actions.push({
        id: `${reform.id}-${cell.regionId}-${cell.domainId}-${stage.id}-${state.turn}`,
        kind: "national_reform", cityId: cell.regionId, title: `${system.name}：${AUTHORITY_DOMAINS[cell.domainId].name}・${stage.name}`,
        status: cell.status === "completed" ? "completed" : "progress", detail: stage.description,
        spendingCategory: "research_development", cost: { money: 0 }, governanceCost: 0,
      });
    });
    if (reform.cells.every((cell) => cell.status === "completed")) {
      reform.status = "completed";
      reform.completedTurn = state.turn;
      reform.completedYear = state.year;
      reform.completedMonth = state.month;
      recordHistoricalEvent(world, state, {
        id: `history-${reform.id}-completed`, type: "national_reform", title: `${system.name}の一巡を完了`,
        summary: `${reform.regionIds.length}地域の対象権限を、可視化から定着まで処理した。`,
        locations: reform.regionIds, causedBy: [`history-${reform.id}-started`], effects: [`national-reform-completed-${reform.id}`],
        bindings: [{ type: "national_reform", id: reform.id }],
      });
    }
  });
  const updatedPortfolio = deriveNationalReformPortfolio(world, state);
  state.centralizationCampaign.lastPortfolio = Object.fromEntries(updatedPortfolio.systems.map((system) => [system.id, system.control]));
  return actions;
}

function stageRequirements(state, result, portfolio) {
  const byId = Object.fromEntries(portfolio.systems.map((system) => [system.id, system]));
  return [
    [],
    [
      { id: "ash_crown_chapter", label: "灰冠峠第一章を完了", met: Boolean(state.campaign?.ending) },
      { id: "initial_visibility", label: "人口・土地把握が全国監査へ届く", met: byId.population_land_knowledge.control >= 34 || byId.population_land_knowledge.completedWaves >= 1 },
    ],
    [
      { id: "fiscal_standard", label: "財政統一の基盤を形成", met: byId.fiscal_unification.control >= 58 },
      { id: "bureaucratic_standard", label: "官僚・規格統一を主要地域へ浸透", met: byId.bureaucratic_standardization.control >= 52 },
      { id: "uniformity", label: "制度統一度60以上", met: result.uniformity >= 60 },
    ],
    [
      { id: "administration", label: "行政能力68以上", met: result.capabilities.administration >= 68 },
      { id: "bureaucracy", label: "官僚・規格統一65以上", met: byId.bureaucratic_standardization.control >= 65 },
      { id: "not_overloaded", label: "行政負荷率105以下", met: result.capacity.utilization <= 105 },
    ],
    [
      { id: "military", label: "軍事統一75以上", met: result.militaryControl >= 75 && byId.military_unification.control >= 68 },
      { id: "justice", label: "法・治安統一75以上", met: result.justiceControl >= 75 && byId.law_security_unification.control >= 68 },
    ],
    result.requirements.map((requirement) => ({ ...requirement })),
    [{ id: "crisis_duration", label: "集権後危機を12か月統治", met: (state.centralizationCampaign.crisis?.months ?? 0) >= 12 }],
  ];
}

function crisisIssues(state, result) {
  const internalized = Object.values(state.administration.powerEntities).filter((entity) => entity.internalized);
  const methods = state.centralizationCampaign.reforms.flatMap((reform) => reform.transferResults.map(() => reform.methodId));
  const count = (methodId) => methods.filter((method) => method === methodId).length;
  const suppression = state.centralizationCampaign.historyPolicies.filter((entry) => entry.policyId === "suppress_records").length;
  const averageSupport = mean(Object.values(state.cities).map((city) => city.resources.support));
  const militaryEntities = internalized.filter((entity) => entity.type === "military");
  return [
    { id: "bureaucratic_faction", name: "官僚派閥", severity: round(clamp(result.internalAutonomy * 2 + internalized.length * 4), 0), basis: "吸収した旧勢力と中央機関の自律" },
    { id: "military", name: "軍部", severity: round(clamp(result.internalAutonomy + militaryEntities.length * 18 + Math.max(0, 70 - state.legitimacy)), 0), basis: "統一軍令と軍人団の中央内部化" },
    { id: "fiscal", name: "財政負担", severity: round(clamp(result.capacity.utilization - 55 + (state.fiscal?.publicDebt ?? 0) * 0.7), 0), basis: "全国制度の維持費と公債" },
    { id: "information", name: "情報歪曲", severity: round(clamp((100 - result.capabilities.information) * 0.8 + suppression * 24), 0), basis: "報告階層と記録隠蔽" },
    { id: "local_knowledge", name: "地方知識喪失", severity: round(clamp(count("eliminate") * 3.2 + (100 - averageSupport) * 0.42), 0), basis: "排除した実務者と現地支持の喪失" },
    { id: "succession", name: "継承問題", severity: round(clamp(82 - state.legitimacy + Math.max(0, 65 - mean(Object.values(state.officers).filter((officer) => officer.allegiance === "serving").map((officer) => officer.loyalty)))), 0), basis: "王権個人と統一機構の関係" },
  ];
}

function endingForCentralization(state, result) {
  const reforms = state.centralizationCampaign.reforms;
  const methodCounts = Object.fromEntries(Object.keys(AUTHORITY_TRANSFER_METHODS).map((methodId) => [methodId, reforms.reduce((sum, reform) => sum + (reform.methodId === methodId ? reform.transferResults.length : 0), 0)]));
  const dominant = Object.entries(methodCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "absorb";
  const issues = crisisIssues(state, result);
  const maximum = Math.max(...issues.map((issue) => issue.severity));
  if (maximum >= 82) return { id: "brittle_leviathan", name: "脆いリヴァイアサン", description: "国家は完全に統一されたが、巨大化した中央機構が王権と社会を圧迫する国家となった。", powerStructure: "危機管理官庁と軍部が王冠を拘束" };
  if (dominant === "conciliate") return { id: "covenanted_unitary_state", name: "盟約的単一国家", description: "特権を地位と補償へ交換し、地方代表を内包する完全集権国家となった。", powerStructure: "王冠・地方代表院・全国官庁" };
  if (dominant === "eliminate") return { id: "iron_unitary_state", name: "鉄の単一国家", description: "旧権力を排除し、王命・常備軍・統一法が隅々まで届く完全集権国家となった。", powerStructure: "王冠・軍部・監察官庁" };
  if (dominant === "absorb") return { id: "service_bureaucratic_state", name: "奉仕官僚国家", description: "旧勢力の実務を官僚制へ吸収し、多層的だが一元的な完全集権国家となった。", powerStructure: "王冠・専門官庁・内部化された旧勢力" };
  return { id: "balanced_unitary_state", name: "均衡単一国家", description: "懐柔・吸収・排除を地域ごとに使い分けた完全集権国家となった。", powerStructure: "王冠を中心とする混成国家機構" };
}

function enterStage(world, state, index) {
  const campaign = state.centralizationCampaign;
  const stage = CENTRALIZATION_STAGES[index];
  campaign.stageId = stage.id;
  campaign.highestStageIndex = Math.max(campaign.highestStageIndex, index);
  campaign.stageEnteredTurn = state.turn;
  campaign.stageHistory.push({ stageId: stage.id, turn: state.turn, year: state.year, month: state.month });
  if (stage.id === "fully_centralized_state") campaign.fullCentralizationTurn = state.turn;
  if (stage.id === "post_centralization_crisis") {
    campaign.crisis = { startedTurn: state.turn, months: 0, issues: [], history: [] };
  }
  recordHistoricalEvent(world, state, {
    id: `centralization-stage-${stage.id}-${state.turn}`, type: "centralization_stage", title: `${stage.name}へ移行`,
    summary: `${stage.unlock} 維持：${stage.upkeep}。`, locations: Object.keys(state.cities),
    causedBy: index === 0 ? ["prehistory-kingdom-foundation"] : [`centralization-stage-${CENTRALIZATION_STAGES[index - 1].id}`],
    effects: [`centralization-stage-active-${stage.id}`], bindings: [{ type: "centralization_stage", id: stage.id }],
  });
}

function applyStageUpkeep(state, stage) {
  if (!stage.upkeepCost) return;
  const capital = state.cities.selene ?? Object.values(state.cities)[0];
  if (capital.resources.money >= stage.upkeepCost) {
    capital.resources.money = round(capital.resources.money - stage.upkeepCost, 1);
    return;
  }
  state.legitimacy = round(clamp(state.legitimacy - 0.6), 1);
  Object.values(state.cities).forEach((city) => { city.resources.support = round(clamp(city.resources.support - 0.35), 1); });
  state.centralizationCampaign.failures.push({ turn: state.turn, stageId: stage.id, reason: "維持費不足", recovery: stage.recovery });
  state.centralizationCampaign.failures = state.centralizationCampaign.failures.slice(-24);
}

function advancePostCrisis(state, result) {
  const crisis = state.centralizationCampaign.crisis;
  crisis.months += 1;
  crisis.issues = crisisIssues(state, result);
  const maximum = Math.max(...crisis.issues.map((issue) => issue.severity));
  const total = mean(crisis.issues.map((issue) => issue.severity));
  if (maximum >= 70) {
    state.legitimacy = round(clamp(state.legitimacy - 0.35), 1);
    Object.values(state.cities).forEach((city) => { city.resources.support = round(clamp(city.resources.support - total * 0.0025), 1); });
  } else {
    state.legitimacy = round(clamp(state.legitimacy + 0.12), 1);
  }
  crisis.history.push({ turn: state.turn, month: crisis.months, maximum, issues: crisis.issues.map((issue) => ({ id: issue.id, severity: issue.severity })) });
  crisis.history = crisis.history.slice(-12);
}

export function advanceCentralizationCampaign(world, state) {
  normalizeCentralizationCampaign(world, state);
  const actions = [];
  applyStageUpkeep(state, CENTRALIZATION_STAGES.find((stage) => stage.id === state.centralizationCampaign.stageId));
  let result = deriveCentralizationResult(world, state);
  let portfolio = deriveNationalReformPortfolio(world, state);
  let index = CENTRALIZATION_STAGES.findIndex((stage) => stage.id === state.centralizationCampaign.stageId);
  const requirements = stageRequirements(state, result, portfolio);
  if (index < 5 && requirements[index + 1].every((requirement) => requirement.met)) {
    enterStage(world, state, index + 1);
    index += 1;
    actions.push({ id: `centralization-stage-${state.turn}`, kind: "centralization_stage", cityId: world.nation.capital, title: `${CENTRALIZATION_STAGES[index].name}へ進展`, status: "completed", detail: CENTRALIZATION_STAGES[index].unlock, cost: { money: 0 }, governanceCost: 0 });
  } else if (index === 5 && state.centralizationCampaign.fullCentralizationTurn !== null && state.turn > state.centralizationCampaign.fullCentralizationTurn) {
    enterStage(world, state, 6);
    index = 6;
    actions.push({ id: `post-centralization-crisis-${state.turn}`, kind: "centralization_crisis", cityId: world.nation.capital, title: "集権後危機が始まった", status: "crisis", detail: "完全集権化を生んだ官僚・軍・財政・情報機構を12か月統治する。", cost: { money: 0 }, governanceCost: 0 });
  }
  if (index === 6 && !state.centralizationCampaign.ending) {
    result = deriveCentralizationResult(world, state);
    advancePostCrisis(state, result);
    if (state.centralizationCampaign.crisis.months >= 12) {
      state.centralizationCampaign.ending = endingForCentralization(state, result);
      state.centralizationCampaign.completedTurn = state.turn;
      recordHistoricalEvent(world, state, {
        id: `centralization-ending-${state.centralizationCampaign.ending.id}`, type: "centralization_ending",
        title: state.centralizationCampaign.ending.name, summary: state.centralizationCampaign.ending.description,
        locations: Object.keys(state.cities), causedBy: [`centralization-stage-post_centralization_crisis-${state.centralizationCampaign.crisis.startedTurn}`],
        effects: [`centralization-ending-active-${state.centralizationCampaign.ending.id}`], bindings: [{ type: "centralization_ending", id: state.centralizationCampaign.ending.id }],
      });
    }
  }
  state.centralizationCampaign.decisionsThisMonth = [];
  return actions;
}

export function deriveCentralizationCampaignStatus(world, state) {
  normalizeCentralizationCampaign(world, state);
  const result = deriveCentralizationResult(world, state);
  const portfolio = deriveNationalReformPortfolio(world, state);
  const currentIndex = CENTRALIZATION_STAGES.findIndex((stage) => stage.id === state.centralizationCampaign.stageId);
  const requirements = stageRequirements(state, result, portfolio);
  const nextIndex = Math.min(CENTRALIZATION_STAGES.length - 1, currentIndex + 1);
  const nextRequirements = requirements[nextIndex] ?? [];
  const unmet = nextRequirements.filter((requirement) => !requirement.met);
  const resultUnmet = result.requirements.filter((requirement) => !requirement.met);
  const largestBarrier = state.centralizationCampaign.ending
    ? { id: "complete", label: state.centralizationCampaign.ending.powerStructure, met: true }
    : currentIndex === 6
      ? { id: "crisis", label: `集権後危機をあと${Math.max(0, 12 - (state.centralizationCampaign.crisis?.months ?? 0))}か月統治`, met: false }
      : unmet[0] ?? resultUnmet[0] ?? { id: "consolidate", label: "次の月次で制度を定着", met: false };
  const stageRows = CENTRALIZATION_STAGES.map((stage, index) => ({
    ...stage, status: index < currentIndex ? "completed" : index === currentIndex ? "current" : "locked",
    requirements: requirements[index] ?? [],
  }));
  return {
    currentStage: CENTRALIZATION_STAGES[currentIndex], nextStage: currentIndex < 6 ? CENTRALIZATION_STAGES[nextIndex] : null,
    currentIndex, stages: stageRows, requirements: nextRequirements, largestBarrier,
    result, portfolio, chapter: { title: "第一章・灰冠峠", complete: Boolean(state.campaign?.ending), ending: state.campaign?.ending ?? null },
    crisis: state.centralizationCampaign.crisis, ending: state.centralizationCampaign.ending,
    decisionsRemaining: Math.max(0, 3 - state.centralizationCampaign.decisionsThisMonth.length),
    nationFormation: state.nationFormation,
  };
}

function leviathanPhase(cycleMonth) {
  if (cycleMonth < 220) return { id: "distant", name: "遠洋回遊", proximity: 8, zone: "外洋深層回廊" };
  if (cycleMonth < 270) return { id: "signs", name: "接近兆候", proximity: 42, zone: "黒潮外縁" };
  if (cycleMonth < 300) return { id: "approach", name: "沿岸接近", proximity: 76, zone: "ネレイア沖航路" };
  if (cycleMonth < 324) return { id: "passage", name: "沿岸通過", proximity: 100, zone: "銀脈河口・沿岸帯" };
  return { id: "receding", name: "離岸", proximity: 32, zone: "南方回遊路" };
}

export function deriveLeviathanStatus(world, state) {
  normalizeCentralizationCampaign(world, state);
  const phase = leviathanPhase(state.leviathan.cycleMonth);
  const portfolio = deriveNationalReformPortfolio(world, state);
  const standards = portfolio.systems.find((system) => system.id === "bureaucratic_standardization").control;
  const policyBonus = state.leviathan.policyId === "national_warning" ? 18 : state.leviathan.policyId === "international_cooperation" ? 11 : 4;
  const accuracy = round(clamp(22 + state.intelNetwork * 0.42 + standards * 0.22 + state.leviathan.observatories * 9 + policyBonus), 0);
  const uncertainty = Math.round((100 - accuracy) * 1.2);
  return {
    ...phase,
    cycleMonth: state.leviathan.cycleMonth,
    cycleLengthMonths: state.leviathan.cycleLengthMonths,
    estimatedPosition: `${phase.zone}（誤差 ${uncertainty}海里）`,
    informationAccuracy: accuracy,
    signs: phase.id === "distant" ? ["深海水温の周期変動"] : ["沖合の長周期波", "魚群の一斉離岸", "低周波振動"],
    routesClosed: ["approach", "passage"].includes(phase.id),
    evacuationRequired: phase.id === "passage",
    policy: LEVIATHAN_POLICIES[state.leviathan.policyId],
    observatories: state.leviathan.observatories,
    warningNetwork: state.leviathan.warningNetwork,
    emergencyPowersPermanent: state.leviathan.emergencyPowersPermanent,
  };
}

export function setLeviathanPolicy(world, state, policyId) {
  const next = structuredClone(state);
  normalizeCentralizationCampaign(world, next);
  const policy = LEVIATHAN_POLICIES[policyId];
  if (!policy) throw new Error("不明なリヴァイアサン対策です");
  useCentralDecision(next, "leviathan_policy", policyId);
  next.leviathan.policyId = policyId;
  if (policyId === "national_warning") {
    next.leviathan.warningNetwork = true;
    next.leviathan.observatories = Math.max(1, next.leviathan.observatories);
    next.administration.capabilityInvestment.standardization = round(next.administration.capabilityInvestment.standardization + 1.2, 1);
  }
  if (policyId === "royal_emergency") next.leviathan.emergencyPowersPermanent = true;
  if (policyId === "international_cooperation") {
    Object.values(next.foreignStates ?? {}).forEach((country) => { country.relation = round(clamp(country.relation + 1, -100, 100), 1); });
  }
  next.leviathan.history.unshift({ id: `leviathan-policy-${next.turn}`, type: "policy", policyId, year: next.year, month: next.month });
  return next;
}

function centralAuthority(state, regionId, domainId) {
  return state.administration.authorities.find((authority) => authority.regionId === regionId && authority.domain === domainId && authority.holderEntityId === "central_court");
}

export function advanceLeviathanCycle(world, state) {
  normalizeCentralizationCampaign(world, state);
  const previous = deriveLeviathanStatus(world, state);
  state.leviathan.cycleMonth = (state.leviathan.cycleMonth + 1) % state.leviathan.cycleLengthMonths;
  const status = deriveLeviathanStatus(world, state);
  const actions = [];
  const coastal = state.cities.nereia ?? Object.values(state.cities)[0];
  const cycle = Math.floor(((state.turn ?? 0) + 252) / state.leviathan.cycleLengthMonths);
  if (status.id === "signs" && status.informationAccuracy < 55 && state.leviathan.cycleMonth % 6 === 0) {
    coastal.resources.commerce = round(clamp(coastal.resources.commerce - 0.8), 1);
    coastal.resources.money = round(Math.max(0, coastal.resources.money - 1.5), 1);
    actions.push({ id: `leviathan-false-alarm-${state.turn}`, kind: "leviathan", cityId: "nereia", title: "誤報で交易が停滞", status: "crisis", detail: "低精度の警報で航路を閉じ、交易損失が発生した。", cost: { money: 1.5 }, governanceCost: 0 });
  }
  if (status.routesClosed) {
    const mitigation = state.leviathan.policyId === "international_cooperation" ? 0.45 : state.leviathan.policyId === "national_warning" ? 0.62 : 1;
    coastal.resources.commerce = round(clamp(coastal.resources.commerce - 0.45 * mitigation), 1);
    coastal.resources.money = round(Math.max(0, coastal.resources.money - 0.8 * mitigation), 1);
    const diplomaticShift = state.leviathan.policyId === "international_cooperation" ? 0.2 : -0.1;
    Object.values(state.foreignStates ?? {}).forEach((country) => {
      country.relation = round(clamp(country.relation + diplomaticShift, -100, 100), 1);
    });
  }
  if (status.id === "passage" && state.leviathan.lastDamageCycle !== cycle) {
    const mitigation = state.leviathan.policyId === "local_councils" ? 0.62 : state.leviathan.policyId === "national_warning" ? 0.48 : state.leviathan.policyId === "international_cooperation" ? 0.58 : 0.74;
    coastal.resources.money = round(Math.max(0, coastal.resources.money - 8 * mitigation), 1);
    coastal.resources.security = round(clamp(coastal.resources.security - 7 * mitigation), 1);
    coastal.resources.support = round(clamp(coastal.resources.support - 5 * mitigation), 1);
    state.leviathan.lastDamageCycle = cycle;
    if (state.leviathan.policyId === "royal_emergency") {
      ["customs", "military_command"].forEach((domainId) => {
        const authority = centralAuthority(state, "nereia", domainId);
        if (authority) authority.practicalShare = round(clamp(authority.practicalShare + 1.5), 1);
      });
    }
    actions.push({ id: `leviathan-coastal-damage-${state.turn}`, kind: "leviathan", cityId: "nereia", title: "リヴァイアサン沿岸通過", status: "crisis", detail: "港湾避難、航路閉鎖、沿岸被害が同時に発生した。討伐・誘導は行わない。", cost: { money: round(8 * mitigation, 1) }, governanceCost: 0 });
    recordHistoricalEvent(world, state, {
      id: `history-leviathan-passage-${state.turn}`, type: "leviathan_disaster", title: "リヴァイアサン沿岸通過",
      summary: `${status.estimatedPosition}。${LEVIATHAN_POLICIES[state.leviathan.policyId].name}で避難と閉港を実施した。`,
      locations: ["nereia"], causedBy: ["condition-leviathan-migration"], effects: [`coastal-administration-impact-${state.turn}`],
      bindings: [{ type: "leviathan", cycleMonth: state.leviathan.cycleMonth }, { type: "city", cityId: "nereia", path: "resources" }],
    });
  }
  if (previous.id === "passage" && status.id === "receding" && state.leviathan.emergencyPowersPermanent) {
    state.administration.grievances.push({
      id: `grievance-leviathan-emergency-${state.turn}`, originEventId: `history-leviathan-passage-${state.turn - 1}`, regionId: "nereia",
      targetEntityId: "central_court", affectedGroupId: "nereia:merchants", strength: 38, decayRate: 0.28,
      narrative: "災害時の港湾非常権限が離岸後も恒久化された記憶。", createdYear: state.year, generation: 1,
    });
    state.legitimacy = round(clamp(state.legitimacy - 2), 1);
  }
  state.leviathan.history.unshift({ id: `leviathan-${state.turn}`, type: "monthly", phaseId: status.id, accuracy: status.informationAccuracy, year: state.year, month: state.month });
  state.leviathan.history = state.leviathan.history.slice(0, 60);
  return actions;
}

export function getCentralizationPrimaryDecisions(world, state) {
  const status = deriveCentralizationCampaignStatus(world, state);
  const decisions = [];
  if (!status.chapter.complete) decisions.push({ id: "ash_crown", title: "第一章・灰冠峠を収束", detail: "通行権・道路規格・敵情報を解決し、中央制度の共同利益を示す。", action: "open_diplomacy" });
  const reform = [...status.portfolio.systems].sort((left, right) => left.control - right.control)[0];
  if (reform) decisions.push({ id: `reform-${reform.id}`, title: `${reform.name}を進める`, detail: `利益：${reform.benefit} 予想反動 ${reform.backlash}。`, action: "open_centralization" });
  const leviathan = deriveLeviathanStatus(world, state);
  if (["signs", "approach", "passage"].includes(leviathan.id)) decisions.push({ id: "leviathan", title: `リヴァイアサン：${leviathan.name}`, detail: `${leviathan.estimatedPosition}。沿岸行政と外交方針を決める。`, action: "open_centralization" });
  if (status.crisis) decisions.unshift({ id: "post_crisis", title: `集権後危機 ${status.crisis.months}/12か月`, detail: [...status.crisis.issues].sort((left, right) => right.severity - left.severity)[0]?.name ?? "危機項目を監察する", action: "open_centralization" });
  if (decisions.length < 3 && !latestHistoryPolicy(state)) decisions.push({ id: "history_policy", title: "歴史記録の扱いを定める", detail: "公式記録と地方伝承を、改革の法的正当性へ接続する。", action: "open_centralization" });
  return decisions.slice(0, 3);
}
