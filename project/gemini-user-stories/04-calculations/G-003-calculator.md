# US-G-003: Calculator with Scientific Functions

**Manual Reference:** Section 7.6 Calculator
**Priority:** Medium
**Category:** Calculations

## User Story
**As a** machine operator
**I want** to use the built-in calculator with trigonometric functions
**So that** I can calculate coordinates and dimensions directly on the DRO

## Acceptance Criteria
- [ ] **AC 3.1:** Pressing the `Calculator` key enters calculator mode (Display shows `0` or current value).
- [ ] **AC 3.2:** Pressing the `Y` key cycles through functions in this order: `Add`, `SUb`, `nnULti` (Multi), `diu` (Div), `Sin`, `CoS`, `tAn`, `ASin`, `ACoS`, `AtAn`.
- [ ] **AC 3.3:** Standard operation: Input 1st Number -> Select Function (cycle Y) -> Press `ent↵` -> Input 2nd Number -> Press `ent↵` -> Result displayed.
- [ ] **AC 3.4:** For Trig functions (single operand): Select Function -> Press `ent↵` -> Input Number (Angle or Ratio) -> Press `ent↵` -> Result displayed.
- [ ] **AC 3.5:** Pressing `Calculator` key again exits the mode.

## E2E Test Scenarios
```typescript
describe('US-G-003: Calculator', () => {
  test('Addition: 12 + 570', async () => {
    await dro.pressKey('Calc');
    
    // Select Add (default might be 0, press Y to find Add)
    // Note: Manual says "Press Y until Add is displayed"
    // Assuming starts blank or 0
    await dro.pressKey('Y'); // Cycle to Add
    await expect(dro.display.message).toHaveText('Add');
    await dro.pressKey('ENT');

    await dro.enterNumber(12);
    await dro.pressKey('Y'); // Confirm first number? Manual says "Enter 12, press Y" for 1st op?
    // Re-reading manual 7.6.1:
    // 1. Press Calc
    // 2. Press Y until Add
    // 3. Press Ent
    // 4. Enter 12, press Y
    // 5. Enter 570, press Ent
    // 6. Result 582
    
    await dro.enterNumber(570);
    await dro.pressKey('ENT');
    
    await expect(dro.display.xAxis).toHaveValue(582);
  });

  test('Trig: Sin(30)', async () => {
    await dro.pressKey('Calc');
    
    // Cycle to Sin
    // Add, Sub, Multi, Div, Sin
    for(let i=0; i<5; i++) await dro.pressKey('Y');
    await expect(dro.display.message).toHaveText('Sin');
    await dro.pressKey('ENT');

    await dro.enterNumber(30);
    await dro.pressKey('ENT');
    
    await expect(dro.display.xAxis).toHaveValue(0.5); // Sin(30) = 0.5
  });
});
```
