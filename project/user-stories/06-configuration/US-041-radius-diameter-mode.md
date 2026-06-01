# US-041: Setup Menu - Radius / Diameter Display Mode

**Manual Reference:** Section 6.2 Parameters Setting (`rAd` / `diA`); EL400 video manual §1.7 "Radius / diameter mode `RAD`"
**Priority:** P5
**Category:** Configuration

## User Story
**As a** machinist
**I want** to choose whether an axis displays radius or diameter values
**So that** lathe-style turning shows the cut diameter (2× movement) while milling shows true 1:1 travel

## Acceptance Criteria
- [ ] **AC 41.1:** In the setup menu, the `rAd` / `diA` parameter is available for a linear axis.
- [ ] **AC 41.2:** `◄` / `►` toggle between `rAd` (radial) and `diA` (diametric).
- [ ] **AC 41.3:** In `rAd` mode the display equals actual axis movement (1:1) — the mill default.
- [ ] **AC 41.4:** In `diA` mode the displayed value is **doubled** relative to actual movement (a 1.000 move shows 2.000), as used for lathe diameter turning.
- [ ] **AC 41.5:** The mode is set **per individual axis**.
- [ ] **AC 41.6:** The setting persists after power cycle when saved via `SAU CHG`.
- [ ] **AC 41.7:** Only meaningful when counting mode (US-040) is `LinEAr`.
- [ ] **AC 41.8:** The ×2 diameter scale composes with the 7-digit panel limit. If the
  doubled value can't fit at the axis's display resolution — e.g. a stored `999.9999`
  radius value switched to `diA` would render the 8-cell `1999.9998` — the readout shows
  an **all-dashes overflow indicator** (`-------`) rather than growing past the physical
  panel, mirroring the Acu-Rite DRO100 display-overflow behaviour. The stored slide value
  is untouched, so the reading self-clears when the axis returns in range, the display
  resolution `dP` is coarsened, or the axis is zeroed. This is the *derived-reading*
  counterpart to the US-047 *entry-time* clamp (which bounds keyed values at commit and so
  cannot catch an overflow introduced by a later mode switch).

## E2E Test Scenarios
```typescript
describe('US-041: Radius/Diameter Mode', () => {
  test('default radius mode is 1:1', async () => {
    await dro.setMode('X', 'rAd');
    await dro.simulateMove('X', 1.000);
    await expect(dro.display.xAxis).toHaveValue(1.000);
  });

  test('diameter mode doubles the displayed value', async () => {
    await dro.pressKey('SETUP');
    await dro.pressKey('X');
    await dro.navigateTo('rAd');
    await dro.pressKey('KEY_6_RIGHT'); // ► to diA
    await expect(dro.display.message).toHaveText('diA');
    await dro.exitSetupSaving();

    await dro.zeroAxis('X');
    await dro.simulateMove('X', 1.000);
    await expect(dro.display.xAxis).toHaveValue(2.000);
  });
});
```

## Implementation Notes
- Pure display transform: `displayed = mode === 'diameter' ? raw * 2 : raw`. Apply in
  `src/stores/dro/utils/displayComputation.ts` after error compensation but before formatting.
- Add a `diA` indicator hint if the hardware shows one; store as
  `measurementMode: 'radius' | 'diameter'` per axis.

## Related Stories
- US-040: Counting Mode (linear required)
- US-022: Display Resolution
- US-002: Sign Convention and Axis Direction
- US-047: Display Overflow on Value Entry (entry-time clamp; AC 41.8 is the derived-reading counterpart)

## Notes
- New story from crosscheck. `rAd`/`diA` appears in the §6.2 table and video §1.7 but had no story.
- Primarily a lathe convenience; included because it is a documented per-axis setup parameter
  the simulator's setup menu must expose for faithful reproduction.
</content>
