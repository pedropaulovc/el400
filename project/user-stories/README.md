# EL400 DRO User Stories (Merged)

Comprehensive user stories merged from Claude and Gemini sources, deduplicated and cross-referenced with discrepancy markers.

## Overview

**Total Stories:** 47
**Source:** Merged from MagXact-MX-100M-Manual.md (Claude) and EL400OpManual.md (Gemini), plus accessibility requirements and integration features, then cross-checked against the README's official spec references
**Purpose:** Guide implementation of EL400 DRO simulator features
**Format:** Each story includes acceptance criteria, E2E test scenarios, and TODO markers for discrepancies

> **Crosscheck (2026-05-30):** All stories were re-checked against the DRO specifications
> referenced in the project README — the [EL400 Operation Manual](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-operation-manual/ocr/markdown.md),
> the [MagXact MX-100M Manual](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/magxact-mx100m-mill-dro-manual/ocr/markdown.md),
> and the [EL400 video walkthrough manual](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-dro-overview-video/MANUAL.md).
> This added the missing-file **US-002**, indexed the previously-orphaned **US-037/US-038**,
> and created **US-039–US-046** for documented features that had no story (setup navigation,
> counting mode, radius/diameter, encoder-fail warning, keypad lock, OEM mode, taper, self-
> diagnostics). Axes summing (§9.1.8) is **not** storied — it requires a 4th axis, which is out
> of scope. See **Crosscheck Coverage** and **Deliberately Out of Scope** below.

---

## Merge Summary

This directory contains the merged and deduplicated user stories from:
- `project/claude-user-stories` (28 stories, US-001 to US-028)
- `project/gemini-user-stories` (24 stories, G-001 to G-028)

### Merge Process
- **Exact matches** (14 stories): Used Claude version as base
- **Partial matches** (10 stories): Merged with TODO markers for discrepancies
- **Claude-only** (3 stories): Kept as-is (US-002, US-027, US-028)
- **Gemini-only** (5 stories): Added as US-029 to US-033

### Key Discrepancies Flagged with TODO Markers
- **US-001**: 4-axis Z/U toggle — **resolved: no 4-axis support** (simulator is X/Y/Z only)
- **US-007 + US-015**: Relationship between manual and macro center-finding
- **US-009/010/011**: SDM trilogy structure (Claude) vs combined approach (Gemini)
- **US-012**: "MC REF" vs "nC rEF" vs "honE" terminology

---

## Story Index by Category

### 01. Foundation (3 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-001 | First Use and Power-Up Display | P0 | Claude + Gemini | [US-001-first-use.md](01-foundation/US-001-first-use.md) |
| US-002 | Sign Convention and Axis Direction | P0 | Claude only | [US-002-sign-convention.md](01-foundation/US-002-sign-convention.md) |
| US-047 | Display Overflow on Value Entry | P1 | EL400 spec table (7-digit panel) | [US-047-display-overflow.md](01-foundation/US-047-display-overflow.md) |

**Summary:** Basic DRO startup behavior and coordinate system conventions.

---

### 02. Core Operations (5 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-003 | Absolute vs Incremental Mode | P1 | Claude + Gemini | [US-003-abs-inc-mode.md](02-core-operations/US-003-abs-inc-mode.md) |
| US-004 | Inch vs Metric Display | P1 | Claude + Gemini | [US-004-inch-metric.md](02-core-operations/US-004-inch-metric.md) |
| US-005 | Zeroing Individual Axes | P1 | Claude + Gemini | [US-005-zero-axes.md](02-core-operations/US-005-zero-axes.md) |
| US-006 | Half Function (Divide by 2) | P1 | Claude + Gemini | [US-006-half-function.md](02-core-operations/US-006-half-function.md) |
| US-007 | Center Finding (Manual Method) | P2 | Claude + Gemini | [US-007-center-finding.md](02-core-operations/US-007-center-finding.md) |

**Summary:** Fundamental DRO operations every user needs.

---

### 03. Data Management (5 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-008 | Distance-to-Go Function | P2 | Claude + Gemini | [US-008-distance-to-go.md](03-data-management/US-008-distance-to-go.md) |
| US-009 | Sub-Datum Memory (SDM) - Learn Mode | P2 | Claude + Gemini | [US-009-sdm-learn.md](03-data-management/US-009-sdm-learn.md) |
| US-010 | Sub-Datum Memory (SDM) - Program Mode | P2 | Claude + Gemini | [US-010-sdm-direct-entry.md](03-data-management/US-010-sdm-direct-entry.md) |
| US-011 | Sub-Datum Memory (SDM) - Run Mode | P2 | Claude + Gemini | [US-011-sdm-recall.md](03-data-management/US-011-sdm-recall.md) |
| US-012 | Datum Recall (Machine Reference) | P2 | Claude + Gemini | [US-012-datum-recall.md](03-data-management/US-012-datum-recall.md) |

**Summary:** Advanced position memory, navigation, and recovery features.

---

### 04. Calculations (4 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-013 | Basic Calculator Functions | P3 | Claude + Gemini | [US-013-basic-calculator.md](04-calculations/US-013-basic-calculator.md) |
| US-014 | Trigonometric Calculator Functions | P3 | Claude + Gemini | [US-014-trig-functions.md](04-calculations/US-014-trig-functions.md) |
| US-015 | Center of Circle (Macro) | P3 | Claude + Gemini | [US-015-center-circle-macro.md](04-calculations/US-015-center-circle-macro.md) |
| US-045 | Taper Calculation Function | P4 | Crosscheck (README feature table + §9.2.2) | [US-045-taper-calculation.md](04-calculations/US-045-taper-calculation.md) |

**Summary:** Built-in calculator and geometric calculation macros.

---

### 05. Pattern Generation (7 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-016 | Bolt Circle Drilling - Full Circle | P4 | Claude + Gemini | [US-016-bolt-circle-full.md](05-pattern-generation/US-016-bolt-circle-full.md) |
| US-017 | Bolt Circle Drilling - Arc | P4 | Claude + Gemini | [US-017-bolt-circle-arc.md](05-pattern-generation/US-017-bolt-circle-arc.md) |
| US-018 | Arc Contouring (Step Drilling) | P4 | Claude + Gemini | [US-018-arc-contouring.md](05-pattern-generation/US-018-arc-contouring.md) |
| US-019 | Angle Hole (Linear Hole Pattern) | P4 | Claude + Gemini | [US-019-angle-hole.md](05-pattern-generation/US-019-angle-hole.md) |
| US-020 | Grid Drilling Pattern | P4 | Claude + Gemini | [US-020-grid-drilling.md](05-pattern-generation/US-020-grid-drilling.md) |
| US-029 | Linear Bolt Hole | P4 | Gemini only | [US-029-linear-bolt-hole.md](05-pattern-generation/US-029-linear-bolt-hole.md) |
| US-030 | Polar Coordinates | P4 | Gemini only | [US-030-polar-coordinates.md](05-pattern-generation/US-030-polar-coordinates.md) |

**Summary:** Automated drilling patterns for milling operations.

---

### 06. Configuration (15 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-021 | Setup Menu - Scale Resolution | P5 | Claude + Gemini | [US-021-scale-resolution.md](06-configuration/US-021-scale-resolution.md) |
| US-022 | Setup Menu - Display Resolution | P5 | Claude + Gemini | [US-022-display-resolution.md](06-configuration/US-022-display-resolution.md) |
| US-023 | Setup Menu - Scale Direction | P5 | Claude + Gemini | [US-023-scale-direction.md](06-configuration/US-023-scale-direction.md) |
| US-024 | Setup Menu - Zero Approach Warning | P5 | Claude + Gemini | [US-024-zero-approach-warning.md](06-configuration/US-024-zero-approach-warning.md) |
| US-025 | Setup Menu - Keypad Beep | P5 | Claude + Gemini | [US-025-keypad-beep.md](06-configuration/US-025-keypad-beep.md) |
| US-026 | Setup Menu - Display Sleep Timer | P5 | Claude + Gemini | [US-026-sleep-timer.md](06-configuration/US-026-sleep-timer.md) |
| US-027 | Setup Menu - Save Changes | P5 | Claude only | [US-027-save-changes.md](06-configuration/US-027-save-changes.md) |
| US-028 | Setup Menu - Restore Factory Defaults | P5 | Claude only | [US-028-restore-defaults.md](06-configuration/US-028-restore-defaults.md) |
| US-031 | Error Compensation | P5 | Gemini only | [US-031-error-compensation.md](06-configuration/US-031-error-compensation.md) |
| US-039 | Setup Menu Navigation and Axis Selection | P5 | Crosscheck (§6.1, video §1.2–1.3) | [US-039-setup-navigation.md](06-configuration/US-039-setup-navigation.md) |
| US-040 | Setup Menu - Counting Mode (Linear vs Angular) | P5 | Crosscheck (§6.2, video §1.4) | [US-040-counting-mode.md](06-configuration/US-040-counting-mode.md) |
| US-041 | Setup Menu - Radius / Diameter Display Mode | P5 | Crosscheck (§6.2, video §1.7) | [US-041-radius-diameter-mode.md](06-configuration/US-041-radius-diameter-mode.md) |
| US-042 | Setup Menu - Encoder Fail Warning (ENF) | P5 | Crosscheck (§6.2, video §1.10) | [US-042-encoder-fail-warning.md](06-configuration/US-042-encoder-fail-warning.md) |
| US-043 | Setup Menu - Keypad Lock (LoC) | P5 | Crosscheck (§6.2, video §1.12) | [US-043-keypad-lock.md](06-configuration/US-043-keypad-lock.md) |
| US-044 | Setup Menu - OEM Mode (Custom Defaults) | P5 | Crosscheck (§6.2, video §1.18) | [US-044-oem-mode.md](06-configuration/US-044-oem-mode.md) |

**Summary:** System configuration, setup, and maintenance features.

---

### 07. Auxiliary (3 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-032 | Touch Probe | P4 | Gemini only | [US-032-touch-probe.md](07-auxiliary/US-032-touch-probe.md) |
| US-033 | Six Output & Serial Communication | P5 | Gemini only | [US-033-outputs-serial.md](07-auxiliary/US-033-outputs-serial.md) |
| US-046 | Self-Diagnostics Mode | P5 | Crosscheck (§11.1) | [US-046-self-diagnostics.md](07-auxiliary/US-046-self-diagnostics.md) |

**Summary:** Auxiliary hardware, diagnostics, and communication features.

---

### 08. Accessibility (4 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-034 | Forced Colors Mode (High Contrast) Support | P0 | Accessibility requirements | [US-034-forced-colors-mode.md](08-accessibility/US-034-forced-colors-mode.md) |
| US-037 | Keyboard Navigation | P1 | Accessibility requirements | [US-037-keyboard-navigation.md](08-accessibility/US-037-keyboard-navigation.md) |
| US-038 | Keyboard Shortcuts | P2 | Accessibility / power-user features | [US-038-keyboard-shortcuts.md](08-accessibility/US-038-keyboard-shortcuts.md) |
| US-048 | Screen Reader Support | P1 | Accessibility requirements | [US-048-screen-reader-support.md](08-accessibility/US-048-screen-reader-support.md) |

**Summary:** Accessibility features for users with visual impairments and assistive technologies.

---

### 09. Integration (2 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-035 | External Machine Connection | P1 | Data Interface | [US-035-external-machine-connection.md](09-integration/US-035-external-machine-connection.md) |
| US-036 | Settings Persistence | P1 | Data Interface | [US-036-settings-persistence.md](09-integration/US-036-settings-persistence.md) |

**Summary:** Integration with external CNC systems and persistent configuration.

---

## Priority Matrix

| Priority | Description | Count | Stories |
|----------|-------------|-------|---------|
| **P0** | Must-have foundation | 3 | US-001, US-002, US-034 |
| **P1** | Essential DRO features | 8 | US-003, US-004, US-005, US-006, US-035, US-036, US-037, US-048 |
| **P2** | Advanced navigation | 7 | US-007, US-008, US-009, US-010, US-011, US-012, US-038 |
| **P3** | Value-added calculations | 3 | US-013, US-014, US-015 |
| **P4** | Specialized milling/auxiliary | 9 | US-016, US-017, US-018, US-019, US-020, US-029, US-030, US-032, US-045 |
| **P5** | Setup and customization | 16 | US-021 through US-028, US-031, US-033, US-039, US-040, US-041, US-042, US-043, US-044, US-046 |

---

## Implementation Roadmap

### Phase 1: Foundation (P0) - 3 stories
**Goal:** Basic DRO display, position tracking, and accessibility

- [ ] US-001: Power-up display
- [ ] US-002: Sign convention
- [ ] US-034: Forced Colors Mode (High Contrast) support

**Deliverable:** DRO powers up, displays axis positions correctly, and is fully accessible in high contrast mode

---

### Phase 2: Core Operations & Integration (P1) - 6 stories
**Goal:** Essential daily-use features and CNC system integration

- [x] US-003: ABS/INC mode
- [ ] US-004: Inch/mm units
- [ ] US-005: Zero axes
- [ ] US-006: Half function
- [x] US-035: External machine connection (CNCjs integration)
- [x] US-036: Settings persistence

**Deliverable:** All basic machining workflows supported with live position data from CNC controllers

---

### Phase 3: Data Management (P2) - 6 stories
**Goal:** Advanced position memory and navigation

- [ ] US-007: Center finding (manual)
- [ ] US-008: Distance-to-go
- [ ] US-009: SDM Learn
- [ ] US-010: SDM Direct Entry
- [ ] US-011: SDM Recall
- [ ] US-012: Datum recovery

**Deliverable:** Multi-location work and datum management

---

### Phase 4: Calculations (P3) - 3 stories
**Goal:** Built-in math tools

- [ ] US-013: Basic calculator
- [ ] US-014: Trig functions
- [ ] US-015: Circle center macro

**Deliverable:** On-machine calculations eliminate external tools

---

### Phase 5: Pattern Generation (P4) - 7 stories
**Goal:** Automated drilling patterns

- [ ] US-016: Bolt circle (full)
- [ ] US-017: Bolt circle (arc)
- [ ] US-018: Arc contouring
- [ ] US-019: Angle hole
- [ ] US-020: Grid drilling
- [ ] US-029: Linear bolt hole
- [ ] US-030: Polar coordinates

**Deliverable:** All milling macros operational

---

### Phase 6: Auxiliary Features (P4) - 2 stories
**Goal:** Hardware integration

- [ ] US-032: Touch probe integration
- [ ] US-033: Outputs & serial (optional)

**Deliverable:** Advanced hardware features for automation

---

### Phase 7: Configuration (P5) - 16 stories
**Goal:** System setup and customization

- [ ] US-021 through US-028: All setup menu features
- [ ] US-031: Error compensation (advanced)
- [ ] US-033: Six Output & Serial (advanced)
- [ ] US-039–US-044: Setup navigation, counting mode, radius/diameter, encoder-fail, keypad lock, OEM mode
- [ ] US-046: Self-diagnostics

**Deliverable:** Fully configurable DRO with persistence

---

## Crosscheck Coverage (vs. README spec references)

Mapping of every documented EL400/MagXact feature to its user story. Sources: EL400 Operation
Manual (OCR §-numbers), MagXact MX-100M manual, and the EL400 video walkthrough manual.

| Spec feature | Section | Story |
|---|---|---|
| Power-up / version / lamp test | §5.4, video §1.1 | US-001 |
| Sign convention & axis direction | MagXact "Coordinates", §6.2 | US-002 |
| ABS / INC mode | §7.1 | US-003 |
| Inch / metric | §7.2 | US-004 |
| Axis reset (zero) + axis set (known value) | §7.3, §7.4 | US-005 |
| Half function | §7.5 | US-006 |
| Center of circle + center of line (manual) | §8.4, §8.5 | US-007, US-015 |
| Preset / distance-to-go | §8.1, video §2.4 | US-008 |
| SDM — learn / program / run | §8.2.1–8.2.3 | US-009, US-010, US-011 |
| Reference point + machine reference (set/recall) | §7.7–7.7.2 | US-012 |
| Calculator (arithmetic + trig) | §7.6 | US-013, US-014 |
| Bolt circle (full / arc) | §9.1.1, §9.1.2 | US-016, US-017 |
| Arc contouring | §9.1.3 | US-018 |
| Angle hole | §9.1.4 | US-019 |
| Grid | §9.1.5 | US-020 |
| Linear bolt hole | §9.1.6 | US-029 |
| Polar coordinates | §9.1.7 | US-030 |
| Scale resolution `SC` | §6.2, video §1.5 | US-021 |
| Display resolution `dP` | §6.2, video §1.6 | US-022 |
| Scale direction `LEFT`/`riGht` | §6.2, video §1.8 | US-023 |
| Zero approach / near-zero warning | §6.2, §8.3, video §1.13 | US-024 |
| Button beep | §6.2, video §1.14 | US-025 |
| Sleep timer | §6.2, video §1.15 | US-026 |
| Save change `SAU CHG` | §6.2, video §1.16 | US-027 |
| Reset OEM (restore defaults) | §6.2, video §1.17 | US-028 |
| Error compensation (LEC/SLEC/angular) | §6.3 | US-031 |
| Touch probe | §10.1, video §2.13 | US-032 |
| Six output + serial comms | §10.2, §10.3 | US-033 |
| **Setup navigation & axis select** | §6.1, video §1.2–1.3, §1.19 | **US-039** ✚ |
| **Counting mode (linear/angular)** | §6.2, video §1.4 | **US-040** ✚ |
| **Radius / diameter mode** | §6.2, video §1.7 | **US-041** ✚ |
| **Encoder-fail warning `ENF` / `no SIG`** | §6.2, video §1.10 | **US-042** ✚ |
| **Keypad lock `LoC`** | §6.2, video §1.12 | **US-043** ✚ |
| **OEM mode (custom defaults)** | §6.2, video §1.18 | **US-044** ✚ |
| **Taper calculation** | §9.2.2, README feature table | **US-045** ✚ |
| **Self-diagnostics mode** | §11.1 | **US-046** ✚ |
| Forced-colors / keyboard nav / shortcuts / screen reader | ACCESSIBILITY.md | US-034, US-037, US-038, US-048 |
| External machine connection / persistence | ARCHITECTURE.md | US-035, US-036 |

✚ = added by the 2026-05-30 crosscheck.

### Deliberately Out of Scope

The EL400 manual documents functions for **lathe** and **EDM** machine modes. The simulator
targets a **milling-machine** X/Y/Z DRO, so the following are intentionally not given stories
(noted here for completeness so the crosscheck is auditable):

- **Lathe — Tool Offset** (§9.2.1, 9 offsets). *Note:* `AGENTS.md` lists a "Tool offset" UI slot
  in `SecondaryFunctionSection`; if lathe support is ever in scope, promote this to a story.
- **Lathe — Axes Addition** (§9.2.3) and **Vectoring** (§9.2.4) — compound-slide combinations.
- **EDM — Pre-Set Depth (PSD)** and EDM bolt/arc/angle variants (§9.3).
- **Axes Summing** (§9.1.8) — sums Z + U on a **4-axis** mill. The simulator is **X/Y/Z only and
  will not support a 4th axis**, so this function is out of scope.
- **Hardware/wiring** details: mounting (§5.1), power supply (§5.2), encoder connectors (§5.3),
  pin-out tables, and the troubleshooting guideline table (§11.2) — reference material, not behavior.

Taper (§9.2.2) is the one lathe-class function kept (now **US-045**) because the project README's
feature-comparison table explicitly markets "Taper Calculations" as an EL400 capability.
