import { getV3CurrentMarket } from "./v3-merchant-system.js";
import { campaignDistance, campaignDirection } from "./v3-campaign-journey.js";

export const V3_SCENES = Object.freeze({
  village: "./assets/generated/adventure/village.png",
  forest: "./assets/generated/adventure/dungeon-forest.png",
  water: "./assets/generated/adventure/dungeon-spring.png",
  cave: "./assets/generated/adventure/dungeon-cave.png",
  wilds: "./assets/generated/v3/launch-hero.webp",
  council: "./assets/generated/adventure/guild.png",
  leviathan: "./assets/generated/enemy-leviathan.png",
  covenant: "./assets/generated/goddess-ilysia.png",
});

export function getV3Scene(tile) {
  if (tile.type.startsWith("settlement-") || tile.type === "farmland") return "village";
  if (["forest", "floating-island"].includes(tile.type)) return "forest";
  if (["water", "shoal", "river", "spring", "oasis", "marsh", "canal"].includes(tile.type)) return "water";
  if (["cave", "mine", "ruins", "crater", "volcano"].includes(tile.type)) return "cave";
  return "wilds";
}

export function getV3AdventureObjective(context, state, location) {
  const campaign = state.campaign ?? {}, stage = campaign.stage ?? "wanderer";
  const market = ["wanderer", "commissioned"].includes(stage) ? getV3CurrentMarket(context, state) : null;
  const travel = (target, name, destination, chapter, text) => ({ chapter, title: name, text,
    detail: `${campaignDirection(context, state.player, target)}マス`, action: "travel", destination, button: "ここを目指す" });
  if (stage === "commissioned") {
    if (campaign.survey && !campaign.survey.complete && campaignDistance(context, state.player, campaign.survey) > 1) {
      return travel(campaign.survey, "街道の見回りへ", "commission", "II · 地域との約束", "巡回役の依頼を果たし、集落へ成果を持ち帰ろう。");
    }
    if (campaign.survey?.complete && market?.regionId !== campaign.regionId) {
      const home = context.settlementById.get(campaign.homeMarketId);
      if (home) return travel({ x: home.detailX, y: home.detailY }, `${home.name}へ帰ろう`, home.id, "II · 地域との約束", "見回りの成果を伝え、住民の声に応えよう。");
    }
    return { chapter: "II · 地域との約束", title: campaign.survey?.complete ? "人々の信頼をつなぐ" : "見回り地点に着いた", text: "この地でできる仕事を選び、地方を任される実績を積もう。", action: "campaign", button: "現地の依頼を見る" };
  }
  if (stage === "wanderer") {
    const nearest = location.nearestSettlement?.settlement;
    if (!market && nearest) return travel({ x: nearest.detailX, y: nearest.detailY }, `${nearest.name}を目指そう`, nearest.id, "I · 名もなき旅人", "集落では仕事と商売が待つ。道中の出会いも、あなたの財産になる。");
    return { chapter: "I · 名もなき旅人", title: market ? `${market.name}で暮らしを始める` : "まだ見ぬ集落へ", text: market ? "仕事で銀貨を得るか、商品を運ぶか。小さな実績が、地方への道を開く。" : "霧の向こうへ歩き、足場になる集落を見つけよう。", action: "campaign", button: market ? "この地の仕事を見る" : "旅の目標を見る" };
  }
  return campaign.ending
    ? { chapter: "V · 年代記は続く", title: campaign.ending === "empire" ? "女神の帝国、その後へ" : "自由な自治連邦、その後へ", text: "残した約束が暮らしを変える。次の月、次の土地へ旅を続けよう。", action: "campaign", button: "世界に残したものを見る" }
    : stage === "governor"
      ? { chapter: "III · 地方を預かる", title: "暮らしを、あなたの手で変える", text: "食料、街道、防備。異なる対策の成果を重ね、自治への信頼を得よう。", action: "campaign", button: "評議会を開く" }
      : { chapter: "IV · 世界との誓約", title: campaign.route === "empire" ? "諸地方をひとつの帝国へ" : campaign.route === "federation" ? "諸国と自由な連邦を結ぶ" : "どんな国を残すか", text: "制度と外交で未来を選ぶ。相手の暮らしと、引き受ける負担を見極めよう。", action: "campaign", button: "国の行方を選ぶ" };
}

export const pointKey = (tile) => `${tile.x},${tile.y}`;
export function describeV3FieldPoint(tile, state) {
  const entity = tile.entity;
  const quest = state.campaign?.survey;
  const survey = quest && !quest.complete && quest.x === tile.x && quest.y === tile.y;
  const distance = Math.abs(tile.dx) + Math.abs(tile.dy);
  const bearing = [tile.dy ? `${tile.dy < 0 ? "北" : "南"}${Math.abs(tile.dy)}` : "", tile.dx ? `${tile.dx < 0 ? "西" : "東"}${Math.abs(tile.dx)}` : ""].filter(Boolean).join("・") || "足元";
  const kind = survey ? "quest" : entity?.type ?? (tile.type.startsWith("settlement-") && tile.type !== "settlement-ground" ? "settlement" : "terrain");
  const icon = ({ quest: "quest", item: "star", npc: "support", enemy: "sword", crisis: "warning", settlement: "commerce" })[kind] ?? "map";
  const label = ({ quest: "依頼", item: "採集", npc: "出会い", enemy: "敵影", crisis: "危機", settlement: "集落", terrain: "地形" })[kind];
  const reward = entity?.type === "item" ? (entity.gold ? `銀貨 +${entity.gold}` : entity.heal ? `道具 · HPを${entity.heal}回復` : "持ち物に加わる")
    : entity?.type === "enemy" ? `勝利で経験 +${entity.xp}・銀貨 +${entity.gold}`
      : entity?.type === "npc" ? (entity.role === "merchant" ? `薬草 · 銀貨${entity.price ?? 5}` : "話を聞ける")
        : kind === "settlement" ? "仕事・市場・地方の依頼" : survey ? "現地で見回りか補修を選べる" : tile.terrainNote;
  return { key: pointKey(tile), tile, kind, icon, label, bearing, distance,
    name: survey ? quest.name : entity?.name ?? tile.name, reward,
    description: entity?.purpose?.reason ?? entity?.message ?? tile.terrainNote,
    danger: ["enemy", "crisis"].includes(kind), level: entity?.level };
}

export function getV3FieldPoints(view, state) {
  const seenSettlements = new Set();
  return view.tiles.filter((tile) => tile.visible && tile.generated).map((tile) => describeV3FieldPoint(tile, state))
    .filter((point) => point.kind !== "terrain")
    .sort((a, b) => Number(b.kind === "quest") - Number(a.kind === "quest") || a.distance - b.distance || a.key.localeCompare(b.key))
    .filter((point) => {
      if (point.kind !== "settlement") return true;
      const key = point.tile.settlement?.id ?? point.name;
      if (seenSettlements.has(key)) return false;
      seenSettlements.add(key); return true;
    });
}

// This guide searches only visible, generated tiles. It returns one ordinary
// move, never a teleport or an action against a remote subject. Other actors
// block intermediate routes so a pickup guide cannot silently enter a fight.
export function getV3KnownRoute(view, targetKey) {
  const target = view.tiles.find((tile) => pointKey(tile) === targetKey && tile.visible && tile.generated && tile.passable);
  if (!target || target.player) return null;
  const tiles = new Map(view.tiles.filter((tile) => tile.visible && tile.generated && tile.passable).map((tile) => [`${tile.dx},${tile.dy}`, tile]));
  const queue = [{ x: 0, y: 0, first: null, steps: 0 }], seen = new Set(["0,0"]);
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    for (const [dx, dy, direction] of [[0, -1, "north"], [1, 0, "east"], [0, 1, "south"], [-1, 0, "west"]]) {
      const x = point.x + dx, y = point.y + dy, key = `${x},${y}`, tile = tiles.get(key);
      if (!tile || seen.has(key)) continue;
      seen.add(key);
      const first = point.first ?? direction, steps = point.steps + 1;
      if (pointKey(tile) === targetKey) return { direction: first, steps };
      if (tile.entity && tile.entity.type !== "item") continue;
      queue.push({ x, y, first, steps });
    }
  }
  return null;
}

export function snapshotV3Adventure(state, location) {
  return { hp: state.player.hp, xp: state.player.xp, gold: state.player.gold, level: state.player.level,
    items: state.collectedTiles.length, defeated: state.defeatedTiles.length, talked: state.interactedTiles.length,
    stage: state.campaign?.stage, ending: state.campaign?.ending, steps: state.steps,
    settlement: location.tile.type.startsWith("settlement-") ? location.tile.settlement?.id : null,
    settlementName: location.tile.settlement?.name, enemy: state.pendingEncounter?.type === "enemy",
    enemyKey: state.pendingEncounter?.tileKey, enemyHp: state.pendingEncounter?.hp,
    discovered: state.discoveredTiles.length, message: state.messageLog[0] };
}

export function getV3AdventureFeedback(before, after) {
  if (!before) return null;
  const changes = ["gold", "xp", "hp"].filter((key) => after[key] !== before[key]).map((key) => ({ key, delta: Math.round((after[key] - before[key]) * 100) / 100 }));
  const enemyDamage = before.enemy && ((after.enemy && before.enemyKey === after.enemyKey) || after.defeated > before.defeated)
    ? Math.max(0, before.enemyHp - (after.enemy ? after.enemyHp : 0)) : 0;
  let title = "", kind = "discovery";
  if (after.level > before.level) { title = `LEVEL UP · Lv.${after.level}`; kind = "level"; }
  else if (after.stage !== before.stage || after.ending !== before.ending) { title = "あなたの物語が進んだ"; kind = "milestone"; }
  else if (after.defeated > before.defeated) { title = "VICTORY · 戦利品を手にした"; kind = "victory"; }
  else if (after.hp < before.hp) { title = "傷を負った"; kind = "damage"; }
  else if (after.items > before.items) title = "道中の発見を手にした";
  else if (after.settlement && after.settlement !== before.settlement) title = `${after.settlementName}に到着`;
  else if (after.talked > before.talked) title = "新しい出会いを旅の記録に";
  else if (changes.length) { title = after.hp > before.hp ? "体力が回復した" : "旅の成果"; kind = "reward"; }
  else if (after.enemy && !before.enemy) { title = "敵が行く手を阻んだ"; kind = "danger"; }
  else if (enemyDamage > 0) { title = "攻撃が命中した"; kind = "combat"; }
  if (!title) return null;
  return { title, kind, changes, enemyDamage, message: after.message };
}
