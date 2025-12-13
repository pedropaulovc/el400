# US-007: Center Finding (Circle and Line)

**Manual Reference:** Section 8.4 Center Of Circle, 8.5 Center Of Line
**Priority:** Medium

## User Story
**As a** machine operator
**I want** to find the center of a circle or a line using probing points
**So that** I can determine the center coordinates without manual calculation

## Acceptance Criteria
- [ ] **AC 7.1:** Press `f^n` key to access center menu, display shows `LinE` by default.
- [ ] **AC 7.2:** For **Center of Circle**:
    - Press `6` (Right) on keypad to navigate to `CirCLE`, press `ent↵`.
    - Move to Point 1, press any axis zero button (X₀, Y₀, or Z₀) to store.
    - Move to Point 2, press any axis zero button to store.
    - Move to Point 3, press any axis zero button to store.
    - Display shows "Distance-to-go" to the center.
- [ ] **AC 7.3:** For **Center of Line**:
    - `LinE` is selected by default, press `ent↵`.
    - Move to Point 1, press any axis zero button (X₀, Y₀, or Z₀) to store.
    - Move to Point 2, press any axis zero button to store.
    - Display shows "Distance-to-go" to the center.
- [ ] **AC 7.4:** The `fn` LED glows while in this function.
- [ ] **AC 7.5:** Press `C` (Clear) key to exit center finding mode.


## E2E Test Scenarios
```typescript
describe('US-007: Center Finding', () => {
  test('Center of Line', async () => {
    await dro.pressKey('Fn');

    // Display shows "LinE" by default
    await expect(dro.display.xAxis).toHaveText("LinE")
    
    await dro.pressKey('ENT'); // Confirm LINE selection

    // Point 1 at 0
    await dro.simulateEncoderMove('X', 0);
    await dro.pressKey('X0'); // Store P1 (any axis zero button)

    // Point 2 at 100
    await dro.simulateEncoderMove('X', 100);
    await dro.pressKey('X0'); // Store P2 (any axis zero button)

    // Center should be at 50. Distance to go from 100 is -50
    await expect(dro.display.xAxis).toHaveValue(-50.000);
    
    // Exit with Clear key
    await dro.pressKey('C');
  });
  
  test('Center of Circle with Navigation', async () => {
    await dro.pressKey('Fn');
    
    // Navigate to CirCLE using keypad 6 (Right)
    await dro.pressKey('6');
    await expect(dro.display.xAxis).toHaveText("CirCLE")
    
    await dro.pressKey('ENT'); // Confirm CIRCLE selection
    
    // Store 3 points...
    await dro.simulateEncoderMove('X', 100);
    await dro.pressKey('X0');
    // etc.
  });
});
```

## Related Stories
- US-015: Center of Circle (Macro) - automated alternative approach
- US-008: Distance-to-Go Function (used to display center)

## Notes
- Merged from US-007 (Claude) and G-008 (Gemini)
- This is the manual center-finding method
- For automated 3-point macro, see US-015
