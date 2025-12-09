# US-G-017: Arc Contouring

**Manual Reference:** Section 9.1.3 Arc Contouring Function
**Priority:** Low
**Category:** Milling Functions

## User Story
**As a** milling operator
**I want** to cut a smooth arc by drilling a series of closely spaced holes (steps)
**So that** I can approximate a curved edge

## Acceptance Criteria
- [ ] **AC 17.1:** Press `Arc Contouring` key (Display `ArC Cnt`).
- [ ] **AC 17.2:** Enter: Center, Radius, Start Angle, End Angle.
- [ ] **AC 17.3:** Enter: `tool di` (Tool Diameter).
- [ ] **AC 17.4:** Select Cut Type: `int CUt` (Internal), `EHt CUt` (External), `nid CUt` (Mid/Center).
- [ ] **AC 17.5:** Enter: `nAH CUt` (Max cut step size).
- [ ] **AC 17.6:** DRO calculates step positions.

## E2E Test Scenarios
```typescript
describe('US-G-017: Arc Contour', () => {
  test('External Cut', async () => {
    await dro.pressKey('ArcContour');
    // ... Enter params ...
    await dro.expectPrompt('tool di');
    // ...
    await dro.pressKey('Right'); // Toggle to EHt CUt
    // ...
  });
});
```
