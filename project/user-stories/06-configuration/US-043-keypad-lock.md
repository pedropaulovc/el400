# US-043: Setup Menu - Keypad Lock (LoC)

**Manual Reference:** Section 6.2 Parameters Setting (`LoC off` / `LoC on`, note *3); EL400 video manual §1.12 "Lock function `LOC`"
**Priority:** P5
**Category:** Configuration

## User Story
**As a** machine operator
**I want** to lock the front panel while a job is running
**So that** nobody accidentally zeroes an axis or changes a value and loses my datum

## Acceptance Criteria
- [x] **AC 43.1:** The `LoC` parameter is available in setup with choices `LoC off` (default) and `LoC on`.
- [x] **AC 43.2:** When `LoC on` is saved, **all** front-panel keys are disabled **except** the 🔧 wrench (setup) key.
- [x] **AC 43.3:** Pressing any locked key has no effect (and, per beep settings, may give no/locked feedback).
- [x] **AC 43.4:** The wrench key still enters setup so the operator can navigate to `LoC` and set `LoC off` to unlock.
- [x] **AC 43.5:** Position display continues to update live while locked (lock affects input only, not the readout).
- [x] **AC 43.6:** The lock state persists after power cycle when saved via `SAU CHG`.
- [x] **AC 43.7:** While locked, the datum/ABS zero is protected from accidental reset (the purpose per note *3).

## E2E Test Scenarios
```typescript
describe('US-043: Keypad Lock', () => {
  test('locked keypad ignores axis zero', async () => {
    await dro.setKeypadLock(true);
    await dro.zeroAxis('X');                 // BTN_ZERO_X
    await expect(dro.display.xAxis).not.toHaveValue(0.0000); // unchanged
  });

  test('wrench still enters setup while locked', async () => {
    await dro.setKeypadLock(true);
    await dro.pressKey('SETUP');
    await expect(dro.display.message).toHaveText('SELECT');
  });

  test('display keeps updating while locked', async () => {
    await dro.setKeypadLock(true);
    await dro.simulateMove('X', 5.000);
    await expect(dro.display.xAxis).toHaveValue(5.000);
  });

  test('unlock via setup restores key input', async () => {
    await dro.setKeypadLock(true);
    await dro.pressKey('SETUP');
    await dro.navigateTo('LoC');
    await dro.pressKey('KEY_4_LEFT');        // ◄ to LoC off
    await dro.exitSetupSaving();
    await dro.zeroAxis('X');
    await expect(dro.display.xAxis).toHaveValue(0.0000);
  });
});
```

## Implementation Notes
- Model as a top-level gate in the reducer: when `keypadLocked` is true, drop every event
  except `BTN_FUNCTION`-class setup entry and the internal `MILL_STATE_CHANGED` (position) events.
- Store as global `keypadLocked: boolean` in non-volatile memory.
- Keyboard-accessibility (US-037/US-038): locked state must be announced to screen readers,
  and locked controls marked `aria-disabled`.

## Related Stories
- US-005: Zeroing Individual Axes (the operation being protected)
- US-039: Setup Menu Navigation (unlock path)
- US-037 / US-038: Keyboard Navigation & Shortcuts (accessible lock state)

## Notes
- New story from crosscheck. `LoC` is in the §6.2 table and video §1.12 but had no story.
</content>
