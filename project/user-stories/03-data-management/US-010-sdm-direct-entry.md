# US-010: SDM Direct Entry (Program Mode)

**Manual Reference:** Section 8.2.1 Program Mode
**Priority:** Medium

## User Story
**As a** machine operator
**I want** to manually enter coordinates for sub-datum points
**So that** I can program a machining sequence from a drawing

## Acceptance Criteria
- [ ] **AC 10.1:** Enter SDM Program mode: Press `SDM`, display shows `ProGrAn`, press `ent↵`.
- [ ] **AC 10.2:** Display shows `StEPno`.
- [ ] **AC 10.3:** Enter coordinates for axes (X, Y, Z) for the current step.
- [ ] **AC 10.4:** Press `6►` to save and advance to the next step.
- [ ] **AC 10.5:** Can jump to a specific step using `Y` key inside step selection.
- [ ] **AC 10.6:** Press `C` to exit.

## E2E Test Scenarios
```typescript
describe('US-010: SDM Program Mode', () => {
  test('Program SDM steps', async () => {
    await dro.enterSDMProgramMode();

    // Step 1
    await dro.pressKey('X');
    await dro.enterNumber(50.0);
    await dro.pressKey('ENT');
    await dro.pressKey('Right'); // Next step

    await await expect(dro.display.xAxis).toHaveText('Step 2');
  });
});
```

## Related Stories
- US-009: SDM Learn Mode
- US-011: SDM Recall (Run Mode)

## Notes
- Part of SDM trilogy (US-009, US-010, US-011)
- Merged from US-010 (Claude) and partially from G-007 (Gemini)
