import { CRIME_RISK_LABELS, normalizeCrimeState, recordCrimeIncident } from "./crime-system.js";

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function routeContext(context = {}) {
  const origin = context.origin ?? context.from;
  const destination = context.destination ?? context.to;
  if (!origin?.id || !destination?.id) throw new TypeError("密輸には出発地と目的地が必要です");
  return { origin, destination, travel: context.travel ?? {} };
}

function activeJurisdiction(active, id) {
  if (id === active.originJurisdiction.id) return active.originJurisdiction;
  if (id === active.destinationJurisdiction.id) return active.destinationJurisdiction;
  return { id, name: id, nationId: null };
}

function actualTravelContext(state, active) {
  const travel = state.generatedWorld?.lastTravel;
  const currentJurisdictionId = state.generatedWorld?.expeditionRegionId;
  if (!travel?.fromRegionId || !travel?.destinationRegionId || currentJurisdictionId !== travel.destinationRegionId) {
    throw new Error("実際の地方移動が確認できません");
  }
  return {
    origin: activeJurisdiction(active, travel.fromRegionId),
    destination: activeJurisdiction(active, travel.destinationRegionId),
  };
}

function recordDetection(state, active, jurisdiction, outcome, cargoStatus) {
  const next = recordCrimeIncident(state, {
    id: `smuggling:${state.turn ?? 0}:${state.player.crime.incidents.length + 1}:${active.offerId}`,
    type: "smuggling",
    severity: "serious",
    perpetrator: { id: state.player.id ?? "player", name: state.player.name ?? "主人公" },
    accomplices: [],
    victim: null,
    target: active.cargo,
    jurisdiction,
    reward: null,
    outcome,
    detected: true,
    historyText: `${active.cargo.name}の密輸が国境検査で発覚した。`,
  });
  next.player.crime.smugglingRecords.unshift({ offerId: active.offerId, cargo: structuredClone(active.cargo), cargoStatus, outcome, jurisdictionId: jurisdiction.id, turn: next.turn ?? 0 });
  return next;
}

export function getSmugglingOffers(state, context = {}) {
  const { origin, destination, travel } = routeContext(context);
  const normalized = normalizeCrimeState(state);
  const contact = normalized.player.crime.contacts.find((entry) => entry.role === "smuggler" && entry.jurisdictionId === origin.id);
  if (!contact) return [];
  const seed = normalized.generatedWorld?.seed ?? normalized.worldSeed ?? "cargo";
  const cargoTypes = [
    { id: "untaxed-silk", name: "無税の絹布", reward: 6 },
    { id: "sealed-tonic", name: "禁制の薬酒", reward: 8 },
  ];
  const offset = hashString(`${seed}:${origin.id}:${destination.id}`) % cargoTypes.length;
  const routeJurisdictionIds = [...new Set([origin.id, ...(travel.pathRegionIds ?? []), destination.id])];
  return cargoTypes.map((_, index) => cargoTypes[(index + offset) % cargoTypes.length]).map((cargo) => ({
    id: `smuggling:${origin.id}:${destination.id}:${cargo.id}`,
    type: "smuggling",
    contactId: contact.id,
    originJurisdiction: { id: origin.id, name: origin.name ?? origin.id, nationId: origin.nationId ?? null },
    destinationJurisdiction: { id: destination.id, name: destination.name ?? destination.id, nationId: destination.nationId ?? null },
    routeJurisdictionIds,
    cargo: { id: `mission-cargo:${origin.id}:${destination.id}:${cargo.id}`, name: cargo.name, kind: cargo.id },
    reward: { wealth: cargo.reward, text: `財産+${cargo.reward}` },
    deadlineTurn: (normalized.turn ?? 0) + Math.max(2, Math.ceil((travel.travelMinutes ?? 360) / 360) + 1),
    riskLabel: origin.nationId && destination.nationId && origin.nationId !== destination.nationId ? CRIME_RISK_LABELS[2] : CRIME_RISK_LABELS[1],
    maximumPenalty: "積荷没収、拘束、密輸罪の処罰",
  }));
}

export function acceptSmugglingOffer(state, offer) {
  const next = normalizeCrimeState(state);
  if (!offer?.id || offer.type !== "smuggling") throw new TypeError("密輸依頼が必要です");
  if (next.player.crime.activeSmuggling) throw new Error("すでに運搬中の密輸品があります");
  const contact = next.player.crime.contacts.find((entry) => entry.id === offer.contactId && entry.role === "smuggler" && entry.jurisdictionId === offer.originJurisdiction.id);
  if (!contact) throw new Error("依頼元の密輸人との接触がありません");
  next.player.crime.activeSmuggling = {
    offerId: offer.id,
    contactId: offer.contactId,
    originJurisdiction: structuredClone(offer.originJurisdiction),
    destinationJurisdiction: structuredClone(offer.destinationJurisdiction),
    cargo: structuredClone(offer.cargo),
    reward: structuredClone(offer.reward),
    deadlineTurn: offer.deadlineTurn,
    routeJurisdictionIds: [...new Set(offer.routeJurisdictionIds ?? [offer.originJurisdiction.id, offer.destinationJurisdiction.id])],
    status: "active",
    acceptedTurn: next.turn ?? 0,
  };
  return next;
}

export function inspectSmugglingCheckpoint(state, _context = {}, options = {}) {
  const next = normalizeCrimeState(state);
  const active = next.player.crime.activeSmuggling;
  if (!active || active.status !== "active") throw new Error("検査対象の密輸積荷がありません");
  const { origin, destination } = actualTravelContext(next, active);
  const routeIds = active.routeJurisdictionIds ?? [active.originJurisdiction.id, active.destinationJurisdiction.id];
  const fromIndex = routeIds.indexOf(origin.id);
  const toIndex = routeIds.indexOf(destination.id);
  const legitimateMovement = fromIndex >= 0 && toIndex > fromIndex;
  if (!legitimateMovement) throw new Error("受託した密輸品の運搬経路と一致しません");
  if (active.lastCheckpointDestinationId === destination.id) {
    return { state: next, result: { inspected: false, reason: "already_inspected", outcome: null } };
  }
  active.lastCheckpointDestinationId = destination.id;
  const selected = options.outcome ?? ["clear", "seizure", "escape", "capture"][hashString(`${next.generatedWorld?.seed ?? "cargo"}:${active.offerId}:${origin.id}:${destination.id}:${next.turn ?? 0}`) % 4];
  if (selected === "clear") return { state: next, result: { inspected: true, outcome: "clear", cargoStatus: "active" } };
  if (!["seizure", "escape", "capture"].includes(selected)) throw new RangeError("検査結果が不正です");
  const commonOutcome = selected === "capture" ? "captured" : "failed_escaped";
  const jurisdiction = destination.id === active.destinationJurisdiction.id
    ? active.destinationJurisdiction
    : destination.id === active.originJurisdiction.id ? active.originJurisdiction : { id: destination.id, name: destination.id };
  const detected = recordDetection(next, active, jurisdiction, commonOutcome, selected === "escape" ? "active" : "seized");
  if (selected !== "escape") detected.player.crime.activeSmuggling = null;
  return { state: detected, result: { inspected: true, outcome: commonOutcome, checkpointOutcome: selected, cargoStatus: selected === "escape" ? "active" : "seized", captured: selected === "capture" } };
}

export function deliverSmugglingCargo(state, _context = {}) {
  const normalized = normalizeCrimeState(state);
  const active = normalized.player.crime.activeSmuggling;
  if (!active || active.status !== "active") throw new Error("届ける密輸積荷がありません");
  const jurisdictionId = normalized.generatedWorld?.expeditionRegionId;
  if (jurisdictionId !== active.destinationJurisdiction.id) throw new Error("密輸品の目的地が現在地ではありません");
  if ((normalized.turn ?? 0) > active.deadlineTurn) throw new Error("密輸依頼の期限を過ぎています");
  const next = recordCrimeIncident(normalized, {
    id: `smuggling:${normalized.turn ?? 0}:${normalized.player.crime.incidents.length + 1}:${active.offerId}:delivery`,
    type: "smuggling",
    severity: "serious",
    perpetrator: { id: normalized.player.id ?? "player", name: normalized.player.name ?? "主人公" },
    accomplices: [],
    victim: null,
    target: active.cargo,
    jurisdiction: active.destinationJurisdiction,
    reward: active.reward,
    outcome: "success_hidden",
    detected: false,
    historyText: `${active.cargo.name}を${active.destinationJurisdiction.name}へ届けた。`,
  });
  next.player.metrics ??= {};
  next.player.metrics.wealth = (Number(next.player.metrics.wealth) || 0) + active.reward.wealth;
  next.player.crime.illegalGain += active.reward.wealth;
  const contact = next.player.crime.contacts.find((entry) => entry.id === active.contactId);
  if (contact) contact.trust = Math.min(100, (Number(contact.trust) || 0) + 2);
  next.player.crime.smugglingRecords.unshift({ offerId: active.offerId, cargo: structuredClone(active.cargo), cargoStatus: "delivered", outcome: "success_hidden", jurisdictionId, reward: structuredClone(active.reward), turn: next.turn ?? 0 });
  next.player.crime.activeSmuggling = null;
  return { state: next, result: { offerId: active.offerId, outcome: "success_hidden", reward: structuredClone(active.reward), cargoStatus: "delivered" } };
}
