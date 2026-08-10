const EFFECT_KIND_BY_PHASE = Object.freeze({
  ranged: "ranged",
  magic: "magic",
  melee: "melee",
  charge_reaction: "charge",
  pursuit: "charge",
  movement: "impact",
  fatigue_status: "fire",
});

function copyPosition(position) {
  return position ? { x: position.x, y: position.y } : null;
}

function positionChanged(before, after) {
  return Boolean(before && after && (before.x !== after.x || before.y !== after.y));
}

function findDamageLog(after, target) {
  return [...(after.log ?? [])]
    .reverse()
    .find((entry) => entry.turn === after.turn && entry.message.includes(`→ ${target.name}：`));
}

function findSourceUnit(before, after, target, entry) {
  if (!entry) return null;
  const beforeById = new Map((before.units ?? []).map((unit) => [unit.id, unit]));
  return [...(after.units ?? [])]
    .filter((unit) => unit.id !== target.id && entry.message.includes(unit.name))
    .sort((left, right) => right.name.length - left.name.length)
    .map((unit) => ({ ...unit, position: copyPosition(unit.position ?? beforeById.get(unit.id)?.position) }))
    .find((unit) => unit.position) ?? null;
}

/**
 * Builds presentation-only events from two immutable turn snapshots.
 * Combat rules remain independent from animation timing and DOM state.
 */
export function buildTacticalEffects(before, after) {
  const effects = { turn: after?.turn ?? 0, movements: [], impacts: [], statuses: [] };
  if (!before?.units || !after?.units) return effects;

  const beforeUnits = new Map(before.units.map((unit) => [unit.id, unit]));
  after.units.forEach((unit) => {
    const previous = beforeUnits.get(unit.id);
    if (!previous) return;

    if (positionChanged(previous.position, unit.position)) {
      effects.movements.push({
        actorId: unit.id,
        actorType: "unit",
        side: unit.side,
        from: copyPosition(previous.position),
        to: copyPosition(unit.position),
      });
    }

    const casualties = Math.max(0, previous.soldierCount - unit.soldierCount);
    if (casualties > 0) {
      const entry = findDamageLog(after, unit);
      const source = findSourceUnit(before, after, unit, entry);
      effects.impacts.push({
        targetId: unit.id,
        sourceId: source?.id ?? null,
        kind: EFFECT_KIND_BY_PHASE[entry?.phase] ?? "impact",
        phase: entry?.phase ?? null,
        casualties,
        severity: Math.min(1, casualties / Math.max(1, previous.soldierCount)),
        from: copyPosition(source?.position ?? previous.position),
        to: copyPosition(unit.position),
      });
    }

    if (previous.state !== unit.state) {
      if (unit.state === "DESTROYED") {
        effects.statuses.push({ actorId: unit.id, position: copyPosition(unit.position), label: "壊滅", tone: "danger" });
      } else if (unit.state === "ROUTED") {
        effects.statuses.push({ actorId: unit.id, position: copyPosition(unit.position), label: "潰走", tone: "warning" });
      } else if (unit.state === "ESCAPED") {
        effects.statuses.push({ actorId: unit.id, position: copyPosition(unit.position), label: "離脱", tone: "muted" });
      }
    }
  });

  const beforeCommanders = new Map((before.commanders ?? []).map((commander) => [commander.id, commander]));
  (after.commanders ?? []).forEach((commander) => {
    const previous = beforeCommanders.get(commander.id);
    if (!previous || !positionChanged(previous.position, commander.position)) return;
    effects.movements.push({
      actorId: commander.id,
      actorType: "commander",
      side: commander.side,
      from: copyPosition(previous.position),
      to: copyPosition(commander.position),
    });
  });

  return effects;
}
