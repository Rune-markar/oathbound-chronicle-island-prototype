import { abilityModifier } from "./character-abilities.js";

export const ACTION_ACTOR_TYPES = Object.freeze({
  AI: "ai",
  LOCAL_PLAYER: "local_player",
  REMOTE_PLAYER: "remote_player",
});

export const ACTION_TIMING_DEFAULTS = Object.freeze({
  version: 1,
  abilityBaseline: 10,
  ai: Object.freeze({ baseInterval: 7, minimumInterval: 3, maximumInterval: 14 }),
  localPlayer: Object.freeze({ baseInterval: 10, minimumInterval: 4, maximumInterval: 18 }),
  remotePlayer: Object.freeze({ baseIntervals: Object.freeze([35, 42]), minimumInterval: 21, maximumInterval: 56 }),
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function hashInteger(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function resolveActionTimingConfig(overrides = {}) {
  const defaults = ACTION_TIMING_DEFAULTS;
  return {
    version: defaults.version,
    abilityBaseline: Number.isFinite(Number(overrides.abilityBaseline))
      ? Number(overrides.abilityBaseline)
      : defaults.abilityBaseline,
    ai: { ...defaults.ai, ...(overrides.ai ?? {}) },
    localPlayer: { ...defaults.localPlayer, ...(overrides.localPlayer ?? {}) },
    remotePlayer: {
      ...defaults.remotePlayer,
      ...(overrides.remotePlayer ?? {}),
      baseIntervals: Array.isArray(overrides.remotePlayer?.baseIntervals) && overrides.remotePlayer.baseIntervals.length
        ? overrides.remotePlayer.baseIntervals.map(Number).filter(Number.isFinite)
        : [...defaults.remotePlayer.baseIntervals],
    },
  };
}

function profileFor(actorType, actorId, config) {
  if (actorType === ACTION_ACTOR_TYPES.LOCAL_PLAYER) return config.localPlayer;
  if (actorType === ACTION_ACTOR_TYPES.REMOTE_PLAYER) {
    const baseIntervals = config.remotePlayer.baseIntervals;
    return {
      ...config.remotePlayer,
      baseInterval: baseIntervals[hashInteger(actorId) % baseIntervals.length],
    };
  }
  return config.ai;
}

export function deriveActionInterval({ actorType = ACTION_ACTOR_TYPES.AI, actorId = "actor", abilityScore = 10 } = {}, overrides = {}) {
  const config = resolveActionTimingConfig(overrides);
  const profile = profileFor(actorType, actorId, config);
  const normalizedAbility = clamp(Math.round(Number(abilityScore) || config.abilityBaseline), 3, 30);
  const interval = Math.round(Number(profile.baseInterval) - abilityModifier(normalizedAbility));
  return clamp(interval, Number(profile.minimumInterval), Number(profile.maximumInterval));
}

export function isActionDue(currentTime, nextActionAt) {
  return Number.isInteger(currentTime) && Number.isInteger(nextActionAt) && currentTime === nextActionAt;
}

export function nextActionTime(actors, currentTime = 0) {
  const future = actors.map((actor) => Number(actor.nextActionAt)).filter((value) => Number.isInteger(value) && value > currentTime);
  return future.length ? Math.min(...future) : currentTime;
}
