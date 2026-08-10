export const CAPTURE_RESPONSES = Object.freeze({
  SUICIDE: "suicide",
  SUBMIT: "submit",
  PERSUASION: "persuasion",
});

export const DISPOSITION_STATUSES = Object.freeze({
  DECEASED: "DECEASED",
  JOINED: "JOINED",
  PERSUADING: "PERSUADING",
  INTERNED: "INTERNED",
  RELEASED: "RELEASED",
});

export const PERSUASION_APPROACHES = Object.freeze({
  honor: Object.freeze({ id: "honor", name: "名誉を保証する", description: "旧主への忠節を否定せず、新しい奉公の名分を整える。", baseProgress: 28 }),
  clemency: Object.freeze({ id: "clemency", name: "寛大な待遇", description: "部下と家族の安全を保証し、敵意を時間とともに解く。", baseProgress: 24 }),
  bargain: Object.freeze({ id: "bargain", name: "現実的な条件提示", description: "地位・任務・領地の条件を明示し、利害から帰順を促す。", baseProgress: 22 }),
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function profileFor(commander) {
  const source = commander.postBattleProfile ?? {};
  return {
    captureResponse: Object.values(CAPTURE_RESPONSES).includes(source.captureResponse)
      ? source.captureResponse
      : CAPTURE_RESPONSES.PERSUASION,
    resolve: clamp(source.resolve ?? commander.bravery ?? 60, 0, 100),
    loyalty: clamp(source.loyalty ?? 65, 0, 100),
    preferredApproach: PERSUASION_APPROACHES[source.preferredApproach] ? source.preferredApproach : "honor",
    persuasionTarget: clamp(source.persuasionTarget ?? 100, 40, 180),
    reason: source.reason ?? "敗北後も旧主への義理と自軍の将来を秤にかけている。",
    recruitmentRole: source.recruitmentRole ?? "軍事顧問",
  };
}

export function createCommanderDispositionCase({ commander, battleResult }) {
  if (!battleResult?.capture?.eligible || battleResult.capture.commanderId !== commander?.id) {
    throw new Error("完全包囲で捕縛された将官だけが戦後処遇の対象です");
  }
  const profile = profileFor(commander);
  const base = {
    id: `${battleResult.id}-${commander.id}-disposition`,
    battleResultId: battleResult.id,
    commanderId: commander.id,
    commanderName: commander.name,
    commanderIconUrl: commander.iconUrl ?? null,
    traits: [...(commander.traits ?? [])],
    profile,
    elapsedMonths: 0,
    persuasionProgress: 0,
    persuasionTarget: profile.persuasionTarget,
    status: DISPOSITION_STATUSES.PERSUADING,
    outcome: null,
    log: [],
  };
  if (profile.captureResponse === CAPTURE_RESPONSES.SUICIDE) {
    base.status = DISPOSITION_STATUSES.DECEASED;
    base.outcome = "suicide";
    base.log.push({ month: 0, message: `${commander.name}は捕縛直後、降伏を拒みその場で自害しました。` });
  } else if (profile.captureResponse === CAPTURE_RESPONSES.SUBMIT) {
    base.status = DISPOSITION_STATUSES.JOINED;
    base.outcome = "submitted";
    base.persuasionProgress = base.persuasionTarget;
    base.log.push({ month: 0, message: `${commander.name}は旧主との縁を断ち、王国への帰順を申し出ました。` });
  } else {
    base.log.push({ month: 0, message: `${commander.name}を戦後処遇局へ移送しました。説得には時間が必要です。` });
  }
  return base;
}

export function advanceCommanderPersuasion(caseState, approachId) {
  const approach = PERSUASION_APPROACHES[approachId];
  if (!approach) throw new Error("説得方針が不明です");
  if (caseState.status !== DISPOSITION_STATUSES.PERSUADING) throw new Error("この将官への説得はすでに終了しています");
  const next = structuredClone(caseState);
  const preferredBonus = next.profile.preferredApproach === approach.id ? 12 : 0;
  const resistance = Math.round((next.profile.resolve + next.profile.loyalty) / 18);
  const progress = Math.max(8, approach.baseProgress + preferredBonus - resistance);
  next.elapsedMonths += 1;
  next.persuasionProgress = clamp(next.persuasionProgress + progress, 0, next.persuasionTarget);
  next.log.push({
    month: next.elapsedMonths,
    approachId: approach.id,
    progress,
    message: `「${approach.name}」を軸に説得。帰順交渉が${progress}進展しました。`,
  });
  if (next.persuasionProgress >= next.persuasionTarget) {
    next.status = DISPOSITION_STATUSES.JOINED;
    next.outcome = "persuaded";
    next.log.push({ month: next.elapsedMonths, message: `${next.commanderName}は${next.profile.recruitmentRole}として王国へ帰順しました。` });
  }
  return next;
}

export function finalizeCommanderDisposition(caseState, decision) {
  if (caseState.status !== DISPOSITION_STATUSES.PERSUADING) throw new Error("この将官の処遇はすでに確定しています");
  if (!['intern', 'release'].includes(decision)) throw new Error("処遇方針が不明です");
  const next = structuredClone(caseState);
  if (decision === "intern") {
    next.status = DISPOSITION_STATUSES.INTERNED;
    next.outcome = "interned";
    next.log.push({ month: next.elapsedMonths, message: `${next.commanderName}を長期収監とし、軍務から隔離しました。` });
  } else {
    next.status = DISPOSITION_STATUSES.RELEASED;
    next.outcome = "released";
    next.log.push({ month: next.elapsedMonths, message: `${next.commanderName}を宣誓と身代金の条件付きで釈放しました。` });
  }
  return next;
}

export function getDispositionLabel(caseState) {
  return {
    [DISPOSITION_STATUSES.DECEASED]: "自害・死亡",
    [DISPOSITION_STATUSES.JOINED]: caseState.outcome === "submitted" ? "即時帰順" : "説得成功・帰順",
    [DISPOSITION_STATUSES.PERSUADING]: "説得継続中",
    [DISPOSITION_STATUSES.INTERNED]: "長期収監",
    [DISPOSITION_STATUSES.RELEASED]: "条件付き釈放",
  }[caseState.status] ?? caseState.status;
}
