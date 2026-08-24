export const V3_ART_ASSETS = Object.freeze({
  terrainAtlas: "./assets/generated/v3/field-terrain-atlas.webp",
  objectAtlas: "./assets/generated/v3/field-object-atlas.webp",
  entityAtlas: "./assets/generated/v3/field-entity-atlas.webp",
  launchHero: "./assets/generated/v3/launch-hero.webp",
});

const ATLAS_MAX_INDEX = 3;

function atlasEntry(atlas, column, row) {
  const percent = (value) => `${Number((value / ATLAS_MAX_INDEX * 100).toFixed(4))}%`;
  return Object.freeze({
    atlas,
    column,
    row,
    position: `${percent(column)} ${percent(row)}`,
  });
}

const terrain = (column, row) => atlasEntry("terrain", column, row);
const object = (column, row) => atlasEntry("object", column, row);
const entity = (column, row) => atlasEntry("entity", column, row);

export const V3_TERRAIN_ART_BY_TYPE = Object.freeze({
  grass: terrain(0, 0),
  sand: terrain(2, 0),
  tundra: terrain(3, 0),
  snow: terrain(0, 1),
  water: terrain(1, 1),
  beach: terrain(2, 0),
  shoal: terrain(2, 1),
  "tidal-flat": terrain(0, 2),
  river: terrain(2, 3),
  "canyon-river": terrain(2, 3),
  canal: terrain(2, 3),
  spring: terrain(2, 1),
  oasis: terrain(0, 0),
  road: terrain(1, 3),
  forest: terrain(3, 1),
  marsh: terrain(0, 2),
  farmland: terrain(1, 2),
  hill: terrain(2, 2),
  mountain: terrain(3, 2),
  volcano: terrain(0, 3),
  crater: terrain(2, 2),
  cave: terrain(2, 2),
  mine: terrain(2, 2),
  ruins: terrain(3, 3),
  "floating-island": terrain(3, 1),
  "sky-peak": terrain(3, 2),
  "settlement-ground": terrain(3, 3),
  "settlement-village": terrain(3, 3),
  "settlement-town": terrain(3, 3),
  "settlement-city": terrain(3, 3),
});

export const V3_NON_ART_TERRAIN_TYPES = Object.freeze(["fog", "ungenerated", "void"]);

export const V3_LANDMARK_ART_BY_TYPE = Object.freeze({
  "settlement-village": object(0, 0),
  "settlement-town": object(1, 0),
  "settlement-city": object(2, 0),
  volcano: object(3, 0),
  crater: object(0, 1),
  cave: object(1, 1),
  mine: object(2, 1),
  ruins: object(3, 1),
  "floating-island": object(0, 2),
  "sky-peak": object(1, 2),
});

export const V3_PLAYER_ART_BY_RACE = Object.freeze({
  human: entity(0, 0),
  elf: entity(1, 0),
  dwarf: entity(2, 0),
  orc: entity(3, 0),
});

export const V3_ENTITY_ART_BY_KEY = Object.freeze({
  "npc-merchant": entity(0, 1),
  "npc-villager": entity(1, 1),
  "npc-adventurer": entity(2, 1),
  "enemy-green-slime": entity(3, 1),
  "enemy-goblin-scout": entity(0, 2),
  "enemy-wild-wolf": entity(1, 2),
  "enemy-road-bandit": entity(2, 2),
  "enemy-sand-scorpion": entity(3, 2),
  "enemy-marsh-leech": entity(0, 3),
  "enemy-reef-crab": entity(1, 3),
  "enemy-ember-lizard": entity(2, 3),
  "enemy-new-moon-ghost": entity(3, 3),
  "item-medicinal-herb": object(2, 2),
  "item-wild-berries": object(3, 2),
  "item-iron-shard": object(0, 3),
  "item-old-coin": object(1, 3),
  "item-desert-salt": object(2, 3),
  "item-shore-shell": object(3, 3),
  "group-battle": Object.freeze({ atlas: "military", position: "50% 50%" }),
});

export function getV3TerrainArt(tileType) {
  return V3_TERRAIN_ART_BY_TYPE[tileType] ?? null;
}

export function getV3LandmarkArt(tileType) {
  return V3_LANDMARK_ART_BY_TYPE[tileType] ?? null;
}

export function getV3PlayerArt(raceId) {
  return V3_PLAYER_ART_BY_RACE[raceId] ?? V3_PLAYER_ART_BY_RACE.human;
}

export function getV3EntityArt(subject) {
  if (!subject) return null;
  const key = subject.type === "npc"
    ? `npc-${subject.role ?? "adventurer"}`
    : subject.type === "enemy"
      ? `enemy-${subject.id}`
      : subject.type === "item"
        ? `item-${subject.id}`
        : subject.type === "group-battle"
          ? "group-battle"
          : null;
  return V3_ENTITY_ART_BY_KEY[key] ?? (subject.type === "npc" ? V3_ENTITY_ART_BY_KEY["npc-adventurer"] : null);
}
