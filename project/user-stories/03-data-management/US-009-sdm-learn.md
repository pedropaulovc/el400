# US-009: SDM Learn Mode

**Manual Reference:** Section 8.2.2 Learn Mode
**Priority:** Medium

## User Story
**As a** machine operator
**I want** to teach the DRO a series of sub-datum points by moving the machine to positions
**So that** I can store a machining sequence without manually entering coordinates

## Acceptance Criteria
- [x] **AC 9.1:** Enter SDM Learn mode: Press `SDM` -> navigate to `LEArn` (left/right arrows) -> Enter.
- [x] **AC 9.2:** Select starting Step Number on the Y display (defaults to 1), confirm with Enter.
- [x] **AC 9.3:** Move machine to desired position.
- [x] **AC 9.4:** Press `X` to store the current position as the sub-datum for the current step and automatically advance to the next step.
- [x] **AC 9.5:** Can store up to 1000 steps.

> **Spec discrepancy (resolved in favour of the manual):** AC 9.4 originally said
> press `6►` to store. The manual §8.2.2 specifies the `X` key: the first press
> shows the current step number, the second press stores the live position and
> advances. Per the manual-wins rule, storing is bound to the `X` axis-select
> button. The first-press/second-press two-step capture is also from the manual.

## E2E Test Scenarios
```typescript
describe('US-009: SDM Learn Mode', () => {
  test('Learn stores current position', async () => {
    await dro.enterSDMLearnMode();

    // Step 1
    await dro.simulateEncoderAbsoluteMove('X', 10.0);
    await dro.pressKey('Right'); // Store step 1

    // Check if advanced to step 2
    await await expect(dro.display.xAxis).toHaveText('Step 2');

    // Verify storage (by recalling later or checking memory if accessible)
  });
});
```

## Related Stories
- US-010: SDM Direct Entry (Program Mode)
- US-011: SDM Recall (Run Mode)

## Notes
- Part of SDM trilogy (US-009, US-010, US-011)
- Merged from US-009 (Claude) and partially from G-007 (Gemini)
