# US-002: Sign Convention and Axis Direction

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2 (Direction); [MagXact](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616) “The coordinate sign contradiction” and “OTHER SIGN vs. DIRECTION FACTORS” for coordinate guidance.  
**Priority:** P0

## User Story
**As a** machinist  
**I want** scale direction, datum and source decoding to compose predictably  
**So that** displayed signs and entered coordinates remain correct for the installed machine

## Target Acceptance Criteria
- [x] **AC 2.1:** Under the Figure 1 tool's-eye convention, motion that moves the tool in +X/+Y increases the displayed coordinate; positive values have no sign and negative values use the dedicated leading `-` cell.
- [x] **AC 2.2:** Each axis's `LEFt`/`riGht` Direction setting recomputes the sign of the live coordinate. It does not preserve the old numeric reading when the direction is changed.
- [x] **AC 2.3:** Zeroing or presetting relocates the datum. A preset is interpreted in display space, then converted through the active unit, radius/diameter scale and direction before deriving the stored offset, so entering `+10` still displays `+10` under `riGht`.
- [x] **AC 2.4:** The simulator's persisted `dEP nEG`/`dEP PoS` option is an explicit product extension, not an EL400 §6.2 hardware claim. It changes only the displayed Z sense and composes with Z Direction; it does not mutate machine position or stored datums.
- [x] **AC 2.5:** Routine work may use the operator's preferred direction. SDMs and generated macro coordinates use the Figure 1 convention required by MagXact; a macro's live Z passthrough continues to use the operator's Z display preference.
- [x] **AC 2.6:** Source decoding precedes sign/datum transforms. CNCjs positions are already engineering millimetres and must not be multiplied by `SC`; a simulated raw-scale source with an installed encoder resolution may apply configured-microns / installed-microns before Direction.

## Verification
The headed core run covered positive and negative motion, the dedicated sign cell, all-axis Direction changes, positive presets under `riGht`, diameter composition and the independent Z-depth preference. A targeted raw-source recheck showed an installed 5 µm encoder display 10 mm at `SC 5.0`, 2 mm at `SC 1.0`, then 10 mm after restoring `SC 5.0`. A separate mock-CNCjs run kept engineering values unchanged at `SC 1.0` and `SC 5.0`, including live update and reconnect. SDM and macro sign behavior is covered by those stories' headed runs rather than duplicated here. No physical encoder or CNC controller was exercised.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/01-foundation/US-002-sign-convention.spec.ts`](../../../e2e/01-foundation/US-002-sign-convention.spec.ts)
- [`e2e/02-core-operations/US-005-zero-axes.spec.ts`](../../../e2e/02-core-operations/US-005-zero-axes.spec.ts)

## Authority Note
MagXact explicitly says there is no universal sign preference for routine shop work. The Figure 1 convention is mandatory here only where SDMs or generated macro coordinates depend on it.
