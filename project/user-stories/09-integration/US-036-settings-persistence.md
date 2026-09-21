# US-036: Settings Persistence

**Source:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf), §6.2, and the simulator persistence architecture
**Priority:** P1
**Category:** Integration

## User Story

**As a** machinist  
**I want** saved setup values to survive reloads in standalone and embedded use  
**So that** each session starts with the configuration I deliberately stored

## Target Acceptance Criteria

- [x] **AC 36.1 — Saved transaction:** Setup edits remain draft values until `SAU ChG`; saving updates the live simulator synchronously and persists them. `C`/End without save discards the draft.
- [x] **AC 36.2 — Units and beep:** Saved inch/mm and beep values survive reload and immediately control the readout/audio gate.
- [x] **AC 36.3 — Display resolution:** Saved per-axis `dP`/`displayResolution` values survive reload and immediately change the production readout. The unrelated generic `precision` field is not the operator's dP control.
- [x] **AC 36.4 — Complete setup state:** Other saved non-volatile setup values, including direction, scale/calibration, probe, and auxiliary settings, restore from the same source of truth.
- [x] **AC 36.5 — Embedded use:** The actual application running in a same-origin iframe/CNCjs widget reads and writes the same persisted state and retains saved settings after frame reload. A storage API smoke check alone is insufficient.
- [x] **AC 36.6 — Per-axis restore behavior:** `rSt oEm` restores only the selected axis configuration from its captured OEM baseline, or that axis's shipped defaults when no OEM baseline exists. It preserves global settings, every other axis, and user job data such as SDMs, reference positions, datums, and six-output programs.
- [x] **AC 36.7 — Storage contract:** Persistence uses the existing Zustand key `el400-dro-non-volatile-memory`. Writes are synchronous with the accepted save/reset action; there is no invented 300 ms debounce.

## Verification notes

The headed persistence session discarded an unsaved X `dP` draft, then saved and reloaded units, beep, separate X/Y display resolutions, and a front-panel SDM point. Selected-X OEM restore returned X to its captured baseline while preserving Y, global settings, and the SDM; the factory fallback did the same with no OEM snapshot. The actual application retained a saved unit change after reloading inside a same-origin iframe.

A separate restore session preserved the six-output program, count, global `Cont` mode, probe diameter, and probe length through selected-X restore and reload. The restored probe geometry was exercised through X and Z edge measurements, and the output comparators reproduced their previous states. Operator programs and counts are job data, separate from non-volatile setup state. The headed checks used browser reload and iframe reload rather than power-loss fault injection, and they did not independently change every non-volatile field in this lane.

## Verification Procedure

In [`e2e/09-integration/US-036-settings-persistence.spec.ts`](../../../e2e/09-integration/US-036-settings-persistence.spec.ts):

1. Make setup changes through the real front panel, verify unsaved discard, then save and reload.
2. Assert operator-visible units, beep gating, and per-axis dP rather than only inspecting JSON.
3. Capture an OEM baseline with X dP 10, then save X dP 50, Y dP 20, global beep off, and a real front-panel-programmed SDM step. Select X and run `rSt oEm`; verify X returns to 10 while Y remains 20, beep remains off, and the SDM survives reset and reload. Repeat without an OEM snapshot: selected X returns to its factory configuration while Y, beep, and the SDM remain unchanged.
4. Load the real app in the same-origin iframe/CNCjs fixture, save a setting inside it, reload the frame, and verify the rendered state.

See the [verification evidence and full-suite results](../README.md#verification). The full gate covers the persistence contract; the headed evidence above records the settings and job-data families exercised directly.

## Related Stories

- US-025: Keypad Beep
- US-027: Save Changes
- US-028: Restore OEM Defaults
- US-035: External Machine Connection

## References

- [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf), §6.2, pp. 20–21
