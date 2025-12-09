# US-029: Linear Bolt Hole

**Manual Reference:** Section 9.1.6 Linear Bolt Hole
**Priority:** P4
**Category:** Pattern Generation

## User Story
**As a** milling operator
**I want** to create a simple linear hole pattern along an axis
**So that** I can drill equally spaced holes on one axis

## Acceptance Criteria
- [ ] **AC 29.1:** Press `Fn` -> navigate to `LinEAr`, press `ent↵`.
- [ ] **AC 29.2:** Select Axis (X, Y, or Z).
- [ ] **AC 29.3:** Enter `PitCh` (spacing between holes).
- [ ] **AC 29.4:** Enter number of holes.
- [ ] **AC 29.5:** Display shows simple incremental distance to next hole.
- [ ] **AC 29.6:** Press `6►` to advance to next hole position.
- [ ] **AC 29.7:** Press `C` to exit function.

## E2E Test Scenarios
```typescript
describe('US-029: Linear Bolt Hole', () => {
  test('Create linear hole pattern on X axis', async () => {
    await dro.pressKey('Fn');
    // Navigate to LinEAr
    await dro.selectMenuOption('LinEAr');
    await dro.pressKey('ENT');

    // Select X axis
    await dro.pressKey('X');

    // Enter pitch (spacing)
    await dro.enterNumber(10.0);
    await dro.pressKey('ENT');

    // Enter number of holes
    await dro.enterNumber(5);
    await dro.pressKey('ENT');

    // First hole position (distance to go)
    await expect(dro.display.xAxis).toHaveValue(0);

    // Advance to next hole
    await dro.pressKey('Right');
    await expect(dro.display.xAxis).toHaveValue(10.0);
  });
});
```

## Implementation Notes
- Simple linear pattern along single axis
- Useful for drilling equally-spaced holes in a line
- Simpler than Angle Hole (US-019) which supports arbitrary angles
- Related to but distinct from US-019 (Angle Hole) and US-020 (Grid)

## Related Stories
- US-019: Angle Hole (Linear Hole Pattern at any angle)
- US-020: Grid Drilling Pattern
- US-016: Bolt Circle Drilling - Full Circle

## Notes
- New story from G-020 (Gemini-only)
- Assigned ID US-029 to continue Claude numbering sequence
- Priority P4 to match other pattern generation stories
