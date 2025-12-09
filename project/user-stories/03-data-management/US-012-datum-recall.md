# US-012: Datum Recall (Machine Reference)

**Manual Reference:** Section 7.7.2.2 Recall Machine Reference, Section 7.7 Setting of Reference
**Priority:** High

## User Story
**As a** machine operator
**I want** to recall the machine reference point (Home)
**So that** I can restore my coordinate system after a power loss or machine movement

## Acceptance Criteria
- [ ] **AC 12.1:** Press `Reference` key -> navigate to `nC rEF` -> press `ent↵`.
- [ ] **AC 12.2:** Select axis to recall.
- [ ] **AC 12.3:** Move machine axis across the encoder reference mark.
- [ ] **AC 12.4:** Display value updates to the stored machine reference value relative to the mark.
- [ ] **AC 12.5:** For simple home function: Press `Reference` key, display shows `honE`, press `ent↵`, display shows `SELECT`.
- [ ] **AC 12.6:** After selecting axis, display shows blinking `0` or indicator waiting for mark.

## E2E Test Scenarios
```typescript
describe('US-012: Datum Recall', () => {
  test('Recall restores position', async () => {
    await dro.pressKey('REF');
    await dro.selectMenuOption('nC rEF');
    await dro.pressKey('X');

    // Simulate crossing ref mark
    await dro.simulateEncoderRefMark('X');

    // Display should jump to known reference value
    await expect(dro.display.xAxis).toBeVisible();
  });

  test('Find Reference Mark (honE mode)', async () => {
    await dro.pressKey('REF');
    await expect(dro.display.message).toHaveText('honE');
    await dro.pressKey('ENT');
    await dro.pressKey('X');
    // Simulate crossing mark
    await dro.simulateEncoderRefMark('X');
    // Expect value to jump to ref coordinate
    await expect(dro.display.xAxis).not.toBe(0);
  });
});
```

## Related Stories
- US-001: First Use and Power-Up Display

## Notes
- Merged from US-012 (Claude) and G-013 (Gemini)
- Added "honE" mode from G-013
- Terminology needs clarification: honE vs nC rEF vs MC REF
