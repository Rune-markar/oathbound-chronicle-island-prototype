import test from "node:test";
import assert from "node:assert/strict";
import {
  createMulberry32,
  fnv1aCharacters,
  fnv1aCodePoints,
  fnv1aUtf16,
  hashPartsUnit,
  nextLcg,
} from "../src/determinism.js";

test("common FNV variants preserve the legacy UTF-16 and code-point contracts", () => {
  assert.equal(fnv1aUtf16("world:317-4"), 2021863853);
  assert.equal(fnv1aCharacters("world:317-4"), 2021863853);
  assert.equal(fnv1aCodePoints("world:317-4"), 2021863853);
  assert.notEqual(fnv1aUtf16("軍⚔️😀"), fnv1aCodePoints("軍⚔️😀"));
  assert.equal(hashPartsUnit(["seed", "route", 3]), fnv1aCodePoints("seed|route|3") / 0xffffffff);
});

test("common PRNG helpers preserve the legacy LCG and Mulberry32 sequences", () => {
  assert.deepEqual(nextLcg(1), { state: 1015568748, value: 1015568748 / 0x100000000 });
  const random = createMulberry32("ability-seed");
  assert.deepEqual([random(), random(), random()].map((value) => Number(value.toFixed(10))), [0.8066428893, 0.9233307338, 0.3721692252]);
});
