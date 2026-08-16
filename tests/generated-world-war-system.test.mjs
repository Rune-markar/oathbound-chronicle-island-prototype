import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceGeneratedWorldWars,
  createGeneratedWorldWarState,
  getGeneratedWorldWarView,
  preserveGeneratedWorldWarState,
} from "../src/generated-world-war-system.js";
import { createCareerInitialState } from "../src/simulation.js";
import {
  advanceGeneratedWorldGeopolitics,
  buildGeneratedWorld,
  createGeneratedWorldState,
  getGeneratedWorldView,
} from "../src/generated-world-system.js";

function fixture(seed = "generated-world-war") {
  const state = createCareerInitialState({ seed, width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const runtime = getGeneratedWorldView(state).runtime;
  const border = runtime.nations.borderSegments.find((segment) => segment.nations.length === 2);
  assert.ok(border, "the fixture needs an international land border");
  const [attackerNationId, defenderNationId] = border.nations;
  const key = [attackerNationId, defenderNationId].sort().join(":");
  const previousGeopolitics = structuredClone(state.generatedWorld.geopolitics);
  const advancedGeopolitics = structuredClone(previousGeopolitics);
  advancedGeopolitics.relations[key] = {
    ...advancedGeopolitics.relations[key],
    atWar: true,
    warMonths: 1,
    tension: 100,
  };
  advancedGeopolitics.events.push({
    id: `forced-war-${seed}`,
    period: "317-5",
    nationId: attackerNationId,
    targetNationId: defenderNationId,
    outcome: "war_started",
    pullId: "limited_war",
  });
  return { state, runtime, attackerNationId, defenderNationId, key, previousGeopolitics, advancedGeopolitics };
}

function openWar(source, options = {}) {
  const result = advanceGeneratedWorldWars(
    source.runtime,
    source.state.generatedWorld.worldWars,
    source.state.generatedWorld.regionalDomains,
    source.previousGeopolitics,
    source.advancedGeopolitics,
    { year: 317, month: 5 },
    options,
  );
  assert.equal(result.worldWars.activeWars.length, 1);
  return result;
}

test("an AI war opens on a real border with explicit attack and defense doctrines", () => {
  const source = fixture("ai-war-opening");
  const result = openWar(source);
  const war = result.worldWars.activeWars[0];
  assert.equal(war.attackerNationId, source.attackerNationId);
  assert.equal(war.defenderNationId, source.defenderNationId);
  assert.ok(war.fronts.length >= 1 && war.fronts.length <= 5);
  assert.ok(war.fronts.every((front) => (
    source.runtime.regionById.get(front.originRegionId).neighborIds.includes(front.targetRegionId)
  )));
  assert.match(war.attackerDoctrineId, /breakthrough|warfare|pressure/);
  assert.match(war.defenderDoctrineId, /fortress|mobile|depth/);
  assert.equal(result.worldWars.events[0].worldWarId, war.id);
  assert.match(result.worldWars.events[0].summary, /攻撃側は.+防衛側は/);
});

test("the same world, state, and month produce the same AI war", () => {
  const source = fixture("ai-war-determinism");
  const first = openWar(source);
  const second = openWar(source);
  assert.deepEqual(first, second);
});

test("monthly campaigning records actions, supply consumption, progress, and casualties", () => {
  const source = fixture("ai-war-monthly-actions");
  const opened = openWar(source);
  const warAtOpening = structuredClone(opened.worldWars.activeWars[0]);
  const advanced = advanceGeneratedWorldWars(
    source.runtime,
    opened.worldWars,
    opened.regionalDomains,
    opened.geopolitics,
    opened.geopolitics,
    { year: 317, month: 6 },
  );
  const mobilized = advanced.worldWars.activeWars[0];
  assert.equal(mobilized.phase, "campaigning");
  assert.ok(mobilized.attacker.supply < warAtOpening.attacker.supply);
  const fought = advanceGeneratedWorldWars(
    source.runtime,
    advanced.worldWars,
    advanced.regionalDomains,
    advanced.geopolitics,
    advanced.geopolitics,
    { year: 317, month: 7 },
  );
  const campaign = fought.worldWars.activeWars[0];
  assert.ok(campaign.attacker.casualties > 0);
  assert.ok(campaign.defender.casualties > 0);
  assert.ok(campaign.fronts.every((front) => front.attackerActionId && front.defenderActionId));
  assert.match(fought.worldWars.events.at(-1).summary, /進捗.+損失.+補給/);
});

test("an AI victory transfers the actual target region and closes the war with a truce", () => {
  const source = fixture("ai-war-annexation");
  let result = openWar(source);
  const targetRegionId = result.worldWars.activeWars[0].targetRegionId;
  assert.equal(result.regionalDomains.regionStates[targetRegionId].nationId, source.defenderNationId);
  result.worldWars.activeWars[0] = {
    ...result.worldWars.activeWars[0],
    phase: "siege",
    attacker: { ...result.worldWars.activeWars[0].attacker, strength: 5000, supply: 100, morale: 100 },
    defender: { ...result.worldWars.activeWars[0].defender, strength: 10, supply: 0, morale: 0 },
    fronts: result.worldWars.activeWars[0].fronts.map((front) => ({ ...front, progress: 100 })),
  };
  result = advanceGeneratedWorldWars(source.runtime, result.worldWars, result.regionalDomains, result.geopolitics, result.geopolitics, { year: 317, month: 6 });
  assert.equal(result.worldWars.activeWars[0].phase, "settlement");
  assert.equal(result.worldWars.activeWars[0].outcome, "attacker_victory");
  result = advanceGeneratedWorldWars(source.runtime, result.worldWars, result.regionalDomains, result.geopolitics, result.geopolitics, { year: 317, month: 7 });
  assert.equal(result.worldWars.activeWars.length, 0);
  assert.equal(result.worldWars.history[0].settlementId, "limited_annexation");
  assert.equal(result.regionalDomains.regionStates[targetRegionId].nationId, source.attackerNationId);
  assert.ok(result.resistance.occupations.some((entry) => entry.regionId === targetRegionId && entry.status === "active"));
  assert.equal(result.geopolitics.relations[source.key].atWar, false);
  assert.ok(result.geopolitics.relations[source.key].truceMonths >= 12);
});

test("catastrophic capital fall produces full annexation or national collapse instead of a fixed-city outcome", () => {
  const source = fixture("ai-war-capital-collapse");
  let result = openWar(source);
  const capitalRegionId = source.runtime.nationById.get(source.defenderNationId).capitalRegionId;
  result.worldWars.activeWars[0] = {
    ...result.worldWars.activeWars[0],
    phase: "siege",
    targetRegionId: capitalRegionId,
    attacker: { ...result.worldWars.activeWars[0].attacker, strength: 6000, supply: 100, morale: 100 },
    defender: { ...result.worldWars.activeWars[0].defender, strength: 1, supply: 0, morale: 0 },
    fronts: [{ ...result.worldWars.activeWars[0].fronts[0], targetRegionId: capitalRegionId, progress: 100 }],
  };
  result.geopolitics.nationStates[source.defenderNationId].cohesion = 0;
  result = advanceGeneratedWorldWars(source.runtime, result.worldWars, result.regionalDomains, result.geopolitics, result.geopolitics, { year: 317, month: 6 });
  result = advanceGeneratedWorldWars(source.runtime, result.worldWars, result.regionalDomains, result.geopolitics, result.geopolitics, { year: 317, month: 7 }, { resistance: result.resistance });
  assert.match(result.worldWars.history[0].settlementId, /full_annexation|nation_collapse/);
  assert.equal(Object.values(result.regionalDomains.regionStates).some((entry) => entry.nationId === source.defenderNationId), false);
  assert.ok(result.resistance.occupations.some((entry) => entry.regionId === capitalRegionId));
});

test("wars involving a protected nation wait for the player and never auto-transfer territory", () => {
  const source = fixture("ai-war-player-boundary");
  const result = openWar(source, { protectedNationIds: [source.defenderNationId] });
  const war = result.worldWars.activeWars[0];
  const targetRegionId = war.targetRegionId;
  assert.equal(war.phase, "awaiting_player");
  assert.equal(war.requiresPlayerDecision, true);
  assert.equal(result.pendingStrategicDecisions[0].type, "generated_world_war_response");
  const next = advanceGeneratedWorldWars(source.runtime, result.worldWars, result.regionalDomains, result.geopolitics, result.geopolitics, { year: 317, month: 6 }, { protectedNationIds: [source.defenderNationId] });
  assert.deepEqual(next.worldWars.activeWars[0], war);
  assert.equal(next.regionalDomains.regionStates[targetRegionId].nationId, source.defenderNationId);
});

test("world-war state is compact, saveable, and old generated saves receive an empty ledger", () => {
  const source = fixture("ai-war-save-contract");
  const opened = openWar(source);
  const preserved = preserveGeneratedWorldWarState(opened.worldWars);
  assert.deepEqual(preserved, opened.worldWars);
  assert.equal(JSON.stringify(preserved).includes("tiles"), false);
  const rebuilt = createGeneratedWorldWarState(source.runtime, structuredClone(preserved), { year: 317, month: 5 });
  assert.deepEqual(rebuilt, preserved);

  const generated = createGeneratedWorldState({ ...source.state.generatedWorld, worldWars: undefined }, source.state);
  assert.equal(generated.worldWars, null);
  const runtime = buildGeneratedWorld({ generatedWorld: generated });
  assert.deepEqual(createGeneratedWorldWarState(runtime, generated.worldWars, source.state).activeWars, []);
});

test("an old save with an active AI war is reconstructed, while a player campaign relation is excluded", () => {
  const source = fixture("ai-war-old-save");
  const legacyGeopolitics = structuredClone(source.advancedGeopolitics);
  legacyGeopolitics.events = [];
  const reconstructed = advanceGeneratedWorldWars(
    source.runtime,
    null,
    source.state.generatedWorld.regionalDomains,
    legacyGeopolitics,
    legacyGeopolitics,
    { year: 317, month: 8 },
  );
  assert.equal(reconstructed.worldWars.activeWars.length, 1);
  assert.equal(reconstructed.worldWars.activeWars[0].relationKey, source.key);

  const excluded = advanceGeneratedWorldWars(
    source.runtime,
    null,
    source.state.generatedWorld.regionalDomains,
    legacyGeopolitics,
    legacyGeopolitics,
    { year: 317, month: 8 },
    { excludedRelationKeys: [source.key] },
  );
  assert.equal(excluded.worldWars.activeWars.length, 0);

  reconstructed.worldWars.activeWars[0].attacker.strength = 0;
  assert.equal(preserveGeneratedWorldWarState(reconstructed.worldWars).activeWars[0].attacker.strength, 0);
});

test("war view resolves generated nation, region, doctrine, and action names", () => {
  const source = fixture("ai-war-view");
  let result = openWar(source);
  result = advanceGeneratedWorldWars(source.runtime, result.worldWars, result.regionalDomains, result.geopolitics, result.geopolitics, { year: 317, month: 6 });
  result = advanceGeneratedWorldWars(source.runtime, result.worldWars, result.regionalDomains, result.geopolitics, result.geopolitics, { year: 317, month: 7 });
  const view = getGeneratedWorldWarView(source.runtime, result.worldWars, { year: 317, month: 7 });
  assert.ok(view.activeWars[0].attackerName);
  assert.ok(view.activeWars[0].defenderName);
  assert.ok(view.activeWars[0].targetRegionName);
  assert.ok(view.activeWars[0].attackerDoctrine.name);
  assert.ok(view.activeWars[0].defenderDoctrine.name);
  assert.ok(view.activeWars[0].fronts[0].attackerAction.name);
  assert.ok(view.activeWars[0].fronts[0].defenderAction.name);
});

test("the normal geopolitical monthly pulse opens an AI-vs-AI war after a sustained border crisis", () => {
  const state = createCareerInitialState({ seed: "ai-war-monthly-integration", width: 48, height: 32, plateCount: 9, nationCount: 7 });
  const runtime = getGeneratedWorldView(state).runtime;
  const protectedIds = new Set(state.generatedWorld.simulationFidelity?.playerControlledNationIds ?? []);
  const border = runtime.nations.borderSegments.find((segment) => segment.nations.every((nationId) => !protectedIds.has(nationId)));
  assert.ok(border, "the fixture needs an AI-only border");
  const [attackerNationId, defenderNationId] = border.nations;
  const key = [attackerNationId, defenderNationId].sort().join(":");
  for (const [relationKey, relation] of Object.entries(state.generatedWorld.geopolitics.relations)) {
    if (!relationKey.split(":").includes(attackerNationId)) continue;
    state.generatedWorld.geopolitics.relations[relationKey] = {
      ...relation,
      relation: 10,
      tension: 0,
      crisisMonths: 0,
      atWar: false,
      truceMonths: 0,
    };
  }
  state.generatedWorld.geopolitics.relations[key] = {
    ...state.generatedWorld.geopolitics.relations[key],
    relation: -90,
    tension: 95,
    crisisMonths: 3,
    atWar: false,
    truceMonths: 0,
    allied: false,
  };
  state.generatedWorld.geopolitics.nationStates[attackerNationId] = {
    ...state.generatedWorld.geopolitics.nationStates[attackerNationId],
    readiness: 100,
    offensiveIntent: 100,
    reserves: 100,
    cohesion: 100,
  };
  let advanced = advanceGeneratedWorldGeopolitics({ ...state, year: 317, month: 5 });
  const war = advanced.generatedWorld.worldWars.activeWars.find((entry) => entry.relationKey === key);
  assert.ok(war);
  assert.equal(war.requiresPlayerDecision, false);
  assert.equal(advanced.generatedWorld.geopolitics.relations[key].atWar, true);
  assert.ok(advanced.generatedWorld.worldWars.events.some((event) => event.worldWarId === war.id));

  for (let monthIndex = 0; monthIndex < 24; monthIndex += 1) {
    const month = advanced.month === 12 ? 1 : advanced.month + 1;
    const year = advanced.month === 12 ? advanced.year + 1 : advanced.year;
    advanced = advanceGeneratedWorldGeopolitics({ ...advanced, year, month });
    const participants = advanced.generatedWorld.worldWars.activeWars.flatMap((entry) => [entry.attackerNationId, entry.defenderNationId]);
    assert.equal(new Set(participants).size, participants.length, "one nation cannot fight two autonomous wars simultaneously");
    assert.ok(advanced.generatedWorld.worldWars.activeWars.every((entry) => entry.fronts.length >= 1 && entry.fronts.length <= 5));
  }
  assert.ok(advanced.generatedWorld.worldWars.history.some((entry) => entry.id === war.id));
  assert.equal(new Set(advanced.generatedWorld.worldWars.events.map((event) => event.id)).size, advanced.generatedWorld.worldWars.events.length);
});
