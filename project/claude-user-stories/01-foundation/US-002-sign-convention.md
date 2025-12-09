# US-002: Sign Convention and Axis Movement

**Manual Reference:** Section 6.2 Parameters Setting (Direction)
**Priority:** High

## User Story
**As a** machine operator
**I want** the DRO display to update according to the movement of the machine axes
**So that** I can track the position of the tool relative to the workpiece

## Acceptance Criteria
- [ ] **AC 2.1:** Moving the encoder in one direction increases the displayed value (positive counting).
- [ ] **AC 2.2:** Moving the encoder in the opposite direction decreases the displayed value (negative counting).
- [ ] **AC 2.3:** The counting direction can be configured as `LEFt` or `riGht` in the Setup parameters (see US-023).
- [ ] **AC 2.4:** The display shows a negative sign (`-`) when the value is less than zero.

## E2E Test Scenarios
```typescript
describe('US-002: Sign Convention', () => {
  test('Positive movement updates display', async () => {
    // Assuming default direction
    await dro.simulateEncoderMove('X', 10.0);
    await expect(dro.display.xAxis).toContainText('10.000');
  });

  test('Negative movement updates display', async () => {
    await dro.simulateEncoderMove('X', -5.0);
    await expect(dro.display.xAxis).toContainText('-5.000');
  });
});
```