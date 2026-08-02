import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePeaceDecision, evaluateWarDecision } from "../src/war-ai.js";

function context(overrides = {}) {
  return {
    objective: { name: "国境通行権", scope: "limited", politicalValue: 70, description: "灰冠峠を通す" },
    politics: { justification: 65, support: 55, escalationRisk: 20 },
    own: { army: 2200, supportColumns: 9, training: 65, organization: 68, mobility: 70, exhaustion: 0 },
    enemy: { name: "ヴァルカ公国", army: 1900, supportColumns: 7, training: 58, organization: 62, mobility: 63, cohesion: 60, capital: "鉄門城" },
    geography: { chokepointName: "灰冠峠", chokepointValue: 86, maneuver: 68, access: 72 },
    logistics: { supply: 70, distance: 18 },
    intelligence: 70,
    ...overrides,
  };
}

test("war AI recommends a supported limited operation with pass access", () => {
  const report = evaluateWarDecision(context());
  assert.equal(report.posture, "実行可能");
  assert.equal(report.center.label, "灰冠峠");
  assert.ok(report.score > 18);
});

test("war AI rejects a politically weak, poorly supplied, escalatory campaign", () => {
  const report = evaluateWarDecision(context({
    objective: { name: "示威", scope: "total", politicalValue: 15, description: "目的が曖昧" },
    politics: { justification: 20, support: 22, escalationRisk: 90 },
    logistics: { supply: 31, distance: 65 },
    intelligence: 25,
  }));
  assert.equal(report.posture, "回避");
  assert.ok(report.score < 0);
});

test("peace advice detects the culminating point of an offensive", () => {
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
