# US-038: Keyboard Shortcuts

**Reference:** [MDN KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) and the simulator keyboard-accessibility contract
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
- [x] **AC 38.3:** Enter and NumpadEnter confirm; Period and NumpadDecimal enter decimal; Minus and NumpadSubtract toggle sign; Escape and Backspace dispatch Clear. In Axis Set, Clear removes one pending character; another Clear with an empty buffer cancels axis selection. Calculator Clear still resets the calculation.

### Axis and function shortcuts

- [x] **AC 38.4:** X/Y/Z select axes; Shift+X/Y/Z zero the corresponding axis; Shift+0 zeros all axes.
- [x] **AC 38.5:** W opens Settings, A toggles ABS/INC, U toggles inch/mm, and R invokes Reference.
- [x] **AC 38.6:** B/O/G/D/K/H/S/F invoke Bolt hole, Arc contour, Angle hole, Grid hole, Calculator, Half, SDM, and Function respectively.

### Scope and browser behavior

- [x] **AC 38.7:** Shortcuts fire only while `el400-simulator` or its appropriate descendants own focus. Focusing an external debug control does not trigger simulator shortcuts.
- [x] **AC 38.8:** Ctrl, Alt, or Meta combinations are ignored, and text-entry controls keep their native input behavior.
- [x] **AC 38.9:** Handled keys call `preventDefault`; Tab and unhandled keys keep their browser behavior. Focused native buttons continue to own native Enter/Space activation without double dispatch.
- [x] **AC 38.10:** Accepted shortcuts use the keypad click-sound path and respect the persisted beep setting. A locked shortcut is silent and cannot execute its operation; Settings remains available. If the display is asleep, one otherwise-blocked shortcut may wake it silently without executing the operation. This is a callable audio contract, not a claim that the audit host's audio device produced sound.

## Verification notes

The headed session exercised the digit, punctuation, Numpad, axis, zero, mode, menu, and navigation shortcuts in the criteria. It also checked focus ownership and modifier negative controls. A focused debug spinbutton kept native text input, and handled simulator keys did not steal it. Chrome DevTools Protocol reported an `AudioBufferSource` and `Gain` node for a handled shortcut, with no oscillator node, confirming the keypad beep path. The host speaker was not used as an audible oracle.

## Verification Procedure

Focus `data-testid="el400-simulator"` and drive real `page.keyboard` events in [`e2e/08-accessibility/US-038-keyboard-shortcuts.spec.ts`](../../../e2e/08-accessibility/US-038-keyboard-shortcuts.spec.ts). Assert visible readout and menu changes rather than handler wiring. Include focus-outside and modifier negative controls plus browser-default observation. The audio check observes the browser WebAudio graph; oscillator creation or audible host output is outside this contract. See the [verification evidence and full-suite results](../README.md#verification).

## Related Stories

- US-025: Keypad Beep
- US-037: Keyboard Navigation

## References

- [MDN KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
