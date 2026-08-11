export const WORLD_INTELLIGENCE_SCHEMA_VERSION = 1;

const MAX_WORLD_INTELLIGENCE_ENTRIES = 240;

function copySource(source) {
  if (!source || typeof source !== "object") return null;
  return {
    type: ["rumor", "witnessed"].includes(source.type) ? source.type : "rumor",
    label: String(source.label ?? "伝聞").slice(0, 120),
    settlementId: typeof source.settlementId === "string" ? source.settlementId : null,
    regionId: typeof source.regionId === "string" ? source.regionId : null,
  };
}

function copyEntry(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.eventId !== "string") return null;
  return {
    id: typeof entry.id === "string" ? entry.id : `intel-${entry.eventId}`,
    eventId: entry.eventId,
    eventPeriod: String(entry.eventPeriod ?? "時期不明").slice(0, 32),
    learnedPeriod: String(entry.learnedPeriod ?? entry.eventPeriod ?? "時期不明").slice(0, 32),
    title: String(entry.title ?? "名称不明の出来事").slice(0, 160),
    summary: String(entry.summary ?? "詳しい内容は分かっていない。").slice(0, 480),
    tone: ["calm", "positive", "watch", "danger"].includes(entry.tone) ? entry.tone : "watch",
    nationId: typeof entry.nationId === "string" ? entry.nationId : null,
    targetNationId: typeof entry.targetNationId === "string" ? entry.targetNationId : null,
    regionId: typeof entry.regionId === "string" ? entry.regionId : null,
    source: copySource(entry.source) ?? { type: "rumor", label: "伝聞", settlementId: null, regionId: null },
  };
}

export function createWorldIntelligenceState(source = null) {
  const entries = (Array.isArray(source?.entries) ? source.entries : [])
    .map(copyEntry)
    .filter(Boolean)
    .slice(-MAX_WORLD_INTELLIGENCE_ENTRIES);
  return {
    schemaVersion: WORLD_INTELLIGENCE_SCHEMA_VERSION,
    entries,
  };
}

export function recordKnownWorldEvents(source, events, discovery, options = {}) {
  const intelligence = createWorldIntelligenceState(source);
  const knownIds = new Set(intelligence.entries.map((entry) => entry.eventId));
  const limit = Math.max(1, Number(options.limit) || events.length || 1);
  const added = [];
  for (const event of events) {
    if (!event?.id || knownIds.has(event.id) || added.length >= limit) continue;
    const entry = copyEntry({
      id: `intel-${event.id}`,
      eventId: event.id,
      eventPeriod: event.period,
      learnedPeriod: discovery.learnedPeriod,
      title: event.title,
      summary: event.summary,
      tone: event.tone,
      nationId: event.nationId,
      targetNationId: event.targetNationId,
      regionId: event.regionId,
      source: discovery,
    });
    intelligence.entries.push(entry);
    knownIds.add(event.id);
    added.push(entry);
  }
  intelligence.entries = intelligence.entries.slice(-MAX_WORLD_INTELLIGENCE_ENTRIES);
  return { intelligence, added };
}

export function getKnownWorldTimeline(source) {
  return [...createWorldIntelligenceState(source).entries].reverse();
}
