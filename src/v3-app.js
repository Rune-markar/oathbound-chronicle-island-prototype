import {
  buildGeneratedWorldAsync,
  createGeneratedWorldState,
} from "./generated-world-system.js";
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
  advanceV3WorldSimulation,
  buildV3WorldPrehistory,
  getV3NationAtTile,
  getV3NationDossier,
  getV3WorldChronicle,
  getV3WorldSimulationView,
  normalizeV3WorldSimulation,
  V3_PREHISTORY_MONTHS,
} from "./v3-world-simulation.js";

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
  levelLabel: document.querySelector("#v3LevelLabel"),
  hpLabel: document.querySelector("#v3HpLabel"),
  hpBar: document.querySelector("#v3HpBar"),
  xpLabel: document.querySelector("#v3XpLabel"),
  goldLabel: document.querySelector("#v3GoldLabel"),
  field: document.querySelector("#v3Field"),
  clockLabel: document.querySelector("#v3ClockLabel"),
  terrainLabel: document.querySelector("#v3TerrainLabel"),
  nearbyLabel: document.querySelector("#v3NearbyLabel"),
  chunkLabel: document.querySelector("#v3ChunkLabel"),
  messages: document.querySelector("#v3Messages"),
  movementPad: document.querySelector("#v3MovementPad"),
  personalBattleStatus: document.querySelector("#v3PersonalBattleStatus"),
  personalBattleEnemy: document.querySelector("#v3PersonalBattleEnemy"),
  personalBattleLevel: document.querySelector("#v3PersonalBattleLevel"),
  personalBattleHpBar: document.querySelector("#v3PersonalBattleHpBar"),
  personalBattleHpLabel: document.querySelector("#v3PersonalBattleHpLabel"),
  personalBattleCommands: document.querySelector("#v3PersonalBattleCommands"),
  mapButton: document.querySelector('[data-v3-action="map"]'),
  inventoryButton: document.querySelector('[data-v3-action="menu"]'),
  encounterModal: document.querySelector("#v3EncounterModal"),
  encounterSymbol: document.querySelector("#v3EncounterSymbol"),
  encounterType: document.querySelector("#v3EncounterType"),
  encounterTitle: document.querySelector("#v3EncounterTitle"),
  encounterText: document.querySelector("#v3EncounterText"),
  encounterActions: document.querySelector("#v3EncounterActions"),
  inventoryModal: document.querySelector("#v3InventoryModal"),
  inventoryList: document.querySelector("#v3InventoryList"),
  worldMap: document.querySelector("#v3WorldMap"),
  worldCanvas: document.querySelector("#v3WorldCanvas"),
  worldDate: document.querySelector("#v3WorldDate"),
  worldHistory: document.querySelector("#v3WorldHistory"),
  worldHistoryLabel: document.querySelector("#v3WorldHistoryLabel"),
  worldStats: document.querySelector("#v3WorldStats"),
  worldNationList: document.querySelector("#v3WorldNationList"),
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
const worldChronicleCache = new WeakMap();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function createSeed() {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `v3-${Date.now().toString(36)}-${values[0].toString(36)}-${values[1].toString(36)}`.slice(0, 80);
}

function readSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed?.version === 3 && parsed.world?.seed && parsed.field ? parsed : null;
  } catch {
    return null;
  }
}

function saveGame() {
  if (!state || !worldOptions || !worldSimulation) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 3,
    world: worldOptions,
    field: state,
    worldSimulation,
    savedAt: new Date().toISOString(),
  }));
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

async function prepareWorld(options, savedField = null, savedWorldSimulation = null) {
  elements.launch.hidden = true;
  elements.game.hidden = true;
  elements.generation.hidden = false;
  elements.generationLabel.textContent = savedField ? "世界を読み戻しています" : "概算世界を構築しています";
  setGenerationProgress(0, "地形の輪郭を定めています。");
  const generatedWorld = createGeneratedWorldState(options);
  runtime = await buildGeneratedWorldAsync(generatedWorld, ({ progress, label }) => setGenerationProgress(progress * 0.68, label));
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
  state = savedField ? normalizeV3FieldState(context, savedField) : createV3FieldState(context, { playerName: options.playerName });
  worldOptions = { ...WORLD_CONFIG, ...options, playerName: state.player.name };
  mapHistoryIndex = null;
  selectedNationId = null;
  setGenerationProgress(100, "足元の世界が形になりました。");
  saveGame();
  await new Promise((resolve) => setTimeout(resolve, 260));
  elements.generation.hidden = true;
  elements.game.hidden = false;
  renderGame();
  scheduleBackgroundGeneration();
  window.__v3Game = {
    get state() { return state; },
    get context() { return context; },
    get runtime() { return runtime; },
    get worldSimulation() { return worldSimulation; },
    move: movePlayer,
    advanceWorld,
    openWorldMap,
  };
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

function renderField() {
  const view = getV3FieldView(context, state);
  const personalEnemy = state.pendingEncounter?.type === "enemy" ? state.pendingEncounter : null;
  elements.field.style.setProperty("--field-columns", view.columns);
  elements.field.setAttribute("aria-label", personalEnemy ? `${personalEnemy.name}との個人戦。探索中と同じ周辺フィールド` : "周辺フィールド");
  elements.field.innerHTML = view.tiles.map((tile) => {
    const adjacent = Math.abs(tile.dx) + Math.abs(tile.dy) === 1;
    const direction = tile.dx === 1 ? "east" : tile.dx === -1 ? "west" : tile.dy === 1 ? "south" : "north";
    const hidden = !tile.visible && !tile.player;
    const encounterTile = Boolean(personalEnemy && personalEnemy.worldX === tile.x && personalEnemy.worldY === tile.y);
    const visibleEntity = encounterTile ? personalEnemy : tile.entity;
    const sprites = [
      tile.player ? `<b class="v3-player-sprite" aria-label="${escapeHtml(state.player.name)}">旅</b>` : "",
      !hidden && visibleEntity ? `<b class="v3-entity is-${escapeHtml(visibleEntity.type)}" aria-label="${escapeHtml(visibleEntity.name)}">${escapeHtml(visibleEntity.symbol)}</b>` : "",
    ].filter(Boolean);
    const symbol = sprites.length > 1 ? `<span class="v3-combatants">${sprites.join("")}</span>`
      : sprites[0] ?? (hidden ? "" : `<span>${escapeHtml(tile.symbol)}</span>`);
    const labelParts = [hidden ? "未踏" : tile.name];
    if (tile.player) labelParts.push(`${state.player.name}の現在地`);
    if (!hidden && visibleEntity) labelParts.push(visibleEntity.name);
    return `<button type="button" role="gridcell" class="v3-tile is-${escapeHtml(hidden ? "fog" : tile.type)}${tile.player ? " is-player" : ""}${personalEnemy && tile.player ? " is-combat-player" : ""}${encounterTile ? " is-combat-enemy" : ""}${adjacent ? " is-adjacent" : ""}" data-x="${tile.x}" data-y="${tile.y}" ${adjacent && tile.passable && !state.pendingEncounter ? `data-v3-move="${direction}"` : ""} aria-label="${escapeHtml(labelParts.join("、"))}" tabindex="${tile.player ? "0" : "-1"}">${symbol}</button>`;
  }).join("");
}

function renderEncounter() {
  const encounter = state.pendingEncounter;
  const personalEnemy = encounter?.type === "enemy" ? encounter : null;
  elements.game.classList.toggle("is-personal-battle", Boolean(personalEnemy));
  elements.personalBattleStatus.hidden = !personalEnemy;
  elements.personalBattleCommands.hidden = !personalEnemy;
  elements.movementPad.hidden = Boolean(personalEnemy);
  elements.mapButton.disabled = Boolean(personalEnemy);
  elements.inventoryButton.disabled = Boolean(personalEnemy);
  elements.encounterModal.hidden = !encounter || Boolean(personalEnemy);
  if (!encounter) return;
  if (personalEnemy) {
    elements.personalBattleEnemy.textContent = personalEnemy.name;
    elements.personalBattleLevel.textContent = `LV ${personalEnemy.level}`;
    elements.personalBattleHpBar.style.width = `${Math.max(0, personalEnemy.hp / personalEnemy.maxHp * 100)}%`;
    elements.personalBattleHpLabel.textContent = `${personalEnemy.hp} / ${personalEnemy.maxHp}`;
    return;
  }
  elements.encounterSymbol.textContent = encounter.symbol;
  elements.encounterType.textContent = encounter.role === "merchant" ? "TRAVELING MERCHANT" : "FIELD ENCOUNTER";
  elements.encounterTitle.textContent = encounter.name;
  elements.encounterText.textContent = encounter.message;
  elements.encounterActions.innerHTML = `${encounter.role === "merchant" ? `<button class="is-primary" type="button" data-v3-encounter="buy">薬草を買う · 銀貨${encounter.price ?? 5}</button>` : '<button class="is-primary" type="button" data-v3-encounter="talk">話す</button>'}<button type="button" data-v3-encounter="leave">別れる</button>`;
}

function renderInventory() {
  const items = state.player.inventory;
  elements.inventoryList.innerHTML = items.length ? items.map((item, index) => `<button type="button" data-v3-use-item="${index}" ${item.heal && state.player.hp < state.player.maxHp ? "" : "disabled"}><i>${escapeHtml(item.id === "medicinal-herb" ? "草" : item.id === "wild-berries" ? "実" : "物")}</i><span><strong>${escapeHtml(item.name)}</strong><small>${item.heal ? `HPを${item.heal}回復` : "素材"}</small></span><b>${item.heal ? "使う" : "所持"}</b></button>`).join("") : "<p>道具はまだ持っていない。</p>";
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
  elements.levelLabel.textContent = `LV ${state.player.level}`;
  elements.hpLabel.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  elements.hpBar.style.width = `${Math.max(0, state.player.hp / state.player.maxHp * 100)}%`;
  elements.xpLabel.textContent = String(state.player.xp);
  elements.goldLabel.textContent = String(state.player.gold);
  elements.clockLabel.textContent = `第${location.day}日 ${location.time}`;
  elements.terrainLabel.textContent = location.tile.name;
  elements.nearbyLabel.textContent = location.nearestSettlement
    ? `${location.nearestSettlement.settlement.name}まで約${Math.round(location.nearestSettlement.distance)}歩`
    : "近くに集落はない";
  elements.chunkLabel.textContent = `詳細生成 ${state.generatedChunks.length}区画 · ${state.steps}歩`;
  elements.messages.innerHTML = state.messageLog.map((message, index) => `<p${index === 0 ? ' class="is-latest"' : ""}>${escapeHtml(message)}</p>`).join("");
  renderField();
  renderEncounter();
  renderInventory();
}

function movePlayer(direction) {
  const encounterBeforeMove = state.pendingEncounter;
  const next = moveV3Player(context, state, direction);
  if (next === state) return;
  state = next;
  saveGame();
  renderGame();
  if (!encounterBeforeMove && state.pendingEncounter?.type === "enemy") {
    requestAnimationFrame(() => elements.personalBattleCommands.querySelector("button")?.focus());
  }
}

function applyEncounterAction(action) {
  state = resolveV3Encounter(context, state, action);
  saveGame();
  renderGame();
  if (state.pendingEncounter?.type === "enemy") elements.personalBattleCommands.querySelector("button")?.focus();
  else elements.field.querySelector(".is-player")?.focus();
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
    elements.worldDossier.innerHTML = `<header><i style="--nation-color:${escapeHtml(dossier.nation.color)}"></i><div><small>${dossier.isHistorical ? "HISTORICAL POLITY" : "NATION DOSSIER"}</small><strong>${escapeHtml(dossier.nation.name)}</strong><span>${escapeHtml(dossier.nation.government ?? "統治形態不明")}</span></div></header><dl><div><dt>領域</dt><dd>${dossier.regions.length}地方</dd></div><div><dt>人口</dt><dd>${Math.round(dossier.population).toLocaleString("ja-JP")}人</dd></div><div><dt>集落</dt><dd>都${dossier.settlementCounts.city}・町${dossier.settlementCounts.town}・村${dossier.settlementCounts.village}</dd></div><div><dt>隣国</dt><dd>${dossier.neighbors.length}勢力</dd></div>${condition ? `<div><dt>結束</dt><dd>${condition.cohesion}</dd></div><div><dt>備蓄</dt><dd>${condition.reserves}</dd></div><div><dt>態勢</dt><dd>${escapeHtml(condition.posture)}</dd></div><div><dt>緊張関係</dt><dd>${relationWarning}</dd></div>` : ""}</dl><p class="v3-dossier-war">${warText}</p>${dossier.latestAction ? `<p><strong>直近の判断</strong><span>${escapeHtml(dossier.latestAction.title)}</span><small>${escapeHtml(dossier.latestAction.summary)}</small></p>` : ""}`;
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
  if (!selectedNationId || !map.nationById.has(selectedNationId) || regionCountFor(map, selectedNationId) === 0) {
    const location = getV3LocationSummary(context, state);
    selectedNationId = map.tileNationIds[location.tile.macroIndex] ?? map.nations.find((nation) => regionCountFor(map, nation.id) > 0)?.id ?? null;
  }
  renderWorldPanels(map);
  const canvas = elements.worldCanvas;
  const scale = 4;
  canvas.width = runtime.terrain.width * scale;
  canvas.height = runtime.terrain.height * scale;
  const drawing = canvas.getContext("2d");
  drawing.imageSmoothingEnabled = false;
  drawing.fillStyle = "#214650";
  drawing.fillRect(0, 0, canvas.width, canvas.height);
  const warRegionIds = new Set(map.activeWars.map((war) => war.targetRegionId).filter(Boolean));
  for (const tile of runtime.tiles) {
    const nationId = map.tileNationIds[tile.index] ?? null;
    const nationColor = map.nationById.get(nationId)?.color;
    let color = TERRAIN_COLORS[tile.terrain] ?? (tile.passable ? "#74865d" : "#315e68");
    if (tile.passable && mapLayer !== "terrain" && nationColor) color = nationColor;
    if (tile.passable && mapLayer === "regions" && tile.regionId) color = regionMapColor(color, tile.regionId);
    if (tile.passable && nationId === selectedNationId) color = colorMix(color, "#ffffff", 0.18);
    drawing.globalAlpha = tile.passable ? mapLayer === "terrain" ? 0.94 : 0.82 : 1;
    drawing.fillStyle = color;
    drawing.fillRect(tile.x * scale, tile.y * scale, scale, scale);
    if (tile.feature === "forest" && ["terrain", "regions"].includes(mapLayer)) {
      drawing.globalAlpha = 0.28;
      drawing.fillStyle = "#163c31";
      drawing.fillRect(tile.x * scale, tile.y * scale, scale, scale);
    }
    if (mapLayer === "wars" && warRegionIds.has(tile.regionId)) {
      drawing.globalAlpha = 0.46;
      drawing.fillStyle = (tile.x + tile.y) % 2 ? "#b62929" : "#6f171b";
      drawing.fillRect(tile.x * scale, tile.y * scale, scale, scale);
    }
  }
  drawing.globalAlpha = mapLayer === "terrain" ? 0.35 : mapLayer === "regions" ? 0.5 : 0.62;
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
  drawing.globalAlpha = 1;
  for (const object of map.objects) {
    if (!object.settlementLevel) continue;
    drawing.fillStyle = warRegionIds.has(object.regionId) && mapLayer === "wars" ? "#fff1a6" : "#f4e5b5";
    const size = object.settlementLevel === "city" ? 4 : object.settlementLevel === "town" ? 3 : 2;
    drawing.fillRect(object.x * scale + 2 - size / 2, object.y * scale + 2 - size / 2, size, size);
  }
  if (map.isCurrent) {
    const playerX = state.player.x / V3_DETAIL_SCALE * scale;
    const playerY = state.player.y / V3_DETAIL_SCALE * scale;
    drawing.beginPath();
    drawing.arc(playerX, playerY, 6, 0, Math.PI * 2);
    drawing.strokeStyle = "#ffffff";
    drawing.lineWidth = 2;
    drawing.stroke();
  }
  const location = getV3LocationSummary(context, state);
  elements.worldMapPosition.textContent = map.isCurrent
    ? `${location.regionName} · 詳細座標 ${state.player.x}, ${state.player.y}`
    : `${map.headline ?? map.reason} · ${formatWorldPeriod(map)}`;
}

function openWorldMap() {
  elements.worldMap.hidden = false;
  mapHistoryIndex = null;
  drawWorldMap();
  elements.worldMap.querySelector("[data-v3-close='map']").focus();
}

async function advanceWorld(months = 1) {
  const amount = Number(months) === 12 ? 12 : 1;
  if (worldAdvanceBusy || !worldSimulation) return;
  if (amount === 12 && !window.confirm("世界を12か月進めます。戦争や国境が変化する場合があります。続けますか？")) return;
  const location = getV3LocationSummary(context, state);
  const previousNation = getV3NationAtTile(runtime, worldSimulation, location.tile.macroIndex)?.name ?? "無主地";
  worldAdvanceBusy = true;
  elements.worldDate.textContent = "世界を進行中…";
  elements.worldMap.querySelectorAll("[data-v3-world-advance]").forEach((button) => { button.disabled = true; });
  await new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    worldSimulation = advanceV3WorldSimulation(runtime, worldSimulation, amount);
    mapHistoryIndex = null;
    saveGame();
    renderGame();
    const currentNation = getV3NationAtTile(runtime, worldSimulation, location.tile.macroIndex)?.name ?? "無主地";
    showToast(previousNation === currentNation ? `${amount}か月進行しました。` : `現在地の支配が${currentNation}へ変わりました。`);
  } finally {
    worldAdvanceBusy = false;
    drawWorldMap();
  }
}

function handleAction(action) {
  if (state.pendingEncounter?.type === "enemy") return showToast("個人戦を決着させてください。");
  if (action === "map") return openWorldMap();
  if (action === "menu") {
    elements.inventoryModal.hidden = false;
    renderInventory();
    elements.inventoryModal.querySelector("[data-v3-close='inventory']").focus();
    return;
  }
  if (action === "reset" && window.confirm("この端末のV3冒険を消して、起動画面へ戻りますか？")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
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
  await prepareWorld({ ...WORLD_CONFIG, seed, playerName: elements.playerName.value.trim() || "アレク" });
});
elements.continueButton.addEventListener("click", async () => {
  const saved = readSave();
  if (saved) await prepareWorld(saved.world, saved.field, saved.worldSimulation);
});

document.addEventListener("click", (event) => {
  const mapLayerId = event.target.closest("[data-v3-map-layer]")?.dataset.v3MapLayer;
  if (mapLayerId) {
    mapLayer = mapLayerId;
    drawWorldMap();
    return;
  }
  const nationId = event.target.closest("[data-v3-select-nation]")?.dataset.v3SelectNation;
  if (nationId) {
    selectedNationId = nationId;
    drawWorldMap();
    return;
  }
  const worldAdvance = event.target.closest("[data-v3-world-advance]")?.dataset.v3WorldAdvance;
  if (worldAdvance) return advanceWorld(Number(worldAdvance));
  if (event.target.closest("[data-v3-history-current]")) {
    mapHistoryIndex = null;
    drawWorldMap();
    return;
  }
  const move = event.target.closest("[data-v3-move]")?.dataset.v3Move;
  if (move) return movePlayer(move);
  const encounterAction = event.target.closest("[data-v3-encounter]")?.dataset.v3Encounter;
  if (encounterAction) return applyEncounterAction(encounterAction);
  const itemIndex = event.target.closest("[data-v3-use-item]")?.dataset.v3UseItem;
  if (itemIndex !== undefined) {
    const next = useV3Item(state, Number(itemIndex));
    if (next === state) return showToast("今は使う必要がない。");
    state = next;
    saveGame();
    renderGame();
    return;
  }
  const action = event.target.closest("[data-v3-action]")?.dataset.v3Action;
  if (action) return handleAction(action);
  const close = event.target.closest("[data-v3-close]")?.dataset.v3Close;
  if (close === "map") elements.worldMap.hidden = true;
  if (close === "inventory") elements.inventoryModal.hidden = true;
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
    if (!elements.worldMap.hidden) elements.worldMap.hidden = true;
    else if (!elements.inventoryModal.hidden) elements.inventoryModal.hidden = true;
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

updateContinueButton();
