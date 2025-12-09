# US-006: Half Function

**Manual Reference:** Section 7.5 Half Function
**Priority:** Medium

## User Story
**As a** machine operator
**I want** to find the center of a workpiece by halving the displayed value
**So that** I can quickly set the datum to the center point

## Acceptance Criteria
- [ ] **AC 6.1:** Pressing the `½` key initiates the Half function.
- [ ] **AC 6.2:** The display shows `SELECT`.
- [ ] **AC 6.3:** Pressing an axis key (X, Y, or Z) halves the current value of that axis.
- [ ] **AC 6.4:** Recommended use is in INC mode to avoid changing the ABS datum.

## E2E Test Scenarios
```typescript
describe('US-006: Half Function', () => {
  test('Half function halves the display value', async () => {
    await dro.setDisplay('X', 100.000);
    
    await dro.pressKey('HALF');
    await expect(dro.display.message).toHaveText('SELECT');
    
    await dro.pressKey('X');
    await expect(dro.display.xAxis).toHaveValue(50.000);
  });
});
```