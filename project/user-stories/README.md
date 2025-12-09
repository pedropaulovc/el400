# EL400 DRO User Stories (Merged)

Comprehensive user stories merged from Claude and Gemini sources, deduplicated and cross-referenced with discrepancy markers.

## Overview

**Total Stories:** 33
**Source:** Merged from MagXact-MX-100M-Manual.md (Claude) and EL400OpManual.md (Gemini)
**Purpose:** Guide implementation of EL400 DRO simulator features
**Format:** Each story includes acceptance criteria, E2E test scenarios, and TODO markers for discrepancies

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
- **US-001**: 4-axis Z/U toggle support clarification needed
- **US-007 + US-015**: Relationship between manual and macro center-finding
- **US-009/010/011**: SDM trilogy structure (Claude) vs combined approach (Gemini)
- **US-012**: "MC REF" vs "nC rEF" vs "honE" terminology

---

## Story Index by Category

### 01. Foundation (2 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-001 | First Use and Power-Up Display | P0 | Claude + Gemini | [US-001-first-use.md](01-foundation/US-001-first-use.md) |
| US-002 | Sign Convention and Axis Direction | P0 | Claude only | [US-002-sign-convention.md](01-foundation/US-002-sign-convention.md) |

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

### 04. Calculations (3 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-013 | Basic Calculator Functions | P3 | Claude + Gemini | [US-013-basic-calculator.md](04-calculations/US-013-basic-calculator.md) |
| US-014 | Trigonometric Calculator Functions | P3 | Claude + Gemini | [US-014-trig-functions.md](04-calculations/US-014-trig-functions.md) |
| US-015 | Center of Circle (Macro) | P3 | Claude + Gemini | [US-015-center-circle-macro.md](04-calculations/US-015-center-circle-macro.md) |

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

### 06. Configuration (11 stories)

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

**Summary:** System configuration, setup, and maintenance features.

---

### 07. Auxiliary (2 stories)

| ID | Title | Priority | Source | File |
|----|-------|----------|--------|------|
| US-032 | Touch Probe | P4 | Gemini only | [US-032-touch-probe.md](07-auxiliary/US-032-touch-probe.md) |
| US-033 | Six Output & Serial Communication | P5 | Gemini only | [US-033-outputs-serial.md](07-auxiliary/US-033-outputs-serial.md) |

**Summary:** Auxiliary hardware and communication features.

---

## Priority Matrix

| Priority | Description | Count | Stories |
|----------|-------------|-------|---------|
| **P0** | Must-have foundation | 2 | US-001, US-002 |
| **P1** | Essential DRO features | 4 | US-003, US-004, US-005, US-006 |
| **P2** | Advanced navigation | 6 | US-007, US-008, US-009, US-010, US-011, US-012 |
| **P3** | Value-added calculations | 3 | US-013, US-014, US-015 |
| **P4** | Specialized milling/auxiliary | 9 | US-016, US-017, US-018, US-019, US-020, US-029, US-030, US-032 |
| **P5** | Setup and customization | 9 | US-021 through US-028, US-031, US-033 |

---

## Implementation Roadmap

### Phase 1: Foundation (P0) - 2 stories
**Goal:** Basic DRO display and position tracking

- [ ] US-001: Power-up display
- [ ] US-002: Sign convention

**Deliverable:** DRO powers up and displays axis positions correctly

---

### Phase 2: Core Operations (P1) - 4 stories
**Goal:** Essential daily-use features

- [ ] US-003: ABS/INC mode
- [ ] US-004: Inch/mm units
- [ ] US-005: Zero axes
- [ ] US-006: Half function

**Deliverable:** All basic machining workflows supported

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

### Phase 7: Configuration (P5) - 9 stories
**Goal:** System setup and customization

- [ ] US-021 through US-028: All setup menu features
- [ ] US-031: Error compensation (advanced)
- [ ] US-033: Six Output & Serial (advanced)

**Deliverable:** Fully configurable DRO with persistence
