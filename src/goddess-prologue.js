export const GODDESS_NAME = "女神イリシア";

export const GODDESS_MISSION = "迷える子羊、お前に使命を与える。生れ落ちた世界を統べ、強大な敵を打ち滅ぼせ。";

export const GODDESS_ARRIVAL_LINES = Object.freeze([
  "目を開け、迷える魂。ここは生と生の狭間だ。お前にはまだ肉体も、地位も、名を保証する者もいない。",
  GODDESS_MISSION,
  "降り立つ世界を今から定める。シードに従い、大地と国家を造る。お前の都合に合わせることはない。そこで生き残れ。",
]);

export const GODDESS_PERSISTENT_TAP_THRESHOLD = 6;
export const GODDESS_PERSISTENT_TAP_WINDOW_MS = 15000;

export const GODDESS_MERCY_LINES = Object.freeze([
  "なに？　何か特典を付けろだと？　不遜な。身の程を知れ。",
  "……だが、何も持たぬ身ではあまりに哀れだ。これは、我からの慈悲である。",
  "光がほどけ、その陰から粗末な衣の少女が現れた。戦う力は乏しい。だが、お前が最初に得る、ただ一人の同行者だ。",
  "連れは与えた。使命も行き先も変わらぬ。降り立つ世界を定める――名と姿、魂の適性を選べ。",
]);

const MERCY_GIRL_NAMES = Object.freeze(["ミナ", "リナ", "エナ", "ノア", "ティア", "ルゥ"]);
const MERCY_GIRL_ORIGINS = Object.freeze(["飢饉で売られた農村娘", "戦で故郷を失った奉公人", "借財の形に手放された街娘", "隊商から取り残された下働き"]);
const MERCY_GIRL_NATURES = Object.freeze(["臆病だが素直", "無口で辛抱強い", "人見知りだが気配りが利く", "おとなしいが諦めが悪い"]);

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function registerGoddessPersistentTap(prologue, now = Date.now()) {
  if (!prologue || prologue.mercyGranted || !["arrival", "selection"].includes(prologue.phase)) return { state: prologue, triggered: false };
  const recentTaps = [...(prologue.recentTaps ?? []), Number(now)]
    .filter((timestamp) => Number(now) - timestamp <= GODDESS_PERSISTENT_TAP_WINDOW_MS)
    .slice(-GODDESS_PERSISTENT_TAP_THRESHOLD);
  const triggered = recentTaps.length >= GODDESS_PERSISTENT_TAP_THRESHOLD;
  return {
    triggered,
    state: { ...prologue, recentTaps: triggered ? [] : recentTaps, mercyGranted: triggered || prologue.mercyGranted },
  };
}

export function createGoddessMercyCompanion(seed) {
  const hash = hashSeed(`${seed}:goddess-mercy`);
  const name = MERCY_GIRL_NAMES[hash % MERCY_GIRL_NAMES.length];
  const origin = MERCY_GIRL_ORIGINS[(hash >>> 5) % MERCY_GIRL_ORIGINS.length];
  const nature = MERCY_GIRL_NATURES[(hash >>> 10) % MERCY_GIRL_NATURES.length];
  const lowScore = (shift, floor = 5, spread = 4) => floor + ((hash >>> shift) % spread);
  const maxHp = 24 + (hash % 5);
  return {
    id: `goddess-mercy-${hash.toString(36)}`,
    name,
    level: 1,
    role: "非力な従者",
    specialty: "荷運びと身の回りの手伝い",
    origin,
    nature,
    status: "女神から与えられた奴隷",
    portraitImage: "./assets/generated/goddess-mercy-companion.png",
    transparent: true,
    alive: true,
    active: true,
    maxHp,
    hp: maxHp,
    battleState: "READY",
    abilities: {
      strength: lowScore(2, 4, 4),
      dexterity: lowScore(6, 6, 4),
      constitution: lowScore(10, 5, 4),
      intelligence: lowScore(14, 6, 4),
      wisdom: lowScore(18, 6, 4),
      charisma: lowScore(22, 6, 4),
    },
    goddessMercyCompanion: true,
  };
}

export const GODDESS_GENERATION_LINES = Object.freeze([
  "選んだ姿と才は魂へ刻んだ。後悔しても変更はない。与えられた資質を使え。",
  "大地を隆起させ、海と河川を通している。集落と国家も配置する。お前が着く前から、彼らには利害と敵がある。",
  "生れ落ちた直後のお前は、領地も兵も持たぬ無名の者だ。まず村へ行け。仕事を請け、依頼を果たし、功績を積め。",
  "功績がなければ、有力者はお前を使わない。救命、討伐、大会、紹介。利用できる機会を選び、士官の口を得ろ。",
  "力を得た後は、謀略で王国を乗っ取るもよい。国盗りを仕掛けるもよい。敵を滅ぼし、恐怖で従わせるのもよい。勝者だけが世界の形を決める。",
  "仕官した後は命令を果たし、主君の信頼と兵を得ろ。権限は願うものではない。成果を示し、奪い取るものだ。",
  "善意も理想も、力のない者には選べない。まず生き残り、立場を得ろ。その後で敵を従わせればよい。",
]);

export const GODDESS_DEPARTURE_LINE = "世界は完成した。ここから先に加護はない。功績を積み、仕官し、兵と領地を得ろ。できなければ、名も残さず死ぬだけだ。行け。世界を統べろ。その先に待つ真の敵を、跡形もなく滅ぼせ。";

export const WORLD_ENDING_DESIGN = Object.freeze([
  Object.freeze({
    id: "rational-world-empire",
    number: 1,
    title: "超合理国家による世界帝国",
    condition: "超合理国家として世界帝国を成立させ、リヴァイアサンを打ち滅ぼす。",
  }),
  Object.freeze({
    id: "pluralist-world-federation",
    number: 2,
    title: "多元主義を基幹とする世界連邦",
    condition: "多元主義を基幹とする世界連邦を成立させ、リヴァイアサンと和解し、女神の軍勢を退ける。",
  }),
]);

export function createGoddessPrologueState() {
  return {
    active: false,
    phase: "idle",
    line: "",
    lineNumber: 0,
    lineTotal: 0,
    generationReady: false,
    recentTaps: [],
    mercyGranted: false,
  };
}
