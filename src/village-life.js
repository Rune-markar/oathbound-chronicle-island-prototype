import {
  REGIONAL_REPUTATION_GAINS,
  normalizeRegionalReputationState,
  recordRegionalAchievement,
} from "./regional-reputation.js";
import { normalizeAbilityScores } from "./character-abilities.js";

const clone = (value) => structuredClone(value);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const action = (id, name, description, cost = 0) => Object.freeze({ id, name, description, cost });
const facility = (id, name, icon, summary, actions) => Object.freeze({
  id,
  name,
  icon,
  summary,
  actions: Object.freeze(actions),
});

export const VILLAGE_LIFE_SCHEMA_VERSION = 3;

const TOWN_SCALE_LEVELS = new Set(["town", "city", "bay_city"]);
const VILLAGE_SHOP_ACTION_IDS = new Set(["buy_food", "buy_materials", "sell_item"]);
const VILLAGE_UNAVAILABLE_ACTION_IDS = new Set([
  "buy_weapon", "buy_armor", "buy_tools", "enhance_equipment", "repair_equipment", "appraise_equipment",
]);

export function getSettlementScale(place = {}) {
  const level = String(place?.settlementLevel ?? place?.level ?? place?.type ?? "village");
  return TOWN_SCALE_LEVELS.has(level) ? "town" : "village";
}

export function getSettlementMeritGain(baseMerit, place = {}, baseRenown = 0) {
  const scale = getSettlementScale(place);
  const base = Math.max(0, Number(baseMerit) || 0);
  const fame = Math.max(0, Number(baseRenown) || 0);
  const factor = scale === "village" ? 1 : Math.min(1, 0.5 + fame / 200);
  return {
    scale,
    baseMerit: base,
    baseRenown: fame,
    factor,
    merit: Math.round(base * factor),
  };
}

export const GUILD_STANDING_TIERS = Object.freeze([
  Object.freeze({ id: "newcomer", name: "新顔", minimumMerit: 0, discountRate: 0, greeting: "まだ見ない顔だね。まずは仕事ぶりを見せてもらおう。" }),
  Object.freeze({ id: "familiar", name: "顔なじみ", minimumMerit: 10, discountRate: 0.05, greeting: "あんたの働きは聞いているよ。少しなら勉強しよう。" }),
  Object.freeze({ id: "trusted", name: "信頼される冒険者", minimumMerit: 30, discountRate: 0.1, greeting: "また力を貸してくれるのか。村の者として迎えるよ。" }),
  Object.freeze({ id: "benefactor", name: "村の功労者", minimumMerit: 60, discountRate: 0.15, greeting: "あなたには何度も救われた。できる限りの支度を整えよう。" }),
  Object.freeze({ id: "hero", name: "地方の英雄", minimumMerit: 100, discountRate: 0.2, greeting: "英雄殿がお戻りだ。皆、最高の品と敬意をもって迎えよう。" }),
]);

const MERIT_DISCOUNT_ACTIONS = new Set([
  "restore_hp_mp", "recover_status", "rest", "buy_weapon", "buy_armor", "buy_tools", "buy_food",
  "enhance_equipment", "repair_equipment", "appraise_equipment", "check_dungeon", "restock_supplies",
]);
const MERCHANT_PASSIVE_ID = "road_market_ledger";
const MERCHANT_PURCHASE_DISCOUNT_RATE = 0.12;
const MERCHANT_SALE_GAIN = 1.2;
const MERCHANT_DISCOUNT_ACTIONS = new Set([
  "buy_weapon", "buy_armor", "buy_tools", "buy_food", "buy_materials", "restock_supplies",
]);

function hasActiveCompanionPassive(life, passiveId) {
  return life.party.some((member) => member.active !== false && member.alive !== false && member.passiveId === passiveId);
}

export function getGuildStanding(stateOrLife) {
  const life = stateOrLife?.player?.villageLife ?? stateOrLife?.villageLife ?? stateOrLife ?? {};
  const merit = Math.max(0, Number(life.guildMerit) || 0);
  const tierIndex = GUILD_STANDING_TIERS.findLastIndex((tier) => merit >= tier.minimumMerit);
  const tier = GUILD_STANDING_TIERS[Math.max(0, tierIndex)];
  const nextTier = GUILD_STANDING_TIERS[tierIndex + 1] ?? null;
  return { ...tier, merit, discountPercent: Math.round(tier.discountRate * 100), nextTier };
}

export const SERVICE_ROUTE_DEFINITIONS = Object.freeze({
  guild_recognition: Object.freeze({
    id: "guild_recognition",
    name: "領主の使いの目に留まる",
    summary: "ギルドで依頼を重ね、土地への功績を使節に認められる。",
    progressField: "guildMerit",
    target: 30,
    unit: "功績",
    offer: Object.freeze({ nationId: "serena", name: "セレナ王国", trust: 34, offer: "領主使節が推挙する東境軍の従士" }),
  }),
  chance_rescue: Object.freeze({
    id: "chance_rescue",
    name: "偶然、要人の命を救う",
    summary: "依頼先で危機に遭った領主の使者を助け、恩義から声が掛かる。",
    progressField: "heroicRescues",
    target: 1,
    unit: "救命",
    offer: Object.freeze({ nationId: "serena", name: "セレナ王国", trust: 40, offer: "命を救った近衛卿からの直臣推薦" }),
  }),
  tournament_victory: Object.freeze({
    id: "tournament_victory",
    name: "武術大会で勝ち上がる",
    summary: "訓練所の地方武術大会で三勝し、武勇を公の場で示す。",
    progressField: "tournamentWins",
    target: 3,
    unit: "勝",
    offer: Object.freeze({ nationId: "valka", name: "ヴァルカ公国", trust: 31, offer: "武術大会選抜の峠守備隊士官" }),
  }),
  personal_recommendation: Object.freeze({
    id: "personal_recommendation",
    name: "有力者から紹介を受ける",
    summary: "酒場で土地の人脈を築き、信用ある人物の推薦状を得る。",
    progressField: "recommendations",
    target: 1,
    unit: "通",
    offer: Object.freeze({ nationId: "forest_alliance", name: "森の連合国", trust: 29, offer: "商人組合の紹介による街道護衛士官" }),
  }),
});

export const VILLAGE_FACILITIES = Object.freeze([
  facility("inn", "宿屋", "宿", "体調を整え、休息と記録を行う。", [
    action("restore_hp_mp", "HP・MP回復", "食事と睡眠でHP・MPを全回復する。", 1),
    action("recover_status", "状態異常回復", "軽い状態異常を取り除く。", 1),
    action("rest", "休息", "短い休息を取り、旅の疲労を回復する。", 1),
    action("save", "セーブ", "現在の人物・世界・村の状態を保存する。"),
  ]),
  facility("shop", "商店", "商", "旅に必要な品を売買する。", [
    action("buy_weapon", "武器購入", "携行用の武器を購入する。", 2),
    action("buy_armor", "防具購入", "旅装用の防具を購入する。", 2),
    action("buy_tools", "道具購入", "薬草などの消耗品を購入する。", 1),
    action("buy_food", "食料購入", "保存食を購入する。", 1),
    action("buy_materials", "一次素材購入", "薬草・原木・鉱石など、土地で採れる一次素材を購入する。", 1),
    action("sell_item", "アイテム売却", "所持品を一つ売却する。"),
  ]),
  facility("smithy", "鍛冶屋", "鍛", "装備の性能と状態を整える。", [
    action("enhance_equipment", "装備強化", "現在の武器を一段階強化する。", 3),
    action("repair_equipment", "装備修理", "武器と防具の耐久を回復する。", 1),
    action("appraise_equipment", "装備鑑定", "未鑑定の装備を調べる。", 1),
  ]),
  facility("tavern", "酒場", "酒", "仲間や土地の人々と縁を結ぶ。", [
    action("eat_meal", "食事をする", "店内で食事を取り、周囲の客の話に耳を傾ける。", 1),
    action("recruit_companion", "仲間募集", "旅に同行する仲間を募集する。", 3),
    action("organize_party", "パーティ編成", "同行する仲間を切り替える。"),
    action("hear_rumor", "噂を聞く", "周辺の出来事や危険について聞く。"),
    action("talk_npc", "NPCとの会話", "酒場にいる人物と会話する。"),
    action("seek_recommendation", "紹介を頼む", "築いた人脈を通じ、仕官先へ渡す推薦状を頼む。"),
  ]),
  facility("guild", "冒険者ギルド", "依", "依頼とダンジョン情報を扱う。", [
    action("accept_request", "依頼受注", "現在地で受けられる依頼を引き受ける。"),
    action("report_request", "依頼報告", "達成した依頼の証拠と経緯をギルドへ報告する。"),
    action("receive_reward", "報酬受取", "報告済み依頼の報酬を受け取る。"),
    action("check_dungeon", "ダンジョン情報確認", "周辺の探索地を記録する。", 1),
  ]),
  facility("temple", "神殿・治療所", "癒", "重い負傷や病、呪いを治療する。", [
    action("treat_injury", "負傷治療", "負傷を治療する。", 2),
    action("treat_poison_disease", "毒・病気の治療", "毒と病気を取り除く。", 2),
    action("remove_curse", "呪い解除", "付与された呪いを解除する。", 3),
    action("resurrect", "蘇生", "倒れた仲間を蘇生する。", 5),
  ]),
  facility("training", "訓練所", "練", "本人と仲間の成長方針を決める。", [
    action("raise_ability", "能力強化", "基礎能力を一段階鍛える。", 2),
    action("learn_skill", "スキル習得", "新しい技能を一つ習得する。", 2),
    action("change_class", "転職", "現在の職業を次の候補へ変更する。", 4),
    action("train_companion", "仲間育成", "仲間一人のレベルを上げる。", 2),
    action("enter_tournament", "武術大会へ出場", "地方武術大会で一勝を目指し、領主家へ武勇を示す。", 1),
  ]),
  facility("warehouse", "倉庫", "倉", "携行品と保管品を整理する。", [
    action("store_items", "アイテム保管", "道具・食料を倉庫との間で移す。"),
    action("store_equipment", "装備保管", "予備装備を倉庫との間で移す。"),
    action("manage_materials", "素材管理", "素材を倉庫との間で移す。"),
  ]),
  facility("villagers", "村人との交流", "話", "村の暮らしに触れ、関係を築く。", [
    action("talk_villagers", "会話", "村人と日常の会話を交わす。"),
    action("gather_information", "情報収集", "村と周辺の情報を集める。"),
    action("trigger_event", "イベント発生", "村で起きている出来事に関わる。"),
    action("find_sidequest", "サブクエスト", "村人の小さな頼みを引き受ける。"),
  ]),
  facility("development", "村の発展", "建", "資金と縁を使って村の機能を増やす。", [
    action("build_facility", "施設建設", "不足している施設の建設を支援する。", 5),
    action("upgrade_facility", "施設強化", "既存施設の水準を引き上げる。", 4),
    action("invite_specialist", "新しい商人・職人の誘致", "商人や職人が定着できるよう支援する。", 4),
  ]),
  facility("preparation", "探索準備", "備", "出発前の編成と補給をまとめて確認する。", [
    action("prepare_party", "パーティ編成", "探索へ出る仲間を確認する。"),
    action("complete_request", "受注依頼へ出発", "編成したパーティーで現地へ向かい、依頼の目的を達成する。"),
    action("change_equipment", "装備変更", "予備装備と現在装備を入れ替える。"),
    action("organize_items", "アイテム整理", "携行品を用途順に整理する。"),
    action("restock_supplies", "食料・松明などの補給", "保存食と松明を補給する。", 1),
  ]),
]);

export function getSettlementFacilities(place = {}) {
  if (getSettlementScale(place) === "town") return VILLAGE_FACILITIES;
  const guild = VILLAGE_FACILITIES.find((entry) => entry.id === "guild");
  return VILLAGE_FACILITIES
    .filter((entry) => !["smithy", "guild"].includes(entry.id))
    .map((entry) => {
      if (entry.id === "shop") return { ...entry, summary: "土地で採れた一次素材と食料を売買する。", actions: entry.actions.filter((item) => VILLAGE_SHOP_ACTION_IDS.has(item.id)) };
      if (entry.id === "tavern") return {
        ...entry,
        summary: "仲間や土地の人々と縁を結び、村からの依頼を扱う。",
        actions: [...entry.actions, ...guild.actions],
      };
      return entry;
    });
}

const ACTION_INDEX = new Map(VILLAGE_FACILITIES.flatMap((entry) => (
  entry.actions.map((item) => [item.id, Object.freeze({ ...item, facilityId: entry.id, facilityName: entry.name })])
)));

function defaultVillageLife() {
  return {
    schemaVersion: VILLAGE_LIFE_SCHEMA_VERSION,
    hp: 100,
    maxHp: 100,
    mp: 40,
    maxMp: 40,
    fatigue: 0,
    statusConditions: [],
    injuries: [],
    diseases: [],
    curses: [],
    inventory: [
      { id: "healing-herb", name: "薬草", category: "item", quantity: 2 },
      { id: "travel-ration", name: "保存食", category: "food", quantity: 2 },
      { id: "iron-fragment", name: "鉄片", category: "material", quantity: 1 },
    ],
    equipment: {
      weapon: { id: "traveler-sword", name: "旅人の剣", category: "equipment", slot: "weapon", enhancement: 0, durability: 100, identified: true },
      armor: { id: "traveler-coat", name: "旅人の外套", category: "equipment", slot: "armor", enhancement: 0, durability: 100, identified: true },
    },
    storage: { items: [], equipment: [], materials: [] },
    party: [],
    quests: [],
    rumors: [],
    discoveredDungeons: [],
    skills: [],
    classId: "adventurer",
    abilityTraining: 0,
    supplies: { food: 3, torches: 2 },
    villageRelations: {},
    villageProgress: {},
    guildMerit: 0,
    guildRequestsAccepted: 0,
    guildRequestsReported: 0,
    guildRequestsCompleted: 0,
    heroicRescues: 0,
    tournamentWins: 0,
    recommendations: 0,
    serviceRoutes: {},
    actionHistory: [],
    lastAction: null,
  };
}

const arrayCopy = (value, fallback = []) => clone(Array.isArray(value) ? value : fallback);

export function createVillageLifeState(source = {}) {
  const baseline = defaultVillageLife();
  return {
    ...baseline,
    ...clone(source ?? {}),
    schemaVersion: VILLAGE_LIFE_SCHEMA_VERSION,
    statusConditions: arrayCopy(source?.statusConditions),
    injuries: arrayCopy(source?.injuries),
    diseases: arrayCopy(source?.diseases),
    curses: arrayCopy(source?.curses),
    inventory: arrayCopy(source?.inventory, baseline.inventory),
    equipment: { ...clone(baseline.equipment), ...clone(source?.equipment ?? {}) },
    storage: {
      items: arrayCopy(source?.storage?.items),
      equipment: arrayCopy(source?.storage?.equipment),
      materials: arrayCopy(source?.storage?.materials),
    },
    party: arrayCopy(source?.party),
    quests: arrayCopy(source?.quests),
    rumors: arrayCopy(source?.rumors),
    discoveredDungeons: arrayCopy(source?.discoveredDungeons),
    skills: arrayCopy(source?.skills),
    supplies: { ...baseline.supplies, ...clone(source?.supplies ?? {}) },
    villageRelations: clone(source?.villageRelations ?? {}),
    villageProgress: clone(source?.villageProgress ?? {}),
    serviceRoutes: clone(source?.serviceRoutes ?? {}),
    actionHistory: arrayCopy(source?.actionHistory),
    lastAction: source?.lastAction ? clone(source.lastAction) : null,
  };
}

export function normalizeVillageLifeState(state) {
  if (!state?.player) return state;
  state.player.villageLife = createVillageLifeState(state.player.villageLife);
  normalizeRegionalReputationState(state);
  return state;
}

export function getVillageAction(actionId) {
  return ACTION_INDEX.get(actionId) ?? null;
}

function firstInventoryIndex(life, categories) {
  return life.inventory.findIndex((item) => categories.includes(item.category));
}

function unresolvedGuildQuest(life) {
  return life.quests.find((quest) => quest.source === "guild" && ["accepted", "completed", "reported", "active"].includes(quest.status));
}

function requirementReason(life, actionId, villageId = null) {
  if (["organize_party", "prepare_party", "train_companion"].includes(actionId) && !life.party.length) return "先に酒場で仲間を募集してください";
  const acceptedGuildQuest = life.quests.find((quest) => quest.source === "guild" && ["accepted", "active"].includes(quest.status));
  if (actionId === "complete_request" && !acceptedGuildQuest) return "先にギルドで依頼を受注してください";
  if (actionId === "complete_request" && acceptedGuildQuest?.dungeonId) return "地方地図に戻り、指定されたダンジョンの最奥まで到達してください";
  if (actionId === "complete_request" && !life.party.some((member) => member.active && member.alive !== false)) return "先に酒場で仲間を集め、パーティーへ編成してください";
  if (actionId === "report_request" && !life.quests.some((quest) => quest.source === "guild" && quest.status === "completed")) return "達成済みの依頼をギルドへ持ち帰ってください";
  if (actionId === "receive_reward" && !life.quests.some((quest) => quest.status === "reported")) return "報酬を受け取れる報告済み依頼がありません";
  if (actionId === "accept_request" && unresolvedGuildQuest(life)) return "受注中の依頼を達成・報告し、報酬を受け取ってください";
  if (actionId === "seek_recommendation" && (life.villageRelations[villageId] ?? 0) < 6) return "この村で関係を6以上築いてください";
  if (actionId === "seek_recommendation" && life.recommendations >= 1) return "すでに仕官用の推薦状を受け取っています";
  if (actionId === "enter_tournament" && life.tournamentWins >= SERVICE_ROUTE_DEFINITIONS.tournament_victory.target) return "武術大会を勝ち上がり、すでに士官候補として認められています";
  if (actionId === "resurrect" && !life.party.some((member) => member.alive === false)) return "蘇生が必要な仲間はいません";
  if (actionId === "sell_item" && !life.inventory.length) return "売却できる所持品がありません";
  if (actionId === "store_items" && firstInventoryIndex(life, ["item", "food", "supply"]) < 0 && !life.storage.items.length) return "保管または引き出しできる道具がありません";
  if (actionId === "store_equipment" && firstInventoryIndex(life, ["equipment"]) < 0 && !life.storage.equipment.length) return "保管または引き出しできる予備装備がありません";
  if (actionId === "manage_materials" && firstInventoryIndex(life, ["material"]) < 0 && !life.storage.materials.length) return "管理できる素材がありません";
  if (actionId === "change_equipment" && firstInventoryIndex(life, ["equipment"]) < 0) return "交換できる予備装備がありません";
  return null;
}

function effectiveCost(life, definition) {
  if (definition.id === "restore_hp_mp" && life.hp >= life.maxHp && life.mp >= life.maxMp) return 0;
  if (definition.id === "recover_status" && !life.statusConditions.length) return 0;
  if (definition.id === "treat_injury" && !life.injuries.length) return 0;
  if (definition.id === "treat_poison_disease" && !life.diseases.length && !life.statusConditions.some((item) => /毒|病/.test(item))) return 0;
  if (definition.id === "remove_curse" && !life.curses.length) return 0;
  if (definition.id === "repair_equipment" && Object.values(life.equipment).every((item) => item.durability >= 100)) return 0;
  if (definition.id === "appraise_equipment" && !life.inventory.some((item) => item.category === "equipment" && item.identified === false)) return 0;
  return definition.cost;
}

export function getVillageActionAvailability(state, actionId, villageInput = null) {
  const definition = getVillageAction(actionId);
  if (!definition) return { allowed: false, reason: "不明な村行動です", cost: 0 };
  if (!state?.player) return { allowed: false, reason: "操作する人物がいません", cost: definition.cost };
  const place = typeof villageInput === "string" ? { id: villageInput } : (villageInput ?? {});
  const villageId = place.id ?? null;
  const life = createVillageLifeState(state.player.villageLife);
  if (getSettlementScale(place) === "village" && VILLAGE_UNAVAILABLE_ACTION_IDS.has(actionId)) {
    return { allowed: false, reason: "この設備と加工品は町規模の集落でのみ利用できます", cost: definition.cost };
  }
  const reason = requirementReason(life, actionId, villageId);
  const baseCost = effectiveCost(life, definition);
  const standing = getGuildStanding(life);
  const standingDiscountRate = baseCost > 0 && MERIT_DISCOUNT_ACTIONS.has(actionId) ? standing.discountRate : 0;
  const companionDiscountRate = baseCost > 0
    && MERCHANT_DISCOUNT_ACTIONS.has(actionId)
    && hasActiveCompanionPassive(life, MERCHANT_PASSIVE_ID)
    ? MERCHANT_PURCHASE_DISCOUNT_RATE
    : 0;
  const discountRate = Math.min(0.3, standingDiscountRate + companionDiscountRate);
  const cost = Number((baseCost * (1 - discountRate)).toFixed(1));
  const discountAmount = Number((baseCost - cost).toFixed(1));
  const discount = { discountRate, standingDiscountRate, companionDiscountRate, discountAmount };
  if (reason) return { allowed: false, reason, cost, baseCost, ...discount, standing };
  if ((state.player.metrics?.wealth ?? 0) < cost) {
    return { allowed: false, reason: `財産が${cost}必要です`, cost, baseCost, ...discount, standing };
  }
  return { allowed: true, reason: null, cost, baseCost, ...discount, standing };
}

function addInventory(life, item) {
  const existing = life.inventory.find((entry) => entry.id === item.id);
  if (existing) existing.quantity = (existing.quantity ?? 1) + (item.quantity ?? 1);
  else life.inventory.push(clone(item));
}

function removeOneInventoryItem(life, index) {
  const item = life.inventory[index];
  if (!item) return null;
  const moved = { ...item, quantity: 1 };
  if ((item.quantity ?? 1) > 1) item.quantity -= 1;
  else life.inventory.splice(index, 1);
  return moved;
}

function toggleStorage(life, categories, storageKey) {
  const inventoryIndex = firstInventoryIndex(life, categories);
  if (inventoryIndex >= 0) {
    const moved = removeOneInventoryItem(life, inventoryIndex);
    life.storage[storageKey].push(moved);
    return `${moved.name}を倉庫へ保管した。`;
  }
  const moved = life.storage[storageKey].shift();
  addInventory(life, moved);
  return `${moved.name}を倉庫から引き出した。`;
}

function villageProgress(life, villageId) {
  life.villageProgress[villageId] ??= { buildings: 0, facilityLevel: 1, specialists: 0 };
  return life.villageProgress[villageId];
}

function villageRelation(life, villageId, amount) {
  life.villageRelations[villageId] = clamp((life.villageRelations[villageId] ?? 0) + amount, 0, 100);
}

function recordVillageAction(state, village, definition, message) {
  const record = {
    id: `village-${state.turn ?? 0}-${state.player.villageLife.actionHistory.length + 1}`,
    villageId: village.id,
    villageName: village.name,
    facilityId: definition.facilityId,
    facilityName: definition.facilityName,
    actionId: definition.id,
    actionName: definition.name,
    year: state.year,
    month: state.month,
    message,
  };
  state.player.villageLife.lastAction = record;
  state.player.villageLife.actionHistory.unshift(record);
  state.player.villageLife.actionHistory = state.player.villageLife.actionHistory.slice(0, 40);
  state.player.history ??= [];
  state.player.history.unshift({ turn: state.turn ?? 0, year: state.year, month: state.month, title: `${village.name}・${definition.name}`, detail: message });
  state.player.history = state.player.history.slice(0, 60);
}

const COMPANION_NAMES = Object.freeze(["ミナ", "ロウ", "セラ", "トーマ", "ユノ"]);
const LEARNABLE_SKILLS = Object.freeze(["応急手当", "野営", "危険察知", "値切り", "魔力制御"]);
const CLASS_ROUTE = Object.freeze(["adventurer", "warrior", "ranger", "spellblade"]);
const CLASS_NAMES = Object.freeze({ adventurer: "冒険者", warrior: "戦士", ranger: "斥候", spellblade: "魔法剣士" });

const GUILD_REQUEST_TEMPLATES = Object.freeze([
  Object.freeze({ title: "近郊街道の盗賊調査", objective: "荷車の轍を追い、街道を荒らす盗賊の野営地を排除する。", merit: 10 }),
  Object.freeze({ title: "負傷した旅人の護送", objective: "襲撃を受けた旅人を保護し、村まで連れ帰る。", merit: 12, routeEvent: "chance_rescue" }),
  Object.freeze({ title: "山道に現れた魔物の討伐", objective: "山道を塞ぐ魔物を討ち、商人の通行を再開させる。", merit: 11 }),
  Object.freeze({ title: "薬草採取隊の護衛", objective: "治療所の採取隊を危険地帯まで護衛し、全員を帰還させる。", merit: 9 }),
]);

function serviceRouteState(life, routeId) {
  life.serviceRoutes[routeId] ??= { unlocked: false, invitationIssued: false, unlockedAtRequest: null };
  return life.serviceRoutes[routeId];
}

export function getServiceRouteProgress(state) {
  const life = createVillageLifeState(state?.player?.villageLife);
  return Object.values(SERVICE_ROUTE_DEFINITIONS).map((definition) => {
    const progress = Math.max(0, Number(life[definition.progressField]) || 0);
    const route = life.serviceRoutes[definition.id] ?? {};
    return {
      ...definition,
      progress,
      target: definition.target,
      percent: Math.min(100, Math.round(progress / definition.target * 100)),
      unlocked: Boolean(route.unlocked || progress >= definition.target),
      invitationIssued: Boolean(route.invitationIssued),
    };
  });
}

function issueServiceInvitations(state, village) {
  const player = state.player;
  const life = player.villageLife;
  const unlocked = [];
  Object.values(SERVICE_ROUTE_DEFINITIONS).forEach((definition) => {
    const progress = Math.max(0, Number(life[definition.progressField]) || 0);
    const route = serviceRouteState(life, definition.id);
    if (progress < definition.target || route.unlocked) return;
    route.unlocked = true;
    route.unlockedAtRequest = life.guildRequestsReported;
    unlocked.push(definition);
    if (player.stage !== "individual" || route.invitationIssued) return;
    player.invitations ??= [];
    player.invitations.push({
      id: `service-${definition.id}`,
      routeId: definition.id,
      routeName: definition.name,
      villageId: village.id,
      ...definition.offer,
    });
    route.invitationIssued = true;
  });
  return unlocked;
}

export function performVillageAction(state, villageInput, actionId) {
  const definition = getVillageAction(actionId);
  if (!definition) throw new Error("不明な村行動です");
  const village = typeof villageInput === "string"
    ? { id: villageInput, name: villageInput }
    : { ...villageInput, id: villageInput?.id, name: villageInput?.name };
  if (!village.id || !village.name) throw new Error("行動する村を指定してください");
  const access = getVillageActionAvailability(state, actionId, village);
  if (!access.allowed) throw new Error(access.reason);

  const next = clone(state);
  normalizeVillageLifeState(next);
  const player = next.player;
  const life = player.villageLife;
  player.metrics.wealth = Math.max(0, (player.metrics.wealth ?? 0) - access.cost);
  let message = definition.description;

  switch (actionId) {
    case "restore_hp_mp":
      life.hp = life.maxHp; life.mp = life.maxMp;
      message = access.cost ? "温かい食事と睡眠でHP・MPを全回復した。" : "HP・MPはすでに万全だった。";
      break;
    case "recover_status":
      message = life.statusConditions.length ? `${life.statusConditions.join("・")}から回復した。` : "治す必要のある状態異常はなかった。";
      life.statusConditions = [];
      break;
    case "rest":
      life.fatigue = 0; life.hp = Math.min(life.maxHp, life.hp + 20); life.mp = Math.min(life.maxMp, life.mp + 10);
      message = "短い休息を取り、疲労を回復した。月は進んでいない。";
      break;
    case "save": message = "現在の人物・世界・村の状態を記録した。"; break;
    case "eat_meal":
      life.hp = Math.min(life.maxHp, life.hp + 8);
      message = "酒場で温かい食事を取り、周囲の客と同じ卓を囲んだ。土地で名が知られていれば、同行の誘いを受けることがある。";
      break;
    case "buy_weapon":
      addInventory(life, { id: "village-steel-sword", name: "村鍛冶の鋼剣", category: "equipment", slot: "weapon", enhancement: 0, durability: 100, identified: true, quantity: 1 });
      message = "村鍛冶の鋼剣を購入した。";
      break;
    case "buy_armor":
      addInventory(life, { id: "reinforced-travel-coat", name: "補強旅装", category: "equipment", slot: "armor", enhancement: 0, durability: 100, identified: true, quantity: 1 });
      message = "補強旅装を購入した。";
      break;
    case "buy_tools": addInventory(life, { id: "healing-herb", name: "薬草", category: "item", quantity: 2 }); message = "薬草を2個購入した。"; break;
    case "buy_food": addInventory(life, { id: "travel-ration", name: "保存食", category: "food", quantity: 2 }); life.supplies.food += 2; message = "保存食を2日分購入した。"; break;
    case "buy_materials": addInventory(life, { id: "local-raw-materials", name: "土地の一次素材", category: "material", quantity: 2 }); message = "薬草・原木・鉱石から選んだ一次素材を2個購入した。"; break;
    case "sell_item": {
      const sold = removeOneInventoryItem(life, 0);
      const saleGain = hasActiveCompanionPassive(life, MERCHANT_PASSIVE_ID) ? MERCHANT_SALE_GAIN : 1;
      player.metrics.wealth += saleGain;
      message = `${sold.name}を売却し、財産を${saleGain}得た。`;
      if (saleGain > 1) message += " カティアの「街道相場帳」が帰り荷まで含めた買い手を見つけた。";
      break;
    }
    case "enhance_equipment": life.equipment.weapon.enhancement = (life.equipment.weapon.enhancement ?? 0) + 1; message = `${life.equipment.weapon.name}を+${life.equipment.weapon.enhancement}へ強化した。`; break;
    case "repair_equipment":
      Object.values(life.equipment).forEach((item) => { item.durability = 100; });
      message = access.cost ? "武器と防具の耐久を完全に修復した。" : "修理が必要な装備はなかった。";
      break;
    case "appraise_equipment": {
      const target = life.inventory.find((item) => item.category === "equipment" && item.identified === false);
      if (target) { target.identified = true; message = `${target.name}を鑑定した。`; }
      else message = "未鑑定の装備はなかった。";
      break;
    }
    case "recruit_companion": {
      const name = COMPANION_NAMES[life.party.length] ?? `旅人${life.party.length + 1}`;
      const id = `companion-${life.party.length + 1}`;
      life.party.push({ id, name, level: 1, alive: true, active: life.party.every((member) => member.active !== true), abilities: normalizeAbilityScores(null, { seed: id, role: "冒険者" }) });
      message = `${name}が仲間に加わった。`;
      break;
    }
    case "organize_party":
    case "prepare_party": {
      const target = life.party.find((member) => !member.active) ?? life.party[0];
      target.active = !target.active;
      if (!life.party.some((member) => member.active)) target.active = true;
      message = `${target.name}を${target.active ? "探索メンバーに加えた" : "待機へ回した"}。`;
      break;
    }
    case "hear_rumor": {
      const rumor = `${village.name}の周辺では、夜の街道に古い石扉が現れるという。`;
      if (!life.rumors.includes(rumor)) life.rumors.push(rumor);
      message = rumor;
      break;
    }
    case "talk_npc": villageRelation(life, village.id, 2); message = "酒場の旅商人と話し、村での顔つなぎができた。"; break;
    case "seek_recommendation":
      life.recommendations += 1;
      message = "酒場の商人頭から、森の連合評議会へ宛てた推薦状を受け取った。";
      break;
    case "accept_request": {
      const requestNumber = life.guildRequestsAccepted + 1;
      const template = GUILD_REQUEST_TEMPLATES[(requestNumber - 1) % GUILD_REQUEST_TEMPLATES.length];
      life.guildRequestsAccepted = requestNumber;
      life.quests.push({
        id: `${village.id}-guild-${requestNumber}`,
        name: `${village.name}・${template.title}`,
        objective: template.objective,
        source: "guild",
        status: "accepted",
        merit: template.merit,
        routeEvent: template.routeEvent ?? null,
        acceptedVillageId: village.id,
      });
      message = `受付官マリエルが危険度・期限・達成証拠を読み上げ、${template.title}を受注票へ登録した。酒場で仲間を集め、探索準備を整えてから出発する。`;
      break;
    }
    case "complete_request": {
      const quest = life.quests.find((entry) => entry.source === "guild" && ["accepted", "active"].includes(entry.status));
      quest.status = "completed";
      quest.completedVillageId = village.id;
      life.fatigue = clamp(life.fatigue + 15, 0, 100);
      life.supplies.food = Math.max(0, life.supplies.food - 1);
      Object.values(life.equipment).forEach((item) => { item.durability = Math.max(0, item.durability - 5); });
      if (quest.routeEvent === "chance_rescue" && life.heroicRescues < 1) {
        life.heroicRescues += 1;
        message = `${quest.name}を達成した。救助した旅人は領主の使者であり、命の恩人として名を尋ねられた。ギルドへ報告に戻る。`;
      } else {
        message = `${quest.name}を達成した。証拠と経緯を携え、ギルドへ報告に戻る。`;
      }
      break;
    }
    case "report_request": {
      const quest = life.quests.find((entry) => entry.source === "guild" && entry.status === "completed");
      quest.status = "reported";
      life.guildRequestsReported += 1;
      const meritGain = getSettlementMeritGain(quest.merit ?? 10, village, player.metrics.renown);
      life.guildMerit += meritGain.merit;
      player.progress.contracts = (player.progress.contracts ?? 0) + 1;
      player.metrics.martialMerit += 8;
      recordRegionalAchievement(next, village, { label: quest.name, merit: meritGain.merit, renown: REGIONAL_REPUTATION_GAINS.completedRequest });
      villageRelation(life, village.id, meritGain.scale === "village" ? 3 : 1);
      const standing = getGuildStanding(life);
      const venue = meritGain.scale === "village" ? "酒場" : "ギルド";
      const fameNote = meritGain.scale === "town" ? `（基本名声${meritGain.baseRenown}・町内係数${meritGain.factor.toFixed(2)}）` : "（村内係数1.00）";
      message = `${quest.name}を${venue}の受付官マリエルへ報告した。功績${meritGain.merit}${fameNote}、武勲8、地方名声${REGIONAL_REPUTATION_GAINS.completedRequest}を得た。現在の扱いは「${standing.name}」となった。`;
      break;
    }
    case "receive_reward": {
      const quest = life.quests.find((entry) => entry.status === "reported");
      const reward = { wealth: 4, renown: 1, ...(quest.reward ?? {}) };
      quest.status = "rewarded";
      life.guildRequestsCompleted += 1;
      player.metrics.wealth += reward.wealth;
      recordRegionalAchievement(next, village, { label: `${quest.name}の公式評価`, merit: 0, renown: reward.renown });
      message = `受付官マリエルが${quest.name}の証拠と台帳を照合した。報酬として財産${reward.wealth}を得て、この町での評価が${reward.renown}高まった。`;
      break;
    }
    case "check_dungeon": {
      const dungeon = `${village.name}近郊・石扉遺跡`;
      if (!life.discoveredDungeons.includes(dungeon)) life.discoveredDungeons.push(dungeon);
      message = `${dungeon}の位置と危険情報を確認した。`;
      break;
    }
    case "treat_injury": message = life.injuries.length ? `${life.injuries.join("・")}を治療した。` : "治療が必要な負傷はなかった。"; life.injuries = []; life.hp = life.maxHp; break;
    case "treat_poison_disease": message = life.diseases.length ? `${life.diseases.join("・")}を治療した。` : "毒や病気は確認されなかった。"; life.diseases = []; life.statusConditions = life.statusConditions.filter((item) => !/毒|病/.test(item)); break;
    case "remove_curse": message = life.curses.length ? `${life.curses.join("・")}を解除した。` : "解除が必要な呪いはなかった。"; life.curses = []; break;
    case "resurrect": { const fallen = life.party.find((member) => member.alive === false); fallen.alive = true; fallen.active = false; message = `${fallen.name}が蘇生した。`; break; }
    case "raise_ability": life.abilityTraining += 1; message = `基礎能力の訓練段階が${life.abilityTraining}になった。`; break;
    case "learn_skill": { const skill = LEARNABLE_SKILLS.find((name) => !life.skills.includes(name)) ?? `熟練${life.skills.length + 1}`; life.skills.push(skill); message = `${skill}を習得した。`; break; }
    case "change_class": { const index = CLASS_ROUTE.indexOf(life.classId); life.classId = CLASS_ROUTE[(index + 1 + CLASS_ROUTE.length) % CLASS_ROUTE.length]; message = `${CLASS_NAMES[life.classId]}へ転職した。`; break; }
    case "train_companion": { const member = life.party[0]; member.level += 1; message = `${member.name}がレベル${member.level}になった。`; break; }
    case "enter_tournament":
      life.tournamentWins += 1;
      player.metrics.martialMerit += 2;
      recordRegionalAchievement(next, village, { label: `地方武術大会${life.tournamentWins}勝目`, merit: 6, renown: 1 });
      message = `地方武術大会で${life.tournamentWins}勝目を挙げた。武勲2を得て、この町で武勇が知られた。`;
      break;
    case "store_items": message = toggleStorage(life, ["item", "food", "supply"], "items"); break;
    case "store_equipment": message = toggleStorage(life, ["equipment"], "equipment"); break;
    case "manage_materials": message = toggleStorage(life, ["material"], "materials"); break;
    case "talk_villagers": {
      villageRelation(life, village.id, 1);
      const standing = getGuildStanding(life);
      message = standing.id === "newcomer"
        ? "村人と名乗り合い、土地の暮らしを教えてもらった。まだこちらの仕事ぶりを見定めている。"
        : `${standing.greeting} 村人から土地の近況と感謝を聞いた。`;
      break;
    }
    case "gather_information": { const rumor = `${village.name}の水場と安全な街道を記録した。`; if (!life.rumors.includes(rumor)) life.rumors.push(rumor); message = rumor; break; }
    case "trigger_event": villageRelation(life, village.id, 3); recordRegionalAchievement(next, village, { label: "荷車事故の救援", merit: 4, renown: REGIONAL_REPUTATION_GAINS.goodDeed }); message = `荷車の事故を手伝い、この村との関係と地方名声が${REGIONAL_REPUTATION_GAINS.goodDeed}高まった。`; break;
    case "find_sidequest": life.quests.push({ id: `${village.id}-side-${life.quests.length + 1}`, name: "村人の失くし物", source: "villager", status: "active" }); message = "村人の失くし物を探すサブクエストを受けた。"; break;
    case "build_facility": villageProgress(life, village.id).buildings += 1; villageRelation(life, village.id, 4); recordRegionalAchievement(next, village, { label: "共同施設の建設支援", merit: 10, renown: REGIONAL_REPUTATION_GAINS.goodDeed }); message = `不足していた共同施設の建設を支援し、地方名声が${REGIONAL_REPUTATION_GAINS.goodDeed}高まった。`; break;
    case "upgrade_facility": villageProgress(life, village.id).facilityLevel += 1; villageRelation(life, village.id, 3); recordRegionalAchievement(next, village, { label: "村の施設強化", merit: 8, renown: REGIONAL_REPUTATION_GAINS.goodDeed }); message = `村の施設水準が${villageProgress(life, village.id).facilityLevel}になり、地方名声が${REGIONAL_REPUTATION_GAINS.goodDeed}高まった。`; break;
    case "invite_specialist": villageProgress(life, village.id).specialists += 1; villageRelation(life, village.id, 3); recordRegionalAchievement(next, village, { label: "商人・職人の誘致", merit: 8, renown: REGIONAL_REPUTATION_GAINS.goodDeed }); message = `新しい商人・職人の定着を支援し、地方名声が${REGIONAL_REPUTATION_GAINS.goodDeed}高まった。`; break;
    case "change_equipment": {
      const index = firstInventoryIndex(life, ["equipment"]);
      const replacement = removeOneInventoryItem(life, index);
      const slot = replacement.slot ?? "weapon";
      const previous = life.equipment[slot];
      life.equipment[slot] = replacement;
      addInventory(life, { ...previous, quantity: 1 });
      message = `${replacement.name}を装備した。`;
      break;
    }
    case "organize_items": life.inventory.sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name, "ja")); message = "所持品を用途別に整理した。"; break;
    case "restock_supplies": life.supplies.food += 2; life.supplies.torches += 2; message = "保存食2日分と松明2本を補給した。"; break;
    default: break;
  }

  if (access.standingDiscountRate > 0) message += ` ギルド功績「${access.standing.name}」の割引を受けた。`;
  if (access.companionDiscountRate > 0) message += " カティアの「街道相場帳」により購入費が12%軽減された。";
  const unlockedRoutes = issueServiceInvitations(next, village);
  if (unlockedRoutes.length) message += ` ${unlockedRoutes.map((route) => `「${route.name}」`).join("・")}の士官経路が開いた。`;
  recordVillageAction(next, village, definition, message);
  return next;
}
