import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { buildTerritorySectorPaths, TERRITORY_SECTOR_COUNT } from "../src/map-tiles.js";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const worldDossierNavigationSource = readFileSync(new URL("../src/world-dossier-navigation.js", import.meta.url), "utf8");
const generatedWorldSource = readFileSync(new URL("../src/generated-world-system.js", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const manualSource = readFileSync(new URL("../MANUAL.md", import.meta.url), "utf8");
const oceanAsset = new URL("../assets/generated/world-map-ocean-painted.png", import.meta.url);
const landAsset = new URL("../assets/generated/world-map-land-painted.png", import.meta.url);
const locationSceneAssets = [
  new URL("../assets/generated/castle-main-courtyard.png", import.meta.url),
  new URL("../assets/generated/dungeon-main-cave.png", import.meta.url),
  new URL("../assets/generated/fort-main-yard.png", import.meta.url),
];
const countryIds = ["forest_alliance", "vinia", "heavens_gate", "lustrond", "izmenia", "valka", "selena", "deadland", "great_empire", "avanheln"];

test("every mapped nation subdivides each major region into three territory tiles", () => {
  for (const countryId of countryIds) {
    const block = markup.match(new RegExp(`<g class="country-group [^"]+" data-country="${countryId}"[\\s\\S]*?<\\/g>`))?.[0];
    assert.ok(block, `${countryId} must have a country group`);
    const declaredCount = Number(block.match(/data-tile-count="(\d+)"/)?.[1]);
    const majorRegionCount = block.match(/class="province map-tile/g)?.length ?? 0;
    assert.ok(majorRegionCount >= 3, `${countryId} must contain at least three major regions`);
    assert.equal(declaredCount, majorRegionCount * TERRITORY_SECTOR_COUNT, `${countryId} tile count must include every generated sector`);
    assert.equal(block.match(/data-tile-name="[^"]+"/g)?.length, majorRegionCount);
    assert.equal(block.match(/data-terrain-label="[^"]+"/g)?.length, majorRegionCount);
    assert.match(block, /class="nation-outline"/);
    const landmassPath = block.match(/class="country-landmass"[^>]*d="([^"]+)"/)?.[1];
    const outlinePath = block.match(/class="nation-outline"[^>]*d="([^"]+)"/)?.[1];
    assert.equal(landmassPath, outlinePath, `${countryId} coast must match its national outline exactly`);
  }
});

test("左端タブはショートカットだけを切り替え、人物詳細は独立窓で開く", () => {
  assert.match(markup, /data-shortcut-tab="world"/);
  assert.match(markup, /data-shortcut-tab="characters"/);
  assert.match(markup, /id="characterDetailModal"[^>]*role="dialog"/);
  assert.match(appSource, /function renderCharacterShortcutPanel/);
  assert.match(appSource, /data-open-character-detail/);
  assert.match(appSource, /view\.panel = "world";\s*view\.shortcutTab/s);
  assert.match(styleSource, /\.character-detail-modal\s*\{/);
});

test("生成世界地図はポインタドラッグとタッチスワイプでカメラを移動できる", () => {
  assert.match(appSource, /generatedWorldScroll\?\.addEventListener\("pointerdown"/);
  assert.match(appSource, /setPointerCapture/);
  assert.match(appSource, /view\.generatedPanX/);
  assert.match(appSource, /view\.generatedPanY/);
  assert.match(styleSource, /\.generated-world-scroll\s*\{[^}]*touch-action:\s*none/s);
  assert.match(appSource, /data-drag-generated-confirm/);
  assert.match(appSource, /floatingWindowGesture/);
  assert.match(styleSource, /--confirm-x/);
});

test("normal play generates the whole world, then zooms to region-level movement", () => {
  const initialView = appSource.match(/const view = \{[\s\S]*?\n\};/)?.[0] ?? "";
  const resetFlow = appSource.match(/async function resetChronicle[\s\S]*?function costLabel/)?.[0] ?? "";
  const launchFlow = appSource.match(/const launchAction = event\.target\.closest[\s\S]*?const developerAction/)?.[0] ?? "";
  assert.equal(markup.match(/data-launch-action="new"/g)?.length, 1);
  assert.doesNotMatch(markup, /data-launch-action="new-generated"|FIXED WORLD/);
  assert.match(markup, /人物ごとに地形と国家を生成/);
  assert.match(markup, /地方でプレイ/);
  assert.match(manualSource, /各国は複数地域で構成/);
  assert.match(appSource, /const showGeneratedWorld = !showWarBoard/);
  assert.match(appSource, /generatedMapScale: "region"/);
  assert.match(initialView, /panel: "world"/);
  assert.match(initialView, /scale: "world"/);
  assert.match(resetFlow, /panel: "world"[\s\S]*?atlasMode: "generated"[\s\S]*?generatedMapScale: "region"/);
  assert.match(resetFlow, /view\.launchOpen = false;\s+view\.guideOpen = false;/);
  assert.match(launchFlow, /view\.panel = "world";/);
  assert.match(launchFlow, /view\.atlasMode = "generated";/);
  assert.match(launchFlow, /view\.generatedMapScale = "region";/);
  assert.match(appSource, /resolveWorldDossierNavigation\(event\.target/);
  assert.match(worldDossierNavigationSource, /value === "generated"\) patch\.generatedMapScale = "region"/);
  assert.match(appSource, /getGeneratedExpeditionReachableRegions\(state\)/);
  assert.match(appSource, /expeditionTile/);
  assert.match(appSource, /dataset\.generatedTileId = tile\.id/);
  assert.doesNotMatch(appSource, /expeditionRegion\.markerIndex \?\? expeditionRegion\.anchorIndex/);
  assert.match(appSource, /隣接地方/);
  assert.doesNotMatch(appSource, /data-generated-region-candidate-id/);
  assert.match(appSource, /data-generated-map-move-confirm/);
  assert.match(appSource, /data-generated-map-move-cancel/);
  assert.match(appSource, /data-generated-map-move-region/);
  assert.match(appSource, /positionGeneratedRegionMoveTargets\(copy, runtime, expeditionRegion, expeditionTile, viewport\)/);
  assert.match(appSource, /const positionedTiles = region\.tileIndices/);
  assert.match(appSource, /\?\? positionedTiles\[0\]/);
  assert.match(appSource, /Math\.max\(2, Math\.min\(98, target\.left\)\)/);
  assert.match(appSource, /renderGeneratedRegionMoveConfirmation\(copy, runtime, viewport\)/);
  assert.match(appSource, /移動を実行すると世界時刻が進みます/);
  assert.match(appSource, /pendingGeneratedTravelMode: "route"/);
  assert.match(appSource, /data-generated-travel-mode/);
  assert.match(appSource, /初回のみ移動方法を選択/);
  assert.match(appSource, /既定の移動方法/);
  assert.match(appSource, /バックメニューの「システム → 地方移動」から変更できます/);
  assert.match(appSource, /data-generated-travel-preference/);
  const mapMoveSelection = appSource.match(/const generatedMapMoveRegion = event\.target\.closest[\s\S]*?const generatedMoveConfirm/)?.[0] ?? "";
  assert.match(mapMoveSelection, /view\.pendingGeneratedDestinationId = generatedMapMoveRegion\.dataset\.generatedMapMoveRegion/);
  assert.doesNotMatch(mapMoveSelection, /moveGeneratedExpeditionToRegion/);
  const mapMoveConfirmation = appSource.match(/const generatedMoveConfirm = event\.target\.closest[\s\S]*?const generatedRegionButton/)?.[0] ?? "";
  assert.match(mapMoveConfirmation, /const travelMode = state\.generatedWorld\?\.travelModePreference \?\? view\.pendingGeneratedTravelMode/);
  assert.match(mapMoveConfirmation, /moveGeneratedExpeditionToRegion\(state, regionId, \{ mode: travelMode \}\)/);
  assert.match(mapMoveConfirmation, /await playGeneratedTravel\(next, destination\.name/);
  assert.match(styleSource, /\.generated-region-move-target\s*\{[^}]*touch-action: manipulation;[^}]*pointer-events: auto;/s);
  assert.match(styleSource, /\.generated-region-move-layer\s*\{[^}]*z-index:\s*8;/s);
  assert.match(styleSource, /\.generated-site-marker-layer,[\s\S]*?z-index:\s*7;/);
  assert.match(styleSource, /\.map-caption\s*\{[^}]*pointer-events:\s*none;/s);
  assert.doesNotMatch(appSource, /data-generated-region-destination-id/);
  assert.match(appSource, /function generatedRegionViewport\(/);
  assert.match(appSource, /generatedRegionViewport\(expeditionRegion, expeditionTile, runtime\)/);
  assert.match(appSource, /copy\.dataset\.cameraTileId = expeditionTile\.id/);
  assert.match(appSource, /positionGeneratedRegionMarker\(copy, expeditionRegion, expeditionTile, runtime, viewport\)/);
  assert.match(appSource, /`現在地｜\$\{expeditionRegion\.name\}`/);
  assert.doesNotMatch(appSource, /現在地｜\$\{expeditionRegion\.name\}｜\$\{personalMap\.currentLocation\.name\}/);
  assert.match(appSource, /aria-label="現在地"/);
  assert.doesNotMatch(appSource, /<span><b>現在地<\/b><small>/);
  assert.match(styleSource, /@keyframes generated-current-location-pulse/);
  assert.match(appSource, /function generatedMapVisibleObjectIds\(/);
  assert.match(appSource, /illustrated-strategy-map-v8-european-settlement-hierarchy/);
  assert.match(appSource, /copy\.dataset\.visibleObjectCount/);
  assert.match(manualSource, /実在欧州の都市網を参考に/);
  assert.match(generatedWorldSource, /tile\.regionId/);
  assert.doesNotMatch(appSource, /function renderGeneratedRegionCells/);
  assert.doesNotMatch(appSource, /generated-region-layer/);
  assert.match(generatedWorldSource, /width: 192/);
  assert.match(generatedWorldSource, /height: 120/);
  assert.match(appSource, /clientWidth/);
  assert.match(appSource, /clientHeight/);
  assert.match(generatedWorldSource, /expeditionRegionId/);
  assert.match(generatedWorldSource, /pathRegionIds/);
  assert.match(appSource, /pixelsPerTile: 8/);
  assert.match(appSource, /illustrated-strategy-map-v8-european-settlement-hierarchy/);
  assert.match(styleSource, /\.generated-world-copy\s*\{[^}]*width: 100%;[^}]*height: 100%;/s);
  assert.match(appSource, /x \+ 0\.5 - viewport\.x/);
  assert.match(appSource, /tile\.y \+ 0\.5 - viewport\.y/);
  assert.doesNotMatch(appSource, /generatedDestinationId = tile\.id/);
  for (const type of ["castle", "city", "town", "village", "fort"]) {
    assert.match(markup, new RegExp(`class="is-${type}"`));
  }
});

test("undiscovered regions are shown with a subdued gray knowledge overlay", () => {
  const overlayFunction = appSource.match(/function generatedUnknownRegionOverlay\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(overlayFunction, /new Set\(discoveredRegionIds \?\? \[\]\)/);
  assert.match(overlayFunction, /if \(discovered\.has\(region\.id\)\) return/);
  assert.match(overlayFunction, /region\.tileIndices/);
  assert.match(appSource, /class="generated-region-knowledge-layer"/);
  assert.match(appSource, /generatedState\.discoveredRegionIds/);
  assert.match(appSource, /\.\.\.generatedState\.discoveredRegionIds, expeditionRegion\.id/);
  assert.match(appSource, /dataset\.unknownRegionCount/);
  assert.match(styleSource, /\.generated-region-knowledge-layer path\s*\{[^}]*fill: #77817f;[^}]*opacity: \.48;[^}]*mix-blend-mode: saturation;/s);
  assert.match(styleSource, /\.generated-region-knowledge-layer\s*\{[^}]*pointer-events: none;/s);
});

test("map shell keeps the map visible and moves detailed information into an opt-in drawer", () => {
  const leftDock = markup.match(/<aside class="left-dock"[^>]*>[\s\S]*?<\/aside>/)?.[0] ?? "";
  assert.match(leftDock, /class="left-hud"/);
  assert.match(leftDock, /class="grand-topbar"/);
  assert.match(leftDock, /class="campaign-bar"/);
  assert.match(leftDock, /id="leftPanel"/);
  assert.match(leftDock, /id="ledgerDrawer"[^>]*aria-hidden="true"/);
  assert.match(leftDock, /id="closeLedgerDrawer"/);
  assert.match(appSource, /class="generated-command-status"/);
  assert.doesNotMatch(appSource, /class="generated-move-command"/);
  assert.doesNotMatch(appSource, /<h2>地方へ移動<\/h2>/);
  assert.match(styleSource, /Portrait-first play kit/);
  assert.match(styleSource, /\.strategy-shell\s*\{[^}]*height: 100dvh;[^}]*grid-template-columns: 72px minmax\(0, 1fr\);/s);
  assert.match(styleSource, /\.ledger-drawer\s*\{[^}]*position: fixed;[^}]*visibility: hidden;/s);
  assert.match(styleSource, /\.ledger-drawer\.is-open\s*\{[^}]*visibility: visible;/s);
  assert.match(appSource, /ledgerDrawerOpen: false/);
  assert.match(appSource, /function openLedgerDrawer\(\)/);
});

test("compact portrait phones use a fixed top-map-bottom shell without page scrolling", () => {
  const primaryTabs = markup.match(/<nav class="primary-tabs"[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? "";
  const expectedOrder = [
    'data-shortcut-tab="world"',
    'data-shortcut-tab="characters"',
    'data-panel="governance"',
    'data-panel="centralization"',
    'data-panel="council"',
    'data-mobile-more-toggle',
  ];
  expectedOrder.reduce((previousIndex, marker) => {
    const index = primaryTabs.indexOf(marker);
    assert.ok(index > previousIndex, `${marker} must keep its fixed mobile position`);
    return index;
  }, -1);
  assert.match(primaryTabs, /id="mobileMoreMenu"[^>]*hidden/);
  assert.match(primaryTabs, /data-panel="spending"/);
  assert.match(primaryTabs, /data-panel="city"/);
  assert.match(primaryTabs, /data-panel="town"/);
  assert.match(primaryTabs, /data-panel="diplomacy"/);
  assert.match(primaryTabs, /data-panel="military"/);
  assert.match(markup, /id="ledgerDrawerScrim"[^>]*hidden/);
  const portraitPass = styleSource.match(/2026-08 mobile portrait readability pass[\s\S]*$/)?.[0] ?? "";
  assert.match(portraitPass, /--compact-topbar-height: 94px/);
  assert.match(portraitPass, /--compact-navbar-height: calc\(64px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(styleSource, /@media \(max-width: 980px\) and \(orientation: portrait\)[\s\S]*?\.primary-tabs\s*\{[^}]*grid-column: 1;[^}]*grid-row: 3;[^}]*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/s);
  assert.match(portraitPass, /\.ledger-drawer\s*\{[^}]*top: max\(calc\(var\(--compact-topbar-height\) \+ 80px\), 34dvh\);[^}]*bottom: var\(--compact-navbar-height\);[^}]*left: 0;[^}]*width: 100%;/s);
  assert.match(styleSource, /overscroll-behavior: contain/);
});

test("compact portrait readability overrides keep identity, navigation, and ledger copy legible", () => {
  const readabilityPass = styleSource.match(/2026-08 mobile portrait readability pass[\s\S]*$/)?.[0] ?? "";
  assert.match(readabilityPass, /--compact-topbar-height: 94px/);
  assert.match(readabilityPass, /--compact-navbar-height: calc\(64px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(readabilityPass, /\.left-hud \.realm-identity\s*\{[^}]*display: flex;/s);
  assert.match(readabilityPass, /\.primary-tabs > button[\s\S]*?font-size: 12px/);
  assert.match(readabilityPass, /\.ledger-drawer\s*\{[^}]*width: 100%;/s);
  assert.match(readabilityPass, /\.ledger-drawer \.panel-body :where\(small, span, strong, b, button, dt, dd\)/);
  assert.match(readabilityPass, /\.launch-actions\s*\{\s*grid-template-columns: 1fr;/);
  assert.match(readabilityPass, /\.goddess-prologue\.is-selecting \.goddess-character-setup\s*\{[^}]*right: 12px;[^}]*left: 12px;[^}]*width: auto;/s);
  assert.match(readabilityPass, /\.goddess-prologue\.is-selecting \.goddess-character-setup \.character-creation-form input,[\s\S]*?height: 44px;/);
});

test("compact mobile navigation preserves map state and exposes accessible locked and drawer states", () => {
  assert.match(appSource, /mobileMoreOpen: false/);
  assert.match(appSource, /function isCompactMobileShell\(\)[\s\S]*?max-width: 980px\) and \(orientation: portrait\)/);
  assert.match(appSource, /compactShellMedia = window\.matchMedia\("\(max-width: 980px\) and \(orientation: portrait\)"\)/);
  assert.match(appSource, /aria-current/);
  assert.match(appSource, /aria-disabled/);
  assert.match(appSource, /data-mobile-more-toggle/);
  assert.match(appSource, /data-close-ledger-drawer/);
  assert.match(appSource, /ledgerDrawerFocusTimer = setTimeout\([\s\S]*?elements\.closeLedgerDrawer\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(appSource, /lastLedgerDrawerTrigger\?\.focus\?\.\(\)/);
  assert.match(appSource, /if \(!isCompactMobileShell\(\)\) clearTileDetailSelection\(\)/);
  assert.match(appSource, /generatedMapLegendInitialized: false/);
  assert.match(appSource, /view\.generatedMapLegendOpen = !isCompactMobileShell\(\)/);
  assert.ok(
    appSource.indexOf('event.key === "Escape" && view.characterDetailOpen')
      < appSource.indexOf('event.key === "Escape" && view.ledgerDrawerOpen'),
    "Escape must close the foreground character dialog before its drawer",
  );
});

test("compact landscape screens offer an app-controlled portrait start action", () => {
  assert.match(markup, /id="portraitGuardTitle">縦画面でゲームを開始/);
  assert.match(markup, /id="requestPortrait"[^>]*>縦画面で開始/);
  assert.match(markup, /id="portraitGuardStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(styleSource, /@media \(max-width: 980px\) and \(orientation: landscape\)[\s\S]*?\.portrait-guard\s*\{[\s\S]*?display: grid;/);
  assert.doesNotMatch(styleSource, /@media \(orientation: portrait\)[\s\S]*?visibility: hidden !important/);
});

test("personal log ticker shows four rows and the full chronicle folds after ten entries", () => {
  assert.match(appSource, /state\.player\.history\.slice\(0, PERSONAL_CHRONICLE_TICKER_LIMIT\)/);
  assert.match(appSource, /class="chronicle-ticker-row"/);
  assert.match(appSource, /function renderPersonalChronicle\(/);
  assert.match(appSource, /class="career-history-year"/);
  assert.match(appSource, /10件を超えた記録は年ごとに収納/);
  assert.match(styleSource, /\.chronicle-ticker\s*\{[^}]*max-height: 92px;[^}]*display: grid;/s);
  assert.match(styleSource, /\.career-history-year > summary/);
});

test("generated map legend sits at the upper right and can be shown or hidden", () => {
  assert.match(markup, /id="generatedWorldMapHelp"/);
  assert.match(markup, /data-generated-map-legend-toggle/);
  assert.match(markup, /aria-controls="generatedMapLegendBody"/);
  assert.doesNotMatch(markup, /実在欧州の都市網を参考に/);
  assert.match(styleSource, /\.generated-world-map-help\s*\{[^}]*right: 16px;[^}]*top: 70px;/s);
  assert.match(styleSource, /\.generated-world-map-help\.is-collapsed \.generated-map-help-body/);
  assert.match(appSource, /generatedMapLegendOpen: true/);
  assert.match(appSource, /function paintGeneratedMapLegend\(/);
  assert.match(appSource, /data-generated-map-legend-toggle/);
  assert.match(manualSource, /生成地図の凡例と表示規則/);
  assert.match(manualSource, /実在欧州の都市網を参考に/);
});

test("world-map travel persists time and plays a visible route, clock, progress, and daylight transition", () => {
  assert.match(markup, /id="generatedWorldTime"/);
  assert.match(markup, /id="generatedTravelOverlay"/);
  assert.match(markup, /id="generatedTravelProgress"/);
  assert.match(generatedWorldSource, /expeditionClockMinutes/);
  assert.match(generatedWorldSource, /getGeneratedWorldTimeView/);
  assert.match(generatedWorldSource, /GENERATED_TRAVEL_MODES/);
  assert.match(generatedWorldSource, /encounterChance: 0\.06/);
  assert.match(generatedWorldSource, /encounterChance: 0\.38/);
  assert.match(generatedWorldSource, /pathTileIds/);
  assert.match(appSource, /async function playGeneratedTravel\(/);
  assert.match(appSource, /marker\?\.animate\(/);
  assert.match(appSource, /generatedTravelPathData\(pathTiles/);
  assert.match(appSource, /requestAnimationFrame\(tick\)/);
  assert.match(appSource, /await playGeneratedTravel\(next, destination\.name/);
  assert.match(appSource, /await playGeneratedTravel\(next, site\.name/);
  assert.match(appSource, /await playGeneratedTravel\(next, result\.locationName/);
  assert.match(styleSource, /\.generated-travel-route\.is-active/);
  assert.match(styleSource, /data-world-phase="night"/);
  assert.match(styleSource, /data-world-phase="dusk"/);
  assert.match(styleSource, /\.generated-world-map\.is-traveling/);
});

test("generated maps expose coastal settlement hierarchy, sea lanes, and port-gated shipping commands", () => {
  assert.match(markup, /漁港・港・湾口都市/);
  assert.match(markup, /<i class="is-sea-route"><\/i>海路/);
  assert.match(generatedWorldSource, /getGeneratedShippingDestinations/);
  assert.match(generatedWorldSource, /travelMode,/);
  assert.match(generatedWorldSource, /港に停泊して海路/);
  assert.match(appSource, /class="generated-shipping-command"/);
  assert.match(appSource, /data-generated-shipping-site-id/);
  assert.match(appSource, /site\.travelMode === "sea"/);
  assert.match(styleSource, /\.generated-shipping-list/);
  assert.match(styleSource, /\.generated-site-marker\.is-fishing_port/);
  assert.match(styleSource, /\.generated-site-marker\.is-port/);
  assert.match(styleSource, /\.generated-site-marker\.is-bay_city/);
});

test("roadside expansion leaves blank land and exposes an arrival-gated colonization action", () => {
  assert.doesNotMatch(markup, /街道外には集落のない空白地帯/);
  assert.match(manualSource, /街道外には集落のない空白地帯/);
  assert.match(manualSource, /地方名声25/);
  assert.match(markup, /<i class="is-colony">旗<\/i>植民候補/);
  assert.match(generatedWorldSource, /GENERATED_OBJECT_MIN_DISTANCE/);
  assert.match(generatedWorldSource, /getGeneratedColonizationView/);
  assert.match(generatedWorldSource, /moveGeneratedExpeditionToColonizationSite/);
  assert.match(generatedWorldSource, /foundGeneratedVillage/);
  assert.match(generatedWorldSource, /roadsideDistance > ROADSIDE_SETTLEMENT_MAX_OFFSET/);
  assert.match(generatedWorldSource, /urbanDistance > maximumExpansionRadius/);
  assert.match(generatedWorldSource, /GENERATED_COLONY_REQUIRED_REPUTATION = 25/);
  assert.match(generatedWorldSource, /getRegionalReputationReport/);
  assert.match(generatedWorldSource, /hasRequiredReputation/);
  assert.match(appSource, /data-generated-site-kind="colony"/);
  assert.match(appSource, /data-found-generated-village/);
  assert.match(appSource, /村を建設する/);
  assert.match(appSource, /必要な信用/);
  assert.match(appSource, /仕官後に領主の依頼/);
  assert.match(styleSource, /\.generated-site-marker\.is-colony/);
});

test("monster nests and intelligent barbarian settlements are visible as managed frontier threats", () => {
  assert.match(markup, /<i class="is-monster_nest">巣<\/i>魔物の巣/);
  assert.match(markup, /<i class="is-barbarian">蛮<\/i>蛮族・都市国家/);
  assert.match(appSource, /getGeneratedBarbarianView\(state\)/);
  assert.match(appSource, /data-generated-site-kind="barbarian"/);
  assert.match(styleSource, /\.generated-site-marker\.is-monster_nest/);
  assert.match(styleSource, /\.generated-site-marker\.is-barbarian_city_state/);
});

test("world affairs is a player-known timeline learned through rumors or nearby presence", () => {
  const panel = appSource.match(/function renderWorldGeopolitics\(\)[\s\S]*?function renderWorldPeoples/)?.[0] ?? "";
  assert.match(panel, /getGeneratedWorldIntelligenceView\(state\)/);
  assert.match(panel, /getKnownGeneratedWorldWarView\(state\)/);
  assert.match(panel, /住人の噂/);
  assert.match(panel, /現場・近傍/);
  assert.match(panel, /把握済みの列国戦争/);
  assert.match(panel, /攻撃理論/);
  assert.match(panel, /防衛理論/);
  assert.match(panel, /侵攻進捗/);
  assert.match(panel, /新しく知った順/);
  assert.doesNotMatch(panel, /国家別戦略|二国間関係|判断要因/);
  assert.match(styleSource, /\.known-world-war-doctrines/);
  assert.match(styleSource, /--war-progress/);
});

test("map landmarks stay clear while local actions live in the left panel without allowing a dungeon bypass", () => {
  const generatedPanel = appSource.match(/function renderGeneratedWorldPanel\(\)[\s\S]*?function nationPeopleChips/)?.[0] ?? "";
  assert.doesNotMatch(markup, /id="personalMapOverlay"/);
  assert.match(appSource, /function renderPersonalMapCommand\(/);
  assert.doesNotMatch(appSource, /elements\.personalMapOverlay/);
  assert.match(generatedPanel, /renderPersonalMapCommand\(personalMap\)/);
  assert.match(appSource, /data-personal-map-explore/);
  assert.match(appSource, /data-personal-map-move/);
  assert.match(appSource, /発見済みの近くの場所だけ/);
  assert.match(appSource, /data-generated-site-kind="object"/);
  assert.match(appSource, /data-generated-site-kind="dungeon"/);
  assert.match(appSource, /class="generated-site-action-menu/);
  assert.match(appSource, /data-generated-site-info/);
  assert.match(appSource, /data-generated-site-move/);
  assert.match(appSource, /moveGeneratedExpeditionToSite\(state, site\.id\)/);
  assert.match(appSource, /movePersonalMap\(state, currentAdventureContext\(\), site\.id\)/);
  assert.match(appSource, /location\.reachable/);
  assert.match(appSource, /location\.current/);
  assert.match(styleSource, /\.personal-map-command\s*\{/);
  assert.doesNotMatch(styleSource, /\.personal-map-overlay\s*\{/);
  assert.doesNotMatch(appSource, /class="personal-map-board"/);
  assert.match(styleSource, /\.generated-site-action-menu\s*\{/);
  assert.match(styleSource, /\.generated-site-marker:not\(\.is-dungeon\)/);
  assert.match(styleSource, /\.generated-site-marker\.is-village\s*\{\s*z-index:\s*1;/);
  assert.match(styleSource, /\.generated-site-marker\.is-town\s*\{\s*z-index:\s*3;/);
  assert.match(styleSource, /\.generated-site-marker\.is-city\s*\{\s*z-index:\s*4;/);
  assert.match(styleSource, /\.generated-site-marker\.is-castle\s*\{\s*z-index:\s*5;/);
  const enterVillageSection = appSource.match(/function enterVillage\(villageId\)[\s\S]*?function renderVillageEntrySection/)?.[0] ?? "";
  assert.match(enterVillageSection, /view\.characterDetailOpen = false/);
});

test("castle, dungeon, and fort open dedicated background-led command scenes only after arrival", () => {
  const sceneContext = appSource.match(/function activeLocationSceneContext\(\)[\s\S]*?function enterLocationScene/)?.[0] ?? "";
  const sceneWorkspace = appSource.match(/function renderLocationWorkspace\(\)[\s\S]*?function villageFacilityActions/)?.[0] ?? "";
  const dungeonEntryHandler = appSource.match(/const dungeonEntry = event\.target\.closest[\s\S]*?if \(event\.target\.closest\("\[data-personal-map-explore\]"\)/)?.[0] ?? "";
  const dungeonStartHandler = dungeonEntryHandler.match(/const dungeonStart[\s\S]*?return;\s*\}/)?.[0] ?? "";

  for (const asset of locationSceneAssets) {
    assert.equal(existsSync(asset), true, `${asset.pathname} must exist`);
    assert.ok(statSync(asset).size > 1_000_000, `${asset.pathname} must be a production background`);
  }
  assert.match(appSource, /castle-main-courtyard\.png/);
  assert.match(appSource, /dungeon-main-cave\.png/);
  assert.match(appSource, /fort-main-yard\.png/);
  assert.match(appSource, /CASTLE COMMAND/);
  assert.match(appSource, /DUNGEON COMMAND/);
  assert.match(appSource, /FORT COMMAND/);
  assert.match(appSource, /new Set\(\["career", "people", "world", "village", "location"/);
  assert.match(sceneContext, /!site\.current/);
  assert.match(sceneContext, /!location\?\.discovered \|\| !location\.current/);
  assert.match(appSource, /data-enter-location-kind="\$\{site\.locationKind\}"/);
  assert.match(appSource, /locationId: \["castle", "fort"\]\.includes\(site\.type\) && site\.current/);
  assert.match(sceneWorkspace, /class="village-choice-overlay location-choice-overlay/);
  assert.match(sceneWorkspace, /data-location-zone/);
  assert.match(sceneWorkspace, /data-location-action/);
  assert.match(sceneWorkspace, /data-start-dungeon/);
  assert.match(dungeonEntryHandler, /enterLocationScene\("dungeon", dungeon\.id\)/);
  assert.doesNotMatch(dungeonEntryHandler.split("const dungeonStart")[0], /startDungeonRun/);
  assert.match(dungeonStartHandler, /startDungeonRun\(state, dungeon, context\.region\)/);
  assert.match(dungeonStartHandler, /activeLocationSceneContext\(\)/);
  assert.match(styleSource, /body\.is-location-focus/);
  assert.match(styleSource, /\.location-choice-overlay\.is-castle/);
  assert.match(styleSource, /\.location-choice-overlay\.is-dungeon/);
  assert.match(styleSource, /\.location-choice-overlay\.is-fort/);
  assert.match(styleSource, /\.location-action-result\s*\{/);
});

test("world, geopolitics, nation, and statistics panels share one generated-world representation", () => {
  const generatedPanel = appSource.match(/function renderGeneratedWorldPanel\(\)[\s\S]*?function nationPeopleChips/)?.[0] ?? "";
  const statisticsPanel = appSource.match(/function renderWorldStatistics\(\)[\s\S]*?function renderWorldPanel/)?.[0] ?? "";
  assert.doesNotMatch(generatedPanel, /generated-world-overview|この人物の世界シード/);
  assert.match(statisticsPanel, /generated-world-overview/);
  assert.match(statisticsPanel, /この人物の世界シード/);
  assert.match(statisticsPanel, /naturalBorderShare/);
  assert.match(appSource, /function renderWorldGeopolitics\(\)/);
  assert.match(appSource, /\["geopolitics", "nations", "statistics"\]\.includes\(view\.atlasMode\)/);
  assert.match(appSource, /image\.src = generatedMapVisualCache\.url/);
  assert.match(appSource, /URL\.createObjectURL\(new Blob\(\[mapSvg\]/);
  assert.match(appSource, /URL\.revokeObjectURL\(generatedMapVisualCache\.entries\.get\(oldestKey\)\)/);
  assert.doesNotMatch(appSource, /data-generated-statistics-nation="\$\{item\.nationId\}"/);
});

test("terrain mode covers the map's major landform categories", () => {
  assert.match(markup, /data-map-mode="terrain"/);
  assert.match(markup, /class="terrain-legend"/);
  for (const terrain of ["forest", "plains", "hills", "mountains", "highlands", "wetland", "coast", "badlands"]) {
    assert.match(markup, new RegExp(`data-terrain="${terrain}"`));
  }
});

test("territory records retain curved edges for the displaced geographic border layer", () => {
  const paths = [...markup.matchAll(/class="province map-tile[^"]*"[^>]*d="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths.length, 62);
  assert.ok(paths.every((path) => /[QC]/.test(path)), "every territory tile must include a curved boundary");
});

test("territory subdivision produces 186 curved, selectable small regions", () => {
  const horizontal = buildTerritorySectorPaths({ x: 10, y: 20, width: 180, height: 80 }, 0);
  const vertical = buildTerritorySectorPaths({ x: 10, y: 20, width: 70, height: 180 }, 1);
  assert.equal(horizontal.length, TERRITORY_SECTOR_COUNT);
  assert.equal(vertical.length, TERRITORY_SECTOR_COUNT);
  assert.deepEqual(horizontal.map((sector) => sector.label), ["西部", "中央", "東部"]);
  assert.deepEqual(vertical.map((sector) => sector.label), ["北部", "中央", "南部"]);
  assert.ok([...horizontal, ...vertical].every((sector) => sector.d.includes("Q")));
  const totalDeclared = [...markup.matchAll(/data-tile-count="(\d+)"/g)].reduce((total, match) => total + Number(match[1]), 0);
  assert.equal(totalDeclared, 186);
  assert.match(appSource, /subdivideTerritoryTiles\(elements\.strategyMap\)/);
});

test("the political overlay uses stylized atlas textures clipped to exact national landmasses", () => {
  for (const asset of [oceanAsset, landAsset]) {
    assert.ok(existsSync(asset));
    assert.ok(statSync(asset).size > 1_000_000);
  }
  assert.match(markup, /class="map-ocean-texture"[^>]*world-map-ocean-painted\.png/);
  assert.match(markup, /id="atlasLandTexture"[\s\S]*data-href="\.\/assets\/generated\/world-map-land-painted\.png"/);
  assert.match(appSource, /strategyMap\.querySelectorAll\("image\[data-href\]"\)/);
  assert.doesNotMatch(markup, /terrain-satellite|world-terrain-satellite\.png/);
  assert.equal(markup.match(/class="country-landmass"/g)?.length, countryIds.length);
  assert.match(markup, /id="borderDisplace"/);
  assert.match(styleSource, /filter: url\(#borderDisplace\)/);
  assert.match(styleSource, /\.country-landmass/);
  assert.match(styleSource, /\.map-mode-terrain \.province/);
  assert.match(styleSource, /\.strategy-map\s*\{[^}]*overflow: hidden;/s);
  assert.match(styleSource, /\.strategy-map:not\(\.scale-world\) \.great-power,/);
});

test("clicking a tile is wired to a compact terrain dossier", () => {
  assert.match(markup, /id="tileDetailWindow"[^>]*role="dialog"/);
  assert.match(markup, /data-close-tile/);
  assert.match(appSource, /const TERRAIN_TILE_PROFILES/);
  assert.match(appSource, /function renderTileDetail\(\)/);
  assert.match(appSource, /view\.tileWindowOpen = true/);
  assert.match(appSource, /profile\.movement/);
  assert.match(appSource, /profile\.resources/);
});

test("world scale opens first while the country frontier and three great powers remain available", () => {
  assert.match(markup, /class="strategy-map scale-country" viewBox="20 35 960 585"/);
  assert.match(markup, /data-scale="world">世界/);
  assert.match(markup, /data-scale="country" class="is-active">国家/);
  assert.equal(markup.match(/class="country-group [^"]*great-power"/g)?.length, 3);
  for (const countryId of ["deadland", "great_empire", "avanheln"]) {
    assert.match(markup, new RegExp(`data-country="${countryId}"[^>]*data-rank="great-power"`));
  }
  assert.match(markup, /data-country="deadland"[^>]*transform="translate\(-5 194\) scale\(\.78\)"/);
  assert.match(markup, /data-country="great_empire"[^>]*transform="translate\(213 20\) scale\(\.88\)"/);
  assert.match(markup, /data-country="avanheln"[^>]*transform="translate\(120 178\) scale\(\.9 \.82\)"/);
  assert.match(appSource, /world: "0 0 1800 1050"/);
  assert.match(appSource, /country: "20 35 960 585"/);
  assert.match(appSource, /scale: "world"/);
});

test("strategic map exposes castle garrisons, armies, routes, and a live pass state", () => {
  assert.equal(markup.match(/class="map-node city castle-node/g)?.length, 4);
  for (const id of ["mapForceSelene", "mapForceNereia", "mapForceOrta", "mapForceValka", "frontierArmyStrength", "enemyArmyStrength", "passStatusText"]) {
    assert.match(markup, new RegExp(`id="${id}"`));
  }
  assert.match(markup, /class="army-layer"/);
  assert.match(markup, /class="strategic-fronts"/);
  assert.match(styleSource, /\.castle-node/);
  assert.match(styleSource, /\.army-marker/);
  assert.match(styleSource, /\.hostile-corridor/);
  assert.match(appSource, /function renderStrategicMapState\(\)/);
  assert.match(appSource, /renderStrategicMapState\(\);/);
  assert.match(appSource, /state\.war \? `交戦中/);
});

test("world scale marks Leviathan as a selectable extreme-creature hazard", () => {
  assert.match(markup, /class="leviathan-layer world-only"/);
  assert.match(markup, /data-place-type="creature" data-place-id="leviathan"/);
  assert.match(markup, /超規格外生物/);
  assert.match(markup, /class="leviathan-danger-zone"/);
  assert.match(markup, /legend-leviathan/);
  assert.match(styleSource, /\.strategy-map:not\(\.scale-world\) \.world-only/);
  assert.match(styleSource, /\.leviathan-marker\.is-selected \.leviathan-danger-zone/);
  assert.match(appSource, /view\.selectedType === "creature"/);
  assert.match(worldDossierNavigationSource, /data-show-creature-on-map/);
});
