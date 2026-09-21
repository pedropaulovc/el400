# US-026: Setup Menu - Display Sleep Timer

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §6.2, pp. 20–21: `SLEEP t` accepts 0–120 minutes; after timeout the display is off and any key operation turns it on.
- **Video:** [DROPROS EL400 overview](https://www.youtube.com/watch?v=7W47KPCu7jE) §1.15, `[09:53–10:17]`: at `SLEEP t`, press Enter twice and enter the desired numeric value.
- **Lower-priority UI detail:** [MagXact setup guide](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616): default `000` disables timeout and the sleeping indicator is the red LED below the wrench.

## User Story

**As a** machine operator  
**I want** a global idle display timer  
**So that** the readout sleeps when unused and wakes immediately for work

## Acceptance Criteria

- [x] **AC26.1:** `SLEEP t` is global, defaults to fixed-width `000`, and accepts whole minutes from `000` through `120`.
- [x] **AC26.2:** Enter displays the stored three-digit value; Enter again opens numeric replacement; digits followed by Enter confirm. Out-of-range input is not stored; `C` cancels the numeric edit.
- [x] **AC26.3:** `000` disables sleep. For `001–120`, the display sleeps after that many minutes without an operator key press.
- [x] **AC26.4:** Unchanged adapter polling, connection heartbeats, and other background store activity do not count as operator activity or re-arm the timer. A real physical-position change wakes the simulator.
- [x] **AC26.5:** Sleeping blanks the visible readouts and their screen-reader value cells while showing the sleep indicator; internal position tracking and saved data remain intact.
- [x] **AC26.6:** A front-panel key wakes the display and is consumed; pressing it again performs its normal command.
- [x] **AC26.7:** The draft timer persists only after `SAU CHG`; unsaved exit restores the saved timer.

## Human Verification

Using the connected debug source, enter `001` through the documented two-Enter numeric path, save, and leave the panel untouched while background debug updates continue. After 60 seconds confirm blank readouts and the flashing indicator. Move the machine while asleep, press a key to wake, and confirm the current tracked position appears. Save `000` and confirm the same wait does not sleep.

## Automated Coverage

- [`e2e/06-configuration/US-026-sleep-timer.spec.ts`](../../../e2e/06-configuration/US-026-sleep-timer.spec.ts)

## Verification

[Portable evidence and full-suite results](../README.md#verification)

The stored field rendered exactly `000` and, after save/reload, `001`. Two real one-minute runs entered sleep after about 63 seconds despite unchanged 10 Hz debug polling. Sleeping left all three DRO rows visually blank and removed their value cells from the accessibility snapshot while the debug source retained the physical position. Physical motion woke to the current reading. On the second run, the first Zero X press woke without zeroing and the second press zeroed normally. Saving `000` disabled the timeout, and no reducer-collision error recurred.

Accessibility-tree inspection verifies blank browser cells, not speech from an installed screen reader.
