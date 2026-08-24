import { fnv1aUtf16, unitFromHash } from "./determinism.js";
import {
  getRaceCategory,
  getRaceDefinition,
  RACE_DECISION_TRAIT_IDS,
} from "./race-list.js";

export const RACE_DECISION_SCHEMA_VERSION = 2;
export const RACE_DECISION_EVENT_LIMIT = 192;

export const POPULATION_GROUP_DIMENSIONS = Object.freeze({
  regional: Object.freeze({ id: "regional", name: "地方" }),
  socialClass: Object.freeze({ id: "socialClass", name: "階級" }),
  faith: Object.freeze({ id: "faith", name: "信仰" }),
});

const POPULATION_GROUP_DIMENSION_IDS = Object.freeze(Object.keys(POPULATION_GROUP_DIMENSIONS));

const SOCIAL_CLASS_GROUPS = Object.freeze([
  Object.freeze({ id: "class:commoner", name: "生活共同体", weight: 0.62, temperamentBias: { submissive: 1.12, cooperative: 1.08 } }),
  Object.freeze({ id: "class:merchant", name: "交易・職能層", weight: 0.16, temperamentBias: { cooperative: 1.34, independent: 1.08 } }),
  Object.freeze({ id: "class:warrior", name: "軍務層", weight: 0.14, temperamentBias: { militant: 1.58, independent: 1.12 } }),
  Object.freeze({ id: "class:elite", name: "統治・有力層", weight: 0.08, temperamentBias: { militant: 1.12, submissive: 1.3 } }),
]);

const FAITH_GROUPS = Object.freeze([
  Object.freeze({ id: "faith:ancestral", name: "祖霊・在地信仰", weight: 0.46, temperamentBias: { cooperative: 1.08, independent: 1.2 } }),
  Object.freeze({ id: "faith:institutional", name: "制度宗派", weight: 0.34, temperamentBias: { submissive: 1.32, cooperative: 1.06 } }),
  Object.freeze({ id: "faith:reformist", name: "改革・新興信仰", weight: 0.2, temperamentBias: { militant: 1.14, cooperative: 1.2, independent: 1.18 } }),
]);

export const DECISION_TRAITS = Object.freeze({
  militarism: Object.freeze({ id: "militarism", name: "武断性", negative: "協調的", positive: "武力・強制的" }),
  authority: Object.freeze({ id: "authority", name: "権威性", negative: "平等・合議", positive: "階級・服従" }),
  centralization: Object.freeze({ id: "centralization", name: "集権性", negative: "分権", positive: "集権" }),
  openness: Object.freeze({ id: "openness", name: "開放性", negative: "排他", positive: "開放" }),
  ambition: Object.freeze({ id: "ambition", name: "野心", negative: "現状維持", positive: "拡大志向" }),
  pragmatism: Object.freeze({ id: "pragmatism", name: "現実性", negative: "信念・感情重視", positive: "実利・現実重視" }),
});

export const TEMPERAMENTS = Object.freeze({
  militant: Object.freeze({
    id: "militant",
    name: "強硬型",
    traits: Object.freeze({ militarism: 34, authority: 12, centralization: 5, openness: -12, ambition: 24, pragmatism: -6 }),
    casualtyRisk: 1.9,
  }),
  submissive: Object.freeze({
    id: "submissive",
    name: "服従型",
    traits: Object.freeze({ militarism: -28, authority: 26, centralization: 10, openness: -5, ambition: -24, pragmatism: 26 }),
    casualtyRisk: 0.46,
  }),
  cooperative: Object.freeze({
    id: "cooperative",
    name: "協調型",
    traits: Object.freeze({ militarism: -24, authority: -18, centralization: -8, openness: 32, ambition: -5, pragmatism: 18 }),
    casualtyRisk: 0.72,
  }),
  independent: Object.freeze({
    id: "independent",
    name: "自立型",
    traits: Object.freeze({ militarism: 5, authority: -32, centralization: -38, openness: 2, ambition: 20, pragmatism: -5 }),
    casualtyRisk: 1.08,
  }),
});

export const TEMPERAMENT_IDS = Object.freeze(Object.keys(TEMPERAMENTS));
export const SOCIAL_EXPERIENCE_IDS = Object.freeze(["war", "domination", "persecution", "prosperity", "contact"]);

export const ROLE_TRAIT_MODIFIERS = Object.freeze({
  citizen: Object.freeze({ militarism: 0, authority: 0, centralization: 0, openness: 0, ambition: 0, pragmatism: 0 }),
  ruler: Object.freeze({ militarism: 2, authority: 8, centralization: 6, openness: 0, ambition: 7, pragmatism: 5 }),
  commander: Object.freeze({ militarism: 12, authority: 8, centralization: 5, openness: -3, ambition: 5, pragmatism: 4 }),
  diplomat: Object.freeze({ militarism: -8, authority: -2, centralization: 0, openness: 12, ambition: 2, pragmatism: 8 }),
  local_leader: Object.freeze({ militarism: 0, authority: -4, centralization: -10, openness: 2, ambition: 4, pragmatism: 6 }),
});

const DEFAULT_EXPERIENCE = Object.freeze({ war: 0, domination: 0, persecution: 0, prosperity: 0, contact: 0 });
const DEFAULT_TEMPERAMENT_SHARES = Object.freeze({ militant: 25, submissive: 25, cooperative: 25, independent: 25 });
const ELF_TEMPERAMENT_SHARES = Object.freeze({ militant: 20, submissive: 25, cooperative: 35, independent: 20 });
const MAX_AGENDAS = 24;

const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const clampTrait = (value) => Math.round(clamp(value, -100, 100));
const fixed = (value, digits = 3) => Number((Number(value) || 0).toFixed(digits));

function periodFor(dateState) {
  const year = Number.isInteger(dateState?.year) ? dateState.year : 317;
  const month = Number.isInteger(dateState?.month) ? dateState.month : 4;
  return `${year}-${month}`;
}

function hashUnit(...parts) {
  return unitFromHash(fnv1aUtf16(parts.join("|")));
}

function traitRecord(source = {}) {
  return Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [id, clampTrait(source[id])]));
}

function offsetRecord(source = {}, limit = 100) {
  return Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [
    id,
    Math.round(clamp(source[id], -limit, limit)),
  ]));
}

function experienceRecord(source = {}) {
  return Object.fromEntries(SOCIAL_EXPERIENCE_IDS.map((id) => [id, fixed(clamp(source[id]), 2)]));
}

function normalizedPeopleDefinition(peopleId) {
  const definition = getRaceDefinition(peopleId) ?? getRaceCategory(peopleId) ?? getRaceDefinition("human");
  return {
    id: peopleId ?? definition.id,
    name: definition.name ?? peopleId ?? "住民",
    decisionTraits: traitRecord(definition.decisionTraits),
    fertility: Number.isFinite(Number(definition.fertility)) ? Number(definition.fertility) : 1,
    sourceKind: getRaceDefinition(peopleId) ? "race" : getRaceCategory(peopleId) ? "category" : "fallback",
  };
}

export function getPeopleDecisionDefinition(peopleId) {
  return Object.freeze(normalizedPeopleDefinition(peopleId));
}

export function deriveSeededRaceBaseTraits(peopleId, seed, jitter = 10) {
  const definition = normalizedPeopleDefinition(peopleId);
  const spread = clamp(jitter, 0, 15);
  return Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => {
    const delta = (hashUnit(seed, peopleId, "race-base", id) - 0.5) * spread * 2;
    return [id, clampTrait(definition.decisionTraits[id] + delta)];
  }));
}

function initialTemperamentShares(peopleId, baseTraits, seed) {
  const standard = peopleId === "elf" ? ELF_TEMPERAMENT_SHARES : DEFAULT_TEMPERAMENT_SHARES;
  const weights = {
    militant: standard.militant + baseTraits.militarism * 0.15 + baseTraits.ambition * 0.1 + baseTraits.authority * 0.04,
    submissive: standard.submissive - baseTraits.militarism * 0.1 - baseTraits.ambition * 0.08
      + baseTraits.authority * 0.12 + baseTraits.pragmatism * 0.05,
    cooperative: standard.cooperative - baseTraits.militarism * 0.1 + baseTraits.openness * 0.15
      - baseTraits.authority * 0.07 + baseTraits.pragmatism * 0.05,
    independent: standard.independent - baseTraits.authority * 0.11 - baseTraits.centralization * 0.14
      + baseTraits.ambition * 0.08,
  };
  for (const id of TEMPERAMENT_IDS) {
    weights[id] = clamp(weights[id] + (hashUnit(seed, peopleId, "temperament", id) - 0.5) * 7, 8, 60);
  }
  const total = TEMPERAMENT_IDS.reduce((sum, id) => sum + weights[id], 0);
  return Object.fromEntries(TEMPERAMENT_IDS.map((id) => [id, weights[id] / total]));
}

function normalizeTemperamentPopulation(source, population) {
  const target = Math.max(1, fixed(population, 3));
  const weights = Object.fromEntries(TEMPERAMENT_IDS.map((id) => [id, Math.max(0, Number(source?.[id]) || 0)]));
  let sum = TEMPERAMENT_IDS.reduce((total, id) => total + weights[id], 0);
  if (sum <= 0) {
    TEMPERAMENT_IDS.forEach((id) => { weights[id] = 1; });
    sum = TEMPERAMENT_IDS.length;
  }
  const result = {};
  let allocated = 0;
  TEMPERAMENT_IDS.slice(0, -1).forEach((id) => {
    result[id] = fixed(target * weights[id] / sum, 3);
    allocated += result[id];
  });
  result[TEMPERAMENT_IDS.at(-1)] = fixed(Math.max(0, target - allocated), 3);
  return result;
}

function normalizeGroupDefinitions(definitions = {}) {
  return Object.fromEntries(POPULATION_GROUP_DIMENSION_IDS.map((dimensionId) => {
    const entries = Array.isArray(definitions?.[dimensionId]) ? definitions[dimensionId] : [];
    const seen = new Set();
    const normalized = entries.filter((entry) => entry && typeof entry.id === "string" && !seen.has(entry.id)).map((entry) => {
      seen.add(entry.id);
      return {
        id: entry.id.slice(0, 180),
        dimensionId,
        name: String(entry.name ?? entry.id).slice(0, 120),
        populationWeight: Math.max(0.000001, Number(entry.populationWeight ?? entry.weight) || 0),
        temperamentBias: Object.fromEntries(TEMPERAMENT_IDS.map((id) => [id, clamp(entry.temperamentBias?.[id] ?? 1, 0.15, 4)])),
        regionId: typeof entry.regionId === "string" ? entry.regionId : null,
        nationId: typeof entry.nationId === "string" ? entry.nationId : null,
      };
    });
    return [dimensionId, normalized];
  }));
}

function populationGroupSourceEntries(source, dimensionId) {
  const dimension = source?.[dimensionId];
  if (Array.isArray(dimension)) return dimension;
  return dimension && typeof dimension === "object" ? Object.values(dimension) : [];
}

function sourceGroupDefinition(group, dimensionId) {
  return {
    id: group.id,
    dimensionId,
    name: group.name,
    populationWeight: Math.max(0.000001, Number(group.population) || 0),
    temperamentBias: Object.fromEntries(TEMPERAMENT_IDS.map((id) => [id, 1])),
    regionId: group.regionId ?? null,
    nationId: group.nationId ?? null,
  };
}

function fitPopulationGroupDimension(definitions, sourceEntries, targetPopulation, targetTemperaments) {
  const sourceById = new Map(sourceEntries.filter((entry) => entry && typeof entry.id === "string").map((entry) => [entry.id, entry]));
  const mergedDefinitions = [...definitions];
  for (const source of sourceEntries) {
    if (source?.id && !mergedDefinitions.some((entry) => entry.id === source.id)) {
      mergedDefinitions.push(sourceGroupDefinition(source, source.dimensionId));
    }
  }
  if (!mergedDefinitions.length) return {};
  const rawRowWeights = mergedDefinitions.map((definition) => {
    const preservedPopulation = Number(sourceById.get(definition.id)?.population);
    return Number.isFinite(preservedPopulation) && preservedPopulation > 0
      ? preservedPopulation
      : definition.populationWeight;
  });
  const rowWeightTotal = rawRowWeights.reduce((sum, value) => sum + value, 0) || mergedDefinitions.length;
  const rowTargets = rawRowWeights.map((weight) => targetPopulation * weight / rowWeightTotal);
  const matrix = mergedDefinitions.map((definition, rowIndex) => {
    const preserved = sourceById.get(definition.id)?.temperamentPopulation;
    const values = TEMPERAMENT_IDS.map((temperamentId) => {
      const sourceValue = Number(preserved?.[temperamentId]);
      if (Number.isFinite(sourceValue) && sourceValue >= 0) return Math.max(0.0000001, sourceValue);
      return Math.max(0.0000001,
        rowTargets[rowIndex] * (Number(targetTemperaments[temperamentId]) || 0) / Math.max(1, targetPopulation)
          * definition.temperamentBias[temperamentId]);
    });
    return values;
  });
  for (let iteration = 0; iteration < 12; iteration += 1) {
    matrix.forEach((row, rowIndex) => {
      const total = row.reduce((sum, value) => sum + value, 0) || 1;
      row.forEach((value, columnIndex) => { row[columnIndex] = value * rowTargets[rowIndex] / total; });
    });
    TEMPERAMENT_IDS.forEach((temperamentId, columnIndex) => {
      const total = matrix.reduce((sum, row) => sum + row[columnIndex], 0) || 1;
      const target = Math.max(0, Number(targetTemperaments[temperamentId]) || 0);
      matrix.forEach((row) => { row[columnIndex] = row[columnIndex] * target / total; });
    });
  }
  return Object.fromEntries(mergedDefinitions.map((definition, rowIndex) => {
    const source = sourceById.get(definition.id);
    const temperamentPopulation = Object.fromEntries(TEMPERAMENT_IDS.map((temperamentId, columnIndex) => [
      temperamentId,
      fixed(matrix[rowIndex][columnIndex], 3),
    ]));
    const population = fixed(TEMPERAMENT_IDS.reduce((sum, id) => sum + temperamentPopulation[id], 0), 3);
    return [definition.id, {
      id: definition.id,
      dimensionId: definition.dimensionId,
      name: definition.name,
      population,
      temperamentPopulation,
      regionId: definition.regionId ?? source?.regionId ?? null,
      nationId: definition.nationId ?? source?.nationId ?? null,
    }];
  }));
}

function createPopulationGroups(source, definitions, population, temperamentPopulation) {
  const normalizedDefinitions = normalizeGroupDefinitions(definitions);
  return Object.fromEntries(POPULATION_GROUP_DIMENSION_IDS.map((dimensionId) => {
    const sourceEntries = populationGroupSourceEntries(source, dimensionId);
    const resolvedDefinitions = normalizedDefinitions[dimensionId].length
      ? normalizedDefinitions[dimensionId]
      : sourceEntries.map((entry) => sourceGroupDefinition(entry, dimensionId));
    return [dimensionId, fitPopulationGroupDimension(
      resolvedDefinitions,
      sourceEntries,
      population,
      temperamentPopulation,
    )];
  }));
}

export function getPopulationGroupShares(group) {
  const population = Math.max(0.001, Number(group?.population) || 0);
  return Object.fromEntries(TEMPERAMENT_IDS.map((id) => [
    id,
    fixed((Number(group?.temperamentPopulation?.[id]) || 0) / population, 6),
  ]));
}

export function getRacePopulationGroups(raceState, dimensionId = null) {
  const dimensions = dimensionId ? [dimensionId] : POPULATION_GROUP_DIMENSION_IDS;
  return Object.fromEntries(dimensions.filter((id) => POPULATION_GROUP_DIMENSIONS[id]).map((id) => [
    id,
    Object.values(raceState?.populationGroups?.[id] ?? {}).map((group) => ({
      ...group,
      temperamentShares: getPopulationGroupShares(group),
    })),
  ]));
}

export function getTemperamentShares(raceState) {
  const population = Math.max(1, Number(raceState?.population) || 0);
  return Object.fromEntries(TEMPERAMENT_IDS.map((id) => [
    id,
    fixed((Number(raceState?.temperamentPopulation?.[id]) || 0) / population, 6),
  ]));
}

function normalizeAgenda(source) {
  if (!source || typeof source.id !== "string") return null;
  return {
    id: source.id.slice(0, 160),
    title: String(source.title ?? source.id).slice(0, 120),
    type: String(source.type ?? "historical_memory").slice(0, 64),
    establishedPeriod: typeof source.establishedPeriod === "string" ? source.establishedPeriod : null,
    lastReinforcedPeriod: typeof source.lastReinforcedPeriod === "string" ? source.lastReinforcedPeriod : null,
    targetRaceId: typeof source.targetRaceId === "string" ? source.targetRaceId : null,
    intensity: fixed(clamp(source.intensity ?? 50), 2),
    traitModifiers: offsetRecord(source.traitModifiers, 40),
    relationModifier: Math.round(clamp(source.relationModifier, -50, 50)),
  };
}

export function createRaceState({ raceId, seed, population = 1, source = null, groupDefinitions = null } = {}) {
  if (typeof raceId !== "string" || !raceId) throw new TypeError("RaceState requires a raceId.");
  const total = Math.max(1, fixed(source?.population ?? population, 3));
  const baseTraits = source?.baseTraits
    ? traitRecord(source.baseTraits)
    : deriveSeededRaceBaseTraits(raceId, seed);
  const initialShares = initialTemperamentShares(raceId, baseTraits, seed);
  const initialPopulation = Object.fromEntries(TEMPERAMENT_IDS.map((id) => [id, initialShares[id] * total]));
  const temperamentPopulation = normalizeTemperamentPopulation(source?.temperamentPopulation ?? initialPopulation, total);
  return {
    raceId,
    baseTraits,
    temperamentPopulation,
    populationGroups: createPopulationGroups(source?.populationGroups, groupDefinitions, total, temperamentPopulation),
    experience: experienceRecord(source?.experience ?? DEFAULT_EXPERIENCE),
    historicalAgendas: (Array.isArray(source?.historicalAgendas) ? source.historicalAgendas : [])
      .map(normalizeAgenda).filter(Boolean).slice(-MAX_AGENDAS),
    population: total,
    lastUpdatedPeriod: typeof source?.lastUpdatedPeriod === "string" ? source.lastUpdatedPeriod : null,
  };
}

function preserveNationProfile(source) {
  if (!source || typeof source.nationId !== "string" || typeof source.raceId !== "string") return null;
  const leader = source.leader && typeof source.leader.id === "string" ? {
    id: source.leader.id,
    generation: Math.max(1, Math.round(Number(source.leader.generation) || 1)),
    roleId: ROLE_TRAIT_MODIFIERS[source.leader.roleId] ? source.leader.roleId : "ruler",
    temperamentId: TEMPERAMENTS[source.leader.temperamentId] ? source.leader.temperamentId : "cooperative",
    individualOffsets: offsetRecord(source.leader.individualOffsets, 20),
    generatedPeriod: typeof source.leader.generatedPeriod === "string" ? source.leader.generatedPeriod : null,
  } : null;
  return {
    nationId: source.nationId,
    raceId: source.raceId,
    cultureTraits: offsetRecord(source.cultureTraits, 35),
    leader,
  };
}

function preserveCharacterProfile(source) {
  if (!source || typeof source.id !== "string" || typeof source.raceId !== "string") return null;
  return {
    id: source.id,
    name: String(source.name ?? source.id).slice(0, 120),
    raceId: source.raceId,
    roleId: ROLE_TRAIT_MODIFIERS[source.roleId] ? source.roleId : "citizen",
    temperamentId: TEMPERAMENTS[source.temperamentId] ? source.temperamentId : "cooperative",
    individualOffsets: offsetRecord(source.individualOffsets, 20),
    populationGroupIds: Array.isArray(source.populationGroupIds)
      ? source.populationGroupIds.filter((id) => typeof id === "string").slice(0, 8)
      : [],
    source: String(source.source ?? "fixed-character").slice(0, 80),
    generatedPeriod: typeof source.generatedPeriod === "string" ? source.generatedPeriod : null,
  };
}

export function preserveRaceDecisionWorldState(source) {
  const sourceVersion = Number(source?.schemaVersion);
  if (!source || typeof source !== "object" || ![1, RACE_DECISION_SCHEMA_VERSION].includes(sourceVersion)) return null;
  const races = {};
  for (const [raceId, raceState] of Object.entries(source.races ?? {})) {
    if (raceState && typeof raceId === "string") races[raceId] = createRaceState({
      raceId,
      seed: source.seed ?? "preserved-race-state",
      population: raceState.population,
      source: raceState,
    });
  }
  const nationProfiles = {};
  for (const [nationId, profile] of Object.entries(source.nationProfiles ?? {})) {
    const preserved = preserveNationProfile(profile);
    if (preserved && nationId === preserved.nationId) nationProfiles[nationId] = preserved;
  }
  const characterProfiles = {};
  for (const [characterId, profile] of Object.entries(source.characterProfiles ?? {})) {
    const preserved = preserveCharacterProfile(profile);
    if (preserved && characterId === preserved.id) characterProfiles[characterId] = preserved;
  }
  return {
    schemaVersion: RACE_DECISION_SCHEMA_VERSION,
    seed: typeof source.seed === "string" ? source.seed : null,
    establishedPeriod: typeof source.establishedPeriod === "string" ? source.establishedPeriod : null,
    lastAdvancedPeriod: typeof source.lastAdvancedPeriod === "string" ? source.lastAdvancedPeriod : null,
    races,
    nationProfiles,
    characterProfiles,
    events: (Array.isArray(source.events) ? source.events : []).filter((event) => event && typeof event.id === "string")
      .slice(-RACE_DECISION_EVENT_LIMIT).map((event) => ({ ...event })),
  };
}

function nationPopulation(nation) {
  return Math.max(1, Number(nation?.settlementPopulation ?? nation?.populationPotential) || 1);
}

function populationsByRace(runtime) {
  return runtime.nations.nations.reduce((result, nation) => {
    const raceId = nation.peopleId ?? "human";
    result[raceId] = (result[raceId] ?? 0) + nationPopulation(nation);
    return result;
  }, {});
}

function populationGroupDefinitions(runtime, raceId, seed) {
  const regional = runtime.nations.regions.filter((region) => {
    const nation = runtime.nationById.get(region.nationId)
      ?? runtime.nations.nations.find((entry) => entry.id === region.nationId);
    return (nation?.peopleId ?? "human") === raceId;
  }).map((region) => ({
    id: `region:${region.id}`,
    name: region.name ?? region.id,
    populationWeight: Math.max(1, Number(region.population) || Number(region.tileCount) || 1),
    temperamentBias: Object.fromEntries(TEMPERAMENT_IDS.map((id) => [
      id,
      fixed(0.88 + hashUnit(seed, raceId, region.id, "regional-temperament", id) * 0.24, 6),
    ])),
    regionId: region.id,
    nationId: region.nationId,
  }));
  if (!regional.length) regional.push({
    id: `region:${raceId}:diaspora`,
    name: `${normalizedPeopleDefinition(raceId).name}離散共同体`,
    populationWeight: 1,
    temperamentBias: {},
    regionId: null,
    nationId: null,
  });
  return {
    regional,
    socialClass: SOCIAL_CLASS_GROUPS.map((entry) => ({
      ...entry,
      populationWeight: entry.weight * (0.92 + hashUnit(seed, raceId, entry.id, "population") * 0.16),
    })),
    faith: FAITH_GROUPS.map((entry) => ({
      ...entry,
      populationWeight: entry.weight * (0.92 + hashUnit(seed, raceId, entry.id, "population") * 0.16),
    })),
  };
}

function politicalAuthority(polity) {
  const value = {
    absolute_monarchy: 22,
    feudal_monarchy: 14,
    elective_monarchy: 5,
    representative_republic: -18,
    oligarchic_republic: -2,
    federal_council: -20,
    clan_confederation: -12,
    clerical_theocracy: 20,
    autocratic_chiefdom: 24,
    military_junta: 28,
    magocratic_council: 12,
  }[polity?.politicalSystemId];
  return value ?? 0;
}

export function deriveNationCultureTraits(nation) {
  const modifiers = nation?.polity?.modifiers ?? {};
  const stateCapacity = Number(modifiers.stateCapacity) || 0;
  const commerce = Number(modifiers.commerce) || 0;
  const mobilization = Number(modifiers.mobilization) || 0;
  const localAutonomy = Number(modifiers.localAutonomy) || 0;
  return offsetRecord({
    militarism: mobilization * 1.5,
    authority: politicalAuthority(nation?.polity),
    centralization: stateCapacity * 2.1 - localAutonomy * 1.55,
    openness: commerce * 1.55 + (Number(nation?.coastalShare) || 0) * 5,
    ambition: ((Number(nation?.nationLevel) || 4) - 4) * 3 + mobilization * 0.5,
    pragmatism: stateCapacity * 1.2 + commerce * 0.8,
  }, 35);
}

function sharesForPopulationGroups(raceState, groupIds = []) {
  const selected = [];
  for (const groupId of groupIds) {
    for (const dimensionId of POPULATION_GROUP_DIMENSION_IDS) {
      const group = raceState?.populationGroups?.[dimensionId]?.[groupId];
      if (group) selected.push(getPopulationGroupShares(group));
    }
  }
  if (!selected.length) return getTemperamentShares(raceState);
  const weights = Object.fromEntries(TEMPERAMENT_IDS.map((id) => [
    id,
    selected.reduce((sum, shares) => sum + (Number(shares[id]) || 0), 0) / selected.length,
  ]));
  const total = TEMPERAMENT_IDS.reduce((sum, id) => sum + weights[id], 0) || 1;
  return Object.fromEntries(TEMPERAMENT_IDS.map((id) => [id, weights[id] / total]));
}

function chooseTemperament(raceState, seed, subjectId, groupIds = []) {
  const shares = sharesForPopulationGroups(raceState, groupIds);
  const roll = hashUnit(seed, subjectId, "temperament");
  let cursor = 0;
  for (const id of TEMPERAMENT_IDS) {
    cursor += shares[id];
    if (roll <= cursor) return id;
  }
  return TEMPERAMENT_IDS.at(-1);
}

function individualOffsets(seed, subjectId) {
  return Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => {
    const triangular = hashUnit(seed, subjectId, id, "a") + hashUnit(seed, subjectId, id, "b") - 1;
    return [id, Math.round(triangular * 16)];
  }));
}

export function deriveRaceRepresentativeTraits(raceState) {
  const shares = getTemperamentShares(raceState);
  const agendaModifiers = Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [id, 0]));
  for (const agenda of raceState?.historicalAgendas ?? []) {
    const scale = clamp(agenda.intensity) / 100;
    for (const id of RACE_DECISION_TRAIT_IDS) agendaModifiers[id] += (Number(agenda.traitModifiers?.[id]) || 0) * scale;
  }
  return Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => {
    const temperament = TEMPERAMENT_IDS.reduce((sum, temperamentId) => (
      sum + TEMPERAMENTS[temperamentId].traits[id] * shares[temperamentId]
    ), 0);
    return [id, clampTrait((Number(raceState?.baseTraits?.[id]) || 0) + temperament + agendaModifiers[id])];
  }));
}

export function getRepresentativeTemperament(raceState) {
  const shares = getTemperamentShares(raceState);
  return TEMPERAMENT_IDS.map((id) => ({ ...TEMPERAMENTS[id], share: shares[id] }))
    .sort((left, right) => right.share - left.share || left.id.localeCompare(right.id))[0];
}

export function createIndividualDecisionProfile(raceState, seed, options = {}) {
  const subjectId = String(options.subjectId ?? "anonymous");
  const roleId = ROLE_TRAIT_MODIFIERS[options.roleId] ? options.roleId : "citizen";
  const populationGroupIds = Array.isArray(options.populationGroupIds)
    ? options.populationGroupIds.filter((id) => typeof id === "string").slice(0, 8)
    : [];
  const temperamentId = TEMPERAMENTS[options.temperamentId]
    ? options.temperamentId
    : chooseTemperament(raceState, seed, subjectId, populationGroupIds);
  const offsets = options.individualOffsets
    ? offsetRecord(options.individualOffsets, 20)
    : individualOffsets(seed, subjectId);
  const role = ROLE_TRAIT_MODIFIERS[roleId];
  const temperament = TEMPERAMENTS[temperamentId].traits;
  const agendaModifiers = Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [id, 0]));
  for (const agenda of raceState?.historicalAgendas ?? []) {
    const scale = clamp(agenda.intensity) / 100;
    for (const id of RACE_DECISION_TRAIT_IDS) agendaModifiers[id] += (Number(agenda.traitModifiers?.[id]) || 0) * scale;
  }
  const traits = Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [id, clampTrait(
    (Number(raceState?.baseTraits?.[id]) || 0) + temperament[id] + offsets[id] + role[id] + agendaModifiers[id],
  )]));
  return {
    id: subjectId,
    subjectId,
    raceId: raceState.raceId,
    roleId,
    temperamentId,
    individualOffsets: offsets,
    populationGroupIds,
    traits,
  };
}

function characterRoleId(character) {
  const roleText = `${character?.gameplay?.role ?? character?.role ?? ""} ${character?.biography?.occupation ?? ""}`;
  if (character?.gameplay?.commander || /将|軍|騎士|指揮|戦士/.test(roleText)) return "commander";
  if (/外交|折衝|交渉|受付|商|交易/.test(roleText)) return "diplomat";
  if (/領主|長|首長|村長|自治/.test(roleText)) return "local_leader";
  if (/王|皇|君主|統治/.test(roleText)) return "ruler";
  return "citizen";
}

function authoredTemperamentId(character, raceState, seed) {
  const text = [
    character?.personality?.temperament,
    ...(character?.personality?.values ?? []),
    ...(character?.personality?.traits ?? []),
    character?.gameplay?.role,
    character?.gameplay?.policy,
    character?.gameplay?.doctrine,
    character?.biography?.goal,
  ].filter(Boolean).join(" ");
  const patterns = {
    militant: /勇|武|戦|軍|攻勢|征服|動員|強硬|容赦|先陣|反撃/g,
    submissive: /忠節|服従|秩序|維持|生存|慎重|規律|義務/g,
    cooperative: /交渉|外交|合議|共存|調停|契約|協約|救済|穏やか|帰還|守る/g,
    independent: /自由|自治|独立|個人|放浪|反権力|自ら|開拓/g,
  };
  const shares = getTemperamentShares(raceState);
  const scored = TEMPERAMENT_IDS.map((id) => {
    const matches = text.match(patterns[id])?.length ?? 0;
    return { id, score: Math.log(Math.max(0.0001, shares[id])) + matches * 0.72 + hashUnit(seed, character.id, id, "authored-temperament") * 0.08 };
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  return scored[0].id;
}

export function createFixedCharacterDecisionProfiles(raceWorld, characters = [], seed = raceWorld?.seed, period = null) {
  const list = Array.isArray(characters) ? characters : Object.values(characters ?? {});
  const profiles = { ...(raceWorld?.characterProfiles ?? {}) };
  for (const character of list) {
    const id = String(character?.id ?? character?.identity?.id ?? "");
    const raceId = String(character?.raceId ?? character?.identity?.raceId ?? "human");
    const raceState = raceWorld?.races?.[raceId];
    if (!id || !raceState) continue;
    const preserved = preserveCharacterProfile(profiles[id]);
    const roleId = preserved?.roleId ?? characterRoleId(character);
    const populationGroupIds = preserved?.populationGroupIds?.length
      ? preserved.populationGroupIds
      : [roleId === "commander" ? "class:warrior" : roleId === "ruler" ? "class:elite" : roleId === "diplomat" ? "class:merchant" : "class:commoner"];
    profiles[id] = {
      id,
      name: String(character.name ?? character.identity?.name ?? id),
      raceId,
      roleId,
      temperamentId: preserved?.temperamentId ?? authoredTemperamentId(character, raceState, seed),
      individualOffsets: preserved?.individualOffsets ?? individualOffsets(seed, id),
      populationGroupIds,
      source: "UNIQUE_CHARACTERS",
      generatedPeriod: preserved?.generatedPeriod ?? period,
    };
  }
  return profiles;
}

export function deriveFixedCharacterDecisionProfile(raceWorld, characterId) {
  const stored = preserveCharacterProfile(raceWorld?.characterProfiles?.[characterId]);
  const raceState = stored ? raceWorld?.races?.[stored.raceId] : null;
  if (!stored || !raceState) return null;
  return {
    ...stored,
    ...createIndividualDecisionProfile(raceState, raceWorld.seed, {
      subjectId: stored.id,
      roleId: stored.roleId,
      temperamentId: stored.temperamentId,
      individualOffsets: stored.individualOffsets,
      populationGroupIds: stored.populationGroupIds,
    }),
    name: stored.name,
    source: stored.source,
    generatedPeriod: stored.generatedPeriod,
  };
}

function createNationProfile(runtime, raceState, nation, period, source = null) {
  const preserved = preserveNationProfile(source);
  const nationId = nation.id;
  const raceId = nation.peopleId ?? "human";
  if (preserved && preserved.raceId === raceId && preserved.leader) {
    const [currentYear, currentMonth] = String(period).split("-").map(Number);
    const [generatedYear, generatedMonth] = String(preserved.leader.generatedPeriod ?? period).split("-").map(Number);
    const tenureMonths = (currentYear * 12 + currentMonth) - (generatedYear * 12 + generatedMonth);
    const maximumTenure = 18 * 12 + Math.floor(hashUnit(runtime.terrain.seed, preserved.leader.id, "ruler-tenure") * 15 * 12);
    if (tenureMonths < maximumTenure) return preserved;
  }
  const generation = (preserved?.leader?.generation ?? 0) + 1;
  const leaderId = `${nationId}:ruler:${generation}:${period}`;
  const temperamentId = chooseTemperament(raceState, runtime.terrain.seed, leaderId);
  return {
    nationId,
    raceId,
    cultureTraits: deriveNationCultureTraits(nation),
    leader: {
      id: leaderId,
      generation,
      roleId: "ruler",
      temperamentId,
      individualOffsets: individualOffsets(runtime.terrain.seed, leaderId),
      generatedPeriod: period,
    },
  };
}

export function createRaceDecisionWorldState(runtime, source = null, dateState = null, options = {}) {
  const preserved = preserveRaceDecisionWorldState(source);
  const seed = String(preserved?.seed ?? runtime.terrain.seed);
  const period = periodFor(dateState);
  const populations = populationsByRace(runtime);
  const races = { ...(preserved?.races ?? {}) };
  for (const [raceId, population] of Object.entries(populations)) {
    races[raceId] = createRaceState({
      raceId,
      seed,
      population,
      source: races[raceId],
      groupDefinitions: populationGroupDefinitions(runtime, raceId, seed),
    });
  }
  const nationProfiles = { ...(preserved?.nationProfiles ?? {}) };
  for (const nation of runtime.nations.nations) {
    const raceId = nation.peopleId ?? "human";
    nationProfiles[nation.id] = createNationProfile(runtime, races[raceId], nation, period, nationProfiles[nation.id]);
  }
  const state = {
    schemaVersion: RACE_DECISION_SCHEMA_VERSION,
    seed,
    establishedPeriod: preserved?.establishedPeriod ?? period,
    lastAdvancedPeriod: preserved?.lastAdvancedPeriod ?? period,
    races,
    nationProfiles,
    characterProfiles: { ...(preserved?.characterProfiles ?? {}) },
    events: preserved?.events ?? [],
  };
  if (options.fixedCharacters) {
    state.characterProfiles = createFixedCharacterDecisionProfiles(
      state,
      options.fixedCharacters,
      seed,
      period,
    );
  }
  return state;
}

function agendaRelationModifiers(raceState) {
  const result = {};
  for (const agenda of raceState?.historicalAgendas ?? []) {
    if (!agenda.targetRaceId) continue;
    result[agenda.targetRaceId] = (result[agenda.targetRaceId] ?? 0)
      + (Number(agenda.relationModifier) || 0) * clamp(agenda.intensity) / 100;
  }
  return Object.fromEntries(Object.entries(result).map(([id, value]) => [id, Math.round(clamp(value, -60, 60))]));
}

function aggregatePopulationGroups(groups) {
  const population = groups.reduce((sum, group) => sum + (Number(group.population) || 0), 0);
  const temperamentPopulation = Object.fromEntries(TEMPERAMENT_IDS.map((id) => [
    id,
    groups.reduce((sum, group) => sum + (Number(group.temperamentPopulation?.[id]) || 0), 0),
  ]));
  return {
    population: fixed(population, 3),
    temperamentPopulation,
    temperamentShares: getPopulationGroupShares({ population, temperamentPopulation }),
  };
}

function nationPopulationGroupContext(runtime, raceState, nation) {
  const runtimeNation = runtime.nationById.get(nation.id) ?? nation;
  const regionIds = new Set(nation.regionIds ?? runtimeNation.regionIds ?? []);
  const result = {};
  for (const dimensionId of POPULATION_GROUP_DIMENSION_IDS) {
    const allGroups = Object.values(raceState.populationGroups?.[dimensionId] ?? {});
    const selected = dimensionId === "regional" && regionIds.size
      ? allGroups.filter((group) => regionIds.has(group.regionId))
      : allGroups;
    const effective = selected.length ? selected : allGroups;
    const aggregate = aggregatePopulationGroups(effective);
    result[dimensionId] = {
      id: dimensionId,
      name: POPULATION_GROUP_DIMENSIONS[dimensionId].name,
      ...aggregate,
      groups: effective.slice().sort((left, right) => right.population - left.population || left.id.localeCompare(right.id)).map((group) => ({
        id: group.id,
        name: group.name,
        population: group.population,
        temperamentShares: getPopulationGroupShares(group),
        representativeTemperament: TEMPERAMENT_IDS.map((id) => ({ ...TEMPERAMENTS[id], share: getPopulationGroupShares(group)[id] }))
          .sort((left, right) => right.share - left.share || left.id.localeCompare(right.id))[0],
      })),
    };
  }
  return result;
}

function representativeTraitsForShares(raceState, shares) {
  const globalTraits = deriveRaceRepresentativeTraits(raceState);
  const globalShares = getTemperamentShares(raceState);
  return Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => {
    const localTemperament = TEMPERAMENT_IDS.reduce((sum, temperamentId) => (
      sum + TEMPERAMENTS[temperamentId].traits[id] * (Number(shares?.[temperamentId]) || 0)
    ), 0);
    const globalTemperament = TEMPERAMENT_IDS.reduce((sum, temperamentId) => (
      sum + TEMPERAMENTS[temperamentId].traits[id] * globalShares[temperamentId]
    ), 0);
    return [id, clampTrait(globalTraits[id] + localTemperament - globalTemperament)];
  }));
}

function deriveNationDecisionProfileFromState(runtime, raceWorld, nationId, nationOverride = null) {
  const nation = nationOverride?.id === nationId
    ? nationOverride
    : runtime.nationById.get(nationId) ?? runtime.nations.nations.find((entry) => entry.id === nationId);
  if (!nation) return null;
  const stored = raceWorld.nationProfiles[nationId]
    ?? createNationProfile(runtime, raceWorld.races[nation.peopleId ?? "human"], nation, raceWorld.lastAdvancedPeriod);
  const raceState = raceWorld.races[stored.raceId];
  const representativeTraits = deriveRaceRepresentativeTraits(raceState);
  const populationGroups = nationPopulationGroupContext(runtime, raceState, nation);
  const regionalTraits = representativeTraitsForShares(raceState, populationGroups.regional?.temperamentShares);
  const leader = createIndividualDecisionProfile(raceState, runtime.terrain.seed, {
    subjectId: stored.leader.id,
    roleId: stored.leader.roleId,
    temperamentId: stored.leader.temperamentId,
    individualOffsets: stored.leader.individualOffsets,
  });
  const traits = Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [id, clampTrait(
    representativeTraits[id]
      + (regionalTraits[id] - representativeTraits[id]) * 0.45
      + (Number(stored.cultureTraits[id]) || 0)
      + TEMPERAMENTS[leader.temperamentId].traits[id] * 0.18
      + leader.individualOffsets[id] * 0.55
      + ROLE_TRAIT_MODIFIERS.ruler[id] * 0.45,
  )]));
  return {
    nationId,
    raceId: stored.raceId,
    traits,
    representativeTraits,
    representativeTemperament: getRepresentativeTemperament(raceState),
    temperamentShares: getTemperamentShares(raceState),
    populationGroups,
    experience: { ...raceState.experience },
    historicalAgendas: raceState.historicalAgendas.map((agenda) => ({ ...agenda })),
    relationModifiers: agendaRelationModifiers(raceState),
    balance: raceBalanceReport(raceState),
    cultureTraits: { ...stored.cultureTraits },
    leader,
  };
}

export function deriveNationDecisionProfile(runtime, raceWorldSource, nationId, nationOverride = null) {
  const raceWorld = createRaceDecisionWorldState(runtime, raceWorldSource);
  return deriveNationDecisionProfileFromState(runtime, raceWorld, nationId, nationOverride);
}

export function deriveNationDecisionProfiles(runtime, raceWorldSource) {
  const raceWorld = createRaceDecisionWorldState(runtime, raceWorldSource);
  return Object.fromEntries(runtime.nations.nations.map((nation) => [
    nation.id,
    deriveNationDecisionProfileFromState(runtime, raceWorld, nation.id),
  ]));
}

function movePopulation(population, from, to, fraction) {
  if (from === to || !population[from] || fraction <= 0) return;
  const amount = Math.min(population[from], population[from] * clamp(fraction, 0, 0.08));
  population[from] -= amount;
  population[to] += amount;
}

function populationGroupEventMultiplier(group, type, event) {
  if (group.dimensionId === "regional") {
    if (event.targetRegionId) return group.regionId === event.targetRegionId ? 1.85 : 0.55;
    return 0.88 + hashUnit(event.seed ?? "group-event", group.id, type) * 0.24;
  }
  if (group.dimensionId === "socialClass") {
    if (["war", "war_victory", "war_defeat"].includes(type)) {
      return { "class:warrior": 1.6, "class:elite": 1.12, "class:commoner": 0.82, "class:merchant": 0.72 }[group.id] ?? 1;
    }
    if (type === "prosperity" || type === "contact") return group.id === "class:merchant" ? 1.42 : 0.92;
    if (type === "domination") return group.id === "class:elite" ? 1.3 : 0.96;
  }
  if (group.dimensionId === "faith") {
    if (type === "persecution") return { "faith:reformist": 1.5, "faith:institutional": 1.14, "faith:ancestral": 0.86 }[group.id] ?? 1;
    if (type === "domination") return group.id === "faith:institutional" ? 1.28 : 0.94;
    if (type === "contact") return group.id === "faith:reformist" ? 1.34 : 0.93;
  }
  return 1;
}

function reconcilePopulationGroups(before, after, event = {}) {
  const populationGroups = {};
  const loss = Math.max(0, before.population - after.population);
  for (const dimensionId of POPULATION_GROUP_DIMENSION_IDS) {
    const groups = Object.values(before.populationGroups?.[dimensionId] ?? {});
    if (!groups.length) {
      populationGroups[dimensionId] = {};
      continue;
    }
    const exposures = groups.map((group) => Math.max(0.000001,
      group.population * populationGroupEventMultiplier(group, String(event.type ?? "growth"), event)));
    const exposureTotal = exposures.reduce((sum, value) => sum + value, 0) || 1;
    const sourceEntries = groups.map((group, index) => {
      const nextPopulation = loss > 0
        ? Math.max(0.001, group.population - loss * exposures[index] / exposureTotal)
        : Math.max(0.001, group.population * after.population / Math.max(0.001, before.population));
      const temperamentPopulation = normalizeTemperamentPopulation(group.temperamentPopulation, nextPopulation);
      const intensity = clamp(event.intensity ?? 0) / 100 * populationGroupEventMultiplier(group, String(event.type ?? ""), event);
      for (const [from, to, rate] of EVENT_TRANSITIONS[event.type] ?? []) {
        movePopulation(temperamentPopulation, from, to, rate * intensity);
      }
      return { ...group, population: nextPopulation, temperamentPopulation };
    });
    const definitions = sourceEntries.map((group) => sourceGroupDefinition(group, dimensionId));
    populationGroups[dimensionId] = fitPopulationGroupDimension(
      definitions,
      sourceEntries,
      after.population,
      after.temperamentPopulation,
    );
  }
  return { ...after, populationGroups };
}

const EVENT_TRANSITIONS = Object.freeze({
  persecution: Object.freeze([
    ["cooperative", "militant", 0.03],
    ["cooperative", "submissive", 0.026],
    ["independent", "militant", 0.012],
  ]),
  war_victory: Object.freeze([["cooperative", "militant", 0.015], ["submissive", "militant", 0.01]]),
  war_defeat: Object.freeze([["militant", "submissive", 0.035], ["militant", "cooperative", 0.022]]),
  peace: Object.freeze([["militant", "cooperative", 0.012], ["submissive", "cooperative", 0.009]]),
  domination: Object.freeze([
    ["independent", "submissive", 0.025],
    ["cooperative", "submissive", 0.018],
    ["submissive", "militant", 0.003],
  ]),
  contact: Object.freeze([["militant", "cooperative", 0.012], ["submissive", "cooperative", 0.009]]),
  prosperity: Object.freeze([["militant", "cooperative", 0.008], ["submissive", "cooperative", 0.006]]),
});

function applyCasualties(raceState, casualties) {
  const loss = Math.min(raceState.population * 0.35, Math.max(0, Number(casualties) || 0));
  if (loss <= 0) return raceState;
  const shares = getTemperamentShares(raceState);
  const riskTotal = TEMPERAMENT_IDS.reduce((sum, id) => sum + shares[id] * TEMPERAMENTS[id].casualtyRisk, 0);
  const population = { ...raceState.temperamentPopulation };
  for (const id of TEMPERAMENT_IDS) {
    const temperamentLoss = loss * shares[id] * TEMPERAMENTS[id].casualtyRisk / Math.max(0.001, riskTotal);
    population[id] = Math.max(0, population[id] - temperamentLoss);
  }
  const total = TEMPERAMENT_IDS.reduce((sum, id) => sum + population[id], 0);
  return { ...raceState, population: fixed(total, 3), temperamentPopulation: normalizeTemperamentPopulation(population, total) };
}

export function applyRaceSocialEvent(source, event = {}) {
  let raceState = createRaceState({
    raceId: source.raceId,
    seed: event.seed ?? "race-social-event",
    population: source.population,
    source,
  });
  const baseline = raceState;
  const type = String(event.type ?? "");
  const intensity = clamp(event.intensity ?? 50) / 100;
  const experienceId = {
    war_victory: "war",
    war_defeat: "war",
    peace: "prosperity",
  }[type] ?? (SOCIAL_EXPERIENCE_IDS.includes(type) ? type : null);
  if (experienceId) {
    raceState.experience[experienceId] = fixed(clamp(raceState.experience[experienceId] + intensity * 4), 2);
  }
  const population = { ...raceState.temperamentPopulation };
  for (const [from, to, rate] of EVENT_TRANSITIONS[type] ?? []) movePopulation(population, from, to, rate * intensity);
  raceState.temperamentPopulation = normalizeTemperamentPopulation(population, raceState.population);
  if (event.casualties) raceState = applyCasualties(raceState, event.casualties);
  raceState.lastUpdatedPeriod = event.period ?? raceState.lastUpdatedPeriod;
  return reconcilePopulationGroups(baseline, raceState, event);
}

function addAgenda(raceState, agenda) {
  const normalized = normalizeAgenda(agenda);
  if (!normalized) return;
  const existing = raceState.historicalAgendas.find((entry) => entry.id === normalized.id);
  if (existing) {
    existing.intensity = fixed(clamp(Math.max(existing.intensity, normalized.intensity) + 0.4), 2);
    existing.lastReinforcedPeriod = normalized.lastReinforcedPeriod;
    return;
  }
  raceState.historicalAgendas.push(normalized);
  raceState.historicalAgendas = raceState.historicalAgendas.slice(-MAX_AGENDAS);
}

function casualtiesByNation(beforeWorldWars, afterWorldWars) {
  const before = new Map([...(beforeWorldWars?.activeWars ?? []), ...(beforeWorldWars?.completedWars ?? [])].map((war) => [war.id, war]));
  const losses = {};
  for (const war of [...(afterWorldWars?.activeWars ?? []), ...(afterWorldWars?.completedWars ?? [])]) {
    const previous = before.get(war.id);
    const attackerLoss = Math.max(0, (Number(war.attacker?.casualties) || 0) - (Number(previous?.attacker?.casualties) || 0));
    const defenderLoss = Math.max(0, (Number(war.defender?.casualties) || 0) - (Number(previous?.defender?.casualties) || 0));
    for (const [nationId, casualties] of [[war.attackerNationId, attackerLoss], [war.defenderNationId, defenderLoss]]) {
      const current = losses[nationId] ?? { casualties: 0, targetRegionId: war.targetRegionId ?? null, largestRegionalLoss: 0 };
      current.casualties += casualties;
      if (casualties > current.largestRegionalLoss) {
        current.targetRegionId = war.targetRegionId ?? null;
        current.largestRegionalLoss = casualties;
      }
      losses[nationId] = current;
    }
  }
  return losses;
}

function newlyCompletedWars(beforeWorldWars, afterWorldWars) {
  const beforeIds = new Set((beforeWorldWars?.completedWars ?? []).map((war) => war.id));
  return (afterWorldWars?.completedWars ?? []).filter((war) => !beforeIds.has(war.id));
}

function raceIdForNation(runtime, nationId) {
  return runtime.nationById.get(nationId)?.peopleId
    ?? runtime.nations.nations.find((nation) => nation.id === nationId)?.peopleId
    ?? null;
}

function monthlyGrowthRate(raceState, definition) {
  const prosperity = Number(raceState.experience.prosperity) || 0;
  const fertility = clamp(definition.fertility, 0, 2.5);
  const annual = clamp(0.004 + (fertility - 0.8) * 0.004 + (prosperity - 35) * 0.00004, -0.004, 0.014);
  return annual / 12;
}

function applyNaturalGrowth(raceState) {
  const definition = normalizedPeopleDefinition(raceState.raceId);
  const growth = raceState.population * monthlyGrowthRate(raceState, definition);
  if (Math.abs(growth) < 0.001) return raceState;
  const population = { ...raceState.temperamentPopulation };
  const shares = getTemperamentShares(raceState);
  for (const id of TEMPERAMENT_IDS) population[id] = Math.max(0, population[id] + growth * shares[id]);
  const total = TEMPERAMENT_IDS.reduce((sum, id) => sum + population[id], 0);
  return reconcilePopulationGroups(raceState, {
    ...raceState,
    population: fixed(total, 3),
    temperamentPopulation: normalizeTemperamentPopulation(population, total),
  }, { type: "growth", intensity: 0 });
}

function socialEventRecord(period, raceId, type, detail = {}) {
  return {
    id: `race-dynamics:${period}:${raceId}:${type}:${detail.subjectId ?? "society"}`,
    period,
    raceId,
    type,
    title: detail.title ?? `${normalizedPeopleDefinition(raceId).name}社会の変化`,
    summary: detail.summary ?? "経験の蓄積により気質構成が緩やかに変化した。",
  };
}

export function advanceRaceDecisionWorld(runtime, source, dateState, context = {}) {
  const period = periodFor(dateState);
  const baseline = createRaceDecisionWorldState(runtime, source, dateState);
  if (baseline.lastAdvancedPeriod === period) return baseline;
  const next = structuredClone(baseline);
  const currentEvents = [];
  for (const raceState of Object.values(next.races)) {
    for (const id of SOCIAL_EXPERIENCE_IDS) raceState.experience[id] = fixed(raceState.experience[id] * 0.992, 2);
    for (const agenda of raceState.historicalAgendas) agenda.intensity = fixed(Math.max(5, agenda.intensity - 0.01), 2);
  }

  const geopolitical = context.geopolitics ?? {};
  const events = (geopolitical.events ?? []).filter((event) => event.period === period);
  for (const event of events) {
    const raceId = raceIdForNation(runtime, event.nationId);
    if (!raceId || !next.races[raceId]) continue;
    const mapping = {
      open_trade: ["contact", 8],
      diplomatic_overture: ["contact", 6],
      seek_alignment: ["contact", 5],
      accept_alignment: ["contact", 6],
      limited_war: ["war", 10],
      sustain_war: ["war", 4],
      seek_ceasefire: ["peace", 5],
      accept_ceasefire: ["peace", 8],
    }[event.pullId];
    if (mapping) next.races[raceId] = applyRaceSocialEvent(next.races[raceId], { type: mapping[0], intensity: mapping[1], period });
  }

  const losses = casualtiesByNation(context.beforeWorldWars, context.worldWars);
  for (const [nationId, loss] of Object.entries(losses)) {
    const casualties = Number(loss.casualties) || 0;
    const raceId = raceIdForNation(runtime, nationId);
    if (!raceId || !next.races[raceId] || casualties <= 0) continue;
    next.races[raceId] = applyRaceSocialEvent(next.races[raceId], {
      type: "war",
      intensity: 4,
      casualties,
      period,
      targetRegionId: loss.targetRegionId,
    });
    currentEvents.push(socialEventRecord(period, raceId, "war_casualties", {
      subjectId: nationId,
      title: `${normalizedPeopleDefinition(raceId).name}の戦争人口選択`,
      summary: `戦争損失${Math.round(casualties)}人。従軍率の高い強硬型ほど死亡リスクが高く反映された。`,
    }));
  }

  for (const war of newlyCompletedWars(context.beforeWorldWars, context.worldWars)) {
    const attackerWon = war.outcome === "attacker_victory";
    const defenderWon = war.outcome === "defender_victory" || war.outcome === "attacker_retreat";
    for (const [nationId, won] of [[war.attackerNationId, attackerWon], [war.defenderNationId, defenderWon]]) {
      const raceId = raceIdForNation(runtime, nationId);
      if (!raceId || !next.races[raceId]) continue;
      const type = won ? "war_victory" : "war_defeat";
      next.races[raceId] = applyRaceSocialEvent(next.races[raceId], { type, intensity: 55, period });
      currentEvents.push(socialEventRecord(period, raceId, type, {
        subjectId: war.id,
        title: `${normalizedPeopleDefinition(raceId).name}社会の${won ? "戦勝経験" : "敗戦経験"}`,
      }));
    }
  }

  for (const occupation of context.resistance?.occupations ?? []) {
    if (occupation.status !== "active") continue;
    const subjectRaceId = raceIdForNation(runtime, occupation.formerNationId);
    const occupierRaceId = raceIdForNation(runtime, occupation.occupierNationId);
    if (!subjectRaceId || !next.races[subjectRaceId]) continue;
    next.races[subjectRaceId] = applyRaceSocialEvent(next.races[subjectRaceId], {
      type: "domination",
      intensity: 4,
      period,
      targetRegionId: occupation.regionId,
    });
    if (occupation.policyId === "security" || occupation.resistance >= 72) {
      next.races[subjectRaceId] = applyRaceSocialEvent(next.races[subjectRaceId], {
        type: "persecution",
        intensity: 3,
        period,
        targetRegionId: occupation.regionId,
      });
      if (occupation.months >= 12 && occupierRaceId) addAgenda(next.races[subjectRaceId], {
        id: `persecution:${subjectRaceId}:${occupierRaceId}`,
        title: `${normalizedPeopleDefinition(occupierRaceId).name}による迫害の記憶`,
        type: "persecution_memory",
        establishedPeriod: occupation.annexedPeriod,
        lastReinforcedPeriod: period,
        targetRaceId: occupierRaceId,
        intensity: clamp(30 + occupation.months * 0.9 + occupation.resistance * 0.25, 30, 100),
        traitModifiers: { militarism: 6, authority: -4, centralization: -5, openness: -12, ambition: 4, pragmatism: 2 },
        relationModifier: -30,
      });
    }
    if (occupation.months >= 24 && occupierRaceId) addAgenda(next.races[subjectRaceId], {
      id: `domination:${subjectRaceId}:${occupierRaceId}`,
      title: `${normalizedPeopleDefinition(occupierRaceId).name}による長期支配`,
      type: "foreign_domination",
      establishedPeriod: occupation.annexedPeriod,
      lastReinforcedPeriod: period,
      targetRaceId: occupierRaceId,
      intensity: clamp(35 + occupation.months * 0.8, 35, 100),
      traitModifiers: { militarism: 2, authority: -3, centralization: -10, openness: -5, ambition: 3, pragmatism: 4 },
      relationModifier: -20,
    });
  }

  const nationsByRace = runtime.nations.nations.reduce((groups, nation) => {
    const raceId = nation.peopleId ?? "human";
    (groups[raceId] ??= []).push(nation.id);
    return groups;
  }, {});
  for (const [raceId, raceState] of Object.entries(next.races)) {
    const nationIds = nationsByRace[raceId] ?? [];
    const conditions = nationIds.map((nationId) => geopolitical.nationStates?.[nationId]).filter(Boolean);
    const prosperity = conditions.length
      ? conditions.reduce((sum, condition) => sum + (Number(condition.foodSecurity) + Number(condition.reserves)) / 2, 0) / conditions.length
      : 45;
    if (prosperity >= 56) next.races[raceId] = applyRaceSocialEvent(raceState, { type: "prosperity", intensity: (prosperity - 50) * 0.12, period });
    const relationEntries = Object.entries(geopolitical.relations ?? {}).filter(([key]) => nationIds.some((id) => key.split(":").includes(id)));
    const atWar = relationEntries.some(([, relation]) => relation.atWar);
    if (nationIds.length && !atWar) next.races[raceId] = applyRaceSocialEvent(next.races[raceId], { type: "peace", intensity: 1.2, period });
    const trade = relationEntries.length
      ? relationEntries.reduce((sum, [, relation]) => sum + (Number(relation.trade) || 0), 0) / relationEntries.length
      : 0;
    if (trade >= 20) next.races[raceId] = applyRaceSocialEvent(next.races[raceId], { type: "contact", intensity: trade * 0.035, period });
    next.races[raceId] = applyNaturalGrowth(next.races[raceId]);
    next.races[raceId].lastUpdatedPeriod = period;
  }

  next.lastAdvancedPeriod = period;
  next.events = [...next.events, ...currentEvents].slice(-RACE_DECISION_EVENT_LIMIT);
  return next;
}

function normalizeTags(tags = {}) {
  return Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [id, clamp(tags[id], -1, 1)]));
}

function normalizeSituation(situation = {}) {
  return {
    benefit: Number(situation.benefit) || 0,
    danger: Math.max(0, Number(situation.danger) || 0),
    threat: Number(situation.threat) || 0,
    relation: Number(situation.relation) || 0,
  };
}

export function scoreDecisionOptions(profile, options, config = {}) {
  const temperature = clamp(config.temperature ?? 18, 4, 60);
  const eligible = options.filter((option) => option && option.eligible !== false);
  const scored = eligible.map((option) => {
    const tags = normalizeTags(option.tags);
    const personalityRaw = RACE_DECISION_TRAIT_IDS.reduce((sum, id) => sum + (Number(profile?.traits?.[id]) || 0) * tags[id], 0);
    const personalityFit = personalityRaw / RACE_DECISION_TRAIT_IDS.length;
    const situation = normalizeSituation(option.situation);
    const randomJitter = (hashUnit(config.seed, config.period, config.actorId, option.id, "decision-jitter") - 0.5) * 4;
    const evaluation = (Number(option.baseUtility) || 0) + personalityFit * 0.42
      + situation.benefit - situation.danger + situation.threat + situation.relation + randomJitter;
    return {
      ...option,
      tags,
      situation,
      personalityFit: fixed(personalityFit, 2),
      randomJitter: fixed(randomJitter, 2),
      evaluation: fixed(evaluation, 2),
    };
  });
  if (!scored.length) return [];
  const maximum = Math.max(...scored.map((option) => option.evaluation));
  const weights = scored.map((option) => Math.exp((option.evaluation - maximum) / temperature));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  return scored.map((option, index) => ({ ...option, probability: fixed(weights[index] / weightTotal, 6) }));
}

export function chooseProbabilisticDecision(profile, options, config = {}) {
  const scored = scoreDecisionOptions(profile, options, config);
  if (!scored.length) throw new Error("選択可能な意思決定候補がありません。");
  const roll = hashUnit(config.seed, config.period, config.actorId, "decision-roll");
  let cursor = 0;
  let selected = scored.at(-1);
  for (const option of scored) {
    cursor += option.probability;
    if (roll <= cursor) {
      selected = option;
      break;
    }
  }
  return {
    ...selected,
    selectionRoll: fixed(roll, 6),
    alternatives: scored.slice().sort((left, right) => right.probability - left.probability || left.id.localeCompare(right.id))
      .map((option) => ({
        id: option.id,
        evaluation: option.evaluation,
        probability: option.probability,
        personalityFit: option.personalityFit,
      })),
  };
}

function raceBalanceReport(raceState) {
  const shares = getTemperamentShares(raceState);
  const minimumShare = Math.min(...Object.values(shares));
  const maximumShare = Math.max(...Object.values(shares));
  const diversity = 1 - TEMPERAMENT_IDS.reduce((sum, id) => sum + shares[id] ** 2, 0);
  const traits = deriveRaceRepresentativeTraits(raceState);
  const warnings = [];
  if (!Number.isFinite(raceState.population) || raceState.population <= 0) warnings.push("人口が不正");
  if (minimumShare < 0.01) warnings.push("気質の消失リスク");
  if (maximumShare > 0.88) warnings.push("単一気質への過集中");
  if (Math.max(...Object.values(traits).map(Math.abs)) >= 96) warnings.push("代表軸が上限付近");
  let maximumProjectionError = 0;
  for (const dimensionId of POPULATION_GROUP_DIMENSION_IDS) {
    const groups = Object.values(raceState.populationGroups?.[dimensionId] ?? {});
    if (!groups.length) {
      warnings.push(`${POPULATION_GROUP_DIMENSIONS[dimensionId].name}構成なし`);
      continue;
    }
    const aggregate = aggregatePopulationGroups(groups);
    maximumProjectionError = Math.max(maximumProjectionError, Math.abs(aggregate.population - raceState.population));
    for (const id of TEMPERAMENT_IDS) {
      maximumProjectionError = Math.max(maximumProjectionError,
        Math.abs(aggregate.temperamentPopulation[id] - raceState.temperamentPopulation[id]));
    }
  }
  if (maximumProjectionError > Math.max(0.1, raceState.population * 0.000001)) warnings.push("群人口投影の不一致");
  return {
    raceId: raceState.raceId,
    status: warnings.length ? "watch" : "stable",
    population: raceState.population,
    minimumTemperamentShare: fixed(minimumShare, 6),
    maximumTemperamentShare: fixed(maximumShare, 6),
    diversity: fixed(diversity / 0.75, 6),
    maximumProjectionError: fixed(maximumProjectionError, 6),
    warnings,
  };
}

export function analyzeRaceDecisionBalance(source) {
  const races = Object.values(source?.races ?? {}).map(raceBalanceReport);
  const warnings = races.flatMap((race) => race.warnings.map((warning) => `${race.raceId}: ${warning}`));
  return {
    schemaVersion: RACE_DECISION_SCHEMA_VERSION,
    status: warnings.length ? "watch" : "stable",
    raceCount: races.length,
    fixedCharacterCount: Object.keys(source?.characterProfiles ?? {}).length,
    minimumDiversity: races.length ? Math.min(...races.map((race) => race.diversity)) : 0,
    maximumProjectionError: races.length ? Math.max(...races.map((race) => race.maximumProjectionError)) : 0,
    races,
    warnings,
  };
}

export function getRaceDecisionWorldView(runtime, source, dateState = null) {
  const state = createRaceDecisionWorldState(runtime, source, dateState);
  return {
    state,
    balance: analyzeRaceDecisionBalance(state),
    races: Object.values(state.races).map((raceState) => ({
      raceId: raceState.raceId,
      raceName: normalizedPeopleDefinition(raceState.raceId).name,
      population: Math.round(raceState.population),
      temperamentShares: getTemperamentShares(raceState),
      representativeTemperament: getRepresentativeTemperament(raceState),
      representativeTraits: deriveRaceRepresentativeTraits(raceState),
      experience: { ...raceState.experience },
      historicalAgendas: raceState.historicalAgendas.map((agenda) => ({ ...agenda })),
      populationGroups: getRacePopulationGroups(raceState),
    })),
    nations: Object.values(deriveNationDecisionProfiles(runtime, state)),
    characters: Object.keys(state.characterProfiles).map((id) => deriveFixedCharacterDecisionProfile(state, id)).filter(Boolean),
    events: [...state.events].reverse(),
  };
}
