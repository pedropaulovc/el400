# US-005: Axis Reset and Set

**Manual Reference:** Section 7.3 Axis Reset, 7.4 Axis Set
**Priority:** High

## User Story
**As a** machine operator
**I want** to zero an axis or set it to a specific value
**So that** I can establish a datum point for my machining operations

## Acceptance Criteria
- [x] **AC 5.1:** Pressing an Axis Quick Zero key (e.g., `X₀`, `Y₀`, `Z₀`) immediately resets the corresponding axis display to `0.000`.
- [x] **AC 5.2:** Warning: Resetting in ABS mode permanently redefines the datum.
- [x] **AC 5.3:** To set an axis to a specific value: Press the Axis key (e.g., `X`), enter the numeric value using the keypad, and press `ent↵`.
- [x] **AC 5.4:** The `C` key can cancel an incorrect numeric entry before `ent↵` is pressed.

## E2E Test Scenarios
```typescript
describe('US-005: Axis Reset and Set', () => {
  test('Quick Zero resets axis', async () => {
    await dro.setDisplay('X', 123.456);
    await dro.pressKey('X0'); // Axis Quick Zero key
    await expect(dro.display.xAxis).toHaveValue(0.000);
  });

  test('Set axis to specific value', async () => {
    await dro.pressKey('X');
    await dro.enterNumber(50.5);
    await dro.pressKey('ENT');
    await expect(dro.display.xAxis).toHaveValue(50.500);
  });

  test('Cancel entry', async () => {
    await dro.pressKey('X');
    await dro.enterNumber(999);
    await dro.pressKey('C');
    // Value should not change to 999
    await expect(dro.display.xAxis).not.toHaveValue(999);
  });
});
```