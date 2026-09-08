import { V3_SCENES, getV3Scene, getV3AdventureObjective, getV3FieldPoints, describeV3FieldPoint, getV3KnownRoute, pointKey, snapshotV3Adventure, getV3AdventureFeedback } from "./v3-adventure-presentation.js";
import { getV3EntityArt, getV3PlayerArt, getV3LandmarkArt } from "./v3-art.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const icon = (name) => `<svg class="v3-ui-icon" aria-hidden="true"><use href="./assets/ui/v3-ui-icons.svg#icon-${name}"></use></svg>`;
const directions = { north: "北", east: "東", south: "南", west: "西" };
const art = (entry, className = "") => entry ? `<i class="v3-atlas-art is-${entry.atlas}-atlas ${className}" style="--v3-art-position:${entry.position}" aria-hidden="true"></i>` : "";
// Keep controls mounted across background generation and preserve keyboard focus.
const markup = (element, html) => { if (element.innerHTML !== html) element.innerHTML = html; };

export function mountV3Adventure({ read, move, campaign, travel, action }) {
  const root = document.querySelector("#v3Game"), field = document.querySelector("#v3Field");
  const scene = document.querySelector("#v3Scene"), objective = document.querySelector("#v3AdventureObjective");
  const pointsList = document.querySelector("#v3Discoveries"), selection = document.querySelector("#v3FieldSelection");
  const feedback = document.querySelector("#v3AdventureFeedback"), count = document.querySelector("#v3DiscoveryCount");
  const pulse = document.querySelector("#v3FieldPulse");
  const portrait = document.querySelector("#v3HeroPortrait"), xpTrack = document.querySelector("#v3XpProgress");
  const xpNext = document.querySelector("#v3XpNext"), journal = document.querySelector("#v3Journal");
  let selected = null, lastSnapshot = null, latestFeedback = null, current = null, showAll = false, pulseTimer = null;

  function refresh({ view, location }) {
    const { context, state } = read();
    const sceneId = getV3Scene(location.tile), goal = getV3AdventureObjective(context, state, location);
    const points = getV3FieldPoints(view, state), snapshot = snapshotV3Adventure(state, location);
    const response = getV3AdventureFeedback(lastSnapshot, snapshot);
    if (response) latestFeedback = response;
    current = { view, location, goal, points };
    root.dataset.scene = sceneId;
    scene.style.setProperty("--scene-art", `url("${V3_SCENES[sceneId]}")`);
    markup(scene, `<div class="v3-scene-caption"><small>誓暦${location.year}年${location.month}月${location.day}日 · ${location.time}</small><strong>${escape(location.tile.settlement?.name ?? location.tile.name)}</strong><span>${escape(location.tile.worldEffect?.name ?? "穏やかな空")} · ${escape(location.tile.terrainNote)}</span></div>`);
    markup(objective, `<small>${escape(goal.chapter)}</small><h2>${escape(goal.title)}</h2><p>${escape(goal.text)}</p>${goal.detail ? `<span class="v3-bearing">${icon("map")}${escape(goal.detail)}</span>` : ""}<button type="button" data-adventure-objective ${state.pendingEncounter ? "disabled" : ""}>${icon("quest")}${escape(goal.button)}${icon("chevron-right")}</button>`);
    markup(portrait, art(getV3PlayerArt(state.player.raceId)));
    const floor = state.player.level === 1 ? 0 : (state.player.level - 1) * 20;
    const progress = state.player.level >= 99 ? 100 : Math.max(0, Math.min(100, (state.player.xp - floor) / 20 * 100));
    xpTrack.style.width = `${progress}%`;
    xpNext.textContent = state.player.level >= 99 ? "最高レベル" : `次のLvまで ${Math.max(0, state.player.level * 20 - state.player.xp)}`;
    root.classList.toggle("has-low-hp", state.player.hp <= state.player.maxHp * .3);
    count.textContent = `${points.length}件の発見`;
    const tile = selected ? view.tiles.find((entry) => pointKey(entry) === selected.key && entry.visible && entry.generated) : null;
    if (!tile || (selected?.entity && !tile.entity) || (tile.player && !tile.entity)) selected = null;
    const point = selected && tile ? describeV3FieldPoint(tile, state) : null;
    const featured = points.filter((entry, index) => points.findIndex((point) => point.kind === entry.kind && point.name === entry.name) === index).slice(0, 4);
    const shown = showAll ? points : featured;
    markup(pointsList, shown.map((entry) => {
      const otherSites = showAll ? 0 : points.filter((point) => point.kind === entry.kind && point.name === entry.name).length - 1;
      return `<button type="button" class="v3-discovery ${entry.danger ? "is-danger" : ""}" data-adventure-point="${escape(entry.key)}" aria-pressed="${entry.key === selected?.key}">${art(getV3EntityArt(entry.tile.entity) ?? getV3LandmarkArt(entry.tile.type)) || icon(entry.icon)}<span><strong>${escape(entry.name)}</strong><small>${escape(entry.reward)}${otherSites ? ` · ほか${otherSites}か所` : ""}</small></span><b>${escape(entry.bearing)}</b></button>`;
    }).join("") || '<p class="v3-discovery-empty">まだ出会いは見えない。霧の向こうへ、一歩進んでみよう。</p>');
    const more = document.querySelector("#v3DiscoveriesMore");
    more.hidden = points.length <= featured.length; more.textContent = showAll ? "主な発見に戻す" : `全${points.length}件を見る`;
    const route = point ? getV3KnownRoute(view, point.key) : null;
    selection.hidden = !point || Boolean(state.pendingEncounter);
    if (point) markup(selection, `<div><small>${icon(point.icon)}${escape(point.label)} · ${escape(point.bearing)}</small><strong>${escape(point.name)}${point.level ? ` · Lv.${point.level}` : ""}</strong><p>${escape(point.reward)}</p>${point.description && ["npc", "enemy", "crisis"].includes(point.kind) ? `<p class="v3-point-purpose">${escape(point.description)}</p>` : ""}</div><div class="v3-selection-actions">${route ? `<button type="button" data-adventure-step>${escape(directions[route.direction])}へ一歩${icon("chevron-right")}</button><small>見えている道であと${route.steps}歩${point.danger ? " · 到達すると遭遇" : ""}</small>` : `<small>${point.tile.player ? "現在地です" : "見える範囲に通れる道がありません"}</small>`}<button type="button" data-adventure-clear aria-label="地点の選択を解除">${icon("close")}</button></div>`);
    for (const node of field.querySelectorAll(".v3-tile")) {
      node.querySelector(".v3-map-pin")?.remove();
      const entry = view.tiles.find((value) => String(value.x) === node.dataset.x && String(value.y) === node.dataset.y);
      if (!entry) continue;
      node.classList.toggle("is-inspected", pointKey(entry) === selected?.key);
      const found = points.find((value) => value.key === pointKey(entry));
      if (entry.visible && entry.generated) {
        node.dataset.adventureTile = pointKey(entry);
        node.title = `${entry.entity?.name ?? entry.name}${found ? ` · ${found.reward}` : ""}`;
      }
      if (found && !entry.player) {
        node.classList.add("has-discovery", `is-discovery-${found.kind}`);
        node.insertAdjacentHTML("beforeend", `<span class="v3-map-pin" aria-hidden="true">${icon(found.icon)}</span>`);
      }
    }
    feedback.hidden = !latestFeedback || Boolean(state.pendingEncounter);
    if (latestFeedback) {
      feedback.dataset.kind = latestFeedback.kind;
      markup(feedback, `<strong>${icon(["damage", "danger"].includes(latestFeedback.kind) ? "warning" : latestFeedback.kind === "level" ? "star" : "check")}${escape(latestFeedback.title)}</strong><div>${latestFeedback.changes.map((change) => `<span class="${change.delta < 0 ? "is-loss" : "is-gain"}">${icon({ gold: "coin", xp: "star", hp: "heart" }[change.key])}${{ gold: "銀貨", xp: "経験", hp: "HP" }[change.key]} ${change.delta > 0 ? "+" : ""}${change.delta}</span>`).join("")}</div>`);
    }
    markup(journal, state.messageLog.slice(1).map((message) => `<p>${escape(message)}</p>`).join(""));
    if (response && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) feedback.animate([{ opacity: .3, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 260 });
    if (response && (response.changes.length || response.enemyDamage)) {
      pulse.innerHTML = `${response.enemyDamage ? `<b>敵 −${response.enemyDamage}</b>` : ""}${response.changes.map((change) => `<span class="${change.delta < 0 ? "is-loss" : "is-gain"}">${{ gold: "銀貨", xp: "経験", hp: "HP" }[change.key]} ${change.delta > 0 ? "+" : ""}${change.delta}</span>`).join("")}`;
      pulse.hidden = false; clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => { pulse.hidden = true; }, 1800);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) pulse.animate([{ opacity: 0, transform: "translate(-50%, 8px) scale(.9)" }, { opacity: 1, transform: "translate(-50%, 0) scale(1)" }], { duration: 220 });
    }
    lastSnapshot = snapshot;
  }

  root.addEventListener("click", (event) => {
    const { state } = read();
    if (!current || !state) return;
    const control = event.target.closest("[data-adventure-point], [data-adventure-tile], [data-adventure-step], [data-adventure-clear], [data-adventure-objective], [data-adventure-discoveries], #v3DiscoveriesMore");
    if (!control) return;
    if (control.dataset.v3Move) return; // Adjacent tiles keep their existing one-step interaction.
    event.stopPropagation();
    if (control.hasAttribute("data-adventure-objective")) {
      if (state.pendingEncounter) return;
      return current.goal.action === "travel" ? travel(current.goal.destination) : campaign();
    }
    if (control.hasAttribute("data-adventure-discoveries")) {
      pointsList.scrollIntoView({ block: "nearest", behavior: "instant" }); pointsList.querySelector("button")?.focus(); return;
    }
    if (control.id === "v3DiscoveriesMore") { showAll = !showAll; refresh(current); control.focus(); return; }
    if (control.hasAttribute("data-adventure-clear")) { selected = null; refresh(current); field.querySelector(".is-player")?.focus(); return; }
    if (control.hasAttribute("data-adventure-step")) {
      if (state.pendingEncounter) return;
      const route = selected ? getV3KnownRoute(current.view, selected.key) : null;
      if (route) {
        move(route.direction);
        requestAnimationFrame(() => { if (!read().state.pendingEncounter && !selection.hidden) selection.querySelector("[data-adventure-step]")?.focus({ preventScroll: true }); });
      }
      return;
    }
    if (state.pendingEncounter) return;
    const key = control.dataset.adventurePoint ?? control.dataset.adventureTile;
    const tile = current.view.tiles.find((entry) => pointKey(entry) === key && entry.visible && entry.generated);
    if (!tile) return;
    if (tile.player) { if (["settlement", "quest"].includes(describeV3FieldPoint(tile, state).kind)) campaign(); return; }
    selected = { key, entity: Boolean(tile.entity) };
    refresh(current);
    selection.scrollIntoView({ block: "nearest", behavior: "instant" });
    selection.querySelector("[data-adventure-step], [data-adventure-clear]")?.focus({ preventScroll: true });
  });
  document.querySelector("#v3QuickInventory").addEventListener("click", () => action("menu"));
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !selected || root.inert) return;
    event.preventDefault(); event.stopPropagation(); selected = null; refresh(current);
    field.querySelector(".is-player")?.focus({ preventScroll: true });
  });
  return { refresh };
}
