export const ACTION_RESULT_VERSION = 1;

export function createActionResult(state, options = {}) {
  if (!state || typeof state !== "object") throw new TypeError("行動結果には状態が必要です。");
  const elapsedMinutes = Math.max(0, Math.round(Number(options.elapsedMinutes) || 0));
  const events = Array.isArray(options.events) ? options.events.filter(Boolean) : [];
  return {
    version: ACTION_RESULT_VERSION,
    state,
    elapsedMinutes,
    events,
    operation: options.operation ?? null,
    message: options.message ?? null,
  };
}

export function isActionResult(value) {
  return Boolean(value && value.version === ACTION_RESULT_VERSION && value.state && Array.isArray(value.events));
}

export function normalizeActionResult(value) {
  return isActionResult(value) ? value : createActionResult(value);
}

export function mapActionResult(result, mapper) {
  const normalized = normalizeActionResult(result);
  return { ...normalized, state: mapper(normalized.state) };
}
