export const TARGET_GRAIN = 48;
export const DEADLINE = 8;
export const MAX_ACTION_POINTS = 2;

export const WORLD = {
  country: {
    id: "selena",
    name: "セレナ島侯国",
    subtitle: "白潮海に浮かぶ、三都市の小島国",
    population: 12840,
  },
  cities: {
    selene: {
      id: "selene",
      name: "王都セレネ",
      shortName: "セレネ",
      kind: "王都",
      population: 4820,
      x: 424,
      y: 247,
      color: "#286b9b",
      villageIds: ["mugiwano", "kozue"],
      institution: "島政院・中央穀倉",
      description: "島の法と記録が集まる丘上都市。命令はここで作られるが、村の現況は三日前の報告に頼る。",
    },
    nereia: {
      id: "nereia",
      name: "港都ネレイア",
      shortName: "ネレイア",
      kind: "港都",
      population: 3910,
      x: 588,
      y: 418,
      color: "#187e89",
      villageIds: ["shionari", "aifune"],
      institution: "潮見倉庫・港務院",
      description: "白潮海の船便を束ねる港。速いが、海路へ依存するため嵐の影響をまともに受ける。",
    },
    orta: {
      id: "orta",
      name: "鐘楼市オルタ",
      shortName: "オルタ",
      kind: "市邑",
      population: 2530,
      x: 313,
      y: 474,
      color: "#7b6644",
      villageIds: ["haimugi", "kirigane"],
      institution: "鐘路組合・西倉",
      description: "丘陵農地を支える市場町。村ごとの升と鐘時が残り、記録の変換に時間がかかる。",
    },
  },
  villages: {
    mugiwano: {
      id: "mugiwano",
      cityId: "selene",
      name: "麦環村",
      kind: "穀作村",
      population: 348,
      households: 76,
      x: 489,
      y: 170,
      stock: 46,
      reserve: 28,
      recorded: 36,
      route: 0.88,
      trust: 61,
      custom: "一樽 = 王都升11杯",
      voice: "今年は出来がよい。でも台帳を直せば、全部持っていかれるのでは？",
      speaker: "庄屋 ミナ",
    },
    kozue: {
      id: "kozue",
      cityId: "selene",
      name: "梢守村",
      kind: "山林村",
      population: 204,
      households: 43,
      x: 344,
      y: 153,
      stock: 28,
      reserve: 20,
      recorded: 32,
      route: 0.79,
      trust: 67,
      custom: "冬囲い分は村の共有財",
      voice: "紙の上では豊かでも、山道で四樽に一樽は濡れてしまいます。",
      speaker: "炭焼き ユハ",
    },
    shionari: {
      id: "shionari",
      cityId: "nereia",
      name: "潮鳴村",
      kind: "塩田村",
      population: 279,
      households: 58,
      x: 666,
      y: 480,
      stock: 38,
      reserve: 19,
      recorded: 31,
      route: 0.9,
      trust: 55,
      custom: "穀物と塩を季節相場で交換",
      voice: "塩なら出せます。なぜ穀物だけを数えるのか、まず聞かせてください。",
      speaker: "塩頭 ナージャ",
    },
    aifune: {
      id: "aifune",
      cityId: "nereia",
      name: "藍舟村",
      kind: "漁村",
      population: 233,
      households: 49,
      x: 627,
      y: 542,
      stock: 30,
      reserve: 18,
      recorded: 28,
      route: 0.86,
      trust: 62,
      custom: "海路便は潮鐘で出航",
      voice: "船を一便増やすなら運べます。陸の荷車では期限に間に合いません。",
      speaker: "船主 エダ",
    },
    haimugi: {
      id: "haimugi",
      cityId: "orta",
      name: "灰麦村",
      kind: "穀作村",
      population: 306,
      households: 69,
      x: 232,
      y: 516,
      stock: 51,
      reserve: 32,
      recorded: 58,
      route: 0.72,
      trust: 49,
      custom: "一袋 = オルタ石2.4升",
      voice: "昨年の豊作を今年の在庫として数えられている。あの台帳は間違いです。",
      speaker: "粉屋 ダイン",
    },
    kirigane: {
      id: "kirigane",
      cityId: "orta",
      name: "霧鐘村",
      kind: "牧畜村",
      population: 210,
      households: 46,
      x: 286,
      y: 574,
      stock: 35,
      reserve: 22,
      recorded: 26,
      route: 0.76,
      trust: 71,
      custom: "日の出ではなく鐘時で取引",
      voice: "約束の量と期日が同じ書式なら、村は守れます。曖昧な命令が一番怖い。",
      speaker: "鐘守 オルフ",
    },
  },
};

export const POLICIES = {
  levy: {
    id: "levy",
    title: "一律三割徴発",
    tag: "速い / 強制",
    summary: "古い台帳の三割を各村へ割り当てる。調査なしで即日発布できる。",
    requirement: "条件なし",
    promise: "すべての村は、記録在庫の三割を差し出す。",
  },
  surplus: {
    id: "surplus",
    title: "余剰連動割当",
    tag: "調査 / 公平",
    summary: "冬越し備蓄を保護し、把握した余剰に応じて負担を分ける。",
    requirement: "証拠を3点集める",
    promise: "冬越し備蓄を侵さず、余剰の九割までを求める。",
  },
  purchase: {
    id: "purchase",
    title: "誓約買上制",
    tag: "信用 / 国庫",
    summary: "村の自発供出を王冠貨で買い上げ、期日と対価を誓約する。",
    requirement: "証拠2点・国庫30以上",
    promise: "一樽ごとに対価を払い、冬越し分には手を触れない。",
  },
};

export function getPlace(placeId) {
  return WORLD.cities[placeId] ?? WORLD.villages[placeId] ?? null;
}

export function getPlaceName(placeId) {
  return getPlace(placeId)?.name ?? "不明な場所";
}

export function getTravelMinutes(fromId, toId) {
  if (fromId === toId) return 0;
  const fromCity = WORLD.cities[fromId];
  const toCity = WORLD.cities[toId];
  const fromVillage = WORLD.villages[fromId];
  const toVillage = WORLD.villages[toId];
  if ((!fromCity && !fromVillage) || (!toCity && !toVillage)) return null;

  const fromHub = fromCity?.id ?? fromVillage.cityId;
  const toHub = toCity?.id ?? toVillage.cityId;
  const localLegs = (fromVillage ? 90 : 0) + (toVillage ? 90 : 0);
  if (fromHub === toHub) return Math.max(90, localLegs);
  return localLegs + 240;
}

function clone(value) {
  return structuredClone(value);
}

function makeLog(day, scope, title, text, tone = "neutral") {
  return { id: `${day}-${scope}-${title}-${Math.random().toString(36).slice(2, 8)}`, day, scope, title, text, tone };
}

export function createInitialState() {
  const villages = Object.fromEntries(
    Object.values(WORLD.villages).map((village) => [
      village.id,
      {
        stock: village.stock,
        recorded: village.recorded,
        trust: village.trust,
        hardship: 0,
        inspected: false,
        heard: false,
        relief: false,
        oathBreached: false,
        shipped: 0,
        quotaRemaining: 0,
      },
    ]),
  );

  const cities = Object.fromEntries(
    Object.values(WORLD.cities).map((city) => [
      city.id,
      { ledger: false, caravan: false, council: false, stormPenalty: 0 },
    ]),
  );

  return {
    version: 2,
    day: 1,
    deadline: DEADLINE,
    actionPoints: MAX_ACTION_POINTS,
    delivered: 0,
    target: TARGET_GRAIN,
    treasury: 80,
    legitimacy: 64,
    oathDebt: 0,
    evidence: 0,
    policy: null,
    role: "島政院の記録官",
    locationId: "selene",
    currentMinutes: 8 * 60,
    villages,
    cities,
    eventsTriggered: [],
    ended: false,
    log: [
      makeLog(1, "国家", "風待ちの徴発", "北岬の守備隊へ、8日目までに穀物48樽を届けるよう島政院が命じた。", "warning"),
      makeLog(1, "個人", "古い台帳", "記録官レナは、村の在庫記録が一季以上更新されていないことに気づいた。", "neutral"),
    ],
  };
}

export function getPolicyAvailability(state, policyId) {
  if (state.policy) return { allowed: false, reason: "すでに誓約を発布済みです" };
  if (state.ended) return { allowed: false, reason: "年代記は結末を迎えました" };
  if (policyId === "surplus" && state.evidence < 3) {
    return { allowed: false, reason: `証拠があと${3 - state.evidence}点必要です` };
  }
  if (policyId === "purchase" && state.evidence < 2) {
    return { allowed: false, reason: `証拠があと${2 - state.evidence}点必要です` };
  }
  if (policyId === "purchase" && state.treasury < 30) {
    return { allowed: false, reason: "国庫が30以上必要です" };
  }
  if (state.locationId !== "selene") {
    return { allowed: false, reason: "発布には王都セレネへ戻る必要があります" };
  }
  return { allowed: true, reason: "発布できます" };
}

export function enactPolicy(state, policyId) {
  const availability = getPolicyAvailability(state, policyId);
  if (!availability.allowed) throw new Error(availability.reason);
  const next = clone(state);
  next.policy = policyId;
  const policy = POLICIES[policyId];

  Object.values(WORLD.villages).forEach((village) => {
    const local = next.villages[village.id];
    if (policyId === "levy") {
      local.quotaRemaining = local.recorded * 0.3;
    } else if (policyId === "surplus") {
      local.quotaRemaining = Math.max(0, local.stock - village.reserve) * 0.9;
    } else {
      const trustFactor = Math.min(1.05, Math.max(0.58, local.trust / 72));
      local.quotaRemaining = Math.max(0, local.stock - village.reserve) * trustFactor;
    }
  });

  if (policyId === "levy") next.legitimacy -= 4;
  if (policyId === "surplus") next.legitimacy += 1;
  if (policyId === "purchase") next.legitimacy += 2;
  next.role = "島政院の徴発調整官";
  next.log.push(makeLog(next.day, "国家", policy.title, policy.promise, policyId === "levy" ? "warning" : "good"));
  return next;
}

function spendAction(next, minutes = 0) {
  if (next.ended) throw new Error("年代記はすでに結末を迎えています");
  if (next.actionPoints <= 0) throw new Error("本日の行動点を使い切りました");
  next.actionPoints -= 1;
  next.currentMinutes += minutes;
}

export function performAction(state, actionId, targetId) {
  const next = clone(state);

  if (actionId === "player.travel") {
    const destination = getPlace(targetId);
    const travelMinutes = getTravelMinutes(next.locationId, targetId);
    if (!destination || travelMinutes === null) throw new Error("移動先が見つかりません");
    if (travelMinutes === 0) throw new Error("すでにこの場所にいます");
    const originName = getPlaceName(next.locationId);
    spendAction(next, travelMinutes);
    next.locationId = targetId;
    next.log.push(makeLog(next.day, "個人", `${destination.name}へ移動`, `${originName}から${travelMinutes}分かけて移動した。世界の時間も同じだけ進んだ。`, "neutral"));
    return next;
  }

  if (actionId.startsWith("village.")) {
    const village = WORLD.villages[targetId];
    const local = next.villages[targetId];
    if (!village || !local) throw new Error("村が見つかりません");
    if (next.locationId !== targetId) throw new Error(`${village.name}へ移動してから行う必要があります`);

    if (actionId === "village.inspect") {
      if (local.inspected) throw new Error("この村の台帳は照合済みです");
      spendAction(next, 90);
      local.inspected = true;
      next.evidence += 1;
      const gap = local.stock - local.recorded;
      const direction = gap >= 0 ? `${Math.abs(gap)}樽の未記載在庫` : `${Math.abs(gap)}樽の過大記録`;
      next.log.push(makeLog(next.day, "村", `${village.name}の台帳照合`, `${direction}を確認した。冬越し必要量は${village.reserve}樽。`, "discovery"));
    } else if (actionId === "village.hear") {
      if (local.heard) throw new Error("この村ではすでに証言を聞きました");
      spendAction(next, 60);
      local.heard = true;
      local.trust = Math.min(100, local.trust + 5);
      next.evidence += 1;
      next.log.push(makeLog(next.day, "個人", `${village.speaker}の証言`, `「${village.voice}」`, "discovery"));
    } else if (actionId === "village.relief") {
      if (local.relief) throw new Error("この村にはすでに救援を送りました");
      if (next.treasury < 8) throw new Error("救援に必要な国庫8がありません");
      spendAction(next, 45);
      local.relief = true;
      local.stock += 8;
      local.trust = Math.min(100, local.trust + 7);
      next.treasury -= 8;
      next.log.push(makeLog(next.day, "村", `${village.name}へ救援`, "島政院の予備庫から穀物8樽を移した。村は徴発が一方通行ではないと知った。", "good"));
    } else {
      throw new Error("不明な村の行動です");
    }
    return next;
  }

  if (actionId.startsWith("city.")) {
    const city = WORLD.cities[targetId];
    const local = next.cities[targetId];
    if (!city || !local) throw new Error("都市が見つかりません");
    if (next.locationId !== targetId) throw new Error(`${city.name}へ移動してから行う必要があります`);

    if (actionId === "city.ledger") {
      if (local.ledger) throw new Error("統一台帳は導入済みです");
      if (next.treasury < 10) throw new Error("導入に必要な国庫10がありません");
      spendAction(next, 120);
      local.ledger = true;
      next.treasury -= 10;
      next.evidence += 1;
      city.villageIds.forEach((id) => {
        const villageState = next.villages[id];
        villageState.recorded = Math.round((villageState.recorded + villageState.stock) / 2);
      });
      next.log.push(makeLog(next.day, "都市", `${city.shortName}の統一台帳`, "村の升と都市の樽を同じ欄へ換算し、記録誤差と確認工程を減らした。", "good"));
    } else if (actionId === "city.caravan") {
      if (local.caravan) throw new Error("定期荷車便は編成済みです");
      if (next.treasury < 12) throw new Error("編成に必要な国庫12がありません");
      spendAction(next, 120);
      local.caravan = true;
      next.treasury -= 12;
      next.log.push(makeLog(next.day, "都市", `${city.shortName}の定期便`, "荷車・船・鐘時を一つの時刻表へ揃え、輸送容量と到着率を高めた。", "good"));
    } else if (actionId === "city.council") {
      if (local.council) throw new Error("現地評議会は開催済みです");
      spendAction(next, 90);
      local.council = true;
      next.evidence += 1;
      city.villageIds.forEach((id) => {
        next.villages[id].trust = Math.min(100, next.villages[id].trust + 4);
      });
      next.log.push(makeLog(next.day, "都市", `${city.shortName}現地評議会`, "村代表が冬越し線と輸送の条件を共同で記録した。", "discovery"));
    } else {
      throw new Error("不明な都市の行動です");
    }
    return next;
  }

  throw new Error("不明な行動です");
}

function triggerEvent(next) {
  if (next.day === 3 && !next.eventsTriggered.includes("north-storm")) {
    next.eventsTriggered.push("north-storm");
    next.cities.nereia.stormPenalty = 0.14;
    next.log.push(makeLog(next.day, "世界", "白潮の時化", "ネレイア沖の波が高まり、港都圏の輸送到着率が低下した。定期便があれば損失を抑えられる。", "warning"));
  }

  if (next.day === 5 && !next.eventsTriggered.includes("village-rumor")) {
    next.eventsTriggered.push("village-rumor");
    const averageTrust = deriveMetrics(next).averageTrust;
    if (averageTrust < 58) {
      next.legitimacy -= 5;
      next.log.push(makeLog(next.day, "記憶", "空倉の噂", "『島政院は冬越し分まで奪う』という噂が村道を巡り、布告への正統性が下がった。", "warning"));
    } else {
      next.legitimacy += 2;
      next.log.push(makeLog(next.day, "記憶", "返礼の噂", "『記録官は話を聞く』という噂が先に届き、村々の協力が広がった。", "good"));
    }
  }
}

function dispatchFromVillage(next, village, remainingArrival) {
  if (!next.policy || remainingArrival <= 0.001) return 0;
  const local = next.villages[village.id];
  const protectedFloor = next.policy === "levy" ? 2 : village.reserve;
  if (local.quotaRemaining <= 0.01 || local.stock <= protectedFloor) return 0;
  const cityState = next.cities[village.cityId];
  let capacity = 3.4 + (cityState.caravan ? 1.8 : 0);
  let reliability = village.route + (cityState.ledger ? 0.05 : 0) + (cityState.caravan ? 0.08 : 0) - cityState.stormPenalty;
  reliability = Math.max(0.52, Math.min(0.98, reliability));

  if (next.policy === "purchase") {
    capacity = Math.min(capacity, next.treasury / 0.75);
  }
  const sent = Math.max(0, Math.min(local.quotaRemaining, capacity, local.stock - protectedFloor, remainingArrival / reliability));
  if (sent <= 0.01) return 0;
  const arrived = sent * reliability;
  local.stock -= sent;
  local.shipped += sent;
  local.quotaRemaining -= sent;
  next.delivered = Math.min(next.target, next.delivered + arrived);

  if (next.policy === "purchase") {
    next.treasury = Math.max(0, next.treasury - sent * 0.75);
    local.trust = Math.min(100, local.trust + 1.4);
  } else if (next.policy === "surplus") {
    local.trust = Math.min(100, local.trust + (local.stock >= village.reserve ? 0.6 : -1.2));
  } else {
    local.trust = Math.max(0, local.trust - (local.stock < village.reserve ? 3.2 : 1.1));
  }

  if (local.stock < village.reserve) {
    local.hardship += Math.max(1, (village.reserve - local.stock) / 5);
    if (!local.oathBreached) {
      local.oathBreached = true;
      next.oathDebt += 1;
      next.log.push(makeLog(next.day, "誓約", `${village.name}の冬越し線を侵犯`, "布告の実行が保護すべき備蓄を割り、誓債として島の記憶に残った。", "warning"));
    }
  }
  return arrived;
}

export function advanceDay(state) {
  if (state.ended) throw new Error("年代記はすでに結末を迎えています");
  const next = clone(state);
  triggerEvent(next);
  const villages = Object.values(WORLD.villages);
  const dispatchOffset = (next.day - 1) % villages.length;
  const dispatchOrder = [...villages.slice(dispatchOffset), ...villages.slice(0, dispatchOffset)];
  let remainingArrival = Math.max(0, next.target - next.delivered);
  dispatchOrder.forEach((village) => {
    const arrived = dispatchFromVillage(next, village, remainingArrival);
    remainingArrival = Math.max(0, remainingArrival - arrived);
  });

  const dailyArrived = next.delivered - state.delivered;
  if (next.policy && dailyArrived > 0.01) {
    next.log.push(makeLog(next.day, "物流", `穀物便 ${dailyArrived.toFixed(1)}樽到着`, `累計${next.delivered.toFixed(1)}樽。街道と規格の差が、発送量と到着量の差として残った。`, "neutral"));
  } else if (!next.policy) {
    next.log.push(makeLog(next.day, "国家", "発布待ち", "徴発の形式が定まらず、村から穀物便は出なかった。", "warning"));
  }

  Object.values(WORLD.villages).forEach((village) => {
    const local = next.villages[village.id];
    if (local.stock < village.reserve) {
      const shortage = (village.reserve - local.stock) / village.reserve;
      local.hardship += shortage * 0.8;
      local.trust = Math.max(0, local.trust - shortage * 1.4);
      next.legitimacy -= shortage * 0.18;
    }
  });

  if (next.day >= next.deadline) {
    next.ended = true;
    const outcome = getOutcome(next);
    next.log.push(makeLog(next.day, "年代記", outcome.title, outcome.summary, outcome.level === "best" ? "good" : "warning"));
  } else {
    next.day += 1;
    next.actionPoints = MAX_ACTION_POINTS;
    next.currentMinutes = 8 * 60;
  }
  next.treasury = Math.round(next.treasury * 10) / 10;
  next.legitimacy = Math.max(0, Math.min(100, next.legitimacy));
  return next;
}

export function deriveMetrics(state) {
  const villageStates = Object.values(state.villages);
  const averageTrust = villageStates.reduce((sum, village) => sum + village.trust, 0) / villageStates.length;
  const totalHardship = villageStates.reduce((sum, village) => sum + village.hardship, 0);
  const totalStock = villageStates.reduce((sum, village) => sum + village.stock, 0);
  const knownVillages = villageStates.filter((village) => village.inspected).length;
  const standardizedCities = Object.values(state.cities).filter((city) => city.ledger).length;
  const information = Math.round(((knownVillages + standardizedCities * 1.5) / 10.5) * 100);
  const stability = Math.round(Math.max(0, Math.min(100, (state.legitimacy + averageTrust - totalHardship * 2) / 2)));
  return {
    averageTrust,
    totalHardship,
    totalStock,
    knownVillages,
    standardizedCities,
    information,
    stability,
  };
}

export function getOutcome(state) {
  const metrics = deriveMetrics(state);
  const supplied = state.delivered >= state.target;
  if (supplied && metrics.averageTrust >= 61 && state.oathDebt <= 2 && metrics.totalHardship < 5) {
    return {
      level: "best",
      title: "継がれる誓い",
      summary: "北方備蓄は満たされ、村々は次の命令にも応じる理由を残した。",
      body: "あなたは必要量だけでなく、その命令が次も届くための信用を守った。統一された記録と輸送路は、島国を一つの機構へ近づける。",
    };
  }
  if (supplied) {
    return {
      level: "mixed",
      title: "守られた冬、残った傷",
      summary: "守備隊の冬は守られたが、村々には負担と記憶が残った。",
      body: "国家の目的は達成された。しかし、足りた穀物と正しかった命令は同じではない。残った誓債は、次の危機で別の物語になる。",
    };
  }
  return {
    level: "failed",
    title: "届かなかった布告",
    summary: `北方備蓄は${state.delivered.toFixed(1)}樽に留まり、期限を迎えた。`,
    body: "命令、情報、輸送のどこかが届かなかった。島国は、個別の善意だけでは一つの機構として動かないことを記憶した。",
  };
}

export function getCityMetrics(state, cityId) {
  const city = WORLD.cities[cityId];
  const villages = city.villageIds.map((id) => state.villages[id]);
  const stock = villages.reduce((sum, village) => sum + village.stock, 0);
  const trust = villages.reduce((sum, village) => sum + village.trust, 0) / villages.length;
  const shipped = villages.reduce((sum, village) => sum + village.shipped, 0);
  const stateCity = state.cities[cityId];
  const route = city.villageIds.reduce((sum, id) => sum + WORLD.villages[id].route, 0) / villages.length;
  const arrival = Math.max(0.52, Math.min(0.98, route + (stateCity.ledger ? 0.05 : 0) + (stateCity.caravan ? 0.08 : 0) - stateCity.stormPenalty));
  return { stock, trust, shipped, arrival };
}
