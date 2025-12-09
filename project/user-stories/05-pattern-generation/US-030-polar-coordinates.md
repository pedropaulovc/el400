# US-030: Polar Coordinates

**Manual Reference:** Section 9.1.7 Polar Co-ordinates
**Priority:** P4
**Category:** Pattern Generation

## User Story
**As a** milling operator
**I want** to view positions in Polar coordinates (Radius/Angle)
**So that** I can work with radial drawings

## Acceptance Criteria
- [ ] **AC 30.1:** Press `Fn` -> navigate to `PoLAr`, press `ent↵`.
- [ ] **AC 30.2:** Select Plane: `H-Y` (XY horizontal), `H-Z` (XZ horizontal), or `Y-Z` (YZ vertical).
- [ ] **AC 30.3:** Display converts Cartesian (X,Y) coordinates to Polar (R, θ).
- [ ] **AC 30.4:** Radius (R) shows distance from origin.
- [ ] **AC 30.5:** Angle (θ) shows angle from reference axis.
- [ ] **AC 30.6:** Press `C` to exit polar mode and return to Cartesian.

## E2E Test Scenarios
```typescript
describe('US-030: Polar Coordinates', () => {
  test('Convert to polar coordinates on XY plane', async () => {
    // Set position X=3, Y=4 (should be R=5, θ≈53.13°)
    await dro.simulateEncoderMove('X', 3.0);
    await dro.simulateEncoderMove('Y', 4.0);

    await dro.pressKey('Fn');
    await dro.selectMenuOption('PoLAr');
    await dro.pressKey('ENT');

    // Select XY plane
    await dro.selectMenuOption('H-Y');
    await dro.pressKey('ENT');

    // Display should show polar coordinates
    await expect(dro.display.radius).toHaveValue(5.000);
    await expect(dro.display.angle).toBeCloseTo(53.13, 1);
  });

  test('Exit polar mode returns to Cartesian', async () => {
    // In polar mode
    await dro.pressKey('Fn');
    await dro.selectMenuOption('PoLAr');
    await dro.pressKey('ENT');
    await dro.selectMenuOption('H-Y');
    await dro.pressKey('ENT');

    // Exit
    await dro.pressKey('C');

    // Should return to Cartesian display
    await expect(dro.display.xAxis).toBeVisible();
    await expect(dro.display.yAxis).toBeVisible();
  });
});
```

## Implementation Notes
- Converts Cartesian (X, Y, Z) to Polar (R, θ)
- Useful for radial machining operations
- Supports three planes: XY, XZ, YZ
- Calculations:
  - R = sqrt(X² + Y²)
  - θ = atan2(Y, X)
- Display updates in real-time as position changes
- Does not change the actual coordinate system, only display format

## Related Stories
- US-016: Bolt Circle Drilling (uses polar concepts)
- US-017: Bolt Circle Drilling - Arc
- US-003: Absolute vs Incremental Mode

## Notes
- New story from G-021 (Gemini-only)
- Assigned ID US-030 to continue Claude numbering sequence
- Priority P4 to match other pattern generation/milling stories
- Could also be categorized as "Auxiliary" but placed in Pattern Generation for consistency
