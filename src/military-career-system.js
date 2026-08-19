import { buildGeneratedWorld, getGeneratedExpeditionReachableRegions } from "./generated-world-system.js";
import {
  createBattleMap,
  createBattleState,
  createCombatUnit,
  createCommander,
  setBattleTerrain,
} from "./tactical-battle.js";
import {
  createNationalArmyUnitSpecs,
  getNationalArmySummary,
  getNationalUnitProfile,
} from "./national-unit-system.js";

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const MILITARY_MISSION_APPROACHES = Object.freeze({
  scout: Object.freeze({ id: "scout", name: "偵察を重ねる", description: "敵戦力を減らし、期限までの余裕を一部使う。", enemyMultiplier: 0.78, playerBonus: 0 }),
  rapid: Object.freeze({ id: "rapid", name: "速攻を仕掛ける", description: "準備費を抑えるが、敵戦力を十分に削れない。", enemyMultiplier: 1.08, playerBonus: 2 }),
  defensive: Object.freeze({ id: "defensive", name: "守勢から誘い込む", description: "自軍の生存性を上げるが、決着後の評価は控えめになる。", enemyMultiplier: 0.92, playerBonus: 5 }),
});

export const MILITARY_MISSION_LOGISTICS = Object.freeze({
  lean: Object.freeze({ id: "lean", name: "軽装", wealthCost: 1, foodCost: 2, strengthBonus: 0, supply: 58 }),
  standard: Object.freeze({ id: "standard", name: "標準支給", wealthCost: 2, foodCost: 4, strengthBonus: 5, supply: 82 }),
  reinforced: Object.freeze({ id: "reinforced", name: "増強輸送", wealthCost: 4, foodCost: 8, strengthBonus: 12, supply: 100 }),
});

function ensureMilitaryCareer(player) {
  player.militaryCareer ??= { schemaVersion: 1, activeMission: null, history: [] };
  player.militaryCareer.schemaVersion = 1;
  player.militaryCareer.history = [...(player.militaryCareer.history ?? [])];
  player.militaryCareer.activeMission ??= null;
  return player.militaryCareer;
}

export function normalizeMilitaryCareerState(state) {
  if (state?.player) ensureMilitaryCareer(state.player);
  return state;
}

function regionRecord(state, regionId) {
  if (state.scenarioMode === "generated") {
    const runtime = buildGeneratedWorld(state);
    const region = runtime.nations.regions.find((entry) => entry.id === regionId);
    if (region) return {
      id: region.id,
      name: region.name,
      nationId: region.nationId,
      dominantTerrain: region.dominantTerrain,
      dominantRelief: region.dominantRelief,
      markerIndex: region.markerIndex,
    };
  }
  const names = { orta: "東境州", nereia: "ネレイア" };
  return { id: regionId, name: names[regionId] ?? regionId, nationId: state.player?.affiliation?.nationId ?? null };
}

function missionTarget(state) {
  if (state.scenarioMode === "generated") {
    const candidates = getGeneratedExpeditionReachableRegions(state);
    if (!candidates.length) throw new Error("軍務対象にできる隣接地域がありません");
    const seed = String(state.generatedWorld?.seed ?? "military");
    const offset = [...seed].reduce((sum, character) => sum + character.codePointAt(0), 0) % candidates.length;
    return regionRecord(state, candidates[offset].regionId);
  }
  return regionRecord(state, state.player?.locationId === "nereia" ? "orta" : "nereia");
}

function missionDefinition(stage) {
  if (stage === "retainer") return {
    kind: "retainer_suppression",
    title: "街道襲撃団の討伐",
    politicalReason: "主君は街道を襲う武装集団から住民と徴税路を守る必要がある。",
    objective: "敵戦力を排除し、受命地点へ帰還して戦果を報告する。",
    baseEnemyStrength: 18,
    promotionActionId: "fulfill_order",
  };
  if (stage === "commander") return {
    kind: "commander_relief",
    title: "辺境守備隊の救援",
    politicalReason: "主君は孤立した辺境守備隊を失えば、周辺豪族と隣国への威信を失う。",
    objective: "救援軍を率いて敵主力を退け、許容損害内で帰還する。",
    baseEnemyStrength: 86,
    promotionActionId: "command_campaign",
  };
  throw new Error("現在の地位では主君の軍務を受けられません");
}

export function startMilitaryCareerMission(state) {
  if (!state?.player) throw new Error("キャリア状態ではありません");
  const definition = missionDefinition(state.player.stage);
  const next = clone(state);
  const career = ensureMilitaryCareer(next.player);
  if (career.activeMission) throw new Error("進行中の軍務があります");
  const originId = next.scenarioMode === "generated" ? next.generatedWorld?.expeditionRegionId : next.player.locationId;
  if (!originId) throw new Error("軍務の受命地点を特定できません");
  const originRegion = regionRecord(next, originId);
  const targetRegion = missionTarget(next);
  const sequence = career.history.length + 1;
  career.activeMission = {
    id: `military:${definition.kind}:${next.turn ?? 0}:${sequence}`,
    battleId: `military-battle:${definition.kind}:${next.turn ?? 0}:${sequence}`,
    ...definition,
    issuer: { id: next.player.affiliation.liegeId, name: next.player.affiliation.liegeName ?? "主君" },
    originRegion,
    targetRegion,
    acceptedTurn: next.turn ?? 0,
    deadlineTurn: (next.turn ?? 0) + 2,
    stage: "accepted",
    constraints: [
      { id: "casualty_limit", label: definition.kind === "retainer_suppression" ? "味方死傷3以下" : "味方死傷25以下" },
      { id: "protect_civilians", label: "住民への略奪・故意の被害を禁ずる" },
    ],
    preparation: null,
    participantIds: [],
    outcome: null,
    battleResult: null,
  };
  next.player.history.unshift({
    turn: next.turn ?? 0,
    year: next.year,
    month: next.month,
    title: `${definition.title}を受命`,
    detail: `${targetRegion.name}へ赴き、${definition.objective} 期限は${career.activeMission.deadlineTurn}ターン。`,
  });
  return next;
}

function selectableCompanions(state) {
  return (state.player?.villageLife?.party ?? []).filter((member) => member.active !== false && member.alive !== false);
}

export function prepareMilitaryCareerMission(state, options = {}) {
  const next = clone(state);
  const mission = ensureMilitaryCareer(next.player).activeMission;
  if (!mission || mission.stage !== "accepted") throw new Error("準備できる軍務がありません");
  const approach = MILITARY_MISSION_APPROACHES[options.approachId];
  const logistics = MILITARY_MISSION_LOGISTICS[options.logisticsId];
  if (!approach || !logistics) throw new Error("作戦と兵站を選んでください");
  next.player.metrics.wealth = Number(next.player.metrics.wealth) || 0;
  next.player.villageLife.supplies ??= { food: 0, torches: 0 };
  if (next.player.metrics.wealth < logistics.wealthCost || next.player.villageLife.supplies.food < logistics.foodCost) {
    throw new Error("選択した兵站を整える財産または保存食が不足しています");
  }
  const available = new Map(selectableCompanions(next).map((member) => [member.id, member]));
  const companionIds = [...new Set(options.companionIds ?? [])];
  if (companionIds.some((id) => !available.has(id))) throw new Error("参加できない仲間が含まれています");
  next.player.metrics.wealth -= logistics.wealthCost;
  next.player.villageLife.supplies.food -= logistics.foodCost;
  mission.stage = "prepared";
  mission.preparation = {
    approachId: approach.id,
    approachName: approach.name,
    logisticsId: logistics.id,
    logisticsName: logistics.name,
    wealthCost: logistics.wealthCost,
    foodCost: logistics.foodCost,
    preparedTurn: next.turn ?? 0,
  };
  mission.participantIds = [next.player.id ?? "player", ...companionIds];
  return next;
}

function missionForecast(state, mission) {
  const approach = MILITARY_MISSION_APPROACHES[mission.preparation?.approachId] ?? MILITARY_MISSION_APPROACHES.rapid;
  const logistics = MILITARY_MISSION_LOGISTICS[mission.preparation?.logisticsId] ?? MILITARY_MISSION_LOGISTICS.lean;
  const companions = Math.max(0, (mission.participantIds?.length ?? 1) - 1);
  const basePlayer = mission.kind === "commander_relief" ? 72 : 12;
  return {
    playerStrength: basePlayer + companions * 6 + logistics.strengthBonus + approach.playerBonus,
    enemyStrength: Math.max(1, Math.round(mission.baseEnemyStrength * approach.enemyMultiplier)),
    supply: logistics.supply,
  };
}

export function getMilitaryCareerMissionView(state) {
  const mission = state.player?.militaryCareer?.activeMission ?? null;
  if (!mission) return { active: false, mission: null, forecast: null, atTarget: false, atOrigin: false, companions: [] };
  const currentRegionId = state.scenarioMode === "generated" ? state.generatedWorld?.expeditionRegionId : state.player.locationId;
  return {
    active: true,
    mission: clone(mission),
    forecast: mission.preparation ? missionForecast(state, mission) : null,
    atTarget: currentRegionId === mission.targetRegion.id,
    atOrigin: currentRegionId === mission.originRegion.id,
    companions: selectableCompanions(state).map((member) => ({ id: member.id, name: member.name, role: member.role ?? "冒険者", selected: mission.participantIds.includes(member.id) })),
    approaches: Object.values(MILITARY_MISSION_APPROACHES),
    logistics: Object.values(MILITARY_MISSION_LOGISTICS),
  };
}

function unitClassForRole(role = "") {
  if (/魔|術|神官|治療/.test(role)) return "mage";
  if (/弓|斥候/.test(role)) return "archer";
  if (/騎/.test(role)) return "light_cavalry";
  if (/槍/.test(role)) return "spearman";
  return "infantry";
}

function personalParticipants(state, mission) {
  const life = state.player.villageLife;
  const selected = new Set(mission.participantIds);
  const playerMaxHp = Math.max(1, Number(life.maxHp) || 100);
  return [{
    id: state.player.id ?? "player", name: state.player.name, role: state.player.specialty ?? state.player.title,
    raceId: state.player.raceId ?? "human",
    hp: Math.max(0, Number.isFinite(Number(life.hp)) ? Number(life.hp) : playerMaxHp), maxHp: playerMaxHp, player: true,
  }, ...(life.party ?? []).filter((member) => selected.has(member.id) && member.active !== false && member.alive !== false).map((member) => ({
    id: member.id, name: member.name, role: member.role ?? "冒険者", raceId: member.raceId ?? "human",
    hp: Math.max(0, Number(member.hp) || 0), maxHp: Math.max(1, Number(member.maxHp) || 48), player: false,
  }))];
}

function fixedNationRecord(nationId, fallbackName = "主君領") {
  const peopleId = nationId === "forest_alliance" ? "beastfolk" : "human";
  return { id: nationId ?? "local-polity", name: fallbackName, shortName: fallbackName.replace(/[国領軍]$/, ""), peopleId, peopleName: peopleId === "beastfolk" ? "獣人" : "人間" };
}

function militaryNationContext(state, mission) {
  if (state.scenarioMode !== "generated") {
    const playerNation = fixedNationRecord(state.player?.affiliation?.nationId, state.player?.affiliation?.liegeName ?? "主君領");
    return { runtime: null, playerNation, enemyNation: null, targetRegion: null };
  }
  const runtime = buildGeneratedWorld(state);
  const targetRegion = runtime.regionById.get(mission.targetRegion.id) ?? null;
  const originNationId = mission.originRegion.nationId ?? state.generatedWorld?.playerNationId;
  const playerNation = runtime.nationById.get(originNationId) ?? runtime.nationById.get(state.generatedWorld?.playerNationId);
  if (!playerNation) throw new Error("軍務を発令した生成国家を特定できません");
  const targetNation = targetRegion ? runtime.nationById.get(targetRegion.nationId) ?? null : null;
  const neighboringEnemy = (targetRegion?.neighborIds ?? [])
    .map((regionId) => runtime.regionById.get(regionId))
    .filter((region) => region && region.nationId !== playerNation.id)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((region) => runtime.nationById.get(region.nationId))
    .find(Boolean) ?? null;
  const enemyNation = targetNation?.id !== playerNation.id ? targetNation : neighboringEnemy;
  return { runtime, playerNation, enemyNation, targetRegion };
}

function applyGeneratedBattlefield(map, runtime, targetRegion, approachId) {
  const terrainCounts = new Map();
  for (const tileIndex of targetRegion?.tileIndices ?? []) {
    const tile = runtime?.tiles?.[tileIndex];
    const tactical = tile?.feature === "marsh" || tile?.feature === "floodplain"
      ? "swamp"
      : ["forest", "rainforest"].includes(tile?.feature) ? "forest"
        : ["mountains", "hills"].includes(tile?.relief) ? "hill" : "plain";
    terrainCounts.set(tactical, (terrainCounts.get(tactical) ?? 0) + 1);
  }
  const dominant = [...terrainCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "plain";
  const accent = approachId === "scout" ? "forest" : dominant;
  const patches = {
    forest: [[3, 1], [3, 2], [4, 1], [5, 6], [6, 6], [6, 7]],
    hill: [[3, 1], [4, 1], [5, 2], [5, 6], [6, 6], [6, 7]],
    swamp: [[3, 1], [3, 2], [4, 2], [5, 5], [6, 5], [6, 6]],
    plain: [],
  }[accent] ?? [];
  patches.forEach(([x, y]) => setBattleTerrain(map, { x, y }, accent));
  return { dominant, accent, regionTerrain: targetRegion?.dominantTerrain ?? null, regionRelief: targetRegion?.dominantRelief ?? null };
}

export function createMilitaryCareerBattle(state) {
  const mission = state.player?.militaryCareer?.activeMission;
  if (!mission || mission.stage !== "prepared") throw new Error("戦闘準備を終えた軍務がありません");
  const currentRegionId = state.scenarioMode === "generated" ? state.generatedWorld?.expeditionRegionId : state.player.locationId;
  if (currentRegionId !== mission.targetRegion.id) throw new Error("軍務の対象地域へ移動してください");
  const forecast = missionForecast(state, mission);
  const nations = militaryNationContext(state, mission);
  const map = createBattleMap({ width: 10, height: 8, terrainType: "plain" });
  for (let x = 0; x < map.width; x += 1) setBattleTerrain(map, { x, y: 4 }, "road");
  const environment = applyGeneratedBattlefield(map, nations.runtime, nations.targetRegion, mission.preparation.approachId);
  const playerProfile = getNationalUnitProfile(nations.playerNation.peopleId);
  const enemyProfile = nations.enemyNation ? getNationalUnitProfile(nations.enemyNation.peopleId) : null;
  const commanders = [
    createCommander({ id: `${mission.id}:player-commander`, name: `${state.player.name}（${nations.playerNation.shortName ?? nations.playerNation.name}軍）`, side: "player", position: { x: 0, y: 4 }, leadership: 68, tactics: 64, traits: playerProfile ? [playerProfile.doctrineName, ...playerProfile.strengths.slice(0, 2)] : [] }),
    createCommander({ id: `${mission.id}:enemy-commander`, name: nations.enemyNation ? `${nations.enemyNation.shortName ?? nations.enemyNation.name}軍指揮官` : mission.kind === "commander_relief" ? "包囲軍指揮官" : "襲撃団頭目", side: "enemy", position: { x: 9, y: 4 }, leadership: 58, tactics: 56, traits: enemyProfile ? [enemyProfile.doctrineName, ...enemyProfile.strengths.slice(0, 2)] : [] }),
  ];
  const personalPositions = [{ x: 1, y: 4 }, { x: 1, y: 2 }, { x: 1, y: 6 }, { x: 2, y: 3 }];
  const personalUnits = personalParticipants(state, mission).map((member, index) => createCombatUnit({
    id: `${mission.id}:member:${member.id}`,
    name: member.name,
    side: "player",
    commanderId: commanders[0].id,
    soldierCount: 1,
    maxSoldierCount: 1,
    hp: member.hp,
    maxHp: member.maxHp,
    raceId: member.raceId,
    position: personalPositions[index] ?? { x: 2, y: index % 8 },
    unitClassId: unitClassForRole(member.role),
    tags: ["MILITARY_MISSION", member.player ? "PLAYER_CHARACTER" : "PARTY_MEMBER", `MEMBER_ID:${member.id}`],
    actionActorType: member.player ? "local_player" : "ai",
  }));
  const levySize = Math.max(6, forecast.playerStrength - personalUnits.length * 4);
  const enemySize = forecast.enemyStrength;
  const scale = mission.kind === "commander_relief" ? "commander" : "retainer";
  const playerArmy = createNationalArmyUnitSpecs({
    nation: nations.playerNation,
    side: "player",
    commanderId: commanders[0].id,
    strength: levySize,
    scale,
    positions: [{ x: 2, y: 5 }, { x: 2, y: 1 }, { x: 2, y: 7 }],
    seed: mission.id,
  }).map((spec) => createCombatUnit({ ...spec, supply: forecast.supply, maxSupply: 100, tags: [...spec.tags, "MILITARY_MISSION", "LIEGE_FORCE"] }));
  const enemyArmy = nations.enemyNation && mission.kind === "commander_relief"
    ? createNationalArmyUnitSpecs({
      nation: nations.enemyNation,
      side: "enemy",
      commanderId: commanders[1].id,
      strength: Math.round(enemySize * 1.28),
      scale: "commander",
      positions: [{ x: 8, y: 4 }, { x: 8, y: 2 }, { x: 8, y: 6 }],
      seed: `${mission.id}:enemy`,
    }).map((spec) => createCombatUnit({ ...spec, facing: "west", tags: [...spec.tags, "MILITARY_MISSION", "MISSION_TARGET"] }))
    : [
      createCombatUnit({ id: `${mission.id}:enemy-main`, name: mission.kind === "commander_relief" ? "包囲軍主隊" : "街道襲撃団", side: "enemy", commanderId: commanders[1].id, soldierCount: enemySize, maxSoldierCount: enemySize, position: { x: 8, y: 4 }, unitClassId: "infantry", facing: "west", tags: ["MILITARY_MISSION", "MISSION_TARGET"] }),
      createCombatUnit({ id: `${mission.id}:enemy-ranged`, name: "敵弓兵", side: "enemy", commanderId: commanders[1].id, soldierCount: Math.max(3, Math.round(enemySize * 0.28)), maxSoldierCount: Math.max(3, Math.round(enemySize * 0.28)), position: { x: 8, y: 2 }, unitClassId: "archer", facing: "west", tags: ["MILITARY_MISSION", "MISSION_TARGET"] }),
    ];
  const units = [
    ...personalUnits,
    ...playerArmy,
    ...enemyArmy,
  ];
  const battle = createBattleState({
    id: mission.battleId,
    name: `${mission.targetRegion.name}・${mission.title}`,
    map,
    commanders,
    units,
    formations: { player: playerProfile?.formationId ?? "line", enemy: enemyProfile?.formationId ?? "line" },
    seed: hashString(mission.id),
  });
  battle.sideLabels = { player: nations.playerNation.name, enemy: nations.enemyNation?.name ?? "敵対勢力" };
  battle.nationalArmies = {
    player: getNationalArmySummary(nations.playerNation),
    enemy: nations.enemyNation && mission.kind === "commander_relief" ? getNationalArmySummary(nations.enemyNation) : null,
  };
  battle.environment = environment;
  battle.militaryMissionId = mission.id;
  return battle;
}

function persistPersonalCasualties(next, mission, battleResult) {
  const allowed = new Set(mission.participantIds);
  const life = next.player.villageLife;
  for (const memberResult of battleResult.player?.members ?? []) {
    const memberId = memberResult.tags?.find((tag) => tag.startsWith("MEMBER_ID:"))?.slice("MEMBER_ID:".length);
    if (!memberId || !allowed.has(memberId)) continue;
    const remainingHp = Math.max(0, Number(memberResult.remainingHp) || 0);
    const maxHp = Math.max(1, Number(memberResult.maxHp) || 1);
    const alive = memberResult.state !== "DESTROYED" && remainingHp > 0;
    if (memberResult.tags?.includes("PLAYER_CHARACTER") && memberId === (next.player.id ?? "player")) {
      life.maxHp = Math.max(1, Number(life.maxHp) || maxHp);
      life.hp = Math.min(life.maxHp, remainingHp);
      life.injuries ??= [];
      if (life.hp < life.maxHp && !life.injuries.some((entry) => String(entry).startsWith("軍務負傷"))) life.injuries.push(`軍務負傷（残りHP ${life.hp}）`);
      continue;
    }
    const update = (party) => {
      const member = party?.find((entry) => entry.id === memberId);
      if (!member) return;
      member.maxHp = maxHp;
      member.hp = Math.min(maxHp, remainingHp);
      member.battleState = memberResult.state;
      member.alive = alive;
      if (!alive) member.active = false;
    };
    update(life.party);
    update(next.adventure?.party);
  }
}

export function resolveMilitaryCareerBattle(state, battleResult) {
  const next = clone(state);
  const mission = ensureMilitaryCareer(next.player).activeMission;
  if (!mission || mission.stage !== "prepared") throw new Error("解決待ちの軍務戦闘がありません");
  if (battleResult?.battleId !== mission.battleId || !battleResult.winner) throw new Error("軍務戦闘の結果が不正です");
  persistPersonalCasualties(next, mission, battleResult);
  mission.stage = "return_required";
  mission.outcome = battleResult.winner === "player" ? "victory" : battleResult.winner === "draw" ? "withdrawal" : "defeat";
  mission.battleResult = {
    battleId: battleResult.battleId,
    winner: battleResult.winner,
    friendlyCasualties: Number(battleResult.player?.casualties) || 0,
    friendlyHpLoss: Number(battleResult.player?.hpLoss) || 0,
    enemyCasualties: Number(battleResult.enemy?.casualties) || 0,
    enemyHpLoss: Number(battleResult.enemy?.hpLoss) || 0,
  };
  return next;
}

function evaluationFor(state, mission) {
  const won = mission.outcome === "victory";
  const onTime = (state.turn ?? 0) <= mission.deadlineTurn;
  const casualtyLimit = mission.kind === "commander_relief" ? 25 : 3;
  const casualties = mission.battleResult?.friendlyCasualties ?? 0;
  const casualtyDiscipline = casualties <= casualtyLimit;
  let score = won ? 62 : mission.outcome === "withdrawal" ? 28 : 12;
  if (onTime) score += 14;
  if (casualtyDiscipline) score += 12;
  if (mission.preparation?.approachId === "scout") score += 6;
  if (mission.preparation?.approachId === "defensive") score -= 3;
  score = clamp(score - Math.max(0, casualties - casualtyLimit) * 2, 0, 100);
  return { score, won, onTime, casualtyDiscipline, casualties, casualtyLimit, promotionEarned: won && onTime && score >= 55 };
}

export function closeMilitaryCareerMissionReport(state) {
  const next = clone(state);
  const career = ensureMilitaryCareer(next.player);
  const mission = career.activeMission;
  if (!mission || mission.stage !== "return_required") throw new Error("報告できる軍務がありません");
  const currentRegionId = next.scenarioMode === "generated" ? next.generatedWorld?.expeditionRegionId : next.player.locationId;
  if (currentRegionId !== mission.originRegion.id) throw new Error("軍務の受命地点へ帰還して報告してください");
  const evaluation = evaluationFor(next, mission);
  const record = { ...clone(mission), evaluation, reportedTurn: next.turn ?? 0 };
  delete record.battleResult?.members;
  career.history.unshift(record);
  career.history = career.history.slice(0, 40);
  career.activeMission = null;
  if (!evaluation.promotionEarned) {
    next.player.metrics.liegeTrust = clamp((Number(next.player.metrics.liegeTrust) || 0) - 12, 0, 100);
    next.player.metrics.martialMerit = (Number(next.player.metrics.martialMerit) || 0) + (mission.outcome === "victory" ? 8 : 2);
  }
  next.player.history.unshift({
    turn: next.turn ?? 0,
    year: next.year,
    month: next.month,
    title: evaluation.promotionEarned ? `${mission.title}の軍功を認められる` : `${mission.title}の戦果を報告`,
    detail: `評価${evaluation.score}。勝敗、期限、味方損害${evaluation.casualties}を主君へ報告した。`,
  });
  return { state: next, promotionActionId: evaluation.promotionEarned ? mission.promotionActionId : null, evaluation };
}

export function advanceMilitaryCareerMissionMonth(state) {
  const next = clone(state);
  const mission = next.player?.militaryCareer?.activeMission;
  if (!mission || mission.stage === "return_required" || (next.turn ?? 0) <= mission.deadlineTurn) return next;
  mission.stage = "return_required";
  mission.outcome = "deadline_missed";
  mission.battleResult = { battleId: mission.battleId, winner: null, friendlyCasualties: 0, friendlyHpLoss: 0, enemyCasualties: 0, enemyHpLoss: 0 };
  return next;
}
