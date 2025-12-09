# US-G-022: Taper Function

**Manual Reference:** Section 9.2.2 Taper Function
**Priority:** Low
**Category:** Lathe Functions

## User Story
**As a** lathe operator
**I want** to calculate the taper angle of a workpiece
**So that** I can set the compound slide correctly

## Acceptance Criteria
- [ ] **AC 22.1:** Touch tool to one end of taper -> Reset axes.
- [ ] **AC 22.2:** Press `Taper` key. Display `tAPEr`.
- [ ] **AC 22.3:** Move tool to other end of taper.
- [ ] **AC 22.4:** Display shows Taper Angle on one axis and Radius on the other (dependant on Setup `tAPEron`).

## E2E Test Scenarios
```typescript
describe('US-G-022: Taper', () => {
  test('Calculate Taper', async () => {
    await dro.pressKey('X0');
    await dro.pressKey('Z0');
    await dro.pressKey('Taper');
    // Move
    await dro.simulateEncoderMove('X', 10);
    await dro.simulateEncoderMove('Z', 20);
    // Check Angle display
  });
});
```
