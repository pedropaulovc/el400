# US-G-015: Near Zero Warning

**Manual Reference:** Section 8.3 Near Zero Warning
**Priority:** Low
**Category:** Data Management

## User Story
**As a** machine operator
**I want** an audible alert when I am close to zero (within 50 microns)
**So that** I can slow down and avoid overshooting my target

## Acceptance Criteria
- [ ] **AC 15.1:** Automatically enabled in Preset, SDM, and Milling Functions.
- [ ] **AC 15.2:** Trigger when position is within 50 microns (0.050 mm) of zero.
- [ ] **AC 15.3:** Audible beep or visual indicator.

## E2E Test Scenarios
```typescript
describe('US-G-015: Near Zero', () => {
  test('Warning Beep', async () => {
    // In Preset mode
    await dro.setPreset('X', 0);
    // Move to 0.040 mm
    await dro.simulateEncoderMove('X', 0.040);
    await expect(dro.audio).toBePlaying();
  });
});
```
