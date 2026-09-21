# US-021: Setup Menu - Scale Resolution

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: `SC` has exactly nine measuring-system resolutions: `0.1`, `0.2`, `0.5`, `1`, `2`, `5`, `10`, `20`, and `50` microns. Note \*6 makes it per-axis.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.5, `[03:08–03:32]`: `SC` must match the installed scale; mill kits use `SC 5.0`; arrows cycle and wrap.

## User Story

**As a** machine installer  
**I want** each axis configured for its installed encoder resolution  
**So that** encoder pulses are converted to the correct engineering distance

## Acceptance Criteria

- [x] **AC21.1:** Wrench shows `SELECt`; selecting X, Y, or Z opens that axis at `LinEAr`; Down reaches `SC`.
- [x] **AC21.2:** Factory configuration is `SC 5.0` on each mill axis.
- [x] **AC21.3:** Left/Right cycles, in both directions with wrap, through exactly `0.1 / 0.2 / 0.5 / 1 / 2 / 5 / 10 / 20 / 50` microns.
- [x] **AC21.4:** `SC` is independently drafted and stored for X, Y, and Z.
- [x] **AC21.5:** On a source that identifies an installed encoder resolution, `SC` reinterprets encoder pulses: the physical/decoded input is scaled by `configured microns ÷ installed microns`. A mismatched setting therefore changes the reported travel by that ratio.
- [x] **AC21.6:** A source such as CNCjs that already supplies engineering millimetres and does not identify an encoder resolution is not multiplied by `SC` a second time.
- [x] **AC21.7:** `SAU CHG` commits the draft; leaving through `End` or `C` without saving discards it.

## Human Verification

1. Enter setup, select each axis, reach `SC`, and cycle all nine choices through both wrap points.
2. Save different X and Y values, reload, and confirm each axis retained its own value.
3. With the debug encoder source identified as 5 µm, apply the same nonzero move at `SC 5.0` and `SC 10.0`; the interpreted reading must change by 2×.
4. Repeat on the already-decoded CNCjs source; changing `SC` must not rescale its engineering-mm position.
5. Draft another value and exit without `SAU CHG`; re-enter and confirm the saved value remains.

## Automated Coverage

- [`e2e/06-configuration/US-021-scale-resolution.spec.ts`](../../../e2e/06-configuration/US-021-scale-resolution.spec.ts)
- Transaction coverage: [`e2e/06-configuration/US-027-save-changes.spec.ts`](../../../e2e/06-configuration/US-027-save-changes.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

Headed checks cycled all nine values in both directions, saved distinct X/Y settings, and discarded a multi-axis draft. With the debug source's installed 5 µm encoder metadata, 10 mm at `SC 10.0` displayed twice the travel shown at `SC 5.0`. A separate real mock-CNCjs connection held 10.0000 mm unchanged at both `SC 1.0` and `SC 5.0`, then preserved 12.5000 mm through disconnect/reconnect.

These checks used simulator debug input and a mock CNCjs service. They did not use a physical encoder or CNC controller.
