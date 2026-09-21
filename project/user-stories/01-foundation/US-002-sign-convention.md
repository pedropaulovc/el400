# US-002: Sign Convention and Axis Direction

**Authority:** EL400 Operation Manual §6.2 (Direction); MagXact “The coordinate sign contradiction” and “OTHER SIGN vs. DIRECTION FACTORS” for coordinate guidance.  
**Priority:** P0

## User Story
**As a** machinist  
**I want** scale direction, datum and source decoding to compose predictably  
**So that** displayed signs and entered coordinates remain correct for the installed machine

## Target Acceptance Criteria
- [ ] **AC 2.1:** Under the Figure 1 tool's-eye convention, motion that moves the tool in +X/+Y increases the displayed coordinate; positive values have no sign and negative values use the dedicated leading `-` cell.
- [ ] **AC 2.2:** Each axis's `LEFt`/`riGht` Direction setting recomputes the sign of the live coordinate. It does not preserve the old numeric reading when the direction is changed.
- [ ] **AC 2.3:** Zeroing or presetting relocates the datum. A preset is interpreted in display space, then converted through the active unit, radius/diameter scale and direction before deriving the stored offset, so entering `+10` still displays `+10` under `riGht`.
- [ ] **AC 2.4:** The simulator's persisted `dEP nEG`/`dEP PoS` option is an explicit product extension, not an EL400 §6.2 hardware claim. It changes only the displayed Z sense and composes with Z Direction; it does not mutate machine position or stored datums.
- [ ] **AC 2.5:** Routine work may use the operator's preferred direction. SDMs and generated macro coordinates use the Figure 1 convention required by MagXact; a macro's live Z passthrough continues to use the operator's Z display preference.
- [ ] **AC 2.6:** Source decoding precedes sign/datum transforms. CNCjs positions are already engineering millimetres and must not be multiplied by `SC`; a simulated raw-scale source with an installed encoder resolution may apply configured-microns / installed-microns before Direction.

## Baseline Audit (headed debug source)
- **Passed:** positive/negative motion, leading minus, per-axis Direction flip, datum relocation and the reachable persisted Z-depth preference.
- **Confirmed gap:** under `riGht`, entering positive ABS preset `10` displayed `-10.0000`; preset composition did not invert the requested display value before calculating the offset.
- **Not covered in this lane:** canonical signs generated inside every SDM/macro. Do not treat that item as baseline-verified.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-002`)
- Failure screenshot: `/tmp/el400-audit/core/reversed-positive-preset.png`
- E2E: [`e2e/01-foundation/US-002-sign-convention.spec.ts`](../../../e2e/01-foundation/US-002-sign-convention.spec.ts)
- Related target coverage: [`e2e/02-core-operations/US-005-zero-axes.spec.ts`](../../../e2e/02-core-operations/US-005-zero-axes.spec.ts)

## Authority Note
MagXact explicitly says there is no universal sign preference for routine shop work. The Figure 1 convention is mandatory here only where SDMs or generated macro coordinates depend on it.
