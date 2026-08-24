export const GAME_CLOCK_VERSION = 1;
export const GAME_MINUTES_PER_DAY = 24 * 60;
export const GAME_DAYS_PER_MONTH = 30;
export const GAME_MONTHS_PER_YEAR = 12;
export const GAME_MINUTES_PER_MONTH = GAME_MINUTES_PER_DAY * GAME_DAYS_PER_MONTH;
export const GAME_CLOCK_EPOCH = Object.freeze({ year: 317, month: 4 });

function wholeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

export function createGameClock(source = {}) {
  const epochYear = wholeNumber(source.epochYear, GAME_CLOCK_EPOCH.year) || GAME_CLOCK_EPOCH.year;
  const epochMonth = Math.min(GAME_MONTHS_PER_YEAR, Math.max(1, wholeNumber(source.epochMonth, GAME_CLOCK_EPOCH.month) || GAME_CLOCK_EPOCH.month));
  return {
    version: GAME_CLOCK_VERSION,
    epochYear,
    epochMonth,
    elapsedMinutes: wholeNumber(source.elapsedMinutes, 8 * 60),
  };
}

export function normalizeGameClock(source = null, legacyElapsedMinutes = 8 * 60) {
  if (!source || typeof source !== "object") return createGameClock({ elapsedMinutes: legacyElapsedMinutes });
  return createGameClock(source);
}

export function getGameCalendar(source) {
  const clock = normalizeGameClock(source);
  const monthIndex = Math.floor(clock.elapsedMinutes / GAME_MINUTES_PER_MONTH);
  const epochIndex = clock.epochYear * GAME_MONTHS_PER_YEAR + (clock.epochMonth - 1);
  const absoluteMonthIndex = epochIndex + monthIndex;
  const minuteWithinMonth = clock.elapsedMinutes % GAME_MINUTES_PER_MONTH;
  const minuteWithinDay = minuteWithinMonth % GAME_MINUTES_PER_DAY;
  return {
    year: Math.floor(absoluteMonthIndex / GAME_MONTHS_PER_YEAR),
    month: absoluteMonthIndex % GAME_MONTHS_PER_YEAR + 1,
    day: Math.floor(minuteWithinMonth / GAME_MINUTES_PER_DAY) + 1,
    hour: Math.floor(minuteWithinDay / 60),
    minute: minuteWithinDay % 60,
    monthIndex,
    absoluteMonthIndex,
    elapsedMinutes: clock.elapsedMinutes,
  };
}

export function formatGamePeriod(source) {
  const calendar = getGameCalendar(source);
  return `${calendar.year}年${calendar.month}月`;
}

export function formatGameClock(source) {
  const calendar = getGameCalendar(source);
  return `${calendar.year}年${calendar.month}月${calendar.day}日 ${String(calendar.hour).padStart(2, "0")}:${String(calendar.minute).padStart(2, "0")}`;
}

export function advanceGameClock(source, elapsedMinutes) {
  const clock = normalizeGameClock(source);
  const amount = wholeNumber(elapsedMinutes, 0);
  const previousMonthIndex = Math.floor(clock.elapsedMinutes / GAME_MINUTES_PER_MONTH);
  const nextClock = { ...clock, elapsedMinutes: clock.elapsedMinutes + amount };
  const nextMonthIndex = Math.floor(nextClock.elapsedMinutes / GAME_MINUTES_PER_MONTH);
  const crossedMonths = [];
  for (let monthIndex = previousMonthIndex + 1; monthIndex <= nextMonthIndex; monthIndex += 1) {
    crossedMonths.push(getGameCalendar({ ...nextClock, elapsedMinutes: monthIndex * GAME_MINUTES_PER_MONTH }));
  }
  return { clock: nextClock, elapsedMinutes: amount, crossedMonths };
}

export function normalizeStateGameClock(state) {
  const clock = normalizeGameClock(state?.clock, state?.clockMinutes);
  return { ...state, clock, clockMinutes: clock.elapsedMinutes };
}

export function setStateGameClock(state, clock) {
  const normalized = normalizeGameClock(clock);
  return { ...state, clock: normalized, clockMinutes: normalized.elapsedMinutes };
}

export function advanceStateGameClock(state, elapsedMinutes) {
  const normalized = normalizeStateGameClock(state);
  const transition = advanceGameClock(normalized.clock, elapsedMinutes);
  return {
    state: setStateGameClock(normalized, transition.clock),
    elapsedMinutes: transition.elapsedMinutes,
    crossedMonths: transition.crossedMonths,
  };
}
