# US-040: Setup Menu - Counting Mode

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, p. 20: `LinEAr / AnGULAr`; angular `dP` formats are degrees-minutes, degrees-minutes-seconds, and decimal degrees.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.4, `[02:18–03:00]`: Linear is the mill default; angular is for rotary measurement.

## User Story

**As a** machine installer  
**I want** each axis configured as linear or angular  
**So that** its units, display formats, and calibration method match the installed measuring system

## Acceptance Criteria

- [x] **AC40.1:** `LinEAr` is the first row and factory setting for each mill axis; Left/Right toggles and wraps with `AnGULAr`.
- [x] **AC40.2:** Counting mode is per-axis.
- [x] **AC40.3:** Linear mode uses micron `dP` choices and makes radial/diametric measurement meaningful.
- [x] **AC40.4:** Angular mode offers `dd.mn`, `dd.mn.SS`, and `dd.dEC` display formats and angular CALib methods.
- [x] **AC40.5:** Changing mode reformats/reinterprets that axis coherently without changing other axes.
- [x] **AC40.6:** The mode is drafted and becomes durable only after `SAU CHG`.

Center, Preset, and SDM use signed decimal-degree residuals on angular axes;
IN/MM and a stored diameter setting do not scale those values. This derived
readout presentation is simulator policy where the manual is silent. Normal
angular counting retains its selected wrapped decimal or DMS format.

## Human Verification

Keep Y linear, set X angular, cycle all three X angular formats, and exercise decimal-degree/DMS boundary values. Re-enter X CALib and confirm angular methods are available; return X to linear and confirm micron formats and radius/diameter semantics. Save/reload, then repeat an unsaved reversal as a rollback control.

## Automated Coverage

- [`e2e/06-configuration/US-040-counting-mode.spec.ts`](../../../e2e/06-configuration/US-040-counting-mode.spec.ts)
- [`e2e/06-configuration/US-040-dms.spec.ts`](../../../e2e/06-configuration/US-040-dms.spec.ts)
- Angular calibration: [`e2e/06-configuration/US-031-calibration.spec.ts`](../../../e2e/06-configuration/US-031-calibration.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

Headed checks covered the default and wrap, per-axis isolation, all three angular formats, DMS second-to-minute carry, linear micron and radius/diameter rows, and the angular calibration choices. Y was saved as angular decimal degrees, reloaded, and re-entered with that draft committed while X remained linear. A separate unsaved reversal returned to the saved mode. A later smoke check reproduced Y `12.30.00` alongside linear X diameter `2.0000`.

The angular input came from the visible debug engineering-position controls. No physical rotary encoder or rotary table was used.
