import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_POLITY_MODEL_REFERENCES,
  deriveNationPolity,
  derivePolityForForm,
  deriveSettlementFunctions,
  formatSettlementName,
  regionalOfficeTitle,
} from "../src/world-polity-system.js";

test("nation polity keeps state form, political system, ruler, and capital terminology separate", () => {
  const kingdom = deriveNationPolity({
    peopleId: "human",
    nationLevel: 3,
    stats: { meanFertility: 64, flatShare: 0.6 },
  });
  assert.equal(kingdom.formId, "kingdom");
  assert.equal(kingdom.formName, "王国");
  assert.equal(kingdom.politicalSystemName, "封建君主制");
  assert.equal(kingdom.rulerTitle, "国王");
  assert.equal(kingdom.capitalTitle, "王都");
  assert.equal(regionalOfficeTitle(kingdom, { capital: true }), "王都総督");
  assert.equal(regionalOfficeTitle(kingdom, { frontier: true }), "辺境伯");

  const republic = deriveNationPolity({
    peopleId: "human",
    nationLevel: 2,
    stats: { meanFreshwater: 0.64 },
  });
  assert.equal(republic.formId, "republic");
  assert.equal(republic.politicalSystemName, "代議共和制");
  assert.equal(republic.rulerTitle, "執政官");
  assert.equal(regionalOfficeTitle(republic, { frontier: true }), "国境監督官");

  const imperial = deriveNationPolity({ peopleId: "human", nationLevel: 6 });
  assert.equal(imperial.formId, "empire");
  assert.equal(imperial.capitalTitle, "帝都");
  assert.equal(imperial.rulerTitle, "皇帝");
  assert.equal(WORLD_POLITY_MODEL_REFERENCES[0].url, "https://ncode.syosetu.com/n5709da/46/");
});

test("cultural governments retain their established names while using a coherent underlying form", () => {
  const dwarf = deriveNationPolity({ peopleId: "dwarf" });
  const elf = deriveNationPolity({ peopleId: "elf" });
  const goblin = deriveNationPolity({ peopleId: "goblin" });
  assert.equal(dwarf.governmentName, "坑道都市連邦");
  assert.equal(dwarf.formId, "federation");
  assert.equal(elf.governmentName, "森王庭連合");
  assert.equal(elf.politicalSystemName, "選挙君主制");
  assert.equal(goblin.governmentName, "工房集落評議会");
  assert.equal(goblin.politicalSystemName, "寡頭共和制");
});

test("every player-selectable government form maps to the shared polity model", () => {
  const formIds = [
    "empire", "republic", "city_state", "theocracy", "nomadic_state",
    "tribal_confederation", "military_regime", "magocracy", "maritime_state", "federation",
  ];
  for (const formId of formIds) {
    const polity = derivePolityForForm(formId, { rulerTitle: "選択した元首称号" });
    assert.equal(polity.formId, formId);
    assert.equal(polity.rulerTitle, "選択した元首称号");
    assert.ok(polity.politicalSystemId && polity.capitalTitle && polity.seatLabel);
  }
  const coastalCityState = deriveNationPolity({
    peopleId: "human",
    nationLevel: 2,
    stats: { coastalShare: 0.6, commercePerTile: 0.9 },
  });
  assert.equal(coastalCityState.formId, "city_state");
  assert.equal(coastalCityState.formName, "都市国家");
});

test("settlement functions are derived from capital status, geography, roads, and government", () => {
  const polity = deriveNationPolity({
    peopleId: "human",
    stats: { coastalShare: 0.5, commercePerTile: 0.8 },
  });
  const object = {
    id: "capital-port",
    type: "bay_city",
    settlementLevel: "city",
    capitalCity: true,
    regionSeat: true,
    frontierSettlement: true,
    tileIndex: 12,
  };
  const result = deriveSettlementFunctions({
    object,
    nation: { polity },
    region: { frontier: true, officeTitle: "関門監督官" },
    tile: {
      relief: "flat",
      terrain: "plains",
      freshwater: 0.5,
      defense: 0.5,
      yields: { food: 1.4, production: 1.8, commerce: 1.1 },
      resourcePotential: { mineral: 0.2, timber: 0.2 },
    },
    roads: [{ fromObjectId: object.id, toObjectId: "other", tileIndices: [12, 13] }],
  });
  assert.deepEqual(result.functionIds, ["capital", "port_city", "border_town"]);
  assert.equal(result.primaryFunction.name, "首都");
  assert.ok(result.services.includes("government"));
  assert.ok(result.services.includes("shipping"));
  assert.ok(result.services.includes("customs"));
  assert.ok(result.gameplay.merchantBias > 0);
});

test("settlement names preserve an explicit capital title across population levels", () => {
  assert.equal(formatSettlementName("アルディア白峰", "city"), "アルディア白峰");
  assert.equal(formatSettlementName("アルディア白峰", "town"), "アルディア白峰の町");
  assert.equal(formatSettlementName("アルディア白峰", "village"), "アルディア白峰村");
  assert.equal(formatSettlementName("アルディア", "city", { capitalCity: true, capitalTitle: "帝都" }), "帝都アルディア");
});
