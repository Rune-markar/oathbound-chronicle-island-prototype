import { V3_MODEL_PARAMETERS, normalizeV3SimulationModel } from "./v3-simulation-model.js";
import { GEOPOLITICAL_ACTION_EFFECTS } from "./state-reason-system.js";
import { GEOPOLITICAL_DECISION_TAGS, deriveGeopoliticalProfiles } from "./geopolitical-world.js";
import { V3_WORLD_EFFECT_DEFINITIONS, V3_CELESTIAL_EFFECT_DEFINITIONS } from "./v3-world-effects.js";
import { V3_EXTERNAL_CRISIS_DEFINITIONS } from "./v3-external-crisis-system.js";
import { V3_INSTITUTIONS } from "./v3-civic-policy.js";
import { V3_DIPLOMACY_RULES, V3_DIPLOMATIC_NEEDS } from "./v3-campaign-diplomacy.js";

// Ordered from specific to general. These descriptions are shared by the UI
// and the exported variable reference; the inspector does not mutate values.
export const V3_VARIABLE_DOMAINS = Object.freeze([
  { match: /\.civicState|^rules\.civicPolicies/, name: "地方制度の実効", source: "src/v3-civic-policy.js", effect: "現在の領有・任官と支払状況を検査し、生産、国境物流、街道修復、災害圧力へ制度を適用する。同じ月の環境回復を二重適用しない。" },
  { match: /field\.campaign\.(diplomacy|lastMilitaryOutcome)|^rules\.(diplomacy|diplomaticNeeds)/, name: "プレイヤーの外交条件", source: "src/v3-campaign-diplomacy.js", effect: "相手の主権・防衛・不足・現在文化・共有国境と具体的提案から必要信頼、交渉費用を計算。軍事成功率は防備差・軍功・相手主権から計算し、シード・年月・試行番号で抽選する。" },
  { match: /field\.campaign\.(survey|mandates|finalChoices|endingSnapshot)/, name: "現地の依頼と物語の選択", source: "src/v3-campaign-journey.js", effect: "委託地方の通行可能地点へ実際に歩き、住民依頼と異なる成果を揃えて任官する。終盤の選択は税・支持・防備・生息環境・物流へ残り、結末時の仲間と判断を保存する。" },
  { match: /field\.campaign\.(lastReport|ledger)/, name: "統治結果の説明", source: "src/v3-campaign-system.js", effect: "実際の行動・決算前後の差分と、食料不足・危機・維持費の原因を保存。画面の増減表示と履歴に使い、値を再適用しない。" },
  { match: /(^model|\.model)(\.|$)/, name: "判断設定", source: "src/v3-simulation-model.js", effect: "次の月の国家判断と、新規世界の50年事前史で使用する。保存済みの過去は書き換えない。" },
  { match: /\.selection|\.factors|\.alternatives/, name: "判断の根拠", source: "src/v3-simulation-model.js", effect: "その月の候補、実際の抽選確率、点数内訳、除外理由。履歴を表示するだけで再抽選しない。" },
  { match: /\.nationFeedback/, name: "市場から国家への影響", source: "src/v3-world-feedback.js", effect: "直近月の穀物不足・備蓄・物流から食料、財政、結束を更新する。翌月の環境対応判断にも未充足率を渡す。" },
  { match: /\.marketEconomy/, name: "市場・物流", source: "src/v3-market-economy.js", effect: "集落ごとの生産、消費、備蓄、価格を月次更新。街道輸送・戦争・危機・プレイヤー売買が同じ在庫へ反映される。" },
  { match: /\.externalCrises|^rules\.externalCrises/, name: "外部危機", source: "src/v3-external-crisis-system.js", effect: "地形・気候・季節と地方の危機圧から災害、飢饉、魔族襲撃が発生・回復。移動、交易、国家の生存条件へ作用する。" },
  { match: /\.raceDynamics/, name: "人口・民族文化", source: "src/race-decision-system.js", effect: "実人口を地方・階級・信仰別に集計し、六つの意思決定特性を導く。制度、指導者、経験、出生死・移動で構成が変化する。" },
  { match: /\.geopolitics|^geography\.profiles/, name: "国家・外交", source: "src/geopolitical-world.js", effect: "国力・地理的接触・国境障壁・食料基盤・関係・脅威が実行候補と評価に作用。月次の行動効果は最弱環の予測と共通。" },
  { match: /\.autonomyStrain/, name: "自治圧力", source: "src/v3-world-simulation.js", effect: "首都からの距離、地方数、占領、結束・財政の弱さから蓄積し、周縁地方の独立候補を判定する。" },
  { match: /\.regionalDomains/, name: "地方統治・支配", source: "src/regional-domain-system.js", effect: "支配国、占領、統治状態、自治圧力を保存。税収、人口文化の所属、独立、地図・市場の所有国へ反映する。" },
  { match: /\.worldWars|\.resistance/, name: "戦争・抵抗", source: "src/generated-world-war-system.js", effect: "動員、消耗、戦線、占領、講和の月次進行と国境変動。V3軍務の集団戦結果もこの戦略世界へ戻る。" },
  { match: /field\.campaign/, name: "人物史・統治", source: "src/v3-campaign-system.js", effect: "職歴、領地、正統性、統治資源、月次収支、帝国・連邦の達成条件を管理。結末後も同じ世界で活動を続けられる。" },
  { match: /field\.merchant/, name: "交易・商会", source: "src/v3-merchant-system.js", effect: "貨物、営業資格、支店、職員、街道と商会資金を管理。仕入れ・販売は実際の市場在庫・価格を変更する。" },
  { match: /field\.(criminal|organization)/, name: "裏社会", source: "src/v3-criminal-organization-system.js", effect: "人脈、組織人員、拠点、委任任務、危険を管理。本人の移動、時間、所持金と接続する。" },
  { match: /field\.military/, name: "軍務", source: "src/v3-group-combat.js", effect: "所属、任務、兵力、補給、集団戦の引渡しと帰還を管理。戦果を人物と国家へ一度だけ反映する。" },
  { match: /field\.autoMode/, name: "自動行動", source: "src/v3-auto-mode.js", effect: "目的、探索、残り行動、停止理由を保存。手動と同じ行動結果を使い、重要な判断では操作を返す。" },
  { match: /field\.worldEffects|^rules\.(weather|celestial)/, name: "天候・天体・種族適応", source: "src/v3-world-effects.js", effect: "局地天候、月相、種族の適応が移動時間、遭遇、戦闘、価格に作用。国家の月次危機とは時間・範囲が異なる。" },
  { match: /field\.(clock|clockMinutes)|worldSimulation\.(year|month|elapsedMonths)/, name: "共通時計", source: "src/game-clock.js", effect: "人物行動の経過分から日・月境界を検出し、世界、商会、統治を同じ順で一度ずつ進める。" },
  { match: /field\.domainEvents|\.history|\.events|\.messageLog/, name: "履歴・記録", source: "src/domain-events.js", effect: "発生当時の出来事を保持し、年代記・結果表示と二重適用防止に使う。過去の値が現在値を表すとは限らない。" },
  { match: /^field/, name: "人物・1マス行動", source: "src/v3-field-system.js", effect: "位置、体力、成長、所持品、発見・採集・遭遇の状態。移動・会話・戦闘などの通常操作とV3セーブで共有する。" },
  { match: /^geography|^generation/, name: "生成地理・資源（初期基盤）", source: "src/world-generation.js", effect: "生成時の地形、気候、資源、国境、集落、街道。現在の支配国はworldSimulation.generatedWorld.regionalDomainsで確認。移動の可否、食料・生産力、交易路と国力の基盤になる。" },
  { match: /^rules\.actionTags/, name: "国家行動の文化タグ", source: "src/geopolitical-world.js", effect: "各行動と六特性の適合係数（−1〜1）。特性との積の平均が文化適合点となり、選択確率へ作用する。" },
  { match: /^rules\.action/, name: "国家行動の共通定数", source: "src/state-reason-system.js", effect: "各行動の五条件・二国間関係への直接増減。予測と実際の適用が同じ定義を参照する。行動タグは六特性との適合計算に使う。" },
  { match: /^rules/, name: "共通ルール", source: "src/v3-simulation-model.js", effect: "ゲーム内で使用中の定義値。設定フォームにある項目以外は読み取り専用で、コードと同じ値を表示する。" },
  { match: /^worldSimulation/, name: "生成世界の保存状態", source: "src/v3-world-simulation.js", effect: "地方、国家、危機、市場と年代記を同じ月次順で保存・復帰する。識別子は対応する国家・地方・人物への参照。" },
]);

const FIELDS = {
  retentionBuffer: "成立済み合意の維持に必要な信頼を新規加盟の閾値より8低くする。毎月の小さな国力変動で合意が反転し続けることを防ぐ。戦争・制度不履行・自治低下は解除しない。",
  minRetentionTrust: "既存合意を維持する信頼の下限35。新規加盟の最低信頼42とは別。",
  funded: "前回の月次維持費を支払えた場合true。falseなら制度の生産・物流・環境効果を停止し、次の支払完了で再開。",
  officeRequired: "trueなら領有国の一致に加え、地方の領主がv3-playerであることを要求。失職した地方へ制度を誤適用しない。",
  habitatHealth: "生息環境0〜100。水源共同管理と保護区で月次回復。リヴァイアサンとの協議費用・語りへ作用し、終盤の選択でも変化。",
  sanctuary: "生息地保護区。支払済みの統治地方で伐採量−8%、洪水・山火事の圧力目標−5、生息環境を毎月2回復。",
  shippingCharter: "水路の通航協約。支払済みの統治地方を通る国境街道の物流係数+0.15。海路ネットワークの追加ではない。",
  institutions: "採用済み制度ID。rules.civicPoliciesの同じ定義を任官条件・月次会計・実生産・災害に使用。",
  stewardshipActs: "任官後に実施した異なる統治行動。2種類以上と在任2か月・支持などを満たすと主権を交渉できる。待機だけでは増えない。",
  trust: "その国との信頼0〜100。相手条件から求める閾値と具体的提案・自治・平和を揃えて加盟合意を判定する。",
  legacyConsent: "既存V6に保存された成立済み合意を維持する互換フラグ。新しい合意には具体的な提案が必要。",
  kind: "依頼・提案・履歴の種類ID。外交提案では食料・防衛・財政・環境・自治の要求を固定し、援助直後の要求のすり替わりを防ぐ。",
  method: "外交提案の履行方法。policyは対応制度の継続を要求し、aidは資金援助と加盟後の毎月負担を記録。",
  monthlySupport: "毎月の支持への加算。通常の維持低下・不足・戦争の影響と合算し0〜100へ制限する。",
  taxRate: "基本税収への加減算率。0.18なら18%増、−0.08なら8%減。複数制度と終盤の選択を合算する。",
  upkeep: "一か月に必要な公金。制度、加盟条件、終盤の約束の分を会計に合算する。",
  production: "全商品の月産倍率への加算率。0.08なら+8%。地域予算制度が実際の市場在庫を増やす。",
  grainProduction: "穀物の月産倍率への加算率。共同備蓄は+0.16。消費・輸送後の実在庫を食料判断へ渡す。",
  timberProduction: "木材の月産倍率への加算率。水源保全では−0.12。価格と交易可能量へ間接的に作用。",
  tradeAccess: "国境街道の輸送能力への加算率。両端の大きい側の制度効果を使い、同じ荷物を二重に増やさない。戦争封鎖の倍率は残る。",
  roadRepair: "統治地方を通る街道資産の状態へ毎月加算する値。0〜100で制限。通行・物流の既存計算がこの状態を使う。",
  habitatRecovery: "生息環境の毎月の回復量。保護区の+2と加算。費用未払や失職中は回復しない。",
  floodReduction: "洪水圧力の目標から引く値。既存圧力を即時消すものではなく、月次の平滑化後に効果が現れる。",
  fireReduction: "山火事圧力の目標から引く値。地形・季節・気候の圧力と合算する。",
  raidReduction: "魔族襲撃圧力の目標から引く値。共同防衛・常備軍の制度が月次リスクを緩和する。",
  defenseMaintenance: "月次防備への加算。通常の防備消耗0.5と戦争中の追加消耗を相殺する。",
  civicMitigation: "制度・保護区がその危機の目標圧力を減らした量。危機の発生原因表示に使用する。",
  supplyRelief: "地方穀物備蓄0.75か月以上・需要未充足10%以下なら1。翌月の飢饉圧力の目標を20以下に抑え、継続補給で回復させる。",
  supplyObserved: "直近の地方市場の消費需要を観測できた場合1。市場情報がない地方は国家・地理条件を用いる。",
  foodSecurity: "食料の国家指数（0〜100）。最弱環、資源確保の利得、飢饉リスクへ作用。",
  cohesion: "国内結束（0〜100）。最弱環、内政候補、戦争疲弊・自治圧力へ作用。",
  reserves: "国家財政指数（0〜100）。所持金とは別。最弱環、動員負担、資源圧力へ作用。",
  readiness: "防衛・動員水準（0〜100）。最弱環、開戦条件、消耗と戦闘継続へ作用。",
  sovereignty: "国家主権指数（0〜100）。最弱環、国境圧力への対応へ作用。",
  offensiveIntent: "攻勢意図（0〜100）。威圧・動員で増え、緊張緩和で減る。開戦には45以上など複数条件が必要。",
  tension: "二国間緊張（0〜100）。危機の継続、動員、戦争候補の条件に作用。",
  relation: "二国間関係。協調・交易・同盟候補と敵意の評価へ作用。",
  inventory: "市場の商品なら在庫量。生産・輸送・消費・売買で増減し、価格と供給可能量を決める。人物では所持品の一覧。",
  buyPrice: "人物が市場から買う単価。地理・需給・環境で変化し、買付で在庫が減ると再計算する。",
  sellPrice: "人物が市場へ売る単価。買値の約78%を基準とし、売却で在庫が増えると再計算する。",
  capacity: "市場の保管上限。供給基盤から求め、危機だけで既存在庫を切り捨てない。月次生産・輸送の受入余地に使用。",
  priceCoefficient: "商品基準価格×地理×環境の係数。在庫変動後の需給価格を再計算するため保持。",
  supply: "地理・資源・制度・環境などから得る供給指数。月産量と供給側の価格に作用。",
  demand: "人口・都市機能などから得る需要指数。消費量、目標在庫と不足の判定に作用。",
  lastProduction: "直近月にこの市場で生産した商品量。月次在庫を増やす。",
  lastExports: "直近月に街道へ出荷した商品量。この市場から減らし、到着側の在庫・未充足需要へ渡す。",
  playerFlow: "その月の人物による市場への純流入。売却で増え、買付で減る。在庫・価格変化の原因を追跡する。",
  targetInventory: "需要に対応する目標在庫量。供給不足と需給価格の基準に使用。",
  coverageMonths: "商品在庫÷月間消費需要。0.75か月未満を不足と判定し、価格と供給説明に使用。",
  price: "その商品の現在価格。需給・環境・関係などの影響を含む。売買時には現在の市場を再検証する。",
  lastConsumption: "直近月の消費需要量。実際に供給できた量は未充足分を引いた量。",
  lastUnmetConsumption: "直近月に満たせなかった消費需要。国家の食料・財政・結束への影響に集計する。",
  lastImports: "直近月に街道から到着した量。需要を補い不足を軽減する。",
  grainUnmetShare: "直近月の穀物需要の未充足率（0〜1）。国家の食料・結束を下げ、次月の環境対応点に作用。",
  grainCoverageMonths: "穀物在庫÷直近月需要。何か月分を備蓄しているか。0.75未満の不足圧力、1.5以上の危機時補給判断に使用。",
  pressure: "危機・自治など所属システムの圧力。原因が続くと蓄積し、発生・深刻化・独立の判定へ作用。",
  severity: "危機度（1〜5）。被害・移動負担・市場供給などの影響を強める。",
  population: "居住人口。生産・需要・国力、気質構成の集計に使用。所属する地方・階級・信仰は同じ人口の異なる集計。",
  militarism: "武力への傾斜（−100〜100）。高いほど軍事行動のタグとの適合点が増える。",
  authority: "権威への傾斜（−100〜100）。制度・人口・指導者と行動タグから適合を評価。",
  centralization: "中央集権への傾斜（−100〜100）。国内統合などのタグとの適合点へ作用。",
  openness: "開放性（−100〜100）。通商・協調への文化適合に作用。",
  ambition: "拡張意欲（−100〜100）。威圧・拡張などへの文化適合に作用し、開戦条件を単独で解除しない。",
  pragmatism: "実利志向（−100〜100）。食料確保・外交・停戦などへの文化適合に作用。",
  probability: "その月にこの候補を抽選する実際の確率（0〜1）。除外候補は0。承認待ちの代替行動は抽選していないためnull。旧履歴は診断値の場合がある。",
  roll: "シード・年月・国家ID・試行番号から作った抽選値（0以上1未満）。厳密モードは抽選しないためnull。",
  evaluation: "記録された候補の合計点。新モデルではfactorsの合計を温度で割りsoftmaxで確率に変換する。",
  hp: "現在HP。被害で減り、回復で増加。0で敗北処理へ進む。",
  maxHp: "HPの上限。回復量と成長の上限判定に使用。",
  gold: "人物の所持金。宿泊、売買、雇用、出資・税収に使用。国家財政指数や商会資金とは別。",
  xp: "人物の経験値。冒険・戦闘の成果から成長を判定。",
  level: "人物の成長段階。体力・戦闘力などへ反映。",
  x: "横座標。所属する地形・人物・施設の位置。世界座標と詳細1マス座標で尺度が異なる。",
  y: "縦座標。所属する地形・人物・施設の位置。世界座標と詳細1マス座標で尺度が異なる。",
  elapsedMinutes: "開始からのゲーム内経過分。日・月境界を越えると共有カーネルが各システムを進める。",
  seed: "生成と決定論的抽選の基点。変えると別世界になり、既存世界の設定適用では書き換えない。",
  version: "保存形式の版番号。互換性の検査に使用し、行動点数には加算しない。",
  schemaVersion: "システム保存形式の版番号。互換性の検査に使用。",
};

export function describeV3Variable(path) {
  const text = Array.isArray(path) ? path.join(".") : String(path);
  const key = text.split(".").at(-1);
  const domain = V3_VARIABLE_DOMAINS.find((entry) => entry.match.test(text));
  const parameter = /(^model|\.model)\./.test(text) ? V3_MODEL_PARAMETERS.find((entry) => entry.id === key) : null;
  return { name: parameter?.name ?? key, category: domain?.name ?? "未分類", source: parameter?.source ?? domain?.source ?? null,
    effect: parameter?.effect ?? (text.startsWith("rules.actionEffects.") ? "一回の国家行動による直接増減量。予測と実際の適用で共用する。" : text.startsWith("rules.actionTags.") ? "文化タグ係数（−1〜1）。対応する六特性との積の平均を文化適合点とし、0.42×人口文化の重みを乗算する。" : [FIELDS[key], domain?.effect].filter(Boolean).join(" ") || "追加された変数です。作用説明の登録が必要です。"),
    classified: Boolean(domain), range: parameter?.choices ? Object.keys(parameter.choices).join(" / ") : parameter ? parameter.min + "〜" + parameter.max : null };
}

export function createV3VariableSnapshot({ runtime, state, worldSimulation, worldOptions, model }) {
  return {
    model: normalizeV3SimulationModel(worldSimulation?.model ?? model),
    generation: worldOptions ?? {},
    field: state ?? {},
    worldSimulation: worldSimulation ?? {},
    geography: runtime ? { tiles: runtime.tiles, nations: runtime.nations, profiles: deriveGeopoliticalProfiles(runtime) } : {},
    rules: { actionEffects: GEOPOLITICAL_ACTION_EFFECTS, actionTags: GEOPOLITICAL_DECISION_TAGS,
      civicPolicies: V3_INSTITUTIONS, diplomacy: V3_DIPLOMACY_RULES, diplomaticNeeds: V3_DIPLOMATIC_NEEDS,
      weather: V3_WORLD_EFFECT_DEFINITIONS, celestial: V3_CELESTIAL_EFFECT_DEFINITIONS, externalCrises: V3_EXTERNAL_CRISIS_DEFINITIONS },
  };
}

export function variableAt(snapshot, path) {
  return path.reduce((value, key) => value && Object.hasOwn(value, key) ? value[key] : undefined, snapshot);
}

export function variableEntries(snapshot, path = []) {
  const value = variableAt(snapshot, path);
  return value && typeof value === "object" ? Object.entries(value).map(([key, entry]) => ({ path: [...path, key], value: entry })) : [];
}

export function searchV3Variables(snapshot, query, offset = 0, limit = 50) {
  const needle = String(query).trim().toLocaleLowerCase();
  const entries = [];
  let total = 0;
  function visit(value, path) {
    if (value && typeof value === "object") { for (const [key, entry] of Object.entries(value)) visit(entry, [...path, key]); return; }
    const name = path.join(".");
    if (!name.toLocaleLowerCase().includes(needle)) return;
    if (total >= offset && entries.length < limit) entries.push({ path, value });
    total += 1;
  }
  visit(snapshot, []);
  return { entries, total };
}

export function v3VariableReference() {
  return { domains: V3_VARIABLE_DOMAINS.map(({ match, ...entry }) => ({ ...entry, pattern: match.source })),
    fields: { ...FIELDS }, parameters: V3_MODEL_PARAMETERS,
    interpretation: "上から一致する分類の説明と、個別フィールドの説明を併用。actionEffectsは一回の直接増減量。未登録の分類は未分類として表示。" };
}
