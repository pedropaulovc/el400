# EL400 DRO Gemini User Stories

This directory contains user stories derived from the `EL400OpManual.md` (EL 400 Digital Readout System).

## Structure
- **01-foundation**: Startup (`G-001`).
- **02-core-operations**: ABS/INC (`G-002`), Units, Reset, Half, Ref (`G-010` to `G-013`).
- **03-data-management**: SDM (`G-007`), Preset, Near Zero (`G-014`, `G-015`).
- **04-calculations**: Calculator (`G-003`), Center Finding (`G-008`).
- **05-milling-functions**: PCD (`G-004`), Arc Hole, Contour, Angle, Grid, Linear, Polar (`G-016` to `G-021`).
- **07-auxiliary**: Probe, Outputs, Serial (`G-027`, `G-028`).
- **08-configuration**: Setup Res/Dir (`G-006`, `G-009`), Advanced Setup, Err Comp (`G-025`, `G-026`).

## Complete Story List
| ID | Title | Category | File |
|----|-------|----------|------|
| G-001 | First Use and Power-Up | Foundation | `01-foundation/G-001-power-up.md` |
| G-002 | ABS/INC Mode | Core | `02-core-operations/G-002-abs-inc.md` |
| G-003 | Calculator | Calculations | `04-calculations/G-003-calculator.md` |
| G-004 | Circular Bolt Hole (PCD) | Milling | `05-milling-functions/G-004-pcd.md` |
| G-006 | Setup - Scale Resolution | Config | `08-configuration/G-006-setup-resolution.md` |
| G-007 | Sub Datum Memory (SDM) | Data | `03-data-management/G-007-sdm.md` |
| G-008 | Center Finding | Calculations | `04-calculations/G-008-center-find.md` |
| G-009 | Setup - Counting Direction | Config | `08-configuration/G-009-setup-direction.md` |
| G-010 | Inch/Metric Display | Core | `02-core-operations/G-010-inch-metric.md` |
| G-011 | Axis Reset and Set | Core | `02-core-operations/G-011-axis-reset.md` |
| G-012 | Half Function | Core | `02-core-operations/G-012-half-function.md` |
| G-013 | Reference Point (Home) | Core | `02-core-operations/G-013-reference-point.md` |
| G-014 | Preset (Distance-to-Go) | Data | `03-data-management/G-014-preset.md` |
| G-015 | Near Zero Warning | Data | `03-data-management/G-015-near-zero.md` |
| G-016 | Arc Bolt Hole | Milling | `05-milling-functions/G-016-arc-bolt-hole.md` |
| G-017 | Arc Contouring | Milling | `05-milling-functions/G-017-arc-contouring.md` |
| G-018 | Angle Hole | Milling | `05-milling-functions/G-018-angle-hole.md` |
| G-019 | Grid Function | Milling | `05-milling-functions/G-019-grid-function.md` |
| G-020 | Linear Bolt Hole | Milling | `05-milling-functions/G-020-linear-bolt-hole.md` |
| G-021 | Polar Coordinates | Milling | `05-milling-functions/G-021-polar-coordinates.md` |
| G-025 | Extended Setup Parameters | Config | `08-configuration/G-025-extended-setup.md` |
| G-026 | Error Compensation | Config | `08-configuration/G-026-error-compensation.md` |
| G-027 | Touch Probe | Auxiliary | `07-auxiliary/G-027-touch-probe.md` |
| G-028 | Six Output & Serial | Auxiliary | `07-auxiliary/G-028-outputs-serial.md` |
