import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  getRegionAdventureSites,
  getTavernCandidates,
  interactWithNpcCandidate,
  inviteTavernCandidate,
  normalizeAdventureState,
} from "../src/adventure-system.js";
import { createCharacterCodexSections, resolveCharacterScene } from "../src/character-template.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";
import { WORLD, createCareerInitialState } from "../src/simulation.js";
import {
  KATIA_COMPANION_ID,
  KATIA_KANDEL_ID,
  UNIQUE_CHARACTERS,
} from "../src/unique-characters.js";
import { getVillageActionAvailability, performVillageAction } from "../src/village-life.js";

function fixture(seed = "unique-merchant-test") {
  const state = normalizeAdventureState(createCareerInitialState({ seed }));
  const world = getGeneratedWorldView(state);
  const context = { region: world.expeditionRegion, nation: world.playerNation, runtime: world.runtime };
  return { state, context, sites: getRegionAdventureSites(state, context) };
}

function impress(state, candidateId, context) {
  let next = interactWithNpcCandidate(state, candidateId, "gentle", context, { roll: 0 });
  next = interactWithNpcCandidate(next, candidateId, "small_talk", context, { roll: 0 });
  next.adventure.npcRelations[candidateId].affinity = 60;
  next.player.metrics.wealth = 50;
  next.player.metrics.renown = 50;
  next.player.progress.contracts = 2;
  return interactWithNpcCandidate(next, candidateId, "discuss_work", context);
}

test("カティアは汎用商人と分離した完全なユニーク商人として登録される", () => {
  const merchant = UNIQUE_CHARACTERS[KATIA_KANDEL_ID];
  assert.equal(merchant.name, "カティア・カンデル");
  assert.equal(merchant.metadata.characterKind, "unique");
  assert.equal(merchant.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(merchant.gameplay.role, "巡回帳合商人");
  assert.equal(merchant.stats.charisma, 89);
  assert.equal(merchant.adventure.memberId, KATIA_COMPANION_ID);
  assert.equal(merchant.adventure.passiveId, "road_market_ledger");
  assert.equal(WORLD.characters[KATIA_KANDEL_ID], merchant);
  assert.equal(Object.hasOwn(createCareerInitialState({ seed: "unique-merchant-officer-boundary" }).officers, KATIA_KANDEL_ID), false);
  assert.ok(existsSync(new URL(`../${merchant.portraitImage}`, import.meta.url)));

  const metadata = createCharacterCodexSections(merchant, {})
    .find((section) => section.id === "metadata").fields;
  assert.equal(metadata.find((field) => field.path === "metadata.characterKind").value, "ユニークキャラクター");
  assert.equal(resolveCharacterScene(merchant, "commerce.negotiation").id, "katia-road-ledger-negotiation");
});

test("酒場でカティアを一度だけ登用し、街道相場帳を同行能力として保持する", () => {
  const { state, context } = fixture("unique-merchant-tavern-test");
  const candidates = getTavernCandidates(state, context);
  const merchant = candidates.find((candidate) => candidate.uniqueCharacterId === KATIA_KANDEL_ID);
  assert.equal(candidates.filter((candidate) => !candidate.unique).length, 4);
  assert.equal(merchant.id, KATIA_COMPANION_ID);
  assert.equal(merchant.role, "商人");
  assert.equal(merchant.unique, true);
  assert.equal(merchant.transparent, true);
  assert.match(merchant.passiveDescription, /購入費を12%/);

  const recruited = inviteTavernCandidate(impress(state, merchant.id, context), merchant.id, context);
  const partyMember = recruited.player.villageLife.party.find((member) => member.id === KATIA_COMPANION_ID);
  assert.equal(partyMember.uniqueCharacterId, KATIA_KANDEL_ID);
  assert.equal(partyMember.passiveId, "road_market_ledger");
  assert.equal(partyMember.transparent, true);
  assert.throws(() => inviteTavernCandidate(recruited, merchant.id, context), /すでにパーティー/);
});

test("街道相場帳は共有商取引APIの購入費と売却益へ実際に反映される", () => {
  const { state, context } = fixture("unique-merchant-commerce-test");
  const place = { id: "road-market", name: "街道市場", settlementLevel: "village" };
  const ordinary = getVillageActionAvailability(state, "buy_food", place);
  assert.equal(ordinary.cost, 1);
  assert.equal(ordinary.companionDiscountRate, 0);

  const candidate = getTavernCandidates(state, context).find((entry) => entry.uniqueCharacterId === KATIA_KANDEL_ID);
  let recruited = inviteTavernCandidate(impress(state, candidate.id, context), candidate.id, context);
  let access = getVillageActionAvailability(recruited, "buy_food", place);
  assert.equal(access.companionDiscountRate, 0.12);
  assert.equal(access.discountRate, 0.12);
  assert.equal(access.cost, 0.9);

  recruited.player.villageLife.guildMerit = 30;
  access = getVillageActionAvailability(recruited, "buy_food", place);
  assert.equal(access.standingDiscountRate, 0.1);
  assert.equal(access.discountRate, 0.22);
  assert.equal(access.cost, 0.8);
  const wealth = recruited.player.metrics.wealth;
  recruited = performVillageAction(recruited, place, "buy_food");
  assert.equal(recruited.player.metrics.wealth, wealth - 0.8);
  assert.match(recruited.player.villageLife.lastAction.message, /街道相場帳/);

  recruited.player.villageLife.inventory = [{ id: "merchant-test-item", name: "試験用の荷", category: "item", quantity: 1 }];
  const beforeSale = recruited.player.metrics.wealth;
  const sold = performVillageAction(recruited, place, "sell_item");
  assert.equal(sold.player.metrics.wealth, beforeSale + 1.2);
  assert.match(sold.player.villageLife.lastAction.message, /財産を1\.2得た/);
  assert.match(sold.player.villageLife.lastAction.message, /カティア/);
});
