export const SIMULATION_FIDELITY_SCHEMA_VERSION = 1;
export const MAX_REMOTE_INDIVIDUAL_REGIONS_PER_MONTH = 6;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function periodSerial(state) {
  const year = Number.isInteger(state?.year) ? state.year : 317;
  const month = Number.isInteger(state?.month) ? state.month : 4;
  return year * 12 + month - 1;
}

function hashInteger(...parts) {
  let hash = 2166136261;
  for (const character of parts.join("|") ) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function graphDistances(runtime, origins) {
  const distances = new Map();
  const queue = [];
  for (const id of origins) {
    if (!runtime.regionById.has(id) || distances.has(id)) continue;
    distances.set(id, 0);
    queue.push(id);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    const distance = distances.get(id);
    for (const neighborId of runtime.regionById.get(id)?.neighborIds ?? []) {
      if (!runtime.regionById.has(neighborId) || distances.has(neighborId)) continue;
      distances.set(neighborId, distance + 1);
      queue.push(neighborId);
    }
  }
  return distances;
}

function playerFocusRegionIds(state, world) {
  const { runtime, generatedState, expeditionRegion } = world;
  const direct = new Set([
    expeditionRegion?.id,
    ...(state.player?.generatedRegionalOffices ?? []).map((office) => office.regionId),
  ].filter(Boolean));
  const playerId = state.player?.id;
  const domains = generatedState.regionalDomains;
  for (const region of runtime.nations.regions) {
    const regionalState = domains?.regionStates?.[region.id];
    if (playerId && regionalState?.lordId === playerId) direct.add(region.id);
    if (regionalState?.nationId === "player_realm") direct.add(region.id);
  }
  const expanded = new Set(direct);
  for (const regionId of direct) {
    for (const neighborId of runtime.regionById.get(regionId)?.neighborIds ?? []) expanded.add(neighborId);
  }
  return expanded;
}

function intervalFor(region) {
  const population = Math.max(0, Number(region.population) || 0);
  let interval = population >= 20000 ? 2 : population >= 5000 ? 3 : population > 0 ? 4 : 6;
  if (region.frontier) interval += 1;
  if (Number(region.movementCost) >= 3) interval += 1;
  return clamp(interval, 2, 6);
}

export function buildSimulationFidelityPlan(state, world, options = {}) {
  if (!world?.runtime?.nations?.regions || !world.runtime.regionById) {
    throw new TypeError("Simulation fidelity requires an effective generated-world view.");
  }
  const maximum = clamp(Number(options.maximumRemoteRegions) || MAX_REMOTE_INDIVIDUAL_REGIONS_PER_MONTH, 1, 24);
  const serial = periodSerial(state);
  const seed = world.runtime.terrain?.seed ?? world.generatedState?.seed ?? "world";
  const full = playerFocusRegionIds(state, world);
  const populated = new Set(world.runtime.nations.regions.filter((region) => Number(region.population) > 0).map((region) => region.id));
  const distanceFromPopulation = graphDistances(world.runtime, populated);
  const sampled = [];
  const policyOnly = [];
  const schedule = {};

  for (const region of world.runtime.nations.regions) {
    if (full.has(region.id)) {
      schedule[region.id] = { tier: "full", intervalMonths: 1 };
      continue;
    }
    const uninhabitedAndRemote = Number(region.population) <= 0 && (distanceFromPopulation.get(region.id) ?? Infinity) > 1;
    if (uninhabitedAndRemote) {
      policyOnly.push(region.id);
      schedule[region.id] = { tier: "policy_only", intervalMonths: null };
      continue;
    }
    const intervalMonths = intervalFor(region);
    const phase = hashInteger(seed, region.id, "individual-simulation") % intervalMonths;
    const due = serial % intervalMonths === phase;
    sampled.push({ id: region.id, intervalMonths, due, priority: hashInteger(seed, serial, region.id) });
    schedule[region.id] = { tier: "sampled", intervalMonths };
  }

  const due = sampled.filter((entry) => entry.due)
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  const activeSampled = due.slice(0, maximum).map((entry) => entry.id);
  const active = new Set([...full, ...activeSampled]);
  const deferred = sampled.map((entry) => entry.id).filter((id) => !active.has(id));
  const playerControlledNationIds = [...new Set(world.runtime.nations.regions
    .map((region) => world.generatedState.regionalDomains?.regionStates?.[region.id]?.nationId)
    .filter((nationId) => nationId === "player_realm"))];

  return {
    schemaVersion: SIMULATION_FIDELITY_SCHEMA_VERSION,
    period: `${state.year}-${state.month}`,
    maximumRemoteRegions: maximum,
    fullRegionIds: [...full].sort(),
    activeIndividualRegionIds: [...active].sort(),
    sampledRegionIds: sampled.map((entry) => entry.id).sort(),
    policyOnlyRegionIds: policyOnly.sort(),
    deferredIndividualRegionIds: deferred.sort(),
    playerControlledNationIds,
    schedule,
  };
}

export function preserveSimulationFidelityPlan(source) {
  if (!source || typeof source !== "object") return null;
  return {
    schemaVersion: SIMULATION_FIDELITY_SCHEMA_VERSION,
    period: typeof source.period === "string" ? source.period : null,
    maximumRemoteRegions: clamp(Number(source.maximumRemoteRegions) || MAX_REMOTE_INDIVIDUAL_REGIONS_PER_MONTH, 1, 24),
    fullRegionIds: [...new Set((source.fullRegionIds ?? []).filter((id) => typeof id === "string"))],
    activeIndividualRegionIds: [...new Set((source.activeIndividualRegionIds ?? []).filter((id) => typeof id === "string"))],
    sampledRegionIds: [...new Set((source.sampledRegionIds ?? []).filter((id) => typeof id === "string"))],
    policyOnlyRegionIds: [...new Set((source.policyOnlyRegionIds ?? []).filter((id) => typeof id === "string"))],
    deferredIndividualRegionIds: [...new Set((source.deferredIndividualRegionIds ?? []).filter((id) => typeof id === "string"))],
    playerControlledNationIds: [...new Set((source.playerControlledNationIds ?? []).filter((id) => typeof id === "string"))],
    schedule: Object.fromEntries(Object.entries(source.schedule ?? {}).filter(([, value]) => value && typeof value.tier === "string")),
  };
}
