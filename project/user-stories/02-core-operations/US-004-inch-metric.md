# US-004: Inch and Metric Display

**Manual Reference:** Section 7.2 Inch Metric Display (In / mm)
**Priority:** High

## User Story
**As a** machine operator
**I want** to toggle the display between Inch and Millimeter units
**So that** I can work with drawings using either measurement system

## Acceptance Criteria
- [ ] **AC 4.1:** Pressing the `in/mm` key toggles the display units between Inches and Millimeters.
- [ ] **AC 4.2:** The `Inch` LED indicator glows when in Inch mode.
- [ ] **AC 4.3:** The `mm` LED indicator glows when in Millimeter mode.
- [ ] **AC 4.4:** The displayed value converts correctly based on the standard conversion (1 inch = 25.4 mm).
- [ ] **AC 4.5** The DRO remembers the unit that was chosen the last time it was turned on.

## E2E Test Scenarios
```typescript
describe('US-004: Inch/Metric Mode', () => {
  test('Toggle units converts display value', async () => {
    // Assume starting in mm
    await dro.setDisplay('X', 25.400); 
    
    await dro.pressKey('in/mm');
    await expect(dro.led.inch).toBeOn();
    await expect(dro.display.xAxis).toHaveValue(1.0000); // Assuming 4 decimal places for inches

    await dro.powerOff();
    await dro.powerOn();
    await dro.pressKey('C') // Skip boot screen

    await expect(dro.led.inch).toBeOn();

    await dro.pressKey('in/mm');
    await expect(dro.led.mm).toBeOn();
    await expect(dro.display.xAxis).toHaveValue(25.400);
  });
});
```
