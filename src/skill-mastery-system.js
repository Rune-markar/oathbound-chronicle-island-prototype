const clone = (value) => structuredClone(value);

const req = (type, key, target, label) => Object.freeze({ type, key, target, label });
const all = (...requirements) => Object.freeze({ mode: "all", requirements: Object.freeze(requirements) });
const any = (...requirements) => Object.freeze({ mode: "any", requirements: Object.freeze(requirements) });

function spell(id, name, school, tacticalSkillId, description, unlock, hint) {
  return Object.freeze({ id, name, kind: "magic", school, tacticalSkillId, description, unlock, hint });
}

function talent(id, name, school, description, unlock, hint, modifiers) {
  return Object.freeze({ id, name, kind: "talent", school, description, unlock, hint, modifiers: Object.freeze(modifiers), unlock });
}

export const MASTERY_CATALOG = Object.freeze({
  kindled_spark: spell("kindled_spark", "熾火の一矢", "火・始原", "arcane_bolt", "低負荷の火弾。単体へ確実な魔術打撃を与える。", all(req("counter", "journeys", 0, "旅立つ")), "最初から使える基礎術。"),
  pyre_circuit: spell("pyre_circuit", "炎環陣", "火", "fire", "着弾点の周囲を焼き、3ターン燃える危険地帯を残す。", all(req("counter", "magic_casts", 3, "魔法を3回使う"), req("counter", "cave_explorations", 1, "洞窟を探索する")), "基礎術を実戦で試し、洞窟の熱脈を観察する。"),
  frost_script: spell("frost_script", "氷縛印", "水・氷", "ice", "範囲内の敵の移動を2ターン大きく落とす。", all(req("counter", "damage_taken", 18, "累計18以上の被害を受ける"), req("counter", "spring_explorations", 1, "霊泉を探索する")), "傷を負った状態で霊泉の冷気を読み解く。"),
  gale_cant: spell("gale_cant", "乱気流詠", "風", "wind", "広範囲の敵射撃を乱し、命中精度を下げる。", all(req("counter", "journeys", 5, "5回移動する"), req("counter", "retreats", 1, "危険な遭遇から1回撤退する")), "風向きを読み、退路を選ぶ経験が必要。"),
  stone_covenant: spell("stone_covenant", "土壁契", "地", "earth", "一時的な土壁を築き、防御と進路を変える。", all(req("counter", "dungeon_clears", 1, "ダンジョンを1回踏破する"), req("counter", "damage_taken", 30, "累計30以上の被害を受ける")), "攻撃に耐えながら地形を味方につける。"),
  storm_call: spell("storm_call", "雷霆招来", "雷", "lightning", "重装へ特に強い高威力の単体雷撃。", all(req("counter", "magic_casts", 8, "魔法を8回使う"), req("counter", "recruits", 1, "仲間を1人迎える"), req("ability", "intelligence", 13, "知力13")), "仲間に詠唱を支えてもらい、高位式を完成させる。"),
  mender_hand: spell("mender_hand", "癒し手", "生命", "heal", "範囲内の味方の負傷を回復する。", all(req("counter", "healing_actions", 2, "神殿・治療所を2回利用する"), req("ability", "wisdom", 11, "判断力11")), "治療を受けるだけでなく、手順を二度観察する。"),
  sunward: spell("sunward", "陽光の護り", "光", "radiant_ward", "味方範囲へ防御上昇の護りを与える。", all(req("counter", "contracts", 2, "依頼を2件達成する"), req("counter", "battle_wins", 2, "戦闘に2勝する")), "人を守る仕事と勝利の双方を積む。"),
  war_chorus: spell("war_chorus", "戦歌共鳴", "音・精神", "battle_hymn", "味方範囲の士気を立て直す。", all(req("counter", "conversations", 6, "人物と6回交流する"), req("counter", "battle_wins", 3, "戦闘に3勝する"), req("ability", "charisma", 11, "魅力11")), "言葉で心を動かし、実戦で声を届かせる。"),
  shade_mantle: spell("shade_mantle", "影衣", "影", "shadow_veil", "味方範囲を影で包み、防御と回避射撃を支える。", any(all(req("counter", "stealth_successes", 1, "窃盗か密行を1回成功させる"), req("counter", "explorations", 4, "4回探索する")), all(req("counter", "retreats", 2, "2回生還撤退する"), req("counter", "journeys", 8, "8回移動する"))), "犯罪者の技から学ぶか、撤退と旅の経験から独自に会得する。"),
  armor_hex: spell("armor_hex", "鎧砕呪", "呪", "sunder", "重装の守りを見抜く強力な単体術。", all(req("counter", "battle_wins", 4, "戦闘に4勝する"), req("counter", "loot_items", 8, "戦利品を8点得る"), req("ability", "intelligence", 12, "知力12")), "敵装備と戦利品を比較して構造上の弱点を知る。"),
  life_tide: spell("life_tide", "生命潮", "生命・高位", "life_surge", "広い範囲の味方を大きく回復する高位術。", all(req("skill", "mender_hand", 1, "「癒し手」を習得"), req("counter", "magic_casts", 12, "魔法を12回使う"), req("counter", "low_hp_wins", 1, "瀕死状態で1勝する")), "死線で命をつなぎ、基礎治癒を高位式へ昇華する。"),

  roadwise: talent("roadwise", "旅慣れ", "探索", "移動力+8%。危険地帯から位置を変えやすい。", all(req("counter", "journeys", 0, "旅立つ")), "最初から有効にできる基礎技能。", { movement: 1.08 }),
  vanguard: talent("vanguard", "先陣の呼吸", "戦技", "攻撃力+9%。", all(req("counter", "battle_wins", 1, "初勝利を得る"), req("ability", "strength", 11, "筋力11")), "自ら前線に立って勝つ。", { attack: 1.09 }),
  bulwark: talent("bulwark", "不動の構え", "戦技", "防御力+12%、疲労消費-6%。", all(req("counter", "damage_taken", 35, "累計35以上の被害を受ける"), req("ability", "constitution", 11, "耐久力11")), "傷を受け、崩れない姿勢を覚える。", { defense: 1.12, fatigueCost: 0.94 }),
  eagle_eye: talent("eagle_eye", "鷹の目", "射撃", "遠隔射程+10%、射撃精度+12%。", all(req("counter", "explorations", 5, "5回探索する"), req("ability", "dexterity", 12, "敏捷力12")), "遠景の異変を探し続ける。", { range: 1.1, rangedAccuracy: 1.12 }),
  mana_flow: talent("mana_flow", "魔力循環", "魔術", "魔力+12%、魔法疲労-18%。", all(req("counter", "magic_casts", 6, "魔法を6回使う"), req("ability", "intelligence", 12, "知力12")), "詠唱回数を重ね、消耗の偏りを修正する。", { magicPower: 1.12, magicFatigue: 0.82 }),
  monster_lore: talent("monster_lore", "魔物解剖学", "探索", "攻撃と魔力+7%。", all(req("counter", "battle_wins", 3, "戦闘に3勝する"), req("counter", "enemy_kinds", 2, "異なる敵種に2種勝つ")), "異なる魔物の戦い方を比較する。", { attack: 1.07, magicPower: 1.07 }),
  last_stand: talent("last_stand", "背水", "生存", "防御+15%、攻撃+6%。", all(req("counter", "low_hp_wins", 1, "HP35%以下で勝利する")), "安全な勝利では取得できない死線の技。", { defense: 1.15, attack: 1.06 }),
  field_medic: talent("field_medic", "野戦治療", "生命", "治癒を含む魔力+15%。", all(req("counter", "healing_actions", 3, "治療を3回行う"), req("counter", "recruits", 1, "仲間を1人迎える")), "仲間を連れて治療の現場を経験する。", { magicPower: 1.15 }),
  pack_bond: talent("pack_bond", "連携の間合い", "仲間", "攻撃・防御+6%。", all(req("counter", "recruits", 2, "仲間を2人迎える"), req("counter", "conversations", 8, "人物と8回交流する")), "人数だけでなく、会話を重ねた一団を作る。", { attack: 1.06, defense: 1.06 }),
  shadow_step: talent("shadow_step", "影渡り", "隠密", "移動+12%、防御+5%。", any(req("counter", "stealth_successes", 2, "窃盗か密行を2回成功させる"), all(req("counter", "retreats", 2, "2回撤退する"), req("ability", "dexterity", 13, "敏捷力13"))), "危険な裏道を使うか、俊敏さで退路を磨く。", { movement: 1.12, defense: 1.05 }),
  oathkeeper: talent("oathkeeper", "誓約遂行", "信義", "攻撃・防御+5%、魔力+5%。", all(req("counter", "contracts", 4, "依頼を4件達成する"), req("counter", "battle_wins", 2, "戦闘に2勝する")), "受けた仕事を最後まで果たし続ける。", { attack: 1.05, defense: 1.05, magicPower: 1.05 }),
  battle_scholar: talent("battle_scholar", "戦場学", "学術", "攻撃・防御・魔力+6%。", all(req("counter", "loot_items", 10, "戦利品を10点得る"), req("counter", "magic_casts", 8, "魔法を8回使う"), req("ability", "intelligence", 14, "知力14")), "実物資料と戦場で仮説を検証する。", { attack: 1.06, defense: 1.06, magicPower: 1.06 }),
  quartermaster: talent("quartermaster", "携行配分", "兵站", "行動疲労-14%、防御+4%。", all(req("counter", "journeys", 10, "10回移動する"), req("counter", "dungeon_clears", 2, "ダンジョンを2回踏破する")), "長旅と複数回の遠征から、荷の削り方を覚える。", { fatigueCost: 0.86, defense: 1.04 }),
});

export const MASTERY_LOADOUT_LIMITS = Object.freeze({ magic: 4, talent: 3 });
const DEFAULT_MASTERY = Object.freeze({ schemaVersion: 1, counters: {}, enemyKinds: [], unlockedIds: [], equippedMagicIds: [], equippedTalentIds: [], recentUnlockIds: [], history: [] });

function requirementValue(state, requirement) {
  const mastery = state.player?.mastery ?? DEFAULT_MASTERY;
  if (requirement.type === "counter") return Number(mastery.counters?.[requirement.key] ?? 0);
  if (requirement.type === "ability") return Number(state.player?.abilities?.[requirement.key] ?? 0);
  if (requirement.type === "metric") return Number(state.player?.metrics?.[requirement.key] ?? 0);
  if (requirement.type === "skill") return mastery.unlockedIds?.includes(requirement.key) ? 1 : 0;
  return 0;
}

function evaluateNode(state, node) {
  if (node.requirements) {
    const results = node.requirements.map((entry) => evaluateNode(state, entry));
    return { met: node.mode === "any" ? results.some((entry) => entry.met) : results.every((entry) => entry.met), mode: node.mode, children: results };
  }
  const current = requirementValue(state, node);
  return { ...node, current, met: current >= node.target };
}

function unlockSatisfied(state) {
  const mastery = state.player.mastery;
  const unlocked = new Set(mastery.unlockedIds);
  const gained = [];
  let changed = true;
  while (changed) {
    changed = false;
    Object.values(MASTERY_CATALOG).forEach((entry) => {
      if (unlocked.has(entry.id) || !evaluateNode(state, entry.unlock).met) return;
      unlocked.add(entry.id);
      gained.push(entry.id);
      changed = true;
    });
    mastery.unlockedIds = [...unlocked];
  }
  if (gained.length) {
    mastery.recentUnlockIds = [...gained, ...mastery.recentUnlockIds.filter((id) => !gained.includes(id))].slice(0, 8);
    gained.forEach((id) => mastery.history.unshift({ id, turn: state.turn ?? 0, year: state.year, month: state.month }));
    mastery.history = mastery.history.slice(0, 40);
  }
  return gained;
}

export function normalizeMasteryState(state) {
  if (!state?.player) return state;
  const current = state.player.mastery ?? {};
  state.player.mastery = {
    ...clone(DEFAULT_MASTERY), ...current,
    schemaVersion: 1,
    counters: { ...(current.counters ?? {}) },
    enemyKinds: [...new Set(current.enemyKinds ?? [])],
    unlockedIds: [...new Set((current.unlockedIds ?? []).filter((id) => MASTERY_CATALOG[id]))],
    equippedMagicIds: [...new Set((current.equippedMagicIds ?? []).filter((id) => MASTERY_CATALOG[id]?.kind === "magic"))].slice(0, MASTERY_LOADOUT_LIMITS.magic),
    equippedTalentIds: [...new Set((current.equippedTalentIds ?? []).filter((id) => MASTERY_CATALOG[id]?.kind === "talent"))].slice(0, MASTERY_LOADOUT_LIMITS.talent),
    recentUnlockIds: [...new Set((current.recentUnlockIds ?? []).filter((id) => MASTERY_CATALOG[id]))].slice(0, 8),
    history: [...(current.history ?? [])].slice(0, 40),
  };
  unlockSatisfied(state);
  const mastery = state.player.mastery;
  if (!mastery.equippedMagicIds.length && mastery.unlockedIds.includes("kindled_spark")) mastery.equippedMagicIds.push("kindled_spark");
  if (!mastery.equippedTalentIds.length && mastery.unlockedIds.includes("roadwise")) mastery.equippedTalentIds.push("roadwise");
  mastery.equippedMagicIds = mastery.equippedMagicIds.filter((id) => mastery.unlockedIds.includes(id));
  mastery.equippedTalentIds = mastery.equippedTalentIds.filter((id) => mastery.unlockedIds.includes(id));
  return state;
}

export function recordMasteryEvent(state, eventType, amount = 1, detail = null) {
  normalizeMasteryState(state);
  const mastery = state.player.mastery;
  const safeAmount = Math.max(0, Number(amount) || 0);
  mastery.counters[eventType] = Math.max(0, Number(mastery.counters[eventType] ?? 0) + safeAmount);
  if (eventType === "battle_win" || eventType === "battle_wins") mastery.counters.battle_wins = Math.max(mastery.counters.battle_wins ?? 0, mastery.counters[eventType]);
  if (eventType === "magic_cast" || eventType === "magic_casts") mastery.counters.magic_casts = Math.max(mastery.counters.magic_casts ?? 0, mastery.counters[eventType]);
  if (eventType === "enemy_kind" && detail) {
    mastery.enemyKinds = [...new Set([...mastery.enemyKinds, String(detail)])];
    mastery.counters.enemy_kinds = mastery.enemyKinds.length;
  }
  return unlockSatisfied(state);
}

function derivedCounters(state) {
  const adventure = state.adventure ?? {};
  const regions = Object.values(adventure.personalMap?.regions ?? {});
  const actions = state.player?.villageLife?.actionHistory ?? [];
  const relations = Object.values(adventure.npcRelations ?? {});
  const inventories = adventure.inventory ?? [];
  const crimeIncidents = state.player?.crime?.incidents ?? [];
  return {
    journeys: regions.reduce((sum, region) => sum + (region.history ?? []).filter((entry) => entry.type === "move").length, 0),
    explorations: regions.reduce((sum, region) => sum + Number(region.explorationCount ?? 0), 0),
    cave_explorations: (adventure.dungeonHistory ?? []).filter((entry) => /洞窟|洞穴|坑道/.test(entry.dungeonName ?? "")).length,
    spring_explorations: (adventure.dungeonHistory ?? []).filter((entry) => /泉|水|湖/.test(entry.dungeonName ?? "")).length,
    dungeon_clears: (adventure.dungeonHistory ?? []).length,
    loot_items: inventories.reduce((sum, item) => sum + Number(item.quantity ?? 1), 0),
    contracts: Math.max(Number(state.player?.progress?.contracts ?? 0), (adventure.completedContracts ?? []).length),
    recruits: (state.player?.villageLife?.party ?? []).filter((member) => member.alive !== false).length,
    conversations: relations.reduce((sum, relation) => sum + Number(relation.interactions ?? 0), 0),
    healing_actions: actions.filter((entry) => /heal|treat|recovery|temple/.test(`${entry.actionId ?? ""}:${entry.facilityId ?? ""}`)).length,
    stealth_successes: crimeIncidents.filter((entry) => ["theft", "smuggling"].includes(entry.type) && String(entry.outcome).startsWith("success")).length,
    governance_actions: Number(state.player?.progress?.governanceActions ?? 0),
  };
}

export function observeMasteryProgress(state) {
  if (!state?.player) return state;
  normalizeMasteryState(state);
  const mastery = state.player.mastery;
  Object.entries(derivedCounters(state)).forEach(([key, value]) => {
    mastery.counters[key] = Math.max(Number(mastery.counters[key] ?? 0), Number(value) || 0);
  });
  unlockSatisfied(state);
  return state;
}

export function toggleMasteryLoadout(state, masteryId) {
  const next = clone(state);
  normalizeMasteryState(next);
  const entry = MASTERY_CATALOG[masteryId];
  if (!entry) throw new RangeError("不明な魔法・技能です。");
  if (!next.player.mastery.unlockedIds.includes(masteryId)) throw new Error("取得条件をまだ満たしていません。");
  const key = entry.kind === "magic" ? "equippedMagicIds" : "equippedTalentIds";
  const limit = MASTERY_LOADOUT_LIMITS[entry.kind];
  const equipped = next.player.mastery[key];
  if (equipped.includes(masteryId)) next.player.mastery[key] = equipped.filter((id) => id !== masteryId);
  else {
    if (equipped.length >= limit) throw new Error(`${entry.kind === "magic" ? "魔法" : "技能"}の装備枠は${limit}つです。先に一つ外してください。`);
    equipped.push(masteryId);
  }
  return next;
}

export function getMasteryView(state) {
  normalizeMasteryState(state);
  const mastery = state.player.mastery;
  return Object.values(MASTERY_CATALOG).map((entry) => ({
    ...entry,
    unlocked: mastery.unlockedIds.includes(entry.id),
    equipped: (entry.kind === "magic" ? mastery.equippedMagicIds : mastery.equippedTalentIds).includes(entry.id),
    condition: evaluateNode(state, entry.unlock),
  }));
}

export function getEquippedTacticalMagic(state) {
  normalizeMasteryState(state);
  return state.player.mastery.equippedMagicIds.map((id) => MASTERY_CATALOG[id]).filter(Boolean);
}

export function getEquippedTalentEffects(state) {
  normalizeMasteryState(state);
  return state.player.mastery.equippedTalentIds.map((id) => MASTERY_CATALOG[id]).filter(Boolean);
}
