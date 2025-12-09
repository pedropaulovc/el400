# US-G-006: Setup Menu - Scale Resolution

**Manual Reference:** Section 6.2 Parameters Setting - SC
**Priority:** Low
**Category:** Configuration

## User Story
**As a** machine installer/operator
**I want** to set the scale resolution (`SC`) for each axis
**So that** the DRO interprets the encoder signals correctly

## Acceptance Criteria
- [ ] **AC 6.1:** Enter Setup Mode (Press `Setup` / Wrench key). Display `SELECT`.
- [ ] **AC 6.2:** Select Axis (X, Y, or Z).
- [ ] **AC 6.3:** Navigate to `SC` parameter (using `2▼`).
- [ ] **AC 6.4:** Change value using `◄4` or `6►`.
- [ ] **AC 6.5:** Supported values: 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50 Microns.
- [ ] **AC 6.6:** Save Changes (`SAu ChG`) to persist.

## E2E Test Scenarios
```typescript
describe('US-G-006: Scale Resolution', () => {
  test('Change X Axis Resolution', async () => {
    await dro.pressKey('Setup');
    await dro.pressKey('X');
    
    // Navigate to SC
    // Assuming SC is 2nd or 3rd item, need to scroll
    await dro.pressKey('Down'); 
    await dro.pressKey('Down');
    await expect(dro.display.message).toMatch(/SC/);

    // Change value
    await dro.pressKey('Right');
    // Verify value changes (e.g., from 5 to 10)
    
    // Navigate to Save
    while((await dro.display.message.getText()) !== 'SAu ChG') {
        await dro.pressKey('Down');
    }
    await dro.pressKey('ENT');
  });
});
```
