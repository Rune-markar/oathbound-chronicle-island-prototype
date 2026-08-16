import { FIEF_PROJECT_DEFINITIONS, normalizeLifeToRealmState, startFiefProject } from "./life-to-realm-system.js";
import { getGeneratedWorldView } from "./generated-world-system.js";

const clone = (value) => structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const period = (state) => `${state.year ?? 317}-${state.month ?? 1}`;
export const ESTATE_POLITICS_SCHEMA_VERSION = 1;
export const ESTATE_FACTIONS = Object.freeze([
  Object.freeze({ id: "residents", name: "領民", preferredOptionId: "residents", concern: "負担と食糧" }),
  Object.freeze({ id: "notables", name: "名望家", preferredOptionId: "notables", concern: "慣行と発言権" }),
  Object.freeze({ id: "merchants", name: "商人", preferredOptionId: "merchants", concern: "流通と利益" }),
  Object.freeze({ id: "retainers", name: "家臣団", preferredOptionId: "force", concern: "軍備と命令系統" }),
]);
export const ESTATE_DEBATE_OPTIONS = Object.freeze([
  Object.freeze({ id: "compromise", name: "妥協案", description: "費用と工期を少し増やし、各身分へ譲歩する。" }),
  Object.freeze({ id: "residents", name: "領民負担を抑える", description: "支持を優先する。" }),
  Object.freeze({ id: "notables", name: "名望家に委ねる", description: "地方慣行と有力者を使う。" }),
  Object.freeze({ id: "merchants", name: "商人請負", description: "流通を優先し商人へ利益を認める。" }),
  Object.freeze({ id: "force", name: "強行着工", description: "一月で進める代わりに反発と事故を招く。" }),
]);

function baseline() { return { schemaVersion: ESTATE_POLITICS_SCHEMA_VERSION, activeDebate: null, regions: {}, projects: {}, history: [] }; }
function regionBaseline() { return { factionSupport: { residents: 50, notables: 50, merchants: 50, retainers: 50 }, rebellionPressure: 0, security: 50, commerce: 50, foodSecurity: 50, trust: 50 }; }
export function normalizeEstatePoliticsState(state) {
  if (!state?.player) return state; normalizeLifeToRealmState(state);
  const base = baseline(); const source = state.player.estatePolitics ?? {};
  state.player.estatePolitics = { ...base, ...source, schemaVersion: ESTATE_POLITICS_SCHEMA_VERSION, activeDebate: clone(source.activeDebate ?? null), regions: clone(source.regions ?? {}), projects: clone(source.projects ?? {}), history: [...(source.history ?? [])] };
  return state;
}
function prepared(state) { const next = clone(state); normalizeEstatePoliticsState(next); return next; }
function holdingFor(state, territoryId) { return state.player.holdings?.find((entry) => entry.territoryId === territoryId) ?? null; }
function regionForHolding(state, holding) { return holding?.generatedRegionId ?? state.generatedWorld?.expeditionRegionId ?? null; }
function ensureRegion(state, regionId) { return state.player.estatePolitics.regions[regionId] ??= regionBaseline(); }
function logPersonal(state, title, detail) { state.player.history ??= []; state.player.history.unshift({ id: `estate:${state.turn ?? 0}:${state.player.history.length}`, type: "estate_politics", title, detail, summary: detail, year: state.year, month: state.month }); }
function logWorld(state, regionId, title, summary, tone = "info") { state.generatedWorld.regionalDomains.events ??= []; state.generatedWorld.regionalDomains.events.push({ id: `estate-world:${state.turn ?? 0}:${state.generatedWorld.regionalDomains.events.length}`, type: "estate_politics", regionId, title, summary, detail: summary, tone, period: period(state), actorId: state.player.id }); }

export function getEstatePoliticsView(state, territoryId, projectId = null) {
  const next = prepared(state); const holding = holdingFor(next, territoryId); if (!holding) throw new Error("自分の所領ではありません");
  const regionId = regionForHolding(next, holding); const region = ensureRegion(next, regionId); const project = FIEF_PROJECT_DEFINITIONS[projectId] ?? null;
  return { territoryId, regionId, project, factions: ESTATE_FACTIONS.map((entry) => ({ ...entry, support: region.factionSupport[entry.id] })), options: ESTATE_DEBATE_OPTIONS, region: clone(region), activeDebate: clone(next.player.estatePolitics.activeDebate) };
}

export function startEstateProjectDebate(state, { territoryId, projectId, officerId } = {}) {
  const next = prepared(state); const holding = holdingFor(next, territoryId);
  if (!holding) throw new Error("自分の所領でのみ評議できます");
  if (!FIEF_PROJECT_DEFINITIONS[projectId]) throw new Error("実行できない所領事業です");
  if (next.player.estatePolitics.activeDebate) throw new Error("別の領地評議が進行中です");
  const eligible = new Set(["player", ...(next.player.householdRetainers ?? [])]); if (!eligible.has(officerId)) throw new Error("担当者を選んでください");
  const regionId = regionForHolding(next, holding); ensureRegion(next, regionId);
  next.player.estatePolitics.activeDebate = { id: `debate:${territoryId}:${projectId}:${next.turn ?? 0}`, territoryId, regionId, projectId, projectName: FIEF_PROJECT_DEFINITIONS[projectId].name, officerId, openedPeriod: period(next) };
  return next;
}

function applyDecisionPolitics(region, decisionId) {
  const changes = {
    compromise: { residents: 5, notables: 3, merchants: 3, retainers: 1, rebellion: -3 },
    residents: { residents: 9, notables: -3, merchants: -1, retainers: -2, rebellion: -4 },
    notables: { residents: -2, notables: 9, merchants: -2, retainers: 2, rebellion: 1 },
    merchants: { residents: -2, notables: -2, merchants: 10, retainers: -1, rebellion: 2 },
    force: { residents: -12, notables: -8, merchants: -5, retainers: 6, rebellion: 14 },
  }[decisionId];
  Object.keys(region.factionSupport).forEach((id) => { region.factionSupport[id] = clamp(region.factionSupport[id] + changes[id], 0, 100); });
  region.rebellionPressure = clamp(region.rebellionPressure + changes.rebellion, 0, 100);
}

export function resolveEstateProjectDebate(state, decisionId) {
  let next = prepared(state); const debate = next.player.estatePolitics.activeDebate; if (!debate) throw new Error("進行中の領地評議がありません");
  if (!ESTATE_DEBATE_OPTIONS.some((entry) => entry.id === decisionId)) throw new Error("方針を選んでください");
  next = startFiefProject(next, debate); normalizeEstatePoliticsState(next);
  const project = next.player.lifeToRealm.fief.projects.find((entry) => entry.territoryId === debate.territoryId);
  project.politicalDecisionId = decisionId; project.estateDebateId = debate.id; if (decisionId === "force") project.remainingMonths = 1;
  const political = { id: project.id, lifeProjectId: project.id, ...debate, politicalDecisionId: decisionId, status: "active", startedPeriod: period(next), expectedMonths: project.remainingMonths };
  next.player.estatePolitics.projects[project.id] = political; applyDecisionPolitics(ensureRegion(next, debate.regionId), decisionId); next.player.estatePolitics.activeDebate = null;
  logPersonal(next, `${project.name}の評議を決着`, `${ESTATE_DEBATE_OPTIONS.find((entry) => entry.id === decisionId).name}で着工した。`); if (decisionId === "force") logWorld(next, debate.regionId, `${project.name}を強行着工`, "反対を押し切ったため領内の反乱圧力が高まった。", "danger"); return next;
}

function settlementForRegion(state, regionId) { const world = getGeneratedWorldView(state); const region = world.runtime.regionById.get(regionId); const id = region?.settlementIds?.[0]; return id ? state.generatedWorld.regionalDomains.settlementStates[id] : null; }
function applyCompletion(state, record, completed) {
  const region = ensureRegion(state, record.regionId); const settlement = settlementForRegion(state, record.regionId);
  if (record.projectId === "relief" && settlement) settlement.population += 45;
  if (record.projectId === "patrol" || record.projectId === "road_network") region.security = clamp(region.security + 6, 0, 100);
  if (record.projectId === "road_network") region.commerce = clamp(region.commerce + 7, 0, 100);
  if (record.projectId === "granary" || record.projectId === "relief") region.foodSecurity = clamp(region.foodSecurity + 8, 0, 100);
  region.trust = clamp(region.trust + (record.politicalDecisionId === "force" ? -3 : 5), 0, 100);
  record.status = "completed"; record.completedPeriod = period(state); state.player.estatePolitics.history.unshift({ ...record, name: completed.name, outcome: "completed" }); logPersonal(state, `${completed.name}が領内へ定着`, "人口・治安・商業・信頼へ成果を反映した。"); logWorld(state, record.regionId, `${completed.name}が完成`, "領民・名望家・商人・家臣の調整を経て所領事業が定着した。", "success");
}

export function advanceEstatePoliticsMonth(state) {
  const next = prepared(state);
  Object.values(next.player.estatePolitics.projects).filter((record) => record.status === "active").forEach((record) => {
    if (record.politicalDecisionId === "force" && !record.incidentRecorded) {
      const region = ensureRegion(next, record.regionId); const outcome = region.rebellionPressure >= 10 ? "opposition" : "accident"; record.incidentRecorded = true; region.security = clamp(region.security - 4, 0, 100); next.player.estatePolitics.history.unshift({ ...record, outcome, period: period(next) });
    }
    const completed = next.player.lifeToRealm.fief.completed.find((entry) => entry.id === record.lifeProjectId);
    if (completed) applyCompletion(next, record, completed);
  });
  next.player.estatePolitics.history = next.player.estatePolitics.history.slice(0, 60); return next;
}
