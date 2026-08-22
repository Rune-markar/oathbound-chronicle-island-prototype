import { getGeneratedWorldView } from "./generated-world-system.js";
import { MERCHANT_COMMODITIES } from "./merchant-trade.js";
import { normalizeLifeToRealmState } from "./life-to-realm-system.js";

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const now = (state) => Number(state.generatedWorld?.expeditionClockMinutes) || 0;
const period = (state) => `${state.year ?? 317}-${state.month ?? 1}`;

export const COMPANION_QUEST_SCHEMA_VERSION = 1;

function baseline() { return { schemaVersion: COMPANION_QUEST_SCHEMA_VERSION, activeByMember: {}, history: [], offerPeriods: {} }; }
export function normalizeCompanionQuestState(state) {
  if (!state?.player) return state;
  normalizeLifeToRealmState(state);
  const base = baseline(); const source = state.player.companionQuests ?? {};
  state.player.companionQuests = { ...base, ...source, schemaVersion: COMPANION_QUEST_SCHEMA_VERSION, activeByMember: clone(source.activeByMember ?? {}), history: [...(source.history ?? [])], offerPeriods: clone(source.offerPeriods ?? {}) };
  return state;
}
function prepared(state) { const next = clone(state); normalizeCompanionQuestState(next); return next; }
function hash(text) { let value = 2166136261; for (const char of String(text)) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); } return value >>> 0; }
function memberAgency(state, memberId) {
  const member = state.player.villageLife?.party?.find((entry) => entry.id === memberId);
  const agency = state.player.lifeToRealm.companions[memberId];
  if (!member || !agency || member.alive === false || agency.status === "departed") throw new Error("同行中の仲間ではありません");
  return { member, agency };
}
function battleEvidenceRecords(state) {
  const military = (state.player.militaryCareer?.history ?? []).filter((entry) => ["victory", "completed"].includes(entry.outcome)).map((entry) => ({ id: entry.id, source: "military", completedTurn: entry.completedTurn ?? 0 }));
  const personal = Object.values(state.adventure?.personalMap?.regions ?? {}).flatMap((region) => (region.history ?? []).filter((entry) => entry.outcome === "victory").map((entry) => ({ id: entry.id, source: "personal_map", completedTurn: null })));
  return [...military, ...personal].filter((entry) => entry.id);
}
function offerSet(state, member) {
  const world = getGeneratedWorldView(state); const origin = world.expeditionRegion;
  const neighbors = origin.neighborIds.map((id) => world.runtime.regionById.get(id)).filter(Boolean);
  const target = neighbors[hash(`${state.generatedWorld.seed}|${period(state)}|${member.id}`) % Math.max(1, neighbors.length)] ?? origin;
  const commodityIds = Object.keys(MERCHANT_COMMODITIES); const commodityId = commodityIds[hash(`${member.id}|goods`) % commodityIds.length];
  const deadlineMinutes = now(state) + 60 * 24 * 18;
  const common = { memberId: member.id, memberName: member.name, originRegionId: origin.id, targetRegionId: target.id, targetRegionName: target.name, offeredPeriod: period(state), deadlineMinutes };
  return [
    { ...common, id: `cq:${period(state)}:${member.id}:journey`, kind: "journey", name: `${target.name}への同行願い`, description: `${member.name}は自分の目で${target.name}を見たい。` },
    { ...common, id: `cq:${period(state)}:${member.id}:delivery`, kind: "delivery", name: `${target.name}への届け物`, commodityId, commodityName: MERCHANT_COMMODITIES[commodityId].name, quantity: 1, description: `${member.name}の縁者へ品を届ける。` },
    { ...common, id: `cq:${period(state)}:${member.id}:battle`, kind: "battle", name: `${member.name}の実戦証明`, description: "勝利した戦闘記録を仲間の自信につなげる。" },
  ];
}

export function getCompanionQuestView(state) {
  const next = prepared(state); const members = (next.player.villageLife?.party ?? []).filter((entry) => entry.active !== false && entry.alive !== false);
  return { companions: members.map((member) => {
    const active = clone(next.player.companionQuests.activeByMember[member.id] ?? null);
    const used = new Set(active?.priorBattleEvidenceIds ?? []);
    const eligibleBattleId = active?.kind === "battle" ? battleEvidenceRecords(next).find((entry) => !used.has(entry.id) && (entry.completedTurn == null || entry.completedTurn >= (active.acceptedTurn ?? 0)))?.id ?? null : null;
    return { memberId: member.id, name: member.name, agency: clone(next.player.lifeToRealm.companions[member.id]), offers: offerSet(next, member), active, eligibleBattleId };
  }), history: clone(next.player.companionQuests.history.slice(0, 20)) };
}

export function respondToCompanionQuest(state, memberId, offerId, response) {
  const next = prepared(state); const { member, agency } = memberAgency(next, memberId); const offer = offerSet(next, member).find((entry) => entry.id === offerId);
  if (!offer) throw new Error("この期間の仲間依頼ではありません");
  if (!["accept", "hold", "refuse"].includes(response)) throw new Error("返答を選んでください");
  if (response === "refuse") {
    agency.loyalty = clamp((Number(agency.loyalty) || 0) - 7, 0, 100); agency.morale = clamp((Number(agency.morale) || 0) - 4, 0, 100); delete agency.personalQuest; delete next.player.companionQuests.activeByMember[memberId];
    next.player.companionQuests.history.unshift({ ...offer, response, outcome: "refused", resolvedClockMinutes: now(next) }); logPersonal(next, `${member.name}の頼みを断る`, `${offer.name}を引き受けず、関係にしこりが残った。`); return next;
  }
  const quest = { ...offer, status: response === "hold" ? "held" : "active", acceptedClockMinutes: response === "accept" ? now(next) : null, acceptedTurn: response === "accept" ? (next.turn ?? 0) : null, priorBattleEvidenceIds: response === "accept" && offer.kind === "battle" ? battleEvidenceRecords(next).map((entry) => entry.id) : [] };
  agency.personalQuest = clone(quest); next.player.companionQuests.activeByMember[memberId] = clone(quest); return next;
}

function consumeCargo(state, commodityId, quantity) {
  const cargo = state.player.merchantTrade?.cargo?.find((entry) => entry.commodityId === commodityId);
  if (!cargo || cargo.quantity < quantity) throw new Error("依頼に必要な積荷がありません");
  cargo.quantity -= quantity; if (cargo.quantity <= 0) state.player.merchantTrade.cargo = state.player.merchantTrade.cargo.filter((entry) => entry !== cargo);
}
function logPersonal(state, title, detail) {
  state.player.history ??= []; state.player.history.unshift({ id: `companion:${state.turn ?? 0}:${state.player.history.length}`, type: "companion_quest", title, detail, summary: detail, year: state.year, month: state.month });
}

export function completeCompanionQuest(state, memberId, evidence = {}) {
  const next = prepared(state); const { agency } = memberAgency(next, memberId); const quest = next.player.companionQuests.activeByMember[memberId];
  if (!quest || quest.status !== "active") throw new Error("進行中の仲間依頼がありません");
  if (now(next) > quest.deadlineMinutes) throw new Error("仲間依頼の期限を過ぎています");
  if (["journey", "delivery"].includes(quest.kind) && next.generatedWorld.expeditionRegionId !== quest.targetRegionId) throw new Error("目的地方へ到達していません");
  let evidenceId = null;
  if (quest.kind === "delivery") consumeCargo(next, quest.commodityId, quest.quantity);
  if (quest.kind === "battle") {
    const prior = new Set(quest.priorBattleEvidenceIds ?? []); const candidateId = evidence.battleId ?? battleEvidenceRecords(next).find((entry) => !prior.has(entry.id) && (entry.completedTurn == null || entry.completedTurn >= (quest.acceptedTurn ?? 0)))?.id;
    const record = battleEvidenceRecords(next).find((entry) => entry.id === candidateId && !prior.has(entry.id) && (entry.completedTurn == null || entry.completedTurn >= (quest.acceptedTurn ?? 0)));
    if (!record) throw new Error("勝利した戦闘記録が必要です"); evidenceId = record.id;
  }
  agency.loyalty = clamp((Number(agency.loyalty) || 0) + 9, 0, 100); agency.morale = clamp((Number(agency.morale) || 0) + 8, 0, 100); agency.fear = clamp((Number(agency.fear) || 0) - 3, 0, 100); agency.leadershipAptitude = (Number(agency.leadershipAptitude) || 0) + (quest.kind === "journey" ? 3 : 1);
  delete agency.personalQuest; delete next.player.companionQuests.activeByMember[memberId];
  next.player.companionQuests.history.unshift({ ...quest, status: "resolved", outcome: "completed", evidenceId, resolvedClockMinutes: now(next) }); logPersonal(next, `${quest.memberName}の依頼を達成`, `${quest.name}を果たし、信頼を深めた。`); return next;
}

export function advanceCompanionQuestsOnDraft(state) {
  normalizeCompanionQuestState(state);
  Object.entries(state.player.companionQuests.activeByMember).forEach(([memberId, quest]) => {
    if (quest.status !== "active" || now(state) <= quest.deadlineMinutes) return;
    const agency = state.player.lifeToRealm.companions[memberId]; if (agency) { agency.loyalty = clamp(agency.loyalty - 10, 0, 100); agency.morale = clamp(agency.morale - 8, 0, 100); agency.fear = clamp((Number(agency.fear) || 0) + 15, 0, 100); delete agency.personalQuest; if (agency.loyalty <= 5) agency.status = "departed"; }
    state.player.companionQuests.history.unshift({ ...quest, status: "resolved", outcome: "expired", resolvedClockMinutes: now(state) }); logPersonal(state, `${quest.memberName}の依頼が期限切れ`, `${quest.name}を果たせず、忠誠と士気を損ねた。`); delete state.player.companionQuests.activeByMember[memberId];
  });
  return state;
}

export function advanceCompanionQuests(state) {
  return advanceCompanionQuestsOnDraft(clone(state));
}
