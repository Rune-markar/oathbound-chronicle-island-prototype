import { requestLandscapeMode } from "./orientation-control.js";
import { BUILD_INFO, getBuildCommitUrl } from "./build-info.js";
import {
  ADMINISTRATION_MANDATES,
  ADMINISTRATION_MODES,
  AFTERMATH_POLICIES,
  DELEGATION_AUTHORITY_LEVELS,
  DELEGATION_MANDATES,
  BORDER_SETTLEMENTS,
  AUTHORITY_DOMAINS,
  AUTHORITY_REFORM_STAGES,
  AUTHORITY_TRANSFER_METHODS,
  CENTRALIZATION_STAGES,
  CAREER_STAGE_ROUTE,
  PLAYABLE_CAREER_STAGE_ROUTE,
  CAREER_STAGES,
  PERSONAL_CHRONICLE_TICKER_LIMIT,
  COMMANDS,
  DOCTRINES,
  EVENT_DEFINITIONS,
  FACILITIES,
  FACTION_ACTIONS,
  FACTION_DEFINITIONS,
  FORCED_ORDER_RULES,
  FORMATIONS,
  HISTORY_POLICIES,
  GOVERNMENT_TITLE_SYSTEMS,
  LEVIATHAN_POLICIES,
  NATIONAL_REFORM_BUDGETS,
  NATIONAL_REFORM_SYSTEMS,
  PRESSURE_DEFINITIONS,
  POLICY_DEFINITIONS,
  OCCUPATION_POLICIES,
  REVENUE_CATEGORIES,
  REFORM_CONCESSIONS,
  SPENDING_CATEGORIES,
  GUILD_PROCESSED_GOODS,
  MERCHANT_COMMODITIES,
  VILLAGE_FACILITIES,
  WAR_OBJECTIVES,
  WAR_PLANS,
  WORLD_ENDGAME_ROUTES,
  WORLD,
  COLETTE_LINDE_ID,
  MARIELLE_CROIX_ID,
  UNIQUE_CHARACTERS,
  acknowledgeMonthReport,
  adoptDoctrine,
  answerOfficerDemand,
  appointForceOfficer,
  buyCommodity,
  cancelOrder,
  chooseAftermathPolicy,
  chooseHistoryPolicy,
  chooseLeviathanPolicy,
  commitMonth,
  createCareerInitialState,
  createInitialState,
  declareWar,
  deriveCityMetrics,
  deriveAdministrationNetwork,
  deriveMonthPreview,
  deriveMetrics,
  deriveRealmLedger,
  formatDate,
  getCityBreakdown,
  getCityAdministration,
  getCentralizationResult,
  getCentralizationCampaignStatus,
  getCentralizationDecisions,
  getAuthorityReform,
  getRegionAuthority,
  getCampaignStatus,
  getBorderNegotiationStatus,
  getCommandAvailability,
  getContinentalBalance,
  getCountryReport,
  getCouncilProposals,
  getEligibleOfficers,
  getEnemyCommander,
  getGovernance,
  getGovernanceView,
  getGuildStanding,
  getMerchantCargoLoad,
  getMerchantCargoLoadDetails,
  getSettlementMarket,
  getSettlementFacilities,
  getDelegationCandidates,
  getRoleDelegation,
  getRegionalReputationReport,
  getServiceRouteProgress,
  getGreatPowerFoundation,
  getHistoricalOverview,
  getHistoricalRuleEffects,
  getFoodSecurityStatus,
  getAftermathDecisionStatus,
  getForeignDispatches,
  getMilitarySummary,
  getMilitaryCareerMissionView,
  getLeviathanStatus,
  getWorldEndgameStatus,
  getPeaceOptions,
  getCityCreedReport,
  getNationCreedReport,
  getOfficerCreedReport,
  getOfficerReport,
  getOfficerPoliticalReport,
  getPlayerCreedReport,
  getPolicyCreedSupport,
  getTaskForecast,
  getTownAdministration,
  getTurnGuidance,
  getTurnWarnings,
  getVillageActionAvailability,
  getWarCouncilReport,
  getWarDeclarationEstimate,
  getWarSupport,
  getWarPlanOptions,
  getWarStage,
  isTownCommand,
  negotiatePeace,
  normalizeWarState,
  acceptServiceInvitation,
  advanceCareerMonth,
  executeGovernanceCommand,
  getCareerStage,
  getPersonalChronicleView,
  performCareerAction,
  performWorldEndgameAction,
  prepareMilitaryCareerMission,
  createMilitaryCareerBattle,
  reportMilitaryCareerMission,
  resolveMilitaryCareerBattle,
  startMilitaryCareerMission,
  acceptLivelihoodContract,
  advanceRealmCampaign,
  answerCompanionRequest,
  chooseLifePath,
  claimLifePathMilestone,
  completeLivelihoodContract,
  designateHeir,
  executeSuccession,
  getCareerAdvancementView,
  getSecondFiefCandidates,
  getLifeToRealmView,
  grantHouseholdReward,
  normalizeLifeToRealmState,
  payCompanionWages,
  performLifeAction,
  startFiefProject,
  startRealmCampaign,
  PROPERTY_TYPES,
  acquireProperty,
  getPropertyEnterpriseView,
  normalizePropertyEnterpriseState,
  openPlayerShop,
  closePlayerShop,
  priceShopCommodity,
  stockPlayerShop,
  transferCargoToWarehouse,
  withdrawWarehouseCargo,
  getCompanionQuestView,
  normalizeCompanionQuestState,
  respondToCompanionQuest,
  completeCompanionQuest,
  getEstatePoliticsView,
  normalizeEstatePoliticsState,
  startEstateProjectDebate,
  resolveEstateProjectDebate,
  getGeneratedCampaignView,
  interveneGeneratedWorldWar,
  respondGeneratedWorldWar,
  normalizeGeneratedCampaignState,
  requestAlliedContingent,
  startGeneratedCampaign,
  advanceGeneratedCampaign,
  decideGeneratedSiege,
  retreatGeneratedCampaign,
  settleGeneratedCampaign,
  performVillageAction,
  hearMarketRumors,
  observeSettlementMarket,
  acceptEquipmentUpgrade,
  dismissEquipmentUpgrade,
  getEquipmentUpgradeOffer,
  setPartyMemberActive,
  sellCommodity,
  reassignDelegatedRole,
  queueOrder,
  resolveBorderNegotiation,
  resolveAftermathDecisionChoice,
  resolveEventChoice,
  releaseOccupation,
  setFormation,
  setAdministrationMandate,
  setAdministrationMode,
  setDelegationAuthority,
  setDelegationMandate,
  startAuthorityReform,
  startNationalReformPackage,
  submitPetition,
  setOccupationGarrison,
  setOccupationPolicy,
  setWarPlan,
  CRIME_RISK_LABELS,
  getSettlementTheftOpportunities,
  previewTheft,
  executeTheft,
  getSettlementExtortionOpportunities,
  previewExtortion,
  executeExtortion,
  getRobberyOpportunities,
  previewRobbery,
  startRobbery,
  resolveRobberyThreat,
  resolveRobberyBattle,
  getSmugglingOffers,
  acceptSmugglingOffer,
  inspectSmugglingCheckpoint,
  deliverSmugglingCargo,
  getSabotageTargets,
  startSabotage,
  prepareSabotage,
  executeSabotage,
  getAssassinationTargets,
  startAssassination,
  prepareAssassination,
  executeAssassination,
  getCrimeStatusView,
  discoverUnderworldContacts,
  fenceStolenItem,
  collectExtortionPayment,
  resolveCrimeEvent,
  resolveCrimeRecovery,
} from "./simulation.js";
import {
  AUTOSAVE_INTERVAL_MS,
  markChronicleSaved,
  resumeDelegatedChronicle,
} from "./offline-delegation.js";
import {
  NOTION_OTHER_RACE_IDS,
  EXTREME_CREATURES,
  PEOPLES,
  PEOPLE_REPRESENTATIVES,
  SETTING_NATIONS,
  getDiplomaticDelegate,
  getEnemyCodexEntries,
  getExtremeCreature,
  getNationRelations,
  getNationsForPeople,
  getPeopleForNation,
  getWorldCatalogSummary,
} from "./world-catalog.js";
import { createGameAudio } from "./audio.js";
import { subdivideTerritoryTiles } from "./map-tiles.js";
import { squareWrappedDeltaX } from "./square-grid.js";
import { WAR_MAP_TERRAINS, getWarRegion } from "./war-map.js";
import {
  RESOURCE_CATEGORIES,
  STATISTICS_BASIS,
  getNationStatistics,
  getResourceGrade,
  getResourcePower,
  getResourceRanking,
  getWorldStatisticsSummary,
} from "./world-statistics.js";
import {
  buildGeneratedWorld,
  buildGeneratedWorldAsync,
  createCharacterWorldSeed,
  createGeneratedWorldState,
  foundGeneratedVillage,
  getGeneratedBarbarianView,
  getGeneratedColonizationView,
  getGeneratedExpeditionReachableRegions,
  getGeneratedExpeditionTravelOptions,
  getGeneratedShippingDestinations,
  getGeneratedWorldIntelligenceView,
  getKnownGeneratedWorldWarView,
  getGeneratedResistanceView,
  getGeneratedRecognitionView,
  getGeneratedWorldSiteView,
  getGeneratedWorldTimeView,
  getGeneratedWorldView,
  moveGeneratedExpeditionToColonizationSite,
  moveGeneratedExpeditionToSite,
  moveGeneratedExpeditionToRegion,
  refreshGeneratedWorldForDate,
  selectGeneratedWorldRegion,
  setGeneratedPlayerNation,
  setGeneratedTravelModePreference,
  setGeneratedResistancePolicy,
  resolveGeneratedResistanceResponse,
} from "./generated-world-system.js";
import {
  ADVENTURE_ART,
  DUNGEON_ARCHETYPES,
  acceptGuildContract,
  acceptPartyInvitation,
  advanceDungeonRun,
  closeDungeonRun,
  completeGuildContractObjective,
  createDungeonTacticalBattle,
  explorePersonalMap,
  getDungeonTacticalRoster,
  getDungeonBattlePreview,
  getGuildContracts,
  getPersonalMapView,
  getRegionAdventureSites,
  getTavernCandidates,
  interactWithNpcCandidate,
  inviteTavernCandidate,
  movePersonalMap,
  normalizeAdventureState,
  revealRegionDungeon,
  returnToVillageForRecovery,
  resolveDungeonTacticalBattle,
  startDungeonRun,
  startGeneratedTravelEncounter,
  withdrawDungeonBattle,
} from "./adventure-system.js";
import { renderTerrainSvg } from "./terrain-renderer.js";
import {
  BATTLE_FORTIFICATION_TYPES,
  FACING,
  MAGIC_SKILLS,
  ORDER_LABELS,
  PHASE_LABELS,
  RACES,
  TACTICAL_FORMATIONS,
  TERRAIN_TYPES,
  UNIT_CLASSES,
  UNIT_ORDERS,
} from "./tactical-data.js";
import {
  applyBattleFormation,
  createEncirclementCaptureDemo,
  createFortificationSiegeDemo,
  createImperialPrincessBattle,
  createSampleBattle,
  createSeniorGeneralBattle,
  createSeniorGeneralBattleRoster,
  autoResolveBattle,
  executeBattleTurn,
  getBattleCommander,
  getBattleFortification,
  getBattleSummary,
  getBattleUnit,
  getAttackableBattleTiles,
  getEffectiveStats,
  getFortificationAura,
  getLogisticsState,
  getMagicSkillPreview,
  getMagicTargetTiles,
  getReachableBattleTiles,
  getReachableCommanderTiles,
  getSupplyRoute,
  isInCommandRange,
  isBattleTilePassable,
  issueUnitOrder,
  planCommanderMove,
  planUnitAbility,
  planUnitMove,
  planUnitTarget,
  setUnitFacing,
} from "./tactical-battle.js";
import { buildTacticalEffects } from "./tactical-effects.js";
import {
  BATTLE_LOGISTICS_PLANS,
  createBattlePreparation,
  finalizeBattlePreparation,
  getBattlePreparationSummary,
  placeBattlePreparationUnit,
  selectBattlePreparationUnit,
  setBattleLogisticsPlan,
  setBattlePlacementMode,
  setBattlePreparationFormation,
  toggleBattleParticipant,
} from "./battle-preparation.js";
import { createBattleResult } from "./battle-results.js";
import {
  advanceCommanderPersuasion,
  createCommanderDispositionCase,
  DISPOSITION_STATUSES,
  finalizeCommanderDisposition,
  getDispositionLabel,
  PERSUASION_APPROACHES,
} from "./commander-disposition.js";
import {
  CHARACTER_TEMPLATE_FIELD_COUNT,
  CHARACTER_TEMPLATE_SECTIONS,
  createCharacterCodexSections,
  createCharacterDefinition,
} from "./character-template.js";
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_ROLES,
  formatAbilityModifier,
  rollAbilityScores,
} from "./character-abilities.js";
import {
  getMasteryView,
  MASTERY_LOADOUT_LIMITS,
  normalizeMasteryState,
  observeMasteryProgress,
  recordMasteryEvent,
  toggleMasteryLoadout,
} from "./skill-mastery-system.js";
import {
  createGoddessMercyCompanion,
  createGoddessPrologueState,
  GODDESS_ARRIVAL_LINES,
  GODDESS_DEPARTURE_LINE,
  GODDESS_GENERATION_LINES,
  GODDESS_MERCY_LINES,
  GODDESS_NAME,
  registerGoddessPersistentTap,
} from "./goddess-prologue.js";

const STORAGE_KEY = "oathbound-career-chronicle-v10";
const LEGACY_STORAGE_KEYS = ["oathbound-continental-grand-strategy-v9", "oathbound-continental-grand-strategy-v8", "oathbound-continental-grand-strategy-v7", "oathbound-continental-grand-strategy-v6"];

const CITY_ART = Object.freeze({
  selene: "./assets/generated/city-selene.webp",
  nereia: "./assets/generated/city-nereia.webp",
  orta: "./assets/generated/city-orta.webp",
});

const EVENT_ART = Object.freeze({
  crop_failure: "./assets/generated/event-natural-disaster.webp",
  flood: "./assets/generated/event-natural-disaster.webp",
  bandits: "./assets/generated/event-unrest.webp",
  refugees: "./assets/generated/event-unrest.webp",
  peasant_revolt: "./assets/generated/event-unrest.webp",
  epidemic: "./assets/generated/event-civic-crisis.webp",
  corruption: "./assets/generated/event-civic-crisis.webp",
  merchant_exit: "./assets/generated/event-civic-crisis.webp",
});

const FACILITY_SITES = Object.freeze({
  farmland: { area: "城外", name: "外郭農区", detail: "水路と耕地", accent: "#82905c" },
  market: { area: "城内", name: "中央市場区", detail: "市と問屋街", accent: "#b07a43" },
  road: { area: "都市圏", name: "街道・城門区", detail: "街道と城門", accent: "#83765d" },
  granary: { area: "城内", name: "倉庫区", detail: "穀倉と備蓄庫", accent: "#9b8454" },
  barracks: { area: "城郭", name: "城郭兵営区", detail: "兵舎と練兵場", accent: "#8c5e53" },
  office: { area: "中枢", name: "政庁区", detail: "役所と官衙", accent: "#526f6a" },
});

const audio = createGameAudio();

const TERRAIN_TILE_PROFILES = Object.freeze({
  forest: { climate: "湿潤", movement: "高", defense: "+20%", resources: "木材・薬草", risk: "視界不良", summary: "樹冠と獣道が部隊を分散させる一方、伏兵と隠密移動に適する。" },
  plains: { climate: "温暖", movement: "低", defense: "±0%", resources: "穀物・軍馬", risk: "遮蔽物不足", summary: "街道と農地を広げやすく、大軍の展開と補給集積に向く。" },
  hills: { climate: "変化", movement: "中", defense: "+10%", resources: "石材・牧畜", risk: "道路蛇行", summary: "起伏が視界と進路を分断し、峠道や尾根の確保が移動速度を左右する。" },
  mountains: { climate: "寒冷", movement: "極高", defense: "+30%", resources: "鉄・希少鉱", risk: "雪崩・封鎖", summary: "通行可能な谷筋が限られ、少数の守備隊でも進軍を長く阻止できる。" },
  highlands: { climate: "冷涼", movement: "中高", defense: "+15%", resources: "羊毛・鉄", risk: "強風", summary: "岩盤の高地と緩い草原が交互に現れ、季節で交通条件が大きく変わる。" },
  wetland: { climate: "多雨", movement: "高", defense: "+5%", resources: "魚・葦・泥炭", risk: "洪水・疫病", summary: "水路は輸送路になるが、増水時には道路と陣地が同時に失われる。" },
  coast: { climate: "海洋性", movement: "中", defense: "+5%", resources: "塩・水産物", risk: "高潮", summary: "港と沿岸道が交易を支え、海況次第で陸路と海路の優位が入れ替わる。" },
  badlands: { climate: "乾燥", movement: "高", defense: "+10%", resources: "硫黄・色鉱", risk: "水不足", summary: "礫地と涸れ谷が補給を消耗させ、水場の確保が行軍可能距離を決める。" },
});

const MAP_VIEWBOXES = Object.freeze({
  world: "0 0 1800 1050",
  country: "20 35 960 585",
  city: "200 150 620 440",
  village: "250 175 540 400",
});

const AUTHORITY_MAP_LABELS = Object.freeze({
  effective_control: ["EFFECTIVE CONTROL MAP", "総合実効支配"],
  tax_control: ["TAX CONTROL MAP", "徴税支配"],
  military_control: ["MILITARY CONTROL MAP", "軍事支配"],
  justice_control: ["JUSTICE CONTROL MAP", "司法支配"],
  population_knowledge: ["POPULATION KNOWLEDGE MAP", "人口把握率"],
  information_accuracy: ["INFORMATION ACCURACY MAP", "情報精度"],
  administrative_load: ["ADMINISTRATIVE LOAD MAP", "行政負荷"],
  communication_time: ["COMMUNICATION DELAY MAP", "通信所要時間"],
  local_power: ["LOCAL POWER MAP", "地方勢力"],
  grievance: ["HISTORICAL GRIEVANCE MAP", "歴史的不満"],
  loyalty: ["CENTRAL LOYALTY MAP", "中央への忠誠"],
  uniformity: ["INSTITUTIONAL UNIFORMITY MAP", "制度統一度"],
});

const GENERATED_TERRAIN_LABELS = Object.freeze({
  ocean: "外洋", coast: "沿岸水域", lake: "湖沼", desert: "砂漠", plains: "平原", grassland: "草原", forest: "森林",
  rainforest: "熱帯林", tundra: "ツンドラ", snow: "雪原", wetland: "湿地", badlands: "荒地",
});

const GENERATED_RELIEF_LABELS = Object.freeze({ flat: "平地", hills: "丘陵", mountains: "山岳", water: "水面" });
const GENERATED_WORLD_OBJECT_LABELS = Object.freeze({
  castle: "城", city: "都市", town: "町", village: "村", fishing_port: "漁港", port: "港", bay_city: "湾口都市", fort: "砦",
});
const TACTICAL_ORDER_VISUALS = Object.freeze({
  hold: Object.freeze({ label: "待機", className: "is-order-hold" }),
  advance: Object.freeze({ label: "進撃", className: "is-order-advance" }),
  attack: Object.freeze({ label: "攻撃", className: "is-order-attack" }),
  defend: Object.freeze({ label: "防御", className: "is-order-defend" }),
  retreat: Object.freeze({ label: "後退", className: "is-order-retreat" }),
  pursue: Object.freeze({ label: "追撃", className: "is-order-pursue" }),
});

function cityArt(cityId) {
  return CITY_ART[cityId] ?? CITY_ART.selene;
}

const loadedChronicle = loadState();
let chronicleReady = Boolean(loadedChronicle);
const offlineResume = loadedChronicle
  ? resumeDelegatedChronicle(loadedChronicle, advanceCareerMonth)
  // A new chronicle builds its world asynchronously after the player starts.
  // Generating it here blocks the launch screen for several seconds.
  : { state: createInitialState(), report: null };
let state = normalizeAdventureState(refreshGeneratedWorldForDate(offlineResume.state));
if (state.centralizationCampaign?.ending) state.council.pending = false;
let toastTimer = null;
let previewCache = { state: null, value: null };
let generatedMapVisualCache = { key: null, url: null, entries: new Map() };
let tacticalEffectTimer = null;
let tacticalEffectsPlaying = false;
let adventureAdvanceTimer = null;
let goddessSequenceToken = 0;
let equipmentOfferTimer = null;
let informationalCloseTimer = null;
let villageConversationReturnFocus = null;
let generatedMapPanGesture = null;
let floatingWindowGesture = null;
let suppressGeneratedMapClickUntil = 0;
const view = {
  launchOpen: true,
  ledgerDrawerOpen: false,
  mobileMoreOpen: false,
  characterCreationOpen: false,
  characterDraft: null,
  goddessPrologue: createGoddessPrologueState(),
  generation: { active: false, progress: 0, stage: "idle", label: "", error: null },
  battlePreparation: null,
  tacticalBattle: null,
  tacticalOrigin: null,
  tacticalResult: null,
  tacticalResultOpen: false,
  commanderDisposition: null,
  commanderDispositionOpen: false,
  selectedTacticalUnitId: null,
  selectedTacticalCommanderId: null,
  selectedTacticalFortificationId: null,
  pendingTacticalMagicId: null,
  tacticalInspectorDismissed: false,
  panel: "world",
  shortcutTab: "world",
  selectedShortcutCharacterId: state.player?.id ?? null,
  characterDetailOpen: false,
  worldArrival: { active: false, stage: 0 },
  spendingCategoryId: "social_security",
  spendingCityId: "selene",
  mapMode: "political",
  scale: "world",
  selectedType: null,
  selectedId: null,
  selectedTileName: null,
  selectedTerrain: null,
  selectedTerrainType: null,
  tileWindowOpen: false,
  tileAnchorX: 0.5,
  tileAnchorY: 0.5,
  selectedCityId: "selene",
  cityTab: "overview",
  selectedTownId: "mugiwano",
  townTab: "overview",
  selectedVillageId: null,
  selectedVillageFacilityId: "inn",
  villageFacilityOpen: false,
  tavernSection: "requests",
  villageConversation: null,
  locationScene: null,
  selectedLocationZoneId: null,
  locationSceneResult: null,
  adventureOpen: Boolean(state.adventure.activeRun),
  selectedAuthorityDomain: "justice",
  selectedNationalReformSystem: "population_land_knowledge",
  selectedFacilityId: "farmland",
  warMapView: state.war ? "theater" : "atlas",
  warRegionId: state.war?.theater?.activeRegionId ?? null,
  selectedWarHexId: null,
  warCouncilOpen: false,
  objectiveId: "transit",
  selectedCountryId: "valka",
  assignmentOpen: false,
  assignmentMode: null,
  pendingCommandId: null,
  pendingCityId: null,
  pendingTownId: null,
  pendingForceRole: null,
  atlasMode: "generated",
  generatedMapScale: "region",
  generatedMapLegendOpen: true,
  generatedMapLegendInitialized: false,
  generatedPanX: 0,
  generatedPanY: 0,
  generatedConfirmOffsetX: 0,
  generatedConfirmOffsetY: 0,
  pendingGeneratedDestinationId: null,
  pendingGeneratedTravelMode: "route",
  selectedGeneratedSite: null,
  generatedSiteInfoOpen: false,
  generatedTravel: null,
  selectedGeneratedNationId: state.generatedWorld?.playerNationId ?? null,
  selectedNationId: "forest_alliance",
  selectedPeopleId: "acrane",
  selectedCreatureId: "leviathan",
  worldNationFilter: "all",
  worldGuideOpen: true,
  focusedTownCommandId: null,
  guideOpen: false,
  endingOpen: Boolean(
    state.player?.crime?.runEnded
    ||
    (state.worldEndgame?.ending && state.lastViewedWorldEndingId !== state.worldEndgame.ending.id)
    ||
    (state.centralizationCampaign?.ending && state.lastViewedCentralizationEndingId !== state.centralizationCampaign.ending.id)
    || (state.campaign?.ending && state.lastViewedEndingId !== state.campaign.ending.id)
  ),
  resetOpen: false,
  offlineReport: offlineResume.report,
  offlineReportOpen: Boolean(offlineResume.report),
  expertMode: false,
};

const elements = {
  launchScreen: document.querySelector("#launchScreen"),
  launchDeveloperBuild: document.querySelector("#launchDeveloperBuild"),
  launchProductVersion: document.querySelector("#launchProductVersion"),
  launchCommitLink: document.querySelector("#launchCommitLink"),
  launchActions: document.querySelector("#launchActions"),
  characterCreation: document.querySelector("#characterCreation"),
  characterAbilityRolls: document.querySelector("#characterAbilityRolls"),
  goddessCharacterSetup: document.querySelector("#goddessCharacterSetup"),
  goddessSpeaker: document.querySelector("#goddessSpeaker"),
  goddessDialogueText: document.querySelector("#goddessDialogueText"),
  goddessLineCounter: document.querySelector("#goddessLineCounter"),
  goddessDialogueCue: document.querySelector("#goddessDialogueCue"),
  goddessSkip: document.querySelector("#goddessSkip"),
  goddessSeedValue: document.querySelector("#goddessSeedValue"),
  launchGeneration: document.querySelector("#launchGeneration"),
  launchGenerationStatus: document.querySelector("#launchGenerationStatus"),
  launchGenerationLabel: document.querySelector("#launchGenerationLabel"),
  launchGenerationPercent: document.querySelector("#launchGenerationPercent"),
  launchGenerationProgress: document.querySelector("#launchGenerationProgress"),
  launchGenerationBar: document.querySelector("#launchGenerationBar"),
  launchGenerationDetail: document.querySelector("#launchGenerationDetail"),
  worldArrivalOverlay: document.querySelector("#worldArrivalOverlay"),
  worldArrivalTitle: document.querySelector("#worldArrivalTitle"),
  worldArrivalText: document.querySelector("#worldArrivalText"),
  battlePreparationScreen: document.querySelector("#battlePreparationScreen"),
  battlePreparationTitle: document.querySelector("#battlePreparationTitle"),
  battlePreparationIntro: document.querySelector("#battlePreparationIntro"),
  battlePreparationExit: document.querySelector("#battlePreparationExit"),
  battlePreparationSkip: document.querySelector("#battlePreparationSkip"),
  battleParticipantIntro: document.querySelector("#battleParticipantIntro"),
  battleParticipantCount: document.querySelector("#battleParticipantCount"),
  battleParticipantList: document.querySelector("#battleParticipantList"),
  battlePlacementMode: document.querySelector("#battlePlacementMode"),
  battlePreparationFormations: document.querySelector("#battlePreparationFormations"),
  battlePreparationMap: document.querySelector("#battlePreparationMap"),
  battleDeploymentHelp: document.querySelector("#battleDeploymentHelp"),
  battleSustainmentCard: document.querySelector("#battleSustainmentCard"),
  battleLogisticsOptions: document.querySelector("#battleLogisticsOptions"),
  battlePreparationReadiness: document.querySelector("#battlePreparationReadiness"),
  tacticalBattleScreen: document.querySelector("#tacticalBattleScreen"),
  tacticalBattleTitle: document.querySelector("#tacticalBattleTitle"),
  tacticalBattleSummary: document.querySelector("#tacticalBattleSummary"),
  tacticalCommandGuide: document.querySelector("#tacticalCommandGuide"),
  tacticalDeploymentBar: document.querySelector("#tacticalDeploymentBar"),
  tacticalBattleMap: document.querySelector("#tacticalBattleMap"),
  tacticalMapScroll: document.querySelector(".tactical-map-scroll"),
  tacticalBattleInspector: document.querySelector("#tacticalBattleInspector"),
  tacticalBattleLog: document.querySelector("#tacticalBattleLog"),
  tacticalExecutePreview: document.querySelector("#tacticalExecutePreview"),
  tacticalResultButton: document.querySelector("#tacticalResultButton"),
  tacticalBattleReset: document.querySelector("#tacticalBattleReset"),
  tacticalBattleSkip: document.querySelector("#tacticalBattleSkip"),
  tacticalMoreActions: document.querySelector("#tacticalMoreActions"),
  tacticalBattleExit: document.querySelector("#tacticalBattleExit"),
  tacticalPlayerLegend: document.querySelector("#tacticalPlayerLegend"),
  tacticalEnemyLegend: document.querySelector("#tacticalEnemyLegend"),
  tacticalResultScreen: document.querySelector("#tacticalResultScreen"),
  tacticalResultContent: document.querySelector("#tacticalResultContent"),
  commanderDispositionScreen: document.querySelector("#commanderDispositionScreen"),
  commanderDispositionContent: document.querySelector("#commanderDispositionContent"),
  campaignBar: document.querySelector("#campaignBar"),
  resourceLedger: document.querySelector("#resourceLedger"),
  dateLabel: document.querySelector("#dateLabel"),
  dateHint: document.querySelector("#dateHint"),
  endMonthButton: document.querySelector("#endMonthButton"),
  audioToggle: document.querySelector("#audioToggle"),
  audioIcon: document.querySelector("#audioIcon"),
  audioStatus: document.querySelector("#audioStatus"),
  analysisToggle: document.querySelector("#analysisToggle"),
  leftPanel: document.querySelector("#leftPanel"),
  ledgerDrawer: document.querySelector("#ledgerDrawer"),
  closeLedgerDrawer: document.querySelector("#closeLedgerDrawer"),
  ledgerDrawerScrim: document.querySelector("#ledgerDrawerScrim"),
  primaryTabs: document.querySelector("#primaryTabs"),
  mobileMoreMenu: document.querySelector("#mobileMoreMenu"),
  mobileMoreToggle: document.querySelector("[data-mobile-more-toggle]"),
  mobileTimeLabel: document.querySelector("#mobileTimeLabel"),
  characterDetailModal: document.querySelector("#characterDetailModal"),
  characterDetailContent: document.querySelector("#characterDetailContent"),
  characterDetailTitle: document.querySelector("#characterDetailTitle"),
  alertRack: document.querySelector("#alertRack"),
  mapStage: document.querySelector(".map-stage"),
  cityWorkspace: document.querySelector("#cityWorkspace"),
  warBoard: document.querySelector("#warBoard"),
  warMapSwitch: document.querySelector("#warMapSwitch"),
  strategyMap: document.querySelector("#strategyMap"),
  generatedWorldMap: document.querySelector("#generatedWorldMap"),
  generatedWorldScroll: document.querySelector("#generatedWorldScroll"),
  generatedWorldStrip: document.querySelector("#generatedWorldStrip"),
  generatedWorldTime: document.querySelector("#generatedWorldTime"),
  generatedWorldTimeLabel: document.querySelector("#generatedWorldTimeLabel"),
  generatedWorldPhaseLabel: document.querySelector("#generatedWorldPhaseLabel"),
  generatedTravelOverlay: document.querySelector("#generatedTravelOverlay"),
  generatedTravelRoute: document.querySelector("#generatedTravelRoute"),
  generatedTravelClock: document.querySelector("#generatedTravelClock"),
  generatedTravelDuration: document.querySelector("#generatedTravelDuration"),
  generatedTravelProgress: document.querySelector("#generatedTravelProgress"),
  generatedWorldMapHelp: document.querySelector("#generatedWorldMapHelp"),
  generatedMapLegendToggle: document.querySelector("[data-generated-map-legend-toggle]"),
  terrainLegend: document.querySelector("#terrainLegend"),
  mapModeEyebrow: document.querySelector("#mapModeEyebrow"),
  mapCaptionTitle: document.querySelector("#mapCaptionTitle"),
  mapModeBar: document.querySelector("#mapModeBar"),
  authorityOverlaySelect: document.querySelector("#authorityOverlaySelect"),
  mapScaleSwitch: document.querySelector("#mapScaleSwitch"),
  tileDetailWindow: document.querySelector("#tileDetailWindow"),
  tileDetailTitle: document.querySelector("#tileDetailTitle"),
  tileDetailMeta: document.querySelector("#tileDetailMeta"),
  tileDetailNote: document.querySelector("#tileDetailNote"),
  tileDetailGrid: document.querySelector("#tileDetailGrid"),
  selectionCard: document.querySelector("#selectionCard"),
  chronicleTicker: document.querySelector("#chronicleTicker"),
  outlinerContent: document.querySelector("#outlinerContent"),
  backMenu: document.querySelector("#backMenu"),
  backMenuSettingsCatalog: document.querySelector("#backMenuSettingsCatalog"),
  backMenuTravelOptions: document.querySelector("#backMenuTravelOptions"),
  warCouncilModal: document.querySelector("#warCouncilModal"),
  objectiveTabs: document.querySelector("#objectiveTabs"),
  warCouncilReport: document.querySelector("#warCouncilReport"),
  declarationWarning: document.querySelector("#declarationWarning"),
  warCostEstimate: document.querySelector("#warCostEstimate"),
  declareWarButton: document.querySelector("#declareWarButton"),
  assignmentModal: document.querySelector("#assignmentModal"),
  assignmentTitle: document.querySelector("#assignmentTitle"),
  assignmentSummary: document.querySelector("#assignmentSummary"),
  assignmentLedger: document.querySelector("#assignmentLedger"),
  officerCandidates: document.querySelector("#officerCandidates"),
  eventModal: document.querySelector("#eventModal"),
  eventTitle: document.querySelector("#eventTitle"),
  eventSummary: document.querySelector("#eventSummary"),
  eventArt: document.querySelector("#eventArt"),
  eventLocation: document.querySelector("#eventLocation"),
  eventChoices: document.querySelector("#eventChoices"),
  offlineReportModal: document.querySelector("#offlineReportModal"),
  offlineReportContent: document.querySelector("#offlineReportContent"),
  equipmentUpgradePrompt: document.querySelector("#equipmentUpgradePrompt"),
  guideModal: document.querySelector("#guideModal"),
  endingModal: document.querySelector("#endingModal"),
  endingContent: document.querySelector("#endingContent"),
  resetModal: document.querySelector("#resetModal"),
  adventureScreen: document.querySelector("#adventureScreen"),
  adventureContent: document.querySelector("#adventureContent"),
  toast: document.querySelector("#toast"),
};

function renderBuildInfo() {
  const shortCommit = BUILD_INFO.commit.slice(0, 7);
  elements.launchDeveloperBuild.textContent = `PRODUCT ${BUILD_INFO.version} · BUILD ${shortCommit} · GENERATION VER2`;
  elements.launchProductVersion.textContent = BUILD_INFO.version;
  elements.launchCommitLink.textContent = shortCommit;
  elements.launchCommitLink.href = getBuildCommitUrl();
  elements.launchCommitLink.title = `GitHub コミット ${BUILD_INFO.commit}`;
}

renderBuildInfo();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== 10 || !parsed.player) return null;
    parsed.fiscal ??= { publicDebt: 24, totalDebtRepaid: 0 };
    parsed.fiscal.publicDebt = Number.isFinite(parsed.fiscal.publicDebt) ? parsed.fiscal.publicDebt : 24;
    parsed.fiscal.totalDebtRepaid = Number.isFinite(parsed.fiscal.totalDebtRepaid) ? parsed.fiscal.totalDebtRepaid : 0;
    const loaded = normalizeLifeToRealmState(normalizeWarState(parsed));
    normalizePropertyEnterpriseState(loaded);
    normalizeCompanionQuestState(loaded);
    normalizeEstatePoliticsState(loaded);
    normalizeGeneratedCampaignState(loaded);
    return loaded;
  } catch {
    return null;
  }
}

function persist(showMessage = false) {
  if (!chronicleReady) return false;
  state = markChronicleSaved(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (showMessage) {
    audio.play("save");
    showToast("年代記をこの端末に記録しました。");
  }
  return true;
}

function commit(nextState, message = "", cue = "confirm") {
  const wasAtWar = Boolean(state.war);
  state = observeMasteryProgress(normalizeMasteryState(normalizeLifeToRealmState(normalizeAdventureState(refreshGeneratedWorldForDate(nextState)))));
  normalizePropertyEnterpriseState(state);
  normalizeCompanionQuestState(state);
  normalizeEstatePoliticsState(state);
  normalizeGeneratedCampaignState(state);
  if (!wasAtWar && state.war) {
    view.warMapView = "theater";
    view.warRegionId = state.war.theater?.activeRegionId ?? null;
    view.selectedWarHexId = null;
  } else if (wasAtWar && !state.war) {
    view.warMapView = "atlas";
    view.warRegionId = null;
    view.selectedWarHexId = null;
  }
  if (state.worldEndgame?.ending && state.phase !== "event" && state.lastViewedWorldEndingId !== state.worldEndgame.ending.id) view.endingOpen = true;
  else if (state.centralizationCampaign?.ending && state.phase !== "event" && state.lastViewedCentralizationEndingId !== state.centralizationCampaign.ending.id) view.endingOpen = true;
  else if (state.campaign?.ending && state.phase !== "event" && state.lastViewedEndingId !== state.campaign.ending.id) view.endingOpen = true;
  if (state.player?.crime?.runEnded) view.endingOpen = true;
  persist();
  render();
  if (cue) audio.play(cue);
  if (message) showToast(message);
}

function showToast(message, tone = "neutral") {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast is-visible ${tone === "danger" ? "is-danger" : ""}`;
  if (tone === "danger") audio.play("error");
  toastTimer = setTimeout(() => { elements.toast.className = "toast"; }, 2600);
}

function renderAudioControl(audioState = audio.getState()) {
  const status = !audioState.supported ? "非対応" : audioState.muted ? "OFF" : audioState.started ? "ON" : "開始";
  elements.audioIcon.textContent = audioState.muted ? "♩" : "♫";
  elements.audioStatus.textContent = status;
  elements.audioToggle.classList.toggle("is-muted", audioState.muted);
  elements.audioToggle.setAttribute("aria-pressed", String(audioState.muted));
  elements.audioToggle.setAttribute("aria-label", audioState.muted ? "BGMと効果音を有効にする" : "BGMと効果音をミュートする");
  elements.audioToggle.disabled = !audioState.supported;
}

function endMonth() {
  if (state.player) {
    commit(advanceCareerMonth(state), "一か月が経過しました。人物、主君、地域社会の関係が動きます。", "month");
    return;
  }
  if (state.council.pending) {
    view.panel = "council";
    renderPanelFromTop();
    showToast("季節評定で今季の方針を決めてください。", "danger");
    return;
  }
  if (state.phase === "event") {
    renderEventModal();
    showToast("都市事件への対応を先に決めてください。", "danger");
    return;
  }
  const warnings = getTurnWarnings(state);
  if (warnings.length && !window.confirm(`月を終える前の確認\n\n・${warnings.join("\n・")}\n\nこのまま進めますか？`)) return;
  try {
    const next = commitMonth(state);
    const eventOpened = next.phase === "event";
    commit(
      next,
      eventOpened ? "月次処理が完了しました。都市事件への対応を決めてください。" : "月次報告を年代記へ記録しました。",
      eventOpened ? "event" : "month",
    );
    if (next.council.pending) {
      view.panel = "council";
      renderPanelFromTop();
    }
  } catch (error) {
    showToast(error.message, "danger");
  }
}

function formatValue(value, digits = 0) {
  return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function signed(value, digits = 0) {
  return `${value >= 0 ? "+" : ""}${formatValue(value, digits)}`;
}

function getPlanningPreview() {
  if (previewCache.state !== state) previewCache = { state, value: deriveMonthPreview(state) };
  return previewCache.value;
}

function previewReasons(local, key) {
  const reasons = [];
  const orders = local.breakdown?.orders?.[key] ?? 0;
  const external = local.breakdown?.external?.[key] ?? 0;
  if (orders) reasons.push({ label: "命令・委任", value: orders });
  reasons.push(...(local.factors?.[key]?.reasons ?? []));
  if (external) reasons.push({ label: "戦争・事件", value: external });
  return reasons.length ? reasons : [{ label: "月次処理", value: local.changes[key] ?? 0 }];
}

function withPlanningForecast(city) {
  const local = getPlanningPreview()?.report.cities.find((item) => item.cityId === city.cityId);
  if (!local) return city;
  const forecasts = { ...city.forecasts };
  ["money", "food", "population", "security", "support"].forEach((key) => {
    forecasts[key] = { current: city[key], delta: local.changes[key] ?? 0, reasons: previewReasons(local, key) };
  });
  return {
    ...city, forecasts, planPreview: local,
    operationalNetIncome: city.netIncome, operationalFoodBalance: city.foodBalance,
    netIncome: local.changes.money ?? city.netIncome,
    foodBalance: local.changes.food ?? city.foodBalance,
  };
}

function renderResources() {
  if (state.player) {
    const player = state.player;
    const metrics = player.metrics;
    const stage = getCareerStage(state);
    const regionalReputation = currentRegionalReputationReport();
    const resources = [
      { icon: "人", value: stage.name, label: player.title },
      { icon: "⚔", value: formatValue(metrics.martialMerit), label: "武勲" },
      { icon: "政", value: formatValue(metrics.civilMerit), label: "政績" },
      { icon: "名", value: formatValue(regionalReputation.value), label: `${regionalReputation.regionName}の名声` },
      { icon: "信", value: formatValue(metrics.liegeTrust), label: player.sovereign ? "君主権" : player.affiliation.liegeName ? `${player.affiliation.liegeName}の信頼` : "主君なし" },
      { icon: "¤", value: formatValue(metrics.wealth), label: "個人財産" },
      { icon: "荷", value: `${getMerchantCargoLoad(state)}/${player.merchantTrade.cargoCapacity}`, label: "交易積荷" },
    ];
    elements.resourceLedger.innerHTML = resources.map(({ icon, value, label }) => `<div class="resource-item career-resource"><i>${icon}</i><strong>${value}</strong><small>${label}</small></div>`).join("");
    const identity = document.querySelector("#realmHome");
    if (identity) {
      identity.setAttribute("aria-label", "人物・経歴画面を開く");
      identity.querySelector(".shield i").textContent = player.name.slice(0, 1);
      identity.querySelector("strong").textContent = player.name;
      identity.querySelector("small").textContent = `${stage.name} · ${player.title}`;
    }
    return;
  }
  const ledger = deriveRealmLedger(state);
  const military = getMilitarySummary(state);
  const foodSecurity = getFoodSecurityStatus(state, getPlanningPreview());
  const foodTone = foodSecurity.severity === "stable" ? "" : `is-${foodSecurity.severity}`;
  const foodStatus = foodSecurity.severity === "danger" ? "危機" : foodSecurity.severity === "warning" ? "注意" : "安定";
  const resources = [
    { icon: "¤", value: formatValue(ledger.remittableMoney, 1), label: `朝廷可動 / 州庫計 ${formatValue(ledger.treasury, 1)}` },
    { icon: "俵", value: formatValue(ledger.deliverableFood), label: `輸送可能（行政補正後） / 在庫 ${formatValue(ledger.provisions)}`, className: `is-food ${foodTone}`, title: `食料${foodStatus}。輸送可能量は統治方式・委任方針・行政到達度を反映した値です。` },
    { icon: "兵", value: formatValue(ledger.mobilizableTroops), label: `動員可能 / 駐屯 ${formatValue(ledger.troops)}` },
    { icon: "道", value: `${military.mobility} / ${military.supply}`, label: "機動 / 軍需" },
    { icon: "♛", value: state.legitimacy, label: "正統性" },
    { icon: "令", value: `${ledger.governance.used}/${ledger.governance.max}`, label: `統治力 · 待機${ledger.availableOfficers}名`, className: "is-governance", title: "クリックして今月の使い道を確認", action: "governance" },
  ];
  elements.resourceLedger.innerHTML = resources.map(({ icon, value, label, className = "", title = "", action = "" }) => {
    const tag = action ? "button" : "div";
    const actionData = action ? ` type="button" data-resource-action="${action}"` : "";
    return `<${tag} class="resource-item ${className}"${actionData}${title ? ` title="${title}" aria-label="${title}"` : ""}><i>${icon}</i><strong>${value}</strong><small>${label}</small></${tag}>`;
  }).join("");
}

function renderTimeControls() {
  elements.dateLabel.textContent = formatDate(state);
  if (elements.mobileTimeLabel) {
    const worldTime = getGeneratedWorldTimeView(state);
    elements.mobileTimeLabel.textContent = `第${worldTime.day}日 ${worldTime.timeLabel}`;
  }
  const season = deriveCityMetrics(state, view.selectedCityId).season.name;
  elements.dateHint.textContent = state.player ? "月を進める" : state.phase === "event" ? "事件対応が必要" : state.centralizationCampaign?.ending ? "完全集権化 · 継続統治" : state.council.pending ? `${season}季評定を決定` : "月を終える";
  elements.endMonthButton.classList.toggle("is-blocked", !state.player && (state.phase === "event" || state.council.pending));
}

function renderAnalysisMode() {
  document.body.classList.toggle("is-expert-mode", view.expertMode);
  if (!elements.analysisToggle) return;
  elements.analysisToggle.setAttribute("aria-pressed", String(view.expertMode));
  elements.analysisToggle.querySelector("small").textContent = view.expertMode ? "閉じる" : "表示";
}

function isCompactMobileShell() {
  return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 980px) and (orientation: landscape)").matches;
}

let lastLedgerDrawerTrigger = null;

function renderTabs() {
  const stage = getCareerStage(state);
  const allowed = state.player
    ? new Set(["career", "people", "world", "village", "location", ...(stage?.governance ? ["governance"] : []), ...(state.player.sovereign ? ["centralization"] : [])])
    : null;
  if (allowed && !allowed.has(view.panel)) view.panel = stage?.governance ? "governance" : "career";
  const compact = isCompactMobileShell();
  elements.primaryTabs.querySelectorAll("[data-panel]").forEach((button) => {
    const unavailable = Boolean(allowed && !allowed.has(button.dataset.panel));
    button.hidden = unavailable && !(compact && button.hasAttribute("data-mobile-primary"));
    button.setAttribute("aria-disabled", String(unavailable));
    const active = button.dataset.panel === view.panel;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  elements.primaryTabs.querySelectorAll("[data-shortcut-tab]").forEach((button) => {
    button.hidden = false;
    button.setAttribute("aria-disabled", "false");
    const active = view.panel === "world" && button.dataset.shortcutTab === view.shortcutTab;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  elements.ledgerDrawer.classList.toggle("is-open", view.ledgerDrawerOpen);
  elements.ledgerDrawer.setAttribute("aria-hidden", String(!view.ledgerDrawerOpen));
  if (elements.ledgerDrawerScrim) elements.ledgerDrawerScrim.hidden = !view.ledgerDrawerOpen || !compact;
  if (elements.mobileMoreMenu) elements.mobileMoreMenu.hidden = compact && !view.mobileMoreOpen;
  if (elements.mobileMoreToggle) {
    elements.mobileMoreToggle.setAttribute("aria-expanded", String(view.mobileMoreOpen));
    elements.mobileMoreToggle.classList.toggle("is-active", view.mobileMoreOpen);
  }
  elements.primaryTabs.querySelectorAll("[data-panel], [data-shortcut-tab]").forEach((button) => {
    button.setAttribute("aria-expanded", String(view.ledgerDrawerOpen && button.classList.contains("is-active")));
  });
}

function openLedgerDrawer() {
  lastLedgerDrawerTrigger = document.activeElement?.closest?.("button") ?? null;
  view.ledgerDrawerOpen = true;
  view.mobileMoreOpen = false;
  if (isCompactMobileShell()) requestAnimationFrame(() => elements.closeLedgerDrawer?.focus());
}

function closeLedgerDrawer() {
  view.ledgerDrawerOpen = false;
  renderTabs();
  lastLedgerDrawerTrigger?.focus?.();
  lastLedgerDrawerTrigger = null;
}

function campaignObjectiveItems(campaign, compact = false) {
  return campaign.objectives.map((objective) => `
    <div class="campaign-objective ${objective.complete ? "is-complete" : ""}">
      <i>${objective.complete ? "✓" : "○"}</i>
      <span><strong>${objective.label}</strong>${compact ? "" : `<small>${objective.detail}</small>`}</span>
    </div>
  `).join("");
}

function careerNextActionModel() {
  const player = state.player;
  const stage = getCareerStage(state);
  const activeQuest = player.villageLife?.quests?.find((quest) => quest.source === "guild" && ["accepted", "active", "completed", "reported"].includes(quest.status));
  const activeRun = state.adventure?.activeRun;
  const fallenCompanion = player.villageLife?.party?.find((member) => member.alive === false);
  if (player.stage === "individual" && activeRun?.phase === "battle") return { title: `${activeRun.combat.enemyName}との戦闘方法を選ぶ`, label: "戦闘判断へ", route: "adventure" };
  if (player.stage === "individual" && activeRun?.phase === "failed") return { title: "探索隊を村の治療所へ帰還させる", label: "帰還判断へ", route: "adventure" };
  if (player.stage === "individual" && fallenCompanion) return { title: `${fallenCompanion.name}を神殿で蘇生する`, label: "神殿へ", route: "treatment" };
  if (player.stage === "individual" && (player.villageLife?.hp ?? 100) < 35) return { title: `重傷を治療する（HP ${player.villageLife.hp}/${player.villageLife.maxHp}）`, label: "治療へ", route: "treatment" };
  if (player.stage === "individual" && activeQuest?.status === "completed") return { title: `${activeQuest.name}を受注窓口へ報告する`, label: "報告窓口へ", route: "quest-desk", villageId: activeQuest.acceptedVillageId };
  if (player.stage === "individual" && activeQuest?.status === "reported") return { title: `${activeQuest.name}の報酬を受け取る`, label: "報酬窓口へ", route: "quest-desk", villageId: activeQuest.acceptedVillageId };
  if (player.stage === "individual" && activeQuest) {
    const hasParty = player.villageLife?.party?.some((member) => member.active !== false && member.alive !== false);
    if (!hasParty) return { title: `${activeQuest.name}の仲間を集める`, label: "酒場へ", route: "quest-desk", villageId: activeQuest.acceptedVillageId, facilityId: "tavern" };
    return { title: `${activeQuest.name}を達成する`, label: "依頼地点へ", route: "quest-target", targetId: activeQuest.dungeonId ?? null };
  }
  const titles = {
    individual: "村へ入り、依頼・救命・大会・紹介から仕官の縁を得る",
    retainer: "主君の命令で功績と信用を得る",
    commander: "委任された部隊を率い、辺境を救援する",
    castellan: "城下事業を完成させ、預かった城を正式な所領にする",
    lord: "自領を治め、忠誠・建議・独立の道を選ぶ",
    multi_lord: "複数領の利害を束ね、中央政治へ関与する",
    governor: "委任地方を治め、主君との権限境界を保つ",
    duke: "大戦役と論功を背景に、地方諸侯を束ねる",
    regent: "代行政権と正統性の反発を両立させる",
    independent_ruler: "同じ統治画面で新国家全体を統治する",
    centralized_ruler: "全国への直接命令と反動を統治する",
  };
  return player.stage === "individual"
    ? { title: titles[player.stage], label: "最寄りの集落へ", route: "settlement" }
    : { title: titles[player.stage], label: stage.governance ? "統治判断へ" : "人物行動へ", route: stage.governance ? "governance" : "career" };
}

function currentGeneratedSettlement() {
  const { runtime, expeditionTile } = getGeneratedWorldView(state);
  return (runtime.nations.objects ?? []).find((object) => object.settlementLevel && object.tileIndex === expeditionTile.index) ?? null;
}

function openCampaignWorldTarget(targetId = null, targetKind = "object") {
  elements.backMenu?.removeAttribute("open");
  view.panel = "world";
  view.shortcutTab = "world";
  view.atlasMode = "generated";
  view.generatedMapScale = "region";
  view.scale = "world";
  view.villageFacilityOpen = false;
  if (targetId) view.selectedGeneratedSite = { kind: targetKind, id: targetId };
  renderPanelFromTop();
}

function openCampaignSettlement(villageId, facilityId = null) {
  const { runtime, expeditionTile } = getGeneratedWorldView(state);
  let settlement = villageId
    ? (runtime.nations.objects ?? []).find((object) => object.id === villageId && object.settlementLevel)
    : currentGeneratedSettlement();
  if (!settlement && villageId?.startsWith("village:")) {
    const regionId = villageId.slice("village:".length);
    const personalMap = state.adventure?.personalMap?.regions?.[regionId];
    settlement = personalMap?.currentLocationId === villageId
      ? (runtime.nations.objects ?? []).find((object) => object.settlementLevel && object.tileIndex === expeditionTile.index)
      : (runtime.nations.objects ?? []).find((object) => object.regionId === regionId && object.type === "village")
        ?? (runtime.nations.objects ?? []).find((object) => object.regionId === regionId && object.settlementLevel);
  }
  if (!settlement || settlement.tileIndex !== expeditionTile.index) {
    openCampaignWorldTarget(settlement?.id ?? villageId ?? null);
    showToast(settlement ? `${settlement.name}を目標に選びました。地図から移動してください。` : "地図上の集落へ移動すると、依頼と仲間の導線が開きます。", "ui");
    return;
  }
  enterVillage(settlement.id);
  if (facilityId) {
    view.selectedVillageFacilityId = facilityId === "guild" && (settlement.settlementLevel === "village" || settlement.type === "village") ? "tavern" : facilityId;
    view.villageFacilityOpen = true;
  }
  renderPanelFromTop();
}

function focusCampaignNextAction() {
  if (!state.player) return;
  const action = careerNextActionModel();
  if (action.route === "settlement") return openCampaignSettlement(null, "tavern");
  if (action.route === "treatment") return openCampaignSettlement(null, "temple");
  if (action.route === "quest-desk") return openCampaignSettlement(action.villageId, action.facilityId ?? "guild");
  if (action.route === "quest-target") return openCampaignWorldTarget(action.targetId, action.targetId ? "dungeon" : "object");
  if (action.route === "adventure") {
    view.panel = "world";
    view.adventureOpen = true;
    render();
    return;
  }
  elements.backMenu?.removeAttribute("open");
  openLedgerDrawer();
  view.panel = action.route;
  renderPanelFromTop();
}

function renderCampaignBar() {
  if (state.player) {
    const player = state.player;
    const stage = getCareerStage(state);
    const next = careerNextActionModel();
    elements.campaignBar.innerHTML = `
      <div class="campaign-bar-goal"><small>立身段階 ${stage.order + 1}/${CAREER_STAGE_ROUTE.length}</small><strong>${stage.name} · ${player.title}</strong><span>${stage.description}</span></div>
      <button class="campaign-bar-next" type="button" data-campaign-next title="次の目標へ移動（N）"><small>現在の目標 · 押すと直行</small><strong>${next.title}</strong><span>武勲 ${player.metrics.martialMerit} · 政績 ${player.metrics.civilMerit} · 家臣支持 ${player.metrics.householdSupport}</span></button>
      <div class="campaign-bar-actions"><button class="campaign-primary-action" type="button" data-campaign-next>${next.label}<kbd>N</kbd></button><button class="campaign-help-action" type="button" data-panel="${stage.governance ? "governance" : "career"}">判断一覧</button></div>`;
    return;
  }
  const status = getCentralizationCampaignStatus(state);
  const decisions = getCentralizationDecisions(state);
  const crisisLabel = status.crisis ? ` · 危機 ${status.crisis.months}/12か月` : "";
  elements.campaignBar.innerHTML = `
    <div class="campaign-bar-goal">
      <small>国家段階 ${status.currentStage.number}/7 · ${state.scenarioMode === "generated" ? "生成国家" : "セレナ王国"}</small>
      <strong>${status.currentStage.name}${crisisLabel}</strong>
      <span>最終目標：完全な中央集権国家 · 結果値 ${Math.round(status.result.resultIndex)}%</span>
    </div>
    <div class="campaign-bar-next">
      <small>次に除去すべき最大障壁</small>
      <strong>${status.largestBarrier.label}</strong>
      <span>${status.nextStage ? `次段階：${status.nextStage.name}` : status.ending?.description ?? "12か月の集権後危機を統治する"}</span>
      <div class="central-decision-strip" aria-label="今月の主要判断">
        ${decisions.map((decision, index) => `<button type="button" data-central-decision-action="${decision.action}" title="${escapeHtml(decision.detail)}"><i>${index + 1}</i><span><strong>${decision.title}</strong><small>${decision.detail}</small></span></button>`).join("")}
      </div>
    </div>
    <div class="campaign-bar-actions">
      <button class="campaign-primary-action" type="button" data-panel="centralization">中央集権化を開く</button>
    </div>
  `;
}

function renderGuideModal() {
  elements.guideModal.classList.toggle("is-hidden", !view.guideOpen);
  if (!view.guideOpen) return;
  if (state.player) {
    const stage = getCareerStage(state);
    const title = elements.guideModal.querySelector("#guideTitle");
    title.textContent = "一個人から主君、領地、国家を獲得する";
    title.nextElementSibling.textContent = "序盤は依頼と仕官、指揮官期は委任軍務、領主就任後は管轄内の統治を行います。画面が見えていても、国家主権のない命令は実行できません。";
    const mission = elements.guideModal.querySelector(".guide-mission");
    mission.querySelector("header small").textContent = "立身ルート";
    mission.querySelector("h2").textContent = "個人から主君・部隊・領地を得る";
    mission.querySelector(":scope > p").textContent = "固定された一本道ではありません。最小ループで領主まで進んだ後、忠誠、建議、加増、寝返り、独立などの政治選択へ進みます。";
    const loop = elements.guideModal.querySelector(".guide-turn-loop");
    loop.querySelector("small").textContent = "地位に応じて追う範囲が変わる";
    loop.querySelector("h2").textContent = "行動 → 仕官 → 指揮 → 統治 → 選択";
    elements.guideModal.querySelector(".modal-close[data-close-guide]").textContent = "×";
    elements.guideModal.querySelector(".guide-footer [data-close-guide]").textContent = "人物の年代記を始める";
    elements.guideModal.querySelector("#guideObjectiveList").innerHTML = Object.values({
      start: { label: "個人として開始", complete: true },
      service: { label: "主君を選んで仕官", complete: stage.order >= 1 },
      command: { label: "部隊指揮権を得る", complete: stage.order >= 2 },
      fief: { label: "領主となり統治を始める", complete: stage.order >= 3 },
      independence: { label: "忠誠・建議・独立を選ぶ", complete: stage.order >= 7 },
    }).map((objective) => `<div class="campaign-objective ${objective.complete ? "is-complete" : ""}"><i>${objective.complete ? "✓" : "○"}</i><span><strong>${objective.label}</strong></span></div>`).join("");
    elements.guideModal.querySelector("#guideLoop").innerHTML = [
      ["行動する", "依頼と事件で武勲、名声、財産、人脈を得る"],
      ["仕える", "誘いを比較し、具体的な主君と主従関係を結ぶ"],
      ["命令する", "委任された部隊、予算、兵站だけを扱う"],
      ["治める", "領主就任後、同じ統治画面で自領を運営する"],
      ["謀る・奪う", "建議、派閥、寝返り、継承、独立を選ぶ"],
    ].map(([label, detail], index) => `<li><i>${index + 1}</i><div><strong>${label}</strong><span>${detail}</span></div></li>`).join("");
    elements.guideModal.querySelector("#guideProgress").textContent = `${Math.min(5, stage.order + 1)} / 5 段階`;
    return;
  }
  const campaign = getCampaignStatus(state);
  elements.guideModal.querySelector("#guideObjectiveList").innerHTML = campaignObjectiveItems(campaign);
  elements.guideModal.querySelector("#guideLoop").innerHTML = campaign.loop.map((item, index) => `
    <li><i>${index + 1}</i><div><strong>${item.label}</strong><span>${item.detail}</span></div></li>
  `).join("");
  elements.guideModal.querySelector("#guideProgress").textContent = `${campaign.completedCount} / ${campaign.totalCount} 達成`;
}

function endingResourceSummary() {
  const reports = state.monthlyReports ?? [];
  const oldest = reports.at(-1);
  const sum = (cities, side, key) => cities?.reduce((total, city) => total + (city[side]?.[key] ?? 0), 0) ?? 0;
  const ledger = deriveRealmLedger(state);
  return [
    { label: "州庫", start: sum(oldest?.cities, "before", "money"), end: ledger.treasury, digits: 1 },
    { label: "食料", start: sum(oldest?.cities, "before", "food"), end: ledger.provisions, digits: 0 },
    { label: "正統性", start: 64, end: state.legitimacy, digits: 0 },
  ];
}

function campaignRecordLabel(value) {
  return BORDER_SETTLEMENTS[value]?.name
    ?? AFTERMATH_POLICIES[value]?.name
    ?? (["limited_war", "war_settlement"].includes(value) ? "限定戦争" : value);
}

function renderEndingModal() {
  if (state.player?.crime?.runEnded) {
    view.endingOpen = true;
    elements.endingModal.classList.remove("is-hidden");
    elements.endingContent.innerHTML = `
      <header class="ending-header"><span>CRIMINAL CHRONICLE COMPLETE</span><h1 id="endingTitle">死刑判決</h1><p>外国での重大犯罪により身柄を拘束され、この人物の年代記は終わりました。</p></header>
      <section class="ending-objectives"><header><h2>最終記録</h2><b>GAME OVER</b></header><p>判決と犯罪歴は保存されています。記録を確認するか、新しい人物で始めてください。</p></section>
      <footer class="ending-actions"><button type="button" data-crime-ending-new>新しい人物で始める</button></footer>`;
    document.querySelector(".strategy-shell")?.setAttribute("inert", "");
    return;
  }
  const worldEnding = state.worldEndgame?.ending ?? null;
  if (worldEnding) {
    const endgame = getWorldEndgameStatus(state);
    const route = WORLD_ENDGAME_ROUTES[worldEnding.routeId];
    const open = Boolean(view.endingOpen && state.lastViewedWorldEndingId !== worldEnding.id);
    elements.endingModal.classList.toggle("is-hidden", !open);
    if (!open) return;
    const records = endgame.ledger[worldEnding.routeId === "plural_federation" ? "preserved" : "consolidated"].slice(-6).map((record) => `<li><span>${escapeHtml(record.source)}</span><strong>${escapeHtml(record.name)}</strong><small>${escapeHtml(record.detail)}</small></li>`).join("");
    elements.endingContent.innerHTML = `
      <header class="ending-header"><span>LEVIATHAN COVENANT · WORLD SOVEREIGNTY DECIDED</span><h1 id="endingTitle">${escapeHtml(worldEnding.name)}</h1><p>${escapeHtml(worldEnding.description)}</p></header>
      <div class="ending-route"><span><small>リヴァイアサン</small><strong>${state.worldEndgame.leviathanResolution === "reconciled" ? "生存圏盟約" : "討伐・封鎖"}</strong></span><i>→</i><span><small>世界主権</small><strong>${state.worldEndgame.goddessResolution === "accepted" ? "女神へ委任" : "住民の合意へ留保"}</strong></span></div>
      <section class="ending-objectives"><header><h2>${escapeHtml(route.name)}</h2><b>3 / 3 段階</b></header><p>${escapeHtml(route.principle)}</p></section>
      <section class="ending-decisions"><header><h2>この結末を成立させた制度</h2><small>善行点ではなく保存された統治履歴</small></header><ol>${records || "<li><strong>終局判断の年代記を保存しました。</strong></li>"}</ol></section>
      <footer class="ending-actions"><button type="button" data-ending-reports>国家報告を詳しく見る</button><button class="is-primary" type="button" data-ending-continue>物語終局後も年代記を続ける</button></footer>`;
    return;
  }
  const campaign = getCampaignStatus(state);
  const finalEnding = state.centralizationCampaign?.ending ?? null;
  const displayedEnding = finalEnding ?? campaign.ending;
  const open = Boolean(view.endingOpen && displayedEnding && state.phase !== "event");
  elements.endingModal.classList.toggle("is-hidden", !open);
  if (!open) return;
  const settlement = BORDER_SETTLEMENTS[campaign.resolution]?.name ?? (campaign.resolution ? "戦争講和" : "国境決着");
  const aftermath = AFTERMATH_POLICIES[campaign.aftermathPolicy]?.name ?? "戦後秩序";
  const decisions = [...(state.campaign?.history ?? [])].reverse().slice(-6).map((record) => `
    <li><span>誓暦${record.year}年 ${record.month}月</span><strong>${record.title}</strong><small>${[...(record.causes ?? []), ...(record.effects ?? [])].slice(0, 3).map(campaignRecordLabel).join(" · ")}</small></li>
  `).join("");
  const resources = endingResourceSummary().map((item) => {
    const delta = item.end - item.start;
    return `<article><small>${item.label}</small><strong>${formatValue(item.start, item.digits)} → ${formatValue(item.end, item.digits)}</strong><span class="${delta < 0 ? "is-negative" : "is-positive"}">${signed(delta, item.digits)}</span></article>`;
  }).join("");
  elements.endingContent.innerHTML = `
    <header class="ending-header"><span>${finalEnding ? "CENTRALIZATION CAMPAIGN COMPLETE" : "CHAPTER I COMPLETE"} · セレナ王</span><h1 id="endingTitle">${displayedEnding.name}</h1><p>${displayedEnding.description}</p></header>
    <div class="ending-route"><span><small>第一章・国境決着</small><strong>${settlement}</strong></span><i>→</i><span><small>${finalEnding ? "最終国家像" : "章の定着方針"}</small><strong>${finalEnding?.powerStructure ?? aftermath}</strong></span></div>
    <section class="ending-objectives"><header><h2>${finalEnding ? "中央集権化と集権後危機" : "第一章の三課題"}</h2><b>${finalEnding ? "7 / 7 段階" : `${campaign.completedCount} / ${campaign.totalCount}`}</b></header>${finalEnding ? `<p>完全集権化達成後、12か月の官僚・軍部・財政・情報・地方知識・継承危機を統治しました。</p>` : `<div class="campaign-objective-list">${campaignObjectiveItems(campaign)}</div>`}</section>
    <section class="ending-ledger"><header><h2>王国の変化</h2><small>${finalEnding ? state.centralizationCampaign.completedTurn : state.campaign.completedTurn ?? state.turn}ターン時点</small></header><div>${resources}</div></section>
    <section class="ending-decisions"><header><h2>この歴史を作った判断</h2><small>年代記から抜粋</small></header><ol>${decisions || "<li><strong>国境危機を収束させた。</strong></li>"}</ol></section>
    <footer class="ending-actions"><button type="button" data-ending-reports>国家報告を詳しく見る</button><button class="is-primary" type="button" data-ending-continue>${finalEnding ? "完全集権国家の統治を続ける" : "第二章・国家改革へ進む"}</button></footer>
  `;
}

function renderResetModal() {
  elements.resetModal.classList.toggle("is-hidden", !view.resetOpen);
}

function acknowledgeEnding() {
  if (state.worldEndgame?.ending) {
    state = { ...state, lastViewedWorldEndingId: state.worldEndgame.ending.id };
    persist();
  } else if (state.centralizationCampaign?.ending) {
    state = { ...state, lastViewedCentralizationEndingId: state.centralizationCampaign.ending.id };
    persist();
  } else if (state.campaign?.ending) {
    state = { ...state, lastViewedEndingId: state.campaign.ending.id };
    persist();
  }
  view.endingOpen = false;
}

const PLAYER_SPECIALTIES = Object.freeze({
  warrior: "武勇と隊列指揮",
  scout: "探索と危険察知",
  scholar: "知識と魔術",
  envoy: "交渉と統治",
  healer: "判断と治療",
  balanced: "旅と臨機応変",
});

function readCharacterDraftForm() {
  const draft = view.characterDraft ?? {};
  return {
    ...draft,
    name: document.querySelector("#characterCreationName")?.value.trim() || "アレク",
    raceId: document.querySelector("#characterCreationRace")?.value || "human",
    origin: document.querySelector("#characterCreationOrigin")?.value || "没落貴族",
    roleId: document.querySelector("#characterCreationRole")?.value || "warrior",
  };
}

function rollCharacterDraft(draft, advanceRoll = false) {
  const rollCount = Math.max(0, Number(draft.rollCount) || 0) + (advanceRoll ? 1 : 0);
  return {
    ...draft,
    rollCount,
    specialty: PLAYER_SPECIALTIES[draft.roleId] ?? PLAYER_SPECIALTIES.balanced,
    abilities: rollAbilityScores({ seed: `${draft.worldSeed}:abilities:${rollCount}`, roleId: draft.roleId }),
  };
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let goddessFinalizeToken = null;

function showGoddessCharacterSelection({ mercyGranted = false } = {}) {
  goddessSequenceToken += 1;
  view.characterDraft = { ...readCharacterDraftForm(), mercyGranted: mercyGranted || Boolean(view.characterDraft?.mercyGranted) };
  view.goddessPrologue = {
    ...view.goddessPrologue,
    phase: "selection",
    line: mercyGranted ? GODDESS_MERCY_LINES.at(-1) : "名を告げ、望む種族と出自、魂の適性を選びなさい。その選択から、あなたの能力を定めます。",
    lineNumber: 1,
    lineTotal: 1,
  };
  renderLaunchScreen();
}

async function playGoddessArrival(token) {
  for (let index = 0; index < GODDESS_ARRIVAL_LINES.length; index += 1) {
    if (token !== goddessSequenceToken || !view.characterCreationOpen) return;
    view.goddessPrologue = {
      ...view.goddessPrologue,
      phase: "arrival",
      line: GODDESS_ARRIVAL_LINES[index],
      lineNumber: index + 1,
      lineTotal: GODDESS_ARRIVAL_LINES.length,
    };
    renderLaunchScreen();
    await delay(index === 1 ? 4300 : 3000);
  }
  if (token !== goddessSequenceToken || !view.characterCreationOpen) return;
  view.goddessPrologue = {
    ...view.goddessPrologue,
    phase: "selection",
    line: "名を告げ、望む種族と出自、魂の適性を選びなさい。その選択から、あなたの能力を定めます。",
    lineNumber: GODDESS_ARRIVAL_LINES.length + 1,
    lineTotal: GODDESS_ARRIVAL_LINES.length + 1,
  };
  renderLaunchScreen();
}

async function playGoddessMercyBranch() {
  const token = ++goddessSequenceToken;
  view.characterDraft = { ...readCharacterDraftForm(), mercyGranted: true };
  for (let index = 0; index < GODDESS_MERCY_LINES.length; index += 1) {
    if (token !== goddessSequenceToken || !view.characterCreationOpen) return;
    view.goddessPrologue = {
      ...view.goddessPrologue,
      phase: "mercy",
      line: GODDESS_MERCY_LINES[index],
      lineNumber: index + 1,
      lineTotal: GODDESS_MERCY_LINES.length,
      mercyGranted: true,
    };
    renderLaunchScreen();
    await delay(index === 2 ? 3900 : 3100);
  }
  if (token !== goddessSequenceToken || !view.characterCreationOpen) return;
  view.goddessPrologue = {
    ...view.goddessPrologue,
    phase: "selection",
    line: GODDESS_MERCY_LINES.at(-1),
    lineNumber: GODDESS_MERCY_LINES.length,
    lineTotal: GODDESS_MERCY_LINES.length,
  };
  renderLaunchScreen();
  showToast("女神の慈悲により、非力な少女が最初から同行します。");
}

function openCharacterCreation() {
  goddessSequenceToken += 1;
  goddessFinalizeToken = null;
  const worldSeed = createCharacterWorldSeed();
  view.characterDraft = rollCharacterDraft({
    name: "アレク", raceId: "human", origin: "没落貴族", roleId: "warrior", worldSeed, rollCount: 0,
  });
  view.characterCreationOpen = true;
  view.goddessPrologue = {
    ...createGoddessPrologueState(),
    active: true,
    phase: "arrival",
    line: GODDESS_ARRIVAL_LINES[0],
    lineNumber: 1,
    lineTotal: GODDESS_ARRIVAL_LINES.length,
    generationReady: false,
  };
  renderLaunchScreen();
  void playGoddessArrival(goddessSequenceToken);
}

function renderCharacterCreation() {
  const draft = view.characterDraft;
  elements.characterCreation.hidden = !view.characterCreationOpen;
  elements.launchActions.hidden = view.characterCreationOpen;
  if (view.characterCreationOpen) {
    const goddessImage = elements.characterCreation.querySelector(".goddess-portrait img");
    if (goddessImage && !goddessImage.src) goddessImage.src = goddessImage.dataset.src;
  }
  if (!view.characterCreationOpen || !draft) return;
  const goddess = view.goddessPrologue;
  elements.characterCreation.classList.toggle("is-selecting", ["selection", "error"].includes(goddess.phase));
  elements.characterCreation.classList.toggle("is-generating", goddess.phase === "generating");
  elements.characterCreation.classList.toggle("is-departing", goddess.phase === "departure");
  elements.goddessCharacterSetup.hidden = !["selection", "error"].includes(goddess.phase);
  const returnButton = elements.characterCreation.querySelector('[data-character-create-action="cancel"]');
  if (returnButton) returnButton.disabled = ["generating", "departure"].includes(goddess.phase);
  elements.goddessSpeaker.textContent = GODDESS_NAME;
  elements.goddessDialogueText.textContent = goddess.line;
  elements.goddessLineCounter.textContent = goddess.phase === "selection"
    ? "魂の選択"
    : goddess.phase === "generating" ? `世界生成 ${view.generation.progress}%`
      : goddess.phase === "departure" ? "転生"
        : goddess.phase === "mercy" ? `慈悲 ${goddess.lineNumber} / ${goddess.lineTotal}`
        : `${goddess.lineNumber} / ${goddess.lineTotal}`;
  elements.goddessDialogueCue.textContent = goddess.phase === "selection"
    ? "選択を確定すると会話と世界生成が自動で進みます"
    : goddess.phase === "generating" ? "会話の裏で世界を生成しています"
      : goddess.phase === "error" ? "選択内容を保ったまま再試行できます"
        : goddess.phase === "mercy" ? "しつこい願いに、女神が応じました"
          : goddess.skipRequested ? "世界生成が終わり次第、すぐ開始します"
            : "女神の言葉は自動で進みます";
  if (elements.goddessSkip) {
    elements.goddessSkip.hidden = goddess.phase === "selection" || goddess.phase === "error";
    elements.goddessSkip.textContent = goddess.phase === "arrival" || goddess.phase === "mercy"
      ? "魂の選択へ"
      : goddess.phase === "departure" ? "すぐ始める" : goddess.skipRequested ? "演出省略を予約済み" : "演出を省略";
    elements.goddessSkip.disabled = Boolean(goddess.skipRequested && goddess.phase === "generating");
  }
  elements.goddessSeedValue.textContent = `世界シード：${draft.worldSeed}`;
  const nameInput = document.querySelector("#characterCreationName");
  const raceSelect = document.querySelector("#characterCreationRace");
  const originSelect = document.querySelector("#characterCreationOrigin");
  const roleSelect = document.querySelector("#characterCreationRole");
  if (nameInput && document.activeElement !== nameInput) nameInput.value = draft.name;
  if (raceSelect) raceSelect.value = draft.raceId;
  if (originSelect) originSelect.value = draft.origin;
  if (roleSelect) roleSelect.value = draft.roleId;
  elements.characterAbilityRolls.innerHTML = ABILITY_KEYS.map((abilityId) => `
    <article><small>${abilityId.slice(0, 3).toUpperCase()}</small><span>${escapeHtml(ABILITY_LABELS[abilityId])}</span><strong>${draft.abilities[abilityId]}</strong><b>${formatAbilityModifier(draft.abilities[abilityId])}</b></article>
  `).join("");
  elements.goddessCharacterSetup.querySelector("header p").textContent = `4d6の最低1個を除外。${ABILITY_ROLES[draft.roleId]?.name ?? "自由人"}向けに高い出目を配分し、シード由来の個体差を残します。`;
}

function renderWorldArrival() {
  if (!elements.worldArrivalOverlay) return;
  const arrival = view.worldArrival ?? { active: false, stage: 0 };
  const stages = [
    ["世界の風が、魂を迎える", "女神の庭を離れ、まだ名も知らぬ大地へ降りていく。"],
    ["雲海の下に、大地が姿を現す", "国境、街道、村々。あなたの選択を待つ世界が近づいてくる。"],
    ["最初の一歩を刻む", "足元に土の感触が戻る。ここから、あなた自身の年代記が始まる。"],
  ];
  const [title, text] = stages[Math.min(stages.length - 1, arrival.stage)] ?? stages[0];
  elements.worldArrivalOverlay.classList.toggle("is-hidden", !arrival.active);
  elements.worldArrivalOverlay.classList.toggle("is-arrived", arrival.stage >= 2);
  elements.worldArrivalOverlay.setAttribute("aria-hidden", String(!arrival.active));
  elements.worldArrivalTitle.textContent = title;
  elements.worldArrivalText.textContent = text;
}

async function playWorldArrival(token) {
  view.worldArrival = { active: true, stage: 0 };
  renderWorldArrival();
  for (let stage = 1; stage < 3; stage += 1) {
    await delay(650);
    if (token !== goddessSequenceToken) return;
    view.worldArrival = { active: true, stage };
    renderWorldArrival();
  }
  await delay(850);
  if (token !== goddessSequenceToken) return;
  view.worldArrival = { active: false, stage: 2 };
  renderWorldArrival();
}

async function finishGoddessReincarnation(token, { skipArrival = false } = {}) {
  if (token !== goddessSequenceToken || goddessFinalizeToken === token) return;
  goddessFinalizeToken = token;
  view.characterCreationOpen = false;
  view.characterDraft = null;
  view.goddessPrologue = createGoddessPrologueState();
  view.launchOpen = false;
  view.guideOpen = false;
  render();
  audio.play("reset");
  if (!skipArrival) await playWorldArrival(token);
  if (token !== goddessSequenceToken) return;
  showToast(skipArrival ? "生成された世界ですぐに行動を開始できます。" : "女神の庭から、生成された世界へ転生しました。");
}

async function resetChronicle(options = {}, flow = {}) {
  if (view.generation.active) return;
  const seed = typeof options.seed === "string" && options.seed.trim() ? options.seed : createCharacterWorldSeed();
  view.launchOpen = true;
  view.characterCreationOpen = Boolean(flow.deferLaunch);
  view.guideOpen = false;
  view.resetOpen = false;
  view.generation = { active: true, progress: 1, stage: "seed", label: "新しい世界の生成を開始します", error: null };
  renderLaunchScreen();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const generatedState = createGeneratedWorldState({ ...options, seed });
    const generatedWorldRuntime = await buildGeneratedWorldAsync(generatedState, ({ progress, stage, label }) => {
      view.generation = {
        active: true,
        progress: Math.min(92, Math.max(1, Math.round(progress * 0.92))),
        stage,
        label,
        error: null,
      };
      renderLaunchScreen();
    });
    view.generation = { active: true, progress: 95, stage: "character", label: "人物と開始地点を準備しています", error: null };
    renderLaunchScreen();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const nextState = normalizeAdventureState(refreshGeneratedWorldForDate(createCareerInitialState({ ...options, seed, generatedWorldRuntime })));
    if (options.goddessMercyCompanion && !nextState.player.villageLife.party.some((member) => member.goddessMercyCompanion)) {
      nextState.player.villageLife.party.push(options.goddessMercyCompanion);
      nextState.player.history.unshift({ turn: 0, title: "女神の慈悲", detail: `${options.goddessMercyCompanion.name}を伴い、二人で辺境の街道へ降り立った。` });
    }
    localStorage.removeItem(STORAGE_KEY);
    state = nextState;
    chronicleReady = true;
    persist();
    Object.assign(view, {
      battlePreparation: null, tacticalBattle: null, tacticalOrigin: null, tacticalResult: null, tacticalResultOpen: false, commanderDisposition: null, commanderDispositionOpen: false, selectedTacticalUnitId: null, selectedTacticalCommanderId: null, selectedTacticalFortificationId: null, tacticalInspectorDismissed: false,
      panel: "world", shortcutTab: "world", selectedShortcutCharacterId: nextState.player.id, characterDetailOpen: false, spendingCategoryId: "social_security", spendingCityId: "selene", mapMode: "political", scale: "world",
      selectedType: null, selectedId: null, selectedTileName: null, selectedTerrain: null, selectedTerrainType: null, tileWindowOpen: false,
      selectedCityId: "selene", cityTab: "overview", selectedTownId: "mugiwano", townTab: "overview", selectedVillageId: null, selectedVillageFacilityId: "inn", villageFacilityOpen: false, tavernSection: "requests", villageConversation: null, locationScene: null, selectedLocationZoneId: null, locationSceneResult: null, adventureOpen: false, selectedAuthorityDomain: "justice", selectedNationalReformSystem: "population_land_knowledge",
      selectedFacilityId: "farmland", selectedCountryId: "valka", objectiveId: "transit", warMapView: "atlas", warRegionId: null, selectedWarHexId: null, warCouncilOpen: false, assignmentOpen: false,
      pendingTownId: null, guideOpen: false, endingOpen: false, resetOpen: false, offlineReport: null, offlineReportOpen: false, expertMode: false, mobileMoreOpen: false, atlasMode: "generated", generatedMapScale: "region", generatedMapLegendOpen: true, generatedMapLegendInitialized: false, generatedPanX: 0, generatedPanY: 0, generatedConfirmOffsetX: 0, generatedConfirmOffsetY: 0, pendingGeneratedDestinationId: null, pendingGeneratedTravelMode: "route",
      selectedGeneratedNationId: nextState.generatedWorld.playerNationId, worldNationFilter: "all", focusedTownCommandId: null,
      characterCreationOpen: Boolean(flow.deferLaunch), characterDraft: flow.deferLaunch ? view.characterDraft : null,
    });
    view.generation = { active: true, progress: 100, stage: "complete", label: "新しい世界の生成が完了しました", error: null };
    render();
    if (flow.deferLaunch) {
      view.generation = { active: false, progress: 100, stage: "complete", label: "新しい世界の生成が完了しました", error: null };
      renderLaunchScreen();
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 140));
    view.generation = { active: false, progress: 100, stage: "complete", label: "新しい世界の生成が完了しました", error: null };
    view.launchOpen = false;
    view.guideOpen = false;
    render();
    audio.play("reset");
    showToast("地形テンプレートと種族適地から新しい世界を生成しました。");
    return true;
  } catch (error) {
    console.error("New chronicle generation failed", error);
    view.generation = {
      active: false,
      progress: Math.max(1, view.generation.progress),
      stage: "error",
      label: "世界を生成できませんでした",
      error: error instanceof Error ? error.message : String(error),
    };
    view.launchOpen = true;
    renderLaunchScreen();
    showToast("世界生成に失敗しました。保存済みの年代記は保持されています。");
    return false;
  }
}

async function beginGoddessReincarnation(draft) {
  const token = ++goddessSequenceToken;
  goddessFinalizeToken = null;
  view.goddessPrologue = {
    ...view.goddessPrologue,
    phase: "generating",
    line: GODDESS_GENERATION_LINES[0],
    lineNumber: 1,
    lineTotal: GODDESS_GENERATION_LINES.length,
    generationReady: false,
  };
  renderLaunchScreen();
  const goddessPortrait = elements.characterCreation?.querySelector(".goddess-portrait img, .goddess-prologue img, img");
  if (goddessPortrait && !goddessPortrait.complete) {
    await Promise.race([goddessPortrait.decode?.().catch(() => undefined), delay(800)]);
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const options = {
    seed: draft.worldSeed,
    name: draft.name,
    raceId: draft.raceId,
    origin: draft.origin,
    specialty: PLAYER_SPECIALTIES[draft.roleId] ?? PLAYER_SPECIALTIES.balanced,
    abilities: { ...draft.abilities },
    goddessMercyCompanion: draft.mercyGranted ? createGoddessMercyCompanion(draft.worldSeed) : null,
  };
  const generationPromise = resetChronicle(options, { deferLaunch: true });
  void (async () => {
    for (let index = 0; index < GODDESS_GENERATION_LINES.length; index += 1) {
      if (token !== goddessSequenceToken || view.goddessPrologue.phase !== "generating") return;
      view.goddessPrologue = {
        ...view.goddessPrologue,
        phase: "generating",
        line: GODDESS_GENERATION_LINES[index],
        lineNumber: index + 1,
        lineTotal: GODDESS_GENERATION_LINES.length,
      };
      renderLaunchScreen();
      await delay(1600);
    }
  })();
  const generated = await generationPromise;
  if (token !== goddessSequenceToken) return;
  if (!generated) {
    view.goddessPrologue = {
      ...view.goddessPrologue,
      phase: "error",
      line: "……世界の糸が乱れました。魂の形は保っています。もう一度、転生を願いなさい。",
    };
    renderLaunchScreen();
    return;
  }
  view.goddessPrologue = {
    ...view.goddessPrologue,
    phase: "departure",
    line: GODDESS_DEPARTURE_LINE,
    lineNumber: 1,
    lineTotal: 1,
    generationReady: true,
  };
  renderLaunchScreen();
  if (view.goddessPrologue.skipRequested) {
    await finishGoddessReincarnation(token, { skipArrival: true });
    return;
  }
  await delay(1600);
  if (token !== goddessSequenceToken) return;
  await finishGoddessReincarnation(token, { skipArrival: false });
}

function costLabel(command) {
  const names = { money: "金", draftPopulation: "徴募" };
  return Object.entries(command.cost).map(([key, value]) => `${names[key]}${value}`).join(" · ");
}

function spendingCommandCards(categoryId, cityId = WORLD.nation.capital) {
  const cards = Object.values(COMMANDS)
    .filter((command) => command.spendingCategory === categoryId && !isTownCommand(command))
    .map((command) => {
      const targetCityId = command.defaultCityId ?? cityId ?? WORLD.nation.capital;
      const availability = getCommandAvailability(state, command.id, null, targetCityId);
      return `
        <button class="command-card" type="button" data-command="${command.id}" data-city-id="${targetCityId}" ${availability.allowed ? "" : "disabled"}>
          <strong>${command.name}</strong><em>${availability.allowed ? `${command.durationTurns}か月 · 統治${command.governanceCost} · ${costLabel(command)}` : availability.reason}</em>
          <small>${command.description}</small>
          <span class="command-target">対象：${WORLD.provinces[targetCityId].name}</span>
          ${availability.allowed ? '<span class="assign-prompt">担当武将を選ぶ →</span>' : ""}
        </button>
      `;
    });
  return cards.length ? cards.join("") : `<div class="spending-moved-note"><strong>この分類の現地施策は町政へ移設されました。</strong><small>町を選び、生活支援・衛生・治安・開墾などを実行してください。</small><button type="button" data-panel="town">町政を開く →</button></div>`;
}

function spendingShortcut(categoryId, text) {
  const category = SPENDING_CATEGORIES[categoryId];
  return `<button class="spending-shortcut" type="button" data-spending-category="${categoryId}"><span>${category.icon}</span><strong>${category.name}</strong><small>${text}</small><b>具体策を見る →</b></button>`;
}

function meter(label, value, suffix = "/ 100", className = "") {
  const width = Math.min(100, Math.max(0, Number(value)));
  return `
    <div class="mini-meter ${className}">
      <div><span>${label}</span><strong>${formatValue(value, 0)} ${suffix}</strong></div>
      <div class="mini-track"><span style="width:${width}%"></span></div>
    </div>
  `;
}

function statCells(stats) {
  const labels = { leadership: "統率", war: "武力", intelligence: "知力", politics: "政治", charisma: "魅力" };
  return Object.entries(labels).map(([key, label]) => `<div><small>${label}</small><strong>${stats[key]}</strong></div>`).join("");
}

function officerSeal(officer, size = "") {
  const className = ["officer-seal", size].filter(Boolean).join(" ");
  const portrait = officer.portraitImage
    ? `<img src="${officer.portraitImage}" alt="" loading="lazy">`
    : officer.portrait;
  return `<span class="${className}" aria-hidden="true">${portrait}</span>`;
}

function enemyCommanderCard(commander, action = null, compact = false) {
  if (!commander) return "";
  return `
    <article class="enemy-commander-card ${compact ? "is-compact" : ""}">
      ${officerSeal(commander, "large")}
      <div>
        <small>ENEMY COMMANDER · ${commander.country.name}</small>
        <strong>${commander.name}</strong>
        <span>${commander.role} · ${commander.doctrine}</span>
        <em>統率 ${commander.stats.leadership} · 武力 ${commander.stats.war} · 知力 ${commander.stats.intelligence}</em>
        ${action ? `<p><b>${action.label}</b><br>${action.reason}</p>` : ""}
      </div>
    </article>
  `;
}

function seasonName() {
  return `${deriveCityMetrics(state, view.selectedCityId).season.name}季`;
}

function townTargetForCommand(cityId, commandId) {
  const towns = (WORLD.provinces[cityId]?.villages ?? []).map((townId) => getTownAdministration(state, townId));
  const metric = {
    "welfare.relief": (town) => town.support,
    "welfare.health": (town) => town.sanitation,
    "city.patrol": (town) => town.security,
    "city.drill": (town) => town.preparedness,
    "research.administration": (town) => town.forecast.administrativeCapacity,
    "city.cultivate": (town) => town.forecast.foodSecurity,
    "city.commerce": (town) => town.commerce,
    "city.repair": (town) => town.infrastructure,
  }[commandId] ?? ((town) => town.forecast.administrativeCapacity);
  return towns.sort((left, right) => metric(left) - metric(right))[0] ?? null;
}

function renderCouncilPanel() {
  const ledger = deriveRealmLedger(state);
  const administration = ledger.administration;
  const campaign = getCampaignStatus(state);
  const proposals = getCouncilProposals(state);
  const doctrine = DOCTRINES[state.council.doctrine];
  const doctrineCards = Object.values(DOCTRINES).map((item) => `
    <button class="doctrine-card ${item.id === state.council.doctrine ? "is-selected" : ""}" type="button" data-doctrine="${item.id}" ${state.council.pending ? "" : "disabled"}>
      <strong>${item.name}</strong><small>${item.description}</small>
    </button>
  `).join("");
  const proposalCards = proposals.map((proposal) => {
    const officer = getOfficerReport(state, proposal.officerId);
    const command = COMMANDS[proposal.commandId];
    const town = isTownCommand(command) ? townTargetForCommand(proposal.cityId, proposal.commandId) : null;
    const availability = getCommandAvailability(state, proposal.commandId, proposal.officerId, proposal.cityId, town?.townId);
    const action = town
      ? `data-open-town-command="${town.townId}"`
      : `data-command="${command.id}" data-city-id="${proposal.cityId}"`;
    return `
      <article class="proposal-card">
        <header>${officerSeal(officer)}<div><strong>${officer.name}</strong><small>${officer.role}の提案</small></div><b>${proposal.forecast.grade}</b></header>
        <p>「${proposal.reason}」</p>
        <button type="button" ${action} ${availability.allowed ? "" : "disabled"}>${town ? `${town.name}の町政で${command.name}を見る` : `${command.name}を任務化 · 予測 ${proposal.forecast.range[0]}〜${proposal.forecast.range[1]}`}</button>
      </article>
    `;
  }).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>SEASONAL PARLIAMENT</span>
      <h1>${seasonName()}評定</h1>
      <p>${state.council.pending ? "今季の方針を決めるまで時間は進まない" : `今季方針「${doctrine.name}」`}</p>
    </header>
    <div class="panel-body">
      <section class="campaign-brief-card">
        <header><div><small>MAIN OBJECTIVE</small><h2>${campaign.title}</h2></div><b>${campaign.completedCount} / ${campaign.totalCount}</b></header>
        <p>${campaign.objective}</p>
        <div class="campaign-objective-list">${campaignObjectiveItems(campaign, true)}</div>
        <small class="campaign-guardrail">守るもの：${campaign.guardrail}</small>
      </section>
      <section class="panel-section">
        <div class="realm-facts council-facts">
          <div><small>戸籍人口</small><strong>${formatValue(ledger.registeredPopulation)}</strong></div>
          <div><small>平均治安</small><strong>${ledger.publicOrder}</strong></div>
          <div><small>行政到達</small><strong>${administration.averageReach}</strong></div>
          <div><small>直轄 / 委任</small><strong>${administration.directCities} / ${administration.delegatedCities}</strong></div>
        </div>
        <p class="adviser-note">名目人口 ${formatValue(ledger.population)}のうち戸籍把握 ${administration.registrationRate}% · 輸送可能兵糧 ${formatValue(administration.deliverableFood)} · 動員可能兵 ${formatValue(administration.mobilizableTroops)}${administration.overextension > 0 ? ` · 行政超過 ${administration.overextension}%` : ""}</p>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>勢力方針</h2><small>${state.council.pending ? "一つを採択" : "次季まで固定"}</small></div>
        <div class="doctrine-list">${doctrineCards}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>配下からの提案</h2><small>能力・特性・現状から生成</small></div>
        <div class="proposal-list">${proposalCards}</div>
      </section>
    </div>
  `;
}

function cityTabs() {
  return Object.keys(state.cities).map((cityId) => `
    <button type="button" data-select-city="${cityId}" class="${cityId === view.selectedCityId ? "is-active" : ""}">${WORLD.provinces[cityId].name.replace(/王都|河港|城塞市/, "")}</button>
  `).join("");
}

function renderSpendingPanel() {
  const ledger = deriveRealmLedger(state);
  const governance = getGovernance(state);
  const selected = SPENDING_CATEGORIES[view.spendingCategoryId] ?? SPENDING_CATEGORIES.social_security;
  const reservedMoney = state.pendingOrders.reduce((sum, order) => sum + (order.cost?.money ?? 0), 0);
  const categories = Object.values(SPENDING_CATEGORIES).map((category) => {
    const commandCount = Object.values(COMMANDS).filter((command) => command.spendingCategory === category.id && !isTownCommand(command)).length;
    return `
      <button type="button" class="spending-category-card ${category.id === selected.id ? "is-active" : ""}" data-spending-category="${category.id}">
        <i>${category.icon}</i><span><strong>${category.name}</strong><small>具体策 ${commandCount}件</small></span>
      </button>
    `;
  }).join("");
  const cityTargets = Object.keys(state.cities).map((cityId) => `
    <button type="button" class="${cityId === view.spendingCityId ? "is-active" : ""}" data-spending-city="${cityId}">${WORLD.provinces[cityId].name.replace(/王都|河港|城塞市/, "")}</button>
  `).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading spending-heading">
      <span>NATIONAL EXPENDITURE</span>
      <h1>国家支出</h1>
      <p>国境・外交・軍事など国家規模の具体策を決める</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="spending-ledger">
          <div><small>朝廷可動金</small><strong>${formatValue(ledger.remittableMoney, 1)}</strong></div>
          <div><small>予約支出</small><strong>${formatValue(reservedMoney, 1)}</strong></div>
          <div><small>国債残高</small><strong>${formatValue(ledger.publicDebt, 1)}</strong></div>
          <div><small>統治力</small><strong>${governance.used} / ${governance.max}</strong></div>
        </div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>国家規模コマンド</h2><small>町の内政は「町政」へ移設済み</small></div>
        <div class="spending-category-grid">${categories}</div>
      </section>
      <section class="panel-section spending-detail">
        <div class="spending-detail-heading"><i>${selected.icon}</i><div><small>選択中の支出</small><h2>${selected.name}</h2><p>${selected.description}</p></div></div>
        <nav class="spending-city-tabs" aria-label="具体策の対象都市">${cityTargets}</nav>
        ${selected.id === "debt_repayment" ? `<p class="spending-debt-note">国債残高 ${formatValue(ledger.publicDebt, 1)} · 累計返済 ${formatValue(state.fiscal?.totalDebtRepaid ?? 0, 1)}</p>` : ""}
        <div class="command-list spending-command-list">${spendingCommandCards(selected.id, view.spendingCityId)}</div>
      </section>
    </div>
  `;
}

function renderCityPanel() {
  const cityId = view.selectedCityId;
  const city = withPlanningForecast(deriveCityMetrics(state, cityId));
  const governor = getOfficerReport(state, city.governorId);
  const governance = getGovernance(state);
  elements.leftPanel.innerHTML = `
    <header class="panel-heading city-heading" style="--city-art: url('${cityArt(cityId)}')">
      <span>CITY ADMINISTRATION</span>
      <h1>${city.name}</h1>
      <p>${city.kind} · 太守 ${governor.name}</p>
      <nav class="city-tabs">${cityTabs()}</nav>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        <article class="governor-card">
          ${officerSeal(governor, "large")}
          <div><small>太守</small><strong>${governor.name}</strong><p>${governor.policy} · 忠誠 ${governor.loyalty} · 意欲 ${governor.stamina}</p></div>
        </article>
        <div class="officer-stat-grid compact">${statCells(governor.stats)}</div>
      </section>
      <section class="panel-section">
        <div class="realm-facts">
          <div><small>人口</small><strong>${formatValue(city.population)}</strong></div>
          <div><small>民心</small><strong>${formatValue(city.support)}</strong></div>
          <div><small>食料予測</small><strong>${signed(city.foodBalance)}</strong></div>
          <div><small>金銭予測</small><strong>${signed(city.netIncome, 1)}</strong></div>
        </div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>管内の町政</h2><small>統治力 ${governance.used}/${governance.max}</small></div>
        <div class="town-shortcut-list">${WORLD.provinces[cityId].villages.map((townId) => {
          const town = getTownAdministration(state, townId);
          return `<button type="button" class="town-shortcut" data-select-town="${townId}"><strong>${town.name}</strong><small>${town.kind} · 行政処理 ${Math.round(town.forecast.administrativeCapacity)} · 課題 ${town.forecast.primaryNeed.label}</small><b>町政を開く →</b></button>`;
        }).join("")}</div>
      </section>
      <section class="panel-section city-issue-list">
        <div class="section-heading"><h2>現在の課題</h2><small>${state.cities[cityId].issues.length}件</small></div>
        ${state.cities[cityId].issues.length ? state.cities[cityId].issues.map((issue) => `<p class="adviser-note"><strong>${issue.title}</strong><br>深刻度 ${issue.severity}</p>`).join("") : '<p class="empty-candidates">重大な初期課題はありません。</p>'}
      </section>
    </div>
  `;
}

const CITY_TABS = {
  overview: "概要", population: "人口", economy: "経済・政策",
  administration: "統治委任", facilities: "施設", factions: "派閥", history: "歴史", reports: "報告",
};

const TOWN_TABS = { overview: "概要", office: "行政台帳", commands: "施策・命令", records: "実施記録" };

function townTabs() {
  return Object.values(WORLD.villages).map((town) => `
    <button type="button" data-select-town="${town.id}" class="${town.id === view.selectedTownId ? "is-active" : ""}">
      <strong>${town.name}</strong><small>${WORLD.provinces[town.province].name.replace(/王都|河港|城塞市/, "")}</small>
    </button>
  `).join("");
}

function renderTownPanel() {
  const town = getTownAdministration(state, view.selectedTownId);
  const parent = deriveCityMetrics(state, town.cityId);
  const governor = getOfficerReport(state, parent.governorId);
  elements.leftPanel.innerHTML = `
    <header class="panel-heading town-heading">
      <span>TOWN ADMINISTRATION</span><h1>${town.name}</h1>
      <p>${town.kind} · ${WORLD.provinces[town.cityId].name}管内</p>
    </header>
    <div class="panel-body">
      <section class="panel-section"><div class="section-heading"><h2>町を選ぶ</h2><small>${Object.keys(WORLD.villages).length}町</small></div><nav class="town-selector">${townTabs()}</nav></section>
      <section class="panel-section">
        <article class="governor-card">${officerSeal(governor, "large")}<div><small>管轄太守</small><strong>${governor.name}</strong><p>${parent.name}から財源・担当者を配分</p></div></article>
        <div class="realm-facts"><div><small>人口</small><strong>${formatValue(town.population)}</strong></div><div><small>行政処理</small><strong>${Math.round(town.forecast.administrativeCapacity)}</strong></div><div><small>陳情滞留</small><strong>${Math.round(town.petitionBacklog)}</strong></div><div><small>優先課題</small><strong>${town.forecast.primaryNeed.label}</strong></div></div>
      </section>
      <section class="panel-section"><p class="adviser-note"><strong>現地課題</strong><br>${town.issue}</p><button type="button" class="town-open-commands" data-town-tab="commands">この町の施策を開く</button></section>
    </div>
  `;
}

function deltaText(value, digits = 0) {
  const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return `<span class="forecast-delta ${tone}">${signed(value, digits)}/月</span>`;
}

function reasonLines(forecast) {
  return forecast.reasons.map((reason) => `<li><span>${reason.label}</span><b>${signed(reason.value, Number.isInteger(reason.value) ? 0 : 1)}</b></li>`).join("");
}

function cityMetricCard(label, value, forecast = null, suffix = "") {
  return `
    <article class="city-metric-card">
      <header><span>${label}</span>${forecast ? deltaText(forecast.delta, Number.isInteger(forecast.delta) ? 0 : 1) : ""}</header>
      <strong>${formatValue(value, Number.isInteger(value) ? 0 : 1)}${suffix}</strong>
      ${forecast ? `<details><summary>増減理由</summary><ul>${reasonLines(forecast)}</ul></details>` : ""}
    </article>
  `;
}

function cityWorkspaceHeader(city, governor) {
  return `
    <header class="city-workspace-header" style="--city-art: url('${cityArt(city.cityId)}')">
      <div><span>${city.kind} / ${city.season.name}季</span><h1>${city.name}</h1><p>${city.note}</p></div>
      <div class="city-governor-badge">${officerSeal(governor)}<div><small>太守</small><strong>${governor.name}</strong><b>${governor.policy}</b></div></div>
    </header>
    <nav class="city-workspace-tabs" aria-label="都市画面タブ">
      ${Object.entries(CITY_TABS).map(([id, label]) => `<button type="button" data-city-tab="${id}" class="${view.cityTab === id ? "is-active" : ""}">${label}</button>`).join("")}
    </nav>
  `;
}

function townWorkspaceHeader(town, governor) {
  return `
    <header class="city-workspace-header town-workspace-header" style="--city-art: url('${cityArt(town.cityId)}')">
      <div><span>${town.kind} / ${WORLD.provinces[town.cityId].name}管内</span><h1>${town.name} 町政庁</h1><p>${town.issue}</p></div>
      <div class="city-governor-badge">${officerSeal(governor)}<div><small>管轄太守</small><strong>${governor.name}</strong><b>町政命令は都市金庫から執行</b></div></div>
    </header>
    <nav class="city-workspace-tabs town-workspace-tabs" aria-label="町政画面タブ">
      ${Object.entries(TOWN_TABS).map(([id, label]) => `<button type="button" data-town-tab="${id}" class="${view.townTab === id ? "is-active" : ""}">${label}</button>`).join("")}
    </nav>
  `;
}

function townNeedCard(need) {
  const tone = need.value < 40 ? "is-critical" : need.value < 60 ? "is-warning" : "is-stable";
  return `<article class="town-need-card ${tone}"><small>${need.label}</small><strong>${Math.round(need.value)}</strong><i style="--value:${Math.round(need.value)}%"></i></article>`;
}

function renderTownOverview(town) {
  return `
    <section class="town-overview-hero">
      <article><small>町人口</small><strong>${formatValue(town.population)}</strong><span>翌月 ${signed(town.forecast.populationDelta)}</span></article>
      <article><small>地域歳入寄与</small><strong>${formatValue(town.forecast.revenue, 1)}</strong><span>親都市の税収基盤</span></article>
      <article><small>食料備蓄</small><strong>${formatValue(town.foodReserve)}</strong><span>翌月 ${signed(town.forecast.foodDelta)}</span></article>
      <article><small>行政処理力</small><strong>${Math.round(town.forecast.administrativeCapacity)}</strong><span>陳情 ${signed(town.forecast.petitionDelta, 1)}/月</span></article>
    </section>
    <section class="town-need-grid">${town.forecast.needs.map(townNeedCard).join("")}</section>
    <section class="city-detail-columns">
      <article class="city-sheet"><header><h2>現地課題</h2><small>${town.kind}</small></header><p>${town.issue}</p><p>現在の最優先は「${town.forecast.primaryNeed.label}」。町ごとの値を改善し、管轄都市の村落生産・人口基盤へ積み上げます。</p></article>
      <article class="city-sheet"><header><h2>親都市との関係</h2><small>${WORLD.provinces[town.cityId].name}</small></header><div class="city-inline-stats"><span>生産 <b>${Math.round(town.production)}</b></span><span>商業 <b>${Math.round(town.commerce)}</b></span><span>治安 <b>${Math.round(town.security)}</b></span><span>民心 <b>${Math.round(town.support)}</b></span></div><button type="button" class="town-parent-link" data-select-city="${town.cityId}">都市行政へ戻る →</button></article>
    </section>
  `;
}

function renderTownOffice(town) {
  return `
    <section class="town-office-grid">
      ${cityMetricCard("戸籍把握率", town.registryCoverage, null, "%")}
      ${cityMetricCard("行政到達", town.administrativeReach, null, "%")}
      ${cityMetricCard("陳情滞留", town.petitionBacklog, null, "%")}
      ${cityMetricCard("道路・水路基盤", town.infrastructure, null, "%")}
      ${cityMetricCard("衛生", town.sanitation, null, "%")}
      ${cityMetricCard("自警・備え", town.preparedness, null, "%")}
    </section>
    <section class="city-detail-columns">
      <article class="city-sheet"><header><h2>行政負荷</h2><small>戸籍・到達・陳情から算出</small></header>${meter("処理能力", town.forecast.administrativeCapacity)}${meter("戸籍把握", town.registryCoverage)}${meter("行政到達", town.administrativeReach)}${meter("陳情解消", 100 - town.petitionBacklog)}</article>
      <article class="city-sheet"><header><h2>翌月見通し</h2><small>町単位で月次更新</small></header><p>人口 ${signed(town.forecast.populationDelta)} · 食料備蓄 ${signed(town.forecast.foodDelta)} · 陳情滞留 ${signed(town.forecast.petitionDelta, 1)}。</p><p>行政技術は戸籍・到達・滞留を、補修は基盤と到達を直接改善します。</p></article>
    </section>
  `;
}

function townCommandCard(command, town) {
  const availability = getCommandAvailability(state, command.id, null, town.cityId, town.townId);
  return `
    <button class="town-command-card ${view.focusedTownCommandId === command.id ? "is-recommended" : ""}" type="button" data-command="${command.id}" data-city-id="${town.cityId}" data-town-id="${town.townId}" ${availability.allowed ? "" : "disabled"}>
      <header><strong>${command.name}</strong><b>${SPENDING_CATEGORIES[command.spendingCategory].name}</b></header>
      <p>${command.description}</p><small>${availability.allowed ? `${command.durationTurns}か月 · 統治${command.governanceCost} · ${costLabel(command)}` : availability.reason}</small><span>${town.name}だけを直接改善 →</span>
    </button>
  `;
}

function renderTownCommands(town) {
  const commands = Object.values(COMMANDS).filter(isTownCommand);
  const groups = [...new Set(commands.map((command) => command.spendingCategory))];
  return `
    <section class="town-command-intro"><div><small>LOCAL EXECUTION</small><h2>${town.name}の施策</h2><p>費用は${WORLD.provinces[town.cityId].name}の都市金庫、担当者と統治力は国家枠を使います。効果対象はこの町です。</p></div><span>優先課題<strong>${town.forecast.primaryNeed.label} ${Math.round(town.forecast.primaryNeed.value)}</strong></span></section>
    ${groups.map((categoryId) => `<section class="town-command-group"><header><h2>${SPENDING_CATEGORIES[categoryId].name}</h2><small>${commands.filter((command) => command.spendingCategory === categoryId).length}施策</small></header><div>${commands.filter((command) => command.spendingCategory === categoryId).map((command) => townCommandCard(command, town)).join("")}</div></section>`).join("")}
  `;
}

function renderTownRecords(town) {
  const records = town.history.length ? town.history.map((record) => {
    const officer = getOfficerReport(state, record.officerId);
    return `<article class="town-record"><span>誓暦${record.year}年 ${record.month}月</span><div><strong>${COMMANDS[record.commandId]?.name ?? record.commandId}</strong><small>${officer?.name ?? "担当者不明"} · 成果 ${record.outcome}</small></div></article>`;
  }).join("") : '<p class="history-empty">この町で完了した施策はまだありません。</p>';
  const pending = [...state.pendingOrders, ...state.commandQueue].filter((order) => order.townId === town.townId).map((order) => `<article class="town-record is-pending"><span>${state.pendingOrders.includes(order) ? "今月予約" : `残${order.remainingTurns}か月`}</span><div><strong>${COMMANDS[order.commandId].name}</strong><small>${getOfficerReport(state, order.officerId).name}</small></div></article>`).join("");
  return `<section class="city-sheet town-records"><header><h2>実施記録</h2><small>町別に保存</small></header>${pending}${records}</section>`;
}

function renderCityOverview(city) {
  const breakdown = getCityBreakdown(state, city.cityId);
  return `
    <section class="city-overview-grid">
      ${cityMetricCard("人口", city.population, city.forecasts.population)}
      ${cityMetricCard("食料", city.food, city.forecasts.food)}
      ${cityMetricCard("金銭", city.money, city.forecasts.money)}
      ${cityMetricCard("生産力", city.production)}
      ${cityMetricCard("商業力", city.commerce)}
      ${cityMetricCard("治安", city.security, city.forecasts.security)}
      ${cityMetricCard("民心", city.support, city.forecasts.support)}
      ${cityMetricCard("防衛力", city.defense)}
    </section>
    <section class="city-detail-columns">
      <article class="city-sheet"><header><h2>翌月の因果</h2><small>現在の政策・施設で試算</small></header><p>${breakdown.income}</p><p>${breakdown.supplies}</p><p>${breakdown.draft}</p></article>
      <article class="city-sheet"><header><h2>軍事・兵站</h2><small>都市資源と街道稼働から算出</small></header><div class="city-inline-stats"><span>兵 <b>${formatValue(city.troops)}</b></span><span>徴募 <b>${formatValue(city.draftPopulation)}</b></span><span>駐屯上限 <b>${formatValue(city.troopCapacity)}</b></span><span>練度 <b>${Math.round(city.training)}</b></span></div><p>${breakdown.logistics}</p></article>
    </section>
  `;
}

function renderCityPopulation(city) {
  const workforce = city.facilities;
  return `
    <section class="population-dashboard">
      <article class="population-hero"><small>都市人口</small><strong>${formatValue(city.population)}</strong>${deltaText(city.populationDelta)}<p>労働可能 ${formatValue(workforce.availableWorkers)} · 必要労働 ${formatValue(workforce.requiredWorkers)}</p></article>
      <div class="population-card-grid">
        ${cityMetricCard("失業者", workforce.unemployment)}
        ${cityMetricCard("住宅充足", Math.round(city.housingRate * 100), null, "%")}
        ${cityMetricCard("衛生", city.internal.sanitation)}
        ${cityMetricCard("食料充足", Math.round(city.foodSatisfaction * 100), null, "%")}
        ${cityMetricCard("月次移民・自然増減", city.populationDelta)}
        ${cityMetricCard("住民食料需要", city.civilianNeed)}
      </div>
      <article class="city-sheet"><header><h2>労働配分</h2><small>施設稼働へ自動配分</small></header><div class="labor-allocation">${city.facilities.facilities.filter((facility) => facility.level > 0).map((facility) => `<div><span>${facility.name} Lv.${facility.level}</span><b>${formatValue(facility.requiredWorkers)}人</b><i style="--rate:${Math.round(facility.operatingRate * 100)}%"></i></div>`).join("")}</div></article>
    </section>
  `;
}

function policyCards(city) {
  return Object.values(POLICY_DEFINITIONS).map((definition) => {
    const current = state.cities[city.cityId].policies[definition.id];
    const pending = state.pendingOrders.find((order) => order.kind === "policy" && order.cityId === city.cityId && order.policyId === definition.id);
    return `
      <article class="policy-card">
        <header><div><small>都市政策</small><h3>${definition.name}</h3></div><b>${definition.options[pending?.optionId ?? current].name}</b></header>
        <p>${definition.description}</p>
        <div class="policy-options">${Object.entries(definition.options).map(([optionId, option]) => {
          const creed = getPolicyCreedSupport(state, city.cityId, definition.id, optionId);
          const creedClass = creed?.score < -8 ? "is-opposed" : creed?.score > 8 ? "is-supported" : "is-neutral";
          const creedLabel = creed?.tagged ? `<em class="policy-creed ${creedClass}">信条 ${creed.score >= 0 ? "+" : ""}${creed.score}${creed.opposedFactions.length ? ` · 反対${creed.opposedFactions.length}派` : ""}</em>` : "";
          return `<button type="button" data-queue-policy="${definition.id}" data-option="${optionId}" data-city-id="${city.cityId}" class="${(pending?.optionId ?? current) === optionId ? "is-active" : ""}" ${current === optionId && !pending ? "disabled" : ""}><strong>${option.name}</strong><small>${policyOptionSummary(definition.id, option)}</small>${creedLabel}</button>`;
        }).join("")}</div>
      </article>
    `;
  }).join("");
}

function policyOptionSummary(policyId, option) {
  const parts = [];
  if (policyId === "landTax" || policyId === "commerceTax") parts.push(`税率 ${Math.round(option.rate * 100)}%`);
  if (policyId === "conscription") parts.push(`徴募×${option.levy.toFixed(2)}`, `軍維持×${option.upkeep.toFixed(2)}`, `生産 ${signed(option.production * 100, 0)}%`);
  if (policyId === "rationing") parts.push(`住民消費 ${Math.round(option.consumption * 100)}%`);
  if (policyId === "immigration") parts.push(`人口率 ${signed(option.migration * 1000, 1)}‰`, `治安 ${signed(option.security, 2)}`);
  if (policyId === "securityPolicy") parts.push(`治安 ${signed(option.security, 2)}`, `恐怖 ${signed(option.fear, 1)}`, `腐敗 ${signed(option.corruption, 1)}`);
  if (Object.hasOwn(option, "support")) parts.push(`民心 ${signed(option.support, 1)}`);
  const factions = Object.entries(option.factions ?? {}).map(([id, value]) => `${FACTION_DEFINITIONS[id].name}${signed(value, 1)}`);
  if (factions.length) parts.push(factions.join("・"));
  return parts.join(" / ");
}

function renderCityEconomy(city) {
  const planned = Boolean(city.planPreview);
  return `
    <section class="economy-summary">
      <article><small>${planned ? "予約反映・食料実収支" : "月次食料収支"}</small><strong>${signed(city.foodBalance)}</strong><span>生産 ${formatValue(city.foodProduction)} / 消費 ${formatValue(city.civilianNeed + city.militaryNeed)} / 損耗 ${formatValue(city.spoilage)}${planned ? ` / 通常月次 ${signed(city.operationalFoodBalance)}` : ""}</span></article>
      <article><small>${planned ? "予約反映・財政実収支" : "月次財政収支"}</small><strong>${signed(city.netIncome, 1)}</strong><span>総収入 ${formatValue(city.grossIncome, 1)} / 支出 ${formatValue(city.expenses, 1)}${planned ? ` / 通常月次 ${signed(city.operationalNetIncome, 1)}` : ""}</span></article>
      <article><small>行政状態</small><strong>${formatValue(city.internal.administrativeEfficiency)}</strong><span>腐敗 ${formatValue(city.internal.corruption)} / 恐怖 ${formatValue(city.internal.fear)}</span></article>
    </section>
    <section class="policy-grid">${policyCards(city)}</section>
  `;
}

function renderCityAdministration(city) {
  const administration = getCityAdministration(state, city.cityId);
  const network = deriveAdministrationNetwork(state);
  const region = getRegionAuthority(state, city.cityId);
  const centralization = getCentralizationResult(state);
  if (!view.expertMode) {
    const campaign = getCentralizationCampaignStatus(state);
    const packageRows = campaign.portfolio.systems.map((system) => {
      const cells = system.cells.filter((cell) => cell.regionId === city.cityId);
      const control = Math.round(cells.reduce((sum, cell) => sum + Math.min(cell.legal, cell.practical, cell.effective), 0) / Math.max(1, cells.length));
      const readiness = Math.round(cells.reduce((sum, cell) => sum + cell.readiness, 0) / Math.max(1, cells.length));
      return `<article><header><strong>${system.name}</strong><b>${control}%</b></header><p>${system.benefit}</p><span>準備 ${readiness} · 予想反動 ${system.backlash} · 反対 ${system.opposition}</span></article>`;
    }).join("");
    return `
      <section class="authority-hero">
        <article><small>総合実効支配</small><strong>${Math.round(region.overallControl)}%</strong><span>法的 ${Math.round(region.legalCentralization)}% / 実務 ${Math.round(region.practicalCentralization)}%</span></article>
        <article><small>地域準備</small><strong>${region.informationPrecision}%</strong><span>戸籍 ${region.populationKnowledge}% / 通信 ${region.communicationDays}日</span></article>
        <article><small>中央行政</small><strong>${network.load} / ${network.capacity}</strong><span>負荷率 ${network.utilization}%${network.overload > 0 ? ` · 超過 ${network.overload}` : " · 処理余力あり"}</span></article>
        <article><small>国家段階</small><strong>${campaign.currentStage.name}</strong><span>${campaign.largestBarrier.label}</span></article>
      </section>
      <section class="ordinary-reform-summary"><header><div><small>5 NATIONAL REFORM SYSTEMS</small><h2>${WORLD.provinces[city.cityId].name}の改革見通し</h2></div><p>個々の17権限は専門台帳に保持されています。</p></header><div>${packageRows}</div><button type="button" data-panel="centralization">国家級改革を開く</button></section>
      <section class="ordinary-administration-note"><strong>${administration.stage.name} · ${administration.modeName}</strong><span>統合 ${administration.integration}% / 戸籍 ${administration.registerCoverage}% / 中央集権化結果 ${centralization.resultIndex}%</span><p>17分野の法的・実務権限、歴史的特権、個別改革工程は、上部の「専門台帳」を表示すると確認できます。</p></section>
    `;
  }
  const selectedDomain = region.domains.find((domain) => domain.id === view.selectedAuthorityDomain) ?? region.domains[0];
  view.selectedAuthorityDomain = selectedDomain.id;
  const reform = getAuthorityReform(state, city.cityId, selectedDomain.id);
  const modeCards = Object.values(ADMINISTRATION_MODES).map((mode) => `
    <button type="button" data-administration-mode="${mode.id}" data-city-id="${city.cityId}" class="${administration.mode === mode.id ? "is-active" : ""}" ${administration.mode === mode.id ? "disabled" : ""}>
      <strong>${mode.name}</strong><small>${mode.description}</small>
    </button>
  `).join("");
  const mandateCards = Object.values(ADMINISTRATION_MANDATES).map((mandate) => `
    <article class="policy-card">
      <header><div><small>太守への達成基準</small><h3>${mandate.name}</h3></div><b>${administration.mandate === mandate.id ? "委任中" : mandate.short}</b></header>
      <p>${mandate.description}</p>
      <button type="button" data-administration-mandate="${mandate.id}" data-city-id="${city.cityId}" class="facility-management-action" ${administration.mandate === mandate.id ? "disabled" : ""}>${administration.mandate === mandate.id ? "現在の委任方針" : "この方針を委任"}</button>
    </article>
  `).join("");
  const lastAction = administration.lastAction
    ? `<strong>${administration.lastAction.title}</strong><p>${administration.lastAction.detail}</p>`
    : "<strong>まだ委任政務の報告はありません</strong><p>太守委任では、月末に州庫の範囲で危機対応と日常整備を一件処理します。</p>";
  const capabilityLabels = {
    information: "情報", administration: "行政", fiscal: "財政",
    enforcement: "強制", infrastructure: "インフラ", standardization: "規格化",
  };
  const capabilityCards = Object.entries(network.capabilities).map(([id, value]) => `
    <div><small>${capabilityLabels[id]}</small><strong>${Math.round(value)}</strong><i style="--value:${Math.round(value)}%"></i></div>
  `).join("");
  const domainButtons = region.domains.map((domain) => `
    <button type="button" data-authority-domain="${domain.id}" class="authority-domain-button ${domain.id === selectedDomain.id ? "is-active" : ""}">
      <span>${domain.name}</span><strong>${Math.round(domain.effectiveControl)}%</strong><small>法 ${Math.round(domain.legalShare)} / 実 ${Math.round(domain.practicalShare)}</small>
    </button>
  `).join("");
  const factorLabels = {
    legalAuthority: "法的権限", information: "情報把握", administration: "行政処理",
    enforcement: "強制力", compliance: "地域服従", connectivity: "交通通信", institution: "制度浸透",
  };
  const factorCards = Object.entries(selectedDomain.factors).map(([id, value]) => `
    <div><small>${factorLabels[id]}</small><strong>${Math.round(value)}%</strong><i style="--value:${Math.round(value)}%"></i></div>
  `).join("");
  const privileges = selectedDomain.privileges.length
    ? selectedDomain.privileges.map((privilege) => `
      <article class="historical-privilege">
        <header><div><small>${privilege.originYear}年成立</small><strong>${privilege.name}</strong></div><b>慣習 ${privilege.entrenchment}</b></header>
        <p>${privilege.originalReason}</p>
        <span>${privilege.grantedRights.join(" · ")}</span>
      </article>
    `).join("")
    : '<p class="empty-candidates">この分野に記録された特権はありません。</p>';
  const activeReform = reform.active;
  const activeStage = activeReform ? AUTHORITY_REFORM_STAGES[activeReform.stageIndex] : null;
  const reformStatus = activeReform ? `
    <article class="authority-reform-progress">
      <header><div><small>進行中 · ${AUTHORITY_TRANSFER_METHODS[activeReform.method].name}</small><h3>${activeStage.name}</h3></div><b>${Math.round(activeReform.progress)}%</b></header>
      <div class="reform-stage-track">${AUTHORITY_REFORM_STAGES.map((stage, index) => `<span class="${index < activeReform.stageIndex ? "is-done" : index === activeReform.stageIndex ? "is-current" : ""}">${stage.name}</span>`).join("")}</div>
      <p>${activeStage.description}${activeReform.forced ? " 準備工程を飛ばした強行改革です。" : ""}</p>
    </article>
  ` : "";
  const methodCards = reform.methods.map((method) => `
    <article class="authority-method-card">
      <header><div><small>権力移管方式</small><h3>${method.name}</h3></div><b>金 ${method.cost}</b></header>
      <p>${method.description}</p>
      <div><span>法的移管 +${method.estimatedLegalGain}</span><span>実務移管 +${method.estimatedPracticalGain}</span><span class="${method.backlashRisk >= 45 ? "is-danger" : ""}">反動 ${method.backlashRisk}</span></div>
      <button type="button" data-start-authority-reform data-city-id="${city.cityId}" data-domain-id="${selectedDomain.id}" data-method-id="${method.id}" ${activeReform || !method.affordable ? "disabled" : ""}>${activeReform ? "改革進行中" : method.affordable ? `${method.name}で工程を開始` : "州庫留保が不足"}</button>
    </article>
  `).join("");
  const grievanceRows = region.grievances.length
    ? region.grievances.map((grievance) => `<div class="grievance-row"><strong>${grievance.createdYear}年 · 第${grievance.generation}世代</strong><span>${grievance.narrative}</span><b>強度 ${Math.round(grievance.strength)}</b></div>`).join("")
    : '<p class="empty-candidates">記録された歴史的不満はありません。</p>';
  const populationEstimate = region.populationEstimate.exact
    ? formatValue(region.populationEstimate.min)
    : `${formatValue(region.populationEstimate.min)} ～ ${formatValue(region.populationEstimate.max)}`;
  return `
    <section class="authority-hero">
      <article><small>総合実効支配</small><strong>${Math.round(region.overallControl)}%</strong><span>法的 ${Math.round(region.legalCentralization)}% / 実務 ${Math.round(region.practicalCentralization)}%</span></article>
      <article><small>推定人口</small><strong>${populationEstimate}</strong><span>情報精度 ${region.informationPrecision}% / 戸籍 ${region.populationKnowledge}%</span></article>
      <article><small>中央行政</small><strong>${network.load} / ${network.capacity}</strong><span>負荷率 ${network.utilization}%${network.overload > 0 ? ` · 超過 ${network.overload}` : " · 処理余力あり"}</span></article>
      <article><small>中央集権度（結果）</small><strong>${centralization.resultIndex}%</strong><span>直接操作不可 · 実効支配と制度から算出</span></article>
    </section>
    <section class="authority-capability-panel">
      <header><div><small>STATE CAPABILITIES</small><h2>中央政府の代替能力</h2></div><p>地方勢力を排除した後、この能力で実務を引き受ける。</p></header>
      <div class="authority-capability-grid">${capabilityCards}</div>
    </section>
    <section class="authority-workbench">
      <aside class="authority-domain-list"><header><small>REGION × AUTHORITY</small><h2>権限台帳</h2></header>${domainButtons}</aside>
      <div class="authority-domain-detail">
        <header class="authority-domain-heading"><div><small>${AUTHORITY_DOMAINS[selectedDomain.id].group.toUpperCase()}</small><h2>${selectedDomain.name}</h2></div><b>実効 ${Math.round(selectedDomain.effectiveControl)}%</b></header>
        <div class="authority-share-strip"><span>中央・法的権限 <b>${Math.round(selectedDomain.legalShare)}%</b></span><span>中央・実務権限 <b>${Math.round(selectedDomain.practicalShare)}%</b></span><span>最大地方保有者 <b>${selectedDomain.dominantLocalHolder?.name ?? "なし"}</b></span></div>
        <div class="authority-factor-grid">${factorCards}</div>
        <article class="replacement-capacity-card">
          <header><div><small>代替制度なしの廃止は危険</small><h3>地方が処理中の仕事 ${selectedDomain.localWorkload}</h3></div><b class="${selectedDomain.replacementCoverage < 80 ? "is-danger" : ""}">代替 ${selectedDomain.replacementCoverage}%</b></header>
          <p>中央側の処理可能量 ${selectedDomain.replacementCapacity}。改革準備度 ${selectedDomain.reformReadiness}%${selectedDomain.replacementCoverage < 80 ? "。今すぐ権限を奪うと、未処理・闇行政・旧勢力復活が発生しやすい。" : "。移管後の実務を引き受けられる見込みがある。"}</p>
        </article>
        <section class="historical-privilege-list"><header><h3>歴史的権利</h3><small>過去の妥協が現在の正統性を持つ</small></header>${privileges}</section>
        ${reformStatus}
        <section class="authority-method-grid">${methodCards}</section>
        <button class="forced-reform-button" type="button" data-force-authority-reform data-city-id="${city.cityId}" data-domain-id="${selectedDomain.id}" data-method-id="eliminate" ${activeReform || !reform.forced.affordable ? "disabled" : ""}><strong>${reform.forced.affordable ? "準備工程を飛ばして強行" : "州庫留保が不足"}</strong><span>${reform.forced.warning} 反動 ${reform.forced.backlashRisk} / 金 ${reform.forced.cost}</span></button>
      </div>
    </section>
    <section class="historical-grievance-panel"><header><div><small>HISTORICAL GRIEVANCES</small><h2>歴史的不満</h2></div><b>地域圧力 ${region.grievancePressure}</b></header>${grievanceRows}</section>
    <details class="legacy-administration-panel">
      <summary>太守委任・州郡統合の運用設定</summary>
      <section class="city-detail-columns">
        <article class="city-sheet"><header><h2>統治方式</h2><small>直轄は精密、委任は拡張向け</small></header><div class="policy-options">${modeCards}</div></article>
        <article class="city-sheet"><header><h2>${administration.stage.name}</h2><small>統合 ${administration.integration}%</small></header><p>${administration.stage.description}</p><p>戸籍人口 ${formatValue(administration.registeredPopulation)} · 動員可能兵 ${formatValue(administration.mobilizableTroops)} · 兵糧 ${formatValue(administration.deliverableFood)}。</p></article>
        <article class="city-sheet"><header><h2>直近の委任報告</h2><small>${administration.modeName} · ${administration.mandateName}</small></header>${lastAction}</article>
      </section>
      <section class="policy-grid">${mandateCards}</section>
    </details>
  `;
}

function renderCityFacilities(city) {
  const selected = city.facilities.facilities.find((facility) => facility.id === view.selectedFacilityId)
    ?? city.facilities.facilities[0];

  function getFacilityPlan(facility) {
    const project = state.cities[city.cityId].projects.find((item) => item.facilityId === facility.id);
    const pending = state.pendingOrders.find((order) => order.kind === "facility" && order.cityId === city.cityId && order.facilityId === facility.id);
    const target = Math.min(3, facility.level + 1);
    return {
      project,
      pending,
      target,
      cost: facility.baseCost + facility.costGrowth * facility.level,
      duration: facility.durationBase + (target === 3 ? 1 : 0),
      governanceCost: target === 3 ? 2 : 1,
    };
  }

  function tileStatus(facility, plan) {
    if (plan.project) return `建設中 · 残り${plan.project.remainingTurns}か月`;
    if (plan.pending) return "今月の計画に予約済み";
    if (facility.level >= 3) return "最大レベル";
    if (facility.level === 0) return "未建設";
    return `稼働 ${Math.round(facility.operatingRate * 100)}%`;
  }

  const selectedSite = FACILITY_SITES[selected.id];
  const selectedPlan = getFacilityPlan(selected);
  const nextUpkeep = selected.upkeep * selectedPlan.target;
  const nextWorkers = selected.workers * selectedPlan.target;
  const action = selectedPlan.project
    ? `<div class="facility-project-state">建設中 · 完成まで残り${selectedPlan.project.remainingTurns}か月</div>`
    : selectedPlan.pending
      ? `<div class="facility-project-state pending">予約済み · 金${selectedPlan.cost} / ${selectedPlan.duration}か月 / 統治${selectedPlan.governanceCost}</div>`
      : selected.level >= 3
        ? '<button class="facility-management-action" type="button" disabled>この区画は最大レベルです</button>'
        : `<button class="facility-management-action" type="button" data-queue-facility="${selected.id}" data-city-id="${city.cityId}">Lv.${selectedPlan.target}へ強化 · 金${selectedPlan.cost} / ${selectedPlan.duration}か月 / 統治${selectedPlan.governanceCost}</button>`;

  return `
    <section class="facility-workspace">
      <header class="facility-workspace-heading">
        <div><span>DISTRICT FACILITIES</span><h2>施設区画</h2></div>
        <p>区画タイルを選び、施設を一か所ずつ管理します。</p>
      </header>
      <div class="facility-layout">
        <section class="facility-site-board" aria-label="施設区画一覧">
          <div class="facility-site-grid" role="tablist" aria-label="管理する施設区画">
            ${city.facilities.facilities.map((facility, index) => {
              const site = FACILITY_SITES[facility.id];
              const plan = getFacilityPlan(facility);
              const active = facility.id === selected.id;
              const stateClass = plan.project ? "is-building" : plan.pending ? "is-pending" : facility.operatingRate < 0.7 && facility.level > 0 ? "is-stalled" : "";
              return `<button id="facility-site-${facility.id}" class="facility-site-tile ${active ? "is-active" : ""} ${stateClass}" type="button" role="tab" aria-selected="${active}" aria-controls="facility-management-panel" data-select-facility="${facility.id}" style="--site-accent:${site.accent}"><span class="facility-site-number">区画 ${String(index + 1).padStart(2, "0")} · ${site.area}</span><span class="facility-site-mark">${facility.icon}</span><span class="facility-site-name"><strong>${site.name}</strong><small>${facility.name} · ${site.detail}</small></span><b>Lv.${facility.level}</b><span class="facility-site-rate"><i style="width:${Math.round(facility.operatingRate * 100)}%"></i></span><em>${tileStatus(facility, plan)}</em></button>`;
            }).join("")}
          </div>
        </section>
        <article id="facility-management-panel" class="facility-management ${selected.operatingRate < 0.7 && selected.level > 0 ? "is-stalled" : ""}" role="tabpanel" aria-labelledby="facility-site-${selected.id}">
          <header style="--site-accent:${selectedSite.accent}">
            <span class="facility-management-mark">${selected.icon}</span>
            <div><small>${selectedSite.area} · ${selectedSite.detail}</small><h3>${selectedSite.name}</h3><p>${selected.name}を管理</p></div>
            <b>Lv.${selected.level}</b>
          </header>
          <div class="facility-management-body">
            <p>${selected.description}</p>
            <div class="facility-effect">${selected.effect}</div>
            <div class="facility-management-stats">
              <div><small>稼働率</small><strong>${Math.round(selected.operatingRate * 100)}%</strong></div>
              <div><small>施設状態</small><strong>${Math.round(selected.condition)}%</strong></div>
              <div><small>月次維持</small><strong>${formatValue(selected.upkeepTotal, 1)}${selected.level < 3 ? ` → ${formatValue(nextUpkeep, 1)}` : ""}</strong></div>
              <div><small>必要労働</small><strong>${formatValue(selected.requiredWorkers)}${selected.level < 3 ? ` → ${formatValue(nextWorkers)}` : ""}</strong></div>
            </div>
            ${action}
          </div>
        </article>
      </div>
    </section>
  `;
}

function creedAxisSummary(layer, maximum = 3, includeNeutral = false) {
  return [...(layer?.axes ?? [])]
    .filter((axis) => includeNeutral || axis.strength !== "neutral")
    .sort((left, right) => Math.abs(right.value) * right.importance - Math.abs(left.value) * left.importance)
    .slice(0, maximum)
    .map((axis) => `<span><b>${escapeHtml(axis.label)}</b>${escapeHtml(axis.text)}</span>`)
    .join("") || "<span><b>主要傾向</b>中立・未形成</span>";
}

function renderCityCreed(cityId) {
  const creed = getCityCreedReport(state, cityId);
  const nation = getNationCreedReport(state);
  if (!creed) return "";
  const layers = [
    ["社会意識", creed.layers.social], ["支配層", creed.layers.ruling], ["制度", creed.layers.institutional],
  ].map(([label, layer]) => `<article><small>${label}</small><strong>${escapeHtml(layer.identity.name)}</strong><div>${creedAxisSummary(layer, 2)}</div></article>`).join("");
  const latest = creed.policyDebates[0];
  return `<section class="city-creed-overview">
    <header><div><small>SOCIAL CREED</small><h2>${escapeHtml(creed.identity.name)}</h2></div><b class="${creed.tension.score >= 35 ? "is-danger" : ""}">制度緊張 ${creed.tension.score}</b></header>
    <p>${escapeHtml(creed.identity.shortDescription)} 国家主流：${escapeHtml(nation?.identity?.name ?? "未形成")}</p>
    <div class="city-creed-layers">${layers}</div>
    ${latest ? `<footer><strong>直近の政策争点</strong><span>${escapeHtml(latest.implementation)} · 支持 ${latest.score >= 0 ? "+" : ""}${latest.score}</span></footer>` : ""}
  </section>`;
}

function renderCityFactions(city) {
  return `
    ${renderCityCreed(city.cityId)}
    <section class="faction-grid">
      ${city.factions.map((faction) => `<article class="faction-card ${faction.radicalism >= 45 ? "is-danger" : ""}"><header><span>${faction.icon}</span><div><small>派閥</small><h3>${faction.name}</h3></div><b>影響 ${faction.influence}</b></header><p>${faction.demand}</p><div class="faction-creed"><small>集団信条</small><strong>${escapeHtml(faction.creed?.identity?.name ?? "特筆すべき信条なし")}</strong></div><div class="faction-meters">${meter("支持", faction.support)}${meter("過激度", faction.radicalism, "/ 100", "danger-meter")}</div><div class="faction-actions">${Object.values(FACTION_ACTIONS).map((action) => `<button type="button" data-queue-faction="${faction.id}" data-action="${action.id}" data-city-id="${city.cityId}"><strong>${action.name}</strong><small>金${action.money}・統治${action.governanceCost}<br>${action.detail}</small></button>`).join("")}</div></article>`).join("")}
    </section>
  `;
}

const REPORT_METRICS = [
  ["money", "金銭", 1], ["food", "食料", 0], ["population", "人口", 0], ["security", "治安", 1], ["support", "民心", 1],
];

function reportCausalRows(local) {
  return REPORT_METRICS.map(([key, label, digits]) => {
    const orders = local.breakdown?.orders?.[key] ?? 0;
    const monthly = local.breakdown?.monthly?.[key] ?? local.changes[key] ?? 0;
    const external = local.breakdown?.external?.[key] ?? 0;
    return `<div><strong>${label}</strong><span>命令・委任 ${signed(orders, digits)}</span><span>月次 ${signed(monthly, digits)}</span><span>戦争・事件 ${signed(external, digits)}</span><b>計 ${signed(local.changes[key] ?? 0, digits)}</b></div>`;
  }).join("");
}

function reportActionRows(report, cityId) {
  const actions = (report.actions ?? []).filter((action) => !cityId || action.cityId === cityId);
  if (!actions.length) return `<p class="report-empty-detail">${cityId ? "この都市を対象とする確定施策はありません。王国全体の施策は上の国家活動で確認できます。" : "この月に確定した施策はありません。"}</p>`;
  return actions.map((action) => {
    const cost = [action.cost?.money ? `金 ${action.cost.money}` : "", action.cost?.draftPopulation ? `徴募 ${action.cost.draftPopulation}` : "", action.governanceCost ? `統治 ${action.governanceCost}` : ""].filter(Boolean).join(" · ");
    const status = action.status === "failed" ? "失敗" : action.status === "completed" ? "完了" : "進行中";
    const place = action.townId ? `${WORLD.villages[action.townId]?.name ?? action.townId} · ` : action.cityId ? `${WORLD.provinces[action.cityId]?.name ?? action.cityId} · ` : "";
    return `<div class="report-action ${action.status === "failed" ? "is-failed" : ""}"><strong>${action.title}</strong><span>${place}${status}${cost ? ` · ${cost}` : ""}</span><small>${action.detail}</small></div>`;
  }).join("");
}

function nationalActivityCard(report) {
  if (!report) return "";
  const events = (report.events ?? []).map((item) => `<div class="national-event-row"><strong>${WORLD.provinces[item.cityId]?.name ?? item.cityId} · ${item.title}</strong><span>${item.choice}</span><small>${item.detail ?? ""}</small></div>`).join("");
  return `
    <details class="national-activity-card report-fold">
      <summary><div><small>REALM-WIDE REGISTER</small><h2>今月の国家活動</h2></div><span>${(report.actions ?? []).length}施策 · ${(report.events ?? []).length}事件</span></summary>
      <div class="national-activity-grid report-fold-body">
        <article><h3>確定施策</h3><div class="report-actions">${reportActionRows(report, null)}</div></article>
        <article><h3>重大事件</h3>${events || '<p class="report-empty-detail">この月の重大事件はありません。</p>'}</article>
      </div>
    </details>
  `;
}

function reportWarRows(report) {
  const entries = [];
  if (report.aggression) entries.push('<p class="report-war is-danger"><strong>敵軍侵攻</strong><small>東部国境軍が国土防衛戦へ移行しました。</small></p>');
  if (report.war) {
    const war = report.war;
    entries.push(`<p class="report-war"><strong>戦況 ${signed(war.delta, 1)} · 自軍損失 ${formatValue(war.ownLoss)}</strong><small>敵軍損失 ${formatValue(war.enemyLoss)} · 食料 ${formatValue(war.foodCost)} · 施設被害 ${formatValue(war.damage, 1)} · 避難民 ${formatValue(war.displaced)} · 住民被害 ${formatValue(war.civilianLosses)}</small></p>`);
  }
  (report.occupations ?? []).forEach((occupation) => {
    entries.push(`<p class="report-war ${occupation.resistanceLoss ? "is-danger" : ""}"><strong>占領統治 · ${occupation.policyName}</strong><small>${occupation.supplied ? "費用・補給充足" : "費用または補給不足"} · 統制 ${signed(occupation.controlDelta, 1)} · 抵抗 ${signed(occupation.resistanceDelta, 1)} · 統合 ${signed(occupation.integrationDelta, 1)} · 避難民 ${signed(occupation.displacedDelta)}</small></p>`);
  });
  return entries.length ? `<h3>戦争・占領</h3>${entries.join("")}` : "";
}

function decisionHighlightsCard(report) {
  const highlights = report?.highlights ?? [];
  if (!highlights.length) return "";
  return `
    <section class="decision-highlights">
      <header><div><small>DECISION BRIEF</small><h2>今月の重要変化</h2></div><span>先に3件だけ確認</span></header>
      <div>${highlights.map((highlight) => `<details><summary><strong>${highlight.title}</strong><b>${highlight.change}</b></summary><dl><div><dt>なぜ</dt><dd>${highlight.cause}</dd></div><div><dt>次に効くこと</dt><dd>${highlight.effect}</dd></div><div><dt>残る記録</dt><dd>${highlight.legacy}</dd></div></dl></details>`).join("")}</div>
    </section>`;
}

function reportStrategicRows(report) {
  const dispatches = (report.foreignDispatches ?? []).slice(0, 3).map((dispatch) => `<div class="report-strategic-row"><strong>${dispatch.countryName} · ${dispatch.intent}</strong><span>${dispatch.effect}</span><small>国家意図：${dispatch.agenda}</small></div>`).join("");
  const reactions = (report.officerReactions ?? []).slice(0, 3).map((reaction) => `<div class="report-strategic-row ${reaction.disposition < 0 ? "is-negative" : ""}"><strong>${reaction.title}</strong><span>${reaction.disposition > 0 ? "忠誠と人物関係が改善" : "忠誠と人物関係が悪化"}</span><small>${reaction.detail}</small></div>`).join("");
  if (!dispatches && !reactions) return "";
  return `<h3>人物政治・世界情勢</h3><div class="report-strategic-list">${reactions}${dispatches}</div>`;
}

function fiscalEntries(section, definitions) {
  return Object.values(definitions).map((definition) => ({
    ...definition,
    value: Math.max(0, Number(section?.[definition.id]) || 0),
  }));
}

function fiscalGradient(entries, total) {
  if (total <= 0) return "conic-gradient(#d8d1c3 0% 100%)";
  let cursor = 0;
  const segments = entries.filter((entry) => entry.value > 0).map((entry) => {
    const start = cursor;
    cursor += entry.value / total * 100;
    return `${entry.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function fiscalChart(title, section, definitions, compact = false) {
  const entries = fiscalEntries(section, definitions);
  const total = Math.max(0, Number(section?.total) || entries.reduce((sum, entry) => sum + entry.value, 0));
  const legend = entries.map((entry) => {
    const percent = total > 0 ? entry.value / total * 100 : 0;
    return `<li><i style="--fiscal-color:${entry.color}"></i><span>${entry.name}</span><strong>${formatValue(entry.value, 1)}</strong><small>${formatValue(percent, 1)}%</small></li>`;
  }).join("");
  return `
    <article class="fiscal-chart ${compact ? "is-compact" : ""}">
      <header><h3>${title}</h3><strong>金 ${formatValue(total, 1)}</strong></header>
      <div class="fiscal-chart-body">
        <div class="fiscal-donut" role="img" aria-label="${title} 合計 ${formatValue(total, 1)}" style="--fiscal-gradient:${fiscalGradient(entries, total)}"><span><small>${title}</small><b>${formatValue(total, 1)}</b></span></div>
        <ul class="fiscal-legend">${legend}</ul>
      </div>
    </article>
  `;
}

function fiscalCharts(fiscal, compact = false) {
  return `<div class="fiscal-chart-grid ${compact ? "is-compact" : ""}">${fiscalChart("歳入", fiscal.income, REVENUE_CATEGORIES, compact)}${fiscalChart("支出", fiscal.expenditure, SPENDING_CATEGORIES, compact)}</div>`;
}

function fiscalReportCard(report) {
  const fiscal = report.fiscal;
  const positive = fiscal.balance >= 0;
  return `
    <details class="fiscal-report-card report-fold">
      <summary>
        <div><span>NATIONAL FINANCE · ${report.year} ${report.monthName}</span><h2>国家財政レポート</h2><p>全都市の税収、維持費、国家支出、臨時収支を集計</p></div>
        <div class="fiscal-balance ${positive ? "is-surplus" : "is-deficit"}"><small>当月${positive ? "黒字" : "赤字"}</small><strong>${signed(fiscal.balance, 1)}</strong><span>国庫 ${formatValue(fiscal.openingTreasury, 1)} → ${formatValue(fiscal.closingTreasury, 1)}</span></div>
      </summary>
      <div class="report-fold-body">${fiscalCharts(fiscal)}
        <p class="fiscal-note">支出は「社会保障・軍事関連・研究開発・対外援助・国債返済・経済投資」の六分類で集計しています。</p>
      </div>
    </details>
  `;
}

function renderCityReports(city) {
  const reports = state.monthlyReports.filter((report) => report.cities.some((item) => item.cityId === city.cityId)).slice(0, 18);
  const annual = state.annualReports.slice(0, 6);
  const events = state.monthlyReports.flatMap((report) => report.events.map((item) => ({ ...item, year: report.year, monthName: report.monthName })));
  const latestFiscalReport = state.monthlyReports.find((report) => report.fiscal);
  return `
    ${decisionHighlightsCard(reports[0])}
    ${latestFiscalReport ? fiscalReportCard(latestFiscalReport) : '<section class="fiscal-report-empty"><strong>国家財政レポート</strong><p>月を終えると、歳入・六分類支出・収支のグラフを作成します。</p></section>'}
    ${nationalActivityCard(reports[0])}
    <section class="report-columns">
      <article class="report-list monthly-report-list"><header><h2>月次報告</h2><small>${reports.length}件 · 要約を開いて内訳を確認</small></header>${reports.length ? reports.map((report) => { const local = report.cities.find((item) => item.cityId === city.cityId); return `<details><summary><span>${report.year}年 ${report.monthName}</span><b>金 ${signed(local.changes.money, 1)} · 食 ${signed(local.changes.food)}</b></summary><div class="report-total-strip"><span>人口 <b>${signed(local.changes.population)}</b></span><span>治安 <b>${signed(local.changes.security, 1)}</b></span><span>民心 <b>${signed(local.changes.support, 1)}</b></span></div><h3>因果内訳</h3><div class="report-causal-grid">${reportCausalRows(local)}</div><h3>命令・委任政務</h3><div class="report-actions">${reportActionRows(report, city.cityId)}</div>${report.events.filter((item) => item.cityId === city.cityId).map((item) => `<p class="report-event">事件「${item.title}」— ${item.choice}<small>${item.detail ?? ""}</small></p>`).join("")}${reportStrategicRows(report)}${reportWarRows(report)}</details>`; }).join("") : '<p class="empty-candidates">月を終えると報告が蓄積されます。</p>'}</article>
      <div class="report-side-stack">
        <details class="report-fold report-collection"><summary><strong>年次総括</strong><span>${annual.length}件</span></summary><article class="report-list">${annual.length ? annual.map((report) => report.fiscal ? `<details class="annual-report"><summary><span>誓暦${report.year}年</span><b>${report.fiscal.balance >= 0 ? "黒字" : "赤字"} ${signed(report.fiscal.balance, 1)}</b></summary>${report.ending ? `<p class="annual-ending"><strong>${report.ending.name}</strong><span>${report.ending.description}</span></p>` : ""}${fiscalCharts(report.fiscal, true)}${report.decisions?.length ? `<h3>年の主要決定</h3>${report.decisions.slice(0, 5).map((decision) => `<p class="annual-decision"><strong>${decision.title}</strong><span>${decision.change} · ${decision.effect}</span></p>`).join("")}` : ""}<small>${report.months}か月集計 · 重大事件 ${report.events}件</small></details>` : `<div class="annual-report"><strong>誓暦${report.year}年</strong><span>金 ${signed(report.totals.money, 1)} / 食料 ${signed(report.totals.food)} / 人口 ${signed(report.totals.population)}</span><small>重大事件 ${report.events}件</small></div>`).join("") : '<p class="empty-candidates">12月終了時に年次総括を作成します。</p>'}</article></details>
        <details class="report-fold report-collection"><summary><strong>王国事件履歴</strong><span>${events.length}件</span></summary><article class="report-list">${events.length ? events.map((item) => `<div class="report-history-item"><strong>${item.year}年 ${item.monthName} · ${WORLD.provinces[item.cityId]?.name ?? item.cityId} · ${item.title}</strong><span>${item.choice}</span><small>${item.detail ?? ""}</small></div>`).join("") : '<p class="empty-candidates">王国内の重大事件はまだありません。</p>'}</article></details>
      </div>
    </section>
  `;
}

function historyEventDate(event) {
  return `誓暦${event.year}年${event.month ? ` ${event.month}月` : ""}`;
}

function renderCityHistory(city) {
  const history = getHistoricalOverview(state, city.cityId);
  const strongest = history.pressures[0];
  const pressureCards = history.pressures.map((pressure) => {
    const definition = PRESSURE_DEFINITIONS[pressure.pressureId];
    const trend = pressure.trend > 0 ? `+${pressure.trend.toFixed(1)}` : pressure.trend.toFixed(1);
    const drivers = pressure.drivers.slice(0, 3).map((driver) => `<li><span>${driver.label}</span><b>${Math.round(driver.value)}</b></li>`).join("");
    return `
      <article class="history-pressure-card is-stage-${pressure.stageIndex}">
        <header><div><small>${definition.id.toUpperCase()} PRESSURE</small><h3>${definition.name}</h3></div><b>${Math.round(pressure.value)}</b></header>
        <div class="history-pressure-track"><i style="width:${pressure.value}%"></i></div>
        <p><strong>${pressure.stage}</strong><span>前月比 ${trend}</span></p>
        <ul>${drivers}</ul>
      </article>
    `;
  }).join("");
  const legacies = history.institutionalLegacies.map((legacy) => {
    const origin = history.events.find((event) => event.id === legacy.originEventId);
    return `
      <article class="institutional-legacy-card">
        <header><div><small>INSTITUTIONAL LEGACY · ${legacy.domain}</small><h3>${legacy.name}</h3></div><b>${Math.round(legacy.persistence)}</b></header>
        <p>${legacy.currentEffect}</p>
        <footer><span>${origin ? historyEventDate(origin) : `誓暦${legacy.originYear}年`}</span><strong>${origin?.title ?? "起源記録を照合中"}</strong></footer>
      </article>
    `;
  }).join("");
  const eras = history.eras.map((era) => `
    <details class="history-era" ${era === history.eras.at(-1) ? "open" : ""}>
      <summary><span>${era.startYear === era.endYear ? `誓暦${era.startYear}年` : `誓暦${era.startYear}–${era.endYear}年`}</span><strong>${era.title}</strong><b>${era.events.length}件</b></summary>
      ${era.events.map((event) => `<article><small>${historyEventDate(event)} · ${event.type}</small><h3>${event.title}</h3><p>${event.summary}</p></article>`).join("")}
    </details>
  `).join("");
  const accounts = history.accounts.map((event) => `
    <article class="historical-account-card">
      <header><small>${historyEventDate(event)}</small><h3>${event.title}</h3></header>
      <dl><div><dt>世界の事実</dt><dd>${event.accounts.worldTruth}</dd></div><div><dt>公的記録</dt><dd>${event.accounts.historicalRecord}</dd></div><div><dt>人々の記憶</dt><dd>${event.accounts.publicBelief}</dd></div></dl>
    </article>
  `).join("");
  const trace = history.latestTrace.length
    ? history.latestTrace.map((edge) => `<li style="--trace-depth:${edge.depth}"><span>${edge.relation === "enabled_by" ? "成立条件" : "原因"}</span><strong>${edge.from.label}</strong><small>→ ${edge.to.label}</small></li>`).join("")
    : '<li class="is-empty"><strong>起源より前の記録は残っていません。</strong></li>';
  return `
    <section class="history-hero">
      <article><small>CURRENT PRESSURE</small><strong>${strongest ? `${strongest.stage} · ${Math.round(strongest.value)}` : "安定"}</strong><span>${strongest ? PRESSURE_DEFINITIONS[strongest.pressureId].name : "圧力なし"}</span></article>
      <article><small>INSTITUTIONAL LEGACIES</small><strong>${history.institutionalLegacies.length}件</strong><span>現在の統治ルールへ接続</span></article>
      <article><small>CAUSAL EVENTS</small><strong>${history.events.length}件</strong><span>原因と結果を持つ記録</span></article>
    </section>
    <section class="history-pressure-panel"><header><div><small>PRESSURE → MANIFESTATION</small><h2>蓄積圧力</h2></div><p>事件は無作為に生えず、閾値を越えた危機の発生月だけが揺らぎます。</p></header><div class="history-pressure-grid">${pressureCards}</div></section>
    <section class="history-ledger-grid">
      <article class="history-ledger"><header><small>EVENT STORE → ERA COMPILER</small><h2>${WORLD.provinces[city.cityId].name}年代記</h2></header>${eras}</article>
      <aside class="history-causal-trace"><header><small>CAUSAL DAG</small><h2>最新記録の原因</h2></header><ol>${trace}</ol></aside>
    </section>
    <section class="institutional-legacy-panel"><header><div><small>PAST → CURRENT RULES</small><h2>制度的負債</h2></div><p>過去に譲渡した権限が、現在の中央集権化を制約します。</p></header><div>${legacies || '<p class="history-empty">この地域に有効な制度的負債はありません。</p>'}</div></section>
    <section class="historical-account-panel"><header><div><small>TRUTH ≠ BELIEF</small><h2>事実・記録・記憶</h2></div><p>同じ事件でも、内部事実と人々の理解を分離して保存します。</p></header><div>${accounts}</div></section>
  `;
}

function renderCityWorkspace() {
  const active = ["city", "town", "career", "village", "location", "governance"].includes(view.panel);
  const villageActive = view.panel === "village";
  const locationActive = view.panel === "location";
  const conversationActive = view.panel === "village" && Boolean(view.villageConversation);
  document.body.classList.toggle("is-village-focus", villageActive || locationActive);
  document.body.classList.toggle("is-location-focus", locationActive);
  document.body.classList.toggle("is-character-conversation", conversationActive);
  elements.mapStage.classList.toggle("is-village-scene", villageActive || locationActive);
  elements.mapStage.classList.toggle("is-location-scene", locationActive);
  elements.mapStage.classList.toggle("is-character-scene", conversationActive);
  elements.mapStage.classList.toggle("is-city-mode", active);
  elements.cityWorkspace.classList.toggle("is-hidden", !active);
  elements.cityWorkspace.setAttribute("aria-hidden", String(!active));
  if (!active) return;
  if (conversationActive) {
    elements.cityWorkspace.innerHTML = renderVillageConversation();
    return;
  }
  if (view.panel === "career") {
    elements.cityWorkspace.innerHTML = renderCareerWorkspace();
    return;
  }
  if (view.panel === "village") {
    elements.cityWorkspace.innerHTML = renderVillageWorkspace();
    return;
  }
  if (view.panel === "location") {
    elements.cityWorkspace.innerHTML = renderLocationWorkspace();
    return;
  }
  if (view.panel === "governance") {
    elements.cityWorkspace.innerHTML = renderGovernanceWorkspace();
    return;
  }
  if (view.panel === "town") {
    const town = getTownAdministration(state, view.selectedTownId);
    const governorId = state.cities[town.cityId].governorId;
    const body = {
      overview: renderTownOverview,
      office: renderTownOffice,
      commands: renderTownCommands,
      records: renderTownRecords,
    }[view.townTab](town);
    elements.cityWorkspace.innerHTML = `${townWorkspaceHeader(town, getOfficerReport(state, governorId))}<div class="city-workspace-body town-workspace-body">${body}</div>`;
    return;
  }
  const city = withPlanningForecast(deriveCityMetrics(state, view.selectedCityId));
  const governor = getOfficerReport(state, city.governorId);
  const body = {
    overview: renderCityOverview, population: renderCityPopulation, economy: renderCityEconomy,
    administration: renderCityAdministration, facilities: renderCityFacilities, factions: renderCityFactions, history: renderCityHistory, reports: renderCityReports,
  }[view.cityTab](city);
  elements.cityWorkspace.innerHTML = `${cityWorkspaceHeader(city, governor)}<div class="city-workspace-body">${body}</div>`;
}

function knowledgeLabel(value) {
  return ({ defined: "設定あり", partial: "一部未詳", unknown: "未詳" })[value] ?? value;
}

function worldModeSwitch() {
  return `
    <div class="world-mode-switch" role="group" aria-label="世界台帳の表示">
      <button type="button" data-world-mode="generated" class="${view.atlasMode === "generated" ? "is-active" : ""}">生成世界</button>
      <button type="button" data-world-mode="geopolitics" class="${view.atlasMode === "geopolitics" ? "is-active" : ""}">世界情勢</button>
      <button type="button" data-world-mode="nations" class="${view.atlasMode === "nations" ? "is-active" : ""}">国家</button>
    </div>
  `;
}

function generatedVillageContexts(regionId = null) {
  if (!state.player) return [];
  const { runtime, expeditionRegion } = getGeneratedWorldView(state);
  const targetRegionId = regionId ?? expeditionRegion.id;
  return (runtime.nations.objects ?? [])
    .filter((object) => object.settlementLevel && object.regionId === targetRegionId)
    .map((object) => {
      const region = runtime.regionById.get(object.regionId);
      const nation = runtime.nationById.get(object.nationId);
      return {
        id: object.id,
        name: object.name,
        source: "generated",
        regionId: object.regionId,
        regionName: region?.name ?? "地方不明",
        nationId: object.nationId,
        nationName: nation?.name ?? "所属不明",
        type: object.type,
        typeName: object.typeName,
        settlementLevel: object.settlementLevel,
        population: object.population,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function generatedSettlementContext(object, runtime) {
  const region = runtime.regionById.get(object.regionId);
  const nation = runtime.nationById.get(object.nationId);
  const tile = runtime.tiles[object.tileIndex] ?? runtime.tiles[region?.markerIndex] ?? null;
  return {
    id: object.id,
    name: object.name,
    source: "generated",
    regionId: object.regionId,
    regionName: region?.name ?? "地方不明",
    nationId: object.nationId,
    nationName: nation?.name ?? "所属不明",
    type: object.type,
    typeName: object.typeName,
    settlementLevel: object.settlementLevel,
    population: object.population,
    tileIndex: object.tileIndex,
    tileId: tile?.id ?? null,
    terrain: tile?.terrain ?? region?.dominantTerrain ?? null,
    yields: tile?.yields ?? null,
    resourcePotential: tile?.resourcePotential ?? null,
  };
}

function villageContextById(villageId) {
  if (!villageId) return null;
  const { runtime } = getGeneratedWorldView(state);
  const object = (runtime.nations.objects ?? []).find((entry) => entry.settlementLevel && entry.id === villageId);
  if (object) {
    return generatedSettlementContext(object, runtime);
  }
  const town = WORLD.villages[villageId];
  if (!town) return null;
  return {
    id: town.id,
    name: town.name,
    source: "static",
    regionId: town.province,
    regionName: WORLD.provinces[town.province]?.name ?? "地方不明",
    nationId: WORLD.provinces[town.province]?.owner ?? WORLD.nation.id,
    nationName: WORLD.countries[WORLD.provinces[town.province]?.owner]?.name ?? WORLD.nation.name,
    settlementLevel: "village",
    type: "village",
  };
}

function discoveredMerchantSettlements(currentVillage) {
  if (!state.generatedWorld) return state.player?.merchantTrade?.knownSettlements?.filter((entry) => entry.id !== currentVillage?.id) ?? [];
  const { runtime } = getGeneratedWorldView(state);
  const discovered = new Set(state.generatedWorld.discoveredRegionIds ?? []);
  return (runtime.nations.objects ?? [])
    .filter((object) => object.settlementLevel && object.id !== currentVillage?.id && discovered.has(object.regionId))
    .map((object) => generatedSettlementContext(object, runtime))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
}

function activeVillageContext() {
  return villageContextById(view.selectedVillageId);
}

function currentRegionalReputationReport(village = null) {
  if (!state.player) return { value: 0, label: "この地方では無名", regionName: "現在地", sources: [] };
  try {
    const { runtime, expeditionRegion } = getGeneratedWorldView(state);
    const activeVillage = village ?? activeVillageContext();
    const villageId = activeVillage?.regionId === expeditionRegion.id ? activeVillage.id : null;
    return {
      ...getRegionalReputationReport(state, {
        regionId: expeditionRegion.id,
        villageId,
        regions: runtime.nations.regions,
      }),
      regionName: expeditionRegion.name,
    };
  } catch {
    const regionId = village?.regionId ?? state.player.locationId;
    return {
      ...getRegionalReputationReport(state, { regionId, villageId: village?.id }),
      regionName: village?.regionName ?? "現在地",
    };
  }
}

function currentAdventureContext() {
  const world = getGeneratedWorldView(state);
  const village = activeVillageContext();
  const reputation = currentRegionalReputationReport(village);
  return {
    region: world.expeditionRegion,
    nation: world.runtime.nationById.get(world.expeditionRegion.nationId) ?? world.playerNation,
    runtime: world.runtime,
    villageId: village?.id,
    localRenown: reputation.value,
  };
}

function currentAdventureSites() {
  return getRegionAdventureSites(state, currentAdventureContext());
}

function enterVillage(villageId) {
  const context = villageContextById(villageId);
  if (!context) throw new Error("入れる村が見つかりません");
  view.characterDetailOpen = false;
  view.selectedGeneratedSite = null;
  view.generatedSiteInfoOpen = false;
  view.selectedVillageId = context.id;
  view.selectedVillageFacilityId = "inn";
  view.villageFacilityOpen = false;
  view.tavernSection = "requests";
  view.villageConversation = null;
  view.locationScene = null;
  view.selectedLocationZoneId = null;
  view.locationSceneResult = null;
  view.panel = "village";
  view.scale = "village";
  view.tileWindowOpen = false;
  if (context.source === "static") {
    view.selectedTownId = context.id;
    view.selectedCityId = context.regionId;
    view.selectedType = "village";
    view.selectedId = context.id;
  } else {
    view.selectedType = null;
    view.selectedId = null;
  }
}

function renderVillageEntrySection(compact = false) {
  const { expeditionRegion } = getGeneratedWorldView(state);
  const villages = generatedVillageContexts(expeditionRegion.id);
  const buttons = villages.map((village) => `
    <button type="button" data-enter-village="${village.id}">
      <i aria-hidden="true">${escapeHtml(village.typeName)}</i><span><strong>${escapeHtml(village.name)}</strong><small>${escapeHtml(village.nationName)} · 人口 ${formatValue(village.population)} · 宿・商・依頼・交流</small></span><b>入る →</b>
    </button>`).join("");
  return `<section class="village-entry-section ${compact ? "is-compact" : ""}">
    <header><div><small>SETTLEMENTS / PERSONAL VISIT</small><h2>現在地の集落</h2></div><strong>${villages.length}集落</strong></header>
    ${buttons ? `<div>${buttons}</div>` : `<p>${escapeHtml(expeditionRegion.name)}で立ち寄れる集落はまだ見つかっていません。隣接地方へ移動し、集落のある地方を探してください。</p>`}
  </section>`;
}

function renderPersonalMapEntryActions(personalMap) {
  if (personalMap.currentLocation.type === "dungeon") {
    const { dungeon } = currentAdventureSites();
    const archetype = DUNGEON_ARCHETYPES[dungeon.dungeonType];
    const life = state.player.villageLife;
    const lowHp = life.hp < 35;
    return `<div class="personal-map-entry-actions">
      <button type="button" data-enter-dungeon="${dungeon.id}" ${lowHp ? "disabled" : ""}><i aria-hidden="true">${archetype.symbol}</i><span><small>${dungeon.cleared ? "踏破済み" : "未踏"}</small><strong>${escapeHtml(dungeon.name)}へ入る</strong>${lowHp ? `<em>HP ${life.hp}/${life.maxHp} · 出発には35以上必要</em>` : ""}</span><b>${lowHp ? "治療が必要" : "準備確認 →"}</b></button>
      ${lowHp ? '<button type="button" class="is-recovery" data-return-recovery><i aria-hidden="true">癒</i><span><small>安全な既知経路を自動移動</small><strong>村の治療所へ帰還</strong></span><b>帰還 →</b></button>' : ""}
    </div>`;
  }
  if (personalMap.currentLocation.type !== "village") return "";
  const villages = generatedVillageContexts(personalMap.regionId);
  const buttons = villages.map((village) => `
    <button type="button" data-enter-village="${village.id}"><i aria-hidden="true">${escapeHtml(village.typeName)}</i><span><small>${escapeHtml(village.nationName)} · 人口 ${formatValue(village.population)}</small><strong>${escapeHtml(village.name)}へ入る</strong></span><b>訪問 →</b></button>
  `).join("");
  return `<div class="personal-map-entry-actions">${buttons || "<p>この地方で入れる集落はまだ見つかっていません。</p>"}</div>`;
}

function renderPersonalMapCommand(personalMap = getPersonalMapView(state, currentAdventureContext())) {
  const result = personalMap.lastResult;
  const resultIcon = result?.itemIcon ?? result?.enemySymbol ?? result?.symbol ?? ({ move: "歩", nothing: "―" }[result?.type] ?? "探");
  const resultMarkup = result ? `
    <article class="personal-map-result is-${result.type} ${result.outcome ? `outcome-${result.outcome}` : ""}">
      <i aria-hidden="true">${escapeHtml(resultIcon)}</i>
      <span><small>直前の結果</small><strong>${escapeHtml(result.title)}</strong><p>${escapeHtml(result.message)}</p></span>
    </article>` : '<p class="personal-map-empty">「探索」で周辺を調べると、場所・モンスター・採取品などを発見します。</p>';
  const destinations = personalMap.reachableLocations.map((location) => `
    <button type="button" data-personal-map-move="${location.id}">
      <i aria-hidden="true">${escapeHtml(location.symbol)}</i><span><small>近くの発見済み地点 · 約${formatGeneratedTravelDuration(personalMapTravelMinutes(personalMap.currentLocation, location))}</small><strong>${escapeHtml(location.name)}</strong></span><b>移動</b>
    </button>`).join("");
  const life = state.player.villageLife;
  return `<section class="personal-map-command" aria-label="${escapeHtml(personalMap.regionName)}の地方内行動">
    <header><div><small>LOCAL ACTIONS · ${escapeHtml(personalMap.regionName)}</small><h2><i aria-hidden="true">${escapeHtml(personalMap.currentLocation.symbol)}</i>${escapeHtml(personalMap.currentLocation.name)}</h2></div><strong>${personalMap.locations.filter((location) => location.discovered).length} / ${personalMap.locations.length}地点</strong></header>
    <div class="personal-map-vitals ${life.hp < 35 ? "is-danger" : ""}"><strong>HP ${life.hp} / ${life.maxHp}</strong><span>${life.hp < 35 ? "重傷：探索・ダンジョン進入は危険" : escapeHtml(villageConditionSummary(life))}</span></div>
    <p class="personal-map-current-copy">${escapeHtml(personalMap.currentLocation.description)}</p>
    <div class="personal-map-actions">
      <button type="button" class="personal-map-explore" data-personal-map-explore ${life.hp < 35 ? "disabled" : ""}><i aria-hidden="true">探</i><span><strong>探索</strong><small>${life.hp < 35 ? "HP35以上まで治療が必要" : "新たな場所・戦闘・アイテム・空振り"}</small></span></button>
      <div class="personal-map-destinations"><header><strong>移動</strong><small>発見済みの近くの場所だけ</small></header>${destinations || "<p>移動できる発見済み地点がありません。</p>"}</div>
    </div>
    ${renderPersonalMapEntryActions(personalMap)}
    ${resultMarkup}
  </section>`;
}

function generatedRegionTerrainLabel(region) {
  const terrain = GENERATED_TERRAIN_LABELS[region.dominantTerrain] ?? region.dominantTerrain;
  const relief = GENERATED_RELIEF_LABELS[region.dominantRelief] ?? region.dominantRelief;
  return `${terrain}・${relief}`;
}

function formatGeneratedTravelDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor(total % (24 * 60) / 60);
  const remainder = total % 60;
  return [days ? `${days}日` : "", hours ? `${hours}時間` : "", remainder ? `${remainder}分` : ""].filter(Boolean).join("") || "0分";
}

function personalMapTravelMinutes(from, to) {
  const distance = Math.hypot((to?.x ?? 0) - (from?.x ?? 0), (to?.y ?? 0) - (from?.y ?? 0));
  return Math.min(6 * 60, Math.max(90, Math.ceil(distance / 10) * 30));
}

function paintGeneratedWorldTime(timeView) {
  if (!elements.generatedWorldMap || !timeView) return;
  elements.generatedWorldMap.dataset.worldPhase = timeView.phase;
  elements.generatedWorldTimeLabel.textContent = `第${timeView.day}日 ${timeView.timeLabel}`;
  elements.generatedWorldPhaseLabel.textContent = `${timeView.phaseLabel} · ${formatDate(state)}`;
}

function renderGeneratedWorldPanel() {
  const { runtime, generatedState, playerNation, expeditionRegion, expeditionTile } = getGeneratedWorldView(state);
  const currentNation = runtime.nationById.get(expeditionRegion.nationId) ?? playerNation;
  const personalMap = getPersonalMapView(state, { runtime, region: expeditionRegion, nation: currentNation });
  const worldTime = getGeneratedWorldTimeView(state);
  const shippingDestinations = getGeneratedShippingDestinations(state);
  const currentPort = runtime.nations.objects.find((object) => object.maritime && object.tileIndex === expeditionTile.index) ?? null;
  const nationOptions = runtime.nations.nations.filter((nation) => !nation.dissolved).map((nation) => `
    <option value="${nation.id}" ${nation.id === playerNation.id ? "selected" : ""}>${escapeHtml(nation.name)} · ${escapeHtml(nation.government)}</option>
  `).join("");
  const shippingButtons = shippingDestinations.map((entry) => `
    <button type="button" data-generated-shipping-site-id="${entry.siteId}" ${entry.canMove ? "" : "disabled"}>
      <i aria-hidden="true">${escapeHtml({ fishing_port: "漁", port: "港", bay_city: "湾" }[entry.type] ?? "船")}</i>
      <span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.nation?.name ?? "所属不明")} · ${escapeHtml(entry.region.name)}</small></span>
      <em>移動力 ${entry.cost}<small>約${formatGeneratedTravelDuration(entry.travelMinutes)}</small></em>
    </button>`).join("");
  return `
    ${renderPersonalMapCommand(personalMap)}
    <section class="generated-shipping-command">
      <header><div><small>SEA TRANSPORT</small><h2>海運・海路</h2></div><strong>${currentPort ? `${shippingDestinations.length}航路` : "未入港"}</strong></header>
      <p>${currentPort ? `${escapeHtml(currentPort.name)}から、海路で遠方の沿岸都市へ移動できます。` : "海運を利用するには、世界地図上の漁港・港・湾口都市へ移動してください。"}</p>
      <div class="generated-shipping-list">${shippingButtons || `<small>${currentPort ? "今月の移動力で利用できる海路がありません。" : "港へ到着すると利用可能な航路を表示します。"}</small>`}</div>
    </section>
    <section class="generated-command-status" data-terrain="${expeditionRegion.dominantTerrain}" data-relief="${expeditionRegion.dominantRelief}" style="--generated-nation-color:${currentNation.color}">
      <div class="generated-region-vista" aria-hidden="true"><i></i><u></u><span>${escapeHtml(currentNation.shortName.slice(0, 1))}</span></div>
      <header><div><small>CURRENT REGION · ${escapeHtml(expeditionRegion.status === "independent" ? "独立勢力" : expeditionRegion.status === "transferred" ? "支配移管地域" : "国家構成地域")}</small><h2>${escapeHtml(expeditionRegion.name)}</h2><p>${escapeHtml(generatedRegionTerrainLabel(expeditionRegion))} · ${escapeHtml(expeditionRegion.officeTitle)}${expeditionRegion.lordName ? ` ${escapeHtml(expeditionRegion.lordName)}` : "（空位）"}</p></div><strong class="generated-movement-dial" style="--movement:${Math.min(100, generatedState.expeditionMovement / 8 * 100)}%"><b>${generatedState.expeditionMovement}</b><small>/ 8</small></strong></header>
      <div>
        <span><small>現在の支配勢力</small><strong>${escapeHtml(currentNation.name)}</strong></span>
        <span><small>地勢</small><strong>${escapeHtml(GENERATED_RELIEF_LABELS[expeditionRegion.dominantRelief] ?? expeditionRegion.dominantRelief)}</strong></span>
        <span><small>人口 / 世界時刻</small><strong>${formatValue(expeditionRegion.population)} · 第${worldTime.day}日 ${worldTime.timeLabel}</strong></span>
      </div>
      <label><span>プレイヤー国家</span><select data-generated-player-nation>${nationOptions}</select></label>
    </section>
    <p class="world-source-note">地方内の「探索」「移動」「入場」は左の地方内行動欄から行います。地方間は地図上の「進む」で行き先と所要時間を確認してから移動し、沿岸都市に停泊中は海運で航路接続先へ渡れます。</p>
  `;
}

function nationPeopleChips(nationId) {
  const people = getPeopleForNation(nationId);
  const confirmed = people.confirmed.map((item) => `<button type="button" class="world-link-chip is-confirmed" data-world-people="${item.id}">${item.name}</button>`);
  const related = people.related.map((item) => `<button type="button" class="world-link-chip is-related" data-world-people="${item.id}" title="Notion上で直接の構成種族とは確定していません">関連：${item.name}</button>`);
  return [...confirmed, ...related].join("") || '<span class="world-unset">構成種族の対応なし</span>';
}

function renderWorldNations() {
  const { runtime, playerNation } = getGeneratedWorldView(state);
  const activeNations = runtime.nations.nations.filter((nation) => !nation.dissolved);
  const requested = runtime.nationById.get(view.selectedGeneratedNationId);
  const selected = requested && !requested.dissolved ? requested : playerNation;
  view.selectedGeneratedNationId = selected.id;
  const selectedRegions = selected.regionIds.map((id) => runtime.regionById.get(id)).filter(Boolean);
  const borderSegments = runtime.nations.borderSegments.filter((segment) => segment.nations.includes(selected.id));
  const naturalBorders = borderSegments.filter((segment) => segment.natural).length;
  const neighborIds = new Set(borderSegments.flatMap((segment) => segment.nations).filter((id) => id !== selected.id));
  const neighbors = [...neighborIds].map((id) => runtime.nationById.get(id)).filter(Boolean);
  const cards = activeNations.map((nation) => `
    <button type="button" class="world-nation-card ${nation.id === selected.id ? "is-active" : ""}" data-generated-nation="${nation.id}">
      <span class="world-sigil" style="--nation-color:${nation.color}">${escapeHtml(nation.shortName.slice(0, 1))}</span>
      <span><strong>${escapeHtml(nation.name)}</strong><small>国家Lv.${nation.nationLevel ?? "—"} · ${escapeHtml(nation.government)}<br>${escapeHtml(nation.peopleName)} · ${nation.regionCount}地方</small></span>
      <em>${nation.id === playerNation.id ? "自国" : `${Math.round(nation.areaShare * 100)}%`}</em>
    </button>
  `).join("");
  return `
    <section class="world-dossier" style="--nation-color:${selected.color}">
      <header><span class="world-sigil large">${escapeHtml(selected.shortName.slice(0, 1))}</span><div><small>国家レベル ${selected.nationLevel ?? "—"} · ${escapeHtml(selected.government)} · ${escapeHtml(selected.peopleName)}</small><h2>${escapeHtml(selected.name)}</h2><b>${selected.regionCount}地方から成る国家</b></div></header>
      <p>${escapeHtml(selected.settlementStyle)}を基盤とし、主産業は${escapeHtml(selected.economy)}。国家は複数地域の集合であり、地域の割譲・占領・独立に応じて国境線も更新されます。</p>
      <div class="generated-nation-facts">
        <span><small>構成地域</small><strong>${selected.regionCount}</strong></span>
        <span><small>地形区画</small><strong>${selected.tileCount}</strong></span>
        <span><small>人口力</small><strong>${formatValue(selected.populationPotential)}</strong></span>
        <span><small>平均肥沃度</small><strong>${selected.meanFertility}</strong></span>
        <span><small>生成時の村</small><strong>${selected.initialVillageCount ?? 0} / ${selected.initialVillageLimit ?? "—"}</strong></span>
        <span><small>自然国境</small><strong>${borderSegments.length ? Math.round(naturalBorders / borderSegments.length * 100) : 100}%</strong></span>
        <span><small>隣接国家</small><strong>${neighbors.length}</strong></span>
      </div>
      <div class="world-link-row">${selectedRegions.map((region) => `<button type="button" class="world-link-chip is-confirmed" data-generated-region-id="${region.id}" title="${escapeHtml(`${region.officeTitle} · 人口 ${formatValue(region.population)}`)}">${escapeHtml(region.name)} · ${escapeHtml(region.officeTitle)}</button>`).join("")}</div>
      <div class="world-relation-note">${neighbors.length ? `国境を接する国家：${neighbors.map((nation) => escapeHtml(nation.name)).join(" / ")}` : "他国と陸上国境を接していません。"}</div>
    </section>
    <section class="panel-section">
      <div class="section-heading"><h2>生成国家一覧</h2><small>${activeNations.length}か国</small></div>
      <div class="world-nation-list">${cards}</div>
    </section>
    <p class="world-source-note">各国は複数地域に分かれ、辺境には辺境伯、内地には地方伯、王都には総督職が置かれます。地域支配の交代や独立は同じ地域台帳に保存されます。</p>
  `;
}

function renderWorldGeopolitics() {
  const timeline = getGeneratedWorldIntelligenceView(state);
  const knownWars = getKnownGeneratedWorldWarView(state);
  const rumorCount = timeline.filter((entry) => entry.source.type === "rumor").length;
  const witnessedCount = timeline.filter((entry) => entry.source.type === "witnessed").length;
  const phaseNames = { awaiting_player: "判断待ち", mobilizing: "動員", campaigning: "野戦", siege: "攻城", settlement: "講和", complete: "終結" };
  const settlementNames = { limited_annexation: "限定割譲", invasion_repelled: "侵攻撃退", attacker_withdrawal: "攻撃側撤退", negotiated_ceasefire: "停戦", status_quo: "国境維持" };
  const activeWarRows = knownWars.activeWars.map((war) => `
    <article class="known-world-war is-active">
      <header><div><small>${escapeHtml(war.startedPeriod)}開戦 · ${escapeHtml(phaseNames[war.phase] ?? war.phase)}</small><h3>${escapeHtml(war.attackerName)} → ${escapeHtml(war.defenderName)}</h3></div><strong>${escapeHtml(war.objectiveName)}</strong></header>
      <p class="known-world-war-target">主目標：${escapeHtml(war.targetRegionName)} · ${war.fronts.length}正面</p>
      <div class="known-world-war-doctrines">
        <div><small>攻撃理論</small><strong>${escapeHtml(war.attackerDoctrine.name)}</strong><p>${escapeHtml(war.attackerDoctrine.description)}</p></div>
        <div><small>防衛理論</small><strong>${escapeHtml(war.defenderDoctrine.name)}</strong><p>${escapeHtml(war.defenderDoctrine.description)}</p></div>
      </div>
      <div class="known-world-war-forces">
        <span><small>攻撃側</small><b>${formatValue(war.attacker.strength)}</b><em>補給 ${war.attacker.supply} · 損失 ${formatValue(war.attacker.casualties)}</em></span>
        <span><small>防衛側</small><b>${formatValue(war.defender.strength)}</b><em>補給 ${war.defender.supply} · 損失 ${formatValue(war.defender.casualties)}</em></span>
      </div>
      <div class="known-world-war-fronts">${war.fronts.map((front) => `
        <div class="known-world-war-front">
          <span><strong>${escapeHtml(front.name)} · ${escapeHtml(front.targetRegionName)}</strong><b>${front.progress}%</b></span>
          <i aria-label="侵攻進捗 ${front.progress}%"><u style="--war-progress:${front.progress}%"></u></i>
          <small>${front.attackerAction ? escapeHtml(front.attackerAction.name) : "部隊集結中"} / ${front.defenderAction ? escapeHtml(front.defenderAction.name) : "防衛準備中"}</small>
        </div>`).join("")}</div>
    </article>
  `).join("");
  const completedWarRows = knownWars.history.slice(0, 6).map((war) => `
    <article class="known-world-war is-complete">
      <header><div><small>${escapeHtml(war.startedPeriod)}—${escapeHtml(war.endedPeriod ?? "時期不明")}</small><h3>${escapeHtml(war.attackerName)}・${escapeHtml(war.defenderName)}戦争</h3></div><strong>${escapeHtml(settlementNames[war.settlementId] ?? "終結")}</strong></header>
      <p>${escapeHtml(war.targetRegionName)} · 攻撃側損失 ${formatValue(war.attacker.casualties)} / 防衛側損失 ${formatValue(war.defender.casualties)}</p>
    </article>
  `).join("");
  const knownWarRows = activeWarRows || completedWarRows ? `${activeWarRows}${completedWarRows}` : `
    <div class="world-intelligence-empty"><strong>把握済みの列国戦争はありません</strong><p>開戦や戦況の噂を得るか、戦場の近くに居合わせると、攻守の国家理論と前線状況がここへ記録されます。</p></div>`;
  const eventRows = timeline.map((entry) => `
    <article class="geopolitical-event world-intelligence-entry is-${entry.tone}">
      <header><small>${escapeHtml(entry.eventPeriod)}</small><strong>${escapeHtml(entry.title)}</strong></header>
      <p>${escapeHtml(entry.summary)}</p>
      <span>${entry.source.type === "witnessed" ? "現場・近傍" : "住人の噂"} · ${escapeHtml(entry.source.label)}</span>
      <small>${escapeHtml(entry.regionName)} · ${escapeHtml(entry.nationName)}${entry.targetNationName ? ` → ${escapeHtml(entry.targetNationName)}` : ""} · ${escapeHtml(entry.learnedPeriod)}に把握</small>
    </article>
  `).join("") || `
    <div class="world-intelligence-empty">
      <strong>まだ知り得た世界の動きはありません</strong>
      <p>村の酒場で「噂を聞く」、町や村で「情報収集」を行うと、住人が知る出来事が追加されます。出来事の近くに居合わせた場合は自動で記録されます。</p>
    </div>`;
  return `
    <section class="world-dossier geopolitical-dossier world-intelligence-summary">
      <header><span class="world-sigil large">聞</span><div><small>KNOWN WORLD TIMELINE</small><h2>見聞した世界の動き</h2><b>知った出来事だけを記録</b></div></header>
      <p>国家の内部判断を無条件には表示しません。住人から得た噂と、プレイヤーが近くで居合わせた出来事が時系列に蓄積されます。</p>
      <div class="generated-nation-facts geopolitical-metrics"><span><small>既知の出来事</small><strong>${timeline.length}</strong></span><span><small>住人の噂</small><strong>${rumorCount}</strong></span><span><small>現場・近傍</small><strong>${witnessedCount}</strong></span></div>
    </section>
    <section class="panel-section geopolitical-section"><div class="section-heading"><h2>把握済みの列国戦争</h2><small>攻撃・防衛・前線</small></div><div class="known-world-war-list">${knownWarRows}</div></section>
    <section class="panel-section geopolitical-section"><div class="section-heading"><h2>世界の動き</h2><small>新しく知った順</small></div><div class="geopolitical-events world-intelligence-timeline">${eventRows}</div></section>
    <p class="world-source-note"><b>情報の入手：</b>集落で噂を聞く／情報収集を行う、または出来事が起きた地方か隣接地方に居合わせることで追加されます。</p>
  `;
}

function renderWorldPeoples() {
  const selected = PEOPLES[view.selectedPeopleId] ?? PEOPLES.acrane;
  const representative = PEOPLE_REPRESENTATIVES[selected.id];
  const nations = getNationsForPeople(selected.id);
  const nationLinks = nations.length
    ? nations.map((nation) => `<span class="world-link-chip ${nation.association === "confirmed" ? "is-confirmed" : "is-related"}">${nation.association === "confirmed" ? "原案所属" : "原案関連"}：${nation.name}</span>`).join("")
    : '<span class="world-unset">Notion上で国家帰属は未設定</span>';
  const listedPeoples = NOTION_OTHER_RACE_IDS.map((id) => PEOPLES[id]);
  const auxiliaryPeoples = Object.values(PEOPLES).filter((people) => people.auxiliary);
  const raceCards = [...listedPeoples, ...auxiliaryPeoples].map((people) => {
    const links = getNationsForPeople(people.id);
    const meta = people.auxiliary ? "補助分類" : links.length ? `国家関連 ${links.length}` : "国家未設定";
    const portrait = PEOPLE_REPRESENTATIVES[people.id];
    return `
      <button type="button" class="world-people-card ${people.id === selected.id ? "is-active" : ""} ${people.auxiliary ? "is-auxiliary" : ""}" data-world-people="${people.id}">
        <img src="${portrait.image}" alt="" loading="lazy"><strong>${people.name}</strong><small>${portrait.apparentAge} · ${meta}</small>
      </button>
    `;
  }).join("");
  return `
    <section class="world-dossier people-dossier">
      <div class="people-portrait-stage">
        <img src="${representative.image}" alt="${selected.name}を代表する成人女性の肖像">
        <div class="people-portrait-caption"><span>${representative.apparentAge}の代表</span><strong>${representative.role}</strong><small>${representative.expression}</small></div>
      </div>
      <header><span class="world-sigil large">${selected.sigil}</span><div><small>${selected.sourceKind}</small><h2>${selected.name}</h2><b>${selected.family}</b></div></header>
      <p>${selected.note}</p>
      <div class="world-link-row">${nationLinks}</div>
    </section>
    <section class="panel-section">
      <div class="section-heading"><h2>種族一覧</h2><small>異種族15 + 補助2</small></div>
      <div class="world-people-grid">${raceCards}</div>
      <p class="world-source-note">人間は国家設定の基準種、竜族はWorld Create側の補助分類です。確定していない国家との対応は「関連」として区別しています。</p>
    </section>
  `;
}

function renderWorldCreatures() {
  const creature = getExtremeCreature(view.selectedCreatureId) ?? EXTREME_CREATURES.leviathan;
  const signRows = creature.signs.map((sign) => `<li>${sign}</li>`).join("");
  const effectRows = creature.strategicEffects.map((effect) => `<li>${effect}</li>`).join("");
  return `
    <section class="world-dossier extreme-creature-dossier">
      <figure class="extreme-creature-art">
        <img src="${escapeHtml(creature.image)}" alt="${escapeHtml(creature.name)}が黒潮回廊へ浮上した際の観測復元画" loading="lazy">
        <figcaption>黒潮回廊観測記録 · 浮上背部約410mの復元画</figcaption>
      </figure>
      <header class="extreme-creature-heading">
        <span class="extreme-creature-sigil" aria-hidden="true">鯨</span>
        <div><small>${creature.sourceKind} · ${creature.classification}</small><h2>${creature.name}</h2><b>${creature.epithet}</b></div>
      </header>
      <div class="extreme-creature-status"><span>${creature.certainty}</span><strong>${creature.currentState}</strong></div>
      <p>${creature.description}</p>
      <div class="extreme-creature-metrics">
        <div><small>推定規模</small><strong>${creature.estimatedLength}</strong><span>${creature.observedPart}</span></div>
        <div><small>回遊域</small><strong>${creature.habitat}</strong><span>${creature.location.label}</span></div>
      </div>
      <article class="extreme-creature-note"><h3>生態仮説</h3><p>${creature.ecology}</p></article>
      <article class="extreme-creature-note"><h3>接近兆候</h3><ol>${signRows}</ol></article>
      <article class="extreme-creature-note is-strategic"><h3>国家戦略への影響</h3><ul>${effectRows}</ul></article>
      <aside class="extreme-creature-doctrine"><small>CONTINENTAL PROTOCOL</small><strong>対処原則</strong><p>${creature.doctrine}</p></aside>
      <p class="world-relation-note">この推定域は原案資料です。生成世界の地図上には、生成時に配置されるまで表示しません。</p>
    </section>
    <p class="world-source-note">超規格外生物は種族・国家・通常の幻獣分類に含めません。観測済みの事実と推定を分け、討伐可能な戦力値には換算しません。</p>
  `;
}

function statisticDistribution(title, items) {
  if (!items) {
    return `<article class="statistics-distribution is-unavailable"><header><h3>${title}</h3><small>未調査</small></header><p>信頼できる構成比がありません。</p></article>`;
  }
  const rows = items.map((item) => `
    <div class="statistics-share-row">
      <span><b>${item.label}</b><em>${item.share}%</em></span>
      <i><u style="--share:${item.share}%"></u></i>
    </div>
  `).join("");
  return `<article class="statistics-distribution"><header><h3>${title}</h3><small>構成比</small></header>${rows}</article>`;
}

function renderWorldStatistics() {
  const { runtime, generatedState, playerNation } = getGeneratedWorldView(state);
  const activeNations = runtime.nations.nations.filter((nation) => !nation.dissolved);
  const requested = runtime.nationById.get(view.selectedGeneratedNationId);
  const selected = requested && !requested.dissolved ? requested : playerNation;
  view.selectedGeneratedNationId = selected.id;
  const summary = runtime.nations.summary;
  const objectCounts = summary.objectCounts ?? {};
  const frontierLabels = { mountain: "山稜", ridge: "丘陵・分水界", river: "河川沿い", wetland: "湿地帯", climate: "気候地形境界", artificial: "人為線" };
  const frontierTotal = Math.max(1, summary.borderSegmentCount);
  const frontierDistribution = Object.entries(summary.frontierTypeCounts ?? {}).map(([type, count]) => ({
    label: frontierLabels[type] ?? type,
    share: Math.round(count / frontierTotal * 100),
  })).sort((left, right) => right.share - left.share);
  const rankCards = [...activeNations].sort((left, right) => right.populationPotential - left.populationPotential).map((nation, index) => `
    <button type="button" class="statistics-rank-card ${nation.id === selected.id ? "is-active" : ""}" data-generated-statistics-nation="${nation.id}">
      <span>${index + 1}</span><strong>${escapeHtml(nation.name)}</strong>
      <small>国家Lv.${nation.nationLevel ?? "—"} · ${nation.regionCount}地方 · 村${nation.initialVillageCount ?? 0}/${nation.initialVillageLimit ?? "—"}</small><b>${formatValue(nation.populationPotential)}</b>
    </button>
  `).join("");

  return `
    <section class="generated-world-overview">
      <div><small>世界生成用地形</small><strong>${runtime.terrain.width} × ${runtime.terrain.height} · ${runtime.tiles.length.toLocaleString("ja-JP")}区画</strong></div>
      <div><small>地域と国家</small><strong>${summary.regionCount}地域 · ${summary.nationCount}か国</strong></div>
      <div><small>集落・街道網</small><strong>都市${objectCounts.city ?? 0} · 町${objectCounts.town ?? 0} · 村${objectCounts.village ?? 0}（初期上限${summary.initialVillageLimit ?? "—"}） · 街道${summary.roadCount ?? 0}</strong></div>
      <div><small>河川・陸地率</small><strong>${runtime.terrain.summary.riverCount}水系 · ${Math.round(runtime.terrain.summary.landRatio * 100)}%</strong></div>
    </section>
    <section class="generated-world-controls">
      <div><span>この人物の世界シード</span><strong>${escapeHtml(generatedState.seed)}</strong></div>
      <small>生成解像度、件数、比率、シードなどの監査情報は統計画面だけに表示します。</small>
    </section>
    <section class="statistics-overview">
      <div><small>自然国境</small><strong>${Math.round(summary.naturalBorderShare * 100)}%</strong></div>
      <div><small>人為国境</small><strong>${Math.round(summary.artificialBorderShare * 100)}%</strong></div>
      <div><small>国境線総数</small><strong>${summary.borderSegmentCount}</strong></div>
    </section>
    <p class="statistics-basis-note"><b>自然国境線優先</b>河川沿い、山稜・分水界、湿地帯、気候地形境界を領土拡張の障壁として先に採用します。複数の自然障壁重みを比較し、この世界では係数${summary.nationCount ? runtime.nations.config.naturalFrontierWeight : "—"}の国割りを採用して人為線比率を最小化しています。</p>
    ${statisticDistribution("国境線の根拠", frontierDistribution)}
    <section class="statistics-dossier" style="--nation-color:${selected.color}">
      <header class="statistics-dossier-heading">
        <span class="world-sigil large">${escapeHtml(selected.shortName.slice(0, 1))}</span>
        <div><small>生成国家統計 · 国家レベル ${selected.nationLevel ?? "—"} · ${escapeHtml(selected.peopleName)}</small><h2>${escapeHtml(selected.name)}</h2><b>${selected.regionCount}地方 · ${selected.tileCount}区画 · 初期村${selected.initialVillageCount ?? 0}/${selected.initialVillageLimit ?? "—"}</b></div>
      </header>
      <div class="statistics-metrics">
        <div><small>人口力</small><strong>${formatValue(selected.populationPotential)}</strong></div>
        <div><small>世界陸地比</small><strong>${Math.round(selected.areaShare * 100)}%</strong></div>
        <div><small>平均肥沃度</small><strong>${selected.meanFertility}</strong></div>
        <div><small>沿岸比率</small><strong>${Math.round(selected.coastalShare * 100)}%</strong></div>
      </div>
      <p class="statistics-profile-note">食料力 ${formatValue(selected.yields.food, 1)} · 生産力 ${formatValue(selected.yields.production, 1)} · 交易力 ${formatValue(selected.yields.commerce, 1)}。世界全図と地方図はこの同じ生成国家データを参照します。</p>
    </section>
    <section class="panel-section">
      <div class="section-heading"><h2>国家別人口力</h2><small>クリックで統計と地図を切替</small></div>
      <div class="statistics-ranking">${rankCards}</div>
    </section>
  `;
}

function renderWorldPanel() {
  const sourceArchiveMode = view.atlasMode === "peoples" || view.atlasMode === "creatures";
  const summary = sourceArchiveMode ? getWorldCatalogSummary() : null;
  const headings = {
    generated: ["PROCEDURAL REGIONAL WORLD", "生成世界・探索", "地方単位で移動し、同じ生成地図上で探索"],
    geopolitics: ["KNOWN WORLD TIMELINE", "世界情勢", "噂と現場で知り得た世界の動きを時系列に記録"],
    nations: ["GENERATED NATIONS", "生成国家", "地方の集合として成立した国家を世界全図と照合"],
    statistics: ["GENERATED WORLD STATISTICS", "世界統計", "生成条件、自然国境、国家指標を監査"],
    peoples: ["SOURCE ARCHIVE", "原案種族", "生成世界とは分離した設定原案資料"],
    creatures: ["SOURCE ARCHIVE", "原案巨獣", "生成世界とは分離した観測原案資料"],
  };
  const heading = headings[view.atlasMode] ?? headings.generated;
  const content = view.atlasMode === "generated"
    ? renderGeneratedWorldPanel()
    : view.atlasMode === "geopolitics"
      ? renderWorldGeopolitics()
    : view.atlasMode === "peoples"
    ? renderWorldPeoples()
    : view.atlasMode === "creatures"
      ? renderWorldCreatures()
      : view.atlasMode === "statistics" ? renderWorldStatistics() : renderWorldNations();
  elements.leftPanel.innerHTML = `
    <header class="panel-heading world-heading">
      <span>${heading[0]}</span>
      <h1>${heading[1]}</h1>
      <p>${heading[2]}</p>
      ${worldModeSwitch()}
    </header>
    <div class="panel-body">
      ${sourceArchiveMode ? `<section class="panel-section world-summary">
        <div class="realm-facts">
          <div><small>異種族</small><strong>${summary.otherRaces}</strong></div>
          <div><small>国家</small><strong>${summary.nations}</strong></div>
          <div><small>神国保護領</small><strong>${summary.protectorates}</strong></div>
          <div><small>詳細不明国</small><strong>${summary.unknownNations}</strong></div>
          <div><small>超規格外生物</small><strong>${summary.extremeCreatures}</strong></div>
        </div>
      </section>` : ""}
      ${content}
    </div>
  `;
}

function renderDiplomacyPanel() {
  const metrics = deriveMetrics(state);
  const balance = getContinentalBalance(state);
  const campaign = getCampaignStatus(state);
  const aftermathDecision = getAftermathDecisionStatus(state);
  const dispatches = getForeignDispatches(state, 12);
  const selected = getCountryReport(state, view.selectedCountryId) ?? getCountryReport(state, "valka");
  const delegate = getDiplomaticDelegate(selected.id);
  const isValka = selected.id === "valka";
  const borderStatus = isValka ? getBorderNegotiationStatus(state) : null;
  const report = isValka ? getWarCouncilReport(state, "transit") : null;
  const foundation = getGreatPowerFoundation(selected.id);
  const countryCards = balance.countries.filter((country) => country.id !== WORLD.nation.id).map((country) => `
    <button type="button" class="world-nation-card ${country.id === selected.id ? "is-active" : ""}" data-diplomacy-country="${country.id}">
      <span class="world-sigil" style="--nation-color:${country.color}">${country.name.slice(0, 1)}</span>
      <span><strong>${country.name}</strong><small>${country.rank ? `${country.rank} · ` : ""}${country.agenda ?? country.stance} · ${country.intent ?? "情勢観測"}</small></span>
      <em class="${country.relation < 0 ? "knowledge-unknown" : "knowledge-defined"}">${country.relation >= 0 ? "+" : ""}${country.relation}</em>
    </button>`).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading">
      <span>DIPLOMACY</span>
      <h1>大陸外交</h1>
      <p>エルドリア世界圏 · 諸国の関係と介入可能性</p>
    </header>
    <div class="panel-body">
      <section class="panel-section">
        ${delegate ? `
        <div class="diplomatic-audience">
          <img src="${delegate.representative.image}" alt="${selected.name}の${delegate.people.name}女性代表">
          <div class="diplomatic-audience-copy">
            <span>${delegate.certainty} · ${delegate.representative.apparentAge}</span>
            <strong>${delegate.name ?? `${delegate.people.name}代表`}</strong>
            <small>${delegate.office ?? delegate.representative.role} · ${delegate.representative.expression}</small>
          </div>
        </div>
        <p class="diplomatic-cast-note">${delegate.note}</p>
        ` : ""}
        <div class="diplomatic-target">
          <div class="mini-shield" style="background:${selected.color}">${selected.name.slice(0, 1)}</div><div><strong>${selected.name}</strong><small>${selected.capital} · ${selected.agenda ?? selected.stance}<br>今月の意図：${selected.intent ?? "情勢観測"}</small></div><b class="relation-value">${selected.relation >= 0 ? "+" : ""}${selected.relation}</b>
        </div>
        <div class="metric-stack" style="margin-top:12px">
          ${meter("推定組織", selected.organization)}
          ${meter("大陸機動", selected.mobility)}
          ${meter("第三国介入", metrics.interventionRisk)}
        </div>
      </section>
      ${foundation ? `
      <section class="panel-section great-power-foundation">
        <div class="section-heading"><h2>巨大国家の成立基盤</h2><small>${foundation.type} · 成立指数 ${foundation.score}</small></div>
        <div class="metric-stack">
          ${foundation.factors.map((factor) => meter(factor.label, factor.value)).join("")}
        </div>
        <p class="adviser-note"><strong>環境</strong><br>${foundation.environment}</p>
        <p class="adviser-note"><strong>統合方式</strong><br>${foundation.integration}</p>
        <p class="adviser-note"><strong>構造的限界 · ${foundation.limitingFactor.label}</strong><br>${foundation.limit}</p>
      </section>
      ` : ""}
      <section class="panel-section"><div class="section-heading"><h2>世界諸国</h2><small>${balance.countries.length - 1}か国</small></div><div class="world-nation-list">${countryCards}</div></section>
      ${isValka ? `
      <section class="panel-section border-negotiation-status">
        <div class="section-heading"><h2>灰冠峠の交渉</h2><small class="border-status-badge ${borderStatus.transitSecured ? "is-secured" : borderStatus.talksCompleted ? "is-pending" : ""}">${borderStatus.status}</small></div>
        <div class="border-progress-track" role="progressbar" aria-label="国境会談の工程" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${borderStatus.meetingProgress}"><i style="width:${borderStatus.meetingProgress}%"></i></div>
        <div class="border-progress-facts">
          <span><small>受諾見込み</small><strong>${borderStatus.acceptance}</strong></span>
          <span><small>交渉力</small><strong>${borderStatus.leverage}</strong></span>
          <span><small>期限</small><strong>${borderStatus.deadlineRemaining === null ? "未設定" : `${Math.max(0, borderStatus.deadlineRemaining)}か月`}</strong></span>
          <span><small>仲介国</small><strong>${borderStatus.mediator ? WORLD.countries[borderStatus.mediator]?.name ?? borderStatus.mediator : "なし"}</strong></span>
          <span><small>交渉工程</small><strong>${borderStatus.hasBargainingMove ? "最終案" : borderStatus.talksCompleted ? "条件交換" : "会談準備"}</strong></span>
          <span><small>実行した一手</small><strong>${borderStatus.bargainingLabel}</strong></span>
        </div>
        <p class="adviser-note">${borderStatus.description}</p>
        ${borderStatus.concessions.length ? `<p class="diplomatic-concessions"><strong>提示済み譲歩</strong>${borderStatus.concessions.join(" / ")}</p>` : ""}
        ${borderStatus.talksCompleted && !borderStatus.transitSecured ? `
          <div class="section-heading negotiation-heading"><h2>外交決着案</h2><small>結果は第三幕へ持ち越される</small></div>
          <div class="negotiation-offer-list">${borderStatus.offers.map((offer) => `<button type="button" data-border-settlement="${offer.id}" ${offer.allowed ? "" : "disabled"}><strong>${offer.name}</strong><span>${offer.description}</span><small>${offer.reason}</small></button>`).join("")}</div>
        ` : ""}
      </section>
      ${campaign.actId === "aftermath" ? `
      <section class="panel-section aftermath-policy-panel">
        <div class="section-heading"><h2>第三幕・定着方針</h2><small>${campaign.aftermathPolicy ? `${campaign.acts[2].progress} / ${campaign.acts[2].total}か月` : "一つを選択"}</small></div>
        <div class="aftermath-policy-list">${Object.values(AFTERMATH_POLICIES).map((policy) => `<button type="button" data-aftermath-policy="${policy.id}" class="${campaign.aftermathPolicy === policy.id ? "is-active" : ""}" ${campaign.aftermathPolicy ? "disabled" : ""}><strong>${policy.name}</strong><span>${policy.description}</span><small>定着 ${policy.months}か月</small></button>`).join("")}</div>
        ${aftermathDecision ? `<article class="aftermath-decision-card"><header><div><small>今月の必須裁定</small><h3>${aftermathDecision.title}</h3></div><b>${aftermathDecision.stage + 1} / ${AFTERMATH_POLICIES[aftermathDecision.policyId].months}</b></header><p>${aftermathDecision.prompt}</p><div class="aftermath-choice-list">${aftermathDecision.choices.map((choice) => `<button type="button" data-aftermath-choice="${choice.id}"><strong>${choice.name}</strong><span>${choice.description}</span><small>${choice.impact}</small></button>`).join("")}</div><em>いずれかを決めるまで月を終えられません。</em></article>` : campaign.aftermathPolicy && !campaign.ending ? `<p class="aftermath-ready-note">今月の裁定は完了しました。月末に定着が進み、次の課題が開きます。</p>` : ""}
        ${(state.campaign.aftermathDecisions ?? []).length ? `<details class="aftermath-records"><summary>完了した裁定 ${(state.campaign.aftermathDecisions ?? []).length}件</summary>${state.campaign.aftermathDecisions.map((item) => `<p><strong>${item.title}</strong><span>${item.choice}</span><small>${item.impact}</small></p>`).join("")}</details>` : ""}
        ${campaign.ending ? `<p class="campaign-ending-card"><strong>${campaign.ending.name}</strong><span>${campaign.ending.description}</span></p>` : ""}
      </section>` : ""}
      <section class="panel-section">
        <div class="section-heading"><h2>交渉手段</h2><small>統治力2・担当人物が必要</small></div>
        <div class="spending-shortcut-list">${spendingShortcut("foreign_aid", "使節・援助・対外公示の具体策を選ぶ")}${spendingShortcut("economic_investment", "交易協定への投資を選ぶ")}</div>
      </section>
      <section class="panel-section">
        <div class="section-heading"><h2>軍師見解</h2><small>確度 ${report.confidence}%</small></div>
        <p class="adviser-note"><strong>${report.posture}（${signed(report.score)}）</strong><br>${report.summary}<br>重点：${report.center.label}<br>周辺最強国：${balance.strongest.name}</p>
        <button class="war-entry-button" type="button" data-open-war ${state.war ? "disabled" : ""}>⚔ 戦争という選択肢を検討</button>
      </section>
      ` : `<section class="panel-section"><div class="section-heading"><h2>国家評定</h2><small>外交台帳</small></div><p class="adviser-note"><strong>${selected.stance}</strong><br>推定兵力 ${formatValue(selected.army)}。この国の関係・敵意・介入意志は、ヴァルカ戦の第三国介入リスクへ反映されます。</p></section>`}
      <section class="panel-section foreign-dispatch-panel">
        <div class="section-heading"><h2>世界公報</h2><small>九か国が毎月更新</small></div>
        <div class="foreign-dispatch-list">${dispatches.length ? dispatches.slice(0, 6).map((dispatch) => `<article><header><strong>${dispatch.countryName}</strong><b>${dispatch.intent}</b></header><span>${dispatch.agenda}</span><small>${dispatch.effect}</small></article>`).join("") : '<p class="empty-candidates">月末を迎えると各国の意図が公報へ届きます。</p>'}</div>
      </section>
    </div>
  `;
}

function warPlanButton(id, name, detail) {
  const active = state.war?.plan === id;
  return `<button class="war-plan ${active ? "is-active" : ""}" type="button" data-war-plan="${id}" aria-pressed="${active}"><span class="selection-state">${active ? "選択中" : "選択"}</span><strong>${name}</strong><small>${detail}</small></button>`;
}

function formationButtons() {
  const current = state.forces.frontier_guard.formation;
  return Object.values(FORMATIONS).map((formation) => {
    const active = formation.id === current;
    return `
    <button type="button" class="formation-card ${active ? "is-active" : ""}" data-formation="${formation.id}" aria-pressed="${active}">
      <span class="selection-state">${active ? "選択中" : "選択"}</span><strong>${formation.name}</strong><small>${formation.description}</small>
    </button>
  `;
  }).join("");
}

function occupationPolicyButtons(occupation) {
  return Object.values(OCCUPATION_POLICIES).map((policy) => `
    <button type="button" class="war-plan ${occupation.policy === policy.id ? "is-active" : ""}" data-occupation-policy="${policy.id}" data-occupation-id="${occupation.id}">
      <strong>${policy.name}</strong><small>${policy.description}</small>
    </button>
  `).join("");
}

function renderOccupationGovernance() {
  const occupations = (state.occupations ?? []).filter((occupation) => occupation.status === "occupied");
  if (!occupations.length) return "";
  return occupations.map((occupation) => {
    const policy = OCCUPATION_POLICIES[occupation.policy];
    const last = occupation.lastReport;
    return `
      <section class="panel-section occupation-governance">
        <div class="section-heading"><h2>${occupation.name}</h2><small>占領 ${occupation.months}か月 · ${policy.name}</small></div>
        <div class="metric-stack">
          ${meter("統制", occupation.control)}${meter("抵抗", occupation.resistance)}
          ${meter("制度統合", occupation.integration)}${meter("文化同化", occupation.assimilation)}
          ${meter("インフラ", occupation.infrastructure)}
        </div>
        <div class="war-consequence-grid">
          <span><small>駐屯兵</small><strong>${formatValue(occupation.garrison)} / ${formatValue(occupation.requiredGarrison)}</strong></span>
          <span><small>避難民</small><strong>${formatValue(occupation.displaced)}</strong></span>
          <span><small>住民被害</small><strong>${formatValue(occupation.civilianLosses)}</strong></span>
        </div>
        ${last ? `<p class="adviser-note"><strong>前月の統治</strong><br>${last.supplied ? "駐屯費・補給を充足" : "駐屯費または補給が不足"} · 抵抗 ${signed(last.resistanceDelta, 1)} · 統合 ${signed(last.integrationDelta, 1)} · インフラ ${signed(last.infrastructureDelta, 1)}</p>` : ""}
        <div class="garrison-controls">
          <button type="button" data-occupation-garrison="${occupation.id}" data-garrison-value="${Math.max(100, occupation.garrison - 100)}">駐屯 -100</button>
          <button type="button" data-occupation-garrison="${occupation.id}" data-garrison-value="${occupation.garrison + 100}">駐屯 +100</button>
        </div>
        <div class="section-heading occupation-policy-heading"><h2>統治政策</h2><small>月次に反映</small></div>
        <div class="war-plan-list occupation-policy-list">${occupationPolicyButtons(occupation)}</div>
        <button class="release-occupation-button" type="button" data-release-occupation="${occupation.id}">自治政府へ移管して撤兵</button>
      </section>
    `;
  }).join("");
}

function renderMilitaryPanel() {
  if (state.scenarioMode === "generated") {
    const knownWars = getKnownGeneratedWorldWarView(state);
    elements.leftPanel.innerHTML = `<header class="panel-heading"><span>GENERATED WAR COMMAND</span><h1>生成世界軍議</h1><p>実在する生成地方・国境・国家だけを戦域として使用</p></header><div class="panel-body">${renderGeneratedCampaignBoard()}<section class="panel-section"><div class="section-heading"><h2>既知の戦争</h2><small>${knownWars.activeWars.length}件</small></div>${knownWars.activeWars.map((war) => `<article class="adviser-note"><strong>${escapeHtml(war.attackerName)} 対 ${escapeHtml(war.defenderName)}</strong><br>${war.fronts.length}正面 · ${escapeHtml(war.targetRegionName)}${war.requiresPlayerDecision ? `<div><button type="button" data-generated-war-response="mobilize" data-generated-war-id="${war.id}">動員して戦う</button><button type="button" data-generated-war-response="negotiate" data-generated-war-id="${war.id}">停戦交渉</button>${war.attackerNationId === state.generatedWorld.playerNationId ? `<button type="button" data-generated-war-response="withdraw" data-generated-war-id="${war.id}">撤兵</button>` : ""}</div>` : ""}</article>`).join("") || "<p>現在把握している戦争はありません。</p>"}</section></div>`;
    return;
  }
  const metrics = deriveMetrics(state);
  const military = getMilitarySummary(state);
  const ledger = deriveRealmLedger(state);
  const enemyCommander = getEnemyCommander(state);
  if (state.war) {
    const objective = WAR_OBJECTIVES[state.war.objectiveId];
    const peace = state.war.peace;
    const stage = getWarStage(state.war);
    const planOptions = getWarPlanOptions(state.war.side);
    const peaceOptions = getPeaceOptions(state);
    const theater = state.war.theater;
    const activeRegion = getWarRegion(theater);
    const theaterPhase = theater?.phase === "deployment" ? "初期展開" : "作戦進行";
    elements.leftPanel.innerHTML = `
      <header class="panel-heading"><span>WAR THEATRE / ${stage.name}</span><h1>${state.war.side === "defender" ? "東境州防衛戦" : "灰冠峠戦役"}</h1><p>目的「${objective.name}」 · 軍団長 ${military.commander.name}</p></header>
      <div class="panel-body">
        <button class="open-war-board-button" type="button" data-war-map-view="theater"><span>REGIONAL BOARD · ROUND ${theater?.round ?? 0}</span><strong>${activeRegion?.name ?? "戦域盤"}</strong><small>${theaterPhase} · 3地域 / 105ヘクスを確認</small></button>
        <section class="war-status-block">
          <div class="war-score"><span>戦勝点</span><strong>${signed(state.war.score, 1)}</strong></div>
          <div class="metric-stack">${meter("目的達成", state.war.objectiveProgress)}${meter("組織力", military.organization)}${meter("軍需充足", military.supply)}${meter("戦争疲弊", state.warExhaustion)}</div>
        </section>
        <section class="war-consequence-grid">
          <span><small>自軍損失</small><strong>${formatValue(state.war.losses)}</strong></span>
          <span><small>敵軍損失</small><strong>${formatValue(state.war.enemyLosses)}</strong></span>
          <span><small>${state.war.side === "defender" ? "国内破壊" : "敵地破壊"}</small><strong>${formatValue(state.war.side === "defender" ? state.war.homeDamage : state.war.devastation, 1)}</strong></span>
          <span><small>避難民</small><strong>${formatValue(state.war.displaced)}</strong></span>
          <span><small>住民被害</small><strong>${formatValue(state.war.civilianLosses)}</strong></span>
        </section>
        ${enemyCommanderCard(enemyCommander, state.war.lastEnemyAction)}
        <section class="panel-section"><div class="section-heading"><h2>作戦方針</h2><small>現在：${WAR_PLANS[state.war.plan].name}</small></div><div class="war-plan-list">
          ${planOptions.map((plan) => warPlanButton(plan.id, plan.name, plan.description)).join("")}
        </div></section>
        <section class="panel-section"><div class="section-heading"><h2>陣形</h2><small>${FORMATIONS[military.force.formation].name}</small></div><div class="formation-list">${formationButtons()}</div></section>
        <section class="panel-section">
          ${peace ? `<p class="adviser-note"><strong>攻勢限界 ${peace.culminatingRisk}%</strong><br>${peace.recommendation}</p>` : ""}
          <div class="peace-option-list">${peaceOptions.map((option) => `<button class="peace-button" type="button" data-peace-settlement="${option.id}" ${option.allowed ? "" : "disabled"}><strong>${option.name}</strong><small>${option.reason}</small></button>`).join("")}</div>
        </section>
      </div>
    `;
    return;
  }
  elements.leftPanel.innerHTML = `
    <header class="panel-heading"><span>ARMY GROUP</span><h1>${military.force.name}</h1><p>${WORLD.provinces[military.force.baseCityId].name} · ${FORMATIONS[military.force.formation].name}</p></header>
    <div class="panel-body">
      <section class="panel-section">
        <div class="force-commanders">
          <button type="button" data-force-role="commanderId"><small>軍団長</small><strong>${military.commander.name}</strong><span>統率 ${military.commander.stats.leadership} · 武力 ${military.commander.stats.war}</span></button>
          <button type="button" data-force-role="deputyId"><small>副将</small><strong>${military.deputy.name}</strong><span>統率 ${military.deputy.stats.leadership} · 知力 ${military.deputy.stats.intelligence}</span></button>
        </div>
        <div class="realm-facts" style="margin-top:10px">
          <div><small>駐屯兵 / 収容</small><strong>${formatValue(ledger.troops)} / ${formatValue(ledger.troopCapacity)}</strong></div><div><small>輜重隊 / 大陸機動</small><strong>${military.supportColumns}隊 / ${military.mobility}</strong></div>
          <div><small>組織力</small><strong>${military.organization}</strong></div><div><small>軍需充足</small><strong>${military.supply}</strong></div>
        </div>
        <p class="adviser-note">軍団長と副将の相性 ${Math.round(military.mutualBond)}。統率・武力・知力・功績・相性に、防備と駐屯容量を加えて組織力を算出。</p>
      </section>
      <section class="panel-section"><div class="section-heading"><h2>想定敵将</h2><small>主敵ヴァルカ</small></div>${enemyCommanderCard(enemyCommander)}</section>
      <section class="panel-section"><div class="section-heading"><h2>陣形</h2><small>指揮官能力と組合せて計算</small></div><div class="formation-list">${formationButtons()}</div></section>
      <section class="panel-section"><div class="section-heading"><h2>軍事支出</h2><small>国家支出から選択</small></div><div class="spending-shortcut-list">${spendingShortcut("military_affairs", "訓練・動員・軍務人材の具体策を選ぶ")}${spendingShortcut("research_development", "測量と軍事情報の具体策を選ぶ")}</div></section>
      <section class="panel-section"><div class="metric-stack">${meter("加重練度", military.training)}${meter("大陸機動", military.mobility)}${meter("第三国介入", metrics.interventionRisk)}</div></section>
      ${renderOccupationGovernance()}
    </div>
  `;
}

function allegianceLabel(value) {
  return ({ serving: "配下", free: "在野", foreign: "国外", retinue: "友軍" })[value] ?? value;
}

function assignmentLabel(officer) {
  if (!officer.assignment) return "待機";
  const task = state.commandQueue.find((item) => item.id === officer.assignment);
  return task ? `${COMMANDS[task.commandId].name} · 残${task.remainingTurns}か月` : "任務中";
}

function characterCreedCard(creed) {
  if (!creed) return "";
  const doctrines = creed.identity.doctrines.slice(0, 3).map((text) => `<li>${escapeHtml(text)}</li>`).join("");
  return `<details class="character-creed" ${creed.identity.formed ? "" : "data-unformed"}>
    <summary><span><small>信条</small><strong>${escapeHtml(creed.identity.name)}</strong></span><b>${creed.identity.majorAxes.length ? creed.identity.majorAxes.map((axis) => escapeHtml(axis.text)).join(" · ") : "形成途上"}</b></summary>
    <div class="character-creed-detail"><p>${escapeHtml(creed.identity.shortDescription)}</p><div>${creedAxisSummary(creed, 7, true)}</div>${doctrines ? `<ol>${doctrines}</ol>` : ""}</div>
  </details>`;
}

function playerCharacterDefinition() {
  const player = state.player;
  if (!player) return null;
  const stage = getCareerStage(state);
  return createCharacterDefinition({
    id: player.id,
    name: player.name,
    raceId: player.raceId,
    portrait: player.name.slice(0, 1),
    role: stage.name,
    policy: player.specialty,
    biography: {
      origin: player.origin,
      occupation: stage.name,
      specialty: player.specialty,
      affiliation: player.affiliation.liegeName,
      goal: stage.description,
    },
    gameplay: {
      role: stage.name,
      titles: [player.title],
      policy: player.specialty,
      recruitable: false,
      commander: ["commander", "castellan", "lord", "multi_lord", "governor", "duke", "regent", "independent_ruler", "centralized_ruler"].includes(player.stage),
    },
    metadata: { source: "state.player", tags: ["主人公", player.stage] },
  });
}

function readableBonds(bonds = {}) {
  return Object.fromEntries(Object.entries(bonds).map(([characterId, value]) => [WORLD.characters[characterId]?.name ?? characterId, value]));
}

function characterCodexEntries() {
  const entries = [];
  const playerDefinition = playerCharacterDefinition();
  if (playerDefinition) {
    const player = state.player;
    entries.push({
      category: "主人公",
      definition: playerDefinition,
      current: {
        allegiance: player.affiliation.liegeName ?? "無所属",
        rank: player.title,
        location: WORLD.provinces[player.locationId]?.name ?? player.locationId,
        merit: player.metrics.martialMerit + player.metrics.civilMerit,
        bonds: readableBonds(Object.fromEntries((player.householdRetainers ?? []).map((id) => [id, "家臣"]))),
        assignment: "本人行動",
      },
    });
  }
  Object.keys(state.officers ?? {}).forEach((officerId) => {
    const officer = getOfficerReport(state, officerId);
    if (!officer) return;
    entries.push({
      category: officer.metadata?.characterKind === "unique" ? `ユニーク人物 · ${allegianceLabel(officer.allegiance)}` : allegianceLabel(officer.allegiance),
      definition: officer,
      current: {
        allegiance: allegianceLabel(officer.allegiance),
        rank: officer.rank,
        location: WORLD.provinces[officer.location]?.name ?? officer.location,
        loyalty: officer.loyalty,
        stamina: officer.stamina,
        merit: officer.merit,
        assignment: assignmentLabel(officer),
        bonds: readableBonds(officer.bonds),
      },
    });
  });
  Object.values(UNIQUE_CHARACTERS).forEach((character) => {
    if (state.officers?.[character.id]) return;
    const memberId = character.adventure?.memberId;
    const member = state.player?.villageLife?.party?.find((entry) => entry.id === memberId)
      ?? state.adventure?.party?.find((entry) => entry.id === memberId)
      ?? null;
    let location = "各地の酒場を巡回";
    if (member) {
      try { location = getGeneratedWorldView(state).expeditionRegion?.name ?? "探索隊同行中"; }
      catch { location = "探索隊同行中"; }
    }
    entries.push({
      category: "固有人物",
      definition: character,
      current: {
        allegiance: member ? "同行" : "在野",
        rank: member ? `探索隊・${character.adventure.role}` : `在野・${character.gameplay.role}`,
        location,
        stamina: member?.alive === false ? 0 : 100,
        assignment: member
          ? `固有能力「${character.adventure.passiveName}」— ${character.adventure.passiveDescription}`
          : "酒場で未踏地へ向かう同行者を探している",
        bonds: {},
      },
    });
  });
  const enemyCommander = getEnemyCommander(state, "valka");
  if (enemyCommander) {
    entries.push({
      category: "敵将",
      definition: enemyCommander,
      current: {
        allegiance: enemyCommander.country?.name ?? "ヴァルカ公国",
        rank: enemyCommander.role,
        location: "灰冠峠方面",
        assignment: enemyCommander.doctrine,
      },
    });
  }
  return entries;
}

function characterTemplateGuide() {
  const sections = CHARACTER_TEMPLATE_SECTIONS.map((section) => `
    <section><header><strong>${escapeHtml(section.label)}</strong><small>${section.fields.length}項目</small></header><p>${escapeHtml(section.description)}</p><div>${section.fields.map((field) => `<span>${escapeHtml(field.label)}</span>`).join("")}</div></section>`).join("");
  return `<details class="character-template-guide"><summary><span><small>CHARACTER TEMPLATE</small><strong>キャラクター構成項目一覧</strong></span><b>${CHARACTER_TEMPLATE_FIELD_COUNT}項目</b></summary><div class="character-template-section-list">${sections}</div></details>`;
}

function characterCodexCard(entry, index) {
  const character = entry.definition;
  const sections = createCharacterCodexSections(character, entry.current);
  const configured = sections.reduce((sum, section) => sum + section.fields.filter((field) => field.configured).length, 0);
  const detailSections = sections.map((section) => `
    <section class="character-codex-section is-${section.id}">
      <header><div><strong>${escapeHtml(section.label)}</strong><small>${escapeHtml(section.description)}</small></div><b>${section.fields.filter((field) => field.configured).length}/${section.fields.length}</b></header>
      <dl>${section.fields.map((field) => `<div class="${field.configured ? "" : "is-unset"}"><dt>${escapeHtml(field.label)}${field.current ? "<i>現在</i>" : ""}</dt><dd>${escapeHtml(field.value)}</dd></div>`).join("")}</dl>
    </section>`).join("");
  return `<details class="character-codex-entry ${character.metadata?.characterKind === "unique" ? "is-unique-character" : ""}" ${index === 0 ? "open" : ""}>
    <summary>${officerSeal(character, "large")}<span><small>${escapeHtml(entry.category)} · ${escapeHtml(character.identity.raceId === "human" ? "人間" : character.identity.raceId)}</small><strong>${escapeHtml(character.name)}</strong><em>${escapeHtml(character.gameplay.role ?? "役割未設定")}</em></span><b>${configured}/${CHARACTER_TEMPLATE_FIELD_COUNT}</b></summary>
    <div class="character-codex-detail">${detailSections}</div>
  </details>`;
}

function enemyCodexCard(creature, index) {
  const codex = creature.enemyCodex;
  const current = creature.id === "leviathan" ? getLeviathanStatus(state) : null;
  const knownCapabilities = codex.knownCapabilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const unknowns = codex.unknowns.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const supplementalNotes = codex.supplementalNotes.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<details class="enemy-codex-entry" ${index === 0 ? "open" : ""}>
    <summary><i aria-hidden="true">EX</i><span><small>${escapeHtml(codex.category)}</small><strong>${escapeHtml(creature.name)}</strong><em>${escapeHtml(creature.epithet)}</em></span><b>${escapeHtml(codex.battleStatus)}</b></summary>
    <div class="enemy-codex-detail">
      <figure class="enemy-codex-art"><img src="${escapeHtml(creature.image)}" alt="${escapeHtml(creature.name)}の浮上背部を描いた観測復元画" loading="lazy"><figcaption>OBSERVATION RECONSTRUCTION · 観測復元画</figcaption></figure>
      <div class="enemy-codex-metrics">
        <span><small>危険等級</small><strong>${escapeHtml(codex.dangerRank)}</strong></span>
        <span><small>戦闘区分</small><strong>${escapeHtml(codex.battleStatus)}</strong></span>
        <span><small>推定規模</small><strong>${escapeHtml(creature.estimatedLength)}</strong></span>
        <span><small>所属</small><strong>${escapeHtml(codex.affiliation)}</strong></span>
      </div>
      <p class="enemy-codex-description">${escapeHtml(creature.description)}</p>
      <dl class="enemy-codex-facts">
        <div><dt>敵性判定</dt><dd>${escapeHtml(codex.hostility)}</dd></div>
        <div><dt>知性</dt><dd>${escapeHtml(codex.intelligence)}</dd></div>
        <div><dt>遭遇規則</dt><dd>${escapeHtml(codex.encounterRule)}</dd></div>
        <div><dt>戦利品</dt><dd>${escapeHtml(codex.rewards)}</dd></div>
      </dl>
      <div class="enemy-codex-notes">
        <article><h3>確認済み能力</h3><ul>${knownCapabilities}</ul></article>
        <article class="is-unknown"><h3>未解明事項</h3><ul>${unknowns}</ul></article>
        <article class="is-supplemental"><h3>補足記録</h3><ul>${supplementalNotes}</ul></article>
      </div>
      ${current ? `<section class="enemy-codex-current"><header><div><small>CURRENT MIGRATION STATUS</small><strong>現在の回遊状況：${escapeHtml(current.name)}</strong></div><b>情報精度 ${current.informationAccuracy}%</b></header><p>${escapeHtml(current.estimatedPosition)} · 航路 ${current.routesClosed ? "閉鎖" : "監視"} · 港湾避難 ${current.evacuationRequired ? "必要" : "待機"}</p></section>` : ""}
      <aside class="enemy-codex-protocol"><small>CONTINENTAL PROTOCOL</small><strong>対処原則</strong><p>${escapeHtml(creature.doctrine)}</p></aside>
    </div>
  </details>`;
}

function renderPeoplePanel() {
  const codexEntries = characterCodexEntries();
  const codex = codexEntries.map(characterCodexCard).join("");
  const enemyCodexEntries = getEnemyCodexEntries();
  const enemyCodex = enemyCodexEntries.map(enemyCodexCard).join("");
  const playerCreed = getPlayerCreedReport(state);
  const cards = Object.keys(state.officers).map((officerId) => {
    const officer = getOfficerReport(state, officerId);
    const creed = getOfficerCreedReport(state, officerId);
    const politics = getOfficerPoliticalReport(state, officerId);
    const strongestBond = Object.entries(officer.bonds ?? {}).sort((left, right) => right[1] - left[1])[0];
    const unique = officer.metadata?.characterKind === "unique";
    return `
      <article class="officer-card ${officer.allegiance !== "serving" ? "is-outsider" : ""} ${unique ? "is-unique-character" : ""}">
        <header>${officerSeal(officer)}<div>${unique ? '<i class="unique-character-badge">UNIQUE</i>' : ""}<strong>${officer.name}</strong><small>${officer.rank} · ${WORLD.provinces[officer.location].name}</small></div><b>${allegianceLabel(officer.allegiance)}</b></header>
        <div class="officer-stat-grid">${statCells(officer.stats)}</div>
        <div class="officer-state-line"><span>忠誠 ${officer.loyalty}</span><span>意欲 ${officer.stamina}</span><span>功績 ${officer.merit}</span>${politics ? `<span class="political-standing is-${politics.standing === "対立" ? "danger" : politics.standing === "要注意" ? "warning" : "stable"}">${politics.standing}</span>` : ""}</div>
        <p><strong>${officer.policy}</strong> · ${officer.traits.join(" / ")}<br>${assignmentLabel(officer)}</p>
        ${characterCreedCard(creed)}
        ${politics ? `<div class="officer-politics"><strong>${politics.faction} · ${politics.agenda}</strong><span>出自：${politics.origin}</span><span>野心：${politics.ambition}</span><span class="officer-demand">要求：${politics.demand}</span><small>政治力 ${politics.politicalCapital} · 不満 ${politics.resentment}${strongestBond ? ` · 親密 ${WORLD.characters[strongestBond[0]]?.name ?? strongestBond[0]} ${strongestBond[1]}` : ""}</small><small>${politics.consequence}</small>${politics.activePromise ? `<p class="officer-promise"><strong>受諾済み</strong><span>${politics.activePromise.agenda}を支持する任務を残り${politics.responseCooldown}か月以内に完了</span></p>` : politics.canRespond ? `<div class="officer-demand-actions">${politics.responses.map((response) => `<button type="button" data-officer-demand-response="${response.id}" data-officer-id="${officerId}"><strong>${response.name}</strong><small>${response.impact}</small></button>`).join("")}</div>` : officer.allegiance === "serving" ? `<small class="officer-demand-cooldown">再回答まであと${politics.responseCooldown}か月</small>` : ""}${politics.latestReaction ? `<em>直近：${politics.latestReaction.title}</em>` : ""}</div>` : ""}
      </article>
    `;
  }).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading"><span>CHARACTER / ENEMY CODEX</span><h1>キャラクター辞典</h1><p>人物の固定設定、敵性存在の観測記録、ゲーム中に変化する現在状態を分けて参照</p></header>
    <div class="panel-body">
      <section class="panel-section player-creed-panel"><div class="section-heading"><h2>プレイヤーの信条</h2><small>選択と経験から形成</small></div>${characterCreedCard(playerCreed)}</section>
      <section class="panel-section enemy-codex"><div class="section-heading"><h2>敵キャラ辞典</h2><small>${enemyCodexEntries.length}体 · 敵性存在</small></div><p class="enemy-codex-intro">敵意の有無ではなく、接触時の危険とゲーム上の対処区分で登録しています。</p><div class="enemy-codex-list">${enemyCodex}</div></section>
      ${characterTemplateGuide()}
      <section class="panel-section character-codex"><div class="section-heading"><h2>登録人物</h2><small>${codexEntries.length}名</small></div><div class="character-codex-list">${codex}</div></section>
      <section class="panel-section"><div class="section-heading"><h2>官職・政治状態</h2><small>${Object.keys(state.officers).length}名</small></div><div class="officer-list">${cards}</div></section>
      <section class="panel-section"><div class="section-heading"><h2>人材に関する支出</h2><small>目的別に分類</small></div><div class="spending-shortcut-list">${spendingShortcut("research_development", "測量士を研究職へ登用する")}${spendingShortcut("military_affairs", "軍務人材を勧誘する")}${spendingShortcut("foreign_aid", "外交顧問を登用する")}</div></section>
    </div>
  `;
}

function renderCentralizationPanel() {
  const status = getCentralizationCampaignStatus(state);
  const selected = status.portfolio.systems.find((system) => system.id === view.selectedNationalReformSystem) ?? status.portfolio.systems[0];
  view.selectedNationalReformSystem = selected.id;
  const activeReform = selected.active[0] ?? null;
  const stageRail = status.stages.map((stage) => `
    <article class="central-stage is-${stage.status}">
      <i>${stage.status === "completed" ? "✓" : stage.number}</i>
      <span><strong>${stage.name}</strong><small>${stage.requiredReforms.join(" · ")}</small></span>
    </article>
  `).join("");
  const requirements = status.requirements.length
    ? status.requirements.map((requirement) => `<li class="${requirement.met ? "is-met" : ""}"><i>${requirement.met ? "✓" : "○"}</i><span>${requirement.label}</span></li>`).join("")
    : '<li class="is-met"><i>✓</i><span>建国盟約により成立済み</span></li>';
  const packageCards = status.portfolio.systems.map((system) => `
    <button type="button" class="national-reform-system ${system.id === selected.id ? "is-active" : ""}" data-national-reform-system="${system.id}">
      <header><span>${system.shortName}</span><strong>${system.name}</strong><b>${Math.round(system.control)}%</b></header>
      <p>${system.benefit}</p>
      <footer><span>${system.insufficientPreparation}</span><em class="${system.backlash >= 55 ? "is-danger" : ""}">反動 ${system.backlash}</em></footer>
    </button>
  `).join("");
  const regionOptions = Object.keys(state.cities).map((regionId) => {
    const cells = selected.cells.filter((cell) => cell.regionId === regionId);
    const readiness = Math.round(cells.reduce((sum, cell) => sum + cell.readiness, 0) / Math.max(1, cells.length));
    const control = Math.round(cells.reduce((sum, cell) => sum + Math.min(cell.legal, cell.practical, cell.effective), 0) / Math.max(1, cells.length));
    return `<label><input type="checkbox" data-national-reform-region value="${regionId}" checked><span><strong>${WORLD.provinces[regionId].name}</strong><small>準備 ${readiness} · 支配 ${control}</small></span></label>`;
  }).join("");
  const methodOptions = Object.values(AUTHORITY_TRANSFER_METHODS).map((method) => `<option value="${method.id}">${method.name} · 反動基礎 ${method.backlash}</option>`).join("");
  const budgetOptions = Object.values(NATIONAL_REFORM_BUDGETS).map((budget) => `<option value="${budget.id}" ${budget.id === "standard" ? "selected" : ""}>${budget.name} · 金 ${budget.cost}</option>`).join("");
  const officerOptions = Object.entries(state.officers).filter(([, officer]) => officer.allegiance === "serving").map(([officerId]) => `<option value="${officerId}">${WORLD.characters[officerId].name} · ${state.officers[officerId].faction}</option>`).join("");
  const concessionOptions = Object.values(REFORM_CONCESSIONS).map((concession) => `<option value="${concession.id}" ${concession.id === "local_offices" ? "selected" : ""}>${concession.name}</option>`).join("");
  const activeRows = state.centralizationCampaign.reforms.filter((reform) => reform.status === "active").map((reform) => {
    const system = NATIONAL_REFORM_SYSTEMS[reform.systemId];
    const completed = reform.cells.filter((cell) => cell.status === "completed").length;
    const current = reform.cells.filter((cell) => cell.status === "active").sort((left, right) => right.stageIndex - left.stageIndex || right.progress - left.progress)[0];
    const stage = current ? AUTHORITY_REFORM_STAGES[current.stageIndex] : AUTHORITY_REFORM_STAGES.at(-1);
    return `<article><header><strong>${system.name}</strong><b>${completed}/${reform.cells.length} 定着</b></header><p>${AUTHORITY_TRANSFER_METHODS[reform.methodId].name} · ${NATIONAL_REFORM_BUDGETS[reform.budgetId].name} · 担当 ${WORLD.characters[reform.officerId].name}</p><span>先行工程：${stage.name} ${Math.round(current?.progress ?? 100)}%</span></article>`;
  }).join("");
  const reactions = state.centralizationCampaign.localResponses.slice(0, 4).map((response) => {
    const entity = state.administration.powerEntities[response.entityId];
    return `<article class="local-power-response"><header><strong>${response.entityName}</strong><b>${response.name} · 圧力 ${response.pressure}</b></header><p>${response.manifestation}</p><dl><div><dt>目標</dt><dd>${entity?.goal ?? "地方権限の維持"}</dd></div><div><dt>最低妥協</dt><dd>${response.minimumCompromise}</dd></div><div><dt>王廷協力者</dt><dd>${response.courtAlly}</dd></div><div><dt>改革後の地位</dt><dd>${response.desiredPostReformStatus}</dd></div></dl></article>`;
  }).join("") || '<p class="empty-candidates">国家級改革を開始すると、地方勢力が世界状態から反応を選びます。</p>';
  const formation = status.nationFormation;
  const geographyFlow = [
    `地形・自然国境：${formation.naturalBorders.join(" / ")}`,
    `集落・交易路：${formation.settlements.slice(0, 3).map((settlement) => settlement.kind).join(" / ")}`,
    `地方勢力：${formation.localPowers.slice(0, 4).join(" / ")}`,
    `過去の危機：${formation.pastCrises.join(" / ")}`,
    `歴史的妥協：${formation.compromises.join(" / ")}`,
    `特権：${formation.privileges.map((privilege) => AUTHORITY_DOMAINS[privilege.domain].name).join(" / ")}`,
    `現在の障壁：${formation.obstacles.join(" / ")}`,
  ].map((label, index) => `<li><i>${index + 1}</i><span>${label}</span></li>`).join("");
  const historyRules = getHistoricalRuleEffects(state);
  const currentHistoryPolicy = state.centralizationCampaign.historyPolicies.at(-1)?.policyId ?? null;
  const historyPolicies = Object.values(HISTORY_POLICIES).map((policy) => `
    <article class="history-policy-card ${currentHistoryPolicy === policy.id ? "is-active" : ""}">
      <header><strong>${policy.name}</strong>${currentHistoryPolicy === policy.id ? "<b>現行</b>" : ""}</header>
      <p>${policy.description}</p><span>短期：${policy.shortBenefit}</span><small>長期：${policy.longRisk}</small>
      <button type="button" data-history-policy="${policy.id}" ${currentHistoryPolicy === policy.id || status.decisionsRemaining <= 0 ? "disabled" : ""}>この歴史政策を採用</button>
    </article>
  `).join("");
  const leviathan = getLeviathanStatus(state);
  const leviathanPolicies = Object.values(LEVIATHAN_POLICIES).map((policy) => `<button type="button" data-leviathan-policy="${policy.id}" class="${leviathan.policy.id === policy.id ? "is-active" : ""}" ${leviathan.policy.id === policy.id || status.decisionsRemaining <= 0 ? "disabled" : ""}><strong>${policy.name}</strong><small>${policy.description}</small></button>`).join("");
  const endgame = getWorldEndgameStatus(state);
  const endgameRoutes = endgame.routes.map((route) => {
    const available = route.eligible || state.worldEndgame.routeId === route.id;
    const requirements = route.requirements.map((requirement) => `<li class="${requirement.met ? "is-met" : ""}"><i>${requirement.met ? "✓" : "○"}</i><span>${escapeHtml(requirement.label)}</span></li>`).join("");
    const steps = route.steps.map((step, index) => {
      const complete = state.worldEndgame.completedStepIds.includes(step.id);
      const current = route.nextStep?.id === step.id;
      return `<li class="${complete ? "is-complete" : current ? "is-current" : ""}"><i>${complete ? "✓" : index + 1}</i><span><strong>${escapeHtml(step.name)}</strong><small>${escapeHtml(step.consequence)}</small></span></li>`;
    }).join("");
    const actionLocked = !available || !route.nextStep || state.worldEndgame.lastActionTurn === state.turn;
    return `<article class="world-endgame-route ${state.worldEndgame.routeId === route.id ? "is-committed" : ""} ${route.lockedByOtherRoute ? "is-locked" : ""}">
      <header><div><small>${route.id === "rational_empire" ? "ORDER / GODDESS" : "CONSENT / HUMAN"}</small><h3>${escapeHtml(route.name)}</h3></div><b>${route.completedSteps} / 3</b></header>
      <p>${escapeHtml(route.principle)}</p><ul class="world-endgame-requirements">${requirements}</ul><ol>${steps}</ol>
      ${route.nextStep ? `<button type="button" data-world-endgame-action="${route.nextStep.id}" ${actionLocked ? "disabled" : ""}><strong>${escapeHtml(route.nextStep.name)}</strong><span>${state.worldEndgame.lastActionTurn === state.turn && state.worldEndgame.routeId === route.id ? "次の月まで制度を定着" : available ? "不可逆な世界主権判断を実行" : "成立条件が不足"}</span></button>` : `<strong class="world-endgame-complete">物語終局を年代記へ記録済み</strong>`}
    </article>`;
  }).join("");
  const sovereigntyRecords = [...endgame.ledger.preserved.map((entry) => ({ ...entry, kind: "preserved" })), ...endgame.ledger.consolidated.map((entry) => ({ ...entry, kind: "consolidated" }))].slice(-10).map((entry) => `<li class="is-${entry.kind}"><span>${entry.kind === "preserved" ? "残した制度" : "統一した制度"}</span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.source)} · ${escapeHtml(entry.detail)}</small></li>`).join("");
  const crisisRows = status.crisis?.issues?.length ? status.crisis.issues.map((issue) => `<div><span>${issue.name}</span><strong>${issue.severity}</strong><i style="--value:${issue.severity}%"></i><small>${issue.basis}</small></div>`).join("") : "";
  elements.leftPanel.innerHTML = `
    <header class="panel-heading centralization-heading">
      <span>CENTRALIZATION CAMPAIGN · ${state.scenarioMode === "generated" ? "GENERATED HISTORY" : "SELENA CANON"}</span>
      <h1>${status.currentStage.name}</h1>
      <p>合理化の実利と、自治・約束・代表手続を残すコストを積み上げ、世界主権の二経路へ接続する。</p>
    </header>
    <div class="panel-body centralization-panel-body">
      <section class="centralization-command-hero">
        <article><small>次に除去すべき最大障壁</small><strong>${escapeHtml(status.largestBarrier?.label ?? status.ending?.name ?? "集権後統治を継続")}</strong><span>${status.nextStage ? `次段階 ${status.nextStage.name}` : status.ending?.powerStructure ?? "集権後危機を統治中"}</span></article>
        <article><small>中央集権化結果</small><strong>${Math.round(status.result.resultIndex)}%</strong><span>法 ${Math.round(status.result.legalCentralization)} / 実務 ${Math.round(status.result.practicalCentralization)} / 行政負荷 ${status.result.capacity.utilization}%</span></article>
        <article><small>今月の主要判断</small><strong>残り ${status.decisionsRemaining} / 3</strong><span>改革・歴史・災害対応を合計3件まで</span></article>
      </section>
      <section class="central-stage-rail">${stageRail}</section>
      <section class="central-next-stage"><header><div><small>NEXT STATE</small><h2>${status.nextStage?.name ?? status.currentStage.name}</h2></div><b>${status.currentStage.upkeep}</b></header><p>${status.currentStage.politicalBarrier}</p><ul>${requirements}</ul><aside><strong>失敗時の立て直し</strong><span>${status.currentStage.recovery}</span></aside></section>
      <section class="ash-crown-chapter ${status.chapter.complete ? "is-complete" : ""}"><header><div><small>CHAPTER I</small><h2>灰冠峠三幕キャンペーン</h2></div><b>${status.chapter.complete ? "第一章完了" : "中央集権化の第一章"}</b></header><p>道路規格、敵情、通行権、戦争・占領・定着を通じ、王国制度が共同利益を作れるかを証明する章です。${status.chapter.ending ? ` 結果：${status.chapter.ending.name}。` : ""}</p><button type="button" data-panel="diplomacy">灰冠峠の外交・三幕へ</button></section>
      <section class="national-reform-section">
        <header><div><small>5 NATIONAL REFORM SYSTEMS / INTERNAL 17 DOMAINS</small><h2>国家級改革パッケージ</h2></div><p>通常画面では利益・代償・反対勢力・準備不足・反動だけを判断する。</p></header>
        <div class="national-reform-system-grid">${packageCards}</div>
        <article class="national-reform-planner" data-national-reform-planner="${selected.id}">
          <header><div><small>選択中 · ${selected.domains.length}権限分野</small><h2>${selected.name}</h2></div><b>全国支配 ${Math.round(selected.control)}%</b></header>
          <div class="reform-consequence-grid"><p><strong>利益</strong>${selected.benefit}</p><p><strong>代償</strong>${selected.cost}</p><p><strong>反対勢力</strong>${selected.opposition}</p><p><strong>準備／反動</strong>${selected.insufficientPreparation} · ${selected.backlash}</p></div>
          <div class="national-reform-form">
            <fieldset><legend>対象地域</legend>${regionOptions}</fieldset>
            <label><span>改革方式</span><select data-national-reform-method>${methodOptions}</select></label>
            <label><span>予算</span><select data-national-reform-budget>${budgetOptions}</select></label>
            <label><span>担当人物</span><select data-national-reform-officer>${officerOptions}</select></label>
            <label><span>譲歩条件</span><select data-national-reform-concession>${concessionOptions}</select></label>
          </div>
          <button class="national-reform-start" type="button" data-start-national-reform="${selected.id}" ${activeReform || status.decisionsRemaining <= 0 ? "disabled" : ""}>${activeReform ? "この系統は進行中" : status.decisionsRemaining <= 0 ? "今月の主要判断を使い切りました" : "この国家級改革を開始"}</button>
        </article>
        ${activeRows ? `<div class="active-national-reforms"><h3>進行中の国家級改革</h3>${activeRows}</div>` : ""}
      </section>
      <section class="local-power-agency"><header><div><small>WORLD STATE → PRESSURE → MANIFESTATION</small><h2>地方勢力の能動的反応</h2></div><p>乱数ではなく、特権・支持・不満・外国接触・譲歩から決定。</p></header>${reactions}</section>
      <section class="state-formation-history"><header><div><small>TERRAIN → PRESENT BARRIERS</small><h2>地形・歴史・特権・改革制約</h2></div><b>国家統合コスト ${formation.integrationCost}</b></header><ol>${geographyFlow}</ol></section>
      <section class="historical-rule-policy"><header><div><small>WORLD TRUTH / HISTORICAL RECORD / PUBLIC BELIEF</small><h2>歴史認識政策</h2></div><div><span>法的正当性 ${historyRules.legalLegitimacy}</span><span>王廷支持 ${historyRules.courtSupport}</span><span>地域服従 ${historyRules.publicBelief}</span><span>外交請求 ${historyRules.diplomaticClaim}</span></div></header><div class="history-policy-grid">${historyPolicies}</div></section>
      <section class="leviathan-centralization"><header><div><small>DECADAL MIGRATION / ORDINARY DISASTER POLICY</small><h2>リヴァイアサン：${leviathan.name}</h2></div><b>情報精度 ${leviathan.informationAccuracy}%</b></header><p>${leviathan.estimatedPosition} · ${leviathan.signs.join(" / ")}。航路 ${leviathan.routesClosed ? "閉鎖" : "監視"}、港湾避難 ${leviathan.evacuationRequired ? "必要" : "待機"}。平時は自然災害として扱い、討伐または和解は世界終局でのみ実行する。</p><div class="leviathan-policy-grid">${leviathanPolicies}</div></section>
      <section class="world-endgame-board"><header><div><small>SOVEREIGNTY LEDGER / TWO CANONICAL ENDINGS</small><h2>世界主権の最終制度</h2></div><p>人間性は善行点ではなく、ゲーム中に残した約束・自治・代表手続として判定する。合理化は危機対応力を得る正規経路であり、悪役選択ではない。</p></header><div class="world-endgame-ledger"><span><small>残した制度</small><strong>${endgame.ledger.preserved.length}</strong></span><span><small>制度分野</small><strong>${endgame.ledger.preservedSources}</strong></span><span><small>統一した制度</small><strong>${endgame.ledger.consolidated.length}</strong></span><span><small>重大な約束違反</small><strong>${endgame.ledger.breaches.length}</strong></span><span><small>合意可能な国家</small><strong>${endgame.ledger.consentingStates}</strong></span></div><div class="world-endgame-routes">${endgameRoutes}</div><details><summary>この結末を作っている実際の統治履歴</summary><ul class="sovereignty-records">${sovereigntyRecords || "<li><strong>まだ終局条件へ残る制度履歴がありません。</strong></li>"}</ul></details></section>
      ${status.crisis ? `<section class="post-centralization-crisis"><header><div><small>MANDATORY 12 MONTHS</small><h2>集権後危機 ${status.crisis.months} / 12か月</h2></div><b>${status.ending?.name ?? "統治継続"}</b></header><div>${crisisRows}</div></section>` : ""}
      <details class="specialist-ledger-link"><summary>専門台帳：17分野×各地域の法的・実務権限</summary><p>都市 → 統治委任を開き、上部の「専門台帳」を表示すると、従来の17分野台帳と個別改革を確認できます。</p><button type="button" data-open-specialist-ledger>専門台帳を開く</button></details>
    </div>
  `;
}

function careerMetricCards(player, regionalReputation = currentRegionalReputationReport()) {
  const metrics = player.metrics;
  return [
    ["martial", "⚔", "武勲", metrics.martialMerit, "軍務"],
    ["civil", "政", "政績", metrics.civilMerit, "統治"],
    ["renown", "✦", "地方名声", regionalReputation.value, `${regionalReputation.regionName} · ${regionalReputation.label}`],
    ["trust", "♜", player.sovereign ? "君主権" : "主君の信頼", metrics.liegeTrust, player.sovereign ? player.title : player.affiliation.liegeName ?? "主君なし"],
    ["household", "旗", "家臣支持", metrics.householdSupport, "直属家臣"],
    ["popular", "民", "領民支持", metrics.popularSupport, "管轄住民"],
    ["legitimacy", "冠", "正統性", metrics.legitimacy, "任官・継承"],
    ["ambition", "火", "野心", metrics.ambition, "警戒度"],
  ].map(([id, icon, label, value, detail]) => {
    const gauge = Math.max(0, Math.min(100, Number(value) || 0));
    return `<article class="career-metric-card is-${id}" style="--value:${gauge}%">
      <span class="career-metric-icon" aria-hidden="true">${icon}</span>
      <div class="career-metric-ring"><strong>${value}</strong></div>
      <div class="career-metric-copy"><small>${label}</small><span>${escapeHtml(detail)}</span></div>
      <i aria-hidden="true"></i>
    </article>`;
  }).join("");
}

function regionalReputationBoard(report = currentRegionalReputationReport()) {
  const sources = report.sources.slice(0, 6).map((source) => {
    const distance = source.distance == null ? "経路外" : source.distance === 0 ? "同じ地方" : `${source.distance}地方先`;
    const reach = source.reachesRegion ? `当地への認知 ${source.value}` : `未伝搬 · 半径${source.spreadRadius}`;
    return `<li class="${source.reachesRegion ? "is-known" : "is-unknown"}"><span><small>${escapeHtml(distance)}</small><strong>${escapeHtml(source.villageName)}</strong></span><span><small>功績総量 ${source.merit}</small><strong>${escapeHtml(reach)}</strong></span></li>`;
  }).join("");
  return `<section class="regional-reputation-board">
    <header><div><small>REGIONAL REPUTATION</small><h2>${escapeHtml(report.regionName)}での名声</h2></div><strong>${report.value}</strong></header>
    <p>依頼達成で名声が上がり、救援や村の支援などの善行でもわずかに上昇します。仕官後に領主の依頼を果たすと比較的大きく上昇し、その信用は植民にも使われます。</p>
    <ol>${sources || "<li class=\"is-empty\"><strong>この地方へ届いている功績はまだありません。</strong></li>"}</ol>
  </section>`;
}

function careerStageRoute(stage) {
  const stages = PLAYABLE_CAREER_STAGE_ROUTE;
  const currentIndex = Math.max(0, stages.findIndex((entry) => entry.id === stage.id));
  const progress = stages.length > 1 ? currentIndex / (stages.length - 1) * 100 : 0;
  return `<ol class="career-stage-route" style="--career-progress:${progress}%" aria-label="通常UIで通過できる立身段階 ${currentIndex + 1}/${stages.length}">
    ${stages.map((entry) => {
      const index = stages.indexOf(entry);
      const stateClass = index < currentIndex ? "is-complete" : index === currentIndex ? "is-current" : "is-future";
      return `<li class="${stateClass}" ${index === currentIndex ? 'aria-current="step"' : ""}><i>${index < currentIndex ? "✓" : index + 1}</i><span>${escapeHtml(entry.name)}</span></li>`;
    }).join("")}
  </ol>`;
}

function careerIdentityCrest(player, stage, compact = false) {
  const initial = escapeHtml(player.name.trim().slice(0, 1) || "人");
  const currentIndex = Math.max(0, PLAYABLE_CAREER_STAGE_ROUTE.findIndex((entry) => entry.id === stage.id));
  const progress = Math.round((currentIndex + 1) / PLAYABLE_CAREER_STAGE_ROUTE.length * 100);
  return `<div class="career-identity-crest ${compact ? "is-compact" : ""}" style="--career-rank:${progress}%" aria-label="${escapeHtml(player.name)}、実装済み立身段階${currentIndex + 1}">
    <span>${initial}</span><i aria-hidden="true"></i><b>${currentIndex + 1}</b>
  </div>`;
}

function promotionDelegationFields(roleId) {
  const candidates = getDelegationCandidates(state, roleId);
  if (!candidates.length) return `<p class="delegation-warning">後任候補がいません。仲間か配下人物が必要です。</p>`;
  const mandateOptions = Object.values(DELEGATION_MANDATES).map((mandate) => `<option value="${mandate.id}" ${mandate.id === (roleId === "commander" ? "defensive" : "balanced") ? "selected" : ""}>${mandate.name}</option>`).join("");
  const authorityOptions = Object.values(DELEGATION_AUTHORITY_LEVELS).map((authority) => `<option value="${authority.id}" ${authority.id === "standard" ? "selected" : ""}>${authority.name}</option>`).join("");
  return `<fieldset class="promotion-delegation"><legend>昇進後の引き継ぎ</legend><label>後任<select data-promotion-successor>${candidates.map((officer) => `<option value="${officer.id}">${escapeHtml(officer.name)} · ${escapeHtml(officer.role)}</option>`).join("")}</select></label><label>重視方針<select data-promotion-mandate>${mandateOptions}</select></label><label>裁量<select data-promotion-authority>${authorityOptions}</select></label><p>日常判断は後任が処理し、重大事項だけを上申します。</p></fieldset>`;
}

function governmentFormFields() {
  const options = Object.values(GOVERNMENT_TITLE_SYSTEMS).map((system) => (
    `<option value="${system.id}">${escapeHtml(system.name)} — ${escapeHtml(system.highest.join("・"))}</option>`
  )).join("");
  return `<fieldset class="promotion-delegation government-form-choice"><legend>建国する国家形態</legend><label>国家形態<select data-government-form>${options}</select></label><p>独立後のプレイヤー称号は、選んだ国家形態の最高位称号になります。</p></fieldset>`;
}

function governmentTitleCatalog() {
  const systems = Object.values(GOVERNMENT_TITLE_SYSTEMS).map((system) => `<article>
    <small>${escapeHtml(system.name)}</small>
    <strong>${escapeHtml(system.highest.join("・"))}</strong>
    <span>${escapeHtml(system.offices.join("、"))}</span>
  </article>`).join("");
  return `<details class="government-title-catalog"><summary>国家形態別の称号体系</summary><div>${systems}</div></details>`;
}

function renderMilitaryCareerMission(player) {
  const missionView = getMilitaryCareerMissionView(state);
  if (!missionView.active) {
    const commander = player.stage === "commander";
    return `<button class="career-primary-action" type="button" data-military-mission-action="start"><strong>${commander ? "辺境救援命令を受ける" : "主君の討伐命令を受ける"}</strong><small>期限・目的地・禁止事項を確認し、準備、実移動、戦術戦闘、帰還報告を行う</small></button>`;
  }
  const mission = missionView.mission;
  const constraints = mission.constraints.map((entry) => `<li>${escapeHtml(entry.label)}</li>`).join("");
  const brief = `<header><div><small>LIEGE MISSION · TURN ${mission.acceptedTurn}—${mission.deadlineTurn}</small><h3>${escapeHtml(mission.title)}</h3></div><b>${escapeHtml(mission.targetRegion.name)}</b></header>
    <p>${escapeHtml(mission.politicalReason)}</p>
    <dl class="military-mission-route"><div><dt>受命・報告</dt><dd>${escapeHtml(mission.originRegion.name)}</dd></div><div><dt>作戦地域</dt><dd>${escapeHtml(mission.targetRegion.name)}</dd></div><div><dt>期限</dt><dd>${mission.deadlineTurn}ターンまで</dd></div></dl>
    <ul class="military-mission-constraints">${constraints}</ul>`;
  if (mission.stage === "accepted") {
    const approachOptions = missionView.approaches.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)} — ${escapeHtml(entry.description)}</option>`).join("");
    const logisticsOptions = missionView.logistics.map((entry) => `<option value="${entry.id}" ${entry.id === "standard" ? "selected" : ""}>${escapeHtml(entry.name)} — 財産${entry.wealthCost}・保存食${entry.foodCost}</option>`).join("");
    const companions = missionView.companions.map((member) => `<label><input type="checkbox" data-military-companion value="${member.id}"> ${escapeHtml(member.name)} <small>${escapeHtml(member.role)}</small></label>`).join("");
    return `<article class="career-promotion-action military-mission-card" data-military-mission-card>${brief}
      <fieldset class="promotion-delegation"><legend>軍議と編成</legend><label>作戦<select data-military-approach>${approachOptions}</select></label><label>兵站<select data-military-logistics>${logisticsOptions}</select></label><div class="military-mission-companions"><span>参陣者</span>${companions || "<small>同行可能な仲間はいません</small>"}</div><p>選択した物資は準備時に消費され、戦力と継戦力へ反映されます。</p></fieldset>
      <button class="career-primary-action" type="button" data-military-mission-action="prepare"><strong>軍議を確定して出発準備を終える</strong><small>確定後は実際の地方地図から対象地域へ移動する</small></button></article>`;
  }
  if (mission.stage === "prepared") {
    const forecast = missionView.forecast;
    const action = missionView.atTarget
      ? `<button class="career-primary-action is-danger" type="button" data-military-mission-action="battle"><strong>戦術戦闘を開始する</strong><small>保存された参加者・兵站・作戦で実戦へ移る</small></button>`
      : `<button class="career-primary-action" type="button" data-military-mission-action="target"><strong>${escapeHtml(mission.targetRegion.name)}を地図で確認</strong><small>通常の地方移動で到着しなければ戦闘は開始できない</small></button>`;
    return `<article class="career-promotion-action military-mission-card" data-military-mission-card>${brief}<p class="military-mission-plan"><strong>${escapeHtml(mission.preparation.approachName)} · ${escapeHtml(mission.preparation.logisticsName)}</strong><span>自軍評価 ${forecast.playerStrength} / 敵推定 ${forecast.enemyStrength} / 補給 ${forecast.supply}</span></p>${action}</article>`;
  }
  const result = mission.battleResult;
  const resultText = mission.outcome === "victory" ? "勝利" : mission.outcome === "deadline_missed" ? "期限切れ" : mission.outcome === "withdrawal" ? "撤退" : "敗北";
  const delegation = mission.outcome === "victory" && player.stage === "commander" ? promotionDelegationFields("commander") : "";
  const action = missionView.atOrigin
    ? `<article data-career-action-card>${delegation}<button class="career-primary-action" type="button" data-military-mission-action="report"><strong>主君へ帰還報告する</strong><small>勝敗・期限・味方損害を評価し、恩賞・昇進または叱責を確定</small></button></article>`
    : `<button class="career-primary-action" type="button" data-military-mission-action="origin"><strong>${escapeHtml(mission.originRegion.name)}へ帰還する</strong><small>報告と評価は受命地点でのみ行える</small></button>`;
  return `<article class="career-promotion-action military-mission-card" data-military-mission-card>${brief}<p class="military-mission-result"><strong>${resultText}</strong><span>味方損害 ${result?.friendlyCasualties ?? 0} · 敵損害 ${result?.enemyCasualties ?? 0}</span></p>${action}</article>`;
}

function lifeClockLabel(minutes) {
  const day = Math.floor(minutes / 1440) + 1;
  const minuteOfDay = minutes % 1440;
  return `第${day}日 ${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
}

function renderPropertyEnterpriseBoard() {
  const model = getPropertyEnterpriseView(state);
  const settlement = activeVillageContext();
  const localProperties = settlement ? model.properties.filter((entry) => entry.settlementId === settlement.id) : [];
  const stock = settlement ? model.warehouseStock[settlement.id] ?? {} : {};
  const shop = settlement ? model.shops[settlement.id] : null;
  const cargo = state.player.merchantTrade.cargo;
  const load = getMerchantCargoLoadDetails(state);
  const acquisition = settlement ? Object.values(PROPERTY_TYPES).map((property) => `<button type="button" data-property-acquire="${property.id}" data-property-settlement="${settlement.id}" ${localProperties.some((entry) => entry.typeId === property.id) ? "disabled" : ""}><strong>${escapeHtml(property.name)} · 財産${property.cost}</strong><small>保管${property.storageCapacity}重量・月費${property.monthlyCost}</small></button>`).join("") : "<p>集落に入り、人物画面を開くと物件を取得できます。</p>";
  const transfer = settlement && localProperties.length && cargo.length ? `<div class="enterprise-transfer-grid">${cargo.map((item) => `<button type="button" data-warehouse-deposit="${item.commodityId}" data-property-settlement="${settlement.id}">${escapeHtml(item.name)}を1個預ける</button>`).join("")}</div>` : "";
  const warehouse = Object.values(stock).map((item) => `<li><strong>${escapeHtml(item.name)} ×${item.quantity}</strong><button type="button" data-warehouse-withdraw="${item.commodityId}" data-property-settlement="${settlement?.id ?? ""}">1個取り出す</button>${shop?.status === "open" ? `<button type="button" data-shop-stock="${item.commodityId}" data-property-settlement="${settlement.id}">1個を店頭へ</button>` : ""}</li>`).join("");
  const shopInventory = shop?.status === "open" ? Object.values(shop.inventory).map((item) => `<li><strong>${escapeHtml(item.name)} ×${item.quantity}</strong><span>価格倍率 ${shop.priceMultipliers[item.commodityId] ?? 1}</span><button type="button" data-shop-price="${item.commodityId}" data-shop-multiplier="0.8" data-property-settlement="${settlement.id}">安売り</button><button type="button" data-shop-price="${item.commodityId}" data-shop-multiplier="1" data-property-settlement="${settlement.id}">標準</button><button type="button" data-shop-price="${item.commodityId}" data-shop-multiplier="1.2" data-property-settlement="${settlement.id}">高値</button></li>`).join("") : "";
  const shopArea = settlement && localProperties.some((entry) => entry.typeId === "shop_house") ? shop?.status === "open" ? `<article><strong>${escapeHtml(shop.name)}</strong><small>未払い ${shop.arrearsMonths}か月</small><ul>${shopInventory || "<li>店頭在庫なし</li>"}</ul><button type="button" data-shop-close data-property-settlement="${settlement.id}">店を閉じ、在庫を倉庫へ戻す</button></article>` : `<button type="button" data-shop-open data-property-settlement="${settlement.id}">個人商店を開く</button>` : "";
  return `<details class="life-loop-section"><summary><span>住居・倉庫・商店</span><strong>現地資産と重量物流</strong><small>${load.weight}/${load.weightCapacity}重量 · 物件${model.properties.length}件</small></summary><div class="life-loop-content"><div class="life-action-grid">${acquisition}</div>${transfer}<ul>${warehouse}</ul>${shopArea}<ol>${model.monthlyLedger.slice(0, 3).map((entry) => `<li>${escapeHtml(entry.period)} 売上${entry.revenue}・費用${entry.costs}・損益${entry.profit}</li>`).join("")}</ol></div></details>`;
}

function renderCompanionQuestBoard() {
  const model = getCompanionQuestView(state);
  const cards = model.companions.map((companion) => {
    if (companion.active) return `<article><header><h3>${escapeHtml(companion.name)}：${escapeHtml(companion.active.name)}</h3><b>${companion.active.status === "held" ? "保留" : "進行中"}</b></header><p>${escapeHtml(companion.active.description)}</p>${companion.active.status === "held" ? `<button type="button" data-companion-quest-response="accept" data-companion-quest-member="${companion.memberId}" data-companion-quest-offer="${companion.active.id}">引き受ける</button>` : `<button type="button" data-companion-quest-complete="${companion.memberId}" ${companion.eligibleBattleId ? `data-companion-battle-evidence="${escapeHtml(companion.eligibleBattleId)}"` : ""} ${companion.active.kind === "battle" && !companion.eligibleBattleId ? "disabled title=\"受諾後の実戦勝利が必要です\"" : ""}>${companion.active.kind === "battle" ? "実戦勝利を報告" : "現地条件を確認して完了"}</button>`}</article>`;
    return `<article><header><h3>${escapeHtml(companion.name)}の個人的な頼み</h3><b>3案</b></header>${companion.offers.map((offer) => `<section><strong>${escapeHtml(offer.name)}</strong><small>${escapeHtml(offer.targetRegionName)}・期限 ${escapeHtml(lifeClockLabel(offer.deadlineMinutes))}</small><div><button type="button" data-companion-quest-response="accept" data-companion-quest-member="${companion.memberId}" data-companion-quest-offer="${offer.id}">受諾</button><button type="button" data-companion-quest-response="hold" data-companion-quest-member="${companion.memberId}" data-companion-quest-offer="${offer.id}">保留</button><button type="button" data-companion-quest-response="refuse" data-companion-quest-member="${companion.memberId}" data-companion-quest-offer="${offer.id}">断る</button></div></section>`).join("")}</article>`;
  }).join("") || "<p>同行中の仲間が加わると個人的な依頼が発生します。</p>";
  return `<details class="life-loop-section"><summary><span>仲間の物語</span><strong>旅・届け物・実戦</strong><small>達成 ${model.history.filter((entry) => entry.outcome === "completed").length}件</small></summary><div class="life-loop-content companion-agency-grid">${cards}</div></details>`;
}

function renderEstatePoliticsBoard() {
  if (!state.player.holdings?.length) return "";
  const holding = state.player.holdings[0]; const model = getEstatePoliticsView(state, holding.territoryId);
  const debate = model.activeDebate ? `<article><header><h3>${escapeHtml(model.activeDebate.projectName ?? model.activeDebate.projectId)}の領地評議</h3><b>決裁待ち</b></header><div>${model.options.map((option) => `<button type="button" data-estate-decision="${option.id}">${escapeHtml(option.name)}</button>`).join("")}</div></article>` : "<p>所領事業の「着工」を選ぶと、四身分の利害を先に評議します。</p>";
  return `<details class="life-loop-section"><summary><span>領地政治</span><strong>領民・名望家・商人・家臣</strong><small>反乱圧力 ${model.region.rebellionPressure}</small></summary><div class="life-loop-content">${debate}<div class="realm-facts">${model.factions.map((faction) => `<div><small>${escapeHtml(faction.name)}</small><strong>${faction.support}</strong><span>${escapeHtml(faction.concern)}</span></div>`).join("")}</div></div></details>`;
}

function renderGeneratedCampaignBoard() {
  if (!state.player.sovereign) return "";
  const model = getGeneratedCampaignView(state);
  const resistance = getGeneratedResistanceView(state);
  const active = model.active;
  const phaseNames = { mustering: "動員", marching: "行軍", siege_decision: "攻城軍議", siege: "攻城", peace_decision: "講和評議", rebuilding: "再建" };
  const content = active
    ? `<article><header><h3>${escapeHtml(active.targetRegionName ?? active.targetRegionId)}方面戦役</h3><b>${escapeHtml(phaseNames[active.phase] ?? active.phase)}</b></header><p>${escapeHtml(active.objectiveName ?? active.objectiveId)} · 兵站費${active.supplyCost ?? 0}</p><p>${active.fronts.length}正面 ${active.fronts.map((front) => `${escapeHtml(front.name)} ${front.progress}%`).join(" / ")}</p><p>兵站 ${active.armies.map((army) => `${army.id}:${army.supplies}`).join(" / ")}</p>${active.phase === "siege_decision" ? `<div>${model.siegeDecisions.map((decision) => `<button type="button" data-generated-siege="${decision.id}">${escapeHtml(decision.name)}</button>`).join("")}</div>` : active.phase === "peace_decision" ? `<div><button type="button" data-generated-peace="status_quo">原状回復</button><button type="button" data-generated-peace="ceasefire">停戦</button><button type="button" class="is-danger" data-generated-peace="limited_annexation">限定割譲</button>${active.objectiveId === "full_annexation" ? '<button type="button" class="is-danger" data-generated-peace="full_annexation">完全併合</button>' : ""}</div>` : `<button type="button" data-generated-campaign-advance>戦役を一段階進める</button><button type="button" data-generated-campaign-retreat>撤退して再建へ</button>`}</article>`
    : `<article data-generated-campaign-form><label>侵攻先<select data-generated-campaign-target>${model.targets.map((target) => `<option value="${target.regionId}">${escapeHtml(target.name)}</option>`).join("")}</select></label><label>目的<select data-generated-campaign-objective>${model.objectives.map((objective) => `<option value="${objective.id}">${escapeHtml(objective.name)} · 兵站費${objective.supplyCost}</option>`).join("")}</select></label><label>副将<select data-generated-campaign-commander>${(state.player.householdRetainers ?? []).map((id) => `<option value="${id}">${escapeHtml(WORLD.characters[id]?.name ?? id)}</option>`).join("")}</select></label><button type="button" data-generated-campaign-start ${model.targets.length && state.player.householdRetainers?.length ? "" : "disabled"}>最大5正面の戦役を準備</button><div>${model.allies.map((ally) => `<button type="button" data-generated-ally="${ally.nationId}">${escapeHtml(ally.name)}へ援軍要請</button>`).join("")}</div></article>`;
  const interventions = model.interventionWars.length ? `<section><h3>進行中の他国戦争へ介入</h3>${model.interventionWars.map((war) => `<article><strong>${escapeHtml(war.attackerName)} 対 ${escapeHtml(war.defenderName)}</strong><small>${war.fronts.length}正面 · ${escapeHtml(war.targetRegionName)}</small><div><button type="button" data-generated-war-intervention="support_attacker" data-generated-war-id="${war.id}">攻撃側へ援軍</button><button type="button" data-generated-war-intervention="support_defender" data-generated-war-id="${war.id}">防衛側へ援軍</button><button type="button" data-generated-war-intervention="mediate" data-generated-war-id="${war.id}">停戦仲介</button></div></article>`).join("")}</section>` : "";
  const occupations = resistance.occupations.filter((entry) => entry.status === "active" && entry.occupierNationId === state.generatedWorld.playerNationId).map((entry) => `<article><header><h3>${escapeHtml(entry.regionName)}の併合統治</h3><b>抵抗 ${entry.resistance}</b></header><p>順応 ${entry.compliance} · 地下細胞 ${entry.cells} · 駐屯 ${entry.garrison}</p><div>${resistance.policies.map((policy) => `<button type="button" data-generated-resistance-policy="${policy.id}" data-generated-occupation-id="${entry.id}" ${entry.policyId === policy.id ? 'class="is-active"' : ""}>${escapeHtml(policy.name)}</button>`).join("")}</div>${entry.pendingResponse ? `<p><strong>${escapeHtml(entry.pendingResponse.title)}</strong></p><div>${resistance.responses.map((response) => `<button type="button" data-generated-resistance-response="${response.id}" data-generated-occupation-id="${entry.id}">${escapeHtml(response.name)}${response.cost ? `（財産${response.cost}）` : ""}</button>`).join("")}</div>` : ""}</article>`).join("");
  return `<details class="life-loop-section"><summary><span>生成世界大戦役</span><strong>共通戦争コア・最大5正面・併合統治</strong><small>${active ? escapeHtml(active.phase) : "軍議"}</small></summary><div class="life-loop-content">${content}${interventions}${occupations}</div></details>`;
}

function renderLifeToRealmBoard() {
  const model = getLifeToRealmView(state);
  const body = model.body;
  const warning = body.warnings.length ? `<b class="is-warning">${escapeHtml(body.warnings.join("・"))}</b>` : "<b>行動可能</b>";
  const lifeActions = model.lifeActions.map((action) => `<button type="button" data-life-action="${action.id}"><strong>${escapeHtml(action.name)}</strong><small>${escapeHtml(action.description)}</small></button>`).join("");
  const livelihood = model.livelihood;
  const activeContract = livelihood.activeContract;
  const contractArea = activeContract
    ? `<article class="life-active-contract"><header><div><small>ACTIVE WORK</small><h3>${escapeHtml(activeContract.title)}</h3></div><b>${escapeHtml(activeContract.risk)}</b></header><p>${escapeHtml(activeContract.description)}</p><dl><div><dt>目的地</dt><dd>${escapeHtml(activeContract.targetRegionName)}</dd></div><div><dt>期限</dt><dd>${escapeHtml(lifeClockLabel(activeContract.deadlineMinutes))}</dd></div><div><dt>報酬</dt><dd>財産${activeContract.reward.wealth}・名声${activeContract.reward.renown}</dd></div></dl>${livelihood.currentRegionId === activeContract.targetRegionId
      ? `<button type="button" data-livelihood-complete><strong>仕事を完了・報告する</strong><small>時間、疲労、報酬を確定</small></button>`
      : `<button type="button" data-livelihood-target="${activeContract.targetRegionId}"><strong>${escapeHtml(activeContract.targetRegionName)}を地図で選ぶ</strong><small>通常の地方移動で目的地へ向かう</small></button>`}</article>`
    : `<div class="livelihood-offer-grid">${livelihood.offers.map((offer) => `<article><header><div><small>${escapeHtml(offer.kind.toUpperCase())}</small><h3>${escapeHtml(offer.title)}</h3></div><b>${escapeHtml(offer.risk)}</b></header><p>${escapeHtml(offer.description)}</p><dl><div><dt>目的地</dt><dd>${escapeHtml(offer.targetRegionName)}</dd></div><div><dt>期限</dt><dd>${escapeHtml(lifeClockLabel(offer.deadlineMinutes))}</dd></div><div><dt>報酬</dt><dd>財産${offer.reward.wealth}・名声${offer.reward.renown}</dd></div></dl><button type="button" data-livelihood-accept="${offer.id}">この仕事を受ける</button></article>`).join("")}</div>`;
  const companions = model.companions.map((member) => {
    const memberName = WORLD.characters[member.id]?.name ?? member.name;
    const request = member.request ? `<p class="companion-request"><strong>要望</strong><span>${escapeHtml(member.request.text)}</span><button type="button" data-companion-request="${member.id}" data-companion-decision="accept">応じる</button><button type="button" data-companion-request="${member.id}" data-companion-decision="refuse">断る</button></p>` : "";
    const wage = member.wageArrears > 0 && member.status !== "departed" ? `<button type="button" data-companion-wages="${member.id}">未払い${member.wageArrears}か月を払う（財産${member.wageArrears * member.monthlyWage}）</button>` : "";
    return `<article class="companion-agency-card is-${member.status}"><header><div><small>${escapeHtml(member.role)}</small><h3>${escapeHtml(memberName)}</h3></div><b>${member.status === "departed" ? "離脱" : `忠誠${member.loyalty}`}</b></header><p>${escapeHtml(member.aspiration)}</p><dl><div><dt>士気</dt><dd>${member.morale}</dd></div><div><dt>恐怖</dt><dd>${member.fear}</dd></div><div><dt>月給</dt><dd>${member.monthlyWage}</dd></div></dl>${request}${wage}</article>`;
  }).join("") || "<p>同行者を酒場で迎えると、賃金・忠誠・要望がここに現れます。</p>";
  const fief = model.fief.available ? `<details class="life-loop-section"><summary><span>所領</span><strong>担当者・予算・工期</strong><small>進行中 ${model.fief.projects.length}件</small></summary><div class="life-loop-content">${model.fief.projects.map((project) => `<article class="fief-project-progress"><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(careerTerritoryName(project.territoryId))} · 担当 ${escapeHtml(WORLD.characters[project.officerId]?.name ?? project.officerId)} · 残り${project.remainingMonths}か月</span></article>`).join("") || "<p>今月着手する事業を選べます。効果は完成月まで発生しません。</p>"}<div class="fief-project-grid">${model.fief.definitions.map((project) => `<article data-fief-project-card><header><h3>${escapeHtml(project.name)}</h3><b>${project.duration}か月</b></header><p>${escapeHtml(project.description)}</p><small>所領金庫${project.cost} · ${escapeHtml(project.effect)}</small><label>所領<select data-fief-territory>${model.fief.holdings.map((holding) => `<option value="${holding.territoryId}">${escapeHtml(careerTerritoryName(holding.territoryId))}</option>`).join("")}</select></label><label>担当<select data-fief-officer>${model.fief.officers.map((officer) => `<option value="${officer.id}">${escapeHtml(WORLD.characters[officer.id]?.name ?? officer.name)}</option>`).join("")}</select></label><button type="button" data-fief-project="${project.id}">着工する</button></article>`).join("")}</div></div></details>` : "";
  const household = model.household.available ? `<details class="life-loop-section"><summary><span>家中</span><strong>功績・恩賞・忠誠</strong><small>派閥緊張 ${model.household.factionTension}</small></summary><div class="life-loop-content household-merit-grid">${model.household.members.map((member) => `<article data-household-member="${member.id}"><header><div><small>${escapeHtml(member.rank ?? "家臣")}</small><h3>${escapeHtml(WORLD.characters[member.id]?.name ?? member.name)}</h3></div><b>忠誠${member.loyalty}</b></header><p>功績 ${member.merit}${member.demand ? ` · ${escapeHtml(member.demand.text)}` : " · 現状に大きな不満なし"}</p><div>${model.household.rewards.map((reward) => `<button type="button" data-household-reward="${reward.id}" data-household-officer="${member.id}" title="${escapeHtml(reward.description)}">${escapeHtml(reward.name)}</button>`).join("")}</div></article>`).join("") || "<p>直属家臣ができると功績と恩賞要求が現れます。</p>"}</div></details>` : "";
  const campaign = model.campaign.available ? `<details class="life-loop-section"><summary><span>戦役</span><strong>二軍団・補給・政治目的</strong><small>${model.campaign.active ? escapeHtml(model.campaign.active.phase) : "待機"}</small></summary><div class="life-loop-content">${model.campaign.active
    ? `<article class="realm-campaign-active"><header><div><small>${escapeHtml(model.campaign.active.objectiveName)}</small><h3>${escapeHtml(model.campaign.active.targetRegionName)}戦役</h3></div><b>${escapeHtml(model.campaign.active.phase)}</b></header><div>${model.campaign.active.armies.map((army) => `<p><strong>${escapeHtml(army.name)} · ${escapeHtml(WORLD.characters[army.commanderId]?.name ?? army.commanderName)}</strong><span>戦力${army.strength}・補給${army.supply}/${army.initialSupply}・損害${army.casualties}</span></p>`).join("")}</div><button type="button" data-realm-campaign-advance>戦役を一段階進める</button></article>`
    : `<article data-realm-campaign-form><p>二つの軍団へ別々の指揮官と補給を割り当て、集結・行軍・会戦を順番に処理します。</p><label>対象地方<select data-campaign-target>${model.campaign.options.map((option) => `<option value="${option.targetRegionId}">${escapeHtml(option.targetRegionName)} · ${option.borderType === "foreign" ? "国外" : "国内"}</option>`).join("")}</select></label><label>政治目的<select data-campaign-objective>${model.campaign.objectives.map((objective) => `<option value="${objective.id}">${escapeHtml(objective.name)}</option>`).join("")}</select></label><label>主力軍<select data-campaign-commander="first">${model.campaign.commanders.map((commander) => `<option value="${commander.id}">${escapeHtml(WORLD.characters[commander.id]?.name ?? commander.name)}</option>`).join("")}</select></label><label>支援軍<select data-campaign-commander="second">${model.campaign.commanders.map((commander, index) => `<option value="${commander.id}" ${index === 1 ? "selected" : ""}>${escapeHtml(WORLD.characters[commander.id]?.name ?? commander.name)}</option>`).join("")}</select></label><button type="button" data-realm-campaign-start>二軍団を集結させる（財産5）</button></article>`}</div></details>` : "";
  const lifePath = `<details class="life-loop-section"><summary><span>生き方</span><strong>${escapeHtml(model.lifePath.active?.name ?? "人生目標を選ぶ")}</strong><small>${model.lifePath.epithets.length ? escapeHtml(model.lifePath.epithets.join("・")) : "二つ名なし"}</small></summary><div class="life-loop-content life-path-grid">${model.lifePath.paths.map((path) => `<article class="${path.id === model.lifePath.active?.id ? "is-active" : ""}"><header><h3>${escapeHtml(path.name)}</h3><b>${path.claimed ? "達成済" : path.complete ? "達成" : "進行中"}</b></header><p>${escapeHtml(path.description)}</p><ul>${path.checks.map((check) => `<li>${escapeHtml(check.label)} ${Math.min(check.value, check.target)}/${check.target}</li>`).join("")}</ul><button type="button" data-life-path="${path.id}">${path.id === model.lifePath.active?.id ? "選択中" : "この生き方を追う"}</button>${path.id === model.lifePath.active?.id && path.complete && !path.claimed ? `<button type="button" data-life-path-claim>二つ名「${escapeHtml(path.epithet)}」を受ける</button>` : ""}</article>`).join("")}</div></details>`;
  const succession = model.succession.available ? `<details class="life-loop-section"><summary><span>継承</span><strong>第${model.succession.generation}代</strong><small>${model.succession.heirId ? "後継指名済み" : "後継未定"}</small></summary><div class="life-loop-content" data-succession-form><p>現君主を退位させ、同じ世界・国家・所領・年代記を次代へ渡します。</p><label>後継者<select data-succession-heir>${model.succession.candidates.map((candidate) => `<option value="${candidate.id}" ${candidate.id === model.succession.heirId ? "selected" : ""}>${escapeHtml(WORLD.characters[candidate.id]?.name ?? candidate.name)} · ${escapeHtml(candidate.role)}</option>`).join("")}</select></label><button type="button" data-designate-heir>後継者として公示する</button><label>継ぐ遺産<select data-succession-legacy>${model.succession.choices.map((choice) => `<option value="${choice.id}">${escapeHtml(choice.name)} — ${escapeHtml(choice.description)}</option>`).join("")}</select></label><button class="is-danger" type="button" data-execute-succession ${model.succession.heirId ? "" : "disabled"}>退位し、次代の年代記を始める</button></div></details>` : "";
  return `<section class="life-to-realm-board"><header><div><small>LIFE TO REALM</small><h2>生活から国家へ</h2></div><p>時間、身体、仕事、仲間、所領、家中、戦役、継承を同じ人物状態で扱います。</p></header><section class="life-vitals"><article><small>世界時刻</small><strong>${escapeHtml(lifeClockLabel(model.clockMinutes))}</strong><span>移動と生活行動で進行</span></article><article><small>身体</small><strong>HP ${body.hp}/${body.maxHp}</strong><span>空腹${body.hunger}・疲労${body.fatigue}</span></article><article><small>生活基盤</small><strong>${escapeHtml(model.home.name)}</strong><span>家賃${model.home.monthlyRent}・負債${model.home.debt}</span></article>${warning}</section><details class="life-loop-section" open><summary><span>一日</span><strong>食事・労働・休養</strong><small>財産${state.player.metrics.wealth}・食料${body.food}</small></summary><div class="life-loop-content life-action-grid">${lifeActions}</div></details><details class="life-loop-section" open><summary><span>生計</span><strong>${activeContract ? escapeHtml(activeContract.title) : `${escapeHtml(livelihood.currentRegionName)}の仕事3件`}</strong><small>期限と移動を比較</small></summary><div class="life-loop-content">${contractArea}</div></details>${renderPropertyEnterpriseBoard()}<details class="life-loop-section"><summary><span>仲間</span><strong>賃金・忠誠・要望</strong><small>${model.companions.length}名</small></summary><div class="life-loop-content companion-agency-grid">${companions}</div></details>${renderCompanionQuestBoard()}${fief}${renderEstatePoliticsBoard()}${household}${campaign}${renderGeneratedCampaignBoard()}${lifePath}${succession}</section>`;
}

function careerActionButtons(player) {
  const advancement = getCareerAdvancementView(state);
  const secondFiefCandidates = player.stage === "lord" ? getSecondFiefCandidates(state) : [];
  const advancementCard = advancement ? `<article class="career-promotion-action" data-career-action-card>
    ${player.stage === "multi_lord" ? promotionDelegationFields("multi_lord") : ""}
    ${advancement.actionId === "assume_crown" ? governmentFormFields() : ""}
    <button type="button" data-career-action="${advancement.actionId}" ${advancement.ready ? "" : "disabled"}><strong>${escapeHtml(advancement.name)}</strong><small>${advancement.requirements.map((entry) => `${escapeHtml(entry.label)} ${Math.min(entry.value, entry.target)}/${entry.target}`).join("・")}</small></button>
  </article>` : "";
  if (player.stage === "individual" && !player.invitations.length) {
    return `<button class="career-primary-action career-village-route" type="button" data-panel="world"><strong>地方地図で村を探す</strong><small>村の酒場で依頼を受け、仲間を集めてから出発する</small></button>`;
  }
  if (player.stage === "individual") return "";
  if (["retainer", "commander"].includes(player.stage)) return renderMilitaryCareerMission(player);
  if (player.stage === "castellan") return advancementCard;
  if (["lord", "multi_lord", "governor", "duke", "regent"].includes(player.stage)) {
    const independenceHandoff = ["lord", "multi_lord"].includes(player.stage) ? promotionDelegationFields(player.stage) : "";
    return `
      ${["lord", "multi_lord", "governor", "duke"].includes(player.stage) ? `<button type="button" data-career-action="consolidate_power"><strong>領内基盤を固める</strong><small>家臣・領民・地方豪族の支持と正統性を積む。中央の警戒も強まる</small></button>` : ""}
      ${player.stage === "lord" ? `<article class="career-promotion-action" data-career-action-card>${promotionDelegationFields("lord")}<label>加増を願う地方<select data-second-fief-region>${secondFiefCandidates.map((region) => `<option value="${region.id}">${escapeHtml(region.name)}</option>`).join("")}</select></label><button type="button" data-career-action="request_second_fief" ${secondFiefCandidates.length ? "" : "disabled"}><strong>第二の所領を願い出る</strong><small>${secondFiefCandidates.length ? "主君領内の別地方を選び、旧所領の日常統治を代官へ引き継ぐ" : "主君領内に加増可能な別地方がない"}</small></button></article>` : ""}
      ${advancementCard}
      ${player.stage !== "regent" ? `<article class="career-promotion-action government-form-action" data-career-action-card>${independenceHandoff}${governmentFormFields()}<button class="is-danger" type="button" data-career-action="declare_independence"><strong>辺境に新国家を建てる</strong><small>家臣支持55・領民支持50・正統性30が必要。現在の実務は後任へ委任し、旧主君との関係を失う</small></button></article>` : ""}`;
  }
  return "";
}

function roleDelegationSection() {
  const overview = getRoleDelegation(state);
  if (!overview?.assignments.length) return "";
  const assignments = overview.assignments.map((assignment) => {
    const eligible = assignment.eligibleOfficerIds.map((id) => WORLD.characters[id]).filter(Boolean);
    const organizationName = assignment.organizationType === "unit"
      ? assignment.organization?.name ?? assignment.organizationId
      : WORLD.provinces[assignment.territoryId]?.name ?? assignment.territoryId;
    const report = assignment.lastReport;
    return `<article class="delegation-assignment ${report?.requiresDecision ? "needs-decision" : ""}">
      <header><div><small>${assignment.organizationType === "unit" ? "UNIT COMMAND" : "TERRITORY OFFICE"}</small><h3>${assignment.role.delegatedName}</h3></div><b>${escapeHtml(organizationName)}</b></header>
      <div class="delegation-holder"><strong>${escapeHtml(assignment.holder?.name ?? "空席")}</strong><span>経験 ${assignment.experience} · 名声 ${assignment.reputation} · 現地影響 ${assignment.localInfluence} · 支持基盤 ${assignment.supportBase}</span></div>
      <div class="delegation-controls">
        <label>担当者<select data-reassign-delegation="${assignment.id}">${eligible.map((officer) => `<option value="${officer.id}" ${officer.id === assignment.holderId ? "selected" : ""}>${escapeHtml(officer.name)}</option>`).join("")}</select></label>
        <label>方針<select data-delegation-mandate="${assignment.id}">${Object.values(DELEGATION_MANDATES).map((mandate) => `<option value="${mandate.id}" ${mandate.id === assignment.mandateId ? "selected" : ""}>${mandate.name}</option>`).join("")}</select></label>
        <label>裁量<select data-delegation-authority="${assignment.id}">${Object.values(DELEGATION_AUTHORITY_LEVELS).map((authority) => `<option value="${authority.id}" ${authority.id === assignment.authorityId ? "selected" : ""}>${authority.name}</option>`).join("")}</select></label>
      </div>
      ${report ? `<p class="delegation-latest-report"><strong>${escapeHtml(report.title)} · ${report.grade}</strong><span>${escapeHtml(report.summary)}</span>${report.requiresDecision ? "<b>上位判断が必要</b>" : ""}</p>` : `<p class="delegation-latest-report"><span>次の月次進行から担当者が自律的に実務を処理します。</span></p>`}
    </article>`;
  }).join("");
  const reports = overview.latestReports.slice(0, 4).map((report) => `<li class="is-${report.severity}"><strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.summary)}</span><small>${report.grade}</small></li>`).join("");
  return `<section class="role-delegation-board"><header><div><small>DELEGATED RESPONSIBILITIES</small><h2>役割委任</h2></div><p>人選・方針・裁量を示し、通常実務は担当者へ任せます。</p></header><div class="delegation-assignment-grid">${assignments}</div>${reports ? `<div class="delegation-report-list"><h3>簡潔な実務報告</h3><ul>${reports}</ul></div>` : ""}</section>`;
}

function villageConditionSummary(life) {
  const conditions = [...life.statusConditions, ...life.injuries, ...life.diseases, ...life.curses];
  return conditions.length ? conditions.join("・") : "健康";
}

function partyConditionSummary(life) {
  return life.party.map((member) => {
    if (member.alive === false) return `${member.name}：戦闘不能`;
    return `${member.name}：HP ${member.hp ?? member.maxHp ?? "?"}/${member.maxHp ?? "?"}${member.battleState && member.battleState !== "READY" ? `・${tacticalStateLabel(member.battleState)}` : ""}`;
  }).join(" / ") || "単独行動";
}

const GUILD_PROCESSED_GOOD_ACTION_IDS = new Set(GUILD_PROCESSED_GOODS.map((good) => good.actionId));

const HUMAN_CONVERSATION_PORTRAIT = "./assets/generated/player-conversation-human.png";

function playerConversationPortrait() {
  if (state.player.raceId === "human") return { image: HUMAN_CONVERSATION_PORTRAIT, transparent: true };
  return {
    image: PEOPLE_REPRESENTATIVES[state.player.raceId]?.image ?? PEOPLE_REPRESENTATIVES.human.image,
    transparent: false,
  };
}

const VILLAGE_DIALOGUE_CAST = Object.freeze({
  inn: Object.freeze({ name: "宿の女将", role: "宿屋", image: "./assets/generated/race-basics/race-human-female.webp", prompt: "旅の埃を落としていきな。必要な支度は整えておくよ。", reply: "助かる。次の旅に響かないよう、きちんと整えたい。" }),
  shop: Object.freeze({ name: "旅商人ミレル", role: "商店", image: "./assets/generated/officer-mirel.webp", prompt: "品は街道向けに選んである。必要なものを言ってくれ。", reply: "手持ちと旅程を見て決めよう。これを頼む。" }),
  smithy: Object.freeze({ name: "村鍛冶グラム", role: "鍛冶屋", image: "./assets/generated/race-basics/race-dwarf-male.webp", prompt: "刃も鎧も、壊れる前なら手を入れられる。見せてみな。", reply: "頼む。道中で命を預ける装備だ。" }),
  tavern: Object.freeze({ name: "酒場女将", role: "酒場", image: "./assets/generated/tavern-hostess.png", transparent: true, prompt: "人も噂も今夜は集まっている。どの縁を探す？", reply: "まずは話を聞こう。旅を共にできる相手を見極めたい。" }),
  guild: Object.freeze({ name: UNIQUE_CHARACTERS[MARIELLE_CROIX_ID].name, role: "冒険者ギルド主任受付官", image: `./${UNIQUE_CHARACTERS[MARIELLE_CROIX_ID].portraitImage}`, transparent: true, prompt: "赤札は危険、青札は期限、金札は達成証拠です。三枚とも確認しますか？", reply: "確認する。仲間の役割も整え、最後まで報告を返そう。" }),
  guild_shop: Object.freeze({ name: UNIQUE_CHARACTERS[COLETTE_LINDE_ID].name, role: "冒険者ギルド補給事務員", image: `./${UNIQUE_CHARACTERS[COLETTE_LINDE_ID].portraitImage}`, transparent: true, prompt: "用途を伺ってから、封蝋印・ロット番号・使用期限を照合します。どの加工品が必要ですか？", reply: "旅程と用途に合う品を選びたい。番号まで確認して、それを頼む。" }),
  temple: Object.freeze({ name: "巡礼医リネア", role: "神殿・治療所", image: "./assets/generated/race-basics/race-angel-female.webp", prompt: "傷も病も、隠せば旅先で重くなります。こちらへ。", reply: "診てほしい。仲間も含め、万全にしておきたい。" }),
  training: Object.freeze({ name: "教官ガイウス", role: "訓練所", image: "./assets/generated/officer-gaius.webp", prompt: "望む強さを言葉にしろ。鍛え方は目的で変わる。", reply: "先へ進むために必要な力を鍛えたい。付き合ってくれ。" }),
  warehouse: Object.freeze({ name: "倉番エドラス", role: "倉庫", image: "./assets/generated/officer-edras.webp", prompt: "預かり札と荷を照合する。出し入れする品はどれだ？", reply: "携行品を軽くしたい。これを整理してくれ。" }),
  villagers: Object.freeze({ name: "村の青年ノエル", role: "村人との交流", image: "./assets/generated/race-basics/race-human-male.webp", prompt: "旅人さん、少し話していかないか。外の話も聞きたいんだ。", reply: "もちろんだ。代わりに、この辺りのことも教えてほしい。" }),
  development: Object.freeze({ name: "村長イルヴァ", role: "村の発展", image: "./assets/generated/officer-ilva.webp", prompt: "村を良くする案なら、皆の前で筋道を聞かせてほしい。", reply: "一時の施しではなく、村に残る形で手を貸したい。" }),
  preparation: Object.freeze({ name: "案内人マーラ", role: "探索準備", image: "./assets/generated/officer-mara.webp", prompt: "出発前の確認をしよう。忘れ物は奥地では取り返せない。", reply: "頼む。仲間と荷を確かめてから出よう。" }),
});

const VILLAGE_MAIN_ART = "./assets/generated/village-main-square.png";

const LOCATION_SCENE_DEFINITIONS = Object.freeze({
  castle: Object.freeze({
    symbol: "城",
    eyebrow: "CASTLE COMMAND",
    art: "./assets/generated/castle-main-courtyard.png",
    summary: "城門、宮廷、兵舎、書記局を訪ね、国家中枢での用件を選ぶ。",
    zones: Object.freeze([
      { id: "gate", icon: "門", name: "城門", summary: "門衛へ身分と訪問目的を伝える。", actions: [
        { id: "castle_identity", name: "身分を申告する", description: "現在の称号と所属を門衛へ示し、入城手続きを確認する。" },
        { id: "castle_proclamation", name: "城門の布告を確認", description: "城が属する国家と地方の公的な案内を読む。" },
      ] },
      { id: "court", icon: "廷", name: "大広間", summary: "城主や宮廷への取次ぎを願う。", actions: [
        { id: "castle_audience", name: "謁見を願い出る", description: "功績と現在の立場を添えて、謁見の受付状況を確かめる。" },
        { id: "castle_career", name: "仕官と身分を確認", description: "届いている仕官招請と現在の身分を人物画面で確認する。", route: "career" },
      ] },
      { id: "barracks", icon: "兵", name: "兵舎", summary: "守備隊と城内警備の状況を聞く。", actions: [
        { id: "castle_garrison", name: "守備隊の編制を見る", description: "城を守る兵の役割と、周辺地方への備えを確認する。" },
        { id: "castle_command", name: "軍務の窓口を訪ねる", description: "現在の立場で受けられる軍務や命令の有無を確かめる。" },
      ] },
      { id: "archive", icon: "書", name: "書記局", summary: "地方、地勢、所属国の記録を照合する。", actions: [
        { id: "castle_region", name: "地方台帳を読む", description: "城が管轄する地方と現在地の地勢を確認する。" },
        { id: "castle_nation", name: "国家記録を読む", description: "城の所属国と統治の中枢であることを確認する。" },
      ] },
    ]),
  }),
  fort: Object.freeze({
    symbol: "砦",
    eyebrow: "FORT COMMAND",
    art: "./assets/generated/fort-main-yard.png",
    summary: "門衛所、見張り台、兵舎、兵站庫を回り、街道と守備の状態を把握する。",
    zones: Object.freeze([
      { id: "gate", icon: "門", name: "門衛所", summary: "通行目的を告げ、街道の警戒状況を聞く。", actions: [
        { id: "fort_passage", name: "通行状況を聞く", description: "周辺の街道と門の警戒状況を門衛へ確認する。" },
        { id: "fort_identity", name: "身分を申告する", description: "現在の称号を示し、砦内で認められる行動を確認する。" },
      ] },
      { id: "tower", icon: "望", name: "見張り台", summary: "高所から周辺地形と接近路を確認する。", actions: [
        { id: "fort_scout", name: "周辺を偵察する", description: "地勢と街道を見渡し、探索隊が進む方向を確かめる。" },
        { id: "fort_signal", name: "信号設備を確認", description: "烽火と伝令が担う警戒網の状態を確認する。" },
      ] },
      { id: "garrison", icon: "兵", name: "兵舎", summary: "守備隊の警戒態勢と任務を聞く。", actions: [
        { id: "fort_garrison", name: "守備態勢を確認", description: "砦が守る地方と、現在の守備目的を確認する。" },
        { id: "fort_duty", name: "軍務の有無を聞く", description: "現在の身分で引き受けられる任務があるか確かめる。" },
      ] },
      { id: "supply", icon: "糧", name: "兵站庫", summary: "探索隊の携行品と砦の補給能力を照合する。", actions: [
        { id: "fort_supplies", name: "携行物資を点検", description: "食料、松明、所持品を数え、次の移動へ備える。" },
        { id: "fort_route", name: "補給路を確認", description: "砦が支える地方と所属国の補給線を確認する。" },
      ] },
    ]),
  }),
  dungeon: Object.freeze({
    symbol: "窟",
    eyebrow: "DUNGEON COMMAND",
    art: "./assets/generated/dungeon-main-cave.png",
    summary: "入口で危険、依頼、隊列、物資を確認してから既存の自動探索へ進む。",
    zones: Object.freeze([
      { id: "threshold", icon: "口", name: "入口", summary: "洞窟の種類と踏破状況を確認する。", actions: [
        { id: "dungeon_risk", name: "危険情報を確認", description: "洞窟の性質と、奥で想定される危険を確認する。" },
        { id: "dungeon_history", name: "踏破記録を確認", description: "この探索地が未踏か、すでに踏破済みかを照合する。" },
      ] },
      { id: "contract", icon: "依", name: "依頼", summary: "ギルド依頼と探索目的を照合する。", actions: [
        { id: "dungeon_contract", name: "受注依頼を照合", description: "この洞窟を指定する依頼があるか確認する。" },
        { id: "dungeon_objective", name: "探索目的を定める", description: "踏破、依頼達成、戦利品回収の優先順を確認する。" },
      ] },
      { id: "party", icon: "隊", name: "探索隊", summary: "主人公と同行者の人数、体力、役割を確認する。", actions: [
        { id: "dungeon_party", name: "隊列を確認", description: "同行者と現在の探索隊人数を確認する。" },
        { id: "dungeon_supplies", name: "物資を点検", description: "HP、MP、食料、松明が探索に耐えるか確認する。" },
      ] },
      { id: "depths", icon: "進", name: "深部へ", summary: "確認を終え、既存の探索・戦闘・戦利品処理へ進む。", actions: [
        { id: "dungeon_final_check", name: "出発前の最終確認", description: "依頼、同行者、物資をまとめて確認する。" },
        { id: "dungeon_start", name: "洞窟探索を開始", description: "自動探索を開始し、遭遇時は既存の戦術戦闘へ移る。", startDungeon: true },
      ] },
    ]),
  }),
});

function activeLocationSceneContext() {
  const selection = view.locationScene;
  if (!selection) return null;
  if (selection.kind === "object") {
    try {
      const site = getGeneratedWorldSiteView(state, selection.id);
      if (!site.current || !["castle", "fort"].includes(site.type)) return null;
      const terrain = GENERATED_TERRAIN_LABELS[site.tile.terrain] ?? site.tile.terrain;
      const relief = GENERATED_RELIEF_LABELS[site.tile.relief] ?? site.tile.relief;
      return {
        kind: "object",
        id: site.id,
        type: site.type,
        name: site.name,
        regionName: site.region.name,
        nationName: site.nation?.name ?? "無主地",
        terrainLabel: `${terrain}・${relief}`,
        current: site.current,
      };
    } catch {
      return null;
    }
  }
  if (selection.kind !== "dungeon") return null;
  const adventureContext = currentAdventureContext();
  const { dungeon } = getRegionAdventureSites(state, adventureContext);
  const personalMap = getPersonalMapView(state, adventureContext);
  const location = personalMap.locations.find((entry) => entry.id === selection.id);
  if (dungeon.id !== selection.id || !location?.discovered || !location.current) return null;
  const archetype = DUNGEON_ARCHETYPES[dungeon.dungeonType];
  return {
    kind: "dungeon",
    id: dungeon.id,
    type: "dungeon",
    name: dungeon.name,
    dungeonType: dungeon.dungeonType,
    dungeon,
    regionName: adventureContext.region.name,
    nationName: adventureContext.nation.name,
    terrainLabel: archetype.name,
    description: dungeon.description,
    cleared: dungeon.cleared,
    current: location.current,
  };
}

function enterLocationScene(kind, id) {
  view.locationScene = { kind, id };
  const context = activeLocationSceneContext();
  if (!context) {
    view.locationScene = null;
    throw new Error("この地点へ到着していないため、中へ入れません。");
  }
  const definition = LOCATION_SCENE_DEFINITIONS[context.type];
  view.selectedLocationZoneId = definition.zones[0].id;
  view.locationSceneResult = null;
  view.selectedGeneratedSite = null;
  view.generatedSiteInfoOpen = false;
  view.panel = "location";
  view.scale = context.type;
}

function locationSceneActionResult(context, action) {
  const life = state.player.villageLife;
  const activeParty = life.party.filter((member) => member.active && member.alive !== false);
  const contract = context.type === "dungeon"
    ? state.adventure.activeContracts.find((entry) => entry.dungeonId === context.id)
    : null;
  const messages = {
    castle_identity: `${state.player.name}は「${state.player.title}」として身分を申告した。門衛は${context.nationName}の入城記録へ訪問目的を書き留めた。`,
    castle_proclamation: `${context.name}は${context.nationName}に属し、${context.regionName}の統治と軍事を支える中枢である。`,
    castle_audience: state.player.invitations.length
      ? `${state.player.invitations.length}件の仕官招請が届いている。人物画面で主君と条件を選べる。`
      : `現在、正式な仕官招請は届いていない。村や依頼で功績と人脈を積む必要がある。`,
    castle_garrison: `${context.name}の守備隊は、城内警備と${context.regionName}の要路防衛を分担している。`,
    castle_command: getCareerStage(state).order >= 2
      ? `${state.player.title}として軍務の担当範囲を確認できる。人物画面の命令と役割を参照する。`
      : `軍務を直接指揮する地位ではない。まず仕官か功績による任官が必要である。`,
    castle_region: `${context.regionName}。地勢は${context.terrainLabel}で、城はこの地方の記録と命令を集約している。`,
    castle_nation: `${context.nationName}の城として、統治、裁判、軍事、徴税の記録が書記局へ集められている。`,
    fort_passage: `${context.name}は${context.regionName}の街道と接近路を監視している。現在地として通行記録へ登録された。`,
    fort_identity: `${state.player.name}は「${state.player.title}」として身分を申告した。砦内では見張り台、兵舎、兵站庫を確認できる。`,
    fort_scout: `見張り台から${context.terrainLabel}の地勢と${context.regionName}へ続く道を確認した。`,
    fort_signal: `烽火と伝令は${context.nationName}の近隣拠点へ警報を送るため維持されている。`,
    fort_garrison: `${context.name}の守備隊は、野戦よりも門、街道、補給線の保持を優先している。`,
    fort_duty: getCareerStage(state).order >= 2
      ? `${state.player.title}の軍務権限に応じ、人物画面で現在の指揮任務を確認できる。`
      : `守備隊から直接任務を受ける地位ではない。村の依頼と仕官経路を進める必要がある。`,
    fort_supplies: `探索隊の携行物資は食料${life.supplies.food}、松明${life.supplies.torches}、所持品${life.inventory.reduce((sum, item) => sum + (item.quantity ?? 1), 0)}点である。`,
    fort_route: `${context.name}は${context.nationName}の補給を受け、${context.regionName}の通行と守備を支えている。`,
    dungeon_risk: `${context.description} 現在地へ到着済みで、探索開始の条件を満たしている。`,
    dungeon_history: context.cleared ? `この探索地は踏破済みである。再探索して戦利品や依頼対象を探せる。` : `この探索地は未踏である。深部まで三段階の自動探索が必要になる。`,
    dungeon_contract: contract ? `受注中の依頼「${contract.title}」がこの洞窟を指定している。踏破後は受注した集落の窓口へ報告する。` : `この洞窟を指定する受注中の依頼はない。任意探索として進入できる。`,
    dungeon_objective: contract ? `優先目的は依頼達成である。戦闘と戦利品回収を経て最奥へ到達する。` : `優先目的は踏破と戦利品回収である。危険なら探索画面から撤退できる。`,
    dungeon_party: activeParty.length ? `主人公と同行者${activeParty.length}人で進む。同行者：${activeParty.map((member) => member.name).join("・")}。` : `現在は主人公一人である。依頼指定の探索では、村の酒場で同行者を集める必要がある。`,
    dungeon_supplies: `HP ${life.hp}/${life.maxHp}、MP ${life.mp}/${life.maxMp}、食料${life.supplies.food}、松明${life.supplies.torches}。`,
    dungeon_final_check: `${contract ? `依頼「${contract.title}」を受注中。` : "任意探索。"}${activeParty.length ? `同行${activeParty.length}人。` : "単独行動。"}食料${life.supplies.food}、松明${life.supplies.torches}で出発する。`,
  };
  return {
    siteId: context.id,
    actionId: action.id,
    title: action.name,
    message: messages[action.id] ?? `${action.name}を確認した。`,
  };
}

function renderLocationStatus(context) {
  const life = state.player.villageLife;
  const activeParty = life.party.filter((member) => member.active && member.alive !== false);
  if (context.type === "dungeon") return `
    <article><small>HP / MP</small><strong>${life.hp} / ${life.mp}</strong><span>${escapeHtml(villageConditionSummary(life))}</span></article>
    <article><small>同行</small><strong>${activeParty.length}<i>人</i></strong><span>${activeParty.map((member) => escapeHtml(member.name)).join("・") || "単独行動"}</span></article>
    <article><small>食料</small><strong>${life.supplies.food}</strong><span>探索後に消費</span></article>
    <article><small>松明</small><strong>${life.supplies.torches}</strong><span>${context.cleared ? "踏破済み" : "未踏"}</span></article>`;
  return `
    <article><small>所属</small><strong>${escapeHtml(context.nationName)}</strong><span>${context.type === "castle" ? "統治中枢" : "防衛拠点"}</span></article>
    <article><small>地方</small><strong>${escapeHtml(context.regionName)}</strong><span>${escapeHtml(context.terrainLabel)}</span></article>
    <article><small>身分</small><strong>${escapeHtml(state.player.title)}</strong><span>${escapeHtml(state.player.name)}</span></article>
    <article><small>探索物資</small><strong>${life.supplies.food}<i>食</i> ${life.supplies.torches}<i>灯</i></strong><span>同行 ${activeParty.length}人</span></article>`;
}

function renderLocationWorkspace() {
  const context = activeLocationSceneContext();
  if (!context) return `<section class="village-missing"><h1>地点へ入れません</h1><p>地図上で地点へ到着してから入ってください。</p><button type="button" data-leave-location>地方地図へ戻る</button></section>`;
  const definition = LOCATION_SCENE_DEFINITIONS[context.type];
  const selected = definition.zones.find((zone) => zone.id === view.selectedLocationZoneId) ?? definition.zones[0];
  if (selected.id !== view.selectedLocationZoneId) view.selectedLocationZoneId = selected.id;
  const actions = selected.actions.map((action) => {
    const attributes = action.startDungeon
      ? `data-start-dungeon="${context.id}"`
      : action.route
        ? `data-location-route="${action.route}"`
        : `data-location-action="${action.id}"`;
    const cue = action.startDungeon ? "探索開始 →" : action.route ? "開く →" : "確認 →";
    return `<button type="button" class="village-choice-action location-choice-action" ${attributes}><span><small>${context.type.toUpperCase()} / ${selected.id.toUpperCase()}</small><strong>${escapeHtml(action.name)}</strong><p>${escapeHtml(action.description)}</p></span><b>${cue}</b></button>`;
  }).join("");
  const result = view.locationSceneResult?.siteId === context.id ? view.locationSceneResult : null;
  return `
    <header class="village-workspace-header location-workspace-header is-${context.type}" style="--village-art:url('${definition.art}')">
      <div class="village-workspace-emblem" aria-hidden="true"><i>${definition.symbol}</i><span>${definition.symbol}</span></div>
      <div><span>PERSONAL VISIT / ${escapeHtml(context.regionName)}</span><h1>${escapeHtml(context.name)}</h1><p>${escapeHtml(context.nationName)} · ${escapeHtml(definition.summary)}</p></div>
      <aside><small>現在地</small><strong>到着</strong><span>${escapeHtml(context.terrainLabel)}</span></aside>
      <nav><button type="button" data-location-route="career">人物画面</button><button type="button" data-leave-location>地方地図</button></nav>
    </header>
    <div class="village-workspace-body location-workspace-body">
      <section class="village-central-visual location-central-visual is-${context.type}" style="--village-interior-art:url('${definition.art}')">
        <section class="village-choice-overlay location-choice-overlay is-${context.type}" aria-label="${escapeHtml(context.name)}の区画と行動">
          <header><small>${definition.eyebrow}</small><div><h2>${escapeHtml(context.name)}</h2><button type="button" data-leave-location aria-label="地方地図へ戻る">×</button></div><p>${escapeHtml(definition.summary)}</p></header>
          <nav class="village-overlay-facilities location-overlay-zones" aria-label="${escapeHtml(context.name)}の区画">${definition.zones.map((zone) => `<button type="button" data-location-zone="${zone.id}" class="${zone.id === selected.id ? "is-active" : ""}" aria-pressed="${zone.id === selected.id}"><i>${zone.icon}</i><span>${escapeHtml(zone.name)}</span></button>`).join("")}</nav>
          <div class="village-overlay-actions location-overlay-actions">
            <div class="village-overlay-heading"><span><small>${context.type.toUpperCase()} / ACTIONS</small><strong>${escapeHtml(selected.name)}</strong></span><b>${selected.actions.length}件</b></div>
            <p>${escapeHtml(selected.summary)}</p>
            <div class="village-choice-list">${actions}</div>
            ${result ? `<article class="location-action-result"><i>✓</i><div><small>確認結果</small><strong>${escapeHtml(result.title)}</strong><p>${escapeHtml(result.message)}</p></div></article>` : ""}
          </div>
        </section>
        <div class="village-central-copy"><small>${context.type.toUpperCase()} / ${escapeHtml(context.regionName)}</small><h2><i>${definition.symbol}</i>${escapeHtml(selected.name)}</h2><p>${escapeHtml(selected.summary)}</p><span>${escapeHtml(context.nationName)}</span></div>
        <div class="village-central-status" aria-label="${escapeHtml(context.name)}と探索隊の状態">${renderLocationStatus(context)}</div>
      </section>
    </div>`;
}

function villageFacilityActions(village, facility) {
  return facility.actions.filter((item) => {
    if (facility.id === "tavern" && ["recruit_companion", "talk_npc"].includes(item.id)) return false;
    if (village.source === "generated" && facility.id === "guild" && item.id === "accept_request") return false;
    if (facility.id === "guild" && GUILD_PROCESSED_GOOD_ACTION_IDS.has(item.id)) return false;
    if (facility.id === "shop" && item.id === "sell_item") return false;
    if (facility.id === "preparation" && item.id === "complete_request" && state.player?.villageLife?.quests?.some((quest) => ["accepted", "active"].includes(quest.status) && quest.dungeonId)) return false;
    return true;
  });
}

function villageFacilityChoiceCount(village, facility) {
  if (facility.id === "market") return Object.keys(MERCHANT_COMMODITIES).length * 2 + 1;
  return villageFacilityActions(village, facility).length;
}

function villageActionCostLabel(availability) {
  if (availability.deferredCost) return `財産 ${availability.chargedCost}＋後払 ${availability.deferredCost}`;
  if (!availability.cost) return "費用なし";
  return availability.discountAmount > 0 ? `財産 ${availability.baseCost} → ${availability.cost}` : `財産 ${availability.cost}`;
}

function villageActionDefinition(actionId, village = activeVillageContext()) {
  return getSettlementFacilities(village ?? {}).flatMap((facility) => facility.actions.map((action) => ({ ...action, facility })))
    .find((entry) => entry.id === actionId) ?? null;
}

function villageConversationFocusSelector() {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return null;
  if (element.dataset.villageAction) return `[data-village-action="${CSS.escape(element.dataset.villageAction)}"]`;
  if (element.dataset.talkNpcCandidate) return `[data-talk-npc-candidate="${CSS.escape(element.dataset.talkNpcCandidate)}"]`;
  return null;
}

function beginVillageConversation({ kind, id, facilityId, castId = facilityId, title, counterpartName = null, counterpart = null, otherLine = null, playerLine = null, closingLine = null }) {
  const village = activeVillageContext();
  const cast = VILLAGE_DIALOGUE_CAST[castId] ?? VILLAGE_DIALOGUE_CAST.villagers;
  if (!village) throw new Error("会話する村が選択されていません。");
  villageConversationReturnFocus = villageConversationFocusSelector();
  const counterpartCast = { ...cast, ...(counterpart ?? {}), name: counterpart?.name ?? counterpartName ?? cast.name };
  view.villageConversation = {
    kind,
    id,
    facilityId,
    title,
    villageId: village.id,
    counterpart: counterpartCast,
    lineIndex: 0,
    lines: [
      { side: "other", speaker: counterpartCast.name, text: otherLine ?? counterpartCast.prompt },
      { side: "player", speaker: state.player.name, text: playerLine ?? cast.reply },
      { side: "other", speaker: counterpartCast.name, text: closingLine ?? "分かった。内容をもう一度確かめておこう。準備ができたら、この場で手続きを進める。" },
    ],
  };
  renderPanelFromTop();
  focusVillageConversation();
}

function focusVillageConversation() {
  requestAnimationFrame(() => document.querySelector(".village-conversation [data-village-dialogue-next], .village-conversation [data-npc-conversation-action], .village-conversation [data-village-dialogue-cancel]")?.focus());
}

function closeVillageConversation() {
  view.villageConversation = null;
  renderPanelFromTop();
  if (villageConversationReturnFocus) document.querySelector(villageConversationReturnFocus)?.focus();
  villageConversationReturnFocus = null;
}

function beginVillageActionConversation(actionId) {
  const definition = villageActionDefinition(actionId);
  if (!definition) throw new Error("この村行動の会話を開始できません。");
  const standing = getGuildStanding(state);
  const castId = GUILD_PROCESSED_GOOD_ACTION_IDS.has(actionId) ? "guild_shop" : definition.facility.id;
  const cast = VILLAGE_DIALOGUE_CAST[castId];
  const dungeon = actionId === "check_dungeon" ? getRegionAdventureSites(state, currentAdventureContext()).dungeon : null;
  const life = state.player.villageLife;
  const treatment = actionId === "treat_injury";
  const resurrection = actionId === "resurrect";
  const fallenCompanion = life.party.find((member) => member.alive === false);
  const woundedCompanions = life.party.filter((member) => member.alive !== false && (member.hp ?? member.maxHp ?? 1) < (member.maxHp ?? 1));
  beginVillageConversation({
    kind: "action",
    id: actionId,
    facilityId: definition.facility.id,
    castId,
    title: definition.name,
    otherLine: dungeon
      ? `${standing.greeting} 受注票と探索者の報告を照合すると、目標は「${dungeon.name}」です。入口までの経路と敵の情報を地図へ記録しますか？`
      : treatment
        ? `HPは${life.hp}/${life.maxHp}です。${life.injuries.length ? `確認できる負傷は「${life.injuries.join("・")}」。` : "戦闘後の衰弱も含めて診察します。"}${woundedCompanions.length ? ` 同行者では${woundedCompanions.map((member) => `${member.name}（HP ${member.hp}/${member.maxHp}）`).join("・")}にも治療が必要です。` : ""}`
      : resurrection && fallenCompanion
        ? `${fallenCompanion.name}は戦場でHPを失い、通常の治療では意識を戻せません。蘇生後はHP ${Math.max(1, Math.round((fallenCompanion.maxHp ?? 48) / 2))}/${fallenCompanion.maxHp ?? 48}で療養状態になります。処置を始めますか？`
      : `${standing.greeting} ${cast?.prompt ?? "用件を聞こう。"} 「${definition.name}」でよろしいですか？`,
    playerLine: dungeon
      ? "頼む。現在地から入口までの道筋と、遭遇しうる敵の構成を確認したい。"
      : treatment ? "頼む。戦闘で受けた傷を確認し、再出発できる状態まで治してほしい。"
        : resurrection && fallenCompanion ? `${fallenCompanion.name}を連れ帰るために退路を確保した。代価は払う。どうか意識を戻してほしい。` : null,
    closingLine: dungeon
      ? `${dungeon.name}を地図へ記します。まず隣接する野外地点へ移動し、そこから入口へ向かってください。`
      : treatment ? `治療費は財産${getVillageActionAvailability(state, actionId, activeVillageContext()).cost}です。主人公と生存している同行者のHPを回復し、処置内容を記録します。`
        : resurrection && fallenCompanion ? `蘇生費は財産${getVillageActionAvailability(state, actionId, activeVillageContext()).cost}です。処置後も負傷治療を受けるまで探索隊には戻せません。` : null,
  });
}

function beginNpcSocialConversation(candidate, venue = "tavern") {
  const cast = VILLAGE_DIALOGUE_CAST[venue] ?? VILLAGE_DIALOGUE_CAST.tavern;
  villageConversationReturnFocus = villageConversationFocusSelector();
  view.villageConversation = {
    kind: "npc-social",
    id: candidate.id,
    facilityId: venue,
    title: `${candidate.name}との会話`,
    counterpart: candidate.portraitImage
      ? { name: candidate.name, role: candidate.role, image: candidate.portraitImage, transparent: candidate.transparent === true }
      : { ...cast, name: candidate.name, role: candidate.role },
  };
  renderPanelFromTop();
  focusVillageConversation();
}

function renderNpcSocialConversation(conversation, village) {
  const candidate = getTavernCandidates(state, currentAdventureContext()).find((entry) => entry.id === conversation.id);
  if (!candidate) return "";
  const counterpart = conversation.counterpart;
  const playerPortrait = playerConversationPortrait();
  const result = candidate.social.lastResult;
  const resultDetail = result?.discoveryLabel && !result.reaction.includes(result.discoveryLabel) ? ` ${result.discoveryLabel}` : "";
  const resultText = result ? `${result.reaction}${resultDetail}`
    : "最初の一度だけ、どのように声をかけるかを選ぶ。第一印象は関係の始まりであり、その後の会話で取り戻すこともできる。";
  const knownPersonality = candidate.social.personality ? `性格：${candidate.social.personality.name}` : "人柄はまだ分からない";
  const knownDetails = [candidate.social.value, ...candidate.social.history, ...candidate.social.abilityInsights].filter(Boolean);
  const recruitment = candidate.social.recruitment;
  const actionButtons = candidate.joined
    ? `<button type="button" data-village-dialogue-cancel>会話を終える<span>→</span></button>`
    : `${candidate.social.availableActions.map((action) => `<button type="button" data-npc-conversation-action="${action.id}" ${action.allowed ? "" : "disabled"} title="${escapeHtml(action.reason ?? action.description ?? "")}">${escapeHtml(action.name)}${action.cost ? `<small>財産${action.cost}</small>` : ""}<span>→</span></button>`).join("")}<button type="button" data-village-dialogue-cancel>会話を終える<span>×</span></button>`;
  return `<section class="village-conversation npc-social-conversation" role="dialog" aria-modal="true" aria-labelledby="villageConversationTitle" style="--conversation-art:url('${villageFacilityArt(conversation.facilityId)}')">
    <header><div><small>${escapeHtml(village.name)} / ${conversation.facilityId === "guild" ? "冒険者ギルド" : "酒場"}</small><h1 id="villageConversationTitle">${escapeHtml(conversation.title)}</h1></div><button type="button" data-village-dialogue-cancel aria-label="会話をやめる">×</button></header>
    <div class="village-conversation-stage">
      <figure class="conversation-character is-player ${playerPortrait.transparent ? "has-transparent-art" : ""}"><img src="${escapeHtml(playerPortrait.image)}" alt="${escapeHtml(state.player.name)}"><figcaption><small>主人公</small><strong>${escapeHtml(state.player.name)}</strong></figcaption></figure>
      <div class="conversation-place"><span>${escapeHtml(knownPersonality)}</span><strong>${escapeHtml(candidate.social.relationship.name)}</strong></div>
      <figure class="conversation-character is-other ${counterpart.transparent ? "has-transparent-art" : ""}"><img src="${escapeHtml(counterpart.image)}" alt="${escapeHtml(counterpart.name)}"><figcaption><small>${escapeHtml(counterpart.role)}</small><strong>${escapeHtml(counterpart.name)}</strong></figcaption></figure>
    </div>
    <footer class="conversation-message story-text-window npc-social-message">
      <div class="npc-conversation-result"><small>${result ? result.joined ? "PARTY JOINED" : "REACTION" : "FIRST CONTACT"}</small><strong>${escapeHtml(candidate.name)}</strong><p>${escapeHtml(resultText)}</p><span>${candidate.social.firstMeetingComplete ? `関係：${escapeHtml(candidate.social.relationship.name)} · 会話${candidate.social.interactions}回` : `魅力 ${state.player.abilities?.charisma ?? 10}で第一印象を判定`}</span></div>
      <section class="npc-known-profile" aria-label="判明した人物情報"><h2>分かったこと</h2><p><b>人柄</b>${escapeHtml(knownPersonality)}</p>${knownDetails.length ? `<ul>${knownDetails.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : "<p>経歴や腕前は、まだ推し量れない。</p>"}${recruitment ? `<aside><b>加入条件 · ${escapeHtml(recruitment.name)}</b><span>${escapeHtml(recruitment.summary)}</span><small>${escapeHtml(recruitment.hint)}</small></aside>` : "<aside><b>加入条件</b><span>仕事の話をすれば、同行する理由を確かめられる。</span></aside>"}</section>
      <nav aria-label="会話行動">${actionButtons}</nav>
    </footer>
  </section>`;
}

function renderVillageConversation() {
  const conversation = view.villageConversation;
  const village = activeVillageContext();
  if (!conversation || !village) return "";
  if (conversation.kind === "npc-social") return renderNpcSocialConversation(conversation, village);
  const line = conversation.lines[conversation.lineIndex] ?? conversation.lines[0];
  const counterpart = conversation.counterpart;
  const playerPortrait = playerConversationPortrait();
  const finalLine = conversation.lineIndex >= conversation.lines.length - 1;
  const quickLabel = conversation.kind === "contract" ? "この内容で受注" : conversation.kind.startsWith("party-") ? "この内容で決定" : "説明を省略して実行";
  return `<section class="village-conversation" role="dialog" aria-modal="true" aria-labelledby="villageConversationTitle" style="--conversation-art:url('${villageFacilityArt(conversation.facilityId)}')">
    <header><div><small>${escapeHtml(village.name)} / ${escapeHtml(counterpart.role)}</small><h1 id="villageConversationTitle">${escapeHtml(conversation.title)}</h1></div><button type="button" data-village-dialogue-cancel aria-label="会話をやめる">×</button></header>
    <div class="village-conversation-stage">
      <figure class="conversation-character is-player ${playerPortrait.transparent ? "has-transparent-art" : ""} ${line.side === "player" ? "is-speaking" : ""}"><img src="${escapeHtml(playerPortrait.image)}" alt="${escapeHtml(state.player.name)}"><figcaption><small>主人公</small><strong>${escapeHtml(state.player.name)}</strong></figcaption></figure>
      <div class="conversation-place"><span>${escapeHtml(village.name)}</span><strong>${escapeHtml(conversation.title)}</strong></div>
      <figure class="conversation-character is-other ${counterpart.transparent ? "has-transparent-art" : ""} ${line.side === "other" ? "is-speaking" : ""}"><img src="${escapeHtml(counterpart.image)}" alt="${escapeHtml(counterpart.name)}"><figcaption><small>${escapeHtml(counterpart.role)}</small><strong>${escapeHtml(counterpart.name)}</strong></figcaption></figure>
    </div>
    <footer class="conversation-message story-text-window"><div><small>${line.side === "player" ? "PLAYER" : "VILLAGER"}</small><strong>${escapeHtml(line.speaker)}</strong><p>${escapeHtml(line.text)}</p></div><nav class="conversation-actions"><button type="button" data-village-dialogue-next>${finalLine ? "この行動を実行" : "返答する"}<span>→</span></button>${finalLine ? "" : `<button class="is-quick" type="button" data-village-dialogue-skip>${quickLabel}<span>»</span></button>`}</nav></footer>
  </section>`;
}

function completeVillageConversation() {
  const conversation = view.villageConversation;
  if (!conversation) return;
  view.villageConversation = null;
  try {
    if (conversation.kind === "action") {
      const village = activeVillageContext();
      let next = performVillageAction(state, village, conversation.id);
      if (conversation.id === "check_dungeon") next = revealRegionDungeon(next, currentAdventureContext());
      commit(next, next.player.villageLife.lastAction.message, conversation.id === "save" ? "confirm" : "ui");
      return;
    }
    if (conversation.kind === "contract") {
      const next = acceptGuildContract(state, conversation.id, currentAdventureContext());
      const village = activeVillageContext();
      const venueName = village?.settlementLevel === "village" || village?.type === "village" ? "酒場" : "冒険者ギルド";
      const quest = next.player?.villageLife?.quests?.find((entry) => entry.id === conversation.id);
      commit(next, quest?.status === "completed"
        ? `所持していた討伐戦利品が証明として認められました。${venueName}で達成報告できます。`
        : `${venueName}の依頼を受注し、指定ダンジョンを個人マップへ記録しました。隣接地点を経由して入口へ向かえます。`, "confirm");
      return;
    }
    if (conversation.kind === "party-accept") {
      const next = acceptPartyInvitation(state, conversation.id, currentAdventureContext());
      const member = next.adventure.party.at(-1);
      commit(next, `${member.name}からの誘いを受け、パーティーを組みました。`, "confirm");
      return;
    }
    if (conversation.kind === "party-invite") {
      const next = inviteTavernCandidate(state, conversation.id, currentAdventureContext());
      const member = next.adventure.party.at(-1);
      commit(next, `${member.name}を誘い、パーティーへ迎えました。`, "confirm");
    }
  } catch (error) {
    renderPanelFromTop();
    showToast(error.message, "danger");
  }
}

function crimePreviewCard(action, opportunity, preview, jurisdictionName, label) {
  const reward = preview.expectedReward?.text ?? opportunity.reward?.text ?? opportunity.loot?.text ?? "結果に応じた報酬";
  const requirements = preview.preparationRequirements ?? opportunity.preparationRequirements ?? ["現地の状況を確認する"];
  const targetName = preview.targetName ?? opportunity.target?.name ?? opportunity.cargo?.name ?? opportunity.name;
  const penalty = preview.maximumPenalty ?? opportunity.maximumPenalty ?? "拘束と法令に基づく処罰";
  return `<article class="crime-opportunity" data-crime-preview="${action}">
    <header><span><small>${escapeHtml(label)}</small><strong>${escapeHtml(targetName)}</strong></span><b>危険度 ${escapeHtml(preview.riskLabel ?? opportunity.riskLabel ?? CRIME_RISK_LABELS[2])}</b></header>
    <dl><div><dt>対象</dt><dd>${escapeHtml(targetName)}</dd></div><div><dt>管轄</dt><dd>${escapeHtml(jurisdictionName)}</dd></div><div><dt>準備</dt><dd>${requirements.map(escapeHtml).join("・")}</dd></div><div><dt>見込報酬</dt><dd>${escapeHtml(reward)}</dd></div><div><dt>最大刑罰</dt><dd>${escapeHtml(penalty)}</dd></div></dl>
    <button type="button" data-crime-action="${action}" data-crime-target="${escapeHtml(opportunity.id)}">${escapeHtml(label)}を実行</button>
  </article>`;
}

function renderSettlementCrimeSection(village) {
  if (!village) return "";
  const context = { ...currentAdventureContext(), settlement: village, jurisdictionId: village.regionId, jurisdictionName: village.regionName };
  const theftOpportunities = getSettlementTheftOpportunities(state, village, context);
  const extortionOpportunities = getSettlementExtortionOpportunities(state, village, context);
  const stolen = state.player.crime?.stolenItems ?? [];
  const contacts = state.player.crime?.contacts?.filter((entry) => entry.jurisdictionId === village.regionId) ?? [];
  const hasLocalFence = contacts.some((entry) => entry.role === "fence");
  const allUnderworldRolesKnown = ["fence", "smuggler", "broker"].every((role) => contacts.some((entry) => entry.role === role));
  const discoveryDisabled = state.player.metrics.wealth < 1 || allUnderworldRolesKnown;
  const discoveryReason = state.player.metrics.wealth < 1 ? "連絡先を探す財産1が必要です" : allUnderworldRolesKnown ? "現地の三役と接触済みです" : "酒場で財産1を使う";
  const fenceDisabled = !stolen.length || !hasLocalFence;
  const fenceReason = !stolen.length ? "換金できる盗品がありません" : !hasLocalFence ? "現地で故買屋を発見する必要があります" : `${stolen[0].name}を換金`;
  const arrangements = (state.player.crime?.extortionArrangements ?? []).filter((entry) => entry.active !== false && entry.settlementId === village.id);
  return `<section class="crime-context-section" aria-labelledby="settlementCrimeTitle">
    <header><div><small>ILLEGAL / LOCAL</small><h2 id="settlementCrimeTitle">非合法</h2></div><p>対象と管轄を確かめてから実行します。</p></header>
    <div class="crime-opportunity-grid">
      ${theftOpportunities.map((theft) => crimePreviewCard("theft", theft, previewTheft(state, theft), village.regionName, "窃盗")).join("")}
      ${extortionOpportunities.map((extortion) => crimePreviewCard("extortion", extortion, previewExtortion(state, extortion), village.regionName, extortion.mode === "recurring" ? "継続的なみかじめ" : "一度限りの恐喝")).join("")}
      ${arrangements.map((entry) => `<article class="crime-opportunity"><header><span><small>みかじめ料</small><strong>${escapeHtml(entry.targetName)}</strong></span><b>圧力 ${entry.pressure}</b></header><dl><div><dt>対象</dt><dd>${escapeHtml(entry.targetName)}</dd></div><div><dt>管轄</dt><dd>${escapeHtml(entry.jurisdictionName)}</dd></div><div><dt>準備</dt><dd>次回 ${entry.nextDueTurn}ターン</dd></div><div><dt>見込報酬</dt><dd>財産+${entry.amount}</dd></div><div><dt>最大刑罰</dt><dd>恐喝罪と報復</dd></div></dl><button type="button" data-extortion-collect="${escapeHtml(entry.id)}" ${(state.turn ?? 0) < entry.nextDueTurn ? "disabled" : ""} title="${(state.turn ?? 0) < entry.nextDueTurn ? "まだ支払日ではありません" : "みかじめ料を徴収"}">みかじめ料を徴収</button></article>`).join("")}
    </div>
    <nav class="crime-support-actions" aria-label="裏社会の行動">
      <button type="button" data-crime-support="discover" data-jurisdiction-id="${escapeHtml(village.regionId)}" aria-pressed="${contacts.length > 0}" ${discoveryDisabled ? "disabled" : ""} title="${escapeHtml(discoveryReason)}"><strong>連絡先を探す</strong><small>${escapeHtml(discoveryReason)}</small></button>
      <button type="button" data-crime-support="fence" ${stolen.length ? `data-stolen-item-id="${escapeHtml(stolen[0].id)}"` : ""} ${fenceDisabled ? "disabled" : ""} title="${escapeHtml(fenceReason)}"><strong>盗品を故買屋へ流す</strong><small>${escapeHtml(fenceReason)}</small></button>
    </nav>
    ${renderSettlementSabotage(village)}
    <p class="crime-feedback" aria-live="polite">成功・失敗と露見の結果は年代記へ記録されます。</p>
  </section>`;
}

function currentCrimeTravelContext() {
  if (!view.pendingGeneratedDestinationId) return null;
  try {
    const world = getGeneratedWorldView(state);
    const destination = world.runtime.regionById.get(view.pendingGeneratedDestinationId);
    if (!destination) return null;
    const options = getGeneratedExpeditionTravelOptions(state, destination.id);
    const travel = options.find((entry) => entry.id === view.pendingGeneratedTravelMode) ?? options[0] ?? {};
    return { origin: world.expeditionRegion, destination, travel };
  } catch { return null; }
}

function renderActiveSmuggling(active, route) {
  let currentJurisdictionId = state.player.locationId;
  try { currentJurisdictionId = getGeneratedWorldView(state).expeditionRegion.id; } catch {}
  const atDestination = currentJurisdictionId === active.destinationJurisdiction.id;
  const label = atDestination ? "密輸品を納品" : route ? "選択した地方へ実際に移動する" : "地方地図で目的地方を選ぶ";
  const action = atDestination
    ? `<button type="button" data-crime-action="smuggling" data-smuggling-next="deliver" data-crime-target="${escapeHtml(active.offerId)}" title="${escapeHtml(label)}">${escapeHtml(label)}</button>`
    : `<button type="button" disabled title="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
  return `<article class="crime-opportunity" data-crime-preview="smuggling-active"><header><span><small>運搬中の密輸</small><strong>${escapeHtml(active.cargo.name)}</strong></span><b>${escapeHtml(active.destinationJurisdiction.name)}行き</b></header><dl><div><dt>対象</dt><dd>${escapeHtml(active.cargo.name)}</dd></div><div><dt>管轄</dt><dd>${escapeHtml(active.destinationJurisdiction.name)}</dd></div><div><dt>準備</dt><dd>実際の地方移動と期限 ${active.deadlineTurn}ターン</dd></div><div><dt>見込報酬</dt><dd>${escapeHtml(active.reward.text)}</dd></div><div><dt>最大刑罰</dt><dd>積荷没収、拘束、密輸罪の処罰</dd></div></dl>${action}</article>`;
}

function renderTravelCrimeSection() {
  const route = currentCrimeTravelContext();
  const activeSmuggling = state.player.crime?.activeSmuggling;
  if (!route && !activeSmuggling) return `<section class="crime-context-section is-compact"><header><div><small>ILLEGAL / ROAD</small><h2>非合法</h2></div><p>移動先を選ぶと街道の対象が現れます。</p></header><div class="crime-opportunity-grid"><button type="button" data-crime-action="robbery" disabled title="街道の移動先を選んでください">強盗</button><button type="button" data-crime-action="smuggling" disabled title="街道の移動先を選んでください">密輸</button></div></section>`;
  const robberyOpportunities = route ? getRobberyOpportunities(state, route) : [];
  const robberyCards = robberyOpportunities.map((robbery) => crimePreviewCard("robbery", robbery, previewRobbery(state, robbery), robbery.jurisdictionName, "街道強盗")).join("");
  if (activeSmuggling) return `<section class="crime-context-section"><header><div><small>ILLEGAL / ROAD &amp; BORDER</small><h2>非合法</h2></div><p>新しい依頼ではなく、受託済みの積荷を完遂します。</p></header><div class="crime-opportunity-grid">${robberyCards}${renderActiveSmuggling(activeSmuggling, route)}${renderTravelSabotage(route)}</div><p class="crime-feedback" aria-live="polite">検問は実際に管轄境界を越えた移動で発生します。</p></section>`;
  const smugglingOffers = route ? getSmugglingOffers(state, route) : [];
  const activeLabel = activeSmuggling ? `${activeSmuggling.cargo.name} → ${activeSmuggling.destinationJurisdiction.name}` : null;
  return `<section class="crime-context-section"><header><div><small>ILLEGAL / ROAD &amp; BORDER</small><h2>非合法</h2></div><p>${activeLabel ? escapeHtml(`密輸中：${activeLabel}`) : "街道上の具体的な対象だけを表示します。"}</p></header><div class="crime-opportunity-grid">
    ${robberyCards}
    ${smugglingOffers.map((smuggling) => crimePreviewCard("smuggling", smuggling, { riskLabel: smuggling.riskLabel, targetName: smuggling.cargo.name, expectedReward: smuggling.reward, preparationRequirements: ["密輸人との接触", "国境経路の確認"], maximumPenalty: smuggling.maximumPenalty }, smuggling.destinationJurisdiction.name, "密輸を受託")).join("") || `<button type="button" data-crime-action="smuggling" disabled data-crime-stage="offer" title="現地の密輸人との接触が必要です">密輸依頼なし</button>`}
    ${renderTravelSabotage(route)}
  </div><p class="crime-feedback" aria-live="polite">検問は管轄境界を越える時だけ発生します。</p></section>`;
}

function crimeCompanionField(attribute, selected = null) {
  const companions = (state.player.villageLife?.party ?? []).filter((entry) => entry.active !== false && entry.alive !== false);
  if (selected) return `<p>参加打診：${escapeHtml(selected.name)}</p>`;
  return `<label class="crime-accomplice-field"><span>同行者の参加</span><select ${attribute}><option value="">単独で行う</option>${companions.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select><small>準備時に承諾・拒否・通報を判断します。</small></label>`;
}

function sabotageCard(target, jurisdictionName, contextKind) {
  const active = state.player.crime?.activeSabotage;
  const conflictingOperation = Boolean(active && active.target.id !== target.id);
  const stage = conflictingOperation ? "blocked" : active?.stage ?? "start";
  const companion = stage === "start" ? crimeCompanionField("data-sabotage-accomplice") : crimeCompanionField("", active?.selectedAccomplice);
  const card = crimePreviewCard("sabotage", target, { riskLabel: target.riskLabel, targetName: target.name, expectedReward: { text: "対象資産の機能低下" }, preparationRequirements: target.preparationRequirements, maximumPenalty: target.maximumPenalty }, jurisdictionName, stage === "start" ? "破壊工作を開始" : stage === "started" ? "破壊工作を準備" : "破壊工作を実行");
  return `<div data-sabotage-context="${contextKind}">${companion}${conflictingOperation ? card.replace(/<button type="button" data-crime-action="sabotage"/, '<button type="button" data-crime-action="sabotage" disabled title="別の破壊工作が進行中です"') : card}</div>`;
}

function renderTravelSabotage(route) {
  if (!route) return "";
  const routeRegions = new Set([route.origin.id, ...(route.travel.pathRegionIds ?? []), route.destination.id]);
  try {
    const roadSabotageTargets = getSabotageTargets(state).filter((entry) => entry.kind === "road" && routeRegions.has(entry.regionId));
    return roadSabotageTargets.map((target) => sabotageCard(target, target.regionId, "road")).join("");
  } catch { return ""; }
}

function renderSettlementSabotage(village) {
  try {
    const facilitySabotageTargets = getSabotageTargets(state, { regionId: village.regionId }).filter((entry) => entry.kind === "facility");
    return facilitySabotageTargets.length
      ? `<section class="crime-settlement-sabotage"><h3>施設への破壊工作</h3>${facilitySabotageTargets.map((target) => sabotageCard(target, village.regionName, "facility")).join("")}</section>`
      : "";
  } catch { return ""; }
}

function renderStrategicCrimeSection(context) {
  if (!context || context.kind !== "object") return "";
  const targets = getSabotageTargets(state, { regionId: currentAdventureContext().region.id });
  const target = targets.find((entry) => entry.backingId === context.id);
  if (!target) return "";
  return `<section class="crime-context-section"><header><div><small>ILLEGAL / STRATEGIC TARGET</small><h2>非合法</h2></div><p>実在する施設状態へ損害が反映されます。</p></header>${sabotageCard(target, context.regionName, "strategic")}</section>`;
}

function currentCrimeJurisdictionId() {
  try { return currentAdventureContext().region.id; }
  catch { return activeVillageContext()?.regionId ?? state.player.locationId; }
}

function renderCrimeStatusBoard() {
  const crime = state.player.crime ?? {};
  const jurisdictionId = currentCrimeJurisdictionId();
  const status = getCrimeStatusView(state, { jurisdictionId });
  const governedJurisdictionIds = governedCrimeJurisdictionIds();
  const canPardonHere = governedJurisdictionIds.includes(jurisdictionId);
  const heatRows = Object.entries(crime.heatByJurisdiction ?? {}).map(([id, heat]) => `<li><strong>${escapeHtml(id)}</strong><span>${getCrimeStatusView(state, { jurisdictionId: id }).heatLabel} ${heat}</span></li>`).join("");
  const contactRoleNames = { fence: "故買屋", smuggler: "密輸人", broker: "仲介人" };
  const contacts = (crime.contacts ?? []).map((entry) => `<li><strong>${escapeHtml(entry.name ?? contactRoleNames[entry.role] ?? "連絡先")}</strong><span>${escapeHtml(contactRoleNames[entry.role] ?? entry.role)} · 信頼${entry.trust}${entry.trust >= 20 ? " · 隠れ家" : ""}</span></li>`).join("");
  const incidents = (crime.incidents ?? []).slice(0, 6).map((entry) => `<li><strong>${escapeHtml(entry.historyText || entry.type)}</strong><span>${entry.resolved ? "解決済み" : entry.severity === "capital" ? "死刑相当・未解決" : entry.severity === "serious" ? "重罪・未解決" : "未解決"}</span></li>`).join("");
  const serious = (crime.incidents ?? []).some((entry) => !entry.resolved && ["serious", "capital"].includes(entry.severity));
  return `<details class="crime-status-board"><summary><span><small>CRIME / HEAT / UNDERWORLD</small><strong>犯罪歴・手配・裏社会</strong></span><b>${status.heatLabel} ${status.heat}</b></summary><div class="crime-status-content">
    <section><h3>犯罪歴と管轄</h3><ul>${incidents || "<li>犯罪歴なし</li>"}${heatRows}</ul></section>
    <section><h3>盗品・連絡先・隠れ家</h3><p>盗品 ${(crime.stolenItems ?? []).length}件 · 連絡先 ${(crime.contacts ?? []).length}人 · 隠れ家 ${status.safehouseAvailable ? "利用可" : "信頼20が必要"}</p><ul>${contacts || "<li>裏社会との接触なし</li>"}</ul></section>
    <section><h3>進行中</h3><p>密輸 ${crime.activeSmuggling ? "運搬中" : "なし"} · 恐喝 ${(crime.extortionArrangements ?? []).filter((entry) => entry.active !== false).length}件 · 工作 ${crime.activeSabotage || crime.activeAssassination ? "進行中" : "なし"}</p><p>刑罰 ${(crime.sentences ?? []).length}件 · 権力濫用 ${(crime.abuses ?? []).length}件</p></section>
    <nav class="crime-recovery-actions" aria-label="手配からの回復">
      <button type="button" data-crime-recovery="surrender" ${status.unresolvedIncidents ? "" : "disabled"} title="${status.unresolvedIncidents ? "出頭して刑に服す" : "未解決事件がありません"}">出頭・服役</button>
      <button type="button" data-crime-recovery="safehouse" ${status.safehouseAvailable ? "" : "disabled"} title="${status.safehouseAvailable ? "隠れ家へ身を隠す" : "現地の連絡先に信頼20が必要です"}">隠れ家</button>
      <button type="button" data-crime-recovery="escape" ${status.heat ? "" : "disabled"}>管轄外へ逃亡</button>
      <button type="button" data-crime-recovery="pardon" ${canPardonHere ? "" : "disabled"} title="${canPardonHere ? "自ら主権統治する管轄の手配を解く" : "外国または統治外の管轄には恩赦を出せません"}">恩赦を得る</button>
      <button type="button" data-crime-recovery="asylum" ${serious ? "" : "disabled"}>亡命・追放</button>
    </nav><p class="crime-feedback" aria-live="polite">回復行動も人物状態と年代記へ反映されます。</p>
  </div></details>`;
}

function governedCrimeJurisdictionIds() {
  if (!state.player.sovereign) return [];
  const ids = new Set(getGovernanceView(state).jurisdiction.territoryIds);
  try {
    const world = getGeneratedWorldView(state);
    const nationId = state.generatedWorld?.playerNationId;
    world.runtime.nations.regions.filter((entry) => entry.nationId === nationId).forEach((entry) => ids.add(entry.id));
  } catch {}
  return [...ids];
}

function renderPersonCrimeSection() {
  let assassinationTargets = [];
  try { assassinationTargets = getAssassinationTargets(state, { regionId: currentAdventureContext().region.id }); } catch { assassinationTargets = []; }
  const active = state.player.crime?.activeAssassination;
  const visibleTargets = active?.target ? [active.target] : assassinationTargets;
  if (!visibleTargets.length) return `<section class="crime-context-section is-compact"><header><div><small>ILLEGAL / PERSON</small><h2>非合法</h2></div><p>保護対象や対象化されていない人物は暗殺対象にできません。</p></header><button type="button" data-crime-action="assassination" disabled title="対象化可能な人物がいません">暗殺対象なし</button></section>`;
  const stage = active?.stage ?? "start";
  const companions = (state.player.villageLife?.party ?? []).filter((entry) => entry.active !== false && entry.alive !== false);
  const companionField = stage === "start" ? `<label class="crime-accomplice-field"><span>同行者の参加</span><select data-crime-accomplice><option value="">単独で行う</option>${companions.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select><small>選んだ同行者は準備時に承諾・拒否・通報を判断します。</small></label>` : active?.selectedAccomplice ? `<p>参加打診：${escapeHtml(active.selectedAccomplice.name)}</p>` : "";
  const renderAssassinationTarget = (target) => crimePreviewCard("assassination", target, { riskLabel: target.riskLabel, targetName: target.name, expectedReward: { text: "政治的障害の排除" }, preparationRequirements: target.preparationRequirements, maximumPenalty: target.maximumPenalty }, target.regionId, stage === "start" ? "暗殺計画を開始" : stage === "started" ? "暗殺計画を準備" : "暗殺を実行").replace('data-crime-action="assassination"', `data-crime-action="assassination" data-crime-stage="${stage}"`);
  const targetCards = (active ? visibleTargets.map(renderAssassinationTarget) : assassinationTargets.map(renderAssassinationTarget)).join("");
  return `<section class="crime-context-section"><header><div><small>ILLEGAL / PERSON &amp; COMPANION</small><h2>非合法</h2></div><p>同行者は参加を拒否・通報・離脱する場合があります。</p></header>${companionField}<div class="crime-opportunity-grid">${targetCards}</div></section>`;
}

function renderVillagePanel() {
  const village = activeVillageContext();
  if (!village) {
    elements.leftPanel.innerHTML = `<header class="panel-heading village-heading"><span>PERSONAL VILLAGE</span><h1>村を選択</h1><p>現在地の村から入場してください。</p></header><div class="panel-body"><button type="button" class="town-open-commands" data-leave-village="world">生成世界へ戻る</button></div>`;
    return;
  }
  const life = state.player.villageLife;
  const facilities = getSettlementFacilities(village);
  const selected = facilities.find((facility) => facility.id === view.selectedVillageFacilityId) ?? facilities[0];
  const actions = villageFacilityActions(village, selected).map((item) => {
    const availability = getVillageActionAvailability(state, item.id, village);
    const cost = villageActionCostLabel(availability);
    return `<button type="button" class="village-choice-action" data-village-action="${item.id}" ${availability.allowed ? "" : "disabled"} title="${escapeHtml(availability.reason ?? item.description)}"><span><small>${cost}</small><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.description)}</p></span><b>${availability.allowed ? "会話 →" : "不可"}</b></button>`;
  }).join("");
  elements.leftPanel.innerHTML = `
    <header class="panel-heading village-heading"><span>PERSONAL VILLAGE / ${escapeHtml(village.regionName)}</span><h1>${escapeHtml(village.name)}</h1><p>${escapeHtml(village.nationName)} · 個人行動</p></header>
    <div class="panel-body village-panel-body">
      <section class="panel-section village-vital-card"><div><small>HP</small><strong>${life.hp}<i> / ${life.maxHp}</i></strong></div><div><small>MP</small><strong>${life.mp}<i> / ${life.maxMp}</i></strong></div><p><b>${escapeHtml(villageConditionSummary(life))}</b><span>財産 ${state.player.metrics.wealth} · 食料 ${life.supplies.food} · 松明 ${life.supplies.torches}</span></p></section>
      <section class="panel-section"><div class="section-heading"><h2>施設</h2><small>${facilities.length}か所</small></div><nav class="village-panel-facilities">${facilities.map((facility) => `<button type="button" data-village-facility="${facility.id}" class="${facility.id === selected.id ? "is-active" : ""}"><i>${facility.icon}</i><span>${facility.name}</span><small>${villageFacilityChoiceCount(village, facility)}</small></button>`).join("")}</nav></section>
      <section class="panel-section village-choice-section"><div class="section-heading"><h2>${selected.name}での行動</h2><small>会話して実行</small></div><p class="village-choice-summary">${selected.summary}</p><div class="village-choice-list">${actions}</div>${villageFacilityAdventureContent(selected.id)}</section>
      ${renderSettlementCrimeSection(village)}
      <section class="panel-section village-panel-exits"><button type="button" data-leave-village="career">人物画面へ</button><button type="button" data-leave-village="world">地方地図へ</button></section>
    </div>`;
}

function renderLocationPanel() {
  const context = activeLocationSceneContext();
  if (!context) {
    elements.leftPanel.innerHTML = `<header class="panel-heading village-heading"><span>PERSONAL LOCATION</span><h1>地点へ移動</h1><p>地図上で城、洞窟、砦へ到着してください。</p></header><div class="panel-body"><button type="button" class="town-open-commands" data-leave-location>地方地図へ戻る</button></div>`;
    return;
  }
  const definition = LOCATION_SCENE_DEFINITIONS[context.type];
  elements.leftPanel.innerHTML = `<header class="panel-heading village-heading"><span>${definition.eyebrow}</span><h1>${escapeHtml(context.name)}</h1><p>${escapeHtml(context.regionName)} · ${escapeHtml(context.nationName)}</p></header><div class="panel-body"><section class="panel-section"><p class="adviser-note"><strong>${escapeHtml(definition.summary)}</strong><br>${escapeHtml(context.terrainLabel)}</p></section>${renderStrategicCrimeSection(context)}<section class="panel-section"><button type="button" class="town-open-commands" data-leave-location>地方地図へ戻る</button></section></div>`;
}

function activeGuildRequest(life) {
  return life.quests.find((quest) => quest.source === "guild" && ["accepted", "active", "completed", "reported"].includes(quest.status)) ?? null;
}

function renderVillageQuestFlow(life, village) {
  const quest = activeGuildRequest(life);
  const currentContract = quest
    ? getGuildContracts(state, currentAdventureContext()).find((contract) => contract.id === quest.id)
    : null;
  const hasParty = life.party.some((member) => member.active && member.alive !== false);
  const dungeonBound = Boolean(quest?.dungeonId && ["accepted", "active"].includes(quest.status));
  const requestVenue = village?.settlementLevel === "village" || village?.type === "village" ? "tavern" : "guild";
  const venueName = requestVenue === "tavern" ? "酒場" : "ギルド";
  const current = !quest ? 0
    : ["accepted", "active"].includes(quest.status) ? (hasParty ? 2 : 1)
      : quest.status === "completed" ? 3
        : 5;
  const steps = [`${venueName}で受注`, "酒場で仲間を集める", "依頼を達成", `${venueName}へ報告`, "功績を得る"];
  const destination = !quest ? requestVenue
    : ["accepted", "active"].includes(quest.status) ? (hasParty ? "preparation" : "tavern")
      : requestVenue;
  const nextLabel = !quest ? `${venueName}で依頼を探す`
    : ["accepted", "active"].includes(quest.status) ? (hasParty ? (dungeonBound ? "地方地図から指定ダンジョンへ出発" : "探索準備から依頼へ出発") : "酒場で仲間を募集")
      : quest.status === "completed" ? `${venueName}で達成報告`
        : `${venueName}で報酬を受け取る`;
  return `<section class="village-request-flow">
    <header><div><small>REQUEST LOOP / LOCAL MERIT</small><h2>${venueName}の依頼</h2></div><strong>地域功績 ${life.guildMerit}</strong></header>
    <ol>${steps.map((label, index) => `<li class="${index < current ? "is-complete" : index === current ? "is-current" : ""}"><i>${index < current ? "✓" : index + 1}</i><span>${label}</span></li>`).join("")}</ol>
    <article class="village-current-request">
      <div><small>${quest ? `受注中 · ${quest.status === "completed" ? "達成済み" : quest.status === "reported" ? "報告済み" : "進行中"}` : "依頼なし"}</small><strong>${escapeHtml(quest?.name ?? `${venueName}の依頼掲示を確認する`)}</strong><p>${escapeHtml(currentContract?.detail ?? quest?.objective ?? `依頼はこの集落の${venueName}で受注できます。`)}</p></div>
      <button type="button" ${dungeonBound && hasParty ? 'data-leave-village="world"' : `data-village-facility="${destination}"`}>${nextLabel} →</button>
    </article>
  </section>`;
}

function renderGuildProcessedGoodsDesk(village) {
  const clerk = UNIQUE_CHARACTERS[COLETTE_LINDE_ID];
  const goods = GUILD_PROCESSED_GOODS.map((good) => {
    const availability = getVillageActionAvailability(state, good.actionId, village);
    const discounted = availability.baseCost > availability.cost;
    return `<article class="guild-processed-good">
      <i aria-hidden="true">${good.kind === "回復薬" ? "治" : good.kind === "解毒薬" ? "解" : "魔"}</i>
      <span><small>${escapeHtml(good.kind)} · LOT SEALED</small><strong>${escapeHtml(good.name)}</strong><p>${escapeHtml(good.description)}</p></span>
      <button type="button" data-village-action="${good.actionId}" ${availability.allowed ? "" : "disabled"} title="${escapeHtml(availability.reason ?? `${good.name}を購入する`)}"><b>財産 ${availability.cost}</b>${discounted ? `<small>通常 ${availability.baseCost}</small>` : ""}<em>${availability.allowed ? "購入 →" : "購入不可"}</em></button>
    </article>`;
  }).join("");
  return `<aside class="guild-processed-goods-desk">
    <figure><img src="./${escapeHtml(clerk.portraitImage)}" alt="${escapeHtml(clerk.name)}"><figcaption>UNIQUE SUPPLY CLERK</figcaption></figure>
    <div class="guild-processed-goods-copy"><small>PROCESSED GOODS · LOT &amp; EXPIRY CHECK</small><h4>${escapeHtml(clerk.name)}</h4><p>一次素材を調合・安定化したポーション類を、封蝋印・ロット番号・使用期限まで照合して販売します。</p><ul>${clerk.guildService.duties.map((duty) => `<li>${escapeHtml(duty)}</li>`).join("")}</ul></div>
    <section class="guild-processed-goods-list" aria-label="ギルド加工品販売">${goods}</section>
  </aside>`;
}

function renderGuildAdventureBoard() {
  const context = currentAdventureContext();
  const contracts = getGuildContracts(state, context);
  const standing = getGuildStanding(state);
  const receptionist = UNIQUE_CHARACTERS[MARIELLE_CROIX_ID];
  const referralCandidates = getTavernCandidates(state, context).filter((candidate) => !candidate.joined);
  const referralNames = referralCandidates.slice(0, 3).map((candidate) => candidate.name).join("・");
  const statusLabel = { available: "受注可能", accepted: "受注中", active: "受注中", completed: "達成・報告待ち", reported: "報告済み", rewarded: "精算済み" };
  const village = activeVillageContext();
  const venueName = village?.settlementLevel === "village" || village?.type === "village" ? "酒場" : "ギルド";
  const receptionistDesk = venueName === "ギルド" ? `<aside class="guild-receptionist-desk">
    <figure><img src="./${escapeHtml(receptionist.portraitImage)}" alt="${escapeHtml(receptionist.name)}"><figcaption>UNIQUE RECEPTIONIST</figcaption></figure>
    <div><small>GUILD DESK · THREE SEALED SLIPS</small><h4>${escapeHtml(receptionist.name)}</h4><p>危険・期限・証拠を照合し、受注から報酬精算まで同じ台帳で担当します。</p>
      <ul>${receptionist.guildService.duties.map((duty) => `<li>${escapeHtml(duty)}</li>`).join("")}</ul>
      <section><span><small>PARTY REFERRAL</small><strong>${referralCandidates.length ? `${referralCandidates.length}名を紹介可能` : "新しい候補者を照会中"}</strong><p>${escapeHtml(referralNames || "現在の隊と依頼内容を確認し、役割の合う候補者を探します。")}</p></span><button type="button" data-village-facility="tavern">マリエルの紹介で候補者に会う →</button></section>
    </div>
  </aside>` : "";
  const processedGoodsDesk = venueName === "ギルド" ? renderGuildProcessedGoodsDesk(village) : "";
  return `<section class="adventure-facility-board guild-contract-board">
    <header><div><small>LIVE CONTRACTS · ${escapeHtml(standing.name)}</small><h3>${venueName}の依頼</h3></div><p>地域功績 ${standing.merit} · 集落の商取引 ${standing.discountPercent}%割引。受注後は探索・採集・戦闘を実行します。</p></header>
    ${receptionistDesk}
    ${processedGoodsDesk}
    <div>${contracts.map((contract) => `<article class="is-${contract.status}">
      <span><small>${statusLabel[contract.status] ?? contract.status}</small><strong>${escapeHtml(contract.title)}</strong><p>${escapeHtml(contract.detail)}</p><em>進捗 ${contract.objective.progress} / ${contract.objective.required}${escapeHtml(contract.objective.unit)} · ${escapeHtml(contract.objective.targetName)}</em></span>
      <footer><b>報酬 財産${contract.reward.wealth}・名声${contract.reward.renown} · 功績${contract.merit}</b>${contract.objective.type === "collect_item" && contract.status === "accepted"
        ? `<button type="button" data-submit-adventure-contract="${contract.id}" ${contract.readyToSubmit ? "" : "disabled"}>${contract.readyToSubmit ? "素材を納品" : "採集が必要"}</button>`
        : `<button type="button" data-accept-adventure-contract="${contract.id}" ${contract.status === "available" ? "" : "disabled"}>${contract.status === "available" ? "受注する" : statusLabel[contract.status] ?? "処理済み"}</button>`}</footer>
    </article>`).join("")}</div>
  </section>`;
}

function renderTavernAdventureBoard(venue = "tavern", section = "all") {
  const context = currentAdventureContext();
  const candidates = getTavernCandidates(state, context);
  const genericCandidates = candidates.filter((candidate) => !candidate.unique);
  const uniqueCandidates = candidates.filter((candidate) => candidate.unique);
  const incomingCandidates = genericCandidates.filter((candidate) => candidate.incoming);
  const candidateCard = (candidate) => `<article class="${candidate.joined ? "is-joined" : ""} ${candidate.unique ? "is-unique" : ""}">
    ${candidate.portraitImage ? `<figure><img src="${escapeHtml(candidate.portraitImage)}" alt=""><figcaption>${candidate.unique ? "UNIQUE" : "NPC"}</figcaption></figure>` : `<i aria-hidden="true">${escapeHtml(candidate.name.slice(0, 1))}</i>`}<span><small>${candidate.unique ? "固有人物 · " : ""}${candidate.social.levelKnown ? `Lv.${candidate.level}` : "Lv.?"} ${escapeHtml(candidate.role)}</small><strong>${escapeHtml(candidate.name)}</strong><p>${escapeHtml(candidate.social.specialtyKnown ? candidate.specialty : candidate.social.abilityInsights[0] ?? "得意分野はまだ分からない")}</p><mark>${escapeHtml(candidate.social.relationship.name)} · ${candidate.social.personality ? `性格：${escapeHtml(candidate.social.personality.name)}` : "性格：未判明"}</mark>${candidate.social.recruitment ? `<em><b>${escapeHtml(candidate.social.recruitment.name)}</b>${escapeHtml(candidate.social.recruitment.summary)}</em>` : ""}${candidate.passiveName && candidate.social.specialtyKnown ? `<em><b>${escapeHtml(candidate.passiveName)}</b>${escapeHtml(candidate.passiveDescription)}</em>` : ""}</span>
    <div class="tavern-candidate-actions"><button type="button" data-talk-npc-candidate="${candidate.id}" data-npc-venue="${venue}" ${candidate.joined ? "disabled" : ""}>${candidate.joined ? "加入済み" : candidate.social.firstMeetingComplete ? "話を続ける" : "会話する"}</button>${candidate.incoming ? `<button type="button" data-accept-party-invitation="${candidate.id}" ${candidate.joined ? "disabled" : ""}>誘いを受ける</button>` : ""}</div>
  </article>`;
  const tabs = venue === "tavern" ? `<nav class="tavern-section-tabs" aria-label="酒場の掲示分類">
    ${[
      ["requests", "依頼掲示"],
      ["adventurers", "仲間・編成"],
      ["unique", "固有人物"],
    ].map(([id, label]) => `<button type="button" data-tavern-section="${id}" class="${section === id ? "is-active" : ""}" aria-pressed="${section === id}">${label}</button>`).join("")}
  </nav>` : "";
  if (venue === "tavern" && section === "requests") return tabs;
  const genericMarkup = `${incomingCandidates.length ? `<section class="tavern-incoming-invitations"><h4>食事中に届いた誘い</h4>${incomingCandidates.map(candidateCard).join("")}</section>` : ""}
    <div class="tavern-party-columns"><section><h4>話しかける</h4>${genericCandidates.filter((candidate) => !candidate.incoming).map(candidateCard).join("")}</section></div>`;
  const uniqueMarkup = `<section class="tavern-unique-companion"><header><div><small>UNIQUE CHARACTER</small><h4>固有人物</h4></div><p>地域シードから生成される冒険者とは別に、固有の経歴・会話・能力を持つ人物です。</p></header>${uniqueCandidates.map(candidateCard).join("")}</section>`;
  const content = venue !== "tavern" || section === "all" ? `${genericMarkup}${uniqueMarkup}`
    : section === "adventurers" ? `${renderPartyFormationBoard()}${genericMarkup}`
      : section === "unique" ? uniqueMarkup
        : "";
  return `${tabs}<section class="adventure-facility-board tavern-party-board">
    <header><div><small>NPC CONVERSATION · ${venue === "guild" ? "GUILD" : "TAVERN"}</small><h3>${venue === "guild" ? "ギルド" : "酒場"}の冒険者</h3></div><p>初対面の後は、会話で人柄・経歴・腕前・同行条件を段階的に確かめます。</p></header>
    ${content || "<p class=\"adviser-note\">上の「依頼掲示」から受注内容を確認できます。</p>"}
  </section>`;
}

function renderPartyFormationBoard() {
  const life = state.player?.villageLife;
  const party = life?.party ?? [];
  const active = party.filter((member) => member.active !== false && member.alive !== false);
  const reserve = party.filter((member) => member.active === false || member.alive === false);
  const abilityRow = (member) => ABILITY_KEYS.map((abilityId) => `<span title="${escapeHtml(ABILITY_LABELS[abilityId])}"><small>${escapeHtml(ABILITY_LABELS[abilityId].slice(0, 1))}</small><b>${Number(member.abilities?.[abilityId] ?? 0)}</b></span>`).join("");
  const memberCard = (member, activeMember) => `<article class="party-formation-member ${activeMember ? "is-active" : "is-reserve"} ${member.goddessMercyCompanion ? "is-mercy-companion" : ""}">
    <figure>${member.portraitImage ? `<img src="${escapeHtml(member.portraitImage)}" alt="${escapeHtml(member.name)}の立ち絵">` : `<i>${escapeHtml(member.name.slice(0, 1))}</i>`}<figcaption>${activeMember ? "同行中" : member.alive === false ? "戦闘不能" : "待機"}</figcaption></figure>
    <div class="party-formation-profile"><small>Lv.${member.level ?? 1} · ${escapeHtml(member.role ?? "冒険者")}</small><h4>${escapeHtml(member.name)}</h4><p>${escapeHtml(member.status ?? member.origin ?? member.specialty ?? "同行者")}</p><div class="party-formation-hp"><span style="--party-hp:${Math.max(0, Math.min(100, Math.round((member.hp ?? 0) / Math.max(1, member.maxHp ?? 1) * 100)))}%"></span></div><em>HP ${member.hp ?? 0} / ${member.maxHp ?? 0}</em><div class="party-formation-abilities">${abilityRow(member)}</div></div>
    <button type="button" data-party-member-toggle="${escapeHtml(member.id)}" data-party-active="${activeMember ? "false" : "true"}" ${member.alive === false ? "disabled" : ""}>${activeMember ? "待機にする" : "同行させる"}</button>
  </article>`;
  return `<section class="party-formation-board" aria-label="パーティー編成">
    <header><div><small>PARTY FORMATION</small><h3>探索パーティー</h3></div><strong>${1 + active.length}名</strong><p>主人公＋同行中${active.length}名</p></header>
    <article class="party-formation-leader"><i>${escapeHtml(state.player.name.slice(0, 1))}</i><span><small>LEADER · 常時参加</small><strong>${escapeHtml(state.player.name)}</strong><p>${escapeHtml(state.player.specialty ?? "旅人")}</p></span><b>主人公</b></article>
    <div class="party-formation-columns"><section><h4><span>同行中</span><b>${active.length}名</b></h4>${active.length ? active.map((member) => memberCard(member, true)).join("") : "<p class=\"party-formation-empty\">同行者はいません。主人公一人で出発します。</p>"}</section><section><h4><span>待機</span><b>${reserve.length}名</b></h4>${reserve.length ? reserve.map((member) => memberCard(member, false)).join("") : "<p class=\"party-formation-empty\">待機中の仲間はいません。</p>"}</section></div>
  </section>`;
}

function renderMerchantMarket(village) {
  const market = getSettlementMarket(state, village);
  const trade = state.player.merchantTrade;
  const load = getMerchantCargoLoad(state);
  const rumorKey = `${state.year}-${state.month}:${village.id}`;
  const rumorCandidates = discoveredMerchantSettlements(village);
  const goods = Object.values(market.goods).map((good) => {
    const definition = MERCHANT_COMMODITIES[good.commodityId];
    const cargo = trade.cargo.find((entry) => entry.commodityId === good.commodityId);
    const owned = cargo?.quantity ?? 0;
    const canBuy = good.stock > 0 && load < trade.cargoCapacity && state.player.metrics.wealth >= good.buyPrice;
    return `<article class="merchant-market-good" data-market-good="${good.commodityId}">
      <div class="merchant-market-good-name"><small>供給 ${good.supply} · 需要 ${good.demand}</small><strong>${escapeHtml(good.name)}</strong><p>${escapeHtml(definition.description)}</p></div>
      <div class="merchant-market-prices"><span><small>仕入</small><b>¤${formatValue(good.buyPrice, 1)}</b></span><span><small>売却</small><b>¤${formatValue(good.sellPrice, 1)}</b></span><span><small>市場 / 積荷</small><b>${good.stock} / ${owned}</b></span></div>
      <label><span>数量</span><input type="number" min="1" max="${Math.max(1, good.stock, owned)}" value="1" inputmode="numeric" data-market-quantity aria-label="${escapeHtml(good.name)}の取引数量"></label>
      <div class="merchant-market-actions"><button type="button" data-buy-commodity="${good.commodityId}" ${canBuy ? "" : "disabled"}>仕入れる</button><button type="button" data-sell-commodity="${good.commodityId}" ${owned > 0 ? "" : "disabled"}>売る</button></div>
    </article>`;
  }).join("");
  const latestReports = [...trade.marketReports].reverse().filter((report, index, reports) => (
    report.settlementId !== village.id
    && reports.findIndex((entry) => entry.settlementId === report.settlementId && entry.commodityId === report.commodityId) === index
  ));
  const reportGroups = new Map();
  latestReports.forEach((report) => {
    const aged = getSettlementMarket(state, { id: report.settlementId, name: report.settlementName }, { reportOnly: true }).reports[report.commodityId];
    if (!aged) return;
    if (!reportGroups.has(report.settlementId)) reportGroups.set(report.settlementId, { name: report.settlementName, reports: [] });
    reportGroups.get(report.settlementId).reports.push(aged);
  });
  const reports = [...reportGroups.values()].map((group) => `<article><header><strong>${escapeHtml(group.name)}</strong><small>${Math.max(...group.reports.map((report) => report.ageMonths))}か月前までの情報</small></header><p>${group.reports.map((report) => `${escapeHtml(MERCHANT_COMMODITIES[report.commodityId].name)} ¤${formatValue(report.low, 1)}〜${formatValue(report.high, 1)}`).join(" · ")}</p></article>`).join("");
  const transactions = trade.recentTransactions.slice(0, 5).map((entry) => `<li><span>${entry.year}年${entry.month}月</span><strong>${entry.type === "buy" ? "仕入" : "売却"} ${escapeHtml(MERCHANT_COMMODITIES[entry.commodityId].name)}×${entry.quantity}</strong><small>${escapeHtml(entry.settlementName)} · ¤${formatValue(entry.total, 1)}${entry.type === "sell" ? ` · 損益 ${signed(entry.profit, 1)}` : ""}</small></li>`).join("");
  return `<section class="adventure-facility-board merchant-market-board" aria-label="${escapeHtml(village.name)}の交易市場">
    <header><div><small>LOCAL MARKET · ${escapeHtml(market.period)}</small><h3>${escapeHtml(village.name)}の市場</h3></div><p>積荷 ${load} / ${trade.cargoCapacity} · 財産 ¤${formatValue(state.player.metrics.wealth, 1)}。現在地の価格だけが確定値です。</p></header>
    <div class="merchant-market-toolbar"><button type="button" data-market-rumors ${trade.rumorChecks[rumorKey] || !rumorCandidates.length ? "disabled" : ""}>${trade.rumorChecks[rumorKey] ? "今月の相場は確認済み" : rumorCandidates.length ? `近隣${Math.min(2, rumorCandidates.length)}市場の相場を聞く` : "既知の近隣市場なし"}</button><span>土地の産出・集落規模・月次情勢で価格と在庫が変化します。</span></div>
    <div class="merchant-market-goods">${goods}</div>
    <section class="merchant-trade-ledger"><header><div><small>MARKET INTELLIGENCE</small><h4>相場帳</h4></div><span>遠隔地は価格帯のみ</span></header><div>${reports || "<p>別の市場を訪れるか、近隣相場を聞くと記録されます。</p>"}</div></section>
    <section class="merchant-trade-history"><header><small>RECENT TRADE</small><h4>最近の取引</h4></header><ul>${transactions || "<li><small>まだ交易記録はありません。</small></li>"}</ul></section>
  </section>`;
}

function villageFacilityAdventureContent(facilityId, village = activeVillageContext()) {
  if (facilityId === "guild") return `${renderGuildAdventureBoard()}${renderTavernAdventureBoard("guild")}`;
  if (facilityId === "tavern") {
    const villageRequests = village?.settlementLevel === "village" || village?.type === "village";
    const requests = view.tavernSection === "requests" && villageRequests ? renderGuildAdventureBoard() : "";
    return `${renderTavernAdventureBoard("tavern", view.tavernSection)}${requests}`;
  }
  if (facilityId === "preparation") return renderPartyFormationBoard();
  if (facilityId === "shop") {
    const inventory = state.player?.villageLife?.inventory ?? [];
    return `<section class="adventure-facility-board village-shop-inventory"><header><div><small>SELECT ITEM TO SELL</small><h3>所持品を選んで売却</h3></div><p>売却前に品名と数量を確認します。</p></header><div>${inventory.length ? inventory.map((item) => `<article><span><strong>${escapeHtml(item.name)}</strong><small>所持 ${item.quantity ?? 1}</small></span><button type="button" data-sell-village-item="${escapeHtml(item.id)}">1個売却 →</button></article>`).join("") : "<p>売却できる所持品はありません。</p>"}</div></section>`;
  }
  if (facilityId === "market") return renderMerchantMarket(village);
  return "";
}

function villageFacilityArt(facilityId) {
  return ADVENTURE_ART[facilityId] ?? ADVENTURE_ART.village;
}

function renderServiceRouteBoard() {
  const routes = getServiceRouteProgress(state);
  return `<section class="village-service-routes">
    <header><div><small>MULTIPLE COMMISSION ROUTES</small><h2>士官への道</h2></div><p>依頼以外の出会いと人脈も、仕官の契機になる。</p></header>
    <div>${routes.map((route) => `<article class="${route.unlocked ? "is-unlocked" : ""}">
      <span>${route.unlocked ? "開" : route.progress}</span><div><small>${route.progress} / ${route.target}${route.unit}</small><strong>${escapeHtml(route.name)}</strong><p>${escapeHtml(route.summary)}</p></div><i style="--route-progress:${route.percent}%"></i>
    </article>`).join("")}</div>
  </section>`;
}

function renderVillageWorkspace() {
  const village = activeVillageContext();
  if (!village) return `<section class="village-missing"><h1>村が選択されていません</h1><button type="button" data-leave-village="world">生成世界へ戻る</button></section>`;
  const player = state.player;
  const life = player.villageLife;
  const facilities = getSettlementFacilities(village);
  const selected = facilities.find((facility) => facility.id === view.selectedVillageFacilityId) ?? facilities[0];
  if (selected.id !== view.selectedVillageFacilityId) view.selectedVillageFacilityId = selected.id;
  const tavernInterior = view.villageFacilityOpen && selected.id === "tavern";
  const villageInteriorArt = tavernInterior ? villageFacilityArt(selected.id) : VILLAGE_MAIN_ART;
  const progress = life.villageProgress[village.id] ?? { buildings: 0, facilityLevel: 1, specialists: 0 };
  const regionalReputation = currentRegionalReputationReport(village);
  const activeParty = life.party.filter((member) => member.active && member.alive !== false);
  const actions = villageFacilityActions(village, selected).map((item) => {
    const availability = getVillageActionAvailability(state, item.id, village);
    const cost = villageActionCostLabel(availability);
    return `<button type="button" class="village-choice-action" data-village-action="${item.id}" ${availability.allowed ? "" : "disabled"} title="${escapeHtml(availability.reason ?? item.description)}"><span><small>${cost}</small><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.description)}</p></span><b>${availability.allowed ? "会話 →" : "不可"}</b></button>`;
  }).join("");
  const records = life.actionHistory.filter((record) => record.villageId === village.id).slice(0, 6).map((record) => `
    <li><span>${record.year ?? state.year}年 ${record.month ?? state.month}月</span><strong>${escapeHtml(record.actionName)}</strong><small>${escapeHtml(record.message)}</small></li>`).join("");
  const administrationButton = getCareerStage(state)?.governance && getGovernanceView(state).jurisdiction.territoryIds.includes(village.regionId)
    ? `<button type="button" data-panel="governance">管轄統治へ</button>`
    : "";
  return `
    <header class="village-workspace-header" style="--village-art:url('${ADVENTURE_ART.village}')">
      <div class="village-workspace-emblem" aria-hidden="true"><i>村</i><span>${escapeHtml(village.name.slice(0, 1))}</span></div>
      <div><span>PERSONAL VISIT / ${escapeHtml(village.regionName)}</span><h1>${escapeHtml(village.name)}</h1><p>${escapeHtml(village.nationName)}。月次の統治とは別に、本人と仲間の準備・交流を行う。</p></div>
      <aside><small>村との関係</small><strong>${life.villageRelations[village.id] ?? 0}</strong><span>地方名声 ${regionalReputation.value} · ${escapeHtml(regionalReputation.label)}</span></aside>
      <nav><button type="button" data-leave-village="career">人物画面</button><button type="button" data-leave-village="world">地方地図</button>${administrationButton}</nav>
    </header>
    <div class="village-workspace-body">
      <section class="village-central-visual has-top-status ${tavernInterior ? "is-tavern-interior" : ""}" data-village-location="${tavernInterior ? "tavern" : "village-square"}" style="--village-interior-art:url('${villageInteriorArt}')">
        <div class="village-central-status is-top-status" aria-label="人物と探索物資の状態">
          <article><small>HP / MP</small><strong>${life.hp} / ${life.mp}</strong><span>${escapeHtml(villageConditionSummary(life))}</span></article>
          <article><small>財産</small><strong>${player.metrics.wealth}</strong><span>村内の支払い</span></article>
          <article><small>交易積荷</small><strong>${getMerchantCargoLoad(state)}<i> / ${player.merchantTrade.cargoCapacity}</i></strong><span>冒険用所持品とは別枠</span></article>
          <article><small>同行</small><strong>${activeParty.length}<i> / ${life.party.length}</i></strong><span>${escapeHtml(partyConditionSummary(life))}</span></article>
          <article><small>探索物資</small><strong>${life.supplies.food}<i>食</i> ${life.supplies.torches}<i>灯</i></strong><span>所持品 ${life.inventory.reduce((sum, item) => sum + (item.quantity ?? 1), 0)}</span></article>
        </div>
        ${tavernInterior ? "" : `<section class="village-choice-overlay village-facility-window ${view.villageFacilityOpen ? "has-action-window" : ""}" aria-label="${escapeHtml(village.name)}の施設">
          <header><small>VILLAGE COMMAND</small><div><h2>${escapeHtml(village.name)}</h2><button type="button" data-leave-village="world" aria-label="地方地図へ戻る">×</button></div><p>施設を選び、村人と会話して行動します。</p></header>
          <nav class="village-overlay-facilities village-facility-menu" aria-label="集落の施設">${facilities.map((facility) => `<button type="button" data-village-facility="${facility.id}" class="${view.villageFacilityOpen && facility.id === selected.id ? "is-active" : ""}" aria-haspopup="dialog" aria-expanded="${view.villageFacilityOpen && facility.id === selected.id}"><i>${facility.icon}</i><span><strong>${escapeHtml(facility.name)}</strong><small>${escapeHtml(facility.summary)}</small></span><b>${villageFacilityChoiceCount(village, facility)}件 <em>→</em></b></button>`).join("")}</nav>
        </section>`}
        ${view.villageFacilityOpen ? `<section class="village-choice-overlay village-action-window ${tavernInterior ? "is-facility-interior-window is-tavern-window" : ""}" role="dialog" aria-modal="false" aria-label="${escapeHtml(selected.name)}の行動">
          <header><div><button type="button" class="village-action-back" data-close-village-actions>← 村の施設一覧</button><button type="button" data-leave-village="world" aria-label="地方地図へ戻る">×</button></div><small>${tavernInterior ? "TAVERN / ARRIVED" : `${selected.id.toUpperCase()} / ACTIONS`}</small><h2>${escapeHtml(selected.name)}</h2><p>${tavernInterior ? "酒場へ移動しました。店内で相手と用件を選びます。" : escapeHtml(selected.summary)}</p></header>
          <div class="village-overlay-actions">
            <div class="village-overlay-heading"><span><small>${tavernInterior ? "AFTER ARRIVAL / AVAILABLE CHOICES" : "AVAILABLE CHOICES"}</small><strong>行動を選ぶ</strong></span><b>${villageFacilityChoiceCount(village, selected)}件</b></div>
            <div class="village-choice-list">${actions}</div>
            ${villageFacilityAdventureContent(selected.id, village)}
          </div>
        </section>` : ""}
        <div class="village-central-copy"><small>${selected.id.toUpperCase()} / ${escapeHtml(village.regionName)}</small><h2><i>${selected.icon}</i>${escapeHtml(selected.name)}</h2><p>${escapeHtml(selected.summary)}</p><span>${escapeHtml(village.nationName)}</span></div>
      </section>
      ${life.lastAction?.villageId === village.id ? `<article class="village-action-result village-central-result"><i>✓</i><div><small>直前の行動 · ${escapeHtml(life.lastAction.facilityName)}</small><strong>${escapeHtml(life.lastAction.actionName)}</strong><p>${escapeHtml(life.lastAction.message)}</p></div></article>` : ""}
      ${renderVillageQuestFlow(life, village)}
      ${renderSettlementCrimeSection(village)}
      <section class="village-ledger-grid">
        <article><header><small>PERSONAL LOADOUT</small><h2>装備と所持品</h2></header><dl><div><dt>武器</dt><dd>${escapeHtml(life.equipment.weapon.name)} +${life.equipment.weapon.enhancement ?? 0}</dd></div><div><dt>防具</dt><dd>${escapeHtml(life.equipment.armor.name)}</dd></div><div><dt>所持品</dt><dd>${life.inventory.map((item) => `${escapeHtml(item.name)}×${item.quantity ?? 1}`).join("・") || "なし"}</dd></div><div><dt>倉庫</dt><dd>${life.storage.items.length + life.storage.equipment.length + life.storage.materials.length}品</dd></div></dl></article>
        <article><header><small>LOCAL PROGRESS</small><h2>依頼と村の発展</h2></header><dl><div><dt>地域功績</dt><dd>${life.guildMerit}</dd></div><div><dt>報告済み依頼</dt><dd>${life.guildRequestsReported}件</dd></div><div><dt>建設支援</dt><dd>${progress.buildings}件</dd></div><div><dt>誘致</dt><dd>${progress.specialists}人</dd></div></dl></article>
      </section>
      ${renderServiceRouteBoard()}
      <section class="village-history"><header><small>VISIT LOG</small><h2>${escapeHtml(village.name)}での行動</h2></header><ol>${records || "<li><strong>まだ行動していません</strong><small>施設を選び、行動を実行してください。</small></li>"}</ol></section>
    </div>`;
}

function shortcutCharacters() {
  if (!state.player) return [];
  const player = state.player;
  const life = player.villageLife;
  const playerEntry = {
    id: player.id,
    kind: "player",
    name: player.name,
    role: `${getCareerStage(state).name} · ${player.title}`,
    portraitImage: "./assets/generated/player-conversation-human.png",
    hp: life?.hp ?? 100,
    maxHp: life?.maxHp ?? 100,
    active: true,
    abilities: player.abilities ?? {},
    equipment: life?.equipment ?? {},
  };
  const companions = (life?.party ?? []).map((member) => ({
    ...member,
    kind: "companion",
    role: member.role ?? "同行者",
    hp: member.hp ?? member.maxHp ?? 100,
    maxHp: member.maxHp ?? member.hp ?? 100,
    abilities: member.abilities ?? {},
    equipment: member.equipment ?? {},
  }));
  return [playerEntry, ...companions];
}

function shortcutEquipmentLabel(character) {
  const equipment = character.equipment ?? {};
  const weapon = equipment.weapon?.name ?? equipment.weapon ?? "装備なし";
  const armor = equipment.armor?.name ?? equipment.armor ?? "防具なし";
  return `${weapon} / ${armor}`;
}

function renderCharacterShortcutPanel() {
  const characters = shortcutCharacters();
  const selected = characters.find((character) => character.id === view.selectedShortcutCharacterId) ?? characters[0];
  if (selected) view.selectedShortcutCharacterId = selected.id;
  const cards = characters.map((character) => {
    const active = character.id === selected?.id;
    const portrait = character.portraitImage
      ? `<img src="${escapeHtml(character.portraitImage)}" alt="${escapeHtml(character.name)}の顔グラフィック">`
      : `<span aria-hidden="true">${escapeHtml(character.name.slice(0, 1))}</span>`;
    return `<button type="button" class="character-shortcut-card ${active ? "is-selected" : ""}" data-shortcut-character="${escapeHtml(character.id)}" aria-pressed="${active}">
      <figure>${portrait}<figcaption>${character.kind === "player" ? "主人公" : character.active ? "同行中" : "待機"}</figcaption></figure>
      <span><small>${escapeHtml(character.role)}</small><strong>${escapeHtml(character.name)}</strong><em>HP ${character.hp} / ${character.maxHp}</em><b>${escapeHtml(shortcutEquipmentLabel(character))}</b></span>
    </button>`;
  }).join("");
  elements.leftPanel.innerHTML = `<header class="panel-heading character-shortcut-heading"><span>CHARACTER SHORTCUT</span><h1>人物</h1><p>能力値などの個人情報は、人物を選んで「詳細を見る」から確認します。</p></header><div class="panel-body character-shortcut-body"><div class="character-shortcut-list">${cards || "<p>表示できる人物がいません。</p>"}</div>${selected ? `<section class="character-shortcut-summary"><small>SELECTED CHARACTER</small><h2>${escapeHtml(selected.name)}</h2><dl><div><dt>状態</dt><dd>HP ${selected.hp} / ${selected.maxHp}</dd></div><div><dt>装備</dt><dd>${escapeHtml(shortcutEquipmentLabel(selected))}</dd></div></dl><button type="button" data-open-character-detail="${escapeHtml(selected.id)}">詳細を見る</button></section>` : ""}</div>`;
}

function renderCharacterDetailModal() {
  const characters = shortcutCharacters();
  const character = characters.find((entry) => entry.id === view.selectedShortcutCharacterId) ?? characters[0];
  const open = Boolean(view.characterDetailOpen && character);
  elements.characterDetailModal.classList.toggle("is-hidden", !open);
  elements.characterDetailModal.setAttribute("aria-hidden", String(!open));
  elements.cityWorkspace.inert = open;
  elements.cityWorkspace.setAttribute("aria-hidden", String(open));
  if (!open) return;
  elements.characterDetailTitle.textContent = `${character.name}の詳細`;
  if (character.kind === "player") {
    elements.characterDetailContent.innerHTML = renderCareerWorkspace();
    return;
  }
  const abilities = Object.entries(character.abilities ?? {}).map(([key, value]) => `<div><dt>${escapeHtml(ABILITY_LABELS[key] ?? key)}</dt><dd>${value}</dd></div>`).join("");
  elements.characterDetailContent.innerHTML = `<article class="companion-detail-sheet"><header><figure>${character.portraitImage ? `<img src="${escapeHtml(character.portraitImage)}" alt="${escapeHtml(character.name)}の立ち絵">` : `<span>${escapeHtml(character.name.slice(0, 1))}</span>`}</figure><div><small>COMPANION RECORD</small><h1>${escapeHtml(character.name)}</h1><p>${escapeHtml(character.role)} · ${character.active ? "同行中" : "待機"}</p></div></header><section><h2>状態と装備</h2><dl><div><dt>生命力</dt><dd>HP ${character.hp} / ${character.maxHp}</dd></div><div><dt>装備</dt><dd>${escapeHtml(shortcutEquipmentLabel(character))}</dd></div>${abilities}</dl></section></article>`;
}

function careerTerritoryName(territoryId) {
  const holding = state.player?.holdings?.find((entry) => entry.territoryId === territoryId);
  if (holding?.generatedRegionId) {
    try {
      return getGeneratedWorldView(state).runtime.regionById.get(holding.generatedRegionId)?.name ?? holding.generatedRegionId;
    } catch {}
  }
  return WORLD.provinces[territoryId]?.name ?? territoryId;
}

function renderCareerPanel() {
  const player = state.player;
  const stage = getCareerStage(state);
  const latest = player.history[0];
  const government = GOVERNMENT_TITLE_SYSTEMS[player.governmentFormId];
  const positionStatus = player.sovereign ? `${government?.name ?? "自国"}元首` : player.affiliation.liegeName ? "主従あり" : "自由身分";
  const relation = player.sovereign ? `${escapeHtml(player.title)}として自国を統治しています。` : player.affiliation.liegeName ? `主君：${escapeHtml(player.affiliation.liegeName)}` : "特定の主君には仕えていません。";
  const regionalReputation = currentRegionalReputationReport();
  const playableIndex = Math.max(0, PLAYABLE_CAREER_STAGE_ROUTE.findIndex((entry) => entry.id === stage.id));
  elements.leftPanel.innerHTML = `
    <header class="panel-heading career-heading">
      ${careerIdentityCrest(player, stage, true)}
      <div><span>PERSONAL CHRONICLE</span><h1>${escapeHtml(player.name)}</h1><p>${stage.name} · ${escapeHtml(player.title)}</p></div>
      <div class="career-panel-rank"><small>実装済み立身段階</small><strong>${playableIndex + 1}<i>/${PLAYABLE_CAREER_STAGE_ROUTE.length}</i></strong></div>
    </header>
    <div class="panel-body">
      <section class="panel-section career-position-card"><div class="section-heading"><h2>現在の立場</h2><small>${escapeHtml(positionStatus)}</small></div><p class="adviser-note"><strong>${stage.description}</strong><br>${relation}</p><div class="career-panel-track"><i style="--value:${(playableIndex + 1) / PLAYABLE_CAREER_STAGE_ROUTE.length * 100}%"></i><span>個人</span><span>領主</span><span>君主</span></div></section>
      <section class="panel-section"><div class="realm-facts career-facts"><div><i>⚔</i><small>武勲</small><strong>${player.metrics.martialMerit}</strong></div><div><i>政</i><small>政績</small><strong>${player.metrics.civilMerit}</strong></div><div><i>✦</i><small>${escapeHtml(regionalReputation.regionName)}の名声</small><strong>${regionalReputation.value}</strong></div><div><i>¤</i><small>財産</small><strong>${player.metrics.wealth}</strong></div></div></section>
      <section class="panel-section"><div class="section-heading"><h2>最新の年代記</h2><small>${latest.year ?? state.year}年</small></div><p class="adviser-note"><strong>${escapeHtml(latest.title)}</strong><br>${escapeHtml(latest.detail)}</p></section>
      ${renderCrimeStatusBoard()}
      ${stage.governance ? `<section class="panel-section"><button class="town-open-commands" type="button" data-panel="governance">管轄統治を開く</button></section>` : ""}
    </div>`;
}

function renderGovernancePanel() {
  const governance = getGovernanceView(state);
  const names = governance.jurisdiction.territoryIds.map(careerTerritoryName);
  elements.leftPanel.innerHTML = `
    <header class="panel-heading governance-heading"><span>JURISDICTION GOVERNANCE</span><h1>統治</h1><p>${governance.stage.name} · ${governance.jurisdiction.sovereign ? "国家主権" : "主君の下の領主権"}</p></header>
    <div class="panel-body">
      <section class="panel-section"><div class="section-heading"><h2>管轄範囲</h2><small>${names.length}地域</small></div><p class="adviser-note"><strong>${names.join("・") || "統治対象なし"}</strong><br>政策効果は、この管轄と有効な委任範囲だけに限定されます。</p></section>
      <section class="panel-section"><div class="realm-facts"><div><small>実行命令</small><strong>${governance.executable.length}</strong></div><div><small>建議候補</small><strong>${governance.petitions.length}</strong></div><div><small>期限内委任</small><strong>${governance.jurisdiction.grants.length}</strong></div><div><small>禁止令</small><strong>${governance.jurisdiction.prohibitions.length}</strong></div></div></section>
      <section class="panel-section"><p class="adviser-note"><strong>画面表示と国家主権は別です。</strong><br>国家規模の命令は、君主権がなければ実行項目にせず、建議としてのみ提示します。</p></section>
    </div>`;
}

function personalChronicleEntryHtml(entry) {
  return `<li><span>${entry.displayYear}年 ${entry.displayMonth}月</span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.detail)}</small></li>`;
}

function renderPersonalChronicle(history) {
  const chronicle = getPersonalChronicleView(history, { year: state.year, month: state.month });
  const recent = chronicle.recent.map(personalChronicleEntryHtml).join("") || "<li><strong>年代記はまだありません</strong><small>人物の行動がここに記録されます。</small></li>";
  const archives = chronicle.archives.map((archive) => `
    <details class="career-history-year">
      <summary><span>${archive.year}年</span><strong>${archive.entries.length}件</strong><small>年別記録を表示</small></summary>
      <ol>${archive.entries.map(personalChronicleEntryHtml).join("")}</ol>
    </details>`).join("");
  return `
    <section class="career-history">
      <header><div><small>PERSONAL CHRONICLE</small><h2>人物の年代記</h2></div><p>最新${chronicle.recent.length}件 / 全${chronicle.total}件</p></header>
      <ol class="career-history-recent">${recent}</ol>
      ${archives ? `<div class="career-history-archives"><header><strong>過去年代記</strong><small>10件を超えた記録は年ごとに収納</small></header>${archives}</div>` : ""}
    </section>`;
}

function masteryConditionLeaves(condition) {
  return condition?.children ? condition.children.flatMap(masteryConditionLeaves) : condition ? [condition] : [];
}

function masteryConditionHtml(condition) {
  const leaves = masteryConditionLeaves(condition);
  return `<ul class="mastery-condition-list">${leaves.map((entry) => `<li class="${entry.met ? "is-met" : ""}"><i>${entry.met ? "✓" : "·"}</i><span>${escapeHtml(entry.label)}</span><b>${Math.min(entry.current, entry.target)} / ${entry.target}</b></li>`).join("")}</ul>`;
}

function renderMasteryBoard() {
  const entries = getMasteryView(state);
  const mastery = state.player.mastery;
  const unlocked = entries.filter((entry) => entry.unlocked).length;
  const renderGroup = (kind, title, subtitle) => {
    const limit = MASTERY_LOADOUT_LIMITS[kind];
    const equippedCount = kind === "magic" ? mastery.equippedMagicIds.length : mastery.equippedTalentIds.length;
    const cards = entries.filter((entry) => entry.kind === kind).map((entry) => {
      const leaves = masteryConditionLeaves(entry.condition);
      const progress = leaves.length ? Math.round(leaves.reduce((sum, item) => sum + Math.min(1, item.current / Math.max(1, item.target)), 0) / leaves.length * 100) : 0;
      return `<article class="mastery-card ${entry.unlocked ? "is-unlocked" : "is-locked"} ${entry.equipped ? "is-equipped" : ""}">
        <header><i>${entry.unlocked ? entry.equipped ? "装" : "得" : "?"}</i><div><small>${escapeHtml(entry.school)}</small><h3>${escapeHtml(entry.name)}</h3></div><b>${entry.unlocked ? entry.equipped ? "装備中" : "習得済み" : `${progress}%`}</b></header>
        <p>${escapeHtml(entry.description)}</p>
        ${entry.unlocked ? `<button type="button" data-mastery-loadout="${entry.id}" class="${entry.equipped ? "is-remove" : ""}">${entry.equipped ? "装備から外す" : `${kind === "magic" ? "魔法" : "技能"}枠へ装備`}</button>` : `<details><summary>取得条件を見る</summary><p>${escapeHtml(entry.hint)}</p>${masteryConditionHtml(entry.condition)}</details>`}
      </article>`;
    }).join("");
    return `<section class="mastery-group is-${kind}"><header><div><small>${kind === "magic" ? "SPELL DISCOVERY" : "PRACTICED TALENTS"}</small><h3>${title}</h3><p>${subtitle}</p></div><b>${equippedCount} / ${limit} 装備</b></header><div class="mastery-card-grid">${cards}</div></section>`;
  };
  return `<section class="mastery-board"><header><div><small>DISCOVERY THROUGH PLAY</small><h2>魔法・技能の探究</h2><p>能力点を購入するのではなく、旅・探索・敗走・負傷・会話・依頼・戦闘で条件を満たして会得します。習得後は限られた枠へ装備し、戦術戦闘で使います。</p></div><strong>${unlocked}<small> / ${entries.length} 習得</small></strong></header>${renderGroup("magic", "魔法式", "戦場へ持ち込める術は4つ。対象・範囲・疲労の違いで組み替えます。")}${renderGroup("talent", "鍛錬技能", "常時効果は3つ。得意分野を作るか、弱点を補うかを選びます。")}</section>`;
}

function renderCareerWorkspace() {
  const player = state.player;
  const stage = getCareerStage(state);
  const playableIndex = Math.max(0, PLAYABLE_CAREER_STAGE_ROUTE.findIndex((entry) => entry.id === stage.id));
  const government = GOVERNMENT_TITLE_SYSTEMS[player.governmentFormId];
  const affiliationLabel = player.sovereign ? `${government?.name ?? "自国"}元首` : player.affiliation.liegeName ?? "なし";
  const nextPosition = stage.order >= 9 ? "国家形態の最高位" : stage.order >= 8 ? "派閥と国家方針を担う" : "功績と政治選択で変化";
  const regionalReputation = currentRegionalReputationReport();
  const invitations = player.invitations.length ? `
    <section class="career-invitations"><header><div><small>SERVICE OFFERS</small><h2>仕官先を選ぶ</h2></div><p>村で積み上げた行動を契機に、具体的な主君との主従関係を結びます。</p></header><div>${player.invitations.map((invitation) => `
      <button type="button" data-accept-service="${invitation.id ?? invitation.nationId}"><strong>${escapeHtml(invitation.name)}</strong><b>${escapeHtml(invitation.offer)}</b><small>${invitation.routeName ? `経路：${escapeHtml(invitation.routeName)} · ` : ""}初期信頼 ${invitation.trust} · 俸禄と保護を得る代わりに軍役と命令への服従を負う</small></button>`).join("")}</div></section>` : "";
  const holdings = player.holdings.length ? player.holdings.map((holding) => `<span>${escapeHtml(careerTerritoryName(holding.territoryId))}</span>`).join("") : "<span>所領なし</span>";
  return `
    <header class="career-workspace-header">
      <div class="career-hero-visual">${careerIdentityCrest(player, stage)}<span class="career-hero-caption">CHRONICLE ${String(playableIndex + 1).padStart(2, "0")}</span></div>
      <div class="career-hero-copy"><span>PERSONAL RISE / ${stage.id.toUpperCase()}</span><h1>${escapeHtml(player.name)}の立身記</h1><p>${escapeHtml(player.origin)} · ${escapeHtml(player.specialty)}。選択と関係が、次の身分を開く。</p></div>
      <aside><small>現在の地位</small><strong>${stage.name}</strong><b>${escapeHtml(player.title)}</b></aside>
    </header>
    <nav class="career-route-board" aria-label="通常UIで通過できる個人から君主までの立身ルート"><header><span>PLAYABLE RISE ROUTE</span><strong>${playableIndex + 1} / ${PLAYABLE_CAREER_STAGE_ROUTE.length}</strong></header>${careerStageRoute(stage)}</nav>
    <div class="career-workspace-body">
      <section class="career-status-strip"><div><small>所属</small><strong>${escapeHtml(affiliationLabel)}</strong></div><div><small>所領</small><strong>${player.holdings.length}領</strong><span>${holdings}</span></div><div><small>直属家臣</small><strong>${player.householdRetainers.length}名</strong></div><div><small>次の立場</small><strong>${nextPosition}</strong></div></section>
      <section class="career-ability-sheet"><header><div><small>D&amp;D ABILITY SCORES</small><h2>基礎6能力値</h2></div><p>作成時の4d6方式による値。役職人物も同じ尺度を持ちます。</p></header><div>${ABILITY_KEYS.map((abilityId) => `<article><small>${abilityId.slice(0, 3).toUpperCase()}</small><span>${ABILITY_LABELS[abilityId]}</span><strong>${player.abilities?.[abilityId] ?? 10}</strong><b>${formatAbilityModifier(player.abilities?.[abilityId] ?? 10)}</b></article>`).join("")}</div></section>
      ${renderMasteryBoard()}
      <section class="career-metric-grid">${careerMetricCards(player, regionalReputation)}</section>
      ${regionalReputationBoard(regionalReputation)}
      ${invitations}
      ${renderVillageEntrySection(true)}
      ${renderTravelCrimeSection()}
      ${renderPersonCrimeSection()}
      ${renderCrimeStatusBoard()}
      ${renderLifeToRealmBoard()}
      <section class="career-actions"><header><div><small>CURRENT CHOICES</small><h2>今できること</h2></div><p>権限を得ていない国家命令は表示しません。</p></header><div>${careerActionButtons(player) || (stage.governance ? `<button type="button" data-panel="governance"><strong>統治画面を開く</strong><small>現在の管轄と委任権限で実行可能な命令だけを表示</small></button>` : `<p class="career-action-note">上の仕官先を選び、具体的な主君との主従関係を結んでください。</p>`)}</div></section>
      ${roleDelegationSection()}
      ${renderPersonalChronicle(player.history)}
    </div>`;
}

function governanceCommandCard(item) {
  const territory = item.targetTerritoryId ? careerTerritoryName(item.targetTerritoryId) : "自国全体";
  return `<button type="button" data-governance-command="${item.id}" ${item.targetTerritoryId ? `data-territory-id="${item.targetTerritoryId}"` : ""}><header><strong>${item.name}</strong><b>${item.group}</b></header><p>${item.description}</p><small>対象：${territory}</small><span>権限確認済み · 実行 →</span></button>`;
}

function renderGovernanceWorkspace() {
  const player = state.player;
  const viewModel = getGovernanceView(state);
  const jurisdictionNames = viewModel.jurisdiction.territoryIds.map(careerTerritoryName);
  if (!viewModel.jurisdiction.territoryIds.includes(view.selectedCityId)) view.selectedCityId = viewModel.jurisdiction.territoryIds[0] ?? "orta";
  const territorial = viewModel.executable.filter((item) => item.scope === "territory" && item.targetTerritoryId === view.selectedCityId);
  const national = viewModel.executable.filter((item) => item.scope === "nation");
  const groups = [...new Set(territorial.map((item) => item.group))];
  const petitions = viewModel.petitions.map((item) => `<button type="button" data-submit-petition="${item.id}"><header><strong>${item.petitionTopic}</strong><b>主君への建議</b></header><p>${item.description}</p><small>採否：信頼・官職・功績・派閥・必要性・主君の方針</small><span>政策の実施者は主君・中央政府 →</span></button>`).join("");
  const delegated = viewModel.jurisdiction.grants.map((grant) => `<li><strong>${escapeHtml(grant.reason)}</strong><span>${(grant.territoryIds ?? []).map((id) => WORLD.provinces[id]?.name ?? id).join("・") || "全国"}</span><small>${grant.expiresTurn == null ? "期限なし" : `${grant.expiresTurn}ターンまで`}</small></li>`).join("");
  return `
    <header class="governance-workspace-header"><div><span>ONE GOVERNANCE SCREEN / JURISDICTION</span><h1>${viewModel.jurisdiction.sovereign ? "国家統治" : "領地統治"}</h1><p>領地経営と国家運営は同じ画面です。地位・官職・委任に応じて対象と命令が拡張されます。</p></div><aside><small>現在の管轄</small><strong>${jurisdictionNames.join("・")}</strong><b>${viewModel.jurisdiction.sovereign ? "君主権あり" : `${player.affiliation.liegeName}の臣下`}</b></aside></header>
    <nav class="jurisdiction-selector" aria-label="統治対象">${viewModel.jurisdiction.territoryIds.map((id) => `<button type="button" data-jurisdiction-territory="${id}" class="${id === view.selectedCityId ? "is-active" : ""}"><strong>${escapeHtml(careerTerritoryName(id))}</strong><small>${id === view.selectedCityId ? "表示中" : "自領を開く"}</small></button>`).join("")}</nav>
    <div class="governance-workspace-body">
      <section class="governance-boundary"><article><small>地位</small><strong>${viewModel.stage.name}</strong><span>${player.title}</span></article><article><small>統治領域</small><strong>${viewModel.jurisdiction.territoryIds.length}</strong><span>対象外更新を拒否</span></article><article><small>委任</small><strong>${viewModel.jurisdiction.grants.length}</strong><span>期限と発令者を保存</span></article><article><small>禁止令</small><strong>${viewModel.jurisdiction.prohibitions.length}</strong><span>委任より優先</span></article></section>
      ${groups.map((group) => `<section class="governance-command-group"><header><div><small>LOCAL EXECUTION</small><h2>${group}</h2></div><p>${escapeHtml(careerTerritoryName(view.selectedCityId))}だけへ効果を適用</p></header><div>${territorial.filter((item) => item.group === group).map(governanceCommandCard).join("")}</div></section>`).join("")}
      ${national.length ? `<section class="governance-command-group is-national"><header><div><small>SOVEREIGN EXECUTION</small><h2>国家主権に基づく命令</h2></div><p>独立後、同じ画面へ追加された国家規模の決定です。</p></header><div>${national.map(governanceCommandCard).join("")}</div></section>` : ""}
      ${petitions ? `<section class="governance-command-group is-petition"><header><div><small>PETITION TO THE LIEGE</small><h2>国家政策への建議</h2></div><p>直接実行ではありません。採用後も実施者は主君または中央政府です。</p></header><div>${petitions}</div></section>` : ""}
      <section class="governance-delegations"><header><div><small>OFFICES / DELEGATION / PROHIBITIONS</small><h2>官職と委任</h2></div><p>単純な身分以外の一時権限をここで確認します。</p></header><ul>${delegated || "<li><strong>追加委任なし</strong><span>現在は地位と所領に基づく権限のみ</span></li>"}</ul></section>
      ${roleDelegationSection()}
      ${["lord", "multi_lord", "governor", "duke", "regent"].includes(player.stage) ? `<section class="career-actions governance-politics"><header><div><small>LOYALTY / INTRIGUE / INDEPENDENCE</small><h2>領主としての政治選択</h2></div><p>国家命令の代替ではなく、地位そのものを変える政治行動です。</p></header><div>${careerActionButtons(player)}</div></section>` : ""}
    </div>`;
}

function renderLeftPanel() {
  if (view.panel === "world" && view.shortcutTab === "characters") renderCharacterShortcutPanel();
  else if (view.panel === "career") renderCareerPanel();
  else if (view.panel === "village") renderVillagePanel();
  else if (view.panel === "location") renderLocationPanel();
  else if (view.panel === "governance") renderGovernancePanel();
  else if (view.panel === "centralization") renderCentralizationPanel();
  else if (view.panel === "spending") renderSpendingPanel();
  else if (view.panel === "city") renderCityPanel();
  else if (view.panel === "town") renderTownPanel();
  else if (view.panel === "world") renderWorldPanel();
  else if (view.panel === "diplomacy") renderDiplomacyPanel();
  else if (view.panel === "military") renderMilitaryPanel();
  else if (view.panel === "people") renderPeoplePanel();
  else renderCouncilPanel();
}

function renderAlerts() {
  if (state.player) {
    const player = state.player;
    const alerts = [];
    if (player.invitations.length) alerts.push(`<span class="alert-chip info">仕官の誘い ${player.invitations.length}件</span>`);
    if (getCareerStage(state).governance) alerts.push(`<span class="alert-chip info">管轄 ${player.holdings.length}領 · 国家命令は${player.sovereign ? "実行可能" : "建議のみ"}</span>`);
    const delegation = getRoleDelegation(state);
    if (delegation?.decisionsRequired) alerts.push(`<span class="alert-chip danger">委任先から判断要請 ${delegation.decisionsRequired}件</span>`);
    else if (player.lastDelegationReports?.length) alerts.push(`<span class="alert-chip info">委任実務 ${player.lastDelegationReports.length}件を処理</span>`);
    const lastPetition = player.petitions[0];
    if (lastPetition) alerts.push(`<span class="alert-chip ${lastPetition.status === "accepted" ? "info" : "danger"}">直近の建議：${lastPetition.status === "accepted" ? "採用" : "不採用"}</span>`);
    elements.alertRack.innerHTML = alerts.join("");
    return;
  }
  const alerts = [];
  if (state.council.pending && !state.centralizationCampaign?.ending) alerts.push('<span class="alert-chip danger">季節評定 · 方針未決</span>');
  if (state.phase === "event" && state.pendingEvent) alerts.push(`<span class="alert-chip danger">都市事件 · ${EVENT_DEFINITIONS[state.pendingEvent.eventId].name}</span>`);
  if (state.war) alerts.push(`<span class="alert-chip danger">戦争中 · 戦勝点 ${state.war.score.toFixed(1)}</span>`);
  else if (!state.council.pending && state.issues.border.status === "active") alerts.push('<span class="alert-chip danger">国境問題 · 対応継続中</span>');
  if (state.pendingOrders.length) alerts.push(`<span class="alert-chip info">今月の計画 ${state.pendingOrders.length}件</span>`);
  if (state.commandQueue.length) alerts.push(`<span class="alert-chip info">${state.commandQueue.length}件の任務を実行中</span>`);
  elements.alertRack.innerHTML = alerts.join("");
}

function valueColor(value, inverse = false) {
  const normalized = Math.min(100, Math.max(0, inverse ? 100 - value : value));
  const hue = Math.round(4 + normalized * 1.05);
  return `hsl(${hue} 34% ${42 + normalized * 0.08}%)`;
}

function setMapMarkerText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

const WAR_CONTROL_LABELS = Object.freeze({ friendly: "王国支配", enemy: "公国支配", contested: "係争中" });
const WAR_REGION_STATUS_LABELS = Object.freeze({ frontline: "主戦線", friendly_rear: "王国後方", enemy_rear: "公国後方" });
const WAR_LANDMARK_LABELS = Object.freeze({ fortress: "城砦", depot: "兵站拠点", objective: "作戦要地", pass: "峠道", settlement: "集落" });

const WAR_TILE_SIZE = 68;

function warTileCenter(q, r) {
  return { x: 47 + q * WAR_TILE_SIZE + WAR_TILE_SIZE / 2, y: 66 + r * WAR_TILE_SIZE + WAR_TILE_SIZE / 2 };
}

function warTileBox(q, r) {
  return { x: 47 + q * WAR_TILE_SIZE, y: 66 + r * WAR_TILE_SIZE, size: WAR_TILE_SIZE };
}

function warUnitCounter(unit, index) {
  const center = warTileCenter(unit.q, unit.r);
  const x = center.x + (index % 2 ? 20 : -20);
  const y = center.y + (index > 1 ? 18 : -16);
  return `
    <g class="war-unit-counter is-${unit.side} is-${unit.type}" transform="translate(${x} ${y})" aria-label="${unit.name} 兵${unit.strength}">
      <title>${unit.name} · 兵 ${formatValue(unit.strength)} · 士気 ${unit.morale} · 補給 ${unit.supply}</title>
      <rect x="-22" y="-16" width="44" height="32" rx="3"></rect>
      <text class="war-unit-symbol" x="-12" y="4">${unit.symbol}</text>
      <text class="war-unit-strength" x="13" y="4">${Math.max(0, Math.round(unit.strength / 10))}</text>
    </g>`;
}

function warForceSummary(units, side) {
  const sideUnits = units.filter((unit) => unit.side === side);
  const strength = sideUnits.reduce((sum, unit) => sum + unit.strength, 0);
  const morale = sideUnits.reduce((sum, unit) => sum + unit.morale * unit.strength, 0) / Math.max(1, strength);
  const supply = sideUnits.reduce((sum, unit) => sum + unit.supply * unit.strength, 0) / Math.max(1, strength);
  return { strength, morale: Math.round(morale), supply: Math.round(supply) };
}

function renderWarBoard() {
  const theater = state.war?.theater;
  if (!theater) {
    elements.warBoard.innerHTML = '<p class="war-board-empty">戦域情報を編成中です。</p>';
    return;
  }
  const availableRegion = getWarRegion(theater, view.warRegionId);
  const region = availableRegion ?? getWarRegion(theater);
  view.warRegionId = region.id;
  const selectedTile = region.tiles.find((tile) => tile.id === view.selectedWarHexId)
    ?? region.tiles.find((tile) => tile.landmark?.kind === "objective")
    ?? region.tiles.find((tile) => tile.landmark)
    ?? region.tiles[0];
  view.selectedWarHexId = selectedTile.id;
  const selectedTerrain = WAR_MAP_TERRAINS[selectedTile.terrainId];
  const routePoints = region.tiles
    .filter((tile) => tile.road)
    .sort((left, right) => left.q - right.q)
    .map((tile) => {
      const center = warTileCenter(tile.q, tile.r);
      return `${center.x},${center.y}`;
    }).join(" ");
  const tileMarkup = region.tiles.map((tile) => {
    const box = warTileBox(tile.q, tile.r);
    const center = warTileCenter(tile.q, tile.r);
    const terrain = WAR_MAP_TERRAINS[tile.terrainId];
    const landmark = tile.landmark;
    return `
      <g class="war-map-tile terrain-${tile.terrainId} control-${tile.control} ${tile.id === selectedTile.id ? "is-selected" : ""}" role="button" tabindex="0" data-war-tile="${tile.id}" aria-label="${tile.name}、${terrain.name}、${WAR_CONTROL_LABELS[tile.control]}">
        <rect class="war-tile-base" x="${box.x}" y="${box.y}" width="${box.size}" height="${box.size}"></rect>
        <rect class="war-tile-texture" x="${box.x}" y="${box.y}" width="${box.size}" height="${box.size}" fill="url(#warTerrainTexture)"></rect>
        ${landmark ? `<circle class="war-tile-landmark is-${landmark.kind}" cx="${center.x}" cy="${center.y}" r="7"><title>${landmark.name}</title></circle>` : ""}
      </g>`;
  }).join("");
  const locationCounts = new Map();
  const unitMarkup = theater.units.filter((unit) => unit.regionId === region.id).map((unit) => {
    const key = `${unit.q},${unit.r}`;
    const index = locationCounts.get(key) ?? 0;
    locationCounts.set(key, index + 1);
    return warUnitCounter(unit, index);
  }).join("");
  const regionTabs = theater.regionOrder.map((regionId) => {
    const item = getWarRegion(theater, regionId);
    return `<button type="button" data-war-region="${item.id}" class="${item.id === region.id ? "is-active" : ""} ${item.id === theater.activeRegionId ? "is-front" : ""}"><strong>${item.shortName}</strong><small>${WAR_REGION_STATUS_LABELS[item.status]}</small></button>`;
  }).join("");
  const friendly = warForceSummary(theater.units, "friendly");
  const enemy = warForceSummary(theater.units, "enemy");
  const localUnits = theater.units.filter((unit) => unit.regionId === region.id);
  const unitRows = localUnits.length ? localUnits.map((unit) => `<div class="war-board-unit-row is-${unit.side}"><i>${unit.symbol}</i><span><strong>${unit.name}</strong><small>兵 ${formatValue(unit.strength)} · 士気 ${unit.morale} · 補給 ${unit.supply}</small></span></div>`).join("") : '<p class="war-board-no-units">この地域に常駐部隊はいません。</p>';
  const phaseLabel = theater.phase === "deployment" ? "初期展開" : "作戦進行";
  const initiativeLabel = theater.initiative === "friendly" ? "セレナ王国" : "ヴァルカ公国";
  const lastResolution = theater.lastResolution
    ? `<p class="war-board-last"><strong>前ラウンド</strong><span>戦況 ${signed(theater.lastResolution.delta, 1)} · ${WAR_PLANS[theater.lastResolution.planId]?.name ?? theater.lastResolution.planId}</span></p>`
    : '<p class="war-board-last"><strong>開戦状態</strong><span>両軍が初期配置を完了。月末に第1ラウンドを解決します。</span></p>';
  elements.warBoard.innerHTML = `
    <header class="war-board-header">
      <div><span>REGIONAL WAR BOARD / ROUND ${theater.round}</span><h2>${theater.name}</h2><p>${region.name} · ${region.subtitle}</p></div>
      <div class="war-board-turn"><small>${phaseLabel}</small><strong>主導権 ${initiativeLabel}</strong><span>戦線圧力 ${signed(theater.pressure, 1)}</span></div>
    </header>
    <nav class="war-region-tabs" aria-label="地域盤選択">${regionTabs}</nav>
    <div class="war-board-layout">
      <div class="war-board-map-wrap">
        <svg class="war-board-map" viewBox="0 0 570 490" role="img" aria-label="${region.name}の四角タイル戦域図">
          <defs>
            <pattern id="warTerrainTexture" width="180" height="180" patternUnits="userSpaceOnUse"><image href="./assets/generated/terrain-natural-texture.png" x="0" y="0" width="180" height="180" preserveAspectRatio="xMidYMid slice"></image></pattern>
            <filter id="warCounterShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#0b1717" flood-opacity=".72"></feDropShadow></filter>
          </defs>
          <g class="war-tile-layer">${tileMarkup}</g>
          <polyline class="war-board-road" points="${routePoints}"></polyline>
          <g class="war-unit-layer">${unitMarkup}</g>
        </svg>
        <div class="war-board-legend"><span><i class="is-friendly"></i>王国</span><span><i class="is-contested"></i>係争</span><span><i class="is-enemy"></i>公国</span><span><b>数値</b>兵力×10</span></div>
      </div>
      <aside class="war-board-sidebar">
        <section class="war-board-balance">
          <div class="is-friendly"><small>セレナ王国軍</small><strong>${formatValue(friendly.strength)}</strong><span>士気 ${friendly.morale} · 補給 ${friendly.supply}</span></div>
          <em>戦勝点<br><b>${signed(state.war.score, 1)}</b></em>
          <div class="is-enemy"><small>ヴァルカ公国軍</small><strong>${formatValue(enemy.strength)}</strong><span>士気 ${enemy.morale} · 補給 ${enemy.supply}</span></div>
        </section>
        <section class="war-tile-dossier">
          <header><small>SELECTED TILE · ${selectedTile.q + 1}-${selectedTile.r + 1}</small><h3>${selectedTile.name}</h3><span>${WAR_CONTROL_LABELS[selectedTile.control]}</span></header>
          <div><span><small>地形</small><strong>${selectedTerrain.name}</strong></span><span><small>移動コスト</small><strong>${selectedTerrain.movement}</strong></span><span><small>防御修正</small><strong>+${selectedTerrain.defense}</strong></span><span><small>街道</small><strong>${selectedTile.road ? "接続" : "なし"}</strong></span></div>
          ${selectedTile.landmark ? `<p><strong>${WAR_LANDMARK_LABELS[selectedTile.landmark.kind]}</strong>${selectedTile.landmark.name} · 戦略価値 ${selectedTile.landmark.value}</p>` : '<p>固有拠点のない通常地形です。</p>'}
        </section>
        <section class="war-board-local-forces"><header><h3>${region.shortName}の配置</h3><small>${localUnits.length}個部隊</small></header>${unitRows}</section>
        ${lastResolution}
      </aside>
    </div>`;
}

function renderStrategicMapState() {
  const cityMarkerIds = { selene: "mapForceSelene", nereia: "mapForceNereia", orta: "mapForceOrta" };
  Object.entries(cityMarkerIds).forEach(([cityId, markerId]) => {
    const city = deriveCityMetrics(state, cityId);
    setMapMarkerText(markerId, `兵 ${formatValue(city.troops)} · 防 ${Math.round(city.defense)}`);
  });

  const enemy = state.foreignStates.valka;
  setMapMarkerText("mapForceValka", `兵 ${formatValue(enemy.army)} · 組 ${Math.round(enemy.organization)}`);

  const military = getMilitarySummary(state);
  const formation = FORMATIONS[state.forces.frontier_guard.formation];
  const planLabels = { interdict: "街道遮断", pass: "峠確保", siege: "城砦攻囲" };
  const ownOrder = state.war ? `${planLabels[state.war.plan] ?? "戦役中"} · 士気${Math.round(state.forces.frontier_guard.morale)}` : `${formation.name} · 待機`;
  const enemyOrder = state.war?.lastEnemyAction?.label ?? "峠を警戒";
  setMapMarkerText("frontierArmyStrength", `兵 ${formatValue(military.army)} · 補給${military.supply}`);
  setMapMarkerText("frontierArmyOrder", ownOrder);
  setMapMarkerText("enemyArmyStrength", `兵 ${formatValue(enemy.army)} · 結束${Math.round(enemy.cohesion)}`);
  setMapMarkerText("enemyArmyOrder", enemyOrder);

  const frontierArmy = document.getElementById("frontierArmyMarker");
  const enemyArmy = document.getElementById("enemyArmyMarker");
  const ownPositions = { interdict: "translate(620 390)", pass: "translate(642 356)", siege: "translate(675 365)" };
  frontierArmy?.setAttribute("transform", state.war ? ownPositions[state.war.plan] ?? ownPositions.pass : "translate(590 390)");
  enemyArmy?.setAttribute("transform", state.war ? "translate(700 255)" : "translate(700 225)");

  const passMarker = document.getElementById("passStatusMarker");
  const borderResolved = state.issues.border.status === "resolved" || state.agreements.transit;
  passMarker?.classList.toggle("is-war", Boolean(state.war));
  passMarker?.classList.toggle("is-secure", borderResolved && !state.war);
  setMapMarkerText("passStatusText", state.war ? `交戦中 ${state.war.score >= 0 ? "+" : ""}${Math.round(state.war.score)}` : borderResolved ? "通行確保" : "国境緊張");
}

function generatedRegionViewport(region, expeditionTile, runtime) {
  if (view.generatedMapScale === "world") return { x: 0, y: 0, width: runtime.terrain.width, height: runtime.terrain.height };
  const anchor = runtime.tiles[region.anchorIndex];
  const points = region.tileIndices.map((index) => {
    const tile = runtime.tiles[index];
    let dx = tile.x - anchor.x;
    if (runtime.terrain.config.wrapX && Math.abs(dx) > runtime.terrain.width / 2) dx -= Math.sign(dx) * runtime.terrain.width;
    return { x: anchor.x + dx, y: tile.y };
  });
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  let width = Math.min(runtime.terrain.width, Math.max(28, maxX - minX + 9));
  let height = Math.min(runtime.terrain.height, Math.max(18, maxY - minY + 7));
  const mapWidth = elements.generatedWorldStrip?.clientWidth ?? 0;
  const mapHeight = elements.generatedWorldStrip?.clientHeight ?? 0;
  const targetAspect = mapWidth > 0 && mapHeight > 0 ? Math.min(2.4, Math.max(0.55, mapWidth / mapHeight)) : 1.58;
  if (width / height < targetAspect) width = Math.min(runtime.terrain.width, height * targetAspect);
  else height = Math.min(runtime.terrain.height, width / targetAspect);
  if (width >= runtime.terrain.width) height = Math.min(runtime.terrain.height, width / targetAspect);
  if (height >= runtime.terrain.height) width = Math.min(runtime.terrain.width, height * targetAspect);
  let expeditionX = expeditionTile.x;
  const expeditionDx = expeditionX - anchor.x;
  if (runtime.terrain.config.wrapX && Math.abs(expeditionDx) > runtime.terrain.width / 2) {
    expeditionX -= Math.sign(expeditionDx) * runtime.terrain.width;
  }
  const centerX = expeditionX + 0.5;
  const centerY = expeditionTile.y + 0.5;
  return {
    x: centerX - width / 2,
    y: Math.min(runtime.terrain.height - height, Math.max(0, centerY - height / 2)),
    width,
    height,
  };
}

function visibleUnwrappedTileX(tileX, viewport, worldWidth) {
  return [-1, 0, 1].map((copy) => tileX + copy * worldWidth)
    .sort((left, right) => Math.abs(left + 0.5 - (viewport.x + viewport.width / 2)) - Math.abs(right + 0.5 - (viewport.x + viewport.width / 2)))[0];
}

function generatedUnknownRegionOverlay(runtime, viewport, discoveredRegionIds) {
  const discovered = new Set(discoveredRegionIds ?? []);
  const rows = new Map();
  const visibleUnknownRegionIds = new Set();
  runtime.nations.regions.forEach((region) => {
    if (discovered.has(region.id)) return;
    region.tileIndices.forEach((index) => {
      const tile = runtime.tiles[index];
      if (!tile) return;
      const x = visibleUnwrappedTileX(tile.x, viewport, runtime.terrain.width);
      if (x + 1 <= viewport.x || x >= viewport.x + viewport.width || tile.y + 1 <= viewport.y || tile.y >= viewport.y + viewport.height) return;
      const row = rows.get(tile.y) ?? [];
      row.push(x);
      rows.set(tile.y, row);
      visibleUnknownRegionIds.add(region.id);
    });
  });
  const commands = [];
  [...rows.entries()].sort(([left], [right]) => left - right).forEach(([y, values]) => {
    const ordered = [...new Set(values)].sort((left, right) => left - right);
    let start = ordered[0];
    let end = start;
    const appendRun = () => {
      if (!Number.isFinite(start)) return;
      const left = (start - viewport.x) / viewport.width * 100;
      const top = (y - viewport.y) / viewport.height * 100;
      const width = (end - start + 1) / viewport.width * 100;
      const height = 1 / viewport.height * 100;
      commands.push(`M${left.toFixed(3)} ${top.toFixed(3)}h${width.toFixed(3)}v${height.toFixed(3)}h-${width.toFixed(3)}Z`);
    };
    ordered.slice(1).forEach((x) => {
      if (x === end + 1) end = x;
      else {
        appendRun();
        start = x;
        end = x;
      }
    });
    appendRun();
  });
  return { path: commands.join(""), visibleUnknownRegionCount: visibleUnknownRegionIds.size };
}

// Regional maps follow the hierarchy of European settlement networks instead
// of drawing every hamlet at the same importance. Major cities represent broad
// hinterlands, market towns fill the gaps, and minor sites appear locally.
const GENERATED_MAP_OBJECT_HIERARCHY = Object.freeze({
  castle: Object.freeze({ priority: 100, clearance: 10, world: true }),
  city: Object.freeze({ priority: 95, clearance: 10, world: true }),
  bay_city: Object.freeze({ priority: 90, clearance: 10, world: true }),
  port: Object.freeze({ priority: 72, clearance: 6, world: true }),
  town: Object.freeze({ priority: 68, clearance: 6, world: false }),
  fort: Object.freeze({ priority: 52, clearance: 5, world: false }),
  fishing_port: Object.freeze({ priority: 38, clearance: 4, world: false }),
  village: Object.freeze({ priority: 30, clearance: 4, world: false }),
});

function generatedMapObjectDistance(leftTile, rightTile, runtime) {
  let dx = Math.abs(leftTile.x - rightTile.x);
  if (runtime.terrain.config.wrapX) dx = Math.min(dx, runtime.terrain.width - dx);
  return Math.hypot(dx, leftTile.y - rightTile.y);
}

function generatedMapVisibleObjectIds(runtime, expeditionRegion, expeditionTile, viewport, recognizedTileIds, selectedSite) {
  const selectedObjectId = selectedSite?.kind === "object" ? selectedSite.id : null;
  const candidates = runtime.nations.objects.flatMap((object) => {
    const tile = runtime.tiles[object.tileIndex];
    if (!tile) return [];
    const forced = object.id === selectedObjectId || object.tileIndex === expeditionTile.index;
    if (!forced && recognizedTileIds && !recognizedTileIds.has(tile.id)) return [];
    const profile = GENERATED_MAP_OBJECT_HIERARCHY[object.type] ?? { priority: 10, clearance: 4, world: false };
    if (!forced && view.generatedMapScale === "world" && !profile.world) return [];
    if (!forced && object.type === "village" && object.regionId !== expeditionRegion.id) return [];
    const pairIds = object.strategicGuard ? [object.id, ...(object.pairedFortIds ?? [])].sort() : [object.id];
    if (!forced && pairIds[0] !== object.id) return [];
    const x = visibleUnwrappedTileX(tile.x, viewport, runtime.terrain.width);
    const left = (x + 0.5 - viewport.x) / viewport.width * 100;
    const top = (tile.y + 0.5 - viewport.y) / viewport.height * 100;
    if (!forced && (left < -4 || left > 104 || top < -4 || top > 104)) return [];
    return [{ object, tile, profile, forced, local: object.regionId === expeditionRegion.id }];
  }).sort((left, right) => (
    Number(right.forced) - Number(left.forced)
    || Number(right.local) - Number(left.local)
    || right.profile.priority - left.profile.priority
    || (right.object.importance ?? 0) - (left.object.importance ?? 0)
    || left.object.id.localeCompare(right.object.id)
  ));
  const accepted = [];
  for (const candidate of candidates) {
    const crowded = !candidate.forced && accepted.some((other) => (
      generatedMapObjectDistance(candidate.tile, other.tile, runtime) < Math.max(candidate.profile.clearance, other.profile.clearance)
    ));
    if (!crowded) accepted.push(candidate);
  }
  return new Set(accepted.map((entry) => entry.object.id));
}

function positionGeneratedRegionMarker(copy, expeditionRegion, expeditionTile, runtime, viewport) {
  const expedition = copy.querySelector(".generated-expedition-marker");
  const tile = expeditionTile;
  const x = visibleUnwrappedTileX(tile.x, viewport, runtime.terrain.width);
  expedition.style.left = `${(x + 0.5 - viewport.x) / viewport.width * 100}%`;
  expedition.style.top = `${(tile.y + 0.5 - viewport.y) / viewport.height * 100}%`;
  expedition.dataset.generatedRegionId = expeditionRegion.id;
  expedition.dataset.generatedTileId = tile.id;
  expedition.setAttribute("aria-label", `現在地 · ${expeditionRegion.name}`);
  expedition.title = `現在地 · ${expeditionRegion.name}`;
}

function positionGeneratedRegionMoveTargets(copy, runtime, expeditionRegion, expeditionTile, viewport) {
  const layer = copy.querySelector(".generated-region-move-layer");
  if (!layer) return;
  if (view.generatedMapScale !== "region") {
    layer.innerHTML = "";
    return;
  }
  const expeditionX = visibleUnwrappedTileX(expeditionTile.x, viewport, runtime.terrain.width);
  const reachableById = new Map(getGeneratedExpeditionReachableRegions(state).map((entry) => [entry.regionId, entry]));
  layer.innerHTML = expeditionRegion.neighborIds.map((regionId) => {
    const region = runtime.regionById.get(regionId);
    if (!region) return "";
    const positionedTiles = region.tileIndices.map((index) => runtime.tiles[index]).map((tile) => {
      const x = visibleUnwrappedTileX(tile.x, viewport, runtime.terrain.width);
      return {
        tile,
        x,
        left: (x + 0.5 - viewport.x) / viewport.width * 100,
        top: (tile.y + 0.5 - viewport.y) / viewport.height * 100,
      };
    }).sort((left, right) => (
      Math.hypot(left.x - expeditionX, left.tile.y - expeditionTile.y)
      - Math.hypot(right.x - expeditionX, right.tile.y - expeditionTile.y)
    ));
    const target = positionedTiles.find((entry) => entry.left >= 2 && entry.left <= 98 && entry.top >= 4 && entry.top <= 96)
      ?? positionedTiles[0];
    if (!target) return "";
    const targetLeft = Math.max(2, Math.min(98, target.left));
    const targetTop = Math.max(4, Math.min(96, target.top));
    const reachable = reachableById.get(region.id);
    const cost = Math.max(1, Math.ceil(region.movementCost));
    const disabled = !reachable;
    const label = disabled ? `${region.name}（移動力 ${cost} 必要）` : `${region.name}へ移動（移動力 ${reachable.cost}）`;
    return `<button type="button" class="generated-region-move-target${disabled ? " is-disabled" : ""}" style="left:${targetLeft}%;top:${targetTop}%" data-generated-map-move-region="${region.id}" ${disabled ? "disabled" : ""} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${escapeHtml(region.name)}</span><small>${disabled ? `移動力 ${cost} 必要` : `進む · ${reachable.cost}`}</small></button>`;
  }).join("");
}

function generatedTravelPathData(pathTiles, runtime, viewport = null) {
  if (!pathTiles?.length) return "";
  let previousX = pathTiles[0].x;
  return pathTiles.map((tile, index) => {
    const x = index === 0
      ? tile.x
      : previousX + squareWrappedDeltaX(previousX, tile.x, runtime.terrain.width, runtime.terrain.config.wrapX);
    previousX = x;
    const left = viewport ? (x + 0.5 - viewport.x) / viewport.width * 100 : (x + 0.5) / runtime.terrain.width * 100;
    const top = viewport ? (tile.y + 0.5 - viewport.y) / viewport.height * 100 : (tile.y + 0.5) / runtime.terrain.height * 100;
    return `${index ? "L" : "M"} ${left.toFixed(2)} ${top.toFixed(2)}`;
  }).join(" ");
}

function renderGeneratedRegionMoveConfirmation(copy, runtime, viewport) {
  const layer = copy.querySelector(".generated-region-confirm-layer");
  const route = copy.querySelector(".generated-travel-route");
  const routePath = route?.querySelector("path");
  if (!layer) return;
  if (view.generatedMapScale !== "region" || !view.pendingGeneratedDestinationId) {
    layer.innerHTML = "";
    route?.classList.remove("is-preview", "is-route", "is-direct");
    if (!view.generatedTravel) routePath?.setAttribute("d", "");
    return;
  }
  const travelOptions = getGeneratedExpeditionTravelOptions(state, view.pendingGeneratedDestinationId);
  const savedMode = state.generatedWorld?.travelModePreference ?? null;
  const firstSelection = !savedMode;
  const activeMode = firstSelection ? view.pendingGeneratedTravelMode : savedMode;
  const selectedMode = travelOptions.find((option) => option.id === activeMode) ?? travelOptions[0];
  const region = runtime.regionById.get(view.pendingGeneratedDestinationId);
  const nation = region ? runtime.nationById.get(region.nationId) : null;
  if (!selectedMode || !region) {
    view.pendingGeneratedDestinationId = null;
    layer.innerHTML = "";
    return;
  }
  routePath?.setAttribute("d", generatedTravelPathData(selectedMode.pathTiles, runtime, viewport));
  route?.classList.add("is-preview", `is-${selectedMode.id}`);
  route?.classList.remove(selectedMode.id === "route" ? "is-direct" : "is-route");
  const optionRows = travelOptions.map((option) => `<button type="button" class="generated-travel-mode-option ${option.id === selectedMode.id ? "is-active" : ""}" data-generated-travel-mode="${option.id}">
    <span><strong>${escapeHtml(option.name)}</strong><small>${option.id === "route" ? "デフォルト" : "高負荷"}</small></span>
    <p>${escapeHtml(option.description)}</p>
    <em>約${formatGeneratedTravelDuration(option.travelMinutes)} · 移動力${option.cost} · 保存食${option.supplyCost}${option.unavailableReason ? ` · ${escapeHtml(option.unavailableReason)}` : ""}</em>
  </button>`).join("");
  layer.innerHTML = `<section class="generated-region-move-confirmation" role="dialog" aria-label="${escapeHtml(region.name)}への移動確認" style="--confirm-x:${Number(view.generatedConfirmOffsetX) || 0}px;--confirm-y:${Number(view.generatedConfirmOffsetY) || 0}px">
    <header data-drag-generated-confirm title="ドラッグまたはスワイプで移動"><div><small>TRAVEL CONFIRMATION</small><strong>地方移動の確認</strong></div><button type="button" data-generated-map-move-cancel aria-label="移動確認を閉じる">×</button></header>
    <h2>${escapeHtml(region.name)}</h2>
    <p>${escapeHtml(nation?.name ?? "所属不明")} · ${escapeHtml(generatedRegionTerrainLabel(region))}</p>
    ${firstSelection
      ? `<aside class="generated-travel-first-choice"><strong>初回のみ移動方法を選択</strong><p>ここで選んだ方法を今後の既定値として保存します。初期選択は「道順」です。</p></aside><nav class="generated-travel-mode-options" aria-label="移動手段">${optionRows}</nav>`
      : `<aside class="generated-travel-saved-choice"><strong>既定の移動方法：${escapeHtml(selectedMode.name)}</strong><p>移動方法はバックメニューの「システム → 地方移動」から変更できます。</p></aside>`}
    <div><span><small>所要時間</small><strong>約${formatGeneratedTravelDuration(selectedMode.travelMinutes)}</strong></span><span><small>消費</small><strong>移動力${selectedMode.cost} · 保存食${selectedMode.supplyCost}</strong></span></div>
    <em>${selectedMode.name} · 遭遇率 ${Math.round(selectedMode.encounterChance * 100)}%。移動を実行すると世界時刻が進みます。</em>
    <footer><button type="button" data-generated-map-move-cancel>戻る</button><button type="button" class="is-confirm" data-generated-map-move-confirm="${region.id}" ${selectedMode.available ? "" : "disabled"}>${selectedMode.available ? firstSelection ? "既定に設定して移動" : "この設定で移動" : "物資不足"}</button></footer>
  </section>`;
}

function generatedSiteSelectionContext() {
  const selection = view.selectedGeneratedSite;
  if (!selection) return null;
  if (selection.kind === "barbarian") {
    const { runtime, expeditionTile } = getGeneratedWorldView(state);
    const site = getGeneratedBarbarianView(state).sites.find((entry) => entry.id === selection.id && entry.detected);
    if (!site?.tile) {
      view.selectedGeneratedSite = null;
      view.generatedSiteInfoOpen = false;
      return null;
    }
    const terrain = GENERATED_TERRAIN_LABELS[site.tile.terrain] ?? site.tile.terrain;
    const relief = GENERATED_RELIEF_LABELS[site.tile.relief] ?? site.tile.relief;
    const description = site.kind === "monster_nest"
      ? `${site.speciesName}が定着した魔物の巣です。毎月近隣集落を襲い、実人口へ被害を与えます。`
      : `${site.peopleName}が国家管理外に築いた${site.stageLabel}です。都市国家に達して取引を結ばない限り、段階的な討伐対象です。`;
    return {
      kind: "barbarian",
      id: site.id,
      type: site.kind === "monster_nest" ? "monster_nest" : site.status === "city_state" ? "barbarian_city_state" : `barbarian_${site.settlementLevel}`,
      typeLabel: site.stageLabel,
      symbol: site.kind === "monster_nest" ? "巣" : site.status === "city_state" ? "国" : "蛮",
      name: site.name,
      description,
      regionName: site.region?.name ?? "未所属地域",
      nationName: site.nation?.name ?? "無主地",
      terrainLabel: `${terrain}・${relief}`,
      population: site.population || null,
      regionOffice: site.region?.officeTitle ?? "未設定",
      regionStatus: site.region?.status ?? "frontier",
      current: expeditionTile.id === site.tile.id,
      canMove: false,
      movementCost: null,
      travelMinutes: null,
      barbarianKind: site.kind,
      strength: site.strength,
      responseLabel: site.responseLabel,
      agreementLabel: site.agreementLabel,
      cumulativeDamage: site.cumulativeDamage,
      tradeValue: site.tradeValue,
      unmanaged: site.unmanaged,
      runtimeKey: runtime.key,
    };
  }
  if (selection.kind === "colony") {
    const colonization = getGeneratedColonizationView(state);
    const candidate = colonization.candidates.find((entry) => entry.tileId === selection.id);
    if (!candidate) {
      view.selectedGeneratedSite = null;
      view.generatedSiteInfoOpen = false;
      return null;
    }
    const terrain = GENERATED_TERRAIN_LABELS[candidate.tile.terrain] ?? candidate.tile.terrain;
    const relief = GENERATED_RELIEF_LABELS[candidate.tile.relief] ?? candidate.tile.relief;
    return {
      kind: "colony",
      id: candidate.tileId,
      type: "colony",
      typeLabel: "植民候補地",
      symbol: "旗",
      name: candidate.defaultName,
      defaultName: candidate.defaultName,
      description: `都市圏から第${candidate.expansionWave}段階として広がる街道沿いの候補地です。街道から${candidate.roadsideDistance}区画、中心地から${candidate.urbanDistance}区画離れています。`,
      regionName: candidate.region.name,
      nationName: candidate.nation.name,
      terrainLabel: `${terrain}・${relief}`,
      regionOffice: candidate.region.officeTitle,
      regionStatus: candidate.region.status,
      current: candidate.current,
      canMove: candidate.canMove,
      movementCost: 0,
      travelMinutes: candidate.travelMinutes,
      travelMode: "land",
      colonyTileId: candidate.tileId,
      canFound: candidate.canFound,
      canAfford: colonization.canAfford,
      hasRequiredReputation: colonization.hasRequiredReputation,
      reputation: colonization.reputation.value,
      requiredReputation: colonization.requiredReputation,
      colonyCost: colonization.cost,
      colonyReason: colonization.reason,
      suitability: candidate.suitability,
      expansionWave: candidate.expansionWave,
      roadsideDistance: candidate.roadsideDistance,
      urbanDistance: candidate.urbanDistance,
    };
  }
  if (selection.kind === "object") {
    try {
      const site = getGeneratedWorldSiteView(state, selection.id);
      const terrain = GENERATED_TERRAIN_LABELS[site.tile.terrain] ?? site.tile.terrain;
      const relief = GENERATED_RELIEF_LABELS[site.tile.relief] ?? site.tile.relief;
      const descriptions = {
        castle: "国家の統治と軍事の中枢となる城。周辺地方の情勢と城主勢力を確認できます。",
        city: "地域人口と交易が集中する都市。市場、職人、行政機能を備え、周辺街道の主要ハブとなります。",
        town: "村から成長した町。常設市場と職人街を持ち、周辺村の産物を街道へ集めます。",
        village: "旅の支度、依頼、仲間との出会いがある村。到着後は村の施設へ入れます。",
        fishing_port: "沿岸漁業と近海輸送を担う漁港。港湾都市階層の入口として、港と湾口都市へ海産物を送ります。",
        port: "定期船と商船が寄港する港。漁港の荷を集め、湾口都市や遠方の海路へ積み替えます。",
        bay_city: "湾口を押さえる大規模な港湾都市。海上交通、関税、防衛を束ねる沿岸圏の中枢です。",
        fort: "街道や国境を監視する防衛拠点。守備側の兵站と周辺の通行を支えます。",
      };
      return {
        kind: "object",
        id: site.id,
        type: site.type,
        typeLabel: GENERATED_WORLD_OBJECT_LABELS[site.type] ?? site.type,
        symbol: { castle: "城", city: "都", town: "町", village: "村", fishing_port: "漁", port: "港", bay_city: "湾", fort: "砦" }[site.type] ?? "地",
        name: site.name,
        description: descriptions[site.type] ?? "地図上の拠点です。",
        regionName: site.region.name,
        nationName: site.nation?.name ?? "無主地",
        terrainLabel: `${terrain}・${relief}`,
        population: site.object.population ?? null,
        regionOffice: site.region.officeTitle,
        regionStatus: site.region.status,
        current: site.current,
        canMove: site.canMove,
        movementCost: site.movementCost,
        travelMinutes: site.travelMinutes,
        travelMode: site.travelMode,
        shippingRoute: site.shippingRoute,
        villageId: site.object.settlementLevel && !["castle", "fort"].includes(site.type) && site.current ? site.id : null,
        locationId: ["castle", "fort"].includes(site.type) && site.current ? site.id : null,
        locationKind: ["castle", "fort"].includes(site.type) ? "object" : null,
        locationEnterLabel: site.type === "castle" ? "城へ入る" : site.type === "fort" ? "砦へ入る" : null,
      };
    } catch {
      view.selectedGeneratedSite = null;
      view.generatedSiteInfoOpen = false;
      return null;
    }
  }
  const context = currentAdventureContext();
  const { dungeon } = getRegionAdventureSites(state, context);
  const personalMap = getPersonalMapView(state, context);
  const location = personalMap.locations.find((entry) => entry.id === selection.id);
  if (selection.kind !== "dungeon" || dungeon.id !== selection.id || !location?.discovered) {
    view.selectedGeneratedSite = null;
    view.generatedSiteInfoOpen = false;
    return null;
  }
  const archetype = DUNGEON_ARCHETYPES[dungeon.dungeonType];
  return {
    kind: "dungeon",
    id: dungeon.id,
    type: "dungeon",
    typeLabel: archetype.name,
    symbol: archetype.symbol,
    name: dungeon.name,
    description: dungeon.description,
    regionName: context.region.name,
    nationName: context.nation.name,
    terrainLabel: archetype.name,
    current: location.current,
    canMove: location.reachable,
    movementCost: null,
    travelMinutes: location.current ? 0 : personalMapTravelMinutes(personalMap.currentLocation, location),
    dungeonId: location.current ? dungeon.id : null,
    dungeonEnterLabel: `${archetype.name}へ入る`,
  };
}

function renderGeneratedSiteActionMenu(site) {
  if (!site) return "";
  const movementNote = site.current
    ? site.kind === "colony" ? "植民候補地に到着" : "現在地"
    : site.travelMode === "sea"
      ? site.canMove ? `海運 · 移動力 ${site.movementCost} · 約${formatGeneratedTravelDuration(site.travelMinutes)}` : `海路あり · 必要移動力 ${site.movementCost}`
    : site.canMove
      ? site.kind === "dungeon" ? `個人マップで隣接 · 約${formatGeneratedTravelDuration(site.travelMinutes)}` : site.movementCost > 0 ? `移動力 ${site.movementCost} · 約${formatGeneratedTravelDuration(site.travelMinutes)}` : `同じ地方 · 約${formatGeneratedTravelDuration(site.travelMinutes)}`
      : "現在は移動不可";
  const moveButton = site.current
    ? '<button type="button" class="is-current" disabled><span>現在地</span><small>すでに到着しています</small></button>'
    : `<button type="button" data-generated-site-move ${site.canMove ? "" : "disabled"}><span>ここへ移動する</span><small>${escapeHtml(movementNote)}</small></button>`;
  const enterButton = site.colonyTileId
    ? `<button type="button" class="is-enter" data-found-generated-village="${site.colonyTileId}" ${site.canFound ? "" : "disabled"}><span>村を建設する</span><small>${site.hasRequiredReputation && site.canAfford ? `地方名声 ${site.reputation}/${site.requiredReputation}・財産 ${site.colonyCost.wealth}・保存食 ${site.colonyCost.food}・建設 7日` : escapeHtml(site.colonyReason)}</small></button>`
    : site.villageId
      ? `<button type="button" class="is-enter" data-enter-village="${site.villageId}"><span>${escapeHtml(site.typeLabel)}へ入る</span><small>${["fishing_port", "port", "bay_city"].includes(site.type) ? "港湾、市場、船員を訪ねる" : "施設と住民を訪ねる"}</small></button>`
    : site.locationId
      ? `<button type="button" class="is-enter" data-enter-location="${site.locationId}" data-enter-location-kind="${site.locationKind}"><span>${escapeHtml(site.locationEnterLabel)}</span><small>${site.type === "castle" ? "城門・宮廷・兵舎を訪ねる" : "守備・見張り・兵站を確認する"}</small></button>`
      : site.dungeonId
      ? `<button type="button" class="is-enter" data-enter-dungeon="${site.dungeonId}"><span>${escapeHtml(site.dungeonEnterLabel)}</span><small>危険・依頼・隊列を確認する</small></button>`
      : "";
  return `<section class="generated-site-action-menu is-${site.type}" role="dialog" aria-label="${escapeHtml(site.name)}の行動選択">
    <header><i aria-hidden="true">${escapeHtml(site.symbol)}</i><span><small>${escapeHtml(site.typeLabel)} · ${escapeHtml(movementNote)}</small><strong>${escapeHtml(site.name)}</strong></span><button type="button" data-generated-site-close aria-label="地点メニューを閉じる">×</button></header>
    <p>この地点で行うことを選んでください。</p>
    <div class="generated-site-action-choices">
      <button type="button" data-generated-site-info aria-pressed="${view.generatedSiteInfoOpen}"><span>情報を見る</span><small>地点・所属・地勢</small></button>
      ${moveButton}${enterButton}
    </div>
    ${view.generatedSiteInfoOpen ? `<div class="generated-site-information"><p>${escapeHtml(site.description)}</p><dl><div><dt>地域</dt><dd>${escapeHtml(site.regionName)}</dd></div><div><dt>支配勢力</dt><dd>${escapeHtml(site.nationName)}</dd></div><div><dt>領主職</dt><dd>${escapeHtml(site.regionOffice ?? "未設定")}</dd></div>${site.population ? `<div><dt>人口</dt><dd>${formatValue(site.population)}</dd></div>` : ""}<div><dt>地勢</dt><dd>${escapeHtml(site.terrainLabel)}</dd></div>${site.kind === "barbarian" ? `<div><dt>戦力</dt><dd>${site.strength}</dd></div><div><dt>${site.agreementLabel ? "取引" : "討伐段階"}</dt><dd>${escapeHtml(site.agreementLabel ?? site.responseLabel)}</dd></div>${site.barbarianKind === "monster_nest" ? `<div><dt>累計人口被害</dt><dd>${site.cumulativeDamage}</dd></div>` : `<div><dt>交易価値</dt><dd>${site.tradeValue}</dd></div>`}` : ""}${site.kind === "colony" ? `<div><dt>必要な信用</dt><dd>地方名声 ${site.reputation} / ${site.requiredReputation}</dd></div><div><dt>発展段階</dt><dd>第${site.expansionWave}波・街道距離 ${site.roadsideDistance}</dd></div><div><dt>適性</dt><dd>${site.suitability}</dd></div>` : ""}</dl></div>` : ""}
  </section>`;
}

function positionGeneratedSiteMarkers(copy, runtime, viewport, dungeon, personalMap, selectedSite, colonyCandidate = null, recognizedTileIds = null, barbarianSites = [], visibleObjectIds = null) {
  const markerLayer = copy.querySelector(".generated-site-marker-layer");
  const objectMarkers = runtime.nations.objects.map((object) => {
    const tile = runtime.tiles[object.tileIndex];
    if (!tile || visibleObjectIds && !visibleObjectIds.has(object.id)) return "";
    const x = visibleUnwrappedTileX(tile.x, viewport, runtime.terrain.width);
    const left = (x + 0.5 - viewport.x) / viewport.width * 100;
    const top = (tile.y + 0.5 - viewport.y) / viewport.height * 100;
    if (left < -4 || left > 104 || top < -4 || top > 104) return "";
    const selected = selectedSite?.kind === "object" && selectedSite.id === object.id;
    return `<button type="button" class="generated-site-marker is-${object.type} ${selected ? "is-selected" : ""}" style="left:${left}%;top:${top}%" data-generated-site-kind="object" data-generated-site-id="${object.id}" aria-label="${escapeHtml(object.name)}の行動を選ぶ" title="${escapeHtml(object.name)}"></button>`;
  }).join("");
  const dungeonLocation = personalMap.locations.find((location) => location.id === dungeon.id);
  let dungeonMarker = "";
  if (dungeon.tile && dungeonLocation?.discovered && (!recognizedTileIds || recognizedTileIds.has(dungeon.tile.id))) {
    const dungeonX = visibleUnwrappedTileX(dungeon.tile.x, viewport, runtime.terrain.width);
    const left = (dungeonX + 0.5 - viewport.x) / viewport.width * 100;
    const top = (dungeon.tile.y + 0.5 - viewport.y) / viewport.height * 100;
    const selected = selectedSite?.kind === "dungeon" && selectedSite.id === dungeon.id;
    dungeonMarker = `<button type="button" class="generated-site-marker generated-dungeon-marker is-dungeon ${selected ? "is-selected" : ""}" style="left:${left}%;top:${top}%" data-generated-site-kind="dungeon" data-generated-site-id="${dungeon.id}" data-dungeon-type="${dungeon.dungeonType}" aria-label="${escapeHtml(dungeon.name)}の行動を選ぶ" title="${escapeHtml(dungeon.name)}">${escapeHtml(DUNGEON_ARCHETYPES[dungeon.dungeonType].symbol)}</button>`;
  }
  let colonyMarker = "";
  if (colonyCandidate && view.generatedMapScale === "region" && (!recognizedTileIds || recognizedTileIds.has(colonyCandidate.tile.id))) {
    const colonyX = visibleUnwrappedTileX(colonyCandidate.tile.x, viewport, runtime.terrain.width);
    const left = (colonyX + 0.5 - viewport.x) / viewport.width * 100;
    const top = (colonyCandidate.tile.y + 0.5 - viewport.y) / viewport.height * 100;
    const selected = selectedSite?.kind === "colony" && selectedSite.id === colonyCandidate.tileId;
    colonyMarker = `<button type="button" class="generated-site-marker is-colony ${selected ? "is-selected" : ""}" style="left:${left}%;top:${top}%" data-generated-site-kind="colony" data-generated-site-id="${colonyCandidate.tileId}" aria-label="${escapeHtml(colonyCandidate.defaultName)}で植民を計画する" title="植民候補 · ${escapeHtml(colonyCandidate.defaultName)}">旗</button>`;
  }
  const barbarianMarkers = barbarianSites.filter((site) => site.detected && site.tile && (!recognizedTileIds || recognizedTileIds.has(site.tile.id))).map((site) => {
    const siteX = visibleUnwrappedTileX(site.tile.x, viewport, runtime.terrain.width);
    const left = (siteX + 0.5 - viewport.x) / viewport.width * 100;
    const top = (site.tile.y + 0.5 - viewport.y) / viewport.height * 100;
    if (left < -4 || left > 104 || top < -4 || top > 104) return "";
    const selected = selectedSite?.kind === "barbarian" && selectedSite.id === site.id;
    const markerType = site.kind === "monster_nest" ? "monster_nest" : site.status === "city_state" ? "barbarian_city_state" : `barbarian_${site.settlementLevel}`;
    const symbol = site.kind === "monster_nest" ? "巣" : site.status === "city_state" ? "国" : "蛮";
    return `<button type="button" class="generated-site-marker is-${markerType} ${selected ? "is-selected" : ""}" style="left:${left}%;top:${top}%" data-generated-site-kind="barbarian" data-generated-site-id="${site.id}" aria-label="${escapeHtml(site.name)}の情報を見る" title="${escapeHtml(site.stageLabel)} · ${escapeHtml(site.name)}">${symbol}</button>`;
  }).join("");
  markerLayer.innerHTML = `${objectMarkers}${dungeonMarker}${colonyMarker}${barbarianMarkers}`;
  copy.querySelector(".generated-site-action-layer").innerHTML = renderGeneratedSiteActionMenu(selectedSite);
}

function renderGeneratedWorldMapLayer() {
  const { runtime, generatedState, expeditionRegion, expeditionTile, playerNation } = getGeneratedWorldView(state);
  const currentNation = runtime.nationById.get(expeditionRegion.nationId) ?? playerNation;
  const { dungeon } = getRegionAdventureSites(state, { runtime, region: expeditionRegion, nation: currentNation });
  const personalMap = getPersonalMapView(state, { runtime, region: expeditionRegion, nation: currentNation });
  const colonization = getGeneratedColonizationView(state);
  const barbarianFrontier = getGeneratedBarbarianView(state);
  const recognition = getGeneratedRecognitionView(state);
  const selectedSite = generatedSiteSelectionContext();
  const colonyCandidate = selectedSite?.kind === "colony"
    ? colonization.candidates.find((candidate) => candidate.tileId === selectedSite.id) ?? colonization.bestCandidate
    : colonization.bestCandidate;
  const baseViewport = generatedRegionViewport(expeditionRegion, expeditionTile, runtime);
  const viewport = {
    ...baseViewport,
    x: baseViewport.x + (Number(view.generatedPanX) || 0),
    y: Math.min(Math.max(0, runtime.terrain.height - baseViewport.height), Math.max(0, baseViewport.y + (Number(view.generatedPanY) || 0))),
  };
  const visibleObjectIds = generatedMapVisibleObjectIds(runtime, expeditionRegion, expeditionTile, viewport, recognition.recognizedTileIds, selectedSite);
  const focusedNation = ["geopolitics", "nations", "statistics"].includes(view.atlasMode)
    ? runtime.nationById.get(view.selectedGeneratedNationId) ?? playerNation
    : null;
  const visibleObjectKey = [...visibleObjectIds].sort().join(",");
  const visualKey = `${runtime.key}|illustrated-strategy-map-v8-european-settlement-hierarchy|${view.generatedMapScale}|${visibleObjectKey}`;
  if (generatedMapVisualCache.key !== visualKey) {
    let url = generatedMapVisualCache.entries.get(visualKey);
    if (url) {
      generatedMapVisualCache.entries.delete(visualKey);
      generatedMapVisualCache.entries.set(visualKey, url);
    } else {
      const mapSvg = renderTerrainSvg(runtime.terrain, {
        cellSize: 8,
        pixelsPerTile: 8,
        showGrid: false,
        nationMap: runtime.nations,
        visibleObjectIds,
        textureUrl: new URL("./assets/generated/terrain-natural-texture.png", window.location.href).href,
      });
      // Blob URLs avoid percent-encoding and retaining a ~20 MB data URL.
      url = URL.createObjectURL(new Blob([mapSvg], { type: "image/svg+xml" }));
      generatedMapVisualCache.entries.set(visualKey, url);
      if (generatedMapVisualCache.entries.size > 2) {
        const oldestKey = generatedMapVisualCache.entries.keys().next().value;
        URL.revokeObjectURL(generatedMapVisualCache.entries.get(oldestKey));
        generatedMapVisualCache.entries.delete(oldestKey);
      }
    }
    generatedMapVisualCache.key = visualKey;
    generatedMapVisualCache.url = url;
  }
  if (elements.generatedWorldStrip.dataset.visualKey !== visualKey) {
    elements.generatedWorldStrip.innerHTML = `
      <div class="generated-world-copy" data-generated-map-copy="0" role="img" aria-label="地方単位で移動する生成世界地図">
        <div class="generated-world-canvas">
          <img alt="生成世界の西側複製" draggable="false"><img alt="高精細な海岸、山脈、森林、河川、地方、国家、拠点を描いた生成世界" draggable="false"><img alt="生成世界の東側複製" draggable="false">
        </div>
        <div class="generated-world-fog" aria-hidden="true"></div>
        <svg class="generated-region-knowledge-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path></path></svg>
        <svg class="generated-travel-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path></path></svg>
        <button type="button" class="generated-expedition-marker" aria-label="現在地"><span><b>現在地</b></span><i aria-hidden="true">◆</i></button>
        <div class="generated-region-move-layer" aria-label="隣接地方への地図移動"></div>
        <div class="generated-region-confirm-layer" aria-live="polite"></div>
        <div class="generated-site-marker-layer"></div>
        <div class="generated-site-action-layer"></div>
      </div>
    `;
    elements.generatedWorldStrip.querySelectorAll("img").forEach((image) => { image.src = generatedMapVisualCache.url; });
    elements.generatedWorldStrip.dataset.visualKey = visualKey;
  }
  elements.generatedWorldStrip.querySelectorAll(".generated-world-copy").forEach((copy) => {
    copy.dataset.viewportX = String(viewport.x);
    copy.dataset.viewportY = String(viewport.y);
    copy.dataset.viewportWidth = String(viewport.width);
    copy.dataset.viewportHeight = String(viewport.height);
    copy.dataset.cameraTileId = expeditionTile.id;
    copy.dataset.visibleObjectCount = String(visibleObjectIds.size);
    const canvas = copy.querySelector(".generated-world-canvas");
    canvas.style.left = `${-(runtime.terrain.width + viewport.x) / viewport.width * 100}%`;
    canvas.style.top = `${-viewport.y / viewport.height * 100}%`;
    canvas.style.width = `${runtime.terrain.width * 3 / viewport.width * 100}%`;
    canvas.style.height = `${runtime.terrain.height / viewport.height * 100}%`;
    const visiblePlayerX = visibleUnwrappedTileX(expeditionTile.x, viewport, runtime.terrain.width);
    const recognitionLeft = (visiblePlayerX + 0.5 - viewport.x) / viewport.width * 100;
    const recognitionTop = (expeditionTile.y + 0.5 - viewport.y) / viewport.height * 100;
    const fog = copy.querySelector(".generated-world-fog");
    fog.style.setProperty("--recognition-x", `${recognitionLeft}%`);
    fog.style.setProperty("--recognition-y", `${recognitionTop}%`);
    fog.style.setProperty("--recognition-radius-x", `${recognition.radius / viewport.width * 100}%`);
    fog.style.setProperty("--recognition-radius-y", `${recognition.radius / viewport.height * 100}%`);
    const knowledgeLayer = copy.querySelector(".generated-region-knowledge-layer");
    const unknownOverlay = generatedUnknownRegionOverlay(runtime, viewport, [...generatedState.discoveredRegionIds, expeditionRegion.id]);
    knowledgeLayer.querySelector("path").setAttribute("d", unknownOverlay.path);
    knowledgeLayer.dataset.unknownRegionCount = String(unknownOverlay.visibleUnknownRegionCount);
    positionGeneratedRegionMarker(copy, expeditionRegion, expeditionTile, runtime, viewport);
    positionGeneratedRegionMoveTargets(copy, runtime, expeditionRegion, expeditionTile, viewport);
    renderGeneratedRegionMoveConfirmation(copy, runtime, viewport);
    positionGeneratedSiteMarkers(copy, runtime, viewport, dungeon, personalMap, selectedSite, colonyCandidate, recognition.recognizedTileIds, barbarianFrontier.sites, visibleObjectIds);
  });
  elements.generatedWorldMap.querySelectorAll("[data-generated-map-scale]").forEach((button) => button.classList.toggle("is-active", button.dataset.generatedMapScale === view.generatedMapScale));
  paintGeneratedMapLegend();
  paintGeneratedWorldTime(getGeneratedWorldTimeView(state));
  elements.mapModeEyebrow.textContent = focusedNation ? "GENERATED NATION MAP" : view.generatedMapScale === "region" ? "REGIONAL PLAY MAP" : "GENERATED WORLD OVERVIEW";
  elements.mapCaptionTitle.textContent = focusedNation
    ? `${focusedNation.name} · 世界全図`
    : view.generatedMapScale === "region" ? `現在地｜${expeditionRegion.name}` : `${playerNation.name} · 世界全図`;
}

function paintGeneratedMapLegend() {
  if (!elements.generatedWorldMapHelp || !elements.generatedMapLegendToggle) return;
  if (!view.generatedMapLegendInitialized) {
    view.generatedMapLegendOpen = !isCompactMobileShell();
    view.generatedMapLegendInitialized = true;
  }
  const open = view.generatedMapLegendOpen !== false;
  elements.generatedWorldMapHelp.classList.toggle("is-collapsed", !open);
  elements.generatedMapLegendToggle.setAttribute("aria-expanded", String(open));
  elements.generatedMapLegendToggle.setAttribute("aria-label", open ? "凡例を非表示" : "凡例を表示");
  elements.generatedMapLegendToggle.title = open ? "凡例を非表示" : "凡例を表示";
}

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function playGeneratedTravel(nextState, destinationName, message, travelPlan = null) {
  if (view.generatedTravel) return;
  const fromWorld = getGeneratedWorldView(state);
  const toWorld = getGeneratedWorldView(nextState);
  const fromTime = getGeneratedWorldTimeView(state);
  const toTime = getGeneratedWorldTimeView(nextState);
  const elapsedMinutes = Math.max(0, toTime.elapsedMinutes - fromTime.elapsedMinutes);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const animationDuration = reducedMotion ? 900 : Math.min(4800, 2400 + elapsedMinutes * 1.2);
  view.generatedTravel = { destinationName, elapsedMinutes };
  view.generatedMapScale = "world";
  view.selectedGeneratedSite = null;
  view.generatedSiteInfoOpen = false;
  render();
  await nextAnimationFrame();

  const copy = elements.generatedWorldStrip.querySelector(".generated-world-copy");
  const marker = copy?.querySelector(".generated-expedition-marker");
  const route = copy?.querySelector(".generated-travel-route");
  const routePath = route?.querySelector("path");
  const pathTiles = travelPlan?.pathTiles?.length ? travelPlan.pathTiles : [fromWorld.expeditionTile, toWorld.expeditionTile];
  const pathPositions = pathTiles.map((tile) => ({
    left: (tile.x + 0.5) / fromWorld.runtime.terrain.width * 100,
    top: (tile.y + 0.5) / fromWorld.runtime.terrain.height * 100,
  }));
  if (routePath) routePath.setAttribute("d", generatedTravelPathData(pathTiles, fromWorld.runtime));
  route?.classList.remove("is-preview", "is-route", "is-direct");
  route?.classList.add("is-active", `is-${travelPlan?.id ?? "route"}`);
  marker?.classList.add("is-traveling");
  elements.generatedWorldMap.classList.add("is-traveling");
  elements.generatedWorldMap.setAttribute("aria-busy", "true");
  elements.generatedTravelOverlay.classList.remove("is-hidden");
  elements.generatedTravelRoute.textContent = `${fromWorld.expeditionRegion.name} → ${destinationName}`;
  elements.generatedTravelDuration.textContent = `${travelPlan?.name ?? "順路"} · 所要 ${formatGeneratedTravelDuration(elapsedMinutes)} · 世界時刻が進行中`;
  elements.generatedTravelProgress.style.width = "0%";
  const markerKeyframes = pathPositions.map((position, index) => ({
    left: `${position.left}%`,
    top: `${position.top}%`,
    offset: pathPositions.length === 1 ? 1 : index / (pathPositions.length - 1),
    transform: `translate(-50%, -50%) scale(${index > 0 && index < pathPositions.length - 1 ? 1.12 : 1})`,
  }));
  const markerAnimation = marker?.animate(markerKeyframes, { duration: animationDuration, easing: "linear", fill: "forwards" });

  try {
    await new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / animationDuration);
        const clock = Math.round((fromTime.elapsedMinutes + elapsedMinutes * progress) / 10) * 10;
        const timeView = getGeneratedWorldTimeView({
          ...state,
          generatedWorld: { ...state.generatedWorld, expeditionClockMinutes: clock },
        });
        paintGeneratedWorldTime(timeView);
        elements.generatedTravelClock.textContent = `第${timeView.day}日 ${timeView.timeLabel} · ${timeView.phaseLabel}`;
        elements.generatedTravelProgress.style.width = `${Math.round(progress * 100)}%`;
        if (progress < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    await markerAnimation?.finished.catch(() => {});
  } finally {
    view.generatedTravel = null;
    view.generatedMapScale = "region";
    elements.generatedWorldMap.classList.remove("is-traveling");
    elements.generatedWorldMap.removeAttribute("aria-busy");
    elements.generatedTravelOverlay.classList.add("is-hidden");
    route?.classList.remove("is-active", "is-route", "is-direct");
    markerAnimation?.cancel();
    recordMasteryEvent(nextState, "journeys", 1);
    if (nextState.adventure?.activeRun?.mode === "travel") view.adventureOpen = true;
    const encounterNote = nextState.generatedWorld?.lastTravel?.encounter ? " 移動中にモンスターと遭遇しました。" : "";
    commit(nextState, `${message}（${formatGeneratedTravelDuration(elapsedMinutes)}経過）${encounterNote}`, "ui");
  }
}

function renderMap() {
  const showWarBoard = Boolean(state.war && view.warMapView === "theater");
  const showGeneratedWorld = !showWarBoard;
  elements.warMapSwitch.classList.toggle("is-hidden", !state.war || showGeneratedWorld);
  elements.warMapSwitch.querySelectorAll("[data-war-map-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.warMapView === view.warMapView));
  elements.mapStage.classList.toggle("is-war-board", showWarBoard);
  elements.mapStage.classList.toggle("is-generated-world", showGeneratedWorld);
  elements.warBoard.classList.toggle("is-hidden", !showWarBoard);
  elements.generatedWorldMap.classList.toggle("is-hidden", !showGeneratedWorld);
  elements.terrainLegend.classList.toggle("is-hidden", showGeneratedWorld);
  elements.strategyMap.classList.toggle("is-hidden", showWarBoard || showGeneratedWorld);
  if (showGeneratedWorld) {
    renderGeneratedWorldMapLayer();
    return;
  }
  if (showWarBoard) {
    renderWarBoard();
    return;
  }
  elements.strategyMap.querySelectorAll("image[data-href]").forEach((image) => {
    image.setAttribute("href", image.dataset.href);
    image.removeAttribute("data-href");
  });
  elements.strategyMap.className.baseVal = `strategy-map map-mode-${view.mapMode} scale-${view.scale}${state.war ? " is-at-war" : ""}`;
  elements.strategyMap.setAttribute("viewBox", MAP_VIEWBOXES[view.scale] ?? MAP_VIEWBOXES.world);
  const labels = {
    political: ["CASTLE & TERRITORY MAP", WORLD.continent.name], terrain: ["TERRAIN MAP", "地形・標高・水系"], diplomatic: ["DIPLOMATIC MAP", "大陸諸国の友好・敵対"],
    supply: ["SUPPLY MAP", "月次食料収支"], unrest: ["PUBLIC ORDER MAP", "都市治安"],
    ...AUTHORITY_MAP_LABELS,
  };
  elements.mapModeEyebrow.textContent = labels[view.mapMode][0];
  elements.mapCaptionTitle.textContent = view.mapMode === "political"
    ? view.scale === "world" ? "エルドリア世界圏 · 十か国" : "セレナ・ヴァルカ国境戦域"
    : labels[view.mapMode][1];
  elements.mapModeBar.querySelectorAll("[data-map-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.mapMode === view.mapMode));
  if (elements.authorityOverlaySelect) elements.authorityOverlaySelect.value = AUTHORITY_MAP_LABELS[view.mapMode] ? view.mapMode : "";
  elements.mapScaleSwitch.querySelectorAll("[data-scale]").forEach((button) => button.classList.toggle("is-active", button.dataset.scale === view.scale));
  elements.strategyMap.querySelectorAll(".province[data-place-id]").forEach((node) => { node.style.fill = ""; });
  const authorityNetwork = AUTHORITY_MAP_LABELS[view.mapMode] ? deriveAdministrationNetwork(state) : null;
  Object.keys(state.cities).forEach((cityId) => {
    const node = elements.strategyMap.querySelector(`.province[data-place-id="${cityId}"]`);
    if (!node) return;
    const city = deriveCityMetrics(state, cityId);
    if (view.mapMode === "supply") node.style.fill = valueColor(clampForMap(50 + city.supplyBalance / 120));
    if (view.mapMode === "unrest") node.style.fill = valueColor(city.publicOrder);
    if (authorityNetwork) {
      const region = authorityNetwork.authority.regions.find((item) => item.cityId === cityId);
      const overlay = authorityOverlayValue(region, view.mapMode);
      node.style.fill = valueColor(overlay.value, overlay.inverse);
    }
  });
  elements.strategyMap.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  if (view.selectedTileName) {
    elements.strategyMap.querySelectorAll(".map-tile").forEach((node) => node.classList.toggle("is-selected", node.dataset.tileName === view.selectedTileName));
  } else if (view.selectedId) {
    elements.strategyMap.querySelectorAll(`[data-place-id="${view.selectedId}"]`).forEach((node) => node.classList.add("is-selected"));
  }
  renderStrategicMapState();
}

function averageAuthorityDomain(region, domainIds) {
  const domains = region.domains.filter((domain) => domainIds.includes(domain.id));
  return domains.reduce((sum, domain) => sum + domain.effectiveControl, 0) / Math.max(1, domains.length);
}

function authorityOverlayValue(region, mode) {
  if (!region) return { value: 0, inverse: false, label: "情報なし" };
  const values = {
    effective_control: { value: region.overallControl, label: `総合実効支配 ${Math.round(region.overallControl)}%` },
    tax_control: { value: averageAuthorityDomain(region, ["tax_rights", "tax_collection", "customs"]), label: "徴税支配" },
    military_control: { value: averageAuthorityDomain(region, ["military_command", "conscription"]), label: "軍事支配" },
    justice_control: { value: averageAuthorityDomain(region, ["justice", "policing"]), label: "司法支配" },
    population_knowledge: { value: region.populationKnowledge, label: `人口把握 ${region.populationKnowledge}%` },
    information_accuracy: { value: region.informationPrecision, label: `情報精度 ${region.informationPrecision}%` },
    administrative_load: { value: region.administrativeLoadRatio, inverse: true, label: `行政負荷率 ${region.administrativeLoadRatio}%` },
    communication_time: { value: clampForMap(region.communicationDays * 6), inverse: true, label: `命令到達 ${region.communicationDays}日` },
    local_power: { value: 100 - region.practicalCentralization, inverse: true, label: `地方勢力 ${Math.round(100 - region.practicalCentralization)}%` },
    grievance: { value: region.grievancePressure, inverse: true, label: `歴史的不満 ${region.grievancePressure}` },
    loyalty: { value: region.loyalty, label: `中央への忠誠 ${region.loyalty}` },
    uniformity: { value: region.institutionalUniformity, label: `制度統一 ${region.institutionalUniformity}%` },
  };
  const selected = values[mode] ?? { value: 0, label: "情報なし" };
  if (!["effective_control", "population_knowledge", "information_accuracy", "administrative_load", "communication_time", "local_power", "grievance", "loyalty", "uniformity"].includes(mode)) {
    selected.label = `${AUTHORITY_MAP_LABELS[mode]?.[1] ?? "統治"} ${Math.round(selected.value)}%`;
  }
  return selected;
}

function clampForMap(value) {
  return Math.min(100, Math.max(0, value));
}

function selectedTileCountry() {
  if (view.selectedType === "province") return WORLD.countries[WORLD.provinces[view.selectedId]?.owner];
  return WORLD.countries[view.selectedId];
}

function renderTileDetail() {
  const open = view.panel !== "world" && view.tileWindowOpen && view.selectedTileName && view.selectedTerrainType;
  elements.tileDetailWindow.classList.toggle("is-hidden", !open);
  if (!open) return;

  const profile = TERRAIN_TILE_PROFILES[view.selectedTerrainType] ?? TERRAIN_TILE_PROFILES.plains;
  const country = selectedTileCountry();
  const jurisdiction = view.selectedType === "province" ? WORLD.provinces[view.selectedId]?.kind : country?.government;
  elements.tileDetailTitle.textContent = view.selectedTileName;
  elements.tileDetailMeta.textContent = `${country?.name ?? "所属不明"} · ${jurisdiction ?? "統治区分不明"} · ${view.selectedTerrain}`;
  elements.tileDetailNote.textContent = `${view.selectedTileName}は${view.selectedTerrain}の領域。${profile.summary}`;
  elements.tileDetailGrid.innerHTML = `
    <div><small>気候</small><strong>${profile.climate}</strong></div>
    <div><small>移動負荷</small><strong>${profile.movement}</strong></div>
    <div><small>防衛地形</small><strong>${profile.defense}</strong></div>
    <div><small>主要資源</small><strong>${profile.resources}</strong></div>
    <div class="tile-detail-risk"><small>地勢リスク</small><strong>${profile.risk}</strong></div>
  `;

  const stageRect = elements.mapStage.getBoundingClientRect();
  const windowWidth = Math.min(320, Math.max(250, stageRect.width - 24));
  const halfWidth = windowWidth / 2;
  const left = Math.min(stageRect.width - halfWidth - 12, Math.max(halfWidth + 12, view.tileAnchorX * stageRect.width));
  const top = Math.min(stageRect.height - 170, Math.max(150, view.tileAnchorY * stageRect.height));
  elements.tileDetailWindow.style.width = `${windowWidth}px`;
  elements.tileDetailWindow.style.left = `${left}px`;
  elements.tileDetailWindow.style.top = `${top}px`;
}

function clearTileDetailSelection() {
  view.tileWindowOpen = false;
  view.selectedType = null;
  view.selectedId = null;
  view.selectedTileName = null;
  view.selectedTerrain = null;
  view.selectedTerrainType = null;
}

function closeTileDetail() {
  clearTileDetailSelection();
  renderMap();
  renderSelection();
  renderTileDetail();
}

function renderSelection() {
  if (view.panel === "world" || view.panel === "village") {
    elements.selectionCard.innerHTML = "";
    return;
  }
  if (view.tileWindowOpen) {
    elements.selectionCard.innerHTML = "";
    return;
  }
  if (!view.selectedId) {
    elements.selectionCard.innerHTML = "";
    return;
  }
  if (view.selectedType === "creature") {
    const creature = getExtremeCreature(view.selectedId);
    if (!creature) { elements.selectionCard.innerHTML = ""; return; }
    elements.selectionCard.innerHTML = `<header><h3>${creature.name}</h3><span>${creature.classification}</span></header><p>${creature.epithet}。${creature.doctrine}</p><div class="selection-facts"><span>${creature.currentState}</span><span>${creature.estimatedLength}</span><span>${creature.location.label}</span></div>`;
    return;
  }
  if (view.selectedType === "province" && state.cities[view.selectedId]) {
    const city = deriveCityMetrics(state, view.selectedId);
    const region = AUTHORITY_MAP_LABELS[view.mapMode] ? getRegionAuthority(state, view.selectedId) : null;
    const overlayFact = region ? `<span>${authorityOverlayValue(region, view.mapMode).label}</span>` : "";
    const tileFact = view.selectedTileName ? `<span>${view.selectedTileName} · ${view.selectedTerrain}</span>` : "";
    elements.selectionCard.innerHTML = `<header><h3>${city.name}</h3><span>${getOfficerReport(state, city.governorId).name}</span></header><p>${city.note}</p><div class="selection-facts">${tileFact}${overlayFact}<span>人口 ${formatValue(city.population)}</span><span>月収支 ${signed(city.netIncome, 1)}</span><span>治安 ${formatValue(city.publicOrder, 1)}</span></div>`;
    return;
  }
  if (view.selectedType === "village") {
    const town = getTownAdministration(state, view.selectedId);
    elements.selectionCard.innerHTML = `<header><h3>${town.name}</h3><span>${town.kind} · ${WORLD.provinces[town.province].name}</span></header><p>${town.issue}</p><div class="selection-facts"><span>人口 ${formatValue(town.population)}</span><span>行政処理 ${Math.round(town.forecast.administrativeCapacity)}</span><span>優先課題 ${town.forecast.primaryNeed.label}</span></div>`;
    return;
  }
  const country = getCountryReport(state, view.selectedId);
  if (!country) { elements.selectionCard.innerHTML = ""; return; }
  const foundation = getGreatPowerFoundation(country.id);
  const note = view.selectedId === "valka"
    ? "灰冠峠の関税と隊商差押えを巡って対立。城砦・国境軍・補給路が一つの戦争構造を作る。"
    : foundation
      ? `${foundation.type}として成立指数 ${foundation.score}。${foundation.environment}`
      : `${country.stance}。関係・戦力・介入意志が大陸均衡とヴァルカ戦の拡大リスクへ反映される。`;
  const tileCount = elements.strategyMap.querySelector(`.country-group[data-country="${view.selectedId}"]`)?.dataset.tileCount ?? "?";
  const territoryFact = view.selectedTileName ? `${view.selectedTileName} · ${view.selectedTerrain}` : `領域タイル ${tileCount}`;
  elements.selectionCard.innerHTML = `<header><h3>${country.name}</h3><span>関係 ${country.relation >= 0 ? "+" : ""}${country.relation}</span></header><p>${note}</p><div class="selection-facts"><span>${territoryFact}</span><span>推定戦力 ${formatValue(country.power)}</span><span>機動 ${country.mobility}</span><span>${country.stance}</span></div>`;
}

function orderLabel(order) {
  if (order.kind === "command") return `${COMMANDS[order.commandId].name} · ${getOfficerReport(state, order.officerId).name}`;
  if (order.kind === "facility") return `${FACILITIES[order.facilityId].name} Lv.${order.targetLevel}建設`;
  if (order.kind === "policy") return `${POLICY_DEFINITIONS[order.policyId].name} → ${POLICY_DEFINITIONS[order.policyId].options[order.optionId].name}`;
  const action = { negotiate: "交渉", subsidize: "援助", suppress: "弾圧" }[order.action];
  return `${FACTION_DEFINITIONS[order.factionId].name}へ${action}`;
}

function orderCostLabel(order) {
  const costs = [];
  if (order.cost?.money) costs.push(`金 ${order.cost.money}`);
  if (order.cost?.draftPopulation) costs.push(`徴募 ${order.cost.draftPopulation}`);
  costs.push(`統治 ${order.governanceCost}`);
  return costs.join(" · ");
}

function planningImpactRows(planned, baseline) {
  if (!baseline) return "";
  return [["money", "金", 1], ["food", "食", 0]].map(([key, label, digits]) => {
    const before = baseline.changes[key] ?? 0;
    const after = planned.changes[key] ?? 0;
    const total = Number((after - before).toFixed(1));
    const direct = Number(((planned.breakdown?.orders?.[key] ?? 0) - (baseline.breakdown?.orders?.[key] ?? 0)).toFixed(1));
    const operation = Number(((planned.breakdown?.monthly?.[key] ?? 0) - (baseline.breakdown?.monthly?.[key] ?? 0)).toFixed(1));
    const external = Number(((planned.breakdown?.external?.[key] ?? 0) - (baseline.breakdown?.external?.[key] ?? 0)).toFixed(1));
    const reasons = [
      direct ? `命令費・即時効果 ${signed(direct, digits)}` : "",
      operation ? `生産・人物配置・政策連鎖 ${signed(operation, digits)}` : "",
      external ? `戦争・外部要因 ${signed(external, digits)}` : "",
    ].filter(Boolean).join(" / ") || "予約による差なし";
    return `<span class="plan-impact ${total < 0 ? "is-negative" : total > 0 ? "is-positive" : ""}"><b>${label} ${signed(before, digits)} → ${signed(after, digits)}</b><em>予約の総合差 ${signed(total, digits)}</em><small>${reasons}</small></span>`;
  }).join("");
}

function renderCityPlan(ledger) {
  const planCityId = view.panel === "spending" ? view.spendingCityId : view.panel === "town" ? WORLD.villages[view.selectedTownId].province : view.selectedCityId;
  const governance = getGovernance(state);
  const reservedMoney = state.pendingOrders.reduce((sum, order) => sum + (order.cost?.money ?? 0), 0);
  const warnings = getTurnWarnings(state);
  const preview = getPlanningPreview();
  const planned = state.pendingOrders.length ? state.pendingOrders.map((order) => `
    <article class="planned-order ${order.forced ? "is-forced" : ""}">
      <header><strong>${orderLabel(order)}</strong><button type="button" data-cancel-order="${order.id}" aria-label="命令を取り消す">取消</button></header>
      <small>${order.townId ? `${WORLD.villages[order.townId].name} · ` : ""}${WORLD.provinces[order.cityId].name} · ${orderCostLabel(order)}${order.forced ? ` · 強行（失敗率 ${(order.forcedPoints ?? 0) * FORCED_ORDER_RULES.failureChancePerPoint}%）` : ""}</small>
    </article>
  `).join("") : '<p class="plan-empty">支出はまだありません。「支出」から分類と具体策を選んでください。</p>';
  const forecastRows = preview?.report.cities.map((city) => `
    <div class="plan-forecast-row"><strong>${city.name.replace(/王都|河港|城塞市/, "")}</strong><span>金 ${signed(city.changes.money, 1)}</span><span>食 ${signed(city.changes.food)}</span><small>月末 金${formatValue(city.after.money, 1)} / 食${formatValue(city.after.food)}</small>${planningImpactRows(city, preview.baselineReport?.cities.find((item) => item.cityId === city.cityId))}</div>
  `).join("") ?? "";
  const active = state.commandQueue.filter((task) => task.cityId === planCityId).map((task) => {
    const progress = Math.max(0, (task.durationTurns - task.remainingTurns) / Math.max(1, task.durationTurns) * 100);
    return `<div class="outliner-item"><strong>${COMMANDS[task.commandId].name}</strong><small>${getOfficerReport(state, task.officerId).name} · 残り${task.remainingTurns}か月</small><div class="queue-track"><span style="width:${progress}%"></span></div></div>`;
  }).join("");
  const projects = state.cities[planCityId].projects.map((project) => `<div class="outliner-item"><strong>${FACILITIES[project.facilityId].name} Lv.${project.targetLevel}</strong><small>建設中 · 残り${project.remainingTurns}か月</small></div>`).join("");
  return `
    <section class="plan-tray">
      <header><span>MONTHLY PLAN</span><h2>今月の計画</h2><p>${formatDate(state)}に確定する予約命令</p></header>
      <div class="plan-budget"><div><small>統治力</small><strong>${governance.used} / ${governance.max}</strong><span>強行上限 ${governance.hardLimit}</span></div><div><small>予約費用</small><strong>金 ${formatValue(reservedMoney, 1)}</strong><span>${state.pendingOrders.length}件</span></div></div>
      <div class="planned-orders">${planned}</div>
      ${forecastRows ? `<section class="plan-forecast"><h3>${preview.baselineReport ? "予約なしとの因果比較" : "予約反映後の月末予測"}</h3>${forecastRows}<p>命令費・即時効果、生産・人物配置・政策連鎖、戦争・外部要因を分離。未選択の事件効果は含みません。</p></section>` : ""}
      ${(active || projects) ? `<section class="plan-progress"><h3>${WORLD.provinces[planCityId].name}で進行中</h3>${active}${projects}</section>` : ""}
      <section class="plan-warnings"><h3>進行前の確認</h3>${warnings.length ? warnings.map((warning) => `<p>⚠ ${warning}</p>`).join("") : '<p class="is-clear">警告はありません。</p>'}</section>
      <button type="button" class="plan-end-month" data-end-month ${state.phase === "event" || state.council.pending ? "disabled" : ""}>月を終える<span>生産・消費・事件を一括処理</span></button>
    </section>
  `;
}

function renderOutliner() {
  const outlinerHeading = document.querySelector(".outliner > header strong");
  if (state.player) {
    const player = state.player;
    const stage = getCareerStage(state);
    if (outlinerHeading) outlinerHeading.textContent = "人物年代記摘要";
    const holdings = player.holdings.map((holding) => `<div class="outliner-item"><strong>${escapeHtml(careerTerritoryName(holding.territoryId))}</strong><small>所領 · 統治効果はこの地域内に限定</small></div>`).join("") || '<div class="outliner-item"><small>所領はまだありません。</small></div>';
    const history = player.history.slice(0, 5).map((entry) => `<div class="outliner-item"><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.detail)}</small></div>`).join("");
    elements.outlinerContent.innerHTML = `
      <section class="outliner-section campaign-outliner"><h3>${stage.name}</h3><div class="outliner-item"><strong>${escapeHtml(player.title)}</strong><small>${stage.description}</small></div></section>
      <section class="outliner-section"><h3>${player.sovereign ? "国家主権" : "主従関係"}</h3><div class="outliner-item"><strong>${escapeHtml(player.sovereign ? `${GOVERNMENT_TITLE_SYSTEMS[player.governmentFormId]?.name ?? "自国"} · ${player.title}` : player.affiliation.liegeName ?? "主君なし")}</strong><small>${player.sovereign ? `正統性 ${player.metrics.legitimacy}` : `信頼 ${player.metrics.liegeTrust}`} · 野心 ${player.metrics.ambition}</small></div></section>
      <section class="outliner-section"><h3>管轄</h3>${holdings}</section>
      <section class="outliner-section"><h3>人物年代記</h3>${history}</section>
      <button type="button" class="plan-end-month" data-end-month>月を進める<span>関係と政治状況を更新</span></button>`;
    return;
  }
  if (outlinerHeading) outlinerHeading.textContent = "王国政務摘要";
  const ledger = deriveRealmLedger(state);
  if (view.panel === "city" || view.panel === "town" || view.panel === "spending") {
    elements.outlinerContent.innerHTML = renderCityPlan(ledger);
    return;
  }
  const campaign = getCampaignStatus(state);
  const mission = `<section class="outliner-section campaign-outliner"><h3>主目標 · ${campaign.completedCount}/${campaign.totalCount}</h3>${campaignObjectiveItems(campaign, true)}</section>`;
  const council = state.council.pending ? '<section class="outliner-section"><h3>評定</h3><div class="outliner-item danger"><strong>今季方針が未決</strong><small>月次進行は評定後に再開します。</small></div></section>' : "";
  const cities = ledger.cities.map((city) => `<div class="outliner-item"><strong>${city.name}</strong><small>金 ${formatValue(city.money, 1)} (${signed(city.netIncome, 1)}) · 食料 ${signed(city.foodBalance)} · 治安 ${formatValue(city.security)}</small></div>`).join("");
  const queue = state.commandQueue.length ? state.commandQueue.map((item) => {
    const command = COMMANDS[item.commandId];
    const officer = getOfficerReport(state, item.officerId);
    const progress = ((item.durationTurns - item.remainingTurns) / Math.max(1, item.durationTurns)) * 100;
    return `<div class="outliner-item"><strong>${command.name} · ${officer.name}</strong><small>${WORLD.provinces[item.cityId].name} · 残り ${item.remainingTurns}か月 · 予測 ${item.forecast.grade}</small><div class="queue-track"><span style="width:${progress}%"></span></div></div>`;
  }).join("") : '<div class="outliner-item"><small>実行中の任務はありません。</small></div>';
  const war = state.war ? `<section class="outliner-section"><h3>戦争</h3><div class="outliner-item danger"><strong>灰冠峠戦役</strong><small>戦勝点 ${state.war.score.toFixed(1)} · ${WAR_OBJECTIVES[state.war.objectiveId].name}</small></div></section>` : "";
  const occupations = (state.occupations ?? []).filter((occupation) => occupation.status === "occupied").map((occupation) => `<div class="outliner-item ${occupation.resistance >= 70 ? "danger" : ""}"><strong>${occupation.name}</strong><small>${OCCUPATION_POLICIES[occupation.policy].name} · 統制 ${occupation.control.toFixed(0)} · 抵抗 ${occupation.resistance.toFixed(0)}</small></div>`).join("");
  const occupationSection = occupations ? `<section class="outliner-section"><h3>占領統治</h3>${occupations}</section>` : "";
  const logs = state.log.slice(0, 4).map((entry) => `<div class="outliner-item"><strong>${entry.title}</strong><small>${entry.date} · ${entry.text}</small></div>`).join("");
  elements.outlinerContent.innerHTML = `${mission}${council}${war}${occupationSection}<section class="outliner-section"><h3>都市台帳</h3>${cities}</section><section class="outliner-section"><h3>任務</h3>${queue}</section><section class="outliner-section"><h3>年代記</h3>${logs}</section>`;
}

function renderBackMenu() {
  if (!elements.backMenuSettingsCatalog) return;
  elements.backMenuSettingsCatalog.innerHTML = governmentTitleCatalog();
  if (!elements.backMenuTravelOptions) return;
  const preference = state.generatedWorld?.travelModePreference ?? null;
  const labels = { route: "道順", direct: "最短経路" };
  elements.backMenuTravelOptions.innerHTML = `
    <header><i aria-hidden="true">路</i><span><strong>地方移動</strong><small>${preference ? `既定：${labels[preference]}` : "初回移動時に設定"}</small></span></header>
    <div role="group" aria-label="既定の地方移動方法">
      <button type="button" data-generated-travel-preference="route" class="${preference === "route" ? "is-active" : ""}" ${preference ? "" : "disabled"}>道順<small>街道優先・低負荷</small></button>
      <button type="button" data-generated-travel-preference="direct" class="${preference === "direct" ? "is-active" : ""}" ${preference ? "" : "disabled"}>最短経路<small>直行・高負荷</small></button>
    </div>
    <p>${preference ? "次の地方移動から適用します。" : "最初の地方移動で選択肢を表示し、その選択を保存します。"}</p>`;
}

function renderTicker() {
  if (state.player) {
    const entries = state.player.history.slice(0, PERSONAL_CHRONICLE_TICKER_LIMIT);
    elements.chronicleTicker.innerHTML = entries.map((entry) => `<div class="chronicle-ticker-row"><strong>${entry.year ?? state.year}年 ${entry.month ?? state.month}月 · ${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.detail)}</span></div>`).join("");
    return;
  }
  elements.chronicleTicker.innerHTML = state.log.slice(0, PERSONAL_CHRONICLE_TICKER_LIMIT).map((entry) => `<div class="chronicle-ticker-row"><strong>${entry.date} · ${entry.title}</strong><span>${entry.text}</span></div>`).join("");
}

function renderWarCouncil() {
  elements.warCouncilModal.classList.toggle("is-hidden", !view.warCouncilOpen);
  if (!view.warCouncilOpen) return;
  const report = getWarCouncilReport(state, view.objectiveId);
  const objective = WAR_OBJECTIVES[view.objectiveId];
  const estimate = getWarDeclarationEstimate(state, view.objectiveId);
  const support = getWarSupport(state);
  elements.objectiveTabs.innerHTML = Object.values(WAR_OBJECTIVES).filter((item) => item.mode !== "defensive").map((item) => `<button class="objective-tab ${item.id === view.objectiveId ? "is-active" : ""}" type="button" data-objective="${item.id}" aria-pressed="${item.id === view.objectiveId}"><strong>${item.name}</strong><small>${item.scope === "limited" ? "限定目的" : "全面目的"} · 拡大リスク ${item.escalationRisk}</small></button>`).join("");
  const factors = report.factors.map((factor) => `<div class="factor-row"><strong>${factor.label}</strong><b class="${factor.value < 0 ? "is-negative" : ""}">${signed(factor.value)}</b><small>${factor.detail}</small></div>`).join("");
  const military = getMilitarySummary(state);
  const enemyCommander = getEnemyCommander(state);
  elements.warCouncilReport.innerHTML = `<div class="council-report"><aside class="ai-verdict"><div class="score-ring"><strong>${signed(report.score)}</strong><small>確度 ${report.confidence}%</small></div><h3>${report.posture}</h3><p>${report.summary}</p><p>軍団長 ${military.commander.name}<br>副将 ${military.deputy.name}<br>${FORMATIONS[military.force.formation].name}</p>${enemyCommanderCard(enemyCommander, null, true)}</aside><div><div class="factor-table">${factors}</div><div class="strategic-notes"><article class="strategic-note"><strong>重心候補 · ${report.center.label}</strong><small>${report.center.explanation}</small></article><article class="strategic-note"><strong>止める地点</strong><small>${report.limit}</small></article></div></div></div>`;
  const penalties = [];
  if (state.justification < 50) penalties.push("開戦事由不足により国境農民が徴発を拒否します");
  if (support < 40) penalties.push("都市治安から算出した国内支持が不足しています");
  const estimateMonths = estimate.estimatedMonths === null ? "見通し不成立" : `約${estimate.estimatedMonths}か月`;
  const totalValue = (value) => value === null ? "算出不能" : formatValue(value);
  elements.warCostEstimate.innerHTML = `
    <div class="war-estimate-heading"><strong>AI開戦概算</strong><small>現在の戦力・${estimate.planName}・${estimate.formationName}を同じ条件で継続した場合</small></div>
    <div class="war-estimate-grid">
      <span><small>講和可能まで</small><strong>${estimateMonths}</strong><em>戦勝点 ${estimate.peaceScoreThreshold} が目安</em></span>
      <span><small>追加兵糧</small><strong>${formatValue(estimate.foodPerMonth)} / 月</strong><em>累計 ${totalValue(estimate.totalFood)}</em></span>
      <span><small>自軍損失</small><strong>${formatValue(estimate.troopLossPerMonth)} / 月</strong><em>累計 ${totalValue(estimate.totalTroopLoss)}</em></span>
      <span><small>避難民</small><strong>${formatValue(estimate.displacedPerMonth)} / 月</strong><em>累計 ${totalValue(estimate.totalDisplaced)}</em></span>
    </div>
    <p class="war-estimate-reserve ${estimate.foodRisk ? "is-danger" : ""}">${estimate.projectedProvisions === null ? "戦果見通しが立たず、累計備蓄は算出できません。" : `同じ収支が続いた場合の終戦時食料：約${formatValue(Math.max(0, estimate.projectedProvisions))}${estimate.foodRisk ? "。すでに州単位の食料備蓄が危険域です。" : "。"}`}</p>
    <small class="war-estimate-note">概算は敵の対応、事件、命令、陣形変更で変動します。確約ではありません。</small>`;
  elements.declarationWarning.textContent = penalties.length ? `警告：${penalties.join("。")}` : `${objective.description} 現在の正当性と都市支持なら宣戦できます。`;
  elements.declareWarButton.textContent = `「${objective.name}」で宣戦布告`;
}

function officerCandidateCard(officer, commandId, cityId) {
  const forecast = getTaskForecast(state, commandId, officer.id, cityId);
  const command = COMMANDS[commandId];
  const relevant = command.taskType === "drill" || command.taskType === "mobilize"
    ? `統率 ${officer.stats.leadership} · 武力 ${officer.stats.war}`
    : command.taskType === "diplomacy" || command.taskType === "recruitment"
      ? `政治 ${officer.stats.politics} · 魅力 ${officer.stats.charisma}`
      : `知力 ${officer.stats.intelligence} · 政治 ${officer.stats.politics}`;
  return `<button type="button" class="candidate-card" data-assign-officer="${officer.id}">${officerSeal(officer, "large")}<div><header><strong>${officer.name}</strong><b>${forecast.grade}</b></header><small>${officer.rank} · ${WORLD.provinces[officer.location].name}</small><p>${relevant}<br>忠誠 ${officer.loyalty} · 意欲 ${officer.stamina} · ${officer.policy}</p></div><em>${forecast.range[0]}〜${forecast.range[1]}</em></button>`;
}

function forceCandidateCard(officer) {
  return `<button type="button" class="candidate-card" data-force-officer="${officer.id}">${officerSeal(officer, "large")}<div><header><strong>${officer.name}</strong><b>${officer.policy}</b></header><small>${officer.rank} · 忠誠 ${officer.loyalty}</small><p>統率 ${officer.stats.leadership} · 武力 ${officer.stats.war} · 知力 ${officer.stats.intelligence}</p></div><em>任命</em></button>`;
}

function renderAssignmentModal() {
  elements.assignmentModal.classList.toggle("is-hidden", !view.assignmentOpen);
  if (!view.assignmentOpen) return;
  const ledger = deriveRealmLedger(state);
  if (view.assignmentMode === "force") {
    elements.assignmentTitle.textContent = view.pendingForceRole === "commanderId" ? "軍団長を任命" : "副将を任命";
    elements.assignmentSummary.textContent = "統率・武力は正面戦力、知力は情報判断と部隊連携へ影響します。";
    elements.assignmentLedger.innerHTML = `<span>軍団 ${state.forces.frontier_guard.name}</span><span>陣形 ${FORMATIONS[state.forces.frontier_guard.formation].name}</span>`;
    const force = state.forces.frontier_guard;
    const occupiedIds = new Set([force.commanderId, force.deputyId]);
    const candidates = Object.keys(state.officers)
      .map((id) => getOfficerReport(state, id))
      .filter((officer) => officer.allegiance === "serving" && !occupiedIds.has(officer.id));
    elements.officerCandidates.innerHTML = candidates.map(forceCandidateCard).join("");
    return;
  }
  const command = COMMANDS[view.pendingCommandId];
  const cityId = command.defaultCityId ?? view.pendingCityId;
  const city = deriveCityMetrics(state, cityId);
  const town = view.pendingTownId ? getTownAdministration(state, view.pendingTownId) : null;
  const governance = getGovernance(state);
  elements.assignmentTitle.textContent = `${command.name}の担当武将`;
  elements.assignmentSummary.textContent = `${town ? `${town.name} · ` : ""}${WORLD.provinces[cityId].name} · ${command.description}`;
  elements.assignmentLedger.innerHTML = `<span>都市金 ${formatValue(city.money, 1)}</span><span>統治力 ${governance.used}/${governance.max}</span><span>期間 ${command.durationTurns}か月</span><span>費用 ${costLabel(command)}</span>`;
  const candidates = getEligibleOfficers(state, command.id, cityId, view.pendingTownId);
  elements.officerCandidates.innerHTML = candidates.length ? candidates.map((officer) => officerCandidateCard(officer, command.id, cityId)).join("") : '<p class="empty-candidates">任命できる待機武将がいません。</p>';
}

function renderEventModal() {
  const open = state.phase === "event" && state.pendingEvent;
  elements.eventModal.classList.toggle("is-hidden", !open);
  if (!open) return;
  const definition = EVENT_DEFINITIONS[state.pendingEvent.eventId];
  elements.eventTitle.textContent = definition.name;
  elements.eventSummary.textContent = definition.summary;
  elements.eventArt.src = EVENT_ART[definition.id] ?? EVENT_ART.corruption;
  elements.eventArt.alt = `${definition.name}が発生した都市の情景`;
  elements.eventLocation.textContent = `${WORLD.provinces[state.pendingEvent.cityId].name} · 次月へ進むには対応が必要です`;
  elements.eventChoices.innerHTML = definition.choices.map((choice) => `
    <button type="button" class="event-choice" data-event-choice="${choice.id}">
      <strong>${choice.name}</strong><span>${choice.detail}</span><small>この選択で月次報告を確定</small>
    </button>
  `).join("");
  if (definition.choices.length === 1) {
    elements.eventLocation.textContent += " · 一択でも結果を伴うため自動決定しません";
  }
}

function renderOfflineReport() {
  clearTimeout(informationalCloseTimer);
  informationalCloseTimer = null;
  const report = view.offlineReport;
  const open = Boolean(view.offlineReportOpen && report);
  elements.offlineReportModal?.classList.toggle("is-hidden", !open);
  if (!open || !elements.offlineReportContent) return;
  elements.offlineReportContent.innerHTML = `<header><small>RETURN CHRONICLE</small><h2>留守中の年代記</h2></header>
    <p>不在中の${report.monthsAdvanced}か月を、任命済みの役職・方針に従って進行しました。</p>
    <dl><div><dt>経過</dt><dd>${report.monthsAdvanced}か月</dd></div><div><dt>重大判断</dt><dd>${report.pendingDecisions.join("・") || "保留なし"}</dd></div></dl>
    ${report.events.length ? `<ul>${report.events.map((event) => `<li>${escapeHtml(event)}</li>`).join("")}</ul>` : ""}
    <button type="button" data-close-offline-report>年代記を閉じる</button>`;
  informationalCloseTimer = setTimeout(() => {
    view.offlineReportOpen = false;
    renderOfflineReport();
  }, 3000);
}

function renderEquipmentUpgradePrompt() {
  clearTimeout(equipmentOfferTimer);
  equipmentOfferTimer = null;
  const offer = getEquipmentUpgradeOffer(state);
  elements.equipmentUpgradePrompt?.classList.toggle("is-visible", Boolean(offer));
  if (!offer || !elements.equipmentUpgradePrompt) {
    if (elements.equipmentUpgradePrompt) elements.equipmentUpgradePrompt.innerHTML = "";
    return;
  }
  elements.equipmentUpgradePrompt.innerHTML = `<small>BETTER EQUIPMENT</small><strong>${escapeHtml(offer.item.name)}</strong><span>${escapeHtml(offer.equipped?.name ?? "装備なし")}より強力です</span><div><button type="button" data-accept-equipment-upgrade>装備する</button><button type="button" data-dismiss-equipment-upgrade>保留</button></div>`;
  equipmentOfferTimer = setTimeout(() => {
    if (!getEquipmentUpgradeOffer(state)) return;
    commit(dismissEquipmentUpgrade(state), "装備候補を所持品へ保管しました。", null);
  }, 6000);
}

function renderLaunchScreen() {
  elements.launchScreen.classList.toggle("is-hidden", !view.launchOpen);
  const continueButton = elements.launchScreen.querySelector('[data-launch-action="continue"]');
  if (continueButton) {
    continueButton.hidden = !chronicleReady;
    continueButton.disabled = !chronicleReady;
  }
  renderCharacterCreation();
  const generation = view.generation ?? { active: false, progress: 0, stage: "idle", label: "", error: null };
  const generationVisible = generation.active || Boolean(generation.error) || generation.stage === "complete" && view.launchOpen;
  elements.launchScreen.classList.toggle("is-generating", generation.active);
  elements.launchScreen.setAttribute("aria-busy", String(generation.active));
  elements.launchGeneration.hidden = !generationVisible;
  elements.launchGeneration.classList.toggle("is-error", Boolean(generation.error));
  elements.launchGenerationStatus.textContent = generation.error ? "GENERATION FAILED" : generation.stage === "complete" ? "WORLD READY" : "GENERATING NEW WORLD";
  elements.launchGenerationLabel.textContent = generation.label || "生成準備中";
  elements.launchGenerationPercent.textContent = `${generation.progress}%`;
  elements.launchGenerationProgress.setAttribute("aria-valuenow", String(generation.progress));
  elements.launchGenerationBar.style.width = `${generation.progress}%`;
  elements.launchGeneration.style.setProperty("--generation-progress", `${generation.progress}%`);
  elements.launchGenerationDetail.textContent = generation.error
    ? `エラー: ${generation.error}（保存済みの年代記は保持されています）`
    : generation.stage === "complete" ? "開始地点を開きます。" : "地形、河川、種族適地、国境を順番に生成しています。";
  elements.launchScreen.querySelectorAll("button").forEach((button) => {
    const lockedGoddessExit = button.matches('[data-character-create-action="cancel"]')
      && ["generating", "departure"].includes(view.goddessPrologue?.phase);
    const narrationControl = button.matches("[data-goddess-skip]");
    button.disabled = (generation.active && !narrationControl) || lockedGoddessExit || (narrationControl && Boolean(view.goddessPrologue?.skipRequested));
  });
  const developerLauncher = elements.launchScreen.querySelector(".developer-launcher");
  if (developerLauncher) {
    developerLauncher.inert = generation.active || view.characterCreationOpen;
    developerLauncher.hidden = view.characterCreationOpen;
  }
  document.body.classList.toggle("is-launch-open", view.launchOpen);
  document.body.classList.toggle("is-battle-preparation-open", Boolean(view.battlePreparation));
  const realmLocked = view.launchOpen || Boolean(view.battlePreparation) || Boolean(view.tacticalBattle);
  [
    ".grand-topbar", "#campaignBar", ".strategy-shell", "#guideModal", "#warCouncilModal",
    "#assignmentModal", "#eventModal", "#endingModal", "#resetModal",
  ].forEach((selector) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.inert = realmLocked;
    element.hidden = realmLocked;
    element.style.display = realmLocked ? "none" : "";
    element.setAttribute("aria-hidden", String(realmLocked));
  });
}

function tacticalParticipantRoster() {
  return Object.keys(state.officers ?? {})
    .map((id) => getOfficerReport(state, id))
    .filter((officer) => officer.allegiance === "serving")
    .map((officer) => ({
      id: officer.id,
      name: officer.name,
      portrait: officer.portrait,
      portraitImage: officer.portraitImage,
      role: officer.role,
      rank: officer.rank,
      policy: officer.policy,
      traits: officer.traits,
      stats: officer.stats,
      stamina: officer.stamina,
      assignment: officer.assignment,
      available: !officer.assignment && officer.stamina >= 20,
    }));
}

function battlePreparationDefaults(roster) {
  const force = state.forces?.frontier_guard;
  const preferred = [force?.commanderId, force?.deputyId, "sera"].filter(Boolean);
  const availableIds = new Set(roster.filter((entry) => entry.available).map((entry) => entry.id));
  return [...new Set(preferred)].filter((id) => availableIds.has(id)).slice(0, 3);
}

function tacticalOriginLabels() {
  if (view.tacticalOrigin?.type === "military-career") {
    const sideLabels = view.tacticalBattle?.sideLabels ?? view.battlePreparation?.battle?.sideLabels ?? {};
    const player = sideLabels.player ?? "主君軍";
    const enemy = sideLabels.enemy ?? "軍務対象勢力";
    return {
      player,
      enemy,
      playerVictory: `${player}勝利`,
      enemyVictory: `${enemy}勝利`,
      exit: "作戦地域へ戻る",
    };
  }
  if (view.tacticalOrigin?.type === "robbery") {
    return {
      player: "襲撃側",
      enemy: view.tacticalOrigin.targetName ?? "隊商護衛",
      playerVictory: "強盗側勝利",
      enemyVictory: "隊商護衛側勝利",
      exit: "街道へ戻る",
    };
  }
  if (view.tacticalOrigin?.type === "personal-map") {
    return {
      player: "探索パーティー",
      enemy: `${view.tacticalOrigin.enemyName}側`,
      playerVictory: "探索パーティー勝利",
      enemyVictory: `${view.tacticalOrigin.enemyName}側勝利`,
      exit: "個人マップへ戻る",
    };
  }
  if (view.tacticalOrigin?.type === "dungeon") {
    const travelEncounter = view.tacticalOrigin.runMode === "travel";
    return {
      player: travelEncounter ? "旅の一行" : "探索隊",
      enemy: view.tacticalOrigin.enemyName,
      playerVictory: travelEncounter ? "旅の一行勝利" : "探索隊勝利",
      enemyVictory: `${view.tacticalOrigin.enemyName}優勢`,
      exit: travelEncounter ? "地方地図へ戻る" : "ダンジョンへ戻る",
    };
  }
  if (view.tacticalOrigin?.type === "imperial-princess") {
    return {
      player: "セレナ王国軍",
      enemy: view.tacticalOrigin.enemyName ?? "グレート帝国親征軍",
      playerVictory: "王国軍勝利",
      enemyVictory: "グレート帝国親征軍勝利",
      exit: "開発メニュー",
    };
  }
  if (view.tacticalOrigin?.type === "senior-general") {
    return {
      player: "セレナ王国北方軍集団",
      enemy: view.tacticalOrigin.enemyName ?? "ヴァルカ公国強襲軍",
      playerVictory: "北方軍集団勝利",
      enemyVictory: "ヴァルカ公国強襲軍勝利",
      exit: "開発メニュー",
    };
  }
  return { player: "セレナ王国軍", enemy: "ヴァルカ公国軍", playerVictory: "王国軍勝利", enemyVictory: "公国軍勝利", exit: "開発メニュー" };
}

function renderBattlePreparationMap(preparation) {
  const battle = preparation.battle;
  const dungeonBattle = view.tacticalOrigin?.type === "dungeon";
  const selectedUnit = getBattleUnit(battle, preparation.selectedUnitId);
  const unitsByPosition = new Map(battle.units.map((unit) => [`${unit.position.x},${unit.position.y}`, unit]));
  const fortificationsByPosition = new Map((battle.fortifications ?? []).map((fortification) => [`${fortification.position.x},${fortification.position.y}`, fortification]));
  elements.battlePreparationMap.style.setProperty("--preparation-columns", battle.map.width);
  elements.battlePreparationMap.style.setProperty("--preparation-rows", battle.map.height);
  elements.battlePreparationMap.setAttribute("aria-label", `${battle.map.width}列${battle.map.height}行の戦闘前配置図`);
  elements.battlePreparationMap.innerHTML = battle.map.tiles.map((tile) => {
    const key = `${tile.position.x},${tile.position.y}`;
    const unit = unitsByPosition.get(key);
    const fortification = fortificationsByPosition.get(key);
    const unitClass = unit ? UNIT_CLASSES[unit.unitClassId] : null;
    const terrain = TERRAIN_TYPES[tile.terrainType];
    const deployment = tile.position.x >= 2 && tile.position.x <= 8;
    const selected = unit?.id === selectedUnit?.id;
    const classNames = [
      `is-${tile.terrainType}`,
      deployment ? "is-deployment-zone" : "",
      unit ? `has-${unit.side}-unit` : "",
      selected ? "is-selected" : "",
      fortification ? "has-fortification" : "",
    ].filter(Boolean).join(" ");
    const icon = unit
      ? unit.iconUrl
        ? `<img src="${escapeHtml(unit.iconUrl)}" alt="">`
        : `<b>${escapeHtml(unitClass?.symbol ?? "兵")}</b>`
      : fortification ? `<b>${escapeHtml(BATTLE_FORTIFICATION_TYPES[fortification.typeId]?.symbol ?? "城")}</b>` : "";
    const label = unit
      ? `${unit.name}・${unitClass?.name ?? unit.unitClassId} ${unit.soldierCount}${dungeonBattle ? "戦力" : "名"}`
      : fortification ? fortification.name : `${terrain.name} ${tile.position.x + 1}-${tile.position.y + 1}`;
    return `<button type="button" class="${classNames}" data-preparation-tile="${key}" ${unit ? `data-preparation-unit="${unit.id}"` : ""} title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${icon}</button>`;
  }).join("");
}

function renderBattlePreparation() {
  const preparation = view.battlePreparation;
  elements.battlePreparationScreen.classList.toggle("is-hidden", !preparation);
  if (!preparation) return;
  const dungeonBattle = view.tacticalOrigin?.type === "dungeon";
  const summary = getBattlePreparationSummary(preparation);
  const selectedIds = new Set(preparation.selectedCharacterIds);
  elements.battlePreparationTitle.textContent = `${preparation.battle.name}・戦闘前編成`;
  elements.battlePreparationIntro.textContent = dungeonBattle
    ? "探索隊から参陣者を選び、既存の陣形・初期配置・兵站計画で遭遇戦へ入ります。"
    : "参陣人物、陣形、初期配置、兵站計画を確定してください。";
  elements.battleParticipantIntro.textContent = dungeonBattle
    ? "主人公と酒場で編成した仲間から最大3名を選択。正式な戦術戦闘の指揮官として各班を受け持ちます。"
    : "軍団長・副将・軍師として最大3名を選択。参加者は戦場上の指揮官となり、配下部隊を分担します。";
  elements.battlePreparationExit.textContent = dungeonBattle ? "遭遇地点へ戻る" : "開発メニューへ戻る";
  elements.battlePreparationSkip.hidden = !dungeonBattle;
  elements.battleParticipantCount.textContent = `${selectedIds.size} / 3`;
  elements.battleParticipantList.innerHTML = preparation.roster.map((participant) => {
    const selected = selectedIds.has(participant.id);
    const portrait = participant.portraitImage
      ? `<img src="${escapeHtml(participant.portraitImage)}" alt="">`
      : `<b>${escapeHtml(participant.portrait)}</b>`;
    const unavailableReason = participant.assignment ? "任務中" : participant.stamina < 20 ? "意欲不足" : "参加不可";
    return `<button type="button" class="battle-participant-card ${selected ? "is-selected" : ""}" data-battle-participant="${participant.id}" aria-pressed="${selected}" ${participant.available ? "" : "disabled"}>
      <span class="battle-participant-portrait">${portrait}</span>
      <span><small>${escapeHtml(participant.rank)} · ${escapeHtml(participant.role)}</small><strong>${escapeHtml(participant.name)}</strong><em>${escapeHtml(participant.policy || "軍務参加")}</em></span>
      <span class="battle-participant-stats"><b>統 ${participant.stats.leadership}</b><b>武 ${participant.stats.war}</b><b>知 ${participant.stats.intelligence}</b></span>
      <i>${participant.available ? selected ? "参陣" : "待機" : unavailableReason}</i>
    </button>`;
  }).join("");
  elements.battlePlacementMode.innerHTML = [
    { id: "auto", name: "自動配置", note: "推奨" },
    { id: "manual", name: "手動配置", note: "マス指定" },
  ].map((mode) => `<button type="button" data-battle-placement-mode="${mode.id}" class="${preparation.placementMode === mode.id ? "is-active" : ""}" aria-pressed="${preparation.placementMode === mode.id}"><strong>${mode.name}</strong><small>${mode.note}</small></button>`).join("");
  elements.battlePreparationFormations.innerHTML = Object.values(TACTICAL_FORMATIONS).map((formation) => `
    <button type="button" data-preparation-formation="${formation.id}" class="${preparation.formationId === formation.id ? "is-active" : ""}" aria-pressed="${preparation.formationId === formation.id}"><span>${formation.name}</span><small>攻 ${Math.round((formation.modifiers.attack ?? 1) * 100)} · 守 ${Math.round((formation.modifiers.defense ?? 1) * 100)} · 動 ${Math.round((formation.modifiers.movement ?? 1) * 100)}</small><em>${escapeHtml(formation.description)}</em></button>`).join("");
  renderBattlePreparationMap(preparation);
  const selectedUnit = getBattleUnit(preparation.battle, preparation.selectedUnitId);
  elements.battleDeploymentHelp.innerHTML = preparation.placementMode === "auto"
    ? `<b>自動配置中</b> 陣形を選ぶと、兵種を含む全部隊を推奨位置へ再配置します。`
    : selectedUnit
      ? `<b>${escapeHtml(selectedUnit.name)}を選択中</b> 青枠の自軍展開区域から空きマスを指定してください。`
      : `<b>手動配置中</b> 自軍部隊を選択し、続けて青枠の空きマスを指定してください。`;
  const sustainTone = summary.sustainableDays >= 20 ? "is-long" : summary.sustainableDays >= 10 ? "is-standard" : "is-short";
  elements.battleSustainmentCard.className = `battle-sustainment-card ${sustainTone}`;
  elements.battleSustainmentCard.innerHTML = `<small>ESTIMATED ENDURANCE</small><span><strong>約${summary.sustainableDays}日</strong><em>継戦可能</em></span><dl><div><dt>${dungeonBattle ? "戦力規模" : "軍団規模"}</dt><dd>${formatValue(summary.soldiers)}${dungeonBattle ? "戦力" : "名"} · ${summary.units}部隊</dd></div><div><dt>一日需要</dt><dd>${formatValue(summary.dailyDemand)}口</dd></div><div><dt>${dungeonBattle ? "携行物資" : "携行糧秣"}</dt><dd>${formatValue(summary.rationUnits)}口</dd></div><div><dt>${dungeonBattle ? "補給班" : "輜重隊"}</dt><dd>${summary.wagonColumns}隊</dd></div></dl>`;
  elements.battleLogisticsOptions.innerHTML = Object.values(BATTLE_LOGISTICS_PLANS).map((plan) => {
    const planDraft = setBattleLogisticsPlan(preparation, plan.id);
    const days = getBattlePreparationSummary(planDraft).sustainableDays;
    const selected = preparation.logisticsPlanId === plan.id;
    return `<button type="button" role="radio" aria-checked="${selected}" data-battle-logistics="${plan.id}" class="${selected ? "is-active" : ""}"><span><strong>${plan.name}</strong><b>約${days}日</b></span><small>糧秣 ${formatValue(plan.rationUnits)}口 · 輜重${plan.wagonColumns}隊<br>戦場備蓄 ${plan.nodeStockpile} · 輸送上限 ${plan.throughput}/turn</small><p>${escapeHtml(plan.description)}</p></button>`;
  }).join("");
  const ready = selectedIds.size > 0;
  elements.battlePreparationReadiness.innerHTML = ready
    ? `<span>READY</span><strong>${selectedIds.size}名参陣 · ${TACTICAL_FORMATIONS[preparation.formationId].name} · ${summary.plan.name} · 約${summary.sustainableDays}日</strong>`
    : `<span>NOT READY</span><strong>戦闘に参加する人物を1名以上選択してください</strong>`;
  elements.battlePreparationScreen.querySelector('[data-preparation-action="start"]').disabled = !ready;
}

function openTacticalBattle({ battle = createSampleBattle(), roster = null, defaultParticipantIds = null, origin = null } = {}) {
  stopTacticalBattleEffects();
  view.launchOpen = false;
  view.guideOpen = false;
  const participants = roster ?? tacticalParticipantRoster();
  view.tacticalOrigin = origin;
  view.battlePreparation = createBattlePreparation({
    battle,
    roster: participants,
    defaultParticipantIds: defaultParticipantIds ?? battlePreparationDefaults(participants),
  });
  view.tacticalBattle = null;
  view.tacticalResult = null;
  view.tacticalResultOpen = false;
  view.commanderDisposition = null;
  view.commanderDispositionOpen = false;
  view.selectedTacticalUnitId = null;
  view.selectedTacticalCommanderId = null;
  view.selectedTacticalFortificationId = null;
  view.tacticalInspectorDismissed = false;
  view.pendingTacticalMagicId = null;
  render();
}

function openDungeonTacticalBattle() {
  const run = state.adventure?.activeRun;
  if (!run || run.phase !== "battle" || !run.combat) throw new Error("戦術戦闘を開始できる遭遇がありません。");
  const battle = createDungeonTacticalBattle(state);
  const personalUnitBattle = battle.combatScale === "personal-units";
  const origin = { type: run.mode === "personal-map" ? "personal-map" : "dungeon", runMode: run.mode, personalUnitBattle, runId: run.id, enemyName: run.combat.enemyName, dungeonName: run.dungeonName };
  if (personalUnitBattle) {
    stopTacticalBattleEffects();
    view.launchOpen = false;
    view.guideOpen = false;
    view.tacticalOrigin = origin;
    view.battlePreparation = null;
    view.tacticalBattle = battle;
    view.tacticalResult = null;
    view.tacticalResultOpen = false;
    view.commanderDisposition = null;
    view.commanderDispositionOpen = false;
    view.selectedTacticalUnitId = null;
    view.selectedTacticalCommanderId = null;
    view.selectedTacticalFortificationId = null;
    view.tacticalInspectorDismissed = false;
    view.pendingTacticalMagicId = null;
    render();
    return;
  }
  const roster = getDungeonTacticalRoster(state);
  openTacticalBattle({
    battle,
    roster,
    defaultParticipantIds: roster.filter((entry) => entry.available).slice(0, 3).map((entry) => entry.id),
    origin,
  });
}

function startTacticalBattle() {
  if (!view.battlePreparation) return;
  view.tacticalBattle = finalizeBattlePreparation(view.battlePreparation);
  view.battlePreparation = null;
  view.selectedTacticalUnitId = null;
  view.selectedTacticalCommanderId = null;
  view.selectedTacticalFortificationId = null;
  view.tacticalInspectorDismissed = false;
  view.pendingTacticalMagicId = null;
  render();
}

function prepareTacticalResult({ open = true } = {}) {
  const battle = view.tacticalBattle;
  if (!battle?.winner) return;
  view.tacticalResult = createBattleResult(battle);
  view.tacticalResult.autoResolved = Boolean(view.tacticalOrigin?.autoResolved);
  if (view.tacticalOrigin?.type === "personal-map") {
    view.tacticalResult.title = view.tacticalResult.winner === "player"
      ? "探索パーティー勝利"
      : view.tacticalResult.winner === "enemy" ? `${view.tacticalOrigin.enemyName}側勝利` : "双方戦闘不能";
  } else if (view.tacticalOrigin?.type === "dungeon") {
    const travelEncounter = view.tacticalOrigin.runMode === "travel";
    view.tacticalResult.title = view.tacticalResult.winner === "player"
      ? travelEncounter ? "旅の一行勝利" : "探索隊勝利"
      : view.tacticalResult.winner === "enemy"
        ? travelEncounter ? "旅の一行撤退" : "探索隊撤退"
        : travelEncounter ? "相討ち・移動中断" : "相討ち・探索中断";
  } else if (view.tacticalOrigin?.type === "military-career") {
    view.tacticalResult.title = view.tacticalResult.winner === "player" ? "軍務達成" : view.tacticalResult.winner === "enemy" ? "軍務敗北" : "軍務中断";
  }
  view.tacticalResultOpen = open;
  view.commanderDispositionOpen = false;
  if (["dungeon", "personal-map", "robbery", "military-career"].includes(view.tacticalOrigin?.type)) {
    view.commanderDisposition = null;
    return;
  }
  const commander = getBattleCommander(battle, view.tacticalResult.capture.commanderId);
  view.commanderDisposition = commander
    ? createCommanderDispositionCase({ commander, battleResult: view.tacticalResult })
    : null;
}

function clearTacticalBattleView() {
  stopTacticalBattleEffects();
  view.battlePreparation = null;
  view.tacticalBattle = null;
  view.tacticalResult = null;
  view.tacticalResultOpen = false;
  view.commanderDisposition = null;
  view.commanderDispositionOpen = false;
  view.selectedTacticalUnitId = null;
  view.selectedTacticalCommanderId = null;
  view.selectedTacticalFortificationId = null;
  view.tacticalInspectorDismissed = false;
  view.pendingTacticalMagicId = null;
}

function exitTacticalBattle({ applyDungeonResult = false } = {}) {
  const origin = view.tacticalOrigin;
  const battleResult = view.tacticalResult;
  if (["robbery", "military-career"].includes(origin?.type) && !battleResult) {
    showToast(origin.type === "military-career" ? "軍務戦闘の決着後に作戦地域へ戻れます。" : "強盗戦闘の決着後に街道へ戻れます。", "danger");
    return;
  }
  clearTacticalBattleView();
  view.tacticalOrigin = null;
  if (origin?.type === "robbery") {
    if (battleResult) {
      const resolved = resolveRobberyBattle(state, battleResult, { detected: true });
      commit(resolved.state, crimeOutcomeMessage("隊商との強盗戦闘", resolved.result), "event");
    } else render();
    return;
  }
  if (origin?.type === "military-career") {
    view.launchOpen = false;
    view.panel = "career";
    view.shortcutTab = "characters";
    view.characterDetailOpen = Boolean(battleResult);
    view.selectedShortcutCharacterId = state.player?.id ?? view.selectedShortcutCharacterId;
    if (battleResult) {
      const next = resolveMilitaryCareerBattle(state, battleResult);
      commit(next, battleResult.winner === "player" ? "軍務戦闘に勝利しました。受命地点へ帰還して報告してください。" : "軍務戦闘に敗れました。損害を保持したまま主君へ報告できます。", battleResult.winner === "player" ? "confirm" : "danger");
    } else render();
    return;
  }
  if (["dungeon", "personal-map"].includes(origin?.type)) {
    view.launchOpen = false;
    view.adventureOpen = true;
    if (applyDungeonResult && battleResult) {
      const next = resolveDungeonTacticalBattle(state, battleResult);
      const won = battleResult.winner === "player";
      const wonMessage = origin.type === "personal-map" ? "遭遇したモンスターを退けました。" : "戦術戦闘に勝利し、自動探索を再開しました。";
      commit(next, won ? wonMessage : "戦術戦闘の結果、探索隊は撤退しました。", won ? "confirm" : "danger");
    } else {
      render();
    }
    return;
  }
  view.launchOpen = true;
  render();
}

function routePartyToRecovery({ applyBattleResult = false } = {}) {
  const context = currentAdventureContext();
  let next = state;
  if (applyBattleResult) {
    if (!view.tacticalResult) throw new Error("帰還に反映できる戦闘結果がありません。");
    next = resolveDungeonTacticalBattle(next, view.tacticalResult);
  }
  next = returnToVillageForRecovery(next, context);
  const travelMinutes = next.adventure.personalMap.regions[context.region.id]?.lastResult?.travelMinutes ?? 0;
  clearTacticalBattleView();
  view.tacticalOrigin = null;
  view.adventureOpen = false;
  const village = generatedVillageContexts(context.region.id).find((entry) => entry.type === "village") ?? generatedVillageContexts(context.region.id)[0];
  if (!village) throw new Error("帰還先の村が見つかりません。");
  const recoveryMessage = `${village.name}へ敗走者を搬送し、神殿・治療所で診察を受けられる状態にした。`;
  const recoveryRecord = {
    id: `village-${next.turn ?? 0}-${next.player.villageLife.actionHistory.length + 1}`,
    villageId: village.id,
    villageName: village.name,
    facilityId: "temple",
    facilityName: "神殿・治療所",
    actionId: "battle_recovery",
    actionName: "戦闘後帰還",
    year: next.year,
    month: next.month,
    message: recoveryMessage,
  };
  next.player.villageLife.lastAction = recoveryRecord;
  next.player.villageLife.actionHistory.unshift(recoveryRecord);
  next.player.villageLife.actionHistory = next.player.villageLife.actionHistory.slice(0, 40);
  next.player.history ??= [];
  next.player.history.unshift({ turn: next.turn ?? 0, year: next.year, month: next.month, title: `${village.name}・戦闘後帰還`, detail: recoveryMessage });
  next.player.history = next.player.history.slice(0, 60);
  enterVillage(village.id);
  view.selectedVillageFacilityId = "temple";
  view.villageFacilityOpen = true;
  commit(next, `${village.name}の神殿・治療所へ帰還しました。（${formatGeneratedTravelDuration(travelMinutes)}経過）`, "confirm");
}

function skipActiveDungeonBattle() {
  if (state.adventure?.activeRun?.phase !== "battle") throw new Error("スキップできる戦闘がありません。");
  const run = state.adventure.activeRun;
  const personalEncounter = run.mode === "personal-map" || run.combatScale === "personal-units";
  const continuingBattle = Boolean(view.tacticalBattle && !view.tacticalBattle.winner && ["dungeon", "personal-map"].includes(view.tacticalOrigin?.type));
  const manualTurns = continuingBattle ? view.tacticalBattle.turn : 0;
  let battle = continuingBattle ? structuredClone(view.tacticalBattle) : createDungeonTacticalBattle(state);
  if (!personalEncounter) {
    const roster = getDungeonTacticalRoster(state);
    battle = finalizeBattlePreparation(createBattlePreparation({
      battle,
      roster,
      defaultParticipantIds: roster.filter((entry) => entry.available).slice(0, 3).map((entry) => entry.id),
    }));
  }
  battle = autoResolveBattle(battle);
  clearTacticalBattleView();
  view.tacticalOrigin = { type: run.mode === "personal-map" ? "personal-map" : "dungeon", runMode: run.mode, personalUnitBattle: personalEncounter, runId: run.id, enemyName: run.combat.enemyName, dungeonName: run.dungeonName, autoResolved: true, continuedFromManual: continuingBattle, manualTurns };
  view.launchOpen = false;
  view.adventureOpen = true;
  view.tacticalBattle = battle;
  prepareTacticalResult();
  render();
}

function confirmAndSkipActiveDungeonBattle() {
  const continuingBattle = Boolean(view.tacticalBattle && !view.tacticalBattle.winner && ["dungeon", "personal-map"].includes(view.tacticalOrigin?.type));
  const prompt = continuingBattle
    ? `第${view.tacticalBattle.turn}ターンまでのHP・撃破状況を保持し、残りの戦闘を自動進行しますか？`
    : "この戦闘を同じ戦闘処理で自動進行し、結果画面を表示しますか？";
  if (!window.confirm(prompt)) return;
  skipActiveDungeonBattle();
}

function tacticalStateLabel(unit) {
  const stateValue = typeof unit === "string" ? unit : unit?.state;
  return {
    STABLE: "安定", SHAKEN: "動揺", WAVERING: "不安定", BROKEN: "崩壊寸前",
    ROUTED: "潰走", DESTROYED: "壊滅", ESCAPED: "戦場離脱", RECOVERING: "療養中", READY: "行動可能",
  }[stateValue] ?? stateValue ?? "状態不明";
}

function tacticalVisualOrder(unit) {
  return unit.state === "ROUTED" ? "retreat" : unit.order;
}

function tacticalFacingArrow(facing) {
  return { north: "▲", east: "▶", south: "▼", west: "◀" }[facing] ?? "•";
}

function tacticalPositionLabel(position) {
  return position ? `${position.x + 1}-${position.y + 1}` : "なし";
}

function tacticalMagicEffectLabel(skill) {
  const labels = {
    unit_damage: "敵へダメージ",
    restore_soldiers: "味方の兵力回復",
    restore_morale: "味方の士気回復",
    burning: "炎上地形",
    frozen: "凍結地形",
    earth_wall: "防御地形",
    slowed: "敵を鈍足化",
    buffeted: "敵の射撃低下",
    radiant_ward: "味方の防御上昇",
    shadow_veil: "味方の防御・射撃上昇",
  };
  return [...new Set(skill.effects.map((effect) => labels[effect.statusId] ?? labels[effect.type] ?? "特殊効果"))].join("・");
}

function tacticalPlanLabel(battle, unit) {
  if (unit.plannedAction) {
    const skill = MAGIC_SKILLS[unit.plannedAction.actionId];
    return `${skill?.name ?? unit.plannedAction.actionId} → ${tacticalPositionLabel(unit.plannedAction.position)}`;
  }
  const target = getBattleUnit(battle, unit.targetId);
  if (target) return `攻撃 → ${target.name}`;
  if (unit.plannedPosition) return `移動 → ${tacticalPositionLabel(unit.plannedPosition)}`;
  if (unit.playerInstructions?.order) return `${ORDER_LABELS[unit.order]}命令`;
  return `${ORDER_LABELS[unit.order]}（自律）`;
}

function renderTacticalCommandGuide(battle) {
  const units = battle.units.filter((unit) => unit.side === "player" && !["DESTROYED", "ESCAPED"].includes(unit.state));
  const selected = getBattleUnit(battle, view.selectedTacticalUnitId);
  const hasPlan = Boolean(selected && (selected.plannedAction || selected.targetId || selected.plannedPosition || Object.keys(selected.playerInstructions ?? {}).length));
  const step = !selected ? 1 : view.pendingTacticalMagicId ? 3 : hasPlan ? 4 : 2;
  const steps = [
    ["1", "味方を選ぶ"],
    ["2", "命令・魔法を選ぶ"],
    ["3", "盤面で対象を選ぶ"],
    ["4", "命令を実行"],
  ];
  elements.tacticalCommandGuide.innerHTML = `
    <ol>${steps.map(([number, label], index) => `<li class="${index + 1 === step ? "is-current" : index + 1 < step ? "is-complete" : ""}"><i>${number}</i><span>${label}</span></li>`).join("")}</ol>
    <div class="tactical-command-roster" aria-label="味方部隊の命令状況">${units.map((unit) => {
      const selectedUnit = unit.id === selected?.id;
      const directPlan = Boolean(unit.plannedAction || unit.targetId || unit.plannedPosition || Object.keys(unit.playerInstructions ?? {}).length);
      const commanded = isInCommandRange(battle, unit);
      return `<button type="button" data-battle-select-unit="${unit.id}" class="${selectedUnit ? "is-selected" : ""} ${directPlan ? "has-plan" : ""} ${commanded ? "" : "is-autonomous"}" aria-pressed="${selectedUnit}"><strong>${escapeHtml(unit.name)}</strong><small>${commanded ? tacticalPlanLabel(battle, unit) : "指揮範囲外・自律"}</small><b>${directPlan ? "指示済" : commanded ? "選択" : "自律"}</b></button>`;
    }).join("")}</div>`;
}

function tacticalEffectPoint(position, tileSize) {
  return {
    x: (position.x + 0.5) * tileSize,
    y: (position.y + 0.5) * tileSize,
  };
}

function stopTacticalBattleEffects() {
  if (tacticalEffectTimer !== null) {
    clearTimeout(tacticalEffectTimer);
    tacticalEffectTimer = null;
  }
  tacticalEffectsPlaying = false;
  elements.tacticalBattleMap?.querySelector(".tactical-vfx-layer")?.remove();
  elements.tacticalBattleMap?.classList.remove("is-vfx-active");
  elements.tacticalBattleScreen?.classList.remove("is-resolving");
  const executeButton = elements.tacticalBattleScreen?.querySelector('[data-battle-action="execute"]');
  if (executeButton) executeButton.disabled = !view.tacticalBattle || Boolean(view.tacticalBattle.winner);
  if (elements.tacticalResultButton) elements.tacticalResultButton.disabled = false;
}

function appendTacticalMovementEffect(layer, effect, tileSize, reducedMotion) {
  const from = tacticalEffectPoint(effect.from, tileSize);
  const to = tacticalEffectPoint(effect.to, tileSize);
  const marker = document.createElement("span");
  marker.className = `tactical-vfx-move is-${effect.side} ${effect.actorType === "commander" ? "is-commander" : ""}`;
  marker.style.left = `${to.x}px`;
  marker.style.top = `${to.y}px`;
  marker.style.setProperty("--vfx-move-x", `${from.x - to.x}px`);
  marker.style.setProperty("--vfx-move-y", `${from.y - to.y}px`);
  marker.style.setProperty("--vfx-delay", reducedMotion ? "0ms" : "90ms");
  layer.append(marker);
}

function appendTacticalImpactEffect(layer, effect, tileSize, index, reducedMotion) {
  const from = tacticalEffectPoint(effect.from, tileSize);
  const to = tacticalEffectPoint(effect.to, tileSize);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(tileSize * 0.35, Math.hypot(dx, dy));
  const delay = reducedMotion ? 0 : 520 + Math.min(index, 7) * 135;

  if (effect.kind !== "impact" && effect.kind !== "fire") {
    const attack = document.createElement("span");
    attack.className = `tactical-vfx-attack is-${effect.kind}`;
    attack.style.left = `${from.x}px`;
    attack.style.top = `${from.y}px`;
    attack.style.setProperty("--vfx-length", `${distance}px`);
    attack.style.setProperty("--vfx-angle", `${Math.atan2(dy, dx) * 180 / Math.PI}deg`);
    attack.style.setProperty("--vfx-delay", `${delay}ms`);
    layer.append(attack);
  }

  const impact = document.createElement("span");
  impact.className = `tactical-vfx-impact is-${effect.kind} ${effect.severity >= 0.18 ? "is-heavy" : ""}`;
  impact.style.left = `${to.x}px`;
  impact.style.top = `${to.y}px`;
  impact.style.setProperty("--vfx-delay", `${delay + (reducedMotion ? 0 : 230)}ms`);
  const casualty = document.createElement("b");
  casualty.textContent = `−${effect.casualties}`;
  casualty.setAttribute("aria-hidden", "true");
  impact.append(casualty);
  layer.append(impact);
}

function appendTacticalStatusEffect(layer, effect, tileSize, index, reducedMotion) {
  const point = tacticalEffectPoint(effect.position, tileSize);
  const marker = document.createElement("strong");
  marker.className = `tactical-vfx-status is-${effect.tone}`;
  marker.textContent = effect.label;
  marker.style.left = `${point.x}px`;
  marker.style.top = `${point.y}px`;
  marker.style.setProperty("--vfx-delay", `${reducedMotion ? 0 : 980 + Math.min(index, 6) * 110}ms`);
  layer.append(marker);
}

function playTacticalBattleEffects(effects, battle, onComplete) {
  stopTacticalBattleEffects();
  const map = elements.tacticalBattleMap;
  if (!map || !battle || view.tacticalBattle !== battle) return;
  const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const tileSize = Number.parseFloat(getComputedStyle(map).getPropertyValue("--battle-tile-size")) || 44;
  const layer = document.createElement("div");
  layer.className = "tactical-vfx-layer";
  layer.setAttribute("aria-hidden", "true");

  const turn = document.createElement("span");
  turn.className = "tactical-vfx-turn";
  turn.innerHTML = `<small>TURN</small><b>${effects.turn}</b><em>交戦</em>`;
  layer.append(turn);
  effects.movements.forEach((effect) => appendTacticalMovementEffect(layer, effect, tileSize, reducedMotion));
  effects.impacts.forEach((effect, index) => appendTacticalImpactEffect(layer, effect, tileSize, index, reducedMotion));
  effects.statuses.forEach((effect, index) => appendTacticalStatusEffect(layer, effect, tileSize, index, reducedMotion));
  map.append(layer);
  map.classList.add("is-vfx-active");
  elements.tacticalBattleScreen.classList.add("is-resolving");
  tacticalEffectsPlaying = true;
  const executeButton = elements.tacticalBattleScreen.querySelector('[data-battle-action="execute"]');
  if (executeButton) executeButton.disabled = true;
  elements.tacticalResultButton.disabled = true;

  const duration = reducedMotion ? 700 : Math.min(2800, 1650 + effects.impacts.length * 135 + effects.statuses.length * 80);
  tacticalEffectTimer = setTimeout(() => {
    tacticalEffectTimer = null;
    tacticalEffectsPlaying = false;
    layer.remove();
    map.classList.remove("is-vfx-active");
    elements.tacticalBattleScreen.classList.remove("is-resolving");
    if (view.tacticalBattle !== battle) return;
    if (executeButton) executeButton.disabled = Boolean(battle.winner);
    elements.tacticalResultButton.disabled = false;
    onComplete?.();
  }, duration);
}

function renderTacticalSummary(battle) {
  const summary = getBattleSummary(battle);
  const labels = tacticalOriginLabels();
  const personalUnitsBattle = battle.combatScale === "personal-units";
  const side = (data, id, label) => {
    return `
    <section class="tactical-side-summary is-${id}">
      <strong>${label}</strong>
      <span><small>${personalUnitsBattle ? "ユニット" : "兵力"}</small><b>${personalUnitsBattle ? `${data.standing} / ${data.units}` : formatValue(data.soldiers)}</b></span>
      <span><small>士気</small><b>${data.morale}</b></span>
      ${data.cutOff ? `<em title="補給線接続 ${data.supplied}/${data.units}部隊">${data.cutOff}隊 補給断</em>` : ""}
    </section>`;
  };
  elements.tacticalBattleSummary.innerHTML = `
    ${side(summary.player, "player", labels.player)}
    <div class="tactical-turn-counter"><small>${summary.winner ? `時刻 ${summary.actionTime} で決着` : `行動時刻 ${summary.actionTime}`}</small><strong>${summary.winner ? summary.winner === "player" ? labels.playerVictory : summary.winner === "enemy" ? labels.enemyVictory : "引き分け" : `第${summary.turn + 1}判定`}</strong></div>
    ${side(summary.enemy, "enemy", labels.enemy)}
  `;
}

function renderTacticalDeployment(battle) {
  const formation = TACTICAL_FORMATIONS[battle.formations?.player] ?? TACTICAL_FORMATIONS.line;
  const preparation = battle.preparation;
  const locked = battle.turn > 0 || Boolean(preparation?.finalized);
  const nationalMatchup = battle.nationalArmies ? `<div class="tactical-national-matchup">${["player", "enemy"].map((sideId) => {
    const army = battle.nationalArmies[sideId];
    if (!army) return `<section class="is-${sideId}"><small>${sideId === "player" ? "自軍軍制" : "敵軍軍制"}</small><strong>非正規部隊</strong><span>国家常備軍の軍制外</span></section>`;
    return `<section class="is-${sideId}"><small>${sideId === "player" ? "自軍軍制" : "敵軍軍制"} · ${escapeHtml(army.nationName)}</small><strong>${escapeHtml(army.doctrineName)}</strong><span>${escapeHtml(army.doctrineSummary)}</span>${army.generationMethod ? `<span class="tactical-generation-badge">全隊シード生成 · ${army.units.length}個体</span>` : ""}<em>強み ${escapeHtml(army.strengths.slice(0, 2).join("・"))} / 弱点 ${escapeHtml(army.risks[0])}</em></section>`;
  }).join("")}</div>` : "";
  const logistics = preparation?.finalized
    ? `${BATTLE_LOGISTICS_PLANS[preparation.logisticsPlanId]?.name ?? "兵站計画"} · 約${preparation.sustainableDays}日`
    : "補給路は敵支配圏で遮断";
  if (locked) {
    const combatants = battle.units.filter((unit) => !["DESTROYED", "ESCAPED"].includes(unit.state));
    const noDamageYet = combatants.every((unit) => unit.hp >= unit.maxHp);
    const stallGuidance = battle.combatScale === "personal-units" && battle.turn >= 4 && noDamageYet
      ? "膠着中です。防御命令だけでは接敵しないため、前進か攻撃へ切り替えてください。"
      : "駒を選択すると、命令と詳しい状態を確認できます。";
    elements.tacticalDeploymentBar.innerHTML = `
      <div class="tactical-battle-brief">
        <span><small>陣形</small><strong>${formation.name}</strong></span>
        <span><small>兵站</small><strong>${logistics}</strong></span>
        <p>${stallGuidance}</p>
      </div>
      ${nationalMatchup}`;
    return;
  }
  elements.tacticalDeploymentBar.innerHTML = `
    <div class="tactical-deployment-copy"><span>DEPLOYMENT</span><strong>${formation.name} · ${preparation?.placementMode === "manual" ? "手動配置" : "自動配置"}</strong><small>${preparation?.finalized ? `${preparation.participantNames.join("・")}が参陣` : locked ? "戦闘開始後は変更できません" : formation.description}</small></div>
    <div class="tactical-formation-options" role="group" aria-label="${escapeHtml(tacticalOriginLabels().player)}の陣形">
      ${Object.values(TACTICAL_FORMATIONS).map((option) => `<button type="button" data-battle-formation="${option.id}" class="${formation.id === option.id ? "is-active" : ""}" ${locked ? "disabled" : ""} title="${escapeHtml(option.description)}"><b>${option.name}</b><small>攻 ${Math.round((option.modifiers.attack ?? 1) * 100)} / 守 ${Math.round((option.modifiers.defense ?? 1) * 100)} / 動 ${Math.round((option.modifiers.movement ?? 1) * 100)}</small></button>`).join("")}
    </div>
    <p class="tactical-logistics-brief"><b>兵站</b> ${logistics}</p>
    ${nationalMatchup}
  `;
}

function renderTacticalMap(battle) {
  elements.tacticalBattleMap.style.setProperty("--battle-columns", battle.map.width);
  elements.tacticalBattleMap.style.setProperty("--battle-rows", battle.map.height);
  elements.tacticalBattleMap.setAttribute("aria-label", `${battle.map.width}列${battle.map.height}行の戦闘マップ`);
  const unitsByPosition = new Map(battle.units.filter((unit) => !["DESTROYED", "ESCAPED"].includes(unit.state)).map((unit) => [`${unit.position.x},${unit.position.y}`, unit]));
  const commandersByPosition = new Map(battle.commanders.filter((commander) => commander.status === "ACTIVE").map((commander) => [`${commander.position.x},${commander.position.y}`, commander]));
  const supplyNodesByPosition = new Map((battle.supplyNodes ?? []).map((node) => [`${node.position.x},${node.position.y}`, node]));
  const fortificationsByPosition = new Map((battle.fortifications ?? []).map((fortification) => [`${fortification.position.x},${fortification.position.y}`, fortification]));
  const selectedUnit = getBattleUnit(battle, view.selectedTacticalUnitId);
  const selectedCommander = getBattleCommander(battle, view.selectedTacticalCommanderId);
  const selectedFortification = getBattleFortification(battle, view.selectedTacticalFortificationId);
  const commandOrigin = selectedUnit ? getBattleCommander(battle, selectedUnit.commanderId) : selectedCommander;
  const commandCastle = commandOrigin ? getFortificationAura(battle, commandOrigin, "castle") : null;
  const commandRange = commandOrigin ? commandOrigin.commandRange + (commandCastle ? BATTLE_FORTIFICATION_TYPES.castle.buffs.commandRange : 0) : -1;
  const commandCenter = selectedCommander?.plannedPosition ?? commandOrigin?.position;
  const plannedPosition = selectedUnit?.plannedPosition ?? selectedCommander?.plannedPosition;
  const target = getBattleUnit(battle, selectedUnit?.targetId);
  const selectedSupplyRoute = selectedUnit ? getSupplyRoute(battle, selectedUnit) : null;
  const supplyRouteByPosition = new Map((selectedSupplyRoute?.route ?? []).map((position, index) => [
    `${position.x},${position.y}`,
    index,
  ]));
  const supplySourceKey = selectedSupplyRoute?.source
    ? `${selectedSupplyRoute.source.position.x},${selectedSupplyRoute.source.position.y}`
    : null;
  const reachableTiles = new Map([
    ...(selectedUnit ? getReachableBattleTiles(battle, selectedUnit.id) : []),
    ...(selectedCommander ? getReachableCommanderTiles(battle, selectedCommander.id) : []),
  ].map((entry) => [`${entry.position.x},${entry.position.y}`, entry]));
  const pendingMagic = selectedUnit && view.pendingTacticalMagicId
    ? MAGIC_SKILLS[view.pendingTacticalMagicId]
    : null;
  const attackableTiles = new Map((selectedUnit
    ? pendingMagic ? getMagicTargetTiles(battle, selectedUnit.id, pendingMagic.id) : getAttackableBattleTiles(battle, selectedUnit.id)
    : [])
    .map((entry) => [`${entry.position.x},${entry.position.y}`, entry]));
  const plannedMagic = selectedUnit?.plannedAction ? MAGIC_SKILLS[selectedUnit.plannedAction.actionId] : null;
  elements.tacticalBattleMap.innerHTML = battle.map.tiles.map((tile) => {
    const key = `${tile.position.x},${tile.position.y}`;
    const unit = unitsByPosition.get(key);
    const commander = commandersByPosition.get(key);
    const supplyNode = supplyNodesByPosition.get(key);
    const fortification = fortificationsByPosition.get(key);
    const fortificationDefinition = fortification ? BATTLE_FORTIFICATION_TYPES[fortification.typeId] : null;
    const isSelected = Boolean(
      (unit && selectedUnit && unit.id === selectedUnit.id)
      || (commander && selectedCommander && commander.id === selectedCommander.id)
      || (fortification && selectedFortification && fortification.id === selectedFortification.id),
    );
    const isPlanned = plannedPosition && key === `${plannedPosition.x},${plannedPosition.y}`;
    const isTarget = target && key === `${target.position.x},${target.position.y}`;
    const inPlannedMagicArea = Boolean(plannedMagic && selectedUnit?.plannedAction
      && Math.abs(tile.position.x - selectedUnit.plannedAction.position.x) + Math.abs(tile.position.y - selectedUnit.plannedAction.position.y) <= plannedMagic.radius);
    const reachable = reachableTiles.get(key);
    const attackable = attackableTiles.get(key);
    const supplyRouteStep = supplyRouteByPosition.get(key);
    const isSupplyRoute = Number.isInteger(supplyRouteStep);
    const isSupplySource = key === supplySourceKey;
    const isSupplyCut = Boolean(selectedUnit && !selectedSupplyRoute?.connected
      && key === `${selectedUnit.position.x},${selectedUnit.position.y}`);
    const inCommand = commandCenter && Math.abs(tile.position.x - commandCenter.x) + Math.abs(tile.position.y - commandCenter.y) <= commandRange;
    const inFortificationAura = selectedFortification
      && Math.abs(tile.position.x - selectedFortification.position.x) + Math.abs(tile.position.y - selectedFortification.position.y)
        <= BATTLE_FORTIFICATION_TYPES[selectedFortification.typeId].auraRadius;
    const terrain = TERRAIN_TYPES[tile.terrainType];
    const isPassable = isBattleTilePassable(battle, tile.position, selectedUnit);
    const burning = tile.status.some((status) => status.id === "burning");
    const feature = tile.status.find((status) => ["ford", "bridge", "supply_depot"].includes(status.id));
    const unitPortrait = unit?.iconUrl ? `<img src="${escapeHtml(unit.iconUrl)}" alt="" draggable="false">` : "";
    const commanderPortrait = commander?.iconUrl ? `<img src="${escapeHtml(commander.iconUrl)}" alt="" draggable="false">` : "";
    const unitStrength = unit ? Math.round(unit.soldierCount / Math.max(1, unit.maxSoldierCount) * 100) : 0;
    const unitVisual = unit ? TACTICAL_ORDER_VISUALS[tacticalVisualOrder(unit)] ?? TACTICAL_ORDER_VISUALS.hold : null;
    const unitMarkup = unit ? `<span class="tactical-unit-counter is-${unit.side} ${unitVisual.className} ${unit.state === "ROUTED" ? "is-routed" : ""}" title="行動状態：${unitVisual.label}">${unitPortrait}<b>${UNIT_CLASSES[unit.unitClassId].symbol}</b><span class="tactical-unit-strength" aria-hidden="true"><i style="width:${unitStrength}%"></i></span></span><span class="tactical-facing is-${unit.facing}">${tacticalFacingArrow(unit.facing)}</span>` : "";
    const commanderMarkup = commander ? `<span class="tactical-commander-counter is-${commander.side}" title="${escapeHtml(commander.name)}">${commanderPortrait}<i>将</i></span>` : "";
    const terrainMarkup = `<span class="tactical-terrain-art" aria-hidden="true"><i></i><i></i><i></i></span>`;
    const featureMarkup = feature ? `<span class="tactical-feature-marker is-${feature.id}" aria-hidden="true">${feature.id === "bridge" ? "═" : feature.id === "ford" ? "⋮" : "▣"}</span>` : "";
    const supplyMarkup = supplyNode ? `<span class="tactical-supply-node is-${supplyNode.side}" aria-hidden="true"><i>補</i></span>` : "";
    const supplyRouteMarkup = isSupplyRoute
      ? `<span class="tactical-supply-route-marker ${supplyRouteStep === 0 ? "is-source" : ""} ${supplyRouteStep === selectedSupplyRoute.route.length - 1 ? "is-destination" : ""}" aria-hidden="true"><i></i></span>`
      : isSupplyCut ? `<span class="tactical-supply-route-marker is-cut" aria-hidden="true"><i></i></span>` : "";
    const fortificationIntegrity = fortification ? Math.round(fortification.durability / fortificationDefinition.maxBaseDurability * 100) : 0;
    const fortificationArt = fortification ? `./assets/generated/tactical-structures/${fortification.typeId}-v2.png` : "";
    const fortificationMarkup = fortification ? `<span class="tactical-fortification-marker is-${fortification.typeId} is-${fortification.side} ${fortification.encircled ? "is-encircled" : ""}" aria-hidden="true"><img src="${fortificationArt}" alt="" draggable="false"><b>${fortificationDefinition.symbol}</b><em><span style="width:${fortificationIntegrity}%"></span></em></span>` : "";
    const title = `${terrain.name}${feature ? `・${feature.name ?? ({ ford: "浅瀬", bridge: "橋梁", supply_depot: "補給所" }[feature.id])}` : ""} ${tile.position.x + 1}-${tile.position.y + 1}${isPassable ? "" : " / 通行不可"}${reachable ? ` / 移動可能 消費${reachable.cost}` : ""}${attackable ? ` / 攻撃可能 射程${attackable.distance}/${attackable.range}` : ""}${supplyNode ? ` / ${supplyNode.name} 備蓄${Math.round(supplyNode.stockpile)}/${supplyNode.maxStockpile}` : ""}${isSupplyRoute ? ` / 補給路 ${supplyRouteStep}/${selectedSupplyRoute.route.length - 1}` : ""}${fortification ? ` / ${fortification.name} 耐久${fortification.durability}/${fortification.baseDurability}${fortification.typeId === "castle" ? ` 備蓄${Math.round(fortification.supplyStockpile)}/${fortification.maxSupplyStockpile}` : ""}${fortification.encircled ? " 完全包囲" : ""}` : ""}${unit ? ` / ${unit.name} 兵${unit.soldierCount} 士気${Math.round(unit.morale)} 行動${unitVisual.label}` : ""}${commander ? ` / ${commander.name}` : ""}`;
    return `<button type="button" role="gridcell" class="tactical-tile terrain-${tile.terrainType} ${isPassable ? "" : "is-impassable"} ${reachable ? "is-reachable" : ""} ${attackable ? "is-attackable" : ""} ${pendingMagic && attackable ? "is-magic-target" : ""} ${isSelected ? "is-selected" : ""} ${isPlanned ? "is-planned" : ""} ${isTarget ? "is-target" : ""} ${inPlannedMagicArea ? "is-magic-area" : ""} ${inCommand ? "is-in-command" : ""} ${inFortificationAura ? "is-fortification-aura" : ""} ${isSupplyRoute ? "is-supply-route" : ""} ${isSupplySource ? "is-supply-source" : ""} ${isSupplyCut ? "is-supply-cut" : ""} ${burning ? "has-burning" : ""}" style="--tile-texture-x:${-tile.position.x * 44};--tile-texture-y:${-tile.position.y * 44}" data-battle-tile="${key}" data-terrain-symbol="${terrain.symbol ?? ""}" ${unit ? `data-battle-unit="${unit.id}"` : ""} ${commander ? `data-battle-commander="${commander.id}"` : ""} ${fortification ? `data-battle-fortification="${fortification.id}"` : ""} aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}">${terrainMarkup}${supplyRouteMarkup}${featureMarkup}${supplyMarkup}${fortificationMarkup}${unitMarkup}${commanderMarkup}</button>`;
  }).join("");
}

function renderTacticalCommanderInspector(battle, commander) {
  const units = battle.units.filter((unit) => unit.commanderId === commander.id && !["DESTROYED", "ESCAPED"].includes(unit.state));
  const suppliedUnits = units.filter((unit) => getLogisticsState(battle, unit).connected).length;
  const commandCastle = getFortificationAura(battle, commander, "castle");
  const effectiveCommandRange = commander.commandRange + (commandCastle ? BATTLE_FORTIFICATION_TYPES.castle.buffs.commandRange : 0);
  elements.tacticalBattleInspector.innerHTML = `
    <article class="tactical-unit-sheet">
      <button class="tactical-inspector-close" type="button" data-battle-inspector-close aria-label="情報カードをたたむ（選択は維持）" title="選択を維持したまま情報カードをたたむ">×</button>
      <header class="${commander.side === "enemy" ? "is-enemy" : ""}"><i class="tactical-sheet-icon">${commander.iconUrl ? `<img src="${escapeHtml(commander.iconUrl)}" alt="${escapeHtml(commander.name)}">` : "将"}</i><div><small>${commander.side === "player" ? "PLAYER COMMANDER" : "ENEMY COMMANDER"}</small><h2>${escapeHtml(commander.name)}</h2><b>${commander.status}</b></div></header>
      <div class="tactical-vitals">
        <span><small>統率</small><strong>${commander.leadership}</strong></span><span><small>戦術</small><strong>${commander.tactics}</strong></span>
        <span><small>勇敢</small><strong>${commander.bravery}</strong></span><span><small>魔術</small><strong>${commander.magic}</strong></span>
      </div>
      <section class="tactical-stats"><header><h3>指揮能力</h3></header><div class="tactical-stat-grid">
        <span><small>Command Range</small><strong>${effectiveCommandRange}マス${commandCastle ? "（城支援）" : ""}</strong></span><span><small>Command Speed</small><strong>${commander.commandSpeed}マス</strong></span>
        <span><small>現在位置</small><strong>${tacticalPositionLabel(commander.position)}</strong></span><span><small>隷下部隊</small><strong>${units.length}個</strong></span>
        <span><small>補給線中継</small><strong>${suppliedUnits} / ${units.length}部隊</strong></span><span><small>陣形</small><strong>${TACTICAL_FORMATIONS[battle.formations?.[commander.side]]?.name ?? "横陣"}</strong></span>
      </div>${commander.side === "player" ? `<p class="tactical-plan-note">${commander.plannedPosition ? `<b>移動予約 ${tacticalPositionLabel(commander.plannedPosition)}</b><br>` : ""}空きマスを選ぶと、${commander.commandSpeed}マス以内で司令部の移動を予約します。移動後の指揮範囲が金色で表示されます。</p>` : ""}</section>
    </article>`;
}

function renderTacticalFortificationInspector(battle, fortification) {
  const definition = BATTLE_FORTIFICATION_TYPES[fortification.typeId];
  const artUrl = `./assets/generated/tactical-structures/${fortification.typeId}-v2.png`;
  const integrity = Math.round(fortification.durability / Math.max(1, fortification.baseDurability) * 100);
  const baseIntegrity = Math.round(fortification.baseDurability / definition.maxBaseDurability * 100);
  const buffLabels = {
    defense: ["防御", `+${Math.round((definition.buffs.defense - 1) * 100)}%`],
    moraleRecovery: ["士気回復", `毎ターン +${definition.buffs.moraleRecovery}`],
    commandRange: ["指揮範囲", `+${definition.buffs.commandRange}マス`],
    supplyReplenish: ["城内補給", `毎ターン +${definition.buffs.supplyReplenish}`],
    rangedAccuracy: ["射撃精度", `+${Math.round((definition.buffs.rangedAccuracy - 1) * 100)}%`],
    brace: ["迎撃能力", `+${Math.round((definition.buffs.brace - 1) * 100)}%`],
  };
  const buffs = Object.keys(definition.buffs).map((id) => `<span><small>${buffLabels[id][0]}</small><strong>${buffLabels[id][1]}</strong></span>`).join("");
  const status = fortification.encircled ? "完全包囲" : fortification.status === "BREACHED" ? "基礎耐久低下" : fortification.status === "RUINED" ? "陥落" : "健在";
  elements.tacticalBattleInspector.innerHTML = `
    <article class="tactical-unit-sheet tactical-fortification-sheet">
      <button class="tactical-inspector-close" type="button" data-battle-inspector-close aria-label="情報カードをたたむ（選択は維持）" title="選択を維持したまま情報カードをたたむ">×</button>
      <header class="${fortification.side === "enemy" ? "is-enemy" : ""}"><i class="tactical-sheet-icon is-fortification"><img src="${artUrl}" alt="${escapeHtml(fortification.name)}"></i><div><small>${fortification.side === "player" ? "PLAYER STRONGHOLD" : "ENEMY STRONGHOLD"}</small><h2>${escapeHtml(fortification.name)}</h2><b>${definition.name} · ${status}</b></div></header>
      <div class="tactical-vitals">
        <span><small>Current Durability</small><strong>${fortification.durability} / ${fortification.baseDurability}</strong><meter min="0" max="${definition.maxBaseDurability}" value="${fortification.durability}"></meter></span>
        <span class="${fortification.encircled ? "is-danger" : ""}"><small>Base Durability</small><strong>${fortification.baseDurability} / ${definition.maxBaseDurability}</strong><meter min="${definition.minimumBaseDurability}" max="${definition.maxBaseDurability}" value="${fortification.baseDurability}"></meter></span>
        ${fortification.typeId === "castle" ? `<span class="is-supply"><small>Castle Supply Reserve</small><strong>${Math.round(fortification.supplyStockpile)} / ${fortification.maxSupplyStockpile} · 輸送上限 ${definition.supplyThroughput}/turn</strong><meter min="0" max="${fortification.maxSupplyStockpile}" value="${fortification.supplyStockpile}"></meter></span>` : ""}
      </div>
      <section class="tactical-stats"><header><h3>城塞効果</h3><small>範囲 ${definition.auraRadius}マス</small></header><div class="tactical-stat-grid">${buffs}</div><p class="tactical-plan-note">${escapeHtml(definition.description)}</p></section>
      <section class="tactical-fortification-status ${fortification.encircled ? "is-encircled" : ""}">
        <header><small>SIEGE STATUS</small><strong>${status}</strong></header>
        <p>${fortification.typeId === "castle" ? fortification.encircled ? `退路と補給路が完全遮断されています。ターン終了ごとに基礎耐久力が${definition.encirclementBaseLoss}低下します。` : "戦場外へ通じる安全な経路があります。基礎耐久力は低下しません。" : "砦は局地戦用の拠点です。完全包囲による基礎耐久低下の対象外です。"}</p>
        <div><span>現耐久 ${integrity}%</span><span>基礎耐久 ${baseIntegrity}%</span><span>包囲継続 ${fortification.encircledTurns}ターン</span></div>
      </section>
    </article>`;
}

function renderTacticalUnitInspector(battle, unit) {
  const unitClass = UNIT_CLASSES[unit.unitClassId];
  const race = RACES[unit.raceId];
  const commander = getBattleCommander(battle, unit.commanderId);
  const stats = getEffectiveStats(battle, unit);
  const logistics = getLogisticsState(battle, unit);
  const commanded = isInCommandRange(battle, unit);
  const target = getBattleUnit(battle, unit.targetId);
  const logisticsConnection = logistics.fortification
    ? `${logistics.fortification.name}支援`
    : logistics.connected ? logistics.relayConnected ? "指揮官中継" : "補給所直結" : "補給線断絶";
  const logisticsSourceName = logistics.source?.name ?? "接続拠点なし";
  const logisticsRouteLabel = logistics.connected
    ? `${logistics.routeLength}マス${logistics.relayConnected ? " · 指揮官中継" : " · 安全経路"}`
    : "経路遮断";
  const canCommand = unit.side === "player" && commanded && !["ROUTED", "DESTROYED", "ESCAPED"].includes(unit.state);
  const visualOrder = TACTICAL_ORDER_VISUALS[tacticalVisualOrder(unit)] ?? TACTICAL_ORDER_VISUALS.hold;
  const orderButtons = Object.values(UNIT_ORDERS).map((order) => `<button type="button" data-battle-order="${order}" class="${unit.order === order ? "is-active" : ""}" ${canCommand ? "" : "disabled"}>${ORDER_LABELS[order]}</button>`).join("");
  const facingButtons = Object.values(FACING).map((facing) => `<button type="button" data-battle-facing="${facing}" class="${unit.facing === facing ? "is-active" : ""}" ${canCommand ? "" : "disabled"}>${tacticalFacingArrow(facing)}</button>`).join("");
  const plan = tacticalPlanLabel(battle, unit);
  const orders = unit.side === "player" ? `
    <section class="tactical-orders"><header><h3>この部隊への命令</h3><small>${commanded ? `指揮官 ${commander.name}` : "指揮範囲外・自律行動"}</small></header><div class="tactical-order-grid">${orderButtons}</div><div class="tactical-facing-grid" aria-label="部隊の向き">${facingButtons}</div><p class="tactical-plan-note"><b>現在の予定</b> ${escapeHtml(plan)}</p></section>` : "";
  const magicIds = unit.abilities.includes("magic") ? (unit.availableMagicSkillIds ?? Object.keys(MAGIC_SKILLS)) : [];
  const magicOrders = unit.side === "player" && magicIds.length ? `<section class="tactical-magic-orders"><header><h3>装備魔法</h3><small>${view.pendingTacticalMagicId ? "対象マスを選択してください" : "術を選び、盤面の対象を指定"}</small></header><div>${magicIds.map((id) => {
    const skill = MAGIC_SKILLS[id];
    if (!skill) return "";
    return `<button type="button" data-battle-magic="${id}" class="${view.pendingTacticalMagicId === id ? "is-active" : ""}" ${canCommand ? "" : "disabled"}><strong>${escapeHtml(skill.name)}</strong><em>${escapeHtml(tacticalMagicEffectLabel(skill))}</em><small>射程 ${skill.range} · 範囲 ${skill.radius} · 疲労 ${skill.fatigue}</small></button>`;
  }).join("")}</div>${view.pendingTacticalMagicId ? `<p>青紫色のマスだけが有効対象です。盤面で対象を選ぶと「${escapeHtml(MAGIC_SKILLS[view.pendingTacticalMagicId]?.name ?? "魔法")}」を予約します。</p>` : ""}</section>` : "";
  const generatedIdentity = unit.generatedUnit && unit.unitGeneration ? `<p class="tactical-generated-unit-line"><b>生成個体 ${escapeHtml(unit.unitGeneration.fingerprint)}</b><span>${escapeHtml(unit.unitGeneration.originName)}編成 · ${escapeHtml(unit.unitGeneration.bannerName)}旗 · ${escapeHtml(unit.unitGeneration.trainingName)} · ${escapeHtml(unit.unitGeneration.fieldName)}</span></p>` : "";
  const nationalIdentity = unit.nationalDoctrineName ? `<section class="tactical-national-unit-sheet">
    <header><div><small>${unit.generatedUnit ? "GENERATED UNIT · " : ""}${escapeHtml(unit.nationName ?? "国家軍")}</small><h3>${escapeHtml(unit.nationalDoctrineName)}</h3></div><b>${escapeHtml(unit.nationalTraitName ?? "標準部隊")}</b></header>
    ${generatedIdentity}
    <p>${escapeHtml(unit.nationalTraitDescription ?? unit.nationalDoctrineSummary ?? "国家軍制に基づく部隊です。")}</p>
    <div><span><small>得意</small><strong>${escapeHtml(unit.nationalStrength ?? "標準戦闘")}</strong></span><span><small>弱点</small><strong>${escapeHtml(unit.nationalRisk ?? "特記事項なし")}</strong></span></div>
  </section>` : "";
  let actionPreview = "";
  if (unit.plannedAction && MAGIC_SKILLS[unit.plannedAction.actionId]) {
    try {
      const preview = getMagicSkillPreview(battle, unit.id, unit.plannedAction.actionId, unit.plannedAction.position);
      const affected = preview.effects.map((effect) => {
        const changes = [effect.casualties ? `損耗 ${effect.casualties}` : null, effect.restored ? `回復 ${effect.restored}` : null, effect.moraleChange ? `士気 ${effect.moraleChange > 0 ? "+" : ""}${effect.moraleChange}` : null, effect.addedStatuses.length ? `状態 ${effect.addedStatuses.join("・")}` : null].filter(Boolean).join(" / ") || "状態効果";
        return `<li><strong>${escapeHtml(effect.name)}</strong><span>${escapeHtml(changes)}</span></li>`;
      }).join("");
      actionPreview = `<section class="tactical-action-preview is-magic"><header><div><small>発動前プレビュー</small><h3>${escapeHtml(preview.name)}</h3></div><b>疲労 +${preview.fatigueCost} → ${preview.fatigueAfter}</b></header><p>対象 ${tacticalPositionLabel(preview.position)} · 射程 ${preview.distance}/${preview.range} · 効果範囲 ${preview.radius}</p>${affected ? `<ul>${affected}</ul>` : `<p>${preview.createsTerrainEffect ? "対象範囲へ地形効果を発生させます。" : "対象への数値変化はありません。"}</p>`}</section>`;
    } catch (error) {
      actionPreview = `<section class="tactical-action-preview is-invalid"><strong>この予定は実行できません</strong><p>${escapeHtml(error.message)}</p></section>`;
    }
  } else if (target) {
    const separation = Math.abs(unit.position.x - target.position.x) + Math.abs(unit.position.y - target.position.y);
    const ranged = stats.rangedAttack > 0 && separation <= stats.range && !unit.engagedWith.length;
    actionPreview = `<section class="tactical-action-preview"><header><div><small>攻撃前プレビュー</small><h3>${escapeHtml(target.name)}</h3></div><b>${ranged ? "この判定で射撃" : separation === 1 ? "この判定で白兵" : "接敵へ前進"}</b></header><p>距離 ${separation}${ranged ? ` / 射程 ${stats.range.toFixed(0)}` : ""} · 敵兵力 ${target.soldierCount} · 士気 ${Math.round(target.morale)}</p></section>`;
  }
  elements.tacticalBattleInspector.innerHTML = `
    <article class="tactical-unit-sheet">
      <button class="tactical-inspector-close" type="button" data-battle-inspector-close aria-label="情報カードをたたむ（選択は維持）" title="選択を維持したまま情報カードをたたむ">×</button>
      <header class="${unit.side === "enemy" ? "is-enemy" : ""}"><i class="tactical-sheet-icon ${visualOrder.className}" title="行動状態：${visualOrder.label}">${unit.iconUrl ? `<img src="${escapeHtml(unit.iconUrl)}" alt="${escapeHtml(unit.name)}">` : unitClass.symbol}</i><div><small>${escapeHtml(race.name)} / ${escapeHtml(unitClass.name)}</small><h2>${escapeHtml(unit.name)}</h2><b>${visualOrder.label} · ${tacticalStateLabel(unit)} · ${logistics.name}</b></div></header>
      <div class="tactical-vitals is-compact">
        <span><small>兵力</small><strong>${unit.soldierCount} / ${unit.maxSoldierCount}</strong><meter min="0" max="${unit.maxSoldierCount}" value="${unit.soldierCount}"></meter></span>
        <span><small>士気</small><strong>${Math.round(unit.morale)} · ${tacticalStateLabel(unit)}</strong><meter min="0" max="100" value="${unit.morale}"></meter></span>
        <span class="is-supply"><small>補給</small><strong>${logistics.ratio}% · ${escapeHtml(logisticsConnection)}</strong><meter min="0" max="100" value="${logistics.ratio}"></meter></span>
      </div>
      ${nationalIdentity}
      ${orders}
      ${magicOrders}
      ${actionPreview}
      <details class="tactical-unit-details">
        <summary><strong>部隊詳細</strong><small>HP・疲労・兵站・実効戦力</small></summary>
        <div class="tactical-detail-vitals">
          <span><small>HP</small><strong>${Math.round(unit.hp)} / ${unit.maxHp}</strong></span>
          <span><small>結束</small><strong>${Math.round(unit.cohesion)}</strong></span>
          <span><small>疲労</small><strong>${Math.round(unit.fatigue)}</strong></span>
          <span><small>位置</small><strong>${tacticalPositionLabel(unit.position)}</strong></span>
          <span><small>行動値</small><strong>${unit.actionInterval ?? "未確定"} · 次回 ${unit.nextActionAt ?? 0}</strong></span>
        </div>
        <section class="tactical-logistics-sheet ${logistics.connected ? "is-connected" : "is-cut"}">
          <header><div><small>補給経路</small><h3>${escapeHtml(logisticsSourceName)}</h3></div><b>${escapeHtml(logisticsRouteLabel)}</b></header>
          <div>
            <span><small>拠点備蓄</small><strong>${logistics.connected ? `${Math.round(logistics.sourceStockpile)} / ${logistics.sourceMaxStockpile}` : "—"}</strong></span>
            <span><small>毎ターン補充</small><strong>${logistics.connected ? `+${logistics.replenishment}` : "+0"}</strong></span>
            <span><small>予測消費</small><strong>-${logistics.projectedConsumption}</strong></span>
            <span><small>前回実績</small><strong>-${unit.lastSupplyConsumption ?? 0} / +${unit.lastSupplyDelivery ?? 0}</strong></span>
          </div>
          <p>${escapeHtml(logistics.connected ? "選択中の部隊までの補給路を盤面に表示しています。" : logistics.reason)}</p>
        </section>
        <section class="tactical-stats"><header><h3>実効戦力</h3></header><div class="tactical-stat-grid">
          <span><small>攻撃</small><strong>${stats.attack.toFixed(1)}</strong></span><span><small>防御</small><strong>${stats.defense.toFixed(1)}</strong></span>
          <span><small>移動</small><strong>${stats.movement.toFixed(1)}</strong></span><span><small>遠隔</small><strong>${stats.rangedAttack.toFixed(1)}</strong></span>
        </div></section>
      </details>
    </article>`;
}

function renderTacticalResult() {
  const result = view.tacticalResult;
  const open = Boolean(result && view.tacticalResultOpen);
  elements.tacticalResultScreen.classList.toggle("is-hidden", !open);
  elements.tacticalResultScreen.setAttribute("aria-hidden", String(!open));
  if (!result) {
    elements.tacticalResultContent.innerHTML = "";
    return;
  }
  const dungeonBattle = view.tacticalOrigin?.type === "dungeon";
  const personalBattle = ["personal-map", "robbery"].includes(view.tacticalOrigin?.type) || view.tacticalOrigin?.personalUnitBattle === true;
  const labels = tacticalOriginLabels();
  const sideCard = (side, label, tone) => {
    const symbol = personalBattle ? tone === "player" ? "隊" : "敵" : dungeonBattle ? tone === "player" ? "探" : "敵" : tone === "player" ? "王" : "公";
    const code = personalBattle ? tone === "player" ? "PLAYER UNIT" : "ENEMY UNIT" : dungeonBattle ? tone === "player" ? "EXPEDITION PARTY" : "DUNGEON ENCOUNTER" : tone === "player" ? "SELENE KINGDOM" : "VALKA DUCHY";
    return `
    <article class="tactical-result-army is-${tone}">
      <header><span>${symbol}</span><div><small>${code}</small><h3>${escapeHtml(label)}</h3></div><b>${side.standing} / ${side.units}${personalBattle ? "ユニット" : "部隊"}</b></header>
      <div>${personalBattle ? `<span><small>初期ユニット</small><strong>${side.units}</strong></span><span><small>戦闘継続</small><strong>${side.standing}</strong></span><span><small>戦闘不能・離脱</small><strong>${side.units - side.standing}</strong></span><span><small>合計残HP</small><strong>${side.remainingHp}</strong></span>` : `<span><small>初期兵力</small><strong>${formatValue(side.initialSoldiers)}</strong></span><span><small>残存兵</small><strong>${formatValue(side.remainingSoldiers)}</strong></span><span><small>損耗</small><strong>${formatValue(side.casualties)}</strong></span><span><small>平均補給</small><strong>${side.supply}%</strong></span>`}</div>
      <footer><span>壊滅 ${side.destroyed}</span><span>潰走 ${side.routed}</span><span>離脱 ${side.escaped}</span>${personalBattle ? `<span>${view.tacticalOrigin?.autoResolved ? "自動解決" : "手動戦闘"}</span>` : ""}</footer>
    </article>`;
  };
  const captureStatus = view.commanderDisposition ? getDispositionLabel(view.commanderDisposition) : null;
  elements.tacticalResultContent.innerHTML = `
    <article class="tactical-result-card is-${result.winner}">
      <header class="tactical-result-hero">
        <div><span>AFTER ACTION REPORT / 戦闘結果</span><h1 id="tacticalResultHeading">${escapeHtml(result.title)}</h1><p>${escapeHtml(result.battleName)} · 第${result.turn}ターン決着</p></div>
        <b>${personalBattle ? result.winner === "player" ? "VICTORY" : result.winner === "enemy" ? "DEFEAT" : "DRAW" : result.resultType === "encirclement_annihilation" ? "ENCIRCLEMENT" : result.winner === "draw" ? "DRAW" : "VICTORY"}</b>
      </header>
      <section class="tactical-result-overview">
        ${sideCard(result.player, labels.player, "player")}
        <div class="tactical-result-versus"><small>RESULT</small><strong>${result.winner === "player" ? "勝" : result.winner === "enemy" ? "敗" : "分"}</strong><span>${personalBattle ? `${result.turn}ターン` : `渡河 ${result.crossings}回`}</span></div>
        ${sideCard(result.enemy, labels.enemy, "enemy")}
      </section>
      ${personalBattle ? `<section class="tactical-encirclement-report"><header><div><small>PERSONAL UNIT BATTLE</small><h2>${result.winner === "player" ? "敵ユニット群を退けました" : result.winner === "enemy" ? "探索パーティーが撤退します" : "双方が戦闘を中断しました"}</h2></div><b>${result.player.units} UNIT : ${result.enemy.units} UNIT</b></header><div><span>主人公と同行者は各1ユニット</span><span>敵ユニット数は遭遇内容によって変化</span><span>${view.tacticalOrigin?.continuedFromManual ? `第${view.tacticalOrigin.manualTurns}ターンまでの手動成果から自動継続` : view.tacticalOrigin?.autoResolved ? "同じ戦闘処理による自動解決" : "手動で進行した戦闘"}</span></div><div class="personal-result-members">${result.player.members.map((member) => `<article><strong>${escapeHtml(member.name)}</strong><span>HP ${member.remainingHp}/${member.maxHp}</span><b>${escapeHtml(tacticalStateLabel(member.state))}</b></article>`).join("")}</div></section>` : dungeonBattle ? `<section class="tactical-encirclement-report"><header><div><small>DUNGEON EXPEDITION</small><h2>${result.winner === "player" ? "探索を再開できます" : "探索隊は撤退します"}</h2></div><b>${escapeHtml(view.tacticalOrigin.dungeonName)}</b></header><div><span>戦術戦闘の損耗をHPへ反映</span><span>勝利時は戦利品を自動回収</span><span>敗北・引き分け時は獲得済み戦利品を保持</span></div></section>` : `<section class="tactical-encirclement-report ${result.encirclement.complete ? "is-complete" : ""}"><header><div><small>ENCIRCLEMENT ASSESSMENT</small><h2>${result.encirclement.complete ? "完全包囲を確認" : "通常戦果"}</h2></div><b>${result.encirclement.complete ? "全退路遮断" : "捕縛条件未達"}</b></header><div>${result.encirclement.reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div></section><section class="tactical-capture-result ${result.capture.eligible ? "is-captured" : ""}">${result.capture.commanderIconUrl ? `<img src="${escapeHtml(result.capture.commanderIconUrl)}" alt="${escapeHtml(result.capture.commanderName)}">` : `<i>${result.capture.eligible ? "縛" : "退"}</i>`}<div><small>ENEMY COMMANDER</small><h2>${result.capture.eligible ? `${escapeHtml(result.capture.commanderName)}を捕縛` : "敵将捕縛なし"}</h2><p>${escapeHtml(result.capture.reason)}</p>${captureStatus ? `<b>現在の処遇：${escapeHtml(captureStatus)}</b>` : ""}</div>${result.capture.eligible ? '<button type="button" data-result-action="disposition">戦後処遇局へ</button>' : ""}</section>`}
      <footer class="tactical-result-actions">
        <button type="button" data-result-action="battlefield">戦場を確認</button>
        ${["dungeon", "personal-map"].includes(view.tacticalOrigin?.type) && result.winner !== "player" ? '<button type="button" class="is-primary" data-result-action="recover">村の治療所へ帰還</button>' : ""}
        <button type="button" data-result-action="exit">${escapeHtml(labels.exit)}</button>
      </footer>
    </article>`;
}

function renderCommanderDisposition() {
  const disposition = view.commanderDisposition;
  const open = Boolean(disposition && view.commanderDispositionOpen);
  elements.commanderDispositionScreen.classList.toggle("is-hidden", !open);
  elements.commanderDispositionScreen.setAttribute("aria-hidden", String(!open));
  if (!disposition) {
    elements.commanderDispositionContent.innerHTML = "";
    return;
  }
  const active = disposition.status === DISPOSITION_STATUSES.PERSUADING;
  const progress = Math.round(disposition.persuasionProgress / disposition.persuasionTarget * 100);
  const approachButtons = Object.values(PERSUASION_APPROACHES).map((approach) => `
    <button type="button" data-persuasion-approach="${approach.id}"><b>${approach.name}</b><small>1か月 · ${escapeHtml(approach.description)}</small>${disposition.profile.preferredApproach === approach.id ? "<em>特性適合</em>" : ""}</button>`).join("");
  elements.commanderDispositionContent.innerHTML = `
    <article class="commander-disposition-card is-${disposition.status.toLowerCase()}">
      <header>
        <div><span>PRISONER AFFAIRS / 戦後処遇局</span><h1 id="commanderDispositionHeading">捕虜将官の処遇</h1><p>戦闘指揮とは分離された戦後行政案件です。</p></div>
        <button type="button" data-disposition-action="back">戦果報告へ戻る</button>
      </header>
      <div class="commander-disposition-layout">
        <section class="commander-prisoner-profile">
          <div class="commander-prisoner-portrait">${disposition.commanderIconUrl ? `<img src="${escapeHtml(disposition.commanderIconUrl)}" alt="${escapeHtml(disposition.commanderName)}">` : "将"}</div>
          <div><small>CAPTURED COMMANDER</small><h2>${escapeHtml(disposition.commanderName)}</h2><strong>${escapeHtml(getDispositionLabel(disposition))}</strong><p>${escapeHtml(disposition.profile.reason)}</p></div>
          <div class="commander-trait-list">${disposition.traits.map((trait) => `<span>${escapeHtml(trait)}</span>`).join("") || "<span>特性不詳</span>"}</div>
          <dl><div><dt>意志</dt><dd>${disposition.profile.resolve}</dd></div><div><dt>忠誠</dt><dd>${disposition.profile.loyalty}</dd></div><div><dt>経過</dt><dd>${disposition.elapsedMonths}か月</dd></div><div><dt>帰順後</dt><dd>${escapeHtml(disposition.profile.recruitmentRole)}</dd></div></dl>
        </section>
        <main class="commander-disposition-workspace">
          <section class="commander-disposition-status">
            <header><div><small>CASE STATUS</small><h2>${escapeHtml(getDispositionLabel(disposition))}</h2></div><b>${active ? `${disposition.persuasionProgress} / ${disposition.persuasionTarget}` : "処遇確定"}</b></header>
            ${active ? `<div class="commander-persuasion-meter"><i style="width:${progress}%"></i></div><p>説得方針を選ぶたびに1か月が経過します。将官の特性に合う方針ほど交渉が進展します。</p>` : `<p class="commander-disposition-conclusion">${escapeHtml(disposition.log.at(-1)?.message ?? "処遇が確定しました。")}</p>`}
          </section>
          ${active ? `<section class="commander-persuasion-actions"><header><small>MONTHLY APPROACH</small><h2>今月の説得方針</h2></header><div>${approachButtons}</div></section>` : ""}
          <section class="commander-disposition-log"><header><small>CASE RECORD</small><h2>処遇記録</h2></header><div>${disposition.log.slice().reverse().map((entry) => `<p><b>${entry.month === 0 ? "捕縛時" : `${entry.month}か月目`}</b><span>${escapeHtml(entry.message)}</span></p>`).join("")}</div></section>
        </main>
      </div>
      ${active ? '<footer><button type="button" data-disposition-action="intern">長期収監を確定</button><button type="button" data-disposition-action="release">宣誓・身代金付きで釈放</button></footer>' : ""}
    </article>`;
}

function renderTacticalPostBattle() {
  renderTacticalResult();
  renderCommanderDisposition();
  const overlayOpen = Boolean(view.tacticalResultOpen || view.commanderDispositionOpen);
  elements.tacticalBattleScreen.inert = overlayOpen;
}

function positionTacticalInspector() {
  if (!view.tacticalBattle || elements.tacticalBattleInspector.classList.contains("is-hidden")) return;
  const selectedUnit = getBattleUnit(view.tacticalBattle, view.selectedTacticalUnitId);
  const selectedCommander = getBattleCommander(view.tacticalBattle, view.selectedTacticalCommanderId);
  const selectedFortification = getBattleFortification(view.tacticalBattle, view.selectedTacticalFortificationId);
  const tile = [...elements.tacticalBattleMap.querySelectorAll("[data-battle-tile]")].find((candidate) => (
    selectedUnit
      ? candidate.dataset.battleUnit === selectedUnit.id
      : selectedCommander
        ? candidate.dataset.battleCommander === selectedCommander.id
        : candidate.dataset.battleFortification === selectedFortification?.id
  ));
  if (!tile) return;
  const layout = elements.tacticalBattleInspector.parentElement;
  const layoutRect = layout.getBoundingClientRect();
  const tileRect = tile.getBoundingClientRect();
  const cardRect = elements.tacticalBattleInspector.getBoundingClientRect();
  const margin = 12;
  const limit = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  let side = "right";
  let left = tileRect.right - layoutRect.left + margin;
  if (left + cardRect.width > layoutRect.width - margin) {
    side = "left";
    left = tileRect.left - layoutRect.left - cardRect.width - margin;
  }
  left = limit(left, margin, Math.max(margin, layoutRect.width - cardRect.width - margin));
  const top = limit(tileRect.top - layoutRect.top - 28, margin, Math.max(margin, layoutRect.height - cardRect.height - margin));
  const arrowY = limit(tileRect.top + tileRect.height / 2 - layoutRect.top - top, 20, Math.max(20, cardRect.height - 20));
  elements.tacticalBattleInspector.style.left = `${Math.round(left)}px`;
  elements.tacticalBattleInspector.style.top = `${Math.round(top)}px`;
  elements.tacticalBattleInspector.style.setProperty("--tactical-tooltip-arrow-y", `${Math.round(arrowY)}px`);
  elements.tacticalBattleInspector.classList.toggle("is-left", side === "left");
}

function renderTacticalBattle() {
  const battle = view.tacticalBattle;
  elements.tacticalBattleScreen.classList.toggle("is-hidden", !battle);
  if (!battle) {
    if (elements.tacticalCommandGuide) elements.tacticalCommandGuide.innerHTML = "";
    if (elements.tacticalExecutePreview) elements.tacticalExecutePreview.innerHTML = "";
    renderTacticalPostBattle();
    return;
  }
  const dungeonBattle = view.tacticalOrigin?.type === "dungeon";
  const adventureBattle = ["dungeon", "personal-map"].includes(view.tacticalOrigin?.type);
  const robberyBattle = view.tacticalOrigin?.type === "robbery";
  const militaryCareerBattle = view.tacticalOrigin?.type === "military-career";
  const labels = tacticalOriginLabels();
  elements.tacticalBattleTitle.textContent = battle.name;
  elements.tacticalBattleReset.textContent = dungeonBattle ? "探索隊を再編成" : view.tacticalOrigin?.type === "personal-map" ? "個人戦をやり直す" : robberyBattle ? "強盗戦闘は再編成不可" : militaryCareerBattle ? "受命済み編成は変更不可" : "再編成";
  elements.tacticalBattleReset.disabled = robberyBattle || militaryCareerBattle;
  elements.tacticalBattleSkip.hidden = !adventureBattle || robberyBattle || militaryCareerBattle;
  elements.tacticalMoreActions.hidden = adventureBattle || robberyBattle || militaryCareerBattle;
  elements.tacticalBattleExit.textContent = robberyBattle ? (battle.winner ? "戦果を確定" : "決着後に戻る") : militaryCareerBattle ? (battle.winner ? "軍務結果を確定" : "決着後に戻る") : adventureBattle ? "遭遇地点へ戻る" : "開発メニュー";
  elements.tacticalBattleExit.disabled = (robberyBattle || militaryCareerBattle) && !battle.winner;
  elements.tacticalPlayerLegend.textContent = labels.player;
  elements.tacticalEnemyLegend.textContent = labels.enemy;
  renderTacticalSummary(battle);
  renderTacticalCommandGuide(battle);
  renderTacticalDeployment(battle);
  renderTacticalMap(battle);
  const selectedUnit = getBattleUnit(battle, view.selectedTacticalUnitId);
  const selectedCommander = getBattleCommander(battle, view.selectedTacticalCommanderId);
  const selectedFortification = getBattleFortification(battle, view.selectedTacticalFortificationId);
  const inspectorOpen = Boolean(selectedUnit || selectedCommander || selectedFortification) && !view.tacticalInspectorDismissed;
  elements.tacticalBattleInspector.classList.toggle("is-hidden", !inspectorOpen);
  elements.tacticalBattleInspector.setAttribute("aria-hidden", String(!inspectorOpen));
  if (selectedUnit) renderTacticalUnitInspector(battle, selectedUnit);
  else if (selectedCommander) renderTacticalCommanderInspector(battle, selectedCommander);
  else if (selectedFortification) renderTacticalFortificationInspector(battle, selectedFortification);
  else elements.tacticalBattleInspector.innerHTML = "";
  if (inspectorOpen) positionTacticalInspector();
  elements.tacticalBattleLog.innerHTML = battle.log.slice(-6).reverse().map((entry) => `<p title="${escapeHtml(entry.message)}"><b>T${entry.turn} ${escapeHtml(PHASE_LABELS[entry.phase] ?? entry.phase)}</b>${escapeHtml(entry.message)}</p>`).join("");
  const executeButton = elements.tacticalBattleScreen.querySelector('[data-battle-action="execute"]');
  const activePlayerUnits = battle.units.filter((unit) => unit.side === "player" && !["ROUTED", "DESTROYED", "ESCAPED"].includes(unit.state));
  const directlyPlanned = activePlayerUnits.filter((unit) => unit.plannedAction || unit.targetId || unit.plannedPosition || Object.keys(unit.playerInstructions ?? {}).length).length;
  elements.tacticalExecutePreview.innerHTML = `<small>次の判定</small><strong>${directlyPlanned}隊へ指示 · ${Math.max(0, activePlayerUnits.length - directlyPlanned)}隊は現在命令で自律</strong>`;
  executeButton.textContent = battle.winner ? "決着済み" : "命令を実行";
  executeButton.disabled = tacticalEffectsPlaying || Boolean(battle.winner);
  elements.tacticalResultButton.hidden = !battle.winner;
  elements.tacticalResultButton.disabled = tacticalEffectsPlaying;
  renderTacticalPostBattle();
}

function advanceTacticalBattle() {
  if (!view.tacticalBattle || view.tacticalBattle.winner || tacticalEffectsPlaying) return;
  const previousBattle = view.tacticalBattle;
  const nextBattle = executeBattleTurn(previousBattle);
  const effects = buildTacticalEffects(previousBattle, nextBattle);
  view.tacticalBattle = nextBattle;
  view.pendingTacticalMagicId = null;
  if (nextBattle.winner && !view.tacticalResult) prepareTacticalResult({ open: false });
  const selectedUnit = getBattleUnit(nextBattle, view.selectedTacticalUnitId);
  const selectedCommander = getBattleCommander(nextBattle, view.selectedTacticalCommanderId);
  const selectedFortification = getBattleFortification(nextBattle, view.selectedTacticalFortificationId);
  if (!selectedUnit && !selectedCommander && !selectedFortification) {
    view.selectedTacticalUnitId = null;
    view.selectedTacticalCommanderId = null;
    view.selectedTacticalFortificationId = null;
    view.tacticalInspectorDismissed = false;
  }
  renderTacticalBattle();
  playTacticalBattleEffects(effects, nextBattle, () => {
    if (!nextBattle.winner || view.tacticalBattle !== nextBattle) return;
    view.tacticalResultOpen = true;
    renderTacticalPostBattle();
  });
}

function handleTacticalTile(button) {
  const battle = view.tacticalBattle;
  if (!battle) return;
  const [x, y] = button.dataset.battleTile.split(",").map(Number);
  const clickedUnit = getBattleUnit(battle, button.dataset.battleUnit);
  const clickedCommander = getBattleCommander(battle, button.dataset.battleCommander);
  const clickedFortification = getBattleFortification(battle, button.dataset.battleFortification);
  const selectedUnit = getBattleUnit(battle, view.selectedTacticalUnitId);
  try {
    if (selectedUnit?.side === "player" && view.pendingTacticalMagicId) {
      view.tacticalBattle = planUnitAbility(battle, selectedUnit.id, view.pendingTacticalMagicId, { x, y });
      view.pendingTacticalMagicId = null;
      view.tacticalInspectorDismissed = false;
      renderTacticalBattle();
      return;
    }
    if (clickedUnit) {
      if (selectedUnit?.id === clickedUnit.id) {
        if (view.tacticalInspectorDismissed) view.tacticalInspectorDismissed = false;
        else {
          view.selectedTacticalUnitId = null;
          view.selectedTacticalCommanderId = null;
          view.selectedTacticalFortificationId = null;
        }
      } else if (selectedUnit?.side === "player" && clickedUnit.side !== selectedUnit.side) {
        view.tacticalBattle = planUnitTarget(battle, selectedUnit.id, clickedUnit.id);
      } else {
        view.pendingTacticalMagicId = null;
        view.selectedTacticalUnitId = clickedUnit.id;
        view.selectedTacticalCommanderId = null;
        view.selectedTacticalFortificationId = null;
        view.tacticalInspectorDismissed = false;
      }
    } else if (clickedCommander) {
      view.pendingTacticalMagicId = null;
      const sameCommander = view.selectedTacticalCommanderId === clickedCommander.id;
      if (sameCommander && view.tacticalInspectorDismissed) view.tacticalInspectorDismissed = false;
      else {
        view.selectedTacticalCommanderId = sameCommander ? null : clickedCommander.id;
        view.selectedTacticalUnitId = null;
        view.selectedTacticalFortificationId = null;
        view.tacticalInspectorDismissed = false;
      }
    } else if (clickedFortification) {
      view.pendingTacticalMagicId = null;
      const sameFortification = view.selectedTacticalFortificationId === clickedFortification.id;
      if (sameFortification && view.tacticalInspectorDismissed) view.tacticalInspectorDismissed = false;
      else {
        view.selectedTacticalFortificationId = sameFortification ? null : clickedFortification.id;
        view.selectedTacticalUnitId = null;
        view.selectedTacticalCommanderId = null;
        view.tacticalInspectorDismissed = false;
      }
    } else if (view.selectedTacticalCommanderId) {
      view.tacticalBattle = planCommanderMove(battle, view.selectedTacticalCommanderId, { x, y });
    } else if (selectedUnit?.side === "player") {
      view.tacticalBattle = planUnitMove(battle, selectedUnit.id, { x, y });
    }
  } catch (error) {
    showToast(error.message, "danger");
  }
  renderTacticalBattle();
}

function renderAdventureScreen() {
  clearTimeout(adventureAdvanceTimer);
  adventureAdvanceTimer = null;
  const run = state.adventure.activeRun;
  const visible = Boolean(!view.launchOpen && view.adventureOpen && run && !view.battlePreparation && !view.tacticalBattle && !view.tacticalResultOpen && !view.commanderDispositionOpen);
  elements.adventureScreen.classList.toggle("is-hidden", !visible);
  elements.adventureScreen.setAttribute("aria-hidden", String(!visible));
  if (!visible) {
    elements.adventureContent.innerHTML = "";
    return;
  }
  const archetype = DUNGEON_ARCHETYPES[run.dungeonType];
  const personalMapEncounter = run.mode === "personal-map";
  const personalUnitBattle = personalMapEncounter || run.combatScale === "personal-units";
  const progress = Math.min(100, run.step / run.totalSteps * 100);
  const party = state.player?.villageLife?.party?.filter((member) => member.active !== false && member.alive !== false) ?? [];
  const loot = run.loot.map((item) => `<li><i>${escapeHtml(item.icon)}</i><span><strong>${escapeHtml(item.name)}</strong><small>自動取得済み</small></span><b>×${item.quantity}</b></li>`).join("");
  const battle = run.combat;
  const battlePreview = run.phase === "battle" ? getDungeonBattlePreview(state) : null;
  let phaseMarkup = "";
  if (run.phase === "exploring") {
    phaseMarkup = `<section class="adventure-auto-state"><span class="adventure-compass" aria-hidden="true"><i></i></span><small>AUTO EXPLORATION</small><h2>探索隊が自動で進行中</h2><p>安全確認、採取、戦利品の収納を自動で行っています。敵と遭遇した場合だけ戦闘操作へ切り替わります。</p></section>`;
  } else if (run.phase === "battle" && battle) {
    const previewMarkup = battlePreview ? `<section class="adventure-battle-preview is-${battlePreview.danger.id}">
      <header><div><small>${battlePreview.informationKnown ? "PURCHASED INTELLIGENCE / 情報確認済み" : "FIELD ESTIMATE / 現地推定"}</small><strong>${battlePreview.danger.label}</strong></div><b>${battlePreview.forecastWinner ? `自動進行予測：${battlePreview.forecastWinner === "player" ? "自軍勝利" : battlePreview.forecastWinner === "enemy" ? "敵軍勝利" : "決着なし"}${battlePreview.forecastTurns ? `・約${battlePreview.forecastTurns}ターン` : ""}` : `戦力評価 約${battlePreview.expectedWinRate}%`}</b></header>
      <div><article><small>自軍 ${battlePreview.playerUnits.length} UNIT</small><p>${battlePreview.playerUnits.map((unit) => `${escapeHtml(unit.name)}［${escapeHtml(unit.role)}・HP ${unit.hp}/${unit.maxHp}］`).join("<br>")}</p></article><article><small>敵軍 ${battlePreview.enemyUnits.length} UNIT</small><p>${battlePreview.enemyUnits.map((unit) => `${escapeHtml(unit.name)}［${escapeHtml(unit.role)}・HP ${unit.hp}/${unit.maxHp}］`).join("<br>")}</p></article></div>
      <footer>${battlePreview.canRetreat ? "戦闘を選ばず入口へ撤退できます。自動解決でも同じ戦闘ターンを処理します。" : "退路なし"}</footer>
    </section>` : "";
    phaseMarkup = `<section class="adventure-battle-state">
      <div class="adventure-enemy"><i>${escapeHtml(battle.enemySymbol)}</i><small>ENCOUNTER</small><h2>${escapeHtml(battle.enemyName)}</h2><div><span style="width:${battle.enemyHp / battle.enemyMaxHp * 100}%"></span></div><b>HP ${battle.enemyHp} / ${battle.enemyMaxHp}</b></div>
      ${previewMarkup}
      <div class="adventure-battle-actions adventure-tactical-handoff"><p><small>${personalUnitBattle ? "PERSONAL UNIT BATTLE" : "TACTICAL ENGINE"}</small><strong>${personalUnitBattle ? "各人物・各敵を1ユニットとして戦います" : "既存の戦闘準備・戦術戦闘システムを使用します"}</strong><span>${personalUnitBattle ? "主人公と同行中の仲間はそれぞれ自軍1ユニットになります。敵側も遭遇内容に応じて複数ユニットになる場合があります。戦場・移動・攻撃・士気・退却は国家戦闘と共通です。" : "参陣者、陣形、初期配置、兵站を確定して戦闘へ進みます。手動戦闘を行わない場合も、同じターン処理で勝敗を計算します。"}</span></p><button type="button" data-open-dungeon-tactical><b>${personalUnitBattle ? "自分で戦う" : "戦術戦闘を起動"}</b><small>${personalUnitBattle ? "パーティー対遭遇敵の戦場へ" : "正式な戦闘前編成へ"}</small></button><button type="button" class="is-skip" data-skip-adventure-battle><b>戦闘を自動解決</b><small>裏で戦闘を実行し、結果を表示</small></button></div>
      <button type="button" class="adventure-withdraw-button" data-withdraw-adventure-battle>戦わず入口へ撤退</button>
    </section>`;
  } else if (run.phase === "complete") {
    phaseMarkup = personalMapEncounter
      ? `<section class="adventure-finish-state"><i>勝利</i><small>ENCOUNTER CLEARED</small><h2>周辺の安全を確保</h2><p>${escapeHtml(battle.enemyName)}を退け、${run.loot.length}種の戦利品を回収しました。</p><button type="button" data-close-adventure>個人マップへ戻る</button></section>`
      : `<section class="adventure-finish-state"><i>踏破</i><small>DUNGEON CLEARED</small><h2>探索完了</h2><p>${run.skippedBattles ? `戦闘${run.skippedBattles}回をスキップし、` : "戦闘を突破し、"}${run.loot.length}種の戦利品を持ち帰りました。</p><button type="button" data-close-adventure>地方地図へ戻る</button></section>`;
  } else {
    phaseMarkup = `<section class="adventure-finish-state is-failed"><i>撤退</i><small>${personalMapEncounter ? "ENCOUNTER WITHDRAWN" : "EXPEDITION WITHDRAWN"}</small><h2>探索隊は撤退した</h2><p>入口までの帰還路と収納袋を確保していたため、獲得済みの戦利品は保持されています。治療後に再挑戦できます。</p><button type="button" class="is-primary" data-return-recovery>村の治療所へ帰還</button><button type="button" data-close-adventure>${personalMapEncounter ? "個人マップ" : "地方地図"}へ戻る</button></section>`;
  }
  elements.adventureScreen.style.setProperty("--adventure-art", `url('${ADVENTURE_ART[run.dungeonType]}')`);
  elements.adventureContent.innerHTML = `<main class="adventure-shell">
    <header><div><small>${personalMapEncounter ? "PERSONAL MAP ENCOUNTER" : `${escapeHtml(archetype.name)}型ダンジョン`} / ${escapeHtml(run.regionId)}</small><h1 id="adventureTitle">${escapeHtml(run.dungeonName)}</h1></div><span>${run.phase === "battle" ? `戦闘 ${battle.turn}` : run.phase === "complete" ? (personalMapEncounter ? "安全確保" : "踏破済み") : run.phase === "failed" ? "撤退" : `深度 ${run.step + 1} / ${run.totalSteps}`}</span></header>
    <div class="adventure-progress"><i style="width:${progress}%"></i></div>
    <div class="adventure-layout">
      <section class="adventure-stage">${phaseMarkup}<ol class="adventure-log">${run.log.map((entry) => `<li class="is-${entry.tone}"><i></i><span>${escapeHtml(entry.message)}</span></li>`).join("")}</ol></section>
      <aside><section class="adventure-party-status"><header><small>EXPEDITION PARTY</small><h2>探索隊</h2></header><div><article><i>${escapeHtml(state.player.name.slice(0, 1))}</i><span><strong>${escapeHtml(state.player.name)}</strong><small>HP ${run.playerHp} / ${run.playerMaxHp}</small></span></article>${party.map((member) => `<article><i>${escapeHtml(member.name.slice(0, 1))}</i><span><strong>${escapeHtml(member.name)}</strong><small>Lv.${member.level} ${escapeHtml(member.role ?? "冒険者")}</small></span></article>`).join("")}</div></section><section class="adventure-loot"><header><small>AUTO LOOT</small><h2>戦利品</h2></header><ul>${loot || "<li class=\"is-empty\">まだ戦利品はありません</li>"}</ul></section></aside>
    </div>
  </main>`;
  if (run.phase === "exploring") {
    adventureAdvanceTimer = setTimeout(() => {
      try {
        const next = advanceDungeonRun(state);
        commit(next, "", null);
      } catch (error) {
        showToast(error.message, "danger");
      }
    }, 900);
  }
}

function render() {
  renderLaunchScreen();
  renderWorldArrival();
  renderBattlePreparation();
  renderTacticalBattle();
  renderAdventureScreen();
  const adventureVisible = Boolean(view.adventureOpen && state.adventure?.activeRun);
  if (
    view.launchOpen
    || view.battlePreparation
    || view.tacticalBattle
    || view.tacticalResultOpen
    || view.commanderDispositionOpen
    || adventureVisible
  ) return;
  renderAnalysisMode();
  renderCampaignBar();
  renderResources();
  renderTimeControls();
  renderTabs();
  renderLeftPanel();
  renderAlerts();
  renderMap();
  renderSelection();
  renderTileDetail();
  renderCityWorkspace();
  renderBackMenu();
  renderOutliner();
  renderTicker();
  renderWarCouncil();
  renderAssignmentModal();
  renderEventModal();
  renderOfflineReport();
  renderEquipmentUpgradePrompt();
  renderGuideModal();
  renderEndingModal();
  renderResetModal();
  renderCharacterDetailModal();
}

function renderPanelFromTop() {
  render();
  elements.leftPanel.scrollTop = 0;
}

function openCommandAssignment(commandId, cityId, townId = null) {
  view.assignmentOpen = true;
  view.assignmentMode = "command";
  view.pendingCommandId = commandId;
  view.pendingCityId = cityId;
  view.pendingTownId = townId;
  renderAssignmentModal();
}

function queuePlannedOrder(specification, message) {
  try {
    const next = queueOrder(state, specification);
    commit(next, message);
    return true;
  } catch (error) {
    if (error.code === "FORCE_REQUIRED") {
      const accepted = window.confirm(`通常の統治力を${error.forcedPoints}点超えます。強行命令として予約しますか？\n\n当該命令の失敗率 ${error.failureChance}%\n全都市：腐敗 +${error.corruptionPenalty.toFixed(1)} / 民心 -${error.supportPenalty.toFixed(1)}\n翌月統治力 -${error.governancePenalty}\n\n失敗しても費用と統治力は消費します。`);
      if (!accepted) return false;
      try {
        const next = queueOrder(state, { ...specification, force: true });
        commit(next, `${message}（強行命令）`);
        return true;
      } catch (forcedError) {
        showToast(forcedError.message, "danger");
        return false;
      }
    }
    showToast(error.message, "danger");
    return false;
  }
}

function closeAssignment() {
  view.assignmentOpen = false;
  view.assignmentMode = null;
  view.pendingCommandId = null;
  view.pendingCityId = null;
  view.pendingTownId = null;
  view.pendingForceRole = null;
  renderAssignmentModal();
}

function followGuidance(button) {
  view.guideOpen = false;
  const action = button.dataset.guideAction;
  if (action === "open_council") {
    view.panel = "council";
    view.scale = "country";
    renderPanelFromTop();
    return;
  }
  if (action === "open_command") {
    openCommandAssignment(button.dataset.commandId, button.dataset.cityId, button.dataset.townId ?? null);
    renderGuideModal();
    return;
  }
  if (action === "open_town") {
    view.selectedTownId = button.dataset.townId ?? WORLD.provinces[button.dataset.cityId ?? WORLD.nation.capital].villages[0];
    view.selectedCityId = WORLD.villages[view.selectedTownId].province;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.townTab = "commands";
    view.scale = "village";
    renderPanelFromTop();
    return;
  }
  if (action === "open_city") {
    view.panel = "city";
    view.selectedCityId = button.dataset.cityId ?? WORLD.nation.capital;
    view.selectedType = "province";
    view.selectedId = view.selectedCityId;
    view.scale = "city";
    renderPanelFromTop();
    return;
  }
  if (action === "open_spending") {
    view.panel = "spending";
    view.spendingCategoryId = "social_security";
    view.spendingCityId = WORLD.nation.capital;
    view.scale = "country";
    renderPanelFromTop();
    return;
  }
  if (action === "open_military") {
    view.panel = "military";
    view.scale = "country";
    view.selectedType = "country";
    view.selectedId = "valka";
    view.selectedCountryId = "valka";
    renderPanelFromTop();
    return;
  }
  if (action === "open_diplomacy" || action === "open_aftermath") {
    view.panel = "diplomacy";
    view.scale = "country";
    view.selectedType = "country";
    view.selectedId = "valka";
    view.selectedCountryId = "valka";
    renderPanelFromTop();
    return;
  }
  if (action === "open_war_council") {
    view.panel = "diplomacy";
    view.scale = "country";
    view.selectedType = "country";
    view.selectedId = "valka";
    view.selectedCountryId = "valka";
    view.warCouncilOpen = true;
    renderPanelFromTop();
    return;
  }
  if (action === "end_month") {
    renderGuideModal();
    endMonth();
    return;
  }
  if (action === "resolve_event") {
    renderGuideModal();
    renderEventModal();
    return;
  }
  if (action === "open_reports") {
    if (state.campaign?.ending && state.lastViewedEndingId !== state.campaign.ending.id) {
      view.endingOpen = true;
      renderEndingModal();
      return;
    }
    view.panel = "city";
    view.selectedCityId = WORLD.nation.capital;
    view.selectedType = "province";
    view.selectedId = view.selectedCityId;
    view.cityTab = "reports";
    view.scale = "city";
    const latestReport = state.monthlyReports[0];
    if (latestReport && state.lastViewedReportId !== latestReport.id) {
      commit(acknowledgeMonthReport(state, latestReport.id), "月次報告を確認しました。次月の方針を決められます。", "ui");
      elements.leftPanel.scrollTop = 0;
    } else {
      renderPanelFromTop();
    }
  }
}

function playNavigationCue(event) {
  const target = event.target.closest("button, [role='button']");
  if (!target || target.disabled || target.closest("#audioToggle")) return;
  if (target.matches(".modal-close, [data-close-guide], [data-close-tile]")) {
    audio.play("cancel");
    return;
  }
  if (target.matches([
    "[data-open-guide]",
    "[data-back-menu-route]",
    "[data-guide-action]",
    "[data-panel]",
    "[data-enter-village]",
    "[data-village-facility]",
    "[data-village-action]",
    "[data-leave-village]",
    "[data-open-village-administration]",
    "[data-central-decision-action]",
    "[data-national-reform-system]",
    "[data-start-national-reform]",
    "[data-history-policy]",
    "[data-leviathan-policy]",
    "[data-world-endgame-action]",
    "[data-open-specialist-ledger]",
    "[data-spending-category]",
    "[data-spending-city]",
    "[data-world-mode]",
    "[data-generated-map-move-region]",
    "[data-generated-travel-mode]",
    "[data-generated-travel-preference]",
    "[data-generated-map-move-confirm]",
    "[data-generated-map-move-cancel]",
    "[data-generated-region-id]",
    "[data-generated-map-scale]",
    "[data-generated-map-legend-toggle]",
    "[data-world-guide-toggle]",
    "[data-world-filter]",
    "[data-generated-nation]",
    "[data-generated-statistics-nation]",
    "[data-statistics-nation]",
    "[data-world-nation]",
    "[data-world-people]",
    "[data-select-city]",
    "[data-select-town]",
    "[data-open-town-command]",
    "[data-city-tab]",
    "[data-town-tab]",
    "[data-select-facility]",
    "[data-command]",
    "[data-force-role]",
    "[data-map-mode]",
    "[data-scale]",
    "[data-war-map-view]",
    "[data-war-region]",
    "[data-war-tile]",
    "[data-diplomacy-country]",
    "[data-border-settlement]",
    "[data-aftermath-policy]",
    "[data-aftermath-choice]",
    "[data-officer-demand-response]",
    "[data-place-id]",
    "[data-open-war]",
    "[data-objective]",
  ].join(", "))) audio.play("ui");
}

audio.subscribe(renderAudioControl);
elements.generatedWorldScroll?.addEventListener("pointerdown", (event) => {
  if (view.generatedTravel || event.button !== 0 || event.target.closest("button, input, select, a, .generated-region-move-confirmation")) return;
  const copy = event.target.closest(".generated-world-copy");
  if (!copy) return;
  generatedMapPanGesture = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false, copy };
  elements.generatedWorldScroll.setPointerCapture(event.pointerId);
  elements.generatedWorldScroll.classList.add("is-panning");
});
elements.generatedWorldScroll?.addEventListener("pointermove", (event) => {
  if (!generatedMapPanGesture || generatedMapPanGesture.pointerId !== event.pointerId) return;
  generatedMapPanGesture.dx = event.clientX - generatedMapPanGesture.startX;
  generatedMapPanGesture.dy = event.clientY - generatedMapPanGesture.startY;
  generatedMapPanGesture.moved ||= Math.hypot(generatedMapPanGesture.dx, generatedMapPanGesture.dy) > 6;
  if (!generatedMapPanGesture.moved) return;
  event.preventDefault();
  generatedMapPanGesture.copy.style.transform = `translate3d(${generatedMapPanGesture.dx}px, ${generatedMapPanGesture.dy}px, 0)`;
});
function finishGeneratedMapPan(event) {
  const gesture = generatedMapPanGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  gesture.copy.style.transform = "";
  elements.generatedWorldScroll.classList.remove("is-panning");
  generatedMapPanGesture = null;
  if (!gesture.moved) return;
  const rect = elements.generatedWorldScroll.getBoundingClientRect();
  const viewportWidth = Number(gesture.copy.dataset.viewportWidth) || 1;
  const viewportHeight = Number(gesture.copy.dataset.viewportHeight) || 1;
  view.generatedPanX = (Number(view.generatedPanX) || 0) - gesture.dx / Math.max(1, rect.width) * viewportWidth;
  view.generatedPanY = (Number(view.generatedPanY) || 0) - gesture.dy / Math.max(1, rect.height) * viewportHeight;
  suppressGeneratedMapClickUntil = Date.now() + 250;
  renderGeneratedWorldMapLayer();
}
elements.generatedWorldScroll?.addEventListener("pointerup", finishGeneratedMapPan);
elements.generatedWorldScroll?.addEventListener("pointercancel", finishGeneratedMapPan);
document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-drag-generated-confirm]");
  if (!handle || event.target.closest("button") || event.button !== 0) return;
  const windowElement = handle.closest(".generated-region-move-confirmation");
  const boundary = windowElement?.parentElement;
  if (!windowElement || !boundary) return;
  const rect = windowElement.getBoundingClientRect();
  const bounds = boundary.getBoundingClientRect();
  floatingWindowGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: Number(view.generatedConfirmOffsetX) || 0,
    originY: Number(view.generatedConfirmOffsetY) || 0,
    minDx: bounds.left - rect.left,
    maxDx: bounds.right - rect.right,
    minDy: bounds.top - rect.top,
    maxDy: bounds.bottom - rect.bottom,
    windowElement,
  };
  handle.setPointerCapture(event.pointerId);
  windowElement.classList.add("is-dragging");
});
document.addEventListener("pointermove", (event) => {
  const gesture = floatingWindowGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  event.preventDefault();
  const dx = Math.min(gesture.maxDx, Math.max(gesture.minDx, event.clientX - gesture.startX));
  const dy = Math.min(gesture.maxDy, Math.max(gesture.minDy, event.clientY - gesture.startY));
  view.generatedConfirmOffsetX = gesture.originX + dx;
  view.generatedConfirmOffsetY = gesture.originY + dy;
  gesture.windowElement.style.setProperty("--confirm-x", `${view.generatedConfirmOffsetX}px`);
  gesture.windowElement.style.setProperty("--confirm-y", `${view.generatedConfirmOffsetY}px`);
});
function finishFloatingWindowDrag(event) {
  if (!floatingWindowGesture || floatingWindowGesture.pointerId !== event.pointerId) return;
  floatingWindowGesture.windowElement.classList.remove("is-dragging");
  floatingWindowGesture = null;
}
document.addEventListener("pointerup", finishFloatingWindowDrag);
document.addEventListener("pointercancel", finishFloatingWindowDrag);
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("#audioToggle")) void audio.unlock();
}, { capture: true });

function crimeOutcomeMessage(label, result) {
  const outcome = result?.outcome;
  if (outcome === "success_hidden") return `${label}に成功し、露見せず離脱しました。`;
  if (outcome === "success_exposed") return `${label}に成功しましたが、犯行が露見しました。`;
  if (outcome === "failed_escaped") return `${label}に失敗しましたが、拘束を免れました。`;
  if (outcome === "captured") return `${label}に失敗し、拘束されました。`;
  return `${label}の状況を更新しました。`;
}

function crimeOpportunityById(items, id) {
  return items.find((entry) => entry.id === id) ?? null;
}

function currentCrimeEvent(active) {
  return resolveCrimeEvent({
    seed: state.generatedWorld?.seed ?? state.worldSeed ?? "campaign",
    turn: state.turn ?? 0,
    targetId: active.target.id,
    preparation: Math.max(0, (state.turn ?? 0) - (active.startedTurn ?? state.turn ?? 0)),
    accompliceId: active.selectedAccomplice?.id ?? null,
  });
}

function executeCrimeActionFromUi(button) {
  const action = button.dataset.crimeAction;
  const targetId = button.dataset.crimeTarget;
  const village = activeVillageContext();
  const route = currentCrimeTravelContext();
  if (action === "theft") {
    const opportunities = getSettlementTheftOpportunities(state, village, { jurisdictionId: village.regionId, jurisdictionName: village.regionName });
    const result = executeTheft(state, crimeOpportunityById(opportunities, targetId));
    commit(result.state, crimeOutcomeMessage("窃盗", result.result), result.result.detected ? "event" : "confirm");
    return;
  }
  if (action === "extortion") {
    const opportunities = getSettlementExtortionOpportunities(state, village, { jurisdictionId: village.regionId, jurisdictionName: village.regionName });
    const result = executeExtortion(state, crimeOpportunityById(opportunities, targetId));
    commit(result.state, crimeOutcomeMessage("恐喝", result.result), result.result.detected ? "event" : "confirm");
    return;
  }
  if (action === "robbery") {
    if (!route) throw new Error("街道の移動先を選んでください");
    const opportunity = crimeOpportunityById(getRobberyOpportunities(state, route), targetId);
    const threatened = resolveRobberyThreat(startRobbery(state, opportunity));
    if (threatened.result.battle) {
      state = normalizeAdventureState(refreshGeneratedWorldForDate(threatened.state));
      persist();
      stopTacticalBattleEffects();
      view.launchOpen = false;
      view.tacticalOrigin = { type: "robbery", personalUnitBattle: true, targetName: opportunity.target.name, battleId: threatened.result.battle.id };
      view.battlePreparation = null;
      view.tacticalBattle = threatened.result.battle;
      view.tacticalResult = null;
      view.tacticalResultOpen = false;
      view.commanderDisposition = null;
      view.commanderDispositionOpen = false;
      render();
    } else commit(threatened.state, crimeOutcomeMessage("街道強盗", threatened.result), "confirm");
    return;
  }
  if (action === "smuggling") {
    const active = state.player.crime?.activeSmuggling;
    if (!active) {
      if (!route) throw new Error("密輸経路を選んでください");
      const offer = crimeOpportunityById(getSmugglingOffers(state, route), targetId);
      commit(acceptSmugglingOffer(state, offer), `${offer.cargo.name}を${offer.destinationJurisdiction.name}へ運ぶ密輸依頼を受けました。`, "confirm");
      return;
    }
    if (button.dataset.smugglingNext === "deliver") {
      const delivered = deliverSmugglingCargo(state);
      commit(delivered.state, `${active.cargo.name}を届け、${active.reward.text}を得ました。`, "confirm");
      return;
    }
    throw new Error("密輸品は地方地図から実際に移動して運んでください");
  }
  if (action === "sabotage") {
    const target = crimeOpportunityById(getSabotageTargets(state), targetId);
    const active = state.player.crime?.activeSabotage;
    const accompliceId = button.closest("[data-sabotage-context]")?.querySelector("[data-sabotage-accomplice]")?.value || null;
    if (!active) commit(startSabotage(state, target, { accompliceId }), `${target.name}への破壊工作を開始しました。`, "confirm");
    else if (active.stage === "started") {
      const event = currentCrimeEvent(active);
      commit(prepareSabotage(state, { decision: event.accompliceDecision ?? undefined }), `${active.target.name}への工作準備を終えました。${event.accompliceDecision === "report" ? " 同行者が通報して離脱しました。" : event.accompliceDecision === "refuse" ? " 同行者は参加を拒否しました。" : ""}`, event.accompliceDecision === "report" ? "event" : "confirm");
    }
    else {
      const result = executeSabotage(state, { outcome: currentCrimeEvent(active).outcome });
      commit(result.state, crimeOutcomeMessage("破壊工作", result.result), result.result.detected ? "event" : "confirm");
    }
    return;
  }
  if (action === "assassination") {
    const target = crimeOpportunityById(getAssassinationTargets(state, { regionId: currentAdventureContext().region.id }), targetId);
    const active = state.player.crime?.activeAssassination;
    const accompliceId = button.closest(".crime-context-section")?.querySelector("[data-crime-accomplice]")?.value || null;
    if (!active) commit(startAssassination(state, target, { accompliceId }), `${target.name}への暗殺計画を開始しました。`, "event");
    else if (active.stage === "started") {
      const event = currentCrimeEvent(active);
      commit(prepareAssassination(state, { decision: event.accompliceDecision ?? undefined }), `${active.target.name}への暗殺準備を終えました。${event.accompliceDecision === "report" ? " 同行者が通報して離脱しました。" : event.accompliceDecision === "refuse" ? " 同行者は参加を拒否しました。" : ""}`, "event");
    }
    else {
      const result = executeAssassination(state, { outcome: currentCrimeEvent(active).outcome });
      commit(result.state, crimeOutcomeMessage("暗殺", result.result), "event");
    }
  }
}

function crimeRecoveryDestination(jurisdictionId) {
  try {
    const world = getGeneratedWorldView(state);
    return world.runtime.nations.regions.find((entry) => entry.id !== jurisdictionId)?.id ?? null;
  } catch { return null; }
}

document.addEventListener("click", async (event) => {
  const extortionCollection = event.target.closest("[data-extortion-collect]");
  if (extortionCollection && !extortionCollection.disabled) {
    try {
      const result = collectExtortionPayment(state, { arrangementId: extortionCollection.dataset.extortionCollect });
      commit(result.state, crimeOutcomeMessage("みかじめ料の徴収", result.result), result.result.detected ? "event" : "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const crimeAction = event.target.closest("[data-crime-action]");
  if (crimeAction && !crimeAction.disabled) {
    try { executeCrimeActionFromUi(crimeAction); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const crimeSupport = event.target.closest("[data-crime-support]");
  if (crimeSupport && !crimeSupport.disabled) {
    const village = activeVillageContext();
    try {
      if (crimeSupport.dataset.crimeSupport === "discover") {
        commit(discoverUnderworldContacts(state, { jurisdictionId: village.regionId, jurisdictionName: village.regionName }), `${village.name}の裏社会で故買屋・密輸人・仲介人との連絡口を見つけました。`, "confirm");
      } else {
        commit(fenceStolenItem(state, { jurisdictionId: village.regionId, itemId: crimeSupport.dataset.stolenItemId }), "盗品を通常価値の4割で換金しました。", "confirm");
      }
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const recoveryButton = event.target.closest("[data-crime-recovery]");
  if (recoveryButton && !recoveryButton.disabled) {
    const action = recoveryButton.dataset.crimeRecovery;
    const jurisdictionId = currentCrimeJurisdictionId();
    const incident = state.player.crime?.incidents?.find((entry) => !entry.resolved && (entry.jurisdiction?.id ?? entry.jurisdictionId) === jurisdictionId)
      ?? state.player.crime?.incidents?.find((entry) => !entry.resolved);
    const destinationJurisdictionId = crimeRecoveryDestination(jurisdictionId);
    try {
      const governedJurisdictionIds = governedCrimeJurisdictionIds();
      const next = resolveCrimeRecovery(state, { action, jurisdictionId, destinationJurisdictionId, incidentId: incident?.id, severity: incident?.severity, crimeType: incident?.type, governedJurisdictionIds });
      const labels = { surrender: "出頭して刑に服しました。", safehouse: "裏社会の隠れ家へ身を隠しました。", escape: "管轄外へ逃亡しました。", pardon: "恩赦により現地の手配が解かれました。", asylum: "他国へ亡命し、元の管轄から追放されました。" };
      commit(next, labels[action], action === "pardon" ? "confirm" : "event");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (Date.now() < suppressGeneratedMapClickUntil && event.target.closest("#generatedWorldScroll")) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  playNavigationCue(event);
  if (view.generatedTravel) {
    event.preventDefault();
    return;
  }
  if (event.target.closest("[data-village-dialogue-cancel]")) {
    closeVillageConversation();
    return;
  }
  if (event.target.closest("[data-village-dialogue-skip]")) {
    completeVillageConversation();
    return;
  }
  if (event.target.closest("[data-village-dialogue-next]")) {
    if (!view.villageConversation) return;
    if (view.villageConversation.lineIndex < view.villageConversation.lines.length - 1) {
      view.villageConversation.lineIndex += 1;
      renderPanelFromTop();
    } else {
      completeVillageConversation();
    }
    return;
  }
  const npcConversationAction = event.target.closest("[data-npc-conversation-action]");
  if (npcConversationAction) {
    const conversation = view.villageConversation;
    if (conversation?.kind !== "npc-social") return;
    try {
      const next = interactWithNpcCandidate(state, conversation.id, npcConversationAction.dataset.npcConversationAction, currentAdventureContext(), { venue: conversation.facilityId });
      const candidate = getTavernCandidates(next, currentAdventureContext()).find((entry) => entry.id === conversation.id);
      const result = candidate?.social.lastResult;
      const notice = result?.joined ? `${candidate.name}がパーティーに加わりました。`
        : result?.discoveryLabel ? `${result.discoveryLabel}`
          : result?.affinityDelta < 0 ? "相手の反応が少し冷たくなりました。" : "会話を重ねました。";
      commit(next, notice, result?.joined ? "confirm" : "ui");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const goddessPersistentTap = event.target.closest("[data-goddess-persistent-tap]");
  if (goddessPersistentTap) {
    const result = registerGoddessPersistentTap(view.goddessPrologue);
    view.goddessPrologue = result.state;
    goddessPersistentTap.classList.remove("is-tapped");
    void goddessPersistentTap.offsetWidth;
    goddessPersistentTap.classList.add("is-tapped");
    if (result.triggered) void playGoddessMercyBranch();
    else audio.play("ui");
    return;
  }
  const goddessSkip = event.target.closest("[data-goddess-skip]");
  if (goddessSkip) {
    const phase = view.goddessPrologue?.phase;
    if (phase === "arrival" || phase === "mercy") {
      showGoddessCharacterSelection({ mercyGranted: phase === "mercy" });
    } else if (phase === "generating") {
      view.goddessPrologue = { ...view.goddessPrologue, skipRequested: true };
      renderLaunchScreen();
    } else if (phase === "departure") {
      view.goddessPrologue = { ...view.goddessPrologue, skipRequested: true };
      void finishGoddessReincarnation(goddessSequenceToken, { skipArrival: true });
    }
    return;
  }
  const characterCreateAction = event.target.closest("[data-character-create-action]");
  if (characterCreateAction) {
    const action = characterCreateAction.dataset.characterCreateAction;
    if (action === "cancel") {
      goddessSequenceToken += 1;
      view.characterCreationOpen = false;
      view.characterDraft = null;
      view.goddessPrologue = createGoddessPrologueState();
      renderLaunchScreen();
      return;
    }
    if (action === "reroll") {
      view.characterDraft = rollCharacterDraft(readCharacterDraftForm(), true);
      renderCharacterCreation();
      audio.play("ui");
      return;
    }
    if (action === "start") {
      const draft = readCharacterDraftForm();
      if (!draft.name) {
        showToast("人物の名前を入力してください。", "danger");
        return;
      }
      if ((state.turn > 0 || state.council.history.length > 0) && !window.confirm("保存済みの年代記を破棄して、この人物で新しい世界を始めますか？")) return;
      view.characterDraft = { ...draft, specialty: PLAYER_SPECIALTIES[draft.roleId] ?? PLAYER_SPECIALTIES.balanced };
      void beginGoddessReincarnation(view.characterDraft);
      return;
    }
  }
  const launchAction = event.target.closest("[data-launch-action]");
  if (launchAction) {
    if (launchAction.dataset.launchAction === "new") {
      openCharacterCreation();
      return;
    }
    if (!chronicleReady) return;
    view.launchOpen = false;
    view.panel = "world";
    view.atlasMode = "generated";
    view.generatedMapScale = "region";
    view.scale = "world";
    view.guideOpen = false;
    render();
    return;
  }
  const developerAction = event.target.closest("[data-developer-action]");
  if (developerAction) {
    const action = developerAction.dataset.developerAction;
    if (action === "battle") {
      openTacticalBattle();
      return;
    }
    if (action === "senior-general-battle") {
      const roster = createSeniorGeneralBattleRoster();
      openTacticalBattle({
        battle: createSeniorGeneralBattle(),
        roster,
        defaultParticipantIds: roster.map((participant) => participant.id),
        origin: { type: "senior-general", enemyName: "ヴァルカ公国強襲軍" },
      });
      return;
    }
    if (action === "imperial-princess-battle") {
      openTacticalBattle({
        battle: createImperialPrincessBattle(),
        origin: { type: "imperial-princess", enemyName: "グレート帝国親征軍" },
      });
      return;
    }
    if (action === "world" && !state.player) {
      state = normalizeAdventureState(refreshGeneratedWorldForDate(createCareerInitialState()));
    }
    view.launchOpen = false;
    view.guideOpen = false;
    if (["realm", "war-council"].includes(action) && state.player) state = normalizeAdventureState(refreshGeneratedWorldForDate(createInitialState({ scenarioMode: state.scenarioMode })));
    if (action === "world") {
      view.panel = "world";
      view.atlasMode = "generated";
      view.scale = "world";
    } else if (action === "war-council") {
      view.panel = "diplomacy";
      view.selectedCountryId = "valka";
      view.warCouncilOpen = !state.war;
    } else {
      view.panel = "council";
      view.scale = "country";
    }
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-generated-site-close]")) {
    view.selectedGeneratedSite = null;
    view.generatedSiteInfoOpen = false;
    renderMap();
    return;
  }
  if (event.target.closest("[data-generated-site-info]")) {
    view.generatedSiteInfoOpen = !view.generatedSiteInfoOpen;
    renderMap();
    return;
  }
  if (event.target.closest("[data-generated-site-move]")) {
    const site = generatedSiteSelectionContext();
    if (!site) return;
    try {
      const next = site.kind === "object"
        ? moveGeneratedExpeditionToSite(state, site.id)
        : site.kind === "colony"
          ? moveGeneratedExpeditionToColonizationSite(state, site.id)
          : movePersonalMap(state, currentAdventureContext(), site.id);
      view.generatedSiteInfoOpen = false;
      await playGeneratedTravel(next, site.name, site.travelMode === "sea" ? `${site.name}へ海路で移動しました。` : `${site.name}へ移動しました。`);
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const foundVillageButton = event.target.closest("[data-found-generated-village]");
  if (foundVillageButton) {
    const site = generatedSiteSelectionContext();
    if (!site || site.kind !== "colony") return;
    const villageName = window.prompt("新しい村の名前を入力してください。", site.defaultName);
    if (villageName === null) return;
    try {
      const next = foundGeneratedVillage(state, foundVillageButton.dataset.foundGeneratedVillage, { name: villageName });
      const colony = next.generatedWorld.colonies.at(-1);
      view.selectedGeneratedSite = { kind: "object", id: colony.id };
      view.generatedSiteInfoOpen = false;
      commit(next, `${colony.baseName}村を建設しました。街道沿いに新しい入植圏が生まれます。`, "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const generatedSiteMarker = event.target.closest("[data-generated-site-id]");
  if (generatedSiteMarker) {
    view.selectedGeneratedSite = {
      kind: generatedSiteMarker.dataset.generatedSiteKind,
      id: generatedSiteMarker.dataset.generatedSiteId,
    };
    view.generatedSiteInfoOpen = false;
    renderMap();
    return;
  }
  const locationEntry = event.target.closest("[data-enter-location]");
  if (locationEntry) {
    try {
      enterLocationScene(locationEntry.dataset.enterLocationKind, locationEntry.dataset.enterLocation);
      renderPanelFromTop();
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const dungeonEntry = event.target.closest("[data-enter-dungeon]");
  if (dungeonEntry) {
    try {
      const context = currentAdventureContext();
      const { dungeon } = getRegionAdventureSites(state, context);
      if (dungeon.id !== dungeonEntry.dataset.enterDungeon) throw new Error("この地方のダンジョンではありません。");
      enterLocationScene("dungeon", dungeon.id);
      renderPanelFromTop();
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const dungeonStart = event.target.closest("[data-start-dungeon]");
  if (dungeonStart) {
    try {
      const context = currentAdventureContext();
      const { dungeon } = getRegionAdventureSites(state, context);
      const location = activeLocationSceneContext();
      if (dungeon.id !== dungeonStart.dataset.startDungeon || location?.id !== dungeon.id) throw new Error("この洞窟の入口に到着していません。");
      const next = startDungeonRun(state, dungeon, context.region);
      view.locationScene = null;
      view.selectedLocationZoneId = null;
      view.locationSceneResult = null;
      view.panel = "world";
      view.atlasMode = "generated";
      view.generatedMapScale = "region";
      view.adventureOpen = true;
      commit(next, `${dungeon.name}へ入り、自動探索を開始しました。`, "ui");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-personal-map-explore]")) {
    try {
      const context = currentAdventureContext();
      const next = explorePersonalMap(state, context);
      const result = next.adventure.personalMap.regions[context.region.id].lastResult;
      view.adventureOpen = result.type === "monster";
      commit(next, result.message, result.type === "monster" ? "danger" : result.type === "item" || result.type === "location" ? "confirm" : "ui");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const personalMove = event.target.closest("[data-personal-map-move]");
  if (personalMove) {
    try {
      const context = currentAdventureContext();
      const next = movePersonalMap(state, context, personalMove.dataset.personalMapMove);
      const result = next.adventure.personalMap.regions[context.region.id].lastResult;
      await playGeneratedTravel(next, result.locationName, result.message);
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const adventureContract = event.target.closest("[data-accept-adventure-contract]");
  if (adventureContract) {
    try {
      const contract = getGuildContracts(state, currentAdventureContext()).find((entry) => entry.id === adventureContract.dataset.acceptAdventureContract);
      if (!contract) throw new Error("この依頼は現在受注できません。");
      beginVillageConversation({
        kind: "contract",
        id: contract.id,
        facilityId: activeVillageContext()?.settlementLevel === "village" || activeVillageContext()?.type === "village" ? "tavern" : "guild",
        title: contract.title,
        otherLine: `依頼は「${contract.title}」。${contract.detail} 引き受けますか？`,
        playerLine: "引き受ける。準備を整え、必ず結果を報告する。",
      });
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const adventureSubmission = event.target.closest("[data-submit-adventure-contract]");
  if (adventureSubmission) {
    try {
      const next = completeGuildContractObjective(state, adventureSubmission.dataset.submitAdventureContract, currentAdventureContext());
      commit(next, "集めた素材を納品し、依頼条件を達成しました。受付で達成報告を行えます。", "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const npcCandidate = event.target.closest("[data-talk-npc-candidate]");
  if (npcCandidate) {
    try {
      const candidate = getTavernCandidates(state, currentAdventureContext()).find((entry) => entry.id === npcCandidate.dataset.talkNpcCandidate);
      if (!candidate) throw new Error("相手はもうここにいません。");
      beginNpcSocialConversation(candidate, npcCandidate.dataset.npcVenue === "guild" ? "guild" : "tavern");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const partyInvitation = event.target.closest("[data-accept-party-invitation]");
  if (partyInvitation) {
    try {
      const candidate = getTavernCandidates(state, currentAdventureContext()).find((entry) => entry.id === partyInvitation.dataset.acceptPartyInvitation);
      if (!candidate) throw new Error("相手はもう酒場にいません。");
      beginVillageConversation({
        kind: "party-accept",
        id: candidate.id,
        facilityId: "tavern",
        title: `${candidate.name}からの誘い`,
        counterpartName: candidate.name,
        otherLine: `私は${candidate.role}だ。${candidate.specialty}なら力になれる。一緒に行かないか？`,
        playerLine: "頼もしい。互いの役割を確かめて、一緒に出発しよう。",
      });
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const partyCandidate = event.target.closest("[data-invite-party-candidate]");
  if (partyCandidate) {
    try {
      const candidate = getTavernCandidates(state, currentAdventureContext()).find((entry) => entry.id === partyCandidate.dataset.invitePartyCandidate);
      if (!candidate) throw new Error("相手はもう酒場にいません。");
      beginVillageConversation({
        kind: "party-invite",
        id: candidate.id,
        facilityId: "tavern",
        title: `${candidate.name}を誘う`,
        counterpartName: candidate.name,
        counterpart: candidate.unique ? { name: candidate.name, role: candidate.role, image: candidate.portraitImage, transparent: true } : null,
        otherLine: candidate.recruitmentLine ?? `${candidate.specialty}が必要なのか。報酬と危険、それぞれ聞かせてくれ。`,
        playerLine: candidate.playerReply ?? "条件は正直に話す。納得できたなら、力を貸してほしい。",
      });
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-open-dungeon-tactical]")) {
    try { openDungeonTacticalBattle(); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-skip-adventure-battle]")) {
    try { confirmAndSkipActiveDungeonBattle(); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-withdraw-adventure-battle]")) {
    try {
      commit(withdrawDungeonBattle(state), "敵編成を確認し、交戦前に入口へ撤退しました。", "ui");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-return-recovery]")) {
    try { routePartyToRecovery(); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-close-adventure]")) {
    try {
      view.adventureOpen = false;
      commit(closeDungeonRun(state), "地方地図へ戻りました。", "ui");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const locationZone = event.target.closest("[data-location-zone]");
  if (locationZone) {
    const context = activeLocationSceneContext();
    const definition = context ? LOCATION_SCENE_DEFINITIONS[context.type] : null;
    if (!definition?.zones.some((zone) => zone.id === locationZone.dataset.locationZone)) return;
    view.selectedLocationZoneId = locationZone.dataset.locationZone;
    renderPanelFromTop();
    return;
  }
  const locationAction = event.target.closest("[data-location-action]");
  if (locationAction) {
    const context = activeLocationSceneContext();
    const definition = context ? LOCATION_SCENE_DEFINITIONS[context.type] : null;
    const action = definition?.zones.flatMap((zone) => zone.actions).find((entry) => entry.id === locationAction.dataset.locationAction);
    if (!context || !action || action.startDungeon || action.route) {
      showToast("この地点で確認できない行動です。", "danger");
      return;
    }
    view.locationSceneResult = locationSceneActionResult(context, action);
    renderPanelFromTop();
    return;
  }
  const locationRoute = event.target.closest("[data-location-route]");
  if (locationRoute) {
    view.locationScene = null;
    view.selectedLocationZoneId = null;
    view.locationSceneResult = null;
    view.panel = locationRoute.dataset.locationRoute === "career" ? "career" : "world";
    if (view.panel === "world") {
      view.atlasMode = "generated";
      view.generatedMapScale = "region";
    }
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-leave-location]")) {
    view.locationScene = null;
    view.selectedLocationZoneId = null;
    view.locationSceneResult = null;
    view.panel = "world";
    view.atlasMode = "generated";
    view.generatedMapScale = "region";
    renderPanelFromTop();
    return;
  }
  const villageEntry = event.target.closest("[data-enter-village]");
  if (villageEntry) {
    try {
      enterVillage(villageEntry.dataset.enterVillage);
      renderPanelFromTop();
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const villageFacility = event.target.closest("[data-village-facility]");
  if (villageFacility) {
    view.selectedVillageFacilityId = villageFacility.dataset.villageFacility;
    if (view.selectedVillageFacilityId === "tavern") view.tavernSection = "requests";
    view.villageFacilityOpen = true;
    if (view.selectedVillageFacilityId === "market") {
      const village = activeVillageContext();
      try { commit(observeSettlementMarket(state, village), `${village.name}の現在相場を相場帳へ記録しました。`, "confirm"); }
      catch (error) { showToast(error.message, "danger"); }
      return;
    }
    renderPanelFromTop();
    return;
  }
  const tavernSection = event.target.closest("[data-tavern-section]");
  if (tavernSection && ["requests", "adventurers", "unique"].includes(tavernSection.dataset.tavernSection)) {
    view.tavernSection = tavernSection.dataset.tavernSection;
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-close-village-actions]")) {
    view.villageFacilityOpen = false;
    renderPanelFromTop();
    return;
  }
  const saleButton = event.target.closest("[data-sell-village-item]");
  if (saleButton) {
    const village = activeVillageContext();
    const itemId = saleButton.dataset.sellVillageItem;
    const item = state.player?.villageLife?.inventory?.find((entry) => entry.id === itemId);
    if (!village || !item) { showToast("売却する所持品が見つかりません。", "danger"); return; }
    if (!window.confirm(`${item.name}を1個売却しますか？`)) return;
    try {
      const next = performVillageAction(state, village, "sell_item", { itemId });
      commit(next, next.player.villageLife.lastAction.message, "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-market-rumors]")) {
    const village = activeVillageContext();
    try {
      const next = hearMarketRumors(state, village, { candidates: discoveredMerchantSettlements(village) });
      commit(next, "近隣市場の価格帯を相場帳へ書き留めました。", "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const commodityButton = event.target.closest("[data-buy-commodity], [data-sell-commodity]");
  if (commodityButton) {
    const village = activeVillageContext();
    const commodityId = commodityButton.dataset.buyCommodity ?? commodityButton.dataset.sellCommodity;
    const quantity = Number(commodityButton.closest("[data-market-good]")?.querySelector("[data-market-quantity]")?.value ?? 1);
    const buying = Boolean(commodityButton.dataset.buyCommodity);
    try {
      const next = buying
        ? buyCommodity(state, village, commodityId, quantity)
        : sellCommodity(state, village, commodityId, quantity);
      const commodity = MERCHANT_COMMODITIES[commodityId];
      commit(next, `${village.name}で${commodity.name}を${quantity}個${buying ? "仕入れ" : "売却し"}ました。`, "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const partyMemberToggle = event.target.closest("[data-party-member-toggle]");
  if (partyMemberToggle) {
    try {
      const next = setPartyMemberActive(state, partyMemberToggle.dataset.partyMemberToggle, partyMemberToggle.dataset.partyActive === "true");
      commit(next, next.player.villageLife.lastAction.message, "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const villageAction = event.target.closest("[data-village-action]");
  if (villageAction) {
    const village = activeVillageContext();
    if (!village) {
      showToast("行動する村が選択されていません。", "danger");
      return;
    }
    if (["organize_party", "prepare_party"].includes(villageAction.dataset.villageAction)) {
      view.selectedVillageFacilityId = "preparation";
      view.villageFacilityOpen = true;
      renderPanelFromTop();
      return;
    }
    try {
      beginVillageActionConversation(villageAction.dataset.villageAction);
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const villageExit = event.target.closest("[data-leave-village]");
  if (villageExit) {
    view.villageFacilityOpen = false;
    view.villageConversation = null;
    view.panel = "world";
    view.shortcutTab = villageExit.dataset.leaveVillage === "world" ? "world" : "characters";
    view.characterDetailOpen = villageExit.dataset.leaveVillage === "career";
    view.selectedShortcutCharacterId = state.player?.id ?? view.selectedShortcutCharacterId;
    view.atlasMode = "generated";
    view.generatedMapScale = "region";
    renderPanelFromTop();
    return;
  }
  const villageAdministration = event.target.closest("[data-open-village-administration]");
  if (villageAdministration) {
    const townId = villageAdministration.dataset.openVillageAdministration;
    if (!WORLD.villages[townId] || !getCareerStage(state)?.governance) {
      showToast("この村の町政を開く権限がありません。", "danger");
      return;
    }
    view.selectedTownId = townId;
    view.selectedCityId = WORLD.villages[townId].province;
    view.selectedType = "village";
    view.selectedId = townId;
    view.panel = "town";
    view.townTab = "overview";
    renderPanelFromTop();
    return;
  }
  const lifeAction = event.target.closest("[data-life-action]");
  if (lifeAction) {
    try { commit(performLifeAction(state, lifeAction.dataset.lifeAction), "時間と生活資源を進めました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const livelihoodAccept = event.target.closest("[data-livelihood-accept]");
  if (livelihoodAccept) {
    try { commit(acceptLivelihoodContract(state, livelihoodAccept.dataset.livelihoodAccept), "期限と目的地を持つ仕事を受けました。", "event"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const livelihoodTarget = event.target.closest("[data-livelihood-target]");
  if (livelihoodTarget) {
    try {
      const next = selectGeneratedWorldRegion(state, livelihoodTarget.dataset.livelihoodTarget);
      view.characterDetailOpen = false;
      view.ledgerDrawerOpen = false;
      view.panel = "world";
      view.shortcutTab = "world";
      view.atlasMode = "generated";
      view.generatedMapScale = "region";
      commit(next, "仕事の目的地を選択しました。通常の地方移動で向かってください。", "info");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-livelihood-complete]")) {
    try { commit(completeLivelihoodContract(state), "仕事を完了し、時間・疲労・報酬を確定しました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const companionWages = event.target.closest("[data-companion-wages]");
  if (companionWages) {
    try { commit(payCompanionWages(state, companionWages.dataset.companionWages), "同行者へ未払い賃金を支給しました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const companionRequest = event.target.closest("[data-companion-request]");
  if (companionRequest) {
    try { commit(answerCompanionRequest(state, companionRequest.dataset.companionRequest, companionRequest.dataset.companionDecision), companionRequest.dataset.companionDecision === "accept" ? "同行者の要望に応じました。" : "同行者の要望を断り、関係へ影響が残りました。", companionRequest.dataset.companionDecision === "accept" ? "confirm" : "cancel"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const propertyAcquire = event.target.closest("[data-property-acquire]");
  if (propertyAcquire) {
    try { const settlement = activeVillageContext(); commit(acquireProperty(state, settlement, propertyAcquire.dataset.propertyAcquire), "現地の物件を取得し、生活と物流の拠点にしました。", "event"); }
    catch (error) { showToast(error.message, "danger"); } return;
  }
  const warehouseDeposit = event.target.closest("[data-warehouse-deposit]");
  if (warehouseDeposit) { try { commit(transferCargoToWarehouse(state, warehouseDeposit.dataset.propertySettlement, warehouseDeposit.dataset.warehouseDeposit, 1), "積荷を現地倉庫へ移しました。", "confirm"); } catch (error) { showToast(error.message, "danger"); } return; }
  const warehouseWithdraw = event.target.closest("[data-warehouse-withdraw]");
  if (warehouseWithdraw) { try { commit(withdrawWarehouseCargo(state, warehouseWithdraw.dataset.propertySettlement, warehouseWithdraw.dataset.warehouseWithdraw, 1), "現地倉庫から積荷を取り出しました。", "confirm"); } catch (error) { showToast(error.message, "danger"); } return; }
  const shopOpen = event.target.closest("[data-shop-open]");
  if (shopOpen) { try { commit(openPlayerShop(state, shopOpen.dataset.propertySettlement, `${activeVillageContext()?.name ?? "街道"}商店`), "個人商店を開業しました。月次に売上と維持費を決算します。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const shopStock = event.target.closest("[data-shop-stock]");
  if (shopStock) { try { commit(stockPlayerShop(state, shopStock.dataset.propertySettlement, shopStock.dataset.shopStock, 1), "倉庫から商品を店頭へ並べました。", "confirm"); } catch (error) { showToast(error.message, "danger"); } return; }
  const shopPrice = event.target.closest("[data-shop-price]");
  if (shopPrice) { try { commit(priceShopCommodity(state, shopPrice.dataset.propertySettlement, shopPrice.dataset.shopPrice, Number(shopPrice.dataset.shopMultiplier)), "個人商店の販売価格を変更しました。", "confirm"); } catch (error) { showToast(error.message, "danger"); } return; }
  const shopClose = event.target.closest("[data-shop-close]");
  if (shopClose) { try { commit(closePlayerShop(state, shopClose.dataset.propertySettlement), "個人商店を閉じ、店頭在庫を倉庫へ戻しました。", "cancel"); } catch (error) { showToast(error.message, "danger"); } return; }
  const companionQuestResponse = event.target.closest("[data-companion-quest-response]");
  if (companionQuestResponse) { try { commit(respondToCompanionQuest(state, companionQuestResponse.dataset.companionQuestMember, companionQuestResponse.dataset.companionQuestOffer, companionQuestResponse.dataset.companionQuestResponse), "仲間の個人的な頼みに返答しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const companionQuestComplete = event.target.closest("[data-companion-quest-complete]");
  if (companionQuestComplete) { try { commit(completeCompanionQuest(state, companionQuestComplete.dataset.companionQuestComplete, { battleId: companionQuestComplete.dataset.companionBattleEvidence || null }), "現地条件を満たし、仲間の個人的な頼みを達成しました。", "confirm"); } catch (error) { showToast(error.message, "danger"); } return; }
  const estateDecision = event.target.closest("[data-estate-decision]");
  if (estateDecision) { try { commit(resolveEstateProjectDebate(state, estateDecision.dataset.estateDecision), "四身分への方針を決裁し、所領事業を着工しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const fiefProject = event.target.closest("[data-fief-project]");
  if (fiefProject) {
    try {
      const card = fiefProject.closest("[data-fief-project-card]");
      commit(startEstateProjectDebate(state, { projectId: fiefProject.dataset.fiefProject, territoryId: card.querySelector("[data-fief-territory]")?.value, officerId: card.querySelector("[data-fief-officer]")?.value }), "領民・名望家・商人・家臣団の評議を開始しました。", "event");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const householdReward = event.target.closest("[data-household-reward]");
  if (householdReward) {
    try { commit(grantHouseholdReward(state, householdReward.dataset.householdOfficer, householdReward.dataset.householdReward), "家臣の功績へ恩賞を与えました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-realm-campaign-start]")) {
    try {
      const form = event.target.closest("[data-realm-campaign-form]");
      const commanders = [...form.querySelectorAll("[data-campaign-commander]")].map((select) => select.value);
      commit(startRealmCampaign(state, { targetRegionId: form.querySelector("[data-campaign-target]")?.value, objectiveId: form.querySelector("[data-campaign-objective]")?.value, commanderIds: commanders }), "政治目的と二軍団の指揮官・補給を確定しました。", "event");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-realm-campaign-advance]")) {
    try { commit(advanceRealmCampaign(state), "戦役の集結・行軍・会戦を一段階進めました。", "event"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const generatedAlly = event.target.closest("[data-generated-ally]");
  if (generatedAlly) { try { commit(requestAlliedContingent(state, generatedAlly.dataset.generatedAlly), "同盟国から援軍派遣の約束を取り付けました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  if (event.target.closest("[data-generated-campaign-start]")) {
    try { const form = event.target.closest("[data-generated-campaign-form]"); const allyNationIds = getGeneratedCampaignView(state).promisedAllies.map((entry) => entry.nationId); commit(startGeneratedCampaign(state, { targetRegionId: form.querySelector("[data-generated-campaign-target]")?.value, objectiveId: form.querySelector("[data-generated-campaign-objective]")?.value, commanderIds: ["player", form.querySelector("[data-generated-campaign-commander]")?.value], allyNationIds }), "最大五正面・兵站・同盟軍を持つ生成世界戦役を開始しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return;
  }
  if (event.target.closest("[data-generated-campaign-advance]")) { try { commit(advanceGeneratedCampaign(state), "生成世界戦役を一段階進めました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const generatedSiege = event.target.closest("[data-generated-siege]");
  if (generatedSiege) { try { commit(decideGeneratedSiege(state, generatedSiege.dataset.generatedSiege), "攻城方針を決裁しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  if (event.target.closest("[data-generated-campaign-retreat]")) { try { commit(retreatGeneratedCampaign(state), "損失を負って撤退し、再建段階へ移りました。", "cancel"); } catch (error) { showToast(error.message, "danger"); } return; }
  const generatedPeace = event.target.closest("[data-generated-peace]");
  if (generatedPeace) { try { const settlementId = generatedPeace.dataset.generatedPeace; const irreversible = ["limited_annexation", "full_annexation"].includes(settlementId); const confirmIrreversible = !irreversible || window.confirm(settlementId === "full_annexation" ? "敵国の全地方を併合し、各地で占領統治と抵抗が始まります。確定しますか？" : "対象地方の支配を移し、占領統治を開始しますか？"); commit(settleGeneratedCampaign(state, settlementId, { confirmIrreversible }), "講和を確定し、戦役を年代記へ記録しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const intervention = event.target.closest("[data-generated-war-intervention]");
  if (intervention) { try { commit(interveneGeneratedWorldWar(state, intervention.dataset.generatedWarId, intervention.dataset.generatedWarIntervention), "他国戦争への介入方針を確定しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const warResponse = event.target.closest("[data-generated-war-response]");
  if (warResponse) { try { commit(respondGeneratedWorldWar(state, warResponse.dataset.generatedWarId, warResponse.dataset.generatedWarResponse), "自国戦争への対応を確定しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const resistancePolicy = event.target.closest("[data-generated-resistance-policy]");
  if (resistancePolicy) { try { commit(setGeneratedResistancePolicy(state, resistancePolicy.dataset.generatedOccupationId, resistancePolicy.dataset.generatedResistancePolicy), "併合地の統治政策を更新しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const resistanceResponse = event.target.closest("[data-generated-resistance-response]");
  if (resistanceResponse) { try { const responseId = resistanceResponse.dataset.generatedResistanceResponse; if (responseId === "withdraw" && !window.confirm("併合地を旧国へ返還し、撤兵しますか？")) return; commit(resolveGeneratedResistanceResponse(state, resistanceResponse.dataset.generatedOccupationId, responseId), "レジスタンス事件への対応を実行しました。", "event"); } catch (error) { showToast(error.message, "danger"); } return; }
  const lifePath = event.target.closest("[data-life-path]");
  if (lifePath) {
    try { commit(chooseLifePath(state, lifePath.dataset.lifePath), "次に追う人生目標を選びました。既存の実績が進捗になります。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-life-path-claim]")) {
    try { commit(claimLifePathMilestone(state), "歩みが認められ、二つ名と報酬を得ました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-designate-heir]")) {
    try {
      const form = event.target.closest("[data-succession-form]");
      commit(designateHeir(state, form.querySelector("[data-succession-heir]")?.value), "後継者を正式に公示しました。", "event");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-execute-succession]")) {
    try {
      const form = event.target.closest("[data-succession-form]");
      commit(executeSuccession(state, form.querySelector("[data-succession-legacy]")?.value), "世界と国家を保ったまま、次代の年代記が始まりました。", "event");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const militaryMissionAction = event.target.closest("[data-military-mission-action]");
  if (militaryMissionAction) {
    try {
      const action = militaryMissionAction.dataset.militaryMissionAction;
      if (action === "start") {
        commit(startMilitaryCareerMission(state), "主君から期限と作戦地域を持つ軍務を受命しました。", "event");
      } else if (action === "prepare") {
        const card = militaryMissionAction.closest("[data-military-mission-card]");
        const companionIds = [...card.querySelectorAll("[data-military-companion]:checked")].map((input) => input.value);
        commit(prepareMilitaryCareerMission(state, {
          approachId: card.querySelector("[data-military-approach]")?.value,
          logisticsId: card.querySelector("[data-military-logistics]")?.value,
          companionIds,
        }), "作戦・兵站・参陣者を確定しました。地方地図から対象地域へ移動してください。", "confirm");
      } else if (["target", "origin"].includes(action)) {
        const mission = getMilitaryCareerMissionView(state).mission;
        const regionId = action === "target" ? mission.targetRegion.id : mission.originRegion.id;
        const next = selectGeneratedWorldRegion(state, regionId);
        view.characterDetailOpen = false;
        view.ledgerDrawerOpen = false;
        view.panel = "world";
        view.shortcutTab = "world";
        view.atlasMode = "generated";
        view.generatedMapScale = "region";
        commit(next, `${action === "target" ? "作戦地域" : "帰還先"}を地図で選択しました。通常の移動操作で進んでください。`, "info");
      } else if (action === "battle") {
        const battle = createMilitaryCareerBattle(state);
        stopTacticalBattleEffects();
        view.launchOpen = false;
        view.characterDetailOpen = false;
        view.tacticalOrigin = { type: "military-career", missionId: state.player.militaryCareer.activeMission.id };
        view.battlePreparation = null;
        view.tacticalBattle = battle;
        view.tacticalResult = null;
        view.tacticalResultOpen = false;
        view.commanderDisposition = null;
        view.commanderDispositionOpen = false;
        view.selectedTacticalUnitId = null;
        view.selectedTacticalCommanderId = null;
        view.selectedTacticalFortificationId = null;
        view.tacticalInspectorDismissed = false;
        render();
      } else if (action === "report") {
        const actionCard = militaryMissionAction.closest("[data-career-action-card]");
        const delegation = actionCard ? {
          successorId: actionCard.querySelector("[data-promotion-successor]")?.value,
          mandateId: actionCard.querySelector("[data-promotion-mandate]")?.value,
          authorityId: actionCard.querySelector("[data-promotion-authority]")?.value,
        } : {};
        const previousStage = state.player.stage;
        const next = reportMilitaryCareerMission(state, delegation);
        const promoted = next.player.stage !== previousStage;
        if (getCareerStage(next)?.governance && !getCareerStage(state)?.governance) view.panel = "governance";
        commit(next, promoted ? "軍務の戦果を認められ、昇進しました。" : "軍務の勝敗・期限・損害を主君へ報告しました。", promoted ? "confirm" : "danger");
      }
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const careerAction = event.target.closest("[data-career-action]");
  if (careerAction) {
    try {
      const actionCard = careerAction.closest("[data-career-action-card]");
      const delegation = actionCard ? {
        successorId: actionCard.querySelector("[data-promotion-successor]")?.value,
        mandateId: actionCard.querySelector("[data-promotion-mandate]")?.value,
        authorityId: actionCard.querySelector("[data-promotion-authority]")?.value,
        governmentFormId: actionCard.querySelector("[data-government-form]")?.value,
        generatedRegionId: actionCard.querySelector("[data-second-fief-region]")?.value,
      } : {};
      const next = performCareerAction(state, careerAction.dataset.careerAction, delegation);
      const becameLord = getCareerStage(next)?.governance && !getCareerStage(state)?.governance;
      if (becameLord) view.panel = "governance";
      commit(next, becameLord ? "領主に任じられました。同じ統治画面が自領限定で解放されます。" : "人物の年代記を更新しました。", ["declare_independence", "assume_crown"].includes(careerAction.dataset.careerAction) ? "event" : "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const masteryLoadout = event.target.closest("[data-mastery-loadout]");
  if (masteryLoadout) {
    try {
      const masteryId = masteryLoadout.dataset.masteryLoadout;
      const wasEquipped = state.player.mastery.equippedMagicIds.includes(masteryId) || state.player.mastery.equippedTalentIds.includes(masteryId);
      commit(toggleMasteryLoadout(state, masteryId), wasEquipped ? "装備枠から外しました。" : "次の戦闘用装備へ組み込みました。", "ui");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const serviceInvitation = event.target.closest("[data-accept-service]");
  if (serviceInvitation) {
    try { commit(acceptServiceInvitation(state, serviceInvitation.dataset.acceptService), "主君を選び、具体的な主従関係を結びました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const governanceCommand = event.target.closest("[data-governance-command]");
  if (governanceCommand) {
    if (governanceCommand.dataset.governanceCommand === "centralization") {
      elements.backMenu?.removeAttribute("open");
      view.panel = "centralization";
      view.scale = "country";
      renderPanelFromTop();
      return;
    }
    try {
      const territoryId = governanceCommand.dataset.territoryId ?? null;
      const next = executeGovernanceCommand(
        state,
        governanceCommand.dataset.governanceCommand,
        territoryId,
        territoryId ? WORLD.provinces[territoryId]?.name ?? null : null,
      );
      commit(next, "管轄と必要権限を検証し、命令を実行しました。", "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const petitionButton = event.target.closest("[data-submit-petition]");
  if (petitionButton) {
    try {
      const next = submitPetition(state, petitionButton.dataset.submitPetition);
      const result = next.player.petitions[0];
      commit(next, result.status === "accepted" ? "建議が採用されました。実施主体は主君と中央政府です。" : "建議は採用されませんでした。", result.status === "accepted" ? "confirm" : "cancel");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const jurisdictionTerritory = event.target.closest("[data-jurisdiction-territory]");
  if (jurisdictionTerritory) {
    view.selectedCityId = jurisdictionTerritory.dataset.jurisdictionTerritory;
    renderPanelFromTop();
    return;
  }
  const preparationAction = event.target.closest("[data-preparation-action]");
  if (preparationAction) {
    if (preparationAction.dataset.preparationAction === "exit") {
      exitTacticalBattle();
    } else if (preparationAction.dataset.preparationAction === "skip") {
      try { confirmAndSkipActiveDungeonBattle(); }
      catch (error) { showToast(error.message, "danger"); }
    } else if (preparationAction.dataset.preparationAction === "start") {
      try { startTacticalBattle(); }
      catch (error) { showToast(error.message, "danger"); }
    }
    return;
  }
  const battleParticipant = event.target.closest("[data-battle-participant]");
  if (battleParticipant && view.battlePreparation) {
    try { view.battlePreparation = toggleBattleParticipant(view.battlePreparation, battleParticipant.dataset.battleParticipant); }
    catch (error) { showToast(error.message, "danger"); }
    renderBattlePreparation();
    return;
  }
  const placementMode = event.target.closest("[data-battle-placement-mode]");
  if (placementMode && view.battlePreparation) {
    try {
      view.battlePreparation = setBattlePlacementMode(view.battlePreparation, placementMode.dataset.battlePlacementMode);
      showToast(placementMode.dataset.battlePlacementMode === "auto" ? "選択中の陣形で自動配置しました。" : "手動配置へ切り替えました。部隊を選択してください。", "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    renderBattlePreparation();
    return;
  }
  const preparationFormation = event.target.closest("[data-preparation-formation]");
  if (preparationFormation && view.battlePreparation) {
    try {
      view.battlePreparation = setBattlePreparationFormation(view.battlePreparation, preparationFormation.dataset.preparationFormation);
      const formation = TACTICAL_FORMATIONS[preparationFormation.dataset.preparationFormation];
      showToast(`${formation.name}を採用しました。${view.battlePreparation.placementMode === "auto" ? "推奨位置へ再配置します。" : "現在の手動配置は維持されます。"}`, "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    renderBattlePreparation();
    return;
  }
  const battleLogistics = event.target.closest("[data-battle-logistics]");
  if (battleLogistics && view.battlePreparation) {
    try { view.battlePreparation = setBattleLogisticsPlan(view.battlePreparation, battleLogistics.dataset.battleLogistics); }
    catch (error) { showToast(error.message, "danger"); }
    renderBattlePreparation();
    return;
  }
  const preparationTile = event.target.closest("[data-preparation-tile]");
  if (preparationTile && view.battlePreparation) {
    const preparation = view.battlePreparation;
    if (preparation.placementMode !== "manual") {
      showToast("手動配置へ切り替えると、部隊ごとに配置マスを指定できます。");
      return;
    }
    const clickedUnit = getBattleUnit(preparation.battle, preparationTile.dataset.preparationUnit);
    try {
      if (clickedUnit?.side === "player") {
        view.battlePreparation = selectBattlePreparationUnit(preparation, clickedUnit.id);
      } else if (clickedUnit?.side === "enemy") {
        showToast("敵軍の初期配置は変更できません。", "danger");
        return;
      } else if (preparation.selectedUnitId) {
        const [x, y] = preparationTile.dataset.preparationTile.split(",").map(Number);
        view.battlePreparation = placeBattlePreparationUnit(preparation, preparation.selectedUnitId, { x, y });
      } else {
        showToast("先に配置する自軍部隊を選択してください。");
        return;
      }
    } catch (error) { showToast(error.message, "danger"); }
    renderBattlePreparation();
    return;
  }
  const battleAction = event.target.closest("[data-battle-action]");
  if (battleAction) {
    const action = battleAction.dataset.battleAction;
    if (tacticalEffectsPlaying && !["exit", "reset"].includes(action)) return;
    if (action === "exit") {
      exitTacticalBattle();
    } else if (action === "reset") {
      if (["dungeon", "personal-map"].includes(view.tacticalOrigin?.type)) openDungeonTacticalBattle();
      else openTacticalBattle();
    } else if (action === "skip-dungeon") {
      try { confirmAndSkipActiveDungeonBattle(); }
      catch (error) { showToast(error.message, "danger"); }
    } else if (action === "encirclement-demo") {
      view.tacticalBattle = createEncirclementCaptureDemo();
      view.selectedTacticalUnitId = null;
      view.selectedTacticalCommanderId = null;
      view.selectedTacticalFortificationId = null;
      view.tacticalInspectorDismissed = false;
      prepareTacticalResult();
      renderTacticalBattle();
    } else if (action === "fortification-demo") {
      view.tacticalBattle = createFortificationSiegeDemo();
      view.tacticalResult = null;
      view.tacticalResultOpen = false;
      view.commanderDisposition = null;
      view.commanderDispositionOpen = false;
      view.selectedTacticalUnitId = null;
      view.selectedTacticalCommanderId = null;
      view.selectedTacticalFortificationId = "castle-valka";
      view.tacticalInspectorDismissed = false;
      renderTacticalBattle();
    } else if (action === "result") {
      if (!view.tacticalResult) prepareTacticalResult({ open: false });
      view.tacticalResultOpen = Boolean(view.tacticalResult);
      view.commanderDispositionOpen = false;
      renderTacticalPostBattle();
    } else if (action === "execute") {
      advanceTacticalBattle();
    }
    return;
  }
  const resultAction = event.target.closest("[data-result-action]");
  if (resultAction) {
    const action = resultAction.dataset.resultAction;
    if (action === "recover") {
      try { routePartyToRecovery({ applyBattleResult: true }); }
      catch (error) { showToast(error.message, "danger"); }
      return;
    }
    if (action === "exit") {
      exitTacticalBattle({ applyDungeonResult: ["dungeon", "personal-map"].includes(view.tacticalOrigin?.type) });
      return;
    }
    if (action === "battlefield") {
      view.tacticalResultOpen = false;
    } else if (action === "disposition" && view.commanderDisposition) {
      view.tacticalResultOpen = false;
      view.commanderDispositionOpen = true;
    }
    renderTacticalPostBattle();
    return;
  }
  const persuasionApproach = event.target.closest("[data-persuasion-approach]");
  if (persuasionApproach && view.commanderDisposition) {
    try {
      view.commanderDisposition = advanceCommanderPersuasion(view.commanderDisposition, persuasionApproach.dataset.persuasionApproach);
    } catch (error) { showToast(error.message, "danger"); }
    renderTacticalPostBattle();
    return;
  }
  const dispositionAction = event.target.closest("[data-disposition-action]");
  if (dispositionAction && view.commanderDisposition) {
    const action = dispositionAction.dataset.dispositionAction;
    if (action === "back") {
      view.commanderDispositionOpen = false;
      view.tacticalResultOpen = true;
    } else if (action === "intern" || action === "release") {
      try { view.commanderDisposition = finalizeCommanderDisposition(view.commanderDisposition, action); }
      catch (error) { showToast(error.message, "danger"); }
    }
    renderTacticalPostBattle();
    return;
  }
  const battleInspectorClose = event.target.closest("[data-battle-inspector-close]");
  if (battleInspectorClose) {
    view.tacticalInspectorDismissed = true;
    renderTacticalBattle();
    return;
  }
  const battleSelectUnit = event.target.closest("[data-battle-select-unit]");
  if (battleSelectUnit && view.tacticalBattle) {
    view.pendingTacticalMagicId = null;
    view.selectedTacticalUnitId = battleSelectUnit.dataset.battleSelectUnit;
    view.selectedTacticalCommanderId = null;
    view.selectedTacticalFortificationId = null;
    view.tacticalInspectorDismissed = false;
    renderTacticalBattle();
    return;
  }
  const battleFormation = event.target.closest("[data-battle-formation]");
  if (battleFormation && view.tacticalBattle) {
    try {
      view.tacticalBattle = applyBattleFormation(view.tacticalBattle, "player", battleFormation.dataset.battleFormation);
      showToast(`${TACTICAL_FORMATIONS[battleFormation.dataset.battleFormation].name}へ再配置しました。`, "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    renderTacticalBattle();
    return;
  }
  const battleOrder = event.target.closest("[data-battle-order]");
  if (battleOrder && view.tacticalBattle && view.selectedTacticalUnitId) {
    try { view.tacticalBattle = issueUnitOrder(view.tacticalBattle, view.selectedTacticalUnitId, battleOrder.dataset.battleOrder); }
    catch (error) { showToast(error.message, "danger"); }
    renderTacticalBattle();
    return;
  }
  const battleFacing = event.target.closest("[data-battle-facing]");
  if (battleFacing && view.tacticalBattle && view.selectedTacticalUnitId) {
    try { view.tacticalBattle = setUnitFacing(view.tacticalBattle, view.selectedTacticalUnitId, battleFacing.dataset.battleFacing); }
    catch (error) { showToast(error.message, "danger"); }
    renderTacticalBattle();
    return;
  }
  const battleMagic = event.target.closest("[data-battle-magic]");
  if (battleMagic && view.tacticalBattle && view.selectedTacticalUnitId) {
    view.pendingTacticalMagicId = view.pendingTacticalMagicId === battleMagic.dataset.battleMagic ? null : battleMagic.dataset.battleMagic;
    if (view.pendingTacticalMagicId && window.innerWidth < 760) view.tacticalInspectorDismissed = true;
    renderTacticalBattle();
    return;
  }
  const battleTile = event.target.closest("[data-battle-tile]");
  if (battleTile) {
    handleTacticalTile(battleTile);
    return;
  }
  const resourceAction = event.target.closest("[data-resource-action]");
  if (resourceAction) {
    const ledger = deriveRealmLedger(state);
    view.panel = ledger.governance.available > 0 && ledger.availableOfficers > 0 ? "spending" : "people";
    if (view.panel === "spending") view.spendingCategoryId = "social_security";
    renderPanelFromTop();
    return;
  }
  const foodEmergency = event.target.closest("[data-food-emergency-town]");
  if (foodEmergency) {
    view.selectedTownId = foodEmergency.dataset.foodEmergencyTown;
    view.selectedCityId = foodEmergency.dataset.foodEmergencyCity;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.townTab = "commands";
    view.scale = "village";
    view.focusedTownCommandId = "city.cultivate";
    renderPanelFromTop();
    return;
  }
  const worldFilter = event.target.closest("[data-world-filter]");
  if (worldFilter) {
    view.worldNationFilter = worldFilter.dataset.worldFilter;
    view.worldGuideOpen = false;
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-world-guide-toggle]")) {
    view.worldGuideOpen = !view.worldGuideOpen;
    renderPanelFromTop();
    return;
  }
  const generatedShippingSite = event.target.closest("[data-generated-shipping-site-id]");
  if (generatedShippingSite) {
    view.selectedGeneratedSite = { kind: "object", id: generatedShippingSite.dataset.generatedShippingSiteId };
    view.generatedSiteInfoOpen = false;
    view.generatedMapScale = "world";
    renderMap();
    return;
  }
  const generatedMapScaleButton = event.target.closest("[data-generated-map-scale]");
  if (generatedMapScaleButton) {
    view.generatedMapScale = generatedMapScaleButton.dataset.generatedMapScale;
    view.generatedPanX = 0;
    view.generatedPanY = 0;
    view.generatedConfirmOffsetX = 0;
    view.generatedConfirmOffsetY = 0;
    renderMap();
    return;
  }
  if (event.target.closest("[data-generated-map-legend-toggle]")) {
    view.generatedMapLegendOpen = !view.generatedMapLegendOpen;
    paintGeneratedMapLegend();
    return;
  }
  const generatedMapMoveRegion = event.target.closest("[data-generated-map-move-region]");
  if (generatedMapMoveRegion) {
    view.pendingGeneratedDestinationId = generatedMapMoveRegion.dataset.generatedMapMoveRegion;
    view.pendingGeneratedTravelMode = state.generatedWorld?.travelModePreference ?? "route";
    view.selectedGeneratedSite = null;
    view.generatedSiteInfoOpen = false;
    renderMap();
    return;
  }
  if (event.target.closest("[data-generated-map-move-cancel]")) {
    view.pendingGeneratedDestinationId = null;
    view.pendingGeneratedTravelMode = "route";
    renderMap();
    return;
  }
  const generatedTravelMode = event.target.closest("[data-generated-travel-mode]");
  if (!state.generatedWorld?.travelModePreference && generatedTravelMode && ["route", "direct"].includes(generatedTravelMode.dataset.generatedTravelMode)) {
    view.pendingGeneratedTravelMode = generatedTravelMode.dataset.generatedTravelMode;
    renderMap();
    return;
  }
  const generatedTravelPreference = event.target.closest("[data-generated-travel-preference]");
  if (generatedTravelPreference && state.generatedWorld?.travelModePreference) {
    const mode = generatedTravelPreference.dataset.generatedTravelPreference;
    try {
      commit(setGeneratedTravelModePreference(state, mode), `${mode === "route" ? "道順" : "最短経路"}を地方移動の既定に設定しました。`, "confirm");
    } catch (error) {
      showToast(error.message, "danger");
    }
    return;
  }
  const generatedMoveConfirm = event.target.closest("[data-generated-map-move-confirm]");
  if (generatedMoveConfirm) {
    const regionId = generatedMoveConfirm.dataset.generatedMapMoveConfirm;
    if (!regionId || regionId !== view.pendingGeneratedDestinationId) return;
    try {
      const firstSelection = !state.generatedWorld?.travelModePreference;
      const travelMode = state.generatedWorld?.travelModePreference ?? view.pendingGeneratedTravelMode;
      const travelPlan = getGeneratedExpeditionTravelOptions(state, regionId)
        .find((option) => option.id === travelMode);
      let next = moveGeneratedExpeditionToRegion(state, regionId, { mode: travelMode });
      let smugglingCheckpointNote = "";
      if (next.player.crime?.activeSmuggling) {
        const checkpoint = inspectSmugglingCheckpoint(next);
        next = checkpoint.state;
        smugglingCheckpointNote = checkpoint.result.inspected
          ? checkpoint.result.outcome === "clear" ? " 密輸検問を通過しました。" : ` ${crimeOutcomeMessage("密輸検問", checkpoint.result)}`
          : "";
      }
      if (next.generatedWorld?.lastTravel?.encounter) next = startGeneratedTravelEncounter(next);
      const destination = getGeneratedWorldView(next).expeditionRegion;
      view.pendingGeneratedDestinationId = null;
      view.pendingGeneratedTravelMode = "route";
      await playGeneratedTravel(next, destination.name, `${travelPlan?.name ?? "道順"}で${destination.name}へ移動しました。${smugglingCheckpointNote}${firstSelection ? " この方法を既定に設定しました。以降はバックメニューのオプションから変更できます。" : ""}`, travelPlan);
    } catch (error) {
      showToast(error.message, "danger");
    }
    return;
  }
  const generatedRegionButton = event.target.closest("[data-generated-region-id]");
  if (generatedRegionButton) {
    try { commit(selectGeneratedWorldRegion(state, generatedRegionButton.dataset.generatedRegionId), "", "ui"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-ending-continue]")) {
    acknowledgeEnding();
    render();
    showToast("キャンペーン完結後の継続統治へ移りました。");
    return;
  }
  if (event.target.closest("[data-ending-reports]")) {
    acknowledgeEnding();
    view.panel = "city";
    view.selectedCityId = WORLD.nation.capital;
    view.cityTab = "reports";
    view.scale = "city";
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-cancel-reset]")) {
    view.resetOpen = false;
    renderResetModal();
    return;
  }
  if (event.target.closest("[data-confirm-reset]")) {
    void resetChronicle();
    return;
  }
  if (event.target.closest("[data-close-tile]")) {
    closeTileDetail();
    return;
  }
  if (event.target.closest("[data-open-guide]")) {
    view.guideOpen = true;
    renderGuideModal();
    return;
  }
  if (event.target.closest("[data-close-guide]")) {
    view.guideOpen = false;
    renderGuideModal();
    return;
  }
  const guideAction = event.target.closest("[data-guide-action]");
  if (guideAction) {
    followGuidance(guideAction);
    return;
  }
  const backMenuRoute = event.target.closest("[data-back-menu-route]");
  if (backMenuRoute) {
    openLedgerDrawer();
    clearTileDetailSelection();
    if (backMenuRoute.dataset.backMenuRoute === "world-statistics") {
      view.panel = "world";
      view.atlasMode = "statistics";
      view.generatedMapScale = "world";
      view.scale = "world";
    } else if (["source-peoples", "source-creatures"].includes(backMenuRoute.dataset.backMenuRoute)) {
      view.panel = "world";
      view.atlasMode = backMenuRoute.dataset.backMenuRoute === "source-peoples" ? "peoples" : "creatures";
      view.generatedMapScale = "world";
      view.scale = "world";
    } else if (backMenuRoute.dataset.backMenuRoute === "character-codex") {
      view.panel = "people";
    }
    elements.backMenu?.removeAttribute("open");
    renderPanelFromTop();
    return;
  }
  const centralDecision = event.target.closest("[data-central-decision-action]");
  if (centralDecision) {
    if (centralDecision.dataset.centralDecisionAction === "open_diplomacy") {
      view.panel = "diplomacy";
      view.selectedCountryId = "valka";
      view.selectedType = "country";
      view.selectedId = "valka";
    } else {
      view.panel = "centralization";
    }
    view.scale = "country";
    renderPanelFromTop();
    return;
  }
  const mobileMoreToggle = event.target.closest("[data-mobile-more-toggle]");
  if (mobileMoreToggle) {
    view.mobileMoreOpen = !view.mobileMoreOpen;
    renderTabs();
    return;
  }
  const mobileMoreAction = event.target.closest("[data-mobile-more-action]");
  if (mobileMoreAction) {
    view.mobileMoreOpen = false;
    if (mobileMoreAction.dataset.mobileMoreAction === "analysis") {
      view.expertMode = !view.expertMode;
      render();
    } else if (mobileMoreAction.dataset.mobileMoreAction === "back-menu") {
      elements.backMenu.open = true;
      renderTabs();
    }
    return;
  }
  const campaignNext = event.target.closest("[data-campaign-next]");
  if (campaignNext) {
    focusCampaignNextAction();
    return;
  }
  const shortcutTab = event.target.closest("[data-shortcut-tab]");
  if (shortcutTab) {
    elements.backMenu?.removeAttribute("open");
    openLedgerDrawer();
    if (!isCompactMobileShell()) clearTileDetailSelection();
    view.panel = "world";
    view.shortcutTab = shortcutTab.dataset.shortcutTab;
    view.atlasMode = "generated";
    view.generatedMapScale = "region";
    renderPanelFromTop();
    return;
  }
  const shortcutCharacter = event.target.closest("[data-shortcut-character]");
  if (shortcutCharacter) {
    view.selectedShortcutCharacterId = shortcutCharacter.dataset.shortcutCharacter;
    renderLeftPanel();
    return;
  }
  const openCharacterDetail = event.target.closest("[data-open-character-detail]");
  if (openCharacterDetail) {
    view.selectedShortcutCharacterId = openCharacterDetail.dataset.openCharacterDetail;
    view.characterDetailOpen = true;
    renderCharacterDetailModal();
    return;
  }
  if (event.target.closest("[data-close-character-detail]") || event.target === elements.characterDetailModal) {
    view.characterDetailOpen = false;
    renderCharacterDetailModal();
    return;
  }
  const panelButton = event.target.closest("[data-panel]");
  if (panelButton) {
    if (panelButton.getAttribute("aria-disabled") === "true") {
      showToast(panelButton.dataset.panel === "governance" ? "領主就任後に統治が解放されます。" : "キャリア進行によって解放されます。", "ui");
      return;
    }
    elements.backMenu?.removeAttribute("open");
    openLedgerDrawer();
    if (!isCompactMobileShell()) clearTileDetailSelection();
    view.panel = panelButton.dataset.panel;
    if (view.panel === "world") {
      view.atlasMode = "generated";
      view.generatedMapScale = "region";
      view.scale = "world";
    }
    if (view.panel === "town") {
      const localTowns = WORLD.provinces[view.selectedCityId]?.villages ?? [];
      if (!WORLD.villages[view.selectedTownId] || (localTowns.length && !localTowns.includes(view.selectedTownId))) view.selectedTownId = localTowns[0] ?? Object.keys(WORLD.villages)[0];
      view.selectedType = "village";
      view.selectedId = view.selectedTownId;
      view.selectedCityId = WORLD.villages[view.selectedTownId].province;
      view.scale = "village";
    }
    renderPanelFromTop();
    return;
  }
  const reformSystemButton = event.target.closest("[data-national-reform-system]");
  if (reformSystemButton) {
    view.selectedNationalReformSystem = reformSystemButton.dataset.nationalReformSystem;
    view.panel = "centralization";
    renderPanelFromTop();
    return;
  }
  const nationalReformButton = event.target.closest("[data-start-national-reform]");
  if (nationalReformButton) {
    const planner = nationalReformButton.closest("[data-national-reform-planner]");
    const regionIds = [...planner.querySelectorAll("[data-national-reform-region]:checked")].map((input) => input.value);
    const input = {
      systemId: nationalReformButton.dataset.startNationalReform,
      regionIds,
      methodId: planner.querySelector("[data-national-reform-method]").value,
      budgetId: planner.querySelector("[data-national-reform-budget]").value,
      officerId: planner.querySelector("[data-national-reform-officer]").value,
      concessionId: planner.querySelector("[data-national-reform-concession]").value,
    };
    const system = NATIONAL_REFORM_SYSTEMS[input.systemId];
    const method = AUTHORITY_TRANSFER_METHODS[input.methodId];
    const budget = NATIONAL_REFORM_BUDGETS[input.budgetId];
    const concession = REFORM_CONCESSIONS[input.concessionId];
    if (!window.confirm(`${system.name}を国家級改革として開始します。\n\n対象 ${regionIds.map((regionId) => WORLD.provinces[regionId].name).join("・")}\n方式 ${method.name} / ${budget.name} / ${concession.name}\n担当 ${WORLD.characters[input.officerId].name}\n\n地方勢力は特権・支持・不満・外国接触から反応を選びます。続けますか？`)) return;
    try { commit(startNationalReformPackage(state, input), `${system.name}を国家級改革として開始しました。`, "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const historyPolicyButton = event.target.closest("[data-history-policy]");
  if (historyPolicyButton) {
    const policy = HISTORY_POLICIES[historyPolicyButton.dataset.historyPolicy];
    if (!window.confirm(`歴史政策を「${policy.name}」へ変更します。\n\n${policy.description}\n短期：${policy.shortBenefit}\n長期：${policy.longRisk}\n\n現在の特権・正統性・地域服従へ反映されます。続けますか？`)) return;
    try { commit(chooseHistoryPolicy(state, policy.id), `歴史政策を「${policy.name}」へ変更しました。`, policy.id === "suppress_records" ? "event" : "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const leviathanPolicyButton = event.target.closest("[data-leviathan-policy]");
  if (leviathanPolicyButton) {
    const policy = LEVIATHAN_POLICIES[leviathanPolicyButton.dataset.leviathanPolicy];
    if (!window.confirm(`リヴァイアサン対応を「${policy.name}」へ変更します。\n\n${policy.description}\n\n沿岸行政・中央権限・外交へ波及します。続けますか？`)) return;
    try { commit(chooseLeviathanPolicy(state, policy.id), `沿岸災害対応を「${policy.name}」へ変更しました。`, "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const worldEndgameButton = event.target.closest("[data-world-endgame-action]");
  if (worldEndgameButton) {
    const actionId = worldEndgameButton.dataset.worldEndgameAction;
    const route = Object.values(WORLD_ENDGAME_ROUTES).find((entry) => entry.steps.some((step) => step.id === actionId));
    const step = route?.steps.find((entry) => entry.id === actionId);
    if (!route || !step) return;
    if (!window.confirm(`${route.name}：${step.name}\n\n${step.consequence}\n\nこの判断は世界主権の経路として保存され、別経路へ戻せません。続けますか？`)) return;
    try { commit(performWorldEndgameAction(state, actionId), `${step.name}を世界年代記へ記録しました。`, "event"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-open-specialist-ledger]")) {
    view.expertMode = true;
    view.panel = "city";
    view.cityTab = "administration";
    view.selectedCityId = WORLD.nation.capital;
    view.scale = "city";
    renderPanelFromTop();
    return;
  }
  const spendingCategoryButton = event.target.closest("[data-spending-category]");
  if (spendingCategoryButton) {
    if (view.panel === "city") view.spendingCityId = view.selectedCityId;
    else if (view.panel === "military") view.spendingCityId = "orta";
    view.spendingCategoryId = spendingCategoryButton.dataset.spendingCategory;
    view.panel = "spending";
    renderPanelFromTop();
    return;
  }
  const spendingCityButton = event.target.closest("[data-spending-city]");
  if (spendingCityButton) {
    view.spendingCityId = spendingCityButton.dataset.spendingCity;
    renderPanelFromTop();
    return;
  }
  const worldModeButton = event.target.closest("[data-world-mode]");
  if (worldModeButton) {
    view.atlasMode = worldModeButton.dataset.worldMode;
    if (view.atlasMode === "generated") view.generatedMapScale = "region";
    else if (["geopolitics", "nations", "statistics"].includes(view.atlasMode)) view.generatedMapScale = "world";
    renderPanelFromTop();
    return;
  }
  const creatureMapButton = event.target.closest("[data-show-creature-on-map]");
  if (creatureMapButton) {
    view.selectedCreatureId = creatureMapButton.dataset.showCreatureOnMap;
    view.selectedType = "creature";
    view.selectedId = view.selectedCreatureId;
    view.scale = "world";
    renderPanelFromTop();
    return;
  }
  const statisticsNationButton = event.target.closest("[data-statistics-nation]");
  if (statisticsNationButton) {
    view.selectedNationId = statisticsNationButton.dataset.statisticsNation;
    view.atlasMode = "statistics";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const generatedStatisticsNationButton = event.target.closest("[data-generated-statistics-nation]");
  if (generatedStatisticsNationButton) {
    view.selectedGeneratedNationId = generatedStatisticsNationButton.dataset.generatedStatisticsNation;
    view.atlasMode = "statistics";
    view.generatedMapScale = "world";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const generatedNationButton = event.target.closest("[data-generated-nation]");
  if (generatedNationButton) {
    view.selectedGeneratedNationId = generatedNationButton.dataset.generatedNation;
    view.atlasMode = "nations";
    view.generatedMapScale = "world";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const geopoliticalNationButton = event.target.closest("[data-geopolitical-nation]");
  if (geopoliticalNationButton) {
    view.selectedGeneratedNationId = geopoliticalNationButton.dataset.geopoliticalNation;
    view.atlasMode = "geopolitics";
    view.generatedMapScale = "world";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const worldNationButton = event.target.closest("[data-world-nation]");
  if (worldNationButton) {
    view.selectedNationId = worldNationButton.dataset.worldNation;
    if (WORLD.countries[view.selectedNationId]) {
      view.selectedType = "country";
      view.selectedId = view.selectedNationId;
      view.scale = "world";
    }
    view.atlasMode = "nations";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const worldPeopleButton = event.target.closest("[data-world-people]");
  if (worldPeopleButton) {
    view.selectedPeopleId = worldPeopleButton.dataset.worldPeople;
    view.atlasMode = "peoples";
    view.panel = "world";
    renderPanelFromTop();
    return;
  }
  const cityButton = event.target.closest("[data-select-city]");
  if (cityButton) {
    view.selectedCityId = cityButton.dataset.selectCity;
    view.selectedType = "province";
    view.selectedId = view.selectedCityId;
    view.panel = "city";
    view.scale = "city";
    renderPanelFromTop();
    return;
  }
  const townButton = event.target.closest("[data-select-town]");
  if (townButton) {
    view.selectedTownId = townButton.dataset.selectTown;
    view.selectedCityId = WORLD.villages[view.selectedTownId].province;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.scale = "village";
    renderPanelFromTop();
    return;
  }
  const cityTabButton = event.target.closest("[data-city-tab]");
  if (cityTabButton) {
    view.cityTab = cityTabButton.dataset.cityTab;
    render();
    return;
  }
  const townTabButton = event.target.closest("[data-town-tab]");
  if (townTabButton) {
    view.townTab = townTabButton.dataset.townTab;
    render();
    return;
  }
  const authorityDomainButton = event.target.closest("[data-authority-domain]");
  if (authorityDomainButton) {
    view.selectedAuthorityDomain = authorityDomainButton.dataset.authorityDomain;
    render();
    return;
  }
  const reformButton = event.target.closest("[data-start-authority-reform], [data-force-authority-reform]");
  if (reformButton) {
    const forced = reformButton.hasAttribute("data-force-authority-reform");
    if (forced && !window.confirm("準備工程を飛ばして権限を移管します。法令と実務の乖離、行政過負荷、長期的な歴史的不満が発生します。続けますか？")) return;
    try {
      const next = startAuthorityReform(
        state,
        reformButton.dataset.cityId,
        reformButton.dataset.domainId,
        reformButton.dataset.methodId,
        { forced },
      );
      commit(next, forced ? "準備不足のまま権限移管を強行しました。" : "権限改革を可視化工程から開始しました。", forced ? "event" : "confirm");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const administrationModeButton = event.target.closest("[data-administration-mode]");
  if (administrationModeButton) {
    try {
      const next = setAdministrationMode(state, administrationModeButton.dataset.cityId, administrationModeButton.dataset.administrationMode);
      commit(next, `${WORLD.provinces[administrationModeButton.dataset.cityId].name}の統治方式を変更しました。`);
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const administrationMandateButton = event.target.closest("[data-administration-mandate]");
  if (administrationMandateButton) {
    try {
      const next = setAdministrationMandate(state, administrationMandateButton.dataset.cityId, administrationMandateButton.dataset.administrationMandate);
      commit(next, `${WORLD.provinces[administrationMandateButton.dataset.cityId].name}の委任方針を変更しました。`);
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const facilitySiteButton = event.target.closest("[data-select-facility]");
  if (facilitySiteButton) {
    view.selectedFacilityId = facilitySiteButton.dataset.selectFacility;
    render();
    return;
  }
  const doctrineButton = event.target.closest("[data-doctrine]");
  if (doctrineButton) {
    try { commit(adoptDoctrine(state, doctrineButton.dataset.doctrine), `今季方針を「${DOCTRINES[doctrineButton.dataset.doctrine].name}」に定めました。`); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const townCommandLink = event.target.closest("[data-open-town-command]");
  if (townCommandLink) {
    view.selectedTownId = townCommandLink.dataset.openTownCommand;
    view.selectedCityId = WORLD.villages[view.selectedTownId].province;
    view.selectedType = "village";
    view.selectedId = view.selectedTownId;
    view.panel = "town";
    view.townTab = "commands";
    view.scale = "village";
    renderPanelFromTop();
    return;
  }
  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    openCommandAssignment(commandButton.dataset.command, commandButton.dataset.cityId, commandButton.dataset.townId ?? null);
    return;
  }
  const assignButton = event.target.closest("[data-assign-officer]");
  if (assignButton) {
    const command = COMMANDS[view.pendingCommandId];
    const cityId = command.defaultCityId ?? view.pendingCityId;
    const townId = isTownCommand(command) ? view.pendingTownId : null;
    const queued = queuePlannedOrder(
      { kind: "command", commandId: command.id, officerId: assignButton.dataset.assignOfficer, cityId, townId },
      `${WORLD.characters[assignButton.dataset.assignOfficer].name}を${townId ? `${WORLD.villages[townId].name}の` : ""}「${command.name}」へ仮配置しました。`,
    );
    if (queued) closeAssignment();
    return;
  }
  const facilityButton = event.target.closest("[data-queue-facility]");
  if (facilityButton) {
    const facility = FACILITIES[facilityButton.dataset.queueFacility];
    queuePlannedOrder(
      { kind: "facility", facilityId: facility.id, cityId: facilityButton.dataset.cityId },
      `${WORLD.provinces[facilityButton.dataset.cityId].name}の${facility.name}強化を計画へ追加しました。`,
    );
    return;
  }
  const policyButton = event.target.closest("[data-queue-policy]");
  if (policyButton) {
    const policy = POLICY_DEFINITIONS[policyButton.dataset.queuePolicy];
    const option = policy.options[policyButton.dataset.option];
    queuePlannedOrder(
      { kind: "policy", policyId: policy.id, optionId: policyButton.dataset.option, cityId: policyButton.dataset.cityId },
      `${policy.name}を「${option.name}」へ変更する計画を追加しました。`,
    );
    return;
  }
  const factionButton = event.target.closest("[data-queue-faction]");
  if (factionButton) {
    const faction = FACTION_DEFINITIONS[factionButton.dataset.queueFaction];
    const actionName = { negotiate: "交渉", subsidize: "援助", suppress: "弾圧" }[factionButton.dataset.action];
    queuePlannedOrder(
      { kind: "faction", factionId: faction.id, action: factionButton.dataset.action, cityId: factionButton.dataset.cityId },
      `${faction.name}への${actionName}を計画へ追加しました。`,
    );
    return;
  }
  const cancelButton = event.target.closest("[data-cancel-order]");
  if (cancelButton) {
    try { commit(cancelOrder(state, cancelButton.dataset.cancelOrder), "予約命令を取り消しました。", "cancel"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  if (event.target.closest("[data-end-month]")) {
    endMonth();
    return;
  }
  const eventChoiceButton = event.target.closest("[data-event-choice]");
  if (eventChoiceButton) {
    try {
      const next = resolveEventChoice(state, eventChoiceButton.dataset.eventChoice);
      commit(next, "事件への対応を月次報告へ記録しました。");
      if (next.council.pending) { view.panel = "council"; renderPanelFromTop(); }
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const forceRoleButton = event.target.closest("[data-force-role]");
  if (forceRoleButton) {
    view.assignmentOpen = true;
    view.assignmentMode = "force";
    view.pendingForceRole = forceRoleButton.dataset.forceRole;
    renderAssignmentModal();
    return;
  }
  const forceOfficerButton = event.target.closest("[data-force-officer]");
  if (forceOfficerButton) {
    try {
      const role = view.pendingForceRole;
      const next = appointForceOfficer(state, role, forceOfficerButton.dataset.forceOfficer);
      closeAssignment();
      commit(next, "東部国境軍の人事を更新しました。");
    } catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const formationButton = event.target.closest("[data-formation]");
  if (formationButton) {
    try { commit(setFormation(state, formationButton.dataset.formation), `陣形を「${FORMATIONS[formationButton.dataset.formation].name}」へ変更しました。`); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const warMapViewButton = event.target.closest("[data-war-map-view]");
  if (warMapViewButton && state.war) {
    view.warMapView = warMapViewButton.dataset.warMapView;
    if (view.warMapView === "theater") {
      view.warRegionId ??= state.war.theater?.activeRegionId ?? null;
      view.panel = "military";
    }
    renderPanelFromTop();
    return;
  }
  const warRegionButton = event.target.closest("[data-war-region]");
  if (warRegionButton && state.war) {
    view.warRegionId = warRegionButton.dataset.warRegion;
    view.selectedWarHexId = null;
    renderMap();
    return;
  }
  const warTileButton = event.target.closest("[data-war-tile]");
  if (warTileButton && state.war) {
    view.selectedWarHexId = warTileButton.dataset.warTile;
    renderWarBoard();
    return;
  }
  const modeButton = event.target.closest("[data-map-mode]");
  if (modeButton) { view.mapMode = modeButton.dataset.mapMode; render(); return; }
  const scaleButton = event.target.closest("[data-scale]");
  if (scaleButton) { view.scale = scaleButton.dataset.scale; render(); return; }
  const diplomacyCountryButton = event.target.closest("[data-diplomacy-country]");
  if (diplomacyCountryButton) { view.selectedCountryId = diplomacyCountryButton.dataset.diplomacyCountry; renderPanelFromTop(); return; }
  const borderSettlementButton = event.target.closest("[data-border-settlement]");
  if (borderSettlementButton) {
    const status = getBorderNegotiationStatus(state);
    const offer = status.offers.find((item) => item.id === borderSettlementButton.dataset.borderSettlement);
    if (!offer || !window.confirm(`「${offer.name}」で灰冠峠の通行権を確保します。\n\n${offer.description}\n\nこの決着は第三幕と年代記へ残ります。続けますか？`)) return;
    try { commit(resolveBorderNegotiation(state, offer.id), `${offer.name}が成立しました。第三幕の定着方針を選んでください。`, "peace"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const aftermathPolicyButton = event.target.closest("[data-aftermath-policy]");
  if (aftermathPolicyButton) {
    const policy = AFTERMATH_POLICIES[aftermathPolicyButton.dataset.aftermathPolicy];
    if (!policy || !window.confirm(`第三幕の方針を「${policy.name}」に定めます。\n\n${policy.description}\n\n決定後は変更できません。続けますか？`)) return;
    try { commit(chooseAftermathPolicy(state, policy.id), `第三幕を「${policy.name}」で進めます。`, "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const aftermathChoiceButton = event.target.closest("[data-aftermath-choice]");
  if (aftermathChoiceButton) {
    const decision = getAftermathDecisionStatus(state);
    const choice = decision?.choices.find((item) => item.id === aftermathChoiceButton.dataset.aftermathChoice);
    if (!choice || !window.confirm(`「${decision.title}」を「${choice.name}」で裁定します。\n\n${choice.description}\n${choice.impact}\n\n結果は年代記と実際の国力へ残ります。続けますか？`)) return;
    try { commit(resolveAftermathDecisionChoice(state, choice.id), `${decision.title}を「${choice.name}」で裁定しました。`, "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const officerDemandButton = event.target.closest("[data-officer-demand-response]");
  if (officerDemandButton) {
    const officerId = officerDemandButton.dataset.officerId;
    const politics = getOfficerPoliticalReport(state, officerId);
    const response = politics?.responses.find((item) => item.id === officerDemandButton.dataset.officerDemandResponse);
    const officerName = WORLD.characters[officerId]?.name ?? officerId;
    if (!response || !window.confirm(`${officerName}の要求へ「${response.name}」と回答します。\n\n${response.impact}\n\n人物関係と将来の任務へ残ります。続けますか？`)) return;
    try { commit(answerOfficerDemand(state, officerId, response.id), `${officerName}の要求へ「${response.name}」と回答しました。`, response.id === "refuse" ? "danger" : "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const place = event.target.closest("[data-place-id]");
  if (place) {
    const isTile = place.classList.contains("map-tile");
    view.selectedType = place.dataset.placeType;
    view.selectedId = place.dataset.placeId;
    view.selectedTileName = place.dataset.tileName ?? null;
    view.selectedTerrain = place.dataset.terrainLabel ?? null;
    view.selectedTerrainType = place.dataset.terrain ?? null;
    if (isTile) {
      const mapRect = elements.strategyMap.getBoundingClientRect();
      const tileRect = place.getBoundingClientRect();
      view.tileAnchorX = ((tileRect.left + tileRect.width / 2) - mapRect.left) / mapRect.width;
      view.tileAnchorY = ((tileRect.top + tileRect.height / 2) - mapRect.top) / mapRect.height;
      view.tileWindowOpen = true;
      renderMap();
      renderSelection();
      renderTileDetail();
      return;
    }
    view.tileWindowOpen = false;
    if (view.selectedType === "creature") { view.selectedCreatureId = view.selectedId; view.atlasMode = "creatures"; view.panel = "world"; view.scale = "world"; }
    if (view.selectedType === "province" && state.cities[view.selectedId]) { view.selectedCityId = view.selectedId; view.panel = "city"; view.scale = "city"; }
    if (view.selectedType === "country" && view.selectedId !== WORLD.nation.id) { view.selectedCountryId = view.selectedId; view.panel = "diplomacy"; }
    if (view.selectedType === "village") {
      if (state.player && !getCareerStage(state)?.governance) enterVillage(view.selectedId);
      else { view.selectedTownId = view.selectedId; view.selectedCityId = WORLD.villages[view.selectedId].province; view.panel = "town"; view.scale = "village"; }
    }
    renderPanelFromTop();
    return;
  }
  if (event.target.closest("[data-open-war]")) {
    if (state.war) return;
    view.warCouncilOpen = true;
    render();
    return;
  }
  const objectiveButton = event.target.closest("[data-objective]");
  if (objectiveButton) { view.objectiveId = objectiveButton.dataset.objective; renderWarCouncil(); return; }
  const planButton = event.target.closest("[data-war-plan]");
  if (planButton) {
    try { commit(setWarPlan(state, planButton.dataset.warPlan), "作戦方針を更新しました。"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const peaceButton = event.target.closest("[data-peace-settlement]");
  if (peaceButton) {
    const objective = WAR_OBJECTIVES[state.war.objectiveId];
    const settlement = getPeaceOptions(state).find((option) => option.id === peaceButton.dataset.peaceSettlement);
    if (!window.confirm(`「${settlement.name}」を提示します。\n\n政治目的：${objective.name}\n戦勝点 ${state.war.score.toFixed(1)} / 戦争期間 ${state.war.months}か月\n${settlement.description}\n\n講和が成立すると戦争は終了します。続けますか？`)) return;
    try { commit(negotiatePeace(state, settlement.id), "講和結果を年代記に記しました。", "peace"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const occupationPolicy = event.target.closest("[data-occupation-policy]");
  if (occupationPolicy) {
    try { commit(setOccupationPolicy(state, occupationPolicy.dataset.occupationId, occupationPolicy.dataset.occupationPolicy), "占領統治方針を更新しました。"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const garrisonButton = event.target.closest("[data-occupation-garrison]");
  if (garrisonButton) {
    try { commit(setOccupationGarrison(state, garrisonButton.dataset.occupationGarrison, Number(garrisonButton.dataset.garrisonValue)), "駐屯兵力を更新しました。"); }
    catch (error) { showToast(error.message, "danger"); }
    return;
  }
  const releaseButton = event.target.closest("[data-release-occupation]");
  if (releaseButton) {
    const occupation = state.occupations.find((item) => item.id === releaseButton.dataset.releaseOccupation);
    if (!window.confirm(`${occupation.name}の軍事占領を終了し、自治政府へ権限を移します。撤兵後は占領政策を実施できません。続けますか？`)) return;
    try { commit(releaseOccupation(state, occupation.id), "占領地域から撤兵しました。", "peace"); }
    catch (error) { showToast(error.message, "danger"); }
  }
});

function handleRoleDelegationChange(event) {
  const delegationMandate = event.target.closest("[data-delegation-mandate]");
  if (delegationMandate) {
    try { commit(setDelegationMandate(state, delegationMandate.dataset.delegationMandate, delegationMandate.value), "委任先へ重視方針を伝えました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return true;
  }
  const delegationAuthority = event.target.closest("[data-delegation-authority]");
  if (delegationAuthority) {
    try { commit(setDelegationAuthority(state, delegationAuthority.dataset.delegationAuthority, delegationAuthority.value), "担当者の通常判断に使える裁量を更新しました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return true;
  }
  const delegationHolder = event.target.closest("[data-reassign-delegation]");
  if (delegationHolder) {
    try { commit(reassignDelegatedRole(state, delegationHolder.dataset.reassignDelegation, delegationHolder.value), "担当組織を残したまま後任を交代しました。", "confirm"); }
    catch (error) { showToast(error.message, "danger"); }
    return true;
  }
  return false;
}

elements.endMonthButton.addEventListener("click", endMonth);
elements.authorityOverlaySelect?.addEventListener("change", (event) => {
  if (!event.target.value) return;
  view.mapMode = event.target.value;
  render();
});
elements.leftPanel.addEventListener("change", (event) => {
  if (handleRoleDelegationChange(event)) return;
  const nationSelect = event.target.closest("[data-generated-player-nation]");
  if (!nationSelect) return;
  try {
    const next = setGeneratedPlayerNation(state, nationSelect.value);
    const nation = getGeneratedWorldView(next).playerNation;
    view.pendingGeneratedDestinationId = null;
    view.selectedGeneratedNationId = nation.id;
    commit(next, `${nation.name}をプレイヤー国家に設定しました。`, "confirm");
  } catch (error) {
    showToast(error.message, "danger");
  }
});
elements.cityWorkspace.addEventListener("change", (event) => { handleRoleDelegationChange(event); });
elements.characterCreation.addEventListener("change", (event) => {
  if (!event.target.closest("#characterCreationRole")) return;
  view.characterDraft = rollCharacterDraft(readCharacterDraftForm(), false);
  renderCharacterCreation();
});
elements.analysisToggle?.addEventListener("click", () => {
  view.expertMode = !view.expertMode;
  render();
});
elements.audioToggle.addEventListener("click", async () => {
  const enabled = await audio.toggle();
  if (enabled) audio.play("confirm");
});
document.querySelector("#realmHome").addEventListener("click", () => {
  openLedgerDrawer();
  clearTileDetailSelection();
  if (!state.player) {
    view.panel = "council";
  } else {
    view.panel = "world";
    view.shortcutTab = "characters";
    view.selectedShortcutCharacterId = state.player.id;
    view.characterDetailOpen = true;
  }
  renderPanelFromTop();
});
elements.closeLedgerDrawer.addEventListener("click", closeLedgerDrawer);
document.querySelector("[data-close-ledger-drawer]")?.addEventListener("click", closeLedgerDrawer);
const landscapeStartButton = document.querySelector("#requestLandscape");
const landscapeGuardStatus = document.querySelector("#landscapeGuardStatus");
landscapeStartButton?.addEventListener("click", async () => {
  landscapeStartButton.disabled = true;
  landscapeStartButton.setAttribute("aria-busy", "true");
  landscapeGuardStatus.hidden = true;
  const result = await requestLandscapeMode();
  if (!result.ok) {
    landscapeGuardStatus.textContent = "このブラウザでは横画面固定を利用できません";
    landscapeGuardStatus.hidden = false;
  }
  landscapeStartButton.disabled = false;
  landscapeStartButton.removeAttribute("aria-busy");
});
const compactShellMedia = window.matchMedia("(max-width: 980px) and (orientation: landscape)");
compactShellMedia.addEventListener?.("change", () => {
  view.mobileMoreOpen = false;
  view.generatedMapLegendInitialized = false;
  renderTabs();
  paintGeneratedMapLegend();
});
document.querySelector("#saveButton").addEventListener("click", () => persist(true));
document.querySelector("#resetButton").addEventListener("click", (event) => {
  view.resetOpen = true;
  renderResetModal();
});
document.querySelector("#closeWarCouncil").addEventListener("click", () => { view.warCouncilOpen = false; renderWarCouncil(); });
elements.warCouncilModal.addEventListener("click", (event) => { if (event.target === elements.warCouncilModal) { view.warCouncilOpen = false; renderWarCouncil(); } });
elements.guideModal.addEventListener("click", (event) => {
  if (event.target === elements.guideModal) {
    view.guideOpen = false;
    renderGuideModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && view.villageConversation) {
    const dialog = document.querySelector(".village-conversation");
    const focusable = [...(dialog?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
    if (focusable.length) {
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  const editing = event.target instanceof HTMLElement && Boolean(event.target.closest("input, select, textarea, [contenteditable='true']"));
  const modalOpen = view.launchOpen || view.guideOpen || view.resetOpen || view.characterDetailOpen || view.villageConversation || view.tacticalBattle || view.battlePreparation;
  if (!editing && !modalOpen && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (event.key.toLowerCase() === "n" && state.player) {
      event.preventDefault();
      focusCampaignNextAction();
      return;
    }
    if (/^[1-6]$/.test(event.key)) {
      const shortcut = [...elements.primaryTabs.querySelectorAll(":scope > button")]
        .filter((button) => !button.hidden && button.getAttribute("aria-disabled") !== "true")[Number(event.key) - 1];
      if (shortcut) {
        event.preventDefault();
        shortcut.click();
        return;
      }
    }
  }
  if (event.key === "Escape" && view.villageConversation) {
    closeVillageConversation();
    return;
  }
  if (event.target.closest("[data-crime-ending-new]")) {
    view.endingOpen = false;
    openCharacterCreation();
    return;
  }
  if (event.key === "Escape" && view.mobileMoreOpen) {
    view.mobileMoreOpen = false;
    renderTabs();
    elements.mobileMoreToggle?.focus();
    return;
  }
  if (event.key === "Escape" && view.ledgerDrawerOpen) {
    closeLedgerDrawer();
    return;
  }
  if (event.key === "Escape" && view.characterDetailOpen) {
    view.characterDetailOpen = false;
    renderCharacterDetailModal();
    return;
  }
  if (event.key === "Escape" && view.adventureOpen && ["complete", "failed"].includes(state.adventure.activeRun?.phase)) {
    view.adventureOpen = false;
    commit(closeDungeonRun(state), "地方地図へ戻りました。", "ui");
    return;
  }
  if (event.key === "Escape" && view.tacticalBattle && (view.selectedTacticalUnitId || view.selectedTacticalCommanderId || view.selectedTacticalFortificationId)) {
    if (!view.tacticalInspectorDismissed) view.tacticalInspectorDismissed = true;
    else {
      view.selectedTacticalUnitId = null;
      view.selectedTacticalCommanderId = null;
      view.selectedTacticalFortificationId = null;
      view.tacticalInspectorDismissed = false;
    }
    renderTacticalBattle();
    return;
  }
  if (event.key === "Escape" && view.tileWindowOpen) {
    closeTileDetail();
    return;
  }
  if (event.key === "Escape" && view.guideOpen) {
    view.guideOpen = false;
    renderGuideModal();
    return;
  }
  if (event.key === "Escape" && view.resetOpen) {
    view.resetOpen = false;
    renderResetModal();
  }
});
document.querySelector("#closeAssignment").addEventListener("click", closeAssignment);
elements.assignmentModal.addEventListener("click", (event) => { if (event.target === elements.assignmentModal) closeAssignment(); });
elements.guideModal.addEventListener("click", (event) => { if (event.target === elements.guideModal) { view.guideOpen = false; renderGuideModal(); } });
elements.declareWarButton.addEventListener("click", () => {
  try {
    const estimate = getWarDeclarationEstimate(state, view.objectiveId);
    const objective = WAR_OBJECTIVES[view.objectiveId];
    const duration = estimate.estimatedMonths === null ? "講和時期は見通せません" : `講和可能まで約${estimate.estimatedMonths}か月`;
    const totalFood = estimate.totalFood === null ? "算出不能" : formatValue(estimate.totalFood);
    if (!window.confirm(`${objective.name}で宣戦します。\n${duration}、追加兵糧は累計約${totalFood}のAI概算です。\n宣戦後、月末ごとに損耗と住民被害が発生します。続行しますか？`)) return;
    const next = declareWar(state, view.objectiveId);
    view.warCouncilOpen = false;
    view.panel = "military";
    commit(next, "宣戦を布告しました。月を終えると戦役が1回進行します。", "war");
    elements.leftPanel.scrollTop = 0;
  } catch (error) { showToast(error.message, "danger"); }
});
elements.strategyMap.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-place-id]")) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
elements.warBoard.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-war-tile]")) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
elements.tacticalMapScroll?.addEventListener("scroll", positionTacticalInspector, { passive: true });
window.addEventListener("resize", positionTacticalInspector);
window.addEventListener("resize", () => {
  generatedMapVisualCache.entries.forEach((url) => URL.revokeObjectURL(url));
  generatedMapVisualCache = { key: null, url: null, entries: new Map() };
  delete elements.generatedWorldStrip.dataset.visualKey;
  renderMap();
});
window.addEventListener("beforeunload", () => persist());
window.addEventListener("pagehide", () => persist());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persist(); });
setInterval(() => persist(), AUTOSAVE_INTERVAL_MS);
elements.offlineReportModal?.addEventListener("click", (event) => {
  if (event.target === elements.offlineReportModal || event.target.closest("[data-close-offline-report]")) {
    view.offlineReportOpen = false;
    renderOfflineReport();
  }
});
elements.equipmentUpgradePrompt?.addEventListener("click", (event) => {
  if (event.target.closest("[data-accept-equipment-upgrade]")) commit(acceptEquipmentUpgrade(state), "より強力な装備へ入れ替えました。");
  if (event.target.closest("[data-dismiss-equipment-upgrade]")) commit(dismissEquipmentUpgrade(state), "装備候補を所持品へ保管しました。", null);
});

subdivideTerritoryTiles(elements.strategyMap);
render();
