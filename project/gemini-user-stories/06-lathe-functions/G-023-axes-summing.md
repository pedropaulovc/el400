# US-G-023: Axes Summing and Vectoring

**Manual Reference:** Section 9.2.3 & 9.2.4
**Priority:** Low
**Category:** Lathe Functions

## User Story
**As a** lathe operator
**I want** to combine Z and Z' axes (Summing or Vectoring)
**So that** I can see the effective position of the tool tip when using the compound slide

## Acceptance Criteria
- [ ] **AC 23.1:** **Summing:** Press `Summing`. Display `Aditon`. Combines Z + Z' (or X+Z' based on setup).
- [ ] **AC 23.2:** **Vectoring:** Press `Vectoring`. Display `uECtor`. Enter Angle `u AnGLE`.
- [ ] **AC 23.3:** Calculates `Z + Z' cos(a)` and `X + Z' sin(a)`.
