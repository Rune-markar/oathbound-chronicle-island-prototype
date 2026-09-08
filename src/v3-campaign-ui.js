import { getV3CampaignView, performV3CampaignAction } from "./v3-campaign-system.js";
import { campaignDirection, campaignDistance } from "./v3-campaign-journey.js";
import { getV3CurrentMarket } from "./v3-merchant-system.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const icon = (name, large = false) => `<svg class="${large ? "v3-council-emblem" : "v3-ui-icon"}" aria-hidden="true"><use href="./assets/ui/v3-ui-icons.svg#icon-${name}"></use></svg>`;
const duration = (minutes) => minutes >= 43200 ? `${Math.round(minutes / 43200)}か月` : minutes >= 1440 ? `${Math.round(minutes / 1440)}日` : `${minutes}分`;
const signed = (value) => `${value > 0 ? "+" : ""}${value}`;
const STAT_ICONS = { gold: "coin", treasury: "treasury", support: "support", autonomy: "autonomy", readiness: "shield" };
const ACTION_ICONS = { "local-work": "quest", commission: "charter", appointment: "crown", "restore-office": "crown", "wait-month": "calendar", contribute: "coin", "public-work": "road", relief: "grain", council: "council", drill: "shield", sovereignty: "autonomy", "path-empire": "crown", "path-federation": "diplomacy" };
const POLICY_DOMAINS = { government: "統治", economy: "経済", culture: "文化", security: "防衛" };
const policyGroup = (policy) => `${policy.path === "federation" ? "自治連邦" : "中央集権"} · ${POLICY_DOMAINS[policy.domain]}`;
const TABS = [
  { id: "journey", label: "歩み", icon: "quest" }, { id: "living", label: "暮らし", icon: "grain" },
  { id: "institutions", label: "制度", icon: "council" }, { id: "diplomacy", label: "外交", icon: "diplomacy" },
  { id: "territory", label: "領土", icon: "map" }, { id: "history", label: "記録", icon: "charter" },
];

export function mountV3Campaign({ read, commit, save, render, pause, toast, navigate }) {
  const root = document.querySelector("#v3CampaignModal"), content = document.querySelector("#v3CampaignContent");
  const openButton = document.querySelector("#v3CampaignOpen"), hint = document.querySelector("#v3CampaignHint");
  const stage = document.querySelector("#v3CampaignStage"), result = document.querySelector("#v3CampaignResult");
  const stats = document.querySelector("#v3CampaignStats"), tabs = document.querySelector("#v3CampaignTabs"), game = document.querySelector("#v3Game");
  let returnFocus = null, busy = false, model = null, activeTab = "journey", selectedNation = null, countryFilter = "all";
  const isOpen = () => !root.hidden;
  const available = () => [...root.querySelectorAll("button:not(:disabled), summary, select, a[href], [tabindex='0']")].filter((el) => !el.closest("[hidden]") && el.tabIndex !== -1 && el.getClientRects().length);

  function actionCard(action) {
    const policy = action.id.startsWith("institution:") ? model.institutions.find((p) => p.id === action.id.slice(12)) : null;
    const verb = policy ? "この制度を採用" : action.id === "finalize" ? "この判断を伝える" : action.id === "treaty" ? "この条件で合意" : action.id.startsWith("offer:") ? "この案を伝える" : "実行する";
    return `<article class="v3-action-card ${action.id === "finalize" ? "is-final-choice" : ""}"><h3>${icon(action.icon ?? policy?.icon ?? ACTION_ICONS[action.id] ?? "charter")}<span>${escape(action.label)}</span></h3>${policy ? `<small class="v3-policy-category">${escape(policyGroup(policy))}</small>` : ""}<p>${escape(action.description)}</p>${action.consequences && action.consequences !== action.description && !policy ? `<p class="v3-campaign-consequence">${escape(action.consequences)}</p>` : ""}<div class="v3-action-cost">${icon("calendar")}<span>${duration(action.elapsedMinutes)}</span>${action.cost ? `${icon(action.currency === "gold" ? "coin" : "treasury")}<span>${action.currency === "gold" ? "銀貨" : "公金"} ${escape(action.cost)}</span>` : ""}</div>${!action.enabled ? `<p class="v3-campaign-reason">${escape(action.reason)}</p>` : ""}<button type="button" data-campaign-action="${escape(action.id)}" data-campaign-target="${escape(action.targetId)}" aria-label="${escape(action.label)}" ${!action.enabled || busy ? "disabled" : ""}>${verb}</button></article>`;
  }
  const cards = (actions) => `<div class="v3-campaign-actions">${actions.map(actionCard).join("")}</div>`;
  function monthControl() {
    const action = model.actions.find((entry) => entry.id === "wait-month");
    return action ? `<div class="v3-council-month"><span>${icon("calendar")}世界と暮らしを進める</span><button type="button" data-campaign-action="wait-month" data-campaign-target="" ${busy ? "disabled" : ""}>翌月の評議会まで進める</button></div>` : "";
  }
  function guidance(context, state) {
    const campaign = model.campaign;
    const market = getV3CurrentMarket(context, state);
    let target = null, destination = "", label = "";
    if (model.stage === "commissioned" && !campaign.survey?.complete) { target = campaign.survey; destination = "commission"; label = "見回り地点への移動を準備"; }
    else if (model.stage === "commissioned" && market?.regionId !== campaign.regionId) { const home = context.settlementById.get(campaign.homeMarketId); if (home) { target = { x: home.detailX, y: home.detailY }; destination = home.id; label = `${home.name}へ報告に戻る`; } }
    else if (model.stage === "wanderer" && !market) { const nearest = [...context.settlements].sort((a, b) => campaignDistance(context, state.player, { x: a.detailX, y: a.detailY }) - campaignDistance(context, state.player, { x: b.detailX, y: b.detailY }))[0]; if (nearest) { target = { x: nearest.detailX, y: nearest.detailY }; destination = nearest.id; label = `${nearest.name}への移動を準備`; } }
    return target && campaignDistance(context, state.player, target) > (destination === "commission" ? 1 : 0) ? `<aside class="v3-campaign-guidance">${icon("map")}<div><strong>${escape(label)}</strong><p>${escape(campaignDirection(context, state.player, target))}マスの方向。移動中の遭遇では自分で判断できます。</p><button type="button" data-campaign-travel="${escape(destination)}">移動の設定を開く</button></div></aside>` : "";
  }
  function requirements() {
    return `<ul class="v3-campaign-requirements">${model.requirements.map((entry) => `<li><span>${entry.met ? icon("check") : icon("quest")}${escape(entry.label.replace("制度履歴", "制度"))}</span><strong>${escape(entry.current)} / ${escape(entry.target)}</strong></li>`).join("")}</ul>`;
  }
  function aftermath() {
    const campaign = model.campaign, snapshot = campaign.endingSnapshot;
    return `<section class="v3-campaign-ending">${icon(campaign.ending === "federation" ? "covenant" : "crown", true)}<div><small>${escape(snapshot?.period ?? "")} · 年代記に刻まれた結末</small><h2>${escape(model.ending.label)}</h2><p>${escape(snapshot?.regionName ?? model.region.name)}から始まった歩み。${snapshot?.members?.length ? `${escape(snapshot.members.join("、"))}と交わした約束が残っています。` : "地方の人々と結んだ約束が残っています。"}</p></div><ol>${campaign.finalChoices.map((choice) => `<li><strong>${escape(choice.label)}</strong><p>${escape(choice.description)}</p></li>`).join("")}</ol><p>同じ世界で探索・交易・統治を続けられます。約束した制度と費用は、これからの暮らしにも作用します。</p></section>`;
  }
  function journey(context, state) {
    const order = ["wanderer", "commissioned", "governor", "sovereign", "ending"], labels = ["旅人", "委託", "総督", "自治国", "結末"];
    const step = order.indexOf(model.stage);
    const progress = `<ol class="v3-campaign-progress" aria-label="人物史の進行">${labels.map((label, index) => `<li class="${index <= step ? "is-reached" : ""}" ${index === step ? 'aria-current="step"' : ""}>${icon(index < step ? "check" : ["quest", "charter", "crown", "autonomy", "covenant"][index])}<span>${label}</span></li>`).join("")}</ol>`;
    const sceneReady = model.scene && (model.campaign.finalStep > 0 || model.requirements.every((entry) => entry.met));
    const scene = sceneReady ? `<section class="v3-final-council">${icon(model.scene.icon, true)}<div><small>${escape(model.scene.speaker)}</small><h2>${escape(model.scene.title)}</h2><blockquote>${escape(model.scene.text)}</blockquote></div></section>${cards(model.actions.filter((entry) => entry.id === "finalize"))}` : "";
    const alerts = model.agreementAlerts.length ? `<aside class="v3-campaign-guidance"><div><strong>${icon("warning")}加盟合意を確認する国</strong>${model.agreementAlerts.map((nation) => `<p>${escape(nation.name)}：${escape(nation.suspensionReasons.join("。"))}</p><button type="button" data-campaign-country="${escape(nation.id)}">${escape(nation.name)}の協議を開く</button>`).join("")}</div></aside>` : "";
    const primary = model.actions.filter((entry) => ["次の行動", "地域の依頼", "国家の行方"].includes(entry.group) && entry.id !== "finalize" && !(model.campaign.finalStep > 0 && entry.group === "国家の行方"));
    return `${model.ending ? aftermath() : progress}${sceneReady ? scene : ""}${sceneReady ? '<details><summary>成立条件と地方を見る</summary>' : ""}<section class="v3-campaign-overview"><h2>${escape(model.region.name)}<small>${escape(model.region.nationName)}</small></h2><p class="v3-campaign-next">${escape(model.nextStep)}</p>${requirements()}</section>${sceneReady ? "</details>" : ""}${alerts}${guidance(context, state)}${cards(primary)}${model.stage === "governor" ? `<div class="v3-campaign-shortcuts"><button type="button" data-campaign-tab="living">${icon("grain")}暮らしの対策を選ぶ</button><button type="button" data-campaign-tab="institutions">${icon("council")}制度を整える</button></div>` : ""}${model.stage === "sovereign" && !sceneReady ? `<div class="v3-campaign-shortcuts"><button type="button" data-campaign-tab="institutions">${icon("council")}制度を整える</button><button type="button" data-campaign-tab="diplomacy">${icon("diplomacy")}諸国と交渉する</button></div>` : ""}${monthControl()}`;
  }
  function diplomacy() {
    const selected = model.diplomacy.find((nation) => nation.id === selectedNation);
    if (selected) return `<button type="button" class="v3-country-back" data-campaign-country="">${icon("chevron-left")}国の一覧へ戻る</button><section class="v3-country-detail"><h2>${icon(selected.need.icon)}${escape(selected.name)}</h2><div class="v3-country-status"><span>信頼 ${escape(selected.trust)} / ${selected.threshold}</span><span>${selected.consent ? (selected.willing ? "加盟合意あり" : "合意を休止") : selected.willing ? "合意できる" : "協議中"}</span></div>${selected.consent && !selected.willing ? `<p class="v3-campaign-reason">休止の理由：${escape(selected.suspensionReasons.join("。"))}</p>` : ""}<strong>求めていること · ${escape(selected.need.label)}</strong><blockquote>${escape(selected.need.voice)}</blockquote><div class="v3-country-factors">${selected.factors.map((factor) => `<span>${escape(factor)}</span>`).join("")}</div>${selected.offer ? `<p class="v3-campaign-consequence">${icon("charter")}提示中の条件：${escape(selected.offer.label)}${selected.offer.upkeep ? ` · 加盟後の負担は毎月${selected.offer.upkeep}` : ""}</p>` : ""}</section>${cards(model.actions.filter((action) => action.group === "外交" && action.targetId === selected.id))}${monthControl()}`;
    const nations = model.diplomacy.filter((nation) => countryFilter === "all" || (countryFilter === "ready" ? nation.willing && !nation.consent : countryFilter === "members" ? nation.consent : !nation.consent));
    nations.sort((a, b) => Number(b.willing && !b.consent) - Number(a.willing && !a.consent) || Number(a.consent) - Number(b.consent) || a.name.localeCompare(b.name, "ja"));
    return `<header class="v3-country-list-header"><h2>${icon("diplomacy")}諸国との協議</h2><label>表示<select id="v3CountryFilter"><option value="all" ${countryFilter === "all" ? "selected" : ""}>すべての国</option><option value="pending" ${countryFilter === "pending" ? "selected" : ""}>未加盟の国</option><option value="ready" ${countryFilter === "ready" ? "selected" : ""}>合意できる国</option><option value="members" ${countryFilter === "members" ? "selected" : ""}>加盟済みの国</option></select></label></header><p>相手の要求と信頼を比べ、交渉する国を選びます。</p><div class="v3-country-list">${nations.map((nation) => `<button type="button" data-campaign-country="${escape(nation.id)}" aria-label="${escape(nation.name)}の交渉を開く">${icon(nation.need.icon)}<span><strong>${escape(nation.name)}</strong><small>${escape(nation.need.label)}${nation.atWar ? " · 交戦中" : ""}</small></span><span class="v3-country-score">${nation.trust}/${nation.threshold}<small>${nation.consent ? (nation.willing ? "加盟済み" : "合意休止") : nation.willing ? "合意可能" : "信頼"}</small></span>${icon("chevron-right")}</button>`).join("") || "<p>この条件に当てはまる国はありません。</p>"}</div>${monthControl()}`;
  }
  function institutionOptions() {
    const actions = model.actions.filter((action) => action.group === "制度");
    const route = model.campaign.route;
    if (!route) return cards(actions);
    const matches = (action) => model.institutions.find((policy) => action.id === `institution:${policy.id}`)?.path === route;
    const other = actions.filter((action) => !matches(action));
    return `${cards(actions.filter(matches))}${other.length ? `<details><summary>別の体制の制度も検討する · ${other.length}案</summary>${cards(other)}</details>` : ""}`;
  }
  function page(context, state, worldSimulation) {
    if (activeTab === "journey") return journey(context, state);
    if (activeTab === "diplomacy") return diplomacy();
    if (activeTab === "living") {
      const report = model.campaign.ledger.at(-1);
      const civic = worldSimulation?.civicState?.regions?.[model.campaign.regionId];
      return `<section class="v3-regional-life"><h2>${icon("grain")}${escape(model.region.name)}の暮らし</h2><div class="v3-country-factors"><span>${icon("grain")}穀物 ${model.region.grainCoverage}か月</span><span>${icon("road")}街道 ${model.region.roadCondition}</span><span>${icon("warning")}危機 ${model.region.crisisPressure}</span>${civic ? `<span>${icon("habitat")}生息環境 ${Math.round(civic.habitatHealth)}</span>` : ""}</div>${report ? `<details><summary>直近の決算と原因を見る</summary><p>収入${report.revenue}・費用${report.expense}・公金${report.treasury}</p><ul>${(report.causes ?? []).map((cause) => `<li>${escape(cause)}</li>`).join("")}</ul></details>` : ""}</section>${cards(model.actions.filter((action) => action.group === "財政と生活"))}${monthControl()}`;
    }
    if (activeTab === "institutions") return `<h2>${icon("council")}どんな国にするか</h2><p>連邦は8案から6制度・4分野を選びます。制度ごとに費用と暮らしへの作用が異なります。</p>${model.campaign.institutions.length ? `<details><summary>採用中の制度 · ${model.campaign.institutions.length}件</summary><ul class="v3-adopted-policies">${model.institutions.filter((p) => model.campaign.institutions.includes(p.id)).map((policy) => `<li>${icon(policy.icon)}<div><strong>${escape(policy.label)}</strong><p>${escape(policy.description)}</p></div></li>`).join("")}</ul></details>` : ""}${institutionOptions()}${monthControl()}`;
    if (activeTab === "territory") return `<h2>${icon("map")}国境と領土</h2><p>移管は領有国の条件を満たす合意が必要です。軍事行動は、相手の防衛と主権に応じて失敗することがあります。</p>${cards(model.actions.filter((action) => action.group === "領土と軍事"))}${monthControl()}`;
    return `<h2>${icon("charter")}判断と、その後</h2><ol class="v3-campaign-history">${model.chronicle.map((entry) => `<li><time>${escape(entry.period)}</time><p>${escape(entry.summary)}</p></li>`).join("") || "<li>歩みはここに記録されます。</li>"}</ol>`;
  }
  function refresh() {
    const { context, state, worldSimulation } = read();
    if (!state || !context) return;
    hint.textContent = state.campaign?.stage === "commissioned" && !state.campaign.survey?.complete ? `見回り地点 · ${campaignDirection(context, state.player, state.campaign.survey)}` : state.campaign?.ending ? "結末後も年代記は続く" : "暮らしと世界の行方を選ぶ";
    openButton.disabled = Boolean(state.pendingEncounter);
    if (!isOpen()) return;
    model = getV3CampaignView(context, state, worldSimulation);
    const governed = !["wanderer", "commissioned"].includes(model.stage), sovereign = ["sovereign", "ending"].includes(model.stage);
    const visibleTabs = TABS.filter((tab) => !["living", "institutions"].includes(tab.id) || governed).filter((tab) => !["diplomacy", "territory"].includes(tab.id) || sovereign);
    if (!visibleTabs.some((tab) => tab.id === activeTab)) activeTab = "journey";
    stage.textContent = `${model.label} · ${worldSimulation.year}年${worldSimulation.month}月`;
    const statRows = [{ key: "gold", name: "銀貨", value: state.player.gold }, ...(governed ? [{ key: "treasury", name: "公金", value: model.campaign.treasury }, { key: "support", name: "支持", value: model.campaign.support }, { key: "autonomy", name: "自治", value: model.campaign.autonomy }, { key: "readiness", name: "防備", value: model.campaign.readiness }] : [])];
    stats.innerHTML = statRows.map((entry) => `<div>${icon(STAT_ICONS[entry.key])}<span>${entry.name}<strong>${escape(entry.value)}</strong></span></div>`).join("");
    tabs.innerHTML = visibleTabs.map((tab) => `<button type="button" id="v3CampaignTab-${tab.id}" role="tab" aria-selected="${tab.id === activeTab}" aria-controls="v3CampaignContent" tabindex="${tab.id === activeTab ? "0" : "-1"}" data-campaign-tab="${tab.id}">${icon(tab.icon)}${tab.label}</button>`).join("");
    content.setAttribute("aria-labelledby", `v3CampaignTab-${activeTab}`);
    const scroll = content.scrollTop;
    content.innerHTML = page(context, state, worldSimulation);
    content.scrollTop = scroll;
  }
  function switchTab(id) {
    activeTab = id; refresh(); content.scrollTop = 0;
    tabs.querySelector(`[data-campaign-tab="${id}"]`)?.focus();
  }
  function close() { if (busy) return; root.hidden = true; game.inert = false; (returnFocus?.isConnected ? returnFocus : openButton).focus(); }
  function open() {
    const { state } = read();
    if (!state || state.pendingEncounter) return toast("先に遭遇の判断を終えてください。");
    pause(); returnFocus = document.activeElement; root.hidden = false; game.inert = true; result.textContent = "";
    refresh(); tabs.querySelector('[aria-selected="true"]')?.focus();
  }
  openButton.addEventListener("click", open);
  root.querySelector("[data-campaign-close]").addEventListener("click", close);
  root.addEventListener("change", (event) => { if (!busy && event.target.id === "v3CountryFilter") { countryFilter = event.target.value; selectedNation = null; refresh(); content.querySelector("#v3CountryFilter")?.focus(); } });
  root.addEventListener("click", async (event) => {
    if (busy) return;
    const tab = event.target.closest("[data-campaign-tab]"); if (tab) return switchTab(tab.dataset.campaignTab);
    const country = event.target.closest("[data-campaign-country]"); if (country) { selectedNation = country.dataset.campaignCountry || null; activeTab = "diplomacy"; refresh(); content.scrollTop = 0; (content.querySelector(".v3-country-back") ?? content.querySelector("#v3CountryFilter"))?.focus(); return; }
    const travel = event.target.closest("[data-campaign-travel]"); if (travel) { close(); navigate?.(travel.dataset.campaignTravel); return; }
    const button = event.target.closest("[data-campaign-action]");
    if (!button || button.disabled) return;
    const action = model.actions.find((entry) => entry.id === button.dataset.campaignAction && String(entry.targetId ?? "") === button.dataset.campaignTarget);
    if (!action?.enabled || (action.confirm && !window.confirm(action.confirm))) return;
    busy = true; result.textContent = "判断を反映しています…"; root.setAttribute("aria-busy", "true");
    root.querySelectorAll("button, select").forEach((el) => { el.disabled = true; });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const previousStage = model.stage;
    try {
      const { context, state, worldSimulation } = read();
      const outcome = performV3CampaignAction(context, state, action.id, { targetId: action.targetId, worldSimulation });
      const committed = commit(outcome, { source: "campaign" }); save();
      const report = action.id === "wait-month" ? read().state.campaign.lastReport : outcome.state.campaign.lastReport;
      const monthly = committed.crossedMonths?.length && action.id !== "wait-month" ? read().state.campaign.ledger.at(-1) : null;
      result.innerHTML = `<strong>${icon("check")}${escape(report?.title ?? action.label)}</strong><div class="v3-result-deltas">${(report?.changes ?? []).map((change) => `<span>${icon(STAT_ICONS[change.key] ?? "charter")}${escape(change.label)} ${signed(change.delta)}</span>`).join("")}</div>${report?.causes?.[0] ? `<p class="v3-result-cause">${escape(report.causes[0])}</p>` : ""}<details><summary>結果と理由を見る${monthly ? " · 月次決算あり" : ""}</summary><p>${escape(report?.summary ?? outcome.message)}</p>${monthly ? `<p>${escape(monthly.summary)}</p>` : ""}</details>`;
      if (previousStage !== read().state.campaign.stage) activeTab = "journey";
    } catch (error) { result.textContent = error.message ?? String(error); }
    finally {
      busy = false; root.removeAttribute("aria-busy"); root.querySelector("[data-campaign-close]").disabled = false; render();
      const nextCouncil = action.id === "finalize" || (action.id === "wait-month" && read().state.campaign.finalStep > 0 && !read().state.campaign.ending);
      if (nextCouncil) content.scrollTop = 0;
      const same = nextCouncil ? null : [...content.querySelectorAll("[data-campaign-action]")].find((el) => el.dataset.campaignAction === action.id && el.dataset.campaignTarget === String(action.targetId ?? "") && !el.disabled);
      (same ?? tabs.querySelector('[aria-selected="true"]') ?? root.querySelector("[data-campaign-close]")).focus({ preventScroll: true });
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (!busy && event.target.getAttribute("role") === "tab" && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault(); const all = [...tabs.querySelectorAll("[role=tab]")], current = all.indexOf(event.target);
      const index = event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
      switchTab(all[index].dataset.campaignTab);
    }
    if (event.key !== "Tab") return;
    const controls = available(), first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  return { refresh, open, close, isOpen };
}
