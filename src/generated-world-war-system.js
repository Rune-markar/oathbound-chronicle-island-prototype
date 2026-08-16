import { deriveGeopoliticalProfiles } from "./geopolitical-world.js";
import { createRegionalDomainState, declareRegionIndependence, transferRegionControl } from "./regional-domain-system.js";
import {
  GENERATED_WAR_MAX_FRONTS,
  createGeneratedWarFronts,
  normalizeGeneratedWarForce,
  normalizeGeneratedWarFront,
  resolveGeneratedWarFronts,
} from "./generated-war-core.js";
import { createGeneratedResistanceState, registerGeneratedOccupation } from "./generated-resistance-system.js";

export const GENERATED_WORLD_WAR_SCHEMA_VERSION = 2;

export const GENERATED_WORLD_WAR_DOCTRINES = Object.freeze({
  decisive_breakthrough: Object.freeze({ id: "decisive_breakthrough", name: "決戦突破", role: "attacker", description: "高い動員と攻勢意図を一正面へ集中し、損害を受け入れて短期突破を狙う。" }),
  corridor_warfare: Object.freeze({ id: "corridor_warfare", name: "回廊戦争", role: "attacker", description: "街道・渡河点・市場路を確保し、補給を維持しながら限定目標へ進む。" }),
  resource_pressure: Object.freeze({ id: "resource_pressure", name: "資源圧迫戦", role: "attacker", description: "不足する食料・備蓄を補うため、近隣の生産地方を短期占領する。" }),
  limited_pressure: Object.freeze({ id: "limited_pressure", name: "限定圧力", role: "attacker", description: "国境の一地方だけを目標にし、戦争拡大を抑えて有利な講和を求める。" }),
  fortress_network: Object.freeze({ id: "fortress_network", name: "城砦網防衛", role: "defender", description: "険阻地形、渡河点、城砦を連結し、攻撃側の補給消耗を待つ。" }),
  mobile_defense: Object.freeze({ id: "mobile_defense", name: "機動防御", role: "defender", description: "予備隊を保ち、突出した攻撃軍へ局地反撃を加える。" }),
  defense_in_depth: Object.freeze({ id: "defense_in_depth", name: "縦深防御", role: "defender", description: "前線を段階的に後退させながら損耗を抑え、第二線で攻勢を止める。" }),
});

export const GENERATED_WORLD_WAR_ACTIONS = Object.freeze({
  probe: Object.freeze({ id: "probe", name: "威力偵察" }),
  advance: Object.freeze({ id: "advance", name: "主力前進" }),
  cut_supply: Object.freeze({ id: "cut_supply", name: "補給線遮断" }),
  assault: Object.freeze({ id: "assault", name: "強襲突破" }),
  pause: Object.freeze({ id: "pause", name: "補給再編" }),
  fortify: Object.freeze({ id: "fortify", name: "防衛線強化" }),
  counterattack: Object.freeze({ id: "counterattack", name: "局地反撃" }),
  elastic_defense: Object.freeze({ id: "elastic_defense", name: "弾性防御" }),
  scorched_delay: Object.freeze({ id: "scorched_delay", name: "焦土遅滞" }),
  hold: Object.freeze({ id: "hold", name: "城砦固守" }),
  sortie: Object.freeze({ id: "sortie", name: "城外反撃" }),
  withdraw: Object.freeze({ id: "withdraw", name: "守備隊撤収" }),
  blockade: Object.freeze({ id: "blockade", name: "包囲封鎖" }),
  negotiate: Object.freeze({ id: "negotiate", name: "開城交渉" }),
});

const MAX_ACTIVE_WARS = 12;
const MAX_WAR_HISTORY = 48;
const MAX_WAR_EVENTS = 192;
const clone = (value) => structuredClone(value);
const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const periodFor = (state) => `${Number.isInteger(state?.year) ? state.year : 317}-${Number.isInteger(state?.month) ? state.month : 4}`;
const pairKey = (leftId, rightId) => [leftId, rightId].sort().join(":");

function hashText(text) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(...parts) {
  return hashText(parts.join("|")) / 4294967295;
}

const safeForce = normalizeGeneratedWarForce;

const safeFront = normalizeGeneratedWarFront;

function safeWar(source = {}) {
  if (!source || typeof source !== "object" || typeof source.id !== "string") return null;
  if (typeof source.attackerNationId !== "string" || typeof source.defenderNationId !== "string") return null;
  return {
    id: source.id,
    relationKey: typeof source.relationKey === "string" ? source.relationKey : pairKey(source.attackerNationId, source.defenderNationId),
    attackerNationId: source.attackerNationId,
    defenderNationId: source.defenderNationId,
    objectiveId: typeof source.objectiveId === "string" ? source.objectiveId : "border_revision",
    objectiveName: typeof source.objectiveName === "string" ? source.objectiveName : "国境地方の限定占領",
    phase: typeof source.phase === "string" ? source.phase : "mobilizing",
    outcome: typeof source.outcome === "string" ? source.outcome : null,
    settlementId: typeof source.settlementId === "string" ? source.settlementId : null,
    startedPeriod: typeof source.startedPeriod === "string" ? source.startedPeriod : null,
    endedPeriod: typeof source.endedPeriod === "string" ? source.endedPeriod : null,
    elapsedMonths: Math.max(0, Math.round(Number(source.elapsedMonths) || 0)),
    attackerDoctrineId: GENERATED_WORLD_WAR_DOCTRINES[source.attackerDoctrineId]?.role === "attacker" ? source.attackerDoctrineId : "limited_pressure",
    defenderDoctrineId: GENERATED_WORLD_WAR_DOCTRINES[source.defenderDoctrineId]?.role === "defender" ? source.defenderDoctrineId : "defense_in_depth",
    targetRegionId: typeof source.targetRegionId === "string" ? source.targetRegionId : null,
    attacker: safeForce(source.attacker),
    defender: safeForce(source.defender),
    fronts: (Array.isArray(source.fronts) ? source.fronts : []).map(safeFront).filter((front) => front.targetRegionId).slice(0, GENERATED_WAR_MAX_FRONTS),
    requiresPlayerDecision: Boolean(source.requiresPlayerDecision),
    playerCommanded: Boolean(source.playerCommanded),
    interveners: (Array.isArray(source.interveners) ? source.interveners : []).filter((entry) => entry && typeof entry.nationId === "string" && ["attacker", "defender"].includes(entry.side)).slice(0, 8).map((entry) => ({ nationId: entry.nationId, side: entry.side, strength: Math.max(0, Math.round(Number(entry.strength) || 0)), joinedPeriod: entry.joinedPeriod ?? null })),
    log: (Array.isArray(source.log) ? source.log : []).filter((entry) => entry && typeof entry.summary === "string").slice(-24).map((entry) => ({ ...entry })),
  };
}

function baseline(dateState = null) {
  return {
    schemaVersion: GENERATED_WORLD_WAR_SCHEMA_VERSION,
    establishedPeriod: periodFor(dateState),
    lastAdvancedPeriod: null,
    activeWars: [],
    history: [],
    events: [],
  };
}

export function preserveGeneratedWorldWarState(source) {
  if (!source || typeof source !== "object" || ![1, GENERATED_WORLD_WAR_SCHEMA_VERSION].includes(Number(source.schemaVersion))) return null;
  return {
    schemaVersion: GENERATED_WORLD_WAR_SCHEMA_VERSION,
    establishedPeriod: typeof source.establishedPeriod === "string" ? source.establishedPeriod : null,
    lastAdvancedPeriod: typeof source.lastAdvancedPeriod === "string" ? source.lastAdvancedPeriod : null,
    activeWars: (source.activeWars ?? []).map(safeWar).filter(Boolean).slice(0, MAX_ACTIVE_WARS),
    history: (source.history ?? []).map(safeWar).filter(Boolean).slice(-MAX_WAR_HISTORY),
    events: (source.events ?? []).filter((event) => event && typeof event.id === "string").slice(-MAX_WAR_EVENTS).map((event) => ({ ...event, drivers: clone(event.drivers ?? []) })),
  };
}

export function createGeneratedWorldWarState(runtime, source = null, dateState = null) {
  const next = preserveGeneratedWorldWarState(source) ?? baseline(dateState);
  const validNationIds = new Set(runtime.nations.nations.map((nation) => nation.id));
  next.activeWars = next.activeWars.filter((war) => validNationIds.has(war.attackerNationId) && validNationIds.has(war.defenderNationId));
  return next;
}

function regionOwner(regionalDomains, region) {
  return regionalDomains?.regionStates?.[region.id]?.nationId ?? region.nationId;
}

function borderTargets(runtime, regionalDomains, attackerNationId, defenderNationId) {
  return runtime.nations.regions.flatMap((target) => {
    if (regionOwner(regionalDomains, target) !== defenderNationId) return [];
    const origins = target.neighborIds.map((id) => runtime.regionById.get(id)).filter((region) => region && regionOwner(regionalDomains, region) === attackerNationId);
    if (!origins.length) return [];
    const capitalBonus = runtime.nationById.get(defenderNationId)?.capitalRegionId === target.id ? 90000 : 0;
    const score = (Number(target.population) || 0) + capitalBonus + (target.seatObjectId ? 18000 : 0) - (Number(target.movementCost) || 1) * 1200;
    return [{ target, origin: origins.sort((left, right) => (right.population ?? 0) - (left.population ?? 0) || left.id.localeCompare(right.id))[0], score }];
  }).sort((left, right) => right.score - left.score || left.target.id.localeCompare(right.target.id));
}

function attackerDoctrine(profile, condition) {
  if ((condition.offensiveIntent ?? 0) >= 65 && (condition.readiness ?? 0) >= 62) return "decisive_breakthrough";
  if ((profile.commerceBase ?? 0) >= 58) return "corridor_warfare";
  if ((condition.foodSecurity ?? 100) < 45 || (condition.reserves ?? 100) < 42) return "resource_pressure";
  return "limited_pressure";
}

function defenderDoctrine(profile, condition) {
  if ((profile.terrainDefense ?? 0) >= 58) return "fortress_network";
  if ((condition.readiness ?? 0) >= 58 && (profile.capability ?? 0) >= 48) return "mobile_defense";
  return "defense_in_depth";
}

function initialForce(profile, condition, role) {
  const roleBonus = role === "defender" ? (profile.terrainDefense ?? 0) * 1.8 : (condition.offensiveIntent ?? 0) * 1.4;
  const strength = Math.max(240, Math.round(260 + (profile.capability ?? 40) * 6 + (condition.readiness ?? 40) * 3.5 + roleBonus));
  return safeForce({
    initialStrength: strength,
    strength,
    supply: Math.round(((condition.reserves ?? 45) + (condition.foodSecurity ?? 50)) / 2),
    morale: condition.cohesion ?? 50,
    casualties: 0,
  });
}

function objectiveFor(profile, condition) {
  if ((condition.foodSecurity ?? 100) < 42) return { id: "resource_security", name: "食料・生産地方の確保" };
  if ((profile.commerceBase ?? 0) >= 58) return { id: "secure_corridor", name: "国境通商路の確保" };
  return { id: "border_revision", name: "国境地方の限定占領" };
}

function createFronts(targets) {
  return createGeneratedWarFronts(targets, { maximum: GENERATED_WAR_MAX_FRONTS });
}

function createWar(runtime, regionalDomains, geopolitics, event, dateState, protectedNationIds) {
  const attackerNationId = event.nationId;
  const defenderNationId = event.targetNationId;
  const targets = borderTargets(runtime, regionalDomains, attackerNationId, defenderNationId);
  if (!targets.length) return null;
  const profiles = deriveGeopoliticalProfiles(runtime);
  const attackerCondition = geopolitics.nationStates[attackerNationId] ?? {};
  const defenderCondition = geopolitics.nationStates[defenderNationId] ?? {};
  const objective = objectiveFor(profiles[attackerNationId], attackerCondition);
  const startedPeriod = periodFor(dateState);
  return safeWar({
    id: `world-war:${startedPeriod}:${attackerNationId}:${defenderNationId}`,
    relationKey: pairKey(attackerNationId, defenderNationId),
    attackerNationId,
    defenderNationId,
    objectiveId: objective.id,
    objectiveName: objective.name,
    phase: protectedNationIds.has(attackerNationId) || protectedNationIds.has(defenderNationId) ? "awaiting_player" : "mobilizing",
    startedPeriod,
    attackerDoctrineId: attackerDoctrine(profiles[attackerNationId], attackerCondition),
    defenderDoctrineId: defenderDoctrine(profiles[defenderNationId], defenderCondition),
    targetRegionId: targets[0].target.id,
    attacker: initialForce(profiles[attackerNationId], attackerCondition, "attacker"),
    defender: initialForce(profiles[defenderNationId], defenderCondition, "defender"),
    fronts: createFronts(targets),
    requiresPlayerDecision: protectedNationIds.has(attackerNationId) || protectedNationIds.has(defenderNationId),
    log: [],
  });
}

function driver(label, value) {
  return { label, value: Math.round(clamp(value)) };
}

function warEvent(runtime, war, period, stage, title, summary, tone = "danger", drivers = []) {
  return {
    id: `${war.id}:${period}:${stage}`,
    worldWarId: war.id,
    type: "generated_world_war",
    period,
    nationId: war.attackerNationId,
    targetNationId: war.defenderNationId,
    regionId: war.targetRegionId,
    title,
    summary,
    tone,
    drivers,
  };
}

function nationName(runtime, nationId) {
  return runtime.nationById.get(nationId)?.name ?? "名称不明国";
}

function regionName(runtime, regionId) {
  return runtime.regionById.get(regionId)?.name ?? "名称不明地方";
}

function openingEvent(runtime, war, period) {
  const attackerName = nationName(runtime, war.attackerNationId);
  const defenderName = nationName(runtime, war.defenderNationId);
  const targetName = regionName(runtime, war.targetRegionId);
  return warEvent(runtime, war, period, "opened", `${attackerName}が${defenderName}へ侵攻`, `${war.objectiveName}を掲げ、${targetName}を主目標とする${war.fronts.length}正面の戦争が始まった。攻撃側は${GENERATED_WORLD_WAR_DOCTRINES[war.attackerDoctrineId].name}、防衛側は${GENERATED_WORLD_WAR_DOCTRINES[war.defenderDoctrineId].name}を採る。`, "danger", [
    driver("攻撃側戦力", war.attacker.strength / 20),
    driver("防衛側戦力", war.defender.strength / 20),
    driver("攻撃側補給", war.attacker.supply),
  ]);
}

function chooseAttackerAction(war) {
  const maximumProgress = Math.max(0, ...war.fronts.map((front) => front.progress));
  if (war.attacker.supply < 24) return "pause";
  if (maximumProgress >= 78 && war.attacker.strength > war.defender.strength * 0.92) return "assault";
  if (war.defender.supply < 38 || war.attackerDoctrineId === "corridor_warfare") return "cut_supply";
  if (war.elapsedMonths <= 2) return "probe";
  return "advance";
}

function chooseDefenderAction(war) {
  const maximumProgress = Math.max(0, ...war.fronts.map((front) => front.progress));
  if (war.defender.supply < 22) return "scorched_delay";
  if (war.defenderDoctrineId === "mobile_defense" && maximumProgress >= 45 && war.defender.strength > war.attacker.strength * 0.72) return "counterattack";
  if (war.defenderDoctrineId === "fortress_network") return "fortify";
  return "elastic_defense";
}

function applyGeopoliticalWarCost(geopolitics, war, attackerLoss, defenderLoss) {
  const attacker = geopolitics.nationStates[war.attackerNationId];
  const defender = geopolitics.nationStates[war.defenderNationId];
  if (attacker) {
    attacker.readiness = Math.round(clamp(attacker.readiness - Math.max(1, attackerLoss / 55)));
    attacker.reserves = Math.round(clamp(attacker.reserves - 2));
    attacker.foodSecurity = Math.round(clamp(attacker.foodSecurity - 1));
    attacker.cohesion = Math.round(clamp(attacker.cohesion - Math.max(0, attackerLoss / 120)));
  }
  if (defender) {
    defender.readiness = Math.round(clamp(defender.readiness - Math.max(1, defenderLoss / 65)));
    defender.reserves = Math.round(clamp(defender.reserves - 1));
    defender.foodSecurity = Math.round(clamp(defender.foodSecurity - 1));
    defender.cohesion = Math.round(clamp(defender.cohesion - Math.max(0, defenderLoss / 135)));
  }
}

function campaignStep(runtime, war, geopolitics, period) {
  const attackerActionId = chooseAttackerAction(war);
  const defenderActionId = chooseDefenderAction(war);
  const doctrineAttack = { decisive_breakthrough: 8, corridor_warfare: 4, resource_pressure: 5, limited_pressure: 2 }[war.attackerDoctrineId] ?? 0;
  const doctrineDefense = { fortress_network: 8, mobile_defense: 5, defense_in_depth: 4 }[war.defenderDoctrineId] ?? 0;
  const strengthRatio = war.attacker.strength / Math.max(1, war.defender.strength);
  const resolved = resolveGeneratedWarFronts(war.fronts, {
    strengthRatio,
    attackerActionId,
    defenderActionId,
    doctrineAttack,
    doctrineDefense,
    terrainDefense: (front) => {
      const target = runtime.regionById.get(front.targetRegionId);
      return (Number(target?.movementCost) || 1) * 3 + (target?.frontier ? 2 : 0);
    },
    jitter: (front) => (hashUnit(runtime.terrain.seed, war.id, period, front.id) - 0.5) * 10,
  });
  war.fronts = resolved.fronts;
  const totalAttackerLoss = resolved.attackerLosses;
  const totalDefenderLoss = resolved.defenderLosses;
  war.attacker.strength = Math.max(0, war.attacker.strength - totalAttackerLoss);
  war.defender.strength = Math.max(0, war.defender.strength - totalDefenderLoss);
  war.attacker.casualties += totalAttackerLoss;
  war.defender.casualties += totalDefenderLoss;
  war.attacker.supply = Math.round(clamp(war.attacker.supply - (attackerActionId === "pause" ? 1 : attackerActionId === "assault" ? 9 : 6)));
  war.defender.supply = Math.round(clamp(war.defender.supply - (defenderActionId === "scorched_delay" ? 7 : 4)
    - (attackerActionId === "cut_supply" ? 5 : 0)));
  war.attacker.morale = Math.round(clamp(war.attacker.morale + (totalDefenderLoss - totalAttackerLoss) / 18 - 1));
  war.defender.morale = Math.round(clamp(war.defender.morale + (totalAttackerLoss - totalDefenderLoss) / 18 - 1));
  applyGeopoliticalWarCost(geopolitics, war, totalAttackerLoss, totalDefenderLoss);
  const maximumProgress = Math.max(...war.fronts.map((front) => front.progress));
  const averageProgress = war.fronts.reduce((sum, front) => sum + front.progress, 0) / war.fronts.length;
  if (maximumProgress >= 100 || war.defender.strength <= war.defender.initialStrength * 0.28) war.phase = "siege";
  else if (war.attacker.supply <= 8 || war.attacker.strength <= war.attacker.initialStrength * 0.28) {
    war.phase = "settlement";
    war.outcome = "attacker_retreat";
  } else if (war.elapsedMonths >= 9) {
    war.phase = "settlement";
    war.outcome = averageProgress >= 58 ? "attacker_victory" : "stalemate";
  }
  const event = warEvent(runtime, war, period, `campaign-${war.elapsedMonths}`, `${nationName(runtime, war.attackerNationId)}・${nationName(runtime, war.defenderNationId)}戦況`, `${GENERATED_WORLD_WAR_ACTIONS[attackerActionId].name}に対し${GENERATED_WORLD_WAR_ACTIONS[defenderActionId].name}。最大進捗${maximumProgress}%、攻撃側損失${totalAttackerLoss}、防衛側損失${totalDefenderLoss}、攻撃側補給${war.attacker.supply}、防衛側補給${war.defender.supply}。`, war.outcome === "attacker_retreat" ? "watch" : "danger", [
    driver("侵攻進捗", maximumProgress),
    driver("攻撃側補給", war.attacker.supply),
    driver("防衛側補給", war.defender.supply),
  ]);
  war.log.push({ period, phase: "campaigning", attackerActionId, defenderActionId, summary: event.summary });
  return event;
}

function siegeStep(runtime, war, geopolitics, period) {
  const targetFront = [...war.fronts].sort((left, right) => right.progress - left.progress)[0];
  war.targetRegionId = targetFront.targetRegionId;
  const strengthRatio = war.attacker.strength / Math.max(1, war.defender.strength);
  const attackerActionId = war.attacker.supply >= 45 && strengthRatio >= 1.08 ? "assault" : war.attacker.supply >= 24 ? "blockade" : "negotiate";
  const defenderActionId = war.defender.supply < 16 || war.defender.morale < 24 ? "withdraw"
    : war.defenderDoctrineId === "mobile_defense" && war.defender.strength > war.attacker.strength * 0.72 ? "sortie" : "hold";
  const target = runtime.regionById.get(war.targetRegionId);
  const terrainDefense = (Number(target?.movementCost) || 1) * 4 + (war.defenderDoctrineId === "fortress_network" ? 12 : 4);
  const actionScore = { assault: 16, blockade: 8, negotiate: 2 }[attackerActionId] - { hold: 12, sortie: 5, withdraw: -14 }[defenderActionId];
  const score = (strengthRatio - 1) * 42 + (war.attacker.supply - war.defender.supply) * 0.45
    + (war.attacker.morale - war.defender.morale) * 0.25 + actionScore - terrainDefense
    + (hashUnit(runtime.terrain.seed, war.id, period, "siege") - 0.5) * 12;
  const attackerLoss = Math.max(4, Math.round(18 + (attackerActionId === "assault" ? 25 : 6) + Math.max(0, -score) * 0.35));
  const defenderLoss = Math.max(4, Math.round(16 + (attackerActionId === "assault" ? 18 : 8) + Math.max(0, score) * 0.4));
  war.attacker.strength = Math.max(0, war.attacker.strength - attackerLoss);
  war.defender.strength = Math.max(0, war.defender.strength - defenderLoss);
  war.attacker.casualties += attackerLoss;
  war.defender.casualties += defenderLoss;
  war.attacker.supply = Math.round(clamp(war.attacker.supply - (attackerActionId === "blockade" ? 8 : 11)));
  war.defender.supply = Math.round(clamp(war.defender.supply - (defenderActionId === "withdraw" ? 2 : 9)));
  applyGeopoliticalWarCost(geopolitics, war, attackerLoss, defenderLoss);
  war.outcome = score >= 0 || defenderActionId === "withdraw" ? "attacker_victory" : "defender_victory";
  war.phase = "settlement";
  const event = warEvent(runtime, war, period, "siege", `${regionName(runtime, war.targetRegionId)}攻防の決着`, `${GENERATED_WORLD_WAR_ACTIONS[attackerActionId].name}と${GENERATED_WORLD_WAR_ACTIONS[defenderActionId].name}の結果、${war.outcome === "attacker_victory" ? nationName(runtime, war.attackerNationId) : nationName(runtime, war.defenderNationId)}が戦場を制した。攻撃側累計損失${war.attacker.casualties}、防衛側累計損失${war.defender.casualties}。`, war.outcome === "attacker_victory" ? "danger" : "positive", [
    driver("攻防判定", 50 + score),
    driver("攻撃側士気", war.attacker.morale),
    driver("防衛側士気", war.defender.morale),
  ]);
  war.log.push({ period, phase: "siege", attackerActionId, defenderActionId, summary: event.summary });
  return event;
}

function closeRelation(geopolitics, war, settlementId) {
  const relation = geopolitics.relations[war.relationKey];
  if (!relation) return;
  relation.atWar = false;
  relation.warMonths = 0;
  relation.crisisMonths = 0;
  relation.truceMonths = Math.max(12, Number(relation.truceMonths) || 0);
  relation.tension = Math.round(clamp(relation.tension - (settlementId === "limited_annexation" ? 12 : 24)));
  relation.relation = Math.round(clamp(relation.relation + (settlementId === "limited_annexation" ? 2 : 8), -100, 100));
  relation.ceasefireOffer = null;
}

function settlementStep(runtime, regionalDomains, resistanceSource, war, geopolitics, period) {
  let domains = regionalDomains;
  let resistance = createGeneratedResistanceState(resistanceSource);
  let settlementId = war.outcome === "attacker_victory" ? "limited_annexation"
    : war.outcome === "defender_victory" ? "invasion_repelled"
      : war.outcome === "attacker_retreat" ? "attacker_withdrawal" : "status_quo";
  const target = runtime.regionById.get(war.targetRegionId);
  const defenderRegions = runtime.nations.regions.filter((region) => regionOwner(domains, region) === war.defenderNationId);
  const capitalRegionId = runtime.nationById.get(war.defenderNationId)?.capitalRegionId;
  const capitalFell = target?.id === capitalRegionId;
  const defenderCondition = geopolitics.nationStates?.[war.defenderNationId] ?? {};
  const catastrophicDefeat = war.defender.strength <= war.defender.initialStrength * 0.18 || (defenderCondition.cohesion ?? 100) <= 18;
  if (settlementId === "limited_annexation" && capitalFell && catastrophicDefeat) settlementId = defenderRegions.length <= 4 ? "full_annexation" : "nation_collapse";
  const transferToAttacker = (region, flags = {}) => {
    domains = transferRegionControl(runtime, domains, region.id, war.attackerNationId, {
      cause: "ai_world_war_settlement",
      actorId: war.attackerNationId,
      status: "transferred",
    }, { year: Number(period.split("-")[0]), month: Number(period.split("-")[1]) });
    resistance = registerGeneratedOccupation(resistance, region.id, war.attackerNationId, war.defenderNationId, { warId: war.id, ...flags }, { year: Number(period.split("-")[0]), month: Number(period.split("-")[1]) });
  };
  if (settlementId === "limited_annexation" && target && regionOwner(domains, target) === war.defenderNationId) transferToAttacker(target);
  else if (settlementId === "full_annexation") defenderRegions.forEach((region) => transferToAttacker(region, { fullAnnexation: true, capitalFall: region.id === capitalRegionId }));
  else if (settlementId === "nation_collapse") {
    if (target) transferToAttacker(target, { capitalFall: true });
    defenderRegions.filter((region) => region.id !== target?.id).forEach((region, index) => {
      if (index === 0) transferToAttacker(region, { capitalFall: true });
      else domains = declareRegionIndependence(runtime, domains, region.id, { polityId: `postwar-${war.id.replace(/[^a-z0-9-]/gi, "-")}-${index}`, name: `${region.name.replace(/地方$/, "")}臨時政府`, government: "戦後自治政府", cause: "nation_collapse" }, { year: Number(period.split("-")[0]), month: Number(period.split("-")[1]) });
    });
  } else if (settlementId === "limited_annexation") settlementId = "status_quo";
  war.settlementId = settlementId;
  war.phase = "complete";
  war.endedPeriod = period;
  closeRelation(geopolitics, war, settlementId);
  const resultText = settlementId === "full_annexation" ? `${nationName(runtime, war.defenderNationId)}全土を${nationName(runtime, war.attackerNationId)}へ併合`
    : settlementId === "nation_collapse" ? `${nationName(runtime, war.defenderNationId)}が崩壊し、首都占領地と戦後自治政府へ再編`
      : settlementId === "limited_annexation" ? `${regionName(runtime, war.targetRegionId)}を${nationName(runtime, war.attackerNationId)}へ限定割譲`
    : settlementId === "invasion_repelled" ? `${nationName(runtime, war.defenderNationId)}が侵攻を撃退`
      : settlementId === "attacker_withdrawal" ? `${nationName(runtime, war.attackerNationId)}が損耗と補給不足から撤退` : "国境を変えず停戦";
  const event = warEvent(runtime, war, period, "settlement", `${nationName(runtime, war.attackerNationId)}・${nationName(runtime, war.defenderNationId)}講和`, `${resultText}。12か月の休戦に入り、戦争による損耗と支配変更を保存した。`, settlementId === "limited_annexation" ? "danger" : "positive", [
    driver("攻撃側累計損失", war.attacker.casualties / 4),
    driver("防衛側累計損失", war.defender.casualties / 4),
    driver("戦争期間", war.elapsedMonths * 10),
  ]);
  war.log.push({ period, phase: "settlement", settlementId, summary: event.summary });
  return { domains, resistance, event };
}

function advanceWar(runtime, regionalDomains, resistanceSource, war, geopolitics, period) {
  const relation = geopolitics.relations[war.relationKey];
  if (!relation?.atWar) {
    war.outcome ??= "stalemate";
    war.settlementId = "negotiated_ceasefire";
    war.phase = "complete";
    war.endedPeriod = period;
    const event = warEvent(runtime, war, period, "ceasefire", `${nationName(runtime, war.attackerNationId)}・${nationName(runtime, war.defenderNationId)}停戦`, "両国の停戦判断が成立し、国境を変えず戦闘を終えた。", "positive");
    war.log.push({ period, phase: "ceasefire", summary: event.summary });
    return { war, domains: regionalDomains, resistance: resistanceSource, event, complete: true };
  }
  if (war.requiresPlayerDecision || war.phase === "awaiting_player") return { war, domains: regionalDomains, resistance: resistanceSource, event: null, complete: false };
  war.elapsedMonths += 1;
  if (war.phase === "mobilizing") {
    war.phase = "campaigning";
    war.fronts.forEach((front) => { front.status = "marching"; front.progress = Math.max(front.progress, 8); });
    war.attacker.supply = Math.round(clamp(war.attacker.supply - 4));
    war.defender.supply = Math.round(clamp(war.defender.supply - 2));
    const event = warEvent(runtime, war, period, "mobilized", `${nationName(runtime, war.attackerNationId)}軍が国境へ集結`, `${war.fronts.map((front) => `${regionName(runtime, front.targetRegionId)}正面`).join("と")}で進軍を開始。${nationName(runtime, war.defenderNationId)}は${GENERATED_WORLD_WAR_DOCTRINES[war.defenderDoctrineId].name}で迎撃する。`, "danger");
    war.log.push({ period, phase: "mobilizing", summary: event.summary });
    return { war, domains: regionalDomains, resistance: resistanceSource, event, complete: false };
  }
  if (war.phase === "campaigning") return { war, domains: regionalDomains, resistance: resistanceSource, event: campaignStep(runtime, war, geopolitics, period), complete: false };
  if (war.phase === "siege") return { war, domains: regionalDomains, resistance: resistanceSource, event: siegeStep(runtime, war, geopolitics, period), complete: false };
  if (war.phase === "settlement") {
    const settled = settlementStep(runtime, regionalDomains, resistanceSource, war, geopolitics, period);
    return { war, domains: settled.domains, resistance: settled.resistance, event: settled.event, complete: true };
  }
  return { war, domains: regionalDomains, resistance: resistanceSource, event: null, complete: war.phase === "complete" };
}

export function advanceGeneratedWorldWars(runtime, source, regionalDomainSource, previousGeopolitics, advancedGeopolitics, dateState, options = {}) {
  const period = periodFor(dateState);
  const worldWars = createGeneratedWorldWarState(runtime, source, dateState);
  if (worldWars.lastAdvancedPeriod === period) {
    return { worldWars, regionalDomains: createRegionalDomainState(runtime, regionalDomainSource, dateState), resistance: createGeneratedResistanceState(options.resistance), geopolitics: clone(advancedGeopolitics), pendingStrategicDecisions: [] };
  }
  let regionalDomains = createRegionalDomainState(runtime, regionalDomainSource, dateState);
  let resistance = createGeneratedResistanceState(options.resistance);
  const geopolitics = clone(advancedGeopolitics);
  const protectedNationIds = new Set(options.protectedNationIds ?? []);
  const excludedRelationKeys = new Set(options.excludedRelationKeys ?? []);
  const currentEvents = [];
  const activeWars = [];
  const completedWars = [];
  for (const sourceWar of worldWars.activeWars) {
    const result = advanceWar(runtime, regionalDomains, resistance, clone(sourceWar), geopolitics, period);
    regionalDomains = result.domains;
    resistance = result.resistance;
    if (result.event) currentEvents.push(result.event);
    if (result.complete) completedWars.push(result.war); else activeWars.push(result.war);
  }
  const occupiedNationIds = new Set(activeWars.flatMap((war) => [war.attackerNationId, war.defenderNationId]));
  const startedRelationKeys = new Set(activeWars.map((war) => war.relationKey));
  const warStartEvents = (geopolitics.events ?? []).filter((event) => event.period === period && event.outcome === "war_started" && event.targetNationId);
  for (const event of warStartEvents) {
    const key = pairKey(event.nationId, event.targetNationId);
    const startedThisMonth = !previousGeopolitics?.relations?.[key]?.atWar && geopolitics.relations?.[key]?.atWar;
    if (!startedThisMonth || startedRelationKeys.has(key) || occupiedNationIds.has(event.nationId) || occupiedNationIds.has(event.targetNationId)) continue;
    const war = createWar(runtime, regionalDomains, geopolitics, event, dateState, protectedNationIds);
    if (!war) continue;
    activeWars.push(war);
    startedRelationKeys.add(key);
    occupiedNationIds.add(war.attackerNationId);
    occupiedNationIds.add(war.defenderNationId);
    currentEvents.push(openingEvent(runtime, war, period));
  }
  const representedRelationKeys = new Set([
    ...startedRelationKeys,
    ...completedWars.map((war) => war.relationKey),
  ]);
  const legacyRelations = Object.entries(geopolitics.relations ?? {})
    .filter(([key, relation]) => relation.atWar && !representedRelationKeys.has(key) && !excludedRelationKeys.has(key))
    .sort(([left], [right]) => left.localeCompare(right));
  for (const [key] of legacyRelations) {
    const nationIds = key.split(":");
    if (nationIds.length !== 2 || nationIds.some((nationId) => occupiedNationIds.has(nationId))) continue;
    const historicOpening = [...(geopolitics.events ?? [])].reverse().find((event) => (
      event.outcome === "war_started" && event.targetNationId && pairKey(event.nationId, event.targetNationId) === key
    ));
    const ordered = historicOpening ? [historicOpening.nationId, historicOpening.targetNationId] : [...nationIds].sort((leftId, rightId) => {
      const left = geopolitics.nationStates[leftId] ?? {};
      const right = geopolitics.nationStates[rightId] ?? {};
      const leftScore = (left.offensiveIntent ?? 0) + (left.readiness ?? 0);
      const rightScore = (right.offensiveIntent ?? 0) + (right.readiness ?? 0);
      return rightScore - leftScore || leftId.localeCompare(rightId);
    });
    const war = createWar(runtime, regionalDomains, geopolitics, {
      nationId: ordered[0],
      targetNationId: ordered[1],
      outcome: "war_resumed",
    }, dateState, protectedNationIds);
    if (!war) continue;
    activeWars.push(war);
    representedRelationKeys.add(key);
    occupiedNationIds.add(war.attackerNationId);
    occupiedNationIds.add(war.defenderNationId);
    currentEvents.push(openingEvent(runtime, war, period));
  }
  const pendingStrategicDecisions = activeWars.filter((war) => war.requiresPlayerDecision && war.phase === "awaiting_player").map((war) => ({
    id: `world-war-response:${war.id}`,
    type: "generated_world_war_response",
    period,
    worldWarId: war.id,
    nationId: war.defenderNationId,
    targetNationId: war.attackerNationId,
    title: `${nationName(runtime, war.attackerNationId)}軍の侵攻への対応`,
    summary: `${regionName(runtime, war.targetRegionId)}への侵攻が始まった。プレイヤー支配国の不可逆な防衛・講和判断は自動確定しない。`,
  }));
  return {
    worldWars: {
      schemaVersion: GENERATED_WORLD_WAR_SCHEMA_VERSION,
      establishedPeriod: worldWars.establishedPeriod ?? period,
      lastAdvancedPeriod: period,
      activeWars: activeWars.slice(0, MAX_ACTIVE_WARS),
      history: [...worldWars.history, ...completedWars].slice(-MAX_WAR_HISTORY),
      events: [...worldWars.events, ...currentEvents].slice(-MAX_WAR_EVENTS),
    },
    regionalDomains,
    resistance,
    geopolitics,
    pendingStrategicDecisions,
  };
}

function enrichWar(runtime, war) {
  return {
    ...clone(war),
    attackerName: nationName(runtime, war.attackerNationId),
    defenderName: nationName(runtime, war.defenderNationId),
    targetRegionName: regionName(runtime, war.targetRegionId),
    attackerDoctrine: GENERATED_WORLD_WAR_DOCTRINES[war.attackerDoctrineId],
    defenderDoctrine: GENERATED_WORLD_WAR_DOCTRINES[war.defenderDoctrineId],
    fronts: war.fronts.map((front) => ({
      ...front,
      originRegionName: regionName(runtime, front.originRegionId),
      targetRegionName: regionName(runtime, front.targetRegionId),
      attackerAction: GENERATED_WORLD_WAR_ACTIONS[front.attackerActionId] ?? null,
      defenderAction: GENERATED_WORLD_WAR_ACTIONS[front.defenderActionId] ?? null,
    })),
  };
}

export function getGeneratedWorldWarView(runtime, source, dateState = null) {
  const state = createGeneratedWorldWarState(runtime, source, dateState);
  return {
    activeWars: state.activeWars.map((war) => enrichWar(runtime, war)),
    history: [...state.history].reverse().map((war) => enrichWar(runtime, war)),
    events: [...state.events].reverse().map((event) => ({
      ...clone(event),
      attackerName: nationName(runtime, event.nationId),
      defenderName: nationName(runtime, event.targetNationId),
      regionName: regionName(runtime, event.regionId),
    })),
  };
}
