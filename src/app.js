import {
  DEADLINE,
  POLICIES,
  WORLD,
  advanceDay,
  createInitialState,
  deriveMetrics,
  enactPolicy,
  getCityMetrics,
  getOutcome,
  getPlaceName,
  getPolicyAvailability,
  getTravelMinutes,
  performAction,
} from "./simulation.js";

const STORAGE_KEY = "oathbound-island-prototype-v2";
const SVG_NS = "http://www.w3.org/2000/svg";

let state = loadState() ?? createInitialState();
let view = {
  scale: "country",
  selectedType: "country",
  selectedId: WORLD.country.id,
};

const elements = {
  dayLabel: document.querySelector("#dayLabel"),
  deliveredMetric: document.querySelector("#deliveredMetric"),
  deliveryProgress: document.querySelector("#deliveryProgress"),
  treasuryMetric: document.querySelector("#treasuryMetric"),
  legitimacyMetric: document.querySelector("#legitimacyMetric"),
  debtMetric: document.querySelector("#debtMetric"),
  actionPips: document.querySelector("#actionPips"),
  daysRemaining: document.querySelector("#daysRemaining"),
  roleLabel: document.querySelector("#roleLabel"),
  playerLocationLabel: document.querySelector("#playerLocationLabel"),
  mapFrame: document.querySelector("#mapFrame"),
  map: document.querySelector("#islandMap"),
  territoryLayer: document.querySelector("#territoryLayer"),
  routeLayer: document.querySelector("#routeLayer"),
  nodeLayer: document.querySelector("#nodeLayer"),
  scaleEyebrow: document.querySelector("#scaleEyebrow"),
  mapTitle: document.querySelector("#mapTitle"),
  mapSubtitle: document.querySelector("#mapSubtitle"),
  mapNote: document.querySelector("#mapNote span:last-child"),
  inspector: document.querySelector("#inspector"),
  causalChain: document.querySelector("#causalChain"),
  chronicleList: document.querySelector("#chronicleList"),
  introModal: document.querySelector("#introModal"),
  resultModal: document.querySelector("#resultModal"),
  resultTitle: document.querySelector("#resultTitle"),
  resultLead: document.querySelector("#resultLead"),
  resultStats: document.querySelector("#resultStats"),
  resultBody: document.querySelector("#resultBody"),
  toast: document.querySelector("#toast"),
  nextDayButton: document.querySelector("#nextDayButton"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved.version === 2 ? saved : null;
  } catch {
    return null;
  }
}

function saveState(showMessage = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (showMessage) showToast("年代記をこの端末に保存しました");
}

function resetGame() {
  state = createInitialState();
  view = { scale: "country", selectedType: "country", selectedId: WORLD.country.id };
  localStorage.removeItem(STORAGE_KEY);
  elements.resultModal.classList.add("is-hidden");
  render();
}

function showToast(message, tone = "neutral") {
  elements.toast.textContent = message;
  elements.toast.dataset.tone = tone;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function commit(nextState, message) {
  state = nextState;
  saveState();
  render();
  if (message) showToast(message, "good");
}

function formatNumber(value, digits = 0) {
  return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

function formatClock(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function setScale(scale, selectedId) {
  view.scale = scale;
  if (scale === "country") {
    view.selectedType = "country";
    view.selectedId = WORLD.country.id;
  } else if (scale === "city") {
    view.selectedType = "city";
    view.selectedId = selectedId && WORLD.cities[selectedId] ? selectedId : currentCityId();
  } else {
    view.selectedType = "village";
    view.selectedId = selectedId && WORLD.villages[selectedId] ? selectedId : currentVillageId();
  }
  render();
}

function currentCityId() {
  if (view.selectedType === "city" && WORLD.cities[view.selectedId]) return view.selectedId;
  if (view.selectedType === "village" && WORLD.villages[view.selectedId]) return WORLD.villages[view.selectedId].cityId;
  return "selene";
}

function currentVillageId() {
  if (view.selectedType === "village" && WORLD.villages[view.selectedId]) return view.selectedId;
  return WORLD.cities[currentCityId()].villageIds[0];
}

function focusPlace(type, id) {
  view.selectedType = type;
  view.selectedId = id;
  if (type === "city") view.scale = "city";
  if (type === "village") view.scale = "village";
  render();
}

function createSvg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function appendText(group, x, y, value, className, anchor = "middle") {
  const text = createSvg("text", { x, y, class: className, "text-anchor": anchor });
  text.textContent = value;
  group.append(text);
}

function buildMap() {
  elements.territoryLayer.replaceChildren();
  elements.routeLayer.replaceChildren();
  elements.nodeLayer.replaceChildren();

  Object.values(WORLD.cities).forEach((city) => {
    const selected = currentCityId() === city.id;
    const territory = createSvg("circle", {
      cx: city.x,
      cy: city.y,
      r: 112,
      class: `territory ${selected ? "is-selected" : ""}`,
      fill: city.color,
    });
    elements.territoryLayer.append(territory);

    city.villageIds.forEach((villageId) => {
      const village = WORLD.villages[villageId];
      const cityState = state.cities[city.id];
      const route = createSvg("line", {
        x1: city.x,
        y1: city.y,
        x2: village.x,
        y2: village.y,
        class: `map-route ${cityState.caravan ? "is-improved" : ""}`,
      });
      elements.routeLayer.append(route);
    });
  });

  const intercityRoutes = [
    ["selene", "nereia"],
    ["selene", "orta"],
    ["orta", "nereia"],
  ];
  intercityRoutes.forEach(([fromId, toId]) => {
    const from = WORLD.cities[fromId];
    const to = WORLD.cities[toId];
    elements.routeLayer.prepend(
      createSvg("path", {
        d: `M${from.x} ${from.y} Q${(from.x + to.x) / 2 + 18} ${(from.y + to.y) / 2 - 18} ${to.x} ${to.y}`,
        class: "intercity-route",
      }),
    );
  });

  Object.values(WORLD.cities).forEach((city) => {
    const group = createSvg("g", {
      class: `map-node city-node ${view.selectedType === "city" && view.selectedId === city.id ? "is-selected" : ""} ${state.locationId === city.id ? "is-player-location" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": `${city.name}を選択`,
      "data-type": "city",
      "data-id": city.id,
    });
    group.append(createSvg("circle", { cx: city.x, cy: city.y, r: 18, fill: city.color, class: "node-halo" }));
    group.append(createSvg("circle", { cx: city.x, cy: city.y, r: 8, class: "node-core" }));
    if (state.locationId === city.id) group.append(createSvg("circle", { cx: city.x, cy: city.y, r: 27, class: "player-marker" }));
    appendText(group, city.x, city.y + 34, city.shortName, "node-label city-label");
    appendText(group, city.x, city.y + 49, city.kind, "node-subtitle");
    elements.nodeLayer.append(group);
  });

  Object.values(WORLD.villages).forEach((village) => {
    const local = state.villages[village.id];
    const cityActive = currentCityId() === village.cityId;
    const group = createSvg("g", {
      class: `map-node village-node ${cityActive ? "is-city-active" : ""} ${view.selectedType === "village" && view.selectedId === village.id ? "is-selected" : ""} ${local.hardship >= 2 ? "is-burdened" : ""} ${state.locationId === village.id ? "is-player-location" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": `${village.name}を選択`,
      "data-type": "village",
      "data-id": village.id,
    });
    group.append(createSvg("circle", { cx: village.x, cy: village.y, r: 10, class: "village-halo" }));
    group.append(createSvg("circle", { cx: village.x, cy: village.y, r: 4.5, class: "village-core" }));
    if (state.locationId === village.id) group.append(createSvg("circle", { cx: village.x, cy: village.y, r: 18, class: "player-marker" }));
    appendText(group, village.x, village.y + 24, village.name, "node-label village-label");
    elements.nodeLayer.append(group);
  });

  document.querySelectorAll(".map-node").forEach((node) => {
    node.addEventListener("click", () => focusPlace(node.dataset.type, node.dataset.id));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        focusPlace(node.dataset.type, node.dataset.id);
      }
    });
  });
}

function updateMapCamera() {
  let viewBox = "0 0 900 650";
  if (view.scale === "city") {
    const city = WORLD.cities[currentCityId()];
    viewBox = `${city.x - 190} ${city.y - 145} 380 290`;
  } else if (view.scale === "village") {
    const village = WORLD.villages[currentVillageId()];
    viewBox = `${village.x - 112} ${village.y - 88} 224 176`;
  }
  elements.map.setAttribute("viewBox", viewBox);
  elements.mapFrame.dataset.scale = view.scale;
}

function renderHeader() {
  elements.dayLabel.textContent = state.ended ? `第${DEADLINE}日 / 終了` : `第${state.day}日 / ${DEADLINE}日 · ${formatClock(state.currentMinutes)}`;
  elements.deliveredMetric.textContent = formatNumber(state.delivered, 1);
  elements.deliveryProgress.style.width = `${Math.min(100, (state.delivered / state.target) * 100)}%`;
  elements.treasuryMetric.textContent = formatNumber(state.treasury, 1);
  elements.legitimacyMetric.textContent = formatNumber(state.legitimacy);
  elements.debtMetric.textContent = formatNumber(state.oathDebt);
  elements.daysRemaining.textContent = state.ended ? "終了" : `${state.deadline - state.day + 1}日`;
  elements.roleLabel.textContent = state.role;
  elements.playerLocationLabel.textContent = `現在地：${getPlaceName(state.locationId)}`;
  elements.actionPips.replaceChildren();
  for (let index = 0; index < 2; index += 1) {
    const pip = document.createElement("i");
    if (index >= state.actionPoints) pip.classList.add("is-used");
    elements.actionPips.append(pip);
  }
  elements.nextDayButton.disabled = false;
  elements.nextDayButton.innerHTML = state.ended ? "年代記を確認" : "一日進める <span aria-hidden=\"true\">→</span>";
}

function renderMapHeading() {
  const data = {
    country: {
      eyebrow: "NATION / ONE ISLAND",
      title: WORLD.country.name,
      subtitle: "三つの都市圏と六つの村が、同じ備蓄と命令を共有する。",
      note: "都市を選ぶか、縮尺を変えて現地へ降りられます",
    },
    city: (() => {
      const city = WORLD.cities[currentCityId()];
      return {
        eyebrow: `CITY NETWORK / ${city.kind}`,
        title: city.name,
        subtitle: `${city.institution}が、周辺二村の物資と命令を変換する。`,
        note: "村を選ぶと、同じ在庫を生活者の側から確認できます",
      };
    })(),
    village: (() => {
      const village = WORLD.villages[currentVillageId()];
      return {
        eyebrow: `VILLAGE / ${village.kind}`,
        title: village.name,
        subtitle: `${village.households}世帯・${village.population}人。国家の一行は、ここでは冬の食卓になる。`,
        note: "台帳照合と証言は、国家規模の誓約案を解放します",
      };
    })(),
  }[view.scale];
  elements.scaleEyebrow.textContent = data.eyebrow;
  elements.mapTitle.textContent = data.title;
  elements.mapSubtitle.textContent = data.subtitle;
  elements.mapNote.textContent = data.note;
  document.querySelectorAll(".scale-button").forEach((button) => button.classList.toggle("is-active", button.dataset.scale === view.scale));
}

function meter(label, value, suffix = "/ 100", tone = "blue") {
  const width = Math.max(0, Math.min(100, value));
  return `<div class="mini-meter"><div><span>${label}</span><strong>${formatNumber(value)} ${suffix}</strong></div><div class="mini-track"><span class="${tone}" style="width:${width}%"></span></div></div>`;
}

function policyCard(policy) {
  const availability = getPolicyAvailability(state, policy.id);
  const selected = state.policy === policy.id;
  return `
    <article class="policy-card ${selected ? "is-selected" : ""}">
      <div class="policy-card-heading"><span>${policy.tag}</span>${selected ? "<i>発布中</i>" : ""}</div>
      <h3>${policy.title}</h3>
      <p>${policy.summary}</p>
      <small>${selected ? policy.promise : `${policy.requirement} — ${availability.reason}`}</small>
      <button class="policy-button" data-policy="${policy.id}" type="button" ${availability.allowed ? "" : "disabled"}>${selected ? "発布済み" : "この誓約を発布"}</button>
    </article>`;
}

function renderCountryInspector() {
  const metrics = deriveMetrics(state);
  elements.inspector.innerHTML = `
    <div class="inspector-heading">
      <span class="eyebrow">NATIONAL DESK</span>
      <h2>${WORLD.country.name}</h2>
      <p>${WORLD.country.subtitle}</p>
    </div>
    <div class="fact-grid">
      <div><span>人口</span><strong>${formatNumber(WORLD.country.population)}人</strong></div>
      <div><span>情報把握</span><strong>${metrics.information}%</strong></div>
      <div><span>村の信頼</span><strong>${formatNumber(metrics.averageTrust)}%</strong></div>
      <div><span>島国安定</span><strong>${metrics.stability}%</strong></div>
    </div>
    <section class="inspector-section">
      <div class="section-title"><h3>誓約律を定める</h3><span>証拠 ${state.evidence}点</span></div>
      <p class="section-copy">同じ必要量でも、誰の数字を信じ、何を保護するかで歴史が変わる。発布後の変更はできない。</p>
      <div class="policy-list">${Object.values(POLICIES).map(policyCard).join("")}</div>
    </section>`;
}

function actionButton(id, targetId, title, detail, cost, disabled) {
  return `<button class="action-button" data-action="${id}" data-target="${targetId}" type="button" ${disabled ? "disabled" : ""}><span><strong>${title}</strong><small>${detail}</small></span><i>${cost}</i></button>`;
}

function travelPanel(targetId) {
  const isHere = state.locationId === targetId;
  if (isHere) {
    return `<div class="location-status is-here"><span>現在地</span><strong>レナはここにいる</strong></div>`;
  }
  const minutes = getTravelMinutes(state.locationId, targetId);
  return `<div class="location-status"><span>${getPlaceName(state.locationId)}から ${minutes}分</span><button class="travel-button" data-action="player.travel" data-target="${targetId}" type="button" ${state.actionPoints < 1 || state.ended ? "disabled" : ""}>ここへ移動する · 1 AP</button></div>`;
}

function renderCityInspector(cityId) {
  const city = WORLD.cities[cityId];
  const local = state.cities[cityId];
  const metrics = getCityMetrics(state, cityId);
  const isHere = state.locationId === cityId;
  elements.inspector.innerHTML = `
    <button class="inspector-back" data-go-scale="country" type="button">← 島国全体</button>
    <div class="inspector-heading">
      <span class="eyebrow">${city.kind.toUpperCase()} / INSTITUTION</span>
      <h2>${city.name}</h2>
      <p>${city.description}</p>
    </div>
    ${travelPanel(cityId)}
    <div class="fact-grid">
      <div><span>人口</span><strong>${formatNumber(city.population)}人</strong></div>
      <div><span>圏内在庫</span><strong>${formatNumber(metrics.stock, 1)}樽</strong></div>
      <div><span>累計発送</span><strong>${formatNumber(metrics.shipped, 1)}樽</strong></div>
      <div><span>到着率</span><strong>${formatNumber(metrics.arrival * 100)}%</strong></div>
    </div>
    <section class="inspector-section">
      <div class="section-title"><h3>${city.institution}</h3><span>${state.actionPoints} AP</span></div>
      ${meter("周辺村の信頼", metrics.trust)}
      <div class="institution-flags">
        <span class="${local.ledger ? "is-done" : ""}">統一台帳</span>
        <span class="${local.caravan ? "is-done" : ""}">定期便</span>
        <span class="${local.council ? "is-done" : ""}">現地評議会</span>
      </div>
      <div class="action-list">
        ${actionButton("city.ledger", cityId, "統一台帳を配る", "記録誤差を縮め、到着率 +5%", "1 AP / 10貨", !isHere || local.ledger || state.actionPoints < 1 || state.treasury < 10)}
        ${actionButton("city.caravan", cityId, "定期荷車便を編成", "輸送容量と到着率を上げる", "1 AP / 12貨", !isHere || local.caravan || state.actionPoints < 1 || state.treasury < 12)}
        ${actionButton("city.council", cityId, "現地評議会を開く", "証拠 +1・周辺信頼 +4", "1 AP", !isHere || local.council || state.actionPoints < 1)}
      </div>
    </section>
    <section class="inspector-section linked-places">
      <h3>周辺の村</h3>
      ${city.villageIds.map((id) => {
        const village = WORLD.villages[id];
        const villageState = state.villages[id];
        return `<button data-place-type="village" data-place-id="${id}" type="button"><span>${village.name}<small>${village.kind}</small></span><strong>信頼 ${formatNumber(villageState.trust)}</strong></button>`;
      }).join("")}
    </section>`;
}

function renderVillageInspector(villageId) {
  const village = WORLD.villages[villageId];
  const local = state.villages[villageId];
  const city = WORLD.cities[village.cityId];
  const isHere = state.locationId === villageId;
  const stockDisplay = local.inspected || state.cities[village.cityId].ledger ? `${formatNumber(local.stock, 1)}樽` : `推定 ${formatNumber(local.recorded)}樽`;
  const burden = local.hardship < 1 ? "軽微" : local.hardship < 3 ? "注意" : "深刻";
  elements.inspector.innerHTML = `
    <button class="inspector-back" data-go-city="${city.id}" type="button">← ${city.shortName}都市圏</button>
    <div class="inspector-heading">
      <span class="eyebrow">LOCAL LIFE / ${village.kind}</span>
      <h2>${village.name}</h2>
      <p>${village.households}世帯・${village.population}人。${village.custom}。</p>
    </div>
    ${travelPanel(villageId)}
    <div class="village-stock">
      <span>穀物在庫</span><strong>${stockDisplay}</strong>
      <small>冬越し線 ${village.reserve}樽 / 発送済み ${formatNumber(local.shipped, 1)}樽</small>
    </div>
    <div class="fact-grid">
      <div><span>島政院への信頼</span><strong>${formatNumber(local.trust)}%</strong></div>
      <div><span>生活負担</span><strong>${burden}</strong></div>
    </div>
    <blockquote class="village-voice"><p>「${local.heard ? village.voice : "話を聞けば、この村の事情が分かる。"}」</p><cite>${local.heard ? village.speaker : "未聴取"}</cite></blockquote>
    <section class="inspector-section">
      <div class="section-title"><h3>現地で行う</h3><span>${state.actionPoints} AP</span></div>
      <div class="action-list">
        ${actionButton("village.inspect", villageId, "台帳と倉を照合", "真の在庫と冬越し線を確認・証拠 +1", "1 AP", !isHere || local.inspected || state.actionPoints < 1)}
        ${actionButton("village.hear", villageId, "生活者の証言を聞く", "固有事情を記録・証拠 +1・信頼 +5", "1 AP", !isHere || local.heard || state.actionPoints < 1)}
        ${actionButton("village.relief", villageId, "予備穀を先に送る", "在庫 +8・信頼 +7", "1 AP / 8貨", !isHere || local.relief || state.actionPoints < 1 || state.treasury < 8)}
      </div>
    </section>`;
}

function bindInspectorActions() {
  elements.inspector.querySelectorAll("[data-policy]").forEach((button) => {
    button.addEventListener("click", () => {
      try {
        commit(enactPolicy(state, button.dataset.policy), `${POLICIES[button.dataset.policy].title}を発布しました`);
      } catch (error) {
        showToast(error.message, "warning");
      }
    });
  });
  elements.inspector.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      try {
        commit(performAction(state, button.dataset.action, button.dataset.target), "行動を年代記へ記録しました");
      } catch (error) {
        showToast(error.message, "warning");
      }
    });
  });
  elements.inspector.querySelectorAll("[data-place-type]").forEach((button) => {
    button.addEventListener("click", () => {
      view.scale = button.dataset.placeType;
      focusPlace(button.dataset.placeType, button.dataset.placeId);
    });
  });
  elements.inspector.querySelectorAll("[data-go-scale]").forEach((button) => button.addEventListener("click", () => setScale(button.dataset.goScale)));
  elements.inspector.querySelectorAll("[data-go-city]").forEach((button) => button.addEventListener("click", () => setScale("city", button.dataset.goCity)));
}

function renderInspector() {
  if (view.scale === "country") renderCountryInspector();
  else if (view.scale === "city") renderCityInspector(currentCityId());
  else renderVillageInspector(currentVillageId());
  bindInspectorActions();
}

function renderCausalChain() {
  const nodes = [
    ["原因", state.eventsTriggered.includes("north-storm") ? "白潮の時化" : "北方倉庫の損壊"],
    ["必要", `穀物 ${state.target}樽`],
    ["制度", state.policy ? POLICIES[state.policy].title : "誓約未発布"],
    ["流れ", `到着 ${formatNumber(state.delivered, 1)}樽`],
    ["記憶", state.oathDebt > 0 ? `誓債 ${state.oathDebt}件` : "保留中"],
  ];
  elements.causalChain.innerHTML = nodes.map(([label, value], index) => `${index ? '<span class="causal-arrow">→</span>' : ""}<div><small>${label}</small><strong>${value}</strong></div>`).join("");
}

function renderChronicle() {
  elements.chronicleList.innerHTML = [...state.log].reverse().slice(0, 8).map((entry) => `
    <li data-tone="${entry.tone}">
      <div class="log-day"><span>DAY</span><strong>${String(entry.day).padStart(2, "0")}</strong></div>
      <div class="log-mark"></div>
      <article><div><span>${entry.scope}</span><h3>${entry.title}</h3></div><p>${entry.text}</p></article>
    </li>`).join("");
}

function showResult() {
  const outcome = getOutcome(state);
  const metrics = deriveMetrics(state);
  elements.resultTitle.textContent = outcome.title;
  elements.resultLead.textContent = outcome.summary;
  elements.resultBody.textContent = outcome.body;
  elements.resultStats.innerHTML = `
    <div><span>北方備蓄</span><strong>${formatNumber(state.delivered, 1)} / ${state.target}</strong></div>
    <div><span>村の信頼</span><strong>${formatNumber(metrics.averageTrust)}%</strong></div>
    <div><span>生活負担</span><strong>${formatNumber(metrics.totalHardship, 1)}</strong></div>
    <div><span>誓債</span><strong>${state.oathDebt}件</strong></div>`;
  elements.resultModal.classList.remove("is-hidden");
}

function render() {
  renderHeader();
  renderMapHeading();
  buildMap();
  updateMapCamera();
  renderInspector();
  renderCausalChain();
  renderChronicle();
}

document.querySelectorAll(".scale-button").forEach((button) => button.addEventListener("click", () => setScale(button.dataset.scale)));
document.querySelector("#saveButton").addEventListener("click", () => saveState(true));
document.querySelector("#startButton").addEventListener("click", () => elements.introModal.classList.add("is-hidden"));
document.querySelector("#closeResultButton").addEventListener("click", () => elements.resultModal.classList.add("is-hidden"));
document.querySelector("#replayButton").addEventListener("click", resetGame);
document.querySelector("#resetButton").addEventListener("click", () => {
  if (window.confirm("現在の年代記を消して、最初の日からやり直しますか？")) resetGame();
});
elements.nextDayButton.addEventListener("click", () => {
  if (state.ended) {
    showResult();
    return;
  }
  try {
    const next = advanceDay(state);
    const endedNow = next.ended;
    commit(next, endedNow ? "8日目が終わり、年代記が封じられました" : "世界が一日進みました");
    if (endedNow) window.setTimeout(showResult, 450);
  } catch (error) {
    showToast(error.message, "warning");
  }
});

render();
