# US-001: First Use and Power-Up Display

**Manual Reference:** Section 5.4 Power Up
**Priority:** Low

## User Story
**As a** machine operator
**I want** to see the model and version information when I power on the DRO
**So that** I can verify the system is starting up correctly

## Acceptance Criteria
- [ ] **AC 1.1:** When the DRO is powered ON, it displays the model number (e.g., `EL400`) momentarily on X axis.
- [ ] **AC 1.2:** It displays the software version (e.g., `vEr 1.0.0`) on the Y axis.
- [ ] **AC 1.3:** The power-up message can be bypassed by pressing the `C` key.
- [ ] **AC 1.4:** After the startup sequence, the DRO enters the normal counting display.

## E2E Test Scenarios
```typescript
describe('US-001: First Use and Power-Up', () => {
  test('Power up sequence displays model and version', async () => {
    // Simulate Power ON
    await dro.powerOn();
    await expect(dro.display.xAxis).toHaveText('EL400');
    await expect(dro.display.yAxis).toHaveText('vEr 1.0.0');
    await dro.wait(1000);
    // Should enter normal counting mode
    await expect(dro.display.xAxis).toHaveNumber(0.0000)
    await expect(dro.display.yAxis).toHaveNumber(0.0000)
    await expect(dro.display.zAxis).toHaveNumber(0.0000)
  });

  test('Bypass power up message', async () => {
    await dro.powerOn();
    await dro.pressKey('C');
    // Expect immediate transition to counting screen (e.g., 0.000)
    await expect(dro.display.xAxis).toHaveNumber(0.0000)
    await expect(dro.display.yAxis).toHaveNumber(0.0000)
    await expect(dro.display.zAxis).toHaveNumber(0.0000)
  });
});
```

## Non Functional Requirements
- [ ] **NF 1.1** E2E tests bypass the power up sequency by default and can assume that the DRO is in counting mode immediately.

## Related Stories
- US-002: Sign Convention and Axis Direction
- US-021 to US-028: Configuration settings that affect initial display

## Notes
- Merged from US-001 (Claude) and G-001 (Gemini)
- Enhanced test coverage with numeric display pattern check from G-001
- Added 4-axis consideration from G-001
