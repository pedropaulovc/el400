# EL400 DRO User Stories

This directory contains the 48 current requirements for the EL400 milling-DRO simulator. Each
story defines target operator behavior; a checked or passing observation in an audit describes
the audited baseline only, not verification of later implementation work.

## Authority and Scope

When sources disagree, use this precedence:

1. [EL400 Operation Manual](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-operation-manual/ocr/markdown.md)
2. [EL400 video walkthrough](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-dro-overview-video/MANUAL.md) and transcript
3. [MagXact MX-100M Manual](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/magxact-mx100m-mill-dro-manual/ocr/markdown.md)

Browser, accessibility, integration and simulator-only contracts remain valid where the hardware
manuals do not define them. Simulator-specific policies must be identified as such rather than
attributed to undocumented EL400 firmware behavior.

## Story Index

### 01. Foundation (3)

| ID | Requirement | Story |
|---|---|---|
| US-001 | First use and power-up display | [US-001-first-use.md](01-foundation/US-001-first-use.md) |
| US-002 | Sign convention and axis direction | [US-002-sign-convention.md](01-foundation/US-002-sign-convention.md) |
| US-047 | Fixed-width display overflow | [US-047-display-overflow.md](01-foundation/US-047-display-overflow.md) |

### 02. Core Operations (5)

| ID | Requirement | Story |
|---|---|---|
| US-003 | Absolute and incremental mode | [US-003-abs-inc-mode.md](02-core-operations/US-003-abs-inc-mode.md) |
| US-004 | Inch and metric display | [US-004-inch-metric.md](02-core-operations/US-004-inch-metric.md) |
| US-005 | Axis reset and preset | [US-005-zero-axes.md](02-core-operations/US-005-zero-axes.md) |
| US-006 | Half function | [US-006-half-function.md](02-core-operations/US-006-half-function.md) |
| US-007 | Center finding: circle and line | [US-007-center-finding.md](02-core-operations/US-007-center-finding.md) |

### 03. Data Management (5)

| ID | Requirement | Story |
|---|---|---|
| US-008 | Relative distance-to-go preset | [US-008-distance-to-go.md](03-data-management/US-008-distance-to-go.md) |
| US-009 | SDM Learn | [US-009-sdm-learn.md](03-data-management/US-009-sdm-learn.md) |
| US-010 | SDM Program | [US-010-sdm-direct-entry.md](03-data-management/US-010-sdm-direct-entry.md) |
| US-011 | SDM Run | [US-011-sdm-recall.md](03-data-management/US-011-sdm-recall.md) |
| US-012 | Home, Set MC and machine-reference recall | [US-012-datum-recall.md](03-data-management/US-012-datum-recall.md) |

### 04. Calculations (4)

| ID | Requirement | Story |
|---|---|---|
| US-013 | Basic calculator | [US-013-basic-calculator.md](04-calculations/US-013-basic-calculator.md) |
| US-014 | Trigonometric calculator | [US-014-trig-functions.md](04-calculations/US-014-trig-functions.md) |
| US-015 | Three-point circle center | [US-015-center-circle-macro.md](04-calculations/US-015-center-circle-macro.md) |
| US-045 | Taper calculation | [US-045-taper-calculation.md](04-calculations/US-045-taper-calculation.md) |

### 05. Pattern Generation (7)

| ID | Requirement | Story |
|---|---|---|
| US-016 | Full bolt circle | [US-016-bolt-circle-full.md](05-pattern-generation/US-016-bolt-circle-full.md) |
| US-017 | Bolt-circle arc | [US-017-bolt-circle-arc.md](05-pattern-generation/US-017-bolt-circle-arc.md) |
| US-018 | Arc contouring | [US-018-arc-contouring.md](05-pattern-generation/US-018-arc-contouring.md) |
| US-019 | Angle-hole pattern | [US-019-angle-hole.md](05-pattern-generation/US-019-angle-hole.md) |
| US-020 | Grid pattern | [US-020-grid-drilling.md](05-pattern-generation/US-020-grid-drilling.md) |
| US-029 | Linear bolt hole | [US-029-linear-bolt-hole.md](05-pattern-generation/US-029-linear-bolt-hole.md) |
| US-030 | Polar coordinates | [US-030-polar-coordinates.md](05-pattern-generation/US-030-polar-coordinates.md) |

### 06. Configuration (15)

| ID | Requirement | Story |
|---|---|---|
| US-021 | Scale resolution | [US-021-scale-resolution.md](06-configuration/US-021-scale-resolution.md) |
| US-022 | Display resolution | [US-022-display-resolution.md](06-configuration/US-022-display-resolution.md) |
| US-023 | Scale direction | [US-023-scale-direction.md](06-configuration/US-023-scale-direction.md) |
| US-024 | Zero-approach warning | [US-024-zero-approach-warning.md](06-configuration/US-024-zero-approach-warning.md) |
| US-025 | Keypad beep | [US-025-keypad-beep.md](06-configuration/US-025-keypad-beep.md) |
| US-026 | Sleep timer | [US-026-sleep-timer.md](06-configuration/US-026-sleep-timer.md) |
| US-027 | Save changes | [US-027-save-changes.md](06-configuration/US-027-save-changes.md) |
| US-028 | Restore defaults | [US-028-restore-defaults.md](06-configuration/US-028-restore-defaults.md) |
| US-031 | Error compensation and calibration | [US-031-error-compensation.md](06-configuration/US-031-error-compensation.md) |
| US-039 | Setup navigation and axis selection | [US-039-setup-navigation.md](06-configuration/US-039-setup-navigation.md) |
| US-040 | Linear/angular counting mode | [US-040-counting-mode.md](06-configuration/US-040-counting-mode.md) |
| US-041 | Radius/diameter display mode | [US-041-radius-diameter-mode.md](06-configuration/US-041-radius-diameter-mode.md) |
| US-042 | Encoder-fail warning | [US-042-encoder-fail-warning.md](06-configuration/US-042-encoder-fail-warning.md) |
| US-043 | Keypad lock | [US-043-keypad-lock.md](06-configuration/US-043-keypad-lock.md) |
| US-044 | OEM custom defaults | [US-044-oem-mode.md](06-configuration/US-044-oem-mode.md) |

### 07. Auxiliary (3)

| ID | Requirement | Story |
|---|---|---|
| US-032 | Touch probe | [US-032-touch-probe.md](07-auxiliary/US-032-touch-probe.md) |
| US-033 | Six outputs and serial communication | [US-033-outputs-serial.md](07-auxiliary/US-033-outputs-serial.md) |
| US-046 | Self-diagnostics | [US-046-self-diagnostics.md](07-auxiliary/US-046-self-diagnostics.md) |

### 08. Accessibility (4)

| ID | Requirement | Story |
|---|---|---|
| US-034 | Forced-colors support | [US-034-forced-colors-mode.md](08-accessibility/US-034-forced-colors-mode.md) |
| US-037 | Keyboard navigation | [US-037-keyboard-navigation.md](08-accessibility/US-037-keyboard-navigation.md) |
| US-038 | Keyboard shortcuts | [US-038-keyboard-shortcuts.md](08-accessibility/US-038-keyboard-shortcuts.md) |
| US-048 | Screen-reader semantics | [US-048-screen-reader-support.md](08-accessibility/US-048-screen-reader-support.md) |

### 09. Integration (2)

| ID | Requirement | Story |
|---|---|---|
| US-035 | External machine connection | [US-035-external-machine-connection.md](09-integration/US-035-external-machine-connection.md) |
| US-036 | Settings persistence | [US-036-settings-persistence.md](09-integration/US-036-settings-persistence.md) |

## Specification Feature Map

| Authoritative or product-contract feature | Source | Story |
|---|---|---|
| Power-up and version display | EL400 §5.4; video §1.1 | US-001 |
| Coordinate signs and per-axis direction | EL400 §6.2; MagXact Coordinates | US-002, US-023 |
| Seven-digit numeric panel | EL400 specifications; simulator overflow policy | US-047 |
| ABS/INC, units, reset, set and HALF | EL400 §§7.1–7.5 | US-003–US-006 |
| Home, Set Machine Reference and Recall | EL400 §7.7 | US-012 |
| Calculator arithmetic and trigonometry | EL400 §7.6 | US-013, US-014 |
| Relative Preset and mandatory near-zero warning | EL400 §§8.1, 8.3 | US-008, US-024 |
| SDM Program, Run and Learn | EL400 §8.2 | US-009–US-011 |
| Center of circle and line | EL400 §§8.4–8.5 | US-007, US-015 |
| Full/arc bolt circle, arc contour, angle hole and grid | EL400 §§9.1.1–9.1.5 | US-016–US-020 |
| Linear bolt hole, polar coordinates | EL400 §§9.1.6–9.1.7 | US-029, US-030 |
| Setup navigation, scale/display resolution, counting, radius/diameter and direction | EL400 §§6.1–6.2 | US-021–US-023, US-039–US-041 |
| Encoder warning, keypad lock, beep, sleep, save, restore and OEM defaults | EL400 §6.2; video setup walkthrough | US-025–US-028, US-042–US-044 |
| LEC, SLEC and angular calibration | EL400 §6.3 | US-031 |
| Taper calculation | EL400 §9.2.2 | US-045 |
| Probe workflows | EL400 §10.1 | US-032 |
| Six outputs and serial communication | EL400 §§10.2–10.3 | US-033 |
| Self-diagnostics | EL400 §11.1 | US-046 |
| Forced colors, keyboard and screen-reader contracts | [ACCESSIBILITY.md](../../ACCESSIBILITY.md) | US-034, US-037, US-038, US-048 |
| CNCjs/debug machine sources | [`CncjsMillAdapter.ts`](../../src/adapters/CncjsMillAdapter.ts), [`DebugMillAdapter.ts`](../../src/adapters/DebugMillAdapter.ts), [`millStore.ts`](../../src/stores/millStore.ts) | US-035 |
| Persisted operator settings | [`settingsStore.ts`](../../src/stores/settingsStore.ts), [`droStore.ts`](../../src/stores/droStore.ts) | US-036 |

## Completed Baseline Audit

The files `/tmp/el400-audit-ManualCore.json`, `ManualData.json`,
`ManualCalculations.json`, `ManualPatterns.json`, `ManualSetup.json` and
`ManualAuxAccess.json` record headed exercises of the pre-change baseline through visible
controls. They are evidence for what was observed then. Main's integrated verification of the
current implementation is still pending.

| Domain | Baseline observations |
|---|---|
| Foundation and core | US-001, US-004 and runtime-reachable US-047 paths passed. Confirmed gaps were reversed-direction preset composition (US-002/005), frozen connected INC (US-003), missing HALF selection (US-006), and the flattened center menu (US-007). |
| Data management | Preset, SDM arithmetic and existing Home/Recall paths were reachable. Confirmed gaps included absolute-target Preset semantics, missing mandatory warning, SDM menu/label/default/persistence defects, Learn X readback, and missing Set MC. |
| Calculations | Single calculator and trig operations passed. Chaining and finite overflow handling failed. Circle-center math worked only through a non-authoritative route without required prompts/error feedback. Taper had working positive live math but wrong setup choices, angle format, signed semantics and degenerate handling. |
| Patterns | Core geometry passed across US-016–US-020 and US-029–US-030. Common current-hole/direct-jump behavior had keypad conflicts; Grid exposed a forbidden direct jump; Linear Bolt Hole required an undocumented count. The PCD function marker is the manual's **leading decimal**, not a terminal-decimal defect. |
| Configuration | US-022 and US-040–US-044 passed their exercised criteria. The audit's US-028 “pass” was later invalidated by the original PDF page 21: Reset is selected-axis configuration restore, not a global wipe; the observed baseline incorrectly cleared broader state. Material gaps also remained in scale-source coverage, automatic warning, sleep, transaction discard, and calibration. US-025 keypad beep passed correct buffer-source instrumentation while generic error beep remained untested. |
| Auxiliary | Probe behavior was partial. US-033 six-output/serial was absent and remains in scope. Self-diagnostics passed after the required `PrESS` → Enter → `EnCodEr` transition; visible X/Y/Z jog diagnostics passed. Audio-device errors were environmental, not a diagnostics defect. |
| Accessibility and integration | Forced colors, keyboard navigation/shortcuts and accessibility-tree contracts passed their exercised browser criteria. Debug-source position updates and settings persistence were observed; a real CNCjs/widget environment and connection indicator were not available/complete. |

## Verification Status

- Baseline pass/fail labels above must not be used as current completion checkboxes.
- Story targets include corrections derived from the authority order, even when the baseline audit
  exposed a gap.
- The corrected US-028 target restores only the selected axis's OEM/factory configuration and preserves global settings, other axes, SDMs, machine references and other operator job data.
- Newly implemented behavior remains unverified until Main completes the integrated E2E, unit,
  type-check and headed-browser checks.
- Hardware-only behavior (physical encoders, probe pins, relay outputs, RS-232 receiver and an
  audio device) must be reported separately from simulator-boundary evidence.

## Deliberately Out of Scope

The EL400 manual documents functions for **lathe** and **EDM** machine modes. The simulator
targets a **milling-machine** X/Y/Z DRO, so the following are intentionally not given stories
(noted here for completeness so the crosscheck is auditable):

- **Lathe — Tool Offset** (§9.2.1, 9 offsets). A UI slot exists for tool offset; if lathe support
  is ever in scope, promote this to a story.
- **Lathe — Axes Addition** (§9.2.3) and **Vectoring** (§9.2.4) — compound-slide combinations.
- **EDM — Pre-Set Depth (PSD)** and EDM bolt/arc/angle variants (§9.3).
- **Axes Summing** (§9.1.8) — sums Z + U on a **4-axis** mill. The simulator is **X/Y/Z only and
  will not support a 4th axis**, so this function is out of scope.
- **Hardware/wiring** details: mounting (§5.1), power supply (§5.2), encoder connectors (§5.3),
  pin-out tables, and the troubleshooting guideline table (§11.2) — reference material, not behavior.

Taper (§9.2.2) is the one lathe-class function kept as **US-045** because the simulator's product
scope includes taper calculations. Calibration, six-output, and serial behavior also remain in
scope through US-031 and US-033.
