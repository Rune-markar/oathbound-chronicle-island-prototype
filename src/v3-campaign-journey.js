import { getV3DetailedTile } from "./v3-field-system.js";
import { civicPolicies } from "./v3-civic-policy.js";

export function campaignDistance(context, a, b) {
  if (!a || !b) return Infinity;
  const dx = Math.abs(a.x - b.x);
  return Math.min(dx, context.width - dx) + Math.abs(a.y - b.y);
}

export function campaignDirection(context, from, to) {
  if (!to) return "";
  let dx = to.x - from.x;
  if (Math.abs(dx) > context.width / 2) dx -= Math.sign(dx) * context.width;
  const dy = to.y - from.y;
  return [dy ? `${dy < 0 ? "北" : "南"}へ${Math.abs(dy)}` : "", dx ? `${dx < 0 ? "西" : "東"}へ${Math.abs(dx)}` : ""].filter(Boolean).join("・") || "現在地";
}

export function createV3CommissionSurvey(context, state) {
  const queue = [{ x: state.player.x, y: state.player.y, distance: 0 }];
  const seen = new Set([`${state.player.x},${state.player.y}`]);
  let fallback = queue[0];
  for (let index = 0; index < queue.length && index < 800; index += 1) {
    const point = queue[index];
    if (point.distance >= 4) fallback = point;
    if (point.distance >= 8) return { x: point.x, y: point.y, name: "委託された街道の見回り地点", complete: false };
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const x = (point.x + dx + context.width) % context.width, y = point.y + dy;
      const key = `${x},${y}`;
      if (y < 0 || y >= context.height || seen.has(key)) continue;
      seen.add(key);
      const tile = getV3DetailedTile(context, x, y);
      if (tile.passable && tile.region?.id === state.campaign.regionId) queue.push({ x, y, distance: point.distance + 1 });
    }
  }
  return { x: fallback.x, y: fallback.y, name: "集落周辺の見回り地点", complete: false };
}

// Dialogues expose concrete alternatives in the existing council. Each choice
// has durable consequences; the final scene also looks back at actual policies.
export function getV3FinalCouncil(state, facts, simulation) {
  const campaign = state.campaign;
  if (!campaign.route || campaign.ending) return null;
  const federal = campaign.route === "federation";
  const habitat = simulation?.civicState?.regions?.[campaign.regionId]?.habitatHealth ?? 50;
  const names = facts.nations.filter((nation) => campaign.diplomacy[nation.id]?.consent).map((nation) => nation.name);
  const delegates = names.slice(0, 3).join("、") || facts.region.name;
  const region = facts.region.name;
  const prior = civicPolicies(campaign.institutions).filter((policy) => policy.path === campaign.route).map((policy) => policy.label);
  const stage = campaign.finalStep;
  if (stage === 0) return {
    icon: "charter", title: federal ? "第一評議 · 連邦憲章" : "第一評議 · 帝国の布告", speaker: federal ? `${delegates}の代表団` : `${region}の行政官`,
    text: federal ? "憲章に署名する前に決めたい。地方の議決を優先するか、災害時の共同基金に権限を集めるか。誰が負担を引き受けるのだろう。" : "統一の宣言だけでは地方は従いません。再建の費用を先に負担するか、中央の徴税を優先するかを決めてください。",
    choices: federal ? [
      { id: "local-veto", label: "地方の拒否権を憲章に記す", description: "加盟国の議会が選んだ道を守る。自治+6・支持+4、恒常的な中央税収−5%。", cost: 8, autonomy: 6, support: 4, taxRate: -0.05 },
      { id: "shared-fund", label: "災害時の共同基金を設ける", description: "危機時の救援費を共同で積む。支持+6・自治−3、生息環境+6。", cost: 14, autonomy: -3, support: 6, habitat: 6 },
    ] : [
      { id: "rebuild-provinces", label: "地方の再建を先に約束する", description: "街道の状態+12、支持+8・自治+4。再建費を先に負担する。", cost: 18, support: 8, autonomy: 4, roadRepair: 12 },
      { id: "imperial-levy", label: "統一徴税を布告する", description: "恒常的な税収+8%、支持−6・自治−5。後の地方調整が重くなる。", cost: 8, support: -6, autonomy: -5, taxRate: 0.08 },
    ],
  };
  if (stage === 1) return {
    icon: "leviathan", title: "第二評議 · リヴァイアサンの生息域", speaker: "水辺の集落の代表と、深淵から届く声",
    text: `「水を分けるなら、その岸に暮らす者の行く末も引き受けよ。」${region}の生息環境は${Math.round(habitat)}。${campaign.institutions.includes("watershed-pact") ? "続けてきた共同保全の記録を、代表が協定の根拠として差し出した。" : "保全の制度がないため、集落は将来の負担を心配している。"}`,
    choices: federal ? [
      { id: "sanctuary", label: "聖域を残し、生息域協定を結ぶ", description: "木材生産−8%、洪水・山火事の圧力目標−5。生息環境+12、以後毎月+2。支持+5。", cost: Math.max(12, 26 - Math.floor(habitat / 10) - (campaign.institutions.includes("watershed-pact") ? 6 : 0)), support: 5, habitat: 12, sanctuary: true },
      { id: "shared-waterway", label: "監視員を置き、航路を共用する", description: "国境街道の輸送能力+15%。生息環境−6・支持+2、共同監視費は毎月1。", cost: 18 + Math.round(Math.max(0, 60 - habitat) / 5), support: 2, habitat: -6, shippingCharter: true, upkeep: 1 },
    ] : [
      { id: "evacuated-expedition", label: "集落を避難させて遠征する", description: "防備−20、支持−2、生息環境−8。避難と兵站に追加の費用をかける。", cost: 26, readiness: -20, support: -2, habitat: -8 },
      { id: "forced-expedition", label: "補給を集中して討伐を急ぐ", description: "防備−30、支持−10、生息環境−20。集落は徴発の負担を負う。", cost: 18, readiness: -30, support: -10, habitat: -20 },
    ],
  };
  const waterDecision = campaign.finalChoices?.find((choice) => choice.step === 1)?.label ?? "生息域をめぐる決定";
  return {
    icon: "covenant", title: "最終評議 · 女神と統治権", speaker: "女神の使者と、ここまでを共にした人々",
    text: `「この世界の裁定を、誰に委ねるのか。」${delegates}が返答を待っている。${prior.slice(0, 3).join("、")}と「${waterDecision}」が、あなたの答えを支える記録として読み上げられた。`,
    choices: federal ? [
      { id: "human-covenant", label: "女神への委任を拒み、共同の誓約を結ぶ", description: "自治+5・支持+4。代表団が毎年協議する義務を残す（毎月の費用0.5）。", cost: 8, autonomy: 5, support: 4, upkeep: 0.5 },
      { id: "free-assembly", label: "女神への委任を拒み、各地の議会へ託す", description: "自治+8・支持+2、中央税収−3%。地方がそれぞれの生活を選ぶ。", cost: 8, autonomy: 8, support: 2, taxRate: -0.03 },
    ] : [
      { id: "conditional-mandate", label: "地方の権利を付して女神の統治権を受ける", description: "支持+5・自治+5。権利の保全に毎月1を支出する。", cost: 14, support: 5, autonomy: 5, upkeep: 1 },
      { id: "divine-mandate", label: "統治権を女神に委ねる", description: "防備+10・自治−10。中央税収+5%、支持−3。", cost: 8, readiness: 10, autonomy: -10, support: -3, taxRate: 0.05 },
    ],
  };
}
