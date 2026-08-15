# Criminal Play Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Every production behavior follows red-green TDD and every task is committed independently.

**Goal:** Add six context-sensitive criminal actions to the existing career while preserving regional reputation, save compatibility, and the current adventure/governance loops.

**Architecture:** Each crime owns its opportunity, preview, and execution flow. `src/crime-system.js` owns only normalized state, incident recording, heat, contacts, accomplice decisions, sentences, monthly decay, and a shared result envelope. Existing adventure, travel, battle, domain, history, and UI modules consume those APIs rather than duplicating crime state.

**Tech Stack:** Browser-native ES modules, Node.js `node:test`, existing deterministic generated-world and tactical systems, no new runtime dependency.

## Global Constraints

- Crime is an action option inside the existing 10-stage career, never a separate career.
- Implement theft, robbery, smuggling, extortion, sabotage, and assassination in one release.
- Use outcomes exactly: `success_hidden`, `success_exposed`, `failed_escaped`, `captured`.
- Heat gains are exactly theft 15, smuggling 20, extortion 25, robbery 35, sabotage 45, assassination 70.
- Heat labels are 0-19 `平常`, 20-39 `警戒`, 40-69 `指名手配`, 70-100 `厳戒`.
- Minor heat decays by 5 only after two quiet months outside the jurisdiction. Serious unresolved incidents floor heat at 40; assassination floors it at 70.
- Never subtract criminal consequences from positive regional reputation.
- Stolen goods fence for 40% of normal value; safehouses unlock at local contact trust 20.
- Assassination capture ends the run. Domestic sovereign crime becomes abuse of power; foreign crime remains subject to foreign law.
- Do not add indiscriminate civilian harm, aliases/disguises, detailed evidence simulation, or criminal-organization territory politics.
- Preserve existing save data and unrelated work. No external runtime libraries or network dependency.
- Update repo docs, the implementation ledger, related Notion specs, and Notion change history in the same change. Do not push.

---

### Task 1: Shared crime state and consequences

**Files:**
- Create: `src/crime-system.js`
- Create: `tests/crime-system.test.mjs`
- Modify: `src/player-career.js`, `src/monthly-simulation.js`

**Interfaces:**
- Produce `CRIME_SCHEMA_VERSION`, `CRIME_OUTCOMES`, `CRIME_HEAT_GAINS`, `normalizeCrimeState(state)`, `getCrimeStatusView(state, context)`, `previewCrimeRisk(input)`, `recordCrimeIncident(state, incident)`, `resolveAccompliceDecision(state, input)`, `discoverUnderworldContacts(state, context)`, `fenceStolenItem(state, input)`, `advanceCrimeMonth(state)`, `resolveCrimeSentence(state, input)`.
- `recordCrimeIncident` returns a cloned next state and accepts type, severity, perpetrator, accomplices, victim/target, jurisdiction, reward, outcome, detected flag, and history text.

- [ ] Write failing tests for empty-state migration, exact heat thresholds/gains, four outcomes, reputation independence, two-month minor decay, serious/capital floors, contact discovery, 40% fencing, safehouse trust, accomplice accept/refuse/report, light/serious/capital sentences, assassination game over, and sovereign abuse conversion.
- [ ] Run `node --test tests/crime-system.test.mjs` and confirm failures are caused by missing APIs.
- [ ] Implement the minimal shared state and consequence APIs, wire normalization into career creation/load and monthly advancement, and keep deterministic calculations pure.
- [ ] Re-run the focused test, then `node --test tests/player-career.test.mjs tests/regional-reputation.test.mjs tests/simulation.test.mjs`.
- [ ] Commit as `feat: add shared criminal consequence state`.

### Task 2: Theft, extortion, and the local underworld

**Files:**
- Create: `src/theft-system.js`, `src/extortion-system.js`
- Create: `tests/theft-system.test.mjs`, `tests/extortion-system.test.mjs`
- Modify: `src/village-life.js`, `src/adventure-system.js`

**Interfaces:**
- Produce `getTheftOpportunities`, `previewTheft`, `executeTheft`, `getExtortionOpportunities`, `previewExtortion`, `executeExtortion`, `collectExtortionPayment`.
- Opportunities require stable settlement and target IDs and return risk labels, expected reward, preparation requirements, and maximum penalty without exposing percentages.

- [ ] Write failing tests for shop/warehouse theft targets, deterministic results, stolen-item provenance, detected heat, one-off and recurring extortion, repeat-pressure retaliation, and tavern contact/fence flows.
- [ ] Verify the focused tests fail for the missing behavior.
- [ ] Implement the two distinct flows and connect them to real personal wealth, inventories, village merchants, NPC relations, and the common incident sink.
- [ ] Run both focused files plus `tests/village-life.test.mjs` and `tests/adventure-system.test.mjs`.
- [ ] Commit as `feat: add theft extortion and local underworld`.

### Task 3: Road robbery and cross-border smuggling

**Files:**
- Create: `src/robbery-system.js`, `src/smuggling-system.js`
- Create: `tests/robbery-system.test.mjs`, `tests/smuggling-system.test.mjs`
- Modify: `src/adventure-system.js`, `src/generated-world-system.js`

**Interfaces:**
- Produce `getRobberyOpportunities`, `previewRobbery`, `startRobbery`, `resolveRobberyThreat`, `resolveRobberyBattle`, `getSmugglingOffers`, `acceptSmugglingOffer`, `inspectSmugglingCheckpoint`, `deliverSmugglingCargo`.
- Robbery may hand off to the existing tactical engine. Smuggling cargo is a mission item and checkpoints occur only when crossing a jurisdiction boundary.

- [ ] Write failing tests for seeded caravans, intimidation and battle branches, casualty persistence, loot and heat, smuggling offer/cargo/destination persistence, border-only inspection, successful delivery, seizure, escape, and capture.
- [ ] Verify the focused tests fail for the intended missing APIs.
- [ ] Implement both flows using existing travel time, regional adjacency, nation ownership, tactical battle, and incident APIs.
- [ ] Run the focused tests plus generated travel, generated world, and tactical battle regression files.
- [ ] Commit as `feat: add robbery and smuggling flows`.

### Task 4: Sabotage, assassination, and political consequences

**Files:**
- Create: `src/sabotage-system.js`, `src/assassination-system.js`
- Create: `tests/sabotage-system.test.mjs`, `tests/assassination-system.test.mjs`
- Modify: `src/regional-domain-system.js`, `src/history-model.js`

**Interfaces:**
- Produce `getSabotageTargets`, `startSabotage`, `prepareSabotage`, `executeSabotage`, `getAssassinationTargets`, `startAssassination`, `prepareAssassination`, `executeAssassination`.
- Target adapters must expose stable IDs and actual mutable backing state. Assassination targets are only generated characters and regional lords explicitly marked targetable; protected story and unique characters stay excluded.

- [ ] Write failing tests for three-stage preparation, real road/fort/facility degradation, recovery compatibility, target filtering, companion participation, target death and office vacancy, capital heat/capture game over, detected serious/capital world history, and domestic sovereign abuse pressure.
- [ ] Verify the focused tests fail for missing behavior.
- [ ] Implement the two flows and their domain/history adapters without inventing targets that are not backed by current state.
- [ ] Run focused tests plus regional-domain and history-model regressions.
- [ ] Commit as `feat: add sabotage assassination and abuse consequences`.

### Task 5: Contextual UI and playable recovery flow

**Files:**
- Modify: `src/app.js`, `styles.css`
- Create: `tests/criminal-ui.test.mjs`

**Interfaces:**
- Consume all crime opportunity/preview/execute/status APIs.
- Add contextual `非合法` sections to settlement, road/border, person, and strategic-target views; add `犯罪歴・手配・裏社会` to the career view.

- [ ] Write failing static UI tests for imports, contextual controls, risk/penalty copy, ARIA state, status board, sentence/surrender, safehouse, escape, pardon, and asylum controls.
- [ ] Verify the UI test fails for missing markup and handlers.
- [ ] Implement the UI with the existing dialogue/commit patterns, preserving map position, landscape drawer behavior, and mobile shell dimensions.
- [ ] Run `node --test tests/criminal-ui.test.mjs tests/map-visual.test.mjs tests/back-menu.test.mjs tests/player-career.test.mjs`.
- [ ] Serve the worktree and verify theft, smuggling, capture, safehouse, and career-status flows at 844x390 and 1366x768 with no horizontal overflow; close browser and server.
- [ ] Commit as `feat: expose contextual criminal play flows`.

### Task 6: Documentation, ledger, and release verification

**Files:**
- Modify: `README.md`, `MANUAL.md`, `PROJECT_STATUS.md`, `src/project-status-data.js`, `CHANGELOG.md`
- Test: `tests/project-status.test.mjs`, relevant manual/source checks

**Interfaces:**
- Add a status-ledger item whose evidence cites the crime public APIs and regression tests; update audit date to 2026-08-16.

- [ ] Write or update failing documentation/status tests for the six criminal flows, implementation classification, source references, and player-facing manual route.
- [ ] Verify those tests fail before documentation/status changes.
- [ ] Update all repository documentation and status evidence, preserving configured/unintroduced distinctions for anything not on the normal route.
- [ ] Update the linked Notion specification pages and mandatory `仕様変更・更新履歴` with date, summary, reason, impact, implementation, tests, and final commit reference.
- [ ] Run `npm run check`, then inspect `git diff --check`, `git status --short`, and the complete plan acceptance checklist.
- [ ] Commit as `docs: document criminal play flow implementation`.

