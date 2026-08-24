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

export const V3_SAVE_VERSION = 4;

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
    { id: "field", version: V3_FIELD_VERSION },
    { id: "world-simulation", version: V3_WORLD_SIMULATION_VERSION },
    { id: "system-kernel", version: V3_SYSTEM_KERNEL_VERSION },
    ...V3_SYSTEM_REGISTRY.modules.map(({ id, version }) => ({ id, version })),
    { id: "domain-events", version: 1 },
  ],
  migrate(raw) {
    if (![3, V3_SAVE_VERSION].includes(raw?.version) || !raw.world?.seed || !raw.field) return null;
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
