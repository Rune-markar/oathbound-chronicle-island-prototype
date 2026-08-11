import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getTavernCandidates, normalizeAdventureState } from "../src/adventure-system.js";
import { resolveCharacterScene } from "../src/character-template.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";
import { WORLD, createCareerInitialState } from "../src/simulation.js";
import { MARIELLE_CROIX_ID, UNIQUE_CHARACTERS } from "../src/unique-characters.js";
import { performVillageAction } from "../src/village-life.js";

test("マリエルは汎用受付や同行候補と分離したギルド常駐の固有人物である", () => {
  const receptionist = UNIQUE_CHARACTERS[MARIELLE_CROIX_ID];
  assert.equal(receptionist.name, "マリエル・クロワ");
  assert.equal(receptionist.metadata.characterKind, "unique");
  assert.equal(receptionist.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(receptionist.gameplay.role, "冒険者ギルド主任受付官");
  assert.equal(receptionist.gameplay.recruitable, false);
  assert.equal(receptionist.gameplay.commander, false);
  assert.equal(receptionist.adventure, undefined);
  assert.equal(receptionist.guildService.facilityId, "guild");
  assert.deepEqual(receptionist.guildService.duties, ["依頼受注", "達成報告・報酬精算", "パーティー斡旋"]);
  assert.equal(receptionist.guildService.partyReferral, true);
  assert.match(receptionist.visuals.hair, /金髪/);
  assert.match(receptionist.visuals.faceShape, /角形/);
  assert.match(receptionist.visuals.signatureExpression, /注意深い/);
  assert.equal(WORLD.characters[MARIELLE_CROIX_ID], receptionist);
  assert.equal(Object.hasOwn(createCareerInitialState({ seed: "guild-receptionist-officer-boundary" }).officers, MARIELLE_CROIX_ID), false);
  assert.ok(existsSync(new URL(`../${receptionist.portraitImage}`, import.meta.url)));
  assert.equal(resolveCharacterScene(receptionist, "guild.request.accept").id, "marielle-guild-request-accept");
  assert.equal(resolveCharacterScene(receptionist, "guild.request.report").id, "marielle-guild-request-report");
  assert.equal(resolveCharacterScene(receptionist, "guild.party.referral").id, "marielle-guild-party-referral");
});

test("マリエルは酒場の加入候補へ混ざらず、ギルドから候補者紹介だけを行う", () => {
  const state = normalizeAdventureState(createCareerInitialState({ seed: "guild-receptionist-referral" }));
  const world = getGeneratedWorldView(state);
  const context = { region: world.expeditionRegion, nation: world.playerNation, runtime: world.runtime };
  assert.equal(getTavernCandidates(state, context).some((candidate) => candidate.uniqueCharacterId === MARIELLE_CROIX_ID), false);

  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(appSource, /guild-receptionist-desk/);
  assert.match(appSource, /マリエルの紹介で候補者に会う/);
  assert.match(appSource, /data-village-facility="tavern"/);
  assert.match(appSource, /UNIQUE_CHARACTERS\[MARIELLE_CROIX_ID\]/);
});

test("依頼受注・達成報告・報酬精算の共有処理にマリエルが現れる", () => {
  let state = createCareerInitialState({ seed: "guild-receptionist-request-loop" });
  const town = { id: "marielle-test-town", name: "三封札町", settlementLevel: "town" };

  state = performVillageAction(state, town, "accept_request");
  assert.match(state.player.villageLife.lastAction.message, /マリエル/);
  state = performVillageAction(state, town, "recruit_companion");
  state = performVillageAction(state, town, "complete_request");
  state = performVillageAction(state, town, "report_request");
  assert.match(state.player.villageLife.lastAction.message, /受付官マリエル/);
  state = performVillageAction(state, town, "receive_reward");
  assert.match(state.player.villageLife.lastAction.message, /受付官マリエル/);
  assert.equal(state.player.villageLife.quests[0].status, "rewarded");
});

test("固有人物の生成ルールは作風固定と顔設計を別々に要求する", () => {
  const rules = readFileSync(new URL("../CHARACTER_ART_GENERATION_RULES.md", import.meta.url), "utf8");
  assert.match(rules, /作風を先に固定する/);
  assert.match(rules, /写実化.*多様性として数えない/);
  assert.match(rules, /faceShape/);
  assert.match(rules, /facialFeatures/);
  assert.match(rules, /最低三軸/);
});
