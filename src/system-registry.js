import { createActionResult, normalizeActionResult } from "./action-result.js";
import { normalizeGameOperation } from "./game-operation.js";

export function createSystemRegistry(modules = []) {
  const byId = new Map();
  for (const module of modules) {
    if (!module?.id || !Number.isInteger(module.version) || module.version < 1) throw new TypeError("システム登録にはidと正のversionが必要です。");
    if (byId.has(module.id)) throw new Error(`システムIDが重複しています: ${module.id}`);
    byId.set(module.id, Object.freeze({ ...module }));
  }
  const ordered = Object.freeze([...byId.values()]);
  return Object.freeze({
    modules: ordered,
    get: (id) => byId.get(id) ?? null,
    versions: Object.freeze(Object.fromEntries(ordered.map((module) => [module.id, module.version]))),
  });
}

export function normalizeRegisteredSystems(registry, context, state) {
  return registry.modules.reduce((current, module) => module.normalize ? module.normalize(context, current) : current, state);
}

export function advanceRegisteredMonth(registry, context, state, transition) {
  let current = state;
  const events = [];
  const skipped = new Set(transition?.skipSystemIds ?? []);
  for (const module of registry.modules) {
    if (!module.onMonth || skipped.has(module.id)) continue;
    const result = normalizeActionResult(module.onMonth(context, current, transition));
    current = result.state;
    events.push(...result.events);
  }
  return createActionResult(current, { events });
}

export function getRegisteredOperations(registry, context, state) {
  return registry.modules.flatMap((module) => module.getOperations?.(context, state) ?? []).map(normalizeGameOperation);
}
