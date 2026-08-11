export const ABILITY_KEYS = Object.freeze([
  "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
]);

export const ABILITY_LABELS = Object.freeze({
  strength: "筋力",
  dexterity: "敏捷力",
  constitution: "耐久力",
  intelligence: "知力",
  wisdom: "判断力",
  charisma: "魅力",
});

export const ABILITY_ROLES = Object.freeze({
  balanced: Object.freeze({ id: "balanced", name: "自由人", priority: ABILITY_KEYS }),
  warrior: Object.freeze({ id: "warrior", name: "戦士", priority: ["strength", "constitution", "dexterity", "wisdom", "charisma", "intelligence"] }),
  scout: Object.freeze({ id: "scout", name: "斥候", priority: ["dexterity", "wisdom", "constitution", "strength", "intelligence", "charisma"] }),
  scholar: Object.freeze({ id: "scholar", name: "学者・術師", priority: ["intelligence", "wisdom", "dexterity", "constitution", "charisma", "strength"] }),
  envoy: Object.freeze({ id: "envoy", name: "交渉人", priority: ["charisma", "intelligence", "wisdom", "dexterity", "constitution", "strength"] }),
  healer: Object.freeze({ id: "healer", name: "神官・治療役", priority: ["wisdom", "constitution", "charisma", "intelligence", "dexterity", "strength"] }),
});

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = hashString(seed) || 1;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 0x100000000;
  };
}

function rollDie(random) {
  return 1 + Math.floor(random() * 6);
}

export function abilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function formatAbilityModifier(score) {
  const modifier = abilityModifier(score);
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}

export function resolveAbilityRole(value = "") {
  const role = String(value).toLowerCase();
  if (/神官|司祭|僧|治療|healer|priest|cleric|medic/.test(role)) return ABILITY_ROLES.healer;
  if (/斥候|猟師|狩人|弓|盗賊|密偵|scout|ranger|archer|rogue/.test(role)) return ABILITY_ROLES.scout;
  if (/学者|研究|魔|術師|軍師|参謀|書記|scholar|mage|wizard|strategist/.test(role)) return ABILITY_ROLES.scholar;
  if (/商|外交|交渉|貴族|領主|行政|執政|使節|merchant|envoy|diplomat|noble|governor/.test(role)) return ABILITY_ROLES.envoy;
  if (/戦|騎士|兵|傭兵|護衛|前衛|武人|武将|将軍|隊長|軍団長|守備|警備|司令|warrior|knight|soldier|guard|commander/.test(role)) return ABILITY_ROLES.warrior;
  return ABILITY_ROLES.balanced;
}

export function rollAbilityScores(options = {}) {
  const seed = options.seed ?? `${Date.now()}:${Math.random()}`;
  const random = options.random ?? seededRandom(seed);
  const role = ABILITY_ROLES[options.roleId] ?? resolveAbilityRole(options.role ?? options.specialty);
  const rolls = ABILITY_KEYS.map(() => {
    const dice = Array.from({ length: 4 }, () => rollDie(random)).sort((left, right) => left - right);
    return dice.slice(1).reduce((sum, value) => sum + value, 0);
  }).sort((left, right) => right - left);
  return Object.fromEntries(role.priority.map((abilityId, index) => [abilityId, rolls[index]]));
}

export function normalizeAbilityScores(source, options = {}) {
  const explicit = source?.abilities ?? source?.capabilities?.abilities ?? source;
  const complete = explicit && ABILITY_KEYS.every((abilityId) => Number.isFinite(Number(explicit[abilityId])));
  if (complete) {
    return Object.fromEntries(ABILITY_KEYS.map((abilityId) => [
      abilityId,
      Math.max(3, Math.min(18, Math.round(Number(explicit[abilityId])))),
    ]));
  }
  return rollAbilityScores({
    seed: options.seed ?? source?.id ?? source?.identity?.id ?? source?.name ?? "generic-character",
    roleId: options.roleId,
    role: options.role ?? source?.role ?? source?.gameplay?.role ?? source?.specialty ?? source?.biography?.specialty,
  });
}
