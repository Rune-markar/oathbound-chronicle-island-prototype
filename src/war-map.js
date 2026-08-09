const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const WAR_MAP_TERRAINS = Object.freeze({
  plains: { id: "plains", name: "平原", movement: 1, defense: 0 },
  hills: { id: "hills", name: "丘陵", movement: 2, defense: 1 },
  forest: { id: "forest", name: "森林", movement: 2, defense: 1 },
  mountains: { id: "mountains", name: "山岳", movement: 3, defense: 2 },
  highlands: { id: "highlands", name: "高地", movement: 2, defense: 1 },
  wetland: { id: "wetland", name: "湿地", movement: 3, defense: 0 },
  badlands: { id: "badlands", name: "荒地", movement: 2, defense: 0 },
});

const REGION_BLUEPRINTS = Object.freeze({
  orta_frontier: {
    id: "orta_frontier",
    name: "オルタ東境州",
    shortName: "東境州",
    subtitle: "城壁と農村を結ぶ王国側の防衛盤",
    strategicRole: "王国後方・防衛線",
    terrainRows: [
      ["forest", "hills", "hills", "highlands", "mountains", "mountains", "highlands"],
      ["plains", "plains", "hills", "hills", "highlands", "mountains", "hills"],
      ["plains", "plains", "plains", "hills", "hills", "highlands", "hills"],
      ["wetland", "plains", "plains", "plains", "hills", "hills", "badlands"],
      ["wetland", "wetland", "plains", "plains", "hills", "badlands", "badlands"],
    ],
    route: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2]],
    landmarks: {
      "1,2": { id: "orta_castle", name: "オルタ城", kind: "fortress", value: 5 },
      "3,3": { id: "east_depot", name: "東部糧秣庫", kind: "depot", value: 3 },
      "5,2": { id: "customs_hill", name: "関税丘", kind: "objective", value: 2 },
      "6,1": { id: "ash_west_gate", name: "灰冠西門", kind: "pass", value: 3 },
    },
  },
  ash_pass: {
    id: "ash_pass",
    name: "灰冠峠戦域",
    shortName: "灰冠峠",
    subtitle: "側道・関所・補給路が勝敗を決める中央盤",
    strategicRole: "主戦線・国境要地",
    terrainRows: [
      ["mountains", "mountains", "highlands", "mountains", "mountains", "mountains", "mountains"],
      ["mountains", "highlands", "hills", "highlands", "hills", "highlands", "mountains"],
      ["highlands", "hills", "hills", "highlands", "hills", "hills", "highlands"],
      ["mountains", "highlands", "hills", "hills", "highlands", "highlands", "mountains"],
      ["mountains", "mountains", "badlands", "highlands", "badlands", "mountains", "mountains"],
    ],
    route: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2]],
    landmarks: {
      "0,2": { id: "selena_camp", name: "王国前進営", kind: "depot", value: 2 },
      "2,1": { id: "north_track", name: "北側道", kind: "pass", value: 2 },
      "3,2": { id: "ash_crown", name: "灰冠関所", kind: "objective", value: 5 },
      "4,3": { id: "caravan_hollow", name: "隊商窪地", kind: "settlement", value: 2 },
      "6,2": { id: "valka_gate", name: "ヴァルカ東門", kind: "fortress", value: 4 },
    },
  },
  valka_border: {
    id: "valka_border",
    name: "ヴァルカ辺境州",
    shortName: "辺境州",
    subtitle: "鉄門砦から公城へ続く敵国側の攻略盤",
    strategicRole: "敵後方・攻囲線",
    terrainRows: [
      ["mountains", "highlands", "hills", "hills", "highlands", "mountains", "mountains"],
      ["highlands", "hills", "plains", "plains", "hills", "highlands", "mountains"],
      ["hills", "hills", "plains", "plains", "plains", "hills", "highlands"],
      ["badlands", "hills", "plains", "plains", "hills", "hills", "badlands"],
      ["badlands", "badlands", "hills", "plains", "badlands", "badlands", "badlands"],
    ],
    route: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2]],
    landmarks: {
      "0,2": { id: "iron_gate", name: "鉄門砦", kind: "fortress", value: 4 },
      "2,2": { id: "red_gravel_road", name: "赤礫街道", kind: "objective", value: 2 },
      "3,3": { id: "border_granary", name: "辺境穀倉", kind: "depot", value: 3 },
      "5,2": { id: "valka_keep", name: "ヴァルカ公城", kind: "fortress", value: 6 },
      "6,1": { id: "east_muster", name: "東部召集地", kind: "settlement", value: 2 },
    },
  },
});

export const WAR_REGION_MAPS = Object.freeze(Object.fromEntries(
  Object.entries(REGION_BLUEPRINTS).map(([id, region]) => [id, Object.freeze({
    id,
    name: region.name,
    shortName: region.shortName,
    subtitle: region.subtitle,
    strategicRole: region.strategicRole,
    columns: 7,
    rows: 5,
  })]),
));

function controlForHex(regionId, q) {
  if (regionId === "orta_frontier") {
    if (q <= 4) return "friendly";
    return q === 5 ? "contested" : "enemy";
  }
  if (regionId === "valka_border") {
    if (q === 0) return "contested";
    return "enemy";
  }
  if (q <= 2) return "friendly";
  if (q >= 4) return "enemy";
  return "contested";
}

function buildRegion(blueprint) {
  const routeIds = new Set(blueprint.route.map(([q, r]) => `${q},${r}`));
  const tiles = blueprint.terrainRows.flatMap((row, r) => row.map((terrainId, q) => {
    const landmark = blueprint.landmarks[`${q},${r}`] ?? null;
    return {
      id: `${blueprint.id}-${q}-${r}`,
      q,
      r,
      terrainId,
      name: landmark?.name ?? `${WAR_MAP_TERRAINS[terrainId].name}${r + 1}-${q + 1}`,
      control: controlForHex(blueprint.id, q),
      road: routeIds.has(`${q},${r}`),
      landmark,
    };
  }));
  return {
    id: blueprint.id,
    name: blueprint.name,
    shortName: blueprint.shortName,
    subtitle: blueprint.subtitle,
    strategicRole: blueprint.strategicRole,
    columns: 7,
    rows: 5,
    status: blueprint.id === "ash_pass" ? "frontline" : blueprint.id === "orta_frontier" ? "friendly_rear" : "enemy_rear",
    tiles,
  };
}

function splitForce(total, entries, side, morale, supply) {
  let assigned = 0;
  return entries.map((entry, index) => {
    const strength = index === entries.length - 1
      ? Math.max(0, Math.round(total) - assigned)
      : Math.max(0, Math.round(total * entry.share));
    assigned += strength;
    return {
      id: `${side}-${entry.id}`,
      side,
      name: entry.name,
      type: entry.type,
      symbol: entry.symbol,
      regionId: entry.regionId,
      q: entry.q,
      r: entry.r,
      strength,
      morale: clamp(Math.round(morale + (entry.morale ?? 0)), 0, 100),
      supply: clamp(Math.round(supply + (entry.supply ?? 0)), 0, 100),
    };
  });
}

function fieldRegionFor(objectiveId, side) {
  if (side === "defender") return "orta_frontier";
  return "ash_pass";
}

function makeUnitEntries(activeRegionId, side) {
  if (side === "friendly") {
    return [
      { id: "orta_garrison", name: "オルタ守備隊", type: "garrison", symbol: "城", share: 0.1, regionId: "orta_frontier", q: 1, r: 2, morale: 5, supply: 8 },
      { id: "main", name: "東部国境軍主力", type: "army", symbol: "軍", share: 0.65, regionId: activeRegionId, q: activeRegionId === "orta_frontier" ? 2 : 1, r: 2 },
      { id: "scouts", name: "王国斥候隊", type: "scout", symbol: "斥", share: 0.15, regionId: activeRegionId, q: activeRegionId === "orta_frontier" ? 3 : 2, r: 1, morale: 3, supply: -3 },
      { id: "train", name: "王国輜重隊", type: "supply", symbol: "糧", share: 0.1, regionId: activeRegionId, q: 0, r: 3, morale: -4, supply: 12 },
    ];
  }
  return [
    { id: "keep_garrison", name: "ヴァルカ城砦隊", type: "garrison", symbol: "城", share: 0.1, regionId: "valka_border", q: 5, r: 2, morale: 5, supply: 6 },
    { id: "main", name: "ヴァルカ公国軍主力", type: "army", symbol: "軍", share: 0.65, regionId: activeRegionId, q: 5, r: 2 },
    { id: "screen", name: "辺境諸侯前衛", type: "scout", symbol: "前", share: 0.15, regionId: activeRegionId, q: 4, r: 1, morale: 2, supply: -4 },
    { id: "train", name: "公国補給隊", type: "supply", symbol: "糧", share: 0.1, regionId: activeRegionId, q: 6, r: 3, morale: -5, supply: 10 },
  ];
}

export function createWarTheater({
  targetCountryId = "valka",
  objectiveId = "transit",
  side = "attacker",
  ownArmy = 0,
  enemyArmy = 0,
  ownMorale = 64,
  enemyMorale = 62,
  ownSupply = 60,
  enemySupply = 58,
  year = 0,
  month = 0,
} = {}) {
  const activeRegionId = fieldRegionFor(objectiveId, side);
  const regions = Object.values(REGION_BLUEPRINTS).map(buildRegion);
  const friendlyUnits = splitForce(ownArmy, makeUnitEntries(activeRegionId, "friendly"), "friendly", ownMorale, ownSupply);
  const enemyUnits = splitForce(enemyArmy, makeUnitEntries(activeRegionId, "enemy"), "enemy", enemyMorale, enemySupply);
  return {
    version: 1,
    id: `theater-${targetCountryId}-${year}-${month}-${objectiveId}`,
    name: side === "defender" ? "東境州防衛戦域" : "灰冠峠戦役盤",
    targetCountryId,
    objectiveId,
    activeRegionId,
    regionOrder: ["orta_frontier", "ash_pass", "valka_border"],
    round: 0,
    phase: "deployment",
    initiative: side === "attacker" ? "friendly" : "enemy",
    pressure: 0,
    regions,
    units: [...friendlyUnits, ...enemyUnits],
    lastResolution: null,
  };
}

function moveFieldUnits(theater, regionId, score) {
  const frontColumn = clamp(3 + Math.round(score / 28), 1, 5);
  theater.units.forEach((unit) => {
    if (unit.type === "garrison") return;
    unit.regionId = regionId;
    if (unit.side === "friendly") {
      unit.q = clamp(frontColumn - (unit.type === "supply" ? 2 : unit.type === "scout" ? 0 : 1), 0, 6);
      unit.r = unit.type === "supply" ? 3 : unit.type === "scout" ? 1 : 2;
    } else {
      unit.q = clamp(frontColumn + (unit.type === "supply" ? 2 : unit.type === "scout" ? 0 : 1), 0, 6);
      unit.r = unit.type === "supply" ? 3 : unit.type === "scout" ? 1 : 2;
    }
  });
}

function applyLosses(units, side, losses) {
  const eligible = units.filter((unit) => unit.side === side && unit.type !== "supply");
  const total = eligible.reduce((sum, unit) => sum + unit.strength, 0);
  let remaining = Math.max(0, Math.round(losses));
  eligible.forEach((unit, index) => {
    const share = index === eligible.length - 1 ? remaining : Math.min(remaining, Math.round(losses * unit.strength / Math.max(1, total)));
    unit.strength = Math.max(0, unit.strength - share);
    remaining -= share;
  });
}

function updateRegionControls(theater, activeRegionId, score) {
  const activeIndex = theater.regionOrder.indexOf(activeRegionId);
  const frontColumn = clamp(3 + Math.round(score / 28), 1, 5);
  theater.regions.forEach((region) => {
    const regionIndex = theater.regionOrder.indexOf(region.id);
    region.status = regionIndex < activeIndex ? "friendly_rear" : regionIndex > activeIndex ? "enemy_rear" : "frontline";
    region.tiles.forEach((tile) => {
      if (regionIndex < activeIndex) tile.control = "friendly";
      else if (regionIndex > activeIndex) tile.control = "enemy";
      else if (tile.q < frontColumn) tile.control = "friendly";
      else if (tile.q > frontColumn) tile.control = "enemy";
      else tile.control = "contested";
    });
  });
}

export function advanceWarTheater(theater, {
  delta = 0,
  score = 0,
  objectiveProgress = 0,
  ownLoss = 0,
  enemyLoss = 0,
  ownSupply = 50,
  enemySupply = 50,
  planId = "pass",
  enemyActionId = "screen",
  side = "attacker",
} = {}) {
  if (!theater) return null;
  const next = structuredClone(theater);
  next.round += 1;
  next.phase = "operations";
  next.pressure = clamp(next.pressure + delta, -100, 100);
  next.initiative = delta >= 0 ? "friendly" : "enemy";
  applyLosses(next.units, "friendly", ownLoss);
  applyLosses(next.units, "enemy", enemyLoss);
  next.units.forEach((unit) => {
    const supply = unit.side === "friendly" ? ownSupply : enemySupply;
    unit.supply = clamp(Math.round(supply + (unit.type === "supply" ? 10 : 0)), 0, 100);
    unit.morale = clamp(Math.round(unit.morale + (unit.side === "friendly" ? delta * 0.35 : -delta * 0.35)), 0, 100);
  });

  let activeRegionId = side === "defender" ? "orta_frontier" : "ash_pass";
  if (side === "defender" && score >= 24) activeRegionId = "ash_pass";
  if (side === "attacker" && score <= -35) activeRegionId = "orta_frontier";
  if (next.objectiveId === "submission" && (score >= 35 || objectiveProgress >= 60)) activeRegionId = "valka_border";
  next.activeRegionId = activeRegionId;
  updateRegionControls(next, activeRegionId, score);
  moveFieldUnits(next, activeRegionId, score);
  next.lastResolution = {
    round: next.round,
    delta,
    score,
    planId,
    enemyActionId,
    activeRegionId,
  };
  return next;
}

export function normalizeWarTheater(theater, context = {}) {
  if (!theater || theater.version !== 1 || !Array.isArray(theater.regions) || !Array.isArray(theater.units)) {
    return createWarTheater(context);
  }
  const next = structuredClone(theater);
  next.regionOrder ??= ["orta_frontier", "ash_pass", "valka_border"];
  next.activeRegionId ??= fieldRegionFor(next.objectiveId ?? context.objectiveId, context.side ?? "attacker");
  next.round = Number.isFinite(next.round) ? next.round : 0;
  next.phase ??= next.round ? "operations" : "deployment";
  next.initiative ??= context.side === "defender" ? "enemy" : "friendly";
  next.pressure = Number.isFinite(next.pressure) ? next.pressure : 0;
  next.lastResolution ??= null;
  next.regions.forEach((region) => {
    region.tiles ??= region.hexes ?? [];
    delete region.hexes;
  });
  return next;
}

export function getWarRegion(theater, regionId = theater?.activeRegionId) {
  return theater?.regions?.find((region) => region.id === regionId) ?? null;
}
