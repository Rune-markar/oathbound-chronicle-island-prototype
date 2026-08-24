import { getTacticalPeopleDefinition } from "./race-list.js";

export const RACE_WORLD_EFFECT_SCHEMA_VERSION = 1;

const MULTIPLIER_KEYS = Object.freeze([
  "travelPenaltyMultiplier",
  "dangerDeltaMultiplier",
  "attack",
  "defense",
  "movement",
  "rangedAccuracy",
  "magicPower",
  "morale",
  "fatigueCost",
]);

const DEFAULT_MODIFIERS = Object.freeze(Object.fromEntries(MULTIPLIER_KEYS.map((key) => [key, 1])));

function definition(id, name, symbol, baseline = {}) {
  return Object.freeze({ id, name, symbol, baseline: Object.freeze({ ...baseline }) });
}

export const RACE_WORLD_EFFECT_DEFINITIONS = Object.freeze({
  rain: definition("rain", "長雨", "雨", { movement: 0.94, rangedAccuracy: 0.9 }),
  storm: definition("storm", "暴風雨", "嵐", { movement: 0.86, rangedAccuracy: 0.78, defense: 0.96 }),
  snow: definition("snow", "降雪", "雪", { movement: 0.9, fatigueCost: 1.08 }),
  blizzard: definition("blizzard", "吹雪", "吹", { movement: 0.76, rangedAccuracy: 0.72, morale: 0.94, fatigueCost: 1.16 }),
  sandstorm: definition("sandstorm", "砂嵐", "砂", { movement: 0.8, rangedAccuracy: 0.62, fatigueCost: 1.1 }),
  heatwave: definition("heatwave", "熱波", "熱", { movement: 0.92, attack: 0.96, fatigueCost: 1.12 }),
  fog: definition("fog", "濃霧", "霧", { movement: 0.94, rangedAccuracy: 0.68 }),
  ashfall: definition("ashfall", "降灰", "灰", { movement: 0.82, rangedAccuracy: 0.72, defense: 0.95, fatigueCost: 1.1 }),
  full_moon: definition("full_moon", "満月", "満"),
  new_moon: definition("new_moon", "新月", "新"),
  wartime_scarcity: definition("wartime_scarcity", "戦時物資高騰", "戦"),
});

function rule(id, effectId, label, summary, selector, modifiers = {}, options = {}) {
  return Object.freeze({
    id,
    effectId,
    label,
    summary,
    selector: Object.freeze({ ...selector }),
    modifiers: Object.freeze({ ...modifiers }),
    manifestation: Boolean(options.manifestation),
    tone: options.tone ?? "adaptive",
  });
}

export const RACE_WORLD_EFFECT_RULES = Object.freeze([
  rule("rain-water-body", "rain", "水性適応", "水性身体が雨とぬかるみを行動資源へ変える。", { anyTags: ["WATER_BODY", "AQUATIC"] }, { travelPenaltyMultiplier: 0.55, dangerDeltaMultiplier: 0.72, defense: 1.05, movement: 1.08 }),
  rule("rain-fire-body", "rain", "火体減衰", "水分が火炎身体と火属性魔力を弱める。", { anyTags: ["FIRE_BODY"] }, { travelPenaltyMultiplier: 1.35, dangerDeltaMultiplier: 1.3, attack: 0.88, magicPower: 0.82 }, { tone: "vulnerable" }),
  rule("rain-forest-attuned", "rain", "森雨同調", "森林感覚が雨中の進路と気配を補う。", { anyTags: ["FOREST_ATTUNED"] }, { travelPenaltyMultiplier: 0.78, dangerDeltaMultiplier: 0.8, movement: 1.04 }),

  rule("storm-wind-body", "storm", "風路同調", "風性身体が暴風の流れを読み、機動と魔力へ転換する。", { anyTags: ["WIND_BODY"] }, { travelPenaltyMultiplier: 0.45, dangerDeltaMultiplier: 0.55, movement: 1.2, rangedAccuracy: 1.08, magicPower: 1.15 }),
  rule("storm-flying", "storm", "飛行阻害", "風路と一体でない飛行種は乱気流に進路を奪われる。", { anyTags: ["FLYING"], noneTags: ["WIND_BODY"] }, { travelPenaltyMultiplier: 1.35, dangerDeltaMultiplier: 1.35, movement: 0.72, rangedAccuracy: 0.82 }, { tone: "vulnerable" }),

  rule("snow-cold-adapted", "snow", "耐寒適応", "耐寒生態が積雪下の行軍と戦線維持を支える。", { anyTags: ["COLD_ADAPTED"] }, { travelPenaltyMultiplier: 0.45, dangerDeltaMultiplier: 0.6, defense: 1.08, movement: 1.08 }),
  rule("snow-ectotherm", "snow", "低温停滞", "変温性により筋力と機動が低下する。", { anyTags: ["ECTOTHERM"] }, { travelPenaltyMultiplier: 1.5, dangerDeltaMultiplier: 1.25, attack: 0.9, movement: 0.8 }, { tone: "vulnerable" }),
  rule("blizzard-cold-adapted", "blizzard", "吹雪適応", "耐寒生態が吹雪での隊列と索敵を保つ。", { anyTags: ["COLD_ADAPTED"] }, { travelPenaltyMultiplier: 0.42, dangerDeltaMultiplier: 0.55, defense: 1.12, movement: 1.12, morale: 1.05 }),
  rule("blizzard-ectotherm", "blizzard", "凍結危機", "変温性の身体は吹雪で急激に活動を失う。", { anyTags: ["ECTOTHERM"] }, { travelPenaltyMultiplier: 1.7, dangerDeltaMultiplier: 1.4, attack: 0.82, defense: 0.9, movement: 0.65 }, { tone: "vulnerable" }),

  rule("sandstorm-arid", "sandstorm", "乾燥地適応", "乾燥耐性と砂地感覚が進路を保つ。", { anyTags: ["ARID_ADAPTED"] }, { travelPenaltyMultiplier: 0.42, dangerDeltaMultiplier: 0.6, defense: 1.05, movement: 1.1 }),
  rule("sandstorm-sealed", "sandstorm", "防塵身体", "密閉・地下性の身体が飛砂と呼吸障害を抑える。", { anyTags: ["SEALED_BODY", "SUBTERRANEAN_ADAPTED"] }, { travelPenaltyMultiplier: 0.7, dangerDeltaMultiplier: 0.8, defense: 1.03 }),
  rule("sandstorm-flying", "sandstorm", "飛砂乱流", "飛砂が飛行姿勢と視認を大きく乱す。", { anyTags: ["FLYING"] }, { travelPenaltyMultiplier: 1.3, dangerDeltaMultiplier: 1.2, movement: 0.78, rangedAccuracy: 0.8 }, { tone: "vulnerable" }),

  rule("heatwave-heat-adapted", "heatwave", "高温適応", "火性・乾燥地生態が熱を機動へ変える。", { anyTags: ["FIRE_BODY", "ARID_ADAPTED"] }, { travelPenaltyMultiplier: 0.45, dangerDeltaMultiplier: 0.65, attack: 1.05, movement: 1.08, fatigueCost: 0.8 }),
  rule("heatwave-unfatigued", "heatwave", "非生体耐熱", "死後・人工身体は脱水と熱疲労の影響を受けにくい。", { anyTags: ["DEATHLESS_BODY", "SEALED_BODY"] }, { travelPenaltyMultiplier: 0.65, dangerDeltaMultiplier: 0.8, fatigueCost: 0.7 }),
  rule("heatwave-cold-adapted", "heatwave", "耐寒種の熱負荷", "厚い被毛と寒冷適応が熱放散を妨げる。", { anyTags: ["COLD_ADAPTED"] }, { travelPenaltyMultiplier: 1.5, dangerDeltaMultiplier: 1.25, attack: 0.92, movement: 0.78, fatigueCost: 1.3 }, { tone: "vulnerable" }),

  rule("fog-night-yokai", "fog", "夜霧共鳴", "夜の濃霧が妖魔の潜伏、魔力、奇襲を強める。", { anyTags: ["NIGHT_FOG_AFFINITY"], nightOnly: true }, { travelPenaltyMultiplier: 0.5, dangerDeltaMultiplier: 0.45, attack: 1.12, movement: 1.1, magicPower: 1.18 }),
  rule("fog-forest-attuned", "fog", "森霧感知", "森林感覚が霧中の地形と接近音を補う。", { anyTags: ["FOREST_ATTUNED"] }, { travelPenaltyMultiplier: 0.76, dangerDeltaMultiplier: 0.7, rangedAccuracy: 0.95 }),

  rule("ashfall-mineral-body", "ashfall", "灰塵耐性", "火・土・人工・地下性の身体が灰と高温粒子を耐える。", { anyTags: ["FIRE_BODY", "EARTH_BODY", "SEALED_BODY", "SUBTERRANEAN_ADAPTED"] }, { travelPenaltyMultiplier: 0.55, dangerDeltaMultiplier: 0.65, defense: 1.08, fatigueCost: 0.75 }),
  rule("ashfall-water-body", "ashfall", "水源汚染", "灰が水性身体と依代を濁らせる。", { anyTags: ["WATER_BODY"] }, { travelPenaltyMultiplier: 1.25, dangerDeltaMultiplier: 1.2, magicPower: 0.9 }, { tone: "vulnerable" }),

  rule("full-moon-demon", "full_moon", "満月魔力潮", "満月が魔族系の契約魔力と闘争心を増幅する。", { anyTags: ["LUNAR_DEMON"], nightOnly: true }, { attack: 1.12, magicPower: 1.25, morale: 1.08 }),
  rule("new-moon-ethereal", "new_moon", "霊体実体化", "新月が霊体を物質界へ固定し、攻撃可能な実体として出現させる。", { anyTags: ["ETHEREAL_BODY", "ETHEREAL"], nightOnly: true }, { attack: 1.1, defense: 0.92, magicPower: 1.12 }, { manifestation: true, tone: "manifested" }),
]);

function effectIdOf(effect) {
  return typeof effect === "string" ? effect : effect?.type ?? effect?.id ?? null;
}

function effectStrength(effect) {
  if (typeof effect === "string") return 1;
  const value = Number(effect?.strength ?? 1);
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
}

function categoryIdOf(peopleId, profile) {
  return profile.categoryId ?? (profile.id === peopleId ? profile.id : null);
}

function selectorMatches(selector, profile, peopleId, options) {
  const tags = new Set([...(profile.tags ?? []), ...(profile.worldEffectTags ?? [])]);
  if (selector.nightOnly && !options.isNight) return false;
  if (selector.raceIds?.length && !selector.raceIds.includes(peopleId)) return false;
  if (selector.categoryIds?.length && !selector.categoryIds.includes(categoryIdOf(peopleId, profile))) return false;
  if (selector.anyTags?.length && !selector.anyTags.some((tag) => tags.has(tag))) return false;
  if (selector.noneTags?.some((tag) => tags.has(tag))) return false;
  return true;
}

function scaledMultiplier(multiplier, strength) {
  return 1 + ((Number(multiplier) || 1) - 1) * strength;
}

function multiplyModifiers(target, source, strength) {
  for (const key of MULTIPLIER_KEYS) {
    if (!Object.hasOwn(source, key)) continue;
    target[key] *= scaledMultiplier(source[key], strength);
  }
}

export function evaluateRaceWorldEffects(peopleId, activeEffects = [], options = {}) {
  const profile = getTacticalPeopleDefinition(peopleId ?? "human");
  const normalizedEffects = activeEffects
    .map((effect) => ({ source: effect, id: effectIdOf(effect), strength: effectStrength(effect) }))
    .filter((effect) => RACE_WORLD_EFFECT_DEFINITIONS[effect.id] && effect.strength > 0);
  const modifiers = { ...DEFAULT_MODIFIERS };
  const responses = [];
  let manifestation = false;

  for (const effect of normalizedEffects) {
    const definition = RACE_WORLD_EFFECT_DEFINITIONS[effect.id];
    multiplyModifiers(modifiers, definition.baseline, effect.strength);
    for (const candidate of RACE_WORLD_EFFECT_RULES) {
      if (candidate.effectId !== effect.id || !selectorMatches(candidate.selector, profile, peopleId, options)) continue;
      multiplyModifiers(modifiers, candidate.modifiers, effect.strength);
      manifestation ||= candidate.manifestation;
      responses.push({
        ruleId: candidate.id,
        effectId: effect.id,
        effectName: definition.name,
        label: candidate.label,
        summary: candidate.summary,
        tone: candidate.tone,
        strength: effect.strength,
        modifiers: { ...candidate.modifiers },
        manifestation: candidate.manifestation,
      });
    }
  }

  return {
    version: RACE_WORLD_EFFECT_SCHEMA_VERSION,
    peopleId: profile.id,
    peopleName: profile.name,
    categoryId: categoryIdOf(peopleId, profile),
    activeEffectIds: normalizedEffects.map((effect) => effect.id),
    modifiers: Object.fromEntries(Object.entries(modifiers).map(([key, value]) => [key, Number(value.toFixed(4))])),
    manifestation,
    responses,
    summary: responses.length ? responses.map((response) => response.label).join("・") : "種族固有反応なし",
  };
}

export function getRaceWorldEffectResponseRules(effectId) {
  return RACE_WORLD_EFFECT_RULES.filter((candidate) => candidate.effectId === effectId);
}
