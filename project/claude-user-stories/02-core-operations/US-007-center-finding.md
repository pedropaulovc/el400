# US-007: Center Finding (Circle and Line)

**Manual Reference:** Section 8.4 Center Of Circle, 8.5 Center Of Line
**Priority:** Medium

## User Story
**As a** machine operator
**I want** to find the center of a circle or a line using probing points
**So that** I can determine the center coordinates without manual calculation

## Acceptance Criteria
- [ ] **AC 7.1:** Press `f^n` key to access function menu, display shows `CEntrE`, press `ent↵`.
- [ ] **AC 7.2:** For **Center of Circle**:
    - Select `CirCLE`, press `ent↵`.
    - Move to Point 1, press `6►` to store.
    - Move to Point 2, press `6►` to store.
    - Move to Point 3, press `6►` to store.
    - Display shows "Distance-to-go" to the center.
- [ ] **AC 7.3:** For **Center of Line**:
    - Select `LinE` (navigate using `6►`), press `ent↵`.
    - Move to Point 1, press `6►` to store.
    - Move to Point 2, press `6►` to store.
    - Display shows "Distance-to-go" to the center.
- [ ] **AC 7.4:** The `Fn` LED glows while in this function.

## E2E Test Scenarios
```typescript
describe('US-007: Center Finding', () => {
  test('Center of Line', async () => {
    await dro.pressKey('Fn');
    await dro.pressKey('ENT'); // Select CENTRE
    await dro.pressKey('Right'); // Select LINE
    await dro.pressKey('ENT');

    // Point 1 at 0
    await dro.simulateEncoderMove('X', 0);
    await dro.pressKey('Right'); // Store P1

    // Point 2 at 100
    await dro.simulateEncoderMove('X', 100);
    await dro.pressKey('Right'); // Store P2

    // Center should be at 50. Distance to go from 100 is -50
    await expect(dro.display.xAxis).toHaveValue(-50.000);
  });
});
```