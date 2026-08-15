import { CRIME_OUTCOMES, CRIME_RISK_LABELS, normalizeCrimeState, recordCrimeIncident } from "./crime-system.js";
import {
  createBattleMap,
  createBattleState,
  createCombatUnit,
  createCommander,
  setBattleTerrain,
} from "./tactical-battle.js";


function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function travelContext(context = {}) {
  const origin = context.origin ?? context.from;
  const destination = context.destination ?? context.to;
  if (!origin?.id || !destination?.id) throw new TypeError("強盗機会には出発地と目的地が必要です");
  return { origin, destination, travel: context.travel ?? {} };
}

function unitClassForRole(role = "") {
  if (/治療|僧侶|神官|術|魔/.test(role)) return "mage";
  if (/弓|斥候|射/.test(role)) return "archer";
  if (/騎/.test(role)) return "light_cavalry";
  if (/槍/.test(role)) return "spearman";
  return "infantry";
}

function robberyParticipants(state, active) {
  const life = state.player?.villageLife;
  const playerMaxHp = Math.max(1, Number(life?.maxHp) || 100);
  const requestedIds = new Set((active.accomplices ?? []).map((entry) => entry.id ?? entry.memberId).filter(Boolean));
  const party = (life?.party ?? []).filter((member) => (
    member.active !== false
    && member.alive !== false
    && (requestedIds.size === 0 || requestedIds.has(member.id))
  ));
  return [
    {
      id: state.player?.id ?? "player",
      name: state.player?.name ?? "主人公",
      role: state.player?.title ?? state.player?.specialty ?? "冒険者",
      hp: Math.max(0, Number.isFinite(Number(life?.hp)) ? Number(life.hp) : playerMaxHp),
      maxHp: playerMaxHp,
      player: true,
    },
    ...party.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role ?? "冒険者",
      hp: Math.max(0, Number(member.hp) || 0),
      maxHp: Math.max(1, Number(member.maxHp) || 48),
      player: false,
    })),
  ];
}

function buildRobberyBattle(state, active, seed) {
  const map = createBattleMap({ width: 8, height: 6, terrainType: "plain" });
  for (let x = 0; x < map.width; x += 1) setBattleTerrain(map, { x, y: 3 }, "road");
  const commanders = [
    createCommander({ id: "robbery-player", name: "襲撃側", side: "player", position: { x: 0, y: 3 } }),
    createCommander({ id: "robbery-caravan", name: "隊商護衛", side: "enemy", position: { x: 7, y: 3 } }),
  ];
  const positions = [{ x: 1, y: 3 }, { x: 1, y: 1 }, { x: 1, y: 5 }, { x: 2, y: 2 }];
  const playerUnits = robberyParticipants(state, active).map((member, index) => createCombatUnit({
    id: `unit:${active.id}:player:${member.id}`,
    name: member.name,
    side: "player",
    commanderId: "robbery-player",
    soldierCount: 1,
    maxSoldierCount: 1,
    hp: member.hp,
    maxHp: member.maxHp,
    position: positions[index] ?? { x: 2, y: index % map.height },
    unitClassId: unitClassForRole(member.role),
    tags: ["PERSONAL_COMBATANT", member.player ? "PLAYER_CHARACTER" : "PARTY_MEMBER", `MEMBER_ID:${member.id}`, ...(member.player ? [] : [`PARTY_ID:${member.id}`])],
    actionActorType: member.player ? "local_player" : "ai",
  }));
  const units = [
    ...playerUnits,
    createCombatUnit({ id: "caravan-guard", name: "隊商護衛", side: "enemy", commanderId: "robbery-caravan", soldierCount: Math.max(1, active.target.guardCount), maxSoldierCount: Math.max(1, active.target.guardCount), position: { x: 6, y: 3 }, unitClassId: "infantry" }),
  ];
  const battle = createBattleState({ id: active.battleId, name: `${active.target.name}襲撃`, map, commanders, units, seed });
  battle.combatScale = "personal-units";
  battle.sideLabels = { player: "襲撃者", enemy: "隊商護衛" };
  return battle;
}

function persistParticipantResult(next, active, battleResult) {
  const life = next.player?.villageLife;
  const allowed = new Set(active.participantIds ?? []);
  const members = battleResult.player?.members ?? [];
  for (const memberResult of members) {
    const memberId = memberResult.tags?.find((tag) => tag.startsWith("MEMBER_ID:"))?.slice("MEMBER_ID:".length);
    if (!memberId || !allowed.has(memberId)) continue;
    const remainingHp = Math.max(0, Number(memberResult.remainingHp) || 0);
    const maxHp = Math.max(1, Number(memberResult.maxHp) || 1);
    const alive = memberResult.state !== "DESTROYED" && remainingHp > 0;
    if (memberResult.tags?.includes("PLAYER_CHARACTER")) {
      if (!life || memberId !== (next.player.id ?? "player")) continue;
      life.maxHp = Math.max(1, Number(life.maxHp) || maxHp);
      life.hp = Math.min(life.maxHp, remainingHp);
      life.injuries ??= [];
      if (life.hp < life.maxHp && !life.injuries.some((entry) => String(entry).startsWith("戦闘負傷"))) {
        life.injuries.push(`戦闘負傷（${life.hp <= 0 ? "瀕死" : life.hp < 35 ? "重傷" : "軽傷"}）`);
      }
      continue;
    }
    const updateParty = (party) => {
      const member = party?.find((entry) => entry.id === memberId);
      if (!member) return;
      member.maxHp = maxHp;
      member.hp = Math.min(maxHp, remainingHp);
      member.battleState = memberResult.state;
      member.lastBattleOutcome = battleResult.winner;
      member.alive = alive;
      if (!alive) member.active = false;
    };
    updateParty(life?.party);
    updateParty(next.adventure?.party);
  }
}

function finishRobbery(state, active, outcome, detected, casualtyRecord = null) {
  const successful = outcome === "success_hidden" || outcome === "success_exposed";
  let next = recordCrimeIncident(state, {
    id: active.incidentId,
    type: "robbery",
    severity: "serious",
    perpetrator: { id: state.player.id ?? "player", name: state.player.name ?? "主人公" },
    accomplices: active.accomplices,
    victim: active.target,
    target: active.target,
    jurisdiction: { id: active.jurisdictionId, name: active.jurisdictionName },
    reward: successful ? active.loot : null,
    outcome,
    detected,
    historyText: successful ? `${active.target.name}から荷を奪った。` : `${active.target.name}の襲撃に失敗した。`,
  });
  next.player.metrics ??= {};
  next.player.metrics.wealth = Number(next.player.metrics.wealth) || 0;
  if (successful) {
    next.player.metrics.wealth += active.loot.wealth;
    next.player.crime.illegalGain += active.loot.wealth;
  }
  next.player.crime.robberyResults.unshift({
    incidentId: active.incidentId,
    opportunityId: active.opportunityId,
    battleId: active.battleId,
    outcome,
    detected,
    loot: successful ? structuredClone(active.loot) : null,
    casualties: casualtyRecord,
    turn: next.turn ?? 0,
  });
  next.player.crime.activeRobbery = null;
  return { state: next, result: { incidentId: active.incidentId, outcome, detected, loot: successful ? structuredClone(active.loot) : null } };
}

export function getRobberyOpportunities(state, context = {}) {
  const { origin, destination, travel } = travelContext(context);
  const seed = state.generatedWorld?.seed ?? state.worldSeed ?? "road";
  const routeKey = `${origin.id}:${destination.id}:${travel.mode ?? "route"}`;
  const roll = hashString(`${seed}:${routeKey}`);
  const kinds = [
    { id: "merchant-caravan", name: `${origin.name ?? origin.id}商人の隊商`, wealth: 5, guardCount: 2, risk: 1 },
    { id: "tax-wagon", name: `${destination.name ?? destination.id}行きの徴税荷車`, wealth: 8, guardCount: 3, risk: 2 },
  ];
  return kinds.map((entry, index) => ({
    id: `robbery:${origin.id}:${destination.id}:${entry.id}`,
    type: "robbery",
    origin: structuredClone(origin),
    destination: structuredClone(destination),
    jurisdictionId: destination.id,
    jurisdictionName: destination.name ?? destination.id,
    target: { id: `caravan:${routeKey}:${entry.id}`, name: entry.name, kind: "caravan", guardCount: entry.guardCount + ((roll + index) % 2) },
    loot: { wealth: entry.wealth, text: `財産+${entry.wealth}` },
    baseRiskLevel: entry.risk,
    riskLabel: CRIME_RISK_LABELS[entry.risk],
    preparationRequirements: ["退路を確認する", "隊商の護衛数を見極める"],
    maximumPenalty: "拘束、略奪品没収、強盗罪の処罰",
  }));
}

export function previewRobbery(state, opportunity) {
  if (!opportunity?.id || opportunity.type !== "robbery") throw new TypeError("強盗機会が必要です");
  const heat = Number(state.player?.crime?.heatByJurisdiction?.[opportunity.jurisdictionId]) || 0;
  const riskLevel = Math.min(3, opportunity.baseRiskLevel + (heat >= 40 ? 1 : 0));
  return {
    opportunityId: opportunity.id,
    targetId: opportunity.target.id,
    targetName: opportunity.target.name,
    riskLevel,
    riskLabel: CRIME_RISK_LABELS[riskLevel],
    expectedReward: structuredClone(opportunity.loot),
    preparationRequirements: [...opportunity.preparationRequirements],
    maximumPenalty: opportunity.maximumPenalty,
  };
}

export function startRobbery(state, opportunity, options = {}) {
  const next = normalizeCrimeState(state);
  if (next.player.crime.activeRobbery) throw new Error("進行中の強盗があります");
  next.player.crime.activeRobbery = {
    id: `active:${opportunity.id}:${next.turn ?? 0}`,
    opportunityId: opportunity.id,
    incidentId: `robbery:${next.turn ?? 0}:${next.player.crime.incidents.length + 1}:${opportunity.target.id}`,
    battleId: `robbery-battle:${opportunity.target.id}:${next.turn ?? 0}`,
    stage: "threat",
    target: structuredClone(opportunity.target),
    loot: structuredClone(opportunity.loot),
    jurisdictionId: opportunity.jurisdictionId,
    jurisdictionName: opportunity.jurisdictionName,
    accomplices: structuredClone(options.accomplices ?? []),
  };
  return next;
}

export function resolveRobberyThreat(state, options = {}) {
  const next = normalizeCrimeState(state);
  const active = next.player.crime.activeRobbery;
  if (!active || active.stage !== "threat") throw new Error("威圧中の強盗がありません");
  const outcome = options.outcome ?? ((hashString(`${next.generatedWorld?.seed ?? "road"}:${active.id}`) % 100) < 45 ? "yield" : "resist");
  if (outcome === "yield") {
    const finished = finishRobbery(next, active, options.detected ? "success_exposed" : "success_hidden", Boolean(options.detected));
    finished.result.battle = null;
    return finished;
  }
  if (outcome !== "resist") throw new RangeError("威圧結果が不正です");
  active.stage = "battle";
  const battle = buildRobberyBattle(next, active, hashString(`${next.generatedWorld?.seed ?? "road"}:${active.battleId}`));
  active.participantIds = battle.units
    .filter((unit) => unit.side === "player")
    .map((unit) => unit.tags.find((tag) => tag.startsWith("MEMBER_ID:"))?.slice("MEMBER_ID:".length))
    .filter(Boolean);
  return { state: next, result: { outcome: "resist", battle } };
}

export function resolveRobberyBattle(state, battleResult, options = {}) {
  const normalized = normalizeCrimeState(state);
  const active = normalized.player.crime.activeRobbery;
  if (!active || active.stage !== "battle") throw new Error("解決待ちの強盗戦闘がありません");
  if (battleResult?.battleId !== active.battleId || !battleResult.winner) throw new Error("強盗戦闘の結果が不正です");
  const successful = battleResult.winner === "player";
  const detected = Boolean(options.detected);
  const outcome = successful ? (detected ? "success_exposed" : "success_hidden") : (options.captured ? "captured" : "failed_escaped");
  const casualties = {
    player: Number(battleResult.player?.casualties) || 0,
    target: Number(battleResult.enemy?.casualties) || 0,
  };
  const finished = finishRobbery(normalized, active, outcome, detected || outcome === "captured", casualties);
  persistParticipantResult(finished.state, active, battleResult);
  finished.state.player.crime.robberyResults[0].participants = {
    player: structuredClone(battleResult.player?.members ?? []),
    target: structuredClone(battleResult.enemy?.members ?? []),
  };
  finished.result.casualties = casualties;
  return finished;
}
