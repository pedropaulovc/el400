# US-010: SDM Program Mode

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §§8.2 and 8.2.1.  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** to enter persistent XYZ sub-datums from a drawing  
**So that** Run mode can guide me through the programmed sequence

## Target Acceptance Criteria
- [x] **AC 10.1:** SDM opens `ProGrAn` by default, followed in arrow order by `rUn` and `LEArn`; `ent` on `ProGrAn` enters Program.
- [x] **AC 10.2:** The prompt is exactly `StEPno` and defaults to step 1. `Y`, digits and `ent` jump to any step 1–1000; 0/1001 are not valid slots.
- [x] **AC 10.3:** X, Y and Z each accept signed coordinates for the selected step, confirmed with `ent`, without changing physical machine position.
- [x] **AC 10.4:** `6►` commits the complete step and advances; `4◄`/`6►` navigate previous/next steps at the step prompt.
- [x] **AC 10.5:** Program, Learn and Run use one 1000-step source of truth, and committed XYZ values persist across reload/power-up.
- [x] **AC 10.6:** `C` exits and restores normal live counting without discarding earlier committed steps.

## Verification
The headed run observed `ProGrAn` first, the exact `StEPno` label and default step 1. It entered and overwrote signed XYZ values at sparse step 42 without moving the physical axes, then confirmed commit, advance and readback. Step 1000 persisted across reload and remained intact after selected-axis OEM restore; 1001 stayed visibly rejected at the prompt. Intermediate slots were not exhaustively swept.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/03-data-management/US-010-sdm-program.spec.ts`](../../../e2e/03-data-management/US-010-sdm-program.spec.ts)

