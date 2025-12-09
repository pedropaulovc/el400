# US-G-012: Half Function

**Manual Reference:** Section 7.5 Half Function
**Priority:** High
**Category:** Core Operations

## User Story
**As a** machine operator
**I want** to halve the current axis value
**So that** I can quickly find the center of a workpiece relative to edges

## Acceptance Criteria
- [ ] **AC 12.1:** Press `½` key. Display shows `SELECT`.
- [ ] **AC 12.2:** Press Axis key (X, Y, Z).
- [ ] **AC 12.3:** Value of selected axis is divided by 2.
- [ ] **AC 12.4:** Recommended for use in INC mode (to avoid shifting ABS datum).

## E2E Test Scenarios
```typescript
describe('US-G-012: Half Function', () => {
  test('Halve X Axis', async () => {
    await dro.setDisplay('X', 100.0);
    await dro.pressKey('Half');
    await expect(dro.display.message).toHaveText('SELECT');
    await dro.pressKey('X');
    await expect(dro.display.xAxis).toHaveValue(50.0);
  });
});
```
