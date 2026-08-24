const WORLD_DOSSIER_ROUTES = Object.freeze([
  Object.freeze({ selector: "[data-world-mode]", datasetKey: "worldMode", type: "world-mode" }),
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
    selector: "[data-world-people]",
    datasetKey: "worldPeople",
    type: "world-people",
  }),
]);

const WORLD_SCALE_MODES = new Set(["geopolitics", "nations", "statistics"]);

function patchForAction(type, value) {
  switch (type) {
    case "world-mode": {
      const patch = { atlasMode: value };
      if (value === "generated") patch.generatedMapScale = "region";
      if (WORLD_SCALE_MODES.has(value)) patch.generatedMapScale = "world";
      return patch;
    }
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

export function resolveWorldDossierNavigation(target) {
  if (!target || typeof target.closest !== "function") return null;

  for (const route of WORLD_DOSSIER_ROUTES) {
    const matchedElement = target.closest(route.selector);
    if (!matchedElement) continue;

    const value = matchedElement.dataset?.[route.datasetKey];
    return patchForAction(route.type, value);
  }

  return null;
}
