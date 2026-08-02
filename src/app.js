import {
  ADMINISTRATION_MANDATES,
  ADMINISTRATION_MODES,
  COMMANDS,
  DOCTRINES,
  EVENT_DEFINITIONS,
  FACILITIES,
  FACTION_ACTIONS,
  FACTION_DEFINITIONS,
  FORCED_ORDER_RULES,
  FORMATIONS,
  POLICY_DEFINITIONS,
  WAR_OBJECTIVES,
  WORLD,
  adoptDoctrine,
  appointForceOfficer,
  cancelOrder,
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
  getCampaignStatus,
  getCommandAvailability,
  getContinentalBalance,
  getCountryReport,
  getCouncilProposals,
  getEligibleOfficers,
  getGovernance,
  getMilitarySummary,
  getOfficerReport,
  getTaskForecast,
  getTurnGuidance,
  getTurnWarnings,
  getWarCouncilReport,
  getWarSupport,
  negotiatePeace,
  queueOrder,
  resolveEventChoice,
  setFormation,
  setAdministrationMandate,
  setAdministrationMode,
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
import {
  RESOURCE_CATEGORIES,
  STATISTICS_BASIS,
  getNationStatistics,
  getResourceGrade,
  getResourcePower,
  getResourceRanking,
  getWorldStatisticsSummary,
} from "./world-statistics.js";

const STORAGE_KEY = "oathbound-continental-grand-strategy-v5";

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

function cityArt(cityId) {
  return CITY_ART[cityId] ?? CITY_ART.selene;
}

let state = loadState() ?? createInitialState();
let toastTimer = null;
let resetArmTimer = null;
let previewCache = { state: null, value: null };
const view = {
  panel: "council",
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
  selectedFacilityId: "farmland",
  warCouncilOpen: false,
  objectiveId: "transit",
  selectedCountryId: "valka",
  assignmentOpen: false,
  assignmentMode: null,
  pendingCommandId: null,
  pendingCityId: null,
  pendingForceRole: null,
  atlasMode: "nations",
  selectedNationId: "forest_alliance",
  selectedPeopleId: "acrane",
  guideOpen: state.turn === 0 && state.council.history.length === 0,
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
  leftPanel: document.querySelector("#leftPanel"),
  primaryTabs: document.querySelector("#primaryTabs"),
  alertRack: document.querySelector("#alertRack"),
  mapStage: document.querySelector(".map-stage"),
  cityWorkspace: document.querySelector("#cityWorkspace"),
  strategyMap: document.querySelector("#strategyMap"),
  mapModeEyebrow: document.querySelector("#mapModeEyebrow"),
  mapCaptionTitle: document.querySelector("#mapCaptionTitle"),
  mapModeBar: document.querySelector("#mapModeBar"),
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
  toast: document.querySelector("#toast"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.version === 5 ? parsed : null;
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
  const resources = [
    ["¤", formatValue(ledger.remittableMoney, 1), `朝廷可動 / 州庫計 ${formatValue(ledger.treasury, 1)}`],
    ["俵", formatValue(ledger.deliverableFood), `輸送可能 / 在庫 ${formatValue(ledger.provisions)}`],
    ["兵", formatValue(ledger.mobilizableTroops), `動員可能 / 駐屯 ${formatValue(ledger.troops)}`],
    ["道", `${military.mobility} / ${military.supply}`, "機動 / 軍需"],
    ["♛", state.legitimacy, "正統性"],
    ["令", `${ledger.governance.used}/${ledger.governance.max}`, `統治力 · 待機${ledger.availableOfficers}名`],
  ];
  elements.resourceLedger.innerHTML = resources.map(([icon, value, label]) => `
    <div class="resource-item"><i>${icon}</i><strong>${value}</strong><small>${label}</small></div>
  `).join("");
}

function renderTimeControls() {
  elements.dateLabel.textContent = formatDate(state);
  const season = deriveCityMetrics(state, view.selectedCityId).season.name;
  elements.dateHint.textContent = state.phase === "event" ? "事件対応が必要" : state.council.pending ? `${season}季評定を決定` : "月を終える";
  elements.endMonthButton.classList.toggle("is-blocked", state.phase === "event" || state.council.pending);
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
  const flow = campaign.loop.map((item, index) => {
    const step = index + 1;
    const active = guidance.step === step;
    const complete = campaign.complete || guidance.step > step;
    return `<span class="${active ? "is-active" : ""} ${complete ? "is-complete" : ""}"><i>${complete ? "✓" : step}</i>${item.label}</span>`;
  }).join("");
  const commandData = guidance.commandId ? ` data-command-id="${guidance.commandId}" data-city-id="${guidance.cityId}"` : "";
  elements.campaignBar.innerHTML = `
    <div class="campaign-bar-goal">
      <small>主目標 · ${campaign.role}</small>
      <strong>${campaign.title}</strong>
      <span>${campaign.completedCount} / ${campaign.totalCount} 達成</span>
    </div>
    <div class="campaign-bar-next">
      <small>次にすること · STEP ${guidance.step}/4 ${guidance.stepLabel}</small>
      <strong>${guidance.title}</strong>
      <span>${guidance.description}</span>
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

function costLabel(command) {
  const names = { money: "金", draftPopulation: "徴募" };
  return Object.entries(command.cost).map(([key, value]) => `${names[key]}${value}`).join(" · ");
}

function commandCards(group, cityId = null) {
  return Object.values(COMMANDS)
    .filter((command) => command.group === group)
    .filter((command) => !command.defaultCityId || group !== "city" || command.defaultCityId === cityId)
    .map((command) => {
      const targetCityId = command.defaultCityId ?? cityId ?? WORLD.nation.capital;
      const availability = getCommandAvailability(state, command.id, null, targetCityId);
      return `
        <button class="command-card" type="button" data-command="${command.id}" data-city-id="${targetCityId}" ${availability.allowed ? "" : "disabled"}>
          <strong>${command.name}</strong><em>${availability.allowed ? `${command.durationTurns}か月 · 統治${command.governanceCost} · ${costLabel(command)}` : availability.reason}</em>
          <small>${command.description}</small>
          ${availability.allowed ? '<span class="assign-prompt">担当武将を選ぶ →</span>' : ""}
        </button>
      `;
    }).join("");
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

function seasonName() {
  return `${deriveCityMetrics(state, view.selectedCityId).season.name}季`;
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
    const availability = getCommandAvailability(state, proposal.commandId, proposal.officerId, proposal.cityId);
    return `
      <article class="proposal-card">
        <header><span class="officer-seal">${officer.portrait}</span><div><strong>${officer.name}</strong><small>${officer.role}の提案</small></div><b>${proposal.forecast.grade}</b></header>
        <p>「${proposal.reason}」</p>
        <button type="button" data-command="${command.id}" data-city-id="${proposal.cityId}" ${availability.allowed ? "" : "disabled"}>${command.name}を任務化 · 予測 ${proposal.forecast.range[0]}〜${proposal.forecast.range[1]}</button>
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
          <span class="officer-seal large">${governor.portrait}</span>
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
        <div class="section-heading"><h2>内政任務</h2><small>統治力 ${governance.used}/${governance.max}</small></div>
        <div class="command-list">${commandCards("city", cityId)}</div>
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
  administration: "統治委任", facilities: "施設", factions: "派閥", reports: "報告",
};

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
      <div class="city-governor-badge"><span class="officer-seal">${governor.portrait}</span><div><small>太守</small><strong>${governor.name}</strong><b>${governor.policy}</b></div></div>
    </header>
    <nav class="city-workspace-tabs" aria-label="都市画面タブ">
      ${Object.entries(CITY_TABS).map(([id, label]) => `<button type="button" data-city-tab="${id}" class="${view.cityTab === id ? "is-active" : ""}">${label}</button>`).join("")}
    </nav>
  `;
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
  return `
    <section class="economy-summary">
      <article><small>戸籍人口</small><strong>${formatValue(administration.registeredPopulation)}</strong><span>名目人口の ${administration.registerCoverage}% · 全土 ${network.registrationRate}%</span></article>
      <article><small>行政到達</small><strong>${administration.reach}</strong><span>実効統制 ${administration.control} · ${administration.stage.name}</span></article>
      <article><small>中央へ届く国力</small><strong>兵 ${formatValue(administration.mobilizableTroops)}</strong><span>兵糧 ${formatValue(administration.deliverableFood)} / 金 ${formatValue(administration.remittableMoney, 1)}</span></article>
    </section>
    <section class="city-detail-columns">
      <article class="city-sheet"><header><h2>統治方式</h2><small>直轄は精密、委任は拡張向け</small></header><div class="policy-options">${modeCards}</div></article>
      <article class="city-sheet"><header><h2>${administration.stage.name}</h2><small>統合 ${administration.integration}%</small></header><p>${administration.stage.description}</p><p>併合地は軍政・帰順・戸籍編入・州郡化を経る。人口や在庫は、戸籍と輸送路が整うまで中央国力へ全量算入されない。</p></article>
      <article class="city-sheet"><header><h2>直近の委任報告</h2><small>${administration.modeName} · ${administration.mandateName}</small></header>${lastAction}</article>
    </section>
    <section class="policy-grid">${mandateCards}</section>
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
  const actions = (report.actions ?? []).filter((action) => action.cityId === cityId);
  if (!actions.length) return '<p class="report-empty-detail">この月に確定した都市命令はありません。</p>';
  return actions.map((action) => {
    const cost = [action.cost?.money ? `金 ${action.cost.money}` : "", action.cost?.draftPopulation ? `徴募 ${action.cost.draftPopulation}` : "", action.governanceCost ? `統治 ${action.governanceCost}` : ""].filter(Boolean).join(" · ");
    const status = action.status === "failed" ? "失敗" : action.status === "completed" ? "完了" : "進行中";
    return `<div class="report-action ${action.status === "failed" ? "is-failed" : ""}"><strong>${action.title}</strong><span>${status}${cost ? ` · ${cost}` : ""}</span><small>${action.detail}</small></div>`;
  }).join("");
}

function renderCityReports(city) {
  const reports = state.monthlyReports.filter((report) => report.cities.some((item) => item.cityId === city.cityId)).slice(0, 18);
  const annual = state.annualReports.slice(0, 6);
  const events = reports.flatMap((report) => report.events.filter((item) => item.cityId === city.cityId).map((item) => ({ ...item, year: report.year, monthName: report.monthName })));
  return `
    <section class="report-columns">
      <article class="report-list monthly-report-list"><header><h2>月次報告</h2><small>${reports.length}件 · 実収支</small></header>${reports.length ? reports.map((report, index) => { const local = report.cities.find((item) => item.cityId === city.cityId); return `<details ${index === 0 ? "open" : ""}><summary><span>${report.year}年 ${report.monthName}</span><b>金 ${signed(local.changes.money, 1)} · 食 ${signed(local.changes.food)}</b></summary><div class="report-total-strip"><span>人口 <b>${signed(local.changes.population)}</b></span><span>治安 <b>${signed(local.changes.security, 1)}</b></span><span>民心 <b>${signed(local.changes.support, 1)}</b></span></div><h3>因果内訳</h3><div class="report-causal-grid">${reportCausalRows(local)}</div><h3>命令・委任政務</h3><div class="report-actions">${reportActionRows(report, city.cityId)}</div>${report.events.filter((item) => item.cityId === city.cityId).map((item) => `<p class="report-event">事件「${item.title}」— ${item.choice}<small>${item.detail ?? ""}</small></p>`).join("")}</details>`; }).join("") : '<p class="empty-candidates">月を終えると報告が蓄積されます。</p>'}</article>
      <div class="report-side-stack"><article class="report-list"><header><h2>年次総括</h2><small>${annual.length}件</small></header>${annual.length ? annual.map((report) => `<div class="annual-report"><strong>誓暦${report.year}年</strong><span>金 ${signed(report.totals.money, 1)} / 食料 ${signed(report.totals.food)} / 人口 ${signed(report.totals.population)}</span><small>重大事件 ${report.events}件</small></div>`).join("") : '<p class="empty-candidates">12月終了時に年次総括を作成します。</p>'}</article><article class="report-list"><header><h2>事件履歴</h2><small>${events.length}件</small></header>${events.length ? events.map((item) => `<div class="report-history-item"><strong>${item.year}年 ${item.monthName} · ${item.title}</strong><span>${item.choice}</span><small>${item.detail ?? ""}</small></div>`).join("") : '<p class="empty-candidates">この都市の重大事件はまだありません。</p>'}</article></div>
    </section>
  `;
}

function renderCityWorkspace() {
  const active = view.panel === "city";
  elements.mapStage.classList.toggle("is-city-mode", active);
  elements.cityWorkspace.classList.toggle("is-hidden", !active);
  if (!active) return;
  const city = withPlanningForecast(deriveCityMetrics(state, view.selectedCityId));
  const governor = getOfficerReport(state, city.governorId);
  const body = {
    overview: renderCityOverview, population: renderCityPopulation, economy: renderCityEconomy,
    administration: renderCityAdministration, facilities: renderCityFacilities, factions: renderCityFactions, reports: renderCityReports,
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
  const cards = Object.values(SETTING_NATIONS).map((nation) => `
    <button type="button" class="world-nation-card ${nation.id === selected.id ? "is-active" : ""}" data-world-nation="${nation.id}">
      <span class="world-sigil" style="--nation-color:${nation.color}">${nation.sigil}</span>
      <span><strong>${nation.name}</strong><small>${nation.polity}<br>${nation.peopleLabel}</small></span>
      <em class="knowledge-${nation.knowledge}">${knowledgeLabel(nation.knowledge)}</em>
    </button>
  `).join("");
  return `
    <section class="world-dossier" style="--nation-color:${selected.color}">
      <header><span class="world-sigil large">${selected.sigil}</span><div><small>${selected.polity}</small><h2>${selected.name}</h2><b class="knowledge-${selected.knowledge}">${knowledgeLabel(selected.knowledge)}</b></div></header>
      <p>${selected.description}</p>
      <div class="world-link-row">${nationPeopleChips(selected.id)}</div>
      <div class="world-relation-note">${relationLines.join("<br>")}</div>
    </section>
    <section class="panel-section">
      <div class="section-heading"><h2>国家一覧</h2><small>Notion原案 10国家</small></div>
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
  const selected = getCountryReport(state, view.selectedCountryId) ?? getCountryReport(state, "valka");
  const delegate = getDiplomaticDelegate(selected.id);
  const isValka = selected.id === "valka";
  const report = isValka ? getWarCouncilReport(state, "transit") : null;
  const countryCards = balance.countries.filter((country) => country.id !== WORLD.nation.id).map((country) => `
    <button type="button" class="world-nation-card ${country.id === selected.id ? "is-active" : ""}" data-diplomacy-country="${country.id}">
      <span class="world-sigil" style="--nation-color:${country.color}">${country.name.slice(0, 1)}</span>
      <span><strong>${country.name}</strong><small>${country.stance} · 推定戦力 ${formatValue(country.power)}</small></span>
      <em class="${country.relation < 0 ? "knowledge-unknown" : "knowledge-defined"}">${country.relation >= 0 ? "+" : ""}${country.relation}</em>
    </button>`).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>DIPLOMACY</span>
      <h1>大陸外交</h1>
      <p>${WORLD.continent.name} · 周辺国の関係と介入可能性</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        ${delegate ? `
        <div class="diplomatic-audience">
          <img src="${delegate.representative.image}" alt="${selected.name}の${delegate.people.name}女性代表">
          <div class="diplomatic-audience-copy">
            <span>${delegate.certainty} · ${delegate.representative.apparentAge}</span>
            <strong>${delegate.people.name}代表</strong>
            <small>${delegate.representative.role} · ${delegate.representative.expression}</small>
          </div>
        </div>
        <p class="diplomatic-cast-note">${delegate.note}</p>
        ` : ""}
        <div class="diplomatic-target">
          <div class="mini-shield" style="background:${selected.color}">${selected.name.slice(0, 1)}</div><div><strong>${selected.name}</strong><small>${selected.capital} · ${selected.stance}</small></div><b class="relation-value">${selected.relation >= 0 ? "+" : ""}${selected.relation}</b>
        </div>
        <div class="metric-stack" style="margin-top:12px">
          ${meter("推定組織", selected.organization)}
          ${meter("大陸機動", selected.mobility)}
          ${meter("第三国介入", metrics.interventionRisk)}
        </div>
      </section>
      <section class="panel-section"><div class="section-heading"><h2>周辺国家</h2><small>${balance.countries.length - 1}か国</small></div><div class="world-nation-list">${countryCards}</div></section>
      ${isValka ? `
      <section class="panel-section">
        <div class="section-heading"><h2>外交任務</h2><small>担当官を任命</small></div>
        <div class="command-list">${commandCards("diplomacy", "selene")}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>軍師見解</h2><small>確度 ${report.confidence}%</small></div>
        <p class="adviser-note"><strong>${report.posture}（${signed(report.score)}）</strong><br>${report.summary}<br>重点：${report.center.label}<br>周辺最強国：${balance.strongest.name}</p>
        <button class="war-entry-button" type="button" data-open-war ${state.war ? "disabled" : ""}>⚔ 戦争という選択肢を検討</button>
      </section>
      ` : `<section class="panel-section"><div class="section-heading"><h2>国家評定</h2><small>外交台帳</small></div><p class="adviser-note"><strong>${selected.stance}</strong><br>推定兵力 ${formatValue(selected.army)}。この国の関係・敵意・介入意志は、ヴァルカ戦の第三国介入リスクへ反映されます。</p></section>`}
    </div>
  `;
}

function warPlanButton(id, name, detail) {
  return `<button class="war-plan ${state.war?.plan === id ? "is-active" : ""}" type="button" data-war-plan="${id}"><strong>${name}</strong><small>${detail}</small></button>`;
}

function formationButtons() {
  const current = state.forces.frontier_guard.formation;
  return Object.values(FORMATIONS).map((formation) => `
    <button type="button" class="formation-card ${formation.id === current ? "is-active" : ""}" data-formation="${formation.id}">
      <strong>${formation.name}</strong><small>${formation.description}</small>
    </button>
  `).join("");
}

function renderMilitaryPanel() {
  const metrics = deriveMetrics(state);
  const military = getMilitarySummary(state);
  const ledger = deriveRealmLedger(state);
  if (state.war) {
    const objective = WAR_OBJECTIVES[state.war.objectiveId];
    const peace = state.war.peace;
    elements.leftPanel.innerHTML = `
      <header class="panel-heading"><span>WAR THEATRE</span><h1>灰冠峠戦役</h1><p>目的「${objective.name}」 · 軍団長 ${military.commander.name}</p></header>
      <div class="panel-body">
        <section class="war-status-block">
          <div class="war-score"><span>戦勝点</span><strong>${signed(state.war.score, 1)}</strong></div>
          <div class="metric-stack">${meter("目的達成", state.war.objectiveProgress)}${meter("組織力", military.organization)}${meter("軍需充足", military.supply)}${meter("戦争疲弊", state.warExhaustion)}</div>
        </section>
        <section class="panel-section"><div class="section-heading"><h2>作戦方針</h2><small>月次判定</small></div><div class="war-plan-list">
          ${warPlanButton("interdict", "街道遮断", "隊商と軍需を抑え、大陸公路を圧迫する。")}
          ${warPlanButton("pass", "峠確保", "限定目的に合う均衡策。補給線を短く保つ。")}
          ${warPlanButton("siege", "城砦攻囲", "成果・軍需消費・損耗が大きい。")}
        </div></section>
        <section class="panel-section"><div class="section-heading"><h2>陣形</h2><small>${FORMATIONS[military.force.formation].name}</small></div><div class="formation-list">${formationButtons()}</div></section>
        <section class="panel-section"><p class="adviser-note"><strong>${state.war.lastEnemyAction.label}</strong><br>${state.war.lastEnemyAction.reason}</p>${peace ? `<p class="adviser-note"><strong>攻勢限界 ${peace.culminatingRisk}%</strong><br>${peace.recommendation}</p>` : ""}<button class="peace-button" type="button" data-peace>講和条件を提示する</button></section>
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
      <section class="panel-section"><div class="section-heading"><h2>陣形</h2><small>指揮官能力と組合せて計算</small></div><div class="formation-list">${formationButtons()}</div></section>
      <section class="panel-section"><div class="section-heading"><h2>軍事任務</h2><small>担当武将を任命</small></div><div class="command-list">${commandCards("military", "orta")}</div></section>
      <section class="panel-section"><div class="metric-stack">${meter("加重練度", military.training)}${meter("大陸機動", military.mobility)}${meter("第三国介入", metrics.interventionRisk)}</div></section>
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
    return `
      <article class="officer-card ${officer.allegiance !== "serving" ? "is-outsider" : ""}">
        <header><span class="officer-seal">${officer.portrait}</span><div><strong>${officer.name}</strong><small>${officer.rank} · ${WORLD.provinces[officer.location].name}</small></div><b>${allegianceLabel(officer.allegiance)}</b></header>
        <div class="officer-stat-grid">${statCells(officer.stats)}</div>
        <div class="officer-state-line"><span>忠誠 ${officer.loyalty}</span><span>意欲 ${officer.stamina}</span><span>功績 ${officer.merit}</span></div>
        <p><strong>${officer.policy}</strong> · ${officer.traits.join(" / ")}<br>${assignmentLabel(officer)}</p>
      </article>
    `;
  }).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading"><span>OFFICERS</span><h1>人物と官職</h1><p>能力・忠誠・意欲・功績・所在地を任務へ接続</p></header>
    <div class="panel-body">
      <section class="panel-section"><div class="section-heading"><h2>人物一覧</h2><small>${Object.keys(state.officers).length}名</small></div><div class="officer-list">${cards}</div></section>
      <section class="panel-section"><div class="section-heading"><h2>人事任務</h2><small>仕官・勧誘・登用</small></div><div class="command-list">${commandCards("people", "selene")}</div></section>
    </div>
  `;
}

function renderLeftPanel() {
  if (view.panel === "city") renderCityPanel();
  else if (view.panel === "world") renderWorldPanel();
  else if (view.panel === "diplomacy") renderDiplomacyPanel();
  else if (view.panel === "military") renderMilitaryPanel();
  else if (view.panel === "people") renderPeoplePanel();
  else renderCouncilPanel();
}

function renderAlerts() {
  const alerts = [];
  if (state.council.pending) alerts.push('<span class="alert-chip danger">季節評定 · 方針未決</span>');
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

function renderMap() {
  elements.strategyMap.className.baseVal = `strategy-map map-mode-${view.mapMode} scale-${view.scale}`;
  const labels = {
    political: ["POLITICAL MAP", WORLD.continent.name], terrain: ["TERRAIN MAP", "地形・標高・水系"], diplomatic: ["DIPLOMATIC MAP", "大陸諸国の友好・敵対"],
    supply: ["SUPPLY MAP", "月次食料収支"], unrest: ["PUBLIC ORDER MAP", "都市治安"],
  };
  elements.mapModeEyebrow.textContent = labels[view.mapMode][0];
  elements.mapCaptionTitle.textContent = labels[view.mapMode][1];
  elements.mapModeBar.querySelectorAll("[data-map-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.mapMode === view.mapMode));
  elements.mapScaleSwitch.querySelectorAll("[data-scale]").forEach((button) => button.classList.toggle("is-active", button.dataset.scale === view.scale));
  elements.strategyMap.querySelectorAll(".province[data-place-id]").forEach((node) => { node.style.fill = ""; });
  Object.keys(state.cities).forEach((cityId) => {
    const node = elements.strategyMap.querySelector(`.province[data-place-id="${cityId}"]`);
    if (!node) return;
    const city = deriveCityMetrics(state, cityId);
    if (view.mapMode === "supply") node.style.fill = valueColor(clampForMap(50 + city.supplyBalance / 120));
    if (view.mapMode === "unrest") node.style.fill = valueColor(city.publicOrder);
  });
  elements.strategyMap.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  if (view.selectedTileName) {
    elements.strategyMap.querySelectorAll(".map-tile").forEach((node) => node.classList.toggle("is-selected", node.dataset.tileName === view.selectedTileName));
  } else if (view.selectedId) {
    elements.strategyMap.querySelectorAll(`[data-place-id="${view.selectedId}"]`).forEach((node) => node.classList.add("is-selected"));
  }
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
    const tileFact = view.selectedTileName ? `<span>${view.selectedTileName} · ${view.selectedTerrain}</span>` : "";
    elements.selectionCard.innerHTML = `<header><h3>${city.name}</h3><span>${getOfficerReport(state, city.governorId).name}</span></header><p>${city.note}</p><div class="selection-facts">${tileFact}<span>人口 ${formatValue(city.population)}</span><span>月収支 ${signed(city.netIncome, 1)}</span><span>治安 ${formatValue(city.publicOrder, 1)}</span></div>`;
    return;
  }
  if (view.selectedType === "village") {
    const village = WORLD.villages[view.selectedId];
    const city = deriveCityMetrics(state, village.province);
    elements.selectionCard.innerHTML = `<header><h3>${village.name}</h3><span>${village.kind} · ${WORLD.provinces[village.province].name}</span></header><p>${village.issue}</p><div class="selection-facts"><span>人口 ${formatValue(village.population)}</span><span>${city.name}の村落構成として税収・産出へ反映</span></div>`;
    return;
  }
  const country = getCountryReport(state, view.selectedId);
  if (!country) { elements.selectionCard.innerHTML = ""; return; }
  const note = view.selectedId === "valka" ? "灰冠峠の関税と隊商差押えを巡って対立。城砦・国境軍・補給路が一つの戦争構造を作る。" : `${country.stance}。関係・戦力・介入意志が大陸均衡とヴァルカ戦の拡大リスクへ反映される。`;
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

function renderCityPlan(ledger) {
  const governance = getGovernance(state);
  const reservedMoney = state.pendingOrders.reduce((sum, order) => sum + (order.cost?.money ?? 0), 0);
  const warnings = getTurnWarnings(state);
  const preview = getPlanningPreview();
  const planned = state.pendingOrders.length ? state.pendingOrders.map((order) => `
    <article class="planned-order ${order.forced ? "is-forced" : ""}">
      <header><strong>${orderLabel(order)}</strong><button type="button" data-cancel-order="${order.id}" aria-label="命令を取り消す">取消</button></header>
      <small>${WORLD.provinces[order.cityId].name} · ${orderCostLabel(order)}${order.forced ? ` · 強行（失敗率 ${(order.forcedPoints ?? 0) * FORCED_ORDER_RULES.failureChancePerPoint}%）` : ""}</small>
    </article>
  `).join("") : '<p class="plan-empty">命令はまだありません。都市タブから今月の行動を追加できます。</p>';
  const forecastRows = preview?.report.cities.map((city) => `
    <div class="plan-forecast-row"><strong>${city.name.replace(/王都|河港|城塞市/, "")}</strong><span>金 ${signed(city.changes.money, 1)}</span><span>食 ${signed(city.changes.food)}</span><small>月末 金${formatValue(city.after.money, 1)} / 食${formatValue(city.after.food)}</small></div>
  `).join("") ?? "";
  const active = state.commandQueue.filter((task) => task.cityId === view.selectedCityId).map((task) => {
    const progress = Math.max(0, (task.durationTurns - task.remainingTurns) / Math.max(1, task.durationTurns) * 100);
    return `<div class="outliner-item"><strong>${COMMANDS[task.commandId].name}</strong><small>${getOfficerReport(state, task.officerId).name} · 残り${task.remainingTurns}か月</small><div class="queue-track"><span style="width:${progress}%"></span></div></div>`;
  }).join("");
  const projects = state.cities[view.selectedCityId].projects.map((project) => `<div class="outliner-item"><strong>${FACILITIES[project.facilityId].name} Lv.${project.targetLevel}</strong><small>建設中 · 残り${project.remainingTurns}か月</small></div>`).join("");
  return `
    <section class="plan-tray">
      <header><span>MONTHLY PLAN</span><h2>今月の計画</h2><p>${formatDate(state)}に確定する予約命令</p></header>
      <div class="plan-budget"><div><small>統治力</small><strong>${governance.used} / ${governance.max}</strong><span>強行上限 ${governance.hardLimit}</span></div><div><small>予約費用</small><strong>金 ${formatValue(reservedMoney, 1)}</strong><span>${state.pendingOrders.length}件</span></div></div>
      <div class="planned-orders">${planned}</div>
      ${forecastRows ? `<section class="plan-forecast"><h3>予約反映後の月末予測</h3>${forecastRows}<p>命令費・完成施設・通常収支・戦争を含む。未選択の事件効果は含みません。</p></section>` : ""}
      ${(active || projects) ? `<section class="plan-progress"><h3>${WORLD.provinces[view.selectedCityId].name}で進行中</h3>${active}${projects}</section>` : ""}
      <section class="plan-warnings"><h3>進行前の確認</h3>${warnings.length ? warnings.map((warning) => `<p>⚠ ${warning}</p>`).join("") : '<p class="is-clear">警告はありません。</p>'}</section>
      <button type="button" class="plan-end-month" data-end-month ${state.phase === "event" || state.council.pending ? "disabled" : ""}>月を終える<span>生産・消費・事件を一括処理</span></button>
    </section>
  `;
}

function renderOutliner() {
  const ledger = deriveRealmLedger(state);
  if (view.panel === "city") {
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
  const logs = state.log.slice(0, 4).map((entry) => `<div class="outliner-item"><strong>${entry.title}</strong><small>${entry.date} · ${entry.text}</small></div>`).join("");
  elements.outlinerContent.innerHTML = `${mission}${council}${war}<section class="outliner-section"><h3>都市台帳</h3>${cities}</section><section class="outliner-section"><h3>任務</h3>${queue}</section><section class="outliner-section"><h3>年代記</h3>${logs}</section>`;
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
  const support = getWarSupport(state);
  elements.objectiveTabs.innerHTML = Object.values(WAR_OBJECTIVES).map((item) => `<button class="objective-tab ${item.id === view.objectiveId ? "is-active" : ""}" type="button" data-objective="${item.id}"><strong>${item.name}</strong><small>${item.scope === "limited" ? "限定目的" : "全面目的"} · 拡大リスク ${item.escalationRisk}</small></button>`).join("");
  const factors = report.factors.map((factor) => `<div class="factor-row"><strong>${factor.label}</strong><b class="${factor.value < 0 ? "is-negative" : ""}">${signed(factor.value)}</b><small>${factor.detail}</small></div>`).join("");
  const military = getMilitarySummary(state);
  elements.warCouncilReport.innerHTML = `<div class="council-report"><aside class="ai-verdict"><div class="score-ring"><strong>${signed(report.score)}</strong><small>確度 ${report.confidence}%</small></div><h3>${report.posture}</h3><p>${report.summary}</p><p>軍団長 ${military.commander.name}<br>副将 ${military.deputy.name}<br>${FORMATIONS[military.force.formation].name}</p></aside><div><div class="factor-table">${factors}</div><div class="strategic-notes"><article class="strategic-note"><strong>重心候補 · ${report.center.label}</strong><small>${report.center.explanation}</small></article><article class="strategic-note"><strong>止める地点</strong><small>${report.limit}</small></article></div></div></div>`;
  const penalties = [];
  if (state.justification < 50) penalties.push("開戦事由不足により国境農民が徴発を拒否します");
  if (support < 40) penalties.push("都市治安から算出した国内支持が不足しています");
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
  return `<button type="button" class="candidate-card" data-assign-officer="${officer.id}"><span class="officer-seal large">${officer.portrait}</span><div><header><strong>${officer.name}</strong><b>${forecast.grade}</b></header><small>${officer.rank} · ${WORLD.provinces[officer.location].name}</small><p>${relevant}<br>忠誠 ${officer.loyalty} · 意欲 ${officer.stamina} · ${officer.policy}</p></div><em>${forecast.range[0]}〜${forecast.range[1]}</em></button>`;
}

function forceCandidateCard(officer) {
  return `<button type="button" class="candidate-card" data-force-officer="${officer.id}"><span class="officer-seal large">${officer.portrait}</span><div><header><strong>${officer.name}</strong><b>${officer.policy}</b></header><small>${officer.rank} · 忠誠 ${officer.loyalty}</small><p>統率 ${officer.stats.leadership} · 武力 ${officer.stats.war} · 知力 ${officer.stats.intelligence}</p></div><em>任命</em></button>`;
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
  const governance = getGovernance(state);
  elements.assignmentTitle.textContent = `${command.name}の担当武将`;
  elements.assignmentSummary.textContent = `${WORLD.provinces[cityId].name} · ${command.description}`;
  elements.assignmentLedger.innerHTML = `<span>都市金 ${formatValue(city.money, 1)}</span><span>統治力 ${governance.used}/${governance.max}</span><span>期間 ${command.durationTurns}か月</span><span>費用 ${costLabel(command)}</span>`;
  const candidates = getEligibleOfficers(state, command.id, cityId);
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
}

function renderPanelFromTop() {
  render();
  elements.leftPanel.scrollTop = 0;
}

function openCommandAssignment(commandId, cityId) {
  view.assignmentOpen = true;
  view.assignmentMode = "command";
  view.pendingCommandId = commandId;
  view.pendingCityId = cityId;
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
    openCommandAssignment(button.dataset.commandId, button.dataset.cityId);
    renderGuideModal();
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
  if (action === "open_military") {
    view.panel = "military";
    view.scale = "country";
    view.selectedType = "country";
    view.selectedId = "valka";
    view.selectedCountryId = "valka";
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
    view.panel = "city";
    view.selectedCityId = WORLD.nation.capital;
    view.selectedType = "province";
    view.selectedId = view.selectedCityId;
    view.cityTab = "reports";
    view.scale = "city";
    renderPanelFromTop();
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
    "[data-world-mode]",
    "[data-statistics-nation]",
    "[data-world-nation]",
    "[data-world-people]",
    "[data-select-city]",
    "[data-city-tab]",
    "[data-select-facility]",
    "[data-command]",
    "[data-force-role]",
    "[data-map-mode]",
    "[data-scale]",
    "[data-diplomacy-country]",
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
  const cityTabButton = event.target.closest("[data-city-tab]");
  if (cityTabButton) {
    view.cityTab = cityTabButton.dataset.cityTab;
    render();
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
  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    openCommandAssignment(commandButton.dataset.command, commandButton.dataset.cityId);
    return;
  }
  const assignButton = event.target.closest("[data-assign-officer]");
  if (assignButton) {
    const command = COMMANDS[view.pendingCommandId];
    const cityId = command.defaultCityId ?? view.pendingCityId;
    const queued = queuePlannedOrder(
      { kind: "command", commandId: command.id, officerId: assignButton.dataset.assignOfficer, cityId },
      `${WORLD.characters[assignButton.dataset.assignOfficer].name}を「${command.name}」へ仮配置しました。`,
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
    if (view.selectedType === "village") { view.selectedCityId = WORLD.villages[view.selectedId].province; view.panel = "city"; view.scale = "village"; }
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
  if (event.target.closest("[data-peace]")) {
    try { commit(negotiatePeace(state), "講和結果を年代記に記しました。", "peace"); }
    catch (error) { showToast(error.message, "danger"); }
  }
});

elements.endMonthButton.addEventListener("click", endMonth);
elements.audioToggle.addEventListener("click", async () => {
  const enabled = await audio.toggle();
  if (enabled) audio.play("confirm");
});
document.querySelector("#realmHome").addEventListener("click", () => { clearTileDetailSelection(); view.panel = "council"; view.scale = "country"; renderPanelFromTop(); });
document.querySelector("#saveButton").addEventListener("click", () => persist(true));
document.querySelector("#resetButton").addEventListener("click", (event) => {
  const button = event.currentTarget;
  if (button.dataset.armed !== "true") {
    button.dataset.armed = "true";
    button.textContent = "もう一度押すと初期化";
    showToast("現在の年代記を破棄する場合は、もう一度押してください。", "danger");
    clearTimeout(resetArmTimer);
    resetArmTimer = setTimeout(() => { button.dataset.armed = "false"; button.textContent = "最初から"; }, 10000);
    return;
  }
  clearTimeout(resetArmTimer);
  button.dataset.armed = "false";
  button.textContent = "最初から";
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  Object.assign(view, { panel: "council", mapMode: "political", scale: "country", selectedType: null, selectedId: null, selectedTileName: null, selectedTerrain: null, selectedTerrainType: null, tileWindowOpen: false, selectedCityId: "selene", cityTab: "overview", selectedFacilityId: "farmland", selectedCountryId: "valka", objectiveId: "transit", warCouncilOpen: false, assignmentOpen: false, guideOpen: true });
  render();
  audio.play("reset");
  showToast("新しい年代記を始めました。");
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
  }
});
document.querySelector("#closeAssignment").addEventListener("click", closeAssignment);
elements.assignmentModal.addEventListener("click", (event) => { if (event.target === elements.assignmentModal) closeAssignment(); });
elements.guideModal.addEventListener("click", (event) => { if (event.target === elements.guideModal) { view.guideOpen = false; renderGuideModal(); } });
elements.declareWarButton.addEventListener("click", () => {
  try {
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

render();
