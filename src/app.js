import {
  ADMINISTRATION_MANDATES,
  ADMINISTRATION_MODES,
  AFTERMATH_POLICIES,
  BORDER_SETTLEMENTS,
  AUTHORITY_DOMAINS,
  AUTHORITY_REFORM_STAGES,
  AUTHORITY_TRANSFER_METHODS,
  COMMANDS,
  DOCTRINES,
  EVENT_DEFINITIONS,
  FACILITIES,
  FACTION_ACTIONS,
  FACTION_DEFINITIONS,
  FORCED_ORDER_RULES,
  FORMATIONS,
  PRESSURE_DEFINITIONS,
  POLICY_DEFINITIONS,
  OCCUPATION_POLICIES,
  REVENUE_CATEGORIES,
  SPENDING_CATEGORIES,
  WAR_OBJECTIVES,
  WAR_PLANS,
  WORLD,
  acknowledgeMonthReport,
  adoptDoctrine,
  answerOfficerDemand,
  appointForceOfficer,
  cancelOrder,
  chooseAftermathPolicy,
  commitMonth,
  createInitialState,
  declareWar,
  deriveCityMetrics,
  deriveAdministrationNetwork,
  deriveMonthPreview,
  deriveMetrics,
  deriveRealmLedger,
  formatDate,
  getCityBreakdown,
  getCityAdministration,
  getCentralizationResult,
  getAuthorityReform,
  getRegionAuthority,
  getCampaignStatus,
  getBorderNegotiationStatus,
  getCommandAvailability,
  getContinentalBalance,
  getCountryReport,
  getCouncilProposals,
  getEligibleOfficers,
  getEnemyCommander,
  getGovernance,
  getGreatPowerFoundation,
  getHistoricalOverview,
  getFoodSecurityStatus,
  getAftermathDecisionStatus,
  getForeignDispatches,
  getMilitarySummary,
  getPeaceOptions,
  getOfficerReport,
  getOfficerPoliticalReport,
  getTaskForecast,
  getTownAdministration,
  getTurnGuidance,
  getTurnWarnings,
  getWarCouncilReport,
  getWarDeclarationEstimate,
  getWarSupport,
  getWarPlanOptions,
  getWarStage,
  isTownCommand,
  negotiatePeace,
  normalizeWarState,
  queueOrder,
  resolveBorderNegotiation,
  resolveAftermathDecisionChoice,
  resolveEventChoice,
  releaseOccupation,
  setFormation,
  setAdministrationMandate,
  setAdministrationMode,
  startAuthorityReform,
  setOccupationGarrison,
  setOccupationPolicy,
  setWarPlan,
} from "./simulation.js";
import {
  NOTION_OTHER_RACE_IDS,
  PEOPLES,
  PEOPLE_REPRESENTATIVES,
  SETTING_NATIONS,
  getDiplomaticDelegate,
  getNationRelations,
  getNationsForPeople,
  getPeopleForNation,
  getWorldCatalogSummary,
} from "./world-catalog.js";
import { createGameAudio } from "./audio.js";
import { subdivideTerritoryTiles } from "./map-tiles.js";
import {
  RESOURCE_CATEGORIES,
  STATISTICS_BASIS,
  getNationStatistics,
  getResourceGrade,
  getResourcePower,
  getResourceRanking,
  getWorldStatisticsSummary,
} from "./world-statistics.js";

const STORAGE_KEY = "oathbound-continental-grand-strategy-v9";
const LEGACY_STORAGE_KEYS = ["oathbound-continental-grand-strategy-v8", "oathbound-continental-grand-strategy-v7", "oathbound-continental-grand-strategy-v6"];

const CITY_ART = Object.freeze({
  selene: "./assets/generated/city-selene.webp",
  nereia: "./assets/generated/city-nereia.webp",
  orta: "./assets/generated/city-orta.webp",
});

const EVENT_ART = Object.freeze({
  crop_failure: "./assets/generated/event-natural-disaster.webp",
  flood: "./assets/generated/event-natural-disaster.webp",
  bandits: "./assets/generated/event-unrest.webp",
  refugees: "./assets/generated/event-unrest.webp",
  peasant_revolt: "./assets/generated/event-unrest.webp",
  epidemic: "./assets/generated/event-civic-crisis.webp",
  corruption: "./assets/generated/event-civic-crisis.webp",
  merchant_exit: "./assets/generated/event-civic-crisis.webp",
});

const FACILITY_SITES = Object.freeze({
  farmland: { area: "城外", name: "外郭農区", detail: "水路と耕地", accent: "#82905c" },
  market: { area: "城内", name: "中央市場区", detail: "市と問屋街", accent: "#b07a43" },
  road: { area: "都市圏", name: "街道・城門区", detail: "街道と城門", accent: "#83765d" },
  granary: { area: "城内", name: "倉庫区", detail: "穀倉と備蓄庫", accent: "#9b8454" },
  barracks: { area: "城郭", name: "城郭兵営区", detail: "兵舎と練兵場", accent: "#8c5e53" },
  office: { area: "中枢", name: "政庁区", detail: "役所と官衙", accent: "#526f6a" },
});

const audio = createGameAudio();

const TERRAIN_TILE_PROFILES = Object.freeze({
  forest: { climate: "湿潤", movement: "高", defense: "+20%", resources: "木材・薬草", risk: "視界不良", summary: "樹冠と獣道が部隊を分散させる一方、伏兵と隠密移動に適する。" },
  plains: { climate: "温暖", movement: "低", defense: "±0%", resources: "穀物・軍馬", risk: "遮蔽物不足", summary: "街道と農地を広げやすく、大軍の展開と補給集積に向く。" },
  hills: { climate: "変化", movement: "中", defense: "+10%", resources: "石材・牧畜", risk: "道路蛇行", summary: "起伏が視界と進路を分断し、峠道や尾根の確保が移動速度を左右する。" },
  mountains: { climate: "寒冷", movement: "極高", defense: "+30%", resources: "鉄・希少鉱", risk: "雪崩・封鎖", summary: "通行可能な谷筋が限られ、少数の守備隊でも進軍を長く阻止できる。" },
  highlands: { climate: "冷涼", movement: "中高", defense: "+15%", resources: "羊毛・鉄", risk: "強風", summary: "岩盤の高地と緩い草原が交互に現れ、季節で交通条件が大きく変わる。" },
  wetland: { climate: "多雨", movement: "高", defense: "+5%", resources: "魚・葦・泥炭", risk: "洪水・疫病", summary: "水路は輸送路になるが、増水時には道路と陣地が同時に失われる。" },
  coast: { climate: "海洋性", movement: "中", defense: "+5%", resources: "塩・水産物", risk: "高潮", summary: "港と沿岸道が交易を支え、海況次第で陸路と海路の優位が入れ替わる。" },
  badlands: { climate: "乾燥", movement: "高", defense: "+10%", resources: "硫黄・色鉱", risk: "水不足", summary: "礫地と涸れ谷が補給を消耗させ、水場の確保が行軍可能距離を決める。" },
});

const MAP_VIEWBOXES = Object.freeze({
  world: "0 0 1800 1050",
  country: "20 35 960 585",
  city: "200 150 620 440",
  village: "250 175 540 400",
});

const AUTHORITY_MAP_LABELS = Object.freeze({
  effective_control: ["EFFECTIVE CONTROL MAP", "総合実効支配"],
  tax_control: ["TAX CONTROL MAP", "徴税支配"],
  military_control: ["MILITARY CONTROL MAP", "軍事支配"],
  justice_control: ["JUSTICE CONTROL MAP", "司法支配"],
  population_knowledge: ["POPULATION KNOWLEDGE MAP", "人口把握率"],
  information_accuracy: ["INFORMATION ACCURACY MAP", "情報精度"],
  administrative_load: ["ADMINISTRATIVE LOAD MAP", "行政負荷"],
  communication_time: ["COMMUNICATION DELAY MAP", "通信所要時間"],
  local_power: ["LOCAL POWER MAP", "地方勢力"],
  grievance: ["HISTORICAL GRIEVANCE MAP", "歴史的不満"],
  loyalty: ["CENTRAL LOYALTY MAP", "中央への忠誠"],
  uniformity: ["INSTITUTIONAL UNIFORMITY MAP", "制度統一度"],
});

function cityArt(cityId) {
  return CITY_ART[cityId] ?? CITY_ART.selene;
}

let state = loadState() ?? createInitialState();
if (state.campaign?.ending) state.council.pending = false;
let toastTimer = null;
let previewCache = { state: null, value: null };
const view = {
  panel: "council",
  spendingCategoryId: "social_security",
  spendingCityId: "selene",
  mapMode: "political",
  scale: "country",
  selectedType: null,
  selectedId: null,
  selectedTileName: null,
  selectedTerrain: null,
  selectedTerrainType: null,
  tileWindowOpen: false,
  tileAnchorX: 0.5,
  tileAnchorY: 0.5,
  selectedCityId: "selene",
  cityTab: "overview",
  selectedTownId: "mugiwano",
  townTab: "overview",
  selectedAuthorityDomain: "justice",
  selectedFacilityId: "farmland",
  warCouncilOpen: false,
  objectiveId: "transit",
  selectedCountryId: "valka",
  assignmentOpen: false,
  assignmentMode: null,
  pendingCommandId: null,
  pendingCityId: null,
  pendingTownId: null,
  pendingForceRole: null,
  atlasMode: "nations",
  selectedNationId: "forest_alliance",
  selectedPeopleId: "acrane",
  worldNationFilter: "all",
  worldGuideOpen: true,
  focusedTownCommandId: null,
  guideOpen: state.turn === 0 && state.council.history.length === 0,
  endingOpen: Boolean(state.campaign?.ending && state.lastViewedEndingId !== state.campaign.ending.id),
  resetOpen: false,
  expertMode: false,
};

const elements = {
  campaignBar: document.querySelector("#campaignBar"),
  resourceLedger: document.querySelector("#resourceLedger"),
  dateLabel: document.querySelector("#dateLabel"),
  dateHint: document.querySelector("#dateHint"),
  endMonthButton: document.querySelector("#endMonthButton"),
  audioToggle: document.querySelector("#audioToggle"),
  audioIcon: document.querySelector("#audioIcon"),
  audioStatus: document.querySelector("#audioStatus"),
  analysisToggle: document.querySelector("#analysisToggle"),
  leftPanel: document.querySelector("#leftPanel"),
  primaryTabs: document.querySelector("#primaryTabs"),
  alertRack: document.querySelector("#alertRack"),
  mapStage: document.querySelector(".map-stage"),
  cityWorkspace: document.querySelector("#cityWorkspace"),
  strategyMap: document.querySelector("#strategyMap"),
  mapModeEyebrow: document.querySelector("#mapModeEyebrow"),
  mapCaptionTitle: document.querySelector("#mapCaptionTitle"),
  mapModeBar: document.querySelector("#mapModeBar"),
  authorityOverlaySelect: document.querySelector("#authorityOverlaySelect"),
  mapScaleSwitch: document.querySelector("#mapScaleSwitch"),
  tileDetailWindow: document.querySelector("#tileDetailWindow"),
  tileDetailTitle: document.querySelector("#tileDetailTitle"),
  tileDetailMeta: document.querySelector("#tileDetailMeta"),
  tileDetailNote: document.querySelector("#tileDetailNote"),
  tileDetailGrid: document.querySelector("#tileDetailGrid"),
  selectionCard: document.querySelector("#selectionCard"),
  chronicleTicker: document.querySelector("#chronicleTicker"),
  outlinerContent: document.querySelector("#outlinerContent"),
  warCouncilModal: document.querySelector("#warCouncilModal"),
  objectiveTabs: document.querySelector("#objectiveTabs"),
  warCouncilReport: document.querySelector("#warCouncilReport"),
  declarationWarning: document.querySelector("#declarationWarning"),
  warCostEstimate: document.querySelector("#warCostEstimate"),
  declareWarButton: document.querySelector("#declareWarButton"),
  assignmentModal: document.querySelector("#assignmentModal"),
  assignmentTitle: document.querySelector("#assignmentTitle"),
  assignmentSummary: document.querySelector("#assignmentSummary"),
  assignmentLedger: document.querySelector("#assignmentLedger"),
  officerCandidates: document.querySelector("#officerCandidates"),
  eventModal: document.querySelector("#eventModal"),
  eventTitle: document.querySelector("#eventTitle"),
  eventSummary: document.querySelector("#eventSummary"),
  eventArt: document.querySelector("#eventArt"),
  eventLocation: document.querySelector("#eventLocation"),
  eventChoices: document.querySelector("#eventChoices"),
  guideModal: document.querySelector("#guideModal"),
  endingModal: document.querySelector("#endingModal"),
  endingContent: document.querySelector("#endingContent"),
  resetModal: document.querySelector("#resetModal"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (![6, 7, 8, 9].includes(parsed.version)) return null;
    parsed.fiscal ??= { publicDebt: 24, totalDebtRepaid: 0 };
    parsed.fiscal.publicDebt = Number.isFinite(parsed.fiscal.publicDebt) ? parsed.fiscal.publicDebt : 24;
    parsed.fiscal.totalDebtRepaid = Number.isFinite(parsed.fiscal.totalDebtRepaid) ? parsed.fiscal.totalDebtRepaid : 0;
    return normalizeWarState(parsed);
  } catch {
    return null;
  }
}

function persist(showMessage = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (showMessage) {
    audio.play("save");
    showToast("年代記をこの端末に記録しました。");
  }
}

function commit(nextState, message = "", cue = "confirm") {
  state = nextState;
  if (state.campaign?.ending && state.phase !== "event" && state.lastViewedEndingId !== state.campaign.ending.id) view.endingOpen = true;
  persist();
  render();
  if (cue) audio.play(cue);
  if (message) showToast(message);
}

function showToast(message, tone = "neutral") {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast is-visible ${tone === "danger" ? "is-danger" : ""}`;
  if (tone === "danger") audio.play("error");
  toastTimer = setTimeout(() => { elements.toast.className = "toast"; }, 2600);
}

function renderAudioControl(audioState = audio.getState()) {
  const status = !audioState.supported ? "非対応" : audioState.muted ? "OFF" : audioState.started ? "ON" : "開始";
  elements.audioIcon.textContent = audioState.muted ? "♩" : "♫";
  elements.audioStatus.textContent = status;
  elements.audioToggle.classList.toggle("is-muted", audioState.muted);
  elements.audioToggle.setAttribute("aria-pressed", String(audioState.muted));
  elements.audioToggle.setAttribute("aria-label", audioState.muted ? "BGMと効果音を有効にする" : "BGMと効果音をミュートする");
  elements.audioToggle.disabled = !audioState.supported;
}

function endMonth() {
  if (state.council.pending) {
    view.panel = "council";
    renderPanelFromTop();
    showToast("季節評定で今季の方針を決めてください。", "danger");
    return;
  }
  if (state.phase === "event") {
    renderEventModal();
    showToast("都市事件への対応を先に決めてください。", "danger");
    return;
  }
  const warnings = getTurnWarnings(state);
  if (warnings.length && !window.confirm(`月を終える前の確認\n\n・${warnings.join("\n・")}\n\nこのまま進めますか？`)) return;
  try {
    const next = commitMonth(state);
    const eventOpened = next.phase === "event";
    commit(
      next,
      eventOpened ? "月次処理が完了しました。都市事件への対応を決めてください。" : "月次報告を年代記へ記録しました。",
      eventOpened ? "event" : "month",
    );
    if (next.council.pending) {
      view.panel = "council";
      renderPanelFromTop();
    }
  } catch (error) {
    showToast(error.message, "danger");
  }
}

function formatValue(value, digits = 0) {
  return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function signed(value, digits = 0) {
  return `${value >= 0 ? "+" : ""}${formatValue(value, digits)}`;
}

function getPlanningPreview() {
  if (previewCache.state !== state) previewCache = { state, value: deriveMonthPreview(state) };
  return previewCache.value;
}

function previewReasons(local, key) {
  const reasons = [];
  const orders = local.breakdown?.orders?.[key] ?? 0;
  const external = local.breakdown?.external?.[key] ?? 0;
  if (orders) reasons.push({ label: "命令・委任", value: orders });
  reasons.push(...(local.factors?.[key]?.reasons ?? []));
  if (external) reasons.push({ label: "戦争・事件", value: external });
  return reasons.length ? reasons : [{ label: "月次処理", value: local.changes[key] ?? 0 }];
}

function withPlanningForecast(city) {
  const local = getPlanningPreview()?.report.cities.find((item) => item.cityId === city.cityId);
  if (!local) return city;
  const forecasts = { ...city.forecasts };
  ["money", "food", "population", "security", "support"].forEach((key) => {
    forecasts[key] = { current: city[key], delta: local.changes[key] ?? 0, reasons: previewReasons(local, key) };
  });
  return {
    ...city, forecasts, planPreview: local,
    operationalNetIncome: city.netIncome, operationalFoodBalance: city.foodBalance,
    netIncome: local.changes.money ?? city.netIncome,
    foodBalance: local.changes.food ?? city.foodBalance,
  };
}

function renderResources() {
  const ledger = deriveRealmLedger(state);
  const military = getMilitarySummary(state);
  const foodSecurity = getFoodSecurityStatus(state, getPlanningPreview());
  const foodTone = foodSecurity.severity === "stable" ? "" : `is-${foodSecurity.severity}`;
  const foodStatus = foodSecurity.severity === "danger" ? "危機" : foodSecurity.severity === "warning" ? "注意" : "安定";
  const resources = [
    { icon: "¤", value: formatValue(ledger.remittableMoney, 1), label: `朝廷可動 / 州庫計 ${formatValue(ledger.treasury, 1)}` },
    { icon: "俵", value: formatValue(ledger.deliverableFood), label: `輸送可能（行政補正後） / 在庫 ${formatValue(ledger.provisions)}`, className: `is-food ${foodTone}`, title: `食料${foodStatus}。輸送可能量は統治方式・委任方針・行政到達度を反映した値です。` },
    { icon: "兵", value: formatValue(ledger.mobilizableTroops), label: `動員可能 / 駐屯 ${formatValue(ledger.troops)}` },
    { icon: "道", value: `${military.mobility} / ${military.supply}`, label: "機動 / 軍需" },
    { icon: "♛", value: state.legitimacy, label: "正統性" },
    { icon: "令", value: `${ledger.governance.used}/${ledger.governance.max}`, label: `統治力 · 待機${ledger.availableOfficers}名`, className: "is-governance", title: "クリックして今月の使い道を確認", action: "governance" },
  ];
  elements.resourceLedger.innerHTML = resources.map(({ icon, value, label, className = "", title = "", action = "" }) => {
    const tag = action ? "button" : "div";
    const actionData = action ? ` type="button" data-resource-action="${action}"` : "";
    return `<${tag} class="resource-item ${className}"${actionData}${title ? ` title="${title}" aria-label="${title}"` : ""}><i>${icon}</i><strong>${value}</strong><small>${label}</small></${tag}>`;
  }).join("");
}

function renderTimeControls() {
  elements.dateLabel.textContent = formatDate(state);
  const season = deriveCityMetrics(state, view.selectedCityId).season.name;
  elements.dateHint.textContent = state.phase === "event" ? "事件対応が必要" : state.campaign?.ending ? "完結 · 継続統治可能" : state.council.pending ? `${season}季評定を決定` : "月を終える";
  elements.endMonthButton.classList.toggle("is-blocked", state.phase === "event" || state.council.pending);
}

function renderAnalysisMode() {
  document.body.classList.toggle("is-expert-mode", view.expertMode);
  if (!elements.analysisToggle) return;
  elements.analysisToggle.setAttribute("aria-pressed", String(view.expertMode));
  elements.analysisToggle.querySelector("small").textContent = view.expertMode ? "閉じる" : "表示";
}

function renderTabs() {
  elements.primaryTabs.querySelectorAll("[data-panel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === view.panel);
  });
}

function campaignObjectiveItems(campaign, compact = false) {
  return campaign.objectives.map((objective) => `
    <div class="campaign-objective ${objective.complete ? "is-complete" : ""}">
      <i>${objective.complete ? "✓" : "○"}</i>
      <span><strong>${objective.label}</strong>${compact ? "" : `<small>${objective.detail}</small>`}</span>
    </div>
  `).join("");
}

function renderCampaignBar() {
  const campaign = getCampaignStatus(state);
  const guidance = getTurnGuidance(state);
  const foodSecurity = getFoodSecurityStatus(state, getPlanningPreview());
  const foodTarget = foodSecurity.primaryCity && foodSecurity.severity !== "stable"
    ? townTargetForCommand(foodSecurity.primaryCity.cityId, "city.cultivate")
    : null;
  const foodRisk = foodTarget
    ? `<button class="campaign-food-alert is-${foodSecurity.severity}" type="button" data-food-emergency-town="${foodTarget.townId}" data-food-emergency-city="${foodSecurity.primaryCity.cityId}"><b>${foodSecurity.severity === "danger" ? "食料危機" : "食料注意"} · ${foodSecurity.primaryCity.name}</b><span>次月末 ${formatValue(Math.max(0, foodSecurity.primaryCity.after))} / 約${foodSecurity.primaryCity.afterRunway.toFixed(1)}か月分</span><em>${foodTarget.name}の対策へ →</em></button>`
    : "";
  const flow = campaign.loop.map((item, index) => {
    const step = index + 1;
    const active = guidance.step === step;
    const complete = campaign.complete || guidance.step > step;
    return `<span class="${active ? "is-active" : ""} ${complete ? "is-complete" : ""}"><i>${complete ? "✓" : step}</i>${item.label}</span>`;
  }).join("");
  const commandData = guidance.commandId ? ` data-command-id="${guidance.commandId}" data-city-id="${guidance.cityId}"${guidance.townId ? ` data-town-id="${guidance.townId}"` : ""}` : "";
  elements.campaignBar.innerHTML = `
    <div class="campaign-bar-goal">
      <small>${campaign.act.name} · ${campaign.role}</small>
      <strong>${campaign.title}</strong>
      <span>${campaign.completedCount} / ${campaign.totalCount} 課題達成 · ${campaign.act.description}</span>
    </div>
    <div class="campaign-bar-next ${foodRisk ? "has-food-risk" : ""}">
      <small>次にすること · STEP ${guidance.step}/4 ${guidance.stepLabel}</small>
      <strong>${guidance.title}</strong>
      <span>${guidance.description}</span>
      ${foodRisk}
      <div class="campaign-flow" aria-label="月次の進め方">${flow}</div>
    </div>
    <div class="campaign-bar-actions">
      <button class="campaign-primary-action" type="button" data-guide-action="${guidance.action}"${commandData}>${guidance.actionLabel}</button>
      <button class="campaign-help-action" type="button" data-open-guide>目的と遊び方</button>
    </div>
  `;
}

function renderGuideModal() {
  elements.guideModal.classList.toggle("is-hidden", !view.guideOpen);
  if (!view.guideOpen) return;
  const campaign = getCampaignStatus(state);
  elements.guideModal.querySelector("#guideObjectiveList").innerHTML = campaignObjectiveItems(campaign);
  elements.guideModal.querySelector("#guideLoop").innerHTML = campaign.loop.map((item, index) => `
    <li><i>${index + 1}</i><div><strong>${item.label}</strong><span>${item.detail}</span></div></li>
  `).join("");
  elements.guideModal.querySelector("#guideProgress").textContent = `${campaign.completedCount} / ${campaign.totalCount} 達成`;
}

function endingResourceSummary() {
  const reports = state.monthlyReports ?? [];
  const oldest = reports.at(-1);
  const sum = (cities, side, key) => cities?.reduce((total, city) => total + (city[side]?.[key] ?? 0), 0) ?? 0;
  const ledger = deriveRealmLedger(state);
  return [
    { label: "州庫", start: sum(oldest?.cities, "before", "money"), end: ledger.treasury, digits: 1 },
    { label: "食料", start: sum(oldest?.cities, "before", "food"), end: ledger.provisions, digits: 0 },
    { label: "正統性", start: 64, end: state.legitimacy, digits: 0 },
  ];
}

function campaignRecordLabel(value) {
  return BORDER_SETTLEMENTS[value]?.name
    ?? AFTERMATH_POLICIES[value]?.name
    ?? (["limited_war", "war_settlement"].includes(value) ? "限定戦争" : value);
}

function renderEndingModal() {
  const campaign = getCampaignStatus(state);
  const open = Boolean(view.endingOpen && campaign.ending && state.phase !== "event");
  elements.endingModal.classList.toggle("is-hidden", !open);
  if (!open) return;
  const settlement = BORDER_SETTLEMENTS[campaign.resolution]?.name ?? (campaign.resolution ? "戦争講和" : "国境決着");
  const aftermath = AFTERMATH_POLICIES[campaign.aftermathPolicy]?.name ?? "戦後秩序";
  const decisions = [...(state.campaign?.history ?? [])].reverse().slice(-6).map((record) => `
    <li><span>誓暦${record.year}年 ${record.month}月</span><strong>${record.title}</strong><small>${[...(record.causes ?? []), ...(record.effects ?? [])].slice(0, 3).map(campaignRecordLabel).join(" · ")}</small></li>
  `).join("");
  const resources = endingResourceSummary().map((item) => {
    const delta = item.end - item.start;
    return `<article><small>${item.label}</small><strong>${formatValue(item.start, item.digits)} → ${formatValue(item.end, item.digits)}</strong><span class="${delta < 0 ? "is-negative" : "is-positive"}">${signed(delta, item.digits)}</span></article>`;
  }).join("");
  elements.endingContent.innerHTML = `
    <header class="ending-header"><span>CAMPAIGN COMPLETE · セレナ王</span><h1 id="endingTitle">${campaign.ending.name}</h1><p>${campaign.ending.description}</p></header>
    <div class="ending-route"><span><small>国境決着</small><strong>${settlement}</strong></span><i>→</i><span><small>定着方針</small><strong>${aftermath}</strong></span></div>
    <section class="ending-objectives"><header><h2>三つの課題</h2><b>${campaign.completedCount} / ${campaign.totalCount}</b></header><div class="campaign-objective-list">${campaignObjectiveItems(campaign)}</div></section>
    <section class="ending-ledger"><header><h2>王国の変化</h2><small>${state.campaign.completedTurn ?? state.turn}ターンで完結</small></header><div>${resources}</div></section>
    <section class="ending-decisions"><header><h2>この歴史を作った判断</h2><small>年代記から抜粋</small></header><ol>${decisions || "<li><strong>国境危機を収束させた。</strong></li>"}</ol></section>
    <footer class="ending-actions"><button type="button" data-ending-reports>国家報告を詳しく見る</button><button class="is-primary" type="button" data-ending-continue>この世界で統治を続ける</button></footer>
  `;
}

function renderResetModal() {
  elements.resetModal.classList.toggle("is-hidden", !view.resetOpen);
}

function acknowledgeEnding() {
  if (state.campaign?.ending) {
    state = { ...state, lastViewedEndingId: state.campaign.ending.id };
    persist();
  }
  view.endingOpen = false;
}

function resetChronicle() {
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  state = createInitialState();
  Object.assign(view, {
    panel: "council", spendingCategoryId: "social_security", spendingCityId: "selene", mapMode: "political", scale: "country",
    selectedType: null, selectedId: null, selectedTileName: null, selectedTerrain: null, selectedTerrainType: null, tileWindowOpen: false,
    selectedCityId: "selene", cityTab: "overview", selectedTownId: "mugiwano", townTab: "overview", selectedAuthorityDomain: "justice",
    selectedFacilityId: "farmland", selectedCountryId: "valka", objectiveId: "transit", warCouncilOpen: false, assignmentOpen: false,
    pendingTownId: null, guideOpen: true, endingOpen: false, resetOpen: false, expertMode: false, worldNationFilter: "all", focusedTownCommandId: null,
  });
  render();
  audio.play("reset");
  showToast("新しい年代記を始めました。");
}

function costLabel(command) {
  const names = { money: "金", draftPopulation: "徴募" };
  return Object.entries(command.cost).map(([key, value]) => `${names[key]}${value}`).join(" · ");
}

function spendingCommandCards(categoryId, cityId = WORLD.nation.capital) {
  const cards = Object.values(COMMANDS)
    .filter((command) => command.spendingCategory === categoryId && !isTownCommand(command))
    .map((command) => {
      const targetCityId = command.defaultCityId ?? cityId ?? WORLD.nation.capital;
      const availability = getCommandAvailability(state, command.id, null, targetCityId);
      return `
        <button class="command-card" type="button" data-command="${command.id}" data-city-id="${targetCityId}" ${availability.allowed ? "" : "disabled"}>
          <strong>${command.name}</strong><em>${availability.allowed ? `${command.durationTurns}か月 · 統治${command.governanceCost} · ${costLabel(command)}` : availability.reason}</em>
          <small>${command.description}</small>
          <span class="command-target">対象：${WORLD.provinces[targetCityId].name}</span>
          ${availability.allowed ? '<span class="assign-prompt">担当武将を選ぶ →</span>' : ""}
        </button>
      `;
    });
  return cards.length ? cards.join("") : `<div class="spending-moved-note"><strong>この分類の現地施策は町政へ移設されました。</strong><small>町を選び、生活支援・衛生・治安・開墾などを実行してください。</small><button type="button" data-panel="town">町政を開く →</button></div>`;
}

function spendingShortcut(categoryId, text) {
  const category = SPENDING_CATEGORIES[categoryId];
  return `<button class="spending-shortcut" type="button" data-spending-category="${categoryId}"><span>${category.icon}</span><strong>${category.name}</strong><small>${text}</small><b>具体策を見る →</b></button>`;
}

function meter(label, value, suffix = "/ 100", className = "") {
  const width = Math.min(100, Math.max(0, Number(value)));
  return `
    <div class="mini-meter ${className}">
      <div><span>${label}</span><strong>${formatValue(value, 0)} ${suffix}</strong></div>
      <div class="mini-track"><span style="width:${width}%"></span></div>
    </div>
  `;
}

function statCells(stats) {
  const labels = { leadership: "統率", war: "武力", intelligence: "知力", politics: "政治", charisma: "魅力" };
  return Object.entries(labels).map(([key, label]) => `<div><small>${label}</small><strong>${stats[key]}</strong></div>`).join("");
}

function officerSeal(officer, size = "") {
  const className = ["officer-seal", size].filter(Boolean).join(" ");
  const portrait = officer.portraitImage
    ? `<img src="${officer.portraitImage}" alt="" loading="lazy">`
    : officer.portrait;
  return `<span class="${className}" aria-hidden="true">${portrait}</span>`;
}

function enemyCommanderCard(commander, action = null, compact = false) {
  if (!commander) return "";
  return `
    <article class="enemy-commander-card ${compact ? "is-compact" : ""}">
      ${officerSeal(commander, "large")}
      <div>
        <small>ENEMY COMMANDER · ${commander.country.name}</small>
        <strong>${commander.name}</strong>
        <span>${commander.role} · ${commander.doctrine}</span>
        <em>統率 ${commander.stats.leadership} · 武力 ${commander.stats.war} · 知力 ${commander.stats.intelligence}</em>
        ${action ? `<p><b>${action.label}</b><br>${action.reason}</p>` : ""}
      </div>
    </article>
  `;
}

function seasonName() {
  return `${deriveCityMetrics(state, view.selectedCityId).season.name}季`;
}

function townTargetForCommand(cityId, commandId) {
  const towns = (WORLD.provinces[cityId]?.villages ?? []).map((townId) => getTownAdministration(state, townId));
  const metric = {
    "welfare.relief": (town) => town.support,
    "welfare.health": (town) => town.sanitation,
    "city.patrol": (town) => town.security,
    "city.drill": (town) => town.preparedness,
    "research.administration": (town) => town.forecast.administrativeCapacity,
    "city.cultivate": (town) => town.forecast.foodSecurity,
    "city.commerce": (town) => town.commerce,
    "city.repair": (town) => town.infrastructure,
  }[commandId] ?? ((town) => town.forecast.administrativeCapacity);
  return towns.sort((left, right) => metric(left) - metric(right))[0] ?? null;
}

function renderCouncilPanel() {
  const ledger = deriveRealmLedger(state);
  const administration = ledger.administration;
  const campaign = getCampaignStatus(state);
  const proposals = getCouncilProposals(state);
  const doctrine = DOCTRINES[state.council.doctrine];
  const doctrineCards = Object.values(DOCTRINES).map((item) => `
    <button class="doctrine-card ${item.id === state.council.doctrine ? "is-selected" : ""}" type="button" data-doctrine="${item.id}" ${state.council.pending ? "" : "disabled"}>
      <strong>${item.name}</strong><small>${item.description}</small>
    </button>
  `).join("");
  const proposalCards = proposals.map((proposal) => {
    const officer = getOfficerReport(state, proposal.officerId);
    const command = COMMANDS[proposal.commandId];
    const town = isTownCommand(command) ? townTargetForCommand(proposal.cityId, proposal.commandId) : null;
    const availability = getCommandAvailability(state, proposal.commandId, proposal.officerId, proposal.cityId, town?.townId);
    const action = town
      ? `data-open-town-command="${town.townId}"`
      : `data-command="${command.id}" data-city-id="${proposal.cityId}"`;
    return `
      <article class="proposal-card">
        <header>${officerSeal(officer)}<div><strong>${officer.name}</strong><small>${officer.role}の提案</small></div><b>${proposal.forecast.grade}</b></header>
        <p>「${proposal.reason}」</p>
        <button type="button" ${action} ${availability.allowed ? "" : "disabled"}>${town ? `${town.name}の町政で${command.name}を見る` : `${command.name}を任務化 · 予測 ${proposal.forecast.range[0]}〜${proposal.forecast.range[1]}`}</button>
      </article>
    `;
  }).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>SEASONAL PARLIAMENT</span>
      <h1>${seasonName()}評定</h1>
      <p>${state.council.pending ? "今季の方針を決めるまで時間は進まない" : `今季方針「${doctrine.name}」`}</p>
    </header>
    <div class="panel-body">
      <section class="campaign-brief-card">
        <header><div><small>MAIN OBJECTIVE</small><h2>${campaign.title}</h2></div><b>${campaign.completedCount} / ${campaign.totalCount}</b></header>
        <p>${campaign.objective}</p>
        <div class="campaign-objective-list">${campaignObjectiveItems(campaign, true)}</div>
        <small class="campaign-guardrail">守るもの：${campaign.guardrail}</small>
      </section>
      <section class="panel-section">
        <div class="realm-facts council-facts">
          <div><small>戸籍人口</small><strong>${formatValue(ledger.registeredPopulation)}</strong></div>
          <div><small>平均治安</small><strong>${ledger.publicOrder}</strong></div>
          <div><small>行政到達</small><strong>${administration.averageReach}</strong></div>
          <div><small>直轄 / 委任</small><strong>${administration.directCities} / ${administration.delegatedCities}</strong></div>
        </div>
        <p class="adviser-note">名目人口 ${formatValue(ledger.population)}のうち戸籍把握 ${administration.registrationRate}% · 輸送可能兵糧 ${formatValue(administration.deliverableFood)} · 動員可能兵 ${formatValue(administration.mobilizableTroops)}${administration.overextension > 0 ? ` · 行政超過 ${administration.overextension}%` : ""}</p>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>勢力方針</h2><small>${state.council.pending ? "一つを採択" : "次季まで固定"}</small></div>
        <div class="doctrine-list">${doctrineCards}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>配下からの提案</h2><small>能力・特性・現状から生成</small></div>
        <div class="proposal-list">${proposalCards}</div>
      </section>
    </div>
  `;
}

function cityTabs() {
  return Object.keys(state.cities).map((cityId) => `
    <button type="button" data-select-city="${cityId}" class="${cityId === view.selectedCityId ? "is-active" : ""}">${WORLD.provinces[cityId].name.replace(/王都|河港|城塞市/, "")}</button>
  `).join("");
}

function renderSpendingPanel() {
  const ledger = deriveRealmLedger(state);
  const governance = getGovernance(state);
  const selected = SPENDING_CATEGORIES[view.spendingCategoryId] ?? SPENDING_CATEGORIES.social_security;
  const reservedMoney = state.pendingOrders.reduce((sum, order) => sum + (order.cost?.money ?? 0), 0);
  const categories = Object.values(SPENDING_CATEGORIES).map((category) => {
    const commandCount = Object.values(COMMANDS).filter((command) => command.spendingCategory === category.id && !isTownCommand(command)).length;
    return `
      <button type="button" class="spending-category-card ${category.id === selected.id ? "is-active" : ""}" data-spending-category="${category.id}">
        <i>${category.icon}</i><span><strong>${category.name}</strong><small>具体策 ${commandCount}件</small></span>
      </button>
    `;
  }).join("");
  const cityTargets = Object.keys(state.cities).map((cityId) => `
    <button type="button" class="${cityId === view.spendingCityId ? "is-active" : ""}" data-spending-city="${cityId}">${WORLD.provinces[cityId].name.replace(/王都|河港|城塞市/, "")}</button>
  `).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading spending-heading">
      <span>NATIONAL EXPENDITURE</span>
      <h1>国家支出</h1>
      <p>国境・外交・軍事など国家規模の具体策を決める</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="spending-ledger">
          <div><small>朝廷可動金</small><strong>${formatValue(ledger.remittableMoney, 1)}</strong></div>
          <div><small>予約支出</small><strong>${formatValue(reservedMoney, 1)}</strong></div>
          <div><small>国債残高</small><strong>${formatValue(ledger.publicDebt, 1)}</strong></div>
          <div><small>統治力</small><strong>${governance.used} / ${governance.max}</strong></div>
        </div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>国家規模コマンド</h2><small>町の内政は「町政」へ移設済み</small></div>
        <div class="spending-category-grid">${categories}</div>
      </section>
      <section class="panel-section spending-detail">
        <div class="spending-detail-heading"><i>${selected.icon}</i><div><small>選択中の支出</small><h2>${selected.name}</h2><p>${selected.description}</p></div></div>
        <nav class="spending-city-tabs" aria-label="具体策の対象都市">${cityTargets}</nav>
        ${selected.id === "debt_repayment" ? `<p class="spending-debt-note">国債残高 ${formatValue(ledger.publicDebt, 1)} · 累計返済 ${formatValue(state.fiscal?.totalDebtRepaid ?? 0, 1)}</p>` : ""}
        <div class="command-list spending-command-list">${spendingCommandCards(selected.id, view.spendingCityId)}</div>
      </section>
    </div>
  `;
}

function renderCityPanel() {
  const cityId = view.selectedCityId;
  const city = withPlanningForecast(deriveCityMetrics(state, cityId));
  const governor = getOfficerReport(state, city.governorId);
  const governance = getGovernance(state);
  elements.leftPanel.innerHTML = `
    <header class="panel-heading city-heading" style="--city-art: url('${cityArt(cityId)}')">
      <span>CITY ADMINISTRATION</span>
      <h1>${city.name}</h1>
      <p>${city.kind} · 太守 ${governor.name}</p>
      <nav class="city-tabs">${cityTabs()}</nav>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <article class="governor-card">
          ${officerSeal(governor, "large")}
          <div><small>太守</small><strong>${governor.name}</strong><p>${governor.policy} · 忠誠 ${governor.loyalty} · 意欲 ${governor.stamina}</p></div>
        </article>
        <div class="officer-stat-grid compact">${statCells(governor.stats)}</div>
      </section>
      <section class="panel-section">
        <div class="realm-facts">
          <div><small>人口</small><strong>${formatValue(city.population)}</strong></div>
          <div><small>民心</small><strong>${formatValue(city.support)}</strong></div>
          <div><small>食料予測</small><strong>${signed(city.foodBalance)}</strong></div>
          <div><small>金銭予測</small><strong>${signed(city.netIncome, 1)}</strong></div>
        </div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>管内の町政</h2><small>統治力 ${governance.used}/${governance.max}</small></div>
        <div class="town-shortcut-list">${WORLD.provinces[cityId].villages.map((townId) => {
          const town = getTownAdministration(state, townId);
          return `<button type="button" class="town-shortcut" data-select-town="${townId}"><strong>${town.name}</strong><small>${town.kind} · 行政処理 ${Math.round(town.forecast.administrativeCapacity)} · 課題 ${town.forecast.primaryNeed.label}</small><b>町政を開く →</b></button>`;
        }).join("")}</div>
      </section>
      <section class="panel-section city-issue-list">
        <div class="section-heading"><h2>現在の課題</h2><small>${state.cities[cityId].issues.length}件</small></div>
        ${state.cities[cityId].issues.length ? state.cities[cityId].issues.map((issue) => `<p class="adviser-note"><strong>${issue.title}</strong><br>深刻度 ${issue.severity}</p>`).join("") : '<p class="empty-candidates">重大な初期課題はありません。</p>'}
      </section>
    </div>
  `;
}

const CITY_TABS = {
  overview: "概要", population: "人口", economy: "経済・政策",
  administration: "統治委任", facilities: "施設", factions: "派閥", history: "歴史", reports: "報告",
};

const TOWN_TABS = { overview: "概要", office: "行政台帳", commands: "施策・命令", records: "実施記録" };

function townTabs() {
  return Object.values(WORLD.villages).map((town) => `
    <button type="button" data-select-town="${town.id}" class="${town.id === view.selectedTownId ? "is-active" : ""}">
      <strong>${town.name}</strong><small>${WORLD.provinces[town.province].name.replace(/王都|河港|城塞市/, "")}</small>
    </button>
  `).join("");
}

function renderTownPanel() {
  const town = getTownAdministration(state, view.selectedTownId);
  const parent = deriveCityMetrics(state, town.cityId);
  const governor = getOfficerReport(state, parent.governorId);
  elements.leftPanel.innerHTML = `
    <header class="panel-heading town-heading">
      <span>TOWN ADMINISTRATION</span><h1>${town.name}</h1>
      <p>${town.kind} · ${WORLD.provinces[town.cityId].name}管内</p>
    </header>
    <div class="panel-body">
      <section class="panel-section"><div class="section-heading"><h2>町を選ぶ</h2><small>${Object.keys(WORLD.villages).length}町</small></div><nav class="town-selector">${townTabs()}</nav></section>
      <section class="panel-section">
        <article class="governor-card">${officerSeal(governor, "large")}<div><small>管轄太守</small><strong>${governor.name}</strong><p>${parent.name}から財源・担当者を配分</p></div></article>
        <div class="realm-facts"><div><small>人口</small><strong>${formatValue(town.population)}</strong></div><div><small>行政処理</small><strong>${Math.round(town.forecast.administrativeCapacity)}</strong></div><div><small>陳情滞留</small><strong>${Math.round(town.petitionBacklog)}</strong></div><div><small>優先課題</small><strong>${town.forecast.primaryNeed.label}</strong></div></div>
      </section>
      <section class="panel-section"><p class="adviser-note"><strong>現地課題</strong><br>${town.issue}</p><button type="button" class="town-open-commands" data-town-tab="commands">この町の施策を開く</button></section>
    </div>
  `;
}

function deltaText(value, digits = 0) {
  const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return `<span class="forecast-delta ${tone}">${signed(value, digits)}/月</span>`;
}

function reasonLines(forecast) {
  return forecast.reasons.map((reason) => `<li><span>${reason.label}</span><b>${signed(reason.value, Number.isInteger(reason.value) ? 0 : 1)}</b></li>`).join("");
}

function cityMetricCard(label, value, forecast = null, suffix = "") {
  return `
    <article class="city-metric-card">
      <header><span>${label}</span>${forecast ? deltaText(forecast.delta, Number.isInteger(forecast.delta) ? 0 : 1) : ""}</header>
      <strong>${formatValue(value, Number.isInteger(value) ? 0 : 1)}${suffix}</strong>
      ${forecast ? `<details><summary>増減理由</summary><ul>${reasonLines(forecast)}</ul></details>` : ""}
    </article>
  `;
}

function cityWorkspaceHeader(city, governor) {
  return `
    <header class="city-workspace-header" style="--city-art: url('${cityArt(city.cityId)}')">
      <div><span>${city.kind} / ${city.season.name}季</span><h1>${city.name}</h1><p>${city.note}</p></div>
      <div class="city-governor-badge">${officerSeal(governor)}<div><small>太守</small><strong>${governor.name}</strong><b>${governor.policy}</b></div></div>
    </header>
    <nav class="city-workspace-tabs" aria-label="都市画面タブ">
      ${Object.entries(CITY_TABS).map(([id, label]) => `<button type="button" data-city-tab="${id}" class="${view.cityTab === id ? "is-active" : ""}">${label}</button>`).join("")}
    </nav>
  `;
}

function townWorkspaceHeader(town, governor) {
  return `
    <header class="city-workspace-header town-workspace-header" style="--city-art: url('${cityArt(town.cityId)}')">
      <div><span>${town.kind} / ${WORLD.provinces[town.cityId].name}管内</span><h1>${town.name} 町政庁</h1><p>${town.issue}</p></div>
      <div class="city-governor-badge">${officerSeal(governor)}<div><small>管轄太守</small><strong>${governor.name}</strong><b>町政命令は都市金庫から執行</b></div></div>
    </header>
    <nav class="city-workspace-tabs town-workspace-tabs" aria-label="町政画面タブ">
      ${Object.entries(TOWN_TABS).map(([id, label]) => `<button type="button" data-town-tab="${id}" class="${view.townTab === id ? "is-active" : ""}">${label}</button>`).join("")}
    </nav>
  `;
}

function townNeedCard(need) {
  const tone = need.value < 40 ? "is-critical" : need.value < 60 ? "is-warning" : "is-stable";
  return `<article class="town-need-card ${tone}"><small>${need.label}</small><strong>${Math.round(need.value)}</strong><i style="--value:${Math.round(need.value)}%"></i></article>`;
}

function renderTownOverview(town) {
  return `
    <section class="town-overview-hero">
      <article><small>町人口</small><strong>${formatValue(town.population)}</strong><span>翌月 ${signed(town.forecast.populationDelta)}</span></article>
      <article><small>地域歳入寄与</small><strong>${formatValue(town.forecast.revenue, 1)}</strong><span>親都市の税収基盤</span></article>
      <article><small>食料備蓄</small><strong>${formatValue(town.foodReserve)}</strong><span>翌月 ${signed(town.forecast.foodDelta)}</span></article>
      <article><small>行政処理力</small><strong>${Math.round(town.forecast.administrativeCapacity)}</strong><span>陳情 ${signed(town.forecast.petitionDelta, 1)}/月</span></article>
    </section>
    <section class="town-need-grid">${town.forecast.needs.map(townNeedCard).join("")}</section>
    <section class="city-detail-columns">
      <article class="city-sheet"><header><h2>現地課題</h2><small>${town.kind}</small></header><p>${town.issue}</p><p>現在の最優先は「${town.forecast.primaryNeed.label}」。町ごとの値を改善し、管轄都市の村落生産・人口基盤へ積み上げます。</p></article>
      <article class="city-sheet"><header><h2>親都市との関係</h2><small>${WORLD.provinces[town.cityId].name}</small></header><div class="city-inline-stats"><span>生産 <b>${Math.round(town.production)}</b></span><span>商業 <b>${Math.round(town.commerce)}</b></span><span>治安 <b>${Math.round(town.security)}</b></span><span>民心 <b>${Math.round(town.support)}</b></span></div><button type="button" class="town-parent-link" data-select-city="${town.cityId}">都市行政へ戻る →</button></article>
    </section>
  `;
}

function renderTownOffice(town) {
  return `
    <section class="town-office-grid">
      ${cityMetricCard("戸籍把握率", town.registryCoverage, null, "%")}
      ${cityMetricCard("行政到達", town.administrativeReach, null, "%")}
      ${cityMetricCard("陳情滞留", town.petitionBacklog, null, "%")}
      ${cityMetricCard("道路・水路基盤", town.infrastructure, null, "%")}
      ${cityMetricCard("衛生", town.sanitation, null, "%")}
      ${cityMetricCard("自警・備え", town.preparedness, null, "%")}
    </section>
    <section class="city-detail-columns">
      <article class="city-sheet"><header><h2>行政負荷</h2><small>戸籍・到達・陳情から算出</small></header>${meter("処理能力", town.forecast.administrativeCapacity)}${meter("戸籍把握", town.registryCoverage)}${meter("行政到達", town.administrativeReach)}${meter("陳情解消", 100 - town.petitionBacklog)}</article>
      <article class="city-sheet"><header><h2>翌月見通し</h2><small>町単位で月次更新</small></header><p>人口 ${signed(town.forecast.populationDelta)} · 食料備蓄 ${signed(town.forecast.foodDelta)} · 陳情滞留 ${signed(town.forecast.petitionDelta, 1)}。</p><p>行政技術は戸籍・到達・滞留を、補修は基盤と到達を直接改善します。</p></article>
    </section>
  `;
}

function townCommandCard(command, town) {
  const availability = getCommandAvailability(state, command.id, null, town.cityId, town.townId);
  return `
    <button class="town-command-card ${view.focusedTownCommandId === command.id ? "is-recommended" : ""}" type="button" data-command="${command.id}" data-city-id="${town.cityId}" data-town-id="${town.townId}" ${availability.allowed ? "" : "disabled"}>
      <header><strong>${command.name}</strong><b>${SPENDING_CATEGORIES[command.spendingCategory].name}</b></header>
      <p>${command.description}</p><small>${availability.allowed ? `${command.durationTurns}か月 · 統治${command.governanceCost} · ${costLabel(command)}` : availability.reason}</small><span>${town.name}だけを直接改善 →</span>
    </button>
  `;
}

function renderTownCommands(town) {
  const commands = Object.values(COMMANDS).filter(isTownCommand);
  const groups = [...new Set(commands.map((command) => command.spendingCategory))];
  return `
    <section class="town-command-intro"><div><small>LOCAL EXECUTION</small><h2>${town.name}の施策</h2><p>費用は${WORLD.provinces[town.cityId].name}の都市金庫、担当者と統治力は国家枠を使います。効果対象はこの町です。</p></div><span>優先課題<strong>${town.forecast.primaryNeed.label} ${Math.round(town.forecast.primaryNeed.value)}</strong></span></section>
    ${groups.map((categoryId) => `<section class="town-command-group"><header><h2>${SPENDING_CATEGORIES[categoryId].name}</h2><small>${commands.filter((command) => command.spendingCategory === categoryId).length}施策</small></header><div>${commands.filter((command) => command.spendingCategory === categoryId).map((command) => townCommandCard(command, town)).join("")}</div></section>`).join("")}
  `;
}

function renderTownRecords(town) {
  const records = town.history.length ? town.history.map((record) => {
    const officer = getOfficerReport(state, record.officerId);
    return `<article class="town-record"><span>誓暦${record.year}年 ${record.month}月</span><div><strong>${COMMANDS[record.commandId]?.name ?? record.commandId}</strong><small>${officer?.name ?? "担当者不明"} · 成果 ${record.outcome}</small></div></article>`;
  }).join("") : '<p class="history-empty">この町で完了した施策はまだありません。</p>';
  const pending = [...state.pendingOrders, ...state.commandQueue].filter((order) => order.townId === town.townId).map((order) => `<article class="town-record is-pending"><span>${state.pendingOrders.includes(order) ? "今月予約" : `残${order.remainingTurns}か月`}</span><div><strong>${COMMANDS[order.commandId].name}</strong><small>${getOfficerReport(state, order.officerId).name}</small></div></article>`).join("");
  return `<section class="city-sheet town-records"><header><h2>実施記録</h2><small>町別に保存</small></header>${pending}${records}</section>`;
}

function renderCityOverview(city) {
  const breakdown = getCityBreakdown(state, city.cityId);
  return `
    <section class="city-overview-grid">
      ${cityMetricCard("人口", city.population, city.forecasts.population)}
      ${cityMetricCard("食料", city.food, city.forecasts.food)}
      ${cityMetricCard("金銭", city.money, city.forecasts.money)}
      ${cityMetricCard("生産力", city.production)}
      ${cityMetricCard("商業力", city.commerce)}
      ${cityMetricCard("治安", city.security, city.forecasts.security)}
      ${cityMetricCard("民心", city.support, city.forecasts.support)}
      ${cityMetricCard("防衛力", city.defense)}
    </section>
    <section class="city-detail-columns">
      <article class="city-sheet"><header><h2>翌月の因果</h2><small>現在の政策・施設で試算</small></header><p>${breakdown.income}</p><p>${breakdown.supplies}</p><p>${breakdown.draft}</p></article>
      <article class="city-sheet"><header><h2>軍事・兵站</h2><small>都市資源と街道稼働から算出</small></header><div class="city-inline-stats"><span>兵 <b>${formatValue(city.troops)}</b></span><span>徴募 <b>${formatValue(city.draftPopulation)}</b></span><span>駐屯上限 <b>${formatValue(city.troopCapacity)}</b></span><span>練度 <b>${Math.round(city.training)}</b></span></div><p>${breakdown.logistics}</p></article>
    </section>
  `;
}

function renderCityPopulation(city) {
  const workforce = city.facilities;
  return `
    <section class="population-dashboard">
      <article class="population-hero"><small>都市人口</small><strong>${formatValue(city.population)}</strong>${deltaText(city.populationDelta)}<p>労働可能 ${formatValue(workforce.availableWorkers)} · 必要労働 ${formatValue(workforce.requiredWorkers)}</p></article>
      <div class="population-card-grid">
        ${cityMetricCard("失業者", workforce.unemployment)}
        ${cityMetricCard("住宅充足", Math.round(city.housingRate * 100), null, "%")}
        ${cityMetricCard("衛生", city.internal.sanitation)}
        ${cityMetricCard("食料充足", Math.round(city.foodSatisfaction * 100), null, "%")}
        ${cityMetricCard("月次移民・自然増減", city.populationDelta)}
        ${cityMetricCard("住民食料需要", city.civilianNeed)}
      </div>
      <article class="city-sheet"><header><h2>労働配分</h2><small>施設稼働へ自動配分</small></header><div class="labor-allocation">${city.facilities.facilities.filter((facility) => facility.level > 0).map((facility) => `<div><span>${facility.name} Lv.${facility.level}</span><b>${formatValue(facility.requiredWorkers)}人</b><i style="--rate:${Math.round(facility.operatingRate * 100)}%"></i></div>`).join("")}</div></article>
    </section>
  `;
}

function policyCards(city) {
  return Object.values(POLICY_DEFINITIONS).map((definition) => {
    const current = state.cities[city.cityId].policies[definition.id];
    const pending = state.pendingOrders.find((order) => order.kind === "policy" && order.cityId === city.cityId && order.policyId === definition.id);
    return `
      <article class="policy-card">
        <header><div><small>都市政策</small><h3>${definition.name}</h3></div><b>${definition.options[pending?.optionId ?? current].name}</b></header>
        <p>${definition.description}</p>
        <div class="policy-options">${Object.entries(definition.options).map(([optionId, option]) => `<button type="button" data-queue-policy="${definition.id}" data-option="${optionId}" data-city-id="${city.cityId}" class="${(pending?.optionId ?? current) === optionId ? "is-active" : ""}" ${current === optionId && !pending ? "disabled" : ""}><strong>${option.name}</strong><small>${policyOptionSummary(definition.id, option)}</small></button>`).join("")}</div>
      </article>
    `;
  }).join("");
}

function policyOptionSummary(policyId, option) {
  const parts = [];
  if (policyId === "landTax" || policyId === "commerceTax") parts.push(`税率 ${Math.round(option.rate * 100)}%`);
  if (policyId === "conscription") parts.push(`徴募×${option.levy.toFixed(2)}`, `軍維持×${option.upkeep.toFixed(2)}`, `生産 ${signed(option.production * 100, 0)}%`);
  if (policyId === "rationing") parts.push(`住民消費 ${Math.round(option.consumption * 100)}%`);
  if (policyId === "immigration") parts.push(`人口率 ${signed(option.migration * 1000, 1)}‰`, `治安 ${signed(option.security, 2)}`);
  if (policyId === "securityPolicy") parts.push(`治安 ${signed(option.security, 2)}`, `恐怖 ${signed(option.fear, 1)}`, `腐敗 ${signed(option.corruption, 1)}`);
  if (Object.hasOwn(option, "support")) parts.push(`民心 ${signed(option.support, 1)}`);
  const factions = Object.entries(option.factions ?? {}).map(([id, value]) => `${FACTION_DEFINITIONS[id].name}${signed(value, 1)}`);
  if (factions.length) parts.push(factions.join("・"));
  return parts.join(" / ");
}

function renderCityEconomy(city) {
  const planned = Boolean(city.planPreview);
  return `
    <section class="economy-summary">
      <article><small>${planned ? "予約反映・食料実収支" : "月次食料収支"}</small><strong>${signed(city.foodBalance)}</strong><span>生産 ${formatValue(city.foodProduction)} / 消費 ${formatValue(city.civilianNeed + city.militaryNeed)} / 損耗 ${formatValue(city.spoilage)}${planned ? ` / 通常月次 ${signed(city.operationalFoodBalance)}` : ""}</span></article>
      <article><small>${planned ? "予約反映・財政実収支" : "月次財政収支"}</small><strong>${signed(city.netIncome, 1)}</strong><span>総収入 ${formatValue(city.grossIncome, 1)} / 支出 ${formatValue(city.expenses, 1)}${planned ? ` / 通常月次 ${signed(city.operationalNetIncome, 1)}` : ""}</span></article>
      <article><small>行政状態</small><strong>${formatValue(city.internal.administrativeEfficiency)}</strong><span>腐敗 ${formatValue(city.internal.corruption)} / 恐怖 ${formatValue(city.internal.fear)}</span></article>
    </section>
    <section class="policy-grid">${policyCards(city)}</section>
  `;
}

function renderCityAdministration(city) {
  const administration = getCityAdministration(state, city.cityId);
  const network = deriveAdministrationNetwork(state);
  const region = getRegionAuthority(state, city.cityId);
  const centralization = getCentralizationResult(state);
  const selectedDomain = region.domains.find((domain) => domain.id === view.selectedAuthorityDomain) ?? region.domains[0];
  view.selectedAuthorityDomain = selectedDomain.id;
  const reform = getAuthorityReform(state, city.cityId, selectedDomain.id);
  const modeCards = Object.values(ADMINISTRATION_MODES).map((mode) => `
    <button type="button" data-administration-mode="${mode.id}" data-city-id="${city.cityId}" class="${administration.mode === mode.id ? "is-active" : ""}" ${administration.mode === mode.id ? "disabled" : ""}>
      <strong>${mode.name}</strong><small>${mode.description}</small>
    </button>
  `).join("");
  const mandateCards = Object.values(ADMINISTRATION_MANDATES).map((mandate) => `
    <article class="policy-card">
      <header><div><small>太守への達成基準</small><h3>${mandate.name}</h3></div><b>${administration.mandate === mandate.id ? "委任中" : mandate.short}</b></header>
      <p>${mandate.description}</p>
      <button type="button" data-administration-mandate="${mandate.id}" data-city-id="${city.cityId}" class="facility-management-action" ${administration.mandate === mandate.id ? "disabled" : ""}>${administration.mandate === mandate.id ? "現在の委任方針" : "この方針を委任"}</button>
    </article>
  `).join("");
  const lastAction = administration.lastAction
    ? `<strong>${administration.lastAction.title}</strong><p>${administration.lastAction.detail}</p>`
    : "<strong>まだ委任政務の報告はありません</strong><p>太守委任では、月末に州庫の範囲で危機対応と日常整備を一件処理します。</p>";
  const capabilityLabels = {
    information: "情報", administration: "行政", fiscal: "財政",
    enforcement: "強制", infrastructure: "インフラ", standardization: "規格化",
  };
  const capabilityCards = Object.entries(network.capabilities).map(([id, value]) => `
    <div><small>${capabilityLabels[id]}</small><strong>${Math.round(value)}</strong><i style="--value:${Math.round(value)}%"></i></div>
  `).join("");
  const domainButtons = region.domains.map((domain) => `
    <button type="button" data-authority-domain="${domain.id}" class="authority-domain-button ${domain.id === selectedDomain.id ? "is-active" : ""}">
      <span>${domain.name}</span><strong>${Math.round(domain.effectiveControl)}%</strong><small>法 ${Math.round(domain.legalShare)} / 実 ${Math.round(domain.practicalShare)}</small>
    </button>
  `).join("");
  const factorLabels = {
    legalAuthority: "法的権限", information: "情報把握", administration: "行政処理",
    enforcement: "強制力", compliance: "地域服従", connectivity: "交通通信", institution: "制度浸透",
  };
  const factorCards = Object.entries(selectedDomain.factors).map(([id, value]) => `
    <div><small>${factorLabels[id]}</small><strong>${Math.round(value)}%</strong><i style="--value:${Math.round(value)}%"></i></div>
  `).join("");
  const privileges = selectedDomain.privileges.length
    ? selectedDomain.privileges.map((privilege) => `
      <article class="historical-privilege">
        <header><div><small>${privilege.originYear}年成立</small><strong>${privilege.name}</strong></div><b>慣習 ${privilege.entrenchment}</b></header>
        <p>${privilege.originalReason}</p>
        <span>${privilege.grantedRights.join(" · ")}</span>
      </article>
    `).join("")
    : '<p class="empty-candidates">この分野に記録された特権はありません。</p>';
  const activeReform = reform.active;
  const activeStage = activeReform ? AUTHORITY_REFORM_STAGES[activeReform.stageIndex] : null;
  const reformStatus = activeReform ? `
    <article class="authority-reform-progress">
      <header><div><small>進行中 · ${AUTHORITY_TRANSFER_METHODS[activeReform.method].name}</small><h3>${activeStage.name}</h3></div><b>${Math.round(activeReform.progress)}%</b></header>
      <div class="reform-stage-track">${AUTHORITY_REFORM_STAGES.map((stage, index) => `<span class="${index < activeReform.stageIndex ? "is-done" : index === activeReform.stageIndex ? "is-current" : ""}">${stage.name}</span>`).join("")}</div>
      <p>${activeStage.description}${activeReform.forced ? " 準備工程を飛ばした強行改革です。" : ""}</p>
    </article>
  ` : "";
  const methodCards = reform.methods.map((method) => `
    <article class="authority-method-card">
      <header><div><small>権力移管方式</small><h3>${method.name}</h3></div><b>金 ${method.cost}</b></header>
      <p>${method.description}</p>
      <div><span>法的移管 +${method.estimatedLegalGain}</span><span>実務移管 +${method.estimatedPracticalGain}</span><span class="${method.backlashRisk >= 45 ? "is-danger" : ""}">反動 ${method.backlashRisk}</span></div>
      <button type="button" data-start-authority-reform data-city-id="${city.cityId}" data-domain-id="${selectedDomain.id}" data-method-id="${method.id}" ${activeReform || !method.affordable ? "disabled" : ""}>${activeReform ? "改革進行中" : method.affordable ? `${method.name}で工程を開始` : "州庫留保が不足"}</button>
    </article>
  `).join("");
  const grievanceRows = region.grievances.length
    ? region.grievances.map((grievance) => `<div class="grievance-row"><strong>${grievance.createdYear}年 · 第${grievance.generation}世代</strong><span>${grievance.narrative}</span><b>強度 ${Math.round(grievance.strength)}</b></div>`).join("")
    : '<p class="empty-candidates">記録された歴史的不満はありません。</p>';
  const populationEstimate = region.populationEstimate.exact
    ? formatValue(region.populationEstimate.min)
    : `${formatValue(region.populationEstimate.min)} ～ ${formatValue(region.populationEstimate.max)}`;
  return `
    <section class="authority-hero">
      <article><small>総合実効支配</small><strong>${Math.round(region.overallControl)}%</strong><span>法的 ${Math.round(region.legalCentralization)}% / 実務 ${Math.round(region.practicalCentralization)}%</span></article>
      <article><small>推定人口</small><strong>${populationEstimate}</strong><span>情報精度 ${region.informationPrecision}% / 戸籍 ${region.populationKnowledge}%</span></article>
      <article><small>中央行政</small><strong>${network.load} / ${network.capacity}</strong><span>負荷率 ${network.utilization}%${network.overload > 0 ? ` · 超過 ${network.overload}` : " · 処理余力あり"}</span></article>
      <article><small>中央集権度（結果）</small><strong>${centralization.resultIndex}%</strong><span>直接操作不可 · 実効支配と制度から算出</span></article>
    </section>
    <section class="authority-capability-panel">
      <header><div><small>STATE CAPABILITIES</small><h2>中央政府の代替能力</h2></div><p>地方勢力を排除した後、この能力で実務を引き受ける。</p></header>
      <div class="authority-capability-grid">${capabilityCards}</div>
    </section>
    <section class="authority-workbench">
      <aside class="authority-domain-list"><header><small>REGION × AUTHORITY</small><h2>権限台帳</h2></header>${domainButtons}</aside>
      <div class="authority-domain-detail">
        <header class="authority-domain-heading"><div><small>${AUTHORITY_DOMAINS[selectedDomain.id].group.toUpperCase()}</small><h2>${selectedDomain.name}</h2></div><b>実効 ${Math.round(selectedDomain.effectiveControl)}%</b></header>
        <div class="authority-share-strip"><span>中央・法的権限 <b>${Math.round(selectedDomain.legalShare)}%</b></span><span>中央・実務権限 <b>${Math.round(selectedDomain.practicalShare)}%</b></span><span>最大地方保有者 <b>${selectedDomain.dominantLocalHolder?.name ?? "なし"}</b></span></div>
        <div class="authority-factor-grid">${factorCards}</div>
        <article class="replacement-capacity-card">
          <header><div><small>代替制度なしの廃止は危険</small><h3>地方が処理中の仕事 ${selectedDomain.localWorkload}</h3></div><b class="${selectedDomain.replacementCoverage < 80 ? "is-danger" : ""}">代替 ${selectedDomain.replacementCoverage}%</b></header>
          <p>中央側の処理可能量 ${selectedDomain.replacementCapacity}。改革準備度 ${selectedDomain.reformReadiness}%${selectedDomain.replacementCoverage < 80 ? "。今すぐ権限を奪うと、未処理・闇行政・旧勢力復活が発生しやすい。" : "。移管後の実務を引き受けられる見込みがある。"}</p>
        </article>
        <section class="historical-privilege-list"><header><h3>歴史的権利</h3><small>過去の妥協が現在の正統性を持つ</small></header>${privileges}</section>
        ${reformStatus}
        <section class="authority-method-grid">${methodCards}</section>
        <button class="forced-reform-button" type="button" data-force-authority-reform data-city-id="${city.cityId}" data-domain-id="${selectedDomain.id}" data-method-id="eliminate" ${activeReform || !reform.forced.affordable ? "disabled" : ""}><strong>${reform.forced.affordable ? "準備工程を飛ばして強行" : "州庫留保が不足"}</strong><span>${reform.forced.warning} 反動 ${reform.forced.backlashRisk} / 金 ${reform.forced.cost}</span></button>
      </div>
    </section>
    <section class="historical-grievance-panel"><header><div><small>HISTORICAL GRIEVANCES</small><h2>歴史的不満</h2></div><b>地域圧力 ${region.grievancePressure}</b></header>${grievanceRows}</section>
    <details class="legacy-administration-panel">
      <summary>太守委任・州郡統合の運用設定</summary>
      <section class="city-detail-columns">
        <article class="city-sheet"><header><h2>統治方式</h2><small>直轄は精密、委任は拡張向け</small></header><div class="policy-options">${modeCards}</div></article>
        <article class="city-sheet"><header><h2>${administration.stage.name}</h2><small>統合 ${administration.integration}%</small></header><p>${administration.stage.description}</p><p>戸籍人口 ${formatValue(administration.registeredPopulation)} · 動員可能兵 ${formatValue(administration.mobilizableTroops)} · 兵糧 ${formatValue(administration.deliverableFood)}。</p></article>
        <article class="city-sheet"><header><h2>直近の委任報告</h2><small>${administration.modeName} · ${administration.mandateName}</small></header>${lastAction}</article>
      </section>
      <section class="policy-grid">${mandateCards}</section>
    </details>
  `;
}

function renderCityFacilities(city) {
  const selected = city.facilities.facilities.find((facility) => facility.id === view.selectedFacilityId)
    ?? city.facilities.facilities[0];

  function getFacilityPlan(facility) {
    const project = state.cities[city.cityId].projects.find((item) => item.facilityId === facility.id);
    const pending = state.pendingOrders.find((order) => order.kind === "facility" && order.cityId === city.cityId && order.facilityId === facility.id);
    const target = Math.min(3, facility.level + 1);
    return {
      project,
      pending,
      target,
      cost: facility.baseCost + facility.costGrowth * facility.level,
      duration: facility.durationBase + (target === 3 ? 1 : 0),
      governanceCost: target === 3 ? 2 : 1,
    };
  }

  function tileStatus(facility, plan) {
    if (plan.project) return `建設中 · 残り${plan.project.remainingTurns}か月`;
    if (plan.pending) return "今月の計画に予約済み";
    if (facility.level >= 3) return "最大レベル";
    if (facility.level === 0) return "未建設";
    return `稼働 ${Math.round(facility.operatingRate * 100)}%`;
  }

  const selectedSite = FACILITY_SITES[selected.id];
  const selectedPlan = getFacilityPlan(selected);
  const nextUpkeep = selected.upkeep * selectedPlan.target;
  const nextWorkers = selected.workers * selectedPlan.target;
  const action = selectedPlan.project
    ? `<div class="facility-project-state">建設中 · 完成まで残り${selectedPlan.project.remainingTurns}か月</div>`
    : selectedPlan.pending
      ? `<div class="facility-project-state pending">予約済み · 金${selectedPlan.cost} / ${selectedPlan.duration}か月 / 統治${selectedPlan.governanceCost}</div>`
      : selected.level >= 3
        ? '<button class="facility-management-action" type="button" disabled>この区画は最大レベルです</button>'
        : `<button class="facility-management-action" type="button" data-queue-facility="${selected.id}" data-city-id="${city.cityId}">Lv.${selectedPlan.target}へ強化 · 金${selectedPlan.cost} / ${selectedPlan.duration}か月 / 統治${selectedPlan.governanceCost}</button>`;

  return `
    <section class="facility-workspace">
      <header class="facility-workspace-heading">
        <div><span>DISTRICT FACILITIES</span><h2>施設区画</h2></div>
        <p>区画タイルを選び、施設を一か所ずつ管理します。</p>
      </header>
      <div class="facility-layout">
        <section class="facility-site-board" aria-label="施設区画一覧">
          <div class="facility-site-grid" role="tablist" aria-label="管理する施設区画">
            ${city.facilities.facilities.map((facility, index) => {
              const site = FACILITY_SITES[facility.id];
              const plan = getFacilityPlan(facility);
              const active = facility.id === selected.id;
              const stateClass = plan.project ? "is-building" : plan.pending ? "is-pending" : facility.operatingRate < 0.7 && facility.level > 0 ? "is-stalled" : "";
              return `<button id="facility-site-${facility.id}" class="facility-site-tile ${active ? "is-active" : ""} ${stateClass}" type="button" role="tab" aria-selected="${active}" aria-controls="facility-management-panel" data-select-facility="${facility.id}" style="--site-accent:${site.accent}"><span class="facility-site-number">区画 ${String(index + 1).padStart(2, "0")} · ${site.area}</span><span class="facility-site-mark">${facility.icon}</span><span class="facility-site-name"><strong>${site.name}</strong><small>${facility.name} · ${site.detail}</small></span><b>Lv.${facility.level}</b><span class="facility-site-rate"><i style="width:${Math.round(facility.operatingRate * 100)}%"></i></span><em>${tileStatus(facility, plan)}</em></button>`;
            }).join("")}
          </div>
        </section>
        <article id="facility-management-panel" class="facility-management ${selected.operatingRate < 0.7 && selected.level > 0 ? "is-stalled" : ""}" role="tabpanel" aria-labelledby="facility-site-${selected.id}">
          <header style="--site-accent:${selectedSite.accent}">
            <span class="facility-management-mark">${selected.icon}</span>
            <div><small>${selectedSite.area} · ${selectedSite.detail}</small><h3>${selectedSite.name}</h3><p>${selected.name}を管理</p></div>
            <b>Lv.${selected.level}</b>
          </header>
          <div class="facility-management-body">
            <p>${selected.description}</p>
            <div class="facility-effect">${selected.effect}</div>
            <div class="facility-management-stats">
              <div><small>稼働率</small><strong>${Math.round(selected.operatingRate * 100)}%</strong></div>
              <div><small>施設状態</small><strong>${Math.round(selected.condition)}%</strong></div>
              <div><small>月次維持</small><strong>${formatValue(selected.upkeepTotal, 1)}${selected.level < 3 ? ` → ${formatValue(nextUpkeep, 1)}` : ""}</strong></div>
              <div><small>必要労働</small><strong>${formatValue(selected.requiredWorkers)}${selected.level < 3 ? ` → ${formatValue(nextWorkers)}` : ""}</strong></div>
            </div>
            ${action}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderCityFactions(city) {
  return `
    <section class="faction-grid">
      ${city.factions.map((faction) => `<article class="faction-card ${faction.radicalism >= 45 ? "is-danger" : ""}"><header><span>${faction.icon}</span><div><small>派閥</small><h3>${faction.name}</h3></div><b>影響 ${faction.influence}</b></header><p>${faction.demand}</p><div class="faction-meters">${meter("支持", faction.support)}${meter("過激度", faction.radicalism, "/ 100", "danger-meter")}</div><div class="faction-actions">${Object.values(FACTION_ACTIONS).map((action) => `<button type="button" data-queue-faction="${faction.id}" data-action="${action.id}" data-city-id="${city.cityId}"><strong>${action.name}</strong><small>金${action.money}・統治${action.governanceCost}<br>${action.detail}</small></button>`).join("")}</div></article>`).join("")}
    </section>
  `;
}

const REPORT_METRICS = [
  ["money", "金銭", 1], ["food", "食料", 0], ["population", "人口", 0], ["security", "治安", 1], ["support", "民心", 1],
];

function reportCausalRows(local) {
  return REPORT_METRICS.map(([key, label, digits]) => {
    const orders = local.breakdown?.orders?.[key] ?? 0;
    const monthly = local.breakdown?.monthly?.[key] ?? local.changes[key] ?? 0;
    const external = local.breakdown?.external?.[key] ?? 0;
    return `<div><strong>${label}</strong><span>命令・委任 ${signed(orders, digits)}</span><span>月次 ${signed(monthly, digits)}</span><span>戦争・事件 ${signed(external, digits)}</span><b>計 ${signed(local.changes[key] ?? 0, digits)}</b></div>`;
  }).join("");
}

function reportActionRows(report, cityId) {
  const actions = (report.actions ?? []).filter((action) => !cityId || action.cityId === cityId);
  if (!actions.length) return `<p class="report-empty-detail">${cityId ? "この都市を対象とする確定施策はありません。王国全体の施策は上の国家活動で確認できます。" : "この月に確定した施策はありません。"}</p>`;
  return actions.map((action) => {
    const cost = [action.cost?.money ? `金 ${action.cost.money}` : "", action.cost?.draftPopulation ? `徴募 ${action.cost.draftPopulation}` : "", action.governanceCost ? `統治 ${action.governanceCost}` : ""].filter(Boolean).join(" · ");
    const status = action.status === "failed" ? "失敗" : action.status === "completed" ? "完了" : "進行中";
    const place = action.townId ? `${WORLD.villages[action.townId]?.name ?? action.townId} · ` : action.cityId ? `${WORLD.provinces[action.cityId]?.name ?? action.cityId} · ` : "";
    return `<div class="report-action ${action.status === "failed" ? "is-failed" : ""}"><strong>${action.title}</strong><span>${place}${status}${cost ? ` · ${cost}` : ""}</span><small>${action.detail}</small></div>`;
  }).join("");
}

function nationalActivityCard(report) {
  if (!report) return "";
  const events = (report.events ?? []).map((item) => `<div class="national-event-row"><strong>${WORLD.provinces[item.cityId]?.name ?? item.cityId} · ${item.title}</strong><span>${item.choice}</span><small>${item.detail ?? ""}</small></div>`).join("");
  return `
    <details class="national-activity-card report-fold">
      <summary><div><small>REALM-WIDE REGISTER</small><h2>今月の国家活動</h2></div><span>${(report.actions ?? []).length}施策 · ${(report.events ?? []).length}事件</span></summary>
      <div class="national-activity-grid report-fold-body">
        <article><h3>確定施策</h3><div class="report-actions">${reportActionRows(report, null)}</div></article>
        <article><h3>重大事件</h3>${events || '<p class="report-empty-detail">この月の重大事件はありません。</p>'}</article>
      </div>
    </details>
  `;
}

function reportWarRows(report) {
  const entries = [];
  if (report.aggression) entries.push('<p class="report-war is-danger"><strong>敵軍侵攻</strong><small>東部国境軍が国土防衛戦へ移行しました。</small></p>');
  if (report.war) {
    const war = report.war;
    entries.push(`<p class="report-war"><strong>戦況 ${signed(war.delta, 1)} · 自軍損失 ${formatValue(war.ownLoss)}</strong><small>敵軍損失 ${formatValue(war.enemyLoss)} · 食料 ${formatValue(war.foodCost)} · 施設被害 ${formatValue(war.damage, 1)} · 避難民 ${formatValue(war.displaced)} · 住民被害 ${formatValue(war.civilianLosses)}</small></p>`);
  }
  (report.occupations ?? []).forEach((occupation) => {
    entries.push(`<p class="report-war ${occupation.resistanceLoss ? "is-danger" : ""}"><strong>占領統治 · ${occupation.policyName}</strong><small>${occupation.supplied ? "費用・補給充足" : "費用または補給不足"} · 統制 ${signed(occupation.controlDelta, 1)} · 抵抗 ${signed(occupation.resistanceDelta, 1)} · 統合 ${signed(occupation.integrationDelta, 1)} · 避難民 ${signed(occupation.displacedDelta)}</small></p>`);
  });
  return entries.length ? `<h3>戦争・占領</h3>${entries.join("")}` : "";
}

function decisionHighlightsCard(report) {
  const highlights = report?.highlights ?? [];
  if (!highlights.length) return "";
  return `
    <section class="decision-highlights">
      <header><div><small>DECISION BRIEF</small><h2>今月の重要変化</h2></div><span>先に3件だけ確認</span></header>
      <div>${highlights.map((highlight) => `<details><summary><strong>${highlight.title}</strong><b>${highlight.change}</b></summary><dl><div><dt>なぜ</dt><dd>${highlight.cause}</dd></div><div><dt>次に効くこと</dt><dd>${highlight.effect}</dd></div><div><dt>残る記録</dt><dd>${highlight.legacy}</dd></div></dl></details>`).join("")}</div>
    </section>`;
}

function reportStrategicRows(report) {
  const dispatches = (report.foreignDispatches ?? []).slice(0, 3).map((dispatch) => `<div class="report-strategic-row"><strong>${dispatch.countryName} · ${dispatch.intent}</strong><span>${dispatch.effect}</span><small>国家意図：${dispatch.agenda}</small></div>`).join("");
  const reactions = (report.officerReactions ?? []).slice(0, 3).map((reaction) => `<div class="report-strategic-row ${reaction.disposition < 0 ? "is-negative" : ""}"><strong>${reaction.title}</strong><span>${reaction.disposition > 0 ? "忠誠と人物関係が改善" : "忠誠と人物関係が悪化"}</span><small>${reaction.detail}</small></div>`).join("");
  if (!dispatches && !reactions) return "";
  return `<h3>人物政治・世界情勢</h3><div class="report-strategic-list">${reactions}${dispatches}</div>`;
}

function fiscalEntries(section, definitions) {
  return Object.values(definitions).map((definition) => ({
    ...definition,
    value: Math.max(0, Number(section?.[definition.id]) || 0),
  }));
}

function fiscalGradient(entries, total) {
  if (total <= 0) return "conic-gradient(#d8d1c3 0% 100%)";
  let cursor = 0;
  const segments = entries.filter((entry) => entry.value > 0).map((entry) => {
    const start = cursor;
    cursor += entry.value / total * 100;
    return `${entry.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function fiscalChart(title, section, definitions, compact = false) {
  const entries = fiscalEntries(section, definitions);
  const total = Math.max(0, Number(section?.total) || entries.reduce((sum, entry) => sum + entry.value, 0));
  const legend = entries.map((entry) => {
    const percent = total > 0 ? entry.value / total * 100 : 0;
    return `<li><i style="--fiscal-color:${entry.color}"></i><span>${entry.name}</span><strong>${formatValue(entry.value, 1)}</strong><small>${formatValue(percent, 1)}%</small></li>`;
  }).join("");
  return `
    <article class="fiscal-chart ${compact ? "is-compact" : ""}">
      <header><h3>${title}</h3><strong>金 ${formatValue(total, 1)}</strong></header>
      <div class="fiscal-chart-body">
        <div class="fiscal-donut" role="img" aria-label="${title} 合計 ${formatValue(total, 1)}" style="--fiscal-gradient:${fiscalGradient(entries, total)}"><span><small>${title}</small><b>${formatValue(total, 1)}</b></span></div>
        <ul class="fiscal-legend">${legend}</ul>
      </div>
    </article>
  `;
}

function fiscalCharts(fiscal, compact = false) {
  return `<div class="fiscal-chart-grid ${compact ? "is-compact" : ""}">${fiscalChart("歳入", fiscal.income, REVENUE_CATEGORIES, compact)}${fiscalChart("支出", fiscal.expenditure, SPENDING_CATEGORIES, compact)}</div>`;
}

function fiscalReportCard(report) {
  const fiscal = report.fiscal;
  const positive = fiscal.balance >= 0;
  return `
    <details class="fiscal-report-card report-fold">
      <summary>
        <div><span>NATIONAL FINANCE · ${report.year} ${report.monthName}</span><h2>国家財政レポート</h2><p>全都市の税収、維持費、国家支出、臨時収支を集計</p></div>
        <div class="fiscal-balance ${positive ? "is-surplus" : "is-deficit"}"><small>当月${positive ? "黒字" : "赤字"}</small><strong>${signed(fiscal.balance, 1)}</strong><span>国庫 ${formatValue(fiscal.openingTreasury, 1)} → ${formatValue(fiscal.closingTreasury, 1)}</span></div>
      </summary>
      <div class="report-fold-body">${fiscalCharts(fiscal)}
        <p class="fiscal-note">支出は「社会保障・軍事関連・研究開発・対外援助・国債返済・経済投資」の六分類で集計しています。</p>
      </div>
    </details>
  `;
}

function renderCityReports(city) {
  const reports = state.monthlyReports.filter((report) => report.cities.some((item) => item.cityId === city.cityId)).slice(0, 18);
  const annual = state.annualReports.slice(0, 6);
  const events = state.monthlyReports.flatMap((report) => report.events.map((item) => ({ ...item, year: report.year, monthName: report.monthName })));
  const latestFiscalReport = state.monthlyReports.find((report) => report.fiscal);
  return `
    ${decisionHighlightsCard(reports[0])}
    ${latestFiscalReport ? fiscalReportCard(latestFiscalReport) : '<section class="fiscal-report-empty"><strong>国家財政レポート</strong><p>月を終えると、歳入・六分類支出・収支のグラフを作成します。</p></section>'}
    ${nationalActivityCard(reports[0])}
    <section class="report-columns">
      <article class="report-list monthly-report-list"><header><h2>月次報告</h2><small>${reports.length}件 · 要約を開いて内訳を確認</small></header>${reports.length ? reports.map((report) => { const local = report.cities.find((item) => item.cityId === city.cityId); return `<details><summary><span>${report.year}年 ${report.monthName}</span><b>金 ${signed(local.changes.money, 1)} · 食 ${signed(local.changes.food)}</b></summary><div class="report-total-strip"><span>人口 <b>${signed(local.changes.population)}</b></span><span>治安 <b>${signed(local.changes.security, 1)}</b></span><span>民心 <b>${signed(local.changes.support, 1)}</b></span></div><h3>因果内訳</h3><div class="report-causal-grid">${reportCausalRows(local)}</div><h3>命令・委任政務</h3><div class="report-actions">${reportActionRows(report, city.cityId)}</div>${report.events.filter((item) => item.cityId === city.cityId).map((item) => `<p class="report-event">事件「${item.title}」— ${item.choice}<small>${item.detail ?? ""}</small></p>`).join("")}${reportStrategicRows(report)}${reportWarRows(report)}</details>`; }).join("") : '<p class="empty-candidates">月を終えると報告が蓄積されます。</p>'}</article>
      <div class="report-side-stack">
        <details class="report-fold report-collection"><summary><strong>年次総括</strong><span>${annual.length}件</span></summary><article class="report-list">${annual.length ? annual.map((report) => report.fiscal ? `<details class="annual-report"><summary><span>誓暦${report.year}年</span><b>${report.fiscal.balance >= 0 ? "黒字" : "赤字"} ${signed(report.fiscal.balance, 1)}</b></summary>${report.ending ? `<p class="annual-ending"><strong>${report.ending.name}</strong><span>${report.ending.description}</span></p>` : ""}${fiscalCharts(report.fiscal, true)}${report.decisions?.length ? `<h3>年の主要決定</h3>${report.decisions.slice(0, 5).map((decision) => `<p class="annual-decision"><strong>${decision.title}</strong><span>${decision.change} · ${decision.effect}</span></p>`).join("")}` : ""}<small>${report.months}か月集計 · 重大事件 ${report.events}件</small></details>` : `<div class="annual-report"><strong>誓暦${report.year}年</strong><span>金 ${signed(report.totals.money, 1)} / 食料 ${signed(report.totals.food)} / 人口 ${signed(report.totals.population)}</span><small>重大事件 ${report.events}件</small></div>`).join("") : '<p class="empty-candidates">12月終了時に年次総括を作成します。</p>'}</article></details>
        <details class="report-fold report-collection"><summary><strong>王国事件履歴</strong><span>${events.length}件</span></summary><article class="report-list">${events.length ? events.map((item) => `<div class="report-history-item"><strong>${item.year}年 ${item.monthName} · ${WORLD.provinces[item.cityId]?.name ?? item.cityId} · ${item.title}</strong><span>${item.choice}</span><small>${item.detail ?? ""}</small></div>`).join("") : '<p class="empty-candidates">王国内の重大事件はまだありません。</p>'}</article></details>
      </div>
    </section>
  `;
}

function historyEventDate(event) {
  return `誓暦${event.year}年${event.month ? ` ${event.month}月` : ""}`;
}

function renderCityHistory(city) {
  const history = getHistoricalOverview(state, city.cityId);
  const strongest = history.pressures[0];
  const pressureCards = history.pressures.map((pressure) => {
    const definition = PRESSURE_DEFINITIONS[pressure.pressureId];
    const trend = pressure.trend > 0 ? `+${pressure.trend.toFixed(1)}` : pressure.trend.toFixed(1);
    const drivers = pressure.drivers.slice(0, 3).map((driver) => `<li><span>${driver.label}</span><b>${Math.round(driver.value)}</b></li>`).join("");
    return `
      <article class="history-pressure-card is-stage-${pressure.stageIndex}">
        <header><div><small>${definition.id.toUpperCase()} PRESSURE</small><h3>${definition.name}</h3></div><b>${Math.round(pressure.value)}</b></header>
        <div class="history-pressure-track"><i style="width:${pressure.value}%"></i></div>
        <p><strong>${pressure.stage}</strong><span>前月比 ${trend}</span></p>
        <ul>${drivers}</ul>
      </article>
    `;
  }).join("");
  const legacies = history.institutionalLegacies.map((legacy) => {
    const origin = history.events.find((event) => event.id === legacy.originEventId);
    return `
      <article class="institutional-legacy-card">
        <header><div><small>INSTITUTIONAL LEGACY · ${legacy.domain}</small><h3>${legacy.name}</h3></div><b>${Math.round(legacy.persistence)}</b></header>
        <p>${legacy.currentEffect}</p>
        <footer><span>${origin ? historyEventDate(origin) : `誓暦${legacy.originYear}年`}</span><strong>${origin?.title ?? "起源記録を照合中"}</strong></footer>
      </article>
    `;
  }).join("");
  const eras = history.eras.map((era) => `
    <details class="history-era" ${era === history.eras.at(-1) ? "open" : ""}>
      <summary><span>${era.startYear === era.endYear ? `誓暦${era.startYear}年` : `誓暦${era.startYear}–${era.endYear}年`}</span><strong>${era.title}</strong><b>${era.events.length}件</b></summary>
      ${era.events.map((event) => `<article><small>${historyEventDate(event)} · ${event.type}</small><h3>${event.title}</h3><p>${event.summary}</p></article>`).join("")}
    </details>
  `).join("");
  const accounts = history.accounts.map((event) => `
    <article class="historical-account-card">
      <header><small>${historyEventDate(event)}</small><h3>${event.title}</h3></header>
      <dl><div><dt>世界の事実</dt><dd>${event.accounts.worldTruth}</dd></div><div><dt>公的記録</dt><dd>${event.accounts.historicalRecord}</dd></div><div><dt>人々の記憶</dt><dd>${event.accounts.publicBelief}</dd></div></dl>
    </article>
  `).join("");
  const trace = history.latestTrace.length
    ? history.latestTrace.map((edge) => `<li style="--trace-depth:${edge.depth}"><span>${edge.relation === "enabled_by" ? "成立条件" : "原因"}</span><strong>${edge.from.label}</strong><small>→ ${edge.to.label}</small></li>`).join("")
    : '<li class="is-empty"><strong>起源より前の記録は残っていません。</strong></li>';
  return `
    <section class="history-hero">
      <article><small>CURRENT PRESSURE</small><strong>${strongest ? `${strongest.stage} · ${Math.round(strongest.value)}` : "安定"}</strong><span>${strongest ? PRESSURE_DEFINITIONS[strongest.pressureId].name : "圧力なし"}</span></article>
      <article><small>INSTITUTIONAL LEGACIES</small><strong>${history.institutionalLegacies.length}件</strong><span>現在の統治ルールへ接続</span></article>
      <article><small>CAUSAL EVENTS</small><strong>${history.events.length}件</strong><span>原因と結果を持つ記録</span></article>
    </section>
    <section class="history-pressure-panel"><header><div><small>PRESSURE → MANIFESTATION</small><h2>蓄積圧力</h2></div><p>事件は無作為に生えず、閾値を越えた危機の発生月だけが揺らぎます。</p></header><div class="history-pressure-grid">${pressureCards}</div></section>
    <section class="history-ledger-grid">
      <article class="history-ledger"><header><small>EVENT STORE → ERA COMPILER</small><h2>${WORLD.provinces[city.cityId].name}年代記</h2></header>${eras}</article>
      <aside class="history-causal-trace"><header><small>CAUSAL DAG</small><h2>最新記録の原因</h2></header><ol>${trace}</ol></aside>
    </section>
    <section class="institutional-legacy-panel"><header><div><small>PAST → CURRENT RULES</small><h2>制度的負債</h2></div><p>過去に譲渡した権限が、現在の中央集権化を制約します。</p></header><div>${legacies || '<p class="history-empty">この地域に有効な制度的負債はありません。</p>'}</div></section>
    <section class="historical-account-panel"><header><div><small>TRUTH ≠ BELIEF</small><h2>事実・記録・記憶</h2></div><p>同じ事件でも、内部事実と人々の理解を分離して保存します。</p></header><div>${accounts}</div></section>
  `;
}

function renderCityWorkspace() {
  const active = view.panel === "city" || view.panel === "town";
  elements.mapStage.classList.toggle("is-city-mode", active);
  elements.cityWorkspace.classList.toggle("is-hidden", !active);
  elements.cityWorkspace.setAttribute("aria-hidden", String(!active));
  if (!active) return;
  if (view.panel === "town") {
    const town = getTownAdministration(state, view.selectedTownId);
    const governorId = state.cities[town.cityId].governorId;
    const body = {
      overview: renderTownOverview,
      office: renderTownOffice,
      commands: renderTownCommands,
      records: renderTownRecords,
    }[view.townTab](town);
    elements.cityWorkspace.innerHTML = `${townWorkspaceHeader(town, getOfficerReport(state, governorId))}<div class="city-workspace-body town-workspace-body">${body}</div>`;
    return;
  }
  const city = withPlanningForecast(deriveCityMetrics(state, view.selectedCityId));
  const governor = getOfficerReport(state, city.governorId);
  const body = {
    overview: renderCityOverview, population: renderCityPopulation, economy: renderCityEconomy,
    administration: renderCityAdministration, facilities: renderCityFacilities, factions: renderCityFactions, history: renderCityHistory, reports: renderCityReports,
  }[view.cityTab](city);
  elements.cityWorkspace.innerHTML = `${cityWorkspaceHeader(city, governor)}<div class="city-workspace-body">${body}</div>`;
}

function knowledgeLabel(value) {
  return ({ defined: "設定あり", partial: "一部未詳", unknown: "未詳" })[value] ?? value;
}

function worldModeSwitch() {
  return `
    <div class="world-mode-switch" role="group" aria-label="世界台帳の表示">
      <button type="button" data-world-mode="nations" class="${view.atlasMode === "nations" ? "is-active" : ""}">国家</button>
      <button type="button" data-world-mode="peoples" class="${view.atlasMode === "peoples" ? "is-active" : ""}">種族</button>
      <button type="button" data-world-mode="statistics" class="${view.atlasMode === "statistics" ? "is-active" : ""}">統計</button>
    </div>
  `;
}

function nationPeopleChips(nationId) {
  const people = getPeopleForNation(nationId);
  const confirmed = people.confirmed.map((item) => `<button type="button" class="world-link-chip is-confirmed" data-world-people="${item.id}">${item.name}</button>`);
  const related = people.related.map((item) => `<button type="button" class="world-link-chip is-related" data-world-people="${item.id}" title="Notion上で直接の構成種族とは確定していません">関連：${item.name}</button>`);
  return [...confirmed, ...related].join("") || '<span class="world-unset">構成種族の対応なし</span>';
}

function renderWorldNations() {
  const selected = SETTING_NATIONS[view.selectedNationId] ?? Object.values(SETTING_NATIONS)[0];
  const relations = getNationRelations(selected.id);
  const relationLines = [];
  if (relations.suzerain) relationLines.push(`宗主国：${relations.suzerain.name}`);
  if (relations.protectorates.length) relationLines.push(`保護領：${relations.protectorates.map((nation) => nation.name).join(" / ")}`);
  if (!relationLines.length) relationLines.push("Notion上で国家間の従属関係なし");
  const visibleNations = Object.values(SETTING_NATIONS).filter((nation) => (
    view.worldNationFilter === "all"
    || (view.worldNationFilter === "defined" && nation.knowledge === "defined")
    || (view.worldNationFilter === "uncertain" && nation.knowledge !== "defined")
    || (view.worldNationFilter === "linked" && (nation.suzerainId || nation.protectorateIds.length))
  ));
  const cards = visibleNations.map((nation) => `
    <button type="button" class="world-nation-card ${nation.id === selected.id ? "is-active" : ""}" data-world-nation="${nation.id}">
      <span class="world-sigil" style="--nation-color:${nation.color}">${nation.sigil}</span>
      <span><strong>${nation.name}</strong><small>${nation.polity}<br>${nation.peopleLabel}</small></span>
      <em class="knowledge-${nation.knowledge}">${knowledgeLabel(nation.knowledge)}</em>
    </button>
  `).join("");
  return `
    ${view.worldGuideOpen ? `
    <section class="world-onboarding" aria-label="世界台帳の見方">
      <header><div><small>START HERE</small><h2>最初は三つだけ見ればよい</h2></div><button type="button" data-world-guide-toggle aria-label="世界台帳の案内を閉じる">閉じる</button></header>
      <ol>
        <li><b>1</b><span><strong>問いで絞る</strong><small>確定情報を見るか、未詳国を調べるかを選ぶ。</small></span></li>
        <li><b>2</b><span><strong>一国を開く</strong><small>説明・構成種族・従属関係だけを先に読む。</small></span></li>
        <li><b>3</b><span><strong>地図で位置を確認</strong><small>地図収録国なら選択国が世界図でも強調される。</small></span></li>
      </ol>
      <div class="world-onboarding-actions"><button type="button" data-world-filter="defined">確定国から見る</button><button type="button" data-world-filter="uncertain">未詳国を洗う</button><button type="button" data-world-filter="linked">従属関係を見る</button></div>
    </section>` : ""}
    <section class="world-dossier" style="--nation-color:${selected.color}">
      <header><span class="world-sigil large">${selected.sigil}</span><div><small>${selected.polity}</small><h2>${selected.name}</h2><b class="knowledge-${selected.knowledge}">${knowledgeLabel(selected.knowledge)}</b></div></header>
      <p>${selected.description}</p>
      <div class="world-link-row">${nationPeopleChips(selected.id)}</div>
      <div class="world-relation-note">${relationLines.join("<br>")}</div>
    </section>
    <section class="panel-section">
      <div class="section-heading"><h2>国家一覧</h2><small>${visibleNations.length} / ${Object.keys(SETTING_NATIONS).length}国家</small></div>
      <div class="world-filter-row" aria-label="国家一覧の絞り込み">
        ${[["all", "すべて"], ["defined", "設定確定"], ["uncertain", "情報不足"], ["linked", "従属関係"]].map(([id, label]) => `<button type="button" data-world-filter="${id}" class="${view.worldNationFilter === id ? "is-active" : ""}">${label}</button>`).join("")}
      </div>
      <div class="world-nation-list">${cards}</div>
    </section>
  `;
}

function renderWorldPeoples() {
  const selected = PEOPLES[view.selectedPeopleId] ?? PEOPLES.acrane;
  const representative = PEOPLE_REPRESENTATIVES[selected.id];
  const nations = getNationsForPeople(selected.id);
  const nationLinks = nations.length
    ? nations.map((nation) => `<button type="button" class="world-link-chip ${nation.association === "confirmed" ? "is-confirmed" : "is-related"}" data-world-nation="${nation.id}">${nation.association === "confirmed" ? "所属" : "関連"}：${nation.name}</button>`).join("")
    : '<span class="world-unset">Notion上で国家帰属は未設定</span>';
  const listedPeoples = NOTION_OTHER_RACE_IDS.map((id) => PEOPLES[id]);
  const auxiliaryPeoples = Object.values(PEOPLES).filter((people) => people.auxiliary);
  const raceCards = [...listedPeoples, ...auxiliaryPeoples].map((people) => {
    const links = getNationsForPeople(people.id);
    const meta = people.auxiliary ? "補助分類" : links.length ? `国家関連 ${links.length}` : "国家未設定";
    const portrait = PEOPLE_REPRESENTATIVES[people.id];
    return `
      <button type="button" class="world-people-card ${people.id === selected.id ? "is-active" : ""} ${people.auxiliary ? "is-auxiliary" : ""}" data-world-people="${people.id}">
        <img src="${portrait.image}" alt="" loading="lazy"><strong>${people.name}</strong><small>${portrait.apparentAge} · ${meta}</small>
      </button>
    `;
  }).join("");
  return `
    <section class="world-dossier people-dossier">
      <div class="people-portrait-stage">
        <img src="${representative.image}" alt="${selected.name}を代表する成人女性の肖像">
        <div class="people-portrait-caption"><span>${representative.apparentAge}の代表</span><strong>${representative.role}</strong><small>${representative.expression}</small></div>
      </div>
      <header><span class="world-sigil large">${selected.sigil}</span><div><small>${selected.sourceKind}</small><h2>${selected.name}</h2><b>${selected.family}</b></div></header>
      <p>${selected.note}</p>
      <div class="world-link-row">${nationLinks}</div>
    </section>
    <section class="panel-section">
      <div class="section-heading"><h2>種族一覧</h2><small>異種族15 + 補助2</small></div>
      <div class="world-people-grid">${raceCards}</div>
      <p class="world-source-note">人間は国家設定の基準種、竜族はWorld Create側の補助分類です。確定していない国家との対応は「関連」として区別しています。</p>
    </section>
  `;
}

function statisticDistribution(title, items) {
  if (!items) {
    return `<article class="statistics-distribution is-unavailable"><header><h3>${title}</h3><small>未調査</small></header><p>信頼できる構成比がありません。</p></article>`;
  }
  const rows = items.map((item) => `
    <div class="statistics-share-row">
      <span><b>${item.label}</b><em>${item.share}%</em></span>
      <i><u style="--share:${item.share}%"></u></i>
    </div>
  `).join("");
  return `<article class="statistics-distribution"><header><h3>${title}</h3><small>構成比</small></header>${rows}</article>`;
}

function renderWorldStatistics() {
  const profile = getNationStatistics(view.selectedNationId) ?? getResourceRanking()[0];
  const nation = SETTING_NATIONS[profile.nationId];
  const resourcePower = getResourcePower(profile);
  const resourceRows = profile.resources ? RESOURCE_CATEGORIES.map((category) => `
    <div class="resource-power-row">
      <span>${category.mark}</span><b>${category.label}</b>
      <i><u style="--score:${profile.resources[category.id]}%"></u></i><em>${profile.resources[category.id]}</em>
    </div>
  `).join("") : '<p class="statistics-unavailable">資源調査は未着手です。</p>';
  const ranking = getResourceRanking();
  const rankCards = ranking.map((item, index) => {
    const itemNation = SETTING_NATIONS[item.nationId];
    const score = getResourcePower(item);
    return `
      <button type="button" class="statistics-rank-card ${item.nationId === profile.nationId ? "is-active" : ""}" data-statistics-nation="${item.nationId}">
        <span>${score === null ? "—" : index + 1}</span>
        <strong>${itemNation.name}</strong>
        <small>${score === null ? "統計未調査" : `資源力 ${getResourceGrade(score)}`}</small>
        <b>${score ?? "—"}</b>
      </button>
    `;
  }).join("");
  const summary = getWorldStatisticsSummary();
  const leader = SETTING_NATIONS[summary.resourceLeaderId];
  const metric = (label, value, suffix = "") => `<div><small>${label}</small><strong>${value === null ? "未調査" : `${formatValue(value)}${suffix}`}</strong></div>`;

  return `
    <section class="statistics-overview">
      <div><small>調査済み</small><strong>${summary.surveyedNations} / ${summary.surveyedNations + summary.unavailableNations}か国</strong></div>
      <div><small>把握人口</small><strong>${formatValue(summary.populationTotal)}人</strong></div>
      <div><small>資源力首位</small><strong>${leader.name}</strong></div>
    </section>
    <p class="statistics-basis-note"><b>${STATISTICS_BASIS.label}</b>${STATISTICS_BASIS.note}</p>
    <section class="statistics-dossier" style="--nation-color:${nation.color}">
      <header class="statistics-dossier-heading">
        <span class="world-sigil large">${nation.sigil}</span>
        <div><small>${profile.status === "estimated" ? `統計局推計 · 調査確度 ${profile.surveyQuality}%` : "統計未調査"}</small><h2>${nation.name}</h2><b>${resourcePower === null ? "資源力 未評価" : `総合資源力 ${resourcePower} · ${getResourceGrade(resourcePower)}`}</b></div>
      </header>
      <div class="statistics-metrics">
        ${metric("推計人口", profile.population, "人")}
        ${metric("推計領域", profile.area, " km²")}
        ${metric("都市化率", profile.urbanization, "%")}
        ${metric("調査確度", profile.surveyQuality, "%")}
      </div>
      <p class="statistics-profile-note">${profile.note}</p>
      <div class="statistics-composition-grid">
        ${statisticDistribution("種族", profile.races)}
        ${statisticDistribution("言語", profile.languages)}
        ${statisticDistribution("宗教", profile.religions)}
      </div>
      <article class="resource-power-card">
        <header><div><small>RESOURCE CAPACITY</small><h3>資源力</h3></div><strong>${resourcePower ?? "—"}<small>/ 100</small></strong></header>
        <div class="resource-power-list">${resourceRows}</div>
        <p>食料・森林・鉱物・魔力・水運の5分野を同じ重みで集約した相対指数です。</p>
      </article>
    </section>
    <section class="panel-section">
      <div class="section-heading"><h2>国家別資源力</h2><small>クリックで統計を切替</small></div>
      <div class="statistics-ranking">${rankCards}</div>
    </section>
  `;
}

function renderWorldPanel() {
  const summary = getWorldCatalogSummary();
  const content = view.atlasMode === "peoples"
    ? renderWorldPeoples()
    : view.atlasMode === "statistics" ? renderWorldStatistics() : renderWorldNations();
  elements.leftPanel.innerHTML = `
    <header class="panel-heading world-heading">
      <span>KNOWN WORLD ARCHIVE</span>
      <h1>異種族・国家・統計</h1>
      <p>確定設定と開幕時の推計値を分けて記録</p>
      ${view.atlasMode === "nations" ? `<button class="world-guide-button" type="button" data-world-guide-toggle>${view.worldGuideOpen ? "案内を閉じる" : "見方を表示"}</button>` : ""}
      ${worldModeSwitch()}
    </header>
    <div class="panel-body">
      <section class="panel-section world-summary">
        <div class="realm-facts">
          <div><small>異種族</small><strong>${summary.otherRaces}</strong></div>
          <div><small>国家</small><strong>${summary.nations}</strong></div>
          <div><small>神国保護領</small><strong>${summary.protectorates}</strong></div>
          <div><small>詳細不明国</small><strong>${summary.unknownNations}</strong></div>
        </div>
      </section>
      ${content}
    </div>
  `;
}

function renderDiplomacyPanel() {
  const metrics = deriveMetrics(state);
  const balance = getContinentalBalance(state);
  const campaign = getCampaignStatus(state);
  const aftermathDecision = getAftermathDecisionStatus(state);
  const dispatches = getForeignDispatches(state, 12);
  const selected = getCountryReport(state, view.selectedCountryId) ?? getCountryReport(state, "valka");
  const delegate = getDiplomaticDelegate(selected.id);
  const isValka = selected.id === "valka";
  const borderStatus = isValka ? getBorderNegotiationStatus(state) : null;
  const report = isValka ? getWarCouncilReport(state, "transit") : null;
  const foundation = getGreatPowerFoundation(selected.id);
  const countryCards = balance.countries.filter((country) => country.id !== WORLD.nation.id).map((country) => `
    <button type="button" class="world-nation-card ${country.id === selected.id ? "is-active" : ""}" data-diplomacy-country="${country.id}">
      <span class="world-sigil" style="--nation-color:${country.color}">${country.name.slice(0, 1)}</span>
      <span><strong>${country.name}</strong><small>${country.rank ? `${country.rank} · ` : ""}${country.agenda ?? country.stance} · ${country.intent ?? "情勢観測"}</small></span>
      <em class="${country.relation < 0 ? "knowledge-unknown" : "knowledge-defined"}">${country.relation >= 0 ? "+" : ""}${country.relation}</em>
    </button>`).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>DIPLOMACY</span>
      <h1>大陸外交</h1>
      <p>エルドリア世界圏 · 諸国の関係と介入可能性</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        ${delegate ? `
        <div class="diplomatic-audience">
          <img src="${delegate.representative.image}" alt="${selected.name}の${delegate.people.name}女性代表">
          <div class="diplomatic-audience-copy">
            <span>${delegate.certainty} · ${delegate.representative.apparentAge}</span>
            <strong>${delegate.name ?? `${delegate.people.name}代表`}</strong>
            <small>${delegate.office ?? delegate.representative.role} · ${delegate.representative.expression}</small>
          </div>
        </div>
        <p class="diplomatic-cast-note">${delegate.note}</p>
        ` : ""}
        <div class="diplomatic-target">
          <div class="mini-shield" style="background:${selected.color}">${selected.name.slice(0, 1)}</div><div><strong>${selected.name}</strong><small>${selected.capital} · ${selected.agenda ?? selected.stance}<br>今月の意図：${selected.intent ?? "情勢観測"}</small></div><b class="relation-value">${selected.relation >= 0 ? "+" : ""}${selected.relation}</b>
        </div>
        <div class="metric-stack" style="margin-top:12px">
          ${meter("推定組織", selected.organization)}
          ${meter("大陸機動", selected.mobility)}
          ${meter("第三国介入", metrics.interventionRisk)}
        </div>
      </section>
      ${foundation ? `
      <section class="panel-section great-power-foundation">
        <div class="section-heading"><h2>巨大国家の成立基盤</h2><small>${foundation.type} · 成立指数 ${foundation.score}</small></div>
        <div class="metric-stack">
          ${foundation.factors.map((factor) => meter(factor.label, factor.value)).join("")}
        </div>
        <p class="adviser-note"><strong>環境</strong><br>${foundation.environment}</p>
        <p class="adviser-note"><strong>統合方式</strong><br>${foundation.integration}</p>
        <p class="adviser-note"><strong>構造的限界 · ${foundation.limitingFactor.label}</strong><br>${foundation.limit}</p>
      </section>
      ` : ""}
      <section class="panel-section"><div class="section-heading"><h2>世界諸国</h2><small>${balance.countries.length - 1}か国</small></div><div class="world-nation-list">${countryCards}</div></section>
      ${isValka ? `
      <section class="panel-section border-negotiation-status">
        <div class="section-heading"><h2>灰冠峠の交渉</h2><small class="border-status-badge ${borderStatus.transitSecured ? "is-secured" : borderStatus.talksCompleted ? "is-pending" : ""}">${borderStatus.status}</small></div>
        <div class="border-progress-track" role="progressbar" aria-label="国境会談の工程" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${borderStatus.meetingProgress}"><i style="width:${borderStatus.meetingProgress}%"></i></div>
        <div class="border-progress-facts">
          <span><small>受諾見込み</small><strong>${borderStatus.acceptance}</strong></span>
          <span><small>交渉力</small><strong>${borderStatus.leverage}</strong></span>
          <span><small>期限</small><strong>${borderStatus.deadlineRemaining === null ? "未設定" : `${Math.max(0, borderStatus.deadlineRemaining)}か月`}</strong></span>
          <span><small>仲介国</small><strong>${borderStatus.mediator ? WORLD.countries[borderStatus.mediator]?.name ?? borderStatus.mediator : "なし"}</strong></span>
          <span><small>交渉工程</small><strong>${borderStatus.hasBargainingMove ? "最終案" : borderStatus.talksCompleted ? "条件交換" : "会談準備"}</strong></span>
          <span><small>実行した一手</small><strong>${borderStatus.bargainingLabel}</strong></span>
        </div>
        <p class="adviser-note">${borderStatus.description}</p>
        ${borderStatus.concessions.length ? `<p class="diplomatic-concessions"><strong>提示済み譲歩</strong>${borderStatus.concessions.join(" / ")}</p>` : ""}
        ${borderStatus.talksCompleted && !borderStatus.transitSecured ? `
          <div class="section-heading negotiation-heading"><h2>外交決着案</h2><small>結果は第三幕へ持ち越される</small></div>
          <div class="negotiation-offer-list">${borderStatus.offers.map((offer) => `<button type="button" data-border-settlement="${offer.id}" ${offer.allowed ? "" : "disabled"}><strong>${offer.name}</strong><span>${offer.description}</span><small>${offer.reason}</small></button>`).join("")}</div>
        ` : ""}
      </section>
      ${campaign.actId === "aftermath" ? `
      <section class="panel-section aftermath-policy-panel">
        <div class="section-heading"><h2>第三幕・定着方針</h2><small>${campaign.aftermathPolicy ? `${campaign.acts[2].progress} / ${campaign.acts[2].total}か月` : "一つを選択"}</small></div>
        <div class="aftermath-policy-list">${Object.values(AFTERMATH_POLICIES).map((policy) => `<button type="button" data-aftermath-policy="${policy.id}" class="${campaign.aftermathPolicy === policy.id ? "is-active" : ""}" ${campaign.aftermathPolicy ? "disabled" : ""}><strong>${policy.name}</strong><span>${policy.description}</span><small>定着 ${policy.months}か月</small></button>`).join("")}</div>
        ${aftermathDecision ? `<article class="aftermath-decision-card"><header><div><small>今月の必須裁定</small><h3>${aftermathDecision.title}</h3></div><b>${aftermathDecision.stage + 1} / ${AFTERMATH_POLICIES[aftermathDecision.policyId].months}</b></header><p>${aftermathDecision.prompt}</p><div class="aftermath-choice-list">${aftermathDecision.choices.map((choice) => `<button type="button" data-aftermath-choice="${choice.id}"><strong>${choice.name}</strong><span>${choice.description}</span><small>${choice.impact}</small></button>`).join("")}</div><em>いずれかを決めるまで月を終えられません。</em></article>` : campaign.aftermathPolicy && !campaign.ending ? `<p class="aftermath-ready-note">今月の裁定は完了しました。月末に定着が進み、次の課題が開きます。</p>` : ""}
        ${(state.campaign.aftermathDecisions ?? []).length ? `<details class="aftermath-records"><summary>完了した裁定 ${(state.campaign.aftermathDecisions ?? []).length}件</summary>${state.campaign.aftermathDecisions.map((item) => `<p><strong>${item.title}</strong><span>${item.choice}</span><small>${item.impact}</small></p>`).join("")}</details>` : ""}
        ${campaign.ending ? `<p class="campaign-ending-card"><strong>${campaign.ending.name}</strong><span>${campaign.ending.description}</span></p>` : ""}
      </section>` : ""}
      <section class="panel-section">
        <div class="section-heading"><h2>交渉手段</h2><small>統治力2・担当人物が必要</small></div>
        <div class="spending-shortcut-list">${spendingShortcut("foreign_aid", "使節・援助・対外公示の具体策を選ぶ")}${spendingShortcut("economic_investment", "交易協定への投資を選ぶ")}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>軍師見解</h2><small>確度 ${report.confidence}%</small></div>
        <p class="adviser-note"><strong>${report.posture}（${signed(report.score)}）</strong><br>${report.summary}<br>重点：${report.center.label}<br>周辺最強国：${balance.strongest.name}</p>
        <button class="war-entry-button" type="button" data-open-war ${state.war ? "disabled" : ""}>⚔ 戦争という選択肢を検討</button>
      </section>
      ` : `<section class="panel-section"><div class="section-heading"><h2>国家評定</h2><small>外交台帳</small></div><p class="adviser-note"><strong>${selected.stance}</strong><br>推定兵力 ${formatValue(selected.army)}。この国の関係・敵意・介入意志は、ヴァルカ戦の第三国介入リスクへ反映されます。</p></section>`}
      <section class="panel-section foreign-dispatch-panel">
        <div class="section-heading"><h2>世界公報</h2><small>九か国が毎月更新</small></div>
        <div class="foreign-dispatch-list">${dispatches.length ? dispatches.slice(0, 6).map((dispatch) => `<article><header><strong>${dispatch.countryName}</strong><b>${dispatch.intent}</b></header><span>${dispatch.agenda}</span><small>${dispatch.effect}</small></article>`).join("") : '<p class="empty-candidates">月末を迎えると各国の意図が公報へ届きます。</p>'}</div>
      </section>
    </div>
  `;
}

function warPlanButton(id, name, detail) {
  const active = state.war?.plan === id;
  return `<button class="war-plan ${active ? "is-active" : ""}" type="button" data-war-plan="${id}" aria-pressed="${active}"><span class="selection-state">${active ? "選択中" : "選択"}</span><strong>${name}</strong><small>${detail}</small></button>`;
}

function formationButtons() {
  const current = state.forces.frontier_guard.formation;
  return Object.values(FORMATIONS).map((formation) => {
    const active = formation.id === current;
    return `
    <button type="button" class="formation-card ${active ? "is-active" : ""}" data-formation="${formation.id}" aria-pressed="${active}">
      <span class="selection-state">${active ? "選択中" : "選択"}</span><strong>${formation.name}</strong><small>${formation.description}</small>
    </button>
  `;
  }).join("");
}

function occupationPolicyButtons(occupation) {
  return Object.values(OCCUPATION_POLICIES).map((policy) => `
    <button type="button" class="war-plan ${occupation.policy === policy.id ? "is-active" : ""}" data-occupation-policy="${policy.id}" data-occupation-id="${occupation.id}">
      <strong>${policy.name}</strong><small>${policy.description}</small>
    </button>
  `).join("");
}

function renderOccupationGovernance() {
  const occupations = (state.occupations ?? []).filter((occupation) => occupation.status === "occupied");
  if (!occupations.length) return "";
  return occupations.map((occupation) => {
    const policy = OCCUPATION_POLICIES[occupation.policy];
    const last = occupation.lastReport;
    return `
      <section class="panel-section occupation-governance">
        <div class="section-heading"><h2>${occupation.name}</h2><small>占領 ${occupation.months}か月 · ${policy.name}</small></div>
        <div class="metric-stack">
          ${meter("統制", occupation.control)}${meter("抵抗", occupation.resistance)}
          ${meter("制度統合", occupation.integration)}${meter("文化同化", occupation.assimilation)}
          ${meter("インフラ", occupation.infrastructure)}
        </div>
        <div class="war-consequence-grid">
          <span><small>駐屯兵</small><strong>${formatValue(occupation.garrison)} / ${formatValue(occupation.requiredGarrison)}</strong></span>
          <span><small>避難民</small><strong>${formatValue(occupation.displaced)}</strong></span>
          <span><small>住民被害</small><strong>${formatValue(occupation.civilianLosses)}</strong></span>
        </div>
        ${last ? `<p class="adviser-note"><strong>前月の統治</strong><br>${last.supplied ? "駐屯費・補給を充足" : "駐屯費または補給が不足"} · 抵抗 ${signed(last.resistanceDelta, 1)} · 統合 ${signed(last.integrationDelta, 1)} · インフラ ${signed(last.infrastructureDelta, 1)}</p>` : ""}
        <div class="garrison-controls">
          <button type="button" data-occupation-garrison="${occupation.id}" data-garrison-value="${Math.max(100, occupation.garrison - 100)}">駐屯 -100</button>
          <button type="button" data-occupation-garrison="${occupation.id}" data-garrison-value="${occupation.garrison + 100}">駐屯 +100</button>
        </div>
        <div class="section-heading occupation-policy-heading"><h2>統治政策</h2><small>月次に反映</small></div>
        <div class="war-plan-list occupation-policy-list">${occupationPolicyButtons(occupation)}</div>
        <button class="release-occupation-button" type="button" data-release-occupation="${occupation.id}">自治政府へ移管して撤兵</button>
      </section>
    `;
  }).join("");
}

function renderMilitaryPanel() {
  const metrics = deriveMetrics(state);
  const military = getMilitarySummary(state);
  const ledger = deriveRealmLedger(state);
  const enemyCommander = getEnemyCommander(state);
  if (state.war) {
    const objective = WAR_OBJECTIVES[state.war.objectiveId];
    const peace = state.war.peace;
    const stage = getWarStage(state.war);
    const planOptions = getWarPlanOptions(state.war.side);
    const peaceOptions = getPeaceOptions(state);
    elements.leftPanel.innerHTML = `
      <header class="panel-heading"><span>WAR THEATRE / ${stage.name}</span><h1>${state.war.side === "defender" ? "東境州防衛戦" : "灰冠峠戦役"}</h1><p>目的「${objective.name}」 · 軍団長 ${military.commander.name}</p></header>
      <div class="panel-body">
        <section class="war-status-block">
          <div class="war-score"><span>戦勝点</span><strong>${signed(state.war.score, 1)}</strong></div>
          <div class="metric-stack">${meter("目的達成", state.war.objectiveProgress)}${meter("組織力", military.organization)}${meter("軍需充足", military.supply)}${meter("戦争疲弊", state.warExhaustion)}</div>
        </section>
        <section class="war-consequence-grid">
          <span><small>自軍損失</small><strong>${formatValue(state.war.losses)}</strong></span>
          <span><small>敵軍損失</small><strong>${formatValue(state.war.enemyLosses)}</strong></span>
          <span><small>${state.war.side === "defender" ? "国内破壊" : "敵地破壊"}</small><strong>${formatValue(state.war.side === "defender" ? state.war.homeDamage : state.war.devastation, 1)}</strong></span>
          <span><small>避難民</small><strong>${formatValue(state.war.displaced)}</strong></span>
          <span><small>住民被害</small><strong>${formatValue(state.war.civilianLosses)}</strong></span>
        </section>
        ${enemyCommanderCard(enemyCommander, state.war.lastEnemyAction)}
        <section class="panel-section"><div class="section-heading"><h2>作戦方針</h2><small>現在：${WAR_PLANS[state.war.plan].name}</small></div><div class="war-plan-list">
          ${planOptions.map((plan) => warPlanButton(plan.id, plan.name, plan.description)).join("")}
        </div></section>
        <section class="panel-section"><div class="section-heading"><h2>陣形</h2><small>${FORMATIONS[military.force.formation].name}</small></div><div class="formation-list">${formationButtons()}</div></section>
        <section class="panel-section">
          ${peace ? `<p class="adviser-note"><strong>攻勢限界 ${peace.culminatingRisk}%</strong><br>${peace.recommendation}</p>` : ""}
          <div class="peace-option-list">${peaceOptions.map((option) => `<button class="peace-button" type="button" data-peace-settlement="${option.id}" ${option.allowed ? "" : "disabled"}><strong>${option.name}</strong><small>${option.reason}</small></button>`).join("")}</div>
        </section>
      </div>
    `;
    return;
  }
  elements.leftPanel.innerHTML = `
    <header class="panel-heading"><span>ARMY GROUP</span><h1>${military.force.name}</h1><p>${WORLD.provinces[military.force.baseCityId].name} · ${FORMATIONS[military.force.formation].name}</p></header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="force-commanders">
          <button type="button" data-force-role="commanderId"><small>軍団長</small><strong>${military.commander.name}</strong><span>統率 ${military.commander.stats.leadership} · 武力 ${military.commander.stats.war}</span></button>
          <button type="button" data-force-role="deputyId"><small>副将</small><strong>${military.deputy.name}</strong><span>統率 ${military.deputy.stats.leadership} · 知力 ${military.deputy.stats.intelligence}</span></button>
        </div>
        <div class="realm-facts" style="margin-top:10px">
          <div><small>駐屯兵 / 収容</small><strong>${formatValue(ledger.troops)} / ${formatValue(ledger.troopCapacity)}</strong></div><div><small>輜重隊 / 大陸機動</small><strong>${military.supportColumns}隊 / ${military.mobility}</strong></div>
          <div><small>組織力</small><strong>${military.organization}</strong></div><div><small>軍需充足</small><strong>${military.supply}</strong></div>
        </div>
        <p class="adviser-note">軍団長と副将の相性 ${Math.round(military.mutualBond)}。統率・武力・知力・功績・相性に、防備と駐屯容量を加えて組織力を算出。</p>
      </section>
      <section class="panel-section"><div class="section-heading"><h2>想定敵将</h2><small>主敵ヴァルカ</small></div>${enemyCommanderCard(enemyCommander)}</section>
      <section class="panel-section"><div class="section-heading"><h2>陣形</h2><small>指揮官能力と組合せて計算</small></div><div class="formation-list">${formationButtons()}</div></section>
      <section class="panel-section"><div class="section-heading"><h2>軍事支出</h2><small>国家支出から選択</small></div><div class="spending-shortcut-list">${spendingShortcut("military_affairs", "訓練・動員・軍務人材の具体策を選ぶ")}${spendingShortcut("research_development", "測量と軍事情報の具体策を選ぶ")}</div></section>
      <section class="panel-section"><div class="metric-stack">${meter("加重練度", military.training)}${meter("大陸機動", military.mobility)}${meter("第三国介入", metrics.interventionRisk)}</div></section>
      ${renderOccupationGovernance()}
    </div>
  `;
}

function allegianceLabel(value) {
  return ({ serving: "配下", free: "在野", foreign: "国外", retinue: "友軍" })[value] ?? value;
}

function assignmentLabel(officer) {
  if (!officer.assignment) return "待機";
  const task = state.commandQueue.find((item) => item.id === officer.assignment);
  return task ? `${COMMANDS[task.commandId].name} · 残${task.remainingTurns}か月` : "任務中";
}

function renderPeoplePanel() {
  const cards = Object.keys(state.officers).map((officerId) => {
    const officer = getOfficerReport(state, officerId);
    const politics = getOfficerPoliticalReport(state, officerId);
    const strongestBond = Object.entries(officer.bonds ?? {}).sort((left, right) => right[1] - left[1])[0];
    return `
      <article class="officer-card ${officer.allegiance !== "serving" ? "is-outsider" : ""}">
        <header>${officerSeal(officer)}<div><strong>${officer.name}</strong><small>${officer.rank} · ${WORLD.provinces[officer.location].name}</small></div><b>${allegianceLabel(officer.allegiance)}</b></header>
        <div class="officer-stat-grid">${statCells(officer.stats)}</div>
        <div class="officer-state-line"><span>忠誠 ${officer.loyalty}</span><span>意欲 ${officer.stamina}</span><span>功績 ${officer.merit}</span>${politics ? `<span class="political-standing is-${politics.standing === "対立" ? "danger" : politics.standing === "要注意" ? "warning" : "stable"}">${politics.standing}</span>` : ""}</div>
        <p><strong>${officer.policy}</strong> · ${officer.traits.join(" / ")}<br>${assignmentLabel(officer)}</p>
        ${politics ? `<div class="officer-politics"><strong>${politics.faction} · ${politics.agenda}</strong><span>出自：${politics.origin}</span><span>野心：${politics.ambition}</span><span class="officer-demand">要求：${politics.demand}</span><small>政治力 ${politics.politicalCapital} · 不満 ${politics.resentment}${strongestBond ? ` · 親密 ${WORLD.characters[strongestBond[0]]?.name ?? strongestBond[0]} ${strongestBond[1]}` : ""}</small><small>${politics.consequence}</small>${politics.activePromise ? `<p class="officer-promise"><strong>受諾済み</strong><span>${politics.activePromise.agenda}を支持する任務を残り${politics.responseCooldown}か月以内に完了</span></p>` : politics.canRespond ? `<div class="officer-demand-actions">${politics.responses.map((response) => `<button type="button" data-officer-demand-response="${response.id}" data-officer-id="${officerId}"><strong>${response.name}</strong><small>${response.impact}</small></button>`).join("")}</div>` : officer.allegiance === "serving" ? `<small class="officer-demand-cooldown">再回答まであと${politics.responseCooldown}か月</small>` : ""}${politics.latestReaction ? `<em>直近：${politics.latestReaction.title}</em>` : ""}</div>` : ""}
      </article>
    `;
  }).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading"><span>OFFICERS</span><h1>人物と官職</h1><p>能力・忠誠・意欲・功績・所在地を任務へ接続</p></header>
    <div class="panel-body">
      <section class="panel-section"><div class="section-heading"><h2>人物一覧</h2><small>${Object.keys(state.officers).length}名</small></div><div class="officer-list">${cards}</div></section>
      <section class="panel-section"><div class="section-heading"><h2>人材に関する支出</h2><small>目的別に分類</small></div><div class="spending-shortcut-list">${spendingShortcut("research_development", "測量士を研究職へ登用する")}${spendingShortcut("military_affairs", "軍務人材を勧誘する")}${spendingShortcut("foreign_aid", "外交顧問を登用する")}</div></section>
    </div>
  `;
}

function renderLeftPanel() {
  if (view.panel === "spending") renderSpendingPanel();
  else if (view.panel === "city") renderCityPanel();
  else if (view.panel === "town") renderTownPanel();
  else if (view.panel === "world") renderWorldPanel();
  else if (view.panel === "diplomacy") renderDiplomacyPanel();
  else if (view.panel === "military") renderMilitaryPanel();
  else if (view.panel === "people") renderPeoplePanel();
  else renderCouncilPanel();
}

function renderAlerts() {
  const alerts = [];
  if (state.council.pending && !state.campaign?.ending) alerts.push('<span class="alert-chip danger">季節評定 · 方針未決</span>');
  if (state.phase === "event" && state.pendingEvent) alerts.push(`<span class="alert-chip danger">都市事件 · ${EVENT_DEFINITIONS[state.pendingEvent.eventId].name}</span>`);
  if (state.war) alerts.push(`<span class="alert-chip danger">戦争中 · 戦勝点 ${state.war.score.toFixed(1)}</span>`);
  else if (!state.council.pending && state.issues.border.status === "active") alerts.push('<span class="alert-chip danger">国境問題 · 対応継続中</span>');
  if (state.pendingOrders.length) alerts.push(`<span class="alert-chip info">今月の計画 ${state.pendingOrders.length}件</span>`);
  if (state.commandQueue.length) alerts.push(`<span class="alert-chip info">${state.commandQueue.length}件の任務を実行中</span>`);
  elements.alertRack.innerHTML = alerts.join("");
}

function valueColor(value, inverse = false) {
  const normalized = Math.min(100, Math.max(0, inverse ? 100 - value : value));
  const hue = Math.round(4 + normalized * 1.05);
  return `hsl(${hue} 34% ${42 + normalized * 0.08}%)`;
}

function setMapMarkerText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function renderStrategicMapState() {
  const cityMarkerIds = { selene: "mapForceSelene", nereia: "mapForceNereia", orta: "mapForceOrta" };
  Object.entries(cityMarkerIds).forEach(([cityId, markerId]) => {
    const city = deriveCityMetrics(state, cityId);
    setMapMarkerText(markerId, `兵 ${formatValue(city.troops)} · 防 ${Math.round(city.defense)}`);
  });

  const enemy = state.foreignStates.valka;
  setMapMarkerText("mapForceValka", `兵 ${formatValue(enemy.army)} · 組 ${Math.round(enemy.organization)}`);

  const military = getMilitarySummary(state);
  const formation = FORMATIONS[state.forces.frontier_guard.formation];
  const planLabels = { interdict: "街道遮断", pass: "峠確保", siege: "城砦攻囲" };
  const ownOrder = state.war ? `${planLabels[state.war.plan] ?? "戦役中"} · 士気${Math.round(state.forces.frontier_guard.morale)}` : `${formation.name} · 待機`;
  const enemyOrder = state.war?.lastEnemyAction?.label ?? "峠を警戒";
  setMapMarkerText("frontierArmyStrength", `兵 ${formatValue(military.army)} · 補給${military.supply}`);
  setMapMarkerText("frontierArmyOrder", ownOrder);
  setMapMarkerText("enemyArmyStrength", `兵 ${formatValue(enemy.army)} · 結束${Math.round(enemy.cohesion)}`);
  setMapMarkerText("enemyArmyOrder", enemyOrder);

  const frontierArmy = document.getElementById("frontierArmyMarker");
  const enemyArmy = document.getElementById("enemyArmyMarker");
  const ownPositions = { interdict: "translate(620 390)", pass: "translate(642 356)", siege: "translate(675 365)" };
  frontierArmy?.setAttribute("transform", state.war ? ownPositions[state.war.plan] ?? ownPositions.pass : "translate(590 390)");
  enemyArmy?.setAttribute("transform", state.war ? "translate(700 255)" : "translate(700 225)");

  const passMarker = document.getElementById("passStatusMarker");
  const borderResolved = state.issues.border.status === "resolved" || state.agreements.transit;
  passMarker?.classList.toggle("is-war", Boolean(state.war));
  passMarker?.classList.toggle("is-secure", borderResolved && !state.war);
  setMapMarkerText("passStatusText", state.war ? `交戦中 ${state.war.score >= 0 ? "+" : ""}${Math.round(state.war.score)}` : borderResolved ? "通行確保" : "国境緊張");
}

function renderMap() {
  elements.strategyMap.className.baseVal = `strategy-map map-mode-${view.mapMode} scale-${view.scale}${state.war ? " is-at-war" : ""}`;
  elements.strategyMap.setAttribute("viewBox", MAP_VIEWBOXES[view.scale] ?? MAP_VIEWBOXES.world);
  const labels = {
    political: ["CASTLE & TERRITORY MAP", WORLD.continent.name], terrain: ["TERRAIN MAP", "地形・標高・水系"], diplomatic: ["DIPLOMATIC MAP", "大陸諸国の友好・敵対"],
    supply: ["SUPPLY MAP", "月次食料収支"], unrest: ["PUBLIC ORDER MAP", "都市治安"],
    ...AUTHORITY_MAP_LABELS,
  };
  elements.mapModeEyebrow.textContent = labels[view.mapMode][0];
  elements.mapCaptionTitle.textContent = view.mapMode === "political"
    ? view.scale === "world" ? "エルドリア世界圏 · 十か国" : "セレナ・ヴァルカ国境戦域"
    : labels[view.mapMode][1];
  elements.mapModeBar.querySelectorAll("[data-map-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.mapMode === view.mapMode));
  if (elements.authorityOverlaySelect) elements.authorityOverlaySelect.value = AUTHORITY_MAP_LABELS[view.mapMode] ? view.mapMode : "";
  elements.mapScaleSwitch.querySelectorAll("[data-scale]").forEach((button) => button.classList.toggle("is-active", button.dataset.scale === view.scale));
  elements.strategyMap.querySelectorAll(".province[data-place-id]").forEach((node) => { node.style.fill = ""; });
  const authorityNetwork = AUTHORITY_MAP_LABELS[view.mapMode] ? deriveAdministrationNetwork(state) : null;
  Object.keys(state.cities).forEach((cityId) => {
    const node = elements.strategyMap.querySelector(`.province[data-place-id="${cityId}"]`);
    if (!node) return;
    const city = deriveCityMetrics(state, cityId);
    if (view.mapMode === "supply") node.style.fill = valueColor(clampForMap(50 + city.supplyBalance / 120));
    if (view.mapMode === "unrest") node.style.fill = valueColor(city.publicOrder);
    if (authorityNetwork) {
      const region = authorityNetwork.authority.regions.find((item) => item.cityId === cityId);
      const overlay = authorityOverlayValue(region, view.mapMode);
      node.style.fill = valueColor(overlay.value, overlay.inverse);
    }
  });
  elements.strategyMap.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  if (view.selectedTileName) {
    elements.strategyMap.querySelectorAll(".map-tile").forEach((node) => node.classList.toggle("is-selected", node.dataset.tileName === view.selectedTileName));
  } else if (view.selectedId) {
    elements.strategyMap.querySelectorAll(`[data-place-id="${view.selectedId}"]`).forEach((node) => node.classList.add("is-selected"));
  }
  renderStrategicMapState();
}

function averageAuthorityDomain(region, domainIds) {
  const domains = region.domains.filter((domain) => domainIds.includes(domain.id));
  return domains.reduce((sum, domain) => sum + domain.effectiveControl, 0) / Math.max(1, domains.length);
}

function authorityOverlayValue(region, mode) {
  if (!region) return { value: 0, inverse: false, label: "情報なし" };
  const values = {
    effective_control: { value: region.overallControl, label: `総合実効支配 ${Math.round(region.overallControl)}%` },
    tax_control: { value: averageAuthorityDomain(region, ["tax_rights", "tax_collection", "customs"]), label: "徴税支配" },
    military_control: { value: averageAuthorityDomain(region, ["military_command", "conscription"]), label: "軍事支配" },
    justice_control: { value: averageAuthorityDomain(region, ["justice", "policing"]), label: "司法支配" },
    population_knowledge: { value: region.populationKnowledge, label: `人口把握 ${region.populationKnowledge}%` },
    information_accuracy: { value: region.informationPrecision, label: `情報精度 ${region.informationPrecision}%` },
    administrative_load: { value: region.administrativeLoadRatio, inverse: true, label: `行政負荷率 ${region.administrativeLoadRatio}%` },
    communication_time: { value: clampForMap(region.communicationDays * 6), inverse: true, label: `命令到達 ${region.communicationDays}日` },
    local_power: { value: 100 - region.practicalCentralization, inverse: true, label: `地方勢力 ${Math.round(100 - region.practicalCentralization)}%` },
    grievance: { value: region.grievancePressure, inverse: true, label: `歴史的不満 ${region.grievancePressure}` },
    loyalty: { value: region.loyalty, label: `中央への忠誠 ${region.loyalty}` },
    uniformity: { value: region.institutionalUniformity, label: `制度統一 ${region.institutionalUniformity}%` },
  };
  const selected = values[mode] ?? { value: 0, label: "情報なし" };
  if (!["effective_control", "population_knowledge", "information_accuracy", "administrative_load", "communication_time", "local_power", "grievance", "loyalty", "uniformity"].includes(mode)) {
    selected.label = `${AUTHORITY_MAP_LABELS[mode]?.[1] ?? "統治"} ${Math.round(selected.value)}%`;
  }
  return selected;
}

function clampForMap(value) {
  return Math.min(100, Math.max(0, value));
}

function selectedTileCountry() {
  if (view.selectedType === "province") return WORLD.countries[WORLD.provinces[view.selectedId]?.owner];
  return WORLD.countries[view.selectedId];
}

function renderTileDetail() {
  const open = view.tileWindowOpen && view.selectedTileName && view.selectedTerrainType;
  elements.tileDetailWindow.classList.toggle("is-hidden", !open);
  if (!open) return;

  const profile = TERRAIN_TILE_PROFILES[view.selectedTerrainType] ?? TERRAIN_TILE_PROFILES.plains;
  const country = selectedTileCountry();
  const jurisdiction = view.selectedType === "province" ? WORLD.provinces[view.selectedId]?.kind : country?.government;
  elements.tileDetailTitle.textContent = view.selectedTileName;
  elements.tileDetailMeta.textContent = `${country?.name ?? "所属不明"} · ${jurisdiction ?? "統治区分不明"} · ${view.selectedTerrain}`;
  elements.tileDetailNote.textContent = `${view.selectedTileName}は${view.selectedTerrain}の領域。${profile.summary}`;
  elements.tileDetailGrid.innerHTML = `
    <div><small>気候</small><strong>${profile.climate}</strong></div>
    <div><small>移動負荷</small><strong>${profile.movement}</strong></div>
    <div><small>防衛地形</small><strong>${profile.defense}</strong></div>
    <div><small>主要資源</small><strong>${profile.resources}</strong></div>
    <div class="tile-detail-risk"><small>地勢リスク</small><strong>${profile.risk}</strong></div>
  `;

  const stageRect = elements.mapStage.getBoundingClientRect();
  const windowWidth = Math.min(320, Math.max(250, stageRect.width - 24));
  const halfWidth = windowWidth / 2;
  const left = Math.min(stageRect.width - halfWidth - 12, Math.max(halfWidth + 12, view.tileAnchorX * stageRect.width));
  const top = Math.min(stageRect.height - 170, Math.max(150, view.tileAnchorY * stageRect.height));
  elements.tileDetailWindow.style.width = `${windowWidth}px`;
  elements.tileDetailWindow.style.left = `${left}px`;
  elements.tileDetailWindow.style.top = `${top}px`;
}

function clearTileDetailSelection() {
  view.tileWindowOpen = false;
  view.selectedType = null;
  view.selectedId = null;
  view.selectedTileName = null;
  view.selectedTerrain = null;
  view.selectedTerrainType = null;
}

function closeTileDetail() {
  clearTileDetailSelection();
  renderMap();
  renderSelection();
  renderTileDetail();
}

function renderSelection() {
  if (view.tileWindowOpen) {
    elements.selectionCard.innerHTML = "";
    return;
  }
  if (!view.selectedId) {
    elements.selectionCard.innerHTML = "";
    return;
  }
  if (view.selectedType === "province" && state.cities[view.selectedId]) {
    const city = deriveCityMetrics(state, view.selectedId);
    const region = AUTHORITY_MAP_LABELS[view.mapMode] ? getRegionAuthority(state, view.selectedId) : null;
    const overlayFact = region ? `<span>${authorityOverlayValue(region, view.mapMode).label}</span>` : "";
    const tileFact = view.selectedTileName ? `<span>${view.selectedTileName} · ${view.selectedTerrain}</span>` : "";
    elements.selectionCard.innerHTML = `<header><h3>${city.name}</h3><span>${getOfficerReport(state, city.governorId).name}</span></header><p>${city.note}</p><div class="selection-facts">${tileFact}${overlayFact}<span>人口 ${formatValue(city.population)}</span><span>月収支 ${signed(city.netIncome, 1)}</span><span>治安 ${formatValue(city.publicOrder, 1)}</span></div>`;
    return;
  }
  if (view.selectedType === "village") {
    const town = getTownAdministration(state, view.selectedId);
    elements.selectionCard.innerHTML = `<header><h3>${town.name}</h3><span>${town.kind} · ${WORLD.provinces[town.province].name}</span></header><p>${town.issue}</p><div class="selection-facts"><span>人口 ${formatValue(town.population)}</span><span>行政処理 ${Math.round(town.forecast.administrativeCapacity)}</span><span>優先課題 ${town.forecast.primaryNeed.label}</span></div>`;
    return;
  }
  const country = getCountryReport(state, view.selectedId);
  if (!country) { elements.selectionCard.innerHTML = ""; return; }
  const foundation = getGreatPowerFoundation(country.id);
  const note = view.selectedId === "valka"
    ? "灰冠峠の関税と隊商差押えを巡って対立。城砦・国境軍・補給路が一つの戦争構造を作る。"
    : foundation
      ? `${foundation.type}として成立指数 ${foundation.score}。${foundation.environment}`
      : `${country.stance}。関係・戦力・介入意志が大陸均衡とヴァルカ戦の拡大リスクへ反映される。`;
  const tileCount = elements.strategyMap.querySelector(`.country-group[data-country="${view.selectedId}"]`)?.dataset.tileCount ?? "?";
  const territoryFact = view.selectedTileName ? `${view.selectedTileName} · ${view.selectedTerrain}` : `領域タイル ${tileCount}`;
  elements.selectionCard.innerHTML = `<header><h3>${country.name}</h3><span>関係 ${country.relation >= 0 ? "+" : ""}${country.relation}</span></header><p>${note}</p><div class="selection-facts"><span>${territoryFact}</span><span>推定戦力 ${formatValue(country.power)}</span><span>機動 ${country.mobility}</span><span>${country.stance}</span></div>`;
}

function orderLabel(order) {
  if (order.kind === "command") return `${COMMANDS[order.commandId].name} · ${getOfficerReport(state, order.officerId).name}`;
  if (order.kind === "facility") return `${FACILITIES[order.facilityId].name} Lv.${order.targetLevel}建設`;
  if (order.kind === "policy") return `${POLICY_DEFINITIONS[order.policyId].name} → ${POLICY_DEFINITIONS[order.policyId].options[order.optionId].name}`;
  const action = { negotiate: "交渉", subsidize: "援助", suppress: "弾圧" }[order.action];
  return `${FACTION_DEFINITIONS[order.factionId].name}へ${action}`;
}

function orderCostLabel(order) {
  const costs = [];
  if (order.cost?.money) costs.push(`金 ${order.cost.money}`);
  if (order.cost?.draftPopulation) costs.push(`徴募 ${order.cost.draftPopulation}`);
  costs.push(`統治 ${order.governanceCost}`);
  return costs.join(" · ");
}

function planningImpactRows(planned, baseline) {
  if (!baseline) return "";
  return [["money", "金", 1], ["food", "食", 0]].map(([key, label, digits]) => {
    const before = baseline.changes[key] ?? 0;
    const after = planned.changes[key] ?? 0;
    const total = Number((after - before).toFixed(1));
    const direct = Number(((planned.breakdown?.orders?.[key] ?? 0) - (baseline.breakdown?.orders?.[key] ?? 0)).toFixed(1));
    const operation = Number(((planned.breakdown?.monthly?.[key] ?? 0) - (baseline.breakdown?.monthly?.[key] ?? 0)).toFixed(1));
    const external = Number(((planned.breakdown?.external?.[key] ?? 0) - (baseline.breakdown?.external?.[key] ?? 0)).toFixed(1));
    const reasons = [
      direct ? `命令費・即時効果 ${signed(direct, digits)}` : "",
      operation ? `生産・人物配置・政策連鎖 ${signed(operation, digits)}` : "",
      external ? `戦争・外部要因 ${signed(external, digits)}` : "",
    ].filter(Boolean).join(" / ") || "予約による差なし";
    return `<span class="plan-impact ${total < 0 ? "is-negative" : total > 0 ? "is-positive" : ""}"><b>${label} ${signed(before, digits)} → ${signed(after, digits)}</b><em>予約の総合差 ${signed(total, digits)}</em><small>${reasons}</small></span>`;
  }).join("");
}

function renderCityPlan(ledger) {
  const planCityId = view.panel === "spending" ? view.spendingCityId : view.panel === "town" ? WORLD.villages[view.selectedTownId].province : view.selectedCityId;
  const governance = getGovernance(state);
  const reservedMoney = state.pendingOrders.reduce((sum, order) => sum + (order.cost?.money ?? 0), 0);
  const warnings = getTurnWarnings(state);
  const preview = getPlanningPreview();
  const planned = state.pendingOrders.length ? state.pendingOrders.map((order) => `
    <article class="planned-order ${order.forced ? "is-forced" : ""}">
      <header><strong>${orderLabel(order)}</strong><button type="button" data-cancel-order="${order.id}" aria-label="命令を取り消す">取消</button></header>
      <small>${order.townId ? `${WORLD.villages[order.townId].name} · ` : ""}${WORLD.provinces[order.cityId].name} · ${orderCostLabel(order)}${order.forced ? ` · 強行（失敗率 ${(order.forcedPoints ?? 0) * FORCED_ORDER_RULES.failureChancePerPoint}%）` : ""}</small>
    </article>
  `).join("") : '<p class="plan-empty">支出はまだありません。「支出」から分類と具体策を選んでください。</p>';
  const forecastRows = preview?.report.cities.map((city) => `
    <div class="plan-forecast-row"><strong>${city.name.replace(/王都|河港|城塞市/, "")}</strong><span>金 ${signed(city.changes.money, 1)}</span><span>食 ${signed(city.changes.food)}</span><small>月末 金${formatValue(city.after.money, 1)} / 食${formatValue(city.after.food)}</small>${planningImpactRows(city, preview.baselineReport?.cities.find((item) => item.cityId === city.cityId))}</div>
  `).join("") ?? "";
  const active = state.commandQueue.filter((task) => task.cityId === planCityId).map((task) => {
    const progress = Math.max(0, (task.durationTurns - task.remainingTurns) / Math.max(1, task.durationTurns) * 100);
    return `<div class="outliner-item"><strong>${COMMANDS[task.commandId].name}</strong><small>${getOfficerReport(state, task.officerId).name} · 残り${task.remainingTurns}か月</small><div class="queue-track"><span style="width:${progress}%"></span></div></div>`;
  }).join("");
  const projects = state.cities[planCityId].projects.map((project) => `<div class="outliner-item"><strong>${FACILITIES[project.facilityId].name} Lv.${project.targetLevel}</strong><small>建設中 · 残り${project.remainingTurns}か月</small></div>`).join("");
  return `
    <section class="plan-tray">
      <header><span>MONTHLY PLAN</span><h2>今月の計画</h2><p>${formatDate(state)}に確定する予約命令</p></header>
      <div class="plan-budget"><div><small>統治力</small><strong>${governance.used} / ${governance.max}</strong><span>強行上限 ${governance.hardLimit}</span></div><div><small>予約費用</small><strong>金 ${formatValue(reservedMoney, 1)}</strong><span>${state.pendingOrders.length}件</span></div></div>
      <div class="planned-orders">${planned}</div>
      ${forecastRows ? `<section class="plan-forecast"><h3>${preview.baselineReport ? "予約なしとの因果比較" : "予約反映後の月末予測"}</h3>${forecastRows}<p>命令費・即時効果、生産・人物配置・政策連鎖、戦争・外部要因を分離。未選択の事件効果は含みません。</p></section>` : ""}
      ${(active || projects) ? `<section class="plan-progress"><h3>${WORLD.provinces[planCityId].name}で進行中</h3>${active}${projects}</section>` : ""}
      <section class="plan-warnings"><h3>進行前の確認</h3>${warnings.length ? warnings.map((warning) => `<p>⚠ ${warning}</p>`).join("") : '<p class="is-clear">警告はありません。</p>'}</section>
      <button type="button" class="plan-end-month" data-end-month ${state.phase === "event" || state.council.pending ? "disabled" : ""}>月を終える<span>生産・消費・事件を一括処理</span></button>
    </section>
  `;
}

function renderOutliner() {
  const ledger = deriveRealmLedger(state);
  if (view.panel === "city" || view.panel === "town" || view.panel === "spending") {
    elements.outlinerContent.innerHTML = renderCityPlan(ledger);
    return;
  }
  const campaign = getCampaignStatus(state);
  const mission = `<section class="outliner-section campaign-outliner"><h3>主目標 · ${campaign.completedCount}/${campaign.totalCount}</h3>${campaignObjectiveItems(campaign, true)}</section>`;
  const council = state.council.pending ? '<section class="outliner-section"><h3>評定</h3><div class="outliner-item danger"><strong>今季方針が未決</strong><small>月次進行は評定後に再開します。</small></div></section>' : "";
  const cities = ledger.cities.map((city) => `<div class="outliner-item"><strong>${city.name}</strong><small>金 ${formatValue(city.money, 1)} (${signed(city.netIncome, 1)}) · 食料 ${signed(city.foodBalance)} · 治安 ${formatValue(city.security)}</small></div>`).join("");
  const queue = state.commandQueue.length ? state.commandQueue.map((item) => {
    const command = COMMANDS[item.commandId];
    const officer = getOfficerReport(state, item.officerId);
    const progress = ((item.durationTurns - item.remainingTurns) / Math.max(1, item.durationTurns)) * 100;
    return `<div class="outliner-item"><strong>${command.name} · ${officer.name}</strong><small>${WORLD.provinces[item.cityId].name} · 残り ${item.remainingTurns}か月 · 予測 ${item.forecast.grade}</small><div class="queue-track"><span style="width:${progress}%"></span></div></div>`;
  }).join("") : '<div class="outliner-item"><small>実行中の任務はありません。</small></div>';
  const war = state.war ? `<section class="outliner-section"><h3>戦争</h3><div class="outliner-item danger"><strong>灰冠峠戦役</strong><small>戦勝点 ${state.war.score.toFixed(1)} · ${WAR_OBJECTIVES[state.war.objectiveId].name}</small></div></section>` : "";
  const occupations = (state.occupations ?? []).filter((occupation) => occupation.status === "occupied").map((occupation) => `<div class="outliner-item ${occupation.resistance >= 70 ? "danger" : ""}"><strong>${occupation.name}</strong><small>${OCCUPATION_POLICIES[occupation.policy].name} · 統制 ${occupation.control.toFixed(0)} · 抵抗 ${occupation.resistance.toFixed(0)}</small></div>`).join("");
  const occupationSection = occupations ? `<section class="outliner-section"><h3>占領統治</h3>${occupations}</section>` : "";
  const logs = state.log.slice(0, 4).map((entry) => `<div class="outliner-item"><strong>${entry.title}</strong><small>${entry.date} · ${entry.text}</small></div>`).join("");
  elements.outlinerContent.innerHTML = `${mission}${council}${war}${occupationSection}<section class="outliner-section"><h3>都市台帳</h3>${cities}</section><section class="outliner-section"><h3>任務</h3>${queue}</section><section class="outliner-section"><h3>年代記</h3>${logs}</section>`;
}

function renderTicker() {
  const latest = state.log[0];
  elements.chronicleTicker.innerHTML = `<strong>${latest.date} · ${latest.title}</strong><span>${latest.text}</span>`;
}

function renderWarCouncil() {
  elements.warCouncilModal.classList.toggle("is-hidden", !view.warCouncilOpen);
  if (!view.warCouncilOpen) return;
  const report = getWarCouncilReport(state, view.objectiveId);
  const objective = WAR_OBJECTIVES[view.objectiveId];
  const estimate = getWarDeclarationEstimate(state, view.objectiveId);
  const support = getWarSupport(state);
  elements.objectiveTabs.innerHTML = Object.values(WAR_OBJECTIVES).filter((item) => item.mode !== "defensive").map((item) => `<button class="objective-tab ${item.id === view.objectiveId ? "is-active" : ""}" type="button" data-objective="${item.id}" aria-pressed="${item.id === view.objectiveId}"><strong>${item.name}</strong><small>${item.scope === "limited" ? "限定目的" : "全面目的"} · 拡大リスク ${item.escalationRisk}</small></button>`).join("");
  const factors = report.factors.map((factor) => `<div class="factor-row"><strong>${factor.label}</strong><b class="${factor.value < 0 ? "is-negative" : ""}">${signed(factor.value)}</b><small>${factor.detail}</small></div>`).join("");
  const military = getMilitarySummary(state);
  const enemyCommander = getEnemyCommander(state);
  elements.warCouncilReport.innerHTML = `<div class="council-report"><aside class="ai-verdict"><div class="score-ring"><strong>${signed(report.score)}</strong><small>確度 ${report.confidence}%</small></div><h3>${report.posture}</h3><p>${report.summary}</p><p>軍団長 ${military.commander.name}<br>副将 ${military.deputy.name}<br>${FORMATIONS[military.force.formation].name}</p>${enemyCommanderCard(enemyCommander, null, true)}</aside><div><div class="factor-table">${factors}</div><div class="strategic-notes"><article class="strategic-note"><strong>重心候補 · ${report.center.label}</strong><small>${report.center.explanation}</small></article><article class="strategic-note"><strong>止める地点</strong><small>${report.limit}</small></article></div></div></div>`;
  const penalties = [];
  if (state.justification < 50) penalties.push("開戦事由不足により国境農民が徴発を拒否します");
  if (support < 40) penalties.push("都市治安から算出した国内支持が不足しています");
  const estimateMonths = estimate.estimatedMonths === null ? "見通し不成立" : `約${estimate.estimatedMonths}か月`;
  const totalValue = (value) => value === null ? "算出不能" : formatValue(value);
  elements.warCostEstimate.innerHTML = `
    <div class="war-estimate-heading"><strong>AI開戦概算</strong><small>現在の戦力・${estimate.planName}・${estimate.formationName}を同じ条件で継続した場合</small></div>
    <div class="war-estimate-grid">
      <span><small>講和可能まで</small><strong>${estimateMonths}</strong><em>戦勝点 ${estimate.peaceScoreThreshold} が目安</em></span>
      <span><small>追加兵糧</small><strong>${formatValue(estimate.foodPerMonth)} / 月</strong><em>累計 ${totalValue(estimate.totalFood)}</em></span>
      <span><small>自軍損失</small><strong>${formatValue(estimate.troopLossPerMonth)} / 月</strong><em>累計 ${totalValue(estimate.totalTroopLoss)}</em></span>
      <span><small>避難民</small><strong>${formatValue(estimate.displacedPerMonth)} / 月</strong><em>累計 ${totalValue(estimate.totalDisplaced)}</em></span>
    </div>
    <p class="war-estimate-reserve ${estimate.foodRisk ? "is-danger" : ""}">${estimate.projectedProvisions === null ? "戦果見通しが立たず、累計備蓄は算出できません。" : `同じ収支が続いた場合の終戦時食料：約${formatValue(Math.max(0, estimate.projectedProvisions))}${estimate.foodRisk ? "。すでに州単位の食料備蓄が危険域です。" : "。"}`}</p>
    <small class="war-estimate-note">概算は敵の対応、事件、命令、陣形変更で変動します。確約ではありません。</small>`;
  elements.declarationWarning.textContent = penalties.length ? `警告：${penalties.join("。")}` : `${objective.description} 現在の正当性と都市支持なら宣戦できます。`;
  elements.declareWarButton.textContent = `「${objective.name}」で宣戦布告`;
}

function officerCandidateCard(officer, commandId, cityId) {
  const forecast = getTaskForecast(state, commandId, officer.id, cityId);
  const command = COMMANDS[commandId];
  const relevant = command.taskType === "drill" || command.taskType === "mobilize"
    ? `統率 ${officer.stats.leadership} · 武力 ${officer.stats.war}`
    : command.taskType === "diplomacy" || command.taskType === "recruitment"
      ? `政治 ${officer.stats.politics} · 魅力 ${officer.stats.charisma}`
      : `知力 ${officer.stats.intelligence} · 政治 ${officer.stats.politics}`;
  return `<button type="button" class="candidate-card" data-assign-officer="${officer.id}">${officerSeal(officer, "large")}<div><header><strong>${officer.name}</strong><b>${forecast.grade}</b></header><small>${officer.rank} · ${WORLD.provinces[officer.location].name}</small><p>${relevant}<br>忠誠 ${officer.loyalty} · 意欲 ${officer.stamina} · ${officer.policy}</p></div><em>${forecast.range[0]}〜${forecast.range[1]}</em></button>`;
}

function forceCandidateCard(officer) {
  return `<button type="button" class="candidate-card" data-force-officer="${officer.id}">${officerSeal(officer, "large")}<div><header><strong>${officer.name}</strong><b>${officer.policy}</b></header><small>${officer.rank} · 忠誠 ${officer.loyalty}</small><p>統率 ${officer.stats.leadership} · 武力 ${officer.stats.war} · 知力 ${officer.stats.intelligence}</p></div><em>任命</em></button>`;
}

function renderAssignmentModal() {
  elements.assignmentModal.classList.toggle("is-hidden", !view.assignmentOpen);
  if (!view.assignmentOpen) return;
  const ledger = deriveRealmLedger(state);
  if (view.assignmentMode === "force") {
    elements.assignmentTitle.textContent = view.pendingForceRole === "commanderId" ? "軍団長を任命" : "副将を任命";
    elements.assignmentSummary.textContent = "統率・武力は正面戦力、知力は情報判断と部隊連携へ影響します。";
    elements.assignmentLedger.innerHTML = `<span>軍団 ${state.forces.frontier_guard.name}</span><span>陣形 ${FORMATIONS[state.forces.frontier_guard.formation].name}</span>`;
    const force = state.forces.frontier_guard;
    const occupiedIds = new Set([force.commanderId, force.deputyId]);
    const candidates = Object.keys(state.officers)
      .map((id) => getOfficerReport(state, id))
      .filter((officer) => officer.allegiance === "serving" && !occupiedIds.has(officer.id));
    elements.officerCandidates.innerHTML = candidates.map(forceCandidateCard).join("");
    return;
  }
  const command = COMMANDS[view.pendingCommandId];
  const cityId = command.defaultCityId ?? view.pendingCityId;
  const city = deriveCityMetrics(state, cityId);
  const town = view.pendingTownId ? getTownAdministration(state, view.pendingTownId) : null;
  const governance = getGovernance(state);
  elements.assignmentTitle.textContent = `${command.name}の担当武将`;
  elements.assignmentSummary.textContent = `${town ? `${town.name} · ` : ""}${WORLD.provinces[cityId].name} · ${command.description}`;
  elements.assignmentLedger.innerHTML = `<span>都市金 ${formatValue(city.money, 1)}</span><span>統治力 ${governance.used}/${governance.max}</span><span>期間 ${command.durationTurns}か月</span><span>費用 ${costLabel(command)}</span>`;
  const candidates = getEligibleOfficers(state, command.id, cityId, view.pendingTownId);
  elements.officerCandidates.innerHTML = candidates.length ? candidates.map((officer) => officerCandidateCard(officer, command.id, cityId)).join("") : '<p class="empty-candidates">任命できる待機武将がいません。</p>';
}

function renderEventModal() {
  const open = state.phase === "event" && state.pendingEvent;
  elements.eventModal.classList.toggle("is-hidden", !open);
  if (!open) return;
  const definition = EVENT_DEFINITIONS[state.pendingEvent.eventId];
  elements.eventTitle.textContent = definition.name;
  elements.eventSummary.textContent = definition.summary;
  elements.eventArt.src = EVENT_ART[definition.id] ?? EVENT_ART.corruption;
  elements.eventArt.alt = `${definition.name}が発生した都市の情景`;
  elements.eventLocation.textContent = `${WORLD.provinces[state.pendingEvent.cityId].name} · 次月へ進むには対応が必要です`;
  elements.eventChoices.innerHTML = definition.choices.map((choice) => `
    <button type="button" class="event-choice" data-event-choice="${choice.id}">
      <strong>${choice.name}</strong><span>${choice.detail}</span><small>この選択で月次報告を確定</small>
    </button>
  `).join("");
}

function render() {
  renderAnalysisMode();
  renderCampaignBar();
  renderResources();
  renderTimeControls();
  renderTabs();
  renderLeftPanel();
  renderAlerts();
  renderMap();
  renderSelection();
  renderTileDetail();
  renderCityWorkspace();
  renderOutliner();
  renderTicker();
  renderWarCouncil();
  renderAssignmentModal();
  renderEventModal();
  renderGuideModal();
  renderEndingModal();
  renderResetModal();
}

function renderPanelFromTop() {
  render();
  elements.leftPanel.scrollTop = 0;
}

function openCommandAssignment(commandId, cityId, townId = null) {
  view.assignmentOpen = true;
  view.assignmentMode = "command";
  view.pendingCommandId = commandId;
  view.pendingCityId = cityId;
  view.pendingTownId = townId;
  renderAssignmentModal();
}

function queuePlannedOrder(specification, message) {
  try {
    const next = queueOrder(state, specification);
    commit(next, message);
    return true;
  } catch (error) {
    if (error.code === "FORCE_REQUIRED") {
      const accepted = window.confirm(`通常の統治力を${error.forcedPoints}点超えます。強行命令として予約しますか？\n\n当該命令の失敗率 ${error.failureChance}%\n全都市：腐敗 +${error.corruptionPenalty.toFixed(1)} / 民心 -${error.supportPenalty.toFixed(1)}\n翌月統治力 -${error.governancePenalty}\n\n失敗しても費用と統治力は消費します。`);
      if (!accepted) return false;
      try {
        const next = queueOrder(state, { ...specification, force: true });
        commit(next, `${message}（強行命令）`);
        return true;
      } catch (forcedError) {
        showToast(forcedError.message, "danger");
        return false;
      }
    }
    showToast(error.message, "danger");
    return false;
  }
}

function closeAssignment() {
  view.assignmentOpen = false;
  view.assignmentMode = null;
  view.pendingCommandId = null;
  view.pendingCityId = null;
  view.pendingTownId = null;
  view.pendingForceRole = null;
  renderAssignmentModal();
}

function followGuidance(button) {
  view.guideOpen = false;
  const action = button.dataset.guideAction;
  if (action === "open_council") {
    view.panel = "council";
    view.scale = "country";
    renderPanelFromTop();
    return;
  }
  if (action === "open_command") {
    openCommandAssignment(button.dataset.commandId, button.dataset.cityId, button.dataset.townId ?? null);
    renderGuideModal();
    return;
  }
  if (action === "open_town") {
    view.selectedTownId = button.dataset.townId ?? WORLD.provinces[button.dataset.cityId ?? WORLD.nation.capital].villages[0];
    view.selectedCityId = WORLD.villages[view.selectedTownId].province;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.townTab = "commands";
    view.scale = "village";
    renderPanelFromTop();
    return;
  }
  if (action === "open_city") {
    view.panel = "city";
    view.selectedCityId = button.dataset.cityId ?? WORLD.nation.capital;
    view.selectedType = "province";
    view.selectedId = view.selectedCityId;
    view.scale = "city";
    renderPanelFromTop();
    return;
  }
  if (action === "open_spending") {
    view.panel = "spending";
    view.spendingCategoryId = "social_security";
    view.spendingCityId = WORLD.nation.capital;
    view.scale = "country";
    renderPanelFromTop();
    return;
  }
  if (action === "open_military") {
    view.panel = "military";
    view.scale = "country";
    view.selectedType = "country";
    view.selectedId = "valka";
    view.selectedCountryId = "valka";
    renderPanelFromTop();
    return;
  }
  if (action === "open_diplomacy" || action === "open_aftermath") {
    view.panel = "diplomacy";
    view.scale = "country";
    view.selectedType = "country";
    view.selectedId = "valka";
    view.selectedCountryId = "valka";
    renderPanelFromTop();
    return;
  }
  if (action === "open_war_council") {
    view.panel = "diplomacy";
    view.scale = "country";
    view.selectedType = "country";
    view.selectedId = "valka";
    view.selectedCountryId = "valka";
    view.warCouncilOpen = true;
    renderPanelFromTop();
    return;
  }
  if (action === "end_month") {
    renderGuideModal();
    endMonth();
    return;
  }
  if (action === "resolve_event") {
    renderGuideModal();
    renderEventModal();
    return;
  }
  if (action === "open_reports") {
    if (state.campaign?.ending && state.lastViewedEndingId !== state.campaign.ending.id) {
      view.endingOpen = true;
      renderEndingModal();
      return;
    }
    view.panel = "city";
    view.selectedCityId = WORLD.nation.capital;
    view.selectedType = "province";
    view.selectedId = view.selectedCityId;
    view.cityTab = "reports";
    view.scale = "city";
    const latestReport = state.monthlyReports[0];
    if (latestReport && state.lastViewedReportId !== latestReport.id) {
      commit(acknowledgeMonthReport(state, latestReport.id), "月次報告を確認しました。次月の方針を決められます。", "ui");
      elements.leftPanel.scrollTop = 0;
    } else {
      renderPanelFromTop();
    }
  }
}

function playNavigationCue(event) {
  const target = event.target.closest("button, [role='button']");
  if (!target || target.disabled || target.closest("#audioToggle")) return;
  if (target.matches(".modal-close, [data-close-guide], [data-close-tile]")) {
    audio.play("cancel");
    return;
  }
  if (target.matches([
    "[data-open-guide]",
    "[data-guide-action]",
    "[data-panel]",
    "[data-spending-category]",
    "[data-spending-city]",
    "[data-world-mode]",
    "[data-world-guide-toggle]",
    "[data-world-filter]",
    "[data-statistics-nation]",
    "[data-world-nation]",
    "[data-world-people]",
    "[data-select-city]",
    "[data-select-town]",
    "[data-open-town-command]",
    "[data-city-tab]",
    "[data-town-tab]",
    "[data-select-facility]",
    "[data-command]",
    "[data-force-role]",
    "[data-map-mode]",
    "[data-scale]",
    "[data-diplomacy-country]",
    "[data-border-settlement]",
    "[data-aftermath-policy]",
    "[data-aftermath-choice]",
    "[data-officer-demand-response]",
    "[data-place-id]",
    "[data-open-war]",
    "[data-objective]",
  ].join(", "))) audio.play("ui");
}

audio.subscribe(renderAudioControl);
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("#audioToggle")) void audio.unlock();
}, { capture: true });

document.addEventListener("click", (event) => {
  playNavigationCue(event);
  const resourceAction = event.target.closest("[data-resource-action]");
  if (resourceAction) {
    const ledger = deriveRealmLedger(state);
    view.panel = ledger.governance.available > 0 && ledger.availableOfficers > 0 ? "spending" : "people";
    if (view.panel === "spending") view.spendingCategoryId = "social_security";
    renderPanelFromTop();
    return;
  }
  const foodEmergency = event.target.closest("[data-food-emergency-town]");
  if (foodEmergency) {
    view.selectedTownId = foodEmergency.dataset.foodEmergencyTown;
    view.selectedCityId = foodEmergency.dataset.foodEmergencyCity;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.townTab = "commands";
    view.scale = "village";
    view.focusedTownCommandId = "city.cultivate";
    renderPanelFromTop();
    return;
  }
  const worldFilter = event.target.closest("[data-world-filter]");
  if (worldFilter) {
    view.worldNationFilter = worldFilter.dataset.worldFilter;
    view.worldGuideOpen = false;
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-world-guide-toggle]")) {
    view.worldGuideOpen = !view.worldGuideOpen;
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-ending-continue]")) {
    acknowledgeEnding();
    render();
    showToast("キャンペーン完結後の継続統治へ移りました。");
    return;
  }
  if (event.target.closest("[data-ending-reports]")) {
    acknowledgeEnding();
    view.panel = "city";
    view.selectedCityId = WORLD.nation.capital;
    view.cityTab = "reports";
    view.scale = "city";
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-cancel-reset]")) {
    view.resetOpen = false;
    renderResetModal();
    return;
  }
  if (event.target.closest("[data-confirm-reset]")) {
    resetChronicle();
    return;
  }
  if (event.target.closest("[data-close-tile]")) {
    closeTileDetail();
    return;
  }
  if (event.target.closest("[data-open-guide]")) {
    view.guideOpen = true;
    renderGuideModal();
    return;
  }
  if (event.target.closest("[data-close-guide]")) {
    view.guideOpen = false;
    renderGuideModal();
    return;
  }
  const guideAction = event.target.closest("[data-guide-action]");
  if (guideAction) {
    followGuidance(guideAction);
    return;
  }
  const panelButton = event.target.closest("[data-panel]");
  if (panelButton) {
    clearTileDetailSelection();
    view.panel = panelButton.dataset.panel;
    if (view.panel === "town") {
      const localTowns = WORLD.provinces[view.selectedCityId]?.villages ?? [];
      if (!WORLD.villages[view.selectedTownId] || (localTowns.length && !localTowns.includes(view.selectedTownId))) view.selectedTownId = localTowns[0] ?? Object.keys(WORLD.villages)[0];
      view.selectedType = "village";
      view.selectedId = view.selectedTownId;
      view.selectedCityId = WORLD.villages[view.selectedTownId].province;
      view.scale = "village";
    }
    renderPanelFromTop();
    return;
  }
  const spendingCategoryButton = event.target.closest("[data-spending-category]");
  if (spendingCategoryButton) {
    if (view.panel === "city") view.spendingCityId = view.selectedCityId;
    else if (view.panel === "military") view.spendingCityId = "orta";
    view.spendingCategoryId = spendingCategoryButton.dataset.spendingCategory;
    view.panel = "spending";
    renderPanelFromTop();
    return;
  }
  const spendingCityButton = event.target.closest("[data-spending-city]");
  if (spendingCityButton) {
    view.spendingCityId = spendingCityButton.dataset.spendingCity;
    renderPanelFromTop();
    return;
  }
  const worldModeButton = event.target.closest("[data-world-mode]");
  if (worldModeButton) {
    view.atlasMode = worldModeButton.dataset.worldMode;
    renderPanelFromTop();
    return;
  }
  const statisticsNationButton = event.target.closest("[data-statistics-nation]");
  if (statisticsNationButton) {
    view.selectedNationId = statisticsNationButton.dataset.statisticsNation;
    view.atlasMode = "statistics";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const worldNationButton = event.target.closest("[data-world-nation]");
  if (worldNationButton) {
    view.selectedNationId = worldNationButton.dataset.worldNation;
    if (WORLD.countries[view.selectedNationId]) {
      view.selectedType = "country";
      view.selectedId = view.selectedNationId;
      view.scale = "world";
    }
    view.atlasMode = "nations";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const worldPeopleButton = event.target.closest("[data-world-people]");
  if (worldPeopleButton) {
    view.selectedPeopleId = worldPeopleButton.dataset.worldPeople;
    view.atlasMode = "peoples";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const cityButton = event.target.closest("[data-select-city]");
  if (cityButton) {
    view.selectedCityId = cityButton.dataset.selectCity;
    view.selectedType = "province";
    view.selectedId = view.selectedCityId;
    view.panel = "city";
    view.scale = "city";
    renderPanelFromTop();
    return;
  }
  const townButton = event.target.closest("[data-select-town]");
  if (townButton) {
    view.selectedTownId = townButton.dataset.selectTown;
    view.selectedCityId = WORLD.villages[view.selectedTownId].province;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.scale = "village";
    renderPanelFromTop();
    return;
  }
  const cityTabButton = event.target.closest("[data-city-tab]");
  if (cityTabButton) {
    view.cityTab = cityTabButton.dataset.cityTab;
    render();
    return;
  }
  const townTabButton = event.target.closest("[data-town-tab]");
  if (townTabButton) {
    view.townTab = townTabButton.dataset.townTab;
    render();
    return;
  }
  const authorityDomainButton = event.target.closest("[data-authority-domain]");
  if (authorityDomainButton) {
    view.selectedAuthorityDomain = authorityDomainButton.dataset.authorityDomain;
    render();
    return;
  }
  const reformButton = event.target.closest("[data-start-authority-reform], [data-force-authority-reform]");
  if (reformButton) {
    const forced = reformButton.hasAttribute("data-force-authority-reform");
    if (forced && !window.confirm("準備工程を飛ばして権限を移管します。法令と実務の乖離、行政過負荷、長期的な歴史的不満が発生します。続けますか？")) return;
    try {
      const next = startAuthorityReform(
        state,
        reformButton.dataset.cityId,
        reformButton.dataset.domainId,
        reformButton.dataset.methodId,
        { forced },
      );
      commit(next, forced ? "準備不足のまま権限移管を強行しました。" : "権限改革を可視化工程から開始しました。", forced ? "event" : "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const administrationModeButton = event.target.closest("[data-administration-mode]");
  if (administrationModeButton) {
    try {
      const next = setAdministrationMode(state, administrationModeButton.dataset.cityId, administrationModeButton.dataset.administrationMode);
      commit(next, `${WORLD.provinces[administrationModeButton.dataset.cityId].name}の統治方式を変更しました。`);
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const administrationMandateButton = event.target.closest("[data-administration-mandate]");
  if (administrationMandateButton) {
    try {
      const next = setAdministrationMandate(state, administrationMandateButton.dataset.cityId, administrationMandateButton.dataset.administrationMandate);
      commit(next, `${WORLD.provinces[administrationMandateButton.dataset.cityId].name}の委任方針を変更しました。`);
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const facilitySiteButton = event.target.closest("[data-select-facility]");
  if (facilitySiteButton) {
    view.selectedFacilityId = facilitySiteButton.dataset.selectFacility;
    render();
    return;
  }
  const doctrineButton = event.target.closest("[data-doctrine]");
  if (doctrineButton) {
    try { commit(adoptDoctrine(state, doctrineButton.dataset.doctrine), `今季方針を「${DOCTRINES[doctrineButton.dataset.doctrine].name}」に定めました。`); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const townCommandLink = event.target.closest("[data-open-town-command]");
  if (townCommandLink) {
    view.selectedTownId = townCommandLink.dataset.openTownCommand;
    view.selectedCityId = WORLD.villages[view.selectedTownId].province;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.townTab = "commands";
    view.scale = "village";
    renderPanelFromTop();
    return;
  }
  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    openCommandAssignment(commandButton.dataset.command, commandButton.dataset.cityId, commandButton.dataset.townId ?? null);
    return;
  }
  const assignButton = event.target.closest("[data-assign-officer]");
  if (assignButton) {
    const command = COMMANDS[view.pendingCommandId];
    const cityId = command.defaultCityId ?? view.pendingCityId;
    const townId = isTownCommand(command) ? view.pendingTownId : null;
    const queued = queuePlannedOrder(
      { kind: "command", commandId: command.id, officerId: assignButton.dataset.assignOfficer, cityId, townId },
      `${WORLD.characters[assignButton.dataset.assignOfficer].name}を${townId ? `${WORLD.villages[townId].name}の` : ""}「${command.name}」へ仮配置しました。`,
    );
    if (queued) closeAssignment();
    return;
  }
  const facilityButton = event.target.closest("[data-queue-facility]");
  if (facilityButton) {
    const facility = FACILITIES[facilityButton.dataset.queueFacility];
    queuePlannedOrder(
      { kind: "facility", facilityId: facility.id, cityId: facilityButton.dataset.cityId },
      `${WORLD.provinces[facilityButton.dataset.cityId].name}の${facility.name}強化を計画へ追加しました。`,
    );
    return;
  }
  const policyButton = event.target.closest("[data-queue-policy]");
  if (policyButton) {
    const policy = POLICY_DEFINITIONS[policyButton.dataset.queuePolicy];
    const option = policy.options[policyButton.dataset.option];
    queuePlannedOrder(
      { kind: "policy", policyId: policy.id, optionId: policyButton.dataset.option, cityId: policyButton.dataset.cityId },
      `${policy.name}を「${option.name}」へ変更する計画を追加しました。`,
    );
    return;
  }
  const factionButton = event.target.closest("[data-queue-faction]");
  if (factionButton) {
    const faction = FACTION_DEFINITIONS[factionButton.dataset.queueFaction];
    const actionName = { negotiate: "交渉", subsidize: "援助", suppress: "弾圧" }[factionButton.dataset.action];
    queuePlannedOrder(
      { kind: "faction", factionId: faction.id, action: factionButton.dataset.action, cityId: factionButton.dataset.cityId },
      `${faction.name}への${actionName}を計画へ追加しました。`,
    );
    return;
  }
  const cancelButton = event.target.closest("[data-cancel-order]");
  if (cancelButton) {
    try { commit(cancelOrder(state, cancelButton.dataset.cancelOrder), "予約命令を取り消しました。", "cancel"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-end-month]")) {
    endMonth();
    return;
  }
  const eventChoiceButton = event.target.closest("[data-event-choice]");
  if (eventChoiceButton) {
    try {
      const next = resolveEventChoice(state, eventChoiceButton.dataset.eventChoice);
      commit(next, "事件への対応を月次報告へ記録しました。");
      if (next.council.pending) { view.panel = "council"; renderPanelFromTop(); }
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const forceRoleButton = event.target.closest("[data-force-role]");
  if (forceRoleButton) {
    view.assignmentOpen = true;
    view.assignmentMode = "force";
    view.pendingForceRole = forceRoleButton.dataset.forceRole;
    renderAssignmentModal();
    return;
  }
  const forceOfficerButton = event.target.closest("[data-force-officer]");
  if (forceOfficerButton) {
    try {
      const role = view.pendingForceRole;
      const next = appointForceOfficer(state, role, forceOfficerButton.dataset.forceOfficer);
      closeAssignment();
      commit(next, "東部国境軍の人事を更新しました。");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const formationButton = event.target.closest("[data-formation]");
  if (formationButton) {
    try { commit(setFormation(state, formationButton.dataset.formation), `陣形を「${FORMATIONS[formationButton.dataset.formation].name}」へ変更しました。`); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const modeButton = event.target.closest("[data-map-mode]");
  if (modeButton) { view.mapMode = modeButton.dataset.mapMode; render(); return; }
  const scaleButton = event.target.closest("[data-scale]");
  if (scaleButton) { view.scale = scaleButton.dataset.scale; render(); return; }
  const diplomacyCountryButton = event.target.closest("[data-diplomacy-country]");
  if (diplomacyCountryButton) { view.selectedCountryId = diplomacyCountryButton.dataset.diplomacyCountry; renderPanelFromTop(); return; }
  const borderSettlementButton = event.target.closest("[data-border-settlement]");
  if (borderSettlementButton) {
    const status = getBorderNegotiationStatus(state);
    const offer = status.offers.find((item) => item.id === borderSettlementButton.dataset.borderSettlement);
    if (!offer || !window.confirm(`「${offer.name}」で灰冠峠の通行権を確保します。\n\n${offer.description}\n\nこの決着は第三幕と年代記へ残ります。続けますか？`)) return;
    try { commit(resolveBorderNegotiation(state, offer.id), `${offer.name}が成立しました。第三幕の定着方針を選んでください。`, "peace"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const aftermathPolicyButton = event.target.closest("[data-aftermath-policy]");
  if (aftermathPolicyButton) {
    const policy = AFTERMATH_POLICIES[aftermathPolicyButton.dataset.aftermathPolicy];
    if (!policy || !window.confirm(`第三幕の方針を「${policy.name}」に定めます。\n\n${policy.description}\n\n決定後は変更できません。続けますか？`)) return;
    try { commit(chooseAftermathPolicy(state, policy.id), `第三幕を「${policy.name}」で進めます。`, "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const aftermathChoiceButton = event.target.closest("[data-aftermath-choice]");
  if (aftermathChoiceButton) {
    const decision = getAftermathDecisionStatus(state);
    const choice = decision?.choices.find((item) => item.id === aftermathChoiceButton.dataset.aftermathChoice);
    if (!choice || !window.confirm(`「${decision.title}」を「${choice.name}」で裁定します。\n\n${choice.description}\n${choice.impact}\n\n結果は年代記と実際の国力へ残ります。続けますか？`)) return;
    try { commit(resolveAftermathDecisionChoice(state, choice.id), `${decision.title}を「${choice.name}」で裁定しました。`, "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const officerDemandButton = event.target.closest("[data-officer-demand-response]");
  if (officerDemandButton) {
    const officerId = officerDemandButton.dataset.officerId;
    const politics = getOfficerPoliticalReport(state, officerId);
    const response = politics?.responses.find((item) => item.id === officerDemandButton.dataset.officerDemandResponse);
    const officerName = WORLD.characters[officerId]?.name ?? officerId;
    if (!response || !window.confirm(`${officerName}の要求へ「${response.name}」と回答します。\n\n${response.impact}\n\n人物関係と将来の任務へ残ります。続けますか？`)) return;
    try { commit(answerOfficerDemand(state, officerId, response.id), `${officerName}の要求へ「${response.name}」と回答しました。`, response.id === "refuse" ? "danger" : "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const place = event.target.closest("[data-place-id]");
  if (place) {
    const isTile = place.classList.contains("map-tile");
    view.selectedType = place.dataset.placeType;
    view.selectedId = place.dataset.placeId;
    view.selectedTileName = place.dataset.tileName ?? null;
    view.selectedTerrain = place.dataset.terrainLabel ?? null;
    view.selectedTerrainType = place.dataset.terrain ?? null;
    if (isTile) {
      const mapRect = elements.strategyMap.getBoundingClientRect();
      const tileRect = place.getBoundingClientRect();
      view.tileAnchorX = ((tileRect.left + tileRect.width / 2) - mapRect.left) / mapRect.width;
      view.tileAnchorY = ((tileRect.top + tileRect.height / 2) - mapRect.top) / mapRect.height;
      view.tileWindowOpen = true;
      renderMap();
      renderSelection();
      renderTileDetail();
      return;
    }
    view.tileWindowOpen = false;
    if (view.selectedType === "province" && state.cities[view.selectedId]) { view.selectedCityId = view.selectedId; view.panel = "city"; view.scale = "city"; }
    if (view.selectedType === "country" && view.selectedId !== WORLD.nation.id) { view.selectedCountryId = view.selectedId; view.panel = "diplomacy"; }
    if (view.selectedType === "village") { view.selectedTownId = view.selectedId; view.selectedCityId = WORLD.villages[view.selectedId].province; view.panel = "town"; view.scale = "village"; }
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-open-war]")) {
    if (state.war) return;
    view.warCouncilOpen = true;
    render();
    return;
  }
  const objectiveButton = event.target.closest("[data-objective]");
  if (objectiveButton) { view.objectiveId = objectiveButton.dataset.objective; renderWarCouncil(); return; }
  const planButton = event.target.closest("[data-war-plan]");
  if (planButton) {
    try { commit(setWarPlan(state, planButton.dataset.warPlan), "作戦方針を更新しました。"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const peaceButton = event.target.closest("[data-peace-settlement]");
  if (peaceButton) {
    const objective = WAR_OBJECTIVES[state.war.objectiveId];
    const settlement = getPeaceOptions(state).find((option) => option.id === peaceButton.dataset.peaceSettlement);
    if (!window.confirm(`「${settlement.name}」を提示します。\n\n政治目的：${objective.name}\n戦勝点 ${state.war.score.toFixed(1)} / 戦争期間 ${state.war.months}か月\n${settlement.description}\n\n講和が成立すると戦争は終了します。続けますか？`)) return;
    try { commit(negotiatePeace(state, settlement.id), "講和結果を年代記に記しました。", "peace"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const occupationPolicy = event.target.closest("[data-occupation-policy]");
  if (occupationPolicy) {
    try { commit(setOccupationPolicy(state, occupationPolicy.dataset.occupationId, occupationPolicy.dataset.occupationPolicy), "占領統治方針を更新しました。"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const garrisonButton = event.target.closest("[data-occupation-garrison]");
  if (garrisonButton) {
    try { commit(setOccupationGarrison(state, garrisonButton.dataset.occupationGarrison, Number(garrisonButton.dataset.garrisonValue)), "駐屯兵力を更新しました。"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const releaseButton = event.target.closest("[data-release-occupation]");
  if (releaseButton) {
    const occupation = state.occupations.find((item) => item.id === releaseButton.dataset.releaseOccupation);
    if (!window.confirm(`${occupation.name}の軍事占領を終了し、自治政府へ権限を移します。撤兵後は占領政策を実施できません。続けますか？`)) return;
    try { commit(releaseOccupation(state, occupation.id), "占領地域から撤兵しました。", "peace"); }
    catch (error) { showToast(error.message, "danger"); }
  }
});

elements.endMonthButton.addEventListener("click", endMonth);
elements.authorityOverlaySelect?.addEventListener("change", (event) => {
  if (!event.target.value) return;
  view.mapMode = event.target.value;
  render();
});
elements.analysisToggle?.addEventListener("click", () => {
  view.expertMode = !view.expertMode;
  render();
});
elements.audioToggle.addEventListener("click", async () => {
  const enabled = await audio.toggle();
  if (enabled) audio.play("confirm");
});
document.querySelector("#realmHome").addEventListener("click", () => { clearTileDetailSelection(); view.panel = "council"; view.scale = "country"; renderPanelFromTop(); });
document.querySelector("#saveButton").addEventListener("click", () => persist(true));
document.querySelector("#resetButton").addEventListener("click", (event) => {
  view.resetOpen = true;
  renderResetModal();
});
document.querySelector("#closeWarCouncil").addEventListener("click", () => { view.warCouncilOpen = false; renderWarCouncil(); });
elements.warCouncilModal.addEventListener("click", (event) => { if (event.target === elements.warCouncilModal) { view.warCouncilOpen = false; renderWarCouncil(); } });
elements.guideModal.addEventListener("click", (event) => {
  if (event.target === elements.guideModal) {
    view.guideOpen = false;
    renderGuideModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && view.tileWindowOpen) {
    closeTileDetail();
    return;
  }
  if (event.key === "Escape" && view.guideOpen) {
    view.guideOpen = false;
    renderGuideModal();
    return;
  }
  if (event.key === "Escape" && view.resetOpen) {
    view.resetOpen = false;
    renderResetModal();
  }
});
document.querySelector("#closeAssignment").addEventListener("click", closeAssignment);
elements.assignmentModal.addEventListener("click", (event) => { if (event.target === elements.assignmentModal) closeAssignment(); });
elements.guideModal.addEventListener("click", (event) => { if (event.target === elements.guideModal) { view.guideOpen = false; renderGuideModal(); } });
elements.declareWarButton.addEventListener("click", () => {
  try {
    const estimate = getWarDeclarationEstimate(state, view.objectiveId);
    const objective = WAR_OBJECTIVES[view.objectiveId];
    const duration = estimate.estimatedMonths === null ? "講和時期は見通せません" : `講和可能まで約${estimate.estimatedMonths}か月`;
    const totalFood = estimate.totalFood === null ? "算出不能" : formatValue(estimate.totalFood);
    if (!window.confirm(`${objective.name}で宣戦します。\n${duration}、追加兵糧は累計約${totalFood}のAI概算です。\n宣戦後、月末ごとに損耗と住民被害が発生します。続行しますか？`)) return;
    const next = declareWar(state, view.objectiveId);
    view.warCouncilOpen = false;
    view.panel = "military";
    commit(next, "宣戦を布告しました。月を終えると戦役が1回進行します。", "war");
    elements.leftPanel.scrollTop = 0;
  } catch (error) { showToast(error.message, "danger"); }
});
elements.strategyMap.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-place-id]")) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
window.addEventListener("beforeunload", () => persist());

subdivideTerritoryTiles(elements.strategyMap);
render();
