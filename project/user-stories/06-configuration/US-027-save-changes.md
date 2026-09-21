# US-027: Setup Menu - Save Changes

**Priority:** P5  
**Category:** Configuration

## Source

- **Primary:** EL400 Operation Manual §6.2, pp. 20–21: `SAU CHG` stores changed settings; `End` exits setup.
- **Video:** EL400 overview §§1.6, 1.16, 1.19, `[04:13]`, `[10:17]`, `[11:39]`: press Enter at `SAU CHG`, then reach `End` and press Enter; only that save sequence retains changes across power cycles.

## User Story

**As a** machine operator  
**I want** setup edits committed as one explicit transaction  
**So that** I can review or abandon a group of changes without partial configuration leaking live

## Acceptance Criteria

- [ ] **AC27.1:** Entering setup creates one draft of every editable setup setting, including nested numeric, per-axis, calibration, and global settings.
- [ ] **AC27.2:** Editing any setup row changes only that draft. It does not mutate the live/saved configuration or survive reload before save.
- [ ] **AC27.3:** Enter at `SAU CHG` atomically commits the complete draft, shows `StorEd`, and makes the resulting configuration live. The next key only dismisses `StorEd`; it is not replayed as an operating command.
- [ ] **AC27.4:** A valid saved configuration survives reload/power cycle.
- [ ] **AC27.5:** Leaving setup through `End` or `C` without `SAU CHG` discards the complete draft and restores the prior live configuration. Wrench may return to `SELECt` to configure another axis without ending the transaction.
- [ ] **AC27.6:** A canceled nested numeric edit rolls back only that in-progress field to its setup-draft value; abandoning setup still rolls back the whole transaction.
- [ ] **AC27.7:** Saved configuration schema changes are clean cutovers: an incompatible old schema resets once to current defaults rather than being partially migrated. Configurations already saved in the current schema persist normally.

## Human Verification

Save a known baseline. Re-enter setup and alter several kinds of setting at once (for example X direction, Y `SC`, global beep, X warning distance, and calibration), then exit without saving; all must remain at the baseline both live and after reload. Repeat, press `SAU CHG`, observe `StorEd`, exit through `End`, reload, and confirm the entire group persisted.

## Automated Coverage

- [`e2e/06-configuration/US-027-save-changes.spec.ts`](../../../e2e/06-configuration/US-027-save-changes.spec.ts)
- Individual configuration specs under [`e2e/06-configuration/`](../../../e2e/06-configuration/)

## Baseline Audit (before the current implementation work)

`SAU CHG`, `StorEd`, persistence, and discard for a draft-only `SC` change passed. Direction and many other rows committed immediately, so exiting without save leaked partial changes and failed the all-setting transaction contract. Current-schema persistence and the new clean schema cutover are target requirements, not claims from the baseline run.
