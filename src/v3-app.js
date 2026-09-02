import {
  createGeneratedWorldState,
} from "./generated-world-system.js";
import { buildWorldGenerationAsync } from "./world-generation.js";
import {
  advanceV3BackgroundGeneration,
  createV3FieldState,
  createV3WorldContext,
  getV3FieldView,
  getV3LocationSummary,
  moveV3Player,
  normalizeV3FieldState,
  resolveV3Encounter,
  useV3Item,
  V3_DETAIL_SCALE,
} from "./v3-field-system.js";
import {
  advanceV3CriminalCycle,
  discoverV3CriminalBroker,
  distributeV3CriminalProfits,
  formV3CriminalOrganization,
  fundV3CriminalOrganization,
  getV3CriminalView,
  issueV3CriminalOperation,
  recruitV3CriminalMember,
  resolveV3CriminalDecision,
  resolveV3CriminalReport,
  resolveV3PersonalCrime,
  withdrawV3CriminalOrganization,
} from "./v3-criminal-organization-system.js";
import {
  advanceV3MilitaryArrival,
  applyV3GroupBattleReturn,
  clearV3GroupBattleBridge,
  createV3GroupBattleHandoff,
  deferV3GroupBattle,
  getV3MilitaryView,
  readV3GroupBattleBridge,
  readyV3GroupBattleAtCurrentPosition,
  startV3MilitaryMission,
  writeV3GroupBattleBridge,
} from "./v3-group-combat.js";
import {
  advanceV3CompanyMonth,
  buyV3Commodity,
  contributeV3CompanyCapital,
  foundV3MerchantCompany,
  getV3MerchantView,
  observeV3Market,
  openV3CompanyBranch,
  recruitV3CompanyStaff,
  resolveV3CharterApplication,
  resolveV3CompanyIncident,
  secureV3CompanyRoute,
  sellV3Commodity,
  startV3CharterApplication,
} from "./v3-merchant-system.js";
import {
  advanceV3WorldSimulation,
  buildV3WorldPrehistory,
  getV3NationAtTile,
  getV3NationDossier,
  getV3WorldChronicle,
  getV3WorldSimulationView,
  normalizeV3WorldSimulation,
  V3_PREHISTORY_MONTHS,
} from "./v3-world-simulation.js";
import { getV3WartimeMarketEffect, getV3WorldEffectsView } from "./v3-world-effects.js";
import {
  getV3EntityArt,
  getV3LandmarkArt,
  getV3PlayerArt,
  getV3TerrainArt,
} from "./v3-art.js";
import { createActionResult, isActionResult } from "./action-result.js";
import { GAME_MINUTES_PER_MONTH, getGameCalendar } from "./game-clock.js";
import { commitV3Action, getV3Operations, normalizeV3IntegratedState, V3_SYSTEM_REGISTRY } from "./v3-system-kernel.js";
import { readV3Save, V3_SAVE_VERSION, writeV3Save } from "./v3-save-system.js";
import { applyV3BattleResultToWorldSimulation } from "./v3-battle-strategy.js";
import { DECISION_TRAITS, TEMPERAMENTS } from "./race-decision-system.js";
import { GEOPOLITICAL_PULL_SET } from "./geopolitical-world.js";
import { getRaceDefinition } from "./race-list.js";

const STORAGE_KEY = "leviathan-covenant-v3-save";
const WORLD_CONFIG = Object.freeze({ width: 192, height: 120, plateCount: 28, nationCount: 7 });
const TERRAIN_COLORS = Object.freeze({
  grassland: "#72985d", plains: "#9aa66a", desert: "#c6a565", tundra: "#899b88", snow: "#d8dfd7", water: "#315e68",
});

const elements = {
  launch: document.querySelector("#v3Launch"),
  continueButton: document.querySelector("#v3Continue"),
  continueSummary: document.querySelector("#v3ContinueSummary"),
  openNew: document.querySelector("#v3OpenNew"),
  newWorld: document.querySelector("#v3NewWorld"),
  cancelNew: document.querySelector("#v3CancelNew"),
  playerName: document.querySelector("#v3PlayerName"),
  playerRace: document.querySelector("#v3PlayerRace"),
  worldSeed: document.querySelector("#v3WorldSeed"),
  generation: document.querySelector("#v3Generation"),
  generationLabel: document.querySelector("#v3GenerationLabel"),
  generationDetail: document.querySelector("#v3GenerationDetail"),
  generationProgress: document.querySelector("#v3GenerationProgress"),
  generationPercent: document.querySelector("#v3GenerationPercent"),
  game: document.querySelector("#v3Game"),
  nationName: document.querySelector("#v3NationName"),
  regionName: document.querySelector("#v3RegionName"),
  playerLabel: document.querySelector("#v3PlayerLabel"),
  raceLabel: document.querySelector("#v3RaceLabel"),
  levelLabel: document.querySelector("#v3LevelLabel"),
  hpLabel: document.querySelector("#v3HpLabel"),
  hpBar: document.querySelector("#v3HpBar"),
  xpLabel: document.querySelector("#v3XpLabel"),
  goldLabel: document.querySelector("#v3GoldLabel"),
  field: document.querySelector("#v3Field"),
  clockLabel: document.querySelector("#v3ClockLabel"),
  terrainLabel: document.querySelector("#v3TerrainLabel"),
  terrainEffect: document.querySelector("#v3TerrainEffect"),
  weatherLabel: document.querySelector("#v3WeatherLabel"),
  raceEffectLabel: document.querySelector("#v3RaceEffectLabel"),
  worldEffectVisual: document.querySelector("#v3WorldEffectVisual"),
  nearbyLabel: document.querySelector("#v3NearbyLabel"),
  chunkLabel: document.querySelector("#v3ChunkLabel"),
  messages: document.querySelector("#v3Messages"),
  movementPad: document.querySelector("#v3MovementPad"),
  personalBattleStatus: document.querySelector("#v3PersonalBattleStatus"),
  personalBattleArt: document.querySelector("#v3PersonalBattleArt"),
  personalBattleEnemy: document.querySelector("#v3PersonalBattleEnemy"),
  personalBattleLevel: document.querySelector("#v3PersonalBattleLevel"),
  personalBattleHpBar: document.querySelector("#v3PersonalBattleHpBar"),
  personalBattleHpLabel: document.querySelector("#v3PersonalBattleHpLabel"),
  personalBattleCommands: document.querySelector("#v3PersonalBattleCommands"),
  underworldButton: document.querySelector('[data-v3-action="underworld"]'),
  commerceButton: document.querySelector('[data-v3-action="commerce"]'),
  mapButton: document.querySelector('[data-v3-action="map"]'),
  militaryButton: document.querySelector("#v3MilitaryButton"),
  militaryLabel: document.querySelector("#v3MilitaryLabel"),
  inventoryButton: document.querySelector('[data-v3-action="menu"]'),
  encounterModal: document.querySelector("#v3EncounterModal"),
  encounterSymbol: document.querySelector("#v3EncounterSymbol"),
  encounterType: document.querySelector("#v3EncounterType"),
  encounterTitle: document.querySelector("#v3EncounterTitle"),
  encounterText: document.querySelector("#v3EncounterText"),
  encounterActions: document.querySelector("#v3EncounterActions"),
  inventoryModal: document.querySelector("#v3InventoryModal"),
  inventoryList: document.querySelector("#v3InventoryList"),
  underworldModal: document.querySelector("#v3UnderworldModal"),
  underworldContent: document.querySelector("#v3UnderworldContent"),
  commerceModal: document.querySelector("#v3CommerceModal"),
  commerceContent: document.querySelector("#v3CommerceContent"),
  worldMap: document.querySelector("#v3WorldMap"),
  worldCanvas: document.querySelector("#v3WorldCanvas"),
  worldMissionLegend: document.querySelector("#v3WorldMissionLegend"),
  worldDate: document.querySelector("#v3WorldDate"),
  worldHistory: document.querySelector("#v3WorldHistory"),
  worldHistoryLabel: document.querySelector("#v3WorldHistoryLabel"),
  worldStats: document.querySelector("#v3WorldStats"),
  worldNationList: document.querySelector("#v3WorldNationList"),
  worldMapDossier: document.querySelector("#v3WorldMapDossier"),
  worldEffects: document.querySelector("#v3WorldEffects"),
  worldEffectLegend: document.querySelector("#v3WorldEffectLegend"),
  worldDossier: document.querySelector("#v3WorldDossier"),
  worldChronicle: document.querySelector("#v3WorldChronicle"),
  worldMapPosition: document.querySelector("#v3WorldMapPosition"),
  toast: document.querySelector("#v3Toast"),
};

let runtime = null;
let context = null;
let state = null;
let worldOptions = null;
let worldSimulation = null;
let backgroundTimer = null;
let toastTimer = null;
let mapLayer = "nations";
let mapHistoryIndex = null;
let selectedNationId = null;
let worldAdvanceBusy = false;
let worldMapReturnFocus = null;
const modalReturnFocus = { inventory: null, underworld: null, commerce: null };
const worldChronicleCache = new WeakMap();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function focusAvailableElement(element) {
  if (!element || element.disabled || element.closest("[hidden], details:not([open])")) return false;
  element.focus();
  return document.activeElement === element;
}

function focusFirstAvailable(root, selectors, fallback = null) {
  for (const selector of selectors) {
    for (const candidate of root?.querySelectorAll(selector) ?? []) {
      if (focusAvailableElement(candidate)) return candidate;
    }
  }
  return focusAvailableElement(fallback) ? fallback : null;
}

function getActionFocusSignature(element) {
  if (!element) return null;
  const entries = Object.entries(element.dataset).filter(([key]) => key.startsWith("v3"));
  return entries.length ? Object.fromEntries(entries) : null;
}

function restoreActionFocus(root, signature) {
  if (!signature) return false;
  const candidate = [...root.querySelectorAll("button, input, select, summary")].find((element) => (
    Object.entries(signature).every(([key, value]) => element.dataset[key] === value)
  ));
  return focusAvailableElement(candidate);
}

function rememberModalFocus(name, fallback) {
  const active = document.activeElement;
  modalReturnFocus[name] = active instanceof HTMLElement && active !== document.body ? active : fallback;
}

function closeModal(name) {
  const settings = {
    inventory: [elements.inventoryModal, elements.inventoryButton],
    underworld: [elements.underworldModal, elements.underworldButton],
    commerce: [elements.commerceModal, elements.commerceButton],
  }[name];
  if (!settings) return;
  const [modal, fallback] = settings;
  modal.hidden = true;
  const returnTarget = modalReturnFocus[name]?.isConnected ? modalReturnFocus[name] : fallback;
  modalReturnFocus[name] = null;
  requestAnimationFrame(() => returnTarget?.focus());
}

function atlasArtClass(art) {
  return art?.atlas ? `is-${art.atlas}-atlas` : "";
}

function atlasArtMarkup(art, { className = "", label = "", hidden = false, tag = "b" } = {}) {
  if (!art) return "";
  const aria = hidden ? 'aria-hidden="true"' : `aria-label="${escapeHtml(label)}"`;
  return `<${tag} class="v3-atlas-art ${atlasArtClass(art)} ${className}" style="--v3-art-position:${art.position}" ${aria}></${tag}>`;
}

function setAtlasArt(element, art, baseClass, label = "") {
  element.className = `${baseClass} v3-atlas-art ${atlasArtClass(art)}`;
  if (art) element.style.setProperty("--v3-art-position", art.position);
  else element.style.removeProperty("--v3-art-position");
  if (label) element.setAttribute("aria-label", label);
  else element.removeAttribute("aria-label");
}

function uiIconMarkup(icon, className = "v3-ui-icon") {
  return `<svg class="${className}" aria-hidden="true"><use href="./assets/ui/v3-ui-icons.svg#icon-${icon}"></use></svg>`;
}

function weatherIcon(motion) {
  return ({
    rain: "rain",
    storm: "storm",
    snow: "snow",
    blizzard: "snow",
    sandstorm: "sandstorm",
    heatwave: "heatwave",
    fog: "fog",
    ashfall: "ashfall",
  })[motion] ?? "clear";
}

function createSeed() {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `v3-${Date.now().toString(36)}-${values[0].toString(36)}-${values[1].toString(36)}`.slice(0, 80);
}

function readSave() {
  return readV3Save(localStorage, STORAGE_KEY);
}

function saveGame() {
  if (!state || !worldOptions || !worldSimulation) return;
  writeV3Save(localStorage, STORAGE_KEY, {
    version: V3_SAVE_VERSION,
    world: worldOptions,
    field: state,
    worldSimulation,
    savedAt: new Date().toISOString(),
  });
}

function commitStateAction(action, options = {}) {
  const result = isActionResult(action)
    ? { ...action, events: [...action.events, ...(options.event ? [options.event] : [])] }
    : createActionResult(action, { events: options.event ? [options.event] : [] });
  const committed = commitV3Action(runtime, context, state, worldSimulation, result, { source: options.source });
  state = committed.state;
  worldSimulation = committed.worldSimulation;
  if (context) {
    context.worldSimulation = worldSimulation;
    context.raceDynamics = worldSimulation?.generatedWorld?.raceDynamics ?? null;
    context.actorPlanCache = null;
  }
  return committed;
}

function actionEvent(type, source, summary, payload = {}) {
  return { type, source, summary, payload, visibility: "private" };
}

function updateContinueButton() {
  const saved = readSave();
  elements.continueButton.disabled = !saved;
  elements.continueSummary.textContent = saved
    ? `${saved.field.player?.name ?? "冒険者"} · ${saved.worldSimulation?.year ?? 317}年${saved.worldSimulation?.month ?? 4}月 · ${saved.field.steps ?? 0}歩`
    : "保存された冒険はありません";
}

function setGenerationProgress(progress, label) {
  const amount = Math.max(0, Math.min(100, Math.round(progress)));
  elements.generationProgress.setAttribute("aria-valuenow", String(amount));
  elements.generationProgress.style.setProperty("--progress", `${amount}%`);
  elements.generationPercent.textContent = `${amount}%`;
  if (label) elements.generationDetail.textContent = label;
}

async function prepareWorld(options, savedField = null, savedWorldSimulation = null, groupBattleReturn = null) {
  elements.launch.hidden = true;
  elements.game.hidden = true;
  elements.generation.hidden = false;
  elements.generationLabel.textContent = savedField ? "世界を読み戻しています" : "概算世界を構築しています";
  setGenerationProgress(0, "地形の輪郭を定めています。");
  const generatedWorld = createGeneratedWorldState(options);
  runtime = await buildWorldGenerationAsync(generatedWorld, ({ progress, label }) => setGenerationProgress(progress * 0.68, label));
  if (savedWorldSimulation) {
    setGenerationProgress(86, "保存された国境と年代記を読み戻しています。");
    worldSimulation = normalizeV3WorldSimulation(runtime, options, savedWorldSimulation);
  } else {
    elements.generationLabel.textContent = "世界の50年史を編んでいます";
    worldSimulation = await buildV3WorldPrehistory(runtime, options, {
      months: V3_PREHISTORY_MONTHS,
      onProgress: ({ progress, year, month }) => setGenerationProgress(70 + progress * 27, `誓暦${year}年${month}月 · 国家が選択と対立を重ねています。`),
    });
  }
  setGenerationProgress(98, "現在地の周囲を1マス単位へ展開しています。");
  context = createV3WorldContext(runtime, options.seed);
  context.worldSimulation = worldSimulation;
  context.raceDynamics = worldSimulation.generatedWorld.raceDynamics;
  state = savedField ? normalizeV3FieldState(context, savedField) : createV3FieldState(context, { playerName: options.playerName, playerRaceId: options.playerRaceId });
  state = normalizeV3IntegratedState(context, state);
  if (savedField) {
    const calendar = getGameCalendar(state.clock);
    const lag = calendar.year * 12 + calendar.month - (worldSimulation.year * 12 + worldSimulation.month);
    if (lag > 0) worldSimulation = advanceV3WorldSimulation(runtime, worldSimulation, lag);
  }
  if (groupBattleReturn) {
    const mission = state.military.activeMission;
    const returnedState = applyV3GroupBattleReturn(state, groupBattleReturn);
    const committed = commitV3Action(runtime, context, state, worldSimulation, returnedState, {
      source: "military",
      event: actionEvent(
        groupBattleReturn.status === "completed" ? "battle.result.applied" : "battle.returned",
        "military",
        groupBattleReturn.status === "completed" ? "集団戦の戦果を人物状態へ反映" : "集団戦から作戦地点へ帰還",
        { battleId: groupBattleReturn.battleId },
      ),
    });
    state = committed.state;
    worldSimulation = committed.worldSimulation;
    if (groupBattleReturn.status === "completed") {
      const strategic = applyV3BattleResultToWorldSimulation(runtime, worldSimulation, mission, groupBattleReturn.result);
      worldSimulation = strategic.worldSimulation;
      if (strategic.event) {
        const eventResult = commitV3Action(runtime, context, state, worldSimulation, state, {
          source: "strategic-war",
          event: actionEvent("battle.result.projected", "strategic-war", strategic.event.summary ?? "集団戦の戦果を戦略世界へ反映", {
            battleId: groupBattleReturn.battleId,
            warId: strategic.event.worldWarId ?? null,
          }),
        });
        state = eventResult.state;
      }
    }
    clearV3GroupBattleBridge(localStorage);
  }
  context.worldSimulation = worldSimulation;
  context.raceDynamics = worldSimulation.generatedWorld.raceDynamics;
  context.actorPlanCache = null;
  worldOptions = { ...WORLD_CONFIG, ...options, playerName: state.player.name, playerRaceId: state.player.raceId };
  mapHistoryIndex = null;
  selectedNationId = null;
  setGenerationProgress(100, "足元の世界が形になりました。");
  saveGame();
  await new Promise((resolve) => setTimeout(resolve, 260));
  elements.generation.hidden = true;
  elements.game.hidden = false;
  renderGame();
  if (groupBattleReturn) {
    showToast(groupBattleReturn.status === "completed" ? "集団戦の戦果をV3へ反映しました。" : "作戦地点へ戻りました。集団戦を再開できます。");
    requestAnimationFrame(() => (state.pendingEncounter?.type === "group-battle"
      ? elements.encounterActions.querySelector("button")
      : elements.field.querySelector(".is-player"))?.focus());
  } else requestAnimationFrame(() => elements.field.querySelector(".is-player")?.focus());
  scheduleBackgroundGeneration();
  window.__v3Game = {
    get state() { return state; },
    get context() { return context; },
    get runtime() { return runtime; },
    get worldGeneration() { return runtime?.worldGeneration ?? null; },
    get worldSimulation() { return worldSimulation; },
    get worldEffects() { return getV3WorldEffectsView(context, state); },
    get operations() { return getV3Operations(context, state); },
    get domainEvents() { return state.domainEvents?.entries ?? []; },
    get systemVersions() { return V3_SYSTEM_REGISTRY.versions; },
    move: movePlayer,
    advanceWorld,
    openWorldMap,
    openUnderworld,
    get criminalView() { return getV3CriminalView(context, state); },
    military: handleMilitaryAction,
    groupBattle: beginV3GroupBattle,
  };
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

function renderLocalWorldEffect() {
  const view = getV3WorldEffectsView(context, state);
  const local = view.local;
  const effectType = local?.motion ?? "clear";
  elements.game.dataset.worldEffect = effectType;
  elements.worldEffectVisual.hidden = !local;
  elements.worldEffectVisual.className = `v3-world-effect-visual${local ? ` is-${escapeHtml(effectType)}` : ""}`;
  elements.worldEffectVisual.style.setProperty("--effect-strength", String(local?.strength ?? 0));
  elements.weatherLabel.className = `v3-weather-label is-${local ? escapeHtml(effectType) : "clear"}`;
  elements.weatherLabel.innerHTML = local
    ? `${uiIconMarkup(weatherIcon(effectType), "v3-inline-icon")}<span>${escapeHtml(local.name)} · 移動 +${Math.round((local.travelMultiplier - 1) * 100)}% · 遭遇 +${(local.dangerDelta * 100).toFixed(1)}pt</span>`
    : `${uiIconMarkup("clear", "v3-inline-icon")}<span>空 平穏 · 移動補正なし</span>`;
  const moon = view.celestial;
  elements.raceEffectLabel.className = `v3-race-effect-label${view.raceResponse?.responses.length ? " is-active" : ""}`;
  elements.raceEffectLabel.innerHTML = `${uiIconMarkup("moon", "v3-inline-icon")}<span>${escapeHtml(view.raceResponse?.peopleName ?? "人間")} · ${escapeHtml(view.raceResponse?.summary ?? "種族固有反応なし")} · ${escapeHtml(moon.primaryMoon)}${escapeHtml(moon.phaseName)}${moon.active.length ? "（作用中）" : ""}</span>`;
}

function renderField() {
  const view = getV3FieldView(context, state);
  const personalEnemy = state.pendingEncounter?.type === "enemy" ? state.pendingEncounter : null;
  const militaryMission = state.military?.activeMission ?? null;
  elements.field.style.setProperty("--field-columns", view.columns);
  elements.field.style.setProperty("--field-rows", view.rows);
  elements.field.setAttribute("aria-label", personalEnemy ? `${personalEnemy.name}との個人戦。探索中と同じ周辺フィールド` : "周辺フィールド");
  elements.field.innerHTML = view.tiles.map((tile) => {
    const adjacent = Math.abs(tile.dx) + Math.abs(tile.dy) === 1;
    const direction = tile.dx === 1 ? "east" : tile.dx === -1 ? "west" : tile.dy === 1 ? "south" : "north";
    const hidden = !tile.visible && !tile.player;
    const encounterTile = Boolean(personalEnemy && personalEnemy.worldX === tile.x && personalEnemy.worldY === tile.y);
    const militaryTarget = Boolean(militaryMission && militaryMission.target.x === tile.x && militaryMission.target.y === tile.y);
    const visibleEntity = encounterTile
      ? personalEnemy
      : militaryTarget
        ? { type: "group-battle", name: `${militaryMission.enemyNation.name}作戦地点`, symbol: "軍" }
        : tile.entity;
    const terrainArt = hidden && !militaryTarget ? null : getV3TerrainArt(tile.type);
    const landmarkArt = hidden && !militaryTarget ? null : getV3LandmarkArt(tile.type);
    const sprites = [
      tile.player ? atlasArtMarkup(getV3PlayerArt(state.player.raceId), { className: "v3-player-sprite", label: state.player.name }) : "",
      (!hidden || militaryTarget) && visibleEntity
        ? atlasArtMarkup(getV3EntityArt(visibleEntity), { className: `v3-entity is-${escapeHtml(visibleEntity.type)}`, label: visibleEntity.name })
        : "",
    ].filter(Boolean);
    const occupants = sprites.length > 1 ? `<span class="v3-combatants">${sprites.join("")}</span>` : sprites[0] ?? "";
    const landmark = landmarkArt ? atlasArtMarkup(landmarkArt, { className: "v3-landmark-art", hidden: true, tag: "span" }) : "";
    const labelParts = [hidden ? "未踏" : tile.name];
    if (tile.player) labelParts.push(`${state.player.name}の現在地`);
    if ((!hidden || militaryTarget) && visibleEntity) labelParts.push(visibleEntity.name);
    if ((!hidden || militaryTarget) && visibleEntity?.purpose?.label) labelParts.push(visibleEntity.purpose.label);
    if (!hidden && tile.worldEffect) labelParts.push(`${tile.worldEffect.name}の影響下`);
    const effectClass = !hidden && tile.worldEffect ? ` has-world-effect is-effect-${escapeHtml(tile.worldEffect.motion)}` : "";
    const terrainStyle = terrainArt ? ` style="--v3-terrain-position:${terrainArt.position}"` : "";
    return `<button type="button" role="gridcell" class="v3-tile is-${escapeHtml(hidden && !militaryTarget ? "fog" : tile.type)}${tile.player ? " is-player" : ""}${personalEnemy && tile.player ? " is-combat-player" : ""}${encounterTile ? " is-combat-enemy" : ""}${militaryTarget ? " is-military-target" : ""}${adjacent ? " is-adjacent" : ""}${effectClass}" data-x="${tile.x}" data-y="${tile.y}" ${adjacent && tile.passable && !state.pendingEncounter ? `data-v3-move="${direction}"` : ""} aria-label="${escapeHtml(labelParts.join("、"))}" tabindex="${tile.player ? "0" : "-1"}"${terrainStyle}>${landmark}${occupants}</button>`;
  }).join("");
}

function renderEncounter() {
  const encounter = state.pendingEncounter;
  const personalEnemy = encounter?.type === "enemy" ? encounter : null;
  const groupBattle = encounter?.type === "group-battle" ? encounter : null;
  elements.game.classList.toggle("is-personal-battle", Boolean(personalEnemy));
  elements.personalBattleStatus.hidden = !personalEnemy;
  elements.personalBattleCommands.hidden = !personalEnemy;
  elements.movementPad.hidden = Boolean(personalEnemy);
  elements.mapButton.disabled = Boolean(personalEnemy);
  elements.inventoryButton.disabled = Boolean(personalEnemy);
  elements.underworldButton.disabled = Boolean(personalEnemy);
  elements.commerceButton.disabled = Boolean(personalEnemy);
  elements.encounterModal.hidden = !encounter || Boolean(personalEnemy);
  if (!encounter) return;
  if (personalEnemy) {
    setAtlasArt(elements.personalBattleArt, getV3EntityArt(personalEnemy), "v3-personal-battle-art", personalEnemy.name);
    elements.personalBattleEnemy.textContent = personalEnemy.purpose?.label
      ? `${personalEnemy.name} · ${personalEnemy.purpose.label}`
      : personalEnemy.name;
    elements.personalBattleStatus.setAttribute("aria-label", personalEnemy.purpose?.reason
      ? `${personalEnemy.name}。${personalEnemy.purpose.reason}`
      : personalEnemy.name);
    elements.personalBattleLevel.textContent = `LV ${personalEnemy.level}`;
    elements.personalBattleHpBar.style.width = `${Math.max(0, personalEnemy.hp / personalEnemy.maxHp * 100)}%`;
    elements.personalBattleHpLabel.textContent = `${personalEnemy.hp} / ${personalEnemy.maxHp}`;
    return;
  }
  if (groupBattle) {
    setAtlasArt(elements.encounterSymbol, getV3EntityArt(groupBattle), "v3-encounter-art", groupBattle.name);
    elements.encounterType.textContent = "GROUP BATTLE / 専用戦術画面";
    elements.encounterTitle.textContent = groupBattle.name;
    elements.encounterText.textContent = groupBattle.message;
    elements.encounterActions.innerHTML = '<button class="is-primary" type="button" data-v3-group-battle="start">戦闘準備・兵站へ</button><button type="button" data-v3-group-battle="defer">いったん離れる</button>';
    return;
  }
  setAtlasArt(elements.encounterSymbol, getV3EntityArt(encounter), "v3-encounter-art", encounter.name);
  elements.encounterType.textContent = `${encounter.role === "merchant" ? "TRAVELING MERCHANT" : "FIELD ENCOUNTER"}${encounter.temperamentName ? ` · ${encounter.temperamentName}` : ""}`;
  elements.encounterTitle.textContent = encounter.name;
  elements.encounterText.textContent = encounter.message;
  elements.encounterActions.innerHTML = `${encounter.role === "merchant" ? `<button class="is-primary" type="button" data-v3-encounter="buy">薬草を買う · 銀貨${encounter.price ?? 5}</button>` : '<button class="is-primary" type="button" data-v3-encounter="talk">話す</button>'}<button type="button" data-v3-encounter="leave">別れる</button>`;
}

function renderMilitary() {
  const military = getV3MilitaryView(context, state);
  const personalBattle = state.pendingEncounter?.type === "enemy";
  const blockingEncounter = Boolean(state.pendingEncounter && state.pendingEncounter.type !== "group-battle");
  elements.militaryButton.disabled = personalBattle || blockingEncounter;
  const buttonLabel = military.active && military.atTarget ? "集団戦" : military.active ? "作戦" : "軍務";
  elements.militaryButton.querySelector("span").textContent = buttonLabel;
  elements.militaryButton.setAttribute("aria-label", buttonLabel);
  elements.militaryButton.title = military.detail;
  elements.militaryLabel.textContent = military.active
    ? `${military.label}｜${military.detail}`
    : military.canAccept ? `${military.nearbySettlement.name}で軍務を受けられる` : military.label;
  elements.militaryLabel.classList.toggle("is-active", military.active);
}

function renderInventory() {
  const items = state.player.inventory;
  elements.inventoryList.innerHTML = items.length ? items.map((item, index) => {
    const art = atlasArtMarkup(getV3EntityArt({ type: "item", ...item }), { className: "v3-inventory-art", hidden: true, tag: "i" });
    return `<button type="button" data-v3-use-item="${index}" ${item.heal && state.player.hp < state.player.maxHp ? "" : "disabled"}>${art}<span><strong>${escapeHtml(item.name)}</strong><small>${item.heal ? `HPを${item.heal}回復` : "素材"}</small></span><b>${item.heal ? "使う" : "所持"}</b></button>`;
  }).join("") : "<p>道具はまだ持っていない。</p>";
}

function focusInventoryPrimaryAction() {
  focusFirstAvailable(
    elements.inventoryList,
    ["[data-v3-use-item]:not(:disabled)"],
    elements.inventoryModal.querySelector("[data-v3-close='inventory']"),
  );
}

function criminalMemberOptions(members, preferredSkills = [], includeEmpty = false) {
  const ranked = [...members].sort((left, right) => {
    const fit = (member) => preferredSkills.reduce((sum, skill) => sum + (Number(member.skills?.[skill]) || 0), 0);
    return fit(right) - fit(left) || right.loyalty - left.loyalty;
  });
  return `${includeEmpty ? '<option value="">支援なし</option>' : ""}${ranked.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)} · ${escapeHtml(member.role)} · 忠誠${member.loyalty}</option>`).join("")}`;
}

function renderUnderworld() {
  const previousScroll = elements.underworldContent.scrollTop;
  const model = getV3CriminalView(context, state);
  const organization = model.organization;
  const cycleLabel = worldSimulation ? `${worldSimulation.year}年${worldSimulation.month}月` : model.cycleLabel;
  const lastResult = model.lastResult
    ? `<aside class="v3-criminal-result"><strong>直前の${escapeHtml(model.lastResult.actionName)}：${escapeHtml(model.lastResult.outcomeName)}</strong><span>${escapeHtml(model.lastResult.targetName)}${model.lastResult.reward ? ` · 銀貨+${model.lastResult.reward}` : model.lastResult.fine ? ` · 罰金${model.lastResult.fine}` : ""}</span></aside>`
    : "";
  const personalActions = model.personalActions.map((action) => `<article class="v3-criminal-action${action.available ? "" : " is-locked"}"><header><strong>${escapeHtml(action.shortName)}</strong><b>${escapeHtml(action.riskLabel)}</b></header><h3>${escapeHtml(action.target.name)}</h3><p>${escapeHtml(action.description)}</p><footer><span>見込 銀貨+${action.reward}</span><button type="button" data-v3-personal-crime="${action.id}" ${action.available ? "" : "disabled"}>${action.available ? "本人で実行" : escapeHtml(action.lockedReason)}</button></footer></article>`).join("");
  const brokerBlock = model.localBroker
    ? `<article class="v3-broker-card is-known"><div><small>LOCAL BROKER</small><strong>${escapeHtml(model.localBroker.name)}</strong><span>${escapeHtml(model.localBroker.settlementName ?? model.location.regionName)} · 信頼${model.localBroker.trust ?? 0}</span></div><b>接触済み</b></article>`
    : `<article class="v3-broker-card"><div><small>LOCAL BROKER</small><strong>現地の仲介人を探す</strong><span>${escapeHtml(model.brokerReason ?? "路地へ銀貨1を持って行く")}</span></div><button type="button" data-v3-criminal-broker ${model.canSearchBroker ? "" : "disabled"}>探索 · 銀貨1</button></article>`;
  const candidates = organization.candidates.length
    ? organization.candidates.map((candidate) => `<button type="button" data-v3-criminal-recruit="${escapeHtml(candidate.id)}" ${state.player.gold >= candidate.fee ? "" : "disabled"}><strong>${escapeHtml(candidate.name)} · ${escapeHtml(candidate.role)}</strong><small>${escapeHtml(candidate.specialties.join("・"))} · 忠誠${candidate.loyalty} · 契約銀貨${candidate.fee}</small></button>`).join("")
    : `<p>${organization.brokerKnown ? model.location.canManage ? "この地方の候補者は全員確認済みです。" : "仲介人のいる集落へ戻ると人員を手配できます。" : "単独実績を作り、現地の仲介人を見つけると候補者が現れます。"}</p>`;
  const formation = organization.stage === "solo"
    ? `<section class="v3-criminal-section"><header><div><small>FORM A CREW</small><h2>一味を結成</h2></div><b>${escapeHtml(organization.formationReason)}</b></header><label class="v3-criminal-name"><span>組織名</span><input id="v3CriminalOrganizationName" maxlength="24" value="${escapeHtml(`${state.player.name}一味`)}"></label><button class="is-primary" type="button" data-v3-criminal-form ${organization.canForm ? "" : "disabled"}>銀貨2で一味を結成</button></section>`
    : "";
  const members = organization.members.length
    ? organization.members.map((member) => `<li><span><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)} · ${escapeHtml(member.specialties.join("・"))}</small></span><span><b>${escapeHtml(member.statusName)}</b><small>忠誠 ${member.loyalty}</small></span></li>`).join("")
    : "<li><span>構成員はいない。</span></li>";
  const decisions = organization.pendingDecisions.map((decision) => `<article class="v3-criminal-decision"><header><strong>${decision.kind === "captive_disposition" ? `${escapeHtml(decision.targetName)}の処遇` : `${escapeHtml(decision.memberName)}が拘束された`}</strong><span>判断待ち</span></header><div>${decision.options.map((option) => `<button type="button" data-v3-criminal-decision="${escapeHtml(decision.id)}" data-v3-criminal-choice="${option.id}"><strong>${escapeHtml(option.name)}</strong><small>${escapeHtml(option.description)}</small></button>`).join("")}</div></article>`).join("");
  const activeOrders = organization.activeOrders.length
    ? organization.activeOrders.map((order) => `<li><span><strong>${escapeHtml(order.name)} · ${escapeHtml(order.target.name)}</strong><small>${escapeHtml(order.assignedMembers.map((member) => member.name).join("・"))} · ${escapeHtml(order.approachName)}</small></span>${order.status === "report_ready" ? `<button type="button" data-v3-criminal-report="${escapeHtml(order.id)}">報告を確認</button>` : `<b>あと${order.remainingMonths}か月</b>`}</li>`).join("")
    : "<li><span>進行中の指示はない。</span></li>";
  const operationCards = organization.operations.map((operation) => {
    const membersReady = organization.availableMembers.length >= operation.minimumCrew;
    const disabled = !operation.unlocked || !membersReady;
    const reason = operation.lockedReason ?? (!membersReady ? `待機中の構成員${operation.minimumCrew}名が必要です` : null);
    return `<article class="v3-operation-card${disabled ? " is-locked" : ""}" data-v3-operation-card="${escapeHtml(operation.id)}"><header><div><small>${escapeHtml(operation.riskLabel)}</small><h3>${escapeHtml(operation.name)}</h3></div><b>${operation.durationMonths}か月</b></header><strong>${escapeHtml(operation.target.name)}</strong><p>${escapeHtml(operation.preparationRequirements.join(" · "))}</p><dl><div><dt>作戦金</dt><dd>${operation.treasuryCost}</dd></div><div><dt>見込</dt><dd>${escapeHtml(operation.expectedReward.text)}</dd></div><div><dt>必要影響力</dt><dd>${operation.minimumInfluence}</dd></div></dl><label>責任者<select data-v3-criminal-leader ${disabled ? "disabled" : ""}>${criminalMemberOptions(organization.availableMembers, operation.preferredRoles)}</select></label><label>支援役<select data-v3-criminal-support ${disabled ? "disabled" : ""}>${criminalMemberOptions(organization.availableMembers, operation.preferredRoles, true)}</select></label><label>方針<select data-v3-criminal-approach ${disabled ? "disabled" : ""}><option value="cautious">慎重 · 露見を抑える</option><option value="balanced" selected>均衡</option><option value="bold">大胆 · 収益優先</option></select></label><button type="button" data-v3-criminal-order ${disabled ? "disabled" : ""}>${disabled ? escapeHtml(reason) : "この人員で指示"}</button></article>`;
  }).join("");
  const completedOrders = organization.completedOrders.length
    ? organization.completedOrders.slice(0, 5).map((order) => `<li><strong>${escapeHtml(order.name)} · ${escapeHtml(order.target?.name ?? "対象")}</strong><span>${escapeHtml(model.outcomeLabels[order.outcome] ?? order.outcome)}</span></li>`).join("")
    : "<li>完了報告はまだない。</li>";
  const organizationBoard = organization.formed ? `<section class="v3-criminal-organization"><header><div><small>${organization.stage === "network" ? "CRIMINAL ORGANIZATION" : "CREW"}</small><h2>${escapeHtml(organization.name)}</h2><p>${escapeHtml(organization.nextStageReason)}</p></div><dl><div><dt>影響力</dt><dd>${organization.influence}</dd></div><div><dt>組織金庫</dt><dd>${organization.treasury}</dd></div><div><dt>指示枠</dt><dd>${organization.activeOrderCount} / ${organization.activeOrderLimit}</dd></div></dl></header>${decisions}<div class="v3-criminal-finance"><button type="button" data-v3-criminal-fund ${state.player.gold < 1 ? "disabled" : ""}>銀貨1を出資</button><button type="button" data-v3-criminal-withdraw ${organization.treasury < 1 ? "disabled" : ""}>銀貨1を引出</button><button type="button" data-v3-criminal-distribute ${organization.treasury < Math.max(1, organization.members.length) ? "disabled" : ""}>構成員へ利益分配</button></div><section class="v3-criminal-columns"><div class="v3-criminal-section"><header><div><small>MEMBERS</small><h2>構成員</h2></div><b>${organization.members.length}名</b></header><ul class="v3-criminal-roster">${members}</ul><details><summary>追加人員を手配</summary><div class="v3-criminal-candidates">${candidates}</div></details></div><div class="v3-criminal-section"><header><div><small>ACTIVE ORDERS</small><h2>進行中の指示</h2></div><button type="button" data-v3-criminal-cycle ${organization.activeOrders.some((order) => order.status === "active") ? "" : "disabled"}>一か月潜伏</button></header><ul class="v3-active-orders">${activeOrders}</ul></div></section><section class="v3-criminal-section"><header><div><small>DELEGATED OPERATIONS</small><h2>作戦を指示</h2></div><b>${escapeHtml(model.location.regionName)}</b></header><div class="v3-operation-grid">${operationCards}</div></section><section class="v3-criminal-section"><header><div><small>REPORT ARCHIVE</small><h2>完了報告</h2></div></header><ul class="v3-completed-orders">${completedOrders}</ul></section></section>` : "";
  elements.underworldContent.innerHTML = `<section class="v3-underworld-summary"><div><small>CURRENT PLACE</small><strong>${escapeHtml(model.location.settlement?.name ?? model.location.tile.name)}</strong><span>${escapeHtml(model.location.regionName)}</span></div><div><small>CAREER</small><strong>${escapeHtml(model.stageName)}</strong><span>${escapeHtml(model.stageDescription)}</span></div><div><small>WANTED</small><strong>${escapeHtml(model.status.heatLabel)}</strong><span>手配 ${model.status.heat}</span></div><div><small>PERIOD</small><strong>${escapeHtml(cycleLabel)}</strong><span>銀貨 ${state.player.gold}</span></div></section>${lastResult}<section class="v3-criminal-section"><header><div><small>PERSONAL CRIME</small><h2>本人で動く</h2></div><b>現地対象のみ</b></header><div class="v3-criminal-action-grid">${personalActions}</div></section><section class="v3-criminal-section"><header><div><small>UNDERWORLD CONTACT</small><h2>仲介人と人員</h2></div></header>${brokerBlock}${organization.stage === "solo" ? `<div class="v3-criminal-candidates">${candidates}</div>` : ""}</section>${formation}${organizationBoard}`;
  elements.underworldContent.scrollTop = previousScroll;
}

function focusUnderworldPrimaryAction() {
  focusFirstAvailable(elements.underworldContent, [
    "[data-v3-criminal-decision]:not(:disabled)",
    "[data-v3-criminal-report]:not(:disabled)",
    "[data-v3-criminal-cycle]:not(:disabled)",
    "[data-v3-criminal-form]:not(:disabled)",
    "[data-v3-criminal-broker]:not(:disabled)",
    "[data-v3-criminal-recruit]:not(:disabled)",
    "[data-v3-criminal-order]:not(:disabled)",
    "[data-v3-personal-crime]:not(:disabled)",
  ], elements.underworldModal.querySelector("[data-v3-close='underworld']"));
}

function openUnderworld() {
  rememberModalFocus("underworld", elements.underworldButton);
  elements.underworldModal.hidden = false;
  renderUnderworld();
  focusUnderworldPrimaryAction();
}

function renderCommerce() {
  const previousScroll = elements.commerceContent.scrollTop;
  const model = getV3MerchantView(context, state, worldSimulation);
  const cargoById = Object.fromEntries(model.cargo.map((entry) => [entry.commodityId, entry]));
  const market = model.market;
  const marketEffectNotice = market?.worldEffect ? `<p class="v3-market-effect"><b>${uiIconMarkup("military", "v3-inline-icon")}<span>${escapeHtml(market.worldEffect.name)}</span></b><span>${escapeHtml(market.worldEffect.summary)}</span></p>` : "";
  const marketBlock = market ? `<section class="v3-commerce-section"><header><div><small>CURRENT MARKET</small><h2>${escapeHtml(model.marketSettlement.name)}の市場</h2></div><button type="button" data-v3-trade-action="observe">相場を記録</button></header>${marketEffectNotice}<div class="v3-market-grid">${model.commodities.map((commodity) => {
    const good = market.goods[commodity.id];
    const cargo = cargoById[commodity.id];
    return `<article><header><strong>${escapeHtml(commodity.name)}</strong><small>在庫${good.stock}</small></header><p>仕入 ${good.buyPrice} ／ 売却 ${good.sellPrice}${good.worldEffect ? ` · 戦時価格×${good.worldEffect.priceMultiplier.toFixed(2)}` : ""}</p><div><button type="button" data-v3-trade-action="buy" data-v3-commodity="${commodity.id}" ${state.player.gold < good.buyPrice || good.stock < 1 ? "disabled" : ""}>1個仕入</button><button type="button" data-v3-trade-action="sell" data-v3-commodity="${commodity.id}" ${cargo?.quantity ? "" : "disabled"}>1個売却${cargo?.quantity ? ` · 所持${cargo.quantity}` : ""}</button></div></article>`;
  }).join("")}</div></section>` : `<section class="v3-commerce-section is-empty"><small>CURRENT MARKET</small><h2>市場まで歩く</h2><p>都市・町・村の中心街へ入ると、現地相場と売買操作が開きます。</p></section>`;
  const cargo = `<section class="v3-commerce-section v3-trade-ledger"><header><div><small>PERSONAL TRADE</small><h2>個人商売</h2></div><b>${model.cargoLoad.units}/${model.cargoLoad.unitCapacity}個 · ${model.cargoLoad.weight}/${model.cargoLoad.weightCapacity}重量</b></header><ul>${model.cargo.length ? model.cargo.map((entry) => `<li><strong>${escapeHtml(entry.name)} × ${entry.quantity}</strong><span>平均原価 ${entry.averageCost}</span></li>`).join("") : "<li>積荷なし</li>"}</ul><p>市場${model.knownMarkets.length}か所 · 売却${model.tradeStats.unitsSold}個 · 実現利益${model.tradeStats.realizedProfit >= 0 ? "+" : ""}${model.tradeStats.realizedProfit}</p></section>`;
  let companyBlock;
  if (model.company.status !== "company") {
    const requirements = model.founding.requirements.map((entry) => `<li class="${entry.value >= entry.target ? "is-met" : ""}"><span>${escapeHtml(entry.label)}</span><strong>${entry.value} / ${entry.target}</strong></li>`).join("");
    companyBlock = `<section class="v3-commerce-section"><header><div><small>FOUND A COMPANY</small><h2>商会を結成する</h2></div><b>${model.founding.ready ? "設立可能" : "実績が必要"}</b></header><ul class="v3-company-requirements">${requirements}</ul><label class="v3-company-name"><span>商会名</span><input id="v3CompanyName" maxlength="24" value="${escapeHtml(`${state.player.name}商会`)}"></label><div class="v3-strategy-grid">${model.strategies.map((strategy) => `<button type="button" data-v3-company-found="${strategy.id}" ${model.founding.ready ? "" : "disabled"}><strong>${escapeHtml(strategy.name)}</strong><small>${escapeHtml(strategy.description)} · 設立資金12</small></button>`).join("")}</div></section>`;
  } else {
    const charterCards = model.jurisdictions.map((jurisdiction) => {
      if (jurisdiction.charter) return `<article class="v3-charter-card is-active"><header><span><small>${escapeHtml(jurisdiction.government)}</small><strong>${escapeHtml(jurisdiction.name)}</strong></span><b>営業可</b></header><p>${escapeHtml(jurisdiction.charter.authority)}：${escapeHtml(jurisdiction.charter.basis)}</p><small>義務：${escapeHtml(jurisdiction.charter.obligation)}${jurisdiction.charter.monthlyDue ? ` · 月${jurisdiction.charter.monthlyDue}` : ""}</small></article>`;
      if (jurisdiction.application) return `<article class="v3-charter-card is-pending"><header><span><small>${escapeHtml(jurisdiction.government)}</small><strong>${escapeHtml(jurisdiction.name)}</strong></span><b>条件提示</b></header><p>${escapeHtml(jurisdiction.application.authority)}への返答を選ぶ。</p><div>${jurisdiction.decisions.map((decision) => `<button type="button" data-v3-charter-decision="${decision.id}" data-v3-application="${escapeHtml(jurisdiction.application.id)}" ${model.company.treasury < decision.effectiveCost ? "disabled" : ""}><strong>${escapeHtml(decision.name)}</strong><small>${escapeHtml(decision.description)}${decision.effectiveCost ? ` · 資金${decision.effectiveCost}` : ""}${decision.monthlyDue ? ` · 月${decision.monthlyDue}` : ""}${decision.minimumReputation ? ` · 信用${decision.minimumReputation}${decision.eligible ? "達成" : "未達・却下見込み"}` : ""}</small></button>`).join("")}</div></article>`;
      return `<article class="v3-charter-card"><header><span><small>${escapeHtml(jurisdiction.government)}</small><strong>${escapeHtml(jurisdiction.name)}</strong></span><b>資格なし</b></header><p><strong>${escapeHtml(jurisdiction.procedure.name)}</strong> · ${escapeHtml(jurisdiction.procedure.authority)}</p><p>${escapeHtml(jurisdiction.procedure.summary)}</p><div>${jurisdiction.procedure.filings.map((filing) => `<button type="button" data-v3-charter-start="${escapeHtml(jurisdiction.id)}" data-v3-filing="${filing.id}" ${model.company.treasury < filing.cost ? "disabled" : ""}><strong>${escapeHtml(filing.name)}</strong><small>${escapeHtml(filing.description)}${filing.cost ? ` · 資金${filing.cost}` : ""}</small></button>`).join("")}</div></article>`;
    }).join("") || "<p>市場の相場を記録すると、その国の営業手続きが現れます。</p>";
    const staff = model.company.staff.map((entry) => `<li><strong>${escapeHtml(entry.name)} · ${escapeHtml(entry.roleName)}</strong><span>${entry.temperamentName ? `${escapeHtml(entry.temperamentName)} · ` : ""}${entry.assignmentId ? "配置済み" : "配置待ち"} · 月給${entry.wage}</span></li>`).join("") || "<li>人員なし</li>";
    const candidates = model.candidates.map((entry) => `<button type="button" data-v3-company-hire="${escapeHtml(entry.id)}" ${model.company.treasury < entry.signingBonus ? "disabled" : ""}><strong>${escapeHtml(entry.name)} · ${escapeHtml(entry.roleName)}</strong><small>${escapeHtml(entry.originSettlementName)}出身${entry.temperamentName ? ` · ${escapeHtml(entry.temperamentName)}` : ""} · 契約${entry.signingBonus} · 月給${entry.wage}</small></button>`).join("") || "<p>候補者は全員雇用済みです。</p>";
    const sourceOptions = model.marketOptions.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)} · ${escapeHtml(entry.nationName)}${entry.licensed ? "" : "（資格なし）"}</option>`).join("");
    const destinationOptions = model.marketOptions.map((entry, index) => `<option value="${escapeHtml(entry.id)}" ${index === 1 ? "selected" : ""}>${escapeHtml(entry.name)} · ${escapeHtml(entry.nationName)}${entry.licensed ? "" : "（資格なし）"}</option>`).join("");
    const routeForm = model.routeLeaders.length && model.marketOptions.length >= 2 ? `<div class="v3-company-form" data-v3-route-form><label>仕入地<select data-v3-route-source>${sourceOptions}</select></label><label>販売地<select data-v3-route-destination>${destinationOptions}</select></label><label>商品<select data-v3-route-commodity>${model.commodities.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>運行<select data-v3-route-approach>${model.routeApproaches.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)} · 契約${entry.cost}</option>`).join("")}</select></label><label>責任者<select data-v3-route-leader>${model.routeLeaders.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)} · ${escapeHtml(entry.roleName)}</option>`).join("")}</select></label><button type="button" data-v3-route-secure>販路を契約</button></div>` : "<p>二市場の記録と、配置待ちの隊商頭または護衛頭が必要です。</p>";
    const routes = model.company.routes.map((entry) => `<li><strong>${escapeHtml(entry.sourceName)} → ${escapeHtml(entry.destinationName)} · ${escapeHtml(entry.commodityName)}</strong><span>${entry.status === "active" ? "運行中" : entry.status === "blocked" ? "事故対応待ち" : "休止"} · ${entry.successfulRuns}便</span></li>`).join("") || "<li>販路なし</li>";
    const localJurisdiction = model.marketSettlement ? model.jurisdictions.find((entry) => entry.settlementIds.includes(model.marketSettlement.id)) : null;
    const branchForm = model.marketSettlement && localJurisdiction?.charter && model.branchManagers.length ? `<div class="v3-company-form" data-v3-branch-form><label>規模<select data-v3-branch-format>${model.branchFormats.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)} · 開業${entry.cost}</option>`).join("")}</select></label><label>開店方法<select data-v3-branch-launch>${model.launchPlans.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)} · ${entry.months}か月</option>`).join("")}</select></label><label>店長<select data-v3-branch-manager>${model.branchManagers.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)} · ${escapeHtml(entry.roleName)}</option>`).join("")}</select></label><button type="button" data-v3-branch-open>${escapeHtml(model.marketSettlement.name)}へ出店</button></div>` : `<p>${model.marketSettlement ? localJurisdiction?.charter ? "配置待ちの番頭か仕入役が必要です。" : "先にこの国の営業資格を取得してください。" : "出店する市場まで歩いてください。"}</p>`;
    const branches = model.company.branches.map((entry) => `<li><strong>${escapeHtml(entry.settlementName)}</strong><span>${entry.status === "preparing" ? `準備${entry.preparationProgress}/${entry.preparationMonths}` : entry.status === "open" ? "営業中" : "休業"}</span></li>`).join("") || "<li>支店なし</li>";
    const incidents = model.company.pendingIncidents.map((entry) => `<article class="v3-company-incident"><strong>${escapeHtml(entry.title)}</strong><div><button type="button" data-v3-incident="${escapeHtml(entry.id)}" data-v3-decision="escort" ${model.company.treasury < 4 ? "disabled" : ""}>資金4で護衛増強</button><button type="button" data-v3-incident="${escapeHtml(entry.id)}" data-v3-decision="detour">一か月迂回</button><button type="button" data-v3-incident="${escapeHtml(entry.id)}" data-v3-decision="take_loss">損失受入れ</button></div></article>`).join("");
    const ledger = model.company.monthlyLedger.slice(0, 4).map((entry) => `<li><strong>${escapeHtml(entry.period)} · 損益${entry.profit >= 0 ? "+" : ""}${entry.profit}</strong><span>売上${entry.revenue}／費用${entry.costs}（給金${entry.wages}・資格${entry.charterDues}）</span></li>`).join("") || "<li>決算なし</li>";
    companyBlock = `<section class="v3-company-board"><header><div><small>MERCHANT COMPANY</small><h2>${escapeHtml(model.company.name)}</h2><p>${escapeHtml(model.strategies.find((entry) => entry.id === model.company.strategyId)?.name ?? "商会経営")}</p></div><div><strong>資金${model.company.treasury}</strong><span>信用${model.company.reputation}</span><button type="button" data-v3-company-invest ${state.player.gold < 10 ? "disabled" : ""}>個人資金10を出資</button></div></header>${incidents}<section class="v3-commerce-section"><header><div><small>LICENSES</small><h2>国家制度と営業資格</h2></div><b>${model.company.charters.length}/${model.jurisdictions.length}か国</b></header><div class="v3-charter-grid">${charterCards}</div></section><section class="v3-company-columns"><div class="v3-commerce-section"><header><div><small>STAFF</small><h2>人員の手配</h2></div></header><ul>${staff}</ul><details><summary>採用候補</summary><div class="v3-candidate-grid">${candidates}</div></details></div><div class="v3-commerce-section"><header><div><small>ROUTES</small><h2>販路の確保</h2></div></header>${routeForm}<ul>${routes}</ul></div><div class="v3-commerce-section"><header><div><small>BRANCH</small><h2>出店の段取り</h2></div></header>${branchForm}<ul>${branches}</ul></div><div class="v3-commerce-section"><header><div><small>MONTHLY</small><h2>月次決算</h2></div><button type="button" data-v3-company-month>翌月へ進む</button></header><ul>${ledger}</ul></div></section></section>`;
  }
  elements.commerceContent.innerHTML = `${marketBlock}${cargo}${companyBlock}`;
  elements.commerceContent.scrollTop = previousScroll;
}

function focusCommercePrimaryAction() {
  focusFirstAvailable(elements.commerceContent, [
    '[data-v3-incident]:not(:disabled)',
    '[data-v3-charter-decision]:not(:disabled)',
    '[data-v3-company-found]:not(:disabled)',
    '[data-v3-charter-start]:not(:disabled)',
    '[data-v3-company-hire]:not(:disabled)',
    '[data-v3-route-secure]:not(:disabled)',
    '[data-v3-branch-open]:not(:disabled)',
    '[data-v3-company-month]:not(:disabled)',
    '[data-v3-trade-action="observe"]:not(:disabled)',
    '[data-v3-trade-action="buy"]:not(:disabled)',
    '[data-v3-trade-action="sell"]:not(:disabled)',
  ], elements.commerceModal.querySelector("[data-v3-close='commerce']"));
}

function rerenderCommerceWithFocus(actionElement) {
  const signature = getActionFocusSignature(actionElement);
  renderGame();
  requestAnimationFrame(() => {
    if (!restoreActionFocus(elements.commerceContent, signature)) focusCommercePrimaryAction();
  });
}

function renderGame() {
  if (!state || !context) return;
  const location = getV3LocationSummary(context, state);
  const currentNation = worldSimulation && location.tile.macroIndex !== undefined
    ? getV3NationAtTile(runtime, worldSimulation, location.tile.macroIndex)
    : null;
  elements.nationName.textContent = currentNation?.name ?? location.nationName;
  elements.regionName.textContent = location.regionName;
  elements.playerLabel.textContent = state.player.name;
  elements.raceLabel.textContent = getRaceDefinition(state.player.raceId)?.name ?? "人間";
  elements.levelLabel.textContent = `LV ${state.player.level}`;
  elements.hpLabel.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  elements.hpBar.style.width = `${Math.max(0, state.player.hp / state.player.maxHp * 100)}%`;
  elements.xpLabel.textContent = String(state.player.xp);
  elements.goldLabel.textContent = String(state.player.gold);
  elements.clockLabel.textContent = `第${location.day}日 ${location.time}`;
  elements.terrainLabel.textContent = location.tile.name;
  elements.terrainEffect.textContent = `${location.tile.passable ? `移動${location.tile.travelMinutes}分` : "通行不能"} · ${location.tile.terrainNote}`;
  elements.nearbyLabel.textContent = location.nearestSettlement
    ? `${location.nearestSettlement.settlement.name}（${location.nearestSettlementFunction?.name ?? "集落"}）まで約${Math.round(location.nearestSettlement.distance)}歩`
    : "近くに集落はない";
  elements.chunkLabel.textContent = `詳細生成 ${state.generatedChunks.length}区画 · ${state.steps}歩`;
  elements.messages.innerHTML = state.messageLog.map((message, index) => `<p${index === 0 ? ' class="is-latest"' : ""}>${escapeHtml(message)}</p>`).join("");
  renderLocalWorldEffect();
  renderField();
  renderEncounter();
  renderMilitary();
  renderInventory();
  if (!elements.underworldModal.hidden) renderUnderworld();
  if (!elements.commerceModal.hidden) renderCommerce();
}

function movePlayer(direction) {
  const encounterBeforeMove = state.pendingEncounter;
  const moved = moveV3Player(context, state, direction);
  const next = advanceV3MilitaryArrival(context, state, moved);
  if (next === state) return;
  commitStateAction(next, {
    source: "field",
    event: actionEvent("player.moved", "field", `${direction}へ移動`, { direction }),
  });
  saveGame();
  renderGame();
  if (!encounterBeforeMove && state.pendingEncounter?.type === "enemy") {
    requestAnimationFrame(() => elements.personalBattleCommands.querySelector("button")?.focus());
  } else if (!encounterBeforeMove && state.pendingEncounter) {
    requestAnimationFrame(() => elements.encounterActions.querySelector("button")?.focus());
  } else requestAnimationFrame(() => elements.field.querySelector(".is-player")?.focus());
}

function applyEncounterAction(action) {
  commitStateAction(resolveV3Encounter(context, state, action), {
    source: "personal-combat",
    event: actionEvent("personal-combat.resolved", "personal-combat", `個人戦コマンド: ${action}`, { action }),
  });
  saveGame();
  renderGame();
  if (state.pendingEncounter?.type === "enemy") elements.personalBattleCommands.querySelector("button")?.focus();
  else if (state.pendingEncounter) elements.encounterActions.querySelector("button")?.focus();
  else elements.field.querySelector(".is-player")?.focus();
}

function beginV3GroupBattle() {
  try {
    if (state.pendingEncounter?.type !== "group-battle") commitStateAction(readyV3GroupBattleAtCurrentPosition(context, state), {
      source: "military",
      event: actionEvent("battle.requested", "military", "集団戦の戦闘準備を開始"),
    });
    const handoff = createV3GroupBattleHandoff(context, state);
    const returnUrl = new URL("./index.html", window.location.href).href;
    handoff.request.origin.returnUrl = returnUrl;
    writeV3GroupBattleBridge(localStorage, handoff.request);
    commitStateAction(handoff.state, { source: "military" });
    saveGame();
    const battleUrl = new URL("./legacy-v2.html", window.location.href);
    battleUrl.searchParams.set("v3-group-battle", handoff.request.requestId);
    window.location.assign(battleUrl.href);
  } catch (error) {
    showToast(error.message);
  }
}

function handleMilitaryAction() {
  try {
    let military = getV3MilitaryView(context, state);
    if (!military.active) {
      commitStateAction(startV3MilitaryMission(context, state, worldSimulation), {
        source: "military",
        event: actionEvent("military.mission.accepted", "military", "軍務を受諾"),
      });
      saveGame();
      renderGame();
      military = getV3MilitaryView(context, state);
      showToast(`${military.mission.target.regionName}の作戦地点を地図に記しました。`);
      return;
    }
    if (military.atTarget) {
      if (state.pendingEncounter?.type !== "group-battle") {
        commitStateAction(readyV3GroupBattleAtCurrentPosition(context, state), {
          source: "military",
          event: actionEvent("battle.requested", "military", "作戦地点で集団戦を開始"),
        });
        saveGame();
        renderGame();
      }
      beginV3GroupBattle();
      return;
    }
    openWorldMap();
    showToast(`作戦地点まで${military.distance}歩・${military.direction}です。`);
  } catch (error) {
    showToast(error.message);
  }
}

function scheduleBackgroundGeneration() {
  clearTimeout(backgroundTimer);
  const run = () => {
    if (!state || document.hidden) {
      backgroundTimer = setTimeout(run, 1200);
      return;
    }
    const previousCount = state.generatedChunks.length;
    state = advanceV3BackgroundGeneration(context, state);
    if (state.generatedChunks.length !== previousCount) {
      elements.chunkLabel.textContent = `詳細生成 ${state.generatedChunks.length}区画 · ${state.steps}歩`;
      if (state.generatedChunks.length % 8 === 0) saveGame();
    }
    backgroundTimer = setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 900 }) : run()), 850);
  };
  backgroundTimer = setTimeout(run, 850);
}

function colorMix(color, target, amount) {
  const parse = (value) => /^#[0-9a-f]{6}$/i.test(value ?? "")
    ? [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) : [116, 134, 93];
  const source = parse(color);
  const destination = parse(target);
  return `#${source.map((value, index) => Math.round(value + (destination[index] - value) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function colorAlpha(color, alpha) {
  if (!/^#[0-9a-f]{6}$/i.test(color ?? "")) return `rgba(160, 190, 190, ${alpha})`;
  const values = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  return `rgba(${values.join(", ")}, ${alpha})`;
}

function drawWorldEffectMark(drawing, motion, x, y) {
  drawing.save();
  drawing.translate(x, y);
  drawing.strokeStyle = "#fff8dc";
  drawing.fillStyle = "#fff8dc";
  drawing.lineWidth = 1.15;
  drawing.lineCap = "round";
  drawing.lineJoin = "round";
  if (["rain", "storm"].includes(motion)) {
    drawing.beginPath();
    drawing.arc(-2, -1, 2.1, Math.PI, Math.PI * 2);
    drawing.arc(1, -1.7, 2.6, Math.PI, Math.PI * 2);
    drawing.lineTo(4, 0.4);
    drawing.lineTo(-4, 0.4);
    drawing.closePath();
    drawing.stroke();
    for (const offset of [-2, 1, 4]) {
      drawing.beginPath();
      drawing.moveTo(offset, 2);
      drawing.lineTo(offset - 1, 4.2);
      drawing.stroke();
    }
    if (motion === "storm") {
      drawing.beginPath();
      drawing.moveTo(0, 0.8);
      drawing.lineTo(-1.4, 3);
      drawing.lineTo(0.4, 3);
      drawing.lineTo(-0.8, 5);
      drawing.stroke();
    }
  } else if (["snow", "blizzard"].includes(motion)) {
    for (let index = 0; index < 3; index += 1) {
      drawing.rotate(Math.PI / 3);
      drawing.beginPath();
      drawing.moveTo(-4, 0);
      drawing.lineTo(4, 0);
      drawing.stroke();
    }
  } else if (["sandstorm", "fog"].includes(motion)) {
    for (const offset of [-2.5, 0, 2.5]) {
      drawing.beginPath();
      drawing.moveTo(-4, offset);
      drawing.bezierCurveTo(-1, offset - 1, 1, offset + 1, 4, offset);
      drawing.stroke();
    }
  } else if (motion === "heatwave") {
    for (const offset of [-2.5, 0, 2.5]) {
      drawing.beginPath();
      drawing.moveTo(offset, 4);
      drawing.bezierCurveTo(offset - 1.5, 1.5, offset + 1.5, -1.5, offset, -4);
      drawing.stroke();
    }
  } else {
    for (const [offsetX, offsetY, radius] of [[-2.5, -2, 1], [2.5, -1, .8], [0, 2.5, 1.1]]) {
      drawing.beginPath();
      drawing.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
      drawing.fill();
    }
  }
  drawing.restore();
}

function drawWorldEffectFronts(drawing, effects, scale) {
  const mapWidth = runtime.terrain.width * scale;
  drawing.save();
  for (const front of effects.fronts) {
    const radius = front.radius * scale;
    for (const wrapOffset of [-mapWidth, 0, mapWidth]) {
      const x = front.x * scale + scale / 2 + wrapOffset;
      const y = front.y * scale + scale / 2;
      const gradient = drawing.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, colorAlpha(front.color, 0.58));
      gradient.addColorStop(0.58, colorAlpha(front.color, 0.3));
      gradient.addColorStop(1, colorAlpha(front.color, 0));
      drawing.fillStyle = gradient;
      drawing.beginPath();
      drawing.arc(x, y, radius, 0, Math.PI * 2);
      drawing.fill();
      drawing.strokeStyle = colorAlpha(front.color, 0.9);
      drawing.lineWidth = Math.max(1, front.intensity * 0.65);
      drawing.setLineDash([front.intensity * 2 + 1, 3]);
      drawing.beginPath();
      drawing.arc(x, y, radius * 0.72, 0, Math.PI * 2);
      drawing.stroke();
    }
    drawing.setLineDash([]);
    drawWorldEffectMark(drawing, front.motion, front.x * scale + scale / 2, front.y * scale + scale / 2);
  }
  drawing.restore();
}

function regionMapColor(color, regionId) {
  let hash = 0;
  for (const character of String(regionId)) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  const amount = 0.08 + (hash % 5) * 0.035;
  return colorMix(color, hash % 2 ? "#ffffff" : "#071416", amount);
}

function formatWorldPeriod(periodOrState) {
  const period = typeof periodOrState === "string" ? periodOrState : `${periodOrState.year}-${periodOrState.month}`;
  const [year, month] = period.split("-");
  return `誓暦${year}年 ${month}月`;
}

function currentMapView() {
  return getV3WorldSimulationView(runtime, worldSimulation, mapHistoryIndex);
}

function chronicleEntries() {
  const cached = worldChronicleCache.get(worldSimulation);
  if (cached) return cached;
  const entries = getV3WorldChronicle(runtime, worldSimulation, 120);
  worldChronicleCache.set(worldSimulation, entries);
  return entries;
}

function periodNumber(period) {
  const [year, month] = String(period).split("-").map(Number);
  return year * 12 + month;
}

function regionCountFor(map, nationId) {
  return [...map.regionById.values()].filter((region) => region.nationId === nationId).length;
}

function signedDecisionValue(value) {
  const number = Math.round(Number(value) || 0);
  return number > 0 ? `+${number}` : String(number);
}

function renderDecisionProfile(profile, latestAction, peopleName) {
  if (!profile) return "";
  const temperamentEntries = Object.entries(profile.temperamentShares ?? {}).map(([id, share]) => ({
    id,
    name: TEMPERAMENTS[id]?.name ?? id,
    percent: Math.round((Number(share) || 0) * 100),
  }));
  const axes = Object.entries(DECISION_TRAITS).map(([id, definition]) => `
    <div><dt>${escapeHtml(definition.name)}</dt><dd data-sign="${profile.traits[id] < 0 ? "negative" : profile.traits[id] > 0 ? "positive" : "neutral"}">${signedDecisionValue(profile.traits[id])}</dd></div>
  `).join("");
  const probabilities = (latestAction?.alternatives ?? []).slice(0, 4).map((entry) => `
    <span><b>${escapeHtml(GEOPOLITICAL_PULL_SET[entry.id]?.name ?? entry.id)}</b><i>${Math.round((Number(entry.probability) || 0) * 100)}%</i></span>
  `).join("");
  const agendas = (profile.historicalAgendas ?? []).slice(-2).map((agenda) => `<li>${escapeHtml(agenda.title)}</li>`).join("");
  const populationGroups = Object.values(profile.populationGroups ?? {}).map((dimension) => {
    const groups = (dimension.groups ?? []).slice(0, dimension.id === "regional" ? 3 : 4).map((group) => {
      const temperament = group.representativeTemperament;
      return `<span><b>${escapeHtml(group.name)}</b><i>${escapeHtml(temperament?.name ?? "混合")} ${Math.round((Number(temperament?.share) || 0) * 100)}%</i></span>`;
    }).join("");
    return groups ? `<section><small>${escapeHtml(dimension.name)}</small>${groups}</section>` : "";
  }).join("");
  const balance = profile.balance;
  return `
    <section class="v3-decision-profile" aria-label="${escapeHtml(peopleName)}の気質構成と国家意思決定">
      <header><small>RACE DYNAMICS</small><strong>${escapeHtml(peopleName)} · ${escapeHtml(profile.representativeTemperament?.name ?? "混合気質")}</strong><span>統治者 ${escapeHtml(TEMPERAMENTS[profile.leader?.temperamentId]?.name ?? "個性不明")}</span></header>
      <div class="v3-temperament-grid">${temperamentEntries.map((entry) => `<span><b>${escapeHtml(entry.name)}</b><i>${entry.percent}%</i><meter min="0" max="100" value="${entry.percent}" aria-label="${escapeHtml(entry.name)} ${entry.percent}%"></meter></span>`).join("")}</div>
      ${populationGroups ? `<div class="v3-population-groups"><header><small>POPULATION PROJECTIONS</small><span>同じ人口を地方・階級・信仰で集計</span></header>${populationGroups}</div>` : ""}
      <dl class="v3-decision-axes">${axes}</dl>
      ${balance ? `<p class="v3-decision-balance" data-status="${escapeHtml(balance.status)}"><strong>長期均衡 ${balance.status === "stable" ? "安定" : "要観察"}</strong><span>多様性 ${Math.round(balance.diversity * 100)}%${balance.warnings.length ? ` · ${escapeHtml(balance.warnings.join(" / "))}` : ""}</span></p>` : ""}
      ${probabilities ? `<div class="v3-decision-probabilities"><small>直近判断の確率分布</small>${probabilities}</div>` : ""}
      ${agendas ? `<div class="v3-decision-agendas"><small>歴史アジェンダ</small><ul>${agendas}</ul></div>` : ""}
    </section>`;
}

function renderCurrentPolity(map) {
  const location = getV3LocationSummary(context, state);
  const nationId = map.tileNationIds[location.tile.macroIndex] ?? null;
  const nation = map.nationById.get(nationId) ?? null;
  const polity = nation?.polity;
  const nearby = location.nearestSettlement;
  const settlement = nearby
    ? map.objects.find((object) => object.id === nearby.settlement.id) ?? nearby.settlement
    : null;
  const functionNames = settlement?.functions?.map((entry) => entry.name) ?? [];
  if (!nation) {
    elements.worldMapDossier.innerHTML = `<header><div><small>${map.isCurrent ? "CURRENT LOCATION" : "HISTORICAL LOCATION"}</small><strong>無主地</strong><span>${escapeHtml(formatWorldPeriod(map))}</span></div></header><p>この時点では国家の統治下にありません。</p>`;
    return;
  }
  elements.worldMapDossier.innerHTML = `
    <header><i style="--nation-color:${escapeHtml(nation.color)}"></i><div><small>${map.isCurrent ? "CURRENT LOCATION" : "HISTORICAL LOCATION"}</small><strong>${escapeHtml(nation.name)}</strong><span>${escapeHtml(formatWorldPeriod(map))}</span></div></header>
    <dl>
      <div><dt>国家形態</dt><dd>${escapeHtml(polity?.formName ?? nation.government ?? "不明")}</dd></div>
      <div><dt>政治制度</dt><dd>${escapeHtml(polity?.politicalSystemName ?? nation.government ?? "不明")}</dd></div>
      <div><dt>元首</dt><dd>${escapeHtml(polity?.rulerTitle ?? nation.rulerTitle ?? "不明")}</dd></div>
      <div><dt>首都</dt><dd>${escapeHtml(nation.capitalName ?? `${polity?.capitalTitle ?? nation.capitalTitle ?? "首都"}${nation.shortName ?? ""}`)}</dd></div>
    </dl>
    <div class="v3-dossier-settlement">
      <small>NEAREST SETTLEMENT</small>
      <strong>${escapeHtml(settlement?.name ?? "近隣集落なし")}</strong>
      ${settlement ? `<span>${Math.round(nearby.distance)}歩 · 人口 ${Number(settlement.population ?? 0).toLocaleString("ja-JP")}</span><div>${functionNames.length ? functionNames.map((name) => `<i>${escapeHtml(name)}</i>`).join("") : "<i>都市機能未分類</i>"}</div>` : "<span>32歩以内に集落はありません。</span>"}
    </div>`;
}

function renderWorldPanels(map) {
  const historyMaximum = Math.max(0, worldSimulation.history.length - 1);
  elements.worldHistory.max = String(historyMaximum);
  elements.worldHistory.value = String(mapHistoryIndex ?? historyMaximum);
  elements.worldHistoryLabel.value = `${formatWorldPeriod(map)} · ${map.reason}`;
  elements.worldDate.textContent = `${map.year}年 ${map.month}月${map.isCurrent ? "" : "（回顧）"}`;
  const currentButton = elements.worldMap.querySelector("[data-v3-history-current]");
  currentButton.disabled = map.isCurrent;
  elements.worldMap.querySelectorAll("[data-v3-world-advance]").forEach((button) => {
    button.disabled = worldAdvanceBusy || !map.isCurrent;
  });
  elements.worldMap.querySelectorAll("[data-v3-map-layer]").forEach((button) => {
    const active = button.dataset.v3MapLayer === mapLayer;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderCurrentPolity(map);
  const effects = getV3WorldEffectsView(context, state, map.isCurrent ? null : map);
  const moon = effects.celestial;
  const raceResponses = effects.raceResponse?.responses ?? [];
  const effectLocation = getV3LocationSummary(context, state);
  const effectNationId = map.tileNationIds[effectLocation.tile.macroIndex] ?? null;
  const effectNation = map.nationById.get(effectNationId);
  const wartimeMarket = getV3WartimeMarketEffect({
    activeWars: map.activeWars,
    nationId: effectNationId,
    nationName: effectNation?.name,
    regionId: effectLocation.region?.id,
  });
  elements.worldEffects.innerHTML = `
    <header><span><small>WORLD EFFECTS</small><strong>世界現象</strong></span><b>${effects.fronts.length}域${effects.activeGlobal.length ? `＋${effects.activeGlobal.length}天体` : ""}</b></header>
    <p class="v3-world-effect-local"><strong>${uiIconMarkup(weatherIcon(effects.local?.motion), "v3-inline-icon")}<span>${effects.local ? escapeHtml(effects.local.name) : "現在座標は平穏"}</span></strong><span>${effects.local ? `移動 +${Math.round((effects.local.travelMultiplier - 1) * 100)}% · 遭遇 +${(effects.local.dangerDelta * 100).toFixed(1)}pt` : "移動・遭遇補正なし"}</span></p>
    <p class="v3-world-effect-celestial"><strong>${uiIconMarkup("moon", "v3-inline-icon")}<span>${escapeHtml(moon.primaryMoon)} · ${escapeHtml(moon.phaseName)}</span></strong><span>${moon.active.length ? `${escapeHtml(moon.active[0].description)}（夜間作用中）` : `周期${moon.cycleDay}/${moon.cycleDays}日 · ${moon.isNight ? "夜間" : "日中"}`}</span></p>
    <p class="v3-world-effect-race${raceResponses.length ? " is-active" : ""}"><strong>${escapeHtml(effects.raceResponse?.peopleName ?? "人間")}への作用</strong><span>${escapeHtml(effects.raceResponse?.summary ?? "種族固有反応なし")}${raceResponses.length ? ` · ${escapeHtml(raceResponses.map((response) => response.summary).join(" "))}` : ""}</span></p>
    ${wartimeMarket ? `<p class="v3-world-effect-market"><strong>${uiIconMarkup("commerce", "v3-inline-icon")}<span>${escapeHtml(wartimeMarket.name)}</span></strong><span>${escapeHtml(wartimeMarket.summary)}</span></p>` : ""}
    <ul>${effects.fronts.map((front) => `<li class="is-${escapeHtml(front.motion)}"><i style="--effect-color:${escapeHtml(front.color)}">${uiIconMarkup(weatherIcon(front.motion), "v3-effect-icon")}</i><span><strong>${escapeHtml(front.name)}</strong><small>${escapeHtml(front.regionName ?? "洋上・無主地")} · 強度${front.intensity} · 半径${Math.round(front.radius)}区画</small></span><em>最大+${front.travelPenaltyPercent}%</em></li>`).join("") || "<li><span><strong>大きな現象なし</strong><small>この月に記録対象となる前線はありません。</small></span></li>"}</ul>`;

  const activeNations = map.nations.filter((nation) => regionCountFor(map, nation.id) > 0);
  const settlementCount = map.objects.filter((object) => object.settlementLevel).length;
  elements.worldStats.innerHTML = `<span><b>${activeNations.length}</b>勢力</span><span><b>${map.regionById.size}</b>地方</span><span><b>${settlementCount}</b>集落</span><span><b>${map.activeWars.length}</b>戦争</span>`;
  elements.worldNationList.innerHTML = activeNations.sort((left, right) => regionCountFor(map, right.id) - regionCountFor(map, left.id) || left.name.localeCompare(right.name, "ja"))
    .map((nation) => `<button type="button" data-v3-select-nation="${escapeHtml(nation.id)}" class="${nation.id === selectedNationId ? "is-selected" : ""}" aria-pressed="${nation.id === selectedNationId}"><i style="--nation-color:${escapeHtml(nation.color)}"></i><span><strong>${escapeHtml(nation.name)}</strong><small>${regionCountFor(map, nation.id)}地方</small></span></button>`).join("");

  const dossier = getV3NationDossier(runtime, worldSimulation, selectedNationId, mapHistoryIndex);
  if (!dossier) {
    elements.worldDossier.innerHTML = "<p>地図か国家一覧から勢力を選択してください。</p>";
  } else {
    const condition = dossier.condition;
    const relationWarning = dossier.relations.filter((relation) => ["戦争", "危機", "緊張"].includes(relation.status)).length;
    const warText = dossier.wars.length
      ? dossier.wars.map((war) => `${escapeHtml(map.nationById.get(war.attackerNationId)?.name ?? war.attackerName ?? "不明勢力")} 対 ${escapeHtml(map.nationById.get(war.defenderNationId)?.name ?? war.defenderName ?? "不明勢力")}`).join(" / ")
      : "交戦なし";
    const polity = dossier.nation.polity;
    elements.worldDossier.innerHTML = `
      <header><i style="--nation-color:${escapeHtml(dossier.nation.color)}"></i><div><small>${dossier.isHistorical ? "HISTORICAL POLITY" : "NATION DOSSIER"}</small><strong>${escapeHtml(dossier.nation.name)}</strong><span>${escapeHtml(polity?.formName ?? dossier.nation.government ?? "統治形態不明")} / ${escapeHtml(polity?.politicalSystemName ?? dossier.nation.government ?? "制度不明")}</span></div></header>
      <dl>
        <div><dt>元首</dt><dd>${escapeHtml(polity?.rulerTitle ?? dossier.nation.rulerTitle ?? "不明")}</dd></div>
        <div><dt>首都</dt><dd>${escapeHtml(dossier.nation.capitalName ?? `${polity?.capitalTitle ?? dossier.nation.capitalTitle ?? "首都"}${dossier.nation.shortName ?? ""}`)}</dd></div>
        <div><dt>領域</dt><dd>${dossier.regions.length}地方</dd></div><div><dt>人口</dt><dd>${Math.round(dossier.population).toLocaleString("ja-JP")}人</dd></div>
        <div><dt>集落</dt><dd>都${dossier.settlementCounts.city}・町${dossier.settlementCounts.town}・村${dossier.settlementCounts.village}</dd></div><div><dt>隣国</dt><dd>${dossier.neighbors.length}勢力</dd></div>
        ${condition ? `<div><dt>結束</dt><dd>${condition.cohesion}</dd></div><div><dt>備蓄</dt><dd>${condition.reserves}</dd></div><div><dt>態勢</dt><dd>${escapeHtml(condition.posture)}</dd></div><div><dt>緊張関係</dt><dd>${relationWarning}</dd></div>` : ""}
      </dl>
      <p class="v3-dossier-war">${warText}</p>
      ${dossier.latestAction ? `<p><strong>直近の判断</strong><span>${escapeHtml(dossier.latestAction.title)}</span><small>${escapeHtml(dossier.latestAction.summary)}</small></p>` : ""}
      ${renderDecisionProfile(dossier.decisionProfile, dossier.latestAction, dossier.nation.peopleName ?? "住民")}`;
  }

  const maximumPeriod = periodNumber(map.period);
  const availableEntries = chronicleEntries().filter((entry) => periodNumber(entry.period) <= maximumPeriod);
  const entries = [...new Map([
    ...availableEntries.slice(0, 6),
    ...availableEntries.filter((entry) => entry.importance >= 4).slice(0, 10),
  ].map((entry) => [entry.id, entry])).values()].sort((left, right) => periodNumber(right.period) - periodNumber(left.period)
    || right.importance - left.importance).slice(0, 14);
  elements.worldChronicle.innerHTML = entries.length ? entries.map((entry) => `<li class="is-priority-${entry.importance}"><time>${formatWorldPeriod(entry.period)}</time><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.summary ?? "")}</span></li>`).join("") : "<li><span>大きな事件はまだ記録されていません。</span></li>";
}

function drawWorldMap() {
  const map = currentMapView();
  const effects = getV3WorldEffectsView(context, state, map.isCurrent ? null : map);
  if (!selectedNationId || !map.nationById.has(selectedNationId) || regionCountFor(map, selectedNationId) === 0) {
    const location = getV3LocationSummary(context, state);
    selectedNationId = map.tileNationIds[location.tile.macroIndex] ?? map.nations.find((nation) => regionCountFor(map, nation.id) > 0)?.id ?? null;
  }
  renderWorldPanels(map);
  const canvas = elements.worldCanvas;
  const scale = 4;
  const logicalWidth = runtime.terrain.width * scale;
  const logicalHeight = runtime.terrain.height * scale;
  const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  canvas.width = Math.round(logicalWidth * pixelRatio);
  canvas.height = Math.round(logicalHeight * pixelRatio);
  canvas.dataset.pixelRatio = String(pixelRatio);
  const drawing = canvas.getContext("2d");
  drawing.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawing.imageSmoothingEnabled = true;
  drawing.fillStyle = "#214650";
  drawing.fillRect(0, 0, logicalWidth, logicalHeight);
  const warRegionIds = new Set(map.activeWars.map((war) => war.targetRegionId).filter(Boolean));
  elements.worldEffectLegend.hidden = mapLayer !== "effects";
  for (const tile of runtime.tiles) {
    const nationId = map.tileNationIds[tile.index] ?? null;
    const nationColor = map.nationById.get(nationId)?.color;
    let color = TERRAIN_COLORS[tile.terrain] ?? (tile.passable ? "#74865d" : "#315e68");
    if (tile.passable && !["terrain", "effects"].includes(mapLayer) && nationColor) color = nationColor;
    if (tile.passable && mapLayer === "regions" && tile.regionId) color = regionMapColor(color, tile.regionId);
    if (tile.passable && nationId === selectedNationId) color = colorMix(color, "#ffffff", 0.18);
    drawing.globalAlpha = tile.passable ? ["terrain", "effects"].includes(mapLayer) ? 0.94 : 0.82 : 1;
    drawing.fillStyle = color;
    drawing.fillRect(tile.x * scale, tile.y * scale, scale, scale);
    const tags = new Set(tile.geographyTags ?? []);
    const geographyTint = tags.has("volcano") ? "#a64b32"
      : tags.has("marsh") ? "#315e4c"
        : tags.has("forest") ? "#163c31"
          : tags.has("farmland") ? "#b3a04f"
            : tags.has("snowfield") ? "#d8e3de"
              : tags.has("desert") ? "#c2a15d"
                : tags.has("tidal_flat") ? "#718b75"
                  : null;
    if (geographyTint) {
      drawing.globalAlpha = tags.has("volcano") ? 0.58 : 0.3;
      drawing.fillStyle = geographyTint;
      drawing.fillRect(tile.x * scale, tile.y * scale, scale, scale);
    }
    if (mapLayer === "wars" && warRegionIds.has(tile.regionId)) {
      drawing.globalAlpha = 0.46;
      drawing.fillStyle = (tile.x + tile.y) % 2 ? "#b62929" : "#6f171b";
      drawing.fillRect(tile.x * scale, tile.y * scale, scale, scale);
    }
  }
  drawing.globalAlpha = ["terrain", "effects"].includes(mapLayer) ? 0.35 : mapLayer === "regions" ? 0.5 : 0.62;
  drawing.strokeStyle = mapLayer === "regions" ? "#172823" : "#f0d99c";
  drawing.lineWidth = mapLayer === "wars" ? 1.5 : 1;
  const visibleBorders = mapLayer === "regions" ? runtime.nations.regionBorderSegments ?? [] : map.borderSegments;
  for (const segment of visibleBorders) {
    drawing.beginPath();
    drawing.moveTo(segment.x1 * scale, segment.y1 * scale);
    drawing.lineTo(segment.x2 * scale, segment.y2 * scale);
    drawing.stroke();
  }
  drawing.globalAlpha = 0.5;
  drawing.strokeStyle = "#e4d5a0";
  drawing.lineWidth = 1;
  for (const road of map.roads) {
    if (road.available === false) continue;
    drawing.beginPath();
    let previousTile = null;
    for (const tileIndex of road.tileIndices) {
      const tile = runtime.tiles[tileIndex];
      if (!tile) continue;
      if (!previousTile || Math.abs(tile.x - previousTile.x) > runtime.terrain.width / 2) drawing.moveTo(tile.x * scale + 2, tile.y * scale + 2);
      else drawing.lineTo(tile.x * scale + 2, tile.y * scale + 2);
      previousTile = tile;
    }
    drawing.stroke();
  }
  if (mapLayer === "effects") drawWorldEffectFronts(drawing, effects, scale);
  drawing.globalAlpha = 1;
  for (const object of map.objects) {
    if (!object.settlementLevel) continue;
    drawing.fillStyle = warRegionIds.has(object.regionId) && mapLayer === "wars" ? "#fff1a6" : "#f4e5b5";
    drawing.strokeStyle = "rgba(25, 22, 17, .82)";
    drawing.lineWidth = .8;
    const size = object.settlementLevel === "city" ? 3.3 : object.settlementLevel === "town" ? 2.7 : 2.1;
    drawing.beginPath();
    drawing.arc(object.x * scale + 2, object.y * scale + 2, size, 0, Math.PI * 2);
    drawing.fill();
    drawing.stroke();
    if (object.settlementLevel !== "village") {
      drawing.beginPath();
      drawing.moveTo(object.x * scale, object.y * scale + 2);
      drawing.lineTo(object.x * scale + 2, object.y * scale - 1.5);
      drawing.lineTo(object.x * scale + 4, object.y * scale + 2);
      drawing.stroke();
    }
  }
  for (const tile of runtime.tiles.filter((candidate) => candidate.terrainSite)) {
    drawing.fillStyle = tile.terrainSite.category === "fantasy" ? "#d9c0ec" : tile.terrainSite.category === "astronomy" ? "#b6dbe7" : "#dc875c";
    drawing.save();
    drawing.translate(tile.x * scale + 2, tile.y * scale + 2);
    drawing.rotate(Math.PI / 4);
    drawing.fillRect(-1.5, -1.5, 3, 3);
    drawing.restore();
  }
  const militaryMission = state.military?.activeMission ?? null;
  elements.worldMissionLegend.hidden = !map.isCurrent || !militaryMission;
  if (map.isCurrent) {
    const playerX = state.player.x / V3_DETAIL_SCALE * scale;
    const playerY = state.player.y / V3_DETAIL_SCALE * scale;
    drawing.beginPath();
    drawing.arc(playerX, playerY, 6, 0, Math.PI * 2);
    drawing.strokeStyle = "#ffffff";
    drawing.lineWidth = 2;
    drawing.stroke();
    if (militaryMission) {
      const targetX = militaryMission.target.x / V3_DETAIL_SCALE * scale;
      const targetY = militaryMission.target.y / V3_DETAIL_SCALE * scale;
      drawing.beginPath();
      drawing.arc(targetX, targetY, 7, 0, Math.PI * 2);
      drawing.fillStyle = "rgba(116, 31, 27, .72)";
      drawing.fill();
      drawing.strokeStyle = "#ffd878";
      drawing.lineWidth = 2;
      drawing.stroke();
      drawing.strokeStyle = "#fff3bd";
      drawing.lineWidth = 1.35;
      drawing.beginPath();
      drawing.moveTo(targetX - 3, targetY - 3);
      drawing.lineTo(targetX + 3, targetY + 3);
      drawing.moveTo(targetX + 3, targetY - 3);
      drawing.lineTo(targetX - 3, targetY + 3);
      drawing.stroke();
    }
  }
  const location = getV3LocationSummary(context, state);
  elements.worldMapPosition.textContent = map.isCurrent
    ? militaryMission
      ? `${location.regionName} · 現在 ${state.player.x},${state.player.y} ／ 作戦 ${militaryMission.target.x},${militaryMission.target.y}`
      : `${location.regionName} · ${location.tile.name} · 詳細座標 ${state.player.x}, ${state.player.y}`
    : `${map.headline ?? map.reason} · ${formatWorldPeriod(map)}`;
}

function openWorldMap() {
  worldMapReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : elements.mapButton;
  elements.worldMap.hidden = false;
  mapHistoryIndex = null;
  drawWorldMap();
  elements.worldMap.querySelector("[data-v3-close='map']").focus();
}

function closeWorldMap() {
  elements.worldMap.hidden = true;
  const returnTarget = worldMapReturnFocus?.isConnected ? worldMapReturnFocus : elements.mapButton;
  worldMapReturnFocus = null;
  requestAnimationFrame(() => returnTarget?.focus());
}

function restoreWorldMapActionFocus(signature) {
  if (restoreActionFocus(elements.worldMap, signature)) return;
  if (focusAvailableElement(elements.worldHistory)) return;
  focusAvailableElement(elements.worldMap.querySelector("[data-v3-close='map']"));
}

function redrawWorldMapWithFocus(actionElement) {
  const signature = getActionFocusSignature(actionElement);
  drawWorldMap();
  requestAnimationFrame(() => restoreWorldMapActionFocus(signature));
}

async function advanceWorld(months = 1, actionElement = document.activeElement) {
  const amount = Number(months) === 12 ? 12 : 1;
  if (worldAdvanceBusy || !worldSimulation) return;
  if (amount === 12 && !window.confirm("世界を12か月進めます。戦争や国境が変化する場合があります。続けますか？")) return;
  const focusSignature = getActionFocusSignature(actionElement);
  const location = getV3LocationSummary(context, state);
  const previousNation = getV3NationAtTile(runtime, worldSimulation, location.tile.macroIndex)?.name ?? "無主地";
  worldAdvanceBusy = true;
  elements.worldDate.textContent = "世界を進行中…";
  elements.worldMap.querySelectorAll("[data-v3-world-advance]").forEach((button) => { button.disabled = true; });
  await new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    commitStateAction(createActionResult(state, { elapsedMinutes: amount * GAME_MINUTES_PER_MONTH }), {
      source: "world-map",
      event: actionEvent("world.time.advanced", "world-map", `世界を${amount}か月進行`, { months: amount }),
    });
    mapHistoryIndex = null;
    saveGame();
    renderGame();
    const currentNation = getV3NationAtTile(runtime, worldSimulation, location.tile.macroIndex)?.name ?? "無主地";
    showToast(previousNation === currentNation ? `${amount}か月進行しました。` : `現在地の支配が${currentNation}へ変わりました。`);
  } finally {
    worldAdvanceBusy = false;
    drawWorldMap();
    requestAnimationFrame(() => restoreWorldMapActionFocus(focusSignature));
  }
}

function handleAction(action) {
  if (state.pendingEncounter?.type === "enemy") return showToast("個人戦を決着させてください。");
  if (action === "map") return openWorldMap();
  if (action === "underworld") return openUnderworld();
  if (action === "military") return handleMilitaryAction();
  if (action === "commerce") {
    rememberModalFocus("commerce", elements.commerceButton);
    elements.commerceModal.hidden = false;
    renderCommerce();
    focusCommercePrimaryAction();
    return;
  }
  if (action === "menu") {
    rememberModalFocus("inventory", elements.inventoryButton);
    elements.inventoryModal.hidden = false;
    renderInventory();
    focusInventoryPrimaryAction();
    return;
  }
  if (action === "reset" && window.confirm("この端末のV3冒険を消して、起動画面へ戻りますか？")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

function applyUnderworldAction(action, options = {}) {
  try {
    const result = action();
    commitStateAction(result, {
      source: "criminal",
      event: options.event ?? (isActionResult(result) ? null : actionEvent("criminal.action.completed", "criminal", "地下活動を実行")),
    });
    saveGame();
    renderGame();
    showToast(state.messageLog[0]);
    requestAnimationFrame(focusUnderworldPrimaryAction);
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error));
  }
}

elements.openNew.addEventListener("click", () => {
  elements.newWorld.hidden = false;
  elements.openNew.hidden = true;
  elements.playerName.focus();
});
elements.cancelNew.addEventListener("click", () => {
  elements.newWorld.hidden = true;
  elements.openNew.hidden = false;
  elements.openNew.focus();
});
elements.newWorld.addEventListener("submit", async (event) => {
  event.preventDefault();
  const seed = elements.worldSeed.value.trim() || createSeed();
  await prepareWorld({ ...WORLD_CONFIG, seed, playerName: elements.playerName.value.trim() || "アレク", playerRaceId: elements.playerRace.value });
});
elements.continueButton.addEventListener("click", async () => {
  const saved = readSave();
  if (saved) await prepareWorld(saved.world, saved.field, saved.worldSimulation);
});

document.addEventListener("click", (event) => {
  const mapLayerAction = event.target.closest("[data-v3-map-layer]");
  const mapLayerId = mapLayerAction?.dataset.v3MapLayer;
  if (mapLayerId) {
    mapLayer = mapLayerId;
    redrawWorldMapWithFocus(mapLayerAction);
    return;
  }
  const nationAction = event.target.closest("[data-v3-select-nation]");
  const nationId = nationAction?.dataset.v3SelectNation;
  if (nationId) {
    selectedNationId = nationId;
    redrawWorldMapWithFocus(nationAction);
    return;
  }
  const worldAdvanceAction = event.target.closest("[data-v3-world-advance]");
  const worldAdvance = worldAdvanceAction?.dataset.v3WorldAdvance;
  if (worldAdvance) return advanceWorld(Number(worldAdvance), worldAdvanceAction);
  const historyCurrentAction = event.target.closest("[data-v3-history-current]");
  if (historyCurrentAction) {
    mapHistoryIndex = null;
    redrawWorldMapWithFocus(historyCurrentAction);
    return;
  }
  const move = event.target.closest("[data-v3-move]")?.dataset.v3Move;
  if (move) return movePlayer(move);
  const groupBattleAction = event.target.closest("[data-v3-group-battle]")?.dataset.v3GroupBattle;
  if (groupBattleAction === "start") return beginV3GroupBattle();
  if (groupBattleAction === "defer") {
    commitStateAction(deferV3GroupBattle(state), {
      source: "military",
      event: actionEvent("battle.deferred", "military", "集団戦を延期"),
    });
    saveGame();
    renderGame();
    elements.field.querySelector(".is-player")?.focus();
    return;
  }
  const encounterAction = event.target.closest("[data-v3-encounter]")?.dataset.v3Encounter;
  if (encounterAction) return applyEncounterAction(encounterAction);
  const tradeAction = event.target.closest("[data-v3-trade-action]");
  if (tradeAction) {
    try {
      let next = state;
      if (tradeAction.dataset.v3TradeAction === "observe") next = observeV3Market(context, state, worldSimulation);
      if (tradeAction.dataset.v3TradeAction === "buy") next = buyV3Commodity(context, state, tradeAction.dataset.v3Commodity, 1, worldSimulation);
      if (tradeAction.dataset.v3TradeAction === "sell") next = sellV3Commodity(context, state, tradeAction.dataset.v3Commodity, 1, worldSimulation);
      commitStateAction(next, {
        source: "merchant-trade",
        event: actionEvent(`merchant.${tradeAction.dataset.v3TradeAction}`, "merchant-trade", "市場取引を台帳へ記録", { commodityId: tradeAction.dataset.v3Commodity ?? null }),
      });
      saveGame(); rerenderCommerceWithFocus(tradeAction); showToast("交易台帳を更新しました。");
    } catch (error) { showToast(error.message); }
    return;
  }
  const foundStrategy = event.target.closest("[data-v3-company-found]")?.dataset.v3CompanyFound;
  if (foundStrategy) {
    const actionElement = event.target.closest("[data-v3-company-found]");
    try { commitStateAction(foundV3MerchantCompany(context, state, { strategyId: foundStrategy, name: document.querySelector("#v3CompanyName")?.value }), { source: "merchant-company", event: actionEvent("merchant.company.founded", "merchant-company", "商会を設立") }); saveGame(); rerenderCommerceWithFocus(actionElement); showToast("商会を設立しました。"); }
    catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-company-invest]")) {
    const actionElement = event.target.closest("[data-v3-company-invest]");
    try { commitStateAction(contributeV3CompanyCapital(state, 10), { source: "merchant-company", event: actionEvent("merchant.company.funded", "merchant-company", "商会へ追加出資", { amount: 10 }) }); saveGame(); rerenderCommerceWithFocus(actionElement); }
    catch (error) { showToast(error.message); }
    return;
  }
  const charterStart = event.target.closest("[data-v3-charter-start]");
  if (charterStart) {
    try { commitStateAction(startV3CharterApplication(context, state, charterStart.dataset.v3CharterStart, charterStart.dataset.v3Filing), { source: "merchant-company", event: actionEvent("merchant.charter.started", "merchant-company", "営業資格を申請", { nationId: charterStart.dataset.v3CharterStart }) }); saveGame(); rerenderCommerceWithFocus(charterStart); }
    catch (error) { showToast(error.message); }
    return;
  }
  const charterDecision = event.target.closest("[data-v3-charter-decision]");
  if (charterDecision) {
    try { commitStateAction(resolveV3CharterApplication(context, state, charterDecision.dataset.v3Application, charterDecision.dataset.v3CharterDecision), { source: "merchant-company", event: actionEvent("merchant.charter.resolved", "merchant-company", "営業資格申請を決着", { applicationId: charterDecision.dataset.v3Application }) }); saveGame(); rerenderCommerceWithFocus(charterDecision); }
    catch (error) { showToast(error.message); }
    return;
  }
  const hire = event.target.closest("[data-v3-company-hire]")?.dataset.v3CompanyHire;
  if (hire) {
    const actionElement = event.target.closest("[data-v3-company-hire]");
    try { commitStateAction(recruitV3CompanyStaff(context, state, hire), { source: "merchant-company", event: actionEvent("merchant.staff.recruited", "merchant-company", "商会人員を採用", { candidateId: hire }) }); saveGame(); rerenderCommerceWithFocus(actionElement); }
    catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-route-secure]")) {
    const form = elements.commerceContent.querySelector("[data-v3-route-form]");
    try {
      commitStateAction(secureV3CompanyRoute(context, state, {
        sourceId: form.querySelector("[data-v3-route-source]").value,
        destinationId: form.querySelector("[data-v3-route-destination]").value,
        commodityId: form.querySelector("[data-v3-route-commodity]").value,
        approachId: form.querySelector("[data-v3-route-approach]").value,
        leaderId: form.querySelector("[data-v3-route-leader]").value,
      }), { source: "merchant-company", event: actionEvent("merchant.route.secured", "merchant-company", "交易販路を確保") });
      saveGame(); rerenderCommerceWithFocus(event.target.closest("[data-v3-route-secure]"));
    } catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-branch-open]")) {
    const form = elements.commerceContent.querySelector("[data-v3-branch-form]");
    try {
      commitStateAction(openV3CompanyBranch(context, state, {
        formatId: form.querySelector("[data-v3-branch-format]").value,
        launchId: form.querySelector("[data-v3-branch-launch]").value,
        managerId: form.querySelector("[data-v3-branch-manager]").value,
      }), { source: "merchant-company", event: actionEvent("merchant.branch.opening", "merchant-company", "支店開設を開始") });
      saveGame(); rerenderCommerceWithFocus(event.target.closest("[data-v3-branch-open]"));
    } catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-company-month]")) {
    const actionElement = event.target.closest("[data-v3-company-month]");
    try { commitStateAction(advanceV3CompanyMonth(context, state), { source: "merchant-company" }); saveGame(); rerenderCommerceWithFocus(actionElement); }
    catch (error) { showToast(error.message); }
    return;
  }
  const incident = event.target.closest("[data-v3-incident]");
  if (incident) {
    try { commitStateAction(resolveV3CompanyIncident(state, incident.dataset.v3Incident, incident.dataset.v3Decision), { source: "merchant-company", event: actionEvent("merchant.incident.resolved", "merchant-company", "街道事故を解決", { incidentId: incident.dataset.v3Incident }) }); saveGame(); rerenderCommerceWithFocus(incident); }
    catch (error) { showToast(error.message); }
    return;
  }
  const itemIndex = event.target.closest("[data-v3-use-item]")?.dataset.v3UseItem;
  if (itemIndex !== undefined) {
    const actionElement = event.target.closest("[data-v3-use-item]");
    const signature = getActionFocusSignature(actionElement);
    const next = useV3Item(state, Number(itemIndex));
    if (next === state) return showToast("今は使う必要がない。");
    commitStateAction(next, { source: "inventory", event: actionEvent("inventory.item.used", "inventory", "所持品を使用", { itemIndex: Number(itemIndex) }) });
    saveGame();
    renderGame();
    requestAnimationFrame(() => {
      if (!restoreActionFocus(elements.inventoryList, signature)) focusInventoryPrimaryAction();
    });
    return;
  }
  const personalCrime = event.target.closest("[data-v3-personal-crime]")?.dataset.v3PersonalCrime;
  if (personalCrime) return applyUnderworldAction(() => resolveV3PersonalCrime(context, state, personalCrime));
  if (event.target.closest("[data-v3-criminal-broker]")) return applyUnderworldAction(() => discoverV3CriminalBroker(context, state));
  const recruit = event.target.closest("[data-v3-criminal-recruit]")?.dataset.v3CriminalRecruit;
  if (recruit) return applyUnderworldAction(() => recruitV3CriminalMember(context, state, recruit));
  if (event.target.closest("[data-v3-criminal-form]")) {
    const name = elements.underworldContent.querySelector("#v3CriminalOrganizationName")?.value;
    return applyUnderworldAction(() => formV3CriminalOrganization(context, state, name));
  }
  if (event.target.closest("[data-v3-criminal-fund]")) return applyUnderworldAction(() => fundV3CriminalOrganization(context, state, 1));
  if (event.target.closest("[data-v3-criminal-withdraw]")) return applyUnderworldAction(() => withdrawV3CriminalOrganization(context, state, 1));
  if (event.target.closest("[data-v3-criminal-distribute]")) return applyUnderworldAction(() => distributeV3CriminalProfits(context, state));
  if (event.target.closest("[data-v3-criminal-cycle]")) return applyUnderworldAction(
    () => advanceV3CriminalCycle(context, state),
  );
  const report = event.target.closest("[data-v3-criminal-report]")?.dataset.v3CriminalReport;
  if (report) return applyUnderworldAction(() => resolveV3CriminalReport(context, state, report));
  const decision = event.target.closest("[data-v3-criminal-decision]");
  if (decision) return applyUnderworldAction(() => resolveV3CriminalDecision(context, state, decision.dataset.v3CriminalDecision, decision.dataset.v3CriminalChoice));
  const orderButton = event.target.closest("[data-v3-criminal-order]");
  if (orderButton) {
    const card = orderButton.closest("[data-v3-operation-card]");
    const input = {
      optionId: card.dataset.v3OperationCard,
      leaderId: card.querySelector("[data-v3-criminal-leader]")?.value,
      supportId: card.querySelector("[data-v3-criminal-support]")?.value || null,
      approach: card.querySelector("[data-v3-criminal-approach]")?.value,
    };
    return applyUnderworldAction(() => issueV3CriminalOperation(context, state, input));
  }
  const action = event.target.closest("[data-v3-action]")?.dataset.v3Action;
  if (action) return handleAction(action);
  const close = event.target.closest("[data-v3-close]")?.dataset.v3Close;
  if (close === "map") closeWorldMap();
  if (["inventory", "underworld", "commerce"].includes(close)) closeModal(close);
});

elements.worldHistory.addEventListener("input", () => {
  const value = Number(elements.worldHistory.value);
  const maximum = Number(elements.worldHistory.max);
  mapHistoryIndex = value >= maximum ? null : value;
  drawWorldMap();
});

elements.worldCanvas.addEventListener("click", (event) => {
  const map = currentMapView();
  const bounds = elements.worldCanvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const x = Math.min(runtime.terrain.width - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * runtime.terrain.width)));
  const y = Math.min(runtime.terrain.height - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * runtime.terrain.height)));
  const nationId = map.tileNationIds[y * runtime.terrain.width + x];
  if (!nationId || !map.nationById.has(nationId)) return showToast("海または無主地です。");
  selectedNationId = nationId;
  drawWorldMap();
});

document.addEventListener("keydown", (event) => {
  if (!state || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (event.key === "Escape") {
    if (!elements.worldMap.hidden) closeWorldMap();
    else if (!elements.inventoryModal.hidden) closeModal("inventory");
    else if (!elements.underworldModal.hidden) closeModal("underworld");
    else if (!elements.commerceModal.hidden) closeModal("commerce");
    return;
  }
  if (state.pendingEncounter?.type === "enemy") {
    if (["Enter", " ", "f", "F"].includes(event.key)) {
      event.preventDefault();
      applyEncounterAction("fight");
    }
    return;
  }
  if (state.pendingEncounter) return;
  const direction = { ArrowUp: "north", w: "north", W: "north", ArrowRight: "east", d: "east", D: "east", ArrowDown: "south", s: "south", S: "south", ArrowLeft: "west", a: "west", A: "west" }[event.key];
  if (!direction) return;
  event.preventDefault();
  movePlayer(direction);
});

const returnedGroupBattle = readV3GroupBattleBridge(localStorage);
const returnedSave = readSave();
if (returnedGroupBattle && returnedSave?.field?.military?.activeMission?.id === returnedGroupBattle.missionId) {
  void prepareWorld(returnedSave.world, returnedSave.field, returnedSave.worldSimulation, returnedGroupBattle).catch((error) => {
    clearV3GroupBattleBridge(localStorage);
    updateContinueButton();
    showToast(error.message);
  });
} else {
  if (returnedGroupBattle) clearV3GroupBattleBridge(localStorage);
  updateContinueButton();
}
