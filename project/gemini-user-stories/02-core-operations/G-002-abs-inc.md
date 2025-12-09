# US-G-002: Absolute and Incremental Mode (ABS/INC)

**Manual Reference:** Section 7.1 Absolute / Incremental Mode
**Priority:** High
**Category:** Core Operations

## User Story
**As a** machine operator
**I want** to toggle between Absolute (ABS) and Incremental (INC) measuring modes
**So that** I can machine parts relative to a fixed datum or point-to-point without losing my main reference

## Acceptance Criteria
- [ ] **AC 2.1:** Pressing the `ABS/INC` key toggles the mode between ABS and INC.
- [ ] **AC 2.2:** The `abs` LED glows when in Absolute mode.
- [ ] **AC 2.3:** The `Inc` LED glows when in Incremental mode.
- [ ] **AC 2.4:** Switching to INC mode and zeroing an axis (reset) does NOT affect the ABS datum.
- [ ] **AC 2.5:** Switching back to ABS mode restores the position relative to the ABS datum.

## E2E Test Scenarios
```typescript
describe('US-G-002: ABS/INC Mode', () => {
  test('Toggle between ABS and INC', async () => {
    // Start in ABS
    await expect(dro.led.abs).toBeOn();
    
    await dro.pressKey('ABS/INC');
    await expect(dro.led.inc).toBeOn();
    await expect(dro.led.abs).toBeOff();

    await dro.pressKey('ABS/INC');
    await expect(dro.led.abs).toBeOn();
  });

  test('INC zeroing does not affect ABS', async () => {
    // Move to 10.000 in ABS
    await dro.simulateEncoderMove('X', 10.0);
    await expect(dro.display.xAxis).toHaveValue(10.000);

    // Switch to INC
    await dro.pressKey('ABS/INC');
    
    // Zero X in INC
    await dro.pressKey('X0'); 
    await expect(dro.display.xAxis).toHaveValue(0.000);

    // Switch back to ABS
    await dro.pressKey('ABS/INC');
    await expect(dro.display.xAxis).toHaveValue(10.000); 
  });
});
```
