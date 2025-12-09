# US-G-016: Arc Bolt Hole

**Manual Reference:** Section 9.1.2 Arc Bolt Hole Function
**Priority:** Medium
**Category:** Milling Functions

## User Story
**As a** milling operator
**I want** to drill holes along an arc (partial circle)
**So that** I can create curved patterns defined by start and end angles

## Acceptance Criteria
- [ ] **AC 16.1:** Press `PCD` -> Navigate `6►` to `ArC` -> `ent↵`.
- [ ] **AC 16.2:** Enter: Center (X, Y), Radius, `Str AnG` (Start), `End AnG` (End), `hoLES` (Count).
- [ ] **AC 16.3:** Calculate positions based on angle span.
- [ ] **AC 16.4:** Show Distance-to-Go for each hole.

## E2E Test Scenarios
```typescript
describe('US-G-016: Arc Bolt Hole', () => {
  test('Arc Setup', async () => {
    await dro.pressKey('PCD');
    await dro.pressKey('Right'); // Select Arc
    await dro.pressKey('ENT');
    // Enter params...
    await dro.expectPrompt('Str AnG');
    // ...
  });
});
```
