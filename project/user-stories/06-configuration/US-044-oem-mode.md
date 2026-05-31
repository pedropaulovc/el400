# US-044: Setup Menu - OEM Mode (Custom Defaults)

**Manual Reference:** Section 6.2 Parameters Setting (`oEñ ñod`, password protected); EL400 video manual §1.18 "OEM Mod"
**Priority:** P5
**Category:** Configuration

## User Story
**As a** machine setup technician / shop owner
**I want** to define my own baseline of default settings
**So that** "Restore Defaults" (US-028) returns the DRO to *my* preferred configuration rather than the bare factory state

## Acceptance Criteria
- [ ] **AC 44.1:** The `oEñ ñod` (OEM Mode) parameter is available in setup.
- [ ] **AC 44.2:** Entering OEM Mode is **password protected**.
- [ ] **AC 44.3:** In OEM Mode, the current settings can be stored as the OEM/default baseline.
- [ ] **AC 44.4:** After defining an OEM baseline, `rSt oEñ` (US-028) restores to that custom baseline instead of the as-shipped factory defaults.
- [ ] **AC 44.5:** Example: enabling `EnF on` (US-042) and saving it as the OEM baseline makes encoder-fail warning the restored default.
- [ ] **AC 44.6:** The OEM baseline persists after power cycle.
- [ ] **AC 44.7:** An incorrect password is rejected and OEM Mode is not entered.

## E2E Test Scenarios
```typescript
describe('US-044: OEM Mode', () => {
  test('password gate blocks entry on wrong code', async () => {
    await dro.pressKey('SETUP');
    await dro.pressKey('X');
    await dro.navigateTo('oEM mod');
    await dro.pressKey('ENT');
    await dro.enterNumber(0000);            // wrong password
    await dro.pressKey('ENT');
    await expect(dro.display.message).not.toHaveText('oEM');
  });

  test('custom baseline becomes the restore target', async () => {
    // Define OEM baseline with ENF on
    await dro.enterOemMode(/* correct password */);
    await dro.setEncoderFailWarning(true);
    await dro.storeOemDefaults();

    // Change away, then restore
    await dro.setEncoderFailWarning(false);
    await dro.restoreDefaults();            // US-028 rSt oEM
    await expect(dro.getEncoderFailWarning()).toBe(true);
  });
});
```

## Implementation Notes
- Two distinct stored snapshots in non-volatile memory: the immutable factory defaults and a
  mutable `oemDefaults`. `restoreDefaults()` copies `oemDefaults` (falling back to factory if
  none defined) into the live config.
- Password handling: a simple stored code is sufficient for the simulator; do not expose it in
  plain UI. Keep it out of localStorage in clear text where practical.

## Related Stories
- US-028: Restore Factory Defaults (consumes the OEM baseline)
- US-027: Save Changes
- US-042: Encoder Fail Warning (worked example)

## Notes
- New story from crosscheck. `oEñ ñod` is in the §6.2 table and video §1.18; it is distinct
  from `rSt oEñ` (US-028) — this one *defines* the baseline, US-028 *restores* to it.
</content>
