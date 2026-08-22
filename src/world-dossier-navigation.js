const WORLD_DOSSIER_ROUTES = Object.freeze([
  Object.freeze({ selector: "[data-world-mode]", datasetKey: "worldMode", type: "world-mode" }),
  Object.freeze({
    selector: "[data-show-creature-on-map]",
    datasetKey: "showCreatureOnMap",
    type: "show-creature-on-map",
  }),
  Object.freeze({
    selector: "[data-statistics-nation]",
    datasetKey: "statisticsNation",
    type: "statistics-nation",
  }),
  Object.freeze({
    selector: "[data-generated-statistics-nation]",
    datasetKey: "generatedStatisticsNation",
    type: "generated-statistics-nation",
  }),
  Object.freeze({
    selector: "[data-generated-nation]",
    datasetKey: "generatedNation",
    type: "generated-nation",
  }),
  Object.freeze({
    selector: "[data-geopolitical-nation]",
    datasetKey: "geopoliticalNation",
    type: "geopolitical-nation",
  }),
  Object.freeze({
    selector: "[data-world-nation]",
    datasetKey: "worldNation",
    type: "world-nation",
  }),
  Object.freeze({
    selector: "[data-world-people]",
    datasetKey: "worldPeople",
    type: "world-people",
  }),
]);

const WORLD_SCALE_MODES = new Set(["geopolitics", "nations", "statistics"]);

function patchForAction(type, value, hasStaticNation) {
  switch (type) {
    case "world-mode": {
      const patch = { atlasMode: value };
      if (value === "generated") patch.generatedMapScale = "region";
      if (WORLD_SCALE_MODES.has(value)) patch.generatedMapScale = "world";
      return patch;
    }
    case "show-creature-on-map":
      return {
        selectedCreatureId: value,
        selectedType: "creature",
        selectedId: value,
        scale: "world",
      };
    case "statistics-nation":
      return {
        selectedNationId: value,
        atlasMode: "statistics",
        panel: "world",
      };
    case "generated-statistics-nation":
      return {
        selectedGeneratedNationId: value,
        atlasMode: "statistics",
        generatedMapScale: "world",
        panel: "world",
      };
    case "generated-nation":
      return {
        selectedGeneratedNationId: value,
        atlasMode: "nations",
        generatedMapScale: "world",
        panel: "world",
      };
    case "geopolitical-nation":
      return {
        selectedGeneratedNationId: value,
        atlasMode: "geopolitics",
        generatedMapScale: "world",
        panel: "world",
      };
    case "world-nation": {
      const patch = {
        selectedNationId: value,
        atlasMode: "nations",
        panel: "world",
      };
      if (hasStaticNation(value)) {
        patch.selectedType = "country";
        patch.selectedId = value;
        patch.scale = "world";
      }
      return patch;
    }
    case "world-people":
      return {
        selectedPeopleId: value,
        atlasMode: "peoples",
        panel: "world",
      };
    default:
      return {};
  }
}

export function resolveWorldDossierNavigation(target, { hasStaticNation = () => false } = {}) {
  if (!target || typeof target.closest !== "function") return null;

  for (const route of WORLD_DOSSIER_ROUTES) {
    const matchedElement = target.closest(route.selector);
    if (!matchedElement) continue;

    const value = matchedElement.dataset?.[route.datasetKey];
    return patchForAction(route.type, value, hasStaticNation);
  }

  return null;
}
