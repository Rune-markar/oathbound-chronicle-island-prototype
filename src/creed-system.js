export const CREED_SCHEMA_VERSION = 1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const CREED_AXIS_DEFINITIONS = Object.freeze({
  raceView: Object.freeze({
    id: "raceView", label: "種族観", negative: "多種族普遍主義", positive: "種族選民主義",
    negativeLabels: ["やや普遍的", "多種族普遍主義", "強い多種族普遍主義"],
    positiveLabels: ["やや同族重視", "種族選民主義", "強い種族選民主義"],
    words: { negative: ["万民", "共生"], positive: ["血統", "祖族"] },
    traitIds: { negative: "multi_racial_universalist", positive: "racial_electivist" },
    doctrines: {
      negative: ["種族によって人の価値を変えない", "異なる種族にも役割と庇護を開く"],
      positive: ["同族の結束と継承を優先する", "共同体の中核は同族が担うべきである"],
    },
    tendencies: { negative: "異種族の登用・婚姻・移住を受け入れやすい", positive: "同族の登用・相互扶助・動員を優先しやすい" },
  }),
  orthodoxy: Object.freeze({
    id: "orthodoxy", label: "正統観", negative: "習合・多元主義", positive: "教義純化・正統主義",
    negativeLabels: ["やや習合的", "習合・多元主義", "強い習合主義"],
    positiveLabels: ["やや正統重視", "正統主義", "強い教義純化"],
    words: { negative: ["諸神", "多元"], positive: ["正統", "純正"] },
    traitIds: { negative: "syncretic", positive: "orthodox" },
    doctrines: {
      negative: ["異なる神話と地方信仰を真理の別の姿として扱う", "征服地の信仰を排除せず体系へ取り込む"],
      positive: ["共同体を導く正しい教義は一つである", "教えの混乱を防ぐため正統な解釈を守る"],
    },
    tendencies: { negative: "異文化統治と宗教融和を選びやすい", positive: "教義統一・異端審査・共通教育を選びやすい" },
  }),
  clericalAuthority: Object.freeze({
    id: "clericalAuthority", label: "教権観", negative: "地方・個人信仰", positive: "中央教権主義",
    negativeLabels: ["やや地方重視", "地方信仰重視", "強い個人・地方信仰"],
    positiveLabels: ["やや中央教権的", "中央教権主義", "強い中央教権主義"],
    words: { negative: ["郷祀", "自治"], positive: ["聖権", "教座"] },
    traitIds: { negative: "local_faith", positive: "central_clergy" },
    doctrines: {
      negative: ["土地と個人による信仰の解釈を認める", "遠い教権より地域共同体の実践を重んじる"],
      positive: ["聖職と教義は中央組織によって統一されるべきである", "公認された聖典と聖職者の階層を守る"],
    },
    tendencies: { negative: "地方自治と地域文化への適応を優先しやすい", positive: "宗教官僚・正式聖典・中央組織を支持しやすい" },
  }),
  theocracy: Object.freeze({
    id: "theocracy", label: "政治観", negative: "世俗主義・政教分離", positive: "神権主義",
    negativeLabels: ["やや世俗的", "政教分離重視", "強い世俗主義"],
    positiveLabels: ["やや神権的", "神権主義", "強い神権主義"],
    words: { negative: ["公議", "世俗"], positive: ["神授", "聖政"] },
    traitIds: { negative: "secularist", positive: "theocrat" },
    doctrines: {
      negative: ["政治の正当性を一つの宗教だけに依存させない", "異なる信仰を持つ者にも同じ統治法を適用する"],
      positive: ["統治は超越的な秩序によって正当化される", "法と公職は聖なる教えとの整合を保つべきである"],
    },
    tendencies: { negative: "実務政策・異教徒統治・政教分離を選びやすい", positive: "聖職者統治・宗教法・神授の権威を支持しやすい" },
  }),
  ritualism: Object.freeze({
    id: "ritualism", label: "信仰実践観", negative: "神秘・内面的信仰", positive: "律法・儀礼主義",
    negativeLabels: ["やや内面重視", "神秘・内面重視", "強い神秘主義"],
    positiveLabels: ["やや儀礼重視", "律法・儀礼主義", "強い律法主義"],
    words: { negative: ["霊心", "内観"], positive: ["聖典", "律法"] },
    traitIds: { negative: "mystical", positive: "ritualist" },
    doctrines: {
      negative: ["信仰の核心は個人の内面と霊的経験にある", "祈りと修行の形には一つでない道を認める"],
      positive: ["共同体は共通の戒律と儀礼によって結ばれる", "日々の実践が教えの真実を示す"],
    },
    tendencies: { negative: "個人的啓示・瞑想・柔軟な実践を尊重しやすい", positive: "戒律・祭礼・宗教法による秩序を重視しやすい" },
  }),
  asceticism: Object.freeze({
    id: "asceticism", label: "現世観", negative: "現世肯定", positive: "禁欲・来世主義",
    negativeLabels: ["やや現世肯定", "現世肯定", "強い現世肯定"],
    positiveLabels: ["やや禁欲的", "禁欲・来世重視", "強い禁欲主義"],
    words: { negative: ["繁栄", "現世"], positive: ["清貧", "修道"] },
    traitIds: { negative: "world_affirming", positive: "ascetic" },
    doctrines: {
      negative: ["富・婚姻・芸術・現世の成功を肯定する", "交易と生活の充実は共同体の善に結びつく"],
      positive: ["節制と自己犠牲は精神を強くする", "目先の富より永続する救済を優先する"],
    },
    tendencies: { negative: "商業・芸術・祝祭・家族形成を支持しやすい", positive: "節制・清貧・苦難への忍耐を重視しやすい" },
  }),
  missionary: Object.freeze({
    id: "missionary", label: "対外信仰観", negative: "非布教・共同体限定", positive: "布教・普遍的救済",
    negativeLabels: ["やや非布教的", "共同体限定", "強い非布教主義"],
    positiveLabels: ["やや布教的", "普遍的救済重視", "強い布教主義"],
    words: { negative: ["守伝", "内盟"], positive: ["救済", "宣教"] },
    traitIds: { negative: "non_missionary", positive: "missionary" },
    doctrines: {
      negative: ["信仰は共同体の生き方であり外部へ強制しない", "他者の救い方を一つに定めない"],
      positive: ["この教えは出自を問わず他者にも必要である", "遠隔地にも救済と教えを届ける"],
    },
    tendencies: { negative: "宗教摩擦を避け共同体内部の継承を優先しやすい", positive: "宣教・改宗・遠隔地の宗教施設建設を支持しやすい" },
  }),
});

export const CREED_AXIS_IDS = Object.freeze(Object.keys(CREED_AXIS_DEFINITIONS));

function normalizeImportance(value, fallback = 0.5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return clamp(fallback, 0, 1);
  return clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
}

export function normalizeCreedAxisState(source, fallbackImportance = 0.5) {
  const input = typeof source === "number" ? { value: source } : asRecord(source);
  return {
    value: clamp(Number.isFinite(Number(input.value)) ? Number(input.value) : 0, -100, 100),
    importance: normalizeImportance(input.importance, fallbackImportance),
  };
}

function sourceAxes(source) {
  const record = asRecord(source);
  if (record.axes) return asRecord(record.axes);
  return record;
}

function normalizeFlexibility(value) {
  return normalizeImportance(value, 0.72);
}

export function createCreedProfile(source = {}, options = {}) {
  const record = asRecord(source);
  const axesSource = sourceAxes(record);
  const customIds = Object.keys(axesSource).filter((id) => !["schemaVersion", "flexibility", "history", "identity", "dominantCreedTraits"].includes(id));
  const axisIds = [...new Set([...CREED_AXIS_IDS, ...customIds])];
  const defaultImportance = normalizeImportance(options.defaultImportance, 0.5);
  const profile = {
    schemaVersion: CREED_SCHEMA_VERSION,
    axes: Object.fromEntries(axisIds.map((id) => [id, normalizeCreedAxisState(axesSource[id], defaultImportance)])),
    flexibility: normalizeFlexibility(record.flexibility ?? options.flexibility),
    history: Array.isArray(record.history) ? record.history.slice(-80) : [],
    declaredCreed: record.declaredCreed ?? null,
  };
  return refreshCreedProfile(profile, options.naming);
}

export function getCreedAxisState(profile, axisId) {
  return normalizeCreedAxisState(profile?.axes?.[axisId] ?? 0);
}

export function getCreedStrength(value) {
  const absolute = Math.abs(Number(value) || 0);
  if (absolute >= 80) return "extreme";
  if (absolute >= 60) return "clear";
  if (absolute >= 30) return "leaning";
  return "neutral";
}

export function describeCreedAxis(axisId, value) {
  const definition = CREED_AXIS_DEFINITIONS[axisId];
  const numeric = clamp(Number(value) || 0, -100, 100);
  if (!definition) return { axisId, label: axisId, value: numeric, strength: getCreedStrength(numeric), text: Math.abs(numeric) < 30 ? "中立" : numeric > 0 ? "肯定側" : "否定側" };
  if (Math.abs(numeric) < 30) return { axisId, label: definition.label, value: numeric, strength: "neutral", text: "中立・未形成" };
  const index = Math.abs(numeric) >= 80 ? 2 : Math.abs(numeric) >= 60 ? 1 : 0;
  const side = numeric >= 0 ? "positive" : "negative";
  return { axisId, label: definition.label, value: numeric, strength: getCreedStrength(numeric), side, text: definition[`${side}Labels`][index] };
}

function signedAxisId(axisId, value) {
  return `${axisId}:${value >= 0 ? "positive" : "negative"}`;
}

const COMPOUND_NAMES = Object.freeze({
  "raceView:positive|orthodoxy:positive": "血統聖約主義",
  "raceView:negative|missionary:positive": "万民救済主義",
  "orthodoxy:negative|clericalAuthority:negative": "諸神調和信仰",
  "ritualism:positive|theocracy:positive": "聖典統治主義",
});

function creedIsFormed(majorAxes) {
  return majorAxes.some((axis) => axis.absolute >= 80) || majorAxes.filter((axis) => axis.absolute >= 60).length >= 2;
}

function namingWord(axis, wordIndex = 0) {
  const definition = CREED_AXIS_DEFINITIONS[axis.id];
  if (!definition) return definition?.label ?? axis.id;
  return definition.words[axis.value >= 0 ? "positive" : "negative"][wordIndex] ?? definition.label;
}

function generatedCreedName(majorAxes, naming = {}) {
  const primary = majorAxes[0];
  const secondary = majorAxes[1];
  if (naming?.worldTerm && primary && (naming.axisId === undefined || naming.axisId === primary.id)) {
    const concept = secondary ? namingWord(secondary, 1) : namingWord(primary, 1);
    return `${naming.worldTerm}${concept}${naming.suffix ?? "信仰"}`;
  }
  if (secondary) {
    const directKey = `${signedAxisId(primary.id, primary.value)}|${signedAxisId(secondary.id, secondary.value)}`;
    const reverseKey = `${signedAxisId(secondary.id, secondary.value)}|${signedAxisId(primary.id, primary.value)}`;
    if (COMPOUND_NAMES[directKey]) return COMPOUND_NAMES[directKey];
    if (COMPOUND_NAMES[reverseKey]) return COMPOUND_NAMES[reverseKey];
  }
  const prefix = namingWord(primary, 0);
  const concept = secondary ? namingWord(secondary, 1) : namingWord(primary, 1);
  const religious = ["orthodoxy", "clericalAuthority", "ritualism", "missionary"].includes(primary.id);
  return `${prefix}${secondary ? concept : ""}${religious ? "信仰" : "主義"}`;
}

function majorAxesFor(profile, minimum = 30) {
  return Object.entries(profile.axes ?? {})
    .map(([id, state]) => ({ id, value: state.value, importance: state.importance, absolute: Math.abs(state.value), salience: Math.abs(state.value) * state.importance }))
    .filter((axis) => axis.absolute >= minimum)
    .sort((left, right) => right.salience - left.salience || right.absolute - left.absolute || left.id.localeCompare(right.id));
}

export function generateCreedIdentity(source, naming = {}) {
  const profile = source?.axes ? source : createCreedProfile(source);
  const majorAxes = majorAxesFor(profile);
  if (!creedIsFormed(majorAxes)) {
    return {
      formed: false, name: "特筆すべき信条なし", shortDescription: "価値観は存在するが、一つの明確な信条としてはまだ固まっていない。",
      doctrines: [], tendencies: [], majorAxes: majorAxes.slice(0, 3).map((axis) => describeCreedAxis(axis.id, axis.value)),
    };
  }
  const explicit = majorAxes.filter((axis) => axis.absolute >= 60);
  const namingAxes = explicit.length ? explicit : majorAxes;
  const doctrines = [];
  const tendencies = [];
  namingAxes.slice(0, 4).forEach((axis) => {
    const definition = CREED_AXIS_DEFINITIONS[axis.id];
    if (!definition) return;
    const side = axis.value >= 0 ? "positive" : "negative";
    definition.doctrines[side].forEach((text) => { if (doctrines.length < 5 && !doctrines.includes(text)) doctrines.push(text); });
    if (!tendencies.includes(definition.tendencies[side])) tendencies.push(definition.tendencies[side]);
  });
  const descriptions = namingAxes.slice(0, 3).map((axis) => describeCreedAxis(axis.id, axis.value).text);
  return {
    formed: true,
    name: generatedCreedName(namingAxes, naming),
    shortDescription: `${descriptions.join("、")}を中核とする信条。`,
    doctrines: doctrines.slice(0, 5),
    tendencies: tendencies.slice(0, 4),
    majorAxes: namingAxes.slice(0, 4).map((axis) => describeCreedAxis(axis.id, axis.value)),
  };
}

export function deriveDominantCreedTraits(source, threshold = 45) {
  const profile = source?.axes ? source : createCreedProfile(source);
  return Object.entries(profile.axes)
    .filter(([axisId, state]) => CREED_AXIS_DEFINITIONS[axisId] && Math.abs(state.value) >= threshold && state.importance >= 0.35)
    .sort((left, right) => Math.abs(right[1].value) * right[1].importance - Math.abs(left[1].value) * left[1].importance)
    .map(([axisId, state]) => CREED_AXIS_DEFINITIONS[axisId].traitIds[state.value >= 0 ? "positive" : "negative"]);
}

export function refreshCreedProfile(profile, naming = {}) {
  profile.identity = generateCreedIdentity(profile, naming);
  profile.dominantCreedTraits = deriveDominantCreedTraits(profile);
  return profile;
}

function creedEffectsFrom(actionOrEffects) {
  if (Array.isArray(actionOrEffects)) return actionOrEffects;
  return Array.isArray(actionOrEffects?.creedEffects) ? actionOrEffects.creedEffects : [];
}

export function evaluateCreed(source, actionOrEffects, context = {}) {
  const profile = source?.creed?.axes ? source.creed : source?.axes ? source : createCreedProfile(source ?? {});
  const effects = creedEffectsFrom(actionOrEffects);
  const scale = Number.isFinite(context.scale) ? context.scale : 20;
  const issueSalience = normalizeImportance(context.issueSalience, 1);
  const contributions = effects.map((effect) => {
    const belief = getCreedAxisState(profile, effect.id);
    const direction = clamp(Number(effect.direction) || 0, -1, 1);
    const relevance = normalizeImportance(effect.relevance, 1);
    const raw = belief.value / 100 * direction * belief.importance * relevance * issueSalience;
    return {
      id: effect.id, beliefValue: belief.value, importance: belief.importance,
      direction, relevance, raw: round(raw, 4), score: round(raw * scale, 2),
    };
  });
  const score = clamp(contributions.reduce((sum, item) => sum + item.score, 0), -(context.maximum ?? 100), context.maximum ?? 100);
  return { score: round(score, 2), contributions, tagged: effects.length > 0 };
}

export function evaluateCreedRelationship(leftSource, rightSource, context = {}) {
  const left = leftSource?.creed?.axes ? leftSource.creed : leftSource?.axes ? leftSource : createCreedProfile(leftSource ?? {});
  const right = rightSource?.creed?.axes ? rightSource.creed : rightSource?.axes ? rightSource : createCreedProfile(rightSource ?? {});
  const salience = asRecord(context.salience);
  const defaultSalience = normalizeImportance(context.defaultSalience, 0.35);
  const contributions = [...new Set([...Object.keys(left.axes), ...Object.keys(right.axes)])].map((axisId) => {
    const leftState = getCreedAxisState(left, axisId);
    const rightState = getCreedAxisState(right, axisId);
    const issueSalience = normalizeImportance(salience[axisId], defaultSalience);
    const mutualImportance = Math.sqrt(leftState.importance * rightState.importance);
    const similarity = 1 - Math.abs(leftState.value - rightState.value) / 100;
    const weight = mutualImportance * issueSalience;
    return { axisId, similarity: round(similarity, 3), weight: round(weight, 3), score: round(similarity * weight * 10, 2) };
  });
  const score = contributions.length
    ? contributions.reduce((sum, item) => sum + item.score, 0) / contributions.length
    : 0;
  return { score: round(clamp(score, -10, 10), 2), contributions };
}

function personalityFlexibility(profile, context) {
  const personality = asRecord(context.personality);
  const openness = normalizeImportance(personality.openness, 0.5);
  const stubbornness = normalizeImportance(personality.stubbornness, 0.5);
  return clamp((context.flexibility ?? profile.flexibility) * (0.75 + openness * 0.35 - stubbornness * 0.25), 0.05, 1.2);
}

function impactDelta(impact) {
  if (Number.isFinite(Number(impact.delta))) return Number(impact.delta);
  return clamp(Number(impact.direction) || 0, -1, 1) * Math.max(0, Number(impact.magnitude) || 0);
}

export function applyCreedImpact(source, impacts, context = {}) {
  const profile = source?.axes ? source : createCreedProfile(source ?? {});
  const eventImpacts = Array.isArray(impacts) ? impacts : [];
  const involvement = normalizeImportance(context.involvement, 1);
  const flexibility = personalityFlexibility(profile, context);
  const sensitivity = asRecord(context.axisSensitivity);
  const changes = [];
  eventImpacts.forEach((impact) => {
    if (!impact?.id) return;
    const current = getCreedAxisState(profile, impact.id);
    const baseDelta = impactDelta(impact);
    const axisSensitivity = clamp(Number(sensitivity[impact.id] ?? impact.sensitivity ?? 1), 0, 2);
    const convictionResistance = 1 - 0.76 * Math.pow(Math.abs(current.value) / 100, 1.35);
    const sameDirection = current.value === 0 || Math.sign(current.value) === Math.sign(baseDelta);
    const interpretation = sameDirection ? 1.08 : 0.86;
    const saturation = baseDelta > 0 ? (100 - current.value) / 100 : (100 + current.value) / 100;
    const actualDelta = baseDelta * involvement * flexibility * axisSensitivity * convictionResistance * interpretation * clamp(saturation, 0.15, 1.4);
    const nextValue = clamp(current.value + actualDelta, -100, 100);
    profile.axes[impact.id] = { value: round(nextValue, 2), importance: current.importance };
    changes.push({ id: impact.id, before: current.value, requestedDelta: baseDelta, delta: round(nextValue - current.value, 2), after: round(nextValue, 2) });
  });
  const important = Boolean(context.important) || changes.some((change) => Math.abs(change.delta) >= 2.5);
  if (important && changes.length) {
    profile.history.push({
      year: context.year ?? null, month: context.month ?? null, turn: context.turn ?? null,
      eventId: context.eventId ?? null, cause: context.cause ?? context.eventId ?? "historical_experience",
      changes: changes.map((change) => ({ id: change.id, delta: change.delta, after: change.after })),
    });
    profile.history = profile.history.slice(-80);
  }
  refreshCreedProfile(profile, context.naming);
  return { profile, changes };
}

export function applyCreedEvent(entity, event, context = {}) {
  if (!entity) return { profile: createCreedProfile(), changes: [] };
  entity.creed = entity.creed?.axes ? entity.creed : createCreedProfile(entity.creed ?? {});
  return applyCreedImpact(entity.creed, event?.creedImpact ?? [], {
    ...context,
    eventId: context.eventId ?? event?.id ?? event?.event,
    cause: context.cause ?? event?.cause ?? event?.id ?? event?.event,
    important: context.important ?? event?.important,
  });
}

function contributorWeight(contributor, layer) {
  const population = Math.max(0, Number(contributor.population ?? contributor.populationWeight ?? 0));
  const populationWeight = population > 1 ? Math.log10(population + 10) : population;
  const political = Math.max(0, Number(contributor.politicalPower ?? 0));
  const social = Math.max(0, Number(contributor.socialAuthority ?? 0));
  const religious = Math.max(0, Number(contributor.religiousAuthority ?? 0));
  const education = Math.max(0, Number(contributor.educationInfluence ?? 0));
  const legal = Math.max(0, Number(contributor.legalAuthority ?? 0));
  const culture = Math.max(0, Number(contributor.culturalInertia ?? 0));
  if (layer === "ruling") return political * 0.5 + legal * 0.2 + social * 0.2 + populationWeight * 0.1;
  if (layer === "institutional") return legal * 0.4 + religious * 0.25 + education * 0.2 + political * 0.1 + culture * 0.05;
  return populationWeight * 0.5 + social * 0.18 + education * 0.12 + culture * 0.2;
}

export function aggregateCreedProfiles(contributors = [], options = {}) {
  const layer = options.layer ?? "social";
  const normalized = contributors
    .map((contributor) => ({ ...contributor, profile: contributor.profile?.axes ? contributor.profile : createCreedProfile(contributor.profile ?? contributor.creed ?? {}) }))
    .map((contributor) => ({ ...contributor, weight: contributorWeight(contributor, layer) }))
    .filter((contributor) => contributor.weight > 0);
  if (!normalized.length) return createCreedProfile(options.fallback ?? {});
  const axisIds = [...new Set(normalized.flatMap((contributor) => Object.keys(contributor.profile.axes)))];
  const axes = Object.fromEntries(axisIds.map((axisId) => {
    let valueTotal = 0;
    let importanceTotal = 0;
    let totalWeight = 0;
    normalized.forEach((contributor) => {
      const axis = getCreedAxisState(contributor.profile, axisId);
      const effectiveWeight = contributor.weight * (0.25 + axis.importance * 0.75);
      valueTotal += axis.value * effectiveWeight;
      importanceTotal += axis.importance * contributor.weight;
      totalWeight += effectiveWeight;
    });
    const baseWeight = normalized.reduce((sum, contributor) => sum + contributor.weight, 0);
    return [axisId, { value: totalWeight ? valueTotal / totalWeight : 0, importance: baseWeight ? importanceTotal / baseWeight : 0.5 }];
  }));
  return createCreedProfile({ axes, flexibility: options.flexibility ?? 0.35 });
}

export function deriveCreedTension(group, context = {}) {
  const social = group.social?.axes ? group.social : createCreedProfile(group.social ?? {});
  const ruling = group.ruling?.axes ? group.ruling : createCreedProfile(group.ruling ?? {});
  const institutional = group.institutional?.axes ? group.institutional : createCreedProfile(group.institutional ?? {});
  const salience = asRecord(context.salience ?? group.salience);
  const faultLines = CREED_AXIS_IDS.map((axisId) => {
    const society = getCreedAxisState(social, axisId);
    const rulers = getCreedAxisState(ruling, axisId);
    const law = getCreedAxisState(institutional, axisId);
    const issueSalience = normalizeImportance(salience[axisId], 0.5);
    const socialInstitutional = Math.abs(society.value - law.value) * Math.sqrt(society.importance * law.importance) * issueSalience;
    const rulingInstitutional = Math.abs(rulers.value - law.value) * Math.sqrt(rulers.importance * law.importance) * issueSalience * 0.55;
    return { axisId, score: round(clamp(socialInstitutional * 0.7 + rulingInstitutional * 0.3, 0, 100), 1), social: society.value, ruling: rulers.value, institutional: law.value };
  }).sort((left, right) => right.score - left.score);
  const score = round(faultLines.slice(0, 3).reduce((sum, item, index) => sum + item.score * [0.55, 0.3, 0.15][index], 0), 1);
  return { score, pressure: round(score * 0.3, 1), level: score >= 60 ? "反動危機" : score >= 35 ? "強い政治的不満" : score >= 18 ? "制度的緊張" : "低い緊張", faultLines: faultLines.slice(0, 3) };
}

function blendGroupCreed(group) {
  return aggregateCreedProfiles([
    { profile: group.social, populationWeight: 5, socialAuthority: 2, culturalInertia: 2 },
    { profile: group.ruling, populationWeight: 1, politicalPower: 5, socialAuthority: 2 },
    { profile: group.institutional, populationWeight: 1, legalAuthority: 4, religiousAuthority: 2, educationInfluence: 2 },
  ], { layer: "social" });
}

export function createCreedGroup(source = {}, options = {}) {
  const record = asRecord(source);
  const group = {
    schemaVersion: CREED_SCHEMA_VERSION,
    social: createCreedProfile(record.social ?? record.profile ?? {}, { flexibility: record.social?.flexibility ?? 0.45 }),
    ruling: createCreedProfile(record.ruling ?? record.social ?? record.profile ?? {}, { flexibility: record.ruling?.flexibility ?? 0.32 }),
    institutional: createCreedProfile(record.institutional ?? record.ruling ?? record.social ?? record.profile ?? {}, { flexibility: record.institutional?.flexibility ?? 0.18 }),
    salience: Object.fromEntries(CREED_AXIS_IDS.map((axisId) => [axisId, normalizeImportance(record.salience?.[axisId], 0.5)])),
    policyDebates: Array.isArray(record.policyDebates) ? record.policyDebates.slice(-40) : [],
    history: Array.isArray(record.history) ? record.history.slice(-80) : [],
  };
  group.tension = deriveCreedTension(group);
  group.profile = blendGroupCreed(group);
  group.identity = generateCreedIdentity(group.profile, options.naming);
  group.dominantCreedTraits = deriveDominantCreedTraits(group.profile);
  return group;
}

export function refreshCreedGroup(group, options = {}) {
  group.social = createCreedProfile(group.social ?? {});
  group.ruling = createCreedProfile(group.ruling ?? {});
  group.institutional = createCreedProfile(group.institutional ?? {});
  group.tension = deriveCreedTension(group, options);
  group.profile = blendGroupCreed(group);
  group.identity = generateCreedIdentity(group.profile, options.naming);
  group.dominantCreedTraits = deriveDominantCreedTraits(group.profile);
  return group;
}

export function aggregateCreedGroup(contributors = {}, options = {}) {
  return createCreedGroup({
    social: aggregateCreedProfiles(contributors.social ?? [], { layer: "social", fallback: options.fallback }),
    ruling: aggregateCreedProfiles(contributors.ruling ?? contributors.social ?? [], { layer: "ruling", fallback: options.fallback }),
    institutional: aggregateCreedProfiles(contributors.institutional ?? contributors.ruling ?? [], { layer: "institutional", fallback: options.fallback }),
    salience: options.salience,
  }, options);
}

export function evaluateGroupCreed(groupSource, actionOrEffects, context = {}) {
  const group = groupSource?.social?.axes ? groupSource : createCreedGroup(groupSource ?? {});
  const layers = {
    social: evaluateCreed(group.social, actionOrEffects, { ...context, scale: context.scale ?? 24 }),
    ruling: evaluateCreed(group.ruling, actionOrEffects, { ...context, scale: context.scale ?? 24 }),
    institutional: evaluateCreed(group.institutional, actionOrEffects, { ...context, scale: context.scale ?? 24 }),
  };
  const weights = { social: 0.5, ruling: 0.3, institutional: 0.2, ...context.layerWeights };
  const score = Object.entries(layers).reduce((sum, [id, evaluation]) => sum + evaluation.score * weights[id], 0);
  const signs = Object.values(layers).map((evaluation) => Math.sign(evaluation.score)).filter(Boolean);
  return {
    score: round(score, 2), layers,
    divided: signs.includes(1) && signs.includes(-1),
    tension: group.tension,
  };
}

export function recordCreedPolicyDebate(group, input = {}) {
  const target = group?.social?.axes ? group : createCreedGroup(group ?? {});
  const evaluation = input.evaluation ?? evaluateGroupCreed(target, input.creedEffects ?? []);
  const score = evaluation.score;
  const implementation = score <= -30 ? "地方拒否・抵抗" : score <= -10 ? "施行遅延・妥協要求" : evaluation.divided ? "修正協議" : score >= 20 ? "広い支持" : "通常審議";
  const record = {
    year: input.year ?? null, month: input.month ?? null, turn: input.turn ?? null,
    policyId: input.policyId ?? null, optionId: input.optionId ?? null, score: round(score, 1),
    implementation, divided: evaluation.divided,
    layers: Object.fromEntries(Object.entries(evaluation.layers).map(([id, value]) => [id, round(value.score, 1)])),
  };
  target.policyDebates.unshift(record);
  target.policyDebates = target.policyDebates.slice(0, 40);
  return record;
}

export function advanceCreedGroup(group, context = {}) {
  const target = group?.social?.axes ? group : createCreedGroup(group ?? {});
  const institutionalReach = normalizeImportance(context.institutionalReach, 0.35);
  const rulingReach = normalizeImportance(context.rulingReach, 0.3);
  CREED_AXIS_IDS.forEach((axisId) => {
    const social = target.social.axes[axisId];
    const ruling = target.ruling.axes[axisId];
    const institution = target.institutional.axes[axisId];
    const salience = normalizeImportance(target.salience?.[axisId], 0.5);
    const socialDelta = (institution.value - social.value) * 0.006 * institutionalReach * salience
      + (ruling.value - social.value) * 0.004 * rulingReach * salience;
    const rulingDelta = (social.value - ruling.value) * 0.0025 * salience;
    social.value = round(clamp(social.value + socialDelta, -100, 100), 2);
    ruling.value = round(clamp(ruling.value + rulingDelta, -100, 100), 2);
  });
  return refreshCreedGroup(target);
}

export function creedImpactFromEffects(creedEffects, magnitude = 2) {
  return creedEffectsFrom(creedEffects).map((effect) => ({
    id: effect.id,
    delta: clamp(Number(effect.direction) || 0, -1, 1) * magnitude * normalizeImportance(effect.relevance, 1),
  }));
}

export function evaluateCreedDivergence(leftSource, rightSource, context = {}) {
  const left = leftSource?.creed?.axes ? leftSource.creed : leftSource?.axes ? leftSource : createCreedProfile(leftSource ?? {});
  const right = rightSource?.creed?.axes ? rightSource.creed : rightSource?.axes ? rightSource : createCreedProfile(rightSource ?? {});
  const salience = asRecord(context.salience);
  const contributions = [...new Set([...Object.keys(left.axes), ...Object.keys(right.axes)])].map((axisId) => {
    const leftAxis = getCreedAxisState(left, axisId);
    const rightAxis = getCreedAxisState(right, axisId);
    const issueSalience = normalizeImportance(salience[axisId], context.defaultSalience ?? 0.5);
    const importance = Math.sqrt(leftAxis.importance * rightAxis.importance);
    const score = Math.abs(leftAxis.value - rightAxis.value) / 2 * importance * issueSalience;
    return { axisId, score: round(score, 2), difference: round(leftAxis.value - rightAxis.value, 1), importance: round(importance, 2), salience: issueSalience };
  }).sort((leftItem, rightItem) => rightItem.score - leftItem.score);
  const score = contributions.slice(0, 3).reduce((sum, item, index) => sum + item.score * [0.55, 0.3, 0.15][index], 0);
  return { score: round(clamp(score, 0, 100), 1), faultLines: contributions.slice(0, 3) };
}

export function deriveCreedFactionPressure(groupSource, members = [], context = {}) {
  const group = groupSource?.social?.axes ? groupSource : createCreedGroup(groupSource ?? {});
  const reference = context.referenceLayer === "social" ? group.social
    : context.referenceLayer === "ruling" ? group.ruling
      : group.institutional;
  const threshold = clamp(Number(context.divergenceThreshold ?? 25), 0, 100);
  const candidates = members.map((member, index) => {
    const divergence = evaluateCreedDivergence(member.profile ?? member.creed ?? member, reference, { salience: group.salience });
    const politicalWeight = Math.max(0.1, Number(member.politicalPower ?? member.influence ?? 1));
    return { id: member.id ?? `member-${index + 1}`, divergence: divergence.score, faultLines: divergence.faultLines, politicalWeight };
  }).filter((member) => member.divergence >= threshold)
    .sort((left, right) => right.divergence * right.politicalWeight - left.divergence * left.politicalWeight);
  const conflict = normalizeImportance(context.politicalConflict, 0.5);
  const duration = clamp(Number(context.durationMonths ?? 0) / 60, 0, 1);
  const weightedDivergence = candidates.length
    ? candidates.reduce((sum, member) => sum + member.divergence * member.politicalWeight, 0) / candidates.reduce((sum, member) => sum + member.politicalWeight, 0)
    : 0;
  const pressure = clamp(weightedDivergence * (0.35 + conflict * 0.4 + duration * 0.25), 0, 100);
  return {
    pressure: round(pressure, 1),
    shouldFormFaction: candidates.length > 0 && pressure >= (context.formationThreshold ?? 25),
    candidates,
    cause: candidates[0]?.faultLines?.[0] ?? null,
  };
}

export function createReligiousInterpretation(religionId, creed = {}, metadata = {}) {
  return { religionId, creed: createCreedProfile(creed), ...metadata };
}

export function evaluateReligiousSchism(religion, interpretations = [], context = {}) {
  const sameReligion = interpretations.filter((interpretation) => interpretation.religionId === religion?.id);
  if (sameReligion.length < 2) return { religionId: religion?.id ?? null, risk: 0, shouldSplit: false, pairs: [] };
  const religiousSalience = {
    orthodoxy: 1,
    clericalAuthority: 1,
    theocracy: 0.65,
    ritualism: 0.85,
    missionary: 0.6,
    ...context.salience,
  };
  const pairs = [];
  sameReligion.forEach((left, leftIndex) => sameReligion.slice(leftIndex + 1).forEach((right) => {
    const divergence = evaluateCreedDivergence(left.creed, right.creed, { salience: religiousSalience, defaultSalience: 0.15 });
    pairs.push({ leftId: left.id ?? `interpretation-${leftIndex + 1}`, rightId: right.id ?? "interpretation", ...divergence });
  }));
  pairs.sort((left, right) => right.score - left.score);
  const duration = clamp(Number(context.durationMonths ?? 0) / 120, 0, 1);
  const politicalConflict = normalizeImportance(context.politicalConflict, 0.5);
  const organization = normalizeImportance(context.organizationalIndependence, 0.3);
  const risk = clamp((pairs[0]?.score ?? 0) * (0.35 + duration * 0.25 + politicalConflict * 0.25 + organization * 0.15), 0, 100);
  return {
    religionId: religion?.id ?? null,
    risk: round(risk, 1),
    shouldSplit: risk >= (context.schismThreshold ?? 45),
    pairs,
    primaryFaultLine: pairs[0]?.faultLines?.[0] ?? null,
  };
}
