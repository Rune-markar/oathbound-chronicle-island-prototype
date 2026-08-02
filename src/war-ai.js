const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizedPower(force) {
  const army = force.army * (0.45 + force.training / 180) * (0.45 + force.organization / 180);
  const fleet = force.fleet * 42 * (0.4 + force.navalReadiness / 150);
  return army + fleet;
}

export function identifyCenterOfGravity(context) {
  const candidates = [
    {
      id: "strait",
      label: context.geography.straitName,
      value: context.geography.straitValue + context.enemy.fleet * 1.4,
      explanation: "艦隊と通商が集中する海峡。ここを失えば、相手は通航税と沿岸防衛を同時に維持できない。",
    },
    {
      id: "capital",
      label: context.enemy.capital,
      value: context.objective.scope === "total" ? 90 : 28,
      explanation: "政権中枢。ただし限定目的の戦争で首都を狙えば、必要以上の抵抗と介入を招く。",
    },
    {
      id: "coalition",
      label: "ヴァルカ諸侯の結束",
      value: context.enemy.cohesion + (context.objective.scope === "total" ? 25 : 0),
      explanation: "相手の戦意を支える政治的な結束。交渉と海上圧力でも弱められる。",
    },
  ];

  return candidates.sort((a, b) => b.value - a.value)[0];
}

export function evaluateWarDecision(context) {
  const ownPower = normalizedPower(context.own);
  const enemyPower = normalizedPower(context.enemy);
  const forceRatio = ownPower / Math.max(1, enemyPower);
  const forceScore = clamp((forceRatio - 1) * 52, -42, 42);
  const politicalScore = context.objective.politicalValue * 0.42;
  const legitimacyScore = (context.politics.justification - 50) * 0.42
    + (context.politics.support - 40) * 0.25;
  const seaScore = (context.geography.seaControl - 50) * 0.32
    + (context.geography.straitAccess - 50) * 0.24;
  const supplyScore = (context.logistics.supply - 50) * 0.38
    - context.logistics.distance * 0.2;
  const escalationPenalty = context.politics.escalationRisk * 0.45;
  const exhaustionPenalty = context.own.exhaustion * 0.58;
  const uncertaintyPenalty = (100 - context.intelligence) * 0.12;
  const total = politicalScore
    + legitimacyScore
    + forceScore
    + seaScore
    + supplyScore
    - escalationPenalty
    - exhaustionPenalty
    - uncertaintyPenalty;
  const center = identifyCenterOfGravity(context);
  const confidence = Math.round(clamp(38 + context.intelligence * 0.52, 40, 91));

  let posture = "回避";
  let summary = "政治目的に対して代償が大きい。外交と偵察を優先する。";
  if (total >= 18) {
    posture = "実行可能";
    summary = "限定目的を維持し、海峡と補給線へ戦力を集中するなら実行可能。";
  } else if (total >= 0) {
    posture = "条件付き";
    summary = "勝算はあるが、正当性・補給・情報のいずれかを先に改善すべき。";
  }

  const factors = [
    { label: "政治目的", value: Math.round(politicalScore), detail: context.objective.description },
    { label: "正当性", value: Math.round(legitimacyScore), detail: `開戦事由 ${context.politics.justification} / 支持 ${context.politics.support}` },
    { label: "戦力見積", value: Math.round(forceScore), detail: `推定戦力比 ${forceRatio.toFixed(2)} : 1` },
    { label: "海峡・海路", value: Math.round(seaScore), detail: `${context.geography.straitName}への接近 ${context.geography.straitAccess}` },
    { label: "補給", value: Math.round(supplyScore), detail: `遠征充足 ${context.logistics.supply} / 距離負担 ${context.logistics.distance}` },
    { label: "拡大リスク", value: -Math.round(escalationPenalty), detail: `周辺国介入 ${context.politics.escalationRisk}` },
  ];

  return {
    score: Math.round(total),
    posture,
    summary,
    confidence,
    forceRatio,
    center,
    factors,
    limit: context.objective.scope === "limited"
      ? `要求を「${context.objective.name}」に限定し、達成後は講和へ移る。`
      : "相手政権の屈服まで要求するため、長期化と第三国介入を見込む。",
  };
}

export function chooseOpponentAction(context) {
  if (context.enemy.organization < 34) {
    return { id: "entrench", label: "港砦に籠る", reason: "組織力を回復し、上陸側の補給消耗を待つ。" };
  }
  if (context.warScore > 28 && context.objective.scope === "limited") {
    return { id: "seek_terms", label: "限定講和を探る", reason: "海峡の保持費用が政治的利益を上回り始めている。" };
  }
  if (context.own.supply < 48) {
    return { id: "raid_supply", label: "輸送船団を襲う", reason: "主力決戦を避け、遠征軍の海上連絡線を断つ。" };
  }
  if (context.own.exhaustion > 42) {
    return { id: "counterstroke", label: "局地反撃", reason: "攻勢が限界に近いと判断し、白礁海峡で反撃する。" };
  }
  return { id: "screen", label: "海峡を警戒する", reason: "艦隊を温存しつつ、通航税徴収所と港砦を守る。" };
}

export function evaluatePeaceDecision(context) {
  const objectiveGain = context.warScore + context.objectiveProgress * 0.45;
  const continuedCost = context.own.exhaustion * 0.55
    + (100 - context.own.organization) * 0.22
    + Math.max(0, 55 - context.own.supply) * 0.4;
  const threshold = context.objective.scope === "limited" ? 28 : 58;
  const accept = objectiveGain >= threshold || continuedCost >= 48;
  const culminatingRisk = Math.round(clamp(
    context.own.exhaustion * 0.7
      + (100 - context.own.supply) * 0.45
      + Math.max(0, context.warScore - 35) * 0.25,
    0,
    100,
  ));

  return {
    accept,
    objectiveGain: Math.round(objectiveGain),
    continuedCost: Math.round(continuedCost),
    culminatingRisk,
    recommendation: accept
      ? "得られる政治的成果を確定し、講和へ移るべき。"
      : "要求を通すには圧力が不足している。ただし補給悪化時は白紙講和を検討する。",
  };
}
