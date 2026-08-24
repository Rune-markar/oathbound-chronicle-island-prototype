import { createActionResult, normalizeActionResult } from "./action-result.js";
import { appendDomainEvents, normalizeDomainEventLog } from "./domain-events.js";
import {
  advanceGameClock,
  getGameCalendar,
  normalizeStateGameClock,
  setStateGameClock,
} from "./game-clock.js";
import { normalizeV3MilitaryState, V3_MILITARY_VERSION } from "./v3-group-combat.js";
import {
  advanceV3CriminalMonthOnTick,
  normalizeV3CriminalState,
  V3_CRIMINAL_VERSION,
} from "./v3-criminal-organization-system.js";
import {
  advanceV3CompanyMonthOnTick,
  normalizeV3MerchantState,
  V3_MERCHANT_VERSION,
} from "./v3-merchant-system.js";
import {
  advanceRegisteredMonth,
  createSystemRegistry,
  getRegisteredOperations,
  normalizeRegisteredSystems,
} from "./system-registry.js";
import { advanceV3WorldSimulation } from "./v3-world-simulation.js";

export const V3_SYSTEM_KERNEL_VERSION = 1;

const clone = (value) => structuredClone(value);

function merchantOperations(_context, state) {
  const company = state.merchant?.company;
  if (!company || company.status !== "company") return [];
  const currentMinutes = state.clock.elapsedMinutes;
  return [
    ...(company.charterApplications ?? []).map((entry) => ({
      id: entry.id,
      systemId: "merchant-company",
      kind: "charter-application",
      title: `${entry.nationName}の営業資格申請`,
      status: entry.status === "pending" ? "report_ready" : entry.status,
      locationIds: [entry.nationId],
      startedAtMinutes: currentMinutes,
      metadata: { nationId: entry.nationId, authority: entry.authority },
    })),
    ...(company.routes ?? []).filter((entry) => entry.status !== "closed").map((entry) => ({
      id: entry.id,
      systemId: "merchant-company",
      kind: "trade-route",
      title: `${entry.sourceName}—${entry.destinationName}の販路`,
      status: entry.status === "active" ? "active" : "blocked",
      actorIds: [entry.leaderId],
      locationIds: [entry.sourceId, entry.destinationId],
      metadata: { commodityId: entry.commodityId, successfulRuns: entry.successfulRuns },
    })),
    ...(company.branches ?? []).filter((entry) => entry.status !== "closed").map((entry) => ({
      id: entry.id,
      systemId: "merchant-company",
      kind: "branch-opening",
      title: `${entry.settlementName}の支店`,
      status: entry.status === "preparing" ? "active" : entry.status === "open" ? "completed" : "blocked",
      actorIds: [entry.managerId],
      locationIds: [entry.settlementId],
      dueAtMinutes: entry.status === "preparing"
        ? currentMinutes + Math.max(0, entry.preparationMonths - entry.preparationProgress) * 30 * 24 * 60
        : null,
      metadata: { progress: entry.preparationProgress, target: entry.preparationMonths },
    })),
  ];
}

function criminalOperations(_context, state) {
  const orders = state.criminal?.crime?.organization?.activeOrders ?? [];
  const currentMinutes = state.clock.elapsedMinutes;
  return orders.map((entry) => ({
    id: entry.id,
    systemId: "criminal-organization",
    kind: entry.type,
    title: entry.name,
    status: entry.status,
    actorIds: entry.assignedMemberIds,
    locationIds: [entry.jurisdictionId, entry.target?.id],
    startedAtMinutes: Number.isFinite(entry.startedTurn) ? entry.startedTurn * 30 * 24 * 60 : null,
    dueAtMinutes: entry.status === "active" ? currentMinutes + Math.max(0, entry.remainingMonths) * 30 * 24 * 60 : currentMinutes,
    costs: { treasury: entry.treasuryCost },
    metadata: { target: clone(entry.target), expectedReward: entry.expectedReward },
  }));
}

export const V3_SYSTEM_REGISTRY = createSystemRegistry([
  {
    id: "clock",
    version: 1,
    normalize: (_context, state) => normalizeStateGameClock(state),
  },
  {
    id: "military",
    version: V3_MILITARY_VERSION,
    normalize: (_context, state) => normalizeV3MilitaryState(state),
    getOperations: (_context, state) => state.military?.activeMission ? [{
      id: state.military.activeMission.id,
      systemId: "military",
      kind: "group-battle-mission",
      title: state.military.activeMission.title,
      status: ["battle-ready", "in-battle"].includes(state.military.activeMission.status) ? "report_ready" : "active",
      locationIds: [state.military.activeMission.origin?.settlementId, state.military.activeMission.target?.regionId],
      startedAtMinutes: state.military.activeMission.acceptedAtMinutes,
      metadata: {
        battleId: state.military.activeMission.battleId,
        warId: state.military.activeMission.strategic?.warId ?? null,
        frontId: state.military.activeMission.strategic?.frontId ?? null,
      },
    }] : [],
  },
  {
    id: "merchant-company",
    version: V3_MERCHANT_VERSION,
    normalize: (_context, state) => normalizeV3MerchantState(state),
    onMonth: (context, state, transition) => {
      const hadCompany = state.merchant?.company?.status === "company";
      const next = advanceV3CompanyMonthOnTick(context, state);
      return createActionResult(next, { events: hadCompany ? [{
        id: `merchant-company:month:${transition.calendar.absoluteMonthIndex}`,
        type: "merchant.month.closed",
        source: "merchant-company",
        visibility: "private",
        summary: `${transition.calendar.year}年${transition.calendar.month}月の商会決算を確定`,
      }] : [] });
    },
    getOperations: merchantOperations,
  },
  {
    id: "criminal-organization",
    version: V3_CRIMINAL_VERSION,
    normalize: (context, state) => normalizeV3CriminalState(context, state),
    onMonth: (context, state, transition) => createActionResult(
      advanceV3CriminalMonthOnTick(context, state),
      { events: [{
        id: `criminal-organization:month:${transition.calendar.absoluteMonthIndex}`,
        type: "criminal.month.advanced",
        source: "criminal-organization",
        visibility: "private",
        summary: `${transition.calendar.year}年${transition.calendar.month}月の地下活動を進行`,
      }] },
    ),
    getOperations: criminalOperations,
  },
]);

export function normalizeV3IntegratedState(context, source) {
  let state = normalizeStateGameClock(clone(source));
  state = normalizeRegisteredSystems(V3_SYSTEM_REGISTRY, context, state);
  state.domainEvents = normalizeDomainEventLog(state.domainEvents);
  return state;
}

export function getV3Operations(context, state) {
  const normalized = normalizeV3IntegratedState(context, state);
  return getRegisteredOperations(V3_SYSTEM_REGISTRY, context, normalized);
}

function generatedWorldEvents(simulation) {
  const world = simulation?.generatedWorld ?? {};
  return [
    ...(world.geopolitics?.events ?? []),
    ...(world.worldWars?.events ?? []),
    ...(world.regionalDomains?.events ?? []),
    ...(world.resistance?.events ?? []),
    ...(world.barbarians?.events ?? []),
  ].filter((entry) => entry?.id && (entry.summary || entry.title));
}

function asDomainWorldEvent(entry, clock) {
  return {
    id: `world:${entry.id}`,
    type: entry.type ? `world.${entry.type}` : "world.event",
    source: "world-simulation",
    clock,
    visibility: "public",
    summary: entry.summary ?? entry.title,
    actorIds: [entry.nationId, entry.actorId].filter(Boolean),
    locationIds: [entry.regionId, entry.settlementId].filter(Boolean),
    causedBy: entry.causedBy,
    payload: {
      worldEventId: entry.id,
      title: entry.title ?? null,
      tone: entry.tone ?? null,
      targetNationId: entry.targetNationId ?? null,
    },
  };
}

export function commitV3Action(runtime, context, previousState, worldSimulation, action, options = {}) {
  const previous = normalizeV3IntegratedState(context, previousState);
  const result = normalizeActionResult(action);
  let state = normalizeV3IntegratedState(context, result.state);
  const previousMinutes = previous.clock.elapsedMinutes;
  let currentMinutes = state.clock.elapsedMinutes;
  if (currentMinutes === previousMinutes && result.elapsedMinutes > 0) {
    currentMinutes += result.elapsedMinutes;
    state = setStateGameClock(state, { ...state.clock, elapsedMinutes: currentMinutes });
  }
  if (currentMinutes < previousMinutes) throw new RangeError("V3統合時計を巻き戻す行動は確定できません。");
  const clockTransition = advanceGameClock(previous.clock, currentMinutes - previousMinutes);
  const skipped = new Set(options.skipSystemIds ?? []);
  const events = [...result.events];
  for (const calendar of clockTransition.crossedMonths) {
    state = setStateGameClock(state, { ...state.clock, elapsedMinutes: calendar.monthIndex * 30 * 24 * 60 });
    const monthly = advanceRegisteredMonth(V3_SYSTEM_REGISTRY, context, state, {
      calendar,
      skipSystemIds: skipped,
    });
    state = monthly.state;
    events.push(...monthly.events);
  }
  state = setStateGameClock(state, clockTransition.clock);
  const knownWorldEventIds = new Set(generatedWorldEvents(worldSimulation).map((entry) => entry.id));
  const nextWorldSimulation = clockTransition.crossedMonths.length
    ? advanceV3WorldSimulation(runtime, worldSimulation, clockTransition.crossedMonths.length)
    : worldSimulation;
  generatedWorldEvents(nextWorldSimulation)
    .filter((entry) => !knownWorldEventIds.has(entry.id))
    .forEach((entry) => events.push(asDomainWorldEvent(entry, state.clock)));
  if (currentMinutes > previousMinutes) {
    const calendar = getGameCalendar(state.clock);
    events.push({
      id: `clock:${previousMinutes}:${currentMinutes}`,
      type: "clock.advanced",
      source: options.source ?? "player-action",
      visibility: "private",
      summary: `${currentMinutes - previousMinutes}分進行`,
      payload: { elapsedMinutes: currentMinutes - previousMinutes, crossedMonths: clockTransition.crossedMonths.length },
      clock: state.clock,
      period: `${calendar.year}-${calendar.month}`,
    });
  }
  if (options.event) events.push(options.event);
  state = appendDomainEvents(state, events, { clock: state.clock, source: options.source });
  return {
    ...createActionResult(state, {
      elapsedMinutes: currentMinutes - previousMinutes,
      events,
      operation: result.operation,
      message: result.message,
    }),
    worldSimulation: nextWorldSimulation,
    crossedMonths: clockTransition.crossedMonths,
    operations: getRegisteredOperations(V3_SYSTEM_REGISTRY, context, state),
  };
}
