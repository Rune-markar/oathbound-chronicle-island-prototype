import test from "node:test";
import assert from "node:assert/strict";
import { getTacticalPeopleDefinition } from "../src/race-list.js";
import {
  RACE_WORLD_EFFECT_DEFINITIONS,
  RACE_WORLD_EFFECT_RULES,
  evaluateRaceWorldEffects,
  getRaceWorldEffectResponseRules,
} from "../src/race-world-effect-system.js";

test("種族正本はワールドエフェクト用の生態タグを戦術契約へ公開する", () => {
  assert.ok(getTacticalPeopleDefinition("yokai").worldEffectTags.includes("NIGHT_FOG_AFFINITY"));
  assert.ok(getTacticalPeopleDefinition("demon").worldEffectTags.includes("LUNAR_DEMON"));
  assert.ok(getTacticalPeopleDefinition("water_spirit").worldEffectTags.includes("WATER_BODY"));
  assert.ok(getTacticalPeopleDefinition("spirit").worldEffectTags.includes("ETHEREAL_BODY"));
});

test("現行8気象は共通戦闘補正と少なくとも一つの種族応答規則を持つ", () => {
  for (const effectId of ["rain", "storm", "snow", "blizzard", "sandstorm", "heatwave", "fog", "ashfall"]) {
    assert.ok(Object.keys(RACE_WORLD_EFFECT_DEFINITIONS[effectId].baseline).length > 0, `${effectId} baseline`);
    assert.ok(getRaceWorldEffectResponseRules(effectId).length > 0, `${effectId} race rules`);
  }
  assert.equal(new Set(RACE_WORLD_EFFECT_RULES.map((rule) => rule.id)).size, RACE_WORLD_EFFECT_RULES.length);
});

test("雨は水性種を助け火性種を弱め、同じ現象から移動と戦闘の差を返す", () => {
  const water = evaluateRaceWorldEffects("water_spirit", [{ type: "rain", strength: 1 }], { isNight: false });
  const fire = evaluateRaceWorldEffects("fire_spirit", [{ type: "rain", strength: 1 }], { isNight: false });
  assert.ok(water.modifiers.travelPenaltyMultiplier < 1);
  assert.ok(water.modifiers.defense > 1);
  assert.ok(fire.modifiers.travelPenaltyMultiplier > 1);
  assert.ok(fire.modifiers.attack < 1);
  assert.ok(fire.modifiers.magicPower < 1);
});

test("濃霧は夜だけ妖魔を強化し、満月は魔族系だけを強化する", () => {
  const dayFog = evaluateRaceWorldEffects("yokai", ["fog"], { isNight: false });
  const nightFog = evaluateRaceWorldEffects("yokai", ["fog"], { isNight: true });
  assert.equal(dayFog.responses.some((entry) => entry.ruleId === "fog-night-yokai"), false);
  assert.equal(nightFog.responses.some((entry) => entry.ruleId === "fog-night-yokai"), true);
  assert.ok(nightFog.modifiers.magicPower > dayFog.modifiers.magicPower);

  const demon = evaluateRaceWorldEffects("demon", ["full_moon"], { isNight: true });
  const fairy = evaluateRaceWorldEffects("fairy", ["full_moon"], { isNight: true });
  assert.ok(demon.modifiers.magicPower > 1);
  assert.equal(fairy.modifiers.magicPower, 1);
});

test("新月は霊体を実体化し、通常種族には出現許可を与えない", () => {
  const spirit = evaluateRaceWorldEffects("spirit", ["new_moon"], { isNight: true });
  const human = evaluateRaceWorldEffects("human", ["new_moon"], { isNight: true });
  assert.equal(spirit.manifestation, true);
  assert.ok(spirit.modifiers.attack > 1);
  assert.ok(spirit.modifiers.defense < 1);
  assert.equal(human.manifestation, false);
});
