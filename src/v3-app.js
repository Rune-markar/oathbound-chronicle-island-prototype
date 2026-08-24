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
  advanceV3CompanyMonth,
  buyV3Commodity,
  contributeV3CompanyCapital,
  foundV3MerchantCompany,
  getV3MerchantView,
  normalizeV3MerchantState,
  observeV3Market,
  openV3CompanyBranch,
  recruitV3CompanyStaff,
  resolveV3CharterApplication,
  resolveV3CompanyIncident,
  secureV3CompanyRoute,
  sellV3Commodity,
  startV3CharterApplication,
} from "./v3-merchant-system.js";

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
  commerceButton: document.querySelector('[data-v3-action="commerce"]'),
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
  commerceModal: document.querySelector("#v3CommerceModal"),
  commerceContent: document.querySelector("#v3CommerceContent"),
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
  normalizeV3MerchantState(state);
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
  elements.commerceButton.disabled = Boolean(personalEnemy);
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

function renderCommerce() {
  const previousScroll = elements.commerceContent.scrollTop;
  const model = getV3MerchantView(context, state);
  const cargoById = Object.fromEntries(model.cargo.map((entry) => [entry.commodityId, entry]));
  const market = model.market;
  const marketBlock = market ? `<section class="v3-commerce-section"><header><div><small>CURRENT MARKET</small><h2>${escapeHtml(model.marketSettlement.name)}の市場</h2></div><button type="button" data-v3-trade-action="observe">相場を記録</button></header><div class="v3-market-grid">${model.commodities.map((commodity) => {
    const good = market.goods[commodity.id];
    const cargo = cargoById[commodity.id];
    return `<article><header><strong>${escapeHtml(commodity.name)}</strong><small>在庫${good.stock}</small></header><p>仕入 ${good.buyPrice} ／ 売却 ${good.sellPrice}</p><div><button type="button" data-v3-trade-action="buy" data-v3-commodity="${commodity.id}" ${state.player.gold < good.buyPrice || good.stock < 1 ? "disabled" : ""}>1個仕入</button><button type="button" data-v3-trade-action="sell" data-v3-commodity="${commodity.id}" ${cargo?.quantity ? "" : "disabled"}>1個売却${cargo?.quantity ? ` · 所持${cargo.quantity}` : ""}</button></div></article>`;
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
    const staff = model.company.staff.map((entry) => `<li><strong>${escapeHtml(entry.name)} · ${escapeHtml(entry.roleName)}</strong><span>${entry.assignmentId ? "配置済み" : "配置待ち"} · 月給${entry.wage}</span></li>`).join("") || "<li>人員なし</li>";
    const candidates = model.candidates.map((entry) => `<button type="button" data-v3-company-hire="${escapeHtml(entry.id)}" ${model.company.treasury < entry.signingBonus ? "disabled" : ""}><strong>${escapeHtml(entry.name)} · ${escapeHtml(entry.roleName)}</strong><small>${escapeHtml(entry.originSettlementName)}出身 · 契約${entry.signingBonus} · 月給${entry.wage}</small></button>`).join("") || "<p>候補者は全員雇用済みです。</p>";
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
  const primary = elements.commerceContent.querySelector([
    '[data-v3-trade-action="observe"]:not(:disabled)',
    '[data-v3-company-found]:not(:disabled)',
    '[data-v3-charter-decision]:not(:disabled)',
    '[data-v3-charter-start]:not(:disabled)',
    '[data-v3-company-hire]:not(:disabled)',
    '[data-v3-route-secure]:not(:disabled)',
    '[data-v3-branch-open]:not(:disabled)',
    '[data-v3-company-month]:not(:disabled)',
  ].join(", "));
  (primary ?? elements.commerceModal.querySelector("[data-v3-close='commerce']"))?.focus();
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
  if (!elements.commerceModal.hidden) renderCommerce();
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
  if (action === "commerce") {
    elements.commerceModal.hidden = false;
    renderCommerce();
    focusCommercePrimaryAction();
    return;
  }
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
  const tradeAction = event.target.closest("[data-v3-trade-action]");
  if (tradeAction) {
    try {
      if (tradeAction.dataset.v3TradeAction === "observe") state = observeV3Market(context, state);
      if (tradeAction.dataset.v3TradeAction === "buy") state = buyV3Commodity(context, state, tradeAction.dataset.v3Commodity, 1);
      if (tradeAction.dataset.v3TradeAction === "sell") state = sellV3Commodity(context, state, tradeAction.dataset.v3Commodity, 1);
      saveGame(); renderGame(); showToast("交易台帳を更新しました。");
    } catch (error) { showToast(error.message); }
    return;
  }
  const foundStrategy = event.target.closest("[data-v3-company-found]")?.dataset.v3CompanyFound;
  if (foundStrategy) {
    try { state = foundV3MerchantCompany(context, state, { strategyId: foundStrategy, name: document.querySelector("#v3CompanyName")?.value }); saveGame(); renderGame(); showToast("商会を設立しました。"); }
    catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-company-invest]")) {
    try { state = contributeV3CompanyCapital(state, 10); saveGame(); renderGame(); }
    catch (error) { showToast(error.message); }
    return;
  }
  const charterStart = event.target.closest("[data-v3-charter-start]");
  if (charterStart) {
    try { state = startV3CharterApplication(context, state, charterStart.dataset.v3CharterStart, charterStart.dataset.v3Filing); saveGame(); renderGame(); }
    catch (error) { showToast(error.message); }
    return;
  }
  const charterDecision = event.target.closest("[data-v3-charter-decision]");
  if (charterDecision) {
    try { state = resolveV3CharterApplication(context, state, charterDecision.dataset.v3Application, charterDecision.dataset.v3CharterDecision); saveGame(); renderGame(); }
    catch (error) { showToast(error.message); }
    return;
  }
  const hire = event.target.closest("[data-v3-company-hire]")?.dataset.v3CompanyHire;
  if (hire) {
    try { state = recruitV3CompanyStaff(context, state, hire); saveGame(); renderGame(); }
    catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-route-secure]")) {
    const form = elements.commerceContent.querySelector("[data-v3-route-form]");
    try {
      state = secureV3CompanyRoute(context, state, {
        sourceId: form.querySelector("[data-v3-route-source]").value,
        destinationId: form.querySelector("[data-v3-route-destination]").value,
        commodityId: form.querySelector("[data-v3-route-commodity]").value,
        approachId: form.querySelector("[data-v3-route-approach]").value,
        leaderId: form.querySelector("[data-v3-route-leader]").value,
      });
      saveGame(); renderGame();
    } catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-branch-open]")) {
    const form = elements.commerceContent.querySelector("[data-v3-branch-form]");
    try {
      state = openV3CompanyBranch(context, state, {
        formatId: form.querySelector("[data-v3-branch-format]").value,
        launchId: form.querySelector("[data-v3-branch-launch]").value,
        managerId: form.querySelector("[data-v3-branch-manager]").value,
      });
      saveGame(); renderGame();
    } catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.closest("[data-v3-company-month]")) {
    try { state = advanceV3CompanyMonth(context, state); saveGame(); renderGame(); }
    catch (error) { showToast(error.message); }
    return;
  }
  const incident = event.target.closest("[data-v3-incident]");
  if (incident) {
    try { state = resolveV3CompanyIncident(state, incident.dataset.v3Incident, incident.dataset.v3Decision); saveGame(); renderGame(); }
    catch (error) { showToast(error.message); }
    return;
  }
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
  if (close === "commerce") elements.commerceModal.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (!state || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (event.key === "Escape") {
    if (!elements.worldMap.hidden) elements.worldMap.hidden = true;
    else if (!elements.inventoryModal.hidden) elements.inventoryModal.hidden = true;
    else if (!elements.commerceModal.hidden) elements.commerceModal.hidden = true;
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
