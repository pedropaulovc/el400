# US-035: External Machine Connection

**Source:** [CNCjs](https://github.com/cncjs/cncjs) and the simulator's data-interface contract
**Priority:** P1
**Category:** Integration

## User Story

**As a** machinist using CNCjs  
**I want** the DRO to show live controller positions and an honest connection state  
**So that** simulator functions operate on the connected machine data and degrade clearly when disconnected

## Target Acceptance Criteria

- [x] **AC 35.1 — Live data:** With `source=cncjs`, real CNCjs socket/controller reports update visible X/Y/Z positions through the production adapter and mill store.
- [x] **AC 35.2 — Responsiveness:** An accepted mock-CNCjs movement becomes visible within 100 ms, measured from received controller event to displayed value.
- [x] **AC 35.3 — Connection state:** Outside the EL400 face, a visible `role="status"` element with `data-testid="connection-status"` reports exactly `Machine connection: Connecting`, `Connected`, `Disconnected`, or `Manual input` from production mill-store state.
- [x] **AC 35.4 — Disconnect behavior:** A CNCjs serial-port close changes the visible state to Disconnected and leaves the simulator usable for manual value entry; serial-port reopen changes it back to Connected and resumes live updates.
- [x] **AC 35.5 — URL configuration:** `source=cncjs` accepts host and port, plus supported token/session/serial-port parameters. With no host, it connects to the page's origin for a same-origin CNCjs mount.
- [x] **AC 35.6 — Embedded widget:** The actual application loads inside a same-origin iframe/CNCjs widget fixture, connects through the production CNCjs path, displays a mock movement, and retains operator interaction. A localStorage-only probe is not iframe coverage.
- [x] **AC 35.7 — Debug separation:** `source=debug` uses the visible debug adapter and controls for simulator feature tests. `source=mock` is not a supported URL source and must not appear in procedures.

No broad per-controller support table is claimed without an exercised production adapter fixture for that controller dialect.

## Verification notes

A dedicated mock CNCjs protocol service drove the production `CncjsMillAdapter` in headed Chromium. X=25.4, Y=-12.7, and Z=6.35 mm rendered as 1.0000, -0.5000, and 0.2500 inches. A second movement reached the display in 68.1 ms from request start. Closing and reopening the mock serial port changed the visible status from Connected to Disconnected and back, allowed manual entry while disconnected, and resumed controller updates afterward. The real application also connected and accepted operator input inside a same-origin iframe.

An engineering-source recheck changed the configured scale resolution from SC 1.0 to SC 5.0 while mock CNCjs X remained 10 mm; the display stayed 10.0000 mm in both cases because controller positions are already engineering millimetres. Live X=12.5, disconnect, and reconnect also passed. Mock service logs recorded socket connections, room joins, movement events, controller-state emissions, and reconnection. No physical CNC controller, serial port, or non-GRBL controller dialect was exercised.

## Verification Procedure

Use [`e2e/09-integration/US-035-external-machine-connection.spec.ts`](../../../e2e/09-integration/US-035-external-machine-connection.spec.ts) with the real mock CNCjs server. Assert visible X/Y/Z movement, elapsed display latency, `connection-status` text, serial-port close/open transitions, manual operation after disconnect, and recovery. Mount the real app in a same-origin CNCjs iframe fixture and repeat a CNCjs position update inside the frame. Feature-only tests use `DROPage.goto({ source: 'debug', skipBootMessage: true })`; integration tests retain `source: 'cncjs'`.

See the [verification evidence and full-suite results](../README.md#verification).

## Related Stories

- US-003: ABS/INC Mode
- US-032: Touch Probe
- US-036: Settings Persistence
