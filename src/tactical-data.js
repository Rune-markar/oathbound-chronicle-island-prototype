import { getTacticalRaceDefinition } from "./race-list.js";

export const UNIT_CLASS_IDS = Object.freeze({
  INFANTRY: "infantry",
  SPEARMAN: "spearman",
  HEAVY_INFANTRY: "heavy_infantry",
  CAVALRY: "cavalry",
  LIGHT_CAVALRY: "light_cavalry",
  ARCHER: "archer",
  MAGE: "mage",
  ENGINEER: "engineer",
});

export const RACE_TAGS = Object.freeze([
  "LARGE", "FLYING", "UNDEAD", "AQUATIC", "SUBTERRANEAN", "ETHEREAL", "CONSTRUCT",
]);

export const FACING = Object.freeze({ NORTH: "north", EAST: "east", SOUTH: "south", WEST: "west" });

export const UNIT_ORDERS = Object.freeze({
  HOLD: "hold",
  ADVANCE: "advance",
  ATTACK: "attack",
  DEFEND: "defend",
  RETREAT: "retreat",
  PURSUE: "pursue",
});

export const BATTLE_PHASES = Object.freeze([
  "command", "movement", "charge_reaction", "ranged", "magic",
  "melee", "morale", "rout", "pursuit", "fatigue_status",
]);

export const UNIT_CLASSES = Object.freeze({
  infantry: Object.freeze({
    id: "infantry", name: "歩兵", symbol: "歩", role: "戦線維持・拘束・占領",
    stats: { hp: 100, movement: 4, attack: 58, defense: 56, rangedAttack: 0, range: 1, accuracy: 0, durabilityPerSoldier: 1.2, chargePower: 0, fatigueCost: 1 },
    initial: { morale: 72, cohesion: 82 }, abilities: ["engage"], tags: ["INFANTRY"],
  }),
  spearman: Object.freeze({
    id: "spearman", name: "槍兵", symbol: "槍", role: "騎兵・大型迎撃",
    stats: { hp: 100, movement: 3, attack: 52, defense: 62, rangedAttack: 0, range: 1, accuracy: 0, durabilityPerSoldier: 1.25, chargePower: 0, bracePower: 1.75, fatigueCost: 1 },
    initial: { morale: 74, cohesion: 86 }, abilities: ["brace", "engage"], tags: ["INFANTRY", "SPEAR"],
  }),
  heavy_infantry: Object.freeze({
    id: "heavy_infantry", name: "重装歩兵", symbol: "重", role: "防壁・正面突破",
    stats: { hp: 120, movement: 3, attack: 66, defense: 78, rangedAttack: 0, range: 1, accuracy: 0, durabilityPerSoldier: 1.7, chargePower: 0, pushPower: 0.42, fatigueCost: 1.45 },
    initial: { morale: 84, cohesion: 90 }, abilities: ["push", "engage"], tags: ["INFANTRY", "HEAVY_ARMOR"],
  }),
  cavalry: Object.freeze({
    id: "cavalry", name: "騎兵", symbol: "騎", role: "突撃・側面突破",
    stats: { hp: 105, movement: 8, attack: 70, defense: 48, rangedAttack: 0, range: 1, accuracy: 0, durabilityPerSoldier: 1.45, chargePower: 3.2, fatigueCost: 1.2 },
    initial: { morale: 78, cohesion: 72 }, abilities: ["charge", "pursuit"], tags: ["CAVALRY"],
  }),
  light_cavalry: Object.freeze({
    id: "light_cavalry", name: "軽騎兵", symbol: "軽", role: "偵察・襲撃・追撃",
    stats: { hp: 90, movement: 10, attack: 54, defense: 34, rangedAttack: 18, range: 3, accuracy: 0.48, durabilityPerSoldier: 1.05, chargePower: 1.8, pursuitPower: 2.2, fatigueCost: 0.85 },
    initial: { morale: 70, cohesion: 68 }, abilities: ["charge", "pursuit", "scout"], tags: ["CAVALRY", "LIGHT"],
  }),
  archer: Object.freeze({
    id: "archer", name: "弓兵", symbol: "弓", role: "遠距離支援・士気攻撃",
    stats: { hp: 85, movement: 4, attack: 28, defense: 30, rangedAttack: 64, range: 7, accuracy: 0.66, durabilityPerSoldier: 1, chargePower: 0, fatigueCost: 0.9 },
    initial: { morale: 68, cohesion: 74 }, abilities: ["ranged"], tags: ["RANGED"],
  }),
  mage: Object.freeze({
    id: "mage", name: "魔術兵", symbol: "魔", role: "戦場・地形・状態干渉",
    stats: { hp: 78, movement: 4, attack: 24, defense: 28, rangedAttack: 0, range: 6, accuracy: 0.8, durabilityPerSoldier: 0.9, chargePower: 0, fatigueCost: 1.05, magicPower: 62 },
    initial: { morale: 72, cohesion: 70 }, abilities: ["magic"], tags: ["MAGIC"],
  }),
  engineer: Object.freeze({
    id: "engineer", name: "工兵", symbol: "工", role: "陣地構築・地形操作",
    stats: { hp: 90, movement: 3, attack: 38, defense: 44, rangedAttack: 0, range: 1, accuracy: 0, durabilityPerSoldier: 1.1, chargePower: 0, fatigueCost: 1.1, engineering: 64 },
    initial: { morale: 70, cohesion: 78 }, abilities: ["engineering"], tags: ["INFANTRY", "ENGINEER"],
  }),
});

// 戦闘用の種族補正も正本の完全な特性レコードから派生させる。
// ここへ名称や補正だけの種族定義を追加してはならない。
export const RACES = Object.freeze(Object.fromEntries(
  ["human", "elf", "dwarf", "orc", "giant"]
    .map((raceId) => [raceId, getTacticalRaceDefinition(raceId)]),
));

export const EQUIPMENT = Object.freeze({
  infantry_kit: Object.freeze({ id: "infantry_kit", name: "剣盾装備", modifiers: { attack: 1.04, defense: 1.06 } }),
  pike_kit: Object.freeze({ id: "pike_kit", name: "長槍装備", modifiers: { attack: 1.02, brace: 1.2, defense: 1.04 } }),
  heavy_plate: Object.freeze({ id: "heavy_plate", name: "重装板金鎧", modifiers: { defense: 1.18, movement: 0.86, fatigueCost: 1.2, lightningTaken: 1.3 } }),
  cavalry_kit: Object.freeze({ id: "cavalry_kit", name: "騎槍・軍馬", modifiers: { attack: 1.06, charge: 1.2, movement: 1.05 } }),
  light_horse_kit: Object.freeze({ id: "light_horse_kit", name: "軽装軍馬", modifiers: { movement: 1.12, pursuit: 1.2, defense: 0.94 } }),
  longbow_kit: Object.freeze({ id: "longbow_kit", name: "長弓", modifiers: { rangedAttack: 1.12, rangedAccuracy: 1.08, range: 1.12 } }),
  arcane_focus: Object.freeze({ id: "arcane_focus", name: "魔導触媒", modifiers: { magicPower: 1.14 } }),
  engineering_kit: Object.freeze({ id: "engineering_kit", name: "築城工具", modifiers: { engineering: 1.2 } }),
});

export const TERRAIN_TYPES = Object.freeze({
  plain: Object.freeze({ id: "plain", name: "平原", symbol: "·", passable: true, movementCost: 1, defenseBonus: 0, visibilityModifier: 1, classModifiers: {} }),
  forest: Object.freeze({ id: "forest", name: "森林", symbol: "♠", passable: true, movementCost: 2, defenseBonus: 0.16, visibilityModifier: 0.72, classModifiers: { CAVALRY: { movement: 0.68, charge: 0.45 }, INFANTRY: { defense: 1.12 }, RANGED: { rangedAccuracy: 0.82 } } }),
  hill: Object.freeze({ id: "hill", name: "丘陵", symbol: "⌁", passable: true, movementCost: 1.6, defenseBonus: 0.12, visibilityModifier: 1.08, classModifiers: { RANGED: { range: 1.12 } } }),
  mountain: Object.freeze({ id: "mountain", name: "山岳", symbol: "▲", passable: false, movementCost: 99, defenseBonus: 0.24, visibilityModifier: 0.9, passableTags: ["FLYING", "SUBTERRANEAN"], classModifiers: { CAVALRY: { movement: 0.55, charge: 0.25 } } }),
  road: Object.freeze({ id: "road", name: "街道", symbol: "═", passable: true, movementCost: 0.65, defenseBonus: 0, visibilityModifier: 1, classModifiers: { CAVALRY: { movement: 1.12 } } }),
  river: Object.freeze({
    id: "river", name: "河川", symbol: "≈", passable: false, passableTags: ["FLYING", "AQUATIC"], movementCost: 4, defenseBonus: -0.08, visibilityModifier: 1,
    crossing: Object.freeze({ statusId: "river_crossing", name: "渡河直後", duration: 2, fatigue: 11, cohesion: 14, modifiers: { attack: 0.7, defense: 0.66, movement: 0.72, rangedAccuracy: 0.7, charge: 0.2 } }),
    bridgeCrossing: Object.freeze({ statusId: "bridge_crossing", name: "橋梁通過", duration: 1, fatigue: 4, cohesion: 5, modifiers: { attack: 0.9, defense: 0.88, movement: 0.9, charge: 0.65 } }),
    classModifiers: { CAVALRY: { movement: 0.45, charge: 0.2 } },
  }),
  swamp: Object.freeze({ id: "swamp", name: "湿地", symbol: "∴", passable: true, movementCost: 3, defenseBonus: 0.03, visibilityModifier: 0.85, classModifiers: { CAVALRY: { movement: 0.42, charge: 0.16 } } }),
  fortification: Object.freeze({ id: "fortification", name: "城砦", symbol: "▦", passable: true, movementCost: 2, defenseBonus: 0.35, visibilityModifier: 1, classModifiers: { INFANTRY: { defense: 1.18 }, CAVALRY: { charge: 0.1 } } }),
});

export const TACTICAL_FORMATIONS = Object.freeze({
  line: Object.freeze({
    id: "line", name: "横陣", description: "歩兵を広く並べ、射線と側面警戒を両立する。",
    modifiers: { attack: 1, defense: 1.04, movement: 1, rangedAccuracy: 1.03 },
    slots: [{ forward: 0, lateral: -2 }, { forward: 0, lateral: 3 }, { forward: 1, lateral: 0 }, { forward: -2, lateral: 0 }, { forward: -1, lateral: 5 }],
  }),
  wedge: Object.freeze({
    id: "wedge", name: "楔形陣", description: "中央突破と騎兵突撃を優先する攻撃配置。",
    modifiers: { attack: 1.08, defense: 0.94, movement: 1.05, charge: 1.12 },
    slots: [{ forward: 2, lateral: -1 }, { forward: 2, lateral: 1 }, { forward: 3, lateral: 0 }, { forward: -1, lateral: 0 }, { forward: 1, lateral: 4 }],
  }),
  guarded: Object.freeze({
    id: "guarded", name: "防御陣", description: "槍兵を中央に置き、後衛と補給線を保護する。",
    modifiers: { attack: 0.94, defense: 1.1, movement: 0.9, rangedAccuracy: 1.06 },
    slots: [{ forward: 0, lateral: -3 }, { forward: 0, lateral: 3 }, { forward: 0, lateral: 0 }, { forward: -2, lateral: 0 }, { forward: -2, lateral: 5 }],
  }),
});

export const LOGISTICS_STATES = Object.freeze({
  supplied: Object.freeze({ id: "supplied", name: "補給充足", minimum: 70, modifier: 1 }),
  strained: Object.freeze({ id: "strained", name: "補給逼迫", minimum: 40, modifier: 0.92 }),
  low: Object.freeze({ id: "low", name: "補給不足", minimum: 15, modifier: 0.78 }),
  critical: Object.freeze({ id: "critical", name: "補給枯渇", minimum: 0, modifier: 0.58 }),
});

export const BATTLE_TILE_FEATURES = Object.freeze({
  ford: Object.freeze({ id: "ford", name: "浅瀬", symbol: "⋮", grantsPassage: ["river"], movementCost: 2.35, permanent: true }),
  bridge: Object.freeze({ id: "bridge", name: "橋梁", symbol: "═", grantsPassage: ["river"], movementCost: 0.8, permanent: true }),
  supply_depot: Object.freeze({ id: "supply_depot", name: "補給所", symbol: "▣", permanent: true }),
});

export const BATTLE_FORTIFICATION_TYPES = Object.freeze({
  castle: Object.freeze({
    id: "castle", name: "城", symbol: "城", maxBaseDurability: 180, minimumBaseDurability: 60,
    auraRadius: 3, encirclementBaseLoss: 12, maxSupplyStockpile: 140, supplyThroughput: 20,
    buffs: Object.freeze({ defense: 1.18, moraleRecovery: 3, commandRange: 2, supplyReplenish: 4 }),
    description: "城壁と常備倉庫により、守備・士気・指揮・補給を広く支援する。完全包囲中は基礎耐久力が毎ターン低下する。",
  }),
  fort: Object.freeze({
    id: "fort", name: "砦", symbol: "砦", maxBaseDurability: 110, minimumBaseDurability: 45,
    auraRadius: 2, encirclementBaseLoss: 0, maxSupplyStockpile: 0, supplyThroughput: 0,
    buffs: Object.freeze({ defense: 1.12, rangedAccuracy: 1.1, brace: 1.18 }),
    description: "局地的な防御拠点。守備隊の防御・射撃精度・迎撃能力を高める。",
  }),
});

export const MAGIC_SKILLS = Object.freeze({
  arcane_bolt: Object.freeze({
    id: "arcane_bolt", name: "熾火の一矢", range: 6, radius: 0, fatigue: 6,
    effects: [{ type: "unit_damage", powerScale: 0.3, moraleScale: 0.12, target: "enemy_area" }],
  }),
  fire: Object.freeze({
    id: "fire", name: "炎陣", range: 6, radius: 1, fatigue: 11,
    effects: [
      { type: "unit_damage", powerScale: 0.34, moraleScale: 0.24, target: "enemy_area" },
      { type: "tile_status", statusId: "burning", duration: 3, target: "area" },
    ],
  }),
  ice: Object.freeze({
    id: "ice", name: "氷縛", range: 6, radius: 1, fatigue: 9,
    effects: [
      { type: "unit_status", statusId: "slowed", duration: 2, modifiers: { movement: 0.58 }, target: "enemy_area" },
      { type: "tile_status", statusId: "frozen", duration: 2, target: "area" },
    ],
  }),
  wind: Object.freeze({
    id: "wind", name: "乱気流", range: 7, radius: 2, fatigue: 8,
    effects: [{ type: "unit_status", statusId: "buffeted", duration: 2, modifiers: { rangedAccuracy: 0.55 }, target: "enemy_area" }],
  }),
  earth: Object.freeze({
    id: "earth", name: "土壁", range: 5, radius: 0, fatigue: 9,
    effects: [{ type: "tile_status", statusId: "earth_wall", duration: 3, defenseBonus: 0.28, movementCost: 2.5, target: "area" }],
  }),
  lightning: Object.freeze({
    id: "lightning", name: "雷撃", range: 7, radius: 0, fatigue: 12,
    effects: [{ type: "unit_damage", powerScale: 0.55, moraleScale: 0.3, tagBonus: { HEAVY_ARMOR: 1.45 }, target: "enemy_area" }],
  }),
  heal: Object.freeze({
    id: "heal", name: "治癒", range: 5, radius: 1, fatigue: 10,
    effects: [{ type: "restore_soldiers", powerScale: 0.16, target: "ally_area" }],
  }),
  radiant_ward: Object.freeze({
    id: "radiant_ward", name: "陽光の護り", range: 5, radius: 1, fatigue: 9,
    effects: [{ type: "unit_status", statusId: "radiant_ward", duration: 3, modifiers: { defense: 1.2 }, target: "ally_area" }],
  }),
  battle_hymn: Object.freeze({
    id: "battle_hymn", name: "戦歌共鳴", range: 5, radius: 2, fatigue: 8,
    effects: [{ type: "restore_morale", powerScale: 0.34, target: "ally_area" }],
  }),
  shadow_veil: Object.freeze({
    id: "shadow_veil", name: "影衣", range: 5, radius: 1, fatigue: 9,
    effects: [{ type: "unit_status", statusId: "shadow_veil", duration: 2, modifiers: { defense: 1.1, rangedAccuracy: 1.18 }, target: "ally_area" }],
  }),
  sunder: Object.freeze({
    id: "sunder", name: "鎧砕呪", range: 6, radius: 0, fatigue: 11,
    effects: [{ type: "unit_damage", powerScale: 0.48, moraleScale: 0.22, tagBonus: { HEAVY_ARMOR: 1.55 }, target: "enemy_area" }],
  }),
  life_surge: Object.freeze({
    id: "life_surge", name: "生命潮", range: 6, radius: 2, fatigue: 14,
    effects: [{ type: "restore_soldiers", powerScale: 0.28, target: "ally_area" }],
  }),
});

export const ENGINEER_ACTIONS = Object.freeze({
  barricade: Object.freeze({
    id: "barricade", name: "防柵", range: 1, fatigue: 8,
    effects: [{ type: "tile_status", statusId: "barricade", duration: 5, defenseBonus: 0.22, movementCost: 1.6 }],
  }),
  trench: Object.freeze({
    id: "trench", name: "塹壕", range: 1, fatigue: 11,
    effects: [{ type: "tile_status", statusId: "trench", duration: 8, defenseBonus: 0.3, movementCost: 1.8 }],
  }),
  bridge: Object.freeze({
    id: "bridge", name: "架橋", range: 1, fatigue: 12,
    allowedTerrain: ["river"], effects: [{ type: "tile_status", statusId: "bridge", duration: 99, movementCost: 0.8, permanent: true }],
  }),
  destroy_bridge: Object.freeze({
    id: "destroy_bridge", name: "橋梁破壊", range: 1, fatigue: 8,
    requiredStatus: "bridge", effects: [{ type: "remove_tile_status", statusId: "bridge" }],
  }),
});

export const DIRECTION_DAMAGE = Object.freeze({
  front: Object.freeze({ damage: 1, morale: 1, name: "正面" }),
  flank: Object.freeze({ damage: 1.2, morale: 1.35, name: "側面" }),
  rear: Object.freeze({ damage: 1.5, morale: 1.75, name: "背面" }),
});

export const ORDER_LABELS = Object.freeze({
  hold: "待機", advance: "前進", attack: "攻撃", defend: "防御", retreat: "撤退", pursue: "追撃",
});

export const PHASE_LABELS = Object.freeze({
  command: "命令", movement: "移動", charge_reaction: "突撃・迎撃", ranged: "射撃", magic: "魔法",
  melee: "白兵", morale: "士気", rout: "潰走", pursuit: "追撃", fatigue_status: "疲労・状態",
});
