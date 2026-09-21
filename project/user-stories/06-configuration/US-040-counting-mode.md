# US-040: Setup Menu - Counting Mode

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, p. 20: `LinEAr / AnGULAr`; angular `dP` formats are degrees-minutes, degrees-minutes-seconds, and decimal degrees.
- **Video:** EL400 overview §1.4, `[02:18–03:00]`: Linear is the mill default; angular is for rotary measurement.

## User Story

**As a** machine installer  
**I want** each axis configured as linear or angular  
**So that** its units, display formats, and calibration method match the installed measuring system

## Acceptance Criteria

- [ ] **AC40.1:** `LinEAr` is the first row and factory setting for each mill axis; Left/Right toggles and wraps with `AnGULAr`.
- [ ] **AC40.2:** Counting mode is per-axis.
- [ ] **AC40.3:** Linear mode uses micron `dP` choices and makes radial/diametric measurement meaningful.
- [ ] **AC40.4:** Angular mode offers `dd.mn`, `dd.mn.SS`, and `dd.dEC` display formats and angular CALib methods.
- [ ] **AC40.5:** Changing mode reformats/reinterprets that axis coherently without changing other axes.
- [ ] **AC40.6:** The mode is drafted and becomes durable only after `SAU CHG`.

## Human Verification

Keep Y linear, set X angular, cycle all three X angular formats, and exercise decimal-degree/DMS boundary values. Re-enter X CALib and confirm angular methods are available; return X to linear and confirm micron formats and radius/diameter semantics. Save/reload, then repeat an unsaved reversal as a rollback control.

## Automated Coverage

- [`e2e/06-configuration/US-040-counting-mode.spec.ts`](../../../e2e/06-configuration/US-040-counting-mode.spec.ts)
- [`e2e/06-configuration/US-040-dms.spec.ts`](../../../e2e/06-configuration/US-040-dms.spec.ts)
- Angular calibration: [`e2e/06-configuration/US-031-calibration.spec.ts`](../../../e2e/06-configuration/US-031-calibration.spec.ts)

## Baseline Audit (before the current implementation work)

Default/toggle/wrap, all three angular formats, per-axis scope, and positive persistence passed. The radius row remained visible in angular mode although it had no angular effect. Shared all-setting discard semantics and the new angular calibration paths were not verified.
