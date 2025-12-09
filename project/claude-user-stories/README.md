# EL400 DRO User Stories

Comprehensive user stories derived from the MagXact-MX-100M-Manual.md, organized by functional area with clear acceptance criteria that can become E2E tests.

## Overview

**Total Stories:** 28
**Source:** MagXact-MX-100M-Manual.md
**Purpose:** Guide implementation of EL400 DRO simulator features
**Format:** Each story includes acceptance criteria and E2E test scenarios

---

## Story Index by Category

### 01. Foundation (2 stories)

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| US-001 | First Use and Power-Up Display | P0 | ⬜ Not Started | [US-001-first-use.md](01-foundation/US-001-first-use.md) |
| US-002 | Sign Convention and Axis Direction | P0 | ⬜ Not Started | [US-002-sign-convention.md](01-foundation/US-002-sign-convention.md) |

**Summary:** Basic DRO startup behavior and coordinate system conventions.

---

### 02. Core Operations (5 stories)

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| US-003 | Absolute vs Incremental Mode | P1 | ⬜ Not Started | [US-003-abs-inc-mode.md](02-core-operations/US-003-abs-inc-mode.md) |
| US-004 | Inch vs Metric Display | P1 | ⬜ Not Started | [US-004-inch-metric.md](02-core-operations/US-004-inch-metric.md) |
| US-005 | Zeroing Individual Axes | P1 | ⬜ Not Started | [US-005-zero-axes.md](02-core-operations/US-005-zero-axes.md) |
| US-006 | Half Function (Divide by 2) | P1 | ⬜ Not Started | [US-006-half-function.md](02-core-operations/US-006-half-function.md) |
| US-007 | Center Finding (Manual Method) | P1 | ⬜ Not Started | [US-007-center-finding.md](02-core-operations/US-007-center-finding.md) |

**Summary:** Fundamental DRO operations every user needs.

---

### 03. Data Management (5 stories)

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| US-008 | Distance-to-Go Function | P2 | ⬜ Not Started | [US-008-distance-to-go.md](03-data-management/US-008-distance-to-go.md) |
| US-009 | Sub-Datum Memory (SDM) - Program/Learn Mode | P2 | ⬜ Not Started | [US-009-sdm-learn.md](03-data-management/US-009-sdm-learn.md) |
| US-010 | Sub-Datum Memory (SDM) - Direct Entry Mode | P2 | ⬜ Not Started | [US-010-sdm-direct-entry.md](03-data-management/US-010-sdm-direct-entry.md) |
| US-011 | Sub-Datum Memory (SDM) - Run/Recall Mode | P2 | ⬜ Not Started | [US-011-sdm-recall.md](03-data-management/US-011-sdm-recall.md) |
| US-012 | Datum Recall After Power Loss | P2 | ⬜ Not Started | [US-012-datum-recall.md](03-data-management/US-012-datum-recall.md) |

**Summary:** Advanced position memory, navigation, and recovery features.

---

### 04. Calculations (3 stories)

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| US-013 | Basic Calculator Functions | P3 | ⬜ Not Started | [US-013-basic-calculator.md](04-calculations/US-013-basic-calculator.md) |
| US-014 | Trigonometric Calculator Functions | P3 | ⬜ Not Started | [US-014-trig-functions.md](04-calculations/US-014-trig-functions.md) |
| US-015 | Center of Circle (Macro) | P3 | ⬜ Not Started | [US-015-center-circle-macro.md](04-calculations/US-015-center-circle-macro.md) |

**Summary:** Built-in calculator and geometric calculation macros.

---

### 05. Pattern Generation (5 stories)

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| US-016 | Bolt Circle Drilling - Full Circle | P4 | ⬜ Not Started | [US-016-bolt-circle-full.md](05-pattern-generation/US-016-bolt-circle-full.md) |
| US-017 | Bolt Circle Drilling - Arc | P4 | ⬜ Not Started | [US-017-bolt-circle-arc.md](05-pattern-generation/US-017-bolt-circle-arc.md) |
| US-018 | Arc Contouring (Step Drilling) | P4 | ⬜ Not Started | [US-018-arc-contouring.md](05-pattern-generation/US-018-arc-contouring.md) |
| US-019 | Angle Hole (Linear Hole Pattern) | P4 | ⬜ Not Started | [US-019-angle-hole.md](05-pattern-generation/US-019-angle-hole.md) |
| US-020 | Grid Drilling Pattern | P4 | ⬜ Not Started | [US-020-grid-drilling.md](05-pattern-generation/US-020-grid-drilling.md) |

**Summary:** Automated drilling patterns for milling operations.

---

### 06. Configuration (8 stories)

| ID | Title | Priority | Status | File |
|----|-------|----------|--------|------|
| US-021 | Setup Menu - Scale Resolution | P5 | ⬜ Not Started | [US-021-scale-resolution.md](06-configuration/US-021-scale-resolution.md) |
| US-022 | Setup Menu - Display Resolution | P5 | ⬜ Not Started | [US-022-display-resolution.md](06-configuration/US-022-display-resolution.md) |
| US-023 | Setup Menu - Scale Direction | P5 | ⬜ Not Started | [US-023-scale-direction.md](06-configuration/US-023-scale-direction.md) |
| US-024 | Setup Menu - Zero Approach Warning | P5 | ⬜ Not Started | [US-024-zero-approach-warning.md](06-configuration/US-024-zero-approach-warning.md) |
| US-025 | Setup Menu - Keypad Beep | P5 | ⬜ Not Started | [US-025-keypad-beep.md](06-configuration/US-025-keypad-beep.md) |
| US-026 | Setup Menu - Display Sleep Timer | P5 | ⬜ Not Started | [US-026-sleep-timer.md](06-configuration/US-026-sleep-timer.md) |
| US-027 | Setup Menu - Save Changes | P5 | ⬜ Not Started | [US-027-save-changes.md](06-configuration/US-027-save-changes.md) |
| US-028 | Setup Menu - Restore Factory Defaults | P5 | ⬜ Not Started | [US-028-restore-defaults.md](06-configuration/US-028-restore-defaults.md) |

**Summary:** System configuration, setup, and maintenance features.

---

## Priority Matrix

| Priority | Description | Count | Stories |
|----------|-------------|-------|---------|
| **P0** | Must-have foundation | 2 | US-001, US-002 |
| **P1** | Essential DRO features | 5 | US-003, US-004, US-005, US-006, US-007 |
| **P2** | Advanced navigation | 5 | US-008, US-009, US-010, US-011, US-012 |
| **P3** | Value-added calculations | 3 | US-013, US-014, US-015 |
| **P4** | Specialized milling macros | 5 | US-016, US-017, US-018, US-019, US-020 |
| **P5** | Setup and customization | 8 | US-021 through US-028 |

---

## Implementation Roadmap

### Phase 1: Foundation (P0)
**Goal:** Basic DRO display and position tracking

- [ ] US-001: Power-up display
- [ ] US-002: Sign convention

**Deliverable:** DRO powers up and displays axis positions correctly

---

### Phase 2: Core Operations (P1)
**Goal:** Essential daily-use features

- [ ] US-003: ABS/INC mode
- [ ] US-004: Inch/mm units
- [ ] US-005: Zero axes
- [ ] US-006: Half function
- [ ] US-007: Center finding

**Deliverable:** All basic machining workflows supported

---

### Phase 3: Data Management (P2)
**Goal:** Advanced position memory and navigation

- [ ] US-008: Distance-to-go
- [ ] US-009: SDM Learn
- [ ] US-010: SDM Direct Entry
- [ ] US-011: SDM Recall
- [ ] US-012: Datum recovery

**Deliverable:** Multi-location work and datum management

---

### Phase 4: Calculations (P3)
**Goal:** Built-in math tools

- [ ] US-013: Basic calculator
- [ ] US-014: Trig functions
- [ ] US-015: Circle center macro

**Deliverable:** On-machine calculations eliminate external tools

---

### Phase 5: Pattern Generation (P4)
**Goal:** Automated drilling patterns

- [ ] US-016: Bolt circle (full)
- [ ] US-017: Bolt circle (arc)
- [ ] US-018: Arc contouring
- [ ] US-019: Angle hole
- [ ] US-020: Grid drilling

**Deliverable:** All milling macros operational

---

### Phase 6: Configuration (P5)
**Goal:** System setup and customization

- [ ] US-021 through US-028: All setup menu features

**Deliverable:** Fully configurable DRO with persistence

---

## Testing Progress Dashboard

### Test Coverage Summary

| Category | Stories | E2E Scenarios | Acceptance Criteria |
|----------|---------|---------------|---------------------|
| Foundation | 2 | ~12 | 10 |
| Core Operations | 5 | ~40 | 27 |
| Data Management | 5 | ~50 | 42 |
| Calculations | 3 | ~20 | 26 |
| Pattern Generation | 5 | ~60 | 67 |
| Configuration | 8 | ~50 | 54 |
| **TOTAL** | **28** | **~232** | **226** |

### Status Legend

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ⚠️ Blocked

---

## Story File Format

Each user story file contains:

### 1. Header
- Story ID and title
- Priority (P0-P5)
- Category
- Manual reference (section and line numbers)

### 2. User Story
Standard format: "As a [role], I want [feature], so that [benefit]"

### 3. Acceptance Criteria
Detailed, testable requirements (5-15 per story)

### 4. E2E Test Scenarios
TypeScript/Playwright test descriptions mapped to acceptance criteria

### 5. Implementation Notes
Technical considerations, dependencies, edge cases

### 6. Related Stories
Links to dependent or related user stories

---

## Quick Reference

### By Manual Section

| Manual Section | User Stories |
|----------------|--------------|
| Introduction > FIRST USE | US-001 |
| Introduction > FAQ | US-002 |
| SETUP MENU | US-021 through US-028 |
| BASIC FUNCTIONS | US-003, US-004, US-005 |
| CENTER FIND | US-006, US-007, US-015 |
| SUB-DATUM SYSTEM | US-009, US-010, US-011 |
| MATH CALCULATIONS | US-013, US-014 |
| HOLE DRILLING PROGRAMS | US-016 through US-020 |
| POWER INTERRUPTION & DATUM RECALL | US-012 |
| PRECISE REPOSITIONING | US-008 |

### By Feature Type

**Display & Modes:**
- US-001 (Power-up)
- US-002 (Sign convention)
- US-003 (ABS/INC)
- US-004 (Inch/mm)

**Position Control:**
- US-005 (Zeroing)
- US-008 (Distance-to-go)
- US-012 (Datum recall)

**Calculations:**
- US-006 (Half function)
- US-007 (Manual center-find)
- US-013 (Calculator)
- US-014 (Trig)
- US-015 (Circle center macro)

**Memory & Navigation:**
- US-009 (SDM Learn)
- US-010 (SDM Direct Entry)
- US-011 (SDM Recall)

**Macros & Patterns:**
- US-016 (Bolt circle)
- US-017 (Arc holes)
- US-018 (Arc contouring)
- US-019 (Linear holes)
- US-020 (Grid)

**Configuration:**
- US-021 through US-028 (Setup menu)

---

## Development Notes

### Current Implementation Status

As of initial documentation (December 2025):
- ✅ Basic display and axis tracking
- ✅ ABS/INC mode toggle
- ✅ Inch/mm conversion
- ✅ Individual axis zeroing
- ✅ Half function
- ⬜ All other features pending

### Testing Strategy

1. **Unit Tests:** Individual component behavior
2. **Integration Tests:** Feature interactions
3. **E2E Tests:** Complete user workflows (defined in stories)
4. **Manual Testing:** Visual verification, usability

### Tech Stack

- **Framework:** React 18 + TypeScript
- **Testing:** Vitest (unit), Playwright (E2E)
- **State:** React hooks
- **Styling:** Tailwind CSS

---

## Contributing

When implementing a user story:

1. **Review acceptance criteria** thoroughly
2. **Implement feature** following DRO manual specifications
3. **Write E2E tests** based on test scenarios in story
4. **Update story status** in this README
5. **Document any deviations** from original story

---

## Links

- **Source Manual:** `vendor/MagXact-MX-100M-Manual/MagXact-MX-100M-Manual.md`
- **Project Root:** `../../`
- **Source Code:** `../../src/`
- **Tests:** `../../tests/` (E2E), `../../src/**/*.test.tsx` (unit)

---

## License

User stories documentation: © 2025
Based on MagXact-MX-100M manual © 2021 Quality Machine Tools, LLC

---

**Last Updated:** December 2025
**Document Version:** 1.0
**Total Stories:** 28
