import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  explorePersonalMap,
  getDungeonTacticalRoster,
  getPersonalMapView,
  getTavernCandidates,
  interactWithNpcCandidate,
  inviteTavernCandidate,
  normalizeAdventureState,
} from "../src/adventure-system.js";
import { getGeneratedWorldView } from "../src/generated-world-system.js";
import { WORLD, createCareerInitialState } from "../src/simulation.js";
import { UNIQUE_CHARACTERS, UNIQUE_COMPANION_ID } from "../src/unique-characters.js";

function fixture(seed = "unique-character-test") {
  const state = normalizeAdventureState(createCareerInitialState({ seed }));
  const world = getGeneratedWorldView(state);
  const context = { region: world.expeditionRegion, nation: world.playerNation, runtime: world.runtime };
  return { state, context };
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

test("the scholar is a complete unique definition rather than a generated or officer character", () => {
  const scholar = UNIQUE_CHARACTERS.erne_vardis;
  assert.equal(scholar.name, "エルネ・ヴァルディス");
  assert.equal(scholar.metadata.characterKind, "unique");
  assert.equal(scholar.metadata.source, "UNIQUE_CHARACTERS");
  assert.equal(scholar.gameplay.role, "辺境碑文学者");
  assert.equal(scholar.stats.intelligence, 91);
  assert.equal(scholar.adventure.memberId, UNIQUE_COMPANION_ID);
  assert.equal(WORLD.characters[scholar.id].metadata.characterKind, "unique");
  assert.equal(statefulOfficerIds().includes(scholar.id), false, "the scholar must not start as a stateful officer");
  assert.ok(existsSync(new URL(`../${scholar.portraitImage}`, import.meta.url)), "the unique portrait must ship with the game");
});

function statefulOfficerIds() {
  return Object.keys(createCareerInitialState({ seed: "unique-officer-boundary" }).officers);
}

test("the tavern lists the fixed scholar in a separate candidate class and recruits her only once", () => {
  const { state, context } = fixture("unique-tavern-test");
  const candidates = getTavernCandidates(state, context);
  const genericCandidates = candidates.filter((candidate) => !candidate.unique);
  const scholar = candidates.find((candidate) => candidate.uniqueCharacterId === "erne_vardis");
  assert.equal(genericCandidates.length, 4);
  assert.ok(genericCandidates.every((candidate) => candidate.id.startsWith(`party:${context.region.id}:`)));
  assert.equal(scholar.id, UNIQUE_COMPANION_ID);
  assert.equal(scholar.unique, true);
  assert.equal(scholar.incoming, false);
  assert.match(scholar.passiveDescription, /30%から45%/);

  const recruited = inviteTavernCandidate(impress(state, scholar.id, context), scholar.id, context);
  assert.equal(recruited.adventure.party[0].source, "unique-recruit");
  assert.equal(recruited.player.villageLife.party[0].uniqueCharacterId, "erne_vardis");
  assert.equal(getTavernCandidates(recruited, context).find((candidate) => candidate.id === scholar.id).joined, true);
  assert.throws(() => inviteTavernCandidate(recruited, scholar.id, context), /すでにパーティー/);

  const rosterEntry = getDungeonTacticalRoster(recruited).find((entry) => entry.id === scholar.id);
  assert.equal(rosterEntry.portraitImage, UNIQUE_CHARACTERS.erne_vardis.portraitImage);
  assert.equal(rosterEntry.stats.intelligence, 91);
  assert.match(rosterEntry.rank, /固有人物/);
});

test("epigraphic insight changes the shared exploration API, not only its label", () => {
  const { state, context } = fixture("unique-exploration-test");
  const ordinary = explorePersonalMap(state, context, { roll: 0.4 });
  assert.equal(getPersonalMapView(ordinary, context).lastResult.type, "nothing");

  const scholar = getTavernCandidates(state, context).find((candidate) => candidate.uniqueCharacterId === "erne_vardis");
  const recruited = inviteTavernCandidate(impress(state, scholar.id, context), scholar.id, context);
  const assisted = explorePersonalMap(recruited, context, { roll: 0.4 });
  const result = getPersonalMapView(assisted, context).lastResult;
  assert.equal(result.type, "location");
  assert.equal(result.assistedBy, "erne_vardis");
  assert.equal(result.assistName, "碑文照合");
  assert.match(result.message, /エルネ・ヴァルディス/);
});

test("the UI gives unique companions a dedicated portrait card and conversation route", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(app, /class="tavern-unique-companion"/);
  assert.match(app, /UNIQUE CHARACTER/);
  assert.match(app, /candidate\.portraitImage/);
  assert.match(app, /candidate\.recruitmentLine/);
  assert.match(css, /\.tavern-unique-companion/);
  assert.match(css, /article\.is-unique/);
});
