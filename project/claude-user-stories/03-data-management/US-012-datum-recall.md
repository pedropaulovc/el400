# US-012: Datum Recall (Machine Reference)

**Manual Reference:** Section 7.7.2.2 Recall Machine Reference
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
});
```