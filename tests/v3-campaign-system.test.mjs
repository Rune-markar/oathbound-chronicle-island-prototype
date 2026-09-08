import test from "node:test";
import { findAutoPath } from "../src/v3-auto-mode.js";
import { getV3DiplomaticPosition } from "../src/v3-campaign-diplomacy.js";
import { getV3CivicProduction, getV3CivicRegion, getV3CivicPressureReduction } from "../src/v3-civic-policy.js";
import { createStateReason } from "../src/state-reason-system.js";
import { advanceV3MarketEconomyMonth } from "../src/v3-market-economy.js";
import assert from "node:assert/strict";
import { buildWorldGeneration } from "../src/world-generation.js";
import { createV3FieldState, createV3WorldContext, getV3DetailedTile, getV3TileEntity, moveV3Player, resolveV3Encounter } from "../src/v3-field-system.js";
import { getV3CurrentMarket } from "../src/v3-merchant-system.js";
import { commitV3Action, normalizeV3IntegratedState } from "../src/v3-system-kernel.js";
import { createV3WorldSimulation, normalizeV3WorldSimulation, getV3WorldSimulationView } from "../src/v3-world-simulation.js";
import { transferRegionControl } from "../src/regional-domain-system.js";
import { advanceV3CampaignMonth, getV3CampaignView, normalizeV3CampaignState, performV3CampaignAction } from "../src/v3-campaign-system.js";
import { getGameCalendar } from "../src/game-clock.js";
import { readV3Save, writeV3Save, V3_SAVE_VERSION } from "../src/v3-save-system.js";
import { createActionResult } from "../src/action-result.js";
import { getDomainEvents } from "../src/domain-events.js";

function game(seed = "v3-campaign-natural", nationCount = 3) {
  const options = { seed, width: 32, height: 24, plateCount: 6, nationCount };
  const runtime = buildWorldGeneration(options);
  const context = createV3WorldContext(runtime);
  const run = { runtime, context, options, world: createV3WorldSimulation(runtime, options), state: normalizeV3IntegratedState(context, createV3FieldState(context)), count: 0 };
  run.view = () => getV3CampaignView(context, run.state, run.world);
  run.commit = (action) => {
    const result = commitV3Action(runtime, context, run.state, run.world, action, { source: "campaign-test" });
    run.state = result.state; run.world = result.worldSimulation; return result;
  };
  run.act = (id, targetId = null) => {
    run.count += 1;
    if (run.count > 150) throw new Error(`Campaign exceeded decision budget: ${id} ${JSON.stringify(run.state.campaign)}`);
    return run.commit(performV3CampaignAction(context, run.state, id, { targetId, worldSimulation: run.world }));
  };
  run.ready = (id, targetId = null) => run.view().actions.some((entry) => entry.id === id && (targetId == null || entry.targetId === targetId) && entry.enabled);
  return run;
}

function walkToMarket(run) {
  const directions = [["north", 0, -1], ["east", 1, 0], ["south", 0, 1], ["west", -1, 0]];
  const queue = [{ x: run.state.player.x, y: run.state.player.y, path: [] }];
  const seen = new Set();
  let path;
  for (let index = 0; index < queue.length && index < 16000; index += 1) {
    const point = queue[index];
    if (getV3CurrentMarket(run.context, { ...run.state, player: { ...run.state.player, x: point.x, y: point.y } })) { path = point.path; break; }
    for (const [direction, dx, dy] of directions) {
      const x = (point.x + dx + run.context.width) % run.context.width; const y = point.y + dy;
      const key = `${x},${y}`;
      if (y < 0 || y >= run.context.height || seen.has(key)) continue;
      seen.add(key);
      if (!getV3DetailedTile(run.context, x, y).passable || getV3TileEntity(run.context, x, y, run.state)?.type === "enemy") continue;
      queue.push({ x, y, path: [...point.path, direction] });
    }
  }
  assert.ok(path, "the generated start has a walkable market");
  for (const direction of path) {
    run.commit(moveV3Player(run.context, run.state, direction));
    if (run.state.pendingEncounter) run.commit(resolveV3Encounter(run.context, run.state, "leave"));
  }
  assert.ok(getV3CurrentMarket(run.context, run.state));
}

function walkToSurvey(run) {
  const plan = findAutoPath(run.context, run.state.player, run.state.campaign.survey, "short");
  assert.ok(plan?.length, "the commission has a reachable field destination");
  for (const direction of plan) {
    run.commit(moveV3Player(run.context, run.state, direction));
    while (run.state.pendingEncounter) run.commit(resolveV3Encounter(run.context, run.state, run.state.pendingEncounter.type === "enemy" ? "fight" : "leave"));
  }
}

function finalize(run) {
  let action = run.view().actions.find((entry) => entry.id === "finalize");
  raiseTreasury(run, action.cost);
  if (!run.ready("finalize", action.targetId)) run.act("wait-month");
  action = run.view().actions.find((entry) => entry.id === "finalize");
  run.act("finalize", action.targetId);
}

function becomeGovernor(run) {
  walkToMarket(run);
  run.act("local-work");
  run.act("commission");
  run.act("community:hearing");
  walkToSurvey(run);
  run.act("survey:watch");
  walkToMarket(run);
  run.act("appointment");
  assert.equal(run.state.campaign.stage, "governor");
  const office = run.world.generatedWorld.regionalDomains.regionStates[run.state.campaign.regionId];
  assert.equal(office.lordId, "v3-player");
}

function raiseTreasury(run, amount) {
  for (let index = 0; run.state.campaign.treasury < amount && index < 24; index += 1) {
    if (run.state.campaign.support < 65 && run.ready("council")) run.act("council");
    run.act("wait-month");
  }
  assert.ok(run.state.campaign.treasury >= amount, `taxes can finance decisions: ${run.state.campaign.treasury}/${amount}`);
}

function becomeSovereign(run) {
  becomeGovernor(run);
  run.act("council");
  raiseTreasury(run, run.view().actions.find((entry) => entry.id === "public-work").cost);
  run.act("public-work");
  run.act("wait-month"); run.act("wait-month");
  if (run.state.campaign.support < 50) run.act("council");
  raiseTreasury(run, 12);
  const previousNation = run.state.campaign.nationId;
  run.act("sovereignty");
  assert.notEqual(run.state.campaign.nationId, previousNation);
  const map = getV3WorldSimulationView(run.runtime, run.world);
  assert.equal([...map.regionById.values()].filter((region) => region.nationId === run.state.campaign.nationId).length, 1, "autonomy charters only the governed region");
}

function negotiate(run, nationId, trust = 96) {
  let position = run.view().diplomacy.find((entry) => entry.id === nationId);
  if (!position.offerSatisfied && !position.atWar) {
    if (!run.state.campaign.institutions.includes(position.need.policy)) { raiseTreasury(run, 8); run.act(`institution:${position.need.policy}`); }
    raiseTreasury(run, 4); run.act("offer:policy", nationId);
  }
  for (let index = 0; (run.state.campaign.diplomacy[nationId]?.trust ?? 0) < trust && index < 8; index += 1) {
    raiseTreasury(run, 6);
    if (!run.ready("envoy", nationId)) run.act("wait-month");
    run.act("envoy", nationId);
  }
  position = run.view().diplomacy.find((entry) => entry.id === nationId);
  if (!position.offerSatisfied && !position.atWar) {
    if (!run.state.campaign.institutions.includes(position.need.policy)) { raiseTreasury(run, 8); run.act(`institution:${position.need.policy}`); }
    raiseTreasury(run, 4); run.act("offer:policy", nationId);
  }
}

test("existing V3 records acquire optional campaign state; unknown campaign formats are refused", () => {
  const run = game();
  const old = { ...run.state }; delete old.campaign;
  assert.equal(normalizeV3CampaignState(run.context, old).campaign.stage, "wanderer");
  assert.throws(() => normalizeV3CampaignState(run.context, { ...old, campaign: { version: 2 } }), /保存形式/);
  assert.throws(() => performV3CampaignAction(run.context, run.state, "sovereignty", { worldSimulation: run.world }), /選べない/);
});

test("new player walks into a real settlement, works, accepts a commission and governs without seeded wealth", () => {
  const run = game();
  const initialGold = run.state.player.gold;
  becomeGovernor(run);
  assert.ok(run.state.steps > 0);
  assert.ok(run.state.player.gold >= initialGold - 10 + 4);
  assert.ok(run.state.clock.elapsedMinutes >= 5 * 1440);
  assert.equal(run.state.campaign.services, 1);
  assert.equal(run.state.campaign.mandates.length, 2);
  assert.equal(run.state.campaign.stewardshipMonths, 0);
  const first = run.act("wait-month");
  assert.equal(run.state.campaign.stewardshipMonths, 1);
  assert.equal(run.state.campaign.ledger.length, 1);
  assert.ok(first.events.some((entry) => entry.type === "campaign.month.closed"));
  const repeated = advanceV3CampaignMonth(run.context, run.state, run.world, getGameCalendar(run.state.clock));
  assert.equal(repeated.state.campaign.treasury, run.state.campaign.treasury, "the same calendar month cannot pay taxes twice");
});

test("federation runs from real exploration to three separate final months and same-save continued play", () => {
  const run = game("v3-campaign-federation");
  becomeSovereign(run);
  run.act("path-federation");
  for (const id of ["regional-council", "local-budget", "cultural-rights", "mutual-defense", "open-trade", "watershed-pact"]) {
    raiseTreasury(run, 8); run.act(`institution:${id}`);
  }
  for (const nation of run.view().diplomacy) {
    negotiate(run, nation.id, 96);
    raiseTreasury(run, run.view().actions.find((entry) => entry.id === "treaty" && entry.targetId === nation.id).cost);
    if (!run.ready("treaty", nation.id)) negotiate(run, nation.id, 96);
    run.act("treaty", nation.id);
  }
  for (let index = 0; index < 3; index += 1) {
    raiseTreasury(run, index === 1 ? 18 : 8);
    finalize(run);
    if (index === 0) {
      const suspended = structuredClone(run.state);
      for (const entry of Object.values(suspended.campaign.diplomacy)) entry.trust = 0;
      const next = getV3CampaignView(run.context, suspended, run.world).actions.find((entry) => entry.id === "finalize");
      assert.equal(next.enabled, false);
      assert.match(next.reason, /同意した存続国家/, "even after the charter, every final act rechecks current consent");
    }
    if (index < 2) assert.equal(run.ready("finalize"), false, "final acts cannot be batched in one month");
  }
  assert.equal(run.state.campaign.ending, "federation");
  assert.ok(run.count < 100, `${run.count} decisions`);
  const memory = new Map(); const storage = { getItem: (id) => memory.get(id) ?? null, setItem: (id, value) => memory.set(id, value) };
  writeV3Save(storage, "campaign-test", { version: V3_SAVE_VERSION, world: run.options, field: run.state, worldSimulation: run.world });
  const restored = readV3Save(storage, "campaign-test");
  assert.equal(restored.field.campaign.ending, "federation");
  assert.equal(restored.worldSimulation.generatedWorld.regionalDomains.regionStates[run.state.campaign.regionId].nationId, run.state.campaign.nationId);
  const months = run.world.elapsedMonths;
  run.act("wait-month");
  assert.equal(run.world.elapsedMonths, months + 1);
  assert.equal(run.state.campaign.ending, "federation");
});

test("empire requires connected real territory, three institutions and twelve governing months", () => {
  const run = game("v3-campaign-empire");
  becomeSovereign(run);
  run.act("path-empire");
  for (const id of ["central-tax", "common-law", "national-army"]) { raiseTreasury(run, 8); run.act(`institution:${id}`); }
  for (let index = 0; index < 12; index += 1) {
    const need = run.view().requirements.find((entry) => entry.label.includes("支配地方"));
    if (need.met) break;
    const target = run.view().actions.find((entry) => entry.id === "integrate-region");
    assert.ok(target, "the sovereign has a real neighboring region");
    const owner = getV3WorldSimulationView(run.runtime, run.world).regionById.get(target.targetId).nationId;
    negotiate(run, owner);
    raiseTreasury(run, run.view().actions.find((entry) => entry.id === "integrate-region" && entry.targetId === target.targetId).cost);
    if (run.state.campaign.support < 50 && run.ready("council")) run.act("council");
    run.act("integrate-region", target.targetId);
  }
  assert.equal(run.ready("finalize"), false, "territory alone does not complete the centralization crisis");
  for (let index = 0; run.state.campaign.centralizationMonths < 12 && index < 36; index += 1) {
    if (run.state.campaign.support < 70 && run.ready("council")) run.act("council");
    run.act("wait-month");
  }
  assert.equal(run.state.campaign.centralizationMonths, 12);
  finalize(run);
  while (run.state.campaign.readiness < 66) {
    raiseTreasury(run, 24);
    if (!run.ready("drill")) run.act("wait-month");
    assert.ok(run.ready("drill"), "the real market can supply training");
    run.act("drill");
  }
  for (let index = 0; index < 2; index += 1) {
    raiseTreasury(run, index === 0 ? 18 : 8);
    if (run.state.campaign.support < 50 && run.ready("council")) run.act("council");
    finalize(run);
  }
  assert.equal(run.state.campaign.ending, "empire");
  assert.ok(run.count < 100, `${run.count} decisions`);
});

test("regional material spending consumes real inventory and relief conserves grain between connected markets", () => {
  const run = game("v3-campaign-material");
  becomeGovernor(run);
  raiseTreasury(run, 40);
  const local = Object.values(run.world.marketEconomy.settlements).filter((entry) => entry.regionId === run.state.campaign.regionId);
  // Adversarial resource state: local storage is empty while a connected supplier has a surplus.
  for (const market of Object.values(run.world.marketEconomy.settlements)) {
    market.goods.grain.inventory = Math.max(0, market.goods.grain.capacity - 1);
    market.goods.grain.coverageMonths = market.goods.grain.inventory / Math.max(1, market.goods.grain.lastConsumption);
  }
  for (const market of local) { market.goods.grain.inventory = 0; market.goods.grain.coverageMonths = 0; }
  const relief = run.view().actions.find((entry) => entry.id === "relief");
  assert.ok(relief.enabled, relief.reason);
  const before = Object.fromEntries(Object.entries(run.world.marketEconomy.settlements).map(([id, market]) => [id, market.goods.grain.inventory]));
  const goldBefore = run.state.campaign.treasury;
  const outcome = performV3CampaignAction(run.context, run.state, "relief", { worldSimulation: run.world });
  const delta = Object.entries(outcome.worldSimulation.marketEconomy.settlements).map(([id, market]) => Number((market.goods.grain.inventory - before[id]).toFixed(1)));
  assert.deepEqual(delta.filter((amount) => amount !== 0).sort((a, b) => a - b), [-4, 4]);
  assert.equal(outcome.state.campaign.treasury, Number((goldBefore - relief.cost).toFixed(1)));
  assert.equal(run.state.campaign.treasury, goldBefore, "read models and actions preserve their input");
  for (const market of Object.values(run.world.marketEconomy.settlements)) market.goods.grain.inventory = 0;
  assert.equal(run.ready("relief"), false, "the state cannot conjure imports when all suppliers are empty");
});

test("losing all territory stops taxes and exposes a funded, local path back to public service", () => {
  const run = game("v3-campaign-dispossession");
  becomeSovereign(run);
  const other = run.view().diplomacy[0].id;
  run.world = { ...run.world, generatedWorld: { ...run.world.generatedWorld, regionalDomains: transferRegionControl(run.runtime, run.world.generatedWorld.regionalDomains, run.state.campaign.regionId, other, {}, run.world) } };
  const month = getGameCalendar(run.state.clock);
  const result = advanceV3CampaignMonth(run.context, run.state, run.world, { year: month.year + 1, month: month.month });
  assert.equal(result.state.campaign.ledger.at(-1).revenue, 0);
  assert.equal(result.state.campaign.treasury, run.state.campaign.treasury);
  while (run.state.player.gold < 8) run.act("local-work");
  assert.equal(run.ready("restore-office"), true);
  run.act("restore-office");
  assert.equal(run.state.campaign.stage, "governor");
  assert.equal(run.state.campaign.nationId, other);
  assert.equal(run.world.generatedWorld.regionalDomains.regionStates[run.state.campaign.regionId].lordId, "v3-player");
});

test("a twelve-month batch keeps campaign events at each boundary and matches twelve individual world months", () => {
  const run = game("v3-campaign-month-batch");
  becomeGovernor(run);
  const original = structuredClone(run.state); const originalWorld = structuredClone(run.world);
  const batch = run.commit(createActionResult(run.state, { elapsedMinutes: 12 * 30 * 1440 }));
  const events = batch.events.filter((entry) => entry.type === "campaign.month.closed");
  assert.equal(events.length, 12);
  assert.equal(new Set(events.map((entry) => entry.period)).size, 12);
  for (const entry of events) {
    const calendar = getGameCalendar(entry.clock);
    assert.equal(entry.period, `${calendar.year}-${calendar.month}`);
  }
  run.state = original; run.world = originalWorld;
  for (let index = 0; index < 12; index += 1) run.act("wait-month");
  assert.deepEqual(batch.state.campaign.ledger, run.state.campaign.ledger);
  assert.deepEqual(batch.worldSimulation, run.world);
  assert.equal(batch.state.campaign.treasury, run.state.campaign.treasury);
  assert.equal(batch.state.campaign.support, run.state.campaign.support);
  const memory = new Map(); const storage = { getItem: (id) => memory.get(id) ?? null, setItem: (id, value) => memory.set(id, value) };
  writeV3Save(storage, "batch", { version: V3_SAVE_VERSION, world: run.options, field: batch.state, worldSimulation: batch.worldSimulation });
  const restored = readV3Save(storage, "batch");
  assert.deepEqual(restored.field.campaign, batch.state.campaign);
  const savedEvents = getDomainEvents(restored.field, (entry) => entry.type === "campaign.month.closed");
  assert.equal(savedEvents.length, 12);
  for (const entry of savedEvents) { const calendar = getGameCalendar(entry.clock); assert.equal(entry.period, `${calendar.year}-${calendar.month}`); }
});

test("diplomatic ceasefire preserves the real war, casualties and settlement event in history", () => {
  const run = game("v3-campaign-ceasefire");
  becomeSovereign(run);
  raiseTreasury(run, 6);
  const target = run.view().diplomacy[0].id;
  const nationId = run.state.campaign.nationId;
  const key = [nationId, target].sort().join(":");
  run.state.campaign.diplomacy[target] = { trust: 48, consent: false, lastEnvoyPeriod: null, consentPeriod: null };
  const world = structuredClone(run.world);
  world.generatedWorld.geopolitics.relations[key] = { relation: -50, tension: 80, atWar: true, truceMonths: 0 };
  world.generatedWorld.worldWars.activeWars.push({ id: "campaign-regression-war", relationKey: key, attackerNationId: target, defenderNationId: nationId, targetRegionId: run.state.campaign.regionId, phase: "campaigning", attacker: { initialStrength: 120, strength: 110, casualties: 10, supply: 50, morale: 60 }, defender: { initialStrength: 100, strength: 95, casualties: 5, supply: 55, morale: 60 }, fronts: [], log: [] });
  const result = performV3CampaignAction(run.context, run.state, "envoy", { targetId: target, worldSimulation: world });
  const wars = result.worldSimulation.generatedWorld.worldWars;
  assert.ok(!wars.activeWars.some((entry) => entry.id === "campaign-regression-war"));
  const closed = wars.history.find((entry) => entry.id === "campaign-regression-war");
  assert.equal(closed.settlementId, "negotiated_ceasefire");
  assert.equal(closed.attacker.casualties, 10);
  assert.equal(closed.defender.casualties, 5);
  assert.ok(wars.events.some((entry) => entry.worldWarId === closed.id && entry.id.endsWith(":ceasefire")));
  assert.equal(result.worldSimulation.generatedWorld.geopolitics.relations[key].atWar, false);
});

test("work and arbitrary step counts do not replace a local mandate or its physical visit", () => {
  const run = game("ux-mandates");
  walkToMarket(run); run.act("local-work"); run.act("commission");
  run.state.steps = 9999; run.state.campaign.services = 999;
  assert.equal(run.ready("appointment"), false);
  assert.equal(run.ready("survey:watch"), false);
  assert.throws(() => run.act("survey:watch"), /見回り地点/);
  run.act("community:hearing");
  assert.equal(run.ready("appointment"), false);
  walkToSurvey(run); run.act("survey:watch");
  assert.equal(run.state.campaign.mandates.length, 2);
  assert.equal(run.ready("survey:watch"), false, "the same report cannot be farmed");
  walkToMarket(run); run.act("appointment");
  run.act("wait-month"); run.act("wait-month");
  assert.equal(run.ready("sovereignty"), false, "time alone is not civic achievement");
});

test("distinct institutions change real production, environmental pressure and public finance", () => {
  const run = game("ux-distinct-policies"); becomeGovernor(run);
  run.state.campaign.treasury = 100;
  const beforeState = structuredClone(run.state), beforeWorld = structuredClone(run.world), results = {};
  for (const id of ["regional-council", "local-budget", "watershed-pact", "harvest-cooperative"]) {
    run.state = structuredClone(beforeState); run.world = structuredClone(beforeWorld);
    run.act(`institution:${id}`); run.act("wait-month");
    results[id] = { state: structuredClone(run.state), world: structuredClone(run.world) };
  }
  const id = run.state.campaign.regionId;
  const marketId = Object.values(beforeWorld.marketEconomy.settlements).find((market) => market.regionId === id).id;
  const base = results["regional-council"], forest = results["watershed-pact"], food = results["harvest-cooperative"];
  assert.ok(forest.world.marketEconomy.settlements[marketId].goods.timber.lastProduction < base.world.marketEconomy.settlements[marketId].goods.timber.lastProduction);
  assert.ok(food.world.marketEconomy.settlements[marketId].goods.grain.lastProduction > base.world.marketEconomy.settlements[marketId].goods.grain.lastProduction);
  assert.ok(forest.world.externalCrises.regionalPressures[id].flood.value < base.world.externalCrises.regionalPressures[id].flood.value);
  assert.ok(forest.world.externalCrises.regionalPressures[id].wildfire.value < base.world.externalCrises.regionalPressures[id].wildfire.value);
  assert.notEqual(base.state.campaign.ledger.at(-1).revenue, results["local-budget"].state.campaign.ledger.at(-1).revenue);
  assert.equal(forest.world.civicState.regions[id].habitatHealth, 53);
  assert.deepEqual(beforeState.campaign.institutions, []);
});

test("trade guarantees increase actual border shipments without manufacturing inventory", () => {
  const run = game("ux-border-policy", 4); becomeGovernor(run);
  // Controlled border fixture: an existing physical road links two countries.
  const offices = run.world.generatedWorld.regionalDomains;
  const settlements = run.runtime.nations.objects.filter((entry) => entry.settlementLevel);
  const endpoint = (id) => {
    const object = run.runtime.nations.objects.find((entry) => entry.id === id);
    return object?.settlementLevel ? object : settlements.find((entry) => entry.regionId === object?.regionId && entry.regionSeat);
  };
  const road = run.runtime.nations.roads.find((entry) => endpoint(entry.fromObjectId) && endpoint(entry.toObjectId) && endpoint(entry.fromObjectId).regionId !== endpoint(entry.toObjectId).regionId);
  assert.ok(road);
  const left = endpoint(road.fromObjectId), right = endpoint(road.toObjectId);
  const foreign = run.runtime.nations.nations.find((entry) => entry.id !== run.state.campaign.nationId).id;
  offices.regionStates[left.regionId].nationId = run.state.campaign.nationId;
  offices.regionStates[right.regionId].nationId = foreign;
  offices.assetStates[`road:${road.id}`].condition = 100;
  for (const tile of run.runtime.tiles) { tile.resourcePotential = { ...tile.resourcePotential, agriculture: 0 }; tile.yields = { ...tile.yields, food: 0 }; }
  for (const market of Object.values(run.world.marketEconomy.settlements)) market.goods.grain.inventory = market.id === left.id ? market.goods.grain.capacity : 0;
  const physical = { ...run.runtime, nations: { ...run.runtime.nations, roads: [{ ...road, importance: 4 }] } };
  const baseDate = { year: 317, month: 5 };
  const base = advanceV3MarketEconomyMonth(physical, run.world.marketEconomy, baseDate, run.world.generatedWorld);
  const civicState = { version: 1, regions: { [left.regionId]: { ownerNationId: run.state.campaign.nationId, institutions: ["open-trade"], funded: true, officeRequired: false } } };
  const opened = advanceV3MarketEconomyMonth(physical, run.world.marketEconomy, { ...baseDate, civicState }, run.world.generatedWorld);
  const shipment = (economy) => economy.shipments.find((entry) => entry.commodityId === "grain" && entry.originSettlementId === left.id && entry.destinationSettlementId === right.id);
  assert.ok(shipment(opened).quantity > shipment(base).quantity);
  const stocks = (economy) => Object.values(economy.settlements).reduce((sum, market) => sum + market.goods.grain.inventory - market.goods.grain.lastUnmetConsumption, 0);
  assert.ok(Math.abs(stocks(opened) - stocks(base)) < 0.001, "the extra shipment only redistributes grain or satisfies unmet consumption");
});

test("strong countries require more compensation and trust; aid can be refused and treaties require a concrete offer", () => {
  const run = game("ux-country-needs"); becomeSovereign(run);
  run.state.campaign.treasury = 300; run.state.campaign.autonomy = 80;
  const region = run.view().actions.find((entry) => entry.id === "integrate-region").targetId;
  const ownerId = getV3WorldSimulationView(run.runtime, run.world).regionById.get(region).nationId;
  run.state.campaign.diplomacy[ownerId] = { trust: 48, consent: false };
  const outcomes = [];
  for (const level of [0, 100]) {
    const world = structuredClone(run.world), condition = world.generatedWorld.geopolitics.nationStates[ownerId];
    for (const key of ["foodSecurity", "cohesion", "reserves", "readiness", "sovereignty"]) condition[key] = level;
    condition.stateReason = createStateReason(condition, condition.stateReason);
    const view = getV3CampaignView(run.context, run.state, world);
    const position = view.diplomacy.find((entry) => entry.id === ownerId);
    const action = view.actions.find((entry) => entry.id === "integrate-region" && entry.targetId === region);
    outcomes.push({ position, action, aid: view.actions.find((entry) => entry.id === "offer:aid" && entry.targetId === ownerId) });
    assert.equal(view.actions.find((entry) => entry.id === "treaty" && entry.targetId === ownerId).enabled, false);
    assert.match(action.reason, /要求/);
  }
  assert.ok(outcomes[1].action.cost > outcomes[0].action.cost);
  assert.ok(outcomes[1].position.threshold > outcomes[0].position.threshold);
  assert.notEqual(outcomes[0].position.needId, outcomes[1].position.needId);
  assert.equal(outcomes[1].aid.enabled, false);
  assert.match(outcomes[1].aid.reason, /資金援助を求めていません/);
});

test("diplomatic needs use current regional ownership immediately after a border transfer", () => {
  const run = game("ux-current-owner"); becomeSovereign(run);
  const owner = run.view().diplomacy[0];
  const nation = getV3WorldSimulationView(run.runtime, run.world).nations.find((entry) => entry.id === owner.id);
  const world = structuredClone(run.world);
  Object.assign(world.generatedWorld.geopolitics.nationStates[owner.id], { foodSecurity: 100, readiness: 100, reserves: 100, sovereignty: 100 });
  world.marketEconomy.settlements = {
    former: { regionId: "former", nationId: owner.id, goods: { grain: { coverageMonths: 0 } } },
    current: { regionId: "current", nationId: owner.id, goods: { grain: { coverageMonths: 4 } } },
  };
  world.externalCrises.activeCrises = [{ regionId: "former", nationId: owner.id, type: "flood", severity: 5 }];
  const facts = { nations: [nation], ownedRegions: [], regions: [{ id: "former", nationId: run.state.campaign.nationId }, { id: "current", nationId: owner.id }] };
  const position = getV3DiplomaticPosition(run.context, run.state, facts, nation, world);
  assert.equal(position.grainCoverage, 4);
  assert.equal(position.environmentalPressure, 0);
  assert.equal(position.needId, "autonomy");
});

test("existing agreements survive small strength changes and expose genuine suspension reasons", () => {
  const run = game("ux-agreement-continuity"); becomeSovereign(run);
  run.state.campaign.autonomy = 80;
  const nation = run.view().diplomacy[0];
  run.state.campaign.diplomacy[nation.id] = { trust: nation.threshold, consent: true, offer: { kind: nation.needId, method: "aid", upkeep: 1 } };
  const condition = run.world.generatedWorld.geopolitics.nationStates[nation.id];
  condition.sovereignty = Math.min(100, condition.sovereignty + 5);
  condition.readiness = Math.min(100, condition.readiness + 3);
  let position = run.view().diplomacy.find((entry) => entry.id === nation.id);
  assert.equal(position.willing, true);
  assert.ok(position.threshold < position.joiningThreshold);
  const key = [nation.id, run.state.campaign.nationId].sort().join(":");
  run.world.generatedWorld.geopolitics.relations[key] = { relation: -50, tension: 80, atWar: true };
  position = run.view().diplomacy.find((entry) => entry.id === nation.id);
  assert.equal(position.willing, false);
  assert.match(position.suspensionReasons.join(" "), /停戦/);
  assert.ok(run.view().agreementAlerts.some((entry) => entry.id === nation.id));
  run.world.generatedWorld.geopolitics.relations[key].atWar = false;
  run.state.campaign.diplomacy[nation.id].trust = 0;
  assert.match(run.view().diplomacy.find((entry) => entry.id === nation.id).suspensionReasons.join(" "), /信頼/);
});

test("military pressure has reproducible success and retreat, and spends resources on both", () => {
  const run = game("ux-military-outcomes"); becomeSovereign(run);
  run.state.campaign.treasury = 100; run.state.campaign.support = 90; run.state.campaign.readiness = 90; run.state.military.merit = 3;
  const target = run.view().actions.find((entry) => entry.id === "military-region").targetId;
  const outcomes = [];
  for (let trial = 0; trial < 24; trial += 1) {
    const world = { ...run.world, model: { ...run.world.model, trial } };
    const result = performV3CampaignAction(run.context, run.state, "military-region", { targetId: target, worldSimulation: world });
    const repeated = performV3CampaignAction(run.context, run.state, "military-region", { targetId: target, worldSimulation: world });
    assert.deepEqual(result.state.campaign.lastMilitaryOutcome, repeated.state.campaign.lastMilitaryOutcome);
    assert.ok(result.state.campaign.treasury < 100);
    assert.equal(result.state.campaign.readiness, 72);
    const owner = getV3WorldSimulationView(run.runtime, result.worldSimulation).regionById.get(target).nationId;
    assert.equal(owner === run.state.campaign.nationId, result.state.campaign.lastMilitaryOutcome.success);
    outcomes.push(result.state.campaign.lastMilitaryOutcome.success);
  }
  assert.deepEqual([...new Set(outcomes)].sort(), [false, true]);
});

test("monthly reports explain actual support and readiness deltas; unfunded or lost policies stop world effects", () => {
  const run = game("ux-causal-reports"); becomeGovernor(run);
  run.act("institution:watershed-pact"); run.act("wait-month");
  const report = run.state.campaign.lastReport;
  for (const entry of report.changes) assert.equal(entry.delta, Number((entry.after - entry.before).toFixed(1)));
  assert.ok(report.causes.some((cause) => /防備/.test(cause)));
  const id = run.state.campaign.regionId, civic = run.world.civicState.regions[id];
  assert.equal(getV3CivicProduction(civic, "timber"), 0.88);
  const unpaid = { ...civic, funded: false };
  assert.equal(getV3CivicProduction(unpaid, "timber"), 1);
  assert.equal(getV3CivicPressureReduction(unpaid, "flood"), 0);
  const world = structuredClone(run.world.generatedWorld);
  world.regionalDomains.regionStates[id].lordId = "someone-else";
  assert.equal(getV3CivicRegion(run.world.civicState, world, run.runtime, id), null);
});

test("final council alternatives change costs and the continued world, and old completed V6 saves remain readable", () => {
  const run = game("ux-final-consequences"); becomeSovereign(run);
  run.act("path-federation");
  for (const id of ["regional-council", "local-budget", "cultural-rights", "mutual-defense", "open-trade", "watershed-pact"]) { raiseTreasury(run, 8); if (!run.state.campaign.institutions.includes(id)) run.act(`institution:${id}`); }
  for (const nation of run.view().diplomacy) { negotiate(run, nation.id); raiseTreasury(run, 30); run.act("treaty", nation.id); }
  finalize(run); run.act("wait-month"); raiseTreasury(run, 80);
  const choices = run.view().actions.filter((entry) => entry.id === "finalize");
  assert.equal(choices.length, 2);
  const [sanctuary, waterway] = choices.map((choice) => performV3CampaignAction(run.context, run.state, "finalize", { targetId: choice.targetId, worldSimulation: run.world }));
  assert.ok(sanctuary.worldSimulation.civicState.regions[run.state.campaign.regionId].sanctuary);
  assert.ok(waterway.worldSimulation.civicState.regions[run.state.campaign.regionId].shippingCharter);
  assert.notEqual(sanctuary.state.campaign.treasury, waterway.state.campaign.treasury);
  assert.notEqual(sanctuary.worldSimulation.civicState.regions[run.state.campaign.regionId].habitatHealth, waterway.worldSimulation.civicState.regions[run.state.campaign.regionId].habitatHealth);
  run.commit(sanctuary); finalize(run);
  const memory = new Map(), storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  writeV3Save(storage, "final", { version: V3_SAVE_VERSION, world: run.options, field: run.state, worldSimulation: run.world });
  const saved = readV3Save(storage, "final");
  assert.deepEqual(saved.field.campaign.finalChoices, run.state.campaign.finalChoices);
  assert.deepEqual(saved.worldSimulation.civicState, run.world.civicState);
  const reordered = structuredClone(saved.worldSimulation);
  reordered.civicState.regions[run.state.campaign.regionId].institutions.reverse();
  const reloaded = normalizeV3WorldSimulation(run.runtime, run.options, reordered);
  assert.deepEqual(reloaded.civicState, reordered.civicState, "real browser restoration preserves the order of stored policy references");
  delete saved.field.campaign.finalChoices; delete saved.field.campaign.mandates; delete saved.worldSimulation.civicState;
  writeV3Save(storage, "old", saved);
  const older = readV3Save(storage, "old");
  assert.equal(normalizeV3CampaignState(run.context, older.field).campaign.ending, "federation");
});
