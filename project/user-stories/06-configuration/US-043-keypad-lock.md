# US-043: Setup Menu - Keypad Lock

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: `LoC off/on`; lock blocks every key operation except setup, protecting the datum from an accidental reset.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.12, `[08:04–08:36]`: all front-panel buttons except wrench become inoperative.
- **Simulator accessibility contract:** locked controls expose their unavailable state to assistive technology.

## User Story

**As a** machine operator  
**I want** to lock command input while retaining a live readout and unlock path  
**So that** accidental presses cannot alter a job datum

## Acceptance Criteria

- [x] **AC43.1:** Global `LoC` offers `off` (factory setting) and `on`.
- [x] **AC43.2:** When saved on, every front-panel/keyboard command except wrench/setup is ignored, including numeric entry, unit/mode changes, functions, and axis zero.
- [x] **AC43.3:** Wrench still opens setup and permits navigation to `LoC off`.
- [x] **AC43.4:** Machine/encoder updates continue while locked; lock gates operator input, not the live readout.
- [x] **AC43.5:** Locked interactive controls expose disabled semantics (`aria-disabled` or equivalent) without disabling the wrench/unlock path.
- [x] **AC43.6:** The draft lock state persists only after `SAU CHG`; after reload, a saved lock still protects the datum.

## Human Verification

Move X nonzero, save `LoC on`, and try every front-panel group plus keyboard shortcuts; none may alter state or zero X. Jog the machine and confirm the readout updates. Inspect the accessibility tree for disabled states, use wrench to save `LoC off`, and confirm normal input returns. Reload both saved states and include an unsaved toggle control.

## Automated Coverage

- [`e2e/06-configuration/US-043-keypad-lock.spec.ts`](../../../e2e/06-configuration/US-043-keypad-lock.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

With saved `LoC on`, Settings was the only enabled front-panel button; the other 32 buttons were natively disabled and visibly dimmed. Setup controls stayed enabled while setup was open, so the operator could save `LoC off`. Keyboard shortcuts could not bypass the lock, external debug motion kept the coordinate live, the saved lock survived reload, and unlocking restored all 33 controls. An unsaved lock draft reverted to the saved state.

Native browser disabled state and styling were inspected, but speech from an installed screen reader was not. The rendered panel and debug encoder controls stood in for physical keypad and encoder hardware.
