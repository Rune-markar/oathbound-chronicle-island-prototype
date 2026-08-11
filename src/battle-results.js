import { getBattleSummary, hasSafeRetreatCorridor } from "./tactical-battle.js";
export { hasSafeRetreatCorridor } from "./tactical-battle.js";

const DEFEATED_STATES = new Set(["ROUTED", "DESTROYED", "ESCAPED"]);

function sideResult(battle, side, summary) {
  const units = battle.units.filter((unit) => unit.side === side);
  const initialSoldiers = units.reduce((sum, unit) => sum + unit.maxSoldierCount, 0);
  const remainingSoldiers = units.reduce((sum, unit) => sum + unit.soldierCount, 0);
  const initialHp = units.reduce((sum, unit) => sum + unit.maxHp, 0);
  const remainingHp = units.reduce((sum, unit) => sum + unit.hp, 0);
  return {
    side,
    units: units.length,
    standing: summary.standing,
    initialSoldiers,
    remainingSoldiers,
    casualties: Math.max(0, initialSoldiers - remainingSoldiers),
    initialHp: Math.round(initialHp),
    remainingHp: Math.max(0, Math.round(remainingHp)),
    hpLoss: Math.max(0, Math.round(initialHp - remainingHp)),
    members: units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      tags: [...unit.tags],
      maxHp: Math.round(unit.maxHp),
      remainingHp: Math.max(0, Math.round(unit.hp)),
      state: unit.state,
    })),
    destroyed: units.filter((unit) => unit.state === "DESTROYED").length,
    routed: units.filter((unit) => unit.state === "ROUTED").length,
    escaped: units.filter((unit) => unit.state === "ESCAPED").length,
    morale: summary.morale,
    supply: summary.supply,
  };
}

export function evaluateCompleteEncirclement(battle) {
  if (!battle?.winner || battle.winner === "draw") {
    return { complete: false, winningSide: null, losingSide: null, reasons: ["勝者が確定していません"] };
  }
  const winningSide = battle.winner;
  const losingSide = winningSide === "player" ? "enemy" : "player";
  const defeatedUnits = battle.units.filter((unit) => unit.side === losingSide);
  const standing = defeatedUnits.filter((unit) => !DEFEATED_STATES.has(unit.state));
  const escaped = defeatedUnits.filter((unit) => unit.state === "ESCAPED");
  const routedWithCorridor = defeatedUnits.filter((unit) => (
    unit.state === "ROUTED" && hasSafeRetreatCorridor(battle, losingSide, unit.position, winningSide)
  ));
  const commander = battle.commanders.find((candidate) => candidate.side === losingSide && candidate.status === "ACTIVE") ?? null;
  const commanderHasCorridor = commander
    ? hasSafeRetreatCorridor(battle, losingSide, commander.position, winningSide)
    : true;
  const complete = standing.length === 0 && escaped.length === 0 && routedWithCorridor.length === 0 && Boolean(commander) && !commanderHasCorridor;
  const reasons = [];
  reasons.push(standing.length ? `戦闘継続部隊 ${standing.length}` : "敵戦闘部隊を無力化");
  reasons.push(escaped.length ? `戦場離脱 ${escaped.length}部隊` : "戦場離脱なし");
  reasons.push(routedWithCorridor.length ? `退路を残す潰走部隊 ${routedWithCorridor.length}` : "潰走部隊の退路なし");
  reasons.push(commanderHasCorridor ? "敵将に退路あり" : "敵将の退路を遮断");
  return {
    complete,
    winningSide,
    losingSide,
    commanderId: commander?.id ?? null,
    commanderHasCorridor,
    escapedUnits: escaped.length,
    routedWithCorridor: routedWithCorridor.length,
    reasons,
  };
}

export function createBattleResult(battle) {
  if (!battle?.winner) throw new Error("戦闘終了後でなければリザルトを作成できません");
  const summary = getBattleSummary(battle);
  const encirclement = evaluateCompleteEncirclement(battle);
  const player = sideResult(battle, "player", summary.player);
  const enemy = sideResult(battle, "enemy", summary.enemy);
  const crossings = battle.log.filter((entry) => /渡河/.test(entry.message)).length;
  const capturedCommander = encirclement.complete && battle.winner === "player"
    ? battle.commanders.find((commander) => commander.id === encirclement.commanderId) ?? null
    : null;
  return {
    id: `${battle.id}-result-${battle.turn}`,
    battleId: battle.id,
    battleName: battle.name,
    turn: battle.turn,
    winner: battle.winner,
    resultType: encirclement.complete ? "encirclement_annihilation" : battle.winner === "draw" ? "draw" : "field_victory",
    title: encirclement.complete
      ? "完全包囲・敵軍撃滅"
      : battle.winner === "draw"
        ? "両軍戦闘不能"
        : battle.winner === "player" ? "王国軍勝利" : "公国軍勝利",
    player,
    enemy,
    crossings,
    encirclement,
    capture: {
      eligible: Boolean(capturedCommander),
      commanderId: capturedCommander?.id ?? null,
      commanderName: capturedCommander?.name ?? null,
      commanderIconUrl: capturedCommander?.iconUrl ?? null,
      reason: capturedCommander
        ? "全退路を遮断した状態で敵軍を無力化したため、敵将を生け捕りにしました。"
        : battle.winner === "player"
          ? "敵将または潰走部隊に退路が残ったため、捕縛には至りませんでした。"
          : "捕縛判定は王国軍勝利時のみ行われます。",
    },
  };
}

export const battleResultInternals = Object.freeze({ hasSafeRetreatCorridor });
