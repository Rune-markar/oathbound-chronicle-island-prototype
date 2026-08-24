import { getGameCalendar, normalizeGameClock } from "./game-clock.js";

export const DOMAIN_EVENT_SCHEMA_VERSION = 1;
export const DOMAIN_EVENT_LOG_LIMIT = 480;

function strings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === "string" && value))];
}

export function normalizeDomainEvent(input, fallback = {}) {
  if (!input || typeof input !== "object" || typeof input.type !== "string" || !input.type) return null;
  const clock = normalizeGameClock(input.clock ?? fallback.clock);
  const calendar = getGameCalendar(clock);
  return {
    schemaVersion: DOMAIN_EVENT_SCHEMA_VERSION,
    id: String(input.id ?? fallback.id ?? `${input.source ?? "system"}:${input.type}:${clock.elapsedMinutes}`),
    type: input.type,
    source: String(input.source ?? fallback.source ?? "system"),
    clock,
    period: String(input.period ?? `${calendar.year}-${calendar.month}`),
    actorIds: strings(input.actorIds),
    locationIds: strings(input.locationIds),
    causedBy: strings(input.causedBy),
    visibility: ["private", "known", "public"].includes(input.visibility) ? input.visibility : "private",
    summary: String(input.summary ?? "").slice(0, 480),
    payload: input.payload && typeof input.payload === "object" ? structuredClone(input.payload) : {},
  };
}

export function createDomainEvent(input) {
  const event = normalizeDomainEvent(input);
  if (!event) throw new TypeError("ドメインイベントにはtypeが必要です。");
  return event;
}

export function normalizeDomainEventLog(source = null) {
  const entries = (Array.isArray(source?.entries) ? source.entries : [])
    .map((entry) => normalizeDomainEvent(entry))
    .filter(Boolean)
    .slice(-DOMAIN_EVENT_LOG_LIMIT);
  const sequence = Math.max(entries.length, Math.round(Number(source?.sequence) || 0));
  return { schemaVersion: DOMAIN_EVENT_SCHEMA_VERSION, sequence, entries };
}

export function appendDomainEvents(state, inputs, options = {}) {
  const log = normalizeDomainEventLog(state?.domainEvents);
  const knownIds = new Set(log.entries.map((entry) => entry.id));
  for (const input of Array.isArray(inputs) ? inputs : [inputs]) {
    if (!input) continue;
    const sequence = log.sequence + 1;
    const event = normalizeDomainEvent(input, {
      id: `${input.source ?? options.source ?? "system"}:${input.type}:${sequence}`,
      source: options.source,
      clock: options.clock ?? state?.clock,
    });
    if (!event || knownIds.has(event.id)) continue;
    log.sequence = sequence;
    log.entries.push(event);
    knownIds.add(event.id);
  }
  log.entries = log.entries.slice(-DOMAIN_EVENT_LOG_LIMIT);
  return { ...state, domainEvents: log };
}

export function getDomainEvents(state, predicate = null) {
  const entries = normalizeDomainEventLog(state?.domainEvents).entries;
  return predicate ? entries.filter(predicate) : entries;
}
