import { TACTICAL_FORMATIONS, UNIT_CLASSES } from "./tactical-data.js";
import {
  applyBattleFormation,
  createCommander,
  getBattleTile,
  getBattleUnit,
  isBattleTilePassable,
} from "./tactical-battle.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const positionKey = ({ x, y }) => `${x},${y}`;

const CLASS_DAILY_SUPPLY = Object.freeze({
  infantry: 1,
  spearman: 1.05,
  heavy_infantry: 1.2,
  cavalry: 1.65,
  light_cavalry: 1.45,
  archer: 1.05,
  mage: 1.25,
  engineer: 1.15,
});

export const BATTLE_LOGISTICS_PLANS = Object.freeze({
  rapid: Object.freeze({
    id: "rapid",
    name: "軽量輜重",
    rationUnits: 5500,
    wagonColumns: 6,
    nodeRange: 6,
    replenish: 6,
    nodeStockpile: 220,
    throughput: 24,
    unitSupply: 72,
    description: "速度を優先し、短期決戦分だけを携行する。補給線切断への余裕は小さい。",
  }),
  standard: Object.freeze({
    id: "standard",
    name: "標準兵站",
    rationUnits: 11000,
    wagonColumns: 12,
    nodeRange: 7,
    replenish: 9,
    nodeStockpile: 360,
    throughput: 34,
    unitSupply: 100,
    description: "行軍速度と予備糧秣を両立する、軍団の標準的な輸送計画。",
  }),
  extended: Object.freeze({
    id: "extended",
    name: "長期戦備",
    rationUnits: 20000,
    wagonColumns: 22,
    nodeRange: 8,
    replenish: 12,
    nodeStockpile: 620,
    throughput: 48,
    unitSupply: 138,
    description: "包囲戦も見込む大規模輜重。長期継戦に強いが輸送隊が膨らむ。",
  }),
});

function normalizeRosterEntry(entry) {
  if (!entry?.id || !entry?.name) throw new Error("参加候補にはidとnameが必要です");
  return {
    id: entry.id,
    name: entry.name,
    portrait: entry.portrait ?? entry.name.slice(0, 1),
    portraitImage: entry.portraitImage ?? null,
    role: entry.role ?? "将校",
    rank: entry.rank ?? "将校",
    policy: entry.policy ?? "",
    traits: [...(entry.traits ?? [])],
    stats: {
      leadership: clamp(Math.round(entry.stats?.leadership ?? 50), 0, 100),
      war: clamp(Math.round(entry.stats?.war ?? 50), 0, 100),
      intelligence: clamp(Math.round(entry.stats?.intelligence ?? 50), 0, 100),
      charisma: clamp(Math.round(entry.stats?.charisma ?? 50), 0, 100),
    },
    stamina: clamp(Math.round(entry.stamina ?? 100), 0, 100),
    assignment: entry.assignment ?? null,
    available: entry.available !== false,
  };
}

function applyAutomaticFormation(preparation) {
  const next = structuredClone(preparation);
  next.battle = applyBattleFormation(next.battle, "player", next.formationId);
  next.selectedUnitId = null;
  return next;
}

export function createBattlePreparation({ battle, roster = [], defaultParticipantIds = [] } = {}) {
  if (!battle?.map || battle.turn !== 0) throw new Error("戦闘前編成には未開始の戦闘データが必要です");
  const normalizedRoster = roster.map(normalizeRosterEntry);
  const availableIds = new Set(normalizedRoster.filter((entry) => entry.available).map((entry) => entry.id));
  let selectedCharacterIds = [...new Set(defaultParticipantIds)].filter((id) => availableIds.has(id)).slice(0, 3);
  if (!selectedCharacterIds.length && availableIds.size) selectedCharacterIds = [[...availableIds][0]];
  const preparation = {
    version: 1,
    battle: structuredClone(battle),
    roster: normalizedRoster,
    selectedCharacterIds,
    formationId: "line",
    placementMode: "auto",
    logisticsPlanId: "standard",
    selectedUnitId: null,
  };
  return applyAutomaticFormation(preparation);
}

export function toggleBattleParticipant(preparation, characterId, maximumParticipants = 3) {
  const next = structuredClone(preparation);
  const participant = next.roster.find((entry) => entry.id === characterId);
  if (!participant) throw new Error("参加候補が存在しません");
  if (!participant.available) throw new Error("この人物は現在の軍務に参加できません");
  const selected = next.selectedCharacterIds.includes(characterId);
  if (selected) {
    next.selectedCharacterIds = next.selectedCharacterIds.filter((id) => id !== characterId);
  } else {
    if (next.selectedCharacterIds.length >= maximumParticipants) throw new Error(`参加人物は最大${maximumParticipants}名です`);
    next.selectedCharacterIds.push(characterId);
  }
  return next;
}

export function setBattlePreparationFormation(preparation, formationId) {
  if (!TACTICAL_FORMATIONS[formationId]) throw new Error("陣形が不明です");
  const next = structuredClone(preparation);
  next.formationId = formationId;
  next.battle.formations.player = formationId;
  return next.placementMode === "auto" ? applyAutomaticFormation(next) : next;
}

export function setBattlePlacementMode(preparation, placementMode) {
  if (!["auto", "manual"].includes(placementMode)) throw new Error("配置方式が不明です");
  const next = structuredClone(preparation);
  next.placementMode = placementMode;
  next.selectedUnitId = null;
  return placementMode === "auto" ? applyAutomaticFormation(next) : next;
}

export function selectBattlePreparationUnit(preparation, unitId) {
  const unit = getBattleUnit(preparation.battle, unitId);
  if (!unit || unit.side !== "player") throw new Error("配置する自軍部隊を選択してください");
  const next = structuredClone(preparation);
  next.selectedUnitId = next.selectedUnitId === unitId ? null : unitId;
  return next;
}

export function placeBattlePreparationUnit(preparation, unitId, position) {
  if (preparation.placementMode !== "manual") throw new Error("手動配置を選択してください");
  if (!Number.isInteger(position?.x) || !Number.isInteger(position?.y)) throw new Error("配置先が不正です");
  if (position.x < 2 || position.x > 8) throw new Error("自軍展開区域のマスを指定してください");
  const next = structuredClone(preparation);
  const unit = getBattleUnit(next.battle, unitId);
  if (!unit || unit.side !== "player") throw new Error("配置する自軍部隊が存在しません");
  if (!getBattleTile(next.battle, position) || !isBattleTilePassable(next.battle, position, unit)) {
    throw new Error("この地形には配置できません");
  }
  const occupiedByUnit = next.battle.units.some((other) => other.id !== unit.id && positionKey(other.position) === positionKey(position));
  const occupiedByFortification = (next.battle.fortifications ?? []).some((fortification) => positionKey(fortification.position) === positionKey(position));
  if (occupiedByUnit || occupiedByFortification) throw new Error("このマスはすでに使用されています");
  unit.position = { ...position };
  unit.plannedPosition = null;
  unit.targetId = null;
  next.selectedUnitId = null;
  return next;
}

export function setBattleLogisticsPlan(preparation, logisticsPlanId) {
  if (!BATTLE_LOGISTICS_PLANS[logisticsPlanId]) throw new Error("兵站計画が不明です");
  const next = structuredClone(preparation);
  next.logisticsPlanId = logisticsPlanId;
  return next;
}

export function getBattlePreparationSummary(preparation) {
  const units = preparation.battle.units.filter((unit) => unit.side === "player" && unit.soldierCount > 0);
  const soldiers = units.reduce((sum, unit) => sum + unit.soldierCount, 0);
  const troopDemand = units.reduce((sum, unit) => sum + unit.soldierCount * (CLASS_DAILY_SUPPLY[unit.unitClassId] ?? 1), 0);
  const headquartersDemand = 35 + preparation.selectedCharacterIds.length * 6;
  const dailyDemand = Math.max(1, Math.ceil(troopDemand + headquartersDemand));
  const plan = BATTLE_LOGISTICS_PLANS[preparation.logisticsPlanId] ?? BATTLE_LOGISTICS_PLANS.standard;
  const sustainableDays = Math.max(1, Math.floor(plan.rationUnits / dailyDemand));
  return {
    soldiers,
    units: units.length,
    characters: preparation.selectedCharacterIds.length,
    dailyDemand,
    sustainableDays,
    rationUnits: plan.rationUnits,
    wagonColumns: plan.wagonColumns,
    plan,
  };
}

function commanderPositions(battle, count) {
  const centerY = Math.floor(battle.map.height / 2);
  const yOffsets = [0, -3, 3, -5, 5, -1, 1];
  const occupied = new Set([
    ...battle.units.filter((unit) => unit.side === "player").map((unit) => positionKey(unit.position)),
    ...(battle.fortifications ?? []).map((fortification) => positionKey(fortification.position)),
  ]);
  const positions = [];
  for (const x of [2, 1, 3]) {
    for (const offset of yOffsets) {
      const position = { x, y: clamp(centerY + offset, 0, battle.map.height - 1) };
      const key = positionKey(position);
      if (occupied.has(key) || !isBattleTilePassable(battle, position)) continue;
      positions.push(position);
      occupied.add(key);
      if (positions.length === count) return positions;
    }
  }
  if (positions.length < count) throw new Error("選択した指揮官の配置場所を確保できません");
  return positions;
}

export function finalizeBattlePreparation(preparation) {
  if (!preparation.selectedCharacterIds.length) throw new Error("戦闘に参加する人物を1名以上選択してください");
  const battle = structuredClone(preparation.battle);
  const selected = preparation.selectedCharacterIds.map((id) => preparation.roster.find((entry) => entry.id === id)).filter(Boolean);
  if (selected.length !== preparation.selectedCharacterIds.length) throw new Error("選択した参加人物のデータが不足しています");
  const positions = commanderPositions(battle, selected.length);
  battle.commanders = battle.commanders.filter((commander) => commander.side !== "player");
  const commanders = selected.map((participant, index) => createCommander({
    id: `cmd-character-${participant.id}`,
    name: participant.name,
    iconUrl: participant.portraitImage,
    side: "player",
    position: positions[index],
    leadership: participant.stats.leadership,
    tactics: Math.round((participant.stats.war + participant.stats.intelligence) / 2),
    bravery: participant.stats.war,
    magic: Math.round(participant.stats.intelligence * 0.65),
    commandRange: clamp(7 + Math.round(participant.stats.leadership / 25), 8, 11),
    commandSpeed: participant.stats.war >= 70 ? 4 : 3,
    traits: participant.traits.length ? participant.traits : [participant.role],
  }));
  battle.commanders.push(...commanders);
  battle.units.filter((unit) => unit.side === "player").forEach((unit, index) => {
    unit.commanderId = commanders[index % commanders.length].id;
  });

  const summary = getBattlePreparationSummary(preparation);
  const plan = summary.plan;
  const playerSupplyNode = (battle.supplyNodes ?? []).find((node) => node.side === "player");
  if (playerSupplyNode) {
    playerSupplyNode.range = plan.nodeRange;
    playerSupplyNode.replenish = plan.replenish;
    playerSupplyNode.maxStockpile = plan.nodeStockpile;
    playerSupplyNode.stockpile = plan.nodeStockpile;
    playerSupplyNode.throughput = plan.throughput;
    playerSupplyNode.name = `王国軍補給所・${plan.name}`;
  }
  battle.units.filter((unit) => unit.side === "player").forEach((unit) => {
    unit.maxSupply = plan.unitSupply;
    unit.supply = plan.unitSupply;
    unit.logisticsState = "supplied";
  });
  battle.preparation = {
    finalized: true,
    participantIds: [...preparation.selectedCharacterIds],
    participantNames: selected.map((participant) => participant.name),
    formationId: preparation.formationId,
    placementMode: preparation.placementMode,
    logisticsPlanId: plan.id,
    sustainableDays: summary.sustainableDays,
    dailyDemand: summary.dailyDemand,
    rationUnits: summary.rationUnits,
    soldiers: summary.soldiers,
  };
  battle.log.push({
    turn: 0,
    phase: "command",
    message: `${selected.map((participant) => participant.name).join("・")}が参陣。${TACTICAL_FORMATIONS[preparation.formationId].name}・${plan.name}（継戦約${summary.sustainableDays}日）で戦闘を開始します。`,
  });
  return battle;
}

export function getPreparationUnitLabel(preparation, unitId) {
  const unit = getBattleUnit(preparation.battle, unitId);
  const unitClass = unit ? UNIT_CLASSES[unit.unitClassId] : null;
  return unit && unitClass ? `${unit.name} · ${unitClass.name} ${unit.soldierCount}名` : "部隊不明";
}
