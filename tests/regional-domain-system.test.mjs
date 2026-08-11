import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceGeneratedWorldRegions,
  appointGeneratedRegionalLord,
  buildGeneratedWorld,
  declareGeneratedRegionIndependence,
  getGeneratedRegionalDomainView,
  getGeneratedWorldView,
  transferGeneratedRegionControl,
} from "../src/generated-world-system.js";
import { SETTLEMENT_POPULATION_THRESHOLDS } from "../src/nation-generation.js";
import { createCareerInitialState } from "../src/simulation.js";

function createRegionalWorld(seed = "regional-domain-contract") {
  return createCareerInitialState({ seed, width: 64, height: 40, plateCount: 10, nationCount: 4 });
}

test("generated nations contain multiple administrative regions with settlement hubs and roads", () => {
  const state = createRegionalWorld();
  const runtime = buildGeneratedWorld(state);
  assert.ok(runtime.nations.nations.every((nation) => nation.regionCount >= 2));
  assert.ok(runtime.nations.regions.every((region) => region.officeTitle && region.settlementIds.length && region.roadHubObjectId));
  assert.ok(runtime.nations.roads.length > runtime.nations.regions.length);
  for (const nation of runtime.nations.nations) {
    const capitalObjects = runtime.nations.objects.filter((object) => object.regionId === nation.capitalRegionId);
    assert.ok(capitalObjects.some((object) => object.type === "castle"));
    assert.ok(capitalObjects.some((object) => object.type === "city"));
    assert.ok(capitalObjects.filter((object) => object.type === "village").length >= 2);
    const castle = capitalObjects.find((object) => object.type === "castle");
    const localRoads = runtime.nations.roads.filter((road) => road.fromObjectId === castle.id || road.toObjectId === castle.id);
    assert.ok(localRoads.length >= 3, `${nation.name}の王城は周辺集落への街道ハブでなければならない`);
  }
});

test("village population advances through town and city thresholds on monthly simulation", () => {
  const state = createRegionalWorld("settlement-growth-contract");
  const initial = getGeneratedRegionalDomainView(state);
  const village = initial.nationMap.objects.find((object) => object.type === "village");
  assert.ok(village);
  state.generatedWorld.regionalDomains.settlementStates[village.id] = {
    ...state.generatedWorld.regionalDomains.settlementStates[village.id],
    population: SETTLEMENT_POPULATION_THRESHOLDS.town - 1,
    level: "village",
    growthRate: 0.02,
  };
  const advanced = advanceGeneratedWorldRegions({ ...state, month: state.month + 1 });
  const settlement = advanced.generatedWorld.regionalDomains.settlementStates[village.id];
  assert.equal(settlement.level, "town");
  assert.ok(settlement.population >= SETTLEMENT_POPULATION_THRESHOLDS.town);
  assert.ok(advanced.generatedWorld.regionalDomains.events.some((event) => event.settlementId === village.id && event.toLevel === "town"));
  assert.equal(getGeneratedRegionalDomainView(advanced).nationMap.objects.find((object) => object.id === village.id).type, "town");

  advanced.generatedWorld.regionalDomains.settlementStates[village.id] = {
    ...advanced.generatedWorld.regionalDomains.settlementStates[village.id],
    population: SETTLEMENT_POPULATION_THRESHOLDS.city - 1,
    level: "town",
    growthRate: 0.02,
  };
  const urbanized = advanceGeneratedWorldRegions({ ...advanced, month: state.month + 2 });
  assert.equal(urbanized.generatedWorld.regionalDomains.settlementStates[village.id].level, "city");
  assert.ok(urbanized.generatedWorld.regionalDomains.events.some((event) => event.settlementId === village.id && event.toLevel === "city"));
});

test("regional control can transfer between nations and redraw effective borders without changing terrain generation", () => {
  const state = createRegionalWorld("regional-transfer-contract");
  const baseRuntime = buildGeneratedWorld(state);
  const region = baseRuntime.nations.regions.find((entry) => (
    entry.neighborIds.some((neighborId) => baseRuntime.regionById.get(neighborId)?.nationId !== entry.nationId)
  ));
  const targetRegion = region.neighborIds.map((id) => baseRuntime.regionById.get(id)).find((entry) => entry.nationId !== region.nationId);
  const transferred = transferGeneratedRegionControl(state, region.id, targetRegion.nationId, { cause: "border_war" });
  const effective = getGeneratedRegionalDomainView(transferred);
  assert.equal(effective.regionById.get(region.id).nationId, targetRegion.nationId);
  assert.ok(effective.nationMap.objects.filter((object) => object.regionId === region.id).every((object) => object.nationId === targetRegion.nationId));
  assert.ok(region.tileIndices.every((tileIndex) => effective.nationMap.tileNationIds[tileIndex] === targetRegion.nationId));
  assert.equal(buildGeneratedWorld(transferred).regionById.get(region.id).nationId, region.nationId, "seed-derived geography must remain reproducible");
  assert.ok(effective.domains.events.some((event) => event.type === "regional_control_change" && event.regionId === region.id));
});

test("maritime roles and sea-route ownership follow regional control changes", () => {
  const state = createRegionalWorld("regional-maritime-transfer-contract");
  const runtime = buildGeneratedWorld(state);
  const port = runtime.nations.objects.find((object) => object.maritime && object.seaRouteIds.length);
  const targetNation = runtime.nations.nations.find((nation) => nation.id !== port.nationId);
  assert.ok(port && targetNation);

  const transferred = transferGeneratedRegionControl(state, port.regionId, targetNation.id, { cause: "port_treaty" });
  const effective = getGeneratedRegionalDomainView(transferred);
  const effectivePort = effective.objectById.get(port.id);
  assert.equal(effectivePort.type, port.type, "漁港・港・湾口都市という港湾機能は領有変化後も維持する");
  assert.equal(effectivePort.name, port.name);
  assert.equal(effectivePort.nationId, targetNation.id);
  assert.ok(effective.nationById.get(targetNation.id).portIds.includes(port.id));
  for (const route of effective.nationMap.seaRoutes.filter((entry) => entry.fromObjectId === port.id || entry.toObjectId === port.id)) {
    assert.ok(route.nationIds.includes(targetNation.id));
    const endpointNationIds = [effective.objectById.get(route.fromObjectId).nationId, effective.objectById.get(route.toObjectId).nationId];
    assert.equal(route.scope, endpointNationIds[0] === endpointNationIds[1] ? "domestic" : "international");
  }
});

test("one region can become an independent polity and a regional lordship can be awarded", () => {
  const state = createRegionalWorld("regional-independence-contract");
  const region = getGeneratedWorldView(state).expeditionRegion;
  const appointed = appointGeneratedRegionalLord(state, region.id, {
    lordId: state.player.id,
    lordName: state.player.name,
    officeTitle: region.frontier ? "辺境伯" : "地方伯",
  });
  assert.equal(appointed.generatedWorld.regionalDomains.regionStates[region.id].lordId, state.player.id);
  assert.ok(appointed.player.generatedRegionalOffices.some((office) => office.regionId === region.id));

  const independent = declareGeneratedRegionIndependence(appointed, region.id, {
    polityId: "free-border-march",
    name: "自由辺境領",
    government: "辺境諸侯政",
    founderId: state.player.id,
    founderName: state.player.name,
    playerControlled: true,
  });
  const effective = getGeneratedRegionalDomainView(independent);
  assert.equal(independent.generatedWorld.playerNationId, "free-border-march");
  assert.equal(effective.regionById.get(region.id).status, "independent");
  assert.equal(effective.regionById.get(region.id).nationId, "free-border-march");
  assert.equal(effective.nationById.get("free-border-march").regionCount, 1);
  assert.equal(effective.nationById.get("free-border-march").name, "自由辺境領");
});
