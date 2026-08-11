const clone = (value) => structuredClone(value);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const REGIONAL_REPUTATION_SCHEMA_VERSION = 1;

function finiteNonNegative(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function normalizeAchievement(entry, index = 0) {
  const originRegionId = String(entry?.originRegionId ?? entry?.regionId ?? "unknown-region");
  const originVillageId = String(entry?.originVillageId ?? entry?.villageId ?? originRegionId);
  return {
    id: String(entry?.id ?? `regional-reputation-${index + 1}`),
    originRegionId,
    originVillageId,
    originVillageName: String(entry?.originVillageName ?? entry?.villageName ?? originVillageId),
    originNationId: entry?.originNationId == null ? null : String(entry.originNationId),
    label: String(entry?.label ?? "地域での功績"),
    merit: finiteNonNegative(entry?.merit),
    renown: finiteNonNegative(entry?.renown),
    turn: Number.isFinite(entry?.turn) ? entry.turn : 0,
    year: Number.isFinite(entry?.year) ? entry.year : null,
    month: Number.isFinite(entry?.month) ? entry.month : null,
  };
}

export function createRegionalReputationState(source = {}) {
  const achievements = Array.isArray(source?.achievements)
    ? source.achievements.map(normalizeAchievement).filter((entry) => entry.merit > 0 || entry.renown > 0)
    : [];
  return {
    schemaVersion: REGIONAL_REPUTATION_SCHEMA_VERSION,
    legacyMigrated: Boolean(source?.legacyMigrated),
    achievements: achievements.slice(0, 160),
  };
}

function currentOrigin(state) {
  const regionId = state?.generatedWorld?.expeditionRegionId
    ?? state?.player?.locationId
    ?? "unknown-region";
  const villageId = state?.player?.locationId ?? regionId;
  return {
    id: villageId,
    name: villageId,
    regionId,
    nationId: state?.generatedWorld?.playerNationId ?? state?.player?.affiliation?.nationId ?? null,
  };
}

function groupedSources(reputation) {
  const groups = new Map();
  reputation.achievements.forEach((entry) => {
    const key = `${entry.originRegionId}\u0000${entry.originVillageId}`;
    const source = groups.get(key) ?? {
      regionId: entry.originRegionId,
      villageId: entry.originVillageId,
      villageName: entry.originVillageName,
      nationId: entry.originNationId,
      merit: 0,
      renown: 0,
      achievements: 0,
      latestTurn: 0,
    };
    source.merit += entry.merit;
    source.renown += entry.renown;
    source.achievements += 1;
    source.latestTurn = Math.max(source.latestTurn, entry.turn);
    groups.set(key, source);
  });
  return [...groups.values()];
}

export function getReputationSpreadRadius(totalMerit) {
  return clamp(Math.floor(Math.sqrt(finiteNonNegative(totalMerit) / 12)), 0, 8);
}

function sourceLocalValue(source) {
  return Math.round(source.renown + Math.sqrt(source.merit) * 1.6);
}

function peakRegionalValue(reputation) {
  return groupedSources(reputation).reduce((peak, source) => Math.max(peak, sourceLocalValue(source)), 0);
}

export function normalizeRegionalReputationState(state) {
  if (!state?.player) return state;
  const reputation = createRegionalReputationState(state.player.regionalReputation);
  if (!reputation.legacyMigrated) {
    const legacyRenown = finiteNonNegative(state.player.metrics?.renown);
    if (!reputation.achievements.length && legacyRenown > 0) {
      const origin = currentOrigin(state);
      reputation.achievements.push(normalizeAchievement({
        id: "regional-reputation-legacy",
        originRegionId: origin.regionId,
        originVillageId: origin.id,
        originVillageName: origin.name,
        originNationId: origin.nationId,
        label: "既存の名声記録",
        merit: legacyRenown * 4,
        renown: legacyRenown,
        turn: state.turn ?? 0,
        year: state.year,
        month: state.month,
      }));
    }
    reputation.legacyMigrated = true;
  }
  state.player.regionalReputation = reputation;
  state.player.metrics ??= {};
  state.player.metrics.renown = peakRegionalValue(reputation);
  return state;
}

export function recordRegionalAchievement(state, place = {}, achievement = {}) {
  if (!state?.player) throw new Error("名声を記録する人物がいません。");
  normalizeRegionalReputationState(state);
  const origin = {
    ...currentOrigin(state),
    ...place,
  };
  const merit = finiteNonNegative(achievement.merit);
  const renown = finiteNonNegative(achievement.renown);
  if (merit <= 0 && renown <= 0) return null;
  const reputation = state.player.regionalReputation;
  const entry = normalizeAchievement({
    id: `regional-reputation-${state.turn ?? 0}-${reputation.achievements.length + 1}`,
    originRegionId: origin.regionId ?? origin.id,
    originVillageId: origin.villageId ?? origin.id ?? origin.regionId,
    originVillageName: origin.villageName ?? origin.name ?? origin.id ?? origin.regionId,
    originNationId: origin.nationId,
    label: achievement.label,
    merit,
    renown,
    turn: state.turn ?? 0,
    year: state.year,
    month: state.month,
  });
  reputation.achievements.unshift(entry);
  reputation.achievements = reputation.achievements.slice(0, 160);
  state.player.metrics.renown = peakRegionalValue(reputation);
  return clone(entry);
}

function regionEntries(regions) {
  if (regions instanceof Map) return [...regions.values()];
  return Array.isArray(regions) ? regions : [];
}

function regionDistance(fromRegionId, toRegionId, regions) {
  if (fromRegionId === toRegionId) return 0;
  const list = regionEntries(regions);
  if (!list.length) return Number.POSITIVE_INFINITY;
  const byId = new Map(list.map((region) => [region.id, region]));
  if (!byId.has(fromRegionId) || !byId.has(toRegionId)) return Number.POSITIVE_INFINITY;
  const visited = new Set([fromRegionId]);
  let frontier = [fromRegionId];
  let distance = 0;
  while (frontier.length) {
    distance += 1;
    const next = [];
    for (const regionId of frontier) {
      const region = byId.get(regionId);
      for (const neighborId of region?.neighborIds ?? []) {
        if (neighborId === toRegionId) return distance;
        if (!visited.has(neighborId) && byId.has(neighborId)) {
          visited.add(neighborId);
          next.push(neighborId);
        }
      }
    }
    frontier = next;
  }
  return Number.POSITIVE_INFINITY;
}

function recognitionLabel(value) {
  if (value <= 0) return "この地方では無名";
  if (value < 10) return "町で知られる";
  if (value < 25) return "地方の噂";
  if (value < 50) return "地方の名士";
  return "広域に知られる";
}

export function getRegionalReputationReport(state, context = {}) {
  const reputation = createRegionalReputationState(state?.player?.regionalReputation);
  const regionId = String(context.regionId ?? currentOrigin(state).regionId);
  const villageId = context.villageId == null ? null : String(context.villageId);
  const sources = groupedSources(reputation).map((source) => {
    const distance = regionDistance(source.regionId, regionId, context.regions);
    const spreadRadius = getReputationSpreadRadius(source.merit);
    const reachesRegion = Number.isFinite(distance) && distance <= spreadRadius;
    const sameVillage = villageId != null && source.villageId === villageId;
    const localFactor = sameVillage ? 1 : 0.78;
    const attenuation = distance === 0 ? localFactor : Math.pow(0.46, distance);
    const value = reachesRegion ? Math.max(1, Math.round(sourceLocalValue(source) * attenuation)) : 0;
    return {
      ...source,
      distance: Number.isFinite(distance) ? distance : null,
      spreadRadius,
      value,
      reachesRegion,
      sameVillage,
    };
  }).sort((left, right) => right.value - left.value || right.merit - left.merit);
  const value = clamp(sources.reduce((sum, source) => sum + source.value, 0), 0, 999);
  return {
    regionId,
    villageId,
    value,
    label: recognitionLabel(value),
    localMerit: sources.filter((source) => source.regionId === regionId).reduce((sum, source) => sum + source.merit, 0),
    knownSourceCount: sources.filter((source) => source.reachesRegion).length,
    sources,
  };
}
