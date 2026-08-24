export const GAME_OPERATION_SCHEMA_VERSION = 1;
export const GAME_OPERATION_STATUSES = Object.freeze(["available", "active", "report_ready", "completed", "failed", "cancelled", "blocked"]);

export function normalizeGameOperation(source = {}) {
  const status = GAME_OPERATION_STATUSES.includes(source.status) ? source.status : "available";
  return {
    schemaVersion: GAME_OPERATION_SCHEMA_VERSION,
    id: String(source.id ?? "unknown-operation"),
    systemId: String(source.systemId ?? "unknown-system"),
    kind: String(source.kind ?? "operation"),
    title: String(source.title ?? source.name ?? "名称不明の作戦"),
    status,
    actorIds: [...new Set((source.actorIds ?? []).filter(Boolean).map(String))],
    locationIds: [...new Set((source.locationIds ?? []).filter(Boolean).map(String))],
    startedAtMinutes: Number.isFinite(Number(source.startedAtMinutes)) ? Math.max(0, Math.round(Number(source.startedAtMinutes))) : null,
    dueAtMinutes: Number.isFinite(Number(source.dueAtMinutes)) ? Math.max(0, Math.round(Number(source.dueAtMinutes))) : null,
    requirements: Array.isArray(source.requirements) ? structuredClone(source.requirements) : [],
    costs: source.costs && typeof source.costs === "object" ? structuredClone(source.costs) : {},
    metadata: source.metadata && typeof source.metadata === "object" ? structuredClone(source.metadata) : {},
  };
}

export function operationIsDue(operation, elapsedMinutes) {
  const normalized = normalizeGameOperation(operation);
  return normalized.status === "active" && normalized.dueAtMinutes !== null && normalized.dueAtMinutes <= Math.max(0, Number(elapsedMinutes) || 0);
}
