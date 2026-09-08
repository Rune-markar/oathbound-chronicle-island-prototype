import { createActionResult } from "./action-result.js";
import { getGameCalendar, normalizeStateGameClock } from "./game-clock.js";
import { getV3DetailedTile } from "./v3-field-system.js";
import { getV3CurrentMarket } from "./v3-merchant-system.js";
import { getV3WorldSimulationView } from "./v3-world-simulation.js";
import { appointRegionalLord, declareRegionIndependence, transferRegionControl, getRegionalDomainView } from "./regional-domain-system.js";
import { resolveGeneratedWorldWarCeasefire } from "./generated-world-war-system.js";
import { applyV3MarketInventoryFlows } from "./v3-market-economy.js";
import { createStateReason } from "./state-reason-system.js";

export const V3_CAMPAIGN_VERSION = 1;
const DAY = 24 * 60;
const MONTH = 30 * DAY;
const clone = (value) => structuredClone(value);
const clamp = (value, low = 0, high = 100) => Math.min(high, Math.max(low, Number(value) || 0));
const round = (value) => Number(Number(value).toFixed(1));
const integer = (value, maximum = 999999) => Math.floor(clamp(value, 0, maximum));
const array = (value) => Array.isArray(value) ? value : [];
const periodFor = (state) => { const date = getGameCalendar(normalizeStateGameClock(state).clock); return `${date.year}-${date.month}`; };
const monthFor = (state) => getGameCalendar(normalizeStateGameClock(state).clock).absoluteMonthIndex;
const requirement = (label, current, target) => ({ label, current, target, met: current >= target });
const STAGES = { wanderer: "旅人", commissioned: "地方の受託者", governor: "地方統治", sovereign: "国家運営", ending: "その後の世界" };

// Institutional history records distinct adopted decisions; clicking a policy again never manufactures history.
const INSTITUTIONS = Object.freeze([
  { id: "regional-council", label: "地方議会の議決権", domain: "government", path: "federation", description: "統治を住民代表と分担する。自治と信頼が増え、徴税収入は少し減る。" },
  { id: "local-budget", label: "地域予算の裁量", domain: "economy", path: "federation", description: "地域に予算を留保する。自治と生活基盤を支え、中央の収入を抑える。" },
  { id: "cultural-rights", label: "言語と慣習の保障", domain: "culture", path: "federation", description: "異なる種族・地域の言語と慣習を保障し、出身の違いによる交渉負担を減らす。" },
  { id: "mutual-defense", label: "共同防衛の協議制", domain: "security", path: "federation", description: "防衛義務を合議で決める。自治を保ちつつ防備を整える。" },
  { id: "open-trade", label: "相互通商の保障", domain: "economy", path: "federation", description: "関税障壁を緩め、他国と流通利益を共有する。" },
  { id: "watershed-pact", label: "水源と生息地の共同管理", domain: "culture", path: "federation", description: "上流・下流の生活環境を共同管理し、環境保全を制度にする。" },
  { id: "central-tax", label: "中央会計と統一徴税", domain: "economy", path: "empire", description: "徴税を中央で管理する。収入が増える一方、地方の自治が減る。" },
  { id: "common-law", label: "統一法と官吏任命", domain: "government", path: "empire", description: "行政と法を統一する。統率が増し、地方の裁量が減る。" },
  { id: "national-army", label: "常備軍の統合指揮", domain: "security", path: "empire", description: "常備軍を中央の指揮に統合する。防備が増し、維持費と統制が増す。" },
]);

export function normalizeV3CampaignState(context, source) {
  const state = { ...source };
  const saved = source.campaign ?? {};
  if (saved.version != null && saved.version !== V3_CAMPAIGN_VERSION) throw new Error("この統治記録の保存形式には対応していません。");
  const validRegions = new Set(context.runtime.nations.regions.map((region) => region.id));
  const regionId = validRegions.has(saved.regionId) ? saved.regionId : null;
  state.campaign = {
    version: V3_CAMPAIGN_VERSION,
    stage: regionId && STAGES[saved.stage] ? saved.stage : "wanderer",
    regionId, nationId: typeof saved.nationId === "string" ? saved.nationId : null,
    services: integer(saved.services),
    treasury: round(clamp(saved.treasury, 0, 999999)),
    support: saved.support == null ? 55 : round(clamp(saved.support)),
    autonomy: saved.autonomy == null ? 50 : round(clamp(saved.autonomy)),
    readiness: saved.readiness == null ? 40 : round(clamp(saved.readiness)),
    stewardshipMonths: integer(saved.stewardshipMonths),
    institutions: [...new Set(array(saved.institutions).filter((id) => INSTITUTIONS.some((entry) => entry.id === id)))],
    diplomacy: Object.fromEntries(Object.entries(saved.diplomacy ?? {}).filter(([id, entry]) => id && entry && typeof entry === "object").slice(0, 128).map(([id, entry]) => [id, {
      trust: round(clamp(entry.trust)), consent: Boolean(entry.consent), lastEnvoyPeriod: typeof entry.lastEnvoyPeriod === "string" ? entry.lastEnvoyPeriod : null,
      consentPeriod: typeof entry.consentPeriod === "string" ? entry.consentPeriod : null,
    }])),
    cooldowns: Object.fromEntries(Object.entries(saved.cooldowns ?? {}).filter(([, value]) => typeof value === "string").slice(-128)),
    route: ["empire", "federation"].includes(saved.route) ? saved.route : null,
    centralizationMonths: integer(saved.centralizationMonths, 12),
    promiseBreaches: integer(saved.promiseBreaches, 100),
    finalStep: integer(saved.finalStep, 3),
    lastFinalMonth: Number.isFinite(saved.lastFinalMonth) ? saved.lastFinalMonth : null,
    ending: ["empire", "federation"].includes(saved.ending) ? saved.ending : null,
    lastAdvancedPeriod: typeof saved.lastAdvancedPeriod === "string" ? saved.lastAdvancedPeriod : null,
    ledger: array(saved.ledger).filter((entry) => entry?.period).slice(-24).map(clone),
    chronicle: array(saved.chronicle).filter((entry) => typeof entry?.summary === "string").slice(-80).map(clone),
  };
  return state;
}

function worldFacts(context, state, simulation) {
  const map = simulation ? getV3WorldSimulationView(context.runtime, simulation) : null;
  const regions = map ? [...map.regionById.values()] : context.runtime.nations.regions;
  const ownerIds = new Set(regions.map((region) => region.nationId));
  const nations = (map?.nations ?? context.runtime.nations.nations).filter((nation) => ownerIds.has(nation.id));
  const location = getV3DetailedTile(context, state.player.x, state.player.y);
  const region = regions.find((entry) => entry.id === (state.campaign.regionId ?? location.region?.id)) ?? regions[0];
  const nation = nations.find((entry) => entry.id === region?.nationId);
  const settlements = (map?.objects ?? context.runtime.nations.objects).filter((entry) => entry.settlementLevel && entry.regionId === region?.id);
  const localMarkets = settlements.map((entry) => simulation?.marketEconomy?.settlements?.[entry.id]).filter(Boolean);
  const grain = localMarkets.map((entry) => entry.goods.grain).filter(Boolean);
  const grainCoverage = grain.length ? round(grain.reduce((sum, entry) => sum + entry.coverageMonths, 0) / grain.length) : 1;
  const roads = (map?.roads ?? context.runtime.nations.roads ?? []).filter((entry) => (entry.tileIndices ?? []).some((index) => context.runtime.tiles[index]?.regionId === region?.id));
  const roadCondition = roads.length ? round(roads.reduce((sum, entry) => sum + (entry.condition ?? 100), 0) / roads.length) : 55;
  const crises = (simulation?.externalCrises?.activeCrises ?? []).filter((entry) => entry.regionId === region?.id);
  const crisisPressure = Math.min(12, crises.reduce((sum, entry) => sum + Number(entry.severity || 0), 0));
  const ownedRegions = regions.filter((entry) => entry.nationId === state.campaign.nationId);
  const governedRegions = ["sovereign", "ending"].includes(state.campaign.stage) ? ownedRegions : regions.filter((entry) => entry.id === state.campaign.regionId && entry.nationId === state.campaign.nationId && entry.lordId === "v3-player");
  const wars = map?.activeWars ?? [];
  const atWar = wars.some((entry) => [entry.attackerNationId, entry.defenderNationId].includes(state.campaign.nationId));
  return { map, regions, nations, region, nation, settlements, localMarkets, grainCoverage, roads, roadCondition, crises, crisisPressure, ownedRegions, governedRegions, atWar, seaRoutes: context.runtime.nations.seaRoutes ?? [] };
}

function record(state, summary, extra = {}) {
  const entry = { period: periodFor(state), summary, ...extra };
  state.campaign.chronicle = [...state.campaign.chronicle, entry].slice(-80);
  state.messageLog = [summary, ...(state.messageLog ?? [])].slice(0, 8);
  return entry;
}

function policyCount(campaign, path) { return INSTITUTIONS.filter((entry) => entry.path === path && campaign.institutions.includes(entry.id)).length; }
function politicalCondition(simulation, nationId, changes) {
  const condition = simulation?.generatedWorld.geopolitics?.nationStates?.[nationId];
  if (!condition) return;
  for (const [field, delta] of Object.entries(changes)) condition[field] = round(clamp((condition[field] ?? 50) + delta));
  condition.stateReason = createStateReason(condition, condition.stateReason);
}

function consentFacts(state, facts, nation, simulation) {
  const diplomacy = state.campaign.diplomacy[nation.id] ?? { trust: 0, consent: false };
  const preservesCulture = state.campaign.institutions.includes("cultural-rights");
  const differentCulture = nation.peopleId !== state.player.raceId;
  const relation = simulation?.generatedWorld.geopolitics?.relations?.[[state.campaign.nationId, nation.id].sort().join(":")];
  const war = facts.map?.activeWars.some((entry) => [entry.attackerNationId, entry.defenderNationId].includes(nation.id) && [entry.attackerNationId, entry.defenderNationId].includes(state.campaign.nationId));
  const threshold = 48 + (differentCulture && !preservesCulture ? 12 : 0) + (relation?.atWar || war ? 22 : 0);
  return { ...diplomacy, id: nation.id, name: nation.name, peopleName: nation.peopleName ?? nation.peopleId, threshold, differentCulture, atWar: Boolean(relation?.atWar || war), willing: diplomacy.trust >= threshold && state.campaign.autonomy >= 55 && !war };
}

function frontierRegions(facts) {
  const owned = new Set(facts.ownedRegions.map((region) => region.id));
  const neighbors = new Set(facts.ownedRegions.flatMap((region) => region.neighborIds ?? []));
  const maritime = new Set((facts.seaRoutes ?? []).filter((route) => route.available !== false && route.regionIds?.some((id) => owned.has(id))).flatMap((route) => route.regionIds ?? []));
  return facts.regions.filter((region) => !owned.has(region.id) && (neighbors.has(region.id) || (region.neighborIds ?? []).some((id) => owned.has(id)) || maritime.has(region.id))).map((region) => ({ ...region, bySea: !neighbors.has(region.id) && !(region.neighborIds ?? []).some((id) => owned.has(id)) }));
}

export function getV3CampaignView(context, source, worldSimulation = context.worldSimulation) {
  const state = normalizeV3CampaignState(context, source);
  const campaign = state.campaign;
  const facts = worldFacts(context, state, worldSimulation);
  const { stage } = campaign;
  const actions = [];
  const blocked = Boolean(state.pendingEncounter);
  const market = getV3CurrentMarket(context, state);
  const period = periodFor(state);
  const add = (id, label, description, options = {}) => {
    const currency = options.currency ?? (["wanderer", "commissioned"].includes(stage) ? "gold" : "treasury");
    const funds = currency === "gold" ? state.player.gold : campaign.treasury;
    const cost = round(options.cost ?? 0);
    const reasons = [...(options.reasons ?? []), ...(funds < cost ? [`${currency === "gold" ? "所持金" : "公金"}${cost}が必要`] : []), ...(blocked ? ["現在の遭遇を終えてください"] : [])];
    actions.push({ id, label, description, group: options.group ?? "次の行動", targetId: options.targetId ?? null, cost, currency, elapsedMinutes: options.elapsedMinutes ?? DAY, consequences: options.consequences ?? description, enabled: !reasons.length, reason: reasons.join("／"), ...(options.confirm ? { confirm: options.confirm } : {}) });
  };
  const evidence = Math.max(campaign.services, Math.floor((state.steps ?? 0) / 12), Math.floor((state.merchant?.trade?.stats?.unitsSold ?? 0) / 3), state.military?.merit ?? 0, state.merchant?.company?.status === "company" ? 3 : 0);
  const requirements = [];
  if (["wanderer", "commissioned"].includes(stage)) {
    add("local-work", "集落の仕事を一日手伝う", "所持金4と地域の実務実績1。集落の暮らしを支える。", { currency: "gold", reasons: market ? [] : ["集落の市場へ歩いてください"], consequences: "一日経過・所持金+4・実務実績+1" });
    requirements.push(requirement("歩行・商売・軍務・地域実務の実績", evidence, stage === "wanderer" ? 1 : 3));
    if (stage === "wanderer") add("commission", "地方の委託を引き受ける", `${facts.region?.name ?? "現在地"}の行政・流通支援を引き受ける。`, { cost: 2, reasons: [...(!market ? ["集落で申し出てください"] : []), ...(evidence < 1 ? ["12歩の探索、商品3個の販売、軍功、または地域実務1回が必要"] : [])] });
    else add("appointment", "地方統治の任を受ける", "公金の管理と地方住民への責任を引き受ける。現在の領有国の下で任官する。", { cost: 8, reasons: [...(!market || market.regionId !== campaign.regionId ? ["委託を受けた地方の集落へ戻ってください"] : []), ...(evidence < 3 ? ["実績3が必要。探索36歩、商品9個販売、軍功または地域実務で積み上げる"] : [])] });
  } else {
    add("local-work", "集落の仕事を一日手伝う", "所持金4と地域の実務実績1。資金を失っても生活から立て直せる。", { group: "財政と生活", currency: "gold", reasons: market ? [] : ["集落の市場へ歩いてください"] });
    if (!facts.governedRegions.length) add("restore-office", "現在地の地方行政から再出発する", "領土を失ったため徴税権は停止している。現在の領有国の下で地方行政の任を受け直す。", { cost: 8, currency: "gold", reasons: market ? [] : ["集落の市場へ歩いてください"], confirm: "現在地の領有国の下で地方統治から再出発します。これまでの年代記は残ります。" });
    add("wait-month", "翌月の評議会まで進める", "世界・市場・商会・統治を同じ一か月だけ進める。", { group: "月次", elapsedMinutes: MONTH });
    add("contribute", "個人資金を公金へ移す", "所持金10を公金10へ移す。", { group: "財政と生活", cost: 10, currency: "gold", elapsedMinutes: 60 });
    add("public-work", "街道と集落を修繕する", "木材2を調達し、街道と生活施設を修繕する。住民支持+8。", { group: "財政と生活", cost: 5 + materialCost(facts, "timber", 2), reasons: campaign.cooldowns["public-work"] === period ? ["この月の修繕は完了"] : materialReasons(facts, "timber", 2) });
    const relief = reliefSupply(context, facts, worldSimulation);
    add("relief", "備蓄と救援を手配する", relief ? `${relief.donor.name}の余剰穀物4を買い付け、${relief.target.name}へ運ぶ。住民支持+8。` : "街道・航路で接続する市場の余剰穀物4を買い付けて救援する。", { group: "財政と生活", cost: relief?.cost ?? 0, reasons: [...(campaign.cooldowns.relief === period ? ["この月の救援は手配済み"] : []), ...(!relief ? ["接続する市場の余剰穀物4、または搬入先の空き容量が不足"] : [])] });
    add("council", "住民と調整する", "一週間をかけて住民の訴えを扱う。住民支持+8・自治+3。", { group: "財政と生活", elapsedMinutes: 7 * DAY, reasons: campaign.cooldowns.council === period ? ["この月の調整は完了。翌月も継続できる"] : [] });
    add("drill", "防備と補給を整える", "鉄1と穀物2を調達し、練兵と補給線を整える。防備+18。", { group: "財政と生活", cost: 4 + materialCost(facts, "iron", 1) + materialCost(facts, "grain", 2), reasons: campaign.cooldowns.drill === period ? ["この月の練兵は完了"] : [...materialReasons(facts, "iron", 1), ...materialReasons(facts, "grain", 2)] });
    for (const policy of INSTITUTIONS.filter((entry) => !campaign.institutions.includes(entry.id))) add(`institution:${policy.id}`, policy.label, policy.description, { group: "制度", cost: 8, elapsedMinutes: 7 * DAY, reasons: [...(!facts.governedRegions.length ? ["制度を定める統治権がありません。地方行政から再出発してください"] : []), ...(campaign.lastFinalMonth != null && campaign.route && campaign.route !== policy.path ? ["最終宣言後は別の体制へ変更できません"] : [])], consequences: `${policy.description} 制度履歴の${policy.domain}へ記録。` });
    if (stage === "governor" && facts.governedRegions.length) {
      requirements.push(requirement("統治した月数", campaign.stewardshipMonths, 2), requirement("住民支持", campaign.support, 50));
      add("sovereignty", "自治憲章を制定する", "地域住民の支持を得て、この地方を独立した自治国家にする。国境と国家一覧へ反映される。", { cost: 12, reasons: [...(campaign.stewardshipMonths < 2 ? ["少なくとも2か月の統治が必要"] : []), ...(campaign.support < 50 ? ["住民支持50が必要"] : [])], confirm: "地方が現在の領有国から独立します。自治憲章を制定しますか。" });
    }
  }
  const liveOthers = facts.nations.filter((nation) => nation.id !== campaign.nationId && !nation.dissolved);
  const diplomacy = liveOthers.map((nation) => consentFacts(state, facts, nation, worldSimulation));
  const federationTarget = Math.min(6, facts.nations.length);
  const federationMembers = 1 + diplomacy.filter((entry) => entry.consent && entry.willing).length;
  const controlTarget = Math.ceil(facts.regions.length * 0.6);
  const centralPolicies = policyCount(campaign, "empire");
  const federalPolicies = policyCount(campaign, "federation");
  const federalDomains = new Set(INSTITUTIONS.filter((entry) => entry.path === "federation" && campaign.institutions.includes(entry.id)).map((entry) => entry.domain)).size;
  if (["sovereign", "ending"].includes(stage) && facts.governedRegions.length) {
    for (const nation of diplomacy) {
      add("envoy", `${nation.name}へ協議団を送る`, `信頼${round(nation.trust)}／加盟合意の目安${nation.threshold}。交易と相互承認を交渉する。`, { group: "外交", targetId: nation.id, cost: 6, elapsedMinutes: 7 * DAY, reasons: nation.lastEnvoyPeriod === period ? ["この国とは今月交渉済み"] : [], consequences: `信頼+24${nation.differentCulture && !campaign.institutions.includes("cultural-rights") ? "。言語と慣習の保障で異文化間の負担を減らせる" : ""}` });
      if (!nation.consent) add("treaty", `${nation.name}と自治連邦の合意`, "相手国の領土と意思決定を維持し、加盟合意を記録する。", { group: "外交", targetId: nation.id, cost: 4, reasons: [...(nation.trust < nation.threshold ? [`信頼${nation.threshold}が必要`] : []), ...(campaign.autonomy < 55 ? ["自治55が必要"] : []), ...(nation.atWar ? ["交戦中。まず協議団で停戦を交渉してください"] : [])] });
    }
    for (const region of frontierRegions(facts)) {
      const owner = diplomacy.find((entry) => entry.id === region.nationId);
      add("integrate-region", `${region.name}の統治移管を交渉する`, `${region.bySea ? "既存航路でつながる地方へ船団を派遣し" : "隣接地方を対象に"}、領有国と行政移管を交渉する。国境が変わり、地方自治は減る。`, { group: "領土と軍事", targetId: region.id, cost: region.bySea ? 20 : 16, elapsedMinutes: (region.bySea ? 10 : 7) * DAY, reasons: [...((owner?.trust ?? 0) < 48 ? ["領有国との信頼48が必要"] : []), ...(campaign.support < 45 ? ["住民支持45が必要"] : []), ...(owner?.consent ? ["自治連邦の加盟国の領土は併合できません"] : [])] });
      add("military-region", `${region.name}へ軍事圧力をかける`, `実戦で得た軍功と補給力で${region.bySea ? "既存航路の対岸" : "隣接地方"}の支配を争う。交渉関係と住民支持を失う。`, { group: "領土と軍事", targetId: region.id, cost: region.bySea ? 18 : 14, elapsedMinutes: (region.bySea ? 10 : 7) * DAY, reasons: [...((state.military?.merit ?? 0) < 1 ? ["V3軍務で得た軍功1が必要"] : []), ...(campaign.readiness < 65 ? ["防備65が必要"] : []), ...(campaign.support < 45 ? ["住民支持45が必要"] : []), ...(owner?.consent ? ["加盟国への攻撃は自治憲章に反します"] : [])], consequences: "国境変更・防備-18・住民支持-10・相手国との信頼-40" });
    }
    const empireRequirements = [requirement("支配地方（生成世界の60%）", facts.ownedRegions.length, controlTarget), requirement("中央集権制度の履歴", centralPolicies, 3), requirement("集権危機を統治した月数", campaign.centralizationMonths, 12), requirement("住民支持", campaign.support, 45)];
    const federationRequirements = [requirement("同意した存続国家（自国を含む）", federationMembers, federationTarget), requirement("自治を保障する制度履歴", federalPolicies, 6), requirement("制度の分野数", federalDomains, 4), requirement("自治", campaign.autonomy, 60), requirement("住民支持", campaign.support, 50)];
    requirements.push(...(campaign.route === "empire" ? empireRequirements : campaign.route === "federation" ? federationRequirements : []));
    if (!campaign.ending) {
      add("path-empire", "帝国への集権を進める", "支配地方60%、中央集権制度3件と、条件を維持した12か月の危機統治を目指す。最終宣言前は方針を変更できる。", { group: "国家の行方", elapsedMinutes: 60, reasons: campaign.lastFinalMonth != null ? ["最終宣言は確定済み"] : campaign.route === "empire" ? ["現在の方針です"] : [] });
      add("path-federation", "自治連邦を目指す", `${federationTarget}国家の同意、4分野6制度を目指す。生成国家が6未満なら現存国数を必要数とする。`, { group: "国家の行方", elapsedMinutes: 60, reasons: campaign.lastFinalMonth != null ? ["最終宣言は確定済み"] : campaign.route === "federation" ? ["現在の方針です"] : [] });
      if (campaign.route) {
        const targetRequirements = campaign.route === "empire" ? empireRequirements : federationRequirements;
        const names = campaign.route === "empire" ? ["帝国を布告する", "リヴァイアサン討伐の遠征を決行する", "女神の統治権を受ける"] : ["連邦憲章を批准する", "リヴァイアサンとの生息域協定を結ぶ", "女神の統治権を拒む"];
        const extra = [...targetRequirements.filter((entry) => !entry.met).map((entry) => `${entry.label} ${entry.current}/${entry.target}`), ...(campaign.promiseBreaches > 1 && campaign.route === "federation" ? ["加盟義務の不履行を1以下へ修復してください"] : []), ...(campaign.lastFinalMonth != null && monthFor(state) <= campaign.lastFinalMonth ? ["次の最終行動は翌月以降です"] : []), ...(campaign.finalStep === 1 && campaign.route === "empire" && campaign.readiness < 65 ? ["討伐の補給と防備65が必要"] : [])];
        add("finalize", names[campaign.finalStep], "最終行動は別々の月に確定する。完了後も同じ世界・人物・保存で統治と探索を続けられる。", { group: "国家の行方", cost: campaign.finalStep === 1 ? 18 : 8, reasons: extra, confirm: `${names[campaign.finalStep]}。この決定以降、もう一方の結末には変更できません。確定しますか。` });
      }
    }
  }
  const nextStep = stage === "wanderer" ? "集落で仕事をするか、探索・商売・軍務の実績を積み、地方の委託を受ける。" : stage === "commissioned" ? "委託を受けた地方で実績3と所持金8を整え、地方統治の任を受ける。" : stage === "governor" ? "地方の生活と財政を2か月運営し、住民支持50で自治憲章を制定する。" : campaign.ending ? "世界は続く。地方の暮らし、外交、商会、軍務、探索を同じ記録で続けられる。" : campaign.route === "empire" ? "隣接地方の統治移管と中央集権制度を進め、条件を保って12か月を統治する。" : campaign.route === "federation" ? "自治制度を整え、存続する各国と交渉して加盟同意を得る。" : "制度と外交を整え、帝国または自治連邦への方針を選ぶ。";
  return { stage, label: STAGES[stage], summary: `${facts.region?.name ?? "未踏の地方"} · ${facts.nation?.name ?? "無所属"}${["wanderer", "commissioned"].includes(stage) ? "" : ` · 公金${campaign.treasury}・住民支持${campaign.support}・自治${campaign.autonomy}・防備${campaign.readiness}`}`, nextStep, requirements, actions, chronicle: [...campaign.chronicle].reverse(), campaign, region: { id: facts.region?.id, name: facts.region?.name, nationId: facts.region?.nationId, nationName: facts.nation?.name, terrain: facts.region?.dominantTerrain ?? facts.region?.terrain, peopleName: facts.nation?.peopleName ?? facts.nation?.peopleId, grainCoverage: facts.grainCoverage, roadCondition: facts.roadCondition, crisisPressure: facts.crisisPressure }, diplomacy, ending: campaign.ending ? { id: campaign.ending, label: campaign.ending === "empire" ? "女神の帝国" : "自由な自治連邦", completed: true } : null };
}

function materialCost(facts, commodityId, quantity) {
  const market = facts.localMarkets.find((entry) => entry.goods[commodityId]?.inventory >= quantity);
  return round((market?.goods[commodityId]?.buyPrice ?? 3) * quantity);
}
function reliefSupply(context, facts, simulation) {
  const targets = [...facts.localMarkets].filter((entry) => entry.goods.grain.capacity - entry.goods.grain.inventory >= 4).sort((a, b) => a.goods.grain.coverageMonths - b.goods.grain.coverageMonths);
  const target = targets[0];
  if (!target) return null;
  const reachable = new Set([target.id]);
  const objects = new Map((facts.map?.objects ?? context.runtime.nations.objects).map((entry) => [entry.id, entry]));
  const marketEnd = (id) => objects.get(id)?.settlementLevel ? id : [...objects.values()].find((entry) => entry.settlementLevel && entry.regionSeat && entry.regionId === objects.get(id)?.regionId)?.id;
  let changed = true;
  while (changed) {
    changed = false;
    for (const road of [...(facts.map?.roads ?? []), ...(facts.seaRoutes ?? [])]) {
      if (road.available === false || road.condition <= 0) continue;
      const left = marketEnd(road.fromObjectId); const right = marketEnd(road.toObjectId);
      if (!left || !right) continue;
      if (reachable.has(left) && !reachable.has(right)) { reachable.add(right); changed = true; }
      if (reachable.has(right) && !reachable.has(left)) { reachable.add(left); changed = true; }
    }
  }
  const donor = Object.values(simulation?.marketEconomy?.settlements ?? {}).filter((entry) => entry.id !== target.id && reachable.has(entry.id) && entry.goods.grain.inventory - entry.goods.grain.lastConsumption >= 4).sort((a, b) => a.goods.grain.buyPrice - b.goods.grain.buyPrice || a.id.localeCompare(b.id))[0];
  if (!donor) return null;
  return { donor, target, cost: round(donor.goods.grain.buyPrice * 4 + 2) };
}
function materialReasons(facts, commodityId, quantity) {
  return facts.localMarkets.some((entry) => entry.goods[commodityId]?.inventory >= quantity) ? [] : [`地方市場の${{ timber: "木材", grain: "穀物", iron: "鉄" }[commodityId]}${quantity}が不足。救援・交易・翌月の供給を待ってください`];
}
function consumeMaterial(context, simulation, facts, commodityId, quantity) {
  const market = facts.localMarkets.find((entry) => entry.goods[commodityId]?.inventory >= quantity);
  return market ? applyV3MarketInventoryFlows(context.runtime, simulation, [{ settlementId: market.id, commodityId, quantity: -quantity }], "campaign") : simulation;
}

export function performV3CampaignAction(context, source, actionId, options = {}) {
  const initialWorld = options.worldSimulation ?? context.worldSimulation;
  if (!initialWorld) throw new Error("生成世界の現在状態を読み込んでください。");
  const state = normalizeV3CampaignState(context, clone(source));
  const view = getV3CampaignView(context, state, initialWorld);
  const action = view.actions.find((entry) => entry.id === actionId && (entry.targetId ?? null) === (options.targetId ?? null));
  if (!action) throw new Error("現在は選べない統治行動です。");
  if (!action.enabled) throw new Error(action.reason);
  let simulation = clone(initialWorld);
  const campaign = state.campaign;
  const facts = worldFacts(context, state, initialWorld);
  if (action.currency === "gold") state.player.gold = round(state.player.gold - action.cost);
  else campaign.treasury = round(campaign.treasury - action.cost);
  let summary = action.label;
  if (actionId === "local-work") {
    state.player.gold = round(state.player.gold + 4);
    campaign.services += 1;
    summary = "集落の仕事を一日手伝い、所持金4と実務実績1を得た。";
  } else if (actionId === "commission") {
    campaign.stage = "commissioned";
    campaign.regionId = facts.region.id;
    campaign.nationId = facts.region.nationId;
  } else if (actionId === "appointment" || actionId === "restore-office") {
    if (actionId === "restore-office") {
      const tile = getV3DetailedTile(context, state.player.x, state.player.y);
      campaign.regionId = tile.region.id;
      campaign.nationId = facts.regions.find((entry) => entry.id === tile.region.id).nationId;
      campaign.stewardshipMonths = 0;
    }
    campaign.stage = "governor";
    if (actionId === "appointment") campaign.nationId = facts.region.nationId;
    // The appointment's first budget is a transfer from the appointing state's reserves, bounded by what exists.
    const reserves = simulation.generatedWorld.geopolitics?.nationStates?.[campaign.nationId]?.reserves ?? 0;
    const budget = round(Math.min(16, Math.max(0, reserves)));
    campaign.treasury += budget;
    politicalCondition(simulation, campaign.nationId, { reserves: -budget });
    simulation.generatedWorld.regionalDomains = appointRegionalLord(context.runtime, simulation.generatedWorld.regionalDomains, campaign.regionId, { lordId: "v3-player", lordName: state.player.name, officeTitle: "地方総督" }, simulation);
    summary = `${facts.regions.find((region) => region.id === campaign.regionId).name}の地方総督に任官し、国家準備金から公金${budget}を預かった。`;
  } else if (actionId === "contribute") campaign.treasury = round(campaign.treasury + 10);
  else if (actionId === "public-work") {
    simulation = consumeMaterial(context, simulation, facts, "timber", 2);
    const domains = simulation.generatedWorld.regionalDomains;
    const assets = new Set([...facts.roads.map((entry) => `road:${entry.id}`), ...facts.settlements.map((entry) => `facility:${entry.id}`)]);
    for (const id of assets) if (domains.assetStates[id]) { domains.assetStates[id].condition = clamp(domains.assetStates[id].condition + 15); domains.assetStates[id].available = true; }
    campaign.support = clamp(campaign.support + 8);
    campaign.cooldowns[actionId] = periodFor(state);
  } else if (actionId === "relief") {
    const relief = reliefSupply(context, facts, initialWorld);
    simulation = applyV3MarketInventoryFlows(context.runtime, simulation, [{ settlementId: relief.donor.id, commodityId: "grain", quantity: -4 }, { settlementId: relief.target.id, commodityId: "grain", quantity: 4 }], "campaign-relief");
    campaign.support = clamp(campaign.support + 8);
    campaign.cooldowns[actionId] = periodFor(state);
  } else if (actionId === "council") {
    campaign.support = clamp(campaign.support + 8); campaign.autonomy = clamp(campaign.autonomy + 3);
    campaign.promiseBreaches = Math.max(0, campaign.promiseBreaches - 1);
    campaign.cooldowns[actionId] = periodFor(state);
  } else if (actionId === "drill") {
    simulation = consumeMaterial(context, simulation, facts, "iron", 1);
    simulation = consumeMaterial(context, simulation, facts, "grain", 2);
    campaign.readiness = clamp(campaign.readiness + 18);
    campaign.cooldowns[actionId] = periodFor(state);
    politicalCondition(simulation, campaign.nationId, { readiness: 4 });
  } else if (actionId.startsWith("institution:")) {
    const policy = INSTITUTIONS.find((entry) => entry.id === actionId.slice(12));
    campaign.institutions.push(policy.id);
    campaign.autonomy = clamp(campaign.autonomy + (policy.path === "federation" ? 7 : -8));
    campaign.support = clamp(campaign.support + (policy.path === "federation" ? 3 : -2));
    if (policy.domain === "security") campaign.readiness = clamp(campaign.readiness + 12);
  } else if (actionId === "sovereignty") {
    const nationId = `v3-player-${campaign.regionId}`;
    simulation.generatedWorld.regionalDomains = declareRegionIndependence(context.runtime, simulation.generatedWorld.regionalDomains, campaign.regionId, { polityId: nationId, name: `${facts.region.name.replace(/地方$/, "")}自治国`, government: "地域自治政体", founderId: "v3-player", founderName: state.player.name, officeTitle: "自治国代表", cause: "v3_popular_charter" }, simulation);
    campaign.stage = "sovereign"; campaign.nationId = nationId;
    campaign.autonomy = Math.max(55, campaign.autonomy);
    campaign.diplomacy[facts.region.nationId] = { trust: 24, consent: false, lastEnvoyPeriod: null, consentPeriod: null };
  } else if (actionId === "envoy" || actionId === "treaty") {
    const nationId = options.targetId;
    const entry = campaign.diplomacy[nationId] ?? { trust: 0, consent: false, lastEnvoyPeriod: null, consentPeriod: null };
    if (actionId === "envoy") {
      entry.trust = clamp(entry.trust + 24); entry.lastEnvoyPeriod = periodFor(state);
      const relation = simulation.generatedWorld.geopolitics?.relations?.[[campaign.nationId, nationId].sort().join(":")];
      if (relation) { relation.relation = clamp(relation.relation + 15, -100, 100); relation.tension = clamp(relation.tension - 15); }
      if (entry.trust >= 70) {
        if (relation) { relation.atWar = false; relation.truceMonths = 6; }
        const domains = getRegionalDomainView(context.runtime, simulation.generatedWorld.regionalDomains, simulation);
        const liveRuntime = { ...context.runtime, nations: domains.nationMap, nationById: domains.nationById, regionById: domains.regionById };
        simulation.generatedWorld.worldWars = resolveGeneratedWorldWarCeasefire(liveRuntime, simulation.generatedWorld.worldWars, simulation, campaign.nationId, nationId);
      }
    } else { entry.consent = true; entry.consentPeriod = periodFor(state); }
    campaign.diplomacy[nationId] = entry;
  } else if (["integrate-region", "military-region"].includes(actionId)) {
    const region = facts.regions.find((entry) => entry.id === options.targetId);
    simulation.generatedWorld.regionalDomains = transferRegionControl(context.runtime, simulation.generatedWorld.regionalDomains, region.id, campaign.nationId, { cause: actionId === "integrate-region" ? "v3_negotiated_administration" : "v3_military_coercion" }, simulation);
    if (actionId === "military-region") {
      campaign.readiness = clamp(campaign.readiness - 18); campaign.support = clamp(campaign.support - 10);
      if (campaign.diplomacy[region.nationId]) campaign.diplomacy[region.nationId].trust = clamp(campaign.diplomacy[region.nationId].trust - 40);
      politicalCondition(simulation, region.nationId, { cohesion: -4, readiness: -6 });
    } else campaign.support = clamp(campaign.support - 2);
    campaign.autonomy = clamp(campaign.autonomy - 2);
  } else if (actionId.startsWith("path-")) campaign.route = actionId.slice(5);
  else if (actionId === "finalize") {
    campaign.finalStep += 1;
    campaign.lastFinalMonth = monthFor(state);
    if (campaign.finalStep === 2) {
      if (campaign.route === "empire") { campaign.readiness = clamp(campaign.readiness - 25); campaign.support = clamp(campaign.support - 5); }
      else { campaign.autonomy = clamp(campaign.autonomy + 5); campaign.support = clamp(campaign.support + 5); }
    }
    if (campaign.finalStep === 3) { campaign.ending = campaign.route; campaign.stage = "ending"; summary = `${campaign.route === "empire" ? "女神の帝国" : "自由な自治連邦"}が成立した。世界の時間と暮らしは続く。`; }
  }
  const entry = record(state, summary, { actionId, targetId: options.targetId ?? null });
  return { ...createActionResult(state, { elapsedMinutes: action.elapsedMinutes, message: summary, events: [{ type: "campaign.action", source: "campaign", visibility: "public", summary, locationIds: [campaign.regionId, options.targetId].filter(Boolean), payload: { actionId, stage: campaign.stage }, period: entry.period }] }), worldSimulation: simulation };
}

export function advanceV3CampaignMonth(context, source, worldSimulation, calendar) {
  const state = normalizeV3CampaignState(context, clone(source));
  const campaign = state.campaign;
  const date = calendar ?? getGameCalendar(normalizeStateGameClock(state).clock);
  const period = `${date.year}-${date.month}`;
  if (["wanderer", "commissioned"].includes(campaign.stage) || campaign.lastAdvancedPeriod === period) return { state, worldSimulation, events: [] };
  let simulation = clone(worldSimulation);
  const facts = worldFacts(context, state, simulation);
  campaign.lastAdvancedPeriod = period;
  if (facts.governedRegions.length) campaign.stewardshipMonths += 1;
  // Revenues arise from actual governed settlements and available roads; shortages and wars reduce receipts.
  const population = facts.governedRegions.reduce((sum, region) => sum + (Number(region.population) || (region.settlementIds ?? []).reduce((subtotal, id) => subtotal + (simulation.generatedWorld.regionalDomains?.settlementStates?.[id]?.population ?? 0), 0)), 0);
  const central = policyCount(campaign, "empire");
  const federal = policyCount(campaign, "federation");
  const economy = clamp(facts.grainCoverage, 0.35, 1.4) * (0.7 + facts.roadCondition / 200) * (facts.atWar ? 0.7 : 1);
  const revenue = facts.governedRegions.length ? round((5 + facts.governedRegions.length * 2 + Math.log10(Math.max(10, population))) * economy * (1 + central * 0.08 - federal * 0.025)) : 0;
  const expense = facts.governedRegions.length ? round(3 + facts.governedRegions.length * 0.65 + central * 0.3 + facts.crisisPressure * 0.3) : 0;
  const paid = Math.min(campaign.treasury + revenue, expense);
  const unpaid = round(expense - paid);
  campaign.treasury = round(Math.max(0, campaign.treasury + revenue - expense));
  const hardship = Math.max(0, 0.8 - facts.grainCoverage) * 4 + facts.crisisPressure * 0.4 + (facts.atWar ? 1 : 0) + unpaid;
  campaign.support = round(clamp(campaign.support + 1 + federal * 0.25 - central * 0.2 - hardship));
  campaign.readiness = round(clamp(campaign.readiness - (facts.atWar ? 2 : 0.5) - unpaid * 0.3));
  if (unpaid > 0) campaign.promiseBreaches = Math.min(100, campaign.promiseBreaches + 1);
  const controlTarget = Math.ceil(facts.regions.length * 0.6);
  if (campaign.route === "empire" && campaign.finalStep === 0 && facts.ownedRegions.length >= controlTarget && central >= 3 && campaign.support >= 45 && unpaid === 0) campaign.centralizationMonths = Math.min(12, campaign.centralizationMonths + 1);
  // Consent remains a living agreement: arrears or revoked cultural autonomy suspend membership without deleting the negotiation record.
  if (campaign.promiseBreaches > 1 || campaign.autonomy < 45) for (const entry of Object.values(campaign.diplomacy)) if (entry.consent) entry.trust = round(clamp(entry.trust - 4));
  politicalCondition(simulation, campaign.nationId, { cohesion: (campaign.support - 50) * 0.025, reserves: unpaid ? -unpaid : 0.5 });
  const summary = `${period}の地方決算：収入${revenue}・費用${expense}・公金${campaign.treasury}。${unpaid ? `未払い${unpaid}。住民調整と出資で立て直せる。` : facts.grainCoverage < 0.75 ? "穀物不足が支持を損ねている。救援と流通の回復が必要。" : "生活と制度の維持を確認した。"}`;
  campaign.ledger = [...campaign.ledger, { period, revenue, expense, unpaid, treasury: campaign.treasury, grainCoverage: facts.grainCoverage, roadCondition: facts.roadCondition, crisisPressure: facts.crisisPressure }].slice(-24);
  record(state, summary);
  return { state, worldSimulation: simulation, events: [{ id: `campaign:month:${period}`, type: "campaign.month.closed", source: "campaign", visibility: "public", summary, period, locationIds: [campaign.regionId], payload: campaign.ledger.at(-1) }] };
}
