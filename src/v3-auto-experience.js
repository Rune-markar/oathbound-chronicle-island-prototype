import { getV3DetailedTile } from "./v3-field-system.js";
import { getV3CurrentMarket } from "./v3-merchant-system.js";

const round = (value) => Math.round((Number(value) || 0) * 10) / 10;
const boundedList = (list) => Array.isArray(list) ? list.filter((v) => typeof v === "string").map((v) => v.slice(0, 180)).slice(-120) : [];
export const EXPLORATION_GOALS = { settlement: "新しい集落を見つける", survey: "周辺を調査して出発地へ帰る", wander: "歩数を決めて探索する" };
export const COMBAT_POLICIES = { balanced: "体力を優先", supplies: "回復品を温存", cargo: "積荷を守る" };

export function restoreAutoExperience(source = {}) {
  const origin = source.origin;
  return {
    origin: Number.isInteger(origin?.x) && origin.x >= 0 && Number.isInteger(origin?.y) && origin.y >= 0 ? { x: origin.x, y: origin.y } : null,
    knownPlaces: boundedList(source.knownPlaces), knownEnemies: boundedList(source.knownEnemies),
    discoveries: boundedList(source.discoveries), highlights: boundedList(source.highlights).slice(-12),
    explorationReturning: source.explorationReturning === true, returnCargo: source.returnCargo === true,
    summary: Object.fromEntries(["xp", "items", "battles", "talks", "gold", "minutes", "profit", "companyProfit", "remoteEvents"].map((id) => [id, Math.max(-1e9, Math.min(1e9, round(source.summary?.[id])))])),
  };
}

export function startAutoExperience(state, context) {
  const prior = restoreAutoExperience(state.autoMode);
  const market = context ? getV3CurrentMarket(context, state) : null;
  return { ...restoreAutoExperience(), origin: { x: state.player.x, y: state.player.y },
    knownPlaces: [...new Set([...prior.knownPlaces, ...(state.merchant?.trade?.knownSettlements ?? []).map((s) => s.id), ...(market ? [market.id] : [])])].slice(-120),
    knownEnemies: prior.knownEnemies };
}

export function recordAutoExperience(auto, before, after, decision, context, previousWorld, world) {
  const experience = restoreAutoExperience(auto);
  const summary = { ...experience.summary };
  summary.xp += after.player.xp - before.player.xp;
  summary.gold = round(summary.gold + after.player.gold - before.player.gold);
  summary.minutes += Math.max(0, after.clock.elapsedMinutes - before.clock.elapsedMinutes);
  summary.items += Math.max(0, after.player.inventory.length - before.player.inventory.length);
  summary.battles += decision.kind === "encounter" && decision.action === "fight" && before.pendingEncounter?.type === "enemy" && !after.pendingEncounter && after.player.xp > before.player.xp ? 1 : 0;
  summary.talks += decision.kind === "encounter" && decision.action === "talk" ? 1 : 0;
  summary.profit = round(summary.profit + (after.merchant?.trade?.stats?.realizedProfit ?? 0) - (before.merchant?.trade?.stats?.realizedProfit ?? 0));
  summary.companyProfit = round(summary.companyProfit + (after.merchant?.company?.stats?.totalProfit ?? 0) - (before.merchant?.company?.stats?.totalProfit ?? 0));
  if (decision.kind === "encounter" && before.pendingEncounter?.type === "enemy") experience.knownEnemies = [...new Set([...experience.knownEnemies, before.pendingEncounter.id ?? before.pendingEncounter.name])].slice(-120);
  const market = context && decision.kind === "move" ? getV3CurrentMarket(context, after) : null;
  if (market && !experience.knownPlaces.includes(market.id)) {
    experience.knownPlaces.push(market.id);
    experience.discoveries.push(market.name);
    experience.highlights.push(`${market.name}の市場を発見`);
  }
  if (after.messageLog?.[0] !== before.messageLog?.[0] && !/^[東西南北]へ\d+分進んだ/.test(after.messageLog?.[0] ?? "")) experience.highlights.push(after.messageLog[0]);
  if (previousWorld && world && context) {
    const events = autoWorldEvents(previousWorld, world, auto.config, context, after);
    summary.remoteEvents += events.filter((e) => !e.relevant).length;
    experience.highlights.push(...events.filter((e) => e.relevant).map((e) => e.message));
  }
  return { ...experience, summary, discoveries: experience.discoveries.slice(-120), knownPlaces: experience.knownPlaces.slice(-120), highlights: experience.highlights.slice(-12) };
}

export function autoWorldEvents(before, after, config, context, state) {
  const regions = new Set(); const nations = new Set();
  const owners = after?.generatedWorld?.regionalDomains?.regionStates ?? {};
  const include = (place) => {
    if (!place) return;
    if (place.regionId) regions.add(place.regionId);
    const nation = owners[place.regionId]?.nationId ?? place.nationId;
    if (nation) nations.add(nation);
  };
  if (context && state) {
    const tile = getV3DetailedTile(context, state.player.x, state.player.y);
    include({ regionId: tile.region?.id, nationId: tile.nation?.id });
    for (const id of config.mode === "trade" ? [config.source, config.market] : [config.destination]) include(context.settlementById.get(id));
    for (const route of state.merchant?.company?.routes ?? []) {
      include(context.settlementById.get(route.sourceId));
      include(context.settlementById.get(route.destinationId));
    }
    if (state.military?.activeMission?.nationId) nations.add(state.military.activeMission.nationId);
  }
  if (config.watchNation) nations.add(config.watchNation);
  const all = config.worldScope === "all" || !context;
  const nationName = (id) => context?.runtime?.nationById?.get(id)?.name ?? id ?? "国家";
  const priorWars = new Set(before?.generatedWorld?.worldWars?.activeWars?.map((v) => v.id));
  const priorCrises = new Set(before?.externalCrises?.activeCrises?.map((v) => v.id));
  return [
    ...(after?.generatedWorld?.worldWars?.activeWars ?? []).filter((v) => !priorWars.has(v.id)).map((war) => {
      const relevant = all || nations.has(war.attackerNationId) || nations.has(war.defenderNationId) || war.fronts?.some((f) => regions.has(f.targetRegionId));
      return { relevant, stop: relevant && config.stopWar, message: `新しい戦争：${nationName(war.attackerNationId)}と${nationName(war.defenderNationId)}。${relevant ? "関係地域の通行・供給を確認してください。" : "遠方の出来事として記録。"}` };
    }),
    ...(after?.externalCrises?.activeCrises ?? []).filter((v) => !priorCrises.has(v.id)).map((crisis) => {
      const relevant = all || regions.has(crisis.regionId) || nations.has(owners[crisis.regionId]?.nationId ?? crisis.nationId);
      return { relevant, stop: relevant && config.stopCrisis, message: `新しい外部危機：${crisis.regionName ?? "地方"}の${crisis.name ?? "危機"}（危機度${crisis.severity ?? "不明"}）。${relevant ? "関係地域の市場供給・価格に影響します。" : "遠方の出来事として記録。"}` };
    }),
  ];
}

// Quote only recorded information. Never inspect an unvisited remote market.
export function autoTradePreview(state, config) {
  const reports = state.merchant?.trade?.marketReports ?? [];
  const report = (id) => reports.find((r) => r.settlementId === id && r.commodityId === config.commodity);
  const source = report(config.source); const target = report(config.market);
  const buy = source?.high;
  const sell = target?.sellPrice;
  return { source, target, cost: Number.isFinite(buy) ? round(buy * config.quantity) : null,
    profit: Number.isFinite(buy) && Number.isFinite(sell) ? round((sell - buy) * config.quantity) : null,
    warning: sell != null && sell < config.sellPrice ? `記録済み売価${sell}は売却下限${config.sellPrice}未満です。` : buy != null && buy > config.buyPrice ? `記録済み仕入価格${buy}は仕入上限${config.buyPrice}を超えています。` : "" };
}

export function autoNextGoal(state) {
  const trade = state.merchant?.trade;
  const company = state.merchant?.company;
  if (state.pendingEncounter) return { action: "field", text: "遭遇への対応を選ぶ" };
  if (state.military?.activeMission) return { action: "map", text: "受諾中の軍務を地図で確認する" };
  if (company?.status === "company") {
    if (!company.charters?.length) return { action: "commerce", text: "商会の営業資格を取得する" };
    if (!company.staff?.length) return { action: "commerce", text: "商会の責任者を雇う" };
    if (!company.routes?.length && !company.branches?.length) return { action: "commerce", text: "販路・支店を開いて月次経営へ進む" };
    return { action: "commerce", text: "商会の決算と販路を見直す" };
  }
  if ((trade?.knownSettlements?.length ?? 0) < 2) return { action: "commerce", text: `商会への一歩：二市場の相場を記録（${trade?.knownSettlements?.length ?? 0}/2）` };
  const units = trade?.stats?.unitsSold ?? 0; const profit = trade?.stats?.realizedProfit ?? 0;
  if (units >= 3 && profit >= 2 && state.player.gold >= 24) return { action: "commerce", text: "商会を設立できるようになりました" };
  return { action: "commerce", text: `商会へ：売却${units}/3個・利益${round(profit)}/2・資金${round(state.player.gold)}/24` };
}
