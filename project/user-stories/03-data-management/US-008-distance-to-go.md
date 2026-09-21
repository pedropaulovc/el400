# US-008: Distance-to-Go (Preset)

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §§8.1 and 8.3; [EL400 video walkthrough](https://www.youtube.com/watch?v=7W47KPCu7jE) §2.5.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to enter a relative travel distance and count it down to zero  
**So that** I can reach the next position without disturbing the ABS datum

## Target Acceptance Criteria
- [x] **AC 8.1:** In ABS, pressing Distance-to-Go shows `SELECt`; each selected axis accepts a signed relative distance and `ent` confirms it.
- [x] **AC 8.2:** Pressing Distance-to-Go again executes Preset in INC function mode. At activation, each selected axis shows the entered distance regardless of its nonzero starting ABS coordinate.
- [x] **AC 8.3:** Subsequent compensated machine motion subtracts from that starting relative distance and reaches zero after the requested travel. Unselected axes remain live/unchanged.
- [x] **AC 8.4:** The INC indicator and the manual's leading function decimal are shown while active.
- [x] **AC 8.5:** The automatic Near Zero Warning is active at and within 0.05 mm of the target. The optional `BUZZ` setting cannot disable this primary-function warning.
- [x] **AC 8.6:** `C` exits, removes the function marker and restores the live ABS display without changing its datum.

## Verification
The headed data run entered signed relative X/Y/Z travel from nonzero ABS coordinates and observed the exact entered distances at activation. Physical movement counted each axis down to zero, with the INC indicator and leading function decimal visible; `C` restored the unchanged ABS datum. A targeted recheck with `BUZZ` and keypad beep off observed no warning at `0.0600` mm and the mandatory warning at both `0.0500` and `0.0400` mm. The browser evidence covers the visible indicator and blink state, not physical speaker output.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/03-data-management/US-008-distance-to-go.spec.ts`](../../../e2e/03-data-management/US-008-distance-to-go.spec.ts)
