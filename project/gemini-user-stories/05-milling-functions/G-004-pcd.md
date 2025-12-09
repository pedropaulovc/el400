# US-G-004: Circular Bolt Hole (PCD)

**Manual Reference:** Section 9.1.1 Circular Bolt Hole Function
**Priority:** Medium
**Category:** Milling Functions

## User Story
**As a** milling machine operator
**I want** to calculate positions for a circular bolt hole pattern
**So that** I can drill holes evenly spaced on a circle without manual coordinate calculations

## Acceptance Criteria
- [ ] **AC 4.1:** Press `PCD` key to enter function. Display shows `b hoLE` then `CirCLE`.
- [ ] **AC 4.2:** Prompt `EntCnt0`: Enter X Coordinate of Center.
- [ ] **AC 4.3:** Prompt `EntCnt1`: Enter Y Coordinate of Center.
- [ ] **AC 4.4:** Prompt `rAdiUS`: Enter Radius.
- [ ] **AC 4.5:** Prompt `AnGLE`: Enter Starting Angle (counter-clockwise from +X).
- [ ] **AC 4.6:** Prompt `hoLES`: Enter Number of Holes.
- [ ] **AC 4.7:** Display shows **Distance-to-Go** for the first hole (X and Y).
- [ ] **AC 4.8:** Navigation: `6►` (Next), `◄4` (Previous), `▲8` (Show Hole No), `2▼` (Jump).
- [ ] **AC 4.9:** Press `C` to exit.

## E2E Test Scenarios
```typescript
describe('US-G-004: PCD Function', () => {
  test('PCD Workflow', async () => {
    await dro.pressKey('PCD');
    await expect(dro.display.message).toHaveText('CirCLE');
    await dro.pressKey('ENT');

    // Center 0,0
    await dro.expectPrompt('EntCnt0');
    await dro.enterNumber(0);
    await dro.pressKey('ENT');
    await dro.expectPrompt('EntCnt1');
    await dro.enterNumber(0);
    await dro.pressKey('ENT');

    // Radius 10
    await dro.expectPrompt('rAdiUS');
    await dro.enterNumber(10);
    await dro.pressKey('ENT');

    // Angle 0
    await dro.expectPrompt('AnGLE');
    await dro.enterNumber(0);
    await dro.pressKey('ENT');

    // Holes 4
    await dro.expectPrompt('hoLES');
    await dro.enterNumber(4);
    await dro.pressKey('ENT');

    // First hole should be at X=10, Y=0 (Start Angle 0)
    // Distance to go from 0,0 should be 10, 0 (or -10, 0 depending on convention, usually target - current)
    // If we are at 0,0, target is 10,0. Dist to go = 10.
    
    await dro.pressKey('Right'); // Next hole (90 deg -> X=0, Y=10)
    // Verify values...
  });
});
```
