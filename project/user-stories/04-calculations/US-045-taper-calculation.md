# US-045: Taper Calculation Function

**Manual Reference:** Section 9.2.2 Taper Function (taper-on axis set in §6.2); README feature comparison table ("Taper Calculations: Yes")
**Priority:** P4
**Category:** Calculations

## User Story
**As a** machinist measuring a tapered workpiece
**I want** the DRO to compute the taper's radius and included angle from two probed ends
**So that** I can read the taper angle directly instead of computing it by hand

## Background
The README explicitly lists "Taper Calculations" as a DRO feature that CNCjs/UGS lack, yet no
user story covered it. The EL400 derives taper from movement on two axes: one axis supplies the
radius (R), the other supplies the angle (θ°). Which axis shows the angle is chosen by the
`tAPEr on` setup parameter (§6.2).

## Acceptance Criteria
- [x] **AC 45.1:** The taper-on axis (`tAPEr on` = X, Y/Z, or Z′) is configured in the setup menu and selects which axis displays the taper angle.
- [x] **AC 45.2:** Procedure: touch the tool to one end of the taper and zero the two relevant axes, then enter the Taper function.
- [x] **AC 45.3:** Moving the tool to the other end of the taper displays the taper **angle θ°** on the configured axis and the **radius R** on the paired axis, per the §9.2.2 relation table:
    - Taper on X → R on Z, angle on X
    - Taper on Z → R on X, angle on Z
    - Taper on Z′ → R on X, angle on Z′
- [x] **AC 45.4:** The angle is the included/half-angle computed as `θ = atan(ΔR / ΔL)` consistent with the manual's geometry.
- [x] **AC 45.5:** Pressing `C` exits the Taper function and returns to normal display.
- [x] **AC 45.6:** Works in the current unit (US-004) and respects display resolution.

## E2E Test Scenarios
```typescript
describe('US-045: Taper Calculation', () => {
  test('computes taper angle from two ends', async () => {
    await dro.setTaperOnAxis('X');
    // Touch first end, zero both axes
    await dro.zeroAxis('X');
    await dro.zeroAxis('Z');
    await dro.enterTaperFunction();

    // Move to other end: ΔR (radius axis) = 5, ΔL (length) = 50
    await dro.simulateMove('Z', 50.000); // length along Z
    await dro.simulateMove('X', 5.000);  // radius change on X
    // angle = atan(5/50) ≈ 5.7106°
    await expect(dro.display.xAxis).toHaveValueCloseTo(5.7106, 3);
  });

  test('C exits taper function', async () => {
    await dro.enterTaperFunction();
    await dro.pressKey('CLEAR');
    await expect(dro.state).toBe('idle');
  });
});
```

## Implementation Notes
- Add a `taperOnAxis` enum to non-volatile memory (configured via the §6.2 setup parameter,
  related to US-039 navigation).
- A new feature reducer under `src/stores/dro/features/` for the taper function state; angle and
  radius are pure derivations from the two axis deltas since the function's entry point.
- This is the one lathe-class function the README markets for the mill simulator; the other
  lathe functions (tool offset, axes addition, vectoring) and EDM functions are out of scope —
  see the user-stories README "Deliberately out of scope" note.

## Related Stories
- US-013 / US-014: Calculator (sibling math feature)
- US-039: Setup Menu Navigation (where `tAPEr on` is set)
- US-004: Inch/Metric units

## Notes
- New story from crosscheck. Directly closes the README feature-table gap for "Taper Calculations".
</content>
