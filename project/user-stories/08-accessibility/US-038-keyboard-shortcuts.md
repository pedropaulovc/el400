# US-038: Keyboard Shortcuts

**Reference:** Simulator keyboard accessibility and power-user contract
**Priority:** P2
**Category:** Accessibility

## User Story

**As a** keyboard user  
**I want** physical keyboard shortcuts to dispatch the same operations as the front panel  
**So that** I can operate the focused simulator efficiently

## Target Acceptance Criteria

### Entry and navigation

- [x] **AC 38.1:** `Digit0`–`Digit9` and `Numpad0`–`Numpad9` enter corresponding digits in an active entry workflow.
- [x] **AC 38.2:** Arrow Up/Down/Left/Right dispatch the front-panel 8/2/4/6 navigation actions.
- [x] **AC 38.3:** Enter and NumpadEnter confirm; Period and NumpadDecimal enter decimal; Minus and NumpadSubtract toggle sign; Escape and Backspace dispatch Clear.

### Axis and function shortcuts

- [x] **AC 38.4:** X/Y/Z select axes; Shift+X/Y/Z zero the corresponding axis; Shift+0 zeros all axes.
- [x] **AC 38.5:** W opens Settings, A toggles ABS/INC, U toggles inch/mm, and R invokes Reference.
- [x] **AC 38.6:** B/O/G/D/K/H/S/F invoke Bolt hole, Arc contour, Angle hole, Grid hole, Calculator, Half, SDM, and Function respectively.

### Scope and browser behavior

- [x] **AC 38.7:** Shortcuts fire only while `el400-simulator` or its appropriate descendants own focus. Focusing an external debug control does not trigger simulator shortcuts.
- [x] **AC 38.8:** Ctrl, Alt, or Meta combinations are ignored, and text-entry controls keep their native input behavior.
- [x] **AC 38.9:** Handled keys call `preventDefault`; Tab and unhandled keys keep their browser behavior. Focused native buttons continue to own native Enter/Space activation without double dispatch.
- [x] **AC 38.10:** Handled shortcuts use the same keypad click-sound path and respect the persisted beep setting. This is a callable audio contract, not a claim that the audit host's audio device produced sound.

## Baseline Audit

The completed headed audit passed the full key matrix, including Numpad digit/decimal/enter/subtract, Backspace, all X/Y/Z actions, R/O/G, scope gating, and window-observed `defaultPrevented=true` for handled KeyX, Digit9, and Backspace. Browser URL state did not navigate. Shortcut audio reached the audio path, but the host reported AudioContext/WebAudio device errors; audible output was therefore not claimed. The previously checked-in E2E covered only a subset of this matrix.

## Verification Procedure

Focus `data-testid="el400-simulator"` and drive real `page.keyboard` events in [`e2e/08-accessibility/US-038-keyboard-shortcuts.spec.ts`](../../../e2e/08-accessibility/US-038-keyboard-shortcuts.spec.ts). Assert user-visible readout/menu changes rather than handler wiring. Include one focus-outside negative control, one modifier negative control, browser-default observation, and count real `AudioBufferSourceNode.start()` attempts for the beep path; oscillator creation or audible host output is not the contract.

## Related Stories

- US-025: Keypad Beep
- US-037: Keyboard Navigation
