import { createActionResult, normalizeActionResult } from "./action-result.js";
import { normalizeGameOperation } from "./game-operation.js";

export function createSystemRegistry(modules = []) {
  const byId = new Map();
  for (const module of modules) {
    if (!module?.id || !Number.isInteger(module.version) || module.version < 1) throw new TypeError("システム登録にはidと正のversionが必要です。");
    if (byId.has(module.id)) throw new Error(`システムIDが重複しています: ${module.id}`);
    const dependsOn = [...new Set((module.dependsOn ?? []).filter((value) => typeof value === "string" && value))];
    if (dependsOn.includes(module.id)) throw new Error(`システムは自分自身へ依存できません: ${module.id}`);
    byId.set(module.id, Object.freeze({ ...module, dependsOn: Object.freeze(dependsOn) }));
  }
  for (const module of byId.values()) {
    for (const dependencyId of module.dependsOn) {
      if (!byId.has(dependencyId)) throw new Error(`システム ${module.id} の依存先が登録されていません: ${dependencyId}`);
    }
  }
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(module) {
    if (visited.has(module.id)) return;
    if (visiting.has(module.id)) throw new Error(`システム依存に循環があります: ${module.id}`);
    visiting.add(module.id);
    module.dependsOn.forEach((dependencyId) => visit(byId.get(dependencyId)));
    visiting.delete(module.id);
    visited.add(module.id);
    ordered.push(module);
  }
  byId.forEach(visit);
  Object.freeze(ordered);
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
