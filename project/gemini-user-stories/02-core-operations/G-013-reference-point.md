# US-G-013: Reference Point (Home)

**Manual Reference:** Section 7.7 Setting of Reference
**Priority:** High
**Category:** Core Operations

## User Story
**As a** machine operator
**I want** to recall the machine home position using encoder reference marks
**So that** I can restore coordinates after power loss

## Acceptance Criteria
- [ ] **AC 13.1:** Press `Reference` key. Display shows `honE`.
- [ ] **AC 13.2:** Press `ent↵`. Display shows `SELECT`.
- [ ] **AC 13.3:** Press Axis key. Display shows blinking `0` or indicator waiting for mark.
- [ ] **AC 13.4:** Move machine across reference mark.
- [ ] **AC 13.5:** Display updates to stored reference value.
- [ ] **AC 13.6:** **Machine Reference (MC REF):** Navigate `honE` -> `nC rEF` to recall offset home.

## E2E Test Scenarios
```typescript
describe('US-G-013: Reference', () => {
  test('Find Reference Mark', async () => {
    await dro.pressKey('REF');
    await dro.pressKey('ENT');
    await dro.pressKey('X');
    // Simulate crossing mark
    await dro.simulateEncoderRefMark('X');
    // Expect value to jump to ref coordinate
    await expect(dro.display.xAxis).not.toBe(0);
  });
});
```
