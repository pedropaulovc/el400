# US-023: Setup Menu - Scale Direction

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, p. 20: the direction choices are `LEFt` and `riGht`.
- **Video:** EL400 overview §1.8, `[05:49]`: the labels are arbitrary installation choices; select the opposite one when an axis counts the wrong way.

## User Story

**As a** machine installer  
**I want** to reverse an axis's count direction  
**So that** the sign of its displayed coordinate matches the scale installation

## Acceptance Criteria

- [ ] **AC23.1:** The selected axis exposes `LEFt` / `riGht`, with `LEFt` as the factory setting.
- [ ] **AC23.2:** Left/Right toggles the draft choice and wraps.
- [ ] **AC23.3:** Direction is independently configured for X, Y, and Z.
- [ ] **AC23.4:** Reversing direction recomputes the sign of the complete current axis coordinate immediately, and all later motion uses the same new sign. It is not a future-deltas-only operation.
- [ ] **AC23.5:** ABS/INC offsets, presets, and other coordinate transforms compose with the selected direction without preserving a stale pre-change current value.
- [ ] **AC23.6:** The direction change becomes durable only through `SAU CHG`; unsaved exit restores the previously saved direction and reading.

## Human Verification

Move X to a nonzero value, note its sign, draft the opposite direction, save, and exit. The same current magnitude must immediately have the opposite sign; a further positive physical jog must continue in the newly selected direction. Keep Y on the original direction to prove per-axis scope. Finally draft a second reversal and exit without saving to prove rollback.

## Automated Coverage

- Current-value sign behavior: [`src/stores/dro/features/direction.integration.test.tsx`](../../../src/stores/dro/features/direction.integration.test.tsx)
- The baseline had no dedicated browser E2E for US-023; the integrated debug-source direction scenario remains to be verified.

## Baseline Audit (before the current implementation work)

Navigation, defaults, toggling, persistence, per-axis scope, and future motion direction passed. The display also correctly flipped the same current nonzero reading. The former story required the opposite, so its “current value unchanged / future counts only” criterion was a story defect and has been removed. All-setting draft rollback was still a confirmed shared gap.
