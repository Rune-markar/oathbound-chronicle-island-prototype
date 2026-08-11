import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createCharacterCodexSections, resolveCharacterScene } from "../src/character-template.js";
import {
  COMMANDS,
  LISETTE_VALENNE_ID,
  UNIQUE_CHARACTERS,
  WORLD,
  adoptDoctrine,
  commitMonth,
  createInitialState,
  getOfficerPoliticalReport,
  normalizeWarState,
  queueOrder,
} from "../src/simulation.js";

test("リゼットは汎用テンプレートと分離したユニークキャラクターとして登録される", () => {
  assert.ok(Object.keys(UNIQUE_CHARACTERS).includes(LISETTE_VALENNE_ID));
  const lisette = UNIQUE_CHARACTERS[LISETTE_VALENNE_ID];
  assert.equal(WORLD.characters[LISETTE_VALENNE_ID], lisette);
  assert.equal(lisette.metadata.characterKind, "unique");
  assert.equal(lisette.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(lisette.gameplay.recruitable, true);
  assert.equal(lisette.gameplay.commander, false);
  assert.ok(lisette.capabilities.stats.politics > lisette.capabilities.stats.war);
  assert.ok(existsSync(new URL(`../${lisette.portraitImage}`, import.meta.url)));

  const metadata = createCharacterCodexSections(lisette, {})
    .find((section) => section.id === "metadata").fields;
  assert.equal(metadata.find((field) => field.path === "metadata.characterKind").value, "ユニークキャラクター");
  assert.equal(resolveCharacterScene(lisette, "battle.defeat.retreat").id, "lisette-defeat-retreat");
});

test("旧セーブを正規化してもリゼット固有の状態・信条・政治プロフィールが追加される", () => {
  const oldState = createInitialState();
  delete oldState.officers[LISETTE_VALENNE_ID];
  const migrated = normalizeWarState(structuredClone(oldState));
  assert.equal(migrated.officers[LISETTE_VALENNE_ID].rank, "伯爵令嬢");
  assert.equal(migrated.officers[LISETTE_VALENNE_ID].allegiance, "free");
  assert.equal(Object.keys(migrated.officers[LISETTE_VALENNE_ID].creed.axes).length, 7);
  assert.equal(getOfficerPoliticalReport(migrated, LISETTE_VALENNE_ID).faction, "諸侯協約派");
});

test("宮廷協約を完了するとリゼットが実務担当として登用される", () => {
  let state = adoptDoctrine(createInitialState(), "balanced");
  const legitimacy = state.legitimacy;
  const landownerSupport = state.cities.selene.factions.landowners.support;
  assert.equal(COMMANDS["court.recruit_lisette"].targetOfficerId, LISETTE_VALENNE_ID);

  state = queueOrder(state, {
    kind: "command",
    commandId: "court.recruit_lisette",
    officerId: "edras",
    cityId: "selene",
  });
  state = commitMonth(state);

  assert.equal(state.officers[LISETTE_VALENNE_ID].allegiance, "serving");
  assert.equal(state.officers[LISETTE_VALENNE_ID].rank, "宮廷折衝人");
  assert.equal(state.officers[LISETTE_VALENNE_ID].rankLevel, 3);
  assert.ok(state.officers[LISETTE_VALENNE_ID].bonds.edras >= 28);
  assert.equal(state.legitimacy, legitimacy + 1);
  assert.equal(state.cities.selene.factions.landowners.support, landownerSupport + 3);
  assert.ok(state.completedCommands.includes("court.recruit_lisette"));
});
