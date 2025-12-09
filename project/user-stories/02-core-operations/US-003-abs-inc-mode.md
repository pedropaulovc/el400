# US-003: Absolute and Incremental Mode

**Manual Reference:** Section 7.1 Absolute / Incremental Mode (ABS / INC)
**Priority:** High

## User Story
**As a** machine operator
**I want** to switch between Absolute (ABS) and Incremental (INC) modes
**So that** I can work from a fixed datum or relative to the last position without losing my machine zero

## Acceptance Criteria
- [ ] **AC 3.1:** Pressing the `ABS/INC` key toggles the mode between Absolute and Incremental.
- [ ] **AC 3.2:** The `abs` LED indicator glows when in Absolute mode.
- [ ] **AC 3.3:** The `Inc` LED indicator glows when in Incremental mode.
- [ ] **AC 3.4:** Changing to INC mode allows setting a temporary datum (point-to-point use) without affecting the ABS datum.
- [ ] **AC 3.5:** Switching back to ABS mode restores the display to the position relative to the fixed ABS datum.

## E2E Test Scenarios
```typescript
describe('US-003: ABS/INC Mode', () => {
  test('Toggle between ABS and INC', async () => {
    // Default starts in ABS
    await expect(dro.led.abs).toBeOn();
    
    await dro.pressKey('ABS/INC');
    await expect(dro.led.inc).toBeOn();
    await expect(dro.led.abs).toBeOff();

    await dro.pressKey('ABS/INC');
    await expect(dro.led.abs).toBeOn();
  });

  test('INC mode allows independent zeroing', async () => {
    // In ABS mode, move to 10
    await dro.simulateEncoderMove('X', 10);
    await expect(dro.display.xAxis).toHaveValue(10);

    // Switch to INC
    await dro.pressKey('ABS/INC');
    
    // Zero X in INC
    await dro.pressKey('X0'); 
    await expect(dro.display.xAxis).toHaveValue(0);

    // Switch back to ABS
    await dro.pressKey('ABS/INC');
    await expect(dro.display.xAxis).toHaveValue(10); // ABS value preserved
  });
});
```