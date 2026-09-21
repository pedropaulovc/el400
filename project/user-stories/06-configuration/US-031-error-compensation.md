# US-031: Error Compensation

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.3, pp. 22–29: complete LEC, SLEC Auto/Edit, reference-mark activation, 360° rotation, and PPR procedures.
- **Video:** EL400 overview §1.9, `[06:28–06:57]`: `CALib` is optional because scales are factory calibrated, but it remains an operator-reachable setup function.

## User Story

**As a** machine installer or calibration technician  
**I want** per-axis linear, segmented, or angular error compensation  
**So that** repeatable measuring-system and machine errors are corrected from a traceable reference

## Acceptance Criteria

- [ ] **AC31.1:** On a linear axis, Enter at `CALib` opens `LEC`; Right cycles between the documented `LEC` and `SLEC` methods. `C` backs out without storing an incomplete calibration. Factory defaults remain uncompensated; the UI does not invent an undocumented `oFF` calibration method.
- [ ] **AC31.2 — LEC:** Enter `LEC`, confirm `diSPuAL`, and zero the raw datum with the selected-axis key. Move from the datum to the slip gauge/reference; Enter captures the measured travel, then numeric entry plus Enter captures the reference's actual length in millimetres. The DRO shows `CAL FAC`; Enter displays the derived factor `reference ÷ measured` for review, and Enter again returns to `SAU CHG`. Once saved, the factor applies uniformly to that axis.
- [ ] **AC31.3 — SLEC Auto:** Enter `SLEC`, choose `Auto`, and confirm near the encoder reference. The selected axis's last digit flashes while waiting. Cross the actual reference mark, press Enter at the first-segment start to establish machine reference, then move to each correction point and enter its cumulative standard-measured position from that start. Support 1–99 ordered segments and reject an invalid/over-capacity table without corrupting the saved one.
- [ ] **AC31.4 — SLEC Edit:** In `SLEC`, choose `Edit`. Left/Right traverses the saved segments; X selects/edits the measured coordinate and Y selects/edits the corresponding reference coordinate. Down reaches save; only `SAU CHG` stores the revised table.
- [ ] **AC31.5 — Reference activation:** A saved SLEC table remains inactive after startup until that axis crosses its actual encoder reference mark. Crossing activates the table from its recorded reference origin; unrelated axes remain unaffected.
- [ ] **AC31.6 — Angular 360°:** On an angular axis, Enter at `CALib` opens `diSPuAL` directly. Confirm, zero at a marked stationary point, complete exactly one revolution, enter `1296000` arc-seconds, then save the derived correction.
- [ ] **AC31.7 — Angular PPR:** On an angular axis, press Right twice from `diSPuAL` to `P.P.r.`, enter the installed encoder's pulses per revolution, and save. PPR converts installed raw counts only; it must not rescale an adapter value already decoded to engineering degrees.
- [ ] **AC31.8:** Calibration method/data are per-axis drafts. Only complete calibration saved by `SAU CHG` becomes live and durable; `End`/`C` without saving leaves the prior compensation active.
- [ ] **AC31.9:** Compensation is applied to machine coordinates before ABS/INC datum subtraction and before display-only resolution or radius/diameter formatting.

## Human Verification

Using the visible debug controls, run a known 100 mm LEC mismatch and confirm the saved reading follows the reference while another axis does not. Build a multi-point SLEC table, verify no correction before the reference crossing, then cross the mark and exercise both segment interiors and boundaries. Edit one point and repeat. On an angular axis run one 360° procedure and one PPR procedure with raw-count metadata, then confirm an already-decoded angular source is not double-scaled. For each method, use an unsaved negative-control edit before the saved run.

## Automated Coverage

- [`e2e/06-configuration/US-031-calibration.spec.ts`](../../../e2e/06-configuration/US-031-calibration.spec.ts)

## Baseline Audit (before the current implementation work)

Only the visible `CALib` row existed. Enter, Left, Right, and Enter again were no-ops: there was no LEC, SLEC, reference activation, angular method, live correction, or persisted data. The procedures above are target behavior and must not be treated as verified until the integrated debug-source scenario passes.
