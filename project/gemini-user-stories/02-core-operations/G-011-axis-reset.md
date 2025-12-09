# US-G-011: Axis Reset and Set

**Manual Reference:** Section 7.3 Axis Reset & 7.4 Axis Set
**Priority:** High
**Category:** Core Operations

## User Story
**As a** machine operator
**I want** to zero an axis or set it to a specific value
**So that** I can establish a reference point for machining

## Acceptance Criteria
- [ ] **AC 11.1:** Press Axis Quick Zero key (e.g., `X0`) to reset axis to `0.000`.
- [ ] **AC 11.2:** **Set Value:** Press Axis key (e.g., `X`) -> Enter number -> Press `ent↵`.
- [ ] **AC 11.3:** Setting value in ABS mode warns/changes datum permanently.
- [ ] **AC 11.4:** `C` key cancels incorrect entry.

## E2E Test Scenarios
```typescript
describe('US-G-011: Axis Set/Reset', () => {
  test('Quick Zero', async () => {
    await dro.setDisplay('X', 123.456);
    await dro.pressKey('X0');
    await expect(dro.display.xAxis).toHaveValue(0.000);
  });

  test('Set Specific Value', async () => {
    await dro.pressKey('X');
    await dro.enterNumber(50);
    await dro.pressKey('ENT');
    await expect(dro.display.xAxis).toHaveValue(50.000);
  });
});
```
