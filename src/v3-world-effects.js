import { fnv1aCharacters, unitFromHash } from "./determinism.js";
import {
  GAME_DAYS_PER_MONTH,
  GAME_CLOCK_EPOCH,
  GAME_MINUTES_PER_DAY,
  GAME_MONTHS_PER_YEAR,
  getGameCalendar,
} from "./game-clock.js";
import { evaluateRaceWorldEffects } from "./race-world-effect-system.js";

export const V3_WORLD_EFFECTS_VERSION = 2;
export const V3_WORLD_EFFECT_FRONT_LIMIT = 9;
export const V3_PRIMARY_MOON_CYCLE_DAYS = 30;

export const V3_CELESTIAL_EFFECT_DEFINITIONS = Object.freeze({
  full_moon: Object.freeze({ id: "full_moon", name: "満月", symbol: "満", description: "主月の魔力潮が魔族系種族を強める。" }),
  new_moon: Object.freeze({ id: "new_moon", name: "新月", symbol: "新", description: "主月の光が消え、霊体が実体化して地上へ現れる。" }),
});

const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const hashUnit = (seed, ...parts) => unitFromHash(fnv1aCharacters(`${seed}:${parts.join(":")}`));
const periodFor = ({ year, month }) => `${year}-${month}`;

export const V3_WORLD_EFFECT_DEFINITIONS = Object.freeze({
  rain: Object.freeze({
    id: "rain", name: "長雨", symbol: "雨", color: "#6ea6bd", motion: "rain",
    travelMultiplier: 1.22, dangerDelta: 0.008,
    description: "ぬかるみで移動が遅くなり、雨音で周囲の気配を捉えにくい。",
  }),
  storm: Object.freeze({
    id: "storm", name: "暴風雨", symbol: "嵐", color: "#577b9d", motion: "storm",
    travelMultiplier: 1.55, dangerDelta: 0.035,
    description: "強風と豪雨が街道を乱し、移動と遭遇の危険を大きくする。",
  }),
  snow: Object.freeze({
    id: "snow", name: "降雪", symbol: "雪", color: "#d8e5e7", motion: "snow",
    travelMultiplier: 1.32, dangerDelta: 0.012,
    description: "積雪が足を取り、白い地表が遠近感を曖昧にする。",
  }),
  blizzard: Object.freeze({
    id: "blizzard", name: "吹雪", symbol: "吹", color: "#afc9d8", motion: "blizzard",
    travelMultiplier: 1.72, dangerDelta: 0.04,
    description: "視界を奪う雪と風により、移動も遭遇回避も難しくなる。",
  }),
  sandstorm: Object.freeze({
    id: "sandstorm", name: "砂嵐", symbol: "砂", color: "#c79a58", motion: "sandstorm",
    travelMultiplier: 1.58, dangerDelta: 0.034,
    description: "飛砂が進路を覆い、乾燥地の移動と索敵を妨げる。",
  }),
  heatwave: Object.freeze({
    id: "heatwave", name: "熱波", symbol: "熱", color: "#d46f43", motion: "heatwave",
    travelMultiplier: 1.28, dangerDelta: 0.014,
    description: "強い熱が休息を増やし、通常より移動に時間がかかる。",
  }),
  fog: Object.freeze({
    id: "fog", name: "濃霧", symbol: "霧", color: "#a9beb8", motion: "fog",
    travelMultiplier: 1.18, dangerDelta: 0.022,
    description: "湿った霧が目印を隠し、不意の遭遇を避けにくくする。",
  }),
  ashfall: Object.freeze({
    id: "ashfall", name: "降灰", symbol: "灰", color: "#8e7b74", motion: "ashfall",
    travelMultiplier: 1.46, dangerDelta: 0.03,
    description: "火山灰が足場と空気を悪化させ、周辺の行動を鈍らせる。",
  }),
});

const EFFECT_SLOTS = Object.freeze([
  Object.freeze({ type: "rain", frequency: 0.92 }),
  Object.freeze({ type: "storm", frequency: 0.78 }),
  Object.freeze({ type: "snow", frequency: 0.82 }),
  Object.freeze({ type: "sandstorm", frequency: 0.76 }),
  Object.freeze({ type: "heatwave", frequency: 0.7 }),
  Object.freeze({ type: "fog", frequency: 0.72 }),
  Object.freeze({ type: "rain", frequency: 0.68 }),
  Object.freeze({ type: "storm", frequency: 0.52 }),
  Object.freeze({ type: "ashfall", frequency: 0.24 }),
]);

function calendarFor(source = {}) {
  if (Number.isInteger(source.year) && Number.isInteger(source.month)) {
    return { year: Math.max(1, source.year), month: Math.min(12, Math.max(1, source.month)) };
  }
  return getGameCalendar(source.clock);
}

function detailedCalendarFor(source = {}) {
  if (source?.clock) return getGameCalendar(source.clock);
  if (Number.isFinite(source?.clockMinutes)) return getGameCalendar({ elapsedMinutes: source.clockMinutes });
  if (Number.isInteger(source?.year) && Number.isInteger(source?.month)) {
    const epochIndex = GAME_CLOCK_EPOCH.year * GAME_MONTHS_PER_YEAR + GAME_CLOCK_EPOCH.month - 1;
    const requestedIndex = source.year * GAME_MONTHS_PER_YEAR + Math.min(12, Math.max(1, source.month)) - 1;
    const monthOffset = Math.max(0, requestedIndex - epochIndex);
    const day = Math.min(GAME_DAYS_PER_MONTH, Math.max(1, Math.round(Number(source.day) || 1)));
    const hour = Math.min(23, Math.max(0, Math.round(Number(source.hour) || 12)));
    return getGameCalendar({ elapsedMinutes: monthOffset * GAME_DAYS_PER_MONTH * GAME_MINUTES_PER_DAY + (day - 1) * GAME_MINUTES_PER_DAY + hour * 60 });
  }
  return getGameCalendar();
}

function moonPhaseForDay(cycleDay) {
  if (cycleDay === 1) return { id: "new_moon", name: "新月", symbol: "新" };
  if (cycleDay <= 7) return { id: "waxing_crescent", name: "満ちる細月", symbol: "◔" };
  if (cycleDay <= 14) return { id: "waxing", name: "満ちる月", symbol: "◑" };
  if (cycleDay === 15) return { id: "full_moon", name: "満月", symbol: "満" };
  if (cycleDay <= 22) return { id: "waning", name: "欠ける月", symbol: "◐" };
  return { id: "waning_crescent", name: "欠ける細月", symbol: "◕" };
}

export function getV3CelestialEffects(context, state = {}) {
  const calendar = detailedCalendarFor(state);
  const absoluteDay = Math.floor(calendar.elapsedMinutes / GAME_MINUTES_PER_DAY);
  const cycleDay = ((absoluteDay % V3_PRIMARY_MOON_CYCLE_DAYS) + V3_PRIMARY_MOON_CYCLE_DAYS) % V3_PRIMARY_MOON_CYCLE_DAYS + 1;
  const phase = moonPhaseForDay(cycleDay);
  const isNight = calendar.hour >= 20 || calendar.hour < 5;
  const primaryMoon = context?.runtime?.terrain?.astronomy?.moons?.[0] ?? "主月";
  const activeDefinition = isNight ? V3_CELESTIAL_EFFECT_DEFINITIONS[phase.id] : null;
  const active = activeDefinition ? [{
    ...activeDefinition,
    type: activeDefinition.id,
    strength: 1,
    source: "celestial",
    moonName: primaryMoon,
  }] : [];
  return {
    primaryMoon,
    cycleDays: V3_PRIMARY_MOON_CYCLE_DAYS,
    cycleDay,
    phaseId: phase.id,
    phaseName: phase.name,
    symbol: phase.symbol,
    isNight,
    active,
    calendar: { year: calendar.year, month: calendar.month, day: calendar.day, hour: calendar.hour, minute: calendar.minute },
  };
}

function isWater(tile) {
  return tile?.passable === false || ["water", "ocean", "coast", "lake"].includes(tile?.terrain);
}

function tileClimate(tile, month) {
  const baseTemperature = Number.isFinite(tile?.temperatureC)
    ? tile.temperatureC
    : tile?.terrain === "snow" ? -10 : tile?.terrain === "tundra" ? 1 : tile?.terrain === "desert" ? 31 : 16;
  const latitude = clamp(Math.abs(tile?.latitude ?? 0), 0, 1) * Math.sign(Number(tile?.latitude) || 1);
  const seasonalWave = Math.cos((month - 7) / 12 * Math.PI * 2);
  const seasonalTemperature = baseTemperature + seasonalWave * latitude * (5 + Math.abs(latitude) * 9);
  const precipitationMm = Number.isFinite(tile?.precipitationMm)
    ? tile.precipitationMm
    : tile?.terrain === "desert" ? 180 : tile?.terrain === "snow" ? 680 : 920;
  return { temperatureC: seasonalTemperature, precipitationMm };
}

function suitability(type, tile, month) {
  if (!tile) return 0;
  const tags = new Set(tile.geographyTags ?? []);
  const water = isWater(tile);
  const { temperatureC, precipitationMm } = tileClimate(tile, month);
  const moisture = clamp(tile.soilMoisture ?? precipitationMm / 2200);
  if (type === "rain") {
    if (water || precipitationMm < 560 || temperatureC <= -2) return 0;
    return clamp((precipitationMm - 480) / 1900 + moisture * 0.32);
  }
  if (type === "storm") {
    const coastal = water || tags.has("coast") || tags.has("island") || tags.has("bay");
    if (!coastal && precipitationMm < 1450) return 0;
    return clamp(0.3 + (coastal ? 0.34 : 0) + precipitationMm / 4200);
  }
  if (type === "snow") {
    if (water || temperatureC > 5) return 0;
    return clamp((7 - temperatureC) / 22 + precipitationMm / 3600);
  }
  if (type === "sandstorm") {
    if (water || !(tile.terrain === "desert" || tags.has("desert") || tags.has("sand_desert"))) return 0;
    return clamp(0.72 + (1 - precipitationMm / 900) * 0.25);
  }
  if (type === "heatwave") {
    if (water || temperatureC < 25) return 0;
    return clamp((temperatureC - 22) / 18 + (1 - precipitationMm / 1800) * 0.24);
  }
  if (type === "fog") {
    const lowWetland = tags.has("marsh") || tags.has("river") || tags.has("delta") || tags.has("basin");
    if (water || (!lowWetland && moisture < 0.58)) return 0;
    return clamp(0.24 + moisture * 0.62 + (tile.floodRisk ?? 0) * 0.25);
  }
  if (type === "ashfall") {
    return tile.terrainSite?.type === "volcano" || tags.has("volcano") || tags.has("caldera") ? 1 : 0;
  }
  return 0;
}

function wrappedMacroDistance(context, left, right) {
  const width = context.runtime.terrain.width;
  const rawX = Math.abs(left.x - right.x);
  return Math.hypot(Math.min(rawX, width - rawX), left.y - right.y);
}

function bestCandidate(context, calendar, type, slotIndex, used) {
  let best = null;
  for (const tile of context.runtime.tiles) {
    const fitness = suitability(type, tile, calendar.month);
    if (fitness <= 0) continue;
    if (used.some((entry) => wrappedMacroDistance(context, tile, entry) < 3)) continue;
    const noise = hashUnit(context.seed, periodFor(calendar), type, slotIndex, tile.index);
    const score = fitness * 0.78 + noise * 0.22;
    if (!best || score > best.score || (score === best.score && tile.index < best.tile.index)) best = { tile, score, fitness };
  }
  return best;
}

function frontFromCandidate(context, calendar, type, slotIndex, candidate) {
  const definition = V3_WORLD_EFFECT_DEFINITIONS[type];
  const period = periodFor(calendar);
  const radiusLimit = Math.max(2, Math.min(context.runtime.terrain.width, context.runtime.terrain.height) / 4);
  const radius = Math.min(radiusLimit, 7 + hashUnit(context.seed, period, type, slotIndex, "radius") * 11);
  const intensity = 1 + Math.floor(hashUnit(context.seed, period, type, slotIndex, "intensity") * 3);
  const region = context.runtime.regionById?.get(candidate.tile.regionId) ?? null;
  const severeSnow = type === "snow" && intensity === 3;
  const resolvedType = severeSnow ? "blizzard" : type;
  const resolvedDefinition = V3_WORLD_EFFECT_DEFINITIONS[resolvedType];
  return {
    id: `world-effect:${period}:${resolvedType}:${slotIndex}`,
    type: resolvedType,
    name: resolvedDefinition.name,
    symbol: resolvedDefinition.symbol,
    color: resolvedDefinition.color,
    x: candidate.tile.x,
    y: candidate.tile.y,
    radius: Number(radius.toFixed(2)),
    intensity,
    direction: Math.round(hashUnit(context.seed, period, type, slotIndex, "direction") * 359),
    regionId: candidate.tile.regionId ?? null,
    regionName: region?.name ?? null,
    terrain: candidate.tile.terrain ?? null,
    summary: resolvedDefinition.description,
    sourceType: definition.id,
  };
}

export function createV3WorldEffects(context, dateState = {}) {
  if (!context?.runtime?.terrain || !Array.isArray(context.runtime.tiles)) throw new TypeError("ワールドエフェクトにはV3生成世界が必要です。");
  const calendar = calendarFor(dateState);
  const period = periodFor(calendar);
  const fronts = [];
  const used = [];
  EFFECT_SLOTS.forEach((slot, slotIndex) => {
    if (fronts.length >= V3_WORLD_EFFECT_FRONT_LIMIT) return;
    if (hashUnit(context.seed, period, slot.type, slotIndex, "active") > slot.frequency) return;
    const candidate = bestCandidate(context, calendar, slot.type, slotIndex, used);
    if (!candidate) return;
    fronts.push(frontFromCandidate(context, calendar, slot.type, slotIndex, candidate));
    used.push(candidate.tile);
  });
  if (!fronts.length) {
    const fallback = ["rain", "storm", "snow", "sandstorm", "heatwave", "fog", "ashfall"]
      .map((type, index) => ({ type, index, candidate: bestCandidate(context, calendar, type, index, []) }))
      .filter((entry) => entry.candidate)
      .sort((left, right) => right.candidate.score - left.candidate.score)[0];
    if (fallback) fronts.push(frontFromCandidate(context, calendar, fallback.type, fallback.index, fallback.candidate));
  }
  return {
    version: V3_WORLD_EFFECTS_VERSION,
    seed: context.seed,
    period,
    year: calendar.year,
    month: calendar.month,
    fronts,
  };
}

function normalizeFront(context, source) {
  const definition = V3_WORLD_EFFECT_DEFINITIONS[source?.type];
  if (!definition || !Number.isFinite(source.x) || !Number.isFinite(source.y)) return null;
  const width = context.runtime.terrain.width;
  const height = context.runtime.terrain.height;
  const x = ((Math.round(source.x) % width) + width) % width;
  const y = Math.min(height - 1, Math.max(0, Math.round(source.y)));
  return {
    id: String(source.id ?? `world-effect:${source.type}:${x}:${y}`),
    type: definition.id,
    name: definition.name,
    symbol: definition.symbol,
    color: definition.color,
    x,
    y,
    radius: clamp(source.radius, 1, Math.max(width, height)),
    intensity: Math.round(clamp(source.intensity, 1, 3)),
    direction: Math.round(clamp(source.direction, 0, 359)),
    regionId: typeof source.regionId === "string" ? source.regionId : null,
    regionName: typeof source.regionName === "string" ? source.regionName : null,
    terrain: typeof source.terrain === "string" ? source.terrain : null,
    summary: definition.description,
    sourceType: typeof source.sourceType === "string" ? source.sourceType : definition.id,
  };
}

export function normalizeV3WorldEffectsState(context, state) {
  const calendar = calendarFor(state);
  const period = periodFor(calendar);
  const source = state?.worldEffects;
  if (source?.version !== V3_WORLD_EFFECTS_VERSION || source.seed !== context.seed || source.period !== period) {
    return { ...state, worldEffects: createV3WorldEffects(context, calendar) };
  }
  const fronts = (Array.isArray(source.fronts) ? source.fronts : [])
    .map((front) => normalizeFront(context, front))
    .filter(Boolean)
    .slice(0, V3_WORLD_EFFECT_FRONT_LIMIT);
  return { ...state, worldEffects: { ...source, version: V3_WORLD_EFFECTS_VERSION, seed: context.seed, period, year: calendar.year, month: calendar.month, fronts } };
}

export function setV3WorldEffectsPeriod(context, state, calendar) {
  return { ...state, worldEffects: createV3WorldEffects(context, calendar) };
}

export function getV3WorldEffectAt(context, effectsOrState, detailX, detailY) {
  const effects = effectsOrState?.worldEffects ?? effectsOrState;
  if (!effects?.fronts?.length) return null;
  const detailScale = context.detailScale ?? (context.width / context.runtime.terrain.width);
  const point = { x: detailX / detailScale, y: detailY / detailScale };
  let strongest = null;
  for (const front of effects.fronts) {
    const definition = V3_WORLD_EFFECT_DEFINITIONS[front.type];
    if (!definition) continue;
    const distance = wrappedMacroDistance(context, point, front);
    if (distance >= front.radius) continue;
    const strength = clamp(1 - distance / front.radius);
    const score = strength * front.intensity;
    if (strongest && strongest.score >= score) continue;
    const factor = Math.pow(strength, 0.68);
    strongest = {
      ...front,
      motion: definition.motion,
      description: definition.description,
      strength: Number(strength.toFixed(3)),
      score,
      travelMultiplier: 1 + (definition.travelMultiplier - 1) * factor,
      dangerDelta: definition.dangerDelta * factor,
    };
  }
  if (!strongest) return null;
  delete strongest.score;
  return strongest;
}

export function getV3ActiveWorldEffects(context, state, detailX = state?.player?.x, detailY = state?.player?.y, effectsOverride = null, dateState = null) {
  const local = Number.isFinite(detailX) && Number.isFinite(detailY)
    ? getV3WorldEffectAt(context, effectsOverride ?? state, detailX, detailY)
    : null;
  const celestial = getV3CelestialEffects(context, dateState ?? state);
  return {
    local,
    celestial,
    active: [...(local ? [local] : []), ...celestial.active],
  };
}

export function getV3RaceWorldEffectAt(context, state, peopleId, detailX = state?.player?.x, detailY = state?.player?.y, effectsOverride = null, dateState = null) {
  const effects = getV3ActiveWorldEffects(context, state, detailX, detailY, effectsOverride, dateState);
  return {
    ...evaluateRaceWorldEffects(peopleId ?? "human", effects.active, { isNight: effects.celestial.isNight }),
    local: effects.local,
    celestial: effects.celestial,
  };
}

function adjustedLocalEffect(context, state, effect, peopleId, detailX, detailY, dateState = null, effectsOverride = null) {
  if (!effect) return null;
  const response = getV3RaceWorldEffectAt(context, state, peopleId, detailX, detailY, effectsOverride ?? state?.worldEffects, dateState);
  const travelMultiplier = 1 + (effect.travelMultiplier - 1) * response.modifiers.travelPenaltyMultiplier;
  const dangerDelta = effect.dangerDelta * response.modifiers.dangerDeltaMultiplier;
  return {
    ...effect,
    baseTravelMultiplier: effect.travelMultiplier,
    baseDangerDelta: effect.dangerDelta,
    travelMultiplier,
    dangerDelta,
    raceResponse: response,
  };
}

export function applyV3WorldEffectToTile(context, state, tile) {
  if (!tile?.macroTile || !tile.passable) return { ...tile, worldEffect: null };
  const rawEffect = getV3WorldEffectAt(context, state, tile.x, tile.y);
  const effect = adjustedLocalEffect(context, state, rawEffect, state?.player?.raceId ?? "human", tile.x, tile.y);
  if (!effect) return { ...tile, worldEffect: null };
  const baseTravelMinutes = Math.max(0, Number(tile.travelMinutes) || 0);
  const travelMinutes = Math.max(baseTravelMinutes, Math.ceil(baseTravelMinutes * effect.travelMultiplier));
  return {
    ...tile,
    baseTravelMinutes,
    travelMinutes,
    dangerBias: Math.max(0, Number(tile.dangerBias) || 0) + effect.dangerDelta,
    effectNote: `${effect.name}: ${effect.description}${effect.raceResponse.responses.length ? ` / ${effect.raceResponse.summary}` : ""}`,
    worldEffect: effect,
  };
}

export function getV3WorldEffectsView(context, state, dateState = null) {
  const effects = dateState ? createV3WorldEffects(context, dateState) : (state.worldEffects ?? createV3WorldEffects(context, calendarFor(state)));
  const rawLocal = state?.player ? getV3WorldEffectAt(context, effects, state.player.x, state.player.y) : null;
  const local = state?.player
    ? adjustedLocalEffect(context, state, rawLocal, state.player.raceId ?? "human", state.player.x, state.player.y, dateState, effects)
    : null;
  const celestial = getV3CelestialEffects(context, dateState ?? state);
  const raceResponse = state?.player
    ? evaluateRaceWorldEffects(state.player.raceId ?? "human", [...(rawLocal ? [rawLocal] : []), ...celestial.active], { isNight: celestial.isNight })
    : null;
  return {
    period: effects.period,
    year: effects.year,
    month: effects.month,
    fronts: effects.fronts.map((front) => {
      const definition = V3_WORLD_EFFECT_DEFINITIONS[front.type];
      return {
        ...front,
        motion: definition.motion,
        description: definition.description,
        travelPenaltyPercent: Math.round((definition.travelMultiplier - 1) * 100),
        dangerPercent: Math.round(definition.dangerDelta * 1000) / 10,
      };
    }),
    local,
    celestial,
    activeGlobal: celestial.active,
    raceResponse,
  };
}

export function getV3WartimeMarketEffect({ activeWars = [], nationId = null, nationName = null, regionId = null } = {}) {
  if (!nationId) return null;
  const wars = activeWars.filter((war) => war?.attackerNationId === nationId || war?.defenderNationId === nationId);
  if (!wars.length) return null;
  const targeted = wars.filter((war) => war.targetRegionId && war.targetRegionId === regionId).length;
  const severity = Math.min(3, 1 + Math.max(0, wars.length - 1) * 0.5 + targeted * 0.75);
  const basePressure = 1 + 0.035 * severity;
  const commodityPriceMultipliers = {
    grain: 1 + 0.09 * severity,
    timber: 1 + 0.045 * severity,
    herbs: 1 + 0.075 * severity,
    iron: 1 + 0.11 * severity,
    wool: 1 + 0.035 * severity,
    salt: 1 + 0.06 * severity,
  };
  const commodityStockMultipliers = {
    grain: 1 - 0.08 * severity,
    timber: 1 - 0.035 * severity,
    herbs: 1 - 0.065 * severity,
    iron: 1 - 0.075 * severity,
    wool: 1 - 0.025 * severity,
    salt: 1 - 0.05 * severity,
  };
  return {
    id: `wartime-scarcity:${nationId}:${wars.map((war) => war.id).sort().join("+")}`,
    effectId: "wartime_scarcity",
    name: "戦時物資高騰",
    symbol: "戦",
    severity: Number(severity.toFixed(2)),
    warIds: wars.map((war) => war.id),
    targeted,
    priceMultiplier: basePressure,
    commodityPriceMultipliers,
    commodityStockMultipliers,
    summary: `${nationName ?? nationId}は${wars.length}件の戦争中。軍需と輸送難で穀物・薬草・鉄・塩を中心に高騰。`,
  };
}
