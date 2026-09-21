# US-005: Axis Reset and Set

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §§7.3–7.4.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to zero or preset one axis  
**So that** I can establish the required datum without altering unrelated axes

## Target Acceptance Criteria
- [x] **AC 5.1:** An axis quick-zero key immediately makes that axis read zero at its configured resolution; the default simulator rendering is `0.0000`, not a universal three-decimal value.
- [x] **AC 5.2:** ABS zero/preset redefines the selected work datum; INC zero/preset changes only its independent temporary datum.
- [x] **AC 5.3:** Axis select → signed numeric entry → `ent` makes the selected axis display the requested value.
- [x] **AC 5.4:** Preset conversion accounts for active unit, source decoding, radius/diameter scale and Direction. Under `riGht`, a requested positive value remains positive after commit and later motion continues from it correctly.
- [x] **AC 5.5:** `C` removes one pending character without changing the datum, as specified in §7.4. With an empty buffer, another `C` cancels axis selection; other axes remain unchanged.

## Verification
The headed run quick-zeroed X, Y and Z at nonzero physical positions in both ABS and INC. Signed presets, uncommitted-entry cancellation and unrelated-axis preservation all passed. Positive presets remained positive under saved `riGht` directions and subsequent motion followed the reversed slope. The run also covered `riGht` with diameter mode and confirmed that operator datums and settings survived reload.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/02-core-operations/US-005-zero-axes.spec.ts`](../../../e2e/02-core-operations/US-005-zero-axes.spec.ts)
