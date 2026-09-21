# US-045: Taper Calculation Function

**Priority:** P4  
**Category:** Calculations  
**Manual reference:** EL400 Operation Manual §6.2, pp. 19–20 (`tAPEr on` setup choices X/Y/Z); §9.2.2, pp. 65–66 (touch/zero/move procedure, radius and angle display); README “Deliberately Out of Scope” exclusions

## User Story

**As a** machinist measuring a tapered workpiece  
**I want** the DRO to show taper radius change and taper half-angle from two touched ends  
**So that** I can inspect the taper without a separate calculation

## Scope Adaptation

The source manual presents Taper among lathe functions and illustrates X/Z/Z′ hardware. This project is a three-axis mill simulator and explicitly excludes the lathe tool-offset/extra-axis system. Taper is therefore retained as a documented Fn-menu adaptation using only the simulator's genuine X, Y, and Z setup choices; it must not invent a Z′ display axis.

## Target Acceptance Criteria

- [ ] **AC45.1:** Setup `tAPEr on` cycles only X, Y, and Z and persists the selected display choice through the normal setup save flow.
- [ ] **AC45.2:** Touch one end of the taper, zero X and Z, press Fn, navigate to `tAPEr`, and press ENT. Entry snapshots the current X/Z position without changing the current ABS/INC or inch/mm selection.
- [ ] **AC45.3:** Moving to the other end recomputes continuously from magnitudes: radius change $R=|ΔX|$ and acute half-angle $θ=atan(|ΔX|/|ΔZ|)$. Reversing either traverse direction does not produce a negative or obtuse angle.
- [ ] **AC45.4:** Display mapping is: taper-on X → angle on X, radius on Z; taper-on Z → radius on X, angle on Z; taper-on Y → radius on X, angle on Y. This is the explicit three-axis mill adaptation.
- [ ] **AC45.5:** Radius uses the current linear unit and display resolution. Angle uses the manual's degrees-minutes-seconds presentation (`dd.mn.SS`), not a decimal-degree value whose decimal point is mistaken for DMS punctuation.
- [ ] **AC45.6:** A zero length change (`|ΔZ|=0`, including 0/0) is not a measurable taper and visibly reports `inuAL d`; it must not display 90° or a fabricated zero-angle result.
- [ ] **AC45.7:** C exits, clears the function indication, and restores the live Cartesian display with the prior mode and unit.

## Operator Procedure and Independent Oracles

1. Save each `tAPEr on` choice in turn, touch the first end, and zero X/Z.
2. Enter Taper from Fn and move X by 5 mm and Z by 50 mm.
3. Independently, $atan(5/50)=5.710593°=5°42′38″$ rounded to seconds, so the angle display is `5.42.38`; radius is `5.0000 mm` (or `0.1969 in`) on the mapped radius axis.
4. Repeat with X=`-5`, Z=`+50` and X=`+5`, Z=`-50`; the radius magnitude and acute half-angle remain the same.
5. Move X while leaving ΔZ zero and confirm the invalid indication.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed live positive X/Z arithmetic, X and Z output mappings, C exit, and linear-unit conversion. It found setup choices X/Z/Z′ instead of X/Y/Z, decimal-degree rather than DMS presentation, signed/quadrant `atan2` results (−5.7106° or 174.2894°), and no invalid indication for zero length. INC movement could not be independently exercised because the baseline debug adapter did not move coordinates in that mode. These are baseline observations, not verification of the target implementation.

Evidence: `/tmp/el400-audit-ManualCalculations.json` (`US-045`) and `/tmp/el400-audit/calculations/us045-*.png`.

## Automated Coverage

[`e2e/04-calculations/US-045-taper-calculation.spec.ts`](../../../e2e/04-calculations/US-045-taper-calculation.spec.ts) is the executable browser coverage. It must use the real setup/Fn/debug controls for all three display mappings, magnitude controls, DMS rendering, unit conversion, invalid length, and exit. New checks remain unverified until Main runs the integrated suite.

## Related Stories

- US-039: Setup Menu Navigation and save/discard transaction
- US-004: Inch/Metric display
- US-013 / US-014: sibling calculation surfaces
