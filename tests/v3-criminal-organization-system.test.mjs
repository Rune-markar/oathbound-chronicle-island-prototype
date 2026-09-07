import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  V3_CRIMINAL_CYCLE_MINUTES,
  advanceV3CriminalCycle,
  discoverV3CriminalBroker,
  formV3CriminalOrganization,
  fundV3CriminalOrganization,
  getV3CriminalView,
  issueV3CriminalOperation,
  normalizeV3CriminalState,
  recruitV3CriminalMember,
  resolveV3CriminalDecision,
  resolveV3CriminalReport,
  resolveV3PersonalCrime,
} from "../src/v3-criminal-organization-system.js";
import { createV3FieldState, createV3WorldContext } from "../src/v3-field-system.js";

function fixtureRuntime() {
  const width = 8;
  const height = 8;
  const nation = { id: "nation-1", name: "試験王国", color: "#668855" };
  const region = { id: "region-1", nationId: nation.id, name: "試験地方" };
  const tiles = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const water = x === 0;
    return {
      id: `tile-${x}-${y}`,
      index,
      x,
      y,
      terrain: water ? "water" : "grassland",
      relief: "flat",
      feature: null,
      passable: !water,
      nationId: water ? null : nation.id,
      regionId: water ? null : region.id,
      riverId: null,
    };
  });
  const settlement = {
    id: "village-1",
    name: "試験村",
    settlementLevel: "village",
    importance: 1,
    population: 600,
    nationId: nation.id,
    regionId: region.id,
    tileIndex: 27,
    x: 3,
    y: 3,
  };
  return {
    terrain: { width, height, seed: "v3-criminal-fixture", config: { width, height, wrapX: true } },
    tiles,
    nations: { nations: [nation], regions: [region], objects: [settlement], roads: [{ id: "road-1", tileIndices: [19, 27, 35] }] },
    nationById: new Map([[nation.id, nation]]),
    regionById: new Map([[region.id, region]]),
  };
}

function settlementState(seed = "v3-criminal-fixture") {
  const context = createV3WorldContext(fixtureRuntime(), seed);
  const state = createV3FieldState(context, { playerName: "ノア" });
  state.player.x = 3 * 8 + 4;
  state.player.y = 3 * 8 + 4;
  state.player.gold = 40;
  normalizeV3CriminalState(context, state);
  return { context, state };
}

function formedState(seed = "v3-formed-fixture") {
  const { context, state: initial } = settlementState(seed);
  let state = resolveV3PersonalCrime(context, initial, "theft");
  state = discoverV3CriminalBroker(context, state);
  let view = getV3CriminalView(context, state);
  state = recruitV3CriminalMember(context, state, view.organization.candidates[0].id);
  view = getV3CriminalView(context, state);
  state = recruitV3CriminalMember(context, state, view.organization.candidates[0].id);
  state = formV3CriminalOrganization(context, state, "夜鴉団");
  return { context, state };
}

test("V3独立セーブへ単独犯状態を補完し、V2人物状態を要求しない", () => {
  const { context, state } = settlementState();
  assert.equal(state.criminal.version, 1);
  assert.equal(state.criminal.crime.organization.stage, "solo");
  assert.equal(state.player.crime, undefined);

  const restored = structuredClone(state);
  const normalized = normalizeV3CriminalState(context, restored);
  assert.deepEqual(normalized.criminal, state.criminal);
  assert.equal(normalized.player.gold, state.player.gold);
});

test("現在の集落を具体的な対象にした単独犯罪が銀貨・手配・時刻へ残る", () => {
  const { context, state } = settlementState("v3-personal-route");
  const before = getV3CriminalView(context, state);
  const theft = before.personalActions.find((entry) => entry.id === "theft");
  assert.equal(theft.available, true);
  assert.match(theft.target.name, /試験村市場/);

  const resolved = resolveV3PersonalCrime(context, state, "theft");
  const result = resolved.criminal.lastResult;
  assert.equal(resolved.clockMinutes, state.clockMinutes + 120);
  assert.equal(resolved.criminal.crime.incidents.length, 1);
  assert.equal(resolved.criminal.crime.incidents[0].target.id, theft.target.id);
  assert.equal(result.targetName, theft.target.name);
  assert.match(result.outcomeName, /成功|失敗|拘束/);
  assert.equal(getV3CriminalView(context, resolved).personalActions.find((entry) => entry.id === "theft").available, false);
  assert.equal(state.criminal.crime.incidents.length, 0, "入力状態は変更しない");
});

test("征服後の犯罪事件は現在の国家を記録し同じ地方の手配を引き継ぐ", () => {
  const { context, state } = settlementState("v3-criminal-conquest");
  state.criminal.crime.heatByJurisdiction["region-1"] = 42;
  const successor = { id: "nation-new", name: "新興公国", peopleId: "dwarf" };
  context.worldSimulation = { generatedWorld: { regionalDomains: {
    regionStates: { "region-1": { nationId: successor.id } },
    independentPolities: { [successor.id]: successor },
  } } };
  const view = getV3CriminalView(context, state);
  assert.equal(view.location.nationId, successor.id);
  assert.equal(view.location.nationName, successor.name);
  assert.equal(view.location.settlement.nationId, successor.id);
  assert.equal(view.location.regionId, "region-1");
  assert.equal(view.status.heat, 42);
  const resolved = resolveV3PersonalCrime(context, state, "theft");
  assert.equal(resolved.criminal.crime.incidents[0].jurisdiction.nationId, successor.id);
  assert.equal(resolved.criminal.crime.incidents[0].jurisdiction.id, "region-1");
  assert.equal(context.runtime.regionById.get("region-1").nationId, "nation-1");
});

test("単独実績から現地仲介人、人員二名、一味結成へ通常順序で進む", () => {
  const { context, state: initial } = settlementState("v3-recruitment-route");
  assert.equal(getV3CriminalView(context, initial).canSearchBroker, false);
  let state = resolveV3PersonalCrime(context, initial, "extortion");
  state = discoverV3CriminalBroker(context, state);
  let view = getV3CriminalView(context, state);
  assert.equal(view.localBroker.settlementId, "village-1");
  assert.ok(view.organization.candidates.length >= 4);
  assert.equal(new Set(view.organization.candidates.map((entry) => entry.name)).size, view.organization.candidates.length);

  state = recruitV3CriminalMember(context, state, view.organization.candidates[0].id);
  view = getV3CriminalView(context, state);
  state = recruitV3CriminalMember(context, state, view.organization.candidates[0].id);
  assert.equal(getV3CriminalView(context, state).organization.canForm, true);
  state = formV3CriminalOrganization(context, state, "黒灯会");
  view = getV3CriminalView(context, state);
  assert.equal(view.stage, "crew");
  assert.equal(view.organization.name, "黒灯会");
  assert.equal(view.organization.members.length, 2);
  assert.equal(view.organization.treasury, 2);
  assert.equal(state.player.crime, undefined);
});

test("一味の作戦指示は実在地方を対象に一か月進み、報告確認で事件になる", () => {
  const { context, state: formed } = formedState("v3-operation-route");
  const view = getV3CriminalView(context, formed);
  assert.equal(view.cycleLabel, "317年4月");
  const extortion = view.organization.operations.find((entry) => entry.type === "extortion");
  const ordered = issueV3CriminalOperation(context, formed, {
    optionId: extortion.id,
    leaderId: view.organization.availableMembers[0].id,
    approach: "balanced",
  });
  assert.equal(ordered.criminal.crime.organization.activeOrders[0].jurisdictionId, "region-1");
  assert.match(ordered.messageLog[0], new RegExp(extortion.target.name));

  const result = advanceV3CriminalCycle(context, ordered);
  const advanced = result.state;
  assert.deepEqual(result.advancedSystemIds, ["criminal-organization"]);
  assert.equal(advanced.clockMinutes, ordered.clockMinutes + V3_CRIMINAL_CYCLE_MINUTES);
  assert.equal(getV3CriminalView(context, advanced).cycleLabel, "317年5月");
  assert.equal(advanced.criminal.crime.organization.activeOrders[0].status, "report_ready");
  const reported = resolveV3CriminalReport(context, advanced, advanced.criminal.crime.organization.activeOrders[0].id, {
    outcome: "success_exposed",
    detected: true,
  });
  assert.equal(reported.criminal.crime.organization.activeOrders.length, 0);
  assert.equal(reported.criminal.crime.organization.completedOrders[0].outcome, "success_exposed");
  assert.equal(reported.criminal.crime.incidents.at(-1).delegated, true);
  assert.ok(reported.criminal.crime.heatByJurisdiction["region-1"] > 0);
});

test("実績と四人目加入で犯罪組織化し、別班へ二作戦を同時指示できる", () => {
  const { context, state: formed } = formedState("v3-network-route");
  formed.criminal.crime.organization.completedOrders = [{ id: "one" }, { id: "two" }, { id: "three" }];
  formed.criminal.crime.organization.influence = 20;
  formed.criminal.crime.organization.treasury = 20;
  let state = formed;
  let view = getV3CriminalView(context, state);
  state = recruitV3CriminalMember(context, state, view.organization.candidates[0].id);
  view = getV3CriminalView(context, state);
  state = recruitV3CriminalMember(context, state, view.organization.candidates[0].id);
  view = getV3CriminalView(context, state);
  assert.equal(view.stage, "network");
  assert.equal(view.organization.activeOrderLimit, 3);

  const robbery = view.organization.operations.find((entry) => entry.type === "robbery");
  state = issueV3CriminalOperation(context, state, {
    optionId: robbery.id,
    leaderId: view.organization.availableMembers[0].id,
    supportId: view.organization.availableMembers[1].id,
    approach: "cautious",
  });
  view = getV3CriminalView(context, state);
  const smuggling = view.organization.operations.find((entry) => entry.type === "smuggling");
  state = issueV3CriminalOperation(context, state, {
    optionId: smuggling.id,
    leaderId: view.organization.availableMembers[0].id,
    supportId: view.organization.availableMembers[1].id,
    approach: "bold",
  });
  assert.equal(state.criminal.crime.organization.activeOrders.length, 2);
  assert.equal(new Set(state.criminal.crime.organization.activeOrders.flatMap((entry) => entry.assignedMemberIds)).size, 4);
});

test("誘拐後の三択と暗殺担当拘束後の二択をV3保存上で分岐できる", () => {
  const { context, state: formed } = formedState("v3-decision-route");
  formed.criminal.crime.organization.influence = 20;
  formed.criminal.crime.organization.treasury = 20;
  let view = getV3CriminalView(context, formed);
  const kidnapping = view.organization.operations.find((entry) => entry.type === "kidnapping");
  let state = issueV3CriminalOperation(context, formed, {
    optionId: kidnapping.id,
    leaderId: view.organization.availableMembers[0].id,
    supportId: view.organization.availableMembers[1].id,
    approach: "cautious",
  });
  while (state.criminal.crime.organization.activeOrders[0].status !== "report_ready") state = advanceV3CriminalCycle(context, state).state;
  state = resolveV3CriminalReport(context, state, state.criminal.crime.organization.activeOrders[0].id, { outcome: "success_hidden", detected: false });
  const captiveDecision = state.criminal.crime.organization.pendingDecisions[0];
  assert.deepEqual(captiveDecision.options.map((entry) => entry.id), ["ransom", "leverage", "release"]);
  const ransom = resolveV3CriminalDecision(context, state, captiveDecision.id, "ransom");
  const leverage = resolveV3CriminalDecision(context, state, captiveDecision.id, "leverage");
  const release = resolveV3CriminalDecision(context, state, captiveDecision.id, "release");
  assert.ok(ransom.criminal.crime.organization.treasury > state.criminal.crime.organization.treasury);
  assert.ok(leverage.criminal.crime.organization.influence > state.criminal.crime.organization.influence);
  assert.ok(release.criminal.crime.organization.members.every((entry, index) => entry.loyalty >= state.criminal.crime.organization.members[index].loyalty));

  const captureBase = formedState("v3-capture-route");
  captureBase.state.criminal.crime.organization.influence = 20;
  captureBase.state.criminal.crime.organization.treasury = 20;
  view = getV3CriminalView(captureBase.context, captureBase.state);
  const assassination = view.organization.operations.find((entry) => entry.type === "assassination");
  let captureState = issueV3CriminalOperation(captureBase.context, captureBase.state, {
    optionId: assassination.id,
    leaderId: view.organization.availableMembers[0].id,
    supportId: view.organization.availableMembers[1].id,
  });
  while (captureState.criminal.crime.organization.activeOrders[0].status !== "report_ready") captureState = advanceV3CriminalCycle(captureBase.context, captureState).state;
  captureState = resolveV3CriminalReport(captureBase.context, captureState, captureState.criminal.crime.organization.activeOrders[0].id, { outcome: "captured", detected: true });
  const captureDecision = captureState.criminal.crime.organization.pendingDecisions.find((entry) => entry.kind === "member_capture");
  assert.deepEqual(captureDecision.options.map((entry) => entry.id), ["recover", "abandon"]);
  const recovered = resolveV3CriminalDecision(captureBase.context, captureState, captureDecision.id, "recover");
  const abandoned = resolveV3CriminalDecision(captureBase.context, captureState, captureDecision.id, "abandon");
  assert.equal(recovered.criminal.crime.organization.members.find((entry) => entry.id === captureDecision.memberId).status, "available");
  assert.equal(abandoned.criminal.crime.organization.members.find((entry) => entry.id === captureDecision.memberId).status, "left");
});

test("V3犯罪UIは既定入口へ接続し、旧版の起動導線を持たない", async () => {
  const [index, app, styles, agents] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/v3-app.js", import.meta.url), "utf8"),
    readFile(new URL("../v3.css", import.meta.url), "utf8"),
    readFile(new URL("../AGENTS.md", import.meta.url), "utf8"),
  ]);
  assert.match(index, /data-v3-action="underworld"/);
  assert.match(index, /id="v3UnderworldModal"/);
  assert.doesNotMatch(index, /V2 比較アーカイブ/);
  assert.match(app, /renderUnderworld/);
  assert.match(app, /resolveV3PersonalCrime/);
  assert.match(app, /state = normalizeV3IntegratedState\(context, state\);/);
  assert.match(app, /commitV3Action/);
  assert.match(app, /commitStateAction\(createActionResult\(state, \{ elapsedMinutes: amount \* GAME_MINUTES_PER_MONTH \}\)/);
  assert.doesNotMatch(app, /skipSystemIds/);
  assert.match(app, /data-v3-criminal-cycle[\s\S]*advanceV3CriminalCycle/);
  assert.match(app, /const cycleLabel = worldSimulation/);
  assert.match(styles, /\.v3-underworld/);
  assert.match(agents, /Generation V3/);
  assert.match(agents, /旧版.*削除/);
});

test("組織金庫への出資はV3銀貨から移り、V3人物状態へ戻る", () => {
  const { context, state } = formedState("v3-funding-route");
  const beforeGold = state.player.gold;
  const beforeTreasury = state.criminal.crime.organization.treasury;
  const funded = fundV3CriminalOrganization(context, state, 2);
  assert.equal(funded.player.gold, beforeGold - 2);
  assert.equal(funded.criminal.crime.organization.treasury, beforeTreasury + 2);
});
