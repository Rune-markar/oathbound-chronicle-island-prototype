import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  VILLAGE_FACILITIES,
  createCareerInitialState,
  getSettlementFacilities,
  getSettlementMeritGain,
  getServiceRouteProgress,
  getGuildStanding,
  getVillageActionAvailability,
  performVillageAction,
} from "../src/simulation.js";

const EXPECTED_ACTIONS = Object.freeze({
  "宿屋": ["HP・MP回復", "状態異常回復", "休息", "セーブ"],
  "商店": ["武器購入", "防具購入", "道具購入", "食料購入", "一次素材購入", "アイテム売却"],
  "鍛冶屋": ["装備強化", "装備修理", "装備鑑定"],
  "酒場": ["仲間募集", "パーティ編成", "噂を聞く", "NPCとの会話", "紹介を頼む"],
  "冒険者ギルド": ["依頼受注", "依頼報告", "報酬受取", "ダンジョン情報確認", "治癒ポーション購入", "解毒ポーション購入", "魔力補給薬購入"],
  "神殿・治療所": ["負傷治療", "毒・病気の治療", "呪い解除", "蘇生"],
  "訓練所": ["能力強化", "スキル習得", "転職", "仲間育成", "武術大会へ出場"],
  "倉庫": ["アイテム保管", "装備保管", "素材管理"],
  "村人との交流": ["会話", "情報収集", "イベント発生", "サブクエスト"],
  "村の発展": ["施設建設", "施設強化", "新しい商人・職人の誘致"],
  "探索準備": ["パーティ編成", "受注依頼へ出発", "装備変更", "アイテム整理", "食料・松明などの補給"],
});

test("the personal village menu exposes every requested facility and action", () => {
  assert.equal(VILLAGE_FACILITIES.length, Object.keys(EXPECTED_ACTIONS).length);
  for (const [facilityName, requiredActions] of Object.entries(EXPECTED_ACTIONS)) {
    const actualActions = VILLAGE_FACILITIES.find((facility) => facility.name === facilityName)?.actions.map((action) => action.name) ?? [];
    requiredActions.forEach((actionName) => assert.ok(actualActions.includes(actionName), `${facilityName}に「${actionName}」が必要です`));
  }
  const actionIds = VILLAGE_FACILITIES.flatMap((facility) => facility.actions.map((action) => action.id));
  assert.ok(actionIds.length >= 45);
  assert.equal(new Set(actionIds).size, actionIds.length);
});

test("a new personal career receives save-compatible village life state", () => {
  const state = createCareerInitialState();
  assert.equal(state.player.villageLife.hp, state.player.villageLife.maxHp);
  assert.equal(state.player.villageLife.mp, state.player.villageLife.maxMp);
  assert.equal(state.player.villageLife.supplies.food, 3);
  assert.ok(state.player.villageLife.inventory.some((item) => item.name === "保存食"));
});

test("village actions are immutable, spend personal wealth, and enter the chronicle", () => {
  const state = createCareerInitialState();
  const beforeWealth = state.player.metrics.wealth;
  const next = performVillageAction(state, { id: "test-town", name: "試験町", settlementLevel: "town" }, "buy_weapon");
  assert.equal(state.player.metrics.wealth, beforeWealth);
  assert.equal(next.player.metrics.wealth, beforeWealth - 2);
  assert.ok(next.player.villageLife.inventory.some((item) => item.name === "村鍛冶の鋼剣"));
  assert.equal(next.player.villageLife.lastAction.villageName, "試験町");
  assert.match(next.player.history[0].title, /試験町・武器購入/);
});

test("injury treatment charges for HP loss and reports the exact recovery for the party", () => {
  const state = createCareerInitialState();
  state.player.villageLife.hp = 16;
  state.player.villageLife.injuries = ["戦闘負傷（重傷）"];
  state.player.villageLife.party = [{ id: "healer", name: "ミレル", level: 2, alive: true, active: false, maxHp: 54, hp: 11, battleState: "RECOVERING" }];
  const wealth = state.player.metrics.wealth;
  const access = getVillageActionAvailability(state, "treat_injury", { id: "clinic", name: "治療村" });
  assert.equal(access.cost, 2);
  const next = performVillageAction(state, { id: "clinic", name: "治療村" }, "treat_injury");
  assert.equal(next.player.metrics.wealth, wealth - 2);
  assert.equal(next.player.villageLife.hp, 100);
  assert.equal(next.player.villageLife.party[0].hp, 54);
  assert.equal(next.player.villageLife.party[0].battleState, "READY");
  assert.equal(next.player.villageLife.party[0].active, true);
  assert.match(next.player.villageLife.lastAction.message, /HPを84回復（16→100）/);
  assert.match(next.player.villageLife.lastAction.message, /ミレル 11→54/);
  assert.doesNotMatch(next.player.villageLife.lastAction.message, /必要な負傷はなかった/);
});

test("a defeated party can receive emergency care on credit and repay it later", () => {
  const state = createCareerInitialState();
  state.player.metrics.wealth = 1;
  state.player.villageLife.hp = 4;
  state.player.villageLife.injuries = ["戦闘負傷（重傷）"];
  state.player.villageLife.party = [{ id: "healer", name: "ミレル", level: 2, alive: false, active: false, maxHp: 54, hp: 0, battleState: "DESTROYED" }];
  const village = { id: "clinic", name: "治療村", settlementLevel: "town" };
  const access = getVillageActionAvailability(state, "emergency_party_recovery", village);
  assert.equal(access.allowed, true);
  assert.equal(access.chargedCost, 1);
  assert.equal(access.deferredCost, 4);
  const healed = performVillageAction(state, village, "emergency_party_recovery");
  assert.equal(healed.player.villageLife.hp, healed.player.villageLife.maxHp);
  assert.equal(healed.player.villageLife.party[0].alive, true);
  assert.equal(healed.player.villageLife.party[0].active, true);
  assert.equal(healed.player.villageLife.templeDebt, 4);
  healed.player.metrics.wealth = 3;
  const repaid = performVillageAction(healed, village, "repay_temple_debt");
  assert.equal(repaid.player.villageLife.templeDebt, 1);
  assert.equal(repaid.player.metrics.wealth, 0);
});

test("shop sale removes the item selected by the player", () => {
  const state = createCareerInitialState();
  const village = { id: "market", name: "市場町", settlementLevel: "town" };
  const beforeHerbs = state.player.villageLife.inventory.find((item) => item.id === "healing-herb").quantity;
  const sold = performVillageAction(state, village, "sell_item", { itemId: "iron-fragment" });
  assert.equal(sold.player.villageLife.inventory.some((item) => item.id === "iron-fragment"), false);
  assert.equal(sold.player.villageLife.inventory.find((item) => item.id === "healing-herb").quantity, beforeHerbs);
});

test("villages sell primary goods and route requests through taverns while towns add smithies and guilds", () => {
  const village = { id: "oak-village", name: "樫村", settlementLevel: "village" };
  const town = { id: "river-town", name: "河岸町", settlementLevel: "town" };
  const villageFacilities = getSettlementFacilities(village);
  const townFacilities = getSettlementFacilities(town);

  assert.equal(villageFacilities.some((entry) => entry.id === "smithy"), false);
  assert.equal(villageFacilities.some((entry) => entry.id === "guild"), false);
  assert.ok(villageFacilities.find((entry) => entry.id === "tavern").actions.some((entry) => entry.id === "accept_request"));
  assert.equal(villageFacilities.find((entry) => entry.id === "tavern").actions.some((entry) => entry.id === "buy_healing_potion"), false);
  assert.deepEqual(villageFacilities.find((entry) => entry.id === "shop").actions.map((entry) => entry.id), ["buy_food", "buy_materials", "sell_item"]);
  assert.ok(townFacilities.some((entry) => entry.id === "smithy"));
  assert.ok(townFacilities.some((entry) => entry.id === "guild"));

  const state = createCareerInitialState();
  assert.equal(getVillageActionAvailability(state, "buy_weapon", village).allowed, false);
  assert.equal(getVillageActionAvailability(state, "buy_weapon", town).allowed, true);
  const bought = performVillageAction(state, village, "buy_materials");
  assert.ok(bought.player.villageLife.inventory.some((item) => item.id === "local-raw-materials"));
});

test("town merit starts slower than village merit and rises with the character's base renown", () => {
  const village = getSettlementMeritGain(10, { settlementLevel: "village" }, 0);
  const unknownTown = getSettlementMeritGain(10, { settlementLevel: "town" }, 0);
  const famousTown = getSettlementMeritGain(10, { settlementLevel: "town" }, 80);
  assert.equal(village.merit, 10);
  assert.equal(unknownTown.merit, 5);
  assert.ok(famousTown.merit > unknownTown.merit);
  assert.ok(famousTown.merit <= village.merit);
});

test("request reports apply settlement merit to the local achievement record", () => {
  const completeAt = (place) => {
    let state = createCareerInitialState();
    state = performVillageAction(state, place, "recruit_companion");
    state = performVillageAction(state, place, "accept_request");
    state = performVillageAction(state, place, "complete_request");
    return performVillageAction(state, place, "report_request");
  };
  const village = completeAt({ id: "oak-village", name: "樫村", settlementLevel: "village" });
  const town = completeAt({ id: "river-town", name: "河岸町", settlementLevel: "town" });
  assert.equal(village.player.villageLife.guildMerit, 10);
  assert.equal(town.player.villageLife.guildMerit, 5);
  assert.equal(village.player.regionalReputation.achievements[0].merit, 10);
  assert.equal(town.player.regionalReputation.achievements[0].merit, 5);
  assert.match(town.player.villageLife.lastAction.message, /基本名声0・町内係数0\.50/);
});

test("guild merit changes local standing, dialogue, and the shared purchase price", () => {
  const state = createCareerInitialState();
  state.player.villageLife.guildMerit = 30;
  const standing = getGuildStanding(state);
  assert.equal(standing.name, "信頼される冒険者");
  assert.equal(standing.discountPercent, 10);
  const access = getVillageActionAvailability(state, "buy_food", { id: "test-village", name: "試験村", settlementLevel: "village" });
  assert.equal(access.baseCost, 1);
  assert.equal(access.cost, 0.9);
  const wealth = state.player.metrics.wealth;
  const next = performVillageAction(state, { id: "test-village", name: "試験村", settlementLevel: "village" }, "buy_food");
  assert.equal(next.player.metrics.wealth, wealth - 0.9);
  assert.match(next.player.villageLife.lastAction.message, /信頼される冒険者/);
});

test("quest reporting and rewards follow an explicit lifecycle", () => {
  let state = createCareerInitialState();
  const village = { id: "test-village", name: "試験村" };
  assert.equal(getVillageActionAvailability(state, "report_request").allowed, false);
  state = performVillageAction(state, village, "accept_request");
  assert.equal(state.player.villageLife.quests[0].status, "accepted");
  assert.equal(getVillageActionAvailability(state, "report_request").allowed, false);
  assert.match(getVillageActionAvailability(state, "complete_request").reason, /酒場/);
  state = performVillageAction(state, village, "recruit_companion");
  assert.equal(getVillageActionAvailability(state, "complete_request").allowed, true);
  state = performVillageAction(state, village, "complete_request");
  assert.equal(state.player.villageLife.quests[0].status, "completed");
  assert.equal(getVillageActionAvailability(state, "report_request").allowed, true);
  const meritBefore = state.player.metrics.martialMerit;
  state = performVillageAction(state, village, "report_request");
  assert.equal(state.player.villageLife.guildMerit, 10);
  assert.equal(state.player.metrics.martialMerit, meritBefore + 8);
  assert.equal(state.player.progress.contracts, 1);
  assert.equal(getVillageActionAvailability(state, "receive_reward").allowed, true);
  const wealth = state.player.metrics.wealth;
  state = performVillageAction(state, village, "receive_reward");
  assert.equal(state.player.metrics.wealth, wealth + 4);
  assert.equal(state.player.villageLife.quests[0].status, "rewarded");
});

test("repeated guild reports attract the local lord's envoy", () => {
  let state = createCareerInitialState();
  const village = { id: "test-village", name: "試験村" };
  state = performVillageAction(state, village, "recruit_companion");
  for (let index = 0; index < 3; index += 1) {
    state = performVillageAction(state, village, "accept_request");
    state = performVillageAction(state, village, "complete_request");
    state = performVillageAction(state, village, "report_request");
    state = performVillageAction(state, village, "receive_reward");
  }
  const route = getServiceRouteProgress(state).find((entry) => entry.id === "guild_recognition");
  assert.equal(route.unlocked, true);
  assert.ok(state.player.villageLife.guildMerit >= 30);
  assert.ok(state.player.invitations.some((invitation) => invitation.routeId === "guild_recognition"));
});

test("rescue, tournament, and recommendation are independent commission routes", () => {
  const village = { id: "test-village", name: "試験村" };

  let rescue = createCareerInitialState();
  rescue = performVillageAction(rescue, village, "recruit_companion");
  rescue = performVillageAction(rescue, village, "accept_request");
  rescue = performVillageAction(rescue, village, "complete_request");
  rescue = performVillageAction(rescue, village, "report_request");
  rescue = performVillageAction(rescue, village, "receive_reward");
  rescue = performVillageAction(rescue, village, "accept_request");
  rescue = performVillageAction(rescue, village, "complete_request");
  assert.ok(rescue.player.invitations.some((invitation) => invitation.routeId === "chance_rescue"));

  let tournament = createCareerInitialState();
  for (let index = 0; index < 3; index += 1) tournament = performVillageAction(tournament, village, "enter_tournament");
  assert.ok(tournament.player.invitations.some((invitation) => invitation.routeId === "tournament_victory"));

  let referred = createCareerInitialState();
  for (let index = 0; index < 3; index += 1) referred = performVillageAction(referred, village, "talk_npc");
  assert.equal(getVillageActionAvailability(referred, "seek_recommendation", village.id).allowed, true);
  referred = performVillageAction(referred, village, "seek_recommendation");
  assert.ok(referred.player.invitations.some((invitation) => invitation.routeId === "personal_recommendation"));
});

test("the browser UI enters villages and does not expose the old instant contract action", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(app, /data-enter-village/);
  assert.match(app, /data-village-action/);
  assert.match(app, /renderVillageQuestFlow/);
  assert.match(app, /renderServiceRouteBoard/);
  assert.doesNotMatch(app, /data-career-action="take_contract"/);
  assert.match(css, /\.village-request-flow/);
  assert.match(css, /\.village-service-routes/);
});

test("the tavern uses a dedicated transparent human hostess portrait instead of an armored officer", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const tavernCast = app.match(/tavern: Object\.freeze\([^\n]+/)?.[0] ?? "";

  assert.match(tavernCast, /name: "酒場女将"/);
  assert.match(tavernCast, /role: "酒場"/);
  assert.match(tavernCast, /tavern-hostess\.png/);
  assert.match(tavernCast, /transparent: true/);
  assert.doesNotMatch(tavernCast, /officer-dario\.webp/);
  assert.match(app, /counterpart\.transparent \? "has-transparent-art"/);
});

test("the village opens large vertical facilities and their actions in a second window before conversation", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const actionHandler = app.match(/const villageAction = event\.target\.closest[\s\S]*?const villageExit =/)?.[0] ?? "";
  const conversationStage = app.match(/function renderVillageConversation\(\)[\s\S]*?function completeVillageConversation/)?.[0] ?? "";
  const villageWorkspace = app.match(/function renderVillageWorkspace\(\)[\s\S]*?function renderCareerPanel/)?.[0] ?? "";

  assert.match(markup, /class="outliner left-info-drawer"/);
  assert.match(app, /classList\.toggle\("is-village-focus", villageActive \|\| locationActive\)/);
  assert.match(app, /village-main-square\.png/);
  assert.match(app, /class="village-choice-overlay village-facility-window/);
  assert.match(app, /class="village-overlay-facilities village-facility-menu"/);
  assert.match(app, /class="village-choice-overlay village-action-window /);
  assert.match(app, /data-close-village-actions/);
  assert.match(app, /villageFacilityOpen = true/);
  assert.match(app, /villageFacilityOpen = false/);
  assert.match(app, /class="village-choice-action" data-village-action/);
  assert.match(app, /class="village-central-visual has-top-status /);
  assert.ok(villageWorkspace.indexOf("village-central-status is-top-status") < villageWorkspace.indexOf("village-facility-window"), "上部ステータスを施設一覧より先に配置する");
  assert.match(css, /body\.is-village-focus \.left-dock\s*\{[^}]*display: none;/s);
  assert.match(css, /\.village-choice-overlay\s*\{/);
  assert.match(css, /\.village-facility-menu\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
  assert.match(css, /\.village-action-window\s*\{/);
  assert.match(css, /\.village-central-status\.is-top-status\s*\{[^}]*top:\s*20px;[^}]*bottom:\s*auto;/s);
  assert.match(css, /\.village-central-visual\.has-top-status \.village-choice-overlay\s*\{[^}]*top:\s*112px;[^}]*bottom:\s*20px;/s);
  assert.match(css, /backdrop-filter:\s*blur/);
  assert.match(actionHandler, /beginVillageActionConversation/);
  assert.doesNotMatch(actionHandler, /performVillageAction/);
  assert.match(app, /kind: "contract"/);
  assert.match(app, /kind: "party-accept"/);
  assert.match(app, /kind: "party-invite"/);
  assert.ok(conversationStage.indexOf("is-player") < conversationStage.indexOf("is-other"), "主人公の立ち絵を相手より先に置き、左側へ配置する");
  assert.match(css, /body\.is-character-conversation \.left-dock\s*\{[^}]*display: none;/s);
  assert.match(css, /\.conversation-character\.is-player\s*\{[^}]*grid-column: 1;/s);
  assert.match(css, /\.conversation-character\.is-other\s*\{[^}]*grid-column: 3;/s);
  assert.match(app, /player-conversation-human\.png/);
  assert.match(app, /is-player \$\{playerPortrait\.transparent \? "has-transparent-art"/);
  assert.match(css, /\.conversation-character\.is-other\.has-transparent-art img\s*\{[^}]*scale\(1\.58\)/s);
  assert.match(css, /\.conversation-place\s*\{[^}]*background:\s*rgba\(4, 20, 19, \.88\)/s);
  assert.match(css, /\.conversation-message p\s*\{[^}]*font:\s*600 17px/s);
});

test("the tavern is entered before its interaction choices are shown", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const villageWorkspace = app.match(/function renderVillageWorkspace\(\)[\s\S]*?function renderCareerPanel/)?.[0] ?? "";
  const facilityHandler = app.match(/const villageFacility = event\.target\.closest[\s\S]*?if \(event\.target\.closest\("\[data-close-village-actions\]"\)\)/)?.[0] ?? "";

  assert.match(villageWorkspace, /const tavernInterior = view\.villageFacilityOpen && selected\.id === "tavern"/);
  assert.match(villageWorkspace, /const villageInteriorArt = tavernInterior \? villageFacilityArt\(selected\.id\) : VILLAGE_MAIN_ART/);
  assert.match(villageWorkspace, /data-village-location="\$\{tavernInterior \? "tavern" : "village-square"\}"/);
  assert.match(villageWorkspace, /\$\{tavernInterior \? "" : `<section class="village-choice-overlay village-facility-window/);
  assert.match(villageWorkspace, /is-facility-interior-window is-tavern-window/);
  assert.match(villageWorkspace, /TAVERN \/ ARRIVED/);
  assert.match(villageWorkspace, /AFTER ARRIVAL \/ AVAILABLE CHOICES/);
  assert.ok(facilityHandler.indexOf("selectedVillageFacilityId") < facilityHandler.indexOf("villageFacilityOpen = true"), "移動先を確定してから施設内の選択肢を開く");
  assert.match(css, /\.village-central-visual\.is-tavern-interior\s*\{[^}]*var\(--village-interior-art\) center \/ cover no-repeat,/s);
  assert.match(css, /\.village-action-window\.is-facility-interior-window\s*\{[^}]*left:\s*clamp\(18px, 2\.2vw, 34px\);/s);
});
