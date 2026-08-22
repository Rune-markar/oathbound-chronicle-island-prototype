export const AUTOSAVE_INTERVAL_MS = 15_000;
export const OFFLINE_MONTH_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_MAX_MONTHS = 12;

const clone = (value) => structuredClone(value);

export function markChronicleSaved(state, now = Date.now()) {
  return {
    ...state,
    persistence: {
      ...(state.persistence ?? {}),
      lastSavedAt: new Date(now).toISOString(),
    },
  };
}

export function resumeDelegatedChronicle(state, advanceMonth, now = Date.now()) {
  if (!state?.player || typeof advanceMonth !== "function") return { state, report: null };
  const savedAt = Date.parse(state.persistence?.lastSavedAt ?? "");
  if (!Number.isFinite(savedAt) || now <= savedAt) return { state: markChronicleSaved(state, now), report: null };
  const elapsedMs = now - savedAt;
  const monthsAdvanced = Math.min(OFFLINE_MAX_MONTHS, Math.floor(elapsedMs / OFFLINE_MONTH_MS));
  if (monthsAdvanced < 1) return { state: markChronicleSaved(state, now), report: null };

  let next = clone(state);
  const events = [];
  for (let month = 0; month < monthsAdvanced; month += 1) {
    const previousHistoryLength = next.player?.history?.length ?? 0;
    next = advanceMonth(next);
    const additions = Math.max(0, (next.player?.history?.length ?? 0) - previousHistoryLength);
    if (additions) events.push(...next.player.history.slice(0, additions).map((entry) => entry.title));
  }
  const report = {
    id: `offline-${now}`,
    savedAt: new Date(savedAt).toISOString(),
    returnedAt: new Date(now).toISOString(),
    elapsedMs,
    monthsAdvanced,
    events: [...new Set(events)].slice(0, 8),
    pendingDecisions: [
      next.council?.pending ? "季節評定" : null,
      next.pendingEvent ? "都市事件" : null,
      ...(next.generatedWorld?.pendingStrategicDecisions ?? []).map((decision) => decision.title ?? "国家戦略判断"),
    ].filter(Boolean),
  };
  next.player.history ??= [];
  next.player.history.unshift({
    turn: next.date?.turn ?? next.player.month ?? 0,
    title: "留守中の年代記",
    detail: `${monthsAdvanced}か月分を委任処理した。${report.pendingDecisions.length ? `帰還後の判断：${report.pendingDecisions.join("・")}。` : "重大判断は保留されていない。"}`,
  });
  next.offlineDelegation = {
    ...(next.offlineDelegation ?? {}),
    latestReport: report,
    reports: [report, ...(next.offlineDelegation?.reports ?? [])].slice(0, 12),
  };
  return { state: markChronicleSaved(next, now), report };
}
