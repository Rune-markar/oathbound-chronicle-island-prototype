import { normalizeGeneratedWarForce, normalizeGeneratedWarFront } from "./generated-war-core.js";

export const V3_BATTLE_STRATEGY_VERSION = 1;

const clone = (value) => structuredClone(value);
const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));

export function bindV3BattleToStrategicWar(worldSimulation, playerNationId, preferredRegionId = null) {
  const wars = worldSimulation?.generatedWorld?.worldWars?.activeWars ?? [];
  const candidates = wars.filter((war) => [war.attackerNationId, war.defenderNationId].includes(playerNationId));
  if (!candidates.length) return null;
  const war = [...candidates].sort((left, right) => {
    const leftMatch = left.fronts?.some((front) => [front.originRegionId, front.targetRegionId].includes(preferredRegionId)) ? 1 : 0;
    const rightMatch = right.fronts?.some((front) => [front.originRegionId, front.targetRegionId].includes(preferredRegionId)) ? 1 : 0;
    return rightMatch - leftMatch || String(left.id).localeCompare(String(right.id));
  })[0];
  const playerSide = war.attackerNationId === playerNationId ? "attacker" : "defender";
  const enemyNationId = playerSide === "attacker" ? war.defenderNationId : war.attackerNationId;
  const fronts = war.fronts ?? [];
  const front = fronts.find((entry) => [entry.originRegionId, entry.targetRegionId].includes(preferredRegionId))
    ?? fronts.find((entry) => entry.targetRegionId === war.targetRegionId)
    ?? fronts[0]
    ?? null;
  return {
    schemaVersion: V3_BATTLE_STRATEGY_VERSION,
    warId: war.id,
    frontId: front?.id ?? null,
    playerSide,
    enemySide: playerSide === "attacker" ? "defender" : "attacker",
    playerNationId,
    enemyNationId,
    targetRegionId: front?.targetRegionId ?? war.targetRegionId ?? null,
    phase: war.phase,
  };
}

function updateForce(forceSource, casualties, moraleDelta) {
  const force = normalizeGeneratedWarForce(forceSource);
  const appliedCasualties = Math.min(force.strength, Math.max(0, Math.round(Number(casualties) || 0)));
  return {
    force: {
      ...force,
      strength: force.strength - appliedCasualties,
      casualties: force.casualties + appliedCasualties,
      morale: Math.round(clamp(force.morale + moraleDelta)),
    },
    appliedCasualties,
  };
}

export function applyV3BattleResultToWorldSimulation(runtime, source, mission, result) {
  if (!source || !mission || !result?.battleId) return { worldSimulation: source, applied: false, event: null };
  if (!["player", "enemy", "draw"].includes(result.winner)) throw new TypeError(`戦術結果の勝者が不正です: ${result.winner}`);
  const receipts = source.generatedWorld?.tacticalOutcomeReceipts ?? {};
  const recordedOutcomes = source.generatedWorld?.tacticalOutcomes ?? [];
  if (Object.hasOwn(receipts, result.battleId) || recordedOutcomes.some((entry) => entry.battleId === result.battleId)) {
    return { worldSimulation: source, applied: false, event: null };
  }
  const next = clone(source);
  const outcomes = next.generatedWorld.tacticalOutcomes ?? [];
  const strategic = mission.strategic
    ?? bindV3BattleToStrategicWar(next, mission.playerNation?.id, mission.target?.regionId);
  const victory = result.winner === "player";
  const draw = result.winner === "draw";
  const outcome = {
    schemaVersion: V3_BATTLE_STRATEGY_VERSION,
    id: `tactical-outcome:${result.battleId}`,
    battleId: result.battleId,
    missionId: mission.id,
    period: `${next.year}-${next.month}`,
    winner: result.winner,
    resultType: result.resultType,
    playerNationId: mission.playerNation?.id ?? strategic?.playerNationId ?? null,
    enemyNationId: mission.enemyNation?.id ?? strategic?.enemyNationId ?? null,
    warId: strategic?.warId ?? null,
    frontId: strategic?.frontId ?? null,
    friendlyCasualties: Math.max(0, Math.round(Number(result.player?.casualties) || 0)),
    enemyCasualties: Math.max(0, Math.round(Number(result.enemy?.casualties) || 0)),
  };
  next.generatedWorld.tacticalOutcomes = [...outcomes, outcome].slice(-96);
  next.generatedWorld.tacticalOutcomeReceipts = {
    ...(next.generatedWorld.tacticalOutcomeReceipts ?? {}),
    [result.battleId]: outcome.period,
  };
  if (!strategic) return { worldSimulation: next, applied: true, event: outcome };
  const worldWars = next.generatedWorld.worldWars;
  const war = worldWars?.activeWars?.find((entry) => entry.id === strategic.warId);
  if (!war) return { worldSimulation: next, applied: true, event: outcome };
  const playerMorale = victory ? 6 : draw ? 0 : -6;
  const enemyMorale = victory ? -6 : draw ? 0 : 6;
  const playerForce = updateForce(war[strategic.playerSide], outcome.friendlyCasualties, playerMorale);
  const enemyForce = updateForce(war[strategic.enemySide], outcome.enemyCasualties, enemyMorale);
  war[strategic.playerSide] = playerForce.force;
  war[strategic.enemySide] = enemyForce.force;
  const frontIndex = (war.fronts ?? []).findIndex((entry) => entry.id === strategic.frontId);
  const frontApplied = frontIndex >= 0;
  if (frontApplied) {
    const front = normalizeGeneratedWarFront(war.fronts[frontIndex], frontIndex);
    const attackerWon = strategic.playerSide === "attacker" ? victory : !victory && !draw;
    const defenderWon = strategic.playerSide === "defender" ? victory : !victory && !draw;
    const progressDelta = draw ? 0 : attackerWon ? 12 : defenderWon ? -10 : 0;
    front.progress = Math.round(clamp(front.progress + progressDelta));
    front.status = front.progress >= 100 ? "breached" : front.progress >= 65 ? "pressured" : front.progress >= 30 ? "contested" : "holding";
    const attackerLoss = strategic.playerSide === "attacker" ? playerForce.appliedCasualties : enemyForce.appliedCasualties;
    const defenderLoss = strategic.playerSide === "defender" ? playerForce.appliedCasualties : enemyForce.appliedCasualties;
    front.attackerLosses += attackerLoss;
    front.defenderLosses += defenderLoss;
    war.fronts[frontIndex] = front;
  }
  war.playerCommanded = true;
  const playerName = runtime?.nationById?.get(outcome.playerNationId)?.name ?? mission.playerNation?.name ?? "友軍";
  const enemyName = runtime?.nationById?.get(outcome.enemyNationId)?.name ?? mission.enemyNation?.name ?? "敵軍";
  const summary = `${playerName}の現地軍が${enemyName}と交戦し${victory ? "勝利" : draw ? "引き分け" : "敗北"}。味方損失${playerForce.appliedCasualties}、敵損失${enemyForce.appliedCasualties}を戦争戦力${frontApplied ? "と前線" : ""}へ反映した${frontApplied ? "" : "。旧正面は失効していたため前線進捗は変更していない"}。`;
  const warEvent = {
    id: `${war.id}:${outcome.period}:tactical:${result.battleId}`,
    worldWarId: war.id,
    type: "generated_world_war_tactical_result",
    period: outcome.period,
    nationId: outcome.playerNationId,
    targetNationId: outcome.enemyNationId,
    regionId: strategic.targetRegionId,
    title: `${mission.title}の戦果`,
    summary,
    tone: victory ? "positive" : draw ? "watch" : "danger",
    drivers: [
      { label: "味方損失", value: playerForce.appliedCasualties },
      { label: "敵損失", value: enemyForce.appliedCasualties },
    ],
    battleId: result.battleId,
    frontId: strategic.frontId,
    frontApplied,
  };
  worldWars.events = [...(worldWars.events ?? []).filter((entry) => entry.id !== warEvent.id), warEvent].slice(-192);
  war.log = [...(war.log ?? []), { id: warEvent.id, period: outcome.period, phase: "tactical", summary }].slice(-24);
  const geopolitics = next.generatedWorld.geopolitics?.nationStates ?? {};
  const playerCondition = geopolitics[outcome.playerNationId];
  const enemyCondition = geopolitics[outcome.enemyNationId];
  if (playerCondition) playerCondition.readiness = Math.round(clamp(playerCondition.readiness - Math.max(1, playerForce.appliedCasualties / 55)));
  if (enemyCondition) enemyCondition.readiness = Math.round(clamp(enemyCondition.readiness - Math.max(1, enemyForce.appliedCasualties / 55)));
  return { worldSimulation: next, applied: true, event: warEvent };
}
