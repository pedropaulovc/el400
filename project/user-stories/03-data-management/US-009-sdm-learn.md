# US-009: SDM Learn Mode

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §§8.2 and 8.2.2.  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** to capture exact live XYZ positions into persistent sub-datum steps  
**So that** I can teach a machining sequence without retyping coordinates

## Target Acceptance Criteria
- [x] **AC 9.1:** SDM opens the three-option menu in manual order `ProGrAn` → `rUn` → `LEArn`; arrows select `LEArn` and `ent` confirms.
- [x] **AC 9.2:** `StEPno` defaults to 1. `Y`, digits and `ent` select any step from 1 through 1000; 0 and 1001 are rejected without entering capture.
- [x] **AC 9.3:** Active Learn shows the exact current compensated X/Y/Z coordinates.
- [x] **AC 9.4:** The first X press shows the current step number; the second X press stores all three live coordinates exactly and advances to the next step. X is both the documented confirmation key and one coordinate being captured; its value must not be replaced with zero.
- [x] **AC 9.5:** Captures share the same 1000-slot SDM store as Program and Run and persist across reload/power-up using the simulator's non-volatile storage.
- [x] **AC 9.6:** `C` exits without corrupting already committed steps.

## Verification
The headed run observed the manual menu order and exact `StEPno` prompt with default step 1. Learn captured live step 7 as `24.9600`, `1.0000`, `-3.0000`; Program read back all three coordinates, including X, and Run loaded the same values after reload. Step 1000 persisted, while 1001 remained at the prompt and did not enter capture. The run sampled the default, a sparse slot and the upper boundary rather than all 1000 slots.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/03-data-management/US-009-sdm-learn.spec.ts`](../../../e2e/03-data-management/US-009-sdm-learn.spec.ts)

