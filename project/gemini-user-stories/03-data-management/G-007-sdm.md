# US-G-007: Sub Datum Memory (SDM)

**Manual Reference:** Section 8.2 Sub Datum Memory
**Priority:** High
**Category:** Data Management

## User Story
**As a** machine operator
**I want** to store and recall up to 1000 sub-datum points (SDM)
**So that** I can machine multiple features on a part without constantly recalculating coordinates

## Acceptance Criteria
- [ ] **AC 7.1:** Press `SDM` key to enter SDM menu. Options: `ProGrAn`, `rUn`.
- [ ] **AC 7.2:** **Program Mode:** Select `ProGrAn`. Enter Step Number. Enter X/Y/Z coordinates for that step.
- [ ] **AC 7.3:** **Learn Mode:** Under `rUn` -> `LEArn`. Move machine to position, press `6►` to store as current step.
- [ ] **AC 7.4:** **Run Mode:** Select `rUn`. Enter Step Number. Display shows Distance-to-Go for that step.
- [ ] **AC 7.5:** Navigation: `6►` (Next Step), `▲8` (Current Step), Jump to step via `Y` key.
- [ ] **AC 7.6:** `SDM` LED glows while in SDM mode.
- [ ] **AC 7.7:** Capacity: 1000 steps.

## E2E Test Scenarios
```typescript
describe('US-G-007: SDM', () => {
  test('Program SDM Step 1', async () => {
    await dro.pressKey('SDM');
    await expect(dro.display.message).toHaveText('ProGrAn');
    await dro.pressKey('ENT');
    
    // Select Step 1
    await dro.expectPrompt('StEPno');
    // Ensure we are at step 1 or navigate/enter 1
    
    // Enter Coord X=50
    await dro.pressKey('X');
    await dro.enterNumber(50);
    await dro.pressKey('ENT');
    
    // Next step
    await dro.pressKey('Right');
    await expect(dro.display.message).toContain('2'); // Step 2
  });

  test('Run SDM Step 1', async () => {
    await dro.pressKey('SDM');
    // Navigate to Run
    await dro.pressKey('Right');
    await expect(dro.display.message).toHaveText('rUn');
    await dro.pressKey('ENT');

    // Select Step 1
    // ...
    
    // Verify Display shows Distance to Go (Target 50 - Current)
  });
});
```
