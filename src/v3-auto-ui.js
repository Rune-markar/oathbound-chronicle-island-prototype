import { AUTO_MODES, AUTO_PRESETS, autoDestination, autoDistance, autoOutcomeStop, createAutoState, decideAutoAction, executeAutoAction, normalizeAutoConfig, recordAutoAction, startAutoState } from "./v3-auto-mode.js";
import { MERCHANT_COMMODITIES } from "./merchant-trade.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const labels = { idle: "待機", running: "実行中", paused: "一時停止", completed: "完了" };
const option = (id, label) => `<option value="${escape(id)}">${escape(label)}</option>`;
const select = (name, label, options) => `<label>${label}<select name="${name}" aria-label="${label}">${options}</select></label>`;
const numeric = (name, label, min, max, step = 1) => `<label>${label}<input name="${name}" type="number" min="${min}" max="${max}" step="${step}" required></label>`;
const checkbox = (name, label) => `<label class="v3-auto-check"><input name="${name}" type="checkbox">${label}</label>`;

export function mountV3AutoMode({ read, writeAuto, commit, save, render, toast }) {
  const root = document.querySelector("#v3AutoModal");
  const form = document.querySelector("#v3AutoForm");
  const bar = document.querySelector("#v3AutoBar");
  const openButton = document.querySelector("#v3AutoOpen");
  const status = document.querySelector("#v3AutoStatus");
  const progress = document.querySelector("#v3AutoProgress");
  const toggle = document.querySelector("#v3AutoToggle");
  let timer = null; let cache = {}; let returnFocus = null;

  const modalOpen = () => !root.hidden;
  function refresh() {
    const { state } = read();
    if (!state?.autoMode) return;
    const auto = state.autoMode;
    bar.hidden = auto.status === "idle";
    status.textContent = `${AUTO_MODES[auto.config.mode]} · ${labels[auto.status]} — ${auto.reason}`;
    const elapsed = Math.max(0, state.clock.elapsedMinutes - auto.startMinutes);
    const earnings = Math.round((state.player.gold - auto.startGold) * 10) / 10;
    progress.textContent = `${auto.steps}歩 · ${Math.floor(elapsed / 60)}時間${Math.floor(elapsed % 60)}分 · 銀貨増減 ${earnings >= 0 ? "+" : ""}${earnings}${auto.config.mode === "observe" ? ` · ${auto.months}/${auto.config.months}か月` : ""}`;
    toggle.textContent = auto.status === "running" ? "一時停止" : "再開";
    toggle.hidden = !["running", "paused"].includes(auto.status);
    openButton.setAttribute("aria-pressed", String(auto.status === "running"));
  }

  function persist() {
    try { save(); return true; }
    catch {
      clearTimeout(timer);
      const { state } = read();
      if (state?.autoMode) writeAuto({ ...state.autoMode, status: "paused", reason: "保存できませんでした。端末の空き容量を確認してください。" });
      refresh(); toast("保存できなかったため、自動モードを停止しました。");
      return false;
    }
  }

  function pause(reason = "操作を再開したため一時停止しました。", completed = false) {
    clearTimeout(timer); timer = null;
    const { state } = read();
    if (state?.autoMode?.status !== "running") return;
    writeAuto({ ...state.autoMode, status: completed ? "completed" : "paused", reason, log: [reason, ...state.autoMode.log].slice(0, 20) });
    refresh(); persist();
  }

  function schedule() {
    clearTimeout(timer);
    const { state } = read();
    if (state?.autoMode?.status === "running") timer = setTimeout(tick, 900 / state.autoMode.config.speed);
  }

  function tick() {
    const { state: before, context, worldSimulation: previousWorld } = read();
    if (before?.autoMode?.status !== "running") return;
    if (document.hidden || modalOpen()) return pause("画面を離れたため一時停止しました。");
    try {
      const decision = decideAutoAction(context, before, previousWorld, cache);
      if (decision.kind === "stop") return pause(decision.reason, decision.completed);
      const action = executeAutoAction(context, before, previousWorld, decision);
      commit(action, { source: "auto-mode", event: { type: "auto.action.executed", source: "auto-mode", visibility: "private", summary: decision.reason, payload: { kind: decision.kind } } });
      const { state: after, worldSimulation } = read();
      writeAuto(recordAutoAction(before.autoMode, before, after, decision));
      const reason = autoOutcomeStop(before, read().state, decision, previousWorld, worldSimulation);
      if (reason) pause(reason);
      render(); refresh();
      if (!persist()) return;
      schedule();
    } catch (error) {
      pause(error.message || "行動を実行できませんでした。");
      render(); refresh();
    }
  }

  function readForm() {
    const values = Object.fromEntries(new FormData(form));
    for (const name of ["autoHeal", "stopWar", "stopCrisis"]) values[name] = form.elements[name].checked;
    return normalizeAutoConfig(values);
  }

  function fill(config) {
    for (const [name, value] of Object.entries(config)) {
      const input = form.elements[name];
      if (!input) continue;
      if (input.type === "checkbox") input.checked = value;
      else input.value = value;
    }
    updateFields();
  }

  function updateFields() {
    const mode = form.elements.mode.value;
    for (const group of form.querySelectorAll("[data-auto-modes]")) {
      const active = group.dataset.autoModes.split(" ").includes(mode);
      group.hidden = !active;
      // Hidden values remain in the form for switching modes; validation is mode-specific.
      group.querySelectorAll("input").forEach((input) => { input.required = active && input.type === "number"; });
    }
    document.querySelector("#v3AutoHint").textContent = {
      explore: "見えている周辺を一歩ずつ探索します。",
      travel: "世界地図の集落または受諾済み軍務の作戦地点へ歩きます。",
      trade: "相場を記録した二市場を往復します。商品は1個ずつ価格を確認して売買します。",
      observe: "主人公は移動せず、世界・商会・組織を1か月ずつ進めます。",
    }[mode];
  }

  function open() {
    pause("設定を開いたため一時停止しました。");
    const { state, context } = read();
    if (!state) return;
    returnFocus = document.activeElement;
    const settlements = [...context.settlements].sort((a, b) => autoDistance(context, state.player, { x: a.detailX, y: a.detailY }) - autoDistance(context, state.player, { x: b.detailX, y: b.detailY }));
    const destinations = option("", "目的地を選択") + (state.military?.activeMission ? option("mission", "受諾済み軍務の作戦地点") : "") + settlements.map((s) => option(s.id, `${s.name} · 約${autoDistance(context, state.player, { x: s.detailX, y: s.detailY })}歩`)).join("");
    const known = state.merchant?.trade?.knownSettlements ?? [];
    const markets = option("", known.length < 2 ? "交易・商会で二市場の相場を記録" : "市場を選択") + known.map((s) => option(s.id, s.name)).join("");
    form.innerHTML = `
      <div class="v3-auto-grid">
        ${select("mode", "行動", Object.entries(AUTO_MODES).map(([id, label]) => option(id, label)).join(""))}
        ${select("preset", "大まかな方針", Object.entries(AUTO_PRESETS).map(([id, p]) => option(id, p.name)).join(""))}
      </div>
      <p id="v3AutoHint"></p>
      <div class="v3-auto-grid" data-auto-modes="travel">${select("destination", "目的地", destinations)}</div>
      <div class="v3-auto-grid" data-auto-modes="trade">
        ${select("source", "仕入市場", markets)}${select("market", "販売市場", markets)}
        ${select("commodity", "商品", Object.values(MERCHANT_COMMODITIES).map((c) => option(c.id, c.name)).join(""))}
        ${numeric("laps", "往復回数", 1, 20)}
      </div>
      <div class="v3-auto-grid" data-auto-modes="observe">${numeric("months", "観測する月数", 1, 120)}</div>
      <details><summary>オプション · 細かい設定</summary>
        <fieldset><legend>体力・遭遇</legend><div class="v3-auto-grid">
          ${numeric("stopHp", "HPがこの割合以下なら停止（%）", 10, 90)}
          ${numeric("healHp", "回復品を使うHPの割合（%）", 10, 95)}
          ${checkbox("autoHeal", "所持している回復品を自動使用")}
          ${select("enemy", "敵に遭遇したとき", option("stop", "停止して自分で判断") + option("flee", "退避して停止（試行は最大2回）") + option("fight", "同レベル以下なら攻撃"))}
          ${select("npc", "人物に出会ったとき", option("stop", "停止して自分で判断") + option("talk", "話して進む") + option("leave", "別れて進む"))}
        </div><p>回復品がなければHP条件で停止。同レベル以下でも反撃や敗北があります。軍務の集団戦と組織・商会の判断では停止します。</p></fieldset>
        <fieldset data-auto-modes="explore travel trade"><legend>移動・実行上限</legend><div class="v3-auto-grid">
          ${select("route", "経路の方針", option("roads", "街道を優先") + option("short", "距離を優先"))}
          ${numeric("maxSteps", "最大歩数", 1, 10000)}${numeric("maxHours", "最大ゲーム内時間（時間）", 1, 720)}
        </div></fieldset>
        <fieldset data-auto-modes="trade"><legend>売買条件</legend><div class="v3-auto-grid">
          ${numeric("quantity", "1往復で仕入れる個数", 1, 12)}${numeric("buyPrice", "1個の仕入上限（銀貨）", 0.1, 9999, 0.1)}
          ${numeric("sellPrice", "1個の売却下限（銀貨）", 0.1, 9999, 0.1)}${numeric("reserveGold", "手元に残す銀貨", 0, 999999, 0.1)}
          ${numeric("budget", "今回の仕入総予算（銀貨）", 0.1, 999999, 0.1)}
        </div><p>価格・予算・在庫・積載条件を満たさなくなった時点で停止します。収支は価格変動で変わります。</p></fieldset>
        <fieldset><legend>速度・世界の変化</legend><div class="v3-auto-grid">
          ${select("speed", "実行速度", option(1, "ゆっくり · 1倍") + option(2, "通常 · 2倍") + option(4, "速い · 4倍"))}
          ${checkbox("stopWar", "新しい戦争が始まったら停止")}${checkbox("stopCrisis", "新しい外部危機が発生したら停止")}
        </div></fieldset>
      </details>
      <p class="v3-auto-note">手動操作・画面を離れる・再読込で一時停止します。再開は自分で選べます。</p>
      <p id="v3AutoError" role="alert"></p>
      <footer><button type="submit" name="submitAction" value="save">設定を保存</button><button class="is-primary" type="submit" name="submitAction" value="start">この設定で開始</button></footer>
      ${state.autoMode.log.length ? `<details><summary>直近の実行記録</summary><ol class="v3-auto-log">${state.autoMode.log.map((line) => `<li>${escape(line)}</li>`).join("")}</ol></details>` : ""}`;
    root.hidden = false;
    fill(state.autoMode.config);
    document.querySelector("#v3Game").inert = true;
    form.elements.mode.focus();
  }

  function close() {
    root.hidden = true; document.querySelector("#v3Game").inert = false;
    (returnFocus?.isConnected ? returnFocus : openButton).focus();
  }

  function validate(config) {
    const { state, context } = read();
    if (config.mode === "travel" && !autoDestination(context, state, config.destination)) return "目的地を選んでください。";
    if (config.mode === "trade") {
      const known = new Set(state.merchant?.trade?.knownSettlements?.map((s) => s.id));
      if (!known.has(config.source) || !known.has(config.market) || config.source === config.market) return "相場を記録した異なる二市場を選んでください。";
    }
    return null;
  }

  form.addEventListener("change", (event) => {
    if (event.target.name === "preset") {
      const config = { ...readForm(), ...AUTO_PRESETS[event.target.value], preset: event.target.value };
      fill(config);
    } else updateFields();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const config = readForm();
    const start = event.submitter?.value === "start";
    const error = start ? validate(config) : null;
    if (error) { document.querySelector("#v3AutoError").textContent = error; return; }
    const { state } = read();
    cache = {};
    writeAuto(start ? startAutoState(state, config) : createAutoState(config));
    refresh();
    if (!persist()) return;
    close();
    if (start) schedule(); else toast("自動モードの設定を保存しました。");
  });
  root.addEventListener("click", (event) => { if (event.target === root || event.target.closest("[data-auto-close]")) close(); });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === "Tab") {
      const focusable = [...root.querySelectorAll("button, input, select, summary")].filter((el) => !el.disabled && el.getClientRects().length);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  openButton.addEventListener("click", open);
  toggle.addEventListener("click", () => {
    const { state } = read();
    if (state.autoMode.status === "running") pause("一時停止しました。");
    else {
      cache = {};
      writeAuto({ ...state.autoMode, status: "running", reason: "再開します。" });
      refresh(); if (persist()) schedule();
    }
  });
  document.querySelector("#v3AutoCancel").addEventListener("click", () => {
    pause("自動モードを終了しました。");
    const { state } = read();
    writeAuto({ ...state.autoMode, status: "completed", reason: "自動モードを終了しました。" }); refresh(); persist();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("#v3AutoModal, #v3AutoBar, #v3AutoOpen")) pause();
  }, true);
  document.addEventListener("keydown", (event) => {
    const movement = /^(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|[wasdWASD])$/.test(event.key) && !event.target.closest("#v3AutoModal");
    if (movement || !event.target.closest("#v3AutoModal, #v3AutoBar, #v3AutoOpen") || event.key === "Escape") pause();
  }, true);
  // Click interception also covers keyboard and assistive-technology activation.
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#v3AutoModal, #v3AutoBar, #v3AutoOpen")) pause();
  }, true);
  return { refresh, pause, open, close, isOpen: modalOpen };
}
