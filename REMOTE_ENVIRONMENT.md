# Remote environment operations

This repository is designed to run from local computers or a shared VPS without copying an active working directory between machines.

## Sources of truth

- Git is the source of truth for code and history.
- The project Notion page is the source of truth for operating decisions, handoffs, and verification records.
- The configured hosting or storage service is the source of truth for production data and secrets.
- A VPS checkout is reproducible infrastructure, not the only backup and not a substitute for Git.

## Host roles

Set `REMOTE_HOST_ROLE` before running checks when the host performs a specialized role. The available roles and their requirements are declared in `remote-environment.json`. The default role is `development`.

Never copy OAuth tokens, browser profiles, private keys, `.env` files, Wrangler state, or credential stores between computers. Authenticate each authorized host independently.

## Commands

```text
npm run remote:check
npm run remote:setup
npm run remote:verify
npm run remote:guard-deploy
```

- `remote:check` verifies Git, Node, required tools, the selected host role, and environment-variable presence without printing secret values.
- `remote:setup` runs the version-controlled bootstrap commands for the current operating system.
- `remote:verify` runs the project verification commands after the readiness check passes.
- `remote:guard-deploy` verifies that the selected host role is authorized to publish. It does not deploy by itself.

## VPS workflow

1. Connect with a dedicated non-root SSH account and a separate SSH key for each client device.
2. Clone the repository on the VPS; do not synchronize `node_modules`, virtual environments, build caches, or active Git working trees.
3. Set `REMOTE_HOST_ROLE=development`, then run `npm run remote:setup` and `npm run remote:verify`.
4. Use a task branch or Git worktree for each concurrent change.
5. Commit and merge completed work into main, then record the commit and verification result in Notion. Push only when explicitly requested.
6. Perform browser, Passkey, notification, media-device, PowerShell-only, and LAN-only checks on the designated local host.

Development servers should listen on localhost by default. Use SSH port forwarding, an authenticated tunnel, or a private VPN when remote browser access is required. Do not expose Codex app-server or unauthenticated development ports directly to the internet.

## Current verification focus

As of 2026-09-05, the canonical Generation V3 check uses Node.js 22, `npm run check`, and a localhost browser run of `index.html`. The deterministic 50-year fixture `v3-race-history-600` must retain completed generated wars, non-saturated national conditions, all four external-crisis types, and the persisted settlement market economy. Browser verification must cover the world-crisis panel, local projected crisis symbol, and a market purchase changing persisted inventory and price at desktop and 390×844 viewports, then close the browser and local server.

The only game entry is `index.html`. `group-battle.html` requires a pending V3 mission and returns to the field after cancellation or battle resolution. Verify current-save reload and rejection of outdated save versions at both viewports; legacy standalone pages are retired. Use Node.js 22 and close the browser and local server after verification.

Solo automation verification also uses Node.js 22 and `tests/v3-auto-mode.test.mjs`. In the canonical browser flow, select a preset, change detailed options, start/pause/resume, interrupt with manual input, and reload to prove settings persist while execution stays paused. Cover onsite trade conditions, monthly observation, and desktop / 390×844 controls. This is a development-host check; push, publication and NAS reflection remain separate.

As of 2026-09-07, also verify discovery stopping and survey return, reports surviving movement logs, map browsing during execution, action-boundary interruption, trade plan revision preserving spent budget and cargo, current-price single sale and cargo return, related-world-event filtering, and the shared combat forecast. The specification is `docs/superpowers/specs/2026-09-07-v3-auto-experience.md`.

## Continuous V3 campaign verification (2026-09-07)

Use Node.js 22, `npm run check`, and the canonical `index.html` flow. Open 人物史・統治, earn local service, obtain a generated-region appointment, exercise policies and diplomacy, complete both institutional endings in separate worlds, and reload before continuing the same world. Inspect treasury, real market stocks, current ownership and monthly chronology. Domain scenarios and browser actions must be recorded separately. Test PC and 390×844 controls, blocked choices, keyboard focus and failure recovery. Close every task-owned browser and local server before handoff.
