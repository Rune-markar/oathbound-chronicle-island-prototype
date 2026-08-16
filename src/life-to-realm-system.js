import {
  advanceGeneratedWorldTime,
  buildGeneratedWorld,
  transferGeneratedRegionControl,
} from "./generated-world-system.js";

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const stageOrder = Object.freeze({ individual: 0, retainer: 1, commander: 2, castellan: 3, lord: 4, multi_lord: 5, governor: 6, duke: 7, regent: 8, independent_ruler: 9, centralized_ruler: 9 });

export const LIFE_TO_REALM_SCHEMA_VERSION = 1;

export const LIFE_ACTIONS = Object.freeze({
  local_work: Object.freeze({ id: "local_work", name: "日雇い仕事をする", minutes: 240, wealth: 2, hunger: 14, fatigue: 18, description: "半日を使い、当座の財産を得る。" }),
  eat_ration: Object.freeze({ id: "eat_ration", name: "保存食を食べる", minutes: 30, food: -1, hunger: -40, fatigue: -2, description: "携行食を一つ消費して空腹を和らげる。" }),
  rest_inn: Object.freeze({ id: "rest_inn", name: "宿で休む", minutes: 480, wealth: -1, hunger: 8, fatigue: -55, description: "財産1。払えない場合は宿代を借りる。" }),
  camp: Object.freeze({ id: "camp", name: "野営する", minutes: 480, hunger: 12, fatigue: -30, description: "無料だが、休息は浅く襲撃の危険がある。" }),
  treat_wounds: Object.freeze({ id: "treat_wounds", name: "傷を治療する", minutes: 120, wealth: -2, hunger: 3, fatigue: -8, description: "財産2を払い、HPと負傷を回復する。" }),
  repay_debt: Object.freeze({ id: "repay_debt", name: "生活負債を返す", minutes: 30, description: "宿代や維持費の未払いを一口返済する。" }),
});

export const FIEF_PROJECT_DEFINITIONS = Object.freeze({
  road_network: Object.freeze({ id: "road_network", name: "街道補修", cost: 4, duration: 2, description: "交易と行軍の基盤を整える。", effect: "街道状態+15・商業+2" }),
  granary: Object.freeze({ id: "granary", name: "共同穀倉", cost: 5, duration: 2, description: "飢饉と遠征に備える備蓄を作る。", effect: "食料+500・支持+1" }),
  patrol: Object.freeze({ id: "patrol", name: "巡察網", cost: 3, duration: 1, description: "盗賊と徴税横領を抑える。", effect: "治安+5・支持+1" }),
  relief: Object.freeze({ id: "relief", name: "救恤事業", cost: 4, duration: 1, description: "困窮者へ食料と仕事を配る。", effect: "支持+6・人口+60" }),
  levy: Object.freeze({ id: "levy", name: "郷兵再編", cost: 4, duration: 2, description: "兵を増やすが領民負担を伴う。", effect: "兵力+120・支持-3" }),
});

export const HOUSEHOLD_REWARDS = Object.freeze({
  coin: Object.freeze({ id: "coin", name: "金銭恩賞", wealthCost: 2, loyalty: 10, support: 1, description: "家計から即座に報いる。" }),
  office: Object.freeze({ id: "office", name: "役職昇進", wealthCost: 0, loyalty: 6, support: 3, description: "責任と権威を与えるが派閥競争を生む。" }),
  praise: Object.freeze({ id: "praise", name: "公の称賛", wealthCost: 0, loyalty: 4, support: 1, description: "安価だが大功への報いとしては弱い。" }),
});

export const REALM_CAMPAIGN_OBJECTIVES = Object.freeze({
  secure_border: Object.freeze({ id: "secure_border", name: "国境安定", supplyCost: 18, difficulty: 54, reward: 18 }),
  relieve_ally: Object.freeze({ id: "relieve_ally", name: "友軍救援", supplyCost: 22, difficulty: 60, reward: 22 }),
  seize_route: Object.freeze({ id: "seize_route", name: "交通路確保", supplyCost: 25, difficulty: 66, reward: 27 }),
});

export const LIFE_PATHS = Object.freeze({
  adventurer: Object.freeze({ id: "adventurer", name: "冒険者として名を上げる", epithet: "辺境の請負人", description: "依頼3件とギルド功績30を達成する。" }),
  merchant: Object.freeze({ id: "merchant", name: "街道商人になる", epithet: "道を読む商人", description: "交易履歴3件と財産20を得る。" }),
  outlaw: Object.freeze({ id: "outlaw", name: "裏社会を築く", epithet: "影街道の主", description: "犯罪事件3件と現地連絡先を得る。" }),
  loyalist: Object.freeze({ id: "loyalist", name: "忠臣として仕える", epithet: "主君の盾", description: "軍務2件と主君信頼50を得る。" }),
  founder: Object.freeze({ id: "founder", name: "自ら国を建てる", epithet: "開国の祖", description: "所領を得て独立君主となる。" }),
  chronicler: Object.freeze({ id: "chronicler", name: "世界を記録する", epithet: "諸国の語り部", description: "年代記20件と踏破地点2か所を記録する。" }),
});

export const LEGACY_CHOICES = Object.freeze({
  house: Object.freeze({ id: "house", name: "家産を継ぐ", description: "財産と所領の安定を優先する。" }),
  chronicle: Object.freeze({ id: "chronicle", name: "年代記を継ぐ", description: "名声と正統性を優先する。" }),
  institution: Object.freeze({ id: "institution", name: "制度を継ぐ", description: "政績と家臣・領民支持を優先する。" }),
});

function currentClock(state) {
  return Math.max(0, Number(state.generatedWorld?.expeditionClockMinutes) || 0);
}

function currentRegion(state) {
  const runtime = buildGeneratedWorld(state);
  const id = state.generatedWorld?.expeditionRegionId;
  const region = runtime.nations.regions.find((entry) => entry.id === id) ?? runtime.nations.regions[0];
  return { runtime, region };
}

function territoryDisplayName(state, territoryId) {
  const holding = state.player?.holdings?.find((entry) => entry.territoryId === territoryId);
  if (holding?.generatedRegionId) {
    const runtime = buildGeneratedWorld(state);
    const region = runtime.nations.regions.find((entry) => entry.id === holding.generatedRegionId);
    if (region?.name) return region.name;
  }
  return state.cities?.[territoryId]?.name ?? "自領";
}

function defaultLifeState(state) {
  return {
    schemaVersion: LIFE_TO_REALM_SCHEMA_VERSION,
    body: { hunger: 18, lastClockMinutes: currentClock(state), conditionHistory: [] },
    home: { kind: "rented_room", name: "街道宿の間借り", monthlyRent: 2, debt: 0, missedPayments: 0, storageCapacity: 12 },
    livelihood: { activeContract: null, history: [], boardPeriod: null },
    companions: {},
    fief: { projects: [], completed: [] },
    household: { rewards: [], disputes: [], factionTension: 0 },
    campaign: { active: null, history: [] },
    lifePath: { activeId: null, chosenTurn: null, claimedIds: [], epithets: [] },
    legacy: { generation: 1, heirId: null, dynasties: [], lastInheritance: null },
  };
}

function companionSeed(member) {
  const role = member.role ?? member.specialty ?? "冒険者";
  const aspiration = /斥候|弓/.test(role) ? "未知の土地を見つけたい" : /行政|学|術/.test(role) ? "役目と知識を認められたい" : "危険に見合う報酬を得たい";
  return {
    id: member.id,
    name: member.name,
    role,
    loyalty: 55,
    morale: 65,
    fear: 10,
    monthlyWage: 1,
    wageArrears: 0,
    aspiration,
    contribution: 0,
    request: null,
    status: member.active === false ? "resting" : "active",
  };
}

function synchronizeCompanions(state) {
  const life = state.player.lifeToRealm;
  const members = state.player.villageLife?.party ?? [];
  members.forEach((member) => {
    const prior = life.companions[member.id] ?? {};
    life.companions[member.id] = { ...companionSeed(member), ...prior, id: member.id, name: member.name, role: member.role ?? prior.role ?? "冒険者" };
    if (life.companions[member.id].status === "departed") member.active = false;
  });
}

export function normalizeLifeToRealmState(state) {
  if (!state?.player) return state;
  const baseline = defaultLifeState(state);
  const source = state.player.lifeToRealm ?? {};
  state.player.lifeToRealm = {
    ...baseline,
    ...source,
    schemaVersion: LIFE_TO_REALM_SCHEMA_VERSION,
    body: { ...baseline.body, ...(source.body ?? {}), conditionHistory: [...(source.body?.conditionHistory ?? [])] },
    home: { ...baseline.home, ...(source.home ?? {}) },
    livelihood: { ...baseline.livelihood, ...(source.livelihood ?? {}), history: [...(source.livelihood?.history ?? [])], activeContract: source.livelihood?.activeContract ? clone(source.livelihood.activeContract) : null },
    companions: Object.fromEntries(Object.entries(source.companions ?? {}).map(([id, entry]) => [id, { ...entry }])),
    fief: { ...baseline.fief, ...(source.fief ?? {}), projects: [...(source.fief?.projects ?? [])], completed: [...(source.fief?.completed ?? [])] },
    household: { ...baseline.household, ...(source.household ?? {}), rewards: [...(source.household?.rewards ?? [])], disputes: [...(source.household?.disputes ?? [])] },
    campaign: { ...baseline.campaign, ...(source.campaign ?? {}), active: source.campaign?.active ? clone(source.campaign.active) : null, history: [...(source.campaign?.history ?? [])] },
    lifePath: { ...baseline.lifePath, ...(source.lifePath ?? {}), claimedIds: [...(source.lifePath?.claimedIds ?? [])], epithets: [...(source.lifePath?.epithets ?? [])] },
    legacy: { ...baseline.legacy, ...(source.legacy ?? {}), dynasties: [...(source.legacy?.dynasties ?? [])] },
  };
  state.player.villageLife ??= { supplies: { food: 0 }, fatigue: 0, party: [], hp: 100, maxHp: 100, injuries: [] };
  state.player.villageLife.supplies ??= { food: 0, torches: 0 };
  state.player.villageLife.party ??= [];
  state.player.metrics ??= {};
  synchronizeCompanions(state);
  return state;
}

function prepared(state) {
  const next = clone(state);
  normalizeLifeToRealmState(next);
  return next;
}

function logPersonal(state, title, detail) {
  state.player.history ??= [];
  state.player.history.unshift({ turn: state.turn ?? 0, year: state.year, month: state.month, title, detail });
  state.player.history = state.player.history.slice(0, 80);
}

function advanceTimeAndNeeds(state, minutes, hungerChange = 0, fatigueChange = 0) {
  const before = currentClock(state);
  let next = advanceGeneratedWorldTime(state, minutes);
  normalizeLifeToRealmState(next);
  const body = next.player.lifeToRealm.body;
  body.hunger = clamp((Number(body.hunger) || 0) + hungerChange, 0, 100);
  body.lastClockMinutes = Math.max(before, currentClock(next));
  next.player.villageLife.fatigue = clamp((Number(next.player.villageLife.fatigue) || 0) + fatigueChange, 0, 100);
  if (body.hunger >= 90) {
    next.player.villageLife.hp = Math.max(1, (Number(next.player.villageLife.hp) || 1) - 5);
    body.conditionHistory.unshift({ turn: next.turn ?? 0, type: "starvation", label: "飢えでHPを5失った" });
  }
  return next;
}

export function performLifeAction(state, actionId) {
  const action = LIFE_ACTIONS[actionId];
  if (!action) throw new Error("不明な生活行動です");
  let next = prepared(state);
  const body = next.player.lifeToRealm.body;
  const home = next.player.lifeToRealm.home;
  const wealth = Number(next.player.metrics.wealth) || 0;
  if (actionId === "local_work" && (body.hunger >= 85 || next.player.villageLife.fatigue >= 85)) throw new Error("空腹か疲労が強く、働く前に休養と食事が必要です");
  if (actionId === "eat_ration" && next.player.villageLife.supplies.food < 1) throw new Error("食べられる保存食がありません");
  if (actionId === "treat_wounds" && wealth < 2) throw new Error("治療には財産2が必要です");
  if (actionId === "repay_debt") {
    if (home.debt <= 0) throw new Error("返済する生活負債はありません");
    if (wealth < 1) throw new Error("返済には財産1が必要です");
    next.player.metrics.wealth -= 1;
    home.debt = Math.max(0, home.debt - 1);
    if (home.debt === 0) home.missedPayments = 0;
    next = advanceTimeAndNeeds(next, action.minutes, 1, 0);
    logPersonal(next, "生活負債を返済", `残る生活負債は${home.debt}。`);
    return next;
  }
  if (actionId === "rest_inn") {
    if (wealth >= 1) next.player.metrics.wealth -= 1;
    else { home.debt += 1; home.missedPayments += 1; }
  } else {
    next.player.metrics.wealth = Math.max(0, wealth + (action.wealth ?? 0));
  }
  if (action.food) next.player.villageLife.supplies.food += action.food;
  next = advanceTimeAndNeeds(next, action.minutes, action.hunger ?? 0, action.fatigue ?? 0);
  if (actionId === "camp") {
    const danger = (currentClock(next) + String(next.generatedWorld?.seed ?? "").length) % 4 === 0;
    if (danger) {
      next.player.villageLife.hp = Math.max(1, next.player.villageLife.hp - 4);
      next.player.villageLife.injuries ??= [];
      next.player.villageLife.injuries.push("野営中の襲撃傷");
    }
  }
  if (actionId === "treat_wounds") {
    next.player.villageLife.hp = Math.min(next.player.villageLife.maxHp, next.player.villageLife.hp + 30);
    next.player.villageLife.injuries = (next.player.villageLife.injuries ?? []).slice(1);
  }
  logPersonal(next, action.name, `${action.description} 空腹${next.player.lifeToRealm.body.hunger}、疲労${next.player.villageLife.fatigue}。`);
  return next;
}

function livelihoodOffers(state) {
  const { runtime, region } = currentRegion(state);
  const clock = currentClock(state);
  const period = Math.floor(clock / (3 * 24 * 60));
  const neighbors = region.neighborIds.map((id) => runtime.nations.regions.find((entry) => entry.id === id)).filter(Boolean);
  const destinationA = neighbors[0] ?? region;
  const destinationB = neighbors[1] ?? destinationA;
  return [
    { id: `livelihood:${region.id}:${period}:labor`, kind: "local_labor", title: `${region.name}の荷役仕事`, description: "半日働けば確実に稼げるが、疲労と空腹が増える。", originRegionId: region.id, targetRegionId: region.id, targetRegionName: region.name, deadlineMinutes: clock + 12 * 60, durationMinutes: 240, reward: { wealth: 2, renown: 0 }, risk: "有利" },
    { id: `livelihood:${region.id}:${period}:courier`, kind: "courier", title: `${destinationA.name}への期限便`, description: "通常移動で隣の地方へ届ける。道中の食料と時間が必要。", originRegionId: region.id, targetRegionId: destinationA.id, targetRegionName: destinationA.name, deadlineMinutes: clock + 2 * 24 * 60, durationMinutes: 60, reward: { wealth: 5, renown: 1 }, risk: "互角" },
    { id: `livelihood:${region.id}:${period}:escort`, kind: "escort", title: `${destinationB.name}行き隊商の護衛`, description: "遠方へ同行し、拘束時間と危険の代わりに高い報酬を得る。", originRegionId: region.id, targetRegionId: destinationB.id, targetRegionName: destinationB.name, deadlineMinutes: clock + 3 * 24 * 60, durationMinutes: 120, reward: { wealth: 7, renown: 2 }, risk: "危険" },
  ];
}

export function acceptLivelihoodContract(state, contractId) {
  const next = prepared(state);
  const livelihood = next.player.lifeToRealm.livelihood;
  if (livelihood.activeContract) throw new Error("すでに請け負っている仕事があります");
  const offer = livelihoodOffers(next).find((entry) => entry.id === contractId);
  if (!offer) throw new Error("その仕事は掲示板から外れています");
  livelihood.activeContract = { ...clone(offer), acceptedMinutes: currentClock(next), status: "accepted" };
  logPersonal(next, `${offer.title}を受注`, `${offer.targetRegionName}、期限${offer.deadlineMinutes}分。`);
  return next;
}

export function completeLivelihoodContract(state) {
  let next = prepared(state);
  const livelihood = next.player.lifeToRealm.livelihood;
  const contract = livelihood.activeContract;
  if (!contract) throw new Error("報告できる仕事がありません");
  if (currentClock(next) > contract.deadlineMinutes) {
    livelihood.history.unshift({ ...clone(contract), outcome: "expired", completedMinutes: currentClock(next) });
    livelihood.activeContract = null;
    next.player.metrics.renown = Math.max(0, (Number(next.player.metrics.renown) || 0) - 1);
    logPersonal(next, `${contract.title}に失敗`, "期限を過ぎ、報酬と信用を失った。年代記はそのまま続く。" );
    return next;
  }
  if (next.generatedWorld?.expeditionRegionId !== contract.targetRegionId) throw new Error("仕事の目的地へ実際に移動してください");
  next = advanceTimeAndNeeds(next, contract.durationMinutes, contract.kind === "local_labor" ? 14 : 5, contract.kind === "local_labor" ? 18 : 7);
  const active = next.player.lifeToRealm.livelihood.activeContract;
  next.player.metrics.wealth = (Number(next.player.metrics.wealth) || 0) + active.reward.wealth;
  next.player.metrics.renown = (Number(next.player.metrics.renown) || 0) + active.reward.renown;
  next.player.progress.contracts = (Number(next.player.progress.contracts) || 0) + 1;
  next.player.lifeToRealm.livelihood.history.unshift({ ...clone(active), outcome: "completed", completedMinutes: currentClock(next) });
  next.player.lifeToRealm.livelihood.history = next.player.lifeToRealm.livelihood.history.slice(0, 30);
  next.player.lifeToRealm.livelihood.activeContract = null;
  logPersonal(next, `${active.title}を完了`, `財産${active.reward.wealth}、名声${active.reward.renown}を得た。`);
  return next;
}

export function payCompanionWages(state, memberId) {
  const next = prepared(state);
  const agency = next.player.lifeToRealm.companions[memberId];
  if (!agency || agency.status === "departed") throw new Error("賃金を支払える同行者ではありません");
  const amount = agency.monthlyWage * agency.wageArrears;
  if (amount <= 0) throw new Error("未払い賃金はありません");
  if (next.player.metrics.wealth < amount) throw new Error(`賃金の支払いに財産${amount}が必要です`);
  next.player.metrics.wealth -= amount;
  agency.wageArrears = 0;
  agency.loyalty = clamp(agency.loyalty + 6, 0, 100);
  agency.morale = clamp(agency.morale + 10, 0, 100);
  agency.request = null;
  logPersonal(next, `${agency.name}へ賃金を支給`, `財産${amount}を払い、同行関係を立て直した。`);
  return next;
}

export function answerCompanionRequest(state, memberId, decision) {
  const next = prepared(state);
  const agency = next.player.lifeToRealm.companions[memberId];
  if (!agency?.request) throw new Error("回答待ちの要望はありません");
  if (decision === "accept" && agency.request.type === "wages") return payCompanionWages(next, memberId);
  if (decision !== "refuse") throw new Error("要望への回答が不正です");
  agency.loyalty = clamp(agency.loyalty - 10, 0, 100);
  agency.morale = clamp(agency.morale - 8, 0, 100);
  agency.request = null;
  next.player.lifeToRealm.household.disputes.unshift({ turn: next.turn ?? 0, memberId, type: "refused_request" });
  logPersonal(next, `${agency.name}の要望を拒否`, "未払いと不満を残したまま同行を求めた。" );
  return next;
}

function assertLord(state) {
  if ((stageOrder[state.player?.stage] ?? 0) < 3) throw new Error("城または所領を預かる地位が必要です");
}

export function getCareerAdvancementView(state) {
  const next = prepared(state);
  const life = next.player.lifeToRealm;
  const metrics = next.player.metrics;
  const victories = life.campaign.history.filter((entry) => entry.outcome === "victory").length;
  const rewards = life.household.rewards.length;
  const completedProjects = life.fief.completed.length;
  const definitions = {
    castellan: {
      actionId: "earn_lordship", nextStage: "lord", name: "城下経営の実績を示す",
      requirements: [{ label: "完成した所領事業", value: completedProjects, target: 1 }],
    },
    multi_lord: {
      actionId: "accept_governorship", nextStage: "governor", name: "辺境総督職を引き受ける",
      requirements: [
        { label: "完成した所領事業", value: completedProjects, target: 2 },
        { label: "家臣への恩賞", value: rewards, target: 1 },
      ],
    },
    governor: {
      actionId: "form_ducal_faction", nextStage: "duke", name: "地方諸侯を盟約に束ねる",
      requirements: [{ label: "大戦役の勝利", value: victories, target: 1 }],
    },
    duke: {
      actionId: "accept_regency", nextStage: "regent", name: "摂政就任を受諾する",
      requirements: [
        { label: "家臣への恩賞", value: rewards, target: 2 },
        { label: "家臣支持", value: Number(metrics.householdSupport) || 0, target: 55 },
      ],
    },
    regent: {
      actionId: "assume_crown", nextStage: "independent_ruler", name: "諸侯会議で新国家を樹立する",
      requirements: [
        { label: "家臣支持", value: Number(metrics.householdSupport) || 0, target: 55 },
        { label: "領民支持", value: Number(metrics.popularSupport) || 0, target: 50 },
        { label: "正統性", value: Number(metrics.legitimacy) || 0, target: 50 },
      ],
    },
  };
  const advancement = definitions[next.player.stage];
  if (!advancement) return null;
  const requirements = advancement.requirements.map((entry) => ({ ...entry, complete: entry.value >= entry.target }));
  return { ...advancement, requirements, ready: requirements.every((entry) => entry.complete) };
}

export function startFiefProject(state, { projectId, territoryId, officerId } = {}) {
  const next = prepared(state);
  assertLord(next);
  const definition = FIEF_PROJECT_DEFINITIONS[projectId];
  const holding = next.player.holdings.find((entry) => entry.territoryId === territoryId);
  const city = next.cities?.[territoryId];
  if (!definition || !holding || !city) throw new Error("自領で実行できる事業ではありません");
  if (next.player.lifeToRealm.fief.projects.some((entry) => entry.territoryId === territoryId)) throw new Error("この所領では別の事業が進行中です");
  const eligible = new Set(["player", ...(next.player.householdRetainers ?? [])]);
  if (!eligible.has(officerId)) throw new Error("担当者は本人または直属家臣から選んでください");
  if (city.resources.money < definition.cost) throw new Error("所領金庫が不足しています");
  city.resources.money -= definition.cost;
  next.player.lifeToRealm.fief.projects.push({
    id: `fief:${territoryId}:${projectId}:${next.turn ?? 0}`,
    projectId, name: definition.name, territoryId, officerId, cost: definition.cost,
    startedTurn: next.turn ?? 0, remainingMonths: definition.duration, status: "active",
  });
  logPersonal(next, `${definition.name}を着工`, `${territoryDisplayName(next, territoryId)}の金庫から${definition.cost}を確保し、${officerId === "player" ? "本人" : next.officers?.[officerId]?.name ?? officerId}を担当にした。`);
  return next;
}

function applyFiefProject(state, project) {
  const city = state.cities[project.territoryId];
  if (project.projectId === "road_network") { city.facilities.road.condition = clamp(city.facilities.road.condition + 15, 0, 100); city.resources.commerce = clamp(city.resources.commerce + 2, 0, 100); }
  if (project.projectId === "granary") { city.resources.food += 500; city.resources.support = clamp(city.resources.support + 1, 0, 100); }
  if (project.projectId === "patrol") { city.resources.security = clamp(city.resources.security + 5, 0, 100); city.resources.support = clamp(city.resources.support + 1, 0, 100); }
  if (project.projectId === "relief") { city.resources.support = clamp(city.resources.support + 6, 0, 100); city.resources.population += 60; }
  if (project.projectId === "levy") { city.military.troops += 120; city.resources.support = clamp(city.resources.support - 3, 0, 100); }
  if (project.officerId !== "player" && state.officers?.[project.officerId]) {
    state.officers[project.officerId].merit = (Number(state.officers[project.officerId].merit) || 0) + 18;
    state.officers[project.officerId].loyalty = clamp((Number(state.officers[project.officerId].loyalty) || 0) + 2, 0, 100);
  }
  state.player.metrics.civilMerit = (Number(state.player.metrics.civilMerit) || 0) + 6;
  state.player.lifeToRealm.fief.completed.unshift({ ...project, status: "completed", completedTurn: state.turn ?? 0 });
  logPersonal(state, `${project.name}が完成`, "担当者の功績と所領の実値へ成果を反映した。" );
}

function householdMembers(state) {
  const rewards = state.player.lifeToRealm.household.rewards;
  return (state.player.householdRetainers ?? []).map((id) => {
    const officer = state.officers?.[id];
    if (!officer) return null;
    const lastReward = rewards.find((entry) => entry.officerId === id);
    const demand = (Number(officer.merit) || 0) >= 100 && (!lastReward || (state.turn ?? 0) - lastReward.turn >= 3)
      ? { type: "reward", text: `${officer.merit}の功績に見合う恩賞を求めている。` }
      : null;
    return { id, name: officer.name ?? id, rank: officer.rank, loyalty: officer.loyalty, merit: officer.merit, demand };
  }).filter(Boolean);
}

export function grantHouseholdReward(state, officerId, rewardId) {
  const next = prepared(state);
  assertLord(next);
  const reward = HOUSEHOLD_REWARDS[rewardId];
  const officer = next.officers?.[officerId];
  if (!reward || !officer || !next.player.householdRetainers.includes(officerId)) throw new Error("恩賞対象または恩賞種別が不正です");
  if (next.player.metrics.wealth < reward.wealthCost) throw new Error("恩賞に必要な財産が不足しています");
  next.player.metrics.wealth -= reward.wealthCost;
  officer.loyalty = clamp((Number(officer.loyalty) || 0) + reward.loyalty, 0, 100);
  if (rewardId === "office") { officer.rankLevel = (Number(officer.rankLevel) || 0) + 1; officer.rank = `重臣・${officer.rank ?? "家臣"}`; next.player.lifeToRealm.household.factionTension += 4; }
  next.player.metrics.householdSupport = clamp((Number(next.player.metrics.householdSupport) || 0) + reward.support, 0, 100);
  next.player.lifeToRealm.household.rewards.unshift({ id: `reward:${next.turn}:${officerId}:${rewardId}`, turn: next.turn ?? 0, officerId, officerName: officer.name ?? officerId, rewardId, rewardName: reward.name, meritAtReward: officer.merit });
  logPersonal(next, `${officer.name ?? officerId}へ${reward.name}`, `功績${officer.merit}へ報い、忠誠は${officer.loyalty}となった。`);
  return next;
}

function campaignOptions(state) {
  if ((stageOrder[state.player?.stage] ?? 0) < 4) return [];
  const { runtime, region } = currentRegion(state);
  return region.neighborIds.map((id) => runtime.nations.regions.find((entry) => entry.id === id)).filter(Boolean).map((target) => ({ targetRegionId: target.id, targetRegionName: target.name, nationId: target.nationId, borderType: target.nationId === region.nationId ? "internal" : "foreign" }));
}

export function startRealmCampaign(state, { targetRegionId, objectiveId, commanderIds = [] } = {}) {
  const next = prepared(state);
  assertLord(next);
  const campaignState = next.player.lifeToRealm.campaign;
  if (campaignState.active) throw new Error("すでに進行中の戦役があります");
  const target = campaignOptions(next).find((entry) => entry.targetRegionId === targetRegionId);
  const objective = REALM_CAMPAIGN_OBJECTIVES[objectiveId];
  if (!target || !objective) throw new Error("作戦対象または政治目的が不正です");
  const eligible = new Set(["player", ...(next.player.householdRetainers ?? [])]);
  const selected = [...new Set(commanderIds)];
  if (selected.length !== 2 || selected.some((id) => !eligible.has(id))) throw new Error("二つの軍団へ本人または直属家臣を一人ずつ割り当ててください");
  if (next.player.metrics.wealth < 5) throw new Error("軍団集結には財産5が必要です");
  next.player.metrics.wealth -= 5;
  const armies = selected.map((commanderId, index) => ({
    id: `army:${index + 1}`, name: index === 0 ? "主力軍" : "支援軍", commanderId,
    commanderName: commanderId === "player" ? next.player.name : next.officers?.[commanderId]?.name ?? commanderId,
    initialSupply: index === 0 ? 60 : 50, supply: index === 0 ? 60 : 50,
    strength: index === 0 ? 46 : 34, casualties: 0, routeProgress: 0,
  }));
  campaignState.active = {
    id: `realm-campaign:${next.turn ?? 0}:${targetRegionId}`,
    originRegionId: next.generatedWorld.expeditionRegionId,
    targetRegionId, targetRegionName: target.targetRegionName, targetNationId: target.nationId,
    objectiveId, objectiveName: objective.name, phase: "mustering", startedTurn: next.turn ?? 0,
    armies, outcome: null, report: [],
  };
  logPersonal(next, `${target.targetRegionName}への戦役を開始`, `${objective.name}を目的に二軍団を集結させた。`);
  return next;
}

export function advanceRealmCampaign(state) {
  let next = prepared(state);
  const active = next.player.lifeToRealm.campaign.active;
  if (!active) throw new Error("進行中の戦役がありません");
  if (active.phase === "mustering") {
    active.armies.forEach((army) => { army.supply = Math.max(0, army.supply - 6); army.routeProgress = 10; });
    active.phase = "marching";
    active.report.unshift("二軍団が別々の進路で国境へ集結した。");
    next = advanceTimeAndNeeds(next, 24 * 60, 10, 8);
    return next;
  }
  if (active.phase === "marching") {
    active.armies.forEach((army, index) => { army.supply = Math.max(0, army.supply - (index === 0 ? 12 : 10)); army.casualties += index + 1; army.strength = Math.max(1, army.strength - (index + 1)); army.routeProgress = 100; });
    active.phase = "engaged";
    active.report.unshift("主力と支援軍が補給を消費し、目標地方で会合した。");
    next = advanceTimeAndNeeds(next, 24 * 60, 12, 10);
    return next;
  }
  if (active.phase !== "engaged") throw new Error("進行できない戦役段階です");
  const objective = REALM_CAMPAIGN_OBJECTIVES[active.objectiveId];
  active.armies.forEach((army) => { army.supply = Math.max(0, army.supply - 12); army.casualties += 2; army.strength = Math.max(1, army.strength - 2); });
  const strength = active.armies.reduce((sum, army) => sum + army.strength + Math.floor(army.supply / 10), 0);
  const seedBias = [...String(next.generatedWorld?.seed ?? "campaign")].reduce((sum, character) => sum + character.codePointAt(0), 0) % 17;
  const won = strength + seedBias >= objective.difficulty;
  const record = { ...clone(active), outcome: won ? "victory" : "defeat", completedTurn: next.turn ?? 0, finalStrength: strength };
  next.player.lifeToRealm.campaign.history.unshift(record);
  next.player.lifeToRealm.campaign.history = next.player.lifeToRealm.campaign.history.slice(0, 20);
  next.player.lifeToRealm.campaign.active = null;
  if (won) {
    next.player.metrics.martialMerit = (Number(next.player.metrics.martialMerit) || 0) + objective.reward;
    next.player.metrics.legitimacy = clamp((Number(next.player.metrics.legitimacy) || 0) + 3, 0, 100);
    const runtime = buildGeneratedWorld(next);
    const ownerExists = runtime.nations.nations.some((nation) => nation.id === next.generatedWorld.playerNationId);
    if (next.player.sovereign && ownerExists) next = transferGeneratedRegionControl(next, active.targetRegionId, next.generatedWorld.playerNationId, { reason: `${objective.name}戦役の勝利`, actorId: next.player.id });
  } else {
    next.player.metrics.householdSupport = clamp((Number(next.player.metrics.householdSupport) || 0) - 3, 0, 100);
    next.player.metrics.popularSupport = clamp((Number(next.player.metrics.popularSupport) || 0) - 2, 0, 100);
  }
  normalizeLifeToRealmState(next);
  logPersonal(next, won ? `${active.targetRegionName}戦役に勝利` : `${active.targetRegionName}戦役から撤退`, `二軍団の補給と損害を精算し、${won ? `武勲${objective.reward}を得た` : "家中と領民の支持を失った"}。`);
  return next;
}

function lifePathProgress(state, pathId) {
  const path = LIFE_PATHS[pathId];
  if (!path) return null;
  const life = state.player.lifeToRealm;
  const tradeHistory = state.player.merchantTrade?.history?.length ?? state.player.merchantTrade?.transactions?.length ?? 0;
  const crimeIncidents = state.player.crime?.incidents?.length ?? 0;
  const militaryHistory = state.player.militaryCareer?.history?.length ?? 0;
  const dungeonCount = state.adventure?.completedDungeonIds?.length ?? 0;
  const checks = {
    adventurer: [{ label: "依頼達成", value: state.player.progress?.contracts ?? 0, target: 3 }, { label: "ギルド功績", value: state.player.villageLife?.guildMerit ?? 0, target: 30 }],
    merchant: [{ label: "交易履歴", value: tradeHistory, target: 3 }, { label: "財産", value: state.player.metrics.wealth ?? 0, target: 20 }],
    outlaw: [{ label: "事件", value: crimeIncidents, target: 3 }, { label: "裏社会接点", value: Object.keys(state.player.crime?.contacts ?? {}).length, target: 1 }],
    loyalist: [{ label: "軍務報告", value: militaryHistory, target: 2 }, { label: "主君の信頼", value: state.player.metrics.liegeTrust ?? 0, target: 50 }],
    founder: [{ label: "所領", value: state.player.holdings?.length ?? 0, target: 1 }, { label: "独立君主", value: state.player.sovereign ? 1 : 0, target: 1 }],
    chronicler: [{ label: "年代記", value: state.player.history?.length ?? 0, target: 20 }, { label: "踏破地点", value: dungeonCount, target: 2 }],
  }[pathId];
  return { ...path, checks, complete: checks.every((entry) => entry.value >= entry.target), claimed: life.lifePath.claimedIds.includes(pathId) };
}

export function chooseLifePath(state, pathId) {
  const next = prepared(state);
  if (!LIFE_PATHS[pathId]) throw new Error("不明な人生目標です");
  next.player.lifeToRealm.lifePath.activeId = pathId;
  next.player.lifeToRealm.lifePath.chosenTurn = next.turn ?? 0;
  logPersonal(next, `人生目標「${LIFE_PATHS[pathId].name}」を選択`, LIFE_PATHS[pathId].description);
  return next;
}

export function claimLifePathMilestone(state) {
  const next = prepared(state);
  const activeId = next.player.lifeToRealm.lifePath.activeId;
  const progress = lifePathProgress(next, activeId);
  if (!progress?.complete) throw new Error("人生目標の条件を満たしていません");
  if (progress.claimed) throw new Error("この人生目標の達成報酬は受領済みです");
  next.player.lifeToRealm.lifePath.claimedIds.push(activeId);
  next.player.lifeToRealm.lifePath.epithets.push(progress.epithet);
  next.player.metrics.wealth = (Number(next.player.metrics.wealth) || 0) + 4;
  next.player.metrics.legitimacy = clamp((Number(next.player.metrics.legitimacy) || 0) + 2, 0, 100);
  logPersonal(next, `二つ名「${progress.epithet}」を得る`, `${progress.name}としての歩みが地域社会に認められた。`);
  return next;
}

function successionCandidates(state) {
  const party = (state.player.villageLife?.party ?? []).filter((member) => member.alive !== false && member.active !== false).map((member) => ({ id: member.id, name: member.name, role: member.role ?? "同行者", source: "companion", abilities: member.abilities, hp: member.hp, maxHp: member.maxHp }));
  const household = (state.player.householdRetainers ?? []).map((id) => state.officers?.[id] ? ({ id, name: state.officers[id].name ?? id, role: state.officers[id].rank ?? "家臣", source: "retainer", abilities: state.officers[id].abilities }) : null).filter(Boolean);
  return [...party, ...household.filter((entry) => !party.some((member) => member.id === entry.id))];
}

export function designateHeir(state, heirId) {
  const next = prepared(state);
  if (!next.player.sovereign) throw new Error("後継者を正式に指名できるのは君主だけです");
  const candidate = successionCandidates(next).find((entry) => entry.id === heirId);
  if (!candidate) throw new Error("後継者候補に存在しない人物です");
  next.player.lifeToRealm.legacy.heirId = heirId;
  logPersonal(next, `${candidate.name}を後継者に指名`, `${candidate.role}を次代の統治者として公示した。`);
  return next;
}

export function executeSuccession(state, legacyChoiceId) {
  const next = prepared(state);
  const legacyChoice = LEGACY_CHOICES[legacyChoiceId];
  const legacy = next.player.lifeToRealm.legacy;
  const candidate = successionCandidates(next).find((entry) => entry.id === legacy.heirId);
  if (!next.player.sovereign || !candidate || !legacyChoice) throw new Error("後継者と継承する遺産を確定してください");
  const outgoing = { generation: legacy.generation, id: next.player.id, name: next.player.name, title: next.player.title, retiredTurn: next.turn ?? 0, historyCount: next.player.history?.length ?? 0, legacyChoiceId };
  legacy.dynasties.unshift(outgoing);
  legacy.generation += 1;
  legacy.lastInheritance = { from: outgoing.name, to: candidate.name, choiceId: legacyChoiceId, turn: next.turn ?? 0 };
  legacy.heirId = null;
  next.player.id = `player:g${legacy.generation}:${candidate.id}`;
  next.player.name = candidate.name;
  next.player.origin = `${outgoing.name}が指名した${candidate.role}`;
  if (candidate.abilities) next.player.abilities = clone(candidate.abilities);
  if (candidate.maxHp) { next.player.villageLife.maxHp = candidate.maxHp; next.player.villageLife.hp = Math.max(1, candidate.hp ?? candidate.maxHp); }
  next.player.villageLife.party = next.player.villageLife.party.filter((member) => member.id !== candidate.id);
  if (next.adventure?.party) next.adventure.party = next.adventure.party.filter((member) => member.id !== candidate.id);
  if (legacyChoiceId === "chronicle") next.player.metrics.legitimacy = clamp((Number(next.player.metrics.legitimacy) || 0) + 8, 0, 100);
  if (legacyChoiceId === "institution") { next.player.metrics.civilMerit = (Number(next.player.metrics.civilMerit) || 0) + 12; next.player.metrics.householdSupport = clamp((Number(next.player.metrics.householdSupport) || 0) + 6, 0, 100); next.player.metrics.popularSupport = clamp((Number(next.player.metrics.popularSupport) || 0) + 6, 0, 100); }
  if (legacyChoiceId === "house") next.player.metrics.wealth = (Number(next.player.metrics.wealth) || 0) + 6;
  synchronizeCompanions(next);
  logPersonal(next, `${candidate.name}への継承`, `${outgoing.name}は退き、${legacyChoice.name}ことを選んで第${legacy.generation}代へ年代記を渡した。`);
  return next;
}

export function advanceLifeToRealmMonth(state) {
  const next = prepared(state);
  const life = next.player.lifeToRealm;
  const salary = [0, 2, 4, 4, 6, 8, 9, 10, 11, 12][stageOrder[next.player.stage] ?? 0] ?? 0;
  next.player.metrics.wealth = (Number(next.player.metrics.wealth) || 0) + salary;
  if (next.player.metrics.wealth >= life.home.monthlyRent) next.player.metrics.wealth -= life.home.monthlyRent;
  else { life.home.debt += life.home.monthlyRent; life.home.missedPayments += 1; }
  Object.values(life.companions).forEach((agency) => {
    if (agency.status === "departed") return;
    agency.wageArrears += 1;
    agency.loyalty = clamp(agency.loyalty - 4, 0, 100);
    agency.morale = clamp(agency.morale - 10, 0, 100);
    agency.request = { type: "wages", text: `未払い${agency.wageArrears}か月。月給${agency.monthlyWage}の支払いを求めている。` };
    if (agency.wageArrears >= 3) {
      agency.status = "departed";
      agency.request = null;
      const member = next.player.villageLife.party.find((entry) => entry.id === agency.id);
      if (member) member.active = false;
      const adventureMember = next.adventure?.party?.find((entry) => entry.id === agency.id);
      if (adventureMember) adventureMember.active = false;
      logPersonal(next, `${agency.name}が離脱`, "三か月の未払いにより同行契約を解消した。" );
    }
  });
  const remaining = [];
  life.fief.projects.forEach((project) => {
    const advanced = { ...project, remainingMonths: project.remainingMonths - 1 };
    if (advanced.remainingMonths <= 0) applyFiefProject(next, advanced);
    else remaining.push(advanced);
  });
  life.fief.projects = remaining;
  life.household.factionTension = Math.max(0, life.household.factionTension - 1);
  return next;
}

export function getLifeToRealmView(state) {
  const next = prepared(state);
  const life = next.player.lifeToRealm;
  const { region } = currentRegion(next);
  const activePath = life.lifePath.activeId ? lifePathProgress(next, life.lifePath.activeId) : null;
  return {
    clockMinutes: currentClock(next),
    body: { ...clone(life.body), fatigue: next.player.villageLife.fatigue, hp: next.player.villageLife.hp, maxHp: next.player.villageLife.maxHp, food: next.player.villageLife.supplies.food, warnings: [life.body.hunger >= 80 ? "空腹" : null, next.player.villageLife.fatigue >= 80 ? "疲労" : null, life.home.debt > 0 ? "生活負債" : null].filter(Boolean) },
    home: clone(life.home),
    lifeActions: Object.values(LIFE_ACTIONS),
    livelihood: { currentRegionId: region.id, currentRegionName: region.name, offers: livelihoodOffers(next), activeContract: clone(life.livelihood.activeContract), history: clone(life.livelihood.history.slice(0, 5)) },
    companions: Object.values(life.companions).map((entry) => clone(entry)),
    fief: { available: (stageOrder[next.player.stage] ?? 0) >= 3, definitions: Object.values(FIEF_PROJECT_DEFINITIONS), projects: clone(life.fief.projects), completed: clone(life.fief.completed.slice(0, 5)), holdings: next.player.holdings.map((holding) => ({ ...holding, name: holding.territoryId })), officers: [{ id: "player", name: next.player.name }, ...householdMembers(next).map((member) => ({ id: member.id, name: member.name }))] },
    household: { available: (stageOrder[next.player.stage] ?? 0) >= 4, members: householdMembers(next), rewards: Object.values(HOUSEHOLD_REWARDS), history: clone(life.household.rewards.slice(0, 5)), factionTension: life.household.factionTension },
    campaign: { available: (stageOrder[next.player.stage] ?? 0) >= 4, options: campaignOptions(next), objectives: Object.values(REALM_CAMPAIGN_OBJECTIVES), active: clone(life.campaign.active), history: clone(life.campaign.history.slice(0, 5)), commanders: [{ id: "player", name: next.player.name }, ...householdMembers(next).map((member) => ({ id: member.id, name: member.name }))] },
    lifePath: { paths: Object.values(LIFE_PATHS).map((path) => lifePathProgress(next, path.id)), active: activePath, epithets: [...life.lifePath.epithets] },
    succession: { available: Boolean(next.player.sovereign), candidates: successionCandidates(next), heirId: life.legacy.heirId, choices: Object.values(LEGACY_CHOICES), generation: life.legacy.generation, dynasties: clone(life.legacy.dynasties) },
    advancement: getCareerAdvancementView(next),
  };
}
