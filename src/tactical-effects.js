const EFFECT_KIND_BY_PHASE = Object.freeze({
  ranged: "ranged",
  magic: "magic",
  melee: "melee",
  charge_reaction: "charge",
  pursuit: "charge",
  movement: "impact",
  fatigue_status: "fire",
});

const STATUS_LABELS = Object.freeze({
  slowed: "氷縛",
  buffeted: "乱気流",
  radiant_ward: "陽光護",
  shadow_veil: "影衣",
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

function outcomeStatus(effect, outcome) {
  if (outcome.restored > 0) return { label: `＋${outcome.restored}`, tone: "heal" };
  if (outcome.hpRestored > 0) return { label: `HP＋${outcome.hpRestored}`, tone: "heal" };
  if (outcome.statusIds?.length) {
    return { label: STATUS_LABELS[outcome.statusIds[0]] ?? effect.name, tone: effect.spellId };
  }
  if (outcome.moraleChange > 0) return { label: `士気＋${outcome.moraleChange}`, tone: "heal" };
  return null;
}

function appendRecordedEvents(effects, after) {
  const accountedCasualties = new Map();
  const events = (after.combatEvents ?? []).filter((event) => event.turn === after.turn);
  events.forEach((event) => {
    if (event.type === "attack") {
      effects.attacks.push({
        actorId: event.actorId,
        targetId: event.targetId,
        kind: event.kind,
        hit: event.hit,
        from: copyPosition(event.from),
        to: copyPosition(event.to),
        sequence: event.sequence,
      });
      if (!event.hit || (event.casualties <= 0 && event.damage <= 0)) return;
      effects.impacts.push({
        targetId: event.targetId,
        sourceId: event.actorId,
        kind: event.kind,
        phase: event.kind,
        casualties: event.casualties,
        damage: event.damage,
        severity: event.severity,
        from: copyPosition(event.from),
        to: copyPosition(event.to),
        sequence: event.sequence,
      });
      accountedCasualties.set(event.targetId, (accountedCasualties.get(event.targetId) ?? 0) + event.casualties);
      return;
    }
    if (event.type !== "magic") return;
    effects.spells.push({
      actorId: event.actorId,
      spellId: event.spellId,
      name: event.name,
      side: event.side,
      from: copyPosition(event.from),
      to: copyPosition(event.to),
      radius: event.radius,
      areaPositions: (event.areaPositions ?? event.tileEffects ?? []).map((tile) => copyPosition(tile.position ?? tile)),
      sequence: event.sequence,
    });
    (event.outcomes ?? []).forEach((outcome) => {
      if (outcome.casualties > 0 || outcome.hpDamage > 0) {
        effects.impacts.push({
          targetId: outcome.targetId,
          sourceId: event.actorId,
          kind: event.spellId,
          phase: "magic",
          casualties: outcome.casualties,
          damage: outcome.hpDamage,
          severity: 0,
          from: copyPosition(event.to),
          to: copyPosition(outcome.position),
          sequence: event.sequence,
        });
        accountedCasualties.set(outcome.targetId, (accountedCasualties.get(outcome.targetId) ?? 0) + outcome.casualties);
      }
      const status = outcomeStatus(event, outcome);
      if (status) effects.statuses.push({
        actorId: outcome.targetId,
        position: copyPosition(outcome.position),
        label: status.label,
        tone: status.tone,
        sequence: event.sequence,
      });
    });
  });
  return accountedCasualties;
}

/**
 * Builds presentation-only events from immutable turn snapshots and the
 * structured action outcomes emitted by the combat domain.
 */
export function buildTacticalEffects(before, after) {
  const effects = { turn: after?.turn ?? 0, movements: [], attacks: [], spells: [], impacts: [], statuses: [] };
  if (!before?.units || !after?.units) return effects;

  const accountedCasualties = appendRecordedEvents(effects, after);
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

    const casualties = Math.max(0, previous.soldierCount - unit.soldierCount - (accountedCasualties.get(unit.id) ?? 0));
    if (casualties > 0) {
      const entry = findDamageLog(after, unit);
      const source = findSourceUnit(before, after, unit, entry);
      const impact = {
        targetId: unit.id,
        sourceId: source?.id ?? null,
        kind: EFFECT_KIND_BY_PHASE[entry?.phase] ?? "impact",
        phase: entry?.phase ?? null,
        casualties,
        severity: Math.min(1, casualties / Math.max(1, previous.soldierCount)),
        from: copyPosition(source?.position ?? previous.position),
        to: copyPosition(unit.position),
      };
      effects.impacts.push(impact);
      effects.attacks.push({
        actorId: impact.sourceId,
        targetId: impact.targetId,
        kind: impact.kind,
        hit: true,
        from: copyPosition(impact.from),
        to: copyPosition(impact.to),
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
