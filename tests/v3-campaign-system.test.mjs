import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldGeneration } from "../src/world-generation.js";
import { createV3FieldState, createV3WorldContext, getV3DetailedTile, getV3TileEntity, moveV3Player, resolveV3Encounter } from "../src/v3-field-system.js";
import { getV3CurrentMarket } from "../src/v3-merchant-system.js";
import { commitV3Action, normalizeV3IntegratedState } from "../src/v3-system-kernel.js";
import { createV3WorldSimulation, getV3WorldSimulationView } from "../src/v3-world-simulation.js";
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
  run.ready = (id, targetId = null) => run.view().actions.find((entry) => entry.id === id && entry.targetId === targetId)?.enabled;
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

function becomeGovernor(run) {
  walkToMarket(run);
  run.act("local-work");
  run.act("commission");
  run.act("local-work"); run.act("local-work");
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
  run.act("wait-month"); run.act("wait-month");
  if (run.state.campaign.support < 50) run.act("council");
  raiseTreasury(run, 12);
  const previousNation = run.state.campaign.nationId;
  run.act("sovereignty");
  assert.notEqual(run.state.campaign.nationId, previousNation);
  const map = getV3WorldSimulationView(run.runtime, run.world);
  assert.equal([...map.regionById.values()].filter((region) => region.nationId === run.state.campaign.nationId).length, 1, "autonomy charters only the governed region");
}

function negotiate(run, nationId, trust = 48) {
  for (let index = 0; (run.state.campaign.diplomacy[nationId]?.trust ?? 0) < trust && index < 6; index += 1) {
    raiseTreasury(run, 6);
    if (!run.ready("envoy", nationId)) run.act("wait-month");
    run.act("envoy", nationId);
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
  assert.ok(run.state.player.gold >= initialGold - 10 + 12);
  assert.ok(run.state.clock.elapsedMinutes >= 5 * 1440);
  assert.equal(run.state.campaign.services, 3);
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
    negotiate(run, nation.id, nation.atWar ? 72 : 48);
    raiseTreasury(run, 4);
    if (!run.ready("treaty", nation.id)) negotiate(run, nation.id, 96);
    run.act("treaty", nation.id);
  }
  for (let index = 0; index < 3; index += 1) {
    raiseTreasury(run, index === 1 ? 18 : 8);
    if (!run.ready("finalize")) run.act("wait-month");
    run.act("finalize");
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
    raiseTreasury(run, 16);
    if (run.state.campaign.support < 50 && run.ready("council")) run.act("council");
    run.act("integrate-region", target.targetId);
  }
  assert.equal(run.ready("finalize"), false, "territory alone does not complete the centralization crisis");
  for (let index = 0; run.state.campaign.centralizationMonths < 12 && index < 36; index += 1) {
    if (run.state.campaign.support < 70 && run.ready("council")) run.act("council");
    run.act("wait-month");
  }
  assert.equal(run.state.campaign.centralizationMonths, 12);
  raiseTreasury(run, 8); run.act("finalize");
  while (run.state.campaign.readiness < 66) {
    raiseTreasury(run, 24);
    if (!run.ready("drill")) run.act("wait-month");
    assert.ok(run.ready("drill"), "the real market can supply training");
    run.act("drill");
  }
  for (let index = 0; index < 2; index += 1) {
    raiseTreasury(run, index === 0 ? 18 : 8);
    if (!run.ready("finalize")) run.act("wait-month");
    if (run.state.campaign.support < 50 && run.ready("council")) run.act("council");
    run.act("finalize");
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
