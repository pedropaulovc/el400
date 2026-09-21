# US-043: Setup Menu - Keypad Lock

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, pp. 20–21: `LoC off/on`; lock blocks every key operation except setup, protecting the datum from an accidental reset.
- **Video:** EL400 overview §1.12, `[08:04–08:36]`: all front-panel buttons except wrench become inoperative.
- **Simulator accessibility contract:** locked controls expose their unavailable state to assistive technology.

## User Story

**As a** machine operator  
**I want** to lock command input while retaining a live readout and unlock path  
**So that** accidental presses cannot alter a job datum

## Acceptance Criteria

- [ ] **AC43.1:** Global `LoC` offers `off` (factory setting) and `on`.
- [ ] **AC43.2:** When saved on, every front-panel/keyboard command except wrench/setup is ignored, including numeric entry, unit/mode changes, functions, and axis zero.
- [ ] **AC43.3:** Wrench still opens setup and permits navigation to `LoC off`.
- [ ] **AC43.4:** Machine/encoder updates continue while locked; lock gates operator input, not the live readout.
- [ ] **AC43.5:** Locked interactive controls expose disabled semantics (`aria-disabled` or equivalent) without disabling the wrench/unlock path.
- [ ] **AC43.6:** The draft lock state persists only after `SAU CHG`; after reload, a saved lock still protects the datum.

## Human Verification

Move X nonzero, save `LoC on`, and try every front-panel group plus keyboard shortcuts; none may alter state or zero X. Jog the machine and confirm the readout updates. Inspect the accessibility tree for disabled states, use wrench to save `LoC off`, and confirm normal input returns. Reload both saved states and include an unsaved toggle control.

## Automated Coverage

- [`e2e/06-configuration/US-043-keypad-lock.spec.ts`](../../../e2e/06-configuration/US-043-keypad-lock.spec.ts)

## Baseline Audit (before the current implementation work)

Functional locking, wrench escape, live motion, persistence, and datum protection passed. Controls remained DOM-enabled with no `aria-disabled`, so the accessibility criterion was a confirmed gap. Whole-transaction rollback also requires integrated revalidation.
