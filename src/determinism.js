export const UINT32_RANGE = 0x100000000;
export const UINT32_MAX = 0xffffffff;

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function fnv1aUtf16(value) {
  const text = String(value);
  let hash = FNV_OFFSET;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export function fnv1aCodePoints(value) {
  let hash = FNV_OFFSET;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export function fnv1aCharacters(value) {
  let hash = FNV_OFFSET;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export function unitFromHash(hash, inclusiveMaximum = true) {
  return (Number(hash) >>> 0) / (inclusiveMaximum ? UINT32_MAX : UINT32_RANGE);
}

export function hashPartsUnit(parts, separator = "|", hash = fnv1aCodePoints) {
  return unitFromHash(hash(parts.join(separator)));
}

export function nextLcgState(state) {
  return (Math.imul(Number(state) >>> 0, 1664525) + 1013904223) >>> 0;
}

export function nextLcg(state) {
  const nextState = nextLcgState(state);
  return { state: nextState, value: nextState / UINT32_RANGE };
}

export function createMulberry32(seed, hash = fnv1aUtf16) {
  let state = typeof seed === "number" ? seed >>> 0 : hash(seed) || 1;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let result = state;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / UINT32_RANGE;
  };
}
