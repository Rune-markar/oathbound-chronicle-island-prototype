import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedWorld, createGeneratedWorldState } from "../src/generated-world-system.js";
import {
  advanceRaceDecisionWorld,
  applyRaceSocialEvent,
  chooseProbabilisticDecision,
  createIndividualDecisionProfile,
  createRaceDecisionWorldState,
  createRaceState,
  deriveNationDecisionProfile,
  deriveRaceRepresentativeTraits,
  deriveSeededRaceBaseTraits,
  getRepresentativeTemperament,
  getTemperamentShares,
  scoreDecisionOptions,
  TEMPERAMENT_IDS,
} from "../src/race-decision-system.js";

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
