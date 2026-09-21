# US-011: SDM Run Mode

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §§8.2, 8.2.3 and 8.3.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to run persistent sub-datum steps as live distance-to-go coordinates  
**So that** I can machine each programmed location by moving all axes to zero

## Target Acceptance Criteria
- [x] **AC 11.1:** SDM opens a sibling-mode menu in manual order `ProGrAn` → `rUn` → `LEArn`; arrows select `rUn` and `ent` enters Run. Program and Learn are not nested inside Run.
- [x] **AC 11.2:** `StEPno` defaults to 1. `Y`, digits and `ent` select a stored step from 1–1000.
- [x] **AC 11.3:** `ent` displays live X/Y/Z distance-to-go as stored sub-datum minus the current compensated displayed coordinate, using the same persisted data written by Program or Learn.
- [x] **AC 11.4:** `6►` advances to the next step; the SDM indicator remains lit throughout active Run.
- [x] **AC 11.5:** The automatic Near Zero Warning operates at and within 0.05 mm on physical target-bearing axes and cannot be disabled by `BUZZ`.
- [x] **AC 11.6:** `C` exits, extinguishes the SDM indicator and restores live ABS counting without deleting the program.

## Verification
The headed run selected Run directly from the sibling Program/Run/Learn menu and loaded persisted Learn step 7. Its live distance-to-go matched stored target minus current position, advanced to empty sparse step 8, returned to step 7 and exited without deleting the program. A targeted recheck with `BUZZ` and keypad beep off observed no warning at `0.0600` mm and the mandatory warning at both `0.0500` and `0.0400` mm. Step 1000 persistence was checked in Program rather than physically run, and no physical speaker output was claimed.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/03-data-management/US-011-sdm-run.spec.ts`](../../../e2e/03-data-management/US-011-sdm-run.spec.ts)

