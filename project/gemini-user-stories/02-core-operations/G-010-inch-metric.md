# US-G-010: Inch/Metric Display

**Manual Reference:** Section 7.2 Inch Metric Display
**Priority:** High
**Category:** Core Operations

## User Story
**As a** machine operator
**I want** to toggle between Inch and Millimeter units
**So that** I can work with drawings in either unit system without manual conversion

## Acceptance Criteria
- [ ] **AC 10.1:** Press `in/mm` key to toggle.
- [ ] **AC 10.2:** `Inch` LED glows when in Inch mode.
- [ ] **AC 10.3:** `mm` LED glows when in Millimeter mode.
- [ ] **AC 10.4:** The displayed value converts immediately (standard 25.4 factor).
- [ ] **AC 10.5:** Position is maintained accurately internally regardless of display mode.

## E2E Test Scenarios
```typescript
describe('US-G-010: Inch/Metric', () => {
  test('Toggle Units', async () => {
    // Assume MM default
    await dro.setDisplay('X', 25.4);
    await dro.pressKey('in/mm');
    await expect(dro.led.inch).toBeOn();
    await expect(dro.display.xAxis).toHaveValue(1.000); 
  });
});
```
