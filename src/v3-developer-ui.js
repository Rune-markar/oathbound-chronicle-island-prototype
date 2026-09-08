import { normalizeV3SimulationModel, V3_MODEL_PARAMETERS } from "./v3-simulation-model.js";
import { createV3VariableSnapshot, describeV3Variable, variableEntries, searchV3Variables, v3VariableReference } from "./v3-variable-catalog.js";
import { GEOPOLITICAL_PULL_SET } from "./geopolitical-world.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const number = (value) => typeof value === "number" ? Number(value.toFixed(5)).toLocaleString("ja-JP") : String(value);
const actionName = (id) => GEOPOLITICAL_PULL_SET[id]?.name ?? id;
const factorNames = { strategicBase: "状況の基礎点", survival: "生存改善", culture: "人口文化", geopolitics: "地政学", economy: "経済・利害", environment: "環境対応", cost: "費用" };
const PREFERENCE_KEY = "leviathan-v3-developer-model-v1";

export function readV3ModelPreference(storage) {
  try { return normalizeV3SimulationModel(JSON.parse(storage.getItem(PREFERENCE_KEY))); }
  catch { return normalizeV3SimulationModel(); }
}

function download(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountV3Developer({ read, applyModel, pause }) {
  const root = document.createElement("dialog");
  root.id = "v3Developer";
  root.className = "v3-developer";
  root.setAttribute("aria-labelledby", "v3DeveloperTitle");
  root.innerHTML = `<header><div class="v3-developer-heading"><div><small>DEVELOPER / V3</small><h1 id="v3DeveloperTitle">開発者システム</h1></div><button type="button" data-dev-close>閉じる</button></div><nav aria-label="開発者メニュー">${[["settings", "判断の設定"], ["variables", "変数一覧"], ["decisions", "判断履歴"], ["trials", "試行比較"]].map(([id, name]) => `<button type="button" data-dev-tab="${id}" aria-pressed="${id === "settings"}">${name}</button>`).join("")}</nav></header><p data-dev-world></p>
    <section data-dev-panel="settings"><p>通常のV3は生存条件を守れる候補から確率で選びます。比較用に従来の厳密最大化も選べます。種族・民族文化は現在の居住人口と制度・指導者から評価します。</p><form data-dev-settings><div class="v3-developer-parameters">${V3_MODEL_PARAMETERS.map((parameter) => `<label><span>${parameter.name}</span>${parameter.choices ? `<select name="${parameter.id}">${Object.entries(parameter.choices).map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select>` : `<input name="${parameter.id}" type="number" min="${parameter.min}" max="${parameter.max}" step="${parameter.step}" required>`}<small>${parameter.effect}</small></label>`).join("")}</div><p>危機時（最弱値35未満）は許容差0。開戦・停戦・同盟の実行条件とプレイヤー承認は維持されます。重みは国家判断の点数に作用し、市場や天候そのものの法則は変更しません。</p><div class="v3-developer-actions"><button type="submit" data-dev-apply>適用</button><button type="button" data-dev-defaults>標準値を入力</button></div></form><p role="status" data-dev-setting-result></p></section>
    <section data-dev-panel="variables" hidden><p>保存される人物・世界の変数、生成地理、共通ルールを読み取り専用で確認できます。項目を開くか、変数名・パスで全階層を検索してください。</p><label class="v3-developer-search">変数名・パス<input type="search" data-dev-search placeholder="例: foodSecurity / grainUnmetShare / militarism / hp"></label><div class="v3-developer-actions"><button type="button" data-dev-parent>一つ上へ</button><button type="button" data-dev-home>全分類</button><button type="button" data-dev-export>現在値と作用説明を保存</button></div><p data-dev-path></p><div data-dev-variables></div><div class="v3-developer-actions"><button type="button" data-dev-prev>前の50件</button><output data-dev-count></output><button type="button" data-dev-next>次の50件</button></div></section>
    <section data-dev-panel="decisions" hidden><p>直近24件。確率は実際の抽選に使用した値です。点数の合計・温度・生存制約から候補の確率が決まり、記録の閲覧で再抽選しません。</p><div data-dev-decisions></div></section>
    <section data-dev-panel="trials" hidden><p>現在の世界を複製し、「判断の設定」の入力値で試行番号を1ずつ変えます。通常プレイと同じ世界月次処理を使います。人物の移動・売買・統治操作は追加しません。</p><p>保存中の冒険・時計は進みません。閉じると実行中の比較を中止します。</p><form data-dev-trials><div class="v3-developer-actions"><label>試行数<input name="trials" type="number" min="1" max="32" value="8" required></label><label>各試行の月数<input name="months" type="number" min="1" max="120" value="12" required></label><button type="submit" data-dev-run>比較を実行</button><button type="button" data-dev-stop disabled>中止</button></div></form><p role="status" data-dev-progress></p><div data-dev-report></div><button type="button" data-dev-report-export hidden>結果と再現用の開始状態を保存</button></section>`;
  document.body.append(root);
  const $ = (selector) => root.querySelector(selector);
  let snapshot = null;
  let path = [];
  let offset = 0;
  let pageEntries = [];
  let total = 0;
  let worker = null;
  let request = null;
  let report = null;
  let searchTimer = null;

  function readForm() {
    return normalizeV3SimulationModel(Object.fromEntries(V3_MODEL_PARAMETERS.map((parameter) => [parameter.id,
      parameter.choices ? $(`[name="${parameter.id}"]`).value : Number($(`[name="${parameter.id}"]`).value)])));
  }
  function modeChanged() {
    const strict = $('[name="mode"]').value === "strict";
    V3_MODEL_PARAMETERS.filter((parameter) => !["mode", "trial"].includes(parameter.id)).forEach((parameter) => { $(`[name="${parameter.id}"]`).disabled = strict; });
  }
  function fill(model) {
    V3_MODEL_PARAMETERS.forEach((parameter) => { $(`[name="${parameter.id}"]`).value = model[parameter.id]; });
    modeChanged();
  }
  function stop(message = null) {
    const running = Boolean(worker);
    if (worker) { worker.terminate(); worker = null; }
    if (running || message) $('[data-dev-progress]').textContent = message ?? "比較を中止しました。保存中の冒険は変化していません。";
    $('[data-dev-run]').disabled = !read().worldSimulation;
    $('[data-dev-stop]').disabled = true;
  }
  function renderVariables() {
    const query = $('[data-dev-search]').value.trim();
    const rows = query ? searchV3Variables(snapshot, query, offset) : { entries: variableEntries(snapshot, path), total: variableEntries(snapshot, path).length };
    pageEntries = query ? rows.entries : rows.entries.slice(offset, offset + 50);
    total = rows.total;
    $('[data-dev-path]').textContent = query ? "全階層の検索: " + query : path.join(".") || "全分類";
    $('[data-dev-variables]').innerHTML = pageEntries.length ? pageEntries.map((entry, index) => {
      const definition = describeV3Variable(entry.path);
      const group = entry.value && typeof entry.value === "object";
      return `<article class="v3-developer-variable"><div>${group ? `<button type="button" data-dev-node="${index}">${escape(entry.path.at(-1))} を開く（${Object.keys(entry.value).length}項目）</button>` : `<strong>${escape(definition.name)}</strong><output>${escape(number(entry.value))}</output>`}</div><code>${escape(entry.path.join("."))}</code><p>${escape(definition.effect)}</p>${definition.source ? `<a href="./${definition.source}" target="_blank" rel="noopener">${definition.source}</a>` : `<span>未分類・説明の登録が必要</span>`}</article>`;
    }).join("") : "<p>該当する変数はありません。</p>";
    $('[data-dev-count]').textContent = total ? `${offset + 1}〜${Math.min(offset + 50, total)} / ${total}件` : "0件";
    $('[data-dev-prev]').disabled = offset === 0;
    $('[data-dev-next]').disabled = offset + 50 >= total;
    $('[data-dev-parent]').disabled = Boolean(query) || path.length === 0;
  }
  function renderDecisions() {
    const events = [...(read().worldSimulation?.generatedWorld.geopolitics?.events ?? [])].reverse().slice(0, 24);
    $('[data-dev-decisions]').innerHTML = events.length ? events.map((event) => `<details><summary>${escape(event.period)} · ${escape(event.title)}${event.selection ? event.selection.deferred ? "（承認待ちの代替行動）" : `（選択確率 ${number(event.probability * 100)}%）` : "（旧判断記録）"}</summary><p>${escape(event.selection?.rule ?? "旧方式の候補確率は診断値で、実際の選択は最弱環の最大化です。")}</p>${event.selection ? `<p>試行 ${event.selection.trial} · 抽選値 ${number(event.selection.roll)} · 温度 ${event.selection.temperature} · 最良最弱値 ${event.selection.bestValue} · 許容差 ${event.selection.regret}</p><p>自国の危機圧 ${number(event.selection.crisisPressure)} · 穀物未充足率 ${number(event.selection.grainUnmetShare)}</p>` : ""}${event.selection?.deferred ? `<p>${escape(actionName(event.selection.requestedId))}を提案し、承認まで${escape(actionName(event.selection.appliedId))}を適用。以下は提案候補の抽選内訳です。</p>` : ""}${(event.alternatives ?? []).map((option) => `<article><strong>${escape(actionName(option.id))} ${event.selection ? number(option.probability * 100) + "%" : ""}</strong><p>予測最弱値 ${option.stateReasonValue} · 費用 ${option.stateReasonCost} · 合計点 ${number(option.evaluation)}${option.excludedReason ? " · " + escape(option.excludedReason) : ""}</p><p>${Object.entries(option.factors ?? {}).map(([key, value]) => escape(factorNames[key] ?? key) + " " + number(value)).join(" / ")}</p></article>`).join("")}</details>`).join("") : "<p>世界を開始して月を進めると判断が記録されます。</p>";
  }
  function showTab(id) {
    root.scrollTop = 0;
    root.querySelectorAll('[data-dev-panel]').forEach((panel) => { panel.hidden = panel.dataset.devPanel !== id; });
    root.querySelectorAll('[data-dev-tab]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.devTab === id)));
    if (id === "variables") renderVariables();
    if (id === "decisions") renderDecisions();
  }
  function open() {
    if (root.open) return;
    pause();
    const current = read();
    const model = current.worldSimulation?.model ?? readV3ModelPreference(localStorage);
    fill(normalizeV3SimulationModel(model));
    snapshot = createV3VariableSnapshot({ ...current, model });
    path = []; offset = 0; $('[data-dev-search]').value = "";
    $('[data-dev-world]').textContent = current.worldSimulation ? `世界 ${current.worldOptions.seed} · 誓暦${current.worldSimulation.year}年${current.worldSimulation.month}月` : "開始前: 設定は新しい世界の事前史から使用します。";
    $('[data-dev-apply]').textContent = current.worldSimulation ? "この冒険の次月から適用" : "新しい世界の既定値に保存";
    $('[data-dev-setting-result]').textContent = "";
    $('[data-dev-run]').disabled = !current.worldSimulation;
    showTab("settings"); root.showModal(); root.scrollTop = 0; $('[data-dev-close]').focus();
  }
  document.querySelectorAll('[data-v3-developer]').forEach((button) => button.addEventListener("click", open));
  $('[data-dev-close]').addEventListener("click", () => root.close());
  root.addEventListener("close", () => { stop(); clearTimeout(searchTimer); snapshot = null; });
  window.addEventListener("pagehide", () => stop());
  root.addEventListener("click", (event) => {
    const tab = event.target.closest('[data-dev-tab]'); if (tab) showTab(tab.dataset.devTab);
    const node = event.target.closest('[data-dev-node]'); if (node) { path = pageEntries[Number(node.dataset.devNode)].path; offset = 0; renderVariables(); $('[data-dev-home]').focus({ preventScroll: true }); }
  });
  $('[name="mode"]').addEventListener("change", modeChanged);
  $('[data-dev-defaults]').addEventListener("click", () => { fill(normalizeV3SimulationModel()); $('[data-dev-setting-result]').textContent = "標準値を入力しました。適用するまで現在の設定は変わりません。"; });
  $('[data-dev-settings]').addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const model = readForm();
      if (read().worldSimulation) applyModel(model);
      else localStorage.setItem(PREFERENCE_KEY, JSON.stringify(model));
      snapshot = createV3VariableSnapshot({ ...read(), model });
      $('[data-dev-setting-result]').textContent = read().worldSimulation ? "保存しました。次の月から適用し、時計と過去の判断は保持します。" : "保存しました。新しい世界の事前史から適用します。";
    } catch (error) { $('[data-dev-setting-result]').textContent = "保存できませんでした: " + error.message; }
  });
  $('[data-dev-search]').addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { offset = 0; renderVariables(); }, 200); });
  $('[data-dev-parent]').addEventListener("click", () => { path = path.slice(0, -1); offset = 0; renderVariables(); });
  $('[data-dev-home]').addEventListener("click", () => { path = []; offset = 0; $('[data-dev-search]').value = ""; renderVariables(); });
  $('[data-dev-prev]').addEventListener("click", () => { offset = Math.max(0, offset - 50); renderVariables(); });
  $('[data-dev-next]').addEventListener("click", () => { offset += 50; renderVariables(); });
  $('[data-dev-export]').addEventListener("click", () => {
    download({ snapshot, reference: v3VariableReference() }, "v3-variables.json");
  });
  $('[data-dev-stop]').addEventListener("click", () => stop());
  $('[data-dev-trials]').addEventListener("submit", (event) => {
    event.preventDefault();
    if (worker || !read().worldSimulation) return;
    if (!$('[data-dev-settings]').checkValidity()) { showTab("settings"); $('[data-dev-settings]').reportValidity(); return; }
    request = { simulation: structuredClone(read().worldSimulation), model: readForm(), trials: Number($('[name="trials"]').value), months: Number($('[name="months"]').value) };
    report = null; $('[data-dev-report]').innerHTML = ""; $('[data-dev-report-export]').hidden = true;
    $('[data-dev-run]').disabled = true; $('[data-dev-stop]').disabled = false;
    $('[data-dev-progress]').textContent = "比較用の世界を準備しています…";
    try {
      worker = new Worker(new URL("./v3-simulation-worker.js", import.meta.url), { type: "module" });
      const activeWorker = worker;
      worker.onmessage = ({ data }) => {
        if (worker !== activeWorker) return;
        if (data.type === "progress") $('[data-dev-progress]').textContent = `試行 ${data.progress.trial} · ${data.progress.month}か月目（${data.progress.completed}/${data.progress.total}月）`;
        if (data.type === "error") stop("比較を実行できませんでした: " + data.message);
        if (data.type === "complete") {
          report = data.report;
          stop(`${report.trials}試行を完了。展開の識別値は${new Set(report.results.map((row) => row.fingerprint)).size}種類です。`);
          $('[data-dev-report]').innerHTML = `<p>${escape(report.seed)} · ${escape(report.startPeriod)}開始 · ${report.months}か月 · ${report.model.mode === "strict" ? "厳密最大化" : "確率選択"}</p><div class="v3-developer-table"><table><caption>国家指数は終了時の平均、最弱値は全国家の最小。戦争・危機は期間中の新規発生数。</caption><thead><tr>${["試行", "食料", "財政", "最弱値", "穀物未充足%", "戦争", "危機", "展開識別値"].map((name) => `<th>${name}</th>`).join("")}</tr></thead><tbody>${report.results.map((row) => `<tr>${[row.trial, row.food, row.treasury, row.weakest, row.grainUnmetPercent, row.warsStarted, row.crisesStarted, row.fingerprint].map((value) => `<td>${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
          $('[data-dev-report-export]').hidden = false;
        }
      };
      worker.onerror = (event) => { event.preventDefault(); if (worker !== activeWorker) return; stop("比較処理でエラーが発生しました。再実行してください。"); };
      worker.postMessage(request);
    } catch (error) { stop("比較を開始できませんでした: " + error.message); }
  });
  $('[data-dev-report-export]').addEventListener("click", () => { if (report) download({ report, request }, "v3-simulation-trials.json"); });
  if (new URLSearchParams(location.search).has("developer")) queueMicrotask(open);
  return { open, isOpen: () => root.open };
}
