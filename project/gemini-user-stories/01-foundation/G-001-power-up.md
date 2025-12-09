# US-G-001: First Use and Power-Up

**Manual Reference:** Section 5.4 Power Up
**Priority:** High
**Category:** Foundation

## User Story
**As a** machine operator
**I want** to see the model and software version when I turn on the DRO
**So that** I can verify I am using the correct equipment and firmware

## Acceptance Criteria
- [ ] **AC 1.1:** Upon power on, the display shows the model number `EL404-S` momentarily.
- [ ] **AC 1.2:** Following the model number, the display shows the software version `vEr 1.0.0` momentarily.
- [ ] **AC 1.3:** Pressing the `C` key during the power-up sequence bypasses the message and goes directly to the counting screen.
- [ ] **AC 1.4:** In the 4-axis model, the display handles the Z/U axis toggle if applicable during normal operation (Note: 4.1 mention).

## E2E Test Scenarios
```typescript
describe('US-G-001: First Use and Power-Up', () => {
  test('Power up sequence displays model and version', async () => {
    await dro.powerOn();
    await expect(dro.display.xAxis).toHaveText('EL404-S'); 
    await dro.wait(2000); // Wait for potential delay
    await expect(dro.display.xAxis).toHaveText('vEr 1.0.0');
    await dro.wait(2000);
    // Should enter normal counting mode
    await expect(dro.display.xAxis).toMatch(/[\d\.-]+/); 
  });

  test('Bypass power up message with C key', async () => {
    await dro.powerOn();
    await expect(dro.display.xAxis).toHaveText('EL404-S');
    await dro.pressKey('C');
    // Expect immediate transition to counting screen
    await expect(dro.display.xAxis).toMatch(/[\d\.-]+/);
  });
});
```
