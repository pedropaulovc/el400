# US-009: SDM Learn Mode

**Manual Reference:** Section 8.2.2 Learn Mode
**Priority:** Medium

## User Story
**As a** machine operator
**I want** to teach the DRO a series of sub-datum points by moving the machine to positions
**So that** I can store a machining sequence without manually entering coordinates

## Acceptance Criteria
- [ ] **AC 9.1:** Enter SDM Learn mode: Press `SDM` -> navigate to `rUn` -> `LEArn`.
- [ ] **AC 9.2:** Select starting Step Number (e.g., 1).
- [ ] **AC 9.3:** Move machine to desired position.
- [ ] **AC 9.4:** Press `6►` to store the current position as the sub-datum for the current step and automatically advance to the next step.
- [ ] **AC 9.5:** Can store up to 1000 steps.

## E2E Test Scenarios
```typescript
describe('US-009: SDM Learn Mode', () => {
  test('Learn stores current position', async () => {
    await dro.enterSDMLearnMode();
    
    // Step 1
    await dro.simulateEncoderMove('X', 10.0);
    await dro.pressKey('Right'); // Store step 1
    
    // Check if advanced to step 2
    await expect(dro.display.message).toContainText('Step 2');
    
    // Verify storage (by recalling later or checking memory if accessible)
  });
});
```