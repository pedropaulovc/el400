# US-026: Setup Menu - Display Sleep Timer

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, pp. 20–21: `SLEEP t` accepts 0–120 minutes; after timeout the display is off and any key operation turns it on.
- **Video:** EL400 overview §1.15, `[09:53–10:17]`: at `SLEEP t`, press Enter twice and enter the desired numeric value.
- **Lower-priority UI detail:** MagXact setup guide: default `000` disables timeout and the sleeping indicator is the red LED below the wrench.

## User Story

**As a** machine operator  
**I want** a global idle display timer  
**So that** the readout sleeps when unused and wakes immediately for work

## Acceptance Criteria

- [ ] **AC26.1:** `SLEEP t` is global, defaults to `000`, and accepts whole minutes from `000` through `120`.
- [ ] **AC26.2:** Enter displays the stored three-digit value; Enter again opens numeric replacement; digits followed by Enter confirm. Out-of-range input is not stored; `C` cancels the numeric edit.
- [ ] **AC26.3:** `000` disables sleep. For `001–120`, the display sleeps after that many minutes without an operator key press.
- [ ] **AC26.4:** Adapter position updates, connection heartbeats, and other background store changes do not count as operator activity and do not re-arm the timer.
- [ ] **AC26.5:** Sleeping blanks the readouts and flashes the sleep indicator; internal position tracking and saved data remain intact.
- [ ] **AC26.6:** Any front-panel key operation wakes the display.
- [ ] **AC26.7:** The draft timer persists only after `SAU CHG`; unsaved exit restores the saved timer.

## Human Verification

Using the connected debug source, enter `001` through the documented two-Enter numeric path, save, and leave the panel untouched while background debug updates continue. After 60 seconds confirm blank readouts and the flashing indicator. Move the machine while asleep, press a key to wake, and confirm the current tracked position appears. Save `000` and confirm the same wait does not sleep.

## Automated Coverage

- [`e2e/06-configuration/US-026-sleep-timer.spec.ts`](../../../e2e/06-configuration/US-026-sleep-timer.spec.ts)

## Baseline Audit (before the current implementation work)

The row, default, and alternate arrow-cycled values existed, but Enter/numeric entry was a no-op. More importantly, `SLP 1` stayed awake after a real 62-second idle wait because periodic connected-debug updates re-armed the timer. Sleep indication and wake behavior were therefore unreachable, not verified. The target behavior above remains to be checked after integration.
