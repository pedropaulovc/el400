# US-001: First Use and Power-Up Display

**Manual Reference:** Section 5.4 Power Up
**Priority:** High

## User Story
**As a** machine operator
**I want** to see the model and version information when I power on the DRO
**So that** I can verify the system is starting up correctly

## Acceptance Criteria
- [ ] **AC 1.1:** When the DRO is powered ON, it displays the model number (e.g., `EL404-S`) momentarily.
- [ ] **AC 1.2:** Following the model number, it displays the software version (e.g., `vEr 1.0.0`).
- [ ] **AC 1.3:** The power-up message can be bypassed by pressing the `C` key.
- [ ] **AC 1.4:** After the startup sequence, the DRO enters the normal counting display.

## E2E Test Scenarios
```typescript
describe('US-001: First Use and Power-Up', () => {
  test('Power up sequence displays model and version', async () => {
    // Simulate Power ON
    await dro.powerOn();
    await expect(dro.display).toHaveText('EL404-S'); 
    await dro.wait(1000); // Wait for potential delay
    await expect(dro.display).toHaveText('vEr 1.0.0');
  });

  test('Bypass power up message', async () => {
    await dro.powerOn();
    await dro.pressKey('C');
    // Expect immediate transition to counting screen (e.g., 0.000)
    await expect(dro.display.xAxis).toBeVisible();
  });
});
```