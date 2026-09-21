# US-039: Setup Menu Navigation and Axis Selection

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §§6.1–6.2, pp. 19–21: wrench → axis selection, Up/Down parameter navigation, Left/Right choice selection, `SAU CHG`, and `End`.
- **Video:** EL400 overview §§1.2–1.3 and 1.19, `[01:25–01:46]`, `[11:39–12:00]`: `SELECt`, axis-first setup, wraparound navigation, and save-then-End exit.

## User Story

**As a** machine operator  
**I want** one predictable setup navigation and transaction model  
**So that** every applicable parameter can be configured without changing the wrong axis or saving by accident

## Acceptance Criteria

- [ ] **AC39.1:** Wrench opens setup at `SELECt`; X, Y, or Z selects that axis and shows the first row, `LinEAr`.
- [ ] **AC39.2:** Up/Down traverses the applicable §6.2 rows in manual order and wraps at both ends. Explicit project exclusions remain excluded.
- [ ] **AC39.3:** Left/Right cycles a row's finite choices and wraps. Digits act as digits—not navigation—while a nested numeric editor is active.
- [ ] **AC39.4:** Enter opens action rows and nested editors such as `CALib`, `ZEro AP`, and `SLEEP t`; `C` backs out one nested level without accepting incomplete input.
- [ ] **AC39.5:** Axis-scoped settings include counting mode, SC, dP, radius/diameter, direction, calibration, and zero-approach values. Global settings include ENF, keypad lock, keypad beep, and sleep. Selecting another axis must neither copy nor leak per-axis drafts.
- [ ] **AC39.6:** Wrench from an axis menu returns to `SELECt` so another axis can be configured within the same draft transaction.
- [ ] **AC39.7:** Enter at `End` exits to normal operation.
- [ ] **AC39.8:** Every setup edit belongs to the transaction in US-027: `SAU CHG` commits all drafts; `End` or `C` without it discards all drafts.

## Human Verification

Enter setup, visit X/Y/Z, traverse the whole top-level list through both wrap points, cycle representative choices, and enter/cancel each nested editor. Draft distinct X and Y values plus one global value, switch axes twice, and confirm scope. Run separate unsaved and saved exits to prove whole-transaction rollback/commit.

## Automated Coverage

- [`e2e/06-configuration/US-039-setup-navigation.spec.ts`](../../../e2e/06-configuration/US-039-setup-navigation.spec.ts)
- [`e2e/06-configuration/US-039-aux-fn.spec.ts`](../../../e2e/06-configuration/US-039-aux-fn.spec.ts)
- Transaction coverage: [`e2e/06-configuration/US-027-save-changes.spec.ts`](../../../e2e/06-configuration/US-027-save-changes.spec.ts)

## Baseline Audit (before the current implementation work)

`SELECt`, axis selection, the 21-row baseline traversal, wrap, choice cycling, wrench return, and `End` passed. Observed per-axis/global scope largely matched the old schema. The shell flattened zero-warning child rows, lacked numeric phases, and committed many rows immediately, so nested navigation and AC39.8 were confirmed gaps. New rows and nesting require a fresh integrated traversal.
