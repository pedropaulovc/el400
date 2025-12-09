# US-011: SDM Recall (Run Mode)

**Manual Reference:** Section 8.2.3 Run Mode
**Priority:** High

## User Story
**As a** machine operator
**I want** to recall stored sub-datum points in sequence
**So that** I can machine a part by moving to zero for each step

## Acceptance Criteria
- [ ] **AC 11.1:** Enter SDM Run mode: Press `SDM` -> navigate to `rUn`, press `ent↵`.
- [ ] **AC 11.2:** Enter required step number (or start at 1).
- [ ] **AC 11.3:** Display shows Distance-to-Go for the selected step.
- [ ] **AC 11.4:** Press `6►` to advance to the next step.
- [ ] **AC 11.5:** The `SDM` LED glows during operation.
- [ ] **AC 11.6:** Press `C` to exit.

## E2E Test Scenarios
```typescript
describe('US-011: SDM Run Mode', () => {
  test('Run sequences through steps', async () => {
    // Assume Step 1 X=50 programmed
    await dro.enterSDMRunMode();
    await dro.selectStep(1);
    
    // If current pos is 0, dist to go is 50
    // (or -50 depending on sign convention for "distance to go")
    await expect(dro.display.xAxis).not.toHaveValue(0);
    
    await dro.pressKey('Right'); // Next step
    // Verify step number increased
  });
});
```