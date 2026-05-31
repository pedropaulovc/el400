# US-040: Setup Menu - Counting Mode (Linear vs Angular)

**Manual Reference:** Section 6.2 Parameters Setting (`LinEAr` / `AnGULAr`); EL400 video manual §1.4 "Scale type — linear vs. angular"
**Priority:** P5
**Category:** Configuration

## User Story
**As a** machine installer
**I want** to set each axis to either linear or angular (rotary) counting
**So that** the axis displays correctly for the kind of scale installed (linear glass/magnetic scale vs. a rotary encoder)

## Acceptance Criteria
- [ ] **AC 40.1:** The first setup parameter for a selected axis is `LinEAr` (default).
- [ ] **AC 40.2:** `◄` / `►` toggle the choice between `LinEAr` and `AnGULAr`.
- [ ] **AC 40.3:** When `LinEAr` is selected, display resolution (`dP`) uses linear micron options (see US-022) and radius/diameter mode (US-041) is available.
- [ ] **AC 40.4:** When `AnGULAr` is selected, the angular display-resolution formats become available: `dd.mn` (degrees-minutes), `dd.mn.SS` (degrees-minutes-seconds), and `dd.dEC` (degrees-decimal).
- [ ] **AC 40.5:** Counting mode is set **per individual axis**.
- [ ] **AC 40.6:** For a mill, all axes default to `LinEAr` (all DRO PROS mill kits use linear scales).
- [ ] **AC 40.7:** The setting persists after power cycle when saved via `SAU CHG`.

## E2E Test Scenarios
```typescript
describe('US-040: Counting Mode', () => {
  test('default is linear', async () => {
    await dro.pressKey('SETUP');
    await dro.pressKey('X');
    await expect(dro.display.message).toHaveText('LinEAr');
  });

  test('switching to angular exposes angular display formats', async () => {
    await dro.pressKey('SETUP');
    await dro.pressKey('X');
    await dro.pressKey('KEY_6_RIGHT'); // ► to AnGULAr
    await expect(dro.display.message).toHaveText('AnGULAr');

    await dro.navigateTo('dP'); // ▼ to display resolution
    // Angular formats available instead of micron values
    await dro.pressKey('KEY_6_RIGHT');
    await expect(dro.display.message).toHaveTextMatching(/dd\.mn|dd\.mn\.SS|dd\.dEC/);
  });
});
```

## Implementation Notes
- Couples to US-022 (display resolution): the resolution option set depends on counting mode.
- Angular axes feed the angular-resolution rendering and (if implemented) angular error
  compensation (US-031 §6.3.2).
- Store as an enum on the per-axis non-volatile config, e.g. `countingMode: 'linear' | 'angular'`.

## Related Stories
- US-021: Scale Resolution
- US-022: Display Resolution
- US-041: Radius/Diameter Mode
- US-031: Error Compensation (angular methods)

## Notes
- New story from crosscheck. The `LinEAr`/`AnGULAr` parameter heads the §6.2 setup table but
  had no user story; angular display-resolution formats were also uncovered.
- Scope note: most mill installs never leave `LinEAr`; angular support is for rotary-axis setups.
</content>
