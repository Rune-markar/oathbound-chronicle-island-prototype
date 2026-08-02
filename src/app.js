import {
  COMMANDS,
  WAR_OBJECTIVES,
  WORLD,
  advanceDays,
  createInitialState,
  declareWar,
  deriveMetrics,
  formatDate,
  getCommandAvailability,
  getWarCouncilReport,
  issueCommand,
  negotiatePeace,
  setWarPlan,
} from "./simulation.js";

const STORAGE_KEY = "oathbound-island-grand-strategy-v3";
const SPEED_DELAYS = [0, 1100, 550, 250];

let state = loadState() ?? createInitialState();
let timer = null;
let toastTimer = null;
let resetArmTimer = null;
const view = {
  panel: "realm",
  mapMode: "political",
  scale: "country",
  selectedType: null,
  selectedId: null,
  speed: 0,
  warCouncilOpen: false,
  objectiveId: "navigation",
};

const elements = {
  resourceLedger: document.querySelector("#resourceLedger"),
  dateLabel: document.querySelector("#dateLabel"),
  speedControls: document.querySelector("#speedControls"),
  leftPanel: document.querySelector("#leftPanel"),
  primaryTabs: document.querySelector("#primaryTabs"),
  alertRack: document.querySelector("#alertRack"),
  strategyMap: document.querySelector("#strategyMap"),
  mapModeEyebrow: document.querySelector("#mapModeEyebrow"),
  mapCaptionTitle: document.querySelector("#mapCaptionTitle"),
  mapModeBar: document.querySelector("#mapModeBar"),
  mapScaleSwitch: document.querySelector("#mapScaleSwitch"),
  selectionCard: document.querySelector("#selectionCard"),
  chronicleTicker: document.querySelector("#chronicleTicker"),
  outlinerContent: document.querySelector("#outlinerContent"),
  warCouncilModal: document.querySelector("#warCouncilModal"),
  objectiveTabs: document.querySelector("#objectiveTabs"),
  warCouncilReport: document.querySelector("#warCouncilReport"),
  declarationWarning: document.querySelector("#declarationWarning"),
  declareWarButton: document.querySelector("#declareWarButton"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.version === 3 ? parsed : null;
  } catch {
    return null;
  }
}

function persist(showMessage = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (showMessage) showToast("年代記をこの端末に記録しました。");
}

function commit(nextState, message = "") {
  state = nextState;
  persist();
  render();
  if (message) showToast(message);
}

function showToast(message, tone = "neutral") {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast is-visible ${tone === "danger" ? "is-danger" : ""}`;
  toastTimer = setTimeout(() => {
    elements.toast.className = "toast";
  }, 2400);
}

function setSpeed(speed) {
  view.speed = speed;
  clearInterval(timer);
  timer = null;
  if (speed > 0 && !view.warCouncilOpen) {
    timer = setInterval(() => {
      commit(advanceDays(state, 1));
    }, SPEED_DELAYS[speed]);
  }
  renderTimeControls();
}

function formatValue(value, digits = 0) {
  return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

function renderResources() {
  const resources = [
    ["¤", formatValue(state.treasury, 1), `国庫 +${state.income.toFixed(1)}/月`],
    ["♛", state.legitimacy, "正統性"],
    ["♟", formatValue(state.manpower), "人的資源"],
    ["⚓", formatValue(state.sailors), "水兵"],
    ["文", state.admin, "統治力"],
    ["使", state.diplomacy, "外交力"],
    ["剣", state.military, "軍事力"],
  ];
  elements.resourceLedger.innerHTML = resources.map(([icon, value, label]) => `
    <div class="resource-item"><i>${icon}</i><strong>${value}</strong><small>${label}</small></div>
  `).join("");
}

function renderTimeControls() {
  elements.dateLabel.textContent = formatDate(state);
  elements.speedControls.querySelectorAll("[data-speed]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.speed) === view.speed);
  });
}

function renderTabs() {
  elements.primaryTabs.querySelectorAll("[data-panel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === view.panel);
  });
}

function costLabel(command) {
  const names = { treasury: "¤", admin: "統", diplomacy: "外", military: "軍", legitimacy: "正", manpower: "兵" };
  return Object.entries(command.cost).map(([key, value]) => `${names[key]}${value}`).join(" · ");
}

function commandCards(group) {
  return Object.values(COMMANDS).filter((command) => command.group === group).map((command) => {
    const availability = getCommandAvailability(state, command.id);
    return `
      <button class="command-card" type="button" data-command="${command.id}" ${availability.allowed ? "" : "disabled"}>
        <strong>${command.name}</strong><em>${availability.allowed ? `${command.duration}日 · ${costLabel(command)}` : availability.reason}</em>
        <small>${command.description}</small>
      </button>
    `;
  }).join("");
}

function meter(label, value, suffix = "/ 100") {
  const width = Math.min(100, Math.max(0, Number(value)));
  return `
    <div class="mini-meter">
      <div><span>${label}</span><strong>${formatValue(value, 0)} ${suffix}</strong></div>
      <div class="mini-track"><span style="width:${width}%"></span></div>
    </div>
  `;
}

function renderRealmPanel() {
  const metrics = deriveMetrics(state);
  const issueCards = Object.values(state.issues).map((issue) => `
    <article class="issue-card ${issue.status === "resolved" ? "is-resolved" : ""}">
      <strong>${issue.status === "resolved" ? "解決済み · " : ""}${issue.title}</strong>
      <small>${issue.detail}</small>
      <div class="severity-track"><span style="width:${issue.severity}%"></span></div>
    </article>
  `).join("");

  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>NATIONAL ADMINISTRATION</span>
      <h1>${WORLD.nation.name}</h1>
      <p>${WORLD.nation.ruler} · ${WORLD.nation.government}</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="realm-facts">
          <div><small>首都</small><strong>王都セレネ</strong></div>
          <div><small>安定度</small><strong>${state.stability >= 0 ? "+" : ""}${state.stability}</strong></div>
          <div><small>都市 / 村</small><strong>3 / 6</strong></div>
          <div><small>国家即応度</small><strong>${metrics.nationalReadiness}%</strong></div>
        </div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>島政院に届いた問題</h2><small>${metrics.activeIssues}件が継続</small></div>
        <div class="issue-list">${issueCards}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>行政命令</h2><small>費用と時間を消費</small></div>
        <div class="command-list">${commandCards("realm")}</div>
      </section>
    </div>
  `;
}

function renderDiplomacyPanel() {
  const report = getWarCouncilReport(state, "navigation");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>DIPLOMACY</span>
      <h1>ヴァルカ海岸公領</h1>
      <p>白礁海峡を挟む隣国 · 態度「警戒」</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="diplomatic-target">
          <div class="mini-shield">岬</div>
          <div><strong>ヴァルカ海岸公領</strong><small>岬城ヴァルカ · 海岸諸侯会議</small></div>
          <b class="relation-value">${state.relation}</b>
        </div>
        <div class="metric-stack" style="margin-top:12px">
          ${meter("開戦事由", state.justification)}
          ${meter("国内支持", state.warSupport)}
          ${meter("情報確度", state.intelligence)}
        </div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>外交コマンド</h2><small>相手の反応を伴う</small></div>
        <div class="command-list">${commandCards("diplomacy")}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>AI参謀の暫定評価</h2><small>確度 ${report.confidence}%</small></div>
        <p class="adviser-note"><strong>${report.posture}（${report.score >= 0 ? "+" : ""}${report.score}）</strong><br>${report.summary}<br>重点：${report.center.label}</p>
        <button class="war-entry-button" type="button" data-open-war ${state.war ? "disabled" : ""}>⚔ 戦争という選択肢を検討</button>
      </section>
    </div>
  `;
}

function warPlanButton(id, name, detail) {
  return `<button class="war-plan ${state.war?.plan === id ? "is-active" : ""}" type="button" data-war-plan="${id}"><strong>${name}</strong><small>${detail}</small></button>`;
}

function renderMilitaryPanel() {
  const metrics = deriveMetrics(state);
  if (state.war) {
    const objective = WAR_OBJECTIVES[state.war.objectiveId];
    const peace = state.war.peace;
    elements.leftPanel.innerHTML = `
      <header class="panel-heading">
        <span>WAR THEATRE</span>
        <h1>白礁海峡戦役</h1>
        <p>対 ヴァルカ海岸公領 · 目的「${objective.name}」</p>
      </header>
      <div class="panel-body">
        <section class="war-status-block">
          <div class="war-score"><span>戦勝点</span><strong>${state.war.score >= 0 ? "+" : ""}${state.war.score.toFixed(1)}</strong></div>
          <div class="metric-stack">
            ${meter("目的達成", state.war.objectiveProgress)}
            ${meter("組織力", state.organization)}
            ${meter("遠征充足", state.supply)}
            ${meter("戦争疲弊", state.warExhaustion)}
          </div>
        </section>
        <section class="panel-section">
          <div class="section-heading"><h2>作戦方針</h2><small>次の週次判定から反映</small></div>
          <div class="war-plan-list">
            ${warPlanButton("blockade", "商路封鎖", "損耗は低いが成果は緩やか。海上交通を圧迫する。")}
            ${warPlanButton("strait", "海峡確保", "限定目的に合う均衡策。補給線を短く保つ。")}
            ${warPlanButton("landing", "限定上陸", "成果と損耗が大きい。攻勢限界を越えやすい。")}
          </div>
        </section>
        <section class="panel-section">
          <div class="section-heading"><h2>相手の最新行動</h2><small>推定</small></div>
          <p class="adviser-note"><strong>${state.war.lastEnemyAction.label}</strong><br>${state.war.lastEnemyAction.reason}</p>
          ${peace ? `<p class="adviser-note"><strong>攻勢限界リスク ${peace.culminatingRisk}%</strong><br>${peace.recommendation}</p>` : ""}
          <button class="peace-button" type="button" data-peace>講和条件を提示する</button>
        </section>
      </div>
    `;
    return;
  }

  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>MILITARY</span>
      <h1>島嶼防衛軍</h1>
      <p>常備軍・港湾騎士・七隻の沿岸艦隊</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="realm-facts">
          <div><small>兵士</small><strong>${formatValue(state.army)}</strong></div>
          <div><small>艦船</small><strong>${state.fleet}隻</strong></div>
          <div><small>海上優勢</small><strong>${metrics.seaControl}%</strong></div>
          <div><small>推定敵艦</small><strong>${state.intelligence >= 65 ? "5稼働 / 8" : "6〜9隻"}</strong></div>
        </div>
        <div class="metric-stack" style="margin-top:12px">
          ${meter("練度", state.training)}
          ${meter("組織力", state.organization)}
          ${meter("補給充足", state.supply)}
          ${meter("海軍即応", state.navalReadiness)}
        </div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>軍事コマンド</h2><small>隠れた補給も判定</small></div>
        <div class="command-list">${commandCards("military")}</div>
      </section>
      <section class="panel-section">
        <p class="adviser-note">軍量だけでは決まりません。海峡への接近、港湾規格、船団、正当性が同じ戦役の成否へ繋がります。</p>
      </section>
    </div>
  `;
}

function characterStatus(id) {
  const status = state.characters[id];
  return ({ free: "無所属", foreign: "国外", serving: "仕官済み", retinue: "放浪軍結成", recruited: "登用済み" })[status] ?? status;
}

function renderPeoplePanel() {
  const cards = Object.values(WORLD.characters).map((character) => `
    <article class="character-card">
      <header><strong>${character.name}</strong><i>${characterStatus(character.id)}</i></header>
      <p>${character.role} · ${character.skill}</p>
    </article>
  `).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>COURT & RETINUES</span>
      <h1>人物と仕官</h1>
      <p>能力は報告結果の正確さとして現れる</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="section-heading"><h2>人物一覧</h2><small>忠誠と立場は別物</small></div>
        <div class="character-list">${cards}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>Notion内政コマンド</h2><small>原案を実装</small></div>
        <div class="command-list">${commandCards("people")}</div>
      </section>
    </div>
  `;
}

function renderLeftPanel() {
  if (view.panel === "diplomacy") renderDiplomacyPanel();
  else if (view.panel === "military") renderMilitaryPanel();
  else if (view.panel === "people") renderPeoplePanel();
  else renderRealmPanel();
}

function renderAlerts() {
  const alerts = [];
  if (state.war) alerts.push(`<span class="alert-chip danger">戦争中 · 戦勝点 ${state.war.score.toFixed(1)}</span>`);
  else alerts.push(`<span class="alert-chip danger">拿捕事件 · 対応未決</span>`);
  if (state.commandQueue.length) alerts.push(`<span class="alert-chip info">${state.commandQueue.length}件の命令を実行中</span>`);
  if (state.supply < 50) alerts.push(`<span class="alert-chip danger">遠征補給が不足</span>`);
  elements.alertRack.innerHTML = alerts.join("");
}

function renderMap() {
  elements.strategyMap.className.baseVal = `strategy-map map-mode-${view.mapMode} scale-${view.scale}`;
  const labels = {
    political: ["POLITICAL MAP", "白礁海峡周辺"],
    diplomatic: ["DIPLOMATIC MAP", "友好・敵対関係"],
    supply: ["SUPPLY MAP", "港湾と海上連絡線"],
    unrest: ["UNREST MAP", "請願・罷業・動揺"],
  };
  elements.mapModeEyebrow.textContent = labels[view.mapMode][0];
  elements.mapCaptionTitle.textContent = labels[view.mapMode][1];
  elements.mapModeBar.querySelectorAll("[data-map-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mapMode === view.mapMode);
  });
  elements.mapScaleSwitch.querySelectorAll("[data-scale]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scale === view.scale);
  });
  elements.strategyMap.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  if (view.selectedId) {
    elements.strategyMap.querySelectorAll(`[data-place-id="${view.selectedId}"]`).forEach((node) => node.classList.add("is-selected"));
  }
}

function renderSelection() {
  if (!view.selectedId) {
    elements.selectionCard.innerHTML = "";
    return;
  }
  if (view.selectedType === "province") {
    const province = WORLD.provinces[view.selectedId];
    const local = state.regions[province.id];
    elements.selectionCard.innerHTML = `
      <header><h3>${province.name}</h3><span>${WORLD.countries[province.owner].name}</span></header>
      <p>${province.note}</p>
      <div class="selection-facts"><span>人口 ${formatValue(province.population)}</span><span>補給 ${formatValue(local.supply)}</span><span>不穏 ${formatValue(local.unrest)}</span></div>
    `;
    return;
  }
  if (view.selectedType === "village") {
    const village = WORLD.villages[view.selectedId];
    elements.selectionCard.innerHTML = `
      <header><h3>${village.name}</h3><span>${village.kind} · ${WORLD.provinces[village.province].name}</span></header>
      <p>${village.issue}</p>
      <div class="selection-facts"><span>人口 ${formatValue(village.population)}</span><span>生活側から届いた事象</span></div>
    `;
    return;
  }
  const country = WORLD.countries[view.selectedId];
  const isValka = view.selectedId === "valka";
  elements.selectionCard.innerHTML = `
    <header><h3>${country.name}</h3><span>${isValka ? `関係 ${state.relation}` : "中立"}</span></header>
    <p>${isValka ? "白礁海峡の通航税と拿捕を巡って対立。軍事力より先に、相手が守ろうとする政治的利益を見極める必要がある。" : "紛争が拡大すれば、海上交易を守るため仲介または制裁へ動く。"}</p>
    ${isValka ? '<div class="selection-facts"><span>首都 岬城ヴァルカ</span><span>推定艦隊 6〜9隻</span></div>' : ""}
  `;
}

function renderOutliner() {
  const issues = Object.values(state.issues).map((issue) => `
    <div class="outliner-item ${issue.status === "resolved" ? "success" : "danger"}">
      <strong>${issue.status === "resolved" ? "✓ " : ""}${issue.title}</strong>
      <small>${issue.status === "resolved" ? "制度または合意で処理済み" : `深刻度 ${issue.severity}`}</small>
    </div>
  `).join("");
  const queue = state.commandQueue.length ? state.commandQueue.map((item) => {
    const command = COMMANDS[item.commandId];
    const progress = ((item.total - item.remaining) / item.total) * 100;
    return `
      <div class="outliner-item">
        <strong>${command.name}</strong><small>残り ${item.remaining}日</small>
        <div class="queue-track"><span style="width:${progress}%"></span></div>
      </div>
    `;
  }).join("") : '<div class="outliner-item"><small>実行中の命令はありません。</small></div>';
  const war = state.war ? `
    <section class="outliner-section">
      <h3>戦争</h3>
      <div class="outliner-item danger"><strong>白礁海峡戦役</strong><small>戦勝点 ${state.war.score.toFixed(1)} · ${WAR_OBJECTIVES[state.war.objectiveId].name}</small></div>
    </section>
  ` : "";
  const logs = state.log.slice(0, 4).map((entry) => `
    <div class="outliner-item"><strong>${entry.title}</strong><small>${entry.date} · ${entry.text}</small></div>
  `).join("");
  elements.outlinerContent.innerHTML = `
    ${war}
    <section class="outliner-section"><h3>現在の問題</h3>${issues}</section>
    <section class="outliner-section"><h3>命令タイムテーブル</h3>${queue}</section>
    <section class="outliner-section"><h3>年代記</h3>${logs}</section>
  `;
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
  elements.objectiveTabs.innerHTML = Object.values(WAR_OBJECTIVES).map((item) => `
    <button class="objective-tab ${item.id === view.objectiveId ? "is-active" : ""}" type="button" data-objective="${item.id}">
      <strong>${item.name}</strong><small>${item.scope === "limited" ? "限定目的" : "全面目的"} · 拡大リスク ${item.escalationRisk}</small>
    </button>
  `).join("");
  const factors = report.factors.map((factor) => `
    <div class="factor-row">
      <strong>${factor.label}</strong><b class="${factor.value < 0 ? "is-negative" : ""}">${factor.value >= 0 ? "+" : ""}${factor.value}</b><small>${factor.detail}</small>
    </div>
  `).join("");
  elements.warCouncilReport.innerHTML = `
    <div class="council-report">
      <aside class="ai-verdict">
        <div class="score-ring"><strong>${report.score >= 0 ? "+" : ""}${report.score}</strong><small>確度 ${report.confidence}%</small></div>
        <h3>${report.posture}</h3>
        <p>${report.summary}</p>
      </aside>
      <div>
        <div class="factor-table">${factors}</div>
        <div class="strategic-notes">
          <article class="strategic-note"><strong>重心候補 · ${report.center.label}</strong><small>${report.center.explanation}</small></article>
          <article class="strategic-note"><strong>止める地点</strong><small>${report.limit}</small></article>
        </div>
      </div>
    </div>
  `;
  const penalties = [];
  if (state.justification < 50) penalties.push("開戦事由が不足し、罷業と正統性低下を招きます");
  if (state.warSupport < 40) penalties.push("国内支持が不足しています");
  elements.declarationWarning.textContent = penalties.length
    ? `警告：${penalties.join("。")}`
    : `${objective.description} 現在の正当性なら、直ちに宣戦できます。`;
  elements.declareWarButton.textContent = `「${objective.name}」で宣戦布告`;
}

function render() {
  renderResources();
  renderTimeControls();
  renderTabs();
  renderLeftPanel();
  renderAlerts();
  renderMap();
  renderSelection();
  renderOutliner();
  renderTicker();
  renderWarCouncil();
}

document.addEventListener("click", (event) => {
  const panelButton = event.target.closest("[data-panel]");
  if (panelButton) {
    view.panel = panelButton.dataset.panel;
    render();
    return;
  }

  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    try {
      const command = COMMANDS[commandButton.dataset.command];
      commit(issueCommand(state, command.id), `${command.name}を命じました。時間を進めると完了します。`);
    } catch (error) {
      showToast(error.message, "danger");
    }
    return;
  }

  const speedButton = event.target.closest("[data-speed]");
  if (speedButton) {
    setSpeed(Number(speedButton.dataset.speed));
    return;
  }

  const modeButton = event.target.closest("[data-map-mode]");
  if (modeButton) {
    view.mapMode = modeButton.dataset.mapMode;
    render();
    return;
  }

  const scaleButton = event.target.closest("[data-scale]");
  if (scaleButton) {
    view.scale = scaleButton.dataset.scale;
    render();
    return;
  }

  const place = event.target.closest("[data-place-id]");
  if (place) {
    view.selectedType = place.dataset.placeType;
    view.selectedId = place.dataset.placeId;
    if (view.selectedType === "country" && view.selectedId === "valka") view.panel = "diplomacy";
    if (view.selectedType === "village") view.scale = "village";
    else if (view.selectedType === "province") view.scale = "city";
    render();
    return;
  }

  if (event.target.closest("[data-open-war]")) {
    if (state.war) return;
    setSpeed(0);
    view.warCouncilOpen = true;
    render();
    return;
  }

  const objectiveButton = event.target.closest("[data-objective]");
  if (objectiveButton) {
    view.objectiveId = objectiveButton.dataset.objective;
    renderWarCouncil();
    return;
  }

  const planButton = event.target.closest("[data-war-plan]");
  if (planButton) {
    try {
      commit(setWarPlan(state, planButton.dataset.warPlan), "作戦方針を更新しました。");
    } catch (error) {
      showToast(error.message, "danger");
    }
    return;
  }

  if (event.target.closest("[data-peace]")) {
    try {
      commit(negotiatePeace(state), "講和結果を年代記に記しました。");
    } catch (error) {
      showToast(error.message, "danger");
    }
  }
});

document.querySelector("#advanceDayButton").addEventListener("click", () => commit(advanceDays(state, 1)));
document.querySelector("#realmHome").addEventListener("click", () => {
  view.panel = "realm";
  view.scale = "country";
  view.selectedId = null;
  render();
});
document.querySelector("#saveButton").addEventListener("click", () => persist(true));
document.querySelector("#resetButton").addEventListener("click", (event) => {
  const button = event.currentTarget;
  if (button.dataset.armed !== "true") {
    button.dataset.armed = "true";
    button.textContent = "もう一度押すと初期化";
    showToast("現在の年代記を破棄する場合は、もう一度押してください。", "danger");
    clearTimeout(resetArmTimer);
    resetArmTimer = setTimeout(() => {
      button.dataset.armed = "false";
      button.textContent = "最初から";
    }, 10000);
    return;
  }
  clearTimeout(resetArmTimer);
  button.dataset.armed = "false";
  button.textContent = "最初から";
  setSpeed(0);
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  view.panel = "realm";
  view.mapMode = "political";
  view.scale = "country";
  view.selectedId = null;
  view.warCouncilOpen = false;
  render();
  showToast("新しい年代記を始めました。");
});
document.querySelector("#closeWarCouncil").addEventListener("click", () => {
  view.warCouncilOpen = false;
  renderWarCouncil();
});
elements.warCouncilModal.addEventListener("click", (event) => {
  if (event.target === elements.warCouncilModal) {
    view.warCouncilOpen = false;
    renderWarCouncil();
  }
});
elements.declareWarButton.addEventListener("click", () => {
  try {
    commit(declareWar(state, view.objectiveId), "宣戦を布告しました。時間を進めると戦役が進行します。");
    view.warCouncilOpen = false;
    view.panel = "military";
    render();
  } catch (error) {
    showToast(error.message, "danger");
  }
});
elements.strategyMap.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-place-id]")) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
window.addEventListener("beforeunload", () => persist());

render();
