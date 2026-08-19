import {
  BATTLE_FORTIFICATION_TYPES,
  BATTLE_PHASES,
  BATTLE_TILE_FEATURES,
  DIRECTION_DAMAGE,
  ENGINEER_ACTIONS,
  EQUIPMENT,
  FACING,
  LOGISTICS_STATES,
  MAGIC_SKILLS,
  RACES,
  TACTICAL_FORMATIONS,
  TERRAIN_TYPES,
  UNIT_CLASSES,
  UNIT_ORDERS,
} from "./tactical-data.js";
import { AURELIA_ZAFIR_ID, BERTHA_ARNFELD_ID, UNIQUE_CHARACTERS } from "./unique-characters.js";
import {
  ACTION_ACTOR_TYPES,
  deriveActionInterval,
  isActionDue,
  nextActionTime,
  resolveActionTimingConfig,
} from "./action-timing.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const positionKey = ({ x, y }) => `${x},${y}`;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const isFinitePosition = (position) => Number.isInteger(position?.x) && Number.isInteger(position?.y);
const TACTICAL_ICON_BASE = "./assets/generated/tactical-icons";

const DEFAULT_EQUIPMENT = Object.freeze({
  infantry: ["infantry_kit"],
  spearman: ["pike_kit"],
  heavy_infantry: ["heavy_plate"],
  cavalry: ["cavalry_kit"],
  light_cavalry: ["light_horse_kit"],
  archer: ["longbow_kit"],
  mage: ["arcane_focus"],
  engineer: ["engineering_kit"],
});

function assertDefinition(collection, id, label) {
  const definition = collection[id];
  if (!definition) throw new Error(`${label}「${id}」は定義されていません`);
  return definition;
}

function createBattleTile(x, y, terrainType = "plain") {
  const terrain = assertDefinition(TERRAIN_TYPES, terrainType, "地形");
  return {
    id: `tile-${x}-${y}`,
    position: { x, y },
    terrainType: terrain.id,
    elevation: terrain.id === "hill" ? 1 : terrain.id === "mountain" ? 2 : 0,
    movementCost: terrain.movementCost,
    defenseBonus: terrain.defenseBonus,
    visibilityModifier: terrain.visibilityModifier,
    status: [],
  };
}

export function createBattleMap({ width = 20, height = 14, terrainType = "plain" } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 6 || height < 6) {
    throw new Error("戦闘マップは6×6以上の整数サイズが必要です");
  }
  return {
    width,
    height,
    tiles: Array.from({ length: width * height }, (_, index) => createBattleTile(index % width, Math.floor(index / width), terrainType)),
  };
}

export function getBattleTile(battleOrMap, position) {
  const map = battleOrMap.map ?? battleOrMap;
  if (!isFinitePosition(position) || position.x < 0 || position.y < 0 || position.x >= map.width || position.y >= map.height) return null;
  return map.tiles[position.y * map.width + position.x] ?? null;
}

export function setBattleTerrain(battleOrMap, position, terrainType) {
  const terrain = assertDefinition(TERRAIN_TYPES, terrainType, "地形");
  const tile = getBattleTile(battleOrMap, position);
  if (!tile) throw new Error("マップ外の地形は変更できません");
  tile.terrainType = terrain.id;
  tile.movementCost = terrain.movementCost;
  tile.defenseBonus = terrain.defenseBonus;
  tile.visibilityModifier = terrain.visibilityModifier;
  tile.elevation = terrain.id === "hill" ? 1 : terrain.id === "mountain" ? 2 : 0;
  return battleOrMap;
}

export function setBattleTileFeature(battleOrMap, position, featureId) {
  const feature = assertDefinition(BATTLE_TILE_FEATURES, featureId, "地形設備");
  const tile = getBattleTile(battleOrMap, position);
  if (!tile) throw new Error("マップ外へ地形設備は配置できません");
  tile.status = tile.status.filter((status) => status.id !== feature.id);
  tile.status.push({ ...feature });
  return battleOrMap;
}

export function isBattleTilePassable(battleOrMap, position, unitOrId = null) {
  const tile = getBattleTile(battleOrMap, position);
  if (!tile) return false;
  const terrain = TERRAIN_TYPES[tile.terrainType];
  if (terrain.passable !== false) return true;
  const battle = battleOrMap.map ? battleOrMap : null;
  const unit = typeof unitOrId === "string" && battle ? getBattleUnit(battle, unitOrId) : unitOrId;
  if (unit?.tags?.some((tag) => terrain.passableTags?.includes(tag))) return true;
  return tile.status.some((status) => BATTLE_TILE_FEATURES[status.id]?.grantsPassage?.includes(terrain.id));
}

export function createCommander({
  id, name, iconUrl = null, side = "player", position, leadership = 66, tactics = 64, bravery = 68,
  magic = 30, commandRange = 8, commandSpeed = 3, traits = [], skills = [], postBattleProfile = null,
} = {}) {
  if (!id || !name || !isFinitePosition(position)) throw new Error("指揮官にはid・name・positionが必要です");
  return {
    id, name, iconUrl, side, position: { ...position }, leadership, tactics, bravery, magic,
    commandRange, commandSpeed, traits: [...traits], skills: [...skills],
    postBattleProfile: postBattleProfile ? structuredClone(postBattleProfile) : null,
    status: "ACTIVE", plannedPosition: null,
  };
}

export function createCombatUnit({
  id, name, iconUrl = null, side = "player", raceId = "human", unitClassId = "infantry", equipmentIds,
  commanderId, soldierCount = 120, maxSoldierCount = soldierCount, hp, maxHp: requestedMaxHp = null, morale, fatigue = 0,
  cohesion, experience = 35, supply = 100, maxSupply = 100, position, facing = FACING.EAST, statusEffects = [], tags = [],
  order = UNIT_ORDERS.HOLD, activeSkill = null,
  actionActorType = ACTION_ACTOR_TYPES.AI, actionAbilityScore = null, abilityIds = null, availableMagicSkillIds = null, magicPower = null,
  nationId = null, nationName = null, nationalProfileId = null, nationalDoctrineName = null,
  nationalDoctrineSummary = null, nationalTraitId = null, nationalTraitName = null, nationalTraitDescription = null,
  nationalStrength = null, nationalRisk = null, nationalModifiers = {}, nationalTerrainModifiers = {},
  generatedUnit = false, unitGeneration = null,
} = {}) {
  const unitClass = assertDefinition(UNIT_CLASSES, unitClassId, "兵種");
  const race = assertDefinition(RACES, raceId, "種族");
  if (!id || !name || !commanderId || !isFinitePosition(position)) throw new Error("部隊にはid・name・commanderId・positionが必要です");
  const maxHp = Math.max(1, Math.round(requestedMaxHp ?? unitClass.stats.hp * (race.modifiers.hp ?? 1) * (nationalModifiers.hp ?? 1)));
  return {
    id, name, iconUrl, side, raceId, unitClassId,
    equipmentIds: [...(equipmentIds ?? DEFAULT_EQUIPMENT[unitClassId] ?? [])], commanderId,
    soldierCount: clamp(Math.round(soldierCount), 0, Math.max(1, Math.round(maxSoldierCount))),
    maxSoldierCount: Math.max(1, Math.round(maxSoldierCount)),
    hp: clamp(hp ?? maxHp, 0, maxHp), maxHp,
    morale: clamp(morale ?? Math.round(unitClass.initial.morale * (race.modifiers.morale ?? 1) * (nationalModifiers.morale ?? 1)), 0, 100),
    fatigue: clamp(fatigue, 0, 100),
    supply: clamp(supply, 0, Math.max(1, maxSupply)), maxSupply: Math.max(1, maxSupply), logisticsState: "supplied",
    logisticsConnected: true, lastSupplyConsumption: 0, lastSupplyDelivery: 0, lastSupplySourceId: null,
    cohesion: clamp(cohesion ?? Math.round(unitClass.initial.cohesion * (race.modifiers.cohesion ?? 1) * (nationalModifiers.cohesion ?? 1)), 0, 100),
    experience: clamp(experience, 0, 100),
    position: { ...position }, facing,
    movement: unitClass.stats.movement,
    attack: unitClass.stats.attack,
    defense: unitClass.stats.defense,
    rangedAttack: unitClass.stats.rangedAttack,
    range: unitClass.stats.range,
    magicPower: magicPower !== null && magicPower !== undefined && Number.isFinite(Number(magicPower)) ? Number(magicPower) : null,
    statusEffects: statusEffects.map((effect) => ({ ...effect })),
    tags: [...new Set([...unitClass.tags, ...race.tags, ...tags])],
    abilities: [...new Set([...unitClass.abilities, ...(abilityIds ?? [])])],
    availableMagicSkillIds: availableMagicSkillIds ? [...new Set(availableMagicSkillIds)] : null,
    nationId, nationName, nationalProfileId, nationalDoctrineName, nationalDoctrineSummary,
    nationalTraitId, nationalTraitName, nationalTraitDescription, nationalStrength, nationalRisk,
    nationalModifiers: { ...nationalModifiers },
    nationalTerrainModifiers: Object.fromEntries(Object.entries(nationalTerrainModifiers).map(([terrainId, modifiers]) => [terrainId, { ...modifiers }])),
    generatedUnit: Boolean(generatedUnit),
    unitGeneration: unitGeneration ? structuredClone(unitGeneration) : null,
    order, lastOrder: order, state: "STABLE", engagedWith: [],
    plannedPosition: null, targetId: null, activeSkill: activeSkill ?? (unitClassId === "mage" ? availableMagicSkillIds?.[0] ?? "fire" : null),
    plannedAction: null, playerInstructions: {}, lastMovedDistance: 0, turnChargeBonus: 0, actedThisTurn: false,
    actionActorType, actionAbilityScore, actionInterval: null, nextActionAt: 0, lastActionAt: null, actionReadyThisPulse: false,
  };
}

export function createFortification({
  id, name, typeId = "fort", side = "player", position, baseDurability = null, durability = null,
  maxSupplyStockpile = null, supplyStockpile = null,
} = {}) {
  const definition = assertDefinition(BATTLE_FORTIFICATION_TYPES, typeId, "城塞種別");
  if (!id || !isFinitePosition(position) || !["player", "enemy"].includes(side)) {
    throw new Error("城塞にはid・side・positionが必要です");
  }
  const normalizedBase = clamp(
    Math.round(baseDurability ?? definition.maxBaseDurability),
    definition.minimumBaseDurability,
    definition.maxBaseDurability,
  );
  const normalizedSupplyMaximum = Math.max(0, Math.round(maxSupplyStockpile ?? definition.maxSupplyStockpile ?? 0));
  return {
    id,
    name: name ?? `${side === "player" ? "王国" : "公国"}${definition.name}`,
    typeId,
    side,
    position: { ...position },
    baseDurability: normalizedBase,
    durability: clamp(Math.round(durability ?? normalizedBase), 0, normalizedBase),
    maxSupplyStockpile: normalizedSupplyMaximum,
    supplyStockpile: clamp(Math.round(supplyStockpile ?? normalizedSupplyMaximum), 0, normalizedSupplyMaximum),
    encircled: false,
    encircledTurns: 0,
    status: "ACTIVE",
  };
}

function validateBattleEntities(map, units, commanders, fortifications = []) {
  const ids = new Set();
  [...units, ...commanders, ...fortifications].forEach((entity) => {
    if (ids.has(entity.id)) throw new Error(`戦闘Entityのid「${entity.id}」が重複しています`);
    ids.add(entity.id);
    if (!getBattleTile(map, entity.position)) throw new Error(`${entity.name}の初期位置がマップ外です`);
  });
  const occupied = new Set();
  units.forEach((unit) => {
    const key = positionKey(unit.position);
    if (occupied.has(key)) throw new Error(`初期配置${key}に複数部隊がいます`);
    occupied.add(key);
    if (!commanders.some((commander) => commander.id === unit.commanderId && commander.side === unit.side)) {
      throw new Error(`${unit.name}の指揮官が存在しません`);
    }
  });
}

function createDefaultSupplyNodes(map) {
  const centerY = Math.floor(map.height / 2);
  return [
    { id: "supply-player", name: "王国軍補給所", side: "player", position: { x: 0, y: centerY }, range: 7, replenish: 9, throughput: 34, maxStockpile: 360, stockpile: 360 },
    { id: "supply-enemy", name: "公国軍補給所", side: "enemy", position: { x: map.width - 1, y: centerY }, range: 7, replenish: 8, throughput: 32, maxStockpile: 320, stockpile: 320 },
  ];
}

function normalizeSupplyNode(node) {
  const maxStockpile = Math.max(0, Math.round(node.maxStockpile ?? node.stockpile ?? 300));
  return {
    ...structuredClone(node),
    range: Math.max(1, Math.round(node.range ?? 7)),
    replenish: Math.max(0, Number(node.replenish ?? 8)),
    throughput: Math.max(0, Number(node.throughput ?? 30)),
    maxStockpile,
    stockpile: clamp(Number(node.stockpile ?? maxStockpile), 0, maxStockpile),
  };
}

function normalizeFortificationSupply(fortification) {
  const definition = BATTLE_FORTIFICATION_TYPES[fortification.typeId];
  const maxSupplyStockpile = Math.max(0, Math.round(
    fortification.maxSupplyStockpile ?? definition?.maxSupplyStockpile ?? 0,
  ));
  return {
    ...fortification,
    maxSupplyStockpile,
    supplyStockpile: clamp(
      Number(fortification.supplyStockpile ?? maxSupplyStockpile),
      0,
      maxSupplyStockpile,
    ),
  };
}

export function createBattleState({
  id = "battle", name = "戦術戦闘", map = createBattleMap(), units = [], commanders = [], seed = 317,
  supplyNodes = null, formations = null, fortifications = [], actionTimingConfig = null,
} = {}) {
  validateBattleEntities(map, units, commanders, fortifications);
  return {
    version: 5, id, name, map, units, commanders, fortifications: fortifications.map(normalizeFortificationSupply),
    turn: 0, phase: "command", winner: null, outcome: null,
    rngState: Math.max(1, Math.trunc(seed) >>> 0),
    retreatEdges: { player: "west", enemy: "east" },
    supplyNodes: (supplyNodes ?? createDefaultSupplyNodes(map)).map(normalizeSupplyNode),
    formations: { player: "line", enemy: "line", ...(formations ?? {}) },
    actionTime: 0,
    actionTimingConfig: resolveActionTimingConfig(actionTimingConfig ?? {}),
    log: [{ turn: 0, phase: "command", message: "両軍の初期配置が完了しました。" }],
  };
}

export function createSampleBattle() {
  const map = createBattleMap({ width: 20, height: 14, terrainType: "plain" });
  for (let x = 0; x < map.width; x += 1) setBattleTerrain(map, { x, y: 6 }, "road");
  for (let y = 0; y < map.height; y += 1) setBattleTerrain(map, { x: 10, y }, "river");
  setBattleTileFeature(map, { x: 10, y: 3 }, "ford");
  setBattleTileFeature(map, { x: 10, y: 6 }, "bridge");
  setBattleTileFeature(map, { x: 10, y: 10 }, "ford");
  setBattleTileFeature(map, { x: 0, y: 7 }, "supply_depot");
  setBattleTileFeature(map, { x: 19, y: 7 }, "supply_depot");
  [[8, 3], [8, 4], [9, 3], [9, 4], [11, 9], [12, 9]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, "forest"));
  [[12, 5], [12, 6], [13, 5]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, "hill"));
  [[9, 0], [9, 1], [11, 12], [11, 13]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, "mountain"));
  [[9, 9], [9, 10], [11, 10], [11, 11]].forEach(([x, y]) => setBattleTerrain(map, { x, y }, "swamp"));

  const commanders = [
    createCommander({ id: "cmd-selene", name: "軍団長セラ", iconUrl: `${TACTICAL_ICON_BASE}/cmd-selene.png`, side: "player", position: { x: 2, y: 7 }, leadership: 76, tactics: 72, bravery: 74, commandRange: 10, commandSpeed: 3, traits: ["堅実な統率"] }),
    createCommander({
      id: "cmd-valka", name: "辺境伯エドラス", iconUrl: `${TACTICAL_ICON_BASE}/cmd-valka.png`, side: "enemy",
      position: { x: 18, y: 6 }, leadership: 69, tactics: 67, bravery: 78, commandRange: 9, commandSpeed: 3,
      traits: ["攻勢主義", "辺境の忠節", "名誉を重んじる"],
      postBattleProfile: {
        captureResponse: "persuasion", resolve: 78, loyalty: 84, preferredApproach: "honor",
        persuasionTarget: 100, reason: "ヴァルカ辺境と配下への責任を重く見ており、単純な利害では旧主を捨てない。",
        recruitmentRole: "東境軍顧問",
      },
    }),
  ];
  const units = [
    createCombatUnit({ id: "p-infantry-1", name: "王国第一歩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/p-infantry-1.png`, side: "player", unitClassId: "infantry", commanderId: "cmd-selene", soldierCount: 160, position: { x: 4, y: 4 }, order: "advance" }),
    createCombatUnit({ id: "p-mage", name: "セレナ魔導隊", iconUrl: "./assets/generated/unique-mage-runea-vesper.webp", side: "player", raceId: "elf", unitClassId: "mage", commanderId: "cmd-selene", soldierCount: 150, position: { x: 4, y: 9 }, order: "attack", availableMagicSkillIds: ["fire", "ice", "heal", "earth"] }),
    createCombatUnit({ id: "p-spearman", name: "灰冠槍兵隊", iconUrl: `${TACTICAL_ICON_BASE}/p-spearman.png`, side: "player", unitClassId: "spearman", commanderId: "cmd-selene", soldierCount: 140, position: { x: 5, y: 6 }, order: "defend" }),
    createCombatUnit({ id: "p-archer", name: "セレナ長弓隊", iconUrl: `${TACTICAL_ICON_BASE}/p-archer.png`, side: "player", raceId: "elf", unitClassId: "archer", commanderId: "cmd-selene", soldierCount: 120, position: { x: 2, y: 6 }, order: "attack" }),
    createCombatUnit({ id: "p-cavalry", name: "王国近衛騎兵", iconUrl: `${TACTICAL_ICON_BASE}/p-cavalry.png`, side: "player", unitClassId: "cavalry", commanderId: "cmd-selene", soldierCount: 90, position: { x: 3, y: 12 }, order: "attack" }),
    createCombatUnit({ id: "e-infantry-1", name: "公国第一歩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-infantry-1.png`, side: "enemy", raceId: "orc", unitClassId: "infantry", commanderId: "cmd-valka", soldierCount: 150, position: { x: 15, y: 4 }, facing: FACING.WEST, order: "advance" }),
    createCombatUnit({ id: "e-infantry-2", name: "公国第二歩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-infantry-2.png`, side: "enemy", unitClassId: "infantry", commanderId: "cmd-valka", soldierCount: 150, position: { x: 15, y: 6 }, facing: FACING.WEST, order: "advance" }),
    createCombatUnit({ id: "e-infantry-3", name: "公国第三歩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-infantry-3.png`, side: "enemy", unitClassId: "infantry", commanderId: "cmd-valka", soldierCount: 140, position: { x: 15, y: 9 }, facing: FACING.WEST, order: "advance" }),
    createCombatUnit({ id: "e-archer", name: "ヴァルカ弓兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-archer.png`, side: "enemy", unitClassId: "archer", commanderId: "cmd-valka", soldierCount: 110, position: { x: 17, y: 6 }, facing: FACING.WEST, order: "attack" }),
    createCombatUnit({ id: "e-light-cavalry", name: "辺境軽騎兵", iconUrl: `${TACTICAL_ICON_BASE}/e-light-cavalry.png`, side: "enemy", unitClassId: "light_cavalry", commanderId: "cmd-valka", soldierCount: 85, position: { x: 16, y: 1 }, facing: FACING.WEST, order: "attack" }),
  ];
  const fortifications = [
    createFortification({ id: "castle-selene", name: "灰冠城", typeId: "castle", side: "player", position: { x: 1, y: 8 } }),
    createFortification({ id: "fort-valka", name: "東岸砦", typeId: "fort", side: "enemy", position: { x: 18, y: 5 } }),
  ];
  return createBattleState({ id: "dev-field-battle", name: "灰冠平原・部隊戦闘試験", map, units, commanders, fortifications, seed: 317 });
}

export const AURELIA_BATTLE_COMMANDER_ID = `cmd-character-${AURELIA_ZAFIR_ID}`;

export function createImperialPrincessBattle() {
  const battle = createSampleBattle();
  const aurelia = UNIQUE_CHARACTERS[AURELIA_ZAFIR_ID];
  const enemyCommander = createCommander({
    id: AURELIA_BATTLE_COMMANDER_ID,
    name: aurelia.name,
    iconUrl: aurelia.portraitImage,
    side: "enemy",
    position: { x: 18, y: 6 },
    leadership: aurelia.stats.leadership,
    tactics: Math.round((aurelia.stats.war + aurelia.stats.intelligence) / 2),
    bravery: aurelia.stats.war,
    magic: Math.round(aurelia.stats.intelligence * 0.65),
    commandRange: 11,
    commandSpeed: 4,
    traits: ["皇女親征", "渡河作戦", "舟橋兵站", "歩騎連携"],
    postBattleProfile: {
      captureResponse: "persuasion",
      resolve: 94,
      loyalty: 96,
      preferredApproach: "honor",
      persuasionTarget: 180,
      reason: "皇統と白雷河界軍団の将兵へ自ら責任を負っており、個人の安全や地位を条件に帝国を離れることはない。",
      recruitmentRole: "帝国軍事使節",
    },
  });
  const enemyUnits = [
    createCombatUnit({ id: "e-imperial-infantry", name: "白雷第一歩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-infantry-1.png`, side: "enemy", unitClassId: "infantry", commanderId: AURELIA_BATTLE_COMMANDER_ID, soldierCount: 170, position: { x: 15, y: 4 }, facing: FACING.WEST, order: "advance" }),
    createCombatUnit({ id: "e-imperial-engineer", name: "帝国舟橋工兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-infantry-2.png`, side: "enemy", unitClassId: "engineer", commanderId: AURELIA_BATTLE_COMMANDER_ID, soldierCount: 110, position: { x: 15, y: 6 }, facing: FACING.WEST, order: "defend" }),
    createCombatUnit({ id: "e-imperial-spearman", name: "河界槍兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-infantry-3.png`, side: "enemy", unitClassId: "spearman", commanderId: AURELIA_BATTLE_COMMANDER_ID, soldierCount: 155, position: { x: 15, y: 9 }, facing: FACING.WEST, order: "defend" }),
    createCombatUnit({ id: "e-imperial-archer", name: "白雷弩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/e-archer.png`, side: "enemy", unitClassId: "archer", commanderId: AURELIA_BATTLE_COMMANDER_ID, soldierCount: 120, position: { x: 17, y: 6 }, facing: FACING.WEST, order: "attack" }),
    createCombatUnit({ id: "e-imperial-cavalry", name: "皇女旗軽騎兵", iconUrl: `${TACTICAL_ICON_BASE}/e-light-cavalry.png`, side: "enemy", unitClassId: "light_cavalry", commanderId: AURELIA_BATTLE_COMMANDER_ID, soldierCount: 95, position: { x: 16, y: 1 }, facing: FACING.WEST, order: "attack" }),
  ];
  battle.id = "dev-imperial-princess-battle";
  battle.name = "白雷河畔・皇女親征";
  battle.commanders = [...battle.commanders.filter((commander) => commander.side === "player"), enemyCommander];
  battle.units = [...battle.units.filter((unit) => unit.side === "player"), ...enemyUnits];
  battle.formations.enemy = "guarded";
  const enemyFort = battle.fortifications.find((fortification) => fortification.side === "enemy");
  if (enemyFort) enemyFort.name = "帝国河岸砦";
  const enemySupplyNode = battle.supplyNodes.find((node) => node.side === "enemy");
  if (enemySupplyNode) enemySupplyNode.name = "白雷軍団舟運補給所";
  battle.log = [{
    turn: 0,
    phase: "command",
    message: `${aurelia.name}が白雷旗の下で自ら軍団を指揮。舟橋工兵を中核に河岸の防御陣を整えました。`,
  }];
  return battle;
}

export const BERTHA_BATTLE_COMMANDER_ID = `cmd-character-${BERTHA_ARNFELD_ID}`;

export function createSeniorGeneralBattleRoster() {
  const bertha = UNIQUE_CHARACTERS[BERTHA_ARNFELD_ID];
  return [{
    id: bertha.id,
    name: bertha.name,
    portrait: bertha.portrait,
    portraitImage: bertha.portraitImage,
    role: bertha.role,
    rank: bertha.military.rank,
    policy: bertha.policy,
    traits: [...bertha.traits],
    stats: { ...bertha.stats },
    stamina: 100,
    assignment: null,
    available: true,
  }];
}

export function createSeniorGeneralBattle() {
  const battle = createSampleBattle();
  const bertha = UNIQUE_CHARACTERS[BERTHA_ARNFELD_ID];
  const playerCommander = createCommander({
    id: BERTHA_BATTLE_COMMANDER_ID,
    name: bertha.name,
    iconUrl: bertha.portraitImage,
    side: "player",
    position: { x: 2, y: 7 },
    leadership: bertha.stats.leadership,
    tactics: Math.round((bertha.stats.war + bertha.stats.intelligence) / 2),
    bravery: bertha.stats.war,
    magic: Math.round(bertha.stats.intelligence * 0.65),
    commandRange: 11,
    commandSpeed: 4,
    traits: ["上級将官", "段列交代", "峠道兵站", "機動予備"],
  });
  const playerUnits = [
    createCombatUnit({ id: "p-northern-heavy", name: "鉄梯子第一重装隊", iconUrl: `${TACTICAL_ICON_BASE}/p-infantry-1.png`, side: "player", unitClassId: "heavy_infantry", commanderId: BERTHA_BATTLE_COMMANDER_ID, soldierCount: 150, position: { x: 4, y: 4 }, order: "defend" }),
    createCombatUnit({ id: "p-northern-infantry", name: "北方第二歩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/p-infantry-2.png`, side: "player", unitClassId: "infantry", commanderId: BERTHA_BATTLE_COMMANDER_ID, soldierCount: 150, position: { x: 4, y: 9 }, order: "advance" }),
    createCombatUnit({ id: "p-northern-spearman", name: "鎖門長槍隊", iconUrl: `${TACTICAL_ICON_BASE}/p-spearman.png`, side: "player", unitClassId: "spearman", commanderId: BERTHA_BATTLE_COMMANDER_ID, soldierCount: 145, position: { x: 5, y: 6 }, order: "defend" }),
    createCombatUnit({ id: "p-northern-archer", name: "鐘坂弩兵隊", iconUrl: `${TACTICAL_ICON_BASE}/p-archer.png`, side: "player", unitClassId: "archer", commanderId: BERTHA_BATTLE_COMMANDER_ID, soldierCount: 120, position: { x: 2, y: 6 }, order: "attack" }),
    createCombatUnit({ id: "p-northern-reserve", name: "北方機動予備騎兵", iconUrl: `${TACTICAL_ICON_BASE}/p-cavalry.png`, side: "player", unitClassId: "cavalry", commanderId: BERTHA_BATTLE_COMMANDER_ID, soldierCount: 85, position: { x: 3, y: 12 }, order: "hold" }),
  ];
  battle.id = "dev-senior-general-battle";
  battle.name = "鎖門丘陵・北方軍迎撃戦";
  battle.commanders = [playerCommander, ...battle.commanders.filter((commander) => commander.side === "enemy")];
  battle.units = [...playerUnits, ...battle.units.filter((unit) => unit.side === "enemy")];
  battle.formations.player = "guarded";
  const playerFort = battle.fortifications.find((fortification) => fortification.side === "player");
  if (playerFort) playerFort.name = "鎖門丘陵陣城";
  const playerSupplyNode = battle.supplyNodes.find((node) => node.side === "player");
  if (playerSupplyNode) playerSupplyNode.name = "北方軍集団段列補給所";
  battle.log = [{
    turn: 0,
    phase: "command",
    message: `${bertha.name}が自ら北方軍集団を率いて出陣。重装隊を交代させながら、機動予備を後方に保持しています。`,
  }];
  return battle;
}

export function createEncirclementCaptureDemo() {
  const battle = createSampleBattle();
  battle.id = "dev-encirclement-result";
  battle.name = "灰冠平原・完全包囲戦果試験";
  battle.turn = 12;
  battle.phase = "complete";
  battle.winner = "player";
  const playerPositions = [
    { x: 11, y: 6 }, { x: 13, y: 6 }, { x: 12, y: 5 }, { x: 12, y: 7 }, { x: 11, y: 7 },
  ];
  battle.units.filter((unit) => unit.side === "player").forEach((unit, index) => {
    unit.position = { ...playerPositions[index] };
    unit.state = "STABLE";
    unit.morale = Math.max(55, unit.morale);
    unit.targetId = null;
    unit.plannedPosition = null;
  });
  const enemyUnits = battle.units.filter((unit) => unit.side === "enemy");
  enemyUnits.forEach((unit, index) => {
    unit.morale = 0;
    unit.cohesion = 0;
    unit.targetId = null;
    unit.plannedPosition = null;
    if (index === 2) {
      unit.position = { x: 12, y: 6 };
      unit.state = "ROUTED";
      unit.soldierCount = 12;
      unit.hp = 18;
    } else {
      unit.state = "DESTROYED";
      unit.soldierCount = 0;
      unit.hp = 0;
    }
  });
  const enemyCommander = getBattleCommander(battle, "cmd-valka");
  enemyCommander.position = { x: 12, y: 6 };
  enemyCommander.status = "ACTIVE";
  battle.outcome = { turn: battle.turn, playerRemaining: battle.units.filter((unit) => unit.side === "player").reduce((sum, unit) => sum + unit.soldierCount, 0), enemyRemaining: 12 };
  battle.log = [
    { turn: 11, phase: "movement", message: "王国軍は街道東側の全退路を遮断し、包囲環を完成させました。" },
    { turn: 12, phase: "morale", message: "公国軍は包囲下で戦闘継続能力を喪失しました。" },
    { turn: 12, phase: "fatigue_status", message: "王国軍が完全包囲による敵軍撃滅を達成しました。" },
  ];
  return battle;
}

export function createFortificationSiegeDemo() {
  const battle = createSampleBattle();
  battle.id = "dev-fortification-siege";
  battle.name = "東岸城・完全包囲試験";
  battle.turn = 3;
  battle.fortifications = [
    createFortification({ id: "castle-valka", name: "東岸城", typeId: "castle", side: "enemy", position: { x: 12, y: 6 } }),
    createFortification({ id: "fort-selene", name: "河西砦", typeId: "fort", side: "player", position: { x: 4, y: 11 } }),
  ];
  battle.fortifications[0].encircled = true;
  const encirclementPositions = [
    { x: 11, y: 6 }, { x: 13, y: 6 }, { x: 12, y: 5 }, { x: 12, y: 7 }, { x: 11, y: 7 },
  ];
  battle.units.filter((unit) => unit.side === "player").forEach((unit, index) => {
    unit.position = { ...encirclementPositions[index] };
    unit.order = UNIT_ORDERS.HOLD;
    unit.lastOrder = UNIT_ORDERS.HOLD;
    unit.targetId = null;
    unit.plannedPosition = null;
    unit.plannedAction = null;
  });
  battle.units.filter((unit) => unit.side === "enemy").forEach((unit) => {
    unit.order = UNIT_ORDERS.HOLD;
    unit.lastOrder = UNIT_ORDERS.HOLD;
    unit.targetId = null;
    unit.plannedPosition = null;
    unit.plannedAction = null;
  });
  const enemyCommander = getBattleCommander(battle, "cmd-valka");
  enemyCommander.position = { x: 14, y: 6 };
  battle.log = [{ turn: 3, phase: "command", message: "王国軍は東岸城の四方を封鎖。退路・補給路ともに完全遮断されています。" }];
  return battle;
}

export function applyBattleFormation(battle, side, formationId) {
  const formation = assertDefinition(TACTICAL_FORMATIONS, formationId, "陣形");
  if (!['player', 'enemy'].includes(side)) throw new Error("陣形を適用する陣営が不正です");
  if (battle.turn > 0 || battle.preparation?.finalized) throw new Error("陣形変更は戦闘開始前の編成でのみ可能です");
  const next = structuredClone(battle);
  const units = next.units.filter((unit) => unit.side === side && activeForCombat(unit));
  const personalUnitBattle = next.combatScale === "personal-units";
  const direction = side === "player" ? 1 : -1;
  const anchor = { x: side === "player" ? 4 : next.map.width - 5, y: Math.floor(next.map.height / 2) - 1 };
  const occupied = new Set(next.units.filter((unit) => unit.side !== side && onField(unit)).map((unit) => positionKey(unit.position)));
  units.forEach((unit, index) => {
    const sourceSlot = formation.slots[index] ?? { forward: Math.floor(index / 3), lateral: index % 3 - 1 };
    const slot = personalUnitBattle
      ? { forward: clamp(sourceSlot.forward, -1, 1), lateral: clamp(sourceSlot.lateral, -1, 1) }
      : sourceSlot;
    const desired = {
      x: clamp(anchor.x + direction * slot.forward, 0, next.map.width - 1),
      y: clamp(anchor.y + slot.lateral, 0, next.map.height - 1),
    };
    const candidates = [
      desired,
      { x: desired.x, y: desired.y - 1 }, { x: desired.x, y: desired.y + 1 },
      { x: desired.x - direction, y: desired.y }, { x: desired.x + direction, y: desired.y },
    ];
    const position = candidates.find((candidate) => isBattleTilePassable(next, candidate, unit) && !occupied.has(positionKey(candidate)));
    if (!position) throw new Error(`${formation.name}の配置場所を確保できません`);
    unit.position = { ...position };
    unit.facing = side === "player" ? FACING.EAST : FACING.WEST;
    unit.plannedPosition = null;
    unit.targetId = null;
    occupied.add(positionKey(position));
  });
  next.formations[side] = formation.id;
  addLog(next, "command", `${side === "player" ? "王国軍" : "公国軍"}が${formation.name}へ再配置しました。`);
  return next;
}

export function getBattleUnit(battle, unitId) {
  return battle.units.find((unit) => unit.id === unitId) ?? null;
}

export function getBattleCommander(battle, commanderId) {
  return battle.commanders.find((commander) => commander.id === commanderId) ?? null;
}

export function getBattleFortification(battle, fortificationId) {
  return (battle.fortifications ?? []).find((fortification) => fortification.id === fortificationId) ?? null;
}

function fortificationStrength(fortification, definition) {
  const integrity = fortification.baseDurability / Math.max(1, definition.maxBaseDurability);
  return clamp(0.45 + integrity * 0.55, 0.45, 1);
}

export function getFortificationAura(battle, entityOrId, typeId = null) {
  const entity = typeof entityOrId === "string"
    ? getBattleUnit(battle, entityOrId) ?? getBattleCommander(battle, entityOrId)
    : entityOrId;
  if (!entity?.position) return null;
  return (battle.fortifications ?? [])
    .filter((fortification) => {
      const definition = BATTLE_FORTIFICATION_TYPES[fortification.typeId];
      return fortification.side === entity.side
        && fortification.status !== "RUINED"
        && fortification.durability > 0
        && (!typeId || fortification.typeId === typeId)
        && distance(fortification.position, entity.position) <= definition.auraRadius;
    })
    .sort((a, b) => distance(a.position, entity.position) - distance(b.position, entity.position))[0] ?? null;
}

function getFortificationEffects(battle, entity) {
  const active = (battle.fortifications ?? []).filter((fortification) => {
    const definition = BATTLE_FORTIFICATION_TYPES[fortification.typeId];
    return fortification.side === entity.side
      && fortification.status !== "RUINED"
      && fortification.durability > 0
      && distance(fortification.position, entity.position) <= definition.auraRadius;
  });
  const modifier = (property) => active.reduce((product, fortification) => {
    const definition = BATTLE_FORTIFICATION_TYPES[fortification.typeId];
    const raw = definition.buffs[property] ?? 1;
    return product * (1 + (raw - 1) * fortificationStrength(fortification, definition));
  }, 1);
  return { active, modifier };
}

function modifierProduct(unit, property, terrainId = null) {
  const race = RACES[unit.raceId];
  let product = race.modifiers[property] ?? 1;
  unit.equipmentIds.forEach((equipmentId) => { product *= EQUIPMENT[equipmentId]?.modifiers[property] ?? 1; });
  unit.statusEffects.forEach((effect) => { product *= effect.modifiers?.[property] ?? 1; });
  product *= unit.nationalModifiers?.[property] ?? 1;
  if (terrainId) product *= unit.nationalTerrainModifiers?.[terrainId]?.[property] ?? 1;
  return product;
}

function terrainClassModifier(unit, terrain, property) {
  return unit.tags.reduce((product, tag) => product * (terrain.classModifiers[tag]?.[property] ?? 1), 1);
}

function tileStatusValue(tile, property, fallback) {
  if (property === "movementCost") return tile.status.reduce((value, status) => status.movementCost ?? value, fallback);
  return tile.status.reduce((value, status) => value + (status[property] ?? 0), fallback);
}

function formationModifier(battle, unit, property) {
  const formation = TACTICAL_FORMATIONS[battle.formations?.[unit.side]];
  return formation?.modifiers?.[property] ?? 1;
}

function supplySourceStockpile(source, sourceType) {
  return Number(sourceType === "castle" ? source?.supplyStockpile : source?.stockpile) || 0;
}

function supplySourceMaximum(source, sourceType) {
  return Number(sourceType === "castle" ? source?.maxSupplyStockpile : source?.maxStockpile) || 0;
}

function supplySourceThroughput(source, sourceType) {
  if (sourceType === "castle") return BATTLE_FORTIFICATION_TYPES[source?.typeId]?.supplyThroughput ?? 0;
  return Number(source?.throughput) || 0;
}

function setSupplySourceStockpile(source, sourceType, value) {
  const maximum = supplySourceMaximum(source, sourceType);
  if (sourceType === "castle") source.supplyStockpile = clamp(value, 0, maximum);
  else source.stockpile = clamp(value, 0, maximum);
}

function findSupplyPath(battle, side, start, goal, maximumSteps, enemyControl = null) {
  if (!getBattleTile(battle, start) || !getBattleTile(battle, goal)) return null;
  const hostileControl = enemyControl ?? getBattleControlZone(battle, side === "player" ? "enemy" : "player");
  const startKey = positionKey(start);
  const goalKey = positionKey(goal);
  if (hostileControl.has(startKey) || hostileControl.has(goalKey)) return null;
  const queue = [{ position: { ...start }, steps: 0 }];
  const visited = new Set([startKey]);
  const previous = new Map();
  let found = startKey === goalKey ? { ...start } : null;
  while (queue.length && !found) {
    const current = queue.shift();
    if (current.steps >= maximumSteps) continue;
    for (const neighbor of orthogonalNeighbors(current.position)) {
      const key = positionKey(neighbor);
      if (visited.has(key) || hostileControl.has(key) || !isBattleTilePassable(battle, neighbor)) continue;
      visited.add(key);
      previous.set(key, current.position);
      if (key === goalKey) {
        found = neighbor;
        break;
      }
      queue.push({ position: neighbor, steps: current.steps + 1 });
    }
  }
  if (!found) return null;
  const path = [{ ...found }];
  while (positionKey(path[0]) !== startKey) path.unshift({ ...previous.get(positionKey(path[0])) });
  return path.length - 1 <= maximumSteps ? path : null;
}

export function getSupplyRoute(battle, unitOrId) {
  const unit = typeof unitOrId === "string" ? getBattleUnit(battle, unitOrId) : unitOrId;
  if (!unit) throw new Error("部隊が存在しません");
  const enemySide = unit.side === "player" ? "enemy" : "player";
  const enemyControl = getBattleControlZone(battle, enemySide);
  const commander = getBattleCommander(battle, unit.commanderId);
  const nodes = (battle.supplyNodes ?? []).filter((node) => node.side === unit.side);
  const castles = (battle.fortifications ?? []).filter((fortification) => fortification.side === unit.side
    && fortification.typeId === "castle" && fortification.status !== "RUINED" && fortification.durability > 0);
  const sources = [
    ...nodes.map((source) => ({ source, sourceType: "depot" })),
    ...castles.map((source) => ({ source, sourceType: "castle" })),
  ];
  const candidates = [];
  let depleted = 0;
  let disrupted = 0;

  sources.forEach(({ source, sourceType }) => {
    const stockpile = supplySourceStockpile(source, sourceType);
    if (stockpile <= 0) {
      depleted += 1;
      return;
    }
    if (enemyControl.has(positionKey(source.position))) {
      disrupted += 1;
      return;
    }
    if (sourceType === "castle") {
      const definition = BATTLE_FORTIFICATION_TYPES.castle;
      const route = findSupplyPath(battle, unit.side, source.position, unit.position, definition.auraRadius, enemyControl);
      if (!route) return;
      candidates.push({
        connected: true,
        source,
        sourceType,
        route,
        routeLength: route.length - 1,
        relayConnected: false,
        replenishment: Math.max(0, Math.round(definition.buffs.supplyReplenish * fortificationStrength(source, definition))),
      });
      return;
    }

    const directRoute = findSupplyPath(battle, unit.side, source.position, unit.position, source.range, enemyControl);
    if (directRoute) {
      candidates.push({
        connected: true,
        source,
        sourceType,
        route: directRoute,
        routeLength: directRoute.length - 1,
        relayConnected: false,
        replenishment: source.replenish,
      });
      return;
    }
    if (commander?.status !== "ACTIVE") return;
    const sourceToCommander = findSupplyPath(battle, unit.side, source.position, commander.position, source.range, enemyControl);
    const commanderToUnit = findSupplyPath(battle, unit.side, commander.position, unit.position, commander.commandRange, enemyControl);
    if (!sourceToCommander || !commanderToUnit) return;
    candidates.push({
      connected: true,
      source,
      sourceType,
      route: [...sourceToCommander, ...commanderToUnit.slice(1)],
      routeLength: sourceToCommander.length + commanderToUnit.length - 2,
      relayConnected: true,
      replenishment: source.replenish,
    });
  });

  const best = candidates.sort((a, b) => b.replenishment - a.replenishment || a.routeLength - b.routeLength)[0];
  if (best) {
    return {
      ...best,
      sourceStockpile: supplySourceStockpile(best.source, best.sourceType),
      sourceMaxStockpile: supplySourceMaximum(best.source, best.sourceType),
      throughput: supplySourceThroughput(best.source, best.sourceType),
      reason: null,
    };
  }
  const unitOnFront = enemyControl.has(positionKey(unit.position));
  return {
    connected: false,
    source: null,
    sourceType: null,
    route: [],
    routeLength: null,
    relayConnected: false,
    replenishment: 0,
    sourceStockpile: 0,
    sourceMaxStockpile: 0,
    throughput: 0,
    reason: sources.length === 0
      ? "友軍の補給拠点がありません"
      : depleted === sources.length ? "友軍の補給備蓄が枯渇しました"
        : unitOnFront ? "部隊が敵支配圏内にあり輸送隊が接近できません"
          : disrupted > 0 ? "補給拠点または経路が敵支配圏で遮断されています"
            : "補給所・指揮官中継・城内備蓄の有効範囲外です",
  };
}

function getUnitSupplyConsumption(unit) {
  const classLoad = unit.tags.includes("CAVALRY") ? 1.3 : unit.tags.includes("RANGED") ? 1 : 0;
  const actionLoad = unit.actedThisTurn ? 2.2 : 0;
  const movementLoad = unit.lastMovedDistance * 0.85;
  return (1.5 + classLoad + actionLoad + movementLoad) * modifierProduct(unit, "supplyConsumption");
}

export function getLogisticsState(battle, unitOrId) {
  const unit = typeof unitOrId === "string" ? getBattleUnit(battle, unitOrId) : unitOrId;
  if (!unit) throw new Error("部隊が存在しません");
  if (unit.tags.includes("PERSONAL_COMBATANT")) {
    return {
      ...LOGISTICS_STATES.supplied,
      ratio: 100,
      connected: true,
      node: null,
      distance: null,
      relayConnected: false,
      fortification: null,
      replenishment: 0,
      route: [],
      routeLength: 0,
      source: null,
      sourceType: null,
      sourceStockpile: 0,
      sourceMaxStockpile: 0,
      throughput: 0,
      reason: "個人ユニット戦では軍団兵站を使用しません。",
      projectedConsumption: 0,
    };
  }
  const ratio = unit.supply / Math.max(1, unit.maxSupply) * 100;
  const state = Object.values(LOGISTICS_STATES).sort((a, b) => b.minimum - a.minimum).find((candidate) => ratio >= candidate.minimum)
    ?? LOGISTICS_STATES.critical;
  const nodes = (battle.supplyNodes ?? []).filter((node) => node.side === unit.side);
  const nearestNode = nodes.sort((a, b) => distance(unit.position, a.position) - distance(unit.position, b.position))[0] ?? null;
  const route = getSupplyRoute(battle, unit);
  return {
    ...state,
    ratio: Math.round(ratio),
    connected: route.connected,
    node: route.sourceType === "depot" ? route.source : nearestNode,
    distance: route.connected ? route.routeLength : nearestNode ? distance(unit.position, nearestNode.position) : null,
    relayConnected: route.relayConnected,
    fortification: route.sourceType === "castle" ? route.source : null,
    replenishment: route.replenishment,
    route: route.route,
    routeLength: route.routeLength,
    source: route.source,
    sourceType: route.sourceType,
    sourceStockpile: route.sourceStockpile,
    sourceMaxStockpile: route.sourceMaxStockpile,
    throughput: route.throughput,
    reason: route.reason,
    projectedConsumption: Number(getUnitSupplyConsumption(unit).toFixed(1)),
  };
}

export function isInCommandRange(battle, unitOrId) {
  const unit = typeof unitOrId === "string" ? getBattleUnit(battle, unitOrId) : unitOrId;
  const commander = unit ? getBattleCommander(battle, unit.commanderId) : null;
  const castle = commander ? getFortificationAura(battle, commander, "castle") : null;
  const commandBonus = castle ? BATTLE_FORTIFICATION_TYPES.castle.buffs.commandRange : 0;
  return Boolean(unit && commander && commander.status === "ACTIVE" && distance(unit.position, commander.position) <= commander.commandRange + commandBonus);
}

export function getEffectiveStats(battle, unitOrId) {
  const unit = typeof unitOrId === "string" ? getBattleUnit(battle, unitOrId) : unitOrId;
  if (!unit) throw new Error("部隊が存在しません");
  const unitClass = UNIT_CLASSES[unit.unitClassId];
  const race = RACES[unit.raceId];
  const tile = getBattleTile(battle, unit.position);
  const terrain = TERRAIN_TYPES[tile.terrainType];
  const commander = getBattleCommander(battle, unit.commanderId);
  const commanded = isInCommandRange(battle, unit);
  const logistics = getLogisticsState(battle, unit);
  const fortification = getFortificationEffects(battle, unit);
  const formation = TACTICAL_FORMATIONS[battle.formations?.[unit.side]] ?? TACTICAL_FORMATIONS.line;
  const commanderAttack = commanded ? 1 + (commander.tactics - 50) / 260 : 0.9;
  const commanderDefense = commanded ? 1 + (commander.leadership - 50) / 300 : 0.9;
  const moraleFactor = 0.52 + unit.morale / 208;
  const fatigueFactor = 1 - unit.fatigue * 0.0052;
  const cohesionFactor = 0.5 + unit.cohesion / 200;
  const strengthFactor = 0.34 + 0.66 * (unit.soldierCount / Math.max(1, unit.maxSoldierCount));
  const experienceFactor = 0.82 + unit.experience / 220;
  const terrainAffinity = race.terrainAffinity[terrain.id] ?? 1;
  const unitModifier = (property) => modifierProduct(unit, property, terrain.id);
  const terrainDefense = 1 + tileStatusValue(tile, "defenseBonus", tile.defenseBonus);
  const common = moraleFactor * fatigueFactor * cohesionFactor * strengthFactor * experienceFactor;
  const movement = unit.movement
    * unitModifier("movement")
    * terrainClassModifier(unit, terrain, "movement")
    * formationModifier(battle, unit, "movement")
    * logistics.modifier
    * terrainAffinity
    * (0.62 + unit.cohesion / 260)
    * (1 - unit.fatigue * 0.0045);
  const rangedAccuracy = unitClass.stats.accuracy
    * unitModifier("rangedAccuracy")
    * terrainClassModifier(unit, terrain, "rangedAccuracy")
    * tile.visibilityModifier;
  const result = {
    attack: unit.attack * unitModifier("attack") * terrainClassModifier(unit, terrain, "attack") * formationModifier(battle, unit, "attack") * logistics.modifier * commanderAttack * common,
    defense: unit.defense * unitModifier("defense") * terrainClassModifier(unit, terrain, "defense") * formationModifier(battle, unit, "defense") * logistics.modifier * commanderDefense * common * terrainDefense * (1 + (terrainAffinity - 1) * 0.35) * fortification.modifier("defense"),
    movement: Math.max(1, movement),
    rangedAttack: unit.rangedAttack * unitModifier("rangedAttack") * terrainClassModifier(unit, terrain, "rangedAttack") * formationModifier(battle, unit, "rangedAttack") * logistics.modifier * commanderAttack * common,
    rangedAccuracy: clamp(rangedAccuracy * formationModifier(battle, unit, "rangedAccuracy") * logistics.modifier * fortification.modifier("rangedAccuracy"), 0.08, 0.95),
    range: Math.max(1, unit.range * unitModifier("range") * terrainClassModifier(unit, terrain, "range")),
    magicPower: (unit.magicPower ?? unitClass.stats.magicPower ?? 0) * unitModifier("magicPower") * logistics.modifier * commanderAttack * moraleFactor * fatigueFactor,
    engineering: (unitClass.stats.engineering ?? 0) * unitModifier("engineering") * cohesionFactor * fatigueFactor,
    chargePower: (unitClass.stats.chargePower ?? 0) * unitModifier("charge") * terrainClassModifier(unit, terrain, "charge") * formationModifier(battle, unit, "charge") * logistics.modifier,
    bracePower: (unitClass.stats.bracePower ?? 0) * unitModifier("brace") * fortification.modifier("brace"),
    pursuitPower: (unitClass.stats.pursuitPower ?? 1) * unitModifier("pursuit"),
    durabilityPerSoldier: unitClass.stats.durabilityPerSoldier * unitModifier("durabilityPerSoldier"),
    fatigueCost: unitClass.stats.fatigueCost * unitModifier("fatigueCost"),
  };
  result.breakdown = {
    race: race.name,
    raceModifier: Number((race.modifiers.attack ?? 1).toFixed(2)),
    nationalDoctrine: unit.nationalDoctrineName ?? "固有軍制なし",
    nationalTrait: unit.nationalTraitName ?? "標準部隊",
    nationalModifier: Number(((unit.nationalModifiers?.attack ?? 1) * (unit.nationalTerrainModifiers?.[terrain.id]?.attack ?? 1)).toFixed(2)),
    commander: commanded ? `${commander.name}の指揮範囲内` : "指揮範囲外・自律行動",
    commanderModifier: Number(commanderAttack.toFixed(2)),
    terrain: terrain.name,
    terrainModifier: Number(terrainDefense.toFixed(2)),
    formation: formation.name,
    formationModifier: Number(formationModifier(battle, unit, "attack").toFixed(2)),
    logistics: `${logistics.name}${logistics.connected ? "・補給線接続" : "・補給線断絶"}`,
    logisticsModifier: Number(logistics.modifier.toFixed(2)),
    fortification: fortification.active.length ? fortification.active.map((item) => item.name).join("・") : "城塞支援なし",
    fortificationModifier: Number(fortification.modifier("defense").toFixed(2)),
    moraleModifier: Number(moraleFactor.toFixed(2)),
    fatigueModifier: Number(fatigueFactor.toFixed(2)),
    cohesionModifier: Number(cohesionFactor.toFixed(2)),
    strengthModifier: Number(strengthFactor.toFixed(2)),
    equipment: unit.equipmentIds.map((id) => EQUIPMENT[id]?.name ?? id),
  };
  return result;
}

function withBattleUnit(battle, unitId, updater) {
  const next = structuredClone(battle);
  const unit = getBattleUnit(next, unitId);
  if (!unit) throw new Error("部隊が存在しません");
  updater(unit, next);
  return next;
}

function requireDirectCommand(battle, unit) {
  if (unit.side === "player" && !isInCommandRange(battle, unit)) throw new Error("指揮範囲外のため直接命令できません");
  if (["ROUTED", "DESTROYED", "ESCAPED"].includes(unit.state)) throw new Error("この部隊には命令できません");
}

export function issueUnitOrder(battle, unitId, order) {
  if (!Object.values(UNIT_ORDERS).includes(order)) throw new Error("命令が不明です");
  return withBattleUnit(battle, unitId, (unit, next) => {
    requireDirectCommand(next, unit);
    unit.order = order;
    unit.lastOrder = order;
    unit.playerInstructions = { ...unit.playerInstructions, order: true };
  });
}

export function setUnitFacing(battle, unitId, facing) {
  if (!Object.values(FACING).includes(facing)) throw new Error("向きが不明です");
  return withBattleUnit(battle, unitId, (unit, next) => {
    requireDirectCommand(next, unit);
    unit.facing = facing;
    unit.playerInstructions = { ...unit.playerInstructions, facing: true };
  });
}

export function planUnitMove(battle, unitId, position) {
  return withBattleUnit(battle, unitId, (unit, next) => {
    requireDirectCommand(next, unit);
    if (!getBattleTile(next, position)) throw new Error("移動先がマップ外です");
    if (!isBattleTilePassable(next, position, unit)) throw new Error("この地形は通行できません。橋梁または浅瀬を利用してください");
    if (next.units.some((other) => other.id !== unit.id && !["DESTROYED", "ESCAPED"].includes(other.state) && positionKey(other.position) === positionKey(position))) {
      throw new Error("移動先には別の部隊がいます");
    }
    if (next.commanders.some((commander) => commander.status === "ACTIVE" && positionKey(commander.position) === positionKey(position))
      || (next.fortifications ?? []).some((fortification) => fortification.status !== "RUINED" && positionKey(fortification.position) === positionKey(position))) {
      throw new Error("移動先は味方キャラまたは城塞が占有しています");
    }
    if (next.units.some((other) => other.id !== unit.id && other.plannedPosition && positionKey(other.plannedPosition) === positionKey(position))) {
      throw new Error("移動先は別の部隊が予約しています");
    }
    const path = findBattlePath(next, unit, [position]);
    if (!path) throw new Error("通行可能な経路がありません");
    const movement = Math.max(1, getEffectiveStats(next, unit).movement);
    const advance = advanceAlongPath(next, unit, path, movement);
    if (positionKey(advance.position) !== positionKey(position)) throw new Error("このターンの移動可能範囲外です");
    unit.plannedPosition = { ...position };
    unit.targetId = null;
    unit.plannedAction = null;
    unit.playerInstructions = { ...unit.playerInstructions, move: true, target: false, action: false };
  });
}

export function planUnitTarget(battle, unitId, targetId) {
  return withBattleUnit(battle, unitId, (unit, next) => {
    requireDirectCommand(next, unit);
    const target = getBattleUnit(next, targetId);
    if (!target || target.side === unit.side || ["DESTROYED", "ESCAPED"].includes(target.state)) throw new Error("有効な敵部隊を指定してください");
    unit.targetId = target.id;
    unit.plannedPosition = null;
    unit.plannedAction = null;
    unit.playerInstructions = { ...unit.playerInstructions, move: false, target: true, action: false };
  });
}

export function planUnitAbility(battle, unitId, actionId, position) {
  return withBattleUnit(battle, unitId, (unit, next) => {
    requireDirectCommand(next, unit);
    const definitions = unit.abilities.includes("magic") ? MAGIC_SKILLS : unit.abilities.includes("engineering") ? ENGINEER_ACTIONS : null;
    if (!definitions?.[actionId]) throw new Error("この部隊は指定された能力を使用できません");
    if (unit.abilities.includes("magic") && unit.availableMagicSkillIds && !unit.availableMagicSkillIds.includes(actionId)) throw new Error("この魔法は装備していません");
    if (!getBattleTile(next, position)) throw new Error("能力の対象がマップ外です");
    if (unit.abilities.includes("magic")) validateMagicTarget(next, unit, actionId, position);
    unit.activeSkill = unit.abilities.includes("magic") ? actionId : unit.activeSkill;
    unit.plannedAction = { actionId, position: { ...position } };
    unit.plannedPosition = null;
    unit.targetId = null;
    unit.playerInstructions = { ...unit.playerInstructions, move: false, target: false, action: true };
  });
}

export function planCommanderMove(battle, commanderId, position) {
  const next = structuredClone(battle);
  const commander = getBattleCommander(next, commanderId);
  if (!commander || commander.side !== "player" || commander.status !== "ACTIVE") throw new Error("移動可能な指揮官ではありません");
  if (!getBattleTile(next, position)) throw new Error("指揮官の移動先がマップ外です");
  if (!isBattleTilePassable(next, position)) throw new Error("指揮官はこの地形を通行できません");
  if (distance(commander.position, position) > commander.commandSpeed) throw new Error("指揮官の移動距離を超えています");
  const occupied = [
    ...next.units.filter(onField),
    ...next.commanders.filter((other) => other.status === "ACTIVE" && other.id !== commander.id),
    ...(next.fortifications ?? []).filter((fortification) => fortification.status !== "RUINED"),
  ].some((entity) => positionKey(entity.position) === positionKey(position));
  if (occupied) throw new Error("指揮官の移動先が占有されています");
  commander.plannedPosition = { ...position };
  return next;
}

function nextRandom(battle) {
  battle.rngState = (1664525 * battle.rngState + 1013904223) >>> 0;
  return battle.rngState / 4294967296;
}

function addLog(battle, phase, message) {
  battle.log.push({ turn: battle.turn, phase, message });
  if (battle.log.length > 120) battle.log.splice(0, battle.log.length - 120);
}

function activeForCombat(unit) {
  return Boolean(unit && !["ROUTED", "DESTROYED", "ESCAPED"].includes(unit.state) && unit.soldierCount > 0);
}

function onField(unit) {
  return Boolean(unit && !["DESTROYED", "ESCAPED"].includes(unit.state) && unit.soldierCount > 0);
}

function orthogonalNeighbors(position) {
  return [
    { x: position.x + 1, y: position.y },
    { x: position.x - 1, y: position.y },
    { x: position.x, y: position.y + 1 },
    { x: position.x, y: position.y - 1 },
  ];
}

function isRetreatEdge(battle, side, position) {
  const edge = battle.retreatEdges?.[side] ?? (side === "player" ? "west" : "east");
  if (edge === "west") return position.x === 0;
  if (edge === "east") return position.x === battle.map.width - 1;
  if (edge === "north") return position.y === 0;
  return position.y === battle.map.height - 1;
}

export function getBattleControlZone(battle, side) {
  const controlled = new Set();
  battle.units.filter((unit) => unit.side === side && activeForCombat(unit)).forEach((unit) => {
    controlled.add(positionKey(unit.position));
    orthogonalNeighbors(unit.position).forEach((position) => {
      if (getBattleTile(battle, position)) controlled.add(positionKey(position));
    });
  });
  return controlled;
}

export function hasSafeRetreatCorridor(battle, side, startPosition, enemySide = side === "player" ? "enemy" : "player") {
  if (!battle?.map || !getBattleTile(battle, startPosition)) return false;
  const enemyControl = getBattleControlZone(battle, enemySide);
  const startKey = positionKey(startPosition);
  const queue = [{ ...startPosition }];
  const visited = new Set([startKey]);
  while (queue.length) {
    const current = queue.shift();
    const currentKey = positionKey(current);
    if (isRetreatEdge(battle, side, current) && (!enemyControl.has(currentKey) || currentKey === startKey)) return true;
    orthogonalNeighbors(current).forEach((neighbor) => {
      const key = positionKey(neighbor);
      if (visited.has(key) || enemyControl.has(key) || !isBattleTilePassable(battle, neighbor)) return;
      visited.add(key);
      queue.push(neighbor);
    });
  }
  return false;
}

function directionFromDelta(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? FACING.EAST : FACING.WEST;
  return dy >= 0 ? FACING.SOUTH : FACING.NORTH;
}

function oppositeFacing(facing) {
  return { north: "south", south: "north", east: "west", west: "east" }[facing];
}

export function getAttackDirection(attacker, defender) {
  const approach = directionFromDelta(attacker.position.x - defender.position.x, attacker.position.y - defender.position.y);
  if (approach === defender.facing) return "front";
  if (approach === oppositeFacing(defender.facing)) return "rear";
  return "flank";
}

export function getChargePreview(battle, attackerId, defenderId, movedDistance = null) {
  const attacker = getBattleUnit(battle, attackerId);
  const defender = getBattleUnit(battle, defenderId);
  if (!attacker || !defender) throw new Error("突撃判定の部隊が存在しません");
  const traveled = movedDistance ?? attacker.lastMovedDistance;
  const attackerStats = getEffectiveStats(battle, attacker);
  const defenderStats = getEffectiveStats(battle, defender);
  const direction = getAttackDirection(attacker, defender);
  const charging = attacker.abilities.includes("charge") && traveled >= 3;
  const braced = charging && defender.abilities.includes("brace") && direction === "front";
  const sizeBonus = defender.tags.includes("LARGE") ? 1.35 : 1;
  const chargeBonus = charging ? traveled * attackerStats.chargePower : 0;
  return {
    charging, braced, direction, chargeBonus,
    attackMultiplier: DIRECTION_DAMAGE[direction].damage * (braced ? 0.42 : 1),
    moraleMultiplier: DIRECTION_DAMAGE[direction].morale * (charging ? 1.2 : 1),
    braceCounterMultiplier: braced ? defenderStats.bracePower * sizeBonus : 0,
  };
}

function nearestEnemy(battle, unit, predicate = () => true) {
  return battle.units
    .filter((candidate) => candidate.side !== unit.side && onField(candidate) && predicate(candidate))
    .sort((a, b) => distance(unit.position, a.position) - distance(unit.position, b.position))[0] ?? null;
}

function chooseAiTarget(battle, unit) {
  if (unit.unitClassId === "spearman") return nearestEnemy(battle, unit, (candidate) => candidate.tags.includes("CAVALRY") || candidate.tags.includes("LARGE")) ?? nearestEnemy(battle, unit);
  if (["cavalry", "light_cavalry"].includes(unit.unitClassId)) {
    if (unit.order === "pursue" || unit.unitClassId === "light_cavalry") return nearestEnemy(battle, unit, (candidate) => candidate.state === "ROUTED") ?? nearestEnemy(battle, unit, (candidate) => ["archer", "mage"].includes(candidate.unitClassId)) ?? nearestEnemy(battle, unit);
    return nearestEnemy(battle, unit, (candidate) => ["archer", "mage"].includes(candidate.unitClassId)) ?? nearestEnemy(battle, unit);
  }
  if (unit.unitClassId === "mage") {
    return battle.units.filter((candidate) => candidate.side !== unit.side && activeForCombat(candidate))
      .sort((a, b) => {
        const density = (target) => battle.units.filter((other) => other.side === target.side && activeForCombat(other) && distance(other.position, target.position) <= 2).length;
        return density(b) - density(a) || distance(unit.position, a.position) - distance(unit.position, b.position);
      })[0] ?? null;
  }
  return nearestEnemy(battle, unit);
}

function unoccupiedPositionNear(battle, desired, unitId) {
  const unit = getBattleUnit(battle, unitId);
  const occupied = new Set(battle.units.filter((unit) => unit.id !== unitId && onField(unit)).map((unit) => positionKey(unit.position)));
  const candidates = [
    desired,
    { x: desired.x, y: desired.y - 1 }, { x: desired.x, y: desired.y + 1 },
    { x: desired.x - 1, y: desired.y }, { x: desired.x + 1, y: desired.y },
  ];
  return candidates.find((position) => isBattleTilePassable(battle, position, unit) && !occupied.has(positionKey(position))) ?? null;
}

function findBattlePath(battle, unit, goals) {
  const goalKeys = new Set(goals.map(positionKey));
  const startKey = positionKey(unit.position);
  const occupied = new Set(battle.units.filter((other) => other.id !== unit.id && onField(other)).map((other) => positionKey(other.position)));
  const queue = [{ ...unit.position }];
  const visited = new Set([startKey]);
  const previous = new Map();
  let found = goalKeys.has(startKey) ? { ...unit.position } : null;
  while (queue.length && !found) {
    const current = queue.shift();
    const candidates = orthogonalNeighbors(current)
      .filter((position) => isBattleTilePassable(battle, position, unit) && !occupied.has(positionKey(position)))
      .sort((a, b) => Math.min(...goals.map((goal) => distance(a, goal))) - Math.min(...goals.map((goal) => distance(b, goal))));
    for (const candidate of candidates) {
      const key = positionKey(candidate);
      if (visited.has(key)) continue;
      visited.add(key);
      previous.set(key, current);
      if (goalKeys.has(key)) {
        found = candidate;
        break;
      }
      queue.push(candidate);
    }
  }
  if (!found) return null;
  const path = [{ ...found }];
  while (positionKey(path[0]) !== startKey) path.unshift({ ...previous.get(positionKey(path[0])) });
  return path;
}

function advanceAlongPath(battle, unit, path, movementBudget) {
  if (!path?.length) return { position: { ...unit.position }, path: [{ ...unit.position }], cost: 0 };
  let spent = 0;
  let lastIndex = 0;
  for (let index = 1; index < path.length; index += 1) {
    const tile = getBattleTile(battle, path[index]);
    const cost = tileStatusValue(tile, "movementCost", tile.movementCost);
    if (spent + cost > movementBudget) break;
    spent += cost;
    lastIndex = index;
  }
  return { position: { ...path[lastIndex] }, path: path.slice(0, lastIndex + 1), cost: spent };
}

export function getReachableBattleTiles(battle, unitId) {
  const unit = getBattleUnit(battle, unitId);
  if (!unit || unit.side !== "player" || !activeForCombat(unit) || !isInCommandRange(battle, unit)) return [];
  const movement = Math.max(1, getEffectiveStats(battle, unit).movement);
  const reserved = new Set(battle.units
    .filter((other) => other.id !== unit.id && other.plannedPosition)
    .map((other) => positionKey(other.plannedPosition)));
  const occupiedLandmarks = new Set([
    ...battle.commanders.filter((commander) => commander.status === "ACTIVE"),
    ...(battle.fortifications ?? []).filter((fortification) => fortification.status !== "RUINED"),
  ].map((entity) => positionKey(entity.position)));
  return battle.map.tiles.flatMap((tile) => {
    const key = positionKey(tile.position);
    if (key === positionKey(unit.position) || reserved.has(key) || occupiedLandmarks.has(key) || !isBattleTilePassable(battle, tile.position, unit)) return [];
    const path = findBattlePath(battle, unit, [tile.position]);
    if (!path) return [];
    const advance = advanceAlongPath(battle, unit, path, movement);
    if (positionKey(advance.position) !== key) return [];
    return [{ position: { ...tile.position }, path: advance.path.map((position) => ({ ...position })), cost: Number(advance.cost.toFixed(2)) }];
  });
}

export function getAttackableBattleTiles(battle, unitId) {
  const unit = getBattleUnit(battle, unitId);
  if (!unit || unit.side !== "player" || !activeForCombat(unit) || !isInCommandRange(battle, unit)) return [];
  const stats = getEffectiveStats(battle, unit);
  const magicSkill = unit.abilities.includes("magic") ? MAGIC_SKILLS[unit.activeSkill ?? "fire"] : null;
  const canUseRangedAttack = stats.rangedAttack > 0 && !unit.engagedWith.length;
  const range = magicSkill?.range ?? (canUseRangedAttack ? stats.range : 1);
  const requiresLineOfSight = !magicSkill && canUseRangedAttack;
  return battle.map.tiles.flatMap((tile) => {
    const separation = distance(unit.position, tile.position);
    if (separation < 1 || separation > range) return [];
    if (requiresLineOfSight && !hasLineOfSight(battle, unit.position, tile.position)) return [];
    return [{ position: { ...tile.position }, distance: separation, range: Number(range.toFixed(2)) }];
  });
}

export function getReachableCommanderTiles(battle, commanderId) {
  const commander = getBattleCommander(battle, commanderId);
  if (!commander || commander.side !== "player" || commander.status !== "ACTIVE") return [];
  const occupied = new Set([
    ...battle.units.filter(onField),
    ...battle.commanders.filter((other) => other.status === "ACTIVE" && other.id !== commander.id),
    ...(battle.fortifications ?? []).filter((fortification) => fortification.status !== "RUINED"),
  ].map((entity) => positionKey(entity.position)));
  return battle.map.tiles.flatMap((tile) => {
    const key = positionKey(tile.position);
    const cost = distance(commander.position, tile.position);
    if (cost < 1 || cost > commander.commandSpeed || occupied.has(key) || !isBattleTilePassable(battle, tile.position)) return [];
    return [{ position: { ...tile.position }, cost }];
  });
}

function stepToward(battle, unit, targetPosition, flank = false) {
  const stats = getEffectiveStats(battle, unit);
  let goal = { ...targetPosition };
  if (flank) {
    const direction = unit.side === "player" ? -1 : 1;
    goal = { x: targetPosition.x, y: clamp(targetPosition.y + direction * 3, 0, battle.map.height - 1) };
  }
  const occupiedGoal = battle.units.some((other) => other.id !== unit.id && onField(other) && positionKey(other.position) === positionKey(goal));
  const goals = (occupiedGoal ? orthogonalNeighbors(goal) : [goal])
    .filter((position) => isBattleTilePassable(battle, position, unit));
  const path = findBattlePath(battle, unit, goals);
  return advanceAlongPath(battle, unit, path, Math.max(1, stats.movement)).position;
}

function planAiUnit(battle, unit, explicitTargetId = null) {
  if (!activeForCombat(unit)) return;
  if (unit.order === "retreat") {
    unit.plannedPosition = stepToward(battle, unit, { x: unit.side === "player" ? 0 : battle.map.width - 1, y: unit.position.y });
    return;
  }
  const explicitTarget = getBattleUnit(battle, explicitTargetId);
  const target = explicitTarget && explicitTarget.side !== unit.side && activeForCombat(explicitTarget) ? explicitTarget : chooseAiTarget(battle, unit);
  if (!target) return;
  unit.targetId = target.id;
  if (unit.unitClassId === "mage") {
    const actionId = unit.activeSkill ?? "fire";
    const skill = MAGIC_SKILLS[actionId] ?? MAGIC_SKILLS.fire;
    if (distance(unit.position, target.position) > skill.range) {
      unit.plannedAction = null;
      unit.plannedPosition = stepToward(battle, unit, target.position);
    } else {
      unit.plannedPosition = null;
      unit.plannedAction = { actionId, position: { ...target.position } };
    }
    return;
  }
  if (unit.unitClassId === "engineer") {
    if (!unit.plannedAction) unit.plannedAction = { actionId: "barricade", position: { ...unit.position } };
    return;
  }
  const separation = distance(unit.position, target.position);
  if (unit.unitClassId === "archer") {
    if (separation > Math.floor(getEffectiveStats(battle, unit).range)) unit.plannedPosition = stepToward(battle, unit, target.position);
    return;
  }
  if (unit.order === "hold" || unit.order === "defend") {
    if (!unit.playerInstructions?.facing) unit.facing = directionFromDelta(target.position.x - unit.position.x, target.position.y - unit.position.y);
    return;
  }
  if (separation > 1) unit.plannedPosition = stepToward(battle, unit, target.position, unit.tags.includes("CAVALRY") && separation > 4);
}

function commandPhase(battle) {
  battle.units.forEach((unit) => {
    unit.actedThisTurn = false;
    unit.lastMovedDistance = 0;
    unit.turnChargeBonus = 0;
    unit.actionReadyThisPulse = isActionDue(battle.actionTime, unit.nextActionAt);
    if (!activeForCombat(unit)) return;
    if (!unit.actionReadyThisPulse) return;
    const instructions = unit.playerInstructions ?? {};
    const directMove = Boolean(instructions.move && unit.plannedPosition);
    const directAction = Boolean(instructions.action && unit.plannedAction);
    const directTarget = instructions.target ? unit.targetId : null;
    if (unit.side === "enemy" || !isInCommandRange(battle, unit)) planAiUnit(battle, unit);
    else if (directTarget) planAiUnit(battle, unit, directTarget);
    else if (!directMove && !directAction) planAiUnit(battle, unit);
  });
  addLog(battle, "command", `行動時刻${battle.actionTime}。行動値が一致した部隊だけが命令を実行し、未指示なら兵種・特性・現在命令に基づいて自律判断します。`);
}

function applyDamage(battle, target, power, moraleDamage, sourceName, phase, casualtyMultiplier = 1) {
  if (!onField(target)) return { casualties: 0, damage: 0 };
  const stats = getEffectiveStats(battle, target);
  const variance = 0.88 + nextRandom(battle) * 0.24;
  const damage = Math.max(0, power * variance);
  const hpDamage = damage * 0.58;
  const remainingHp = clamp(target.hp - hpDamage, 0, target.maxHp);
  const personalCombatant = target.tags.includes("PERSONAL_COMBATANT");
  const casualties = personalCombatant
    ? (remainingHp <= 0 ? target.soldierCount : 0)
    : Math.min(target.soldierCount, Math.max(1, Math.round(damage / Math.max(0.5, stats.durabilityPerSoldier) * casualtyMultiplier)));
  target.soldierCount -= casualties;
  target.hp = remainingHp;
  target.morale = clamp(target.morale - moraleDamage * variance, 0, 100);
  target.cohesion = clamp(target.cohesion - damage * 0.42, 0, 100);
  if (target.soldierCount <= 0 || target.hp <= 0) {
    target.state = "DESTROYED";
    target.engagedWith = [];
  }
  addLog(battle, phase, personalCombatant
    ? `${sourceName} → ${target.name}：HP${Math.max(1, Math.round(hpDamage))}損耗、残りHP${Math.round(target.hp)}。`
    : `${sourceName} → ${target.name}：${casualties}名損耗、士気${Math.round(target.morale)}。`);
  return { casualties, damage };
}

function disengageCheck(battle, unit) {
  if (!unit.engagedWith.length) return true;
  const stats = getEffectiveStats(battle, unit);
  const chance = clamp(0.2 + unit.cohesion / 180 + stats.movement / 30 - unit.fatigue / 230, 0.15, 0.88);
  if (nextRandom(battle) <= chance) {
    unit.cohesion = clamp(unit.cohesion - 8, 0, 100);
    addLog(battle, "movement", `${unit.name}は交戦から離脱しました。`);
    return true;
  }
  applyDamage(battle, unit, 12, 14, "離脱失敗", "movement", 1.15);
  unit.cohesion = clamp(unit.cohesion - 12, 0, 100);
  unit.plannedPosition = null;
  return false;
}

function applyRiverCrossingPenalty(battle, unit, path) {
  if (unit.tags.includes("FLYING") || unit.tags.includes("AQUATIC")) return;
  const riverTiles = path.slice(1).map((position) => getBattleTile(battle, position)).filter((tile) => tile?.terrainType === "river");
  if (!riverTiles.length) return;
  const usedBridge = riverTiles.some((tile) => tile.status.some((status) => status.id === "bridge"));
  const definition = usedBridge ? TERRAIN_TYPES.river.bridgeCrossing : TERRAIN_TYPES.river.crossing;
  unit.statusEffects = unit.statusEffects.filter((status) => !["river_crossing", "bridge_crossing"].includes(status.id));
  unit.statusEffects.push({ id: definition.statusId, name: definition.name, duration: definition.duration, modifiers: { ...definition.modifiers } });
  unit.fatigue = clamp(unit.fatigue + definition.fatigue, 0, 100);
  unit.cohesion = clamp(unit.cohesion - definition.cohesion, 0, 100);
  unit.turnChargeBonus = 0;
  addLog(battle, "movement", `${unit.name}が${usedBridge ? "橋梁" : "浅瀬"}を渡河。${definition.name}により戦力が一時低下します。`);
}

function movementPhase(battle) {
  battle.commanders.forEach((commander) => {
    if (commander.status === "ACTIVE" && commander.plannedPosition) commander.position = { ...commander.plannedPosition };
    commander.plannedPosition = null;
  });
  refreshEngagements(battle);
  const movers = battle.units.filter((unit) => activeForCombat(unit) && unit.actionReadyThisPulse && unit.plannedPosition)
    .sort((a, b) => Number(Boolean(b.playerInstructions?.move)) - Number(Boolean(a.playerInstructions?.move))
      || getEffectiveStats(battle, b).movement - getEffectiveStats(battle, a).movement);
  movers.forEach((unit) => {
    const manualMove = Boolean(unit.playerInstructions?.move);
    const reachedTarget = !manualMove && unit.order !== "retreat" && unit.targetId && unit.engagedWith.includes(unit.targetId);
    if (reachedTarget) {
      unit.plannedPosition = null;
      return;
    }
    if (!disengageCheck(battle, unit)) return;
    const desired = manualMove ? { ...unit.plannedPosition } : unoccupiedPositionNear(battle, unit.plannedPosition, unit.id);
    if (!desired) return;
    if (manualMove && battle.units.some((other) => other.id !== unit.id && onField(other) && positionKey(other.position) === positionKey(desired))) {
      addLog(battle, "movement", `${unit.name}は指定先が占有されたため移動できませんでした。`);
      unit.plannedPosition = null;
      return;
    }
    const stats = getEffectiveStats(battle, unit);
    const path = findBattlePath(battle, unit, [desired]);
    const advance = advanceAlongPath(battle, unit, path, Math.max(1, stats.movement));
    const destination = advance.position;
    const moved = Math.max(0, advance.path.length - 1);
    if (moved > 0) {
      unit.facing = directionFromDelta(destination.x - unit.position.x, destination.y - unit.position.y);
      unit.position = { ...destination };
      unit.lastMovedDistance = moved;
      unit.fatigue = clamp(unit.fatigue + advance.cost * stats.fatigueCost * 0.72, 0, 100);
      unit.cohesion = clamp(unit.cohesion - advance.cost * 0.55, 0, 100);
      applyRiverCrossingPenalty(battle, unit, advance.path);
    }
    unit.plannedPosition = null;
    refreshEngagements(battle);
  });
  refreshEngagements(battle);
}

function refreshEngagements(battle) {
  battle.units.forEach((unit) => { unit.engagedWith = []; });
  battle.units.filter(activeForCombat).forEach((unit) => {
    battle.units.filter((other) => other.side !== unit.side && activeForCombat(other) && distance(unit.position, other.position) === 1)
      .forEach((other) => unit.engagedWith.push(other.id));
  });
}

function chargeReactionPhase(battle) {
  battle.units.filter((unit) => activeForCombat(unit) && unit.actionReadyThisPulse && unit.lastMovedDistance >= 3 && unit.abilities.includes("charge")).forEach((attacker) => {
    const target = getBattleUnit(battle, attacker.targetId) ?? attacker.engagedWith.map((id) => getBattleUnit(battle, id)).find(Boolean);
    if (!target || !activeForCombat(target) || distance(attacker.position, target.position) !== 1) return;
    const preview = getChargePreview(battle, attacker.id, target.id);
    if (!preview.charging) return;
    attacker.turnChargeBonus = preview.chargeBonus;
    if (preview.braced) {
      const defenderStats = getEffectiveStats(battle, target);
      applyDamage(battle, attacker, defenderStats.attack * 0.22 * preview.braceCounterMultiplier, 18 * preview.braceCounterMultiplier, `${target.name}の槍衾迎撃`, "charge_reaction", 1.35);
      attacker.turnChargeBonus *= 0.25;
      addLog(battle, "charge_reaction", `${attacker.name}の正面突撃は槍兵のBraceに阻まれました。`);
    } else {
      addLog(battle, "charge_reaction", `${attacker.name}が${DIRECTION_DAMAGE[preview.direction].name}から突撃態勢へ移行しました。`);
    }
  });
}

function linePoints(from, to) {
  const points = [];
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  for (let index = 1; index < steps; index += 1) {
    points.push({ x: Math.round(from.x + (to.x - from.x) * index / steps), y: Math.round(from.y + (to.y - from.y) * index / steps) });
  }
  return points;
}

export function hasLineOfSight(battle, from, to) {
  return linePoints(from, to).every((position) => {
    const tile = getBattleTile(battle, position);
    return tile && tile.terrainType !== "mountain" && !tile.status.some((status) => status.id === "earth_wall");
  });
}

function rangedPhase(battle) {
  battle.units.filter((unit) => activeForCombat(unit) && unit.actionReadyThisPulse && unit.rangedAttack > 0 && !unit.engagedWith.length).forEach((attacker) => {
    const target = getBattleUnit(battle, attacker.targetId) ?? chooseAiTarget(battle, attacker);
    if (!target || !activeForCombat(target)) return;
    const stats = getEffectiveStats(battle, attacker);
    const separation = distance(attacker.position, target.position);
    if (separation > stats.range || !hasLineOfSight(battle, attacker.position, target.position)) return;
    const density = clamp(target.soldierCount / 120, 0.45, 1.45);
    const targetTile = getBattleTile(battle, target.position);
    const hitChance = clamp(stats.rangedAccuracy * density * targetTile.visibilityModifier, 0.08, 0.94);
    if (nextRandom(battle) > hitChance) {
      addLog(battle, "ranged", `${attacker.name}の斉射は${target.name}を捉えられませんでした。`);
      return;
    }
    const defense = getEffectiveStats(battle, target).defense;
    const power = Math.max(3, stats.rangedAttack * 14 / Math.max(20, defense));
    applyDamage(battle, target, power, power * 0.95, `${attacker.name}の射撃`, "ranged");
    attacker.fatigue = clamp(attacker.fatigue + 2, 0, 100);
    attacker.actedThisTurn = true;
  });
}

function unitsInArea(battle, position, radius, side = null) {
  return battle.units.filter((unit) => onField(unit) && (!side || unit.side === side) && distance(unit.position, position) <= radius);
}

function magicEligibleUnits(battle, caster, skill, position) {
  const units = new Map();
  skill.effects.forEach((effect) => {
    const side = effect.target === "ally_area" ? caster.side : effect.target === "enemy_area" ? (caster.side === "player" ? "enemy" : "player") : null;
    if (!side) return;
    unitsInArea(battle, position, skill.radius, side).forEach((unit) => units.set(unit.id, unit));
  });
  return [...units.values()];
}

function validateMagicTarget(battle, caster, skillId, position) {
  const skill = assertDefinition(MAGIC_SKILLS, skillId, "魔法");
  const separation = distance(caster.position, position);
  if (separation > skill.range) throw new Error(`${skill.name}の射程外です（距離${separation} / 射程${skill.range}）`);
  const hasTileEffect = skill.effects.some((effect) => ["tile_status", "remove_tile_status"].includes(effect.type));
  const requiresUnitTarget = skill.effects.some((effect) => effect.target === "ally_area" || effect.target === "enemy_area");
  const affectedUnits = magicEligibleUnits(battle, caster, skill, position);
  if (requiresUnitTarget && !hasTileEffect && !affectedUnits.length) {
    const allyOnly = skill.effects.every((effect) => !effect.target || effect.target === "ally_area");
    throw new Error(`${skill.name}の範囲内に${allyOnly ? "味方" : "敵"}がいません`);
  }
  return { skill, separation, affectedUnits };
}

export function getMagicTargetTiles(battle, unitId, skillId) {
  const caster = getBattleUnit(battle, unitId);
  const skill = MAGIC_SKILLS[skillId];
  if (!caster || !skill || !caster.abilities.includes("magic")) return [];
  if (caster.availableMagicSkillIds && !caster.availableMagicSkillIds.includes(skillId)) return [];
  return battle.map.tiles.flatMap((tile) => {
    try {
      const preview = validateMagicTarget(battle, caster, skillId, tile.position);
      return [{
        position: { ...tile.position },
        distance: preview.separation,
        range: skill.range,
        affectedUnitIds: preview.affectedUnits.map((unit) => unit.id),
      }];
    } catch {
      return [];
    }
  });
}

function applyTileStatus(battle, position, definition) {
  const tile = getBattleTile(battle, position);
  if (!tile) return;
  const existing = tile.status.find((status) => status.id === definition.statusId);
  const nextStatus = {
    id: definition.statusId, duration: definition.duration ?? 1,
    defenseBonus: definition.defenseBonus ?? 0,
    movementCost: definition.movementCost,
    permanent: Boolean(definition.permanent),
  };
  if (existing) Object.assign(existing, nextStatus);
  else tile.status.push(nextStatus);
}

function applyMagicSkillMutable(battle, caster, skillId, position) {
  const skill = assertDefinition(MAGIC_SKILLS, skillId, "魔法");
  if (!caster.abilities.includes("magic")) throw new Error("魔術兵ではありません");
  if (caster.availableMagicSkillIds && !caster.availableMagicSkillIds.includes(skillId)) throw new Error("この魔法は装備していません");
  if (distance(caster.position, position) > skill.range) throw new Error("魔法の射程外です");
  const stats = getEffectiveStats(battle, caster);
  skill.effects.forEach((effect) => {
    if (effect.type === "tile_status") {
      battle.map.tiles.filter((tile) => distance(tile.position, position) <= skill.radius).forEach((tile) => applyTileStatus(battle, tile.position, effect));
      return;
    }
    const side = effect.target === "ally_area" ? caster.side : effect.target === "enemy_area" ? (caster.side === "player" ? "enemy" : "player") : null;
    unitsInArea(battle, position, skill.radius, side).forEach((target) => {
      if (effect.type === "unit_damage") {
        const tagBonus = target.tags.reduce((bonus, tag) => bonus * (effect.tagBonus?.[tag] ?? 1), 1);
        const equipmentBonus = target.equipmentIds.reduce((bonus, id) => bonus * (EQUIPMENT[id]?.modifiers.lightningTaken ?? 1), 1);
        const power = stats.magicPower * effect.powerScale * tagBonus * equipmentBonus;
        applyDamage(battle, target, power, stats.magicPower * effect.moraleScale, `${caster.name}の${skill.name}`, "magic");
      } else if (effect.type === "unit_status") {
        target.statusEffects = target.statusEffects.filter((status) => status.id !== effect.statusId);
        target.statusEffects.push({ id: effect.statusId, duration: effect.duration, modifiers: { ...effect.modifiers } });
      } else if (effect.type === "restore_soldiers") {
        const restored = Math.min(target.maxSoldierCount - target.soldierCount, Math.max(1, Math.round(stats.magicPower * effect.powerScale)));
        target.soldierCount += restored;
        target.hp = clamp(target.hp + restored * 0.35, 0, target.maxHp);
        addLog(battle, "magic", `${caster.name}の${skill.name}により${target.name}の負傷兵${restored}名が復帰しました。`);
      } else if (effect.type === "restore_morale") {
        const restored = Math.max(1, Math.round(stats.magicPower * effect.powerScale));
        target.morale = clamp(target.morale + restored, 0, 100);
        addLog(battle, "magic", `${caster.name}の${skill.name}により${target.name}の士気が${restored}回復しました。`);
      }
    });
  });
  const magicFatigue = modifierProduct(caster, "magicFatigue");
  caster.fatigue = clamp(caster.fatigue + skill.fatigue * magicFatigue, 0, 100);
  caster.actedThisTurn = true;
  battle.magicUsage ??= {};
  battle.magicUsage[skillId] = (battle.magicUsage[skillId] ?? 0) + 1;
  addLog(battle, "magic", `${caster.name}が${skill.name}を発動しました。`);
}

export function castMagicSkill(battle, unitId, skillId, position) {
  const next = structuredClone(battle);
  const caster = getBattleUnit(next, unitId);
  if (!caster || !getBattleTile(next, position)) throw new Error("魔法の使用者または対象が不正です");
  applyMagicSkillMutable(next, caster, skillId, position);
  return next;
}

export function getMagicSkillPreview(battle, unitId, skillId, position) {
  const caster = getBattleUnit(battle, unitId);
  if (!caster || !getBattleTile(battle, position)) throw new Error("魔法の使用者または対象が不正です");
  const { skill, separation, affectedUnits } = validateMagicTarget(battle, caster, skillId, position);
  const before = new Map(affectedUnits.map((unit) => [unit.id, structuredClone(unit)]));
  const simulated = castMagicSkill(battle, unitId, skillId, position);
  const effects = affectedUnits.map((unit) => {
    const previous = before.get(unit.id);
    const next = getBattleUnit(simulated, unit.id);
    return {
      id: unit.id,
      name: unit.name,
      side: unit.side,
      casualties: Math.max(0, previous.soldierCount - next.soldierCount),
      restored: Math.max(0, next.soldierCount - previous.soldierCount),
      moraleChange: Math.round(next.morale - previous.morale),
      addedStatuses: next.statusEffects.filter((status) => !previous.statusEffects.some((item) => item.id === status.id)).map((status) => status.id),
    };
  });
  const simulatedCaster = getBattleUnit(simulated, unitId);
  return {
    skillId,
    name: skill.name,
    position: { ...position },
    distance: separation,
    range: skill.range,
    radius: skill.radius,
    fatigueCost: Math.round((simulatedCaster.fatigue - caster.fatigue) * 10) / 10,
    fatigueAfter: Math.round(simulatedCaster.fatigue * 10) / 10,
    effects,
    createsTerrainEffect: skill.effects.some((effect) => effect.type === "tile_status"),
  };
}

function applyEngineerActionMutable(battle, engineer, actionId, position) {
  const action = assertDefinition(ENGINEER_ACTIONS, actionId, "工兵行動");
  if (!engineer.abilities.includes("engineering")) throw new Error("工兵ではありません");
  if (distance(engineer.position, position) > action.range) throw new Error("工兵行動の範囲外です");
  const tile = getBattleTile(battle, position);
  if (action.allowedTerrain && !action.allowedTerrain.includes(tile.terrainType)) throw new Error("この地形では実行できません");
  if (action.requiredStatus && !tile.status.some((status) => status.id === action.requiredStatus)) throw new Error("対象となる地形状態がありません");
  action.effects.forEach((effect) => {
    if (effect.type === "tile_status") applyTileStatus(battle, position, effect);
    if (effect.type === "remove_tile_status") tile.status = tile.status.filter((status) => status.id !== effect.statusId);
  });
  engineer.fatigue = clamp(engineer.fatigue + action.fatigue, 0, 100);
  engineer.actedThisTurn = true;
  addLog(battle, "movement", `${engineer.name}が${action.name}を実行しました。`);
}

export function applyEngineerAction(battle, unitId, actionId, position) {
  const next = structuredClone(battle);
  const engineer = getBattleUnit(next, unitId);
  if (!engineer || !getBattleTile(next, position)) throw new Error("工兵行動の使用者または対象が不正です");
  applyEngineerActionMutable(next, engineer, actionId, position);
  return next;
}

function magicAndEngineerPhase(battle) {
  battle.units.filter((unit) => activeForCombat(unit) && unit.actionReadyThisPulse && unit.plannedAction).forEach((unit) => {
    const { actionId, position } = unit.plannedAction;
    try {
      if (unit.abilities.includes("magic")) applyMagicSkillMutable(battle, unit, actionId, position);
      else if (unit.abilities.includes("engineering")) applyEngineerActionMutable(battle, unit, actionId, position);
    } catch (error) {
      addLog(battle, unit.abilities.includes("magic") ? "magic" : "movement", `${unit.name}：${error.message}`);
    }
    unit.plannedAction = null;
  });
}

function moveUnitAway(battle, attacker, defender) {
  const dx = Math.sign(defender.position.x - attacker.position.x);
  const dy = dx === 0 ? Math.sign(defender.position.y - attacker.position.y) : 0;
  const destination = { x: defender.position.x + dx, y: defender.position.y + dy };
  const open = unoccupiedPositionNear(battle, destination, defender.id);
  if (open) {
    defender.position = open;
    defender.cohesion = clamp(defender.cohesion - 8, 0, 100);
    addLog(battle, "melee", `${attacker.name}のPushで${defender.name}が後退しました。`);
  }
}

function meleeAttack(battle, attacker, defender) {
  if (!activeForCombat(attacker) || !activeForCombat(defender)) return;
  const attackerStats = getEffectiveStats(battle, attacker);
  const defenderStats = getEffectiveStats(battle, defender);
  const direction = getAttackDirection(attacker, defender);
  const directionBonus = DIRECTION_DAMAGE[direction];
  const chargePreview = getChargePreview(battle, attacker.id, defender.id);
  const power = Math.max(3, (attackerStats.attack + attacker.turnChargeBonus) * 15 / Math.max(20, defenderStats.defense) * chargePreview.attackMultiplier);
  const moraleDamage = power * 0.72 * directionBonus.morale + (attacker.turnChargeBonus > 0 ? 8 : 0);
  applyDamage(battle, defender, power, moraleDamage, `${attacker.name}の${directionBonus.name}攻撃`, "melee");
  attacker.fatigue = clamp(attacker.fatigue + 3.2 * attackerStats.fatigueCost, 0, 100);
  attacker.cohesion = clamp(attacker.cohesion - 2.5, 0, 100);
  attacker.actedThisTurn = true;
  if (attacker.abilities.includes("push") && activeForCombat(defender) && nextRandom(battle) < (UNIT_CLASSES[attacker.unitClassId].stats.pushPower ?? 0)) moveUnitAway(battle, attacker, defender);
}

function meleePhase(battle) {
  const attackers = battle.units.filter((unit) => activeForCombat(unit) && unit.actionReadyThisPulse).sort((a, b) => b.experience - a.experience);
  const attackedPairs = new Set();
  attackers.forEach((attacker) => {
    const adjacent = battle.units.filter((target) => target.side !== attacker.side && activeForCombat(target) && distance(attacker.position, target.position) === 1);
    const preferred = adjacent.find((target) => target.id === attacker.targetId) ?? adjacent[0];
    if (!preferred) return;
    const pair = [attacker.id, preferred.id].sort().join("|");
    if (attackedPairs.has(pair) && attacker.actedThisTurn) return;
    meleeAttack(battle, attacker, preferred);
    attackedPairs.add(pair);
  });
  refreshEngagements(battle);
}

export function getMoraleState(morale) {
  if (morale <= 0) return "ROUTED";
  if (morale < 20) return "BROKEN";
  if (morale < 40) return "WAVERING";
  if (morale < 70) return "SHAKEN";
  return "STABLE";
}

function moralePhase(battle) {
  battle.units.filter((unit) => onField(unit) && unit.actionReadyThisPulse).forEach((unit) => {
    if (unit.state === "ROUTED") return;
    const routedAllies = battle.units.filter((ally) => ally.side === unit.side && ally.id !== unit.id && ally.state === "ROUTED" && distance(ally.position, unit.position) <= 3).length;
    if (routedAllies) unit.morale = clamp(unit.morale - routedAllies * 7, 0, 100);
    if (unit.engagedWith.length >= 2) unit.morale = clamp(unit.morale - 5, 0, 100);
    unit.state = getMoraleState(unit.morale);
    if (unit.state === "ROUTED") {
      unit.order = "retreat";
      unit.targetId = null;
      unit.plannedPosition = null;
      unit.engagedWith = [];
      addLog(battle, "morale", `${unit.name}の組織が崩壊し、潰走を開始しました。`);
    }
  });
}

function routPhase(battle) {
  battle.units.filter((unit) => unit.state === "ROUTED" && onField(unit) && unit.actionReadyThisPulse).forEach((unit) => {
    const retreatX = unit.side === "player" ? 0 : battle.map.width - 1;
    if (unit.position.x === retreatX) {
      unit.state = "ESCAPED";
      addLog(battle, "rout", `${unit.name}は戦場外へ潰走しました。`);
      return;
    }
    const destination = stepToward(battle, unit, { x: retreatX, y: unit.position.y });
    unit.position = { ...destination };
    unit.facing = unit.side === "player" ? FACING.WEST : FACING.EAST;
    unit.fatigue = clamp(unit.fatigue + 7, 0, 100);
  });
}

function pursuitPhase(battle) {
  battle.units.filter((unit) => activeForCombat(unit) && unit.actionReadyThisPulse && unit.abilities.includes("pursuit")).forEach((pursuer) => {
    const target = nearestEnemy(battle, pursuer, (enemy) => enemy.state === "ROUTED");
    if (!target) return;
    const stats = getEffectiveStats(battle, pursuer);
    if (distance(pursuer.position, target.position) > Math.max(4, stats.movement)) return;
    const power = stats.attack * 0.28 * stats.pursuitPower;
    applyDamage(battle, target, power, 0, `${pursuer.name}の追撃`, "pursuit", 2.8 * stats.pursuitPower);
    const chasePosition = unoccupiedPositionNear(battle, {
      x: clamp(target.position.x + (pursuer.side === "player" ? -1 : 1), 0, battle.map.width - 1),
      y: target.position.y,
    }, pursuer.id);
    if (chasePosition) pursuer.position = { ...chasePosition };
    pursuer.fatigue = clamp(pursuer.fatigue + 7, 0, 100);
  });
}

function fatigueAndStatusPhase(battle) {
  const deliveryBudgets = new Map();
  const deliveryTotals = new Map();
  battle.units.filter((unit) => onField(unit) && unit.actionReadyThisPulse).forEach((unit) => {
    if (!unit.actedThisTurn && unit.lastMovedDistance === 0) unit.fatigue = clamp(unit.fatigue - 4, 0, 100);
    const tile = getBattleTile(battle, unit.position);
    if (tile?.status.some((status) => status.id === "burning")) applyDamage(battle, unit, 7, 5, "延焼", "fatigue_status");
    const previousLogisticsState = unit.logisticsState;
    const previousConnection = unit.logisticsConnected;
    const logisticsBefore = getLogisticsState(battle, unit);
    const consumption = getUnitSupplyConsumption(unit);
    unit.supply = clamp(unit.supply - consumption, 0, unit.maxSupply);
    let delivery = 0;
    if (logisticsBefore.connected && logisticsBefore.source) {
      const sourceKey = `${logisticsBefore.sourceType}:${logisticsBefore.source.id}`;
      const available = supplySourceStockpile(logisticsBefore.source, logisticsBefore.sourceType);
      const throughput = supplySourceThroughput(logisticsBefore.source, logisticsBefore.sourceType);
      const budget = deliveryBudgets.has(sourceKey) ? deliveryBudgets.get(sourceKey) : throughput;
      delivery = Math.min(logisticsBefore.replenishment, unit.maxSupply - unit.supply, available, budget);
      if (delivery > 0) {
        unit.supply = clamp(unit.supply + delivery, 0, unit.maxSupply);
        setSupplySourceStockpile(logisticsBefore.source, logisticsBefore.sourceType, available - delivery);
        deliveryBudgets.set(sourceKey, budget - delivery);
        const total = deliveryTotals.get(sourceKey) ?? {
          name: logisticsBefore.source.name,
          delivered: 0,
          source: logisticsBefore.source,
          sourceType: logisticsBefore.sourceType,
        };
        total.delivered += delivery;
        deliveryTotals.set(sourceKey, total);
      }
      unit.lastSupplySourceId = logisticsBefore.source.id;
    } else {
      unit.lastSupplySourceId = null;
    }
    unit.lastSupplyConsumption = Number(consumption.toFixed(1));
    unit.lastSupplyDelivery = Number(delivery.toFixed(1));
    const logisticsAfter = getLogisticsState(battle, unit);
    unit.logisticsState = logisticsAfter.id;
    unit.logisticsConnected = logisticsAfter.connected;
    if (previousLogisticsState !== logisticsAfter.id) {
      addLog(battle, "fatigue_status", `${unit.name}の兵站状態が「${logisticsAfter.name}」へ変化しました。`);
    }
    if (previousConnection !== false && !logisticsAfter.connected) {
      addLog(battle, "fatigue_status", `${unit.name}の補給路が断たれました。${logisticsAfter.reason}`);
    }
    if (logisticsAfter.id === "critical" && !logisticsAfter.connected) {
      unit.morale = clamp(unit.morale - 3, 0, 100);
      unit.cohesion = clamp(unit.cohesion - 3, 0, 100);
    }
    const fortificationEffects = getFortificationEffects(battle, unit);
    const moraleRecovery = fortificationEffects.active.reduce((sum, fortification) => {
      const definition = BATTLE_FORTIFICATION_TYPES[fortification.typeId];
      return sum + (definition.buffs.moraleRecovery ?? 0) * fortificationStrength(fortification, definition);
    }, 0);
    if (moraleRecovery > 0) unit.morale = clamp(unit.morale + moraleRecovery, 0, 100);
    unit.statusEffects = unit.statusEffects.map((status) => ({ ...status, duration: status.duration - 1 })).filter((status) => status.duration > 0);
    if (unit.actionReadyThisPulse) {
      unit.plannedPosition = null;
      unit.plannedAction = null;
      unit.targetId = null;
      unit.playerInstructions = {};
      unit.turnChargeBonus = 0;
    }
  });
  deliveryTotals.forEach(({ name, delivered, source, sourceType }) => {
    const remaining = supplySourceStockpile(source, sourceType);
    const maximum = supplySourceMaximum(source, sourceType);
    addLog(battle, "fatigue_status", `${name}から補給物資${Number(delivered.toFixed(1))}を輸送しました（備蓄 ${Number(remaining.toFixed(1))}/${maximum}）。`);
    if (remaining <= 0) addLog(battle, "fatigue_status", `${name}の補給備蓄が枯渇しました。`);
  });
  updateFortificationState(battle);
  battle.map.tiles.forEach((tile) => {
    tile.status = tile.status
      .map((status) => status.permanent ? status : { ...status, duration: status.duration - 1 })
      .filter((status) => status.permanent || status.duration > 0);
  });
}

export function updateFortificationState(battle) {
  (battle.fortifications ?? []).forEach((fortification) => {
    const definition = BATTLE_FORTIFICATION_TYPES[fortification.typeId];
    if (!definition || fortification.status === "RUINED") return;
    const enemySide = fortification.side === "player" ? "enemy" : "player";
    const encircled = fortification.typeId === "castle"
      && !hasSafeRetreatCorridor(battle, fortification.side, fortification.position, enemySide);
    fortification.encircled = encircled;
    if (encircled) {
      const before = fortification.baseDurability;
      fortification.encircledTurns += 1;
      fortification.baseDurability = Math.max(
        definition.minimumBaseDurability,
        fortification.baseDurability - definition.encirclementBaseLoss,
      );
      fortification.durability = Math.min(fortification.durability, fortification.baseDurability);
      const loss = before - fortification.baseDurability;
      if (loss > 0) {
        addLog(battle, "fatigue_status", `${fortification.name}は完全包囲により基礎耐久力が${loss}低下しました（${fortification.baseDurability}/${definition.maxBaseDurability}）。`);
      } else {
        addLog(battle, "fatigue_status", `${fortification.name}は完全包囲下で最低基礎耐久力に達しています。`);
      }
    } else {
      fortification.encircledTurns = 0;
    }
    fortification.status = fortification.durability <= 0
      ? "RUINED"
      : fortification.baseDurability / definition.maxBaseDurability <= 0.45 ? "BREACHED" : "ACTIVE";
  });
  return battle;
}

function resolveVictory(battle) {
  const playerStanding = battle.units.some((unit) => unit.side === "player" && activeForCombat(unit));
  const enemyStanding = battle.units.some((unit) => unit.side === "enemy" && activeForCombat(unit));
  if (playerStanding && enemyStanding) return;
  const isPersonalUnitBattle = battle.combatScale === "personal-units";
  battle.winner = playerStanding ? "player" : enemyStanding ? "enemy" : "draw";
  battle.outcome = {
    turn: battle.turn,
    playerRemaining: battle.units.filter((unit) => unit.side === "player").reduce((sum, unit) => sum + unit.soldierCount, 0),
    enemyRemaining: battle.units.filter((unit) => unit.side === "enemy").reduce((sum, unit) => sum + unit.soldierCount, 0),
  };
  const labels = battle.sideLabels ?? { player: "王国軍", enemy: "公国軍" };
  addLog(battle, "fatigue_status", battle.winner === "draw"
    ? (isPersonalUnitBattle ? "双方の全ユニットが戦闘継続能力を失いました。" : "両軍とも戦闘継続能力を失いました。")
    : `${labels[battle.winner]}が${isPersonalUnitBattle ? "個人ユニット戦に勝利しました" : "戦場を制圧しました"}。`);
}

const PHASE_SYSTEMS = Object.freeze({
  command: commandPhase,
  movement: movementPhase,
  charge_reaction: chargeReactionPhase,
  ranged: rangedPhase,
  magic: magicAndEngineerPhase,
  melee: meleePhase,
  morale: moralePhase,
  rout: routPhase,
  pursuit: pursuitPhase,
  fatigue_status: fatigueAndStatusPhase,
});

function actionAbilityScoreFor(unit) {
  return Number.isFinite(Number(unit.actionAbilityScore))
    ? Number(unit.actionAbilityScore)
    : clamp(Math.round(3 + Number(unit.experience ?? 35) * 0.2), 3, 18);
}

export function executeBattleTurn(battle) {
  const next = structuredClone(battle);
  if (next.winner) return next;
  next.actionTimingConfig = resolveActionTimingConfig(next.actionTimingConfig ?? {});
  next.actionTime = Number.isInteger(next.actionTime) ? next.actionTime : 0;
  next.units.forEach((unit) => {
    unit.nextActionAt = Number.isInteger(unit.nextActionAt) ? unit.nextActionAt : next.actionTime;
  });
  if (next.turn > 0) next.actionTime = nextActionTime(next.units.filter(activeForCombat), next.actionTime);
  next.turn += 1;
  for (const phase of BATTLE_PHASES) {
    next.phase = phase;
    PHASE_SYSTEMS[phase](next);
  }
  refreshEngagements(next);
  resolveVictory(next);
  next.units.filter((unit) => unit.actionReadyThisPulse).forEach((unit) => {
    const abilityScore = actionAbilityScoreFor(unit);
    unit.actionInterval = deriveActionInterval({
      actorType: unit.actionActorType,
      actorId: unit.id,
      abilityScore,
    }, next.actionTimingConfig);
    unit.lastActionAt = next.actionTime;
    unit.nextActionAt = next.actionTime + unit.actionInterval;
    unit.actionReadyThisPulse = false;
  });
  next.phase = next.winner ? "complete" : "command";
  return next;
}

export function setBattleActionTimingConfig(battle, overrides = {}) {
  const next = structuredClone(battle);
  next.actionTimingConfig = resolveActionTimingConfig({ ...(next.actionTimingConfig ?? {}), ...overrides });
  const currentTime = Number.isInteger(next.actionTime) ? next.actionTime : 0;
  next.units.forEach((unit) => {
    unit.actionInterval = deriveActionInterval({
      actorType: unit.actionActorType,
      actorId: unit.id,
      abilityScore: actionAbilityScoreFor(unit),
    }, next.actionTimingConfig);
    if (Number(unit.nextActionAt) > currentTime) unit.nextActionAt = currentTime + unit.actionInterval;
  });
  return next;
}

export function autoResolveBattle(battle, { maxTurns = 80 } = {}) {
  let next = structuredClone(battle);
  for (let index = 0; index < maxTurns && !next.winner; index += 1) next = executeBattleTurn(next);
  if (!next.winner) throw new Error(`${maxTurns}ターン以内に戦闘が決着しませんでした`);
  return next;
}

export function getBattleSummary(battle) {
  const side = (sideId) => {
    const units = battle.units.filter((unit) => unit.side === sideId);
    const depots = (battle.supplyNodes ?? []).filter((node) => node.side === sideId);
    const castles = (battle.fortifications ?? []).filter((fortification) => fortification.side === sideId && fortification.typeId === "castle");
    const stockpile = depots.reduce((sum, node) => sum + supplySourceStockpile(node, "depot"), 0)
      + castles.reduce((sum, castle) => sum + supplySourceStockpile(castle, "castle"), 0);
    const maxStockpile = depots.reduce((sum, node) => sum + supplySourceMaximum(node, "depot"), 0)
      + castles.reduce((sum, castle) => sum + supplySourceMaximum(castle, "castle"), 0);
    return {
      units: units.length,
      standing: units.filter(activeForCombat).length,
      routed: units.filter((unit) => unit.state === "ROUTED" || unit.state === "ESCAPED").length,
      soldiers: units.reduce((sum, unit) => sum + unit.soldierCount, 0),
      morale: Math.round(units.reduce((sum, unit) => sum + unit.morale, 0) / Math.max(1, units.length)),
      supply: Math.round(units.reduce((sum, unit) => sum + unit.supply / Math.max(1, unit.maxSupply) * 100, 0) / Math.max(1, units.length)),
      supplied: units.filter((unit) => getLogisticsState(battle, unit).connected).length,
      cutOff: units.filter((unit) => !getLogisticsState(battle, unit).connected).length,
      stockpile: Math.round(stockpile),
      maxStockpile: Math.round(maxStockpile),
    };
  };
  return { turn: battle.turn, actionTime: battle.actionTime ?? 0, phase: battle.phase, winner: battle.winner, player: side("player"), enemy: side("enemy") };
}

export const tacticalBattleInternals = Object.freeze({ distance, positionKey, activeForCombat });
