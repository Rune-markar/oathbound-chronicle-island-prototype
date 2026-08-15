const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const CRIME_SCHEMA_VERSION = 1;
export const CRIME_OUTCOMES = Object.freeze([
  "success_hidden",
  "success_exposed",
  "failed_escaped",
  "captured",
]);
export const CRIME_HEAT_GAINS = Object.freeze({
  theft: 15,
  smuggling: 20,
  extortion: 25,
  robbery: 35,
  sabotage: 45,
  assassination: 70,
});

const ACCOMPLICE_CONSEQUENCES = Object.freeze({
  accept: "joined",
  refuse: "withdrew",
  report: "reported",
});

const CAREER_DEMOTIONS = Object.freeze({
  retainer: "individual",
  commander: "retainer",
  castellan: "commander",
  lord: "castellan",
  multi_lord: "lord",
  governor: "multi_lord",
  duke: "governor",
  regent: "duke",
});

function emptyCrimeState() {
  return {
    schemaVersion: CRIME_SCHEMA_VERSION,
    incidents: [],
    heatByJurisdiction: {},
    quietMonthsOutside: {},
    contacts: [],
    stolenItems: [],
    fencedTransactions: [],
    accompliceDecisions: [],
    sentences: [],
    abuses: [],
    illegalGain: 0,
    monthsElapsed: 0,
    runEnded: false,
    ending: null,
  };
}

function requirePlayerState(state) {
  if (!state?.player) throw new TypeError("犯罪状態にはプレイヤーが必要です");
}

function jurisdictionIdOf(value) {
  if (typeof value === "string") return value;
  return value?.id ?? value?.jurisdictionId ?? null;
}

function normalizeHeat(value) {
  return clamp(Number.isFinite(value) ? value : 0, 0, 100);
}

function unresolvedFloor(crime, jurisdictionId) {
  let floor = 0;
  for (const entry of crime.incidents) {
    if (!entry.detected || entry.resolved === true || jurisdictionIdOf(entry.jurisdiction) !== jurisdictionId) continue;
    if (entry.severity === "capital" || entry.type === "assassination") floor = Math.max(floor, 70);
    else if (entry.severity === "serious") floor = Math.max(floor, 40);
  }
  return floor;
}

function heatLabel(heat) {
  if (heat >= 70) return "厳戒";
  if (heat >= 40) return "指名手配";
  if (heat >= 20) return "警戒";
  return "平常";
}

function ensureMetrics(player) {
  player.metrics ??= {};
  player.metrics.wealth = Number.isFinite(player.metrics.wealth) ? player.metrics.wealth : 0;
}

function advanceCalendar(state, months) {
  for (let count = 0; count < months; count += 1) {
    state.turn = (state.turn ?? 0) + 1;
    state.month = (state.month ?? 1) + 1;
    if (state.month > 12) {
      state.month = 1;
      state.year = (state.year ?? 0) + 1;
    }
  }
}

function deterministicSentenceMonths(input, crime) {
  if (Number.isFinite(input.months)) return clamp(Math.trunc(input.months), 3, 12);
  const key = `${input.incidentId ?? ""}:${input.jurisdictionId ?? ""}:${crime.incidents.length}`;
  const score = [...key].reduce((sum, character) => sum + character.codePointAt(0), 0);
  return 3 + (score % 10);
}

export function normalizeCrimeState(state) {
  requirePlayerState(state);
  const next = clone(state);
  const baseline = emptyCrimeState();
  const prior = next.player.crime ?? {};
  next.player.crime = {
    ...baseline,
    ...prior,
    schemaVersion: CRIME_SCHEMA_VERSION,
    incidents: [...(prior.incidents ?? [])],
    heatByJurisdiction: { ...(prior.heatByJurisdiction ?? {}) },
    quietMonthsOutside: { ...(prior.quietMonthsOutside ?? {}) },
    contacts: [...(prior.contacts ?? [])],
    stolenItems: [...(prior.stolenItems ?? [])],
    fencedTransactions: [...(prior.fencedTransactions ?? [])],
    accompliceDecisions: [...(prior.accompliceDecisions ?? [])],
    sentences: [...(prior.sentences ?? [])],
    abuses: [...(prior.abuses ?? [])],
    illegalGain: Math.max(0, Number.isFinite(prior.illegalGain) ? prior.illegalGain : 0),
    monthsElapsed: Math.max(0, Number.isFinite(prior.monthsElapsed) ? prior.monthsElapsed : 0),
    runEnded: Boolean(prior.runEnded),
  };
  Object.entries(next.player.crime.heatByJurisdiction).forEach(([jurisdictionId, heat]) => {
    next.player.crime.heatByJurisdiction[jurisdictionId] = normalizeHeat(heat);
  });
  return next;
}

export function getCrimeStatusView(state, context = {}) {
  requirePlayerState(state);
  const normalized = normalizeCrimeState(state);
  const crime = normalized.player.crime;
  const jurisdictionId = context.jurisdictionId ?? jurisdictionIdOf(context.jurisdiction) ?? normalized.player.locationId ?? null;
  const storedHeat = jurisdictionId ? normalizeHeat(crime.heatByJurisdiction[jurisdictionId]) : 0;
  const heat = Math.max(storedHeat, jurisdictionId ? unresolvedFloor(crime, jurisdictionId) : 0);
  const localContacts = crime.contacts.filter((contact) => contact.jurisdictionId === jurisdictionId);
  return {
    jurisdictionId,
    heat,
    heatLabel: heatLabel(heat),
    safehouseAvailable: localContacts.some((contact) => (contact.trust ?? 0) >= 20),
    contacts: clone(localContacts),
    unresolvedIncidents: crime.incidents.filter((entry) => entry.resolved !== true && jurisdictionIdOf(entry.jurisdiction) === jurisdictionId).length,
    runEnded: crime.runEnded,
    ending: crime.ending,
  };
}

export function previewCrimeRisk(input = {}) {
  const type = input.type ?? input.crimeType;
  if (!(type in CRIME_HEAT_GAINS)) throw new RangeError(`未知の犯罪種別です: ${type ?? ""}`);
  const heatGain = CRIME_HEAT_GAINS[type];
  const currentHeat = normalizeHeat(input.currentHeat);
  const projectedHeat = normalizeHeat(currentHeat + heatGain);
  return {
    type,
    heatGain,
    currentHeat,
    projectedHeat,
    currentHeatLabel: heatLabel(currentHeat),
    projectedHeatLabel: heatLabel(projectedHeat),
  };
}

export function recordCrimeIncident(state, incident) {
  requirePlayerState(state);
  const type = incident?.type ?? incident?.crimeType;
  if (!(type in CRIME_HEAT_GAINS)) throw new RangeError(`未知の犯罪種別です: ${type ?? ""}`);
  if (!CRIME_OUTCOMES.includes(incident.outcome)) throw new RangeError(`未知の犯罪結果です: ${incident.outcome ?? ""}`);
  const jurisdictionId = jurisdictionIdOf(incident.jurisdiction);
  if (!jurisdictionId) throw new TypeError("犯罪には管轄が必要です");
  const next = normalizeCrimeState(state);
  const crime = next.player.crime;
  const entry = clone({
    id: incident.id ?? `crime-${next.turn ?? 0}-${crime.incidents.length + 1}`,
    type,
    severity: incident.severity ?? (type === "assassination" ? "capital" : "minor"),
    perpetrator: incident.perpetrator ?? null,
    accomplices: incident.accomplices ?? [],
    victim: incident.victim ?? null,
    target: incident.target ?? null,
    jurisdiction: incident.jurisdiction,
    reward: incident.reward ?? null,
    outcome: incident.outcome,
    detected: Boolean(incident.detected),
    historyText: incident.historyText ?? "",
    resolved: Boolean(incident.resolved),
    turn: next.turn ?? 0,
    year: next.year ?? null,
    month: next.month ?? null,
    crimeMonth: crime.monthsElapsed,
  });
  crime.incidents.push(entry);
  if (entry.detected) {
    crime.heatByJurisdiction[jurisdictionId] = normalizeHeat((crime.heatByJurisdiction[jurisdictionId] ?? 0) + CRIME_HEAT_GAINS[type]);
    crime.quietMonthsOutside[jurisdictionId] = 0;
  }
  return next;
}

export function resolveAccompliceDecision(state, input = {}) {
  if (!(input.decision in ACCOMPLICE_CONSEQUENCES)) throw new RangeError(`未知の共犯者判断です: ${input.decision ?? ""}`);
  const next = normalizeCrimeState(state);
  next.player.crime.accompliceDecisions.unshift({
    id: input.id ?? `accomplice-${next.turn ?? 0}-${next.player.crime.accompliceDecisions.length + 1}`,
    accompliceId: input.accompliceId ?? null,
    accompliceName: input.accompliceName ?? null,
    incidentId: input.incidentId ?? null,
    jurisdictionId: input.jurisdictionId ?? null,
    decision: input.decision,
    consequence: ACCOMPLICE_CONSEQUENCES[input.decision],
    turn: next.turn ?? 0,
  });
  return next;
}

export function discoverUnderworldContacts(state, context = {}) {
  const next = normalizeCrimeState(state);
  ensureMetrics(next.player);
  if (next.player.metrics.wealth < 1) throw new RangeError("裏社会を探す資金が足りません");
  const jurisdictionId = context.jurisdictionId ?? jurisdictionIdOf(context.jurisdiction) ?? next.player.locationId;
  if (!jurisdictionId) throw new TypeError("接触先の管轄が必要です");
  const roles = ["fence", "smuggler", "broker"];
  const missingRoles = roles.filter((role) => !next.player.crime.contacts.some((contact) => contact.jurisdictionId === jurisdictionId && contact.role === role));
  if (missingRoles.length === 0) return next;
  next.player.metrics.wealth -= 1;
  missingRoles.forEach((role) => next.player.crime.contacts.push({
    id: `${jurisdictionId}-${role}`,
    role,
    jurisdictionId,
    jurisdictionName: context.jurisdictionName ?? null,
    trust: 0,
    discoveredTurn: next.turn ?? 0,
  }));
  return next;
}

export function fenceStolenItem(state, input = {}) {
  const next = normalizeCrimeState(state);
  ensureMetrics(next.player);
  const jurisdictionId = input.jurisdictionId ?? next.player.locationId;
  const hasFence = next.player.crime.contacts.some((contact) => contact.role === "fence" && contact.jurisdictionId === jurisdictionId);
  if (!hasFence) throw new Error("この管轄で発見済みの故買屋が必要です");
  const itemIndex = next.player.crime.stolenItems.findIndex((item) => item.id === input.itemId);
  if (itemIndex < 0) throw new Error("売却する盗品がありません");
  const [item] = next.player.crime.stolenItems.splice(itemIndex, 1);
  const normalValue = Number.isFinite(input.normalValue) ? input.normalValue : item.normalValue;
  if (!Number.isFinite(normalValue) || normalValue < 0) throw new TypeError("盗品の通常価値が不正です");
  const proceeds = normalValue * 0.4;
  next.player.metrics.wealth += proceeds;
  next.player.crime.fencedTransactions.unshift({
    itemId: item.id,
    itemName: item.name ?? null,
    jurisdictionId,
    normalValue,
    proceeds,
    turn: next.turn ?? 0,
  });
  return next;
}

export function advanceCrimeMonth(state) {
  const next = normalizeCrimeState(state);
  const crime = next.player.crime;
  crime.monthsElapsed += 1;
  for (const jurisdictionId of Object.keys(crime.heatByJurisdiction)) {
    const outside = next.player.locationId !== jurisdictionId;
    crime.quietMonthsOutside[jurisdictionId] = outside ? (crime.quietMonthsOutside[jurisdictionId] ?? 0) + 1 : 0;
    let heat = normalizeHeat(crime.heatByJurisdiction[jurisdictionId]);
    if (outside && crime.quietMonthsOutside[jurisdictionId] >= 2) heat = Math.max(0, heat - 5);
    crime.heatByJurisdiction[jurisdictionId] = Math.max(heat, unresolvedFloor(crime, jurisdictionId));
  }
  return next;
}

export function resolveCrimeSentence(state, input = {}) {
  const next = normalizeCrimeState(state);
  const crime = next.player.crime;
  ensureMetrics(next.player);
  const jurisdictionId = input.jurisdictionId ?? jurisdictionIdOf(input.jurisdiction) ?? next.player.locationId;
  const domestic = input.domestic === true
    || (input.domestic !== false && next.player.affiliation?.nationId != null && jurisdictionId === next.player.affiliation.nationId);

  if (next.player.sovereign && domestic) {
    next.player.metrics.legitimacy = clamp((next.player.metrics.legitimacy ?? 0) - 15, 0, 100);
    next.player.metrics.popularSupport = clamp((next.player.metrics.popularSupport ?? 0) - 10, 0, 100);
    next.player.metrics.householdSupport = clamp((next.player.metrics.householdSupport ?? 0) - 10, 0, 100);
    crime.abuses.unshift({
      id: input.incidentId ?? `abuse-${next.turn ?? 0}-${crime.abuses.length + 1}`,
      incidentId: input.incidentId ?? null,
      jurisdictionId,
      kind: "abuse_of_power",
      detected: true,
      turn: next.turn ?? 0,
    });
    return next;
  }

  const severity = input.severity ?? "minor";
  const crimeType = input.crimeType ?? crime.incidents.find((entry) => entry.id === input.incidentId)?.type ?? null;
  if (severity === "capital" || crimeType === "assassination") {
    crime.runEnded = true;
    crime.ending = "capital_sentence";
    crime.sentences.unshift({
      incidentId: input.incidentId ?? null,
      jurisdictionId,
      severity: "capital",
      sentence: "capital",
      months: 0,
      turn: next.turn ?? 0,
    });
    const incidentEntry = crime.incidents.find((entry) => entry.id === input.incidentId);
    if (incidentEntry) incidentEntry.resolved = true;
    return next;
  }

  const illegalGain = Math.max(0, crime.illegalGain);
  const fine = Math.max(0, Number.isFinite(input.fine) ? input.fine : severity === "serious" ? 5 : 2);
  next.player.metrics.wealth = Math.max(0, next.player.metrics.wealth - illegalGain - fine);
  crime.illegalGain = 0;
  const months = severity === "serious" ? deterministicSentenceMonths(input, crime) : 1;
  if (severity === "serious") {
    if (!next.player.sovereign && CAREER_DEMOTIONS[next.player.stage]) next.player.stage = CAREER_DEMOTIONS[next.player.stage];
    if (Number.isFinite(next.player.metrics.liegeTrust)) next.player.metrics.liegeTrust = clamp(next.player.metrics.liegeTrust - 10, 0, 100);
  }
  crime.sentences.unshift({
    incidentId: input.incidentId ?? null,
    jurisdictionId,
    severity,
    sentence: severity === "serious" ? "imprisonment" : "fine",
    confiscatedGain: illegalGain,
    fine,
    months,
    turn: next.turn ?? 0,
  });
  const incidentEntry = crime.incidents.find((entry) => entry.id === input.incidentId);
  if (incidentEntry) incidentEntry.resolved = true;
  advanceCalendar(next, months);
  return next;
}
