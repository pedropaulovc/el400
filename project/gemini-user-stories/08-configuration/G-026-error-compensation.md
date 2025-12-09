# US-G-026: Error Compensation

**Manual Reference:** Section 6.3 Error Compensation
**Priority:** Low
**Category:** Configuration

## User Story
**As a** machine installer
**I want** to compensate for mechanical inaccuracies (Linear or Non-Linear)
**So that** the displayed position is accurate to the standard

## Acceptance Criteria
- [ ] **AC 26.1:** Navigate to `CALib`.
- [ ] **AC 26.2:** **Linear (LEC):** Measure slip gauge -> Input Reference -> Calc Factor.
- [ ] **AC 26.3:** **Segmented (SLEC):** Divide travel into segments (up to 99). Store correction for each segment.
- [ ] **AC 26.4:** **Angular:** 360 rotation or PPR method.
