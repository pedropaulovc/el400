# US-G-008: Center Finding (Circle and Line)

**Manual Reference:** Section 8.4 & 8.5 Center Of Circle/Line
**Priority:** Medium
**Category:** Calculations

## User Story
**As a** machine operator
**I want** to find the center of a circle or line by probing points
**So that** I can set my datum to the center of the workpiece

## Acceptance Criteria
- [ ] **AC 8.1:** Press `f^n` key -> `CEntrE` -> `ent↵`.
- [ ] **AC 8.2:** **Circle Center:** Select `CirCLE`. Store 3 points on circumference (Move + Press `6►` for each).
- [ ] **AC 8.3:** **Line Center:** Select `LinE`. Store 2 points (End points).
- [ ] **AC 8.4:** After storing points, display shows **Distance-to-Go** to the calculated center.
- [ ] **AC 8.5:** `Fn` LED glows during function.

## E2E Test Scenarios
```typescript
describe('US-G-008: Center Finding', () => {
  test('Find Line Center', async () => {
    await dro.pressKey('Fn');
    await expect(dro.display.message).toHaveText('CEntrE');
    await dro.pressKey('ENT');
    
    // Navigate to Line (default might be Circle)
    await dro.pressKey('Right'); 
    await expect(dro.display.message).toHaveText('LinE');
    await dro.pressKey('ENT');

    // Store Point 1
    await dro.simulateEncoderMove('X', 0);
    await dro.pressKey('Right'); // Store

    // Store Point 2
    await dro.simulateEncoderMove('X', 100);
    await dro.pressKey('Right'); // Store

    // Result: Center is at 50. Current pos 100. Distance to go should be -50.
    await expect(dro.display.xAxis).toHaveValue(-50); 
  });
});
```
