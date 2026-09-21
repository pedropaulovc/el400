# US-024: Setup Menu - Zero Approach Warning

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §8.3, p. 42: a warning is automatically active within 50 µm of the set value in Preset, SDM, and every milling-specific function.
- **Video:** EL400 overview §1.13, `[08:36–09:32]`: `ZEro AP` is a parent menu; Enter opens the buzz control (rendered `bU22` on the simulator's seven-segment display), then Down reaches numeric `bP diSt` and `bP toLr`.
- **Lower-priority detail where EL400 is silent:** MagXact “ZERO APPROACH WARNING”: `BP DIST` defaults to 0.002 inch, `BP TOLR` to 0.0000 inch, values are entered numerically, and warning setup is per-axis.

## User Story

**As a** machine operator  
**I want** a configurable audible approach/departure warning without losing the EL400's mandatory near-zero protection  
**So that** I can approach target-bearing axes safely

## Acceptance Criteria

- [ ] **AC24.1:** For the selected axis, setup contains a parent `ZEro AP`; Enter opens nested `bU22 on/oF`, then Down reaches `bP diSt` and `bP toLr`.
- [ ] **AC24.2:** `bU22`, `BP DIST`, and `BP TOLR` are per-axis settings.
- [ ] **AC24.3:** On either numeric row, Enter displays the saved value; Enter again starts numeric replacement entry; digits and decimal are accepted; Enter stages the value and advances. `C` cancels partial numeric input and returns to the row without changing its draft value.
- [ ] **AC24.4:** Simulator defaults are 0.002 inch for `BP DIST` and 0.0000 inch for `BP TOLR`; unit conversion preserves the same physical distances.
- [ ] **AC24.5:** When configurable warning is on, it warns on the physical axis that owns the active target inside `BP DIST`; `BP TOLR` supplies departure hysteresis. Prompt rows, placeholder zero axes, and unrelated menu text never trigger it.
- [ ] **AC24.6:** The primary 50 µm warning in Preset, SDM run, and milling functions is always active and cannot be disabled by `bU22 oF` or keypad `bEEP oF`. A larger configured approach distance may widen the warning region but may not remove that 50 µm floor.
- [ ] **AC24.7:** Warning audio is repeated and distinguishable from a keypad click.
- [ ] **AC24.8:** All three settings share the setup draft transaction and persist only after `SAU CHG`.

## Human Verification

Enter `ZEro AP` for X, replace both numeric values through the nested flow, save, and verify Y retains independent values. In Distance-to-Go, approach and leave an X target across the configured thresholds and observe repeated warning/hysteresis. Turn X `bU22 oF` and keypad beep off, then approach within 0.05 mm in Preset, SDM run, and one milling function; the primary warning must remain. Use Web Audio instrumentation to distinguish keypad buffer-source clicks from warning oscillator bursts; speaker-device errors alone are not a functional failure.

## Automated Coverage

- [`e2e/06-configuration/US-024-zero-approach.spec.ts`](../../../e2e/06-configuration/US-024-zero-approach.spec.ts)

## Baseline Audit (before the current implementation work)

The old flat `bU22`/`bP`/`tL` rows could warn in DTG and used a distinct repeated oscillator, but `ZEro AP` nesting and numeric entry were absent, warning settings leaked across axes, and `bU22 oF` incorrectly disabled the primary automatic DTG warning. Preset, SDM, and every milling function were not individually instrumented. These target criteria are not yet verified.
