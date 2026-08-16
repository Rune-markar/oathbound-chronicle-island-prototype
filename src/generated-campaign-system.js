import { getGeneratedWorldView, transferGeneratedRegionControl } from "./generated-world-system.js";

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const period = (state) => `${state.year ?? 317}-${state.month ?? 1}`;
const pairKey = (left, right) => [left, right].sort().join(":");
export const GENERATED_CAMPAIGN_SCHEMA_VERSION = 1;
export const GENERATED_CAMPAIGN_OBJECTIVES = Object.freeze({
  limited_annexation: Object.freeze({ id: "limited_annexation", name: "限定割譲", supplyCost: 34 }),
  secure_route: Object.freeze({ id: "secure_route", name: "通商路確保", supplyCost: 25 }),
  relieve_border: Object.freeze({ id: "relieve_border", name: "辺境救援", supplyCost: 22 }),
});
export const GENERATED_SIEGE_DECISIONS = Object.freeze([
  Object.freeze({ id: "assault", name: "強襲", description: "短期決着。損害が大きい。" }),
  Object.freeze({ id: "blockade", name: "包囲", description: "兵站を消費して損害を抑える。" }),
  Object.freeze({ id: "negotiate", name: "開城交渉", description: "威信と同盟軍を使う。" }),
]);

function baseline() { return { schemaVersion: GENERATED_CAMPAIGN_SCHEMA_VERSION, active: null, history: [], promisedAllies: [], campaignLog: [] }; }
export function normalizeGeneratedCampaignState(state) {
  if (!state?.player) return state; const base = baseline(); const source = state.player.generatedCampaign ?? {};
  state.player.generatedCampaign = { ...base, ...source, schemaVersion: GENERATED_CAMPAIGN_SCHEMA_VERSION, active: clone(source.active ?? null), history: [...(source.history ?? [])], promisedAllies: [...(source.promisedAllies ?? [])], campaignLog: [...(source.campaignLog ?? [])] };
  state.generatedWorld.pendingStrategicDecisions ??= [];
  return state;
}
function prepared(state) { const next = clone(state); normalizeGeneratedCampaignState(next); return next; }
function assertSovereign(state) { if (!state.player.sovereign || state.player.affiliation?.nationId !== state.generatedWorld.playerNationId) throw new Error("生成世界の主権国家だけが戦役を開始できます"); }
function playerNationId(state) { return state.generatedWorld.playerNationId; }
function liveOwner(state, region) { return state.generatedWorld.regionalDomains?.regionStates?.[region.id]?.nationId ?? region.nationId; }
function foreignTargets(state) {
  const world = getGeneratedWorldView(state); const owned = new Set(world.runtime.nations.regions.filter((region) => liveOwner(state, region) === playerNationId(state)).map((region) => region.id));
  const ids = new Set(); owned.forEach((id) => world.runtime.regionById.get(id)?.neighborIds?.forEach((neighborId) => { const region = world.runtime.regionById.get(neighborId); if (region && liveOwner(state, region) !== playerNationId(state)) ids.add(neighborId); }));
  return [...ids].sort().map((id) => { const region = world.runtime.regionById.get(id); return { regionId: id, name: region.name, nationId: liveOwner(state, region), originRegionIds: region.neighborIds.filter((neighborId) => owned.has(neighborId)) }; });
}
function alliedNations(state, targetNationId = null) {
  const world = getGeneratedWorldView(state); const playerId = playerNationId(state);
  return world.runtime.nations.nations.filter((nation) => nation.id !== playerId && nation.id !== targetNationId && state.generatedWorld.geopolitics?.relations?.[pairKey(playerId, nation.id)]?.allied).map((nation) => ({ nationId: nation.id, name: nation.name, relation: state.generatedWorld.geopolitics.relations[pairKey(playerId, nation.id)].relation }));
}
export function getGeneratedCampaignView(state) {
  const next = prepared(state); const targets = next.player.sovereign ? foreignTargets(next) : []; const targetNationId = next.player.generatedCampaign.active?.targetNationId ?? null;
  return { targets, allies: alliedNations(next, targetNationId), objectives: Object.values(GENERATED_CAMPAIGN_OBJECTIVES), siegeDecisions: GENERATED_SIEGE_DECISIONS, active: clone(next.player.generatedCampaign.active), history: clone(next.player.generatedCampaign.history.slice(0, 12)), promisedAllies: clone(next.player.generatedCampaign.promisedAllies) };
}
export function requestAlliedContingent(state, nationId) {
  const next = prepared(state); assertSovereign(next); const ally = alliedNations(next).find((entry) => entry.nationId === nationId); if (!ally) throw new Error("同盟国ではありません");
  if (!next.player.generatedCampaign.promisedAllies.some((entry) => entry.nationId === nationId)) next.player.generatedCampaign.promisedAllies.push({ ...ally, promisedPeriod: period(next) }); return next;
}
function realCommanders(state, ids) { const eligible = new Set(["player", ...(state.player.householdRetainers ?? [])]); return [...new Set(ids ?? [])].filter((id) => eligible.has(id)); }
function alternateRoute(world, originId, targetId) {
  const origin = world.runtime.regionById.get(originId); const via = origin.neighborIds.map((id) => world.runtime.regionById.get(id)).filter(Boolean).find((region) => region.id !== targetId && region.neighborIds.includes(targetId));
  return via ? [originId, via.id, targetId] : [originId, targetId];
}
function recordWorld(state, title, summary, tone = "danger") {
  const event = { id: `generated-campaign:${state.turn ?? 0}:${state.player.generatedCampaign.campaignLog.length}`, type: "generated_campaign", title, summary, detail: summary, tone, period: period(state), actorId: state.player.id };
  state.player.generatedCampaign.campaignLog.unshift(event); state.generatedWorld.regionalDomains.events ??= []; state.generatedWorld.regionalDomains.events.push(event); state.player.history ??= []; state.player.history.unshift({ ...event, year: state.year, month: state.month });
}
export function startGeneratedCampaign(state, { targetRegionId, objectiveId, commanderIds, allyNationIds = [] } = {}) {
  const next = prepared(state); assertSovereign(next); if (next.player.generatedCampaign.active) throw new Error("別の戦役が進行中です");
  const target = foreignTargets(next).find((entry) => entry.regionId === targetRegionId); const objective = GENERATED_CAMPAIGN_OBJECTIVES[objectiveId]; const commanders = realCommanders(next, commanderIds);
  if (!target || !objective) throw new Error("実在する外国境界と戦役目的を選んでください"); if (commanders.length < 2) throw new Error("二正面を率いる指揮官が二名必要です");
  if ((Number(next.player.metrics.wealth) || 0) < objective.supplyCost) throw new Error("戦役兵站費が不足しています"); next.player.metrics.wealth -= objective.supplyCost;
  const world = getGeneratedWorldView(next); const originId = target.originRegionIds[0] ?? world.expeditionRegion.id; const approvedAllies = [...new Set(allyNationIds)].filter((id) => next.player.generatedCampaign.promisedAllies.some((entry) => entry.nationId === id) && alliedNations(next, target.nationId).some((entry) => entry.nationId === id));
  const fronts = [{ id: "main", name: "主攻正面", routeRegionIds: [originId, target.regionId], commanderId: commanders[0], progress: 0 }, { id: "support", name: "支援正面", routeRegionIds: alternateRoute(world, originId, target.regionId), commanderId: commanders[1], progress: 0 }];
  const armies = [{ id: "army-main", nationId: playerNationId(next), commanderId: commanders[0], troops: 520, supplies: 55, casualties: 0 }, { id: "army-support", nationId: playerNationId(next), commanderId: commanders[1], troops: 420, supplies: 46, casualties: 0 }, ...approvedAllies.map((id, index) => ({ id: `army-ally-${index}`, nationId: id, allyNationId: id, commanderId: null, troops: 280, supplies: 36, casualties: 0 }))];
  next.player.generatedCampaign.active = { id: `campaign:${period(next)}:${target.regionId}`, phase: "mustering", outcome: null, originRegionId: originId, targetRegionId: target.regionId, targetRegionName: target.name, targetNationId: target.nationId, objectiveId, objectiveName: objective.name, supplyCost: objective.supplyCost, commanderIds: commanders, allyNationIds: approvedAllies, fronts, armies, siegeDecisionId: null, rebuildingMonths: 0, startedPeriod: period(next), elapsedSteps: 0 };
  const relation = next.generatedWorld.geopolitics.relations[pairKey(playerNationId(next), target.nationId)]; if (relation) { relation.atWar = true; relation.allied = false; relation.tension = Math.max(90, relation.tension); }
  next.player.generatedCampaign.promisedAllies = next.player.generatedCampaign.promisedAllies.filter((entry) => !approvedAllies.includes(entry.nationId)); recordWorld(next, `${target.name}方面戦役を開始`, `${objective.name}を掲げ、二正面と兵站線を編成した。`); return next;
}
function applyAttrition(active, ratio) { active.armies.forEach((army) => { const loss = Math.max(1, Math.round(army.troops * ratio)); army.troops -= loss; army.casualties += loss; army.supplies = Math.max(0, army.supplies - Math.round(10 + ratio * 100)); }); }
function finishRebuilding(state) {
  const active = state.player.generatedCampaign.active; const relation = state.generatedWorld.geopolitics.relations[pairKey(playerNationId(state), active.targetNationId)]; if (relation) { relation.atWar = false; relation.truceMonths = Math.max(6, relation.truceMonths ?? 0); relation.tension = clamp(relation.tension - 10, 0, 100); }
  const history = { ...clone(active), endedPeriod: period(state), settlementId: null }; state.player.generatedCampaign.history.unshift(history); state.player.generatedCampaign.active = null; recordWorld(state, active.outcome === "retreat" ? "戦役から撤退" : "戦役敗北後の再建", "損失を記録し、生存した部隊を帰還させた。", "warning");
}
export function advanceGeneratedCampaign(state) {
  const next = prepared(state); const active = next.player.generatedCampaign.active; if (!active) throw new Error("進行中の生成世界戦役がありません"); active.elapsedSteps += 1;
  if (active.phase === "mustering") { active.phase = "marching"; active.fronts.forEach((front) => { front.progress = 50; }); active.armies.forEach((army) => { army.supplies -= 5; }); return next; }
  if (active.phase === "marching") { active.phase = "siege_decision"; active.fronts.forEach((front) => { front.progress = 100; }); active.armies.forEach((army) => { army.supplies -= 8; }); return next; }
  if (active.phase === "siege_decision") throw new Error("攻城方針を決めてください");
  if (active.phase === "siege") {
    const ratio = active.siegeDecisionId === "assault" ? 0.13 : active.siegeDecisionId === "blockade" ? 0.07 : 0.04; applyAttrition(active, ratio);
    const strength = active.armies.reduce((sum, army) => sum + army.troops + army.supplies * 2, 0); active.outcome = strength >= 760 ? "victory" : "defeat";
    if (active.outcome === "victory") active.phase = "peace_decision"; else { active.phase = "rebuilding"; active.rebuildingMonths = 2; } return next;
  }
  if (active.phase === "rebuilding") { active.rebuildingMonths -= 1; if (active.rebuildingMonths <= 0) finishRebuilding(next); return next; }
  if (active.phase === "peace_decision") throw new Error("講和条件を決めてください"); throw new Error("進行できない戦役段階です");
}
export function decideGeneratedSiege(state, decisionId) { const next = prepared(state); const active = next.player.generatedCampaign.active; if (!active || active.phase !== "siege_decision") throw new Error("攻城方針を選ぶ段階ではありません"); if (!GENERATED_SIEGE_DECISIONS.some((entry) => entry.id === decisionId)) throw new Error("攻城方針が不正です"); active.siegeDecisionId = decisionId; active.phase = "siege"; return next; }
export function retreatGeneratedCampaign(state) { const next = prepared(state); const active = next.player.generatedCampaign.active; if (!active || ["peace_decision", "rebuilding"].includes(active.phase)) throw new Error("この段階では撤退できません"); applyAttrition(active, 0.08); active.outcome = "retreat"; active.phase = "rebuilding"; active.rebuildingMonths = 1; return next; }
export function settleGeneratedCampaign(state, settlementId, { confirmIrreversible = false } = {}) {
  let next = prepared(state); const active = next.player.generatedCampaign.active; if (!active || active.phase !== "peace_decision" || active.outcome !== "victory") throw new Error("講和できる勝利戦役がありません"); if (!['status_quo', 'ceasefire', 'limited_annexation'].includes(settlementId)) throw new Error("講和条件が不正です");
  if (settlementId === "limited_annexation" && !confirmIrreversible) throw new Error("領土変更の確認が必要です");
  if (settlementId === "limited_annexation") next = transferGeneratedRegionControl(next, active.targetRegionId, playerNationId(next), { reason: "生成世界戦役の限定割譲", actorId: next.player.id });
  normalizeGeneratedCampaignState(next); const current = next.player.generatedCampaign.active; const relation = next.generatedWorld.geopolitics.relations[pairKey(playerNationId(next), current.targetNationId)]; if (relation) { relation.atWar = false; relation.truceMonths = Math.max(12, relation.truceMonths); relation.tension = clamp(relation.tension - 25, 0, 100); }
  next.player.generatedCampaign.history.unshift({ ...clone(current), endedPeriod: period(next), settlementId }); next.player.generatedCampaign.active = null; recordWorld(next, "生成世界戦役が講和", `${settlementId === "limited_annexation" ? "限定割譲" : settlementId === "ceasefire" ? "停戦" : "原状回復"}で戦役を終えた。`, "success"); return next;
}
export function advanceGeneratedCampaignMonth(state) {
  const next = prepared(state); if (next.player.generatedCampaign.active || !next.player.sovereign) return next; const condition = next.generatedWorld.geopolitics?.nationStates?.[playerNationId(next)];
  if ((condition?.offensiveIntent ?? 0) >= 80 && (condition?.readiness ?? 0) >= 80 && foreignTargets(next).length) {
    const id = `generated_campaign_proposal:${period(next)}`; if (!next.generatedWorld.pendingStrategicDecisions.some((entry) => entry.id === id)) next.generatedWorld.pendingStrategicDecisions.push({ id, type: "generated_campaign_proposal", title: "国境戦役の開戦提議", summary: "軍議は開戦可能と判断した。不可逆な開戦は君主の承認を待つ。", period: period(next), targetRegionId: foreignTargets(next)[0].regionId });
  } return next;
}
