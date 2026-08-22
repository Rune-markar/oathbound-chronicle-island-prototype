import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorldDossierNavigation } from "../src/world-dossier-navigation.js";

const SELECTOR_ORDER = [
  "[data-world-mode]",
  "[data-show-creature-on-map]",
  "[data-statistics-nation]",
  "[data-generated-statistics-nation]",
  "[data-generated-nation]",
  "[data-geopolitical-nation]",
  "[data-world-nation]",
  "[data-world-people]",
];

function makeTarget(matches = {}) {
  const calls = [];
  return {
    calls,
    closest(selector) {
      calls.push(selector);
      return matches[selector] ?? null;
    },
  };
}

const routeCases = [
  {
    name: "world mode selects a generated region",
    selector: "[data-world-mode]",
    dataset: { worldMode: "generated" },
    expected: { atlasMode: "generated", generatedMapScale: "region" },
  },
  {
    name: "world mode selects a world-scale dossier",
    selector: "[data-world-mode]",
    dataset: { worldMode: "statistics" },
    expected: { atlasMode: "statistics", generatedMapScale: "world" },
  },
  {
    name: "creature map link selects the creature",
    selector: "[data-show-creature-on-map]",
    dataset: { showCreatureOnMap: "leviathan" },
    expected: {
      selectedCreatureId: "leviathan",
      selectedType: "creature",
      selectedId: "leviathan",
      scale: "world",
    },
  },
  {
    name: "static statistics nation selects statistics",
    selector: "[data-statistics-nation]",
    dataset: { statisticsNation: "vale" },
    expected: { selectedNationId: "vale", atlasMode: "statistics", panel: "world" },
  },
  {
    name: "generated statistics nation selects world scale",
    selector: "[data-generated-statistics-nation]",
    dataset: { generatedStatisticsNation: "ember-coast" },
    expected: {
      selectedGeneratedNationId: "ember-coast",
      atlasMode: "statistics",
      generatedMapScale: "world",
      panel: "world",
    },
  },
  {
    name: "generated nation selects nation dossier",
    selector: "[data-generated-nation]",
    dataset: { generatedNation: "ember-coast" },
    expected: {
      selectedGeneratedNationId: "ember-coast",
      atlasMode: "nations",
      generatedMapScale: "world",
      panel: "world",
    },
  },
  {
    name: "geopolitical nation selects geopolitical dossier",
    selector: "[data-geopolitical-nation]",
    dataset: { geopoliticalNation: "ember-coast" },
    expected: {
      selectedGeneratedNationId: "ember-coast",
      atlasMode: "geopolitics",
      generatedMapScale: "world",
      panel: "world",
    },
  },
  {
    name: "known world nation also selects its country map entry",
    selector: "[data-world-nation]",
    dataset: { worldNation: "vale" },
    options: { hasStaticNation: (nationId) => nationId === "vale" },
    expected: {
      selectedNationId: "vale",
      atlasMode: "nations",
      panel: "world",
      selectedType: "country",
      selectedId: "vale",
      scale: "world",
    },
  },
  {
    name: "world people selects the peoples dossier",
    selector: "[data-world-people]",
    dataset: { worldPeople: "tideborn" },
    expected: { selectedPeopleId: "tideborn", atlasMode: "peoples", panel: "world" },
  },
];

for (const routeCase of routeCases) {
  test(routeCase.name, () => {
    const target = makeTarget({ [routeCase.selector]: { dataset: routeCase.dataset } });
    const result = resolveWorldDossierNavigation(target, routeCase.options);

    assert.deepEqual(result, routeCase.expected);
    const matchedIndex = SELECTOR_ORDER.indexOf(routeCase.selector);
    assert.deepEqual(target.calls, SELECTOR_ORDER.slice(0, matchedIndex + 1));
  });
}

test("a nested click is resolved through the closest matching ancestor", () => {
  const ancestor = { dataset: { generatedNation: "ancestor-nation" } };
  const target = makeTarget({ "[data-generated-nation]": ancestor });

  const result = resolveWorldDossierNavigation(target);

  assert.equal(result.selectedGeneratedNationId, "ancestor-nation");
  assert.equal(target.calls.at(-1), "[data-generated-nation]");
});

test("an unmatched click checks every route in the established order", () => {
  const target = makeTarget();

  assert.equal(resolveWorldDossierNavigation(target), null);
  assert.deepEqual(target.calls, SELECTOR_ORDER);
});

test("the first matching selector wins when one target matches multiple routes", () => {
  const target = makeTarget({
    "[data-world-mode]": { dataset: { worldMode: "nations" } },
    "[data-world-people]": { dataset: { worldPeople: "tideborn" } },
  });

  const result = resolveWorldDossierNavigation(target);

  assert.deepEqual(result, {
    atlasMode: "nations",
    generatedMapScale: "world",
  });
  assert.deepEqual(target.calls, ["[data-world-mode]"]);
});

test("an unknown world nation preserves the existing detail selection and scale", () => {
  const target = makeTarget({
    "[data-world-nation]": { dataset: { worldNation: "unmapped-nation" } },
  });
  const previousView = {
    selectedType: "creature",
    selectedId: "leviathan",
    scale: "city",
  };

  const result = resolveWorldDossierNavigation(target, { hasStaticNation: () => false });
  const nextView = { ...previousView, ...result };

  assert.deepEqual(result, {
    selectedNationId: "unmapped-nation",
    atlasMode: "nations",
    panel: "world",
  });
  assert.deepEqual(nextView, {
    ...previousView,
    selectedNationId: "unmapped-nation",
    atlasMode: "nations",
    panel: "world",
  });
});

test("a non-element target does not resolve navigation", () => {
  assert.equal(resolveWorldDossierNavigation(null), null);
  assert.equal(resolveWorldDossierNavigation({}), null);
});
