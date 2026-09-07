import { getV3CampaignView, performV3CampaignAction } from "./v3-campaign-system.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const terrainName = (id) => ({ grassland: "草原", plains: "平原", forest: "森林", hills: "丘陵", mountain: "山岳", desert: "砂漠", tundra: "寒原", snow: "雪原", coast: "沿岸", water: "水域" })[id] ?? "複合地形";
const duration = (minutes) => minutes >= 43200 ? `${Math.round(minutes / 43200)}か月` : minutes >= 1440 ? `${Math.round(minutes / 1440)}日` : minutes ? `${minutes}分` : "時間経過なし";

export function mountV3Campaign({ read, commit, save, render, pause, toast }) {
  const root = document.querySelector("#v3CampaignModal");
  const content = document.querySelector("#v3CampaignContent");
  const openButton = document.querySelector("#v3CampaignOpen");
  const hint = document.querySelector("#v3CampaignHint");
  const stage = document.querySelector("#v3CampaignStage");
  const result = document.querySelector("#v3CampaignResult");
  const game = document.querySelector("#v3Game");
  let returnFocus = null;
  let busy = false;
  let model = null;
  const isOpen = () => !root.hidden;
  const available = () => [...root.querySelectorAll("button:not(:disabled), summary, a[href]")].filter((el) => !el.closest("[hidden]") && el.getClientRects().length);

  function refresh() {
    const { context, state, worldSimulation } = read();
    if (!state || !context) return;
    // World simulation is large; derive the council only when the user opens it.
    hint.textContent = state.campaign?.ending ? "結末後も年代記は続く" : "仕事から世界の行方へ";
    openButton.disabled = Boolean(state.pendingEncounter);
    if (!isOpen()) return;
    model = getV3CampaignView(context, state, worldSimulation);
    stage.textContent = `${model.label} · ${worldSimulation.year}年${worldSimulation.month}月`;
    const scroll = content.scrollTop;
    const expanded = new Set([...content.querySelectorAll("details[open]")].map((el) => el.dataset.campaignSection));
    const groups = new Map();
    for (const action of model.actions) {
      if (model.campaign.lastFinalMonth != null && action.id.startsWith("path-")) continue;
      if (!groups.has(action.group)) groups.set(action.group, []);
      groups.get(action.group).push(action);
    }
    const requirements = (model.requirements ?? []).map((entry) => `<li><span>${escape(entry.label)}</span><strong>${escape(entry.current)} / ${escape(entry.target)}${entry.met ? " ✓" : ""}</strong></li>`).join("");
    const region = model.region;
    const regional = region ? `<details data-campaign-section="region" ${expanded.has("region") ? "open" : ""}><summary>${escape(region.name)}の条件</summary><p>${escape(region.nationName)} · ${escape(region.peopleName)} · ${escape(terrainName(region.terrain))}</p><p>穀物備蓄 ${escape(region.grainCoverage)}か月分 · 街道 ${escape(region.roadCondition)} · 危機圧力 ${escape(region.crisisPressure)}</p></details>` : "";
    const groupOrder = ["国家の行方", "次の行動", "月次", "財政と生活", "制度", "外交", "領土と軍事"];
    const orderedGroups = [...groups].sort(([a], [b]) => groupOrder.indexOf(a) - groupOrder.indexOf(b));
    const history = (model.chronicle ?? []).slice(0, 20).map((entry) => `<li><time>${escape(entry.period)}</time> ${escape(entry.summary)}</li>`).join("");
    content.innerHTML = `${model.ending ? `<section class="v3-campaign-ending"><h2>${escape(model.ending.label)}</h2><p>${model.ending.id === "empire" ? "リヴァイアサンへの遠征を終え、女神に統治権を委ねた。中央の制度による統治が続く。" : "諸国の自治と生息域の盟約を守り、女神への主権委任を拒んだ。合意に基づく統治が続く。"}</p><p>結末は年代記に保存されました。この世界で探索・交易・統治を続けられます。</p></section>` : ""}<section class="v3-campaign-overview"><h2>${escape(region?.name ?? model.summary)}${region?.nationName ? ` · ${escape(region.nationName)}` : ""}</h2><p class="v3-campaign-next">${escape(model.nextStep)}</p><p>所持銀貨 ${escape(state.player.gold)}${!["wanderer", "commissioned"].includes(model.stage) ? ` · 公金 ${escape(model.campaign.treasury)} · 住民支持 ${escape(model.campaign.support)} · 自治 ${escape(model.campaign.autonomy)} · 防備 ${escape(model.campaign.readiness)}` : ""}</p>${requirements ? `<ul class="v3-campaign-requirements">${requirements}</ul>` : ""}</section>${regional}${orderedGroups.map(([name, actions]) => `<details class="v3-campaign-section" data-campaign-section="${escape(name)}" ${expanded.has(name) || !["制度", "外交", "領土と軍事"].includes(name) ? "open" : ""}><summary>${escape(name)}${["制度", "外交", "領土と軍事"].includes(name) ? ` · 実行可能${actions.filter((entry) => entry.enabled).length}件` : ""}</summary><div class="v3-campaign-actions">${actions.map((action) => `<article><h3>${escape(action.label)}</h3><p>${escape(action.description)}</p>${action.consequences && action.consequences.replace(/ 制度履歴の\w+へ記録。/g, "") !== action.description ? `<p class="v3-campaign-consequence">${escape(action.consequences.replace(/ 制度履歴の\w+へ記録。/g, ""))}</p>` : ""}<small>${duration(action.elapsedMinutes)}${action.cost ? ` · ${action.currency === "treasury" ? "統治会計" : "銀貨"} ${escape(action.cost)}` : ""}</small>${!action.enabled && action.reason ? `<p class="v3-campaign-reason">${escape(action.reason)}</p>` : ""}<button type="button" data-campaign-action="${escape(action.id)}" data-campaign-target="${escape(action.targetId)}" ${!action.enabled || busy ? "disabled" : ""}>${escape(action.label)}</button></article>`).join("")}</div></details>`).join("")}${history ? `<details data-campaign-section="history" ${expanded.has("history") ? "open" : ""}><summary>これまでの判断と結果</summary><ol class="v3-campaign-history">${history}</ol></details>` : ""}`;
    content.scrollTop = scroll;
  }

  function close() {
    if (busy) return;
    root.hidden = true;
    game.inert = false;
    (returnFocus?.isConnected ? returnFocus : openButton).focus();
  }

  function open() {
    const { state } = read();
    if (!state || state.pendingEncounter) return toast("先に遭遇の判断を終えてください。");
    pause();
    returnFocus = document.activeElement;
    root.hidden = false;
    game.inert = true;
    result.textContent = "";
    refresh();
    (content.querySelector('[data-campaign-action="appointment"]:not(:disabled), [data-campaign-action="commission"]:not(:disabled), [data-campaign-action="sovereignty"]:not(:disabled), [data-campaign-action="finalize"]:not(:disabled)')
      ?? content.querySelector('[data-campaign-action="wait-month"]:not(:disabled)')
      ?? content.querySelector("button:not(:disabled)") ?? root.querySelector("[data-campaign-close]")).focus();
  }

  openButton.addEventListener("click", open);
  root.querySelector("[data-campaign-close]").addEventListener("click", close);
  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-campaign-action]");
    if (!button || button.disabled || busy) return;
    const action = model?.actions.find((entry) => entry.id === button.dataset.campaignAction && String(entry.targetId ?? "") === button.dataset.campaignTarget);
    if (!action?.enabled || (action.confirm && !window.confirm(action.confirm))) return;
    busy = true;
    result.textContent = "判断を反映しています…";
    root.setAttribute("aria-busy", "true");
    root.querySelectorAll("button").forEach((el) => { el.disabled = true; });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const { context, state, worldSimulation } = read();
      const outcome = performV3CampaignAction(context, state, action.id, { targetId: action.targetId, worldSimulation });
      const committed = commit(outcome, { source: "campaign" });
      save();
      const monthlyReport = committed.crossedMonths?.length ? read().state.campaign.ledger.at(-1) : null;
      result.textContent = action.id === "wait-month" ? read().state.messageLog?.[0] ?? "翌月へ進みました。"
        : `${outcome.message ?? `${action.label}を実行しました。`}${monthlyReport ? ` 月次収入${monthlyReport.revenue}・費用${monthlyReport.expense}。` : ""}`;
    } catch (error) {
      result.textContent = error.message ?? String(error);
    } finally {
      busy = false;
      root.removeAttribute("aria-busy");
      root.querySelector("[data-campaign-close]").disabled = false;
      render();
      const same = [...content.querySelectorAll("[data-campaign-action]")].find((el) => el.dataset.campaignAction === action.id && el.dataset.campaignTarget === String(action.targetId ?? "") && !el.disabled);
      const group = [...content.querySelectorAll('[data-campaign-section]')].find((el) => el.dataset.campaignSection === action.group);
      (same ?? group?.querySelector('button:not(:disabled)')
        ?? content.querySelector('[data-campaign-action="wait-month"]:not(:disabled)')
        ?? root.querySelector("[data-campaign-close]")).focus({ preventScroll: true });
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key !== "Tab") return;
    const controls = available();
    const first = controls[0]; const last = controls.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  return { refresh, open, close, isOpen };
}
