# US-G-014: Preset (Distance-to-Go)

**Manual Reference:** Section 8.1 Preset
**Priority:** Medium
**Category:** Data Management

## User Story
**As a** machine operator
**I want** to input a target position and see the "Distance-to-Go"
**So that** I can simply work until the display reads zero

## Acceptance Criteria
- [ ] **AC 14.1:** Press `Preset` (→0) key. Display `SELECT`.
- [ ] **AC 14.2:** Press Axis key -> Enter Value -> `ent↵`.
- [ ] **AC 14.3:** Repeat for other axes if needed.
- [ ] **AC 14.4:** Press `Preset` again to execute.
- [ ] **AC 14.5:** Display shows distance remaining to target.
- [ ] **AC 14.6:** Works in Incremental mode automatically.

## E2E Test Scenarios
```typescript
describe('US-G-014: Preset', () => {
  test('Set Target', async () => {
    await dro.pressKey('Preset');
    await dro.pressKey('X');
    await dro.enterNumber(50);
    await dro.pressKey('ENT');
    await dro.pressKey('Preset'); // Execute
    
    // If current is 0, dist to go is 50 (or -50)
    await expect(dro.display.xAxis).toHaveValue(50);
  });
});
```
