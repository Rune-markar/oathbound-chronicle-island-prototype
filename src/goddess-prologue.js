export const GODDESS_NAME = "女神イリシア";

export const GODDESS_MISSION = "迷える子羊よ、あなたに使命を授けます。生れ落ちた世界を統べなさい。そして強大な敵を打ち滅ぼすのです。";

export const GODDESS_ARRIVAL_LINES = Object.freeze([
  "……目を開きなさい、迷える魂よ。ここは生と生の狭間、まだ名も歴史も持たぬ女神の庭です。",
  GODDESS_MISSION,
  "あなたが降り立つ世界は、今ここで定めます。星の並びをひとつのシードへ結び、地形も国々も、あなたのために生み落としましょう。",
]);

export const GODDESS_GENERATION_LINES = Object.freeze([
  "選び取った姿と才は、魂へ刻みました。もはや別の者として生まれ直すことはできません。",
  "大地を隆起させ、海と河川を巡らせています。あなたがまだ見ぬ国々にも、すでに最初の歴史が芽吹いています。",
  "種族は住むべき土地を求め、集落は道を結び、やがて国家は互いの境界を知るでしょう。",
  "忘れないで。力だけで世界を束ねるのか、異なる声を抱いたまま結ぶのか。その答えは、あなた自身が示すのです。",
]);

export const GODDESS_DEPARTURE_LINE = "世界は整いました。さあ、お行きなさい。次に目を開く時、あなたはその大地に生れ落ちています。";

export const WORLD_ENDING_DESIGN = Object.freeze([
  Object.freeze({
    id: "rational-world-empire",
    number: 1,
    title: "超合理国家による世界帝国",
    condition: "超合理国家として世界帝国を成立させ、リヴァイアサンを打ち滅ぼす。",
  }),
  Object.freeze({
    id: "pluralist-world-federation",
    number: 2,
    title: "多元主義を基幹とする世界連邦",
    condition: "多元主義を基幹とする世界連邦を成立させ、リヴァイアサンと和解し、女神の軍勢を退ける。",
  }),
]);

export function createGoddessPrologueState() {
  return {
    active: false,
    phase: "idle",
    line: "",
    lineNumber: 0,
    lineTotal: 0,
    generationReady: false,
  };
}
