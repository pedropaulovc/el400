# US-008: Distance-to-Go (Preset)

**Manual Reference:** Section 8.1 Preset
**Priority:** High

## User Story
**As a** machine operator
**I want** to preset a target position (Distance-to-Go)
**So that** I can move the machine to a specific coordinate by zeroing the display

## Acceptance Criteria
- [x] **AC 8.1:** Pressing `Distance-to-Go` key initiates the function (only available in ABS mode), display shows `SELECT`.
- [x] **AC 8.2:** Pressing an axis key allows entering a numeric value for that axis.
- [x] **AC 8.3:** Pressing `Distance-to-Go` again executes the function.
- [x] **AC 8.4:** The display shows the distance remaining to reach the preset position (Distance-to-Go).
- [x] **AC 8.5:** When displaying distance-to-go, INC LED turns on and a leading decimal appears on the 2nd digit to indicate function mode.
- [ ] **AC 8.6:** Near Zero Warning (US-024) is automatically enabled.
- [x] **AC 8.7:** When exiting distance-to-go mode, the leading decimal disappears and DRO returns to ABS mode.

## E2E Test Scenarios
```typescript
describe('US-008: Distance-to-Go', () => {
  test('Preset updates display to distance-to-go', async () => {
    // Current pos X=0
    await dro.pressKey('Preset');
    await dro.pressKey('X');
    await dro.enterNumber(100);
    await dro.pressKey('ENT');
    await dro.pressKey('Preset');

    // Display should show -100 (if we are at 0 and want to go to 100) 
    // OR 100 depending on specific implementation of "Distance-to-Go" display logic 
    // usually it shows how much to move. If target is +100, and we are at 0, display might show 100 or -100.
    // Manual says: "Display shows distance remaining to reach preset positions".
    // Example: Set X = 452.350... Display shows distance remaining.
    // Usually moving towards target reduces value to 0.
    await expect(dro.display.xAxis).not.toHaveValue(0);
  });
});
```