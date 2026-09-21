# US-022: Setup Menu - Display Resolution

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: linear `dP` choices are `0.1 / 0.2 / 0.5 / 1 / 2 / 5 / 10 / 20 / 50` microns; display resolution may be coarser than the measuring system.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.6, `[03:36–05:00]`: `dP 5.0` is the fine mill setting; `dP 50.0` renders three decimal places and 0.002-inch steps without changing the scale.

## User Story

**As a** machine operator  
**I want** per-axis display resolution independent of encoder resolution  
**So that** I can trade visible precision for a steadier coarse-work readout

## Acceptance Criteria

- [x] **AC22.1:** `dP` follows `SC` in the selected axis's setup sequence.
- [x] **AC22.2:** A linear axis offers exactly the nine micron choices listed above; the mill default is `dP 5.0`.
- [x] **AC22.3:** `dP` is per-axis and independent of `SC`.
- [x] **AC22.4:** `dP 5.0` shows the fine four-decimal inch readout; `dP 50.0` shows three decimals and quantizes the visible result to 0.002-inch steps.
- [x] **AC22.5:** Changing `dP` changes formatting/quantization only. The underlying physical position and datum are unchanged.
- [x] **AC22.6:** The change participates in the single setup draft transaction and persists only after `SAU CHG`.

## Human Verification

Configure X as `dP 50.0` and Y as `dP 5.0`, save, then give both axes precise physical-mm moves. Confirm X is visibly coarser, Y remains fine, debug positions are unchanged, and both settings survive reload. Repeat a draft change followed by `End` without save and confirm it is discarded.

## Automated Coverage

- [`e2e/06-configuration/US-022-display-resolution.spec.ts`](../../../e2e/06-configuration/US-022-display-resolution.spec.ts)
- Angular formats: [`e2e/06-configuration/US-040-dms.spec.ts`](../../../e2e/06-configuration/US-040-dms.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

Headed checks cycled all nine linear choices and both wrap points. X retained `dP 50.0` while Y retained its finer setting after reload. At the same 10.0000 mm debug position, X changed from 0.3937 to the expected 0.394 when only `dP` changed; canceling an unsaved reversal restored `dP 50.0`.

The rendered simulator and visible debug position supplied the display and position oracles. No physical DRO display or encoder was used.
