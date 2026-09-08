import { V3_CIVIC_VERSION } from "./v3-civic-policy.js";
import { V3_SIMULATION_MODEL_VERSION } from "./v3-simulation-model.js";
import { createSaveRegistry, readRegisteredSave, writeRegisteredSave } from "./save-registry.js";
import { V3_FIELD_VERSION } from "./v3-field-system.js";
import { V3_SYSTEM_KERNEL_VERSION, V3_SYSTEM_REGISTRY } from "./v3-system-kernel.js";
import { V3_WORLD_SIMULATION_VERSION } from "./v3-world-simulation.js";
import { RACE_DECISION_SCHEMA_VERSION } from "./race-decision-system.js";
import { V3_CAMPAIGN_VERSION } from "./v3-campaign-system.js";

export const V3_SAVE_VERSION = 6;

export const V3_SAVE_REGISTRY = createSaveRegistry({
  version: V3_SAVE_VERSION,
  modules: [
    { id: "field", version: V3_FIELD_VERSION },
    { id: "world-simulation", version: V3_WORLD_SIMULATION_VERSION },
    { id: "race-decisions", version: RACE_DECISION_SCHEMA_VERSION },
    { id: "system-kernel", version: V3_SYSTEM_KERNEL_VERSION },
    ...V3_SYSTEM_REGISTRY.modules.map(({ id, version }) => ({ id, version })),
    { id: "domain-events", version: 1 },
  ],
  validate(raw) {
    return Boolean(raw.world?.seed && raw.field?.player
      && raw.field.version === V3_FIELD_VERSION
      && raw.field.clock && Number.isFinite(raw.field.clock.elapsedMinutes)
      && (!raw.field.campaign || raw.field.campaign.version === V3_CAMPAIGN_VERSION)
      && raw.worldSimulation?.version === V3_WORLD_SIMULATION_VERSION
      && (!raw.worldSimulation.civicState || raw.worldSimulation.civicState.version === V3_CIVIC_VERSION)
      && (!raw.worldSimulation.model || raw.worldSimulation.model.version === V3_SIMULATION_MODEL_VERSION)
      && raw.worldSimulation.generatedWorld?.raceDynamics?.schemaVersion === RACE_DECISION_SCHEMA_VERSION);
  },
});

export function readV3Save(storage, key) {
  return readRegisteredSave(storage, key, V3_SAVE_REGISTRY);
}

export function writeV3Save(storage, key, value) {
  return writeRegisteredSave(storage, key, V3_SAVE_REGISTRY, value);
}
