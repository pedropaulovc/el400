# US-G-009: Setup - Counting Direction

**Manual Reference:** Section 6.2 Parameters Setting - Direction
**Priority:** Low
**Category:** Configuration

## User Story
**As a** machine installer
**I want** to set the counting direction (`LEFt` / `riGht`) for each axis
**So that** the display counts positive/negative in accordance with the machine's actual movement convention

## Acceptance Criteria
- [ ] **AC 9.1:** In Setup Mode (Axis selected), navigate to Direction parameter.
- [ ] **AC 9.2:** Display shows `LEFt` or `riGht`.
- [ ] **AC 9.3:** Toggle using `◄4` or `6►`.
- [ ] **AC 9.4:** `LEFt`: Standard counting? (Needs verification on machine, but toggles polarity).
- [ ] **AC 9.5:** `riGht`: Opposite counting direction.
- [ ] **AC 9.6:** Save Changes to persist.

## E2E Test Scenarios
```typescript
describe('US-G-009: Counting Direction', () => {
  test('Toggle Direction', async () => {
    await dro.pressKey('Setup');
    await dro.pressKey('X');
    
    // Navigate to Direction
    // ...
    await expect(dro.display.message).toMatch(/LEFt|riGht/);
    
    const initial = await dro.display.message.getText();
    await dro.pressKey('Right'); // Toggle
    const newVal = await dro.display.message.getText();
    
    expect(newVal).not.toBe(initial);
  });
});
```
