export const TOWN_COMMAND_IDS = Object.freeze([
  "welfare.relief",
  "welfare.health",
  "city.patrol",
  "city.drill",
  "research.administration",
  "city.cultivate",
  "city.commerce",
  "city.repair",
]);

const TOWN_COMMAND_SET = new Set(TOWN_COMMAND_IDS);
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

const KIND_PROFILE = Object.freeze({
  "農村": { production: 10, commerce: -5, food: 0.34, infrastructure: -3, reach: -4 },
  "宿場村": { production: -2, commerce: 10, food: 0.22, infrastructure: 7, reach: 3 },
  "河漁村": { production: 4, commerce: 3, food: 0.28, infrastructure: -1, reach: -2 },
  "舟運村": { production: 1, commerce: 12, food: 0.23, infrastructure: 8, reach: 5 },
  "鉱村": { production: 12, commerce: 1, food: 0.17, infrastructure: -5, reach: -7 },
});

function issueBias(townId) {
  return [...townId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 9;
}

function createTownState(world, state, townId) {
  const definition = world.villages[townId];
  const city = state.cities[definition.province];
  const profile = KIND_PROFILE[definition.kind] ?? {};
  const bias = issueBias(townId);
  const administration = city.internal.administrativeEfficiency;
  return {
    id: townId,
    cityId: definition.province,
    population: definition.population,
    production: clamp(city.resources.production + (profile.production ?? 0) - bias / 2),
    commerce: clamp(city.resources.commerce + (profile.commerce ?? 0) - bias / 3),
    security: clamp(city.resources.security - 5 - bias / 2),
    support: clamp(city.resources.support - 3 + bias / 3),
    sanitation: clamp(city.internal.sanitation - 7 - bias / 2),
    infrastructure: clamp(58 + (profile.infrastructure ?? 0) - bias / 2),
    preparedness: clamp(city.military.training - 8 - bias / 2),
    registryCoverage: clamp(administration - 6 - bias),
    administrativeReach: clamp(administration - 10 + (profile.reach ?? 0) - bias / 2),
    petitionBacklog: clamp(22 + bias * 2 + Math.max(0, 65 - administration) / 2),
    foodReserve: Math.round(definition.population * (profile.food ?? 0.22)),
    history: [],
  };
}

export function isTownCommand(commandOrId) {
  const id = typeof commandOrId === "string" ? commandOrId : commandOrId?.id;
  return TOWN_COMMAND_SET.has(id);
}

export function normalizeTownAdministration(world, state) {
  state.towns ??= {};
  Object.keys(world.villages).forEach((townId) => {
    const baseline = createTownState(world, state, townId);
    const current = state.towns[townId] ?? {};
    const normalized = { ...baseline, ...current, id: townId, cityId: world.villages[townId].province };
    [
      "population", "production", "commerce", "security", "support", "sanitation",
      "infrastructure", "preparedness", "registryCoverage", "administrativeReach",
      "petitionBacklog", "foodReserve",
    ].forEach((key) => { normalized[key] = finite(current[key], baseline[key]); });
    normalized.population = Math.max(100, Math.round(normalized.population));
    normalized.foodReserve = Math.max(0, Math.round(normalized.foodReserve));
    [
      "production", "commerce", "security", "support", "sanitation", "infrastructure",
      "preparedness", "registryCoverage", "administrativeReach", "petitionBacklog",
    ].forEach((key) => { normalized[key] = clamp(normalized[key]); });
    normalized.history = Array.isArray(current.history) ? current.history.slice(0, 24) : [];
    state.towns[townId] = normalized;
  });
  Object.keys(state.towns).forEach((townId) => {
    if (!world.villages[townId]) delete state.towns[townId];
  });
  return state;
}

function townForecast(town, kind) {
  const profile = KIND_PROFILE[kind] ?? {};
  const administrativeCapacity = clamp(
    town.registryCoverage * 0.34
    + town.administrativeReach * 0.34
    + (100 - town.petitionBacklog) * 0.32,
  );
  const foodSecurity = clamp(town.foodReserve / Math.max(1, town.population * 0.3) * 100);
  const populationDelta = Math.round(town.population * (
    (town.sanitation - 50) / 42000
    + (town.support - 50) / 52000
    + (foodSecurity - 50) / 65000
  ));
  const revenue = Number((town.population / 1900 * (
    town.production * 0.52 + town.commerce * 0.48
  ) / 100).toFixed(1));
  const harvest = town.population * (
    (profile.food ?? 0.22) * 0.48 + town.production / 1000 + town.commerce / 1800
  );
  const consumption = town.population * 0.19;
  const foodDelta = Math.round(harvest - consumption);
  const petitionDelta = Number((
    (100 - administrativeCapacity) / 45
    + Math.max(0, 55 - town.support) / 35
    - 1.15
  ).toFixed(1));
  const needs = [
    { id: "administration", label: "行政処理", value: administrativeCapacity },
    { id: "food", label: "食料備蓄", value: foodSecurity },
    { id: "sanitation", label: "衛生", value: town.sanitation },
    { id: "security", label: "治安", value: town.security },
    { id: "infrastructure", label: "基盤", value: town.infrastructure },
    { id: "support", label: "民心", value: town.support },
  ].sort((left, right) => left.value - right.value);
  return { administrativeCapacity, foodSecurity, populationDelta, revenue, foodDelta, petitionDelta, primaryNeed: needs[0], needs };
}

export function getTownAdministration(world, state, townId) {
  normalizeTownAdministration(world, state);
  const definition = world.villages[townId];
  const town = state.towns[townId];
  if (!definition || !town) return null;
  const forecast = townForecast(town, definition.kind);
  return {
    ...definition,
    ...town,
    townId,
    name: definition.name,
    kind: definition.kind,
    issue: definition.issue,
    province: definition.province,
    forecast,
  };
}

export function applyTownCommand(world, state, task, delta, outcome) {
  if (!isTownCommand(task.commandId) || !task.townId) return null;
  normalizeTownAdministration(world, state);
  const town = state.towns[task.townId];
  const definition = world.villages[task.townId];
  if (!town || definition.province !== task.cityId) return null;
  const strong = Math.max(2, Math.round(delta * 1.35));
  switch (task.commandId) {
    case "welfare.relief":
      town.support = clamp(town.support + strong + 1);
      town.security = clamp(town.security + Math.max(1, Math.round(delta / 2)));
      town.petitionBacklog = clamp(town.petitionBacklog - strong);
      break;
    case "welfare.health":
      town.sanitation = clamp(town.sanitation + strong + 1);
      town.support = clamp(town.support + Math.max(1, Math.round(delta / 2)));
      break;
    case "city.patrol":
      town.security = clamp(town.security + strong);
      town.petitionBacklog = clamp(town.petitionBacklog - Math.max(1, delta));
      break;
    case "city.drill":
      town.preparedness = clamp(town.preparedness + strong);
      town.security = clamp(town.security + Math.max(1, Math.round(delta / 2)));
      break;
    case "research.administration":
      town.registryCoverage = clamp(town.registryCoverage + strong);
      town.administrativeReach = clamp(town.administrativeReach + Math.max(2, delta));
      town.petitionBacklog = clamp(town.petitionBacklog - strong);
      break;
    case "city.cultivate":
      town.production = clamp(town.production + strong);
      town.foodReserve = Math.max(0, town.foodReserve + Math.round(town.population * 0.06));
      break;
    case "city.commerce":
      town.commerce = clamp(town.commerce + strong);
      town.infrastructure = clamp(town.infrastructure + Math.max(1, Math.round(delta / 2)));
      break;
    case "city.repair":
      town.infrastructure = clamp(town.infrastructure + strong + 1);
      town.administrativeReach = clamp(town.administrativeReach + Math.max(1, Math.round(delta / 2)));
      break;
    default:
      return null;
  }
  town.history.unshift({
    turn: state.turn,
    year: state.year,
    month: state.month,
    commandId: task.commandId,
    outcome,
    officerId: task.officerId,
  });
  town.history = town.history.slice(0, 24);
  return getTownAdministration(world, state, task.townId);
}

export function advanceTownAdministration(world, state) {
  normalizeTownAdministration(world, state);
  return Object.keys(world.villages).map((townId) => {
    const definition = world.villages[townId];
    const town = state.towns[townId];
    const forecast = townForecast(town, definition.kind);
    const before = { population: town.population, foodReserve: town.foodReserve, petitionBacklog: town.petitionBacklog };
    town.population = Math.max(100, town.population + forecast.populationDelta);
    town.foodReserve = Math.max(0, town.foodReserve + forecast.foodDelta);
    town.petitionBacklog = clamp(town.petitionBacklog + forecast.petitionDelta);
    town.infrastructure = clamp(town.infrastructure - 0.15);
    if (forecast.foodSecurity < 35) town.support = clamp(town.support - 0.5);
    if (town.petitionBacklog > 70) town.support = clamp(town.support - 0.35);
    return {
      townId,
      cityId: town.cityId,
      name: definition.name,
      populationDelta: town.population - before.population,
      foodDelta: town.foodReserve - before.foodReserve,
      petitionDelta: Number((town.petitionBacklog - before.petitionBacklog).toFixed(1)),
    };
  });
}
