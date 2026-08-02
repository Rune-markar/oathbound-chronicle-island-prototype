const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const WAR_PLANS = Object.freeze({
  defend: {
    id: "defend", name: "防衛線保持", roles: ["attacker", "defender"],
    description: "城壁・峠・渡河点を結び、領土と兵力を守る。戦果は小さいが損耗と破壊を抑える。",
    pressure: 0, foodCost: 720, exhaustion: 0.5, ownLoss: -13, enemyLoss: 2,
    targetDamage: 0.15, homeDamage: 0.25, displacement: 5, civilianLoss: 0,
  },
  interdict: {
    id: "interdict", name: "補給遮断", roles: ["attacker"],
    description: "橋・倉庫・街道を断ち、敵軍の継戦能力を削る。民生物流にも損害が及ぶ。",
    pressure: 5, foodCost: 1450, exhaustion: 1.6, ownLoss: -2, enemyLoss: 4,
    targetDamage: 2.4, homeDamage: 0.15, displacement: 70, civilianLoss: 2,
  },
  pass: {
    id: "pass", name: "要地攻略", roles: ["attacker"],
    description: "灰冠峠と関所に攻撃を集中する。限定目的に適し、破壊範囲を比較的狭く保つ。",
    pressure: 3, foodCost: 1080, exhaustion: 1, ownLoss: 0, enemyLoss: 2,
    targetDamage: 1.1, homeDamage: 0.1, displacement: 24, civilianLoss: 1,
  },
  siege: {
    id: "siege", name: "城砦攻囲", roles: ["attacker"],
    description: "城砦と政庁を包囲する。戦果と同時に、施設破壊・避難民・戦後復興費を増やす。",
    pressure: 8, foodCost: 2050, exhaustion: 3.2, ownLoss: 5, enemyLoss: 8,
    targetDamage: 5.2, homeDamage: 0.2, displacement: 190, civilianLoss: 7,
  },
  counterattack: {
    id: "counterattack", name: "機動反撃", roles: ["defender"],
    description: "侵攻軍の側面と補給線へ反撃する。成功時は戦線を押し戻すが、守備陣地を薄くする。",
    pressure: 6, foodCost: 1280, exhaustion: 1.8, ownLoss: 2, enemyLoss: 7,
    targetDamage: 1.2, homeDamage: 0.8, displacement: 20, civilianLoss: 1,
  },
  scorched_defense: {
    id: "scorched_defense", name: "焦土遅滞", roles: ["defender"],
    description: "自国の橋・倉庫・収穫物を破壊して敵の補給を拒む。軍事効果と引き換えに住民生活を損なう。",
    pressure: 8, foodCost: 420, exhaustion: 2.6, ownLoss: -4, enemyLoss: 5,
    targetDamage: 0.4, homeDamage: 5.8, displacement: 230, civilianLoss: 5,
    legitimacy: -3,
  },
});

export const PEACE_SETTLEMENTS = Object.freeze({
  ceasefire: {
    id: "ceasefire", name: "停戦・相互撤兵",
    description: "占領地を返還し、現在の戦線で戦闘を止める。目的は達成できないが追加損失を防ぐ。",
  },
  objective: {
    id: "objective", name: "当初目的による講和",
    description: "開戦時に示した要求だけを条約化する。限定戦争では最も正統性を保ちやすい。",
  },
  occupation: {
    id: "occupation", name: "軍事占領を継続",
    description: "敵政権の中枢地域を軍政下に置く。長期の駐屯、抵抗、復興と統合政策を引き受ける。",
  },
});

export const OCCUPATION_POLICIES = Object.freeze({
  autonomy: {
    id: "autonomy", name: "自治保障",
    description: "在地法と自治評議会を残す。収入と同化は遅いが、抵抗と避難を抑える。",
    control: -0.3, resistance: -3.2, integration: 0.9, assimilation: 0.1,
    infrastructure: 0.7, moneyCost: 2, foodCost: 170, legitimacy: 0.25,
    relation: 0, displacement: -18, revenue: 0.5,
  },
  integration: {
    id: "integration", name: "漸進統合",
    description: "二言語行政、共通税制、参政権を段階的に導入する。費用をかけて制度統合を進める。",
    control: 0.5, resistance: -1.4, integration: 2.4, assimilation: 0.7,
    infrastructure: 1.3, moneyCost: 4, foodCost: 220, legitimacy: 0,
    relation: -0.2, displacement: -8, revenue: 0.9,
  },
  assimilation: {
    id: "assimilation", name: "強制同化",
    description: "言語・教育・宗教・姓名を急速に統一する。指標上の同化は進むが、抵抗・流出・外交非難を招く。",
    control: 1.2, resistance: 3.4, integration: 1.1, assimilation: 3.5,
    infrastructure: 0.1, moneyCost: 3, foodCost: 250, legitimacy: -1.1,
    relation: -2, displacement: 75, revenue: 1.2,
  },
  military: {
    id: "military", name: "直接軍政",
    description: "戒厳令と検問で短期支配を優先する。統制は上がるが、抵抗と駐屯費が積み上がる。",
    control: 3.2, resistance: 1.8, integration: 0.15, assimilation: 0,
    infrastructure: -0.4, moneyCost: 3, foodCost: 360, legitimacy: -0.55,
    relation: -1, displacement: 32, revenue: 1,
  },
  reconstruction: {
    id: "reconstruction", name: "復興優先",
    description: "住居、街道、農地を先に復旧する。費用は大きいが、抵抗と戦争被害を着実に減らす。",
    control: 0.4, resistance: -2.5, integration: 1.5, assimilation: 0.25,
    infrastructure: 3.8, moneyCost: 7, foodCost: 300, legitimacy: 0.2,
    relation: 0.2, displacement: -42, revenue: 0.2,
  },
});

export function getWarPlanOptions(side = "attacker") {
  return Object.values(WAR_PLANS).filter((plan) => plan.roles.includes(side));
}

export function getWarStage(war) {
  if (!war) return null;
  if (war.months === 0) return { id: "opening", name: "開戦準備" };
  if (war.score <= -45) return { id: "collapse", name: war.side === "defender" ? "防衛線危機" : "撤退局面" };
  if (war.score >= 55 || war.objectiveProgress >= 80) return { id: "settlement", name: "終戦条件形成" };
  if (war.months >= 7 || (war.peace?.culminatingRisk ?? 0) >= 70) return { id: "culmination", name: "攻勢限界" };
  return { id: "campaign", name: war.side === "defender" ? "国土防衛戦" : "攻防継続" };
}

export function getPeaceOptions(state) {
  if (!state.war) return [];
  const war = state.war;
  const objective = state.warObjective;
  const elapsed = war.months >= 1;
  const objectiveSuccess = war.side === "defender"
    ? war.score >= 0 || war.objectiveProgress >= 45
    : war.score >= objective.targetScore * 0.55 || war.objectiveProgress >= 45;
  const overwhelming = war.side === "attacker"
    && objective.scope === "total"
    && (war.score >= objective.targetScore * 0.82 || war.objectiveProgress >= 75);
  return [
    {
      ...PEACE_SETTLEMENTS.ceasefire,
      allowed: elapsed,
      reason: elapsed ? "追加要求を放棄して停戦できます。" : "最初の戦況確定後に提示できます。",
    },
    {
      ...PEACE_SETTLEMENTS.objective,
      allowed: elapsed && objectiveSuccess,
      reason: objectiveSuccess ? "戦況は当初目的を条約化できる水準です。" : "戦勝点または目的達成度が不足しています。",
    },
    {
      ...PEACE_SETTLEMENTS.occupation,
      allowed: elapsed && overwhelming,
      reason: overwhelming ? "敵中枢を占領統治へ移せます。" : "全面目的と圧倒的な戦果が必要です。",
    },
  ];
}

export function occupationPolicyOutcome(occupation, policyId, supplied = true) {
  const policy = OCCUPATION_POLICIES[policyId];
  if (!policy) throw new Error("占領政策が不明です");
  const garrisonCoverage = clamp(occupation.garrison / Math.max(1, occupation.requiredGarrison), 0, 1.4);
  const damageBurden = Math.max(0, 55 - occupation.infrastructure) / 35;
  const resistancePressure = (1 - Math.min(1, garrisonCoverage)) * 4 + damageBurden * 1.4 + (supplied ? 0 : 4);
  return {
    control: policy.control + (garrisonCoverage - 0.75) * 2 - (supplied ? 0 : 2),
    resistance: policy.resistance + resistancePressure,
    integration: policy.integration * (0.65 + occupation.control / 180),
    assimilation: policy.assimilation * (0.6 + occupation.control / 200),
    infrastructure: policy.infrastructure,
    displaced: policy.displacement,
    moneyCost: policy.moneyCost,
    foodCost: policy.foodCost,
    legitimacy: policy.legitimacy,
    relation: policy.relation,
    revenue: policy.revenue * (occupation.control / 100) * (occupation.infrastructure / 100),
  };
}
