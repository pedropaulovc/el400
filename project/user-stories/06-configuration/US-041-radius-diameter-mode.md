# US-041: Setup Menu - Radius / Diameter Display Mode

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: linear-axis measurement mode is per-axis `rAd / diA`.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.7, `[05:17–05:33]`: mills use radial 1:1 display; diameter is for lathe work.
- **Simulator panel contract:** the seven-cell numeric display uses `-------` when a derived diameter cannot fit; the underlying coordinate is not clamped.

## User Story

**As a** machinist  
**I want** per-axis radius or diameter display  
**So that** a linear slide can show true travel or lathe-style workpiece diameter

## Acceptance Criteria

- [x] **AC41.1:** A linear axis exposes `rAd` (factory setting) and `diA`; Left/Right toggles and wraps.
- [x] **AC41.2:** `rAd` displays compensated coordinate 1:1. `diA` displays 2× that coordinate.
- [x] **AC41.3:** The mode is per-axis and has no effect on an angular axis's rendered value.
- [x] **AC41.4:** Diameter multiplication happens after machine/error compensation and direction, before `dP` formatting.
- [x] **AC41.5:** If the derived formatted value cannot fit the seven-cell axis display, render `-------`; retain the underlying coordinate so the reading self-clears after returning in range, coarsening `dP`, selecting radius, or zeroing.
- [x] **AC41.6:** The draft mode persists only after `SAU CHG`.

## Human Verification

Move X and Y by the same physical 1.000 mm, leave Y radial, and save X diameter; X must show 2.000 and Y 1.000. Exercise a negative value and `dP` rounding. Enter a representable near-limit radius coordinate, switch to diameter to force `-------`, then switch back and confirm the stored coordinate returns unchanged. Repeat with X angular to confirm no diameter transform.

## Automated Coverage

- [`e2e/06-configuration/US-041-radius-diameter.spec.ts`](../../../e2e/06-configuration/US-041-radius-diameter.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

The corrected diameter contract was checked as 2× display-space coordinate, including positive preset interpretation, negative motion, post-compensation order, `dP` rounding, per-axis scope, angular precedence, and seven-dash overflow with retained-coordinate recovery. X `diA` and `dP 50.0` were saved, reloaded, and re-entered unchanged; drafting `rAd` and canceling returned to the saved `diA`. A later smoke check again produced X `2.0000` for 1 mm of debug travel.

These checks used the visible debug table position. No physical lathe or workpiece was used. Returning in range was exercised directly, and the browser E2E switched back to radius without losing the stored coordinate. Coarsening `dP` and zeroing were not redundantly rerun as separate headed recovery arms.
