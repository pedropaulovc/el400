# US-021: Setup Menu - Scale Resolution

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, pp. 20–21: `SC` has exactly nine measuring-system resolutions — `0.1`, `0.2`, `0.5`, `1`, `2`, `5`, `10`, `20`, and `50` microns — and note *6 makes it per-axis.
- **Video:** EL400 overview §1.5, `[03:08–03:32]`: `SC` must match the installed scale; mill kits use `SC 5.0`; arrows cycle and wrap.

## User Story

**As a** machine installer  
**I want** each axis configured for its installed encoder resolution  
**So that** encoder pulses are converted to the correct engineering distance

## Acceptance Criteria

- [ ] **AC21.1:** Wrench shows `SELECt`; selecting X, Y, or Z opens that axis at `LinEAr`; Down reaches `SC`.
- [ ] **AC21.2:** Factory configuration is `SC 5.0` on each mill axis.
- [ ] **AC21.3:** Left/Right cycles, in both directions with wrap, through exactly `0.1 / 0.2 / 0.5 / 1 / 2 / 5 / 10 / 20 / 50` microns.
- [ ] **AC21.4:** `SC` is independently drafted and stored for X, Y, and Z.
- [ ] **AC21.5:** On a source that identifies an installed encoder resolution, `SC` reinterprets encoder pulses: the physical/decoded input is scaled by `configured microns ÷ installed microns`. A mismatched setting therefore changes the reported travel by that ratio.
- [ ] **AC21.6:** A source such as CNCjs that already supplies engineering millimetres and does not identify an encoder resolution is not multiplied by `SC` a second time.
- [ ] **AC21.7:** `SAU CHG` commits the draft; leaving through `End` or `C` without saving discards it.

## Human Verification

1. Enter setup, select each axis, reach `SC`, and cycle all nine choices through both wrap points.
2. Save different X and Y values, reload, and confirm each axis retained its own value.
3. With the debug encoder source identified as 5 µm, apply the same nonzero move at `SC 5.0` and `SC 10.0`; the interpreted reading must change by 2×.
4. Repeat on the already-decoded CNCjs source; changing `SC` must not rescale its engineering-mm position.
5. Draft another value and exit without `SAU CHG`; re-enter and confirm the saved value remains.

## Automated Coverage

- [`e2e/06-configuration/US-021-scale-resolution.spec.ts`](../../../e2e/06-configuration/US-021-scale-resolution.spec.ts)
- Transaction coverage: [`e2e/06-configuration/US-027-save-changes.spec.ts`](../../../e2e/06-configuration/US-027-save-changes.spec.ts)

## Baseline Audit (before the current implementation work)

The headed audit passed setup entry, the 5 µm default, all nine choices, wrap, and SC-only save/discard. It also confirmed the old story's “one Left from 5 goes to 1” claim was false: the sequence is `5 → 2 → 1`. Raw scale interpretation was not then exposed: equal debug engineering-mm moves remained equal under different `SC` values, so AC21.5 was a confirmed implementation gap, not a verified behavior. AC21.6 is the required adapter boundary and was not exercised by that headed debug audit.
