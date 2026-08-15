import {
  CRIME_OUTCOMES,
  normalizeCrimeState,
  recordCrimeIncident,
  resolveAccompliceDecision,
  resolveCrimeSentence,
} from "./crime-system.js";
import { buildGeneratedWorld } from "./generated-world-system.js";
import {
  createRegionalDomainState,
  damageRegionalDomainAsset,
  getRegionalDomainAssetTargets,
} from "./regional-domain-system.js";
import { recordCriminalHistoricalEvent } from "./history-model.js";

function activeCompanion(state, companionId) {
  if (!companionId) return null;
  const member = state.player?.villageLife?.party?.find((entry) => entry.id === companionId)
    ?? state.adventure?.party?.find((entry) => entry.id === companionId);
  if (!member || member.active === false || member.alive === false) throw new Error("選択した同行者は破壊工作に参加できません");
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

function isDomesticSovereign(state, target) {
  if (!state.player?.sovereign) return false;
  const runtime = buildGeneratedWorld(state);
  const domains = createRegionalDomainState(runtime, state.generatedWorld?.regionalDomains, state);
  const jurisdictionNationId = domains.regionStates[target.regionId]?.nationId;
  return Boolean(jurisdictionNationId && state.generatedWorld?.playerNationId === jurisdictionNationId);
}

export function getSabotageTargets(state, context = {}) {
  const normalized = normalizeCrimeState(state);
  const runtime = context.runtime ?? buildGeneratedWorld(normalized);
  const domains = createRegionalDomainState(runtime, normalized.generatedWorld?.regionalDomains, normalized);
  const objectById = new Map(runtime.nations.objects.map((object) => [object.id, object]));
  const roadById = new Map((runtime.nations.roads ?? []).map((road) => [road.id, road]));
  return getRegionalDomainAssetTargets(runtime, domains, normalized)
    .map((asset) => {
      const road = asset.kind === "road" ? roadById.get(asset.backingId) : null;
      const object = road ? null : objectById.get(asset.backingId);
      const nationId = domains.regionStates[asset.regionId]?.nationId ?? asset.nationId;
      const endpoints = road ? [objectById.get(road.fromObjectId)?.name, objectById.get(road.toObjectId)?.name].filter(Boolean) : [];
      return {
        id: asset.id,
        type: "sabotage",
        kind: asset.kind,
        backingId: asset.backingId,
        name: object?.name ?? (endpoints.length === 2 ? `${endpoints[0]}―${endpoints[1]}街道` : asset.name),
        regionId: asset.regionId,
        jurisdictionId: asset.regionId,
        nationId,
        condition: asset.condition,
        available: asset.available,
        riskLabel: asset.kind === "road" ? "中" : asset.kind === "facility" ? "高" : "極高",
        preparationRequirements: ["巡回の間隔を調べる", "退路を確保する"],
        maximumPenalty: "拘束、国家資産破壊罪の処罰",
      };
    })
    .filter((target) => !context.regionId || target.regionId === context.regionId)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function startSabotage(state, target, options = {}) {
  const next = normalizeCrimeState(state);
  if (next.player.crime.activeSabotage) throw new Error("進行中の破壊工作があります");
  const current = getSabotageTargets(next).find((entry) => entry.id === target?.id);
  if (!current) throw new Error("実在する破壊工作対象が必要です");
  const companion = activeCompanion(next, options.accompliceId);
  next.player.crime.activeSabotage = {
    id: `sabotage-operation:${current.id}:${next.turn ?? 0}`,
    incidentId: `sabotage:${next.turn ?? 0}:${next.player.crime.incidents.length + 1}:${current.id}`,
    stage: "started",
    target: structuredClone(current),
    selectedAccomplice: companion,
    accomplices: [],
    plotExposed: false,
    startedTurn: next.turn ?? 0,
  };
  return next;
}

export function prepareSabotage(state, options = {}) {
  let next = normalizeCrimeState(state);
  let active = next.player.crime.activeSabotage;
  if (!active || active.stage !== "started") throw new Error("開始済みの破壊工作がありません");
  if (active.selectedAccomplice) {
    const decision = options.decision ?? "accept";
    next = resolveAccompliceDecision(next, {
      accompliceId: active.selectedAccomplice.id,
      accompliceName: active.selectedAccomplice.name,
      incidentId: active.incidentId,
      jurisdictionId: active.target.jurisdictionId,
      decision,
    });
    active = next.player.crime.activeSabotage;
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

export function executeSabotage(state, options = {}) {
  const normalized = normalizeCrimeState(state);
  const active = normalized.player.crime.activeSabotage;
  if (!active || active.stage !== "prepared") throw new Error("準備済みの破壊工作がありません");
  let outcome = options.outcome ?? "success_hidden";
  if (!CRIME_OUTCOMES.includes(outcome)) throw new RangeError("破壊工作の結果が不正です");
  if (active.plotExposed && outcome === "success_hidden") outcome = "success_exposed";
  const successful = outcome === "success_hidden" || outcome === "success_exposed";
  const detected = Boolean(options.detected) || active.plotExposed || outcome === "success_exposed" || outcome === "captured";
  const domesticSovereign = isDomesticSovereign(normalized, active.target);
  let next = normalized;
  if (successful) {
    const runtime = buildGeneratedWorld(next);
    next.generatedWorld.regionalDomains = damageRegionalDomainAsset(runtime, next.generatedWorld.regionalDomains, active.target.id, options.damage ?? 65, next);
  }
  next = recordCrimeIncident(next, {
    id: active.incidentId,
    type: "sabotage",
    severity: "serious",
    perpetrator: { id: next.player.id ?? "player", name: next.player.name ?? "主人公" },
    accomplices: active.accomplices,
    target: active.target,
    jurisdiction: { id: active.target.jurisdictionId, name: active.target.regionId },
    outcome,
    detected: detected && !domesticSovereign,
    historyText: `${active.target.name}への破壊工作${successful ? "が実行された" : "に失敗した"}。`,
  });
  if (detected && domesticSovereign) {
    next = resolveCrimeSentence(next, { incidentId: active.incidentId, jurisdictionId: active.target.jurisdictionId, crimeType: "sabotage", severity: "serious", domestic: true });
  } else if (outcome === "captured") {
    next = resolveCrimeSentence(next, { incidentId: active.incidentId, jurisdictionId: active.target.jurisdictionId, crimeType: "sabotage", severity: "serious", domestic: false });
  }
  if (detected) {
    const abuse = domesticSovereign ? next.player.crime.abuses[0] : null;
    next = recordCriminalHistoricalEvent(next, {
      id: `history-${active.incidentId}`,
      type: "criminal_sabotage",
      severity: "serious",
      title: `${active.target.name}破壊工作`,
      summary: `${active.target.name}への破壊工作が露見した。`,
      nationId: active.target.nationId,
      regionId: active.target.regionId,
      causedBy: [active.incidentId],
      effects: [successful ? `regional-asset-damage:${active.target.id}` : `sabotage-attempt:${active.incidentId}`],
      bindings: [
        { type: "crime_incident", id: active.incidentId },
        ...(successful ? [{ type: "regional_asset", assetId: active.target.id }] : []),
        ...(abuse ? [{ type: "crime_abuse", id: abuse.id }] : []),
      ],
    });
  }
  next.player.crime.sabotageRecords.unshift({ incidentId: active.incidentId, targetId: active.target.id, outcome, detected, domesticSovereign, turn: next.turn ?? 0 });
  next.player.crime.activeSabotage = null;
  return { state: next, result: { incidentId: active.incidentId, targetId: active.target.id, outcome, detected, domesticSovereign } };
}
