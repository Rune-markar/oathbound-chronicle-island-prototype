import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import {
  analyzeRaceDecisionBalance,
  advanceRaceDecisionWorld,
  applyRaceSocialEvent,
  chooseProbabilisticDecision,
  createIndividualDecisionProfile,
  createFixedCharacterDecisionProfiles,
  createRaceDecisionWorldState,
  createRaceState,
  deriveNationDecisionProfile,
  deriveFixedCharacterDecisionProfile,
  deriveRaceRepresentativeTraits,
  deriveSeededRaceBaseTraits,
  getRepresentativeTemperament,
  getRacePopulationGroups,
  getTemperamentShares,
  scoreDecisionOptions,
  TEMPERAMENT_IDS,
} from "../src/race-decision-system.js";
import { UNIQUE_CHARACTERS } from "../src/unique-characters.js";

const WORLD_OPTIONS = Object.freeze({ seed: "race-decision-fixture", width: 48, height: 32, plateCount: 8, nationCount: 7 });

function runtimeFixture() {
  return buildGeneratedWorld(createGeneratedWorldState(WORLD_OPTIONS, { year: 300, month: 1 }));
}

test("種族基礎値は世界シードごとに再現可能な小幅差を持ち、定義中心から逸脱しすぎない", () => {
  const first = deriveSeededRaceBaseTraits("elf", "world-a");
  const repeat = deriveSeededRaceBaseTraits("elf", "world-a");
  const other = deriveSeededRaceBaseTraits("elf", "world-b");
  assert.deepEqual(first, repeat);
  assert.notDeepEqual(first, other);
  assert.ok(Math.abs(first.militarism - -10) <= 10);
  assert.ok(Math.abs(first.openness - -5) <= 10);
});

test("RaceStateは4気質の実人口を保持し、代表値には全構成比が加重反映される", () => {
  const state = createRaceState({ raceId: "elf", seed: "temperament-world", population: 1_000_000 });
  const shares = getTemperamentShares(state);
  assert.ok(Math.abs(TEMPERAMENT_IDS.reduce((sum, id) => sum + state.temperamentPopulation[id], 0) - state.population) < 0.001);
  assert.ok(Math.abs(TEMPERAMENT_IDS.reduce((sum, id) => sum + shares[id], 0) - 1) < 0.00001);
  assert.ok(TEMPERAMENT_IDS.every((id) => shares[id] > 0));
  assert.ok(getRepresentativeTemperament(state).share >= Math.max(...Object.values(shares)) - 0.000001);
  const representative = deriveRaceRepresentativeTraits(state);
  assert.ok(Object.values(representative).every((value) => value >= -100 && value <= 100));
});

test("地方・階級・信仰は同じ種族人口の独立した投影として4気質合計を保つ", () => {
  const runtime = runtimeFixture();
  const world = createRaceDecisionWorldState(runtime, null, { year: 300, month: 1 });
  for (const raceState of Object.values(world.races)) {
    const dimensions = getRacePopulationGroups(raceState);
    for (const dimensionId of ["regional", "socialClass", "faith"]) {
      assert.ok(dimensions[dimensionId].length > 0);
      const population = dimensions[dimensionId].reduce((sum, group) => sum + group.population, 0);
      assert.ok(Math.abs(population - raceState.population) < 0.02);
      for (const temperamentId of TEMPERAMENT_IDS) {
        const projected = dimensions[dimensionId].reduce((sum, group) => sum + group.temperamentPopulation[temperamentId], 0);
        assert.ok(Math.abs(projected - raceState.temperamentPopulation[temperamentId]) < 0.02);
      }
    }
  }
  assert.equal(analyzeRaceDecisionBalance(world).maximumProjectionError < 0.02, true);
  const regionalRace = Object.values(world.races).find((raceState) => Object.keys(raceState.populationGroups.regional).length >= 2);
  const [target, comparison] = Object.values(regionalRace.populationGroups.regional);
  const affected = applyRaceSocialEvent(regionalRace, {
    type: "war",
    intensity: 10,
    casualties: regionalRace.population * 0.02,
    targetRegionId: target.regionId,
    seed: "regional-loss",
  });
  const targetLossRate = 1 - affected.populationGroups.regional[target.id].population / target.population;
  const comparisonLossRate = 1 - affected.populationGroups.regional[comparison.id].population / comparison.population;
  assert.ok(targetLossRate > comparisonLossRate);
});

test("迫害は協調型を抵抗と服従へ分化させ、戦争損失は強硬型を高率に減らす", () => {
  const base = createRaceState({
    raceId: "elf",
    seed: "selection",
    population: 100_000,
    source: {
      population: 100_000,
      baseTraits: deriveSeededRaceBaseTraits("elf", "selection"),
      temperamentPopulation: { militant: 20_000, submissive: 20_000, cooperative: 40_000, independent: 20_000 },
      experience: {},
      historicalAgendas: [],
    },
  });
  const persecuted = applyRaceSocialEvent(base, { type: "persecution", intensity: 100, period: "301-1" });
  assert.ok(persecuted.temperamentPopulation.cooperative < base.temperamentPopulation.cooperative);
  assert.ok(persecuted.temperamentPopulation.militant > base.temperamentPopulation.militant);
  assert.ok(persecuted.temperamentPopulation.submissive > base.temperamentPopulation.submissive);
  const beforeWarShares = getTemperamentShares(persecuted);
  const afterWar = applyRaceSocialEvent(persecuted, { type: "war", intensity: 20, casualties: 8_000, period: "301-2" });
  const afterWarShares = getTemperamentShares(afterWar);
  assert.equal(Math.round(persecuted.population - afterWar.population), 8_000);
  assert.ok(afterWarShares.militant < beforeWarShares.militant);
  assert.ok(afterWarShares.submissive > beforeWarShares.submissive);
});

test("人物気質は現在の種族構成から抽選され、個人差と役職補正を分離して保持する", () => {
  const race = createRaceState({
    raceId: "elf",
    seed: "individuals",
    population: 10_000,
    source: {
      population: 10_000,
      baseTraits: deriveSeededRaceBaseTraits("elf", "individuals"),
      temperamentPopulation: { militant: 0, submissive: 10_000, cooperative: 0, independent: 0 },
    },
  });
  const ruler = createIndividualDecisionProfile(race, "individuals", { subjectId: "queen", roleId: "ruler" });
  const citizen = createIndividualDecisionProfile(race, "individuals", { subjectId: "citizen", roleId: "citizen" });
  assert.equal(ruler.temperamentId, "submissive");
  assert.equal(citizen.temperamentId, "submissive");
  assert.notDeepEqual(ruler.individualOffsets, citizen.individualOffsets);
  assert.ok(ruler.traits.authority > -100 && ruler.traits.authority <= 100);
});

test("既存固定人物は著者設定を変更せず、保存可能な判断プロファイルへ接続される", () => {
  const runtime = runtimeFixture();
  const before = UNIQUE_CHARACTERS.lisette_valenne.personality.temperament;
  const world = createRaceDecisionWorldState(runtime, null, { year: 300, month: 1 });
  world.characterProfiles = createFixedCharacterDecisionProfiles(world, UNIQUE_CHARACTERS, world.seed, "300-1");
  assert.equal(Object.keys(world.characterProfiles).length, Object.keys(UNIQUE_CHARACTERS).length);
  const lisette = deriveFixedCharacterDecisionProfile(world, "lisette_valenne");
  assert.equal(lisette.source, "UNIQUE_CHARACTERS");
  assert.equal(lisette.roleId, "diplomat");
  assert.ok(TEMPERAMENT_IDS.includes(lisette.temperamentId));
  assert.equal(Object.keys(lisette.traits).length, 6);
  assert.equal(UNIQUE_CHARACTERS.lisette_valenne.personality.temperament, before);
});

test("選択肢評価は6軸と利益・危険・脅威・関係をsoftmax確率へ変換し、同一シードで再現する", () => {
  const options = [
    {
      id: "war",
      baseUtility: 40,
      tags: { militarism: 1, ambition: 0.7, openness: -0.3 },
      situation: { benefit: 8, danger: 12, threat: 5, relation: -2 },
    },
    {
      id: "negotiate",
      baseUtility: 40,
      tags: { militarism: -0.8, openness: 0.7, pragmatism: 0.4 },
      situation: { benefit: 6, danger: 2, threat: 1, relation: 8 },
    },
  ];
  const militant = { traits: { militarism: 80, authority: 10, centralization: 0, openness: -30, ambition: 60, pragmatism: 0 } };
  const cooperative = { traits: { militarism: -80, authority: -20, centralization: -10, openness: 70, ambition: -10, pragmatism: 30 } };
  const config = { seed: "probability", period: "301-4", actorId: "nation-1", temperature: 18 };
  const militantScores = scoreDecisionOptions(militant, options, config);
  const cooperativeScores = scoreDecisionOptions(cooperative, options, config);
  assert.ok(Math.abs(militantScores.reduce((sum, option) => sum + option.probability, 0) - 1) < 0.00001);
  assert.ok(militantScores.every((option) => option.probability > 0 && option.probability < 1));
  assert.ok(militantScores.find((option) => option.id === "war").probability > cooperativeScores.find((option) => option.id === "war").probability);
  assert.deepEqual(chooseProbabilisticDecision(militant, options, config), chooseProbabilisticDecision(militant, options, config));
});

test("世界状態は国家ごとの持続する統治者を持ち、月次経験と人口を保存更新する", () => {
  const runtime = runtimeFixture();
  const source = createRaceDecisionWorldState(runtime, null, { year: 300, month: 1 });
  const nation = runtime.nations.nations[0];
  const raceId = nation.peopleId;
  const profile = deriveNationDecisionProfile(runtime, source, nation.id);
  assert.equal(profile.raceId, raceId);
  assert.ok(profile.leader.id.includes(nation.id));
  const advanced = advanceRaceDecisionWorld(runtime, source, { year: 300, month: 2 }, {
    geopolitics: {
      nationStates: Object.fromEntries(runtime.nations.nations.map((entry) => [entry.id, { foodSecurity: 70, reserves: 70 }])),
      relations: {},
      events: [{ id: "trade", period: "300-2", nationId: nation.id, pullId: "open_trade" }],
    },
    beforeWorldWars: { activeWars: [], completedWars: [] },
    worldWars: { activeWars: [], completedWars: [] },
    resistance: { occupations: [] },
  });
  assert.equal(advanced.lastAdvancedPeriod, "300-2");
  assert.ok(advanced.races[raceId].experience.contact > source.races[raceId].experience.contact);
  assert.ok(advanced.races[raceId].population > source.races[raceId].population);
  assert.equal(advanced.nationProfiles[nation.id].leader.id, source.nationProfiles[nation.id].leader.id);
});

test("世代経過後の統治者は、その時点の種族構成から後継者として再生成される", () => {
  const runtime = runtimeFixture();
  const source = createRaceDecisionWorldState(runtime, null, { year: 300, month: 1 });
  const nation = runtime.nations.nations[0];
  const succeeded = createRaceDecisionWorldState(runtime, source, { year: 340, month: 1 });
  assert.notEqual(succeeded.nationProfiles[nation.id].leader.id, source.nationProfiles[nation.id].leader.id);
  assert.ok(succeeded.nationProfiles[nation.id].leader.generation > source.nationProfiles[nation.id].leader.generation);
  assert.ok(TEMPERAMENT_IDS.includes(succeeded.nationProfiles[nation.id].leader.temperamentId));
});

test("長期支配と迫害は短期気質とは別に、対象種族つき歴史アジェンダを残す", () => {
  const runtime = runtimeFixture();
  const subjectNation = runtime.nations.nations[0];
  const occupierNation = runtime.nations.nations.find((nation) => nation.peopleId !== subjectNation.peopleId);
  assert.ok(occupierNation);
  const source = createRaceDecisionWorldState(runtime, null, { year: 300, month: 1 });
  const advanced = advanceRaceDecisionWorld(runtime, source, { year: 300, month: 2 }, {
    geopolitics: { nationStates: {}, relations: {}, events: [] },
    beforeWorldWars: { activeWars: [], completedWars: [] },
    worldWars: { activeWars: [], completedWars: [] },
    resistance: {
      occupations: [{
        id: "occupation:test",
        status: "active",
        formerNationId: subjectNation.id,
        occupierNationId: occupierNation.id,
        annexedPeriod: "298-1",
        policyId: "security",
        resistance: 80,
        months: 30,
      }],
    },
  });
  const agendas = advanced.races[subjectNation.peopleId].historicalAgendas;
  assert.ok(agendas.some((agenda) => agenda.type === "foreign_domination"));
  assert.ok(agendas.some((agenda) => agenda.type === "persecution_memory" && agenda.targetRaceId === occupierNation.peopleId));
});

test("3世界200年の社会ストレス後も人口・4気質・3投影は有限かつ整合する", () => {
  const eventTypes = ["peace", "contact", "prosperity", "persecution", "war_victory", "war_defeat", "domination"];
  for (const seed of ["balance-a", "balance-b", "balance-c"]) {
    const options = { seed, width: 24, height: 16, plateCount: 4, nationCount: 3 };
    const runtime = buildGeneratedWorld(createGeneratedWorldState(options));
    const world = createRaceDecisionWorldState(runtime, null, { year: 100, month: 1 });
    const raceId = Object.keys(world.races)[0];
    let raceState = world.races[raceId];
    for (let month = 0; month < 200 * 12; month += 1) {
      const type = eventTypes[Math.floor(month / 24) % eventTypes.length];
      raceState = applyRaceSocialEvent(raceState, {
        type,
        intensity: type === "peace" ? 1.2 : 6,
        casualties: month % 60 === 59 ? raceState.population * 0.0004 : 0,
        period: `${100 + Math.floor(month / 12)}-${month % 12 + 1}`,
        seed,
      });
    }
    world.races[raceId] = raceState;
    const report = analyzeRaceDecisionBalance(world).races.find((entry) => entry.raceId === raceId);
    assert.ok(Number.isFinite(report.population) && report.population > 0);
    assert.ok(report.minimumTemperamentShare > 0.02);
    assert.ok(report.maximumTemperamentShare < 0.9);
    assert.ok(report.maximumProjectionError < 0.02);
  }
});
