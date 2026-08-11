import { ABILITY_LABELS, ABILITY_KEYS, normalizeAbilityScores } from "./character-abilities.js";

export const CHARACTER_TEMPLATE_SCHEMA_VERSION = 2;

const STAT_KEYS = ["leadership", "war", "intelligence", "politics", "charisma"];

const RACE_LABELS = Object.freeze({
  human: "人間",
  elf: "エルフ",
  dwarf: "ドワーフ",
  orc: "オーク",
  giant: "巨人",
  unknown: "未設定",
});

const TRAIT_LABELS = Object.freeze({
  commerce: "商業",
  harbor: "港湾行政",
  diplomacy: "外交",
  scouting: "偵察",
  drill: "訓練",
  repair: "補修",
  mobilize: "動員",
  justification: "正当化",
  recruitment: "登用",
});

function asList(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && item !== "");
  return value === null || value === undefined || value === "" ? [] : [value];
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

function optionalText(value) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function normalizeScenes(scenes) {
  return Object.fromEntries(Object.entries(asRecord(scenes)).map(([eventId, variants]) => [
    eventId,
    asList(variants).map((variant, index) => ({
      ...variant,
      id: variant?.id ?? `${eventId}-${index + 1}`,
      priority: optionalNumber(variant?.priority) ?? 0,
      when: asRecord(variant?.when),
      presentation: asRecord(variant?.presentation),
      dialogue: asList(variant?.dialogue).map((line) => typeof line === "string" ? { speaker: "self", text: line } : { ...line }),
    })),
  ]));
}

function mergeScenes(baseScenes, ownScenes) {
  const base = normalizeScenes(baseScenes);
  const own = normalizeScenes(ownScenes);
  return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(own)])]
    .map((eventId) => [eventId, [...(base[eventId] ?? []), ...(own[eventId] ?? [])]]));
}

export const HUMAN_CHARACTER_ARCHETYPES = Object.freeze({
  human_honor: Object.freeze({
    id: "human_honor",
    raceId: "human",
    name: "名誉を重んじる武人",
    description: "忠節と責任を重んじ、敗北も自らの責として引き受ける。",
    personality: Object.freeze({ temperament: "実直・勇敢", values: ["名誉", "忠節", "責任"], speechStyle: "簡潔な武人調", firstPerson: "私", secondPerson: "貴公" }),
    scenes: Object.freeze({
      "battle.defeat.retreat": Object.freeze([Object.freeze({
        id: "human-honor-defeat-retreat",
        priority: 10,
        presentation: Object.freeze({ portrait: "defeat", position: "right", enter: "fade", exit: "fade-slide-right" }),
        dialogue: Object.freeze([{ speaker: "self", text: "この敗北は私のものだ。兵を責めるな。――次は、こちらが勝つ。全軍、退け！" }]),
      })]),
    }),
  }),
  human_strategist: Object.freeze({
    id: "human_strategist",
    raceId: "human",
    name: "冷静な軍略家",
    description: "感情より戦況を優先し、撤退も次の一手として扱う。",
    personality: Object.freeze({ temperament: "冷静・分析的", values: ["合理", "勝機", "準備"], speechStyle: "抑制された断定調", firstPerson: "私", secondPerson: "あなた" }),
    scenes: Object.freeze({
      "battle.defeat.retreat": Object.freeze([Object.freeze({
        id: "human-strategist-defeat-retreat",
        priority: 10,
        presentation: Object.freeze({ portrait: "defeat", position: "right", enter: "fade", exit: "fade-slide-right" }),
        dialogue: Object.freeze([{ speaker: "self", text: "一手、譲っただけだ。勝ちに酔って追ってこい――次の戦場は、私が選ぶ。撤退する" }]),
      })]),
    }),
  }),
  human_guardian: Object.freeze({
    id: "human_guardian",
    raceId: "human",
    name: "部下を守る現実主義者",
    description: "勝敗より生還と再起を優先し、配下を見捨てない。",
    personality: Object.freeze({ temperament: "慎重・責任感", values: ["生存", "部下", "再起"], speechStyle: "率直な命令調", firstPerson: "私", secondPerson: "お前" }),
    scenes: Object.freeze({
      "battle.defeat.retreat": Object.freeze([Object.freeze({
        id: "human-guardian-defeat-retreat",
        priority: 10,
        presentation: Object.freeze({ portrait: "defeat", position: "right", enter: "fade", exit: "fade-slide-right" }),
        dialogue: Object.freeze([{ speaker: "self", text: "この場は譲る。だが、部下の命まで勝ち取ったと思うな。必ず連れ帰り、また立つ。退け！" }]),
      })]),
    }),
  }),
});

export const CHARACTER_TEMPLATE_SECTIONS = Object.freeze([
  Object.freeze({ id: "identity", label: "基本情報", description: "人物を一意に識別する項目", fields: Object.freeze([
    { path: "identity.id", label: "人物ID" }, { path: "identity.name", label: "名前" },
    { path: "identity.reading", label: "読み" }, { path: "identity.aliases", label: "別名・通称" },
    { path: "identity.raceId", label: "種族", format: "race" }, { path: "identity.gender", label: "性別" },
    { path: "identity.age", label: "年齢" }, { path: "identity.birthDate", label: "生年月日" },
  ]) }),
  Object.freeze({ id: "biography", label: "来歴・目的", description: "出自と現在までの経緯", fields: Object.freeze([
    { path: "biography.origin", label: "出自" }, { path: "biography.nationality", label: "出身国・地域" },
    { path: "biography.affiliation", label: "所属勢力" }, { path: "biography.occupation", label: "身分・職業" },
    { path: "biography.specialty", label: "専門" }, { path: "biography.summary", label: "人物概要" },
    { path: "biography.background", label: "経歴" }, { path: "biography.goal", label: "現在の目的" },
  ]) }),
  Object.freeze({ id: "visuals", label: "外見・立ち絵", description: "通常時と場面別の表示素材", fields: Object.freeze([
    { path: "visuals.portraitImage", label: "基本立ち絵" }, { path: "visuals.battlePortraitImage", label: "戦闘立ち絵" },
    { path: "visuals.expressions", label: "表情差分" }, { path: "visuals.themeColor", label: "テーマ色" },
    { path: "visuals.height", label: "身長" }, { path: "visuals.build", label: "体格" },
    { path: "visuals.hair", label: "髪" }, { path: "visuals.eyes", label: "瞳" },
    { path: "visuals.faceShape", label: "顔型・骨格" }, { path: "visuals.facialFeatures", label: "目鼻・眉・口" },
    { path: "visuals.skinTone", label: "肌の色調・特徴" }, { path: "visuals.signatureExpression", label: "固有の通常表情" },
    { path: "visuals.clothing", label: "服装" }, { path: "visuals.distinguishingFeatures", label: "外見上の特徴" },
  ]) }),
  Object.freeze({ id: "personality", label: "性格・口調", description: "判断基準と会話表現", fields: Object.freeze([
    { path: "personality.archetypeId", label: "人物型", format: "archetype" }, { path: "personality.temperament", label: "気質" },
    { path: "personality.values", label: "重視する価値" }, { path: "personality.likes", label: "好むもの" },
    { path: "personality.dislikes", label: "嫌うもの" }, { path: "personality.fears", label: "恐れ" },
    { path: "personality.speechStyle", label: "口調" }, { path: "personality.firstPerson", label: "一人称" },
    { path: "personality.secondPerson", label: "二人称" }, { path: "personality.traits", label: "特性", format: "traits" },
  ]) }),
  Object.freeze({ id: "capabilities", label: "能力・技能", description: "ゲーム計算に使う能力", fields: Object.freeze([
    ...ABILITY_KEYS.map((abilityId) => ({ path: `capabilities.abilities.${abilityId}`, label: ABILITY_LABELS[abilityId] })),
    { path: "capabilities.stats.leadership", label: "統率" }, { path: "capabilities.stats.war", label: "武力" },
    { path: "capabilities.stats.intelligence", label: "知力" }, { path: "capabilities.stats.politics", label: "政治" },
    { path: "capabilities.stats.charisma", label: "魅力" }, { path: "capabilities.skills", label: "技能" },
    { path: "capabilities.magic", label: "魔術・特殊能力" }, { path: "capabilities.equipment", label: "装備" },
  ]) }),
  Object.freeze({ id: "social", label: "関係", description: "家族・主従・人物間関係", fields: Object.freeze([
    { path: "social.family", label: "家族" }, { path: "social.allies", label: "友好人物" },
    { path: "social.rivals", label: "対立人物" }, { path: "social.liegeId", label: "主君" },
    { path: "current.bonds", label: "現在の親密度", current: true },
  ]) }),
  Object.freeze({ id: "gameplay", label: "役割・現在状態", description: "役割設定とゲーム中に変化する値", fields: Object.freeze([
    { path: "gameplay.role", label: "役割・官職" }, { path: "gameplay.titles", label: "称号" },
    { path: "gameplay.policy", label: "重視政策" }, { path: "gameplay.doctrine", label: "軍事教義" },
    { path: "gameplay.recruitable", label: "登用可否", format: "boolean" }, { path: "gameplay.commander", label: "指揮官適性", format: "boolean" },
    { path: "current.allegiance", label: "現在の所属", current: true }, { path: "current.rank", label: "現在の身分", current: true },
    { path: "current.location", label: "現在地", current: true }, { path: "current.loyalty", label: "忠誠", current: true },
    { path: "current.stamina", label: "意欲", current: true }, { path: "current.merit", label: "功績", current: true },
    { path: "current.assignment", label: "現在の任務", current: true },
  ]) }),
  Object.freeze({ id: "scenes", label: "場面反応", description: "後から自由に追加できるイベント別反応", fields: Object.freeze([
    { path: "scenes.eventKeys", label: "登録イベント", format: "sceneKeys" },
    { path: "scenes.variantCount", label: "場面差分数", format: "sceneCount" },
    { path: "scenes.defeatRetreat", label: "敗北撤退時の台詞", format: "defeatLine" },
  ]) }),
  Object.freeze({ id: "metadata", label: "管理情報", description: "追加・移行・検証に使う情報", fields: Object.freeze([
    { path: "schemaVersion", label: "テンプレート版" }, { path: "metadata.tags", label: "検索タグ" },
    { path: "metadata.characterKind", label: "人物区分", format: "characterKind" }, { path: "metadata.source", label: "データ出典" },
  ]) }),
]);

export const CHARACTER_TEMPLATE_FIELD_COUNT = CHARACTER_TEMPLATE_SECTIONS
  .reduce((sum, section) => sum + section.fields.length, 0);

export function createCharacterDefinition(source = {}) {
  if (source?.metadata?.templateVersion === CHARACTER_TEMPLATE_SCHEMA_VERSION && source.identity && source.capabilities) return source;
  const identitySource = asRecord(source.identity);
  const id = optionalText(identitySource.id ?? source.id);
  const name = optionalText(identitySource.name ?? source.name);
  if (!id) throw new Error("キャラクターには人物IDが必要です");
  if (!name) throw new Error(`キャラクター ${id} には名前が必要です`);

  const personalitySource = asRecord(source.personality);
  const archetypeId = optionalText(personalitySource.archetypeId ?? source.archetypeId);
  const archetype = HUMAN_CHARACTER_ARCHETYPES[archetypeId] ?? null;
  const archetypePersonality = archetype?.personality ?? {};
  const sourceStats = { ...asRecord(source.stats), ...asRecord(source.capabilities?.stats) };
  const stats = Object.fromEntries(STAT_KEYS.map((statId) => [statId, optionalNumber(sourceStats[statId])]));
  const role = optionalText(source.gameplay?.role ?? source.role);
  const specialty = optionalText(source.biography?.specialty ?? source.specialty);
  const abilities = normalizeAbilityScores(source, { seed: id, role: `${role ?? ""} ${specialty ?? ""}` });
  const policy = optionalText(source.gameplay?.policy ?? source.policy);
  const portrait = optionalText(source.visuals?.portrait ?? source.portrait ?? name.slice(0, 1));
  const portraitImage = optionalText(source.visuals?.portraitImage ?? source.portraitImage);
  const traits = asList(personalitySource.traits ?? source.traits);

  const definition = {
    ...source,
    schemaVersion: CHARACTER_TEMPLATE_SCHEMA_VERSION,
    id,
    name,
    raceId: optionalText(identitySource.raceId ?? source.raceId ?? archetype?.raceId ?? "unknown"),
    portrait,
    portraitImage,
    role,
    policy,
    stats,
    abilities,
    traits,
    identity: {
      id,
      name,
      reading: optionalText(identitySource.reading),
      aliases: asList(identitySource.aliases),
      raceId: optionalText(identitySource.raceId ?? source.raceId ?? archetype?.raceId ?? "unknown"),
      gender: optionalText(identitySource.gender),
      age: optionalNumber(identitySource.age),
      birthDate: optionalText(identitySource.birthDate),
    },
    biography: {
      origin: optionalText(source.biography?.origin ?? source.origin),
      nationality: optionalText(source.biography?.nationality),
      affiliation: optionalText(source.biography?.affiliation),
      occupation: optionalText(source.biography?.occupation ?? role),
      specialty,
      summary: optionalText(source.biography?.summary),
      background: optionalText(source.biography?.background),
      goal: optionalText(source.biography?.goal),
    },
    visuals: {
      portrait,
      portraitImage,
      battlePortraitImage: optionalText(source.visuals?.battlePortraitImage),
      expressions: asRecord(source.visuals?.expressions),
      themeColor: optionalText(source.visuals?.themeColor),
      height: optionalText(source.visuals?.height),
      build: optionalText(source.visuals?.build),
      hair: optionalText(source.visuals?.hair),
      eyes: optionalText(source.visuals?.eyes),
      faceShape: optionalText(source.visuals?.faceShape),
      facialFeatures: optionalText(source.visuals?.facialFeatures),
      skinTone: optionalText(source.visuals?.skinTone),
      signatureExpression: optionalText(source.visuals?.signatureExpression),
      clothing: optionalText(source.visuals?.clothing),
      distinguishingFeatures: optionalText(source.visuals?.distinguishingFeatures),
    },
    personality: {
      archetypeId,
      temperament: optionalText(personalitySource.temperament ?? archetypePersonality.temperament),
      values: asList(personalitySource.values ?? archetypePersonality.values),
      likes: asList(personalitySource.likes),
      dislikes: asList(personalitySource.dislikes),
      fears: asList(personalitySource.fears),
      speechStyle: optionalText(personalitySource.speechStyle ?? archetypePersonality.speechStyle),
      firstPerson: optionalText(personalitySource.firstPerson ?? archetypePersonality.firstPerson),
      secondPerson: optionalText(personalitySource.secondPerson ?? archetypePersonality.secondPerson),
      traits,
    },
    capabilities: {
      stats,
      abilities,
      skills: asList(source.capabilities?.skills),
      magic: asList(source.capabilities?.magic),
      equipment: asList(source.capabilities?.equipment),
    },
    social: {
      family: asList(source.social?.family),
      allies: asList(source.social?.allies),
      rivals: asList(source.social?.rivals),
      liegeId: optionalText(source.social?.liegeId),
    },
    gameplay: {
      role,
      titles: asList(source.gameplay?.titles ?? source.titles),
      policy,
      doctrine: optionalText(source.gameplay?.doctrine ?? source.doctrine),
      recruitable: source.gameplay?.recruitable ?? null,
      commander: source.gameplay?.commander ?? null,
    },
    scenes: mergeScenes(archetype?.scenes, source.scenes),
    metadata: {
      ...asRecord(source.metadata),
      tags: asList(source.metadata?.tags ?? source.tags),
      source: optionalText(source.metadata?.source),
      templateVersion: CHARACTER_TEMPLATE_SCHEMA_VERSION,
    },
  };
  return definition;
}

function valueAtPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function isConfigured(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function displayList(values, format) {
  return values.map((value) => format === "traits" ? TRAIT_LABELS[value] ?? value : value).join(" / ");
}

function displayValue(value, field, options) {
  const empty = options.emptyLabel ?? "未設定";
  if (!isConfigured(value)) return empty;
  if (field.format === "race") return RACE_LABELS[value] ?? value;
  if (field.format === "archetype") return HUMAN_CHARACTER_ARCHETYPES[value]?.name ?? value;
  if (field.format === "characterKind") return value === "unique" ? "ユニークキャラクター" : value === "generic" ? "汎用キャラクター" : value;
  if (field.format === "boolean") return value ? "可" : "不可";
  if (Array.isArray(value)) return displayList(value, field.format);
  if (typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${options.nameForId?.(key) ?? key} ${item}`).join(" / ") || empty;
  }
  return String(value);
}

function derivedSceneValue(character, field) {
  if (field.format === "sceneKeys") return Object.keys(character.scenes);
  if (field.format === "sceneCount") return Object.values(character.scenes).reduce((sum, variants) => sum + variants.length, 0);
  if (field.format === "defeatLine") return character.scenes["battle.defeat.retreat"]?.[0]?.dialogue?.map((line) => line.text).filter(Boolean) ?? [];
  return null;
}

export function createCharacterCodexSections(source, current = {}, options = {}) {
  const character = createCharacterDefinition(source);
  return CHARACTER_TEMPLATE_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    fields: section.fields.map((field) => {
      const rawValue = field.path.startsWith("current.")
        ? valueAtPath(current, field.path.slice("current.".length))
        : field.path.startsWith("scenes.")
          ? derivedSceneValue(character, field)
          : valueAtPath(character, field.path);
      return {
        path: field.path,
        label: field.label,
        current: Boolean(field.current),
        configured: isConfigured(rawValue),
        value: displayValue(rawValue, field, options),
      };
    }),
  }));
}

function conditionMatches(context, when) {
  return Object.entries(when).every(([path, expected]) => {
    const actual = valueAtPath(context, path);
    return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
  });
}

export function getCharacterSceneVariants(source, eventId, context = {}) {
  const character = createCharacterDefinition(source);
  return [...(character.scenes[eventId] ?? [])]
    .filter((variant) => conditionMatches(context, variant.when ?? {}))
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
}

export function resolveCharacterScene(source, eventId, context = {}) {
  return getCharacterSceneVariants(source, eventId, context)[0] ?? null;
}
