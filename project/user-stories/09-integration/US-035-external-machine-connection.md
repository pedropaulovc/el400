# US-035: External Machine Connection

**Source:** Data Interface Architecture and CNCjs integration contract
**Priority:** P1
**Category:** Integration

## User Story

**As a** machinist using CNCjs  
**I want** the DRO to show live controller positions and an honest connection state  
**So that** simulator functions operate on the connected machine data and degrade clearly when disconnected

## Target Acceptance Criteria

- [ ] **AC 35.1 — Live data:** With `source=cncjs`, real CNCjs socket/controller reports update visible X/Y/Z positions through the production adapter and mill store.
- [ ] **AC 35.2 — Responsiveness:** An accepted mock-CNCjs movement becomes visible within 100 ms, measured from received controller event to displayed value.
- [ ] **AC 35.3 — Connection state:** Outside the EL400 face, a visible `role="status"` element with `data-testid="connection-status"` reports exactly `Machine connection: Connecting`, `Connected`, `Disconnected`, or `Manual input` from production mill-store state.
- [ ] **AC 35.4 — Disconnect behavior:** A CNCjs serial-port close changes the visible state to Disconnected and leaves the simulator usable for manual value entry; serial-port reopen changes it back to Connected and resumes live updates.
- [ ] **AC 35.5 — URL configuration:** `source=cncjs` accepts host and port, plus supported token/session/serial-port parameters. With no host, it connects to the page's origin for a same-origin CNCjs mount.
- [ ] **AC 35.6 — Embedded widget:** The actual application loads inside a same-origin iframe/CNCjs widget fixture, connects through the production CNCjs path, displays a mock movement, and retains operator interaction. A localStorage-only probe is not iframe coverage.
- [ ] **AC 35.7 — Debug separation:** `source=debug` uses the visible debug adapter and controls for simulator feature tests. `source=mock` is not a supported URL source and must not appear in procedures.

No broad per-controller support table is claimed without an exercised production adapter fixture for that controller dialect.

## Baseline Audit (before this correction/implementation pass)

The completed headed audit proved the debug adapter path and measured an 11 ms debug-control-to-display update. Static adapter evidence covered CNCjs URL parsing and controller normalization. It confirmed that no visible connection indicator existed. CNCjs live movement, disconnect/reconnect, and an actual iframe/widget were not exercised; the old E2E merely loaded the CNCjs fixture or checked same-origin storage and therefore did not satisfy AC 35.1, 35.3, 35.4, or 35.6.

## Verification Procedure

Use [`e2e/09-integration/US-035-external-machine-connection.spec.ts`](../../../e2e/09-integration/US-035-external-machine-connection.spec.ts) with the real mock CNCjs server. Assert visible X/Y/Z movement, elapsed display latency, `connection-status` text, serial-port close/open transitions, manual operation after disconnect, and recovery. Mount the real app in a same-origin CNCjs iframe fixture and repeat a CNCjs position update inside the frame. Feature-only tests use `DROPage.goto({ source: 'debug', skipBootMessage: true })`; integration tests retain `source: 'cncjs'`.

Newly implemented connection UI and iframe coverage remain pending integrated verification.

## Related Stories

- US-003: ABS/INC Mode
- US-032: Touch Probe
- US-036: Settings Persistence
