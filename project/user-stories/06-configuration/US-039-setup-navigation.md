# US-039: Setup Menu Navigation and Axis Selection

**Manual Reference:** Section 6.1 Setup Mode; EL400 video manual §1.2–1.3, §1.19 ("Entering setup & selecting an axis", "Navigating the menu", "End — exit the menu")
**Priority:** P5
**Category:** Configuration

## User Story
**As a** machine operator
**I want** a consistent way to enter the setup menu, pick an axis, scroll through parameters, and exit
**So that** I can reach and change any setup option (US-021 through US-044) using the same predictable controls

## Background
Every per-axis setup parameter shares one navigation shell. The individual setup stories
(US-021..US-028, US-031, US-040..US-044) describe *what* each parameter does; this story
captures the *common* entry/navigation/exit behavior so it is implemented and tested once.

## Acceptance Criteria
- [ ] **AC 39.1:** Pressing the 🔧 wrench (setup) key enters setup mode and the display shows `SELECT`.
- [ ] **AC 39.2:** Pressing an axis key (`X`, `Y`, or `Z`) selects that axis; the first parameter (`LinEAr`) appears.
- [ ] **AC 39.3:** `▲` / `▼` (the `8` / `2` keys) scroll through menu items; scrolling past the last item **wraps around** to the first.
- [ ] **AC 39.4:** `◄` / `►` (the `4` / `6` keys) cycle through the available choices for the current item; cycling past the last choice **wraps around**.
- [ ] **AC 39.5:** Parameters marked "per individual axis" (e.g. `SC`, `dP`, `rAd`/`diA`, direction) are scoped to the axis selected in AC 39.2; global parameters (e.g. `EnF`, `LoC`, `SLEEP`) apply to all axes.
- [ ] **AC 39.6:** Pressing the wrench key again returns to the `SELECT` prompt so another axis can be configured.
- [ ] **AC 39.7:** Navigating to `End` and pressing `ent` exits setup and returns to the normal operating screen.
- [ ] **AC 39.8:** Changes are only committed when the operator exits via `SAU CHG` (see US-027); exiting via `End` without `SAU CHG` discards uncommitted changes.

## E2E Test Scenarios
```typescript
describe('US-039: Setup Menu Navigation', () => {
  test('enter setup, select axis, see first parameter', async () => {
    await dro.pressKey('SETUP');
    await expect(dro.display.message).toHaveText('SELECT');

    await dro.pressKey('X');
    await expect(dro.display.message).toHaveText('LinEAr');
  });

  test('up/down scrolls and wraps around', async () => {
    await dro.pressKey('SETUP');
    await dro.pressKey('X');

    const first = await dro.display.message.text();
    // Scroll all the way to End and one past — wraps to the first item
    await dro.pressKeyUntil('KEY_8_UP', 'End'); // ▲ to End
    await dro.pressKey('KEY_8_UP');
    await expect(dro.display.message).toHaveText(first);
  });

  test('left/right cycles choices for current item', async () => {
    await dro.pressKey('SETUP');
    await dro.pressKey('X');
    await dro.navigateTo('LinEAr');

    await dro.pressKey('KEY_6_RIGHT');
    await expect(dro.display.message).toHaveText('AnGULAr');
    await dro.pressKey('KEY_4_LEFT');
    await expect(dro.display.message).toHaveText('LinEAr');
  });

  test('End exits to normal screen', async () => {
    await dro.pressKey('SETUP');
    await dro.pressKey('X');
    await dro.navigateTo('End');
    await dro.pressKey('ENT');
    await expect(dro.state).toBe('idle');
  });
});
```

## Implementation Notes
- Maps to the existing setup feature reducers under `src/stores/dro/features/`.
- Menu item order follows the §6.2 parameter table; the wrap-around is on both axes
  (item list and choice list).
- The `SELECT` → axis → parameter flow is shared by all setup stories; consider a single
  reusable `selectAxis()` / `navigateTo()` test helper in `src/tests/helpers/`.

## Related Stories
- US-021..US-028 (setup parameters), US-031, US-040, US-041, US-042, US-043, US-044
- US-027: Save Changes (commit semantics)

## Notes
- New story from crosscheck against README spec references (video manual §1.2–1.3, §1.19;
  OCR §6.1). Captures cross-cutting setup navigation that was implied but never written down.
</content>
</invoke>
