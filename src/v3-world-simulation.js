import {
  advanceGeneratedWorldGeopolitics,
  advanceGeneratedWorldRegions,
  createGeneratedWorldState,
  declareGeneratedRegionIndependence,
  getGeneratedGeopoliticalView,
  getGeneratedWorldView,
  getGeneratedWorldWarView,
} from "./generated-world-system.js";
import { getRegionalDomainView } from "./regional-domain-system.js";
import { fnv1aCharacters, unitFromHash } from "./determinism.js";
import {
  createRaceDecisionWorldState,
  deriveNationDecisionProfile,
  preserveRaceDecisionWorldState,
} from "./race-decision-system.js";
import { deriveNationPolity } from "./world-polity-system.js";
import { UNIQUE_CHARACTERS } from "./unique-characters.js";
import {
  advanceV3ExternalCrises,
  applyV3ExternalCrisisConsequences,
  createV3ExternalCrisisState,
} from "./v3-external-crisis-system.js";

export const V3_WORLD_SIMULATION_VERSION = 3;
export const V3_PRESENT_DATE = Object.freeze({ year: 317, month: 4 });
export const V3_PREHISTORY_MONTHS = 50 * 12;
export const V3_PREHISTORY_REGIONAL_CADENCE_MONTHS = 4;
export const V3_HISTORY_SNAPSHOT_LIMIT = 120;

const simulationViewCache = new WeakMap();
const FIXED_WORLD_CHARACTERS = Object.freeze(Object.values(UNIQUE_CHARACTERS));

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));

function hashUnit(...parts) {
  return unitFromHash(fnv1aCharacters(parts.join("|")));
}

function periodFor(dateState) {
  return `${Number.isInteger(dateState?.year) ? dateState.year : V3_PRESENT_DATE.year}-${Number.isInteger(dateState?.month) ? dateState.month : V3_PRESENT_DATE.month}`;
}

function periodValue(period) {
  const [year, month] = String(period ?? "0-0").split("-").map(Number);
  return (Number.isFinite(year) ? year : 0) * 12 + (Number.isFinite(month) ? month : 0);
}

function addMonths(dateState, amount) {
  const absolute = (Number(dateState.year) * 12 + Number(dateState.month) - 1) + amount;
  return { year: Math.floor(absolute / 12), month: absolute % 12 + 1 };
}

function generatedStateFor(simulation) {
  return {
    scenarioMode: "generated",
    year: simulation.year,
    month: simulation.month,
    generatedWorld: simulation.generatedWorld,
  };
}

function compactPolity(polity) {
  if (!polity || typeof polity !== "object") return null;
  return {
    ...polity,
    officeTitles: { ...(polity.officeTitles ?? {}) },
    sovereignty: { ...(polity.sovereignty ?? {}) },
    modifiers: { ...(polity.modifiers ?? {}) },
    sourceReferenceIds: [...(polity.sourceReferenceIds ?? [])],
  };
}

function compactNation(nation) {
  return {
    id: nation.id,
    name: nation.name,
    shortName: nation.shortName ?? nation.name,
    color: nation.color,
    government: nation.government ?? "統治形態不明",
    polity: compactPolity(nation.polity),
    rulerTitle: nation.rulerTitle ?? nation.polity?.rulerTitle ?? null,
    capitalTitle: nation.capitalTitle ?? nation.polity?.capitalTitle ?? null,
    capitalName: nation.capitalName ?? null,
    peopleId: nation.peopleId ?? null,
    peopleName: nation.peopleName ?? "住民",
    regionCount: nation.regionIds?.length ?? nation.regionCount ?? 0,
    population: Math.round(Number(nation.settlementPopulation ?? nation.populationPotential) || 0),
    settlementCounts: {
      city: Math.max(0, Math.round(Number(nation.settlementCounts?.city) || 0)),
      town: Math.max(0, Math.round(Number(nation.settlementCounts?.town) || 0)),
      village: Math.max(0, Math.round(Number(nation.settlementCounts?.village) || 0)),
    },
    dissolved: Boolean(nation.dissolved),
  };
}

function compactRaceDynamics(source) {
  const preserved = preserveRaceDecisionWorldState(source);
  if (!preserved) return null;
  return { ...preserved, events: [] };
}

function ownershipSignature(regionOwners) {
  return Object.entries(regionOwners).sort(([left], [right]) => left.localeCompare(right))
    .map(([regionId, nationId]) => `${regionId}:${nationId}`).join("|");
}

function ownerForRegion(runtime, simulation, region) {
  return simulation.generatedWorld.regionalDomains?.regionStates?.[region.id]?.nationId ?? region.nationId;
}

function snapshotNations(runtime, simulation, regionOwners) {
  const polities = simulation.generatedWorld.regionalDomains?.independentPolities ?? {};
  const nationIds = [...new Set([...runtime.nations.nations.map((nation) => nation.id), ...Object.keys(polities)])];
  const objectById = new Map(runtime.nations.objects.map((object) => [object.id, object]));
  return nationIds.map((nationId) => {
    const regions = runtime.nations.regions.filter((region) => regionOwners[region.id] === nationId);
    const base = runtime.nationById.get(nationId)
      ?? runtime.nationById.get(regions[0]?.nationId)
      ?? runtime.nations.nations[0];
    const polity = polities[nationId];
    const population = regions.reduce((regionSum, region) => regionSum + region.settlementIds.reduce((sum, settlementId) => (
      sum + (simulation.generatedWorld.regionalDomains?.settlementStates?.[settlementId]?.population
        ?? objectById.get(settlementId)?.population ?? 0)
    ), 0), 0);
    const settlementLevels = regions.flatMap((region) => region.settlementIds).map((settlementId) => (
      simulation.generatedWorld.regionalDomains?.settlementStates?.[settlementId]?.level
        ?? objectById.get(settlementId)?.settlementLevel
    ));
    return compactNation({
      ...base,
      ...(polity ?? {}),
      id: nationId,
      name: polity?.name ?? base.name,
      shortName: polity?.shortName ?? base.shortName,
      color: polity?.color ?? base.color,
      government: polity?.government ?? base.government,
      peopleName: polity?.peopleName ?? base.peopleName,
      regionIds: regions.map((region) => region.id),
      settlementPopulation: population,
      settlementCounts: {
        city: settlementLevels.filter((level) => level === "city").length,
        town: settlementLevels.filter((level) => level === "town").length,
        village: settlementLevels.filter((level) => level === "village").length,
      },
      dissolved: regions.length === 0,
    });
  });
}

function snapshotCrises(simulation) {
  return (simulation.externalCrises?.activeCrises ?? []).map((crisis) => ({
    id: crisis.id,
    type: crisis.type,
    name: crisis.name,
    symbol: crisis.symbol,
    color: crisis.color,
    regionId: crisis.regionId,
    regionName: crisis.regionName,
    nationId: crisis.nationId,
    originTileIndex: crisis.originTileIndex,
    severity: crisis.severity,
    stage: crisis.stage,
    causes: [...(crisis.causes ?? [])],
  }));
}

function snapshotFor(runtime, simulation, reason = "年次記録", headline = null) {
  const regionOwners = Object.fromEntries(runtime.nations.regions.map((region) => [
    region.id,
    ownerForRegion(runtime, simulation, region),
  ]));
  const wars = (simulation.generatedWorld.worldWars?.activeWars ?? []).map((war) => ({
    id: war.id,
    attackerNationId: war.attackerNationId,
    defenderNationId: war.defenderNationId,
    targetRegionId: war.targetRegionId,
    phase: war.phase,
  }));
  return {
    period: periodFor(simulation),
    year: simulation.year,
    month: simulation.month,
    reason,
    headline,
    regionOwners,
    nations: snapshotNations(runtime, simulation, regionOwners),
    activeWars: wars,
    activeCrises: snapshotCrises(simulation),
    raceDynamics: compactRaceDynamics(simulation.generatedWorld.raceDynamics),
    signature: ownershipSignature(regionOwners),
  };
}

function appendSnapshot(history, snapshot) {
  const next = [...(history ?? [])];
  const duplicateIndex = next.findIndex((entry) => entry.period === snapshot.period && entry.signature === snapshot.signature);
  if (duplicateIndex >= 0) {
    const existing = next[duplicateIndex];
    const priority = { "世界成立": 5, "国境変動": 4, "年次記録": 3, "現在": 2 };
    const preserveExistingLabel = (priority[existing.reason] ?? 1) > (priority[snapshot.reason] ?? 1);
    next[duplicateIndex] = preserveExistingLabel
      ? { ...snapshot, reason: existing.reason, headline: existing.headline ?? snapshot.headline }
      : snapshot;
  }
  else next.push(snapshot);
  return next.sort((left, right) => periodValue(left.period) - periodValue(right.period)).slice(-V3_HISTORY_SNAPSHOT_LIMIT);
}

function normalizeSnapshot(runtime, source) {
  if (!source || typeof source !== "object" || typeof source.period !== "string") return null;
  const validRegionIds = new Set(runtime.nations.regions.map((region) => region.id));
  const regionOwners = Object.fromEntries(Object.entries(source.regionOwners ?? {}).filter(([regionId, nationId]) => (
    validRegionIds.has(regionId) && typeof nationId === "string"
  )));
  if (!Object.keys(regionOwners).length) return null;
  const nations = (Array.isArray(source.nations) ? source.nations : []).filter((nation) => nation && typeof nation.id === "string")
    .map((nation) => {
      const fallback = runtime.nationById.get(nation.id);
      const polity = compactPolity(nation.polity) ?? compactPolity(fallback?.polity);
      return {
        id: nation.id,
        name: String(nation.name ?? nation.id),
        shortName: String(nation.shortName ?? nation.name ?? nation.id),
        color: /^#[0-9a-f]{6}$/i.test(nation.color ?? "") ? nation.color : "#78837a",
        government: String(nation.government ?? fallback?.government ?? "統治形態不明"),
        polity,
        rulerTitle: String(nation.rulerTitle ?? polity?.rulerTitle ?? fallback?.rulerTitle ?? ""),
        capitalTitle: String(nation.capitalTitle ?? polity?.capitalTitle ?? fallback?.capitalTitle ?? ""),
        capitalName: String(nation.capitalName ?? fallback?.capitalName ?? ""),
        peopleId: String(nation.peopleId ?? fallback?.peopleId ?? "human"),
        peopleName: String(nation.peopleName ?? "住民"),
        regionCount: Math.max(0, Math.round(Number(nation.regionCount) || 0)),
        population: Math.max(0, Math.round(Number(nation.population) || 0)),
        settlementCounts: {
          city: Math.max(0, Math.round(Number(nation.settlementCounts?.city) || 0)),
          town: Math.max(0, Math.round(Number(nation.settlementCounts?.town) || 0)),
          village: Math.max(0, Math.round(Number(nation.settlementCounts?.village) || 0)),
        },
        dissolved: Boolean(nation.dissolved),
      };
    });
  const [fallbackYear, fallbackMonth] = source.period.split("-").map(Number);
  return {
    period: source.period,
    year: Number.isInteger(source.year) ? source.year : fallbackYear,
    month: Number.isInteger(source.month) ? source.month : fallbackMonth,
    reason: typeof source.reason === "string" ? source.reason : "年代記",
    headline: typeof source.headline === "string" ? source.headline : null,
    regionOwners,
    nations,
    activeWars: (Array.isArray(source.activeWars) ? source.activeWars : []).filter((war) => war && typeof war.id === "string").map((war) => ({
      id: war.id,
      attackerNationId: war.attackerNationId,
      defenderNationId: war.defenderNationId,
      targetRegionId: war.targetRegionId,
      phase: war.phase,
    })),
    activeCrises: (Array.isArray(source.activeCrises) ? source.activeCrises : []).filter((crisis) => (
      crisis && typeof crisis.id === "string" && typeof crisis.regionId === "string"
    )).map((crisis) => structuredClone(crisis)),
    raceDynamics: compactRaceDynamics(source.raceDynamics),
    signature: ownershipSignature(regionOwners),
  };
}

export function createV3WorldSimulation(runtime, options = {}, dateState = V3_PRESENT_DATE) {
  const date = {
    year: Number.isInteger(dateState?.year) ? dateState.year : V3_PRESENT_DATE.year,
    month: clamp(Math.round(dateState?.month ?? V3_PRESENT_DATE.month), 1, 12),
  };
  const generatedWorld = createGeneratedWorldState(options, date);
  generatedWorld.raceDynamics = createRaceDecisionWorldState(runtime, generatedWorld.raceDynamics, date, {
    fixedCharacters: FIXED_WORLD_CHARACTERS,
  });
  const externalCrises = createV3ExternalCrisisState(runtime, null, date, generatedWorld);
  const simulation = {
    version: V3_WORLD_SIMULATION_VERSION,
    year: date.year,
    month: date.month,
    elapsedMonths: 0,
    prehistoryMonths: 0,
    foundedPeriod: periodFor(date),
    generatedWorld,
    externalCrises,
    autonomyStrain: {},
    history: [],
  };
  simulation.history = [snapshotFor(runtime, simulation, "世界成立", `${runtime.nations.nations.length}国家が成立`)];
  return simulation;
}

export function normalizeV3WorldSimulation(runtime, options = {}, source = null) {
  if (!source || ![1, 2, V3_WORLD_SIMULATION_VERSION].includes(Number(source.version))) {
    return createV3WorldSimulation(runtime, options);
  }
  const date = {
    year: Number.isInteger(source.year) ? source.year : V3_PRESENT_DATE.year,
    month: clamp(Math.round(source.month ?? V3_PRESENT_DATE.month), 1, 12),
  };
  const generatedWorld = createGeneratedWorldState({ ...options, ...(source.generatedWorld ?? {}) }, date);
  generatedWorld.raceDynamics = createRaceDecisionWorldState(runtime, generatedWorld.raceDynamics, date, {
    fixedCharacters: FIXED_WORLD_CHARACTERS,
  });
  const externalCrises = createV3ExternalCrisisState(runtime, source.externalCrises, date, generatedWorld);
  const simulation = {
    version: V3_WORLD_SIMULATION_VERSION,
    year: date.year,
    month: date.month,
    elapsedMonths: Math.max(0, Math.round(Number(source.elapsedMonths) || 0)),
    prehistoryMonths: Math.max(0, Math.round(Number(source.prehistoryMonths) || 0)),
    foundedPeriod: typeof source.foundedPeriod === "string" ? source.foundedPeriod : periodFor(date),
    generatedWorld,
    externalCrises,
    autonomyStrain: Object.fromEntries(Object.entries(source.autonomyStrain ?? {}).filter(([regionId, value]) => (
      runtime.regionById.has(regionId) && Number.isFinite(Number(value))
    )).map(([regionId, value]) => [regionId, clamp(value, 0, 160)])),
    history: (Array.isArray(source.history) ? source.history : []).map((snapshot) => normalizeSnapshot(runtime, snapshot)).filter(Boolean)
      .sort((left, right) => periodValue(left.period) - periodValue(right.period)).slice(-V3_HISTORY_SNAPSHOT_LIMIT),
  };
  const current = snapshotFor(runtime, simulation, "現在", null);
  if (!simulation.history.length || simulation.history.at(-1).signature !== current.signature || simulation.history.at(-1).period !== current.period) {
    simulation.history = appendSnapshot(simulation.history, current);
  }
  return simulation;
}

function wrappedDistance(runtime, leftIndex, rightIndex) {
  const left = runtime.tiles[leftIndex];
  const right = runtime.tiles[rightIndex];
  if (!left || !right) return 0;
  let dx = Math.abs(left.x - right.x);
  if (runtime.terrain.config.wrapX) dx = Math.min(dx, runtime.terrain.width - dx);
  return Math.hypot(dx, left.y - right.y) / Math.max(1, Math.hypot(runtime.terrain.width / 2, runtime.terrain.height));
}

export function getV3SecessionCandidates(runtime, simulation) {
  if (simulation.month !== 1 || simulation.elapsedMonths < 10 * 12) return [];
  const independentCount = Object.keys(simulation.generatedWorld.regionalDomains?.independentPolities ?? {}).length;
  const maximumIndependentPolities = Math.max(2, Math.floor(runtime.nations.nations.length / 2));
  if (independentCount >= maximumIndependentPolities) return [];
  const candidates = [];
  for (const nation of runtime.nations.nations) {
    const ownedRegions = runtime.nations.regions.filter((region) => ownerForRegion(runtime, simulation, region) === nation.id);
    if (ownedRegions.length < 6) continue;
    const condition = simulation.generatedWorld.geopolitics?.nationStates?.[nation.id] ?? {};
    const capitalRegion = runtime.regionById.get(nation.capitalRegionId) ?? ownedRegions[0];
    const ranked = ownedRegions.filter((region) => region.id !== capitalRegion?.id).map((region) => {
      const distance = wrappedDistance(runtime, capitalRegion?.anchorIndex, region.anchorIndex);
      const occupied = region.nationId !== nation.id;
      const pressure = (ownedRegions.length - 4) * 4
        + (region.frontier ? 12 : 0)
        + distance * 28
        + Math.max(0, 60 - (condition.cohesion ?? 55)) * 0.7
        + Math.max(0, 45 - (condition.reserves ?? 45)) * 0.2
        + (occupied ? 20 : 0);
      return { nation, region, pressure, distance };
    }).sort((left, right) => right.pressure - left.pressure
      || hashUnit(simulation.generatedWorld.seed, periodFor(simulation), left.region.id, "autonomy-order")
        - hashUnit(simulation.generatedWorld.seed, periodFor(simulation), right.region.id, "autonomy-order"));
    const candidate = ranked[0];
    if (!candidate || candidate.pressure < 50) continue;
    const currentStrain = Number(simulation.autonomyStrain?.[candidate.region.id]) || 0;
    const variation = 0.85 + hashUnit(simulation.generatedWorld.seed, candidate.region.id, "autonomy-strain") * 0.3;
    const increment = Math.max(0, candidate.pressure - 42) * 0.18 * variation;
    candidates.push({ ...candidate, currentStrain, increment, projectedStrain: currentStrain + increment });
  }
  return candidates.sort((left, right) => right.projectedStrain - left.projectedStrain
    || right.pressure - left.pressure || left.region.id.localeCompare(right.region.id));
}

function maybeDeclareSecession(runtime, state, elapsedMonths, autonomyStrain) {
  const simulation = {
    version: V3_WORLD_SIMULATION_VERSION,
    year: state.year,
    month: state.month,
    elapsedMonths,
    generatedWorld: state.generatedWorld,
    autonomyStrain,
  };
  const candidates = getV3SecessionCandidates(runtime, simulation);
  const nextStrain = { ...(autonomyStrain ?? {}) };
  candidates.forEach((candidate) => { nextStrain[candidate.region.id] = Number(candidate.projectedStrain.toFixed(3)); });
  const candidate = candidates.find((entry) => entry.projectedStrain >= 100);
  if (!candidate) return { state, autonomyStrain: nextStrain, event: null };
  const shortRegionName = candidate.region.name.replace(/地方$/, "");
  const decisionProfile = deriveNationDecisionProfile(
    runtime,
    state.generatedWorld.raceDynamics,
    candidate.nation.id,
  );
  const polity = deriveNationPolity({
    peopleId: candidate.nation.peopleId ?? "human",
    stats: candidate.nation,
    nationLevel: Math.max(1, Math.round(Number(candidate.nation.nationLevel) || 2)),
    decisionTraits: decisionProfile?.traits ?? candidate.nation.foundingDecisionTraits ?? null,
  });
  const next = declareGeneratedRegionIndependence(state, candidate.region.id, {
    polityId: `v3-polity-${state.year}-${candidate.region.id}`,
    name: `${shortRegionName}自由領`,
    shortName: shortRegionName,
    government: polity.governmentName,
    officeTitle: polity.rulerTitle,
    polity,
    cause: "peripheral_secession",
  });
  return {
    state: next,
    autonomyStrain: Object.fromEntries(Object.entries(nextStrain).filter(([regionId]) => regionId !== candidate.region.id)),
    event: next.generatedWorld.regionalDomains.events.at(-1) ?? null,
  };
}

function latestTerritorialEvent(generatedWorld, period) {
  return [...(generatedWorld.regionalDomains?.events ?? [])].reverse().find((event) => (
    event.period === period && ["regional_control_change", "regional_independence"].includes(event.type)
  )) ?? null;
}

function advanceOneMonth(runtime, simulation, options = {}) {
  const previousSignature = simulation.history.at(-1)?.signature ?? "";
  const date = addMonths(simulation, 1);
  let state = {
    scenarioMode: "generated",
    year: date.year,
    month: date.month,
    generatedWorld: simulation.generatedWorld,
  };
  const regionalCadence = clamp(Math.round(options.regionalCadence ?? 1), 1, 12);
  if ((simulation.elapsedMonths + 1) % regionalCadence === 0) state = advanceGeneratedWorldRegions(state);
  state = advanceGeneratedWorldGeopolitics(state);
  const externalCrises = advanceV3ExternalCrises(runtime, simulation.externalCrises, date, state.generatedWorld);
  state.generatedWorld = applyV3ExternalCrisisConsequences(runtime, state.generatedWorld, externalCrises, date);
  const elapsedMonths = simulation.elapsedMonths + 1;
  const secession = maybeDeclareSecession(runtime, state, elapsedMonths, simulation.autonomyStrain);
  state = secession.state;
  const next = {
    ...simulation,
    year: state.year,
    month: state.month,
    elapsedMonths,
    generatedWorld: state.generatedWorld,
    externalCrises,
    autonomyStrain: secession.autonomyStrain,
  };
  const currentPeriod = periodFor(next);
  const territorialEvent = secession.event ?? latestTerritorialEvent(next.generatedWorld, currentPeriod);
  const annual = elapsedMonths % 12 === 0;
  const currentSnapshot = snapshotFor(runtime, next, territorialEvent ? "国境変動" : annual ? "年次記録" : "現在", territorialEvent?.title ?? null);
  if (territorialEvent || annual || currentSnapshot.signature !== previousSignature) {
    next.history = appendSnapshot(next.history, currentSnapshot);
  }
  return next;
}

export function advanceV3WorldSimulation(runtime, source, months = 1) {
  let simulation = normalizeV3WorldSimulation(runtime, source?.generatedWorld ?? {}, source);
  const count = clamp(Math.round(months), 0, 120);
  for (let index = 0; index < count; index += 1) simulation = advanceOneMonth(runtime, simulation);
  const current = snapshotFor(runtime, simulation, "現在", null);
  simulation.history = appendSnapshot(simulation.history.filter((snapshot) => snapshot.reason !== "現在"), current);
  return simulation;
}

function yieldFrame() {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === "function") globalThis.requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export async function buildV3WorldPrehistory(runtime, options = {}, config = {}) {
  const months = clamp(Math.round(config.months ?? V3_PREHISTORY_MONTHS), 0, V3_PREHISTORY_MONTHS);
  const start = addMonths(V3_PRESENT_DATE, -months);
  let simulation = createV3WorldSimulation(runtime, options, start);
  for (let index = 0; index < months; index += 1) {
    simulation = advanceOneMonth(runtime, simulation, { regionalCadence: V3_PREHISTORY_REGIONAL_CADENCE_MONTHS });
    if ((index + 1) % 12 === 0 || index + 1 === months) {
      config.onProgress?.({
        completed: index + 1,
        total: months,
        progress: months ? (index + 1) / months : 1,
        year: simulation.year,
        month: simulation.month,
      });
      await yieldFrame();
    }
  }
  simulation.prehistoryMonths = months;
  const current = snapshotFor(runtime, simulation, "現在", "冒険者が世界へ降り立つ");
  simulation.history = appendSnapshot(simulation.history.filter((snapshot) => snapshot.reason !== "現在"), current);
  return simulation;
}

function historicalMapView(runtime, snapshot) {
  const nationById = new Map(snapshot.nations.map((nation) => [nation.id, nation]));
  const regionById = new Map(runtime.nations.regions.map((region) => [region.id, {
    ...region,
    originalNationId: region.nationId,
    nationId: snapshot.regionOwners[region.id] ?? region.nationId,
  }]));
  const tileNationIds = runtime.nations.tileRegionIds.map((regionId) => regionById.get(regionId)?.nationId ?? null);
  const objects = runtime.nations.objects.map((object) => ({
    ...object,
    nationId: regionById.get(object.regionId)?.nationId ?? object.nationId,
  }));
  const borderSegments = (runtime.nations.regionBorderSegments ?? []).filter((segment) => {
    const [leftId, rightId] = segment.regions.map((regionId) => regionById.get(regionId)?.nationId ?? null);
    return leftId !== rightId;
  }).map((segment) => ({
    ...segment,
    nations: segment.regions.map((regionId) => regionById.get(regionId)?.nationId ?? null),
  }));
  return {
    period: snapshot.period,
    year: snapshot.year,
    month: snapshot.month,
    isCurrent: false,
    reason: snapshot.reason,
    headline: snapshot.headline,
    tileNationIds,
    nations: snapshot.nations.filter((nation) => !nation.dissolved),
    nationById,
    regionById,
    objects,
    roads: runtime.nations.roads ?? [],
    borderSegments,
    activeWars: snapshot.activeWars,
    activeCrises: snapshot.activeCrises ?? [],
    raceDynamics: snapshot.raceDynamics,
  };
}

function currentMapView(runtime, simulation) {
  const domains = getRegionalDomainView(runtime, simulation.generatedWorld.regionalDomains, simulation);
  const state = generatedStateFor(simulation);
  const wars = getGeneratedWorldWarView(state);
  return {
    period: periodFor(simulation),
    year: simulation.year,
    month: simulation.month,
    isCurrent: true,
    reason: "現在",
    headline: null,
    tileNationIds: domains.nationMap.tileNationIds,
    nations: domains.nationMap.nations.filter((nation) => !nation.dissolved),
    nationById: domains.nationById,
    regionById: domains.regionById,
    objects: domains.nationMap.objects,
    roads: domains.nationMap.roads,
    borderSegments: domains.nationMap.borderSegments,
    activeWars: wars.activeWars,
    activeCrises: simulation.externalCrises?.activeCrises ?? [],
    raceDynamics: simulation.generatedWorld.raceDynamics,
  };
}

export function getV3WorldSimulationView(runtime, simulation, historyIndex = null) {
  if (Number.isInteger(historyIndex) && historyIndex >= 0 && historyIndex < simulation.history.length - 1) {
    return historicalMapView(runtime, simulation.history[historyIndex]);
  }
  const cached = simulationViewCache.get(simulation);
  if (cached) return cached;
  const view = currentMapView(runtime, simulation);
  simulationViewCache.set(simulation, view);
  return view;
}

export function getV3NationIdentity(runtime, simulation, nationId) {
  if (!nationId) return null;
  const polity = simulation.generatedWorld.regionalDomains?.independentPolities?.[nationId];
  return polity ?? runtime.nationById.get(nationId) ?? null;
}

export function getV3NationAtTile(runtime, simulation, tileIndex) {
  const regionId = runtime.nations.tileRegionIds[tileIndex] ?? runtime.tiles[tileIndex]?.regionId;
  const nationId = simulation.generatedWorld.regionalDomains?.regionStates?.[regionId]?.nationId
    ?? runtime.regionById.get(regionId)?.nationId ?? null;
  return getV3NationIdentity(runtime, simulation, nationId);
}

export function getV3NationDossier(runtime, simulation, nationId, historyIndex = null) {
  const map = getV3WorldSimulationView(runtime, simulation, historyIndex);
  const nation = map.nationById.get(nationId);
  if (!nation) return null;
  const regions = [...map.regionById.values()].filter((region) => region.nationId === nationId);
  const settlements = map.objects.filter((object) => object.nationId === nationId && object.settlementLevel);
  const neighbors = [...new Set(map.borderSegments.flatMap((segment) => segment.nations?.includes(nationId)
    ? segment.nations.filter((id) => id && id !== nationId) : []))].map((id) => map.nationById.get(id)).filter(Boolean);
  const wars = map.activeWars.filter((war) => war.attackerNationId === nationId || war.defenderNationId === nationId);
  const crises = (map.activeCrises ?? []).filter((crisis) => crisis.nationId === nationId || regions.some((region) => region.id === crisis.regionId));
  let condition = null;
  let relations = [];
  let latestAction = null;
  const decisionProfile = deriveNationDecisionProfile(runtime, map.raceDynamics, nationId, {
    ...nation,
    regionIds: regions.map((region) => region.id),
  });
  if (map.isCurrent) {
    const geopolitics = getGeneratedGeopoliticalView(generatedStateFor(simulation));
    condition = geopolitics.geopolitics.nationStates[nationId] ?? null;
    relations = geopolitics.relations.filter((relation) => relation.nationIds.includes(nationId));
    latestAction = geopolitics.events.find((event) => event.nationId === nationId) ?? null;
  }
  const currentSettlementCounts = {
    city: settlements.filter((object) => object.settlementLevel === "city").length,
    town: settlements.filter((object) => object.settlementLevel === "town").length,
    village: settlements.filter((object) => object.settlementLevel === "village").length,
  };
  return {
    nation,
    regions,
    settlements,
    neighbors,
    wars,
    crises,
    condition,
    relations,
    latestAction,
    decisionProfile,
    population: map.isCurrent
      ? regions.reduce((sum, region) => sum + (Number(region.population) || 0), 0) || Number(nation.population) || 0
      : Number(nation.population) || 0,
    settlementCounts: map.isCurrent ? currentSettlementCounts : nation.settlementCounts ?? currentSettlementCounts,
    isHistorical: !map.isCurrent,
  };
}

function eventImportance(event) {
  if (["regional_independence", "regional_control_change"].includes(event.type)) return 5;
  if (/侵攻|停戦|併合|崩壊|独立/.test(event.title ?? "")) return 4;
  if (event.type === "generated_world_war") return 2;
  if (event.type === "external_crisis") return ["started", "escalated"].includes(event.outcome) ? 4 : 3;
  if (["war_started", "ceasefire_accepted", "alliance_formed"].includes(event.outcome)) return 3;
  return 1;
}

export function getV3WorldChronicle(runtime, simulation, limit = 80) {
  const state = generatedStateFor(simulation);
  const map = getV3WorldSimulationView(runtime, simulation);
  const nameForNation = (nationId) => map.nationById.get(nationId)?.name
    ?? simulation.generatedWorld.regionalDomains?.independentPolities?.[nationId]?.name
    ?? runtime.nationById.get(nationId)?.name ?? "不明勢力";
  const regionName = (regionId) => map.regionById.get(regionId)?.name ?? runtime.regionById.get(regionId)?.name ?? "不明地方";
  const domainEvents = (simulation.generatedWorld.regionalDomains?.events ?? [])
    .filter((event) => ["regional_independence", "regional_control_change"].includes(event.type))
    .map((event) => ({
      ...event,
      summary: event.type === "regional_independence"
        ? `${regionName(event.regionId)}が${nameForNation(event.fromNationId)}から離脱し、${nameForNation(event.toNationId)}を樹立した。`
        : `${regionName(event.regionId)}の支配が${nameForNation(event.fromNationId)}から${nameForNation(event.toNationId)}へ移った。`,
    }));
  const warEvents = getGeneratedWorldWarView(state).events;
  const politicalEvents = getGeneratedGeopoliticalView(state).events;
  const externalEvents = simulation.externalCrises?.events ?? [];
  const unique = new Map();
  [...politicalEvents, ...warEvents, ...domainEvents, ...externalEvents].forEach((event) => {
    if (event?.id && event?.period) unique.set(event.id, { ...event, importance: eventImportance(event) });
  });
  const maximum = clamp(Math.round(limit), 1, 240);
  const sorted = [...unique.values()].sort((left, right) => periodValue(right.period) - periodValue(left.period)
    || right.importance - left.importance || left.id.localeCompare(right.id));
  const retained = new Map([
    ...sorted.slice(0, Math.max(1, maximum - 24)),
    ...sorted.filter((event) => event.importance >= 4).slice(0, 24),
  ].map((event) => [event.id, event]));
  return [...retained.values()].sort((left, right) => periodValue(right.period) - periodValue(left.period)
    || right.importance - left.importance || left.id.localeCompare(right.id)).slice(0, maximum);
}
