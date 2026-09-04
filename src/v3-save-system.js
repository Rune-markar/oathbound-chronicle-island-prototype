import {
  GAME_MINUTES_PER_MONTH,
  createGameClock,
  getGameCalendar,
  normalizeGameClock,
} from "./game-clock.js";
import { createSaveRegistry, readRegisteredSave, writeRegisteredSave } from "./save-registry.js";
import { V3_FIELD_VERSION } from "./v3-field-system.js";
import { V3_SYSTEM_KERNEL_VERSION, V3_SYSTEM_REGISTRY } from "./v3-system-kernel.js";
import { V3_WORLD_SIMULATION_VERSION, V3_PRESENT_DATE } from "./v3-world-simulation.js";
import { RACE_DECISION_SCHEMA_VERSION } from "./race-decision-system.js";

export const V3_SAVE_VERSION = 6;

function currentModule(id, version) {
  return { id, version, legacyVersion: version };
}

function tacticalOutcomeReceipts(generatedWorld = {}) {
  const receipts = generatedWorld.tacticalOutcomeReceipts && typeof generatedWorld.tacticalOutcomeReceipts === "object"
    ? { ...generatedWorld.tacticalOutcomeReceipts }
    : {};
  for (const outcome of generatedWorld.tacticalOutcomes ?? []) {
    if (outcome?.battleId && !Object.hasOwn(receipts, outcome.battleId)) receipts[outcome.battleId] = String(outcome.period ?? "unknown");
  }
  return receipts;
}

function migrateWorldSimulationV1ToV2(raw) {
  if (!raw.worldSimulation || typeof raw.worldSimulation !== "object") return raw;
  return {
    ...raw,
    worldSimulation: {
      ...raw.worldSimulation,
      version: 2,
      generatedWorld: {
        ...(raw.worldSimulation.generatedWorld ?? {}),
        tacticalOutcomeReceipts: tacticalOutcomeReceipts(raw.worldSimulation.generatedWorld),
      },
    },
  };
}

function migrateWorldSimulationV2ToV3(raw) {
  if (!raw.worldSimulation || typeof raw.worldSimulation !== "object") return raw;
  return {
    ...raw,
    worldSimulation: {
      ...raw.worldSimulation,
      version: V3_WORLD_SIMULATION_VERSION,
      externalCrises: raw.worldSimulation.externalCrises ?? null,
    },
  };
}

function migrateRaceDecisionsV1ToV2(raw) {
  const dynamics = raw.worldSimulation?.generatedWorld?.raceDynamics;
  if (!dynamics || typeof dynamics !== "object") return raw;
  return {
    ...raw,
    worldSimulation: {
      ...raw.worldSimulation,
      generatedWorld: {
        ...(raw.worldSimulation.generatedWorld ?? {}),
        raceDynamics: {
          ...dynamics,
          schemaVersion: RACE_DECISION_SCHEMA_VERSION,
          races: Object.fromEntries(Object.entries(dynamics.races ?? {}).map(([raceId, race]) => [raceId, {
            ...race,
            populationGroups: race?.populationGroups ?? {},
          }])),
          characterProfiles: dynamics.characterProfiles ?? {},
        },
      },
    },
  };
}

function worldMonthIndex(simulation) {
  const year = Number(simulation?.year);
  const month = Number(simulation?.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
  return Math.max(0, (year - V3_PRESENT_DATE.year) * 12 + month - V3_PRESENT_DATE.month);
}

function migrateLegacyClock(field, worldSimulation) {
  if (field.clock) {
    const clock = normalizeGameClock(field.clock, field.clockMinutes);
    return { ...field, clock, clockMinutes: clock.elapsedMinutes };
  }
  const legacyMinutes = Math.max(0, Math.round(Number(field.clockMinutes) || 8 * 60));
  const legacyMonth = Math.floor(legacyMinutes / GAME_MINUTES_PER_MONTH);
  const elapsedMonths = Math.max(legacyMonth, worldMonthIndex(worldSimulation));
  const elapsedMinutes = elapsedMonths * GAME_MINUTES_PER_MONTH + legacyMinutes % GAME_MINUTES_PER_MONTH;
  const clock = createGameClock({ elapsedMinutes });
  return { ...field, clock, clockMinutes: clock.elapsedMinutes };
}

export const V3_SAVE_REGISTRY = createSaveRegistry({
  version: V3_SAVE_VERSION,
  modules: [
    currentModule("field", V3_FIELD_VERSION),
    {
      id: "world-simulation",
      version: V3_WORLD_SIMULATION_VERSION,
      legacyVersion: (raw) => Number(raw.worldSimulation?.version) || 1,
      migrations: { 1: migrateWorldSimulationV1ToV2, 2: migrateWorldSimulationV2ToV3 },
    },
    {
      id: "race-decisions",
      version: RACE_DECISION_SCHEMA_VERSION,
      legacyVersion: (raw) => Number(raw.worldSimulation?.generatedWorld?.raceDynamics?.schemaVersion) || 1,
      migrations: { 1: migrateRaceDecisionsV1ToV2 },
    },
    currentModule("system-kernel", V3_SYSTEM_KERNEL_VERSION),
    ...V3_SYSTEM_REGISTRY.modules.map(({ id, version }) => currentModule(id, version)),
    currentModule("domain-events", 1),
  ],
  migrate(raw) {
    if (![3, 4, 5, V3_SAVE_VERSION].includes(raw?.version) || !raw.world?.seed || !raw.field) return null;
    const field = migrateLegacyClock(raw.field, raw.worldSimulation);
    const calendar = getGameCalendar(field.clock);
    return {
      ...raw,
      field: { ...field, version: V3_FIELD_VERSION },
      migration: raw.version === V3_SAVE_VERSION ? raw.migration : {
        fromVersion: raw.version,
        migratedAt: new Date().toISOString(),
        alignedPeriod: `${calendar.year}-${calendar.month}`,
      },
    };
  },
});

export function readV3Save(storage, key) {
  return readRegisteredSave(storage, key, V3_SAVE_REGISTRY);
}

export function writeV3Save(storage, key, value) {
  return writeRegisteredSave(storage, key, V3_SAVE_REGISTRY, value);
}
