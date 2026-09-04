import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import {
  advanceV3WorldSimulation,
  buildV3WorldPrehistory,
  createV3WorldSimulation,
  getV3NationDossier,
  getV3SecessionCandidates,
  getV3WorldChronicle,
  getV3WorldSimulationView,
  normalizeV3WorldSimulation,
  V3_PRESENT_DATE,
} from "../src/v3-world-simulation.js";
import { analyzeRaceDecisionBalance, getTemperamentShares, TEMPERAMENT_IDS } from "../src/race-decision-system.js";
import { STATE_REASON_CONDITIONS } from "../src/state-reason-system.js";

const OPTIONS = Object.freeze({ seed: "v3-world-simulation-fixture", width: 72, height: 48, plateCount: 11, nationCount: 3 });

function fixture() {
  const generatedWorld = createGeneratedWorldState(OPTIONS, V3_PRESENT_DATE);
  return { runtime: buildGeneratedWorld(generatedWorld), generatedWorld };
}

test("V3世界状態は同じシードと月数から同じ外交・戦争・年代スナップショットを作る", () => {
  const { runtime } = fixture();
  const source = createV3WorldSimulation(runtime, OPTIONS, { year: 315, month: 10 });
  const left = advanceV3WorldSimulation(runtime, source, 18);
  const right = advanceV3WorldSimulation(runtime, source, 18);
  assert.deepEqual([left.year, left.month], [317, 4]);
  assert.deepEqual(left.generatedWorld.geopolitics, right.generatedWorld.geopolitics);
  assert.deepEqual(left.generatedWorld.worldWars, right.generatedWorld.worldWars);
  assert.deepEqual(left.history, right.history);
  assert.ok(left.history.length >= 3);
  assert.equal(left.generatedWorld.regionalDomains.lastAdvancedPeriod, "317-4");
  assert.equal(left.generatedWorld.geopolitics.lastAdvancedPeriod, "317-4");
});

test("V3事前史は指定月数だけ過去から進み、現在月と年次記録へ到達する", async () => {
  const { runtime } = fixture();
  const progress = [];
  const simulation = await buildV3WorldPrehistory(runtime, OPTIONS, {
    months: 24,
    onProgress: (entry) => progress.push(entry),
  });
  assert.deepEqual([simulation.year, simulation.month], [V3_PRESENT_DATE.year, V3_PRESENT_DATE.month]);
  assert.equal(simulation.prehistoryMonths, 24);
  assert.equal(progress.at(-1).progress, 1);
  assert.equal(progress.at(-1).completed, 24);
  assert.ok(simulation.history.some((snapshot) => snapshot.reason === "年次記録"));
  assert.equal(simulation.history.at(-1).headline, "冒険者が世界へ降り立つ");
});

test("50年事前史は人口・気質・統治者・国家判断を一つの決定論的循環で更新する", async () => {
  const options = { seed: "v3-race-history-600", width: 48, height: 32, plateCount: 8, nationCount: 4 };
  const runtime = buildGeneratedWorld(createGeneratedWorldState(options));
  const start = createV3WorldSimulation(runtime, options, { year: 267, month: 4 });
  const simulation = await buildV3WorldPrehistory(runtime, options, { months: 600 });
  assert.equal(simulation.prehistoryMonths, 600);
  assert.equal(simulation.generatedWorld.raceDynamics.lastAdvancedPeriod, "317-4");
  assert.equal(Object.keys(simulation.generatedWorld.raceDynamics.characterProfiles).length, 9);
  assert.ok(Object.values(simulation.generatedWorld.raceDynamics.nationProfiles).some((profile) => profile.leader.generation > 1));
  let compositionChanged = false;
  for (const [raceId, raceState] of Object.entries(simulation.generatedWorld.raceDynamics.races)) {
    const shares = getTemperamentShares(raceState);
    const initialShares = getTemperamentShares(start.generatedWorld.raceDynamics.races[raceId]);
    assert.ok(Math.abs(TEMPERAMENT_IDS.reduce((sum, id) => sum + shares[id], 0) - 1) < 0.00001);
    assert.ok(Object.values(raceState.baseTraits).every((value) => Number.isFinite(value) && value >= -100 && value <= 100));
    if (TEMPERAMENT_IDS.some((id) => Math.abs(shares[id] - initialShares[id]) > 0.005)) compositionChanged = true;
  }
  assert.equal(compositionChanged, true);
  const balance = analyzeRaceDecisionBalance(simulation.generatedWorld.raceDynamics);
  assert.ok(balance.maximumProjectionError < 0.02);
  assert.equal(balance.fixedCharacterCount, 9);
  const decisions = simulation.generatedWorld.geopolitics.events.filter((event) => event.alternatives?.length);
  assert.ok(decisions.length > 0);
  for (const event of decisions.slice(-8)) {
    assert.equal(Object.keys(event.decisionTraits).length, 6);
    assert.ok(Math.abs(event.alternatives.reduce((sum, option) => sum + option.probability, 0) - 1) < 0.00001);
    assert.ok(event.alternatives.every((option) => option.probability > 0 && option.probability < 1));
  }
  assert.ok(simulation.generatedWorld.worldWars.history.length >= 1, "a 50-year history must be able to contain completed wars");
  assert.ok(simulation.generatedWorld.worldWars.history.some((war) => war.settlementId === "negotiated_ceasefire"));
  assert.ok(Object.values(simulation.generatedWorld.geopolitics.nationStates).every((condition) => (
    STATE_REASON_CONDITIONS.some(({ field }) => condition[field] < 90)
  )), "long histories must not saturate every nation's conditions near 100");
});

test("周縁圧力は決定論的に蓄積し、閾値を越えた地方を独立勢力として保存する", () => {
  const options = { seed: "s1", width: 96, height: 64, plateCount: 14, nationCount: 3 };
  const runtime = buildGeneratedWorld(createGeneratedWorldState(options));
  let simulation = createV3WorldSimulation(runtime, options, { year: 300, month: 12 });
  simulation = { ...simulation, elapsedMonths: 120 };
  const prospective = { ...simulation, year: 301, month: 1, elapsedMonths: 121 };
  const candidates = getV3SecessionCandidates(runtime, prospective);
  assert.ok(candidates.length > 0);
  simulation.autonomyStrain = { [candidates[0].region.id]: 100 };
  const advanced = advanceV3WorldSimulation(runtime, simulation, 1);
  const polities = Object.values(advanced.generatedWorld.regionalDomains.independentPolities);
  assert.equal(polities.length, 1);
  assert.match(polities[0].name, /自由領$/);
  assert.equal(Object.keys(polities[0].polity.decisionBasis).length, 6);
  assert.equal(polities[0].government, polities[0].polity.governmentName);
  const dossier = getV3NationDossier(runtime, advanced, polities[0].id);
  assert.equal(dossier.decisionProfile.raceId, polities[0].peopleId);
  assert.equal(Object.keys(dossier.decisionProfile.traits).length, 6);
  assert.ok(advanced.generatedWorld.regionalDomains.events.some((event) => event.type === "regional_independence"));
  assert.ok(advanced.history.some((snapshot) => snapshot.reason === "国境変動"));
  assert.ok(getV3WorldChronicle(runtime, advanced).some((event) => event.type === "regional_independence"));
});

test("現在と過去年代は別の地図ビューを作り、国家詳細を地域・集落・外交へ接続する", () => {
  const { runtime } = fixture();
  const source = createV3WorldSimulation(runtime, OPTIONS, { year: 316, month: 4 });
  const simulation = advanceV3WorldSimulation(runtime, source, 12);
  const current = getV3WorldSimulationView(runtime, simulation);
  const historical = getV3WorldSimulationView(runtime, simulation, 0);
  assert.equal(current.isCurrent, true);
  assert.equal(historical.isCurrent, false);
  assert.equal(current.tileNationIds.length, runtime.tiles.length);
  assert.equal(historical.tileNationIds.length, runtime.tiles.length);
  const nation = current.nations.find((entry) => !entry.dissolved);
  const dossier = getV3NationDossier(runtime, simulation, nation.id);
  assert.equal(dossier.nation.id, nation.id);
  assert.ok(dossier.regions.length > 0);
  assert.ok(dossier.settlements.length > 0);
  assert.ok(dossier.condition);
  assert.ok(dossier.nation.polity?.formName);
  assert.ok(dossier.nation.polity?.politicalSystemName);
  assert.ok(dossier.nation.capitalName);
  assert.ok(dossier.decisionProfile);
  assert.equal(Object.keys(dossier.decisionProfile.traits).length, 6);
  assert.equal(Object.keys(dossier.decisionProfile.temperamentShares).length, 4);
  assert.deepEqual(Object.keys(dossier.decisionProfile.populationGroups), ["regional", "socialClass", "faith"]);
  const historicalDossier = getV3NationDossier(runtime, simulation, historical.nations.find((entry) => !entry.dissolved).id, 0);
  assert.ok(historicalDossier.nation.polity?.formName);
  assert.ok(historicalDossier.nation.capitalName);
});

test("V3世界セーブはJSON往復後も現在年月・動的国境・年代記を正規化する", () => {
  const { runtime } = fixture();
  const advanced = advanceV3WorldSimulation(runtime, createV3WorldSimulation(runtime, OPTIONS), 3);
  const restored = normalizeV3WorldSimulation(runtime, OPTIONS, JSON.parse(JSON.stringify(advanced)));
  assert.deepEqual([restored.year, restored.month], [advanced.year, advanced.month]);
  assert.deepEqual(restored.generatedWorld.regionalDomains.regionStates, advanced.generatedWorld.regionalDomains.regionStates);
  assert.deepEqual(restored.history, advanced.history);
});

test("V3通常地図に政治・地形・地方・戦争レイヤー、年代再生、月次進行、国家詳細がある", async () => {
  const [index, app, styles] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/v3-app.js", import.meta.url), "utf8"),
    readFile(new URL("../v3.css", import.meta.url), "utf8"),
  ]);
  for (const layer of ["nations", "terrain", "regions", "wars", "effects"]) assert.match(index, new RegExp(`data-v3-map-layer="${layer}"`));
  assert.match(index, /id="v3WorldHistory"/);
  assert.match(index, /data-v3-world-advance="1"/);
  assert.match(index, /id="v3WorldDossier"/);
  assert.match(index, /id="v3WorldMapDossier"/);
  assert.match(index, /id="v3WorldChronicle"/);
  assert.match(app, /buildV3WorldPrehistory/);
  assert.match(app, /getV3NationDossier/);
  assert.match(app, /renderCurrentPolity/);
  assert.match(app, /renderDecisionProfile/);
  assert.match(app, /直近判断の候補比較/);
  assert.match(app, /初期国家課題/);
  assert.match(app, /現在の最弱環/);
  assert.match(app, /POPULATION PROJECTIONS/);
  assert.match(app, /長期均衡/);
  assert.match(styles, /\.v3-world-map-workspace/);
  assert.match(styles, /\.v3-world-nation-list/);
  assert.match(styles, /\.v3-dossier-settlement/);
  assert.match(styles, /\.v3-temperament-grid/);
  assert.match(styles, /\.v3-population-groups/);
});
