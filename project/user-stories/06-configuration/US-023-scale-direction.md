# US-023: Setup Menu - Scale Direction

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, p. 20: the direction choices are `LEFt` and `riGht`.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.8, `[05:49]`: the labels are arbitrary installation choices; select the opposite one when an axis counts the wrong way.

## User Story

**As a** machine installer  
**I want** to reverse an axis's count direction  
**So that** the sign of its displayed coordinate matches the scale installation

## Acceptance Criteria

- [x] **AC23.1:** The selected axis exposes `LEFt` / `riGht`, with `LEFt` as the factory setting.
- [x] **AC23.2:** Left/Right toggles the draft choice and wraps.
- [x] **AC23.3:** Direction is independently configured for X, Y, and Z.
- [x] **AC23.4:** Reversing direction recomputes the sign of the complete current axis coordinate immediately, and all later motion uses the same new sign. It is not a future-deltas-only operation.
- [x] **AC23.5:** ABS/INC offsets, presets, and other coordinate transforms compose with the selected direction without preserving a stale pre-change current value.
- [x] **AC23.6:** The direction change becomes durable only through `SAU CHG`; unsaved exit restores the previously saved direction and reading.

## Human Verification

Move X to a nonzero value, note its sign, draft the opposite direction, save, and exit. The same current magnitude must immediately have the opposite sign; a further positive physical jog must continue in the newly selected direction. Keep Y on the original direction to prove per-axis scope. Finally draft a second reversal and exit without saving to prove rollback.

## Automated Coverage

- Current-value sign, transform composition, and transaction behavior: [`src/stores/dro/features/direction.integration.test.tsx`](../../../src/stores/dro/features/direction.integration.test.tsx)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

With `SC 10.0` and 10 mm of physical input, saving `riGht` immediately changed the current reading from +0.7874 to -0.7874. A further move to 11 mm produced -0.8661. Y remained `LEFt`, and leaving a second reversal unsaved preserved X's saved direction and live reading.

The headed check covered the raw live ABS coordinate and later motion; it did not individually enumerate every preset, ABS/INC, and calibration composition. The passing integration and end-to-end suites provide regression coverage. No physical encoder wiring was used.
