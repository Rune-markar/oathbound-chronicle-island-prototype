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
  terrainEffect: document.querySelector("#v3TerrainEffect"),
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
  worldMapPosition: document.querySelector("#v3WorldMapPosition"),
  toast: document.querySelector("#v3Toast"),
};

let runtime = null;
let context = null;
let state = null;
let worldOptions = null;
let backgroundTimer = null;
let toastTimer = null;

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
  if (!state || !worldOptions) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, world: worldOptions, field: state, savedAt: new Date().toISOString() }));
}

function updateContinueButton() {
  const saved = readSave();
  elements.continueButton.disabled = !saved;
  elements.continueSummary.textContent = saved
    ? `${saved.field.player?.name ?? "冒険者"} · ${saved.field.steps ?? 0}歩 · 周辺${saved.field.generatedChunks?.length ?? 0}区画生成済み`
    : "保存された冒険はありません";
}

function setGenerationProgress(progress, label) {
  const amount = Math.max(0, Math.min(100, Math.round(progress)));
  elements.generationProgress.setAttribute("aria-valuenow", String(amount));
  elements.generationProgress.style.setProperty("--progress", `${amount}%`);
  elements.generationPercent.textContent = `${amount}%`;
  if (label) elements.generationDetail.textContent = label;
}

async function prepareWorld(options, savedField = null) {
  elements.launch.hidden = true;
  elements.game.hidden = true;
  elements.generation.hidden = false;
  elements.generationLabel.textContent = savedField ? "世界を読み戻しています" : "概算世界を構築しています";
  setGenerationProgress(0, "地形の輪郭を定めています。");
  const generatedWorld = createGeneratedWorldState(options);
  runtime = await buildGeneratedWorldAsync(generatedWorld, ({ progress, label }) => setGenerationProgress(progress * 0.88, label));
  setGenerationProgress(92, "現在地の周囲を1マス単位へ展開しています。");
  context = createV3WorldContext(runtime, options.seed);
  state = savedField ? normalizeV3FieldState(context, savedField) : createV3FieldState(context, { playerName: options.playerName });
  worldOptions = { ...WORLD_CONFIG, ...options, playerName: state.player.name };
  setGenerationProgress(100, "足元の世界が形になりました。");
  saveGame();
  await new Promise((resolve) => setTimeout(resolve, 260));
  elements.generation.hidden = true;
  elements.game.hidden = false;
  renderGame();
  scheduleBackgroundGeneration();
  window.__v3Game = { get state() { return state; }, get context() { return context; }, get runtime() { return runtime; }, move: movePlayer };
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
  elements.nationName.textContent = location.nationName;
  elements.regionName.textContent = location.regionName;
  elements.playerLabel.textContent = state.player.name;
  elements.levelLabel.textContent = `LV ${state.player.level}`;
  elements.hpLabel.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  elements.hpBar.style.width = `${Math.max(0, state.player.hp / state.player.maxHp * 100)}%`;
  elements.xpLabel.textContent = String(state.player.xp);
  elements.goldLabel.textContent = String(state.player.gold);
  elements.clockLabel.textContent = `第${location.day}日 ${location.time}`;
  elements.terrainLabel.textContent = location.tile.name;
  elements.terrainEffect.textContent = `${location.tile.passable ? `移動${location.tile.travelMinutes}分` : "通行不能"} · ${location.tile.terrainNote}`;
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

function drawWorldMap() {
  const canvas = elements.worldCanvas;
  const scale = 4;
  canvas.width = runtime.terrain.width * scale;
  canvas.height = runtime.terrain.height * scale;
  const drawing = canvas.getContext("2d");
  drawing.imageSmoothingEnabled = false;
  drawing.fillStyle = "#214650";
  drawing.fillRect(0, 0, canvas.width, canvas.height);
  for (const tile of runtime.tiles) {
    let color = TERRAIN_COLORS[tile.terrain] ?? (tile.passable ? "#74865d" : "#315e68");
    if (tile.passable && tile.nationId) color = runtime.nationById.get(tile.nationId)?.color ?? color;
    drawing.globalAlpha = tile.passable ? 0.78 : 1;
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
  }
  drawing.globalAlpha = 0.55;
  drawing.strokeStyle = "#e4d5a0";
  drawing.lineWidth = 1;
  for (const road of runtime.nations.roads ?? []) {
    drawing.beginPath();
    let previousTile = null;
    for (let index = 0; index < road.tileIndices.length; index += 1) {
      const tile = runtime.tiles[road.tileIndices[index]];
      if (!tile) continue;
      if (!previousTile || Math.abs(tile.x - previousTile.x) > runtime.terrain.width / 2) drawing.moveTo(tile.x * scale + 2, tile.y * scale + 2);
      else drawing.lineTo(tile.x * scale + 2, tile.y * scale + 2);
      previousTile = tile;
    }
    drawing.stroke();
  }
  drawing.globalAlpha = 1;
  for (const object of runtime.nations.objects ?? []) {
    if (!object.settlementLevel) continue;
    drawing.fillStyle = "#f4e5b5";
    const size = object.settlementLevel === "city" ? 4 : object.settlementLevel === "town" ? 3 : 2;
    drawing.fillRect(object.x * scale + 2 - size / 2, object.y * scale + 2 - size / 2, size, size);
  }
  for (const tile of runtime.tiles.filter((candidate) => candidate.terrainSite)) {
    drawing.fillStyle = tile.terrainSite.category === "fantasy" ? "#d9c0ec" : tile.terrainSite.category === "astronomy" ? "#b6dbe7" : "#dc875c";
    drawing.fillRect(tile.x * scale + 1, tile.y * scale + 1, 2, 2);
  }
  const playerX = state.player.x / V3_DETAIL_SCALE * scale;
  const playerY = state.player.y / V3_DETAIL_SCALE * scale;
  drawing.beginPath();
  drawing.arc(playerX, playerY, 6, 0, Math.PI * 2);
  drawing.strokeStyle = "#ffffff";
  drawing.lineWidth = 2;
  drawing.stroke();
  const location = getV3LocationSummary(context, state);
  elements.worldMapPosition.textContent = `${location.regionName} · ${location.tile.name} · 詳細座標 ${state.player.x}, ${state.player.y}`;
}

function openWorldMap() {
  elements.worldMap.hidden = false;
  drawWorldMap();
  elements.worldMap.querySelector("[data-v3-close='map']").focus();
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
  if (saved) await prepareWorld(saved.world, saved.field);
});

document.addEventListener("click", (event) => {
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
