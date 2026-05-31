# US-046: Self-Diagnostics Mode

**Manual Reference:** Section 11.1 Self Diagnostics Mode
**Priority:** P5
**Category:** Auxiliary

## User Story
**As a** technician troubleshooting a DRO
**I want** a built-in self-test for memory, display, keyboard, and encoders
**So that** I can confirm whether a fault is in the unit before chasing wiring or scales

## Acceptance Criteria
- [ ] **AC 46.1:** Holding/pressing `▲` (the `8` key) during the start-up/version message enters Self-Diagnostics Mode.
- [ ] **AC 46.2:** It first runs **memory diagnostics**; if memory is OK the display shows `RAñPASS` (RAM pass).
- [ ] **AC 46.3:** Pressing any key advances from memory check to **display diagnostics** (segment/lamp test).
- [ ] **AC 46.4:** Pressing any key advances to **keyboard diagnostics**: each key pressed is echoed/identified on the display.
- [ ] **AC 46.5:** **Encoder diagnostics** verify each axis input responds to movement.
- [ ] **AC 46.6:** Pressing `C` once exits the current diagnostic step.
- [ ] **AC 46.7:** Pressing `C` twice exits Self-Diagnostics Mode back to the normal screen.

## E2E Test Scenarios
```typescript
describe('US-046: Self-Diagnostics Mode', () => {
  test('enter via up-arrow during boot, memory passes', async () => {
    await dro.powerOn();                 // shows version message
    await dro.pressKey('KEY_8_UP');      // ▲ during boot
    await expect(dro.display.message).toHaveText('RAñPASS');
  });

  test('keyboard diagnostic echoes pressed key', async () => {
    await dro.enterSelfDiagnostics();
    await dro.pressKey('ANY');           // advance to keyboard test
    await dro.pressKey('KEY_5');
    await expect(dro.display.message).toContainText('5');
  });

  test('double C exits diagnostics', async () => {
    await dro.enterSelfDiagnostics();
    await dro.pressKey('CLEAR');
    await dro.pressKey('CLEAR');
    await expect(dro.state).toBe('idle');
  });
});
```

## Implementation Notes
- New feature reducer with sub-states for each diagnostic step; entry gated on the boot
  sequence (interacts with US-001 boot states `boot` / `boot-show-message`).
- Display test can cycle all seven-segment patterns; keyboard test maps `DROEventPayload`
  keys to their on-screen labels; encoder test reflects `MillState.position` deltas per axis.
- Useful as a developer/demo affordance in `?source=debug` mode.

## Related Stories
- US-001: First Use and Power-Up Display (boot entry point)
- US-042: Encoder Fail Warning (encoder health)

## Notes
- New story from crosscheck against OCR §11.1. The `RAñPASS` text and `▲`-at-boot entry are
  from the manual; exact display-test cadence is an implementation choice.
</content>
