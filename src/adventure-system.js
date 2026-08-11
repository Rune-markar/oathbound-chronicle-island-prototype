import { FACING, UNIT_ORDERS } from "./tactical-data.js";
import {
  createBattleMap,
  createBattleState,
  createCombatUnit,
  createCommander,
  autoResolveBattle,
  setBattleTerrain,
  setBattleTileFeature,
} from "./tactical-battle.js";
import { advanceGeneratedWorldTime } from "./generated-world-system.js";
import { NOELA_ORBIS_ID, UNIQUE_CHARACTERS, getUniqueCharacter } from "./unique-characters.js";
import { ABILITY_LABELS, normalizeAbilityScores } from "./character-abilities.js";

const clone = (value) => structuredClone(value);

export const ADVENTURE_SCHEMA_VERSION = 5;

const OBSOLETE_DUNGEON_GUIDANCE_PATTERN = /近郊・石扉遺跡/;
const PERSONAL_BATTLE_ROLE_LABELS = Object.freeze({
  infantry: "近接", spearman: "槍", archer: "遠隔", mage: "術師", light_cavalry: "機動", heavy_infantry: "重装",
});

export const ADVENTURE_ART = Object.freeze({
  village: "./assets/generated/adventure/village.png",
  guild: "./assets/generated/adventure/guild.png",
  tavern: "./assets/generated/adventure/tavern.png",
  cave: "./assets/generated/adventure/dungeon-cave.png",
  forest: "./assets/generated/adventure/dungeon-forest.png",
  spring: "./assets/generated/adventure/dungeon-spring.png",
});

export const DUNGEON_ARCHETYPES = Object.freeze({
  cave: Object.freeze({
    id: "cave",
    name: "洞窟",
    title: "灰晶洞",
    symbol: "洞",
    description: "濡れた石段と地底河をたどる洞窟。鉱石を抱えた魔物が棲む。",
    enemy: Object.freeze({ id: "stone-maw", name: "岩喰らい", maxHp: 38, attack: 8, symbol: "岩" }),
    loot: Object.freeze([
      Object.freeze({ id: "cave-crystal", name: "洞窟水晶", icon: "晶" }),
      Object.freeze({ id: "deep-iron", name: "深層鉄", icon: "鉄" }),
      Object.freeze({ id: "stone-maw-core", name: "岩喰らいの核", icon: "核" }),
    ]),
  }),
  forest: Object.freeze({
    id: "forest",
    name: "森",
    title: "古樹迷森",
    symbol: "森",
    description: "巨木の根と苔むす祭石が道を変える、森そのものの迷宮。",
    enemy: Object.freeze({ id: "forest-goblin-warbands", name: "森ゴブリンの群れ", maxHp: 34, attack: 7, symbol: "鬼" }),
    loot: Object.freeze([
      Object.freeze({ id: "moon-herb", name: "月灯草", icon: "薬" }),
      Object.freeze({ id: "elder-bark", name: "古樹皮", icon: "樹" }),
      Object.freeze({ id: "goblin-standard", name: "ゴブリン隊旗", icon: "旗" }),
    ]),
  }),
  spring: Object.freeze({
    id: "spring",
    name: "泉",
    title: "蒼泉聖窟",
    symbol: "泉",
    description: "水没した回廊の先に霊泉が光る、水中と石造遺構の迷宮。",
    enemy: Object.freeze({ id: "azure-slime", name: "蒼水の擬態体", maxHp: 42, attack: 9, symbol: "雫" }),
    loot: Object.freeze([
      Object.freeze({ id: "spirit-water", name: "霊泉水", icon: "水" }),
      Object.freeze({ id: "pearl-shard", name: "白珠片", icon: "珠" }),
      Object.freeze({ id: "azure-nucleus", name: "蒼水核", icon: "核" }),
    ]),
  }),
});

const PARTY_NAMES = Object.freeze(["セラ", "ミレル", "イルヴァ", "マラ", "ダリオ", "エドラス", "ガイウス", "ネリス"]);
const PARTY_PORTRAITS = Object.freeze({
  セラ: "./assets/generated/officer-sera.webp",
  ミレル: "./assets/generated/officer-mirel.webp",
  イルヴァ: "./assets/generated/officer-ilva.webp",
  マラ: "./assets/generated/officer-mara.webp",
  ダリオ: "./assets/generated/officer-dario.webp",
  エドラス: "./assets/generated/officer-edras.webp",
  ガイウス: "./assets/generated/officer-gaius.webp",
  ネリス: "./assets/generated/race-human.webp",
});
const PARTY_ROLES = Object.freeze([
  Object.freeze({ id: "vanguard", name: "前衛", specialty: "敵の攻撃を引き受ける" }),
  Object.freeze({ id: "scout", name: "斥候", specialty: "罠と隠し道を見抜く" }),
  Object.freeze({ id: "healer", name: "治療師", specialty: "探索中の消耗を抑える" }),
  Object.freeze({ id: "mage", name: "術師", specialty: "敵の弱点を突く" }),
]);

export const NPC_GREETING_APPROACHES = Object.freeze([
  Object.freeze({ id: "gentle", name: "穏やかに声をかける", shortName: "穏やか" }),
  Object.freeze({ id: "friendly", name: "気さくに話しかける", shortName: "気さく" }),
  Object.freeze({ id: "imposing", name: "強気な態度で接する", shortName: "強気" }),
]);

export const NPC_CONVERSATION_ACTIONS = Object.freeze([
  Object.freeze({ id: "small_talk", name: "世間話をする", description: "土地や旅の話から人柄を知る。" }),
  Object.freeze({ id: "ask_history", name: "経歴を聞く", description: "過去の所属や現在の目的を尋ねる。" }),
  Object.freeze({ id: "ask_skills", name: "腕前について聞く", description: "話し方や身のこなしから力量を推し量る。" }),
  Object.freeze({ id: "buy_drink", name: "酒を奢る", description: "財産1を使い、杯を交わして距離を縮める。", cost: 1 }),
  Object.freeze({ id: "discuss_work", name: "仕事の話をする", description: "同行する理由と条件を確かめる。" }),
  Object.freeze({ id: "invite", name: "仲間に誘う", description: "判明している条件を踏まえて同行を頼む。" }),
]);

const NPC_PERSONALITIES = Object.freeze([
  Object.freeze({
    id: "cautious", name: "慎重", value: "安全と約束", favoredApproachId: "gentle", dislikedApproachId: "imposing", smallTalkBonus: 1, drinkBonus: 1,
    reactions: Object.freeze({
      gentle: "警戒を解き、落ち着いた声で名乗り返した。",
      imposing: "椅子を引き、こちらの出方を慎重にうかがっている。",
      friendly: "少し戸惑いながらも、短い世間話には応じた。",
    }),
  }),
  Object.freeze({
    id: "proud", name: "誇り高い", value: "力量と名誉", favoredApproachId: "imposing", dislikedApproachId: "friendly", smallTalkBonus: 0, drinkBonus: 0,
    reactions: Object.freeze({
      gentle: "礼は返したが、力量を測るような視線は崩さない。",
      imposing: "挑むような笑みを返し、対等な相手として向き直った。",
      friendly: "馴れ馴れしさを好まないらしく、返事は素っ気ない。",
    }),
  }),
  Object.freeze({
    id: "sociable", name: "社交的", value: "人との縁", favoredApproachId: "friendly", dislikedApproachId: "imposing", smallTalkBonus: 3, drinkBonus: 3,
    reactions: Object.freeze({
      gentle: "柔らかく笑い、旅先の話を一つ聞かせてくれた。",
      imposing: "場を和ませようとはしたが、声には距離が残った。",
      friendly: "待っていた友人のように席を空け、話を弾ませた。",
    }),
  }),
  Object.freeze({
    id: "taciturn", name: "寡黙", value: "行動と実績", favoredApproachId: "gentle", dislikedApproachId: "friendly", smallTalkBonus: -1, drinkBonus: 1,
    reactions: Object.freeze({
      gentle: "簡潔だが丁寧に応じ、こちらの話を最後まで聞いた。",
      imposing: "怯まず姿勢を正し、要件を率直に尋ねてきた。",
      friendly: "冗談には乗らず、要件だけを話すよう促した。",
    }),
  }),
  Object.freeze({
    id: "practical", name: "現実的", value: "報酬と仕事の確かさ", favoredApproachId: "gentle", dislikedApproachId: "imposing", smallTalkBonus: 0, drinkBonus: 2,
    reactions: Object.freeze({
      gentle: "短く名乗り、まず仕事の内容を聞こうと身を乗り出した。",
      imposing: "条件を曖昧にしたまま威勢だけを示す相手だと見て、眉をひそめた。",
      friendly: "愛想よく杯を上げたが、話を報酬と役割へ戻した。",
    }),
  }),
]);

const NPC_RECRUITMENT_POLICIES = Object.freeze([
  Object.freeze({ id: "friendship", name: "親交型" }),
  Object.freeze({ id: "mercenary", name: "傭兵型" }),
  Object.freeze({ id: "evaluation", name: "評価型" }),
  Object.freeze({ id: "purpose", name: "目的型" }),
]);

const PERSONAL_MAP_FORAGE = Object.freeze({
  forest: Object.freeze({ id: "wild-herb", name: "薬草", icon: "草" }),
  rainforest: Object.freeze({ id: "bright-leaf", name: "照葉草", icon: "葉" }),
  wetland: Object.freeze({ id: "marsh-herb", name: "水辺草", icon: "草" }),
  lake: Object.freeze({ id: "blue-reed", name: "蒼葦", icon: "葦" }),
  coast: Object.freeze({ id: "salt-herb", name: "潮香草", icon: "草" }),
  mountains: Object.freeze({ id: "stone-moss", name: "岩苔", icon: "苔" }),
  hills: Object.freeze({ id: "hill-herb", name: "丘野草", icon: "草" }),
  badlands: Object.freeze({ id: "iron-root", name: "鉄根草", icon: "根" }),
  snow: Object.freeze({ id: "snow-flower", name: "雪花草", icon: "花" }),
  tundra: Object.freeze({ id: "frost-moss", name: "霜苔", icon: "苔" }),
  plains: Object.freeze({ id: "field-herb", name: "野草", icon: "草" }),
});

const PERSONAL_MAP_LANDMARKS = Object.freeze({
  forest: Object.freeze({ name: "木漏れ日の沢", symbol: "沢", description: "獣道が集まる浅い沢。森の奥へ向かう目印になる。" }),
  rainforest: Object.freeze({ name: "苔むす祭壇", symbol: "壇", description: "蔓に覆われた古い祭壇。周辺の高台へ道が続いている。" }),
  wetland: Object.freeze({ name: "葦舟の渡し", symbol: "渡", description: "湿地の水路を越えられる、古い渡し場。" }),
  lake: Object.freeze({ name: "湖畔の石標", symbol: "標", description: "湖岸の安全な道を示す、風化した石標。" }),
  coast: Object.freeze({ name: "潮見の岬", symbol: "岬", description: "海岸沿いの道と洞穴を見渡せる小さな岬。" }),
  mountains: Object.freeze({ name: "風切り峠", symbol: "峠", description: "岩壁の間を抜ける狭い峠。山中の分岐点になる。" }),
  hills: Object.freeze({ name: "見晴らし丘", symbol: "丘", description: "周辺の道と森を一望できる草の丘。" }),
  badlands: Object.freeze({ name: "崩れた道標", symbol: "標", description: "荒地に残る道標。消えかけた文字が古道を示す。" }),
  snow: Object.freeze({ name: "白樺の避難所", symbol: "舎", description: "吹雪を避けられる小屋と、山道の分岐がある。" }),
  tundra: Object.freeze({ name: "凍原の立石", symbol: "石", description: "遠くからも見える立石。安全な足場の目印になる。" }),
  plains: Object.freeze({ name: "古い街道標", symbol: "標", description: "草原を横切る旧街道の道標。複数の小径が交わる。" }),
});

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dungeonTypeFor(region, worldSeed = "world") {
  const terrain = region?.dominantTerrain;
  if (["forest", "rainforest"].includes(terrain)) return "forest";
  if (["wetland", "lake", "coast"].includes(terrain)) return "spring";
  if (["mountains", "hills", "badlands", "snow", "tundra"].includes(terrain)) return "cave";
  return ["cave", "forest", "spring"][hashString(`${worldSeed}:${region?.id}`) % 3];
}

function emptyAdventureState() {
  return {
    schemaVersion: ADVENTURE_SCHEMA_VERSION,
    inventory: [],
    party: [],
    activeContracts: [],
    completedContracts: [],
    completedDungeonIds: [],
    recoveredDungeonLootKeys: [],
    dungeonHistory: [],
    activeRun: null,
    personalMap: { regions: {} },
    npcRelations: {},
  };
}

function normalizePersonalMapState(value) {
  const regions = {};
  Object.entries(value?.regions ?? {}).forEach(([regionId, region]) => {
    if (!region || typeof region !== "object") return;
    regions[regionId] = {
      currentLocationId: typeof region.currentLocationId === "string" ? region.currentLocationId : null,
      discoveredLocationIds: [...new Set((region.discoveredLocationIds ?? []).filter((id) => typeof id === "string"))].slice(0, 32),
      explorationCount: Math.max(0, Math.floor(Number(region.explorationCount) || 0)),
      lastResult: region.lastResult ? { ...region.lastResult } : null,
      history: (region.history ?? []).filter((entry) => entry && typeof entry === "object").slice(0, 12).map((entry) => ({ ...entry })),
    };
  });
  return { regions };
}

function candidateRecruitmentPolicy(candidateId) {
  return NPC_RECRUITMENT_POLICIES[hashString(`${candidateId}:recruitment-policy`) % NPC_RECRUITMENT_POLICIES.length];
}

function normalizeNpcRelation(candidateId, relation) {
  const interactions = Math.max(0, Math.floor(Number(relation?.interactions) || 0));
  const legacyFirstMeeting = interactions > 0 || Boolean(relation?.firstApproachId);
  const affinityFallback = relation?.firstImpressionBonus === true ? 18 : legacyFirstMeeting ? 4 : 0;
  const policy = candidateRecruitmentPolicy(candidateId);
  return {
    interactions,
    affinity: Math.max(-40, Math.min(100, Number.isFinite(Number(relation?.affinity)) ? Number(relation.affinity) : affinityFallback)),
    firstMeetingComplete: relation?.firstMeetingComplete === true || legacyFirstMeeting,
    firstApproachId: relation?.firstApproachId ?? null,
    firstImpressionBonus: relation?.firstImpressionBonus === true,
    topics: Object.fromEntries(Object.entries(relation?.topics ?? {}).filter(([, count]) => Number(count) > 0).map(([topicId, count]) => [topicId, Math.max(0, Math.floor(Number(count)))])),
    discovered: [...new Set((relation?.discovered ?? []).filter((entry) => typeof entry === "string"))],
    recruitmentPolicyId: NPC_RECRUITMENT_POLICIES.some((entry) => entry.id === relation?.recruitmentPolicyId) ? relation.recruitmentPolicyId : policy.id,
    recruitmentConditionKnown: relation?.recruitmentConditionKnown === true,
    recruitmentAttempts: Math.max(0, Math.floor(Number(relation?.recruitmentAttempts) || 0)),
    drinksBought: Math.max(0, Math.floor(Number(relation?.drinksBought) || 0)),
    joined: relation?.joined === true,
    lastResult: relation?.lastResult ? { ...relation.lastResult } : null,
  };
}

export function normalizeAdventureState(state) {
  const baseline = emptyAdventureState();
  const current = state?.adventure ?? {};
  const activeRun = current.activeRun
    ? {
        ...current.activeRun,
        combatScale: current.activeRun.combatScale ?? "personal-units",
        combat: current.activeRun.combat
          ? {
              ...current.activeRun.combat,
              tacticalBattleId: current.activeRun.combat.tacticalBattleId ?? `dungeon-battle:${current.activeRun.id}`,
            }
          : null,
      }
    : null;
  state.adventure = {
    ...baseline,
    ...current,
    schemaVersion: ADVENTURE_SCHEMA_VERSION,
    inventory: [...(current.inventory ?? [])],
    party: (current.party ?? []).map((member) => ({
      ...member,
      abilities: normalizeAbilityScores(member.abilities, { seed: member.id ?? member.name, role: `${member.role ?? ""} ${member.specialty ?? ""}` }),
    })),
    activeContracts: [...(current.activeContracts ?? [])],
    completedContracts: [...(current.completedContracts ?? [])],
    completedDungeonIds: [...(current.completedDungeonIds ?? [])],
    recoveredDungeonLootKeys: [...(current.recoveredDungeonLootKeys ?? [])],
    dungeonHistory: [...(current.dungeonHistory ?? [])],
    activeRun,
    personalMap: normalizePersonalMapState(current.personalMap),
    npcRelations: Object.fromEntries(Object.entries(current.npcRelations ?? {}).map(([candidateId, relation]) => [candidateId, normalizeNpcRelation(candidateId, relation)])),
  };
  if (state.player) {
    state.player.abilities = normalizeAbilityScores(state.player.abilities, { seed: `player:${state.player.name ?? "主人公"}`, role: state.player.specialty });
    if (Array.isArray(state.player.villageLife?.party)) {
      state.player.villageLife.party = state.player.villageLife.party.map((member) => ({
        ...member,
        maxHp: Math.max(1, Number(member.maxHp) || 42 + Math.max(1, Number(member.level) || 1) * 6),
        hp: Math.max(0, Math.min(Number(member.maxHp) || 42 + Math.max(1, Number(member.level) || 1) * 6, Number.isFinite(Number(member.hp)) ? Number(member.hp) : Number(member.maxHp) || 42 + Math.max(1, Number(member.level) || 1) * 6)),
        battleState: member.battleState ?? "READY",
        abilities: normalizeAbilityScores(member.abilities, { seed: member.id ?? member.name, role: `${member.role ?? ""} ${member.specialty ?? ""}` }),
      }));
    }
    const life = state.player.villageLife;
    const canonicalDungeon = life?.discoveredDungeons?.find((name) => typeof name === "string" && !OBSOLETE_DUNGEON_GUIDANCE_PATTERN.test(name));
    if (canonicalDungeon) {
      life.discoveredDungeons = [...new Set(life.discoveredDungeons.filter((name) => !OBSOLETE_DUNGEON_GUIDANCE_PATTERN.test(name)))];
      const corrected = `${canonicalDungeon}の位置、接続経路、出現する敵の情報を地図へ記録した。`;
      life.actionHistory?.forEach((entry) => {
        if (entry.actionId === "check_dungeon" && OBSOLETE_DUNGEON_GUIDANCE_PATTERN.test(entry.message ?? "")) entry.message = corrected;
      });
      state.player.history?.forEach((entry) => {
        if (entry.title?.endsWith("・ダンジョン情報確認") && OBSOLETE_DUNGEON_GUIDANCE_PATTERN.test(entry.detail ?? "")) entry.detail = corrected;
      });
    }
  }
  return state;
}

function preparedClone(state) {
  return normalizeAdventureState(clone(state));
}

function addInventoryItem(adventure, item, quantity = 1) {
  const existing = adventure.inventory.find((entry) => entry.id === item.id);
  if (existing) existing.quantity += quantity;
  else adventure.inventory.push({ ...item, quantity });
}

function addVillageInventoryItem(state, item, quantity = 1) {
  const inventory = state.player?.villageLife?.inventory;
  if (!Array.isArray(inventory)) return;
  const existing = inventory.find((entry) => entry.id === item.id);
  if (existing) existing.quantity = (existing.quantity ?? 1) + quantity;
  else inventory.push({ ...item, category: "material", quantity });
}

function inventoryQuantity(inventory, itemId) {
  return (inventory ?? []).filter((entry) => entry.id === itemId)
    .reduce((sum, entry) => sum + Math.max(0, Number(entry.quantity) || 0), 0);
}

function trophyIdForEnemy(enemyId) {
  return Object.values(DUNGEON_ARCHETYPES).find((entry) => entry.enemy.id === enemyId)?.loot?.[2]?.id ?? null;
}

function removeInventoryQuantity(inventory, itemId, quantity) {
  let remaining = quantity;
  for (const entry of inventory ?? []) {
    if (entry.id !== itemId || remaining <= 0) continue;
    const held = Math.max(0, Number(entry.quantity) || 0);
    const removed = Math.min(held, remaining);
    entry.quantity = held - removed;
    remaining -= removed;
  }
  for (let index = (inventory?.length ?? 0) - 1; index >= 0; index -= 1) {
    if ((inventory[index].quantity ?? 0) <= 0) inventory.splice(index, 1);
  }
}

function grantLoot(state, run, item, { oncePerSite = false } = {}) {
  const recoveryKey = `${run.dungeonId ?? run.regionId ?? "unknown"}:${item.id}`;
  if (oncePerSite && state.adventure.recoveredDungeonLootKeys.includes(recoveryKey)) {
    return { ...item, quantity: 0, alreadyRecovered: true };
  }
  const appraised = hasActiveUniqueCompanion(state, NOELA_ORBIS_ID);
  const quantity = appraised ? 2 : 1;
  addInventoryItem(state.adventure, item, quantity);
  addVillageInventoryItem(state, item, quantity);
  const recovered = { ...item, quantity };
  if (appraised) {
    recovered.provenanceAppraiserId = NOELA_ORBIS_ID;
    run.provenanceBonusLoot = (run.provenanceBonusLoot ?? 0) + 1;
  }
  run.loot.push(recovered);
  if (oncePerSite) state.adventure.recoveredDungeonLootKeys.push(recoveryKey);
  return recovered;
}

function activePartyCount(state) {
  const villageParty = state.player?.villageLife?.party;
  if (Array.isArray(villageParty)) return villageParty.filter((member) => member.active !== false && member.alive !== false).length;
  return state.adventure?.party?.length ?? 0;
}

function hasActiveUniqueCompanion(state, characterId) {
  const memberId = UNIQUE_CHARACTERS[characterId]?.adventure?.memberId;
  if (!memberId) return false;
  const villageParty = state.player?.villageLife?.party;
  if (Array.isArray(villageParty)) {
    return villageParty.some((member) => (
      (member.uniqueCharacterId === characterId || member.id === memberId)
      && member.active !== false
      && member.alive !== false
    ));
  }
  return state.adventure?.party?.some((member) => member.uniqueCharacterId === characterId || member.id === memberId) ?? false;
}

function regionTile(region, runtime, offset) {
  const indices = region?.tileIndices ?? [];
  if (!indices.length) return runtime?.tiles?.[region?.anchorIndex] ?? null;
  const index = indices[hashString(`${region.id}:${offset}`) % indices.length];
  return runtime?.tiles?.[index] ?? runtime?.tiles?.[region.anchorIndex] ?? null;
}

export function getRegionAdventureSites(state, { region, nation, runtime }) {
  const seed = state.generatedWorld?.seed ?? "world";
  const dungeonType = dungeonTypeFor(region, seed);
  const archetype = DUNGEON_ARCHETYPES[dungeonType];
  const villageTile = runtime?.tiles?.[region.markerIndex] ?? runtime?.tiles?.[region.anchorIndex] ?? null;
  const dungeonTile = regionTile(region, runtime, `dungeon:${dungeonType}`);
  const villageName = `${nation?.shortName ?? region.name}辺境村`;
  return {
    village: {
      id: `village:${region.id}`,
      type: "village",
      name: villageName,
      subtitle: `${region.name}の冒険拠点`,
      art: ADVENTURE_ART.village,
      tile: villageTile,
    },
    dungeon: {
      id: `dungeon:${region.id}:${dungeonType}`,
      type: "dungeon",
      dungeonType,
      name: `${region.name.replace(/地方$/, "")}・${archetype.title}`,
      subtitle: `${archetype.name}型ダンジョン`,
      description: archetype.description,
      symbol: archetype.symbol,
      art: ADVENTURE_ART[dungeonType],
      tile: dungeonTile,
      cleared: state.adventure?.completedDungeonIds?.includes(`dungeon:${region.id}:${dungeonType}`) ?? false,
    },
  };
}

function personalMapLocationDefinitions(state, context) {
  const { region, nation, runtime } = context;
  if (!region?.id) throw new Error("個人マップを作成できる地方がありません。");
  const { village, dungeon } = getRegionAdventureSites(state, context);
  const terrain = region.dominantTerrain ?? "plains";
  const landmark = PERSONAL_MAP_LANDMARKS[terrain] ?? PERSONAL_MAP_LANDMARKS.plains;
  const campId = `personal:${region.id}:camp`;
  const forageId = `personal:${region.id}:forage`;
  const landmarkId = `personal:${region.id}:landmark`;
  const campTile = regionTile(region, runtime, "personal:camp");
  const forageTile = regionTile(region, runtime, "personal:forage");
  const landmarkTile = regionTile(region, runtime, "personal:landmark");
  return [
    {
      id: campId,
      type: "camp",
      name: "旅人の野営地",
      symbol: "営",
      description: `${region.name}を歩くための荷物と目印を置いた野営地。`,
      x: 48,
      y: 72,
      tileId: campTile?.id ?? null,
      neighborIds: [village.id, forageId, landmarkId],
    },
    {
      id: village.id,
      type: "village",
      name: village.name,
      symbol: "村",
      description: `${nation?.shortName ?? region.name}の人々が暮らす、宿と店のある集落。`,
      x: 18,
      y: 43,
      tileId: village.tile?.id ?? null,
      neighborIds: [campId, forageId],
    },
    {
      id: forageId,
      type: "wilds",
      name: terrain === "forest" || terrain === "rainforest" ? "採取できる林縁" : "採取できる野原",
      symbol: "草",
      description: "野草や小さな素材を探せる、比較的安全な場所。",
      x: 70,
      y: 48,
      tileId: forageTile?.id ?? null,
      neighborIds: [campId, village.id, dungeon.id],
    },
    {
      id: landmarkId,
      type: "landmark",
      name: landmark.name,
      symbol: landmark.symbol,
      description: landmark.description,
      x: 76,
      y: 17,
      tileId: landmarkTile?.id ?? null,
      neighborIds: [campId, dungeon.id],
    },
    {
      id: dungeon.id,
      type: "dungeon",
      name: dungeon.name,
      symbol: dungeon.symbol,
      description: dungeon.description,
      x: 39,
      y: 14,
      tileId: dungeon.tile?.id ?? null,
      neighborIds: [forageId, landmarkId],
      dungeonType: dungeon.dungeonType,
    },
  ];
}

function personalRegionSnapshot(state, context) {
  const definitions = personalMapLocationDefinitions(state, context);
  const byId = new Map(definitions.map((location) => [location.id, location]));
  const stored = state.adventure?.personalMap?.regions?.[context.region.id] ?? {};
  const startingIds = definitions.filter((location) => ["camp", "village"].includes(location.type)).map((location) => location.id);
  const discovered = new Set([
    ...startingIds,
    ...(stored.discoveredLocationIds ?? []).filter((id) => byId.has(id)),
  ]);
  const fallbackId = definitions.find((location) => location.type === "camp").id;
  const currentLocationId = discovered.has(stored.currentLocationId) ? stored.currentLocationId : fallbackId;
  return {
    definitions,
    byId,
    record: {
      currentLocationId,
      discoveredLocationIds: [...discovered],
      explorationCount: Math.max(0, Math.floor(Number(stored.explorationCount) || 0)),
      lastResult: stored.lastResult ? { ...stored.lastResult } : null,
      history: (stored.history ?? []).slice(0, 12).map((entry) => ({ ...entry })),
    },
  };
}

function storePersonalRegion(state, regionId, record) {
  state.adventure.personalMap.regions[regionId] = {
    ...record,
    discoveredLocationIds: [...record.discoveredLocationIds],
    lastResult: record.lastResult ? { ...record.lastResult } : null,
    history: record.history.slice(0, 12).map((entry) => ({ ...entry })),
  };
}

function revealRegionDungeonOnDraft(state, context) {
  const { definitions, record } = personalRegionSnapshot(state, context);
  const dungeon = definitions.find((location) => location.type === "dungeon");
  if (!dungeon) throw new Error("この地方のダンジョン情報を特定できません。");
  if (!record.discoveredLocationIds.includes(dungeon.id)) record.discoveredLocationIds.push(dungeon.id);
  const knownDungeons = state.player?.villageLife?.discoveredDungeons;
  if (Array.isArray(knownDungeons) && !knownDungeons.includes(dungeon.name)) knownDungeons.push(dungeon.name);
  storePersonalRegion(state, context.region.id, record);
  return dungeon;
}

export function revealRegionDungeon(state, context) {
  const next = preparedClone(state);
  const dungeon = revealRegionDungeonOnDraft(next, context);
  if (next.player?.villageLife?.lastAction?.actionId === "check_dungeon") {
    const message = `${dungeon.name}の位置、接続経路、出現する敵の情報を地図へ記録した。`;
    const actionId = next.player.villageLife.lastAction.id;
    next.player.villageLife.lastAction.message = message;
    const historyAction = next.player.villageLife.actionHistory?.find((entry) => entry.id === actionId);
    if (historyAction) historyAction.message = message;
    const chronicleEntry = next.player.history?.find((entry) => entry.title?.endsWith("・ダンジョン情報確認"));
    if (chronicleEntry) chronicleEntry.detail = message;
  }
  return next;
}

function personalMapResult(record, result) {
  record.lastResult = result;
  record.history = [result, ...record.history].slice(0, 12);
}

export function getPersonalMapView(state, context) {
  const { definitions, byId, record } = personalRegionSnapshot(state, context);
  const current = byId.get(record.currentLocationId);
  const reachableIds = new Set(current.neighborIds.filter((id) => record.discoveredLocationIds.includes(id)));
  return {
    regionId: context.region.id,
    regionName: context.region.name,
    currentLocation: { ...current },
    explorationCount: record.explorationCount,
    lastResult: record.lastResult ? { ...record.lastResult } : null,
    locations: definitions.map((location) => record.discoveredLocationIds.includes(location.id)
      ? { ...location, discovered: true, current: location.id === current.id, reachable: reachableIds.has(location.id) }
      : {
          id: location.id,
          type: "unknown",
          name: "未発見",
          symbol: "?",
          description: "この付近を探索すると見つかる可能性がある。",
          x: location.x,
          y: location.y,
          discovered: false,
          current: false,
          reachable: false,
        }),
    reachableLocations: definitions.filter((location) => reachableIds.has(location.id)).map((location) => ({ ...location })),
  };
}

export function movePersonalMap(state, context, destinationId) {
  let next = preparedClone(state);
  const { byId, record } = personalRegionSnapshot(next, context);
  const current = byId.get(record.currentLocationId);
  const destination = byId.get(destinationId);
  if (!destination || !record.discoveredLocationIds.includes(destinationId)) throw new RangeError("その場所はまだ発見されていません。");
  if (!current.neighborIds.includes(destinationId)) throw new Error("現在地から直接移動できる近くの場所ではありません。");
  const distance = Math.hypot(destination.x - current.x, destination.y - current.y);
  const travelMinutes = Math.min(6 * 60, Math.max(90, Math.ceil(distance / 10) * 30));
  const fatigueGain = Math.max(2, Math.ceil(travelMinutes / 60) * 2);
  record.currentLocationId = destinationId;
  const result = {
    id: `move:${context.region.id}:${record.explorationCount}:${destinationId}`,
    type: "move",
    title: "移動完了",
    message: `${destination.name}へ移動した。移動疲労が${fatigueGain}増えた。`,
    locationId: destinationId,
    locationName: destination.name,
    travelMinutes,
  };
  personalMapResult(record, result);
  storePersonalRegion(next, context.region.id, record);
  if (next.generatedWorld && destination.tileId) {
    next.generatedWorld = {
      ...next.generatedWorld,
      expeditionRegionId: context.region.id,
      expeditionTileId: destination.tileId,
      selectedRegionId: context.region.id,
    };
  }
  next = advanceGeneratedWorldTime(next, travelMinutes);
  if (next.player?.villageLife) next.player.villageLife.fatigue = Math.min(100, (next.player.villageLife.fatigue ?? 0) + fatigueGain);
  return next;
}

function personalEncounterRun(state, context, location, resultId) {
  const { dungeon } = getRegionAdventureSites(state, context);
  const archetype = DUNGEON_ARCHETYPES[dungeon.dungeonType];
  const partySize = activePartyCount(state);
  const villageLife = state.player?.villageLife;
  const playerMaxHp = villageLife?.maxHp ?? 42 + partySize * 8;
  const playerHp = villageLife?.hp ?? playerMaxHp;
  return {
    id: `run:personal:${context.region.id}:${resultId}`,
    mode: "personal-map",
    personalMapResultId: resultId,
    dungeonId: null,
    dungeonName: `${location.name}周辺`,
    dungeonType: dungeon.dungeonType,
    regionId: context.region.id,
    phase: "battle",
    step: 0,
    totalSteps: 1,
    playerHp,
    playerMaxHp,
    skippedBattles: 0,
    completedContractIds: [],
    loot: [],
    combat: {
      enemyId: archetype.enemy.id,
      enemyName: archetype.enemy.name,
      enemySymbol: archetype.enemy.symbol,
      enemyHp: archetype.enemy.maxHp,
      enemyMaxHp: archetype.enemy.maxHp,
      enemyAttack: archetype.enemy.attack,
      turn: 1,
      outcome: null,
      tacticalBattleId: `personal-battle:${context.region.id}:${resultId}`,
    },
    logSerial: 1,
    log: [{ id: "entry", message: `${location.name}を探索中、${archetype.enemy.name}に遭遇した。`, tone: "danger" }],
  };
}

export function explorePersonalMap(state, context, options = {}) {
  const next = preparedClone(state);
  if ((next.player?.villageLife?.hp ?? 0) < 35) throw new Error("HPが35未満です。村の神殿・治療所で負傷を治してから探索してください。");
  if (next.adventure.activeRun) throw new Error("進行中の探索を完了してから周辺を探索してください。");
  const { definitions, byId, record } = personalRegionSnapshot(next, context);
  const current = byId.get(record.currentLocationId);
  const candidates = definitions.filter((location) => current.neighborIds.includes(location.id) && !record.discoveredLocationIds.includes(location.id));
  const deterministicRoll = hashString(`${next.generatedWorld?.seed ?? "world"}:${context.region.id}:${current.id}:${record.explorationCount}`) / 0x100000000;
  const roll = Number.isFinite(options.roll) ? Math.min(0.999999, Math.max(0, Number(options.roll))) : deterministicRoll;
  const scholar = Object.values(UNIQUE_CHARACTERS).find((character) => (
    character.adventure?.passiveId === "epigraphic_insight" && hasActiveUniqueCompanion(next, character.id)
  ));
  const discoveryThreshold = scholar ? 0.45 : 0.3;
  record.explorationCount += 1;
  const resultId = `${context.region.id}:${record.explorationCount}`;
  let result;
  if (roll < discoveryThreshold && candidates.length) {
    const found = candidates[hashString(`${resultId}:location`) % candidates.length];
    record.discoveredLocationIds.push(found.id);
    result = {
      id: resultId,
      type: "location",
      title: "新たな場所を発見",
      message: scholar
        ? `${scholar.name}が碑文と地形を照合し、${found.name}を発見した。個人マップから移動できる。`
        : `${found.name}を発見した。個人マップから移動できる。`,
      locationId: found.id,
      locationName: found.name,
      symbol: found.symbol,
      assistedBy: scholar?.id ?? null,
      assistName: scholar?.adventure?.passiveName ?? null,
    };
  } else if (roll < 0.55) {
    result = {
      id: resultId,
      type: "nothing",
      title: "何も見つからなかった",
      message: `${current.name}の周辺を調べたが、目立ったものは見つからなかった。`,
      locationId: current.id,
      locationName: current.name,
    };
  } else if (roll < 0.78) {
    const { dungeon } = getRegionAdventureSites(next, context);
    const enemy = DUNGEON_ARCHETYPES[dungeon.dungeonType].enemy;
    result = {
      id: resultId,
      type: "monster",
      title: "モンスターとの戦闘",
      message: `${current.name}で${enemy.name}と遭遇した。戦闘準備へ移る。`,
      locationId: current.id,
      locationName: current.name,
      enemyId: enemy.id,
      enemyName: enemy.name,
      enemySymbol: enemy.symbol,
      outcome: "pending",
    };
    next.adventure.activeRun = personalEncounterRun(next, context, current, resultId);
  } else {
    const baseItem = PERSONAL_MAP_FORAGE[context.region.dominantTerrain] ?? PERSONAL_MAP_FORAGE.plains;
    const item = { ...baseItem, id: `${baseItem.id}:${context.region.id}` };
    addInventoryItem(next.adventure, item);
    addVillageInventoryItem(next, item);
    result = {
      id: resultId,
      type: "item",
      title: "アイテムを発見",
      message: `${current.name}で${item.name}を見つけ、所持品へ加えた。`,
      locationId: current.id,
      locationName: current.name,
      itemId: item.id,
      itemName: item.name,
      itemIcon: item.icon,
      quantity: 1,
    };
  }
  personalMapResult(record, result);
  storePersonalRegion(next, context.region.id, record);
  return next;
}

export function getGuildContracts(state, context) {
  const { dungeon, village } = getRegionAdventureSites(state, context);
  const archetype = DUNGEON_ARCHETYPES[dungeon.dungeonType];
  const terrain = context.region.dominantTerrain;
  const forageBase = PERSONAL_MAP_FORAGE[terrain] ?? PERSONAL_MAP_FORAGE.plains;
  const forageItem = { ...forageBase, id: `${forageBase.id}:${context.region.id}` };
  const issue = Math.max(0, Math.floor(state.player?.villageLife?.guildRequestsCompleted ?? 0));
  const definitions = [
    {
      suffix: "survey", title: `${dungeon.name}の踏査`,
      detail: `個人マップで${dungeon.name}を発見して移動し、最奥まで到達して危険経路を記録する。`,
      merit: 10, routeEvent: "chance_rescue", reward: { wealth: 3, renown: 2 },
      objective: { type: "clear_dungeon", targetId: dungeon.id, targetName: dungeon.name, required: 1, unit: "箇所" },
    },
    {
      suffix: "forage", title: `${forageItem.name}の採集`,
      detail: `${context.region.name}の周辺を実際に探索して${forageItem.name}を3個集め、集落の依頼窓口へ納品する。`,
      merit: 9, reward: { wealth: 4, renown: 1 },
      objective: { type: "collect_item", targetId: forageItem.id, targetName: forageItem.name, required: 3, unit: "個" },
    },
    {
      suffix: "subjugation", title: `${archetype.enemy.name}の討伐`,
      detail: `${dungeon.name}または周辺探索で${archetype.enemy.name}の一団と遭遇し、各人物・各敵を1ユニットとする戦闘で討伐対象を退ける。双方のユニット数はパーティー編成と遭遇内容によって変化する。討伐済みなら所持している戦利品が証明になる。`,
      merit: 12, reward: { wealth: 5, renown: 3 },
      objective: { type: "defeat_enemy", targetId: archetype.enemy.id, targetName: archetype.enemy.name, required: 1, unit: "体" },
    },
  ];
  const accepted = new Set(state.adventure?.activeContracts?.map((contract) => contract.id));
  const completed = new Set(state.adventure?.completedContracts?.map((contract) => contract.id));
  return definitions.map((definition) => {
    const id = `contract:${context.region.id}:${definition.suffix}:${issue}`;
    const status = state.player?.villageLife?.quests?.find((quest) => quest.id === id)?.status
      ?? (completed.has(id) ? "completed" : accepted.has(id) ? "active" : "available");
    const activeContract = state.adventure?.activeContracts?.find((contract) => contract.id === id);
    const completedContract = state.adventure?.completedContracts?.find((contract) => contract.id === id);
    const objective = activeContract?.objective ?? completedContract?.objective ?? definition.objective;
    const progress = ["completed", "reported"].includes(status)
      ? objective.required
      : objective.type === "collect_item"
        ? Math.min(objective.required, inventoryQuantity(state.player?.villageLife?.inventory, objective.targetId))
        : objective.type === "defeat_enemy"
          ? Math.min(objective.required, inventoryQuantity(state.player?.villageLife?.inventory, trophyIdForEnemy(objective.targetId)))
          : 0;
    return {
      ...definition,
      id,
      regionId: context.region.id,
      villageId: village.id,
      dungeonId: dungeon.id,
      status,
      objective: { ...objective, progress },
      readyToSubmit: status === "accepted" && objective.type === "collect_item" && progress >= objective.required,
    };
  });
}

export function acceptGuildContract(state, contractId, context) {
  const next = preparedClone(state);
  const contract = getGuildContracts(next, context).find((entry) => entry.id === contractId);
  if (!contract) throw new RangeError("その依頼は掲示されていません。");
  if (contract.status !== "available") throw new Error("その依頼はすでに受注済みです。");
  if (next.adventure.activeContracts.length >= 5) throw new Error("同時に受けられる依頼は5件までです。");
  const villageLife = next.player?.villageLife;
  if (villageLife?.quests?.some((quest) => quest.source === "guild" && ["accepted", "active", "completed", "reported"].includes(quest.status))) {
    throw new Error("先に受注中の依頼を集落の窓口へ報告し、報酬を受け取ってください。");
  }
  next.adventure.activeContracts.push({ ...contract, acceptedTurn: next.turn ?? 0, status: "active" });
  if (contract.dungeonId) revealRegionDungeonOnDraft(next, context);
  if (villageLife?.quests) {
    villageLife.guildRequestsAccepted = (villageLife.guildRequestsAccepted ?? 0) + 1;
    villageLife.quests.push({
      id: contract.id,
      name: contract.title,
      objective: contract.detail,
      objectiveData: { ...contract.objective, progress: 0 },
      source: "guild",
      status: "accepted",
      merit: contract.merit,
      reward: { ...contract.reward },
      routeEvent: contract.routeEvent ?? null,
      acceptedVillageId: contract.villageId,
      dungeonId: contract.dungeonId,
    });
  }
  const trophyId = contract.objective?.type === "defeat_enemy" ? trophyIdForEnemy(contract.objective.targetId) : null;
  if (trophyId && inventoryQuantity(next.player?.villageLife?.inventory, trophyId) >= contract.objective.required) {
    const active = next.adventure.activeContracts.find((entry) => entry.id === contract.id);
    markGuildContractCompleted(next, active ?? contract);
  }
  return next;
}

function markGuildContractCompleted(next, contract, run = null) {
  next.adventure.activeContracts = next.adventure.activeContracts.filter((entry) => entry.id !== contract.id);
  if (!next.adventure.completedContracts.some((entry) => entry.id === contract.id)) {
    next.adventure.completedContracts.unshift({ ...contract, status: "completed", completedTurn: next.turn ?? 0 });
  }
  const villageLife = next.player?.villageLife;
  const quest = villageLife?.quests?.find((entry) => entry.id === contract.id && ["accepted", "active"].includes(entry.status));
  if (quest) {
    quest.status = "completed";
    quest.completedVillageId = quest.acceptedVillageId;
    quest.objectiveData = { ...(quest.objectiveData ?? contract.objective), progress: contract.objective.required };
    if (run && quest.routeEvent === "chance_rescue" && (villageLife.heroicRescues ?? 0) < 1) {
      villageLife.heroicRescues = 1;
      runLog(run, "途中で救った遭難者は領主の使者だった。命の恩人として名を尋ねられた。", "success");
    }
  }
}

export function completeGuildContractObjective(state, contractId, context) {
  const next = preparedClone(state);
  const contract = next.adventure.activeContracts.find((entry) => entry.id === contractId);
  if (!contract) throw new RangeError("納品できる受注依頼がありません。");
  if (contract.villageId !== getRegionAdventureSites(next, context).village.id) throw new Error("受注した集落の依頼窓口で納品してください。");
  if (contract.objective?.type !== "collect_item") throw new Error("この依頼は現地で条件を達成する必要があります。");
  const held = inventoryQuantity(next.player?.villageLife?.inventory, contract.objective.targetId);
  if (held < contract.objective.required) {
    throw new Error(`${contract.objective.targetName}が不足しています（${held}/${contract.objective.required}）。`);
  }
  removeInventoryQuantity(next.player.villageLife.inventory, contract.objective.targetId, contract.objective.required);
  removeInventoryQuantity(next.adventure.inventory, contract.objective.targetId, contract.objective.required);
  markGuildContractCompleted(next, contract);
  return next;
}

function candidatePersonality(candidateId) {
  return NPC_PERSONALITIES[hashString(`${candidateId}:personality`) % NPC_PERSONALITIES.length];
}

function npcRelation(state, candidateId) {
  return state.adventure?.npcRelations?.[candidateId] ?? normalizeNpcRelation(candidateId, null);
}

function relationshipState(affinity) {
  if (affinity < 0) return { id: "wary", name: "警戒している" };
  if (affinity < 15) return { id: "acquainted", name: "面識がある" };
  if (affinity < 35) return { id: "warming", name: "打ち解けている" };
  if (affinity < 60) return { id: "trusted", name: "信頼している" };
  return { id: "close", name: "親しい" };
}

function candidateAbilityImpression(candidate) {
  if (candidate.roleId === "scout") return "身のこなしは軽く、周囲を見る目がある。";
  if (candidate.roleId === "mage") return "魔術の扱いについて何か知っているらしい。";
  if (candidate.roleId === "healer") return "傷や疲労の見分けに慣れているようだ。";
  if (candidate.roleId === "vanguard") return "武器を持つ姿に迷いがなく、戦い慣れているように見える。";
  const best = Object.entries(candidate.abilities ?? {}).sort((left, right) => right[1] - left[1])[0];
  return best?.[0] === "charisma" ? "人を動かす話し方に慣れている。" : "旅装の扱いから、実地経験があると分かる。";
}

function candidateHistory(candidate, personality) {
  const origins = ["街道警備の臨時隊", "地方領主の従士団", "交易隊の護衛", "辺境集落の自警団", "巡礼者の護送隊"];
  const goals = ["次の遠征に備えて経験を積むこと", "腕を認める雇い主を見つけること", "失った仲間の手掛かりを探すこと", "危険な土地の記録を残すこと", "自分の役割を生かせる隊を探すこと"];
  const value = hashString(`${candidate.id}:history`);
  return {
    origin: `${origins[value % origins.length]}で${candidate.role}を務めていた。`,
    goal: `今は${goals[(value >>> 4) % goals.length]}を目的にしている。`,
    value: `${personality.name}らしく、${personality.value}を重んじる。`,
  };
}

function recruitmentCondition(state, candidate, relation) {
  const policy = NPC_RECRUITMENT_POLICIES.find((entry) => entry.id === relation.recruitmentPolicyId) ?? candidateRecruitmentPolicy(candidate.id);
  const affinity = relation.affinity;
  if (policy.id === "friendship") {
    const requiredAffinity = 40;
    return { ...policy, met: affinity >= requiredAffinity, cost: 0, summary: "十分な信頼を築けば、友情を理由に同行する。", hint: affinity >= requiredAffinity ? "互いを信頼できると感じている。" : "会話や共に杯を交わすことで、もう少し信頼を築く必要がある。" };
  }
  if (policy.id === "mercenary") {
    const cost = 2 + hashString(`${candidate.id}:contract-cost`) % 4;
    const wealth = Math.max(0, Number(state.player?.metrics?.wealth) || 0);
    return { ...policy, met: wealth >= cost, cost, summary: `契約金として財産${cost}を求めている。`, hint: wealth >= cost ? `契約金${cost}を払えば同行する。` : `契約には財産${cost}が必要で、現在は${wealth}しかない。` };
  }
  if (policy.id === "evaluation") {
    const requiredScore = 5 + hashString(`${candidate.id}:evaluation-score`) % 6;
    const currentScore = Math.max(0, Number(state.player?.metrics?.renown) || 0, Number(state.player?.metrics?.martialMerit) || 0);
    const met = affinity >= 10 && currentScore >= requiredScore;
    return { ...policy, met, cost: 0, summary: `名声または武勲${requiredScore}以上と、最低限の信頼を求めている。`, hint: currentScore < requiredScore ? `まず仕事や戦いで実績を示す必要がある（現在の最高実績${currentScore}）。` : affinity < 10 ? "実績は認めているが、まだ人柄を見極めようとしている。" : "実績と人柄の双方を認めている。" };
  }
  const completedContracts = Math.max(0, Number(state.player?.progress?.contracts) || 0);
  const met = affinity >= 10 && completedContracts >= 1;
  return { ...policy, met, cost: 0, summary: "本人の目的に関わる依頼を一件以上成し遂げた人物を求めている。", hint: completedContracts < 1 ? "まず集落の依頼を最後まで成し遂げ、行動で協力できることを示す必要がある。" : affinity < 10 ? "目的は一致しそうだが、任せられる相手かもう少し確かめたいようだ。" : "目的に協力できる相手だと判断している。" };
}

function conversationActionsFor(state, candidate, relation) {
  if (!relation.firstMeetingComplete) return NPC_GREETING_APPROACHES.map((entry) => ({ ...entry, type: "greeting", allowed: true, cost: 0 }));
  const topicCount = (topicId) => relation.topics?.[topicId] ?? 0;
  const actions = NPC_CONVERSATION_ACTIONS.filter((action) => {
    if (action.id === "ask_history") return topicCount("ask_history") < 2;
    if (action.id === "ask_skills") return topicCount("ask_skills") < 4;
    if (action.id === "buy_drink") return topicCount("buy_drink") < 3;
    if (action.id === "discuss_work") return relation.interactions >= 2 || topicCount("ask_history") > 0;
    if (action.id === "invite") return relation.recruitmentConditionKnown;
    return true;
  });
  return actions.map((action) => {
    const wealth = Math.max(0, Number(state.player?.metrics?.wealth) || 0);
    const cost = action.id === "invite" && relation.recruitmentConditionKnown ? recruitmentCondition(state, candidate, relation).cost : action.cost ?? 0;
    const allowed = action.id !== "buy_drink" || wealth >= action.cost;
    return { ...action, cost, type: "conversation", allowed, reason: allowed ? null : `酒代として財産${action.cost}が必要です。` };
  });
}

function isDiningWithLocalRenown(state, context, villageId) {
  const lastAction = state.player?.villageLife?.lastAction;
  const localRenown = Math.max(0, Number(context.localRenown ?? state.player?.metrics?.renown) || 0);
  return lastAction?.actionId === "eat_meal" && lastAction.villageId === villageId && localRenown >= 10;
}

function socialCandidateView(state, candidate, personality) {
  const relation = npcRelation(state, candidate.id);
  const discovered = new Set(relation.discovered);
  const history = candidateHistory(candidate, personality);
  const recruitment = recruitmentCondition(state, candidate, relation);
  const knownHistory = [];
  if (discovered.has("history:origin")) knownHistory.push(history.origin);
  if (discovered.has("history:goal")) knownHistory.push(history.goal);
  const abilityInsights = [];
  if (discovered.has("ability:impression")) abilityInsights.push(candidateAbilityImpression(candidate));
  if (discovered.has("specialty")) abilityInsights.push(`得意分野：${candidate.specialty}`);
  if (discovered.has("level")) abilityInsights.push(`力量の目安：Lv.${candidate.level}`);
  return {
    interactions: relation.interactions,
    affinity: relation.affinity,
    relationship: relationshipState(relation.affinity),
    firstMeetingComplete: relation.firstMeetingComplete,
    firstImpressionBonus: relation.firstImpressionBonus,
    canInvite: relation.recruitmentConditionKnown,
    personality: discovered.has("personality") ? { id: personality.id, name: personality.name } : null,
    value: discovered.has("value") ? history.value : null,
    history: knownHistory,
    abilityInsights,
    specialtyKnown: discovered.has("specialty"),
    levelKnown: discovered.has("level"),
    knownAbilities: Object.fromEntries(Object.entries(candidate.abilities ?? {}).filter(([abilityId]) => discovered.has(`ability:${abilityId}`))),
    discoveryCount: discovered.size,
    recruitment: relation.recruitmentConditionKnown ? { id: recruitment.id, name: recruitment.name, summary: recruitment.summary, hint: recruitment.hint, cost: recruitment.cost, met: recruitment.met } : null,
    availableActions: conversationActionsFor(state, candidate, relation),
    recruitmentAttempts: relation.recruitmentAttempts,
    drinksBought: relation.drinksBought,
    joined: relation.joined || candidate.joined,
    lastResult: relation.lastResult,
  };
}

export function getTavernCandidates(state, context) {
  const { region } = context;
  const seed = `${state.generatedWorld?.seed ?? "world"}:${region.id}`;
  const villageId = context.villageId ?? getRegionAdventureSites(state, context).village.id;
  const diningInvitationIndex = isDiningWithLocalRenown(state, context, villageId)
    ? hashString(`${seed}:dining-invitation:${state.player.villageLife.lastAction.id}`) % 4
    : -1;
  const genericCandidates = Array.from({ length: 4 }, (_, index) => {
    const value = hashString(`${seed}:party:${index}`);
    const role = PARTY_ROLES[(value + index) % PARTY_ROLES.length];
    const name = PARTY_NAMES[(value >>> 3) % PARTY_NAMES.length];
    const id = `party:${region.id}:${index}`;
    const candidate = {
      id,
      name,
      portraitImage: PARTY_PORTRAITS[name],
      roleId: role.id,
      role: role.name,
      specialty: role.specialty,
      abilities: normalizeAbilityScores(null, { seed: id, role: `${role.name} ${role.specialty}` }),
      level: 1 + value % 4,
      incoming: index === diningInvitationIndex,
      unique: false,
      joined: (state.adventure?.party?.some((member) => member.id === id)
        || state.player?.villageLife?.party?.some((member) => member.id === id)) ?? false,
    };
    return { ...candidate, social: socialCandidateView(state, candidate, candidatePersonality(id)) };
  });
  const uniqueCandidates = Object.values(UNIQUE_CHARACTERS)
    .filter((character) => character.adventure?.memberId)
    .map((character) => ({
    id: character.adventure.memberId,
    characterId: character.id,
    uniqueCharacterId: character.id,
    unique: true,
    name: character.name,
    portraitImage: character.portraitImage,
    roleId: character.adventure.roleId,
    role: character.adventure.role,
    specialty: character.adventure.specialty,
    abilities: { ...character.abilities },
    level: character.adventure.level,
    incoming: false,
    passiveId: character.adventure.passiveId,
    passiveName: character.adventure.passiveName,
    passiveDescription: character.adventure.passiveDescription,
    recruitmentLine: character.adventure.recruitmentLine,
    playerReply: character.adventure.playerReply,
    transparent: character.adventure.transparent === true,
    joined: (state.adventure?.party?.some((member) => member.id === character.adventure.memberId)
      || state.player?.villageLife?.party?.some((member) => member.id === character.adventure.memberId)) ?? false,
    })).map((candidate) => ({ ...candidate, social: socialCandidateView(state, candidate, candidatePersonality(candidate.id)) }));
  return [...genericCandidates, ...uniqueCandidates];
}

function clampProbability(value) {
  return Math.min(0.95, Math.max(0.05, value));
}

function firstImpressionChance(charisma, personality, approachId) {
  const affinity = approachId === personality.favoredApproachId ? 0.28 : approachId === personality.dislikedApproachId ? -0.22 : 0;
  return clampProbability(0.32 + (Number(charisma) - 10) * 0.035 + affinity);
}

function insightChance(wisdom, interactions) {
  return clampProbability(0.26 + (Number(wisdom) - 10) * 0.04 + Math.min(0.28, interactions * 0.07));
}

function addDiscovery(relation, discoveryId) {
  if (!discoveryId || relation.discovered.includes(discoveryId)) return false;
  relation.discovered.push(discoveryId);
  return true;
}

function personalityConversationReaction(personality, actionId, repeated = false) {
  if (repeated) return personality.id === "taciturn" ? "同じ話には答えず、静かに杯へ視線を戻した。" : "その話はもうしたはずだ、と短く返した。";
  const reactions = {
    sociable: { small_talk: "身振りを交え、最近の旅と酒場の噂を楽しそうに語った。", ask_history: "昔の仲間の名まで挙げながら、歩んできた道を話した。", ask_skills: "得意な場面をいくつも例に挙げ、自分の腕を率直に説明した。", buy_drink: "杯を掲げ、次の話を自分から切り出した。", discuss_work: "互いの役割を確かめようと、前向きに条件を話した。" },
    taciturn: { small_talk: "短く相槌を打つだけだが、席を立つ様子はない。", ask_history: "必要な部分だけを選び、途切れ途切れに過去を話した。", ask_skills: "言葉より装備の手入れを見せ、できることだけを答えた。", buy_drink: "無言で杯を合わせ、わずかに表情を緩めた。", discuss_work: "曖昧な約束を避け、必要な条件だけを告げた。" },
    practical: { small_talk: "話を土地の相場と次の仕事へ手際よく結びつけた。", ask_history: "どこで何を任されていたか、実務に沿って説明した。", ask_skills: "できる仕事とできない仕事を明確に分けて答えた。", buy_drink: "礼を言い、酒代に見合うだけの情報を返した。", discuss_work: "危険、役割、報酬の順で条件を確認した。" },
    proud: { small_talk: "こちらの話を聞きながらも、腕を見せる機会をうかがっている。", ask_history: "誇るべき戦いや任務を選び、自信を隠さず語った。", ask_skills: "実力を疑うのかと笑い、得意な戦い方を語った。", buy_drink: "対等な相手からの一杯として受け取り、満足げに頷いた。", discuss_work: "同行に値する実績があるか、逆にこちらへ問い返した。" },
    cautious: { small_talk: "危険の少ない話題から、少しずつ言葉を返した。", ask_history: "話してよい範囲を見極めながら、過去を慎重に明かした。", ask_skills: "誇張を避け、確実にできることだけを答えた。", buy_drink: "杯の中身を確かめてから受け取り、警戒を少し解いた。", discuss_work: "退路と分配まで確認し、条件を慎重に示した。" },
  };
  return reactions[personality.id]?.[actionId] ?? "こちらの言葉を聞き、少し考えてから答えた。";
}

function addCandidateToParty(next, candidate, source) {
  const villageParty = next.player?.villageLife?.party;
  if (Math.max(next.adventure.party.length, villageParty?.length ?? 0) >= 3) throw new Error("パーティーはプレイヤーを含め4人までです。");
  if (candidate.joined) throw new Error("すでにパーティーへ参加しています。");
  next.adventure.party.push({ ...candidate, joinedTurn: next.turn ?? 0, source });
  if (Array.isArray(villageParty)) {
    villageParty.push({
      id: candidate.id,
      name: candidate.name,
      level: candidate.level,
      alive: true,
      active: true,
      role: candidate.role,
      roleId: candidate.roleId,
      specialty: candidate.specialty,
      abilities: { ...candidate.abilities },
      portraitImage: candidate.portraitImage ?? null,
      unique: candidate.unique,
      uniqueCharacterId: candidate.uniqueCharacterId ?? null,
      passiveId: candidate.passiveId ?? null,
      passiveName: candidate.passiveName ?? null,
      transparent: candidate.transparent === true,
      maxHp: 42 + Math.max(1, candidate.level ?? 1) * 6,
      hp: 42 + Math.max(1, candidate.level ?? 1) * 6,
      battleState: "READY",
    });
  }
  if (candidate.unique && next.player) {
    next.player.history ??= [];
    next.player.history.unshift({
      turn: next.turn ?? 0,
      year: next.year,
      month: next.month,
      title: `固有人物 ${candidate.name}が加入`,
      detail: `${candidate.role}として探索隊へ参加。固有能力「${candidate.passiveName}」が有効になった。`,
    });
    next.player.history = next.player.history.slice(0, 60);
  }
  const relation = next.adventure.npcRelations[candidate.id] ??= normalizeNpcRelation(candidate.id, null);
  relation.joined = true;
  return next;
}

function attemptRecruitmentOnDraft(next, candidate, relation) {
  relation.recruitmentAttempts += 1;
  const condition = recruitmentCondition(next, candidate, relation);
  if (!relation.firstMeetingComplete) {
    return { joined: false, affinityDelta: 0, reaction: "初対面の相手です。まず声をかけ、人柄を知る必要があります。", condition };
  }
  if (!relation.recruitmentConditionKnown) {
    relation.affinity = Math.max(-40, relation.affinity - 1);
    return { joined: false, affinityDelta: -1, reaction: "まず互いの仕事と目的を話してからだ、と勧誘を断った。", condition };
  }
  if (!condition.met) {
    const affinityDelta = relation.recruitmentAttempts > 1 ? -2 : -1;
    relation.affinity = Math.max(-40, relation.affinity + affinityDelta);
    const prefix = relation.recruitmentAttempts > 1 ? "同じ条件を繰り返すつもりはない、と念を押した。" : "今は同行できないと答えた。";
    return { joined: false, affinityDelta, reaction: `${prefix} ${condition.hint}`, condition };
  }
  if (condition.cost > 0) next.player.metrics.wealth -= condition.cost;
  addCandidateToParty(next, candidate, candidate.unique ? "unique-recruit" : "player-invite");
  return { joined: true, affinityDelta: 0, reaction: condition.cost > 0 ? `契約金${condition.cost}を受け取り、同行契約に署名した。` : "条件は満たされた、と頷き、旅支度を手に取った。", condition };
}

export function interactWithNpcCandidate(state, candidateId, actionId, context, options = {}) {
  const next = preparedClone(state);
  const candidate = getTavernCandidates(next, context).find((entry) => entry.id === candidateId);
  if (!candidate || candidate.joined) throw new RangeError("その人物とは今ここで会話できません。");
  const personality = candidatePersonality(candidate.id);
  const relation = next.adventure.npcRelations[candidate.id] ??= normalizeNpcRelation(candidate.id, null);
  const greeting = NPC_GREETING_APPROACHES.find((entry) => entry.id === actionId);
  const normalAction = NPC_CONVERSATION_ACTIONS.find((entry) => entry.id === actionId);
  if (!relation.firstMeetingComplete) {
    if (!greeting) throw new Error("初対面では、まず声のかけ方を選んでください。");
    const charisma = next.player?.abilities?.charisma ?? 10;
    const impressionChance = firstImpressionChance(charisma, personality, actionId);
    const roll = Number.isFinite(options.firstImpressionRoll) ? options.firstImpressionRoll : Number.isFinite(options.roll) ? options.roll : Math.random();
    const success = roll < impressionChance;
    const affinityDelta = actionId === personality.favoredApproachId ? 10 + (success ? 6 : 0)
      : actionId === personality.dislikedApproachId ? -8 + (success ? 4 : 0)
        : 4 + (success ? 4 : 0);
    relation.interactions += 1;
    relation.affinity = Math.max(-40, Math.min(100, relation.affinity + affinityDelta));
    relation.firstMeetingComplete = true;
    relation.firstApproachId = actionId;
    relation.firstImpressionBonus = success;
    relation.topics.greeting = 1;
    addDiscovery(relation, "personality");
    relation.lastResult = { actionId, firstMeeting: true, success, gainedFirstImpressionBonus: success, impressionChance, affinityDelta, discovered: "personality", discoveryLabel: `人柄「${personality.name}」`, reaction: personality.reactions[actionId], venue: options.venue === "guild" ? "guild" : "tavern" };
    return next;
  }
  if (greeting) throw new Error("初対面の挨拶はすでに終わっています。");
  if (!normalAction) throw new RangeError("選べない会話行動です。");
  const availability = conversationActionsFor(next, candidate, relation).find((entry) => entry.id === actionId);
  if (!availability) throw new Error("今はその話題を選ぶ意味がありません。");
  if (!availability.allowed) throw new Error(availability.reason);

  const previousCount = relation.topics[actionId] ?? 0;
  relation.topics[actionId] = previousCount + 1;
  relation.interactions += 1;
  let affinityDelta = 0;
  let discoveryId = null;
  let discoveryLabel = null;
  let reaction = personalityConversationReaction(personality, actionId, previousCount >= 2);
  let joined = false;

  if (actionId === "small_talk") {
    const chance = clampProbability(0.46 + ((next.player?.abilities?.charisma ?? 10) - 10) * 0.03 + personality.smallTalkBonus * 0.06);
    const roll = Number.isFinite(options.roll) ? options.roll : Math.random();
    affinityDelta = previousCount === 0 ? (roll < chance ? 4 + personality.smallTalkBonus : 1) : previousCount === 1 ? 1 : -1;
    if (previousCount === 0) { discoveryId = "value"; discoveryLabel = `価値観「${personality.value}」`; }
  } else if (actionId === "ask_history") {
    const requiredAffinity = personality.id === "taciturn" ? (previousCount === 0 ? 10 : 25) : previousCount === 0 ? 0 : 12;
    if (relation.affinity >= requiredAffinity) {
      discoveryId = previousCount === 0 ? "history:origin" : "history:goal";
      discoveryLabel = previousCount === 0 ? candidateHistory(candidate, personality).origin : candidateHistory(candidate, personality).goal;
      affinityDelta = 1;
    } else {
      reaction = personality.id === "taciturn" ? "まだ話すほどの間柄ではない、と短く答えた。" : "過去を話すには、まだ少し早いようだ。";
      affinityDelta = previousCount > 0 ? -1 : 0;
    }
  } else if (actionId === "ask_skills") {
    const wisdom = next.player?.abilities?.wisdom ?? 10;
    const roll = Number.isFinite(options.insightRoll) ? options.insightRoll : Number.isFinite(options.roll) ? options.roll : Math.random();
    const canRead = roll < insightChance(wisdom, relation.interactions) || personality.id === "proud";
    if (previousCount === 0) { discoveryId = "ability:impression"; discoveryLabel = candidateAbilityImpression(candidate); }
    else if (previousCount === 1 && canRead) { discoveryId = "specialty"; discoveryLabel = `得意分野「${candidate.specialty}」`; }
    else if (previousCount === 2 && canRead && relation.affinity >= 15) { discoveryId = "level"; discoveryLabel = `力量の目安 Lv.${candidate.level}`; }
    else if (previousCount === 3 && canRead && relation.affinity >= 30) {
      const best = Object.entries(candidate.abilities ?? {}).sort((left, right) => right[1] - left[1])[0];
      discoveryId = best ? `ability:${best[0]}` : null;
      discoveryLabel = best ? `特に優れた能力：${ABILITY_LABELS[best[0]]} ${best[1]}` : null;
    }
    affinityDelta = previousCount < 2 ? 1 : 0;
  } else if (actionId === "buy_drink") {
    next.player.metrics.wealth -= normalAction.cost;
    relation.drinksBought += 1;
    affinityDelta = previousCount < 2 ? 3 + personality.drinkBonus : -1;
    if (previousCount === 0 && !relation.discovered.includes("value")) { discoveryId = "value"; discoveryLabel = `価値観「${personality.value}」`; }
  } else if (actionId === "discuss_work") {
    relation.recruitmentConditionKnown = true;
    discoveryId = "recruitment";
    const condition = recruitmentCondition(next, candidate, relation);
    discoveryLabel = `${condition.name}：${condition.summary}`;
    affinityDelta = previousCount === 0 ? (personality.id === "practical" || personality.id === "proud" ? 2 : 1) : previousCount === 1 ? 0 : -1;
    if (previousCount >= 1) reaction = previousCount === 1 ? "条件は先ほど伝えた通りだ、と要点だけを確認した。" : personalityConversationReaction(personality, actionId, true);
  } else if (actionId === "invite") {
    const outcome = attemptRecruitmentOnDraft(next, candidate, relation);
    affinityDelta = outcome.affinityDelta;
    reaction = outcome.reaction;
    joined = outcome.joined;
    discoveryLabel = outcome.condition.hint;
  }
  if (actionId !== "invite") relation.affinity = Math.max(-40, Math.min(100, relation.affinity + affinityDelta));
  const discovered = addDiscovery(relation, discoveryId);
  relation.lastResult = { actionId, firstMeeting: false, affinityDelta, discovered: discovered ? discoveryId : null, discoveryLabel: discovered || actionId === "invite" ? discoveryLabel : null, reaction, joined, venue: options.venue === "guild" ? "guild" : "tavern" };
  return next;
}

function recruitCandidate(state, candidateId, context, expectedIncoming) {
  const next = preparedClone(state);
  const candidate = getTavernCandidates(next, context).find((entry) => entry.id === candidateId);
  if (!candidate || candidate.incoming !== expectedIncoming) throw new RangeError("その冒険者は今、酒場にいません。");
  if (expectedIncoming) return addCandidateToParty(next, candidate, "invitation");
  const relation = next.adventure.npcRelations[candidate.id] ??= normalizeNpcRelation(candidate.id, null);
  const outcome = attemptRecruitmentOnDraft(next, candidate, relation);
  relation.lastResult = { actionId: "invite", firstMeeting: false, affinityDelta: outcome.affinityDelta, discovered: null, discoveryLabel: outcome.condition.hint, reaction: outcome.reaction, joined: outcome.joined, venue: "tavern" };
  if (!outcome.joined) throw new Error(outcome.reaction);
  return next;
}

export function acceptPartyInvitation(state, candidateId, context) {
  return recruitCandidate(state, candidateId, context, true);
}

export function inviteTavernCandidate(state, candidateId, context) {
  return recruitCandidate(state, candidateId, context, false);
}

function runLog(run, message, tone = "neutral") {
  run.log.unshift({ id: `${run.id}:${run.logSerial++}`, message, tone });
  run.log = run.log.slice(0, 12);
}

function grantBattleTrophy(state, run) {
  const archetype = DUNGEON_ARCHETYPES[run.dungeonType];
  grantLoot(state, run, archetype.loot[2]);
}

const DUNGEON_BATTLE_PROFILES = Object.freeze({
  cave: Object.freeze({
    baseTerrain: "hill",
    enemyUnits: Object.freeze([
      Object.freeze({ suffix: "maw", name: "岩喰らい群", classId: "heavy_infantry", count: 56, y: 4 }),
      Object.freeze({ suffix: "shell", name: "晶殻幼体群", classId: "spearman", count: 44, y: 2 }),
      Object.freeze({ suffix: "guard", name: "洞守獣群", classId: "infantry", count: 48, y: 7 }),
    ]),
  }),
  forest: Object.freeze({
    baseTerrain: "forest",
    enemyUnits: Object.freeze([
      Object.freeze({ suffix: "stalker", name: "ゴブリン槍兵群", classId: "infantry", count: 52, y: 4 }),
      Object.freeze({ suffix: "spore", name: "ゴブリン弓兵群", classId: "archer", count: 38, y: 2 }),
      Object.freeze({ suffix: "runner", name: "ゴブリン狼騎兵群", classId: "light_cavalry", count: 42, y: 7 }),
    ]),
  }),
  spring: Object.freeze({
    baseTerrain: "swamp",
    enemyUnits: Object.freeze([
      Object.freeze({ suffix: "mimic", name: "蒼水擬態体群", classId: "heavy_infantry", count: 58, y: 4 }),
      Object.freeze({ suffix: "caster", name: "霊泉術体群", classId: "mage", count: 36, y: 2 }),
      Object.freeze({ suffix: "guard", name: "白珠守群", classId: "spearman", count: 45, y: 7 }),
    ]),
  }),
});

function prepareDungeonBattleTerrain(map, dungeonType) {
  const middleY = Math.floor(map.height / 2);
  for (let x = 0; x < map.width; x += 1) {
    setBattleTerrain(map, { x, y: middleY }, "road");
    setBattleTerrain(map, { x, y: middleY - 1 }, "road");
  }
  if (dungeonType === "cave") {
    for (let x = 0; x < map.width; x += 1) {
      setBattleTerrain(map, { x, y: 0 }, "mountain");
      setBattleTerrain(map, { x, y: map.height - 1 }, "mountain");
    }
    [[6, 2], [7, 2], [6, 7], [7, 7], [11, 1], [2, 8]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, "mountain"));
  } else if (dungeonType === "forest") {
    [[5, 1], [6, 1], [7, 1], [6, 7], [7, 7], [8, 7]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, "hill"));
  } else {
    for (let y = 0; y < map.height; y += 1) setBattleTerrain(map, { x: 7, y }, "river");
    setBattleTileFeature(map, { x: 7, y: middleY }, "bridge");
    setBattleTileFeature(map, { x: 7, y: middleY - 1 }, "ford");
    [[3, 2], [4, 7], [10, 2], [11, 7]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, "hill"));
  }
  return map;
}

export function getDungeonTacticalRoster(state) {
  const player = state.player;
  const metrics = player?.metrics ?? {};
  const playerEntry = {
    id: player?.id ?? "player",
    name: player?.name ?? "主人公",
    portrait: (player?.name ?? "主").slice(0, 1),
    role: player?.title ?? "冒険者",
    rank: player?.stage === "individual" ? "探索隊長" : player?.title ?? "探索隊長",
    policy: player?.specialty ?? "現場指揮",
    traits: [player?.origin ?? "冒険者", player?.specialty ?? "現場指揮"],
    stats: {
      leadership: Math.min(88, 58 + Math.round((metrics.renown ?? 0) / 3)),
      war: Math.min(92, 62 + Math.round((metrics.martialMerit ?? 0) / 5)),
      intelligence: Math.min(88, 54 + Math.round((metrics.civilMerit ?? 0) / 6)),
      charisma: Math.min(90, 56 + Math.round((metrics.renown ?? 0) / 2)),
    },
    stamina: Math.max(20, 100 - (player?.villageLife?.fatigue ?? 0)),
    assignment: null,
    available: (player?.villageLife?.hp ?? 1) > 0,
    level: 1,
    uniqueCharacterId: null,
  };
  const roleBonuses = {
    前衛: { leadership: 6, war: 15, intelligence: 0, charisma: 2 },
    斥候: { leadership: 3, war: 8, intelligence: 12, charisma: 2 },
    治療師: { leadership: 5, war: 1, intelligence: 16, charisma: 8 },
    術師: { leadership: 2, war: 5, intelligence: 18, charisma: 4 },
    学者: { leadership: 2, war: 0, intelligence: 20, charisma: 5 },
  };
  const companions = (player?.villageLife?.party ?? [])
    .filter((member) => member.active !== false && member.alive !== false)
    .map((member) => {
      const level = Math.max(1, member.level ?? 1);
      const uniqueCharacter = member.uniqueCharacterId ? getUniqueCharacter(member.uniqueCharacterId) : null;
      const bonus = roleBonuses[member.role] ?? { leadership: 3, war: 6, intelligence: 6, charisma: 3 };
      const base = 43 + level * 4;
      return {
        id: member.id,
        name: member.name,
        portrait: member.name.slice(0, 1),
        portraitImage: member.portraitImage ?? uniqueCharacter?.portraitImage ?? null,
        role: member.role ?? "冒険者",
        rank: uniqueCharacter ? `固有人物 · Lv.${level}` : `Lv.${level}`,
        policy: uniqueCharacter?.policy ?? `${member.role ?? "冒険者"}として探索隊を支援`,
        traits: uniqueCharacter?.traits ?? [member.role ?? "冒険者"],
        stats: uniqueCharacter ? { ...uniqueCharacter.stats } : {
          leadership: Math.min(86, base + bonus.leadership),
          war: Math.min(90, base + bonus.war),
          intelligence: Math.min(92, base + bonus.intelligence),
          charisma: Math.min(88, base + bonus.charisma),
        },
        stamina: 100,
        assignment: null,
        available: true,
        level,
        uniqueCharacterId: member.uniqueCharacterId ?? null,
        passiveId: member.passiveId ?? uniqueCharacter?.adventure?.passiveId ?? null,
      };
    });
  return [playerEntry, ...companions];
}

export function createDungeonTacticalBattle(state) {
  const run = state.adventure?.activeRun;
  if (!run || run.phase !== "battle" || !run.combat) throw new Error("戦術戦闘を開始できる遭遇がありません。");
  const profile = DUNGEON_BATTLE_PROFILES[run.dungeonType];
  if (!profile) throw new RangeError("ダンジョン戦場の種類が不明です。");
  const map = prepareDungeonBattleTerrain(createBattleMap({ width: 14, height: 10, terrainType: profile.baseTerrain }), run.dungeonType);
  const playerCommanderId = `cmd:${run.id}:player`;
  const enemyCommanderId = `cmd:${run.id}:enemy`;
  if (run.mode === "personal-map" || run.combatScale === "personal-units") {
    const roster = getDungeonTacticalRoster(state);
    const enemyUnitCount = Math.min(profile.enemyUnits.length, Math.max(1, roster.length + hashString(`${run.id}:enemy-count`) % 2));
    const unitClassForRole = (role = "") => (
      /治療|僧侶|神官/.test(role) ? "mage"
        : /術|魔/.test(role) ? "mage"
        : /弓|斥候|射/.test(role) ? "archer"
          : /騎/.test(role) ? "light_cavalry"
            : /槍/.test(role) ? "spearman"
              : "infantry"
    );
    const playerPositions = [{ x: 4, y: 5 }, { x: 3, y: 3 }, { x: 3, y: 7 }, { x: 5, y: 2 }, { x: 5, y: 8 }];
    const enemyPositions = [{ x: 10, y: 5 }, { x: 11, y: 3 }, { x: 11, y: 7 }];
    const commanders = [
      createCommander({ id: playerCommanderId, name: state.player?.name ?? "探索隊長", side: "player", position: { x: 2, y: 5 }, leadership: 62, tactics: 62, bravery: 72, commandRange: 12, traits: ["探索パーティー"] }),
      createCommander({ id: enemyCommanderId, name: run.combat.enemyName, side: "enemy", position: { x: 12, y: 5 }, leadership: 58, tactics: 54, bravery: 76, commandRange: 12, traits: ["遭遇集団"] }),
    ];
    const playerUnits = roster.map((participant, index) => {
      const maxHp = index === 0 ? run.playerMaxHp : 42 + Math.max(1, participant.level ?? 1) * 6;
      const astralCalibration = participant.passiveId === "astral_calibration";
      const healingRole = /治療|僧侶|神官/.test(participant.role ?? "");
      return createCombatUnit({
        id: `unit:${run.id}:player:${participant.id}`,
        name: participant.name,
        iconUrl: participant.portraitImage ?? null,
        side: "player",
        unitClassId: unitClassForRole(participant.role),
        commanderId: playerCommanderId,
        soldierCount: 1,
        maxSoldierCount: 1,
        hp: index === 0 ? run.playerHp : maxHp,
        maxHp,
        position: playerPositions[index] ?? { x: 2 + index % 4, y: 1 + index % 8 },
        order: UNIT_ORDERS.ATTACK,
        activeSkill: astralCalibration ? "lightning" : healingRole ? "heal" : undefined,
        tags: ["PERSONAL_COMBATANT", index === 0 ? "PLAYER_CHARACTER" : "PARTY_MEMBER", ...(index === 0 ? [] : [`PARTY_ID:${participant.id}`]), ...(healingRole ? ["HEALER"] : []), ...(astralCalibration ? ["ASTRAL_CALIBRATION"] : [])],
        statusEffects: astralCalibration ? [{
          id: "astral_calibration",
          name: "星環定礎",
          duration: null,
          modifiers: { magicPower: 1.22 },
          sourceCharacterId: participant.uniqueCharacterId,
        }] : [],
      });
    });
    const enemyUnits = profile.enemyUnits.slice(0, enemyUnitCount).map((definition, index) => {
      const maxHp = Math.max(20, run.combat.enemyMaxHp + index * 4);
      return createCombatUnit({
        id: `unit:${run.id}:enemy:${index}`,
        name: definition.name.replace(/群$/, ""),
        side: "enemy",
        raceId: run.dungeonType === "forest" ? "elf" : run.dungeonType === "cave" ? "dwarf" : "human",
        unitClassId: definition.classId,
        commanderId: enemyCommanderId,
        soldierCount: 1,
        maxSoldierCount: 1,
        hp: maxHp,
        maxHp,
        position: enemyPositions[index],
        facing: FACING.WEST,
        order: UNIT_ORDERS.ATTACK,
        tags: ["PERSONAL_COMBATANT", "ENCOUNTER_ENEMY"],
      });
    });
    const battle = createBattleState({
      id: run.combat.tacticalBattleId,
      name: `${run.locationName ?? run.dungeonName}・個人ユニット戦`,
      map,
      units: [...playerUnits, ...enemyUnits],
      commanders,
      supplyNodes: [],
      seed: hashString(run.id),
    });
    battle.combatScale = "personal-units";
    battle.sideLabels = { player: "探索パーティー", enemy: `${run.combat.enemyName}側` };
    battle.log = [{ turn: 0, phase: "command", message: `自軍${playerUnits.length}ユニットと敵軍${enemyUnits.length}ユニットが接触。各人物・敵を1ユニットとして戦闘を開始する。` }];
    return battle;
  }
  const starRingMage = Object.values(UNIQUE_CHARACTERS).find((character) => (
    character.adventure?.passiveId === "astral_calibration" && hasActiveUniqueCompanion(state, character.id)
  ));
  const commanders = [
    createCommander({ id: playerCommanderId, name: state.player?.name ?? "探索隊長", side: "player", position: { x: 2, y: 5 }, leadership: 62, tactics: 62, bravery: 68, traits: ["探索隊"] }),
    createCommander({ id: enemyCommanderId, name: run.combat.enemyName, side: "enemy", position: { x: 12, y: 5 }, leadership: 60, tactics: 58, bravery: 78, commandRange: 8, traits: [DUNGEON_ARCHETYPES[run.dungeonType].name, "ダンジョンの主"] }),
  ];
  const playerUnits = [
    createCombatUnit({ id: `unit:${run.id}:vanguard`, name: "探索隊前衛班", side: "player", unitClassId: "infantry", commanderId: playerCommanderId, soldierCount: 54, position: { x: 4, y: 4 }, order: UNIT_ORDERS.ADVANCE }),
    createCombatUnit({ id: `unit:${run.id}:ranged`, name: "探索隊射撃班", side: "player", unitClassId: "archer", commanderId: playerCommanderId, soldierCount: 42, position: { x: 3, y: 2 }, order: UNIT_ORDERS.ATTACK }),
    createCombatUnit({
      id: `unit:${run.id}:support`,
      name: starRingMage ? `${starRingMage.name}の星環術班` : "探索隊支援班",
      iconUrl: starRingMage?.portraitImage ?? null,
      side: "player",
      unitClassId: "mage",
      commanderId: playerCommanderId,
      soldierCount: starRingMage ? 44 : 38,
      experience: starRingMage ? 62 : 35,
      position: { x: 3, y: 7 },
      order: UNIT_ORDERS.ATTACK,
      activeSkill: starRingMage ? "lightning" : "fire",
      tags: starRingMage ? ["UNIQUE_SUPPORT", "ASTRAL_CALIBRATION"] : [],
      statusEffects: starRingMage ? [{
        id: "astral_calibration",
        name: starRingMage.adventure.passiveName,
        duration: 99,
        modifiers: { magicPower: 1.22 },
        sourceCharacterId: starRingMage.id,
      }] : [],
    }),
  ];
  const enemyUnits = profile.enemyUnits.map((definition, index) => createCombatUnit({
    id: `unit:${run.id}:enemy:${definition.suffix}`,
    name: definition.name,
    side: "enemy",
    raceId: run.dungeonType === "forest" ? "elf" : run.dungeonType === "cave" ? "dwarf" : "human",
    unitClassId: definition.classId,
    commanderId: enemyCommanderId,
    soldierCount: definition.count,
    position: { x: index === 0 ? 10 : 11, y: definition.y },
    facing: FACING.WEST,
    order: UNIT_ORDERS.ATTACK,
    tags: run.dungeonType === "cave" ? ["SUBTERRANEAN"] : run.dungeonType === "spring" ? ["AQUATIC"] : [],
  }));
  return createBattleState({
    id: run.combat.tacticalBattleId,
    name: `${run.dungeonName}・${run.combat.enemyName}遭遇戦`,
    map,
    units: [...playerUnits, ...enemyUnits],
    commanders,
    supplyNodes: [
      { id: `supply:${run.id}:player`, name: "探索隊補給地点", side: "player", position: { x: 0, y: 5 }, range: 7, replenish: 9, throughput: 34, maxStockpile: 360, stockpile: 360 },
      { id: `supply:${run.id}:enemy`, name: `${run.combat.enemyName}の魔力源`, side: "enemy", position: { x: 13, y: 5 }, range: 7, replenish: 8, throughput: 32, maxStockpile: 320, stockpile: 320 },
    ],
    seed: hashString(run.id),
  });
}

export function startDungeonRun(state, dungeon, region) {
  const next = preparedClone(state);
  const archetype = DUNGEON_ARCHETYPES[dungeon.dungeonType];
  if (!archetype) throw new RangeError("不明なダンジョン種別です。");
  const partySize = activePartyCount(next);
  const matchingContract = next.adventure.activeContracts.some((contract) => contract.dungeonId === dungeon.id);
  if (matchingContract && partySize < 1) throw new Error("受注依頼へ出発する前に、村の酒場で仲間を集めてください。");
  const villageLife = next.player?.villageLife;
  if ((villageLife?.hp ?? 0) < 35) throw new Error("HPが35未満です。村の神殿・治療所で負傷を治してから出発してください。");
  const playerMaxHp = villageLife?.maxHp ?? 42 + partySize * 8;
  const playerHp = villageLife?.hp ?? playerMaxHp;
  next.adventure.activeRun = {
    id: `run:${dungeon.id}:${(next.turn ?? 0)}:${next.adventure.dungeonHistory.length}`,
    dungeonId: dungeon.id,
    dungeonName: dungeon.name,
    dungeonType: dungeon.dungeonType,
    combatScale: "personal-units",
    regionId: region.id,
    phase: "exploring",
    step: 0,
    totalSteps: 3,
    playerHp,
    playerMaxHp,
    skippedBattles: 0,
    completedContractIds: [],
    loot: [],
    combat: null,
    logSerial: 1,
    log: [{ id: "entry", message: `${dungeon.name}へ入った。探索隊は自動で奥へ進む。`, tone: "info" }],
  };
  return next;
}

function finishRun(next, run) {
  run.phase = "complete";
  const cleared = new Set(next.adventure.completedDungeonIds);
  cleared.add(run.dungeonId);
  next.adventure.completedDungeonIds = [...cleared];
  const completed = next.adventure.activeContracts.filter((contract) => (
    contract.objective?.type === "clear_dungeon" && contract.objective.targetId === run.dungeonId
  ));
  completed.forEach((contract) => {
    markGuildContractCompleted(next, contract, run);
    run.completedContractIds ??= [];
    if (!run.completedContractIds.includes(contract.id)) run.completedContractIds.push(contract.id);
  });
  const villageLife = next.player?.villageLife;
  if (villageLife) {
    villageLife.fatigue = Math.min(100, (villageLife.fatigue ?? 0) + 12);
    villageLife.supplies.food = Math.max(0, (villageLife.supplies?.food ?? 0) - 1);
    villageLife.supplies.torches = Math.max(0, (villageLife.supplies?.torches ?? 0) - 1);
    villageLife.hp = run.playerHp;
  }
  next.adventure.completedContracts = next.adventure.completedContracts.slice(0, 80);
  next.adventure.dungeonHistory.unshift({
    dungeonId: run.dungeonId,
    dungeonName: run.dungeonName,
    turn: next.turn ?? 0,
    skippedBattles: run.skippedBattles,
    loot: run.loot.map((item) => ({ ...item })),
    completedContracts: [...new Set(run.completedContractIds ?? [])],
  });
  next.adventure.dungeonHistory = next.adventure.dungeonHistory.slice(0, 40);
  runLog(run, (run.completedContractIds?.length ?? 0) > 0 ? `探索完了。依頼${run.completedContractIds.length}件も達成した。` : "最奥へ到達し、探索を完了した。", "success");
}

function completeCombatObjectives(next, run) {
  const completed = next.adventure.activeContracts.filter((contract) => (
    contract.objective?.type === "defeat_enemy"
    && contract.objective.targetId === run.combat?.enemyId
    && (!contract.regionId || contract.regionId === run.regionId)
    && (!contract.dungeonId || !run.dungeonId || contract.dungeonId === run.dungeonId)
  ));
  completed.forEach((contract) => {
    markGuildContractCompleted(next, contract, run);
    run.completedContractIds ??= [];
    if (!run.completedContractIds.includes(contract.id)) run.completedContractIds.push(contract.id);
  });
}

export function advanceDungeonRun(state) {
  const next = preparedClone(state);
  const run = next.adventure.activeRun;
  if (!run || run.phase !== "exploring") throw new Error("自動探索中ではありません。");
  const archetype = DUNGEON_ARCHETYPES[run.dungeonType];
  if (run.step === 0) {
    const item = archetype.loot[0];
    const recovered = grantLoot(next, run, item, { oncePerSite: true });
    run.step = 1;
    const appraisalNote = recovered.provenanceAppraiserId ? ` ノエラの「来歴封緘」で同系資料を${recovered.quantity}点確保した。` : "";
    runLog(run, recovered.alreadyRecovered
      ? `${item.name}の採取場所は以前に回収済みだった。新たな戦利品はない。`
      : `${item.name}を発見。戦利品へ自動収納した。${appraisalNote}`, recovered.alreadyRecovered ? "info" : "loot");
  } else if (run.step === 1) {
    const enemy = archetype.enemy;
    run.step = 2;
    run.phase = "battle";
    run.combat = {
      enemyId: enemy.id,
      enemyName: enemy.name,
      enemySymbol: enemy.symbol,
      enemyHp: enemy.maxHp,
      enemyMaxHp: enemy.maxHp,
      enemyAttack: enemy.attack,
      turn: 1,
      outcome: null,
      tacticalBattleId: `dungeon-battle:${run.id}`,
    };
    runLog(run, `${enemy.name}が道を塞いだ。戦闘システムを起動する。`, "danger");
  } else {
    const item = archetype.loot[1];
    const recovered = grantLoot(next, run, item, { oncePerSite: true });
    run.step = 3;
    const appraisalNote = recovered.provenanceAppraiserId ? ` ノエラの「来歴封緘」で同系資料を${recovered.quantity}点確保した。` : "";
    runLog(run, recovered.alreadyRecovered
      ? `${item.name}の保管場所は以前に回収済みだった。帰還経路だけを確保した。`
      : `${item.name}を回収し、帰還経路を確保した。${appraisalNote}`, recovered.alreadyRecovered ? "info" : "loot");
    finishRun(next, run);
  }
  return next;
}

export function resolveDungeonTacticalBattle(state, battleResult) {
  const next = preparedClone(state);
  const run = next.adventure.activeRun;
  if (!run || run.phase !== "battle" || !run.combat) throw new Error("戦闘中ではありません。");
  if (!battleResult?.winner || battleResult.battleId !== run.combat.tacticalBattleId) throw new Error("探索中の戦闘結果ではありません。");
  const casualtyRate = (battleResult.player?.casualties ?? 0) / Math.max(1, battleResult.player?.initialSoldiers ?? 1);
  const personalUnitBattle = run.mode === "personal-map" || run.combatScale === "personal-units";
  const protagonistResult = personalUnitBattle
    ? battleResult.player?.members?.find((member) => member.tags?.includes("PLAYER_CHARACTER"))
    : null;
  const hpLoss = personalUnitBattle && protagonistResult
    ? Math.max(0, protagonistResult.maxHp - protagonistResult.remainingHp)
    : battleResult.winner === "player" ? Math.min(28, Math.round(casualtyRate * 34)) : Math.max(1, run.playerHp - 1);
  run.playerHp = personalUnitBattle && protagonistResult
    ? Math.max(0, Math.min(run.playerMaxHp, protagonistResult.remainingHp))
    : Math.max(battleResult.winner === "player" ? 1 : 0, run.playerHp - hpLoss);
  run.combat.turn = battleResult.turn ?? run.combat.turn;
  run.combat.tacticalResult = {
    winner: battleResult.winner,
    turn: battleResult.turn ?? null,
    autoResolved: Boolean(battleResult.autoResolved),
    playerCasualties: battleResult.player?.casualties ?? 0,
    enemyCasualties: battleResult.enemy?.casualties ?? 0,
    members: (battleResult.player?.members ?? []).map((member) => ({ ...member, tags: [...(member.tags ?? [])] })),
  };
  if (personalUnitBattle && next.player?.villageLife) {
    const life = next.player.villageLife;
    if (run.playerHp < run.playerMaxHp && !life.injuries.some((entry) => String(entry).startsWith("戦闘負傷"))) {
      life.injuries.push(`戦闘負傷（${run.playerHp <= 0 ? "瀕死" : run.playerHp < 35 ? "重傷" : "軽傷"}）`);
    }
    (battleResult.player?.members ?? []).filter((member) => member.tags?.includes("PARTY_MEMBER")).forEach((memberResult) => {
      const partyId = memberResult.tags.find((tag) => tag.startsWith("PARTY_ID:"))?.slice("PARTY_ID:".length);
      const companion = life.party.find((member) => member.id === partyId) ?? life.party.find((member) => member.name === memberResult.name);
      if (!companion) return;
      companion.maxHp = memberResult.maxHp;
      companion.hp = memberResult.remainingHp;
      companion.battleState = memberResult.state;
      companion.lastBattleOutcome = battleResult.winner;
      companion.alive = memberResult.state !== "DESTROYED" && memberResult.remainingHp > 0;
      if (!companion.alive) companion.active = false;
    });
  }
  if (battleResult.autoResolved) run.skippedBattles = (run.skippedBattles ?? 0) + 1;
  if (battleResult.winner === "player") {
    run.combat.outcome = "victory";
    grantBattleTrophy(next, run);
    completeCombatObjectives(next, run);
    run.phase = run.mode === "personal-map" ? "complete" : "exploring";
    runLog(run, run.mode === "personal-map"
      ? `${run.combat.enemyName}を退けた。周辺の安全を確保し、個人マップへ戻れる。`
      : `既存の戦術戦闘で${run.combat.enemyName}を退けた。戦利品を自動回収し、探索を再開する。`, "success");
  } else {
    run.combat.outcome = battleResult.winner === "draw" ? "draw" : "defeat";
    run.phase = "failed";
    runLog(run, battleResult.winner === "draw" ? "双方が戦闘継続能力を失い、探索隊は撤退した。入口までの帰還路と収納袋を確保していたため、獲得済みの戦利品は持ち帰れる。" : "戦術戦闘に敗れ、探索隊は撤退した。入口までの帰還路と収納袋を確保していたため、獲得済みの戦利品は失わない。", "danger");
  }
  if (run.mode === "personal-map") {
    const region = next.adventure.personalMap.regions[run.regionId];
    if (region?.lastResult?.id === run.personalMapResultId) {
      region.lastResult = {
        ...region.lastResult,
        outcome: battleResult.winner === "player" ? "victory" : run.combat.outcome,
        message: battleResult.winner === "player"
          ? `${run.combat.enemyName}に勝利した。戦利品を回収した。`
          : `${run.combat.enemyName}との戦闘から撤退した。`,
      };
      region.history = [region.lastResult, ...region.history.filter((entry) => entry.id !== region.lastResult.id)].slice(0, 12);
    }
  }
  if (next.player?.villageLife) next.player.villageLife.hp = run.playerHp;
  return next;
}

export function skipDungeonBattle(state) {
  const next = preparedClone(state);
  const run = next.adventure.activeRun;
  if (!run || run.phase !== "battle" || !run.combat) throw new Error("スキップできる戦闘がありません。");
  run.combat.outcome = "skipped";
  run.skippedBattles += 1;
  grantBattleTrophy(next, run);
  completeCombatObjectives(next, run);
  run.phase = run.mode === "personal-map" ? "complete" : "exploring";
  runLog(run, run.mode === "personal-map"
    ? `${run.combat.enemyName}との戦闘を自動解決した。戦利品を回収し、個人マップへ戻れる。`
    : `${run.combat.enemyName}との戦闘を自動解決した。戦利品を回収し、探索を再開する。`, "success");
  if (run.mode === "personal-map") {
    const region = next.adventure.personalMap.regions[run.regionId];
    if (region?.lastResult?.id === run.personalMapResultId) {
      region.lastResult = {
        ...region.lastResult,
        outcome: "skipped",
        message: `${run.combat.enemyName}との戦闘を自動解決し、戦利品を回収した。`,
      };
      region.history = [region.lastResult, ...region.history.filter((entry) => entry.id !== region.lastResult.id)].slice(0, 12);
    }
  }
  return next;
}

export function withdrawDungeonBattle(state) {
  const next = preparedClone(state);
  const run = next.adventure.activeRun;
  if (!run || run.phase !== "battle" || !run.combat) throw new Error("撤退できる戦闘遭遇がありません。");
  run.combat.outcome = "withdrawn";
  run.phase = "failed";
  runLog(run, `${run.combat.enemyName}の編成を確認し、交戦前に入口へ撤退した。獲得済みの戦利品は収納袋へ封じて持ち帰る。`, "info");
  return next;
}

export function closeDungeonRun(state) {
  const next = preparedClone(state);
  if (next.adventure.activeRun && !["complete", "failed"].includes(next.adventure.activeRun.phase)) {
    throw new Error("探索中は帰還できません。戦闘を終えてください。");
  }
  next.adventure.activeRun = null;
  return next;
}

export function getDungeonBattlePreview(state) {
  const run = state.adventure?.activeRun;
  if (!run || run.phase !== "battle") return null;
  const battle = createDungeonTacticalBattle(state);
  const describe = (side) => battle.units.filter((unit) => unit.side === side).map((unit) => ({
    id: unit.id,
    name: unit.name,
    role: unit.tags?.includes("HEALER") ? "治療支援" : PERSONAL_BATTLE_ROLE_LABELS[unit.unitClassId] ?? unit.unitClassId,
    hp: unit.hp,
    maxHp: unit.maxHp,
  }));
  const playerUnits = describe("player");
  const enemyUnits = describe("enemy");
  const power = (units) => units.reduce((sum, unit) => {
    const source = battle.units.find((entry) => entry.id === unit.id);
    return sum + unit.hp * (source.attack + source.defense + source.rangedAttack * 0.6);
  }, 0);
  const ownPower = power(playerUnits);
  const enemyPower = power(enemyUnits);
  const baseWinRate = Math.round(ownPower / Math.max(1, ownPower + enemyPower) * 100);
  let forecast = { winner: null, turn: null };
  try { forecast = autoResolveBattle(battle); } catch { /* 膠着時も準備画面は表示する */ }
  const expectedWinRate = Math.max(5, Math.min(95, baseWinRate + (forecast.winner === "player" ? 22 : forecast.winner === "enemy" ? -25 : 0)));
  const danger = expectedWinRate >= 65 ? { id: "favorable", label: "優勢" }
    : expectedWinRate >= 48 ? { id: "even", label: "互角" }
      : expectedWinRate >= 32 ? { id: "dangerous", label: "危険" } : { id: "severe", label: "極めて危険" };
  return {
    playerUnits,
    enemyUnits,
    expectedWinRate,
    forecastWinner: forecast.winner,
    forecastTurns: forecast.turn,
    danger,
    informationKnown: state.player?.villageLife?.discoveredDungeons?.includes(run.dungeonName) ?? false,
    canRetreat: true,
  };
}

export function returnToVillageForRecovery(state, context) {
  const next = preparedClone(state);
  const run = next.adventure.activeRun;
  if (run && run.phase !== "failed") throw new Error("撤退が確定してから治療所へ帰還してください。");
  next.adventure.activeRun = null;
  const { definitions, byId, record } = personalRegionSnapshot(next, context);
  const village = definitions.find((location) => location.type === "village");
  const start = byId.get(record.currentLocationId);
  if (!village || !start) throw new Error("帰還できる村を特定できません。");
  const distances = new Map([[start.id, 0]]);
  const pending = [{ id: start.id, minutes: 0 }];
  while (pending.length) {
    pending.sort((left, right) => left.minutes - right.minutes);
    const current = pending.shift();
    if (current.id === village.id) break;
    const location = byId.get(current.id);
    location.neighborIds.forEach((neighborId) => {
      const neighbor = byId.get(neighborId);
      if (!neighbor || !record.discoveredLocationIds.includes(neighborId)) return;
      const minutes = current.minutes + Math.min(6 * 60, Math.max(90, Math.ceil(Math.hypot(neighbor.x - location.x, neighbor.y - location.y) / 10) * 30));
      if (minutes >= (distances.get(neighborId) ?? Infinity)) return;
      distances.set(neighborId, minutes);
      pending.push({ id: neighborId, minutes });
    });
  }
  const travelMinutes = distances.get(village.id);
  if (!Number.isFinite(travelMinutes)) throw new Error("発見済みの道だけでは村へ帰還できません。");
  record.currentLocationId = village.id;
  const result = {
    id: `recovery:${context.region.id}:${record.explorationCount}`,
    type: "move",
    title: "治療所へ帰還",
    message: `${village.name}へ帰還した。神殿・治療所で負傷者を診てもらえる。`,
    locationId: village.id,
    locationName: village.name,
    travelMinutes,
  };
  personalMapResult(record, result);
  storePersonalRegion(next, context.region.id, record);
  return advanceGeneratedWorldTime(next, travelMinutes);
}
