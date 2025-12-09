# US-G-005: Tool Offset (Lathe)

**Manual Reference:** Section 9.2.1 Tool Offset
**Priority:** Medium
**Category:** Lathe Functions

## User Story
**As a** lathe operator
**I want** to store offsets for multiple tools (up to 9)
**So that** I can change tools without re-zeroing the machine for each tool

## Acceptance Criteria
- [ ] **AC 5.1:** Press `Tool Offset` key. Display shows `tooLS` then `ProGrAn` (Program Mode).
- [ ] **AC 5.2:** Program Mode: Enter `tool no`.
- [ ] **AC 5.3:** Set X offset: Touch diameter, measure, enter Diameter value.
- [ ] **AC 5.4:** Set Z offset: Touch face, enter Z value (usually 0).
- [ ] **AC 5.5:** Support up to 9 tools.
- [ ] **AC 5.6:** Run Mode: Select `rUn` in Tool Offset menu. Enter tool number to recall offset.
- [ ] **AC 5.7:** Display updates position based on selected tool offset.

## E2E Test Scenarios
```typescript
describe('US-G-005: Tool Offset', () => {
  test('Program Tool 1', async () => {
    await dro.pressKey('ToolOffset');
    await expect(dro.display.message).toHaveText('ProGrAn');
    await dro.pressKey('ENT');
    
    await dro.expectPrompt('tool no');
    await dro.enterNumber(1);
    await dro.pressKey('ENT');

    // Set X
    await dro.pressKey('X');
    await dro.enterNumber(25.4); // Measured diameter
    await dro.pressKey('ENT');

    // Set Z
    await dro.pressKey('Z');
    await dro.pressKey('ENT'); // Zero face
  });

  test('Recall Tool 1', async () => {
    // Enter Run Mode
    await dro.pressKey('ToolOffset');
    await dro.pressKey('Right'); // Navigate to Run
    await dro.pressKey('ENT');
    
    await dro.enterNumber(1); // Tool 1
    await dro.pressKey('ENT');

    // Check if display adjusted (logic depends on current abs position + offset)
  });
});
```
