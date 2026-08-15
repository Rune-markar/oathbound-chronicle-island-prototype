import {
  CRIME_OUTCOMES,
  normalizeCrimeState,
  recordCrimeIncident,
  resolveAccompliceDecision,
  resolveCrimeSentence,
} from "./crime-system.js";
import { buildGeneratedWorld } from "./generated-world-system.js";
import { createRegionalDomainState, vacateRegionalOffice } from "./regional-domain-system.js";
import { recordCriminalHistoricalEvent } from "./history-model.js";
import { UNIQUE_CHARACTERS } from "./unique-characters.js";

const CANONICAL_PROTECTED_CHARACTER_IDS = new Set(Object.entries(UNIQUE_CHARACTERS).flatMap(([key, character]) => [
  key,
  character.id,
  character.adventure?.memberId,
]).filter(Boolean));

function activeCompanion(state, companionId) {
  if (!companionId) return null;
  const member = state.player?.villageLife?.party?.find((entry) => entry.id === companionId)
    ?? state.adventure?.party?.find((entry) => entry.id === companionId);
  if (!member || member.active === false || member.alive === false) throw new Error("選択した同行者は暗殺計画に参加できません");
  return { id: member.id, name: member.name ?? member.id };
}

function deactivateCompanion(state, companionId) {
  for (const party of [state.player?.villageLife?.party, state.adventure?.party]) {
    const member = party?.find((entry) => entry.id === companionId);
    if (member) {
      member.active = false;
      member.leftCrimeOperation = true;
    }
  }
}

function protectedCharacter(character) {
  const metadata = character.metadata ?? {};
  return CANONICAL_PROTECTED_CHARACTER_IDS.has(character.id)
    || character.unique === true
    || character.characterKind === "unique"
    || metadata.characterKind === "unique"
    || character.story === true
    || character.storyProtected === true
    || metadata.story === true
    || metadata.storyProtected === true
    || character.protected === true
    || metadata.protected === true
    || character.targetable !== true
    || character.alive === false
    || character.available === false;
}

function isDomesticSovereign(state, target) {
  if (!state.player?.sovereign) return false;
  const runtime = buildGeneratedWorld(state);
  const domains = createRegionalDomainState(runtime, state.generatedWorld?.regionalDomains, state);
  const jurisdictionNationId = domains.regionStates[target.regionId]?.nationId;
  return Boolean(jurisdictionNationId && state.generatedWorld?.playerNationId === jurisdictionNationId);
}

export function getAssassinationTargets(state, context = {}) {
  const normalized = normalizeCrimeState(state);
  const runtime = buildGeneratedWorld(normalized);
  const domains = createRegionalDomainState(runtime, normalized.generatedWorld?.regionalDomains, normalized);
  const regionById = new Map(runtime.nations.regions.map((region) => [region.id, region]));
  const characterStates = normalized.generatedWorld?.characterStates ?? {};
  const officesByLordId = new Map();
  Object.entries(domains.regionStates).forEach(([regionId, office]) => {
    if (!office.lordId) return;
    if (!officesByLordId.has(office.lordId)) officesByLordId.set(office.lordId, []);
    officesByLordId.get(office.lordId).push({ regionId, office });
  });
  const characters = (normalized.generatedWorld?.characters ?? [])
    .filter((character) => character.generated === true && !protectedCharacter(character) && characterStates[character.id]?.alive !== false && !officesByLordId.has(character.id))
    .map((character) => ({
      id: `character:${character.id}`,
      type: "assassination",
      kind: "generated_character",
      characterId: character.id,
      name: character.name,
      regionId: character.regionId,
      jurisdictionId: character.regionId,
      nationId: domains.regionStates?.[character.regionId]?.nationId ?? character.nationId ?? null,
      officeRegionIds: [],
      riskLabel: "極高",
      preparationRequirements: ["行動時刻を調べる", "離脱経路を確保する"],
      maximumPenalty: "拘束、死刑を含む大逆罪の処罰",
    }));
  const lords = [...officesByLordId.entries()].flatMap(([lordId, officeEntries]) => {
    if (lordId === normalized.player?.id || CANONICAL_PROTECTED_CHARACTER_IDS.has(lordId) || characterStates[lordId]?.alive === false) return [];
    const character = (normalized.generatedWorld?.characters ?? []).find((entry) => entry.id === lordId);
    if (character && protectedCharacter(character)) return [];
    const sortedEntries = [...officeEntries].sort((left, right) => left.regionId.localeCompare(right.regionId));
    const contextualEntry = context.regionId
      ? sortedEntries.find((entry) => entry.regionId === context.regionId)
      : sortedEntries[0];
    if (!contextualEntry) return [];
    const { regionId, office } = contextualEntry;
    const region = regionById.get(regionId);
    return [{
      id: `lord:${regionId}:${lordId}`,
      type: "assassination",
      kind: "regional_lord",
      characterId: lordId,
      name: character?.name ?? office.lordName ?? lordId,
      regionId,
      jurisdictionId: regionId,
      nationId: office.nationId ?? region?.nationId ?? null,
      officeRegionIds: sortedEntries.map((entry) => entry.regionId),
      officeTitle: office.officeTitle,
      riskLabel: "極高",
      preparationRequirements: ["領主の公務日程を調べる", "離脱経路を確保する"],
      maximumPenalty: "拘束、死刑を含む大逆罪の処罰",
    }];
  });
  return [...characters, ...lords]
    .filter((target) => target.regionId && (!context.regionId || target.regionId === context.regionId))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function startAssassination(state, target, options = {}) {
  const next = normalizeCrimeState(state);
  if (next.player.crime.activeAssassination) throw new Error("進行中の暗殺計画があります");
  const current = getAssassinationTargets(next, { regionId: target?.regionId }).find((entry) => entry.id === target?.id);
  if (!current) throw new Error("実在し、明示的に対象化できる人物が必要です");
  const companion = activeCompanion(next, options.accompliceId);
  next.player.crime.activeAssassination = {
    id: `assassination-operation:${current.id}:${next.turn ?? 0}`,
    incidentId: `assassination:${next.turn ?? 0}:${next.player.crime.incidents.length + 1}:${current.characterId}`,
    stage: "started",
    target: structuredClone(current),
    selectedAccomplice: companion,
    accomplices: [],
    plotExposed: false,
    startedTurn: next.turn ?? 0,
  };
  return next;
}

export function prepareAssassination(state, options = {}) {
  let next = normalizeCrimeState(state);
  let active = next.player.crime.activeAssassination;
  if (!active || active.stage !== "started") throw new Error("開始済みの暗殺計画がありません");
  if (active.selectedAccomplice) {
    const decision = options.decision ?? "accept";
    next = resolveAccompliceDecision(next, {
      accompliceId: active.selectedAccomplice.id,
      accompliceName: active.selectedAccomplice.name,
      incidentId: active.incidentId,
      jurisdictionId: active.target.jurisdictionId,
      decision,
    });
    active = next.player.crime.activeAssassination;
    if (decision === "accept") active.accomplices = [structuredClone(active.selectedAccomplice)];
    if (decision === "report") {
      active.plotExposed = true;
      deactivateCompanion(next, active.selectedAccomplice.id);
    }
  } else if (options.decision) {
    throw new Error("判断する同行者が選択されていません");
  }
  active.stage = "prepared";
  active.preparedTurn = next.turn ?? 0;
  return next;
}

function markTargetDead(state, target) {
  state.generatedWorld.characterStates ??= {};
  state.generatedWorld.characterStates[target.characterId] = {
    ...(state.generatedWorld.characterStates[target.characterId] ?? {}),
    alive: false,
    available: false,
    deathTurn: state.turn ?? 0,
    cause: "assassination",
  };
  const character = (state.generatedWorld.characters ?? []).find((entry) => entry.id === target.characterId);
  if (character) {
    character.alive = false;
    character.available = false;
    character.deathTurn = state.turn ?? 0;
  }
  const runtime = buildGeneratedWorld(state);
  const domains = createRegionalDomainState(runtime, state.generatedWorld.regionalDomains, state);
  const actualOfficeRegionIds = Object.entries(domains.regionStates)
    .filter(([, office]) => office.lordId === target.characterId)
    .map(([regionId]) => regionId);
  state.generatedWorld.regionalDomains = domains;
  for (const regionId of actualOfficeRegionIds) {
    state.generatedWorld.regionalDomains = vacateRegionalOffice(runtime, state.generatedWorld.regionalDomains, regionId, target.characterId, state);
  }
  return actualOfficeRegionIds;
}

export function executeAssassination(state, options = {}) {
  const normalized = normalizeCrimeState(state);
  const active = normalized.player.crime.activeAssassination;
  if (!active || active.stage !== "prepared") throw new Error("準備済みの暗殺計画がありません");
  let outcome = options.outcome ?? "success_hidden";
  if (!CRIME_OUTCOMES.includes(outcome)) throw new RangeError("暗殺の結果が不正です");
  if (active.plotExposed && outcome === "success_hidden") outcome = "success_exposed";
  const successful = outcome === "success_hidden" || outcome === "success_exposed";
  const detected = Boolean(options.detected) || active.plotExposed || outcome === "success_exposed" || outcome === "captured";
  const domesticSovereign = isDomesticSovereign(normalized, active.target);
  let next = normalized;
  const vacatedOfficeRegionIds = successful ? markTargetDead(next, active.target) : [];
  next = recordCrimeIncident(next, {
    id: active.incidentId,
    type: "assassination",
    severity: "capital",
    perpetrator: { id: next.player.id ?? "player", name: next.player.name ?? "主人公" },
    accomplices: active.accomplices,
    victim: active.target,
    target: active.target,
    jurisdiction: { id: active.target.jurisdictionId, name: active.target.regionId },
    outcome,
    detected: detected && !domesticSovereign,
    historyText: `${active.target.name}への暗殺${successful ? "が実行された" : "に失敗した"}。`,
  });
  if (detected && domesticSovereign) {
    next = resolveCrimeSentence(next, { incidentId: active.incidentId, jurisdictionId: active.target.jurisdictionId, crimeType: "assassination", severity: "capital", domestic: true });
  } else if (outcome === "captured") {
    next = resolveCrimeSentence(next, { incidentId: active.incidentId, jurisdictionId: active.target.jurisdictionId, crimeType: "assassination", severity: "capital", domestic: false });
  }
  if (detected) {
    const abuse = domesticSovereign ? next.player.crime.abuses[0] : null;
    const destroyedId = vacatedOfficeRegionIds.length
      ? `regional-office-holder:${active.target.regionId}:${active.target.characterId}`
      : `generated-character:${active.target.characterId}`;
    next = recordCriminalHistoricalEvent(next, {
      id: `history-${active.incidentId}`,
      type: "criminal_assassination",
      severity: "capital",
      title: `${active.target.name}暗殺事件`,
      summary: `${active.target.name}への暗殺が露見した。`,
      nationId: active.target.nationId,
      regionId: active.target.regionId,
      causedBy: [active.incidentId],
      effects: [successful ? `political-vacancy:${active.target.characterId}` : `assassination-attempt:${active.incidentId}`],
      destroyed: successful ? [destroyedId] : [],
      bindings: [
        { type: "crime_incident", id: active.incidentId },
        ...(vacatedOfficeRegionIds.map((regionId) => ({ type: "regional_office_vacancy", regionId }))),
        ...(successful && (next.generatedWorld.characters ?? []).some((character) => character.id === active.target.characterId) ? [{ type: "generated_character", characterId: active.target.characterId }] : []),
        ...(abuse ? [{ type: "crime_abuse", id: abuse.id }] : []),
      ],
    });
  }
  next.player.crime.assassinationRecords.unshift({ incidentId: active.incidentId, targetId: active.target.id, characterId: active.target.characterId, outcome, detected, domesticSovereign, turn: next.turn ?? 0 });
  next.player.crime.activeAssassination = null;
  return { state: next, result: { incidentId: active.incidentId, targetId: active.target.id, outcome, detected, domesticSovereign, targetKilled: successful } };
}
