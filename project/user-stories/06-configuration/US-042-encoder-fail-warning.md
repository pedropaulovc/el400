# US-042: Setup Menu - Encoder Fail Warning (ENF)

**Manual Reference:** Section 6.2 Parameters Setting (`EnF oFF` / `EnF on`, note *2 "no SIG"); EL400 video manual §1.10 "Encoder-fail warning `ENF`"
**Priority:** P5
**Category:** Configuration

## User Story
**As a** machine operator
**I want** the DRO to alert me when an encoder cable becomes disconnected or damaged
**So that** I don't keep working against a stale/incorrect reading after a scale drops out

## Acceptance Criteria
- [ ] **AC 42.1:** The `EnF` parameter is available in setup with choices `EnF oFF` (default) and `EnF on`.
- [ ] **AC 42.2:** `◄` / `►` toggle the setting; it applies to **all axes** (global), not per-axis.
- [ ] **AC 42.3:** When `EnF on` and an axis loses its encoder signal, that axis display shows the error message `no SIG`.
- [ ] **AC 42.4:** When `EnF oFF`, a lost encoder signal produces no warning (legacy behavior).
- [ ] **AC 42.5:** The warning clears automatically once a valid encoder signal is restored.
- [ ] **AC 42.6:** DRO PROS recommends `EnF on`; the simulator should make turning it on easy/discoverable.
- [ ] **AC 42.7:** The setting persists after power cycle when saved via `SAU CHG`.

## E2E Test Scenarios
```typescript
describe('US-042: Encoder Fail Warning', () => {
  test('with ENF on, signal loss shows no SIG', async () => {
    await dro.setEncoderFailWarning(true);
    await dro.simulateEncoderDisconnect('X');
    await expect(dro.display.xAxis).toHaveText('no SIG');
  });

  test('reconnect clears the warning', async () => {
    await dro.setEncoderFailWarning(true);
    await dro.simulateEncoderDisconnect('X');
    await dro.simulateEncoderReconnect('X');
    await expect(dro.display.xAxis).toHaveValue(0.0000);
  });

  test('with ENF off, signal loss is silent', async () => {
    await dro.setEncoderFailWarning(false);
    await dro.simulateEncoderDisconnect('X');
    await expect(dro.display.xAxis).not.toHaveText('no SIG');
  });
});
```

## Implementation Notes
- In the simulator there is no physical cable; model "signal loss" from the adapter layer —
  e.g. a `MillState.connected === false` per-axis, a probe/encoder fault flag from the
  DebugServer, or a CNCjs disconnect. The DebugControlPanel can expose a toggle to simulate it.
- `no SIG` rendering belongs in `displayComputation.ts` as an axis display override.
- Store as global `encoderFailWarning: boolean` in non-volatile memory.

## Related Stories
- US-035: External Machine Connection (where signal loss originates)
- US-027: Save Changes
- US-046: Self-Diagnostics Mode (encoder diagnostics)

## Notes
- New story from crosscheck. `EnF` is in the §6.2 table and video §1.10 but had no story.
- The on-screen text per OCR note *2 is `no SIG` on the affected axis.
</content>
