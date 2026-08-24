import { fnv1aUtf16, unitFromHash } from "./determinism.js";
import {
  getRaceCategory,
  getRaceDefinition,
  RACE_DECISION_TRAIT_IDS,
} from "./race-list.js";

export const RACE_DECISION_SCHEMA_VERSION = 1;
export const RACE_DECISION_EVENT_LIMIT = 192;

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

export function createRaceState({ raceId, seed, population = 1, source = null } = {}) {
  if (typeof raceId !== "string" || !raceId) throw new TypeError("RaceState requires a raceId.");
  const total = Math.max(1, fixed(source?.population ?? population, 3));
  const baseTraits = source?.baseTraits
    ? traitRecord(source.baseTraits)
    : deriveSeededRaceBaseTraits(raceId, seed);
  const initialShares = initialTemperamentShares(raceId, baseTraits, seed);
  const initialPopulation = Object.fromEntries(TEMPERAMENT_IDS.map((id) => [id, initialShares[id] * total]));
  return {
    raceId,
    baseTraits,
    temperamentPopulation: normalizeTemperamentPopulation(source?.temperamentPopulation ?? initialPopulation, total),
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

export function preserveRaceDecisionWorldState(source) {
  if (!source || typeof source !== "object" || Number(source.schemaVersion) !== RACE_DECISION_SCHEMA_VERSION) return null;
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
  return {
    schemaVersion: RACE_DECISION_SCHEMA_VERSION,
    seed: typeof source.seed === "string" ? source.seed : null,
    establishedPeriod: typeof source.establishedPeriod === "string" ? source.establishedPeriod : null,
    lastAdvancedPeriod: typeof source.lastAdvancedPeriod === "string" ? source.lastAdvancedPeriod : null,
    races,
    nationProfiles,
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

function chooseTemperament(raceState, seed, subjectId) {
  const shares = getTemperamentShares(raceState);
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
  const temperamentId = TEMPERAMENTS[options.temperamentId]
    ? options.temperamentId
    : chooseTemperament(raceState, seed, subjectId);
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
  return { id: subjectId, subjectId, raceId: raceState.raceId, roleId, temperamentId, individualOffsets: offsets, traits };
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

export function createRaceDecisionWorldState(runtime, source = null, dateState = null) {
  const preserved = preserveRaceDecisionWorldState(source);
  const seed = String(preserved?.seed ?? runtime.terrain.seed);
  const period = periodFor(dateState);
  const populations = populationsByRace(runtime);
  const races = { ...(preserved?.races ?? {}) };
  for (const [raceId, population] of Object.entries(populations)) {
    races[raceId] = createRaceState({ raceId, seed, population, source: races[raceId] });
  }
  const nationProfiles = { ...(preserved?.nationProfiles ?? {}) };
  for (const nation of runtime.nations.nations) {
    const raceId = nation.peopleId ?? "human";
    nationProfiles[nation.id] = createNationProfile(runtime, races[raceId], nation, period, nationProfiles[nation.id]);
  }
  return {
    schemaVersion: RACE_DECISION_SCHEMA_VERSION,
    seed,
    establishedPeriod: preserved?.establishedPeriod ?? period,
    lastAdvancedPeriod: preserved?.lastAdvancedPeriod ?? period,
    races,
    nationProfiles,
    events: preserved?.events ?? [],
  };
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

function deriveNationDecisionProfileFromState(runtime, raceWorld, nationId, nationOverride = null) {
  const nation = nationOverride?.id === nationId
    ? nationOverride
    : runtime.nationById.get(nationId) ?? runtime.nations.nations.find((entry) => entry.id === nationId);
  if (!nation) return null;
  const stored = raceWorld.nationProfiles[nationId]
    ?? createNationProfile(runtime, raceWorld.races[nation.peopleId ?? "human"], nation, raceWorld.lastAdvancedPeriod);
  const raceState = raceWorld.races[stored.raceId];
  const representativeTraits = deriveRaceRepresentativeTraits(raceState);
  const leader = createIndividualDecisionProfile(raceState, runtime.terrain.seed, {
    subjectId: stored.leader.id,
    roleId: stored.leader.roleId,
    temperamentId: stored.leader.temperamentId,
    individualOffsets: stored.leader.individualOffsets,
  });
  const traits = Object.fromEntries(RACE_DECISION_TRAIT_IDS.map((id) => [id, clampTrait(
    representativeTraits[id]
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
    experience: { ...raceState.experience },
    historicalAgendas: raceState.historicalAgendas.map((agenda) => ({ ...agenda })),
    relationModifiers: agendaRelationModifiers(raceState),
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
  return raceState;
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
    losses[war.attackerNationId] = (losses[war.attackerNationId] ?? 0) + attackerLoss;
    losses[war.defenderNationId] = (losses[war.defenderNationId] ?? 0) + defenderLoss;
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
  return { ...raceState, population: fixed(total, 3), temperamentPopulation: normalizeTemperamentPopulation(population, total) };
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
  for (const [nationId, casualties] of Object.entries(losses)) {
    const raceId = raceIdForNation(runtime, nationId);
    if (!raceId || !next.races[raceId] || casualties <= 0) continue;
    next.races[raceId] = applyRaceSocialEvent(next.races[raceId], { type: "war", intensity: 4, casualties, period });
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
    next.races[subjectRaceId] = applyRaceSocialEvent(next.races[subjectRaceId], { type: "domination", intensity: 4, period });
    if (occupation.policyId === "security" || occupation.resistance >= 72) {
      next.races[subjectRaceId] = applyRaceSocialEvent(next.races[subjectRaceId], { type: "persecution", intensity: 3, period });
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

export function getRaceDecisionWorldView(runtime, source, dateState = null) {
  const state = createRaceDecisionWorldState(runtime, source, dateState);
  return {
    state,
    races: Object.values(state.races).map((raceState) => ({
      raceId: raceState.raceId,
      raceName: normalizedPeopleDefinition(raceState.raceId).name,
      population: Math.round(raceState.population),
      temperamentShares: getTemperamentShares(raceState),
      representativeTemperament: getRepresentativeTemperament(raceState),
      representativeTraits: deriveRaceRepresentativeTraits(raceState),
      experience: { ...raceState.experience },
      historicalAgendas: raceState.historicalAgendas.map((agenda) => ({ ...agenda })),
    })),
    nations: Object.values(deriveNationDecisionProfiles(runtime, state)),
    events: [...state.events].reverse(),
  };
}
