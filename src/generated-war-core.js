export const GENERATED_WAR_MAX_FRONTS = 5;

export const GENERATED_WAR_ATTACK_PROGRESS = Object.freeze({
  probe: 0,
  advance: 4,
  cut_supply: -1,
  assault: 9,
  pause: -7,
});

export const GENERATED_WAR_DEFENSE_PROGRESS = Object.freeze({
  fortify: -5,
  counterattack: -1,
  elastic_defense: -3,
  scorched_delay: -4,
});

const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));

export function normalizeGeneratedWarForce(source = {}) {
  const initialStrength = Math.max(1, Math.round(Number(source.initialStrength) || Number(source.strength) || 1));
  const storedStrength = Number(source.strength);
  return {
    initialStrength,
    strength: Math.max(0, Math.round(Number.isFinite(storedStrength) ? storedStrength : initialStrength)),
    supply: Math.round(clamp(source.supply ?? 50)),
    morale: Math.round(clamp(source.morale ?? 50)),
    casualties: Math.max(0, Math.round(Number(source.casualties) || 0)),
  };
}

export function normalizeGeneratedWarFront(source = {}, index = 0) {
  return {
    id: typeof source.id === "string" ? source.id : `front-${index + 1}`,
    name: typeof source.name === "string" ? source.name : index ? `第${index + 1}正面` : "主攻正面",
    originRegionId: typeof source.originRegionId === "string" ? source.originRegionId : null,
    targetRegionId: typeof source.targetRegionId === "string" ? source.targetRegionId : null,
    routeRegionIds: Array.isArray(source.routeRegionIds) ? [...source.routeRegionIds].filter((id) => typeof id === "string") : [],
    commanderId: typeof source.commanderId === "string" ? source.commanderId : null,
    progress: Math.round(clamp(source.progress ?? 0)),
    status: typeof source.status === "string" ? source.status : "forming",
    attackerLosses: Math.max(0, Math.round(Number(source.attackerLosses) || 0)),
    defenderLosses: Math.max(0, Math.round(Number(source.defenderLosses) || 0)),
    attackerActionId: typeof source.attackerActionId === "string" ? source.attackerActionId : null,
    defenderActionId: typeof source.defenderActionId === "string" ? source.defenderActionId : null,
  };
}

export function createGeneratedWarFronts(targets, options = {}) {
  const maximum = Math.min(GENERATED_WAR_MAX_FRONTS, Math.max(1, Number(options.maximum) || GENERATED_WAR_MAX_FRONTS));
  const commanders = options.commanderIds ?? [];
  return targets.slice(0, maximum).map((entry, index) => normalizeGeneratedWarFront({
    id: index ? `front-${index + 1}` : "main",
    name: index ? `第${index + 1}正面` : "主攻正面",
    originRegionId: entry.origin?.id ?? entry.originRegionId,
    targetRegionId: entry.target?.id ?? entry.targetRegionId,
    routeRegionIds: entry.routeRegionIds ?? [entry.origin?.id ?? entry.originRegionId, entry.target?.id ?? entry.targetRegionId].filter(Boolean),
    commanderId: commanders[index] ?? commanders.at(-1) ?? null,
    progress: 0,
    status: "forming",
  }, index));
}

export function resolveGeneratedWarFronts(fronts, options = {}) {
  const strengthRatio = Math.max(0.05, Number(options.strengthRatio) || 1);
  const attackActionId = options.attackerActionId ?? "advance";
  const defenseActionId = options.defenderActionId ?? "fortify";
  let attackerLosses = 0;
  let defenderLosses = 0;
  const resolvedFronts = fronts.map((source, index) => {
    const front = normalizeGeneratedWarFront(source, index);
    const terrainDefense = Math.min(14, (Number(options.terrainDefense?.(front)) || 0));
    const jitter = Number(options.jitter?.(front)) || 0;
    const doctrineAttack = Number(options.doctrineAttack) || 0;
    const doctrineDefense = Number(options.doctrineDefense) || 0;
    const progressDelta = Math.round(clamp(
      10 + (strengthRatio - 1) * 24 + doctrineAttack - doctrineDefense - terrainDefense
        + (GENERATED_WAR_ATTACK_PROGRESS[attackActionId] ?? 0)
        + (GENERATED_WAR_DEFENSE_PROGRESS[defenseActionId] ?? 0) + jitter,
      -8,
      34,
    ));
    const intensity = 14 + Math.abs(progressDelta) * 0.38 + (index ? -2 : 2);
    const attackerLoss = Math.max(3, Math.round(intensity + (attackActionId === "assault" ? 11 : attackActionId === "pause" ? -7 : 0)
      + (defenseActionId === "counterattack" ? 8 : defenseActionId === "elastic_defense" ? -3 : 0)
      + Math.max(0, 1 - strengthRatio) * 12));
    const defenderLoss = Math.max(3, Math.round(intensity + Math.max(0, strengthRatio - 0.85) * 14
      + (attackActionId === "assault" ? 5 : 0) - (defenseActionId === "elastic_defense" ? 3 : 0)));
    front.progress = Math.round(clamp(front.progress + progressDelta));
    front.status = front.progress >= 100 ? "breached" : front.progress >= 65 ? "pressured" : front.progress >= 30 ? "contested" : "holding";
    front.attackerLosses += attackerLoss;
    front.defenderLosses += defenderLoss;
    front.attackerActionId = attackActionId;
    front.defenderActionId = defenseActionId;
    attackerLosses += attackerLoss;
    defenderLosses += defenderLoss;
    return front;
  });
  return { fronts: resolvedFronts, attackerLosses, defenderLosses };
}
