import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePeaceDecision, evaluateWarDecision } from "../src/war-ai.js";

function context(overrides = {}) {
  return {
    objective: { name: "通航保障", scope: "limited", politicalValue: 70, description: "海峡を通す" },
    politics: { justification: 65, support: 55, escalationRisk: 20 },
    own: { army: 2200, fleet: 8, training: 65, organization: 68, navalReadiness: 70, exhaustion: 0 },
    enemy: { army: 1900, fleet: 7, training: 58, organization: 62, navalReadiness: 63, cohesion: 60, capital: "岬城" },
    geography: { straitName: "白礁海峡", straitValue: 86, seaControl: 68, straitAccess: 72 },
    logistics: { supply: 70, distance: 18 },
    intelligence: 70,
    ...overrides,
  };
}

test("war AI recommends a supported limited operation with sea access", () => {
  const report = evaluateWarDecision(context());
  assert.equal(report.posture, "実行可能");
  assert.equal(report.center.label, "白礁海峡");
  assert.ok(report.score > 18);
});

test("war AI rejects a politically weak and escalatory campaign", () => {
  const report = evaluateWarDecision(context({
    objective: { name: "示威", scope: "total", politicalValue: 15, description: "目的が曖昧" },
    politics: { justification: 20, support: 22, escalationRisk: 90 },
    logistics: { supply: 31, distance: 65 },
    intelligence: 25,
  }));
  assert.equal(report.posture, "回避");
  assert.ok(report.score < 0);
});

test("peace advice detects the point where further attack is too costly", () => {
  const report = evaluatePeaceDecision({
    warScore: 38,
    objectiveProgress: 72,
    objective: { scope: "limited" },
    own: { exhaustion: 58, organization: 42, supply: 39 },
  });
  assert.equal(report.accept, true);
  assert.ok(report.culminatingRisk > 50);
  assert.match(report.recommendation, /講和/);
});
